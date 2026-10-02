import assert from 'node:assert';
import { extractProjectContract, validateProjectContract } from '../spec-contract';
import { validateFrameworkBoundaries } from '../framework-validator';
import { validateReactHookImports, ProjectValidationError } from '../project-validator';
import { probeGeneratedProjectRoutes } from '../runtime-validator';
import { validateApiContracts } from '../api-contract-validator';

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

  console.log('✅ All Kanban spec contract regression assertions (A-T) passed successfully.');
}

if (require.main === module) {
  runKanbanContractTests();
}
