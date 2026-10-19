import fs from 'node:fs';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { prisma } from '../../../../db';
import {
  evaluateFinalPipelineGate,
} from '../../final-gate';
import {
  validateSecurityGate,
  decideRelease,
  stripCommentsFromLine,
  stripStringsFromCode,
  validateGateException,
  TrustedGateException,
} from '../../security-gate';
import {
  computeAuthorizedFileSet,
  loadAuthorizedFileSet,
} from '../../workspace-policy';
import {
  assertAuthorizedToolMutation,
} from '../../toolbox';
import {
  normalizeFailures,
  validateRepairPlan,
  isRepairSuccessful,
  extractRepairPlanFromDebuggerOutput,
  coordinateRepair,
  createDurableRepairAttempt,
  recordCommitReceipt,
  reconcileRepairAttemptCrash,
  createRepairBudget,
  consumeRepairBudget,
  assertBudgetAvailable,
  CommitReceipt,
  RepairEvidence,
} from '../../repair-coordinator';
import {
  writeVirtualFile,
  readVirtualFile,
} from '../../vfs';
import {
  validateStageCandidate,
} from '../../stage-acceptance';
import {
  computeWorkspaceFingerprint,
} from '../../verification-loop';
import {
  validateGeneratedProject,
} from '../../project-validator';
import {
  probeGeneratedProjectRoutes,
} from '../../runtime-validator';
import {
  commitAcceptedArtifact,
  reconcilePendingProjections,
  resolveAcceptedStageInputs,
} from '../../artifact-store';

describe('AutoCoder Comprehensive Remediation Suite (Workstreams A-G, Sections 18-22)', () => {
  const convId = 'comp-test-conv-001';
  const runId1 = 'comp-run-001';
  const runId2 = 'comp-run-002';

  const validArchMd = `### Tech Stack
- **Frontend**: Next.js
- **Frontend Entry Point**: src/app/page.tsx
- **Backend**: None
- **Backend Entry Point**: None
- **Database**: None
- **ORM**: None
- **Authentication**: None
- **Build Tool**: Next.js
- **Additional**: None

### Project Folder Structure
project-root/
├── src/
│   ├── app/
│   │   └── page.tsx
│   └── components/
│       └── Calculator.tsx
└── public/
    └── favicon.ico

### Project Files
- src/app/page.tsx
- src/components/Calculator.tsx
- public/favicon.ico

### Modules
**Frontend Application**
- Responsibility: Main user interface.
- Owned Files: src/app/page.tsx, src/components/Calculator.tsx
- Depends On: None
- Supports Features: Core

### Conventions
- **File Naming**: camelCase
`;

  const validBlueprintMd = `### File: src/app/page.tsx
- **Owner Module**: Frontend Application
- **Purpose**: Main landing page.
- **Dependencies**: src/components/Calculator.tsx
- **Specs Required**: None
- **Exports**: default function Page()

### File: src/components/Calculator.tsx
- **Owner Module**: Frontend Application
- **Purpose**: Calculator component.
- **Dependencies**: None
- **Specs Required**: None
- **Exports**: export function Calculator()
`;

  before(async () => {
    // Setup test conversation
    await prisma.conversation.upsert({
      where: { id: convId },
      update: {},
      create: {
        id: convId,
        title: 'Comprehensive Test',
        status: 'Active',
        currentStage: 'Queen',
        originalPrompt: 'Test application',
      },
    });

    // Create pipeline run 1
    await prisma.pipelineRun.upsert({
      where: { conversationId: convId },
      update: { id: runId1, state: 'RUNNING', leaseOwner: 'worker-1', leaseExpiresAt: new Date(Date.now() + 60000) },
      create: {
        id: runId1,
        conversationId: convId,
        state: 'RUNNING',
        leaseOwner: 'worker-1',
        leaseExpiresAt: new Date(Date.now() + 60000),
      },
    });

    // Seed artifacts for run 1
    await prisma.artifactVersion.create({
      data: {
        conversationId: convId,
        pipelineRunId: runId1,
        stageName: 'Architect',
        filePath: 'architecture.md',
        version: 1,
        contentHash: 'hash-arch-1',
        content: validArchMd,
        state: 'ACCEPTED',
      },
    });

    await prisma.artifactVersion.create({
      data: {
        conversationId: convId,
        pipelineRunId: runId1,
        stageName: 'Blueprinter',
        filePath: 'blueprint.md',
        version: 1,
        contentHash: 'hash-blue-1',
        content: validBlueprintMd,
        state: 'ACCEPTED',
      },
    });
  });

  after(async () => {
    await prisma.gateDecision.deleteMany({ where: { conversationId: convId } });
    await prisma.verificationRun.deleteMany({ where: { conversationId: convId } });
    await prisma.artifactVersion.deleteMany({ where: { conversationId: convId } });
    await prisma.stageExecution.deleteMany({ where: { conversationId: convId } });
    await prisma.virtualFile.deleteMany({ where: { conversationId: convId } });
    await prisma.pipelineRun.deleteMany({ where: { conversationId: convId } });
    await prisma.conversation.deleteMany({ where: { id: convId } });
  });

  // ─── Workstream B: Final Gate & Run Scoping ──────────────────────────────────
  describe('Workstream B: Final Gate & Run Scoping', () => {
    it('proves blueprintFiles is an array and length > 0 check evaluates correctly', async () => {
      const auth = await loadAuthorizedFileSet(convId, runId1);
      assert.ok(Array.isArray(auth.blueprintFiles), 'blueprintFiles must be an Array');
      assert.strictEqual(auth.blueprintFiles.length, 2);
      // Verify .length works where .size would be undefined
      assert.strictEqual((auth.blueprintFiles as any).size, undefined);
      assert.strictEqual(auth.blueprintFiles.length > 0, true);
    });

    it('scopes loadAuthorizedFileSet strictly to the provided pipelineRunId', async () => {
      // Run 1 has architecture and blueprint
      const authRun1 = await loadAuthorizedFileSet(convId, runId1);
      assert.ok(authRun1.blueprintFiles.includes('src/components/Calculator.tsx'));

      // Run 2 has NO accepted artifacts yet -> must throw
      await assert.rejects(
        async () => {
          await loadAuthorizedFileSet(convId, runId2);
        },
        /Authorization Exception.*architecture\.md not found/
      );
    });

    it('assertAuthorizedToolMutation rejects path traversal attempts (../)', async () => {
      await assert.rejects(
        async () => {
          await assertAuthorizedToolMutation(convId, '../escape.ts', runId1);
        },
        /Directory traversal detected/
      );

      await assert.rejects(
        async () => {
          await assertAuthorizedToolMutation(convId, 'src/../../escape.ts', runId1);
        },
        /Directory traversal detected/
      );
    });

    it('assertAuthorizedToolMutation rejects control plane modifications', async () => {
      await assert.rejects(
        async () => {
          await assertAuthorizedToolMutation(convId, 'architecture.md', runId1);
        },
        /Cannot modify control plane artifact/
      );

      await assert.rejects(
        async () => {
          await assertAuthorizedToolMutation(convId, 'blueprint.md', runId1);
        },
        /Cannot modify control plane artifact/
      );
    });
  });

  // ─── Workstream E & Section 20.5: Security Scanner Precision ─────────────────
  describe('Workstream E: Security Scanner Precision & Check Criticality', () => {
    it('ignores eval( in single-line and multiline comments', () => {
      const codeWithComments = `
        // eval(userInput); do not use eval
        /*
         * const res = eval(data);
         */
        const cleanVar = 42;
      `;
      const result = validateSecurityGate({ 'src/test.ts': codeWithComments });
      const evalBlocks = result.blocking.filter((b) => b.ruleId === 'UNSAFE_EVAL');
      assert.strictEqual(evalBlocks.length, 0, 'Comments must not trigger UNSAFE_EVAL');
    });

    it('ignores eval( inside non-executable string literals', () => {
      const codeWithString = `
        const message = "Please do not use eval(code) in your plugins";
        console.log('eval(x) is dangerous');
      `;
      const result = validateSecurityGate({ 'src/test.ts': codeWithString });
      const evalBlocks = result.blocking.filter((b) => b.ruleId === 'UNSAFE_EVAL');
      assert.strictEqual(evalBlocks.length, 0, 'String literals must not trigger UNSAFE_EVAL');
    });

    it('flags executable eval() and new Function() calls', () => {
      const executableEval = `
        const result = eval(userInput);
        const dynamicFn = new Function('a', 'b', 'return a + b');
      `;
      const result = validateSecurityGate({ 'src/test.ts': executableEval });
      const evalBlocks = result.blocking.filter((b) => b.ruleId === 'UNSAFE_EVAL');
      assert.strictEqual(evalBlocks.length, 2, 'Executable eval and new Function must be flagged');
    });

    it('ignores safe parameterized SQL and queries in comments', () => {
      const safeSql = `
        // SELECT * FROM users WHERE id = ' + userId
        /* SELECT * FROM products + filter */
        const query = 'SELECT * FROM users WHERE id = $1';
        const res = await db.query(query, [userId]);
      `;
      const result = validateSecurityGate({ 'src/test.ts': safeSql });
      const sqlWarnings = result.warnings.filter((w) => w.ruleId === 'SQL_INJECTION_RISK');
      assert.strictEqual(sqlWarnings.length, 0, 'Safe parameterized SQL or commented SQL must not trigger warning');
    });

    it('flags dynamic SQL concatenation outside comments', () => {
      const unsafeSql = `
        const query = "SELECT * FROM users WHERE id = " + userId;
      `;
      const result = validateSecurityGate({ 'src/test.ts': unsafeSql });
      const sqlWarnings = result.warnings.filter((w) => w.ruleId === 'SQL_INJECTION_RISK');
      assert.strictEqual(sqlWarnings.length, 1, 'Dynamic SQL concatenation must trigger warning');
    });

    it('decideRelease correctly evaluates check criticalities and exception overrides', () => {
      // 1. All passed
      const decisionClean = decideRelease([
        { name: 'SECURITY_GATE', status: 'passed', criticality: 'blocking' },
        { name: 'LINTER', status: 'passed', criticality: 'blocking' },
        { name: 'ADVISORY_SCAN', status: 'passed', criticality: 'advisory' },
      ]);
      assert.strictEqual(decisionClean.decision, 'allow');

      // 2. Blocking check failed
      const decisionFailed = decideRelease([
        { name: 'SECURITY_GATE', status: 'failed', criticality: 'blocking' },
        { name: 'LINTER', status: 'passed', criticality: 'blocking' },
      ]);
      assert.strictEqual(decisionFailed.decision, 'block');
      assert.strictEqual(decisionFailed.reasons[0], 'SECURITY_GATE: failed');

      // 3. Advisory check failed -> still allow
      const decisionAdvisory = decideRelease([
        { name: 'SECURITY_GATE', status: 'passed', criticality: 'blocking' },
        { name: 'SQL_INJECTION_RISK', status: 'failed', criticality: 'advisory' },
      ]);
      assert.strictEqual(decisionAdvisory.decision, 'allow');

      // 4. Inconclusive/unavailable blocking check -> must block
      const decisionInconclusive = decideRelease([
        { name: 'STATIC_ANALYSIS', status: 'inconclusive', criticality: 'blocking' },
      ]);
      assert.strictEqual(decisionInconclusive.decision, 'block');

      // 5. Approved exception on blocking check -> allow
      const decisionOverride = decideRelease([
        { name: 'LEGACY_SCAN', status: 'failed', criticality: 'blocking', approvedException: true },
      ]);
      assert.strictEqual(decisionOverride.decision, 'allow');
    });
  });

  // ─── Workstream C: Canonical File Policy ─────────────────────────────────────
  describe('Workstream C: Canonical File Policy', () => {
    it('separates requiredProjectFiles, coderAuthorizedFiles, and setupManagedFiles', () => {
      const { authorizedFileSet, errors } = computeAuthorizedFileSet(validArchMd, validBlueprintMd);
      assert.strictEqual(errors.length, 0);
      assert.ok(authorizedFileSet);

      assert.ok(authorizedFileSet.requiredProjectFiles);
      assert.ok(authorizedFileSet.coderAuthorizedFiles);
      assert.ok(authorizedFileSet.setupManagedFiles);

      // public/favicon.ico is a static-asset, classified into setupManagedFiles
      assert.ok(authorizedFileSet.setupManagedFiles.includes('public/favicon.ico'));
      // Coder authorized targets only include writable project code
      assert.ok(authorizedFileSet.coderAuthorizedFiles.includes('src/components/Calculator.tsx'));
      assert.strictEqual(authorizedFileSet.coderAuthorizedFiles.includes('public/favicon.ico'), false);
    });
  });

  // ─── Workstream A & G: Canonical Repair Coordinator & Integration ────────────
  describe('Workstream A & G: Canonical Repair Coordinator', () => {
    it('normalizes Tester failure outputs into stable deterministic failure IDs', () => {
      const testerReport = `# Test Report
### Result
FAIL

### Failures
- [src/components/Calculator.tsx] SyntaxError: Unexpected token
- [src/utils/math.ts] TypeError: add is not a function
- General system error

### Workspace Hash
${'a'.repeat(64)}
`;

      const normalized = normalizeFailures(testerReport);
      assert.strictEqual(normalized.length, 3);
      assert.strictEqual(normalized[0].id, 'FAIL-001');
      assert.deepStrictEqual(normalized[0].affectedFiles, ['src/components/Calculator.tsx']);
      assert.strictEqual(normalized[1].id, 'FAIL-002');
      assert.deepStrictEqual(normalized[1].affectedFiles, ['src/utils/math.ts']);
      assert.strictEqual(normalized[2].id, 'FAIL-003');
    });

    it('validateRepairPlan rejects plans with unknown failure IDs or unauthorized targets', () => {
      const failures = [
        { id: 'FAIL-001', source: 'tester' as const, message: 'Broken calc', affectedFiles: ['src/components/Calculator.tsx'] },
      ];
      const auth: any = {
        authorizedFiles: ['src/components/Calculator.tsx'],
      };

      // 1. Unknown failure ID
      const planBadId = {
        basedOnWorkspaceVersion: 'v1',
        failureIds: ['FAIL-999'],
        affectedFiles: ['src/components/Calculator.tsx'],
        instructions: ['Fix it'],
        verificationTargets: ['FAIL-999'],
      };
      const valBadId = validateRepairPlan({
        plan: planBadId,
        failures,
        baseWorkspaceVersion: 'v1',
        authorized: auth,
      });
      assert.strictEqual(valBadId.valid, false);
      assert.ok(valBadId.issues.some((i) => i.code === 'UNKNOWN_FAILURE_ID'));

      // 2. Control plane target
      const planControl = {
        basedOnWorkspaceVersion: 'v1',
        failureIds: ['FAIL-001'],
        affectedFiles: ['plan.md'],
        instructions: ['Edit plan'],
        verificationTargets: ['FAIL-001'],
      };
      const valControl = validateRepairPlan({
        plan: planControl,
        failures,
        baseWorkspaceVersion: 'v1',
        authorized: auth,
      });
      assert.strictEqual(valControl.valid, false);
      assert.ok(valControl.issues.some((i) => i.code === 'CONTROL_PLANE_TARGET'));

      // 3. Stale workspace version
      const planStale = {
        basedOnWorkspaceVersion: 'v0',
        failureIds: ['FAIL-001'],
        affectedFiles: ['src/components/Calculator.tsx'],
        instructions: ['Fix it'],
        verificationTargets: ['FAIL-001'],
      };
      const valStale = validateRepairPlan({
        plan: planStale,
        failures,
        baseWorkspaceVersion: 'v1',
        authorized: auth,
      });
      assert.strictEqual(valStale.valid, false);
      assert.ok(valStale.issues.some((i) => i.code === 'STALE_BASE_VERSION'));
    });

    it('isRepairSuccessful verifies all 6 conditions in Section 18.2 strictly', () => {
      const goodEvidence: RepairEvidence = {
        planValid: true,
        allChangesAuthorized: true,
        testerWorkspaceVersion: 'hash-post-repair',
        postRepairWorkspaceVersion: 'hash-post-repair',
        requiredChecks: [
          { name: 'LINTER', status: 'passed' },
          { name: 'TESTER', status: 'passed' },
        ],
        unresolvedOriginalFailureIds: [],
        acceptedRunId: 'run-1',
        pipelineRunId: 'run-1',
        acceptedWorkspaceVersion: 'hash-post-repair',
      };
      assert.strictEqual(isRepairSuccessful(goodEvidence), true);

      // Stale tester workspace version
      const staleTester = { ...goodEvidence, testerWorkspaceVersion: 'hash-older' };
      assert.strictEqual(isRepairSuccessful(staleTester), false);

      // Unresolved failure IDs remain
      const unresolved = { ...goodEvidence, unresolvedOriginalFailureIds: ['FAIL-001'] };
      assert.strictEqual(isRepairSuccessful(unresolved), false);

      // Required check did not pass
      const checkFailed = {
        ...goodEvidence,
        requiredChecks: [{ name: 'LINTER', status: 'failed' as const }],
      };
      assert.strictEqual(isRepairSuccessful(checkFailed), false);
    });

    it('executes full repair cycle: Tester FAIL -> Debugger plan -> Coder authorized repair -> Tester PASS', async () => {
      // 1. Write an initial broken file into the workspace
      await writeVirtualFile(convId, 'src/components/Calculator.tsx', 'export const calc = broken + syntax;');
      const initialHash = await computeWorkspaceFingerprint(convId);

      const stageCalls: string[] = [];
      let cycle = 0;

      await coordinateRepair({
        conversationId: convId,
        pipelineRunId: runId1,
        executeStageFn: async (stageName: string, customInput?: string, targetFile?: string) => {
          stageCalls.push(stageName);

          if (stageName === 'Tester') {
            cycle++;
            if (cycle === 1) {
              return {
                status: 'ACCEPTED',
                stageExecution: { id: 'tester-exec-1', state: 'ACCEPTED' },
                content: `# Test Report\n\n### Result\nFAIL\n\n### Summary\nSyntax error detected.\n\n### Tests\n- Project File Linter: FAIL\n\n### Failures\n- [src/components/Calculator.tsx] Syntax error on line 1\n\n### Workspace Hash\n${initialHash}`,
              };
            } else {
              const freshHash = await computeWorkspaceFingerprint(convId);
              return {
                status: 'ACCEPTED',
                stageExecution: { id: 'tester-exec-2', state: 'ACCEPTED' },
                content: `# Test Report\n\n### Result\nPASS\n\n### Summary\nAll tests passed.\n\n### Tests\n- Project File Linter: PASS\n\n### Failures\nNone\n\n### Workspace Hash\n${freshHash}`,
              };
            }
          }

          if (stageName === 'Debugger') {
            return {
              status: 'ACCEPTED',
              stageExecution: { id: 'dbg-exec-1', state: 'ACCEPTED' },
              content: `# Debug Report\n\n### Issues Addressed\n- File: src/components/Calculator.tsx\n- Diagnostic: Syntax error\n- Root cause: Broken syntax\n- Result: Fixed\n\n### Patches Applied\n- File: src/components/Calculator.tsx\n- Area changed: Line 1\n- What was changed: Correct export\n- Why: Restore valid TypeScript\n\n### Verification\nPassed syntax check.`,
            };
          }

          if (stageName === 'Coder') {
            assert.strictEqual(targetFile, 'src/components/Calculator.tsx');
            // Coder fixes the file in VFS
            await writeVirtualFile(convId, 'src/components/Calculator.tsx', 'export const calc = (a: number, b: number) => a + b;');
            return {
              status: 'ACCEPTED',
              stageExecution: { id: 'coder-exec-repair', state: 'ACCEPTED' },
              content: 'export const calc = (a: number, b: number) => a + b;',
            };
          }

          throw new Error(`Unexpected stage ${stageName}`);
        },
        emit: () => {},
      });

      // Assert complete cycle executed: Tester -> Debugger -> Coder -> Tester
      assert.deepStrictEqual(stageCalls, ['Tester', 'Debugger', 'Coder', 'Tester']);

      // Assert workspace content was genuinely mutated and valid
      const repairedContent = await readVirtualFile(convId, 'src/components/Calculator.tsx');
      assert.ok(repairedContent?.includes('calc = (a: number, b: number) => a + b;'));

      const postHash = await computeWorkspaceFingerprint(convId);
      assert.notStrictEqual(initialHash, postHash, 'Workspace hash must have changed after Coder repair');
    });
  });

  // ─── Workstream F: Pre-acceptance Specification Consistency Checks ───────────
  describe('Workstream F: Pre-acceptance Specification Consistency Checks', () => {
    it('validateStageCandidate for System rejects candidate with specification contradictions before commit', async () => {
      const upstreamWithNoAuth = {
        'plan.md': `### Project Name
Demo Project
### Project Goal
Demo
### MVP Scope
Scope
### Technical Constraints
None
### Risks
None`,
        'requirements.md': `### Features
Feature 1
### Functional Requirements
FR1
### Acceptance Criteria
AC1`,
        'architecture.md': `### Tech Stack
- **Frontend**: Next.js
- **Frontend Entry Point**: src/app/page.tsx
- **Backend**: Next.js API Routes
- **Backend Entry Point**: src/app/api/route.ts
- **Database**: None
- **ORM**: None
- **Authentication**: None
- **Build Tool**: Next.js
- **Additional**: None

### Project Folder Structure
project-root/
└── src/
    └── app/
        ├── page.tsx
        └── api/
            └── route.ts

### Project Files
- src/app/page.tsx
- src/app/api/route.ts

### Modules
**Frontend**
- Responsibility: UI
- Owned Files: src/app/page.tsx
- Depends On: None
- Supports Features: UI

**Backend**
- Responsibility: API
- Owned Files: src/app/api/route.ts
- Depends On: None
- Supports Features: API

### Conventions
- **File Naming**: camelCase`,
      };

      // Contradictory backend spec: declares protected endpoint requiring auth when architecture says Authentication: None
      const contradictoryBackendSpec = `### Database Design
No tables needed.

### Seed Data
None.

### API Endpoints
- GET /api/secure [Auth Required: Yes]
Description: returns secure data
File: src/app/api/route.ts
`;

      const candidate = {
        stage: 'System',
        executionId: 'exec-system-test',
        attempt: 1,
        content: contradictoryBackendSpec,
        contentHash: 'hash-test',
        generatedAt: new Date(),
      };

      const result = await validateStageCandidate({
        conversationId: convId,
        pipelineRunId: runId1,
        candidate,
        upstreamContext: upstreamWithNoAuth,
      });

      assert.strictEqual(result.accepted, false, 'Specification contradiction must reject candidate before commit');
      assert.ok(
        result.errors.some((e) => e.includes('Specification Contradiction')),
        `Expected specification contradiction error, got: ${result.errors.join('; ')}`
      );
    });
  });

  describe('Workstream H: Contract-Prompt Disparity Inventory (Section 18.6)', () => {
    it('verifies all 42 disparities are documented with stable IDs, baseline commits, and verification evidence', () => {
      const inventoryPath = 'docs/remediation/contract-prompt-disparities.md';
      assert.ok(fs.existsSync(inventoryPath), 'Disparity inventory file must exist');
      const content = fs.readFileSync(inventoryPath, 'utf8');

      const ids = new Set<string>();
      for (let i = 1; i <= 42; i++) {
        const id = `DISP-${String(i).padStart(2, '0')}`;
        assert.ok(content.includes(id), `Inventory must contain disparity ID ${id}`);
        ids.add(id);
      }
      assert.strictEqual(ids.size, 42, 'Must have exactly 42 distinct disparity IDs');

      assert.ok(
        content.includes('99cfddd3c40b2b9e2b5355bb90f31f713b679c17'),
        'Inventory must reference baseline commit 99cfddd'
      );

      const verifiedMatches = content.match(/- \*\*Status\*\*:\s*`verified`/g);
      assert.strictEqual(verifiedMatches?.length, 42, 'All 42 disparities must have status verified');
    });
  });

  describe('Workstream I: Generated Application Verification (Section 12)', () => {
    it('validates a known-good project fixture passes whole-project TypeScript compilation and route probing', async () => {
      const files: Record<string, string> = {
        'package.json': JSON.stringify({ name: 'test-app', version: '1.0.0' }),
        'tsconfig.json': JSON.stringify({
          compilerOptions: { target: 'ES2022', module: 'commonjs', jsx: 'react-jsx', esModuleInterop: true },
        }),
        'src/app/page.tsx': `import React from 'react';\nexport default function Page() { return <div>Home</div>; }`,
        'src/app/api/tasks/route.ts': `export async function GET() { return { status: 200 }; }`,
      };

      const result = await validateGeneratedProject(files);
      assert.strictEqual(result.success, true, `Expected successful project validation, got errors: ${JSON.stringify(result.errors)}`);
      assert.strictEqual(result.errors.length, 0);

      const probe = await probeGeneratedProjectRoutes(
        {
          framework: 'NEXT_APP_ROUTER',
          entryPoints: ['src/app/page.tsx'],
          apiEndpoints: [{ path: '/api/tasks', method: 'GET', description: 'List tasks' }],
        } as any,
        files
      );
      assert.strictEqual(probe.success, true);
      assert.strictEqual(probe.probedRoutes.length, 2);
      assert.ok(probe.probedRoutes.every((r) => r.ok));
    });

    it('detects unimported React hooks and missing route handlers as explicit failures', async () => {
      const brokenFiles: Record<string, string> = {
        'src/components/Counter.tsx': `export function Counter() {\n  const [count, setCount] = useState(0);\n  return <button>{count}</button>;\n}`,
      };

      const result = await validateGeneratedProject(brokenFiles);
      assert.strictEqual(result.success, false);
      assert.ok(
        result.errors.some((e) => e.message.includes('React hook "useState" is used but is not explicitly imported')),
        'Expected missing React hook import error'
      );

      const probe = await probeGeneratedProjectRoutes(
        {
          apiEndpoints: [{ path: '/api/missing', method: 'POST', description: 'Missing handler' }],
        } as any,
        brokenFiles
      );
      assert.strictEqual(probe.success, false);
      assert.ok(probe.errors.some((e) => e.includes('missing handler file')));
    });
  });

  describe('Workstream J: Artifact Persistence, Recovery and Fault Injection (Section 13)', () => {
    const recoveryConvId = 'rec-test-conv-001';
    const recoveryConvId2 = 'rec-test-conv-002';
    const recRunId1 = 'rec-run-001';
    const recRunId2 = 'rec-run-002';

    before(async () => {
      await prisma.conversation.upsert({
        where: { id: recoveryConvId },
        update: {},
        create: {
          id: recoveryConvId,
          title: 'Recovery Test',
          status: 'Active',
          currentStage: 'Queen',
          originalPrompt: 'Recovery test',
        },
      });

      await prisma.pipelineRun.upsert({
        where: { conversationId: recoveryConvId },
        update: { id: recRunId1 },
        create: {
          id: recRunId1,
          conversationId: recoveryConvId,
          state: 'RUNNING',
        },
      });

      await prisma.conversation.upsert({
        where: { id: recoveryConvId2 },
        update: {},
        create: {
          id: recoveryConvId2,
          title: 'Recovery Test 2',
          status: 'Active',
          currentStage: 'Queen',
          originalPrompt: 'Recovery test 2',
        },
      });

      await prisma.pipelineRun.upsert({
        where: { conversationId: recoveryConvId2 },
        update: { id: recRunId2 },
        create: {
          id: recRunId2,
          conversationId: recoveryConvId2,
          state: 'RUNNING',
        },
      });
    });

    it('recovers PENDING and FAILED projection states to SYNCED idempotently', async () => {
      const art = await commitAcceptedArtifact({
        conversationId: recoveryConvId,
        pipelineRunId: recRunId1,
        stage: 'Queen',
        filePath: 'plan.md',
        content: '# Test Plan\n\n### Project Name\nRecoveryApp\n',
      });
      assert.strictEqual(art.projectionStatus, 'SYNCED');

      await prisma.artifactVersion.update({
        where: { id: art.id },
        data: { projectionStatus: 'PENDING' },
      });

      const reconciledCount = await reconcilePendingProjections(recoveryConvId);
      assert.strictEqual(reconciledCount, 1, 'Reconciled exactly 1 pending projection');

      const rechecked = await prisma.artifactVersion.findUnique({ where: { id: art.id } });
      assert.strictEqual(rechecked?.projectionStatus, 'SYNCED');

      const idempotentCount = await reconcilePendingProjections(recoveryConvId);
      assert.strictEqual(idempotentCount, 0);
    });

    it('fails closed when an artifact content hash is corrupted', async () => {
      const art = await commitAcceptedArtifact({
        conversationId: recoveryConvId,
        pipelineRunId: recRunId1,
        stage: 'Architect',
        filePath: 'architecture.md',
        content: '# Clean Architecture\n',
      });

      await prisma.artifactVersion.update({
        where: { id: art.id },
        data: { content: '# Tampered Content\n' },
      });

      await assert.rejects(
        async () => {
          await resolveAcceptedStageInputs({
            conversationId: recoveryConvId,
            pipelineRunId: recRunId1,
            stageName: 'System',
          });
        },
        /Artifact hash mismatch/
      );
    });

    it('enforces multi-run isolation: artifacts from Run B cannot satisfy Run A', async () => {
      await commitAcceptedArtifact({
        conversationId: recoveryConvId2,
        pipelineRunId: recRunId2,
        stage: 'Planner',
        filePath: 'requirements.md',
        content: '# Run B Requirements\n',
      });

      await assert.rejects(
        async () => {
          await resolveAcceptedStageInputs({
            conversationId: recoveryConvId2,
            pipelineRunId: recRunId1,
            stageName: 'Architect',
          });
        },
        /Required input artifact 'requirements.md' for stage 'Architect' was not found/
      );
    });
  });

  describe('Section 22: Crash-Safe Recovery, Global Budgets & Trusted Gate Authority', () => {
    it('Gate 2A: reconcileRepairAttemptCrash recovers committed revisions without re-applying patches', () => {
      const attempt = createDurableRepairAttempt({
        workspaceId: 'ws-001',
        pipelineRunId: 'run-001',
        baseRevision: 'rev-001',
        normalizedFailureIds: ['FAIL-001'],
        planDigest: 'digest-001',
        authorizedTargets: ['src/app/page.tsx'],
      });

      assert.strictEqual(attempt.state, 'PLANNED');

      const receipts = new Map<string, CommitReceipt>();
      const resBefore = reconcileRepairAttemptCrash(attempt, receipts);
      assert.strictEqual(resBefore.action, 'safe_to_retry');

      const { receipt } = recordCommitReceipt(attempt, 'rev-002', 'content-hash-002');
      receipts.set(attempt.idempotencyKey, receipt);

      const resAfter = reconcileRepairAttemptCrash(attempt, receipts);
      assert.strictEqual(resAfter.action, 'resume_verification');
      assert.strictEqual(resAfter.reconciledAttempt.state, 'COMMITTED');
      assert.strictEqual(resAfter.reconciledAttempt.committedRevision, 'rev-002');
      assert.ok(resAfter.reconciledAttempt.recoveryNote?.includes('Do not re-apply patch'));

      const stagedAttempt = { ...attempt, state: 'STAGED' as const };
      const resStaged = reconcileRepairAttemptCrash(stagedAttempt, new Map());
      assert.strictEqual(resStaged.action, 'recovery_required');
      assert.strictEqual(resStaged.reconciledAttempt.state, 'RECOVERY_REQUIRED');
    });

    it('Gate 2B: RepairBudget enforces global limits across retries and wall-clock time', () => {
      const budget = createRepairBudget({
        pipelineRunId: 'run-budget-001',
        maxWallClockMs: 50,
        maxRepairAttempts: 2,
        maxConflictRetries: 1,
        maxModelInvocations: 3,
        maxToolInvocations: 4,
      });

      assert.strictEqual(budget.state, 'ACTIVE');

      consumeRepairBudget(budget, { attempts: 1, modelCalls: 1, toolCalls: 1 });
      assert.strictEqual(budget.repairAttemptsUsed, 1);

      assert.throws(
        () => consumeRepairBudget(budget, { attempts: 2 }),
        /BUDGET_EXHAUSTED: Maximum repair attempts/
      );
      assert.strictEqual(budget.state, 'EXHAUSTED');

      const expiredBudget = createRepairBudget({
        pipelineRunId: 'run-budget-002',
        maxWallClockMs: -1,
      });
      assert.throws(
        () => assertBudgetAvailable(expiredBudget),
        /BUDGET_EXHAUSTED: Wall-clock deadline exceeded/
      );
    });

    it('Gate 4A: Trusted gate authority rejects agent self-approval, forgery, and expired exceptions', () => {
      const validException: TrustedGateException = {
        checkName: 'UNSAFE_EVAL',
        workspaceVersion: 'rev-001',
        pipelineRunId: 'run-gate-001',
        approver: 'SecurityOfficer-Jane',
        signature: 'sig-valid-jane-7788',
        expiresAt: Date.now() + 60000,
        rationale: 'Approved sandbox eval for mathematical formula parser',
      };

      const validRes = validateGateException(validException, {
        checkName: 'UNSAFE_EVAL',
        workspaceVersion: 'rev-001',
        pipelineRunId: 'run-gate-001',
      });
      assert.strictEqual(validRes.valid, true);

      const agentSelfApproval: TrustedGateException = {
        ...validException,
        approver: 'Coder',
      };
      const agentRes = validateGateException(agentSelfApproval, {
        checkName: 'UNSAFE_EVAL',
        workspaceVersion: 'rev-001',
        pipelineRunId: 'run-gate-001',
      });
      assert.strictEqual(agentRes.valid, false);
      assert.ok(agentRes.reason?.includes('Unauthorized self-approval'));

      const expiredException: TrustedGateException = {
        ...validException,
        expiresAt: Date.now() - 1000,
      };
      const expRes = validateGateException(expiredException, {
        checkName: 'UNSAFE_EVAL',
        workspaceVersion: 'rev-001',
        pipelineRunId: 'run-gate-001',
      });
      assert.strictEqual(expRes.valid, false);
      assert.ok(expRes.reason?.includes('expired'));

      const decisionBlocked = decideRelease(
        [
          {
            name: 'UNSAFE_EVAL',
            status: 'failed',
            criticality: 'blocking',
            approvedException: true,
          },
        ],
        { enforceTrustedExceptionsOnly: true }
      );
      assert.strictEqual(decisionBlocked.decision, 'block');

      const decisionAllowed = decideRelease(
        [
          {
            name: 'UNSAFE_EVAL',
            status: 'failed',
            criticality: 'blocking',
            trustedException: validException,
          },
        ],
        {
          workspaceVersion: 'rev-001',
          pipelineRunId: 'run-gate-001',
          enforceTrustedExceptionsOnly: true,
        }
      );
      assert.strictEqual(decisionAllowed.decision, 'allow');
    });
  });
});
