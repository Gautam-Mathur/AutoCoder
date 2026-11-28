# AutoCoder — Recursive Kanban RCA + Exact Implementation Plan
## Latest Run Against Current `main`

**Repository:** `Gautam-Mathur/AutoCoder`  
**Current branch audited:** `main`  
**Current commit audited:** `0f6ace8945307a8378d3296ad4659966a3541d89`  
**Previous relevant commit:** `67821fa592bf5277a69cc5a425ba727015d65041`  
**Previous contract-fix commit:** `9278693ebe7fd6d3baf0462d602221c3d9f425ec`

---

# 0. What this document is

This is the **recursive follow-up RCA** for the latest Kanban generation.

The previous RCA identified a set of general AutoCoder problems and those fixes were implemented. The new Kanban run was then generated against that changed code.

This document therefore does something stricter:

```text
Old failure
    ↓
Previous RCA
    ↓
Implemented fixes
    ↓
New generated project
    ↓
New tester output
    ↓
Trace every new failure backward
    ↓
Determine whether:
    A. previous fix failed,
    B. previous fix was incomplete,
    C. a new regression was introduced,
    D. the generated project violated a valid contract,
    E. the validator itself is producing a false/misleading finding
    ↓
Fix the actual source
    ↓
Add regression test
    ↓
Run the same reasoning again
```

The Kanban project is still only the **regression fixture**.

The goal is not to hard-code Kanban behavior.

The goal is:

> Make AutoCoder structurally incapable of turning a coherent architecture into an incoherent executable project.

---

# 1. Source artifacts used

The latest run supplied the following artifacts:

```text
Architect
Backend
Blueprint
Index.html
Test report
Post-debugger verification
Debugger report
Quality Gate report
```

The latest generated architecture declares:

```text
Frontend: React
Frontend Entry Point: src/pages/index.tsx
Backend: Express
Backend Entry Point: server/app.js
Database: PostgreSQL
ORM: Prisma
Authentication: None
Build Tool: Vite
```

It also declares:

```text
index.html
package.json
vite.config.js
tsconfig.json
src/pages/index.tsx
server/app.js
prisma/schema.prisma
```

The uploaded artifact contains these exact architectural decisions and the subsequent failures. fileciteturn349file0L3-L47

The generated backend also correctly declares all API endpoints as:

```text
Auth Required: No
```

and explicitly says:

```text
No middleware required for this project.
```

The uploaded artifact shows that the previous authentication contradiction has disappeared in this run. fileciteturn349file0L175-L313

---

# 2. Executive RCA

## The previous RCA was successful in one important way

The latest architecture/backend output is now internally consistent on authentication:

```text
Architecture:
Authentication: None

Backend:
Auth Required: No

Middleware:
No middleware required
```

There is no longer:

```text
Authentication: None
+
Auth Required: Yes
+
AuthMiddleware
```

Therefore:

**The authentication contradiction fix is working.**

Do not touch that mechanism just because the project still fails.

---

# 3. The new primary root cause

The most important failure is now:

```text
Valid Vite architecture
        ↓
Valid-ish Blueprint
        ↓
Coder generates files
        ↓
Post-pass HTML asset synchronizer
        ↓
EVERY JS/TS/TSX FILE IS TREATED AS AN HTML SCRIPT
        ↓
server/app.js gets injected into index.html
        ↓
src/pages/index.tsx gets injected without type="module"
        ↓
frontend/server boundary is destroyed
        ↓
HTML verification fails
```

The responsible existing function is:

```text
src/lib/agents/ruflo/orchestrator.ts
```

specifically:

```ts
syncHtmlAssetLinks()
```

The current implementation scans:

```ts
const jsFiles = allFiles.filter(
  f =>
    /\.(js|ts|jsx|tsx)$/.test(f) &&
    !f.endsWith('.d.ts') &&
    !f.includes('config') &&
    !f.includes('test')
);
```

and then adds every unlinked file to HTML:

```ts
const scriptTag =
  `  <script src="${jsFile}" defer></script>\n`;
```

That means:

```text
src/pages/index.tsx
server/app.js
src/components/...
src/services/...
```

can all be interpreted as browser scripts.

This is fundamentally wrong for any bundler-based application.

---

# 4. Recursive trace #1: Why is `server/app.js` in `index.html`?

Latest Blueprint says:

```text
File: index.html

Dependencies: server/app.js
```

and:

```html
<script src="server/app.js" defer>
```

This is already wrong before the final HTML synchronization pass.

But the important question is:

> Why did the system permit this dependency?

There are two possible sources:

```text
A. Blueprinter generated it.
B. Post-pass synchronization injected it.
```

The supplied Blueprint explicitly contains:

```text
Dependencies: server/app.js
```

so the Blueprinter itself is participating.

However, the post-pass can also inject it.

Therefore there are **two independent defects**:

```text
Defect A:
Blueprint dependency semantics allow backend server to be an HTML dependency.

Defect B:
syncHtmlAssetLinks() indiscriminately adds server/source files to HTML.
```

Both must be fixed.

Do not fix only one.

---

# 5. Why this is a framework-boundary violation

The architecture says:

```text
Frontend:
React + Vite

Backend:
Express
```

The correct process is:

```text
Browser
   ↓
Vite HTML entry
   ↓
React source entry
   ↓
Frontend application
   ↓
fetch('/api/...')
   ↓
Express server
   ↓
Prisma
   ↓
PostgreSQL
```

The generated Blueprint instead says:

```text
Browser
   ↓
index.html
   ↓
server/app.js
```

That is backwards.

The browser must not execute the Express server source.

The server is a separate Node runtime.

---

# 6. Recursive trace #2: Why is `src/pages/index.tsx` loaded without `type="module"`?

The current synchronizer generates:

```ts
<script src="${jsFile}" defer></script>
```

There is no:

```html
type="module"
```

For Vite, source modules must be loaded as ES modules when they are direct HTML entrypoints:

```html
<script type="module" src="/src/pages/index.tsx"></script>
```

Vite then transforms the module graph.

Therefore the reported:

```text
Script "src/pages/index.tsx" uses ES module syntax
but loaded without type="module"
```

is a direct consequence of the synchronizer.

The generated error is not mysterious.

The system literally created the invalid tag.

---

# 7. Recursive trace #3: Why did the previous React/Webpack fix not solve this?

Because the new project is:

```text
React + Vite
```

not:

```text
React + Webpack
```

The previous fix added:

```text
REACT_WEBPACK_SPA
```

and:

```text
validateReactWebpackBootstrap()
```

That was correct for the old architecture.

It does not cover:

```text
VITE_SPA
```

The latest architecture correctly detects Vite because the current extractor checks Vite before React/Webpack.

Therefore this is not evidence that `REACT_WEBPACK_SPA` is broken.

It exposes a larger architectural problem:

> Framework-specific HTML bootstrap rules were added for one framework, while the shared HTML synchronizer remained framework-agnostic and destructive.

The correct abstraction is:

```text
Framework Contract
       ↓
Bootstrap Strategy
       ↓
HTML generation/validation
```

not:

```text
one framework gets special validation
+
generic HTML synchronizer does whatever it wants
```

---

# 8. Exact fix #1: stop indiscriminate HTML script synchronization

## File

```text
src/lib/agents/ruflo/orchestrator.ts
```

## Existing function

```ts
export function syncHtmlAssetLinks(
  htmlContent: string,
  allFiles: string[]
)
```

The current implementation must NOT treat every:

```text
.js
.ts
.jsx
.tsx
```

file as a browser asset.

Delete this behavior:

```ts
const jsFiles = allFiles.filter(
  f =>
    /\.(js|ts|jsx|tsx)$/.test(f) &&
    !f.endsWith('.d.ts') &&
    !f.includes('config') &&
    !f.includes('test')
);
```

and replace the concept with:

```text
HTML runtime assets are determined by the canonical framework contract.
```

---

# 9. Exact new synchronizer API

Import:

```ts
import { ProjectContract } from './contracts';
```

Change:

```ts
syncHtmlAssetLinks(
  htmlContent,
  allFiles
)
```

to:

```ts
syncHtmlAssetLinks(
  htmlContent: string,
  allFiles: string[],
  contract: ProjectContract
)
```

Then the function chooses a bootstrap strategy.

---

# 10. Vite bootstrap strategy

For:

```ts
contract.framework === 'VITE_SPA'
```

the valid source entry should come from:

```ts
contract.entryPoints
```

For the latest Kanban contract:

```text
src/pages/index.tsx
```

The synchronizer may ensure:

```html
<script type="module" src="/src/pages/index.tsx"></script>
```

but must NEVER automatically add:

```text
server/app.js
```

or arbitrary components.

Example:

```ts
function ensureViteEntryScript(
  html: string,
  entryPoint: string
): string {
  const normalized =
    entryPoint.startsWith('/')
      ? entryPoint
      : `/${entryPoint}`;

  const scriptPattern =
    new RegExp(
      `<script\\b[^>]*\\bsrc=["']${escapeRegex(normalized)}["'][^>]*>`,
      'i'
    );

  if (scriptPattern.test(html)) {
    return html;
  }

  const script =
    `  <script type="module" src="${normalized}"></script>\n`;

  if (/<\/body>/i.test(html)) {
    return html.replace(
      /<\/body>/i,
      `${script}</body>`
    );
  }

  return `${html}\n${script}`;
}
```

---

# 11. Vite must not auto-link arbitrary source modules

Never add:

```text
src/components/Column.tsx
src/components/TaskCard.tsx
src/services/apiClient.ts
src/types/index.ts
```

to HTML.

Those belong to:

```text
src/pages/index.tsx
```

and should be imported through the module graph.

Invariant:

```text
HTML → entrypoint
entrypoint → imported modules
```

not:

```text
HTML → every source file
```

---

# 12. Express files must never be HTML assets

Add an explicit invariant:

```ts
function isServerRuntimeFile(file: string): boolean {
  return (
    file.startsWith('server/') ||
    file.startsWith('api/') ||
    file.includes('/server/') ||
    file.includes('/api/')
  );
}
```

Before adding any HTML script:

```ts
if (isServerRuntimeFile(file)) {
  continue;
}
```

But this should be treated as a safety guard, not the primary architecture.

The primary rule must be:

```text
Only declared browser bootstrap entrypoints can be injected.
```

---

# 13. Static HTML must remain supported

Do not break:

```text
STATIC_HTML
```

For static HTML:

```text
index.html
+
script.js
+
style.css
```

may legitimately be linked.

Therefore:

```ts
STATIC_HTML
```

can have asset synchronization.

But even then, the synchronizer should use the declared application entrypoint rather than blindly linking all files.

---

# 14. Webpack bootstrap strategy

For:

```text
REACT_WEBPACK_SPA
```

the HTML should consume the Webpack output bundle.

It should not directly consume every source file.

If `webpack.config.js` declares:

```js
entry: './src/pages/index.tsx'
```

and produces:

```text
dist/bundle.js
```

then HTML should consume:

```text
bundle.js
```

according to the configured output.

Do not guess:

```text
src/pages/index.tsx
```

as a browser script in the generated HTML.

---

# 15. Framework bootstrap abstraction

Do not create:

```text
vite-validator-v2.ts
webpack-validator-v2.ts
```

Instead introduce a small shared strategy inside the existing framework/orchestration layer.

Concept:

```ts
type HtmlBootstrapStrategy =
  | {
      kind: 'VITE';
      entryPoint: string;
    }
  | {
      kind: 'BUNDLER_OUTPUT';
      outputPattern?: string;
    }
  | {
      kind: 'STATIC';
      scriptFiles: string[];
    };
```

Resolve it from:

```text
ProjectContract.framework
```

This prevents every new framework from creating another ad-hoc HTML patch.

---

# 16. Recursive trace #4: Why does Framework Validation say PASS?

The latest Quality Gate says:

```text
Framework Boundaries Valid: ✅
```

despite the final HTML being wrong.

This is a verifier gap.

Current `framework-validator.ts` contains:

```ts
if (targetFramework === 'REACT_WEBPACK_SPA') {
  validateReactWebpackBootstrap(vfsFiles, errors);
}
```

There is no equivalent Vite bootstrap validation.

Therefore:

```text
VITE_SPA
+
index.html loads server/app.js
+
index.html loads source TSX incorrectly
```

can still pass framework validation.

This is a direct gap.

---

# 17. Exact fix #2: Vite framework validation

## File

```text
src/lib/agents/ruflo/framework-validator.ts
```

Add:

```ts
if (targetFramework === 'VITE_SPA') {
  validateViteBootstrap(
    vfsFiles,
    errors
  );
}
```

Implement:

```ts
function validateViteBootstrap(
  vfsFiles: Record<string, string>,
  errors: FrameworkValidationError[]
): void {
  const filePaths = Object.keys(vfsFiles)
    .map(normalizePath);

  const hasViteConfig =
    filePaths.some(f =>
      /(^|\/)vite\.config\.(js|ts|mjs|cjs)$/i.test(f)
    );

  if (!hasViteConfig) {
    errors.push({
      file: 'vite.config.js',
      line: 1,
      severity: 'ERROR',
      message:
        'VITE_SPA requires a Vite configuration file.'
    });
  }

  const htmlFiles =
    filePaths.filter(f => /\.html$/i.test(f));

  for (const htmlFile of htmlFiles) {
    const html = vfsFiles[htmlFile] || '';

    const scripts =
      extractScriptSources(html);

    for (const src of scripts) {
      const normalizedSrc =
        src.replace(/^\/+/, '');

      if (
        normalizedSrc.startsWith('server/') ||
        normalizedSrc.startsWith('api/')
      ) {
        errors.push({
          file: htmlFile,
          line: 1,
          severity: 'ERROR',
          message:
            `Vite frontend HTML cannot load backend runtime file "${src}".`
        });
      }

      if (
        /\.(tsx?|jsx?)$/i.test(normalizedSrc) &&
        !hasTypeModuleAttribute(
          html,
          src
        )
      ) {
        errors.push({
          file: htmlFile,
          line: 1,
          severity: 'ERROR',
          message:
            `Vite source module "${src}" must be loaded with type="module".`
        });
      }
    }

    if (
      !/<script\b[^>]*\bsrc=["'][^"']*src\/[^"']+["'][^>]*type=["']module["']/i.test(html) &&
      !/<script\b[^>]*type=["']module["'][^>]*src=["'][^"']*src\/[^"']+["']/i.test(html)
    ) {
      errors.push({
        file: htmlFile,
        line: 1,
        severity: 'ERROR',
        message:
          'Vite SPA HTML does not contain a module script for the frontend entry.'
      });
    }
  }
}
```

The implementation should use the canonical `contract.entryPoints` rather than only looking for `src/`.

---

# 18. Better Vite validation: compare against the canonical entry

Do not merely accept any:

```html
<script type="module" src="/src/foo.tsx">
```

The validator should verify:

```text
HTML script source
=
contract.entryPoints
```

For the latest project:

```text
contract.entryPoints:
src/pages/index.tsx
```

Expected:

```html
<script type="module" src="/src/pages/index.tsx"></script>
```

Any other source entry should be flagged as architecture drift.

---

# 19. Recursive trace #5: Why does Blueprint allow `index.html → server/app.js`?

Current blueprint graph validation only checks:

```text
Does dependency resolve?
Does file exist?
Are there duplicate files?
Is there a cycle?
```

It does not understand runtime boundaries.

Therefore:

```text
index.html → server/app.js
```

is structurally a valid local dependency.

Semantically it is nonsense.

This is a classic distinction:

```text
graph validity
≠
runtime validity
```

---

# 20. Exact fix #3: blueprint runtime-boundary validation

## File

```text
src/lib/agents/ruflo/orchestrator.ts
```

Existing:

```ts
validateBlueprintGraph()
```

should remain the canonical graph validator.

Add a framework-aware boundary validation step to it, or a helper called by it.

Do not create another top-level blueprint validation system.

Concept:

```ts
function validateBlueprintRuntimeBoundaries(
  sections: BlueprintFileSection[],
  contract: ProjectContract
): string[] {
  const errors: string[] = [];

  const sectionMap = new Map(
    sections.map(s => [
      normalizePath(s.file),
      s
    ])
  );

  const htmlFiles = sections.filter(
    s => /\.html$/i.test(s.file)
  );

  for (const html of htmlFiles) {
    for (const dep of html.dependencies) {
      const normalized =
        normalizePath(dep);

      if (
        normalized.startsWith('server/') ||
        normalized.startsWith('api/')
      ) {
        errors.push(
          `Runtime boundary violation: HTML file "${html.file}" cannot depend on backend runtime file "${dep}".`
        );
      }
    }
  }

  return errors;
}
```

Call it during the existing:

```text
Blueprinter validation
```

after the generic graph is constructed.

---

# 21. Blueprint must understand Vite entry semantics

For:

```text
VITE_SPA
```

the blueprint should contain:

```text
index.html
    ↓
src/pages/index.tsx
```

not:

```text
index.html
    ↓
server/app.js
```

and not:

```text
index.html
    ↓
src/components/...
```

The canonical dependency graph is:

```text
index.html
  ↓
src/pages/index.tsx
  ├── components
  ├── services
  └── styles
```

The backend graph is separate:

```text
server/app.js
  ↓
Prisma Client
  ↓
PostgreSQL
```

---

# 22. Recursive trace #6: Why is `server/app.js` syntactically broken?

Tester:

```text
server/app.js
Line 2: ';' expected
Line 2: Left side of comma operator is unused
Line 3: ';' expected
```

This is not the same problem as:

```text
PrismaClient.board does not exist
```

The first is a syntax/source-generation failure.

The second is a Prisma-client lifecycle/type-generation failure.

Treat them separately.

---

# 23. Server language mismatch

Architecture declares:

```text
Backend Entry Point: server/app.js
```

while:

```text
Import Style: ES6 import/export
```

The backend therefore needs a coherent JavaScript module configuration.

If `server/app.js` contains:

```js
import express from 'express';
import { PrismaClient } from '@prisma/client';
```

then package/module configuration must support ESM:

```json
{
  "type": "module"
}
```

or the backend must use:

```js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
```

with CommonJS semantics.

AutoCoder currently does not have a strong cross-artifact invariant tying:

```text
Import Style
+
file extension
+
package.json module type
+
tsconfig module
+
Vite config
```

together.

---

# 24. Exact fix #4: module-system contract

Add a normalized field to the contract.

In:

```text
src/lib/agents/ruflo/contracts.ts
```

add:

```ts
export type ModuleSystem =
  | 'ESM'
  | 'COMMONJS';

export interface ProjectContract {
  ...
  moduleSystem?: ModuleSystem;
}
```

Then extraction should use:

```text
Import Style: ES6 import/export
```

as evidence for:

```text
ESM
```

and:

```text
require(...)
module.exports
```

as evidence for:

```text
COMMONJS
```

The final contract must reject contradictions such as:

```text
ES6 import/export
+
package.json type=commonjs
+
server/app.js
```

unless the architecture explicitly establishes a compatible build/runtime transformation.

---

# 25. Do not overfit `.js` to CommonJS

This is important.

Modern Node.js can run:

```js
import express from 'express';
```

when:

```json
{
  "type": "module"
}
```

Therefore:

```text
.js = CommonJS
```

is not a valid universal rule.

The contract must use:

```text
module system
+
package.json
+
build/runtime configuration
```

as one system.

---

# 26. Recursive trace #7: Prisma client has no `board` or `card`

Tester:

```text
Property 'board' does not exist on type PrismaClient
Property 'card' does not exist on type PrismaClient
```

But:

```text
Prisma DB Contract Matches: ✅
```

This is a critical distinction.

The current Prisma validator parses:

```text
prisma/schema.prisma
```

and checks whether source references:

```text
prisma.board
prisma.card
```

against schema models.

It can therefore say:

```text
schema has Board
schema has Card
source references Board/Card
```

and return:

```text
valid
```

without proving that the generated:

```text
@prisma/client
```

actually exposes:

```text
prisma.board
prisma.card
```

That is exactly what the TypeScript compiler is now revealing.

---

# 27. Root cause: Prisma schema validation is static, Prisma Client generation is not

Current architecture has:

```text
prisma/schema.prisma
```

but generated source imports:

```ts
@prisma/client
```

The project verifier appears to typecheck against the currently installed/generated client in:

```text
node_modules/@prisma/client
```

That client may be:

```text
stale
missing
generated from another schema
not generated at all
```

The validator currently does not establish:

```text
schema
    ↓
prisma generate
    ↓
generated client
    ↓
TypeScript compile
```

---

# 28. Exact fix #5: Prisma lifecycle verification

Do not weaken `prisma-validator.ts`.

It is correctly checking schema usage.

Add a deterministic lifecycle check.

Preferred execution order:

```text
package dependency validation
        ↓
Prisma schema validation
        ↓
Prisma client generation
        ↓
TypeScript project compilation
```

If isolated command execution is available:

```bash
npx prisma generate --schema prisma/schema.prisma
```

must happen before:

```text
tsc
```

for projects using Prisma.

---

# 29. If full execution is not yet available

Until an isolated execution worker exists, add a structural guard.

The project should have:

```text
prisma/schema.prisma
```

and:

```text
@prisma/client
```

dependency.

Then verify:

```text
package.json
scripts
```

contains a generation/build lifecycle such as:

```json
{
  "scripts": {
    "prisma:generate": "prisma generate",
    "build": "prisma generate && vite build"
  }
}
```

The exact script can vary.

The invariant is:

```text
Prisma schema changes
→ generated client refreshed before compilation
```

---

# 30. Do not pretend Prisma validation passed if generation was not performed

Current Quality Gate label:

```text
Prisma DB Contract Matches: ✅
```

is technically too broad.

It currently means:

```text
static source usage matches parsed schema
```

It does NOT prove:

```text
generated Prisma client matches schema
```

Rename the conceptual checks internally:

```text
Prisma Schema Contract: PASS
Prisma Client Generation: NOT_RUN
```

until actual generation exists.

This is another case where truthful verification matters more than pretty green checkmarks.

---

# 31. Exact Prisma Quality Gate extension

Extend:

```text
PrismaValidationResult
```

with:

```ts
export interface PrismaValidationResult {
  valid: boolean;
  schemaValid: boolean;
  clientGenerationVerified: boolean;
  parsedModels: string[];
  errors: PrismaValidationError[];
  warnings: PrismaValidationError[];
}
```

Then:

```text
schemaValid
```

and:

```text
clientGenerationVerified
```

are distinct.

For now:

```text
clientGenerationVerified = false
```

if generation was not actually executed.

If the project has no Prisma usage:

```text
Prisma validation is not applicable.
```

Do not force it into every project.

---

# 32. Recursive trace #8: Why is React missing from `package.json`?

Quality Gate:

```text
Missing NPM Package:
Import references package "react" which is missing in package.json.
```

The architecture explicitly says:

```text
Frontend: React
```

and therefore the generated project necessarily needs at least:

```text
react
react-dom
```

The current dependency validator correctly detects the source import.

The failure is therefore a **Coder/project generation failure**.

However, there is a deeper contract issue.

The architecture says:

```text
Additional: React DnD
```

so the project also needs the dependencies corresponding to the selected drag-and-drop implementation.

---

# 33. Exact fix #6: dependency requirements must be derived before Coder

Do not make the Coder guess packages.

The canonical contract should contain:

```ts
dependencies: string[];
```

but current extraction does not reliably derive all dependencies from:

```text
Frontend: React
Build Tool: Vite
Additional: React DnD
ORM: Prisma
Backend: Express
```

The dependency contract should be normalized.

For example:

```text
React
→ react
→ react-dom

Vite
→ vite

Express
→ express

Prisma
→ prisma
→ @prisma/client

React DnD
→ react-dnd
→ react-dnd-html5-backend
```

The exact package set depends on the selected implementation, but the important point is:

```text
architecture technology
        ↓
required package set
        ↓
package.json
```

---

# 34. Exact dependency normalization

Add a resolver in the existing contract layer:

```ts
export function inferFrameworkDependencies(
  contract: ProjectContract
): string[] {
  const deps = new Set(contract.dependencies);

  if (
    contract.framework === 'VITE_SPA' ||
    contract.framework === 'REACT_WEBPACK_SPA'
  ) {
    deps.add('react');
    deps.add('react-dom');
  }

  if (contract.framework === 'VITE_SPA') {
    deps.add('vite');
  }

  if (contract.orm === 'prisma') {
    deps.add('prisma');
    deps.add('@prisma/client');
  }

  return [...deps];
}
```

Backend inference:

```ts
if (backendRuntime === 'express') {
  deps.add('express');
}
```

Do not make this a random package injector.

The dependency resolver must be driven by the canonical architecture contract.

---

# 35. React DnD should not be inferred merely from the word "DnD"

The architecture explicitly says:

```text
React DnD for drag and drop
```

The System/Planner requirements should establish whether the intended implementation is:

```text
react-dnd
```

or another library.

The dependency contract should then contain the exact package names.

Avoid:

```text
"DnD" → randomly install packages
```

---

# 36. Recursive trace #9: Why did package validation not stop earlier?

It did stop at the final Quality Gate.

That is correct.

But Coder should have received the dependency contract before generating source.

The current architecture:

```text
Coder
  ↓
generate imports
  ↓
package validator
  ↓
discover missing react
```

is reactive.

Better:

```text
Contract
  ↓
dependency set
  ↓
package manifest
  ↓
Coder
  ↓
dependency validator
```

The validator remains necessary because the Coder can still introduce imports.

---

# 37. Package.json becomes a first-class generated artifact

The architecture explicitly lists:

```text
package.json
```

but the Blueprint supplied only:

```text
src/pages/index.tsx
server/app.js
prisma/schema.prisma
index.html
```

There is a mismatch between:

```text
architecture file tree
```

and:

```text
blueprint target files
```

The Blueprint should include:

```text
package.json
vite.config.js
tsconfig.json
```

when they are architecture-owned files.

The Coder cannot reliably generate a coherent Vite project if the configuration files are merely assumed to exist.

---

# 38. Exact fix #7: architecture-to-blueprint completeness

The current architecture says:

```text
package.json
vite.config.js
tsconfig.json
```

The Blueprint must contain them.

Add a Blueprint invariant:

```text
Every executable/configuration file required by the architecture
must have exactly one blueprint section.
```

Not merely:

```text
Every source module has a blueprint.
```

This is especially important for:

```text
Vite
Prisma
TypeScript
Express
```

because configuration is part of execution semantics.

---

# 39. Required Vite blueprint files

For:

```text
VITE_SPA
```

the minimum expected configuration boundary is typically:

```text
index.html
package.json
vite.config.js
tsconfig.json
src/pages/index.tsx
```

plus backend/database files if selected.

The exact files can vary, but if architecture explicitly declares them, Blueprint must represent them.

---

# 40. Exact fix #8: Blueprint dependency semantics

Blueprint should express:

```text
index.html
Depends On:
src/pages/index.tsx
```

not:

```text
index.html
Depends On:
server/app.js
```

`server/app.js` should depend on:

```text
@prisma/client
```

and possibly:

```text
Prisma database module
```

but not be an HTML dependency.

---

# 41. Recursive trace #10: Why did Blueprint say `Dependencies: None` for React?

The latest Blueprint says:

```text
src/pages/index.tsx
Dependencies: None
```

while its Specs Required include:

```text
ui_spec.md
backend_spec.md
```

and the project clearly uses:

```text
React
React DnD
```

This is another graph-quality issue.

The Blueprint dependency field appears to be describing:

```text
local file dependencies
```

rather than:

```text
all runtime dependencies
```

That can be acceptable if packages are intentionally excluded.

But then the contract must make the distinction explicit:

```text
Local Dependencies
Package Dependencies
Spec Dependencies
```

Otherwise the graph is incomplete and misleading.

---

# 42. Do not overload `Dependencies`

Change the conceptual blueprint format to distinguish:

```text
Dependencies:
  Local: src/components/...
  Packages: react, react-dom, react-dnd
  Runtime: ...
```

If changing the Markdown format is too disruptive, keep the existing field but document:

```text
Dependencies = local file dependencies only
```

and validate packages separately.

The current package validator already operates separately.

The key is to eliminate ambiguity.

---

# 43. Recursive trace #11: Why does `index.html` use `id="app"` instead of React `root`?

The Blueprint says:

```html
<div id="app">
```

The React entrypoint is:

```text
src/pages/index.tsx
```

This can be valid if the React code mounts to:

```ts
document.getElementById('app')
```

but the framework validator currently hard-codes:

```text
root
```

for React/Webpack.

For Vite React, Vite does not require a specific root ID. React does.

Therefore the correct invariant is:

```text
HTML root ID
=
ReactDOM createRoot target
```

not:

```text
HTML root ID must always be "root"
```

---

# 44. Exact fix #9: React mount target validation

Add a generic React mount invariant.

Search source entry for:

```ts
createRoot(
```

Example:

```ts
const root = document.getElementById('app');
createRoot(root!)
```

Extract:

```text
app
```

Then validate:

```html
<div id="app"></div>
```

exists.

If source uses:

```text
root
```

HTML must contain:

```html
<div id="root"></div>
```

This should work for:

```text
Vite
Webpack
```

without imposing a framework-specific ID.

---

# 45. Current framework validator is too framework-specific in the wrong places

It currently has:

```text
Next.js boundary checks
React/Webpack bootstrap
```

but the shared React application semantics are not abstracted.

Target model:

```text
Framework:
    Vite / Webpack / Next

Application:
    React

Bundler:
    Vite / Webpack / Next

Runtime:
    Browser / Node
```

Then validation can be:

```text
React invariants
+
framework-specific bootstrap invariants
+
runtime-boundary invariants
```

This prevents duplication.

---

# 46. Recursive trace #12: Why did the debugger repair 0/3?

The Debugger report says:

```text
Repaired 0/3 failing files
```

The post-debugger errors include:

```text
index.html
server/app.js
src/pages/index.tsx
```

The debugger is being asked to repair files whose problems are not all local.

Examples:

```text
index.html
```

is corrupted by architecture/bootstrap semantics.

```text
server/app.js
```

has a likely module/configuration and Prisma lifecycle issue.

```text
src/pages/index.tsx
```

has package/import/compiler issues.

If the debugger simply receives:

```text
file + local compiler error
```

it cannot reliably repair cross-file contract problems.

---

# 47. Exact fix #10: classify errors before Debugger

The debugger needs deterministic error classes:

```ts
type RepairClass =
  | 'LOCAL_SYNTAX'
  | 'LOCAL_IMPORT'
  | 'TYPE_ERROR'
  | 'MISSING_PACKAGE'
  | 'FRAMEWORK_BOUNDARY'
  | 'CONFIGURATION'
  | 'DATABASE_GENERATION'
  | 'API_CONTRACT'
  | 'ARCHITECTURE_DRIFT'
  | 'RUNTIME';
```

Examples:

```text
React missing import
→ LOCAL_IMPORT

react missing package
→ MISSING_PACKAGE

server/app.js syntax
→ LOCAL_SYNTAX or CONFIGURATION

PrismaClient.board missing
→ DATABASE_GENERATION

index.html loads server/app.js
→ FRAMEWORK_BOUNDARY

API handler missing
→ API_CONTRACT
```

Then debugger strategy can differ.

---

# 48. Debugger must not repair infrastructure violations as local code

For:

```text
index.html → server/app.js
```

do not tell Coder:

```text
fix index.html
```

without context.

The repair prompt should contain:

```text
Framework: VITE_SPA
Frontend entry: src/pages/index.tsx
Backend runtime: Express
Backend entry: server/app.js
Rule: frontend HTML must never load backend runtime files.
```

Otherwise the LLM may produce:

```html
<script type="module" src="server/app.js"></script>
```

which technically addresses one diagnostic while making the architecture even worse.

Humanity has already invented enough ways to turn one bug into two.

---

# 49. Recursive trace #13: API validation failures

Quality Gate reports:

```text
GET /api/boards
POST /api/boards
...
```

all missing.

Current `api-contract-validator.ts` now has Express detection:

```ts
expressRouteExists()
```

which is good.

However, the error text still says:

```text
expected Express route registration or app/api/boards/route.ts
```

and the matcher requires a literal:

```ts
app.get('/api/boards', ...)
```

style expression.

This can miss valid Express patterns such as:

```ts
router.get('/api/boards', ...)
app.use('/api', router)
router.get('/boards', ...)
```

Therefore the current Express validator is only partially framework-aware.

---

# 50. Exact fix #11: Express route composition

The validator needs to understand:

```text
app.use('/api', router)
router.get('/boards', ...)
```

as:

```text
GET /api/boards
```

Represent route prefixes while scanning files.

Concept:

```ts
interface ExpressRouterContext {
  variable: string;
  prefix: string;
  file: string;
}
```

Parse:

```ts
app.use('/api', router)
```

into:

```text
router prefix = /api
```

Then:

```ts
router.get('/boards', ...)
```

resolves to:

```text
/api/boards
```

This is much more robust than searching for a literal complete path.

---

# 51. Express route parameter normalization

Contract:

```text
GET /api/boards/:boardId
```

Source:

```ts
router.get('/boards/:boardId', ...)
```

must resolve.

Normalize:

```text
/api/boards/:boardId
```

against:

```text
/api + /boards/:boardId
```

Do not use raw:

```ts
file.includes(cleanPath)
```

as the primary route proof.

---

# 52. API validation should use backend runtime from contract

Current orchestrator does:

```ts
const apiVal =
  validateApiContracts(
    specContract.apiEndpoints,
    vfsFilesRecord
  );
```

The validator receives no:

```text
framework
backend runtime
backend entrypoint
```

So it must guess.

Change to:

```ts
validateApiContracts(
  specContract,
  vfsFilesRecord
);
```

Then:

```ts
if (contract.backendRuntime === 'express') {
  validateExpressRoutes(...)
}
```

For Next:

```ts
validateNextRoutes(...)
```

For frontend-only:

```text
no backend API validation
```

---

# 53. Contract needs backend runtime explicitly

Current `ProjectContract` has:

```text
framework
language
orm
database
authentication
routing
entryPoints
apiEndpoints
models
dependencies
implementationBoundaries
```

Backend runtime is indirectly represented inside:

```text
ImplementationBoundary.runtime
```

That is usable, but awkward.

Prefer:

```ts
backend?: {
  runtime: 'express' | 'next' | 'none';
  entryPoint?: string;
};
```

However, do not duplicate information unnecessarily.

If `ImplementationBoundary` remains canonical, expose a helper:

```ts
getBackendRuntime(contract)
```

so every validator does not reinvent the lookup.

---

# 54. Recursive trace #14: Runtime validator is definitely being called incorrectly

Current orchestrator calls:

```ts
const runtimeVal =
  await probeGeneratedProjectRoutes(
    specContract.apiEndpoints,
    vfsFilesRecord
  );
```

This passes only:

```text
ApiEndpointContract[]
```

not:

```text
ProjectContract
```

Therefore this new runtime code:

```ts
framework === 'REACT_WEBPACK_SPA'
```

and:

```ts
entryPoints
```

is bypassed.

The function supports:

```ts
ProjectContract | ApiEndpointContract[]
```

but the orchestrator is using the legacy branch.

This is a concrete incomplete migration.

---

# 55. Exact fix #12: pass the canonical contract to runtime validation

Change:

```ts
const runtimeVal =
  await probeGeneratedProjectRoutes(
    specContract.apiEndpoints,
    vfsFilesRecord
  );
```

to:

```ts
const runtimeVal =
  await probeGeneratedProjectRoutes(
    specContract,
    vfsFilesRecord
  );
```

This is mandatory.

Otherwise the new contract-aware runtime work is dead-on-arrival.

---

# 56. Same rule: never keep two execution modes indefinitely

Current function supports:

```ts
ProjectContract | ApiEndpointContract[]
```

This was useful for migration.

After all call sites are migrated:

```ts
probeGeneratedProjectRoutes(
  contract: ProjectContract,
  ...
)
```

should become the only API.

Then delete:

```ts
ApiEndpointContract[]
```

support if no other callers require it.

This is exactly the kind of legacy compatibility path that causes systems to look fixed while still executing the old behavior.

---

# 57. Recursive trace #15: Quality Gate is working

Latest report:

```text
Status: REPAIR_REQUIRED
Score: 56/100
```

and:

```text
Whole Project Compiles: ❌
Package Dependencies Valid: ❌
API Contracts Implemented: ❌
Runtime Probes Pass: ❌
```

The Quality Gate correctly stopped completion.

Therefore:

**Do not modify Quality Gate to make this pass.**

The Quality Gate is doing its job.

The inputs are still wrong.

---

# 58. But Quality Gate terminology needs refinement

Current:

```text
Prisma DB Contract Matches: ✅
```

while:

```text
PrismaClient.board
```

does not compile.

This is misleading.

Change the report to:

```text
Prisma Schema Contract: ✅
Prisma Client Generation: ❌ / NOT VERIFIED
```

Similarly:

```text
Framework Boundaries: ✅
```

should only be green after Vite bootstrap validation is implemented.

---

# 59. Recursive trace #16: Why did Specifications Valid = PASS?

Because:

```text
architecture
backend
```

are now coherent.

That is exactly what we wanted.

The new run proves:

```text
previous contract contradiction fix
```

did not break coherent no-auth applications.

This is a success signal.

Do not regress it by making the contract validator stricter in unrelated ways.

---

# 60. Recursive trace #17: Why did Blueprint Valid = PASS?

Because the generic graph is structurally valid:

```text
files exist
dependencies resolve
no duplicate graph nodes
no cycle
```

But:

```text
index.html → server/app.js
```

is semantically invalid.

Therefore:

```text
Blueprint graph validator
```

needs runtime-boundary awareness.

This is not a reason to throw away the existing graph validator.

Add a semantic boundary phase.

---

# 61. Recursive trace #18: why is the Blueprint duplicated in the artifact?

The supplied output contains:

```text
Blueprint
...
Index.html
...
```

and then:

```text
Index.html
...
```

again.

This should be investigated.

The current graph validator already has duplicate-file detection:

```ts
Duplicate file section in blueprint
```

If both sections exist in the actual `blueprint.md`, the validator should reject them.

Since the Quality Gate says:

```text
Blueprint Valid: ✅
```

one of the following is likely true:

```text
A. The displayed output combines separate generated artifacts.
B. parseBlueprintFiles() is normalizing/overwriting one section.
C. The duplicate is outside the actual blueprint.md.
```

Do not claim the duplicate is definitely a pipeline bug until the persisted `blueprint.md` is inspected.

Add a regression test against the exact artifact format.

---

# 62. Exact recursive verification requirement

After implementation, inspect these actual persisted artifacts:

```text
architecture.md
backend_spec.md
ui_spec.md
blueprint.md
package.json
vite.config.js
tsconfig.json
index.html
src/pages/index.tsx
server/app.js
prisma/schema.prisma
quality_gate_report.md
```

Do not rely only on console summaries.

The pipeline needs an artifact-level verification snapshot.

---

# 63. Add a contract verification report before Coder

After:

```ts
extractProjectContract()
validateProjectContract()
```

persist:

```text
contract_validation_report.md
```

containing:

```text
Framework
Frontend Entry
Backend Runtime
Backend Entry
Database
ORM
Auth
Entry Points
API Endpoints
Models
Dependencies
Implementation Boundaries
Evidence
```

This makes the contract observable.

Without this, debugging the pipeline requires reconstructing state from agent output.

---

# 64. Add contract hash to every downstream artifact

The contract already has:

```ts
contractHash
```

Use it.

Blueprint should record:

```text
Contract Hash: ...
```

Coder context should receive:

```text
Contract Hash: ...
```

Quality Gate should compare:

```text
current contractHash
vs
blueprint contractHash
```

If different:

```text
BLOCK:
Blueprint was generated against a stale contract.
```

This prevents:

```text
architecture changed
+
old blueprint retained
=
silent drift
```

---

# 65. This is especially important for the current Vite result

The current architecture says:

```text
Vite
```

If the Blueprint or Coder still behaves as if it were:

```text
Webpack
```

that is a contract drift.

The system should detect:

```text
contract.framework = VITE_SPA
blueprint.bootstrap = WEBPACK
```

and stop.

---

# 66. Exact framework/bootstrap contract

Add:

```ts
export type FrontendBootstrap =
  | {
      framework: 'VITE_SPA';
      sourceEntry: string;
      htmlEntry: string;
    }
  | {
      framework: 'REACT_WEBPACK_SPA';
      sourceEntry: string;
      htmlEntry: string;
      bundleOutput?: string;
    }
  | {
      framework: 'STATIC_HTML';
      htmlEntry: string;
      scripts: string[];
    };
```

This can initially be internal rather than public.

The key is to stop deriving bootstrap behavior from arbitrary file lists.

---

# 67. Architecture validator must verify Vite topology

For:

```text
Frontend: React
Build Tool: Vite
Frontend Entry Point: src/pages/index.tsx
```

required relationships:

```text
index.html exists
vite.config.js exists
src/pages/index.tsx exists
```

and:

```text
index.html → src/pages/index.tsx
```

while:

```text
index.html ↛ server/app.js
```

---

# 68. Exact Vite topology regression test

Add to:

```text
src/lib/agents/ruflo/__tests__/spec-contract.test.ts
```

or a dedicated framework test:

```ts
const viteHtml = `
<!doctype html>
<html>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/pages/index.tsx"></script>
  </body>
</html>
`;

const result =
  validateFrameworkBoundaries(
    {
      'index.html': viteHtml,
      'vite.config.js': 'export default {}',
      'src/pages/index.tsx': `
        import { createRoot } from 'react-dom/client';
        createRoot(document.getElementById('app')!);
      `,
    },
    'VITE_SPA'
  );

assert.strictEqual(
  result.valid,
  true
);
```

---

# 69. Vite negative test: backend injection

```ts
const result =
  validateFrameworkBoundaries(
    {
      'index.html': `
        <div id="app"></div>
        <script src="server/app.js"></script>
      `,
      'vite.config.js': 'export default {}',
      'src/pages/index.tsx': '',
      'server/app.js': '',
    },
    'VITE_SPA'
  );

assert.strictEqual(
  result.valid,
  false
);
```

Required error:

```text
Vite frontend HTML cannot load backend runtime file
```

---

# 70. Vite negative test: missing module attribute

```html
<script src="/src/pages/index.tsx"></script>
```

must fail.

Required:

```html
<script type="module" src="/src/pages/index.tsx"></script>
```

---

# 71. Synchronizer regression tests

Add tests directly against:

```ts
syncHtmlAssetLinks()
```

Test:

```text
allFiles =
[
  index.html,
  src/pages/index.tsx,
  src/components/Card.tsx,
  server/app.js,
  prisma/schema.prisma
]
```

Expected:

```text
HTML contains:
src/pages/index.tsx
```

Expected:

```text
HTML does NOT contain:
server/app.js
src/components/Card.tsx
prisma/schema.prisma
```

This test is extremely important because this function is currently capable of reintroducing the bug after the Coder has produced correct HTML.

---

# 72. Synchronizer must be idempotent

Run:

```ts
syncHtmlAssetLinks(
  syncHtmlAssetLinks(
    html,
    files,
    contract
  ).updatedHtml,
  files,
  contract
)
```

Expected:

```text
second pass produces zero changes
```

This prevents the current duplicate-script behavior.

Invariant:

```text
sync(sync(html)) === sync(html)
```

---

# 73. This is a major reason the old post-debugger result was misleading

The debugger may fix:

```html
<script type="module" src="/src/pages/index.tsx"></script>
```

but then:

```text
post-pass synchronizer
```

runs again and adds:

```html
<script src="server/app.js" defer></script>
```

or another source file.

So the debugger can appear ineffective even when its local repair is correct.

The order is wrong.

---

# 74. Exact pipeline order fix

Current conceptual order:

```text
Coder
 ↓
Debugger/linter loops
 ↓
HTML synchronization
 ↓
verification
```

That can work only if synchronization is safe.

Better:

```text
Coder
 ↓
structural normalization
 ↓
framework-aware HTML normalization
 ↓
cross-file checks
 ↓
static verification
 ↓
Debugger
 ↓
framework-aware normalization
 ↓
static verification again
 ↓
Quality Gate
```

Or, preferably:

```text
Do not mutate generated application code after Coder
unless the transformation is deterministic and contract-aware.
```

---

# 75. Strong recommendation: make HTML synchronization normalization, not invention

The synchronizer should only:

```text
repair broken references to declared assets
```

It must not:

```text
invent new runtime dependencies
```

Current behavior:

```text
all files
→ add everything
```

Correct behavior:

```text
contract
+
existing HTML
+
declared bootstrap
→ normalize
```

---

# 76. Exact fix #13: remove generic JS auto-linking

The safest implementation is:

```ts
if (
  contract.framework === 'VITE_SPA' ||
  contract.framework === 'REACT_WEBPACK_SPA'
) {
  // Do not scan all JS/TS files.
  // Framework bootstrap owns script injection.
  return {
    updatedHtml:
      normalizeFrameworkHtml(
        htmlContent,
        contract
      ),
    syncedLinks,
  };
}
```

For static HTML only:

```text
sync declared script assets.
```

This immediately prevents:

```text
server/app.js
```

from being injected into Vite HTML.

---

# 77. Exact fix #14: CSS synchronization also needs boundary awareness

Current synchronizer scans all CSS:

```ts
const cssFiles =
  allFiles.filter(f => f.endsWith('.css'));
```

For a Vite React app, CSS may be imported from:

```ts
import './styles.css';
```

in the React module.

The HTML does not need:

```html
<link rel="stylesheet" href="src/styles/main.css">
```

Vite can process it through the module graph.

Therefore the same conceptual problem exists for CSS:

```text
HTML should not necessarily own every CSS file.
```

Use the framework's dependency graph.

---

# 78. Vite module graph rule

For:

```text
Vite SPA
```

prefer:

```text
index.html
  ↓
src/pages/index.tsx
  ↓
import './styles/main.css'
```

rather than:

```text
index.html
  ↓
main.css
```

unless the architecture explicitly chooses global HTML-linked CSS.

---

# 79. React source entry should own styles

The Coder prompt should say:

```text
For Vite/React:
- HTML owns the application entry module.
- React source imports component styles.
- Do not manually load every component/style file from index.html.
- Do not load backend files from frontend HTML.
```

This is a general framework rule.

---

# 80. Recursive trace #19: frontend architecture is too small but not invalid

The architecture says:

```text
Frontend Application
Owned Files:
src/pages/index.tsx
```

This is technically possible.

The entire React application can live in one file.

Do not create an error simply because:

```text
components/
services/
styles/
```

are absent.

However, the requirement:

```text
React DnD
Card creation/editing
Column organization
```

makes a single-file implementation less modular, but that is not a deterministic contract violation.

Do not over-validate architecture style.

---

# 81. Recursive trace #20: backend service files are conceptual only

Backend specification defines:

```text
BoardService
ColumnService
CardService
```

but architecture owns only:

```text
server/app.js
```

This is not automatically invalid.

The services may be implemented inline.

However, Blueprint should make this explicit:

```text
server/app.js
implements:
BoardService
ColumnService
CardService
```

Otherwise the Coder may believe:

```text
boardService.ts
columnService.ts
cardService.ts
```

should exist.

The architecture is currently single-file backend architecture.

Preserve that unless requirements justify decomposition.

---

# 82. Recursive trace #21: backend service/API mapping contains a semantic error

Backend says:

```text
ColumnService
Used By APIs:
GET /api/columns/:columnId/cards
POST /api/columns/:columnId/cards
```

and:

```text
Uses Entities:
Column, Card
```

This is acceptable, but the service description says:

```text
column operations including creation, retrieval, updating, deletion
```

while the actual declared APIs do not expose column CRUD.

This is a contract-quality warning.

The System agent should not claim capabilities that have no API or requirement backing.

Add a semantic check:

```text
service responsibility
must be supported by at least one declared endpoint
and requirement feature.
```

This is lower priority than the current compile/runtime failures.

---

# 83. Recursive trace #22: position numbering

Seed data uses:

```text
position: 1
position: 2
position: 3
```

This is not necessarily wrong.

But many Kanban implementations use:

```text
0, 1, 2
```

This should not be hard-coded as an error.

The requirement is:

```text
stable ordering
```

not a particular base index.

No fix required.

---

# 84. Recursive trace #23: labels are JSON

Card:

```text
labels: Json?
```

This is coherent with:

```text
labels: [{ name, color }]
```

provided Prisma schema uses:

```text
Json
```

and PostgreSQL.

No need to redesign this.

---

# 85. Recursive trace #24: API update body includes `columnId` and `position`

The latest API:

```text
PUT /api/cards/:cardId
```

contains:

```text
columnId
position
```

This correctly represents drag/drop persistence.

No issue.

---

# 86. Recursive trace #25: auth is now correctly preserved

Every endpoint says:

```text
Auth Required: No
```

and:

```text
No middleware required.
```

This is exactly what the architecture requested.

Do not let future fixes accidentally reintroduce:

```text
User
AuthMiddleware
session
JWT
```

The latest run proves the authentication evidence changes are behaving correctly.

---

# 87. Exact implementation plan

## Phase 0 — Freeze the successful contract behavior

Do not modify:

```text
detectExplicitNoAuth()
detectExplicitAuthRequired()
authentication evidence
```

except for new regression tests if needed.

Acceptance:

```text
coherent no-auth Kanban
→ contract valid
```

and:

```text
real auth/no-auth contradiction
→ contract invalid
```

---

# 88. Phase 1 — Fix HTML synchronization

Files:

```text
src/lib/agents/ruflo/orchestrator.ts
```

Tasks:

1. Change `syncHtmlAssetLinks()` to receive `ProjectContract`.
2. Remove blanket JS/TS/TSX scanning for Vite/Webpack.
3. Prevent backend files from becoming HTML assets.
4. Make Vite entry injection use `contract.entryPoints`.
5. Make Webpack HTML consume bundler output.
6. Preserve static HTML behavior.
7. Make synchronization idempotent.
8. Add tests.

Priority:

```text
P0
```

---

# 89. Phase 2 — Fix Vite framework validation

File:

```text
src/lib/agents/ruflo/framework-validator.ts
```

Tasks:

1. Validate `vite.config.*`.
2. Validate canonical Vite entry.
3. Validate `<script type="module">`.
4. Reject backend scripts in HTML.
5. Reject arbitrary source scripts.
6. Validate React mount target.
7. Keep React/Webpack behavior intact.
8. Add Vite positive/negative tests.

Priority:

```text
P0
```

---

# 90. Phase 3 — Fix Blueprint runtime boundaries

File:

```text
src/lib/agents/ruflo/orchestrator.ts
```

Tasks:

1. Keep existing `validateBlueprintGraph()`.
2. Add runtime-boundary validation inside the same validation path.
3. Reject:
   ```text
   HTML → server/*
   HTML → api/*
   ```
4. For Vite:
   ```text
   HTML → canonical frontend entry
   ```
5. For static:
   ```text
   HTML → declared static assets
   ```
6. For Webpack:
   ```text
   HTML → bundler output
   ```

Priority:

```text
P0
```

---

# 91. Phase 4 — Fix runtime validator call site

File:

```text
src/lib/agents/ruflo/orchestrator.ts
```

Current:

```ts
probeGeneratedProjectRoutes(
  specContract.apiEndpoints,
  vfsFilesRecord
)
```

Change:

```ts
probeGeneratedProjectRoutes(
  specContract,
  vfsFilesRecord
)
```

Then remove legacy overload after all callers are migrated.

Priority:

```text
P0
```

---

# 92. Phase 5 — Fix Express API route matching

File:

```text
src/lib/agents/ruflo/api-contract-validator.ts
```

Tasks:

1. Accept `ProjectContract`.
2. Resolve backend runtime.
3. Support:
   ```text
   app.get()
   router.get()
   app.use()
   ```
4. Track router prefixes.
5. Normalize path parameters.
6. Reject missing methods.
7. Do not use filesystem path matching as primary Express validation.
8. Keep Next filesystem validation for Next.

Priority:

```text
P1
```

---

# 93. Phase 6 — Fix Prisma generation lifecycle

Files:

```text
src/lib/agents/ruflo/prisma-validator.ts
src/lib/agents/ruflo/project-validator.ts
src/lib/agents/ruflo/quality-gate.ts
```

Tasks:

1. Keep static schema validation.
2. Add generation verification state.
3. Run:
   ```bash
   prisma generate
   ```
   before TypeScript compilation when execution infrastructure permits.
4. Until then, expose:
   ```text
   Prisma Schema Contract
   Prisma Client Generation
   ```
   separately.
5. Do not mark Prisma fully verified from schema parsing alone.

Priority:

```text
P1
```

---

# 94. Phase 7 — Fix dependency contract

Files:

```text
src/lib/agents/ruflo/contracts.ts
src/lib/agents/ruflo/spec-contract.ts
src/lib/agents/ruflo/registry/Architect.ts
src/lib/agents/ruflo/registry/System.ts
```

Tasks:

1. Normalize framework dependencies.
2. Normalize backend dependencies.
3. Normalize ORM dependencies.
4. Normalize explicitly selected UI libraries.
5. Generate package requirements before Coder.
6. Ensure package.json is part of Blueprint.
7. Keep dependency validator as final guard.

Priority:

```text
P1
```

---

# 95. Phase 8 — Fix module-system contract

Files:

```text
src/lib/agents/ruflo/contracts.ts
src/lib/agents/ruflo/spec-contract.ts
src/lib/agents/ruflo/framework-validator.ts
src/lib/agents/ruflo/project-validator.ts
```

Tasks:

1. Represent ESM/CommonJS.
2. Compare import style.
3. Compare package.json `type`.
4. Compare tsconfig module.
5. Compare server runtime.
6. Block contradictory configurations.

Priority:

```text
P1
```

---

# 96. Phase 9 — Fix React mount target

Files:

```text
src/lib/agents/ruflo/framework-validator.ts
src/lib/agents/ruflo/project-validator.ts
```

Tasks:

1. Detect `createRoot()`.
2. Extract DOM target.
3. Verify matching HTML ID.
4. Do not hard-code `root`.
5. Add Vite/Webpack tests.

Priority:

```text
P2
```

---

# 97. Phase 10 — Improve Debugger error classification

Files:

```text
src/lib/agents/ruflo/orchestrator.ts
```

Tasks:

1. Classify errors.
2. Send framework context.
3. Send contract context.
4. Avoid local-only repair for cross-file errors.
5. Re-run framework normalization after repair.
6. Re-run deterministic validators after every repair round.

Priority:

```text
P2
```

---

# 98. Phase 11 — Contract hash propagation

Files:

```text
src/lib/agents/ruflo/contracts.ts
src/lib/agents/ruflo/orchestrator.ts
```

Tasks:

1. Persist contract hash.
2. Add to blueprint metadata.
3. Add to Coder context.
4. Add to Quality Gate.
5. Block stale blueprint/code generation.

Priority:

```text
P2
```

---

# 99. Recursive verification loop

This is mandatory.

After Phase 1:

```text
Run Vite HTML tests
        ↓
Run exact Kanban fixture
        ↓
Inspect index.html
        ↓
If server/app.js exists:
    trace backward
        ↓
fix
        ↓
rerun
```

After Phase 2:

```text
Run framework validator
        ↓
Exact Kanban
        ↓
Quality Gate
        ↓
Inspect false positives
```

After Phase 3:

```text
Run blueprint tests
        ↓
Verify HTML dependencies
        ↓
Verify backend dependencies
```

After Phase 4:

```text
Run runtime validator
        ↓
Confirm ProjectContract is actually passed
```

After Phase 5:

```text
Run Express route fixture
        ↓
Run parameterized route fixture
        ↓
Run router-prefix fixture
```

After Phase 6:

```text
Generate Prisma client
        ↓
Compile
        ↓
Compare schema/client/source
```

After Phase 7:

```text
Architecture
→ dependency set
→ package.json
→ source imports
→ dependency validator
```

After Phase 8:

```text
ESM/CommonJS contract
→ generated config
→ compiler
→ server
```

---

# 100. Final recursive acceptance run

Use the same Kanban prompt.

Then collect:

```text
plan.md
requirements.md
architecture.md
backend_spec.md
ui_spec.md
blueprint.md
package.json
vite.config.js
tsconfig.json
index.html
src/pages/index.tsx
server/app.js
prisma/schema.prisma
quality_gate_report.md
```

Evaluate:

## Contract

```text
PASS
```

## Blueprint

```text
PASS
```

## HTML

Must contain:

```html
<script type="module" src="/src/pages/index.tsx"></script>
```

or an equivalent canonical Vite bootstrap.

Must NOT contain:

```text
server/app.js
src/components/*
src/services/*
prisma/*
```

as HTML scripts.

## Backend

Must contain valid Express route registration.

## Prisma

Must have:

```text
Board
Column
Card
```

in schema and generated Prisma client matching them.

## Packages

Must include:

```text
react
react-dom
vite
express
prisma
@prisma/client
```

plus selected DnD dependencies.

## TypeScript

No:

```text
React UMD global
esModuleInterop
missing hook
missing module
PrismaClient.board
PrismaClient.card
```

errors.

## API

All nine declared endpoints have matching Express routes.

## Runtime

Runtime validator receives:

```text
ProjectContract
```

not only:

```text
ApiEndpointContract[]
```

## Quality Gate

Expected:

```text
PASS
```

with no hidden warnings that contradict the green result.

---

# 101. Exact expected dependency graph after fixes

```text
                    ┌──────────────────┐
                    │   index.html     │
                    │   Vite entry     │
                    └────────┬─────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │ src/pages/index.tsx │
                  └───────┬───────┬─────┘
                          │       │
              ┌───────────┘       └────────────┐
              ▼                                ▼
       React Components                    API Client
              │                                │
              │                                ▼
              │                         Express API
              │                                │
              │                                ▼
              │                         Prisma Client
              │                                │
              │                                ▼
              │                           PostgreSQL
              │
              ▼
        React DnD
```

And critically:

```text
index.html
      X
      │
      └──────── server/app.js
```

must never exist.

---

# 102. Exact expected runtime boundaries

```text
BROWSER RUNTIME
───────────────
index.html
src/pages/index.tsx
src/components/*
src/services/*
src/styles/*


NODE RUNTIME
────────────
server/app.js
@prisma/client
Prisma
Express


DATABASE RUNTIME
────────────────
PostgreSQL
```

No file should cross these boundaries without an explicit contract relationship.

---

# 103. What is already fixed and must remain fixed

Do not regress:

```text
Authentication evidence
REACT_WEBPACK_SPA representation
Prisma != SQLite inference
Express topology detection
React hook import validator
tsconfig parsing
```

The latest run demonstrates the authentication side is now healthy.

The system has moved from:

```text
spec contradiction
```

to:

```text
execution/topology contradiction
```

That is progress.

---

# 104. What is definitely still broken

Current main still has these concrete defects:

### P0

```text
syncHtmlAssetLinks()
```

blindly adds JS/TS/TSX files.

```text
VITE_SPA
```

has no equivalent bootstrap validation.

Blueprint graph has no runtime-boundary validation.

Runtime validator is called with the legacy endpoint-array API.

### P1

```text
Prisma schema validation
```

does not verify generated Prisma client lifecycle.

Express route validation is still regex/filesystem based and incomplete for router composition.

Dependency contract is not sufficiently normalized from architecture.

Module-system consistency is not first-class.

### P2

Debugger does not classify cross-file/framework failures.

React mount target is not contract-aware.

Contract hash is not propagated through the pipeline.

---

# 105. Do NOT create these files

Do not create:

```text
vite-validator-v2.ts
html-validator-v2.ts
runtime-validator-v2.ts
api-validator-v2.ts
prisma-validator-v2.ts
package-validator-v2.ts
contract-v3.ts
```

The repository already has the right components.

Strengthen:

```text
spec-contract.ts
framework-validator.ts
project-validator.ts
prisma-validator.ts
api-contract-validator.ts
runtime-validator.ts
orchestrator.ts
quality-gate.ts
```

---

# 106. Do NOT solve this by making the Coder prompt enormous

The Coder should not need a 10,000-line lecture explaining:

```text
server files don't belong in browser HTML
```

That should be deterministic infrastructure.

Prompt rules should reinforce the contract.

Validators should enforce it.

The architecture should represent it.

The synchronizer must not undo it.

---

# 107. The real root cause after this recursive pass

The first RCA was:

```text
Agents disagree about the contract.
```

The latest run proves that part is improving.

The second RCA is:

```text
AutoCoder has multiple systems that interpret the same project
independently:
```

```text
Architect
    ↓
ProjectContract
    ↓
Blueprint
    ↓
Coder
    ↓
HTML synchronizer
    ↓
Framework validator
    ↓
Runtime validator
    ↓
Quality Gate
```

Several of those layers currently have their own assumptions about:

```text
entrypoint
runtime
dependencies
HTML bootstrapping
API routing
Prisma lifecycle
```

That creates:

```text
Contract says one thing
        ↓
Blueprint interprets another
        ↓
Normalizer mutates it
        ↓
Validator checks a third interpretation
```

That is the systemic issue.

---

# 108. Target architecture

The desired system is:

```text
                 USER REQUIREMENTS
                        │
                        ▼
             ┌────────────────────┐
             │ Specification       │
             │ Artifacts           │
             └─────────┬──────────┘
                       │
                       ▼
             ┌────────────────────┐
             │ Canonical Contract │
             └─────────┬──────────┘
                       │
             ┌─────────┴──────────┐
             │                    │
             ▼                    ▼
       Contract Validation   Contract Hash
             │                    │
             └─────────┬──────────┘
                       ▼
                ┌─────────────┐
                │  Blueprint  │
                └──────┬──────┘
                       │
                       ▼
             Blueprint Runtime
             Boundary Validation
                       │
                       ▼
                  ┌─────────┐
                  │  Coder  │
                  └────┬────┘
                       │
                       ▼
             Contract-Aware
             Normalization
                       │
                       ▼
       ┌──────────────────────────────┐
       │ Deterministic Verification   │
       │                              │
       │ Project                     │
       │ Package                     │
       │ Prisma                      │
       │ Framework                   │
       │ API                         │
       │ Runtime                     │
       │ Security                    │
       └──────────────┬───────────────┘
                      │
                      ▼
                Quality Gate
                      │
             ┌────────┴────────┐
             │                 │
           PASS          REPAIR/BLOCK
             │                 │
             ▼                 ▼
         Complete          Debugger
                               │
                               ▼
                     Re-run deterministic
                         verification
```

---

# 109. Definition of done for this RCA

The implementation is not complete merely because:

```text
the next Kanban run gets fewer errors.
```

It is complete when these invariants hold.

### Vite

```text
VITE_SPA
→ index.html
→ canonical frontend entry
→ type="module"
```

### Express

```text
Express
→ backend entry
→ server runtime
→ route registration
```

### Prisma

```text
schema
→ prisma generate
→ Prisma Client
→ TypeScript compile
```

### React

```text
React
→ react package
→ react-dom package
→ hooks explicitly imported
→ mount target exists
```

### Dependencies

```text
architecture
→ dependency contract
→ package.json
→ source imports
```

### Blueprint

```text
HTML
→ frontend runtime

Server
→ backend runtime

Prisma
→ database runtime
```

### Runtime validator

```text
ProjectContract
→ framework-aware validation
```

### Quality Gate

```text
green
=
actual verified state
```

not:

```text
green
=
static parser happened to agree
```

---

# 110. Final verdict

The latest Kanban run is **substantially different from the previous failure**.

The previous catastrophic contract contradiction:

```text
Authentication: None
vs
Auth Required: Yes
```

is gone.

That means the previous contract work is doing its job.

The new failure is centered around a deeper and more dangerous class of bug:

```text
AutoCoder correctly understands the architecture,
then a later generic transformation destroys the architecture.
```

The biggest immediate fix is therefore:

```text
STOP syncHtmlAssetLinks() FROM TREATING THE ENTIRE VFS
AS BROWSER ASSETS.
```

That single function currently crosses the frontend/backend runtime boundary and can reintroduce invalid HTML even after the Coder generates something correct.

The second major fix is:

```text
Make VITE_SPA a first-class framework bootstrap contract.
```

The third is:

```text
Make Blueprint runtime boundaries explicit.
```

The fourth is:

```text
Pass the full ProjectContract into runtime validation.
```

The fifth is:

```text
Separate Prisma schema correctness from Prisma Client generation correctness.
```

The sixth is:

```text
Make package/module-system requirements part of the canonical contract.
```

The final target is not:

```text
"Kanban finally works."
```

It is:

```text
A coherent architecture produces a coherent executable topology,
and no later AutoCoder subsystem is allowed to silently contradict it.
```

That is the next architectural line AutoCoder needs to cross.