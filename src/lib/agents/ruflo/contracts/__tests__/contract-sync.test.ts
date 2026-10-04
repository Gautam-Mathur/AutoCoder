import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getStageContract, STAGE_CONTRACTS } from '../registry';
import { CONTRACT_VERSIONS, StageName } from '../versions';

describe('Contract Synchronization', () => {
  it('registers canonical stage contracts for all 11 stages', () => {
    const expectedStages: StageName[] = [
      'Queen',
      'Planner',
      'Architect',
      'System',
      'Designer',
      'Blueprinter',
      'Coder',
      'Tester',
      'Debugger',
      'Security',
      'Reviewer',
    ];

    for (const stage of expectedStages) {
      assert.ok(STAGE_CONTRACTS[stage], `STAGE_CONTRACTS missing stage ${stage}`);
      assert.ok(CONTRACT_VERSIONS[stage], `CONTRACT_VERSIONS missing stage ${stage}`);
    }
  });

  it('exposes matching output artifact names and contracts in stage contract graph', () => {
    const expectedArtifacts: Record<StageName, string> = {
      Queen: 'plan.md',
      Planner: 'requirements.md',
      Architect: 'architecture.md',
      System: 'backend_spec.md',
      Designer: 'ui_spec.md',
      Blueprinter: 'blueprint.md',
      Coder: 'workspace.manifest.json',
      Tester: 'test_report.md',
      Debugger: 'debug_report.md',
      Security: 'security_report.md',
      Reviewer: 'review_report.md',
    };

    for (const [stage, expectedFile] of Object.entries(expectedArtifacts)) {
      const contract = getStageContract(stage);
      const version = CONTRACT_VERSIONS[stage as StageName];
      assert.strictEqual(contract.outputArtifact.name, expectedFile, `Stage ${stage} artifact name mismatch`);
      assert.strictEqual(contract.outputArtifact.name, version.outputArtifactName, `Stage ${stage} version file mismatch`);
      assert.strictEqual(contract.version, '1.1.0', `Stage ${stage} version must be 1.1.0`);
    }
  });

  it('verifies upstream dependency declarations for Coder, Security, and Reviewer', () => {
    const coder = getStageContract('Coder');
    assert.ok(coder.inputArtifacts.some((art) => art.name === 'blueprint.md' && art.contract === 'BlueprintOutput'));
    assert.ok(coder.inputArtifacts.some((art) => art.name === 'architecture.md' && art.contract === 'ArchitectureOutput'));

    const security = getStageContract('Security');
    assert.ok(security.inputArtifacts.some((art) => art.name === 'workspace.manifest.json' && art.contract === 'CoderOutput'));

    const reviewer = getStageContract('Reviewer');
    assert.ok(reviewer.inputArtifacts.some((art) => art.name === 'workspace.manifest.json' && art.contract === 'CoderOutput'));
  });
});
