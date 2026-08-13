# Execution Plan - Phase 1: Virtual File System (VFS)

Phase 1 establishes an isolated, database-backed virtual workspace (`VirtualFile` table) for project files generated during agent compilation loops. This replaces direct physical disk mutations during generation and establishes a single authoritative source of truth for workspace files.

This execution plan includes robust safeguards against race conditions, path traversal vulnerabilities, and strict line-appending limitations.

---

## Prerequisites & Requirements

- Existing Prisma database configuration with SQLite provider.
- Prisma CLI installed (`npx prisma`).

---

## Detailed Step-by-Step Instructions

### Step 1: Update Database Schema
Open file: [`prisma/schema.prisma`](file:///c:/Users/Lenovo/Desktop/AutoCoder/prisma/schema.prisma)

Append the `VirtualFile` model at the end of the schema:

```prisma
model VirtualFile {
  id             String   @id @default(cuid())
  conversationId String
  filePath       String
  content        String   @db.Text
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([conversationId, filePath])
  @@index([conversationId])
}
```

### Step 2: Execute Migration
Run terminal command:
```bash
npx prisma migrate dev --name add_virtual_file
```
This updates the database schema and regenerates the Prisma Client types.

### Step 3: Implement VFS Module
Create file: [`src/lib/agents/ruflo/vfs.ts`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/vfs.ts)

Implement the VFS operations, complete with path sanitization, file lock queuing to prevent race conditions, and flexible bounds checking to allow line appending:

```typescript
import { prisma } from '../../db';
import * as path from 'path';

// In-memory locks to serialize write/diff operations per file to prevent race conditions
const fileLocks = new Map<string, Promise<void>>();

/**
 * Acquires an exclusive lock for a specific file path within a conversation.
 * Returns a release function that must be called when the operation is complete.
 */
async function acquireLock(conversationId: string, filePath: string): Promise<() => void> {
  const lockKey = `${conversationId}:${filePath}`;
  let release: () => void;
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
```

---

## Verification Plan

1. Verify `prisma.virtualFile` exists in Prisma Client types.
2. **Race Condition Test**: Trigger 5 concurrent calls to `applyDiff` on the same file and verify they execute sequentially without corrupting content.
3. **Append Test**: Call `applyDiff` with `startLine = lines.length + 1` and verify the text is successfully appended to the end of the file.
4. **Traversal Test**: Call `readVirtualFile` with paths like `../../etc/passwd` or `/absolute/path` and verify they throw a `Security Exception`.
