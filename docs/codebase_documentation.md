# AutoCoder Complete & Encyclopedic Codebase Reference Manual

This document is an exhaustive, file-by-file technical manual for the **AutoCoder** repository. Every file across all 10 architectural tiers is documented in full depth with exact function signatures, interfaces, line counts, internal algorithms, regexes, database queries, and architectural justifications.

---

## 1. Root Documentation & Specification Files

### `README.md` (85 lines)
- **WHAT**: Primary user guide and project documentation.
- **WHY**: Provides developers with an onboarding guide covering prerequisites, setup commands, architecture summaries, and local LLM instructions.
- **HOW**:
  - **Prerequisites**: Node.js v18+, Ollama server listening on port `11434` with `llama3:8b` (or `qwen2.5-coder:14b`).
  - **Quickstart Commands**: `npm install`, `npx prisma db push`, `npm run dev`.
  - **Architecture Overview**: Explains the 11-stage linear compilation pipeline, the Architect Quality Gate approval pause, and the Virtual File System (VFS) with live preview server (`npx serve` on port 8080).

### `AGENTS.md` (9 lines)
- **WHAT**: System-level coding assistant rules for the workspace.
- **WHY**: Prevents AI coding tools from generating legacy or deprecated Next.js code patterns.
- **HOW**: Enforces strict rule: `"This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in node_modules/next/dist/docs/ before writing any code. Heed deprecation notices."`

### `CLAUDE.md` (45 lines)
- **WHAT**: Workspace conventions and environment configuration guide for AI agents.
- **WHY**: Documents system constraints to prevent command execution errors on Windows environments.
- **HOW**:
  - Documents Windows PowerShell execution policy constraints (must use `cmd /c` prefix for npm/npx commands).
  - Outlines technology stack: Node.js v24, Next.js 16 (App Router), React 19, Prisma 7, SQLite via `better-sqlite3`.

### `Autocoder_SRS_Compiled.md` (352 lines)
- **WHAT**: Authoritative Software Requirements Specification (SRS) for AutoCoder.
- **WHY**: Defines functional, architectural, and quality benchmarks for the multi-agent code generation platform.
- **HOW**:
  - **FR-1 to FR-4 (Ingestion & Planning)**: Input parsing, scope boundaries (MVP included/excluded), and requirement traceability.
  - **FR-5 to FR-8 (Architecture & Code Generation)**: Component decomposition, tech stack selection, file-by-file blueprint generation, and single-file Coder synthesis.
  - **FR-9 to FR-12 (Verification & Tooling)**: Zero-token AST linting, automated linter self-healing (up to 2 iterations), security auditing, and live preview rendering.

### `EM_plan.md` (180 lines)
- **WHAT**: Design plan for Executive Memory (EM) ledger reform.
- **WHY**: Solves context bloat and state loss by migrating from single-row text logs to structured multi-row database ledgers.
- **HOW**:
  - Defines `ExecutiveMemory` table schema with deterministic inference ID format: `{AgentName}-{sequence}-{shortHash}` where `shortHash = SHA256(conversationId:agentName:sequence)[0..6]`.
  - Specifies state supersession (`status: ACTIVE` vs `status: SUPERSEDED`).
  - Outlines `StageLedger` oscillation detection using MD5 checksums of file contents across repair iterations.

### `Multi_Agent_Pipeline_System_Prompts_v2.md` (620 lines)
- **WHAT**: Complete benchmark catalog of active system prompts (v2 revision).
- **WHY**: Serves as the golden reference for agent prompts across the 11 pipeline stages.
- **HOW**: Contains full text, temperatures, token budgets, required markdown headers, and anti-hallucination rules for all agents (`Queen`, `Planner`, `Architect`, `System`, `Designer`, `Blueprinter`, `Coder`, `Tester`, `Debugger`, `Security`, `Reviewer`).

### `RCA.md` (399 lines)
- **WHAT**: Root Cause Analysis report for initial operational breakdowns.
- **WHY**: Documents root causes of operational defects fixed in commit `710af4d3`.
- **HOW**:
  - Analyzes 8 operational breakdowns: dead function calls, path resolution bugs, token budget clamping at 32K, and SSE disconnect issues.
  - Documents fixes across 16 files: linter path matching, memory supersession, and Ollama keep-alive intervals.

### `SystemPrompts.md` (450 lines)
- **WHAT**: Legacy v1 prompt specification backup.
- **WHY**: Preserved for historical diffing and regression testing against v2 prompts.
- **HOW**: Contains earlier iterations of system prompts before Executive Memory and structured markdown header anchoring were implemented.

### `agent_schemas_and_blueprinter_report.md` (210 lines)
- **WHAT**: Schema alignment audit report.
- **WHY**: Evaluates the bridge between Blueprinter output specifications and Coder parser expectations.
- **HOW**: Analyzes `### File:` block structure, `Dependencies` list parsing, and `Specs Required` section extraction (`file.md#Section`).

### `agent_schemas_documentation.md` (165 lines)
- **WHAT**: Technical documentation of JSON schemas exported by agent registry files.
- **WHY**: Reference guide for structured output schemas.
- **HOW**: Details property types, required fields, and validation rules for `schema` objects in `src/lib/agents/ruflo/registry/`.

### `antigravity_technical_report.md` (280 lines)
- **WHAT**: Technical design report on the multi-agent engine.
- **WHY**: Documents system architecture, VFS storage, event dispatching, and memory provenance.
- **HOW**: Deep breakdown of `orchestrator.ts`, `memory.ts`, `vfs.ts`, `linter.ts`, and SSE route mechanics.

### `aprcsol.md` (140 lines)
- **WHAT**: Infrastructure resilience specification.
- **WHY**: Details error recovery strategies for local Ollama environments.
- **HOW**: Identifies connection failure signatures (`ECONNREFUSED`, `socket hang up`) and outlines automatic pipeline pause and resume workflows.

### `multi_agent_pipeline.mermaid` (35 lines)
- **WHAT**: Mermaid visual flowchart diagram.
- **WHY**: Graphically illustrates stage transitions, upstream context routing, and the Architect Quality Gate.
- **HOW**: Renders linear flow from `Queen` to `Reviewer` with pause and feedback branches.

---

## 2. Project Build & Environment Configurations

### `package.json` (45 lines)
- **WHAT**: Node.js package manifest and dependency configuration.
- **WHY**: Declares project metadata, executable scripts, and third-party libraries.
- **HOW**:
  - **Scripts**:
    - `dev`: `"next dev"` — Starts Next.js development server on port 3000.
    - `build`: `"next build"` — Compiles Next.js app for production.
    - `start`: `"next start"` — Starts production server.
    - `lint`: `"next lint"` — Runs ESLint checks.
    - `db:push`: `"prisma db push"` — Synchronizes `schema.prisma` with `dev.db`.
    - `db:studio`: `"prisma studio"` — Opens Prisma visual database browser.
  - **Dependencies**: `next` (16.2.10), `react` (19.2.4), `react-dom` (19.2.4), `@prisma/client` (7.8.0), `better-sqlite3` (11.8.0), `lucide-react` (0.475.0), `clsx`, `tailwind-merge`.
  - **DevDependencies**: `typescript` (5.x), `@types/node`, `@types/react`, `@types/react-dom`, `tailwindcss` (4.x), `postcss`, `eslint`.

### `package-lock.json` (Multi-thousand lines)
- **WHAT**: Deterministic dependency lockfile.
- **WHY**: Enforces bit-for-bit identical dependency trees across installations.
- **HOW**: JSON structure mapping packages, versions, resolved URLs, and SHA-512 integrity hashes.

### `next.config.ts` (18 lines)
- **WHAT**: Next.js 16 application configuration module.
- **WHY**: Configures build rules and server-side package bundling.
- **HOW**:
  - Sets `serverExternalPackages: ['better-sqlite3']` so Next.js treats `better-sqlite3` as an external Node.js binary rather than attempting client-side Webpack bundling.

### `eslint.config.mjs` (24 lines)
- **WHAT**: ESLint 9+ flat configuration file.
- **WHY**: Configures code quality and syntax validation rules.
- **HOW**: Uses `FlatCompat` to extend `next/core-web-vitals` and `next/typescript` rule sets.

### `postcss.config.mjs` (10 lines)
- **WHAT**: PostCSS pipeline configuration.
- **WHY**: Compiles Tailwind CSS utility classes into browser-ready CSS.
- **HOW**: Registers `@tailwindcss/postcss` plugin.

### `prisma.config.ts` (14 lines)
- **WHAT**: Prisma ORM CLI configuration.
- **WHY**: Directs Prisma CLI commands to the correct schema file and SQLite database path.
- **HOW**: Exports configuration object setting schema path to `prisma/schema.prisma` and database URL to `file:./dev.db`.

---

## 3. Database Schema & Migrations

### `prisma/schema.prisma` (412 lines)
- **WHAT**: Prisma ORM schema for SQLite (`dev.db`).
- **WHY**: Defines persistent entities for conversations, execution logs, memory ledgers, virtual files, and stage outputs.
- **HOW**:
  - `Conversation`: Primary session table. `id` (UUID PK), `prompt` (Text), `status` (Enum: `Idle`, `Running`, `Completed`, `Paused`, `Failed`), `currentStage` (String?), `qualityGateOverride` (Boolean default `false`), `createdAt`, `updatedAt`.
  - `ExecutionHistory`: Telemetry log table. `id` (UUID PK), `conversationId`, `stage`, `status`, `logs` (Text/JSON), `createdAt`.
  - `ExecutiveMemory`: Structured stage ledger table. `id` (UUID PK), `conversationId`, `agentName`, `filePath` (String?), `sequence` (Int), `inferenceId` (String), `contentMd` (Text), `status` (String: `ACTIVE` or `SUPERSEDED`), `tokenCount` (Int), `durationMs` (Int), `consumedInferenceIds` (String JSON array), `createdAt`. Unique constraint on `(conversationId, agentName, filePath, sequence)`.
  - `VirtualFile`: In-memory VFS storage table. `id` (UUID PK), `conversationId`, `filePath`, `content` (Text), `updatedAt`. Unique constraint on `(conversationId, filePath)`.
  - `AgentOutput` & `AgentIndex`: Key-value SML tables for stage output indexing (`path`, `value`).
  - `StageExecutionLog`: Granular step logs.
  - Dedicated stage tables: `QueenStageOutput`, `PlannerStageOutput`, `ArchitectStageOutput`, `SystemStageOutput`, `DesignerStageOutput`, `BlueprinterStageOutput`, `TesterStageOutput`, `DebuggerStageOutput`, `SecurityStageOutput`, `ReviewerStageOutput`.

### `prisma/migrations/migration_lock.toml` (5 lines)
- **WHAT**: Prisma migration engine lockfile.
- **WHY**: Tracks active database provider.
- **HOW**: Contains `provider = "sqlite"`.

### `prisma/migrations/20260708154752_init/migration.sql` (115 lines)
- **WHAT**: Baseline SQL migration DDL script.
- **WHY**: Initializes core tables on database creation.
- **HOW**: Contains `CREATE TABLE` and `CREATE INDEX` statements for `Conversation`, `ExecutionHistory`, `AgentOutput`, and initial stage tables.

### `prisma/migrations/20260709063954_add_executive_memory/migration.sql` (48 lines)
- **WHAT**: Executive Memory SQL migration script.
- **WHY**: Adds `ExecutiveMemory` and `VirtualFile` tables to SQLite.
- **HOW**: SQL DDL creating `ExecutiveMemory` with composite unique indexes on `(conversationId, agentName, filePath, sequence)`.

### `src/lib/db.ts` (16 lines)
- **WHAT**: PrismaClient singleton manager.
- **WHY**: Prevents SQLite connection lock exhaustion during Next.js Hot Module Replacement (HMR).
- **HOW**:
  ```typescript
  import { PrismaClient } from '@prisma/client';
  const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
  export const prisma = globalForPrisma.prisma || new PrismaClient();
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
  ```

---

## 4. Inference Engine & Core Memory Layer

### `src/lib/agents/inference.ts` (691 lines)
- **WHAT**: Low-level LLM execution engine.
- **WHY**: Manages provider selection (Ollama, OpenAI, Anthropic), streaming chunk readers, timeouts, response cleaning, and background keep-alive pinging.
- **HOW**:
  - `getLLMConfig()`: Queries `Settings` table in SQLite, falling back to environment variables (`OLLAMA_HOST || 'http://127.0.0.1:11434'`, `OLLAMA_MODEL || 'llama3:8b'`).
  - `runInference(messages, options)`:
    - **Ollama**: Sends POST to `/api/chat` with `{ model, messages, stream: true, options: { temperature, num_predict: options.maxTokens, num_ctx: 32768, keep_alive: -1 } }`. Reads UTF-8 chunks via `ReadableStreamDefaultReader`, parsing SSE lines (`data.message.content`), accumulating response, and triggering `options.onChunk(chunk)`.
    - **OpenAI / Anthropic**: Issues POST to chat completion endpoints, awaiting full text.
    - **Mock Mode**: Returns canned structured markdown when `process.env.MOCK_INFERENCE === 'true'`.
  - `startOllamaKeepAlive()` / `stopOllamaKeepAlive()`: 10-second interval timer issuing lightweight `/api/generate` pings to keep model weights resident in GPU VRAM.
  - `cleanJsonResponse(raw)`: Strips markdown fences (`` ```json ``) and trims whitespace.

### `src/lib/agents/sml.ts` (92 lines)
- **WHAT**: Structured Memory Layer (SML) API.
- **WHY**: Provides key-value index querying over structured agent outputs.
- **HOW**:
  - `writeAgentOutput(conversationId, agentName, output)`: Stores raw text in `AgentOutput`, parses JSON, and recursively flattens top-level keys into `AgentIndex` (`agentName.key`).
  - `queryAgentOutput(conversationId, path)`: Retrieves indexed value matching path from `AgentIndex`.
  - `getVocabulary()`: Returns array of indexed key strings.

### `src/lib/agents/contextBuilder.ts` (35 lines)
- **WHAT**: Legacy context assembly helper.
- **WHY**: Backwards compatibility for single-prompt test execution.
- **HOW**: Concatenates user prompts and conversation history into a unified text block.

### `src/lib/agents/manifest.json` (65 lines)
- **WHAT**: JSON manifest catalog of agent metadata.
- **WHY**: Static reference describing all 11 stages, descriptions, and expected schemas.
- **HOW**: JSON array defining `Queen`, `Planner`, `Architect`, `System`, `Designer`, `Blueprinter`, `Coder`, `Tester`, `Debugger`, `Security`, and `Reviewer`.

---

## 5. Ruflo Multi-Agent Orchestrator Infrastructure

### `src/lib/agents/ruflo/orchestrator.ts` (1173 lines)
- **WHAT**: Master pipeline orchestrator engine.
- **WHY**: Manages the complete 11-stage software compilation workflow, error recovery, file synthesis loop, linter integration, and SSE broadcasting.
- **HOW**:
  - `UPSTREAM_AGENT_MAP`: Maps upstream dependencies (e.g. `Architect: ['Queen', 'Planner']`, `Blueprinter: ['Queen', 'Planner', 'Architect', 'System', 'Designer']`).
  - `VFS_OUTPUT_MAP`: Maps stages to spec documents (`Queen -> plan.md`, `Planner -> requirements.md`, `Architect -> architecture.md`, `System -> backend_spec.md`, `Designer -> ui_spec.md`, `Blueprinter -> blueprint.md`, `Security -> security_report.md`, `Reviewer -> review_report.md`).
  - `EXPECTED_FIRST_HEADERS`: Header anchors (`Queen -> Context Snapshot`, `Blueprinter -> File:`, `Reviewer -> Overall Assessment`).
  - `runOrchestrator(conversationId, userPrompt, onEvent, signal, startStage)`:
    1. Loads `Conversation` and initializes `StageLedger`.
    2. Runs software request classifier `classifyIsSoftwareRequest()`.
    3. Starts Ollama keep-alive daemon `startOllamaKeepAlive()`.
    4. Iterates through 11 `STAGES`. Fast-forwards completed stages on mid-pipeline resume.
    5. **Coder Stage**: Parses `blueprint.md` via `parseBlueprintFiles()`, loops over each file section, fetches dependency code, builds prompt via `buildCoderContext()`, calls `runAgent('Coder')`, writes file to VFS, and runs in-loop linter self-healing (up to 2 repair attempts per file).
    6. **Tester Stage**: Runs `runLinter()` on all workspace code files, writing `test_report.md`.
    7. **Debugger Stage**: Performs SLM triage via `orchestratorThinkDebugger()`, extracts failing files, and executes targeted repairs.
    8. **Architect Quality Gate**: If `qualityGateOverride` is false, pauses at `Architect`, sets status to `Paused`, and emits `QUALITY_GATE_PAUSE`.
    9. Flushes VFS to physical disk (`flushVfsToDisk()`) and launches local preview server via `launchVSCodePreview()`.
  - `sanitizeStageOutput()`: Strips leading/trailing code fences and anchors content to expected first header.
  - `extractSnapshot()`: 3-tier regex parser extracting `### Context Snapshot` (max 600 chars).
  - `parseBlueprintFiles(blueprintText)`: Regex parser splitting `### File:` sections into structured `BlueprintFileSection` objects (`file`, `purpose`, `dependencies`, `specsRequired`, `exports`, `details`).

### `src/lib/agents/ruflo/memory.ts` (418 lines)
- **WHAT**: Executive Memory persistence layer and `StageLedger` implementation.
- **WHY**: Manages multi-row database ledgers, state supersession, sequence tracking, and oscillation detection.
- **HOW**:
  - `loadExecutiveMemory(conversationId)`: Queries `ExecutiveMemory` records where `status: ACTIVE`, building structured `MemoryState` object.
  - `writeExecutiveMemoryRecord(params)`: Computes SHA-256 hash of content, marks previous active records for the same agent/file as `SUPERSEDED`, generates deterministic `inferenceId` (`{Agent}-{sequence}-{hash}`), and inserts new record into SQLite.
  - `StageLedger`: Tracks stage sequence, stores MD5 file hashes in `fileStateHistory`, and throws `Oscillation detected` if identical hash is produced twice in a repair loop.

### `src/lib/agents/ruflo/vfs.ts` (205 lines)
- **WHAT**: Virtual File System (VFS) module.
- **WHY**: Manages in-memory workspace file state with concurrency locking and instant physical disk synchronization.
- **HOW**:
  - `fileLocks`: In-memory `Map<string, Promise<void>>` for path-level mutex locks (`acquireLock`).
  - `sanitizePath(filePath)`: Replaces backslashes, guards against directory traversal (`..`, leading `/`, absolute paths).
  - `readVirtualFile(conversationId, filePath)`: Queries `VirtualFile` table in SQLite.
  - `writeVirtualFile(conversationId, filePath, content)`: Upserts `VirtualFile` in SQLite under mutex lock, and writes to disk (`projects/{conversationId}/{filePath}`).
  - `applyDiff(conversationId, filePath, startLine, endLine, newContent)`: Performs line-range replacements on VFS files.
  - `flushVfsToDisk(conversationId)`: Iterates through all VFS records for a conversation and writes them to disk.

### `src/lib/agents/ruflo/linter.ts` (331 lines)
- **WHAT**: Deterministic 3-tier linter engine.
- **WHY**: Provides zero-token AST syntax diagnostics, HTML asset reference checks, and bracket balance verification.
- **HOW**:
  - `runLinter(conversationId, filePath)`:
    - **JS/TS/JSX/TSX**: Uses TypeScript Compiler API (`ts.transpileModule`) to parse AST and catch syntax diagnostics (`diagnostic.messageText`, `line`, `character`). Suppresses non-critical JS implicit-any warnings.
    - **HTML**: Invokes `runHtmlLinkCheck()` to verify `<script src>` and `<link href>` tags against existing VFS files, plus bracket balance.
    - **CSS/Other**: Invokes `runBracketBalanceCheck()`.
  - `runBracketBalanceCheck(content)`: Stack algorithm tracking `{ }`, `( )`, `[ ]`, quotes, and template literals, returning exact unclosed line numbers.

### `src/lib/agents/ruflo/token-budgeter.ts` (105 lines)
- **WHAT**: Dynamic token budget calculator.
- **WHY**: Calculates output token limits (`budget`) and timeouts (`timeoutMs`) based on stage role and project file count.
- **HOW**:
  - `calculateTokenBudget(agentName, ledger)`:
    - `Planner` / `Architect`: `budget = 16384 + (featuresCount * 1024)`.
    - `System` / `Designer`: `budget = 16384 + (features * 1024) + (files * 1024)`.
    - `Coder`: `budget = 32768 + (fileCount * 2048)`.
    - Clamps `budget` to `MAX_BUDGET = 32768`.
    - Scales `timeoutMs` linearly between 10 minutes (600s) and 60 minutes (3600s).

### `src/lib/agents/ruflo/agents.ts` (36 lines)
- **WHAT**: Registry index binder.
- **WHY**: Exposes unified `AGENT_DEFS` record mapping agent names to stage module exports.
- **HOW**: Imports all 11 stage modules, exporting `AGENT_DEFS: Record<string, AgentDef>`.

### `src/lib/agents/ruflo/contracts.ts` (44 lines)
- **WHAT**: Inter-stage contract definitions.
- **WHY**: Defines TypeScript interfaces for capability definitions, project contracts, version records, and audit log entries.
- **HOW**: Exports `CapabilityDefinition`, `ProjectContract`, `VersionRecord`, `AuditLogEntry`, and `ProjectKnowledgeIndex`.

### `src/lib/agents/ruflo/eventDispatcher.ts` (178 lines)
- **WHAT**: Specialized error triage and failure dispatcher.
- **WHY**: Analyzes error logs and routes failures to appropriate specialist agents.
- **HOW**:
  - `dispatchFailureEvent(logs, stage)`: Inspects error text and categorizes failure type: `syntax`, `compilation`, `conflict`, `performance`, `quality`, `test_failure`.
  - `executeSpecialistRecovery(conversationId, errorLog, failedFile, currentCode, ledger)`: Calls LLM with specialized prompt to generate surgical patch code.

### `src/lib/agents/ruflo/ledgerTypes.ts` (40 lines)
- **WHAT**: Shared TypeScript interfaces for memory and ledgers.
- **WHY**: Centralized type definitions across memory and orchestrator modules.
- **HOW**: Exports `MemoryState`, `LedgerRecord`, and `InferenceIdParams`.

### `src/lib/agents/ruflo/persistence.ts` (296 lines)
- **WHAT**: Stage output persistence manager.
- **WHY**: Upserts structured stage outputs into dedicated database tables (`QueenStageOutput`, `PlannerStageOutput`, etc.).
- **HOW**: Exports `StagePersistence.persistStageOutput(stage, conversationId, data)` with switch cases for each stage.

### `src/lib/agents/ruflo/toolbox.ts` (241 lines)
- **WHAT**: Agent tool registry and execution dispatcher.
- **WHY**: Provides callable tools for autonomous agent loops (`read_file`, `write_file`, `apply_diff`, `list_files`, `check_syntax`).
- **HOW**: Exports `TOOL_REGISTRY`, `executeTool()`, `getToolsForAgent()`, and `toolToOllamaFormat()`.

### `src/lib/agents/ruflo/knowledgeResolver.ts` (28 lines)
- **WHAT**: Domain knowledge capability and restriction resolver.
- **WHY**: Maps project platforms (e.g. `html5-vanilla`, `react-node-express`) to allowed capabilities and forbidden constructs.
- **HOW**: `KnowledgeResolver` class with `conventions()`, `capabilities()`, and `restrictions()` methods.

### `src/lib/agents/ruflo/knowledge/referenceStore.ts` (65 lines)
- **WHAT**: In-memory singleton store for JSON knowledge reference documents.
- **WHY**: Loads and caches all reference JSON files from disk on startup to avoid disk I/O.
- **HOW**: `ReferenceStore.getInstance()` scans `references/` subdirectories, parses JSON files into `ReferenceDocument` objects, and indexes them in a Map by ID.

### `src/lib/agents/ruflo/knowledge/referenceResolver.ts` (23 lines)
- **WHAT**: Helper module for resolving reference keys.
- **WHY**: Queries `ReferenceStore` for requested reference IDs.
- **HOW**: Exports `resolveReferences(requestedKeys: string[])`.

---

## 6. Ruflo Knowledge Reference Base

These JSON files in `src/lib/agents/ruflo/knowledge/references/` contain domain pattern specifications:

1. **`architectural_patterns/rest_api.json`**: RESTful API design rules, standard HTTP verbs, status codes (200, 201, 400, 401, 404, 500), and JSON response formatting.
2. **`backend_patterns/jwt_auth.json`**: JWT authentication standards, token header structure (`Authorization: Bearer <token>`), claims (`sub`, `exp`, `iat`), and password hashing using bcrypt.
3. **`backend_patterns/sqlite_db.json`**: SQLite database best practices, foreign key constraints, indexing strategies, and Prisma schema modeling.
4. **`capabilities/fetch_client.json`**: Browser `fetch` API wrappers, JSON request headers, async/await handling, and HTTP error handling patterns.
5. **`capabilities/local_storage.json`**: HTML5 `localStorage` persistence rules, JSON serialization (`JSON.stringify`/`JSON.parse`), and key namespacing.
6. **`frameworks/express.json`**: Express.js server initialization, `express.json()` body parser middleware, router module patterns, and centralized error handling middleware.
7. **`frameworks/react.json`**: React 19 functional components, `useState`, `useEffect`, `useCallback`, prop types, and component tree architecture.
8. **`languages/typescript.json`**: TypeScript interface definitions, type annotations, strict null checks, and ES6 module import/export syntax rules.
9. **`security/owasp_web_security.json`**: OWASP Top 10 security guidelines: input sanitization (`textContent` vs `innerHTML`), parameterized queries, password hashing (bcrypt), and CORS headers.
10. **`ui_patterns/dark_theme.json`**: Dark mode color tokens: background `#1A1A2E`, card surface `#16213E`, primary accent `#E94560`, text `#FFFFFF`, and muted text `#8E92B2`.
11. **`ui_patterns/glassmorphism.json`**: Glassmorphism CSS property rules: `backdrop-filter: blur(12px)`, `background: rgba(255, 255, 255, 0.05)`, and subtle white borders.
12. **`ui_patterns/svg_charts.json`**: Pure SVG data visualization component rules: `<svg>` viewbox scaling, `<path>` line charts, and `<rect>` bar charts without third-party dependencies.
13. **`ui_ux/modern_web_design.json`**: UI/UX design standards: 8px grid layout spacing, font hierarchy (Inter/system-ui), button hover states, and responsive breakpoints.

---

## 7. Agent Registry System Prompts

Each module in `src/lib/agents/ruflo/registry/` defines a specialized pipeline stage:

1. **`Queen.ts` (88 lines)**: Stage 1. Temperature `0.2`, maxTokens `1024`. Produces project spec (`plan.md`). Mandatory sections: `### Context Snapshot`, `### Project Name`, `### Problem Statement`, `### Project Goal`, `### MVP Scope - Included`, `### MVP Scope - Excluded`, `### Technical Constraints`, `### Risks`.
2. **`Planner.ts` (124 lines)**: Stage 2. Temperature `0.3`, maxTokens `2048`. Produces requirements (`requirements.md`). Mandatory sections: `### Context Snapshot`, `### Features`, `### Functional Requirements`, `### Non-Functional Requirements`, `### Acceptance Criteria`.
3. **`Architect.ts` (141 lines)**: Stage 3. Temperature `0.2`, maxTokens `2048`. Produces architecture (`architecture.md`). Mandatory sections: `### Context Snapshot`, `### Tech Stack`, `### Project Folder Structure`, `### Modules`, `### Conventions`.
4. **`System.ts` (141 lines)**: Stage 4. Temperature `0.2`, maxTokens `2048`. Produces backend spec (`backend_spec.md`). Mandatory sections: `### Context Snapshot`, `### Database Design`, `### API Endpoints`, `### Backend Services`, `### Middleware` (or `### No Backend Required`).
5. **`Designer.ts` (145 lines)**: Stage 5. Temperature `0.3`, maxTokens `2048`. Produces UI spec (`ui_spec.md`). Mandatory sections: `### Context Snapshot`, `### Design System`, `### Pages`, `### Components`, `### Navigation`, `### Interaction Design`.
6. **`Blueprinter.ts` (117 lines)**: Stage 6. Temperature `0.1`, maxTokens `2048`. Produces file-by-file blueprint (`blueprint.md`). Uses `### File: path/to/file.ext` headers with `Purpose`, `Dependencies`, `Specs Required`, `Exports`, and `Implementation Details`.
7. **`Coder.ts` (78 lines)**: Stage 7. Temperature `0.1`, maxTokens `4096`. Synthesizes raw source code for ONE file at a time without markdown code fences or preamble text.
8. **`Tester.ts` (21 lines)**: Stage 8 placeholder. Temperature `0.0`, maxTokens `512`. Prompt unused; orchestrator executes `runLinter()` directly.
9. **`Debugger.ts` (68 lines)**: Stage 9. Temperature `0.2`, maxTokens `4096`. Receives broken source code and linter diagnostics; outputs complete corrected file.
10. **`Security.ts` (99 lines)**: Stage 10. Temperature `0.2`, maxTokens `2048`. Receives project source code; outputs `security_report.md` with status (`SECURE`, `SECURE_WITH_WARNINGS`, `VULNERABLE`, `CRITICAL`), security score, and vulnerability details.
11. **`Reviewer.ts` (119 lines)**: Stage 11. Temperature `0.2`, maxTokens `2048`. Receives specs and source code; outputs `review_report.md` with assessment (`APPROVED`, `REQUIRES_REWORK`, etc.), requirement coverage table, and code quality ratings.

---

## 8. Next.js API Route Handlers

1. **`src/app/api/pipeline/stream/route.ts` (113 lines)**: GET handler establishing Server-Sent Events (SSE) stream (`text/event-stream`). Replays historical execution logs from `ExecutionHistory`, listens to `pipelineEvents`, emits 5s keep-alive pings, and launches `runOrchestrator()` in detached background execution.
2. **`src/app/api/pipeline/resume/route.ts` (45 lines)**: POST handler resuming paused pipeline or overriding `Architect` quality gate. Updates `Conversation` status to `Running`, sets `qualityGateOverride = true`, and re-launches orchestrator.
3. **`src/app/api/pipeline/abort/route.ts` (30 lines)**: POST handler halting pipeline execution. Triggers `abortPipelineExecution(conversationId)` and sets conversation status to `Paused`.
4. **`src/app/api/conversations/route.ts` (55 lines)**: GET (returns array of past conversations ordered by `createdAt` desc) and POST (creates new `Conversation` row in SQLite with user prompt).
5. **`src/app/api/conversations/[id]/route.ts` (60 lines)**: GET (returns single conversation with execution history) and DELETE (cascade deletes conversation, history, memory, and virtual files).
6. **`src/app/api/conversations/[id]/download/route.ts` (50 lines)**: GET handler creating a ZIP archive of synthesized VFS project files. Streams compressed ZIP buffer with `Content-Type: application/zip`.
7. **`src/app/api/conversations/[id]/files/route.ts` (35 lines)**: GET handler returning array of all virtual file path strings for UI file tree explorer.
8. **`src/app/api/conversations/[id]/files/read/route.ts` (38 lines)**: GET handler reading and returning text content of a single target virtual file.
9. **`src/app/api/conversations/[id]/telemetry/route.ts` (40 lines)**: GET handler fetching execution history logs and stage telemetry JSON.
10. **`src/app/api/conversations/clear/route.ts` (25 lines)**: POST handler clearing all conversation records from SQLite.
11. **`src/app/api/settings/route.ts` (65 lines)**: GET and POST handlers managing LLM provider settings (Ollama host URL, model name, OpenAI key, Anthropic key) in SQLite `Settings` table.
12. **`src/app/api/health/route.ts` (45 lines)**: GET handler verifying connectivity to local Ollama server (`/api/tags`) or API provider.
13. **`src/app/api/health/system/route.ts` (35 lines)**: GET handler checking SQLite database connection and disk write permissions.

---

## 9. Frontend Application & UI Component Layer

1. **`src/app/layout.tsx` (38 lines)**: Root React layout component. Wraps page tree with HTML `<html>`, `<body>`, `<AppContextProvider>`, global stylesheet `globals.css`, `<TopAppBar />`, and `<Sidebar />`.
2. **`src/app/page.tsx` (245 lines)**: Home page component (`/`). Form input for project prompts, SSE stream subscriber connecting to `/api/pipeline/stream`, real-time stage progress cards, streaming log viewer, and Architect Quality Gate approval modal.
3. **`src/app/workspace/page.tsx` (18 lines)**: Workspace page wrapper rendering `<WorkspaceContent />` inside a `<Suspense>` boundary.
4. **`src/app/workspace/WorkspaceContent.tsx` (1836 lines)**: Comprehensive IDE workspace component. Features:
   - Nested file tree explorer (`buildFileTree`, `renderFileNode`, directory expansion toggling).
   - Monaco code editor (`@monaco-editor/react`) with syntax highlighting for JS/TS/HTML/CSS/JSON.
   - SML output parsing (`parseModulesFromMarkdown`, database entity viewer, UI component viewer).
   - Interactive live preview iframe mounting generated project on local port 8080.
   - Clarification and conflict resolution modal dialogs.
5. **`src/app/telemetry/page.tsx` (180 lines)**: Telemetry dashboard (`/telemetry`). Visual cards and charts breaking down token budgets, stage duration ms, and linter diagnostic results.
6. **`src/app/settings/page.tsx` (160 lines)**: LLM configuration page (`/settings`). Form inputs for Ollama host, Ollama model name, OpenAI API key, Anthropic API key, and connection health test button.
7. **`src/app/health/page.tsx` (120 lines)**: Real-time system health dashboard (`/health`). Shows connection status badges for Ollama, SQLite database, and disk space.
8. **`src/app/docs/page.tsx` (190 lines)**: Interactive documentation page (`/docs`). Visual guide detailing the 11-stage Ruflo pipeline architecture, VFS layer, and Executive Memory.
9. **`src/app/support/page.tsx` (110 lines)**: Help and setup guide page (`/support`). Troubleshooting instructions for Ollama port configuration and installation.
10. **`src/components/Sidebar.tsx` (140 lines)**: Navigation sidebar displaying route links and past conversation history list with delete actions.
11. **`src/components/TopAppBar.tsx` (115 lines)**: Global header bar. Shows project title, active model badge, system connection status indicator, and theme toggles.
12. **`src/context/AppContext.tsx` (162 lines)**: React Context provider exporting `useAppContext()` hook. Manages global state (`activeConversationId`, `isRunning`, `settings`, `theme`).
13. **`src/app/globals.css` (85 lines)**: CSS stylesheet importing Tailwind CSS, custom scrollbars, and dark theme CSS color variables.
14. **`public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`, `src/app/favicon.ico`**: Static SVG icons and favicon asset files.

---

## 10. Test & Diagnostic Suite (scratch/)

All 34 automated test harnesses under `scratch/`:

1. **`scratch/audit_pipeline_failures.ts` (45 lines)**: Queries `ExecutionHistory` for pipeline failure tracebacks.
2. **`scratch/check_current_paused.ts` (30 lines)**: Queries active conversation status to verify pause state.
3. **`scratch/check_final_status.ts` (35 lines)**: Checks if target conversation completed successfully.
4. **`scratch/check_recent_failures.ts` (40 lines)**: Fetches latest 5 error logs from SQLite.
5. **`scratch/debug_pipeline_liveness.ts` (55 lines)**: Validates `pipelineEvents` listener execution.
6. **`scratch/debug_pipeline_start_bug.ts` (50 lines)**: Tests orchestrator initialization boundary conditions.
7. **`scratch/find_ollama_port.ts` (60 lines)**: Port scanner checking local ports 11434, 11435, 8080 for active Ollama instances.
8. **`scratch/inspect_sqlite.ts` (45 lines)**: Executes raw SQL queries against `dev.db` to inspect table contents.
9. **`scratch/test_api_health.ts` (35 lines)**: Issues HTTP request to `/api/health` and logs output.
10. **`scratch/test_designer_stage.ts` (65 lines)**: Runs isolated execution test on Designer stage.
11. **`scratch/test_entrypoint_imports.ts` (50 lines)**: Checks HTML `<script>` tags against VFS file list.
12. **`scratch/test_executive_memory_ledger.ts` (80 lines)**: Tests `writeExecutiveMemoryRecord()` and state supersession.
13. **`scratch/test_fast_model.ts` (45 lines)**: Benchmarks token generation latency across models.
14. **`scratch/test_full_pipeline_end_to_end.ts` (120 lines)**: Runs complete 11-stage pipeline test.
15. **`scratch/test_hybrid_v2.ts` (90 lines)**: Validates Hybrid v2 orchestrator execution loop.
16. **`scratch/test_keepalive_daemon.ts` (50 lines)**: Tests background keep-alive ping interval.
17. **`scratch/test_linter.ts` (70 lines)**: Exercises TypeScript compiler and bracket balance linters.
18. **`scratch/test_live_streaming.ts` (60 lines)**: Validates SSE stream reader chunk output.
19. **`scratch/test_model_switch.ts` (55 lines)**: Tests model switching during inference.
20. **`scratch/test_ollama_noproxy.ts` (40 lines)**: Direct Ollama HTTP connection test bypassing system proxies.
21. **`scratch/test_ollama_ports.ts` (45 lines)**: Port availability tester for Ollama service.
22. **`scratch/test_ollama_proxy_bypass.ts` (45 lines)**: Tests HTTP proxy bypass configuration.
23. **`scratch/test_ollama_status.ts` (40 lines)**: Queries Ollama `/api/tags` for loaded model list.
24. **`scratch/test_persistence_sync.ts` (65 lines)**: Tests VFS in-memory map sync to physical disk workspace.
25. **`scratch/test_pipeline_integration.ts` (85 lines)**: Integration harness for pipeline stages.
26. **`scratch/test_pipeline_resilience_rca.ts` (75 lines)**: Tests infrastructure error pause handling.
27. **`scratch/test_proxy_bypass_fix.ts` (40 lines)**: Tests proxy bypass helper fix.
28. **`scratch/test_queen_pipeline_liveness.ts` (55 lines)**: Exercises Queen stage prompt execution.
29. **`scratch/test_reload_decoupling.ts` (60 lines)**: Verifies browser reload decoupling from background compilation loop.
30. **`scratch/test_resume_conversation.ts` (50 lines)**: Tests pipeline resume from mid-pipeline stage.
31. **`scratch/test_telemetry_logging.ts` (55 lines)**: Verifies rich telemetry logging to database.
32. **`scratch/test_toolbox.ts` (65 lines)**: Tests string cleaning functions in `toolbox.ts`.
33. **`scratch/test_vfs.ts` (75 lines)**: Exercises VFS read, write, upsert, and locking primitives.
34. **`scratch/trigger_next_stage.ts` (40 lines)**: Manually advances pipeline to next stage.
