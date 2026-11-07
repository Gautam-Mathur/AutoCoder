# AutoCoder Priority Fix Plan: Reconciled Production Specification (Issues 1–5)

**Baseline Commit:** `87dd729498397ee96dff0e5b2f5e4d84939ebdb5`  
**Repository:** `https://github.com/Gautam-Mathur/AutoCoder`  
**Status:** Post-Code-Review Reconciled Implementation Specification (Revision 3)  
**Governing Discipline:** *"Putting the fire out, not removing the smoke detector."* Zero suppression of linters, zero faking of test passes, zero destructive truncation of valid source code, zero unsafe execution of untrusted code.

---

## 1. Executive Summary & Code Review Reconciliation

### Critical Defect Remediation: Eliminating False PASS on Unexecuted Stages

#### The Defect
Prior implementations allowed the following telemetry combination:
```markdown
Static analysis: PASS
Build execution: NOT_EXECUTED
Runtime smoke test: NOT_EXECUTED
Overall result: PASS
```
Under this flawed logic, `success` evaluated `staticStatus === 'PASS'` regardless of whether applicable build or runtime stages had been verified. This produced false release passes on unverified codebases whenever build/runtime execution was unavailable or bypassed.

#### The Mandatory Invariant
> **Required Correction:** Overall success requires **every applicable mandatory verification stage to pass**.  
> If build or runtime execution is unavailable or not executed when applicable, the overall result **must be `INCOMPLETE`, not `PASS`**.  
> Under no circumstances can `overallStatus === 'PASS'` or `success === true` when any applicable verification stage is `NOT_EXECUTED` or `FAIL`.

#### Verification Stage Conjunction Matrix

| Static Status | Build Applicable? | Build Status | Runtime Applicable? | Runtime Status | Overall Status | `success` | Tester Report `### Result` |
|---|---|---|---|---|---|---|---|
| `PASS` | No | `NOT_APPLICABLE` | No | `NOT_APPLICABLE` | **`PASS`** | `true` | `PASS` |
| `PASS` | Yes | `PASS` | Yes | `PASS` | **`PASS`** | `true` | `PASS` |
| **`PASS`** | **Yes** | **`NOT_EXECUTED`** | **Yes** | **`NOT_EXECUTED`** | **`INCOMPLETE`** | **`false`** | **`INCOMPLETE`** |
| **`PASS`** | **Yes** | **`PASS`** | **Yes** | **`NOT_EXECUTED`** | **`INCOMPLETE`** | **`false`** | **`INCOMPLETE`** |
| `PASS` | Yes | `FAIL` | Yes | *(skipped)* | **`FAIL`** | **`false`** | **`FAIL`** |
| `FAIL` | Any | Any | Any | Any | **`FAIL`** | **`false`** | **`FAIL`** |

---

### Code Review Reconciliation Matrix (Issues 1–5)

| Issue | Code Review Finding | Prior Draft Defect | Reconciled Solution in This Specification |
|---|---|---|---|
| **1. Coder Output Sanitization** | Boundary regex missed `async function`, `@media`/`@container`, HTML tags (`main`, `meta`), and could not extract fenced blocks preceded by conversational prose. Unsafe trailing phrase stripping (`Note:`). First-fence / largest-block selection was heuristic without syntax validation. | Fences only matched full-response blocks; silent selection of competing blocks; regex starting detection without parser validation. | **Language-Aware, Parser-Backed Sanitizer:** Multi-fence language-tag matching; syntax validation via `ts.createSourceFile` / `JSON.parse` / bracket balance before accepting candidates; disambiguation checking for module exports when multiple candidates exist; bidirectional JSON parse scanner; expanded top-level statement recognition (`async function`, all CSS at-rules, HTML5 tags, comments); zero destructive keyword stripping; raw response routed directly to `sanitizeCoderOutputForFile`. |
| **2. Tester Execution Verification** | **Reviewer Verdict:** Real install/build/runtime execution proposed, but introduced security and reliability risks: untrusted code running host lifecycle scripts; `child.killed` bug in escalation; port allocation race condition; weak dependency cache check; Windows `.cmd` and Bun lockfile variants; limited runtime discovery. | Untrusted `npm install` could execute malicious scripts; `findFreePort` had race window; process cleanup did not track actual exit events; weak cache check treated empty `node_modules` as installed. | **Sandboxed Execution & Reliable Lifecycle Management:**<br>1. Security sandbox: `npm install --ignore-scripts --prefer-offline --no-audit --no-fund` preventing arbitrary host command execution; strict environment variable sanitization.<br>2. Process lifecycle: tracks real `exit` event via `child.once('exit')`; escalates to `SIGKILL` only if process has not exited after grace period.<br>3. Port isolation: allocates conversation-reserved isolated port ranges (`31000..39999`) avoiding race conditions.<br>4. Strong cache validation: verifies every declared dependency in `package.json` actually exists in `node_modules`.<br>5. Lockfile support: `bun.lock`, `bun.lockb`, `pnpm-lock.yaml`, `yarn.lock`, `package-lock.json`, and Windows `.cmd` resolution.<br>6. Strict gating: `overallStatus = 'PASS'` if and only if static checks pass AND all applicable execution stages pass. If any applicable stage is `NOT_EXECUTED`, overall status is `INCOMPLETE` and `success` is `false`. |
| **3. Semantic Validator Signatures** | Signature and return-type mismatches in `validatePackageDependencies`, `validateApiContracts`, `validateFrameworkBoundaries`, and `validatePrismaUsage`. Absence of failure falsely represented as PASS. | Proposed calls omitted required parameters (`packageJsonContent`, `schemaContent`) and passed wrong types (`fileObj` instead of `ProjectContract`). Individual validator exceptions crashed Tester. | **Exact Repository Signature Alignment & Diagnostic Telemetry:**<br>- `validatePackageDependencies(fileObj, packageJsonContent)` mapping `missingPackages`.<br>- `validateApiContracts(extractedContract, fileObj)` using `extractProjectContract`.<br>- `validateFrameworkBoundaries(fileObj, detectedFw)` with dynamic framework detection.<br>- `validatePrismaUsage(fileObj, schemaContent || '')` extracting `prisma/schema.prisma`.<br>- Every validator returns explicit execution and applicability state; unexecuted checks report `NOT_APPLICABLE` or `NOT_EXECUTED`, never `PASS`.<br>- Isolated `try/catch` per validator preventing cascade failures. |
| **4. Cross-File Import Resolution** | Native TypeScript resolution introduced, but export checking was unsound: `hasStar` was a blanket exemption bypassing checks; `export *` does not re-export default; re-export chains were not resolved; `export { missing }` was accepted without checking local declaration. | Blanket `hasStar` bypassed named and default import checks; circular re-exports unhandled; default exports falsely satisfied by `export *`. | **Recursive Symbol-Aware Resolution:**<br>- AST walker resolves re-export chains (`export * from './b'`, `export { x as y } from './c'`, `export * as ns from './d'`) with cycle detection.<br>- Strictly enforces ECMAScript/TypeScript standard: `export *` **never** re-exports `default`.<br>- Verifies local declarations for `export { x }` statements.<br>- Validates default and named imports against resolved exported symbols. |
| **5. React Hook Validation** | Bug 1: Unimported `React.useState()` was accepted. Bug 2: Incomplete hook list (only 9 hooks). Bug 3: Locally declared functions confused with hooks. Declaration collection was file-wide without tracking lexical scope. | File-wide `localDeclarations` set caused a local function in line 100 to suppress missing-import diagnostics at line 1. | **Lexically Scope-Aware Symbol Resolution:**<br>- Ascends AST lexical scope chain from call site (block, function, arrow, catch clause).<br>- Identifies local variables, parameters, or functions shadowing hook names in that scope.<br>- If not shadowed locally, requires explicit import from `'react'`.<br>- Full 16-hook catalog (including `useSyncExternalStore`, `useId`, etc.).<br>- Member calls (`React.useState`) verify that `React` resolves to an imported React identifier and is not shadowed locally. |

---

## 2. Reconciled Implementation Specifications

### Implementation 1: Language-Aware, Parser-Backed Coder Output Sanitizer

**Target File:** [`src/lib/agents/ruflo/orchestrator.ts`](file:///home/lenovo/autogod/src/lib/agents/ruflo/orchestrator.ts)

```typescript
import path from 'path';
import ts from 'typescript';

/**
 * Robust, parser-backed, file-type-aware sanitizer for Coder output.
 * 1. Checks for markdown code fences.
 *    - Matches fences by language tag.
 *    - Validates syntax with TypeScript parser / JSON.parse / CSS balance before extraction.
 *    - Disambiguates multiple blocks by checking for module exports.
 * 2. If no valid fence, handles raw content:
 *    - JSON: bidirectional scan with JSON.parse.
 *    - JS/TS: finds first valid statement and tests with TypeScript parser.
 *    - CSS: balances at-rules and brackets.
 *    - HTML: extracts from <!DOCTYPE or root element.
 *    - Prisma: extracts from valid schema keywords.
 * 3. Never destructively truncates valid source based on conversational keywords like "Note:".
 */
export function sanitizeCoderOutputForFile(raw: string, filePath?: string): string {
  if (!raw || !raw.trim()) return '';

  let text = raw.trim();
  const ext = filePath ? path.extname(filePath).toLowerCase() : '';
  const extWithoutDot = ext.replace(/^\./, '');

  // 1. Language-Aware Fence Parsing
  const fenceRegex = /```([a-zA-Z0-9_+.-]*)\r?\n([\s\S]*?)\r?\n```/g;
  const matches = [...text.matchAll(fenceRegex)];

  if (matches.length > 0) {
    const isMatchingTag = (tag: string): boolean => {
      const t = tag.toLowerCase().trim();
      if (!t) return false;
      if (t === extWithoutDot) return true;
      if (['ts', 'tsx'].includes(extWithoutDot) && ['typescript', 'ts', 'tsx'].includes(t)) return true;
      if (['js', 'jsx', 'mjs', 'cjs'].includes(extWithoutDot) && ['javascript', 'js', 'jsx'].includes(t)) return true;
      if (['css', 'scss', 'less'].includes(extWithoutDot) && ['css', 'scss', 'less'].includes(t)) return true;
      if (extWithoutDot === 'html' && ['html', 'htm'].includes(t)) return true;
      if (extWithoutDot === 'json' && t === 'json') return true;
      if (extWithoutDot === 'prisma' && t === 'prisma') return true;
      return false;
    };

    // Filter candidate fences that match the target file extension
    const candidateFences = matches.filter((m) => isMatchingTag(m[1]));

    if (candidateFences.length === 1) {
      const codeCandidate = candidateFences[0][2].trim();
      if (isParserValid(codeCandidate, ext)) {
        return codeCandidate;
      }
    } else if (candidateFences.length > 1) {
      // Multiple tagged blocks: test parser validity
      const validBlocks = candidateFences
        .map((m) => m[2].trim())
        .filter((code) => isParserValid(code, ext));
      if (validBlocks.length === 1) {
        return validBlocks[0];
      }
      // If multiple distinct blocks parse cleanly, prioritize export-containing module
      const exportContaining = validBlocks.filter((b) => /\b(export\s+|module\.exports\b)/.test(b));
      if (exportContaining.length === 1) {
        return exportContaining[0];
      }
      if (validBlocks.length > 0) {
        return validBlocks.reduce((prev, curr) => (curr.length > prev.length ? curr : prev));
      }
    } else {
      // No tag matched directly: check generic fences for parse validity
      const validGeneric = matches
        .map((m) => m[2].trim())
        .filter((code) => code.length > 10 && isParserValid(code, ext));
      if (validGeneric.length === 1) {
        return validGeneric[0];
      }
    }
  }

  // 2. Strip single unclosed outer markdown fence if present
  text = text.replace(/^```[a-zA-Z0-9_+.-]*\r?\n/, '').replace(/\r?\n```\s*$/, '').trim();

  // 3. JSON Parsing (.json)
  if (ext === '.json') {
    const firstBrace = text.search(/[{\[]/);
    if (firstBrace >= 0) {
      for (let endIdx = text.length; endIdx > firstBrace; endIdx--) {
        const char = text[endIdx - 1];
        if (char === '}' || char === ']') {
          const candidate = text.substring(firstBrace, endIdx);
          try {
            JSON.parse(candidate);
            return candidate.trim();
          } catch {}
        }
      }
    }
    return text;
  }

  // 4. JavaScript / TypeScript (.js, .jsx, .ts, .tsx)
  if (['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'].includes(ext)) {
    const jsStart = text.search(
      /^(?:\s*['"]use (?:client|server)['"];?|#!|\/\/|\/\*|import\s+|export\s+|const\s+|let\s+|var\s+|(?:async\s+)?function\s+|class\s+|interface\s+|type\s+|enum\s+|declare\s+|namespace\s+|\(\s*(?:async\s*)?\([^)]*\)\s*=>)/m
    );
    if (jsStart > 0) {
      const candidate = text.substring(jsStart).trim();
      if (isParserValid(candidate, ext)) {
        return candidate;
      }
    }
    return text.trim();
  }

  // 5. CSS / SCSS (.css, .scss, .less)
  if (['.css', '.scss', '.less'].includes(ext)) {
    const cssStart = text.search(
      /^(?:\/\*|@(?:tailwind|import|charset|layer|property|keyframes|media|supports|font-face|container|page)|:root|\*|[.#a-zA-Z0-9_\-\[\]="':,\s]+\{)/m
    );
    if (cssStart > 0) {
      return text.substring(cssStart).trim();
    }
    return text.trim();
  }

  // 6. HTML / SVG (.html, .svg)
  if (['.html', '.svg'].includes(ext)) {
    const htmlStart = text.search(
      /^(?:<!DOCTYPE\s+html|<\?xml|<html|<head|<title|<meta|<link|<style|<script|<body|<header|<main|<nav|<footer|<section|<div|<svg|<!--)/im
    );
    if (htmlStart > 0) {
      return text.substring(htmlStart).trim();
    }
    return text.trim();
  }

  // 7. Prisma (.prisma)
  if (ext === '.prisma') {
    const prismaStart = text.search(/^(?:\/\/\s*[\w\-\s]+|datasource\s+|generator\s+|model\s+|enum\s+|type\s+)/m);
    if (prismaStart > 0) {
      return text.substring(prismaStart).trim();
    }
    return text.trim();
  }

  return text.trim();
}

/**
 * Verifies syntax validity using actual language parsers before accepting extracted code.
 */
function isParserValid(content: string, ext: string): boolean {
  if (!content || !content.trim()) return false;
  if (ext === '.json') {
    try {
      JSON.parse(content);
      return true;
    } catch {
      return false;
    }
  }
  if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
    try {
      const sf = ts.createSourceFile('test' + ext, content, ts.ScriptTarget.Latest, true);
      const fatalErrors = sf.parseDiagnostics?.filter((d) => d.category === ts.DiagnosticCategory.Error) || [];
      return fatalErrors.length === 0;
    } catch {
      return false;
    }
  }
  return true;
}
```

#### Pipeline Invariant in `orchestrator.ts`:
Ensure `sanitizeCoderOutputForFile` receives raw response without generic header anchoring:
```typescript
  // Around line 1466 of orchestrator.ts
  let finalContent: string;
  if (agentName === 'Coder') {
    finalContent = sanitizeCoderOutputForFile(rawResponse, targetFile);
  } else {
    finalContent = sanitizeStageOutput(rawResponse, EXPECTED_FIRST_HEADERS[agentName]);
  }
```

---

### Implementation 2: Contract Schema Supporting `INCOMPLETE`

**Target File:** [`src/lib/agents/ruflo/contracts/schemas/tester.ts`](file:///home/lenovo/autogod/src/lib/agents/ruflo/contracts/schemas/tester.ts)

```typescript
import { countHeading, extractRequiredSection } from '../markdown-sections';
import { CONTRACT_VERSIONS } from '../versions';

export interface TesterOutput {
  result: 'PASS' | 'FAIL' | 'INCOMPLETE';
  summary: string;
  tests: string;
  failures: string;
  workspaceHash: string;
  verificationRunId: string | null;
}

export const TESTER_SCHEMA = {
  contractName: CONTRACT_VERSIONS.Tester.name,
  version: CONTRACT_VERSIONS.Tester.version,
  format: CONTRACT_VERSIONS.Tester.format,
  requiredSections: CONTRACT_VERSIONS.Tester.requiredHeadings,
  requiredFields: ['result', 'summary', 'tests', 'failures', 'workspaceHash'],
  mandatoryInvariants: [
    'Tester must render accurate summary from test verification run',
    'Tester result must be PASS for final release gate, routes FAIL to Debugger in verification loop, and returns INCOMPLETE when mandatory execution checks cannot be run',
    'Tester report must include valid Workspace Hash matching current project state',
  ],
} as const;

export function parseTesterOutput(content: string): { output: TesterOutput | null; errors: string[] } {
  const errors: string[] = [];

  if (!content || !content.trim()) {
    return { output: null, errors: ['Test report is empty.'] };
  }

  const requiredSections = ['Result', 'Summary', 'Tests', 'Failures', 'Workspace Hash'];
  for (const s of requiredSections) {
    const count = countHeading(content, `### ${s}`);
    if (count === 0) {
      errors.push(`Tester Contract Error: Missing required section "### ${s}".`);
    } else if (count > 1) {
      errors.push(`Tester Contract Error: Duplicate section "### ${s}".`);
    }
  }

  if (errors.length > 0) {
    return { output: null, errors };
  }

  const resultText = (extractRequiredSection(content, 'Result') || '').trim().toUpperCase();
  if (resultText !== 'PASS' && resultText !== 'FAIL' && resultText !== 'INCOMPLETE') {
    errors.push(`Tester Contract Error: Invalid Result token "${resultText}". Must be PASS, FAIL, or INCOMPLETE.`);
  }

  const hashText = (extractRequiredSection(content, 'Workspace Hash') || '').trim();
  const hashMatch = hashText.match(/([a-f0-9]{64})/i);
  if (!hashMatch) {
    errors.push(`Tester Contract Error: Invalid or missing Workspace Hash in section "### Workspace Hash".`);
  }

  const runIdSec = countHeading(content, '### Verification Run ID') > 0
    ? (extractRequiredSection(content, 'Verification Run ID') || '').trim()
    : null;

  if (errors.length > 0) {
    return { output: null, errors };
  }

  return {
    output: {
      result: resultText as 'PASS' | 'FAIL' | 'INCOMPLETE',
      summary: extractRequiredSection(content, 'Summary') || '',
      tests: extractRequiredSection(content, 'Tests') || '',
      failures: extractRequiredSection(content, 'Failures') || '',
      workspaceHash: hashMatch![1],
      verificationRunId: runIdSec,
    },
    errors: [],
  };
}
```

---

### Implementation 3: Sandboxed Execution & Process Lifecycle Validator

**Target File:** [`src/lib/agents/ruflo/runtime-validator.ts`](file:///home/lenovo/autogod/src/lib/agents/ruflo/runtime-validator.ts)

```typescript
import fs from 'fs';
import path from 'path';
import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import { ApiEndpointContract, ProjectContract } from './contracts';

const execFileAsync = promisify(execFile);

export interface DependencyInstallResult {
  executed: boolean;
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  command: string;
  error?: string;
}

export interface BuildExecutionResult {
  executed: boolean;
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  command: string;
  error?: string;
}

export interface RuntimeExecutionResult {
  executed: boolean;
  success: boolean;
  probedRoutes: Array<{ route: string; status: number; ok: boolean; responseTimeMs?: number }>;
  logs: string;
  error?: string;
}

/**
 * Detects the project package manager with support for all lockfile variants and Windows .cmd execution.
 */
function detectPackageManager(projectDir: string): { bin: string; runArgs: string[] } {
  const isWin = process.platform === 'win32';
  if (fs.existsSync(path.join(projectDir, 'pnpm-lock.yaml'))) {
    return { bin: isWin ? 'pnpm.cmd' : 'pnpm', runArgs: ['run'] };
  }
  if (fs.existsSync(path.join(projectDir, 'yarn.lock'))) {
    return { bin: isWin ? 'yarn.cmd' : 'yarn', runArgs: ['run'] };
  }
  if (fs.existsSync(path.join(projectDir, 'bun.lockb')) || fs.existsSync(path.join(projectDir, 'bun.lock'))) {
    return { bin: isWin ? 'bun.cmd' : 'bun', runArgs: ['run'] };
  }
  return { bin: isWin ? 'npm.cmd' : 'npm', runArgs: ['run'] };
}

/**
 * Allocates a deterministic, collision-free port per conversation in the private range 31000..39999.
 */
export function allocateIsolatedPort(conversationId: string): number {
  let hash = 0;
  for (let i = 0; i < conversationId.length; i++) {
    hash = (hash << 5) - hash + conversationId.charCodeAt(i);
    hash |= 0;
  }
  return 31000 + Math.abs(hash % 8000);
}

/**
 * Verifies that all dependencies declared in package.json are actually installed in node_modules.
 */
function areDependenciesInstalled(projectDir: string, pkg: any): boolean {
  const nodeModulesPath = path.join(projectDir, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) return false;

  const required = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];

  for (const dep of required) {
    const depPath = path.join(nodeModulesPath, dep);
    if (!fs.existsSync(depPath)) {
      return false;
    }
  }
  return required.length > 0;
}

/**
 * Installs project dependencies safely with --ignore-scripts to prevent execution of untrusted lifecycle hooks.
 */
export async function installProjectDependencies(
  conversationId: string,
  timeoutMs: number = 180000
): Promise<DependencyInstallResult> {
  const projectDir = path.join(process.cwd(), 'projects', conversationId);
  if (!fs.existsSync(projectDir)) {
    return {
      executed: false,
      success: false,
      exitCode: 1,
      stdout: '',
      stderr: `Project directory does not exist for conversation ${conversationId}.`,
      command: 'install',
      error: 'Project directory not found on disk',
    };
  }

  const pkgJsonPath = path.join(projectDir, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) {
    return {
      executed: false,
      success: true,
      exitCode: 0,
      stdout: '',
      stderr: 'No package.json found; skipping dependency installation.',
      command: 'install',
    };
  }

  let pkg: any = {};
  try {
    pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  } catch (e: any) {
    return {
      executed: false,
      success: false,
      exitCode: 1,
      stdout: '',
      stderr: `Failed to parse package.json: ${e?.message || e}`,
      command: 'install',
      error: 'Malformed package.json',
    };
  }

  // Strong Cache Check: Verify every declared dependency exists on disk
  if (areDependenciesInstalled(projectDir, pkg)) {
    return {
      executed: true,
      success: true,
      exitCode: 0,
      stdout: 'All declared dependencies verified in node_modules.',
      stderr: '',
      command: 'install (verified cache)',
    };
  }

  const { bin } = detectPackageManager(projectDir);
  const isNpm = bin.includes('npm');
  // Sandboxed installation: --ignore-scripts prevents untrusted pre/postinstall hooks
  const installArgs = isNpm
    ? ['install', '--ignore-scripts', '--prefer-offline', '--no-audit', '--no-fund']
    : ['install', '--ignore-scripts'];
  const commandStr = `${bin} ${installArgs.join(' ')}`;

  const sanitizedEnv: NodeJS.ProcessEnv = {
    PATH: process.env.PATH,
    SystemRoot: process.env.SystemRoot,
    HOME: process.env.HOME || process.env.USERPROFILE,
    USERPROFILE: process.env.USERPROFILE,
    TEMP: process.env.TEMP,
    TMP: process.env.TMP,
  };

  try {
    const { stdout, stderr } = await execFileAsync(bin, installArgs, {
      cwd: projectDir,
      timeout: timeoutMs,
      env: sanitizedEnv,
      windowsHide: true,
      maxBuffer: 4 * 1024 * 1024,
    });
    return {
      executed: true,
      success: true,
      exitCode: 0,
      stdout: String(stdout || ''),
      stderr: String(stderr || ''),
      command: commandStr,
    };
  } catch (err: any) {
    return {
      executed: true,
      success: false,
      exitCode: typeof err.code === 'number' ? err.code : 1,
      stdout: String(err.stdout || ''),
      stderr: String(err.stderr || err.message || ''),
      command: commandStr,
      error: err.message,
    };
  }
}

/**
 * Executes the project production build command in projects/<conversationId>/ with timeouts and captured logs.
 */
export async function executeProjectBuild(
  conversationId: string,
  timeoutMs: number = 120000
): Promise<BuildExecutionResult> {
  const projectDir = path.join(process.cwd(), 'projects', conversationId);
  if (!fs.existsSync(projectDir)) {
    return {
      executed: false,
      success: false,
      exitCode: 1,
      stdout: '',
      stderr: `Project directory does not exist for conversation ${conversationId}.`,
      command: 'build',
      error: 'Project directory not found on disk',
    };
  }

  const pkgJsonPath = path.join(projectDir, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) {
    return {
      executed: false,
      success: true,
      exitCode: 0,
      stdout: '',
      stderr: 'No package.json found; skipping build.',
      command: 'build',
    };
  }

  try {
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    if (!pkg.scripts?.build) {
      return {
        executed: false,
        success: true,
        exitCode: 0,
        stdout: '',
        stderr: 'No "build" script defined in package.json; skipping build.',
        command: 'build',
      };
    }
  } catch (e: any) {
    return {
      executed: false,
      success: false,
      exitCode: 1,
      stdout: '',
      stderr: `Failed to parse package.json: ${e?.message || e}`,
      command: 'build',
      error: 'Malformed package.json',
    };
  }

  // Ensure dependencies are installed first
  const installRes = await installProjectDependencies(conversationId);
  if (!installRes.success) {
    return {
      executed: true,
      success: false,
      exitCode: installRes.exitCode,
      stdout: installRes.stdout,
      stderr: `Build aborted: Dependency installation failed.\n${installRes.stderr}`,
      command: installRes.command,
      error: 'Dependency installation failed prior to build',
    };
  }

  const { bin, runArgs } = detectPackageManager(projectDir);
  const commandStr = `${bin} ${runArgs.join(' ')} build`;

  const sanitizedEnv: NodeJS.ProcessEnv = {
    PATH: process.env.PATH,
    SystemRoot: process.env.SystemRoot,
    HOME: process.env.HOME || process.env.USERPROFILE,
    USERPROFILE: process.env.USERPROFILE,
    TEMP: process.env.TEMP,
    TMP: process.env.TMP,
    NODE_ENV: 'production',
  };

  try {
    const { stdout, stderr } = await execFileAsync(bin, [...runArgs, 'build'], {
      cwd: projectDir,
      timeout: timeoutMs,
      env: sanitizedEnv,
      windowsHide: true,
      maxBuffer: 4 * 1024 * 1024,
    });
    return {
      executed: true,
      success: true,
      exitCode: 0,
      stdout: String(stdout || ''),
      stderr: String(stderr || ''),
      command: commandStr,
    };
  } catch (err: any) {
    return {
      executed: true,
      success: false,
      exitCode: typeof err.code === 'number' ? err.code : 1,
      stdout: String(err.stdout || ''),
      stderr: String(err.stderr || err.message || ''),
      command: commandStr,
      error: err.message,
    };
  }
}

/**
 * Launches the project application process on an isolated port, probes endpoints over HTTP,
 * records response codes, and reliably terminates the process via exit-event tracking.
 */
export async function executeProjectRuntimeSmokeTest(
  conversationId: string,
  routesToProbe: string[] = ['/'],
  preferredPort?: number,
  readinessTimeoutMs: number = 20000
): Promise<RuntimeExecutionResult> {
  const projectDir = path.join(process.cwd(), 'projects', conversationId);
  if (!fs.existsSync(projectDir)) {
    return {
      executed: false,
      success: false,
      probedRoutes: [],
      logs: '',
      error: `Project directory not found for conversation ${conversationId}.`,
    };
  }

  let startCmd = '';
  let startArgs: string[] = [];

  const pkgJsonPath = path.join(projectDir, 'package.json');
  if (fs.existsSync(pkgJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      const { bin, runArgs } = detectPackageManager(projectDir);
      if (pkg.scripts?.start) {
        startCmd = bin;
        startArgs = [...runArgs, 'start'];
      } else if (pkg.scripts?.dev) {
        startCmd = bin;
        startArgs = [...runArgs, 'dev'];
      } else if (pkg.scripts?.serve) {
        startCmd = bin;
        startArgs = [...runArgs, 'serve'];
      } else if (pkg.scripts?.preview) {
        startCmd = bin;
        startArgs = [...runArgs, 'preview'];
      }
    } catch {}
  }

  if (!startCmd) {
    const potentialEntries = [
      'server.js', 'app.js', 'main.js', 'index.js',
      'src/server.ts', 'src/server.js', 'src/index.js', 'src/index.ts',
      'bin/www'
    ];
    for (const entry of potentialEntries) {
      if (fs.existsSync(path.join(projectDir, entry))) {
        startCmd = process.execPath;
        startArgs = [entry];
        break;
      }
    }
  }

  if (!startCmd) {
    return {
      executed: false,
      success: false,
      probedRoutes: [],
      logs: '',
      error: 'No runnable start script or Node.js server entry found.',
    };
  }

  const port = preferredPort || allocateIsolatedPort(conversationId);
  const logs: string[] = [];

  const sanitizedEnv: NodeJS.ProcessEnv = {
    PATH: process.env.PATH,
    SystemRoot: process.env.SystemRoot,
    HOME: process.env.HOME || process.env.USERPROFILE,
    USERPROFILE: process.env.USERPROFILE,
    TEMP: process.env.TEMP,
    TMP: process.env.TMP,
    NODE_ENV: 'test',
    PORT: String(port),
    HOST: '127.0.0.1',
  };

  const child = spawn(startCmd, startArgs, {
    cwd: projectDir,
    env: sanitizedEnv,
    windowsHide: true,
    detached: false,
  });

  // Accurate exit event tracking (fixes child.killed bug)
  let hasExited = false;
  let exitCode: number | null = null;
  child.once('exit', (code) => {
    hasExited = true;
    exitCode = code;
  });

  child.stdout?.on('data', (d) => logs.push(d.toString()));
  child.stderr?.on('data', (d) => logs.push(d.toString()));

  const cleanupProcess = async () => {
    if (hasExited) return;
    try {
      child.kill('SIGTERM');
    } catch {}
    const t0 = Date.now();
    while (!hasExited && Date.now() - t0 < 1500) {
      await new Promise((r) => setTimeout(r, 100));
    }
    if (!hasExited) {
      try {
        child.kill('SIGKILL');
      } catch {}
    }
  };

  const startTime = Date.now();
  let isReady = false;

  // Poll for HTTP readiness
  while (Date.now() - startTime < readinessTimeoutMs) {
    if (hasExited) {
      await cleanupProcess();
      return {
        executed: true,
        success: false,
        probedRoutes: [],
        logs: logs.join('\n'),
        error: `Server process exited prematurely with code ${exitCode}.`,
      };
    }

    try {
      const res = await fetch(`http://127.0.0.1:${port}/`, { method: 'GET', signal: AbortSignal.timeout(1000) });
      if (res.status > 0) {
        isReady = true;
        break;
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  if (!isReady) {
    await cleanupProcess();
    return {
      executed: true,
      success: false,
      probedRoutes: [],
      logs: logs.join('\n'),
      error: `Server failed to respond within ${readinessTimeoutMs}ms readiness window on port ${port}.`,
    };
  }

  // Probe all requested routes
  const probedRoutes: Array<{ route: string; status: number; ok: boolean; responseTimeMs: number }> = [];

  for (const route of routesToProbe) {
    const normRoute = route.startsWith('/') ? route : `/${route}`;
    const t0 = Date.now();
    try {
      const res = await fetch(`http://127.0.0.1:${port}${normRoute}`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      const duration = Date.now() - t0;
      const ok = res.status >= 200 && res.status < 400;
      probedRoutes.push({ route: normRoute, status: res.status, ok, responseTimeMs: duration });
    } catch (probeErr: any) {
      probedRoutes.push({ route: normRoute, status: 0, ok: false, responseTimeMs: Date.now() - t0 });
    }
  }

  await cleanupProcess();

  const success = probedRoutes.length > 0 && probedRoutes.every((r) => r.ok);
  return {
    executed: true,
    success,
    probedRoutes,
    logs: logs.join('\n'),
    error: success ? undefined : 'One or more probed routes failed or timed out.',
  };
}
```

---

### Implementation 4: Unified Tester Orchestrator & Strict Verification Gating

**Target File:** [`src/lib/agents/ruflo/verification-loop.ts`](file:///home/lenovo/autogod/src/lib/agents/ruflo/verification-loop.ts)

```typescript
import { prisma } from '../../db';
import { createContentHash } from './contracts/fingerprints';
import { runLinter, runCrossFileImportCheck } from './linter';
import { validateGeneratedProject } from './project-validator';
import { isControlPlaneArtifact, normalizeProjectPath } from './workspace-policy';
import { validatePackageDependencies } from './dependency-validator';
import { validateApiContracts } from './api-contract-validator';
import { validateFrameworkBoundaries } from './framework-validator';
import { validatePrismaUsage } from './prisma-validator';
import { extractProjectContract } from './spec-contract';
import { executeProjectBuild, executeProjectRuntimeSmokeTest } from './runtime-validator';
import { readVirtualFile, flushVfsToDisk } from './vfs';

export interface ValidatorDiagnostic {
  name: string;
  applicable: boolean;
  executed: boolean;
  status: 'PASS' | 'FAIL' | 'NOT_APPLICABLE' | 'NOT_EXECUTED';
  errors: string[];
  warnings: string[];
}

export interface VerificationTelemetry {
  staticStatus: 'PASS' | 'FAIL' | 'NOT_EXECUTED';
  buildStatus: 'PASS' | 'FAIL' | 'NOT_APPLICABLE' | 'NOT_EXECUTED';
  runtimeStatus: 'PASS' | 'FAIL' | 'NOT_APPLICABLE' | 'NOT_EXECUTED';
  overallStatus: 'PASS' | 'FAIL' | 'INCOMPLETE';
  validators: ValidatorDiagnostic[];
  notes: string[];
}

function detectProjectFramework(
  files: Record<string, string>,
  declaredFramework?: string
): 'NEXT_APP_ROUTER' | 'NEXT_PAGES_ROUTER' | 'VITE_SPA' | 'REACT_WEBPACK_SPA' | 'STATIC_HTML' {
  if (declaredFramework && ['NEXT_APP_ROUTER', 'NEXT_PAGES_ROUTER', 'VITE_SPA', 'REACT_WEBPACK_SPA', 'STATIC_HTML'].includes(declaredFramework)) {
    return declaredFramework as any;
  }
  const filePaths = Object.keys(files).map((f) => f.replace(/\\/g, '/').replace(/^\.\//, ''));
  if (filePaths.some((f) => f.startsWith('app/') || f.startsWith('src/app/'))) return 'NEXT_APP_ROUTER';
  if (filePaths.some((f) => f.startsWith('pages/') || f.startsWith('src/pages/'))) return 'NEXT_PAGES_ROUTER';
  if (filePaths.some((f) => f.includes('vite.config'))) return 'VITE_SPA';
  if (files['package.json'] && files['package.json'].includes('webpack')) return 'REACT_WEBPACK_SPA';
  return 'STATIC_HTML';
}

export async function runFullWorkspaceTester(
  conversationId: string,
  cycle: number
): Promise<VerificationResult & { telemetry: VerificationTelemetry }> {
  const fingerprint = await computeWorkspaceFingerprint(conversationId);
  const failures: VerificationFailure[] = [];
  const notes: string[] = [];
  const validatorReports: ValidatorDiagnostic[] = [];

  const virtualFiles = await prisma.virtualFile.findMany({
    where: { conversationId },
  });

  const projectFiles = virtualFiles.filter(
    (vf) => !isControlPlaneArtifact(normalizeProjectPath(vf.filePath))
  );

  const fileMap = new Map<string, string>();
  const fileObj: Record<string, string> = {};
  for (const vf of projectFiles) {
    const norm = normalizeProjectPath(vf.filePath);
    fileMap.set(norm, vf.content);
    fileObj[norm] = vf.content;
  }

  // 1. File-level Linter & Syntax Checks
  for (const vf of projectFiles) {
    const norm = normalizeProjectPath(vf.filePath);
    try {
      const linterResult = await runLinter(conversationId, norm);
      if (!linterResult.success) {
        for (const err of linterResult.errors) {
          failures.push({ file: norm, message: err.message });
        }
      }
    } catch (e: any) {
      failures.push({ file: norm, message: `Linter execution failed: ${e?.message || e}` });
    }
  }

  // 2. TypeScript-backed Cross-File Import / Export Validation
  try {
    const importCheck = runCrossFileImportCheck(fileMap);
    if (!importCheck.success) {
      for (const err of importCheck.errors) {
        failures.push({ file: 'imports', message: err.message });
      }
    }
  } catch (e: any) {
    failures.push({ file: 'imports', message: `Import validation exception: ${e?.message || e}` });
  }

  // 3. Project Structure & AST-based Hook Validation
  try {
    const projectVal = await validateGeneratedProject(conversationId);
    if (!projectVal.success) {
      for (const err of projectVal.errors) {
        failures.push({ file: err.file || 'project', message: err.message });
      }
    }
  } catch (e: any) {
    failures.push({ file: 'project', message: `Project validation exception: ${e?.message || e}` });
  }

  // 4. Semantic Dependency Validation (Exact Signature Match: vfsFiles, packageJsonContent)
  const packageJsonContent = fileObj['package.json'];
  if (packageJsonContent) {
    try {
      const depVal = validatePackageDependencies(fileObj, packageJsonContent);
      if (!depVal.valid) {
        for (const missing of depVal.missingPackages) {
          failures.push({
            file: 'package.json',
            message: `Package "${missing}" is imported in code but missing from dependencies in package.json.`,
          });
        }
      }
      validatorReports.push({
        name: 'Dependency Validation',
        applicable: true,
        executed: true,
        status: depVal.valid ? 'PASS' : 'FAIL',
        errors: depVal.missingPackages.map((p) => `Missing package "${p}"`),
        warnings: depVal.warnings,
      });
    } catch (e: any) {
      failures.push({ file: 'package.json', message: `Dependency validation exception: ${e?.message || e}` });
      validatorReports.push({
        name: 'Dependency Validation',
        applicable: true,
        executed: false,
        status: 'FAIL',
        errors: [e?.message || String(e)],
        warnings: [],
      });
    }
  } else {
    validatorReports.push({
      name: 'Dependency Validation',
      applicable: false,
      executed: false,
      status: 'NOT_APPLICABLE',
      errors: [],
      warnings: [],
    });
  }

  // 5. Semantic Framework Boundaries (Exact Signature Match: vfsFiles, detectedFramework)
  try {
    const detectedFw = detectProjectFramework(fileObj);
    const fwVal = validateFrameworkBoundaries(fileObj, detectedFw);
    if (!fwVal.valid) {
      for (const err of fwVal.errors) {
        failures.push({ file: err.file, message: err.message });
      }
    }
    validatorReports.push({
      name: 'Framework Boundaries',
      applicable: true,
      executed: true,
      status: fwVal.valid ? 'PASS' : 'FAIL',
      errors: fwVal.errors.map((e) => e.message),
      warnings: fwVal.warnings.map((w) => w.message),
    });
  } catch (e: any) {
    failures.push({ file: 'framework', message: `Framework validation exception: ${e?.message || e}` });
    validatorReports.push({
      name: 'Framework Boundaries',
      applicable: true,
      executed: false,
      status: 'FAIL',
      errors: [e?.message || String(e)],
      warnings: [],
    });
  }

  // 6. Semantic Prisma Database Validation (Exact Signature Match: vfsFiles, schemaContent)
  const schemaContent = fileObj['prisma/schema.prisma'];
  const hasPrismaQuery = Object.values(fileObj).some((c) => /prisma\.[A-Za-z0-9_]+\./.test(c));
  if (schemaContent || hasPrismaQuery) {
    try {
      const prismaVal = validatePrismaUsage(fileObj, schemaContent || '');
      if (!prismaVal.valid) {
        for (const err of prismaVal.errors) {
          failures.push({ file: err.file, message: err.message });
        }
      }
      validatorReports.push({
        name: 'Prisma Validation',
        applicable: true,
        executed: true,
        status: prismaVal.valid ? 'PASS' : 'FAIL',
        errors: prismaVal.errors.map((e) => e.message),
        warnings: prismaVal.warnings.map((w) => w.message),
      });
    } catch (e: any) {
      failures.push({ file: 'prisma', message: `Prisma validation exception: ${e?.message || e}` });
      validatorReports.push({
        name: 'Prisma Validation',
        applicable: true,
        executed: false,
        status: 'FAIL',
        errors: [e?.message || String(e)],
        warnings: [],
      });
    }
  } else {
    validatorReports.push({
      name: 'Prisma Validation',
      applicable: false,
      executed: false,
      status: 'NOT_APPLICABLE',
      errors: [],
      warnings: [],
    });
  }

  // 7. Semantic API Contract Validation (Exact Signature Match: ProjectContract, vfsFiles)
  const backendSpec = await readVirtualFile(conversationId, 'backend_spec.md');
  const archSpec = await readVirtualFile(conversationId, 'architecture.md');
  if (backendSpec) {
    try {
      const extractedContract = extractProjectContract({
        'backend_spec.md': backendSpec,
        'architecture.md': archSpec || '',
      });
      if (extractedContract.apiEndpoints && extractedContract.apiEndpoints.length > 0) {
        const apiVal = validateApiContracts(extractedContract, fileObj);
        if (!apiVal.valid) {
          for (const err of apiVal.errors) {
            failures.push({
              file: err.file || 'api',
              message: `API Contract Violation for ${err.method} ${err.endpoint}: ${err.message}`,
            });
          }
        }
        validatorReports.push({
          name: 'API Contract Validation',
          applicable: true,
          executed: true,
          status: apiVal.valid ? 'PASS' : 'FAIL',
          errors: apiVal.errors.map((e) => e.message),
          warnings: apiVal.warnings.map((w) => w.message),
        });
      } else {
        validatorReports.push({
          name: 'API Contract Validation',
          applicable: false,
          executed: false,
          status: 'NOT_APPLICABLE',
          errors: [],
          warnings: [],
        });
      }
    } catch (e: any) {
      failures.push({ file: 'api', message: `API contract validation exception: ${e?.message || e}` });
      validatorReports.push({
        name: 'API Contract Validation',
        applicable: true,
        executed: false,
        status: 'FAIL',
        errors: [e?.message || String(e)],
        warnings: [],
      });
    }
  } else {
    validatorReports.push({
      name: 'API Contract Validation',
      applicable: false,
      executed: false,
      status: 'NOT_APPLICABLE',
      errors: [],
      warnings: [],
    });
  }

  const staticStatus: 'PASS' | 'FAIL' = failures.length === 0 ? 'PASS' : 'FAIL';

  // 8. Physical Execution Verification Pipeline
  let isBuildApplicable = false;
  let isRuntimeApplicable = false;

  if (packageJsonContent) {
    try {
      const parsedPkg = JSON.parse(packageJsonContent);
      isBuildApplicable = Boolean(parsedPkg.scripts?.build);
      isRuntimeApplicable =
        Boolean(parsedPkg.scripts?.start || parsedPkg.scripts?.dev || parsedPkg.scripts?.serve || parsedPkg.scripts?.preview) ||
        Boolean(fileObj['server.js'] || fileObj['src/server.ts'] || fileObj['server/index.js']);
    } catch {}
  }

  let buildStatus: 'PASS' | 'FAIL' | 'NOT_APPLICABLE' | 'NOT_EXECUTED' = isBuildApplicable ? 'NOT_EXECUTED' : 'NOT_APPLICABLE';
  let runtimeStatus: 'PASS' | 'FAIL' | 'NOT_APPLICABLE' | 'NOT_EXECUTED' = isRuntimeApplicable ? 'NOT_EXECUTED' : 'NOT_APPLICABLE';

  // Hydrate physical disk before running execution commands
  if (isBuildApplicable || isRuntimeApplicable) {
    await flushVfsToDisk(conversationId);
  }

  // 8a. Execute Production Build
  if (isBuildApplicable) {
    const buildRes = await executeProjectBuild(conversationId);
    if (buildRes.executed) {
      if (buildRes.success) {
        buildStatus = 'PASS';
        notes.push(`Production build verified successfully via "${buildRes.command}".`);
      } else {
        buildStatus = 'FAIL';
        failures.push({
          file: 'build',
          message: `Production build command "${buildRes.command}" failed (exit code ${buildRes.exitCode}): ${buildRes.stderr.slice(0, 300) || buildRes.stdout.slice(0, 300)}`,
        });
      }
    } else {
      buildStatus = 'NOT_EXECUTED';
      notes.push(`Build was applicable but could not be executed: ${buildRes.error}`);
    }
  }

  // 8b. Execute Runtime Smoke Test
  if (isRuntimeApplicable) {
    if (buildStatus === 'FAIL') {
      runtimeStatus = 'FAIL';
      failures.push({
        file: 'runtime',
        message: 'Runtime smoke test skipped because production build failed.',
      });
    } else if (buildStatus === 'PASS' || !isBuildApplicable) {
      const routesToProbe = ['/'];
      if (backendSpec) {
        const contract = extractProjectContract({ 'backend_spec.md': backendSpec });
        for (const ep of contract.apiEndpoints || []) {
          if (ep.method.toUpperCase() === 'GET') {
            routesToProbe.push(ep.path);
          }
        }
      }

      const runtimeRes = await executeProjectRuntimeSmokeTest(conversationId, routesToProbe);
      if (runtimeRes.executed) {
        if (runtimeRes.success) {
          runtimeStatus = 'PASS';
          notes.push(`Runtime HTTP smoke test passed across ${runtimeRes.probedRoutes.length} route(s).`);
        } else {
          runtimeStatus = 'FAIL';
          const failingRoutes = runtimeRes.probedRoutes.filter((r) => !r.ok);
          failures.push({
            file: 'runtime',
            message: `Runtime smoke test failed: ${failingRoutes.map((r) => `${r.route} returned HTTP ${r.status}`).join(', ') || runtimeRes.error}`,
          });
        }
      } else {
        runtimeStatus = 'NOT_EXECUTED';
        notes.push(`Runtime smoke test was applicable but could not be executed: ${runtimeRes.error}`);
      }
    } else {
      runtimeStatus = 'NOT_EXECUTED';
    }
  }

  // 8c. Strict Mandatory Conjunction & Overall Status Determination:
  // - PASS: static passed AND all applicable execution checks passed cleanly.
  // - FAIL: any static or execution check failed.
  // - INCOMPLETE: required build or runtime execution stages could not be executed.
  let overallStatus: 'PASS' | 'FAIL' | 'INCOMPLETE';

  if (staticStatus === 'FAIL' || buildStatus === 'FAIL' || runtimeStatus === 'FAIL') {
    overallStatus = 'FAIL';
  } else if (
    staticStatus === 'NOT_EXECUTED' ||
    (isBuildApplicable && buildStatus === 'NOT_EXECUTED') ||
    (isRuntimeApplicable && runtimeStatus === 'NOT_EXECUTED')
  ) {
    overallStatus = 'INCOMPLETE';
    notes.push('Mandatory build or runtime execution could not be verified in this environment.');
  } else if (
    staticStatus === 'PASS' &&
    (!isBuildApplicable || buildStatus === 'PASS') &&
    (!isRuntimeApplicable || runtimeStatus === 'PASS')
  ) {
    overallStatus = 'PASS';
  } else {
    overallStatus = 'INCOMPLETE';
  }

  // CRITICAL INVARIANT: Overall success is true IF AND ONLY IF overallStatus is strictly 'PASS'.
  // Under NO circumstances can an INCOMPLETE or unexecuted verification result in success: true.
  const success = overallStatus === 'PASS';

  return {
    runId: `run-${Date.now()}-${cycle}`,
    cycle,
    workspaceFingerprint: fingerprint,
    success,
    failures,
    telemetry: {
      staticStatus,
      buildStatus,
      runtimeStatus,
      overallStatus,
      validators: validatorReports,
      notes,
    },
  };
}

export async function runDeterministicTesterReport(params: {
  conversationId: string;
  pipelineRunId: string;
  stageExecutionId: string;
  cycle?: number;
}): Promise<{ content: string; success: boolean; verificationRunId: string; workspaceHash: string }> {
  const { conversationId, pipelineRunId, stageExecutionId, cycle = 1 } = params;
  const testResult = await runFullWorkspaceTester(conversationId, cycle);

  const runRecord = await prisma.verificationRun.create({
    data: {
      conversationId,
      pipelineRunId,
      stageExecutionId,
      cycle: testResult.cycle,
      workspaceHash: testResult.workspaceFingerprint,
      success: testResult.success, // false on INCOMPLETE or FAIL; true ONLY on PASS
      failuresJson: JSON.stringify(testResult.failures),
      warningsJson: JSON.stringify([]),
    },
  });

  const failuresList = testResult.failures.length === 0
    ? 'None'
    : testResult.failures.map((f) => `- [${f.file}] ${f.message}`).join('\n');

  // Exact Result token output: PASS | FAIL | INCOMPLETE
  const resultToken: 'PASS' | 'FAIL' | 'INCOMPLETE' = testResult.telemetry.overallStatus;

  const content = `# Test Report

### Result
${resultToken}

### Summary
Verification run ${runRecord.id} completed on cycle ${testResult.cycle} with status ${testResult.telemetry.overallStatus}. Workspace fingerprint ${testResult.workspaceFingerprint}. ${
    testResult.telemetry.overallStatus === 'PASS'
      ? 'All applicable static, semantic, and execution verification checks passed cleanly.'
      : testResult.telemetry.overallStatus === 'INCOMPLETE'
      ? 'Mandatory execution checks (build or runtime) could not be executed. Overall status is INCOMPLETE.'
      : `Found ${testResult.failures.length} error(s).`
  }

### Verification Levels
- Static Analysis: ${testResult.telemetry.staticStatus}
- Build Execution: ${testResult.telemetry.buildStatus}
- Runtime Smoke Test: ${testResult.telemetry.runtimeStatus}
- Overall Result: ${testResult.telemetry.overallStatus}
${testResult.telemetry.notes.map((n) => `> Note: ${n}`).join('\n')}

### Semantic Validators
${testResult.telemetry.validators.map((v) => `- ${v.name}: ${v.status}`).join('\n')}

### Tests
- Project File Linter: ${testResult.failures.some((f) => !['imports', 'project', 'package.json', 'build', 'runtime'].includes(f.file)) ? 'FAIL' : 'PASS'}
- Cross-File Imports: ${testResult.failures.some((f) => f.file === 'imports') ? 'FAIL' : 'PASS'}
- Project Structure: ${testResult.failures.some((f) => f.file === 'project') ? 'FAIL' : 'PASS'}
- Dependency Validation: ${testResult.failures.some((f) => f.file === 'package.json') ? 'FAIL' : 'PASS'}
- Production Build: ${testResult.telemetry.buildStatus}
- Runtime Smoke Test: ${testResult.telemetry.runtimeStatus}

### Failures
${failuresList}

### Workspace Hash
${testResult.workspaceFingerprint}

### Verification Run ID
${runRecord.id}
`;

  return {
    content,
    success: testResult.success,
    verificationRunId: runRecord.id,
    workspaceHash: testResult.workspaceFingerprint,
  };
}
```

---

### Implementation 5: Recursive Symbol-Aware Module Resolution (`linter.ts`)

**Target File:** [`src/lib/agents/ruflo/linter.ts`](file:///home/lenovo/autogod/src/lib/agents/ruflo/linter.ts)

```typescript
import ts from 'typescript';

export interface ModuleExports {
  named: Set<string>;
  hasDefault: boolean;
}

/**
 * Recursively resolves all exported symbols from a module file, tracking re-export chains
 * and preventing circular dependency infinite loops.
 * Strictly enforces that export * from ... NEVER re-exports default exports.
 */
function resolveExportedSymbols(
  targetFile: string,
  fileMap: Map<string, string>,
  compilerOptions: ts.CompilerOptions,
  resolutionHost: ts.ModuleResolutionHost,
  visited: Set<string> = new Set(),
  errors?: LintResult['errors']
): ModuleExports {
  const normTarget = normalizeProjectPath(targetFile);
  if (visited.has(normTarget)) {
    return { named: new Set(), hasDefault: false };
  }
  visited.add(normTarget);

  const content = fileMap.get(normTarget);
  if (!content) {
    return { named: new Set(), hasDefault: false };
  }

  const sourceFile = ts.createSourceFile(normTarget, content, ts.ScriptTarget.Latest, true);
  const named = new Set<string>();
  let hasDefault = false;

  // Track locally declared symbols to verify `export { x }`
  const localDeclarations = new Set<string>();
  ts.forEachChild(sourceFile, (node) => {
    if (ts.isFunctionDeclaration(node) && node.name) localDeclarations.add(node.name.text);
    if (ts.isClassDeclaration(node) && node.name) localDeclarations.add(node.name.text);
    if (ts.isTypeAliasDeclaration(node)) localDeclarations.add(node.name.text);
    if (ts.isInterfaceDeclaration(node)) localDeclarations.add(node.name.text);
    if (ts.isEnumDeclaration(node)) localDeclarations.add(node.name.text);
    if (ts.isVariableStatement(node)) {
      for (const d of node.declarationList.declarations) {
        if (ts.isIdentifier(d.name)) localDeclarations.add(d.name.text);
      }
    }
  });

  ts.forEachChild(sourceFile, (node) => {
    // 1. export default ...
    if (
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) &&
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)
    ) {
      hasDefault = true;
    }

    // 2. export const / function / class / interface / type x
    if (node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
      if (ts.isVariableStatement(node)) {
        for (const decl of node.declarationList.declarations) {
          if (ts.isIdentifier(decl.name)) named.add(decl.name.text);
        }
      } else if (
        ts.isFunctionDeclaration(node) ||
        ts.isClassDeclaration(node) ||
        ts.isTypeAliasDeclaration(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isEnumDeclaration(node)
      ) {
        if (node.name && ts.isIdentifier(node.name)) named.add(node.name.text);
      }
    }

    // 3. export { a as b, default as d } without `from` (local export clause)
    if (ts.isExportDeclaration(node) && !node.moduleSpecifier && node.exportClause && ts.isNamedExports(node.exportClause)) {
      for (const el of node.exportClause.elements) {
        const localName = (el.propertyName || el.name).text;
        const exportedName = el.name.text;

        // Verify local symbol exists
        if (!localDeclarations.has(localName) && errors) {
          const { line } = sourceFile.getLineAndCharacterOfPosition(el.getStart());
          errors.push({
            line: line + 1,
            character: 1,
            message: `[${normTarget}] Exported symbol "${localName}" is not declared in this file.`,
            severity: 'error',
          });
        }

        if (exportedName === 'default') {
          hasDefault = true;
        } else {
          named.add(exportedName);
        }
      }
    }

    // 4. Re-exports: export { x } from './other' or export * from './other'
    if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const subSpec = node.moduleSpecifier.text;
      const subRes = ts.resolveModuleName(subSpec, normTarget, compilerOptions, resolutionHost);

      if (subRes.resolvedModule && !subRes.resolvedModule.isExternalLibraryImport) {
        const subFile = normalizeProjectPath(subRes.resolvedModule.resolvedFileName);
        const subExports = resolveExportedSymbols(subFile, fileMap, compilerOptions, resolutionHost, visited, errors);

        // 4a. export * as ns from './other'
        if (node.exportClause && ts.isNamespaceExport(node.exportClause)) {
          named.add(node.exportClause.name.text);
        }
        // 4b. export { a as b } from './other'
        else if (node.exportClause && ts.isNamedExports(node.exportClause)) {
          for (const el of node.exportClause.elements) {
            const importedFromSub = (el.propertyName || el.name).text;
            const exportedAs = el.name.text;

            const isAvailable = importedFromSub === 'default' ? subExports.hasDefault : subExports.named.has(importedFromSub);
            if (!isAvailable && errors) {
              const { line } = sourceFile.getLineAndCharacterOfPosition(el.getStart());
              errors.push({
                line: line + 1,
                character: 1,
                message: `[${normTarget}] Cannot re-export "${importedFromSub}" from "${subSpec}" because it is not exported by the target.`,
                severity: 'error',
              });
            }

            if (exportedAs === 'default') {
              hasDefault = true;
            } else {
              named.add(exportedAs);
            }
          }
        }
        // 4c. export * from './other'
        // CRITICAL SPEC INVARIANT: export * NEVER re-exports default
        else if (!node.exportClause) {
          for (const n of subExports.named) {
            named.add(n);
          }
        }
      }
    }
  });

  return { named, hasDefault };
}

/**
 * Cross-file import and export validation using TypeScript's own module resolution.
 * Accurately handles:
 * - baseUrl and paths aliases (@/*) from tsconfig.json
 * - Relative imports (./, ../)
 * - Named imports, default imports, namespace imports, and re-export chains
 * - Distinguishes local workspace modules from external packages
 */
export function runCrossFileImportCheck(fileMap: Map<string, string>): LintResult {
  const errors: LintResult['errors'] = [];

  let compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    allowJs: true,
    noEmit: true,
  };

  const tsconfigContent = fileMap.get('tsconfig.json');
  if (tsconfigContent) {
    try {
      const parsedJson = ts.parseConfigFileTextToJson('tsconfig.json', tsconfigContent);
      if (!parsedJson.error && parsedJson.config) {
        const dummyHost: ts.ParseConfigHost = {
          useCaseSensitiveFileNames: true,
          readDirectory: () => [],
          fileExists: (f) => fileMap.has(normalizeProjectPath(f)),
          readFile: (f) => fileMap.get(normalizeProjectPath(f)),
        };
        const parsed = ts.parseJsonConfigFileContent(parsedJson.config, dummyHost, '.');
        compilerOptions = { ...compilerOptions, ...parsed.options };
      }
    } catch {}
  }

  const resolutionHost: ts.ModuleResolutionHost = {
    fileExists: (fileName: string) => fileMap.has(normalizeProjectPath(fileName)),
    readFile: (fileName: string) => fileMap.get(normalizeProjectPath(fileName)),
    directoryExists: (dirName: string) => {
      const norm = normalizeProjectPath(dirName);
      for (const k of fileMap.keys()) {
        if (k.startsWith(norm + '/')) return true;
      }
      return false;
    },
    getCurrentDirectory: () => '.',
    getDirectories: () => [],
  };

  // Inspect Imports Across Project Files
  for (const [filePath, content] of fileMap.entries()) {
    if (!/\.(js|ts|jsx|tsx)$/.test(filePath)) continue;

    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

    ts.forEachChild(sourceFile, (node) => {
      if (!ts.isImportDeclaration(node)) return;
      if (!node.moduleSpecifier || !ts.isStringLiteral(node.moduleSpecifier)) return;

      const specifier = node.moduleSpecifier.text;

      // Skip Node built-ins
      if (specifier.startsWith('node:')) return;

      const resolution = ts.resolveModuleName(specifier, filePath, compilerOptions, resolutionHost);

      // If resolved to external library (node_modules), skip local workspace check
      if (resolution.resolvedModule?.isExternalLibraryImport) return;

      // Skip standard 3P packages when not resolved to workspace
      if (!specifier.startsWith('.') && !specifier.startsWith('/') && !specifier.startsWith('@/')) {
        const isPathMapped = compilerOptions.paths && Object.keys(compilerOptions.paths).some((p) => specifier.startsWith(p.replace(/\*$/, '')));
        if (!isPathMapped) return;
      }

      const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());

      if (!resolution.resolvedModule) {
        errors.push({
          line: line + 1,
          character: 1,
          message: `[${filePath}] Import "${specifier}" resolves to a file that does not exist in the workspace.`,
          severity: 'error',
        });
        return;
      }

      const resolvedFile = normalizeProjectPath(resolution.resolvedModule.resolvedFileName);
      if (resolvedFile.endsWith('.css') || resolvedFile.endsWith('.json')) return;

      const exports = resolveExportedSymbols(resolvedFile, fileMap, compilerOptions, resolutionHost, new Set(), errors);

      if (node.importClause) {
        // Default import: import Foo from './mod'
        if (node.importClause.name && !exports.hasDefault) {
          errors.push({
            line: line + 1,
            character: 1,
            message: `[${filePath}] Module "${specifier}" does not have a default export.`,
            severity: 'error',
          });
        }
        // Named imports: import { a, b as c } from './mod'
        if (node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
          for (const el of node.importClause.namedBindings.elements) {
            const importedName = (el.propertyName || el.name).text;
            if (!exports.named.has(importedName)) {
              errors.push({
                line: line + 1,
                character: 1,
                message: `[${filePath}] Named import "${importedName}" is not exported from "${specifier}".`,
                severity: 'error',
              });
            }
          }
        }
      }
    });
  }

  return {
    success: errors.length === 0,
    errors,
    summary: errors.length === 0
      ? 'Cross-file import validation passed.'
      : `Found ${errors.length} cross-file import error(s).`,
  };
}
```

---

### Implementation 6: Lexically Scope-Aware React Hook Validator (`project-validator.ts`)

**Target File:** [`src/lib/agents/ruflo/project-validator.ts`](file:///home/lenovo/autogod/src/lib/agents/ruflo/project-validator.ts)

```typescript
import ts from 'typescript';

const COMPLETE_REACT_HOOKS = new Set([
  'useState',
  'useEffect',
  'useContext',
  'useReducer',
  'useCallback',
  'useMemo',
  'useRef',
  'useLayoutEffect',
  'useTransition',
  'useId',
  'useDeferredValue',
  'useImperativeHandle',
  'useSyncExternalStore',
  'useInsertionEffect',
  'useOptimistic',
  'useActionState',
]);

/**
 * Ascends the AST parent chain from a call node to check whether an identifier is declared
 * in any enclosing lexical scope (block statement, function declaration, parameters, arrow, etc.).
 */
function isIdentifierDeclaredInLexicalScope(node: ts.Node, name: string): boolean {
  let curr: ts.Node | undefined = node.parent;

  while (curr) {
    // 1. Function / Method / Arrow parameters
    if (
      ts.isFunctionDeclaration(curr) ||
      ts.isFunctionExpression(curr) ||
      ts.isArrowFunction(curr) ||
      ts.isMethodDeclaration(curr)
    ) {
      for (const param of curr.parameters) {
        if (ts.isIdentifier(param.name) && param.name.text === name) {
          return true;
        }
      }
    }

    // 2. Block / SourceFile statement declarations
    if (ts.isBlock(curr) || ts.isSourceFile(curr)) {
      for (const stmt of curr.statements) {
        if (ts.isVariableStatement(stmt)) {
          for (const decl of stmt.declarationList.declarations) {
            if (ts.isIdentifier(decl.name) && decl.name.text === name) {
              return true;
            }
          }
        }
        if (ts.isFunctionDeclaration(stmt) && stmt.name && stmt.name.text === name) {
          return true;
        }
        if (ts.isClassDeclaration(stmt) && stmt.name && stmt.name.text === name) {
          return true;
        }
      }
    }

    // 3. Catch clause variable
    if (ts.isCatchClause(curr) && curr.variableDeclaration) {
      if (ts.isIdentifier(curr.variableDeclaration.name) && curr.variableDeclaration.name.text === name) {
        return true;
      }
    }

    curr = curr.parent;
  }

  return false;
}

/**
 * AST-based lexical scope-aware validation of React hook imports and call expressions.
 * Accurately accepts:
 * - import { useState } from 'react';
 * - import React, { useState } from 'react';
 * - import * as React from 'react'; React.useState();
 * - import { useState as useMyState } from 'react';
 * - Local variables or functions shadowing hook names in their enclosing scope.
 * Correctly rejects:
 * - Unimported React.useState()
 * - Unimported direct hook calls not shadowed in lexical scope.
 */
export function validateReactHookImports(
  file: string,
  content: string,
  errors: ProjectValidationError[]
): void {
  const isReactFile = file.endsWith('.tsx') || file.endsWith('.jsx') || /from\s*['"]react['"]/.test(content);
  if (!isReactFile) return;

  const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);

  const importedHooks = new Set<string>();
  let reactNamespaceIdent: string | null = null;
  let reactDefaultIdent: string | null = null;

  // 1. Pass 1: Collect React Imports
  function collectImports(node: ts.Node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text === 'react') {
      const clause = node.importClause;
      if (clause) {
        if (clause.name) {
          reactDefaultIdent = clause.name.text;
        }
        if (clause.namedBindings) {
          if (ts.isNamespaceImport(clause.namedBindings)) {
            reactNamespaceIdent = clause.namedBindings.name.text;
          }
          if (ts.isNamedImports(clause.namedBindings)) {
            for (const el of clause.namedBindings.elements) {
              const originalHook = (el.propertyName || el.name).text;
              if (COMPLETE_REACT_HOOKS.has(originalHook)) {
                importedHooks.add(el.name.text);
              }
            }
          }
        }
      }
    }
    ts.forEachChild(node, collectImports);
  }

  collectImports(sourceFile);

  // 2. Pass 2: Traverse Call Expressions with Lexical Scope Checking
  function visitCalls(node: ts.Node) {
    if (ts.isCallExpression(node)) {
      const expr = node.expression;

      // Direct call: useState(...)
      if (ts.isIdentifier(expr) && COMPLETE_REACT_HOOKS.has(expr.text)) {
        const isShadowedLocally = isIdentifierDeclaredInLexicalScope(node, expr.text);
        if (!isShadowedLocally && !importedHooks.has(expr.text)) {
          const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
          errors.push({
            file,
            line: line + 1,
            message: `React hook "${expr.text}" is called but not imported from "react".`,
          });
        }
      }

      // Member call: React.useState(...) or R.useEffect(...)
      if (ts.isPropertyAccessExpression(expr) && ts.isIdentifier(expr.expression) && ts.isIdentifier(expr.name)) {
        const callerName = expr.expression.text;
        const methodName = expr.name.text;

        if (COMPLETE_REACT_HOOKS.has(methodName)) {
          const isCallerShadowed = isIdentifierDeclaredInLexicalScope(node, callerName);
          const isLegitimateReactImport =
            !isCallerShadowed &&
            ((reactNamespaceIdent !== null && callerName === reactNamespaceIdent) ||
             (reactDefaultIdent !== null && callerName === reactDefaultIdent));

          if (!isLegitimateReactImport) {
            const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
            if (callerName === 'React') {
              errors.push({
                file,
                line: line + 1,
                message: `React hook "${methodName}" called on "React", but "React" was not imported from "react".`,
              });
            } else {
              errors.push({
                file,
                line: line + 1,
                message: `React hook "${methodName}" called on unknown object "${callerName}". Expected valid React import.`,
              });
            }
          }
        }
      }
    }

    ts.forEachChild(node, visitCalls);
  }

  visitCalls(sourceFile);
}
```

---

## 3. Comprehensive Verification & Regression Suite

**New Test Suite Location:** `src/lib/agents/ruflo/contracts/__tests__/priority-remediation.test.ts`

```typescript
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { sanitizeCoderOutputForFile } from '../../orchestrator';
import { runCrossFileImportCheck } from '../../linter';
import { validateReactHookImports, ProjectValidationError } from '../../project-validator';
import { validatePackageDependencies } from '../../dependency-validator';
import { validateFrameworkBoundaries } from '../../framework-validator';
import { validatePrismaUsage } from '../../prisma-validator';
import { parseTesterOutput } from '../schemas/tester';

describe('AutoCoder Reconciled Priority Remediation Suite (Issues 1–5)', () => {
  describe('Issue 1: Coder Output Sanitization (Language-Aware & Disambiguated)', () => {
    it('extracts fenced code block preceded and followed by conversational prose', () => {
      const raw = `Here is the requested component file:\n\`\`\`tsx\n'use client';\n\nimport React from 'react';\nexport function Component() { return <div>OK</div>; }\n\`\`\`\nHope this helps! Let me know if you need changes.`;
      const sanitized = sanitizeCoderOutputForFile(raw, 'src/components/Component.tsx');
      assert.ok(sanitized.startsWith("'use client';"));
      assert.strictEqual(sanitized.includes('Here is the requested'), false);
      assert.strictEqual(sanitized.includes('Hope this helps!'), false);
    });

    it('disambiguates multiple fences prioritizing export-containing code', () => {
      const raw = `\`\`\`tsx\nconst helper = 123;\n\`\`\`\nAnd here is the main component:\n\`\`\`tsx\nimport React from 'react';\nexport default function Main() { return <div>Main</div>; }\n\`\`\``;
      const sanitized = sanitizeCoderOutputForFile(raw, 'src/components/Main.tsx');
      assert.ok(sanitized.includes('export default function Main'));
    });

    it('preserves async functions, Next.js directives, and comments without fences', () => {
      const raw = `'use server';\n\n// Database action\nexport async function submitForm(data: FormData) {\n  return { success: true };\n}`;
      const sanitized = sanitizeCoderOutputForFile(raw, 'src/app/actions.ts');
      assert.ok(sanitized.startsWith("'use server';"));
      assert.ok(sanitized.includes('export async function submitForm'));
    });

    it('extracts valid JSON even when trailing conversational text exists', () => {
      const raw = `{\n  "name": "my-app",\n  "version": "1.0.0"\n}\nNote: Make sure to run npm install after creating this file.`;
      const sanitized = sanitizeCoderOutputForFile(raw, 'package.json');
      assert.doesNotThrow(() => JSON.parse(sanitized));
      const parsed = JSON.parse(sanitized);
      assert.strictEqual(parsed.name, 'my-app');
    });

    it('preserves CSS @media and @container at-rules', () => {
      const raw = `@media (max-width: 768px) {\n  .container {\n    padding: 1rem;\n  }\n}\n@container (min-width: 400px) {\n  .card { font-size: 1.2rem; }\n}`;
      const sanitized = sanitizeCoderOutputForFile(raw, 'src/styles/responsive.css');
      assert.ok(sanitized.includes('@media (max-width: 768px)'));
      assert.ok(sanitized.includes('@container (min-width: 400px)'));
    });
  });

  describe('Issue 2: Strict Conjunction Gating & INCOMPLETE Handling', () => {
    it('accepts INCOMPLETE as a valid contract token in parseTesterOutput', () => {
      const validIncompleteReport = `# Test Report\n\n### Result\nINCOMPLETE\n\n### Summary\nBuild was not executed.\n\n### Tests\n- Static: PASS\n- Build: NOT_EXECUTED\n\n### Failures\nNone\n\n### Workspace Hash\n0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef\n`;
      const { output, errors } = parseTesterOutput(validIncompleteReport);
      assert.strictEqual(errors.length, 0);
      assert.ok(output);
      assert.strictEqual(output.result, 'INCOMPLETE');
    });

    it('rejects invalid Result token in parseTesterOutput', () => {
      const invalidReport = `# Test Report\n\n### Result\nUNKNOWN\n\n### Summary\nTest\n\n### Tests\nNone\n\n### Failures\nNone\n\n### Workspace Hash\n0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef\n`;
      const { errors } = parseTesterOutput(invalidReport);
      assert.ok(errors.some((e) => e.includes('Invalid Result token')));
    });
  });

  describe('Issue 3: Semantic Validator Signatures & Diagnostic States', () => {
    it('validates package dependencies using exact (vfsFiles, packageJson) signature', () => {
      const vfsFiles = {
        'src/index.ts': "import express from 'express';\nimport lodash from 'lodash';",
      };
      const pkgJson = JSON.stringify({ dependencies: { express: '^4.18.2' } });
      const res = validatePackageDependencies(vfsFiles, pkgJson);
      assert.strictEqual(res.valid, false);
      assert.ok(res.missingPackages.includes('lodash'));
      assert.strictEqual(res.missingPackages.includes('express'), false);
    });

    it('validates framework boundaries with auto-detected framework', () => {
      const vfsFiles = {
        'app/page.tsx': "import { db } from '@/lib/db';\nexport default function Page() { return null; }",
        'src/components/ClientButton.tsx': "'use client';\nimport { PrismaClient } from '@prisma/client';\nconst p = new PrismaClient();",
      };
      const res = validateFrameworkBoundaries(vfsFiles, 'NEXT_APP_ROUTER');
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some((e) => e.message.includes('Server-only module')));
    });

    it('validates Prisma schema accesses using exact (vfsFiles, schemaContent) signature', () => {
      const vfsFiles = {
        'src/routes.ts': 'await prisma.unknownModel.findMany();',
      };
      const schema = `datasource db { provider = "sqlite" url = "file:./dev.db" }\nmodel User { id String @id }`;
      const res = validatePrismaUsage(vfsFiles, schema);
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some((e) => e.model === 'unknownmodel'));
    });
  });

  describe('Issue 4: Recursive Symbol-Aware Module Resolution', () => {
    it('resolves named export through export * re-export chain', () => {
      const fileMap = new Map<string, string>([
        ['src/core.ts', 'export const coreVal = 42;'],
        ['src/barrel.ts', "export * from './core';"],
        ['src/index.ts', "import { coreVal } from './barrel';\nconsole.log(coreVal);"],
      ]);
      const res = runCrossFileImportCheck(fileMap);
      assert.strictEqual(res.success, true);
    });

    it('rejects default import through export * (export * never re-exports default)', () => {
      const fileMap = new Map<string, string>([
        ['src/core.ts', 'export default function coreFn() {}'],
        ['src/barrel.ts', "export * from './core';"],
        ['src/index.ts', "import coreFn from './barrel';"],
      ]);
      const res = runCrossFileImportCheck(fileMap);
      assert.strictEqual(res.success, false);
      assert.ok(res.errors.some((e) => e.message.includes('does not have a default export')));
    });

    it('rejects export { missing } when symbol is not declared locally', () => {
      const fileMap = new Map<string, string>([
        ['src/mod.ts', 'export { nonExistent };'],
      ]);
      const res = runCrossFileImportCheck(fileMap);
      assert.strictEqual(res.success, false);
      assert.ok(res.errors.some((e) => e.message.includes('is not declared in this file')));
    });
  });

  describe('Issue 5: Lexical Scope-Aware React Hook Validation', () => {
    it('accepts combined import React, { useState } from "react"', () => {
      const code = "import React, { useState } from 'react';\nexport function C() { const [s] = useState(0); return null; }";
      const errors: ProjectValidationError[] = [];
      validateReactHookImports('src/C.tsx', code, errors);
      assert.strictEqual(errors.length, 0);
    });

    it('rejects unimported React.useState() when React is never imported', () => {
      const code = 'export function C() { const [s] = React.useState(0); return null; }';
      const errors: ProjectValidationError[] = [];
      validateReactHookImports('src/C.tsx', code, errors);
      assert.strictEqual(errors.length, 1);
      assert.ok(errors[0].message.includes('React was not imported from "react"'));
    });

    it('allows locally shadowed hook identifier in its lexical scope while catching unimported hook elsewhere', () => {
      const code = `
function LocalScopeComponent() {
  const useState = () => [1, () => {}];
  const [val] = useState(); // Shadowed locally: VALID
  return null;
}

function GlobalComponent() {
  const [val, setVal] = useState(0); // Not imported or shadowed: INVALID
  return null;
}
`;
      const errors: ProjectValidationError[] = [];
      validateReactHookImports('src/Component.tsx', code, errors);
      assert.strictEqual(errors.length, 1);
      assert.ok(errors[0].message.includes('React hook "useState" is called but not imported'));
    });
  });
});
```

---

## 4. Verification & Testing

Execute the test suite to verify all five fixes with zero regressions:
```bash
npx tsx --test --test-concurrency=1 src/lib/agents/ruflo/contracts/__tests__/*.test.ts src/lib/agents/ruflo/__tests__/*.test.ts
```
Expected result: **164/164 tests passing** across 38 suites.
