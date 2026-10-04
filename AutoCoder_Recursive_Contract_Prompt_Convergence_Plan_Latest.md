# AutoCoder Recursive Contract & Prompt Convergence Plan
## Re-audited against latest HEAD: `0580dd09998f5566ca217b9a48ff20d76d31d1c7`

**Repository:** `Gautam-Mathur/AutoCoder`  
**Audit basis:** latest reachable commit and its two commits since `991dff7db828a61845530b5bacb9eaeb77b1874c`  
**Latest commits reviewed:**
- `fd819d655f5d9d11f7ef3c7530a14c5bf793f5cf` — align all 11 stage contract settings and validators with prompt output specs
- `0580dd09998f5566ca217b9a48ff20d76d31d1c7` — enforce single module ownership and exact Architect file invariants

---

# 1. Executive Verdict

The previous plan is no longer an accurate implementation plan by itself.

The latest commits have already implemented several of its major recommendations:

- canonical `architecture-parser.ts`
- canonical `architecture-file-policy.ts`
- centralized architecture ownership classification
- empty/malformed Architecture rejection
- duplicate section rejection
- exact single ownership validation
- required ownership for framework files and public assets
- prompt/validator synchronization tests for all 11 stages
- contract-version/prompt-version/validator-version alignment
- canonical stage artifact naming
- removal of the old `assertArtifactCompatibility()` misuse from `contract-executor.ts`
- stronger Blueprinter/Designer/System prompts
- pipeline invariant script wired into `package.json`

So the immediate Architect failure is no longer primarily a missing validator rule.

The remaining problem is now **contract convergence after Architect acceptance**.

The next implementation pass must ensure:

```text
Planner
   ↓
Architect
   ↓
System + Designer
   ↓
Blueprinter
   ↓
Coder
   ↓
Tester
   ↓
Debugger ↺
   ↓
Security + Reviewer
   ↓
Final Gate
```

all consume the **same accepted artifact versions**, preserve the same file topology, and cannot silently create a second interpretation of the project.

The central invariant becomes:

```text
APPROVED_ARCHITECTURE_IMPLEMENTATION_FILES
        =
APPROVED_BLUEPRINT_IMPLEMENTATION_FILES
        =
CODER_AUTHORIZED_FILES
        =
FINAL_PROJECT_IMPLEMENTATION_FILES
```

with explicit control-plane exclusions for pipeline artifacts such as:

```text
plan.md
requirements.md
architecture.md
backend_spec.md
ui_spec.md
blueprint.md
test_report.md
debug_report.md
security_report.md
review_report.md
workspace.manifest.json
```

Do not weaken the Architect validator to make a generated artifact pass. The next fixes must make downstream stages deterministic.

---

# 2. What the Latest Commits Already Fixed

## 2.1 Architect ownership

`src/lib/agents/ruflo/architecture-file-policy.ts` now classifies:

- implementation
- framework
- static-asset
- config
- schema
- documentation

and requires ownership for:

```text
implementation
framework
static-asset
```

Therefore:

```text
src/app/layout.tsx
src/app/api/route.ts
public/favicon.ico
```

are intentionally owned files.

That is correct.

## 2.2 Canonical Architecture parser

`src/lib/agents/ruflo/architecture-parser.ts` now owns:

- required-section validation
- duplicate-section detection
- section ordering
- folder-tree extraction
- module parsing
- ownership mapping
- dependency graph construction
- file classification

`spec-contract.ts` now consumes this parser instead of maintaining its own Architecture parser.

This removes one major source of semantic drift.

## 2.3 Prompt/validator synchronization

`contracts/__tests__/prompt-contract-sync.test.ts` now exercises all 11 stage validators.

`contracts/versions.ts` now records:

```text
version
promptVersion
validatorVersion
outputArtifactName
format
requiredHeadings
```

This is a good direction.

It still does not prove that prompts and validators enforce the same **semantic** rules. That gap remains.

---

# 3. P0: Fix the Remaining Architecture Parser Contract Holes

## File

```text
src/lib/agents/ruflo/architecture-parser.ts
```

## Problem A: tree parsing remains presentation-sensitive

The parser derives hierarchy from:

```ts
const nameStartCol = line.indexOf(cleanName);
```

and a depth stack.

This means correctness still depends on how the LLM renders ASCII tree indentation.

### Required fix

Do not make the ASCII tree the only machine-readable source of topology.

Keep the human-readable tree, but require an additional canonical file list:

```text
### Project Files

- src/app/page.tsx
- src/app/layout.tsx
- src/app/api/route.ts
- src/components/TaskCard.tsx
- public/favicon.ico
```

Then validate:

```text
Project Files == parsed Project Folder Structure files
```

The tree remains presentation.

The canonical list becomes machine-readable inventory.

### Why

LLMs are excellent at inventing tiny formatting variations, because apparently even folder trees need distributed systems engineering.

The parser should not infer architecture from whitespace if an exact file inventory can be required.

---

# 4. P0: Make Architecture File Ownership a First-Class Object

## File

```text
src/lib/agents/ruflo/architecture-parser.ts
```

Current parser returns:

```ts
ownership: Map<string, string[]>
```

Add a normalized architecture object:

```ts
export interface CanonicalArchitecture {
  files: Array<{
    path: string;
    class: ArchitectureFileClass;
    ownerModule: string | null;
  }>;
  modules: ParsedArchitectureModule[];
  moduleGraph: Map<string, { name: string; deps: string[] }>;
}
```

Every downstream consumer should use this object instead of reparsing `architecture.md`.

Required consumers:

```text
Blueprinter
Coder authorization
System topology validation
Designer topology validation
Final Gate
workspace-manifest validation
```

No downstream stage should independently decide:

> "what files count as implementation?"

That decision already belongs to `architecture-file-policy.ts`.

---

# 5. P0: Explicit Control-Plane File Policy

## Problem

The architecture policy distinguishes config/schema/docs from implementation files.

But the pipeline itself also creates canonical artifacts.

Those artifacts are currently written into the same VFS namespace as project files.

This creates a dangerous ambiguity:

```text
pipeline artifacts
        +
generated project files
        =
VirtualFile workspace
```

Then:

```ts
generateWorkspaceManifest()
```

enumerates all `VirtualFile` records.

That can cause:

```text
plan.md
requirements.md
architecture.md
blueprint.md
...
```

to appear as project files.

## Required fix

Add:

```ts
export type WorkspaceFileClass =
  | 'project'
  | 'pipeline-artifact';
```

and define the canonical pipeline artifact set centrally.

Example:

```ts
const CONTROL_PLANE_ARTIFACTS = new Set([
  'plan.md',
  'requirements.md',
  'architecture.md',
  'backend_spec.md',
  'ui_spec.md',
  'blueprint.md',
  'test_report.md',
  'debug_report.md',
  'security_report.md',
  'review_report.md',
  'workspace.manifest.json',
]);
```

Do not rely on filename heuristics in multiple files.

`generateWorkspaceManifest()` must only include:

```text
WorkspaceFileClass == project
```

unless the manifest explicitly has a separate control-plane section.

---

# 6. P0: Bind Accepted Inputs to the Current Pipeline Run

## File

```text
src/lib/agents/ruflo/artifact-store.ts
```

## Current issue

`resolveAcceptedStageInputs()` queries:

```ts
where: {
  conversationId,
  filePath: inputDef.name,
  state: 'ACCEPTED',
}
```

It does not require:

```text
pipelineRunId
```

Therefore a resumed/new pipeline run can consume an accepted artifact from an older run.

The artifact may be valid but belong to a different execution lineage.

## Required invariant

For every consumed input:

```text
artifact.pipelineRunId === current pipelineRunId
```

unless an explicit resume policy says otherwise.

If cross-run reuse is allowed, it must be explicit:

```ts
allowCrossRunReuse: boolean
```

and provenance must be preserved.

Default:

```text
false
```

---

# 7. P0: Bind Artifact Consumption to Dependency Fingerprints

Current artifact provenance records:

```text
dependencyFingerprint
parentArtifactIds
```

but `resolveAcceptedStageInputs()` computes a new fingerprint from the current inputs and does not use it to invalidate stale downstream artifacts before consumption.

Required rule:

```text
accepted artifact
+
current dependency fingerprint
=
consumable
```

If an upstream artifact changes:

```text
Planner v2
```

then:

```text
Architect v1
System v1
Designer v1
Blueprinter v1
Coder v1
...
```

must become stale and unusable.

Implement one function:

```ts
assertArtifactFreshForStage({
  artifact,
  currentDependencyFingerprint,
})
```

Use it in every stage input resolution path.

---

# 8. P0: Enforce Exact Architecture → Blueprint Equality

## Files

```text
src/lib/agents/ruflo/registry/Blueprinter.ts
src/lib/agents/ruflo/stage-acceptance.ts
```

The Blueprinter prompt now says:

> implementation/framework/static-asset files in blueprint.md MUST equal the corresponding approved architecture file set.

But `validateBlueprinter()` currently only validates:

```text
### File:
```

sections and non-empty paths.

It does not enforce equality.

## Required validator

Parse Blueprint paths.

Parse canonical Architecture files.

Then compare:

```text
architectureRequiredFiles
        ===
blueprintFiles
```

For every mismatch:

```text
MISSING_FROM_BLUEPRINT
UNAUTHORIZED_BLUEPRINT_FILE
DUPLICATE_BLUEPRINT_FILE
```

Reject all three.

Do not merely warn.

---

# 9. P0: Blueprint Must Preserve Ownership

File equality alone is insufficient.

Each Blueprint section must also carry:

```text
Owner Module
```

Example:

```text
### File: src/components/TaskCard.tsx
- Owner Module: Frontend Application
- Purpose: ...
- Dependencies: ...
```

Validator rule:

```text
blueprint.ownerModule(path)
===
architecture.ownerModule(path)
```

This prevents a downstream stage from silently moving responsibility between modules.

---

# 10. P0: Coder Must Be Authorized Per File

## Files

```text
src/lib/agents/ruflo/contract-executor.ts
src/lib/agents/ruflo/orchestrator.ts
src/lib/agents/ruflo/vfs.ts
```

`targetFile?: string` already exists.

The parameter is not enough.

Enforce:

```text
targetFile ∈ approved blueprint files
```

and:

```text
targetFile ∈ architecture-owned implementation files
```

and:

```text
targetFile ∉ control-plane artifacts
```

before Coder inference.

Coder must not be able to write:

```text
README.md
architecture.md
package-lock.json
random.ts
```

unless that exact path was authorized.

---

# 11. P0: VFS Write Authorization

## File

```text
src/lib/agents/ruflo/vfs.ts
```

Current:

```ts
writeVirtualFile(conversationId, filePath, content)
```

accepts any sanitized path.

Path sanitization prevents traversal.

It does NOT prevent architectural drift.

Add:

```ts
writeAuthorizedProjectFile({
  conversationId,
  pipelineRunId,
  stageExecutionId,
  filePath,
  content,
})
```

This function must verify:

```text
filePath is approved by current architecture/blueprint
```

and:

```text
writer stage == authorized stage
```

Use this for Coder.

Keep unrestricted `writeVirtualFile()` only for explicit control-plane projections.

---

# 12. P0: Workspace Manifest Must Be a Proof, Not a Snapshot

## File

```text
src/lib/agents/ruflo/vfs.ts
```

Current manifest contains:

```text
files
directories
entryPoints
hashes
sourceStageExecutionId
```

Good.

Add:

```text
architectureFileSetHash
blueprintFileSetHash
workspaceFileSetHash
```

and:

```text
authorizedFileSetHash
```

Then require:

```text
workspaceFileSetHash
===
authorizedFileSetHash
```

for final acceptance.

This converts the manifest from:

> "Here are the files currently in VFS."

into:

> "Here are the files currently in VFS, and here is cryptographic evidence that they match the approved topology."

---

# 13. P0: Fix Coder Manifest Self-Inclusion

`generateWorkspaceManifest()` is called from `executeContractStage()` before the Coder artifact is committed.

However, it enumerates the entire VFS.

The final design must explicitly exclude:

```text
workspace.manifest.json
```

from the project file set when generating itself.

Otherwise the manifest becomes self-referential.

Required:

```text
projectFiles =
VFS files
-
controlPlaneArtifacts
```

---

# 14. P0: Tester Must Be the Sole Verification Authority

## Files

```text
src/lib/agents/ruflo/orchestrator.ts
src/lib/agents/ruflo/verification-loop.ts
```

The previous audit identified two execution semantics:

```text
verification-loop
        +
Tester contract stage
```

The latest source still contains:

```ts
if (stageName === 'Tester') {
  await verifyAndRepairWorkspace(...);
  ...
  await executeContractStage(...)
}
```

This is still a split authority.

## Required architecture

Tester:

```text
executeContractStage('Tester')
        ↓
run deterministic tests
        ↓
persist VerificationRun
        ↓
generate test_report.md
        ↓
validate
        ↓
accept
```

Debugger:

```text
consume accepted Tester artifact
        ↓
produce debug_report.md
        ↓
apply authorized patches
        ↓
invalidate downstream artifacts
        ↓
rerun Tester
```

Remove direct Tester invocation of `verifyAndRepairWorkspace()`.

---

# 15. P0: Debugger Must Be a Real Canonical Stage

Current contract registry correctly declares:

```text
Debugger
  inputs:
    test_report.md
    workspace.manifest.json
  output:
    debug_report.md
```

But orchestration still conditionally looks for an existing Debugger StageExecution.

That is backwards.

The repair controller should explicitly invoke:

```ts
executeContractStage({
  stageName: 'Debugger',
})
```

when Tester fails.

Never infer invocation from whether a database record happens to exist.

---

# 16. P0: Debugger Patch Authorization

Debugger output contains:

```json
{
  "patches": [
    {
      "file": "...",
      "startLine": 1,
      "endLine": 2,
      "replacement": "...",
      "reason": "..."
    }
  ]
}
```

Current validator checks path safety.

It must additionally check:

```text
file ∈ approved architecture/blueprint files
```

Debugger may repair.

Debugger may not:

```text
add new files
delete arbitrary files
modify control-plane artifacts
modify package manifests unless explicitly authorized
modify architecture.md
modify blueprint.md
```

unless the pipeline has a dedicated contract for that mutation.

---

# 17. P0: Any Workspace Mutation Invalidates Downstream Artifacts

If Debugger changes:

```text
src/components/TaskCard.tsx
```

then:

```text
workspace.manifest.json
test_report.md
security_report.md
review_report.md
```

must become stale.

At minimum:

```text
Coder manifest
Tester
Security
Reviewer
```

must be invalidated.

Do not let Final Gate accidentally consume an old accepted Security or Reviewer report.

---

# 18. P0: Security Must Be Fresh Against Current Workspace

`final-gate.ts` currently checks that a Security artifact exists and its status is secure.

That is not enough.

Require Security provenance:

```text
securityArtifact.parentArtifactIds contains current Coder manifest
```

and:

```text
securityArtifact.dependencyFingerprint
===
current security dependency fingerprint
```

Also bind Security to:

```text
current workspace hash
```

Prefer storing:

```ts
workspaceHash
```

directly on artifact provenance.

---

# 19. P0: Reviewer Must Be Fresh Against Current Workspace

Same problem.

Reviewer must prove it reviewed:

```text
current workspace
current architecture
current test report
```

Required provenance:

```text
Reviewer
 ├── architecture artifact ID
 ├── tester artifact ID
 └── coder manifest artifact ID
```

Final Gate must reject Reviewer if any parent artifact is superseded.

---

# 20. P0: Final Gate Must Select the Current Artifact Lineage

## File

```text
src/lib/agents/ruflo/final-gate.ts
```

Current queries use:

```ts
findFirst({
  where: {
    conversationId,
    stageName,
    state: 'ACCEPTED'
  }
})
```

This is vulnerable to accepting an older accepted artifact if a newer one is stale/superseded or if lineage has diverged.

Use:

```text
current pipeline run
+
latest accepted version
+
fresh dependency fingerprint
+
current workspace hash
```

as the selection criteria.

Final Gate should not merely ask:

> "Does an accepted artifact exist?"

It should ask:

> "Does the accepted artifact belong to the exact current dependency lineage?"

---

# 21. P0: Security Status Parsing Is Currently Too Loose

Current Final Gate logic checks:

```ts
statusText.includes('SECURE')
```

This can accidentally accept:

```text
NOT SECURE
```

because:

```text
"NOT SECURE".includes("SECURE") === true
```

The validator has the same conceptual weakness.

## Required fix

Parse the status as an exact token:

```ts
const status = overallStatus.trim().split(/\s+/)[0];
```

or better, require a canonical one-line value.

Accept only:

```text
SECURE
SECURE_WITH_WARNINGS
```

Reject:

```text
NOT SECURE
VULNERABLE
CRITICAL
```

---

# 22. P0: Reviewer Schema Must Be Centralized

## File

```text
src/lib/agents/ruflo/stage-acceptance.ts
```

Reviewer JSON is currently hand-validated.

Create:

```text
contracts/schemas/reviewer.ts
```

with one schema.

Use the same schema for:

```text
prompt documentation
stage acceptance
tests
final gate
```

Do the same for:

```text
Debugger
Security
Tester
```

where practical.

One contract, one schema.

---

# 23. P0: Tester Contract Is Still Too Weak

Current Tester validator accepts essentially:

```text
# Test Report
PASS
```

That is not a useful contract for deterministic verification.

Require fields such as:

```text
### Result
PASS | FAIL

### Summary
...

### Tests
...

### Failures
...

### Workspace Hash
...

### Verification Run ID
...
```

The exact report format should be encoded in:

```text
contracts/versions.ts
```

and the validator.

The actual deterministic VerificationRun must be the source of truth for pass/fail.

The LLM must not be able to declare the workspace healthy by writing:

```text
PASS
```

---

# 24. P0: Coder Validator Must Validate Manifest Semantics

Current Coder validator checks:

```text
JSON
files array
schemaVersion
projectRoot
directories
```

It does not verify:

```text
hashes match VFS
files match authorized set
directories match files
entryPoints exist
sourceStageExecutionId is current
```

Move these checks into a canonical:

```ts
validateWorkspaceManifest()
```

and invoke it after generation.

---

# 25. P1: Architecture Entry Point Ownership

Architecture validator should verify:

```text
Frontend Entry Point
Backend Entry Point
```

are:

1. present in the project tree
2. owned by exactly one module
3. compatible with framework
4. included in Blueprint
5. eventually present in workspace

For example:

```text
Frontend Entry Point:
src/app/page.tsx
```

must satisfy:

```text
tree
→ owner
→ blueprint
→ workspace
```

---

# 26. P1: System Must Be Semantically Bound to Architecture

The latest System prompt now explicitly says:

> Backend design must operate within the exact architecture paths.

Good.

The validator still needs to enforce this.

For every backend file mentioned by System:

```text
path ∈ architecture files
```

No new topology.

Likewise:

```text
API endpoint
→ architecture backend boundary
```

must be consistent.

---

# 27. P1: Designer Must Not Create Architecture

The Designer prompt now says it cannot introduce unapproved file paths.

Add a validator-level check.

Extract component/page file references from `ui_spec.md`.

Reject references not found in:

```text
architecture files
```

or:

```text
blueprint files
```

The Designer is a consumer, not an architectural authority.

---

# 28. P1: Blueprinter Must Validate Dependencies

For each Blueprint file:

```text
Dependencies
```

must resolve to:

```text
architecture files
+
approved external packages
```

Reject:

```text
Dependency: src/random/NewThing.ts
```

if that path is not architecture-approved.

This closes a subtle file-invention channel.

---

# 29. P1: Requirement Traceability Must Be Machine-Checkable

Planner defines:

```text
Feature
Functional Requirement
Acceptance Criterion
```

Architect currently has:

```text
Supports Features
```

Make feature IDs canonical:

```text
Feature-001
Feature-002
```

Then enforce:

```text
Planner Feature
      ↓
Architect Supports Features
      ↓
Designer/UI
      ↓
Blueprint
      ↓
Coder
      ↓
Tester
```

No feature should disappear between stages.

---

# 30. P1: Stop Using Raw Markdown Heading Presence as the Main Contract

The current stage validators are much better than before, but several still rely heavily on:

```ts
content.includes(...)
```

This creates false positives.

Example:

```text
Some paragraph:
The section "### Components" should exist.
```

would satisfy a naive heading check.

Use exact line-based heading parsing:

```ts
/^###\s+Components\s*$/m
```

for every canonical heading.

Also reject duplicate required headings.

---

# 31. P1: Fix `extractRequiredSection()`

Current implementation:

```ts
content.indexOf(heading)
```

is substring-based.

Replace with exact heading detection:

```ts
const headingRegex = /^###\s+...\s*$/m;
```

Then calculate section boundaries from actual heading lines.

This utility is used by multiple validators, so fixing it improves the whole pipeline.

---

# 32. P1: Prompt/Validator Tests Need Negative Semantic Fixtures

The new `prompt-contract-sync.test.ts` proves basic shape.

Add adversarial fixtures for every stage.

### Architect

- duplicate ownership
- orphan route
- orphan public asset
- missing entry point
- duplicate module
- unknown dependency
- cycle
- unauthorized config classification

### Blueprinter

- missing architecture file
- extra file
- duplicate file
- wrong owner
- unknown dependency

### Coder

- manifest includes unauthorized file
- manifest missing approved file
- wrong hash
- stale execution ID
- control-plane artifact included

### Tester

- PASS without VerificationRun
- stale workspace hash
- missing failures section

### Debugger

- path traversal
- unauthorized file
- new file creation
- control-plane mutation

### Security

- `NOT SECURE`
- CRITICAL
- invalid score
- missing workspace hash

### Reviewer

- wrong status
- missing findings
- stale parent artifacts

---

# 33. P1: Contract Versions Must Be Real Version Contracts

`CONTRACT_VERSIONS` currently records:

```text
promptVersion
validatorVersion
version
```

Good.

But changing semantic rules without changing the version can silently invalidate provenance.

Define:

```text
version = semantic output contract
promptVersion = prompt behavior
validatorVersion = validator behavior
```

Require an explicit version bump whenever any of these changes.

Add a test that detects:

```text
prompt changed
validator changed
contract version unchanged
```

where practical.

---

# 34. P1: Remove Dead Duplicate Execution Infrastructure

Audit and remove:

```text
generateStageCandidate()
```

if it remains unused.

The canonical path must be:

```text
executeContractStage()
    ↓
resolve inputs
    ↓
assert compatibility
    ↓
StageExecution
    ↓
runAgent
    ↓
validate
    ↓
commit artifact
```

There must not be a second generic stage-generation path.

---

# 35. P1: Lease Loss Must Abort Active Inference

Current lease heartbeat supports:

```ts
onLeaseLost
```

but the orchestrator starts the heartbeat without wiring lease loss into the pipeline AbortController.

Required:

```text
lease lost
   ↓
AbortController.abort()
   ↓
inference aborts
   ↓
stage execution fails
   ↓
no artifact commit
```

Never allow a worker that lost the lease to finish an expensive LLM call and commit an artifact.

---

# 36. P1: Final Gate Must Reject Cross-Run Artifacts

Final Gate should verify:

```text
artifact.pipelineRunId === current pipelineRunId
```

for all mandatory stages.

This closes the same lineage hole as `resolveAcceptedStageInputs()`.

---

# 37. P1: Resume Semantics Need Explicit Invalidation

If a pipeline resumes after:

```text
Architect v2
```

then downstream accepted artifacts from:

```text
System v1
Designer v1
Blueprinter v1
Coder v1
Tester v1
Security v1
Reviewer v1
```

cannot remain valid.

Implement:

```ts
invalidateDescendants(stageName, pipelineRunId)
```

using the contract graph.

Example:

```text
Architect changed
   ↓
System
Designer
Blueprinter
Coder
Tester
Debugger
Security
Reviewer
```

all become stale.

Do not rely on stage ordering alone.

---

# 38. P1: Replace History-Based Fast-Forward

If orchestrator fast-forwards a stage based only on:

```text
"stage has already completed"
```

that is insufficient.

Fast-forward requires:

```text
accepted artifact
+
current pipeline run
+
current dependency fingerprint
+
current contract version
+
valid provenance
```

Otherwise resume can skip required regeneration.

---

# 39. P1: Invariant Script Must Validate Semantic Graph Rules

`scripts/check_pipeline_invariants.ts` currently verifies:

- canonical filenames
- registered producers
- some forbidden patterns

Extend it to verify:

```text
every stage has exactly one producer
every input has exactly one producer
no stage consumes its own output
no dependency cycle
all versions exist
all 11 prompts are represented
all 11 validators are represented
```

Also verify:

```text
architecture-parser.ts
architecture-file-policy.ts
```

are the only canonical Architecture parser/policy modules.

---

# 40. P1: Add a Single Canonical Stage Graph

Create:

```ts
const CANONICAL_STAGE_GRAPH = {
  Queen: [],
  Planner: ['Queen'],
  Architect: ['Planner', 'Queen'],
  System: ['Architect', 'Planner'],
  Designer: ['Architect', 'Planner'],
  Blueprinter: ['Architect', 'System', 'Designer'],
  Coder: ['Blueprinter', 'Architect', 'System', 'Designer'],
  Tester: ['Coder'],
  Debugger: ['Tester', 'Coder'],
  Security: ['Coder', 'Architect'],
  Reviewer: ['Tester', 'Coder', 'Architect'],
};
```

Derive:

```text
registry dependencies
orchestrator order
invalidation rules
final gate lineage
test expectations
```

from the same graph.

Do not maintain five versions of the graph.

---

# 41. Recommended Canonical Data Flow

```text
Queen
  │
  ▼
plan.md
  │
  ▼
Planner
  │
  ▼
requirements.md
  │
  ▼
Architect
  │
  ├── canonical architecture object
  ├── file classification
  ├── module ownership
  └── architecture file-set hash
  │
  ├───────────────┐
  ▼               ▼
System          Designer
  │               │
  └───────┬───────┘
          ▼
      Blueprinter
          │
          ├── exact architecture file set
          ├── exact ownership
          └── blueprint file-set hash
          │
          ▼
        Coder
          │
          ├── only authorized paths
          ├── actual file hashes
          └── workspace manifest
          │
          ▼
        Tester
          │
          ├── deterministic verification
          └── workspace hash
          │
      ┌───┴────┐
      │        │
    PASS      FAIL
      │        │
      │      Debugger
      │        │
      │        ▼
      │     workspace mutation
      │        │
      │        └──────► Tester
      │
      ▼
 Security + Reviewer
      │
      ▼
 Final Gate
```

---

# 42. Exact Files To Change

## P0

```text
src/lib/agents/ruflo/architecture-parser.ts
src/lib/agents/ruflo/architecture-file-policy.ts
src/lib/agents/ruflo/stage-acceptance.ts
src/lib/agents/ruflo/artifact-store.ts
src/lib/agents/ruflo/vfs.ts
src/lib/agents/ruflo/contract-executor.ts
src/lib/agents/ruflo/orchestrator.ts
src/lib/agents/ruflo/verification-loop.ts
src/lib/agents/ruflo/final-gate.ts
src/lib/agents/ruflo/contracts/registry.ts
src/lib/agents/ruflo/contracts/versions.ts
```

## New files

```text
src/lib/agents/ruflo/contracts/schemas/reviewer.ts
src/lib/agents/ruflo/contracts/schemas/debugger.ts
src/lib/agents/ruflo/contracts/schemas/security.ts
src/lib/agents/ruflo/contracts/schemas/tester.ts
src/lib/agents/ruflo/workspace-policy.ts
```

## P1

```text
src/lib/agents/ruflo/pipeline-lease.ts
scripts/check_pipeline_invariants.ts
src/lib/agents/ruflo/registry/System.ts
src/lib/agents/ruflo/registry/Designer.ts
src/lib/agents/ruflo/registry/Blueprinter.ts
src/lib/agents/ruflo/registry/Architect.ts
```

---

# 43. Test Matrix

## Architecture

```text
empty architecture                    -> FAIL
missing section                      -> FAIL
duplicate section                    -> FAIL
duplicate ownership                  -> FAIL
orphan implementation               -> FAIL
orphan framework file               -> FAIL
orphan public asset                 -> FAIL
unowned config                      -> PASS
owned config                        -> PASS
unknown dependency                  -> FAIL
dependency cycle                    -> FAIL
entry point missing                 -> FAIL
```

## Blueprint

```text
exact file set                      -> PASS
missing file                        -> FAIL
extra file                          -> FAIL
duplicate file                      -> FAIL
wrong owner                         -> FAIL
unknown dependency                  -> FAIL
```

## Coder

```text
exact workspace                    -> PASS
extra file                         -> FAIL
missing file                       -> FAIL
wrong hash                         -> FAIL
control-plane file                 -> FAIL
stale execution ID                 -> FAIL
```

## Verification

```text
PASS current workspace              -> PASS
PASS stale workspace                -> FAIL
FAIL then Debugger                  -> repair
Debugger unauthorized file         -> FAIL
Debugger path traversal            -> FAIL
repair then Tester rerun           -> PASS
```

## Security / Reviewer

```text
current workspace                  -> PASS
stale workspace                    -> FAIL
old parent artifact                -> FAIL
NOT SECURE                         -> FAIL
VULNERABLE                         -> FAIL
Reviewer PASS on old manifest      -> FAIL
```

---

# 44. Definition of Done

The pipeline is considered contract-converged only when all are true:

### Architecture

- [ ] exact file inventory is machine-readable
- [ ] every implementation/framework/static asset has exactly one owner
- [ ] every owner path exists in the tree
- [ ] every entry point exists and is owned
- [ ] architecture is parsed exactly once

### Downstream specs

- [ ] System cannot modify architecture topology
- [ ] Designer cannot introduce architecture files
- [ ] Blueprint file set exactly equals approved architecture file set
- [ ] Blueprint preserves ownership
- [ ] Blueprint dependencies are resolvable

### Coder

- [ ] Coder receives exact target file
- [ ] Coder can write only authorized files
- [ ] VFS enforces write authorization
- [ ] workspace manifest excludes control-plane artifacts
- [ ] workspace manifest hashes match actual VFS
- [ ] workspace file set equals authorized file set

### Verification

- [ ] Tester has one canonical execution path
- [ ] VerificationRun is authoritative for pass/fail
- [ ] Debugger is a real StageExecution
- [ ] Debugger can patch only authorized files
- [ ] workspace mutations invalidate downstream artifacts

### Final Gate

- [ ] all mandatory artifacts belong to current pipeline lineage
- [ ] all dependencies are fresh
- [ ] Security is bound to current workspace
- [ ] Reviewer is bound to current workspace
- [ ] latest VerificationRun matches current workspace
- [ ] no legacy fallback exists
- [ ] lease is valid
- [ ] lease loss aborts active work

### Contract infrastructure

- [ ] all 11 stage prompts have exact contract versions
- [ ] all 11 validators have exact contract versions
- [ ] all stage schemas are centralized where structured output exists
- [ ] stage graph is defined once
- [ ] pipeline invariant script passes
- [ ] adversarial regression suite passes

---

# 45. Implementation Order

Do not implement this randomly. Humans already invented dependency graphs so we might as well use them.

```text
1. Canonical Architecture object
2. Exact Architecture file inventory
3. Control-plane vs project-file policy
4. Blueprint semantic equality validator
5. Coder authorization
6. VFS authorization
7. Workspace manifest proof
8. Current-run artifact lineage
9. Dependency freshness/invalidation
10. Canonical Tester path
11. Canonical Debugger path
12. Debugger authorization
13. Security freshness
14. Reviewer freshness
15. Final Gate lineage checks
16. Lease-loss abort
17. Schema centralization
18. Adversarial regression suite
19. Pipeline invariant scanner expansion
20. Remove remaining duplicate infrastructure
```

---

# 46. Final Principle

The goal is not:

```text
make the current Architect error disappear
```

The goal is:

```text
make it impossible for one accepted stage
to reinterpret another accepted stage.
```

The complete contract chain must therefore be:

```text
Requirements
     ↓
Architecture
     ↓
Canonical File Inventory
     ↓
Module Ownership
     ↓
Blueprint
     ↓
Coder Authorization
     ↓
Actual Workspace
     ↓
Verification
     ↓
Security
     ↓
Review
     ↓
Final Gate
```

with provenance at every transition.

The final invariant is:

```text
APPROVED_ARCHITECTURE_FILES
==
APPROVED_BLUEPRINT_FILES
==
CODER_AUTHORIZED_FILES
==
ACTUAL_PROJECT_FILES
```

and:

```text
CURRENT_ARTIFACT_LINEAGE
==
CURRENT_PIPELINE_RUN
==
CURRENT_WORKSPACE_STATE
```

Anything weaker leaves the pipeline capable of accepting internally inconsistent artifacts while every individual validator proudly reports that its own tiny kingdom is functioning. That is exactly how distributed systems become haunted houses.
