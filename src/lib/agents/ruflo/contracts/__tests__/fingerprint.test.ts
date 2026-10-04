import { describe, it } from 'node:test';
import assert from 'node:assert';
import { computeContractFingerprint, computeDependencyFingerprint } from '../fingerprints';

describe('Contract Fingerprints', () => {
  it('computes deterministic contract fingerprints', () => {
    const fp1 = computeContractFingerprint({
      contractName: 'ArchitectureOutput',
      contractVersion: '1.0.0',
      schemaContent: 'schema1',
      promptContent: 'prompt1',
      validatorContent: 'val1',
    });

    const fp2 = computeContractFingerprint({
      contractName: 'ArchitectureOutput',
      contractVersion: '1.0.0',
      schemaContent: 'schema1',
      promptContent: 'prompt1',
      validatorContent: 'val1',
    });

    assert.strictEqual(fp1, fp2);
  });

  it('changes fingerprint when prompt content changes', () => {
    const fp1 = computeContractFingerprint({
      contractName: 'ArchitectureOutput',
      contractVersion: '1.0.0',
      promptContent: 'prompt1',
    });

    const fp2 = computeContractFingerprint({
      contractName: 'ArchitectureOutput',
      contractVersion: '1.0.0',
      promptContent: 'prompt2',
    });

    assert.notStrictEqual(fp1, fp2);
  });

  it('computes dependency fingerprints independently of array ordering', () => {
    const dfp1 = computeDependencyFingerprint(['hashA', 'hashB']);
    const dfp2 = computeDependencyFingerprint(['hashB', 'hashA']);
    assert.strictEqual(dfp1, dfp2);
  });
});
