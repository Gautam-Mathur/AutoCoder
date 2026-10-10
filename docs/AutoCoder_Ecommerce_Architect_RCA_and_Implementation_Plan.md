# AutoCoder — E-Commerce Architect Output RCA & Surgical Implementation Plan

**Repository:** `Gautam-Mathur/AutoCoder`  
**Analyzed commit:** `6719ff59b6689f248d28273ee2654fd1af124ed1`  
**Test fixture:** Next.js + Stripe + SQLite + Prisma + catalog search  
**Primary goal:** Fix the architectural-contract pipeline so the e-commerce fixture is validated correctly without weakening framework-specific invariants.

---

# 1. Executive Finding

The latest e-commerce Architect output exposes **multiple independent defects**.

The important distinction is:

```text
Architect generated invalid/incomplete architecture
        ↓
Contract extractor partially reinterprets it
        ↓
Architecture is not independently validated
        ↓
Blueprinter receives an incomplete contract context
        ↓
Blueprint/runtime validators cannot enforce the intended semantics
```

The solution is **not** to make the downstream validators more permissive.

The correct pipeline is:

```text
Architect
   ↓
Architecture Artifact Validator
   ↓
ProjectContract extraction
   ↓
ProjectContract validation
   ↓
Blueprinter
   ↓
Blueprint Graph + framework-aware validation
   ↓
Coder
   ↓
Framework/API/Prisma/Security verification
```

The Architect's output should be rejected or repaired when it violates its own required schema.

---

# 2. Evidence From Current Code

## 2.1 Architect prompt still contains conflicting web-entry rules

`src/lib/agents/ruflo/registry/Architect.ts` currently says:

```text
FOR WEB APPLICATIONS:
- Static HTML: index.html is the browser entry.
- React + Webpack: the source entry is the configured React entry
- Vite: preserve the declared Vite source entry.
- Next App Router: app/page.tsx.
- Next Pages Router: pages/index.tsx.
```

but elsewhere it says:

```text
FOR WEB APPS: index.html MUST be listed as File #1 at project root or inside public/.
NEVER omit index.html for a web app!
```

This is incompatible with the intended Next.js architecture model.

Next.js App Router does not need a generated `index.html` application entry in the architecture tree.

### RCA

The Architect prompt contains a framework-specific rule and a framework-agnostic rule that conflict.

### Fix

Make the folder-tree rules explicitly framework-specific.

---

# 3. Finding A — Next.js Entry Point Is Not `src`-Aware

## Observed output

The Architect generated:

```text
Frontend Entry Point: src/app/page.tsx
```

The project tree also uses:

```text
src/app/page.tsx
```

But the Architect system prompt currently hardcodes:

```text
Next App Router: app/page.tsx
```

and `extractProjectContract()` currently hardcodes:

```ts
if (framework === 'NEXT_APP_ROUTER') {
  entryPoints.push('app/page.tsx', 'app/layout.tsx');
}
```

This creates a contract mismatch.

## Root cause

The architecture artifact can declare:

```text
src/app/page.tsx
```

but the contract extractor discards that declaration and creates:

```text
app/page.tsx
app/layout.tsx
```

The validator then has to guess what the Architect meant.

## Required implementation

### File

```text
src/lib/agents/ruflo/spec-contract.ts
```

### Change

For `NEXT_APP_ROUTER`, extract the explicit:

```text
Frontend Entry Point:
```

from `architecture.md`.

Normalize it and preserve it.

Pseudo-implementation:

```ts
const explicitFrontendEntry =
  arch.match(/Frontend Entry Point:\s*([^\n]+)/i)?.[1]
    ?.trim()
    .replace(/[*`'"]/g, '');

if (framework === 'NEXT_APP_ROUTER') {
  entryPoints.push(
    explicitFrontendEntry || detectNextAppRouterEntry(arch) || 'app/page.tsx'
  );
}
```

Do not automatically add:

```text
app/layout.tsx
```

unless the architecture actually declares it or a separate framework invariant requires it.

### Required supported values

```text
app/page.tsx
src/app/page.tsx
```

and equivalent `.js/.jsx` forms where the project language permits them.

---

# 4. Finding B — Architect Generated an Invalid Catch-All Route

## Observed output

```text
Backend Entry Point: src/app/api/[...]/route.ts
```

and:

```text
src/app/api/
└── [...]/route.ts
```

## Why this is invalid

Next.js dynamic route segments require a parameter name.

Valid:

```text
src/app/api/[slug]/route.ts
src/app/api/[...slug]/route.ts
src/app/api/[[...slug]]/route.ts
```

Invalid:

```text
src/app/api/[...]/route.ts
```

## Root cause

The Architect prompt provides examples of dynamic routing but does not state a hard invariant:

```text
A catch-all segment MUST contain a parameter identifier.
```

The LLM can therefore emit a syntactically suggestive but invalid segment.

## Required implementation

### Architect prompt

File:

```text
src/lib/agents/ruflo/registry/Architect.ts
```

Add an explicit Next.js route rule:

```text
NEXT.JS ROUTE SEGMENT RULE:
- Dynamic segments must be named: [id]
- Catch-all segments must be named: [...slug]
- Optional catch-all segments must be named: [[...slug]]
- NEVER emit `[...]/route.ts`, `[...]`, `[[]]`, or unnamed dynamic segments.
```

### Deterministic validator

Do not rely on prompt compliance.

Add a route-segment validator that rejects:

```regex
/\[\.\.\.\]/
```

and other unnamed dynamic segments.

The validator should operate on architecture tree paths and later on generated VFS paths.

Error:

```text
Next.js Architecture Error:
Invalid unnamed catch-all route segment "[...]".
Expected "[...param]" or "[[...param]]".
```

---

# 5. Finding C — Architect Violated Its Own Module Ownership Rule

## Observed output

`ProductCard.tsx` and `SearchBar.tsx` appear under both:

```text
Frontend Pages
```

and:

```text
Frontend Components
```

The Architect prompt explicitly says:

```text
Every file ... MUST appear in exactly ONE module's "Owned Files".
No file can be ... claimed by two modules.
```

Therefore this is an objective architecture-contract violation.

## Root cause

There is currently no deterministic validation of:

```text
Project Folder Structure
        ↕
Modules / Owned Files
```

The extractor silently de-duplicates files instead of reporting the architecture error.

## Required implementation

### New function

Prefer:

```ts
validateArchitectureArtifact(
  architectureContent: string,
  contract?: ProjectContract
): ArchitectureValidationResult
```

Location:

```text
src/lib/agents/ruflo/spec-contract.ts
```

or a dedicated:

```text
src/lib/agents/ruflo/architecture-validator.ts
```

Prefer a dedicated file if the function grows beyond simple parsing.

### Validate

1. Every tree file appears in exactly one module.
2. Every module-owned file appears in the tree.
3. No file is owned by two modules.
4. No module has zero owned files.
5. Declared entry points exist in the tree.
6. Backend entry exists when backend is declared.
7. Database/ORM files exist when those technologies are declared.
8. Framework-specific route paths are syntactically valid.

### Error example

```text
Architecture Contract Error:
File "src/app/components/ProductCard.tsx" is claimed by modules
"Frontend Pages" and "Frontend Components".
Each file must have exactly one owning module.
```

---

# 6. Finding D — Module Dependency Direction Is Suspicious

The output contains:

```text
Frontend Components
    Depends On: Frontend Pages Module
```

while the page module owns:

```text
src/app/page.tsx
```

and components are consumed by the page.

The likely desired relationship is:

```text
Frontend Pages
    ↓
Frontend Components
```

not:

```text
Frontend Components
    ↓
Frontend Pages
```

## Important caution

Do NOT implement a universal rule:

```text
component -> page = always invalid
```

because modules are semantic groups, not necessarily direct source-import graphs.

Instead:

### Phase 1

Validate only obvious contradictions:

- a module claims dependency on itself
- dependency names do not correspond to declared modules
- dependency refers to an unknown module
- a module's dependency declaration contradicts explicit ownership/runtime rules

### Phase 2

Use actual blueprint/source imports to validate implementation direction.

The architecture document should not be forced to predict every import edge.

---

# 7. Finding E — Stripe Integration Disappeared From Module Dependencies

The Tech Stack says:

```text
Additional: Stripe
```

and Backend API says:

```text
Stripe checkout integration
```

but:

```text
Backend API Routes
    Depends On:
    Database Module
```

There is no explicit Stripe integration dependency.

## Root cause

The Architect prompt does not require selected integrations to be represented consistently in module dependency declarations.

## Required implementation

Add an integration concept to the contract rather than encoding Stripe as an arbitrary dependency string.

Recommended extension:

```ts
export interface ProjectContract {
  ...
  integrations?: string[];
}
```

For the current fixture:

```ts
integrations: ['stripe']
```

### Extraction

Parse:

```text
Additional: Stripe
```

and explicit backend integration references.

### Validation

If:

```text
integrations includes stripe
```

then architecture must contain an implementation location for Stripe.

Accept examples such as:

```text
src/app/api/**/route.ts
src/lib/stripe.ts
lib/stripe.ts
```

depending on the architecture.

Do not require a particular filename.

### Security relationship

The framework validator remains responsible for:

```text
client -> @stripe/stripe-js       allowed
client -> Stripe secret            forbidden
server -> Stripe server SDK       allowed
```

---

# 8. Finding F — Search Feature Has Lost Its Concrete Location

Earlier architecture output represented:

```text
src/app/search/page.tsx
```

The latest output instead says:

```text
Supports Features: Catalog Search Page
```

but does not provide a dedicated search route.

This may be valid if search is intentionally embedded into `/`.

The problem is that the architecture contract no longer makes that explicit.

## Root cause

Feature support is represented as free-form text:

```text
Supports Features:
```

with no machine-verifiable feature-to-file mapping.

## Required implementation

Do not force a dedicated page.

Instead require one of:

```text
Feature: Catalog Search Page
Implementation: src/app/search/page.tsx
```

or:

```text
Feature: Catalog Search Page
Implementation: src/app/page.tsx
```

or an equivalent explicit module/file ownership statement.

### Minimal change

Extend module schema:

```text
- Supports Features: ...
- Feature Files: ...
```

However, avoid expanding the Architect output format unless necessary.

A lower-impact alternative is to use `Owned Files` + `Supports Features` and validate that each feature has at least one owning module.

---

# 9. Finding G — Blueprinter Drops the Contract During Graph Validation

This is a significant pipeline bug.

In the Blueprinter stage:

```ts
const specContract = extractProjectContract(specContents);
const specVal = validateProjectContract(specContract);
```

The contract exists.

But later:

```ts
const bpVal = validateBlueprintGraph(finalSections);
```

The function supports:

```ts
validateBlueprintGraph(
  sections,
  tsConfigContent?,
  contract?
)
```

yet the real Blueprinter path does not pass `specContract`.

The Coder path has the same issue:

```ts
const blueprintValidation = validateBlueprintGraph(fileSections);
```

## Consequence

Framework-aware rules such as:

```text
NEXT_APP_ROUTER
VITE_SPA
contract entry points
contract hash
runtime semantics
```

are not consistently applied.

When `contract` is omitted:

```ts
const framework = contract?.framework || 'STATIC_HTML';
```

so a Next.js blueprint can silently fall back to:

```text
STATIC_HTML
```

semantics.

## Required implementation

### Blueprinter

Change:

```ts
validateBlueprintGraph(finalSections)
```

to:

```ts
validateBlueprintGraph(finalSections, tsConfigContent, specContract)
```

Do this for:

1. batch validation
2. final blueprint validation

### Coder

The Coder stage must obtain the same authoritative contract.

Do not re-extract independently unless necessary.

Preferred:

```text
Pipeline contract
      ↓
Blueprinter
      ↓
Coder
```

If stage-local retrieval is required:

```ts
const specContract = extractProjectContract(specContents);
```

then pass it.

### Regression

Add a test proving that a Next blueprint:

```text
src/app/api/products/route.ts
    -> src/lib/prisma.ts
```

passes through the same production validation path used by Blueprinter/Coder.

---

# 10. Finding H — `validateBlueprintGraph()` Misclassifies Next Server Components

Current logic effectively treats many `src/**` files as client files:

```ts
const isClientFile =
  ...
  srcFile.startsWith('src/')
```

This is too broad for Next.js.

In Next App Router:

```text
src/app/page.tsx
```

is a Server Component by default unless it has:

```text
"use client"
```

Therefore:

```text
src/app/page.tsx
    -> src/lib/prisma.ts
```

may be valid.

## Required implementation

For `NEXT_APP_ROUTER`, runtime classification should be:

```text
route.ts / route.js
    -> server

"use client"
    -> client

src/app/** without "use client"
    -> server by default

src/components/** outside app
    -> inspect content / explicit client marker
```

The blueprint stage only has section metadata, not necessarily final source content.

Therefore the architecture/blueprint validator should use:

1. explicit blueprint runtime metadata if available
2. framework path semantics
3. purpose text
4. dependency semantics

Do not infer:

```text
src/ = browser
```

for Next.js.

---

# 11. Finding I — Next API Route Validator Is Mostly Correct, But Needs One Guard

`api-contract-validator.ts` already supports:

```text
[slug]
[...slug]
[[...slug]]
```

and recognizes:

```text
export async function GET()
export async function POST()
```

This part is directionally correct.

However, it can match malformed:

```text
[...]
```

because its dynamic matcher accepts any bracketed catch-all segment.

## Required change

Add a route segment validity check before matching:

```ts
function isValidNextDynamicSegment(segment: string): boolean {
  return (
    /^\[[A-Za-z0-9_$]+\]$/.test(segment) ||
    /^\[\.\.\.[A-Za-z0-9_$]+\]$/.test(segment) ||
    /^\[\[\.\.\.[A-Za-z0-9_$]+\]\]$/.test(segment)
  );
}
```

Reject:

```text
[...]
```

before route matching.

This is a defensive validator.

The Architect validator remains the primary source-level prevention.

---

# 12. Finding J — `extractFilesFromArchitecture()` Silently Hides Ownership Errors

Current extraction uses:

```ts
if (clean && ... && !files.includes(clean)) {
  files.push(clean);
}
```

This prevents duplicates in the returned list.

That is useful for synthesis, but dangerous for validation because:

```text
duplicate ownership
```

becomes:

```text
single target file
```

and the evidence disappears.

## Required implementation

Separate:

```text
parseArchitectureFiles()
```

from:

```text
validateArchitectureArtifact()
```

The parser may de-duplicate for synthesis.

The validator must preserve duplicate ownership information.

Never use a de-duplicated representation as the sole source for validation.

---

# 13. Finding K — Architecture Validation Must Happen Before Blueprinter Synthesis

Current Blueprinter sequence:

```text
extractProjectContract
        ↓
validateProjectContract
        ↓
extractFilesFromArchitecture
        ↓
Blueprinter
```

This validates the specification contract but not the Architect artifact itself.

## Required sequence

```text
extractProjectContract
        ↓
validateProjectContract
        ↓
validateArchitectureArtifact
        ↓
if invalid → repair/reject
        ↓
extractFilesFromArchitecture
        ↓
Blueprinter
```

This prevents malformed Architect output from becoming authoritative input to later stages.

---

# 14. Architect Repair Strategy

Do not immediately invoke the Coder or Debugger for architecture defects.

Architect output is structured enough to repair deterministically.

Recommended:

```text
Architect
   ↓
Architecture Validator
   ↓
invalid?
   ├── no → continue
   └── yes
        ↓
Architecture repair attempt
        ↓
validate again
        ↓
max 2 attempts
        ↓
still invalid → hard stage failure
```

Repair prompt should contain:

```text
Architecture violations:
- ...
- ...

Current architecture.md:
...

Output ONLY the complete corrected architecture.md.
Preserve valid decisions.
Do not redesign unrelated modules.
```

This is safer than asking a generic Debugger to modify an architecture artifact.

---

# 15. Required Architect Prompt Changes

## `src/lib/agents/ruflo/registry/Architect.ts`

### Replace the current framework entry rules with:

```text
FRAMEWORK ENTRY RULES:

- Static HTML: index.html.
- React + Webpack: configured React source entry.
- Vite: declared Vite source entry.
- Next.js App Router: app/page.tsx OR src/app/page.tsx.
- Next.js Pages Router: pages/index.tsx OR src/pages/index.tsx.

Do not invent an index.html for Next.js App Router projects.
```

### Replace the global index.html rule with:

```text
FOLDER TREE ENTRY RULES:

- Static HTML projects MUST include index.html.
- React + Webpack projects MUST include the HTML shell required by their webpack configuration.
- Vite projects MUST include their HTML entry.
- Next.js App Router projects MUST NOT add index.html merely because they are web apps.
```

### Add:

```text
NEXT.JS ROUTE SEGMENT RULE:

- [id] is a named dynamic segment.
- [...slug] is a named catch-all segment.
- [[...slug]] is a named optional catch-all segment.
- NEVER emit unnamed segments such as [...] or [[]].
```

### Add:

```text
MODULE OWNERSHIP RULE:

Every file in the folder tree must appear in exactly one module's Owned Files list.
No file may be claimed by two modules.
No module may claim a file absent from the tree.
```

This already exists conceptually; repeat it in the most visible place near the module format and keep it deterministic.

---

# 16. Contract Model Changes

## `src/lib/agents/ruflo/contracts.ts`

Add:

```ts
integrations?: string[];
```

Optionally add a structured architecture validation result in the validator layer rather than bloating `ProjectContract`.

Do not add:

```text
moduleGraph
```

to `ProjectContract` yet.

The architecture document is still the source artifact for module organization.

---

# 17. Contract Extraction Changes

## `src/lib/agents/ruflo/spec-contract.ts`

Implement:

### A. Explicit Next entry extraction

Preserve:

```text
src/app/page.tsx
```

when declared.

### B. Integration extraction

At minimum:

```text
Stripe -> stripe
```

Normalize common names:

```text
Stripe
stripe.js
@stripe/*
```

to:

```text
stripe
```

### C. Architecture artifact validation

Add:

```ts
validateArchitectureArtifact()
```

and validate:

- tree/module ownership
- duplicate ownership
- orphan files
- invalid Next route segments
- entry-point consistency
- backend entry consistency
- integration coverage

### D. Contract validation

`validateProjectContract()` should remain focused on cross-artifact contract contradictions.

Do not turn it into an enormous architecture parser.

---

# 18. Blueprint Validator Changes

## `src/lib/agents/ruflo/orchestrator.ts`

### A. Always pass the contract

Blueprinter:

```ts
validateBlueprintGraph(finalSections, tsConfigContent, specContract)
```

Coder:

```ts
validateBlueprintGraph(fileSections, tsConfigContent, specContract)
```

Batch validation should also pass the contract.

### B. Fix Next runtime classification

Do not classify all `src/**` as client.

Use:

```text
Next route handler -> server
"use client" -> client
src/app/** without "use client" -> server
```

### C. Keep static/Vite rules unchanged

For:

```text
VITE_SPA
REACT_WEBPACK_SPA
STATIC_HTML
```

browser → server/database remains forbidden.

### D. Preserve directional Next rules

Valid:

```text
Next Server Component -> Prisma
Next Route Handler -> Prisma
Next Route Handler -> Stripe server SDK
Client Component -> /api/...
```

Invalid:

```text
Client Component -> Prisma
Client Component -> server Stripe SDK
Client Component -> Stripe secret
```

---

# 19. API Validator Changes

## `src/lib/agents/ruflo/api-contract-validator.ts`

Keep the existing dynamic matching architecture.

Add:

```ts
validateNextRouteSegmentSyntax()
```

before dynamic route matching.

Supported:

```text
[slug]
[...slug]
[[...slug]]
```

Rejected:

```text
[...]
```

Also ensure HTTP method validation remains:

```text
GET -> export GET
POST -> export POST
...
```

Do not declare a catch-all route as implementing every method merely because the file exists.

---

# 20. Framework Validator Changes

## `src/lib/agents/ruflo/framework-validator.ts`

Existing Stripe and client/server checks are useful.

Add:

### Next entry validation

Respect:

```text
src/app/page.tsx
app/page.tsx
```

from the contract.

### Next route path validation

Reject malformed route segments in generated VFS.

### Server/client classification

Use:

```text
"use client"
```

and Next App Router defaults.

### Stripe

Preserve:

```text
@stripe/stripe-js -> allowed in client
stripe server SDK -> server only
STRIPE_SECRET_KEY -> server only
```

Do not ban all Stripe imports.

---

# 21. Pipeline Wiring Changes

## Blueprinter

Current:

```ts
const specContract = extractProjectContract(specContents);
const specVal = validateProjectContract(specContract);
```

Add immediately after:

```ts
const architectureValidation =
  validateArchitectureArtifact(archContent, specContract);

if (!architectureValidation.valid) {
  ...
  throw new Error(
    `Architecture artifact validation failed: ...`
  );
}
```

Only then:

```ts
const targetFiles = extractFilesFromArchitecture(archContent);
```

## Coder

Obtain the same contract and pass it to blueprint validation.

Do not allow Coder to bypass architecture/runtime contract rules.

---

# 22. Tests To Add

## `src/lib/agents/ruflo/__tests__/spec-contract.test.ts`

### Test A — Next `src/app` entry

Input:

```text
Frontend: Next.js
Frontend Entry Point: src/app/page.tsx
```

Expected:

```ts
contract.entryPoints[0] === 'src/app/page.tsx'
```

### Test B — Next root `app` entry

Expected:

```text
app/page.tsx
```

still supported.

### Test C — Invalid unnamed catch-all

Architecture:

```text
src/app/api/[...]/route.ts
```

Expected:

```text
architectureValidation.valid === false
```

### Test D — Valid catch-all

```text
src/app/api/[...slug]/route.ts
```

Expected:

```text
true
```

### Test E — Duplicate ownership

Same file under two modules.

Expected:

```text
valid === false
```

### Test F — Orphan module file

Module owns file absent from tree.

Expected:

```text
valid === false
```

### Test G — Missing module ownership

Tree file absent from modules.

Expected:

```text
valid === false
```

### Test H — Stripe integration

Architecture:

```text
Additional: Stripe
Backend: Next.js API Routes
```

Expected:

```text
contract.integrations includes 'stripe'
```

and architecture has a valid Stripe implementation location.

### Test I — Next Server Component → Prisma

```text
src/app/page.tsx -> src/lib/prisma.ts
```

Expected:

```text
true
```

when page is not a client component.

### Test J — Next Client Component → Prisma

```text
"use client"
src/app/components/ProductCard.tsx -> src/lib/prisma.ts
```

Expected:

```text
false
```

### Test K — Next Route Handler → Prisma

```text
src/app/api/products/route.ts
    -> src/lib/prisma.ts
```

Expected:

```text
true
```

### Test L — Next client → API

A client component referencing:

```text
/api/products
```

must not fail simply because the corresponding source route is server-side.

### Test M — Stripe client/server split

Client:

```text
@stripe/stripe-js
```

Server:

```text
stripe
STRIPE_SECRET_KEY
```

Expected:

```text
true
```

### Test N — Stripe secret leak

Client containing:

```text
STRIPE_SECRET_KEY
```

Expected:

```text
false
```

---

# 23. Integration Regression Test

Add a full fixture representing the current e-commerce architecture:

```text
src/
├── app/
│   ├── page.tsx
│   ├── api/
│   │   └── [...slug]/
│   │       └── route.ts
│   └── components/
│       ├── ProductCard.tsx
│       ├── SearchBar.tsx
│       └── CartItem.tsx
├── lib/
│   └── prisma.ts
└── styles/
    └── globals.css
```

Contract:

```text
framework = NEXT_APP_ROUTER
entry = src/app/page.tsx
orm = prisma
database = sqlite
authentication.required = false
integration = stripe
```

Expected:

```text
architecture validation: PASS
contract validation: PASS
blueprint graph: PASS
Next API route validation: PASS
Next framework boundary validation: PASS
Stripe boundary validation: PASS
```

Then mutate each invariant independently and verify failure.

---

# 24. Acceptance Criteria

## Architect

- [ ] Never emits `src/app/api/[...]/route.ts`.
- [ ] Supports `src/app/page.tsx`.
- [ ] Does not fabricate `index.html` for Next App Router.
- [ ] Does not duplicate file ownership.
- [ ] Does not produce orphan module files.
- [ ] Represents Stripe as an architecture dependency/location.
- [ ] Gives every requested feature a concrete owning module/file.

## Contract

- [ ] Preserves explicit Next entry point.
- [ ] Extracts Stripe as an integration.
- [ ] Detects architecture ownership contradictions.
- [ ] Detects malformed Next route segments.
- [ ] Does not fabricate `layout.tsx`.

## Blueprint

- [ ] Receives the authoritative ProjectContract.
- [ ] Applies Next runtime semantics.
- [ ] Allows Server Component → Prisma.
- [ ] Allows Route Handler → Prisma.
- [ ] Rejects Client Component → Prisma.
- [ ] Rejects Client Component → Stripe secret/server SDK.
- [ ] Preserves Vite/Static/React-WebPack directional rules.

## API

- [ ] Supports `[slug]`.
- [ ] Supports `[...slug]`.
- [ ] Supports `[[...slug]]`.
- [ ] Rejects `[...]`.
- [ ] Verifies HTTP handler exports.

## Framework

- [ ] Supports `src/app/page.tsx`.
- [ ] Supports `app/page.tsx`.
- [ ] Enforces Next client/server rules.
- [ ] Enforces Stripe secret boundary.

## Pipeline

- [ ] Architecture validation happens before target-file extraction.
- [ ] Blueprinter passes contract into graph validation.
- [ ] Coder passes contract into graph validation.
- [ ] No stage silently falls back from Next semantics to STATIC_HTML because a contract argument was omitted.

---

# 25. Implementation Order

## P0 — Fix correctness blockers

1. Fix Architect prompt's contradictory Next/index.html rules.
2. Add explicit valid Next dynamic-segment rule.
3. Make `extractProjectContract()` preserve `src/app/page.tsx`.
4. Add `validateArchitectureArtifact()`.
5. Wire architecture validation into Blueprinter.
6. Pass `specContract` into all `validateBlueprintGraph()` calls.

## P1 — Correct framework semantics

7. Fix Next Server Component vs Client Component classification.
8. Add malformed dynamic-route validation to API validator.
9. Add integration extraction for Stripe.
10. Validate Stripe implementation coverage.
11. Add Next-specific framework entry validation.

## P2 — Contract quality

12. Add duplicate/orphan ownership regression tests.
13. Add feature-location/coverage validation.
14. Add module dependency consistency checks.
15. Add full e-commerce integration regression fixture.

## P3 — Cleanup

16. Separate architecture parsing from architecture validation.
17. Remove duplicated hardcoded Next entry assumptions.
18. Audit every call site of `validateBlueprintGraph()`.
19. Audit every call site of `extractProjectContract()`.
20. Ensure no framework validator defaults silently override an available contract.

---

# 26. Verification Commands

Run in this order:

```bash
npx tsc --noEmit
```

then:

```bash
npx tsx src/lib/agents/ruflo/__tests__/spec-contract.test.ts
```

then the project's full test command:

```bash
npm test
```

if configured.

Finally run the e-commerce prompt through the actual pipeline and inspect:

```text
architecture.md
blueprint.md
test_report.md
debug_report.md
```

The important verification is not merely:

```text
tests passed
```

It is:

```text
Architect output
    ↓
architecture validator
    ↓
contract
    ↓
blueprint
    ↓
framework/API/security validation
```

all using the same framework-aware contract.

---

# 27. Definition of Done

The fix is complete when the current e-commerce fixture produces an architecture equivalent to:

```text
Next.js App Router
entry: src/app/page.tsx

API:
src/app/api/[...slug]/route.ts

Database:
src/lib/prisma.ts

Stripe:
server-side integration from route/server module

Components:
src/app/components/*
```

and all of the following are true:

```text
src/app/page.tsx -> Prisma
    allowed only when server-side

"use client" -> Prisma
    rejected

API route -> Prisma
    allowed

API route -> Stripe server SDK
    allowed

client -> @stripe/stripe-js
    allowed

client -> Stripe secret
    rejected

[...slug]
    valid

[...]
    rejected

duplicate module ownership
    rejected

orphan module file
    rejected

missing contract propagation
    impossible in Blueprinter/Coder validation paths
```

The architectural contract, rather than an individual generated project, becomes the enforcement boundary.

---

# 28. Final RCA Summary

The e-commerce test did not reveal one bug.

It revealed a **contract authority leak**.

There are currently several places where AutoCoder assumes the Architect will behave correctly:

```text
Architect output
    ↓
extractor guesses
    ↓
validator infers
    ↓
Blueprinter synthesizes
```

That is too trusting.

The corrected model is:

```text
Architect output
    ↓
validate architecture artifact
    ↓
normalize into ProjectContract
    ↓
validate contract
    ↓
propagate same contract
    ↓
framework-aware blueprint validation
    ↓
framework/API/security verification
```

The most important fixes are therefore:

1. **Make the Architect's format internally consistent.**
2. **Validate the Architect artifact before using it as authority.**
3. **Preserve explicit framework paths such as `src/app/page.tsx`.**
4. **Reject malformed Next.js route segments instead of accommodating them.**
5. **Propagate the same ProjectContract into every downstream validator.**
6. **Treat Next.js Server Components as server-side by default, not all `src/**` files as browser code.**
7. **Keep integration/security semantics, especially Stripe, explicit.**

Do not solve these by adding more exceptions to `validateBlueprintGraph()`. The current failures are mostly upstream contract-quality and context-propagation failures, not evidence that the graph validator needs another pile of heuristics.