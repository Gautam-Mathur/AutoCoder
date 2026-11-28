# AutoCoder — Canonical Contract & Generation Pipeline Enforcement Implementation Plan

> **Status:** Implementation Plan  
> **Priority:** P0 → P1 → P2  
> **Scope:** Canonical contracts, stage generation, artifact acceptance, provenance, verification/repair, lease enforcement, quality gates, final pipeline completion  
> **Primary repository:** `Gautam-Mathur/AutoCoder`  
> **Target:** Make the contract registry and the actual generation pipeline represent **one authoritative execution model**  
> **Implementation principle:** Do not create parallel infrastructure when an existing validator, artifact store, gate, or persistence model already performs the required responsibility.

---

# 0. Executive Objective

AutoCoder currently contains most of the infrastructure required for a deterministic, contract-driven generation pipeline:

- canonical contract definitions
- stage registry
- artifact versions
- stage executions
- pipeline leases
- gate decisions
- contract fingerprints
- dependency fingerprints
- candidate generation
- artifact compatibility
- verification runs
- deterministic project validators
- security and quality gates

The problem is not primarily that the infrastructure is missing.

The problem is that **the infrastructure is not yet the actual execution path**.

There are currently multiple partially competing representations of the pipeline:

```text
Contract Registry
      │
      ├── knows one set of artifacts
      │
      └── knows one set of dependencies

Orchestrator
      │
      ├── has its own STAGE_ARTIFACT_DEPS
      ├── has its own VFS_OUTPUT_MAP
      ├── directly writes VFS
      ├── has bespoke Architect validation
      ├── has bespoke Tester execution
      ├── has bespoke Debugger execution
      └── only partially uses artifact acceptance

Artifact Store
      │
      └── exists, but only some stages use it

Stage Acceptance
      │
      └── exists, but is not the universal production gate

Compatibility
      │
      └── exists, but is not enforced before every acceptance

Verification Loop
      │
      └── exists, but is not the canonical Tester/Debugger path

Final Gate
      │
      └── exists, but is not called before Completed
```

This creates the exact failure mode the system is supposed to prevent:

> The codebase contains a canonical architecture, but the runtime can still bypass it.

The objective of this implementation is therefore:

```text
ONE REGISTRY
     ↓
ONE STAGE CONTRACT
     ↓
ONE INPUT RESOLUTION PATH
     ↓
ONE CANDIDATE GENERATION PATH
     ↓
ONE VALIDATION PATH
     ↓
ONE COMPATIBILITY PATH
     ↓
ONE ACCEPTANCE PATH
     ↓
ONE ARTIFACT STORE
     ↓
VFS AS PROJECTION
     ↓
VERIFICATION
     ↓
SECURITY
     ↓
REVIEW
     ↓
FINAL GATE
     ↓
COMPLETED
```

Nothing should be able to jump around this sequence.

---

# 1. Non-Negotiable Design Rules

These rules govern every implementation decision in this document.

## Rule 1 — The registry is the source of truth

Stage names, artifact names, dependencies, contract versions, validator versions, prompt versions, and expected artifact paths must not be independently redefined in the orchestrator.

If the same information exists in:

```text
contracts/registry.ts
contracts/versions.ts
orchestrator.ts
```

then there must be exactly one authoritative value.

The orchestrator consumes it.

It does not redefine it.

---

## Rule 2 — Generated content is not automatically accepted content

Generation produces a **candidate**.

A candidate becomes an authoritative artifact only after:

1. candidate generation
2. structural validation
3. semantic/deterministic validation
4. contract compatibility validation
5. dependency validation
6. acceptance decision
7. persistence
8. promotion/projection

Therefore:

```text
generated != accepted
```

and:

```text
generated != authoritative
```

---

## Rule 3 — VFS is not the specification database

The VFS should represent the current accepted/projected workspace.

It must not become a second competing source of stage state.

The authoritative stage artifact is:

```text
ArtifactVersion(state = ACCEPTED)
```

The VFS is the projection of accepted artifacts and generated workspace files.

---

## Rule 4 — Every stage execution must be persisted

Every stage must produce a `StageExecution`.

No special cases.

No:

```ts
if (stage === 'Architect') {
   // special persistence
}
```

No:

```ts
// Tester is different because it is deterministic
```

No:

```ts
// Coder writes directly to workspace
```

Every stage follows the same lifecycle.

---

## Rule 5 — Specialized validation is allowed, duplicate orchestration is not

Existing validators should be retained.

For example:

```text
validateArchitectureArtifact()
validateProjectContract()
validateBlueprintGraph()
validateGeneratedProject()
validatePackageDependencies()
validatePrismaUsage()
validateApiContracts()
validateFrameworkBoundaries()
validateSecurityGate()
evaluateQualityGate()
```

These should become validators invoked by the canonical stage acceptance system.

Do **not** rewrite them merely to make the architecture look cleaner.

The objective is to centralize orchestration, not duplicate validation logic.

---

## Rule 6 — Pipeline completion is impossible without the final gate

The pipeline must not execute:

```ts
conversation.status = 'Completed'
```

until:

```ts
evaluateFinalPipelineGate(...)
```

returns success.

The final gate is the last authority.

---

## Rule 7 — A failed lease means the current execution loses authority

If the persistent lease expires or renewal fails:

```text
STOP PIPELINE
DO NOT CONTINUE GENERATING
DO NOT COMMIT
DO NOT PROMOTE
DO NOT MARK COMPLETED
```

A stale worker must never continue mutating the canonical pipeline.

---

# 2. Current Architecture Audit

## 2.1 Existing infrastructure that should be retained

The following infrastructure already exists and should be reused.

### Contracts

```text
src/lib/agents/ruflo/contracts.ts
src/lib/agents/ruflo/spec-contract.ts
src/lib/agents/ruflo/contracts/versions.ts
src/lib/agents/ruflo/contracts/registry.ts
src/lib/agents/ruflo/contracts/compatibility.ts
src/lib/agents/ruflo/contracts/fingerprints.ts
```

### Validation

```text
src/lib/agents/ruflo/module-resolver.ts
src/lib/agents/ruflo/dependency-validator.ts
src/lib/agents/ruflo/project-validator.ts
src/lib/agents/ruflo/prisma-validator.ts
src/lib/agents/ruflo/api-contract-validator.ts
src/lib/agents/ruflo/framework-validator.ts
src/lib/agents/ruflo/runtime-validator.ts
src/lib/agents/ruflo/security-gate.ts
src/lib/agents/ruflo/quality-gate.ts
```

### Persistence

```text
src/lib/agents/ruflo/artifact-store.ts
src/lib/agents/ruflo/stage-acceptance.ts
src/lib/agents/ruflo/pipeline-lease.ts
src/lib/agents/ruflo/final-gate.ts
src/lib/agents/ruflo/verification-loop.ts
```

### Database models

The existing Prisma models are sufficient primitives:

```text
PipelineRun
StageExecution
ArtifactVersion
PipelineEvent
GateDecision
VerificationRun
VirtualFile
```

The implementation should wire these together rather than inventing replacement models.

---

# 3. Current Architectural Problems

## P0-1 — Contract versions disagree with the actual pipeline

Current `contracts/versions.ts` maps:

```text
Queen       → requirements.md
Planner     → plan.md
Architect   → architecture.md
System      → system_spec.md
Designer    → ui_spec.md
Blueprinter → blueprint.json
Coder       → workspace
Tester      → test_report.md
Debugger    → debugger_report.md
Reviewer    → reviewer_report.md
Security    → security_report.md
```

However the actual orchestrator/VFS mapping is:

```text
Queen       → plan.md
Planner     → requirements.md
Architect   → architecture.md
System      → backend_spec.md
Designer    → ui_spec.md
Blueprinter → blueprint.md
Coder       → workspace
Tester      → test_report.md
Debugger    → debug_report.md
Security    → security_report.md
Reviewer    → review_report.md
```

This is not cosmetic.

Artifact names participate in:

- dependency resolution
- artifact lookup
- persistence
- provenance
- acceptance
- downstream context construction
- compatibility
- tests
- recovery

Therefore the mismatch can cause a valid artifact to appear missing or cause the wrong artifact to be injected into a downstream stage.

---

# 4. Canonical Stage Artifact Matrix

The following matrix becomes the target implementation.

| Stage | Canonical Output | Output Type | Accepted Artifact? | Downstream Authority |
|---|---|---|---|---|
| Queen | `plan.md` | Markdown | Yes | Planner |
| Planner | `requirements.md` | Markdown | Yes | Architect |
| Architect | `architecture.md` | Markdown | Yes | System / Designer / downstream |
| System | `backend_spec.md` | Markdown | Yes | Blueprinter / Coder |
| Designer | `ui_spec.md` | Markdown | Yes | Blueprinter / Coder |
| Blueprinter | `blueprint.md` | Markdown | Yes | Coder |
| Coder | `workspace.manifest.json` | JSON | Yes | Tester / Security / Reviewer |
| Tester | `test_report.md` | Markdown | Yes | Debugger / Reviewer |
| Debugger | `debug_report.md` | Markdown | Yes | Tester / pipeline state |
| Security | `security_report.md` | Markdown | Yes | Final Gate |
| Reviewer | `review_report.md` | Markdown | Yes | Final Gate |

---

# 5. IMPORTANT: Coder Artifact Semantics

The Coder stage is different from documentation stages.

Coder generates actual project files.

Therefore the canonical artifact should not be:

```text
workspace
```

as an opaque artifact.

The authoritative Coder artifact should be:

```text
workspace.manifest.json
```

The manifest records the workspace projection.

Example:

```json
{
  "schemaVersion": "1.0.0",
  "files": [
    {
      "path": "src/pages/index.tsx",
      "contentHash": "sha256:...",
      "size": 4821
    },
    {
      "path": "server/app.js",
      "contentHash": "sha256:...",
      "size": 3182
    }
  ]
}
```

The actual source files remain in VFS.

The manifest tells the pipeline:

> This is the exact workspace that the Coder stage claims to have produced and that downstream verification is expected to validate.

This gives Tester, Security, Reviewer, recovery, and final-gate logic a deterministic workspace identity.

---

# 6. Phase 0 — Freeze the Canonical Model

Before changing execution logic, create a single canonical matrix.

Do not start editing random orchestrator branches first.

Create a document/test fixture representing:

```text
Stage
Contract Name
Contract Version
Prompt Version
Validator Version
Input Artifacts
Output Artifact
Output Path
Required Validators
Required Gate
Parent Artifacts
```

This matrix becomes the implementation contract.

---

# 7. Phase 1 — Fix `contracts/versions.ts`

## File

```text
src/lib/agents/ruflo/contracts/versions.ts
```

## Replace incorrect mappings

Target:

```ts
Queen.outputArtifactName = 'plan.md'
Planner.outputArtifactName = 'requirements.md'
Architect.outputArtifactName = 'architecture.md'
System.outputArtifactName = 'backend_spec.md'
Designer.outputArtifactName = 'ui_spec.md'
Blueprinter.outputArtifactName = 'blueprint.md'
Coder.outputArtifactName = 'workspace.manifest.json'
Tester.outputArtifactName = 'test_report.md'
Debugger.outputArtifactName = 'debug_report.md'
Security.outputArtifactName = 'security_report.md'
Reviewer.outputArtifactName = 'review_report.md'
```

Do not rename the existing physical source files unnecessarily.

The canonical artifact for Coder is the manifest.

The physical project remains in VFS.

---

# 8. Phase 2 — Fix `contracts/registry.ts`

## File

```text
src/lib/agents/ruflo/contracts/registry.ts
```

The registry must become the single source of truth for:

```text
stage
inputs
output
contract name
version
prompt version
validator version
```

The orchestrator must be able to ask:

```ts
getStageContract('Architect')
```

and receive everything needed to execute Architect.

It should not then need:

```ts
STAGE_ARTIFACT_DEPS.Architect
```

from another file.

---

# 9. Phase 3 — Remove Duplicate `STAGE_ARTIFACT_DEPS`

## File

```text
src/lib/agents/ruflo/orchestrator.ts
```

Current problem:

```ts
STAGE_ARTIFACT_DEPS
```

duplicates contract dependency information.

Delete the duplicate definition after migration.

Replace it with:

```ts
const contract = getStageContract(stageName);

const requiredInputs = contract.inputs;
```

The orchestrator should never manually know:

```text
Architect needs requirements.md
System needs architecture.md
...
```

The registry knows.

---

# 10. Phase 4 — Remove Duplicate VFS Artifact Semantics

There may still be a legitimate need for a VFS output mapping for projection.

However it must not represent a second contract system.

Create one resolver:

```ts
getStageOutputPath(stageName)
```

which reads the registry.

Example:

```ts
const contract = getStageContract(stageName);

return contract.outputArtifactName;
```

If VFS projection needs a special physical path, that distinction should be explicit:

```text
artifactPath
projectionPath
```

Do not silently encode the difference in separate maps.

---

# 11. Phase 5 — Implement `resolveAcceptedStageInputs()`

Create or add to:

```text
src/lib/agents/ruflo/artifact-store.ts
```

or a dedicated contract execution module.

Recommended API:

```ts
resolveAcceptedStageInputs({
  conversationId,
  pipelineRunId,
  stageName
})
```

The resolver must:

1. Load the stage contract.
2. Read required input artifacts.
3. Locate the latest accepted ArtifactVersion.
4. Verify artifact path.
5. Verify contract name.
6. Verify contract version.
7. Verify content hash.
8. Verify dependency fingerprint if required.
9. Verify artifact is not superseded.
10. Return the authoritative artifact content.

Conceptually:

```text
Stage
  ↓
Registry
  ↓
Required Inputs
  ↓
ArtifactVersion
  ↓
state === ACCEPTED
  ↓
contract matches
  ↓
version compatible
  ↓
hash valid
  ↓
dependency fingerprint valid
  ↓
Input Context
```

---

# 12. Phase 6 — Never Build Stage Context Directly From Arbitrary VFS Files

Current behavior should be audited for code that effectively does:

```ts
readVfs('requirements.md')
```

and treats that as authoritative stage state.

That is unsafe.

The correct sequence is:

```text
ArtifactVersion
     ↓
accepted artifact
     ↓
artifact content
     ↓
stage context
```

VFS is only used for workspace/project content.

---

# 13. Phase 7 — Define Candidate Lifecycle

Every stage should follow:

```text
PENDING
  ↓
RUNNING
  ↓
GENERATING
  ↓
CANDIDATE_CREATED
  ↓
VALIDATING
  ↓
COMPATIBILITY_CHECK
  ↓
ACCEPTED
  ↓
COMMITTED
  ↓
PROJECTED
```

Failure:

```text
VALIDATING
   ↓
FAILED
   ↓
RETRYING
```

or:

```text
COMPATIBILITY_CHECK
   ↓
FAILED
   ↓
RETRYING
```

The candidate must never become authoritative before acceptance.

---

# 14. Phase 8 — Implement Canonical `executeContractStage()`

Create a single orchestration function.

Recommended location:

```text
src/lib/agents/ruflo/contract-executor.ts
```

Potential signature:

```ts
executeContractStage({
  conversationId,
  pipelineRunId,
  stageName,
  attempt,
  signal
})
```

The function must perform the following exact sequence.

---

## Step 8.1 — Acquire stage contract

```ts
const contract = getStageContract(stageName);
```

If no contract exists:

```text
FAIL PIPELINE
```

Do not silently continue.

---

## Step 8.2 — Assert pipeline lease

Before generating anything:

```ts
assertPipelineLease(...)
```

If the current worker is not owner:

```text
Abort stage
Do not generate
Do not commit
```

---

## Step 8.3 — Resolve accepted inputs

```ts
const inputs = await resolveAcceptedStageInputs(...)
```

If a required input is missing:

```text
Stage cannot start.
```

Do not let the model hallucinate the missing artifact.

---

## Step 8.4 — Create `StageExecution`

Create:

```text
StageExecution
state = RUNNING
stageName
attempt
```

Record:

```text
startedAt
pipelineRunId
```

---

## Step 8.5 — Generate candidate

Call the existing generation mechanism.

Output:

```ts
{
  executionId,
  attempt,
  content,
  contentHash,
  generatedAt
}
```

At this point:

```text
candidate != accepted
```

---

## Step 8.6 — Persist candidate metadata

Update StageExecution:

```text
candidateHash
state = VALIDATING
```

Do not promote to ArtifactVersion yet.

---

## Step 8.7 — Run stage-specific validators

Call:

```ts
validateStageCandidate(...)
```

But strengthen that function so each stage has real validation.

---

# 15. Phase 9 — Strengthen `stage-acceptance.ts`

## File

```text
src/lib/agents/ruflo/stage-acceptance.ts
```

Current implementation is too weak.

Current problems include:

```ts
content.length > 50
```

being sufficient for Planner.

That is not validation.

A sufficiently long hallucination is still a hallucination.

---

# 16. Stage Validation Requirements

## 16.1 Queen

Validate:

- output is Markdown
- required project intent exists
- project scope exists
- requested functionality is represented
- constraints are preserved
- no contradictory architecture decisions are introduced
- expected plan heading/schema exists

---

## 16.2 Planner

Validate:

- requirements exist
- functional requirements exist
- non-functional requirements exist where specified
- acceptance criteria are preserved
- constraints are preserved
- no unsupported stack substitutions occur
- authentication requirements are represented
- persistence requirements are represented

The Planner must not simply pass because the output contains 50 characters.

---

## 16.3 Architect

Reuse:

```ts
validateArchitectureArtifact()
```

Also validate:

- architecture is compatible with requirements
- framework is compatible
- database is compatible
- ORM is compatible
- authentication is compatible
- entry points are preserved
- module boundaries are valid

---

## 16.4 System

Validate:

- backend specification exists
- backend framework matches contract
- server entry point exists
- API surface is defined
- persistence model is consistent
- authentication behavior is consistent
- database/ORM relationship is explicit

For:

```text
Express + PostgreSQL + Prisma
```

the generated backend specification must not silently become:

```text
MongoDB + Mongoose
```

because the LLM got creative.

---

## 16.5 Designer

Validate:

- UI requirements are represented
- declared frontend framework is preserved
- frontend entry point is preserved
- UI modules correspond to requirements
- state requirements are represented
- required interactions are represented

---

## 16.6 Blueprinter

Current implementation expects JSON.

That must be aligned with the canonical artifact:

```text
blueprint.md
```

If the actual blueprint format is intended to remain JSON internally, then the contract must explicitly define:

```text
blueprint.json
```

instead.

Do not leave:

```text
versions.ts → blueprint.json
orchestrator → blueprint.md
stage acceptance → JSON
```

simultaneously.

Pick one.

The current target is:

```text
blueprint.md
```

because that matches the current pipeline output.

Validation must verify:

- all modules exist
- all files have owners
- module boundaries are explicit
- dependencies are valid
- no circular ownership
- entry points exist
- generated structure agrees with architecture
- backend/frontend/database responsibilities are represented

---

# 17. Phase 10 — Coder Validation

Coder must validate two things separately:

## A. Workspace validity

Run:

```text
validateGeneratedProject
validatePackageDependencies
validatePrismaUsage
validateApiContracts
validateFrameworkBoundaries
runtime validation
```

## B. Workspace manifest validity

Generate:

```text
workspace.manifest.json
```

containing:

```text
schemaVersion
files[]
path
contentHash
size
```

The manifest must exactly represent the accepted VFS workspace.

---

# 18. Phase 11 — Tester Validation

Tester must not merely report:

```text
lint failed
```

It must produce a structured report.

The report should contain:

```text
workspace fingerprint
validation timestamp
files checked
lint result
cross-file import result
project validation
framework validation
runtime validation
database validation
API validation
overall result
failure list
```

The Tester artifact becomes:

```text
test_report.md
```

---

# 19. Phase 12 — Debugger Must Actually Repair

## File

```text
src/lib/agents/ruflo/verification-loop.ts
```

Current major bug:

```text
Tester fails
     ↓
Debugger is called
     ↓
Debugger generates response
     ↓
response is not actually applied to VFS
```

This makes the repair loop largely ceremonial.

That must be fixed.

---

# 20. Correct Verification Loop

The intended algorithm:

```text
START
  ↓
Compute workspace fingerprint
  ↓
Run Tester
  ↓
PASS?
 ├── YES → accept verification
 └── NO
       ↓
    Generate Debugger repair
       ↓
    Validate repair response
       ↓
    Apply repair to VFS
       ↓
    Recompute workspace fingerprint
       ↓
    Fingerprint changed?
      ├── NO → FAIL / oscillation
      └── YES
            ↓
         Run Tester again
```

Maximum repair cycles:

```text
3
```

or the configured retry limit.

---

# 21. Debugger Repair Contract

Debugger output must explicitly identify:

```text
files modified
changes applied
reason
test failures addressed
remaining known issues
```

Do not accept a generic essay as a repair.

A debugger response that says:

> “The issue appears to be related to imports.”

is not a repair artifact.

It must result in an actual VFS mutation.

---

# 22. Phase 13 — Verification Persistence

Every verification cycle must persist:

```text
VerificationRun
```

including:

```text
workspaceFingerprint
cycle
result
failures
repair attempt
timestamp
```

This enables:

- debugging
- reproducibility
- oscillation detection
- pipeline recovery
- auditability

---

# 23. Phase 14 — Eliminate Duplicate Tester/Debugger Execution

Once `verifyAndRepairWorkspace()` is fixed:

The orchestrator should no longer have an independent implementation of:

```text
Tester
Debugger
Tester
Debugger
```

that duplicates the verification loop.

There must be one canonical path.

The stage system may still record:

```text
Tester
Debugger
```

artifacts for provenance.

But the execution mechanism should be shared.

---

# 24. Phase 15 — Compatibility Enforcement

## File

```text
src/lib/agents/ruflo/contracts/compatibility.ts
```

The compatibility system currently exists but is not consistently called.

Every artifact acceptance must execute compatibility validation.

Minimum checks:

```text
contractName
contractVersion
contractHash
contentHash
persistedHash
validatorVersion
promptVersion
dependencyFingerprint
```

The sequence must be:

```text
Generate
  ↓
Validate
  ↓
Compatibility
  ↓
Accept
```

Never:

```text
Generate
  ↓
Accept
  ↓
Compatibility
```

---

# 25. Phase 16 — Artifact Commit

## File

```text
src/lib/agents/ruflo/artifact-store.ts
```

`commitAcceptedArtifact()` should remain the only authoritative artifact promotion function.

It should:

1. hash content
2. create ArtifactVersion
3. mark previous accepted version superseded
4. persist provenance
5. set state `ACCEPTED`
6. project to VFS if applicable

The VFS write must happen only after acceptance.

---

# 26. Phase 17 — Mandatory Provenance

Every accepted artifact must record:

```text
contractName
contractVersion
contractHash
validatorVersion
promptVersion
parentArtifactIds
dependencyFingerprint
contentHash
```

Do not allow these to remain optional for canonical pipeline artifacts.

If a required provenance field is missing:

```text
artifact acceptance fails
```

---

# 27. Phase 18 — Parent Artifact Provenance

When Architect is generated from:

```text
Queen
Planner
```

the ArtifactVersion must record the IDs of those accepted artifacts.

Example:

```text
Architect Artifact
    parentArtifactIds:
      - Queen ArtifactVersion ID
      - Planner ArtifactVersion ID
```

Then if Planner changes:

```text
Planner v2
```

the system can detect that:

```text
Architect v1
```

was generated against an older parent.

This is essential for preventing stale downstream artifacts.

---

# 28. Phase 19 — Dependency Fingerprints

The dependency fingerprint must represent the exact accepted upstream dependency set.

For example:

```text
Architect
  ↓
requirements@v4
plan@v3
```

produces one fingerprint.

If requirements changes:

```text
requirements@v5
```

the fingerprint changes.

Therefore:

```text
old Architect != valid current Architect
```

unless regenerated/revalidated according to the compatibility policy.

---

# 29. Phase 20 — Detect Cross-Stage Contract Drift

Add tests that fail if:

```text
versions.ts
```

and:

```text
registry.ts
```

disagree.

Also fail if registry output differs from actual pipeline projection.

The following must agree:

```text
Contract Versions
Registry
Artifact Store
Stage Acceptance
Orchestrator
VFS Projection
Tests
```

Do not maintain a manually synchronized list forever.

Where possible, derive values programmatically.

---

# 30. Phase 21 — Pipeline Lease Heartbeat

## File

```text
src/lib/agents/ruflo/pipeline-lease.ts
```

Current:

```text
LEASE_MS = 60_000
```

but stages can run:

```text
120–180 seconds
```

Therefore the lease can expire during valid work.

This is unsafe.

---

# 31. Lease Heartbeat Implementation

After acquiring the lease:

```text
start heartbeat
```

Recommended interval:

```text
20 seconds
```

The heartbeat calls:

```ts
renewPipelineLease(...)
```

every interval.

If renewal fails:

```text
abort controller
```

The current worker loses authority.

---

# 32. Lease Ownership Must Be Checked Before Every Critical Operation

Before:

```text
stage generation
artifact commit
VFS promotion
verification repair
final gate
pipeline completion
```

call:

```ts
assertPipelineLease(...)
```

This prevents a worker whose lease expired from continuing to mutate state.

---

# 33. Phase 22 — Stage Execution Lifecycle

Every stage should update `StageExecution`:

```text
PENDING
  ↓
RUNNING
  ↓
VALIDATING
  ↓
ACCEPTED
```

Failure:

```text
FAILED
```

Retry:

```text
RETRYING
  ↓
RUNNING
```

The database should therefore provide an auditable record of every attempt.

---

# 34. Phase 23 — Canonical Stage Executor

The executor should conceptually look like:

```ts
async function executeContractStage(args) {
  const contract = getStageContract(args.stageName);

  assertPipelineLease(args);

  const inputs = await resolveAcceptedStageInputs({
    conversationId: args.conversationId,
    pipelineRunId: args.pipelineRunId,
    stageName: args.stageName,
  });

  const execution = await createStageExecution({
    ...args,
    contract,
    inputs,
  });

  try {
    await markRunning(execution);

    const candidate = await generateStageCandidate({
      ...args,
      contract,
      inputs,
    });

    await persistCandidateMetadata(execution, candidate);

    await markValidating(execution);

    const validation = await validateStageCandidate({
      stage: args.stageName,
      contract,
      candidate,
      inputs,
    });

    if (!validation.accepted) {
      throw new StageValidationError(validation);
    }

    await assertArtifactCompatibility({
      candidate,
      contract,
      inputs,
    });

    await persistGateDecision({
      stage: args.stageName,
      execution,
      result: 'PASS',
    });

    const artifact = await commitAcceptedArtifact({
      conversationId: args.conversationId,
      pipelineRunId: args.pipelineRunId,
      stage: args.stageName,
      filePath: contract.outputArtifactName,
      content: candidate.content,
      provenance: {
        contractName: contract.name,
        contractVersion: contract.version,
        contractHash: contract.hash,
        validatorVersion: contract.validatorVersion,
        promptVersion: contract.promptVersion,
        parentArtifactIds: inputs.artifactIds,
        dependencyFingerprint: inputs.dependencyFingerprint,
      },
    });

    await markAccepted(execution, artifact);

    return artifact;
  } catch (error) {
    await markFailed(execution, error);
    throw error;
  }
}
```

The exact implementation can differ.

The invariant cannot.

---

# 35. Phase 24 — Refactor Orchestrator

## File

```text
src/lib/agents/ruflo/orchestrator.ts
```

The orchestrator should become a coordinator rather than a second implementation of the pipeline.

It should primarily do:

```text
acquire lease
     ↓
for each stage:
     executeContractStage()
     ↓
specialized workspace verification
     ↓
security
     ↓
review
     ↓
final gate
     ↓
complete
```

---

# 36. What Must Be Removed From Orchestrator

Remove or migrate:

```text
STAGE_ARTIFACT_DEPS
```

when registry replacement is complete.

Remove direct stage artifact writes such as:

```ts
writeProjectFile(...)
```

for canonical stage artifacts.

Remove bespoke Architect acceptance logic once incorporated into stage validators.

Remove duplicate Tester/Debugger loop once verification-loop is canonical.

Remove any direct:

```text
VFS → stage context
```

behavior.

Remove any:

```text
stage succeeded
```

logic that does not correspond to an accepted ArtifactVersion.

---

# 37. Phase 25 — Blueprinter Migration

Current production code explicitly calls:

```ts
commitAcceptedArtifact(...)
```

for Blueprinter.

This should no longer be a special case.

Blueprinter should use:

```ts
executeContractStage({
  stageName: 'Blueprinter'
})
```

and receive the exact same acceptance lifecycle as every other stage.

---

# 38. Phase 26 — Architect Migration

Architect currently has bespoke validation/retry.

Migrate its validation logic into:

```ts
validateStageCandidate('Architect')
```

The validator may still call:

```ts
validateArchitectureArtifact()
```

but acceptance must be controlled by the generic executor.

Target:

```text
Architect generation
    ↓
generic candidate
    ↓
Architect validator
    ↓
compatibility
    ↓
artifact store
```

---

# 39. Phase 27 — System and Designer Migration

System and Designer must use the same executor.

System:

```text
accepted Architecture
accepted Plan/Requirements as defined by registry
        ↓
System candidate
        ↓
backend validator
        ↓
compatibility
        ↓
backend_spec.md
```

Designer:

```text
accepted Architecture
accepted requirements/context as defined by registry
        ↓
Designer candidate
        ↓
UI validator
        ↓
compatibility
        ↓
ui_spec.md
```

---

# 40. Phase 28 — Blueprinter Dependency Graph

Blueprinter should consume only accepted upstream artifacts.

Expected conceptual graph:

```text
Architecture
     │
     ├──────────────┐
     ↓              ↓
Backend Spec     UI Spec
     │              │
     └──────┬───────┘
            ↓
       Blueprinter
            ↓
       blueprint.md
```

Do not inject arbitrary stale copies from VFS.

---

# 41. Phase 29 — Coder Dependency Graph

Coder consumes:

```text
Blueprint
Architecture
Backend specification
UI specification
```

according to the final registry.

Then:

```text
Coder
  ↓
VFS workspace
  ↓
workspace.manifest.json
```

The manifest becomes the accepted Coder artifact.

---

# 42. Phase 30 — Tester Dependency Graph

Tester consumes:

```text
workspace.manifest.json
```

and the actual VFS projection.

It must verify that:

```text
manifest files
==
actual VFS files
```

and:

```text
manifest hashes
==
actual VFS hashes
```

If not:

```text
Tester FAIL
```

---

# 43. Phase 31 — Security Stage

Security must consume the accepted workspace.

It should run the existing security infrastructure.

Do not create another security validator.

Use:

```text
validateSecurityGate
```

plus existing quality validation.

Security output:

```text
security_report.md
```

The report must explicitly state:

```text
PASS
```

or:

```text
FAIL
```

Do not infer pass from absence of failure text.

---

# 44. Phase 32 — Reviewer Stage

Reviewer must produce:

```text
review_report.md
```

with an explicit result:

```text
PASS
```

or:

```text
FAIL
```

Reviewer must not be considered successful merely because an artifact exists.

---

# 45. Phase 33 — Strict Final Gate

## File

```text
src/lib/agents/ruflo/final-gate.ts
```

Current behavior is too permissive because several checks are conditional.

For example:

```text
Security missing → accepted
Reviewer missing → accepted
Verification missing → accepted
```

This must change.

---

# 46. Final Gate Requirements

Final gate must require:

## Required accepted artifacts

```text
Architect
System
Designer
Blueprinter
Coder
Tester
Security
Reviewer
```

Depending on the final pipeline contract, Queen and Planner should also be required if they are canonical upstream artifacts.

---

## Required verification

Must exist:

```text
VerificationRun
```

and:

```text
success === true
```

Missing verification:

```text
FAIL
```

---

## Required Security

Must exist.

Must explicitly pass.

Missing:

```text
FAIL
```

---

## Required Reviewer

Must exist.

Must explicitly pass.

Missing:

```text
FAIL
```

---

## Required lease state

There must be no active lease.

---

## Required workspace

The accepted Coder manifest must correspond to actual VFS.

---

# 47. Phase 34 — Final Gate Must Be Called

At the end of:

```text
runOrchestrator()
```

the execution sequence must be:

```text
all stages
   ↓
verification
   ↓
security
   ↓
review
   ↓
evaluateFinalPipelineGate()
   ↓
PASS?
 ├── NO → pipeline fails
 └── YES
       ↓
mark Completed
```

Never:

```text
all stages
   ↓
mark Completed
   ↓
final gate
```

---

# 48. Phase 35 — Conversation Completion Must Depend on Final Gate

Search for:

```ts
status: 'Completed'
```

and:

```ts
conversation.update(...)
```

inside the orchestrator.

Every successful completion path must prove:

```ts
finalGate.passed === true
```

before setting Completed.

This should be enforced in code, not merely by developer convention.

---

# 49. Phase 36 — Authentication Contradiction Detection

The Kanban 2.0 fixture exposes an important contract problem.

The specification contains:

```text
Authentication: None — no auth needed
```

but acceptance criteria include:

```text
User's board state should be accessible from any browser session where they log in
```

These are contradictory.

The contract system must detect this.

---

# 50. Authentication Evidence Rules

The specification parser should treat phrases such as:

```text
log in
login
sign in
signin
account
user account
session
authenticated
authentication
authorization
```

as potential authentication requirements.

But this should be implemented carefully to avoid treating unrelated prose as mandatory authentication.

The desired outcome for the Kanban fixture is:

```text
Authentication: None
+
Requirement: user logs in
=
CONTRADICTION
```

The pipeline must not silently resolve the contradiction by inventing:

```text
User model
passwords
JWT
sessions
OAuth
```

The correct behavior is to reject the contradictory contract or require clarification before generation.

---

# 51. Phase 37 — Framework Boundary Validation

For Vite:

Validate:

```text
vite.config.js
index.html
React root
declared frontend entry
build configuration
```

Do not force:

```text
src/main.tsx
```

if the contract explicitly declares:

```text
src/pages/index.tsx
```

The validator must enforce the declared contract, not generic framework conventions.

---

# 52. Phase 38 — React Entry Point Validation

For:

```text
Frontend Entry Point: src/pages/index.tsx
```

validate that:

```text
src/pages/index.tsx
```

exists.

Validate that the Vite application actually reaches it.

Do not merely check:

```text
index.html exists
```

because an HTML file existing proves almost nothing about whether the React application is wired correctly.

---

# 53. Phase 39 — Express Entry Point Validation

For:

```text
Backend Entry Point: server/app.js
```

validate:

```text
server/app.js exists
```

and:

```text
Express application is instantiated
```

and:

```text
routes are attached
```

and:

```text
server can start
```

where runtime probing is supported.

Do not invent:

```text
server/index.js
```

because it is conventional.

---

# 54. Phase 40 — Prisma Validation

For:

```text
ORM: Prisma
Database: PostgreSQL
```

ensure:

```text
prisma/schema.prisma
```

exists.

Ensure:

```text
provider = "postgresql"
```

and generated code actually uses Prisma.

Do not confuse:

```text
AutoCoder's internal SQLite database
```

with:

```text
generated project's PostgreSQL database
```

These are separate systems.

---

# 55. Phase 41 — No-Auth Validation

If the contract says:

```text
Authentication: None
```

generated project validation must ensure the pipeline does not invent authentication infrastructure.

Examples of suspicious invented components:

```text
User model
password hash
JWT
session middleware
login route
auth middleware
OAuth configuration
```

unless they are explicitly required elsewhere in the contract.

---

# 56. Phase 42 — Registry Consistency Tests

Create tests that assert:

```text
versions.ts output path
==
registry.ts output path
```

and:

```text
registry output path
==
canonical pipeline projection path
```

and:

```text
registry inputs
==
accepted input resolver expectations
```

---

# 57. Phase 43 — Contract Matrix Test

Create one table-driven test.

Conceptually:

```ts
const expected = {
  Queen: {
    output: 'plan.md',
  },
  Planner: {
    output: 'requirements.md',
  },
  Architect: {
    output: 'architecture.md',
  },
  System: {
    output: 'backend_spec.md',
  },
  Designer: {
    output: 'ui_spec.md',
  },
  Blueprinter: {
    output: 'blueprint.md',
  },
  Coder: {
    output: 'workspace.manifest.json',
  },
  Tester: {
    output: 'test_report.md',
  },
  Debugger: {
    output: 'debug_report.md',
  },
  Security: {
    output: 'security_report.md',
  },
  Reviewer: {
    output: 'review_report.md',
  },
};
```

Assert the registry matches exactly.

This prevents another accidental contract drift.

---

# 58. Phase 44 — Kanban 2.0 Regression Fixture

Use the existing Kanban 2.0 fixture:

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

with:

```text
Authentication: None
```

and:

```text
where they log in
```

as the deliberate contradiction.

Expected behavior:

```text
CONTRACT REJECTED
```

or:

```text
REQUIRES CLARIFICATION
```

depending on the chosen contract-state model.

It must not generate an invented authentication system.

---

# 59. Phase 45 — Positive Kanban Fixture

Create a corrected fixture:

```text
Authentication: None
```

and remove the login requirement.

Expected:

```text
Queen PASS
Planner PASS
Architect PASS
System PASS
Designer PASS
Blueprinter PASS
Coder PASS
Tester PASS
Security PASS
Reviewer PASS
Final Gate PASS
Completed
```

---

# 60. Phase 46 — Deliberate Contract Violation Tests

Add fixtures that deliberately introduce:

### Wrong framework

```text
Contract: React
Generated: Vue
```

Expected:

```text
FAIL
```

### Wrong ORM

```text
Contract: Prisma
Generated: Mongoose
```

Expected:

```text
FAIL
```

### Wrong DB

```text
Contract: PostgreSQL
Generated: MongoDB
```

Expected:

```text
FAIL
```

### Wrong entry point

```text
Contract: src/pages/index.tsx
Generated: src/main.tsx only
```

Expected:

```text
FAIL
```

### Missing backend

```text
Contract: Express
Generated: no Express server
```

Expected:

```text
FAIL
```

### Invented auth

```text
Contract: Authentication None
Generated: JWT/User/session system
```

Expected:

```text
FAIL
```

---

# 61. Phase 47 — Artifact Tampering Test

Generate:

```text
requirements.md
```

accept it.

Then modify the VFS copy without creating a new ArtifactVersion.

Expected:

```text
artifact hash mismatch
```

or equivalent failure.

The system must not silently treat the modified VFS copy as authoritative.

---

# 62. Phase 48 — Stale Artifact Test

Generate:

```text
requirements v1
```

Generate:

```text
architecture v1
```

Change requirements to:

```text
requirements v2
```

without regenerating architecture.

Expected:

```text
Architecture dependency fingerprint mismatch
```

The stale architecture must not be treated as current.

---

# 63. Phase 49 — Lease Expiration Test

Simulate:

```text
Worker A acquires lease
Worker A starts stage
lease expires
Worker B acquires lease
Worker A attempts artifact commit
```

Expected:

```text
Worker A commit rejected
```

This test is mandatory.

Otherwise the persistent lease is mostly decorative.

---

# 64. Phase 50 — Verification Repair Test

Create a generated project with:

```text
missing import
```

Run verification.

Expected:

```text
Tester FAIL
Debugger repairs
workspace fingerprint changes
Tester PASS
```

Then verify:

```text
VerificationRun.success === true
```

and:

```text
final gate can proceed
```

---

# 65. Phase 51 — Debugger No-Op Test

Create a failing workspace.

Debugger returns no actual modifications.

Expected:

```text
workspace fingerprint unchanged
```

and:

```text
verification loop fails
```

The system must not pretend that a textual debugging explanation counts as repair.

---

# 66. Phase 52 — Final Gate Missing Security Test

Produce:

```text
Architect accepted
System accepted
Designer accepted
Blueprinter accepted
Coder accepted
Tester passed
Reviewer passed
Security missing
```

Expected:

```text
FINAL GATE FAIL
```

Not:

```text
Completed
```

---

# 67. Phase 53 — Final Gate Missing Reviewer Test

Same fixture with Reviewer missing.

Expected:

```text
FINAL GATE FAIL
```

---

# 68. Phase 54 — Final Gate Missing Verification Test

All stage artifacts exist but:

```text
VerificationRun
```

does not.

Expected:

```text
FINAL GATE FAIL
```

---

# 69. Phase 55 — Final Gate Failed Security Test

Security exists:

```text
security_report.md
```

but says:

```text
FAIL
```

Expected:

```text
FINAL GATE FAIL
```

---

# 70. Phase 56 — Final Gate Failed Reviewer Test

Reviewer exists but explicitly fails.

Expected:

```text
FINAL GATE FAIL
```

---

# 71. Phase 57 — Ensure Completion Is Impossible After Final Gate Failure

Test that:

```ts
conversation.status
```

does not become:

```text
Completed
```

when:

```text
evaluateFinalPipelineGate()
```

fails.

---

# 72. Phase 58 — Event Stream Enforcement

Every major state transition should emit a pipeline event.

Minimum events:

```text
STAGE_STARTED
CANDIDATE_GENERATED
VALIDATION_STARTED
VALIDATION_FAILED
VALIDATION_PASSED
COMPATIBILITY_FAILED
ARTIFACT_ACCEPTED
ARTIFACT_SUPERSEDED
VERIFICATION_STARTED
VERIFICATION_FAILED
REPAIR_STARTED
REPAIR_APPLIED
SECURITY_COMPLETED
REVIEW_COMPLETED
FINAL_GATE_FAILED
FINAL_GATE_PASSED
PIPELINE_COMPLETED
PIPELINE_FAILED
LEASE_RENEWED
LEASE_LOST
```

Do not create events for every internal function call.

Events should represent meaningful state transitions.

---

# 73. Phase 59 — Error Classification

Errors should be distinguishable.

Recommended categories:

```text
CONTRACT_ERROR
INPUT_ARTIFACT_ERROR
GENERATION_ERROR
VALIDATION_ERROR
COMPATIBILITY_ERROR
PERSISTENCE_ERROR
LEASE_ERROR
VERIFICATION_ERROR
SECURITY_ERROR
REVIEW_ERROR
FINAL_GATE_ERROR
```

This matters for retries.

For example:

```text
LEASE_ERROR
```

should not trigger:

```text
LLM regeneration
```

because generating the same artifact again does not solve ownership loss.

---

# 74. Phase 60 — Retry Policy

Retries must be stage-aware.

Do not blindly retry every failure.

Recommended:

```text
Generation failure
→ retry candidate generation

Validation failure
→ retry generation with validation feedback

Compatibility failure
→ regenerate against current dependencies

Lease failure
→ abort

Persistence failure
→ retry persistence only

Final gate failure
→ do not regenerate arbitrary stages
→ identify failed prerequisite
```

---

# 75. Phase 61 — Avoid Regeneration Cascades

One of AutoCoder's existing architectural problems is hallucination cascade:

```text
Queen
 ↓
Planner
 ↓
Architect
 ↓
System
 ↓
Designer
 ↓
Blueprinter
 ↓
Coder
```

If an upstream artifact is wrong, downstream agents amplify the error.

The enforcement model should therefore make every downstream stage depend on accepted artifacts.

This does not eliminate bad generation.

It prevents bad generation from silently becoming canonical truth.

---

# 76. Phase 62 — Prompt Context Must Be Canonical

When generating a stage, the prompt/context builder must receive:

```text
current stage contract
accepted parent artifacts
spec contract
project constraints
previous validation feedback
```

It must not receive arbitrary stale snapshots.

The prompt should not independently reconstruct architecture from:

```text
conversation history
VFS
old Markdown snapshot
```

when an accepted ArtifactVersion exists.

---

# 77. Phase 63 — Remove Competing Context Stores

Audit:

```text
Markdown snapshots
Typed Prisma stage state
VFS stage files
ArtifactVersion
```

Any artifact that is supposed to be canonical must have one authority.

Target:

```text
ArtifactVersion
      ↓
accepted canonical state

VFS
      ↓
projection/workspace

Markdown snapshot
      ↓
optional derived/debug representation
```

Do not allow:

```text
Markdown snapshot
```

to override:

```text
ArtifactVersion
```

---

# 78. Phase 64 — `buildArtifactContext()` Must Be Authoritative

Existing:

```ts
buildArtifactContext()
```

is a good direction.

It should:

1. retrieve accepted ArtifactVersions
2. verify current dependency compatibility
3. build deterministic stage context
4. preserve artifact identity
5. expose content and metadata

It should not simply return arbitrary latest content.

---

# 79. Phase 65 — Stage Context Metadata

Each injected artifact should carry:

```text
stage
artifactId
version
contractName
contractVersion
contentHash
dependencyFingerprint
```

This makes model context auditable.

For example:

```text
ARCHITECTURE ARTIFACT
ID: abc123
VERSION: 4
HASH: sha256:...
CONTRACT: ArchitectOutput@1.0.0
```

Then the system can prove what the model actually received.

---

# 80. Phase 66 — Prompt Versioning

Every accepted artifact must record:

```text
promptVersion
```

If the prompt changes:

```text
promptVersion 1.0.0
→
1.1.0
```

future artifacts can be distinguished from artifacts produced under the previous prompt.

Do not silently reuse the same version after changing contract-critical prompt instructions.

---

# 81. Phase 67 — Validator Versioning

Same principle.

If validation changes:

```text
validatorVersion 1.0.0
→
1.1.0
```

the pipeline can distinguish:

```text
artifact accepted under old validator
```

from:

```text
artifact accepted under new validator
```

---

# 82. Phase 68 — Contract Fingerprint

Use the existing:

```text
contracts/fingerprints.ts
```

implementation.

Do not create another hash system.

The contract fingerprint should represent the relevant contract inputs:

```text
contract name
version
schema
prompt
validator
```

This allows compatibility to detect meaningful contract drift.

---

# 83. Phase 69 — Dependency Fingerprint

Use the existing dependency fingerprint implementation.

It should be stable with respect to dependency ordering.

Example:

```text
[A, B, C]
```

and:

```text
[C, A, B]
```

should produce the same dependency fingerprint.

But:

```text
[A, B, D]
```

must differ.

---

# 84. Phase 70 — Database Migration

Before modifying Prisma schema:

```text
inspect existing models
```

Do not introduce replacement models.

Existing models already support:

```text
PipelineRun
StageExecution
ArtifactVersion
PipelineEvent
GateDecision
VerificationRun
VirtualFile
```

Only add fields if enforcement genuinely requires them.

Potential fields that may be required should be evaluated first:

```text
candidateHash
contractHash
dependencyFingerprint
```

Many already exist.

Avoid schema churn.

---

# 85. Phase 71 — Data Migration Strategy

Existing pipeline runs may have incomplete provenance.

Do not pretend old artifacts are fully canonical.

For historical artifacts:

```text
legacy
```

or:

```text
unverified
```

should be distinguishable from newly accepted artifacts.

Do not retroactively claim:

```text
validatorVersion
promptVersion
contractHash
```

unless they can actually be reconstructed.

---

# 86. Phase 72 — Legacy Pipeline Compatibility

During implementation there may be existing pipeline data.

The new executor should be able to identify:

```text
legacy artifact
```

and refuse to use it as a canonical dependency when required provenance is missing.

Possible behavior:

```text
legacy artifact
   ↓
cannot satisfy strict dependency
   ↓
regenerate stage
```

This is safer than silently trusting old state.

---

# 87. Phase 73 — Remove Old Paths Only After New Path Works

Do not immediately delete:

```text
old Tester
old Debugger
old Architect retry
```

Implement the new path first.

Run regression tests.

Then remove duplicate paths.

This reduces the chance of breaking the pipeline while migrating.

---

# 88. Phase 74 — Search-Based Dead Path Audit

Search the repository for:

```text
writeProjectFile(
commitAcceptedArtifact(
validateStageCandidate(
runFullWorkspaceTester(
verifyAndRepairWorkspace(
evaluateFinalPipelineGate(
STAGE_ARTIFACT_DEPS
VFS_OUTPUT_MAP
```

For each occurrence classify:

```text
CANONICAL
LEGACY
TEST
UTILITY
DUPLICATE
```

There should ultimately be one production execution path for each responsibility.

---

# 89. Phase 75 — Required Production Call Graph

The final production call graph should look approximately like:

```text
runOrchestrator()
│
├── acquirePipelineLease()
│
├── startLeaseHeartbeat()
│
├── executeContractStage("Queen")
│   ├── getStageContract()
│   ├── assertPipelineLease()
│   ├── resolveAcceptedStageInputs()
│   ├── createStageExecution()
│   ├── generateCandidate()
│   ├── validateStageCandidate()
│   ├── assertArtifactCompatibility()
│   ├── commitAcceptedArtifact()
│   └── projectArtifact()
│
├── executeContractStage("Planner")
│
├── executeContractStage("Architect")
│
├── executeContractStage("System")
│
├── executeContractStage("Designer")
│
├── executeContractStage("Blueprinter")
│
├── executeContractStage("Coder")
│
├── executeVerificationLoop()
│   ├── Tester
│   ├── Debugger
│   └── Tester
│
├── executeContractStage("Security")
│
├── executeContractStage("Reviewer")
│
├── assertPipelineLease()
│
├── evaluateFinalPipelineGate()
│
├── markCompleted()
│
├── releasePipelineLease()
│
└── stopLeaseHeartbeat()
```

This is the target architecture.

---

# 90. Phase 76 — Failure Call Graph

If anything fails:

```text
execute stage
   ↓
failure
   ↓
StageExecution = FAILED
   ↓
GateDecision = FAIL
   ↓
PipelineRun = FAILED / RETRYING
   ↓
NO Completed
```

Lease failure:

```text
lease lost
   ↓
abort
   ↓
NO commit
NO projection
NO completion
```

Final gate failure:

```text
final gate FAIL
   ↓
PipelineRun != COMPLETED
```

---

# 91. Phase 77 — Artifact State Invariants

For every `ArtifactVersion`:

```text
PENDING
→ ACCEPTED
→ SUPERSEDED
```

or:

```text
PENDING
→ REJECTED
```

Never:

```text
PENDING
→ VFS
```

Never:

```text
GENERATED
→ ACCEPTED
```

without validation.

---

# 92. Phase 78 — VFS Projection Invariants

For every canonical artifact:

```text
ArtifactVersion ACCEPTED
        ↓
VFS projection
```

Never:

```text
VFS modified
        ↓
ArtifactVersion assumed accepted
```

If VFS changes independently:

```text
workspace fingerprint changes
```

and verification should detect it.

---

# 93. Phase 79 — Workspace Fingerprint Invariant

After Coder:

```text
manifest fingerprint
==
VFS workspace fingerprint
```

After Debugger:

```text
old fingerprint != new fingerprint
```

if a repair claims to have modified the workspace.

---

# 94. Phase 80 — Security and Reviewer Reports Must Be Machine-Readable

Although artifacts may be Markdown, include a deterministic result section.

For example:

```text
## Result

PASS
```

or:

```text
## Result

FAIL
```

The final gate should parse a deterministic field rather than infer status from prose.

---

# 95. Phase 81 — Tester Report Must Be Machine-Readable

Same principle:

```text
## Result

PASS
```

or:

```text
## Result

FAIL
```

And structured sections:

```text
## Workspace Fingerprint
## Files Checked
## Validation Results
## Failures
## Warnings
## Result
```

---

# 96. Phase 82 — Contract Output Schemas

Every contract should define:

```text
required sections
required fields
allowed output type
```

This makes acceptance deterministic.

Avoid relying entirely on LLM prose interpretation.

---

# 97. Phase 83 — No Length-Based Acceptance

Delete patterns like:

```ts
content.length > 50
```

as the primary acceptance criterion.

Length can be a sanity check.

It cannot be the semantic contract.

---

# 98. Phase 84 — No Filename-Based Acceptance

Do not accept:

```text
requirements.md exists
```

as proof that Planner succeeded.

The file must be:

```text
accepted ArtifactVersion
```

with:

```text
valid contract
valid provenance
valid content
valid dependencies
```

---

# 99. Phase 85 — No “Latest Wins” Logic

Avoid:

```text
ORDER BY createdAt DESC
```

without:

```text
state = ACCEPTED
```

and appropriate compatibility checks.

The latest generated artifact may be a failed candidate.

The system must retrieve:

```text
latest accepted compatible artifact
```

not:

```text
latest artifact
```

---

# 100. Phase 86 — No Silent Fallback

If:

```text
accepted artifact missing
```

do not fall back to:

```text
VFS copy
```

or:

```text
old snapshot
```

or:

```text
conversation text
```

unless explicitly defined as a recovery mechanism.

Silent fallback is how competing state stores become permanent.

---

# 101. Phase 87 — Contract Dependency Graph Test

Add a test that walks the registry:

```text
Queen
 ↓
Planner
 ↓
Architect
 ↓
System
 ↓
Designer
 ↓
Blueprinter
 ↓
Coder
 ↓
Tester
 ↓
Debugger
 ↓
Security
 ↓
Reviewer
```

and ensures every required input is satisfiable by:

```text
previous accepted stage
```

or explicitly available project context.

---

# 102. Phase 88 — Detect Dependency Cycles

Registry validation should reject:

```text
A → B
B → A
```

or longer cycles.

Pipeline contracts must form a valid DAG.

---

# 103. Phase 89 — Detect Orphan Artifacts

Every canonical output should be consumed or intentionally terminate.

For example:

```text
review_report.md
```

terminates at Final Gate.

That is valid.

But if:

```text
random_stage.md
```

exists in the registry and nothing consumes it:

```text
FAIL registry consistency test
```

unless explicitly marked terminal.

---

# 104. Phase 90 — Detect Missing Producers

If:

```text
Coder requires blueprint.md
```

then registry must contain:

```text
Blueprinter → blueprint.md
```

The registry should reject a dependency whose producer does not exist.

---

# 105. Phase 91 — Detect Duplicate Producers

Two stages must not both claim:

```text
requirements.md
```

unless explicitly versioned as separate namespaces.

Canonical pipeline should have:

```text
one producer per artifact path
```

---

# 106. Phase 92 — Prompt/Contract Alignment

Audit every agent prompt against its contract.

For each stage verify:

```text
Prompt output filename
Prompt output schema
Registry output filename
Validator expectation
Artifact store path
```

All must agree.

Example failure:

```text
Prompt: produce blueprint.json
Registry: blueprint.md
Validator: expects JSON
Orchestrator: writes blueprint.md
```

This must become impossible.

---

# 107. Phase 93 — Agent Output Instructions

Every agent prompt should explicitly say:

```text
You are generating candidate artifact X.
You are not changing the canonical artifact directly.
Your output must conform to contract X.
```

This reinforces the candidate/acceptance separation.

---

# 108. Phase 94 — Do Not Let Agents Control Acceptance

The model must never decide:

```text
my output is valid
```

Acceptance is deterministic infrastructure responsibility.

Agent:

```text
generate
```

Validator:

```text
validate
```

Compatibility:

```text
verify
```

Artifact store:

```text
accept
```

Final gate:

```text
complete
```

---

# 109. Phase 95 — Quality Gate Integration

Existing:

```text
evaluateQualityGate()
```

remains authoritative for deterministic quality evaluation.

Do not create:

```text
newQualityGate()
```

The contract executor should invoke existing validation systems.

Target:

```text
Stage Contract
    ↓
Stage-specific validators
    ↓
Quality Gate where appropriate
    ↓
Acceptance
```

---

# 110. Phase 96 — Security Gate Integration

Existing:

```text
validateSecurityGate()
```

must remain the security authority.

Do not build a second security scanner solely for the new pipeline architecture.

---

# 111. Phase 97 — Runtime Validator Integration

The runtime validator must continue receiving the full:

```text
specContract
```

not merely:

```text
apiEndpoints
```

This was previously a wiring defect.

Regression test this explicitly.

---

# 112. Phase 98 — API Contract Integration

For Express projects:

```text
validateApiContracts()
```

must verify generated routes against the accepted API contract.

A route existing in code does not make it valid.

It must correspond to the accepted architecture/system specification.

---

# 113. Phase 99 — Dependency Validation Integration

Use:

```text
validatePackageDependencies()
```

to verify:

```text
package.json
imports
declared dependencies
```

The pipeline should fail if generated code imports undeclared packages.

---

# 114. Phase 100 — Prisma Integration

Use:

```text
validatePrismaUsage()
```

for projects whose contract declares Prisma.

The validator must verify actual usage rather than simply:

```text
prisma/schema.prisma exists
```

---

# 115. Phase 101 — Project Validation Integration

Use:

```text
validateGeneratedProject()
```

as the broad structural validation layer.

Do not replace it with a simplistic contract validator.

The layers have different purposes:

```text
Contract validator
    ↓
Does this artifact obey its stage contract?

Project validator
    ↓
Does generated project structure make sense?

Framework validator
    ↓
Does framework wiring make sense?

Dependency validator
    ↓
Are dependencies correct?

Runtime validator
    ↓
Does it actually behave correctly?

Security gate
    ↓
Is it secure enough?

Quality gate
    ↓
Does the complete project satisfy deterministic quality requirements?
```

---

# 116. Phase 102 — Observability

For every stage log:

```text
pipelineRunId
conversationId
stage
attempt
executionId
contractVersion
contractHash
parentArtifactIds
dependencyFingerprint
candidateHash
acceptedArtifactId
```

This makes failures diagnosable.

Without this, debugging a multi-agent pipeline becomes archaeology performed with a shovel made of regret.

---

# 117. Phase 103 — Recovery

Pipeline recovery must resume from the last valid accepted artifact.

Example:

```text
Queen ACCEPTED
Planner ACCEPTED
Architect ACCEPTED
System FAILED
```

Resume from:

```text
System
```

using:

```text
accepted Queen
accepted Planner
accepted Architect
```

Do not restart from scratch unless explicitly required.

---

# 118. Phase 104 — Recovery Must Not Resume From Failed Candidates

If:

```text
System candidate v2
```

failed validation, recovery must not treat it as context.

Only:

```text
System accepted v1
```

or valid upstream artifacts may be used.

---

# 119. Phase 105 — Supersession Rules

When a new artifact is accepted:

```text
old accepted artifact
→ SUPERSEDED
```

Downstream artifacts that depend on the old artifact should become stale according to dependency policy.

At minimum:

```text
dependency fingerprint mismatch
```

must prevent them from being silently reused.

---

# 120. Phase 106 — Pipeline State Machine

The pipeline should use explicit states.

Conceptually:

```text
CREATED
  ↓
RUNNING
  ↓
VERIFYING
  ↓
SECURITY_REVIEW
  ↓
FINALIZING
  ↓
COMPLETED
```

Failure:

```text
FAILED
```

Recovery:

```text
RETRYING
```

Do not infer pipeline state solely from the existence of files.

---

# 121. Phase 107 — Final Pipeline State Invariant

The only valid route to:

```text
COMPLETED
```

is:

```text
all required artifacts accepted
AND
workspace verification passed
AND
security passed
AND
review passed
AND
final gate passed
AND
lease ownership valid
```

Formally:

```text
Completed =
  AcceptedRequiredArtifacts
  ∧ VerificationPassed
  ∧ SecurityPassed
  ∧ ReviewPassed
  ∧ NoActiveLease
  ∧ FinalGatePassed
```

---

# 122. Phase 108 — Implementation Order

The implementation should happen in this exact order.

## P0-A — Canonicalize contracts

1. Fix `contracts/versions.ts`
2. Fix `contracts/registry.ts`
3. Define canonical artifact matrix
4. Remove duplicated dependency definitions
5. Add registry consistency tests

---

## P0-B — Canonicalize artifact resolution

6. Implement `resolveAcceptedStageInputs()`
7. Make `buildArtifactContext()` use accepted artifacts
8. Stop VFS from acting as stage specification authority
9. Add compatibility checks

---

## P0-C — Canonicalize acceptance

10. Strengthen `validateStageCandidate()`
11. Add validators for every stage
12. Remove length-only acceptance
13. Integrate compatibility
14. Persist GateDecision
15. Persist complete provenance

---

## P0-D — Canonicalize execution

16. Implement `executeContractStage()`
17. Migrate Queen
18. Migrate Planner
19. Migrate Architect
20. Migrate System
21. Migrate Designer
22. Migrate Blueprinter
23. Migrate Coder
24. Migrate Security
25. Migrate Reviewer

---

## P0-E — Canonicalize workspace verification

26. Fix Debugger repair application
27. Fix fingerprint recomputation
28. Make Tester/Debugger loop canonical
29. Persist VerificationRun
30. Remove duplicate verification path

---

## P0-F — Canonicalize ownership

31. Implement lease heartbeat
32. Add ownership assertions
33. Abort on lost lease
34. Add lease race tests

---

## P0-G — Canonicalize completion

35. Strengthen final gate
36. Require verification
37. Require Security
38. Require Reviewer
39. Require Coder manifest
40. Call final gate from orchestrator
41. Block Completed on final-gate failure

---

## P1 — Hardening

42. Parent artifact provenance
43. Dependency fingerprint invalidation
44. Cross-stage contract drift detection
45. Vite-specific validation
46. Express entry validation
47. Prisma/PostgreSQL validation
48. No-auth contradiction detection
49. Registry DAG validation
50. Recovery semantics

---

## P2 — Cleanup

51. Remove legacy execution paths
52. Remove duplicate maps
53. Remove obsolete helpers
54. Remove compatibility shims
55. Add dead-code audit
56. Update architecture documentation

---

# 123. Phase 109 — Implementation Checkpoints

After each major phase, run the relevant tests.

Do not implement the entire system and then discover that the registry was wrong.

### Checkpoint 1

```text
versions + registry
```

must pass.

### Checkpoint 2

```text
artifact resolution
```

must pass.

### Checkpoint 3

```text
candidate acceptance
```

must pass.

### Checkpoint 4

```text
one migrated stage
```

must pass.

### Checkpoint 5

```text
entire generation chain
```

must pass.

### Checkpoint 6

```text
verification/repair
```

must pass.

### Checkpoint 7

```text
lease race
```

must pass.

### Checkpoint 8

```text
final gate
```

must pass.

---

# 124. Phase 110 — Anti-Gravity Implementation Rules

When implementing this plan, Anti-gravity must follow these constraints.

## Do not:

- create a second artifact store
- create a second contract registry
- create a second quality gate
- create a second security gate
- create a second verification engine
- create a second lease system
- duplicate stage dependency maps
- create a new VFS state database
- replace existing validators unnecessarily
- rename working generated-project files merely for convention
- change the generated project's declared architecture without contract justification

## Do:

- reuse existing infrastructure
- wire existing infrastructure into the canonical path
- add only missing enforcement
- preserve public APIs where practical
- add tests before deleting legacy behavior
- remove duplicate paths after successful migration

---

# 125. Phase 111 — Required Repository Search Before Editing

Before implementing, search for every occurrence of:

```text
STAGE_ARTIFACT_DEPS
VFS_OUTPUT_MAP
getStageContract
validateStageCandidate
commitAcceptedArtifact
getLatestAcceptedArtifact
buildArtifactContext
generateStageCandidate
runAgent
runOrchestrator
verifyAndRepairWorkspace
runFullWorkspaceTester
renewPipelineLease
acquirePipelineLease
releasePipelineLease
evaluateFinalPipelineGate
evaluateQualityGate
validateSecurityGate
writeProjectFile
writeVirtualFile
flushVfsToDisk
PipelineRun
StageExecution
ArtifactVersion
VerificationRun
GateDecision
```

Classify each call site.

The goal is to identify bypasses before modifying them.

---

# 126. Phase 112 — Required Search Result Classification

For each occurrence mark:

```text
CANONICAL PATH
DUPLICATE PATH
LEGACY PATH
TEST
UTILITY
SAFE PROJECTION
UNSAFE DIRECT MUTATION
```

Especially investigate:

```text
writeProjectFile()
```

because direct writes are not automatically wrong for Coder workspace files, but are wrong when used to bypass accepted artifact promotion for canonical stage artifacts.

---

# 127. Phase 113 — Expected Final Architecture

The final architecture should be:

```text
                     ┌──────────────────────┐
                     │  CONTRACT REGISTRY   │
                     │                      │
                     │ stage                │
                     │ inputs              │
                     │ output              │
                     │ versions             │
                     │ validators           │
                     └──────────┬───────────┘
                                │
                                ▼
                     ┌──────────────────────┐
                     │ ACCEPTED INPUT       │
                     │ RESOLVER             │
                     └──────────┬───────────┘
                                │
                                ▼
                     ┌──────────────────────┐
                     │ CANDIDATE GENERATOR  │
                     └──────────┬───────────┘
                                │
                                ▼
                     ┌──────────────────────┐
                     │ STAGE VALIDATORS     │
                     └──────────┬───────────┘
                                │
                                ▼
                     ┌──────────────────────┐
                     │ COMPATIBILITY        │
                     │ CHECK                │
                     └──────────┬───────────┘
                                │
                                ▼
                     ┌──────────────────────┐
                     │ GATE DECISION        │
                     └──────────┬───────────┘
                                │ PASS
                                ▼
                     ┌──────────────────────┐
                     │ ARTIFACT STORE       │
                     │ ArtifactVersion      │
                     │ ACCEPTED             │
                     └──────────┬───────────┘
                                │
                                ▼
                     ┌──────────────────────┐
                     │ VFS PROJECTION       │
                     └──────────┬───────────┘
                                │
                                ▼
                     ┌──────────────────────┐
                     │ NEXT CONTRACT STAGE  │
                     └──────────────────────┘
```

Then:

```text
Coder
  ↓
Workspace
  ↓
Manifest
  ↓
Verification
  ↓
Debugger repair if needed
  ↓
Verification again
  ↓
Security
  ↓
Reviewer
  ↓
Final Gate
  ↓
Completed
```

---

# 128. Definition of Done

The implementation is **NOT complete** merely because the new functions exist.

It is complete only when every statement below is true.

## Contracts

- [ ] `contracts/versions.ts` matches actual pipeline artifacts.
- [ ] `contracts/registry.ts` matches actual pipeline dependencies.
- [ ] No duplicate authoritative dependency map remains.
- [ ] No contradictory artifact naming remains.
- [ ] Blueprinter format is consistent everywhere.
- [ ] Coder artifact semantics are explicit.
- [ ] Registry DAG validates successfully.

## Artifact flow

- [ ] Every stage produces a candidate.
- [ ] Candidates are validated before acceptance.
- [ ] Compatibility is checked before acceptance.
- [ ] Accepted artifacts are persisted through `commitAcceptedArtifact()`.
- [ ] Canonical artifacts are not directly promoted to VFS before acceptance.
- [ ] VFS is treated as a projection/workspace.
- [ ] Every accepted artifact has complete provenance.

## Stage execution

- [ ] Every stage has a `StageExecution`.
- [ ] Stage lifecycle is persisted.
- [ ] Failed attempts are visible.
- [ ] Retries are visible.
- [ ] Gate decisions are persisted.
- [ ] No stage bypasses canonical acceptance.

## Context

- [ ] Stage inputs come from accepted artifacts.
- [ ] Stale artifacts cannot silently satisfy dependencies.
- [ ] Dependency fingerprints are enforced.
- [ ] Parent artifact IDs are stored.
- [ ] Contract fingerprints are stored.
- [ ] Prompt and validator versions are stored.

## Verification

- [ ] Tester is canonical.
- [ ] Debugger actually modifies VFS when repair is claimed.
- [ ] Workspace fingerprint is recomputed after repair.
- [ ] VerificationRun is persisted.
- [ ] No-op repair is detected.
- [ ] Maximum retry cycles are enforced.
- [ ] Duplicate Tester/Debugger execution path is removed.

## Lease

- [ ] Persistent lease exists.
- [ ] Heartbeat renews the lease.
- [ ] Ownership is checked before critical operations.
- [ ] Lost lease aborts execution.
- [ ] Stale workers cannot commit.
- [ ] Lease race tests pass.

## Security

- [ ] Security runs through existing security infrastructure.
- [ ] Security output is persisted.
- [ ] Security result is explicit.
- [ ] Missing Security fails final gate.
- [ ] Failed Security fails final gate.

## Review

- [ ] Reviewer output is persisted.
- [ ] Reviewer result is explicit.
- [ ] Missing Reviewer fails final gate.
- [ ] Failed Reviewer fails final gate.

## Final Gate

- [ ] Final gate is actually called.
- [ ] Required artifacts are checked.
- [ ] Verification is mandatory.
- [ ] Security is mandatory.
- [ ] Reviewer is mandatory.
- [ ] Coder manifest is mandatory.
- [ ] Lease state is checked.
- [ ] Final gate failure prevents completion.
- [ ] Only final-gate success allows `Completed`.

## Regression

- [ ] Kanban 2.0 positive fixture passes.
- [ ] Kanban 2.0 authentication contradiction fails.
- [ ] Wrong framework fails.
- [ ] Wrong ORM fails.
- [ ] Wrong database fails.
- [ ] Wrong entry point fails.
- [ ] Missing backend fails.
- [ ] Invented auth fails.
- [ ] Artifact tampering fails.
- [ ] Stale dependency fails.
- [ ] Lease race fails.
- [ ] Debugger repair succeeds when valid.
- [ ] Debugger no-op fails.
- [ ] Missing verification fails.
- [ ] Missing security fails.
- [ ] Missing reviewer fails.
- [ ] Failed security fails.
- [ ] Failed reviewer fails.

---

# 129. Final Target

After this implementation, AutoCoder should no longer behave like:

```text
LLM agents
   +
some validators
   +
some database state
   +
some Markdown
   +
some VFS
   +
some orchestration
   +
hope
```

It should behave like:

```text
                    CONTRACT
                       │
                       ▼
              ACCEPTED INPUTS
                       │
                       ▼
                 GENERATION
                       │
                       ▼
                  CANDIDATE
                       │
                       ▼
              DETERMINISTIC
                VALIDATION
                       │
                       ▼
               COMPATIBILITY
                       │
                       ▼
                GATE DECISION
                 /          \
              FAIL           PASS
               │               │
               ▼               ▼
             RETRY       ARTIFACT STORE
                               │
                               ▼
                         VFS PROJECTION
                               │
                               ▼
                         NEXT STAGE
                               │
                               ▼
                         WORKSPACE
                         VERIFICATION
                               │
                     ┌─────────┴─────────┐
                     │                   │
                   PASS                FAIL
                     │                   │
                     │              DEBUGGER
                     │                   │
                     │              REPAIR VFS
                     │                   │
                     │             VERIFY AGAIN
                     │
                     ▼
                  SECURITY
                     │
                     ▼
                  REVIEW
                     │
                     ▼
                FINAL GATE
                     │
              ┌──────┴──────┐
             FAIL          PASS
              │              │
              ▼              ▼
            FAILED        COMPLETED
```

The core architectural property is:

> **There must be no production path by which generated state becomes authoritative without passing through the canonical contract, validation, compatibility, acceptance, persistence, and final-gate machinery.**

That is the actual enforcement boundary.

Everything else is implementation detail.