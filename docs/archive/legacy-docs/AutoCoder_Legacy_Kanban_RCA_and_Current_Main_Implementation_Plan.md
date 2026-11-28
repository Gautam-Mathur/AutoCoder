# AutoCoder: Legacy Kanban Failure RCA + Current-main Implementation Plan

**Repository:** `Gautam-Mathur/AutoCoder`  
**Audited branch:** `main`  
**Latest commit:** `9278693ebe7fd6d3baf0462d602221c3d9f425ec`  
**Latest commit message:** `fix(contracts): implement evidence-backed auth contradiction detection, REACT_WEBPACK_SPA framework support, Express backend topology checks, and regression tests...`

> **Scope:** The supplied `index.html`, architecture/backend output, and tester output are from an older run, before the latest Architect/System changes were tested. They are treated as a regression fixture. This document audits the current repository to determine which failures are already fixed and which remain.

---

## 1. Executive conclusion

The historical run failed at **three different layers**:

1. **Contract/specification layer**
   - Architecture said `Authentication: None`.
   - Backend said `Auth Required: Yes` and added `AuthMiddleware`/`User`.
   - Old extraction logic could collapse this contradiction into one boolean.
   - Current `main` now preserves authentication evidence and blocks this contradiction before Blueprinter.

2. **Architecture/runtime topology layer**
   - Architecture declared `React + Webpack + Express`.
   - It nevertheless treated `apiClient.ts` and `types/index.ts` as backend files and declared no real Express server entry.
   - Current `main` added implementation boundaries and a topology validator, but the exact old shape can still evade the heuristic because `types/index.ts` prevents the "only client files" test from firing.

3. **Generated-project layer**
   - `index.html` directly loads `.tsx` and `.ts` source modules.
   - Components are treated as browser scripts instead of Webpack modules.
   - Scripts are duplicated.
   - React hooks are used without imports.
   - React import style conflicts with compiler configuration.
   - Current runtime validation still hard-codes entrypoint assumptions and does not fully understand React/Webpack.
   - Current project validation hard-codes compiler options instead of making generated `tsconfig.json` authoritative.

### Core RCA

The old AutoCoder pipeline treated:

```text
specification
file topology
runtime entrypoints
compiler configuration
```

as loosely related descriptions.

They need to be treated as **one executable contract**.

---

# 2. Historical failure chain

```text
User request
  ↓
Architect
  ↓
architecture.md
  ├─ React
  ├─ Webpack
  ├─ Express
  ├─ PostgreSQL
  └─ Authentication: None
  ↓
System/backend agent
  ↓
backend_spec.md
  ├─ User
  ├─ Auth Required: Yes
  └─ AuthMiddleware
  ↓
old contract extractor
  ↓
contradiction partially lost
  ↓
Blueprint/Coder
  ↓
invalid React/Webpack boot model
  ↓
Tester
  ↓
27+ TS errors + HTML errors
  ↓
Debugger
  ↓
partial repairs
  ↓
post-debugger verification still fails
```

The desired pipeline is:

```text
spec artifacts
  ↓
canonical ProjectContract
  ↓
cross-document validation
  ↓
BLOCK if contradictory
  ↓
blueprint graph
  ↓
coder
  ↓
project-aware deterministic verification
  ↓
framework-aware verification
  ↓
API/runtime/security verification
  ↓
Quality Gate
```

---

# 3. Historical failure #1: authentication contradiction

Architecture:

```text
Authentication: None — no auth needed
```

Backend:

```text
Auth Required: Yes
AuthMiddleware
User
Board.userId
```

This is a direct contradiction.

## Old root cause

The old extractor effectively did:

```ts
const planNoAuth = /auth:\s*none|no auth|authentication:\s*none/i.test(plan);
const backendHasAuth =
  /auth\s*required|authentication\s*required/i.test(backend);

const authRequired =
  !planNoAuth && backendHasAuth;
```

The important defect was that explicit no-auth evidence from `architecture.md` was not preserved.

The contradiction became:

```text
authRequired = true
```

instead of:

```text
architecture = NONE
backend = REQUIRED
```

## Current-main status: FIXED

`contracts.ts` now has:

```ts
export interface ContractEvidence {
  source: string;
  field: string;
  value: string;
  excerpt?: string;
}
```

and:

```ts
authentication: {
  required: boolean;
  mechanism?: string;
  evidence?: ContractEvidence[];
};
```

`spec-contract.ts` now scans:

```text
plan.md
requirements.md
architecture.md
backend_spec.md
ui_spec.md
```

and stores evidence.

`validateProjectContract()` now rejects:

```text
No-auth evidence + auth-required evidence
```

The new regression test explicitly checks the historical contradiction.

### Verdict

**Fixed in current main.**

This is now a pre-Blueprinter hard stop.

---

# 4. Historical failure #2: React + Webpack was not a representable framework

The architecture said:

```text
Frontend: React
Build Tool: Webpack
Frontend Entry Point: src/pages/index.tsx
```

The old framework enum did not contain React/Webpack:

```ts
'NEXT_APP_ROUTER' |
'NEXT_PAGES_ROUTER' |
'VITE_SPA' |
'STATIC_HTML'
```

So a React/Webpack project could become:

```text
STATIC_HTML
```

internally.

## Current-main status: FIXED at contract level

Current enum contains:

```ts
'REACT_WEBPACK_SPA'
```

and extraction recognizes:

```ts
} else if (
  /react/i.test(combined) &&
  /webpack/i.test(combined)
) {
  framework = 'REACT_WEBPACK_SPA';
}
```

The entrypoint is preserved:

```ts
const explicitEntry = arch
  .match(/Frontend Entry Point:\s*([^\n]+)/i)
  ?. [1]
  ?.trim();

entryPoints.push(explicitEntry || 'src/pages/index.tsx');
```

### Verdict

**Fixed at contract representation level.**

It is **not yet fully fixed at runtime/framework-validation level**.

---

# 5. Historical failure #3: Prisma was incorrectly capable of implying SQLite

Old logic contained:

```ts
... || hasPrisma
```

which meant:

```text
Prisma present
+
database not explicitly declared
=
SQLite
```

That is an invented fact.

## Current-main status: FIXED

The current code only identifies SQLite when SQLite is actually declared:

```ts
} else if (
  /provider\s*=\s*"sqlite"/i.test(prismaSchema) ||
  /\bsqlite\b/i.test(combined)
) {
  database = 'sqlite';
}
```

### Verdict

**Fixed.**

---

# 6. Historical failure #4: Express backend had no executable topology

Old architecture:

```text
Backend: Express
```

but:

```text
Backend API Service
Owned Files:
  src/services/apiClient.ts
  src/types/index.ts
```

There was no:

```text
server/index.ts
server/app.ts
```

or equivalent server entrypoint.

`apiClient.ts` is a frontend HTTP client, not the Express server.

`types/index.ts` is potentially shared, not backend-owned.

## Current-main status: PARTIALLY FIXED

Current `contracts.ts` adds:

```ts
export interface ImplementationBoundary {
  id: string;
  kind: 'frontend' | 'backend' | 'database' | 'shared' | 'config';
  ownedFiles: string[];
  entryPoint?: string;
  runtime?: string;
}
```

Current validation checks whether an Express backend has:

```text
server entrypoint
```

or only client files.

However, the current heuristic is:

```ts
const onlyHasClientFiles =
  backendBoundary.ownedFiles.length > 0 &&
  backendBoundary.ownedFiles.every(looksLikeClientFile);
```

For:

```text
apiClient.ts
types/index.ts
```

this is false because `types/index.ts` is not a client filename.

Therefore the exact historical topology can still evade the check.

### Verdict

**Partially fixed. Must be tightened.**

---

# 7. Exact fix: Express topology

## File

```text
src/lib/agents/ruflo/spec-contract.ts
```

Prefer a positive server-boundary invariant.

```ts
function looksLikeServerEntry(file: string): boolean {
  return /(^|\/)(server|api|app|index|main)\.(ts|tsx|js|jsx)$/i.test(file);
}

function looksLikeFrontendClient(file: string): boolean {
  return /(^|\/)(apiClient|client|httpClient)\.(ts|tsx|js|jsx)$/i.test(file);
}
```

Then:

```ts
if (backendBoundary?.runtime === 'express') {
  const hasServerEntry =
    Boolean(backendBoundary.entryPoint) ||
    backendBoundary.ownedFiles.some(looksLikeServerEntry);

  const onlyClientOrShared =
    backendBoundary.ownedFiles.length > 0 &&
    backendBoundary.ownedFiles.every(
      file =>
        looksLikeFrontendClient(file) ||
        /(^|\/)(types|shared)\//i.test(file)
    );

  if (!hasServerEntry) {
    errors.push(
      'Backend topology contradiction: Express backend is declared but no server entry point or server-owned implementation file is defined.'
    );
  }

  if (onlyClientOrShared) {
    errors.push(
      'Backend topology contradiction: Express backend contains only frontend/shared files and no server implementation.'
    );
  }
}
```

Better still, make the Architect explicitly declare:

```text
Backend Entry Point: server/index.ts
```

and validate that exact path.

Do not rely entirely on filename guessing.

---

# 8. Historical failure #5: `index.html` treats source modules as browser scripts

Supplied file:

```html
<script src="src/components/Column.tsx"></script>
<script src="src/components/KanbanBoard.tsx"></script>
<script src="src/components/TaskCard.tsx"></script>
<script src="src/components/TaskLabel.tsx"></script>
<script src="src/pages/index.tsx"></script>
<script src="src/services/apiClient.ts"></script>
```

This is incompatible with:

```text
React + Webpack
```

The correct model is:

```text
public/index.html
      ↓
Webpack output
      ↓
src/pages/index.tsx
      ↓
React components
```

not:

```text
HTML
 ↓
every source file
```

The components and API client are dependency graph nodes, not browser entrypoints.

---

# 9. `index.html` has duplicate scripts

These appear twice:

```html
<script src="src/pages/index.tsx" defer></script>
<script src="src/services/apiClient.ts" defer></script>
```

This is a deterministic generator error.

A framework validator should reject duplicate `<script src>` references.

---

# 10. `index.html` incorrectly loads a types module

This is especially important:

```html
<script type="module" src="src/types/index.ts" defer></script>
```

Types are compile-time constructs.

The generated HTML is clearly being produced from the file tree rather than the executable module graph.

General invariant:

```text
file exists != browser runtime entrypoint
```

---

# 11. Exact React/Webpack HTML validator

## File

```text
src/lib/agents/ruflo/framework-validator.ts
```

Add:

```ts
function validateReactWebpackBootstrap(
  vfsFiles: Record<string, string>,
  errors: FrameworkValidationError[]
): void {
  const webpackConfig = Object.keys(vfsFiles).find(f =>
    /(^|\/)webpack\.config\.(js|cjs|mjs|ts)$/i.test(f)
  );

  if (!webpackConfig) {
    errors.push({
      file: 'webpack.config.js',
      line: 1,
      severity: 'ERROR',
      message: 'REACT_WEBPACK_SPA requires a webpack configuration file.',
    });
    return;
  }

  for (const [file, html] of Object.entries(vfsFiles)) {
    if (!/\.html$/i.test(file)) continue;

    const scripts = Array.from(
      html.matchAll(
        /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi
      )
    ).map(m => m[1]);

    const duplicates = [
      ...new Set(
        scripts.filter(
          (src, i) => scripts.indexOf(src) !== i
        )
      ),
    ];

    for (const src of duplicates) {
      errors.push({
        file,
        line: 1,
        severity: 'ERROR',
        message: `Duplicate script reference "${src}" in React/Webpack HTML.`,
      });
    }

    for (const src of scripts) {
      if (/\.(tsx?|jsx?)$/i.test(src)) {
        errors.push({
          file,
          line: 1,
          severity: 'ERROR',
          message:
            `React/Webpack HTML must not directly execute source module "${src}".`,
        });
      }
    }

    if (!/<div[^>]+id=["']root["']/i.test(html)) {
      errors.push({
        file,
        line: 1,
        severity: 'ERROR',
        message:
          'React/Webpack HTML is missing the React root container.',
      });
    }
  }
}
```

Call it only when:

```ts
targetFramework === 'REACT_WEBPACK_SPA'
```

Do not apply these rules to static HTML.

---

# 12. Historical TypeScript failure: `esModuleInterop`

Tester reported:

```text
Module '@types/react/index' can only be default-imported using
the 'esModuleInterop' flag
```

across several files.

This means the generated React import style and compiler configuration disagree.

There are two valid approaches.

## Preferred modern approach

Use:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx"
  }
}
```

and:

```ts
import { useState } from 'react';
```

instead of:

```ts
import React, { useState } from 'react';
```

unless `React` itself is referenced.

## Alternative

If the project intentionally uses default React imports:

```json
{
  "compilerOptions": {
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  }
}
```

AutoCoder must choose one coherent strategy.

---

# 13. Major verifier RCA: `project-validator.ts`

Current:

```text
src/lib/agents/ruflo/project-validator.ts
```

hard-codes:

```ts
const compilerOptions: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.CommonJS,
  jsx: ts.JsxEmit.ReactJSX,
  allowJs: true,
  noEmit: true,
  skipLibCheck: true,
  moduleResolution: ts.ModuleResolutionKind.Node10,
  ...
};
```

This is dangerous.

The generated project may have:

```text
tsconfig.json
```

with different settings.

The verifier should validate the project using the project's own compiler contract.

---

# 14. Exact `tsconfig` fix

## File

```text
src/lib/agents/ruflo/project-validator.ts
```

Add a helper that reads:

```text
tsconfig.json
```

from VFS and parses it with:

```ts
ts.parseJsonConfigFileContent(...)
```

Conceptually:

```ts
function getProjectCompilerOptions(
  vfsContentMap: Map<string, string>
): ts.CompilerOptions {
  const raw = vfsContentMap.get('tsconfig.json');

  if (!raw) {
    return {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
      allowJs: true,
      noEmit: true,
      skipLibCheck: true,
    };
  }

  const parsedJson =
    ts.parseConfigFileTextToJson('tsconfig.json', raw);

  if (parsedJson.error) {
    return {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
      noEmit: true,
      skipLibCheck: true,
    };
  }

  const parsed =
    ts.parseJsonConfigFileContent(
      parsedJson.config,
      /* VFS-backed ParseConfigHost */,
      '.'
    );

  return {
    ...parsed.options,
    noEmit: true,
    skipLibCheck: parsed.options.skipLibCheck ?? true,
  };
}
```

Then replace the hard-coded compiler options with:

```ts
const compilerOptions =
  getProjectCompilerOptions(vfsContentMap);
```

The VFS-backed parse host must resolve files from the generated project.

Do not simply disable diagnostics to make the old run green.

---

# 15. Historical failure: missing React hook imports

Post-debugger output:

```text
Column.tsx:
Cannot find name 'useState'

TaskCard.tsx:
Cannot find name 'useState'
```

This means source likely uses:

```tsx
useState(...)
```

without:

```ts
import { useState } from 'react';
```

This is a Coder generation error.

---

# 16. Exact deterministic hook-import check

Add to the existing project/framework verification path:

```ts
function validateReactHookImports(
  file: string,
  content: string,
  errors: ProjectValidationError[]
): void {
  const hooks = [
    'useState',
    'useEffect',
    'useContext',
    'useReducer',
    'useCallback',
    'useMemo',
    'useRef',
    'useLayoutEffect',
    'useTransition',
  ];

  for (const hook of hooks) {
    if (!new RegExp(`\\b${hook}\\s*\\(`).test(content)) {
      continue;
    }

    const imported = new RegExp(
      `import\\s*\\{[^}]*\\b${hook}\\b[^}]*\\}\\s*from\\s*['"]react['"]`
    ).test(content);

    if (!imported) {
      errors.push({
        file,
        line: 1,
        message:
          `React hook "${hook}" is used but is not explicitly imported from "react".`,
      });
    }
  }
}
```

This should supplement TypeScript, not replace it.

---

# 17. Coder prompt invariant

Add to the existing Coder rules, not a new agent:

```text
REACT IMPORT INVARIANTS

1. Every React hook used in a file must be explicitly imported.
2. useState requires an import from "react".
3. useEffect requires an import from "react".
4. Never rely on React globals.
5. With jsx=react-jsx, do not add a default React import unless React is directly referenced.
6. Keep source imports consistent with tsconfig.json.
```

This prevents the generator from repeatedly producing the same mechanically detectable mistake.

---

# 18. React global error

Tester also reported:

```text
'React' refers to a UMD global, but the current file is a module.
```

This indicates source is using:

```ts
React
```

without importing it.

AutoCoder must choose:

```text
automatic JSX runtime
```

or:

```text
classic React runtime
```

and keep:

```text
Coder imports
+
tsconfig
+
Webpack configuration
```

consistent.

---

# 19. Do not solve compiler failures by weakening TypeScript

Do NOT respond to these errors by globally adding:

```json
{
  "strict": false,
  "noImplicitAny": false,
  "skipLibCheck": true
}
```

just to silence the tester.

`skipLibCheck` can be useful for dependency declarations, but disabling meaningful project diagnostics is not repair.

The objective is:

```text
generated project is correct
```

not:

```text
validator cannot complain
```

---

# 20. Runtime validator has a current React/Webpack defect

Current:

```text
src/lib/agents/ruflo/runtime-validator.ts
```

detects:

```ts
app/page.tsx
src/app/page.tsx
pages/index.tsx
index.html
```

but not:

```text
src/pages/index.tsx
```

The latest contract can now explicitly produce:

```text
REACT_WEBPACK_SPA
entryPoints = ['src/pages/index.tsx']
```

so the runtime validator is behind the contract model.

## Fix

Change the API to consume the canonical contract:

```ts
export async function probeGeneratedProjectRoutes(
  contract: ProjectContract,
  vfsFiles: Record<string, string>
): Promise<RuntimeTestResult>
```

Then:

```ts
const hasDeclaredEntryPoint =
  contract.entryPoints.some(entry =>
    filePaths.includes(entry)
  );

if (!hasDeclaredEntryPoint) {
  errors.push(
    `Declared entry point(s) not found: ${contract.entryPoints.join(', ')}`
  );
}
```

For React/Webpack:

```ts
if (contract.framework === 'REACT_WEBPACK_SPA') {
  const hasWebpackConfig = filePaths.some(f =>
    /(^|\/)webpack\.config\.(js|cjs|mjs|ts)$/i.test(f)
  );

  if (!hasWebpackConfig) {
    errors.push(
      'React/Webpack project is missing webpack.config.js.'
    );
  }
}
```

---

# 21. Runtime validator is currently structural, not real runtime execution

Current route probing can synthesize:

```text
200
```

based on file existence.

That is not equivalent to:

```text
server starts
GET /api/boards
HTTP 200
```

Therefore internally distinguish:

```text
structural runtime validation
```

from:

```text
real isolated runtime execution
```

Long-term target:

```text
generated VFS
  ↓
isolated worker
  ↓
install
  ↓
build
  ↓
start
  ↓
HTTP probes
  ↓
logs
  ↓
terminate
```

Do not turn the current patch into a full sandbox-execution rewrite unless the repository already has that infrastructure.

---

# 22. API validator is too Next/filesystem-oriented

Current:

```text
src/lib/agents/ruflo/api-contract-validator.ts
```

primarily checks:

```text
app/.../route.ts
pages/...ts
```

and:

```ts
f.toLowerCase().includes(cleanPath.toLowerCase())
```

That does not correctly model Express.

An Express route can be:

```ts
app.get('/api/boards', handler);
```

inside:

```text
server/routes/boards.ts
```

There is no reason for a file called:

```text
api/boards.ts
```

to exist.

---

# 23. Exact API validator fix

Use the canonical backend runtime.

For Express, structurally search for:

```ts
app.get('/api/boards', ...)
router.get('/api/boards', ...)
```

Example:

```ts
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function expressRouteExists(
  endpoint: ApiEndpointContract,
  vfsFiles: Record<string, string>
): string | undefined {
  const method = endpoint.method.toLowerCase();
  const path = endpoint.path;

  const pattern = new RegExp(
    `\\.(?:${method})\\s*\\(\\s*['"]${escapeRegex(path)}['"]`
  );

  for (const [file, content] of Object.entries(vfsFiles)) {
    if (!/\.(ts|tsx|js|jsx)$/.test(file)) continue;

    if (pattern.test(content)) return file;
  }

  return undefined;
}
```

Then select validation strategy by:

```text
Express
Next App Router
Next Pages Router
```

Do not force all frameworks through one filesystem convention.

---

# 24. Endpoint parsing itself is too lossy

Historical backend format:

```text
**GET /api/boards**
- Request Body: None
- Query Params: None
- Response: ...
- Auth Required: Yes
```

Current endpoint regex mostly captures:

```text
METHOD + PATH
```

and uses global auth as a fallback.

That is fragile.

## Fix

Parse endpoint blocks:

```ts
const endpointBlockRegex =
  /\*\*(GET|POST|PUT|DELETE|PATCH)\s+([^\s*]+)\*\*[^\n]*\n([\s\S]*?)(?=\n\*\*(?:GET|POST|PUT|DELETE|PATCH)\s+|\n### |\Z)/gi;
```

Then parse:

```ts
const authMatch =
  body.match(/Auth Required:\s*(Yes|No)/i);

const requestMatch =
  body.match(/Request Body:\s*([^\n]+)/i);

const responseMatch =
  body.match(/Response:\s*([^\n]+)/i);
```

Rule:

```text
explicit endpoint declaration
    >
global default
```

Contradictions remain separate validation findings.

---

# 25. Architect prompt needs one additional correction

Current `Architect.ts` now requires:

```text
Frontend Entry Point
Backend Entry Point
Database
ORM
Authentication
Build Tool
```

That is good.

But its generic entrypoint rules are still heavily oriented around:

```text
index.html
Next.js
```

Add:

```text
FOR WEB APPLICATIONS:
- Static HTML: index.html is the browser entry.
- React + Webpack: the source entry is the configured React entry, normally src/pages/index.tsx.
- Vite: preserve the declared Vite source entry.
- Next App Router: app/page.tsx.
- Next Pages Router: pages/index.tsx.
- Never treat the HTML shell as the React source entry when a bundler owns compilation.
```

File:

```text
src/lib/agents/ruflo/registry/Architect.ts
```

---

# 26. System/backend prompt status

Current `System.ts` already contains important rules:

```text
If Authentication is None, set Auth Required: No.
Never introduce authentication.
Never introduce AuthMiddleware.
Never introduce User entities solely for auth.
Do not invent backend features.
```

Keep these.

Add:

```text
BACKEND TOPOLOGY RULES

1. If Backend is Express, Backend Entry Point must be declared.
2. Backend-owned files must contain actual server implementation.
3. apiClient.ts is a frontend/client boundary, not an Express server.
4. Shared types belong to a shared boundary.
5. Do not create User/auth entities unless requirements explicitly require users/accounts/ownership.
6. Preserve architecture.md framework/database/ORM/auth decisions.
```

---

# 27. Database ownership fix

Do not allow:

```text
Database Module
Owned Files: None
```

when Prisma is part of the architecture.

Prefer:

```text
Database Module
Owned Files:
- prisma/schema.prisma
- server/db/prisma.ts
```

The exact runtime client location may vary by architecture, but the module needs an executable/source boundary.

---

# 28. Shared types

Historical:

```text
Backend owns src/types/index.ts
```

Better:

```text
Shared Types
Owned Files:
- src/types/index.ts
```

Then:

```text
Frontend → Shared Types
Backend → Shared Types
```

This avoids false ownership and makes the dependency graph explicit.

---

# 29. Correct Kanban regression topology

A coherent fixture can look like:

```text
project-root/
├── package.json
├── webpack.config.js
├── tsconfig.json
├── public/
│   └── index.html
├── prisma/
│   └── schema.prisma
├── src/
│   ├── pages/
│   │   └── index.tsx
│   ├── components/
│   │   ├── KanbanBoard.tsx
│   │   ├── Column.tsx
│   │   ├── TaskCard.tsx
│   │   └── TaskLabel.tsx
│   ├── services/
│   │   └── apiClient.ts
│   ├── types/
│   │   └── index.ts
│   └── styles/
│       └── main.css
└── server/
    ├── index.ts
    ├── routes/
    │   ├── boards.ts
    │   ├── columns.ts
    │   └── cards.ts
    ├── services/
    │   ├── boardService.ts
    │   ├── columnService.ts
    │   └── cardService.ts
    └── db/
        └── prisma.ts
```

This is a **test fixture**, not a hard-coded universal architecture.

---

# 30. Kanban domain invariant

Drag/drop must persist:

```text
columnId
position
```

Therefore:

```text
drag card
  ↓
columnId changes
  ↓
position changes
  ↓
API persists
  ↓
reload
  ↓
same order
```

The API may be:

```text
PUT /api/cards/:id
```

or:

```text
PATCH /api/cards/:id/move
```

The contract should enforce the capability/invariant, not arbitrarily require one endpoint name.

---

# 31. Regression tests

Current `src/lib/agents/ruflo/__tests__/spec-contract.test.ts` already covers:

- authentication contradiction
- coherent no-auth project
- coherent auth project
- React/Webpack detection
- React/Webpack entrypoint
- Prisma not implying SQLite
- PostgreSQL detection
- basic Express topology

Add:

### Test H: exact historical backend ownership

```text
Backend: Express
Owned Files:
  src/services/apiClient.ts
  src/types/index.ts
```

Expected:

```text
invalid
```

### Test I: valid Express topology

```text
Backend: Express
Backend Entry Point: server/index.ts
Owned Files:
  server/index.ts
  server/routes/boards.ts
```

Expected:

```text
valid
```

### Test J: raw TSX in React/Webpack HTML

```html
<script src="src/pages/index.tsx"></script>
```

Expected:

```text
framework validation = false
```

### Test K: valid Webpack HTML

```html
<div id="root"></div>
<script defer src="/bundle.js"></script>
```

Expected:

```text
framework validation = true
```

### Test L: duplicate scripts

```html
<script src="/bundle.js"></script>
<script src="/bundle.js"></script>
```

Expected:

```text
false
```

### Test M: missing hook import

```tsx
const [value, setValue] = useState(0);
```

Expected:

```text
false
```

### Test N: valid hook import

```tsx
import { useState } from 'react';
```

Expected:

```text
true
```

### Test O: React/Webpack runtime entry

VFS:

```text
src/pages/index.tsx
webpack.config.js
public/index.html
```

Expected:

```text
true
```

### Test P: missing declared entry

Expected:

```text
false
```

### Test Q/R: Express API route

```ts
app.get('/api/boards', handler);
```

must satisfy:

```text
GET /api/boards
```

and absence of that registration must fail.

### Test S: exact historical `index.html`

Must fail for:

```text
raw TS/TSX scripts
duplicates
missing React root
```

### Test T: full historical contract

The first failure must be:

```text
Specification contract validation failed
```

with:

```text
Authentication contradiction
```

before Blueprinter/Coder.

---

# 32. Files to modify

Primary:

```text
src/lib/agents/ruflo/spec-contract.ts
src/lib/agents/ruflo/contracts.ts
src/lib/agents/ruflo/framework-validator.ts
src/lib/agents/ruflo/project-validator.ts
src/lib/agents/ruflo/runtime-validator.ts
src/lib/agents/ruflo/api-contract-validator.ts
src/lib/agents/ruflo/registry/Architect.ts
src/lib/agents/ruflo/registry/System.ts
src/lib/agents/ruflo/__tests__/spec-contract.test.ts
```

Add dedicated validator test files only if the repository does not already have equivalent suites.

---

# 33. Files NOT to create

Do not create:

```text
contracts-v2.ts
spec-contract-v2.ts
quality-gate-v2.ts
framework-validator-v2.ts
runtime-validator-v2.ts
api-validator-v2.ts
backend-validator.ts
path-resolver-v2.ts
```

The current repository already has the correct architectural layer.

The job is to strengthen it.

---

# 34. Current-main status matrix

| Failure | Root cause | Current main |
|---|---|---|
| Auth None vs Auth Yes | lost evidence/provenance | **FIXED** |
| AuthMiddleware/User invention | backend agent violated upstream contract | **PROMPT IMPROVED + GATE** |
| React+Webpack unrepresentable | framework enum too small | **FIXED** |
| React entrypoint lost | fallback to index.html | **FIXED** |
| Prisma implies SQLite | invented inference | **FIXED** |
| Express owns apiClient/types | weak topology model | **PARTIAL** |
| No server entrypoint | weak topology validation | **PARTIAL** |
| TSX loaded by browser | no bundler boot validation | **OPEN** |
| duplicate scripts | generation error | **OPEN** |
| types.ts loaded as script | file/runtime confusion | **OPEN** |
| missing useState imports | Coder import invariant | **OPEN** |
| React UMD global | import/runtime mismatch | **OPEN** |
| esModuleInterop errors | verifier config mismatch | **OPEN** |
| React/Webpack runtime entry | hard-coded runtime list | **OPEN** |
| Express API validation | Next/filesystem assumptions | **OPEN** |
| Quality Gate bypass | orchestrator bypass | **FIXED** |

---

# 35. Implementation order

## Phase 1: Contract

1. Tighten Express topology.
2. Require explicit backend entrypoint for Express.
3. Improve endpoint block parsing.
4. Preserve endpoint-level evidence.

## Phase 2: Framework

1. React/Webpack HTML boot validation.
2. Duplicate script validation.
3. Raw TS/TSX script rejection.
4. React root validation.
5. Webpack config validation.

## Phase 3: Compiler

1. Parse generated `tsconfig.json`.
2. Make project config authoritative.
3. Add React hook import invariant.
4. Align React JSX/import strategy.
5. Preserve meaningful TS errors.

## Phase 4: Runtime/API

1. Runtime validator consumes `ProjectContract.entryPoints`.
2. React/Webpack entry support.
3. Framework-aware API validation.
4. Express route registration detection.

## Phase 5: Agent prompts

1. Architect React/Webpack entry rules.
2. Architect backend entrypoint rules.
3. System no-auth preservation.
4. System backend topology rules.
5. Shared-file ownership rules.

## Phase 6: Regression

Run all old and new fixtures.

---

# 36. Acceptance criteria

The system is correct when:

### Contract

```text
architecture: Authentication=None
backend: Auth Required=Yes
```

causes:

```text
contract.valid === false
```

before Blueprinter.

### Framework

```text
React + Webpack
```

becomes:

```text
REACT_WEBPACK_SPA
```

with the declared source entry preserved.

### HTML

This fails:

```html
<script src="src/pages/index.tsx"></script>
```

### Hooks

This fails:

```tsx
useState(0)
```

without its import.

### Compiler

The validator uses the generated project's:

```text
tsconfig.json
```

rather than a hidden incompatible compiler configuration.

### Backend

This fails:

```text
Express
apiClient.ts
types/index.ts
no server entry
```

### API

Express routes are checked as Express route registrations, not Next filesystem routes.

### Runtime

The runtime validator checks:

```text
contract.entryPoints
```

rather than a hard-coded framework list.

### Quality Gate

No failed verification reaches:

```text
Completed
```

---

# 37. Final architectural principle

The historical failure was not simply:

> "The AI generated bad code."

That explanation is too shallow to be useful.

The real failure was:

```text
The agents were allowed to generate artifacts that disagreed,
and the deterministic system did not represent enough information
to reject the disagreement early.
```

The current commit has substantially improved this.

The remaining work is to extend the same invariant through:

```text
Contract
   ↓
Topology
   ↓
Bundler boot model
   ↓
Compiler config
   ↓
API routing model
   ↓
Runtime entrypoint
   ↓
Quality Gate
```

The target behavior is not:

```text
"Make this Kanban project work."
```

It is:

```text
"Make AutoCoder unable to silently cross these contract boundaries."
```

That is the general fix.