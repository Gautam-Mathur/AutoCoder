import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { executeTool } from '../../toolbox';
import { readVirtualFile, writeVirtualFile } from '../../vfs';
import { validateStageCandidate } from '../../stage-acceptance';
import { CONTRACT_VERSIONS } from '../versions';
import { DEBUGGER_SCHEMA, parseDebuggerOutput } from '../schemas/debugger';
import { prisma } from '../../../../db';

describe('Debugger Contract Remediation (C-01, C-02, C-03)', () => {
  const testConvoId = 'debugger-remediation-test-' + Date.now();
  const testRunId = 'run-' + testConvoId;
  const testStageExecId = 'stage-dbg-' + testConvoId;

  before(async () => {
    // Clean test data before running
    await prisma.artifactVersion.deleteMany({ where: { conversationId: testConvoId } });
    await prisma.stageExecution.deleteMany({ where: { conversationId: testConvoId } });
    await prisma.pipelineRun.deleteMany({ where: { conversationId: testConvoId } });
    await prisma.virtualFile.deleteMany({ where: { conversationId: testConvoId } });
    await prisma.conversation.deleteMany({ where: { id: testConvoId } });

    await prisma.conversation.create({
      data: {
        id: testConvoId,
        title: 'Debugger Remediation Test',
        status: 'Active',
        currentStage: 'Debugger',
      },
    });

    await prisma.pipelineRun.create({
      data: {
        id: testRunId,
        conversationId: testConvoId,
        state: 'RUNNING',
      },
    });

    await prisma.stageExecution.create({
      data: {
        id: testStageExecId,
        conversationId: testConvoId,
        pipelineRunId: testRunId,
        stageName: 'Debugger',
        attempt: 1,
        state: 'RUNNING',
      },
    });

    const archMd = `### Tech Stack
- Frontend: React
- Frontend Entry Point: src/math/calculator.ts
- Backend: None
- Backend Entry Point: None
- Database: None
- ORM: None
- Authentication: None
- Build Tool: Vite
- Additional: None

### Project Folder Structure
project-root/
└── src/
    └── math/
        └── calculator.ts

### Project Files
- src/math/calculator.ts

### Modules
**Math Module**
- Responsibility: Arithmetic
- Owned Files: src/math/calculator.ts
- Depends On: None
- Supports Features: Calculator

### Conventions
- File Naming: camelCase
`;

    const blueprintMd = `### File: src/math/calculator.ts
- Owner Module: Math Module
- Purpose: Calculator arithmetic
- Dependencies: None
- Specs Required: None
- Exports: export function add
`;

    await prisma.artifactVersion.create({
      data: {
        conversationId: testConvoId,
        pipelineRunId: testRunId,
        stageName: 'Architect',
        filePath: 'architecture.md',
        version: 1,
        contentHash: 'hash-arch-dbg',
        content: archMd,
        state: 'ACCEPTED',
      },
    });

    await prisma.artifactVersion.create({
      data: {
        conversationId: testConvoId,
        pipelineRunId: testRunId,
        stageName: 'Blueprinter',
        filePath: 'blueprint.md',
        version: 1,
        contentHash: 'hash-blue-dbg',
        content: blueprintMd,
        state: 'ACCEPTED',
      },
    });
  });

  after(async () => {
    // Clean test data after running
    await prisma.artifactVersion.deleteMany({ where: { conversationId: testConvoId } });
    await prisma.stageExecution.deleteMany({ where: { conversationId: testConvoId } });
    await prisma.pipelineRun.deleteMany({ where: { conversationId: testConvoId } });
    await prisma.virtualFile.deleteMany({ where: { conversationId: testConvoId } });
    await prisma.conversation.deleteMany({ where: { id: testConvoId } });
    await prisma.$disconnect();
  });

  it('proves CONTRACT_VERSIONS and DEBUGGER_SCHEMA alignment (C-01)', () => {
    assert.strictEqual(CONTRACT_VERSIONS.Debugger.format, 'markdown');
    assert.strictEqual(CONTRACT_VERSIONS.Debugger.version, '1.2.0');
    assert.strictEqual(CONTRACT_VERSIONS.Debugger.outputArtifactName, 'debug_report.md');
    assert.deepStrictEqual(CONTRACT_VERSIONS.Debugger.requiredHeadings, [
      '### Issues Addressed',
      '### Patches Applied',
      '### Verification',
    ]);
    assert.strictEqual(DEBUGGER_SCHEMA.version, '1.2.0');
    assert.strictEqual(DEBUGGER_SCHEMA.contractName, 'DebuggerOutput');
  });

  it('enforces authorization boundaries against control-plane modifications (C-03 / Sec. 8)', async () => {
    // 1. Attempt to overwrite a control plane artifact via write_file tool
    const cpWriteResult = await executeTool(
      'write_file',
      { file_path: 'debug_report.md', content: 'fake report' },
      { conversationId: testConvoId, pipelineRunId: testRunId, stageExecutionId: testStageExecId }
    );
    assert.strictEqual(cpWriteResult.error, true);
    assert.ok(cpWriteResult.message.includes('Authorization Exception'));

    // 2. Attempt to patch a control plane artifact via apply_diff tool
    const cpDiffResult = await executeTool(
      'apply_diff',
      { file_path: 'plan.md', start_line: 1, end_line: 1, new_content: 'hijacked' },
      { conversationId: testConvoId, pipelineRunId: testRunId, stageExecutionId: testStageExecId }
    );
    assert.strictEqual(cpDiffResult.error, true);
    assert.ok(cpDiffResult.message.includes('Authorization Exception'));
  });

  it('executes authorized workspace mutation and verifies repair (C-03)', async () => {
    const targetFile = 'src/math/calculator.ts';
    const brokenCode = `export function add(a: number, b: number): number {\n  return a - b;\n}`;
    await writeVirtualFile(testConvoId, targetFile, brokenCode, {
      pipelineRunId: testRunId,
      stageExecutionId: testStageExecId,
    });

    // Initial check: verify code has bug
    const initialContent = await readVirtualFile(testConvoId, targetFile);
    assert.strictEqual(initialContent, brokenCode);

    // Debugger applies targeted surgical diff using authorized apply_diff tool
    const diffResult = await executeTool(
      'apply_diff',
      {
        file_path: targetFile,
        start_line: 2,
        end_line: 2,
        new_content: '  return a + b;',
      },
      {
        conversationId: testConvoId,
        pipelineRunId: testRunId,
        stageExecutionId: testStageExecId,
      }
    );
    assert.strictEqual(diffResult.success, true);

    // Workspace Mutation Proof: read actual VFS file to verify fix
    const repairedContent = await readVirtualFile(testConvoId, targetFile);
    assert.ok(repairedContent);
    assert.strictEqual(
      repairedContent,
      `export function add(a: number, b: number): number {\n  return a + b;\n}`
    );
  });

  it('validates Debugger Markdown report as evidence of repair (C-02)', async () => {
    const repairReport = `# Debugger Repair Report

### Issues Addressed
- Target: \`src/math/calculator.ts\`
- Diagnostic: Incorrect operator '-' in addition function.
- Root Cause: Typo in calculator logic returning subtraction instead of addition.

### Patches Applied
- Target: \`src/math/calculator.ts\`
- Lines: 2-2
- Replaced \`return a - b;\` with \`return a + b;\` to resolve calculation error.

### Verification
- Syntax verification ran with exit code 0.
- Unit test suite \`npm test\` passed with 100% test coverage.`;

    const validation = await validateStageCandidate({
      conversationId: testConvoId,
      pipelineRunId: 'test-run-1',
      candidate: {
        stage: 'Debugger',
        executionId: 'exec-dbg-1',
        attempt: 1,
        content: repairReport,
        contentHash: 'hash-repair-report',
        generatedAt: new Date(),
      },
    });

    assert.strictEqual(validation.accepted, true, `Report validation failed: ${validation.errors.join(', ')}`);
    assert.strictEqual(validation.errors.length, 0);

    const parsed = parseDebuggerOutput(repairReport);
    assert.ok(parsed.output);
    assert.ok(parsed.output.issuesAddressed.includes('src/math/calculator.ts'));
    assert.ok(parsed.output.patchesApplied.includes('return a + b;'));
    assert.ok(parsed.output.verification.includes('Unit test suite'));
  });

  it('strictly rejects retired JSON patch payload as current Debugger candidate (C-01, C-02)', async () => {
    const legacyPayload = JSON.stringify({
      patches: [
        {
          file: 'src/math/calculator.ts',
          startLine: 2,
          endLine: 2,
          replacement: 'return a + b;',
          reason: 'Fix addition',
        },
      ],
      unfixable: [],
    });

    const validation = await validateStageCandidate({
      conversationId: testConvoId,
      pipelineRunId: 'test-run-1',
      candidate: {
        stage: 'Debugger',
        executionId: 'exec-dbg-2',
        attempt: 1,
        content: legacyPayload,
        contentHash: 'hash-legacy-payload',
        generatedAt: new Date(),
      },
    });

    assert.strictEqual(validation.accepted, false);
    assert.ok(
      validation.errors.some((e) => e.includes('Missing required section')),
      'Legacy JSON payload must be rejected for missing Markdown sections'
    );
  });
});
