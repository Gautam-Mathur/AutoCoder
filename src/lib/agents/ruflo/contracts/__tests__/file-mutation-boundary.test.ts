import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { prisma } from '../../../../db';
import {
  writeVirtualFile,
  applyDiff,
  deleteVirtualFile,
  readVirtualFile,
  writeAuthorizedProjectFile,
  applyAuthorizedDiff,
  deleteAuthorizedProjectFile,
  assertAuthorizedFileMutation,
} from '../../vfs';
import { executeTool } from '../../toolbox';

describe('File Mutation Boundary & Authorization Audit Suite', () => {
  const prefix = `mutation-audit-${Date.now()}`;
  const convId1 = `${prefix}-conv-1`;
  const convId2 = `${prefix}-conv-2`;
  const runId1 = `${prefix}-run-1`;
  const runId2 = `${prefix}-run-2`;

  const coderStageId = `${prefix}-stage-coder`;
  const debuggerStageId = `${prefix}-stage-debugger`;
  const testerStageId = `${prefix}-stage-tester`;
  const plannerStageId = `${prefix}-stage-planner`;
  const staleStageId = `${prefix}-stage-stale`;
  const setupStageId = `${prefix}-stage-setup`;

  const validArchMd = `### Tech Stack
- Frontend: Next.js
- Frontend Entry Point: src/index.ts
- Backend: None
- Backend Entry Point: None
- Database: None
- ORM: None
- Authentication: None
- Build Tool: Next.js
- Additional: None

### Project Folder Structure
project-root/
├── src/
│   ├── index.ts
│   └── components/
│       └── Header.tsx
└── public/
    └── favicon.ico

### Project Files
- src/index.ts
- src/components/Header.tsx
- public/favicon.ico

### Modules
**Core Module**
- Responsibility: Main app
- Owned Files: src/index.ts
- Depends On: None
- Supports Features: Core

**UI Module**
- Responsibility: UI elements
- Owned Files: src/components/Header.tsx
- Depends On: None
- Supports Features: UI

### Conventions
- File Naming: camelCase
`;

  const validBlueprintMd = `### File: src/index.ts
- Owner Module: Core Module
- Purpose: Application entry
- Dependencies: None
- Specs Required: None
- Exports: export const hello

### File: src/components/Header.tsx
- Owner Module: UI Module
- Purpose: Header component
- Dependencies: None
- Specs Required: None
- Exports: export function Header()
`;

  before(async () => {
    // 1. Create conversations
    await prisma.conversation.create({
      data: {
        id: convId1,
        title: 'Mutation Audit Conversation 1',
        status: 'Active',
        currentStage: 'Coder',
      },
    });

    await prisma.conversation.create({
      data: {
        id: convId2,
        title: 'Mutation Audit Conversation 2',
        status: 'Active',
        currentStage: 'Coder',
      },
    });

    // 2. Create pipeline runs
    await prisma.pipelineRun.create({
      data: {
        id: runId1,
        conversationId: convId1,
        state: 'RUNNING',
      },
    });

    await prisma.pipelineRun.create({
      data: {
        id: runId2,
        conversationId: convId2,
        state: 'RUNNING',
      },
    });

    // 3. Create stage executions for run 1
    await prisma.stageExecution.create({
      data: {
        id: coderStageId,
        conversationId: convId1,
        pipelineRunId: runId1,
        stageName: 'Coder',
        attempt: 1,
        state: 'RUNNING',
      },
    });

    await prisma.stageExecution.create({
      data: {
        id: debuggerStageId,
        conversationId: convId1,
        pipelineRunId: runId1,
        stageName: 'Debugger',
        attempt: 1,
        state: 'RUNNING',
      },
    });

    await prisma.stageExecution.create({
      data: {
        id: testerStageId,
        conversationId: convId1,
        pipelineRunId: runId1,
        stageName: 'Tester',
        attempt: 1,
        state: 'RUNNING',
      },
    });

    await prisma.stageExecution.create({
      data: {
        id: plannerStageId,
        conversationId: convId1,
        pipelineRunId: runId1,
        stageName: 'Planner',
        attempt: 1,
        state: 'RUNNING',
      },
    });

    await prisma.stageExecution.create({
      data: {
        id: staleStageId,
        conversationId: convId1,
        pipelineRunId: runId1,
        stageName: 'Coder',
        attempt: 2,
        state: 'ACCEPTED', // Completed / Stale!
      },
    });

    await prisma.stageExecution.create({
      data: {
        id: setupStageId,
        conversationId: convId1,
        pipelineRunId: runId1,
        stageName: 'Setup',
        attempt: 1,
        state: 'RUNNING',
      },
    });

    // 4. Seed accepted architecture and blueprint for run 1
    await prisma.artifactVersion.create({
      data: {
        conversationId: convId1,
        pipelineRunId: runId1,
        stageName: 'Architect',
        filePath: 'architecture.md',
        version: 1,
        contentHash: 'hash-arch-mut-1',
        content: validArchMd,
        state: 'ACCEPTED',
      },
    });

    await prisma.artifactVersion.create({
      data: {
        conversationId: convId1,
        pipelineRunId: runId1,
        stageName: 'Blueprinter',
        filePath: 'blueprint.md',
        version: 1,
        contentHash: 'hash-blue-mut-1',
        content: validBlueprintMd,
        state: 'ACCEPTED',
      },
    });
  });

  after(async () => {
    await prisma.artifactVersion.deleteMany({
      where: { conversationId: { in: [convId1, convId2] } },
    });
    await prisma.stageExecution.deleteMany({
      where: { conversationId: { in: [convId1, convId2] } },
    });
    await prisma.pipelineRun.deleteMany({
      where: { conversationId: { in: [convId1, convId2] } },
    });
    await prisma.virtualFile.deleteMany({
      where: { conversationId: { in: [convId1, convId2] } },
    });
    await prisma.conversation.deleteMany({
      where: { id: { in: [convId1, convId2] } },
    });
    await prisma.$disconnect();
  });

  describe('1. Missing Pipeline Run IDs (Zero Fallback Policy)', () => {
    it('fails closed when writeVirtualFile is called without auth', async () => {
      await assert.rejects(
        async () => {
          await writeVirtualFile(convId1, 'src/index.ts', 'const a = 1;');
        },
        /Authorization Exception: active pipelineRunId is mandatory for file mutation/
      );
    });

    it('fails closed when writeVirtualFile has empty pipelineRunId', async () => {
      await assert.rejects(
        async () => {
          await writeVirtualFile(convId1, 'src/index.ts', 'const a = 1;', {
            pipelineRunId: '   ',
            stageExecutionId: coderStageId,
          });
        },
        /Authorization Exception: active pipelineRunId is mandatory for file mutation/
      );
    });

    it('fails closed when applyDiff is called without auth', async () => {
      await assert.rejects(
        async () => {
          await applyDiff(convId1, 'src/index.ts', 1, 1, 'const a = 2;');
        },
        /Authorization Exception: active pipelineRunId is mandatory for file mutation/
      );
    });

    it('fails closed when deleteVirtualFile is called without auth', async () => {
      await assert.rejects(
        async () => {
          await deleteVirtualFile(convId1, 'src/index.ts');
        },
        /Authorization Exception: active pipelineRunId is mandatory for file mutation/
      );
    });

    it('fails closed in toolbox write_file when pipelineRunId is missing', async () => {
      const res = await executeTool(
        'write_file',
        { file_path: 'src/index.ts', content: 'export const hello = true;' },
        convId1
      );
      assert.strictEqual(res.error, true);
      assert.ok(res.message.includes('Authorization Exception: active pipelineRunId is mandatory'));
    });

    it('fails closed in toolbox apply_diff when pipelineRunId is missing', async () => {
      const res = await executeTool(
        'apply_diff',
        { file_path: 'src/index.ts', start_line: 1, end_line: 1, new_content: 'export const hello = false;' },
        convId1
      );
      assert.strictEqual(res.error, true);
      assert.ok(res.message.includes('Authorization Exception: active pipelineRunId is mandatory'));
    });

    it('fails closed in toolbox delete_file when pipelineRunId is missing', async () => {
      const res = await executeTool(
        'delete_file',
        { file_path: 'src/index.ts' },
        convId1
      );
      assert.strictEqual(res.error, true);
      assert.ok(res.message.includes('Authorization Exception: active pipelineRunId is mandatory'));
    });
  });

  describe('2. Cross-Run and Cross-Conversation Writes', () => {
    it('rejects cross-run file mutation when stage execution belongs to another run', async () => {
      await assert.rejects(
        async () => {
          // Attempting to mutate in runId2 using stage execution from runId1
          await writeVirtualFile(convId1, 'src/index.ts', 'const x = 1;', {
            pipelineRunId: runId2,
            stageExecutionId: coderStageId,
          });
        },
        /Cross-run mutation rejected\. StageExecution belongs to pipelineRun/
      );
    });

    it('rejects cross-conversation mutation when stage execution belongs to another conversation', async () => {
      await assert.rejects(
        async () => {
          // Attempting to mutate convId2 using stage execution from convId1
          await writeVirtualFile(convId2, 'src/index.ts', 'const x = 1;', {
            pipelineRunId: runId1,
            stageExecutionId: coderStageId,
          });
        },
        /Cross-conversation mutation rejected\. StageExecution belongs to/
      );
    });

    it('rejects cross-run tool execution via executeTool', async () => {
      const res = await executeTool(
        'write_file',
        { file_path: 'src/index.ts', content: 'const x = 1;' },
        {
          conversationId: convId1,
          pipelineRunId: runId2,
          stageExecutionId: coderStageId,
        }
      );
      assert.strictEqual(res.error, true);
      assert.ok(res.message.includes('Cross-run mutation rejected'));
    });
  });

  describe('3. Wrong Stage Execution Identities', () => {
    it('rejects non-existent stage execution ID', async () => {
      await assert.rejects(
        async () => {
          await writeVirtualFile(convId1, 'src/index.ts', 'const x = 1;', {
            pipelineRunId: runId1,
            stageExecutionId: 'non-existent-stage-id',
          });
        },
        /Authorization Exception: StageExecution "non-existent-stage-id" not found\./
      );
    });

    it('rejects mutation attempts from Tester stage execution', async () => {
      await assert.rejects(
        async () => {
          await writeVirtualFile(convId1, 'src/index.ts', 'const x = 1;', {
            pipelineRunId: runId1,
            stageExecutionId: testerStageId,
          });
        },
        /Authorization Exception: Stage "Tester" is not permitted to mutate workspace files\./
      );
    });

    it('rejects mutation attempts from Planner stage execution', async () => {
      await assert.rejects(
        async () => {
          await writeVirtualFile(convId1, 'src/index.ts', 'const x = 1;', {
            pipelineRunId: runId1,
            stageExecutionId: plannerStageId,
          });
        },
        /Authorization Exception: Stage "Planner" is not permitted to mutate workspace files\./
      );
    });
  });

  describe('4. Stale Stage Execution Authorization', () => {
    it('rejects mutations using an ACCEPTED (completed) stage execution', async () => {
      await assert.rejects(
        async () => {
          await writeVirtualFile(convId1, 'src/index.ts', 'const x = 1;', {
            pipelineRunId: runId1,
            stageExecutionId: staleStageId,
          });
        },
        /Authorization Exception: Stale stage execution authorization\. StageExecution ".*" is in state "ACCEPTED", expected "RUNNING"\./
      );
    });

    it('rejects mutations using a FAILED stage execution', async () => {
      const failedStage = await prisma.stageExecution.create({
        data: {
          id: `${prefix}-stage-failed`,
          conversationId: convId1,
          pipelineRunId: runId1,
          stageName: 'Coder',
          attempt: 3,
          state: 'FAILED',
        },
      });

      await assert.rejects(
        async () => {
          await writeVirtualFile(convId1, 'src/index.ts', 'const x = 1;', {
            pipelineRunId: runId1,
            stageExecutionId: failedStage.id,
          });
        },
        /Authorization Exception: Stale stage execution authorization\./
      );
    });
  });

  describe('5. Path Traversal Protection at Mutation Boundary', () => {
    it('rejects directory traversal in writeVirtualFile', async () => {
      await assert.rejects(
        async () => {
          await writeVirtualFile(convId1, '../../etc/passwd', 'root:x:0:0', {
            pipelineRunId: runId1,
            stageExecutionId: coderStageId,
          });
        },
        /Security Exception: Invalid or unsafe file path traversal detected/
      );
    });

    it('rejects absolute paths in writeVirtualFile', async () => {
      await assert.rejects(
        async () => {
          await writeVirtualFile(convId1, '/root/.bashrc', 'alias rm=echo', {
            pipelineRunId: runId1,
            stageExecutionId: coderStageId,
          });
        },
        /Security Exception: Invalid or unsafe file path traversal detected/
      );
    });

    it('rejects directory traversal in applyDiff', async () => {
      await assert.rejects(
        async () => {
          await applyDiff(convId1, '../src/index.ts', 1, 1, 'const evil = 1;', {
            pipelineRunId: runId1,
            stageExecutionId: debuggerStageId,
          });
        },
        /Security Exception: Invalid or unsafe file path traversal detected/
      );
    });

    it('rejects directory traversal in deleteVirtualFile', async () => {
      await assert.rejects(
        async () => {
          await deleteVirtualFile(convId1, '../../projects/other', {
            pipelineRunId: runId1,
            stageExecutionId: coderStageId,
          });
        },
        /Security Exception: Invalid or unsafe file path traversal detected/
      );
    });
  });

  describe('6. Unauthorized Files (Blueprint Policy Enforcement)', () => {
    it('rejects unapproved project files not in blueprint or architecture', async () => {
      await assert.rejects(
        async () => {
          await writeVirtualFile(convId1, 'src/unauthorized.ts', 'const secret = 42;', {
            pipelineRunId: runId1,
            stageExecutionId: coderStageId,
          });
        },
        /Authorization Exception: File "src\/unauthorized\.ts" is not in approved blueprint authorized file set/
      );
    });

    it('rejects applyDiff on unapproved file', async () => {
      await assert.rejects(
        async () => {
          await applyDiff(convId1, 'src/unauthorized.ts', 1, 1, 'const patch = 1;', {
            pipelineRunId: runId1,
            stageExecutionId: debuggerStageId,
          });
        },
        /Authorization Exception: File "src\/unauthorized\.ts" is not in approved blueprint authorized file set/
      );
    });

    it('rejects deleteVirtualFile on unapproved file', async () => {
      await assert.rejects(
        async () => {
          await deleteVirtualFile(convId1, 'src/unauthorized.ts', {
            pipelineRunId: runId1,
            stageExecutionId: coderStageId,
          });
        },
        /Authorization Exception: File "src\/unauthorized\.ts" is not in approved blueprint authorized file set/
      );
    });
  });

  describe('7. Control-Plane Artifact Immunity & Internal Projection', () => {
    it('rejects direct mutation of plan.md by Coder stage', async () => {
      await assert.rejects(
        async () => {
          await writeVirtualFile(convId1, 'plan.md', '# Hijacked Plan', {
            pipelineRunId: runId1,
            stageExecutionId: coderStageId,
          });
        },
        /Authorization Exception: Cannot modify control-plane artifact "plan\.md"\./
      );
    });

    it('rejects direct mutation of test_report.md by Debugger stage', async () => {
      await assert.rejects(
        async () => {
          await writeVirtualFile(convId1, 'test_report.md', '# Fake Report', {
            pipelineRunId: runId1,
            stageExecutionId: debuggerStageId,
          });
        },
        /Authorization Exception: Cannot modify control-plane artifact "test_report\.md"\./
      );
    });

    it('permits internal pipeline projection when allowControlPlane is true and runId is provided', async () => {
      await writeVirtualFile(convId1, 'plan.md', '# Authoritative Plan', {
        pipelineRunId: runId1,
        allowControlPlane: true,
      });

      const readBack = await readVirtualFile(convId1, 'plan.md');
      assert.strictEqual(readBack, '# Authoritative Plan');
    });

    it('fails closed if internal projection omits pipelineRunId', async () => {
      await assert.rejects(
        async () => {
          await writeVirtualFile(convId1, 'plan.md', '# Authoritative Plan', {
            pipelineRunId: '',
            allowControlPlane: true,
          });
        },
        /Authorization Exception: active pipelineRunId is mandatory for control-plane file mutation\./
      );
    });
  });

  describe('8. Setup-Managed Operations', () => {
    it('rejects modification of setup-managed file (public/favicon.ico) by normal Coder without setup permission', async () => {
      await assert.rejects(
        async () => {
          await writeVirtualFile(convId1, 'public/favicon.ico', 'ico-bytes', {
            pipelineRunId: runId1,
            stageExecutionId: coderStageId,
            isSetupOperation: false,
          });
        },
        /Authorization Exception: File "public\/favicon\.ico" is a setup-managed file and requires explicit setup authorization\./
      );
    });

    it('allows modification of setup-managed file when isSetupOperation is true with Setup stage execution', async () => {
      await writeVirtualFile(convId1, 'public/favicon.ico', 'valid-favicon-content', {
        pipelineRunId: runId1,
        stageExecutionId: setupStageId,
        isSetupOperation: true,
      });

      const content = await readVirtualFile(convId1, 'public/favicon.ico');
      assert.strictEqual(content, 'valid-favicon-content');
    });

    it('allows modification of setup-managed file when isSetupOperation is true with Coder stage execution', async () => {
      await writeVirtualFile(convId1, 'public/favicon.ico', 'updated-favicon-content', {
        pipelineRunId: runId1,
        stageExecutionId: coderStageId,
        isSetupOperation: true,
      });

      const content = await readVirtualFile(convId1, 'public/favicon.ico');
      assert.strictEqual(content, 'updated-favicon-content');
    });
  });

  describe('9. Authorized File Mutation Lifecycle (Write -> Diff -> Delete)', () => {
    it('allows authorized Coder stage to create and overwrite approved project files', async () => {
      const filePath = 'src/components/Header.tsx';
      const initialCode = 'export function Header() { return <header>AutoCoder</header>; }';

      await writeVirtualFile(convId1, filePath, initialCode, {
        pipelineRunId: runId1,
        stageExecutionId: coderStageId,
      });

      const read1 = await readVirtualFile(convId1, filePath);
      assert.strictEqual(read1, initialCode);
    });

    it('allows authorized Debugger stage to apply surgical diff to approved project files', async () => {
      const filePath = 'src/components/Header.tsx';

      await applyDiff(
        convId1,
        filePath,
        1,
        1,
        'export function Header() { return <header>AutoGod Production</header>; }',
        {
          pipelineRunId: runId1,
          stageExecutionId: debuggerStageId,
        }
      );

      const read2 = await readVirtualFile(convId1, filePath);
      assert.strictEqual(read2, 'export function Header() { return <header>AutoGod Production</header>; }');
    });

    it('allows authorized Coder stage to delete approved project files', async () => {
      const filePath = 'src/components/Header.tsx';

      const deleted = await deleteVirtualFile(convId1, filePath, {
        pipelineRunId: runId1,
        stageExecutionId: coderStageId,
      });
      assert.strictEqual(deleted, true);

      const readAfter = await readVirtualFile(convId1, filePath);
      assert.strictEqual(readAfter, null);
    });

    it('writeAuthorizedProjectFile and applyAuthorizedDiff delegate directly to VFS boundary', async () => {
      const filePath = 'src/index.ts';

      await writeAuthorizedProjectFile({
        conversationId: convId1,
        pipelineRunId: runId1,
        stageExecutionId: coderStageId,
        filePath,
        content: 'export const hello = "world";\nexport const version = 1;',
      });

      let content = await readVirtualFile(convId1, filePath);
      assert.ok(content?.includes('version = 1;'));

      await applyAuthorizedDiff({
        conversationId: convId1,
        pipelineRunId: runId1,
        stageExecutionId: debuggerStageId,
        filePath,
        startLine: 2,
        endLine: 2,
        newContent: 'export const version = 2;',
      });

      content = await readVirtualFile(convId1, filePath);
      assert.ok(content?.includes('version = 2;'));

      const deleted = await deleteAuthorizedProjectFile({
        conversationId: convId1,
        pipelineRunId: runId1,
        stageExecutionId: coderStageId,
        filePath,
      });
      assert.strictEqual(deleted, true);

      const finalRead = await readVirtualFile(convId1, filePath);
      assert.strictEqual(finalRead, null);
    });
  });
});
