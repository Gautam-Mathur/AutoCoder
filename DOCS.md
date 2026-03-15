# AutoCoder — Complete Technical Documentation

> Last updated: March 2026. Covers every module, pipeline stage, API endpoint, SLM stage, frontend component, and environment variable in the codebase.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Lines of Code](#2-lines-of-code)
3. [Monorepo Structure](#3-monorepo-structure)
4. [Quick Start](#4-quick-start)
5. [Environment Variables Reference](#5-environment-variables-reference)
6. [High-Level Architecture](#6-high-level-architecture)
7. [The 17-Stage Generation Pipeline](#7-the-17-stage-generation-pipeline)
8. [SLM Subsystem](#8-slm-subsystem)
9. [AI Backend — Local LLM & Fullstack Generator](#9-ai-backend--local-llm--fullstack-generator)
10. [Domain Knowledge System](#10-domain-knowledge-system)
11. [Quality Systems](#11-quality-systems)
12. [Storage Layer](#12-storage-layer)
13. [REST API Reference](#13-rest-api-reference)
14. [Frontend Architecture](#14-frontend-architecture)
15. [Generation Learning Engine](#15-generation-learning-engine)
16. [Supporting Module Reference](#16-supporting-module-reference)
17. [Database Schema](#17-database-schema)
18. [Development Workflow](#18-development-workflow)
19. [Adding a New Pipeline Stage](#19-adding-a-new-pipeline-stage)
20. [Model Recommendations](#20-model-recommendations)
21. [Troubleshooting](#21-troubleshooting)

---

## 1. Project Overview

AutoCoder is a self-hosted AI-powered full-stack application generator. Given a plain-English description of an app, it runs a 17-stage deterministic pipeline enriched by local small language models (SLMs) to produce a complete, runnable codebase.

**Key design goals:**

| Goal | How it is met |
|------|---------------|
| Zero cloud API costs | Ollama/LM Studio local inference; cloud AI is optional |
| Deterministic quality baseline | Rule-based stages run first; SLM only enhances |
| Fault-tolerant | Every SLM call is wrapped in try/catch; pipeline never fails due to AI |
| Transparent | Every pipeline decision is streamed as a "thinking step" to the UI |
| Self-improving | GenerationLearningEngine records outcomes and feeds them into future generations |

**Technology stack:**

- Runtime: Node.js 24, TypeScript 5.9
- Backend: Express 5 (`artifacts/api-server`)
- Frontend: React + Vite + Tailwind v4 (`artifacts/autocoder`)
- Database: PostgreSQL + Drizzle ORM (optional — in-memory fallback)
- In-browser execution: WebContainers API (`@webcontainer/api`)
- Local AI: Ollama native API + OpenAI-compatible SDK
- Monorepo: pnpm workspaces
---

## 2. Lines of Code

> Counted March 2026, excluding `node_modules`, `dist`, `.cache`, and lock files.

### Summary

| Metric | Count |
|---|---|
| **Total lines** | **~171,000** |
| TypeScript (`.ts`) | 138,955 lines across 186 files |
| TypeScript React (`.tsx`) | 27,999 lines across 281 files |
| CSS | 481 lines |
| Markdown (`.md`) | 1,848 lines |
| JSON config | 1,580 lines |

### By Package

| Package | Lines |
|---|---|
| `artifacts/api-server/src` | ~93,900 |
| `artifacts/autocoder/src` | ~64,400 |
| `lib/` (shared) | ~3,000 |
| Config, scripts, docs | ~9,700 |

### API Server Module Count

| Area | Files |
|---|---|
| Pipeline stages + orchestrator | 18 |
| SLM engine, stages & registry | 10 |
| AI backend (LLM clients, generators) | 6 |
| Quality systems | 7 |
| Domain knowledge | 4 |
| Storage layer | 3 |
| REST routes & middleware | 8 |
| Utilities & supporting modules | ~50 |
| **Total** | **106 `.ts` files** |

### Frontend Module Count

| Area | Files |
|---|---|
| Pages | 5 |
| Components | ~60 |
| Hooks | ~15 |
| State stores | ~8 |
| Utilities | ~10 |


## 3. Monorepo Structure

```
workspace/
├── artifacts/
│   ├── api-server/                   # Express backend
│   │   ├── src/
│   │   │   ├── index.ts              # Entry point — reads PORT, starts HTTP server
│   │   │   ├── app.ts                # Express app factory
│   │   │   ├── storage.ts            # IStorage interface + in-memory/PG implementations
│   │   │   ├── routes/
│   │   │   │   ├── autocoder.ts      # All ~80 REST endpoints + WebSocket handlers
│   │   │   │   ├── health.ts         # GET /api/health
│   │   │   │   └── index.ts          # Route aggregator
│   │   │   ├── modules/              # 60+ domain modules (see §15)
│   │   │   └── client-lib/
│   │   │       └── code-generator/   # Shared validator + pro-generator (server-side)
│   │   └── package.json
│   └── autocoder/                    # React frontend
│       ├── src/
│       │   ├── App.tsx               # Router (Landing / Chat / VAPT / SLM Settings)
│       │   ├── pages/                # 5 pages
│       │   ├── components/           # 30+ UI components
│       │   └── lib/
│       │       └── code-generator/   # Client-side generator modules
│       └── package.json
├── lib/
│   ├── api-spec/                     # OpenAPI spec + Orval codegen config
│   ├── api-client-react/             # Generated React Query hooks
│   ├── api-zod/                      # Generated Zod schemas
│   └── db/                           # Drizzle ORM schema + connection
├── scripts/                          # Utility scripts
├── .env.example                      # All environment variables with comments
├── pnpm-workspace.yaml
├── tsconfig.base.json                # Shared TS options (composite: true)
└── tsconfig.json                     # Root project references
```

---

## 4. Quick Start

### Prerequisites

- Node.js 24
- pnpm 9+
- [Ollama](https://ollama.com) installed and running (recommended)
- PostgreSQL (optional)

### 1 — Pull the recommended model

```bash
ollama pull qwen2.5-coder:7b
```

### 2 — Configure environment

```bash
cp .env.example .env
# Edit .env — the defaults work for Ollama on localhost
```

### 3 — Install dependencies

```bash
pnpm install
```

### 4 — Start all services

```bash
pnpm run dev
# API server: http://localhost:3001
# Frontend:   http://localhost:5173
```

Or start individually:

```bash
pnpm --filter @workspace/api-server run dev   # API only
pnpm --filter @workspace/autocoder run dev    # Frontend only
```

---

## 5. Environment Variables Reference

All variables are optional unless marked **required**. The app runs with sensible defaults.

### Server

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | API server port. The Express HTTP server binds to `0.0.0.0:PORT`. |
| `BASE_PATH` | `/` | URL base path for the frontend. |
| `NODE_ENV` | `development` | `production` disables some debug output. |

### AI — OpenAI-Compatible SDK (SLM Pipeline)

These variables control the SLM inference engine that runs all 8 AI-enhanced pipeline stages.

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_BASE_URL` | `http://localhost:11434/v1` | Base URL for any OpenAI-compatible server. Works with Ollama, LM Studio, Jan, vLLM, cloud OpenAI. |
| `OPENAI_API_KEY` | `ollama` | API key. Use any non-empty string for Ollama/LM Studio. Use a real key for cloud OpenAI. |
| `OPENAI_MODEL` | `llama3.2` | Model name. **Override this** — `llama3.2` is a general model. Use `qwen2.5-coder:7b` for code. |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | — | Replit AI Integrations override for `OPENAI_BASE_URL`. Takes precedence. |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | — | Replit AI Integrations override for `OPENAI_API_KEY`. Takes precedence. |

### AI — Ollama Native API (Local LLM Client)

These variables control the `local-llm-client.ts` module used by `ai-fullstack-generator.ts` and the per-file generation path.

| Variable | Default | Description |
|----------|---------|-------------|
| `LOCAL_LLM_URL` | `http://localhost:11434` | Ollama server base URL (no `/v1` suffix — uses `/api/generate`). |
| `LOCAL_LLM_MODEL` | falls back to `OPENAI_MODEL` or `qwen2.5-coder:7b` | Model for direct Ollama calls. If unset, inherits `OPENAI_MODEL`. |

### SLM Engine Tuning

| Variable | Default | Description |
|----------|---------|-------------|
| `SLM_CONTEXT_SIZE` | `16384` | Context window size in tokens sent to the model. Raise to `32768` if your model supports it. |

### Database

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | unset | PostgreSQL connection string (`postgresql://user:pass@host:5432/db`). If absent, the app uses in-memory storage — all data is lost on restart. |

### Frontend

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE` | `http://localhost:3001` | The Vite dev server proxies `/api` and `/cache` to this URL. Only needed for non-default API port. |

### Replit-Specific

| Variable | Description |
|----------|-------------|
| `REPLIT_DOMAINS` | Set by Replit. Used to construct preview URLs for canvas iframe embeds. |

---

## 6. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser / Client                        │
│  React + Vite (autocoder)                                    │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ Landing  │  │  Chat (IDE)  │  │ VAPT / SLM Settings   │ │
│  └──────────┘  └──────┬───────┘  └────────────────────────┘ │
│                        │ REST + WebSocket                     │
└────────────────────────┼────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   Express API Server                         │
│  routes/autocoder.ts (~80 endpoints)                        │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │          17-Stage Pipeline Orchestrator                 │  │
│  │  understand → plan → learn → reason → architect →      │  │
│  │  design → specify → schema → api → compose →           │  │
│  │  generate → resolve → quality → test → validate →      │  │
│  │  deep-quality → record                                  │  │
│  └──────────────────────────┬─────────────────────────────┘  │
│                              │                                │
│  ┌───────────────────────────▼──────────────────────────┐    │
│  │  SLM Inference Engine                                 │    │
│  │  runSLM(stage, context) ──► OpenAI-compatible server  │    │
│  │  8 registered stage templates                         │    │
│  └───────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Local LLM Client (Ollama native /api/generate)     │    │
│  │  generateWithLocalLLM() — per-file generation path  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Storage: in-memory (default) or PostgreSQL                  │
└─────────────────────────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│              Local AI Server (optional)                      │
│  Ollama  /  LM Studio  /  Jan  /  vLLM                      │
│  Model: qwen2.5-coder:7b (recommended)                      │
└─────────────────────────────────────────────────────────────┘
```

**Request flow for a code generation:**

1. User sends a message in the Chat page.
2. `POST /api/conversations/:id/messages` receives the request.
3. The route calls `handlePhaseMessage()` from `conversation-phase-handler.ts`.
4. If the message is a project creation request, `analyzeRequest()` from `deep-understanding-engine.ts` runs first.
5. If understanding is ready, `orchestratePipeline()` in `pipeline-orchestrator.ts` starts the 17-stage run.
6. Each stage's `emitStep()` calls are streamed to the client via SSE or returned in the final JSON.
7. Generated files are stored via `storage.upsertProjectFile()`.
8. The frontend renders files in the IDE panel and optionally mounts them in a WebContainer for live preview.

---

## 7. The 17-Stage Generation Pipeline

**Entry point:** `artifacts/api-server/src/modules/pipeline-orchestrator.ts`  
**Main export:** `async function orchestratePipeline(plan, understanding, options): Promise<PipelineResult>`

The pipeline is designed as a virtual development team. Each stage has a "name" (the human role it emulates) and produces a typed data structure that enriches the shared `PipelineContext` for downstream stages.

### PipelineContext

The single mutable object passed through all stages:

```typescript
interface PipelineContext {
  userRequest: string;
  plan: ProjectPlan;
  frozenPlan: ProjectPlan;          // Immutable snapshot taken before Stage 11
  understanding: UnderstandingResult;
  reasoning: ReasoningResult;
  architecture: ArchitecturePlan;
  designSystem: DesignSystem;
  functionalitySpec: FunctionalitySpec;
  schemaDesign: SchemaDesign;
  apiDesign: APIDesign;
  componentTree: ComponentTree;
  dependencyManifest: DependencyManifest;
  qualityReport: QualityReport;
  entityIntelligenceCtx: EntityIntelligenceContext;
  files: GeneratedFile[];
  testFiles: GeneratedFile[];
  thinkingSteps: ThinkingStep[];
  metrics: PipelineMetrics;
  slmStagesRun: string[];           // Which SLM enhancements ran
  onStep?: (step: ThinkingStep) => void;
}
```

### Stage Table

| # | ID | Role Name | Module | What it produces | Critical |
|---|----|-----------|---------|--------------------|----------|
| 1 | `understand` | Product Manager | `deep-understanding-engine.ts` | `UnderstandingResult` — intent, domain, entities, workflows, clarification questions | ✅ |
| 2 | `plan` | Project Manager | `plan-generator.ts` + sub-planners | `ProjectPlan` — modules, pages, endpoints, data model, UX flows, security, performance | ✅ |
| 3 | `learn` | Senior Advisor | `generation-learning-engine.ts` | Applies learned patterns from past successful generations to the plan | ❌ |
| 4 | `reason` | Technical Analyst | `contextual-reasoning-engine.ts` | `ReasoningResult` — entity relationships, computed fields, business rules, UI patterns | ✅ |
| 5 | `architect` | System Architect | `architecture-planner.ts` | `ArchitecturePlan` — folder structure, state management, auth pattern, data flow | ✅ |
| 6 | `design` | UI/UX Designer | `design-system-engine.ts` | `DesignSystem` — color tokens, typography, spacing, dark mode, animations | ✅ |
| 7 | `specify` | Feature Analyst | `functionality-engine.ts` | `FunctionalitySpec` — per-entity features, CRUD enhancements, search/filter/batch ops | ✅ |
| 8 | `schema` | Database Engineer | `schema-designer.ts` | `SchemaDesign` — normalized tables, column types, indexes, constraints, junction tables | ✅ |
| 9 | `api` | API Architect | `api-designer.ts` | `APIDesign` — REST routes, validation schemas, middleware, pagination, error handling | ✅ |
| 10 | `compose` | UI Engineer | `component-composer.ts` | `ComponentTree` — React component hierarchy, prop flow, shared components, a11y | ✅ |
| 11 | `generate` | Full-Stack Developer | `plan-driven-generator.ts` | All source files (`.tsx`, `.ts`, `.json`, `.css`, etc.) | ✅ |
| 12 | `resolve` | DevOps Engineer | `dependency-resolver.ts` | `DependencyManifest` — verified package list, updates `package.json` in generated files | ❌ |
| 13 | `quality` | Code Reviewer | `code-quality-engine.ts` | `QualityReport` — grade, issues, auto-fixes across 8 quality categories | ❌ |
| 14 | `test` | QA Engineer | `test-generator.ts` | Vitest test files for API routes, components, validation, security | ❌ |
| 15 | `validate` | Release Engineer | `post-generation-validator.ts` | Multi-pass validation — import/export resolution, dependency checks, iterative auto-fix | ✅ |
| 16 | `deep-quality` | Quality Architect | 5 sub-passes (see below) | Cross-file consistency, code hardening, type contracts, anti-patterns, quality scoring | ❌ |
| 17 | `record` | Knowledge Manager | `generation-learning-engine.ts` | Persists patterns and outcomes for future generations | ❌ |

Stages marked **Critical: ✅** will cause the pipeline to log a failure if they throw. Non-critical stages are skipped gracefully on error.

### Stage 2 — Plan sub-modules

The plan stage internally calls several independent sub-planners that each add a dimension to the plan:

| Sub-planner | Module | Adds to plan |
|-------------|--------|--------------|
| Entity Intelligence | `entity-field-inference.ts` | Domain-specific fields, relationships, status values per entity archetype |
| UX Flow Planner | `ux-flow-planner.ts` | Multi-step UX flows, error handling pages, loading patterns |
| Integration Planner | `integration-planner.ts` | Third-party integrations (Stripe, Twilio, S3, etc.) based on domain |
| Security Planner | `security-planner.ts` | Auth strategy, RBAC, input validation plan, rate limiting |
| Performance Planner | `performance-planner.ts` | Pagination configs, caching policies, index recommendations, lazy load targets |
| Learning Engine | `generation-learning-engine.ts` | Applies previously learned domain patterns |

### Stage 16 — Deep Quality 5-Pass Architecture

Stage 16 (`deep-quality`) runs five independent analysis passes in order:

| Pass | Module | What it checks |
|------|--------|----------------|
| 1 — Cross-file consistency | `cross-file-validator.ts` | Every import resolves to an export; frontend API calls match backend routes; schema fields referenced in components exist |
| 2 — Code hardening | `code-hardening-pass.ts` | Missing try/catch around fetch calls; unguarded `.map()` on possibly-undefined arrays; missing loading/empty states |
| 3 — Type contracts | `type-contract-verifier.ts` | Shared TypeScript types used consistently; no `any` drift across module boundaries |
| 4 — Anti-pattern scan | `anti-pattern-scanner.ts` | `console.log` in production code; `useEffect` with missing deps; `dangerouslySetInnerHTML`; hardcoded credentials |
| 5 — Quality scoring | `quality-scoring-engine.ts` | Aggregates all pass results into a 0–100 score with per-file grades |

### Contract Freeze

After Stage 4 (`reason`) and before Stage 11 (`generate`), the plan is deep-cloned into `ctx.frozenPlan`. All stages from 11 onward read from `frozenPlan` — they cannot retroactively change what the code generator sees, ensuring consistency even if later stages mutate `ctx.plan` further.

---

## 8. SLM Subsystem

The SLM subsystem provides AI enhancement on top of every rule-based stage. All 8 SLM calls are **non-fatal** — if the model is unavailable, times out, or returns malformed JSON, the pipeline continues with the rule-based output unchanged.

### Architecture

```
slm-registry.ts          — initializes engine + model manager, registers all templates
slm-inference-engine.ts  — runSLM(), registerStageTemplate(), isSLMAvailable()
slm-model-manager.ts     — tracks model memory, health checks, loading/unloading
slm-feedback-loop.ts     — tracks SLM vs rule win rates per stage
slm-training-collector.ts — collects training data for future fine-tuning
```

### Initialization

Called once at server startup in `index.ts`:

```typescript
initializeSLMSystem({ endpoint: process.env.OPENAI_BASE_URL });
```

This:
1. Initializes the inference engine with config (context size, temperature, max tokens)
2. Initializes the model manager (memory limits, endpoint health)
3. Registers all 8 stage prompt templates
4. Configures the OpenAI-compatible HTTP endpoint
5. Probes for `response_format: { type: "json_object" }` support — uses it if available, falls back to prompt-only JSON enforcement

### `runSLM<T>(stageId, context): Promise<SLMResponse<T>>`

The single function all pipeline stages use to invoke AI:

```typescript
interface SLMResponse<T> {
  success: boolean;
  data: T | null;
  rawOutput: string;
  tokensUsed: number;
  latencyMs: number;
  error?: string;
}
```

Internally it:
1. Looks up the registered `StagePromptTemplate` for `stageId`
2. Builds the system + user prompt from the template's `userPromptBuilder(context)`
3. Sends to the OpenAI-compatible endpoint with `max_tokens`, `temperature`, `top_p`
4. On failure, retries up to 3 times with a correction hint: `"Your previous output was invalid JSON. Output ONLY valid JSON."`
5. Parses JSON from the response (handles markdown fences, extracts first `{...}` block)
6. Returns `SLMResponse` — never throws

### The 8 Stage Templates

#### 1. `understand` — Understanding Enhancement

**File:** `slm-stage-understanding.ts`  
**Exported:** `UNDERSTANDING_STAGE_ID`, `registerUnderstandingTemplate()`, `mergeUnderstandingResults()`

**What it adds:** The rule engine does keyword-based domain detection. The SLM can interpret analogies ("like Airbnb but for equipment"), detect multi-domain blends, find implicit requirements the user didn't mention (e.g., auth, notifications, audit trail), and improve entity naming.

**Merge strategy:** `mergeUnderstandingResults(ruleResult, slmResult)` takes the union of detected entities and inferred features, preferring the SLM's values where both exist.

**When it runs:** After Stage 1, before Stage 2 plan generation.

---

#### 3. `reason` — Semantic Analysis Enhancement

**File:** `slm-stage-semantic.ts`  
**Exported:** `SEMANTIC_STAGE_ID`, `registerSemanticTemplate()`, `mergeSemanticResults()`

**What it adds:** The rule engine finds relationships by pattern matching. The SLM reasons about domain-specific relationships (e.g., a "Policy" entity in an insurance app implies a "Claim" entity with a specific state machine), computed fields, and implicit business rules.

**Merge strategy:** `mergeSemanticResults(ruleResult, slmResult)` appends new relationships and business rules that the rule engine missed, avoiding duplicates.

---

#### 4. `design` — Design System Enhancement

**File:** `slm-stage-design.ts`  
**Exported:** `DESIGN_STAGE_ID`, `registerDesignTemplate()`, `mergeDesignResults()`

**What it adds:** The rule engine picks colors based on domain keywords. The SLM understands emotional intent — "trustworthy medical app" → calming blues, high contrast; "fun game app" → vibrant gradients. It can also refine font family choices and animation guidance.

**Merge strategy:** `mergeDesignResults(ruleResult, slmResult)` deep-merges design tokens, preferring SLM values for color rationale and typography.

---

#### 5. `schema` — Schema Design Enhancement

**File:** `slm-stage-schema.ts`  
**Exported:** `SCHEMA_STAGE_ID`, `registerSchemaTemplate()`, `validateSchemaPatch()`

**What it adds:** Reviews the rule-designed schema for normalization opportunities, missing indexes, and constraint improvements (e.g., unique constraints on email fields, check constraints on status enums).

**Validation:** `validateSchemaPatch(patch, ruleOutput): boolean` — returns true if the patch is safe to apply (no destructive changes, no renaming existing columns).

---

#### 6. `api` — API Design Enhancement

**File:** `slm-stage-api.ts`  
**Exported:** `API_STAGE_ID`, `registerAPITemplate()`, `validateAPIPatch()`

**What it adds:** Reviews the rule-designed API for missing endpoints (bulk delete, export, statistics), missing rate limiting notes, and security improvements (auth middleware placement, input sanitization hints).

**Validation:** `validateAPIPatch(patch, ruleOutput): boolean` — returns true if the patch doesn't remove existing routes.

---

#### 7. `compose` — Component Tree Enhancement

**File:** `slm-stage-components.ts`  
**Exported:** `COMPONENT_STAGE_ID`, `registerComponentTemplate()`, `validateComponentPatch()`

**What it adds:** Reviews the component tree for reuse opportunities, prop interface improvements, and accessibility gaps (missing ARIA roles, keyboard navigation hints).

**Validation:** `validateComponentPatch(patch, ruleOutput): boolean` — returns true if the patch preserves all existing components.

---

#### 8. `generate` — Code Enhancement (Micro-Writer)

**File:** `slm-stage-codegen.ts`  
**Exported:** `CODEGEN_STAGE_ID`, `registerCodegenTemplate()`, `applyCodeEnhancements()`, `validateCodeEnhancement()`

**What it adds:** After Stage 11 generates the file scaffolds, the SLM acts as a "micro-writer" that fills in function bodies. It never changes imports, exports, or component signatures — it only improves logic within function bodies.

**Enhancement object:**
```typescript
interface CodeEnhancement {
  file: string;        // Target file path
  functionName: string; // Function to enhance
  snippet: string;     // Drop-in replacement for the function body
  reasoning: string;   // Why this improvement was made
}
```

**Safety:** `validateCodeEnhancement(enhancement, files)` checks that the target file and function both exist before applying. Invalid enhancements are discarded.

**Token cap:** 8000 characters per file context sent to the model; 6144 max output tokens.

---

#### 9. `deep-quality` — Final Quality Review

**File:** `slm-stage-quality.ts`  
**Exported:** `QUALITY_STAGE_ID`, `registerQualityTemplate()`, `processQualityResults()`

**What it adds:** After the 5 rule-based quality passes, the SLM scans a sample of each file (first 3000 characters) for anti-patterns the rules missed: type coercion errors, business logic mistakes, security vulnerabilities, inconsistent error handling.

**Output:** `processQualityResults(slmResult): SLMQualityIssue[]` — returns a list of issues with file, description, and suggested fix (surfaced in the thinking steps, not auto-applied).

---

### SLM Feedback Loop

`slm-feedback-loop.ts` and `slm-training-collector.ts` work together to track which pipeline stages benefit most from SLM enhancement:

- After quality scoring, each stage's `(baselineScore, slmScore)` pair is recorded
- Win rates are computed: if SLM consistently improves Stage X, it's flagged for "promotion"
- Promotion means the winning SLM pattern is extracted and codified as a new rule heuristic

**Access the feedback dashboard:**
```
GET /api/slm/status   → health, win rates, recommendations
```

---

## 9. AI Backend — Local LLM & Fullstack Generator

### `local-llm-client.ts`

Uses the **Ollama native API** (`POST /api/generate`) — not the OpenAI-compatible API.

```typescript
// Check availability (5-second timeout)
isLocalLLMAvailable(): Promise<boolean>

// List models
getAvailableModels(): Promise<string[]>

// Generate (streaming internally, returns full string)
generateWithLocalLLM(prompt, systemPrompt, config?): Promise<string>

// Extract JSON from a response that may have markdown fences
extractJSON(text): string | null
```

**Default config:**
- `baseUrl`: `LOCAL_LLM_URL` or `http://localhost:11434`
- `model`: `LOCAL_LLM_MODEL` → `OPENAI_MODEL` → `qwen2.5-coder:7b`
- `timeout`: 120 seconds

**System prompts exported:**
- `LOCAL_CODE_SYSTEM_PROMPT` — general code generation
- `ENHANCED_CODE_SYSTEM_PROMPT` — used by `llm-training-context.ts` for quality-focused generation
- `EDIT_CODE_PROMPT` — used for targeted edits
- `FIX_CODE_PROMPT` — used for bug fixing
- `UNDERSTAND_CODE_PROMPT` — used for code explanation

---

### `ai-fullstack-generator.ts`

Two generation paths for full-stack app creation:

#### Path A — Single-shot JSON (cloud AI or powerful models)

`generateFullStackAppStream(prompt, res)` asks the model to produce a complete JSON blob with all files in one call. Suitable for GPT-4o or large context models.

#### Path B — Per-file generation (recommended for local 7B models)

`generateWithOllamaPerFile(prompt, sendProgress)` uses a two-phase approach better suited to smaller models with limited context:

**Phase 1 — Manifest generation (3 retries):**
- Asks the model to plan the file structure (paths + purposes) as a small JSON object
- Validates that the JSON parses and contains `files[]`

**Phase 2 — Per-file generation (2 retries per file):**
- For each file in the manifest, asks the model to write only that file's content
- Provides full project context (all other files' purposes, available dependencies)
- Collects results even if some files fail

**Why per-file is better for SLMs:**
- A 7B model cannot reliably produce 20+ files of complete code in one call without truncation or JSON corruption
- Per-file calls are shorter, focused, and have lower failure rates
- Failed files are skipped gracefully rather than corrupting the entire output

**Auto-detection:** The route handler checks `isLocalLLMAvailable()` first. If Ollama is running, it uses per-file generation. If not (or if cloud AI is configured), it falls back to single-shot JSON via the OpenAI SDK.

---

## 10. Domain Knowledge System

**Files:** `domain-knowledge.ts`, `domain-synthesis-engine.ts`, `entity-field-inference.ts`

### Industry Domains

The system recognizes 15+ pre-modeled industry domains. Each domain specifies:

- **keywords** — trigger phrases for auto-detection
- **modules** — named functional areas (e.g., "Project Management", "Billing")
- **entities** — the core data entities with typed fields
- **workflows** — state machines (e.g., Invoice: draft → sent → paid → overdue)
- **roles** — user roles with permission descriptions
- **defaultKPIs** — dashboard metrics relevant to the domain
- **commonIntegrations** — third-party services typically needed (e.g., Stripe for e-commerce)

| Domain ID | Name | Example keywords |
|-----------|------|-----------------|
| `consulting` | Consulting / Professional Services | consulting, advisory, freelance, contractor |
| `healthcare` | Healthcare / Medical | hospital, clinic, patient, EMR, medical record |
| `ecommerce` | E-Commerce / Retail | store, shop, product, cart, checkout, order |
| `education` | Education / Learning | course, student, learning, LMS, quiz |
| `finance` | Finance / FinTech | banking, investment, portfolio, transaction |
| `real-estate` | Real Estate | property, listing, lease, tenant, agent |
| `logistics` | Logistics / Supply Chain | shipment, warehouse, inventory, tracking |
| `hr` | Human Resources | employee, payroll, attendance, recruitment |
| `restaurant` | Restaurant / Food Service | menu, reservation, order, kitchen, POS |
| `saas` | SaaS / Software Product | subscription, tenant, billing, usage, plan |
| `legal` | Legal / Law Firm | case, client, contract, billing, matter |
| `manufacturing` | Manufacturing | production, BOM, quality control, supplier |
| `nonprofit` | Nonprofit | donor, grant, volunteer, campaign |
| `fitness` | Fitness / Wellness | member, class, trainer, workout, subscription |
| `general` | General | catch-all for unrecognized domains |

### Entity Archetypes

`entity-field-inference.ts` maintains a library of ~40 entity archetypes. When the plan includes an entity named "Invoice", "User", "Order", etc., the archetype matcher:

1. Fuzzy-matches the entity name against archetype names and synonyms
2. If `matchConfidence > 0.5`, adds the archetype's fields that aren't already in the entity
3. Avoids semantic duplicates (e.g., won't add `customerId` if `clientId` already exists)

**Example — Invoice archetype fields:**
`id, invoiceNumber, issueDate, dueDate, subtotal, taxRate, taxAmount, total, currency, status (enum: draft|sent|paid|overdue|cancelled), notes, paidAt, createdAt`

### Domain Synthesis

`domain-synthesis-engine.ts` handles requests that don't match any pre-modeled domain. It:
- Extracts entities from natural language using NLP patterns
- Synthesizes a custom domain model on the fly
- Flags it as synthesized so downstream stages use more conservative defaults

---

## 11. Quality Systems

### Code Quality Engine (`code-quality-engine.ts`)

Runs in Stage 13 (`quality`). Scores generated code across 8 categories:

| Category | Max Score | What is checked |
|----------|-----------|-----------------|
| TypeScript Correctness | 15 | `any` usage, missing types, unsafe assertions |
| React Patterns | 15 | Hook rules, component structure, key props |
| Performance | 10 | Missing `useMemo`/`useCallback`, large component files |
| Accessibility | 15 | Missing alt text, ARIA labels, keyboard nav |
| Error Handling | 15 | Unhandled promise rejections, missing error boundaries |
| Loading/Empty States | 10 | Async operations without loading indicators |
| Code Style | 10 | Naming conventions, magic numbers, dead code |
| Security | 10 | `dangerouslySetInnerHTML`, hardcoded secrets, unvalidated input |

**Grades:** A+ (90–100), A (80–89), B (70–79), C (60–69), D (50–59), F (< 50)

**Auto-fixes:** Issues marked `autoFixable: true` are corrected in-place using search/replace patterns before the score is reported.

---

### Cross-File Validator (`cross-file-validator.ts`)

Runs in Stage 16 Pass 1. Performs static analysis across all generated files simultaneously:

**Import/export resolution:** For every `import { X } from './Y'`, verifies that `Y.ts(x)` exports `X`. Reports `import_mismatch` errors with the specific missing export.

**API contract matching:** Parses `fetch('/api/users')` calls in frontend files and verifies that the backend has a matching route (`GET /api/users`). Reports `api_contract_mismatch` if no route is found.

**Schema field consistency:** Checks that field names referenced in React components (e.g., `user.firstName`) exist in the corresponding entity's schema definition.

**Auto-fixable mismatches:** Common path issues (`.js` vs `.ts` suffix, `@/` alias resolution) are auto-fixed before reporting.

---

### Code Hardening Pass (`code-hardening-pass.ts`)

Runs in Stage 16 Pass 2. Injects defensive patterns:

- `fetch()` calls not inside `try/catch` → wraps in try/catch with error state setter
- `.map()` on state variables that might be `undefined` → adds `?.map()` or `(arr ?? []).map()`
- `useState()` for async data without loading state → adds `isLoading` state
- Form submit handlers without validation → adds basic required-field checks

---

### Post-Generation Validator (`post-generation-validator.ts`)

Runs in Stage 15 (`validate`). Iterative multi-pass validator (up to 3 rounds):

**What it checks:**
- All local imports resolve to existing files in the generated set
- No imports of packages not listed in `package.json`
- Vite config exists (`vite.config.ts`) — creates a default if missing
- React is imported in all `.tsx` files that use JSX
- Every React component file has a default export
- Tailwind v4 directives (`@import "tailwindcss"`) vs v3 directives (`@tailwind base`)
- `App.tsx` exists and has a default export

**Auto-fix capabilities:** It patches detected issues and re-runs validation on the fixed files. Three iterations maximum to avoid infinite loops.

---

### Vite Error Fixer (`vite-error-fixer.ts`)

Used both during generation (as part of the validator) and at runtime when the WebContainer fails:

**Recognized error types:**

| Error Type | Example Message | Fix Strategy |
|------------|-----------------|--------------|
| `missing_import` | `Failed to resolve import "X" from "Y"` | Remove the import or create a stub |
| `missing_module` | `Module not found: Can't resolve 'X'` | Add to `package.json` or use alternative |
| `syntax` | `Unexpected token` | Targeted character-level fix |
| `export_mismatch` | `does not provide an export named 'X'` | Fix the export statement in the source file |
| `type_error` | TypeScript compile errors | Remove or fix the type annotation |
| `hook_violation` | Rules of Hooks violations | Move hook call to component level |
| `css_error` | Invalid CSS directives | Fix Tailwind directive version |

---

### Anti-Pattern Scanner (`anti-pattern-scanner.ts`)

Runs in Stage 16 Pass 4. Detects:

- `console.log` / `console.error` in production component code
- `useEffect` calls with a dependency array that's missing referenced variables
- `dangerouslySetInnerHTML` without sanitization
- Hardcoded API keys, passwords, or secrets in string literals
- Synchronous `localStorage` access in SSR-capable components
- Missing `key` prop in `.map()` return values
- `parseInt()` without a radix argument

---

### Type Contract Verifier (`type-contract-verifier.ts`)

Runs in Stage 16 Pass 3. Checks that TypeScript interfaces and types declared in one file are used consistently when imported into another:

- If `User` is defined with `email: string` in `types.ts`, any component that treats `user.email` as `number` is flagged
- `any` type widening at module boundaries is flagged
- Mismatched generic parameters on shared utility types are flagged

---

## 12. Storage Layer

**File:** `artifacts/api-server/src/storage.ts`

The storage layer implements the `IStorage` interface and auto-selects backend based on `DATABASE_URL`:

### In-Memory Storage (default)

- Uses `Map<id, entity>` for all collections
- Auto-incrementing integer IDs
- **Zero persistence** — all data lost on server restart
- Suitable for development and demos

### PostgreSQL Storage

- Activated when `DATABASE_URL` is set
- Uses Drizzle ORM with the schema from `lib/db`
- Supports all CRUD operations with proper transactions
- VAPT (vulnerability assessment) tables are PostgreSQL-only

### IStorage Interface

```typescript
interface IStorage {
  // Conversations
  getConversation(id): Promise<Conversation>
  getAllConversations(): Promise<Conversation[]>
  createConversation(title): Promise<Conversation>
  deleteConversation(id): Promise<void>
  updateProjectContext(id, context): Promise<Conversation>

  // Messages
  getMessagesByConversation(conversationId): Promise<Message[]>
  createMessage(conversationId, role, content, thinkingSteps?): Promise<Message>

  // Project Files
  getProjectFiles(conversationId): Promise<ProjectFile[]>
  getProjectFile(id): Promise<ProjectFile>
  createProjectFile(file): Promise<ProjectFile>
  updateProjectFile(id, content): Promise<ProjectFile>
  deleteProjectFile(id): Promise<void>
  upsertProjectFile(conversationId, path, content, language): Promise<ProjectFile>

  // Project Plans
  getProjectPlan(conversationId): Promise<ProjectPlan>
  createProjectPlan(plan): Promise<ProjectPlan>

  // Intel Records (context memory)
  getIntelRecords(conversationId): Promise<IntelRecord[]>
  upsertIntelRecord(conversationId, key, category, value, type): Promise<IntelRecord>

  // Test Results, Security Scans, Generation Logs
  // VAPT assets, vulnerabilities, scans, schedules, audit logs, team members
}
```

---

## 13. REST API Reference

All routes are registered in `artifacts/api-server/src/routes/autocoder.ts`. Base URL: `http://localhost:3001`.

### Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Returns `{ status, engine, stages, domains, aiEnhancement }` |

### Conversations

| Method | Path | Body / Params | Description |
|--------|------|---------------|-------------|
| `GET` | `/api/conversations` | — | List all conversations |
| `GET` | `/api/conversations/:id` | — | Get a single conversation with project context |
| `POST` | `/api/conversations` | `{ title? }` | Create a new conversation |
| `DELETE` | `/api/conversations/:id` | — | Delete conversation + all associated data |
| `PUT` | `/api/conversations/:id/context` | `ProjectContext` | Update project context metadata |

### Messages (Core — Code Generation)

| Method | Path | Body | Description |
|--------|------|------|-------------|
| `POST` | `/api/conversations/:id/messages` | `{ content }` | **Main message endpoint.** Runs conversation phase handler → triggers pipeline if a project creation request is detected. Returns `{ message, thinkingSteps, generatedFiles, projectCreated }` |
| `POST` | `/api/conversations/:id/assistant-message` | `{ content }` | Inject an assistant message without running generation (used internally) |

**How the message pipeline works:**

1. `handlePhaseMessage()` checks if this is a project creation request via `isProjectCreationRequest()`
2. If yes: runs `analyzeRequest()` → if understanding is ready, runs `orchestratePipeline()`
3. If no: routes to conversational response (clarification, help, code explanation, etc.)
4. Generated files are stored via `upsertProjectFile()` for each file in the result

### Project Files

| Method | Path | Body | Description |
|--------|------|------|-------------|
| `GET` | `/api/conversations/:id/files` | — | List all files for a conversation |
| `POST` | `/api/conversations/:id/files` | `{ path, content, language }` | Create a single file |
| `PUT` | `/api/files/:id` | `{ content }` | Update a file's content |
| `DELETE` | `/api/files/:id` | — | Delete a file |
| `DELETE` | `/api/conversations/:id/files` | — | Delete all files for a conversation |
| `POST` | `/api/conversations/:id/files/bulk` | `{ files: [{path, content, language}] }` | Create/update multiple files at once |

### Project Plan

| Method | Path | Body | Description |
|--------|------|------|-------------|
| `POST` | `/api/conversations/:id/plan` | `{ prompt }` | Generate a structured project plan (runs pipeline Stages 1–2 only, no code) |
| `GET` | `/api/conversations/:id/plan` | — | Retrieve the stored plan |

### Auto-Fix

| Method | Path | Body | Description |
|--------|------|------|-------------|
| `POST` | `/api/conversations/:id/auto-fix` | `{ errors, files }` | Server-side deep auto-fix. Parses Vite errors, applies `analyzeAndFix()`, returns patched files |

### Testing

| Method | Path | Body | Description |
|--------|------|------|-------------|
| `POST` | `/api/conversations/:id/test` | `{ files? }` | Runs `generateTestsForCode()` and `validateBuild()`, returns test results |

### Security

| Method | Path | Body | Description |
|--------|------|------|-------------|
| `POST` | `/api/conversations/:id/security-scan` | `{ files? }` | Runs `scanForVulnerabilities()`, returns `SecurityScan` with findings and recommendations |

### Analytics & Transparency

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/conversations/:id/transparency` | Returns assumption list, inference chain, and confidence scores for the last generation |
| `GET` | `/api/conversations/:id/stats` | Returns generation metrics: file count, line count, stage durations, quality score |
| `GET` | `/api/conversations/:id/dependencies` | Returns dependency analysis from the last generation |

### Intel / Context Memory

| Method | Path | Body | Description |
|--------|------|------|-------------|
| `GET` | `/api/conversations/:id/intel` | — | Get all stored intel records for a conversation |
| `POST` | `/api/conversations/:id/intel/extract` | `{ messages }` | Extract and store key-value intel from conversation messages |

### Export & Download

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/conversations/:id/export` | Export project as a structured JSON object |
| `GET` | `/api/conversations/:id/download` | Download project as a `.zip` archive |

### GitHub Integration

| Method | Path | Body | Description |
|--------|------|------|-------------|
| `GET` | `/api/github/repos` | — | List GitHub repos (requires `GITHUB_TOKEN`) |
| `GET` | `/api/github/repos/:owner/:repo/contents` | — | Browse repo file tree |
| `POST` | `/api/conversations/:id/import-github` | `{ owner, repo, branch? }` | Import a GitHub repo's files into the conversation |
| `POST` | `/api/github/push` | `{ files, repo, message }` | Push files to a GitHub repo |
| `POST` | `/api/conversations/:id/github-push` | `{ repo, message }` | Push conversation files to GitHub |

### File Upload & Ingestion

| Method | Path | Body | Description |
|--------|------|------|-------------|
| `POST` | `/api/conversations/:id/upload-files` | `multipart/form-data` | Upload files to the conversation |
| `POST` | `/api/conversations/:id/ingest` | `{ files: FileInfo[] }` | Ingest an existing codebase — runs `analyzeCodebase()` and `generatePlanFromCodebase()` (reverse engineering) |

### AI Utility Endpoints

| Method | Path | Body | Description |
|--------|------|------|-------------|
| `POST` | `/api/analyze-prompt` | `{ prompt }` | Run clarification analysis on a prompt |
| `POST` | `/api/generate-fullstack` | `{ prompt }` | Direct fullstack generation (streaming SSE response) |
| `POST` | `/api/generate-fullstack-sync` | `{ prompt }` | Direct fullstack generation (synchronous, returns JSON) |
| `POST` | `/api/modify-code` | `{ files, instruction }` | Apply a natural-language modification to existing files |
| `POST` | `/api/ai/understand` | `{ code }` | Explain/understand existing code using LLM |
| `POST` | `/api/ai/edit` | `{ code, instruction }` | Edit code according to instruction |
| `POST` | `/api/ai/fix` | `{ code, error }` | Fix code given an error message |
| `GET` | `/api/ai/status` | — | Returns `{ local: bool, cloud: bool, model, localModel, availableModels }` |
| `POST` | `/api/ai/plan` | `{ prompt }` | Generate a project plan using the AI |
| `POST` | `/api/ai/nlu` | `{ text }` | Run full NLU analysis |
| `POST` | `/api/ai/intent` | `{ text }` | Classify intent of a message |
| `POST` | `/api/ai/explain` | `{ code, language }` | Explain code in plain English |
| `POST` | `/api/ai/diagnose` | `{ error, code }` | Deep error diagnosis |
| `POST` | `/api/ai/auto-fix` | `{ code, error }` | Auto-fix code given an error |
| `POST` | `/api/ai/emit` | `ProjectBlueprint` | Emit project files from a blueprint spec |
| `POST` | `/api/ai/analyze-code` | `{ code, language }` | Live code analysis (quality, issues) |

### Knowledge Base

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/ai/concepts/:id` | Get a programming concept explanation |
| `GET` | `/api/ai/concepts` | List all concepts |
| `GET` | `/api/ai/best-practices` | List all best practice guides |
| `GET` | `/api/ai/best-practices/:id` | Get a specific best practice |
| `GET` | `/api/ai/learning-path/:topic` | Get a learning path for a topic |
| `GET` | `/api/ai/patterns` | List all learned generation patterns |
| `GET` | `/api/ai/languages` | List all supported programming languages |
| `GET` | `/api/ai/frameworks` | List all known frameworks |

### SLM Status

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/slm/status` | SLM health, per-stage win rates, model info, feedback summary |
| `POST` | `/api/slm/test/:stage` | Run a test inference for a specific stage |
| `GET` | `/api/slm/stages` | List all registered stage templates |

### Preview & Sandbox

| Method | Path | Body | Description |
|--------|------|------|-------------|
| `POST` | `/api/preview/prepare/:id` | — | Prepare project files for WebContainer mounting |
| `POST` | `/api/preview/start/:id` | — | Start a preview server inside WebContainer |
| `POST` | `/api/preview/stop` | — | Stop the running preview server |
| `GET` | `/api/preview/status` | — | Get current preview server status |
| `POST` | `/api/sandbox/create` | `{ files }` | Create a sandbox environment |
| `POST` | `/api/sandbox/stop` | — | Stop the sandbox |
| `GET` | `/api/sandbox/status` | — | Get sandbox status |

### Logs

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/logs` | Get server-side generation logs |
| `GET` | `/api/logs/stats` | Get log statistics |
| `DELETE` | `/api/logs` | Clear logs |
| `POST` | `/api/conversations/:id/logs` | Record a generation log |
| `GET` | `/api/conversations/:id/logs` | Get generation logs for a conversation |

### Snapshot Cache

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/cache/build-snapshot` | Build an npm install snapshot from a `package.json`. Upgrades package versions via `upgradePackageJson()`, builds into a gzipped tarball, stores in `./cache/`. |
| `GET` | `/cache/:filename` | Serve a cached snapshot file (gzipped) |

---

## 14. Frontend Architecture

**Entry:** `artifacts/autocoder/src/App.tsx`  
**Router:** Wouter with base path from `import.meta.env.BASE_URL`

### Pages

| Page | Route | Description |
|------|-------|-------------|
| `Landing` | `/` | Hero page with feature highlights and "Start Building" CTA |
| `Chat` | `/chat` | Main IDE — split layout: sidebar (conversations) + chat panel + file panel + preview panel |
| `VaptDashboard` | `/vapt` | Vulnerability Assessment & Penetration Testing dashboard |
| `SLMSettings` | `/slm` | Configure and monitor the SLM subsystem |
| `NotFound` | `*` | 404 page |

### Chat Page Layout

The Chat page (`pages/chat.tsx`) is the primary user interface. It is a multi-panel layout:

```
┌─────────┬──────────────────────────────┬──────────────────┐
│Sidebar  │  Chat Panel                  │ Right Panel      │
│         │  ┌─────────────────────────┐ │ (tabs):          │
│Conver-  │  │ ThinkingSteps           │ │ - Files          │
│sation   │  │ (pipeline progress)     │ │ - Preview        │
│list     │  ├─────────────────────────┤ │ - Code           │
│         │  │ ChatMessage (assistant) │ │ - Terminal       │
│         │  │ - ProjectSummary card   │ │ - Deployment     │
│         │  │ - code blocks           │ │ - Flowchart      │
│         │  │ - ThinkingSteps         │ │ - Intelligence   │
│         │  ├─────────────────────────┤ │                  │
│         │  │ ChatInput               │ │                  │
│         │  │ + file upload           │ │                  │
└─────────┴──────────────────────────────┴──────────────────┘
```

### Key Components

#### `ThinkingSteps`
Renders the live pipeline progress. Each step has:
- A phase-specific icon and color (e.g., `Brain` for understanding, `Palette` for design)
- A label and optional detail string
- Expandable/collapsible with a chevron button
- Maps all 17 pipeline stage IDs to display names and icons

#### `ChatMessage`
Renders a single message (user or assistant). For assistant messages:
- Detects if the message contains a `<!--PROJECT:...-->` marker (generated by pipeline)
- If project marker found: renders a `ProjectSummary` card instead of raw text
- Otherwise: renders markdown + code blocks via `parseCodeBlocks()`
- Shows approval buttons ("Approve & Generate") when the pipeline is waiting for confirmation

#### `ProjectSummary`
A visual card showing:
- Project name and type
- Total file count
- File tabs with syntax-highlighted content
- "Download" and "Copy" actions per file

#### `FilePanel`
VS Code-style file tree on the right panel. Displays all project files, allows clicking to open in code preview.

#### `PreviewPanel`
Embeds an iframe pointing at the WebContainer's preview URL. Shows loading state while the WebContainer boots.

#### `CodePreview`
Syntax-highlighted code viewer using the project's language detection. Includes copy-to-clipboard.

#### `ThinkingSteps` Phase Icons

| Phase ID | Icon | Color | Display Label |
|----------|------|-------|---------------|
| `understand` | ClipboardList | blue-400 | Product Manager |
| `plan` | Layers | indigo-400 | Project Manager |
| `learn` | GraduationCap | amber-400 | Senior Advisor |
| `reason` | GitBranch | cyan-400 | Technical Analyst |
| `architect` | Building2 | purple-400 | System Architect |
| `design` | Palette | pink-400 | UI/UX Designer |
| `specify` | Zap | orange-400 | Feature Analyst |
| `schema` | Database | sky-400 | Database Engineer |
| `api` | Globe | teal-400 | API Architect |
| `compose` | LayoutGrid | lime-400 | UI Engineer |
| `generate` | Code | emerald-400 | Full-Stack Dev |
| `resolve` | Wrench | slate-400 | DevOps Engineer |
| `quality` | Eye | yellow-400 | Code Reviewer |
| `test` | TestTube | rose-400 | QA Engineer |
| `validate` | PackageCheck | green-400 | Release Engineer |
| `deep-quality` | (BookOpen) | fuchsia-400 | Quality Architect |
| `record` | BookOpen | fuchsia-400 | Knowledge Manager |

#### `IntelligencePanel`
Shows the pipeline's "intelligence" — detected domain, entity graph, confidence scores, and SLM enhancement indicators.

#### `AutoRunPreview`
Monitors the WebContainer dev server output. When a Vite error is detected, automatically:
1. Parses the error with `parseErrors()`
2. Sends to `POST /api/conversations/:id/auto-fix`
3. Applies the patched files back to the WebContainer
4. Retries up to 3 times

#### `FlowchartPanel`
Renders a visual flowchart of the generated app's page structure and data flows, derived from the pipeline's plan.

#### `DeploymentPanel`
Guides the user through publishing the generated app (Replit deployment, GitHub push, Docker export).

#### `Terminal`
Embedded terminal showing WebContainer process output (npm install, vite dev server, build errors).

#### `LogViewer`
Displays server-side generation logs in real time.

### WebContainer Integration

`src/lib/code-runner/webcontainer.ts` wraps the `@webcontainer/api`:

- `preWarmWebContainer()` — called at app startup to reduce boot time
- `mountFiles(files)` — mounts generated files into the in-browser filesystem
- `runInstall()` — runs `npm install` inside the container
- `runDevServer()` — starts the Vite dev server, captures output for `AutoRunPreview`
- `isWebContainerSupported()` — checks for `SharedArrayBuffer` + cross-origin isolation headers

**Note:** WebContainers require cross-origin isolation headers (`COOP: same-origin`, `COEP: require-corp`). The API server sets these on all responses.

### State Management

- **React Query** (`@tanstack/react-query`) — all API calls, caching, and invalidation
- **No global state library** — component-local state with React's `useState`/`useContext`
- **Theme** — `ThemeProvider` wraps the app; persists to `localStorage` under key `codeai-theme`

### Styling

- Tailwind v4 with CSS variable-based theming
- Dark mode by default
- Custom CSS variables: `--background`, `--foreground`, `--primary`, `--secondary`, etc.
- shadcn/ui component library (`src/components/ui/`)

---

## 15. Generation Learning Engine

**File:** `artifacts/api-server/src/modules/generation-learning-engine.ts`

The `GenerationLearningEngine` class is a singleton (`learningEngine`) that runs throughout the server's lifetime:

### What it learns

| Pattern Type | Example |
|--------------|---------|
| `entity-structure` | "In healthcare domain, Patient always has dateOfBirth, gender, bloodType" |
| `field-naming` | "Users prefer camelCase for field names in React projects" |
| `workflow-design` | "E-commerce Order entities get 5-state workflows: pending→confirmed→shipped→delivered→cancelled" |
| `ui-layout` | "Dashboard pages benefit from KPI cards at the top" |
| `tech-choice` | "Projects with auth always need jwt + bcrypt" |
| `domain-mapping` | "When user mentions 'invoicing', map to finance domain" |
| `validation-rule` | "Email fields always get format validation" |
| `page-structure` | "CRUD entities get List + Detail + Form pages" |
| `error-prevention` | "Avoid generating circular imports in large projects" |

### Storage

Patterns are stored in two places (whichever is available):
1. **PostgreSQL** — `generationPatterns`, `generationOutcomes`, `userPreferences` tables
2. **File fallback** — `./learning-data.json` in the working directory

On startup, the engine loads from the database first, then from the file.

### API

```typescript
class GenerationLearningEngine {
  // Called at Stage 2 to enrich the plan
  applyLearnedPatterns(plan: ProjectPlan): ProjectPlan

  // Called at Stage 17 to record the outcome
  recordGenerationOutcome(outcome: GenerationOutcomeRecord): void

  // Returns current pattern stats
  getPatternStats(): { total, reliable, byType }
}
```

### Pattern Reliability

Each pattern has a `successCount` and `failureCount`. `reliability = successCount / (successCount + failureCount)`. Only patterns with `reliability >= 0.7` and at least 3 successes are applied to future generations.

---

## 16. Supporting Module Reference

Complete reference of all modules in `artifacts/api-server/src/modules/`:

| Module | Purpose |
|--------|---------|
| `adaptive-clarification-engine.ts` | Generates adaptive clarification questions based on complexity assessment. Calculates a "readiness score" — if below threshold, prompts user for more info before generating. |
| `advanced-code-generation.ts` | Alternative code generation path using template expansion. Used for simple/common app types where templates outperform LLM. |
| `advanced-reasoning.ts` | Multi-step reasoning for complex technical decisions. Used by `/api/ai/plan`. |
| `ai-code-refiner.ts` | Post-generation code refinement. Applies targeted improvements to specific code patterns. |
| `anti-pattern-scanner.ts` | Stage 16 Pass 4 — detects React anti-patterns, security issues, dead code. See §10. |
| `api-designer.ts` | Stage 9 — designs the full REST API surface from the plan. Produces `APIDesign` with routes, validation schemas, middleware. |
| `architecture-planner.ts` | Stage 5 — decides folder structure, state management (Zustand/Context/Redux), auth pattern, data flow. |
| `clarification-engine.ts` | Early clarification prompt analysis. `analyzePrompt()` detects ambiguity and returns questions. |
| `codebase-analyzer.ts` | Analyzes an uploaded/imported codebase. Extracts file types, frameworks, entities, and produces a `FileInfo` summary. |
| `code-cleaner.ts` | Cleans generated code: removes markdown fences from code outputs, normalizes line endings, strips BOM characters. |
| `code-explanation-engine.ts` | Explains code in plain English. Used by `/api/ai/explain`. |
| `code-hardening-pass.ts` | Stage 16 Pass 2 — injects defensive patterns. See §10. |
| `code-quality-engine.ts` | Stage 13 — scores code across 8 categories. See §10. |
| `complete-code-intelligence.ts` | Aggregates all intelligence signals (NLU, intent, entities, domain) into a unified context object. |
| `component-composer.ts` | Stage 10 — plans the React component hierarchy. Produces `ComponentTree`. |
| `context-memory.ts` | Long-term context memory. Stores user preferences, past decisions, and relevant context across conversations. |
| `context-window-manager.ts` | Manages token budgets for LLM context windows. Chunks conversation history and retrieves relevant chunks. |
| `contextual-reasoning-engine.ts` | Stage 4 — analyzes entity semantics, finds relationships, computed fields, business rules. Produces `ReasoningResult`. |
| `continuous-debugger.ts` | Session-scoped debugger that tracks all errors across a conversation and provides cumulative analysis. |
| `conversational-flexibility.ts` | Detects follow-up messages, maintains conversation state, generates appropriate non-generation responses. |
| `conversation-phase-handler.ts` | Top-level message router. Determines if a message is: project creation, modification, question, or meta-request. |
| `cross-file-tracer.ts` | Traces relationships between files: which component imports which, which API route serves which frontend page. |
| `cross-file-validator.ts` | Stage 16 Pass 1 — cross-file consistency validation. See §10. |
| `deep-debugging-engine.ts` | Deep error analysis with root cause identification and multi-step fix suggestions. |
| `deep-project-generator.ts` | Blueprint-based project generation. `listBlueprints()` returns pre-defined project templates. |
| `deep-understanding-engine.ts` | Stage 1 — 6-level understanding analysis. See §6 and §9. |
| `dependency-intelligence.ts` | Analyzes dependencies for security, compatibility, and bundle size. |
| `dependency-registry.ts` | Registry of ~500 known npm packages with metadata (version ranges, peer deps, bundle size). |
| `dependency-resolver.ts` | Stage 12 — resolves required packages from generated file imports, patches `package.json`. |
| `design-system-engine.ts` | Stage 6 — generates domain-aware design tokens. Produces `DesignSystem`. |
| `deterministic-stages.ts` | Contains the rule-based implementations of stages that have both rule + SLM versions. |
| `domain-knowledge.ts` | 15+ industry domain models with entities, workflows, roles, KPIs. See §9. |
| `domain-synthesis-engine.ts` | Synthesizes custom domain models for unrecognized domains. |
| `dual-path-executor.ts` | Runs both rule-based and SLM paths in parallel, picks the winner by quality score. |
| `enhanced-intent-recognition.ts` | Improved intent classification with entity extraction and confidence scoring. |
| `entity-field-inference.ts` | ~40 entity archetypes with typed fields. See §9. |
| `export-system.ts` | Generates structured project export and download data. |
| `framework-detector.ts` | Detects framework from file content (React, Vue, Angular, Express, FastAPI, etc.). |
| `framework-patterns.ts` | Registry of frameworks with generation patterns, file templates, and best practices. |
| `functionality-engine.ts` | Stage 7 — maps entity types to interactive features. Produces `FunctionalitySpec`. |
| `generation-learning-engine.ts` | Learning engine. See §14. |
| `generation-stages.ts` | Lower-level stage execution utilities used by the orchestrator. |
| `index.ts` | Module barrel exports. |
| `integration-planner.ts` | Plans third-party integrations based on domain keywords (Stripe, SendGrid, Twilio, etc.). |
| `intel-memory.ts` | Extracts and stores key-value intelligence from conversation messages. |
| `knowledge-base.ts` | Programming concepts, best practices, and learning paths database. |
| `knowledge-stages.ts` | Knowledge-driven generation stages that use the domain + entity knowledge bases. |
| `language-registry.ts` | Registry of programming languages with syntax and template information. |
| `language-registry-extended.ts` | Extended language data including less common languages. |
| `learning-stage.ts` | Stage 3 — applies learned patterns from `GenerationLearningEngine`. |
| `live-code-analysis.ts` | Real-time code quality analysis. Used by the code editor for inline feedback. |
| `llm-training-context.ts` | System prompts and few-shot examples used for LLM calls. |
| `local-ai-engine.ts` | Unified interface for local AI operations (uses `local-llm-client.ts` internally). |
| `local-llm-client.ts` | Ollama native API client. See §8. |
| `local-pipeline-router.ts` | Routes requests between the full pipeline, the simple generator, and the template generator based on complexity. |
| `local-response-handler.ts` | Formats pipeline output into the final API response JSON structure. |
| `logger.ts` | Structured logger with request/response logging middleware. |
| `modular-test-engine.ts` | Runs individual pipeline stages in isolation for testing and diagnostics. |
| `multi-language-templates.ts` | Code templates for 20+ programming languages. |
| `natural-language-understanding.ts` | NLU module: intent classification, entity extraction, sentiment detection. |
| `performance-planner.ts` | Plans performance optimizations: pagination, caching, indexes, lazy loading. |
| `pipeline-orchestrator.ts` | The 17-stage pipeline. See §6. |
| `plan-driven-generator.ts` | Stage 11 — generates all project files from the enriched plan. |
| `plan-generator.ts` | Stage 2 — converts `UnderstandingResult` into a full `ProjectPlan`. |
| `planning-module.ts` | High-level planning API used by `/api/conversations/:id/plan`. |
| `post-generation-validator.ts` | Stage 15 — multi-pass validator. See §10. |
| `preview-project-manager.ts` | Manages server-side preview server lifecycle. |
| `project-context-manager.ts` | Manages project context (tech stack, features built, current phase). |
| `prompt-enhancer.ts` | Enhances user prompts before sending to LLM. Adds domain context, tech constraints. |
| `quality-scoring-engine.ts` | Stage 16 Pass 5 — aggregates quality scores into a final report. |
| `reverse-plan-generator.ts` | Reverse-engineers a `ProjectPlan` from an existing codebase via `generatePlanFromCodebase()`. |
| `schema-designer.ts` | Stage 8 — designs normalized database schema. Produces `SchemaDesign`. |
| `security-module.ts` | Vulnerability scanner — checks for OWASP top 10 patterns in generated code. |
| `security-planner.ts` | Plans the security architecture: auth type, RBAC, input validation strategy. |
| `slm-feedback-loop.ts` | Tracks SLM vs rule win rates. See §7. |
| `slm-inference-engine.ts` | Core SLM engine. See §7. |
| `slm-model-manager.ts` | Model lifecycle management — health checks, memory tracking. |
| `slm-registry.ts` | Registers all 8 stage templates at startup. See §7. |
| `slm-stage-api.ts` | SLM stage 5 (api). See §7. |
| `slm-stage-codegen.ts` | SLM stage 7 (generate). See §7. |
| `slm-stage-components.ts` | SLM stage 6 (compose). See §7. |
| `slm-stage-design.ts` | SLM stage 3 (design). See §7. |
| `slm-stage-quality.ts` | SLM stage 8 (deep-quality). See §7. |
| `slm-stage-schema.ts` | SLM stage 4 (schema). See §7. |
| `slm-stage-semantic.ts` | SLM stage 2 (reason). See §7. |
| `slm-stage-understanding.ts` | SLM stage 1 (understand). See §7. |
| `slm-training-collector.ts` | Collects SLM input/output pairs for future fine-tuning. |
| `snapshot-builder.ts` | Builds npm install snapshots (gzipped tarballs) for fast WebContainer mounting. |
| `targeted-code-editor.ts` | Applies targeted edits to specific functions within a file without rewriting the entire file. |
| `template-registry.ts` | Registry of project template starters for common app types. |
| `test-generator.ts` | Stage 14 — generates Vitest test files. |
| `testing-engine.ts` | Runs tests and validates builds. Used by `/api/conversations/:id/test`. |
| `transparency-module.ts` | Extracts assumptions, inference chains, and confidence scores from a generation run. |
| `true-conversational-ai.ts` | Full conversational state machine — maintains conversation phase, context, memory across turns. |
| `type-contract-verifier.ts` | Stage 16 Pass 3 — verifies TypeScript type consistency. See §10. |
| `universal-code-emitter.ts` | Emits project files from a `ProjectBlueprint` spec. Used by `/api/ai/emit`. |
| `universal-code-explanation.ts` | Language-agnostic code explanation. Handles 20+ languages. |
| `ux-flow-planner.ts` | Plans multi-step UX flows, error handling pages, and loading patterns. |
| `vite-error-fixer.ts` | Parses and auto-fixes Vite build/runtime errors. See §10. |

---

## 17. Database Schema

**File:** `lib/db/src/schema.ts`  
**ORM:** Drizzle ORM

### Core Tables

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `conversations` | `id, title, projectName, projectDescription, techStack[], conversationPhase, projectPlanData, understandingData` | One conversation = one project session |
| `messages` | `id, conversationId, role, content, thinkingSteps (JSON)` | Chat messages with pipeline thinking steps |
| `projectFiles` | `id, conversationId, path, content, language` | Generated files, updatable |
| `projectPlans` | `id, conversationId, planData (JSON)` | Stored project plans |
| `intelRecords` | `id, conversationId, key, category, value, type` | Key-value context memory |
| `testResults` | `id, conversationId, results (JSON)` | Test run results |
| `securityScans` | `id, conversationId, findings (JSON), score` | Security scan results |
| `generationLogs` | `id, conversationId, phase, duration, fileCount, lineCount` | Generation metrics |

### VAPT Tables (PostgreSQL-only)

| Table | Purpose |
|-------|---------|
| `vaptAssets` | Target systems/URLs for security assessment |
| `vaptVulnerabilities` | Found vulnerabilities with CVSS scores |
| `vaptScans` | Scan runs with status and results |
| `vaptSchedules` | Recurring scan schedules |
| `vaptAuditLog` | Audit trail for all VAPT actions |
| `vaptTeamMembers` | Team members with roles and permissions |

### Learning Tables (PostgreSQL-only)

| Table | Purpose |
|-------|---------|
| `generationPatterns` | Learned patterns with reliability scores |
| `generationOutcomes` | Historical generation outcome records |
| `userPreferences` | Per-user/session preferences |

---

## 18. Development Workflow

### Starting services

```bash
# Start everything
pnpm run dev

# Start only API
pnpm --filter @workspace/api-server run dev

# Start only frontend  
pnpm --filter @workspace/autocoder run dev
```

### TypeScript checking

Always typecheck from the root (not inside individual packages):

```bash
pnpm run typecheck
# Runs: tsc --build --emitDeclarationOnly (uses project references)
```

### Building for production

```bash
pnpm run build
# 1. Runs typecheck
# 2. Recursively runs build in each package

# API server bundle (esbuild CJS)
pnpm --filter @workspace/api-server run build
# Output: artifacts/api-server/dist/index.cjs

# Frontend bundle (Vite)
pnpm --filter @workspace/autocoder run build
# Output: artifacts/autocoder/dist/
```

### Database migrations

If using PostgreSQL:

```bash
# Push schema changes (safe — no destructive changes)
pnpm --filter @workspace/db run db:push

# Force push (use carefully)
pnpm --filter @workspace/db run db:push --force
```

**Critical:** Never change primary key column types (serial ↔ varchar). This generates destructive ALTER TABLE statements.

### Running a single pipeline stage in isolation

The `modular-test-engine.ts` module supports isolated stage testing:

```bash
# Via API (useful for debugging)
curl -X POST http://localhost:3001/api/conversations/1/stage-test \
  -H "Content-Type: application/json" \
  -d '{ "stage": "schema", "input": { "plan": {...} } }'
```

### Adding a new npm package

```bash
# Add to api-server
pnpm --filter @workspace/api-server add <package>

# Add to autocoder frontend
pnpm --filter @workspace/autocoder add <package>

# Add as dev dependency
pnpm --filter @workspace/api-server add -D <package>
```

---

## 19. Adding a New Pipeline Stage

To add a new stage to the pipeline:

### 1. Create the rule module

```typescript
// src/modules/my-new-stage.ts
export interface MyOutput { ... }
export function runMyStage(plan: ProjectPlan, ctx: any): MyOutput { ... }
```

### 3. Add a stage definition

In `pipeline-orchestrator.ts`, add to `PIPELINE_STAGES`:

```typescript
{ id: 'my-stage', name: 'Role Name', role: 'Role Description',
  description: '...', order: N, critical: false }
```

Set `order` to place it in the sequence. Increment all subsequent stage `order` values.

### 4. Call it in the orchestrator

```typescript
const myStage = PIPELINE_STAGES.find(s => s.id === 'my-stage')!;
emitStep(ctx, 'my-stage', 'Role Name doing X', 'Why this matters');
executeStage(ctx, myStage, () => {
  ctx.myOutput = runMyStage(ctx.plan!, ctx.reasoning);
  emitStep(ctx, 'my-stage', 'Stage complete', `...summary...`);
  return { score: 80, warnings: [], output: ctx.myOutput };
});
```

### 5. Create an SLM stage template (optional)

```typescript
// src/modules/slm-stage-my-stage.ts
import { registerStageTemplate } from './slm-inference-engine.js';

export const MY_STAGE_ID = 'my-stage';

export function registerMyStageTemplate(): void {
  registerStageTemplate({
    stage: MY_STAGE_ID,
    systemPrompt: `You are an expert in ...`,
    userPromptBuilder: (context) => `Analyze: ${JSON.stringify(context.ruleOutput)}`,
    outputSchema: { /* JSON schema of expected output */ },
    maxTokens: 2048,
    temperature: 0.3,
  });
}

export function mergeMyResults(ruleResult: any, slmResult: any): any {
  return { ...ruleResult, ...slmResult }; // your merge logic
}
```

### 6. Register the template

In `slm-registry.ts`:
```typescript
import { registerMyStageTemplate } from './slm-stage-my-stage.js';
// inside registerAllSLMTemplates():
registerMyStageTemplate();
```

### 7. Wire the SLM call in the orchestrator

After your `executeStage()` call:
```typescript
if (isSLMAvailable() && ctx.myOutput) {
  try {
    const slmResult = await runSLM(MY_STAGE_ID, { ruleOutput: ctx.myOutput, plan: ctx.plan });
    if (slmResult.success && slmResult.data) {
      ctx.myOutput = mergeMyResults(ctx.myOutput, slmResult.data);
      ctx.slmStagesRun.push('my-stage');
    }
  } catch (err) {
    emitStep(ctx, 'my-stage', 'SLM enhancement skipped', `Non-fatal: ${err}`);
  }
}
```

### 8. Add the icon to the frontend

In `src/components/thinking-steps.tsx`, add an entry to `phaseConfig`:
```typescript
'my-stage': { icon: SomeIcon, color: 'text-indigo-400', label: 'Role Name' },
```

---

## 20. Model Recommendations

The quality of generated code scales directly with model size and specialization. Use a code-specific model — general models (llama3.2, mistral) produce significantly worse code.

### Recommended Models (Ollama)

| Model | VRAM Required | Quality | Use Case |
|-------|--------------|---------|----------|
| `qwen2.5-coder:7b` | 6 GB GPU / 8 GB RAM | ★★★★☆ | **Recommended default.** Best quality/size ratio for code. Handles TypeScript, React, Express well. |
| `qwen2.5-coder:14b` | 10 GB GPU | ★★★★★ | Near cloud-model quality. Excellent for complex multi-entity apps. |
| `deepseek-coder-v2:16b` | 12 GB GPU | ★★★★★ | Near-Claude for code. Best available locally for large projects. |
| `codellama:13b` | 9 GB GPU | ★★★☆☆ | Older but still usable. Avoid if qwen is available. |
| `llama3.2:3b` | 3 GB GPU | ★★☆☆☆ | Insufficient for complex apps. Use only for testing. |

**Do not use:** `llama3.2` (general model, not code-optimized), `mistral:7b` (general), `phi3` (too small)

### Pull a model

```bash
ollama pull qwen2.5-coder:7b
ollama pull qwen2.5-coder:14b  # if you have 10GB+ VRAM
```

### Configure

```env
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_API_KEY=ollama
OPENAI_MODEL=qwen2.5-coder:7b
LOCAL_LLM_URL=http://localhost:11434
LOCAL_LLM_MODEL=qwen2.5-coder:7b
```

### LM Studio / Jan

```env
OPENAI_BASE_URL=http://localhost:1234/v1
OPENAI_API_KEY=lm-studio
OPENAI_MODEL=<model-name-as-shown-in-lm-studio>
```

### Cloud OpenAI (highest quality, has API cost)

```env
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
```

### SLM Context Size

If your model supports a larger context window:

```env
SLM_CONTEXT_SIZE=32768   # for models with 32k context
```

Higher context allows the SLM stages to see more of the pipeline's intermediate data, improving their suggestions.

---

## 21. Troubleshooting

### "SLM system initialized (no endpoint — rules-only mode)"

The SLM pipeline is not running. Check:
1. `OPENAI_BASE_URL` and `OPENAI_API_KEY` are set in `.env`
2. The AI server is running (`ollama serve` or LM Studio)
3. The model is pulled (`ollama list`)

### Generated code is empty or incomplete

1. Check `GET /api/ai/status` — is `local: true`?
2. Increase `SLM_CONTEXT_SIZE` (the prompt may be truncating)
3. Switch to a larger model
4. Check server logs for timeout errors (`[SLM Engine] timeout`)

### WebContainer preview shows a blank screen

1. Open browser DevTools → Console — look for CORS or module errors
2. Check that the generated `package.json` has the correct `scripts.dev` value
3. Run auto-fix: send a message like "fix the preview errors"
4. The API server must return `COOP: same-origin` and `COEP: require-corp` headers — check that the proxy is not stripping them

### Vite build fails in WebContainer

Common causes:
- Missing import — `auto-fix-engine.ts` should catch this automatically
- Tailwind v4 directive mismatch — validator corrects `@tailwind base` → `@import "tailwindcss"`
- Missing React import — validator adds `import React from 'react'` to `.tsx` files
- If auto-fix fails, try: `POST /api/conversations/:id/auto-fix` with the error messages

### Database errors on startup

If `DATABASE_URL` is set but the database is unavailable, the server falls back to in-memory storage with a warning. Set `DATABASE_URL=` (empty) to explicitly use in-memory mode.

### Pipeline hangs during generation

Each SLM call has a 30-second timeout by default. If the model is slow:
1. Check that Ollama is using GPU (`ollama ps` shows model + GPU layers)
2. Use a smaller model (7b instead of 14b)
3. Reduce `SLM_CONTEXT_SIZE`

### TypeScript errors in the codebase

Pre-existing TypeScript errors exist in several modules that use patterns incompatible with strict mode. The project uses `tsx` at runtime (which doesn't type-check) so these don't affect functionality. Run `pnpm run typecheck` to see current errors — errors in `codegen-page-builder.ts`, `component-composer.ts`, `deterministic-stages.ts`, and `generation-learning-engine.ts` are known and pre-existing.

---

*End of documentation. For the latest changes, see `CHANGELOG.md` (if present) or the git log.*
