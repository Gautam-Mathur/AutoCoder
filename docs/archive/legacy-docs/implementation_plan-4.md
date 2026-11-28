# AutoCoder: FINAL Perfection Plan (Ship-Ready Edition)

> This is the result of a complete line-by-line audit of ALL 20+ source files.
> No shortcuts. No assumptions. Every root cause traced to its exact line.

---

## Audit Scope

Files read in full:
- `orchestrator.ts` (1173 lines) — all 4 sections  
- `inference.ts` (691 lines)  
- `linter.ts` (331 lines)  
- `memory.ts` (418 lines)  
- `vfs.ts` (205 lines)  
- `persistence.ts` (296 lines)  
- `eventDispatcher.ts` (178 lines)  
- `token-budgeter.ts` (105 lines)  
- `agents.ts` (36 lines)  
- All 11 registry agents: Queen, Planner, Architect, System, Designer, Blueprinter, Coder, Tester, Debugger, Security, Reviewer  
- `stream/route.ts`, `resume/route.ts`  

---

## Root Cause Master List

### Category A — Context Starvation (Coder gets insufficient information to write correct code)

| ID | Location | Root Cause |
|---|---|---|
| **A1** | `orchestrator.ts:178` | `MAX_SNAPSHOT_CHARS = 600` — truncates mid-bullet-point, injecting partial data into every downstream agent |
| **A2** | `orchestrator.ts:187` | `extractSnapshot()` lookahead `(?=\n###[^#])` fails on files where the next section starts immediately with no blank line — snapshot returns empty string |
| **A3** | `orchestrator.ts:366` | `buildCoderContext()` puts BLUEPRINT at the TOP of the prompt — LLM attention falls off before reading it fully. Blueprint MUST be repeated at BOTTOM |
| **A4** | `orchestrator.ts:163–164` | `UPSTREAM_AGENT_MAP` for Security is `['Queen']` and Reviewer is `['Queen','Planner','Architect']` — completely excludes System and Designer output |
| **A5** | `Security.ts:96–98`, `Reviewer.ts:116–118` | `getContext()` returns `""` — Security and Reviewer receive ZERO source code to audit/review |
| **A6** | `orchestrator.ts:617` | `customUserContent` bypasses `buildStageContext()` — Blueprinter/Coder/Debugger get no upstream snapshot data at all |
| **A7** | `orchestrator.ts:1005–1011` | Coder dependency code = raw full file dumps. Floods context window instead of providing compact interfaces |
| **A8** | `orchestrator.ts:350–351` | `extractSection()` uses `###\\\\s*` — double-escaped backslash, also hard-coded to `###` only (misses `##`, `####` headers) |

### Category B — Output Corruption (LLM output polluted before reaching VFS)

| ID | Location | Root Cause |
|---|---|---|
| **B1** | `orchestrator.ts:309–314` | `sanitizeStageOutput()` only strips outermost code fences — inner ` ```js ``` ` blocks survive and land verbatim in generated code files |
| **B2** | `orchestrator.ts:675` | Coder output runs through generic `sanitizeStageOutput()` with `expectedFirstHeader` undefined — wrong sanitizer for raw code output |
| **B3** | `orchestrator.ts:614` | Retry hints appended to `systemInstructions` (system prompt). Most Ollama models heavily discount system prompt updates on retries vs user messages |
| **B4** | `inference.ts:560` | Malformed JSON stream chunks silently discarded — content split at stream boundaries causes truncated output that appears complete |
| **B5** | `orchestrator.ts:326` | `sanitizeStageOutput()` reconstructs header as `'### ' + expectedFirstHeader + ...` — doubles the header if LLM had a space-prefixed matching header at index 0 |

### Category C — Token Budget / Context Window Failures

| ID | Location | Root Cause |
|---|---|---|
| **C1** | `inference.ts:507` | `num_ctx: 32768` hardcoded — Coder prompt for large projects easily exceeds 32K, causing Ollama to truncate mid-generation silently |
| **C2** | `token-budgeter.ts:66,93` | Coder budget formula `32768 + (fileCount * 2048)` then clamped to `32768` at line 93 — formula is completely meaningless, budget always = 32768 |
| **C3** | `token-budgeter.ts:84–88` | Security/Reviewer fall into `else` branch → `maxTokens = 2048` (from registry). They get only 2048 output tokens even while needing to analyze entire codebases |
| **C4** | `inference.ts:492` | `AbortSignal.any()` not available in Node.js < 20.3. Node 18 servers throw `TypeError: AbortSignal.any is not a function` — ALL inference crashes |

### Category D — Pipeline Logic Bugs

| ID | Location | Root Cause |
|---|---|---|
| **D1** | `orchestrator.ts:846–856` | Fast-forward guard queries for `status: 'Completed'` on `'Coder'` stage — but Coder writes per-file history rows, never a stage-level Completed. Fast-forward for Coder never fires on resume |
| **D2** | `orchestrator.ts:961–964` | Debugger writes repaired file to VFS but NEVER re-runs `runLinter()`. Repaired file could introduce new syntax errors that pass invisibly |
| **D3** | `orchestrator.ts:572` | Auto-injected `index.html` rawSection hardcodes `style.css` / `script.js` regardless of actual CSS/JS filenames in the blueprint |
| **D4** | `orchestrator.ts:843` | Abort check uses `signal` (original request signal — always undefined after handoff) instead of `executionSignal`. Abort never fires inside pipeline loop |
| **D5** | `resume/route.ts:77` | Resume uses `conversation.title` as prompt (e.g. "Todo App") — not the original detailed user request |
| **D6** | `stream/route.ts:35` | History replay `take: 50` — hardcoded. Full complex run generates 200+ history rows. Reconnected clients miss majority of history |
| **D7** | `orchestrator.ts:947` | Debugger repair prompt injects full `test_report.md` (all files' errors) — LLM doesn't know which errors belong to the target file |
| **D8** | `eventDispatcher.ts:37–41` | Routes `'conflict'` failure type to `'ConflictResolver'` — a non-existent agent. Calling `runAgent('ConflictResolver')` throws `Unknown agent` and crashes pipeline |

### Category E — Prompt Engineering Defects

| ID | Location | Root Cause |
|---|---|---|
| **E1** | `registry/Queen.ts:5` | `maxTokens: 1024` — catastrophically low for complex projects. Queen truncates before listing all features |
| **E2** | `registry/Blueprinter.ts:11` | Blueprinter says "you receive distilled Context Snapshots" — with 600-char limit these snapshots are too small to list all files from architecture.md |
| **E3** | `orchestrator.ts:167–176` | `EXPECTED_FIRST_HEADERS` missing `'Designer'` — Designer output never gets preamble stripped (E5 in old plan) |
| **E4** | `orchestrator.ts:167–176` | System agent has two valid first headers (`Context Snapshot` OR `No Backend Required`) but `EXPECTED_FIRST_HEADERS['System'] = 'Context Snapshot'` destroys no-backend output |
| **E5** | `registry/Reviewer.ts:8` | Reviewer prompt says "you receive ALL generated source code" — false. Prompt creates false confidence that LLM has code it never received |

### Category F — Memory & State Issues

| ID | Location | Root Cause |
|---|---|---|
| **F1** | `memory.ts:391–399` + `orchestrator.ts:715` | Every agent write creates TWO ExecutiveMemory records — one from `StageLedger.write()` and one from `runAgent()`. Ledger accumulates duplicate entries |
| **F2** | `memory.ts:361–388` | Oscillation detection never runs — `runAgent()` bypasses `ledger.write()` via direct `(ledger.getState() as any)[fieldName] = ...` mutation |
| **F3** | `memory.ts:271–289` | `handleUpstreamModification()` cascade for `'designer'` only invalidates `['tester']` — Blueprinter and Coder should also be invalidated |

---

## Proposed Changes — Execution Rounds

> [!IMPORTANT]
> Execute Round 1 as a single commit. Run `npx tsc --noEmit` + one test pipeline before committing Round 2.

---

### Round 1 — Critical (Must ship these to make the tool usable)

---

#### R1-1: MAX_SNAPSHOT_CHARS 600 → 2000 + bullet-preserving truncation
**File**: [orchestrator.ts](file:///home/lenovo/autogod/src/lib/agents/ruflo/orchestrator.ts) line 178  
**Fixes**: A1

```typescript
const MAX_SNAPSHOT_CHARS = 2000;

// Add helper before extractSnapshot():
function truncateAtBullet(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const lines = text.split('\n');
  let result = '';
  for (const line of lines) {
    if ((result + '\n' + line).length > maxChars) break;
    result += (result ? '\n' : '') + line;
  }
  return result + '\n...[TRUNCATED]';
}
// Replace all 4 `.substring(0, MAX_SNAPSHOT_CHARS) + '\n...[SNAPSHOT TRUNCATED]'` with:
// truncateAtBullet(snapshotText, MAX_SNAPSHOT_CHARS)
```

---

#### R1-2: Fix extractSnapshot() regex — support any header level, handle adjacent sections
**File**: [orchestrator.ts](file:///home/lenovo/autogod/src/lib/agents/ruflo/orchestrator.ts) lines 187, 197, 224, 232  
**Fixes**: A2

```typescript
// Replace all 4 occurrences:
// FROM: /### Context Snapshot[\s\S]*?(?=\n###[^#]|$)/i
// TO:   /#{1,4}\s*Context Snapshot[\s\S]*?(?=\n#{1,4}\s[^#]|$)/i
```

---

#### R1-3: Fix extractSection() regex
**File**: [orchestrator.ts](file:///home/lenovo/autogod/src/lib/agents/ruflo/orchestrator.ts) lines 350–358  
**Fixes**: A8

```typescript
export async function extractSection(conversationId: string, vfsPath: string, sectionName: string): Promise<string> {
  const fullContent = (await readVirtualFile(conversationId, vfsPath)) || '';
  const escaped = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`#{2,4}\\s*${escaped}[\\s\\S]*?(?=\\n#{2,4}\\s|$)`, 'i');
  const match = fullContent.match(regex);
  if (match) return match[0].trim();
  return `[Section "${sectionName}" not found in ${vfsPath}]`;
}
```

---

#### R1-4: Rewrite buildCoderContext() — Sandwich Layout + interface extraction
**File**: [orchestrator.ts](file:///home/lenovo/autogod/src/lib/agents/ruflo/orchestrator.ts) lines 361–382, 1005–1011  
**Fixes**: A3, A6, A7

Add `extractDependencyInterface()` helper before `buildCoderContext()`:
```typescript
export function extractDependencyInterface(filePath: string, content: string): string {
  if (filePath.endsWith('.html')) {
    const ids = [...content.matchAll(/\bid=["']([^"']+)["']/g)].map(m => m[1]);
    const cssLinks = [...content.matchAll(/href=["']([^"']+\.css)["']/g)].map(m => m[1]);
    const jsLinks = [...content.matchAll(/src=["']([^"']+\.js)["']/g)].map(m => m[1]);
    return `[HTML] IDs: ${[...new Set(ids)].join(', ') || 'none'} | CSS links: ${cssLinks.join(', ') || 'none'} | Scripts: ${jsLinks.join(', ') || 'none'}`;
  }
  if (filePath.endsWith('.css')) {
    const selectors = [...content.matchAll(/^([.#][\w-]+)/gm)].map(m => m[1]);
    const vars = [...content.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]);
    return `[CSS] Selectors: ${[...new Set(selectors)].join(', ') || 'none'} | Variables: ${[...new Set(vars)].join(', ') || 'none'}`;
  }
  if (/\.(js|ts|jsx|tsx)$/.test(filePath)) {
    const named = [...content.matchAll(/export\s+(?:async\s+)?(?:function|const|class|let|var)\s+(\w+)/g)].map(m => m[1]);
    const dflt = content.match(/export\s+default\s+(?:class|function)?\s*(\w+)/)?.[1];
    return `[JS/TS] Exports: ${[...new Set([...named, ...(dflt ? [dflt] : [])])].join(', ') || 'none'}`;
  }
  return content.substring(0, 300);
}
```

Replace `buildCoderContext()`:
```typescript
export async function buildCoderContext(
  conversationId: string,
  blueprintSection: string,
  dependencyInterfaces: string
): Promise<string> {
  const fileMatch = blueprintSection.match(/###\s*File:\s*(.+)/i);
  const fileName = fileMatch ? fileMatch[1].trim().replace(/[*`'"]/g, '').split(/\s*[(\[{]/)[0].trim() : 'unknown';
  let context = `TARGET FILE: ${fileName}\n\n`;

  // Inject Design System (Designer) — color palette, font, spacing
  const uiSpec = await readVirtualFile(conversationId, 'ui_spec.md');
  if (uiSpec) {
    const dsMatch = uiSpec.match(/#{1,4}\s*Design System[\s\S]*?(?=\n#{1,4}\s|$)/i);
    if (dsMatch) context += `=== DESIGN SYSTEM ===\n${dsMatch[0].trim()}\n\n`;
  }

  // Inject API Endpoints (System)
  const backendSpec = await readVirtualFile(conversationId, 'backend_spec.md');
  if (backendSpec) {
    const apiMatch = backendSpec.match(/#{1,4}\s*API Endpoints[\s\S]*?(?=\n#{1,4}\s|$)/i);
    if (apiMatch) context += `=== API ENDPOINTS ===\n${apiMatch[0].trim()}\n\n`;
  }

  if (dependencyInterfaces) context += `=== DEPENDENCY INTERFACES ===\n${dependencyInterfaces}\n\n`;

  const specsNeeded = parseSpecsRequired(blueprintSection);
  if (specsNeeded.length > 0) {
    context += `=== REFERENCED SPECS ===\n`;
    for (const spec of specsNeeded) {
      const sectionText = await extractSection(conversationId, spec.file, spec.section);
      context += `--- [${spec.file}#${spec.section}] ---\n${sectionText}\n\n`;
    }
  }

  // Blueprint at BOTTOM — highest LLM attention zone
  context += `=== IMPLEMENTATION BLUEPRINT — FOLLOW EXACTLY ===\n${blueprintSection}`;
  return context.trim();
}
```

Update Coder loop lines 1005–1014:
```typescript
let depCodeText = '';
for (const depFile of fileSec.dependencies) {
  const depContent = await readVirtualFile(conversationId, depFile);
  if (depContent) depCodeText += `--- [${depFile}] ---\n${extractDependencyInterface(depFile, depContent)}\n\n`;
}
const coderPrompt = await buildCoderContext(conversationId, fileSec.rawSection, depCodeText);
```

---

#### R1-5: Fix EXPECTED_FIRST_HEADERS — add Designer, fix System, leave Coder undefined
**File**: [orchestrator.ts](file:///home/lenovo/autogod/src/lib/agents/ruflo/orchestrator.ts) lines 167–176  
**Fixes**: E3, E4

```typescript
const EXPECTED_FIRST_HEADERS: Record<string, string> = {
  'Queen':       'Context Snapshot',
  'Planner':     'Context Snapshot',
  'Architect':   'Context Snapshot',
  // System intentionally excluded — has two valid first headers
  'Designer':    'Context Snapshot',      // WAS MISSING
  'Blueprinter': 'File:',
  'Security':    'Overall Status',
  'Reviewer':    'Overall Assessment',
  // Coder intentionally excluded — outputs raw code, not markdown headers
};
```

---

#### R1-6: Add sanitizeCoderOutput() + apply in runAgent()
**File**: [orchestrator.ts](file:///home/lenovo/autogod/src/lib/agents/ruflo/orchestrator.ts)  
**Fixes**: B1, B2

Add after `sanitizeStageOutput()`:
```typescript
export function sanitizeCoderOutput(raw: string): string {
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```[a-zA-Z0-9_+.-]*\r?\n?/gm, '').replace(/\r?\n?```\s*$/gm, '');
  const codeStart = cleaned.search(/^(<[!a-zA-Z\/]|[a-zA-Z_$\/*{]|import |const |let |var |function |class |\/\/|\/\*|#!|\s*<!)/m);
  if (codeStart > 5) cleaned = cleaned.substring(codeStart);
  const trailingIdx = cleaned.search(/\n{2,}(?:I hope|This implementation|This code|Note:|The above|Feel free|Let me know)/i);
  if (trailingIdx > 0) cleaned = cleaned.substring(0, trailingIdx);
  return cleaned.trim();
}
```

In `runAgent()`, after line 675:
```typescript
let finalContent = sanitized;
if (agentName === 'Coder') {
  const deepCleaned = sanitizeCoderOutput(sanitized);
  if (deepCleaned.length > 10) finalContent = deepCleaned;
}
// Replace ALL subsequent uses of `sanitized` with `finalContent`
```

---

#### R1-7: Fix Queen maxTokens 1024 → 4096
**File**: [registry/Queen.ts](file:///home/lenovo/autogod/src/lib/agents/ruflo/registry/Queen.ts) line 5  
**Fixes**: E1

```typescript
export const maxTokens = 4096; // was 1024
```

---

#### R1-8: Inject source code into Security + Reviewer + fix their maxTokens
**Files**: [registry/Security.ts](file:///home/lenovo/autogod/src/lib/agents/ruflo/registry/Security.ts), [registry/Reviewer.ts](file:///home/lenovo/autogod/src/lib/agents/ruflo/registry/Reviewer.ts), [orchestrator.ts](file:///home/lenovo/autogod/src/lib/agents/ruflo/orchestrator.ts)  
**Fixes**: A4, A5, C3, E5

```typescript
// Security.ts and Reviewer.ts:
export const maxTokens = 8192; // was 2048

// orchestrator.ts — add BEFORE the generic runAgent() at line 1091:
if (stageName === 'Security' || stageName === 'Reviewer') {
  const specFiles = ['plan.md', 'requirements.md', 'architecture.md', 'backend_spec.md', 'ui_spec.md'];
  let specContext = '';
  for (const sf of specFiles) {
    const sc = await readVirtualFile(conversationId, sf);
    if (sc) specContext += `=== ${sf.toUpperCase()} ===\n${sc}\n\n`;
  }
  const allVfsFiles = await listVirtualFiles(conversationId);
  const codeFiles = allVfsFiles.filter(f => /\.(js|ts|jsx|tsx|html|css|py|go|java|rs|sh)$/.test(f));
  let codeContext = '';
  let totalChars = 0;
  const CODE_CHAR_LIMIT = 60000;
  for (const f of codeFiles) {
    if (totalChars >= CODE_CHAR_LIMIT) { codeContext += `\n[Remaining ${codeFiles.length - codeFiles.indexOf(f)} files omitted for size]\n`; break; }
    const fc = await readVirtualFile(conversationId, f);
    if (fc) { codeContext += `\n--- FILE: ${f} ---\n${fc}\n`; totalChars += fc.length; }
  }
  const fullCtx = specContext + (codeContext ? `\n=== GENERATED SOURCE CODE ===\n${codeContext}` : '\n=== NOTE: No source code files found ===');
  const srOut = await runAgent(conversationId, stageName, userPrompt, emit, ledger, 1, fullCtx, executionSignal);
  emit({ type: 'AGENT_COMPLETE', agent: stageName, message: `Stage ${stageName} completed.`, data: srOut.content });
  await flushVfsToDisk(conversationId);
  continue;
}
```

---

#### R1-9: Blueprinter gets full spec documents
**File**: [orchestrator.ts](file:///home/lenovo/autogod/src/lib/agents/ruflo/orchestrator.ts)  
**Fixes**: A6, E2

Add BEFORE the generic `runAgent()` at line 1091:
```typescript
if (stageName === 'Blueprinter') {
  const specFiles = ['plan.md', 'requirements.md', 'architecture.md', 'backend_spec.md', 'ui_spec.md'];
  let fullContext = '';
  for (const sf of specFiles) {
    const sc = await readVirtualFile(conversationId, sf);
    if (sc) fullContext += `=== ${sf.toUpperCase()} ===\n${sc}\n\n`;
  }
  const bpOut = await runAgent(conversationId, 'Blueprinter', userPrompt, emit, ledger, 1, fullContext.trim(), executionSignal);
  emit({ type: 'AGENT_COMPLETE', agent: 'Blueprinter', message: 'Blueprinter completed.', data: bpOut.content });
  await flushVfsToDisk(conversationId);
  continue;
}
```

---

#### R1-10: Fix abort signal — use executionSignal not signal
**File**: [orchestrator.ts](file:///home/lenovo/autogod/src/lib/agents/ruflo/orchestrator.ts) lines 843, 1002, 1091+  
**Fixes**: D4

```typescript
// Line 843: signal?.aborted → executionSignal.aborted
// Line 1002: signal?.aborted → executionSignal.aborted
// All runAgent() calls inside loop: signal → executionSignal
```

---

#### R1-11: Fix sanitizeStageOutput() double-header bug
**File**: [orchestrator.ts](file:///home/lenovo/autogod/src/lib/agents/ruflo/orchestrator.ts) line 326  
**Fixes**: B5

```typescript
// Replace:
cleaned = '### ' + expectedFirstHeader + cleaned.substring(headerMatch.index + headerMatch[0].length);
// With:
cleaned = headerMatch[0].trimStart() + cleaned.substring(headerMatch.index + headerMatch[0].length);
```

---

### Round 2 — High Priority (Reliability)

---

#### R2-1: Fix token budget clamp — remove blanket 32768 cap, add per-agent caps
**File**: [token-budgeter.ts](file:///home/lenovo/autogod/src/lib/agents/ruflo/token-budgeter.ts) lines 82–93  
**Fixes**: C2, C3

```typescript
// Add explicit Security/Reviewer case BEFORE the else:
else if (agentName === 'Security' || agentName === 'Reviewer') {
  budget = 8192;
  breakdown.formulaApplied = 'fixed_8192_for_audit_agents';
}
else {
  // Queen, etc — use maxTokens from agent def
  ...
}

// Change cap:
const MAX_BUDGET = (agentName === 'Coder' || agentName === 'Debugger') ? 65536 : 32768;
budget = Math.min(budget, MAX_BUDGET);
```

---

#### R2-2: Dynamic num_ctx in inference.ts
**File**: [inference.ts](file:///home/lenovo/autogod/src/lib/agents/inference.ts) line 507  
**Fixes**: C1

```typescript
num_ctx: (() => {
  const promptChars = messages.reduce((sum, m) => sum + m.content.length, 0);
  const needed = Math.ceil(promptChars / 4) + (options.maxTokens || 4096) + 512;
  return Math.min(131072, Math.max(32768, needed));
})(),
```

---

#### R2-3: Fix AbortSignal.any() Node 18 compatibility
**File**: [inference.ts](file:///home/lenovo/autogod/src/lib/agents/inference.ts) line 492  
**Fixes**: C4

```typescript
function combineAbortSignals(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const sig of signals) {
    if (sig.aborted) { controller.abort(sig.reason); return controller.signal; }
    sig.addEventListener('abort', () => controller.abort(sig.reason), { once: true });
  }
  return controller.signal;
}
const combinedSignal = options.signal ? combineAbortSignals(options.signal, timeoutSignal) : timeoutSignal;
```

---

#### R2-4: Post-Debugger re-linting + sanitizeCoderOutput on repaired files
**File**: [orchestrator.ts](file:///home/lenovo/autogod/src/lib/agents/ruflo/orchestrator.ts) lines 961–965  
**Fixes**: D2

```typescript
if (repairResult && repairResult.content) {
  const repairedContent = sanitizeCoderOutput(repairResult.content) || repairResult.content;
  await writeVirtualFile(conversationId, targetFile, repairedContent);
  writeProjectFile(conversationId, targetFile, repairedContent);
  const postLint = await runLinter(conversationId, targetFile);
  if (postLint.success) {
    repairedCount++;
    emit({ type: 'AGENT_LOG', agent: 'Debugger', message: `✅ ${targetFile} repair verified clean.` });
  } else {
    emit({ type: 'AGENT_LOG', agent: 'Debugger', message: `⚠️ ${targetFile} repair still has errors: ${postLint.summary}` });
  }
}
```

---

#### R2-5: Fix auto-injected index.html — use actual CSS/JS filenames
**File**: [orchestrator.ts](file:///home/lenovo/autogod/src/lib/agents/ruflo/orchestrator.ts) lines 565–574  
**Fixes**: D3

```typescript
if (isWebProject && !hasHtmlEntryPoint) {
  const cssFiles = sections.filter(s => s.file.endsWith('.css')).map(s => s.file);
  const jsFiles = sections.filter(s => /\.(js|ts)$/.test(s.file)).map(s => s.file);
  const primaryCss = cssFiles[0] || 'style.css';
  const primaryJs = jsFiles[jsFiles.length - 1] || 'script.js';
  const allDeps = [...cssFiles, ...jsFiles];
  const defaultHtmlSection: BlueprintFileSection = {
    file: 'index.html', purpose: 'Main web entry point',
    dependencies: allDeps, specsRequired: [], exports: [],
    details: `HTML5 entry linking ${primaryCss} and loading ${primaryJs}`,
    rawSection: `### File: index.html\n- **Purpose**: Main HTML entry point\n- **Dependencies**: ${allDeps.join(', ') || 'None'}\n- **Specs Required**: None\n- **Exports**: None\n- **Implementation Details**:\n  1. DOCTYPE html, lang="en"\n  2. Head: meta charset="UTF-8", viewport meta, descriptive title\n  3. Head: <link rel="stylesheet" href="${primaryCss}">\n  4. Body: main container div id="app"\n  5. End of body: <script src="${primaryJs}" defer></script>`,
  };
  sections.unshift(defaultHtmlSection);
}
```

---

#### R2-6: Fix Debugger repair prompt — filter to target file errors only
**File**: [orchestrator.ts](file:///home/lenovo/autogod/src/lib/agents/ruflo/orchestrator.ts) line 947  
**Fixes**: D7

```typescript
const relevantErrors = testReport.split('\n')
  .filter(l => l.includes(targetFile) || l.startsWith('###') || l.startsWith('- **Total'))
  .join('\n');
const repairPrompt = `File to fix: ${targetFile}\n\nCurrent source code:\n${fileContent}\n\nLinter errors for THIS file:\n${relevantErrors}\n\nOutput ONLY the complete corrected file. No markdown fences. No explanation.`;
```

---

#### R2-7: Fix SSE history replay limit 50 → 500, skip streaming rows
**File**: [stream/route.ts](file:///home/lenovo/autogod/src/app/api/pipeline/stream/route.ts) lines 31–48  
**Fixes**: D6

```typescript
const historyLogs = await prisma.executionHistory.findMany({
  where: { conversationId },
  orderBy: { createdAt: 'asc' },
  take: 500, // was 50
});
for (const logItem of historyLogs) {
  if (logItem.status === 'Streaming') continue; // skip stream progress rows
  sendEvent({ type: 'HISTORY_REPLAY', agent: logItem.stage, status: logItem.status, message: logItem.logs, timestamp: logItem.createdAt });
}
```

---

#### R2-8: Fix resume prompt — store and restore original full prompt
**Files**: [prisma/schema.prisma](file:///home/lenovo/autogod/prisma/schema.prisma), [stream/route.ts](file:///home/lenovo/autogod/src/app/api/pipeline/stream/route.ts), [resume/route.ts](file:///home/lenovo/autogod/src/app/api/pipeline/resume/route.ts)  
**Fixes**: D5

> [!WARNING]  
> Requires Prisma migration: `npx prisma migrate dev --name add_original_prompt`

```prisma
// schema.prisma — add to Conversation model:
originalPrompt  String?
```

```typescript
// stream/route.ts — after status update (line ~82):
if (userPrompt && userPrompt.length > (conversation.title?.length || 0)) {
  await prisma.conversation.update({ where: { id: conversationId }, data: { originalPrompt: userPrompt } });
}

// resume/route.ts — line 77:
const userPrompt = (conversation as any).originalPrompt || conversation.title || 'Resume software development pipeline';
```

---

#### R2-9: Remove duplicate ExecutiveMemory writes from StageLedger.write()
**File**: [memory.ts](file:///home/lenovo/autogod/src/lib/agents/ruflo/memory.ts) lines 391–399  
**Fixes**: F1

Delete the `writeExecutiveMemoryRecord()` call from `StageLedger.write()` (step 4). The `runAgent()` function already handles this write with full telemetry at its line 715.

```typescript
// In StageLedger.write(), DELETE:
const contentMd = typeof value === 'string' ? value : (value?.content ?? JSON.stringify(value));
await writeExecutiveMemoryRecord({
  conversationId: this.conversationId,
  agentName,
  contentMd,
});
// Keep steps 1-3 (ownership check, mutation, oscillation check) intact
```

---

#### R2-10: Fix eventDispatcher — ConflictResolver → Debugger
**File**: [eventDispatcher.ts](file:///home/lenovo/autogod/src/lib/agents/ruflo/eventDispatcher.ts) line 37  
**Fixes**: D8

```typescript
return {
  failureType: 'conflict',
  specialistAgent: 'Debugger', // was 'ConflictResolver' — non-existent agent
  reproducibleLogs: logs,
  contextHint: 'Analyze conflicts between specification requirements and generated code, then fix accordingly.'
};
```

---

### Round 3 — Medium Priority (Validation Depth)

---

#### R3-1: CSS property typo detection in linter
**File**: [linter.ts](file:///home/lenovo/autogod/src/lib/agents/ruflo/linter.ts)  

Add `runCssPropertyLint()` helper function and chain it for `.css` files (see full implementation in audit notes above). Warns on unknown CSS property names. Does NOT block on warnings — only bracket errors fail the lint.

---

#### R3-2: Cross-file DOM coherence check after Coder loop
**File**: [orchestrator.ts](file:///home/lenovo/autogod/src/lib/agents/ruflo/orchestrator.ts) — after line 1086  

Checks that every `getElementById()` and `querySelector('#...')` in JS files has a matching `id=` in HTML files. Writes `coherence_report.md` to VFS. Does not block pipeline — emits warnings only.

---

#### R3-3: Fix retry hint location — move from system to user message
**File**: [orchestrator.ts](file:///home/lenovo/autogod/src/lib/agents/ruflo/orchestrator.ts) line 614, 616–617  
**Fixes**: B3

```typescript
// Remove retryHint from systemInstructions:
const systemInstructions = agentDef.systemPrompt + constraintsBlock;

// Prepend retryHint to userContent instead:
const retryPrefix = attempt > 1 ? `[RETRY ${attempt}/3] Your previous output failed. Error: ${validationError || 'Missing required section headers'}.\n\n` : '';
const userContent = retryPrefix + (customUserContent || (upstreamContext ? `Upstream Context:\n${upstreamContext}\n\nOriginal Request:\n"${userPromptText}"` : `Original Request:\n"${userPromptText}"`));
```

---

## Files Modified Summary

| File | Round | Changes |
|---|---|---|
| `orchestrator.ts` | 1–3 | R1-1 through R1-11, R2-4, R2-5, R2-6, R2-10, R3-2, R3-3 |
| `inference.ts` | 2 | R2-2, R2-3 |
| `token-budgeter.ts` | 2 | R2-1 |
| `memory.ts` | 2 | R2-9 |
| `linter.ts` | 3 | R3-1 |
| `eventDispatcher.ts` | 2 | R2-10 |
| `stream/route.ts` | 2 | R2-7 |
| `resume/route.ts` | 2 | R2-8 |
| `registry/Queen.ts` | 1 | R1-7 |
| `registry/Security.ts` | 1 | R1-8 |
| `registry/Reviewer.ts` | 1 | R1-8 |
| `prisma/schema.prisma` | 2 | R2-8 — add `originalPrompt` |

---

## Verification Plan

### After Round 1 (`npx tsc --noEmit` must be 0 errors):
1. Submit "build a calculator" — confirm:
   - Blueprinter creates all 3 files (index.html, style.css, calculator.js)
   - Coder prompt has "IMPLEMENTATION BLUEPRINT — FOLLOW EXACTLY" at BOTTOM
   - Security report has actual line number citations from real generated code
   - No `[Section not found]` in telemetry logs
   - Designer output NOT destroyed by sanitizer

2. Submit "build a note-taking app" (frontend-only) — confirm:
   - System outputs "No Backend Required" and it is NOT stripped by sanitizer
   - Auto-injected index.html uses actual CSS/JS filenames from blueprint

### After Round 2:
3. Force-abort mid-Coder, then resume — confirm:
   - Resume uses full original prompt, not title
   - SSE client reconnecting after reload sees >50 history rows

4. Submit a 10-file project — confirm:
   - `num_ctx` log shows value > 32768 (dynamic sizing working)
   - No `AbortSignal.any is not a function` errors on Node 18

5. Debugger stage — manually corrupt a file, trigger linter failure — confirm:
   - Debugger repair prompt shows only errors for the target file
   - Post-repair lint runs and reports clean/dirty

### After Round 3:
6. CSS with intentional typo (`backgroud-color`) — confirm warning in linter output
7. JS with `getElementById("nonexistent-id")` — confirm coherence warning emitted

### Final:
```bash
git add -A && git push
```
