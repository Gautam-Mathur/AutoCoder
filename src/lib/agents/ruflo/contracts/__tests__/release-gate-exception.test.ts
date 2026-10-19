import crypto from 'node:crypto';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { prisma } from '../../../../db';
import {
  decideRelease,
  validateGateException,
  createCanonicalExceptionPayload,
  signGateException,
  verifyExceptionSignature,
  createSignedGateException,
  registerTrustedApprover,
  unregisterTrustedApprover,
  clearTrustedApprovers,
  TrustedAuthorityRegistry,
  type TrustedGateException,
  type TrustedApprover,
  type TrustedExceptionAuthorizationService,
} from '../../security-gate';
import { evaluateFinalPipelineGate } from '../../final-gate';

describe('Release-Gate Cryptographic Exception & Trusted Authority Suite', () => {
  // Test Ed25519 keypair for Security Officer
  const officerKeypair = crypto.generateKeyPairSync('ed25519');
  const officerPubPem = officerKeypair.publicKey.export({ type: 'spki', format: 'pem' }) as string;
  const officerPrivPem = officerKeypair.privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;

  // Attacker keypair for forgery tests
  const attackerKeypair = crypto.generateKeyPairSync('ed25519');
  const attackerPrivPem = attackerKeypair.privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;

  const validOfficer: TrustedApprover = {
    id: 'SecLead-Sarah',
    name: 'Sarah Connor',
    role: 'Principal Security Architect',
    publicKey: officerPubPem,
    status: 'ACTIVE',
    allowedChecks: ['UNSAFE_EVAL', 'HARDCODED_SECRET', 'MISSING_REQUIRED_WORKSPACE_FILE'],
  };

  before(() => {
    clearTrustedApprovers();
    registerTrustedApprover(validOfficer);
  });

  after(() => {
    clearTrustedApprovers();
  });

  // ─── 1. Canonical Payload & Deterministic Binding ───────────────────────────
  describe('1. Canonical Exception Payload Determinism', () => {
    it('produces identical canonical payload regardless of object property ordering', () => {
      const p1 = createCanonicalExceptionPayload({
        checkName: 'UNSAFE_EVAL',
        workspaceVersion: 'rev-abc-123',
        pipelineRunId: 'run-xyz-789',
        approver: 'SecLead-Sarah',
        expiresAt: 1780000000000,
        rationale: 'Validated sandboxed math parser',
      });

      const p2 = createCanonicalExceptionPayload({
        rationale: 'Validated sandboxed math parser',
        expiresAt: 1780000000000,
        approver: 'SecLead-Sarah',
        pipelineRunId: 'run-xyz-789',
        workspaceVersion: 'rev-abc-123',
        checkName: 'UNSAFE_EVAL',
      });

      assert.strictEqual(p1, p2);
      assert.ok(p1.startsWith('RELEASE_GATE_EXCEPTION_V1\n'));
      assert.ok(p1.includes('checkName:UNSAFE_EVAL'));
      assert.ok(p1.includes('workspaceVersion:rev-abc-123'));
      assert.ok(p1.includes('pipelineRunId:run-xyz-789'));
      assert.ok(p1.includes('approver:SecLead-Sarah'));
      assert.ok(p1.includes('expiresAt:1780000000000'));
      assert.ok(p1.includes('rationale:Validated sandboxed math parser'));
    });

    it('modifying any field alters the canonical payload string', () => {
      const base = {
        checkName: 'UNSAFE_EVAL',
        workspaceVersion: 'rev-abc-123',
        pipelineRunId: 'run-xyz-789',
        approver: 'SecLead-Sarah',
        expiresAt: 1780000000000,
        rationale: 'Validated sandboxed math parser',
      };
      const basePayload = createCanonicalExceptionPayload(base);

      const modifiedRationale = createCanonicalExceptionPayload({
        ...base,
        rationale: 'Modified rationale text',
      });
      assert.notStrictEqual(basePayload, modifiedRationale);

      const modifiedExpiry = createCanonicalExceptionPayload({
        ...base,
        expiresAt: 1780000000001,
      });
      assert.notStrictEqual(basePayload, modifiedExpiry);

      const modifiedRevision = createCanonicalExceptionPayload({
        ...base,
        workspaceVersion: 'rev-abc-124',
      });
      assert.notStrictEqual(basePayload, modifiedRevision);
    });
  });

  // ─── 2. Cryptographic Signature Generation and Verification ─────────────────
  describe('2. Asymmetric Cryptographic Verification', () => {
    it('verifies authentic Ed25519 signature successfully', () => {
      const payload = {
        checkName: 'UNSAFE_EVAL',
        workspaceVersion: 'rev-100',
        pipelineRunId: 'run-100',
        approver: 'SecLead-Sarah',
        expiresAt: Date.now() + 60000,
        rationale: 'Legitimate math formula evaluator',
      };

      const exception = createSignedGateException(payload, officerPrivPem);
      assert.strictEqual(typeof exception.signature, 'string');
      assert.ok(exception.signature.length > 30);

      const canonical = createCanonicalExceptionPayload(payload);
      const isVerified = verifyExceptionSignature(canonical, exception.signature, officerPubPem);
      assert.strictEqual(isVerified, true);
    });

    it('rejects signature if payload content is altered (forgery attempt)', () => {
      const payload = {
        checkName: 'UNSAFE_EVAL',
        workspaceVersion: 'rev-100',
        pipelineRunId: 'run-100',
        approver: 'SecLead-Sarah',
        expiresAt: Date.now() + 60000,
        rationale: 'Original approved rationale',
      };
      const exception = createSignedGateException(payload, officerPrivPem);

      // Attacker attempts to change rationale while reusing signature
      const tamperedCanonical = createCanonicalExceptionPayload({
        ...payload,
        rationale: 'Malicious eval bypass',
      });

      const isVerified = verifyExceptionSignature(tamperedCanonical, exception.signature, officerPubPem);
      assert.strictEqual(isVerified, false);
    });

    it('rejects signature signed by an unauthorized private key (impersonation)', () => {
      const payload = {
        checkName: 'UNSAFE_EVAL',
        workspaceVersion: 'rev-100',
        pipelineRunId: 'run-100',
        approver: 'SecLead-Sarah',
        expiresAt: Date.now() + 60000,
        rationale: 'Attacker signed payload pretending to be Sarah',
      };
      // Attacker signs using their own private key
      const forgedSignature = signGateException(payload, attackerPrivPem);

      // Verification against Sarah's registered public key must fail
      const canonical = createCanonicalExceptionPayload(payload);
      const isVerified = verifyExceptionSignature(canonical, forgedSignature, officerPubPem);
      assert.strictEqual(isVerified, false);
    });

    it('rejects corrupted, truncated, or non-base64 signature strings safely without throwing', () => {
      const canonical = 'RELEASE_GATE_EXCEPTION_V1\ncheckName:TEST';
      assert.strictEqual(verifyExceptionSignature(canonical, '', officerPubPem), false);
      assert.strictEqual(verifyExceptionSignature(canonical, 'not-a-valid-sig', officerPubPem), false);
      assert.strictEqual(verifyExceptionSignature(canonical, 'dGVzdA==', officerPubPem), false);
      assert.strictEqual(verifyExceptionSignature(canonical, null as any, officerPubPem), false);
      assert.strictEqual(verifyExceptionSignature(canonical, undefined as any, officerPubPem), false);
    });
  });

  // ─── 3. Trusted Approver Registry & Identity Authorization ───────────────────
  describe('3. Approver Identity & Authority Registry', () => {
    it('prevents registering agents as trusted approvers', () => {
      assert.throws(
        () =>
          registerTrustedApprover({
            id: 'Coder',
            name: 'Coder Agent',
            role: 'Code Generator',
            publicKey: officerPubPem,
            status: 'ACTIVE',
          }),
        /Cannot register agent "Coder"/
      );

      assert.throws(
        () =>
          registerTrustedApprover({
            id: 'reviewer',
            name: 'Reviewer Agent',
            role: 'Stage Reviewer',
            publicKey: officerPubPem,
            status: 'ACTIVE',
          }),
        /Cannot register agent "reviewer"/
      );
    });

    it('requires valid id and public key to register', () => {
      assert.throws(() => registerTrustedApprover({} as any), /must have a valid id/);
      assert.throws(
        () =>
          registerTrustedApprover({
            id: 'TestOfficer',
            name: 'Test',
            role: 'Tester',
            publicKey: '',
            status: 'ACTIVE',
          }),
        /must provide a valid public key/
      );
    });

    it('correctly tracks and unregisters approvers', () => {
      const reg = new TrustedAuthorityRegistry();
      reg.register({
        id: 'Sec-Alice',
        name: 'Alice',
        role: 'SecOps',
        publicKey: officerPubPem,
        status: 'ACTIVE',
      });
      assert.ok(reg.getApprover('Sec-Alice'));
      assert.strictEqual(reg.isApproverAuthorized('Sec-Alice', 'UNSAFE_EVAL'), true);

      reg.unregister('Sec-Alice');
      assert.strictEqual(reg.getApprover('Sec-Alice'), null);
      assert.strictEqual(reg.isApproverAuthorized('Sec-Alice', 'UNSAFE_EVAL'), false);
    });

    it('enforces check-specific authorization scopes', () => {
      const reg = new TrustedAuthorityRegistry();
      reg.register({
        id: 'Scoped-Bob',
        name: 'Bob',
        role: 'Linter Lead',
        publicKey: officerPubPem,
        status: 'ACTIVE',
        allowedChecks: ['LINTER'],
      });

      assert.strictEqual(reg.isApproverAuthorized('Scoped-Bob', 'LINTER'), true);
      assert.strictEqual(reg.isApproverAuthorized('Scoped-Bob', 'UNSAFE_EVAL'), false);
    });
  });

  // ─── 4. validateGateException Fail-Closed Verification ───────────────────────
  describe('4. validateGateException Failure Modes', () => {
    const validPayload = {
      checkName: 'UNSAFE_EVAL',
      workspaceVersion: 'rev-001',
      pipelineRunId: 'run-001',
      approver: 'SecLead-Sarah',
      expiresAt: Date.now() + 60000,
      rationale: 'Approved sandbox eval for mathematical formula parser',
    };

    it('passes for a valid, cryptographically signed exception from registered approver', () => {
      const exception = createSignedGateException(validPayload, officerPrivPem);
      const res = validateGateException(exception, {
        checkName: 'UNSAFE_EVAL',
        workspaceVersion: 'rev-001',
        pipelineRunId: 'run-001',
      });
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.reason, undefined);
    });

    it('rejects undefined, null, or non-object exception', () => {
      const res1 = validateGateException(undefined, {
        checkName: 'UNSAFE_EVAL',
        workspaceVersion: 'rev-001',
        pipelineRunId: 'run-001',
      });
      assert.strictEqual(res1.valid, false);
      assert.strictEqual(res1.reason, 'Missing exception authorization record.');

      const res2 = validateGateException(null as any, {
        checkName: 'UNSAFE_EVAL',
        workspaceVersion: 'rev-001',
        pipelineRunId: 'run-001',
      });
      assert.strictEqual(res2.valid, false);
    });

    it('rejects missing or incomplete release validation context (fail-closed)', () => {
      const exception = createSignedGateException(validPayload, officerPrivPem);

      const resMissingCheck = validateGateException(exception, {
        checkName: '',
        workspaceVersion: 'rev-001',
        pipelineRunId: 'run-001',
      });
      assert.strictEqual(resMissingCheck.valid, false);
      assert.ok(resMissingCheck.reason?.includes('missing required checkName'));

      const resMissingVer = validateGateException(exception, {
        checkName: 'UNSAFE_EVAL',
        workspaceVersion: '',
        pipelineRunId: 'run-001',
      });
      assert.strictEqual(resMissingVer.valid, false);
      assert.ok(resMissingVer.reason?.includes('missing required workspaceVersion'));

      const resMissingRun = validateGateException(exception, {
        checkName: 'UNSAFE_EVAL',
        workspaceVersion: 'rev-001',
        pipelineRunId: '',
      });
      assert.strictEqual(resMissingRun.valid, false);
      assert.ok(resMissingRun.reason?.includes('missing required pipelineRunId'));
    });

    it('rejects malformed exception fields (missing required fields or invalid types)', () => {
      const base = createSignedGateException(validPayload, officerPrivPem);

      // Missing rationale
      const r1 = validateGateException({ ...base, rationale: '' }, {
        checkName: 'UNSAFE_EVAL',
        workspaceVersion: 'rev-001',
        pipelineRunId: 'run-001',
      });
      assert.strictEqual(r1.valid, false);
      assert.ok(r1.reason?.includes('rationale is missing'));

      // Non-numeric expiresAt
      const r2 = validateGateException({ ...base, expiresAt: 'tomorrow' as any }, {
        checkName: 'UNSAFE_EVAL',
        workspaceVersion: 'rev-001',
        pipelineRunId: 'run-001',
      });
      assert.strictEqual(r2.valid, false);
      assert.ok(r2.reason?.includes('expiresAt is missing or invalid'));

      // Negative or zero expiresAt
      const r3 = validateGateException({ ...base, expiresAt: 0 }, {
        checkName: 'UNSAFE_EVAL',
        workspaceVersion: 'rev-001',
        pipelineRunId: 'run-001',
      });
      assert.strictEqual(r3.valid, false);
      assert.ok(r3.reason?.includes('expiresAt is missing or invalid'));

      // Empty signature
      const r4 = validateGateException({ ...base, signature: '   ' }, {
        checkName: 'UNSAFE_EVAL',
        workspaceVersion: 'rev-001',
        pipelineRunId: 'run-001',
      });
      assert.strictEqual(r4.valid, false);
      assert.ok(r4.reason?.includes('signature is missing or empty'));
    });

    it('rejects context mismatches (checkName, workspaceVersion, pipelineRunId)', () => {
      const exception = createSignedGateException(validPayload, officerPrivPem);

      // Check name mismatch
      const rCheck = validateGateException(exception, {
        checkName: 'HARDCODED_SECRET',
        workspaceVersion: 'rev-001',
        pipelineRunId: 'run-001',
      });
      assert.strictEqual(rCheck.valid, false);
      assert.ok(rCheck.reason?.includes('Exception is for "UNSAFE_EVAL", not "HARDCODED_SECRET"'));

      // Revision mismatch (stale revision)
      const rVer = validateGateException(exception, {
        checkName: 'UNSAFE_EVAL',
        workspaceVersion: 'rev-002',
        pipelineRunId: 'run-001',
      });
      assert.strictEqual(rVer.valid, false);
      assert.ok(rVer.reason?.includes('workspace version does not match active revision'));

      // Run ID mismatch (cross-run replay)
      const rRun = validateGateException(exception, {
        checkName: 'UNSAFE_EVAL',
        workspaceVersion: 'rev-001',
        pipelineRunId: 'run-002',
      });
      assert.strictEqual(rRun.valid, false);
      assert.ok(rRun.reason?.includes('pipelineRunId does not match active run'));
    });

    it('rejects agent self-approvals strictly', () => {
      const agents = ['Coder', 'Debugger', 'Queen', 'Tester', 'Reviewer', 'Security', 'llm', 'autocoder'];
      for (const agentName of agents) {
        const exception: TrustedGateException = {
          ...validPayload,
          approver: agentName,
          signature: 'dummy-signature',
        };
        const res = validateGateException(exception, {
          checkName: 'UNSAFE_EVAL',
          workspaceVersion: 'rev-001',
          pipelineRunId: 'run-001',
        });
        assert.strictEqual(res.valid, false);
        assert.ok(res.reason?.includes('Unauthorized self-approval'));
      }
    });

    it('rejects expired exceptions', () => {
      const expiredPayload = {
        ...validPayload,
        expiresAt: Date.now() - 5000,
      };
      const exception = createSignedGateException(expiredPayload, officerPrivPem);

      const res = validateGateException(exception, {
        checkName: 'UNSAFE_EVAL',
        workspaceVersion: 'rev-001',
        pipelineRunId: 'run-001',
      });
      assert.strictEqual(res.valid, false);
      assert.strictEqual(res.reason, 'Exception has expired.');
    });

    it('rejects unknown/unenrolled approver identities (fail-closed)', () => {
      const unknownApproverPayload = {
        ...validPayload,
        approver: 'SecurityOfficer-Unknown',
      };
      const exception = createSignedGateException(unknownApproverPayload, attackerPrivPem);

      const res = validateGateException(exception, {
        checkName: 'UNSAFE_EVAL',
        workspaceVersion: 'rev-001',
        pipelineRunId: 'run-001',
      });
      assert.strictEqual(res.valid, false);
      assert.ok(res.reason?.includes('not enrolled in the trusted authority directory'));
    });

    it('rejects revoked or suspended approvers', () => {
      const revokedApprover: TrustedApprover = {
        id: 'Sec-Revoked',
        name: 'Revoked User',
        role: 'Former Lead',
        publicKey: officerPubPem,
        status: 'REVOKED',
      };
      registerTrustedApprover(revokedApprover);

      try {
        const exception = createSignedGateException(
          { ...validPayload, approver: 'Sec-Revoked' },
          officerPrivPem
        );
        const res = validateGateException(exception, {
          checkName: 'UNSAFE_EVAL',
          workspaceVersion: 'rev-001',
          pipelineRunId: 'run-001',
        });
        assert.strictEqual(res.valid, false);
        assert.ok(res.reason?.includes('has status "REVOKED"'));
      } finally {
        unregisterTrustedApprover('Sec-Revoked');
      }
    });

    it('rejects approver not permitted for the specific check', () => {
      const scopedApprover: TrustedApprover = {
        id: 'Sec-Scoped',
        name: 'Scoped User',
        role: 'Linter Analyst',
        publicKey: officerPubPem,
        status: 'ACTIVE',
        allowedChecks: ['LINTER'], // Not allowed for UNSAFE_EVAL
      };
      registerTrustedApprover(scopedApprover);

      try {
        const exception = createSignedGateException(
          { ...validPayload, approver: 'Sec-Scoped' },
          officerPrivPem
        );
        const res = validateGateException(exception, {
          checkName: 'UNSAFE_EVAL',
          workspaceVersion: 'rev-001',
          pipelineRunId: 'run-001',
        });
        assert.strictEqual(res.valid, false);
        assert.ok(res.reason?.includes('is not authorized to grant exceptions for check "UNSAFE_EVAL"'));
      } finally {
        unregisterTrustedApprover('Sec-Scoped');
      }
    });

    it('rejects forged cryptographic signatures and tampered payloads', () => {
      const exception = createSignedGateException(validPayload, officerPrivPem);

      // Tamper with rationale
      const tamperedRationale: TrustedGateException = {
        ...exception,
        rationale: 'Tampered rationale to sneak past review',
      };
      const resTampered = validateGateException(tamperedRationale, {
        checkName: 'UNSAFE_EVAL',
        workspaceVersion: 'rev-001',
        pipelineRunId: 'run-001',
      });
      assert.strictEqual(resTampered.valid, false);
      assert.ok(resTampered.reason?.includes('Cryptographic signature verification failed'));

      // Forged signature using attacker's private key claiming to be Sarah
      const forgedSig = signGateException(validPayload, attackerPrivPem);
      const forgedException: TrustedGateException = {
        ...validPayload,
        signature: forgedSig,
      };
      const resForged = validateGateException(forgedException, {
        checkName: 'UNSAFE_EVAL',
        workspaceVersion: 'rev-001',
        pipelineRunId: 'run-001',
      });
      assert.strictEqual(resForged.valid, false);
      assert.ok(resForged.reason?.includes('Cryptographic signature verification failed'));

      // Dummy nonempty string proof attempt
      const dummyProofException: TrustedGateException = {
        ...validPayload,
        signature: 'sig-valid-jane-7788',
      };
      const resDummy = validateGateException(dummyProofException, {
        checkName: 'UNSAFE_EVAL',
        workspaceVersion: 'rev-001',
        pipelineRunId: 'run-001',
      });
      assert.strictEqual(resDummy.valid, false);
      assert.ok(resDummy.reason?.includes('Cryptographic signature verification failed'));
    });
  });

  // ─── 5. decideRelease Mandatory Boundary Enforcement ─────────────────────────
  describe('5. decideRelease Production Release Decision Boundary', () => {
    const validException = createSignedGateException(
      {
        checkName: 'UNSAFE_EVAL',
        workspaceVersion: 'rev-rel-01',
        pipelineRunId: 'run-rel-01',
        approver: 'SecLead-Sarah',
        expiresAt: Date.now() + 60000,
        rationale: 'Approved sandbox eval for formula parsing',
      },
      officerPrivPem
    );

    it('allows release when all checks are passed or advisory', () => {
      const decision = decideRelease([
        { name: 'SECURITY_GATE', status: 'passed', criticality: 'blocking' },
        { name: 'LINTER', status: 'passed', criticality: 'blocking' },
        { name: 'OPTIONAL_SCAN', status: 'failed', criticality: 'advisory' },
      ]);
      assert.strictEqual(decision.decision, 'allow');
      assert.strictEqual(decision.reasons.length, 0);
    });

    it('blocks release on failing blocking check without exception', () => {
      const decision = decideRelease(
        [
          { name: 'UNSAFE_EVAL', status: 'failed', criticality: 'blocking' },
          { name: 'LINTER', status: 'passed', criticality: 'blocking' },
        ],
        { workspaceVersion: 'rev-rel-01', pipelineRunId: 'run-rel-01' }
      );
      assert.strictEqual(decision.decision, 'block');
      assert.strictEqual(decision.reasons[0], 'UNSAFE_EVAL: failed');
    });

    it('strictly removes legacy approvedException: true bypass from production release decision', () => {
      // Legacy approvedException: true was previously allowed without enforceTrustedExceptionsOnly.
      // Now it MUST be rejected unconditionally!
      const decision = decideRelease([
        {
          name: 'UNSAFE_EVAL',
          status: 'failed',
          criticality: 'blocking',
          approvedException: true,
        },
      ]);
      assert.strictEqual(decision.decision, 'block');
      assert.strictEqual(decision.reasons[0], 'UNSAFE_EVAL: failed');
    });

    it('fails closed when release decision context is missing but exception is required', () => {
      const decision = decideRelease([
        {
          name: 'UNSAFE_EVAL',
          status: 'failed',
          criticality: 'blocking',
          trustedException: validException,
        },
      ]);
      // No context provided -> cannot verify revision or run ID -> fails closed!
      assert.strictEqual(decision.decision, 'block');
    });

    it('allows release when blocking check has a cryptographically valid trusted exception', () => {
      const decision = decideRelease(
        [
          {
            name: 'UNSAFE_EVAL',
            status: 'failed',
            criticality: 'blocking',
            trustedException: validException,
          },
          {
            name: 'LINTER',
            status: 'passed',
            criticality: 'blocking',
          },
        ],
        {
          workspaceVersion: 'rev-rel-01',
          pipelineRunId: 'run-rel-01',
        }
      );
      assert.strictEqual(decision.decision, 'allow');
      assert.strictEqual(decision.reasons.length, 0);
    });

    it('blocks release if any blocking check has a forged or invalid exception', () => {
      const forgedException: TrustedGateException = {
        ...validException,
        signature: 'corrupted-sig-bytes',
      };

      const decision = decideRelease(
        [
          {
            name: 'UNSAFE_EVAL',
            status: 'failed',
            criticality: 'blocking',
            trustedException: forgedException,
          },
        ],
        {
          workspaceVersion: 'rev-rel-01',
          pipelineRunId: 'run-rel-01',
        }
      );
      assert.strictEqual(decision.decision, 'block');
      assert.strictEqual(decision.reasons[0], 'UNSAFE_EVAL: failed');
    });
  });

  // ─── 6. evaluateFinalPipelineGate Integration ────────────────────────────────
  describe('6. evaluateFinalPipelineGate Integration at Release Boundary', () => {
    const testPrefix = `final-gate-sec-${Date.now()}`;
    const convId = `${testPrefix}-conv`;
    const runId = `${testPrefix}-run`;



    const testArchMd = `### Tech Stack
- Frontend: Next.js
- Frontend Entry Point: src/calc.ts
- Backend: None
- Backend Entry Point: None
- Database: None
- ORM: None
- Authentication: None
- Build Tool: Next.js
- Additional: None

### Project Folder Structure
project-root/
└── src/
    └── calc.ts

### Project Files
- src/calc.ts

### Modules
**Core**
- Responsibility: Logic.
- Owned Files: src/calc.ts
- Depends On: None
- Supports Features: Core

### Conventions
- **File Naming**: camelCase
`;

    const testBlueprintMd = `### File: src/calc.ts
- **Owner Module**: Core
- **Purpose**: Calculator logic.
- **Dependencies**: None
- **Specs Required**: None
- **Exports**: export function calc(x: string)
`;

    const STAGE_FILES: Record<string, string> = {
      Queen: 'queen.md',
      Planner: 'plan.md',
      Architect: 'architecture.md',
      System: 'system.md',
      Designer: 'design.md',
      Blueprinter: 'blueprint.md',
      Coder: 'coder.md',
      Tester: 'test_report.md',
      Security: 'security_report.md',
      Reviewer: 'review_report.md',
    };

    before(async () => {
      const { computeWorkspaceFingerprint } = await import('../../verification-loop');

      await prisma.conversation.create({
        data: {
          id: convId,
          title: 'Final Gate Exception Test',
          status: 'IN_PROGRESS',
          currentStage: 'Reviewer',
        },
      });

      await prisma.pipelineRun.create({
        data: {
          id: runId,
          conversationId: convId,
          state: 'RUNNING',
          leaseOwner: 'test-runner',
          leaseExpiresAt: new Date(Date.now() + 60000),
        },
      });

      // Add virtual file first so computeWorkspaceFingerprint includes it
      await prisma.virtualFile.create({
        data: {
          conversationId: convId,
          filePath: 'src/calc.ts',
          content: 'export function calc(x: string) { return eval(x); }',
        },
      });

      const initialWorkspaceHash = await computeWorkspaceFingerprint(convId);

      const validSecContent = `# Security Report\n\n### Overall Status\nSECURE\n\n### Security Score\n95\n\n### Vulnerabilities Found\nNone.\n\n### Security Checks Performed\n- Static: PASS\n\n### Recommendations\nNone.\n\n### Workspace Hash\n${initialWorkspaceHash}\n`;
      const validRevContent = `# Review Report\n\n### Overall Assessment\nACCEPT\n\n### Quality Score\n95\n\n### Architectural Conformance\nPASS\n\n### Requirement Coverage\nPASS\n\n### Findings\nNone.\n\n### Workspace Hash\n${initialWorkspaceHash}\n`;
      const validTestContent = `# Test Report\n\n### Test Summary\nPASS\n\n### Workspace Hash\n${initialWorkspaceHash}\n`;

      // Populate mandatory stages with valid contract formats
      for (const [stage, filePath] of Object.entries(STAGE_FILES)) {
        let content = `# ${stage} Output\n`;
        if (stage === 'Architect') {
          content = testArchMd;
        } else if (stage === 'Blueprinter') {
          content = testBlueprintMd;
        } else if (stage === 'Security') {
          content = validSecContent;
        } else if (stage === 'Reviewer') {
          content = validRevContent;
        } else if (stage === 'Tester') {
          content = validTestContent;
        }

        await prisma.artifactVersion.create({
          data: {
            conversationId: convId,
            pipelineRunId: runId,
            stageName: stage,
            filePath,
            version: 1,
            state: 'ACCEPTED',
            projectionStatus: 'SYNCED',
            content,
            contractHash: 'c-hash',
            contentHash: 'hash',
          },
        });
      }

      await prisma.verificationRun.create({
        data: {
          conversationId: convId,
          pipelineRunId: runId,
          cycle: 1,
          success: true,
          workspaceHash: initialWorkspaceHash,
          failuresJson: '[]',
          warningsJson: '[]',
        },
      });
    });

    after(async () => {
      await prisma.virtualFile.deleteMany({ where: { conversationId: convId } });
      await prisma.verificationRun.deleteMany({ where: { conversationId: convId } });
      await prisma.artifactVersion.deleteMany({ where: { conversationId: convId } });
      await prisma.pipelineRun.deleteMany({ where: { id: runId } });
      await prisma.conversation.deleteMany({ where: { id: convId } });
    });

    it('fails closed when deterministic security finding is present without exception', async () => {
      const res = await evaluateFinalPipelineGate(convId, runId, 'test-runner');
      assert.strictEqual(res.valid, false);
      const hasSecurityBlock = res.errors.some((e) => e.includes('Deterministic Security Gate blocked'));
      assert.strictEqual(hasSecurityBlock, true);
    });

    it('rejects release when deterministic security finding has legacy approvedException: true in DB', async () => {
      // Create legacy gate decision with approvedException: true in reason
      const gateDec = await prisma.gateDecision.create({
        data: {
          conversationId: convId,
          pipelineRunId: runId,
          stageName: 'Security',
          gateName: 'SECURITY_GATE',
          decision: 'APPROVED',
          actor: 'Coder',
          reason: JSON.stringify({ approvedException: true }),
        },
      });

      try {
        const res = await evaluateFinalPipelineGate(convId, runId, 'test-runner');
        assert.strictEqual(res.valid, false);
        const hasSecurityBlock = res.errors.some((e) => e.includes('Deterministic Security Gate blocked'));
        assert.strictEqual(hasSecurityBlock, true);
      } finally {
        await prisma.gateDecision.delete({ where: { id: gateDec.id } });
      }
    });

    it('rejects release when deterministic security finding has a forged exception', async () => {
      const { computeWorkspaceFingerprint } = await import('../../verification-loop');
      const currentWorkspaceHash = await computeWorkspaceFingerprint(convId);

      const forgedException: TrustedGateException = {
        checkName: 'UNSAFE_EVAL',
        workspaceVersion: currentWorkspaceHash,
        pipelineRunId: runId,
        approver: 'SecLead-Sarah',
        signature: 'forged-invalid-sig-bytes',
        expiresAt: Date.now() + 60000,
        rationale: 'Attacker forged exception',
      };

      const res = await evaluateFinalPipelineGate(convId, runId, 'test-runner', {
        trustedExceptions: [forgedException],
      });
      assert.strictEqual(res.valid, false);
      const hasSecurityBlock = res.errors.some((e) =>
        e.includes('Deterministic Security Gate blocked') && e.includes('Cryptographic signature verification failed')
      );
      assert.strictEqual(hasSecurityBlock, true);
    });

    it('allows release when valid signed exception from authorized approver is provided', async () => {
      // Calculate current workspace hash for calc.ts
      const { computeWorkspaceFingerprint } = await import('../../verification-loop');
      const currentWorkspaceHash = await computeWorkspaceFingerprint(convId);

      // Create valid signed exception bound to current workspace hash and runId
      const validException = createSignedGateException(
        {
          checkName: 'UNSAFE_EVAL',
          workspaceVersion: currentWorkspaceHash,
          pipelineRunId: runId,
          approver: 'SecLead-Sarah',
          expiresAt: Date.now() + 60000,
          rationale: 'Approved sandbox eval for mathematical formula evaluation',
        },
        officerPrivPem
      );

      const res = await evaluateFinalPipelineGate(convId, runId, 'test-runner', {
        trustedExceptions: [validException],
      });

      // No security block errors!
      const securityErrors = res.errors.filter((e) => e.includes('Deterministic Security Gate blocked'));
      assert.strictEqual(securityErrors.length, 0);
      assert.strictEqual(res.valid, true);
    });
  });
});
