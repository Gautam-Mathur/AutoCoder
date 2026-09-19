# Execution Plan - Phase 2: Programmatic Linter Tool

Phase 2 introduces safe, in-memory code validation via the TypeScript Compiler API. This allows agents to receive exact syntax and type diagnostic error messages (with 1-indexed line numbers) without executing untrusted code or invoking terminal processes on the server.

This updated execution plan utilizes a pre-loaded virtual file cache to enable synchronous cross-file module resolution in the TypeScript compiler host and incorporates a state-aware bracket balancer.

---

## Prerequisites & Dependencies

- Phase 1 Virtual File System (`vfs.ts`) completed and verified.
- `typescript` package available in project dependencies.

---

## Detailed Step-by-Step Instructions

### Step 1: Verify TypeScript Dependency
Ensure `typescript` is installed in `package.json`. If missing, install via:
```bash
npm install --save-dev typescript
```

### Step 2: Implement Programmatic Linter Module
Create file: [`src/lib/agents/ruflo/linter.ts`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/linter.ts)

Paste the following implementation:

```typescript
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
```

---

## Verification Plan

1. **Synchronous Virtual Resolution Test**: Parse a virtual file that imports another virtual file from the pre-loaded cache, confirming no missing reference diagnostics are raised.
2. **Syntax Validation Test**: Lint a file with missing syntax properties or wrong types and assert line errors.
3. **Stateful Balancer Test**: Run `runBracketBalanceCheck` against a file containing brackets safely embedded within string literals, comments, or template strings (e.g. `console.log(" { "); // } `) and verify that it returns `success: true`.
