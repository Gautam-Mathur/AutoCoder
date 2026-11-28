# AutoCoder Recursive Contract & Prompt Convergence Plan

**Repository:** `Gautam-Mathur/AutoCoder`  
**Audit target:** current pipeline contract architecture  
**Primary failure:** Architect validation rejects unowned `src/app/layout.tsx` and `public/favicon.ico`

---

## 0. Executive Verdict

The current failure is:

```text
Stage validation failed for Architect:
Architecture Contract Error:
File "src/app/layout.tsx" from Project Folder Structure is not claimed by any module.

Architecture Contract Error:
File "public/favicon.ico" from Project Folder Structure is not claimed by any module.
```

This is a **valid contract failure**.

The Architect prompt already explicitly requires:

- framework special files to be owned by exactly one module
- `layout.tsx` not to be omitted
- `route.ts` not to be omitted
- public assets not to be omitted
- every non-exempt tree file to have exactly one owner
- every owned file to exist in the tree

Therefore, adding more prompt wording is not the fundamental fix.

The deeper issue is that AutoCoder currently has several overlapping representations of architecture:

```text
Agent prompts
    ↓
Markdown artifacts
    ↓
Multiple parsers
    ↓
Multiple validators
    ↓
ProjectContract extraction
    ↓
Contract registry
    ↓
VFS
    ↓
Blueprint
    ↓
Workspace manifest
    ↓
Verification
    ↓
Final Gate
```

Some of these layers independently reinterpret the same facts.

The objective of this plan is to make the pipeline:

> **One canonical contract graph, one authority per fact, one execution path per stage, deterministic validation at every boundary, and complete provenance from requirement to generated file.**

---

# 1. Core Invariants

These are the non-negotiable invariants for the final architecture.

## 1.1 Architecture ownership

For every architecture file `F`:

```text
requiresOwnership(F) == true
    ⇒
owners(F).length === 1
```

Therefore:

```text
0 owners → FAIL
2+ owners → FAIL
1 owner → PASS
```

---

## 1.2 Architecture tree consistency

For every module-owned file:

```text
ownedFile ∈ architectureTree
```

For every required tree file:

```text
treeFile ∈ ownershipMap
```

---

## 1.3 Architecture → Blueprint equality

The Blueprint cannot invent or omit project files.

```text
APPROVED_ARCHITECTURE_FILE_SET
    ===
APPROVED_BLUEPRINT_FILE_SET
```

Control-plane artifacts are excluded from this comparison.

---

## 1.4 Blueprint → Coder authorization

Coder may only write:

```text
targetFile ∈ APPROVED_BLUEPRINT_FILE_SET
```

Any unauthorized write must fail before VFS mutation.

---

## 1.5 Workspace → Manifest equality

The workspace manifest must describe the actual VFS.

```text
MANIFEST.files
    ===
ACTUAL_PROJECT_FILES
```

Hashes must match.

---

## 1.6 Verification freshness

Tester, Security, and Reviewer must be bound to the workspace they evaluated.

```text
artifact.workspaceHash
    ===
currentWorkspaceHash
```

Otherwise the artifact is stale.

---

## 1.7 Dependency freshness

If an upstream artifact changes, dependent artifacts become stale.

Example:

```text
architecture v2
```

invalidates:

```text
System
Designer
Blueprinter
Coder
Tester
Debugger
Security
Reviewer
```

---

# 2. Current Failure Root Cause

The validator in:

```text
src/lib/agents/ruflo/spec-contract.ts
```

extracts:

```text
Project Folder Structure
        ↓
treeFiles
```

and:

```text
### Modules
        ↓
Owned Files
        ↓
fileToModulesMap
```

Then it checks:

```text
treeFile exists
AND
treeFile has no owner
```

and correctly produces:

```text
Architecture Contract Error:
File "src/app/layout.tsx" ... is not claimed by any module.
```

The same happens for:

```text
public/favicon.ico
```

The immediate generated architecture is inconsistent.

The validator is not the problem.

---

# 3. Why Prompt-Only Fixes Are Insufficient

The Architect prompt already contains rules equivalent to:

```text
Framework special files must be owned.
Do not omit layout.tsx.
Do not omit route.ts.
Do not omit public assets.
Every tree file must have exactly one owner.
Every owned file must exist in the tree.
```

Therefore:

```text
MORE PROMPT WORDING
```

is not the correct architectural solution.

The machine already knows the rule.

The missing capability is:

```text
canonical representation
+
canonical classification
+
structured repair
```

---

# 4. P0 — Introduce Canonical Architecture File Policy

## New file

```text
src/lib/agents/ruflo/contracts/architecture-file-policy.ts
```

## Purpose

Every architecture file must be classified before validation.

Recommended classifications:

```ts
type ArchitectureFileClass =
  | "implementation"
  | "framework"
  | "static-asset"
  | "config"
  | "schema"
  | "documentation";
```

Recommended representation:

```ts
interface ArchitectureFilePolicy {
  path: string;
  class: ArchitectureFileClass;
  requiresOwnership: boolean;
  generatedByCoder: boolean;
  frameworkRole?: string;
}
```

---

# 5. P0 — Replace Blacklist-Based File Exemptions

Current architecture validation uses:

```ts
const IGNORED_ROOT_FILES = new Set([
  ...
]);
```

This is a blacklist model.

Replace it with positive classification.

Instead of:

```text
"Is this one of the files we forgot to reject?"
```

use:

```text
"What class of file is this, and what policy applies?"
```

This prevents future exceptions for:

```text
loading.tsx
error.tsx
not-found.tsx
global-error.tsx
middleware.ts
robots.ts
sitemap.ts
manifest.ts
icon.png
apple-icon.png
```

---

# 6. P0 — Next.js Framework File Policy

For Next.js App Router, files such as:

```text
src/app/page.tsx
src/app/layout.tsx
src/app/loading.tsx
src/app/error.tsx
src/app/not-found.tsx
src/app/global-error.tsx
src/app/**/page.tsx
src/app/**/layout.tsx
src/app/**/loading.tsx
src/app/**/error.tsx
src/app/**/route.ts
```

must be classified deterministically.

They are architecture files.

They require exactly one owner.

Do not special-case only:

```text
src/app/layout.tsx
```

The policy must cover the whole framework family.

---

# 7. P0 — Public Asset Policy

Files under:

```text
public/**
```

must be classified as:

```text
static-asset
```

For generated project assets, recommended:

```text
requiresOwnership = true
```

This prevents:

```text
public/favicon.ico
public/logo.svg
public/hero.webp
```

from silently becoming architecture orphans.

---

# 8. P0 — Canonical Architecture Object

## New file

```text
src/lib/agents/ruflo/contracts/architecture-contract.ts
```

Recommended shape:

```ts
interface CanonicalProjectArchitecture {
  framework: string;
  language: string;
  routing: string;

  tree: ArchitectureFile[];

  modules: ArchitectureModule[];

  ownership: Record<string, string>;

  entryPoints: string[];
  backendEntryPoints: string[];

  moduleGraph: Record<string, string[]>;

  contractHash: string;
}
```

Markdown remains the human-readable transport.

The canonical object becomes the semantic truth.

---

# 9. P0 — Parse Architecture Exactly Once

Current architecture logic is split across:

```text
parseArchitectureModules()
validateArchitectureArtifact()
extractProjectContract()
orchestrator.ts regex parsing
```

This creates multiple interpretations of the same artifact.

Replace with:

```text
architecture.md
      ↓
parseArchitectureArtifact()
      ↓
CanonicalProjectArchitecture
      ↓
validateCanonicalArchitecture()
      ↓
accepted artifact
```

Every downstream consumer uses the canonical object.

No downstream stage reparses accepted architecture Markdown independently.

---

# 10. P0 — Remove Architecture Parsing From `extractProjectContract()`

Current `extractProjectContract()` independently derives architecture facts.

Change it so architecture-derived facts come from:

```text
CanonicalProjectArchitecture
```

The function may continue extracting non-architecture facts from other artifacts, but it must not create a competing interpretation of:

```text
modules
ownership
tree
entry points
```

---

# 11. P0 — Remove Architecture Regex Parsing From Orchestrator

Current `orchestrator.ts` contains additional logic around:

```text
Owned Files:
Project Folder Structure
```

That is another architecture parser.

Replace it with:

```ts
const architecture = await getAcceptedArchitectureContract(...);
```

The orchestrator consumes structured architecture state.

It does not reinterpret Markdown.

---

# 12. P0 — Exact Ownership Validation

Validation must operate on normalized paths.

Normalize:

```text
./src/App.tsx
src\App.tsx
SRC/APp.tsx
```

into the canonical representation used by the repository.

Then build:

```text
file → owners[]
```

Validation:

```text
requiresOwnership(file)
    &&
owners.length !== 1
```

→ error.

This solves:

### Orphan ownership

```text
owners = []
```

### Duplicate ownership

```text
owners = [ModuleA, ModuleB]
```

---

# 13. P0 — Entry Point Ownership

For:

```text
Frontend Entry Point
Backend Entry Point
```

validate:

```text
entryPoint ∈ tree
```

and:

```text
requiresOwnership(entryPoint)
    ⇒
owners(entryPoint).length === 1
```

Entry points cannot exist merely as metadata.

They must correspond to actual architecture files.

---

# 14. P0 — Architecture Contract Hash

After canonical normalization:

```ts
contractHash = sha256(
  canonicalSerialize({
    framework,
    language,
    routing,
    tree,
    modules,
    ownership,
    entryPoints,
    backendEntryPoints,
    moduleGraph
  })
);
```

Store the hash with the accepted architecture artifact.

Downstream artifacts record the architecture hash they were generated against.

---

# 15. P0 — Structured Architect Validation Errors

Instead of only:

```text
File "src/app/layout.tsx" is not claimed
```

produce structured diagnostics:

```ts
{
  code: "UNOWNED_ARCHITECTURE_FILE",
  path: "src/app/layout.tsx",
  expectedOwners: 1
}
```

and:

```ts
{
  code: "UNOWNED_ARCHITECTURE_FILE",
  path: "public/favicon.ico",
  expectedOwners: 1
}
```

Recommended diagnostic codes:

```text
UNOWNED_ARCHITECTURE_FILE
DUPLICATE_FILE_OWNER
ORPHAN_MODULE_FILE
UNKNOWN_MODULE_DEPENDENCY
MODULE_DEPENDENCY_CYCLE
INVALID_ENTRY_POINT
INVALID_FRAMEWORK_FILE
INVALID_PUBLIC_ASSET_PATH
```

---

# 16. P0 — Surgical Architect Retry

Architect retry must receive machine-generated diagnostics.

Retry instruction:

```text
Fix ONLY the reported architecture contract violations.

Do not redesign unrelated modules.
Do not change the technology stack.
Do not add unrelated files.
Do not remove valid files.
Preserve all valid ownership assignments.

Revalidate the complete architecture before returning it.
```

The repair loop becomes:

```text
candidate
   ↓
parse
   ↓
validate
   ↓
structured errors
   ↓
targeted repair
   ↓
revalidate
```

Not:

```text
candidate
   ↓
FAIL
   ↓
generate another architecture from scratch
```

---

# 17. P0 — Blueprinter Must Be Semantically Validated

Current Blueprinter acceptance is too close to:

```text
"Does this look like a blueprint?"
```

It must validate:

```text
blueprint files
    ===
approved architecture files
```

Also require:

```text
blueprintFile.owner
    ===
architecture.owner
```

No extra files.

No missing files.

No duplicate files.

---

# 18. P0 — Coder Must Not Invent Files

Coder's responsibility:

```text
HOW to implement an approved file
```

Not:

```text
WHICH files should exist
```

Before every Coder VFS write:

```ts
assertWorkspaceWriteAllowed(
  conversationId,
  targetFile,
  "Coder"
);
```

Rule:

```text
targetFile ∈ approvedBlueprintFileSet
```

Otherwise:

```text
FAIL BEFORE VFS WRITE
```

---

# 19. P0 — VFS Write Authorization

Recommended policy:

### Coder

```text
targetFile must exist in approved blueprint
```

### Debugger

```text
targetFile must already exist
AND
targetFile must be approved
```

### Pipeline control-plane

Only canonical control-plane writers may modify:

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

No arbitrary agent gets unrestricted VFS mutation.

---

# 20. P0 — Workspace Manifest Provenance

Current Workspace Manifest already captures:

```text
schemaVersion
projectRoot
files
directories
entryPoints
generatedAt
sourceStageExecutionId
```

Extend it with:

```text
architectureArtifactId
architectureContractHash

blueprintArtifactId
blueprintContractHash

approvedFileSetHash
workspaceHash
```

This allows the system to prove:

```text
This workspace came from this accepted architecture
and this accepted blueprint.
```

---

# 21. P0 — Workspace File-Set Equality

At Coder completion:

```text
ACTUAL_PROJECT_FILE_SET
    ===
APPROVED_BLUEPRINT_FILE_SET
```

Exclude only explicitly classified control-plane/generated metadata.

This catches:

```text
missing generated file
extra generated file
```

even when the project happens to compile.

---

# 22. P0 — Tester Is Still a Duplicate Execution Path

Current `orchestrator.ts` still contains a Tester special branch:

```ts
if (stageName === 'Tester') {
  await verifyAndRepairWorkspace(...);

  await executeContractStage({
    stageName: 'Tester',
    ...
  });
}
```

This means Tester semantics are split between:

```text
verification-loop.ts
```

and:

```text
executeContractStage()
```

This contradicts the intended canonical execution model.

Correct flow:

```text
executeContractStage(Tester)
      ↓
deterministic workspace verification
      ↓
VerificationRun
      ↓
test_report.md
```

There must be one Tester authority.

---

# 23. P0 — Debugger Is Still a Duplicate Execution Path

`verification-loop.ts` independently invokes Debugger inference.

`orchestrator.ts` also has a Debugger stage branch.

Therefore:

```text
Verification Debugger
+
Pipeline Debugger
```

still exist.

Collapse them into:

```text
Tester
   ↓
VerificationRun FAIL
   ↓
executeContractStage(Debugger)
   ↓
validated Debugger artifact
   ↓
apply patches
   ↓
Tester
```

One Debugger.

One StageExecution.

One artifact lifecycle.

---

# 24. P0 — Debugger StageExecution

Every Debugger execution must have:

```text
StageExecution
VerificationRun ID
input test report
workspace hash before repair
validated patch artifact
workspace hash after repair
```

No direct inference path may bypass the contract executor.

---

# 25. P1 — Remove `assertArtifactCompatibility()`

Current executor performs:

```ts
assertInputCompatibility()
assertOutputCompatibility()
assertArtifactCompatibility()
```

The third check compares the stage's produced artifact against the stage's input definitions.

That is conceptually redundant/wrong.

Use:

```text
assertInputCompatibility()
```

before generation.

Use:

```text
assertOutputCompatibility()
```

after generation.

Remove the redundant production call to:

```text
assertArtifactCompatibility()
```

---

# 26. P1 — Queen Prompt and Validator Must Converge

Queen prompt requires exact sections:

```text
### Project Name
### Project Goal
### MVP Scope
### Technical Constraints
### Risks
```

But current acceptance logic allows broad alternatives.

This creates:

```text
Prompt grammar ≠ Validator grammar
```

Fix by establishing one canonical Queen contract.

---

# 27. P1 — Planner Prompt and Validator Must Converge

Planner prompt requires:

```text
### Features
### Functional Requirements
### Acceptance Criteria
```

Current validator is broader.

Make the grammar explicit and shared.

---

# 28. P1 — System Must Preserve Architecture Facts

System owns:

```text
backend behavior
database behavior
API behavior
services
middleware
```

System must not redefine:

```text
frontend topology
architecture modules
entry-point strategy
approved file set
```

Architecture remains authoritative.

---

# 29. P1 — Designer Must Not Become a Second Architect

Designer owns:

```text
design system
pages
components
UI behavior
visual rules
```

Designer must not silently introduce authoritative implementation files.

If a new file is needed:

```text
Designer concept
    ↓
Architectural decision
    ↓
Blueprint
    ↓
Coder
```

---

# 30. P0 — Requirement Traceability

Introduce stable IDs:

```text
F-001
FR-001
AC-001
MOD-001
FILE-001
TEST-001
```

Trace:

```text
Requirement
    ↓
Architecture Module
    ↓
Blueprint File
    ↓
Workspace File
    ↓
Test
```

This gives Reviewer deterministic evidence.

---

# 31. P1 — Modules Must Reference Real Requirements

`Supports Features` should preferably reference stable feature IDs.

Validate:

```text
featureId exists in Planner
```

Architect cannot silently invent new scope.

---

# 32. P1 — Blueprint Must Reference Architecture Modules

Every blueprint file should carry:

```text
Architecture Module: MOD-001
```

Then validate:

```text
MOD-001 owns file
```

This gives a deterministic architecture → blueprint link.

---

# 33. P1 — Security Freshness

Security PASS must be tied to:

```text
workspaceHash
```

Final Gate must require:

```text
security.workspaceHash === currentWorkspaceHash
```

---

# 34. P1 — Reviewer Freshness

Reviewer should bind to:

```text
workspaceHash
architectureContractHash
blueprintContractHash
testReportHash
securityReportHash
```

A review of stale code must never satisfy Final Gate.

---

# 35. P1 — Remove Legacy Final Gate Fallbacks

Final Gate must not accept:

```text
securityStageOutput
reviewerStageOutput
```

Only canonical accepted artifacts.

The final gate should consume:

```text
ArtifactVersion
```

and its provenance.

---

# 36. P0 — Security Status Must Be Structured

Do not accept security by:

```text
content.includes("PASS")
```

Parse:

```text
### Overall Status
```

and enforce:

```text
SECURE
SECURE_WITH_WARNINGS
VULNERABLE
CRITICAL
```

Policy must determine which statuses can pass.

---

# 37. P0 — Reviewer Must Be Schema-First

Reviewer JSON should be validated as structured data:

```text
JSON.parse()
    ↓
schema validation
    ↓
status validation
    ↓
findings consistency
```

Do not infer Reviewer status from arbitrary text.

---

# 38. P0 — Tester Report Must Bind to VerificationRun

Require:

```text
workspaceHash
verificationRunId
passed
failed
total
```

and:

```text
testReport.workspaceHash
    ===
verificationRun.workspaceHash
```

---

# 39. P0 — Debugger Patch Validation

Before applying a patch:

```text
file exists
file is approved
startLine >= 1
endLine >= startLine
endLine <= file length
```

After applying:

```text
workspaceHash changes
```

Then Tester reruns.

---

# 40. P0 — Final Gate Must Be Deterministic

Final Gate should evaluate only predicates:

```text
lease valid
AND
required artifacts accepted
AND
dependencies fresh
AND
architecture valid
AND
blueprint matches architecture
AND
workspace matches blueprint
AND
Tester passed current workspace
AND
Security passed current workspace
AND
Reviewer passed current workspace
```

No LLM reasoning.

No legacy fallback.

No fuzzy `PASS` search.

---

# 41. P1 — Lease Loss Must Abort Active Execution

Current heartbeat infrastructure exists.

It must be connected to the active execution signal.

Required:

```text
lease lost
    ↓
AbortController.abort()
    ↓
inference stops
    ↓
commit refused
```

Otherwise two workers can overlap.

---

# 42. P1 — Remove `generateStageCandidate()`

Current `orchestrator.ts` still contains:

```text
generateStageCandidate()
```

while the canonical path is:

```text
executeContractStage()
```

Repository-wide search should result in zero production callers.

Then delete the duplicate infrastructure.

---

# 43. P1 — Replace History-Based Fast Forward

Do not use:

```text
executionHistory.status === Completed
```

as the authoritative stage state.

Use:

```text
accepted StageExecution
+
accepted artifact
+
valid dependency fingerprint
```

A completed history record with stale artifacts is not a valid stage.

---

# 44. P1 — Dependency Invalidation

When an accepted artifact changes:

```text
architecture v1
→
architecture v2
```

all dependent artifacts become stale automatically.

Use the contract registry to compute this graph.

Do not manually maintain invalidation lists.

---

# 45. Canonical Authority Matrix

| Fact | Authoritative source |
|---|---|
| User intent | User request |
| Project scope | Queen |
| Requirements | Planner |
| Technology/topology | Architect |
| File classification | Architecture File Policy |
| File ownership | Canonical Architecture Contract |
| Backend behavior | System |
| UI behavior | Designer |
| Approved file set | Blueprinter |
| Source implementation | Coder |
| Actual workspace | VFS |
| Workspace identity | Workspace Manifest |
| Runtime correctness | Tester |
| Repairs | Debugger |
| Security state | Security |
| Quality state | Reviewer |
| Completion | Final Gate |

If two systems own the same fact, it is a contract defect.

---

# 46. Forbidden Architecture

Do not allow:

```text
Prompt
  ↓
LLM
  ↓
raw VFS
```

Do not allow:

```text
same artifact
   ↓
Parser A
   ↓
interpretation A

same artifact
   ↓
Parser B
   ↓
interpretation B
```

Do not allow:

```text
Tester
  ↓
verification-loop
```

and simultaneously:

```text
Tester
  ↓
contract executor
```

Do not allow:

```text
Security report exists
  ↓
contains PASS
  ↓
accepted
```

Do not allow:

```text
Reviewer report exists
  ↓
contains PASS
  ↓
accepted
```

---

# 47. Required Regression Fixtures

## Architecture

```text
layout unowned
    → FAIL

favicon unowned
    → FAIL

route unowned
    → FAIL

layout duplicate
    → FAIL

favicon duplicate
    → FAIL

TaskCard duplicate
    → FAIL

Column duplicate
    → FAIL

module-owned missing file
    → FAIL

unknown module dependency
    → FAIL

module dependency cycle
    → FAIL
```

## Blueprint

```text
missing architecture file
    → FAIL

extra blueprint file
    → FAIL

duplicate blueprint file
    → FAIL
```

## Coder

```text
unauthorized file write
    → FAIL before VFS mutation
```

## Tester

```text
workspace changes after test
    → FAIL Final Gate
```

## Security

```text
workspace changes after security scan
    → FAIL Final Gate
```

## Reviewer

```text
workspace changes after review
    → FAIL Final Gate
```

---

# 48. Immediate Fix for the Current Error

The generated architecture must contain exactly one owner for:

```text
src/app/layout.tsx
public/favicon.ico
```

For example:

```text
**Frontend Application**
- Responsibility: Implements the Next.js application shell and user-facing application.
- Owned Files: src/app/page.tsx, src/app/layout.tsx, public/favicon.ico
- Depends On: None
- Supports Features: ...
```

The exact module name is not important.

The invariant is.

---

# 49. Implementation Order

## Phase 1 — Architecture authority

- [ ] Add `architecture-file-policy.ts`
- [ ] Add canonical architecture object
- [ ] Add canonical parser
- [ ] Add exact ownership validation
- [ ] Add framework file classification
- [ ] Add static asset classification
- [ ] Add entry-point ownership
- [ ] Add architecture hash
- [ ] Add regression fixtures

## Phase 2 — Remove duplicate interpretation

- [ ] Remove architecture parsing from `extractProjectContract()`
- [ ] Remove architecture regex parsing from orchestrator
- [ ] Make all consumers use canonical architecture
- [ ] Delete obsolete parser helpers

## Phase 3 — Prompt convergence

- [ ] Queen prompt/schema/validator convergence
- [ ] Planner prompt/schema/validator convergence
- [ ] Architect prompt/schema/validator convergence
- [ ] System convergence
- [ ] Designer convergence
- [ ] Blueprinter convergence
- [ ] Coder convergence
- [ ] Tester convergence
- [ ] Debugger convergence
- [ ] Security convergence
- [ ] Reviewer convergence

## Phase 4 — Workspace authority

- [ ] Approved file set
- [ ] Coder write authorization
- [ ] Workspace manifest provenance
- [ ] Architecture hash
- [ ] Blueprint hash
- [ ] File-set hash
- [ ] Workspace hash

## Phase 5 — Verification convergence

- [ ] Remove Tester special branch
- [ ] Remove Debugger special branch
- [ ] Canonical Debugger StageExecution
- [ ] Tester report from VerificationRun
- [ ] Patch validation
- [ ] Retest after patch

## Phase 6 — Final Gate convergence

- [ ] Remove Security legacy fallback
- [ ] Remove Reviewer legacy fallback
- [ ] Require current workspace hash
- [ ] Require dependency freshness
- [ ] Require architecture/blueprint consistency
- [ ] Deterministic Security status
- [ ] Deterministic Reviewer status

## Phase 7 — Execution hardening

- [ ] Lease loss abort
- [ ] Remove `generateStageCandidate()`
- [ ] Replace history-based fast-forward
- [ ] Dependency invalidation
- [ ] Invariant scanner integration
- [ ] Package scripts

---

# 50. Definition of Done

The pipeline is converged only when all are true:

```text
[ ] Every architecture file has a deterministic classification.

[ ] Every file requiring ownership has exactly one owner.

[ ] layout.tsx cannot be unowned.

[ ] route.ts cannot be unowned.

[ ] public assets cannot silently become orphaned.

[ ] Duplicate ownership cannot pass.

[ ] Blueprint cannot invent files.

[ ] Blueprint cannot omit approved files.

[ ] Coder cannot write unauthorized files.

[ ] Workspace Manifest proves architecture and blueprint ancestry.

[ ] Tester cannot PASS stale workspace state.

[ ] Debugger has exactly one execution path.

[ ] Tester has exactly one execution path.

[ ] Security cannot PASS stale workspace state.

[ ] Reviewer cannot PASS stale workspace state.

[ ] Final Gate cannot consume legacy state.

[ ] No accepted artifact lacks provenance.

[ ] Downstream artifacts become stale when dependencies change.

[ ] No stage reparses an accepted artifact independently.

[ ] No stage has a second execution path.

[ ] No prompt contradicts its validator.

[ ] No validator accepts output forbidden by its contract.

[ ] Lease loss aborts active execution.

[ ] Duplicate candidate-generation infrastructure is removed.
```

---

# 51. Target Architecture

```text
                         USER
                           │
                           ▼
                         QUEEN
                           │
                       plan.md
                           │
                           ▼
                        PLANNER
                           │
                    requirements.md
                           │
                           ▼
                       ARCHITECT
                           │
                   architecture.md
                           │
                           ▼
             ┌─────────────────────────┐
             │ CANONICAL ARCHITECTURE  │
             │                         │
             │ parser                  │
             │ file policy             │
             │ ownership               │
             │ module graph             │
             │ entry points            │
             │ contract hash            │
             └────────────┬────────────┘
                          │
                    accepted contract
                          │
                 ┌────────┴────────┐
                 ▼                 ▼
              SYSTEM            DESIGNER
                 │                 │
                 └────────┬────────┘
                          ▼
                     BLUEPRINTER
                          │
                    exact file set
                          │
                          ▼
                        CODER
                          │
                 write authorization
                          │
                          ▼
                         VFS
                          │
                  workspace manifest
                          │
                          ▼
                       TESTER
                          │
                   VerificationRun
                          │
                    ┌─────┴─────┐
                    │           │
                   PASS        FAIL
                    │           │
                    │        DEBUGGER
                    │           │
                    │      validated patch
                    │           │
                    │           ▼
                    │          VFS
                    │           │
                    │        TESTER
                    │
                    ▼
                  SECURITY
                    │
                  REVIEWER
                    │
                 FINAL GATE
                    │
                    ▼
                 COMPLETED
```

---

# 52. Final Principle

The desired invariant is:

```text
APPROVED_ARCHITECTURE_FILES
    =
APPROVED_BLUEPRINT_FILES
    =
CODER_AUTHORIZED_FILES
    =
ACTUAL_PROJECT_FILES
```

with explicit, centrally defined exclusions for control-plane files.

And:

```text
ARCHITECTURE_HASH
    →
BLUEPRINT_HASH
    →
WORKSPACE_HASH
    →
TEST_HASH
    →
SECURITY_HASH
    →
REVIEW_HASH
```

Every stage should be able to prove exactly what state it consumed and what state it produced.

That is the point where AutoCoder stops being a collection of agents that happen to pass information around and becomes an actual contract-driven compiler pipeline.
