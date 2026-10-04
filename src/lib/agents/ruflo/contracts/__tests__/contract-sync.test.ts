import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getStageContract, STAGE_CONTRACTS } from '../registry';

describe('Contract Synchronization', () => {
  it('registers canonical stage contracts for all stages', () => {
    const stages = Object.keys(STAGE_CONTRACTS);
    assert.ok(stages.includes('Queen'));
    assert.ok(stages.includes('Planner'));
    assert.ok(stages.includes('Architect'));
    assert.ok(stages.includes('Blueprinter'));
    assert.ok(stages.includes('Coder'));
    assert.ok(stages.includes('Tester'));
    assert.ok(stages.includes('Debugger'));
    assert.ok(stages.includes('Reviewer'));
    assert.ok(stages.includes('Security'));
  });

  it('exposes matching output artifact versions in stage contract graph', () => {
    const arch = getStageContract('Architect');
    assert.strictEqual(arch.outputArtifact.name, 'architecture.md');
    assert.strictEqual(arch.outputArtifact.contract, 'ArchitectureOutput');

    const coder = getStageContract('Coder');
    assert.ok(coder.inputArtifacts.some((art) => art.name === 'blueprint.json' && art.contract === 'BlueprintOutput'));
    assert.ok(coder.inputArtifacts.some((art) => art.name === 'architecture.md' && art.contract === 'ArchitectureOutput'));
  });
});
