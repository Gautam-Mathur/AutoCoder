# AutoCoder Critical Code-Quality Remediation Plan

**Repository:** `Gautam-Mathur/AutoCoder`  
**Basis:** Direct inspection of the current `main` branch implementation  
**Purpose:** Concrete remediation of the critical issues that materially limit generated-code quality.

> This document is intentionally implementation-oriented. It does not propose a generic "better agent framework". The solutions below are mapped to the actual AutoCoder runtime: `orchestrator.ts`, `agents.ts`, agent registry files, `inference.ts`, `vfs.ts`, `linter.ts`, SML, and the pipeline SSE route.

---

## 0. Target Architecture

The central problem is not simply model intelligence. The current pipeline removes too much information between agents and does not give the Coder a real engineering loop.

The target flow should be:

```text
User Request
    │
    ▼
Queen / Planner / Architects
    │
    ▼
Canonical Structured Project State
    │
    ├── Requirements
    ├── Architecture
    ├── API contracts
    ├── UI contracts
    ├── File graph
    ├── Symbols / exports
    ├── Dependencies
    └── Acceptance criteria
    │
    ▼
Blueprint
    │
    ▼
Coder Agent
    │
    ├── inspect files
    ├── read dependencies
    ├── create/update files
    ├── run static checks
    ├── run tests
    ├── run build
    └── inspect failures
    │
    ▼
Deterministic Verification
    │
    ├── TypeScript / parser
    ├── dependency resolution
    ├── build
    ├── tests
    ├── runtime checks
    └── security checks
    │
    ├── PASS ───────────────► Reviewer
    │
    └── FAIL
          │
          ▼
       Debugger
          │
          ▼
       Targeted Patch
          │
          ▼
       Re-run affected checks
          │
          └──────────────► PASS / bounded retry failure
```

### Non-negotiable design rule

**Structured state becomes canonical. Markdown becomes a human-readable projection.**

Do not continue expanding the current Markdown snapshot mechanism as the primary cross-agent state protocol.

---

# P0-1. Replace the Fake Tool Layer With a Real Engineering Tool Loop

## Current repository condition

`src/lib/agents/ruflo/agents.ts` defines `AgentDef.tools`, but every registered agent is currently created with:

```ts
tools: []
```

The Coder itself declares:

```ts
export const allowedTools: string[] = [];
```

The Coder prompt therefore asks the model to generate one complete file from a blueprint plus compact dependency summaries. It cannot actually inspect the workspace, execute commands, inspect compiler output, or iteratively modify its own work.

### Required solution

Introduce a real tool execution layer owned by the orchestrator.

Do **not** allow the LLM to execute arbitrary shell commands directly.

Use a controlled tool registry:

```ts
export type ToolContext = {
  conversationId: string;
  signal: AbortSignal;
};

export interface AgentTool {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  execute(
    input: unknown,
    context: ToolContext
  ): Promise<ToolResult>;
}
```

Minimum tools:

```text
workspace.listFiles
workspace.readFile
workspace.writeFile
workspace.applyPatch
workspace.deleteFile

analysis.inspectSymbols
analysis.inspectImports
analysis.findReferences

validation.typecheck
validation.lint
validation.build
validation.test
validation.security

project.inspectPackage
project.inspectConfig
```

### Important boundary

The model should request a tool call.

The orchestrator validates the request.

The tool executes with the current conversation/workspace scope.

The result is returned to the model.

The model continues.

This creates:

```text
LLM → tool request → orchestrator validation → tool → result → LLM
```

instead of:

```text
LLM → giant prompt → complete file
```

### Implementation locations

Primary:

```text
src/lib/agents/ruflo/agents.ts
src/lib/agents/ruflo/orchestrator.ts
src/lib/agents/ruflo/vfs.ts
src/lib/agents/inference.ts
```

Add a dedicated module:

```text
src/lib/agents/ruflo/tools/
```

with one module per tool category.

---

# P0-2. Turn Coder Into an Iterative Engineering Agent

## Current condition

`src/lib/agents/ruflo/registry/Coder.ts` explicitly defines the Coder as a one-file generator.

Its prompt requires:

- complete source code
- dependency interface summaries
- blueprint specification
- raw source output only

Its `allowedTools` array is empty.

This makes the model responsible for reconstructing project state from compressed context.

### Required solution

Replace the current Coder contract with an iterative task contract.

The Coder should receive:

```ts
type CodingTask = {
  targetFile: string;
  objective: string;
  requirements: RequirementRef[];
  architectureRefs: ArchitectureRef[];
  dependencyRefs: FileRef[];
  acceptanceCriteria: AcceptanceCriterion[];
};
```

The Coder loop should be:

```text
1. Read target file if it exists
2. Read direct dependencies
3. Inspect symbols/imports
4. Implement
5. Run local validation
6. Read failures
7. Patch
8. Re-run validation
9. Stop only when acceptance criteria pass
```

The final answer from the Coder can still be raw source when a source-file generation call is made, but the **agent itself must no longer be restricted to one inference producing the final file**.

---

# P0-3. Create a Canonical Structured Stage Contract

## Current condition

AutoCoder currently has multiple state representations:

- `StageLedger`
- Executive Memory
- Markdown stage outputs
- SML `validatedJson`
- VFS files
- typed-ish `AgentDef` schemas
- generated reports

The orchestrator's `buildStageContext()` retrieves Executive Memory rows and extracts a `"Context Snapshot"` from Markdown.

That is inherently lossy.

### Required solution

Create a canonical project state schema.

Suggested location:

```text
src/lib/agents/contracts/
  project-state.ts
  stage-output.ts
  requirements.ts
  architecture.ts
  blueprint.ts
  verification.ts
```

Example:

```ts
export interface ProjectState {
  version: 1;

  project: {
    name: string;
    goal: string;
    constraints: string[];
  };

  requirements: Requirement[];
  architecture: ArchitectureContract;
  backend: BackendContract;
  frontend: FrontendContract;

  files: FileContract[];
  modules: ModuleContract[];
  symbols: SymbolContract[];
  dependencies: DependencyContract[];

  acceptanceCriteria: AcceptanceCriterion[];

  decisions: DecisionRecord[];
}
```

Every stage should produce a typed structured delta:

```ts
interface StageResult<T> {
  stage: string;
  schemaVersion: number;
  status: 'success' | 'failure';
  output: T;
  references: StateReference[];
}
```

### Markdown policy

Markdown files such as:

```text
plan.md
requirements.md
architecture.md
backend_spec.md
ui_spec.md
blueprint.md
```

should remain useful artifacts for humans.

But downstream agents should not need to regex-extract critical state from them.

---

# P0-4. Enforce Agent Schemas at Runtime

## Current condition

`AgentDef` contains:

```ts
schema: any;
```

The Coder and Debugger define schemas containing a `content` field, but the runtime stores model output as:

```ts
validatedJson: { content: finalContent }
```

without establishing a strong schema-validation boundary.

The name `validatedJson` therefore overstates what the runtime has actually validated.

### Required solution

Use one schema library consistently.

Recommended contract:

```ts
interface AgentContract<T> {
  name: string;
  schemaVersion: number;
  outputSchema: JsonSchema;
  parseOutput(raw: string): T;
}
```

Pipeline:

```text
LLM response
    ↓
extract structured payload
    ↓
schema validation
    ↓
typed object
    ↓
canonical state update
```

Invalid output must be a pipeline failure, not silently wrapped as:

```ts
{ content: rawText }
```

For source-code-producing agents, distinguish:

```text
Structured agent output
```

from:

```text
Source artifact output
```

Do not pretend raw source is JSON.

---

# P0-5. Remove Lossy Markdown Snapshot Context From the Critical Path

## Current condition

`orchestrator.ts` contains:

```ts
const MAX_SNAPSHOT_CHARS = 2000;
```

`buildStageContext()` loads Executive Memory Markdown and extracts only the latest `"Context Snapshot"` for each upstream agent.

The snapshot is truncated at 2000 characters.

This means a later agent can receive only a small projection of decisions made earlier.

### Required solution

Replace:

```text
agent → Markdown → regex snapshot → 2000 chars → next agent
```

with:

```text
agent → structured output → ProjectState → context resolver
```

The context resolver should select information by task relevance.

For Coder:

```text
Target file
+
Direct imports
+
Direct consumers
+
Required interfaces
+
Relevant architecture rules
+
Relevant requirements
+
Acceptance criteria
+
Relevant security constraints
```

Do not dump the entire project into the prompt.

Do not truncate blindly.

Use semantic dependency traversal.

---

# P0-6. Replace Regex Dependency Interfaces With Symbol-Aware Analysis

## Current condition

`extractDependencyInterface()` in `orchestrator.ts` derives dependency summaries using lightweight text/regex extraction.

This is insufficient for TypeScript/JavaScript projects because correctness depends on:

- imports
- exports
- function signatures
- types
- classes
- interfaces
- re-exports
- default exports
- aliases
- consumers
- module resolution

### Required solution

Use the TypeScript compiler API for TS/TSX/JS/JSX.

Build a project symbol index:

```ts
interface SymbolContract {
  file: string;
  name: string;
  kind: 'function' | 'class' | 'type' | 'interface' | 'const' | 'enum';
  exported: boolean;
  signature?: string;
  dependencies: string[];
}
```

Create:

```text
src/lib/agents/ruflo/analysis/
  project-index.ts
  symbols.ts
  imports.ts
  references.ts
```

The Coder should query:

```text
"Give me the contract for symbols imported by src/foo.ts"
```

instead of receiving a regex-generated summary.

---

# P0-7. Make Verification a Real Build → Test → Debug → Rebuild Loop

## Current condition

The current Tester is primarily deterministic lint/compiler infrastructure.

The Debugger prompt receives a source file plus syntax/compiler errors and returns a complete rewritten file.

That is not enough to establish that a generated application actually works.

### Required solution

Create a generated-project verification pipeline:

```text
Generate
 ↓
Install dependencies
 ↓
Typecheck
 ↓
Lint
 ↓
Build
 ↓
Run tests
 ↓
Run runtime smoke tests
 ↓
Security checks
 ↓
Aggregate VerificationReport
```

Suggested type:

```ts
interface VerificationReport {
  passed: boolean;

  typecheck: CheckResult;
  lint: CheckResult;
  build: CheckResult;
  tests: CheckResult;
  runtime: CheckResult;
  security: CheckResult;

  failures: Failure[];
}
```

The pipeline should not proceed to Reviewer until the mandatory checks pass.

---

# P0-8. Give Debugger Structured Failures Instead of "Rewrite This File"

## Current condition

`Debugger.ts` asks the model to return the entire corrected file.

This creates two major risks:

1. A repair can fix one compiler error while silently breaking another part of the file.
2. Large rewrites make regression detection difficult.

### Required solution

Debugger should receive structured failures:

```ts
interface Failure {
  id: string;
  category:
    | 'syntax'
    | 'type'
    | 'import'
    | 'build'
    | 'test'
    | 'runtime'
    | 'security';

  file: string;
  line?: number;
  column?: number;
  symbol?: string;
  message: string;
  evidence?: string;
}
```

Then request a targeted patch:

```ts
interface CodePatch {
  file: string;
  expectedHash: string;
  startLine: number;
  endLine: number;
  replacement: string;
  reason: string;
}
```

Before applying:

```text
current file hash === expectedHash
```

If not, reject the patch and re-read the file.

This prevents stale repair operations.

---

# P0-9. Add Regression Verification After Every Repair

A Debugger repair cannot be considered successful merely because the original error disappeared.

Required flow:

```text
Failure F1
 ↓
Debugger patch
 ↓
Apply patch
 ↓
Run affected check
 ↓
Run dependent checks
 ↓
Run regression suite
 ↓
PASS → continue
FAIL → new repair cycle
```

For example:

```text
src/api/users.ts
      ↓
typecheck
      ↓
tests/users
      ↓
integration/API smoke test
```

A patch that changes an API contract must invalidate and re-run dependent consumers.

---

# P0-10. Introduce Requirement → Code → Test Traceability

## Current condition

The current architecture carries requirements through multiple documents, but there is no strong runtime mechanism ensuring every requirement becomes verifiable behavior.

### Required solution

Assign stable IDs:

```text
REQ-001
REQ-002
REQ-003
```

Map them to:

```text
REQ-001
  ├── Feature
  ├── API / UI behavior
  ├── Files
  └── Acceptance tests
```

Example:

```ts
interface RequirementTrace {
  requirementId: string;
  files: string[];
  symbols: string[];
  tests: string[];
  status: 'unimplemented' | 'implemented' | 'verified' | 'failed';
}
```

Reviewer should reject a project with required behavior that has no verification path.

---

# P0-11. Make Reviewer a Quality Gate, Not a Report Generator

## Current condition

Reviewer receives a large project context and produces a review artifact.

A review document alone does not improve generated code.

### Required solution

Reviewer output must be machine-readable:

```ts
interface ReviewResult {
  status: 'PASS' | 'REPAIR_REQUIRED';
  findings: ReviewFinding[];
}

interface ReviewFinding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category:
    | 'requirements'
    | 'architecture'
    | 'correctness'
    | 'maintainability'
    | 'security'
    | 'performance';

  file?: string;
  symbol?: string;
  description: string;
  acceptanceCriterion?: string;
}
```

Pipeline:

```text
Reviewer
   │
   ├── PASS → complete
   │
   └── REPAIR_REQUIRED
          ↓
       Debugger/Coder
          ↓
       Verification
          ↓
       Reviewer again
```

Use a bounded number of repair/review cycles.

---

# P0-12. Replace Subjective Quality Scores With Deterministic Gates

Do not use an LLM-generated "quality score" as the primary completion criterion.

Define objective gates.

Example:

```text
Requirements: 100% mandatory
Typecheck: PASS
Build: PASS
Mandatory tests: PASS
Runtime smoke tests: PASS
Critical security findings: 0
Broken imports: 0
Unresolved symbols: 0
Placeholder/TODO checks: 0
Acceptance criteria: 100%
Reviewer critical findings: 0
```

Then:

```ts
const completed =
  report.requirements.allSatisfied &&
  report.typecheck.passed &&
  report.build.passed &&
  report.tests.passed &&
  report.runtime.passed &&
  report.security.critical === 0 &&
  report.reviewer.critical === 0;
```

The LLM reviewer can provide judgment.

It cannot override deterministic failures.

---

# P0-13. Make Model Selection Explicit and Observable

## Current condition

`InferenceOptions` does not expose a model field.

`getLLMConfig()` selects a global provider/model configuration.

For Ollama, if the configured model is missing, the implementation falls back to the first installed model.

That makes model comparisons unreliable.

### Required solution

Extend:

```ts
interface InferenceOptions {
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
  format?: 'json' | 'text';
  maxTokens?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  onChunk?: (text: string) => void;
}
```

Agent definitions should optionally specify model strategy:

```ts
interface AgentDef {
  ...
  model?: string;
}
```

Or use a central strategy:

```ts
interface ModelPolicy {
  planner: ModelSelection;
  coder: ModelSelection;
  debugger: ModelSelection;
  reviewer: ModelSelection;
}
```

Every inference must record:

```text
provider
model requested
model actually used
temperature
token usage
prompt/context version
schema version
attempt
```

Never silently substitute a model without recording it.

---

# P0-14. Make the Pipeline State Machine Authoritative

## Current condition

Pipeline state is distributed across:

- in-memory `activePipelines`
- `pipelineAbortControllers`
- conversation DB status
- execution history
- Executive Memory
- VFS

This makes recovery and concurrency difficult.

### Required solution

Persist the pipeline state machine.

Suggested states:

```text
QUEUED
RUNNING
VERIFYING
REPAIRING
REVIEWING
PAUSED
COMPLETED
FAILED
CANCELLED
```

Store:

```ts
interface PipelineRun {
  id: string;
  conversationId: string;
  state: PipelineState;
  currentStage: string;
  attempt: number;
  version: number;
  leaseOwner?: string;
  leaseExpiresAt?: Date;
}
```

In-memory maps may remain as caches.

They must not be the authoritative ownership mechanism.

---

# P0-15. Fix Pipeline Duplicate Launching and SSE Event Duplication

## Current condition

`src/app/api/pipeline/stream/route.ts`:

1. replays history
2. attaches a live listener
3. checks `activePipelines`
4. may start `runOrchestrator`

It also passes a direct callback into `runOrchestrator` while the orchestrator itself uses `pipelineEvents`.

This creates a risk of duplicate live events.

`activePipelines` is an in-process `Set`, so it is not sufficient for multiple Node processes/instances.

### Required solution

Separate these responsibilities:

```text
Orchestrator
    ↓
Persist event
    ↓
Publish event
    ↓
SSE subscriber
```

Do not send an event through both:

```text
direct callback
```

and:

```text
EventEmitter
```

Use one event publication path.

For launch ownership, use a persisted lease/transaction rather than only:

```ts
activePipelines.has(conversationId)
```

If the application remains strictly single-process, an in-process lock can prevent the immediate race. But the data model should still be designed around persisted ownership.

---

# P0-16. Implement Real SSE Replay/Resume

## Current condition

The SSE route replays database history but does not provide a proper event cursor.

### Required solution

Every event gets a durable monotonically increasing ID:

```text
conversationId + sequence
```

SSE:

```text
id: 184
event: AGENT_LOG
data: {...}
```

Client reconnect:

```http
Last-Event-ID: 184
```

Server:

```text
load events where sequence > 184
→ replay
→ subscribe to future events
```

Do not use a per-connection counter.

---

# P0-17. Make Abort Actually Stop Work

## Current condition

`abortPipelineExecution()` aborts an `AbortController`, but the pipeline also starts the background orchestrator detached from the browser request.

The cancellation boundary therefore depends on downstream code correctly honoring the signal.

### Required solution

Every long-running operation must receive the same pipeline signal:

```text
Pipeline signal
 ├── inference
 ├── tool execution
 ├── build
 ├── tests
 ├── security
 ├── filesystem operations
 └── repair loop
```

Check:

```ts
if (signal.aborted) {
  throw new PipelineCancelledError();
}
```

before and after expensive operations.

Cancellation must transition persistent state to:

```text
CANCELLED
```

rather than merely deleting the controller from memory.

---

# P0-18. Fix VFS Locking Before Building Tool-Based Editing

## Current condition

`vfs.ts` uses:

```ts
const fileLocks = new Map<string, Promise<void>>();
```

The lock cleanup compares the stored chained promise with `newLock`:

```ts
if (fileLocks.get(lockKey) === newLock)
```

but the map stores:

```ts
currentLock.then(() => newLock)
```

Therefore the cleanup identity does not match the stored value.

### Required solution

Use a queue object with explicit ownership:

```ts
interface FileLock {
  tail: Promise<void>;
}
```

Or implement a standard promise-chain mutex and delete only when the chain currently belongs to that lock generation.

Add tests for:

```text
parallel write/write
parallel read-modify-write
write + patch
patch + patch
failure during lock
cancellation during lock
```

---

# P0-19. Make `applyDiff()` Keep VFS and Physical Disk Consistent

## Current condition

`applyDiff()` updates the database VFS record but does not perform the same immediate physical disk synchronization performed by `writeVirtualFile()`.

This can create:

```text
DB/VFS = version A
disk    = version B
```

### Required solution

Choose one authoritative workspace store.

Recommended:

```text
Database VFS = canonical
Disk = materialized projection
```

After a successful VFS transaction:

```text
DB commit
 ↓
materialize changed file
 ↓
record materialization status
```

Do not silently swallow materialization failures.

Track:

```ts
materializationStatus:
  | 'synced'
  | 'pending'
  | 'failed';
```

---

# P0-20. Fix VFS Path Validation Without Breaking Legitimate Dotfiles

## Current condition

`sanitizePath()` rejects:

```ts
cleanPath.startsWith('.')
```

This blocks legitimate files such as:

```text
.env
.gitignore
.eslintrc
.prettierrc
```

### Required solution

Reject:

- absolute paths
- Windows drive paths
- traversal segments
- normalized paths escaping workspace

Allow legitimate dotfiles.

Use:

```ts
function sanitizePath(input: string): string {
  const normalized = path.posix.normalize(
    input.replace(/\\/g, '/')
  );

  if (
    normalized === '.' ||
    normalized.startsWith('/') ||
    normalized.split('/').includes('..')
  ) {
    throw new Error('Unsafe workspace path');
  }

  return normalized;
}
```

Also resolve the final physical path and verify it remains under the project root before writing.

---

# P0-21. Replace the Current Linter's Blanket Module Suppression

## Current condition

`linter.ts` suppresses several diagnostics for JS/JSX, including module-resolution errors.

A blanket suppression approach is dangerous because it can hide real local import failures.

### Required solution

Classify imports.

For:

```text
./local
../local
@/local
workspace aliases
```

missing modules must remain errors.

For external packages:

```text
react
express
zod
```

resolution depends on the generated project's dependency installation.

The validator should therefore run in a generated-project environment where dependencies actually exist.

Do not turn genuine missing local modules into warnings just to make the linter green.

---

# P0-22. Add Full Generated-Project Build Verification

## Current condition

The repository has a `build` script for AutoCoder itself, but generated projects are not yet treated as independently buildable artifacts inside the generation loop.

### Required solution

For every generated project:

```text
1. Detect package manager
2. Create isolated project workspace
3. Install dependencies normally
4. Validate package.json
5. Typecheck
6. Lint
7. Build
8. Run tests
9. Run smoke test
```

Do not use:

```bash
npm install --production
```

before a build that requires devDependencies.

Use the normal dependency installation for the isolated generation environment.

---

# P0-23. Add Runtime Smoke Tests

Static correctness is not behavioral correctness.

At minimum, generated applications should support configurable smoke checks.

Examples:

### Web

```text
start application
↓
GET /
↓
expected 200
↓
verify required DOM/content marker
```

### API

```text
start server
↓
GET health endpoint
↓
POST representative resource
↓
GET resource
↓
assert expected response
```

### CLI

```text
execute command
↓
representative input
↓
assert exit code
↓
assert output
```

The blueprint should define the smoke-test strategy.

---

# P0-24. Add Security Verification as a Deterministic Gate

Security should not be merely another LLM report.

At minimum:

```text
dependency audit
secret scan
unsafe path scan
dangerous command scan
hardcoded credential scan
insecure configuration scan
```

For web applications:

```text
XSS-sensitive sinks
unsafe eval
dangerous HTML injection
missing server-side validation
```

The Security agent can interpret findings, but deterministic scanners should produce the baseline.

---

# P0-25. Stop Full-File Debugger Rewrites From Becoming Silent Regressions

If full-file replacement is retained temporarily, require:

```text
old file hash
+
new file hash
+
original failure IDs
+
post-repair verification
```

Longer term, migrate Debugger to patch-based edits through `applyDiff()` or a structured patch tool.

The important invariant:

```text
A repair must be explainable as a bounded change.
```

---

# P0-26. Add an Objective Generation Benchmark

Model swapping currently gives surprisingly similar results because the architecture constrains the model heavily.

Build a fixed benchmark suite:

```text
benchmarks/
  todo-crud/
  dashboard/
  auth-api/
  ecommerce/
  rag-app/
  static-site/
```

For every benchmark record:

```text
model
prompt
context version
pipeline version
generation time
tokens
typecheck
build
tests
runtime
security
review findings
repair count
final success
```

The primary metric should be:

```text
Verified Project Success Rate
```

not subjective code quality.

---

# P0-27. Add Structured Telemetry Linking Model Decisions to Failures

Current telemetry exists, but it should become useful for engineering diagnosis.

Every stage execution should have:

```ts
interface InferenceTrace {
  runId: string;
  stageId: string;
  agent: string;

  provider: string;
  requestedModel: string;
  resolvedModel: string;

  promptHash: string;
  contextHash: string;
  schemaVersion: number;

  inputTokens?: number;
  outputTokens?: number;

  durationMs: number;
  attempt: number;

  outputStatus: 'valid' | 'invalid';
}
```

Every verification failure should reference the stage/run that produced the offending artifact.

Then you can answer:

```text
Which model?
Which prompt?
Which context?
Which file?
Which requirement?
Which failure?
Which repair?
Did the repair regress another requirement?
```

Without this, model comparisons remain mostly anecdotal.

---

# P0-28. Establish the Definition of Done in Code

Create one central evaluator:

```text
src/lib/agents/verification/definition-of-done.ts
```

Example:

```ts
export function evaluateCompletion(
  report: VerificationReport,
  trace: RequirementTrace[]
): CompletionDecision {
  ...
}
```

No agent should independently decide that generation is complete.

The pipeline should finish only when the deterministic completion contract says:

```text
PASS
```

---

# Recommended Implementation Order

Do not implement these randomly. The dependencies matter.

## Phase 1: Establish correctness boundaries

```text
1. Canonical ProjectState
2. Typed AgentResult contracts
3. Runtime schema validation
4. Pipeline state machine
5. VFS locking fix
6. VFS path fix
7. VFS/disk consistency
```

## Phase 2: Build the engineering loop

```text
8. Tool registry
9. workspace read/write/patch tools
10. compiler/typecheck tool
11. build tool
12. test tool
13. runtime smoke-test tool
14. security tool
15. Coder tool loop
```

## Phase 3: Replace lossy context

```text
16. Project symbol index
17. Import/reference graph
18. Requirement traceability
19. semantic context resolver
20. remove Markdown snapshots from critical runtime context
```

## Phase 4: Close the repair loop

```text
21. Structured Failure model
22. Debugger patch contract
23. targeted repair
24. regression verification
25. Reviewer machine-readable gate
26. bounded review → repair → verify loop
```

## Phase 5: Make the system measurable

```text
27. model selection
28. resolved-model telemetry
29. inference traces
30. benchmark suite
31. generation success metrics
32. failure clustering
```

## Phase 6: Fix pipeline delivery

```text
33. persisted pipeline ownership
34. single event publication path
35. durable SSE event IDs
36. Last-Event-ID replay
37. cancellation propagation
38. crash recovery
```

---

# Files That Should Be Modified First

| Priority | File | Primary change |
|---|---|---|
| P0 | `src/lib/agents/ruflo/orchestrator.ts` | Replace snapshot-centric orchestration with canonical state + tool/verification loop |
| P0 | `src/lib/agents/ruflo/agents.ts` | Typed contracts, real tool declarations, schema enforcement |
| P0 | `src/lib/agents/ruflo/registry/Coder.ts` | Convert from one-shot file generator to tool-using engineering agent |
| P0 | `src/lib/agents/ruflo/registry/Debugger.ts` | Structured failure input + targeted patch output |
| P0 | `src/lib/agents/ruflo/vfs.ts` | Fix locking, path validation, patch persistence, materialization |
| P0 | `src/lib/agents/ruflo/linter.ts` | Correct module resolution and strict verification |
| P0 | `src/lib/agents/inference.ts` | Explicit model selection + resolved-model telemetry |
| P0 | `src/lib/agents/sml.ts` | Typed structured persistence and transactional output/index writes |
| P0 | `src/app/api/pipeline/stream/route.ts` | Single event path, launch ownership, SSE cursor/replay |
| P0 | New `src/lib/agents/contracts/` | Canonical project/stage/failure/verification contracts |
| P0 | New `src/lib/agents/ruflo/tools/` | Controlled engineering tool layer |
| P0 | New `src/lib/agents/verification/` | Build/test/runtime/security/definition-of-done system |
| P1 | New `src/lib/agents/ruflo/analysis/` | Symbol/import/reference graph |

---

# Acceptance Criteria

The remediation should not be considered complete because the code compiles.

AutoCoder should pass these tests:

## Agent capability

- Coder can inspect an existing file.
- Coder can inspect direct dependencies.
- Coder can create a file.
- Coder can patch an existing file.
- Coder can run validation.
- Coder can react to validation failures.

## State integrity

- Every stage produces schema-valid structured output.
- Canonical project state can reconstruct required downstream context.
- No critical downstream decision depends on a 2000-character Markdown snapshot.
- Markdown is a projection, not the authoritative state.

## Generated-code correctness

- Missing imports fail verification.
- Broken exports fail verification.
- Type errors fail verification.
- Build errors fail verification.
- Required behavior without tests fails verification.
- Runtime smoke-test failures fail verification.
- Critical security findings fail verification.

## Repair correctness

- Debugger receives structured failures.
- Repairs are targeted.
- Stale patches are rejected.
- Every repair triggers regression verification.
- Repeated repair failure terminates with a structured failure rather than infinite looping.

## Model evaluation

- Requested and resolved model are both recorded.
- Benchmark runs are reproducible.
- Different models can be compared on verified outcomes.
- Context/prompt changes are versioned.

## Pipeline reliability

- Two simultaneous requests cannot launch two owners for the same pipeline.
- Browser reconnect does not lose events.
- Browser disconnect does not kill a background generation.
- Explicit cancellation stops active work.
- A crashed worker leaves recoverable persistent state.

---

# Final Architectural Principle

The highest-quality output will not come from endlessly replacing:

```text
Model A → Model B → Model C
```

while leaving the surrounding system unchanged.

The current repository makes the model operate under severe information and action constraints:

```text
compressed Markdown context
+
regex dependency summaries
+
one-shot file generation
+
no tools
+
weak schema enforcement
+
linter-centric verification
+
full-file repair
+
no mandatory behavioral verification
```

The correct upgrade is therefore:

```text
better state
+
better context retrieval
+
real tools
+
semantic project analysis
+
deterministic verification
+
targeted repair
+
regression testing
+
objective completion gates
```

Only after those boundaries are in place does changing the underlying model become a meaningful experiment.
