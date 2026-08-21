import { prisma } from '../../db';
import * as path from 'path';
import * as fs from 'fs';

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
  fileLocks.set(lockKey, currentLock.then(() => newLock));
  await currentLock;
  return () => {
    release();
    if (fileLocks.get(lockKey) === newLock) {
      fileLocks.delete(lockKey);
    }
  };
}

/**
 * Sanitizes a path to prevent directory traversal attacks (../) and absolute path manipulation.
 * Throws an error if the path is unsafe.
 */
export function sanitizePath(filePath: string): string {
  let cleanPath = filePath.replace(/\\/g, '/');

  if (path.isAbsolute(cleanPath) || cleanPath.startsWith('/') || cleanPath.includes('..')) {
    throw new Error(`Security Exception: Invalid or unsafe file path traversal detected: "${filePath}"`);
  }

  cleanPath = path.normalize(cleanPath).replace(/\\/g, '/');

  if (cleanPath === '.' || cleanPath === '' || cleanPath.startsWith('.')) {
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
      const dirName = path.dirname(fullPath);
      if (!fs.existsSync(dirName)) {
        fs.mkdirSync(dirName, { recursive: true });
      }
      fs.writeFileSync(fullPath, content, 'utf8');
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

    // Bounds checking allowing append operations (up to lines.length + 1)
    if (startLine < 1 || startLine > lines.length + 1 || startLine > endLine) {
      throw new Error(
        `applyDiff failed: Line range ${startLine}-${endLine} is out of bounds for file "${safePath}" which has ${lines.length} lines.`
      );
    }

    const start = startLine - 1;
    const end = Math.min(endLine - 1, lines.length - 1);

    if (start === lines.length) {
      // Append content to the end of the file
      lines.push(newContent);
    } else {
      // Replace existing line range
      lines.splice(start, end - start + 1, newContent);
    }

    await prisma.virtualFile.update({
      where: {
        conversationId_filePath: {
          conversationId,
          filePath: safePath,
        },
      },
      data: { content: lines.join('\n') },
    });
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
    const fullPath = path.join(projectDir, record.filePath);
    const dirName = path.dirname(fullPath);

    if (!fs.existsSync(dirName)) {
      fs.mkdirSync(dirName, { recursive: true });
    }

    fs.writeFileSync(fullPath, record.content, 'utf8');
  }

  return records.length;
}

