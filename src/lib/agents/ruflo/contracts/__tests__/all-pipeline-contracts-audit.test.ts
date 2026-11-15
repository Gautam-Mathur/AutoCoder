import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateStageCandidate, StageAcceptanceContext } from '../../stage-acceptance';
import { validateArchitectureArtifact, extractProjectContract, validateProjectContract } from '../../spec-contract';
import { computeAuthorizedFileSet } from '../../workspace-policy';
import { sanitizeCoderOutputForFile } from '../../orchestrator';
import { createContentHash } from '../fingerprints';
import { STAGE_CONTRACTS, getStageContract } from '../registry';
import { CONTRACT_VERSIONS, StageName } from '../versions';

/**
 * Reusable audit helper to validate any pipeline stage candidate artifact
 * against its full contract invariants, upstream context, and evidence.
 */
export async function auditStageCandidateContract(params: {
  stage: StageName;
  content: string;
  upstreamContext?: Record<string, string>;
  evidence?: any;
}): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
  const contentHash = createContentHash(params.content);
  const ctx: StageAcceptanceContext = {
    conversationId: 'audit-reusable-conv',
    pipelineRunId: 'audit-reusable-run',
    candidate: {
      stage: params.stage,
      executionId: `audit-exec-${params.stage.toLowerCase()}`,
      attempt: 1,
      content: params.content,
      contentHash,
      generatedAt: new Date(),
    },
    upstreamContext: params.upstreamContext,
    evidence: params.evidence,
  };

  const result = await validateStageCandidate(ctx);
  return {
    valid: result.accepted,
    errors: result.errors,
    warnings: result.warnings,
  };
}

describe('All Pipeline Contracts & Worst-Case Mismatches Audit Suite', () => {
  // ─── Golden Reference Fixtures for All 11 Stages ──────────────────────────

  const validQueen = `### Project Name
E-Commerce Storefront

### Project Goal
A fast, modern online shopping application with Stripe checkout.

### MVP Scope
- Product catalog browsing and search
- Shopping cart management
- Secure checkout process

### Technical Constraints
- SQLite with Prisma ORM
- Next.js App Router

### Risks
- Handling payment gateway timeouts gracefully`;

  const validPlanner = `### Features
- Feature-001: Product Catalog Browsing
- Feature-002: Product Search Functionality
- Feature-003: Stripe Checkout Integration

### Functional Requirements
- FR-001: Users can view product details and filter products by category.
- FR-002: Users can search products by keyword.
- FR-003: Users can complete payment via Stripe.

### Acceptance Criteria
- AC-1: Given a search query, matching products are displayed within 500ms.
- AC-2: Checkout button redirects to Stripe payment session.`;

  const validArchitect = `### Tech Stack
- **Frontend**: React
- **Frontend Entry Point**: src/app/page.tsx
- **Backend**: Next.js API Routes
- **Backend Entry Point**: src/app/api/products/route.ts
- **Database**: SQLite
- **ORM**: Prisma
- **Authentication**: None
- **Build Tool**: Next.js
- **Additional**: None

### Project Folder Structure
project-root/
├── src/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   └── api/
│   │       ├── products/
│   │       │   └── route.ts
│   │       └── checkout/
│   │           └── route.ts
│   ├── components/
│   │   ├── ProductCard.tsx
│   │   └── SearchBar.tsx
│   ├── lib/
│   │   ├── prisma.ts
│   │   └── stripe.ts
│   └── styles/
│       └── globals.css
├── public/
│   └── favicon.ico
├── package.json
├── tsconfig.json
├── prisma/
│   └── schema.prisma
└── README.md

### Project Files
- src/app/page.tsx
- src/app/layout.tsx
- src/app/api/products/route.ts
- src/app/api/checkout/route.ts
- src/components/ProductCard.tsx
- src/components/SearchBar.tsx
- src/lib/prisma.ts
- src/lib/stripe.ts
- src/styles/globals.css
- public/favicon.ico
- package.json
- tsconfig.json
- prisma/schema.prisma
- README.md

### Modules

**Storefront UI**
- Responsibility: Renders main store views and search components
- Owned Files: src/app/page.tsx, src/app/layout.tsx, src/components/ProductCard.tsx, src/components/SearchBar.tsx, src/styles/globals.css
- Depends On: Products API
- Supports Features: Feature-001, Feature-002

**Products API**
- Responsibility: Handles product retrieval and search endpoints
- Owned Files: src/app/api/products/route.ts
- Depends On: Database Module
- Supports Features: Feature-001, Feature-002

**Payment Service**
- Responsibility: Handles Stripe checkout session creation
- Owned Files: src/app/api/checkout/route.ts, src/lib/stripe.ts
- Depends On: Database Module
- Supports Features: Feature-003

**Database Module**
- Responsibility: Manages SQLite database and Prisma client
- Owned Files: src/lib/prisma.ts, prisma/schema.prisma
- Depends On: None
- Supports Features: Feature-001, Feature-003

### Conventions
- **File Naming**: camelCase for source files
- **Function Naming**: camelCase
- **Import Style**: ES6 modules`;

  const validSystem = `### Database Design
\`\`\`prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

generator client {
  provider = "prisma-client-js"
}

model Product {
  id    String @id @default(uuid())
  title String
  price Float
}
\`\`\`

### Seed Data
\`\`\`json
[
  { "title": "Coffee Maker", "price": 49.99 }
]
\`\`\`

### API Endpoints
- GET /api/products -> src/app/api/products/route.ts
- POST /api/checkout -> src/app/api/checkout/route.ts`;

  const validDesigner = `### Design System
- Colors: Primary #0052FF, Neutral #111827
- Typography: Inter, sans-serif
- Breakpoints: Mobile < 640px, Desktop >= 640px

### Pages
**Home Page** (/) — Public
- Features: Feature-001, Feature-002
- Components: ProductCard, SearchBar

**Checkout Page** (/checkout) — Public
- Features: Feature-003
- Components: PaymentButton

### Components
**ProductCard**
- Supports: Feature-001
- Props: title, price

**SearchBar**
- Supports: Feature-002
- Props: onSearch

### Global Feedback
- Toast notifications for cart actions`;

  const validBlueprint = `### File: src/styles/globals.css
- **Owner Module**: Storefront UI
- **Purpose**: Global application styles
- **Dependencies**: None
- **Specs Required**: CSS styles
- **Exports**: None

### File: src/components/ProductCard.tsx
- **Owner Module**: Storefront UI
- **Purpose**: Renders individual product card
- **Dependencies**: None
- **Specs Required**: React component
- **Exports**: export function ProductCard

### File: src/components/SearchBar.tsx
- **Owner Module**: Storefront UI
- **Purpose**: Search input box
- **Dependencies**: None
- **Specs Required**: Search component
- **Exports**: export function SearchBar

### File: src/lib/prisma.ts
- **Owner Module**: Database Module
- **Purpose**: Prisma singleton client
- **Dependencies**: None
- **Specs Required**: DB connection
- **Exports**: export const prisma

### File: prisma/schema.prisma
- **Owner Module**: Database Module
- **Purpose**: Prisma data model
- **Dependencies**: None
- **Specs Required**: Product schema
- **Exports**: None

### File: src/lib/stripe.ts
- **Owner Module**: Payment Service
- **Purpose**: Stripe SDK client
- **Dependencies**: None
- **Specs Required**: Stripe initialization
- **Exports**: export const stripe

### File: src/app/api/products/route.ts
- **Owner Module**: Products API
- **Purpose**: Product list endpoint
- **Dependencies**: src/lib/prisma.ts
- **Specs Required**: GET handler
- **Exports**: export async function GET

### File: src/app/api/checkout/route.ts
- **Owner Module**: Payment Service
- **Purpose**: Stripe checkout endpoint
- **Dependencies**: src/lib/stripe.ts, src/lib/prisma.ts
- **Specs Required**: POST handler
- **Exports**: export async function POST

### File: src/app/layout.tsx
- **Owner Module**: Storefront UI
- **Purpose**: Root application layout
- **Dependencies**: src/styles/globals.css
- **Specs Required**: Root layout
- **Exports**: export default function RootLayout

### File: src/app/page.tsx
- **Owner Module**: Storefront UI
- **Purpose**: Storefront home page
- **Dependencies**: src/components/ProductCard.tsx, src/components/SearchBar.tsx
- **Specs Required**: Storefront page
- **Exports**: export default function HomePage`;

  const validWorkspaceFiles: Record<string, string> = {
    'src/app/page.tsx': 'export default function HomePage() { return <div>Home</div>; }',
    'src/app/layout.tsx': 'export default function RootLayout({ children }: { children: any }) { return <html><body>{children}</body></html>; }',
    'src/app/api/products/route.ts': 'export async function GET() { return Response.json([]); }',
    'src/app/api/checkout/route.ts': 'export async function POST() { return Response.json({ url: "/success" }); }',
    'src/components/ProductCard.tsx': 'export function ProductCard() { return <div>Card</div>; }',
    'src/components/SearchBar.tsx': 'export function SearchBar() { return <input type="search" />; }',
    'src/lib/prisma.ts': 'export const prisma = {};',
    'src/lib/stripe.ts': 'export const stripe = {};',
    'src/styles/globals.css': 'body { margin: 0; }',
    'prisma/schema.prisma': 'datasource db { provider = "sqlite" }',
    'public/favicon.ico': '',
    'package.json': '{"name":"store"}',
    'tsconfig.json': '{"compilerOptions":{}}',
    'README.md': '# Store',
  };

  const validCoderManifest = JSON.stringify(
    {
      schemaVersion: '1.2.0',
      projectRoot: '.',
      files: Object.entries(validWorkspaceFiles).map(([path, content]) => ({
        path,
        hash: createContentHash(content),
      })),
      directories: ['src', 'src/app', 'src/components', 'src/lib', 'src/styles', 'public', 'prisma'],
      entryPoints: ['src/app/page.tsx'],
      generatedAt: new Date().toISOString(),
      sourceStageExecutionId: 'exec-coder',
      architectureFileSetHash: 'arch123',
      blueprintFileSetHash: 'blue123',
      workspaceFileSetHash: 'ws123',
      authorizedFileSetHash: 'auth123',
    },
    null,
    2
  );

  const testWorkspaceHash = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  const validTester = `# Test Report

### Result
PASS

### Summary
All deterministic unit and build tests passed with 0 errors.

### Tests
- Syntax: PASS
- TypeScript: PASS
- Build: PASS

### Failures
None

### Workspace Hash
${testWorkspaceHash}`;

  const validDebugger = `# Debug Report

### Issues Addressed
- File: src/components/ProductCard.tsx
- Relevant diagnostic: None
- Root cause: Pre-emptive check
- Result: Clean

### Patches Applied
- File: src/components/ProductCard.tsx
- Area changed: Line 1
- What was changed: Verified export signature
- Why: Consistency

### Verification
- Ran check_syntax: passed 0 errors.`;

  const validSecurity = `# Security Report

### Overall Status
SECURE

### Security Score
95

### Vulnerabilities Found
None

### Security Checks Performed
- Authentication and session management: PASS
- Data input validation and sanitization: PASS
- Secret and credential leakage: PASS
- Guarded DOM dereferences: PASS

### Recommendations
None. Workspace adheres to all baseline security invariants.

### Workspace Hash
${testWorkspaceHash}`;

  const validReviewer = `# Review Report

### Overall Assessment
Code adheres strictly to the modular architectural contract.

### Quality Score
92

### Architectural Conformance
PASS

### Requirement Coverage
PASS

### Findings
- No architectural drift observed.
- All functional requirements covered.

### Workspace Hash
${testWorkspaceHash}`;

  // ─── Happy Path: All 11 Stages Must Pass ───────────────────────────────────

  it('1. Baseline Happy Path: verifies all 11 stages pass their contract validators cleanly', async () => {
    const upstream: Record<string, string> = {
      'plan.md': validQueen,
      'requirements.md': validPlanner,
      'architecture.md': validArchitect,
      'backend_spec.md': validSystem,
      'ui_spec.md': validDesigner,
      'blueprint.md': validBlueprint,
      'workspace.manifest.json': validCoderManifest,
      'test_report.md': validTester,
    };

    const queenRes = await auditStageCandidateContract({ stage: 'Queen', content: validQueen });
    assert.strictEqual(queenRes.valid, true, `Queen failed: ${queenRes.errors.join(', ')}`);

    const plannerRes = await auditStageCandidateContract({ stage: 'Planner', content: validPlanner, upstreamContext: upstream });
    assert.strictEqual(plannerRes.valid, true, `Planner failed: ${plannerRes.errors.join(', ')}`);

    const archRes = await auditStageCandidateContract({ stage: 'Architect', content: validArchitect, upstreamContext: upstream });
    assert.strictEqual(archRes.valid, true, `Architect failed: ${archRes.errors.join(', ')}`);

    const systemRes = await auditStageCandidateContract({ stage: 'System', content: validSystem, upstreamContext: upstream });
    assert.strictEqual(systemRes.valid, true, `System failed: ${systemRes.errors.join(', ')}`);

    const designerRes = await auditStageCandidateContract({ stage: 'Designer', content: validDesigner, upstreamContext: upstream });
    assert.strictEqual(designerRes.valid, true, `Designer failed: ${designerRes.errors.join(', ')}`);

    const blueprinterRes = await auditStageCandidateContract({ stage: 'Blueprinter', content: validBlueprint, upstreamContext: upstream });
    assert.strictEqual(blueprinterRes.valid, true, `Blueprinter failed: ${blueprinterRes.errors.join(', ')}`);

    const coderRes = await auditStageCandidateContract({ stage: 'Coder', content: validCoderManifest, upstreamContext: upstream });
    assert.strictEqual(coderRes.valid, true, `Coder failed: ${coderRes.errors.join(', ')}`);

    const testerRes = await auditStageCandidateContract({
      stage: 'Tester',
      content: validTester,
      evidence: { currentWorkspaceHash: testWorkspaceHash },
    });
    assert.strictEqual(testerRes.valid, true, `Tester failed: ${testerRes.errors.join(', ')}`);

    const debuggerRes = await auditStageCandidateContract({ stage: 'Debugger', content: validDebugger });
    assert.strictEqual(debuggerRes.valid, true, `Debugger failed: ${debuggerRes.errors.join(', ')}`);

    const securityRes = await auditStageCandidateContract({
      stage: 'Security',
      content: validSecurity,
      evidence: { currentWorkspaceHash: testWorkspaceHash, workspaceFiles: validWorkspaceFiles },
    });
    assert.strictEqual(securityRes.valid, true, `Security failed: ${securityRes.errors.join(', ')}`);

    const reviewerRes = await auditStageCandidateContract({
      stage: 'Reviewer',
      content: validReviewer,
      evidence: { currentWorkspaceHash: testWorkspaceHash },
    });
    assert.strictEqual(reviewerRes.valid, true, `Reviewer failed: ${reviewerRes.errors.join(', ')}`);
  });

  // ─── Architect Worst-Case Invariant & Mismatch Matrix ──────────────────────

  describe('Architect Contract Worst-Case Scenarios', () => {
    it('catches DUPLICATE file ownership across multiple modules (the exact observed failure)', async () => {
      // Modify validArchitect so both "API Routes" and "Payment Service" claim "src/app/api/route.ts"
      const duplicateOwnershipArch = validArchitect.replace(
        '- Owned Files: src/app/api/products/route.ts',
        '- Owned Files: src/app/api/route.ts'
      ).replace(
        '- Owned Files: src/app/api/checkout/route.ts, src/lib/stripe.ts',
        '- Owned Files: src/app/api/route.ts, src/lib/stripe.ts'
      );

      const res = await auditStageCandidateContract({ stage: 'Architect', content: duplicateOwnershipArch });
      assert.strictEqual(res.valid, false, 'Expected duplicate file ownership to be rejected');
      assert.ok(
        res.errors.some((e) => e.includes('is claimed by modules') && e.includes('src/app/api/route.ts')),
        `Expected "is claimed by modules" error, got: ${res.errors.join('; ')}`
      );
    });

    it('catches orphan module files claimed by a module but absent from Project Folder Structure', async () => {
      const orphanFileArch = validArchitect.replace(
        '- Owned Files: src/lib/prisma.ts, prisma/schema.prisma',
        '- Owned Files: src/lib/prisma.ts, prisma/schema.prisma, src/lib/ghost.ts'
      );

      const res = await auditStageCandidateContract({ stage: 'Architect', content: orphanFileArch });
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some((e) => e.includes('absent from Project Folder Structure')));
    });

    it('catches unclaimed implementation files in tree but missing from all module Owned Files', async () => {
      const unclaimedFileArch = validArchitect.replace(
        '│   │   └── SearchBar.tsx',
        '│   │   ├── SearchBar.tsx\n│   │   └── UnclaimedModal.tsx'
      ).replace(
        '- src/components/SearchBar.tsx',
        '- src/components/SearchBar.tsx\n- src/components/UnclaimedModal.tsx'
      );

      const res = await auditStageCandidateContract({ stage: 'Architect', content: unclaimedFileArch });
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some((e) => e.includes('is not claimed by any module')));
    });

    it('catches cyclic module dependencies (Module A -> Module B -> Module A)', async () => {
      const cycleArch = validArchitect.replace(
        '**Database Module**\n- Responsibility: Manages SQLite database and Prisma client\n- Owned Files: src/lib/prisma.ts, prisma/schema.prisma\n- Depends On: None',
        '**Database Module**\n- Responsibility: Manages SQLite database and Prisma client\n- Owned Files: src/lib/prisma.ts, prisma/schema.prisma\n- Depends On: Storefront UI'
      );

      const res = await auditStageCandidateContract({ stage: 'Architect', content: cycleArch });
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some((e) => e.toLowerCase().includes('cycle') || e.toLowerCase().includes('circular')));
    });

    it('catches self-referencing module dependencies (Module A -> Module A)', async () => {
      const selfDepArch = validArchitect.replace(
        '**Database Module**\n- Responsibility: Manages SQLite database and Prisma client\n- Owned Files: src/lib/prisma.ts, prisma/schema.prisma\n- Depends On: None',
        '**Database Module**\n- Responsibility: Manages SQLite database and Prisma client\n- Owned Files: src/lib/prisma.ts, prisma/schema.prisma\n- Depends On: Database Module'
      );

      const res = await auditStageCandidateContract({ stage: 'Architect', content: selfDepArch });
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some((e) => e.toLowerCase().includes('self') || e.toLowerCase().includes('cycle')));
    });

    it('catches unnamed dynamic route segments like [...] or []', async () => {
      const unnamedRouteArch = validArchitect.replace(
        'src/app/api/products/route.ts',
        'src/app/api/[...]/route.ts'
      );

      const res = await auditStageCandidateContract({ stage: 'Architect', content: unnamedRouteArch });
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some((e) => e.includes('unnamed') || e.includes('[...]')));
    });

    it('catches invalid static asset directory placement (src/public/ instead of root public/)', async () => {
      const srcPublicArch = validArchitect.replace(
        'public/\n│   └── favicon.ico',
        'src/\n│   └── public/\n│       └── favicon.ico'
      ).replace(
        '- public/favicon.ico',
        '- src/public/favicon.ico'
      );

      const res = await auditStageCandidateContract({ stage: 'Architect', content: srcPublicArch });
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some((e) => e.includes('src/public')));
    });

    it('catches file paths or npm packages listed in Depends On instead of module names', async () => {
      const badDepArch = validArchitect.replace(
        '- Depends On: Products API',
        '- Depends On: src/app/api/products/route.ts, @prisma/client'
      );

      const res = await auditStageCandidateContract({ stage: 'Architect', content: badDepArch });
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some((e) => e.includes('Depends On')));
    });
  });

  // ─── System Stage Worst-Case & Cross-Stage Contradiction Matrix ───────────

  describe('System Contract Worst-Case Scenarios', () => {
    it('catches cross-stage contradiction when Architecture declares Authentication: None but System requires auth on endpoints', async () => {
      const authEndpointSystem = validSystem.replace(
        '- POST /api/checkout -> src/app/api/checkout/route.ts',
        '- POST /api/checkout (auth required: yes) -> src/app/api/checkout/route.ts'
      );

      const res = await auditStageCandidateContract({
        stage: 'System',
        content: authEndpointSystem,
        upstreamContext: {
          'plan.md': validQueen,
          'requirements.md': validPlanner,
          'architecture.md': validArchitect,
        },
      });

      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some((e) => e.includes('Specification Contradiction') && e.includes('Authentication is set to NONE')));
    });

    it('catches cross-stage contradiction when backend_spec declares No Backend Required but architecture requires Database/ORM', async () => {
      const noBackendSystem = `### No Backend Required\nNo backend, database, or API endpoints are needed. This is a frontend-only application.`;

      const res = await auditStageCandidateContract({
        stage: 'System',
        content: noBackendSystem,
        upstreamContext: {
          'plan.md': validQueen,
          'requirements.md': validPlanner,
          'architecture.md': validArchitect,
        },
      });

      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some((e) => e.includes('Specification Contradiction') && e.includes('No Backend Required')));
    });

    it('catches API endpoint file paths that do not exist in architecture project files', async () => {
      const unmappedEndpointSystem = validSystem.replace(
        '- POST /api/checkout -> src/app/api/checkout/route.ts',
        '- POST /api/checkout -> src/app/api/nonexistent/route.ts'
      );

      const res = await auditStageCandidateContract({
        stage: 'System',
        content: unmappedEndpointSystem,
        upstreamContext: {
          'architecture.md': validArchitect,
        },
      });

      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some((e) => e.includes('absent from architecture project files')));
    });
  });

  // ─── Designer Stage Worst-Case Traceability Matrix ────────────────────────

  describe('Designer Contract Worst-Case Scenarios', () => {
    it('catches missing Feature-NNN traceability when a Planner feature is omitted from Designer', async () => {
      // Valid planner has Feature-001, Feature-002, Feature-003.
      // In this designer candidate, Feature-003 is omitted.
      const omittedFeatureDesigner = validDesigner.replace(/Feature-003/g, 'Feature-001');

      const res = await auditStageCandidateContract({
        stage: 'Designer',
        content: omittedFeatureDesigner,
        upstreamContext: {
          'requirements.md': validPlanner,
        },
      });

      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some((e) => e.includes('Feature ID "Feature-003"') && e.includes('missing from Designer')));
    });

    it('catches missing mandatory sections in Designer report', async () => {
      const missingSectionDesigner = validDesigner.replace('### Global Feedback\n- Toast notifications for cart actions', '');
      const res = await auditStageCandidateContract({ stage: 'Designer', content: missingSectionDesigner });
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some((e) => e.includes('Missing required section "### Global Feedback"')));
    });
  });

  // ─── Blueprinter Worst-Case Authorization Matrix ──────────────────────────

  describe('Blueprinter Contract Worst-Case Scenarios', () => {
    it('rejects Blueprinter candidate that invents unauthorized files not in architecture.md', async () => {
      const rogueBlueprint = `${validBlueprint}\n\n### File: src/components/RogueBackdoor.tsx\n- **Owner Module**: Storefront UI\n- **Purpose**: Rogue injection\n- **Dependencies**: None\n- **Specs Required**: Code\n- **Exports**: None`;

      const { authorizedFileSet, errors } = computeAuthorizedFileSet(validArchitect, rogueBlueprint);
      assert.ok(errors.length > 0);
      assert.ok(errors.some((e) => e.includes('RogueBackdoor.tsx')));
    });

    it('rejects Blueprinter candidate that omits required implementation files declared in architecture.md', async () => {
      // Remove src/app/api/checkout/route.ts from blueprint
      const incompleteBlueprint = validBlueprint.replace(/### File: src\/app\/api\/checkout\/route\.ts[\s\S]*?(?=### File:)/, '');

      const { authorizedFileSet, errors } = computeAuthorizedFileSet(validArchitect, incompleteBlueprint);
      assert.ok(errors.length > 0);
      assert.ok(errors.some((e) => e.includes('src/app/api/checkout/route.ts')));
    });
  });

  // ─── Coder & Sanitizer Worst-Case Matrix ──────────────────────────────────

  describe('Coder Contract & Sanitizer Defense Worst-Case Scenarios', () => {
    it('rejects pure pseudo-XML tool calls and returns empty from sanitizer', () => {
      const rawXml = `<function=list_files>\n</function>\n</tool_call>`;
      const sanitizedJson = sanitizeCoderOutputForFile(rawXml, 'package.json');
      const sanitizedMd = sanitizeCoderOutputForFile(rawXml, 'README.md');
      const sanitizedTs = sanitizeCoderOutputForFile(rawXml, 'src/app/page.tsx');

      assert.strictEqual(sanitizedJson, '');
      assert.strictEqual(sanitizedMd, '');
      assert.strictEqual(sanitizedTs, '');
    });

    it('rejects malformed or non-JSON content submitted as Coder workspace manifest', async () => {
      const nonJsonContent = 'I am done writing code!';
      const res = await auditStageCandidateContract({ stage: 'Coder', content: nonJsonContent });
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some((e) => e.includes('valid WorkspaceManifest JSON')));
    });
  });

  // ─── Tester Worst-Case Invariants ─────────────────────────────────────────

  describe('Tester Contract Worst-Case Scenarios', () => {
    it('rejects test report with unknown or invalid Result token', async () => {
      const invalidTokenTester = validTester.replace('### Result\nPASS', '### Result\nMAYBE');
      const res = await auditStageCandidateContract({
        stage: 'Tester',
        content: invalidTokenTester,
        evidence: { currentWorkspaceHash: testWorkspaceHash },
      });
      assert.strictEqual(res.valid, false);
    });

    it('rejects test report with stale workspace hash', async () => {
      const staleTester = validTester.replace(testWorkspaceHash, 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef');
      const res = await auditStageCandidateContract({
        stage: 'Tester',
        content: staleTester,
        evidence: { currentWorkspaceHash: testWorkspaceHash },
      });
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some((e) => e.includes('Stale workspace hash')));
    });
  });

  // ─── Debugger Worst-Case Invariants ───────────────────────────────────────

  describe('Debugger Contract Worst-Case Scenarios', () => {
    it('rejects Debugger candidate that attempts to patch control-plane artifacts', async () => {
      const controlPlanePatchDebugger = validDebugger.replaceAll(
        'src/components/ProductCard.tsx',
        'architecture.md'
      );

      const res = await auditStageCandidateContract({ stage: 'Debugger', content: controlPlanePatchDebugger });
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some((e) => e.includes('control plane artifact')));
    });
  });

  // ─── Security Worst-Case Evidence Cross-Check Matrix ──────────────────────

  describe('Security Contract Worst-Case Scenarios', () => {
    it('rejects FALSE PASS: report claims SECURE (score 95) when workspace contains an unguarded DOM dereference', async () => {
      const vulnerableFiles = {
        ...validWorkspaceFiles,
        'src/components/Vulnerable.ts': 'const btn = document.getElementById("pay"); btn.innerHTML = "Pay Now";', // Unguarded DOM innerHTML dereference!
      };

      const res = await auditStageCandidateContract({
        stage: 'Security',
        content: validSecurity,
        evidence: {
          currentWorkspaceHash: testWorkspaceHash,
          workspaceFiles: vulnerableFiles,
        },
      });

      assert.strictEqual(res.valid, false);
      assert.ok(
        res.errors.some((e) => e.includes('Security Evidence Error') && e.includes('blocking issue')),
        `Expected Security Evidence Error for false PASS, got: ${res.errors.join('; ')}`
      );
    });

    it('rejects Security report with stale workspace hash', async () => {
      const staleSecurity = validSecurity.replace(testWorkspaceHash, 'cafebabecafebabecafebabecafebabecafebabecafebabecafebabecafebabe');
      const res = await auditStageCandidateContract({
        stage: 'Security',
        content: staleSecurity,
        evidence: { currentWorkspaceHash: testWorkspaceHash, workspaceFiles: validWorkspaceFiles },
      });
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some((e) => e.includes('Stale workspace hash')));
    });
  });

  // ─── Reviewer Worst-Case Invariants ───────────────────────────────────────

  describe('Reviewer Contract Worst-Case Scenarios', () => {
    it('rejects Reviewer candidate with quality score below 80', async () => {
      const lowScoreReviewer = validReviewer.replace('### Quality Score\n92', '### Quality Score\n72');
      const res = await auditStageCandidateContract({
        stage: 'Reviewer',
        content: lowScoreReviewer,
        evidence: { currentWorkspaceHash: testWorkspaceHash },
      });
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some((e) => e.includes('below required minimum of 80')));
    });

    it('rejects Reviewer candidate when Architectural Conformance or Requirement Coverage is FAIL', async () => {
      const failingReviewer = validReviewer.replace('### Architectural Conformance\nPASS', '### Architectural Conformance\nFAIL');
      const res = await auditStageCandidateContract({
        stage: 'Reviewer',
        content: failingReviewer,
        evidence: { currentWorkspaceHash: testWorkspaceHash },
      });
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some((e) => e.includes('Architectural conformance is false')));
    });

    it('rejects Reviewer report with stale workspace hash', async () => {
      const staleReviewer = validReviewer.replace(testWorkspaceHash, '1111222233334444555566667777888811112222333344445555666677778888');
      const res = await auditStageCandidateContract({
        stage: 'Reviewer',
        content: staleReviewer,
        evidence: { currentWorkspaceHash: testWorkspaceHash },
      });
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some((e) => e.includes('Stale workspace hash')));
    });
  });
});
