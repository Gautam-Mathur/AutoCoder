import { prisma } from '../../db';
import * as path from 'path';
import * as fs from 'fs';
import { createContentHash } from './contracts/fingerprints';
import { WorkspaceManifest, WorkspaceFile } from './contracts/schemas/coder';
import {
  isControlPlaneArtifact,
  computeAuthorizedFileSet,
  AuthorizedFileSet,
  computeFileSetHash,
  loadAuthorizedFileSet,
} from './workspace-policy';

export { loadAuthorizedFileSet };

export interface FileMutationAuth {
  pipelineRunId: string;
  stageExecutionId?: string;
  stageName?: string;
  isSetupOperation?: boolean;
  allowControlPlane?: boolean;
  authorizedFileSet?: AuthorizedFileSet;
}

/**
 * Asserts that a file mutation operation (write, diff, delete) is strictly authorized.
 * Enforces:
 * 1. Path safety and directory traversal prevention.
 * 2. Control plane artifact immunity against direct code-generation mutations.
 * 3. Mandatory active pipelineRunId (conversation-wide fallback strictly forbidden).
 * 4. Verification that stageExecution belongs to the same conversation and pipelineRun (cross-run write prevention).
 * 5. Stage execution lifecycle validation (must be in RUNNING state; rejects stale authorization).
 * 6. Permitted stage verification (Coder/Debugger for code files; Setup/System/Coder for setup-managed files).
 * 7. Canonical authorized file set validation against accepted architecture/blueprint contracts.
 */
export async function assertAuthorizedFileMutation(
  conversationId: string,
  filePath: string,
  operation: 'write' | 'diff' | 'delete',
  auth?: FileMutationAuth
): Promise<void> {
  // 1. Path sanitization and directory traversal check
  const safePath = sanitizePath(filePath);
  const normPath = normalizeWorkspacePath(safePath);

  // 2. Control plane artifact guard
  if (isControlPlaneArtifact(normPath)) {
    if (auth?.allowControlPlane === true) {
      if (!auth?.pipelineRunId || typeof auth.pipelineRunId !== 'string' || !auth.pipelineRunId.trim()) {
        throw new Error(
          `Authorization Exception: active pipelineRunId is mandatory for control-plane file mutation. Conversation-wide fallback authorization without a pipelineRunId is strictly forbidden.`
        );
      }
      return;
    }
    throw new Error(
      `Authorization Exception: Cannot modify control-plane artifact "${normPath}". Direct mutation of control-plane artifacts by code-generation stages or tools is strictly forbidden.`
    );
  }

  // 3. Mandatory active pipelineRunId
  if (!auth || !auth.pipelineRunId || typeof auth.pipelineRunId !== 'string' || !auth.pipelineRunId.trim()) {
    throw new Error(
      `Authorization Exception: active pipelineRunId is mandatory for file mutation. Conversation-wide fallback authorization without a pipelineRunId is strictly forbidden.`
    );
  }

  // 4. Mandatory stageExecutionId for project files
  if (!auth.stageExecutionId || typeof auth.stageExecutionId !== 'string' || !auth.stageExecutionId.trim()) {
    throw new Error(
      `Authorization Exception: active stageExecutionId is mandatory for project file mutation.`
    );
  }

  // 5. Verify stage execution identity in database
  const stageExec = await prisma.stageExecution.findUnique({
    where: { id: auth.stageExecutionId },
  });

  if (!stageExec) {
    throw new Error(`Authorization Exception: StageExecution "${auth.stageExecutionId}" not found.`);
  }

  if (stageExec.conversationId !== conversationId) {
    throw new Error(
      `Authorization Exception: Cross-conversation mutation rejected. StageExecution belongs to "${stageExec.conversationId}", not "${conversationId}".`
    );
  }

  if (stageExec.pipelineRunId !== auth.pipelineRunId) {
    throw new Error(
      `Authorization Exception: Cross-run mutation rejected. StageExecution belongs to pipelineRun "${stageExec.pipelineRunId}", not "${auth.pipelineRunId}".`
    );
  }

  if (stageExec.state !== 'RUNNING') {
    throw new Error(
      `Authorization Exception: Stale stage execution authorization. StageExecution "${auth.stageExecutionId}" is in state "${stageExec.state}", expected "RUNNING".`
    );
  }

  // 6. Permitted stage check
  const permittedStages = auth.isSetupOperation
    ? ['Setup', 'System', 'Coder']
    : ['Coder', 'Debugger'];

  if (!permittedStages.includes(stageExec.stageName)) {
    throw new Error(
      `Authorization Exception: Stage "${stageExec.stageName}" is not permitted to mutate workspace files.`
    );
  }

  // 7. Canonical authorized file set validation
  const authorized = auth.authorizedFileSet || (await loadAuthorizedFileSet(conversationId, auth.pipelineRunId));
  const lowerPath = normPath.toLowerCase();

  // Setup-managed file protection
  const setupManagedLower = new Set(
    (authorized.setupManagedFiles || []).map((f) => f.toLowerCase())
  );

  if (setupManagedLower.has(lowerPath)) {
    if (!auth.isSetupOperation && stageExec.stageName !== 'Setup' && stageExec.stageName !== 'System') {
      throw new Error(
        `Authorization Exception: File "${normPath}" is a setup-managed file and requires explicit setup authorization.`
      );
    }
  }

  // Project file authorization check
  const authorizedLower = new Set(authorized.authorizedFiles.map((f) => f.toLowerCase()));
  const coderAuthorizedLower = new Set(
    (authorized.coderAuthorizedFiles || authorized.authorizedFiles).map((f) => f.toLowerCase())
  );

  const effectiveSet = auth.isSetupOperation ? authorizedLower : coderAuthorizedLower;

  if (!effectiveSet.has(lowerPath)) {
    throw new Error(
      `Authorization Exception: File "${normPath}" is not in approved blueprint authorized file set for pipeline run "${auth.pipelineRunId}".`
    );
  }
}



// In-memory locks to serialize write/diff operations per file to prevent race conditions
const fileLocks = new Map<string, Promise<void>>();

/**
 * Acquires an exclusive lock for a specific file path within a conversation.
 * Returns a release function that must be called when the operation is complete.
 */
async function acquireLock(conversationId: string, filePath: string): Promise<() => void> {
  const lockKey = `${conversationId}:${filePath}`;
  let release!: () => void;
  const newLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  const currentLock = fileLocks.get(lockKey) || Promise.resolve();
  const chainedLock = currentLock.then(() => newLock);
  fileLocks.set(lockKey, chainedLock);
  await currentLock;
  return () => {
    release();
    if (fileLocks.get(lockKey) === chainedLock) {
      fileLocks.delete(lockKey);
    }
  };
}

/**
 * Safely writes a file to physical disk.
 * Guards against directory collisions (EISDIR) and ensures parent directory exists.
 */
export function safeWriteFileSync(fullPath: string, content: string): boolean {
  try {
    const cleanFullPath = fullPath.replace(/\\/g, '/').replace(/\/+$/, '');
    
    // Guard 1: Do not attempt to write to an existing directory
    if (fs.existsSync(cleanFullPath) && fs.statSync(cleanFullPath).isDirectory()) {
      console.warn(`[VFS Guard] Skipped write operation to directory path: ${cleanFullPath}`);
      return false;
    }

    const dirName = path.dirname(cleanFullPath);
    if (!fs.existsSync(dirName)) {
      fs.mkdirSync(dirName, { recursive: true });
    }

    fs.writeFileSync(cleanFullPath, content, 'utf8');
    return true;
  } catch (err: any) {
    if (err.code === 'EISDIR') {
      console.warn(`[VFS Guard] EISDIR caught on ${fullPath}: target path is a directory.`);
      return false;
    }
    throw err;
  }
}

/**
 * Sanitizes a path to prevent directory traversal attacks (../) and absolute path manipulation.
 * Throws an error if the path is unsafe.
 */
export function sanitizePath(filePath: string): string {
  let cleanPath = filePath.replace(/\\/g, '/').trim();

  if (path.isAbsolute(cleanPath) || cleanPath.startsWith('/') || cleanPath.includes('..')) {
    throw new Error(`Security Exception: Invalid or unsafe file path traversal detected: "${filePath}"`);
  }

  cleanPath = path.normalize(cleanPath).replace(/\\/g, '/').replace(/\/+$/, '');

  if (cleanPath === '.' || cleanPath === '' || cleanPath === '..') {
    throw new Error(`Security Exception: Invalid file path: "${filePath}"`);
  }

  return cleanPath;
}

/**
 * Reads a file from the virtual workspace.
 */
export async function readVirtualFile(
  conversationId: string,
  filePath: string
): Promise<string | null> {
  const safePath = sanitizePath(filePath);
  const record = await prisma.virtualFile.findUnique({
    where: {
      conversationId_filePath: {
        conversationId,
        filePath: safePath,
      },
    },
  });
  return record ? record.content : null;
}

/**
 * Writes or updates a file in the virtual workspace.
 * Uses an in-memory lock to prevent race conditions from concurrent write requests.
 */
export async function writeVirtualFile(
  conversationId: string,
  filePath: string,
  content: string,
  auth?: FileMutationAuth
): Promise<void> {
  const safePath = sanitizePath(filePath);
  await assertAuthorizedFileMutation(conversationId, safePath, 'write', auth);

  const release = await acquireLock(conversationId, safePath);

  try {
    await prisma.virtualFile.upsert({
      where: {
        conversationId_filePath: {
          conversationId,
          filePath: safePath,
        },
      },
      update: { content },
      create: { conversationId, filePath: safePath, content },
    });

    // Instant Physical Disk Sync
    try {
      const projectDir = path.join(process.cwd(), 'projects', conversationId);
      const fullPath = path.join(projectDir, safePath);
      let normalizedContent = content;
      if (safePath.endsWith('.html')) {
        normalizedContent = normalizedContent.replace(/UTF-[\u4e00-\u9fa5]8/g, 'UTF-8');
      }
      safeWriteFileSync(fullPath, normalizedContent);
    } catch (diskErr) {
      console.error(`Failed instant disk write for ${safePath}:`, diskErr);
    }
  } finally {
    release();
  }
}

/**
 * Returns a list of all file paths in the virtual workspace.
 */
export async function listVirtualFiles(conversationId: string): Promise<string[]> {
  const records = await prisma.virtualFile.findMany({
    where: { conversationId },
    select: { filePath: true },
    orderBy: { filePath: 'asc' },
  });
  return records.map((r) => r.filePath);
}

/**
 * Applies a targeted line-range replacement to a file in the virtual workspace.
 * Uses an in-memory lock to serialize modifications and avoid write conflicts.
 * Supports appending new content to the end of files.
 */
export async function applyDiff(
  conversationId: string,
  filePath: string,
  startLine: number,
  endLine: number,
  newContent: string,
  auth?: FileMutationAuth
): Promise<void> {
  const safePath = sanitizePath(filePath);
  await assertAuthorizedFileMutation(conversationId, safePath, 'diff', auth);
  const release = await acquireLock(conversationId, safePath);

  try {
    const existing = await readVirtualFile(conversationId, safePath);
    if (existing === null) {
      throw new Error(
        `applyDiff failed: File "${safePath}" does not exist in the virtual workspace.`
      );
    }

    const lines = existing.split('\n');
    const startLineNum = Math.max(1, startLine);
    const endLineNum = Math.max(startLineNum, endLine);

    if (startLineNum > lines.length + 1) {
      throw new Error(
        `applyDiff failed: startLine ${startLineNum} exceeds total lines (${lines.length}) in "${safePath}".`
      );
    }

    const start = startLineNum - 1;
    const end = Math.min(endLineNum - 1, lines.length - 1);

    if (start === lines.length) {
      // Append content to the end of the file
      lines.push(newContent);
    } else {
      // Replace existing line range
      lines.splice(start, end - start + 1, newContent);
    }

    const updatedContent = lines.join('\n');
    await prisma.virtualFile.update({
      where: {
        conversationId_filePath: {
          conversationId,
          filePath: safePath,
        },
      },
      data: { content: updatedContent },
    });

    // Instant Physical Disk Sync
    try {
      const projectDir = path.join(process.cwd(), 'projects', conversationId);
      const fullPath = path.join(projectDir, safePath);
      let normalizedContent = updatedContent;
      if (safePath.endsWith('.html')) {
        normalizedContent = normalizedContent.replace(/UTF-[\u4e00-\u9fa5]8/g, 'UTF-8');
      }
      safeWriteFileSync(fullPath, normalizedContent);
    } catch (diskErr) {
      console.error(`Failed instant disk write for diff on ${safePath}:`, diskErr);
    }
  } finally {
    release();
  }
}

/**
 * Flushes all virtual workspace files for a conversation to the physical disk under projects/<conversationId>/
 * Used before launching a preview server or exporting a zip download archive.
 */
export async function flushVfsToDisk(conversationId: string): Promise<number> {
  const records = await prisma.virtualFile.findMany({
    where: { conversationId },
  });

  if (records.length === 0) return 0;

  const projectDir = path.join(process.cwd(), 'projects', conversationId);

  for (const record of records) {
    try {
      const safePath = sanitizePath(record.filePath);
      const fullPath = path.join(projectDir, safePath);
      let normalizedContent = record.content;
      if (safePath.endsWith('.html')) {
        normalizedContent = normalizedContent.replace(/UTF-[\u4e00-\u9fa5]8/g, 'UTF-8');
      }
      safeWriteFileSync(fullPath, normalizedContent);
    } catch {
      // Skip invalid or directory paths cleanly
    }
  }

  return records.length;
}

export function normalizeWorkspacePath(filePath: string): string {
  return filePath
    .replaceAll('\\', '/')
    .replace(/^\.\/+/, '')
    .replace(/\/+/g, '/')
    .trim();
}

export function resolveUniqueWorkspacePath(
  fileMap: Map<string, string>,
  requested: string
): string {
  const normalized = normalizeWorkspacePath(requested);

  if (fileMap.has(normalized)) {
    return normalized;
  }

  const matches = [...fileMap.keys()].filter(
    (p) => normalizeWorkspacePath(p) === normalized
  );

  if (matches.length > 1) {
    throw new Error(`Ambiguous workspace path: ${requested}`);
  }

  if (matches.length === 1) {
    return matches[0];
  }

  throw new Error(`Workspace file not found: ${requested}`);
}

export async function generateWorkspaceManifest(
  conversationId: string,
  stageExecutionId: string,
  authorized?: AuthorizedFileSet
): Promise<WorkspaceManifest> {
  const records = await prisma.virtualFile.findMany({
    where: { conversationId },
    orderBy: { filePath: 'asc' },
  });

  const projectRecords = records.filter(
    (r) => !isControlPlaneArtifact(normalizeWorkspacePath(r.filePath))
  );

  const files: WorkspaceFile[] = projectRecords.map((r) => {
    const p = normalizeWorkspacePath(r.filePath);
    const ext = path.extname(p).toLowerCase();
    let language = 'text';
    if (ext === '.ts' || ext === '.tsx') language = 'typescript';
    else if (ext === '.js' || ext === '.jsx') language = 'javascript';
    else if (ext === '.json') language = 'json';
    else if (ext === '.prisma') language = 'prisma';
    else if (ext === '.css') language = 'css';
    else if (ext === '.html') language = 'html';
    else if (ext === '.md') language = 'markdown';

    let role = 'source';
    if (
      /(?:^|\/)(index|app|main)\.(tsx?|jsx?|mjs|cjs)$/i.test(p) ||
      /(?:^|\/)src\/main\.(tsx?|jsx?)$/i.test(p) ||
      /(?:^|\/)app\/(?:page|layout)\.(tsx?|jsx?)$/i.test(p) ||
      /(?:^|\/)app\/api\/.+\/route\.(tsx?|jsx?)$/i.test(p) ||
      /(?:^|\/)server\/(?:app|server|index)\.(tsx?|jsx?)$/i.test(p)
    ) {
      role = 'entry';
    }
    if (p.endsWith('schema.prisma') || /\.sql$/i.test(p)) role = 'schema';
    if (
      p === 'package.json' ||
      /vite\.config\.(ts|js|mjs)/i.test(p) ||
      /next\.config\.(ts|js|mjs)/i.test(p) ||
      /tsconfig.*\.json/i.test(p) ||
      /tailwind\.config\.(ts|js|mjs|cjs)/i.test(p)
    ) {
      role = 'config';
    }

    return {
      path: p,
      hash: createContentHash(r.content),
      language,
      role,
    };
  });

  const dirsSet = new Set<string>();
  files.forEach((f) => {
    const parts = f.path.split('/');
    let cur = '';
    for (let i = 0; i < parts.length - 1; i++) {
      cur = cur ? `${cur}/${parts[i]}` : parts[i];
      if (cur && cur !== '.') {
        dirsSet.add(cur);
      }
    }
  });

  const entryPoints = files.filter((f) => f.role === 'entry').map((f) => f.path);
  const projectPaths = files.map((f) => f.path);
  const workspaceFileSetHash = computeFileSetHash(projectPaths);

  return {
    schemaVersion: '1.2.0',
    projectRoot: '.',
    files,
    directories: Array.from(dirsSet).sort(),
    entryPoints,
    generatedAt: new Date().toISOString(),
    sourceStageExecutionId: stageExecutionId,
    architectureFileSetHash: authorized?.architectureFileSetHash || workspaceFileSetHash,
    blueprintFileSetHash: authorized?.blueprintFileSetHash || workspaceFileSetHash,
    authorizedFileSetHash: authorized?.authorizedFileSetHash || workspaceFileSetHash,
    workspaceFileSetHash,
  };
}

/**
 * Deletes a file from the virtual workspace.
 * Requires mutation authorization and synchronizes deletion to disk.
 */
export async function deleteVirtualFile(
  conversationId: string,
  filePath: string,
  auth?: FileMutationAuth
): Promise<boolean> {
  const safePath = sanitizePath(filePath);
  await assertAuthorizedFileMutation(conversationId, safePath, 'delete', auth);

  const release = await acquireLock(conversationId, safePath);

  try {
    const existing = await prisma.virtualFile.findUnique({
      where: {
        conversationId_filePath: {
          conversationId,
          filePath: safePath,
        },
      },
    });

    if (!existing) {
      return false;
    }

    await prisma.virtualFile.delete({
      where: {
        conversationId_filePath: {
          conversationId,
          filePath: safePath,
        },
      },
    });

    // Instant Physical Disk Sync
    try {
      const projectDir = path.join(process.cwd(), 'projects', conversationId);
      const fullPath = path.join(projectDir, safePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch (diskErr) {
      console.error(`Failed instant disk delete for ${safePath}:`, diskErr);
    }

    return true;
  } finally {
    release();
  }
}

export async function writeAuthorizedProjectFile(params: {
  conversationId: string;
  pipelineRunId: string;
  stageExecutionId: string;
  filePath: string;
  content: string;
  isSetupOperation?: boolean;
}): Promise<void> {
  const { conversationId, pipelineRunId, stageExecutionId, filePath, content, isSetupOperation } = params;
  await writeVirtualFile(conversationId, filePath, content, {
    pipelineRunId,
    stageExecutionId,
    isSetupOperation,
  });
}

export async function applyAuthorizedDiff(params: {
  conversationId: string;
  pipelineRunId: string;
  stageExecutionId: string;
  filePath: string;
  startLine: number;
  endLine: number;
  newContent: string;
}): Promise<void> {
  const { conversationId, pipelineRunId, stageExecutionId, filePath, startLine, endLine, newContent } = params;
  await applyDiff(conversationId, filePath, startLine, endLine, newContent, {
    pipelineRunId,
    stageExecutionId,
  });
}

export async function deleteAuthorizedProjectFile(params: {
  conversationId: string;
  pipelineRunId: string;
  stageExecutionId: string;
  filePath: string;
}): Promise<boolean> {
  const { conversationId, pipelineRunId, stageExecutionId, filePath } = params;
  return await deleteVirtualFile(conversationId, filePath, {
    pipelineRunId,
    stageExecutionId,
  });
}
