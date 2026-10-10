import { prisma } from '../../db';
import { getStageContract, StageName } from './contracts/registry';
import { CONTRACT_VERSIONS } from './contracts/versions';
import { createContentHash } from './contracts/fingerprints';
import { assertInputCompatibility, assertOutputCompatibility } from './contracts/compatibility';
import { resolveAcceptedStageInputs, commitAcceptedArtifact, invalidateDescendants } from './artifact-store';
import { validateStageCandidate } from './stage-acceptance';
import { assertPipelineLease } from './pipeline-lease';
import { appendPipelineEvent } from './pipeline-events';
import { runAgent } from './orchestrator';
import { StageLedger } from './memory';
import {
  generateWorkspaceManifest,
  loadAuthorizedFileSet,
  writeAuthorizedProjectFile,
} from './vfs';
import {
  computeWorkspaceFingerprint,
  runDeterministicTesterReport,
} from './verification-loop';
import {
  isControlPlaneArtifact,
  normalizeProjectPath,
  extractEmbeddedWorkspaceHash,
} from './workspace-policy';

export interface ExecuteContractStageParams {
  conversationId: string;
  pipelineRunId: string;
  stageName: StageName;
  attempt?: number;
  userPromptText: string;
  onEvent: (event: any) => void;
  ledger: StageLedger;
  leaseOwnerId: string;
  signal?: AbortSignal;
  customUserContent?: string;
  targetFile?: string;
}

export async function executeContractStage(params: ExecuteContractStageParams) {
  const {
    conversationId,
    pipelineRunId,
    stageName,
    userPromptText,
    onEvent,
    ledger,
    leaseOwnerId,
    signal,
    customUserContent,
    targetFile,
  } = params;

  // Step 8.1 — Acquire stage contract
  const contract = getStageContract(stageName);
  const versionInfo = CONTRACT_VERSIONS[stageName];

  // Step 8.2 — Assert pipeline lease
  await assertPipelineLease(conversationId, leaseOwnerId);

  // Auto-increment attempt number based on previous executions for this stage and run
  const previousExecs = await prisma.stageExecution.count({
    where: { pipelineRunId, stageName },
  });
  const attempt = previousExecs + 1;

  // Step 8.3 — Resolve accepted inputs (strictly scoped to this pipelineRunId)
  const resolvedInputs = await resolveAcceptedStageInputs({
    conversationId,
    pipelineRunId,
    stageName,
  });

  // Step 8.3b — Assert input contract compatibility
  assertInputCompatibility({
    stageName,
    requiredInputs: contract.inputArtifacts,
    resolvedInputs: resolvedInputs.inputDetails,
  });

  // Step 8.4 — Create StageExecution database record
  const stageExecution = await prisma.stageExecution.create({
    data: {
      conversationId,
      pipelineRunId,
      stageName,
      attempt,
      state: 'RUNNING',
      startedAt: new Date(),
    },
  });

  await appendPipelineEvent({
    conversationId,
    pipelineRunId,
    eventType: 'STAGE_STARTED',
    stageName,
    payload: { attempt, inputArtifacts: resolvedInputs.artifactIds, stageExecutionId: stageExecution.id },
  });

  try {
    let candidateContent = '';
    const currentWorkspaceHash = await computeWorkspaceFingerprint(conversationId);

    // Stage-specific candidate generation logic
    if (stageName === 'Coder') {
      const authorized = await loadAuthorizedFileSet(conversationId, pipelineRunId);
      const targetFilesToBuild = targetFile
        ? [normalizeProjectPath(targetFile)]
        : authorized.authorizedFiles;

      for (const tf of targetFilesToBuild) {
        if (isControlPlaneArtifact(tf)) {
          throw new Error(`Authorization Exception: Coder stage cannot target control plane artifact "${tf}".`);
        }
        if (!authorized.authorizedFiles.includes(tf)) {
          throw new Error(`Authorization Exception: Target file "${tf}" is not in authorized file set.`);
        }

        const agentResult = await runAgent(
          conversationId,
          'Coder',
          userPromptText,
          onEvent,
          ledger,
          attempt,
          customUserContent,
          signal,
          undefined,
          tf,
          false // persistOutput = false (we persist via writeAuthorizedProjectFile below)
        );

        const codeContent = agentResult?.content || '';
        await writeAuthorizedProjectFile({
          conversationId,
          pipelineRunId,
          stageExecutionId: stageExecution.id,
          filePath: tf,
          content: codeContent,
        });
      }

      const manifest = await generateWorkspaceManifest(conversationId, stageExecution.id, authorized);
      candidateContent = JSON.stringify(manifest, null, 2);
    } else if (stageName === 'Tester') {
      const reportRes = await runDeterministicTesterReport({
        conversationId,
        pipelineRunId,
        stageExecutionId: stageExecution.id,
        cycle: attempt,
      });
      candidateContent = reportRes.content;
    } else if (stageName === 'Debugger') {
      const agentResult = await runAgent(
        conversationId,
        'Debugger',
        userPromptText,
        onEvent,
        ledger,
        attempt,
        customUserContent,
        signal,
        undefined,
        targetFile,
        true
      );
      candidateContent = agentResult?.content || '';
    } else if (stageName === 'Security') {
      const securityContext = [
        customUserContent,
        `Current Workspace Fingerprint Hash:\n${currentWorkspaceHash}`,
      ].filter(Boolean).join('\n\n');

      const agentResult = await runAgent(
        conversationId,
        'Security',
        userPromptText,
        onEvent,
        ledger,
        attempt,
        securityContext,
        signal,
        undefined,
        targetFile,
        true
      );
      candidateContent = agentResult?.content || '';
    } else if (stageName === 'Reviewer') {
      const reviewerContext = [
        customUserContent,
        `Current Workspace Fingerprint Hash:\n${currentWorkspaceHash}`,
      ].filter(Boolean).join('\n\n');

      const agentResult = await runAgent(
        conversationId,
        'Reviewer',
        userPromptText,
        onEvent,
        ledger,
        attempt,
        reviewerContext,
        signal,
        undefined,
        targetFile,
        true
      );
      candidateContent = agentResult?.content || '';
    } else {
      const agentResult = await runAgent(
        conversationId,
        stageName,
        userPromptText,
        onEvent,
        ledger,
        attempt,
        customUserContent,
        signal,
        undefined,
        targetFile,
        true
      );
      candidateContent = agentResult?.content || '';
    }

    const contentHash = createContentHash(candidateContent);

    // Step 8.6 — Persist candidate metadata
    await prisma.stageExecution.update({
      where: { id: stageExecution.id },
      data: {
        state: 'VALIDATING',
        candidateHash: contentHash,
      },
    });

    await appendPipelineEvent({
      conversationId,
      pipelineRunId,
      eventType: 'CANDIDATE_GENERATED',
      stageName,
      payload: { contentHash, stageExecutionId: stageExecution.id },
    });

    // Load authorized set for evidence if available
    let authorizedForEvidence;
    try {
      authorizedForEvidence = await loadAuthorizedFileSet(conversationId, pipelineRunId);
    } catch {
      // Upstream architecture/blueprint may not be accepted yet (e.g. Queen/Planner stages)
    }

    // Step 8.7 — Run stage-specific validators
    const validationResult = await validateStageCandidate({
      conversationId,
      pipelineRunId,
      candidate: {
        stage: stageName,
        executionId: stageExecution.id,
        attempt,
        content: candidateContent,
        contentHash,
        generatedAt: new Date(),
      },
      upstreamContext: resolvedInputs.inputs,
      evidence: {
        currentWorkspaceHash,
        authorized: authorizedForEvidence,
      },
    });

    if (!validationResult.accepted) {
      const errMessage = validationResult.errors.join('; ');
      await prisma.stageExecution.update({
        where: { id: stageExecution.id },
        data: {
          state: 'FAILED',
          validationErrors: errMessage,
          completedAt: new Date(),
        },
      });

      await prisma.gateDecision.create({
        data: {
          conversationId,
          pipelineRunId,
          stageName,
          gateName: 'STAGE_VALIDATION',
          decision: 'FAIL',
          actor: 'SYSTEM',
          reason: errMessage,
        },
      });

      await appendPipelineEvent({
        conversationId,
        pipelineRunId,
        eventType: 'VALIDATION_FAILED',
        stageName,
        payload: { errors: validationResult.errors, stageExecutionId: stageExecution.id },
      });

      throw new Error(`Stage validation failed for ${stageName}: ${errMessage}`);
    }

    // Check cancellation signal and assert pipeline lease before committing
    if (signal?.aborted) {
      throw new Error(`Stage execution for ${stageName} was aborted by signal.`);
    }
    await assertPipelineLease(conversationId, leaseOwnerId);

    // Step 8.8 — Assert output contract compatibility
    assertOutputCompatibility({
      stageName,
      expectedOutput: contract.outputArtifact,
      producedOutput: {
        name: contract.outputArtifact.name,
        contract: contract.outputArtifact.contract,
        version: contract.outputArtifact.version,
      },
    });

    // Record PASS gate decision
    await prisma.gateDecision.create({
      data: {
        conversationId,
        pipelineRunId,
        stageName,
        gateName: 'STAGE_VALIDATION',
        decision: 'PASS',
        actor: 'SYSTEM',
        reason: 'Validation passed successfully',
      },
    });

    await appendPipelineEvent({
      conversationId,
      pipelineRunId,
      eventType: 'VALIDATION_PASSED',
      stageName,
      payload: { stageExecutionId: stageExecution.id },
    });

    // Step 8.9 — Commit accepted artifact with provenance
    const acceptedArtifact = await commitAcceptedArtifact({
      conversationId,
      pipelineRunId,
      stageExecutionId: stageExecution.id,
      stage: stageName,
      filePath: contract.outputArtifact.name,
      content: candidateContent,
      contractName: contract.outputArtifact.contract,
      contractVersion: contract.outputArtifact.version,
      contractHash: contentHash,
      validatorVersion: versionInfo.validatorVersion,
      promptVersion: versionInfo.promptVersion,
      parentArtifactIds: resolvedInputs.artifactIds,
      dependencyFingerprint: resolvedInputs.dependencyFingerprint,
    });

    // Invalidate descendant artifacts since a new version was accepted
    await invalidateDescendants(conversationId, stageName, pipelineRunId);

    // Step 8.10 — Update StageExecution state to ACCEPTED
    await prisma.stageExecution.update({
      where: { id: stageExecution.id },
      data: {
        state: 'ACCEPTED',
        artifactPath: acceptedArtifact.filePath,
        artifactVersion: acceptedArtifact.version,
        completedAt: new Date(),
      },
    });

    await appendPipelineEvent({
      conversationId,
      pipelineRunId,
      eventType: 'ARTIFACT_ACCEPTED',
      stageName,
      payload: { artifactId: acceptedArtifact.id, filePath: acceptedArtifact.filePath, stageExecutionId: stageExecution.id },
    });

    return {
      stageExecution,
      artifact: acceptedArtifact,
      content: candidateContent,
    };
  } catch (error: any) {
    await prisma.stageExecution.update({
      where: { id: stageExecution.id },
      data: {
        state: 'FAILED',
        validationErrors: error.message,
        completedAt: new Date(),
      },
    }).catch(() => {});

    throw error;
  }
}
