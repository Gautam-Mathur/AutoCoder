# Updated Root Cause Analysis: Code Quality Failures in AutoCoder

**Scope**: This report unifies three layers of analysis into a single remediation plan:

1. **Pipeline Engineering Failures** — How information flows (or fails to flow) between the 11 agents.
2. **LLM Cognitive Failures** — How the Dumb Zone, U-Shaped Attention, and missing Keyword Clustering degrade output quality *within* each agent call.
3. **Model Architecture Failures** — How using a single generalist LLM for all 11 stages caps code quality regardless of prompt engineering.

Each root cause follows the structure: **WHAT** → **WHY it causes bad code** → **HOW to fix it** → **SEVERITY** → **BOTTLENECKS to watch for**.

---

## Part 1: Pipeline Engineering Failures

These are structural problems in the Node.js orchestrator, context assembly, and validation layers.

---

### RC-1: The Coder Gets Zero Upstream Context — It Only Sees Its Blueprint Section

**WHAT**

When the Coder runs, `buildStageContext(conversationId, 'Coder')` returns empty context because `'Coder'` is absent from [`UPSTREAM_AGENT_MAP`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/orchestrator.ts#L156-L165). The Coder's `runAgent()` call at [line 1015](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/orchestrator.ts#L1015) passes `customUserContent` (the `coderPrompt`), which bypasses `buildStageContext()` entirely ([line 617](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/orchestrator.ts#L617): `const userContent = customUserContent || ...`).

The Coder's **only context** is what [`buildCoderContext()`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/orchestrator.ts#L361-L382) gives it:
1. The blueprint section for one file
2. Raw dependency file code
3. `Specs Required` sections (if the Blueprinter referenced them)

**WHY IT CAUSES BAD CODE**

The Coder has **no awareness** of:
- The Designer's **color palette, fonts, spacing, interaction patterns**
- The System agent's **database field names, API request/response shapes**
- The Architect's **tech stack choice, module boundaries, naming conventions**
- The **original user request** (passed as a raw string, not structured context)

The Coder is forced to **guess** every detail that the Blueprinter didn't explicitly copy. If the Blueprinter's Implementation Details say "use dark theme" without the exact `#1A1A2E` hex code from Designer, the Coder invents a random dark color.

**HOW TO FIX**

Inject Designer and System snapshots directly into `buildCoderContext()`:
```typescript
// In buildCoderContext() — after blueprint and dependency code:
const designerSnapshot = await extractSnapshot(conversationId, 'ui_spec.md');
if (designerSnapshot) {
  context += `\n=== DESIGN SYSTEM ===\n${designerSnapshot}\n\n`;
}
const systemSnapshot = await extractSnapshot(conversationId, 'backend_spec.md');
if (systemSnapshot) {
  context += `\n=== BACKEND SPEC ===\n${systemSnapshot}\n\n`;
}
const architectSnapshot = await extractSnapshot(conversationId, 'architecture.md');
if (architectSnapshot) {
  context += `\n=== ARCHITECTURE ===\n${architectSnapshot}\n\n`;
}
```

**BOTTLENECK**: Adding 3 snapshots increases the Coder's prompt by ~1,500–2,000 tokens per file. On 8B local models with 8K effective attention, this risks pushing the prompt into the Dumb Zone. **Mitigation**: Use keyword-clustered snapshots (see RC-15) instead of raw text, reducing each snapshot to ~200 tokens.

**SEVERITY**: **CRITICAL** — This single issue likely causes >50% of all code quality defects.

---

### RC-2: Security and Reviewer Agents Don't See Generated Code

**WHAT**

In [`UPSTREAM_AGENT_MAP`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/orchestrator.ts#L156-L165):
```typescript
'Security':    ['Queen'],
'Reviewer':    ['Queen', 'Planner', 'Architect'],
```
Neither agent receives Coder output. Both run as generic `runAgent()` calls at [line 1091](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/orchestrator.ts#L1091-L1100), getting upstream context from `buildStageContext()`. Since their maps exclude `'Coder'`, they receive zero source code.

**WHY IT CAUSES BAD CODE**

- The Security prompt says *"You receive all source code files"* — but it receives none. Every security finding is **hallucinated** from the project specification alone.
- The Reviewer prompt says *"You receive... all generated source code files"* and checks requirement coverage by looking for specific code — but has no code to inspect.
- Both produce fabricated reports, giving the user a **false sense of quality assurance**.

**HOW TO FIX**

Add a special handler for Security and Reviewer stages that injects all VFS source files into `customUserContent`:
```typescript
if (stageName === 'Security' || stageName === 'Reviewer') {
  const allFiles = await listVirtualFiles(conversationId);
  let codeContext = '=== GENERATED SOURCE CODE ===\n';
  for (const f of allFiles) {
    if (f.endsWith('.md')) continue; // skip spec documents
    const content = await readVirtualFile(conversationId, f);
    if (content) codeContext += `--- [${f}] ---\n${content}\n\n`;
  }
  const { context: upstreamContext } = await buildStageContext(conversationId, stageName);
  customUserContent = `${upstreamContext}\n\n${codeContext}`;
}
```

**BOTTLENECK**: For projects with 15+ files, concatenated source code could exceed 30K tokens, blowing past the 32K context window. **Mitigation**: (a) Use interface-only extraction for large files (see RC-14), (b) increase `num_ctx` dynamically for audit stages, or (c) run Security/Reviewer per-file rather than whole-project.

**SEVERITY**: **CRITICAL** — Security and review outputs are pure hallucinations right now.

---

### RC-3: Blueprinter Only Gets 600-Character Snapshots, Not Full Specs

**WHAT**

The Blueprinter receives upstream context via `buildStageContext()` which calls [`extractSnapshotFromContent()`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/orchestrator.ts#L222-L241). This extracts only the `### Context Snapshot` section (max [`MAX_SNAPSHOT_CHARS = 600`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/orchestrator.ts#L178)) from each upstream agent's output.

**WHY IT CAUSES BAD CODE**

The Blueprinter is supposed to produce a blueprint *"precise enough that the Coder can write every file without guessing."* But the Blueprinter itself doesn't have the full specs — it has 600-char summaries. Precise information is lost:
- **Database field names**: `id: string, email: string, passwordHash: string` → *"3 entities, 8 endpoints"*
- **Design system details**: `Primary Color: #2563EB, Border Radius: 8px` → *"minimal dark theme"*
- **API request/response shapes**: Exact schemas → *"REST API with auth"*

The Blueprinter then writes generic Implementation Details, and the Coder (which also lacks upstream context per RC-1) is left to invent schemas.

**HOW TO FIX**

For the Blueprinter stage specifically, bypass snapshot extraction and inject full upstream VFS documents:
```typescript
if (stageName === 'Blueprinter') {
  const specFiles = ['plan.md', 'requirements.md', 'architecture.md', 'backend_spec.md', 'ui_spec.md'];
  let fullContext = '';
  for (const specFile of specFiles) {
    const content = await readVirtualFile(conversationId, specFile);
    if (content) fullContext += `=== ${specFile.toUpperCase()} ===\n${content}\n\n`;
  }
  customUserContent = fullContext;
}
```

**BOTTLENECK**: Full spec documents for a complex project could total 15K–20K tokens. On local 8B models with limited context, this risks Dumb Zone degradation. **Mitigation**: Use keyword-clustered spec summaries (RC-15) at ~2,000 tokens total instead of full documents, or ensure the Blueprinter uses the Tier 2 code-specialist model (RC-17) which handles longer contexts better.

**SEVERITY**: **HIGH** — Cascading information loss through the spec chain.

---

### RC-4: Token Budget Hard Cap at 32K Strangles Large Projects

**WHAT**

In [`token-budgeter.ts` line 92](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/token-budgeter.ts#L91-L93):
```typescript
const MAX_BUDGET = 32768;
budget = Math.min(budget, MAX_BUDGET);
```
And in [`inference.ts` line 507](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/inference.ts#L507):
```typescript
num_ctx: 32768,
```
Both output tokens (`num_predict`) and context window (`num_ctx`) are hard-capped at 32K.

**WHY IT CAUSES BAD CODE**

If the Coder's system prompt (~750 tokens) + user content (blueprint + dependency code + spec sections: ~4,000–12,000 tokens) exceeds the remaining context window, the LLM silently truncates the earliest tokens. The system prompt instructions (including `=== ABSOLUTE RULES ===`) can be pushed out of context, causing the model to wrap code in markdown fences, add preamble text, or use placeholder implementations.

**HOW TO FIX**

Make `num_ctx` dynamic based on actual prompt size:
```typescript
const promptTokenEstimate = Math.round((systemInstructions.length + userContent.length) / 4);
const dynamicCtx = Math.max(32768, promptTokenEstimate + budget + 1024); // 1K safety margin
payload.options.num_ctx = dynamicCtx;
```
For local models, detect the model's maximum supported context from `ollama show <model>` metadata and clamp to that ceiling.

**BOTTLENECK**: Larger `num_ctx` values consume more VRAM and slow generation. On 8GB VRAM systems, `num_ctx > 32768` on a 7B model may cause OOM. **Mitigation**: Pair this with interface-only dependency extraction (RC-14) and keyword clustering (RC-15) to keep actual prompt sizes small even without hard caps.

**SEVERITY**: **HIGH** — Causes truncated/incoherent output on complex projects.

---

### RC-5: No Inter-File Coherence Checking

**WHAT**

The Coder loop ([lines 1001-1080](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/orchestrator.ts#L1001-L1080)) generates each file independently. After all files are generated, there is **no cross-file consistency verification**:
- No check that JS `document.getElementById("display")` matches an HTML element with `id="display"`.
- No check that CSS selectors match actual HTML classes.
- No check that `fetch('/api/todos')` matches a route defined in another file.

**WHY IT CAUSES BAD CODE**

For HTML/CSS/JS projects (which bypass TypeScript type checking), cross-file mismatches cause **silent runtime errors** invisible to the linter. The user gets code that compiles but doesn't work.

**HOW TO FIX**

Add a post-Coder cross-file contract validation pass:
```typescript
// After Coder loop completes, before Tester:
const htmlFiles = vfsFiles.filter(f => f.endsWith('.html'));
const jsFiles = vfsFiles.filter(f => f.endsWith('.js'));
// Extract all DOM IDs from HTML, all getElementById/querySelector calls from JS
// Flag mismatches as warnings
```

**BOTTLENECK**: This is a pure Node.js check with no LLM calls — zero compute cost. Only risk is regex parsing fragility on complex HTML.

**SEVERITY**: **HIGH** — Cross-file mismatches cause runtime errors invisible to the current linter.

---

### RC-6: Debugger Repairs Are One-Shot and Don't Re-Run Linter

**WHAT**

The Debugger stage ([lines 905-979](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/orchestrator.ts#L905-L979)) repairs failing files but **does not re-lint** to verify the repair succeeded. And the pipeline is strictly linear — no Tester→Debugger feedback loop.

**WHY IT CAUSES BAD CODE**

The Debugger might introduce new errors while fixing old ones. Without re-verification, broken code passes to Security and Reviewer, which audit it as if it's correct.

**HOW TO FIX**

Add a bounded re-lint loop inside the Debugger stage:
```typescript
let repairAttempt = 0;
const maxRepairAttempts = 2;
for (const targetFile of failingFiles) {
  let fileContent = await readVirtualFile(conversationId, targetFile);
  let lintResult = await runLinter(conversationId, targetFile);
  while (!lintResult.success && repairAttempt < maxRepairAttempts) {
    repairAttempt++;
    // Send to Debugger LLM for repair
    // Write repaired code to VFS
    lintResult = await runLinter(conversationId, targetFile); // RE-LINT!
  }
}
```

**BOTTLENECK**: Each repair attempt = 1 LLM call. Max 2 attempts × N failing files. On slow local models, this could add 5–10 minutes. **Mitigation**: Use the smaller Tier 1 model for Debugger repairs (syntax fixes don't need 32B parameters), and abort repair after 2 attempts with a clear warning in the debug report.

**SEVERITY**: **MEDIUM** — Repaired code may still be broken but pipeline continues.

---

### RC-7: Linter Is TS-Only — HTML/CSS/JS Projects Get Minimal Validation

**WHAT**

[`runLinter()`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/linter.ts#L19-L152) provides:
- **`.ts`/`.tsx`/`.js`/`.jsx`**: TypeScript compiler diagnostics (but JS files suppress error codes `TS2304`, `TS2307`, `TS2552` at [line 130](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/linter.ts#L130)).
- **`.html`**: `<link>`/`<script>` reference checks + bracket balance.
- **`.css`/everything else**: Only bracket balance.

**WHY IT CAUSES BAD CODE**

For plain HTML/CSS/JS projects:
- JS typos like `document.getElementById("diplay")` pass (suppressed `TS2304`).
- Invalid CSS properties (`backgroud-color`) pass.
- CSS selector mismatches (`.calcuator` vs `.calculator`) pass.
- The pipeline reports "All tests passed" when the project has runtime bugs.

**HOW TO FIX**

1. Add CSS property name validation against a known-valid property list.
2. Add HTML-JS DOM ID cross-referencing (see RC-5).
3. For JS files, whitelist known browser globals (`document`, `window`, `console`, `fetch`, `setTimeout`, etc.) and re-enable `TS2304` for non-whitelisted identifiers.

**BOTTLENECK**: None significant — these are fast Node.js string checks.

**SEVERITY**: **MEDIUM** — False "all tests passed" for the most common project type (HTML/CSS/JS).

---

### RC-8: `sanitizeStageOutput()` Code Fence Stripping Is Insufficient for Coder

**WHAT**

[`sanitizeStageOutput()`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/orchestrator.ts#L305-L330) strips leading/trailing code fences. But local LLMs frequently emit:
- Preamble text: *"Here is the implementation:"*
- Language-tagged fences: `` ```html ``
- Trailing commentary: *"This covers all the requirements..."*

The Coder's `customUserContent` path doesn't use `EXPECTED_FIRST_HEADERS` for header-based anchoring, so preamble text survives sanitization.

**WHY IT CAUSES BAD CODE**

Preamble text gets written to VFS as part of the file. An HTML file starting with `"Here is the code:"` is invalid HTML that the bracket-balance linter won't catch.

**HOW TO FIX**

Add Coder-specific deep sanitization:
```typescript
if (agentName === 'Coder') {
  // Strip ALL markdown fences (including language tags)
  sanitized = sanitized.replace(/^```[a-zA-Z0-9]*\n?/gm, '').replace(/\n?```\s*$/gm, '');
  // Strip preamble before first code-like line
  const codeStart = sanitized.search(/^(<[!a-zA-Z]|[a-zA-Z_$*{\/])/m);
  if (codeStart > 0) sanitized = sanitized.substring(codeStart);
  // Strip trailing commentary after last code-like line
  const trailingMatch = sanitized.match(/\n\n(I hope|This implementation|This covers|Let me know|Note:).*/s);
  if (trailingMatch) sanitized = sanitized.substring(0, trailingMatch.index);
}
```

**BOTTLENECK**: Aggressive stripping risks removing legitimate code lines that start with English words (e.g., `This.prototype = ...`). **Mitigation**: Only strip preamble if the first line doesn't contain code-like characters (`<`, `{`, `(`, `=`, `//`, `/*`, `import`, `const`, `let`, `var`, `function`, `class`).

**SEVERITY**: **MEDIUM** — Especially bad with smaller local models that ignore format instructions.

---

### RC-9: No Quality Feedback Loop — Pipeline Is Strictly Linear

**WHAT**

The pipeline runs: `Queen → Planner → Architect → [Pause] → System → Designer → Blueprinter → Coder → Tester → Debugger → Security → Reviewer → Done`.

If the Reviewer identifies "Feature X is MISSING", the pipeline does not go back to the Coder. If Security finds a vulnerability, the pipeline does not go back to fix it.

**WHY IT CAUSES BAD CODE**

- Reviewer findings are written to `review_report.md` but **nobody reads them**.
- Security vulnerabilities are documented but never patched.
- The pipeline delivers first-draft code with no iterative improvement.

**HOW TO FIX**

Add a bounded re-synthesis check after Reviewer:
```typescript
if (stageName === 'Reviewer') {
  const reviewContent = stageOutput.content;
  if (reviewContent.includes('REQUIRES_REWORK') || reviewContent.includes('REJECTED')) {
    // Extract MISSING features from review
    // Re-run Coder for those specific files
    // Re-run Tester → Debugger
    // Max 1 rework iteration to prevent infinite loops
  }
}
```

**BOTTLENECK**: Each rework iteration re-runs Coder + Tester + Debugger, potentially adding 5–15 minutes on local models. **Mitigation**: Cap at 1 rework iteration. Only re-synthesize files flagged as MISSING/PARTIAL by the Reviewer, not the entire project.

**SEVERITY**: **MEDIUM** — Pipeline delivers first-draft code with no iterative improvement.

---

### RC-10: Blueprint `Specs Required` Section Extraction Regex Is Fragile

**WHAT**

[`extractSection()`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/orchestrator.ts#L348-L359) requires the section name to be a `###` header. If the upstream agent used `##` or `**bold**` instead, the regex returns `[Section not found]`.

**WHY IT CAUSES BAD CODE**

Failed section lookups inject literal error strings into the Coder's prompt, wasting tokens and confusing the LLM.

**HOW TO FIX**

Make the regex header-level-agnostic: `#{2,4}\s*${sectionName}`.

**SEVERITY**: **LOW** — Only triggers when LLM uses wrong header levels.

---

### RC-11: Potential Double EM Writes via `StageLedger.write()`

**WHAT**

`runAgent()` writes to ExecutiveMemory at [line 715](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/orchestrator.ts#L715-L723). `StageLedger.write()` also calls `writeExecutiveMemoryRecord()` at [line 395](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/memory.ts#L391-L399), but without `filePath`, `tokenCount`, `durationMs`, or `consumedInferenceIds`.

**WHY IT CAUSES BAD CODE**

Incomplete EM records can confuse `loadExecutiveMemory()` on pipeline resume — creating phantom ACTIVE records.

**HOW TO FIX**

Remove the `writeExecutiveMemoryRecord` call from `StageLedger.write()` since `runAgent()` already handles it.

**SEVERITY**: **LOW** — Latent defect on pipeline resume scenarios.

---

## Part 2: LLM Cognitive Failures

These are problems rooted in how transformer attention mechanisms process our prompts, regardless of how good the pipeline plumbing is.

---

### RC-12: Dumb Zone / Context Degradation — Dependency Code Floods the Coder's Attention Budget

**WHAT**

The **Dumb Zone** is the phenomenon where LLM accuracy drops 30–50% as the context window fills beyond ~8K–16K tokens. In AutoCoder, the Coder's prompt is assembled in [`buildCoderContext()`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/orchestrator.ts#L361-L382), which concatenates:
1. Blueprint section (~500–800 tokens)
2. **Raw dependency file code** (~500–5,000 tokens per dependency file)
3. Referenced spec sections (~200–800 tokens)

When generating File #8 of a 10-file project, the Coder may receive 4 dependency files totaling 12,000 tokens of raw source code. Combined with the system prompt (~750 tokens) and blueprint (~600 tokens), the total prompt reaches ~14,000 tokens.

**WHY IT CAUSES BAD CODE**

At 14K tokens, the LLM's attention density is measurably degraded. It "forgets" system prompt instructions (like "output raw code only") and blueprint specifications (like exact function names). The model defaults to generic patterns — writing `handleClick` instead of the blueprint-specified `appendNumber`, or using `#000000` instead of the Designer-specified `#1A1A2E`.

The Executive Memory system successfully prevents **inter-stage** context bloat by filtering with `UPSTREAM_AGENT_MAP` and superseding old records with `SUPERSEDED` status. But **within a single Coder call**, the raw dependency code dump pushes the prompt into the Dumb Zone.

**HOW TO FIX: Interface-Only Dependency Extraction**

Instead of passing full dependency file contents, extract only the **exported interface** (function signatures, class names, CSS selectors, DOM IDs):

```typescript
function extractInterface(filePath: string, content: string): string {
  if (filePath.endsWith('.html')) {
    // Extract DOM IDs and classes
    const ids = [...content.matchAll(/id=["']([^"']+)["']/g)].map(m => m[1]);
    const classes = [...content.matchAll(/class=["']([^"']+)["']/g)].map(m => m[1]);
    const scripts = [...content.matchAll(/src=["']([^"']+)["']/g)].map(m => m[1]);
    return `[DOM IDs]: ${ids.join(', ')}\n[CSS Classes]: ${classes.join(', ')}\n[Scripts]: ${scripts.join(', ')}`;
  }
  if (filePath.endsWith('.css')) {
    const selectors = [...content.matchAll(/^([.#][a-zA-Z][\w-]*)/gm)].map(m => m[1]);
    return `[CSS Selectors]: ${selectors.join(', ')}`;
  }
  if (filePath.endsWith('.js') || filePath.endsWith('.ts')) {
    const exports = [...content.matchAll(/export\s+(function|const|class|let|var)\s+(\w+)/g)].map(m => m[2]);
    return `[Exports]: ${exports.join(', ')}`;
  }
  return content.substring(0, 500); // fallback
}
```

This reduces a 3,000-token dependency dump to a ~50-token interface block, keeping the Coder's total prompt well under 4K tokens.

**BOTTLENECK**: Interface extraction misses implementation details that the Coder genuinely needs (e.g., the exact parameters of an exported function). **Mitigation**: For `.ts`/`.js` files, extract full function signatures (name + parameters + return type) rather than just names. For `.html`, include the complete element attributes of referenced IDs.

**SEVERITY**: **HIGH** — Directly causes the Coder to ignore blueprint specs on multi-file projects.

---

### RC-13: U-Shaped Attention — Blueprint Specs Fall Into the Middle Trough

**WHAT**

The **U-Shaped Attention** curve means LLMs pay high attention to the **first ~15% (Primacy)** and **last ~15% (Recency)** of a prompt, with 30–50% accuracy degradation for content in the middle.

In AutoCoder, the Coder's user message is assembled as:

```
[TOP / PRIMACY ZONE]     === BLUEPRINT ===     (File spec with function names, IDs, logic)
[MIDDLE / ATTENTION TROUGH]   === DEPENDENCY CODE ===   (Hundreds of lines of raw code)
[BOTTOM / RECENCY ZONE]  === REFERENCED SPECS ===  (Spec sections from VFS)
```

The **most critical information** (the Blueprint's exact function names, variable names, and implementation details) sits at the **top**, which benefits from Primacy. But when `DEPENDENCY CODE` spans 2,000+ tokens, the Blueprint is pushed far enough from the generation trigger that its details start to fade.

Additionally, inside each agent's system prompt, critical mid-prompt rules get buried. For example, in [`Architect.ts` line 40](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/registry/Architect.ts#L40):
> `"FOR ALL WEB APPLICATIONS: Frontend Entry Point MUST be 'index.html'"`

This rule sits at line 40 of a 130-line system prompt — deep in the attention trough. Smaller models frequently violate it.

**WHY IT CAUSES BAD CODE**

- The Coder generates code that loosely matches the blueprint's intent but uses **wrong function names, wrong variable names, or wrong element IDs** because the exact names were in the attention trough.
- The Architect places `index.html` inside `src/` instead of at the root because the entry-point rule was mid-prompt.

**HOW TO FIX: Sandwich Prompt Layout**

Restructure `buildCoderContext()` to place the Blueprint specification in **both** the Primacy and Recency zones:

```typescript
export async function buildCoderContext(
  conversationId: string,
  blueprintSection: string,
  dependencyCode: string
): Promise<string> {
  // PRIMACY: Target file name and high-level purpose
  const fileMatch = blueprintSection.match(/### File:\s*(.+)/i);
  const fileName = fileMatch ? fileMatch[1].trim() : 'unknown';
  let context = `TARGET FILE: ${fileName}\n\n`;

  // TROUGH: Dependency code and background specs (low-attention zone)
  if (dependencyCode) {
    context += `=== DEPENDENCY CODE ===\n${dependencyCode}\n\n`;
  }
  const specsNeeded = parseSpecsRequired(blueprintSection);
  if (specsNeeded.length > 0) {
    context += `=== REFERENCED SPECS ===\n`;
    for (const spec of specsNeeded) {
      const sectionText = await extractSection(conversationId, spec.file, spec.section);
      context += `--- [FROM ${spec.file}#${spec.section}] ---\n${sectionText}\n\n`;
    }
  }

  // RECENCY: Full blueprint spec repeated at the bottom (highest attention zone)
  context += `=== IMPLEMENTATION BLUEPRINT (FOLLOW EXACTLY) ===\n${blueprintSection}\n`;

  return context.trim();
}
```

Also, in all agent system prompts, **duplicate critical rules** at both the top (after the persona statement) and the bottom (in `=== ABSOLUTE RULES ===`):
```
// TOP of Architect.ts systemPrompt:
"CRITICAL: index.html MUST be at project root. NEVER inside src/."

// ... 100 lines of instructions ...

// BOTTOM of Architect.ts systemPrompt (ABSOLUTE RULES):
"- Do NOT place index.html inside src/ — it MUST be at project root or public/"
```

**BOTTLENECK**: Duplicating the blueprint at the bottom adds ~500–800 tokens. **Mitigation**: In the recency-zone copy, include only the `**Implementation Details**` subsection (the most critical part), not the full blueprint header with Purpose/Dependencies/Exports.

**SEVERITY**: **HIGH** — Causes wrong function names, wrong IDs, and wrong API paths even when the blueprint is correct.

---

### RC-14: Snapshot Truncation Over-Corrects — 600 Chars Starves Downstream Agents

**WHAT**

[`MAX_SNAPSHOT_CHARS = 600`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/orchestrator.ts#L178) in `extractSnapshotFromContent()` hard-truncates context snapshots. A typical Context Snapshot is 3 bullets × ~150 chars = ~450 chars, which fits. But when the Planner lists 8 features or the Architect lists 12 files, the snapshot truncates mid-sentence:

```
- **Feature Summary**: Basic Arithmetic (CRITICAL), Display (CRITICAL), Clear Function (HIGH), History...[SNAPSHOT TRUNCATED]
```

**WHY IT CAUSES BAD CODE**

Truncated features are never implemented. The downstream agents (Architect, Blueprinter, Coder) never learn about them.

**HOW TO FIX**

Replace hard character truncation with **bullet-preserving truncation**:
```typescript
function truncatePreservingBullets(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const lines = text.split('\n');
  let result = '';
  for (const line of lines) {
    if ((result + line + '\n').length > maxChars) break;
    result += line + '\n';
  }
  return result.trim() + '\n...[TRUNCATED]';
}
```
And increase `MAX_SNAPSHOT_CHARS` to 2000 characters.

**SEVERITY**: **MEDIUM** — Silent feature drops on complex projects.

---

### RC-15: No Keyword Clustering in Context Assembly — Raw Text Wastes Attention

**WHAT**

**Keyword Clustering** is the technique of organizing context into labeled semantic clusters (e.g., `[TECH STACK]`, `[DATABASE FIELDS]`, `[DOM SELECTORS]`) that function as attention anchors for the transformer's self-attention mechanism.

AutoCoder's agent system prompts **do use keyword clustering** effectively — bold-prefix key-value pairs like `- **Frontend**: Plain HTML/CSS/JS` create strong attention anchors in the output format.

But the **context assembly pipeline** (how information flows between agents) does **not** cluster information:

1. **Dependency Code**: Dumped as raw, unlabeled source code.
2. **Upstream Snapshots**: Extracted as raw markdown text without semantic labels.
3. **Spec Sections**: Injected as raw document fragments.

**WHY IT CAUSES BAD CODE**

When the Coder receives 2,000 tokens of raw HTML dependency code, the transformer's attention mechanism has no anchors to identify *what part* of the dependency is relevant. It wastes attention budget scanning through boilerplate `<meta>` tags and `<!DOCTYPE>` declarations to find the 3 DOM IDs it actually needs.

Contrast this with a clustered block:
```
[DOM IDs]: display, calc-container, btn-grid
[CSS Classes]: btn, btn-operator, btn-equals
[Script Entries]: calculator.js
```
The bold labels `[DOM IDs]:` act as **attention magnets** — the transformer's query vectors for "what ID should I use?" immediately lock onto the `[DOM IDs]` key.

**HOW TO FIX**

1. **Cluster dependency code** using the interface extraction from RC-12.
2. **Cluster upstream context** by replacing raw snapshot text with structured key-value blocks:
   ```typescript
   function clusterSnapshot(agentName: string, content: string): string {
     if (agentName === 'Architect') {
       const techStack = content.match(/### Tech Stack[\s\S]*?(?=\n###)/)?.[0] || '';
       const fileList = content.match(/### Project Folder Structure[\s\S]*?(?=\n###)/)?.[0] || '';
       return `[TECH STACK]\n${techStack}\n[FILE LIST]\n${fileList}`;
     }
     if (agentName === 'Designer') {
       const designSystem = content.match(/### Design System[\s\S]*?(?=\n###)/)?.[0] || '';
       return `[DESIGN SYSTEM]\n${designSystem}`;
     }
     return content;
   }
   ```

**SEVERITY**: **MEDIUM** — Reduces attention waste and hallucination on wrong identifiers.

---

## Part 3: Model Architecture Failures

These are problems caused by using a single LLM for all 11 stages.

---

### RC-16: Single Generalist Model Caps Code Quality at the Model's Weakest Capability

**WHAT**

In [`inference.ts`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/inference.ts#L40-L49), AutoCoder loads a single global model (e.g., `llama3:8b-instruct`) for all 11 stages. This model handles everything from project specification (Queen) to code synthesis (Coder) to security auditing (Security).

**WHY IT CAUSES BAD CODE**

- **Generalist instruction-tuned models** (like `llama3:8b-instruct`) excel at structured markdown output, strategic reasoning, and instruction following — perfect for Queen, Planner, Architect, Designer.
- **But they are measurably weaker at code generation** compared to dedicated code models (like `qwen2.5-coder`, `deepseek-coder-v2`, `codellama`). They hallucinate non-existent APIs, miss edge cases in logic, produce syntactically valid but semantically wrong code, and struggle with precise DOM manipulation.
- Conversely, **dedicated code models** are weaker at high-level strategic reasoning and structured markdown specification. Using a 32B code model for the Queen stage wastes compute and produces worse specifications.

**HOW TO FIX: Heterogeneous Agent Fleet**

Add a per-agent `model` override to `AgentDef`:

```typescript
// In agents.ts AgentDef interface:
export interface AgentDef {
  name: string;
  temperature: number;
  maxTokens: number;
  model?: string;        // Per-agent model override
  systemPrompt: string;
  schema: any;
  tools: string[];
}
```

Set model overrides in each registry file:
```typescript
// Queen.ts, Planner.ts, Architect.ts, System.ts, Designer.ts:
export const model = undefined; // Use default settings.json model (fast generalist)

// Blueprinter.ts, Coder.ts, Debugger.ts:
export const model = 'qwen2.5-coder:14b'; // Dedicated code model

// Security.ts, Reviewer.ts:
export const model = undefined; // Use default (reasoning-heavy, not code-heavy)
```

Pass the model override in `runAgent()` → `runInference()`:
```typescript
const rawResponse = await runInference(messages, {
  model: agentDef.model, // Routes to the agent's specific model
  temperature: agentDef.temperature,
  maxTokens: budget,
  timeoutMs,
  signal,
  onChunk,
});
```

Update `runInference()` to accept and use an optional model override:
```typescript
export async function runInference(messages: Message[], options: InferenceOptions = {}): Promise<string> {
  const config = await getLLMConfig();
  const modelToUse = options.model || config.ollamaModel; // Agent-specific or global default
  // ... use modelToUse in the Ollama/OpenAI/Anthropic payload
}
```

**SEVERITY**: **HIGH** — A dedicated code model typically improves code generation quality by 40–60% over a generalist model of the same parameter size.

---

### RC-17: Edge AI VRAM Constraints During Model Swaps

**WHAT**

When using multiple models on local Edge AI hardware, Ollama must unload one model from VRAM and load another during stage transitions. Currently, [`inference.ts` line 504](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/inference.ts#L504) sets:
```typescript
keep_alive: -1 // Keep model in VRAM indefinitely
```
With `keep_alive: -1`, the first model never releases VRAM, and loading the second model will either OOM crash or force CPU offloading (2–4 tokens/sec).

**WHY IT CAUSES BAD CODE**

If the model swap fails silently (Ollama falls back to CPU offloading), the Coder stage runs at 2–4 tokens/sec instead of 30–60 tokens/sec. The user perceives the pipeline as "frozen" and may abort before code generation completes, resulting in incomplete files.

**HOW TO FIX**

1. Change `keep_alive` to be dynamic based on whether multi-model routing is active:
   ```typescript
   const isMultiModel = agentDef.model && agentDef.model !== config.ollamaModel;
   payload.keep_alive = isMultiModel ? '5m' : -1;
   ```
2. Before loading a new model, explicitly unload the previous one:
   ```typescript
   if (previousModel && previousModel !== modelToUse) {
     await fetch(`${host}/api/generate`, {
       method: 'POST',
       body: JSON.stringify({ model: previousModel, keep_alive: 0 }), // Force unload
     });
   }
   ```

**BOTTLENECK**: Model swap latency is ~3–6 seconds per swap (SSD read speed dependent). In an 11-stage pipeline with 2 model transitions (Tier 1 → Tier 2 at Blueprinter, Tier 2 → Tier 1 at Security), total swap overhead is ~6–12 seconds — negligible compared to the minutes saved by using faster models for spec stages.

**SEVERITY**: **MEDIUM** — Only affects multi-model Edge AI deployments.

---

### RC-18: Recommended Hardware-Tier Model Assignments

This is a reference table for configuring the heterogeneous fleet based on available hardware:

| Hardware Tier | VRAM | Tier 1: Spec Stages | Tier 2: Code Stages | Swap Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **Budget** (RTX 3060, M1 16GB) | 8–12 GB | `llama3.1:8b` (4.7 GB) | `qwen2.5-coder:7b` (4.7 GB) | Sequential swap. `keep_alive: '2m'`. |
| **Mid-Range** (RTX 4070, M2 Pro 32GB) | 16–24 GB | `llama3.1:8b` (4.7 GB) | `qwen2.5-coder:14b` (9.0 GB) | Both fit simultaneously. `keep_alive: -1`. |
| **High-End** (RTX 4090, Mac Studio 64GB) | 24–48 GB | `qwen2.5:14b` (9.0 GB) | `qwen2.5-coder:32b` (20 GB) | Both fit simultaneously. Maximum quality. |
| **API Mode** (No local GPU) | N/A | `gpt-4o-mini` | `claude-3.5-sonnet` or `gpt-4o` | No VRAM concerns. Cost-optimize spec calls. |

---

## Part 4: Total Compute Impact Analysis

### Current State: Single Model Pipeline

Using `llama3:8b` (8B parameters) for all 11 stages, generating ~18,000 total tokens:
- **Total parameter evaluations**: 18,000 × 8B = **144 Trillion**
- **Wall time**: ~8–12 minutes on RTX 3060
- **Code quality**: Limited by generalist model's code capability

### Proposed State: Heterogeneous Fleet

Using `llama3:8b` for 6 spec stages (~8,000 tokens) + `qwen2.5-coder:14b` for 3 code stages (~10,000 tokens):
- **Spec evaluations**: 8,000 × 8B = 64 Trillion
- **Code evaluations**: 10,000 × 14B = 140 Trillion
- **Total**: 64T + 140T = **204 Trillion** (42% more compute, but allocated where it matters)
- **Wall time**: ~6–10 minutes (spec stages run faster, code stages slightly slower)
- **Code quality**: Dramatically improved — code model specialized for syntax, imports, logic

The net result is **better code in roughly the same wall time**, with the additional compute concentrated entirely on the stages that determine final output quality.

---

## Prioritized Remediation Roadmap

### Phase 1 — Data Flow & Cognitive Fixes (Highest Impact, Lowest Risk)
| Priority | RC # | Fix | Estimated Effort |
| :--- | :--- | :--- | :--- |
| P0 | RC-1 | Inject Designer/System/Architect context into `buildCoderContext()` | 1 hour |
| P0 | RC-2 | Feed VFS source files to Security and Reviewer | 1 hour |
| P0 | RC-13 | Sandwich prompt layout — blueprint at top AND bottom | 2 hours |
| P1 | RC-12 | Interface-only dependency extraction | 3 hours |
| P1 | RC-15 | Keyword clustering for context assembly | 3 hours |
| P1 | RC-8 | Coder-specific deep sanitization for code fences | 1 hour |

### Phase 2 — Model Architecture & Validation (High Impact, Medium Risk)
| Priority | RC # | Fix | Estimated Effort |
| :--- | :--- | :--- | :--- |
| P1 | RC-16 | Per-agent model override in `AgentDef` + `runInference()` | 2 hours |
| P1 | RC-17 | Dynamic `keep_alive` and explicit model unloading | 1 hour |
| P2 | RC-3 | Full spec injection for Blueprinter | 2 hours |
| P2 | RC-14 | Bullet-preserving snapshot truncation + increase to 2000 chars | 1 hour |
| P2 | RC-6 | Post-Debugger re-linting loop | 2 hours |
| P2 | RC-7 | CSS validation + DOM ID cross-checking | 3 hours |

### Phase 3 — Architecture Evolution (Medium Impact, Higher Risk)
| Priority | RC # | Fix | Estimated Effort |
| :--- | :--- | :--- | :--- |
| P2 | RC-5 | Cross-file contract validation pass | 4 hours |
| P2 | RC-9 | Bounded Reviewer→Coder feedback loop | 4 hours |
| P3 | RC-4 | Dynamic `num_ctx` sizing | 2 hours |
| P3 | RC-10 | Header-level-agnostic section extraction regex | 30 minutes |
| P3 | RC-11 | Remove double EM write from `StageLedger.write()` | 30 minutes |
