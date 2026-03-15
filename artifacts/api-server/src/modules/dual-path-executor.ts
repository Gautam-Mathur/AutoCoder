/**
 * Dual-Path Executor — Runs rule engine first, then SLM enhances
 *
 * Two execution modes:
 *   - 'enhance': SLM proposes patches on top of rule engine output (safe for structural stages)
 *   - 'generate': SLM produces full structured output, judged against rule baseline (for semantic stages)
 *
 * Judge uses existing quality scoring — never an SLM.
 * Rule engine output is always the fallback.
 */

import { runSLM, isSLMAvailable } from './slm-inference-engine.js';
import type { SLMResponse } from './slm-inference-engine.js';

export type ExecutionMode = 'enhance' | 'generate';

export type StageMode = 'rules' | 'hybrid' | 'slm-only';

export interface DualPathConfig {
  stage: string;
  mode: ExecutionMode;
  stageMode: StageMode;
  qualityThreshold: number;
  maxRetries: number;
  mergeStrategy: 'prefer-slm' | 'prefer-rules' | 'best-score';
}

export interface PathResult<T> {
  ruleOutput: T;
  slmOutput: T | null;
  winner: 'rules' | 'slm' | 'merged';
  ruleScore: number;
  slmScore: number;
  finalOutput: T;
  slmLatencyMs: number;
  slmUsed: boolean;
  reason: string;
}

export interface StagePatch<T> {
  field: string;
  originalValue: any;
  patchedValue: any;
  reason: string;
  confidence: number;
}

export interface EnhanceResult<T> {
  patches: StagePatch<T>[];
  enhancedOutput: T;
  patchesApplied: number;
  patchesRejected: number;
}

type RuleEngine<TInput, TOutput> = (input: TInput) => TOutput;
type ScoreFunction<T> = (output: T, context: Record<string, any>) => number;
type MergeFunction<T> = (ruleOutput: T, slmOutput: T) => T;
type PatchValidator<T> = (patch: StagePatch<T>, ruleOutput: T) => boolean;

const DEFAULT_CONFIG: DualPathConfig = {
  stage: '',
  mode: 'enhance',
  stageMode: 'hybrid',
  qualityThreshold: 0.6,
  maxRetries: 1,
  mergeStrategy: 'best-score',
};

export async function executeDualPath<TInput, TOutput>(
  config: Partial<DualPathConfig> & { stage: string },
  input: TInput,
  ruleEngine: RuleEngine<TInput, TOutput>,
  scoreFunction: ScoreFunction<TOutput>,
  options?: {
    context?: Record<string, any>;
    mergeFunction?: MergeFunction<TOutput>;
    patchValidator?: PatchValidator<TOutput>;
    onThinkingStep?: (phase: string, label: string, detail: string) => void;
  }
): Promise<PathResult<TOutput>> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const emit = options?.onThinkingStep || (() => {});
  const context = options?.context || {};

  const ruleStart = Date.now();
  const ruleOutput = ruleEngine(input);
  const ruleLatency = Date.now() - ruleStart;
  const ruleScore = scoreFunction(ruleOutput, context);

  emit(fullConfig.stage, 'Rule engine complete', `Baseline produced in ${ruleLatency}ms (score: ${ruleScore.toFixed(2)})`);

  if (fullConfig.stageMode === 'rules') {
    return {
      ruleOutput,
      slmOutput: null,
      winner: 'rules',
      ruleScore,
      slmScore: 0,
      finalOutput: ruleOutput,
      slmLatencyMs: 0,
      slmUsed: false,
      reason: 'Stage configured for rules-only mode',
    };
  }

  if (!isSLMAvailable()) {
    emit(fullConfig.stage, 'SLM unavailable', 'No model loaded — using rule engine output');
    return {
      ruleOutput,
      slmOutput: null,
      winner: 'rules',
      ruleScore,
      slmScore: 0,
      finalOutput: ruleOutput,
      slmLatencyMs: 0,
      slmUsed: false,
      reason: 'SLM not available — graceful fallback to rules',
    };
  }

  emit(fullConfig.stage, 'Running SLM enhancement', `Mode: ${fullConfig.mode} | Strategy: ${fullConfig.mergeStrategy}`);

  const slmContext: Record<string, any> = {
    ...context,
    ruleOutput: ruleOutput,
    ruleScore,
    stage: fullConfig.stage,
    mode: fullConfig.mode,
  };

  let slmResponse: SLMResponse<TOutput>;
  let retries = 0;

  do {
    slmResponse = await runSLM<TOutput>(fullConfig.stage, slmContext);
    retries++;
  } while (!slmResponse.success && retries < fullConfig.maxRetries);

  if (!slmResponse.success || slmResponse.data === null) {
    emit(fullConfig.stage, 'SLM failed', `${slmResponse.error || 'Empty response'} — using rule engine output`);
    return {
      ruleOutput,
      slmOutput: null,
      winner: 'rules',
      ruleScore,
      slmScore: 0,
      finalOutput: ruleOutput,
      slmLatencyMs: slmResponse.latencyMs,
      slmUsed: false,
      reason: `SLM failed: ${slmResponse.error}`,
    };
  }

  const slmOutput = slmResponse.data;
  const slmScore = scoreFunction(slmOutput, context);

  emit(fullConfig.stage, 'SLM complete', `SLM score: ${slmScore.toFixed(2)} vs Rule score: ${ruleScore.toFixed(2)} (${slmResponse.latencyMs}ms)`);

  if (fullConfig.stageMode === 'slm-only' && slmScore >= fullConfig.qualityThreshold) {
    return {
      ruleOutput,
      slmOutput,
      winner: 'slm',
      ruleScore,
      slmScore,
      finalOutput: slmOutput,
      slmLatencyMs: slmResponse.latencyMs,
      slmUsed: true,
      reason: 'SLM-only mode with passing quality threshold',
    };
  }

  let finalOutput: TOutput;
  let winner: 'rules' | 'slm' | 'merged';
  let reason: string;

  if (fullConfig.mergeStrategy === 'best-score') {
    if (slmScore > ruleScore && slmScore >= fullConfig.qualityThreshold) {
      finalOutput = slmOutput;
      winner = 'slm';
      reason = `SLM won with score ${slmScore.toFixed(2)} > ${ruleScore.toFixed(2)}`;
    } else {
      finalOutput = ruleOutput;
      winner = 'rules';
      reason = slmScore < fullConfig.qualityThreshold
        ? `SLM below quality threshold (${slmScore.toFixed(2)} < ${fullConfig.qualityThreshold})`
        : `Rules scored higher (${ruleScore.toFixed(2)} >= ${slmScore.toFixed(2)})`;
    }
  } else if (fullConfig.mergeStrategy === 'prefer-slm') {
    if (slmScore >= fullConfig.qualityThreshold) {
      finalOutput = slmOutput;
      winner = 'slm';
      reason = `SLM preferred and met threshold (${slmScore.toFixed(2)})`;
    } else {
      finalOutput = ruleOutput;
      winner = 'rules';
      reason = `SLM below threshold — falling back to rules`;
    }
  } else {
    if (options?.mergeFunction && slmScore >= fullConfig.qualityThreshold) {
      finalOutput = options.mergeFunction(ruleOutput, slmOutput);
      winner = 'merged';
      reason = `Merged: rule baseline + SLM enhancements (SLM score: ${slmScore.toFixed(2)})`;
    } else {
      finalOutput = ruleOutput;
      winner = 'rules';
      reason = 'Rules preferred — no merge function or SLM below threshold';
    }
  }

  emit(fullConfig.stage, `Winner: ${winner}`, reason);

  return {
    ruleOutput,
    slmOutput,
    winner,
    ruleScore,
    slmScore,
    finalOutput,
    slmLatencyMs: slmResponse.latencyMs,
    slmUsed: true,
    reason,
  };
}

export async function executePatchPath<TInput, TOutput extends Record<string, any>>(
  config: Partial<DualPathConfig> & { stage: string },
  input: TInput,
  ruleEngine: RuleEngine<TInput, TOutput>,
  patchValidator: PatchValidator<TOutput>,
  options?: {
    context?: Record<string, any>;
    onThinkingStep?: (phase: string, label: string, detail: string) => void;
    maxPatches?: number;
  }
): Promise<EnhanceResult<TOutput> & { ruleOutput: TOutput; slmUsed: boolean }> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config, mode: 'enhance' as ExecutionMode };
  const emit = options?.onThinkingStep || (() => {});
  const maxPatches = options?.maxPatches ?? 20;

  const ruleOutput = ruleEngine(input);

  if (fullConfig.stageMode === 'rules' || !isSLMAvailable()) {
    return {
      patches: [],
      enhancedOutput: ruleOutput,
      patchesApplied: 0,
      patchesRejected: 0,
      ruleOutput,
      slmUsed: false,
    };
  }

  emit(fullConfig.stage, 'Running SLM patch enhancement', 'SLM will propose patches on rule engine output');

  const slmContext: Record<string, any> = {
    ...(options?.context || {}),
    ruleOutput,
    stage: fullConfig.stage,
    mode: 'patch',
    instruction: 'Propose specific patches to improve the rule engine output. Return an array of patches with field, patchedValue, reason, and confidence (0-1).',
  };

  const slmResponse = await runSLM<{ patches: StagePatch<TOutput>[] }>(fullConfig.stage, slmContext);

  if (!slmResponse.success || !slmResponse.data?.patches) {
    emit(fullConfig.stage, 'SLM patch failed', 'No valid patches produced — using rule output unchanged');
    return {
      patches: [],
      enhancedOutput: ruleOutput,
      patchesApplied: 0,
      patchesRejected: 0,
      ruleOutput,
      slmUsed: false,
    };
  }

  const proposedPatches = slmResponse.data.patches.slice(0, maxPatches);
  let patchesApplied = 0;
  let patchesRejected = 0;
  const appliedPatches: StagePatch<TOutput>[] = [];
  const enhanced = { ...ruleOutput };

  for (const patch of proposedPatches) {
    if (!patch.field || patch.confidence === undefined) {
      patchesRejected++;
      continue;
    }

    if (patch.confidence < 0.5) {
      patchesRejected++;
      continue;
    }

    if (patchValidator(patch, ruleOutput)) {
      (enhanced as any)[patch.field] = patch.patchedValue;
      appliedPatches.push(patch);
      patchesApplied++;
    } else {
      patchesRejected++;
    }
  }

  emit(fullConfig.stage, 'Patch results', `${patchesApplied} patches applied, ${patchesRejected} rejected out of ${proposedPatches.length} proposed`);

  return {
    patches: appliedPatches,
    enhancedOutput: enhanced,
    patchesApplied,
    patchesRejected,
    ruleOutput,
    slmUsed: true,
  };
}

export function createStageExecutor<TInput, TOutput>(
  stage: string,
  mode: ExecutionMode,
  ruleEngine: RuleEngine<TInput, TOutput>,
  scoreFunction: ScoreFunction<TOutput>,
  defaultConfig?: Partial<DualPathConfig>
) {
  return async (
    input: TInput,
    stageMode: StageMode,
    options?: {
      context?: Record<string, any>;
      mergeFunction?: MergeFunction<TOutput>;
      onThinkingStep?: (phase: string, label: string, detail: string) => void;
    }
  ): Promise<PathResult<TOutput>> => {
    return executeDualPath(
      { ...defaultConfig, stage, mode, stageMode },
      input,
      ruleEngine,
      scoreFunction,
      options
    );
  };
}