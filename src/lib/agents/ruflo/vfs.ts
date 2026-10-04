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
} from './workspace-policy';


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
  content: string
): Promise<void> {
  const safePath = sanitizePath(filePath);
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
  newContent: string
): Promise<void> {
  const safePath = sanitizePath(filePath);
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
    if (p.includes('index') || p.includes('App') || p === 'server/app.js') role = 'entry';
    if (p.endsWith('schema.prisma')) role = 'schema';
    if (p === 'package.json' || p === 'vite.config.ts' || p === 'vite.config.js' || p === 'tsconfig.json') role = 'config';

    return {
      path: p,
      hash: createContentHash(r.content),
      language,
      role,
    };
  });

  const dirsSet = new Set<string>();
  files.forEach((f) => {
    const dir = path.dirname(f.path).replace(/\\/g, '/');
    if (dir && dir !== '.') {
      dirsSet.add(dir);
    }
  });

  const entryPoints = files.filter((f) => f.role === 'entry').map((f) => f.path);
  const projectPaths = files.map((f) => f.path);

  return {
    schemaVersion: '1.0.0',
    projectRoot: '.',
    files,
    directories: Array.from(dirsSet).sort(),
    entryPoints,
    generatedAt: new Date().toISOString(),
    sourceStageExecutionId: stageExecutionId,
    architectureFileSetHash: authorized?.architectureFileSetHash,
    blueprintFileSetHash: authorized?.blueprintFileSetHash,
    authorizedFileSetHash: authorized?.authorizedFileSetHash,
    workspaceFileSetHash: computeFileSetHash(projectPaths),
  };
}

export async function loadAuthorizedFileSet(
  conversationId: string,
  pipelineRunId: string
): Promise<AuthorizedFileSet> {
  const archArtifact = await prisma.artifactVersion.findFirst({
    where: {
      pipelineRunId,
      filePath: 'architecture.md',
      state: 'ACCEPTED',
    },
    orderBy: { version: 'desc' },
  });

  if (!archArtifact) {
    throw new Error(`Authorization Exception: ACCEPTED architecture.md not found for run ${pipelineRunId}.`);
  }

  const blueprintArtifact = await prisma.artifactVersion.findFirst({
    where: {
      pipelineRunId,
      filePath: 'blueprint.md',
      state: 'ACCEPTED',
    },
    orderBy: { version: 'desc' },
  });


  if (!blueprintArtifact) {
    throw new Error(`Authorization Exception: ACCEPTED blueprint.md not found for run ${pipelineRunId}.`);
  }

  const { authorizedFileSet, errors } = computeAuthorizedFileSet(
    archArtifact.content,
    blueprintArtifact.content
  );

  if (!authorizedFileSet || errors.length > 0) {
    throw new Error(`Authorization Exception: Failed to compute authorized file set: ${errors.join('; ')}`);
  }

  return authorizedFileSet;
}

export async function writeAuthorizedProjectFile(params: {
  conversationId: string;
  pipelineRunId: string;
  stageExecutionId: string;
  filePath: string;
  content: string;
}): Promise<void> {
  const { conversationId, pipelineRunId, stageExecutionId, filePath, content } = params;
  const normPath = normalizeWorkspacePath(filePath);

  if (isControlPlaneArtifact(normPath)) {
    throw new Error(
      `Authorization Exception: Stage execution ${stageExecutionId} cannot write control plane file "${normPath}" via writeAuthorizedProjectFile.`
    );
  }

  const stageExec = await prisma.stageExecution.findUnique({
    where: { id: stageExecutionId },
  });

  if (!stageExec) {
    throw new Error(`Authorization Exception: StageExecution ${stageExecutionId} not found.`);
  }
  if (stageExec.pipelineRunId !== pipelineRunId) {
    throw new Error(`Authorization Exception: PipelineRun mismatch (${stageExec.pipelineRunId} vs ${pipelineRunId}).`);
  }
  if (stageExec.stageName !== 'Coder' && stageExec.stageName !== 'Debugger') {
    throw new Error(`Authorization Exception: Stage "${stageExec.stageName}" is not authorized to write project files.`);
  }

  const authorized = await loadAuthorizedFileSet(conversationId, pipelineRunId);
  const authorizedSet = new Set(authorized.authorizedFiles.map((f) => f.toLowerCase()));

  if (!authorizedSet.has(normPath.toLowerCase())) {
    throw new Error(`Authorization Exception: File "${normPath}" is not in approved blueprint authorized file set.`);
  }

  await writeVirtualFile(conversationId, normPath, content);
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
  const normPath = normalizeWorkspacePath(filePath);

  if (isControlPlaneArtifact(normPath)) {
    throw new Error(`Authorization Exception: Cannot patch control plane file "${normPath}".`);
  }

  const stageExec = await prisma.stageExecution.findUnique({
    where: { id: stageExecutionId },
  });

  if (!stageExec || stageExec.pipelineRunId !== pipelineRunId || stageExec.stageName !== 'Debugger') {
    throw new Error(`Authorization Exception: StageExecution ${stageExecutionId} is not an authorized Debugger execution.`);
  }

  const authorized = await loadAuthorizedFileSet(conversationId, pipelineRunId);
  const authorizedSet = new Set(authorized.authorizedFiles.map((f) => f.toLowerCase()));

  if (!authorizedSet.has(normPath.toLowerCase())) {
    throw new Error(`Authorization Exception: File "${normPath}" is not in authorized file set.`);
  }

  await applyDiff(conversationId, normPath, startLine, endLine, newContent);
}



