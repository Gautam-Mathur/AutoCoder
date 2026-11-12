import {
  InferenceOptions,
  InferenceTurnResult,
  Message,
  runInferenceTurn,
} from '../inference';
import {
  executeTool,
  ToolDefinition,
  ToolExecutionContext,
  toolToOllamaFormat,
} from './toolbox';
import { normalizeProjectPath } from './workspace-policy';

export interface ToolCallLogEntry {
  iteration: number;
  toolName: string;
  argumentsPreview: Record<string, any>;
  success: boolean;
  mutatedFile?: string;
  durationMs: number;
  resultPreview: string;
  error?: string;
}

export interface RunToolLoopParams {
  messages: Message[];
  tools: ToolDefinition[];
  toolContext: ToolExecutionContext;
  inferenceOptions?: Omit<InferenceOptions, 'tools'>;
  maxIterations?: number;
  maxResultChars?: number;
  onEvent?: (event: { type: string; agent?: string; message: string; data?: any }) => void;
  inferenceTurnFn?: (
    messages: Message[],
    options?: InferenceOptions
  ) => Promise<InferenceTurnResult>;
}

export interface RunToolLoopResult {
  content: string;
  iterations: number;
  toolExecutions: ToolCallLogEntry[];
  mutatedFiles: string[];
  exhaustedBudget: boolean;
}

const MUTATING_TOOLS = new Set(['write_file', 'apply_diff', 'delete_file']);

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

function redactArgsPreview(args: Record<string, any>): Record<string, any> {
  const preview: Record<string, any> = {};
  for (const [key, val] of Object.entries(args || {})) {
    if (key === 'content' || key === 'new_content') {
      const str = typeof val === 'string' ? val : String(val ?? '');
      preview[key] = `<${str.length} chars>`;
    } else if (typeof val === 'string' && val.length > 200) {
      preview[key] = `${val.slice(0, 200)}...<${val.length} chars>`;
    } else {
      preview[key] = val;
    }
  }
  return preview;
}

export function serializeToolResultForModel(result: any, maxChars: number = 12000): string {
  if (typeof result === 'string') {
    if (result.length <= maxChars) return result;
    return `${result.slice(0, maxChars)}\n... [TRUNCATED ${result.length - maxChars} chars]`;
  }

  let json = '';
  try {
    json = JSON.stringify(result);
  } catch {
    return String(result).slice(0, maxChars);
  }

  if (json.length <= maxChars) return json;

  if (result && typeof result === 'object' && !Array.isArray(result)) {
    const clone: Record<string, any> = { ...result };
    const largeStringKeys = ['content', 'stdout', 'stderr', 'message'];
    for (const key of largeStringKeys) {
      if (typeof clone[key] === 'string' && clone[key].length > 1000) {
        const currentJson = JSON.stringify(clone);
        const excess = currentJson.length - maxChars;
        if (excess <= 0) break;
        const keepLen = Math.max(400, clone[key].length - excess - 120);
        const removed = clone[key].length - keepLen;
        clone[key] = `${clone[key].slice(0, keepLen)}\n... [TRUNCATED ${removed} chars]`;
        clone.truncated = true;
      }
    }
    try {
      const trimmedJson = JSON.stringify(clone);
      if (trimmedJson.length <= maxChars) {
        return trimmedJson;
      }
    } catch {}
  }

  return JSON.stringify({
    truncated: true,
    error: Boolean(result?.error),
    success: result?.success,
    preview: json.slice(0, Math.max(200, maxChars - 120)),
  });
}

function buildToolResultSummary(toolName: string, result: any): string {
  if (result?.error) {
    return String(result.message || 'Tool execution error').slice(0, 240);
  }
  if (toolName === 'read_file') {
    return result?.found
      ? `read ${result.lineCount ?? '?'} line(s) (hash ${String(result.contentHash || '').slice(0, 8)})`
      : `file not found`;
  }
  if (toolName === 'write_file' || toolName === 'apply_diff' || toolName === 'delete_file') {
    return String(result?.message || (result?.success ? 'ok' : 'no-op')).slice(0, 240);
  }
  if (toolName === 'list_files') {
    return `${result?.count ?? 0} workspace file(s)`;
  }
  if (toolName === 'check_syntax') {
    const errCount = Array.isArray(result?.errors) ? result.errors.length : 0;
    return result?.success ? 'syntax/types clean (0 errors)' : `failed (${errCount} error(s))`;
  }
  if (toolName === 'typecheck' || toolName === 'build_project' || toolName === 'run_tests') {
    return result?.success
      ? 'exit code 0'
      : `exit code ${result?.exitCode ?? 1}: ${String(result?.stderr || result?.stdout || '').slice(0, 160)}`;
  }
  return JSON.stringify(result).slice(0, 200);
}

export async function executeToolLoop(params: RunToolLoopParams): Promise<RunToolLoopResult> {
  const {
    messages,
    tools,
    toolContext,
    inferenceOptions = {},
    maxIterations = 8,
    maxResultChars = 12000,
    onEvent,
    inferenceTurnFn = runInferenceTurn,
  } = params;

  const workingMessages: Message[] = [...messages];
  const toolExecutions: ToolCallLogEntry[] = [];
  const mutatedFilesSet = new Set<string>();
  const stageLabel = toolContext.stageName || 'Agent';

  // Zero-tool fast path: preserve exact single-turn inference behavior
  if (!tools || tools.length === 0) {
    if (inferenceOptions.signal?.aborted) {
      throw new Error(`Stage ${stageLabel} was aborted before inference.`);
    }
    const turn = await inferenceTurnFn(workingMessages, inferenceOptions);
    return {
      content: turn.content,
      iterations: 1,
      toolExecutions,
      mutatedFiles: [],
      exhaustedBudget: false,
    };
  }

  const formattedTools = tools.map(toolToOllamaFormat);
  const callCountsByMutationEpoch = new Map<string, number>();
  let mutationEpoch = 0;
  let consecutiveGuardBlocks = 0;

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    if (inferenceOptions.signal?.aborted) {
      throw new Error(`Stage ${stageLabel} aborted during tool execution.`);
    }

    const turn = await inferenceTurnFn(workingMessages, {
      ...inferenceOptions,
      tools: formattedTools,
    });

    if (!turn.toolCalls || turn.toolCalls.length === 0) {
      return {
        content: turn.content || '',
        iterations: iteration,
        toolExecutions,
        mutatedFiles: Array.from(mutatedFilesSet),
        exhaustedBudget: false,
      };
    }

    workingMessages.push({
      role: 'assistant',
      content: turn.content || '',
      tool_calls: turn.toolCalls.map((tc) => ({
        id: tc.id,
        type: 'function',
        function: {
          name: tc.name,
          arguments: tc.arguments,
        },
      })),
    });

    let allBlockedInIteration = true;

    for (const tc of turn.toolCalls) {
      if (inferenceOptions.signal?.aborted) {
        throw new Error(`Stage ${stageLabel} aborted during tool execution.`);
      }

      const argsPreview = redactArgsPreview(tc.arguments);
      const argsSig = `${mutationEpoch}::${tc.name}::${stableStringify(tc.arguments)}`;
      const seenCount = (callCountsByMutationEpoch.get(argsSig) || 0) + 1;
      callCountsByMutationEpoch.set(argsSig, seenCount);

      const startedAt = Date.now();
      let result: any;

      if (tc.parseError) {
        allBlockedInIteration = false;
        result = {
          error: true,
          message: `Malformed JSON arguments for tool "${tc.name}": ${tc.parseError}`,
        };
      } else if (seenCount >= 3) {
        result = {
          error: true,
          message: `Loop Guard: Tool "${tc.name}" was called ${seenCount} times with identical arguments and no intervening workspace mutation. Stop repeating this call and either change strategy or produce your final output.`,
        };
      } else {
        allBlockedInIteration = false;
        onEvent?.({
          type: 'AGENT_LOG',
          agent: stageLabel,
          message: `🔧 [${stageLabel}] Calling tool ${tc.name}(${JSON.stringify(argsPreview)})`,
        });

        result = await executeTool(tc.name, tc.arguments, toolContext);
      }

      const durationMs = Date.now() - startedAt;
      const isFailure = Boolean(
        result?.error || (result && typeof result.success === 'boolean' && !result.success && MUTATING_TOOLS.has(tc.name))
      );
      const summary = buildToolResultSummary(tc.name, result);

      let mutatedFile: string | undefined;
      if (
        !isFailure &&
        MUTATING_TOOLS.has(tc.name) &&
        result?.success === true &&
        typeof tc.arguments?.file_path === 'string'
      ) {
        mutatedFile = normalizeProjectPath(tc.arguments.file_path);
        if (tc.name === 'write_file' || tc.name === 'apply_diff') {
          mutatedFilesSet.add(mutatedFile);
        } else if (tc.name === 'delete_file') {
          mutatedFilesSet.delete(mutatedFile);
        }
        mutationEpoch++;
      }

      toolExecutions.push({
        iteration,
        toolName: tc.name,
        argumentsPreview: argsPreview,
        success: !isFailure,
        ...(mutatedFile ? { mutatedFile } : {}),
        durationMs,
        resultPreview: summary,
        ...(isFailure ? { error: summary } : {}),
      });

      onEvent?.({
        type: 'AGENT_LOG',
        agent: stageLabel,
        message: `${isFailure ? '⚠️' : '✅'} [${stageLabel}] Tool ${tc.name} -> ${summary} (${durationMs}ms)`,
      });

      workingMessages.push({
        role: 'tool',
        tool_call_id: tc.id,
        name: tc.name,
        content: serializeToolResultForModel(result, maxResultChars),
      });
    }

    if (allBlockedInIteration) {
      consecutiveGuardBlocks++;
      if (consecutiveGuardBlocks >= 2) {
        break;
      }
    } else {
      consecutiveGuardBlocks = 0;
    }
  }

  // Budget exhausted or consecutive loop guard blocks: perform one final wrap-up turn without tools
  if (inferenceOptions.signal?.aborted) {
    throw new Error(`Stage ${stageLabel} aborted before final wrap-up inference.`);
  }

  workingMessages.push({
    role: 'user',
    content:
      '[TOOL BUDGET REACHED] Do not call any additional tools. Produce your complete final required response now based on the verified workspace state and tool outputs above.',
  });

  const finalTurn = await inferenceTurnFn(workingMessages, {
    ...inferenceOptions,
    tools: undefined,
  });

  return {
    content: finalTurn.content || '',
    iterations: maxIterations + 1,
    toolExecutions,
    mutatedFiles: Array.from(mutatedFilesSet),
    exhaustedBudget: true,
  };
}
