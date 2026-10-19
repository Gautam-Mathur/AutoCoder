import { prisma } from '../../db';
import { computeWorkspaceFingerprint } from './verification-loop';
import { parseSecurityOutput } from './contracts/schemas/security';
import { parseReviewerOutput } from './contracts/schemas/reviewer';
import {
  extractEmbeddedWorkspaceHash,
  isControlPlaneArtifact,
  loadAuthorizedFileSet,
  normalizeProjectPath,
} from './workspace-policy';
import {
  validateSecurityGate,
  decideRelease,
  validateGateException,
  type TrustedGateException,
  type TrustedExceptionAuthorizationService,
  type CheckCriticality,
  type CheckStatus,
} from './security-gate';

export interface FinalGateResult {
  valid: boolean;
  errors: string[];
}

export async function evaluateFinalPipelineGate(
  conversationId: string,
  pipelineRunId: string,
  leaseOwnerId?: string,
  options?: {
    trustedExceptions?: TrustedGateException[];
    authorityService?: TrustedExceptionAuthorizationService;
  }
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
      if ((accepted as any).projectionStatus && (accepted as any).projectionStatus !== 'SYNCED') {
        errors.push(
          `Final Gate Error: Stage "${stageName}" artifact has unsynced VFS projectionStatus "${(accepted as any).projectionStatus}".`
        );
      }

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

  // 5. Require Security stage report pass
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

  // 6. Require Deterministic Security Gate pass on current workspace VFS files (F-06, F-14)
  const vfsRecords = await prisma.virtualFile.findMany({
    where: { conversationId },
  });
  const vfsFileMap: Record<string, string> = {};
  for (const vf of vfsRecords) {
    const norm = normalizeProjectPath(vf.filePath);
    if (!isControlPlaneArtifact(norm)) {
      vfsFileMap[norm] = vf.content;
    }
  }

  const authorizedFileSet = await loadAuthorizedFileSet(conversationId, pipelineRunId);
  const requiredWorkspaceFiles =
    Array.isArray(authorizedFileSet.blueprintFiles) && authorizedFileSet.blueprintFiles.length > 0
      ? authorizedFileSet.blueprintFiles
      : Object.keys(vfsFileMap);

  const deterministicSecurity = validateSecurityGate(vfsFileMap, requiredWorkspaceFiles);

  // Load any recorded trusted gate exceptions from GateDecision table or passed options
  const dbGateDecisions = await prisma.gateDecision.findMany({
    where: { conversationId, pipelineRunId, decision: 'APPROVED' },
  });
  const trustedExceptions: TrustedGateException[] = [...(options?.trustedExceptions || [])];
  for (const gd of dbGateDecisions) {
    if (gd.reason) {
      try {
        const parsed = JSON.parse(gd.reason);
        if (parsed && typeof parsed === 'object' && parsed.signature && parsed.checkName) {
          trustedExceptions.push(parsed as TrustedGateException);
        }
      } catch {
        // Not a JSON exception payload
      }
    }
  }

  if (deterministicSecurity.blocking.length > 0) {
    const securityChecks = deterministicSecurity.blocking.map((block) => {
      const matchingException = trustedExceptions.find(
        (e) => e.checkName === block.ruleId || e.checkName === 'SECURITY_GATE'
      );
      return {
        name: block.ruleId,
        status: 'failed' as CheckStatus,
        criticality: 'blocking' as CheckCriticality,
        trustedException: matchingException,
      };
    });

    const releaseDecision = decideRelease(securityChecks, {
      workspaceVersion: currentWorkspaceFingerprint,
      pipelineRunId,
      authorityService: options?.authorityService,
    });

    if (releaseDecision.decision === 'block') {
      for (const block of deterministicSecurity.blocking) {
        const matchingException = trustedExceptions.find(
          (e) => e.checkName === block.ruleId || e.checkName === 'SECURITY_GATE'
        );
        const val = matchingException
          ? validateGateException(matchingException, {
              checkName: block.ruleId,
              workspaceVersion: currentWorkspaceFingerprint,
              pipelineRunId,
              authorityService: options?.authorityService,
            })
          : { valid: false, reason: 'Missing exception authorization record.' };

        if (!val.valid) {
          errors.push(
            `Final Gate Error: Deterministic Security Gate blocked (${block.file}:${block.line} [${block.ruleId}]): ${block.message}${val.reason ? ` (Exception rejected: ${val.reason})` : ''}`
          );
        }
      }
    }
  }

  // 7. Check QualityGate decision if recorded for this run (F-06)
  const latestQualityGate = await prisma.gateDecision.findFirst({
    where: {
      conversationId,
      pipelineRunId,
      gateName: 'QUALITY_GATE',
    },
    orderBy: { createdAt: 'desc' },
  });

  if (latestQualityGate && latestQualityGate.decision === 'BLOCKED') {
    const overrideDecision = await prisma.gateDecision.findFirst({
      where: {
        conversationId,
        pipelineRunId,
        gateName: 'QUALITY_GATE_OVERRIDE',
        decision: 'APPROVED',
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!overrideDecision) {
      errors.push(
        `Final Gate Error: Deterministic Quality Gate decision is BLOCKED (${latestQualityGate.reason || 'FINAL_GATE_FAILED'}) without an audited QUALITY_GATE_OVERRIDE.`
      );
    }
  }

  // 8. Require Reviewer pass
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
