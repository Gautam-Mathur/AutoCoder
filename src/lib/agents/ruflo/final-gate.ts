import { prisma } from '../../db';
import { computeWorkspaceFingerprint } from './verification-loop';

export interface FinalGateResult {
  valid: boolean;
  errors: string[];
}

export async function evaluateFinalPipelineGate(
  conversationId: string,
  pipelineRunId: string,
  leaseOwnerId?: string
): Promise<FinalGateResult> {
  const errors: string[] = [];

  // 1. Check pipeline lease ownership and validity
  const run = await prisma.pipelineRun.findUnique({
    where: { conversationId },
  });

  if (!run || !run.leaseOwner || !run.leaseExpiresAt || run.leaseExpiresAt.getTime() <= Date.now()) {
    errors.push('Pipeline lease is missing or expired at final gate evaluation.');
  } else if (leaseOwnerId && run.leaseOwner !== leaseOwnerId) {
    errors.push(`Pipeline lease owner mismatch (${run.leaseOwner} vs expected ${leaseOwnerId}).`);
  }

  // 2. Require latest accepted artifacts for mandatory pipeline stages (No legacy fallbacks)
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
      errors.push(`Missing accepted artifact for stage ${stageName}`);
    }
  }

  // 3. Conditional Debugger Requirement
  const debuggerExec = await prisma.stageExecution.findFirst({
    where: { conversationId, stageName: 'Debugger' },
  });

  if (debuggerExec) {
    const debuggerArtifact = await prisma.artifactVersion.findFirst({
      where: { conversationId, stageName: 'Debugger', state: 'ACCEPTED' },
    });
    if (!debuggerArtifact) {
      errors.push('Debugger was invoked during repair cycle but missing accepted debug_report.md artifact.');
    }
  }

  // 4. Require VerificationRun to exist, pass, and match current workspace state
  const latestVerification = await prisma.verificationRun.findFirst({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
  });

  const currentWorkspaceFingerprint = await computeWorkspaceFingerprint(conversationId);

  if (!latestVerification) {
    errors.push('Missing mandatory VerificationRun.');
  } else if (!latestVerification.success) {
    errors.push('Latest Tester verification run failed.');
  } else if (latestVerification.workspaceHash !== currentWorkspaceFingerprint) {
    errors.push('Latest VerificationRun workspace hash does not match current workspace state (stale verification).');
  }

  // 5. Require Security pass
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

  // 6. Require Reviewer pass
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

  return {
    valid: errors.length === 0,
    errors,
  };
}

