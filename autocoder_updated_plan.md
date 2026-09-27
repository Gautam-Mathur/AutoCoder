# AutoCoder Architecture Fix: Markdown as Canonical State, ExecutiveMemory as Historical Memory

## 1. Objective

Simplify AutoCoder's state architecture by establishing a single source of truth for the **current project state** while preserving ExecutiveMemory (EM) as a useful long-term memory and audit system.

### Core rule

> **Agents read current Markdown/project artifacts. ExecutiveMemory remembers what happened.**

Markdown/VFS is the operational state used by the pipeline.

ExecutiveMemory is an append-only historical record that can later support retrieval, analytics, debugging, evaluation, rollback, explanations, and future memory/RAG systems.

EM must not compete with Markdown as a second source of truth.

---

# 2. Current Architectural Problem

The current implementation has several overlapping representations of project state:

- Dedicated stage-output tables
- `ExecutiveMemory.contentMd`
- Markdown artifacts in the VFS
- `StageLedger` / `MemoryState`
- `AgentOutput.validatedJson`
- Graph state
- Context Snapshot extraction/injection

The main problem is not that there is too much information.

The problem is that multiple systems can claim to represent the **current truth**.

For example, `orchestrator.ts` currently has `getTypedStageContext()` which can read dedicated stage tables and inject that content instead of the corresponding ExecutiveMemory snapshot. This creates competing representations of the same stage output.

Context Snapshot logic then creates another reduced representation of that state.

This produces a chain like:

```text
Stage output
   ├── dedicated DB table
   ├── ExecutiveMemory
   ├── Markdown artifact
   ├── MemoryState
   └── Context Snapshot
```

That is unnecessary complexity.

---

# 3. Target Architecture

The target architecture is:

```text
                        USER
                          |
                          v
                       QUEEN
                          |
                          v
                       plan.md
                          |
                          v
                      PLANNER
                          |
                          v
                  requirements.md
                          |
                          v
                     ARCHITECT
                          |
                          v
                 architecture.md
                          |
                          v
                      SYSTEM
                          |
                          v
                 backend_spec.md
                          |
                          v
                     DESIGNER
                          |
                          v
                    ui_spec.md
                          |
                          v
                   BLUEPRINTER
                          |
                          v
                    blueprint.md
                          |
                          v
                CONTRACT VALIDATOR
                          |
                          v
                       CODER
                          |
                          v
                       TESTER
                          |
                          v
                      DEBUGGER
                          |
                          v
                      SECURITY
                          |
                          v
                      REVIEWER


                 +-------------------+
                 | ExecutiveMemory   |
                 | historical dump   |
                 +-------------------+
                    ^  ^  ^  ^  ^
                    |  |  |  |  |
                    +--+--+--+--+
                       records
```

EM sits **beside** the operational pipeline.

It records what agents produced and consumed, but downstream agents do not consult EM to determine current project state.

---

# 4. Source-of-Truth Policy

## 4.1 Current project truth

The following are canonical operational artifacts:

```text
plan.md
requirements.md
architecture.md
backend_spec.md
ui_spec.md
blueprint.md
src/**
public/**
package.json
configuration files
other generated project files
```

For specifications, the Markdown documents are canonical.

For implementation, generated source files are canonical.

VFS is the authoritative current representation of these artifacts.

If a database metadata record disagrees with a Markdown artifact, the Markdown artifact wins.

---

## 4.2 ExecutiveMemory truth

ExecutiveMemory is authoritative only for:

- historical agent executions
- previous versions
- provenance
- consumed artifact information
- execution metadata
- decisions/events
- historical debugging information
- agent/model telemetry
- future retrieval and learning

EM is **not** authoritative for current specifications.

---

# 5. Remove Context Snapshot as a Semantic Concept

The Context Snapshot system should be removed from the normal agent pipeline.

Remove the concept of:

```text
### Context Snapshot
```

as an intermediate representation of project state.

Remove:

- snapshot extraction
- snapshot injection
- snapshot truncation as a semantic mechanism
- fuzzy snapshot fallback
- synthetic snapshot generation
- snapshot-based context recovery

The agent should receive the actual relevant Markdown documents.

For example:

```text
Architect
  -> plan.md
  -> requirements.md
```

instead of:

```text
Architect
  -> Context Snapshot
  -> maybe typed DB context
  -> maybe fallback snapshot
```

This removes an entire class of silent context divergence.

---

# 6. Deterministic Stage Dependency Graph

Every stage should declare which artifacts it consumes.

Do not infer dependencies from whatever information happens to be available.

Recommended dependency graph:

```text
Queen
  -> user request

Planner
  -> plan.md

Architect
  -> plan.md
  -> requirements.md

System
  -> plan.md
  -> requirements.md
  -> architecture.md

Designer
  -> plan.md
  -> requirements.md
  -> architecture.md
  -> backend_spec.md

Blueprinter
  -> plan.md
  -> requirements.md
  -> architecture.md
  -> backend_spec.md
  -> ui_spec.md

Coder
  -> blueprint.md
  -> architecture.md
  -> backend_spec.md
  -> ui_spec.md
  -> targeted project files

Tester
  -> blueprint.md
  -> generated project files

Debugger
  -> test/lint/build failures
  -> relevant project files

Security
  -> requirements.md
  -> architecture.md
  -> backend_spec.md
  -> generated project files

Reviewer
  -> plan.md
  -> requirements.md
  -> architecture.md
  -> backend_spec.md
  -> ui_spec.md
  -> blueprint.md
  -> generated project files
```

The exact dependency list can be tightened later, but the important rule is that it must be explicit and centralized.

---

# 7. Replace `UPSTREAM_AGENT_MAP` With Artifact Dependencies

The current architecture contains dependency information in multiple places, including:

- `UPSTREAM_AGENT_MAP`
- invalidation logic
- typed context logic
- stage-specific handlers

This should be consolidated.

Create one dependency registry describing the artifacts required by each stage.

Conceptually:

```ts
const STAGE_ARTIFACT_DEPENDENCIES = {
  Planner: [],
  Architect: ["plan.md", "requirements.md"],
  System: [
    "plan.md",
    "requirements.md",
    "architecture.md",
  ],
  Designer: [
    "plan.md",
    "requirements.md",
    "architecture.md",
    "backend_spec.md",
  ],
  Blueprinter: [
    "plan.md",
    "requirements.md",
    "architecture.md",
    "backend_spec.md",
    "ui_spec.md",
  ],
};
```

The orchestrator should use this registry for context construction and dependency validation.

Do not maintain separate hardcoded dependency maps for different subsystems unless there is a concrete reason.

---

# 8. Refactor `orchestrator.ts`

## Remove

The following semantic-state machinery should be removed or retired:

- `getTypedStageContext()`
- `buildStageContext()`
- snapshot extraction helpers
- snapshot fallback logic
- snapshot consistency validation
- typed-stage-table context fallback
- context snapshot injection

The goal is to stop doing:

```text
"Which version of this information should I inject?"
```

Instead do:

```text
"Which artifacts does this stage require?"
```

Then load those artifacts directly.

---

## Add

Create a simple artifact-context resolver.

Conceptually:

```ts
async function buildArtifactContext(
  conversationId: string,
  agentName: string
): Promise<string> {
  const requiredArtifacts =
    STAGE_ARTIFACT_DEPENDENCIES[agentName];

  const artifacts = await loadArtifacts(
    conversationId,
    requiredArtifacts
  );

  validateArtifacts(artifacts, requiredArtifacts);

  return formatArtifactsForModel(artifacts);
}
```

The resolver should:

1. determine required artifacts
2. load the current versions
3. fail if required artifacts are missing
4. preserve filenames/headings
5. provide the actual document contents to Ollama
6. never silently substitute historical memory

---

# 9. Markdown Context Formatting

Ollama should receive clearly delimited documents.

Example:

```text
=== ARTIFACT: plan.md ===

# Project Plan

...

=== END ARTIFACT: plan.md ===


=== ARTIFACT: requirements.md ===

# Requirements

...

=== END ARTIFACT: requirements.md ===
```

This is preferable to compressed snapshots because the model sees the actual source document.

Do not destroy structure merely to save a few tokens unless context limits require an explicit optimization.

If optimization is later required, summaries may be added as a cache/optimization layer, but they must never become the canonical state.

---

# 10. ExecutiveMemory Redesign

ExecutiveMemory should remain, but its responsibility changes.

## EM should store

For every meaningful stage execution:

```text
conversationId
agentName
sequence
artifact/file path
artifact version/hash
consumed artifact versions/hashes
execution metadata
model metadata
duration
status
historical content or event payload
timestamp
```

The current `ExecutiveMemory` model already contains useful fields such as:

- `inferenceId`
- `agentName`
- `sequence`
- `contentMd`
- `consumedIds`
- `filePath`
- `tokenCount`
- `durationMs`
- `status`
- `contentHash`

These can be retained and repurposed around historical memory.

---

# 11. EM Must Be Append-Only

Normal pipeline execution should not mutate historical memory into the current state.

Instead:

```text
Planner execution #1
    -> EM record

Planner execution #2
    -> EM record

Planner execution #3
    -> EM record
```

All remain available.

The current `requirements.md` is still the operational truth.

EM contains the history.

If an artifact changes:

```text
requirements.md v1
requirements.md v2
requirements.md v3
```

the VFS contains v3.

EM can contain the records for v1, v2, and v3.

---

# 12. What EM Can Become Later

The historical memory layer can later support:

## 12.1 Project history

```text
What changed between architecture v2 and v3?
```

## 12.2 Explainability

```text
Why did AutoCoder choose this architecture?
```

## 12.3 Agent evaluation

```text
Which agents frequently produce outputs that require repair?
```

## 12.4 Failure analysis

```text
Which planning decisions correlate with later build failures?
```

## 12.5 Retrieval

```text
Have we solved a similar project before?
```

## 12.6 Long-term project memory

Future agents can selectively retrieve historical information when explicitly needed.

This retrieval should be a **separate feature**, not part of the default current-state pipeline.

---

# 13. Dedicated Stage Tables

Current dedicated stage tables such as:

```text
QueenStageOutput
PlannerStageOutput
ArchitectStageOutput
SystemStageOutput
DesignerStageOutput
BlueprinterStageOutput
SecurityStageOutput
ReviewerStageOutput
TesterStageOutput
DebuggerStageOutput
```

currently duplicate information that also exists elsewhere.

They should no longer be used as the primary context source.

There are two acceptable end states.

## Option A: Remove them

If historical execution information is already preserved in EM and execution-history tables, remove the redundant stage tables after migration.

## Option B: Keep them as query projections

If the application UI needs convenient structured queries, keep them as projections/read models.

Rules:

- they do not define current project truth
- agents do not use them for context
- they can be regenerated from authoritative records
- they should not silently override Markdown

Option B is safer during migration.

---

# 14. `AgentOutput`

`AgentOutput` currently stores validated JSON inference records.

Keep it only if it provides genuine audit/evaluation value.

It should not become another current-state store.

If retained:

```text
AgentOutput
    = historical structured inference
```

not:

```text
AgentOutput
    = current requirements
```

Markdown remains current specification truth.

---

# 15. `MemoryState` / `StageLedger`

`MemoryState` currently reconstructs a broad materialized state containing:

```text
originalPrompt
taskSpec
planner
architect
system
designer
blueprinter
coder
debugger
security
reviewer
tester
invalidated
hashes
fileStateHistory
decisions
```

This should be reduced.

The runtime state should contain only what orchestration actually needs, such as:

```text
current execution status
current stage
current artifact versions
current failures
current invalidations
current file generation state
```

It should not reconstruct the entire project specification as another semantic state store.

`StageLedger` can remain as a runtime coordination mechanism if required, but it should not compete with VFS/Markdown.

---

# 16. Persistence Model

The database should primarily provide:

- execution history
- pipeline runs
- artifact metadata
- provenance
- hashes
- version information
- telemetry
- relationships
- audit history

It should not maintain multiple competing copies of the current specification.

A useful artifact metadata model is:

```text
Artifact
---------
conversationId
path
version
contentHash
generatedBy
generatedFrom
createdAt
```

Example:

```json
{
  "path": "requirements.md",
  "version": 4,
  "contentHash": "abc123...",
  "generatedBy": "Planner",
  "generatedFrom": [
    "plan.md@v2"
  ]
}
```

The metadata describes the artifact.

The artifact itself remains the source of truth.

---

# 17. Versioning

Every generated specification artifact should have a version.

Example:

```text
plan.md@v1
requirements.md@v1
requirements.md@v2
architecture.md@v1
```

The current VFS contains the latest version.

Historical versions can be represented through EM and/or artifact history.

Hashes should be used to detect actual changes.

This enables:

- change detection
- downstream invalidation
- reproducibility
- debugging
- rollback
- provenance

---

# 18. Invalidation

Invalidation should be artifact-driven rather than agent-name-driven wherever possible.

Example:

```text
requirements.md changed
        |
        +--> architecture.md invalidated
        +--> backend_spec.md invalidated
        +--> ui_spec.md invalidated
        +--> blueprint.md invalidated
        +--> generated code potentially invalidated
```

Rather than:

```text
Planner changed
    -> hardcoded list of agents
```

The dependency graph should determine the impact.

This prevents dependency maps from drifting across different parts of the codebase.

---

# 19. Blueprinter Improvements

Blueprinter should consume the complete current upstream artifacts:

```text
plan.md
requirements.md
architecture.md
backend_spec.md
ui_spec.md
```

It should produce:

```text
blueprint.md
```

The blueprint must be validated before Coder starts.

Validation should check at minimum:

- every required file is defined
- imports reference defined files
- exports are consistent
- framework structure is valid
- entry point exists
- API files match backend specification
- UI files match UI specification
- file paths are not duplicated
- framework conventions are respected
- referenced dependencies actually exist

Warnings should be classified:

```text
ERROR
WARNING
INFO
```

Structural contradictions should block Coder rather than merely log warnings.

---

# 20. Coder Improvements

Coder should consume the blueprint plus the relevant source specifications.

Coder should not need to reconstruct project intent from snapshots.

For each target file:

```text
Target file
+
Blueprint section
+
Relevant architecture
+
Relevant backend/UI specification
+
Relevant existing files
+
Dependency interfaces
```

The generated file should then be validated.

---

# 21. Testing Must Become Real Testing

The current Tester is primarily a deterministic linter.

That is not enough for a production-code-generation system.

The target testing pipeline should progressively include:

```text
TypeScript/type checking
        |
        v
Linting
        |
        v
Dependency/import validation
        |
        v
Build
        |
        v
Application startup
        |
        v
API smoke tests
        |
        v
Browser/DOM tests where applicable
        |
        v
Acceptance criteria checks
```

A project should not be considered successful merely because individual files pass linting.

---

# 22. Security and Reviewer Gates

Security and Reviewer should become explicit quality gates.

Current behavior that merely logs a recommendation should be upgraded where appropriate.

For example:

```text
Security
  -> PASS
  -> WARN
  -> FAIL

Reviewer
  -> PASS
  -> REPAIR_REQUIRED
```

The pipeline should define which findings are blocking.

Do not let an agent claim that a requirement is implemented simply because a corresponding file exists.

---

# 23. Fix Existing Concrete Failure Patterns

The generated outputs already demonstrate the kinds of failures the new architecture must prevent.

Examples include:

### Architecture contradictions

`architecture.md` and other artifacts disagree on application structure such as `src/pages` versus `src/app`.

### Authentication contradiction

One specification indicates no authentication while `backend_spec.md` introduces authentication requirements.

### Blueprint duplication

The generated blueprint contains duplicate or conflicting files/dependencies.

### Invalid entry-point references

`index.html` references TypeScript/API files in ways that do not correspond to the selected application architecture.

### Missing implementation

Reviewer output identifies required product behavior that was not actually implemented.

### Security false positives

Security output identifies issues that do not necessarily constitute the security claim being made, while other validation requirements remain incomplete.

These are primarily **contract consistency and validation failures**, not problems that another context snapshot will solve.

---

# 24. Contract Validation

Add validation between every specification stage.

Example:

```text
Planner
   |
   v
requirements.md
   |
   v
Contract Validator
   |
   +-- PASS --> Architect
   |
   +-- FAIL --> Planner repair
```

Then:

```text
Architect
   |
   v
architecture.md
   |
   v
Contract Validator
   |
   +-- PASS --> System / Designer
   |
   +-- FAIL --> Architect repair
```

The validator should detect contradictions such as:

- framework mismatch
- database mismatch
- authentication mismatch
- route mismatch
- API mismatch
- page mismatch
- file-structure mismatch
- requirement coverage gaps

---

# 25. Migration Plan

Do not rewrite the entire system in one pass.

## Phase 1: Establish Markdown/VFS as truth

1. Define artifact dependency registry.
2. Make current VFS artifacts authoritative.
3. Ensure each stage writes its canonical Markdown artifact.
4. Stop using snapshots for current context.

## Phase 2: Remove competing context paths

1. Remove `getTypedStageContext()`.
2. Remove snapshot injection.
3. Remove snapshot extraction/fallback.
4. Make all stages use artifact resolver.
5. Remove duplicate dependency maps where possible.

## Phase 3: Convert EM into historical memory

1. Keep EM writes.
2. Make EM append-only.
3. Store artifact version/hash and consumed artifact metadata.
4. Stop reading EM for normal current-state context.
5. Preserve historical records.

## Phase 4: Reduce duplicated state tables

1. Identify which dedicated stage tables are actually used by UI/API.
2. Keep useful tables temporarily as read projections.
3. Remove tables that only duplicate semantic state.
4. Migrate any required historical information into EM.

## Phase 5: Strengthen contracts

1. Add stage output validation.
2. Add cross-document consistency validation.
3. Add blueprint hard gates.
4. Add artifact-driven invalidation.

## Phase 6: Strengthen execution testing

1. Type checking.
2. Linting.
3. Build.
4. Startup.
5. API smoke tests.
6. Browser/acceptance testing.

---

# 26. Files Expected to Change

Based on the current repository architecture, the primary implementation work should focus on:

```text
src/lib/agents/ruflo/orchestrator.ts
src/lib/agents/ruflo/memory.ts
prisma/schema.prisma
```

and the VFS/artifact implementation used by the orchestrator.

The exact VFS implementation should be inspected before changing persistence behavior.

Likely changes:

### `orchestrator.ts`

- remove snapshot extraction/injection
- remove typed stage context
- introduce artifact dependency resolver
- centralize dependency definitions
- strengthen artifact validation
- preserve EM writes as historical events

### `memory.ts`

- reduce `MemoryState` to runtime coordination state
- stop treating EM as live semantic context
- preserve historical EM writes
- remove redundant materialization logic where no longer needed

### `schema.prisma`

- retain EM for historical memory
- add/retain artifact metadata/versioning where required
- gradually remove or demote redundant stage-output models
- preserve execution/pipeline history

### VFS/artifact layer

- establish canonical current artifact storage
- expose version/hash information
- support deterministic artifact retrieval
- support historical artifact tracking without making history part of normal model context

---

# 27. Final Architecture Principle

The system should have one current truth and one historical memory.

```text
CURRENT STATE
-------------
Markdown + VFS
       |
       v
     Agents


HISTORICAL STATE
---------------
ExecutiveMemory
       |
       v
Future retrieval / analytics / debugging / evaluation
```

Never:

```text
Markdown
   +
ExecutiveMemory
   +
Typed DB tables
   +
Snapshot
   +
MemoryState
   =
"let the agent figure out which one is right"
```

That is how systems become haunted.

---

# 28. Acceptance Criteria

The architecture change is complete when:

- [ ] No Context Snapshot is required for normal stage execution.
- [ ] No agent reads EM to obtain current specification state.
- [ ] No agent reads dedicated stage tables to override Markdown.
- [ ] Every stage has an explicit artifact dependency list.
- [ ] Markdown/VFS is the canonical current specification state.
- [ ] EM records historical executions and artifact history.
- [ ] EM is append-only for historical records.
- [ ] Artifact versions/hashes are tracked.
- [ ] Invalidation is derived from artifact dependencies.
- [ ] Contradictory specifications fail validation before Coder.
- [ ] Blueprint structural errors block Coder.
- [ ] Coder receives relevant real artifacts rather than compressed snapshots.
- [ ] Tester can validate the generated application beyond file-level linting.
- [ ] Security and Reviewer produce explicit gate results.
- [ ] Redundant stage tables no longer act as hidden sources of truth.
- [ ] The pipeline can explain which artifact versions produced a generated file.

---

# 29. One-Sentence Design Decision

> **Keep ExecutiveMemory, but demote it from "live semantic state" to "historical memory and audit"; make Markdown/VFS the single canonical source of current project truth and have every agent consume deterministic artifact dependencies directly.**
