import crypto from 'crypto';

export type ContractFingerprint = {
  contractName: string;
  contractVersion: string;
  schemaHash: string;
  promptHash: string;
  validatorHash: string;
};

export function computeContractFingerprint(params: {
  contractName: string;
  contractVersion: string;
  schemaContent?: string;
  promptContent?: string;
  validatorContent?: string;
}): string {
  const schemaHash = crypto
    .createHash('sha256')
    .update(params.schemaContent || '')
    .digest('hex');
  const promptHash = crypto
    .createHash('sha256')
    .update(params.promptContent || '')
    .digest('hex');
  const validatorHash = crypto
    .createHash('sha256')
    .update(params.validatorContent || '')
    .digest('hex');

  return crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        contractName: params.contractName,
        contractVersion: params.contractVersion,
        schemaHash,
        promptHash,
        validatorHash,
      })
    )
    .digest('hex');
}

export function computeDependencyFingerprint(parentArtifactHashes: string[]): string {
  const sorted = [...parentArtifactHashes].sort();
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(sorted))
    .digest('hex');
}

export function createContentHash(content: string): string {
  return crypto
    .createHash('sha256')
    .update(content)
    .digest('hex');
}
