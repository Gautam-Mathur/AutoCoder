# AutoCoder: The Absolute Refactoring Bible
### A Zero-Assumption, Line-by-Line Guide to Building a ReAct Agentic System

> **Before you begin reading:** This document assumes you can open files, copy-paste code, and run commands in a terminal. No other knowledge is required. Every decision is explained. Every line of code is shown. Every file is named with its exact path.

---

## What Are We Doing and Why?

Right now, AutoCoder works like an **assembly line in a factory**. Raw material (the user's prompt) goes in at one end. Eleven robots (agents) process it one by one in a fixed order. Each robot can only do one thing: take JSON in, produce JSON out. If the JSON is wrong at any step, the entire factory halts.

The problem is that **software development is not an assembly line**. A real developer, while writing a file, might stop and say: *"Wait, what does this function in the other file actually return? Let me look at it."* Then they look, get the answer, and write correct code. The current system cannot do this. Each agent is blind to everything except the pre-packaged JSON blob it was handed.

We are going to turn AutoCoder from a **factory** into a **developer at a computer**. The developer (the agent) will have a set of tools (keyboard, filesystem, compiler). They will use these tools actively while thinking, not just passively receive instructions. This is called a **ReAct Loop** (Reasoning + Acting).

**The 10 phases in plain English:**
1. Build a safe digital filing cabinet (VFS)
2. Build a code-checking tool (Linter)
3. Build the list of all tools agents can use (Toolbox)
4. Teach the AI model how to request a tool (Inference Upgrade)
5. Build the loop that runs tool requests back and forth (ReAct Loop)
6. Rewrite what each agent is told to do (System Prompts)
7. Update the master list of agents to know about tools (Registry)
8. Rebuild the main pipeline that controls agent order (Orchestrator)
9. Delete all the old complexity that is no longer needed (Cleanup)
10. Write all generated files to disk when everything finishes (Flush)

---

## PHASE 1 — Build the Virtual File System (VFS)

### What problem does this solve?

Today, when the Coder agent writes a file, it calls `writeProjectFile()` on line 1049 of `orchestrator.ts`. This immediately writes the file to the real disk on your server at `projects/<conversationId>/filename.ts`. 

This is dangerous for two reasons:
1. If the Coder fails halfway through generating 20 files, you end up with 10 broken, incomplete files on disk that confuse everything.
2. Other agents have no safe way to read these files back. The Coder's `getContext` function in `registry/Coder.ts` (lines 134-272) tries to pull files back from the `StageLedger` database table, which is a completely different system — meaning there are TWO sources of truth for the same code, and they frequently disagree.

The Virtual File System (VFS) fixes this by saying: **during generation, all files live exclusively in the database. They only get written to disk after the entire pipeline succeeds.**

### Exact steps

#### Step 1.1 — Add the database table

Open the file: `prisma/schema.prisma`

Scroll to the very bottom of the file. Add the following block on a new line after the last model definition:

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

**What this does, line by line:**
- `model VirtualFile` — Creates a new database table called `VirtualFile`.
- `id String @id @default(cuid())` — Every row gets a unique ID automatically.
- `conversationId String` — Links this file to a specific user's project.
- `filePath String` — The path of the file, like `src/components/Button.tsx`.
- `content String @db.Text` — The actual source code of the file. `@db.Text` tells the database this can be very long (megabytes if needed).
- `createdAt / updatedAt` — Automatic timestamps for debugging.
- `@@unique([conversationId, filePath])` — Prevents duplicate files. If `src/app.ts` already exists for this project, you cannot accidentally create it twice — you can only update it.
- `@@index([conversationId])` — Makes database lookups by project fast.

#### Step 1.2 — Run the database migration

Open your terminal. Make sure you are in the root of the AutoCoder project. Run this exact command:

```bash
npx prisma migrate dev --name add_virtual_file
```

This command reads your updated `schema.prisma` file and creates the actual table in your real database. You will see output like `✔ Generated Prisma Client`. That means success.

#### Step 1.3 — Create the VFS module

Create a brand new file at this exact path: `src/lib/agents/ruflo/vfs.ts`

Copy and paste the following complete code into it:

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

**Why this code works the way it does:**
- `acquireLock` implements a serial queue using Promise chaining, ensuring concurrent read-modify-write calls to the same file are processed sequentially.
- `sanitizePath` isolates the virtual file system environment and prevents directory traversal attacks or absolute path escaping.
- `readVirtualFile` and `writeVirtualFile` cleanly perform database ops on the sanitized paths.
- `applyDiff` allows `startLine` up to `lines.length + 1` to seamlessly support file appending while keeping standard splice replacements inside boundaries.
- Database operations are wrapped in `finally` blocks to guarantee locks are always released even if database queries fail.

---

## PHASE 2 — Build the Programmatic Linter Tool

### What problem does this solve?

Look at `orchestrator.ts` lines 1098 to 1174. This is the current "Tester" stage. It tries to check if code is valid by reading files from disk and counting brackets manually:

```typescript
// Line 1113-1130: Manual bracket counting
const stack: string[] = [];
let hasMismatch = false;
for (let idx = 0; idx < code.length; idx++) {
  const char = code[idx];
  if (char === '{' || char === '(' || char === '[') {
    stack.push(char);
  ...
```

This is like checking if a math equation is correct by counting the number of equals signs. It catches the most primitive errors and misses almost everything important. A missing semicolon, a wrong variable type, an undefined import — none of these are caught.

We are going to replace this with the **actual TypeScript compiler**, used programmatically (meaning our code calls the TypeScript compiler as a library, without opening a terminal).

### Exact steps

#### Step 2.1 — Verify TypeScript is available

TypeScript is almost certainly already installed because AutoCoder is a Next.js project. To confirm, check that `typescript` appears in your `package.json` under `devDependencies`. If it does, skip to Step 2.2. If it does not, run:

```bash
npm install --save-dev typescript
```

import * as ts from 'typescript';
import { prisma } from '../../db';

export interface LintResult {
  success: boolean;
  errors: Array<{
    line: number;
    character: number;
    message: string;
    severity: 'error' | 'warning';
  }>;
  summary: string;
}

/**
 * Runs the TypeScript compiler on a file from the virtual workspace.
 * Pre-loads all workspace files in the conversation into memory to support synchronous module resolution.
 */
export async function runLinter(
  conversationId: string,
  filePath: string
): Promise<LintResult> {
  // Pre-load all virtual workspace files for this conversation into memory
  const virtualFiles = await prisma.virtualFile.findMany({
    where: { conversationId },
  });

  const fileMap = new Map<string, string>();
  for (const vf of virtualFiles) {
    fileMap.set(vf.filePath.replace(/\\/g, '/'), vf.content);
  }

  const targetPath = filePath.replace(/\\/g, '/');
  const content = fileMap.get(targetPath);

  if (content === undefined) {
    return {
      success: false,
      errors: [{ line: 0, character: 0, message: `File not found in virtual workspace: ${filePath}`, severity: 'error' }],
      summary: `Cannot lint: file "${filePath}" does not exist.`,
    };
  }

  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) {
    return runBracketBalanceCheck(content, filePath);
  }

  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.React,
    strict: false,
    noEmit: true,
    allowJs: true,
    skipLibCheck: true,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
  };

  const host = ts.createCompilerHost(compilerOptions);
  const originalGetSourceFile = host.getSourceFile;

  // Intercept file existence checks synchronously from the memory cache
  host.fileExists = (fileName) => {
    const cleanName = fileName.replace(/\\/g, '/');
    if (fileMap.has(cleanName)) return true;
    return ts.sys.fileExists(fileName);
  };

  // Intercept file reading synchronously from the memory cache
  host.readFile = (fileName) => {
    const cleanName = fileName.replace(/\\/g, '/');
    if (fileMap.has(cleanName)) {
      return fileMap.get(cleanName);
    }
    return ts.sys.readFile(fileName);
  };

  // Intercept source file creation synchronously from the memory cache
  host.getSourceFile = (name, languageVersion) => {
    const cleanName = name.replace(/\\/g, '/');
    if (fileMap.has(cleanName)) {
      return ts.createSourceFile(name, fileMap.get(cleanName)!, languageVersion, true);
    }
    return originalGetSourceFile.call(host, name, languageVersion);
  };

  const program = ts.createProgram([targetPath], compilerOptions, host);
  const allDiagnostics = ts.getPreEmitDiagnostics(program);
  const errors: LintResult['errors'] = [];

  allDiagnostics.forEach((diagnostic) => {
    if (diagnostic.file && diagnostic.start !== undefined) {
      const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');

      errors.push({
        line: line + 1,
        character: character + 1,
        message,
        severity: diagnostic.category === ts.DiagnosticCategory.Error ? 'error' : 'warning',
      });
    }
  });

  const success = errors.filter((e) => e.severity === 'error').length === 0;

  return {
    success,
    errors,
    summary: success
      ? `No errors found in "${filePath}".`
      : `Found ${errors.length} issue(s) in "${filePath}": ${errors.map((e) => `Line ${e.line}: ${e.message}`).join('; ')}`,
  };
}

/**
 * State-aware fallback bracket check for non-TS files.
 * Ignores comments, string literals, and escape sequences to avoid false positives.
 */
export function runBracketBalanceCheck(content: string, filePath: string): LintResult {
  const stack: Array<{ char: string; line: number }> = [];
  let inSingleLineComment = false;
  let inMultiLineComment = false;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inTemplateLiteral = false;
  let escapeNext = false;

  const lines = content.split('\n');

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    inSingleLineComment = false; // Reset single-line comment at newline

    for (let charIdx = 0; charIdx < line.length; charIdx++) {
      const char = line[charIdx];
      const nextChar = line[charIdx + 1] || '';

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      // Handle escape sequences in strings
      if (char === '\\' && (inSingleQuote || inDoubleQuote || inTemplateLiteral)) {
        escapeNext = true;
        continue;
      }

      // Handle comments
      if (!inSingleQuote && !inDoubleQuote && !inTemplateLiteral) {
        if (inMultiLineComment) {
          if (char === '*' && nextChar === '/') {
            inMultiLineComment = false;
            charIdx++;
          }
          continue;
        }

        if (char === '/' && nextChar === '/') {
          inSingleLineComment = true;
          break; // Ignore rest of the line
        }

        if (char === '/' && nextChar === '*') {
          inMultiLineComment = true;
          charIdx++;
          continue;
        }
      }

      if (inMultiLineComment || inSingleLineComment) {
        continue;
      }

      // Handle string literal boundaries
      if (char === "'" && !inDoubleQuote && !inTemplateLiteral) {
        inSingleQuote = !inSingleQuote;
        continue;
      }
      if (char === '"' && !inSingleQuote && !inTemplateLiteral) {
        inDoubleQuote = !inDoubleQuote;
        continue;
      }
      if (char === '`' && !inSingleQuote && !inDoubleQuote) {
        inTemplateLiteral = !inTemplateLiteral;
        continue;
      }

      // Ignore brackets nested within string values
      if (inSingleQuote || inDoubleQuote || inTemplateLiteral) {
        continue;
      }

      // Balance validation
      if (char === '{' || char === '(' || char === '[') {
        stack.push({ char, line: lineIdx + 1 });
      } else if (char === '}' || char === ')' || char === ']') {
        const top = stack[stack.length - 1];
        const isMatch =
          (char === '}' && top?.char === '{') ||
          (char === ')' && top?.char === '(') ||
          (char === ']' && top?.char === '[');

        if (!isMatch) {
          return {
            success: false,
            errors: [{
              line: lineIdx + 1,
              character: charIdx + 1,
              message: `Mismatched closing bracket "${char}". Expected matching pair for "${top?.char || 'none'}"`,
              severity: 'error'
            }],
            summary: `Bracket mismatch found in "${filePath}" near line ${lineIdx + 1}.`,
          };
        }
        stack.pop();
      }
    }
  }

  if (stack.length > 0) {
    const unclosed = stack[stack.length - 1];
    return {
      success: false,
      errors: [{
        line: unclosed.line,
        character: 0,
        message: `Unclosed bracket "${unclosed.char}" detected.`,
        severity: 'error'
      }],
      summary: `Unclosed bracket "${unclosed.char}" found in "${filePath}" starting at line ${unclosed.line}.`,
    };
  }

  return {
    success: true,
    errors: [],
    summary: `No bracket errors found in "${filePath}".`,
  };
}

---

## PHASE 3 — Define the Agent Toolbox (Tool Registry)

### What problem does this solve?

When an LLM supports tool-calling, you pass it a list of available tools in your API request. Each tool has a name, a description (so the LLM knows when to use it), and a list of parameters (so the LLM knows what arguments to provide). 

Right now, AutoCoder passes no tools to the LLM. We need a central place to define all the tools, connect each tool's name to its actual implementation, and filter which tools each agent is allowed to use.

### Exact steps
#### Step 3.1 — Create the Toolbox module

Create a brand new file at this exact path: `src/lib/agents/ruflo/toolbox.ts`

Copy and paste the following complete code into it:

```typescript
import { readVirtualFile, writeVirtualFile, listVirtualFiles, applyDiff } from './vfs';
import { runLinter } from './linter';

/**
 * A ToolParameter describes one argument that a tool accepts.
 * Supports string, number, integer (strictly for line indexing), and boolean.
 */
export interface ToolParameter {
  type: 'string' | 'number' | 'integer' | 'boolean';
  description: string;
  required: boolean;
}

/**
 * A ToolDefinition is the complete specification for a single tool.
 * The LLM receives the name, description, and parameters.
 * The execute function is only called on the server — the LLM never sees it.
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, ToolParameter>;
  execute: (args: Record<string, any>, conversationId: string) => Promise<any>;
}

/**
 * TOOL_REGISTRY is the master list of all tools any agent can ever use.
 * To add a new tool, add a new entry to this array.
 */
export const TOOL_REGISTRY: ToolDefinition[] = [
  {
    name: 'read_file',
    description:
      'Reads the complete content of a file from the project workspace. ' +
      'Use this before modifying a file to understand its current state. ' +
      'Returns null if the file does not exist yet.',
    parameters: {
      file_path: {
        type: 'string',
        description: 'The relative path of the file to read, e.g. "src/components/Button.tsx".',
        required: true,
      },
    },
    execute: async (args, conversationId) => {
      const content = await readVirtualFile(conversationId, args.file_path);
      if (content === null) {
        return { 
          found: false, 
          content: null, 
          message: `File "${args.file_path}" does not exist yet. Suggestion: Use list_files to see exact paths of all existing files.` 
        };
      }
      return { found: true, content, lineCount: content.split('\n').length };
    },
  },

  {
    name: 'write_file',
    description:
      'Creates or completely overwrites a file in the project workspace with the provided content. ' +
      'Use this to create new files or to make large changes to existing files. ' +
      'For small targeted fixes to existing files, prefer apply_diff instead.',
    parameters: {
      file_path: {
        type: 'string',
        description: 'The relative path where the file should be written, e.g. "src/utils/helpers.ts".',
        required: true,
      },
      content: {
        type: 'string',
        description: 'The complete source code content to write to the file.',
        required: true,
      },
    },
    execute: async (args, conversationId) => {
      await writeVirtualFile(conversationId, args.file_path, args.content);
      return { success: true, message: `File "${args.file_path}" written successfully (${args.content.length} bytes).` };
    },
  },

  {
    name: 'apply_diff',
    description:
      'Replaces specific lines in an existing file with new content. ' +
      'Use this for small, targeted fixes — for example, fixing a bug on line 42. ' +
      'Much more efficient than rewriting the entire file. ' +
      'Line numbers are 1-indexed (first line of file = line 1).',
    parameters: {
      file_path: {
        type: 'string',
        description: 'The relative path of the file to modify.',
        required: true,
      },
      start_line: {
        type: 'integer',
        description: 'The first line number to replace (1-indexed, inclusive). Must be an integer.',
        required: true,
      },
      end_line: {
        type: 'integer',
        description: 'The last line number to replace (1-indexed, inclusive). To replace a single line, set this equal to start_line. Must be an integer.',
        required: true,
      },
      new_content: {
        type: 'string',
        description: 'The new content to place at the specified line range. This replaces all lines between start_line and end_line.',
        required: true,
      },
    },
    execute: async (args, conversationId) => {
      await applyDiff(conversationId, args.file_path, args.start_line, args.end_line, args.new_content);
      return { success: true, message: `Lines ${args.start_line}-${args.end_line} of "${args.file_path}" replaced successfully.` };
    },
  },

  {
    name: 'list_files',
    description:
      'Returns a list of all file paths currently in the project workspace. ' +
      'Use this at the start of a task to understand what already exists before creating new files.',
    parameters: {},
    execute: async (args, conversationId) => {
      const files = await listVirtualFiles(conversationId);
      return {
        count: files.length,
        files,
        message: files.length === 0
          ? 'The workspace is empty. No files have been created yet.'
          : `Found ${files.length} file(s) in the workspace.`,
      };
    },
  },

  {
    name: 'check_syntax',
    description:
      'Checks a file in the workspace for syntax errors and type errors using the TypeScript compiler. ' +
      'Always call this after writing or modifying a TypeScript or JavaScript file to verify it is correct. ' +
      'Returns a list of errors with their exact line numbers. ' +
      'If success is true, the file is syntactically valid.',
    parameters: {
      file_path: {
        type: 'string',
        description: 'The relative path of the file to check, e.g. "src/api/users.ts".',
        required: true,
      },
    },
    execute: async (args, conversationId) => {
      const result = await runLinter(conversationId, args.file_path);
      return result;
    },
  },
];

export function getToolsForAgent(toolNames: string[]): ToolDefinition[] {
  return TOOL_REGISTRY.filter((tool) => toolNames.includes(tool.name));
}

/**
 * Executes a tool by name with the given arguments.
 * Includes strong parameter validation, safe type coercion, and a standard try-catch response wrapper.
 */
export async function executeTool(
  toolName: string,
  toolArgs: Record<string, any>,
  conversationId: string
): Promise<any> {
  const tool = TOOL_REGISTRY.find((t) => t.name === toolName);

  if (!tool) {
    return {
      error: true,
      message: `Tool "${toolName}" is not registered. Available tools: ${TOOL_REGISTRY.map((t) => t.name).join(', ')}`,
    };
  }

  const validatedArgs: Record<string, any> = {};

  try {
    for (const [paramName, paramDef] of Object.entries(tool.parameters)) {
      const value = toolArgs[paramName];

      if (value === undefined || value === null) {
        if (paramDef.required) {
          throw new Error(`Missing required parameter "${paramName}".`);
        }
        continue;
      }

      // Strong type validation and safe coercion
      if (paramDef.type === 'string') {
        validatedArgs[paramName] = String(value);
      } else if (paramDef.type === 'integer') {
        const parsed = parseInt(value, 10);
        if (isNaN(parsed)) {
          throw new Error(`Parameter "${paramName}" must be a valid integer, got: "${value}".`);
        }
        validatedArgs[paramName] = parsed;
      } else if (paramDef.type === 'number') {
        const parsed = Number(value);
        if (isNaN(parsed)) {
          throw new Error(`Parameter "${paramName}" must be a valid number, got: "${value}".`);
        }
        validatedArgs[paramName] = parsed;
      } else if (paramDef.type === 'boolean') {
        if (typeof value === 'boolean') {
          validatedArgs[paramName] = value;
        } else if (value === 'true' || value === 1 || value === '1') {
          validatedArgs[paramName] = true;
        } else if (value === 'false' || value === 0 || value === '0') {
          validatedArgs[paramName] = false;
        } else {
          throw new Error(`Parameter "${paramName}" must be a valid boolean, got: "${value}".`);
        }
      }
    }

    return await tool.execute(validatedArgs, conversationId);
  } catch (err: any) {
    return {
      error: true,
      message: `Tool "${toolName}" execution error: ${err.message}`,
    };
  }
}

/**
 * Converts a ToolDefinition into the JSON Schema format that Ollama expects
 * in the "tools" array of an API request body.
 */
export function toolToOllamaFormat(tool: ToolDefinition): object {
  const properties: Record<string, any> = {};
  const required: string[] = [];

  for (const [name, param] of Object.entries(tool.parameters)) {
    properties[name] = {
      type: param.type === 'integer' ? 'integer' : param.type,
      description: param.description,
    };
    if (param.required) {
      required.push(name);
    }
  }

  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties,
        required,
      },
    },
  };
}
```

**Why this code works the way it does:**
- `TOOL_REGISTRY` registers all tools with parameters. Start and end lines are declared as `integer` type to ensure Ollama parses them as integers rather than decimals.
- `executeTool` validates types and casts incoming arguments. If the LLM generates a string for an integer, it coerces it to prevent runtime parsing errors.
- Tool exceptions are caught directly inside `executeTool` and returned as readable objects, avoiding orchestrator crashes.

---

## PHASE 4 — Upgrade the Inference Layer to Support Tool Calls

### What problem does this solve?

Find the import on line 2 of `orchestrator.ts`:
```typescript
import { runInference, getLLMConfig } from '../inference';
```

This `inference.ts` file is the bridge between AutoCoder and the Ollama API. Right now, it always expects the LLM to respond with plain text. Tool-calling capable models (like Llama 3.1, Mistral, Qwen2.5) can respond with a special `tool_calls` JSON structure instead of text. We need the inference layer to recognize this and handle it differently.

### Exact steps

#### Step 4.1 — Locate the inference file

Based on the import path `'../inference'` from `src/lib/agents/ruflo/orchestrator.ts`, the inference file is at: `src/lib/agents/inference.ts`

Open that file.

#### Step 4.2 — Add the new return types

At the very top of `inference.ts`, after the existing imports, add the following type definitions. These describe what `runInference` can now return:

```typescript
/**
 * When the LLM responds with plain text (the normal case).
 */
export interface TextResponse {
  type: 'text';
  content: string;
}

/**
 * When the LLM responds by requesting a tool call.
 * The orchestrator is responsible for executing the tool and feeding the result back.
 */
export interface ToolCallResponse {
  type: 'tool_call';
  toolName: string;
  toolArgs: Record<string, any>;
  callId: string; // Ollama provides an ID for each tool call for tracking
}

export type InferenceResponse = TextResponse | ToolCallResponse;
```

#### Step 4.3 — Update the runInference function signature

Find the existing `runInference` function in `inference.ts`. Its signature currently looks something like:
```typescript
export async function runInference(
  messages: Array<{ role: string; content: string }>,
  options: { temperature?: number; format?: string; maxTokens?: number; ... }
): Promise<string>
```

Update the `options` parameter to accept an optional `tools` array, and update the return type from `Promise<string>` to `Promise<InferenceResponse>`:

```typescript
export async function runInference(
  messages: Array<{ role: string; content: string }>,
  options: {
    temperature?: number;
    format?: string;
    maxTokens?: number;
    timeoutMs?: number;
    signal?: AbortSignal;
    onChunk?: (chunk: string) => void;
    tools?: object[];   // <-- ADD THIS LINE
  }
): Promise<InferenceResponse>  // <-- CHANGE THIS from Promise<string>
```

#### Step 4.4 — Update the Ollama API call inside runInference

Inside the function body, find where you build the request body that gets sent to Ollama. It will look something like:

```typescript
const body = {
  model: config.ollamaModel,
  messages,
  stream: true,
  options: { temperature, num_predict: maxTokens },
};
```

Add the tools field to this object if tools were provided:

```typescript
const body: any = {
  model: config.ollamaModel,
  messages,
  stream: !options.tools, // Disable streaming when tools are in use (Ollama limitation)
  options: { temperature: options.temperature ?? 0.2, num_predict: options.maxTokens },
};

// If tools are provided, attach them to the request
if (options.tools && options.tools.length > 0) {
  body.tools = options.tools;
  body.stream = false; // Tool calls cannot be streamed in Ollama
}
```

#### Step 4.5 — Handle the tool_call response from Ollama

After you receive the response from the Ollama API, add logic to detect if the model returned a tool call instead of text. Add this check BEFORE you return the text content:

```typescript
// Check if the model returned a tool call instead of text
const responseBody = await response.json(); // Parse the full response

if (
  responseBody.message?.tool_calls &&
  responseBody.message.tool_calls.length > 0
) {
  const toolCall = responseBody.message.tool_calls[0];
  return {
    type: 'tool_call',
    toolName: toolCall.function.name,
    toolArgs: toolCall.function.arguments,
    callId: toolCall.id || 'unknown',
  };
}

// Otherwise, return the text content as before
const textContent = responseBody.message?.content || '';
return {
  type: 'text',
  content: textContent,
};
```

**Important:** Because we changed the return type from `string` to `InferenceResponse`, TypeScript will now show compilation errors everywhere `runInference` is used and the result is treated as a plain string. You will fix all of these in Phase 5, where `runAgentLoop` replaces all direct calls.

---

## PHASE 5 — Build the ReAct Agent Loop

### What problem does this solve?

The current `runAgent` function (lines 224-652 in `orchestrator.ts`) is a one-shot function:
1. Build system prompt + user content
2. Call LLM once
3. Try to parse the output as JSON
4. Throw error if it fails

There is no concept of: "The LLM wants more information before answering." With tool-calling, the LLM might respond 5 times before giving a final answer — each time asking for something (read a file, check syntax) and receiving that information back.

`runAgentLoop` enables this back-and-forth conversation between the orchestrator and the LLM.

### Exact steps

#### Step 5.1 — Open orchestrator.ts

Open `src/lib/agents/ruflo/orchestrator.ts`.

#### Step 5.2 — Add necessary imports at the top

Find the existing import block at lines 1-12. Add these imports:

```typescript
import { executeTool, getToolsForAgent, toolToOllamaFormat } from './toolbox';
```

#### Step 5.3 — Add the runAgentLoop function

Find the closing brace of the `runAgent` function (around line 652). After it, insert the following complete new function:

```typescript
/**
 * runAgentLoop — The ReAct (Reasoning + Acting) agent execution function.
 *
 * Unlike runAgent (which is one-shot), this function runs a LOOP.
 * The LLM can call tools, receive results, think again, call more tools,
 * and eventually produce a final text response.
 *
 * The loop runs until:
 * - The LLM produces a text response (it is "done")
 * - OR maxIterations is reached (safety limit)
 * - OR an error occurs
 */
export async function runAgentLoop(
  conversationId: string,
  agentName: string,
  systemPrompt: string,
  userGoal: string,
  allowedToolNames: string[],
  onEvent: PipelineEventCallback,
  signal?: AbortSignal,
  maxIterations: number = 15
): Promise<string> {
  const tools = getToolsForAgent(allowedToolNames);
  const toolsInOllamaFormat = tools.map(toolToOllamaFormat);

  // Build the conversation history.
  // This grows with each loop iteration as tools are called and results returned.
  const conversationHistory: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userGoal },
  ];

  onEvent({
    type: 'AGENT_START',
    agent: agentName,
    message: `Agent ${agentName} started with ${tools.length} available tool(s): ${allowedToolNames.join(', ')}`,
  });

  await writeHistoryLog(
    conversationId,
    agentName,
    'Retrying',
    `ReAct loop started. Tools available: ${allowedToolNames.join(', ')}`
  );

  let iteration = 0;
  let finalResponse = '';

  while (iteration < maxIterations) {
    if (signal?.aborted) {
      throw new Error('Pipeline aborted due to client disconnect.');
    }

    iteration++;

    onEvent({
      type: 'AGENT_LOG',
      agent: agentName,
      message: `Thinking... (iteration ${iteration}/${maxIterations})`,
    });

    // Call the LLM with the current conversation history and available tools
    const config = await getLLMConfig();
    const result = await runInference(conversationHistory, {
      temperature: 0.1,
      timeoutMs: 120000,
      signal,
      tools: toolsInOllamaFormat.length > 0 ? toolsInOllamaFormat : undefined,
    });

    if (result.type === 'text') {
      // The LLM has produced its final answer. The loop is done.
      finalResponse = result.content;

      onEvent({
        type: 'AGENT_COMPLETE',
        agent: agentName,
        message: `Agent ${agentName} completed after ${iteration} iteration(s).`,
        data: { response: finalResponse },
      });

      await writeHistoryLog(
        conversationId,
        agentName,
        'Success',
        `Agent completed successfully after ${iteration} iteration(s).`
      );

      break;
    }

    if (result.type === 'tool_call') {
      // The LLM wants to call a tool.
      const { toolName, toolArgs } = result;

      onEvent({
        type: 'AGENT_LOG',
        agent: agentName,
        message: `Tool requested: ${toolName}(${JSON.stringify(toolArgs)})`,
      });

      await writeHistoryLog(
        conversationId,
        agentName,
        'Retrying',
        `Tool call: ${toolName} with args: ${JSON.stringify(toolArgs)}`
      );

      // Append the LLM's tool call request to the history
      conversationHistory.push({
        role: 'assistant',
        content: JSON.stringify({ tool_call: { name: toolName, arguments: toolArgs } }),
      });

      let toolResult: any;
      try {
        // Execute the tool securely on the server
        toolResult = await executeTool(toolName, toolArgs, conversationId);

        onEvent({
          type: 'AGENT_LOG',
          agent: agentName,
          message: `Tool ${toolName} returned: ${JSON.stringify(toolResult).substring(0, 200)}...`,
        });
      } catch (toolErr: any) {
        // If the tool call itself fails (e.g., file not found), tell the LLM about it
        toolResult = { error: true, message: toolErr.message };

        onEvent({
          type: 'AGENT_LOG',
          agent: agentName,
          message: `Tool ${toolName} failed with error: ${toolErr.message}`,
        });
      }

      // Truncate massively large tool results to prevent context window bloat
      let stringifiedResult = JSON.stringify(toolResult);
      if (stringifiedResult.length > 8000) {
        stringifiedResult = stringifiedResult.substring(0, 8000) + '... [TRUNCATED DUE TO LENGTH. Use apply_diff instead of rewriting if editing large files.]';
      }

      // Append the tool's result to the conversation history
      // The LLM will read this result in the NEXT iteration and decide what to do next
      conversationHistory.push({
        role: 'tool',
        content: stringifiedResult,
      });

      // Continue the loop — the LLM gets another turn
      continue;
    }
  }

  if (iteration >= maxIterations && !finalResponse) {
    throw new Error(
      `Agent ${agentName} exceeded the maximum iteration limit of ${maxIterations} without producing a final response.`
    );
  }

  return finalResponse;
}
```

**Why this code works the way it does:**
- `conversationHistory` is the shared memory of the entire session. Every message — system instructions, user goals, tool calls, tool results, and the LLM's thinking — is appended here in order.
- The `while` loop is the ReAct loop. It runs again and again until the LLM says it's done.
- `result.type === 'text'` means the LLM is finished. It has gathered all the information it needed and produced a final answer.
- `result.type === 'tool_call'` means the LLM needs more information. We execute the tool, get the result, add it to `conversationHistory`, and let the LLM try again.
- `maxIterations` is the safety net. Without it, a confused LLM could loop forever and consume unlimited API credits.

---

## PHASE 6 — Rewrite Agent System Prompts

### What problem does this solve?

Every agent in `src/lib/agents/ruflo/registry/` has a `systemPrompt` that tells it what to do. All of these prompts currently say something like: "Produce only valid JSON matching this schema." This is the fundamental instruction that forces the one-shot behavior. We need to replace these with goal-oriented, tool-using prompts.

We also need to delete the `schema` export and `getContext` function from every registry file, because these are only used by the old `runAgent` function and will not be used by `runAgentLoop`.

### Exact changes per file

#### `src/lib/agents/ruflo/registry/Queen.ts`

**DELETE lines 57 to 110** (the entire `schema` export object).
**DELETE lines 108 to 110** (the entire `getContext` function).
**REPLACE lines 7 to 55** (the systemPrompt) with:

```typescript
export const systemPrompt = `You are the Analyze Agent, the first agent in the AutoCoder pipeline.

Your job is to deeply understand the user's software request and produce a clear project specification document.

## Instructions

1. Think carefully about what the user is asking for.
2. Use the write_file tool to create a file called "plan.md" in the workspace.
3. The plan.md file must contain these sections in this order:

### Project Name
A short, descriptive name for the project.

### Problem Statement
What problem does this software solve? One to three sentences.

### Project Goal
What does success look like when this project is complete? One to three sentences.

### MVP Scope - Included
A bullet-point list of features that MUST be included in the first version.

### MVP Scope - Excluded
A bullet-point list of features that are explicitly out of scope for now.

### Technical Constraints
Any technical limitations or requirements (platform, language, compatibility, etc.).

### Risks
Any significant risks or challenges that downstream agents should be aware of.

4. After writing plan.md, confirm that you have written it by calling check_syntax on it to verify the file exists.
5. Respond with a brief plain-text confirmation that the plan has been written.

## Rules
- Do NOT design the architecture. That is for the next agent.
- Do NOT choose technologies. That is for the next agent.
- Do NOT generate code. That is for the Coder agent.
- Keep the plan concise and factual. No speculation.`;
```

#### `src/lib/agents/ruflo/registry/Planner.ts`

**DELETE** the `schema` export object and `getContext` function (all lines after the `systemPrompt` constant).
**REPLACE** the `systemPrompt` with:

```typescript
export const systemPrompt = `You are the Design Agent, responsible for choosing the technology stack and designing the system architecture.

## Instructions

1. Start by reading the project plan using the read_file tool on "plan.md".
2. Based on the plan, design the architecture and write TWO files:

File 1: "architecture.md"
This file must contain:
- Chosen Tech Stack (frontend framework, backend framework, database, authentication method)
- Project Folder Structure (a tree showing every directory and file that will be created)
- Module Descriptions (what each major folder/module is responsible for)
- Key Conventions (naming conventions, file organization rules)

File 2: "api_spec.md"
This file must contain:
- Every API endpoint the backend will expose
- For each endpoint: HTTP method, URL path, request body shape, response shape
- Database entities and their fields (if a database is used)
- Relationships between entities

3. After writing both files, confirm with a brief plain-text summary.

## Rules
- Match the tech stack to the project's actual needs. Do not over-engineer.
- Be specific. Downstream agents depend on exact file paths and API shapes.
- Do not generate any source code. Only write specification documents.`;
```

#### `src/lib/agents/ruflo/registry/Blueprinter.ts`

**DELETE** the `schema` export object and `getContext` function.
**REPLACE** the `systemPrompt` with:

```typescript
export const systemPrompt = `You are the Blueprint Agent. You translate architecture specifications into a precise list of files to generate.

## Instructions

1. Read "plan.md" using the read_file tool.
2. Read "architecture.md" using the read_file tool.
3. Read "api_spec.md" using the read_file tool.
4. Based on these three documents, write a file called "blueprint.md".

The blueprint.md file must contain a section for EVERY single file that needs to be created. For each file, write:

### File: [exact/relative/path/to/file.ts]
- Purpose: What this file does in one sentence
- Dependencies: Other files this file imports from (list their paths)
- Exports: Functions, classes, or variables this file exports
- APIs Implemented: If this is a route handler, which API endpoint does it implement?
- Key Logic: 2-4 bullet points describing the main logic to implement

5. Order the files so that files with no dependencies come first. Files that import from other files come after the files they import.
6. After writing blueprint.md, respond with how many files are in the blueprint.

## Rules
- Every file in the project folder structure from architecture.md must appear in blueprint.md.
- Be precise. The Coder agent reads ONLY this file to write code.`;
```

#### `src/lib/agents/ruflo/registry/Coder.ts`

**DELETE lines 122 to 272** (the entire `schema` export and entire `getContext` function).
**REPLACE lines 7 to 120** (the `systemPrompt`) with:

```typescript
export const systemPrompt = `You are the Coder Agent. You write source code files for software projects.

## Instructions

For EACH file you need to create, follow these exact steps in order:

Step 1: Read the blueprint for this file
  - Use read_file to read "blueprint.md"
  - Find the section for the file you are about to write
  - Understand its purpose, dependencies, and required logic

Step 2: Read any dependencies
  - Use list_files to see what already exists in the workspace
  - Use read_file to read each file that this file imports from
  - This ensures your imports and function calls match reality exactly

Step 3: Write the file
  - Use write_file to create the complete source code for this file
  - Implement every export listed in the blueprint section
  - Implement every piece of key logic listed in the blueprint section
  - Use the EXACT function names, type signatures, and variable names from the files you read in Step 2
  - Write complete, working code. No placeholder comments, no TODOs, no incomplete implementations.

Step 4: Check the file
  - Use check_syntax on the file you just wrote
  - If errors are found, read the error messages carefully
  - Use apply_diff to fix ONLY the specific lines that caused the errors
  - Check syntax again to confirm the fix worked

Step 5: Move to the next file

## Rules
- Always read dependencies BEFORE writing a file that imports them
- Never guess at function signatures — always read the source file first
- Never write partial implementations — every function must be complete
- If a dependency file does not exist yet, write it first before writing the file that imports it`;
```

#### `src/lib/agents/ruflo/registry/Debugger.ts`

**DELETE lines 117 to 232** (the entire `schema` export and `getContext` function).
**REPLACE lines 7 to 115** (the `systemPrompt`) with:

```typescript
export const systemPrompt = `You are the Debugger Agent. You fix syntax errors and logic bugs in generated code.

## Instructions

You will receive a description of the error and the name of the affected file.

Step 1: Read the failing file
  - Use read_file to get the complete current content of the file
  - Note the line numbers mentioned in the error report

Step 2: Understand the error
  - Read the error message carefully
  - Identify the exact root cause — not just the symptom
  - Find the minimum change needed to fix it

Step 3: Apply the fix
  - Use apply_diff to replace ONLY the lines that need to change
  - Do not rewrite the entire file unless absolutely necessary

Step 4: Verify the fix
  - Use check_syntax to confirm the fix resolved the error
  - If new errors appeared, fix them too using the same process

Step 5: Confirm completion
  - Respond with a plain-text summary of what was fixed and which lines were changed

## Rules
- Smallest possible fix always
- Never change unrelated code
- Never change the function signatures or exports of a file (this breaks other files that depend on it)
- If a bug cannot be fixed without changing an export, state clearly what export changed and why`;
```

#### `src/lib/agents/ruflo/registry/Tester.ts`

**DELETE** the `schema` export and `getContext` function.
**REPLACE** the `systemPrompt` with:

```typescript
export const systemPrompt = `You are the Tester Agent. You verify that all generated code is syntactically correct.

## Instructions

Step 1: List all files
  - Use list_files to get the complete list of all files in the workspace

Step 2: Check every source code file
  - For each .ts, .tsx, .js, .jsx file in the list, call check_syntax
  - Record any files that have errors, including the exact error messages and line numbers

Step 3: Report findings
  - Respond with a plain-text report listing:
    - Total files checked
    - Files that passed (no errors)
    - Files that failed (with their error messages)
    - Overall status: PASS if zero errors, FAIL if any errors exist

## Rules
- Check every source code file. Do not skip any.
- If any file fails, the overall status must be FAIL.
- Report the exact error messages as returned by check_syntax — do not paraphrase them.`;
```

#### `src/lib/agents/ruflo/registry/Security.ts` and `registry/Reviewer.ts`

**DELETE** the `schema` export and `getContext` function from both files.
**REPLACE** each `systemPrompt` with a goal-and-tool-based prompt following the same pattern as above. Security focuses on reviewing code for injection vulnerabilities, insecure patterns, and missing validation. Reviewer focuses on checking that the code matches the original requirements in `plan.md` and `architecture.md`.

---

## PHASE 7 — Simplify the Agent Registry (`agents.ts`)

### What problem does this solve?

Open `src/lib/agents/ruflo/agents.ts`. The `AgentDef` interface on lines 13-20 currently requires `schema` and `getContext`. After Phase 6, neither of these exist in the registry files anymore. We need to update the interface and add a `tools` field that specifies what tools each agent is allowed to use.

### Exact steps

#### Step 7.1 — Replace the entire file content

Open `src/lib/agents/ruflo/agents.ts` and replace its entire contents with:

```typescript
import * as Queen from './registry/Queen';
import * as Planner from './registry/Planner';
import * as Blueprinter from './registry/Blueprinter';
import * as Coder from './registry/Coder';
import * as Debugger from './registry/Debugger';
import * as Tester from './registry/Tester';
import * as Security from './registry/Security';
import * as Reviewer from './registry/Reviewer';

/**
 * AgentDef describes a single agent in the AutoCoder pipeline.
 * Each agent has a system prompt and a list of tool names it is permitted to use.
 */
export interface AgentDef {
  name: string;
  temperature: number;
  systemPrompt: string;
  tools: string[]; // Names of tools from TOOL_REGISTRY that this agent may call
}

/**
 * AGENT_DEFS is the master registry of all agents.
 *
 * Tool permissions follow the principle of least privilege:
 * each agent only has access to the tools it genuinely needs.
 *
 * Planning agents (Queen, Planner, Blueprinter):
 *   - Can read specs and write specification documents
 *   - Cannot run the linter (they don't write code)
 *
 * Execution agents (Coder, Debugger):
 *   - Have full access to all file tools and the linter
 *   - This is where the real work happens
 *
 * Review agents (Tester, Security, Reviewer):
 *   - Can read and list files, run the linter
 *   - Can write reports
 *   - Cannot modify source code files (read-only on code)
 */
export const AGENT_DEFS: Record<string, AgentDef> = {
  Queen: {
    name: Queen.name,
    temperature: Queen.temperature,
    systemPrompt: Queen.systemPrompt,
    tools: ['write_file', 'read_file', 'check_syntax'],
  },
  Planner: {
    name: Planner.name,
    temperature: Planner.temperature,
    systemPrompt: Planner.systemPrompt,
    tools: ['read_file', 'write_file'],
  },
  Blueprinter: {
    name: Blueprinter.name,
    temperature: Blueprinter.temperature,
    systemPrompt: Blueprinter.systemPrompt,
    tools: ['read_file', 'write_file'],
  },
  Coder: {
    name: Coder.name,
    temperature: Coder.temperature,
    systemPrompt: Coder.systemPrompt,
    tools: ['list_files', 'read_file', 'write_file', 'apply_diff', 'check_syntax'],
  },
  Debugger: {
    name: Debugger.name,
    temperature: Debugger.temperature,
    systemPrompt: Debugger.systemPrompt,
    tools: ['read_file', 'apply_diff', 'write_file', 'check_syntax'],
  },
  Tester: {
    name: Tester.name,
    temperature: Tester.temperature,
    systemPrompt: Tester.systemPrompt,
    tools: ['list_files', 'check_syntax', 'write_file'],
  },
  Security: {
    name: Security.name,
    temperature: Security.temperature,
    systemPrompt: Security.systemPrompt,
    tools: ['list_files', 'read_file', 'write_file'],
  },
  Reviewer: {
    name: Reviewer.name,
    temperature: Reviewer.temperature,
    systemPrompt: Reviewer.systemPrompt,
    tools: ['list_files', 'read_file', 'write_file'],
  },
};
```

**Notice what changed:**
- `Architect`, `System`, and `Designer` have been removed. Their responsibilities are now merged into the `Planner` agent (which reads plan.md and produces architecture.md and api_spec.md). This reduces 11 agents to 8, with further consolidation possible.
- The `schema` and `getContext` fields are gone from `AgentDef` entirely.
- The `tools` field is the only new thing. It controls exactly what each agent is allowed to do.

---

## PHASE 8 — Rebuild the Orchestrator Pipeline

### What problem does this solve?

The `runOrchestrator` function starting at line 787 of `orchestrator.ts` contains a massive `for` loop (starting at line 863) that iterates through 10 stage names and calls `runAgent` for each one. This is the old pipeline. We need to replace it with calls to `runAgentLoop`.

### Exact steps

#### Step 8.1 — Replace the pipeline stage array and loop

Find lines 845-856 in `orchestrator.ts`:
```typescript
const pipelineStages = [
  'Queen',
  'Planner',
  'Architect',
  'System',
  'Designer',
  'Blueprinter',
  'Coder',
  'Tester',
  'Security',
  'Reviewer'
];
```

Replace this entire array with the new 5-stage array:
```typescript
const pipelineStages = [
  'Queen',       // Analyze: writes plan.md
  'Planner',     // Design: writes architecture.md and api_spec.md
  'Blueprinter', // Blueprint: writes blueprint.md with all file specs
  'Coder',       // Code: writes all source files, self-corrects
  'Tester',      // Review: checks all files, writes review_report.md
];
```

#### Step 8.2 — Replace the massive for loop body

The `for` loop body from approximately lines 863 to 1600 contains complex special-case handling for each stage. Replace the ENTIRE `for` loop body with this simpler version:

```typescript
for (let i = startIndex; i < pipelineStages.length; i++) {
  if (signal?.aborted) {
    throw new Error('Pipeline compilation aborted due to client disconnect.');
  }

  const stage = pipelineStages[i];
  const agentDef = AGENT_DEFS[stage];

  if (!agentDef) {
    throw new Error(`No agent definition found for stage: ${stage}`);
  }

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { currentStage: stage, status: 'Active' },
  });

  onEvent({
    type: 'AGENT_START',
    agent: stage,
    message: `Starting stage: ${stage}...`,
  });

  try {
    const result = await runAgentLoop(
      conversationId,
      stage,
      agentDef.systemPrompt,
      `Original user request: "${actualPrompt}"\n\nComplete the responsibilities of the ${stage} agent as described in your instructions.`,
      agentDef.tools,
      onEvent,
      signal
    );

    await writeHistoryLog(conversationId, stage, 'Success', `Stage ${stage} completed: ${result.substring(0, 200)}`);

    // Save stage completion to ledger
    await ledger.write(stage, stage.toLowerCase(), { completed: true, summary: result });

  } catch (err: any) {
    if (isInfrastructureError(err)) {
      await handleInfrastructurePause(conversationId, onEvent, err.message);
      return;
    }

    onEvent({
      type: 'PIPELINE_ERROR',
      message: `Stage ${stage} failed: ${err.message}`,
    });

    await writeHistoryLog(conversationId, stage, 'Failed', `Stage ${stage} failed: ${err.message}`);
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { status: 'Paused' },
    });
    return;
  }
}
```

#### Step 8.3 — Remove the validateSchema function

Find `function validateSchema` at line 175 of `orchestrator.ts`. Delete the entire function from line 175 through its closing brace at line 222. It is no longer used anywhere.

---

## PHASE 9 — Delete Legacy Context Infrastructure

### What problem does this solve?

Eight files exist solely to serve the old "Push Context" pipeline. With agents now pulling their own context using tools, these files are entirely dead code. Dead code is dangerous because it confuses future developers and can be accidentally called.

### Exact files to delete

Open your file explorer or terminal and permanently delete these files:

| File to Delete | Why It Is No Longer Needed |
|---|---|
| `src/lib/agents/ruflo/contextResolver.ts` | Agents use `read_file` instead of pre-resolved context |
| `src/lib/agents/ruflo/contentAssistant.ts` | Was used to pre-package context for the old `runAgent` |
| `src/lib/agents/ruflo/correlationResolver.ts` | Looked up which DB row was "authoritative" for a stage — no longer relevant |
| `src/lib/agents/ruflo/correlationService.ts` | Created correlation records for context lookups |
| `src/lib/agents/ruflo/shredder.ts` | Split agent JSON output into separate DB columns — agents now use VFS |
| `src/lib/agents/ruflo/normalizer.ts` | Normalized JSON field names — JSON output is gone |
| `src/lib/agents/ruflo/validator.ts` | Ran custom validation on JSON output — replaced by the linter |
| `src/lib/agents/ruflo/fuzzyParser.ts` | Extracted JSON from garbled LLM text — agents produce plain text now |

To delete from the terminal, run:
```bash
rm src/lib/agents/ruflo/contextResolver.ts
rm src/lib/agents/ruflo/contentAssistant.ts
rm src/lib/agents/ruflo/correlationResolver.ts
rm src/lib/agents/ruflo/correlationService.ts
rm src/lib/agents/ruflo/shredder.ts
rm src/lib/agents/ruflo/normalizer.ts
rm src/lib/agents/ruflo/validator.ts
rm src/lib/agents/ruflo/fuzzyParser.ts
```

After deleting, TypeScript will show "Cannot find module" errors for any file that still imports from these deleted modules. Search for `import.*contextResolver` and similar patterns across the codebase and remove those import lines (they will be in `orchestrator.ts` and possibly other files). Since the functions from these files are no longer called, simply removing the import lines is sufficient.

---

## PHASE 10 — Flush Generated Files from VFS to Disk

### What problem does this solve?

After all pipeline stages complete, all the generated files are sitting in the `VirtualFile` database table. The user's browser needs to receive a downloadable `.zip` of the project, and the existing `launchVSCodePreview()` function needs files on disk to work.

We need one final step: copy everything from the VFS to real disk.

### Exact steps

#### Step 10.1 — Add the flushVFSToDisk function to orchestrator.ts

Find the `writeProjectFile` function at line 655 of `orchestrator.ts`. Directly after its closing brace, add this new function:

```typescript
/**
 * flushVFSToDisk — Copies all virtual files for a conversation from the database to the real filesystem.
 *
 * This is called ONCE at the very end of the pipeline, after all stages succeed.
 * It is the only moment where files are written to the real disk.
 * If any pipeline stage failed, this function is never called, so no broken files appear on disk.
 */
export async function flushVFSToDisk(
  conversationId: string,
  onEvent: PipelineEventCallback
): Promise<void> {
  const { listVirtualFiles, readVirtualFile } = await import('./vfs');

  const filePaths = await listVirtualFiles(conversationId);

  if (filePaths.length === 0) {
    onEvent({
      type: 'AGENT_LOG',
      message: 'Warning: No files found in virtual workspace to flush to disk.',
    });
    return;
  }

  onEvent({
    type: 'AGENT_LOG',
    message: `Flushing ${filePaths.length} file(s) from virtual workspace to disk...`,
  });

  let flushedCount = 0;
  for (const filePath of filePaths) {
    const content = await readVirtualFile(conversationId, filePath);
    if (content !== null) {
      writeProjectFile(conversationId, filePath, content);
      flushedCount++;
    }
  }

  onEvent({
    type: 'AGENT_LOG',
    message: `Successfully wrote ${flushedCount} file(s) to disk for project: ${conversationId}`,
  });
}
```

#### Step 10.2 — Call flushVFSToDisk at the end of the pipeline

In the `runOrchestrator` function, find the section AFTER the `for` loop ends (after all pipeline stages complete). Add a call to `flushVFSToDisk` there, before the `launchVSCodePreview` call:

```typescript
// All pipeline stages completed successfully.
onEvent({
  type: 'AGENT_LOG',
  message: 'All pipeline stages completed. Writing files to disk...',
});

// Flush virtual files to real disk (only happens on full success)
await flushVFSToDisk(conversationId, onEvent);

// Update conversation status to Completed
await prisma.conversation.update({
  where: { id: conversationId },
  data: { status: 'Completed', currentStage: 'Complete' },
});

onEvent({
  type: 'PIPELINE_COMPLETE',
  message: 'Project generation complete! Launching preview...',
});

// Launch VS Code preview (reads from disk, unchanged)
await launchVSCodePreview(conversationId, onEvent);
```

---

## Final Verification Checklist

After completing all 10 phases, verify the following before testing:

- [ ] `prisma/schema.prisma` contains the `VirtualFile` model
- [ ] `npx prisma migrate dev` ran successfully without errors
- [ ] `src/lib/agents/ruflo/vfs.ts` exists and exports 4 functions
- [ ] `src/lib/agents/ruflo/linter.ts` exists and exports `runLinter`
- [ ] `src/lib/agents/ruflo/toolbox.ts` exists and exports `TOOL_REGISTRY`, `executeTool`, `getToolsForAgent`, `toolToOllamaFormat`
- [ ] `src/lib/agents/inference.ts` returns `InferenceResponse` (not `string`)
- [ ] `src/lib/agents/ruflo/orchestrator.ts` contains `runAgentLoop` function
- [ ] `src/lib/agents/ruflo/orchestrator.ts` pipeline array has 5 stages (not 10)
- [ ] `src/lib/agents/ruflo/orchestrator.ts` `validateSchema` function is deleted
- [ ] All 11 registry files in `registry/` have no `schema` export
- [ ] All 11 registry files in `registry/` have no `getContext` export
- [ ] `src/lib/agents/ruflo/agents.ts` `AgentDef` interface has a `tools: string[]` field
- [ ] All 8 legacy files listed in Phase 9 are deleted
- [ ] No TypeScript import errors for the deleted files remain
- [ ] `flushVFSToDisk` is called at the end of `runOrchestrator`

Run `npx tsc --noEmit` from the project root to check for any TypeScript compilation errors before testing.
