import { prisma } from '../../db';
import { getStageContract, StageName } from './contracts/registry';
import { CONTRACT_VERSIONS } from './contracts/versions';
import { createContentHash } from './contracts/fingerprints';
import { assertInputCompatibility, assertOutputCompatibility } from './contracts/compatibility';
import { resolveAcceptedStageInputs, commitAcceptedArtifact } from './artifact-store';
import { validateStageCandidate } from './stage-acceptance';
import { assertPipelineLease } from './pipeline-lease';
import { appendPipelineEvent } from './pipeline-events';
import { runAgent } from './orchestrator';
import { StageLedger } from './memory';
import { generateWorkspaceManifest } from './vfs';

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
    attempt = 1,
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

  // Step 8.3 — Resolve accepted inputs
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
    // Step 8.5 — Generate candidate
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

    let candidateContent = agentResult?.content || '';
    if (stageName === 'Coder') {
      const manifest = await generateWorkspaceManifest(conversationId, stageExecution.id);
      candidateContent = JSON.stringify(manifest, null, 2);
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
