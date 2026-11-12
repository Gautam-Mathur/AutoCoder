import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { prisma } from '../../../db';
import {
  InferenceTurnResult,
  Message,
  runInferenceTurn,
} from '../../inference';
import { AGENT_DEFS } from '../agents';
import { commitAcceptedArtifact } from '../artifact-store';
import { executeContractStage } from '../contract-executor';
import { createContentHash } from '../contracts/fingerprints';
import { loadExecutiveMemory, StageLedger } from '../memory';
import { coordinateRepair } from '../repair-coordinator';
import {
  executeToolLoop,
  serializeToolResultForModel,
} from '../tool-loop';
import {
  getToolsForAgent,
  toolToAnthropicFormat,
  toolToOllamaFormat,
} from '../toolbox';
import { readVirtualFile, writeVirtualFile } from '../vfs';

function buildNdjsonStream(lines: any[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const obj of lines) {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
      }
      controller.close();
    },
  });
}

describe('Toolbox Full Runtime Integration Suite', () => {
  const prefix = `toolbox-runtime-${Date.now()}`;
  const convId = `${prefix}-conv`;
  const runId = `${prefix}-run`;
  const leaseOwner = `${prefix}-lease`;
  const seedExecId = `${prefix}-seed-exec`;
  const prevMockEnv = process.env.MOCK_INFERENCE;

  const archMd = `### Tech Stack
- **Frontend**: TypeScript
- **Frontend Entry Point**: src/app.ts
- **Backend**: None
- **Backend Entry Point**: None
- **Database**: None
- **ORM**: None
- **Authentication**: None
- **Build Tool**: TypeScript
- **Additional**: None

### Project Folder Structure
project-root/
├── tsconfig.json
└── src/
    ├── utils.ts
    └── app.ts

### Project Files
- tsconfig.json
- src/utils.ts
- src/app.ts

### Modules
**Core Module**
- Responsibility: Arithmetic utilities and entry
- Owned Files: tsconfig.json, src/utils.ts, src/app.ts
- Depends On: None
- Supports Features: Feature-001

### Conventions
- **File Naming**: camelCase`;

  const backendMd = `### No Backend Required
Frontend-only project.`;

  const uiMd = `### Design System
- **Style**: Minimal
- **Breakpoints**: Mobile <640px
- **Colors**: Primary #111
- **Typography**: Inter
- **a11y Baseline**: 4.5:1

### Pages
**Home** (/) — Access: Public
- Trace: Feature-001
- Components: AppView
- File: src/app.ts

### Components
**AppView** (Display)
- Trace: Feature-001
- Used On: Home

### Global Feedback
- **Form Errors**: Inline`;

  const blueprintMd = `### File: tsconfig.json
- **Owner Module**: Core Module
- **Purpose**: TypeScript compiler config
- **Dependencies**: None
- **Specs Required**: None
- **Exports**: None

### File: src/utils.ts
- **Owner Module**: Core Module
- **Purpose**: Exports arithmetic helpers
- **Dependencies**: None
- **Specs Required**: None
- **Exports**: export function sum

### File: src/app.ts
- **Owner Module**: Core Module
- **Purpose**: Calls sum utility
- **Dependencies**: src/utils.ts
- **Specs Required**: None
- **Exports**: export const appResult`;

  before(async () => {
    delete process.env.MOCK_INFERENCE;

    await prisma.conversation.create({
      data: {
        id: convId,
        title: 'Toolbox Runtime Integration Test',
        status: 'Active',
        currentStage: 'Coder',
      },
    });

    await prisma.pipelineRun.create({
      data: {
        id: runId,
        conversationId: convId,
        state: 'RUNNING',
        leaseOwner,
        leaseExpiresAt: new Date(Date.now() + 120_000),
      },
    });

    await prisma.stageExecution.create({
      data: {
        id: seedExecId,
        conversationId: convId,
        pipelineRunId: runId,
        stageName: 'Coder',
        attempt: 0,
        state: 'RUNNING',
      },
    });

    await commitAcceptedArtifact({
      conversationId: convId,
      pipelineRunId: runId,
      stage: 'Architect',
      filePath: 'architecture.md',
      content: archMd,
      contractName: 'ArchitectureOutput',
      contractVersion: '1.2.0',
    });

    await commitAcceptedArtifact({
      conversationId: convId,
      pipelineRunId: runId,
      stage: 'System',
      filePath: 'backend_spec.md',
      content: backendMd,
      contractName: 'SystemOutput',
      contractVersion: '1.2.0',
    });

    await commitAcceptedArtifact({
      conversationId: convId,
      pipelineRunId: runId,
      stage: 'Designer',
      filePath: 'ui_spec.md',
      content: uiMd,
      contractName: 'DesignerOutput',
      contractVersion: '1.2.0',
    });

    await commitAcceptedArtifact({
      conversationId: convId,
      pipelineRunId: runId,
      stage: 'Blueprinter',
      filePath: 'blueprint.md',
      content: blueprintMd,
      contractName: 'BlueprintOutput',
      contractVersion: '1.2.0',
    });
  });

  after(async () => {
    if (prevMockEnv !== undefined) {
      process.env.MOCK_INFERENCE = prevMockEnv;
    } else {
      delete process.env.MOCK_INFERENCE;
    }

    const projDir = path.join(process.cwd(), 'projects', convId);
    if (fs.existsSync(projDir)) {
      fs.rmSync(projDir, { recursive: true, force: true });
    }

    await prisma.pipelineEvent.deleteMany({ where: { conversationId: convId } });
    await prisma.gateDecision.deleteMany({ where: { conversationId: convId } });
    await prisma.verificationRun.deleteMany({ where: { conversationId: convId } });
    await prisma.artifactVersion.deleteMany({ where: { conversationId: convId } });
    await prisma.stageExecution.deleteMany({ where: { conversationId: convId } });
    await prisma.virtualFile.deleteMany({ where: { conversationId: convId } });
    await prisma.pipelineRun.deleteMany({ where: { conversationId: convId } });
    await prisma.conversation.deleteMany({ where: { id: convId } });
  });

  describe('1. Multi-Provider Native Tool-Calling Inference (Ollama / OpenAI / Anthropic)', () => {
    it('streams Ollama NDJSON tool_calls, suppresses format:json when tools are present, and forwards tool history', async () => {
      const capturedPayloads: any[] = [];
      const chunks: string[] = [];

      const turn = await runInferenceTurn(
        [
          { role: 'system', content: 'You are helpful.' },
          { role: 'user', content: 'Check utils.ts' },
          {
            role: 'assistant',
            content: '',
            tool_calls: [
              { id: 'c0', type: 'function', function: { name: 'list_files', arguments: {} } },
            ],
          },
          { role: 'tool', tool_call_id: 'c0', name: 'list_files', content: '{"files":["src/utils.ts"]}' },
        ],
        {
          format: 'json',
          tools: getToolsForAgent(['read_file']).map(toolToOllamaFormat),
          onChunk: (c) => chunks.push(c),
          configOverride: { provider: 'ollama', ollamaHost: 'http://mock-ollama:11434', ollamaModel: 'qwen2.5-coder' },
          fetchImpl: async (_url, init) => {
            capturedPayloads.push(JSON.parse(init.body));
            return {
              ok: true,
              body: buildNdjsonStream([
                { message: { role: 'assistant', content: 'Reading ' }, done: false },
                {
                  message: {
                    role: 'assistant',
                    content: 'file...',
                    tool_calls: [{ function: { name: 'read_file', arguments: { file_path: 'src/utils.ts' } } }],
                  },
                  done: true,
                  done_reason: 'tool_calls',
                },
              ]),
            };
          },
        }
      );

      assert.equal(capturedPayloads.length, 1);
      assert.equal(capturedPayloads[0].format, undefined, 'Must suppress format:json when tools are provided');
      assert.equal(capturedPayloads[0].tools.length, 1);
      assert.equal(capturedPayloads[0].messages[3].role, 'tool');
      assert.equal(capturedPayloads[0].messages[3].tool_name, 'list_files');
      assert.equal(turn.content, 'Reading file...');
      assert.deepEqual(chunks, ['Reading ', 'file...']);
      assert.equal(turn.toolCalls.length, 1);
      assert.equal(turn.toolCalls[0].name, 'read_file');
      assert.deepEqual(turn.toolCalls[0].arguments, { file_path: 'src/utils.ts' });
    });

    it('parses OpenAI tool_calls with JSON-stringified arguments cleanly', async () => {
      const capturedPayloads: any[] = [];
      const turn = await runInferenceTurn(
        [{ role: 'user', content: 'Syntax check' }],
        {
          tools: getToolsForAgent(['check_syntax']).map(toolToOllamaFormat),
          configOverride: { provider: 'openai', openaiApiKey: 'test-key', openaiModel: 'gpt-4o-mini' },
          fetchImpl: async (_url, init) => {
            capturedPayloads.push(JSON.parse(init.body));
            return {
              ok: true,
              json: async () => ({
                choices: [
                  {
                    finish_reason: 'tool_calls',
                    message: {
                      role: 'assistant',
                      content: null,
                      tool_calls: [
                        {
                          id: 'call_oai_1',
                          type: 'function',
                          function: {
                            name: 'check_syntax',
                            arguments: '{"file_path":"src/app.ts"}',
                          },
                        },
                      ],
                    },
                  },
                ],
              }),
            };
          },
        }
      );

      assert.equal(capturedPayloads[0].response_format, undefined);
      assert.equal(turn.toolCalls.length, 1);
      assert.equal(turn.toolCalls[0].id, 'call_oai_1');
      assert.equal(turn.toolCalls[0].name, 'check_syntax');
      assert.deepEqual(turn.toolCalls[0].arguments, { file_path: 'src/app.ts' });
    });

    it('converts tools and tool_use/tool_result blocks for Anthropic /v1/messages', async () => {
      const capturedPayloads: any[] = [];
      const tools = getToolsForAgent(['read_file', 'check_syntax']).map(toolToOllamaFormat);
      assert.equal((toolToAnthropicFormat(getToolsForAgent(['read_file'])[0]) as any).input_schema.type, 'object');

      const turn = await runInferenceTurn(
        [
          { role: 'system', content: 'Repair agent' },
          { role: 'user', content: 'Inspect files' },
          {
            role: 'assistant',
            content: 'Let me check',
            tool_calls: [
              { id: 'toolu_1', type: 'function', function: { name: 'read_file', arguments: { file_path: 'src/app.ts' } } },
            ],
          },
          { role: 'tool', tool_call_id: 'toolu_1', name: 'read_file', content: '{"found":true}' },
        ],
        {
          tools,
          configOverride: { provider: 'anthropic', anthropicApiKey: 'test-ant', anthropicModel: 'claude-3-5-sonnet' },
          fetchImpl: async (_url, init) => {
            capturedPayloads.push(JSON.parse(init.body));
            return {
              ok: true,
              json: async () => ({
                stop_reason: 'tool_use',
                content: [
                  { type: 'text', text: 'Running syntax check' },
                  { type: 'tool_use', id: 'toolu_2', name: 'check_syntax', input: { file_path: 'src/app.ts' } },
                ],
              }),
            };
          },
        }
      );

      assert.equal(capturedPayloads[0].system, 'Repair agent');
      assert.equal(capturedPayloads[0].tools[0].input_schema.type, 'object');
      assert.equal(capturedPayloads[0].messages[1].content[1].type, 'tool_use');
      assert.equal(capturedPayloads[0].messages[2].role, 'user');
      assert.equal(capturedPayloads[0].messages[2].content[0].type, 'tool_result');
      assert.equal(turn.content, 'Running syntax check');
      assert.equal(turn.toolCalls.length, 1);
      assert.equal(turn.toolCalls[0].id, 'toolu_2');
      assert.equal(turn.toolCalls[0].name, 'check_syntax');
    });
  });

  describe('2. Tool Loop Execution, Loop Guard, Budget Caps, Truncation & Abort', () => {
    it('executes multi-turn read_file -> write_file -> check_syntax flow and emits progress logs', async () => {
      const events: any[] = [];
      let turnIndex = 0;

      const loopRes = await executeToolLoop({
        messages: [
          { role: 'system', content: 'Coder' },
          { role: 'user', content: 'Implement src/utils.ts' },
        ],
        tools: getToolsForAgent(AGENT_DEFS.Coder.tools),
        toolContext: {
          conversationId: convId,
          pipelineRunId: runId,
          stageExecutionId: seedExecId,
          stageName: 'Coder',
          allowedMutationPaths: ['src/utils.ts'],
        },
        onEvent: (e) => events.push(e),
        inferenceTurnFn: async (msgs): Promise<InferenceTurnResult> => {
          turnIndex++;
          if (turnIndex === 1) {
            return {
              content: '',
              toolCalls: [
                {
                  id: 't1',
                  name: 'write_file',
                  arguments: {
                    file_path: 'src/utils.ts',
                    content: 'export function sum(a: number, b: number): number {\n  return a + b;\n}\n',
                  },
                },
              ],
              provider: 'mock',
              model: 'mock',
              durationMs: 5,
            };
          }
          if (turnIndex === 2) {
            return {
              content: '',
              toolCalls: [{ id: 't2', name: 'check_syntax', arguments: { file_path: 'src/utils.ts' } }],
              provider: 'mock',
              model: 'mock',
              durationMs: 5,
            };
          }
          const lastToolMsg = msgs[msgs.length - 1];
          assert.equal(lastToolMsg.role, 'tool');
          const parsedLint = JSON.parse(lastToolMsg.content);
          assert.equal(parsedLint.success, true);
          return {
            content: 'Implemented and verified src/utils.ts cleanly.',
            toolCalls: [],
            provider: 'mock',
            model: 'mock',
            durationMs: 5,
          };
        },
      });

      assert.equal(loopRes.iterations, 3);
      assert.equal(loopRes.exhaustedBudget, false);
      assert.deepEqual(loopRes.mutatedFiles, ['src/utils.ts']);
      assert.equal(loopRes.toolExecutions.length, 2);
      assert.ok(events.some((e) => e.message.includes('write_file')));
      assert.ok(events.some((e) => e.message.includes('check_syntax')));
      assert.equal(
        await readVirtualFile(convId, 'src/utils.ts'),
        'export function sum(a: number, b: number): number {\n  return a + b;\n}\n'
      );
    });

    it('halts repeated identical non-mutating tool calls via Loop Guard', async () => {
      let turnIndex = 0;
      const loopRes = await executeToolLoop({
        messages: [{ role: 'user', content: 'Check files' }],
        tools: getToolsForAgent(['list_files']),
        toolContext: {
          conversationId: convId,
          pipelineRunId: runId,
          stageExecutionId: seedExecId,
          stageName: 'Coder',
        },
        maxIterations: 8,
        inferenceTurnFn: async (msgs): Promise<InferenceTurnResult> => {
          turnIndex++;
          if (msgs.some((m) => typeof m.content === 'string' && m.content.includes('TOOL BUDGET REACHED'))) {
            return { content: 'Stopped after loop guard', toolCalls: [], provider: 'mock', model: 'mock', durationMs: 1 };
          }
          return {
            content: '',
            toolCalls: [{ id: `loop_${turnIndex}`, name: 'list_files', arguments: {} }],
            provider: 'mock',
            model: 'mock',
            durationMs: 1,
          };
        },
      });

      assert.equal(loopRes.exhaustedBudget, true);
      assert.ok(
        loopRes.toolExecutions.some((e) => (e.error || '').includes('Loop Guard')),
        'Expected Loop Guard error trace'
      );
      assert.ok(turnIndex <= 5, `Expected early exit on loop guard, got ${turnIndex} turns`);
    });

    it('enforces maxIterations wrap-up turn without tools and aborts cleanly on AbortSignal', async () => {
      let wrapUpSawTools: any = 'unset';
      const cappedRes = await executeToolLoop({
        messages: [{ role: 'user', content: 'List repeatedly' }],
        tools: getToolsForAgent(['list_files']),
        toolContext: {
          conversationId: convId,
          pipelineRunId: runId,
          stageExecutionId: seedExecId,
          stageName: 'Coder',
        },
        maxIterations: 1,
        inferenceTurnFn: async (_msgs, opts): Promise<InferenceTurnResult> => {
          if (opts?.tools) {
            return {
              content: '',
              toolCalls: [{ id: 'c1', name: 'list_files', arguments: {} }],
              provider: 'mock',
              model: 'mock',
              durationMs: 1,
            };
          }
          wrapUpSawTools = opts?.tools;
          return { content: 'Final answer after budget', toolCalls: [], provider: 'mock', model: 'mock', durationMs: 1 };
        },
      });

      assert.equal(cappedRes.exhaustedBudget, true);
      assert.equal(cappedRes.content, 'Final answer after budget');
      assert.equal(wrapUpSawTools, undefined);

      // Abort mid-loop
      const ac = new AbortController();
      await assert.rejects(
        () =>
          executeToolLoop({
            messages: [{ role: 'user', content: 'Read then abort' }],
            tools: getToolsForAgent(['list_files']),
            toolContext: {
              conversationId: convId,
              pipelineRunId: runId,
              stageExecutionId: seedExecId,
              stageName: 'Coder',
            },
            inferenceOptions: { signal: ac.signal },
            inferenceTurnFn: async (): Promise<InferenceTurnResult> => {
              ac.abort();
              return {
                content: '',
                toolCalls: [{ id: 'ab1', name: 'list_files', arguments: {} }],
                provider: 'mock',
                model: 'mock',
                durationMs: 1,
              };
            },
          }),
        /aborted/i
      );
    });

    it('truncates oversized tool results safely while keeping critical metadata intact', () => {
      const largeResult = {
        found: true,
        lineCount: 900,
        contentHash: 'a'.repeat(64),
        content: 'X'.repeat(25000),
      };
      const serialized = serializeToolResultForModel(largeResult, 2000);
      assert.ok(serialized.length <= 2000);
      const parsed = JSON.parse(serialized);
      assert.equal(parsed.found, true);
      assert.equal(parsed.contentHash, 'a'.repeat(64));
      assert.equal(parsed.truncated, true);
      assert.ok(parsed.content.includes('TRUNCATED'));
    });
  });

  describe('3. Full Runtime Contract Execution: Coder & Debugger + CoordinateRepair', () => {
    it('Coder dual-mode preserves tool-written code against closing summary, blocks cross-file mutation, and supports text fallback', async () => {
      const ledger = new StageLedger(convId, await loadExecutiveMemory(convId));

      const tsconfigCode = JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2020',
            module: 'CommonJS',
            strict: true,
            noEmit: true,
          },
          include: ['src/**/*'],
        },
        null,
        2
      );
      const utilsCode = 'export function sum(a: number, b: number): number {\n  return a + b;\n}\n';
      const appCode = 'import { sum } from "./utils";\nexport const appResult = sum(2, 3);\n';

      // Build tsconfig.json via text fallback, src/utils.ts via text fallback,
      // and src/app.ts via tool calls (reading src/utils.ts, attempting illegal write to src/utils.ts, writing src/app.ts, checking syntax, returning conversational summary)
      const callsByTarget: Record<string, number> = {};
      let sawScopeViolationRejection = false;

      const stageRes = await executeContractStage({
        conversationId: convId,
        pipelineRunId: runId,
        stageName: 'Coder',
        userPromptText: 'Build calculator helpers',
        onEvent: () => {},
        ledger,
        leaseOwnerId: leaseOwner,
        runtimeToolOptions: {
          inferenceTurnFn: async (msgs): Promise<InferenceTurnResult> => {
            const userMsg = msgs.find((m) => m.role === 'user')?.content || '';
            const targetMatch = userMsg.match(/TARGET FILE TO IMPLEMENT:\s*([^\s\n]+)/);
            const currentTarget = targetMatch ? targetMatch[1] : '';
            callsByTarget[currentTarget] = (callsByTarget[currentTarget] || 0) + 1;
            const step = callsByTarget[currentTarget];

            if (currentTarget === 'tsconfig.json') {
              return { content: tsconfigCode, toolCalls: [], provider: 'mock', model: 'mock', durationMs: 1 };
            }
            if (currentTarget === 'src/utils.ts') {
              return { content: utilsCode, toolCalls: [], provider: 'mock', model: 'mock', durationMs: 1 };
            }
            if (currentTarget === 'src/app.ts') {
              if (step === 1) {
                return {
                  content: '',
                  toolCalls: [
                    { id: 'c_read', name: 'read_file', arguments: { file_path: 'src/utils.ts' } },
                    // Deliberate scope violation attempt while building src/app.ts:
                    { id: 'c_bad_write', name: 'write_file', arguments: { file_path: 'src/utils.ts', content: 'export const hijacked = 1;' } },
                  ],
                  provider: 'mock',
                  model: 'mock',
                  durationMs: 1,
                };
              }
              if (step === 2) {
                const badWriteToolMsg = msgs.find((m) => m.tool_call_id === 'c_bad_write');
                if (badWriteToolMsg?.content.includes('allowedMutationPaths scope')) {
                  sawScopeViolationRejection = true;
                }
                return {
                  content: '',
                  toolCalls: [
                    { id: 'c_good_write', name: 'write_file', arguments: { file_path: 'src/app.ts', content: appCode } },
                    { id: 'c_lint', name: 'check_syntax', arguments: { file_path: 'src/app.ts' } },
                  ],
                  provider: 'mock',
                  model: 'mock',
                  durationMs: 1,
                };
              }
              // Final conversational summary must NOT clobber src/app.ts!
              return {
                content: 'Successfully wrote src/app.ts and verified syntax with zero errors.',
                toolCalls: [],
                provider: 'mock',
                model: 'mock',
                durationMs: 1,
              };
            }
            throw new Error(`Unexpected Coder target in test: ${currentTarget}`);
          },
        },
      });

      assert.equal(stageRes.status, 'ACCEPTED');
      assert.equal(sawScopeViolationRejection, true, 'Coder out-of-scope mutation attempt must fail closed');
      assert.equal(await readVirtualFile(convId, 'tsconfig.json'), tsconfigCode.trim());
      assert.equal(await readVirtualFile(convId, 'src/utils.ts'), utilsCode.trim(), 'src/utils.ts must stay uncorrupted');
      assert.equal(
        await readVirtualFile(convId, 'src/app.ts'),
        appCode,
        'Tool-written src/app.ts must NOT be overwritten by closing conversational summary'
      );
    });

    it('Debugger performs live surgical apply_diff via executeContractStage and coordinateRepair skips redundant Coder pass', async () => {
      const ledger = new StageLedger(convId, await loadExecutiveMemory(convId));
      // Introduce a deliberate arithmetic bug in src/utils.ts via new Coder RUNNING execution
      const repairSeedExecId = `${prefix}-seed-bug`;
      await prisma.stageExecution.create({
        data: {
          id: repairSeedExecId,
          conversationId: convId,
          pipelineRunId: runId,
          stageName: 'Coder',
          attempt: 99,
          state: 'RUNNING',
        },
      });
      await writeVirtualFile(
        convId,
        'src/utils.ts',
        'export function sum(a: number, b: number): number {\n  return a - b;\n}\n',
        { pipelineRunId: runId, stageExecutionId: repairSeedExecId }
      );
      await prisma.stageExecution.update({
        where: { id: repairSeedExecId },
        data: { state: 'ACCEPTED', completedAt: new Date() },
      });

      const stageCalls: string[] = [];
      const logs: string[] = [];
      let testerCycle = 0;

      await coordinateRepair({
        conversationId: convId,
        pipelineRunId: runId,
        emit: (e) => {
          if (e?.message) logs.push(e.message);
        },
        executeStageFn: async (stageName, customInput) => {
          stageCalls.push(stageName);
          if (stageName === 'Tester') {
            testerCycle++;
            const currentUtils = await readVirtualFile(convId, 'src/utils.ts');
            const hash = createContentHash(currentUtils || '');
            if (testerCycle === 1) {
              assert.ok(currentUtils?.includes('return a - b;'));
              const failReport = `# Test Report\n\n### Result\nFAIL\n\n### Summary\nArithmetic test failed\n\n### Tests\n- Unit Test: FAIL\n\n### Failures\n- [src/utils.ts] sum(2, 3) returned -1 instead of 5\n\n### Workspace Hash\n${hash}`;
              await commitAcceptedArtifact({
                conversationId: convId,
                pipelineRunId: runId,
                stage: 'Tester',
                filePath: 'test_report.md',
                content: failReport,
                contractName: 'TesterOutput',
                contractVersion: '1.2.0',
              });
              return {
                status: 'ACCEPTED',
                stageExecution: { id: `tester-${testerCycle}`, state: 'ACCEPTED' },
                content: failReport,
              };
            }
            assert.ok(currentUtils?.includes('return a + b;'), 'Debugger surgical apply_diff must have repaired src/utils.ts');
            return {
              status: 'ACCEPTED',
              stageExecution: { id: `tester-${testerCycle}`, state: 'ACCEPTED' },
              content: `# Test Report\n\n### Result\nPASS\n\n### Summary\nAll checks passed\n\n### Tests\n- Unit Test: PASS\n\n### Failures\nNone\n\n### Workspace Hash\n${hash}`,
            };
          }

          if (stageName === 'Debugger') {
            let dbgTurn = 0;
            return await executeContractStage({
              conversationId: convId,
              pipelineRunId: runId,
              stageName: 'Debugger',
              userPromptText: 'Fix calculator sum()',
              onEvent: () => {},
              ledger,
              leaseOwnerId: leaseOwner,
              customUserContent: customInput,
              runtimeToolOptions: {
                inferenceTurnFn: async (msgs): Promise<InferenceTurnResult> => {
                  dbgTurn++;
                  if (dbgTurn === 1) {
                    return {
                      content: '',
                      toolCalls: [{ id: 'd1', name: 'read_file', arguments: { file_path: 'src/utils.ts' } }],
                      provider: 'mock',
                      model: 'mock',
                      durationMs: 1,
                    };
                  }
                  if (dbgTurn === 2) {
                    const readMsg = msgs.find((m) => m.tool_call_id === 'd1');
                    const readParsed = JSON.parse(readMsg?.content || '{}');
                    return {
                      content: '',
                      toolCalls: [
                        {
                          id: 'd2',
                          name: 'apply_diff',
                          arguments: {
                            file_path: 'src/utils.ts',
                            start_line: 2,
                            end_line: 2,
                            new_content: '  return a + b;',
                            expected_content_hash: readParsed.contentHash,
                          },
                        },
                        {
                          id: 'd3',
                          name: 'check_syntax',
                          arguments: { file_path: 'src/utils.ts' },
                        },
                      ],
                      provider: 'mock',
                      model: 'mock',
                      durationMs: 1,
                    };
                  }
                  return {
                    content: `# Debug Report\n\n### Issues Addressed\n- File: src/utils.ts\n- Diagnostic: Incorrect subtraction operator\n- Root cause: Typo return a - b\n- Result: Repaired directly via apply_diff\n\n### Patches Applied\n- File: src/utils.ts\n- Area changed: Line 2\n- What was changed: Replaced return a - b; with return a + b;\n- Why: Restore addition behavior\n\n### Verification\n- check_syntax on src/utils.ts passed with 0 errors.`,
                    toolCalls: [],
                    provider: 'mock',
                    model: 'mock',
                    durationMs: 1,
                  };
                },
              },
            });
          }

          throw new Error(`Coder should not run redundantly after direct Debugger patch; unexpected stage: ${stageName}`);
        },
      });

      assert.deepEqual(stageCalls, ['Tester', 'Debugger', 'Tester']);
      assert.ok(logs.some((l) => l.includes('[REPAIR_DIRECT_APPLIED]')));
    });
  });
});
