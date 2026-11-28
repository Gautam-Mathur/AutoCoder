import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../../db';
import {
  normalizeProjectPath,
  parseBlueprintContract,
  computeAuthorizedFileSet,
} from '../workspace-policy';
import {
  parseBlueprintFiles,
  validateBlueprintGraph,
  classifyBlueprintDependency,
  computeCoderExecutionOrder,
} from '../blueprint-graph';
import { parseTsConfigOptions, resolveModule } from '../module-resolver';
import {
  collectExternalDependencies,
  validatePackageDependencies,
} from '../dependency-validator';
import { validateStageCandidate } from '../stage-acceptance';
import { runAgent } from '../agent-runner';
import { executeContractStage } from '../contract-executor';
import { coordinateRepair } from '../repair-coordinator';
import { computeWorkspaceFingerprint } from '../verification-loop';
import { commitAcceptedArtifact } from '../artifact-store';
import { getStageContract } from '../contracts/registry';
import { writeVirtualFile } from '../vfs';
import { StageLedger, loadExecutiveMemory } from '../memory';
import * as CoderRegistry from '../registry/Coder';
import * as DebuggerRegistry from '../registry/Debugger';

describe('RCA Remediation: Dependency Graph, Coder Context, AST Package Scanner & Verification Authority', () => {
  const prefix = `rca-hardening-${Date.now()}`;
  const createdConvIds: string[] = [];

  async function createSeededConversation(
    suffix: string,
    stage: string = 'Coder',
    files: string[] = ['index.html', 'style.css', 'script.js', 'src/app.ts', 'src/utils.ts', 'src/index.ts']
  ) {
    const convId = `${prefix}-${suffix}`;
    const runId = `${prefix}-run-${suffix}`;
    const leaseOwner = `lease-${suffix}`;
    createdConvIds.push(convId);

    await prisma.conversation.create({
      data: {
        id: convId,
        title: `RCA Test ${suffix}`,
        status: 'Active',
        currentStage: stage,
      },
    });

    await prisma.pipelineRun.create({
      data: {
        id: runId,
        conversationId: convId,
        state: 'RUNNING',
        currentStage: stage,
        leaseOwner,
        leaseExpiresAt: new Date(Date.now() + 300_000),
      },
    });

    const archMd = [
      '### Tech Stack',
      '- **Frontend**: Web',
      `- **Frontend Entry Point**: ${files[0]}`,
      '- **Backend**: None',
      '- **Backend Entry Point**: None',
      '- **Database**: None',
      '- **ORM**: None',
      '- **Authentication**: None',
      '- **Build Tool**: None',
      '- **Additional**: None',
      '',
      '### Project Folder Structure',
      'project-root/',
      '├── index.html',
      '├── style.css',
      '├── script.js',
      '└── src/',
      '    ├── app.ts',
      '    ├── utils.ts',
      '    └── index.ts',
      '',
      '### Project Files',
      ...files.map((f) => `- ${f}`),
      '',
      '### Modules',
      '**Core**',
      '- Responsibility: Core files',
      `- Owned Files: ${files.join(', ')}`,
      '- Depends On: None',
      '- Supports Features: Feature-001',
      '',
      '### Conventions',
      '- **File Naming**: camelCase',
    ].join('\n');

    const bpMd = files
      .map(
        (f) =>
          `### File: ${f}\n- **Owner Module**: Core\n- **Purpose**: File ${f}\n- **Dependencies**: None\n- **Exports**: None`
      )
      .join('\n\n');

    const archContract = getStageContract('Architect').outputArtifact;
    const bpContract = getStageContract('Blueprinter').outputArtifact;

    await commitAcceptedArtifact({
      conversationId: convId,
      pipelineRunId: runId,
      stage: 'Architect',
      filePath: archContract.name,
      content: archMd,
      contractName: archContract.contract,
      contractVersion: archContract.version,
    });

    await commitAcceptedArtifact({
      conversationId: convId,
      pipelineRunId: runId,
      stage: 'Blueprinter',
      filePath: bpContract.name,
      content: bpMd,
      contractName: bpContract.contract,
      contractVersion: bpContract.version,
    });

    const seedExec = await prisma.stageExecution.create({
      data: {
        id: `${prefix}-seed-${suffix}`,
        conversationId: convId,
        pipelineRunId: runId,
        stageName: 'Coder',
        attempt: 1,
        state: 'RUNNING',
      },
    });

    return { convId, runId, leaseOwner, seedExecId: seedExec.id };
  }

  after(async () => {
    for (const cid of createdConvIds) {
      await prisma.gateDecision.deleteMany({ where: { conversationId: cid } }).catch(() => {});
      await prisma.verificationRun.deleteMany({ where: { conversationId: cid } }).catch(() => {});
      await prisma.pipelineEvent.deleteMany({ where: { conversationId: cid } }).catch(() => {});
      await prisma.artifactVersion.deleteMany({ where: { conversationId: cid } }).catch(() => {});
      await prisma.stageExecution.deleteMany({ where: { conversationId: cid } }).catch(() => {});
      await prisma.virtualFile.deleteMany({ where: { conversationId: cid } }).catch(() => {});
      await prisma.executiveMemory.deleteMany({ where: { conversationId: cid } }).catch(() => {});
      await prisma.agentOutput.deleteMany({ where: { conversationId: cid } }).catch(() => {});
      await prisma.pipelineRun.deleteMany({ where: { conversationId: cid } }).catch(() => {});
      await prisma.conversation.deleteMany({ where: { id: cid } }).catch(() => {});
    }
  });

  describe('1. Canonical Blueprint Dependency Parsing & Graph Validation', () => {
    it('parses multiline bullets (1+ space indent), strips ./ and /, ignores hyphenated field prose, and matches across both parsers', () => {
      const bp = `### file: src/pages/Home.tsx (Main View)
- **Owner Module**: UI Module
- **Purpose**: Home view
- **Dependencies**:
 - ./src/components/Header.tsx (top bar)
  - /src/lib/api.ts
  * ~/utils/format.ts
- **Implementation-Details**:
  - Render main hero section with search input
  - Bind click handlers to primary CTA
- **Specs Required**: None
- **Exports**: default function Home()

### File: src/components/Header.tsx
- **Owner Module**: UI Module
- **Dependencies**: src/lib/api.ts, ~/utils/format.ts
- **Exports**: export function Header()

### File: src/lib/api.ts
- **Owner Module**: API Module
- **Dependencies**: None
- **Exports**: export async function fetchItems()

### File: src/utils/format.ts
- **Owner Module**: Utils Module
- **Dependencies**: None
- **Exports**: export function formatCurrency()`;

      const contractParsed = parseBlueprintContract(bp);
      const filesParsed = parseBlueprintFiles(bp);

      assert.equal(contractParsed.parserErrors.length, 0);
      assert.equal(contractParsed.files.length, 4);
      assert.equal(filesParsed.length, 4, 'Must not inject synthetic index.html for src/pages/ project');

      const expectedHomeDeps = [
        'src/components/Header.tsx',
        'src/lib/api.ts',
        '~/utils/format.ts',
      ];
      assert.deepEqual(contractParsed.files[0].dependencies, expectedHomeDeps);
      assert.deepEqual(filesParsed[0].dependencies, expectedHomeDeps);
      assert.ok(
        !contractParsed.files[0].dependencies.some((d) => d.includes('Render main hero')),
        'Hyphenated Implementation-Details bullets must never leak into dependencies'
      );

      const graphVal = validateBlueprintGraph(filesParsed);
      assert.equal(graphVal.valid, true, `Expected valid graph, got: ${graphVal.errors.join('; ')}`);
    });

    it('does not inject phantom index.html into Next.js src/app + Prisma blueprints', () => {
      const nextPrismaBlueprint = `### File: next.config.mjs
- **Owner Module**: Config/Setup
- **Purpose**: Next config
- **Dependencies**: None
- **Exports**: default

### File: src/lib/prisma.ts
- **Owner Module**: Data Module
- **Purpose**: Prisma client singleton
- **Dependencies**: None
- **Exports**: export const prisma

### File: src/app/api/items/route.ts
- **Owner Module**: API Module
- **Purpose**: Items endpoint
- **Dependencies**: src/lib/prisma.ts
- **Exports**: export async function GET

### File: src/app/page.tsx
- **Owner Module**: UI Module
- **Purpose**: Server component home page
- **Dependencies**: src/lib/prisma.ts
- **Exports**: export default function Page`;

      const sections = parseBlueprintFiles(nextPrismaBlueprint);
      assert.ok(!sections.some((s) => s.file === 'index.html'), 'Next.js src/app must not synthesize index.html');
      const graphVal = validateBlueprintGraph(sections);
      assert.equal(graphVal.valid, true, `Unexpected boundary errors: ${graphVal.errors.join('; ')}`);
    });

    it('supports broader local file extensions and preserves ~/ alias in tsconfig without explicit paths', () => {
      for (const extFile of ['theme.scss', 'seed.mjs', 'config.cjs', 'schema.sql', 'layout.html']) {
        assert.equal(classifyBlueprintDependency(extFile), 'LOCAL_FILE', `Expected ${extFile} to be LOCAL_FILE`);
      }

      const tsOpts = parseTsConfigOptions(JSON.stringify({ compilerOptions: { strict: true } }));
      assert.ok(tsOpts.paths?.['~/*'], 'Expected ~/* alias to be preserved even when tsconfig omits paths');

      const resolvedAlias = resolveModule('src/pages/Home.tsx', '~/lib/client', {
        files: ['src/pages/Home.tsx', 'src/lib/client.ts'],
        baseUrl: tsOpts.baseUrl,
        paths: tsOpts.paths,
      });
      assert.equal(resolvedAlias, 'src/lib/client.ts');
    });

    it('rejects cyclic dependencies and unapproved architecture files during Blueprinter stage acceptance', async () => {
      const archMd = `### Tech Stack
- **Frontend**: TypeScript
- **Frontend Entry Point**: src/a.ts
- **Backend**: None
- **Backend Entry Point**: None
- **Database**: None
- **ORM**: None
- **Authentication**: None
- **Build Tool**: Vite
- **Additional**: None

### Project Folder Structure
project-root/
└── src/
    ├── a.ts
    └── b.ts

### Project Files
- src/a.ts
- src/b.ts

### Modules
**Core**
- Responsibility: Core logic
- Owned Files: src/a.ts, src/b.ts
- Depends On: None
- Supports Features: Feature-001

### Conventions
- **File Naming**: camelCase`;

      const cyclicBlueprint = `### File: src/a.ts
- **Owner Module**: Core
- **Purpose**: Module A
- **Dependencies**: src/b.ts
- **Exports**: export const a

### File: src/b.ts
- **Owner Module**: Core
- **Purpose**: Module B
- **Dependencies**: src/a.ts
- **Exports**: export const b`;

      const cycleAcceptance = await validateStageCandidate({
        conversationId: 'test-cycle',
        pipelineRunId: 'run-cycle',
        candidate: {
          stage: 'Blueprinter',
          executionId: 'exec-bp-cycle',
          attempt: 1,
          content: cyclicBlueprint,
          contentHash: 'h1',
          generatedAt: new Date(),
        },
        upstreamContext: { 'architecture.md': archMd },
      });

      assert.equal(cycleAcceptance.accepted, false, 'Cyclic blueprint must be rejected at Blueprinter acceptance');
      assert.ok(cycleAcceptance.errors.some((e) => /cycle/i.test(e)));

      const missingArchDepBlueprint = `### File: src/a.ts
- **Owner Module**: Core
- **Purpose**: Module A
- **Dependencies**: src/unapprovedHelper.ts
- **Exports**: export const a

### File: src/b.ts
- **Owner Module**: Core
- **Purpose**: Module B
- **Dependencies**: None
- **Exports**: export const b`;

      const missingDepAcceptance = await validateStageCandidate({
        conversationId: 'test-missing',
        pipelineRunId: 'run-missing',
        candidate: {
          stage: 'Blueprinter',
          executionId: 'exec-bp-missing',
          attempt: 1,
          content: missingArchDepBlueprint,
          contentHash: 'h2',
          generatedAt: new Date(),
        },
        upstreamContext: { 'architecture.md': archMd },
      });

      assert.equal(missingDepAcceptance.accepted, false);
      assert.ok(
        missingDepAcceptance.errors.some((e) => e.includes('ARCHITECTURE_REVISION_REQUIRED')),
        `Expected ARCHITECTURE_REVISION_REQUIRED tag in error: ${missingDepAcceptance.errors.join('; ')}`
      );
    });
  });

  describe('2. Topological Ordering vs Static HTML Exception & Coder Context Safeguards', () => {
    it('orders TypeScript/React providers before consumers even when consumer sorts alphabetically first', () => {
      const bp = `### File: src/app.ts
- **Owner Module**: Core
- **Dependencies**: src/z_provider.ts
- **Exports**: export const app

### File: src/z_provider.ts
- **Owner Module**: Core
- **Dependencies**: None
- **Exports**: export function provide()`;

      const res = computeCoderExecutionOrder({
        authorizedFiles: ['src/app.ts', 'src/z_provider.ts'],
        blueprintContent: bp,
      });

      assert.equal(res.isStaticHtml, false);
      assert.equal(res.validation.valid, true);
      assert.deepEqual(res.orderedFiles, ['src/z_provider.ts', 'src/app.ts']);
    });

    it('applies Static HTML exception: processes index.html first and passes HTML DOM IDs to CSS/JS without failing preflight', async () => {
      const { convId, runId, seedExecId } = await createSeededConversation('static-html');
      const staticBp = `### File: index.html
- **Owner Module**: Web
- **Purpose**: Main HTML page
- **Dependencies**: style.css (linked via <link>), script.js (loaded via <script>)
- **Exports**: None

### File: style.css
- **Owner Module**: Web
- **Purpose**: Styles
- **Dependencies**: None
- **Exports**: None

### File: script.js
- **Owner Module**: Web
- **Purpose**: Client script
- **Dependencies**: None (reads DOM from index.html)
- **Exports**: None`;

      const orderRes = computeCoderExecutionOrder({
        authorizedFiles: ['index.html', 'script.js', 'style.css'],
        blueprintContent: staticBp,
      });
      assert.equal(orderRes.isStaticHtml, true);
      assert.equal(orderRes.orderedFiles[0], 'index.html', 'Static HTML must generate index.html first');

      await writeVirtualFile(convId, 'blueprint.md', staticBp, {
        pipelineRunId: runId,
        allowControlPlane: true,
      });

      const ledger = new StageLedger(convId, await loadExecutiveMemory(convId));

      // 1. Run Coder for index.html BEFORE style.css and script.js exist -> must NOT fail closed
      let htmlPromptCaptured = '';
      await runAgent(
        convId,
        'Coder',
        'Build a lantern catalog page',
        () => {},
        ledger,
        1,
        undefined,
        undefined,
        undefined,
        'index.html',
        false,
        {
          pipelineRunId: runId,
          stageExecutionId: seedExecId,
          allowedMutationPaths: ['index.html'],
          inferenceTurnFn: async (msgs) => {
            htmlPromptCaptured = msgs.find((m) => m.role === 'user')?.content || '';
            return {
              content: '<!DOCTYPE html><html><body><div id="lantern-grid"></div><button id="filter-btn"></button></body></html>',
              toolCalls: [],
              provider: 'mock',
              model: 'mock',
              durationMs: 1,
            };
          },
        }
      );
      assert.match(htmlPromptCaptured, /=== ORIGINAL USER REQUEST ===/);
      assert.match(htmlPromptCaptured, /Build a lantern catalog page/);

      // Persist index.html to VFS as Coder stage does
      await writeVirtualFile(
        convId,
        'index.html',
        '<!DOCTYPE html><html><body><div id="lantern-grid"></div><button id="filter-btn"></button></body></html>',
        { pipelineRunId: runId, stageExecutionId: seedExecId }
      );

      // 2. Run Coder for script.js -> must receive index.html DOM IDs automatically
      let jsPromptCaptured = '';
      await runAgent(
        convId,
        'Coder',
        'Build a lantern catalog page',
        () => {},
        ledger,
        1,
        undefined,
        undefined,
        undefined,
        'script.js',
        false,
        {
          pipelineRunId: runId,
          stageExecutionId: seedExecId,
          allowedMutationPaths: ['script.js'],
          inferenceTurnFn: async (msgs) => {
            jsPromptCaptured = msgs.find((m) => m.role === 'user')?.content || '';
            return {
              content: 'const grid = document.getElementById("lantern-grid");',
              toolCalls: [],
              provider: 'mock',
              model: 'mock',
              durationMs: 1,
            };
          },
        }
      );
      assert.match(jsPromptCaptured, /lantern-grid/, 'script.js must receive DOM IDs extracted from index.html');
    });

    it('fails closed on missing compile-time VFS dependencies and prevents duplicate target injection', async () => {
      const { convId, runId, seedExecId } = await createSeededConversation('coder-safeguards');
      const tsBp = `### File: src/app.ts
- **Owner Module**: Core
- **Purpose**: Main entry
- **Dependencies**: src/utils.ts
- **Exports**: export const result

### File: src/utils.ts
- **Owner Module**: Core
- **Purpose**: Helpers
- **Dependencies**: None
- **Exports**: export function helper()`;

      await writeVirtualFile(convId, 'blueprint.md', tsBp, {
        pipelineRunId: runId,
        allowControlPlane: true,
      });

      const ledger = new StageLedger(convId, await loadExecutiveMemory(convId));

      // 1. Missing src/utils.ts in VFS -> must fail closed before inference
      await assert.rejects(
        () =>
          runAgent(
            convId,
            'Coder',
            'Build helper app',
            () => {},
            ledger,
            1,
            undefined,
            undefined,
            undefined,
            'src/app.ts',
            false,
            {
              pipelineRunId: runId,
              stageExecutionId: seedExecId,
              allowedMutationPaths: ['src/app.ts'],
              inferenceTurnFn: async () => ({
                content: 'export const result = 1;',
                toolCalls: [],
                provider: 'mock',
                model: 'mock',
                durationMs: 1,
              }),
            }
          ),
        /required dependency "src\/utils\.ts" is not present in the VFS/
      );

      // 2. Write src/utils.ts and a placeholder in src/app.ts -> placeholder must NOT be injected as EXISTING TARGET FILE
      await writeVirtualFile(convId, 'src/utils.ts', 'export function helper(): number { return 42; }\n', {
        pipelineRunId: runId,
        stageExecutionId: seedExecId,
      });
      await writeVirtualFile(convId, 'src/app.ts', '<!-- Stage: Coder (src/app.ts) in progress... -->\n', {
        pipelineRunId: runId,
        stageExecutionId: seedExecId,
      });

      let promptWithPlaceholder = '';
      await runAgent(
        convId,
        'Coder',
        'Build helper app',
        () => {},
        ledger,
        1,
        undefined,
        undefined,
        undefined,
        'src/app.ts',
        false,
        {
          pipelineRunId: runId,
          stageExecutionId: seedExecId,
          allowedMutationPaths: ['src/app.ts'],
          inferenceTurnFn: async (msgs) => {
            promptWithPlaceholder = msgs.find((m) => m.role === 'user')?.content || '';
            return {
              content: 'import { helper } from "./utils";\nexport const result = helper();\n',
              toolCalls: [],
              provider: 'mock',
              model: 'mock',
              durationMs: 1,
            };
          },
        }
      );
      assert.ok(
        !promptWithPlaceholder.includes('=== EXISTING TARGET FILE:'),
        'In-progress VFS placeholder must not be injected as EXISTING TARGET FILE'
      );

      // 3. Write actual valid code to src/app.ts -> injected once when no repair TARGET_FILE block exists,
      // and NOT duplicated when customUserContent already has (TARGET_FILE:
      await writeVirtualFile(
        convId,
        'src/app.ts',
        'import { helper } from "./utils";\nexport const result = helper();\n',
        { pipelineRunId: runId, stageExecutionId: seedExecId }
      );

      let promptNormalExisting = '';
      await runAgent(
        convId,
        'Coder',
        'Build helper app',
        () => {},
        ledger,
        1,
        undefined,
        undefined,
        undefined,
        'src/app.ts',
        false,
        {
          pipelineRunId: runId,
          stageExecutionId: seedExecId,
          allowedMutationPaths: ['src/app.ts'],
          inferenceTurnFn: async (msgs) => {
            promptNormalExisting = msgs.find((m) => m.role === 'user')?.content || '';
            return {
              content: 'import { helper } from "./utils";\nexport const result = helper();\n',
              toolCalls: [],
              provider: 'mock',
              model: 'mock',
              durationMs: 1,
            };
          },
        }
      );
      assert.ok(promptNormalExisting.includes('=== EXISTING TARGET FILE: src/app.ts ==='));

      let promptWithRepairTarget = '';
      await runAgent(
        convId,
        'Coder',
        'Build helper app',
        () => {},
        ledger,
        1,
        '#### src/app.ts (TARGET_FILE: Current contents of the target file being repaired.)\n```\nimport { helper } from "./utils";\n```',
        undefined,
        undefined,
        'src/app.ts',
        false,
        {
          pipelineRunId: runId,
          stageExecutionId: seedExecId,
          allowedMutationPaths: ['src/app.ts'],
          inferenceTurnFn: async (msgs) => {
            promptWithRepairTarget = msgs.find((m) => m.role === 'user')?.content || '';
            return {
              content: 'import { helper } from "./utils";\nexport const result = helper();\n',
              toolCalls: [],
              provider: 'mock',
              model: 'mock',
              durationMs: 1,
            };
          },
        }
      );
      assert.ok(
        !promptWithRepairTarget.includes('=== EXISTING TARGET FILE:'),
        'Must not duplicate target file when repair instructions already contain (TARGET_FILE:'
      );
    });
  });

  describe('3. TypeScript AST External Package Dependency Scanner', () => {
    it('detects ESM imports, re-exports, dynamic imports, and CommonJS require while excluding Node built-ins and aliases', () => {
      const files = {
        'src/index.ts': `
          import React from 'react';
          export { z } from 'zod';
          export * from '@tanstack/react-query/build/modern';
          const debounce = require('lodash/debounce');
          async function loadChart() {
            const c = await import('chart.js/auto');
            const d = await import(\`date-fns\`);
            return { c, d };
          }
          import fs from 'node:fs/promises';
          import timers from 'timers/promises';
          import diag from 'diagnostics_channel';
          import trace from 'trace_events';
          import Button from '~/components/Button';
          import Card from '@/components/Card';
          import internalPkg from '#internal/helper';
        `,
      };

      const detected = collectExternalDependencies(files);
      assert.deepEqual(
        detected.sort(),
        ['@tanstack/react-query', 'chart.js', 'date-fns', 'lodash', 'react', 'zod'].sort()
      );

      const validation = validatePackageDependencies(
        files,
        JSON.stringify({
          dependencies: {
            react: '^19.0.0',
            zod: '^3.0.0',
          },
        })
      );
      assert.equal(validation.valid, false);
      assert.deepEqual(
        validation.missingPackages.sort(),
        ['@tanstack/react-query', 'chart.js', 'date-fns', 'lodash'].sort()
      );
    });
  });

  describe('4. VerificationRun Authority, Stage Acceptance Warnings & Prompt Alignment', () => {
    it('enforces persisted VerificationRun integrity against missing, failed, or stale records while accepting valid PASS', async () => {
      const { convId, runId, seedExecId } = await createSeededConversation('verification-authority', 'Tester');
      await writeVirtualFile(convId, 'src/index.ts', 'export const ok = true;\n', {
        pipelineRunId: runId,
        stageExecutionId: seedExecId,
      });
      const validHash = await computeWorkspaceFingerprint(convId);

      // Case 1: requirePersistedVerification=true with NO VerificationRun in DB -> throws integrity error
      await assert.rejects(
        () =>
          coordinateRepair({
            conversationId: convId,
            pipelineRunId: runId,
            requirePersistedVerification: true,
            emit: () => {},
            executeStageFn: async () => ({
              status: 'ACCEPTED',
              content: `# Test Report\n\n### Result\nPASS\n\n### Workspace Hash\n${validHash}`,
            }),
          }),
        /no persisted VerificationRun exists/
      );

      // Case 2: Persisted VerificationRun has success=false, but report claims PASS -> throws integrity error
      const failedRun = await prisma.verificationRun.create({
        data: {
          conversationId: convId,
          pipelineRunId: runId,
          stageExecutionId: seedExecId,
          cycle: 1,
          workspaceHash: validHash,
          success: false,
          failuresJson: JSON.stringify([{ file: 'src/index.ts', message: 'Failed check' }]),
          warningsJson: '[]',
        },
      });

      await assert.rejects(
        () =>
          coordinateRepair({
            conversationId: convId,
            pipelineRunId: runId,
            emit: () => {},
            executeStageFn: async () => ({
              status: 'ACCEPTED',
              verificationRunId: failedRun.id,
              content: `# Test Report\n\n### Result\nPASS\n\n### Workspace Hash\n${validHash}\n\n### Verification Run ID\n${failedRun.id}`,
            }),
          }),
        /report result does not match persisted VerificationRun\.success/
      );

      // Case 3: Persisted VerificationRun has stale workspaceHash -> throws integrity error
      const staleRun = await prisma.verificationRun.create({
        data: {
          conversationId: convId,
          pipelineRunId: runId,
          stageExecutionId: seedExecId,
          cycle: 2,
          workspaceHash: '0'.repeat(64),
          success: true,
          failuresJson: '[]',
          warningsJson: '[]',
        },
      });

      await assert.rejects(
        () =>
          coordinateRepair({
            conversationId: convId,
            pipelineRunId: runId,
            emit: () => {},
            executeStageFn: async () => ({
              status: 'ACCEPTED',
              verificationRunId: staleRun.id,
              content: `# Test Report\n\n### Result\nPASS\n\n### Workspace Hash\n${'0'.repeat(64)}\n\n### Verification Run ID\n${staleRun.id}`,
            }),
          }),
        /VerificationRun workspace hash is stale/
      );

      // Case 4: Fresh passing VerificationRun with matching workspaceHash -> succeeds cleanly
      const passingRun = await prisma.verificationRun.create({
        data: {
          conversationId: convId,
          pipelineRunId: runId,
          stageExecutionId: seedExecId,
          cycle: 3,
          workspaceHash: validHash,
          success: true,
          failuresJson: '[]',
          warningsJson: '[]',
        },
      });

      await coordinateRepair({
        conversationId: convId,
        pipelineRunId: runId,
        requirePersistedVerification: true,
        emit: () => {},
        executeStageFn: async () => ({
          status: 'ACCEPTED',
          verificationRunId: passingRun.id,
          content: `# Test Report\n\n### Result\nPASS\n\n### Workspace Hash\n${validHash}\n\n### Verification Run ID\n${passingRun.id}`,
        }),
      });
    });

    it('emits explicit ACCEPTED != PASS warnings on Tester/Debugger acceptance and keeps Coder/Debugger prompts consistent', async () => {
      const hash = 'f'.repeat(64);
      const failTester = await validateStageCandidate({
        conversationId: 'c1',
        pipelineRunId: 'r1',
        candidate: {
          stage: 'Tester',
          executionId: 'e1',
          attempt: 1,
          content: `# Test Report\n\n### Result\nFAIL\n\n### Summary\n1 failure\n\n### Tests\n- Check: FAIL\n\n### Failures\n- [a.ts] err\n\n### Workspace Hash\n${hash}`,
          contentHash: 'h',
          generatedAt: new Date(),
        },
        evidence: { currentWorkspaceHash: hash },
      });
      assert.equal(failTester.accepted, true);
      assert.ok(failTester.warnings.some((w) => w.includes('ACCEPTED does not mean PASS')));

      const dbgAcceptance = await validateStageCandidate({
        conversationId: 'c1',
        pipelineRunId: 'r1',
        candidate: {
          stage: 'Debugger',
          executionId: 'e2',
          attempt: 1,
          content: `# Debug Report\n\n### Issues Addressed\nFixed bug.\n\n### Patches Applied\n- File: src/a.ts\n\n### Verification\nRan check_syntax.`,
          contentHash: 'h2',
          generatedAt: new Date(),
        },
      });
      assert.equal(dbgAcceptance.accepted, true);
      assert.ok(dbgAcceptance.warnings.some((w) => w.includes('repair documentation only')));

      // Prompt consistency invariants
      assert.ok(!CoderRegistry.systemPrompt.includes('If two specs give different names, use the blueprint name'));
      assert.ok(!CoderRegistry.systemPrompt.includes('report the discrepancy'));
      assert.ok(CoderRegistry.systemPrompt.includes('Your output is raw source code.'));
      assert.ok(DebuggerRegistry.systemPrompt.includes('IMPORTANT VERIFICATION AUTHORITY:'));
      assert.ok(!DebuggerRegistry.systemPrompt.includes('build, or test verification available'));
    });

    it('halts terminally with BUDGET_EXCEEDED when repair cycles are exhausted and rejects maxCycles < 1', async () => {
      const { convId, runId } = await createSeededConversation('cycle-budget', 'Tester');

      await assert.rejects(
        () =>
          coordinateRepair({
            conversationId: convId,
            pipelineRunId: runId,
            maxCycles: 0,
            emit: () => {},
            executeStageFn: async () => ({ status: 'ACCEPTED', content: '' }),
          }),
        /Invalid maxCycles/
      );

      let testerRuns = 0;
      await assert.rejects(
        () =>
          coordinateRepair({
            conversationId: convId,
            pipelineRunId: runId,
            maxCycles: 2,
            authorizedFileSet: {
              authorizedFiles: ['src/a.ts'],
              coderAuthorizedFiles: ['src/a.ts'],
            } as any,
            emit: () => {},
            executeStageFn: async (stageName) => {
              if (stageName === 'Tester') {
                testerRuns++;
                const failures =
                  testerRuns === 1
                    ? '- [src/a.ts] Err 1\n- [src/a.ts] Err 2'
                    : '- [src/a.ts] Err 1';
                return {
                  status: 'ACCEPTED',
                  content: `# Test Report\n\n### Result\nFAIL\n\n### Failures\n${failures}\n\n### Workspace Hash\n${String(testerRuns).repeat(64)}`,
                };
              }
              if (stageName === 'Debugger') {
                return {
                  status: 'ACCEPTED',
                  content: `# Debug Report\n\n### Issues Addressed\n- File: src/a.ts\n\n### Patches Applied\n- File: src/a.ts\n\n### Verification\nChecked.`,
                };
              }
              if (stageName === 'Coder') {
                return { status: 'ACCEPTED', content: 'export const a = 1;' };
              }
              throw new Error(`Unexpected stage ${stageName}`);
            },
          }),
        /BUDGET_EXCEEDED/
      );
      assert.equal(testerRuns, 2);
    });
  });
});
