# AutoCoder — Kanban Architecture/Backend Contract RCA & Exact Fix Plan

**Repository:** `Gautam-Mathur/AutoCoder`  
**Branch:** `main`  
**Scope:** Current AutoCoder contract pipeline + supplied `architecture.md` and `backend_spec.md` for the Kanban Board run.

---

## 1. Executive summary

The Kanban artifacts expose a real contract-pipeline defect:

### `architecture.md`

```text
Frontend: React
Frontend Entry Point: src/pages/index.tsx
Backend: Express
Database: PostgreSQL
Authentication: None — no auth needed
Build Tool: Webpack
React DnD
Prisma ORM
```

### `backend_spec.md`

The backend agent then introduced:

```text
User
Board.userId
Auth Required: Yes   // on every endpoint
AuthMiddleware
```

That is a direct cross-document contradiction.

The repo already has the correct enforcement architecture:

```text
spec artifacts
  -> extractProjectContract()
  -> validateProjectContract()
  -> Blueprinter
  -> validateBlueprintGraph()
  -> Coder
  -> deterministic validators
  -> Quality Gate
```

The problem is that `extractProjectContract()` currently loses enough information that the contradiction can disappear before validation.

The fix is **not** another validator. The fix is to make the existing canonical contract evidence-backed and contradiction-aware.

---

# 2. Current repo state verified

The current `main` branch already contains several fixes that should be preserved.

## 2.1 Existing canonical contract layer

```text
src/lib/agents/ruflo/contracts.ts
src/lib/agents/ruflo/spec-contract.ts
```

`contracts.ts` owns the canonical `ProjectContract` type.

`spec-contract.ts` owns extraction and validation.

Keep this division.

## 2.2 Existing Blueprinter contract gate

`src/lib/agents/ruflo/orchestrator.ts`, around **lines 1610–1615**:

```ts
const specContract = extractProjectContract(specContents);
const specVal = validateProjectContract(specContract);
for (const warn of specVal.warnings) {
  emit({ type: 'AGENT_LOG', agent: 'Blueprinter', message: `⚠️ Spec Contract Warning: ${warn}` });
}
```

The following block throws when `specVal.valid === false`.

This is the correct enforcement point.

## 2.3 Blueprint graph already hard-stops

`src/lib/agents/ruflo/orchestrator.ts`, around **line 1708**:

```ts
const bpVal = validateBlueprintGraph(finalSections);
```

The existing code throws when the graph is invalid.

Do not create `validateBlueprintGraphV2` or another blueprint validator.

## 2.4 Quality Gate already hard-stops

`src/lib/agents/ruflo/orchestrator.ts`, around **line 1800**:

```ts
const qGate = evaluateQualityGate({
  specValidation: specVal,
  blueprintValidation: blueprintVal,
  projectValidation: projVal,
  packageValidation: packageVal,
  prismaValidation: prismaVal,
  apiValidation: apiVal,
  frameworkValidation: frameworkVal,
  runtimeValidation: runtimeVal,
  securityValidation: securityVal,
});
```

Around **line 1825**:

```ts
if (!qGate.passed) {
  emit({
    type: 'PIPELINE_ERROR',
    message: `Pipeline Quality Gate failed with status ${qGate.status}: ${qGate.blockingReasons.join('; ')}`,
  });
  throw new Error(`Pipeline Quality Gate failed (${qGate.status}): ${qGate.blockingReasons.join('; ')}`);
}
```

Only after this does the pipeline reach preview/completion around lines 1885 onward.

Therefore the old Quality Gate bypass is already fixed in current `main`. Preserve it.

---

# 3. Root cause #1: authentication extraction is lossy

## Exact location

```text
src/lib/agents/ruflo/spec-contract.ts
```

Current code around **lines 63–68**:

```ts
const planNoAuth = /auth:\s*none|no auth|authentication:\s*none/i.test(plan) || /without auth/i.test(plan);
const backendHasAuth = /auth\s*required|authentication\s*required|auth:\s*true/i.test(backend) || /bearer|jwt|session/i.test(backend);
const authRequired = !planNoAuth && (backendHasAuth || /auth:\s*required|authentication:\s*required/i.test(combined));

const mechanismMatch = combined.match(/auth\s*mechanism:\s*(.+)/i) || combined.match(/authentication:\s*(jwt|session|next-auth|clerk|oauth)/i);
```

## Why it fails

The code only checks `plan` for explicit no-auth evidence:

```ts
planNoAuth = ... test(plan)
```

It does **not** check `architecture.md` even though `arch` is already extracted at the top of the function.

Therefore the Kanban case can become:

```text
architecture.md:
  Authentication: None

backend_spec.md:
  Auth Required: Yes

extractor:
  planNoAuth = false
  backendHasAuth = true
  authRequired = true
```

The contradiction has been converted into a single boolean before the validator sees it.

That is the primary RCA.

---

# 4. Root cause #2: `ProjectContract` does not preserve provenance

## Exact location

```text
src/lib/agents/ruflo/contracts.ts
```

Current contract section around **lines 21–48**:

```ts
export interface ProjectContract {
  ...
  framework: 'NEXT_APP_ROUTER' | 'NEXT_PAGES_ROUTER' | 'VITE_SPA' | 'STATIC_HTML';
  language: 'typescript' | 'javascript';
  orm: 'prisma' | 'none';
  database: 'sqlite' | 'postgresql' | 'none';
  authentication: {
    required: boolean;
    mechanism?: string;
  };
  ...
}
```

After extraction, the validator sees only:

```ts
authentication.required = true
```

It cannot know whether this came from:

```text
architecture.md = none
backend_spec.md = required
```

or from a coherent set of documents.

## Required fix

Add evidence:

```ts
export interface ContractEvidence {
  source: string;
  field: string;
  value: string;
  excerpt?: string;
}
```

Then change authentication to:

```ts
authentication: {
  required: boolean;
  mechanism?: string;
  evidence?: ContractEvidence[];
};
```

This is the minimum information needed for deterministic cross-document contradiction detection.

---

# 5. Root cause #3: framework contract cannot represent React + Webpack

## Exact location

```text
src/lib/agents/ruflo/contracts.ts:32
```

Current:

```ts
framework: 'NEXT_APP_ROUTER' | 'NEXT_PAGES_ROUTER' | 'VITE_SPA' | 'STATIC_HTML';
```

But the architecture explicitly says:

```text
Frontend: React
Build Tool: Webpack
```

The extractor only detects Next.js and Vite. Otherwise it falls back to:

```ts
STATIC_HTML
```

That means a legitimate React/Webpack project can be represented internally as a static HTML project.

## Fix

Add:

```ts
'REACT_WEBPACK_SPA'
```

Then in `spec-contract.ts` add detection after Next/Vite detection:

```ts
} else if (
  /react/i.test(combined) &&
  /webpack/i.test(combined)
) {
  framework = 'REACT_WEBPACK_SPA';
}
```

Do not classify generic React as Webpack unless Webpack is actually declared.

---

# 6. Root cause #4: React/Webpack entry point is derived incorrectly

## Exact location

```text
src/lib/agents/ruflo/spec-contract.ts
```

Current logic:

```ts
if (framework === 'NEXT_APP_ROUTER') {
  entryPoints.push('app/page.tsx', 'app/layout.tsx');
} else if (framework === 'NEXT_PAGES_ROUTER') {
  entryPoints.push('pages/index.tsx', 'pages/_app.tsx');
} else {
  entryPoints.push('index.html');
}
```

For the Kanban architecture this can turn:

```text
Frontend Entry Point: src/pages/index.tsx
```

into:

```text
index.html
```

## Fix

For React/Webpack, preserve the explicit architecture entry point:

```ts
if (framework === 'REACT_WEBPACK_SPA') {
  const explicitEntry = arch.match(
    /Frontend Entry Point:\s*([^\n]+)/i
  )?.[1]?.trim();

  entryPoints.push(explicitEntry || 'src/index.tsx');
}
```

Do not silently replace an explicitly declared entry point.

---

# 7. Root cause #5: Prisma can incorrectly imply SQLite

## Exact location

```text
src/lib/agents/ruflo/spec-contract.ts
```

Current database detection includes:

```ts
} else if (
  /provider\s*=\s*"sqlite"/i.test(prismaSchema) ||
  /sqlite/i.test(combined) ||
  hasPrisma
) {
  database = 'sqlite';
}
```

The final condition:

```ts
hasPrisma
```

means:

```text
Prisma present
+ no database explicitly stated
= SQLite
```

That is an invented fact.

## Fix

Remove `|| hasPrisma`:

```ts
} else if (
  /provider\s*=\s*"sqlite"/i.test(prismaSchema) ||
  /\bsqlite\b/i.test(combined)
) {
  database = 'sqlite';
}
```

Prisma is an ORM/client layer, not a database engine.

---

# 8. Root cause #6: endpoint parsing is too lossy

## Exact location

```text
src/lib/agents/ruflo/spec-contract.ts:72
```

Current:

```ts
const endpointRegex = /(GET|POST|PUT|DELETE|PATCH)\s+([\/\w\-:\.\{\}]+)(?:\s+-\s+([^\n]+))?/gi;
```

The parser mainly discovers:

```text
METHOD + PATH
```

and then does:

```ts
const isAuth = /auth|protected|private/i.test(notes) || authRequired;
```

This means endpoint auth is heavily coupled to global authentication state.

The backend artifact, however, contains structured endpoint fields such as:

```text
Request Body
Query Params
Response
Auth Required
Supports Feature
```

## Fix

Expand `ApiEndpointContract` in `contracts.ts`:

```ts
export interface ApiEndpointContract {
  method: string;
  path: string;
  authRequired: boolean;
  requestBody?: string;
  response?: string;
  source?: string;
}
```

Then parse the generated backend format deterministically.

Do not use the global `authentication.required` value to overwrite endpoint-specific declarations.

---

# 9. Root cause #7: backend implementation ownership is absent from the canonical contract

The architecture says:

```text
Backend: Express
```

but lists:

```text
src/services/apiClient.ts
src/types/index.ts
```

as backend-owned files.

`apiClient.ts` is a frontend/client abstraction, not an Express server entry point.

The canonical `ProjectContract` currently has no concept of:

```text
backend entry point
backend owned files
frontend owned files
shared files
```

Therefore the contract validator cannot mechanically detect the topology error.

## Fix

Add to `contracts.ts`:

```ts
export interface ImplementationBoundary {
  id: string;
  kind: 'frontend' | 'backend' | 'database' | 'shared' | 'config';
  ownedFiles: string[];
  entryPoint?: string;
  runtime?: string;
}
```

Add to `ProjectContract`:

```ts
implementationBoundaries?: ImplementationBoundary[];
```

Then the architecture parser should extract module ownership from:

```text
### Modules
**Frontend Application**
...
- Owned Files: ...

**Backend API Service**
...
- Owned Files: ...

**Database Module**
...
- Owned Files: ...
```

---

# 10. Backend topology validation

Inside `validateProjectContract()` in:

```text
src/lib/agents/ruflo/spec-contract.ts
```

Add a check such as:

```ts
const backendBoundary = contract.implementationBoundaries?.find(
  b => b.kind === 'backend'
);

if (
  backendBoundary?.runtime === 'express' &&
  !backendBoundary.entryPoint &&
  backendBoundary.ownedFiles.length === 0
) {
  errors.push(
    'Architecture declares an Express backend but provides no backend implementation files or entry point.'
  );
}
```

Also reject the specific anti-pattern where a backend boundary only owns a frontend API client:

```ts
function looksLikeClientFile(file: string): boolean {
  return /(^|\/)(apiClient|client|httpClient)\.(ts|tsx|js|jsx)$/i.test(file);
}

if (
  backendBoundary &&
  backendBoundary.ownedFiles.some(looksLikeClientFile) &&
  !backendBoundary.entryPoint
) {
  errors.push(
    'Backend boundary appears to own a frontend API client without declaring an actual server entry point.'
  );
}
```

Keep this heuristic narrow. This is contract validation, not a universal source-code classifier.

---

# 11. Authentication contradiction: exact implementation

## File

```text
src/lib/agents/ruflo/spec-contract.ts
```

Add helpers near the top:

```ts
function detectExplicitNoAuth(text: string): boolean {
  return [
    /authentication\s*:\s*none\b/i,
    /auth\s*:\s*none\b/i,
    /authentication\s*required\s*:\s*no\b/i,
    /auth\s*required\s*:\s*no\b/i,
    /\bno\s+auth(?:entication)?\b/i,
    /\bwithout\s+auth(?:entication)?\b/i,
  ].some(pattern => pattern.test(text));
}

function detectExplicitAuthRequired(text: string): boolean {
  return [
    /authentication\s*:\s*(yes|required|enabled)\b/i,
    /auth\s*required\s*:\s*yes\b/i,
    /authentication\s+required\b/i,
    /authmiddleware\b/i,
    /\bbearer\b/i,
    /\bjwt\b/i,
    /\bsession\b/i,
  ].some(pattern => pattern.test(text));
}
```

Then, instead of only checking `plan`, collect evidence from each artifact:

```ts
const planNoAuth = detectExplicitNoAuth(plan);
const requirementsNoAuth = detectExplicitNoAuth(reqs);
const architectureNoAuth = detectExplicitNoAuth(arch);

const architectureAuth = detectExplicitAuthRequired(arch);
const requirementsAuth = detectExplicitAuthRequired(reqs);
const backendAuth = detectExplicitAuthRequired(backend);

const authenticationEvidence: ContractEvidence[] = [];

if (planNoAuth) {
  authenticationEvidence.push({
    source: 'plan.md',
    field: 'authentication',
    value: 'none',
  });
}

if (requirementsNoAuth) {
  authenticationEvidence.push({
    source: 'requirements.md',
    field: 'authentication',
    value: 'none',
  });
}

if (architectureNoAuth) {
  authenticationEvidence.push({
    source: 'architecture.md',
    field: 'authentication',
    value: 'none',
  });
}

if (architectureAuth) {
  authenticationEvidence.push({
    source: 'architecture.md',
    field: 'authentication',
    value: 'required',
  });
}

if (requirementsAuth) {
  authenticationEvidence.push({
    source: 'requirements.md',
    field: 'authentication',
    value: 'required',
  });
}

if (backendAuth) {
  authenticationEvidence.push({
    source: 'backend_spec.md',
    field: 'authentication',
    value: 'required',
  });
}

const hasExplicitNoAuth = authenticationEvidence.some(
  e => e.field === 'authentication' && e.value === 'none'
);

const hasExplicitAuth = authenticationEvidence.some(
  e => e.field === 'authentication' && e.value === 'required'
);

const authRequired = hasExplicitAuth && !hasExplicitNoAuth;
```

The important point is not the exact helper naming. The important point is: **do not collapse conflicting evidence before validation.**

---

# 12. Authentication contradiction validation

Inside:

```ts
export function validateProjectContract(contract: ProjectContract)
```

add:

```ts
const authEvidence = contract.authentication.evidence || [];

const noAuthEvidence = authEvidence.filter(
  e => e.field === 'authentication' && e.value === 'none'
);

const requiredAuthEvidence = authEvidence.filter(
  e => e.field === 'authentication' && e.value === 'required'
);

if (noAuthEvidence.length > 0 && requiredAuthEvidence.length > 0) {
  errors.push(
    [
      'Authentication contradiction across specification artifacts.',
      `No-auth evidence: ${noAuthEvidence
        .map(e => `${e.source}=${e.value}`)
        .join(', ')}`,
      `Auth-required evidence: ${requiredAuthEvidence
        .map(e => `${e.source}=${e.value}`)
        .join(', ')}`,
    ].join(' ')
  );
}
```

Expected result for the supplied Kanban artifacts:

```text
valid = false

Authentication contradiction across specification artifacts.
No-auth evidence: architecture.md=none
Auth-required evidence: backend_spec.md=required
```

That error must occur before Blueprinter execution.

---

# 13. Architecture agent fix

Find the existing Architect agent under:

```text
src/lib/agents/ruflo/
```

Search for the existing architecture prompt/definition rather than creating a new agent.

Make the output contract explicit:

```text
### Tech Stack
- Frontend:
- Frontend Entry Point:
- Backend:
- Backend Entry Point:
- Database:
- ORM:
- Authentication:
- Build Tool:
```

For modules require:

```text
### Modules

Each module must specify:
- Responsibility
- Owned Files
- Entry Point, if executable
- Depends On
```

This makes deterministic extraction possible and prevents downstream agents from guessing topology.

---

# 14. System/backend agent fix

Find the existing System/backend agent definition by searching for:

```text
backend_spec.md
```

Add these rules:

```text
CONTRACT PRESERVATION RULES

1. Never introduce authentication when upstream specifications explicitly state that authentication is not required.
2. Never introduce User entities solely to support authentication or ownership unless upstream requirements require users/accounts/ownership.
3. If architecture says Authentication: None, endpoint Auth Required must default to No.
4. If upstream documents contradict one another, report the contradiction instead of silently choosing a side.
5. If architecture declares Express, define a concrete server entry point and server-owned implementation files.
6. Do not classify frontend apiClient.ts as the Express backend implementation.
7. Preserve the upstream framework, database, ORM, authentication, routing, and entry-point decisions.
```

This is important because deterministic validation is the last line of defense, not permission for agents to keep making the same bad decision.

---

# 15. Kanban API contract issue

The backend agent's CRUD list is mostly reasonable, but it does not clearly model the core Kanban operation:

```text
move/reorder card
```

The card update body should support at minimum:

```json
{
  "title": "Design Homepage",
  "description": "Create wireframes",
  "columnId": "col2",
  "position": 1,
  "labels": ["design", "ui"]
}
```

or a dedicated operation:

```text
PATCH /api/cards/:id/move
```

with:

```json
{
  "columnId": "col2",
  "position": 1
}
```

The contract should express the capability, not necessarily mandate one endpoint name.

The important invariant is:

```text
Drag/drop
  -> columnId changes
  -> position changes
  -> persistence occurs
```

The same principle applies to column reordering.

---

# 16. Kanban database contract

If requirements do not explicitly require multi-user accounts, the backend should not invent a `User` model merely because authentication is a common application feature.

Minimal MVP model:

```text
Board
  id
  title

Column
  id
  title
  boardId
  position

Card
  id
  title
  description
  columnId
  position
  labels
```

A normalized `Label`/`CardLabel` relation should only be introduced if requirements need reusable label metadata, colors, filtering, label CRUD, etc.

The current `labels: string[]` is acceptable for a simple MVP.

---

# 17. Framework validator update

## File

```text
src/lib/agents/ruflo/framework-validator.ts
```

Add support for:

```ts
REACT_WEBPACK_SPA
```

Expected deterministic checks:

```text
webpack.config.js exists
React entry point exists
React/ReactDOM usage is coherent
No Next-only routing assumptions
```

Do not make React/Webpack pass through Next.js rules.

---

# 18. Runtime validator update

## File

```text
src/lib/agents/ruflo/runtime-validator.ts
```

This validator is currently primarily structural. Do not turn this fix into a runtime-execution rewrite.

Make it consume the canonical:

```ts
contract.framework
contract.entryPoints
contract.apiEndpoints
```

instead of assuming Next/static conventions.

Long term, actual server startup/HTTP testing should live in an isolated execution worker. Do not synthesize successful HTTP results and treat them as proof of runtime correctness.

---

# 19. Quality Gate: preserve current design

## File

```text
src/lib/agents/ruflo/quality-gate.ts
```

Current implementation already treats missing mandatory checks as blocking and aggregates:

```text
spec
blueprint
project
packages
prisma
API
framework
runtime
security
```

Do not introduce another quality gate.

One possible future cleanup is to model `NOT_RUN` explicitly instead of using optional inputs, but that is separate from this RCA.

The Kanban fix should feed better `specValidation` into the existing gate.

---

# 20. Regression tests

Add tests following the repo's existing test convention, preferably:

```text
src/lib/agents/ruflo/__tests__/spec-contract.test.ts
```

Do not introduce a new test framework if the repo already has one.

## Test A — exact Kanban contradiction

```ts
const contract = extractProjectContract({
  'plan.md': '',
  'requirements.md': '',
  'architecture.md': `
### Tech Stack
- Frontend: React
- Frontend Entry Point: src/pages/index.tsx
- Backend: Express
- Database: PostgreSQL
- Authentication: None — no auth needed
- Build Tool: Webpack
`,
  'backend_spec.md': `
### API Endpoints
GET /api/boards
- Auth Required: Yes

### Middleware
**AuthMiddleware**
- Purpose: Authenticates requests
`,
  'ui_spec.md': ''
});

const result = validateProjectContract(contract);

expect(result.valid).toBe(false);
expect(
  result.errors.some(e =>
    e.toLowerCase().includes('authentication contradiction')
  )
).toBe(true);
```

## Test B — coherent no-auth

```ts
const contract = extractProjectContract({
  'plan.md': '',
  'requirements.md': '',
  'architecture.md': 'Authentication: None',
  'backend_spec.md': 'GET /api/boards\n- Auth Required: No',
  'ui_spec.md': ''
});

expect(validateProjectContract(contract).valid).toBe(true);
expect(contract.authentication.required).toBe(false);
```

## Test C — coherent auth

```ts
const contract = extractProjectContract({
  'architecture.md': 'Authentication: JWT',
  'backend_spec.md': 'Auth Required: Yes',
  'plan.md': '',
  'requirements.md': '',
  'ui_spec.md': ''
});

expect(contract.authentication.required).toBe(true);
```

## Test D — React/Webpack

```ts
const contract = extractProjectContract({
  'architecture.md': `
Frontend: React
Build Tool: Webpack
Frontend Entry Point: src/pages/index.tsx
`,
  'plan.md': '',
  'requirements.md': '',
  'backend_spec.md': '',
  'ui_spec.md': ''
});

expect(contract.framework).toBe('REACT_WEBPACK_SPA');
expect(contract.entryPoints).toContain('src/pages/index.tsx');
```

## Test E — Prisma does not imply SQLite

```ts
const contract = extractProjectContract({
  'architecture.md': 'ORM: Prisma',
  'plan.md': '',
  'requirements.md': '',
  'backend_spec.md': '',
  'ui_spec.md': ''
});

expect(contract.database).toBe('none');
```

## Test F — PostgreSQL stays PostgreSQL

```ts
const contract = extractProjectContract({
  'architecture.md': 'Database: PostgreSQL\nORM: Prisma',
  'plan.md': '',
  'requirements.md': '',
  'backend_spec.md': '',
  'ui_spec.md': ''
});

expect(contract.database).toBe('postgresql');
```

## Test G — Express topology

Architecture fixture:

```text
### Tech Stack
- Backend: Express

### Modules
**Backend API Service**
- Responsibility: REST API
- Owned Files: None
```

Expected:

```ts
expect(validateProjectContract(contract).valid).toBe(false);
```

---

# 21. Optional end-to-end fixture

Create a regression fixture representing the exact failure:

```text
fixtures/contracts/kanban-conflict/
  plan.md
  requirements.md
  architecture.md
  backend_spec.md
  ui_spec.md
```

Expected result:

```text
contract.valid = false

errors include:
  authentication contradiction
  backend topology contradiction
```

This fixture should be run whenever the specification pipeline changes.

---

# 22. Contract hash

`spec-contract.ts` already calculates a SHA-256 `contractHash`.

After adding evidence/topology, hash only normalized semantic fields, not volatile prose excerpts.

Prefer:

```ts
const hashableContract = {
  framework,
  language,
  orm,
  database,
  authentication: {
    required: authRequired,
    mechanism,
  },
  routing,
  entryPoints,
  apiEndpoints,
  models,
  dependencies,
  implementationBoundaries,
};
```

Then:

```ts
const canonicalJson = JSON.stringify(hashableContract);
const contractHash = crypto
  .createHash('sha256')
  .update(canonicalJson)
  .digest('hex');
```

The rule is:

```text
same semantic contract -> same hash
different auth/framework/backend topology -> different hash
```

---

# 23. Exact implementation order

Do this in order to avoid half-fixing the pipeline.

## Step 1 — `contracts.ts`

Add:

```text
REACT_WEBPACK_SPA
ContractEvidence
ImplementationBoundary
```

Extend `ApiEndpointContract` if required.

## Step 2 — `spec-contract.ts`

Fix:

```text
auth extraction
framework detection
entry-point detection
database inference
endpoint parsing
```

## Step 3 — `spec-contract.ts`

Add blocking validation for:

```text
auth contradiction
backend topology contradiction
endpoint/global auth contradiction
```

## Step 4 — regression tests

Run the Kanban fixture plus framework/database/auth fixtures.

## Step 5 — Architect prompt

Require deterministic contract-critical fields.

## Step 6 — System prompt

Prevent invention of authentication, users, ownership, and server topology.

## Step 7 — `framework-validator.ts`

Add React/Webpack handling.

## Step 8 — `runtime-validator.ts`

Consume canonical React/Webpack entry points where required.

## Step 9 — full pipeline test

Expected:

```text
Queen
  -> Planner
  -> Architect
  -> System
  -> Designer
  -> contract extraction
  -> contract validation
       X if contradictory
  -> Blueprinter only if valid
```

---

# 24. Files to modify

## Required

```text
src/lib/agents/ruflo/contracts.ts
src/lib/agents/ruflo/spec-contract.ts
```

## Likely required

```text
src/lib/agents/ruflo/framework-validator.ts
src/lib/agents/ruflo/runtime-validator.ts
```

## Agent prompts

Modify the existing Architect and System agent definitions under:

```text
src/lib/agents/ruflo/
```

Search for the existing `backend_spec.md` and architecture prompt text.

## Tests

Use the existing test convention; suggested location:

```text
src/lib/agents/ruflo/__tests__/spec-contract.test.ts
```

---

# 25. Files/subsystems NOT to create

Do **not** create parallel infrastructure such as:

```text
contracts-v2.ts
spec-contract-v2.ts
quality-gate-v2.ts
contract-validator.ts
backend-validator.ts
path-resolver-v2.ts
```

The repo already has the required layers.

Keep the architecture:

```text
contracts.ts
  = canonical types

spec-contract.ts
  = extraction + normalization + validation

orchestrator.ts
  = pipeline enforcement

quality-gate.ts
  = aggregate verification decision
```

---

# 26. Acceptance criteria

## Authentication

Given:

```text
architecture.md:
Authentication: None

backend_spec.md:
Auth Required: Yes
```

result must be:

```text
valid = false
```

with a blocking contradiction.

## No-auth project

Given:

```text
architecture.md: Authentication: None
backend_spec.md: Auth Required: No
```

result:

```text
authentication.required = false
valid = true
```

assuming no other contradiction.

## React/Webpack

Given:

```text
Frontend: React
Build Tool: Webpack
Frontend Entry Point: src/pages/index.tsx
```

result:

```ts
framework === 'REACT_WEBPACK_SPA'
entryPoints.includes('src/pages/index.tsx')
```

Never `STATIC_HTML`.

## Prisma

Given:

```text
ORM: Prisma
```

without database evidence:

```text
database !== 'sqlite'
```

## Express

Given:

```text
Backend: Express
```

there must be a server entry point or concrete backend-owned files.

## Blueprint

A spec contradiction must prevent valid downstream blueprint generation.

## Completion

A failed spec contract or Quality Gate must never reach:

```ts
launchVSCodePreview(...)
```

or:

```ts
status: 'Completed'
```

The current `main` already provides these downstream hard stops. Preserve them.

---

# 27. Regression matrix

| Scenario | Expected result |
|---|---|
| Architecture says no auth, backend says auth | BLOCK |
| Architecture says no auth, backend says no auth | PASS |
| Architecture says JWT, backend says auth | PASS |
| Prisma + PostgreSQL | PostgreSQL |
| Prisma only | Unresolved/none, never SQLite |
| React + Webpack | `REACT_WEBPACK_SPA` |
| Express + server entry | Valid backend topology |
| Express + frontend `apiClient.ts` only | BLOCK |
| Kanban drag/drop with no move persistence | BLOCK/WARN according to product contract |
| Invalid blueprint graph | BLOCK |
| Failed Quality Gate | BLOCK |

---

# 28. Target pipeline

```text
                         USER REQUEST
                              |
                              v
                     Queen / Planner
                              |
                              v
                          Architect
                              |
                              v
                      architecture.md
                              |
                              v
                           System
                              |
                              v
                      backend_spec.md
                              |
                              v
                +---------------------------+
                | extractProjectContract()  |
                |                           |
                | framework                 |
                | database                  |
                | ORM                       |
                | auth                      |
                | endpoints                 |
                | models                    |
                | entry points              |
                | topology                  |
                | provenance                |
                +---------------------------+
                              |
                              v
                +---------------------------+
                | validateProjectContract() |
                |                           |
                | cross-doc consistency     |
                | no invented infra         |
                | auth consistency          |
                | topology consistency      |
                +---------------------------+
                              |
                         PASS / FAIL
                          /        \
                       FAIL        PASS
                        |             |
                        X             v
                               Blueprinter
                                    |
                                    v
                              blueprint.md
                                    |
                                    v
                          validateBlueprintGraph()
                                    |
                               PASS / FAIL
                                    |
                                    v
                                  Coder
                                    |
                                    v
                         deterministic validators
                                    |
                                    v
                              Quality Gate
                                    |
                               PASS / FAIL
                                    |
                                    v
                               Completed
```

---

# 29. Final RCA

## Primary root cause

**`extractProjectContract()` is lossy and source-biased.** It resolves conflicting specification evidence into a single inferred value before validation can inspect the conflict.

## Secondary root causes

1. Explicit no-auth detection only checks `plan.md`.
2. Architecture evidence is not preserved.
3. Endpoint auth is inferred too globally.
4. React + Webpack is not represented in the framework enum.
5. React/Webpack entry points are therefore mis-derived.
6. Prisma presence can imply SQLite without database evidence.
7. Backend implementation topology is absent from the canonical contract.
8. Architect output does not make all contract-critical fields deterministic enough.
9. System/backend output is free to invent authentication and user ownership.

## Existing infrastructure to retain

```text
contracts.ts
spec-contract.ts
orchestrator.ts
validateBlueprintGraph()
quality-gate.ts
dependency-validator.ts
api-contract-validator.ts
framework-validator.ts
runtime-validator.ts
```

The solution is to make the **existing canonical contract authoritative, evidence-backed, and contradiction-aware**.

---

# 30. Definition of done

- [ ] Explicit `architecture.md` no-auth is recognized.
- [ ] Backend `Auth Required: Yes` is recognized.
- [ ] The two produce a blocking spec contradiction.
- [ ] Blueprinter does not execute after the contradiction.
- [ ] React + Webpack becomes `REACT_WEBPACK_SPA`.
- [ ] `src/pages/index.tsx` survives as the entry point.
- [ ] Prisma no longer implies SQLite.
- [ ] Express requires a concrete backend boundary.
- [ ] `apiClient.ts` is not accepted as the Express server.
- [ ] Endpoint auth is preserved per endpoint.
- [ ] Kanban card movement semantics are represented.
- [ ] Regression tests cover the exact discovered failure.
- [ ] Existing blueprint hard-stop remains intact.
- [ ] Existing Quality Gate hard-stop remains intact.
- [ ] No duplicate validator subsystem is introduced.
- [ ] No legacy parallel contract model is introduced.
- [ ] Contract hash reflects normalized semantic state.
- [ ] Architect prompt emits deterministic contract fields.
- [ ] System prompt preserves upstream decisions instead of inventing infrastructure.

---

# 31. Anti-gravity execution checklist

```text
1. Edit src/lib/agents/ruflo/contracts.ts
   - Add REACT_WEBPACK_SPA
   - Add ContractEvidence
   - Add ImplementationBoundary
   - Extend ApiEndpointContract if needed

2. Edit src/lib/agents/ruflo/spec-contract.ts
   - Fix auth extraction
   - Preserve auth evidence by source
   - Detect architecture/backend auth contradiction
   - Parse endpoint-level auth
   - Detect React + Webpack
   - Preserve explicit frontend entry point
   - Remove Prisma => SQLite inference
   - Extract/validate backend topology
   - Keep ProjectContract as the canonical model

3. Add regression tests
   - exact Kanban contradiction
   - no-auth pass
   - auth-required pass
   - React/Webpack
   - Prisma-only
   - Express topology

4. Update existing Architect prompt
   - backend entry point
   - authentication
   - database
   - ORM
   - owned files

5. Update existing System prompt
   - never invent auth
   - never invent User for auth
   - never call apiClient.ts the backend
   - report upstream contradictions

6. Update framework-validator.ts
   - support REACT_WEBPACK_SPA

7. Update runtime-validator.ts only where required

8. Run contract tests

9. Run full Kanban generation

10. Confirm:
      contradiction
        -> spec validation BLOCK
        -> no blueprint continuation
        -> no coder continuation
        -> no completion
```

## Final architectural rule

> **Agents should not resolve contradictions between specification artifacts. Deterministic infrastructure should detect and block them.**

If one agent says:

```text
Authentication = None
```

and another says:

```text
Authentication = Required
```

AutoCoder should not decide which agent is "probably right".

It should emit:

```text
CONTRACT_CONTRADICTION
BLOCK
REPAIR REQUIRED
```

That same invariant should eventually apply to framework, database, ORM, routing, API behavior, backend ownership, authentication, entry points, and module dependencies.
