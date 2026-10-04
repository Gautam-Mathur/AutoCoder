import { prisma } from '../../db';

export interface FinalGateResult {
  valid: boolean;
  errors: string[];
}

export async function evaluateFinalPipelineGate(
  conversationId: string,
  pipelineRunId: string
): Promise<FinalGateResult> {
  const errors: string[] = [];

  // 1. Require latest accepted artifacts for core spec stages
  const requiredStages = ['Architect', 'System', 'Designer', 'Blueprinter'];
  for (const stageName of requiredStages) {
    const accepted = await prisma.artifactVersion.findFirst({
      where: {
        conversationId,
        stageName,
        state: 'ACCEPTED',
      },
    });
    if (!accepted) {
      errors.push(`Missing accepted artifact for stage ${stageName}`);
    }
  }

  // 2. Require Coder acceptance
  const coderAccepted = await prisma.artifactVersion.findFirst({
    where: {
      conversationId,
      stageName: 'Coder',
      state: 'ACCEPTED',
    },
  });
  if (!coderAccepted) {
    // Check if virtual files exist in workspace
    const virtualFilesCount = await prisma.virtualFile.count({
      where: { conversationId },
    });
    if (virtualFilesCount === 0) {
      errors.push('No accepted Coder artifacts or VirtualFiles found in workspace.');
    }
  }

  // 3. Require latest Tester pass
  const latestVerification = await prisma.verificationRun.findFirst({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
  });

  if (latestVerification && !latestVerification.success) {
    errors.push('Latest Tester verification run failed.');
  }

  // 4. Require Security pass
  const securityOutput = await prisma.securityStageOutput.findUnique({
    where: { conversationId },
  });
  if (securityOutput && securityOutput.status === 'FAILED') {
    errors.push('Security stage evaluation failed.');
  }

  // 5. Require Reviewer pass
  const reviewerOutput = await prisma.reviewerStageOutput.findUnique({
    where: { conversationId },
  });
  if (reviewerOutput && reviewerOutput.status === 'FAILED') {
    errors.push('Reviewer stage evaluation failed.');
  }

  // 6. Require no active lease
  const run = await prisma.pipelineRun.findUnique({
    where: { conversationId },
  });
  if (run?.leaseOwner && run.leaseExpiresAt && run.leaseExpiresAt.getTime() > Date.now()) {
    errors.push('Pipeline lease is still held by an active process.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
