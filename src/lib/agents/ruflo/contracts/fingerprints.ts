import crypto from 'crypto';
import { CONTRACT_VERSIONS, StageName } from './versions';
import { AGENT_DEFS } from '../agents';

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

export function computeStageContractFingerprint(stageName: StageName): string {
  const versionInfo = CONTRACT_VERSIONS[stageName];
  const agentDef = AGENT_DEFS[stageName];
  return computeContractFingerprint({
    contractName: versionInfo.contractName,
    contractVersion: versionInfo.version,
    schemaContent: JSON.stringify({
      format: versionInfo.format,
      outputArtifactName: versionInfo.outputArtifactName,
      requiredHeadings: versionInfo.requiredHeadings || [],
      parserId: versionInfo.parserId,
    }),
    promptContent: `${versionInfo.promptVersion}:${agentDef?.systemPrompt || ''}`,
    validatorContent: `${versionInfo.validatorVersion}:${versionInfo.parserId}`,
  });
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
