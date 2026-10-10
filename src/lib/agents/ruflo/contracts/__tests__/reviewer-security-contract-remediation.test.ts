import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CONTRACT_VERSIONS } from '../versions';
import { REVIEWER_SCHEMA, parseReviewerOutput } from '../schemas/reviewer';
import { SECURITY_SCHEMA, parseSecurityOutput } from '../schemas/security';
import { validateStageCandidate } from '../../stage-acceptance';

describe('Reviewer & Security Contract Remediation (C-04–C-09, C-20, C-23, C-24)', () => {
  const dummyCtx = (stage: string, content: string, currentWorkspaceHash?: string) => ({
    conversationId: 'test-convo',
    pipelineRunId: 'test-run',
    candidate: {
      stage,
      executionId: 'exec-test-1',
      attempt: 1,
      content,
      contentHash: 'content-hash-1',
      generatedAt: new Date(),
    },
    evidence: {
      currentWorkspaceHash,
    },
  });

  const testHash = 'c'.repeat(64);

  it('proves CONTRACT_VERSIONS and Schemas alignment (C-04, C-05, C-24, Sec. 32)', () => {
    // Reviewer
    assert.strictEqual(CONTRACT_VERSIONS.Reviewer.format, 'markdown');
    assert.strictEqual(CONTRACT_VERSIONS.Reviewer.version, '1.2.0');
    assert.strictEqual(CONTRACT_VERSIONS.Reviewer.outputArtifactName, 'review_report.md');
    assert.strictEqual(REVIEWER_SCHEMA.version, '1.2.0');
    assert.deepStrictEqual(CONTRACT_VERSIONS.Reviewer.requiredHeadings, [
      '### Overall Assessment',
      '### Quality Score',
      '### Architectural Conformance',
      '### Requirement Coverage',
      '### Findings',
      '### Workspace Hash',
    ]);

    // Security
    assert.strictEqual(CONTRACT_VERSIONS.Security.format, 'markdown');
    assert.strictEqual(CONTRACT_VERSIONS.Security.version, '1.2.0');
    assert.strictEqual(CONTRACT_VERSIONS.Security.outputArtifactName, 'security_report.md');
    assert.strictEqual(SECURITY_SCHEMA.version, '1.2.0');
    assert.deepStrictEqual(CONTRACT_VERSIONS.Security.requiredHeadings, [
      '### Overall Status',
      '### Security Score',
      '### Vulnerabilities Found',
      '### Security Checks Performed',
      '### Recommendations',
      '### Workspace Hash',
    ]);
  });

  describe('Reviewer Contract Tests (R-01–R-11)', () => {
    const validReport = `# Review Report

### Overall Assessment
The project meets all functional criteria and architectural boundaries.

### Quality Score
88

### Architectural Conformance
PASS - Clean component boundaries.

### Requirement Coverage
PASS - All acceptance criteria met.

### Findings
No findings.

### Workspace Hash
${testHash}`;

    it('R-01: Valid Markdown report is accepted', async () => {
      const res = await validateStageCandidate(dummyCtx('Reviewer', validReport, testHash));
      assert.strictEqual(res.accepted, true, `Validation failed: ${res.errors.join(', ')}`);
      const parsed = parseReviewerOutput(validReport);
      assert.ok(parsed.output);
      assert.strictEqual(parsed.output.qualityScore, 88);
      assert.strictEqual(parsed.output.architecturalConformance, true);
      assert.strictEqual(parsed.output.requirementCoverage, true);
      assert.strictEqual(parsed.output.workspaceHash, testHash);
    });

    it('R-02: Missing required section is rejected', async () => {
      const bad = validReport.replace('### Overall Assessment', '### Summary');
      const parsed = parseReviewerOutput(bad);
      assert.strictEqual(parsed.output, null);
      assert.ok(parsed.errors.some((e) => e.includes('Missing required section "### Overall Assessment"')));
    });

    it('R-03: Invalid quality scores are rejected', () => {
      const negativeScore = validReport.replace('88', '-5');
      assert.ok(parseReviewerOutput(negativeScore).errors.some((e) => e.includes('Quality score must be between 0 and 100')));

      const overflowScore = validReport.replace('88', '105');
      assert.ok(parseReviewerOutput(overflowScore).errors.some((e) => e.includes('Quality score must be between 0 and 100')));

      const nonIntScore = validReport.replace('88', 'eighty-eight');
      assert.ok(parseReviewerOutput(nonIntScore).errors.some((e) => e.includes('must contain an integer between 0 and 100')));
    });

    it('R-04: Invalid architectural conformance token is rejected', () => {
      const maybeArch = validReport.replace('PASS - Clean', 'MAYBE - Partial');
      const parsed = parseReviewerOutput(maybeArch);
      assert.ok(parsed.errors.some((e) => e.includes('must explicitly start with PASS or FAIL')));
    });

    it('R-05: Invalid requirement coverage token is rejected', () => {
      const partialReq = validReport.replace('PASS - All acceptance', 'PARTIAL - Some met');
      const parsed = parseReviewerOutput(partialReq);
      assert.ok(parsed.errors.some((e) => e.includes('must explicitly start with PASS or FAIL')));
    });

    it('R-06: Quality score below 80 fails stage acceptance', async () => {
      const lowScore = validReport.replace('88', '75');
      const res = await validateStageCandidate(dummyCtx('Reviewer', lowScore, testHash));
      assert.strictEqual(res.accepted, false);
      assert.ok(res.errors.some((e) => e.includes('below required minimum of 80')));
    });

    it('R-07: Conformance or coverage FAIL fails stage acceptance', async () => {
      const failArch = validReport.replace('PASS - Clean', 'FAIL - Layering violation');
      const resArch = await validateStageCandidate(dummyCtx('Reviewer', failArch, testHash));
      assert.strictEqual(resArch.accepted, false);
      assert.ok(resArch.errors.some((e) => e.includes('Architectural conformance is false')));

      const failReq = validReport.replace('PASS - All acceptance', 'FAIL - Missing login');
      const resReq = await validateStageCandidate(dummyCtx('Reviewer', failReq, testHash));
      assert.strictEqual(resReq.accepted, false);
      assert.ok(resReq.errors.some((e) => e.includes('Requirement coverage is false')));
    });

    it('R-08: Stale workspace hash fails stage acceptance', async () => {
      const staleHash = 'd'.repeat(64);
      const res = await validateStageCandidate(dummyCtx('Reviewer', validReport, staleHash));
      assert.strictEqual(res.accepted, false);
      assert.ok(res.errors.some((e) => e.includes('Stale workspace hash')));
    });
  });

  describe('Security Contract Tests (S-01–S-11)', () => {
    const validSecReport = `# Security Audit Report

### Overall Status
SECURE

### Security Score
96

### Vulnerabilities Found
No vulnerabilities found. The code passed security review.

### Security Checks Performed
- **Authentication**: PASS - Tokens verified.
- **Input Validation**: PASS - Zod schemas enforced.

### Recommendations
- Enforce strict HTTPS in production.

### Workspace Hash
${testHash}`;

    it('S-01: SECURE report is valid and accepted', async () => {
      const res = await validateStageCandidate(dummyCtx('Security', validSecReport, testHash));
      assert.strictEqual(res.accepted, true, `Validation failed: ${res.errors.join(', ')}`);
      const parsed = parseSecurityOutput(validSecReport);
      assert.ok(parsed.output);
      assert.strictEqual(parsed.output.status, 'SECURE');
      assert.strictEqual(parsed.output.securityScore, 96);
      assert.ok(parsed.output.checksPerformed.includes('Authentication'));
      assert.strictEqual(parsed.output.workspaceHash, testHash);
    });

    it('S-02: SECURE_WITH_WARNINGS report is valid and accepted', async () => {
      const warningReport = validSecReport.replace('SECURE\n', 'SECURE_WITH_WARNINGS\n');
      const res = await validateStageCandidate(dummyCtx('Security', warningReport, testHash));
      assert.strictEqual(res.accepted, true);
      const parsed = parseSecurityOutput(warningReport);
      assert.strictEqual(parsed.output?.status, 'SECURE_WITH_WARNINGS');
    });

    it('S-03 & S-04: VULNERABLE and CRITICAL are structurally accepted at stage level (C-07, Sec. 15)', async () => {
      // VULNERABLE
      const vulnReport = validSecReport.replace('SECURE\n', 'VULNERABLE\n').replace('96', '55');
      const resVuln = await validateStageCandidate(dummyCtx('Security', vulnReport, testHash));
      assert.strictEqual(resVuln.accepted, true, 'VULNERABLE report must be structurally accepted at stage acceptance');
      assert.strictEqual(parseSecurityOutput(vulnReport).output?.status, 'VULNERABLE');

      // CRITICAL
      const critReport = validSecReport.replace('SECURE\n', 'CRITICAL\n').replace('96', '25');
      const resCrit = await validateStageCandidate(dummyCtx('Security', critReport, testHash));
      assert.strictEqual(resCrit.accepted, true, 'CRITICAL report must be structurally accepted at stage acceptance');
      assert.strictEqual(parseSecurityOutput(critReport).output?.status, 'CRITICAL');
    });

    it('S-05: Invalid status token is rejected by parser', () => {
      const badStatus = validSecReport.replace('SECURE\n', 'COMPROMISED\n');
      const parsed = parseSecurityOutput(badStatus);
      assert.strictEqual(parsed.output, null);
      assert.ok(parsed.errors.some((e) => e.includes('Invalid Security Status token')));
    });

    it('S-06: Security score integer validation', () => {
      const invalidScore = validSecReport.replace('96', 'one-hundred');
      const parsed = parseSecurityOutput(invalidScore);
      assert.ok(parsed.errors.some((e) => e.includes('must contain an integer between 0 and 100')));

      const overflowScore = validSecReport.replace('96', '120');
      const parsedOverflow = parseSecurityOutput(overflowScore);
      assert.ok(parsedOverflow.errors.some((e) => e.includes('must be between 0 and 100')));
    });

    it('S-07: Stale workspace hash fails stage acceptance', async () => {
      const staleHash = 'e'.repeat(64);
      const res = await validateStageCandidate(dummyCtx('Security', validSecReport, staleHash));
      assert.strictEqual(res.accepted, false);
      assert.ok(res.errors.some((e) => e.includes('Stale workspace hash')));
    });

    it('S-08: Missing Workspace Hash section is strictly rejected (no executor auto-append)', async () => {
      const missingHash = validSecReport.replace(/### Workspace Hash[\s\S]*$/, '');
      const parsed = parseSecurityOutput(missingHash);
      assert.strictEqual(parsed.output, null);
      assert.ok(parsed.errors.some((e) => e.includes('Missing required section "### Workspace Hash"')));
    });
  });
});
