/**
 * SLM Inference Engine — Unified local small language model execution layer
 *
 * Provides a single interface for all pipeline stages to call local SLMs:
 *   runSLM(stage, context) → StructuredOutput
 *
 * Features:
 *   - Structured JSON output enforcement
 *   - Timeout control with configurable per-stage limits
 *   - Token cap per request
 *   - Low temperature for deterministic-leaning outputs
 *   - Model loading/unloading with health checks
 *   - Fallback to null on any failure (rule engine always catches)
 *   - Prompt templating per stage with system/user message construction
 */

export interface SLMConfig {
  modelPath: string;
  contextSize: number;
  maxTokens: number;
  temperature: number;
  topP: number;
  repeatPenalty: number;
  timeoutMs: number;
  gpuLayers: number;
  threads: number;
}

export interface StagePromptTemplate {
  stage: string;
  systemPrompt: string;
  userPromptBuilder: (context: Record<string, any>) => string;
  outputSchema: Record<string, any>;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

export interface SLMResponse<T = any> {
  success: boolean;
  data: T | null;
  rawOutput: string;
  tokensUsed: number;
  latencyMs: number;
  error?: string;
}

export interface SLMHealthStatus {
  loaded: boolean;
  modelPath: string | null;
  modelSize: string | null;
  contextSize: number;
  lastInferenceMs: number | null;
  totalInferences: number;
  totalErrors: number;
  uptime: number;
}

const DEFAULT_CONFIG: SLMConfig = {
  modelPath: '',
  contextSize: 4096,
  maxTokens: 2048,
  temperature: 0.3,
  topP: 0.9,
  repeatPenalty: 1.1,
  timeoutMs: 30000,
  gpuLayers: 0,
  threads: 4,
};

const STAGE_PROMPT_TEMPLATES: Map<string, StagePromptTemplate> = new Map();

let engineState: {
  initialized: boolean;
  config: SLMConfig;
  modelLoaded: boolean;
  startTime: number;
  totalInferences: number;
  totalErrors: number;
  lastInferenceMs: number | null;
  httpEndpoint: string | null;
} = {
  initialized: false,
  config: { ...DEFAULT_CONFIG },
  modelLoaded: false,
  startTime: Date.now(),
  totalInferences: 0,
  totalErrors: 0,
  lastInferenceMs: null,
  httpEndpoint: null,
};

export function registerStageTemplate(template: StagePromptTemplate): void {
  STAGE_PROMPT_TEMPLATES.set(template.stage, template);
}

export function getRegisteredStages(): string[] {
  return Array.from(STAGE_PROMPT_TEMPLATES.keys());
}

export function initializeSLMEngine(config: Partial<SLMConfig> = {}): void {
  engineState.config = { ...DEFAULT_CONFIG, ...config };
  engineState.initialized = true;
  engineState.startTime = Date.now();
  console.log(`[SLM Engine] Initialized with config: contextSize=${engineState.config.contextSize}, maxTokens=${engineState.config.maxTokens}, temperature=${engineState.config.temperature}`);
}

export function configureSLMEndpoint(endpoint: string): void {
  engineState.httpEndpoint = endpoint;
  engineState.modelLoaded = true;
  console.log(`[SLM Engine] Configured HTTP endpoint: ${endpoint}`);
}

export function setModelPath(modelPath: string): void {
  engineState.config.modelPath = modelPath;
  console.log(`[SLM Engine] Model path set: ${modelPath}`);
}

export function isModelLoaded(): boolean {
  return engineState.modelLoaded;
}

export function isSLMAvailable(): boolean {
  return engineState.initialized && engineState.modelLoaded;
}

function buildPrompt(
  template: StagePromptTemplate,
  context: Record<string, any>
): { system: string; user: string } {
  const system = template.systemPrompt;
  const user = template.userPromptBuilder(context);
  return { system, user };
}

function buildJsonSchemaInstruction(schema: Record<string, any>): string {
  const schemaStr = JSON.stringify(schema, null, 2);
  return `\n\nYou MUST respond with valid JSON matching this schema:\n\`\`\`json\n${schemaStr}\n\`\`\`\n\nDo not include any text before or after the JSON. Only output the JSON object.`;
}

function extractJSON(raw: string): any {
  const trimmed = raw.trim();

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed);
    } catch {}
  }

  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {}
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(trimmed.substring(firstBrace, lastBrace + 1));
    } catch {}
  }

  const firstBracket = trimmed.indexOf('[');
  const lastBracket = trimmed.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    try {
      return JSON.parse(trimmed.substring(firstBracket, lastBracket + 1));
    } catch {}
  }

  return null;
}

async function callHTTPEndpoint(
  system: string,
  user: string,
  config: { maxTokens: number; temperature: number; timeoutMs: number }
): Promise<{ text: string; tokensUsed: number }> {
  if (!engineState.httpEndpoint) {
    throw new Error('No SLM HTTP endpoint configured');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(engineState.httpEndpoint + '/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        top_p: engineState.config.topP,
        repeat_penalty: engineState.config.repeatPenalty,
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`SLM endpoint returned ${response.status}: ${await response.text()}`);
    }

    const result = await response.json() as any;
    const text = result.choices?.[0]?.message?.content || '';
    const tokensUsed = result.usage?.total_tokens || 0;

    return { text, tokensUsed };
  } finally {
    clearTimeout(timeout);
  }
}

async function callBuiltinFallback(
  system: string,
  user: string,
  _config: { maxTokens: number; temperature: number; timeoutMs: number }
): Promise<{ text: string; tokensUsed: number }> {
  return { text: '', tokensUsed: 0 };
}

export async function runSLM<T = any>(
  stage: string,
  context: Record<string, any>,
  overrides?: Partial<{ maxTokens: number; temperature: number; timeoutMs: number }>
): Promise<SLMResponse<T>> {
  const startTime = Date.now();

  if (!engineState.initialized) {
    return {
      success: false,
      data: null,
      rawOutput: '',
      tokensUsed: 0,
      latencyMs: 0,
      error: 'SLM engine not initialized',
    };
  }

  if (!engineState.modelLoaded) {
    return {
      success: false,
      data: null,
      rawOutput: '',
      tokensUsed: 0,
      latencyMs: 0,
      error: 'No SLM model loaded',
    };
  }

  const template = STAGE_PROMPT_TEMPLATES.get(stage);
  if (!template) {
    return {
      success: false,
      data: null,
      rawOutput: '',
      tokensUsed: 0,
      latencyMs: Date.now() - startTime,
      error: `No prompt template registered for stage: ${stage}`,
    };
  }

  const config = {
    maxTokens: overrides?.maxTokens ?? template.maxTokens ?? engineState.config.maxTokens,
    temperature: overrides?.temperature ?? template.temperature ?? engineState.config.temperature,
    timeoutMs: overrides?.timeoutMs ?? template.timeoutMs ?? engineState.config.timeoutMs,
  };

  try {
    const { system, user } = buildPrompt(template, context);
    const systemWithSchema = system + buildJsonSchemaInstruction(template.outputSchema);

    const { text, tokensUsed } = engineState.httpEndpoint
      ? await callHTTPEndpoint(systemWithSchema, user, config)
      : await callBuiltinFallback(systemWithSchema, user, config);

    const latencyMs = Date.now() - startTime;
    engineState.totalInferences++;
    engineState.lastInferenceMs = latencyMs;

    if (!text || text.trim().length === 0) {
      engineState.totalErrors++;
      return {
        success: false,
        data: null,
        rawOutput: text,
        tokensUsed,
        latencyMs,
        error: 'SLM returned empty response',
      };
    }

    const parsed = extractJSON(text);
    if (parsed === null) {
      engineState.totalErrors++;
      return {
        success: false,
        data: null,
        rawOutput: text,
        tokensUsed,
        latencyMs,
        error: 'Failed to parse SLM output as JSON',
      };
    }

    return {
      success: true,
      data: parsed as T,
      rawOutput: text,
      tokensUsed,
      latencyMs,
    };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    engineState.totalErrors++;
    engineState.lastInferenceMs = latencyMs;

    const errMsg = err instanceof Error ? err.message : String(err);

    return {
      success: false,
      data: null,
      rawOutput: '',
      tokensUsed: 0,
      latencyMs,
      error: errMsg.includes('abort') ? `SLM timed out after ${config.timeoutMs}ms` : errMsg,
    };
  }
}

export async function runSLMRaw(
  stage: string,
  context: Record<string, any>,
  overrides?: Partial<{ maxTokens: number; temperature: number; timeoutMs: number }>
): Promise<SLMResponse<string>> {
  const startTime = Date.now();

  if (!engineState.initialized || !engineState.modelLoaded) {
    return {
      success: false,
      data: null,
      rawOutput: '',
      tokensUsed: 0,
      latencyMs: 0,
      error: 'SLM not available',
    };
  }

  const template = STAGE_PROMPT_TEMPLATES.get(stage);
  if (!template) {
    return {
      success: false,
      data: null,
      rawOutput: '',
      tokensUsed: 0,
      latencyMs: Date.now() - startTime,
      error: `No prompt template registered for stage: ${stage}`,
    };
  }

  const config = {
    maxTokens: overrides?.maxTokens ?? template.maxTokens ?? engineState.config.maxTokens,
    temperature: overrides?.temperature ?? template.temperature ?? engineState.config.temperature,
    timeoutMs: overrides?.timeoutMs ?? template.timeoutMs ?? engineState.config.timeoutMs,
  };

  try {
    const { system, user } = buildPrompt(template, context);

    const { text, tokensUsed } = engineState.httpEndpoint
      ? await callHTTPEndpoint(system, user, config)
      : await callBuiltinFallback(system, user, config);

    const latencyMs = Date.now() - startTime;
    engineState.totalInferences++;
    engineState.lastInferenceMs = latencyMs;

    return {
      success: text.trim().length > 0,
      data: text,
      rawOutput: text,
      tokensUsed,
      latencyMs,
    };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    engineState.totalErrors++;
    const errMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      data: null,
      rawOutput: '',
      tokensUsed: 0,
      latencyMs,
      error: errMsg,
    };
  }
}

export function getSLMHealth(): SLMHealthStatus {
  return {
    loaded: engineState.modelLoaded,
    modelPath: engineState.config.modelPath || null,
    modelSize: null,
    contextSize: engineState.config.contextSize,
    lastInferenceMs: engineState.lastInferenceMs,
    totalInferences: engineState.totalInferences,
    totalErrors: engineState.totalErrors,
    uptime: Date.now() - engineState.startTime,
  };
}

export function resetSLMEngine(): void {
  engineState = {
    initialized: false,
    config: { ...DEFAULT_CONFIG },
    modelLoaded: false,
    startTime: Date.now(),
    totalInferences: 0,
    totalErrors: 0,
    lastInferenceMs: null,
    httpEndpoint: null,
  };
  STAGE_PROMPT_TEMPLATES.clear();
}
