import assert from 'node:assert';
import { extractProjectContract, validateProjectContract } from '../spec-contract';

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

  console.log('✅ All Kanban spec contract regression assertions passed successfully.');
}

if (require.main === module) {
  runKanbanContractTests();
}
