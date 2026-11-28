# Deep Root Cause Analysis (RCA) & System Drift Audit Report
**Project Name:** AutoCoder  
**Audit Date:** August 24, 2026  
**Scope:** Exhaustive Codebase & Subsystem Audit (`src/`, `prisma/schema.prisma`)  
**Format:** Detailed Root-Cause Mechanics (WHAT, WHY, HOW IT FAILS, HOW TO FIX)  

---

## 1. Executive Summary & Comprehensive System Overview

AutoCoder is designed as a sandboxed, local-first multi-agent software synthesis platform. Its architecture specifies a 3-pass compiler pipeline operating over 11 specialized agent roles (`Queen` → `Planner` → `Architect` → `System` → `Designer` → `Blueprinter` → `Coder` → `Tester` → `Debugger` → `Security` → `Reviewer`).

This audit evaluated the live implementation against the authoritative Software Requirements Specification (SRS v2.0). The audit reveals that while the basic execution loop, Virtual File System (VFS), in-memory TypeScript linter, and real-time Server-Sent Events (SSE) streaming operate successfully, **the Specification Memory Layer (SML), Executive Memory (EM), token budgeter, and agent retrieval infrastructure have suffered severe architectural breakdowns, stubbed implementations, and operational drift**.

---

## 2. Deep-Dive Operational Breakdowns

### 2.1 Stubbed Executive Memory State Management

* **Location:** `src/lib/agents/ruflo/memory.ts` (lines 45–68)

#### WHAT
The core state persistence functions for Executive Memory, `loadExecutiveMemory()` and `saveExecutiveMemory()`, are entirely non-functional. `loadExecutiveMemory()` returns a hardcoded blank skeleton state object on every execution, while `saveExecutiveMemory()` is an empty function containing only a comment.

```typescript
// Current implementation in src/lib/agents/ruflo/memory.ts
export async function loadExecutiveMemory(conversationId: string): Promise<MemoryState> {
  return {
    originalPrompt: '',
    taskSpec: null, planner: null, architect: null, system: null,
    designer: null, blueprinter: null, coder: {}, debugger: null,
    security: null, reviewer: null, tester: null,
    invalidated: [], hashes: {}, fileStateHistory: {}, decisions: [],
  };
}

export async function saveExecutiveMemory(conversationId: string, state: MemoryState) {
  // Safe no-op: Stage outputs are persisted via StagePersistence + CorrelationService
}
```

#### WHY
During earlier development iterations, the team attempted to decouple stage persistence into a dedicated `StagePersistence` service class (`persistence.ts`) and `ExecutiveMemoryGateway`. However, `saveExecutiveMemory()` was commented out and converted to a no-op before `StagePersistence` was actually integrated into the pipeline orchestrator. As a result, the persistence link was severed entirely, leaving `ExecutiveMemory` as a ghost subsystem.

#### HOW IT FAILS (Runtime Impact)
1. **Loss of Invalidation & Retry Memory:** When a stage fails or is invalidated via `StageLedger.invalidate()`, the invalidation list is stored in the transient `MemoryState` object. Because `saveExecutiveMemory()` is a no-op, any server restart, hot-reload, or pipeline pause/resume wipes `invalidated[]`. The system forgets which stages needed re-runs.
2. **Loss of Oscillation Protection:** `StageLedger.write()` calculates MD5 hashes of generated files and pushes them to `fileStateHistory` to detect infinite repair loops between `Coder` and `Debugger`. Because `saveExecutiveMemory()` never writes to SQLite, `fileStateHistory` is lost between runs. Re-running a pipeline can cause the Coder and Debugger to oscillate indefinitely on identical broken code.
3. **Empty Memory Reloads:** Calling `loadExecutiveMemory(conversationId)` when resuming a paused conversation always yields empty memory fields (`taskSpec: null`, `planner: null`, etc.), forcing downstream stages to execute with zero state context.

#### HOW TO FIX
1. **Upgrade `ExecutiveMemory` Schema:** Transition `ExecutiveMemory` in `prisma/schema.prisma` from a single JSON blob into a per-write ledger with columns: `inferenceId`, `agentName`, `sequence`, `contentMd`, `consumedIds`, `filePath`, `status`, and `contentHash`.
2. **Implement `loadExecutiveMemory()`:** Query `prisma.executiveMemory.findMany({ where: { conversationId }, orderBy: { sequence: 'asc' } })`. Reconstruct `MemoryState` by populating agent fields from the latest `ACTIVE` records, rebuilding `coder` file maps, and restoring `hashes` and `fileStateHistory`.
3. **Implement `writeExecutiveMemoryRecord()`:** When `StageLedger.write()` or `runAgent()` is invoked, persist a new row with sequence numbers, deterministic `inferenceId` strings (`${agentName}-${seq}-${shortHash}`), and content MD5 hashes.

---

### 2.2 Context Assembly Bypasses Memory Ledger for Fragile VFS Markdown Scraping

* **Location:** `src/lib/agents/ruflo/orchestrator.ts` (lines 182–243)

#### WHAT
Rather than retrieving upstream specification data from indexed database tables (`AgentOutput` or `ExecutiveMemory`), `buildStageContext()` scrapes Markdown documents stored in the Virtual File System (`plan.md`, `requirements.md`, `architecture.md`, `backend_spec.md`, `ui_spec.md`) using regular expressions (`extractSnapshot()`).

```typescript
// Current implementation in src/lib/agents/ruflo/orchestrator.ts
export async function buildStageContext(conversationId: string, stage: string): Promise<string> {
  const upstreamFiles = CONTEXT_MAP[stage] || [];
  let context = '';
  if (stage !== 'Queen') {
    const queenSnapshot = await extractSnapshot(conversationId, 'plan.md');
    if (queenSnapshot) {
      context += `=== ORIGINAL USER INTENT (DO NOT OVERRIDE) ===\n${queenSnapshot}\n\n`;
    }
  }
  for (const filename of upstreamFiles) {
    if (filename === 'plan.md') continue;
    const snapshot = await extractSnapshot(conversationId, filename);
    if (snapshot) {
      context += `--- [FROM ${filename}] ---\n${snapshot}\n\n`;
    }
  }
  return context.trim();
}
```

#### WHY
When the pipeline migrated from structured JSON outputs to formatted Markdown text documents (Hybrid v2 Pipeline), developers implemented `extractSnapshot()` to quickly pull context sections from VFS markdown files without altering the prompt formatting. This shortcut bypassed the database memory layer entirely in favor of direct VFS file scraping.

#### HOW IT FAILS (Runtime Impact)
1. **Async Timing Race Conditions:** If an upstream agent finishes LLM inference but the async `writeVirtualFile` call has not completed or flushed to disk before `buildStageContext()` is called for the next stage, `readVirtualFile()` returns `null`. `extractSnapshot()` then returns `""`, causing downstream agents (e.g. `Architect` or `System`) to execute with **zero upstream context**.
2. **Coupling to Hardcoded Filenames:** Upstream context assembly is hardcoded to specific VFS filenames (`plan.md`, `requirements.md`). If an agent output filename changes or if a custom stage is introduced, the context pipeline breaks silently without throwing errors.
3. **No Provenance or Version Tracking:** VFS snapshot scraping cannot tell which execution attempt generated a snapshot. If `Planner` runs 3 times due to retries, `buildStageContext()` reads whatever text currently sits in `requirements.md`, with zero traceability regarding which inference run produced it.

#### HOW TO FIX
1. **Direct DB Querying by `agentName`:** Replace `CONTEXT_MAP` (filename-keyed) with `UPSTREAM_AGENT_MAP` (agentName-keyed).
2. **Query `ExecutiveMemory` Ledger:** In `buildStageContext()`, fetch active records directly from `ExecutiveMemory` using `prisma.executiveMemory.findMany({ where: { conversationId, agentName: { in: upstreamAgents }, status: 'ACTIVE' } })`.
3. **Track Consumed Provenance:** Return both the assembled context text and an array of consumed `inferenceId` strings (`["Queen-1-a3f8c2", "Planner-1-9d4e71"]`) so `runAgent()` can log exact provenance for every inference call.

---

### 2.3 Total Disconnect Between `StagePersistence` Output Engine and Orchestrator

* **Location:** `src/lib/agents/ruflo/persistence.ts` & `src/lib/agents/ruflo/orchestrator.ts`

#### WHAT
The codebase contains a 296-line `StagePersistence` class with specialized schema handlers (`persistQueenOutput`, `persistPlannerOutput`, `persistArchitectOutput`, etc.) designed to parse JSON and populate 11 dedicated database tables (`QueenStageOutput`, `PlannerStageOutput`, `ArchitectStageOutput`, `SystemStageOutput`, `DesignerStageOutput`, `BlueprinterStageOutput`, `TesterStageOutput`, `DebuggerStageOutput`, `ReviewerStageOutput`, `SecurityStageOutput`).

**However, `StagePersistence` is called nowhere in `orchestrator.ts` or any active file in `src/`.**

```typescript
// Defined in src/lib/agents/ruflo/persistence.ts, but NEVER imported or called in orchestrator.ts!
export class StagePersistence {
  static async persistStageOutput(stage: string, conversationId: string, data: any): Promise<string> {
    switch (stage) {
      case 'Queen': // upserts into QueenStageOutput ...
      case 'Planner': // upserts into PlannerStageOutput ...
      // 290 lines of schema mappings...
    }
  }
}
```

#### WHY
`StagePersistence` was written when the architecture relied on typed JSON payloads for each stage. When the orchestrator shifted to generating Markdown documents (`validatedJson: { content: sanitized }`), `StagePersistence` broke because Markdown strings failed JSON column extractions (e.g. `safeData.mvpScope.included`). Rather than updating `StagePersistence`, developers simply stopped calling it, leaving both the class and its 11 SQLite tables orphaned.

#### HOW IT FAILS (Runtime Impact)
1. **Schema Overhead:** 11 database tables exist in `prisma/schema.prisma` and SQLite, but remain 100% empty across all pipeline runs.
2. **Developer Confusion:** New developers or external agents reading `persistence.ts` assume stage outputs are stored in `QueenStageOutput` / `PlannerStageOutput`, leading to incorrect bug fixes and misaligned API queries.

#### HOW TO FIX
1. **Deprecate or Repurpose:** Either formally remove `persistence.ts` and the 11 dead `*StageOutput` tables from `schema.prisma`, or repurpose `ExecutiveMemory` as the single unified per-agent ledger.
2. **Single Unified Ledger (`ExecutiveMemory`):** Consolidate all stage outputs into the modernized `ExecutiveMemory` multi-row table, eliminating the need for 11 separate relational tables.

---

### 2.4 Stubbed Agent Registry `getContext()` Hooks

* **Location:** `src/lib/agents/ruflo/registry/*.ts` & `src/lib/agents/contextBuilder.ts`

#### WHAT
`src/lib/agents/contextBuilder.ts` exposes a helper function `buildUserContext(ledger, agentName)` designed to call `agentDef.getContext(ledger)` on each agent's registry file. However, **every single agent registry file exports a stubbed function that returns an empty string `""`**.

```typescript
// Found in Queen.ts, Planner.ts, Architect.ts, System.ts, Designer.ts, Blueprinter.ts, Coder.ts, Tester.ts, Debugger.ts, Security.ts, Reviewer.ts:
export async function getContext(): Promise<string> {
  return "";
}
```

#### WHY
The registry files were originally created to hold agent-specific prompt templates, temperature settings, output schemas, and custom context assembly rules. When context assembly was centralized into `orchestrator.ts` via `buildStageContext()`, the per-agent `getContext()` functions were left as empty stubs `return ""` to satisfy the TypeScript `AgentDef` interface interface.

#### HOW IT FAILS (Runtime Impact)
1. **Dead Code Path:** `contextBuilder.ts` executes on every agent run, imports `AGENT_DEFS`, checks if `getContext` is a function, calls it, receives `""`, and returns `'{}'`. This is a completely redundant code execution path.
2. **Rigid Centralization:** Because registry files cannot provide custom context assembly logic, all context building is forced into a single monolithic function in `orchestrator.ts`.

#### HOW TO FIX
1. **Implement Registry Hooks:** Update registry `getContext()` hooks to pull from `StageLedger` or `ExecutiveMemory` when agent-specific filtering is required (e.g. `Coder` needing specific dependency file interfaces).
2. **Clean Up `contextBuilder.ts`:** Align `contextBuilder.ts` with `buildStageContext()` so context assembly is unified and predictable across the pipeline.

---

### 2.5 Dynamic Token Budgeter Degradation & Markdown Schema Mismatch

* **Location:** `src/lib/agents/ruflo/token-budgeter.ts` (lines 30–75)

#### WHAT
`calculateTokenBudget(agentName, ledger)` dynamically calculates token context windows for each agent. It attempts to read JSON array lengths from upstream stage outputs stored in `ledger`:

```typescript
// Current implementation in src/lib/agents/ruflo/token-budgeter.ts
if (agentName === 'Planner') {
  const taskSpec = ledger.read('taskSpec');
  const featuresCount = taskSpec?.mvpScope?.included?.length || 0; // Evaluates to 0!
  budget = 16384 + (featuresCount * 1024);
} else if (agentName === 'Architect') {
  const planner = ledger.read('planner');
  const featuresCount = planner?.features?.length || 0; // Evaluates to 0!
  budget = 16384 + (featuresCount * 1024);
}
```

#### WHY
`token-budgeter.ts` was written assuming `ledger.read('taskSpec')` returned a parsed JSON tree containing `taskSpec.mvpScope.included` arrays. When the orchestrator shifted to saving Markdown documents wrapped in `{ content: sanitized }`, `taskSpec.mvpScope` evaluated to `undefined`.

#### HOW IT FAILS (Runtime Impact)
1. **Silent Fallback to Base Window:** `featuresCount` and `fileCount` evaluate to `0`. `budget` falls back to the minimum base budget (`16384` tokens).
2. **Context Truncation on Large Projects:** For large applications with 15+ features or 30+ files, the token window fails to scale dynamically. Large prompts get truncated by local LLMs (Ollama `num_ctx`), resulting in incomplete code generation and syntax errors.

#### HOW TO FIX
1. **Add Markdown Item Counter:** Implement a markdown parsing helper (`countMarkdownItems`) in `token-budgeter.ts` that counts bullet items (`- ` or `* `) under specification headers.
2. **Fallback Calculation:** If structured JSON arrays are missing, use `countMarkdownItems(content)` to derive feature and file counts accurately.

---

### 2.6 Missing In-Flight Memory Synchronization in `runAgent()`

* **Location:** `src/lib/agents/ruflo/orchestrator.ts` (lines 620–670)

#### WHAT
When `runAgent()` completes an agent execution, it writes output to `writeVirtualFile` and `writeAgentOutput`, but **never calls `ledger.write()` or updates the in-memory `ledger` state**.

```typescript
// Inside runAgent() in orchestrator.ts
await writeVirtualFile(conversationId, outputFilename, sanitized);
await writeRichTelemetryLog({ ... });
await writeAgentOutput({ ... });
// MISSING: ledger.write(agentName, fieldName, sanitized);
```

#### WHY
Developers assumed that writing to `writeAgentOutput()` was sufficient for data persistence, neglecting to sync the in-flight `StageLedger` instance instantiated at the start of `runOrchestrator()`.

#### HOW IT FAILS (Runtime Impact)
1. **Stale Execution State:** In a single pipeline run, when Stage 3 (`Architect`) executes, the in-memory `ledger` object passed to `calculateTokenBudget` still holds `null` for `taskSpec` and `planner`.
2. **Compounded Budget Failure:** Combines with Issue 2.5 to guarantee that token budget calculations fail across all 11 stages during an active pipeline run.

#### HOW TO FIX
1. **In-Flight Memory Update:** Inside `runAgent()`, update `(ledger.getState() as any)[fieldName] = { content: sanitized }` immediately after `writeAgentOutput()` completes.

---

### 2.7 Coder Multi-File Output Overwrite & Status Supersession Flaw

* **Location:** `src/lib/agents/ruflo/memory.ts` & `src/lib/agents/ruflo/orchestrator.ts`

#### WHAT
Specification agents (`Queen`, `Planner`, `Architect`, `System`, `Designer`, `Blueprinter`) execute 1 output document per stage. `Coder`, however, executes in a multi-file synthesis loop (generating N files per stage). If `writeExecutiveMemoryRecord` supersedes records by `agentName` alone:

```typescript
// Dangerous code:
await prisma.executiveMemory.updateMany({
  where: { conversationId, agentName: 'Coder', status: 'ACTIVE' },
  data: { status: 'SUPERSEDED' },
});
```

#### WHY
A generic supersession strategy assumes 1 stage = 1 output record. It fails to account for Coder's file-loop execution model.

#### HOW IT FAILS (Runtime Impact)
1. **Data Loss During Coder Loop:** When Coder generates File 1 (`routes.ts`), it is marked `ACTIVE`. When Coder generates File 2 (`models.ts`), the query marks File 1 as `SUPERSEDED`.
2. **Incomplete Workspace Reconstruction:** At loop completion, **only the very last generated file remains `ACTIVE`** in `ExecutiveMemory`. All previous files generated during the same run are marked `SUPERSEDED`, destroying multi-file context lookups.

#### HOW TO FIX
1. **Scoped Supersession:** Scope supersession for Coder by `(conversationId, 'Coder', filePath, status: 'ACTIVE')` when `filePath` is present.
2. **Per-File Active Status:** Maintain all active files for Coder as `ACTIVE` until a specific file is regenerated.

---

### 2.8 Provenance Break in Coder and Debugger Stages

* **Location:** `src/lib/agents/ruflo/orchestrator.ts` (lines 850–960)

#### WHAT
`buildStageContext()` is called for specification agents, populating context text and consumed `inferenceId` lists. However, **`Coder` calls `buildCoderContext()`** and **`Debugger` uses `repairPrompt`**, leaving `consumedIds` empty (`"[]"`) on Coder and Debugger memory records.

#### WHY
`buildCoderContext()` and Debugger repair prompts were constructed as specialized string builders to inject blueprint snippets and linter diagnostics, bypassing `buildStageContext()`.

#### HOW IT FAILS (Runtime Impact)
1. **Broken Traceability:** The provenance graph breaks at the coding phase. It becomes impossible to trace which `Blueprinter` inference ID produced a specific `Coder` file record, or which `Tester` linter run triggered a `Debugger` repair.

#### HOW TO FIX
1. **Explicit Provenance Passing:** In `runOrchestrator()`, pass the latest active `Blueprinter` `inferenceId` to `Coder`, and pass the failing `Tester` and `Coder` `inferenceId`s to `Debugger` during `writeExecutiveMemoryRecord()`.

---

## 3. Deep-Dive Architectural & Operational Drifts from SRS

### 3.1 SML JSON Path Retrieval vs Monolithic Markdown Strings

* **SRS Reference:** Section 5 & Section 7 (`queryAgentOutput`, `queryMultiple`, `searchKnowledge`)
* **Live Code:** `src/lib/agents/sml.ts` & `src/lib/agents/ruflo/orchestrator.ts`

#### WHAT
The SRS specifies a Specification Memory Layer (SML) where agents query specific JSON sub-trees using path indexing (`queryAgentOutput({ agent: "Planner", path: "features" })`). In the live codebase, `orchestrator.ts` writes raw Markdown text wrapped in `{ content: sanitized }` into `AgentOutput.validatedJson`.

```typescript
// Live implementation in orchestrator.ts
await writeAgentOutput({
  conversationId,
  agentName,
  stage: agentName,
  schemaVersion: '2.0.0',
  model: config.ollamaModel,
  validatedJson: { content: sanitized }, // Pure Markdown string inside JSON!
  executionTime: durationMs,
  tokenUsage: estimatedTokens,
  attempt,
});
```

#### WHY & DRIFT ANALYSIS
Local LLMs (e.g. Llama-3 8B, Mistral 7B) frequently failed strict JSON schema validation when attempting to output deeply nested multi-level JSON structures for full applications. The development team shifted to Markdown headers (`### Context Snapshot`, `### MVP Scope`) to increase generation reliability. While this improved LLM completion rates, it caused the system to drift away from SML JSON path indexing.

---

### 3.2 ReAct Repair Loops vs Linear Pipeline Execution

* **SRS Reference:** Section 4 (`Pass 1: Scaffolding` -> `Pass 2: Hardening & Bug Repair`)
* **Live Code:** `src/lib/agents/ruflo/orchestrator.ts` (lines 744–990)

#### WHAT
The SRS specifies an iterative ReAct compiler loop where test failures or security findings trigger multi-stage rollbacks to `Architect` or `System`. In the live code, `runOrchestrator` runs a linear 11-stage loop. Tester and Debugger only attempt localized single-file TypeScript linter repairs.

#### DRIFT ANALYSIS
True multi-stage ReAct loops require robust state rollback and invalidation tracking. Because `ExecutiveMemory` persistence was stubbed out (Issue 2.1), multi-stage rollbacks were disabled to prevent cascade failures, resulting in a single-pass linear pipeline.

---

### 3.3 Dormant Hybrid Graph-Document Ledger Tables

* **SRS Reference:** Section 6 (`GraphNode` & `GraphEdge` Data Architecture)
* **Live Code:** `prisma/schema.prisma` (lines 89–123) & `memory.ts` (lines 135–160)

#### WHAT
`prisma/schema.prisma` defines `GraphNode`, `GraphEdge`, `StageExecutionLog`, and `Correlation` models. `ExecutiveMemoryGateway.getSubgraph()` in `memory.ts` implements a recursive SQLite CTE query over `GraphNode` and `GraphEdge`.

**However, `GraphNode` and `GraphEdge` are populated nowhere in `src/`.**

#### DRIFT ANALYSIS
These models were added to prepare for a graph-based ReAct memory layer. The implementation was deferred, leaving the schema models dormant.

---

## 4. Subsystem Security, Concurrency & Infrastructure Audits

### 4.1 Virtual File System (`src/lib/agents/ruflo/vfs.ts`)

#### Audit Findings:
1. **Path Sanitization (Passed):** `sanitizePath()` (lines 33–47) correctly blocks absolute paths, leading slashes, and `../` traversal sequences.
2. **In-Memory Mutex Locking (Passed for Single Process):** `acquireLock()` serializes concurrent writes per file using a `Map<string, Promise<void>>`.
3. **Line-Range Diffs (Passed):** `applyDiff()` handles surgical edits and correctly allows bounds checking up to `lines.length + 1` for append operations.
4. **Multi-Process Scaling Risk (Warning):** The `fileLocks` Map is in-memory. If AutoCoder is deployed across multiple Node processes (e.g. PM2 cluster or serverless containers), file locks are not shared across instances.

---

### 4.2 Diagnostic Linter Host (`src/lib/agents/ruflo/linter.ts`)

#### Audit Findings:
1. **CompilerHost Interception (Passed):** `runLinter()` pre-loads virtual files for `conversationId` into `fileMap` and intercepts `host.readFile`, `host.fileExists`, and `host.getSourceFile` synchronously.
2. **Bracket Balancing (Passed):** `runBracketBalanceCheck()` includes full comment and string-literal state awareness.
3. **Fuzzy Basename Resolution Risk (Vulnerability):** `getVirtualContent()` (lines 56–71) uses fuzzy matching:
   ```typescript
   for (const [key, val] of fileMap.entries()) {
     if (cleanName.endsWith('/' + key) || cleanName === key) {
       return { key, content: val };
     }
   }
   ```
   If two files share a basename in different folders (e.g. `src/pages/index.ts` and `src/components/index.ts`), `getVirtualContent()` can resolve to the wrong file during module resolution, producing false TypeScript compiler errors.

---

### 4.3 Inference & Socket Resilience (`src/lib/agents/inference.ts`)

#### Audit Findings:
1. **Proxy Socket Bypass (Passed):** Sets `process.env.no_proxy = 'localhost,127.0.0.1,::1'` to prevent proxy interception.
2. **Undici Extended Dispatcher (Passed):** Instantiates a global `undici.Agent` with 30-minute timeouts (`headersTimeout: 1800000`) to prevent socket drops during long 30B model generations.
3. **Keep-Alive Heartbeat Daemon (Passed):** `startOllamaKeepAlive()` pings `/api/version` every 10 seconds to hold TCP sockets active.
4. **Cloud Provider Streaming Gap (Defect):** `options.onChunk` streaming is implemented for `ollama` but NOT for `openai` or `anthropic`, causing cloud inference calls to freeze browser SSE event streams until full completion.

---

## 5. Subsystem-by-Subsystem Audit Matrix

| Subsystem / File | Lines | Operational Status | Key Finding / Vector |
|---|---|---|---|
| `orchestrator.ts` | 1052 | **Active / Mixed** | Pipeline loop runs; context assembly relies on VFS regex scraping instead of DB. |
| `vfs.ts` | 205 | **Active / Healthy** | Sanitization and diff editing functional; physical disk sync active. |
| `linter.ts` | 317 | **Active / Functional** | TypeScript `CompilerHost` active; fuzzy `endsWith` matching risk on duplicate basenames. |
| `memory.ts` | 303 | **Breakdown** | `loadExecutiveMemory` and `saveExecutiveMemory` are stubbed out. |
| `persistence.ts` | 296 | **Dead Code** | 11 output tables written nowhere by orchestrator. |
| `sml.ts` | 92 | **Active / Partial** | Writes `AgentOutput` & `AgentIndex`; `queryAgentOutput` uncalled by pipeline. |
| `inference.ts` | 685 | **Active / Functional** | Ollama undici proxy bypass active; cloud streaming un-implemented. |
| `token-budgeter.ts` | 97 | **Degraded** | JSON field reads evaluate to `undefined` on Markdown outputs, falling back to base budget. |
| `contextBuilder.ts` | 14 | **Degraded** | Delegates to registry `getContext()` which all return `""`. |
| `agents.ts` & Registry | 36+ | **Active / Static** | Prompts active; `tools: []` on all agents; `getContext()` return `""`. |
| `WorkspaceContent.tsx` | 1836 | **Active / Healthy** | Reads `AgentOutput` directly; renders file tree, entity viewer, and SSE streaming. |

---

## 6. Step-by-Step Surgical Remediation Plan

To resolve all active breakdowns and align the codebase without breaking live UI or telemetry routes:

1. **Executive Memory Upgrade**:
   - Upgrade `ExecutiveMemory` model to a per-write multi-row ledger (`inferenceId`, `agentName`, `sequence`, `contentMd`, `consumedIds`, `filePath`, `status`, `contentHash`).
   - Implement scoped supersession in `writeExecutiveMemoryRecord` (`agentName` for spec agents, `(agentName, filePath)` for Coder).
2. **DB-Backed Context Assembly**:
   - Replace regex VFS file scraping in `buildStageContext()` with direct `ExecutiveMemory` queries using `UPSTREAM_AGENT_MAP` and transparent provenance linking.
3. **In-Flight Memory & Token Budgeter Sync**:
   - Update `runAgent()` to sync the in-memory `StageLedger` after every agent write.
   - Add markdown bullet-counting fallbacks in `token-budgeter.ts` so dynamic budget scaling functions properly.
4. **Linter Path Fix**:
   - Replace fuzzy `endsWith` basename matching in `linter.ts` `getVirtualContent()` with exact normalized relative path matching.
