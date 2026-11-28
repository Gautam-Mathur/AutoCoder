# AutoCoder System Overhaul: Master Implementation Checklist

> **Reference Specification**: [AUTOCODER_COMPLETE_AUDIT_AND_FIXES.md](file:///c:/Users/Lenovo/Desktop/AutoCoder/AUTOCODER_COMPLETE_AUDIT_AND_FIXES.md)  
> **Total Defect Count**: 47 Issues (9 P0 · 17 P1 · 14 P2 · 7 P3)  
> **Target Environment**: Windows / Linux / macOS (Node.js 20+, Next.js 14 App Router, Prisma ORM, Ollama/OpenAI API)

---

## Progress Dashboard

```
Total Tasks: 47 Issues across 10 Phases
[ ] Phase 1: Database Schema & Storage Integrity        (0/5 completed)
[ ] Phase 2: Core Memory & Context Plumbing            (0/6 completed)
[ ] Phase 3: Pipeline Concurrency, SSE & Abort         (0/6 completed)
[ ] Phase 4: Agent Registry Prompts & Context          (0/5 completed)
[ ] Phase 5: VFS, Linter & OS Compatibility            (0/7 completed)
[ ] Phase 6: Closed-Loop Build & Debugger Repair       (0/4 completed)
[ ] Phase 7: Monaco Workspace Editor & File Mutation   (0/2 completed)
[ ] Phase 8: ReAct Tool Execution & Inference          (0/6 completed)
[ ] Phase 9: Automated Testing & Verification Suite    (0/5 completed)
[ ] Phase 10: Serverless / Cloud Production Roadmap    (0/3 completed)
```

---

## Phase 1: Database Schema & Storage Integrity

Focus: Fix schema relation gaps, ensure transactional atomic indexing in SML, and prevent foreign-key lockouts during workspace resets.

- [ ] **1.1 [P0-9] Fix Prisma Schema Missing VirtualFile Relation & Enable Cascade Delete**
  - **Target**: [`prisma/schema.prisma`](file:///c:/Users/Lenovo/Desktop/AutoCoder/prisma/schema.prisma#L35-L42)
  - **Actions**:
    - Add `virtualFiles VirtualFile[]` relation field to `model Conversation`.
    - Add `onDelete: Cascade` on `VirtualFile.conversation` foreign key constraint.
    - Add `onDelete: Cascade` to `AgentOutput`, `AgentIndex`, `ExecutiveMemory`, `StageLedger`, `PipelineEvent`, and `LogEntry`.
  - **Verification**: Run `npx prisma db push` and `npx prisma generate` without errors.

- [ ] **1.2 [P1-3] Implement Recursive Deep Indexing & Fix Empty Vocabulary in SML**
  - **Target**: [`src/lib/agents/sml.ts`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/sml.ts#L48-L82)
  - **Actions**:
    - Implement recursive `flattenKeys(obj, prefix)` to deeply index nested agent output properties.
    - Implement `getVocabulary(conversationId, stage)` to query distinct indexed keys instead of returning `[]`.
    - Add fallback key extraction when stage outputs are raw Markdown instead of JSON.
  - **Verification**: Query vocabulary after running a stage; verify non-empty nested keys are returned.

- [ ] **1.3 [P2-6] Wrap SML Writes in Atomic Database Transactions**
  - **Target**: [`src/lib/agents/sml.ts`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/sml.ts#L10-L40)
  - **Actions**:
    - Wrap `prisma.agentOutput.create` and `prisma.agentIndex.createMany` inside `prisma.$transaction`.
    - Ensure index entries are never committed if output persistence fails.
  - **Verification**: Trigger simulated DB error on indexing; verify no orphaned `AgentOutput` records exist.

- [ ] **1.4 [P3-4] Safe Error Logging in SML Error Handlers**
  - **Target**: [`src/lib/agents/sml.ts`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/sml.ts#L35-L42)
  - **Actions**:
    - Replace `error.message` with safe type guard `error instanceof Error ? error.message : String(error)`.
  - **Verification**: Pass non-Error throwables into SML methods; verify process does not throw uncaught TypeError.

- [ ] **1.5 [P1-12] Atomic Conversation Reset with Cascading Table Cleanups**
  - **Target**: [`src/app/api/conversations/clear/route.ts`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/app/api/conversations/clear/route.ts#L1-L35)
  - **Actions**:
    - Replace raw singular deletes with a single `prisma.$transaction` deleting all dependent records (`VirtualFile`, `PipelineEvent`, `AgentOutput`, `AgentIndex`, `ExecutiveMemory`, `StageLedger`, `LogEntry`, `Conversation`).
    - Remove in-memory workspace files and abort running pipelines before clearing DB records.
  - **Verification**: Call `POST /api/conversations/clear`; verify all tables are wiped and SQLite database is clean.

---

## Phase 2: Core Memory & Context Plumbing

Focus: Eliminate stale cross-stage memory bleed, implement a unified markdown-aware context resolver, and enforce token budget limits.

- [ ] **2.1 [P0-6] Fix ExecutiveMemory Invalidation Map & Lifecycle State Management**
  - **Target**: [`src/lib/agents/ruflo/memory.ts`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/memory.ts#L70-L115)
  - **Actions**:
    - Expand `INVALIDATION_MAP` to cover all 10 pipeline stages:
      - `planner` $\to$ invalidates `['architect', 'system', 'designer', 'blueprinter', 'coder', 'tester', 'debugger', 'security']`
      - `architect` $\to$ invalidates `['system', 'blueprinter', 'coder', 'tester', 'debugger']`
      - `blueprinter` $\to$ invalidates `['coder', 'tester', 'debugger']`
      - `coder` $\to$ invalidates `['tester', 'debugger']`
      - `debugger` $\to$ invalidates `['tester']`
    - Update `getMemoriesForAgent()` to query `status: 'ACTIVE'` and order by `createdAt desc`.
  - **Verification**: Run pipeline; verify Coder does not receive invalidated memories from pre-Planner runs.

- [ ] **2.2 [P1-2] Extract Markdown Sections in Memory Context Queries**
  - **Target**: [`src/lib/agents/ruflo/memory.ts`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/memory.ts#L125-L160)
  - **Actions**:
    - Implement regex-based markdown heading extraction (`## Section` matching) when memory payload is Markdown.
    - Fallback to full content slice with token budget clipping when specific sections are not found.
  - **Verification**: Call `queryMemories(conversationId, 'System Architecture')`; verify only the matching header section is returned.

- [ ] **2.3 [P0-5] Create Centralized Context Resolver (`ContextResolver`)**
  - **Target**: `src/lib/agents/ruflo/contextResolver.ts` *(NEW FILE)*
  - **Actions**:
    - Implement `ContextResolver` class with deterministic upstream dependency mappings for each agent stage:
      - `Planner` $\gets$ User prompt + Queen goals
      - `Architect` $\gets$ Planner user journeys & milestones
      - `System` $\gets$ Architect tech stack & data models
      - `Designer` $\gets$ System requirements & Planner flows
      - `Blueprinter` $\gets$ System schemas + Designer component specs + Architect tech stack
      - `Coder` $\gets$ Blueprinter file tree & exact API contracts + VFS current state
      - `Tester` / `Debugger` $\gets$ Coder files + Build/Lint errors
      - `Security` $\gets$ All generated files + dependency manifest
    - Implement strict token budget truncation per section using `token-budgeter.ts`.
  - **Verification**: Unit test `ContextResolver.buildContextForStage(stage, ledger, vfs)`; verify exact expected context keys.

- [ ] **2.4 [P1-10] Enforce Stage Transition State Invariants**
  - **Target**: [`src/lib/agents/ruflo/orchestrator.ts`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/orchestrator.ts#L150-L210)
  - **Actions**:
    - Enforce sequential state transitions: `IDLE` $\to$ `RUNNING` $\to$ `BUILDING` $\to$ `VERIFYING` $\to$ `COMPLETED` (or `FAILED` / `ABORTED`).
    - Persist `currentStage` atomically to database on every stage completion.
    - Prevent invalid backwards transitions unless an explicit re-plan is triggered by Queen.
  - **Verification**: Attempt to launch pipeline in `RUNNING` state; verify rejection with descriptive error.

- [ ] **2.5 [P3-2] Prune Dead Empty `getContext()` Implementations in Agent Registry**
  - **Target**: [`src/lib/agents/ruflo/registry/*.ts`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/registry/)
  - **Actions**:
    - Replace all `getContext(): string { return ''; }` stubs with calls to `ContextResolver`.
  - **Verification**: Grep for `return ''` across all registry files; confirm 0 matches.

- [ ] **2.6 [P3-6] Eliminate Redundant In-Memory Context Builders**
  - **Target**: [`src/lib/agents/ruflo/orchestrator.ts`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/orchestrator.ts#L220-L260)
  - **Actions**:
    - Consolidate all ad-hoc prompt-stitching routines in `orchestrator.ts` to use `ContextResolver`.
  - **Verification**: Verify clean, unified context preparation code path for all 10 stages.

---

## Phase 3: Pipeline Concurrency, SSE Streaming & Abort Control

Focus: Prevent duplicate orchestrator instances, guarantee single-delivery SSE events with reconnection support, and provide responsive pipeline aborts.

- [ ] **3.1 [P0-2] Implement Launch Mutex & Single Active Pipeline Lock**
  - **Target**: [`src/app/api/pipeline/stream/route.ts`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/app/api/pipeline/stream/route.ts#L1-L50)
  - **Actions**:
    - Add in-memory `Set<string>` or Redis lock `launchLocks` tracking active `conversationId` pipelines.
    - Check lock before launching `orchestrator.runPipeline()`.
    - If pipeline is already running for the conversation, attach new SSE stream as a passive listener without re-triggering execution.
    - Release lock in a `finally` block when pipeline finishes, errors, or aborts.
  - **Verification**: Fire 5 simultaneous POST requests to `/api/pipeline/stream`; verify only 1 orchestrator instance runs.

- [ ] **3.2 [P0-4] Fix SSE Event Duplication & Implement Deterministic Event IDs**
  - **Target**: [`src/app/api/pipeline/stream/route.ts`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/app/api/pipeline/stream/route.ts#L51-L120)
  - **Actions**:
    - Remove the dual-emission pattern (where events were sent to both `onEvent` callback and global `eventDispatcher`).
    - Standardize SSE frame formatting: `id: <eventId>\nevent: <eventType>\ndata: <payload>\n\n`.
    - Buffer live events during historical event replay from database to prevent race-condition duplicates.
    - Implement `Last-Event-ID` header inspection to resume streaming from client's last seen event index.
  - **Verification**: Connect with EventSource client; verify exact monotonic event delivery without duplicate stage events.

- [ ] **3.3 [P0-3] Implement Full-Stack Pipeline Abort Handling**
  - **Target**:
    - [`src/app/api/pipeline/abort/route.ts`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/app/api/pipeline/abort/route.ts)
    - [`src/lib/agents/ruflo/orchestrator.ts`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/orchestrator.ts#L290-L340)
    - [`src/lib/agents/inference.ts`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/inference.ts#L45-L95)
  - **Actions**:
    - Pass active `AbortController` signal to Ollama / LLM fetch requests in `inference.ts`.
    - Pass signal to child build/lint processes (`execFile` / `spawn`).
    - Register active orchestrator `AbortController` in module-level registry keyed by `conversationId`.
    - In `POST /api/pipeline/abort`, call `controller.abort()`, kill child PIDs, and update database conversation state to `'ABORTED'`.
  - **Verification**: Start code generation, click Abort; verify inference terminates within 200ms and UI reflects Aborted.

- [ ] **3.4 [P2-3] Wire TopAppBar Abort Button to Backend Endpoint**
  - **Target**: [`src/components/TopAppBar.tsx`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/components/TopAppBar.tsx#L40-L95)
  - **Actions**:
    - Update `handleAbort` to issue `fetch('/api/pipeline/abort', { method: 'POST', body: JSON.stringify({ conversationId }) })`.
    - Render the Abort button during active running states (`RUNNING`, `GENERATING`, `BUILDING`).
    - Disable Launch controls while abort is pending.
  - **Verification**: Click Abort in UI; verify button disables, spinner shows, and state updates cleanly.

- [ ] **3.5 [P2-4] Frontend SSE Reconnection & Network Resilience**
  - **Target**: [`src/app/workspace/WorkspaceContent.tsx`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/app/workspace/WorkspaceContent.tsx#L110-L160)
  - **Actions**:
    - Track `lastEventId` on client state.
    - Implement exponential backoff reconnection on SSE drop (1s, 2s, 4s up to 10s).
    - Send `Last-Event-ID` on reconnect to fetch missed events without restarting pipeline.
  - **Verification**: Simulate network disconnection during Coder stage; verify stream resumes seamlessly upon reconnect.

- [ ] **3.6 [P3-8] Centralize Event Dispatching & SSE Formatting**
  - **Target**: [`src/lib/agents/ruflo/eventDispatcher.ts`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/eventDispatcher.ts#L1-L60)
  - **Actions**:
    - Unify event publishing through a typed `EventDispatcher` service.
    - Ensure all pipeline events (`STAGE_START`, `STAGE_CHUNK`, `STAGE_COMPLETE`, `ERROR`, `BUILD_OUTPUT`) follow strict TypeScript union types.
  - **Verification**: Check TypeScript compilation with `npx tsc --noEmit`.

---

## Phase 4: Agent Registry Prompts, Context & Token Limits

Focus: Fix prompt contradictions, raise token limits to allow full-project generation, and formalize stage input/output schemas.

- [ ] **4.1 [P1-1] Enforce Stage Output Schemas & JSON Validation**
  - **Target**: [`src/lib/agents/ruflo/registry/*.ts`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/registry/)
  - **Actions**:
    - Formalize schema validation using Zod or JSON Schema for structured stages (Planner, Blueprinter).
    - Allow structured Markdown for architectural stages (Architect, System, Designer, Security, Reviewer) while enforcing required section headings.
    - Add retry prompt when LLM output violates schema or omits required sections.
  - **Verification**: Pass mock invalid outputs to stage parsers; verify retry prompt triggers and fixes output.

- [ ] **4.2 [P1-15] Fix Designer System Prompt Contradictions**
  - **Target**: [`src/lib/agents/ruflo/registry/Designer.ts`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/registry/Designer.ts#L10-L45)
  - **Actions**:
    - Remove contradictory instructions (e.g., instructing Designer to output raw JSON in one paragraph and Markdown in another).
    - Standardize Designer output format to Markdown with explicit UI/UX sections: Design Tokens, Layout Hierarchy, Component Specifications, Accessibility Rules.
  - **Verification**: Run Designer stage; verify consistent markdown formatting with 0 parsing errors.

- [ ] **4.3 [P1-16] Increase LLM Generation Max Tokens to 8192**
  - **Target**: [`src/lib/agents/ruflo/registry/*.ts`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/registry/)
  - **Actions**:
    - Raise `maxTokens` from 4096 to `8192` across `Architect.ts`, `System.ts`, `Blueprinter.ts`, `Coder.ts`, `Debugger.ts`, and `Reviewer.ts`.
    - Prevent truncated file outputs and partial JSON trees.
  - **Verification**: Generate a multi-file project with Coder; verify no truncated files or cut-off code blocks.

- [ ] **4.4 [P1-17] Register System Agent in Expected Headers List**
  - **Target**: [`src/lib/agents/ruflo/orchestrator.ts`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/orchestrator.ts#L45-L65)
  - **Actions**:
    - Add `System` to `EXPECTED_FIRST_HEADERS` validation map in `orchestrator.ts`.
    - Ensure System agent's Markdown specification is validated properly before downstream ingestion.
  - **Verification**: Run orchestrator through System stage; verify validation passes without false header warnings.

- [ ] **4.5 [P1-11] Formalize Agent Input/Output Contracts & Temperature Profiles**
  - **Target**: [`src/lib/agents/ruflo/registry/*.ts`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/registry/)
  - **Actions**:
    - Set optimal temperature per role:
      - `Queen`: 0.3 (deterministic routing)
      - `Planner` / `Architect`: 0.4 (structured reasoning)
      - `Designer`: 0.6 (creative styling & layouts)
      - `System` / `Blueprinter`: 0.2 (strict contract definition)
      - `Coder` / `Debugger`: 0.1 (exact syntax & logic)
      - `Tester` / `Security`: 0.1 (strict evaluation)
  - **Verification**: Inspect agent registry configs; verify temperatures and maxTokens match role requirements.

---

## Phase 5: VFS File System, Linter & OS Compatibility

Focus: Allow config dotfiles, fix Windows path and zip export issues, prevent VFS diff corruption, and optimize TypeScript linting.

- [ ] **5.1 [P1-8] Allow Legitimate Configuration Dotfiles in VFS Path Sanitization**
  - **Target**: [`src/lib/agents/ruflo/vfs.ts`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/vfs.ts#L25-L60)
  - **Actions**:
    - Update `sanitizePath(filePath)` to permit essential project dotfiles: `.env`, `.env.local`, `.env.example`, `.gitignore`, `.eslintrc.json`, `.prettierrc`.
    - Maintain strict rejection of directory traversal (`../`, `..\`) and root-level escapes.
  - **Verification**: Write `.env.example` and `.gitignore` to VFS; verify write succeeds and traversal `../../foo` is blocked.

- [ ] **5.2 [P1-4] Fix `applyDiff()` Line-Range Expansion in VFS**
  - **Target**: [`src/lib/agents/ruflo/vfs.ts`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/vfs.ts#L140-L195)
  - **Actions**:
    - Fix `applyDiff()` to properly handle line array expansion when replacement chunk has more lines than target chunk.
    - Implement fallback to full file overwrite if unified diff hunk matching fails.
    - Re-run linter automatically on modified file after applying diff.
  - **Verification**: Apply a 10-line insertion diff into a 5-line file; verify file content matches expected output.

- [ ] **5.3 [P1-5] Fix VFS File Lock Cleanup & Stale Lock Release**
  - **Target**: [`src/lib/agents/ruflo/vfs.ts`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/vfs.ts#L70-L115)
  - **Actions**:
    - Ensure `fileLocks.delete(filePath)` is called in a `finally` block for all read/write/diff operations.
    - Add lock timeout (5000ms) to auto-release deadlocks caused by unhandled exceptions.
  - **Verification**: Simulate an error during file write; verify subsequent writes to the same file path succeed.

- [ ] **5.4 [P1-6] Smart TS2307 Module Resolution Handling in Linter**
  - **Target**: [`src/lib/agents/ruflo/linter.ts`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/linter.ts#L45-L95)
  - **Actions**:
    - Suppress `TS2307: Cannot find module` ONLY for known external packages (`react`, `next`, `lucide-react`, `tailwindcss`, etc.) listed in generated `package.json`.
    - Flag `TS2307` as a real error when the missing module is a local relative import (`./Button`, `../components/Card`, `@/lib/db`) missing from VFS.
  - **Verification**: Lint file with valid `import React from 'react'` (no error) vs `import { Header } from './Header'` where `Header.tsx` does not exist (flags missing file error).

- [ ] **5.5 [P1-7] Expand Multi-Language Linter Coverage**
  - **Target**: [`src/lib/agents/ruflo/linter.ts`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/linter.ts#L100-L160)
  - **Actions**:
    - Add basic syntax and schema validation for JSON files (`package.json`, `tsconfig.json`).
    - Add CSS syntax verification and unclosed tag / brace detection for HTML/JSX templates.
  - **Verification**: Pass malformed `package.json` with trailing comma; verify linter captures JSON syntax error.

- [ ] **5.6 [P1-9] Cross-Platform Path Normalization on Windows & Unix**
  - **Target**: [`src/lib/agents/ruflo/vfs.ts`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/vfs.ts#L15-L35)
  - **Actions**:
    - Convert all backslashes (`\`) to forward slashes (`/`) immediately upon receiving file paths.
    - Strip leading slashes to ensure standard POSIX relative paths (`src/app/page.tsx`).
  - **Verification**: Test with Windows path `src\components\Button.tsx`; verify stored as `src/components/Button.tsx`.

- [ ] **5.7 [P1-14] Cross-Platform Project Zip Export with Windows PowerShell Fallback**
  - **Target**: [`src/app/api/conversations/[id]/download/route.ts`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/app/api/conversations/[id]/download/route.ts#L1-L75)
  - **Actions**:
    - Check if native `zip` executable exists on system.
    - If on Windows without `zip.exe`, fall back to `powershell -Command "Compress-Archive -Path ... -DestinationPath ..."`.
    - Alternatively, use JS-native `archiver` or `adm-zip` package for 100% OS-agnostic compression.
  - **Verification**: Trigger `GET /api/conversations/[id]/download` on Windows machine; verify valid `.zip` download.

---

## Phase 6: Closed-Loop Build Verification & Debugger Repair

Focus: Realize actual automated build verification, feed build/typecheck errors into Debugger, and enforce bounded repair loops.

- [ ] **6.1 [P0-7] Implement Automated Build Verification Step in Pipeline**
  - **Target**: [`src/lib/agents/ruflo/orchestrator.ts`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/orchestrator.ts#L350-L420)
  - **Actions**:
    - After Coder finishes flushing files to disk, execute `npm run build` or `npx next build` in project directory.
    - Capture stdout and stderr from build subprocess.
    - If build succeeds (exit code 0), mark pipeline as `VERIFIED` and proceed to Reviewer.
    - If build fails (exit code $\neq 0$), capture build error trace and route to Debugger.
  - **Verification**: Generate project with intentional syntax error; verify build step catches failure and invokes Debugger.

- [ ] **6.2 [P1-13] Bounded Closed-Loop Debugger Repair Routine**
  - **Target**:
    - [`src/lib/agents/ruflo/registry/Debugger.ts`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/registry/Debugger.ts#L1-L60)
    - [`src/lib/agents/ruflo/orchestrator.ts`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/orchestrator.ts#L425-L480)
  - **Actions**:
    - Inject concrete compiler errors (file, line number, error message) into Debugger prompt.
    - Allow Debugger to modify specific files via VFS `applyDiff` or file rewrite.
    - Re-run build verification after Debugger finishes (maximum 3 retry attempts).
    - If retries exhausted, mark pipeline as `BUILD_FAILED` with detailed diagnostics instead of hanging or falsely claiming success.
  - **Verification**: Run repair loop on missing import; verify Debugger fixes import and subsequent build passes.

- [ ] **6.3 [P1-14] Clarify Tester Role: Deterministic Test Execution vs LLM Test Generator**
  - **Target**: [`src/lib/agents/ruflo/registry/Tester.ts`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/registry/Tester.ts#L1-L50)
  - **Actions**:
    - Define Tester contract: Generate unit test files (`*.test.ts`, `*.spec.tsx`) for core utility and component files.
    - Execute generated tests using test runner (`vitest` / `jest`) and report test results to pipeline event stream.
  - **Verification**: Run Tester stage; verify unit test files are generated in VFS and executed.

- [ ] **6.4 [P2-9] Track and Terminate Subprocess PIDs on Pipeline Abort**
  - **Target**: [`src/lib/agents/ruflo/orchestrator.ts`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/orchestrator.ts#L490-L530)
  - **Actions**:
    - Maintain registry of running child process PIDs (npm install, next build, dev server preview).
    - On pipeline abort or server shutdown, terminate child process trees (using `tree-kill` on Windows/Unix).
  - **Verification**: Abort pipeline during `npm build`; verify Node build process is completely terminated in Task Manager.

---

## Phase 7: Monaco Workspace Editor & File Mutation API

Focus: Transform Monaco from a read-only viewer to a full-featured code editor with save, dirty state tracking, and VFS synchronization.

- [ ] **7.1 [P2-1] Enable Monaco Editor Editing, Dirty State & Keyboard Shortcuts**
  - **Target**: [`src/app/workspace/WorkspaceContent.tsx`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/app/workspace/WorkspaceContent.tsx#L200-L280)
  - **Actions**:
    - Set Monaco `readOnly: false`.
    - Track `isDirty` state when editor buffer changes.
    - Show `*` dirty indicator next to file tab in UI.
    - Bind `Ctrl+S` / `Cmd+S` to trigger file save API call.
  - **Verification**: Edit file in Monaco, press `Ctrl+S`; verify dirty dot clears and notification confirms save.

- [ ] **7.2 [P2-2] Implement File Mutation Endpoint (`POST /api/conversations/[id]/files/write`)**
  - **Target**: `src/app/api/conversations/[id]/files/write/route.ts` *(NEW FILE)*
  - **Actions**:
    - Accept `{ path, content }` payload.
    - Update `VirtualFile` in database and flush change to physical disk `projects/[id]/[path]`.
    - Trigger background linter and return any lint warnings in API response.
  - **Verification**: Send PUT/POST request to update `src/app/page.tsx`; verify DB and disk reflect new content.

---

## Phase 8: ReAct Tool Execution & LLM Inference Pipeline Upgrades

Focus: Wire tool calling execution into LLM loop, support Ollama tool payloads, and handle streaming timeouts reliably.

- [ ] **8.1 [P0-1] Wire ReAct Tool Execution Loop in Agent Execution Engine**
  - **Target**:
    - [`src/lib/agents/ruflo/agents.ts`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/agents.ts#L40-L130)
    - [`src/lib/agents/ruflo/toolbox.ts`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/toolbox.ts#L1-L80)
  - **Actions**:
    - Attach tool definitions (read_file, write_file, apply_diff, list_dir, run_linter, web_search) to agent tool allowlists.
    - When LLM returns `tool_calls`, execute the specified tool function in `toolbox.ts`.
    - Inject tool result back into conversation history as `role: 'tool'` message.
    - Call inference again with updated message history until agent produces final text response.
  - **Verification**: Run Coder with tool calling enabled; verify Coder invokes `write_file` tool and processes response.

- [ ] **8.2 [P1-12] Support Ollama Tool Calling Payloads in Inference Engine**
  - **Target**: [`src/lib/agents/inference.ts`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/inference.ts#L100-L175)
  - **Actions**:
    - Format OpenAI-compatible `tools` array for Ollama `/api/chat` endpoint.
    - Parse `message.tool_calls` in streaming and non-streaming responses.
    - Add timeout (120s) and retry logic with exponential backoff on Ollama connection drops.
  - **Verification**: Test inference with tool definitions against local Ollama `qwen2.5-coder` or `llama3.1`; verify tool calls parsed.

- [ ] **8.3 [P3-1] Cleanup or Activate Dead Toolbox Methods**
  - **Target**: [`src/lib/agents/ruflo/toolbox.ts`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/toolbox.ts#L85-L140)
  - **Actions**:
    - Audit all 8 toolbox tools; remove unused stubs and verify schemas for active tools (`read_file`, `write_file`, `apply_diff`, `run_linter`).
  - **Verification**: Run all toolbox unit tests to confirm 100% schema and runtime validity.

- [ ] **8.4 [P3-10] Centralize Agent Timeout & Retry Policy**
  - **Target**: [`src/lib/agents/inference.ts`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/inference.ts#L180-L220)
  - **Actions**:
    - Configure per-stage timeouts: Planning/Architecture (60s), Coding/Building (180s).
    - Handle rate limit errors (`429`) and server overload (`503`) with automated backoff retry.
  - **Verification**: Simulate 503 response from model server; verify inference retries up to 3 times before failing.

- [ ] **8.5 [P3-11] Add Structured Telemetry to All Stages**
  - **Target**: [`src/lib/agents/ruflo/orchestrator.ts`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/orchestrator.ts#L540-L580)
  - **Actions**:
    - Log duration (ms), input tokens, output tokens, tool call count, and retry count for each stage.
    - Emit `STAGE_TELEMETRY` event for frontend performance observability.
  - **Verification**: Run pipeline; check server logs for detailed structured telemetry JSON objects.

- [ ] **8.6 [P3-12] Propagate Correlation IDs Across Operations**
  - **Target**: [`src/lib/agents/ruflo/orchestrator.ts`](file:///c:/Users/Lenovo/Desktop/AutoCoder/src/lib/agents/ruflo/orchestrator.ts#L10-L40)
  - **Actions**:
    - Generate unique `runId` / `correlationId` per pipeline run.
    - Pass `correlationId` to inference calls, tool executions, VFS mutations, and log entries.
  - **Verification**: Inspect database `LogEntry` table; verify all logs for a run share the same `correlationId`.

---

## Phase 9: Automated Testing & Verification Suite

Focus: Establish automated unit and integration tests covering VFS, Memory, Linter, Concurrency, and End-to-End pipeline mocks.

- [ ] **9.1 [P2-10] Setup Vitest Test Framework & NPM Scripts**
  - **Target**:
    - [`package.json`](file:///c:/Users/Lenovo/Desktop/AutoCoder/package.json)
    - `vitest.config.ts` *(NEW FILE)*
  - **Actions**:
    - Add `vitest` and `@testing-library/react` to `devDependencies`.
    - Add `"test": "vitest run"`, `"test:watch": "vitest"`, `"test:coverage": "vitest run --coverage"` scripts to `package.json`.
  - **Verification**: Run `npm run test`; verify test runner executes and reports test suites.

- [ ] **9.2 [P2-11] Migrate Scratch Tests to Formal Unit Tests**
  - **Target**:
    - `src/__tests__/vfs.test.ts` *(NEW FILE)*
    - `src/__tests__/linter.test.ts` *(NEW FILE)*
    - `src/__tests__/memory.test.ts` *(NEW FILE)*
    - `src/__tests__/sml.test.ts` *(NEW FILE)*
  - **Actions**:
    - Convert ad-hoc scratch scripts into formal Vitest test suites.
    - Add assertions for VFS path sanitization, dotfile handling, diff application, and memory invalidation.
  - **Verification**: Run `npx vitest run src/__tests__/vfs.test.ts`; verify all unit tests pass.

- [ ] **9.3 [P2-12] Concurrency & Race Condition Test Suite**
  - **Target**: `src/__tests__/concurrency.test.ts` *(NEW FILE)*
  - **Actions**:
    - Test parallel pipeline launch requests on same `conversationId`.
    - Test concurrent file writes to VFS file locks.
    - Test client disconnect during active streaming.
  - **Verification**: Run `npx vitest run src/__tests__/concurrency.test.ts`; verify 0 race conditions or unhandled rejections.

- [ ] **9.4 [P2-13] End-to-End Pipeline Mock Integration Test**
  - **Target**: `src/__tests__/pipeline.e2e.test.ts` *(NEW FILE)*
  - **Actions**:
    - Create end-to-end integration test with mocked LLM responses running Queen $\to$ Planner $\to$ Architect $\to$ System $\to$ Designer $\to$ Blueprinter $\to$ Coder $\to$ Tester $\to$ Debugger $\to$ Security.
    - Verify final VFS state contains expected files, clean build exit, and valid stage ledgers.
  - **Verification**: Run `npx vitest run src/__tests__/pipeline.e2e.test.ts`; verify mock pipeline completes in <3 seconds.

- [ ] **9.5 [P2-14] Failure-Path & Resilience Test Suite**
  - **Target**: `src/__tests__/failures.test.ts` *(NEW FILE)*
  - **Actions**:
    - Test LLM timeout / offline error handling.
    - Test malformed JSON recovery.
    - Test build failure escalation to Debugger.
  - **Verification**: Run `npx vitest run src/__tests__/failures.test.ts`; verify graceful failure handling across all test cases.

---

## Phase 9.6: Codebase Documentation & Architecture Refinement

Focus: Clean obsolete architecture documents, separate active specifications from historical notes, and eliminate stale scripts.

- [ ] **9.6.1 [P3-3] Archive Obsolete Architecture Specs & Update Active Docs**
  - **Target**: Workspace root docs
  - **Actions**:
    - Ensure active specifications are clearly separated from historical debugging notes.
    - Keep `AUTOCODER_COMPLETE_AUDIT_AND_FIXES.md` and `Checklist.md` as primary source of truth.
  - **Verification**: Verify all documentation links point to existing, accurate files.

- [ ] **9.6.2 [P3-5] Clean Up Temporary Scratch Scripts**
  - **Target**: `scratch/` directory
  - **Actions**:
    - Remove temporary inspection scripts once migrated to `src/__tests__/`.
  - **Verification**: Confirm scratch folder only contains valid active development artifacts.

---

## Phase 10: Serverless / Cloud Production Roadmap (Vercel / Cloud Ready)

Focus: Architectural separation of control plane and execution worker for production deployment.

- [ ] **10.1 [P0-8] Decouple Long-Running Orchestrator from Next.js Serverless Route Handlers**
  - **Actions**:
    - For serverless deployment (Vercel), separate Next.js web frontend from background generation workers (using BullMQ / Redis or Temporal on an external Node worker / VPS).
    - Maintain lightweight Next.js route handlers that dispatch jobs to queue and poll/stream events from Redis/DB.
  - **Verification**: Document architecture diagram in `DEPLOYMENT.md`.

- [ ] **10.2 [P3-13] Multi-Database Production Adapter (PostgreSQL / Supabase Migration)**
  - **Actions**:
    - Support PostgreSQL provider in `prisma/schema.prisma` for cloud multi-instance deployments.
    - Configure connection pooling via Prisma Accelerate or PgBouncer.
  - **Verification**: Test schema compatibility against PostgreSQL instance.

- [ ] **10.3 [P3-14] Cloud Artifact & Project Storage (S3 / Blob Storage)**
  - **Actions**:
    - Implement storage adapter interface in VFS allowing file persistence to S3/Cloudflare R2 instead of local disk.
    - Keep generated applications independently deployable via zip export or Git commit push.
  - **Verification**: Verify VFS storage adapter interface abstraction.

---

## Post-Implementation Verification Commands

After completing the checklist tasks, run the following verification suite in order:

```powershell
# 1. Validate and update Prisma Database Schema
npx prisma db push
npx prisma generate

# 2. Typecheck entire TypeScript codebase
npx tsc --noEmit

# 3. Run full automated Vitest test suite
npm run test

# 4. Run Next.js production build verification
npm run build
```
