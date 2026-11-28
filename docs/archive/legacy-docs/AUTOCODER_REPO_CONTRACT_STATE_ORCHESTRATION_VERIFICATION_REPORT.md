# AutoCoder Repository Review
## Contracts, State, Orchestration, and Verification

### Scope

This report is based on the current `main` branch of `Gautam-Mathur/AutoCoder` and focuses only on repository-level issues in:

- Contracts
- State and persistence
- Orchestration
- Verification and recovery

This is a code-level review, not a repetition of the prompt audit.

---

# 1. Executive Assessment

- [ ] The repository contains several competing representations of stage state rather than one canonical contract.
- [ ] `AgentDef` remains weakly typed at the core of the pipeline (`schema: any`, `getContext?: (ledger: any, ...)`).
- [ ] Stage outputs are represented simultaneously through dedicated stage tables, `AgentOutput`, `ExecutiveMemory`, VFS files, graph nodes, and in-memory `MemoryState`.
- [ ] The system therefore has multiple possible sources of truth for the same stage.
- [ ] The orchestrator contains explicit context-reduction logic that can discard most of an upstream stage and replace it with a 2,000-character snapshot.
- [ ] Typed stage context is only partial, and falls back to Markdown extraction when the dedicated table lookup does not produce data.
- [ ] Blueprinter is explicitly omitted from the generic upstream context map even though it depends on all prior semantic stages.
- [ ] Invalidation and recomputation are implemented as stage-name heuristics rather than dependency-graph evaluation.
- [ ] Verification is still primarily compiler/linter oriented even though tool support now exists for tests and builds.
- [ ] Recovery is routed through string-pattern classification rather than a typed failure contract.
- [ ] Several lifecycle/status systems can disagree because updates are spread across database rows, in-memory sets/maps, stage-memory rows, and event streams.
- [ ] The repository has useful architectural building blocks, but they are not yet composed into one authoritative execution model.

---

# 2. Contract Layer

## 2.1 Core Agent Contract Is Too Weak

Source: `src/lib/agents/ruflo/agents.ts`

- [ ] `AgentDef.schema` is typed as `any`.
- [ ] `AgentDef.getContext` is typed against `any` ledger state.
- [ ] `AgentDef.tools` is only `string[]`, so tool capabilities are not structurally tied to tool definitions.
- [ ] `AgentDef.model` is optional and not enforced as an executable per-agent inference contract.
- [ ] The registry therefore permits agents to advertise capabilities without a strongly typed contract connecting prompt, schema, context, tools, model, and execution behavior.

Evidence: the agent registry defines `schema: any`, `getContext?: (ledger: any, targetFile?: string) => Promise<string>`, and string-based tool lists. The same file assigns tools only to Coder and Debugger. 

## 2.2 Multiple Stage Output Models Exist

The repository stores stage information in:

- [ ] Dedicated stage tables such as `QueenStageOutput`, `PlannerStageOutput`, `ArchitectStageOutput`, `SystemStageOutput`, `DesignerStageOutput`, `BlueprinterStageOutput`, `TesterStageOutput`, `DebuggerStageOutput`, `ReviewerStageOutput`, and `SecurityStageOutput`.
- [ ] Generic `AgentOutput.validatedJson`.
- [ ] `ExecutiveMemory.contentMd`.
- [ ] `GraphNode.payload`.
- [ ] VFS files such as `plan.md`, `requirements.md`, `architecture.md`, `backend_spec.md`, `ui_spec.md`, `blueprint.md`, etc.
- [ ] In-memory `MemoryState`.

This is not merely redundancy. Different code paths can prefer different representations.

## 2.3 Dedicated Stage Tables Are Not Canonical Typed Contracts

Source: `src/lib/agents/ruflo/persistence.ts`

- [ ] `StagePersistence.persistStageOutput()` accepts `data: any`.
- [ ] Stage fields are extracted using permissive fallback expressions such as `safeData.projectName || safeData.project?.name || 'Project'`.
- [ ] Many structured values are re-serialized into JSON strings instead of being represented as nested typed records.
- [ ] Version/status are accepted from arbitrary `metadata` or arbitrary input and defaulted silently.
- [ ] Persistence can therefore normalize different shapes into the same table without proving semantic compatibility.

## 2.4 Generic Agent Output Is Structured, but Only After Runtime Acceptance

Source: `src/lib/agents/sml.ts`

- [ ] `WriteAgentOutputParams.validatedJson` is a `Record<string, any>`.
- [ ] `schemaVersion` is stored as a string but there is no visible compile-time relation between the schema and the payload.
- [ ] Top-level indexing creates `AgentIndex` entries from arbitrary JSON keys.
- [ ] `queryAgentOutput()` reconstructs data from stringified values rather than querying typed semantic fields.
- [ ] `getVocabulary()` currently returns an empty array, making the semantic indexing layer incomplete.

## 2.5 No Strong Cross-Stage Contract Identity

- [ ] A stage record has a version, sequence, inference ID, hash, and dedicated output row, but there is no single contract identity that every downstream artifact must reference.
- [ ] `consumedIds` exist inside ExecutiveMemory, while other structures use `stageOutputId`, `conversationId`, or graph node IDs.
- [ ] The repository therefore has several correlation identifiers rather than one canonical contract lineage.

---

# 3. State and Persistence

## 3.1 `MemoryState` Is a Second State Machine

Source: `src/lib/agents/ruflo/memory.ts`

- [ ] `MemoryState` contains the entire pipeline state again: taskSpec, planner, architect, system, designer, blueprinter, coder, debugger, security, reviewer, tester.
- [ ] It also contains invalidation state, file hashes/history, decisions, and quality-gate override.
- [ ] Most stage payloads are `any`.
- [ ] `saveExecutiveMemory()` is explicitly a no-op for legacy compatibility.
- [ ] Actual writes occur elsewhere through `writeExecutiveMemoryRecord()`.
- [ ] This makes `MemoryState` a materialized view rather than an authoritative persistence model, but the code still treats it as an operational state object.

## 3.2 In-Memory and Database State Can Diverge

Source: `memory.ts`

- [ ] `conversationNodeCache` is an in-memory cache keyed by conversation ID.
- [ ] `activePipelines` and `pipelineAbortControllers` are also in-memory structures in the orchestrator.
- [ ] Database state lives independently in `Conversation`, `PipelineRun`, `ExecutiveMemory`, `StageExecutionLog`, and stage-output tables.
- [ ] Process restart can therefore discard operational state that still exists in the database.
- [ ] Multiple app instances would not share the in-memory pipeline/lock state.

## 3.3 Executive Memory Lifecycle Has Weak Atomicity

Source: `writeExecutiveMemoryRecord()`

- [ ] Existing ACTIVE/INVALIDATED rows are first updated to `SUPERSEDED`.
- [ ] A sequence is then discovered with a separate `findFirst()`.
- [ ] A new row is then created in a separate operation.
- [ ] There is no visible transaction around the supersede + sequence allocation + create sequence.
- [ ] Concurrent writes for the same conversation/agent can therefore race before the database unique constraint rejects one of them.
- [ ] Failure after superseding old state but before creating new state can leave the logical lifecycle in an incomplete state.

## 3.4 Invalidation Is Coarse

Source: `handleUpstreamModification()`

- [ ] Invalidation is hard-coded by stage name.
- [ ] Queen invalidates Planner, Architect, System, Designer, Tester.
- [ ] Planner invalidates Architect, System, Designer, Tester.
- [ ] Architect invalidates System, Designer, Tester.
- [ ] System invalidates Designer, Tester.
- [ ] Designer invalidates Blueprinter, Coder, Tester.
- [ ] Blueprinter is absent from the invalidation rules.
- [ ] Security and Reviewer are not represented in the invalidation mapping.
- [ ] The mapping therefore does not describe the full semantic dependency graph.
- [ ] A stage may depend on another stage without being invalidated when that upstream stage changes.

## 3.5 Invalidation Does Not Directly Guarantee Rebuild

- [ ] `handleUpstreamModification()` marks stages INVALIDATED and deletes the in-memory node cache.
- [ ] It does not itself establish a durable recomputation plan for the affected graph.
- [ ] Invalidated stages can therefore exist without an explicit ordered rebuild set or dependency closure.

## 3.6 Stage Status Has Multiple Interpretations

The schema and code use values such as:

- [ ] `ACTIVE`
- [ ] `SUPERSEDED`
- [ ] `INVALIDATED`
- [ ] `COMPLETED`
- [ ] `FAILED`
- [ ] `CANCELLED`
- [ ] `PAUSED`
- [ ] `RUNNING`
- [ ] `RETRYING`
- [ ] `Triage`

- [ ] There is no single repository-wide typed enum representing stage lifecycle.
- [ ] `Conversation.status`, `PipelineRun.state`, `ExecutiveMemory.status`, `ExecutionHistory.status`, and `StageExecutionLog.status` can describe different states simultaneously.
- [ ] The repository lacks one authoritative state transition model.

## 3.7 Quality Gate Override Is Persisted as a Simple Boolean

- [ ] `Conversation.qualityGateOverride` is a boolean.
- [ ] `MemoryState.qualityGateOverride` is also a boolean.
- [ ] There is no visible reason, actor, timestamp, scope, or expiry associated with the override.
- [ ] A gate override therefore lacks an auditable contract.

---

# 4. Context Assembly

## 4.1 Context Is Lossy by Design

Source: `orchestrator.ts`

- [ ] `MAX_SNAPSHOT_CHARS` is set to 2,000.
- [ ] Upstream content is reduced to a `Context Snapshot` section where possible.
- [ ] If absent, fuzzy matching or synthetic fallback is used.
- [ ] If all else fails, only the first 800 characters are preserved.
- [ ] This means context assembly is explicitly permitted to replace a full stage output with a small heuristic excerpt.

## 4.2 Typed Context Is Incomplete

- [ ] `getTypedStageContext()` only directly handles Queen, Planner, Architect, and System.
- [ ] Designer, Blueprinter, Security, Reviewer, and Tester do not receive equivalent typed stage context through this function.
- [ ] Those stages can therefore fall back to Markdown extraction or other handler-specific mechanisms.

## 4.3 Context Selection and State Representation Disagree

- [ ] `MemoryState` stores stage objects.
- [ ] In practice those objects are frequently `{ content: markdown }`.
- [ ] `StageLedger.query()` assumes an owned field contains queryable structured data.
- [ ] `token-budgeter.ts` explicitly notes that structured accesses can fail because ledger values may contain Markdown content.
- [ ] Therefore some code assumes structured stage objects while other code actually stores rendered documents.

## 4.4 Blueprint Has a Context Mapping Exception

Source: `UPSTREAM_AGENT_MAP`

- [ ] Blueprinter's upstream map is intentionally empty.
- [ ] The comment says the handler provides full VFS context directly.
- [ ] This creates a separate context-construction path for one of the most semantically sensitive stages.
- [ ] There is no guarantee that the handler-level context follows the same authority/selection rules as the generic stage-context path.

---

# 5. Orchestration

## 5.1 Tool Advertisement and Tool Execution Are Separate Concepts

Source: `agents.ts` and `toolbox.ts`

- [ ] Coder and Debugger receive string-based tool names.
- [ ] Actual tool implementations live in a separate registry.
- [ ] `AgentDef.tools` is not structurally linked to `ToolDefinition`.
- [ ] A typo or unsupported tool name can therefore exist in agent metadata without compile-time protection.

## 5.2 Tool Execution Is Available, but Agent Protocol Is Not Enforced Here

Source: `toolbox.ts`

- [ ] `read_file`, `write_file`, `apply_diff`, `check_syntax`, `typecheck`, `build_project`, `run_tests`, and `npm_install` exist.
- [ ] However, tool availability alone does not prove that the Coder follows an inspect → modify → validate → repair loop.
- [ ] The tool registry contains procedural capabilities, while the agent contract still treats tools as strings.
- [ ] The repository does not present a typed state machine tying tool calls to mandatory execution stages.

## 5.3 Shell Command Execution Is Generic String Execution

Source: `toolbox.ts`

- [ ] `runProjectCommand()` executes `sh -c command`.
- [ ] Commands include dynamically assembled package names for `npm_install`.
- [ ] Although this operates inside a project directory, the tool contract is still generic shell command execution rather than a narrowly typed command interface.
- [ ] The execution model is therefore broader than the semantic contract exposed to agents.

## 5.4 Pipeline Cancellation Is Process-Local

Source: `orchestrator.ts`

- [ ] Pipeline cancellation depends on an in-memory `AbortController` stored in `pipelineAbortControllers`.
- [ ] Cancellation state is also written to the database.
- [ ] The database records the requested state, but the actual abort signal is local process memory.
- [ ] A different process cannot directly access the controller.
- [ ] Process restart can leave an apparently active database execution with no local abort controller.

## 5.5 Active-Pipeline Locking Is Process-Local

- [ ] `activePipelines` is a global in-memory `Set`.
- [ ] It cannot provide a distributed single-run guarantee across multiple Node.js instances.
- [ ] The `PipelineRun` schema includes `leaseOwner` and `leaseExpiresAt`, but the shown orchestration path does not establish those fields as the authoritative distributed lock.

## 5.6 Event Transport Has More Than One Path

Source: `orchestrator.ts` comments and `pipelineEvents`

- [ ] The repository uses a global `EventEmitter`.
- [ ] The orchestrator also accepts a direct `PipelineEventCallback`.
- [ ] This creates two possible event-delivery mechanisms for the same execution.
- [ ] The architecture therefore risks duplicate or divergent event publication unless one path is explicitly canonical.

## 5.7 Recovery Routing Is Keyword-Based

Source: `eventDispatcher.ts`

- [ ] Failure classification is based on lower-cased substring checks such as `cannot find name`, `property does not exist`, `mismatched`, `slow query`, `eslint`, etc.
- [ ] This is a heuristic classifier rather than a typed failure protocol.
- [ ] Failure messages that omit expected phrases can fall into the generic `test_failure` route.
- [ ] Different root causes can collapse into the same specialist route.
- [ ] The `stage` parameter is accepted by `dispatchFailureEvent()` but not used to influence the routing logic.

## 5.8 All Recovery Routes Currently Converge on Debugger

- [ ] `dispatchFailureEvent()` returns `specialistAgent: 'Debugger'` for conflict, syntax, compilation, performance, quality, and default test failure.
- [ ] There is therefore no actual specialist routing diversity in the current dispatcher.
- [ ] The dispatcher is primarily classifying labels, not routing to different domain handlers.

## 5.9 Specialist Recovery Has a Narrow Patch Contract

- [ ] Specialist recovery receives only `errorLog`, `failedFile`, and `currentCode`.
- [ ] It does not receive a typed requirement ID, acceptance test ID, violated invariant, affected symbol set, or version/hash.
- [ ] The generated patch response is `{ file, patchCode }`.
- [ ] There is no explicit post-patch verification contract inside specialist recovery.
- [ ] On any exception, it returns the original `currentCode`.
- [ ] This can make “failed recovery” look structurally like a valid no-op patch unless callers inspect the surrounding status separately.

---

# 6. Verification

## 6.1 Static Validation Is Stronger Than Before, but Still Narrow

Source: `linter.ts`

- [ ] TypeScript diagnostics are collected with a custom compiler host.
- [ ] Virtual workspace files are loaded into memory.
- [ ] HTML/CSS/Prisma receive custom validation paths.
- [ ] The TypeScript compiler configuration uses `strict: false`.
- [ ] `allowJs: true`.
- [ ] `checkJs: true`.
- [ ] `skipLibCheck: true`.
- [ ] Static validation therefore remains deliberately permissive.

## 6.2 Verification Is File-Centric

- [ ] `runLinter()` accepts a single `filePath`.
- [ ] It does preload all virtual files for resolution, which helps cross-file type analysis.
- [ ] But the result is still attached to one target file.
- [ ] There is no demonstrated project-level verification result that aggregates all failure classes into one semantic quality state.

## 6.3 Build and Test Tools Exist but Are Not Unified into One Gate

Source: `toolbox.ts`

- [ ] `build_project` exists.
- [ ] `run_tests` exists.
- [ ] `typecheck` exists.
- [ ] `check_syntax` exists.
- [ ] These are separate tools returning generic `{ success, ... }` structures.
- [ ] There is no single verification contract shown here that unifies static, build, test, runtime, security, and acceptance evidence.

## 6.4 Tool Result Semantics Are Generic

- [ ] `runProjectCommand()` converts all failures into generic success/exitCode/stdout/stderr shapes.
- [ ] No result object identifies the violated requirement or acceptance criterion.
- [ ] No result identifies the affected symbol in the generic command path.
- [ ] No result encodes severity or blocking status.
- [ ] Downstream consumers therefore have to infer meaning from command output.

## 6.5 The Repository Still Lacks a Canonical Failure Object

The existing recovery contract uses:

- [ ] raw logs
- [ ] failed file
- [ ] current code
- [ ] string-based failure classification

It does not provide a repository-wide typed object containing:

- [ ] failure ID
- [ ] failure type
- [ ] severity
- [ ] requirement IDs
- [ ] acceptance-test IDs
- [ ] expected result
- [ ] actual result
- [ ] reproduction
- [ ] evidence
- [ ] affected files
- [ ] affected symbols
- [ ] violated invariants
- [ ] repository/version identity

## 6.6 Verification Evidence Is Not Tied to Version Identity

- [ ] VFS content and ExecutiveMemory content have hashes.
- [ ] However, verification results do not visibly require the tested repository state hash.
- [ ] A test result can therefore be stored without a strong immutable reference to exactly which project state produced it.
- [ ] This matters for repairs, retries, and concurrency.

---

# 7. Repository-Level Contract Failures

## 7.1 Canonical Source of Truth Is Missing

- [ ] Dedicated stage tables
- [ ] Generic AgentOutput
- [ ] ExecutiveMemory
- [ ] GraphNode
- [ ] VFS
- [ ] MemoryState

all coexist.

**Primary risk:**

- [ ] Different components can read different representations of the “same” stage.
- [ ] A fix applied to one representation may not update every other representation.
- [ ] Context assembly can therefore consume stale or lossy state.

## 7.2 Contract Versioning Is Superficial

- [ ] `schemaVersion`, `version`, and various metadata fields exist.
- [ ] But there is no strong repository-wide rule that says which version applies to which semantic contract and what consumers accept.
- [ ] Version fields are often copied from arbitrary input or defaulted.

## 7.3 Authority Is Not Enforced by Data Model

- [ ] The database can store outputs and relationships.
- [ ] It does not encode immutable authority classes such as USER_MANDATORY, USER_PREFERENCE, VALIDATED_CONTRACT, RECOMMENDATION, INFERENCE, or LOCAL_IMPLEMENTATION.
- [ ] Authority therefore remains primarily prompt/inference behavior rather than persistent state semantics.

---

# 8. State-Correctness Risks

## 8.1 Latest-Row Semantics Are Used Heavily

- [ ] `loadExecutiveMemory()` selects the latest ACTIVE row per agent.
- [ ] `buildStageContext()` similarly selects the latest row.
- [ ] This makes “latest ACTIVE” the operational meaning of truth.
- [ ] It does not inherently prove that the row is the correct version for the current downstream execution attempt.

## 8.2 Historical State Is Preserved, but Causal Lineage Is Incomplete

- [ ] ExecutiveMemory keeps sequence, inference ID, consumed IDs, status, and hashes.
- [ ] Graph structures also exist.
- [ ] However, a full causal contract from a specific output to every exact upstream dependency is not enforced by the main stage interface.

## 8.3 Decision Logging Is Not Persisted

Source: `StageLedger.logDecision()`

- [ ] The function only writes to `console.log`.
- [ ] `MemoryState.decisions` exists, but the shown `loadExecutiveMemory()` initializes it to `[]`.
- [ ] Decision history is therefore not a durable part of the operational state in this path.

---

# 9. Orchestration-Level Correctness Risks

## 9.1 Stage Dependency Definitions Are Duplicated

- [ ] `UPSTREAM_AGENT_MAP`
- [ ] `handleUpstreamModification()`
- [ ] `OWNERSHIP`
- [ ] graph relationships
- [ ] dedicated persistence tables

all encode some aspect of stage relationships.

- [ ] These structures can drift apart.
- [ ] There is no single dependency declaration from which all other views are derived.

## 9.2 Stage Execution Model Is Not a Single Typed State Machine

- [ ] Agent definitions
- [ ] PipelineRun
- [ ] Conversation.status
- [ ] ExecutiveMemory.status
- [ ] StageExecutionLog.status
- [ ] ExecutionHistory.status
- [ ] activePipelines

all participate in lifecycle management.

- [ ] No single transition table or state machine enforces legal transitions between them.

## 9.3 Retry Semantics Are Not Clearly Unified

- [ ] PipelineRun has an `attempt` field.
- [ ] AgentOutput also records `attempt`.
- [ ] ExecutiveMemory increments sequence.
- [ ] Specialist recovery tracks its own attempt in telemetry.
- [ ] These counters do not visibly share one retry identity.

---

# 10. Verification-to-Repair Closure

- [ ] Static diagnostics can be produced.
- [ ] Build/test commands can be executed.
- [ ] Failure routing can occur.
- [ ] Debugger/SpecialistRecovery can produce patches.

But:

- [ ] There is no single closed-loop object connecting evidence → failure → repair → new state → re-verification.
- [ ] A repair can be written without a mandatory proof that the original failure disappeared.
- [ ] A repair can also be accepted without a structured proof that previously passing behavior remains passing.
- [ ] Reviewer/quality-gate logic cannot rely on one canonical verification ledger from the code paths shown.

---

# 11. Highest-Risk Issues

## P0

- [ ] Multiple competing state/contract representations can disagree about the authoritative stage output.
- [ ] Context reduction can discard upstream semantics and downstream code can operate on the reduced representation.
- [ ] Pipeline lifecycle is split across process-local memory and persistent database state.
- [ ] Recovery has no canonical typed failure contract and can converge all failure classes into the same Debugger route.
- [ ] Verification evidence is not tied strongly enough to immutable repository state for safe repair/retry semantics.

## P1

- [ ] Core agent contracts depend heavily on `any`.
- [ ] Stage invalidation is hard-coded rather than graph-derived.
- [ ] ExecutiveMemory supersede/sequence/create operations are not visibly atomic.
- [ ] Typed context coverage is incomplete and falls back to Markdown heuristics.
- [ ] Blueprinter uses a separate context path outside the generic dependency map.
- [ ] Tool capabilities are string-based rather than typed.
- [ ] Shell execution is broader than the typed tool contract.
- [ ] Static verification remains permissive.
- [ ] Build/test/typecheck results are generic rather than semantically linked to requirements.
- [ ] Decision logging is not durably persisted.
- [ ] Retry identity is fragmented across multiple counters/records.

## P2

- [ ] Status vocabulary is duplicated as strings across models.
- [ ] Quality-gate override lacks audit metadata.
- [ ] Generic top-level indexing does not provide a complete semantic query model.
- [ ] File-level verification results are not aggregated into a project-level evidence model.

---

# 12. Overall Conclusion

The repository has already accumulated many of the components needed for the next architecture:

- typed-ish stage storage
- ExecutiveMemory
- graph structures
- VFS
- hashes
- invalidation
- tool execution
- build/test tooling
- telemetry
- stage-specific persistence

The problem is that these are currently **parallel mechanisms**, not one coherent contract system.

The central repository-level defect is therefore:

> **AutoCoder has infrastructure for canonical state, but the runtime does not consistently treat that state as canonical.**

The resulting failure pattern is:

```text
Stage output
   ↓
dedicated stage table
   ↓
AgentOutput
   ↓
ExecutiveMemory
   ↓
Markdown projection
   ↓
snapshot extraction
   ↓
Ledger
   ↓
agent context
```

alongside:

```text
GraphNode
VFS
in-memory MemoryState
activePipelines
pipelineAbortControllers
Conversation.status
PipelineRun.state
```

The architecture should converge toward one execution model:

```text
Agent
  ↓
Validated Typed Contract
  ↓
Canonical Stage State
  ↓
Dependency Graph
  ↓
Context Resolver
  ↓
Execution
  ↓
Evidence
  ↓
Typed Failure / Success Record
  ↓
Repair or Advance
  ↓
Re-verify
```

At present, the repository contains most of those nouns, but not yet one authoritative verb chain connecting them.
