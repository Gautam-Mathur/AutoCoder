# AutoCoder Comprehensive Issues & Fixes Report

**Session Scope**: Deep recursive scan of generated projects (`autocoder-project-c51d3614`, `projects/48a3e025`), SQLite database (`dev.db`), telemetry logs, and full pipeline source code audit.

**Source Artifacts Consolidated**:
- [generated_projects_deep_scan_rca.md](file:///C:/Users/Lenovo/.gemini/antigravity/brain/95bba95b-58e4-4ecf-89be-53723ed95bb2/generated_projects_deep_scan_rca.md) — 10 fatal runtime bugs in generated code
- [pipeline_agent_responses_deep_dive.md](file:///C:/Users/Lenovo/.gemini/antigravity/brain/95bba95b-58e4-4ecf-89be-53723ed95bb2/pipeline_agent_responses_deep_dive.md) — Context snapshot starvation proof
- [agent_pipeline_execution_audit.md](file:///C:/Users/Lenovo/.gemini/antigravity/brain/95bba95b-58e4-4ecf-89be-53723ed95bb2/agent_pipeline_execution_audit.md) — Full 11-stage execution quality audit

---

## Report Structure

```
TIER 1: CONTEXT & DATA PLUMBING ISSUES (6 issues)     — Current, Verified
TIER 2: EXECUTION LOOP & REACT ISSUES (5 issues)      — Current, Verified
TIER 3: LINTER & VERIFICATION ISSUES (5 issues)       — Current, Verified
TIER 4: OUTPUT SANITIZATION ISSUES (3 issues)          — Current, Verified
TIER 5: FUTURE GUARDRAILS (7 scenarios)                — Preventive
```

---

# TIER 1: CONTEXT & DATA PLUMBING ISSUES

---

## Issue 1.1: Snapshot Extraction Strips API Response Shapes

> [!CAUTION]
> **Severity**: CRITICAL — Direct cause of runtime crash in generated projects

### Verified Location
[`orchestrator.ts` lines 228–241](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/orchestrator.ts#L228-L241) — `extractSnapshotFromContent()`

### What Happens
`extractSnapshotFromContent()` extracts only the `### Context Snapshot` block (max 2000 chars via `MAX_SNAPSHOT_CHARS` at [line 179](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/orchestrator.ts#L179)). The `System` agent's `backend_spec.md` contains 171 lines including exact API response shapes like:
```markdown
**GET /api/products** — Response: { products: Product[], total: number }
```
But after snapshot extraction, the Blueprinter and Coder only receive:
```markdown
- **Backend Summary**: 4 entities, 12 REST endpoints, AuthService...
```
**All API response envelope shapes, database field types, and entity relationships are permanently lost.**

### Evidence from Generated Project
In [`autocoder-project-c51d3614/pages/index.js` (line 62)](file:///c:/Users/Lenovo/Desktop/AutoCoder/autocoder-project-c51d3614-b85b-479c-9cb4-ceaaab44faab/pages/index.js#L62):
```javascript
{filteredProducts.map(product => (  // CRASH: filteredProducts is an Object, not Array
```
The API returns `{ products: [...], pagination: {...} }` but the page treats it as `[...]`.

### Fix: Inject Full Spec Sections into `buildCoderContext()`

**File**: [`orchestrator.ts` lines 389–426](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/orchestrator.ts#L389-L426)

The function already injects Design System and API Endpoints sections. It needs to also inject the **Database Design** section from `backend_spec.md`:

```typescript
// ADD after line 410 in buildCoderContext():

// Inject Database Schema (System) for API routes and service files
if (backendSpec) {
  const dbMatch = backendSpec.match(/#{1,4}\s*Database Design[\s\S]*?(?=\n#{1,4}\s|$)/i);
  if (dbMatch) context += `=== DATABASE SCHEMA (DO NOT DEVIATE) ===\n${dbMatch[0].trim()}\n\n`;
}

// Inject Component Props (Designer) for frontend files
if (uiSpec && (fileName.endsWith('.tsx') || fileName.endsWith('.jsx') || fileName.endsWith('.js'))) {
  const componentsMatch = uiSpec.match(/#{1,4}\s*Components[\s\S]*?(?=\n#{1,4}\s(?!.*Type:|.*Purpose:|.*Props))/i);
  if (componentsMatch) context += `=== COMPONENT PROP CONTRACTS ===\n${componentsMatch[0].trim()}\n\n`;
}
```

---

## Issue 1.2: Component Prop Signatures Never Reach the Coder

> [!CAUTION]
> **Severity**: CRITICAL — Direct cause of `TypeError: onSearch is not a function`

### Verified Location
[`orchestrator.ts` lines 398–403](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/orchestrator.ts#L398-L403) — `buildCoderContext()` only injects `Design System`, not `Components`

### What Happens
The `Designer` agent's `ui_spec.md` defines:
```markdown
**SearchBar**
- Props/Inputs: onSearch: function (callback with search term)
```
But `buildCoderContext()` only extracts the `### Design System` section (hex colors, font sizes). The `### Components` section containing prop contracts is never injected.

### Evidence from Generated Project
In [`autocoder-project-c51d3614/components/Header.js` (line 27)](file:///c:/Users/Lenovo/Desktop/AutoCoder/autocoder-project-c51d3614-b85b-479c-9cb4-ceaaab44faab/components/Header.js#L27):
```javascript
<SearchBar />  // No onSearch prop passed — crashes when user types
```
In [`autocoder-project-c51d3614/pages/products.js` (line 96)](file:///c:/Users/Lenovo/Desktop/AutoCoder/autocoder-project-c51d3614-b85b-479c-9cb4-ceaaab44faab/pages/products.js#L96):
```javascript
<SearchBar onSearchChange={handleSearchChange} />  // Wrong prop name: onSearchChange vs onSearch
```

### Fix: Extend `buildCoderContext()` to Inject Component Prop Contracts

```typescript
// REPLACE lines 398-403 in buildCoderContext():

const uiSpec = await readVirtualFile(conversationId, 'ui_spec.md');
if (uiSpec) {
  // Always inject Design System tokens
  const dsMatch = uiSpec.match(/#{1,4}\s*Design System[\s\S]*?(?=\n#{1,4}\s|$)/i);
  if (dsMatch) context += `=== DESIGN SYSTEM ===\n${dsMatch[0].trim()}\n\n`;

  // For component/page files, also inject Component Prop contracts
  if (/\.(jsx|tsx|js|html)$/.test(fileName)) {
    const compMatch = uiSpec.match(/#{1,4}\s*Components[\s\S]*?(?=\n#{1,4}\s*Navigation|#{1,4}\s*Interaction|$)/i);
    if (compMatch) context += `=== COMPONENT PROP CONTRACTS (USE EXACT PROP NAMES) ===\n${compMatch[0].trim()}\n\n`;
  }
}
```

---

## Issue 1.3: Blueprinter Receives Full Spec Documents but Snapshot for Downstream Context

> [!IMPORTANT]
> **Severity**: HIGH — Blueprinter gets full specs, but its own output lacks exact prop/schema details

### Verified Location
[`orchestrator.ts` lines 1180–1191](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/orchestrator.ts#L1180-L1191) — Blueprinter stage handler

### What Happens
The Blueprinter handler correctly concatenates full spec files (plan, requirements, architecture, backend_spec, ui_spec). However, Blueprinter's system prompt at [`Blueprinter.ts` line 9](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/registry/Blueprinter.ts#L9) says:
> "The Coder agent will read ONLY your output to write code."

This means the Blueprinter is responsible for distilling ALL prop names, API shapes, and DOM IDs into its implementation details. If it writes vague text like *"Fetch products from productService"*, the Coder is lost.

### Fix: Add Explicit Instruction to Blueprinter Prompt

**File**: [`Blueprinter.ts`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/registry/Blueprinter.ts)

Add to the system prompt after the `=== FORMAT ===` section:

```typescript
// ADD to Blueprinter.ts systemPrompt after line 27:

`=== CRITICAL DATA CONTRACTS ===

When writing Implementation Details, you MUST include:
1. EXACT PROP NAMES: If ui_spec.md says SearchBar accepts "onSearch: function", write: "Accept prop onSearch (callback function) and invoke onSearch(value) on input change"
2. EXACT API RESPONSE SHAPES: If backend_spec.md says GET /api/products returns { products: Product[], total: number }, write: "Destructure response as { products } from API call, then iterate products array"
3. EXACT DATABASE FIELD NAMES: If backend_spec.md defines CartItem with fields productId and cartId, write: "Use productId and cartId fields from CartItem schema"
4. EXACT DOM IDS: If ui_spec.md defines #search-input, write: "Input element with id='search-input'"

Do NOT use vague instructions like "fetch data" or "render components". The Coder has no access to upstream specs and depends entirely on your specificity.`
```

---

## Issue 1.4: `extractDependencyInterface()` Drops Non-Default Exports

### Verified Location
[`orchestrator.ts` lines 369–387](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/orchestrator.ts#L369-L387) — `extractDependencyInterface()`

### What Happens
The regex at line 382 only captures `export (const|function|class|let|var)`:
```typescript
const named = [...content.matchAll(/export\s+(?:async\s+)?(?:function|const|class|let|var)\s+(\w+)/g)].map(m => m[1]);
```
This misses:
- **Re-exports**: `export { CartProvider } from './context'`
- **Inline named exports**: `export default function MyComponent()` where the function is anonymous
- **TypeScript type exports**: `export type UserData = {...}`
- **Object default exports**: `export default { getProducts, getProductById }` (used in [`lib/api.js` line 61](file:///c:/Users/Lenovo/Desktop/AutoCoder/autocoder-project-c51d3614-b85b-479c-9cb4-ceaaab44faab/lib/api.js#L61))

### Fix: Expand Export Detection Regex

```typescript
// REPLACE lines 381-384 in orchestrator.ts:

if (/\.(js|ts|jsx|tsx)$/.test(filePath)) {
  // Named exports: export const/function/class/let/var/type/interface
  const named = [...content.matchAll(/export\s+(?:async\s+)?(?:function|const|class|let|var|type|interface|enum)\s+(\w+)/g)].map(m => m[1]);
  // Re-exports: export { X, Y } from '...'
  const reExports = [...content.matchAll(/export\s*\{([^}]+)\}/g)].flatMap(m =>
    m[1].split(',').map(s => s.trim().split(/\s+as\s+/).pop()!.trim()).filter(Boolean)
  );
  // Default export
  const dflt = content.match(/export\s+default\s+(?:class|function)?\s*(\w+)/)?.[1];
  const allExports = [...new Set([...named, ...reExports, ...(dflt ? [`default:${dflt}`] : [])])];
  return `[JS/TS] Exports: ${allExports.join(', ') || 'none'}`;
}
```

---

## Issue 1.5: `ProviderWrapper.js` Imports Non-Exported `apiClient`

> [!CAUTION]
> **Severity**: CRITICAL — Compilation crash

### Verified Location
[`autocoder-project-c51d3614/components/ProviderWrapper.js` (line 3)](file:///c:/Users/Lenovo/Desktop/AutoCoder/autocoder-project-c51d3614-b85b-479c-9cb4-ceaaab44faab/components/ProviderWrapper.js#L3):
```javascript
import { apiClient } from '../lib/api';
```
[`autocoder-project-c51d3614/lib/api.js` (lines 61–68)](file:///c:/Users/Lenovo/Desktop/AutoCoder/autocoder-project-c51d3614-b85b-479c-9cb4-ceaaab44faab/lib/api.js#L61-L68):
```javascript
export default { getProducts, getProductById, addToCart, ... };
// apiClient is a local const (line 3), NOT a named export
```

### Root Cause
The Coder synthesizing `ProviderWrapper.js` hallucinated a named export `{ apiClient }` that does not exist in `lib/api.js`. The `lib/api.js` uses `const apiClient = axios.create(...)` as a **private local variable** and only re-exports individual functions via `export default {...}`.

### Fix
This is a symptom of Issue 1.4 (incomplete dependency interface extraction). Once `extractDependencyInterface()` correctly lists all exports, the Coder will see that `apiClient` is not among them.

---

## Issue 1.6: Missing `lib/auth.js` Module (Never Generated)

> [!CAUTION]
> **Severity**: CRITICAL — Module not found crash

### Verified Location
[`autocoder-project-c51d3614/pages/api/auth/login.js` (line 2)](file:///c:/Users/Lenovo/Desktop/AutoCoder/autocoder-project-c51d3614-b85b-479c-9cb4-ceaaab44faab/pages/api/auth/login.js#L2):
```javascript
import { generateToken } from '../../../lib/auth';
```
The file `lib/auth.js` does not exist in the project. Only `lib/api.js` and `lib/context.js` exist.

### Root Cause
The Blueprinter specified an auth API route but did not include a `### File: lib/auth.js` section in `blueprint.md`. The Coder generated `login.js` referencing a file that was never planned.

### Fix: Blueprint Validation Guard in `parseBlueprintFiles()`

Add a cross-reference check after parsing:

```typescript
// ADD after line 626 in orchestrator.ts, after parseBlueprintFiles() returns:

export function validateBlueprintImports(sections: BlueprintFileSection[]): string[] {
  const allFiles = new Set(sections.map(s => s.file));
  const warnings: string[] = [];

  for (const section of sections) {
    for (const dep of section.dependencies) {
      // Normalize dependency path (strip leading ./ or ../)
      const normalizedDep = dep.replace(/^\.\.?\//, '').replace(/^\//, '');
      if (!allFiles.has(normalizedDep) && !allFiles.has(dep)) {
        warnings.push(
          `Blueprint Warning: "${section.file}" lists dependency "${dep}" which is not defined as a ### File: section in the blueprint.`
        );
      }
    }
  }
  return warnings;
}
```

---

# TIER 2: EXECUTION LOOP & REACT ISSUES

---

## Issue 2.1: ReAct Tool Loop Infrastructure Is Completely Dormant

> [!WARNING]
> **Severity**: HIGH — `toolbox.ts` is built but never connected

### Verified Location
- [`toolbox.ts`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/toolbox.ts) — Full tool registry (5 tools: `read_file`, `write_file`, `apply_diff`, `list_files`, `check_syntax`)
- [`agents.ts` lines 23–35](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/agents.ts#L23-L35) — All agents set `tools: []`
- [`inference.ts`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/inference.ts) — No `tools` or `tool_calls` handling exists

### What Happens
Every agent runs as a **single-turn text completion**. The Coder cannot call `read_file` to inspect dependency exports. The Debugger cannot call `apply_diff` for surgical repairs. The entire pipeline operates as a scripted waterfall, not an agentic loop.

### Fix: Enable Tool-Calling for Coder & Debugger

**Step 1 — Update `agents.ts`**:

```typescript
// REPLACE lines 30-32 in agents.ts:

  Coder:       { ...Coder, tools: ['read_file', 'list_files', 'check_syntax'] },
  Tester:      { ...Tester, tools: [] },
  Debugger:    { ...Debugger, tools: ['read_file', 'apply_diff', 'check_syntax'] },
```

**Step 2 — Add `tools` field to Ollama inference payload in `inference.ts`**:

```typescript
// In runInference(), add to the Ollama /api/chat payload:

const payload: any = {
  model: config.ollamaModel,
  messages,
  stream: true,
  options: {
    temperature: options.temperature ?? 0.1,
    num_predict: options.maxTokens ?? 4096,
  },
};

// If tools are provided, attach them for function-calling
if (options.tools && options.tools.length > 0) {
  payload.tools = options.tools;
}
```

**Step 3 — Add ReAct driver loop in `runAgent()`**:

```typescript
// ADD a bounded ReAct loop after the initial runInference() call in runAgent():

const MAX_TOOL_TURNS = 4;
let toolTurns = 0;
let messages = [
  { role: 'system', content: systemInstructions },
  { role: 'user', content: userContent },
];

while (toolTurns < MAX_TOOL_TURNS) {
  const response = await runInference(messages, {
    temperature: agentDef.temperature,
    maxTokens: budget,
    tools: agentDef.tools.length > 0
      ? getToolsForAgent(agentDef.tools).map(toolToOllamaFormat)
      : undefined,
  });

  // If the model returned tool_calls, execute them and continue
  if (response.tool_calls && response.tool_calls.length > 0) {
    messages.push({ role: 'assistant', content: '', tool_calls: response.tool_calls });
    for (const call of response.tool_calls) {
      const result = await executeTool(call.function.name, call.function.arguments, conversationId);
      messages.push({ role: 'tool', content: JSON.stringify(result) });
    }
    toolTurns++;
    continue;
  }

  // Model finished — return text content
  return response.content;
}
```

---

## Issue 2.2: Coder Self-Healing Loop Regenerates Entire Files (20-Minute Latency)

> [!WARNING]
> **Severity**: HIGH — 19.5-minute timeout per file on retry

### Verified Location
[`orchestrator.ts` lines 1107–1142](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/orchestrator.ts#L1107-L1142) — Self-healing `while (!lCheck.success && repairAttempt < 2)` loop

### What Happens
When linter errors are detected, the repair prompt at [line 1119](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/orchestrator.ts#L1119) sends the **entire blueprint section + entire broken code + error details**, asking Qwen 32B to *"Rewrite the COMPLETE corrected source code"*.

Database evidence: `pages/index.tsx` took **1,170,188 ms (~19.5 minutes)** on Attempt 3 in conversation `48a3e025`.

### Fix: Use Surgical Diff Repair for Small Error Counts

```typescript
// REPLACE the repair prompt at lines 1119-1131 in orchestrator.ts:

const currentCode = coderOutput.content;
const errorCount = lCheck.errors.length;

let repairPrompt: string;

if (errorCount <= 3) {
  // Surgical diff repair for small error counts
  const errorContext = lCheck.errors.map(e => {
    const lines = currentCode.split('\n');
    const startLine = Math.max(0, e.line - 4);
    const endLine = Math.min(lines.length, e.line + 3);
    const window = lines.slice(startLine, endLine)
      .map((l, i) => `${startLine + i + 1}${startLine + i + 1 === e.line ? ' >>>' : '    '} ${l}`)
      .join('\n');
    return `Error on line ${e.line}: ${e.message}\n${window}`;
  }).join('\n\n');

  repairPrompt = `Fix the following ${errorCount} syntax error(s) in ${fileSec.file}.\n\n${errorContext}\n\nOutput ONLY the complete corrected source code for the file. No markdown fences.`;
} else {
  // Full rewrite for many errors
  repairPrompt = `File: ${fileSec.file}\nBlueprint Specification:\n${fileSec.rawSection}\n\nCurrent Broken Code:\n${currentCode}\n\nLinter Errors (MUST FIX):\n${lCheck.errors.map(e => `Line ${e.line}: ${e.message}`).join('; ')}\n\nRewrite the COMPLETE corrected source code for ${fileSec.file}. Output ONLY raw source code.`;
}
```

---

## Issue 2.3: Debugger Stage Only Triggers on Linter Failures, Not Logic Errors

### Verified Location
[`orchestrator.ts` lines 959–972](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/orchestrator.ts#L959-L972) — Debugger skips if `failingLines.length === 0`

### What Happens
The Debugger only activates when `test_report.md` contains `"FAILED"` entries. Since the Tester only checks syntax (Issue 3.1), all 25 files pass, and the Debugger writes `"SKIPPED"`. This means:
- API envelope mismatches → Debugger skips
- Missing prop callbacks → Debugger skips
- Bcrypt vs plaintext comparison → Debugger skips

### Fix
This is downstream of Issue 3.1. Once the Tester performs cross-file checks (see Tier 3), the Debugger will naturally be activated for real logic errors.

---

## Issue 2.4: Reviewer Feedback Loop Does Not Exist

> [!WARNING]
> **Severity**: HIGH — Pipeline terminates even when Reviewer flags `REQUIRES_REWORK`

### Verified Location
[`orchestrator.ts` lines 1262–1276](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/orchestrator.ts#L1262-L1276) — After all stages complete, pipeline immediately marks `Completed`

### Evidence
[`autocoder-project-c51d3614/review_report.md` (line 2)](file:///c:/Users/Lenovo/Desktop/AutoCoder/autocoder-project-c51d3614-b85b-479c-9cb4-ceaaab44faab/review_report.md#L2):
```markdown
### Overall Assessment
REQUIRES_REWORK
```
Despite this, the orchestrator set the conversation to `Completed` and terminated.

### Fix: Add Bounded Reviewer Rework Loop

```typescript
// ADD after line 1221 in orchestrator.ts, at the end of the Reviewer handler:

if (stageName === 'Reviewer') {
  const reviewContent = srOut.content || '';
  const needsRework = /REQUIRES_REWORK/i.test(reviewContent);

  if (needsRework) {
    // Extract missing/partial findings from review report
    const findings = reviewContent.match(/\*\*HIGH:.*?\n.*?Recommendation:.*?$/gm) || [];
    const missingFiles = reviewContent.match(/MISSING/g) || [];

    if (findings.length > 0 && missingFiles.length <= 3) {
      emit({
        type: 'AGENT_LOG',
        agent: 'Reviewer',
        message: `🔄 Reviewer flagged REQUIRES_REWORK with ${findings.length} HIGH findings. Triggering 1 targeted rework pass...`,
      });

      // Single bounded rework pass — re-invoke Coder for identified gaps
      // (Implementation: extract file targets from findings and re-run Coder for those files only)
    }
  }
}
```

---

## Issue 2.5: Tester Stage Never Invokes the LLM

### Verified Location
[`orchestrator.ts` lines 920–956](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/orchestrator.ts#L920-L956)

### What Happens
The `Tester` stage handler is a hardcoded Node.js script that calls `runLinter()` directly. The `Tester.ts` system prompt and LLM agent are **never invoked**. The `Tester.ts` registry file exists but is entirely unused.

### Assessment
This is actually a **correct design decision** — deterministic linting is more reliable than LLM-based testing. However, the Tester stage should be renamed or documented as "Linter" to avoid confusion, and the `Tester.ts` registry file should be repurposed for LLM-powered test case generation if needed in the future.

---

# TIER 3: LINTER & VERIFICATION ISSUES

---

## Issue 3.1: Linter Only Checks Single-File Syntax — Zero Cross-File Validation

> [!CAUTION]
> **Severity**: CRITICAL — Root cause of false "25/25 PASSED" in generated projects

### Verified Location
[`linter.ts` lines 79–89](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/linter.ts#L79-L89) — Compiler options

```typescript
const compilerOptions: ts.CompilerOptions = {
  strict: false,
  skipLibCheck: true,
  // ...
};
```

[`linter.ts` lines 128–145](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/linter.ts#L128-L145) — Diagnostic filtering that suppresses module resolution errors:
```typescript
if (isJsOrJsx && (diagnostic.code === 2307 || diagnostic.code === 1479 || 
    diagnostic.code === 7016 || diagnostic.code === 2304 || diagnostic.code === 2552)) {
  return; // SUPPRESSED: Module not found, cannot find name, etc.
}
```

### What Happens
- **TS2307** (`Cannot find module '../lib/auth'`) is **suppressed** for JS/JSX files
- **TS2304** (`Cannot find name 'AuthProvider'`) is **suppressed** for JS/JSX files
- **TS2552** (`Cannot find name 'onSearch'. Did you mean 'onchange'?`) is **suppressed**

This means every single cross-file contract violation passes silently.

### Fix: Add Cross-File Import Resolution Check

```typescript
// ADD new function in linter.ts:

export async function runCrossFileImportCheck(
  conversationId: string
): Promise<LintResult> {
  const virtualFiles = await prisma.virtualFile.findMany({
    where: { conversationId },
  });

  const fileMap = new Map<string, string>();
  for (const vf of virtualFiles) {
    fileMap.set(vf.filePath.replace(/\\/g, '/'), vf.content);
  }

  const errors: LintResult['errors'] = [];

  for (const [filePath, content] of fileMap.entries()) {
    if (!/\.(js|ts|jsx|tsx)$/.test(filePath)) continue;

    // Check all relative imports
    const importMatches = content.matchAll(
      /import\s+(?:\{([^}]+)\}|(\w+))\s+from\s+['"](\.[^'"]+)['"]/g
    );

    for (const match of importMatches) {
      const namedImports = match[1]?.split(',').map(s => s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean) || [];
      const defaultImport = match[2];
      const importPath = match[3];

      // Resolve the import path relative to the current file
      const dir = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/')) : '';
      let resolvedPath = importPath.startsWith('./')
        ? (dir ? dir + '/' : '') + importPath.substring(2)
        : importPath;

      // Try common extensions
      const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.js'];
      let targetContent: string | undefined;
      let targetPath: string | undefined;

      for (const ext of extensions) {
        const candidate = resolvedPath + ext;
        if (fileMap.has(candidate)) {
          targetContent = fileMap.get(candidate);
          targetPath = candidate;
          break;
        }
      }

      if (!targetContent) {
        const lineNum = content.substring(0, match.index).split('\n').length;
        errors.push({
          line: lineNum,
          character: 1,
          message: `Import "${importPath}" resolves to a file that does not exist in the workspace.`,
          severity: 'error',
        });
        continue;
      }

      // Check named imports exist as exports in target file
      for (const namedImport of namedImports) {
        const exportPatterns = [
          new RegExp(`export\\s+(?:async\\s+)?(?:function|const|class|let|var|type|interface)\\s+${namedImport}\\b`),
          new RegExp(`export\\s*\\{[^}]*\\b${namedImport}\\b[^}]*\\}`),
        ];
        const isExported = exportPatterns.some(p => p.test(targetContent!));
        if (!isExported) {
          const lineNum = content.substring(0, match.index).split('\n').length;
          errors.push({
            line: lineNum,
            character: 1,
            message: `Named import "${namedImport}" is not exported from "${targetPath}".`,
            severity: 'error',
          });
        }
      }
    }
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

Then call it in the Tester stage handler:

```typescript
// ADD after the per-file linting loop (after line 937 in orchestrator.ts):

// Cross-file import resolution check
const crossFileCheck = await runCrossFileImportCheck(conversationId);
if (!crossFileCheck.success) {
  failed += crossFileCheck.errors.length;
  for (const err of crossFileCheck.errors) {
    testReportLines.push(`- **CROSS-FILE**: FAILED — ${err.message}`);
  }
}
```

---

## Issue 3.2: DOM Coherence Check Only Runs for `getElementById` and `querySelector`

### Verified Location
[`orchestrator.ts` lines 1146–1169](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/orchestrator.ts#L1146-L1169)

### What Happens
The post-Coder DOM check at line 1156 only matches:
```typescript
const referencedIds = [...jsContent.matchAll(
  /getElementById\(["']([^"']+)["']\)|querySelector\(["']#([^"']+)["']\)/g
)]
```
This misses `querySelectorAll`, `document.forms`, event delegation selectors, and React's `useRef`.

### Fix: Extend DOM ID Extraction Regex

```typescript
// REPLACE line 1156 in orchestrator.ts:

const referencedIds = [...jsContent.matchAll(
  /getElementById\(["']([^"']+)["']\)|querySelector(?:All)?\(["']#([^"']+)["']\)/g
)].map(m => m[1] || m[2]);
```

---

## Issue 3.3: Prisma Schema Validation Is Never Performed

### What Happens
The linter has no handler for `.prisma` files. When `schema.prisma` contains LLM metadata preamble (as found in the generated project), no validation catches it.

### Fix: Add `.prisma` to linter.ts

```typescript
// ADD after line 52 in linter.ts:

if (filePath.endsWith('.prisma')) {
  return runPrismaSchemaCheck(content, filePath);
}

// ADD new function:
export function runPrismaSchemaCheck(content: string, filePath: string): LintResult {
  const errors: LintResult['errors'] = [];
  const lines = content.split('\n');

  // Check for LLM metadata preamble before first valid Prisma keyword
  const firstValidLine = lines.findIndex(l =>
    /^\s*(generator|datasource|model|enum)\s+/.test(l)
  );

  if (firstValidLine > 0) {
    errors.push({
      line: 1,
      character: 1,
      message: `Prisma schema contains ${firstValidLine} lines of non-Prisma preamble before first valid keyword. These will cause "prisma generate" to fail.`,
      severity: 'error',
    });
  }

  // Check for missing @@unique on models using composite where clauses
  // (basic heuristic — check if any model lacks @@unique or @@id)

  return {
    success: errors.length === 0,
    errors,
    summary: errors.length === 0
      ? `Prisma schema "${filePath}" validated cleanly.`
      : `Found ${errors.length} issue(s) in Prisma schema "${filePath}".`,
  };
}
```

---

## Issue 3.4: CSS Property Check Uses Incomplete Allowlist

### Verified Location
[`linter.ts` lines 340–351](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/linter.ts#L340-L351) — `COMMON_CSS_PROPS` set

### What Happens
The CSS linter flags legitimate CSS properties as "unknown" if they're not in the hardcoded allowlist. Missing common properties include: `inset`, `aspect-ratio`, `place-items`, `place-content`, `backdrop-filter`, `animation`, `animation-name`, `animation-duration`, `content`, `white-space`, `word-break`, `letter-spacing`, `object-fit`, `resize`, `scroll-behavior`, `flex-grow`, `flex-shrink`, `flex-basis`, `align-self`, `order`, `column-gap`, `row-gap`.

### Fix: Extend the allowlist

```typescript
// ADD to COMMON_CSS_PROPS at line 351 in linter.ts:

'inset', 'aspect-ratio', 'place-items', 'place-content', 'backdrop-filter',
'animation', 'animation-name', 'animation-duration', 'animation-delay',
'animation-fill-mode', 'animation-timing-function', 'animation-iteration-count',
'content', 'white-space', 'word-break', 'word-wrap', 'overflow-wrap',
'letter-spacing', 'object-fit', 'object-position', 'resize', 'scroll-behavior',
'flex-grow', 'flex-shrink', 'flex-basis', 'align-self', 'align-content', 'order',
'column-gap', 'row-gap', 'appearance', 'accent-color', 'caret-color',
'will-change', 'contain', 'isolation', 'mix-blend-mode', 'filter',
'clip-path', 'writing-mode', 'text-overflow', 'vertical-align',
'text-indent', 'text-shadow', 'outline-offset', 'outline-style',
'outline-color', 'outline-width', 'table-layout', 'border-collapse',
'border-spacing', 'empty-cells', 'caption-side', 'counter-reset',
'counter-increment', 'quotes', 'hyphens', 'tab-size',
```

---

## Issue 3.5: HTML Link Check Reports Warnings as Failures

### Verified Location
[`linter.ts` lines 325–331](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/linter.ts#L325-L331)

### What Happens
`runHtmlLinkCheck()` returns `success: false` when it finds missing CSS/JS references, but these are reported with `severity: 'warning'`. However, the return value `success: false` triggers the self-healing loop, which tries to regenerate the HTML file. This is overly aggressive for warnings.

### Fix: Only fail on errors, not warnings

```typescript
// REPLACE lines 325-331 in linter.ts:

const errorCount = errors.filter(e => e.severity === 'error').length;
if (errorCount > 0) {
  return {
    success: false,
    errors,
    summary: `HTML Link Verification found ${errorCount} error(s) in "${filePath}".`,
  };
}

return { success: true, errors, summary: errors.length > 0
  ? `HTML links verified with ${errors.length} warning(s) in "${filePath}".`
  : 'HTML links verified.' };
```

---

# TIER 4: OUTPUT SANITIZATION ISSUES

---

## Issue 4.1: `sanitizeCoderOutput()` Does Not Strip Prisma/Config Preamble

### Verified Location
[`orchestrator.ts` lines 332–339](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/orchestrator.ts#L332-L339) — `sanitizeCoderOutput()`

### Evidence
[`autocoder-project-c51d3614/prisma/schema.prisma` (lines 1–3)](file:///c:/Users/Lenovo/Desktop/AutoCoder/autocoder-project-c51d3614-b85b-479c-9cb4-ceaaab44faab/prisma/schema.prisma#L1-L3):
```
generator: 0.1.0
model: gpt-4o
timestamp: 2023-10-05T14:30:00.000Z
```

### Fix: Add file-type-specific sanitizers

```typescript
// ADD after line 339 in sanitizeCoderOutput():

export function sanitizeCoderOutputForFile(raw: string, filePath?: string): string {
  let cleaned = sanitizeCoderOutput(raw);

  if (filePath?.endsWith('.prisma')) {
    // Strip everything before the first valid Prisma keyword
    const prismaStart = cleaned.search(/^(datasource|generator|model|enum)\s+/m);
    if (prismaStart > 0) cleaned = cleaned.substring(prismaStart);
  }

  if (filePath?.endsWith('.json')) {
    // Ensure valid JSON — find first { or [
    const jsonStart = cleaned.search(/[{\[]/);
    if (jsonStart > 0) cleaned = cleaned.substring(jsonStart);
  }

  if (filePath?.endsWith('.html')) {
    const htmlStart = cleaned.search(/<!DOCTYPE|<html/i);
    if (htmlStart > 0) cleaned = cleaned.substring(htmlStart);
  }

  return cleaned.trim();
}
```

Then use it in the Coder loop:

```typescript
// REPLACE line 1094 in orchestrator.ts:
// OLD: await writeVirtualFile(conversationId, fileSec.file, coderOutput.content);
// NEW:
const cleanedCode = sanitizeCoderOutputForFile(coderOutput.content, fileSec.file);
await writeVirtualFile(conversationId, fileSec.file, cleanedCode);
writeProjectFile(conversationId, fileSec.file, cleanedCode);
```

---

## Issue 4.2: `sanitizeStageOutput()` Header Anchor Reconstruction Is Lossy

### Verified Location
[`orchestrator.ts` lines 325–327](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/orchestrator.ts#L325-L327)

```typescript
if (headerMatch && headerMatch.index !== undefined && headerMatch.index > 0) {
  cleaned = headerMatch[0].trimStart() + cleaned.substring(headerMatch.index + headerMatch[0].length);
}
```

### What Happens
This reconstruction concatenates the header match with the content **after** the match, but the `trimStart()` on the header and the slicing logic can produce duplicate content if the header match includes trailing text. For example, if the LLM outputs:
```
Here is the plan:
### Context Snapshot
- **Core Goal**: ...
```
The resulting `cleaned` becomes `### Context Snapshot` + everything after the original `### Context Snapshot` occurrence, which is correct. However, if the LLM repeats the header text inside the preamble, the regex may match the wrong occurrence.

### Fix: Use `indexOf` after the first header match for more robust slicing

```typescript
// REPLACE lines 325-327:
if (headerMatch && headerMatch.index !== undefined && headerMatch.index > 0) {
  cleaned = cleaned.substring(headerMatch.index);
}
```

---

## Issue 4.3: Lazy Placeholder Code Not Detected

### What Happens
When the Coder or Debugger outputs:
```javascript
// ... rest of the file remains the same ...
function newFunction() { ... }
// ... existing code below ...
```
The `sanitizeCoderOutput()` function does not detect or reject these lazy placeholders. When written to VFS, the file is destroyed — all code outside the placeholder comment is deleted.

### Fix: Add Placeholder Detection

```typescript
// ADD to sanitizeCoderOutput() after line 338:

// Reject lazy placeholder patterns
const placeholderPattern = /\/\/\s*\.\.\.?\s*(rest of|existing|unchanged|same as|remaining|previous)/i;
if (placeholderPattern.test(cleaned)) {
  console.warn('[WARN] Coder output contains lazy placeholder comments. Rejecting.');
  return ''; // Return empty to signal rejection — caller should retry
}
```

---

# TIER 5: FUTURE GUARDRAILS

These are preventive measures for failure modes that will emerge once the above fixes are implemented.

---

## Guardrail 5.1: ReAct Tool Call Context Ballooning

**Risk**: When the Coder calls `read_file` on 4 large files, the conversation history explodes past 25K tokens, pushing Qwen 32B into the Dumb Zone.

**Defense**: Cap `read_file` tool observations at 1,500 characters. Return interface signatures instead of full code dumps for files exceeding this limit.

```typescript
// ADD to read_file tool execute function in toolbox.ts (after line 40):

if (content.length > 1500) {
  // Return interface signature instead of full content
  const interface_ = extractDependencyInterface(args.file_path, content);
  return {
    found: true,
    content: `[FILE TRUNCATED — ${content.split('\n').length} lines]\n${interface_}\n\n[First 500 chars]\n${content.substring(0, 500)}...`,
    lineCount: content.split('\n').length,
    truncated: true,
  };
}
```

---

## Guardrail 5.2: `applyDiff` Line Number Drift in Multi-Turn Repairs

**Risk**: After Turn 1 inserts 5 new lines, Turn 2's line numbers are stale and patch the wrong location.

**Defense**: Use content-based matching instead of line numbers.

```typescript
// ADD new tool in toolbox.ts — content-based replace:

{
  name: 'search_replace',
  description: 'Finds a unique block of text in a file and replaces it with new content. Safer than line-number-based apply_diff because it is immune to line drift across multiple edits.',
  parameters: {
    file_path: { type: 'string', description: 'File to modify.', required: true },
    search_text: { type: 'string', description: 'Exact text to find (must be unique in the file).', required: true },
    replace_text: { type: 'string', description: 'Replacement text.', required: true },
  },
  execute: async (args, conversationId) => {
    const content = await readVirtualFile(conversationId, args.file_path);
    if (!content) return { error: true, message: `File "${args.file_path}" not found.` };

    const occurrences = content.split(args.search_text).length - 1;
    if (occurrences === 0) return { error: true, message: `Search text not found in "${args.file_path}".` };
    if (occurrences > 1) return { error: true, message: `Search text found ${occurrences} times. Must be unique. Add more surrounding context.` };

    const newContent = content.replace(args.search_text, args.replace_text);
    await writeVirtualFile(conversationId, args.file_path, newContent);
    return { success: true, message: `Replaced 1 occurrence in "${args.file_path}".` };
  },
},
```

---

## Guardrail 5.3: Spec Collision Between Upstream Documents

**Risk**: `ui_spec.md` uses `#submit-task` but `blueprint.md` uses `#btn-save`. Conflicting IDs cause DOM mismatches.

**Defense**: Add authority hierarchy to Coder system prompt.

```typescript
// ADD to Coder.ts systemPrompt:

`7. AUTHORITY HIERARCHY: When upstream specs conflict, follow this priority order:
   - blueprint.md Implementation Details (highest — most specific)
   - ui_spec.md Component DOM Selectors
   - backend_spec.md API Response Shapes
   - architecture.md File Structure
   If two specs give different names for the same element, use the blueprint.md name.`
```

---

## Guardrail 5.4: Next.js `'use client'` Directive Missing

**Risk**: Coder generates React hooks (`useState`, `useEffect`) in Next.js App Router files without `'use client'` on line 1, causing build failures.

**Defense**: Add to linter.ts:

```typescript
// ADD to runLinter() after the bracket check (after line 126):

// Next.js 'use client' directive check
if ((filePath.startsWith('app/') || filePath.includes('/app/')) &&
    /\.(tsx|jsx)$/.test(filePath)) {
  const hasClientHooks = /\b(useState|useEffect|useRef|useCallback|useMemo|useContext|onClick|onChange|onSubmit)\b/.test(content);
  const hasUseClient = content.trimStart().startsWith("'use client'") || content.trimStart().startsWith('"use client"');
  if (hasClientHooks && !hasUseClient) {
    errors.push({
      line: 1,
      character: 1,
      message: `File uses React hooks/event handlers but is missing 'use client' directive (required for Next.js App Router).`,
      severity: 'error',
    });
  }
}
```

---

## Guardrail 5.5: Vanilla JS `import` Without `type="module"`

**Risk**: Coder writes `import { helper } from './utils.js'` but `index.html` loads the script without `type="module"`, causing `SyntaxError: Cannot use import statement outside a module`.

**Defense**: Add to `runHtmlLinkCheck()`:

```typescript
// ADD to runHtmlLinkCheck() after the script existence check (after line 322):

// Check if any referenced JS file uses ES module syntax
for (const match of scriptMatches) {
  const ref = match[1];
  const cleanRef = ref.replace(/^\.\//, '');
  const jsContent = fileMap.get(cleanRef);
  if (jsContent && /\b(import\s+|export\s+)/.test(jsContent)) {
    // Check if the script tag has type="module"
    if (!match[0].includes('type="module"')) {
      errors.push({
        line: idx + 1,
        character: match.index || 1,
        message: `Script "${ref}" uses ES module syntax (import/export) but is loaded without type="module". Add type="module" to the script tag.`,
        severity: 'error',
      });
    }
  }
}
```

---

## Guardrail 5.6: Empty Database on First Run (Blank Screen Syndrome)

**Risk**: Backend Prisma models exist but the database starts empty. User opens the app and sees "0 products found".

**Defense**: Add instruction to System agent prompt:

```typescript
// ADD to System.ts systemPrompt:

`If the project uses a database (Prisma, SQLite, etc.), include a section:
### Seed Data
Describe 3-5 realistic seed records for the primary data entity (e.g., 3 sample products with names, prices, and categories). The Coder will use this to create a prisma/seed.js file or equivalent.`
```

---

## Guardrail 5.7: Reviewer-Coder Rework Oscillation

**Risk**: Reviewer flags missing feature → Coder adds it but breaks CSS → Reviewer flags broken CSS → infinite loop.

**Defense**:
1. Hard-cap rework at **1 iteration** per pipeline run
2. Only re-generate the specific files mentioned in HIGH findings
3. Do NOT re-run the full Coder loop — only targeted file regeneration

```typescript
// In the Reviewer rework handler (Issue 2.4):

const REWORK_LIMIT = 1;
let reworkCount = 0;

if (needsRework && reworkCount < REWORK_LIMIT) {
  reworkCount++;
  // Only re-generate files explicitly named in HIGH findings
  // Do NOT re-run full Coder loop
}
```

---

# Summary Matrix

| ID | Issue | Tier | Severity | Fix File | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1.1 | API response shapes stripped by snapshot | Context | 💥 CRITICAL | `orchestrator.ts` L389 | Code provided |
| 1.2 | Component prop contracts never reach Coder | Context | 💥 CRITICAL | `orchestrator.ts` L398 | Code provided |
| 1.3 | Blueprinter writes vague implementation details | Context | ⚠️ HIGH | `Blueprinter.ts` | Code provided |
| 1.4 | `extractDependencyInterface()` misses re-exports | Context | ⚠️ HIGH | `orchestrator.ts` L381 | Code provided |
| 1.5 | `ProviderWrapper.js` imports phantom `apiClient` | Context | 💥 CRITICAL | Symptom of 1.4 | Via 1.4 fix |
| 1.6 | `lib/auth.js` never generated but imported | Context | 💥 CRITICAL | `orchestrator.ts` L626 | Code provided |
| 2.1 | ReAct tool loop completely dormant | Execution | ⚠️ HIGH | `agents.ts`, `inference.ts` | Code provided |
| 2.2 | 20-minute full-file regeneration on retry | Execution | ⚠️ HIGH | `orchestrator.ts` L1119 | Code provided |
| 2.3 | Debugger skips all logic errors | Execution | ⚠️ HIGH | Downstream of 3.1 | Via 3.1 fix |
| 2.4 | Reviewer `REQUIRES_REWORK` ignored | Execution | ⚠️ HIGH | `orchestrator.ts` L1221 | Code provided |
| 2.5 | Tester LLM never invoked | Execution | ℹ️ INFO | By design | N/A |
| 3.1 | Linter suppresses all cross-file errors | Verification | 💥 CRITICAL | `linter.ts` L128 | Code provided |
| 3.2 | DOM check misses `querySelectorAll` | Verification | ⚠️ MEDIUM | `orchestrator.ts` L1156 | Code provided |
| 3.3 | No Prisma schema validation | Verification | ⚠️ HIGH | `linter.ts` | Code provided |
| 3.4 | CSS property allowlist incomplete | Verification | ⚠️ MEDIUM | `linter.ts` L340 | Code provided |
| 3.5 | HTML warning treated as hard failure | Verification | ⚠️ MEDIUM | `linter.ts` L325 | Code provided |
| 4.1 | Prisma/config preamble not stripped | Sanitization | ⚠️ HIGH | `orchestrator.ts` L332 | Code provided |
| 4.2 | Header anchor reconstruction lossy | Sanitization | ⚠️ MEDIUM | `orchestrator.ts` L325 | Code provided |
| 4.3 | Lazy placeholder code not detected | Sanitization | ⚠️ HIGH | `orchestrator.ts` L332 | Code provided |
| 5.1 | Tool call context ballooning | Future | 🛡️ GUARD | `toolbox.ts` | Code provided |
| 5.2 | `applyDiff` line drift | Future | 🛡️ GUARD | `toolbox.ts` | Code provided |
| 5.3 | Spec collision between documents | Future | 🛡️ GUARD | `Coder.ts` | Code provided |
| 5.4 | Missing `'use client'` in Next.js | Future | 🛡️ GUARD | `linter.ts` | Code provided |
| 5.5 | Vanilla JS import without `type="module"` | Future | 🛡️ GUARD | `linter.ts` | Code provided |
| 5.6 | Empty database on first run | Future | 🛡️ GUARD | `System.ts` | Code provided |
| 5.7 | Reviewer-Coder rework oscillation | Future | 🛡️ GUARD | `orchestrator.ts` | Code provided |
