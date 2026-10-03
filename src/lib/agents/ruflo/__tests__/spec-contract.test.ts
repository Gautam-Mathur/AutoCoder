import assert from 'node:assert';
import { extractProjectContract, validateProjectContract, validateArchitectureArtifact, detectExplicitNoAuth, detectExplicitAuthRequired } from '../spec-contract';
import { validateFrameworkBoundaries } from '../framework-validator';
import { validateReactHookImports, ProjectValidationError } from '../project-validator';
import { probeGeneratedProjectRoutes } from '../runtime-validator';
import { validateApiContracts } from '../api-contract-validator';
import { syncHtmlAssetLinks, validateBlueprintGraph } from '../orchestrator';

export function runKanbanContractTests(): void {
  // Test A: Exact Kanban authentication contradiction
  const contractA = extractProjectContract({
    'plan.md': '',
    'requirements.md': '',
    'architecture.md': `
### Tech Stack
- **Frontend**: React
- **Frontend Entry Point**: src/pages/index.tsx
- **Backend**: Express
- **Database**: PostgreSQL
- **Authentication**: None — no auth needed
- **Build Tool**: Webpack
`,
    'backend_spec.md': `
### API Endpoints
**GET /api/boards** — Fetch all boards
- Request Body: None
- Auth Required: Yes

### Middleware
**AuthMiddleware**
- Purpose: Authenticates incoming requests
`,
    'ui_spec.md': '',
  });

  const resA = validateProjectContract(contractA);
  assert.strictEqual(resA.valid, false, 'Expected Kanban contradiction to fail contract validation');
  assert.ok(
    resA.errors.some((e) => e.toLowerCase().includes('authentication contradiction')),
    'Expected authentication contradiction error message'
  );

  // Test B: Coherent no-auth project
  const contractB = extractProjectContract({
    'plan.md': 'Project without authentication',
    'requirements.md': 'Public board management',
    'architecture.md': 'Authentication: None — no auth needed',
    'backend_spec.md': 'GET /api/boards\n- Auth Required: No',
    'ui_spec.md': '',
  });
  const resB = validateProjectContract(contractB);
  assert.strictEqual(resB.valid, true, 'Expected coherent no-auth contract to pass');
  assert.strictEqual(contractB.authentication.required, false, 'Expected auth.required to be false');

  // Test C: Coherent auth project
  const contractC = extractProjectContract({
    'plan.md': 'User authentication required',
    'requirements.md': 'User signin',
    'architecture.md': 'Authentication: JWT',
    'backend_spec.md': 'GET /api/boards\n- Auth Required: Yes\nAuthMiddleware',
    'ui_spec.md': '',
  });
  assert.strictEqual(contractC.authentication.required, true, 'Expected auth.required to be true');

  // Test D: Detects REACT_WEBPACK_SPA & entry point
  const contractD = extractProjectContract({
    'plan.md': '',
    'requirements.md': '',
    'architecture.md': `
Frontend: React
Build Tool: Webpack
Frontend Entry Point: src/pages/index.tsx
`,
    'backend_spec.md': '',
    'ui_spec.md': '',
  });
  assert.strictEqual(contractD.framework, 'REACT_WEBPACK_SPA', 'Expected framework to be REACT_WEBPACK_SPA');
  assert.ok(contractD.entryPoints.includes('src/pages/index.tsx'), 'Expected entry point src/pages/index.tsx');

  // Test E: Prisma ORM alone does not imply SQLite
  const contractE = extractProjectContract({
    'plan.md': '',
    'requirements.md': '',
    'architecture.md': 'ORM: Prisma',
    'backend_spec.md': '',
    'ui_spec.md': '',
  });
  assert.strictEqual(contractE.orm, 'prisma', 'Expected ORM to be prisma');
  assert.strictEqual(contractE.database, 'none', 'Expected database to be none when unmentioned');

  // Test F: PostgreSQL database preference is preserved
  const contractF = extractProjectContract({
    'plan.md': '',
    'requirements.md': '',
    'architecture.md': 'Database: PostgreSQL\nORM: Prisma',
    'backend_spec.md': '',
    'ui_spec.md': '',
  });
  assert.strictEqual(contractF.database, 'postgresql', 'Expected database to be postgresql');

  // Test G: Express backend without server entry point triggers topology contradiction
  const contractG = extractProjectContract({
    'plan.md': '',
    'requirements.md': '',
    'architecture.md': `
### Tech Stack
- Backend: Express

### Modules
**Backend API Service**
- Responsibility: REST API
- Owned Files: src/services/apiClient.ts
`,
    'backend_spec.md': 'GET /api/boards',
    'ui_spec.md': '',
  });
  const resG = validateProjectContract(contractG);
  assert.strictEqual(resG.valid, false, 'Expected Express topology error');
  assert.ok(
    resG.errors.some((e) => e.toLowerCase().includes('backend topology contradiction')),
    'Expected backend topology contradiction error message'
  );

  // Test H: Exact historical backend ownership (apiClient.ts and types/index.ts)
  const contractH = extractProjectContract({
    'plan.md': '',
    'requirements.md': '',
    'architecture.md': `
### Tech Stack
- Backend: Express

### Modules
**Backend API Service**
- Responsibility: REST API
- Owned Files: src/services/apiClient.ts, src/types/index.ts
`,
    'backend_spec.md': 'GET /api/boards',
    'ui_spec.md': '',
  });
  const resH = validateProjectContract(contractH);
  assert.strictEqual(resH.valid, false, 'Expected historical Express topology error (only client/shared files)');
  assert.ok(
    resH.errors.some((e) => e.toLowerCase().includes('backend topology contradiction')),
    'Expected backend topology contradiction error message for Test H'
  );

  // Test I: Valid Express topology with server entry
  const contractI = extractProjectContract({
    'plan.md': '',
    'requirements.md': '',
    'architecture.md': `
### Tech Stack
- Backend: Express
- Backend Entry Point: server/index.ts

### Modules
**Backend API Service**
- Responsibility: REST API
- Owned Files: server/index.ts, server/routes/boards.ts
`,
    'backend_spec.md': 'GET /api/boards',
    'ui_spec.md': '',
  });
  const resI = validateProjectContract(contractI);
  assert.strictEqual(resI.valid, true, 'Expected valid Express topology with server entry to pass');

  // Test J: Raw TSX in React/Webpack HTML
  const resJ = validateFrameworkBoundaries(
    {
      'public/index.html': '<div id="root"></div><script src="src/pages/index.tsx"></script>',
      'webpack.config.js': 'module.exports = {};',
    },
    'REACT_WEBPACK_SPA'
  );
  assert.strictEqual(resJ.valid, false, 'Expected raw TSX script tag in HTML to fail framework validation');

  // Test K: Valid Webpack HTML
  const resK = validateFrameworkBoundaries(
    {
      'public/index.html': '<div id="root"></div><script defer src="/bundle.js"></script>',
      'webpack.config.js': 'module.exports = {};',
    },
    'REACT_WEBPACK_SPA'
  );
  assert.strictEqual(resK.valid, true, 'Expected valid Webpack HTML to pass framework validation');

  // Test L: Duplicate scripts in HTML
  const resL = validateFrameworkBoundaries(
    {
      'public/index.html': '<div id="root"></div><script src="/bundle.js"></script><script src="/bundle.js"></script>',
      'webpack.config.js': 'module.exports = {};',
    },
    'REACT_WEBPACK_SPA'
  );
  assert.strictEqual(resL.valid, false, 'Expected duplicate scripts in HTML to fail framework validation');

  // Test M: Missing hook import
  const errorsM: ProjectValidationError[] = [];
  validateReactHookImports(
    'src/components/Column.tsx',
    'export function Column() { const [state, setState] = useState(0); return <div>{state}</div>; }',
    errorsM
  );
  assert.strictEqual(errorsM.length, 1, 'Expected unimported useState hook to produce error');

  // Test N: Valid hook import
  const errorsN: ProjectValidationError[] = [];
  validateReactHookImports(
    'src/components/Column.tsx',
    'import { useState } from "react"; export function Column() { const [state, setState] = useState(0); return <div>{state}</div>; }',
    errorsN
  );
  assert.strictEqual(errorsN.length, 0, 'Expected imported useState hook to produce 0 errors');

  // Test O: React/Webpack runtime entry in probeGeneratedProjectRoutes
  const contractO = extractProjectContract({
    'plan.md': '',
    'requirements.md': '',
    'architecture.md': `
Frontend: React
Build Tool: Webpack
Frontend Entry Point: src/pages/index.tsx
`,
    'backend_spec.md': '',
    'ui_spec.md': '',
  });
  const resO = probeGeneratedProjectRoutes(contractO, {
    'src/pages/index.tsx': 'console.log("App root");',
    'webpack.config.js': 'module.exports = {};',
    'public/index.html': '<div id="root"></div>',
  });
  resO.then((result) => {
    assert.strictEqual(result.success, true, 'Expected React/Webpack entry probing to succeed');
  });

  // Test P: Missing declared entry in probeGeneratedProjectRoutes
  const contractP = extractProjectContract({
    'plan.md': '',
    'requirements.md': '',
    'architecture.md': `
Frontend: React
Build Tool: Webpack
Frontend Entry Point: src/pages/index.tsx
`,
    'backend_spec.md': '',
    'ui_spec.md': '',
  });
  const resP = probeGeneratedProjectRoutes(contractP, {
    'webpack.config.js': 'module.exports = {};',
    'public/index.html': '<div id="root"></div>',
  });
  resP.then((result) => {
    assert.strictEqual(result.success, false, 'Expected missing declared entry point to fail runtime probing');
  });

  // Test Q/R: Express API route registration detection
  const resQR = validateApiContracts(
    [{ method: 'GET', path: '/api/boards', authRequired: false, source: 'backend_spec.md' }],
    {
      'server/routes/boards.ts': 'app.get("/api/boards", (req, res) => res.json([]));',
    }
  );
  assert.strictEqual(resQR.valid, true, 'Expected Express app.get("/api/boards") route registration to pass API contract validation');

  // Test S: Exact historical index.html
  const resS = validateFrameworkBoundaries(
    {
      'index.html': `
<script src="src/components/Column.tsx"></script>
<script src="src/components/KanbanBoard.tsx"></script>
<script src="src/pages/index.tsx" defer></script>
<script src="src/pages/index.tsx" defer></script>
<script type="module" src="src/types/index.ts" defer></script>
`,
      'webpack.config.js': 'module.exports = {};',
    },
    'REACT_WEBPACK_SPA'
  );
  assert.strictEqual(resS.valid, false, 'Expected historical index.html to fail framework validation');
  assert.ok(
    resS.errors.some((e) => e.message.includes('Duplicate script reference')),
    'Expected duplicate script error'
  );
  assert.ok(
    resS.errors.some((e) => e.message.includes('must not directly execute source module')),
    'Expected raw source module error'
  );
  assert.ok(
    resS.errors.some((e) => e.message.includes('missing the React root container')),
    'Expected missing React root container error'
  );

  // Test T: Full historical contract failure before Blueprinter/Coder
  const contractT = extractProjectContract({
    'plan.md': '',
    'requirements.md': 'Kanban board application',
    'architecture.md': `
### Tech Stack
- **Frontend**: React
- **Frontend Entry Point**: src/pages/index.tsx
- **Backend**: Express
- **Database**: PostgreSQL
- **Authentication**: None — no auth needed
- **Build Tool**: Webpack
`,
    'backend_spec.md': `
### API Endpoints
**GET /api/boards** — Fetch all boards
- Request Body: None
- Auth Required: Yes
`,
    'ui_spec.md': '',
  });
  const resT = validateProjectContract(contractT);
  assert.strictEqual(resT.valid, false, 'Expected full historical contract to fail spec validation');

  // --- REGRESSION TESTS FOR FIX PLAN ---

  // Regression 1: Generic session is not authentication
  const contractReg1 = extractProjectContract({
    'plan.md': 'Kanban app',
    'requirements.md': "User's board state should persist across sessions.",
    'architecture.md': 'Authentication: None — no auth needed',
    'backend_spec.md': 'GET /api/boards\n- Auth Required: No',
    'ui_spec.md': 'Auth/Session: None',
  });
  const resReg1 = validateProjectContract(contractReg1);
  assert.strictEqual(contractReg1.authentication.required, false, 'Expected generic session to not set auth.required to true');
  assert.strictEqual(resReg1.valid, true, 'Expected generic session wording to pass contract validation');

  // Regression 2: Browser session is not authentication
  const contractReg2 = extractProjectContract({
    'plan.md': 'Kanban app',
    'requirements.md': 'Restore state across browser sessions',
    'architecture.md': 'Authentication: None',
    'backend_spec.md': 'GET /api/boards\n- Auth Required: No',
    'ui_spec.md': 'Auth/Session: None',
  });
  assert.strictEqual(contractReg2.authentication.required, false, 'Expected browser sessions to not set auth.required to true');

  // Regression 3: Auth/Session: None is recognized as explicit no-auth
  assert.strictEqual(detectExplicitNoAuth('Auth/Session: None'), true, 'Expected Auth/Session: None to match detectExplicitNoAuth');
  assert.strictEqual(detectExplicitNoAuth('Authentication / Session: None'), true, 'Expected Authentication / Session: None to match detectExplicitNoAuth');

  // Regression 4: Explicit login is authentication
  assert.strictEqual(detectExplicitAuthRequired('Users must log in before accessing their board'), true, 'Expected log in to match detectExplicitAuthRequired');

  // Regression 5: JWT is authentication
  assert.strictEqual(detectExplicitAuthRequired('Authentication: JWT'), true, 'Expected JWT to match detectExplicitAuthRequired');

  // Regression 6: Genuine contradiction still fails
  const contractReg6 = extractProjectContract({
    'plan.md': '',
    'requirements.md': 'Users must log in before accessing their board',
    'architecture.md': 'Authentication: None — no auth needed',
    'backend_spec.md': 'GET /api/boards\n- Auth Required: No',
    'ui_spec.md': '',
  });
  const resReg6 = validateProjectContract(contractReg6);
  assert.strictEqual(resReg6.valid, false, 'Expected genuine login vs no-auth contradiction to fail validation');

  // Regression 7: Database models fallback from markdown entity headers
  const contractReg7 = extractProjectContract({
    'plan.md': '',
    'requirements.md': '',
    'architecture.md': 'Database: PostgreSQL\nORM: Prisma',
    'backend_spec.md': `
### Database Design
**Column**
- Purpose: Represents a column
- Fields:
  - id: String
  - title: String
`,
    'ui_spec.md': '',
  });
  assert.ok(contractReg7.models.length > 0, 'Expected entity headers to produce extracted models');
  const resReg7 = validateProjectContract(contractReg7);
  assert.strictEqual(resReg7.warnings.length, 0, 'Expected model extraction to clear missing model warning');

  // Regression 8: syncHtmlAssetLinks Vite SPA idempotency and server script rejection
  const vfsFilesReg8 = ['index.html', 'src/pages/index.tsx', 'src/components/Column.tsx', 'server/app.js'];
  const contractReg8 = extractProjectContract({
    'plan.md': '',
    'requirements.md': '',
    'architecture.md': 'Frontend: React\nBuild Tool: Vite\nFrontend Entry Point: src/pages/index.tsx\nBackend: Express',
    'backend_spec.md': '',
    'ui_spec.md': '',
  });

  const dirtyHtml = `<!DOCTYPE html><html><head></head><body><script src="server/app.js" defer></script><div id="root"></div></body></html>`;
  const syncResult1 = syncHtmlAssetLinks(dirtyHtml, vfsFilesReg8, contractReg8);
  assert.ok(!syncResult1.updatedHtml.includes('server/app.js'), 'Expected syncHtmlAssetLinks to strip server/app.js script tag');
  assert.ok(syncResult1.updatedHtml.includes('type="module"'), 'Expected syncHtmlAssetLinks to add module script tag');
  assert.ok(syncResult1.updatedHtml.includes('/src/pages/index.tsx'), 'Expected syncHtmlAssetLinks to reference canonical Vite entry');

  const syncResult2 = syncHtmlAssetLinks(syncResult1.updatedHtml, vfsFilesReg8, contractReg8);
  assert.strictEqual(syncResult2.syncedLinks.length, 0, 'Expected syncHtmlAssetLinks to be idempotent on second run');
  assert.strictEqual(syncResult1.updatedHtml, syncResult2.updatedHtml, 'Expected HTML content to remain identical on second run');

  // Regression 9: validateViteBootstrap checks
  const resViteValid = validateFrameworkBoundaries(
    {
      'vite.config.ts': 'export default {};',
      'index.html': '<!DOCTYPE html><html><body><div id="root"></div><script type="module" src="/src/pages/index.tsx"></script></body></html>',
      'src/pages/index.tsx': 'import React from "react"; createRoot(document.getElementById("root")).render(<App />);',
    },
    'VITE_SPA'
  );
  assert.strictEqual(resViteValid.valid, true, 'Expected valid Vite SPA project to pass framework validation');

  const resViteServerInjected = validateFrameworkBoundaries(
    {
      'vite.config.ts': 'export default {};',
      'index.html': '<!DOCTYPE html><html><body><script src="server/app.js"></script><script type="module" src="/src/pages/index.tsx"></script></body></html>',
    },
    'VITE_SPA'
  );
  assert.strictEqual(resViteServerInjected.valid, false, 'Expected Vite HTML with server/app.js to fail framework validation');

  // Regression 10: Express router prefix composition in validateApiContracts
  const resRouterComp = validateApiContracts(
    {
      framework: 'VITE_SPA',
      language: 'typescript',
      orm: 'none',
      database: 'none',
      authentication: { required: false },
      routing: { style: 'static' },
      entryPoints: ['src/pages/index.tsx'],
      apiEndpoints: [{ method: 'GET', path: '/api/boards', authRequired: false, source: 'backend_spec.md' }],
      models: [],
      dependencies: [],
    },
    {
      'server/app.ts': 'app.use("/api", boardRouter);',
      'server/routes/boards.ts': 'router.get("/boards", getBoards);',
    }
  );
  assert.strictEqual(resRouterComp.valid, true, 'Expected Express sub-router prefix composition to be recognized by validateApiContracts');

  // Regression 11: validateBlueprintGraph runtime boundary check
  const bpBoundaryVal = validateBlueprintGraph([
    {
      file: 'index.html',
      purpose: 'Entry HTML',
      specsRequired: [],
      exports: [],
      dependencies: ['server/app.js', 'src/pages/index.tsx'],
      details: '',
      rawSection: 'File: index.html\nDependencies: server/app.js, src/pages/index.tsx',
    },
  ]);
  assert.strictEqual(bpBoundaryVal.valid, false, 'Expected Blueprint graph declaring index.html -> server/app.js to fail runtime boundary validation');

  // Regression 12: Directional Blueprint Runtime Boundary Checks (Vite vs Next.js)
  const contractVite = extractProjectContract({
    'plan.md': '',
    'requirements.md': '',
    'architecture.md': 'Frontend: React\nBuild Tool: Vite\nFrontend Entry Point: src/pages/index.tsx',
    'backend_spec.md': '',
    'ui_spec.md': '',
  });

  const bpVitePrisma = validateBlueprintGraph(
    [
      {
        file: 'src/App.tsx',
        purpose: 'App',
        specsRequired: [],
        exports: [],
        dependencies: ['src/lib/prisma.ts'],
        details: '',
        rawSection: 'File: src/App.tsx\nDependencies: src/lib/prisma.ts',
      },
      {
        file: 'src/lib/prisma.ts',
        purpose: 'Prisma Client',
        specsRequired: [],
        exports: [],
        dependencies: ['@prisma/client'],
        details: '',
        rawSection: 'File: src/lib/prisma.ts\nDependencies: @prisma/client',
      },
    ],
    undefined,
    contractVite
  );
  assert.strictEqual(bpVitePrisma.valid, false, 'Expected Vite frontend component importing src/lib/prisma.ts to fail blueprint boundary check');

  const contractNext = extractProjectContract({
    'plan.md': '',
    'requirements.md': '',
    'architecture.md': 'Frontend: Next.js App Router\nFrontend Entry Point: src/app/page.tsx',
    'backend_spec.md': '',
    'ui_spec.md': '',
  });

  const bpNextServerPrisma = validateBlueprintGraph(
    [
      {
        file: 'src/app/api/products/route.ts',
        purpose: 'API Route',
        specsRequired: [],
        exports: [],
        dependencies: ['src/lib/prisma.ts'],
        details: '',
        rawSection: 'File: src/app/api/products/route.ts\nDependencies: src/lib/prisma.ts',
      },
      {
        file: 'src/lib/prisma.ts',
        purpose: 'Prisma Client',
        specsRequired: [],
        exports: [],
        dependencies: ['@prisma/client'],
        details: '',
        rawSection: 'File: src/lib/prisma.ts\nDependencies: @prisma/client',
      },
    ],
    undefined,
    contractNext
  );
  assert.strictEqual(bpNextServerPrisma.valid, true, 'Expected Next.js server route handler importing src/lib/prisma.ts to pass blueprint boundary check');

  // Regression 13: Stripe Secret Boundary Check
  const resStripeLeak = validateFrameworkBoundaries(
    {
      'src/components/Checkout.tsx': '"use client"\nconst key = "sk_test_123456789";',
    },
    'NEXT_APP_ROUTER'
  );
  assert.strictEqual(resStripeLeak.valid, false, 'Expected client component with Stripe secret key to fail framework validation');

  const resStripeSafe = validateFrameworkBoundaries(
    {
      'src/components/Checkout.tsx': '"use client"\nimport { loadStripe } from "@stripe/stripe-js";',
      'src/app/api/checkout/route.ts': 'import Stripe from "stripe"; const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);',
    },
    'NEXT_APP_ROUTER'
  );
  assert.strictEqual(resStripeSafe.valid, true, 'Expected client component with @stripe/stripe-js and server route handler with Stripe SDK to pass framework validation');

  // Regression 14: Next.js Dynamic Catch-All API Route Matching
  const resDynamicRoute = validateApiContracts(
    {
      framework: 'NEXT_APP_ROUTER',
      language: 'typescript',
      orm: 'prisma',
      database: 'sqlite',
      authentication: { required: false },
      routing: { style: 'app' },
      entryPoints: ['src/app/page.tsx'],
      apiEndpoints: [{ method: 'GET', path: '/api/products', authRequired: false }],
      models: [],
      dependencies: [],
    },
    {
      'src/app/api/[...slug]/route.ts': 'export async function GET() { return Response.json([]); }',
    }
  );
  assert.strictEqual(resDynamicRoute.valid, true, 'Expected /api/products to match src/app/api/[...slug]/route.ts export async function GET()');

  // Regression 15: Contract Hash Verification in Blueprint
  const contractWithHash = {
    ...contractVite,
    contractHash: '1111111122222222333333334444444455555555666666667777777788888888',
  };
  const bpStaleHash = validateBlueprintGraph(
    [
      {
        file: 'src/main.tsx',
        purpose: 'Entry',
        specsRequired: [],
        exports: [],
        dependencies: [],
        details: '',
        rawSection: '### File: src/main.tsx\n<!-- Contract Hash: 9999999999999999999999999999999999999999999999999999999999999999 -->',
      },
    ],
    undefined,
    contractWithHash
  );
  assert.strictEqual(bpStaleHash.valid, false, 'Expected stale blueprint contract hash to fail blueprint graph validation');

  // Regression 16: Next.js Canonical Entry Resolution for src/app/page.tsx
  const resNextAppEntry = validateFrameworkBoundaries(
    {
      'src/app/page.tsx': 'export default function Page() { return <div>Store</div>; }',
    },
    'NEXT_APP_ROUTER',
    contractNext
  );
  assert.strictEqual(resNextAppEntry.valid, true, 'Expected src/app/page.tsx to satisfy Next.js App Router root entry requirement');

  // ─── ARCHITECT RCA REGRESSIONS (Tests A-N + Full E-Commerce Fixture) ───

  // Test A: Next src/app entry point preservation
  const contractSrcEntry = extractProjectContract({
    'architecture.md': 'Frontend: Next.js App Router\nFrontend Entry Point: src/app/page.tsx',
  });
  assert.strictEqual(contractSrcEntry.entryPoints[0], 'src/app/page.tsx', 'Expected src/app/page.tsx to be extracted as entry point');

  // Test B: Next root app entry point fallback
  const contractRootEntry = extractProjectContract({
    'architecture.md': 'Frontend: Next.js App Router\nFrontend Entry Point: app/page.tsx',
  });
  assert.strictEqual(contractRootEntry.entryPoints[0], 'app/page.tsx', 'Expected app/page.tsx to be extracted as entry point');

  // Test C: Invalid unnamed dynamic catch-all route segment rejected
  const archUnnamedRoute = `
### Project Folder Structure
project-root/
└── src/
    └── app/
        └── api/
            └── [...]/
                └── route.ts

### Modules
**Backend API**
- Responsibility: Handles API routes
- Owned Files: src/app/api/[...]/route.ts
- Depends On: None
- Supports Features: API
`;
  const valUnnamedRoute = validateArchitectureArtifact(archUnnamedRoute);
  assert.strictEqual(valUnnamedRoute.valid, false, 'Expected unnamed dynamic catch-all segment [...] to be rejected');

  // Test D: Valid named dynamic catch-all route segment accepted
  const archValidRoute = `
### Project Folder Structure
project-root/
└── src/
    └── app/
        └── api/
            └── [...slug]/
                └── route.ts

### Modules
**Backend API**
- Responsibility: Handles API routes
- Owned Files: src/app/api/[...slug]/route.ts
- Depends On: None
- Supports Features: API
`;
  const valValidRoute = validateArchitectureArtifact(archValidRoute);
  assert.deepStrictEqual(valValidRoute.errors, [], 'Expected named dynamic catch-all segment [...slug] to be accepted');

  // Test E: Duplicate module ownership rejected
  const archDuplicateOwnership = `
### Project Folder Structure
project-root/
└── src/
    └── app/
        └── components/
            └── ProductCard.tsx

### Modules
**Frontend Pages**
- Responsibility: Renders pages
- Owned Files: src/app/components/ProductCard.tsx
- Depends On: None
- Supports Features: Catalog

**Frontend Components**
- Responsibility: UI components
- Owned Files: src/app/components/ProductCard.tsx
- Depends On: None
- Supports Features: Catalog
`;
  const valDuplicateOwnership = validateArchitectureArtifact(archDuplicateOwnership);
  assert.strictEqual(valDuplicateOwnership.valid, false, 'Expected duplicate file ownership to be rejected');

  // Test F: Orphan module file rejected
  const archOrphanFile = `
### Project Folder Structure
project-root/
└── src/
    └── app/
        └── page.tsx

### Modules
**Frontend Module**
- Responsibility: Main frontend
- Owned Files: src/app/page.tsx, src/app/NonExistent.tsx
- Depends On: None
- Supports Features: UI
`;
  const valOrphanFile = validateArchitectureArtifact(archOrphanFile);
  assert.strictEqual(valOrphanFile.valid, false, 'Expected orphan file claimed by module but missing from tree to be rejected');

  // Test G: Unclaimed tree file rejected
  const archUnclaimedFile = `
### Project Folder Structure
project-root/
└── src/
    └── app/
        ├── page.tsx
        └── Unclaimed.tsx

### Modules
**Frontend Module**
- Responsibility: Main frontend
- Owned Files: src/app/page.tsx
- Depends On: None
- Supports Features: UI
`;
  const valUnclaimedFile = validateArchitectureArtifact(archUnclaimedFile);
  assert.strictEqual(valUnclaimedFile.valid, false, 'Expected tree file unclaimed by any module to be rejected');

  // Test H: Stripe integration extraction
  const contractStripe = extractProjectContract({
    'architecture.md': 'Tech Stack: Next.js + Stripe\nAdditional: Stripe',
    'backend_spec.md': 'Stripe checkout integration for payments',
  });
  assert.strictEqual(contractStripe.integrations?.includes('stripe'), true, 'Expected stripe to be extracted in integrations');

  // Test I: Next Server Component -> Prisma allowed
  const bpServerPrisma = validateBlueprintGraph(
    [
      {
        file: 'src/app/page.tsx',
        purpose: 'Server Component Page',
        specsRequired: [],
        exports: [],
        dependencies: ['src/lib/prisma.ts'],
        details: '',
        rawSection: 'File: src/app/page.tsx\nDependencies: src/lib/prisma.ts',
      },
      {
        file: 'src/lib/prisma.ts',
        purpose: 'Prisma Client',
        specsRequired: [],
        exports: [],
        dependencies: ['@prisma/client'],
        details: '',
        rawSection: 'File: src/lib/prisma.ts\nDependencies: @prisma/client',
      },
    ],
    undefined,
    contractNext
  );
  assert.strictEqual(bpServerPrisma.valid, true, 'Expected Next.js Server Component importing Prisma to pass boundary check');

  // Test J: Next Client Component -> Prisma rejected
  const bpClientPrisma = validateBlueprintGraph(
    [
      {
        file: 'src/components/ProductCard.tsx',
        purpose: 'Client Component',
        specsRequired: [],
        exports: [],
        dependencies: ['src/lib/prisma.ts'],
        details: '',
        rawSection: 'File: src/components/ProductCard.tsx\nDependencies: src/lib/prisma.ts',
      },
      {
        file: 'src/lib/prisma.ts',
        purpose: 'Prisma Client',
        specsRequired: [],
        exports: [],
        dependencies: ['@prisma/client'],
        details: '',
        rawSection: 'File: src/lib/prisma.ts\nDependencies: @prisma/client',
      },
    ],
    undefined,
    contractNext
  );
  assert.strictEqual(bpClientPrisma.valid, false, 'Expected Next.js Client Component importing Prisma to be rejected');

  // Test K: Next Route Handler -> Prisma allowed
  const bpRoutePrisma = validateBlueprintGraph(
    [
      {
        file: 'src/app/api/products/route.ts',
        purpose: 'Route Handler',
        specsRequired: [],
        exports: [],
        dependencies: ['src/lib/prisma.ts'],
        details: '',
        rawSection: 'File: src/app/api/products/route.ts\nDependencies: src/lib/prisma.ts',
      },
      {
        file: 'src/lib/prisma.ts',
        purpose: 'Prisma Client',
        specsRequired: [],
        exports: [],
        dependencies: ['@prisma/client'],
        details: '',
        rawSection: 'File: src/lib/prisma.ts\nDependencies: @prisma/client',
      },
    ],
    undefined,
    contractNext
  );
  assert.strictEqual(bpRoutePrisma.valid, true, 'Expected Next.js Route Handler importing Prisma to pass boundary check');

  // Test L: Client Component referencing /api/products allowed
  const resClientApi = validateFrameworkBoundaries(
    {
      'src/components/ProductList.tsx': '"use client"\nimport React from "react"; fetch("/api/products");',
      'src/app/api/products/route.ts': 'export async function GET() { return Response.json([]); }',
    },
    'NEXT_APP_ROUTER',
    contractNext
  );
  assert.strictEqual(resClientApi.valid, true, 'Expected Client component fetching /api/products to pass framework validation');

  // Test M: Stripe client/server split allowed
  const resStripeSplit = validateFrameworkBoundaries(
    {
      'src/components/CheckoutButton.tsx': '"use client"\nimport { loadStripe } from "@stripe/stripe-js";',
      'src/app/api/checkout/route.ts': 'import Stripe from "stripe"; const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);',
    },
    'NEXT_APP_ROUTER',
    contractNext
  );
  assert.strictEqual(resStripeSplit.valid, true, 'Expected Stripe client/server split to pass framework validation');

  // Test N: Stripe secret leak in client component rejected
  const resStripeLeakTestN = validateFrameworkBoundaries(
    {
      'src/components/CheckoutButton.tsx': '"use client"\nconst secret = process.env.STRIPE_SECRET_KEY;',
    },
    'NEXT_APP_ROUTER',
    contractNext
  );
  assert.strictEqual(resStripeLeakTestN.valid, false, 'Expected Stripe secret key in client component to be rejected');

  // ─── FULL E-COMMERCE INTEGRATION FIXTURE TEST (Section 23) ───
  const ecomArch = `
### Tech Stack
- **Frontend**: Next.js App Router
- **Frontend Entry Point**: src/app/page.tsx
- **Backend**: Next.js API Routes
- **Backend Entry Point**: src/app/api/[...slug]/route.ts
- **Database**: SQLite
- **ORM**: Prisma
- **Authentication**: None — no auth needed
- **Build Tool**: None
- **Additional**: Stripe

### Project Folder Structure
project-root/
└── src/
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
    │   ├── prisma.ts
    │   └── stripe.ts
    └── styles/
        └── globals.css

### Modules
**Frontend Module**
- Responsibility: Main page and components
- Owned Files: src/app/page.tsx, src/app/components/ProductCard.tsx, src/app/components/SearchBar.tsx, src/app/components/CartItem.tsx, src/styles/globals.css
- Depends On: Database Module
- Supports Features: Product Catalog & Search

**Backend API Module**
- Responsibility: Handles API routing and checkout
- Owned Files: src/app/api/[...slug]/route.ts
- Depends On: Database Module
- Supports Features: API & Payments

**Database Module**
- Responsibility: Prisma client and Stripe helper
- Owned Files: src/lib/prisma.ts, src/lib/stripe.ts
- Depends On: None
- Supports Features: Persistence & Payment API
`;

  const ecomContract = extractProjectContract({
    'architecture.md': ecomArch,
    'backend_spec.md': `
### API Endpoints
**GET /api/products** — Search catalog
- Request Body: None
- Auth Required: No

**POST /api/checkout** — Stripe checkout
- Request Body: Cart items
- Auth Required: No
`,
    'prisma/schema.prisma': `
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

generator client {
  provider = "prisma-client-js"
}

model Product {
  id          String @id @default(uuid())
  name        String
  price       Float
}
`,
  });

  const valEcomArch = validateArchitectureArtifact(ecomArch, ecomContract);
  assert.deepStrictEqual(valEcomArch.errors, [], 'Expected full E-Commerce architecture.md artifact to pass validation');

  const valEcomContract = validateProjectContract(ecomContract);
  assert.deepStrictEqual(valEcomContract.errors, [], 'Expected full E-Commerce contract to pass validation');

  const valEcomApi = validateApiContracts(ecomContract, {
    'src/app/api/[...slug]/route.ts': 'export async function GET() { return Response.json([]); } export async function POST() { return Response.json({ url: "" }); }',
  });
  assert.strictEqual(valEcomApi.valid, true, 'Expected E-Commerce API routes matching [...slug] to pass API validation');

  const valEcomFramework = validateFrameworkBoundaries(
    {
      'src/app/page.tsx': 'import { prisma } from "../lib/prisma"; export default async function Page() { return <div>Store</div>; }',
      'src/app/components/ProductCard.tsx': '"use client"\nimport React from "react"; export function ProductCard() { return <div>Card</div>; }',
      'src/app/api/[...slug]/route.ts': 'import { prisma } from "../../../lib/prisma"; import Stripe from "stripe"; export async function GET() { return Response.json([]); }',
    },
    'NEXT_APP_ROUTER',
    ecomContract
  );
  assert.strictEqual(valEcomFramework.valid, true, 'Expected E-Commerce framework boundary check to pass');

  console.log('✅ All Kanban & E-Commerce spec contract regression assertions (A-T + Regressions 1-16 + Architect RCA Tests A-N + Full E-Commerce Fixture) passed successfully.');
}

if (require.main === module) {
  runKanbanContractTests();
}
