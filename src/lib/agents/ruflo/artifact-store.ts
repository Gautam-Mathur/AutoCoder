import { prisma } from '../../db';
import { createContentHash, computeDependencyFingerprint } from './contracts/fingerprints';
import { getStageContract, STAGE_CONTRACTS } from './contracts/registry';
import { getDescendantStages } from './contracts/stage-graph';
import { assertArtifactFreshForStage } from './contracts/compatibility';
import { writeVirtualFile, generateWorkspaceManifest, loadAuthorizedFileSet } from './vfs';
import { extractEmbeddedWorkspaceHash } from './workspace-policy';
import { StageName } from './contracts/versions';


export interface CommitArtifactParams {
  conversationId: string;
  pipelineRunId: string;
  stageExecutionId?: string;
  stage: string;
  filePath: string;
  content: string;
  contractName?: string;
  contractVersion?: string;
  contractHash?: string;
  validatorVersion?: string;
  promptVersion?: string;
  parentArtifactIds?: string[];
  dependencyFingerprint?: string;
}

export async function commitAcceptedArtifact(params: CommitArtifactParams) {
  const contentHash = createContentHash(params.content);

  const artifact = await prisma.$transaction(async (tx) => {
    const latest = await tx.artifactVersion.findFirst({
      where: {
        conversationId: params.conversationId,
        filePath: params.filePath,
      },
      orderBy: {
        version: 'desc',
      },
    });

    const version = (latest?.version ?? 0) + 1;

    if (latest) {
      await tx.artifactVersion.updateMany({
        where: {
          conversationId: params.conversationId,
          filePath: params.filePath,
          state: 'ACCEPTED',
        },
        data: { state: 'SUPERSEDED' },
      });
    }

    return tx.artifactVersion.create({
      data: {
        conversationId: params.conversationId,
        pipelineRunId: params.pipelineRunId,
        stageExecutionId: params.stageExecutionId,
        stageName: params.stage,
        filePath: params.filePath,
        version,
        contentHash,
        content: params.content,
        contractName: params.contractName,
        contractVersion: params.contractVersion,
        contractHash: params.contractHash,
        validatorVersion: params.validatorVersion,
        promptVersion: params.promptVersion,
        parentArtifactIds: params.parentArtifactIds ? JSON.stringify(params.parentArtifactIds) : undefined,
        dependencyFingerprint: params.dependencyFingerprint,
        state: 'ACCEPTED',
      },
    });
  });

  // Materialize to VFS workspace projection
  await writeVirtualFile(params.conversationId, params.filePath, params.content);

  return artifact;
}

export interface InputDetail {
  contractName: string;
  contractVersion: string;
  content: string;
  status: string;
}

export interface ResolvedStageInputs {
  inputs: Record<string, string>;
  inputDetails: Record<string, InputDetail>;
  artifactIds: string[];
  dependencyFingerprint: string;
}

export async function resolveAcceptedStageInputs(params: {
  conversationId: string;
  pipelineRunId?: string;
  stageName: string;
  allowCrossRunReuse?: boolean;
}): Promise<ResolvedStageInputs> {
  const contract = getStageContract(params.stageName);
  const inputs: Record<string, string> = {};
  const inputDetails: Record<string, InputDetail> = {};
  const artifactIds: string[] = [];
  const depHashes: string[] = [];

  for (const inputDef of contract.inputArtifacts) {
    const whereCondition: any = {
      conversationId: params.conversationId,
      filePath: inputDef.name,
      state: 'ACCEPTED',
    };

    if (params.pipelineRunId && !params.allowCrossRunReuse) {
      whereCondition.pipelineRunId = params.pipelineRunId;
    }

    const artifact = await prisma.artifactVersion.findFirst({
      where: whereCondition,
      orderBy: {
        version: 'desc',
      },
    });

    if (!artifact) {
      throw new Error(
        `Required input artifact '${inputDef.name}' for stage '${params.stageName}' was not found in ACCEPTED state.`
      );
    }

    // Verify content hash integrity
    const computedHash = createContentHash(artifact.content);
    if (artifact.contentHash && artifact.contentHash !== computedHash) {
      throw new Error(
        `Artifact hash mismatch for '${inputDef.name}': stored ${artifact.contentHash} vs computed ${computedHash}`
      );
    }

    inputs[inputDef.name] = artifact.content;
    inputDetails[inputDef.name] = {
      contractName: artifact.contractName || inputDef.contract,
      contractVersion: artifact.contractVersion || '1.0.0',
      content: artifact.content,
      status: artifact.state,
    };
    artifactIds.push(artifact.id);
    depHashes.push(`${artifact.filePath}:${artifact.version}:${artifact.contentHash || computedHash}`);
  }

  const dependencyFingerprint = computeDependencyFingerprint(depHashes);

  return {
    inputs,
    inputDetails,
    artifactIds,
    dependencyFingerprint,
  };
}

export async function invalidateDescendants(
  conversationId: string,
  stageName: StageName,
  pipelineRunId: string
): Promise<number> {
  const descendants = getDescendantStages(stageName);
  if (descendants.length === 0) return 0;

  const descendantFilePaths: string[] = [];
  for (const st of descendants) {
    const reg = STAGE_CONTRACTS[st as keyof typeof STAGE_CONTRACTS];
    if (reg?.outputArtifact?.name) {
      descendantFilePaths.push(reg.outputArtifact.name);
    }
  }

  if (descendantFilePaths.length === 0) return 0;

  const updated = await prisma.artifactVersion.updateMany({
    where: {
      conversationId,
      pipelineRunId,
      filePath: { in: descendantFilePaths },
      state: 'ACCEPTED',
    },
    data: { state: 'INVALIDATED' },
  });

  return updated.count;
}

export async function findReusableAcceptedArtifact(params: {
  conversationId: string;
  stageName: StageName;
  pipelineRunId: string;
  expectedDependencyFingerprint: string;
  expectedContractVersion: string;
  expectedPromptVersion: string;
  expectedValidatorVersion: string;
  currentWorkspaceHash?: string;
}) {
  const reg = STAGE_CONTRACTS[params.stageName as keyof typeof STAGE_CONTRACTS];
  if (!reg?.outputArtifact?.name) return null;

  const artifact = await prisma.artifactVersion.findFirst({
    where: {
      conversationId: params.conversationId,
      pipelineRunId: params.pipelineRunId,
      filePath: reg.outputArtifact.name,
      state: 'ACCEPTED',
    },
    orderBy: { version: 'desc' },
  });

  if (!artifact) return null;

  if (
    artifact.dependencyFingerprint !== params.expectedDependencyFingerprint ||
    artifact.contractVersion !== params.expectedContractVersion ||
    artifact.promptVersion !== params.expectedPromptVersion ||
    artifact.validatorVersion !== params.expectedValidatorVersion
  ) {
    return null;
  }

  if (['Tester', 'Security', 'Reviewer'].includes(params.stageName)) {
    const embedded = extractEmbeddedWorkspaceHash(params.stageName, artifact.content);
    if (!embedded || (params.currentWorkspaceHash && embedded !== params.currentWorkspaceHash)) {
      return null;
    }
  }

  return artifact;
}

export async function refreshCoderWorkspaceManifest(
  conversationId: string,
  pipelineRunId: string,
  debuggerStageExecutionId: string
) {
  const authorized = await loadAuthorizedFileSet(conversationId, pipelineRunId);
  const manifest = await generateWorkspaceManifest(conversationId, debuggerStageExecutionId, authorized);
  const content = JSON.stringify(manifest, null, 2);

  const resolved = await resolveAcceptedStageInputs({
    conversationId,
    pipelineRunId,
    stageName: 'Coder',
  });

  const coderReg = STAGE_CONTRACTS.Coder;

  const artifact = await commitAcceptedArtifact({
    conversationId,
    pipelineRunId,
    stageExecutionId: debuggerStageExecutionId,
    stage: 'Coder',
    filePath: 'workspace.manifest.json',
    content,
    contractName: coderReg.outputArtifact.contract,
    contractVersion: coderReg.outputArtifact.version,
    contractHash: createContentHash(content),
    validatorVersion: '1.2.0',
    promptVersion: '1.2.0',
    parentArtifactIds: resolved.artifactIds,
    dependencyFingerprint: resolved.dependencyFingerprint,
  });

  await invalidateDescendants(conversationId, 'Coder', pipelineRunId);

  return artifact;
}


export async function getLatestAcceptedArtifact(conversationId: string, filePath: string) {
  return prisma.artifactVersion.findFirst({
    where: {
      conversationId,
      filePath,
      state: 'ACCEPTED',
    },
    orderBy: {
      version: 'desc',
    },
  });
}

export async function buildArtifactContext(conversationId: string, currentStage: string): Promise<Record<string, string>> {
  const accepted = await prisma.artifactVersion.findMany({
    where: {
      conversationId,
      state: 'ACCEPTED',
    },
    orderBy: {
      version: 'asc',
    },
  });

  const context: Record<string, string> = {};
  for (const item of accepted) {
    context[item.filePath] = item.content;
  }
  return context;
}
