# AutoCoder — Remaining Canonical Pipeline Fixes
## Final Enforcement & Convergence Implementation Plan

**Repository:** `Gautam-Mathur/AutoCoder`  
**Baseline:** `e73a2cadf1536f986e1082273fe723330ebb5f71`  
**Baseline commit:** `feat: enforce canonical contract registry & single generation execution pipeline`  
**Purpose:** Finish the remaining canonical-contract and generation-pipeline enforcement work so the pipeline has one authoritative execution path, one artifact lifecycle, one verification loop, and one final completion gate.

---

# 0. Executive Decision

The previous implementation moved AutoCoder substantially closer to the intended architecture, but the job is **not finished**.

The remaining work is not another infrastructure rewrite.

The correct move is to **close the remaining escape hatches** in the existing architecture.

Do **not** create:

- another artifact store
- another contract registry
- another orchestrator
- another verifier
- another Coder abstraction
- another VFS
- another lease implementation
- another final gate

The existing infrastructure must be made authoritative.

The final architecture must be:

```text
                    ┌──────────────────────────┐
                    │      Pipeline Lease       │
                    │ owner + heartbeat + guard │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │   Canonical Orchestrator │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │  Contract Executor        │
                    │                          │
                    │ resolve accepted inputs  │
                    │ generate candidate        │
                    │ validate candidate        │
                    │ compatibility check      │
                    │ provenance               │
                    │ commit accepted artifact │
                    │ project artifact         │
                    └────────────┬─────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
        Artifact Store      VFS / Workspace    Stage Ledger
              │                  │                  │
              └──────────────────┼──────────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │ Verification Loop         │
                    │ Tester → Debugger → Test │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │ Security + Reviewer       │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │ Strict Final Pipeline Gate│
                    └────────────┬─────────────┘
                                 │
                                 ▼
                           Completed
```

No stage may silently bypass the contract executor.

---

# 1. Baseline Verified

The latest pushed commit is:

```text
e73a2cadf1536f986e1082273fe723330ebb5f71
```

It introduces or strengthens:

- canonical stage contract mappings
- `resolveAcceptedStageInputs()`
- content hash verification
- dependency fingerprints
- persistent lease assertion
- lease heartbeat
- strict stage validators
- `contract-executor.ts`
- artifact provenance
- accepted artifact commits
- Debugger repair VFS patching
- oscillation detection
- stricter final gate
- orchestrator integration

The commit is therefore a meaningful architectural step.

However, the implementation still contains compatibility and execution-path inconsistencies that can undermine the guarantees above.

---

# 2. Remaining Problems

## Critical

### C1. Coder output contract does not match the actual Coder execution model

The contract now says:

```text
Coder → workspace.manifest.json
```

But the existing Coder agent model is still based around:

```text
write complete source code for ONE file at a time
```

This creates an architectural mismatch.

The contract executor expects:

```text
agentResult.content
        ↓
CoderOutput
        ↓
workspace.manifest.json
```

while the Coder itself fundamentally operates on individual source files.

These are not equivalent artifacts.

A workspace is not a single source-code blob.

---

### C2. Tester bypasses the canonical contract executor

The orchestrator contains a dedicated Tester branch that calls:

```text
verifyAndRepairWorkspace(...)
```

and then directly commits:

```text
test_report.md
```

This means Tester does not follow the same canonical lifecycle as:

```text
resolve inputs
→ generate candidate
→ validate
→ compatibility
→ provenance
→ commit
→ project
```

That is a duplicate execution path.

---

### C3. Debugger bypasses the canonical contract executor

The orchestrator contains a dedicated Debugger branch that directly commits:

```text
debug_report.md
```

The verification loop may perform Debugger repair work, but the Debugger stage itself is not fully represented as a canonical contract execution.

This creates ambiguity around:

- Debugger acceptance
- Debugger provenance
- Debugger stage execution records
- retry semantics
- artifact versions
- compatibility
- final-gate requirements

---

### C4. Compatibility validation is currently conceptually backwards

The executor currently performs a call equivalent to:

```ts
assertArtifactCompatibility({
  produced: {
    name: contract.outputArtifact.name,
    contract: contract.outputArtifact.contract,
    version: contract.outputArtifact.version,
  },
  required: contract.inputArtifacts,
  stageName,
});
```

That compares the current stage's produced artifact against its own input requirements.

The meaningful compatibility question is:

```text
Did the accepted upstream artifacts satisfy
the current stage's required input contracts?
```

and, separately:

```text
Does this stage's output satisfy the declared
contract for every downstream consumer?
```

These are two different checks.

They must not be collapsed into one ambiguous call.

---

### C5. Final-gate lease semantics must be unambiguous

The orchestrator currently holds the pipeline lease while reaching the final gate.

The final gate must therefore validate:

```text
current owner == current pipeline
AND
lease exists
AND
lease is not expired
```

It must NOT interpret an active lease as an invalid condition.

Correct ordering:

```text
assert active lease
        ↓
evaluate final gate
        ↓
if PASS:
    mark Completed
        ↓
release lease
```

Not:

```text
release lease
        ↓
evaluate final gate
```

The pipeline must not lose ownership before completion is committed.

---

# 3. High Priority Problems

## H1. Debugger must be part of final completion semantics

The final required-stage list currently includes:

```text
Queen
Planner
Architect
System
Designer
Blueprinter
Coder
Tester
Security
Reviewer
```

Debugger is absent.

If Debugger is a real pipeline stage, the final gate must know whether:

- Debugger was required
- Debugger ran
- Debugger passed
- Debugger was unnecessary because Tester passed
- Debugger was invoked and completed repairs
- the final VerificationRun happened after the final Debugger repair

The pipeline must never finish with a stale verification result.

---

## H2. Legacy fallbacks must be removed from the final gate

The final gate still contains compatibility logic resembling:

```text
accepted Coder artifact OR virtual files exist
```

That is exactly the type of fallback the canonical artifact system was introduced to eliminate.

Once canonical artifact enforcement is active:

```text
accepted Coder artifact
```

must be authoritative.

Legacy VFS existence must not substitute for an accepted artifact.

---

## H3. Stage validators are still structural rather than semantic

Examples such as:

```text
content.length > 100
```

or:

```text
content includes heading
```

are useful as first-line guards, but they are not sufficient to prove a contract.

A stage contract must validate the minimum semantic structure required by its consumers.

---

## H4. Coder workspace state needs an explicit manifest model

A `workspace.manifest.json` must describe the actual generated workspace.

At minimum:

```json
{
  "schemaVersion": "1.0.0",
  "projectRoot": ".",
  "files": [
    {
      "path": "src/pages/index.tsx",
      "hash": "...",
      "language": "typescript",
      "role": "frontend-entry"
    }
  ],
  "directories": [],
  "entryPoints": [],
  "generatedAt": "...",
  "sourceStageExecutionId": "..."
}
```

The manifest is metadata.

It is not the source code itself.

---

# 4. Medium Priority Problems

## M1. Existing orchestrator helpers may now be dead or duplicate

The orchestrator still contains functionality such as:

```text
generateStageCandidate()
```

and direct VFS-writing behavior through:

```text
runAgent()
```

The contract executor also performs candidate generation through `runAgent()`.

There must be exactly one production candidate-generation path.

---

## M2. `runAgent()` currently has too many responsibilities

`runAgent()` is being used as the lower-level inference adapter while the contract executor is supposed to own pipeline semantics.

Separate:

```text
Agent inference
```

from:

```text
Pipeline execution
```

The agent layer should generate content.

The contract executor should decide whether that content becomes authoritative.

---

## M3. Authentication contradiction detection must be explicit

The canonical spec may contain:

```text
Authentication: None
```

while acceptance criteria can contain:

```text
where they log in
```

Generic authentication language must not be ignored.

The contract system must detect contradictions between:

```text
declared authentication model
```

and:

```text
functional requirements
acceptance criteria
module descriptions
```

Example:

```text
Authentication: None

Acceptance:
User's board state should be accessible
from any browser session where they log in.
```

This must fail specification validation.

---

## M4. React/Vite/Express/Prisma boundaries need regression tests

The contract layer must preserve explicit architecture.

For a specification containing:

```text
Frontend: React
Frontend Entry Point: src/pages/index.tsx
Backend: Express
Backend Entry Point: server/app.js
Database: PostgreSQL
ORM: Prisma
Build Tool: Vite
Authentication: None
```

the generated contracts must not silently transform it into:

```text
Next.js
src/main.tsx
Express + TypeScript server
Drizzle
MongoDB
Auth
```

Architecture normalization must preserve explicit user decisions.

---

# 5. Phase 1 — Fix the Coder Contract

## Goal

Make Coder generate and maintain a real workspace while exposing a canonical manifest artifact.

Do not force the Coder to become a Markdown generator.

---

## Step 1.1 — Define the Coder contract correctly

File:

```text
src/lib/agents/ruflo/contracts/versions.ts
```

Keep:

```ts
Coder.outputArtifactName = 'workspace.manifest.json'
```

but define its semantics explicitly:

```text
CoderOutput = WorkspaceManifest
```

The contract should state:

```text
The artifact is a machine-readable manifest describing
the current generated workspace.
```

---

## Step 1.2 — Define manifest schema

Create or extend:

```text
src/lib/agents/ruflo/contracts/schemas.ts
```

with:

```ts
interface WorkspaceManifest {
  schemaVersion: string;
  projectRoot: string;
  files: WorkspaceFile[];
  directories: string[];
  entryPoints: string[];
  generatedAt: string;
  sourceStageExecutionId: string;
}

interface WorkspaceFile {
  path: string;
  hash: string;
  language?: string;
  role?: string;
}
```

Use a real schema validator if the repository already has one.

Do not create a second schema framework.

---

## Step 1.3 — Coder must receive a target file

The existing executor already has:

```ts
targetFile?: string
```

Make this parameter meaningful.

The Coder prompt must receive:

```text
Target file:
src/pages/index.tsx
```

and:

```text
Workspace state:
<accepted workspace manifest>
```

The agent generates the source for the target file.

---

## Step 1.4 — Separate source-file projection from manifest generation

Coder execution should be:

```text
Coder
 │
 ├── generates source for target file
 │
 ├── validates source
 │
 ├── writes source into VFS/workspace
 │
 └── updates workspace.manifest.json
```

The source file itself must never be stored as:

```text
workspace.manifest.json
```

---

## Step 1.5 — Manifest must be derived from actual workspace

Do not ask the LLM to invent file hashes.

After Coder writes files:

```text
scan VFS workspace
        ↓
calculate hashes
        ↓
construct manifest
        ↓
validate manifest
        ↓
commit manifest artifact
```

The manifest becomes a deterministic projection of actual workspace state.

---

## Step 1.6 — Coder acceptance rule

Coder passes only if:

1. target file exists
2. target file path is allowed by blueprint
3. generated content is non-empty
4. file is syntactically valid where applicable
5. file is written to VFS
6. workspace manifest can be regenerated
7. manifest matches actual VFS state
8. manifest passes schema validation

---

# 6. Phase 2 — Remove Tester Bypass

## Goal

Tester must still perform real workspace verification, but its report must pass through the canonical artifact lifecycle.

---

## Step 2.1 — Keep verification as a service, not a stage bypass

Keep:

```text
verifyAndRepairWorkspace()
```

if it contains useful execution logic.

But its responsibility should be:

```text
execute tests
return VerificationResult
```

not:

```text
own the Tester stage lifecycle
```

---

## Step 2.2 — Tester contract executor integration

Tester should conceptually execute:

```text
resolve accepted workspace manifest
        ↓
resolve architecture/system/ui context
        ↓
run verification
        ↓
construct test_report.md
        ↓
validate TesterOutput
        ↓
commit accepted artifact
```

---

## Step 2.3 — Tester output contract

Minimum structure:

```md
# Test Report

## Result

PASS

## Verification Run

<verification run id>

## Tests

- command: ...
- result: ...
- passed: ...
- failed: ...

## Workspace

<workspace manifest version/hash>

## Generated At

...
```

For failures:

```md
# Test Report

## Result

FAIL

## Verification Run

...

## Failures

...

## Repair Required

YES
```

---

## Step 2.4 — VerificationRun must be linked to Tester execution

Database relationships should preserve:

```text
StageExecution
      │
      ▼
Tester artifact
      │
      ▼
VerificationRun
      │
      ▼
workspace state/hash
```

The final gate must reject a VerificationRun that was created against a different workspace state.

---

# 7. Phase 3 — Make Debugger Canonical

## Goal

Debugger becomes a real contract stage while retaining its ability to patch the workspace.

---

## Step 3.1 — Define Debugger input contract

Debugger requires:

```text
test_report.md
workspace.manifest.json
architecture.md
backend_spec.md
ui_spec.md
```

plus the current verification failure context.

---

## Step 3.2 — Define Debugger output contract

Debugger output:

```text
debug_report.md
```

Minimum structure:

```md
# Debug Report

## Result

PASS

## Root Cause

...

## Changes

- path: ...
- reason: ...

## Verification Required

YES

## Repair Summary

...
```

---

## Step 3.3 — Debugger patch application

Debugger may produce patches, but patches must be applied through the existing VFS abstraction.

Never allow Debugger to mutate an external workspace directly without the pipeline knowing about it.

Required sequence:

```text
Debugger candidate
        ↓
validate repair plan
        ↓
apply patch to VFS
        ↓
regenerate workspace manifest
        ↓
commit debug_report.md
        ↓
rerun Tester
```

---

## Step 3.4 — Detect stale reports

After Debugger changes the workspace:

```text
old test_report.md
```

must no longer be considered current.

Mark it:

```text
SUPERSEDED
```

or require a new VerificationRun.

The final gate must use the verification result corresponding to the latest workspace hash.

---

# 8. Phase 4 — Fix Compatibility Semantics

## Goal

Separate upstream input compatibility from downstream output compatibility.

---

## Step 4.1 — Input compatibility

For every input:

```text
consumer.requiredInput
        ↓
producer.acceptedOutput
```

Validate:

```text
name
contract
version
schema
```

Example:

```text
Coder requires:

BlueprinterOutput >= 1.0.0
```

The accepted `blueprint.md` must actually carry:

```text
contract = BlueprinterOutput
version >= 1.0.0
```

---

## Step 4.2 — Output compatibility

Separately verify:

```text
current stage output
```

against:

```text
declared output contract
```

Do not compare:

```text
current output
```

against:

```text
current stage input definitions
```

---

## Step 4.3 — Dependency fingerprint

The existing dependency fingerprint is useful.

Make it deterministic from:

```text
input artifact id
input artifact version
input content hash
input contract version
```

The fingerprint must be stored on the accepted artifact.

---

## Step 4.4 — Reject stale dependencies

If:

```text
Planner requirements.md
```

changes after:

```text
Architect architecture.md
```

was produced, Architect must not silently remain valid.

Its dependency fingerprint no longer matches.

The pipeline must:

```text
invalidate downstream artifacts
```

or require regeneration.

---

# 9. Phase 5 — Fix Final Gate

## Goal

The final gate becomes the only authority capable of transitioning the pipeline to `Completed`.

---

## Step 5.1 — Remove legacy workspace fallback

Delete logic equivalent to:

```ts
if (!coderArtifact) {
  if (virtualFilesCount > 0) {
    // accept legacy workspace
  }
}
```

Replace with:

```text
Coder accepted artifact is mandatory.
```

---

## Step 5.2 — Define mandatory artifact set

For a complete pipeline:

```text
plan.md
requirements.md
architecture.md
backend_spec.md
ui_spec.md
blueprint.md
workspace.manifest.json
test_report.md
security_report.md
review_report.md
```

Debugger is conditional:

```text
If Debugger was invoked:
    debug_report.md must be accepted
```

---

## Step 5.3 — Define mandatory verification state

Final gate requires:

```text
latest VerificationRun exists
AND
latest VerificationRun.success == true
AND
verification workspace hash == current workspace hash
```

This prevents:

```text
Tester passed
↓
Debugger changed code
↓
old Tester result reused
↓
Completed
```

That would be a spectacularly creative definition of “tested.”

---

## Step 5.4 — Security must be current

Security PASS must correspond to the current workspace state.

Require:

```text
Security artifact accepted
AND
Security status PASS
AND
Security workspace hash == current workspace hash
```

---

## Step 5.5 — Reviewer must be current

Require:

```text
Reviewer artifact accepted
AND
Reviewer PASS
AND
Reviewer dependency fingerprint corresponds to current upstream state
```

---

## Step 5.6 — Lease must be valid

Before final gate:

```ts
await assertPipelineLease(
  conversationId,
  leaseOwnerId
);
```

Final gate then verifies lease ownership.

Do not release the lease before completion.

---

## Step 5.7 — Completion transaction

Preferred sequence:

```text
BEGIN

assert lease

evaluate all final conditions

if FAIL:
    ROLLBACK / remain running or failed

if PASS:
    conversation.status = Completed
    pipelineRun.status = Completed

COMMIT

release lease
stop heartbeat
```

The completion state must never be written after the lease has already been released.

---

# 10. Phase 6 — Make Debugger a First-Class Final-Gate Dependency

Define:

```ts
const debuggerRequired =
  await wasDebuggerInvoked(conversationId, pipelineRunId);
```

Then:

```ts
if (debuggerRequired) {
  requireAcceptedArtifact('debug_report.md');
  requireDebuggerExecutionAccepted();
}
```

But do not require Debugger merely because it exists.

A clean pipeline may legitimately be:

```text
Coder
→ Tester PASS
→ Security PASS
→ Reviewer PASS
→ Completed
```

A repaired pipeline is:

```text
Coder
→ Tester FAIL
→ Debugger
→ Tester PASS
→ Security PASS
→ Reviewer PASS
→ Completed
```

---

# 11. Phase 7 — Verification Loop State Machine

Replace ad-hoc branching with an explicit state machine.

```text
CODING_COMPLETE
      │
      ▼
TEST
 │
 ├── PASS ──────────────┐
 │                      │
 └── FAIL               │
      │                 │
      ▼                 │
   DEBUGGER             │
      │                 │
      ▼                 │
   APPLY PATCH          │
      │                 │
      ▼                 │
 REBUILD MANIFEST       │
      │                 │
      ▼                 │
     TEST ──────────────┘
```

Add bounded retries:

```text
MAX_VERIFICATION_REPAIRS = N
```

where `N` is already defined by the existing configuration if available.

Do not create a second retry configuration.

---

# 12. Phase 8 — Oscillation Detection

The existing oscillation detection should compare workspace state hashes.

Example:

```text
A → B → A
```

must be detected.

Also detect:

```text
A → B → C → B → C
```

using a bounded history of workspace hashes.

If oscillation occurs:

```text
pipeline = FAILED
reason = DEBUGGER_OSCILLATION
```

Do not continue consuming model calls.

---

# 13. Phase 9 — Remove Duplicate Execution Paths

Audit:

```text
src/lib/agents/ruflo/orchestrator.ts
```

Search for:

```text
runAgent(
generateStageCandidate(
writeVirtualFile(
commitAcceptedArtifact(
verifyAndRepairWorkspace(
```

Classify every occurrence.

The desired ownership model:

| Function | Owner |
|---|---|
| `runAgent()` | inference adapter |
| `executeContractStage()` | stage lifecycle |
| `commitAcceptedArtifact()` | artifact lifecycle |
| `resolveAcceptedStageInputs()` | dependency resolution |
| `verifyAndRepairWorkspace()` | verification engine |
| `evaluateFinalPipelineGate()` | completion authority |
| `runOrchestrator()` | pipeline sequencing |

No function should secretly own two layers.

---

# 14. Phase 10 — Remove / Refactor `generateStageCandidate()`

If `generateStageCandidate()` is no longer called by the canonical path:

```text
delete it
```

If it contains useful inference functionality:

```text
move the useful low-level logic
into the inference adapter
```

Do not retain an unused second implementation merely because deleting code feels emotionally dangerous to humans.

---

# 15. Phase 11 — Refactor `runAgent()`

`runAgent()` should not:

- decide artifact acceptance
- decide contract compatibility
- decide final pipeline state
- commit canonical artifacts
- bypass validation
- independently own stage semantics

It may:

- construct agent context
- call the model
- stream events
- return candidate content
- handle model-level errors

The contract executor owns everything after candidate generation.

---

# 16. Phase 12 — Strengthen Stage Validators

## Queen

Require:

```text
# Project Plan
scope
goals
features / requirements
```

Reject empty plans.

---

## Planner

Require:

```text
# Requirements
functional requirements
non-functional requirements
acceptance criteria
```

Do not use only:

```text
content.length > 100
```

---

## Architect

Require:

```text
# Architecture
technology choices
frontend
backend
database
ORM if declared
entry points
module boundaries
data flow
```

---

## System

Require:

```text
backend/API architecture
endpoints
models/data contracts
service boundaries
runtime assumptions
```

---

## Designer

Require:

```text
UI structure
pages/views
components
interaction rules
styling constraints
```

---

## Blueprinter

Require:

```text
project structure
files
directories
ownership
dependencies
entry points
```

The blueprint must agree with Architect/System/Designer.

---

## Coder

Require:

```text
valid workspace manifest
actual files exist
paths are normalized
hashes match
manifest agrees with VFS
```

---

## Tester

Require:

```text
# Test Report
## Result
PASS | FAIL
VerificationRun reference
workspace hash
test results
```

---

## Debugger

Require:

```text
# Debug Report
## Result
PASS
root cause
changes
repair status
```

---

## Security

Require:

```text
# Security Report
## Result
PASS
findings
workspace hash
```

---

## Reviewer

Require:

```text
# Review Report
## Result
PASS
review findings
workspace hash / dependency fingerprint
```

---

# 17. Phase 13 — Specification Contradiction Gate

Before generation begins, validate the canonical specification itself.

Examples that must fail:

```text
Authentication: None

AND

User logs in to access personal state
```

or:

```text
Database: PostgreSQL

AND

MongoDB collection semantics required
```

or:

```text
Build Tool: Vite

AND

Next.js App Router is mandatory
```

or:

```text
Frontend entry: src/pages/index.tsx

AND

generated architecture silently changes it to src/main.tsx
```

The system should either:

```text
reject contradiction
```

or:

```text
explicitly resolve contradiction through a user-facing decision
```

It must not silently invent a resolution.

---

# 18. Phase 14 — Preserve Explicit Architecture

For every generated contract, preserve explicit values from the original specification.

The normalization hierarchy must be:

```text
Explicit user specification
        >
canonical contract defaults
        >
agent inference
```

Agent inference is the weakest source.

If the user explicitly says:

```text
Vite
```

the agent cannot replace it with:

```text
Webpack
```

unless the pipeline explicitly records and approves the architectural change.

---

# 19. Phase 15 — Artifact Dependency Invalidation

When an accepted artifact changes:

```text
find all downstream artifacts
```

using contract dependencies.

Example:

```text
requirements.md
      ↓
architecture.md
      ↓
backend_spec.md
      ↓
blueprint.md
      ↓
workspace.manifest.json
      ↓
test_report.md
      ↓
security_report.md
      ↓
review_report.md
```

If:

```text
requirements.md
```

changes:

```text
everything downstream becomes stale
```

unless it is independently proven compatible.

---

# 20. Phase 16 — Artifact Provenance Completeness

Every accepted artifact must record:

```text
conversationId
pipelineRunId
stageExecutionId
stage
filePath
version
contentHash
contractName
contractVersion
validatorVersion
promptVersion
parentArtifactIds
dependencyFingerprint
createdAt
```

Do not allow partial provenance for canonical artifacts.

---

# 21. Phase 17 — StageExecution Correctness

Every stage attempt must produce:

```text
RUNNING
   ↓
VALIDATING
   ↓
ACCEPTED
```

or:

```text
RUNNING
   ↓
VALIDATING
   ↓
FAILED
```

No stage should remain:

```text
RUNNING
```

after pipeline termination.

Add cleanup/reconciliation for interrupted executions.

---

# 22. Phase 18 — Lease Heartbeat

The existing heartbeat must run throughout the entire pipeline.

Required behavior:

```text
start lease
   ↓
start heartbeat
   ↓
stage execution
   ↓
heartbeat
   ↓
next stage
   ↓
heartbeat
   ↓
verification
   ↓
final gate
   ↓
completion
   ↓
stop heartbeat
   ↓
release lease
```

The heartbeat interval must be comfortably below lease expiry.

Do not set:

```text
lease = 60 seconds
stage timeout = 180 seconds
```

without heartbeat.

---

# 23. Phase 19 — Lease Loss Must Abort Work

If heartbeat detects ownership loss:

```text
abort current stage
```

Do not:

```text
continue model generation
commit artifact
mark completed
```

The lease is the ownership boundary.

---

# 24. Phase 20 — Final Gate Must Be the Only Completion Authority

Search repository-wide for:

```text
status: 'Completed'
```

The only production path allowed to set pipeline completion should be:

```text
final gate
```

Any other completion transition must be removed or explicitly classified as non-pipeline metadata.

---

# 25. Phase 21 — Test the Full Pipeline Contract

Add tests covering the following.

## Test A — Happy Path

```text
Queen
→ Planner
→ Architect
→ System
→ Designer
→ Blueprinter
→ Coder
→ Tester PASS
→ Security PASS
→ Reviewer PASS
→ Completed
```

Expected:

```text
PASS
```

---

## Test B — Tester Failure

```text
Coder
→ Tester FAIL
```

Expected:

```text
Debugger required
Completed = false
```

---

## Test C — Debugger Repair

```text
Tester FAIL
→ Debugger
→ workspace changes
→ Tester PASS
```

Expected:

```text
PASS
```

---

## Test D — Stale Verification

```text
Tester PASS
→ Debugger changes workspace
→ no retest
```

Expected:

```text
FINAL GATE FAIL
```

---

## Test E — Missing Coder Artifact

```text
VFS contains source files
Coder artifact missing
```

Expected:

```text
FINAL GATE FAIL
```

No legacy VFS fallback.

---

## Test F — Security Failure

```text
Security FAIL
```

Expected:

```text
Completed = false
```

---

## Test G — Reviewer Failure

```text
Reviewer FAIL
```

Expected:

```text
Completed = false
```

---

## Test H — Lease Loss

Simulate:

```text
lease owner changed
```

Expected:

```text
current stage aborts
pipeline cannot complete
```

---

## Test I — Dependency Drift

```text
requirements.md v1
→ architecture.md v1

requirements.md v2
```

Expected:

```text
architecture v1 becomes stale
```

---

## Test J — Hash Tampering

Modify accepted artifact content without changing stored hash.

Expected:

```text
resolveAcceptedStageInputs() FAIL
```

---

## Test K — Authentication Contradiction

Input:

```text
Authentication: None
```

Acceptance:

```text
users log in
```

Expected:

```text
spec validation FAIL
```

---

## Test L — Vite / React / Express / Prisma Preservation

Input explicitly declares:

```text
React
Vite
Express
PostgreSQL
Prisma
src/pages/index.tsx
server/app.js
Authentication: None
```

Expected generated contracts preserve all of them.

---

# 26. Phase 22 — Contract Registry Invariant Test

Add one test that reconstructs the entire stage graph from the registry.

For every stage verify:

```text
stage name
input artifacts
output artifact
contract name
contract version
producer
consumer
```

Then assert:

```text
every consumed artifact has exactly one canonical producer
```

unless intentionally declared otherwise.

---

# 27. Phase 23 — Artifact Filename Invariant

The repository must have one authoritative mapping.

Expected:

```text
Queen       → plan.md
Planner     → requirements.md
Architect   → architecture.md
System      → backend_spec.md
Designer    → ui_spec.md
Blueprinter → blueprint.md
Coder       → workspace.manifest.json
Tester      → test_report.md
Debugger    → debug_report.md
Security    → security_report.md
Reviewer    → review_report.md
```

No other registry should redefine this mapping.

Search for:

```text
requirements.md
plan.md
system_spec.md
backend_spec.md
blueprint.json
blueprint.md
workspace.manifest.json
debugger_report.md
debug_report.md
reviewer_report.md
review_report.md
```

Any conflicting mapping must be removed.

---

# 28. Phase 24 — Eliminate Duplicate Contract Definitions

Search for:

```text
STAGE_ARTIFACT_DEPS
VFS_OUTPUT_MAP
CONTRACT_VERSIONS
STAGE_CONTRACTS
stage input definitions
```

Canonical ownership:

```text
contracts/versions.ts
        ↓
contracts/registry.ts
```

The orchestrator consumes these.

It does not redefine them.

---

# 29. Phase 25 — Eliminate Direct Artifact Writes

Repository-wide search:

```text
writeVirtualFile(
```

Classify:

### Allowed

Infrastructure projection:

```text
artifact-store
VFS projection layer
workspace patch layer
```

### Forbidden

Stage code doing:

```text
generate
→ write arbitrary output
→ call it accepted
```

Canonical stage output must flow through:

```text
contract executor
→ artifact store
→ projection
```

---

# 30. Phase 26 — Canonical Call Graph

The production call graph must converge to:

```text
runOrchestrator()
    │
    ├── acquirePipelineLease()
    ├── startLeaseHeartbeat()
    │
    ├── for each stage:
    │       │
    │       └── executeContractStage()
    │               ├── getStageContract()
    │               ├── resolveAcceptedStageInputs()
    │               ├── assertPipelineLease()
    │               ├── runAgent()
    │               ├── validateStageCandidate()
    │               ├── validateInputCompatibility()
    │               ├── commitAcceptedArtifact()
    │               └── projectArtifact()
    │
    ├── verification loop
    │       ├── Tester
    │       ├── Debugger if required
    │       └── Tester again
    │
    ├── Security
    ├── Reviewer
    │
    ├── assertPipelineLease()
    ├── evaluateFinalPipelineGate()
    ├── mark Completed
    ├── stopLeaseHeartbeat()
    └── releasePipelineLease()
```

No alternate production branch should bypass the artifact lifecycle.

---

# 31. Phase 27 — Error Handling Rules

Every stage failure must produce:

```text
StageExecution = FAILED
GateDecision = FAIL
PipelineEvent = failure event
```

and preserve:

```text
error message
attempt
candidate hash if available
upstream artifact IDs
```

Do not swallow errors with:

```ts
catch(() => {})
```

unless the swallowed error is explicitly non-critical cleanup.

---

# 32. Phase 28 — Retry Semantics

Retries must create new:

```text
StageExecution
attempt = N + 1
```

They must not overwrite the previous execution record.

Accepted artifact versions must remain auditable.

Example:

```text
Architect attempt 1 → FAILED
Architect attempt 2 → ACCEPTED
```

The final artifact points to attempt 2.

Attempt 1 remains visible.

---

# 33. Phase 29 — Acceptance Must Be Atomic

A stage must not become partially accepted.

The accepted transaction should conceptually include:

```text
artifactVersion
stageExecution state
gate decision
provenance
VFS projection
```

where the current database architecture permits atomicity.

If VFS projection is not transactional, record projection status explicitly.

Do not claim artifact acceptance before projection succeeds.

---

# 34. Phase 30 — Projection State

If artifact storage and VFS projection are separate operations, model:

```text
ACCEPTED
PROJECTED
```

or equivalent metadata.

At minimum, the pipeline must be able to detect:

```text
accepted artifact exists
but workspace projection failed
```

and repair it before proceeding.

---

# 35. Phase 31 — Security and Reviewer Must Consume Current Workspace

Security and Reviewer must not evaluate stale source.

Their inputs must include:

```text
workspace.manifest.json
```

and its hash.

Their accepted reports must record the same workspace hash.

---

# 36. Phase 32 — Final Gate Algorithm

Implement the final gate conceptually as:

```ts
async function evaluateFinalPipelineGate(
  conversationId: string,
  pipelineRunId: string,
  leaseOwnerId: string
) {
  const errors: string[] = [];

  // 1. Lease
  await assertPipelineLease(conversationId, leaseOwnerId);

  // 2. Mandatory accepted artifacts
  requireAccepted(...);

  // 3. Current workspace manifest
  requireCurrentWorkspaceManifest(...);

  // 4. Current successful VerificationRun
  requireVerificationForCurrentWorkspace(...);

  // 5. Security PASS for current workspace
  requireSecurityPassForCurrentWorkspace(...);

  // 6. Reviewer PASS for current dependency/workspace state
  requireReviewerPass(...);

  // 7. Conditional Debugger acceptance
  if (debuggerWasInvoked) {
    requireAcceptedDebuggerArtifact(...);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

The final gate must not mutate the pipeline into `Completed`.

It should return a decision.

The orchestrator owns the completion transaction.

---

# 37. Phase 33 — Completion Algorithm

Final orchestrator sequence:

```ts
await assertPipelineLease(...);

const gate = await evaluateFinalPipelineGate(...);

if (!gate.valid) {
  throw new Error(...);
}

await prisma.$transaction(async (tx) => {
  // verify ownership again if transaction model allows
  // mark pipeline run complete
  // mark conversation complete
});

await stopLeaseHeartbeat(...);
await releasePipelineLease(...);
```

Do not release the lease before completion state is persisted.

---

# 38. Phase 34 — Repository-Wide Static Audit

Run searches for:

```text
status: 'Completed'
status: "Completed"

writeVirtualFile(
runAgent(
generateStageCandidate(
commitAcceptedArtifact(
workspace.manifest.json
blueprint.json
system_spec.md
debugger_report.md
reviewer_report.md

VFS_OUTPUT_MAP
STAGE_ARTIFACT_DEPS
CONTRACT_VERSIONS
STAGE_CONTRACTS
```

Produce a temporary audit report.

Every result must be classified:

```text
canonical
legacy
duplicate
dead
required refactor
```

Delete dead infrastructure after proving it is unused.

---

# 39. Phase 35 — Required Build / Type Checks

Run:

```bash
npx tsc --noEmit
```

Must return:

```text
0 errors
```

Run:

```bash
npm run build
```

Must succeed.

Run:

```bash
npm run lint
```

if configured and operational.

Do not treat TypeScript success as proof of pipeline correctness.

---

# 40. Phase 36 — Required Contract Tests

Add or run tests for:

```text
registry
versions
artifact dependencies
compatibility
stage validators
artifact store
lease
final gate
verification loop
workspace manifest
spec contradiction detection
```

The existing test count is not sufficient by itself.

Tests must cover the failure paths listed in this document.

---

# 41. Phase 37 — Regression Fixture: Kanban 2.0

Use the known Kanban 2.0 fixture.

Expected architecture:

```text
Frontend: React
Frontend Entry Point: src/pages/index.tsx
Backend: Express
Backend Entry Point: server/app.js
Database: PostgreSQL
ORM: Prisma
Authentication: None
Build Tool: Vite
Additional: React DnD
```

Expected module ownership:

```text
Frontend Application
→ src/pages/index.tsx

Backend Server
→ server/app.js

Database Schema
→ prisma/schema.prisma
```

Expected project structure:

```text
project-root/
├── index.html
├── package.json
├── vite.config.js
├── tsconfig.json
├── src/
│   └── pages/
│       └── index.tsx
├── server/
│   └── app.js
└── prisma/
    └── schema.prisma
```

The pipeline must preserve these explicit choices.

---

# 42. Phase 38 — Kanban Authentication Contradiction

The same fixture contains:

```text
Authentication: None
```

but also:

```text
User's board state should be accessible from any browser
session where they log in
```

This must be surfaced as a specification contradiction.

Expected result:

```text
SPEC_CONTRADICTION
```

with an actionable error:

```text
Authentication is explicitly declared as None,
but acceptance criteria require logged-in browser sessions.
```

Do not let downstream agents decide this independently.

---

# 43. Phase 39 — No Silent Architecture Mutation

For every explicit architecture field, add an invariant:

```text
declared == generated
```

unless there is a recorded architecture-change decision.

Track changes such as:

```text
React → Next.js
Vite → Webpack
PostgreSQL → MongoDB
Prisma → Drizzle
Express → Fastify
```

as explicit deviations.

---

# 44. Phase 40 — Definition of Done

This work is complete only when all of the following are true.

## Contracts

- [ ] One canonical stage registry
- [ ] One canonical artifact mapping
- [ ] One canonical contract version table
- [ ] No duplicate stage dependency map
- [ ] No conflicting VFS output map
- [ ] Input contracts validated
- [ ] Output contracts validated
- [ ] Dependency fingerprints enforced

## Executor

- [ ] All stages use `executeContractStage()`
- [ ] Tester no longer bypasses executor
- [ ] Debugger no longer bypasses executor
- [ ] No duplicate candidate-generation path
- [ ] `runAgent()` remains inference-only
- [ ] Accepted artifact lifecycle is canonical

## Coder

- [ ] Coder target-file semantics implemented
- [ ] Workspace manifest schema exists
- [ ] Manifest derived from actual VFS
- [ ] Manifest hashes match files
- [ ] Manifest is committed as canonical Coder artifact

## Verification

- [ ] Tester produces canonical report
- [ ] VerificationRun links to Tester execution
- [ ] Debugger repairs through VFS
- [ ] Debugger produces canonical report
- [ ] Debugger-triggered changes invalidate stale verification
- [ ] Retest occurs after repairs
- [ ] Oscillation detection works
- [ ] Retry limit enforced

## Final Gate

- [ ] Queen required
- [ ] Planner required
- [ ] Architect required
- [ ] System required
- [ ] Designer required
- [ ] Blueprinter required
- [ ] Coder required
- [ ] Tester required
- [ ] Security required
- [ ] Reviewer required
- [ ] Debugger required only when invoked
- [ ] No legacy VFS fallback
- [ ] VerificationRun required
- [ ] Verification matches current workspace
- [ ] Security matches current workspace
- [ ] Reviewer matches current state
- [ ] Lease ownership valid
- [ ] Only final gate permits completion

## Lease

- [ ] Lease acquired before pipeline
- [ ] Heartbeat active
- [ ] Lease checked before stage execution
- [ ] Lease loss aborts execution
- [ ] Lease still valid at final gate
- [ ] Completion committed before release
- [ ] Heartbeat stopped after completion/failure
- [ ] Lease released after state transition

## Specification

- [ ] Authentication contradictions detected
- [ ] Explicit tech stack preserved
- [ ] Explicit entry points preserved
- [ ] Explicit module ownership preserved
- [ ] No silent framework substitutions

## Testing

- [ ] Happy path
- [ ] Tester failure
- [ ] Debugger repair
- [ ] stale verification
- [ ] missing Coder artifact
- [ ] Security failure
- [ ] Reviewer failure
- [ ] lease loss
- [ ] dependency drift
- [ ] hash tampering
- [ ] auth contradiction
- [ ] Kanban 2.0 architecture preservation

---

# 45. Final Target Architecture

After this implementation, the system should have exactly these authorities:

```text
CONTRACTS
contracts/versions.ts
contracts/registry.ts
        │
        ▼
EXECUTION
contract-executor.ts
        │
        ▼
ARTIFACT STATE
artifact-store.ts
        │
        ├── ArtifactVersion
        ├── provenance
        ├── hashes
        └── dependency fingerprints
        │
        ▼
WORKSPACE
VFS
        │
        ▼
VERIFICATION
verification-loop.ts
        │
        ├── Tester
        ├── Debugger
        └── Tester
        │
        ▼
SECURITY
        │
        ▼
REVIEWER
        │
        ▼
FINAL GATE
final-gate.ts
        │
        ▼
COMPLETED
```

The orchestrator should be a coordinator, not a second implementation of every subsystem.

---

# 46. Priority Order for Implementation

Do the work in this exact order.

```text
P0-1  Fix Coder workspace/manifest semantics
P0-2  Remove Tester bypass
P0-3  Remove Debugger bypass
P0-4  Fix compatibility direction
P0-5  Fix final-gate lease semantics
P0-6  Remove final-gate legacy fallbacks

P1-1  Make Debugger conditional final dependency
P1-2  Enforce workspace-hash/current-verification relationship
P1-3  Strengthen Coder manifest validation
P1-4  Remove duplicate candidate-generation path
P1-5  Separate runAgent from pipeline semantics
P1-6  Add dependency invalidation

P2-1  Add specification contradiction gate
P2-2  Preserve explicit architecture
P2-3  Strengthen all stage validators
P2-4  Add provenance completeness checks
P2-5  Add stage execution reconciliation

P3-1  Add complete regression suite
P3-2  Run static duplicate-path audit
P3-3  Run TypeScript/build/lint
P3-4  Run Kanban 2.0 end-to-end fixture
P3-5  Final repository architecture audit
```

---

# 47. Anti-Patterns Explicitly Forbidden

Do not fix these problems by introducing another layer.

Forbidden:

```text
NewArtifactStore
NewContractRegistry
NewPipelineExecutor
NewVerificationManager
NewFinalGate
NewWorkspaceManager
NewLeaseManager
```

Also forbidden:

```text
if canonical fails:
    use old VFS behavior
```

or:

```text
if artifact missing:
    infer success from files
```

or:

```text
if validator fails:
    accept based on content length
```

or:

```text
if Tester fails:
    let Debugger directly mutate workspace
```

or:

```text
if architecture conflicts:
    let the next agent decide
```

The entire point of the canonical architecture is to remove these escape routes.

---

# 48. Expected End State

A generated project should have this lifecycle:

```text
SPEC
 ↓
Queen
 ↓
plan.md
 ↓
Planner
 ↓
requirements.md
 ↓
Architect
 ↓
architecture.md
 ↓
System
 ↓
backend_spec.md
 ↓
Designer
 ↓
ui_spec.md
 ↓
Blueprinter
 ↓
blueprint.md
 ↓
Coder
 ↓
workspace.manifest.json
 + actual VFS workspace
 ↓
Tester
 ├── PASS ────────────────┐
 │                        │
 └── FAIL                 │
      ↓                   │
   Debugger               │
      ↓                   │
   VFS patch              │
      ↓                   │
   new manifest            │
      ↓                   │
   Tester ─────────────────┘
 ↓
Security
 ↓
Reviewer
 ↓
FINAL GATE
 ↓
Completed
```

Every arrow must represent a validated contract boundary.

Every accepted artifact must be traceable.

Every workspace mutation must be observable.

Every verification result must correspond to the current workspace.

Every stage must be owned by the pipeline lease.

And only one authority may declare the pipeline complete.

---

# 49. Final Implementation Principle

The remaining work is fundamentally about **convergence**.

AutoCoder already has most of the infrastructure required:

```text
contracts
registry
artifact versions
hashes
dependency fingerprints
leases
heartbeats
stage execution
validation
verification
final gate
VFS
```

The remaining task is to make those systems **actually authoritative**.

Do not add more architecture.

Remove ambiguity.

Remove bypasses.

Remove fallbacks.

Remove duplicate ownership.

Make the existing canonical path impossible to bypass.

That is the finish line.
