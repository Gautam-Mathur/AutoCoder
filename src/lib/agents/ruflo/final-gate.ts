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
  if (!securityArtifact || !securityArtifact.content) {
    errors.push('Missing mandatory accepted Security stage artifact.');
  } else {
    const statusText = extractRequiredSection(securityArtifact.content, '### Overall Status');
    const isSecure = statusText.includes('SECURE') || statusText.includes('SECURE_WITH_WARNINGS');
    const isVulnerable = statusText.includes('VULNERABLE') || statusText.includes('CRITICAL');
    if (isVulnerable || !isSecure) {
      errors.push(`Security stage report status is invalid or failed: "${statusText}".`);
    }
  }

  // 6. Require Reviewer pass
  const reviewerArtifact = await prisma.artifactVersion.findFirst({
    where: { conversationId, stageName: 'Reviewer', state: 'ACCEPTED' },
  });
  if (!reviewerArtifact || !reviewerArtifact.content) {
    errors.push('Missing mandatory accepted Reviewer stage artifact.');
  } else {
    try {
      const parsed = JSON.parse(reviewerArtifact.content);
      if (!parsed || parsed.status !== 'PASS') {
        errors.push(`Reviewer stage evaluation failed with status: ${parsed?.status || 'UNKNOWN'}.`);
      }
    } catch (e: any) {
      errors.push(`Reviewer stage report content is not valid JSON: ${e.message}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function extractRequiredSection(content: string, heading: string): string {
  const headingIndex = content.indexOf(heading);
  if (headingIndex === -1) return '';
  const startIndex = headingIndex + heading.length;
  const nextHeadingMatch = content.slice(startIndex).match(/\n#{1,3}\s+/);
  const endIndex = nextHeadingMatch ? startIndex + nextHeadingMatch.index! : content.length;
  return content.slice(startIndex, endIndex).trim();
}

