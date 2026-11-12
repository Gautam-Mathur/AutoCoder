import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { prisma } from '../../../../db';
import { AGENT_DEFS } from '../../agents';
import { executeTool, TOOL_REGISTRY } from '../../toolbox';
import {
  applyDiff,
  assertValidConversationId,
  deleteVirtualFile,
  flushVfsToDisk,
  listVirtualFiles,
  readVirtualFile,
  writeVirtualFile,
} from '../../vfs';
import { createContentHash } from '../fingerprints';

describe('Toolbox Security Boundary & Execution Contract Suite', () => {
  const prefix = `toolbox-sec-${Date.now()}`;
  const convId = `${prefix}-conv`;
  const runId = `${prefix}-run`;
  const coderStageId = `${prefix}-stage-coder`;
  const debuggerStageId = `${prefix}-stage-debugger`;
  const plannerStageId = `${prefix}-stage-planner`;

  const symlinkConvId = `${prefix}-symlink`;
  let outsideDir = '';
  let readOnlyFile = '';

  const initialUtilsContent = [
    'export function add(a: number, b: number): number {',
    '  return a + b;',
    '}',
  ].join('\n');

  const initialAppJsContent = 'export const appName = "demo";\n';

  const archMd = `### Tech Stack
- Frontend: Next.js
- Frontend Entry Point: src/utils.ts
- Backend: None
- Backend Entry Point: None
- Database: None
- ORM: None
- Authentication: None
- Build Tool: Next.js
- Additional: None

### Project Folder Structure
project-root/
├── tsconfig.json
├── package.json
└── src/
    ├── utils.ts
    └── app.js

### Project Files
- tsconfig.json
- package.json
- src/utils.ts
- src/app.js

### Modules
**Core Module**
- Responsibility: Core utilities and app entrypoint
- Owned Files: tsconfig.json, package.json, src/utils.ts, src/app.js
- Depends On: None
- Supports Features: Core

### Conventions
- File Naming: camelCase
`;

  const blueprintMd = `### File: tsconfig.json
- Owner Module: Core Module
- Purpose: TypeScript config
- Dependencies: None
- Specs Required: None
- Exports: None

### File: package.json
- Owner Module: Core Module
- Purpose: Project manifest
- Dependencies: None
- Specs Required: None
- Exports: None

### File: src/utils.ts
- Owner Module: Core Module
- Purpose: Utility functions
- Dependencies: None
- Specs Required: None
- Exports: export function add

### File: src/app.js
- Owner Module: Core Module
- Purpose: Application script
- Dependencies: None
- Specs Required: None
- Exports: export const appName
`;

  before(async () => {
    await prisma.conversation.create({
      data: {
        id: convId,
        title: 'Toolbox Security Boundary Test',
        status: 'Active',
        currentStage: 'Coder',
      },
    });

    await prisma.pipelineRun.create({
      data: {
        id: runId,
        conversationId: convId,
        state: 'RUNNING',
      },
    });

    await prisma.stageExecution.createMany({
      data: [
        {
          id: coderStageId,
          conversationId: convId,
          pipelineRunId: runId,
          stageName: 'Coder',
          attempt: 1,
          state: 'RUNNING',
        },
        {
          id: debuggerStageId,
          conversationId: convId,
          pipelineRunId: runId,
          stageName: 'Debugger',
          attempt: 1,
          state: 'RUNNING',
        },
        {
          id: plannerStageId,
          conversationId: convId,
          pipelineRunId: runId,
          stageName: 'Planner',
          attempt: 1,
          state: 'RUNNING',
        },
      ],
    });

    await prisma.artifactVersion.createMany({
      data: [
        {
          conversationId: convId,
          pipelineRunId: runId,
          stageName: 'Architect',
          filePath: 'architecture.md',
          version: 1,
          contentHash: createContentHash(archMd),
          content: archMd,
          state: 'ACCEPTED',
        },
        {
          conversationId: convId,
          pipelineRunId: runId,
          stageName: 'Blueprinter',
          filePath: 'blueprint.md',
          version: 1,
          contentHash: createContentHash(blueprintMd),
          content: blueprintMd,
          state: 'ACCEPTED',
        },
      ],
    });

    // Seed control-plane files and approved project files in VFS
    await writeVirtualFile(convId, 'plan.md', '# Control Plane Plan', {
      pipelineRunId: runId,
      allowControlPlane: true,
    });
    await writeVirtualFile(convId, 'architecture.md', archMd, {
      pipelineRunId: runId,
      allowControlPlane: true,
    });
    await writeVirtualFile(convId, 'blueprint.md', blueprintMd, {
      pipelineRunId: runId,
      allowControlPlane: true,
    });

    const coderAuth = {
      pipelineRunId: runId,
      stageExecutionId: coderStageId,
      stageName: 'Coder',
    };

    await writeVirtualFile(
      convId,
      'tsconfig.json',
      JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2020',
            module: 'CommonJS',
            strict: true,
            noEmit: true,
            allowJs: true,
          },
          include: ['src/**/*'],
        },
        null,
        2
      ),
      coderAuth
    );
    await writeVirtualFile(
      convId,
      'package.json',
      JSON.stringify({
        name: 'toolbox-sec-fixture',
        version: '1.0.0',
        scripts: {
          build: 'node -e "process.exit(0)"',
        },
      }),
      coderAuth
    );
    await writeVirtualFile(convId, 'src/utils.ts', initialUtilsContent, coderAuth);
    await writeVirtualFile(convId, 'src/app.js', initialAppJsContent, coderAuth);
  });

  after(async () => {
    if (readOnlyFile && fs.existsSync(readOnlyFile)) {
      try {
        fs.chmodSync(readOnlyFile, 0o644);
      } catch {}
    }

    const projDir = path.join(process.cwd(), 'projects', convId);
    if (fs.existsSync(projDir)) {
      fs.rmSync(projDir, { recursive: true, force: true });
    }

    const symlinkPath = path.join(process.cwd(), 'projects', symlinkConvId);
    try {
      if (fs.lstatSync(symlinkPath)) {
        fs.unlinkSync(symlinkPath);
      }
    } catch {}

    if (outsideDir && fs.existsSync(outsideDir)) {
      fs.rmSync(outsideDir, { recursive: true, force: true });
    }

    await prisma.artifactVersion.deleteMany({ where: { conversationId: convId } });
    await prisma.stageExecution.deleteMany({ where: { conversationId: convId } });
    await prisma.pipelineRun.deleteMany({ where: { conversationId: convId } });
    await prisma.virtualFile.deleteMany({ where: { conversationId: convId } });
    await prisma.conversation.deleteMany({ where: { id: convId } });
  });

  describe('1. Input and Diff Safety', () => {
    it('rejects 0, negative, non-integer float, and malformed string start_line values without altering file content', async () => {
      const readRes = await executeTool(
        'read_file',
        { file_path: 'src/utils.ts' },
        { conversationId: convId, pipelineRunId: runId, stageExecutionId: coderStageId, stageName: 'Coder' }
      );
      assert.strictEqual(readRes.found, true);
      const validHash = readRes.contentHash;

      for (const badStart of [0, -1, 1.5, '1.9abc']) {
        const res = await executeTool(
          'apply_diff',
          {
            file_path: 'src/utils.ts',
            start_line: badStart,
            end_line: 1,
            new_content: '// mutated',
            expected_content_hash: validHash,
          },
          { conversationId: convId, pipelineRunId: runId, stageExecutionId: coderStageId, stageName: 'Coder' }
        );
        assert.strictEqual(res.error, true, `start_line=${JSON.stringify(badStart)} must reject`);
      }

      const afterContent = await readVirtualFile(convId, 'src/utils.ts');
      assert.strictEqual(afterContent, initialUtilsContent);
    });

    it('rejects inverted range (start_line: 3, end_line: 1) and preserves file byte-for-byte', async () => {
      const readRes = await executeTool(
        'read_file',
        { file_path: 'src/utils.ts' },
        { conversationId: convId, pipelineRunId: runId, stageExecutionId: coderStageId, stageName: 'Coder' }
      );

      const res = await executeTool(
        'apply_diff',
        {
          file_path: 'src/utils.ts',
          start_line: 3,
          end_line: 1,
          new_content: '// inverted',
          expected_content_hash: readRes.contentHash,
        },
        { conversationId: convId, pipelineRunId: runId, stageExecutionId: coderStageId, stageName: 'Coder' }
      );
      assert.strictEqual(res.error, true);
      assert.match(res.message, /startLine cannot be greater than endLine/);

      const afterContent = await readVirtualFile(convId, 'src/utils.ts');
      assert.strictEqual(afterContent, initialUtilsContent);
    });

    it('rejects objects/arrays supplied to string parameters and rejects unknown arguments', async () => {
      const readRes = await executeTool(
        'read_file',
        { file_path: 'src/utils.ts' },
        { conversationId: convId, pipelineRunId: runId, stageExecutionId: coderStageId, stageName: 'Coder' }
      );

      const objFilePath = await executeTool(
        'read_file',
        { file_path: { toString: () => 'src/utils.ts' } },
        { conversationId: convId, pipelineRunId: runId, stageExecutionId: coderStageId, stageName: 'Coder' }
      );
      assert.strictEqual(objFilePath.error, true);
      assert.match(objFilePath.message, /must be a string/);

      const arrContent = await executeTool(
        'write_file',
        { file_path: 'src/utils.ts', content: ['bad', 'array'] },
        { conversationId: convId, pipelineRunId: runId, stageExecutionId: coderStageId, stageName: 'Coder' }
      );
      assert.strictEqual(arrContent.error, true);
      assert.match(arrContent.message, /must be a string/);

      const objHash = await executeTool(
        'apply_diff',
        {
          file_path: 'src/utils.ts',
          start_line: 1,
          end_line: 1,
          new_content: '// bad',
          expected_content_hash: { hash: readRes.contentHash },
        },
        { conversationId: convId, pipelineRunId: runId, stageExecutionId: coderStageId, stageName: 'Coder' }
      );
      assert.strictEqual(objHash.error, true);
      assert.match(objHash.message, /must be a string/);

      const unknownArg = await executeTool(
        'read_file',
        { file_path: 'src/utils.ts', extraParam: 'unexpected' },
        { conversationId: convId, pipelineRunId: runId, stageExecutionId: coderStageId, stageName: 'Coder' }
      );
      assert.strictEqual(unknownArg.error, true);
      assert.match(unknownArg.message, /Unknown parameter "extraParam"/);

      const afterContent = await readVirtualFile(convId, 'src/utils.ts');
      assert.strictEqual(afterContent, initialUtilsContent);
    });

    it('permits append only at lineCount + 1 and rejects stale expected_content_hash', async () => {
      const firstRead = await executeTool(
        'read_file',
        { file_path: 'src/utils.ts' },
        { conversationId: convId, pipelineRunId: runId, stageExecutionId: coderStageId, stageName: 'Coder' }
      );
      assert.strictEqual(firstRead.lineCount, 3);

      // Out-of-bounds append (lineCount + 2) must reject
      const badAppend = await executeTool(
        'apply_diff',
        {
          file_path: 'src/utils.ts',
          start_line: firstRead.lineCount + 2,
          end_line: firstRead.lineCount + 2,
          new_content: 'export const extra = 1;',
          expected_content_hash: firstRead.contentHash,
        },
        { conversationId: convId, pipelineRunId: runId, stageExecutionId: coderStageId, stageName: 'Coder' }
      );
      assert.strictEqual(badAppend.error, true);

      // Out-of-bounds multi-line end (start_line: lineCount + 1, end_line: lineCount + 2) must reject
      const badAppendRange = await executeTool(
        'apply_diff',
        {
          file_path: 'src/utils.ts',
          start_line: firstRead.lineCount + 1,
          end_line: firstRead.lineCount + 2,
          new_content: 'export const extra = 1;',
          expected_content_hash: firstRead.contentHash,
        },
        { conversationId: convId, pipelineRunId: runId, stageExecutionId: coderStageId, stageName: 'Coder' }
      );
      assert.strictEqual(badAppendRange.error, true);

      // Exact append at lineCount + 1 succeeds
      const goodAppend = await executeTool(
        'apply_diff',
        {
          file_path: 'src/utils.ts',
          start_line: firstRead.lineCount + 1,
          end_line: firstRead.lineCount + 1,
          new_content: 'export const appended = 1;',
          expected_content_hash: firstRead.contentHash,
        },
        { conversationId: convId, pipelineRunId: runId, stageExecutionId: coderStageId, stageName: 'Coder' }
      );
      assert.strictEqual(goodAppend.success, true);

      const newerContent = await readVirtualFile(convId, 'src/utils.ts');
      assert.strictEqual(newerContent, `${initialUtilsContent}\nexport const appended = 1;`);

      // Re-using the stale hash must reject and preserve newerContent
      const stalePatch = await executeTool(
        'apply_diff',
        {
          file_path: 'src/utils.ts',
          start_line: 1,
          end_line: 1,
          new_content: '// stale overwrite',
          expected_content_hash: firstRead.contentHash,
        },
        { conversationId: convId, pipelineRunId: runId, stageExecutionId: coderStageId, stageName: 'Coder' }
      );
      assert.strictEqual(stalePatch.error, true);
      assert.match(stalePatch.message, /applyDiff conflict/);

      assert.strictEqual(await readVirtualFile(convId, 'src/utils.ts'), newerContent);

      // Restore initial content for subsequent tests
      const restoreRead = await executeTool(
        'read_file',
        { file_path: 'src/utils.ts' },
        { conversationId: convId, pipelineRunId: runId, stageExecutionId: coderStageId, stageName: 'Coder' }
      );
      const restoreRes = await executeTool(
        'write_file',
        { file_path: 'src/utils.ts', content: initialUtilsContent },
        { conversationId: convId, pipelineRunId: runId, stageExecutionId: coderStageId, stageName: 'Coder' }
      );
      assert.strictEqual(restoreRes.success, true);
      assert.notStrictEqual(restoreRead.contentHash, createContentHash(initialUtilsContent));
    });
  });

  describe('2. Workspace Isolation', () => {
    it('rejects empty, dot, traversal, and separator conversation IDs across VFS and binary tools', async () => {
      const badIds = ['', '.', '..', '../..', 'foo/bar', 'foo\\bar', 'short'];

      for (const badId of badIds) {
        assert.throws(() => assertValidConversationId(badId), /Security Exception: Invalid conversationId/);
        await assert.rejects(() => readVirtualFile(badId, 'src/utils.ts'), /Invalid conversationId/);
        await assert.rejects(() => listVirtualFiles(badId), /Invalid conversationId/);
        await assert.rejects(() => flushVfsToDisk(badId), /Invalid conversationId/);
        await assert.rejects(
          () => writeVirtualFile(badId, 'src/utils.ts', 'x', { pipelineRunId: runId, stageExecutionId: coderStageId }),
          /Invalid conversationId/
        );
        await assert.rejects(
          () => applyDiff(badId, 'src/utils.ts', 1, 1, 'x', { pipelineRunId: runId, stageExecutionId: coderStageId }),
          /Invalid conversationId/
        );
        await assert.rejects(
          () => deleteVirtualFile(badId, 'src/utils.ts', { pipelineRunId: runId, stageExecutionId: coderStageId }),
          /Invalid conversationId/
        );

        const binRes = await executeTool(
          'typecheck',
          {},
          { conversationId: badId, pipelineRunId: runId, stageExecutionId: coderStageId, stageName: 'Coder' }
        );
        assert.strictEqual(binRes.success, false);
        assert.match(binRes.stderr, /Security Exception: Invalid conversationId/);
      }
    });

    it('rejects symlink project directory pointing outside projects/ and prevents child process spawn', async () => {
      outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'toolbox-outside-'));
      const markerFile = path.join(outsideDir, 'spawned.txt');
      fs.writeFileSync(
        path.join(outsideDir, 'package.json'),
        JSON.stringify({
          name: 'outside-trap',
          version: '1.0.0',
          scripts: {
            build: `node -e "require('fs').writeFileSync('spawned.txt', 'PWNED')"`,
          },
        })
      );

      const projectsRoot = path.join(process.cwd(), 'projects');
      fs.mkdirSync(projectsRoot, { recursive: true });
      const symlinkPath = path.join(projectsRoot, symlinkConvId);
      fs.symlinkSync(outsideDir, symlinkPath, 'dir');

      const res = await executeTool(
        'build_project',
        {},
        {
          conversationId: symlinkConvId,
          pipelineRunId: runId,
          stageExecutionId: debuggerStageId,
          stageName: 'Debugger',
        }
      );

      assert.strictEqual(res.success, false);
      assert.match(res.stderr, /resolves outside workspace root/);
      assert.strictEqual(fs.existsSync(markerFile), false, 'Child process must not execute inside symlink target');
    });
  });

  describe('3. Stage & Path Authorization', () => {
    it('denies Planner from calling read_file or typecheck and fails closed when stageName is missing', async () => {
      const plannerRead = await executeTool(
        'read_file',
        { file_path: 'src/utils.ts' },
        { conversationId: convId, pipelineRunId: runId, stageExecutionId: plannerStageId, stageName: 'Planner' }
      );
      assert.strictEqual(plannerRead.error, true);
      assert.match(plannerRead.message, /not permitted for stage "Planner"/);

      const plannerTypecheck = await executeTool(
        'typecheck',
        {},
        { conversationId: convId, pipelineRunId: runId, stageExecutionId: plannerStageId, stageName: 'Planner' }
      );
      assert.strictEqual(plannerTypecheck.error, true);
      assert.match(plannerTypecheck.message, /not permitted for stage "Planner"/);

      const missingStageRead = await executeTool('read_file', { file_path: 'src/utils.ts' }, convId);
      assert.strictEqual(missingStageRead.error, true);
      assert.match(missingStageRead.message, /stageName is required/);
    });

    it('enforces exact AGENT_DEFS tool allowlists for Coder and Debugger', async () => {
      // Every tool NOT in AGENT_DEFS[stage].tools must fail closed
      for (const stage of ['Coder', 'Debugger'] as const) {
        const stageExecId = stage === 'Coder' ? coderStageId : debuggerStageId;
        const allowed = new Set(AGENT_DEFS[stage].tools);

        for (const toolDef of TOOL_REGISTRY) {
          if (!allowed.has(toolDef.name)) {
            const minimalArgs =
              toolDef.name === 'write_file'
                ? { file_path: 'src/utils.ts', content: 'x' }
                : toolDef.name === 'delete_file'
                  ? { file_path: 'src/utils.ts' }
                  : toolDef.name === 'read_file' || toolDef.name === 'check_syntax'
                    ? { file_path: 'src/utils.ts' }
                    : {};
            const res = await executeTool(toolDef.name, minimalArgs, {
              conversationId: convId,
              pipelineRunId: runId,
              stageExecutionId: stageExecId,
              stageName: stage,
            });
            assert.strictEqual(res.error, true, `${stage} must not be allowed to run ${toolDef.name}`);
            assert.match(res.message, new RegExp(`not permitted for stage "${stage}"`));
          }
        }
      }
    });

    it('enforces allowedMutationPaths narrowing in conjunction with blueprint authorization', async () => {
      // Scope allows src/utils.ts only -> mutating src/app.js must reject
      const wrongScopeRes = await executeTool(
        'write_file',
        { file_path: 'src/app.js', content: 'export const hijacked = true;' },
        {
          conversationId: convId,
          pipelineRunId: runId,
          stageExecutionId: coderStageId,
          stageName: 'Coder',
          allowedMutationPaths: ['src/utils.ts'],
        }
      );
      assert.strictEqual(wrongScopeRes.error, true);
      assert.match(wrongScopeRes.message, /outside this invocation's allowedMutationPaths scope/);
      assert.strictEqual(await readVirtualFile(convId, 'src/app.js'), initialAppJsContent);

      // Even if allowedMutationPaths names a path outside the blueprint, blueprint authorization must still reject it
      const unapprovedRes = await executeTool(
        'write_file',
        { file_path: 'src/unapproved.ts', content: 'export const x = 1;' },
        {
          conversationId: convId,
          pipelineRunId: runId,
          stageExecutionId: coderStageId,
          stageName: 'Coder',
          allowedMutationPaths: ['src/unapproved.ts'],
        }
      );
      assert.strictEqual(unapprovedRes.error, true);
      assert.match(unapprovedRes.message, /not in approved blueprint authorized file set/);
      assert.strictEqual(await readVirtualFile(convId, 'src/unapproved.ts'), null);
    });
  });

  describe('4. Path Visibility & Synchronization', () => {
    it('resolves leading ./ identically across read_file and check_syntax', async () => {
      const dottedRead = await executeTool(
        'read_file',
        { file_path: './src/utils.ts' },
        { conversationId: convId, pipelineRunId: runId, stageExecutionId: coderStageId, stageName: 'Coder' }
      );
      const cleanRead = await executeTool(
        'read_file',
        { file_path: 'src/utils.ts' },
        { conversationId: convId, pipelineRunId: runId, stageExecutionId: coderStageId, stageName: 'Coder' }
      );
      assert.strictEqual(dottedRead.found, true);
      assert.strictEqual(dottedRead.content, cleanRead.content);
      assert.strictEqual(dottedRead.contentHash, cleanRead.contentHash);

      const dottedLint = await executeTool(
        'check_syntax',
        { file_path: './src/utils.ts' },
        { conversationId: convId, pipelineRunId: runId, stageExecutionId: coderStageId, stageName: 'Coder' }
      );
      const cleanLint = await executeTool(
        'check_syntax',
        { file_path: 'src/utils.ts' },
        { conversationId: convId, pipelineRunId: runId, stageExecutionId: coderStageId, stageName: 'Coder' }
      );
      assert.strictEqual(dottedLint.success, true);
      assert.strictEqual(cleanLint.success, true);
    });

    it('excludes control-plane artifacts from list_files while keeping them in listVirtualFiles()', async () => {
      const toolList = await executeTool(
        'list_files',
        {},
        { conversationId: convId, pipelineRunId: runId, stageExecutionId: coderStageId, stageName: 'Coder' }
      );
      assert.ok(Array.isArray(toolList.files));
      assert.strictEqual(toolList.files.includes('plan.md'), false);
      assert.strictEqual(toolList.files.includes('architecture.md'), false);
      assert.strictEqual(toolList.files.includes('blueprint.md'), false);
      assert.strictEqual(toolList.files.includes('src/utils.ts'), true);

      const internalList = await listVirtualFiles(convId);
      assert.strictEqual(internalList.includes('plan.md'), true);
      assert.strictEqual(internalList.includes('architecture.md'), true);
      assert.strictEqual(internalList.includes('blueprint.md'), true);
      assert.strictEqual(internalList.includes('src/utils.ts'), true);
    });

    it('flushes VFS to disk before executing binary commands and aborts command on flush failure', async () => {
      const diskUtilsPath = path.join(process.cwd(), 'projects', convId, 'src', 'utils.ts');
      assert.strictEqual(fs.existsSync(diskUtilsPath), true);

      // Corrupt ONLY the physical disk copy while VFS has valid TypeScript;
      // if typecheck flushes VFS before running tsc, typecheck MUST succeed.
      fs.writeFileSync(diskUtilsPath, 'export const broken: number = "not-a-number";\n', 'utf8');

      const typecheckRes = await executeTool(
        'typecheck',
        {},
        { conversationId: convId, pipelineRunId: runId, stageExecutionId: coderStageId, stageName: 'Coder' }
      );
      assert.strictEqual(typecheckRes.success, true, `Expected flush+typecheck to succeed, got: ${typecheckRes.stderr}`);
      assert.strictEqual(fs.readFileSync(diskUtilsPath, 'utf8'), initialUtilsContent);

      // Now make projects/<convId>/src/utils.ts read-only so flushVfsToDisk fails with EACCES,
      // and confirm build_project does NOT spawn npm run build.
      const diskPkgPath = path.join(process.cwd(), 'projects', convId, 'package.json');
      const markerPath = path.join(process.cwd(), 'projects', convId, 'build-ran.txt');
      fs.writeFileSync(
        diskPkgPath,
        JSON.stringify({
          name: 'flush-failure-trap',
          version: '1.0.0',
          scripts: {
            build: `node -e "require('fs').writeFileSync('build-ran.txt', 'RAN')"`,
          },
        })
      );

      readOnlyFile = diskUtilsPath;
      fs.chmodSync(readOnlyFile, 0o444);

      const buildRes = await executeTool(
        'build_project',
        {},
        {
          conversationId: convId,
          pipelineRunId: runId,
          stageExecutionId: debuggerStageId,
          stageName: 'Debugger',
        }
      );

      fs.chmodSync(readOnlyFile, 0o644);
      readOnlyFile = '';

      assert.strictEqual(buildRes.success, false);
      assert.match(buildRes.stderr, /VFS synchronization failed; command not executed/);
      assert.strictEqual(fs.existsSync(markerPath), false, 'Command must not run when VFS flush fails');
    });
  });
});
