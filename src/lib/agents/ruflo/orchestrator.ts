import { EventEmitter } from 'events';
import ts from 'typescript';
import { prisma } from '../../db';
import {
  runInference,
  getLLMConfig,
  startOllamaKeepAlive,
  stopOllamaKeepAlive,
  cleanJsonResponse,
  InferenceOptions,
  InferenceTurnResult,
  Message,
} from '../inference';
import { getToolsForAgent } from './toolbox';
import { executeToolLoop, ToolCallLogEntry, stripRawToolCallMarkup } from './tool-loop';
import { writeAgentOutput, queryAgentOutput } from '../sml';
import { AGENT_DEFS, AgentDef } from './agents';
import { loadExecutiveMemory, writeExecutiveMemoryRecord, OWNERSHIP, StageLedger } from './memory';
import { calculateTokenBudget } from './token-budgeter';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { writeVirtualFile, readVirtualFile, listVirtualFiles, applyDiff, flushVfsToDisk, safeWriteFileSync } from './vfs';
import { runLinter, runCrossFileImportCheck } from './linter';
import { buildAndPersistStructuralGraph, detectAndPersistArchitectureDrift } from './structural-graph';
import { ProjectContract } from './contracts';
import { extractProjectContract, validateProjectContract, validateArchitectureArtifact } from './spec-contract';

function escapeRegex(val: string): string {
  return val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
import { resolveModule, parseTsConfigOptions } from './module-resolver';
import { validatePackageDependencies } from './dependency-validator';
import { validateGeneratedProject } from './project-validator';
import { validatePrismaUsage } from './prisma-validator';
import { validateApiContracts } from './api-contract-validator';
import { validateFrameworkBoundaries } from './framework-validator';
import { probeGeneratedProjectRoutes } from './runtime-validator';
import { validateSecurityGate } from './security-gate';
import { evaluateQualityGate } from './quality-gate';
import { acquirePipelineLease, releasePipelineLease, renewPipelineLease, assertPipelineLease, startLeaseHeartbeat } from './pipeline-lease';
import { getStageContract, StageName } from './contracts/registry';
import { getCanonicalStageOrder } from './contracts/stage-graph';
import { CONTRACT_VERSIONS } from './contracts/versions';
import { executeContractStage } from './contract-executor';
import { evaluateFinalPipelineGate } from './final-gate';
import crypto from 'crypto';
import { arbitrateSpecificationContradiction } from './spec-arbitrator';
import {
  prepareReconciliationTransaction,
  commitReconciliationTransaction,
  abortReconciliationTransaction,
  detectSpecificationOscillation,
} from './spec-reconciliation-coordinator';
import { verifyAndRepairWorkspace } from './verification-loop';
import { appendPipelineEvent } from './pipeline-events';
import { commitAcceptedArtifact, findReusableAcceptedArtifact, refreshCoderWorkspaceManifest, resolveAcceptedStageInputs } from './artifact-store';
import { validateStageCandidate } from './stage-acceptance';
import { createContentHash } from './contracts/fingerprints';
import { normalizeProjectPath } from './workspace-policy';


// Re-export modularized pipeline subsystems (strangler barrel preserves backward compatibility)
export {
  pipelineEvents,
  activePipelines,
  pipelineAbortControllers,
  abortedBeforeRegistration,
  abortPipelineExecution,
  isAbortError,
  isInfrastructureError,
  handleInfrastructurePause,
  classifyIsSoftwareRequest,
  writeHistoryLog,
  writeRichTelemetryLog,
  orchestratorThinkDebugger,
  evaluateComplexity,
  launchVSCodePreview,
} from "./pipeline-lifecycle";
export type { PipelineEventCallback, ThinkingDecision } from "./pipeline-lifecycle";
import {
  pipelineEvents,
  activePipelines,
  pipelineAbortControllers,
  abortedBeforeRegistration,
  isAbortError,
  isInfrastructureError,
  handleInfrastructurePause,
  classifyIsSoftwareRequest,
  writeHistoryLog,
  writeRichTelemetryLog,
  launchVSCodePreview,
  type PipelineEventCallback,
} from "./pipeline-lifecycle";

export {
  VFS_OUTPUT_MAP,
  EXPECTED_FIRST_HEADERS,
  extractMdSection,
  buildArtifactContext,
  parseSpecsRequired,
  validateArchitectOutput,
  extractSection,
  extractDependencyInterface,
  getTargetLanguagePolicy,
  buildCoderContext,
  composeAgentUserContent,
  shouldPersistAgentOutput,
} from "./coder-context";
export type { TargetLanguagePolicy } from "./coder-context";
import {
  VFS_OUTPUT_MAP,
  EXPECTED_FIRST_HEADERS,
  extractMdSection,
  buildArtifactContext,
  validateArchitectOutput,
  extractDependencyInterface,
  getTargetLanguagePolicy,
  buildCoderContext,
  composeAgentUserContent,
} from "./coder-context";

export {
  parseBlueprintFiles,
  validateBlueprintImports,
  classifyBlueprintDependency,
  validateBlueprintGraph,
  computeCoderExecutionOrder,
  extractFilesFromArchitecture,
  syncHtmlAssetLinks,
} from "./blueprint-graph";
export type { BlueprintFileSection, BlueprintGraphValidation } from "./blueprint-graph";
import { parseBlueprintFiles, extractFilesFromArchitecture } from "./blueprint-graph";

export {
  sanitizeStageOutput,
  sanitizeCoderOutput,
  sanitizeCoderOutputForFile,
  isParserValid,
  extractLiveStreamingCode,
} from "./code-sanitizer";
import {
  sanitizeStageOutput,
  sanitizeCoderOutputForFile,
  extractLiveStreamingCode,
} from "./code-sanitizer";

// ─── Stage Execution Helper (runAgent) ─────────────────────────────────────

export { runAgent } from "./agent-runner";
export type { RunAgentRuntimeOptions } from "./agent-runner";
import { runAgent } from "./agent-runner";

export const localActivePipelines = new Map<string, string>();

export interface StageCandidate {
  stage: string;
  executionId: string;
  attempt: number;
  content: string;
  contentHash: string;
  generatedAt: Date;
}

export async function generateStageCandidate(params: {
  conversationId: string;
  agentName: string;
  userPromptText: string;
  attempt: number;
  customUserContent?: string;
  validationError?: string;
  executionSignal?: AbortSignal;
}): Promise<StageCandidate> {
  const executionId = path.basename(params.conversationId) + '-' + Math.random().toString(36).substring(2, 9);
  const upstreamContext = await buildArtifactContext(params.conversationId, params.agentName);

  const contextStr = params.customUserContent || JSON.stringify(upstreamContext);

  const result = await runInference(
    [
      { role: 'system', content: AGENT_DEFS[params.agentName as keyof typeof AGENT_DEFS]?.systemPrompt || '' },
      { role: 'user', content: `${params.userPromptText}\n\n[CONTEXT]\n${contextStr}` },
    ],
    { signal: params.executionSignal }
  );

  const content = sanitizeStageOutput(result, EXPECTED_FIRST_HEADERS[params.agentName]);
  if (!content.trim()) {
    throw new Error(`${params.agentName} produced an empty candidate`);
  }

  return {
    stage: params.agentName,
    executionId,
    attempt: params.attempt,
    content,
    contentHash: createContentHash(content),
    generatedAt: new Date(),
  };
}

export async function startPipelineIfUnowned(
  conversationId: string,
  userPrompt: string,
  onEvent?: PipelineEventCallback,
  startStage?: string
): Promise<{ started: boolean }> {
  if (activePipelines.has(conversationId) || localActivePipelines.has(conversationId)) {
    return { started: false };
  }

  const lease = await acquirePipelineLease(conversationId);
  if (!lease.acquired) {
    return { started: false };
  }

  runOrchestrator(
    conversationId,
    userPrompt,
    onEvent || (() => {}),
    undefined,
    startStage,
    lease.ownerId
  ).catch(async (error) => {
    await releasePipelineLease(conversationId, lease.ownerId, 'FAILED');
  });

  return { started: true };
}

// ─── Main Pipeline Orchestrator Loop (11 Stages) ───────────────────────────

export async function runOrchestrator(
  conversationId: string,
  userPrompt: string,
  onEvent: PipelineEventCallback,
  signal?: AbortSignal,
  startStage?: string,
  existingLeaseOwnerId?: string
): Promise<void> {
  abortedBeforeRegistration.delete(conversationId);
  if (signal?.aborted) {
    throw new Error('Pipeline compilation aborted due to client disconnect.');
  }

  let leaseOwnerId = existingLeaseOwnerId;
  if (!leaseOwnerId) {
    const lease = await acquirePipelineLease(conversationId);
    if (!lease.acquired) {
      const attachMsg = { type: 'AGENT_LOG', message: 'Reattached to active background compilation loop.' };
      onEvent(attachMsg as any);
      pipelineEvents.emit(`event:${conversationId}`, attachMsg);
      return;
    }
    leaseOwnerId = lease.ownerId;
  }

  if (abortedBeforeRegistration.has(conversationId)) {
    abortedBeforeRegistration.delete(conversationId);
    await releasePipelineLease(conversationId, leaseOwnerId, 'CANCELLED').catch(() => {});
    return;
  }

  localActivePipelines.set(conversationId, leaseOwnerId);
  activePipelines.add(conversationId);

  // Dedicated internal AbortController for background execution (decoupled from browser reload signals)
  const internalController = new AbortController();
  pipelineAbortControllers.set(conversationId, internalController);
  const executionSignal = internalController.signal;

  let finalPipelineState = 'COMPLETED';
  let stopHeartbeat: (() => void) | undefined;

  // Single Event Emission: Emits to global EventEmitter for browser SSE streams & persists to DB
  let lastProgressDbSaveTime = 0;
  const emit = (event: any) => {
    pipelineEvents.emit(`event:${conversationId}`, event);

    // For high-frequency AGENT_STREAM_PROGRESS, throttle SQLite inserts to once every 2 seconds
    if (event.type === 'AGENT_STREAM_PROGRESS') {
      const now = Date.now();
      if (now - lastProgressDbSaveTime < 2000) {
        return;
      }
      lastProgressDbSaveTime = now;
    }

    prisma.pipelineRun.findUnique({ where: { conversationId } }).then((run) => {
      if (run) {
        appendPipelineEvent({
          conversationId,
          pipelineRunId: run.id,
          eventType: event.type || 'AGENT_LOG',
          stageName: event.agent || event.stage,
          payload: event,
        }).catch(() => {});
      }
    }).catch(() => {});
  };

  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    if (conversation.status === 'Cancelled' || executionSignal.aborted) {
      finalPipelineState = 'CANCELLED';
      return;
    }

    const memoryState = await loadExecutiveMemory(conversationId);
    const ledger = new StageLedger(conversationId, memoryState);

    // Classification Gate (skip if resuming from mid-pipeline stage)
    if (!startStage) {
      const classification = await classifyIsSoftwareRequest(userPrompt, executionSignal);
      if (!classification.isSoftware) {
        emit({
          type: 'PIPELINE_ERROR',
          message: classification.reason || 'This request does not appear to be a software development task.',
        });
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { status: 'Paused' },
        });
        return;
      }
    }

    emit({
      type: 'PIPELINE_START',
      message: startStage ? `Resuming AutoCoder Hybrid v2 Pipeline at stage ${startStage}...` : 'Starting AutoCoder Hybrid v2 11-Stage Pipeline...',
    });

    // Start active background Keep-Alive daemon (pings Ollama every 10s to keep sockets & VRAM alive)
    startOllamaKeepAlive();

    stopHeartbeat = startLeaseHeartbeat(conversationId, leaseOwnerId, () => {
      internalController.abort();
    });

    // ─── 11 STAGES DEFINITION (Derived from Canonical Stage Graph) ───────────

    const STAGES: StageName[] = getCanonicalStageOrder() as StageName[];

    const startIndex = startStage ? STAGES.indexOf(startStage as StageName) : 0;
    const executionStages = startIndex >= 0 ? STAGES.slice(startIndex) : STAGES;

    const pipelineRun = await prisma.pipelineRun.findUnique({ where: { conversationId } });
    const runId = pipelineRun?.id || '';

    let debuggerExecutedInRun = false;

    for (const stageName of executionStages) {
      if (executionSignal.aborted) throw new Error('Pipeline compilation aborted by user.');

      // Update currentStage in database so state and UI remain 100% in sync
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { currentStage: stageName },
      }).catch(() => {});

      if (runId) {
        await prisma.pipelineRun.update({
          where: { id: runId },
          data: { currentStage: stageName },
        }).catch(() => {});
      }

      // Assert lease before stage execution
      await assertPipelineLease(conversationId, leaseOwnerId);

      // Fast-Forward Guard: Check if an ACCEPTED, lineage-bound, fresh artifact exists for this run
      const versionInfo = CONTRACT_VERSIONS[stageName];
      let reusableArtifact = null;

      try {
        const resolvedInputs = await resolveAcceptedStageInputs({
          conversationId,
          pipelineRunId: runId,
          stageName,
        });

        reusableArtifact = await findReusableAcceptedArtifact({
          conversationId,
          stageName,
          pipelineRunId: runId,
          expectedDependencyFingerprint: resolvedInputs.dependencyFingerprint,
          expectedContractVersion: versionInfo.version,
          expectedPromptVersion: versionInfo.promptVersion,
          expectedValidatorVersion: versionInfo.validatorVersion,
        });

      } catch {
        // Inputs not ready or missing, cannot fast-forward
      }

      if (reusableArtifact && startStage && stageName !== startStage) {
        emit({
          type: 'AGENT_COMPLETE',
          agent: stageName,
          message: `Stage ${stageName} artifact is fresh and valid. Fast-forwarding to next stage...`,
          data: reusableArtifact.content,
        });
        continue;
      }

      emit({
        type: 'STAGE_START',
        agent: stageName,
        message: `Entering Stage: ${stageName}...`,
      });

      if (stageName === 'Tester') {
        await verifyAndRepairWorkspace(
          conversationId,
          runId,
          async (targetStage: string, customInput?: string, targetFile?: string) => {
            if (targetStage === 'Debugger') {
              debuggerExecutedInRun = true;
            }
            const res = await executeContractStage({
              conversationId,
              pipelineRunId: runId,
              stageName: targetStage as StageName,
              userPromptText: userPrompt,
              onEvent: emit,
              ledger,
              leaseOwnerId,
              signal: executionSignal,
              customUserContent: customInput,
              targetFile,
            });
            if (targetStage === 'Debugger') {
              await refreshCoderWorkspaceManifest(conversationId, runId, res.stageExecution.id);
            }
            return res;
          },
          emit,
          { requirePersistedVerification: true }
        );

        await flushVfsToDisk(conversationId);
        continue;
      }

      if (stageName === 'Debugger') {
        if (debuggerExecutedInRun) {
          emit({
            type: 'AGENT_COMPLETE',
            agent: 'Debugger',
            message: 'Stage Debugger completed during repair cycle.',
          });
        } else {
          emit({
            type: 'AGENT_COMPLETE',
            agent: 'Debugger',
            message: 'Stage Debugger skipped (Tester passed without repair).',
          });
        }
        await flushVfsToDisk(conversationId);
        continue;
      }


      // Execute canonical contract stage via executeContractStage
      const contractResult = await executeContractStage({
        conversationId,
        pipelineRunId: runId,
        stageName,
        attempt: 1,
        userPromptText: userPrompt,
        onEvent: emit,
        ledger,
        leaseOwnerId,
        signal: executionSignal,
      });

      emit({
        type: 'AGENT_COMPLETE',
        agent: stageName,
        message: `Stage ${stageName} completed successfully.`,
        data: contractResult.content,
      });

      // Auto-flush VFS to physical disk after each stage completes
      await flushVfsToDisk(conversationId);

      // Specification Contradiction Reconciliation Gate after System stage
      if (stageName === 'System') {
        let specReconciliationCycle = 0;
        const MAX_SPEC_RECONCILIATION_CYCLES = 2;
        const reconciliationHistory: Array<{ targetStage: string; selectedApproach: string; fingerprint: string }> = [];

        while (specReconciliationCycle <= MAX_SPEC_RECONCILIATION_CYCLES) {
          const planMd = (await readVirtualFile(conversationId, 'plan.md')) || '';
          const reqsMd = (await readVirtualFile(conversationId, 'requirements.md')) || '';
          const archMd = (await readVirtualFile(conversationId, 'architecture.md')) || '';
          const backendMd = (await readVirtualFile(conversationId, 'backend_spec.md')) || '';

          const currentSpecs = {
            'plan.md': planMd,
            'requirements.md': reqsMd,
            'architecture.md': archMd,
            'backend_spec.md': backendMd,
          };

          const extractedContract = extractProjectContract(currentSpecs);
          const contractValidation = validateProjectContract(extractedContract);

          if (contractValidation.valid) {
            if (specReconciliationCycle > 0) {
              emit({
                type: 'SPECIFICATION_RECONCILED',
                agent: 'System',
                message: `Specification contradiction successfully resolved on cycle ${specReconciliationCycle}.`,
              });
            }
            break; // Contract is verified and consistent; proceed to Designer/Blueprinter/Coder
          }

          // Validation Failed: Increment Cycle and Check Budget
          specReconciliationCycle++;
          if (specReconciliationCycle > MAX_SPEC_RECONCILIATION_CYCLES) {
            const fatalErr = `Specification Contradiction Gate Failed after ${MAX_SPEC_RECONCILIATION_CYCLES} reconciliation cycles: ${contractValidation.errors.join('; ')}`;
            emit({ type: 'PIPELINE_ERROR', message: fatalErr });
            throw new Error(fatalErr);
          }

          const fingerprint = crypto
            .createHash('sha256')
            .update(contractValidation.errors.sort().join('::'))
            .digest('hex');

          emit({
            type: 'SPECIFICATION_CONTRADICTION_DETECTED',
            agent: 'System',
            message: `Specification contradiction caught (Cycle ${specReconciliationCycle}/${MAX_SPEC_RECONCILIATION_CYCLES}). Initiating collective arbitration...`,
            data: { errors: contractValidation.errors },
          });

          // Step 1: Arbitrate Strategy via Ollama within Deterministic Boundaries
          const decision = await arbitrateSpecificationContradiction({
            userPromptText: userPrompt,
            specs: currentSpecs,
            contract: extractedContract,
            validationErrors: contractValidation.errors,
            signal: executionSignal,
          });

          // Step 2: Anti-Oscillation Fail-Closed Guard
          if (detectSpecificationOscillation(reconciliationHistory, { ...decision, fingerprint })) {
            const oscErr = `Specification Reconciliation Aborted: Oscillation detected on cycle ${specReconciliationCycle}. System halted to prevent infinite loop.`;
            emit({ type: 'PIPELINE_ERROR', message: oscErr });
            throw new Error(oscErr);
          }
          reconciliationHistory.push({ ...decision, fingerprint });

          // Step 3: Phase 1 (Prepare) — Snapshot VFS & Lock Transaction
          const tx = await prepareReconciliationTransaction({
            conversationId,
            pipelineRunId: runId,
            cycleNumber: specReconciliationCycle,
            leaseOwnerId,
            targetStage: decision.targetStage as StageName,
            selectedApproach: decision.selectedApproach,
            directive: decision.reconciliationDirective,
            fingerprint,
            validationErrors: contractValidation.errors,
          });

          // Step 4: Re-execute Target Stage (Orchestrator Drives Execution!)
          emit({
            type: 'SPECIFICATION_RECONCILING',
            agent: decision.targetStage,
            message: `Re-executing ${decision.targetStage} with reconciliation directive: ${decision.selectedApproach}`,
            data: { directive: decision.reconciliationDirective },
          });

          try {
            await executeContractStage({
              conversationId,
              pipelineRunId: runId,
              stageName: decision.targetStage as StageName,
              userPromptText: userPrompt,
              onEvent: emit,
              ledger,
              leaseOwnerId,
              signal: executionSignal,
              customUserContent: decision.reconciliationDirective,
            });

            // If Architect was regenerated, System must also regenerate to consume new architecture
            if (decision.targetStage === 'Architect') {
              emit({
                type: 'SPECIFICATION_RECONCILING',
                agent: 'System',
                message: 'Cascading regeneration: Re-executing System to align with updated architecture.md',
              });
              await executeContractStage({
                conversationId,
                pipelineRunId: runId,
                stageName: 'System',
                userPromptText: userPrompt,
                onEvent: emit,
                ledger,
                leaseOwnerId,
                signal: executionSignal,
              });
            }

            // Step 5: Verify Contract Consistency Post-Regeneration
            const postPlan = (await readVirtualFile(conversationId, 'plan.md')) || '';
            const postReqs = (await readVirtualFile(conversationId, 'requirements.md')) || '';
            const postArch = (await readVirtualFile(conversationId, 'architecture.md')) || '';
            const postBackend = (await readVirtualFile(conversationId, 'backend_spec.md')) || '';

            const postContract = extractProjectContract({
              'plan.md': postPlan,
              'requirements.md': postReqs,
              'architecture.md': postArch,
              'backend_spec.md': postBackend,
            });

            const postValidation = validateProjectContract(postContract);

            if (postValidation.valid) {
              // Phase 2 (Commit): Atomically publish accepted versions
              await commitReconciliationTransaction(tx);
              emit({
                type: 'SPECIFICATION_RECONCILED',
                agent: 'System',
                message: `Specification contradiction successfully reconciled on cycle ${specReconciliationCycle}.`,
              });
              break; // Proceed to Designer
            } else {
              // Validation rejected: Rollback VFS to snapshot
              await abortReconciliationTransaction(tx, postValidation.errors.join('; '));
              if (specReconciliationCycle >= MAX_SPEC_RECONCILIATION_CYCLES) {
                const fatalErr = `Specification Contradiction Gate Failed after ${MAX_SPEC_RECONCILIATION_CYCLES} reconciliation cycles: ${postValidation.errors.join('; ')}`;
                emit({ type: 'PIPELINE_ERROR', message: fatalErr });
                throw new Error(fatalErr);
              }
            }
          } catch (err: any) {
            // Execution exception: Rollback VFS to snapshot
            await abortReconciliationTransaction(tx, err.message);
            throw err;
          }
        }
      }

      // Architect Quality Gate Pause
      if (stageName === 'Architect' && !conversation.qualityGateOverride) {
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { status: 'Paused', currentStage: 'Architect' },
        });

        emit({
          type: 'QUALITY_GATE_PAUSE',
          agent: 'Architect',
          message: '📐 Architect stage completed. Paused for user approval before continuing to System, Designer, Blueprinter, and Coder stages.',
          data: contractResult.content,
        });

        if (stopHeartbeat) stopHeartbeat();
        return; // Exit orchestrator loop, waiting for user resume signal
      }
    }

    // Flush all VFS files to disk workspace before final gate & deterministic verification
    await flushVfsToDisk(conversationId);

    // Assert pipeline lease before final gate evaluation
    await assertPipelineLease(conversationId, leaseOwnerId);

    // Run deterministic Security Gate & persist GateDecision (F-06, F-14)
    const vfsRecordsForGate = await prisma.virtualFile.findMany({ where: { conversationId } });
    const vfsMapForGate: Record<string, string> = {};
    for (const vf of vfsRecordsForGate) {
      vfsMapForGate[vf.filePath] = vf.content;
    }
    const securityGateRes = validateSecurityGate(vfsMapForGate);
    if (runId) {
      await prisma.gateDecision.create({
        data: {
          conversationId,
          pipelineRunId: runId,
          stageName: 'Security',
          gateName: 'SECURITY_GATE',
          decision: securityGateRes.passed ? 'PASSED' : 'BLOCKED',
          actor: 'SYSTEM',
          reason: securityGateRes.passed
            ? 'DETERMINISTIC_SCAN_CLEAN'
            : `SECURITY_HARD_BLOCK: ${securityGateRes.blocking.map((b) => b.message).join('; ')}`,
        },
      });
    }

    // Evaluate final gate before launching preview or marking Completed
    const finalGate = await evaluateFinalPipelineGate(conversationId, runId, leaseOwnerId);
    if (!finalGate.valid) {
      if (runId) {
        await prisma.gateDecision.create({
          data: {
            conversationId,
            pipelineRunId: runId,
            stageName: 'Reviewer',
            gateName: 'QUALITY_GATE',
            decision: 'BLOCKED',
            actor: 'SYSTEM',
            reason: finalGate.errors.join('; '),
          },
        });
      }
      const gateErr = `Final Pipeline Gate Validation Failed: ${finalGate.errors.join('; ')}`;
      emit({
        type: 'PIPELINE_ERROR',
        message: gateErr,
      });
      throw new Error(gateErr);
    }

    if (runId) {
      await prisma.gateDecision.create({
        data: {
          conversationId,
          pipelineRunId: runId,
          stageName: 'Reviewer',
          gateName: 'QUALITY_GATE',
          decision: 'PASSED',
          actor: 'SYSTEM',
          reason: 'FINAL_GATE_PASSED',
        },
      });
    }

    // Launch preview ONLY after Final Gate and deterministic Security/Quality Gates pass (F-08)
    await launchVSCodePreview(conversationId, emit);

    const PIPELINE_COMPLETED_STATUS = 'Completed';
    await prisma.$transaction([
      prisma.conversation.update({
        where: { id: conversationId },
        data: { status: PIPELINE_COMPLETED_STATUS },
      }),
      prisma.pipelineRun.update({
        where: { conversationId },
        data: { state: 'COMPLETED' },
      }),
    ]);

    emit({
      type: 'PIPELINE_COMPLETE',
      message: '🎉 AutoCoder Hybrid v2 Pipeline executed successfully!',
    });

  } catch (err: any) {
    if (isAbortError(err, executionSignal)) {
      finalPipelineState = 'CANCELLED';
      emit({
        type: 'PIPELINE_CANCELLED',
        message: 'Pipeline execution was cancelled.',
      });
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { status: 'Cancelled' },
      }).catch(() => {});
      await prisma.pipelineRun.updateMany({
        where: { conversationId },
        data: { state: 'CANCELLED', leaseOwner: null, leaseExpiresAt: null },
      }).catch(() => {});
      return;
    }

    console.error(`Pipeline error in conversation ${conversationId}:`, err);
    await flushVfsToDisk(conversationId).catch(() => {});

    await writeHistoryLog(
      conversationId,
      'Pipeline',
      'Failed',
      `Pipeline Execution Failed: ${err.message}`
    ).catch(() => {});

    if (isInfrastructureError(err)) {
      await handleInfrastructurePause(conversationId, emit, err.message);
      return;
    }

    if (typeof err?.message === 'string' && err.message.includes('ARCHITECTURE_REVISION_REQUIRED')) {
      finalPipelineState = 'PAUSED';
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { status: 'Paused', currentStage: 'Architect' },
      }).catch(() => {});
      emit({
        type: 'ARCHITECTURE_REVISION_REQUIRED',
        agent: 'Blueprinter',
        message: `📐 Pipeline paused: Blueprint requires a file absent from the approved architecture (${err.message}). Please review and approve an architecture revision rather than silently modifying approved architecture.md.`,
      });
      return;
    }
    emit({
      type: 'PIPELINE_ERROR',
      message: `Pipeline Execution Failed: ${err.message}`,
    });
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { status: 'Failed' },
    }).catch(() => {});
    finalPipelineState = 'FAILED';
  } finally {
    if (stopHeartbeat) stopHeartbeat();
    stopOllamaKeepAlive();
    pipelineAbortControllers.delete(conversationId);
    await flushVfsToDisk(conversationId).catch(() => {});
    localActivePipelines.delete(conversationId);
    activePipelines.delete(conversationId);
    if (leaseOwnerId) {
      await releasePipelineLease(conversationId, leaseOwnerId, finalPipelineState).catch(() => {});
    }
  }
}
