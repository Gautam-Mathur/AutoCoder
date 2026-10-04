import { StageInputArtifact } from './registry';

export interface ProducedArtifactInfo {
  name: string;
  contract: string;
  version: string;
  status: string;
  contentHash: string;
  persistedHash: string;
  dependencyFingerprint: string;
  currentDependencyFingerprint: string;
  artifactVersion: number;
  expectedArtifactVersion: number;
}

export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map((p) => parseInt(p, 10) || 0);
  const parts2 = v2.split('.').map((p) => parseInt(p, 10) || 0);
  const maxLength = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLength; i++) {
    const val1 = parts1[i] || 0;
    const val2 = parts2[i] || 0;
    if (val1 > val2) return 1;
    if (val1 < val2) return -1;
  }
  return 0;
}

export function checkArtifactCompatibility(params: {
  produced: { name: string; contract: string; version: string };
  required: StageInputArtifact[];
}): { compatible: boolean; error?: string } {
  for (const req of params.required) {
    if (req.name === params.produced.name || req.contract === params.produced.contract) {
      if (req.contract !== params.produced.contract) {
        return {
          compatible: false,
          error: `Contract mismatch for artifact ${params.produced.name}. Expected ${req.contract}, got ${params.produced.contract}`,
        };
      }
      if (compareVersions(params.produced.version, req.minVersion) < 0) {
        return {
          compatible: false,
          error: `Version mismatch for artifact ${params.produced.name}. Produced ${params.produced.contract} v${params.produced.version}, required >= v${req.minVersion}`,
        };
      }
    }
  }
  return { compatible: true };
}

export function assertArtifactCompatibility(params: {
  produced: { name: string; contract: string; version: string };
  required: StageInputArtifact[];
  stageName?: string;
}): void {
  const res = checkArtifactCompatibility(params);
  if (!res.compatible) {
    throw new Error(
      `CONTRACT COMPATIBILITY ERROR\n\nArtifact:\n  ${params.produced.name}\n\nProduced:\n  ${params.produced.contract} v${params.produced.version}\n\nError:\n  ${res.error}\n\nStage:\n  ${params.stageName || 'Unknown'}\n\nExecution blocked.`
    );
  }
}

export function verifyArtifactConsumable(artifact: ProducedArtifactInfo): { consumable: boolean; reason?: string } {
  if (artifact.status !== 'ACCEPTED') {
    return { consumable: false, reason: `Artifact status is ${artifact.status}, expected ACCEPTED` };
  }
  if (artifact.contentHash !== artifact.persistedHash) {
    return { consumable: false, reason: `Artifact content hash mismatch. Found ${artifact.contentHash}, expected ${artifact.persistedHash}` };
  }
  if (artifact.dependencyFingerprint !== artifact.currentDependencyFingerprint) {
    return { consumable: false, reason: `Artifact dependency fingerprint is stale.` };
  }
  if (artifact.artifactVersion !== artifact.expectedArtifactVersion) {
    return { consumable: false, reason: `Artifact version mismatch (${artifact.artifactVersion} vs expected ${artifact.expectedArtifactVersion})` };
  }
  return { consumable: true };
}
