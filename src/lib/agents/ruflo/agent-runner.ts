import crypto from "crypto";
import { prisma } from "../../db";
import {
  runInference,
  getLLMConfig,
  InferenceOptions,
  InferenceTurnResult,
  Message,
} from "../inference";
import { getToolsForAgent } from "./toolbox";
import { executeToolLoop, ToolCallLogEntry } from "./tool-loop";
import { writeAgentOutput } from "../sml";
import { AGENT_DEFS } from "./agents";
import { StageLedger, writeExecutiveMemoryRecord, OWNERSHIP } from "./memory";
import { calculateTokenBudget } from "./token-budgeter";
import { writeVirtualFile, readVirtualFile } from "./vfs";
import { getStageContract } from "./contracts/registry";
import { normalizeProjectPath } from "./workspace-policy";
import {
  pipelineEvents,
  writeHistoryLog,
  writeRichTelemetryLog,
  type PipelineEventCallback,
} from "./pipeline-lifecycle";
import {
  VFS_OUTPUT_MAP,
  EXPECTED_FIRST_HEADERS,
  extractMdSection,
  buildArtifactContext,
  extractDependencyInterface,
  getTargetLanguagePolicy,
  buildCoderContext,
  composeAgentUserContent,
} from "./coder-context";
import { parseBlueprintFiles } from "./blueprint-graph";
import {
  sanitizeStageOutput,
  sanitizeCoderOutputForFile,
  extractLiveStreamingCode,
} from "./code-sanitizer";

export interface RunAgentRuntimeOptions {
  pipelineRunId?: string;
  stageExecutionId?: string;
  isSetupOperation?: boolean;
  allowedMutationPaths?: string[];
  maxToolIterations?: number;
  enableTools?: boolean;
  inferenceTurnFn?: (messages: Message[], options?: InferenceOptions) => Promise<InferenceTurnResult>;
  fileIndex?: number;
  totalFiles?: number;
  allFiles?: string[];
}

export async function runAgent(
  conversationId: string,
  agentName: string,
  userPromptText: string,
  rawOnEvent: PipelineEventCallback,
  ledger: StageLedger,
  attempt: number = 1,
  customUserContent?: string,
  signal?: AbortSignal,
  validationError?: string,
  targetFile?: string,
  persistOutput: boolean = true,
  runtimeOptions?: RunAgentRuntimeOptions
): Promise<any> {
  const agentDef = AGENT_DEFS[agentName];
  if (!agentDef) {
    throw new Error(`Unknown agent: ${agentName}`);
  }

  const canonicalTargetFile = targetFile || VFS_OUTPUT_MAP[agentName] || undefined;

  const onEvent: PipelineEventCallback = (event) => rawOnEvent(event);
  onEvent({
    type: 'AGENT_START',
    agent: agentName,
    message: canonicalTargetFile
      ? `Agent ${agentName} started targeting "${canonicalTargetFile}"${runtimeOptions?.fileIndex && runtimeOptions?.totalFiles ? ` (${runtimeOptions.fileIndex} of ${runtimeOptions.totalFiles})` : ''} (Attempt ${attempt}/3)...`
      : `Agent ${agentName} started (Attempt ${attempt}/3)...`,
    data: {
      targetFile: canonicalTargetFile,
      fileIndex: runtimeOptions?.fileIndex,
      totalFiles: runtimeOptions?.totalFiles,
      allFiles: runtimeOptions?.allFiles,
    },
  });

  const startTime = Date.now();
  const config = await getLLMConfig();
  const upstreamContext = await buildArtifactContext(conversationId, agentName);

  const permittedTools =
    agentDef.tools.length > 0 &&
    Boolean(runtimeOptions?.pipelineRunId) &&
    runtimeOptions?.enableTools !== false &&
    process.env.MOCK_INFERENCE !== 'true'
      ? getToolsForAgent(agentDef.tools)
      : [];

  const constraintsBlock = `\n\nActive System Constraints:
- Output MUST be valid structured markdown matching the exact header specifications.
- Do NOT wrap your entire response in markdown code blocks (\`\`\`markdown). Return raw text directly.`;

  let systemInstructions =
    agentName === 'Coder'
      ? agentDef.systemPrompt
      : agentDef.systemPrompt + constraintsBlock;

  if (permittedTools.length > 0) {
    if (agentName === 'Coder' && targetFile) {
      systemInstructions += `\n\n=== WORKSPACE TOOLS ENABLED (SCOPED TO ${targetFile}) ===
You have interactive workspace tools to verify dependencies and check syntax before finishing:
- list_files(): list existing workspace files.
- read_file({ file_path }): inspect exact exports, types, or DOM IDs in dependency files (returns contentHash required for apply_diff).
- write_file({ file_path, content }): write the complete file content to "${targetFile}".
- apply_diff({ file_path, start_line, end_line, new_content, expected_content_hash }): surgically patch "${targetFile}" after reading it.
- check_syntax({ file_path }): run TypeScript/JavaScript compiler syntax & type diagnostics on "${targetFile}".
- typecheck(): run workspace-wide tsc --noEmit if tsconfig.json exists.
Mutation scope is strictly restricted to "${targetFile}". If you write or patch "${targetFile}" using tools, always call check_syntax on "${targetFile}" and fix any reported errors before finishing, then return a brief summary or final code. If you do not call write_file or apply_diff, output ONLY the raw complete source code for "${targetFile}".`;
    } else if (agentName === 'Debugger') {
      systemInstructions += `\n\n=== WORKSPACE TOOLS DIAGNOSTIC & REPAIR GUIDANCE ===
You have access to authorized workspace tools (${permittedTools.map((t) => t.name).join(', ')}).
- Use read_file({ file_path }) before apply_diff to inspect exact lines and obtain expected_content_hash (= contentHash).
- Use check_syntax, typecheck, or build_project to verify fixes against the actual workspace.
- Only describe modifications in ### Patches Applied and verification results in ### Verification that reflect real edits and actual checks.`;
    }
  }

  let userContent: string;
  if (agentName === 'Coder' && targetFile) {
    const blueprintText = await readVirtualFile(conversationId, 'blueprint.md');
    let targetSection = '';
    let dependencyInterfaces = '';

    if (blueprintText) {
      const parsedSections = parseBlueprintFiles(blueprintText);
      const normalizedTarget = normalizeProjectPath(targetFile).toLowerCase();
      const match = parsedSections.find(
        (s) => normalizeProjectPath(s.file).toLowerCase() === normalizedTarget
      );
      if (match) {
        targetSection = match.rawSection;
        for (const dep of match.dependencies) {
          const depContent = await readVirtualFile(conversationId, dep);
          if (depContent) {
            const iface = extractDependencyInterface(dep, depContent);
            dependencyInterfaces += `${dep}:\n${iface}\n`;
          }
        }
      }
    }

    if (!targetSection) {
      const archText = await readVirtualFile(conversationId, 'architecture.md');
      const techStackSummary = archText ? extractMdSection(archText, 'Tech Stack') : '';
      targetSection = `### File: ${targetFile}\n- **Purpose**: Configuration and build manifest for ${targetFile}\n- **Dependencies**: Grounded from Architecture Tech Stack: ${techStackSummary.replace(/\n+/g, ' ').trim() || 'Required project dependencies'}\n- **Exports**: None`;
    }

    let coderContext = await buildCoderContext(conversationId, targetSection, dependencyInterfaces);

    const existingFileInVfs = await readVirtualFile(conversationId, targetFile);
    let partialInflowBlock = '';
    if (existingFileInVfs && existingFileInVfs.trim().length > 50) {
      const existingClean = sanitizeCoderOutputForFile(existingFileInVfs, targetFile);
      const isComplete = existingClean.trim().length > 0;
      if (!isComplete) {
        partialInflowBlock = `\n\n=== EXISTING PARTIAL / REPAIR IMPLEMENTATION FOR "${targetFile}" ===\n` +
          `A partial implementation (${existingFileInVfs.length} bytes) was generated prior to interruption:\n` +
          `\`\`\`\n${existingFileInVfs.slice(0, 8000)}\n\`\`\`\n` +
          `CRITICAL INSTRUCTION: Inspect this existing partial code. Fix any syntax errors (e.g. unclosed functions or braces), complete any missing sections, and output or write the COMPLETE, VALID file. Do NOT start from scratch unless the partial logic is completely invalid.`;
      }
    }

    const inflowDesc = partialInflowBlock
      ? `Blueprint + dependencies + Inflow Partial Attempt (${existingFileInVfs?.length} bytes)`
      : `Blueprint section + tech stack dependencies (${coderContext.length.toLocaleString()} chars)`;

    onEvent({
      type: 'AGENT_LOG',
      agent: 'Coder',
      message: `📥 Inflow Context for ${targetFile}: ${inflowDesc}`,
    });
    const retryPrefix =
      attempt > 1
        ? `[RETRY ${attempt}/3] Your previous implementation of ${targetFile} had errors:\n${
            validationError || 'Fix all syntax, import, and logic errors.'
          }\nPlease fix these issues and output the complete, corrected code.\n\n`
        : '';

    const langPolicy = getTargetLanguagePolicy(targetFile);
    const langPolicyBlock = `### Target Language Policy (${langPolicy.language.toUpperCase()})\n` +
      langPolicy.rules.map(r => `- ${r}`).join('\n');

    userContent = `${retryPrefix}TARGET FILE TO IMPLEMENT: ${targetFile}\nOutput ONLY the complete raw source code for "${targetFile}". Do NOT output markdown code fences or headers.\n\n${langPolicyBlock}\n\n${coderContext}${partialInflowBlock}${
      customUserContent ? `\n\n${customUserContent}` : ''
    }`;
  } else {
    userContent = composeAgentUserContent({
      upstreamContext,
      customUserContent,
      userPromptText,
      attempt,
      validationError,
    });
  }

  let requiredArtifactNames: string[] = [];
  try {
    const contract = getStageContract(agentName);
    requiredArtifactNames = contract.inputArtifacts.map((i) => i.name);
  } catch (e) {
    requiredArtifactNames = [];
  }

  const contextTelemetry = {
    requiredArtifacts: requiredArtifactNames,
    upstreamContextIncluded: upstreamContext.trim().length > 0,
    customContextIncluded: !!customUserContent?.trim(),
    originalRequestIncluded: userContent.includes('Original Request:'),
    requiredArtifactsPresent: requiredArtifactNames.map((artifact) => ({
      artifact,
      included: userContent.includes(`=== ARTIFACT: ${artifact} ===`),
    })),
  };

  if (agentName === 'Architect') {
    const missingRequiredContext = contextTelemetry.requiredArtifactsPresent
      .filter((item) => !item.included)
      .map((item) => item.artifact);

    if (missingRequiredContext.length > 0) {
      throw new Error(
        `Architect context invariant violated. Required artifacts were not included in the inference input: ${missingRequiredContext.join(', ')}`
      );
    }
  }

  const { budget, timeoutMs } = calculateTokenBudget(agentName, ledger);

  await writeHistoryLog(
    conversationId,
    agentName,
    'Started',
    canonicalTargetFile
      ? `Agent ${agentName} started targeting "${canonicalTargetFile}"${runtimeOptions?.fileIndex && runtimeOptions?.totalFiles ? ` (${runtimeOptions.fileIndex} of ${runtimeOptions.totalFiles})` : ''} (Attempt ${attempt}/3)... Estimated tokens: ${budget}`
      : `Agent ${agentName} started (Attempt ${attempt}/3)... Estimated tokens: ${budget}`
  );

  if (canonicalTargetFile && (persistOutput || agentName === 'Coder')) {
    const runId =
      runtimeOptions?.pipelineRunId ||
      (await prisma.pipelineRun.findUnique({ where: { conversationId } }))?.id ||
      'system-run';
    const existing = await readVirtualFile(conversationId, canonicalTargetFile).catch(() => null);
    if (!existing || existing.trim().length === 0) {
      await writeVirtualFile(
        conversationId,
        canonicalTargetFile,
        `<!-- Stage: ${agentName} (${canonicalTargetFile}) in progress... -->\n`,
        {
          pipelineRunId: runId,
          allowControlPlane: true,
        }
      ).catch(() => {});
    }
  }

  const resolvedInflowArtifacts = requiredArtifactNames.map((art) => ({
    name: art,
    included: userContent.includes(`=== ARTIFACT: ${art} ===`),
  }));

  const inflowItemsList = [
    ...(resolvedInflowArtifacts.filter((a) => a.included).map((a) => a.name)),
    ...(userContent.includes('Original Request:') || !upstreamContext.trim() ? ['User Prompt'] : []),
    ...(customUserContent ? ['Directives/Repair Feedback'] : []),
  ];

  const inflowDesc = inflowItemsList.length > 0
    ? `[${inflowItemsList.join(', ')}] (${(upstreamContext.length + userPromptText.length).toLocaleString()} chars)`
    : upstreamContext.trim().length > 0
    ? `Upstream specifications (${upstreamContext.length.toLocaleString()} chars)`
    : userPromptText
    ? `User Prompt (${userPromptText.length.toLocaleString()} chars)`
    : 'System Directives';

  const evtReadingInflow = {
    type: 'AGENT_INFLOW_READING',
    agent: agentName,
    message: canonicalTargetFile && runtimeOptions?.fileIndex && runtimeOptions?.totalFiles
      ? `📥 Reading Inflow Context for "${canonicalTargetFile}" (${runtimeOptions.fileIndex}/${runtimeOptions.totalFiles}): ${inflowDesc}`
      : canonicalTargetFile
      ? `📥 Reading Inflow Context for "${canonicalTargetFile}": ${inflowDesc}`
      : `📥 Reading Inflow Context: ${inflowDesc}`,
    data: {
      inflow: inflowDesc,
      inflowArtifacts: inflowItemsList,
      targetFile: canonicalTargetFile,
      fileIndex: runtimeOptions?.fileIndex,
      totalFiles: runtimeOptions?.totalFiles,
      allFiles: runtimeOptions?.allFiles,
      model: config.ollamaModel,
    },
  };
  onEvent(evtReadingInflow);
  pipelineEvents.emit(`event:${conversationId}`, evtReadingInflow);

  onEvent({
    type: 'AGENT_LOG',
    agent: agentName,
    message: `Running inference on model ${config.ollamaModel} (Budget: ${budget} tokens, Timeout: ${Math.round(timeoutMs / 1000)}s)...`,
  });

  let tokenCount = 0;
  let chunkBuffer = '';
  let fullAccumulatedText = '';
  let lastEmittedTime = Date.now();
  let lastVfsFlushTime = 0;
  let hasEmittedOutflowStart = false;

  const onChunkHandler = (chunk: string) => {
    tokenCount += Math.max(1, Math.round(chunk.length / 4));
    chunkBuffer += chunk;
    fullAccumulatedText += chunk;
    if (chunkBuffer.length > 4000) {
      chunkBuffer = chunkBuffer.slice(-4000); // rolling 4000-char window of live generated code/markdown
    }

    if (!hasEmittedOutflowStart) {
      hasEmittedOutflowStart = true;
      const evtOutflow = {
        type: 'AGENT_OUTFLOW_STARTING',
        agent: agentName,
        message: canonicalTargetFile && runtimeOptions?.fileIndex && runtimeOptions?.totalFiles
          ? `📤 Synthesizing Outflow into "${canonicalTargetFile}" (${runtimeOptions.fileIndex}/${runtimeOptions.totalFiles})...`
          : `📤 Synthesizing Outflow into ${canonicalTargetFile || agentName}...`,
        data: {
          targetFile: canonicalTargetFile,
          fileIndex: runtimeOptions?.fileIndex,
          totalFiles: runtimeOptions?.totalFiles,
          allFiles: runtimeOptions?.allFiles,
        },
      };
      onEvent(evtOutflow);
      pipelineEvents.emit(`event:${conversationId}`, evtOutflow);
    }

    const liveCode = extractLiveStreamingCode(fullAccumulatedText);

    const now = Date.now();
    if (canonicalTargetFile && (persistOutput || agentName === 'Coder') && now - lastVfsFlushTime > 2500) {
      lastVfsFlushTime = now;
      const runId =
        runtimeOptions?.pipelineRunId ||
        'system-run';
      const flushContent = liveCode.trim().length > 0 ? liveCode : '';
      if (flushContent) {
        writeVirtualFile(conversationId, canonicalTargetFile, flushContent, {
          pipelineRunId: runId,
          allowControlPlane: true,
        }).catch(() => {});
      }
    }

    if (now - lastEmittedTime > 80) {
      lastEmittedTime = now;

      const speculativeApis = Array.from(chunkBuffer.matchAll(/(GET|POST|PUT|DELETE|PATCH)\s+(\/[a-zA-Z0-9_\-\/]+)/gi))
        .map(m => ({ method: m[1].toUpperCase(), route: m[2] }));
      const speculativeEntities = Array.from(chunkBuffer.matchAll(/(?:model|entity|table|struct)\s+([A-Z][a-zA-Z0-9]+)/gi))
        .map(m => m[1]);
      const speculativeFiles = Array.from(chunkBuffer.matchAll(/(?:File:|Path:|`)([a-zA-Z0-9_\-\/]+\.(?:html|css|js|ts|jsx|tsx|json|md))/gi))
        .map(m => m[1]);

      const evt = {
        type: 'AGENT_STREAM_PROGRESS',
        agent: agentName,
        message: canonicalTargetFile && runtimeOptions?.fileIndex && runtimeOptions?.totalFiles
          ? `Streaming agent output for "${canonicalTargetFile}" (${runtimeOptions.fileIndex}/${runtimeOptions.totalFiles})...`
          : `Streaming agent output for ${canonicalTargetFile || agentName}...`,
        data: {
          tokenCount,
          maxTokens: budget,
          latestText: chunkBuffer,
          fullText: fullAccumulatedText,
          liveCode,
          targetFile: canonicalTargetFile,
          fileIndex: runtimeOptions?.fileIndex,
          totalFiles: runtimeOptions?.totalFiles,
          allFiles: runtimeOptions?.allFiles,
          apis: speculativeApis.slice(-5),
          entities: Array.from(new Set(speculativeEntities)).slice(-6),
          files: Array.from(new Set(speculativeFiles)).slice(-8),
        },
      };
      onEvent(evt);
    }
  };

  let rawResponse = '';
  let toolExecutions: ToolCallLogEntry[] = [];
  let mutatedFiles: string[] = [];
  let toolIterations = 1;

  if (permittedTools.length > 0) {
    onEvent({
      type: 'AGENT_LOG',
      agent: agentName,
      message: `🧰 Tool runtime enabled for ${agentName} (${permittedTools.map((t) => t.name).join(', ')})`,
    });

    const loopResult = await executeToolLoop({
      messages: [
        { role: 'system', content: systemInstructions },
        { role: 'user', content: userContent },
      ],
      tools: permittedTools,
      toolContext: {
        conversationId,
        pipelineRunId: runtimeOptions?.pipelineRunId || '',
        stageExecutionId: runtimeOptions?.stageExecutionId,
        stageName: agentName,
        isSetupOperation: runtimeOptions?.isSetupOperation,
        allowedMutationPaths: runtimeOptions?.allowedMutationPaths,
      },
      inferenceOptions: {
        model: agentDef.model,
        temperature: agentDef.temperature,
        maxTokens: budget,
        timeoutMs,
        signal,
        onChunk: onChunkHandler,
      },
      maxIterations: runtimeOptions?.maxToolIterations ?? (agentName === 'Debugger' ? 10 : 8),
      onEvent,
      ...(runtimeOptions?.inferenceTurnFn ? { inferenceTurnFn: runtimeOptions.inferenceTurnFn } : {}),
    });

    rawResponse = loopResult.content;
    toolExecutions = loopResult.toolExecutions;
    mutatedFiles = loopResult.mutatedFiles;
    toolIterations = loopResult.iterations;
  } else {
    rawResponse = await runInference(
      [
        { role: 'system', content: systemInstructions },
        { role: 'user', content: userContent },
      ],
      {
        model: agentDef.model,
        temperature: agentDef.temperature,
        maxTokens: budget,
        timeoutMs,
        signal,
        onChunk: onChunkHandler,
      }
    );
  }

  const normTargetFile = targetFile ? normalizeProjectPath(targetFile) : '';
  let mutatedTargetViaTool = false;

  let finalContent: string;
  if (agentName === 'Coder') {
    if (
      normTargetFile &&
      mutatedFiles.some((mf) => mf.toLowerCase() === normTargetFile.toLowerCase())
    ) {
      const persistedVfsContent = await readVirtualFile(conversationId, normTargetFile);
      if (persistedVfsContent && persistedVfsContent.trim().length > 0) {
        finalContent = persistedVfsContent;
        mutatedTargetViaTool = true;
      } else {
        finalContent = sanitizeCoderOutputForFile(rawResponse, targetFile);
      }
    } else {
      finalContent = sanitizeCoderOutputForFile(rawResponse, targetFile);
    }
  } else {
    finalContent = sanitizeStageOutput(rawResponse, EXPECTED_FIRST_HEADERS[agentName]);
  }

  // If agent specifies an output filename in VFS_OUTPUT_MAP, write to VFS
  const outputFilename = VFS_OUTPUT_MAP[agentName];
  if (outputFilename && persistOutput) {
    const runId =
      runtimeOptions?.pipelineRunId ||
      (await prisma.pipelineRun.findUnique({ where: { conversationId } }))?.id ||
      'system-run';
    await writeVirtualFile(conversationId, outputFilename, finalContent, {
      pipelineRunId: runId,
      allowControlPlane: true,
    });
  }

  const durationMs = Date.now() - startTime;
  const estimatedTokens = Math.round((systemInstructions.length + userContent.length + finalContent.length) / 4);

  const STAGE_TELEMETRY_STATUS = 'Completed';
  await writeRichTelemetryLog({
    conversationId,
    agentName,
    status: STAGE_TELEMETRY_STATUS,
    richLog: {
      telemetryType: 'rich_step_log',
      executionMemory: { stage: agentName },
      orchestration: {
        durationMs,
        toolIterations,
        toolCallCount: toolExecutions.length,
        mutatedFiles,
      },
      inflow: { systemInstructions, userContent, context: contextTelemetry },
      thought: finalContent,
      ...(toolExecutions.length > 0 ? { toolExecutions } : {}),
      model: config.ollamaModel,
      budget,
      timeoutMs,
    },
  });

  await writeAgentOutput({
    conversationId,
    agentName,
    stage: agentName,
    schemaVersion: '2.0.0',
    model: config.ollamaModel,
    validatedJson: { content: finalContent },
    executionTime: durationMs,
    tokenUsage: estimatedTokens,
    attempt,
  });

  // 1. Write to ExecutiveMemory ledger (historical record — not used for context)
  const inferenceId = await writeExecutiveMemoryRecord({
    conversationId,
    agentName,
    contentMd: finalContent,
    filePath: targetFile,
    tokenCount: estimatedTokens,
    durationMs,
    consumedInferenceIds: [],
  });

  // 2. Synchronize in-flight ledger so subsequent stages in this run see fresh data
  const fieldName = (OWNERSHIP as any)[agentName]?.[0];
  if (fieldName && ledger) {
    if (agentName === 'Coder' && targetFile) {
      const currentCoder = ledger.read('coder') || {};
      currentCoder[targetFile] = { content: finalContent };
      (ledger.getState() as any).coder = currentCoder;
    } else {
      (ledger.getState() as any)[fieldName] = { content: finalContent };
    }
  }

  await writeHistoryLog(
    conversationId,
    agentName,
    'Completed',
    canonicalTargetFile
      ? `Agent ${agentName} completed file "${canonicalTargetFile}"${runtimeOptions?.fileIndex && runtimeOptions?.totalFiles ? ` (${runtimeOptions.fileIndex} of ${runtimeOptions.totalFiles})` : ''} in ${durationMs}ms (${finalContent.length} bytes generated${toolExecutions.length > 0 ? `, ${toolExecutions.length} tool call(s)` : ''}). Estimated tokens: ${estimatedTokens}`
      : `Agent ${agentName} completed in ${durationMs}ms (${finalContent.length} bytes generated${toolExecutions.length > 0 ? `, ${toolExecutions.length} tool call(s)` : ''}). Estimated tokens: ${estimatedTokens}`
  );

  onEvent({
    type: 'AGENT_LOG',
    agent: agentName,
    message: `Agent ${agentName} completed in ${durationMs}ms (${finalContent.length} bytes generated${toolExecutions.length > 0 ? `, ${toolExecutions.length} tool call(s)` : ''}). [${inferenceId}]`,
  });

  return {
    content: finalContent,
    raw: rawResponse,
    mutatedViaTool: mutatedTargetViaTool,
    mutatedFiles,
    toolExecutions,
  };
}
