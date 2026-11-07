import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractProjectContract, validateProjectContract } from '../spec-contract';
import { classifyAuthenticationScope } from '../auth-scoping';
import { determineBackendTopology } from '../backend-topology';
import {
  computePermittedStrategies,
  arbitrateSpecificationContradiction,
} from '../spec-arbitrator';
import {
  prepareReconciliationTransaction,
  commitReconciliationTransaction,
  abortReconciliationTransaction,
  acquireReconciliationLock,
  detectSpecificationOscillation,
} from '../spec-reconciliation-coordinator';
import { validateStageCandidate } from '../stage-acceptance';
import { prisma } from '../../../db';

describe('AutoCoder Specification Contradiction Self-Healing Matrix (Scenarios 25 - 36)', () => {
  it('Scenario 25: Static HTML app with mock login modal passes without synthetic auth contradiction', () => {
    const specs = {
      'plan.md': '### Project Plan\n- Feature 1: Login modal for switching demo accounts in localStorage',
      'requirements.md': '### Requirements\n- FR-1: User login modal for role switching\n### Acceptance Criteria\n- AC-1: Stores active user in client localStorage',
      'architecture.md': '### Architecture\n### Tech Stack\n- Frontend: HTML/CSS/JS\n- Backend: None\n- Database: None\n- Authentication: None\n### Project Folder Structure\n```\nindex.html\n```\n### Modules\n**App**\n- Responsibility: Main app\n- Owned Files: index.html\n- Depends On: None\n- Supports Features: FR-1\n### Conventions\nStandard HTML',
      'backend_spec.md': '### No Backend Required\nNo backend, database, or API endpoints are needed. This is a pure static frontend.',
    };

    const contract = extractProjectContract(specs);
    const validation = validateProjectContract(contract);
    assert.equal(validation.valid, true, `Expected Scenario 25 to pass, but got errors: ${validation.errors.join(', ')}`);
  });

  it('Scenario 26: architecture.md with Authentication: None and Supports Features: User Authentication does not self-contradict', () => {
    const archContent = `### Architecture
### Tech Stack
- Frontend: HTML/CSS/JS
- Backend: None
- Database: None
- Authentication: None
### Project Folder Structure
\`\`\`
index.html
\`\`\`
### Modules
**UserModule**
- Responsibility: User profile UI
- Owned Files: index.html
- Depends On: None
- Supports Features: User Authentication, Profile View
### Conventions
Standard HTML`;

    const scoped = classifyAuthenticationScope(archContent, 'architecture.md');
    assert.equal(scoped.scope, 'NONE', 'Expected Tech Stack Authentication: None to govern over feature bullet');
  });

  it('Scenario 27: Candidate backend_spec.md with ### No Backend Required executes validateProjectContract in validateStageCandidate', async () => {
    const result = await validateStageCandidate({
      conversationId: 'test-convo-27',
      pipelineRunId: 'test-run-27',
      candidate: {
        stage: 'System',
        executionId: 'exec-27',
        attempt: 1,
        content: '### No Backend Required\nNo backend, database, or API endpoints are needed.',
        contentHash: 'abc27',
        generatedAt: new Date(),
      },
      upstreamContext: {
        'plan.md': 'Build full-stack app with JWT',
        'requirements.md': 'User requires secure database persistence and JWT tokens',
        'architecture.md': '### Tech Stack\n- Frontend: React\n- Backend: Express\n- Database: PostgreSQL\n- Authentication: JWT',
      },
    });

    assert.equal(result.accepted, false, 'Expected validateStageCandidate to reject No Backend Required when upstream demands full-stack');
    assert.ok(result.errors.some((e) => e.includes('Specification Contradiction')));
  });

  it('Scenario 28: True contradiction between System and Architect converges via collective arbitration', async () => {
    const decision = await arbitrateSpecificationContradiction({
      userPromptText: 'BMP - Make a Buisness management portal in .html',
      specs: {
        'architecture.md': '### Tech Stack\n- Frontend: HTML\n- Backend: None\n- Authentication: None',
        'backend_spec.md': '### API Endpoints\nPOST /api/auth/login\nauth required: true',
      },
      contract: { framework: 'STATIC_HTML' } as any,
      validationErrors: ['Authentication contradiction across specification artifacts'],
    });

    assert.equal(decision.targetStage, 'System', 'Expected System to be targeted to align with static architecture');
    assert.equal(decision.selectedApproach, 'ALIGN_TO_ARCHITECTURE');
  });

  it('Scenario 29: Model timeout or invalid JSON triggers fail-safe deterministic fallback', async () => {
    const controller = new AbortController();
    controller.abort(); // pre-aborted signal to trigger immediate error/fallback

    const decision = await arbitrateSpecificationContradiction({
      userPromptText: 'Single file HTML timer with no backend',
      specs: { 'architecture.md': 'Backend: None' },
      contract: { framework: 'STATIC_HTML' } as any,
      validationErrors: ['Authentication contradiction'],
      signal: controller.signal,
    });

    assert.equal(decision.isFallback, true, 'Expected fail-safe fallback to activate on error');
    assert.equal(decision.targetStage, 'System');
  });

  it('Scenario 30: Anti-oscillation guard halts A -> B -> A alternating decisions fail-closed', () => {
    const history = [
      { targetStage: 'System', selectedApproach: 'ALIGN_TO_ARCHITECTURE', fingerprint: 'fp-1' },
    ];
    const proposal = { targetStage: 'System', selectedApproach: 'UPGRADE_ARCHITECTURE', fingerprint: 'fp-1' };

    const isOscillating = detectSpecificationOscillation(history, proposal);
    assert.equal(isOscillating, true, 'Expected anti-oscillation guard to detect decision reversal');
  });

  it('Scenario 31: Static HTML frontend with legitimate backend API requirements preserves backend', () => {
    const decision = determineBackendTopology(
      'Create an HTML portal connected to an Express REST API with SQLite database',
      { 'requirements.md': 'Requires CRUD endpoints for employee database' },
      'STATIC_HTML'
    );

    assert.equal(decision.status, 'REQUIRED', 'Expected backend to be REQUIRED despite HTML frontend format');
    assert.equal(decision.runtime, 'express');
  });

  it('Scenario 32: User prompt requiring secure multi-user login vs Architect None forces UPGRADE_ARCHITECTURE', () => {
    const { permitted } = computePermittedStrategies(
      'Build a secure multi-user portal with bcrypt passwords and JWT session cookies',
      { 'requirements.md': 'User requires secure login and database' },
      { framework: 'NEXT_APP_ROUTER' } as any,
      ['Authentication contradiction: Prompt demands auth, architecture declared None']
    );

    assert.equal(permitted.length, 1, 'Expected exactly 1 permitted strategy under prompt invariant');
    assert.equal(permitted[0].strategy, 'UPGRADE_ARCHITECTURE');
    assert.equal(permitted[0].targetStage, 'Architect');
  });

  it('Scenario 33: Version preservation and recovery when reconciliation fails after downstream invalidation', async () => {
    // Seed test conversation and pipeline run
    const convoId = 'test-convo-33';
    const runId = 'test-run-33';

    await prisma.conversation.upsert({
      where: { id: convoId },
      create: { id: convoId, title: 'Test 33', status: 'Active', currentStage: 'System' },
      update: {},
    });

    await prisma.pipelineRun.upsert({
      where: { conversationId: convoId },
      create: { id: runId, conversationId: convoId, state: 'RUNNING' },
      update: {},
    });

    const tx = await prepareReconciliationTransaction({
      conversationId: convoId,
      pipelineRunId: runId,
      cycleNumber: 1,
      leaseOwnerId: 'lease-33',
      targetStage: 'Architect',
      selectedApproach: 'UPGRADE_ARCHITECTURE',
      directive: 'Upgrade arch',
      fingerprint: 'fp-test-33',
      validationErrors: ['Error 33'],
    });

    assert.ok(tx.invalidatedStages.includes('System'));
    assert.ok(tx.snapshot.files instanceof Map);

    await abortReconciliationTransaction(tx, 'Simulation failure');
    const rec = await prisma.specificationReconciliation.findUnique({
      where: { pipelineRunId_cycleNumber: { pipelineRunId: runId, cycleNumber: 1 } },
    });
    assert.equal(rec?.status, 'FAILED');
  });

  it('Scenario 34: Idempotent duplicate reconciliation triggers', async () => {
    const convoId = 'test-convo-34';
    const runId = 'test-run-34';

    await prisma.conversation.upsert({
      where: { id: convoId },
      create: { id: convoId, title: 'Test 34', status: 'Active', currentStage: 'System' },
      update: {},
    });

    await prisma.pipelineRun.upsert({
      where: { conversationId: convoId },
      create: { id: runId, conversationId: convoId, state: 'RUNNING' },
      update: {},
    });

    const tx1 = await prepareReconciliationTransaction({
      conversationId: convoId,
      pipelineRunId: runId,
      cycleNumber: 1,
      leaseOwnerId: 'lease-34',
      targetStage: 'System',
      selectedApproach: 'ALIGN_TO_ARCHITECTURE',
      directive: 'Align system',
      fingerprint: 'fp-test-34',
      validationErrors: ['Error 34'],
    });

    const tx2 = await prepareReconciliationTransaction({
      conversationId: convoId,
      pipelineRunId: runId,
      cycleNumber: 1,
      leaseOwnerId: 'lease-34',
      targetStage: 'System',
      selectedApproach: 'ALIGN_TO_ARCHITECTURE',
      directive: 'Align system updated',
      fingerprint: 'fp-test-34',
      validationErrors: ['Error 34'],
    });

    assert.equal(tx1.reconciliationId, tx2.reconciliationId);
  });

  it('Scenario 35: Rejection of unpermitted target stage from LLM format hallucination', () => {
    const { permitted } = computePermittedStrategies(
      'Simple static page',
      {},
      { framework: 'STATIC_HTML' } as any,
      ['Contradiction']
    );

    const isCoderPermitted = permitted.some((p) => (p.targetStage as string) === 'Coder');
    assert.equal(isCoderPermitted, false, 'Expected Coder to be rejected as a specification reconciliation stage');
  });

  it('Scenario 36: Concurrent reconciliation lock rejection', async () => {
    const convoId = 'test-convo-36';
    const runId = 'test-run-36';

    await prisma.conversation.upsert({
      where: { id: convoId },
      create: { id: convoId, title: 'Test 36', status: 'Active', currentStage: 'System' },
      update: {},
    });

    await prisma.pipelineRun.upsert({
      where: { conversationId: convoId },
      create: { id: runId, conversationId: convoId, state: 'RUNNING' },
      update: {},
    });

    await prepareReconciliationTransaction({
      conversationId: convoId,
      pipelineRunId: runId,
      cycleNumber: 1,
      leaseOwnerId: 'legit-worker-lease',
      targetStage: 'System',
      selectedApproach: 'ALIGN_TO_ARCHITECTURE',
      directive: 'Align system',
      fingerprint: 'fp-test-36',
      validationErrors: ['Error 36'],
    });

    let threw = false;
    try {
      await acquireReconciliationLock(convoId, runId, 'rogue-worker-lease');
    } catch {
      threw = true;
    }
    assert.equal(threw, true, 'Expected acquireReconciliationLock to reject rogue worker lease');
  });
});
