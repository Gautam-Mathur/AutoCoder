# AutoCoder: Complete Audit & Fix Specification

> **Methodology**: 4 parallel deep-scan research agents read every line of every source file.  
> **Source of Truth**: Actual source code and runtime behavior ONLY. No README claims, comments, or UI labels treated as evidence.  
> **Date**: 2026-09-08  
> **Commit**: HEAD of `origin/main`

---

## What AutoCoder Is

AutoCoder (internal codename AutoGod) is a multi-agent autonomous software engine that turns a single natural-language prompt into a complete, working, multi-file web application — without a human writing a line of code in between. Built on the RuFlo Multi-Agent Architecture: 11 specialized agents (Queen → Planner → Architect → System → Designer → Blueprinter → Coder → Tester → Debugger → Security → Reviewer) running through a deterministic pipeline, backed by a Virtual File System, an in-loop linter with self-healing, dual-tier executive memory, and a live Next.js frontend.

## 4 Non-Negotiable Goals

1. Full Code via Pipeline — pipeline must go all the way from prompt to deployable codebase (Supports R1, R2, R4, R17)
2. Quality Code, Minimum Time — speed and correctness both required, structurally enforced (Supports R5, R7, R8, R10, R11)
3. Can Edit Code — generated code must be modifiable by both agents and humans (Supports R6, R9, R13)
4. Can Host on Vercel — final output must be deployable, not just code in a repo (Supports R14, R15, R16, R17)

*(Note: R3 maps to goals 1 and 2, R12 maps to goals 2 and 3)*

# PART I — CURRENT STATE vs. FINAL GOAL: EXHAUSTIVE AUDIT

---

## Executive Summary

| Metric | Count |
|:---|:---|
| Total Final Goal Requirements Audited | 17 |
| **IMPLEMENTED** (fully working as specified) | 5 |
| **PARTIAL** (exists but incomplete/broken) | 7 |
| **MISSING** (not implemented at all) | 5 |
| P0 Critical Bugs Found | 9 |
| P1 High Bugs Found | 17 |
| P2 Medium Bugs Found | 14 |
| P3 Low Issues Found | 7 |

**Bottom Line**: AutoCoder has a functional 11-stage pipeline skeleton that can generate multi-file projects from a single prompt. However, 5 of 17 final-goal capabilities are completely missing (ReAct tools, surgical `applyDiff()` repairs, Monaco editing, Vercel compatibility, test suite), and 7 more are partially broken (upstream invalidation, self-healing scope, context plumbing, abort UI, SSE reliability, memory query, schema enforcement). The system can produce code but cannot reliably guarantee that code builds, runs, or deploys without human intervention.

---

## Part I — Table of Contents

1. [R1: Single Prompt → Complete Web App](#r1-single-prompt--complete-web-app)
2. [R2: Deterministic 11-Agent Pipeline](#r2-deterministic-11-agent-pipeline)
3. [R3: No Human Coding/Debugging Intervention](#r3-no-human-codingdebugging-intervention)
4. [R4: Complete Blueprint-to-VFS Coverage](#r4-complete-blueprint-to-vfs-coverage)
5. [R5: Structurally Enforced Quality](#r5-structurally-enforced-quality)
6. [R6: Self-Healing](#r6-self-healing)
7. [R7: AST/Regex/Import/DOM/Build Validation](#r7-astregexiportdombuild-validation)
8. [R8: Bounded Retries](#r8-bounded-retries)
9. [R9: Surgical applyDiff() Repairs](#r9-surgical-applydiff-repairs)
10. [R10: ReAct Tools](#r10-react-tools)
11. [R11: Dual-Tier Executive Memory](#r11-dual-tier-executive-memory)
12. [R12: Upstream Dependency Invalidation](#r12-upstream-dependency-invalidation)
13. [R13: Monaco Human Editing](#r13-monaco-human-editing)
14. [R14: Persistent VFS/State](#r14-persistent-vfsstate)
15. [R15: Ollama/Local-Model Support](#r15-ollamalocal-model-support)
16. [R16: flushVfsToDisk()](#r16-flushvfstodisk)
17. [R17: Generated Projects Build & Are Vercel-Compatible](#r17-generated-projects-build--are-vercel-compatible)
18. [P0 Critical Bug Registry](#p0-critical-bug-registry)
19. [P1 High Bug Registry](#p1-high-bug-registry)
20. [P2–P3 Issue Registry](#p2p3-issue-registry)

---

## R1: Single Prompt → Complete Web App

| Aspect | Status |
|:---|:---|
| **Overall** | **PARTIAL** |
| Single prompt input | ✅ IMPLEMENTED |
| Multi-file output | ✅ IMPLEMENTED |
| Deployable output | ❌ NOT VERIFIED |

### Evidence

**Working**: User enters a natural-language prompt on `LandingDashboard` (`src/app/page.tsx:60–92`). It creates a `Conversation` record (`POST /api/conversations`), redirects to `/workspace`, and auto-triggers the SSE pipeline stream (`WorkspaceContent.tsx:236–246`). The orchestrator runs all 11 stages and produces multiple files in VFS.

**Broken**: "Deployable" is unverified because:
1. No build step (`npm run build`, `vite build`) is ever executed on generated code.
2. No deployment target validation exists (no `vercel.json`, no Dockerfile, no static export).
3. The `launchVSCodePreview` function (`orchestrator.ts:548–586`) runs `node <entry>` or `npx serve` locally — this is a dev preview, not a deployment verification.
4. Generated `index.html` files are auto-injected by `parseBlueprintFiles()` when missing, but the injected HTML is a generic skeleton that may not match the actual generated CSS/JS filenames.

### Failure Modes
- Blueprint LLM may omit `index.html` for web projects → auto-injection fires but uses heuristic CSS/JS file guesses.
- No verification that `<script src="...">` paths in generated HTML match actual generated filenames.
- No `npm install` or dependency resolution for projects requiring npm packages.

---

## R2: Deterministic 11-Agent Pipeline

| Aspect | Status |
|:---|:---|
| **Overall** | **IMPLEMENTED** |
| All 11 stages defined | ✅ |
| Deterministic execution order | ✅ |
| Stage resumption from pause | ✅ |
| Quality gate at Architect | ✅ |

### Evidence

**`STAGES` array** (`orchestrator.ts:966–978`):
```
Queen → Planner → Architect → System → Designer → Blueprinter → Coder → Tester → Debugger → Security → Reviewer
```

**Stage dispatch** (`orchestrator.ts:1007–1405`):
- `Tester` → Deterministic linter (no LLM), writes `test_report.md`
- `Debugger` → SLM Thinking Gate triage (`RETRY`/`SKIP`/`ABORT`), repairs failing files
- `Coder` → Per-file synthesis from blueprint with in-loop self-healing
- `Blueprinter` → Ingests all 5 upstream spec markdown files
- `Security` & `Reviewer` → Ingests specs + up to 30,000 chars of generated code
- Default stages (Queen–Designer) → Standard `runAgent()` + VFS flush

**Resume mechanism**: `POST /api/pipeline/resume` computes next stage and calls `runOrchestrator(..., nextStage)` (`resume/route.ts:56–65`).

**Quality Gate**: Architect completion pauses pipeline if `!conversation.qualityGateOverride` (`orchestrator.ts:1391–1405`).

### Issues
- **P2**: Concurrent SSE connections can trigger duplicate orchestrator loops (see [P0-2](#p0-2-concurrent-orchestrator-race-condition)).

---

## R3: No Human Coding/Debugging Intervention

| Aspect | Status |
|:---|:---|
| **Overall** | **PARTIAL** |
| Automated code generation | ✅ |
| Automated linting | ✅ |
| Automated repair | ✅ (limited) |
| Zero human intervention needed | ❌ |

### Evidence

**Working**: The Coder self-healing loop (`orchestrator.ts:1221–1260`) automatically repairs linter-detected errors with up to 2 retries per file. The Debugger stage reads `test_report.md` and repairs failing files.

**Broken — Human intervention still required for**:
1. **Architect Quality Gate**: Pipeline pauses and waits for user approval after Architect stage. User must click "Approve" to continue.
2. **Conflict Resolution**: If `contextResolver.ts` detects spec conflicts, pipeline pauses at `PAUSE_CONFLICT` gate requiring user selection.
3. **Clarification Requests**: Queen can emit `PAUSE_CLARIFICATION` requiring user input.
4. **Infrastructure Failures**: Ollama disconnections pause (not fail) the pipeline, requiring user to restart Ollama and resume.
5. **No abort mechanism**: Once started, the pipeline cannot be stopped from the UI (see [P0-3](#p0-3-abort-button-completely-unwired)).

---

## R4: Complete Blueprint-to-VFS Coverage

| Aspect | Status |
|:---|:---|
| **Overall** | **IMPLEMENTED** |
| Every blueprint file gets coded | ✅ |
| Files written to VFS | ✅ |
| Files written to disk | ✅ |

### Evidence

**Blueprint parsing** (`orchestrator.ts:600–686`): `parseBlueprintFiles()` splits blueprint text on `### File:` headers, extracts file paths, dependencies, and implementation details.

**Coder loop** (`orchestrator.ts:1152–1308`): Iterates through every `BlueprintFileSection`, synthesizes code for each file via `runAgent('Coder', ...)`, and writes output to both VFS (`writeVirtualFile`) and disk (`writeProjectFile`).

**Entry point guard**: If web project lacks `index.html`, `parseBlueprintFiles()` auto-injects one as File #1 (`orchestrator.ts:639–667`).

**Cross-file DOM coherence check** (`orchestrator.ts:1264–1288`): After all files are generated, validates that JS `getElementById` / `querySelector('#...')` calls reference IDs declared in HTML files.

### Issues
- **P1**: Auto-injected `index.html` uses heuristic file guesses (`cssFiles[0] || 'style.css'`, `jsFiles[jsFiles.length - 1] || 'script.js'`) which may not match actual generated filenames.
- **P2**: `validateBlueprintImports()` only checks that listed dependencies exist in the blueprint — doesn't verify that the Coder actually `import`s them correctly.

---

## R5: Structurally Enforced Quality

| Aspect | Status |
|:---|:---|
| **Overall** | **PARTIAL** |
| Schema validation on LLM output | ❌ NOT ENFORCED |
| Required section header validation | ✅ |
| Output sanitization | ✅ |

### Evidence

**Schema defined but never enforced**: Every agent exports a `schema` object (e.g., `{ type: 'object', properties: { content: { type: 'string' } }, required: ['content'] }`). However, `orchestrator.ts` **never reads or validates against `agentDef.schema`**. The schema is dead code.

**Header validation**: `sanitizeStageOutput()` (`orchestrator.ts:326–351`) strips markdown fences, preamble text, and ensures output starts with the expected `### Header`. `EXPECTED_FIRST_HEADERS` maps each agent to its required first header (`orchestrator.ts:167–178`).

**Output sanitization**: `sanitizeCoderOutput()` strips markdown code fences from Coder output. `sanitizeCoderOutputForFile()` further cleans file-specific artifacts.

### Issues
- **P1**: JSON schema enforcement is completely absent — LLM can return any shape of text and it will be accepted as long as it starts with the right markdown header.
- **P2**: `EXPECTED_FIRST_HEADERS` excludes System agent (commented out) because System has two valid start headers. This means System output receives NO header validation.

---

## R6: Self-Healing

| Aspect | Status |
|:---|:---|
| **Overall** | **PARTIAL** |
| Coder in-loop repair | ✅ |
| Debugger post-hoc repair | ✅ |
| Oscillation detection | ✅ |
| Full-scope self-healing | ❌ |

### Evidence

**Coder self-healing** (`orchestrator.ts:1221–1260`):
- After each file is generated, runs `runLinter()`.
- If linter fails: up to 2 repair attempts.
- ≤3 errors → surgical diff prompt ("fix ONLY the errored lines").
- \>3 errors → full rewrite prompt with blueprint + errors.
- Writes repaired code to VFS + disk and re-runs linter.

**Debugger repair** (`orchestrator.ts:1046–1149`):
- Reads `test_report.md`, identifies failing files via regex `/- \*\*(.+?)\*\*/`.
- SLM Thinking Gate (`orchestratorThinkDebugger`) triages: `RETRY`, `SKIP`, or `ABORT`.
- If `RETRY`: constructs repair prompt per failing file, executes `runAgent('Debugger', ...)`, writes fixed code, runs post-lint verification.

**Oscillation detection** (`memory.ts:365–394`):
- MD5 hash history per file in `StageLedger`.
- If a file's content hash matches any previously seen hash, throws `Oscillation detected` error to prevent infinite Coder↔Debugger loops.

**What's missing**:
- No self-healing for non-code stages (Queen, Planner, Architect, System, Designer, Blueprinter). If these produce malformed output, only `sanitizeStageOutput()` strips fences — no retry or re-invocation.
- Retry prefix (`[RETRY ${attempt}/3]`) exists in `runAgent()` for attempt > 1, but only Coder/Debugger ever call `runAgent` with `attempt > 1`.

---

## R7: AST/Regex/Import/DOM/Build Validation

| Aspect | Status |
|:---|:---|
| **Overall** | **PARTIAL** |
| TypeScript AST diagnostics | ✅ |
| HTML link/script validation | ✅ |
| CSS property validation | ✅ |
| Bracket balance checking | ✅ |
| Cross-file import validation | ✅ |
| Cross-file DOM coherence | ✅ |
| Next.js `'use client'` enforcement | ✅ |
| Prisma schema validation | ✅ |
| Build validation (`npm run build`) | ❌ MISSING |
| Runtime validation | ❌ MISSING |

### Evidence — What EXISTS (`linter.ts`, 533 lines)

1. **TypeScript Compiler Diagnostics** (Lines 83–163): Creates virtual `ts.createCompilerHost`, compiles AST with `ts.createProgram`, evaluates `ts.getPreEmitDiagnostics`. Suppresses TS2307, TS1479, TS7016, TS2304, TS2552 for `.js`/`.jsx` files only (Lines 151–154).

2. **HTML Validation** (`runHtmlLinkCheck`, Lines 303–364): Verifies `<link href>` CSS files exist in workspace. Verifies `<script src>` JS files exist. Enforces `type="module"` if script contains ES module syntax.

3. **CSS Validation** (`runCssPropertyCheck`, Lines 366–420): Validates bracket matching. Compares properties against ~70 `COMMON_CSS_PROPS`. Flags unrecognized properties as warnings. Ignores CSS variables and vendor prefixes.

4. **Bracket Balance** (`runBracketBalanceCheck`, Lines 180–301): State-aware check for `{}` `()` `[]`. Correctly handles single-line comments, multi-line comments, strings, template literals, and escape characters.

5. **Cross-File Import Validation** (`runCrossFileImportCheck`, Lines 455–532): Analyzes relative imports, resolves target extensions, verifies target files exist, verifies named imports match actual exports.

6. **DOM Coherence** (`orchestrator.ts:1264–1288`): Extracts HTML `id=` declarations, extracts JS `getElementById`/`querySelector('#...')` references, warns on mismatches.

7. **Next.js Client Directive** (Lines 132–144): Checks for React hooks without `'use client'` directive in `app/` directory files.

### Evidence — What's MISSING

- **No `npm run build`**: Generated projects are never built. There is no invocation of `tsc`, `vite build`, `next build`, or any build tool on generated code.
- **No runtime testing**: No `node <file>`, no browser automation, no Puppeteer/Playwright, no HTTP request to verify endpoints work.
- **No `npm install`**: Even if `package.json` is generated, dependencies are never installed.

---

## R8: Bounded Retries

| Aspect | Status |
|:---|:---|
| **Overall** | **IMPLEMENTED** |

### Evidence

1. **Coder in-loop**: `repairAttempt < 2` → max 2 repair attempts per file (`orchestrator.ts:1224`).
2. **Debugger triage**: SLM Thinking Gate returns `RETRY`, `SKIP`, or `ABORT`. On `SKIP`/`ABORT`, Debugger marks report and moves on (`orchestrator.ts:1061–1073`).
3. **`runAgent()` retry prefix**: `[RETRY ${attempt}/3]` indicates 3 total attempts (1 original + 2 retries) (`orchestrator.ts:751`).
4. **Oscillation detection**: MD5 hash history prevents infinite Coder↔Debugger loops (`memory.ts:385–389`).

---

## R9: Surgical `applyDiff()` Repairs

| Aspect | Status |
|:---|:---|
| **Overall** | **MISSING** (exists in VFS but never used) |

### Evidence

**`applyDiff()` exists** in `vfs.ts` (Lines 156–207):
- Takes `conversationId`, `filePath`, `startLine`, `endLine`, `newContent`.
- Reads current file, splices lines, writes back to Prisma + disk.
- Properly uses file locking via `acquireLock()`.

**`applyDiff()` is NEVER called**:
- `orchestrator.ts` Line 11 imports: `writeVirtualFile, readVirtualFile, listVirtualFiles, flushVfsToDisk, safeWriteFileSync` — **`applyDiff` is NOT imported**.
- Neither Coder self-healing nor Debugger repair uses `applyDiff()`. Both overwrite entire file contents via `writeVirtualFile()`.
- The Coder repair prompt says "fix ONLY the errored lines" but the implementation replaces the entire file, not just the diffed section.

**Toolbox also exists but is unused**: `toolbox.ts` implements `read_file`, `write_file`, `apply_diff`, `list_files`, `check_syntax` as ReAct tools. `toolbox.ts` is **never imported or executed** by the orchestrator or any agent.

> **Severity: P1** — The "surgical repair" capability exists in code but is dead code. All repairs are full-file rewrites, which risks regressing working sections of code.

---

## R10: ReAct Tools

| Aspect | Status |
|:---|:---|
| **Overall** | **MISSING** |
| Tool definitions exist | ✅ (dead code) |
| Tool execution engine | ❌ |
| Action/observation cycle | ❌ |
| Agents with tools configured | ❌ (all `tools: []`) |

### Evidence

**`toolbox.ts` exists** with 5 tool implementations:
- `read_file`: Read VFS file content
- `write_file`: Write to VFS
- `apply_diff`: Line-range replacement
- `list_files`: List VFS files
- `check_syntax`: Run linter on a file

**But**: `toolbox.ts` is **never imported** by `orchestrator.ts`, `agents.ts`, `inference.ts`, or any other module.

**All agents have `tools: []`** (`agents.ts:24–34`). Even agents that export `allowedTools` (Coder, Tester, Debugger, Security, Reviewer) set them to `[]`.

**No ReAct loop exists**: There is no action/observation cycle, no tool result parsing, no iterative tool invocation anywhere in the codebase. `runInference()` in `inference.ts` has zero support for OpenAI function calling (`tools`, `tool_choice`), Anthropic tool definitions, or Ollama tool calling. The engine only exchanges raw string messages.

> **Severity: P0** — This is a core architectural capability that is completely unimplemented despite being a stated Final Goal requirement.

---

## R11: Dual-Tier Executive Memory

| Aspect | Status |
|:---|:---|
| **Overall** | **PARTIAL** |
| Tier 1: In-memory StageLedger | ✅ |
| Tier 2: Database ExecutiveMemory | ✅ |
| Memory hydration from DB | ✅ |
| Memory query across agents | ⚠️ BROKEN |
| Ownership enforcement | ✅ |

### Evidence

**Tier 1 — StageLedger** (`memory.ts`):
- In-memory state object with per-agent fields.
- `OWNERSHIP` map (Lines 31–43) enforces strict 1:1 write isolation — agents can only write to their designated field.
- `write()` method validates ownership, detects oscillation via MD5 hash history.
- `query()` method allows cross-agent reads with field selection.

**Tier 2 — ExecutiveMemory** (Prisma model):
- `writeExecutiveMemoryRecord()` persists agent output snapshots to SQLite.
- `loadExecutiveMemory()` hydrates StageLedger from DB on pipeline resume.
- `buildStageContext()` (`orchestrator.ts:264–306`) extracts `### Context Snapshot` sections from upstream agents' DB records via `UPSTREAM_AGENT_MAP`.

**Broken — Memory Query** (`memory.ts:326–351`):
- `StageLedger.query()` **ignores the `agentName` parameter** — no authorization or visibility restrictions.
- When memory is hydrated from DB, agents' markdown is wrapped as `{ content: "markdown_string" }` (Lines 79–80). If a caller queries `select: ['features']`, `key in data` evaluates to `false` because `data` only contains `{ content: string }`. All structured field access returns `null`.
- The `token-budgeter.ts` relies on structured access like `taskSpec?.mvpScope`, which always returns `undefined`, falling through to `countMarkdownItems()` heuristic.

> **Severity: P1** — The dual-tier architecture exists but the query layer is fundamentally broken for structured access. Only raw markdown retrieval works.

---

## R12: Upstream Dependency Invalidation

| Aspect | Status |
|:---|:---|
| **Overall** | **PARTIAL** |
| DB invalidation | ✅ |
| In-memory invalidation | ❌ |
| Complete stage coverage | ❌ |
| SML table invalidation | ❌ |

### Evidence

**`handleUpstreamModification()`** (`memory.ts:271–295`):
- Marks downstream stages as `'INVALIDATED'` in `ExecutiveMemory` DB table.
- Flushes in-memory `conversationNodeCache`.

**Critical Gaps**:

| Modified Stage | Stages Invalidated | Stages MISSED |
|:---|:---|:---|
| Queen | Planner, Architect, System, Designer, Tester | **Blueprinter, Coder, Debugger, Security, Reviewer** |
| Planner | Architect, System, Designer, Tester | **Blueprinter, Coder, Debugger, Security, Reviewer** |
| Architect | System, Designer, Tester | **Blueprinter, Coder, Debugger, Security, Reviewer** |
| System | Designer, Tester | **Blueprinter, Coder, Debugger, Security, Reviewer** |
| Designer | Blueprinter, Coder, Tester | **Debugger, Security, Reviewer** |
| Blueprinter | *(no handler)* | **All downstream** |
| Coder | *(no handler)* | **All downstream** |

**Additional issues**:
1. In-memory `StageLedger` instance is NOT updated — only DB rows are marked. A running pipeline will not see the invalidation.
2. SML tables (`AgentOutput`, `AgentIndex`) are never invalidated — stale data continues to be served.

> **Severity: P1** — Modifying Queen does not invalidate Blueprinter or Coder, meaning stale blueprints and code persist.

---

## R13: Monaco Human Editing

| Aspect | Status |
|:---|:---|
| **Overall** | **MISSING** (read-only viewer only) |

### Evidence

**Monaco editor exists** (`WorkspaceContent.tsx:1627–1640`):
- Uses `@monaco-editor/react` v4.7.0
- `theme="vs-dark"`, language auto-detection
- **`readOnly: true`** and **`domReadOnly: true`** — explicitly prevents editing

**No save mechanism**: There is no `onSave`, no `onEdit`, no `onChange` handler, no `PUT`/`POST` API endpoint to write file edits back to VFS.

**No dirty state tracking**: No modified-file indicators, no unsaved-changes warnings.

> **Severity: P1** — The Final Goal specifies "Monaco human editing" but the current implementation is a read-only code viewer with no editing capability.

---

## R14: Persistent VFS/State

| Aspect | Status |
|:---|:---|
| **Overall** | **IMPLEMENTED** |

### Evidence

**VFS** (`vfs.ts`, 238 lines):
- `VirtualFile` Prisma model with compound key `conversationId_filePath`.
- `writeVirtualFile()`: Upserts to Prisma + immediate disk sync via `safeWriteFileSync()`.
- `readVirtualFile()`: Reads from Prisma.
- `listVirtualFiles()`: Lists all files for a conversation.
- File-level locking via Promise-chain mutex (`acquireLock()`).
- Disk writes to `projects/<conversationId>/`.

**State persistence**:
- `ExecutiveMemory` table stores per-stage snapshots with JSON content.
- `ExecutionHistory` table logs all pipeline events.
- `AgentOutput` + `AgentIndex` tables store raw LLM outputs with indexed paths.
- Conversation status persisted across browser refreshes.

### Issues
- **P2**: `VirtualFile` has **no foreign key relation** to `Conversation` — no cascade delete. Deleting a conversation orphans all its VFS records permanently.
- **P3**: File locking is in-process only — does not coordinate across multiple Node.js instances.

---

## R15: Ollama/Local-Model Support

| Aspect | Status |
|:---|:---|
| **Overall** | **IMPLEMENTED** |

### Evidence

**Ollama branch** (`inference.ts:506–598`):
- Health check via `/api/tags` with 5s timeout.
- Streaming via NDJSON line reader on `/api/chat`.
- `keep_alive: -1` → permanent VRAM retention.
- Dynamic `num_ctx` calculation: `min(131072, max(32768, ceil(promptChars/4) + maxTokens + 512))`.
- `format: 'json'` for structured output.

**Timeout configuration**:
- Undici HTTP dispatcher: 1,440,000,000 ms (400 hours) for `headersTimeout`, `bodyTimeout`, `keepAliveTimeout`.
- Inference timeout: `options.timeoutMs || 1440000000` (400 hours default).
- Keep-alive daemon: Pings every 10s with 3s timeout.

**Model discovery fallback** (`inference.ts:68–100`): Tries `localhost:11434` then `127.0.0.1:11434`, lists models via `/api/tags`.

**OpenAI & Anthropic also supported** (non-streaming, standard `fetch`).

---

## R16: `flushVfsToDisk()`

| Aspect | Status |
|:---|:---|
| **Overall** | **IMPLEMENTED** |

### Evidence

**`flushVfsToDisk()`** (`vfs.ts:213–237`):
- Queries all `VirtualFile` rows for conversation.
- Writes each to `projects/<conversationId>/<sanitizedPath>`.
- Cleans HTML charset corruption (`UTF-[\u4e00-\u9fa5]8` → `UTF-8`).
- Uses `safeWriteFileSync()`: verifies not a directory, creates parent dirs recursively.

**Called from**:
- `orchestrator.ts` finally block (Line 1447) — always flushes on pipeline completion/failure.
- `orchestrator.ts` default stage handler (Line 1388) — flushes after each spec stage.
- `download/route.ts` (Line 18) — flushes before ZIP generation.
- `orchestrator.ts` preview launch (Line 550) — flushes before `launchVSCodePreview`.

---

## R17: Generated Projects Build & Are Vercel-Compatible

| Aspect | Status |
|:---|:---|
| **Overall** | **MISSING** |
| Build verification | ❌ |
| Vercel config | ❌ |
| Vercel runtime compatibility | ❌ |

### Evidence

**No build verification**: Generated projects are never compiled or built. No invocation of `tsc`, `vite build`, `next build`, `npm run build`, or any build tool.

**No `vercel.json`**: Does not exist anywhere in the repository.

**Severe Vercel incompatibilities in AutoCoder itself**:
1. **Read-only filesystem**: SQLite (`dev.db`), VFS disk writes (`projects/`), and settings file (`settings.json`) all write to `process.cwd()`. Vercel serverless functions have read-only filesystems.
2. **Native modules**: `better-sqlite3` requires C++ compilation against Amazon Linux 2023 runtime.
3. **Execution timeout**: Full 11-agent pipeline exceeds Vercel's 10s (Hobby) / 300s (Pro) limits.
4. **Process spawning**: `launchVSCodePreview` spawns `node`/`npx serve` child processes. Serverless cannot bind ports or run daemons.
5. **Localhost Ollama**: Health checks and inference target `localhost:11434`. Ollama doesn't exist in serverless containers.
6. **In-memory state**: `activePipelines`, `pipelineAbortControllers`, `pipelineEvents` are Node.js singletons that cannot be shared across Lambda instances.

> **Severity: P0** — AutoCoder is architecturally incompatible with Vercel deployment and has zero build verification for generated projects.

---

## P0 Critical Bug Registry

### P0-1: ReAct Tool System Completely Dead
- **File**: `src/lib/agents/ruflo/toolbox.ts`, `src/lib/agents/ruflo/agents.ts:24–34`
- **Description**: `toolbox.ts` implements 5 ReAct tools (`read_file`, `write_file`, `apply_diff`, `list_files`, `check_syntax`). None are imported, referenced, or executed anywhere. All 11 agents have `tools: []`. No action/observation loop exists. `runInference()` has zero tool-call support.
- **Impact**: Agents cannot read/write files, check syntax, or iterate on their own output mid-generation. The entire ReAct paradigm is unimplemented.

### P0-2: Concurrent Orchestrator Race Condition
- **File**: `src/app/api/pipeline/stream/route.ts:73–98`
- **Description**: `activePipelines.has(conversationId)` is checked at line 73, followed by 3 async `await prisma...` queries before `runOrchestrator` at line 98. Two concurrent SSE connections (duplicate tabs, fast reconnects) both see `has() === false` and launch two parallel orchestrator loops on the same conversation.
- **Impact**: Two orchestrator instances clobber each other's VFS files, DB state, and ledger entries, producing corrupted output.

### P0-3: Abort Button Completely Unwired
- **File**: `src/components/TopAppBar.tsx:119–121`
- **Description**: The "Halt Pipeline" button has **NO `onClick` handler**. Zero callers of `/api/pipeline/abort` exist in the entire frontend. The button only renders during `Paused` state (not `Active`), meaning during active compilation no abort button exists anywhere.
- **Impact**: Once a pipeline starts, it **cannot be stopped** from the UI. The backend abort mechanism (`abortPipelineExecution()`) works but is unreachable.

### P0-4: Double SSE Event Delivery
- **File**: `src/app/api/pipeline/stream/route.ts:57,101`, `orchestrator.ts:920–926`
- **Description**: The SSE route subscribes to `pipelineEvents.on()` AND passes `onEvent` callback to `runOrchestrator`. The orchestrator's `emit()` function calls BOTH. For the initiating client, every event is delivered twice.
- **Impact**: UI may process duplicate events, causing double state updates, duplicate log entries, and potential race conditions in React state management.

### P0-5: `getContext()` Dead in All 11 Agents
- **File**: All `src/lib/agents/ruflo/registry/*.ts` files
- **Description**: Every agent's `getContext()` function returns `""`. The `StageLedger` parameter is imported but never used. `buildUserContext()` in `src/lib/agents/contextBuilder.ts` calls `agentDef.getContext(ledger)` and returns `{}` when getContext is missing.
- **Impact**: The designed context-injection architecture is completely bypassed. Agents only receive upstream context through `buildStageContext()` in the orchestrator, which extracts `### Context Snapshot` from DB. Agents never query structured ledger data.

### P0-6: Schema Enforcement is Dead Code
- **File**: All registry files (`schema` exports), `orchestrator.ts`
- **Description**: All 11 agents export a `schema` object. 10 of 11 use `{ content: string }`, Tester uses `{ passed, failed, total }`. `orchestrator.ts` never reads, validates, or passes `agentDef.schema` to the LLM or any validation function. The schemas are completely ignored.
- **Impact**: LLM output can be any shape of text. No structural guarantee exists beyond markdown header presence.

### P0-7: No Build Verification for Generated Projects
- **File**: Entire codebase
- **Description**: Generated projects are never built (`npm run build`, `tsc`, `vite build`). No `npm install`. No build tool invocation. No dependency resolution. The only validation is static linting.
- **Impact**: Generated projects may have missing npm packages, unresolvable imports, runtime errors, or build failures that are never detected.

### P0-8: Vercel Deployment Incompatible
- **File**: `src/lib/db.ts:9`, `vfs.ts:124`, `next.config.ts`, `settings/route.ts`
- **Description**: SQLite on read-only filesystem, native C++ modules, 400-hour timeouts exceeding Lambda limits, localhost Ollama dependency, in-memory state, child process spawning. No `vercel.json`.
- **Impact**: AutoCoder cannot be deployed to Vercel. Generated projects have no deployment validation either.

### P0-9: Dotfiles Blocked by VFS `sanitizePath()`
- **File**: `src/lib/agents/ruflo/vfs.ts:72–74`
- **Description**: `sanitizePath()` executes `if (cleanPath === '.' || cleanPath === '' || cleanPath.startsWith('.')) throw new Error(...)`. The `cleanPath.startsWith('.')` check was intended to block relative path prefixes (like `./`), but it blindly matches all configuration dotfiles (`.gitignore`, `.env`, `.env.example`, `.eslintrc.json`, `.prettierrc`).
- **Impact**: AutoCoder crashes whenever an agent attempts to create or write any standard configuration dotfile, throwing a fatal `Security Exception: Invalid file path: ".env"`.

---

## P1 High Bug Registry

### P1-1: SSE Message Drop Window
- **File**: `src/app/api/pipeline/stream/route.ts:31–57`
- **Description**: History replay query (line 31) finishes before live event listener is attached (line 57). Events emitted during the DB query window are permanently lost.

### P1-2: Orphaned VirtualFile Records
- **File**: `prisma/schema.prisma:424–435`
- **Description**: `VirtualFile` has no foreign key relation to `Conversation`. No `onDelete: Cascade`. Deleting conversations leaves orphaned VFS records in SQLite permanently. (Note: The `[id]/route.ts` DELETE endpoint does successfully wipe the `projects/<id>/` directory from disk, but fails to cascade-delete DB records).

### P1-3: No Input Validation on API Routes
- **File**: All `src/app/api/*/route.ts` files
- **Description**: No Zod or schema validation on POST request payloads. `await request.json()` without type checking. Note: `settings/route.ts` is an exception as it correctly filters input into a predefined object before writing, but all other API routes are vulnerable.

### P1-4: SML Shallow Indexing
- **File**: `src/lib/agents/sml.ts:46–60`
- **Description**: Only root keys are indexed. Sub-object paths (e.g., `System.database.entities`) are never indexed. `queryAgentOutput()` for nested paths always fails.

### P1-5: SML No Transaction Atomicity
- **File**: `src/lib/agents/sml.ts:31–60`
- **Description**: `agentOutput.create` and subsequent `agentIndex.create` calls are not wrapped in `prisma.$transaction`. Partial failures leave orphaned records.

### P1-6: SML Silent JSON Corruption
- **File**: `src/lib/agents/sml.ts:82–86`
- **Description**: `try { JSON.parse(index.value) } catch { return index.value }` swallows parse errors and returns raw strings, causing cryptic downstream `TypeError` crashes.

### P1-7: Memory Query Returns Null for Structured Access
- **File**: `memory.ts:326–351`
- **Description**: DB-hydrated state is `{ content: "markdown" }`. Queries for structured fields (`features`, `database.entities`) return `null` because only `content` key exists.

### P1-8: Upstream Invalidation Incomplete
- **File**: `memory.ts:271–295`
- **Description**: Modifying Queen/Planner/Architect omits Blueprinter, Coder, Debugger, Security, Reviewer from invalidation. Modifying Blueprinter/Coder has no handler at all.

### P1-9: Auto-Injected index.html Filename Guessing
- **File**: `orchestrator.ts:639–667`
- **Description**: When web project lacks `index.html`, auto-injection uses `cssFiles[0] || 'style.css'` and `jsFiles[jsFiles.length - 1] || 'script.js'` as fallback filenames.

### P1-10: contextResolver.ts Does Not Exist
- **File**: `contextResolver.ts`
- **Description**: The file `contextResolver.ts` does not exist in the codebase. The conflict detection logic referenced in `orchestrator.ts` must be verified and implemented.

### P1-11: Monaco is Read-Only, Not an Editor
- **File**: `WorkspaceContent.tsx:1627–1640`
- **Description**: `readOnly: true`, `domReadOnly: true`. No save mechanism, no dirty tracking, no write-back API. This is a viewer, not an editor.

### P1-12: Project ZIP Download CLI Incompatibility on Windows (ENOENT)
- **File**: `src/app/api/conversations/[id]/download/route.ts:32–34`
- **Description**: `download/route.ts` executes `await execFilePromise('zip', ['-r', tempZipPath, '.'], { cwd: projectDir })`. The Unix CLI tool `zip` is not installed by default on Windows host environments.
- **Impact**: Windows users clicking "Download Project ZIP" receive an unhandled `ENOENT` failure and cannot download their project archive.

### P1-13: Orphaned Background Preview Server Zombie Processes (Port 8080 Leak)
- **File**: `src/lib/agents/ruflo/orchestrator.ts:528–542`
- **Description**: `launchVSCodePreview` spawns background server processes (`node server.js` or `npx serve -s . -l 8080`) via `exec()` without storing the `ChildProcess` reference.
- **Impact**: Spawned preview servers are never terminated on pipeline abort, completion, or conversation deletion, permanently locking port 8080 and leaking system memory as zombie processes.

### P1-14: TypeScript Linter False-Positive TS2307 Errors on .ts/.tsx Files
- **File**: `src/lib/agents/ruflo/linter.ts:133–136`
- **Description**: `linter.ts` suppresses `TS2307` (`Cannot find module`) **only for `.js` and `.jsx` files**. When Coder generates `.ts` or `.tsx` files importing standard libraries (`react`, `lucide-react`, `express`, `@prisma/client`), the in-memory compiler reports missing `node_modules` as fatal errors.
- **Impact**: Triggers unnecessary in-loop self-healing rewrites that fail repeatedly and exhaust retry attempts on valid code.

### P1-15: Dead Knowledge Base & Contracts Engine (16 Files Never Ingested)
- **File**: `src/lib/agents/ruflo/contracts.ts`, `knowledgeResolver.ts`, `knowledge/referenceResolver.ts`, `knowledge/references/*.json`
- **Description**: 16 files implementing project contracts, capability definitions, restriction databases, and 13 framework JSON reference files are completely isolated and never imported by the orchestrator or any agent.
- **Impact**: Critical framework constraints and best practices stored in the knowledge base never reach agent prompts.

---

## P2–P3 Issue Registry

### P2 Issues

| ID | File | Description |
|:---|:---|:---|
| P2-1 | `memory.ts:271–295` | SML tables not invalidated alongside ExecutiveMemory |
| P2-2 | `orchestrator.ts:167–178` | System agent excluded from EXPECTED_FIRST_HEADERS — no header validation |
| P2-3 | `eventDispatcher.ts:37–106` | `specialistAgent` hardcoded to `'Debugger'` for all failure types |
| P2-4 | `contextResolver.ts (NEW)` | API conflict regex only matches `fetch from <route>` — misses `axios`, `POST`, path params |
| P2-5 | `inference.ts:599–676` | OpenAI and Anthropic branches are non-streaming — no `onChunk` callbacks, no SSE progress for cloud models |
| P2-6 | `WorkspaceContent.tsx:834–836` | Missing files render fake placeholder instead of explicit error |
| P2-7 | `token-budgeter.ts:43–97` | Structured field access (`taskSpec?.mvpScope`) always returns `undefined` due to markdown state shape |
| P2-8 | `Planner.ts:5, Architect.ts:5` | `maxTokens: 2048` — too low for medium+ projects, risks truncation |
| P2-9 | `prisma/schema.prisma:424–435` | VirtualFile missing cascade delete relation to Conversation |
| P2-10 | `conversations/clear/route.ts:15` | `prisma.conversation.deleteMany()` fails to cascade delete in SQLite without explicit PRAGMA or sub-queries |

### P3 Issues

| ID | File | Description |
|:---|:---|:---|
| P3-1 | `vfs.ts:9–27` | File locking is in-process only — no multi-instance coordination |
| P3-2 | `Designer.ts:125,134` | Prompt contradiction: line 125 says start with `### Design System`, lines 9/134 say start with `### Context Snapshot` |
| P3-3 | `inference.ts:120–124` | `cleanJsonResponse()` only strips fences — doesn't extract embedded JSON or handle truncated output |
| P3-4 | `stream/route.ts:60–62` | SSE has no `id:` field or `Last-Event-ID` tracking for reconnection |
| P3-5 | `orchestrator.ts:548–586` | `launchVSCodePreview` spawns `node`/`npx serve` — no cleanup on pipeline abort |
| P3-6 | Entire repository | **Zero test files**, no testing framework, no `"test"` script in `package.json` |

### NEW-P1: persistence.ts structured output never queried
- **File**: `src/lib/agents/ruflo/persistence.ts`
- **Description**: StagePersistence writes rich structured data to 10+ typed tables (QueenStageOutput, PlannerStageOutput, etc.). However, the orchestrator only queries via ExecutiveMemory (markdown) and SML (JSON blobs). The typed per-stage tables are write-only — no code reads from them.

### NEW-P1: files/read has no write endpoint
- **File**: `src/app/api/conversations/[id]/files/read/route.ts`
- **Description**: The read endpoint exists (and correctly protects against directory traversal), but there is no corresponding write endpoint, leaving Monaco as a read-only viewer.

### NEW-P2: manifest.json dependency graph is never read at runtime
- **File**: `src/lib/agents/manifest.json`
- **Description**: Declares a formal dependency DAG for each agent, but no code imports or reads it. The orchestrator uses its own hardcoded UPSTREAM_AGENT_MAP instead.

### NEW-P2: GraphNode/GraphEdge tables never populated
- **File**: `prisma/schema.prisma`
- **Description**: Defines GraphNode and GraphEdge models (and `ledgerTypes.ts` defines their types), but no code creates them at runtime.

### NEW-P2: Correlation table never populated
- **File**: `prisma/schema.prisma`
- **Description**: Defines a Correlation model, but no code creates Correlation records at runtime.

### NEW-P2: Tailwind CSS usage not documented
- **File**: `package.json`, `postcss.config.mjs`
- **Description**: The project uses Tailwind CSS (`@tailwindcss/postcss`, `tailwindcss` in devDeps) and all frontend files use Tailwind classes, but this was missing from the architectural audit.

### NEW-P3: StageExecutionLog table redundant with ExecutionHistory
- **File**: `prisma/schema.prisma`
- **Description**: Both tables log pipeline execution events, creating redundancy and confusion over which is canonical.

---

## Appendix A: Agent Configuration Summary

| Agent | Temp | MaxTokens | Schema Enforced | getContext() | Tools | Special Handling |
|:---|:---|:---|:---|:---|:---|:---|
| Queen | 0.2 | 4096 | ❌ Dead | `""` | `[]` | Standard `runAgent()` |
| Planner | 0.3 | 2048 | ❌ Dead | `""` | `[]` | Standard `runAgent()` |
| Architect | 0.2 | 2048 | ❌ Dead | `""` | `[]` | Quality Gate pause |
| System | 0.2 | 2048 | ❌ Dead | `""` | `[]` | Dual header support |
| Designer | 0.3 | 2048 | ❌ Dead | `""` | `[]` | Standard `runAgent()` |
| Blueprinter | 0.1 | 4096 | ❌ Dead | `""` | `[]` | Custom context injection |
| Coder | 0.1 | 4096 | ❌ Dead | `""` | `[]` | Per-file loop + self-healing |
| Tester | 0.0 | 1024 | ❌ Dead | `""` | `[]` | Deterministic (no LLM) |
| Debugger | 0.1 | 4096 | ❌ Dead | `""` | `[]` | SLM triage + repair loop |
| Security | 0.2 | 2048 | ❌ Dead | `""` | `[]` | Ingests code + all specs |
| Reviewer | 0.2 | 2048 | ❌ Dead | `""` | `[]` | Critical issue detection |

## Appendix B: File Inventory

| Category | File Count | Key Files |
|:---|:---|:---|
| Pipeline Core | 8 | `orchestrator.ts`, `inference.ts`, `linter.ts`, `vfs.ts`, `memory.ts`, `agents.ts`, `persistence.ts`, `ledgerTypes.ts` |
| Agent Registry | 11 | `Queen.ts` through `Reviewer.ts` |
| Support Systems | 7 | `eventDispatcher.ts`, `token-budgeter.ts`, `contracts.ts`, `sml.ts`, `knowledgeResolver.ts`, `knowledge/referenceResolver.ts`, `knowledge/referenceStore.ts` |
| Knowledge Base | 13 | JSON reference files under `knowledge/references/` |
| API Routes | 13 | `pipeline/stream`, `pipeline/abort`, `pipeline/resume`, `conversations/` CRUD, `files/read` (traversal-protected), `download` (safe execFile), `telemetry`, `health`, `health/system`, `settings` |
| Frontend | 10 | 7 pages (`page.tsx` with upload/blueprints, `workspace`, `telemetry`, `health`, `settings`, `docs`, `support`), 1 layout, 2 components (`Sidebar.tsx`, `TopAppBar.tsx`) |
| Database | 1 | `prisma/schema.prisma` (20 models including: Conversation (has qualityGateOverride), VirtualFile, ExecutionHistory, ExecutiveMemory, AgentOutput, AgentIndex, GraphNode, GraphEdge, StageExecutionLog, Correlation, plus 10 typed StageOutput models) |
| Dead Code | 3 | `toolbox.ts` (ReAct tools), all `schema` exports, `manifest.json` (agent dependency DAG never read at runtime) |
| Tests | 0 | **None** |

---

## Appendix C: What Actually Works End-to-End

Despite the issues catalogued above, the following end-to-end flow **does work** for simple projects:

1. User enters prompt → Conversation created → SSE stream opened
2. Queen analyzes prompt → produces structured markdown spec
3. Planner breaks down features → requirements document
4. Architect chooses tech stack → folder structure + modules
5. *(Pipeline pauses for Architect quality gate approval)*
6. System designs backend (or outputs "No Backend Required")
7. Designer creates UI spec with colors, components, pages
8. Blueprinter synthesizes file-by-file implementation plan from all 5 specs
9. Coder generates each file with linter self-healing (up to 2 retries)
10. Tester runs deterministic linting across all generated files
11. Debugger reads test report and repairs failing files
12. Security reviews code for vulnerabilities
13. Reviewer performs final quality review
14. VFS flushed to disk → local preview launched

**This works for**: Simple vanilla HTML/CSS/JS projects (calculators, to-do apps, landing pages) where no npm packages, build tools, or frameworks are needed.

**This breaks for**: React/Next.js/Vue projects (no `npm install`), projects with backend APIs (no database setup), projects requiring build steps (no `npm run build`), or any project requiring more than ~2048 tokens of output from Planner/Architect/System/Designer.

---
---

# PART II — COMPLETE FIX SPECIFICATION: ALL 41 ISSUES

> **Purpose**: Exact code changes for every P0–P3 issue from the audit.  
> **Organization**: Grouped by file, with diff blocks showing before → after.  
> **Priority**: P0 fixes first, then P1, P2, P3.

---

## Part II — Table of Contents

1. [File: `src/app/api/pipeline/stream/route.ts`](#fix-1-stream-route) — P0-2, P0-4, P1-1
2. [File: `src/components/TopAppBar.tsx`](#fix-2-topappbar) — P0-3
3. [File: `src/lib/agents/ruflo/orchestrator.ts`](#fix-3-orchestrator) — P0-4, P0-7, P1-9, P2-2
4. [File: `src/lib/agents/ruflo/agents.ts`](#fix-4-agents) — P0-1 (ReAct tools)
5. [File: `src/lib/agents/inference.ts`](#fix-5-inference) — P0-1 (tool call support), P2-5
6. [File: All `src/lib/agents/ruflo/registry/*.ts`](#fix-6-registry) — P0-5 (getContext), P0-6 (schema), P2-8, P3-2
7. [File: `src/lib/agents/ruflo/memory.ts`](#fix-7-memory) — P1-7, P1-8
8. [File: `src/lib/agents/sml.ts`](#fix-8-sml) — P1-4, P1-5, P1-6
9. [File: `prisma/schema.prisma`](#fix-9-prisma) — P1-2, P2-9
10. [File: `src/app/workspace/WorkspaceContent.tsx`](#fix-10-workspace) — P1-11 (Monaco editing), P2-6
11. [File: `src/lib/agents/ruflo/token-budgeter.ts`](#fix-11-token-budgeter) — P2-7
12. [File: `src/lib/agents/ruflo/eventDispatcher.ts`](#fix-12-event-dispatcher) — P2-3
13. [File: `src/lib/agents/ruflo/contextResolver.ts`](#fix-13-context-resolver) — P1-10 (create new file)
14. [File: `package.json`](#fix-14-package-json) — P3-6
15. [File: `src/lib/agents/ruflo/vfs.ts`](#fix-16-vfs-dotfiles) — P0-9 (allow config dotfiles)
16. [File: `src/app/api/conversations/[id]/download/route.ts`](#fix-17-download-windows) — P1-12 (Windows ZIP download)
17. [File: `src/lib/agents/ruflo/orchestrator.ts`](#fix-18-preview-zombies) — P1-13 (preview server lifecycle)
18. [File: `src/lib/agents/ruflo/linter.ts`](#fix-19-linter-ts-modules) — P1-14 (suppress external TS2307 on virtual TS files)
19. [File: `src/app/api/conversations/clear/route.ts`](#fix-20-clear-cascade) — P2-10 (Prisma SQLite cascade cleanup)
20. [Post-Change Commands](#fix-15-post-change-commands)

---

<a id="fix-1-stream-route"></a>
## 1. File: `src/app/api/pipeline/stream/route.ts`

### Fixes: P0-2 (Race Condition), P0-4 (Double Events), P1-1 (Message Drop)

**Replace entire file** with:

```typescript
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { runOrchestrator, activePipelines, pipelineEvents } from '@/lib/agents/ruflo/orchestrator';

export const dynamic = 'force-dynamic';

// In-memory lock to prevent concurrent orchestrator launches per conversation
const launchLocks = new Set<string>();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get('conversationId');
  const userPrompt = searchParams.get('prompt') || '';

  if (!conversationId) {
    return new Response('conversationId is required', { status: 400 });
  }

  const encoder = new TextEncoder();
  let eventIdCounter = 0;

  const responseStream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: any) => {
        try {
          eventIdCounter++;
          // FIX P1-1 & P3-4: Include SSE id: field for reconnection tracking
          controller.enqueue(
            encoder.encode(`id: ${eventIdCounter}\ndata: ${JSON.stringify(event)}\n\n`)
          );
        } catch (e) {
          // Stream closed
        }
      };

      // FIX P0-4 & P1-1: Subscribe to live events BEFORE replaying history
      // This eliminates the message drop window between DB query and listener attach
      const bufferedEvents: any[] = [];
      let replayDone = false;
      const eventChannel = `event:${conversationId}`;

      const liveEventListener = (evt: any) => {
        if (!replayDone) {
          // Buffer events that arrive during replay
          bufferedEvents.push(evt);
        } else {
          sendEvent(evt);
        }
      };
      pipelineEvents.on(eventChannel, liveEventListener);

      // 1. Replay past history logs from SQLite
      try {
        const historyLogs = await prisma.executionHistory.findMany({
          where: { conversationId },
          orderBy: { createdAt: 'asc' },
          take: 500,
          select: { stage: true, status: true, logs: true, createdAt: true },
        });

        for (const logItem of historyLogs) {
          if (logItem.status === 'Streaming') continue;
          sendEvent({
            type: 'HISTORY_REPLAY',
            agent: logItem.stage,
            status: logItem.status,
            message: logItem.logs,
            timestamp: logItem.createdAt,
          });
        }
      } catch (e) {
        // Ignore DB read errors during replay
      }

      // 2. Flush buffered events that arrived during replay
      replayDone = true;
      for (const buffered of bufferedEvents) {
        sendEvent(buffered);
      }
      bufferedEvents.length = 0;

      // Keep-alive ping
      const pingInterval = setInterval(() => {
        sendEvent({ type: 'PING', message: 'keep-alive' });
      }, 5000);

      // Clean up on browser disconnect
      const abortHandler = () => {
        clearInterval(pingInterval);
        pipelineEvents.off(eventChannel, liveEventListener);
      };
      request.signal.addEventListener('abort', abortHandler);

      // 3. FIX P0-2: Use atomic lock to prevent duplicate orchestrator launches
      if (!activePipelines.has(conversationId) && !launchLocks.has(conversationId)) {
        launchLocks.add(conversationId);
        try {
          const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
          });

          if (conversation && conversation.status !== 'Completed' && conversation.status !== 'Failed') {
            if (userPrompt && (!conversation.originalPrompt || userPrompt.length > conversation.originalPrompt.length)) {
              await prisma.conversation.update({
                where: { id: conversationId },
                data: { originalPrompt: userPrompt },
              });
            }

            if (conversation.status !== 'Active') {
              await prisma.conversation.update({
                where: { id: conversationId },
                data: { status: 'Active' },
              });
            }

            const promptToUse = userPrompt || conversation.originalPrompt || conversation.title || 'Software development request';

            // FIX P0-4: Do NOT pass onEvent callback — only use pipelineEvents emitter
            // This eliminates the dual-delivery problem. All events go through the emitter only.
            runOrchestrator(
              conversationId,
              promptToUse,
              () => {}, // No-op callback — events flow through pipelineEvents only
              undefined,
              conversation.currentStage !== 'Queen' ? conversation.currentStage : undefined
            ).catch((err) => {
              pipelineEvents.emit(eventChannel, { type: 'PIPELINE_ERROR', message: err.message });
            });
          }
        } finally {
          launchLocks.delete(conversationId);
        }
      } else if (activePipelines.has(conversationId)) {
        sendEvent({
          type: 'AGENT_LOG',
          message: 'Connected to active background compilation loop.',
        });
      }
    },
  });

  return new Response(responseStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
```

**Changes summary**:
1. **P0-2**: Added `launchLocks` set with try/finally to prevent concurrent orchestrator launches
2. **P0-4**: Pass no-op `() => {}` as `onEvent` callback — all events flow through `pipelineEvents` emitter only
3. **P1-1**: Subscribe to live events BEFORE DB replay; buffer events during replay; flush after
4. **P3-4**: Added `id:` field in SSE events for reconnection tracking

---

<a id="fix-2-topappbar"></a>
## 2. File: `src/components/TopAppBar.tsx`

### Fixes: P0-3 (Abort Button Unwired)

```diff
 'use client';

-import React, { useState } from 'react';
+import React, { useState, useCallback } from 'react';
 import { useApp } from '@/context/AppContext';
 import {
   Activity,
   Bell,
   User,
   Power,
   Play,
   CheckCircle,
+  Square,
 } from 'lucide-react';
 import { useRouter } from 'next/navigation';

 export default function TopAppBar() {
   const router = useRouter();
   const { activeId, ollamaConnected, ollamaModels, activeModel, setActiveModel, addLog, currentStage, pipelineStatus } = useApp();
   const [resuming, setResuming] = useState(false);
+  const [aborting, setAborting] = useState(false);

+  // FIX P0-3: Wire the abort button to actually call /api/pipeline/abort
+  const handleAbort = useCallback(async () => {
+    if (!activeId || aborting) return;
+    setAborting(true);
+    addLog({ type: 'ABORT_CLICK', message: 'User requested pipeline abort...' });
+    try {
+      const res = await fetch('/api/pipeline/abort', {
+        method: 'POST',
+        headers: { 'Content-Type': 'application/json' },
+        body: JSON.stringify({ conversationId: activeId }),
+      });
+      if (res.ok) {
+        addLog({ type: 'ABORT_OK', message: 'Pipeline abort signal sent successfully.' });
+        window.dispatchEvent(new CustomEvent('pipeline-aborted', { detail: { id: activeId } }));
+      } else {
+        const data = await res.json();
+        addLog({ type: 'ABORT_ERROR', message: `Abort failed: ${data.error}` });
+      }
+    } catch (e: any) {
+      addLog({ type: 'ABORT_ERROR', message: `Abort failed: ${e.message}` });
+    } finally {
+      setAborting(false);
+    }
+  }, [activeId, aborting, addLog]);

   // ... (handleApprove stays the same) ...

-        {activeId && pipelineStatus === 'Paused' && currentStage === 'Architect' && (
+        {/* FIX P0-3: Show abort button during Active state, show approve during Paused/Architect */}
+        {activeId && pipelineStatus === 'Active' && (
+          <div className="flex gap-2 border-l border-slate-700 pl-4">
+            <button
+              onClick={handleAbort}
+              disabled={aborting}
+              className="border border-red-800 text-red-400 px-4 py-1.5 rounded text-xs font-bold hover:bg-red-950 transition-colors flex items-center gap-1 disabled:opacity-50"
+            >
+              {aborting ? (
+                <span className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
+              ) : (
+                <Square className="w-3.5 h-3.5 fill-red-500" />
+              )}
+              Halt Pipeline
+            </button>
+          </div>
+        )}
+
+        {activeId && pipelineStatus === 'Paused' && currentStage === 'Architect' && (
           <div className="flex gap-2 border-l border-slate-700 pl-4">
-            <button className="border border-slate-700 text-on-surface px-4 py-1.5 rounded text-xs font-bold hover:bg-slate-900 transition-colors flex items-center gap-1">
-              <Power className="w-3.5 h-3.5 text-red-500" /> Halt Pipeline
+            <button
+              onClick={handleAbort}
+              disabled={aborting}
+              className="border border-red-800 text-red-400 px-4 py-1.5 rounded text-xs font-bold hover:bg-red-950 transition-colors flex items-center gap-1 disabled:opacity-50"
+            >
+              <Power className="w-3.5 h-3.5 text-red-500" /> Halt
             </button>
```

---

<a id="fix-3-orchestrator"></a>
## 3. File: `src/lib/agents/ruflo/orchestrator.ts`

### Fix P0-7: Add build verification after Coder loop

**After line 1300** (after the cross-file import check block, before the `emit AGENT_COMPLETE` for Coder), insert:

```typescript
        // FIX P0-7: Run build verification for projects with package.json
        const hasPackageJson = allVfs.some(f => f === 'package.json' || f.endsWith('/package.json'));
        if (hasPackageJson) {
          emit({
            type: 'AGENT_LOG',
            agent: 'Coder',
            message: '🔨 Build verification: Detected package.json. Attempting npm install + build...',
          });
          try {
            const projectDir = path.join(process.cwd(), 'projects', conversationId);
            await flushVfsToDisk(conversationId);
            
            // Run npm install
            await new Promise<void>((resolve, reject) => {
              exec('npm install --production --no-audit --no-fund', { cwd: projectDir, timeout: 120000 }, (err, stdout, stderr) => {
                if (err) {
                  emit({ type: 'AGENT_LOG', agent: 'Coder', message: `⚠️ npm install failed: ${stderr || err.message}` });
                  // Don't reject — this is a warning, not a blocker for vanilla projects
                  resolve();
                } else {
                  emit({ type: 'AGENT_LOG', agent: 'Coder', message: '✅ npm install succeeded.' });
                  resolve();
                }
              });
            });

            // Check if build script exists and run it
            const pkgContent = await readVirtualFile(conversationId, 'package.json');
            if (pkgContent) {
              try {
                const pkg = JSON.parse(pkgContent);
                if (pkg.scripts?.build) {
                  await new Promise<void>((resolve, reject) => {
                    exec('npm run build', { cwd: projectDir, timeout: 180000 }, (err, stdout, stderr) => {
                      if (err) {
                        emit({ type: 'AGENT_LOG', agent: 'Coder', message: `⚠️ Build failed: ${stderr || err.message}` });
                      } else {
                        emit({ type: 'AGENT_LOG', agent: 'Coder', message: '✅ Build succeeded.' });
                      }
                      resolve(); // Always continue
                    });
                  });
                }
              } catch {}
            }
          } catch (buildErr: any) {
            emit({ type: 'AGENT_LOG', agent: 'Coder', message: `⚠️ Build verification skipped: ${buildErr.message}` });
          }
        }
```

### Fix P2-2: Add System to EXPECTED_FIRST_HEADERS

Find the `EXPECTED_FIRST_HEADERS` object (around line 167) and add System:

```diff
 const EXPECTED_FIRST_HEADERS: Record<string, string> = {
   'Queen':       'Context Snapshot',
   'Planner':     'Context Snapshot',
   'Architect':   'Context Snapshot',
+  'System':      'Context Snapshot',
   'Designer':    'Context Snapshot',
   'Blueprinter': 'File:',
   'Security':    'Overall Status',
   'Reviewer':    'Overall Assessment',
 };
```

### Fix P1-9: Improve auto-injected index.html

In `parseBlueprintFiles()` (around line 639), replace the fallback logic:

```diff
-    const primaryCss = cssFiles[0] || 'style.css';
-    const primaryJs = jsFiles[jsFiles.length - 1] || 'script.js';
+    // FIX P1-9: Use actual generated filenames, NOT fallback guesses
+    const primaryCss = cssFiles[0] || '';
+    const primaryJs = jsFiles[jsFiles.length - 1] || '';
     const allDeps = [...cssFiles, ...jsFiles];
     const defaultHtmlSection: BlueprintFileSection = {
       file: 'index.html',
       purpose: 'Main web entry point mounting project layout and scripts',
       dependencies: allDeps,
       specsRequired: [],
       exports: [],
-      details: `HTML5 entry linking ${primaryCss} and loading ${primaryJs}`,
-      rawSection: `### File: index.html\n- **Purpose**: Main web entry point\n- **Dependencies**: ${allDeps.join(', ') || 'None'}\n- **Specs Required**: None\n- **Exports**: None\n- **Implementation Details**:\n  1. HTML5 Doctype lang="en"\n  2. Head with meta charset="UTF-8", viewport meta, descriptive title\n  3. Head: <link rel="stylesheet" href="${primaryCss}">\n  4. Body with main container div id="app"\n  5. End of body: <script src="${primaryJs}" defer></script>`,
+      details: `HTML5 entry linking ${primaryCss || 'detected CSS files'} and loading ${primaryJs || 'detected JS files'}`,
+      rawSection: `### File: index.html\n- **Purpose**: Main web entry point\n- **Dependencies**: ${allDeps.join(', ') || 'None'}\n- **Specs Required**: None\n- **Exports**: None\n- **Implementation Details**:\n  1. HTML5 Doctype lang="en"\n  2. Head with meta charset="UTF-8", viewport meta, descriptive title\n${primaryCss ? `  3. Head: <link rel="stylesheet" href="${primaryCss}">` : '  3. No CSS files detected — skip stylesheet link'}\n  4. Body with main container div id="app"\n${allDeps.filter(f => /\.(js|ts)$/.test(f)).map((f, i) => `  ${5+i}. <script src="${f}" ${f.endsWith('.ts') ? 'type="module" ' : ''}defer></script>`).join('\n') || '  5. No JS files detected — add script tags for all JS files'}`,
     };
```

---

<a id="fix-4-agents"></a>
## 4. File: `src/lib/agents/ruflo/agents.ts`

### Fix P0-1: Enable ReAct tools for Coder and Debugger

```diff
 export const AGENT_DEFS: Record<string, AgentDef> = {
   Queen:       { ...Queen, tools: [] },
   Planner:     { ...Planner, tools: [] },
   Architect:   { ...Architect, tools: [] },
   System:      { ...System, tools: [] },
   Designer:    { ...Designer, tools: [] },
   Blueprinter: { ...Blueprinter, tools: [] },
-  Coder:       { ...Coder, tools: [] },
+  Coder:       { ...Coder, tools: ['read_file', 'write_file', 'list_files', 'check_syntax'] },
   Tester:      { ...Tester, tools: [] },
-  Debugger:    { ...Debugger, tools: [] },
+  Debugger:    { ...Debugger, tools: ['read_file', 'write_file', 'apply_diff', 'list_files', 'check_syntax'] },
-  Security:    { ...Security, tools: [] },
+  Security:    { ...Security, tools: ['read_file', 'list_files'] },
   Reviewer:    { ...Reviewer, tools: [] },
 };
```

> [!IMPORTANT]
> Enabling tools in the agent definitions is **step 1**. Step 2 is wiring the tool execution engine in `orchestrator.ts` (see Section 5 below for inference changes and Section 3 for orchestrator ReAct loop). This is a major architectural addition that requires the ReAct loop implementation.

---

<a id="fix-5-inference"></a>
## 5. File: `src/lib/agents/inference.ts`

### Fix P0-1 Part 2: Add tool calling support to Ollama

At the end of `runInference()`, after the Ollama payload construction (around line 525), add tool definitions:

```typescript
// FIX P0-1: If tools are provided, include them in the Ollama payload
if (options.tools && options.tools.length > 0) {
  payload.tools = options.tools.map((tool: any) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters || { type: 'object', properties: {} },
    },
  }));
}
```

And add `tools` to the `InferenceOptions` interface:

```diff
 export interface InferenceOptions {
   signal?: AbortSignal;
   temperature?: number;
   maxTokens?: number;
   format?: 'json' | 'text';
   onChunk?: (chunk: string) => void;
   timeoutMs?: number;
+  tools?: Array<{
+    name: string;
+    description: string;
+    parameters?: Record<string, any>;
+  }>;
 }
```

### Fix P2-5: Add streaming support for OpenAI

In the OpenAI branch (around line 599), replace the non-streaming fetch:

```diff
-  // OpenAI branch (non-streaming)
+  // OpenAI branch — with streaming support
   const payload: any = {
     model: config.openaiModel,
     messages: messages,
     temperature: temp,
+    stream: true,
   };
   if (options.maxTokens) payload.max_tokens = options.maxTokens;
   if (isJson) payload.response_format = { type: 'json_object' };

   const res = await fetch('https://api.openai.com/v1/chat/completions', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': `Bearer ${config.openaiApiKey}`,
     },
     body: JSON.stringify(payload),
     signal: combinedSignal,
   });

   if (!res.ok) {
     const err = await res.text();
     throw new Error(`OpenAI API error ${res.status}: ${err}`);
   }

-  const data = await res.json();
-  return data.choices[0].message.content || '';
+  // Stream OpenAI response
+  let accumulatedContent = '';
+  const reader = res.body?.getReader();
+  if (!reader) throw new Error('OpenAI returned no response body');
+  const decoder = new TextDecoder();
+  let buffer = '';
+
+  while (true) {
+    const { done, value } = await reader.read();
+    if (done) break;
+    buffer += decoder.decode(value, { stream: true });
+    const lines = buffer.split('\n');
+    buffer = lines.pop() || '';
+
+    for (const line of lines) {
+      if (!line.trim() || line.trim() === 'data: [DONE]') continue;
+      const dataStr = line.replace(/^data: /, '');
+      if (!dataStr.trim()) continue;
+      try {
+        const parsed = JSON.parse(dataStr);
+        const content = parsed.choices?.[0]?.delta?.content || '';
+        accumulatedContent += content;
+        if (options.onChunk && content) options.onChunk(content);
+      } catch (e) {}
+    }
+  }
+
+  return accumulatedContent;
```

---

<a id="fix-6-registry"></a>
## 6. All Registry Files (`src/lib/agents/ruflo/registry/*.ts`)

### Fix P0-5: Revive `getContext()` in all agents

Each agent's `getContext()` should query structured data from upstream via `StageLedger.query()`. Here's the pattern — apply to each file:

#### `Queen.ts` — No upstream data needed (first agent)
```typescript
// Queen has no upstream — keep as-is but add ledger parameter
export async function getContext(ledger: any, targetFile?: string): Promise<string> {
  return ''; // Queen is the first agent, no upstream context
}
```

#### `Planner.ts`
```typescript
export async function getContext(ledger: any, targetFile?: string): Promise<string> {
  const queenData = ledger.read('taskSpec');
  if (!queenData?.content) return '';
  return `=== UPSTREAM: Queen Specification (plan.md) ===\n${queenData.content}\n`;
}
```

#### `Architect.ts`
```typescript
export async function getContext(ledger: any, targetFile?: string): Promise<string> {
  const parts: string[] = [];
  const queen = ledger.read('taskSpec');
  const planner = ledger.read('planner');
  if (queen?.content) parts.push(`=== UPSTREAM: plan.md ===\n${queen.content}`);
  if (planner?.content) parts.push(`=== UPSTREAM: requirements.md ===\n${planner.content}`);
  return parts.join('\n\n');
}
```

#### `System.ts`
```typescript
export async function getContext(ledger: any, targetFile?: string): Promise<string> {
  const parts: string[] = [];
  const queen = ledger.read('taskSpec');
  const planner = ledger.read('planner');
  const architect = ledger.read('architect');
  if (queen?.content) parts.push(`=== UPSTREAM: plan.md ===\n${queen.content}`);
  if (planner?.content) parts.push(`=== UPSTREAM: requirements.md ===\n${planner.content}`);
  if (architect?.content) parts.push(`=== UPSTREAM: architecture.md ===\n${architect.content}`);
  return parts.join('\n\n');
}
```

#### `Designer.ts`
```typescript
export async function getContext(ledger: any, targetFile?: string): Promise<string> {
  const parts: string[] = [];
  const queen = ledger.read('taskSpec');
  const planner = ledger.read('planner');
  const architect = ledger.read('architect');
  const system = ledger.read('system');
  if (queen?.content) parts.push(`=== UPSTREAM: plan.md ===\n${queen.content}`);
  if (planner?.content) parts.push(`=== UPSTREAM: requirements.md ===\n${planner.content}`);
  if (architect?.content) parts.push(`=== UPSTREAM: architecture.md ===\n${architect.content}`);
  if (system?.content) parts.push(`=== UPSTREAM: backend_spec.md ===\n${system.content}`);
  return parts.join('\n\n');
}
```

#### `Blueprinter.ts`, `Coder.ts`, `Debugger.ts`, `Security.ts`, `Reviewer.ts`
Same pattern — read all upstream stages relevant to each agent. Blueprinter reads all 5 specs. Coder reads blueprint + dependency file interfaces. Etc.

### Fix P0-6: Remove dead schema exports (or enforce them)

**Option A (Recommended): Remove schemas** — since output is markdown, not JSON:

In every registry file, replace the schema with a validation pattern:

```typescript
// Replace the dead JSON schema with markdown validation rules
export const schema = null; // Schema enforcement handled by sanitizeStageOutput()

// Add output validation function instead
export function validateOutput(output: string): { valid: boolean; error?: string } {
  const firstLine = output.trim().split('\n')[0];
  const expectedHeader = '### Context Snapshot'; // or '### File:' for Blueprinter
  if (!firstLine.startsWith(expectedHeader)) {
    return { valid: false, error: `Output must start with "${expectedHeader}", got: "${firstLine.slice(0, 50)}"` };
  }
  return { valid: true };
}
```

### Fix P2-8: Increase maxTokens for Planner, Architect, System, Designer

```diff
 // In Planner.ts:
-export const maxTokens = 2048;
+export const maxTokens = 8192;

 // In Architect.ts:
-export const maxTokens = 2048;
+export const maxTokens = 8192;

 // In System.ts:
-export const maxTokens = 2048;
+export const maxTokens = 8192;

 // In Designer.ts:
-export const maxTokens = 2048;
+export const maxTokens = 8192;

 // In Security.ts:
-export const maxTokens = 2048;
+export const maxTokens = 4096;

 // In Reviewer.ts:
-export const maxTokens = 2048;
+export const maxTokens = 4096;
```

### Fix P3-2: Fix Designer.ts prompt contradiction

In `Designer.ts`, fix line 125:

```diff
-Do NOT write any text before "### Design System" or after "### Interaction Design"
+Do NOT write any text before "### Context Snapshot" or after "### Interaction Design"
```

---

<a id="fix-7-memory"></a>
## 7. File: `src/lib/agents/ruflo/memory.ts`

### Fix P1-8: Complete upstream invalidation coverage

Replace `handleUpstreamModification()` (lines 271–294):

```typescript
  static async handleUpstreamModification(conversationId: string, modifiedStage: string) {
    const normalized = modifiedStage.toLowerCase();
    
    // FIX P1-8: Complete invalidation map — every downstream stage must be invalidated
    const INVALIDATION_MAP: Record<string, string[]> = {
      queen:       ['Planner', 'Architect', 'System', 'Designer', 'Blueprinter', 'Coder', 'Tester', 'Debugger', 'Security', 'Reviewer'],
      planner:     ['Architect', 'System', 'Designer', 'Blueprinter', 'Coder', 'Tester', 'Debugger', 'Security', 'Reviewer'],
      architect:   ['System', 'Designer', 'Blueprinter', 'Coder', 'Tester', 'Debugger', 'Security', 'Reviewer'],
      system:      ['Designer', 'Blueprinter', 'Coder', 'Tester', 'Debugger', 'Security', 'Reviewer'],
      designer:    ['Blueprinter', 'Coder', 'Tester', 'Debugger', 'Security', 'Reviewer'],
      blueprinter: ['Coder', 'Tester', 'Debugger', 'Security', 'Reviewer'],
      coder:       ['Tester', 'Debugger', 'Security', 'Reviewer'],
      tester:      ['Debugger'],
      debugger:    ['Security', 'Reviewer'],
      security:    ['Reviewer'],
      reviewer:    [],
    };

    const downstreamStages = INVALIDATION_MAP[normalized] || [];

    // Invalidate in ExecutiveMemory DB
    for (const stage of downstreamStages) {
      await updateExecutiveMemoryStatus(conversationId, stage, 'INVALIDATED');
    }

    // Also invalidate SML indexes for downstream stages (FIX P2-1)
    if (downstreamStages.length > 0) {
      await prisma.agentIndex.deleteMany({
        where: {
          conversationId,
          path: { in: downstreamStages.map(s => `${s}.%`) },
        },
      });
    }

    // Flush in-memory node cache
    conversationNodeCache.delete(conversationId);
  }
```

### Fix P1-7: Fix memory query to handle markdown-wrapped state

Replace `StageLedger.query()` (lines 326–351):

```typescript
  query(agentName: string, queryParams: { fromAgent: string; select: string[] }): any {
    const { fromAgent, select } = queryParams;

    const ownedField = (OWNERSHIP as any)[fromAgent]?.[0];
    if (!ownedField) return null;

    const rawData = (this.state as any)[ownedField];
    if (!rawData) return null;

    // FIX P1-7: Handle markdown-wrapped state { content: "markdown_string" }
    // If the data is wrapped as { content: string }, expose the content for text queries
    // but also attempt to parse structured fields from the markdown content
    const data = rawData;

    const result: Record<string, any> = {};
    for (const key of select) {
      if (key === 'content' && data.content) {
        // Direct content access — return the raw markdown
        result.content = data.content;
      } else if (key in data) {
        result[key] = data[key];
      } else if (key.includes('.')) {
        const val = getNestedValue(data, key);
        if (val !== undefined) {
          setNestedValue(result, key, val);
        }
      } else if (data.content && typeof data.content === 'string') {
        // FIX P1-7: Extract section from markdown content by header match
        const sectionRegex = new RegExp(`### ${key}\\b[\\s\\S]*?(?=###|$)`, 'i');
        const match = data.content.match(sectionRegex);
        if (match) {
          result[key] = match[0].trim();
        }
      }
    }
    return Object.keys(result).length > 0 ? result : null;
  }
```

---

<a id="fix-8-sml"></a>
## 8. File: `src/lib/agents/sml.ts`

### Fixes: P1-4 (Shallow Indexing), P1-5 (Transaction Atomicity), P1-6 (Silent JSON Corruption)

**Replace entire file**:

```typescript
import { prisma } from '../db';

export interface WriteAgentOutputParams {
  conversationId: string;
  agentName: string;
  stage: string;
  schemaVersion: string;
  model: string;
  validatedJson: Record<string, any>;
  executionTime: number;
  tokenUsage: number;
  attempt: number;
}

// FIX P1-4: Recursively index nested keys up to 3 levels deep
function flattenKeys(obj: any, prefix: string, maxDepth: number = 3, depth: number = 0): Array<{ path: string; value: string }> {
  const entries: Array<{ path: string; value: string }> = [];
  if (!obj || typeof obj !== 'object' || depth >= maxDepth) return entries;

  for (const key of Object.keys(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    entries.push({ path: fullPath, value: JSON.stringify(val) });

    // Recurse into nested objects (but not arrays)
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      entries.push(...flattenKeys(val, fullPath, maxDepth, depth + 1));
    }
  }
  return entries;
}

export async function writeAgentOutput(params: WriteAgentOutputParams) {
  const {
    conversationId,
    agentName,
    stage,
    schemaVersion,
    model,
    validatedJson,
    executionTime,
    tokenUsage,
    attempt,
  } = params;

  const jsonStr = JSON.stringify(validatedJson);

  // FIX P1-5: Wrap output + index creation in a transaction
  const output = await prisma.$transaction(async (tx) => {
    // 1. Save main output
    const record = await tx.agentOutput.create({
      data: {
        conversationId,
        agentName,
        stage,
        schemaVersion,
        model,
        validatedJson: jsonStr,
        executionTime,
        tokenUsage,
        attempt,
      },
    });

    // 2. Generate deep indexes (FIX P1-4)
    if (validatedJson && typeof validatedJson === 'object') {
      const indexEntries = flattenKeys(validatedJson, agentName);
      for (const entry of indexEntries) {
        await tx.agentIndex.create({
          data: {
            conversationId,
            outputId: record.id,
            path: entry.path,
            value: entry.value,
          },
        });
      }
    }

    return record;
  });

  return output;
}

export async function queryAgentOutput(
  conversationId: string,
  agentName: string,
  path: string
): Promise<any | null> {
  const indexPath = `${agentName}.${path}`;
  const index = await prisma.agentIndex.findFirst({
    where: {
      conversationId,
      path: indexPath,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!index) return null;
  
  // FIX P1-6: Explicit error logging instead of silent corruption
  try {
    return JSON.parse(index.value);
  } catch (parseError) {
    console.error(
      `[SML] JSON parse error for index path "${indexPath}" in conversation ${conversationId}:`,
      parseError
    );
    // Return null instead of raw string to prevent downstream TypeError crashes
    return null;
  }
}

export async function getVocabulary(conversationId: string): Promise<string[]> {
  return [];
}
```

---

<a id="fix-9-prisma"></a>
## 9. File: `prisma/schema.prisma`

### Fixes: P1-2 (Orphaned VirtualFile), P2-9 (Missing Cascade Delete)

```diff
 model VirtualFile {
   id             String   @id @default(cuid())
   conversationId String
   filePath       String
   content        String
   createdAt      DateTime @default(now())
   updatedAt      DateTime @updatedAt

+  // FIX P1-2: Add foreign key cascade delete so VFS records are cleaned up
+  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
+
   @@unique([conversationId, filePath])
   @@index([conversationId])
 }
```

Then in the `Conversation` model, add the reverse relation:

```diff
 model Conversation {
   id              String   @id @default(cuid())
   // ... existing fields ...
   outputs         AgentOutput[]
   history         ExecutionHistory[]
+  virtualFiles    VirtualFile[]
   // ... rest ...
 }
```

After this change, run:
```bash
npx prisma migrate dev --name add-virtualfile-cascade
```

---

<a id="fix-10-workspace"></a>
## 10. File: `src/app/workspace/WorkspaceContent.tsx`

### Fix P1-11: Enable Monaco editing with save functionality

Find the Monaco editor rendering (around line 1627) and replace:

```diff
 <Editor
   height="100%"
   theme="vs-dark"
   language={selectedFile ? getLanguage(selectedFile) : 'typescript'}
   value={fileContent}
+  onChange={(newValue) => {
+    if (newValue !== undefined) {
+      setFileContent(newValue);
+      setUnsavedChanges(true);
+    }
+  }}
   options={{
-    readOnly: true,
+    readOnly: false,
     minimap: { enabled: false },
     fontSize: 12,
     fontFamily: 'JetBrains Mono',
-    domReadOnly: true,
+    domReadOnly: false,
+    wordWrap: 'on',
+    tabSize: 2,
   }}
 />
```

Add state and save handler near the top of the component:

```typescript
const [unsavedChanges, setUnsavedChanges] = useState(false);

// Save handler — writes edited file back to VFS
const handleSaveFile = useCallback(async () => {
  if (!activeId || !selectedFile || !fileContent) return;
  try {
    await fetch(`/api/conversations/${activeId}/files/write`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: selectedFile, content: fileContent }),
    });
    setUnsavedChanges(false);
    addLog({ type: 'FILE_SAVE', message: `Saved ${selectedFile}` });
  } catch (e: any) {
    addLog({ type: 'FILE_SAVE_ERROR', message: `Failed to save: ${e.message}` });
  }
}, [activeId, selectedFile, fileContent, addLog]);

// Keyboard shortcut: Ctrl+S / Cmd+S
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSaveFile();
    }
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, [handleSaveFile]);
```

### New API route needed: `src/app/api/conversations/[id]/files/write/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { writeVirtualFile } from '@/lib/agents/ruflo/vfs';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { file, content } = body;

    if (!file || typeof content !== 'string') {
      return NextResponse.json({ error: 'file and content are required' }, { status: 400 });
    }

    // Prevent directory traversal
    if (file.includes('..') || file.startsWith('/')) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    await writeVirtualFile(id, file, content);
    return NextResponse.json({ success: true, file });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

### Fix P2-6: Show explicit error instead of fake placeholder

```diff
-      // Fallback: render placeholder template
-      setFileContent(`export function ${basename}() { return (<div>...</div>); }`);
+      // FIX P2-6: Show explicit "file not found" instead of fake placeholder
+      setFileContent(`// ⚠️ File not found: ${selectedFile}\n// This file has not been generated yet or failed to compile.\n// Check the pipeline logs for errors.`);
```

---

<a id="fix-11-token-budgeter"></a>
## 11. File: `src/lib/agents/ruflo/token-budgeter.ts`

### Fix P2-7: Handle markdown-wrapped state correctly

Replace the structured field access pattern (around lines 43–97):

```diff
 export function calculateTokenBudget(agentName: string, ledger: StageLedger): TokenBudgetResult {
   const def = AGENT_DEFS[agentName];
   const state = ledger.getState();

+  // FIX P2-7: Count items from markdown content since state is { content: "markdown" }
+  // The structured access like taskSpec?.mvpScope will always be undefined because
+  // all agent outputs are stored as { content: "markdown_string" }
   const countItems = (stateField: any): number => {
-    if (!stateField) return 0;
-    if (Array.isArray(stateField)) return stateField.length;
-    if (typeof stateField === 'object') {
-      // Try structured fields first
-      const candidates = [
-        stateField.features,
-        stateField.mvpScope,
-        stateField.modules,
-        stateField.components,
-        stateField.apis,
-      ];
-      for (const c of candidates) {
-        if (Array.isArray(c)) return c.length;
-      }
-      return Object.keys(stateField).length;
-    }
-    return countMarkdownItems(stateField);
+    if (!stateField) return 3; // Safe default
+    if (typeof stateField === 'string') return countMarkdownItems(stateField);
+    if (stateField.content && typeof stateField.content === 'string') {
+      return countMarkdownItems(stateField.content);
+    }
+    if (Array.isArray(stateField)) return stateField.length;
+    return Object.keys(stateField).length || 3;
   };

-  const featuresCount = countItems(state.taskSpec?.mvpScope || state.planner?.features || state.planner);
-  const fileCount = countItems(state.architect?.projectStructure?.files || state.architect);
+  const featuresCount = countItems(state.planner || state.taskSpec);
+  const fileCount = countItems(state.architect);
```

---

<a id="fix-12-event-dispatcher"></a>
## 12. File: `src/lib/agents/ruflo/eventDispatcher.ts`

### Fix P2-3: Route failure types to appropriate specialist agents

```diff
 // In each failure classification case, replace:
-  specialistAgent = 'Debugger';
 // With the appropriate agent:

 // For 'conflict' type:
+  specialistAgent = 'Architect'; // Conflicts are architecture-level issues

 // For 'syntax' type:
+  specialistAgent = 'Debugger'; // Syntax is Debugger territory

 // For 'compilation' type:
+  specialistAgent = 'Debugger'; // Compilation errors = Debugger

 // For 'performance' type:
+  specialistAgent = 'Reviewer'; // Performance is review-level concern

 // For 'quality' type:
+  specialistAgent = 'Reviewer'; // Quality is Reviewer territory

 // For default 'test_failure' type:
+  specialistAgent = 'Debugger'; // Test failures = Debugger
```

---

<a id="fix-13-context-resolver"></a>
## 13. New File: `src/lib/agents/ruflo/contextResolver.ts`

### Fix P1-10: Create working context resolver that operates on markdown

The original `contextResolver.ts` doesn't exist in the current codebase. Create it:

```typescript
/**
 * Context Resolver — Detects conflicts between upstream stage outputs.
 * 
 * FIX P1-10: Operates on markdown content (not structured JSON)
 * by using regex extraction from markdown sections.
 */

export interface ConflictResult {
  hasConflict: boolean;
  conflicts: Array<{
    type: string;
    description: string;
    recommendation: string;
    options: string[];
  }>;
}

export function detectConflicts(stageOutputs: Record<string, string>): ConflictResult {
  const conflicts: ConflictResult['conflicts'] = [];
  
  const architect = stageOutputs['architect'] || '';
  const system = stageOutputs['system'] || '';
  const designer = stageOutputs['designer'] || '';
  const planner = stageOutputs['planner'] || '';

  // Rule 1: Backend specified but Architect says no backend
  const architectSaysNoBackend = /backend.*none|no backend|frontend.only/i.test(architect);
  const systemHasEndpoints = /###\s*API Endpoints/i.test(system) && !/no backend required/i.test(system);
  
  if (architectSaysNoBackend && systemHasEndpoints) {
    conflicts.push({
      type: 'BACKEND_CONFLICT',
      description: 'Architect specifies no backend, but System designed API endpoints.',
      recommendation: 'Remove API endpoints from System spec and use client-side data only.',
      options: [
        'Remove backend — use localStorage/static data',
        'Override Architect — add backend support',
        'Use mock API with static JSON files',
      ],
    });
  }

  // Rule 2: Tech stack mismatch — Architect says vanilla but Designer references framework components
  const isVanilla = /plain html|vanilla/i.test(architect);
  const usesReactPatterns = /useState|useEffect|component|jsx|tsx|props\./i.test(designer);
  
  if (isVanilla && usesReactPatterns) {
    conflicts.push({
      type: 'FRAMEWORK_CONFLICT',
      description: 'Architect chose vanilla HTML/CSS/JS but Designer references React/component patterns.',
      recommendation: 'Align Designer output to vanilla DOM patterns.',
      options: [
        'Keep vanilla — rewrite Designer spec with DOM patterns',
        'Switch to React — update Architect tech stack',
      ],
    });
  }

  // Rule 3: Missing entry point — Architect folder structure lacks index.html for web project
  const isWebProject = /\.html|\.css|\.jsx|\.tsx/i.test(architect);
  const hasEntryPoint = /index\.html/i.test(architect);
  
  if (isWebProject && !hasEntryPoint) {
    conflicts.push({
      type: 'MISSING_ENTRY_POINT',
      description: 'Web project detected but no index.html in Architect folder structure.',
      recommendation: 'Auto-inject index.html as primary entry point.',
      options: [
        'Auto-inject index.html at project root',
        'Use public/index.html instead',
        'Skip — this is a library/package project',
      ],
    });
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
  };
}
```

---

<a id="fix-14-package-json"></a>
## 14. File: `package.json`

### Fix P3-6: Add test framework

```diff
   "scripts": {
     "dev": "next dev",
     "build": "next build",
     "start": "next start",
     "lint": "eslint",
-    "postinstall": "prisma generate"
+    "postinstall": "prisma generate",
+    "test": "vitest run",
+    "test:watch": "vitest"
   },
```

Add dev dependency:

```diff
   "devDependencies": {
     // ... existing devDeps ...
+    "vitest": "^3.0.0",
+    "@testing-library/react": "^16.0.0",
+    "@vitejs/plugin-react": "^4.3.0"
   }
```

Create `vitest.config.ts` at project root:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

---

<a id="fix-16-vfs-dotfiles"></a>
## 16. File: `src/lib/agents/ruflo/vfs.ts`

### Fix P0-9: Allow legitimate configuration dotfiles (`.gitignore`, `.env`, `.eslintrc`)

In `sanitizePath()` (around line 72), replace the blind `cleanPath.startsWith('.')` check:

```diff
  // Normalize and clean trailing slashes
  cleanPath = path.normalize(cleanPath).replace(/\\/g, '/').replace(/\/+$/, '');

- if (cleanPath === '.' || cleanPath === '' || cleanPath.startsWith('.')) {
+ // FIX P0-9: Block relative traversal prefixes (./, ../, ., ..) but ALLOW config dotfiles (.env, .gitignore)
+ if (
+   cleanPath === '.' || 
+   cleanPath === '..' || 
+   cleanPath === '' || 
+   cleanPath.startsWith('./') || 
+   cleanPath.startsWith('../') ||
+   cleanPath.includes('/.') // prevent hidden subfolder escapes like foo/../
+ ) {
+   // Check if it's a valid single-level or multi-level dotfile (e.g., .gitignore, .env, src/.eslintrc.json)
+   const baseName = path.basename(cleanPath);
+   if (!baseName.startsWith('.') || baseName === '.' || baseName === '..') {
      throw new Error(`Security Exception: Invalid file path: "${filePath}"`);
+   }
  }
```

---

<a id="fix-17-download-windows"></a>
## 17. File: `src/app/api/conversations/[id]/download/route.ts`

### Fix P1-12: Windows-compatible ZIP download (fallback to PowerShell `Compress-Archive` or Node zip)

Replace the `zip` execution block (lines 32–37):

```typescript
    // FIX P1-12: Cross-platform archive creation (handles Windows PowerShell and Unix zip)
    if (process.platform === 'win32') {
      // Use PowerShell built-in Compress-Archive on Windows
      const psCommand = `Compress-Archive -Path "${projectDir}\\*" -DestinationPath "${tempZipPath}" -Force`;
      await execFilePromise('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psCommand]);
    } else {
      // Unix/Linux/macOS standard zip command
      await execFilePromise('zip', ['-r', tempZipPath, '.'], { cwd: projectDir });
    }

    if (!fs.existsSync(tempZipPath)) {
      return NextResponse.json({ error: 'Failed to package files into zip archive' }, { status: 500 });
    }
```

---

<a id="fix-18-preview-zombies"></a>
## 18. File: `src/lib/agents/ruflo/orchestrator.ts`

### Fix P1-13: Preview server process lifecycle management and PID tracking

At the top of `orchestrator.ts` (around line 20), add active preview processes registry:

```typescript
// FIX P1-13: Track active child processes to prevent orphaned port 8080 zombie servers
export const activePreviewProcesses = new Map<string, import('child_process').ChildProcess>();

export function killPreviewProcess(conversationId: string) {
  const proc = activePreviewProcesses.get(conversationId);
  if (proc && !proc.killed) {
    try {
      if (process.platform === 'win32' && proc.pid) {
        exec(`taskkill /pid ${proc.pid} /T /F`);
      } else {
        proc.kill('SIGTERM');
      }
    } catch (e) {}
    activePreviewProcesses.delete(conversationId);
  }
}
```

In `launchVSCodePreview` (around line 508), clean up previous servers and save the new process handle:

```typescript
// FIX P1-13: Kill any existing server for this conversation before spawning
killPreviewProcess(conversationId);

if (entryFile) {
  onEvent({
    type: 'AGENT_LOG',
    message: `⚡ Automatic Local Execution: Launching Node.js backend server (${entryFile})...`,
  });
  const child = exec(`node ${entryFile}`, { cwd: projectPath }, (error) => {
    if (error && !child.killed) {
      onEvent({ type: 'AGENT_LOG', message: `⚠️ Node.js Runtime Error: ${error.message}` });
    }
  });
  activePreviewProcesses.set(conversationId, child);
} else if (fs.existsSync(path.join(projectPath, 'index.html'))) {
  onEvent({
    type: 'AGENT_LOG',
    message: `⚡ Automatic Local Execution: Launching local web preview server (npx serve)...`,
  });
  const child = exec(`npx serve -s . -l 8080`, { cwd: projectPath });
  activePreviewProcesses.set(conversationId, child);
}
```

And in `abortPipelineExecution()`:
```typescript
export function abortPipelineExecution(conversationId: string) {
  killPreviewProcess(conversationId); // FIX P1-13: Kill preview server on abort
  const controller = pipelineAbortControllers.get(conversationId);
  if (controller) {
    controller.abort();
    pipelineAbortControllers.delete(conversationId);
  }
}
```

---

<a id="fix-19-linter-ts-modules"></a>
## 19. File: `src/lib/agents/ruflo/linter.ts`

### Fix P1-14: Suppress external missing module TS2307 on `.ts` and `.tsx` files

In `runLinter()` diagnostic filtering (around line 133):

```diff
-      // For JS/JSX files, ignore external missing module errors (TS2307, TS1479, TS7016, TS2304 for globals) and focus on true syntax/parser errors
-      if (isJsOrJsx && (diagnostic.code === 2307 || diagnostic.code === 1479 || diagnostic.code === 7016 || diagnostic.code === 2304 || diagnostic.code === 2552)) {
+      // FIX P1-14: For virtual workspaces without installed node_modules, suppress external package resolution errors (TS2307, TS1479, TS7016, TS2304) for BOTH JS and TS files
+      // Only enforce relative import resolution (e.g., './components/Button') via runCrossFileImportCheck()
+      if (diagnostic.code === 2307 || diagnostic.code === 1479 || diagnostic.code === 7016 || (isJsOrJsx && (diagnostic.code === 2304 || diagnostic.code === 2552))) {
         return;
       }
```

---

<a id="fix-20-clear-cascade"></a>
## 20. File: `src/app/api/conversations/clear/route.ts`

### Fix P2-10: Explicit cascading delete across all child tables in SQLite

Replace `clear/route.ts` (lines 14–16):

```typescript
    // FIX P2-10: Explicitly delete all child records in SQLite to avoid orphaned state
    await prisma.$transaction([
      prisma.virtualFile.deleteMany(),
      prisma.agentIndex.deleteMany(),
      prisma.agentOutput.deleteMany(),
      prisma.executionHistory.deleteMany(),
      prisma.executiveMemory.deleteMany(),
      prisma.conversation.deleteMany(),
    ]);
```

---

<a id="fix-15-post-change-commands"></a>
## 21. Post-Change Commands

After applying all changes, run these commands in order:

```bash
# 1. Regenerate Prisma client after schema changes
npx prisma migrate dev --name fix-virtualfile-cascade-delete

# 2. Install new test dependencies
npm install --save-dev vitest @testing-library/react @vitejs/plugin-react

# 3. Verify TypeScript compilation
npx tsc --noEmit

# 4. Run linting
npm run lint

# 5. Verify Prisma generation
npx prisma generate

# 6. Start dev server to verify nothing crashed
npm run dev
```

---

## Priority Implementation Order

> [!IMPORTANT]
> Implement in this exact order to avoid breaking the build mid-way:

| Step | Files | Issues Fixed | Risk |
|:---|:---|:---|:---|
| 1 | `prisma/schema.prisma` + migrate | P1-2, P2-9 | Low — additive schema change |
| 2 | `sml.ts` | P1-4, P1-5, P1-6 | Low — backward compatible |
| 3 | `memory.ts` | P1-7, P1-8 | Medium — changes invalidation behavior |
| 4 | `stream/route.ts` | P0-2, P0-4, P1-1 | **High** — SSE plumbing changes |
| 5 | `TopAppBar.tsx` | P0-3 | Low — additive UI change |
| 6 | All registry `*.ts` | P0-5, P0-6, P2-8, P3-2 | Medium — changes prompt behavior |
| 7 | `orchestrator.ts` | P0-7, P1-9, P2-2 | **High** — core pipeline changes |
| 8 | `agents.ts` | P0-1 (partial) | Low — config change only |
| 9 | `inference.ts` | P0-1 (partial), P2-5 | **High** — streaming changes |
| 10 | `WorkspaceContent.tsx` + new write route | P1-11, P2-6 | Medium — UI + new API |
| 11 | `token-budgeter.ts` | P2-7 | Low — defensive fix |
| 12 | `eventDispatcher.ts` | P2-3 | Low — config change |
| 13 | `contextResolver.ts` (new) | P1-10 | Low — new file |
| 14 | `package.json` + `vitest.config.ts` | P3-6 | Low — dev tooling |
| 15 | `vfs.ts` | P0-9 | Low — defensive path fix |
| 16 | `download/route.ts` | P1-12 | Low — cross-platform archive fix |
| 17 | `orchestrator.ts` (preview process lifecycle) | P1-13 | Medium — process cleanup |
| 18 | `linter.ts` (TS external module suppression) | P1-14 | Low — linter fix |
| 19 | `clear/route.ts` | P2-10 | Low — database transaction cleanup |

---

## Issues NOT Fixable With Code Changes Alone

> [!CAUTION]
> These require **architectural decisions** beyond code patches:

| Issue | Why It's Not a Simple Fix |
|:---|:---|
| **P0-1 (Full ReAct Loop)** | Enabling tools in agent defs is step 1 (done above). But the actual ReAct action/observation loop in `orchestrator.ts` requires a new execution engine: parse tool calls from LLM output → execute tools → feed observations back → repeat until LLM returns final answer. This is ~200-400 lines of new orchestrator code. |
| **P0-8 (Vercel Compatibility)** | Requires replacing SQLite with Postgres/Turso, switching VFS disk writes to cloud storage (S3/R2), adding Vercel Edge config, moving pipeline to background jobs (Inngest/QStash), and replacing Ollama with cloud LLM APIs. This is a multi-week migration. |
| **P3-1 (Multi-Instance File Locking)** | Requires Redis-based distributed locks or database-level advisory locks. Only matters if running multiple Node.js instances. |
| **P3-5 (Preview Cleanup on Abort)** | Requires tracking spawned child process PIDs and killing them in the abort handler. Small but needs integration testing. |
