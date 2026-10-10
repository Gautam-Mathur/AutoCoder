# AutoCoder Contract Pipeline
# Repo-Validated Implementation Plan

## Validation target

This plan was checked against the updated `Gautam-Mathur/AutoCoder` repository at commit:

```text
2081d99e0344a258b5e18b49c1b1e10b6237f6a7

fix(blueprinter): classify scoped npm packages correctly and resolve
local dependency aliases in blueprint graph validator
```

This commit is two commits ahead of the previously audited `756975fd...` state.

The important correction is that the repository already contains several pieces proposed by the earlier plan. They must be **consolidated and wired together**, not recreated.

---

# 1. What The Updated Repo Already Has

The current repository already contains:

```text
src/lib/agents/ruflo/contracts.ts
src/lib/agents/ruflo/spec-contract.ts
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

Therefore the earlier recommendation to create a completely new parallel:

```text
src/lib/agents/ruflo/contracts/
```

system is **wrong for this repository**.

Do not create a second contract hierarchy.

The existing files should be evolved into the canonical system.

---

# 2. First Architectural Correction: There Are Already Two `ProjectContract`s

This is the biggest issue.

## Existing `contracts.ts`

`src/lib/agents/ruflo/contracts.ts` defines:

```ts
interface ProjectContract {
  mvpId: string;
  projectName: string;
  goal: string;
  scope: {
    included: string[];
    excluded: string[];
  };
  constraints: string[];
  capabilities: CapabilityDefinition[];
}
```

## Existing `spec-contract.ts`

`src/lib/agents/ruflo/spec-contract.ts` defines a completely different:

```ts
interface ProjectContract {
  framework: ...
  language: ...
  database: ...
  authentication: ...
  routing: ...
  entryPoints: ...
  apiEndpoints: ...
  models: ...
  dependencies: ...
}
```

This is already the exact kind of split-brain contract architecture we were trying to eliminate.

## Correct solution

Do **not** create a third `ProjectContract`.

Create one canonical contract.

Recommended direction:

```text
src/lib/agents/ruflo/contracts.ts
        |
        +-- canonical shared types
        |
        +-- ProjectContract
        +-- ContractError
        +-- ContractDependency
        +-- ContractFile
        +-- ContractDirectory
        +-- ContractProvenance
        |
        v
src/lib/agents/ruflo/spec-contract.ts
        |
        +-- compile/extract contract
        +-- validate contract
        |
        v
ProjectContract
```

`contracts.ts` owns the types.

`spec-contract.ts` owns compilation/validation logic.

That is much cleaner than introducing another directory.

---

# 3. Second Correction: `module-resolver.ts` Already Exists

The previous plan proposed creating:

```text
path-resolver.ts
```

The repo already has:

```text
src/lib/agents/ruflo/module-resolver.ts
```

It already provides:

```ts
parseTsConfigOptions()
resolveModule()
```

and supports:

```text
relative imports
../ imports
TypeScript aliases
baseUrl
.ts
.tsx
.js
.jsx
index files
```

Therefore:

> Extend `module-resolver.ts`. Do not create another path resolver.

The desired API should become the single canonical resolution mechanism used by:

```text
Blueprint graph
Cross-file import validation
Structural graph
Whole-project validation
Contract validation
```

---

# 4. Third Correction: Blueprint Validation Currently Has TWO Resolvers

The updated `orchestrator.ts` contains:

```ts
classifyBlueprintDependency()
isLocalDependencyPresent()
```

while the repository also contains:

```text
module-resolver.ts
```

The blueprint validator currently performs its own normalization:

```ts
@/ -> src/
~/ -> src/
./ -> ''
```

and then performs string comparisons.

That means the system now has:

```text
Resolver A:
module-resolver.ts

Resolver B:
isLocalDependencyPresent()
```

This is exactly the duplication we should eliminate.

## Correct solution

Make:

```ts
resolveModule(importer, specifier, context)
```

the authoritative local-module resolver.

Then:

```ts
validateBlueprintGraph()
```

should use it.

Do not expand the alias regex further.

---

# 5. Fourth Correction: The Current Blueprint Graph Still Has a Real Bug

The current validator successfully detects local dependencies during validation.

However, its DAG construction still does:

```ts
const normDep = dep
  .replace(/\/g, '/')
  .replace(/^[/\]+/, '')
  .toLowerCase();

if (normalizedFileSet.has(normDep)) {
  graph.get(normDep)!.push(normFile);
}
```

This bypasses:

```text
@/
~/
./
extension resolution
index resolution
```

So this can happen:

```text
Validation:
@/components/Button
        ↓
recognized as local
        ↓
PASS

Graph:
@/components/Button
        ↓
raw string lookup
        ↓
not found
        ↓
NO EDGE
```

That means the dependency can be valid but invisible to topological ordering and cycle detection.

## Required fix

Resolve the dependency first:

```ts
const resolved = resolveModule(
  section.file,
  dep,
  moduleResolutionContext
);
```

Then use:

```ts
resolved
```

as the graph node.

This is more important than adding another alias regex.

---

# 6. Fifth Correction: `validateBlueprintImports()` Is Now A Legacy Validator

The repo contains:

```ts
validateBlueprintImports()
```

which treats dependencies through raw string equality:

```ts
allFiles.has(normalizedDep)
```

It does not use:

```text
classifyBlueprintDependency()
module-resolver.ts
```

Therefore it can report a package or alias as missing even when the newer validator understands it.

## Correct solution

Do not maintain two blueprint validators.

Choose:

```text
validateBlueprintGraph()
```

as the canonical validator.

Then:

```text
validateBlueprintImports()
```

should either:

1. be deleted if there are no callers, or
2. become a thin compatibility wrapper around the canonical graph validation.

Do not add more logic to it.

---

# 7. Sixth Correction: Specification Contract Is Already Integrated

The repository already executes:

```ts
const specContract = extractProjectContract(specContents);
const specVal = validateProjectContract(specContract);
```

before Blueprinter generation.

So the earlier plan's:

```text
"create a ContractCompiler"
```

should be interpreted as:

> Upgrade `spec-contract.ts` into the canonical compiler.

Do not create another compiler beside it.

The current lifecycle is already:

```text
spec markdown
   ↓
extractProjectContract()
   ↓
validateProjectContract()
   ↓
Blueprinter
```

The problem is that the resulting contract is too weak and partially heuristic.

---

# 8. Seventh Correction: `spec-contract.ts` Has A Real Package Extraction Bug

Current dependency extraction contains:

```ts
if (clean && !clean.includes('/') && !dependencies.includes(clean)) {
  dependencies.push(clean);
}
```

This explicitly drops packages containing `/`.

That means:

```text
@prisma/client
@lucide/react
@radix-ui/react-dialog
next/server
react-dom/client
```

can disappear from the extracted contract.

This is especially bad because the Blueprint dependency classifier was just fixed to correctly understand these packages.

The two contract systems can therefore disagree.

## Required fix

Do not infer package identity by rejecting `/`.

Use package-root extraction:

```ts
function getPackageRoot(specifier: string): string {
  if (specifier.startsWith('@')) {
    return specifier.split('/').slice(0, 2).join('/');
  }

  return specifier.split('/')[0];
}
```

Better still:

```text
package.json
```

should be the authoritative package declaration source.

The Markdown specs may describe dependencies, but the generated project's actual package manifest is the final package contract.

---

# 9. Eighth Correction: `ProjectContract` Should Not Be Purely LLM/Regex-Inferred

Current `extractProjectContract()` infers:

```text
framework
language
database
authentication
routing
entry points
API endpoints
models
dependencies
```

from Markdown text.

This is useful as a first-stage contract compiler, but it must not be the only authority for project configuration.

Use this precedence:

```text
PROJECT FILES / CONFIG
        |
        | package.json
        | tsconfig.json
        | jsconfig.json
        | prisma/schema.prisma
        |
        v
CANONICAL STRUCTURAL FACTS
        |
        +
        |
SPEC DOCUMENTS
        |
        v
PROJECT CONTRACT
```

Specs define intent.

Project configuration defines concrete implementation facts.

Contradictions between them should become contract errors.

---

# 10. Ninth Correction: Database Detection Is Currently Incorrect

Current code effectively does:

```ts
if (/postgres|postgresql/i.test(combined)) {
  database = 'postgresql';
} else if (/sqlite|prisma/i.test(combined)) {
  database = 'sqlite';
}
```

This means:

```text
Prisma
```

is treated as:

```text
SQLite
```

which is not logically valid.

Prisma is an ORM/tooling layer, not a database engine.

## Correct model

Separate:

```ts
orm:
  "prisma" | "none"

database:
  "sqlite" | "postgresql" | ...
```

Then derive the actual database from:

```text
prisma/schema.prisma
```

when available.

---

# 11. Tenth Correction: Authentication Detection Has A Dangerous Default

Current code can produce:

```ts
mechanism = "jwt"
```

when authentication is required but no mechanism was actually declared.

That converts:

```text
UNKNOWN
```

into:

```text
JWT
```

This is exactly what a contract system must not do.

## Correct behavior

Use:

```text
required = true
mechanism = undefined
```

and emit:

```text
CONTRACT_AUTH_MECHANISM_UNSPECIFIED
```

as an error or warning according to project policy.

Do not invent JWT.

---

# 12. Eleventh Correction: Quality Gate Exists, But It Does Not Yet Gate Completion

This is one of the biggest current problems.

The repository already has:

```ts
evaluateQualityGate()
```

and the orchestrator already calls it.

But after evaluation, the orchestrator proceeds to:

```text
flush VFS
launch preview
conversation.status = Completed
PIPELINE_COMPLETE
```

without making the final pipeline outcome conditional on:

```ts
qGate.passed
```

Therefore the architecture currently has:

```text
Quality Gate
    |
    v
Report
    |
    v
Pipeline completes anyway
```

That is not a gate.

## Required behavior

After:

```ts
const qGate = evaluateQualityGate(...)
```

do:

```ts
if (!qGate.passed) {
  throw new QualityGateBlockedError(qGate.blockingReasons);
}
```

or transition explicitly to:

```text
REPAIR_REQUIRED
BLOCKED
FAILED
```

depending on the failure type.

The pipeline must not reach:

```text
Completed
PIPELINE_COMPLETE
```

unless the completion gate passes.

---

# 13. Twelfth Correction: Remove Quality Score From The Authoritative Decision

Current `quality-gate.ts` calculates:

```ts
score: number;
```

from nine booleans.

That creates a misleading metric such as:

```text
88/100
```

while one critical subsystem may still be broken.

The actual decision already has:

```text
PASS
REPAIR_REQUIRED
BLOCKED
```

Use that as authoritative.

Keep a score only as optional dashboard telemetry if desired.

Never use:

```ts
score >= X
```

as the completion condition.

The real condition is:

```ts
qGate.passed === true
```

---

# 14. Thirteenth Correction: Quality Gate Treats Missing Checks As PASS

Current logic does:

```ts
const specsValid = input.specValidation
  ? input.specValidation.valid
  : true;
```

This means a missing verification result becomes:

```text
PASS
```

That is dangerous.

For required gates, missing evidence must mean:

```text
NOT_VERIFIED
```

not:

```text
PASS
```

Recommended:

```ts
type VerificationStatus =
  | "PASS"
  | "FAIL"
  | "NOT_RUN";
```

Then:

```text
NOT_RUN
    ≠
PASS
```

The final completion contract should reject `NOT_RUN` for mandatory checks.

---

# 15. Fourteenth Correction: Runtime Validator Is Not Runtime Testing Yet

Current:

```text
runtime-validator.ts
```

does not actually start the generated project.

It checks whether expected route-like files exist and then produces synthetic:

```ts
status: 200
```

results.

For example, the current logic effectively does:

```text
file exists
    ↓
pretend route returned 200
```

That is not runtime acceptance testing.

## Correct staged migration

### Phase A

Keep the current structural route check, but rename its semantics:

```text
route-structure-validator
```

### Phase B

Create a real execution worker:

```text
start generated project
        ↓
wait for readiness
        ↓
HTTP request
        ↓
actual status code
        ↓
response validation
        ↓
shutdown
```

Only Phase B should be called:

```text
runtime acceptance test
```

---

# 16. Fifteenth Correction: Whole-Project Validator Is Not A Real Project Build

Current `project-validator.ts` creates a TypeScript program over VFS content.

That is useful static verification.

It is not equivalent to:

```text
npm install
npm run build
```

or:

```text
pnpm build
```

or:

```text
next build
```

## Correct naming

Current:

```text
project-validator.ts
```

should be treated as:

```text
TypeScriptProjectValidator
```

until a real isolated build runner exists.

Then the verification stack becomes:

```text
Static Typecheck
        +
Real Project Build
        +
Tests
        +
Runtime
```

---

# 17. Sixteenth Correction: Generated-Project Runtime Must Not Reuse AutoCoder's Host

The actual generated project needs an isolated workspace.

Do not execute arbitrary generated commands directly in:

```text
AutoCoder process
```

The target architecture should be:

```text
AutoCoder
   |
   v
Execution Worker
   |
   v
Generated Project Sandbox
```

The current preview system still uses direct:

```ts
exec(`node ${entryFile}`)
exec(`npx serve -s . -l 8080`)
```

inside the application process.

That remains a legacy execution path.

---

# 18. Seventeenth Correction: Coder Is Still Allowed To Continue After Blueprint Failure

The Blueprinter currently does:

```ts
const bpVal = validateBlueprintGraph(finalSections);

if (!bpVal.valid) {
  emit(...)
}
```

but it does not abort the stage there.

This means:

```text
Blueprint invalid
    ↓
log error
    ↓
persist blueprint
    ↓
Coder may continue
```

This directly contradicts the intended contract gate.

## Required fix

Immediately after validation:

```ts
if (!bpVal.valid) {
  throw new Error(
    `Blueprint graph validation failed: ${bpVal.errors.join("; ")}`
  );
}
```

Do this before:

```text
blueprint.md persistence
Coder stage
```

The earlier failure message that motivated this work should become impossible to silently bypass.

---

# 19. Eighteenth Correction: Graph Ordering Must Use Resolved Dependencies

Current Kahn graph construction uses raw dependency strings.

It should instead do:

```text
section dependency
      ↓
classify
      ↓
if LOCAL_FILE
      ↓
resolveModule()
      ↓
canonical path
      ↓
graph edge
```

Package imports:

```text
PACKAGE
```

must not enter the graph.

External resources:

```text
EXTERNAL
```

must not enter the graph.

---

# 20. Nineteenth Correction: Cycle Diagnostics Need Actual Cycle Paths

Current graph validation emits:

```text
Dependency cycle detected in blueprint file graph.
```

That is enough to block generation, but not enough to repair the blueprint intelligently.

Return:

```ts
cycles: string[][];
```

Example:

```text
Column.tsx
  -> TaskCard.tsx
  -> Column.tsx
```

The repair agent can then act on a specific contract violation.

---

# 21. Twentieth Correction: Do Not Create A New `ContractError` System Beside Existing Validator Errors

Current validators already have error structures such as:

```text
ApiContractError
FrameworkValidationError
ProjectValidationError
```

Do not immediately rewrite all validators.

Instead introduce a top-level normalized envelope:

```ts
interface VerificationError {
  code: string;
  source:
    | "SPEC"
    | "BLUEPRINT"
    | "PROJECT"
    | "PACKAGE"
    | "PRISMA"
    | "API"
    | "FRAMEWORK"
    | "RUNTIME"
    | "SECURITY";

  severity: "ERROR" | "WARNING";

  message: string;

  file?: string;
  line?: number;
  dependency?: string;
}
```

Existing validator-specific errors can be adapted into this structure.

This avoids a giant destructive refactor.

---

# 22. Twenty-First Correction: Existing Quality Gate Must Become The Canonical Consumer

Do not create:

```text
verification/definition-of-done.ts
```

until there is a demonstrated reason to split it.

The existing:

```text
quality-gate.ts
```

already occupies that architectural role.

Refactor it into:

```text
deterministic verification aggregator
```

and make it authoritative.

---

# 23. Twenty-Second Correction: The Current Tester Is Still Linter-Based

The pipeline currently creates:

```text
test_report.md
```

from per-file lint results.

That is not behavioral testing.

The correct distinction is:

```text
Lint
  =
static code quality

Typecheck
  =
static type correctness

Build
  =
project compilation

Tests
  =
behavioral assertions

Runtime acceptance
  =
actual running-system behavior
```

Do not call the linter report:

```text
Test Report
```

Rename the machine concept to something like:

```text
static_validation_report.md
```

or, better, move machine truth into structured verification evidence and make Markdown only a projection.

---

# 24. Twenty-Third Correction: `test_report.md` Must Stop Being Machine Truth

The current Debugger reads:

```ts
test_report.md
```

to determine failing files.

This is fragile.

Target architecture:

```text
Tester
  |
  v
VerificationResult
  |
  +--> structured failures
  |
  +--> Markdown report
```

Debugger consumes:

```ts
VerificationResult
```

not Markdown parsing.

Markdown remains for humans.

---

# 25. Twenty-Fourth Correction: Existing `module-resolver.ts` Should Become Shared Infrastructure

Current callers show `structural-graph.ts` already uses:

```ts
resolveModule()
parseTsConfigOptions()
```

Therefore the correct migration is:

```text
structural-graph
        |
        +----------------+
                         |
blueprint graph ---------+--> module-resolver.ts
                         |
cross-file validator ----+
                         |
project validator -------+
```

One resolver.

One interpretation of imports.

---

# 26. Twenty-Fifth Correction: `spec-contract.ts` Needs A Better Contract Source Boundary

Recommended contract inputs:

```text
Intent:
  plan.md
  requirements.md

Architecture:
  architecture.md

Backend:
  backend_spec.md

UI:
  ui_spec.md

Concrete project facts:
  package.json
  tsconfig.json / jsconfig.json
  prisma/schema.prisma
```

Then produce:

```text
Canonical ProjectContract
```

The compiler should distinguish:

```text
DECLARED
DERIVED
OBSERVED
```

Example:

```ts
interface ContractFact<T> {
  value: T;
  source:
    | "SPEC"
    | "PACKAGE_JSON"
    | "TSCONFIG"
    | "PRISMA_SCHEMA"
    | "VFS";
}
```

This makes contradictions explainable.

---

# 27. Twenty-Sixth Correction: Contract Hash Should Be Added, But Only After Canonicalization

Do not hash raw Markdown.

Hash the normalized contract:

```text
specs
+
package.json
+
tsconfig
+
schema
    ↓
normalize
    ↓
canonical JSON
    ↓
SHA-256
    ↓
contractHash
```

Then attach:

```text
contractHash
```

to:

```text
blueprint
verification
repair
quality gate
```

This prevents formatting-only Markdown changes from unnecessarily invalidating the project.

---

# 28. Twenty-Seventh Correction: Quality Gate Must Block Final Completion

Final lifecycle must be:

```text
Coder
  ↓
Static Verification
  ↓
Project Verification
  ↓
Runtime Verification
  ↓
Security Verification
  ↓
Quality Gate
  |
  +---- PASS --------> Completed
  |
  +---- REPAIR ------> Debugger/Coder
  |
  +---- BLOCKED -----> Failed/Blocked
```

Never:

```text
Quality Gate
  ↓
write report
  ↓
Completed
```

The current orchestrator must be changed so `qGate.passed === false` prevents:

```text
conversation.status = Completed
PIPELINE_COMPLETE
```

---

# 29. Twenty-Eighth Correction: The Final Quality Gate Must Require Evidence

Required checks should not default to true.

At minimum:

```text
specification
blueprint
typecheck
package dependencies
Prisma
API
framework boundaries
runtime
security
```

must have explicit:

```text
PASS
```

for final completion.

Missing:

```text
NOT_RUN
```

must block completion.

---

# 30. Twenty-Ninth Correction: Model Selection Is Already Partially Implemented

The current `runAgent()` already passes:

```ts
model: agentDef.model
```

to `runInference()`.

Therefore the earlier recommendation:

```text
add model field to AgentDef
```

is already partially done.

Do not rebuild this.

The remaining work is:

```text
record requested model
record resolved model
record provider
record prompt/context hash
record attempt
```

and ensure no silent fallback is invisible.

---

# 31. Thirtieth Correction: The Plan Must Respect Existing File Boundaries

Use this mapping.

| Existing file | Correct role |
|---|---|
| `contracts.ts` | Canonical shared contract types |
| `spec-contract.ts` | Contract compiler + validation |
| `module-resolver.ts` | Canonical module/path resolution |
| `orchestrator.ts` | Pipeline sequencing and gates |
| `quality-gate.ts` | Deterministic final verification decision |
| `project-validator.ts` | Static TypeScript project validation |
| `dependency-validator.ts` | Package dependency validation |
| `prisma-validator.ts` | Prisma contract validation |
| `api-contract-validator.ts` | API contract validation |
| `framework-validator.ts` | Framework boundary validation |
| `runtime-validator.ts` | Temporary structural runtime checks, then real runtime |
| `security-gate.ts` | Deterministic security checks |
| `linter.ts` | Static lint/import validation |
| `structural-graph.ts` | Project dependency/architecture graph |

Do not create duplicate equivalents unless the existing boundary demonstrably cannot support the required behavior.

---

# 32. Actual Implementation Order For This Repo

## P0-A: Fix the contract split

Modify:

```text
contracts.ts
spec-contract.ts
```

Goal:

```text
one ProjectContract type
```

Do not add another `ProjectContract`.

---

## P0-B: Fix the contract compiler

Modify:

```text
spec-contract.ts
```

Fix:

```text
package extraction
database detection
authentication defaults
framework/routing derivation
config-file facts
```

---

## P0-C: Unify module resolution

Modify:

```text
module-resolver.ts
orchestrator.ts
```

Make Blueprint graph validation use:

```ts
resolveModule()
```

for every local dependency.

---

## P0-D: Remove duplicate Blueprint validation

Modify:

```text
orchestrator.ts
```

Delete or delegate:

```ts
validateBlueprintImports()
```

Do not keep two competing dependency validators.

---

## P0-E: Make Blueprint validation a real gate

Modify:

```text
orchestrator.ts
```

If:

```ts
!bpVal.valid
```

abort Blueprinter before persistence/Coder continuation.

---

## P0-F: Fix graph edges

Use canonical resolved paths when building:

```text
inDegree
graph
topological order
cycle detection
```

---

## P0-G: Fix Quality Gate semantics

Modify:

```text
quality-gate.ts
orchestrator.ts
```

Changes:

```text
PASS / REPAIR_REQUIRED / BLOCKED
```

become authoritative.

Remove score from the completion decision.

Make:

```text
NOT_RUN
```

different from:

```text
PASS
```

---

## P0-H: Fix actual pipeline completion

Modify:

```text
orchestrator.ts
```

Do not execute:

```text
launchVSCodePreview()
conversation.status = Completed
PIPELINE_COMPLETE
```

unless:

```ts
qGate.passed === true
```

---

## P1-A: Separate static verification from behavioral testing

Modify:

```text
runtime-validator.ts
Tester section in orchestrator.ts
```

Rename the current structural route probe concept.

Create real runtime execution afterward.

---

## P1-B: Replace Markdown-driven Debugger input

Modify:

```text
Tester
Debugger
```

Introduce structured verification results.

Keep Markdown as human-readable projection.

---

## P1-C: Add real generated-project execution worker

Only after the contract and verification gates are correct.

The worker should isolate:

```text
install
build
start
HTTP probes
tests
shutdown
```

from the AutoCoder process.

---

## P2: Contract provenance and hash

Add:

```text
normalized contract
contractHash
artifact provenance
```

after the canonical contract exists.

---

## P3: Legacy cleanup

Only after callers are migrated:

```text
old contract types
duplicate Blueprint validator
legacy Markdown machine parsing
direct preview execution
duplicate module-resolution logic
```

Then delete them.

---

# 33. Tests Required Before Calling This Fixed

## Contract tests

```text
normal package
scoped package
package subpath
relative import
alias import
extensionless import
index import
directory-as-file
duplicate file
missing local dependency
cycle
valid DAG
```

## Contract extraction tests

```text
Prisma ≠ SQLite
JWT is not invented
scoped dependencies retained
package subpaths retained
App Router vs Pages Router contradiction
```

## Graph tests

```text
alias edge appears in graph
extensionless edge appears in graph
index edge appears in graph
cycle through alias is detected
package never becomes graph node
```

## Quality Gate tests

```text
all PASS -> PASS
one FAIL -> not PASS
one NOT_RUN -> not PASS
security block -> BLOCKED
blueprint failure -> BLOCKED
```

## Pipeline completion test

```text
qGate.passed === false
        ↓
conversation != Completed
        ↓
PIPELINE_COMPLETE not emitted
```

This test is essential.

---

# 34. Final Architecture After This Migration

```text
                    USER PROMPT
                         |
                         v
                 SPECIFICATION AGENTS
                         |
                         v
              +-----------------------+
              | Canonical Contract    |
              |                       |
              | contracts.ts          |
              | spec-contract.ts      |
              +-----------------------+
                         |
             +-----------+-----------+
             |                       |
             v                       v
       module-resolver        concrete project facts
             |                package.json / tsconfig /
             |                prisma schema
             +-----------+-----------+
                         |
                         v
                NORMALIZED CONTRACT
                         |
                         v
                    BLUEPRINTER
                         |
                         v
               BLUEPRINT NORMALIZER
                         |
                         v
                 BLUEPRINT GRAPH
                         |
                         v
                  DAG / CYCLE GATE
                         |
                    PASS | FAIL
                         |
                         v
                      CODER
                         |
                         v
               STATIC VERIFICATION
                         |
          +--------------+--------------+
          |              |              |
       Typecheck      Packages       API/DB
          |              |              |
          +--------------+--------------+
                         |
                         v
                RUNTIME VERIFICATION
                         |
                         v
                 SECURITY VERIFICATION
                         |
                         v
                   QUALITY GATE
                    /                          PASS       REPAIR/BLOCK
                  |              |
                  v              v
             COMPLETED        Debugger
                                 |
                                 v
                              Verify
```

---

# Definition of Done

This migration is complete only when:

- [ ] There is exactly one canonical `ProjectContract`.
- [ ] `contracts.ts` owns canonical contract types.
- [ ] `spec-contract.ts` compiles and validates the contract.
- [ ] `module-resolver.ts` is the canonical module resolver.
- [ ] Blueprint graph uses resolved module paths.
- [ ] `validateBlueprintImports()` no longer competes with graph validation.
- [ ] Directory sections cannot become graph nodes.
- [ ] Package subpaths remain packages.
- [ ] Scoped packages remain packages.
- [ ] Alias imports create real graph edges.
- [ ] Extensionless imports create real graph edges.
- [ ] Cycles through aliases are detected.
- [ ] Blueprint failure blocks Coder.
- [ ] Quality Gate is authoritative.
- [ ] Missing evidence is not treated as PASS.
- [ ] Quality score is not used for completion.
- [ ] Quality Gate failure prevents `Completed`.
- [ ] Runtime checks are distinguished from actual runtime execution.
- [ ] `test_report.md` is not machine truth.
- [ ] Debugger consumes structured verification failures.
- [ ] Generated-project execution is isolated.
- [ ] Contract provenance is hashable and reproducible.
- [ ] Legacy duplicate systems are deleted after migration.

---

# Bottom Line

The updated repository is **further along than the previous plan assumed**.

The right move is not:

```text
build everything in the previous plan
```

It is:

```text
REFACTOR WHAT EXISTS
        +
FIX THE CURRENT GAPS
        +
DELETE DUPLICATES
```

The most urgent issues are:

1. **Two different `ProjectContract` definitions already exist.**
2. **Two module-resolution systems already exist.**
3. **Blueprint validation resolves aliases, but graph construction does not.**
4. **Blueprint failure is logged but does not hard-stop the stage.**
5. **Quality Gate exists but does not currently control final pipeline completion.**
6. **Quality Gate treats missing checks as passing.**
7. **Runtime validation currently simulates success from file existence instead of running the application.**
8. **`spec-contract.ts` drops slash-containing packages and invents JWT as a default.**
9. **Database detection incorrectly conflates Prisma with SQLite.**
10. **The linter/test-report path is still being used as if it were behavioral testing.**

Those are the fixes that should go into the next implementation pass.

Do not let Anti-gravity respond to these by creating `contract-v2.ts`, `path-resolver-v2.ts`, `quality-gate-v2.ts`, and `runtime-validator-v2.ts`.

Humanity has suffered enough from version 2 files sitting beside version 1 forever.
