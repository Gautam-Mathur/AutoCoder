import type { LLMConfig } from './inference';

export type SupportedProvider = 'ollama' | 'openai' | 'anthropic';

export interface ProviderHealthResult {
  connected: boolean;
  ollamaConnected: boolean;
  provider: string;
  host: string;
  model: string;
  models: string[];
  reason?: string;
}

export interface ResolveProviderHealthOptions {
  verifyRemote?: boolean;
  fetchImpl?: (input: string, init?: RequestInit) => Promise<{ ok: boolean; status?: number; json: () => Promise<any> }>;
  dispatcher?: unknown;
  timeoutMs?: number;
}

const DEFAULT_OPENAI_MODELS = ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'o3-mini'];
const DEFAULT_ANTHROPIC_MODELS = [
  'claude-3-5-sonnet-20241022',
  'claude-3-7-sonnet-latest',
  'claude-3-5-haiku-20241022',
];

function uniqueNonEmpty(items: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const clean = typeof item === 'string' ? item.trim() : '';
    if (clean && !seen.has(clean)) {
      seen.add(clean);
      out.push(clean);
    }
  }
  return out;
}

async function probeOllama(
  config: LLMConfig,
  fetchFn: NonNullable<ResolveProviderHealthOptions['fetchImpl']>,
  dispatcher: unknown,
  timeoutMs: number
): Promise<{ connected: boolean; host: string; models: string[]; reason?: string }> {
  const configuredHost = config.ollamaHost || 'http://127.0.0.1:11434';
  const urlsToTry = uniqueNonEmpty([
    configuredHost,
    'http://127.0.0.1:11434',
    'http://localhost:11434',
    'http://0.0.0.0:11434',
  ]);

  for (const targetHost of urlsToTry) {
    try {
      const init: Record<string, unknown> = {
        method: 'GET',
        cache: 'no-store',
        signal: AbortSignal.timeout(timeoutMs),
      };
      if (dispatcher) {
        init.dispatcher = dispatcher;
      }
      const res = await fetchFn(`${targetHost}/api/tags`, init as RequestInit);
      if (res.ok) {
        const data = await res.json();
        const models = Array.isArray(data?.models)
          ? data.models.map((m: { name?: string }) => m?.name).filter((n: unknown): n is string => typeof n === 'string' && n.length > 0)
          : [];
        return { connected: true, host: targetHost, models };
      }
    } catch {
      // Try next host candidate
    }
  }

  return {
    connected: false,
    host: configuredHost,
    models: [],
    reason: `Ollama endpoint (${configuredHost}) is unreachable.`,
  };
}

interface CloudProviderSpec {
  displayName: string;
  host: string;
  modelsUrl: string;
  defaultModels: string[];
  getKey: (cfg: LLMConfig) => string;
  getModel: (cfg: LLMConfig) => string;
  buildHeaders: (key: string) => Record<string, string>;
}

const CLOUD_PROVIDER_SPECS: Record<'openai' | 'anthropic', CloudProviderSpec> = {
  openai: {
    displayName: 'OpenAI',
    host: 'https://api.openai.com',
    modelsUrl: 'https://api.openai.com/v1/models',
    defaultModels: DEFAULT_OPENAI_MODELS,
    getKey: (cfg) => cfg.openaiApiKey || '',
    getModel: (cfg) => cfg.openaiModel,
    buildHeaders: (key) => ({ Authorization: `Bearer ${key}` }),
  },
  anthropic: {
    displayName: 'Anthropic',
    host: 'https://api.anthropic.com',
    modelsUrl: 'https://api.anthropic.com/v1/models',
    defaultModels: DEFAULT_ANTHROPIC_MODELS,
    getKey: (cfg) => cfg.anthropicApiKey || '',
    getModel: (cfg) => cfg.anthropicModel,
    buildHeaders: (key) => ({
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    }),
  },
};

async function checkCloudProvider(
  provider: 'openai' | 'anthropic',
  config: LLMConfig,
  fetchFn: NonNullable<ResolveProviderHealthOptions['fetchImpl']>,
  verifyRemote: boolean,
  timeoutMs: number
): Promise<ProviderHealthResult> {
  const spec = CLOUD_PROVIDER_SPECS[provider];
  const key = spec.getKey(config).trim();
  const activeModel = spec.getModel(config);
  const models = uniqueNonEmpty([activeModel, ...spec.defaultModels]);

  if (!key) {
    return {
      connected: false,
      ollamaConnected: false,
      provider,
      host: spec.host,
      model: activeModel,
      models,
      reason: `${spec.displayName} API key is not configured.`,
    };
  }

  if (verifyRemote) {
    try {
      const res = await fetchFn(spec.modelsUrl, {
        method: 'GET',
        headers: spec.buildHeaders(key),
        signal: AbortSignal.timeout(Math.max(timeoutMs, 4000)),
      });
      if (!res.ok) {
        return {
          connected: false,
          ollamaConnected: false,
          provider,
          host: spec.host,
          model: activeModel,
          models,
          reason: `${spec.displayName} API returned HTTP ${res.status ?? 'error'}.`,
        };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'network error';
      return {
        connected: false,
        ollamaConnected: false,
        provider,
        host: spec.host,
        model: activeModel,
        models,
        reason: `${spec.displayName} API check failed: ${msg}`,
      };
    }
  }

  return {
    connected: true,
    ollamaConnected: false,
    provider,
    host: spec.host,
    model: activeModel,
    models,
  };
}

/**
 * Resolves connectivity and selectable models strictly according to the active LLM provider.
 */
export async function resolveProviderHealth(
  config: LLMConfig,
  options: ResolveProviderHealthOptions = {}
): Promise<ProviderHealthResult> {
  const provider = (config.provider || 'ollama').toLowerCase().trim();
  const timeoutMs = options.timeoutMs ?? 3000;
  const fetchFn = options.fetchImpl ?? (fetch as unknown as NonNullable<ResolveProviderHealthOptions['fetchImpl']>);

  if (provider === 'ollama') {
    const probe = await probeOllama(config, fetchFn, options.dispatcher, timeoutMs);
    return {
      connected: probe.connected,
      ollamaConnected: probe.connected,
      provider: 'ollama',
      host: probe.host,
      model: config.ollamaModel,
      models: probe.models,
      ...(probe.reason ? { reason: probe.reason } : {}),
    };
  }

  if (provider === 'openai' || provider === 'anthropic') {
    return checkCloudProvider(provider, config, fetchFn, Boolean(options.verifyRemote), timeoutMs);
  }

  return {
    connected: false,
    ollamaConnected: false,
    provider,
    host: '',
    model: '',
    models: [],
    reason: `Unsupported LLM provider "${provider}".`,
  };
}
