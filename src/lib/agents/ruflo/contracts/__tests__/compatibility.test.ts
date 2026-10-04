import { describe, it } from 'node:test';
import assert from 'node:assert';
import { assertArtifactCompatibility, checkArtifactCompatibility, verifyArtifactConsumable } from '../compatibility';

describe('Contract Compatibility', () => {
  it('passes when produced version is greater than or equal to minVersion', () => {
    const res = checkArtifactCompatibility({
      produced: { name: 'plan.md', contract: 'PlannerOutput', version: '1.0.0' },
      required: [{ name: 'plan.md', contract: 'PlannerOutput', minVersion: '1.0.0' }],
    });
    assert.strictEqual(res.compatible, true);
  });

  it('fails when produced version is less than minVersion', () => {
    const res = checkArtifactCompatibility({
      produced: { name: 'plan.md', contract: 'PlannerOutput', version: '0.9.0' },
      required: [{ name: 'plan.md', contract: 'PlannerOutput', minVersion: '1.0.0' }],
    });
    assert.strictEqual(res.compatible, false);
    assert.match(res.error || '', /Version mismatch/);
  });

  it('throws on assertArtifactCompatibility when incompatible', () => {
    assert.throws(
      () =>
        assertArtifactCompatibility({
          produced: { name: 'plan.md', contract: 'PlannerOutput', version: '0.9.0' },
          required: [{ name: 'plan.md', contract: 'PlannerOutput', minVersion: '1.0.0' }],
          stageName: 'Architect',
        }),
      /CONTRACT COMPATIBILITY ERROR/
    );
  });

  it('verifies artifact consumable conditions strictly', () => {
    const valid = verifyArtifactConsumable({
      name: 'plan.md',
      contract: 'PlannerOutput',
      version: '1.0.0',
      status: 'ACCEPTED',
      contentHash: 'hash1',
      persistedHash: 'hash1',
      dependencyFingerprint: 'fp1',
      currentDependencyFingerprint: 'fp1',
      artifactVersion: 1,
      expectedArtifactVersion: 1,
    });
    assert.strictEqual(valid.consumable, true);

    const invalidStatus = verifyArtifactConsumable({
      name: 'plan.md',
      contract: 'PlannerOutput',
      version: '1.0.0',
      status: 'CANDIDATE',
      contentHash: 'hash1',
      persistedHash: 'hash1',
      dependencyFingerprint: 'fp1',
      currentDependencyFingerprint: 'fp1',
      artifactVersion: 1,
      expectedArtifactVersion: 1,
    });
    assert.strictEqual(invalidStatus.consumable, false);
  });
});
