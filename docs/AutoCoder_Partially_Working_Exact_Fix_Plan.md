# AutoCoder --- Partial / Incomplete Systems: Exact Fix Plan

## Scope

This document contains **only the systems that are partially working,
incomplete, or implemented as warning-only behavior** in the current
AutoCoder run.

Repository:

``` text
Gautam-Mathur/AutoCoder
```

Current commit:

``` text
756975fd8be8b3e00fa88cf1b8390a3543cc3900
```

Previous comparison point:

``` text
fbc226757ec982d2bef52035f11867b282fa9af2
```

The previous fixes are intentionally excluded. This document starts
where the current implementation still falls short.

The generated agent outputs are treated as concrete evidence of the
remaining problems. Reference/design documents are treated as
references, not proof.

------------------------------------------------------------------------

# 0. The Core Problem

AutoCoder currently has several good local mechanisms:

``` text
Markdown specifications
        ↓
Blueprint
        ↓
Blueprint graph validation
        ↓
Coder
        ↓
Per-file TypeScript lint
        ↓
Cross-file import check
        ↓
Structural graph
        ↓
Architecture drift report
```

The problem is that the pipeline still does not have a **single
authoritative project contract followed by a hard whole-project
verification gate**.

The remaining failures cluster into five layers:

``` text
A. Specification consistency
B. Blueprint ↔ implementation consistency
C. Generated project correctness
D. Runtime / behavioral correctness
E. Pipeline enforcement
```

The biggest architectural mistake to avoid now is adding another summary
layer to compensate for this.

The fix should be:

``` text
Markdown specs
      ↓
Canonical contracts
      ↓
Blueprint
      ↓
Generated project
      ↓
Whole-project build
      ↓
Runtime acceptance tests
      ↓
Security checks
      ↓
PASS / REPAIR / ABORT
```

------------------------------------------------------------------------

# 1. Specification Contradictions Are Still Not Hard-Gated

## Status

**PARTIALLY WORKING**

## Current Behavior

AutoCoder generates and stores separate Markdown artifacts:

``` text
plan.md
requirements.md
architecture.md
backend_spec.md
ui_spec.md
blueprint.md
```

Blueprinter consumes the specification set.

However, the system does not currently perform a semantic contract
reconciliation step before blueprint generation.

The generated evidence already demonstrated contradictions such as:

``` text
plan.md
    → no authentication

backend_spec.md
    → authentication required for cart/checkout/orders

architecture.md
    → auth none
```

There was also a routing contradiction:

``` text
architecture.md
    → src/pages/index.tsx

actual/generated structure
    → src/app/page.tsx
```

## Why It Is Partial

The documents exist.

The downstream agents can read them.

But existence is not consistency.

The current pipeline allows:

``` text
Planner says A
Architect says B
System says C
Designer consumes A/B/C
Blueprinter tries to merge them
```

The LLM becomes the reconciliation mechanism.

That is exactly the kind of responsibility the pipeline should remove
from the LLM.

## Exact Concept Needed

Introduce a **Specification Contract Validator** between the
specification stages and Blueprinter.

Do not create another giant state store.

Create a deterministic contract extraction layer over the Markdown
artifacts.

Conceptually:

``` text
plan.md
requirements.md
architecture.md
backend_spec.md
ui_spec.md
       ↓
Contract extraction
       ↓
Normalized project contract
       ↓
Conflict detection
       ↓
PASS / REPAIR_REQUIRED
       ↓
Blueprinter
```

## Contract Categories

At minimum:

``` ts
interface ProjectContract {
  framework?: string;
  language?: string;
  database?: string;
  authentication?: {
    required: boolean;
    mechanism?: string;
  };
  routing?: {
    style: 'app' | 'pages';
  };
  entryPoints: string[];
  apiEndpoints: Array<{
    method: string;
    path: string;
    authRequired?: boolean;
  }>;
  models: Array<{
    name: string;
    fields: Record<string, string>;
  }>;
  dependencies: string[];
}
```

This does NOT need to replace Markdown.

Markdown remains the human/LLM-readable source.

The contract is a deterministic validation projection.

## Code Changes

### New file

``` text
src/lib/agents/ruflo/spec-contract.ts
```

Add:

``` ts
extractProjectContract(
  specs: Record<string, string>
): ProjectContract
```

and:

``` ts
validateProjectContract(
  contract: ProjectContract
): ContractValidation
```

### Orchestrator

Before Blueprinter execution:

``` ts
const contract = extractProjectContract(specContents);
const validation = validateProjectContract(contract);

if (!validation.valid) {
  emit(...);

  throw new Error(
    `Specification contract validation failed: ${validation.errors.join('; ')}`
  );
}
```

## Important

Do not attempt arbitrary semantic NLP matching here.

Start with explicit sections and normalized declarations:

``` text
Authentication: None
Authentication: Required
Router: App Router
Router: Pages Router
Database: SQLite
Database: PostgreSQL
```

Make conflicts deterministic.

------------------------------------------------------------------------

# 2. Blueprint Dependency Validation Is Still Too Weak

## Status

**PARTIALLY WORKING**

## Current Behavior

`validateBlueprintGraph()` now detects:

-   duplicate files
-   dependency cycles
-   topological ordering

But missing dependencies are still warnings.

The implementation explicitly does:

``` ts
warnings.push(
  `Blueprint file "${s.file}" lists dependency "${dep}" which is not defined in blueprint.`
);
```

That means:

``` text
File A
  depends on B

B does not exist
```

can still pass the hard validation gate.

## Why It Is Partial

The blueprint graph can be:

``` text
A → UNKNOWN
```

and still be considered:

``` text
valid === true
```

That is not a valid implementation graph.

## Exact Concept Needed

Separate:

``` text
unknown external dependency
```

from:

``` text
missing blueprint file
```

For example:

``` text
./utils
npm:stripe
external:Stripe
```

are not the same thing.

The validator needs dependency classification.

## Code Changes

In:

``` text
src/lib/agents/ruflo/orchestrator.ts
```

replace raw dependency validation with:

``` ts
function classifyBlueprintDependency(
  dependency: string
): 'LOCAL_FILE' | 'PACKAGE' | 'EXTERNAL' {
  ...
}
```

Rules:

``` text
./foo
../foo
foo.ts
src/foo.ts
      ↓
LOCAL_FILE

stripe
next
react
@prisma/client
      ↓
PACKAGE

Stripe API
External Service
      ↓
EXTERNAL
```

Then:

``` ts
if (type === 'LOCAL_FILE' && !normalizedFileSet.has(normDep)) {
    errors.push(...)
}
```

Package and external dependencies should be validated against
project/package contract instead.

## Result

Only genuinely external dependencies remain non-file dependencies.

Missing local files become hard failures.

------------------------------------------------------------------------

# 3. Blueprint ↔ Code Dependency Drift Is One-Way

## Status

**PARTIALLY WORKING**

## Current Behavior

`detectAndPersistArchitectureDrift()` checks:

``` text
Blueprint declared dependency
        ↓
Was it imported in code?
```

It detects:

``` text
Blueprint says A depends on B
Code does not import B
```

But it does not symmetrically enforce:

``` text
Code imports B
Blueprint never declared B
```

## Why It Is Partial

This permits hidden dependencies.

Example:

``` text
blueprint:
A → B

actual:
A → B
A → C
```

The detector catches nothing about `C`.

That means the implementation can silently expand beyond the
architecture contract.

## Exact Concept Needed

Use symmetric dependency comparison:

``` text
DECLARED DEPENDENCIES
        ↕
ACTUAL IMPORTS
```

Compute:

``` ts
missingInCode = declared - actual
undeclaredInCode = actual - declared
```

## Code Changes

In:

``` text
src/lib/agents/ruflo/structural-graph.ts
```

replace the current one-way loop with:

``` ts
const declared = normalizeSet(section.dependencies);
const actual = normalizeSet(
  await getFileDependencies(conversationId, section.file)
);

for (const dep of declared) {
  if (!actual.has(dep)) {
    dependencyDrifts.push(
      `${section.file}: declared dependency "${dep}" is not imported.`
    );
  }
}

for (const dep of actual) {
  if (!declared.has(dep)) {
    dependencyDrifts.push(
      `${section.file}: actual import "${dep}" was not declared in blueprint.`
    );
  }
}
```

## Additional Requirement

Do not compare raw strings.

Resolve both sides to canonical file paths first.

For example:

``` text
./lib/prisma
src/lib/prisma.ts
lib/prisma.ts
```

must resolve to the same canonical file.

------------------------------------------------------------------------

# 4. Structural Graph Is Useful but Not Yet a Reliable Source of Truth

## Status

**PARTIALLY WORKING**

## Current Behavior

`structural-graph.ts` now extracts:

``` text
FILE nodes
SYMBOL nodes
CONTAINS
EXPORTS
IMPORTS
```

and persists them into:

``` text
GraphNode
GraphEdge
```

This is useful.

But persistence currently performs upserts without first removing stale
graph state.

## Why It Is Partial

Suppose generation initially produces:

``` text
A.ts
B.ts
C.ts
```

Graph:

``` text
A → B
A → C
```

Then C is deleted from VFS.

A rebuild may update current nodes but leave stale graph records unless
they are explicitly removed.

The graph can therefore become:

``` text
VFS:
A
B

GRAPH:
A
B
C   ← stale
```

That corrupts downstream architecture analysis.

## Exact Concept Needed

The graph must be treated as a **derived index**, not an append-only
ledger.

For each rebuild:

``` text
Delete previous derived graph
        ↓
Re-read VFS
        ↓
Rebuild graph
        ↓
Persist fresh graph
```

## Code Changes

In:

``` text
src/lib/agents/ruflo/structural-graph.ts
```

change:

``` ts
buildAndPersistStructuralGraph()
```

to:

``` ts
await prisma.graphEdge.deleteMany({
  where: { conversationId }
});

await prisma.graphNode.deleteMany({
  where: { conversationId }
});

const result = await buildStructuralGraph(conversationId);

await persistStructuralGraph(
  conversationId,
  result
);
```

Better long-term:

add a graph-generation identifier:

``` ts
generationId
```

and garbage-collect the previous generation after successful rebuild.

## Important

Do not make GraphNode/GraphEdge canonical project state.

They remain:

``` text
Derived structural index
```

The VFS/Markdown specifications remain canonical.

------------------------------------------------------------------------

# 5. Structural Graph Does Not Fully Resolve TypeScript Path Aliases

## Status

**PARTIALLY WORKING**

## Current Behavior

`resolveImportPath()` handles:

``` text
./foo
../foo
/foo
```

and tries:

``` text
.ts
.tsx
.js
.jsx
/index.ts
/index.tsx
/index.js
/index.jsx
```

But it does not fully resolve TypeScript aliases such as:

``` ts
@/lib/prisma
@/components/Button
```

## Why It Is Partial

The generated evidence already contained imports such as:

``` ts
@/lib/prisma
```

These are valid in many Next.js projects but are not relative imports.

The structural graph can therefore miss real dependency edges.

## Exact Concept Needed

Introduce one canonical module resolver used by:

``` text
linter
cross-file import checker
structural graph
architecture drift
```

Do not maintain four different import-resolution implementations.

## Code Changes

### New file

``` text
src/lib/agents/ruflo/module-resolver.ts
```

API:

``` ts
interface ModuleResolutionContext {
  files: string[];
  baseUrl?: string;
  paths?: Record<string, string[]>;
}

resolveModule(
  importer: string,
  specifier: string,
  context: ModuleResolutionContext
): string | null
```

Read:

``` text
tsconfig.json
jsconfig.json
```

from VFS if present.

Support:

``` text
baseUrl
paths
```

including:

``` json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

Then replace local resolver implementations with:

``` ts
resolveModule(...)
```

in:

``` text
linter.ts
structural-graph.ts
```

and any future architecture validator.

------------------------------------------------------------------------

# 6. Cross-File Import Validation Is Warning-Only at Pipeline Level

## Status

**PARTIALLY WORKING**

## Current Behavior

The checker itself can return:

``` ts
success: false
```

for:

-   missing imported files
-   named imports that do not exist

But the orchestrator only emits:

``` text
⚠️ Import Error
```

and continues.

## Why It Is Partial

The system has the detector.

It does not enforce the detector.

Current flow:

``` text
Import error
    ↓
runCrossFileImportCheck()
    ↓
error found
    ↓
warning emitted
    ↓
pipeline continues
```

## Exact Concept Needed

Convert cross-file import correctness into a hard Coder gate.

## Code Changes

In:

``` text
src/lib/agents/ruflo/orchestrator.ts
```

replace:

``` ts
if (!importCheck.success) {
  for (...) {
    emit(...)
  }
}
```

with:

``` ts
if (!importCheck.success) {
  for (const err of importCheck.errors) {
    emit({
      type: 'AGENT_LOG',
      agent: 'Coder',
      message: `❌ Import Error: ${err.message}`,
    });
  }

  throw new Error(
    `Cross-file import validation failed: ${importCheck.errors.length} error(s).`
  );
}
```

However, this should happen **after a repair phase**, not immediately.

Preferred flow:

``` text
Generate
   ↓
Import validation
   ↓
fail?
 ↓       ↓
NO      YES
 ↓       ↓
continue repair
          ↓
       validate
          ↓
       fail again?
       ↓       ↓
      NO      YES
       ↓       ↓
    continue   ABORT
```

------------------------------------------------------------------------

# 7. Per-File Linting Is Not a Project Build

## Status

**PARTIALLY WORKING**

## Current Behavior

`runLinter()` creates a TypeScript program for a target file.

It also preloads VFS files and performs:

``` text
TypeScript diagnostics
bracket checking
React hook/use-client checks
HTML link checks
CSS checks
Prisma preamble checks
```

This is useful.

But it is still fundamentally a **file-oriented validator**.

## Why It Is Partial

A project can have every individual file look reasonable while the
project itself cannot build.

The generated evidence demonstrated exactly this class of failure:

``` text
missing packages
router mismatch
Prisma model mismatch
client/server violations
cross-file type mismatch
missing API routes
mock data
```

## Exact Concept Needed

Add a **Whole Project Build Gate**.

The generated project needs to be treated as an actual project.

## Code Changes

### New file

``` text
src/lib/agents/ruflo/project-validator.ts
```

API:

``` ts
interface ProjectValidationResult {
  success: boolean;
  phase: string;
  errors: ValidationError[];
  warnings: ValidationError[];
}

validateGeneratedProject(
  conversationId: string
): Promise<ProjectValidationResult>
```

## Validation Phases

``` text
1. package manifest
2. dependency availability
3. TypeScript project compilation
4. framework build
5. Prisma validation
6. route validation
7. cross-file imports
8. generated artifact consistency
```

For a Next.js project:

``` bash
npm install
npm run build
```

or equivalent package-manager commands.

Do not blindly execute arbitrary scripts from generated projects.

Use a controlled sandbox/workspace.

## Result

The pipeline should stop treating:

``` text
"every generated file linted"
```

as equivalent to:

``` text
"project builds"
```

They are not equivalent.

------------------------------------------------------------------------

# 8. Missing NPM Dependencies Are Not Detected Early Enough

## Status

**PARTIALLY WORKING**

## Concrete Evidence

The generated project reported missing dependencies such as:

``` text
stripe
next-auth
```

## Why It Is Partial

The Blueprint/Code pipeline can generate imports:

``` ts
import Stripe from 'stripe';
import NextAuth from 'next-auth';
```

without ensuring those packages exist in:

``` text
package.json
```

## Exact Concept Needed

Create a dependency contract.

The project must have:

``` text
source imports
        ↓
package requirements
        ↓
package.json
```

## Code Changes

### New file

``` text
src/lib/agents/ruflo/dependency-validator.ts
```

Extract external imports:

``` ts
collectExternalDependencies(vfs)
```

Ignore:

``` text
relative imports
aliases
Node built-ins
```

Normalize:

``` text
@prisma/client → @prisma/client
next-auth/react → next-auth
stripe → stripe
lucide-react → lucide-react
```

Compare against:

``` text
package.json dependencies
package.json devDependencies
```

Then:

``` text
missing package
      ↓
repair package.json
      ↓
install
      ↓
build
```

## Better Architecture

The Blueprint should declare required packages:

``` md
## Dependencies

- next
- react
- @prisma/client
- prisma
- stripe
```

The Coder cannot invent dependencies silently.

------------------------------------------------------------------------

# 9. Prisma Contract and Generated Code Are Still Diverging

## Status

**PARTIALLY WORKING**

## Concrete Evidence

The generated output contained mismatches such as:

``` text
CartItem referenced by generated code
but absent from Prisma schema
```

and missing/incorrect Prisma usage.

## Why It Is Partial

The System stage creates:

``` text
backend_spec.md
```

but the generated implementation is not deterministically checked
against the Prisma schema.

## Exact Concept Needed

Introduce a **Database Contract Gate**.

Canonical chain:

``` text
backend_spec.md
       ↓
Prisma schema
       ↓
generated code
```

The database contract must become executable.

## Code Changes

### New file

``` text
src/lib/agents/ruflo/prisma-validator.ts
```

Validate:

``` text
model references
field names
relation names
types
required/optional fields
```

Against:

``` text
prisma/schema.prisma
```

For every generated usage:

``` ts
prisma.product.findMany(...)
```

validate that:

``` text
Product
```

exists.

For:

``` ts
product.imageUrl
```

validate that:

``` text
Product.imageUrl
```

exists.

## Stronger Fix

Generate the Prisma schema before application code.

Then make the schema available as a hard contract to:

``` text
API
services
server actions
repositories
```

The Coder should never invent a model.

------------------------------------------------------------------------

# 10. Next.js App Router vs Pages Router Is Still Unresolved

## Status

**PARTIALLY WORKING**

## Concrete Evidence

Generated architecture mixed:

``` text
src/app/
```

with:

``` text
src/pages/
```

and architecture documentation referenced:

``` text
src/pages/index.tsx
```

while the actual/generated tree used:

``` text
src/app/page.tsx
```

## Why It Is Partial

The parser has an `isFrameworkApp` check:

``` ts
sections.some(
  s =>
    s.file.startsWith('pages/') ||
    s.file.startsWith('app/') ||
    s.file === 'next.config.js' ||
    s.file === 'vite.config.js'
)
```

This prevents some incorrect automatic `index.html` insertion.

But it does not establish a global router contract.

## Exact Concept Needed

The project must choose exactly one:

``` text
NEXT_APP_ROUTER
```

or:

``` text
NEXT_PAGES_ROUTER
```

before Blueprint generation.

## Code Changes

Add:

``` ts
type FrameworkRouting =
  | 'NEXT_APP_ROUTER'
  | 'NEXT_PAGES_ROUTER'
  | 'VITE_SPA'
  | 'STATIC_HTML';
```

Store it in the project contract.

For App Router:

``` text
app/**/page.tsx
app/**/layout.tsx
app/**/route.ts
```

For Pages Router:

``` text
pages/**
pages/api/**
```

Reject mixed route structures unless explicitly configured.

Next.js documents App Router and Pages Router as distinct routing
systems, with App Router using file-system route segments such as
`app/page.tsx` and route handlers under the App Router structure.
citeturn0search1turn0search2

## Validation Rule

``` text
App Router selected
        ↓
pages/ route files
        ↓
ERROR

Pages Router selected
        ↓
app/ route files
        ↓
ERROR
```

------------------------------------------------------------------------

# 11. Client/Server Boundary Validation Is Too Shallow

## Status

**PARTIALLY WORKING**

## Current Behavior

The linter checks whether a file under an App Router path contains hooks
and lacks:

``` ts
'use client'
```

This catches one important failure.

But it does not comprehensively validate:

``` text
Server Component
    ↓
Client Component
```

or:

``` text
Client Component
    ↓
server-only module
```

## Concrete Failure Class

Generated code included issues around:

``` text
Prisma
client components
React hooks
```

## Exact Concept Needed

Build a **Next.js boundary validator**.

Classify each file:

``` text
SERVER
CLIENT
ROUTE_HANDLER
SERVER_ACTION
SHARED
```

## Code Changes

### New file

``` text
src/lib/agents/ruflo/framework-validator.ts
```

Rules:

### Client file

If:

``` ts
'use client'
```

then reject imports of:

``` text
@/lib/prisma
server-only
Node fs
Node child_process
database-only modules
```

### Server file

Allow server modules.

### Route handler

Allow:

``` text
Prisma
Node APIs
server-only
```

### Client hooks

Require:

``` text
'use client'
```

## Result

The check moves from:

``` text
"does this file have useState?"
```

to:

``` text
"does the entire import boundary respect Next.js execution contexts?"
```

------------------------------------------------------------------------

# 12. Generated Type Contracts Are Not Being Checked Across Components

## Status

**PARTIALLY WORKING**

## Concrete Evidence

Generated output contained mismatches such as:

``` text
ProductCard expects one shape
SearchPage passes another shape
```

Examples included:

``` text
id: string vs number
image vs imageUrl
```

## Why It Is Partial

The Coder receives UI component contracts from `ui_spec.md`.

That is good.

But the pipeline does not validate those contracts against actual
TypeScript usage across the project.

## Exact Concept Needed

Use the TypeScript compiler as the authoritative component contract
validator.

The problem is that the current linter is target-file-oriented.

## Code Changes

Whole-project TypeScript program:

``` ts
const program = ts.createProgram(
  allProjectFiles,
  compilerOptions,
  host
);

const diagnostics = ts.getPreEmitDiagnostics(program);
```

Do not lint each file independently as the final gate.

The final gate must compile the complete dependency graph.

## Result

The compiler catches:

``` text
ProductCardProps mismatch
```

at the call site.

------------------------------------------------------------------------

# 13. Mock Data Is Not Enforced Against the Backend Contract

## Status

**PARTIALLY WORKING**

## Concrete Evidence

Generated output still used mock/static product data even though the
specification called for database-backed product storage.

## Why It Is Partial

The Coder is told about:

``` text
Database Design
API Endpoints
```

but nothing prevents it from producing:

``` ts
const products = [...]
```

instead of:

``` ts
await prisma.product.findMany()
```

## Exact Concept Needed

Introduce a **Data Source Contract**.

For each entity:

``` text
Product
Customer
Order
Cart
```

declare:

``` ts
type DataSource =
  | 'DATABASE'
  | 'API'
  | 'STATIC'
  | 'EXTERNAL';
```

## Code Changes

In:

``` text
backend_spec.md
```

or its normalized contract:

``` yaml
Product:
  source: DATABASE
  model: Product
```

Then a deterministic validator can flag:

``` text
DATABASE entity
+
large hard-coded object array
```

as suspicious.

Do not try to prove all semantics with regex.

Use the validator to flag likely violations and the Reviewer to inspect
them.

------------------------------------------------------------------------

# 14. API Endpoint Contracts Are Not Verified Against Implementation

## Status

**PARTIALLY WORKING**

## Concrete Evidence

The generated report identified missing endpoints such as:

``` text
/api/products
/api/checkout
```

despite the backend contract requiring API behavior.

## Why It Is Partial

`backend_spec.md` describes APIs.

The Blueprint describes files.

But there is no final executable comparison:

``` text
declared endpoints
        ↕
implemented route handlers
```

## Exact Concept Needed

Build an **API Contract Extractor**.

Normalize:

``` ts
interface ApiContract {
  method: string;
  path: string;
  authRequired: boolean;
}
```

Extract declared endpoints from:

``` text
backend_spec.md
```

Extract actual endpoints from:

``` text
app/api/**/route.ts
pages/api/**
```

Then compare.

## Code Changes

### New file

``` text
src/lib/agents/ruflo/api-contract-validator.ts
```

Checks:

``` text
Declared but missing
Implemented but undeclared
Method mismatch
Auth requirement mismatch
```

## Example

``` text
backend:
POST /api/checkout

implementation:
GET /api/checkout
```

must become:

``` text
API CONTRACT ERROR
```

------------------------------------------------------------------------

# 15. Authentication Contract Is Contradictory and Not Enforced

## Status

**PARTIALLY WORKING**

## Concrete Evidence

The generated specifications disagreed:

``` text
plan.md
→ no auth

backend_spec.md
→ auth required for cart/checkout/orders
```

The generated security report also treated authentication as passing
despite the generated project not containing the complete expected auth
implementation.

## Why It Is Partial

Security is currently being assessed after generation.

The pipeline needs to know whether authentication exists before it
generates protected functionality.

## Exact Concept Needed

Authentication must be a project-level contract.

``` ts
interface AuthContract {
  enabled: boolean;
  provider?: string;
  protectedRoutes: string[];
}
```

## Code Changes

The specification validator must reject:

``` text
Auth: NONE
```

and:

``` text
protected route exists
```

simultaneously.

If auth is enabled:

``` text
package dependency
auth configuration
route/middleware
session mechanism
protected endpoint rules
```

must all exist.

If auth is disabled:

``` text
backend spec cannot mark routes auth-required
```

------------------------------------------------------------------------

# 16. Coder Self-Repair Is Not a Complete Repair Gate

## Status

**PARTIALLY WORKING**

## Current Behavior

Coder runs:

``` ts
while (!lCheck.success && repairAttempt < 2)
```

So it gets up to two repair attempts.

That is good.

## Why It Is Partial

After the loop, the pipeline can continue even if:

``` text
lCheck.success === false
```

The generated evidence already showed:

``` text
Repaired 1/5
4 still failing
```

yet downstream processing could continue.

## Exact Concept Needed

Repair needs a terminal state:

``` text
PASS
REPAIRED
FAILED_FINAL
```

not merely:

``` text
attempt count
```

## Code Changes

After the repair loop:

``` ts
if (!lCheck.success) {
  emit({
    type: 'PIPELINE_ERROR',
    message:
      `Coder failed validation for ${fileSec.file} after ${repairAttempt} repair attempts.`
  });

  throw new Error(
    `Unresolved Coder errors in ${fileSec.file}`
  );
}
```

However, use this only after introducing the broader project validator.

Otherwise the system will fix a local file and still generate a broken
project.

------------------------------------------------------------------------

# 17. DOM Coherence Checks Are Still Non-Blocking

## Status

**PARTIALLY WORKING**

## Current Behavior

DOM coherence is checked, but warnings do not necessarily stop
generation.

## Why It Is Partial

For a frontend project, these are different levels:

``` text
HTML syntax
DOM references
React component rendering
browser runtime
user interaction
```

A static DOM check cannot prove the last three.

## Exact Concept Needed

Keep the existing static check, but classify it:

``` text
STATIC_UI_CHECK
```

Then add:

``` text
BROWSER_ACCEPTANCE_TEST
```

## Code Changes

Do not turn every DOM warning into a hard failure.

Instead:

``` text
hard:
missing referenced asset
invalid route structure
unclosed markup

soft:
possible selector mismatch
dynamic runtime-dependent warning
```

Then runtime browser tests validate:

``` text
page loads
button exists
button can click
navigation works
```

------------------------------------------------------------------------

# 18. Runtime Testing Is Missing

## Status

**PARTIALLY WORKING**

## Current Behavior

Preview support mainly launches:

``` text
main.js
app.js
server.js
index.js
```

or serves:

``` text
index.html
```

## Why It Is Partial

That is not equivalent to running a framework application.

A Next.js application needs:

``` text
install
build
start/dev
HTTP request
route response
browser execution
```

## Exact Concept Needed

Introduce a controlled **Runtime Acceptance Stage**.

``` text
Coder
 ↓
Build Gate
 ↓
Start Application
 ↓
Health Check
 ↓
Route Smoke Tests
 ↓
Browser Tests
 ↓
PASS
```

## Code Changes

### New file

``` text
src/lib/agents/ruflo/runtime-validator.ts
```

Implement:

``` ts
startGeneratedProject()
waitForReady()
probeRoutes()
stopGeneratedProject()
```

For a Next.js project:

``` text
npm run build
npm run start
```

Then probe:

``` text
GET /
GET /product/example
GET /checkout
```

based on the project contract.

------------------------------------------------------------------------

# 19. Security Stage Is Not an Implementation Gate

## Status

**PARTIALLY WORKING**

## Concrete Evidence

The generated security report contained findings such as:

``` text
hardcoded/unsafe Stripe secret access
missing search validation
```

but also made claims that were not fully grounded in the generated
implementation.

## Why It Is Partial

Security currently behaves too much like:

``` text
security review report
```

instead of:

``` text
security gate
```

## Exact Concept Needed

Security validation must consume executable evidence:

``` text
source code
routes
dependencies
auth contract
API contract
```

and produce:

``` ts
SecurityGateResult {
  blocking: Finding[];
  warnings: Finding[];
}
```

## Code Changes

### New file

``` text
src/lib/agents/ruflo/security-gate.ts
```

Hard-block examples:

``` text
hardcoded secret
SQL injection pattern
unsafe eval
missing required auth middleware
exposed server secret in client component
known vulnerable package
```

Warnings:

``` text
missing rate limiting
weak logging
potentially unsafe input handling
```

The Security agent's prose report should remain useful, but the pipeline
should rely on the deterministic gate for blocking decisions.

------------------------------------------------------------------------

# 20. Reviewer Is Still Primarily a Reporting Layer

## Status

**PARTIALLY WORKING**

## Current Behavior

Reviewer receives:

``` text
specs
source
architecture drift
```

and generates a review report.

## Why It Is Partial

The Reviewer can identify:

``` text
missing feature
incorrect architecture
broken implementation
```

but its output is not the final deterministic gate.

An LLM saying:

``` text
REPAIR_REQUIRED
```

should not be the only thing deciding whether generated software ships.

## Exact Concept Needed

Split:

``` text
Reviewer
```

into:

``` text
Reviewer = reasoning / explanation

QualityGate = deterministic enforcement
```

## Code Changes

### New file

``` text
src/lib/agents/ruflo/quality-gate.ts
```

Inputs:

``` ts
{
  specValidation,
  blueprintValidation,
  buildValidation,
  importValidation,
  apiValidation,
  databaseValidation,
  runtimeValidation,
  securityValidation,
  architectureDrift
}
```

Output:

``` ts
type QualityGateStatus =
  | 'PASS'
  | 'REPAIR_REQUIRED'
  | 'BLOCKED';
```

Reviewer can provide explanation.

QualityGate decides the machine state.

------------------------------------------------------------------------

# 21. ExecutiveMemory / Context Snapshot Is Still Present

## Status

**PARTIALLY WORKING AS ARCHITECTURE**

## Current Situation

The repository still contains:

``` text
ExecutiveMemory
Context Snapshot
StageLedger
typed stage outputs
VirtualFile Markdown
AgentOutput
```

This means the semantic state is still represented in multiple places.

## Why It Is Partial

The desired simplified architecture is:

``` text
Markdown/VFS
     ↓
canonical specification state
```

But the current code still imports:

``` ts
loadExecutiveMemory
writeExecutiveMemoryRecord
OWNERSHIP
StageLedger
```

from:

``` text
memory.ts
```

The system has not actually completed the migration away from semantic
memory.

## Exact Concept Needed

Move to:

``` text
Markdown = canonical semantic state

Database =
execution metadata
artifact metadata
provenance
pipeline state
```

## Code Changes

### Phase 1

Stop using ExecutiveMemory for context injection.

Replace semantic context retrieval with:

``` ts
readVirtualFile(
  conversationId,
  "requirements.md"
)
```

etc.

### Phase 2

Delete:

``` text
Context Snapshot extraction
snapshot fallback
typed context fallback
```

### Phase 3

Remove semantic duplication from:

``` text
ExecutiveMemory
dedicated stage output tables
```

only after all callers are migrated.

## Important

Do not delete the database tables first.

Migrate readers and writers first.

Then remove dead persistence.

------------------------------------------------------------------------

# 22. Stage Dependency Maps Are Duplicated

## Status

**PARTIALLY WORKING**

## Current Situation

There are multiple dependency definitions:

``` text
UPSTREAM_AGENT_MAP
```

and invalidation logic in:

``` text
ExecutiveMemoryGateway.handleUpstreamModification()
```

These can drift.

## Why It Is Partial

Example:

``` text
UPSTREAM_AGENT_MAP
```

says one relationship.

Invalidation logic separately hardcodes another.

Eventually:

``` text
execution graph ≠ invalidation graph
```

## Exact Concept Needed

One canonical stage graph.

## Code Changes

Create:

``` text
src/lib/agents/ruflo/stage-graph.ts
```

Example:

``` ts
export const STAGE_GRAPH = {
  Planner: ['Queen'],
  Architect: ['Queen', 'Planner'],
  System: ['Queen', 'Planner', 'Architect'],
  Designer: ['Queen', 'Planner', 'Architect'],
  Blueprinter: [
    'Planner',
    'Architect',
    'System',
    'Designer'
  ],
  Coder: ['Blueprinter'],
  Tester: ['Coder'],
  Debugger: ['Tester'],
  Security: ['Coder'],
  Reviewer: ['Coder', 'Security', 'Tester'],
};
```

Then derive:

``` text
upstream dependencies
downstream invalidation
execution order
```

from the same graph.

------------------------------------------------------------------------

# 23. Generated Project File Set Is Not Fully Enforced

## Status

**PARTIALLY WORKING**

## Current Behavior

Architecture drift detects:

``` text
blueprint file missing in VFS
VFS file absent from blueprint
```

This is good.

But it does not necessarily make all drift blocking.

## Exact Concept Needed

Three-state result:

``` text
ALIGNED
DRIFT_DETECTED
UNVERIFIABLE
```

and severity:

``` text
BLOCKING
WARNING
INFO
```

## Code Changes

Change:

``` ts
detectAndPersistArchitectureDrift()
```

to return structured data rather than only Markdown:

``` ts
interface ArchitectureDriftResult {
  status: 'ALIGNED' | 'DRIFT_DETECTED' | 'UNVERIFIABLE';
  blocking: Drift[];
  warnings: Drift[];
}
```

Write Markdown as a projection:

``` text
architecture_drift_report.md
```

but let QualityGate consume the structured result.

------------------------------------------------------------------------

# 24. HTML Asset Synchronization Is Useful but Not a Framework-Aware Solution

## Status

**PARTIALLY WORKING**

## Current Behavior

The orchestrator synchronizes HTML CSS/JS links.

That helps static websites.

## Why It Is Partial

A Next.js application should generally not be repaired by adding:

``` html
<script src="...">
```

to an `index.html`.

The framework owns asset loading.

Next.js App Router uses `app/page.tsx` and route segments rather than
requiring a conventional `index.html` entry point. citeturn0search2

## Exact Concept Needed

Asset synchronization must be framework-aware:

``` text
STATIC_HTML
    → HTML asset synchronization

VITE
    → Vite entry handling

NEXT_APP
    → Next.js route/component handling

NEXT_PAGES
    → Pages Router handling
```

## Code Changes

Change:

``` ts
syncHtmlAssetLinks(...)
```

to run only when:

``` ts
framework === 'STATIC_HTML'
```

or the project explicitly uses HTML entry points.

------------------------------------------------------------------------

# 25. Exact Implementation Order

Do not implement these randomly.

The correct dependency order is:

## Phase P0 --- Canonical Contracts

### 1. Specification Contract Validator

Create:

``` text
spec-contract.ts
```

Solve:

``` text
plan ↔ requirements ↔ architecture ↔ backend ↔ UI
```

contradictions.

### 2. Framework Contract

Choose:

``` text
Next App Router
Next Pages Router
Vite
Static
```

before Blueprint.

### 3. Package Contract

Create:

``` text
dependency-validator.ts
```

------------------------------------------------------------------------

# Phase P1 --- Blueprint Correctness

### 4. Make missing local dependencies blocking

Fix:

``` text
validateBlueprintGraph()
```

### 5. Symmetric dependency drift

Fix:

``` text
structural-graph.ts
```

### 6. Canonical module resolver

Create:

``` text
module-resolver.ts
```

and reuse it everywhere.

------------------------------------------------------------------------

# Phase P2 --- Generated Project Correctness

### 7. Whole-project TypeScript/build validator

Create:

``` text
project-validator.ts
```

### 8. Prisma contract validator

Create:

``` text
prisma-validator.ts
```

### 9. API contract validator

Create:

``` text
api-contract-validator.ts
```

### 10. Next.js boundary validator

Create:

``` text
framework-validator.ts
```

------------------------------------------------------------------------

# Phase P3 --- Repair Loop

Change:

``` text
generate
 ↓
lint
 ↓
repair twice
 ↓
continue
```

into:

``` text
generate
 ↓
file validation
 ↓
repair
 ↓
whole-project build
 ↓
API/database/framework validation
 ↓
repair
 ↓
build again
 ↓
pass or abort
```

The important difference is that repair becomes **evidence-driven**.

------------------------------------------------------------------------

# Phase P4 --- Runtime

Create:

``` text
runtime-validator.ts
```

Flow:

``` text
build
 ↓
start
 ↓
health
 ↓
route smoke tests
 ↓
browser acceptance
```

------------------------------------------------------------------------

# Phase P5 --- Security + Quality Gate

Create:

``` text
security-gate.ts
quality-gate.ts
```

Final pipeline:

``` text
                    ┌──────────────┐
                    │ Markdown     │
                    │ Specifications│
                    └──────┬───────┘
                           ↓
                 ┌───────────────────┐
                 │ Spec Contract     │
                 │ Validator         │
                 └────────┬──────────┘
                          ↓
                 ┌───────────────────┐
                 │ Blueprinter       │
                 │ + Graph Validation│
                 └────────┬──────────┘
                          ↓
                 ┌───────────────────┐
                 │ Coder             │
                 └────────┬──────────┘
                          ↓
                 ┌───────────────────┐
                 │ File Validation   │
                 └────────┬──────────┘
                          ↓
                 ┌───────────────────┐
                 │ Whole Project     │
                 │ Build             │
                 └────────┬──────────┘
                          ↓
                 ┌───────────────────┐
                 │ Contract Checks   │
                 │ API / DB / Routes │
                 └────────┬──────────┘
                          ↓
                 ┌───────────────────┐
                 │ Runtime Tests     │
                 └────────┬──────────┘
                          ↓
                 ┌───────────────────┐
                 │ Security Gate     │
                 └────────┬──────────┘
                          ↓
                 ┌───────────────────┐
                 │ Quality Gate      │
                 └────────┬──────────┘
                          ↓
                    PASS / BLOCK
```

------------------------------------------------------------------------

# 26. What "Done" Should Mean

A generated project should not be marked complete merely because:

``` text
Coder finished
```

or:

``` text
every file linted
```

or:

``` text
Reviewer said PASS
```

The final state should be:

``` text
SPECIFICATIONS CONSISTENT
        AND
BLUEPRINT VALID
        AND
PROJECT BUILDS
        AND
IMPORTS RESOLVE
        AND
DATABASE CONTRACT MATCHES
        AND
API CONTRACT MATCHES
        AND
FRAMEWORK ROUTING IS CONSISTENT
        AND
RUNTIME SMOKE TESTS PASS
        AND
SECURITY GATE PASSES
        ↓
PROJECT PASS
```

Anything below that is an intermediate state.

------------------------------------------------------------------------

# 27. Final Priority Table

  ------------------------------------------------------------------------
  System            Current State     Main Missing Piece Priority
  ----------------- ----------------- ------------------ -----------------
  Specification     Partial           Deterministic      P0
  consistency                         contract           
                                      reconciliation     

  Blueprint missing Partial           Make local missing P0
  dependencies                        deps blocking      

  Blueprint ↔ code  Partial           Symmetric          P0
  dependencies                        comparison         

  Module resolution Partial           Shared TS          P0
                                      alias-aware        
                                      resolver           

  Structural graph  Partial           Clean rebuild /    P1
                                      stale-node         
                                      handling           

  Package           Partial           Import → package   P1
  dependencies                        contract           

  Whole-project     Partial           Real project build P1
  compilation                         gate               

  Prisma            Partial           Schema ↔ code      P1
  consistency                         validation         

  API consistency   Partial           Declared ↔         P1
                                      implemented        
                                      endpoint check     

  Next router       Partial           Explicit framework P1
  consistency                         contract           

  Client/server     Partial           Import-boundary    P1
  boundaries                          validator          

  Component type    Partial           Whole-project TS   P1
  contracts                           compilation        

  Mock data         Partial           Data-source        P2
  enforcement                         contract           

  Self-repair       Partial           Final failure must P1
                                      block              

  DOM validation    Partial           Runtime acceptance P2
                                      layer              

  Runtime testing   Missing/partial   Build + start +    P1
                                      route/browser      
                                      tests              

  Security          Partial           Deterministic      P1
                                      blocking gate      

  Reviewer          Partial           Separate reasoning P1
                                      from enforcement   

  ExecutiveMemory   Partial           Markdown/VFS       P2
  migration         architecture      canonicalization   

  Stage dependency  Partial           Single canonical   P1
  graph                               graph              

  Architecture      Partial           Structured         P1
  drift                               blocking result    

  HTML asset sync   Partial           Framework-aware    P2
                                      execution          
  ------------------------------------------------------------------------

------------------------------------------------------------------------

# Bottom Line

The current AutoCoder run has already fixed the **local mechanical
problems around Ollama and blueprint graph formation**.

What remains is the much more important second half:

``` text
"Can AutoCoder detect that the software it generated is actually wrong,
and prevent that software from being declared complete?"
```

Right now, only parts of that answer are yes.

The correct next architecture is **not another memory layer, another
snapshot, or another LLM reviewer**.

It is a deterministic verification stack:

``` text
Markdown contracts
        ↓
Blueprint graph
        ↓
Generated code
        ↓
Compiler
        ↓
Framework validator
        ↓
API validator
        ↓
Database validator
        ↓
Runtime tests
        ↓
Security gate
        ↓
Quality gate
```

That turns AutoCoder from:

``` text
LLM pipeline that generates a project
```

into:

``` text
LLM pipeline that generates a project
AND proves whether the generated project satisfies its declared contract.
```

That distinction is the actual remaining engineering work.
