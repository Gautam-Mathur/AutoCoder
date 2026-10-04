import { prisma } from '../../db';
import { createContentHash, computeDependencyFingerprint } from './contracts/fingerprints';
import { writeVirtualFile } from './vfs';

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
