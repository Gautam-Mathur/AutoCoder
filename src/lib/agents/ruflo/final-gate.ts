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
  const requiredStages = ['Queen', 'Planner', 'Architect', 'System', 'Designer', 'Blueprinter', 'Coder', 'Tester', 'Security', 'Reviewer'];
  for (const stageName of requiredStages) {
    const accepted = await prisma.artifactVersion.findFirst({
      where: {
        conversationId,
        stageName,
        state: 'ACCEPTED',
      },
    });

    if (!accepted) {
      // Fallback check for Coder virtual files if legacy
      if (stageName === 'Coder') {
        const virtualFilesCount = await prisma.virtualFile.count({
          where: { conversationId },
        });
        if (virtualFilesCount === 0) {
          errors.push(`Missing accepted artifact for stage ${stageName}`);
        }
      } else {
        errors.push(`Missing accepted artifact for stage ${stageName}`);
      }
    }
  }

  // 2. Require VerificationRun to exist and pass
  const latestVerification = await prisma.verificationRun.findFirst({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
  });

  if (!latestVerification) {
    errors.push('Missing mandatory VerificationRun.');
  } else if (!latestVerification.success) {
    errors.push('Latest Tester verification run failed.');
  }

  // 3. Require Security pass
  const securityArtifact = await prisma.artifactVersion.findFirst({
    where: { conversationId, stageName: 'Security', state: 'ACCEPTED' },
  });
  const securityOutput = await prisma.securityStageOutput.findUnique({
    where: { conversationId },
  });
  if (!securityArtifact && !securityOutput) {
    errors.push('Missing mandatory Security stage evaluation.');
  } else if (securityOutput && securityOutput.status === 'FAILED') {
    errors.push('Security stage evaluation failed.');
  } else if (securityArtifact && securityArtifact.content && !/PASS/i.test(securityArtifact.content)) {
    errors.push('Security stage report did not pass.');
  }

  // 4. Require Reviewer pass
  const reviewerArtifact = await prisma.artifactVersion.findFirst({
    where: { conversationId, stageName: 'Reviewer', state: 'ACCEPTED' },
  });
  const reviewerOutput = await prisma.reviewerStageOutput.findUnique({
    where: { conversationId },
  });
  if (!reviewerArtifact && !reviewerOutput) {
    errors.push('Missing mandatory Reviewer stage evaluation.');
  } else if (reviewerOutput && reviewerOutput.status === 'FAILED') {
    errors.push('Reviewer stage evaluation failed.');
  } else if (reviewerArtifact && reviewerArtifact.content && !/PASS/i.test(reviewerArtifact.content)) {
    errors.push('Reviewer stage report did not pass.');
  }

  // 5. Check lease state (no active lease)
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
