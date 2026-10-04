import { prisma } from '../../db';
import { computeWorkspaceFingerprint } from './verification-loop';
import { extractRequiredSection } from './contracts/markdown-sections';
import { parseSecurityOutput } from './contracts/schemas/security';
import { parseReviewerOutput } from './contracts/schemas/reviewer';
import { extractEmbeddedWorkspaceHash } from './workspace-policy';


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

  const currentWorkspaceFingerprint = await computeWorkspaceFingerprint(conversationId);

  // 2. Require latest accepted artifacts for mandatory pipeline stages in THIS pipelineRunId
  const requiredStages = [
    'Queen',
    'Planner',
    'Architect',
    'System',
    'Designer',
    'Blueprinter',
    'Coder',
    'Tester',
    'Security',
    'Reviewer',
  ];

  for (const stageName of requiredStages) {
    const accepted = await prisma.artifactVersion.findFirst({
      where: {
        conversationId,
        pipelineRunId,
        stageName,
        state: 'ACCEPTED',
      },
      orderBy: { version: 'desc' },
    });

    if (!accepted) {
      errors.push(`Final Gate Error: Missing accepted artifact for mandatory stage "${stageName}" in run ${pipelineRunId}.`);
    } else {
      // Check embedded workspace hash for Tester, Security, Reviewer
      if (['Tester', 'Security', 'Reviewer'].includes(stageName)) {
        const embedded = extractEmbeddedWorkspaceHash(stageName, accepted.content);
        if (!embedded || embedded !== currentWorkspaceFingerprint) {
          errors.push(
            `Final Gate Error: Stage "${stageName}" artifact has stale workspace hash "${embedded}" (expected "${currentWorkspaceFingerprint}").`
          );
        }
      }
    }
  }

  // 3. Conditional Debugger Check
  const debuggerExec = await prisma.stageExecution.findFirst({
    where: { conversationId, pipelineRunId, stageName: 'Debugger', state: 'ACCEPTED' },
  });

  if (debuggerExec) {
    // Debugger was invoked and succeeded in this run
  }

  // 4. Require VerificationRun to exist for this run, pass, and match current workspace state
  const latestVerification = await prisma.verificationRun.findFirst({
    where: { conversationId, pipelineRunId },
    orderBy: { createdAt: 'desc' },
  });

  if (!latestVerification) {
    errors.push(`Final Gate Error: Missing mandatory VerificationRun for run ${pipelineRunId}.`);
  } else if (!latestVerification.success) {
    errors.push('Final Gate Error: Latest Tester verification run failed.');
  } else if (latestVerification.workspaceHash !== currentWorkspaceFingerprint) {
    errors.push('Final Gate Error: Latest VerificationRun workspace hash does not match current project workspace state (stale verification).');
  }

  // 5. Require Security pass
  const securityArtifact = await prisma.artifactVersion.findFirst({
    where: { conversationId, pipelineRunId, stageName: 'Security', state: 'ACCEPTED' },
    orderBy: { version: 'desc' },
  });

  if (!securityArtifact || !securityArtifact.content) {
    errors.push('Final Gate Error: Missing mandatory accepted Security stage artifact.');
  } else {
    const { output, errors: secErrors } = parseSecurityOutput(securityArtifact.content);
    if (!output || secErrors.length > 0) {
      errors.push(`Final Gate Error: Security stage report validation failed: ${secErrors.join('; ')}`);
    } else if (output.status !== 'SECURE' && output.status !== 'SECURE_WITH_WARNINGS') {
      errors.push(`Final Gate Error: Security status is not SECURE or SECURE_WITH_WARNINGS: "${output.status}".`);
    }
  }

  // 6. Require Reviewer pass
  const reviewerArtifact = await prisma.artifactVersion.findFirst({
    where: { conversationId, pipelineRunId, stageName: 'Reviewer', state: 'ACCEPTED' },
    orderBy: { version: 'desc' },
  });

  if (!reviewerArtifact || !reviewerArtifact.content) {
    errors.push('Final Gate Error: Missing mandatory accepted Reviewer stage artifact.');
  } else {
    const { output, errors: revErrors } = parseReviewerOutput(reviewerArtifact.content);
    if (!output || revErrors.length > 0) {
      errors.push(`Final Gate Error: Reviewer report validation failed: ${revErrors.join('; ')}`);
    } else {
      if (output.qualityScore < 80) {
        errors.push(`Final Gate Error: Reviewer quality score (${output.qualityScore}) is below required minimum 80.`);
      }
      if (!output.architecturalConformance) {
        errors.push('Final Gate Error: Reviewer reported architectural conformance failure.');
      }
      if (!output.requirementCoverage) {
        errors.push('Final Gate Error: Reviewer reported requirement coverage failure.');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
