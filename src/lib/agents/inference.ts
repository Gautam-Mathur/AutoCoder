import { prisma } from '../db';

// Ensure localhost bypasses any system proxies so Ollama connections aren't intercepted by environment proxies
delete process.env.HTTP_PROXY;
delete process.env.http_proxy;
delete process.env.HTTPS_PROXY;
delete process.env.https_proxy;
process.env.no_proxy = '*';
process.env.NO_PROXY = '*';

const undici = typeof window === 'undefined' ? require('undici') : null;
const undiciAgent = undici ? undici.Agent : null;
const undiciFetch = undici ? undici.fetch : fetch;

// Direct unproxied dispatcher specifically for local loopback connections
export const directAgent = undiciAgent ? new undiciAgent({
  connect: { timeout: 5000 },
}) : null;

// Reusable Undici Agent with a 400-hour timeout (1,440,000,000 ms, cached globally)
const globalForAgent = global as unknown as { ollamaAgent: any };
const longTimeoutDispatcher = globalForAgent.ollamaAgent ?? (undiciAgent ? new undiciAgent({
  connect: { timeout: 1440000000 },
  connectTimeout: 1440000000,   // 400 hours connect timeout
  headersTimeout: 1440000000,   // 400 hours in ms
  bodyTimeout: 1440000000,      // 400 hours in ms
  keepAliveTimeout: 1440000000, // 400 hours in ms
  keepAliveMaxTimeout: 1440000000,
}) : null);
if (process.env.NODE_ENV !== 'production' && typeof window === 'undefined') {
  globalForAgent.ollamaAgent = longTimeoutDispatcher;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  rawArguments?: string;
  parseError?: string;
}

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: Array<{
    id?: string;
    type?: 'function';
    function: {
      name: string;
      arguments: Record<string, any> | string;
    };
  }>;
  tool_call_id?: string;
  name?: string;
}

export interface LLMConfig {
  provider: string;
  ollamaHost: string;
  ollamaModel: string;
  openaiApiKey: string;
  openaiModel: string;
  anthropicApiKey: string;
  anthropicModel: string;
}

export interface InferenceOptions {
  model?: string;
  temperature?: number;
  format?: 'json' | 'text';
  maxTokens?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  onChunk?: (text: string) => void;
  tools?: any[];
  fetchImpl?: (input: any, init?: any) => Promise<any>;
  configOverride?: Partial<LLMConfig>;
}

export interface InferenceTurnResult {
  content: string;
  toolCalls: ToolCall[];
  provider: string;
  model: string;
  durationMs: number;
  finishReason?: string;
}

import fs from 'fs';
import path from 'path';

// Settings helper
export async function getLLMConfig() {
  const defaults = {
    provider: process.env.LLM_PROVIDER || 'ollama', // 'ollama' | 'openai' | 'anthropic'
    ollamaHost: process.env.OLLAMA_HOST || 'http://127.0.0.1:11434',
    ollamaModel: process.env.OLLAMA_MODEL || 'llama3:8b-instruct',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
  };

  const settingsPath = path.join(process.cwd(), 'settings.json');
  let config = { ...defaults };
  if (fs.existsSync(settingsPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      config = { ...defaults, ...data };
    } catch (e) {
      console.error('Error reading settings.json, using defaults:', e);
    }
  }

  // Model fallback check: verify if the configured model is installed
  if (config.provider === 'ollama') {
    const hostsToTry = Array.from(new Set([
      config.ollamaHost,
      'http://127.0.0.1:11434',
      'http://localhost:11434',
      'http://0.0.0.0:11434',
    ]));

    for (const h of hostsToTry) {
      try {
        const res = await undiciFetch(`${h}/api/tags`, {
          method: 'GET',
          cache: 'no-store',
          signal: AbortSignal.timeout(3000),
          ...(longTimeoutDispatcher ? { dispatcher: longTimeoutDispatcher } : {} as any),
        });
        if (res.ok) {
          config.ollamaHost = h;
          const data = await res.json();
          if (data && Array.isArray(data.models) && data.models.length > 0) {
            const installedModelNames = data.models.map((m: any) => m.name);
            if (!installedModelNames.includes(config.ollamaModel)) {
              // Configured model not found, fallback to the first installed model
              config.ollamaModel = installedModelNames[0];
            }
          }
          break;
        }
      } catch (e) {
        // Endpoint is offline on this host, try fallback
      }
    }
  }

  return config;
}

export async function checkOllamaConnection(host: string): Promise<boolean> {
  delete process.env.HTTP_PROXY;
  delete process.env.http_proxy;
  delete process.env.HTTPS_PROXY;
  delete process.env.https_proxy;
  process.env.no_proxy = '*';
  process.env.NO_PROXY = '*';

  const hostsToTry = Array.from(new Set([
    host,
    'http://127.0.0.1:11434',
    'http://localhost:11434',
    'http://0.0.0.0:11434',
  ]));

  for (const h of hostsToTry) {
    try {
      const res = await undiciFetch(`${h}/api/tags`, {
        method: 'GET',
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
        ...(directAgent ? { dispatcher: directAgent } : {} as any),
      });
      if (res.ok) return true;
    } catch (e) {
      // Continue to next host attempt
    }
  }
  return false;
}

export function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '');
  return cleaned.trim();
}

function parseToolArguments(raw: unknown): {
  parsed: Record<string, any>;
  rawArguments?: string;
  parseError?: string;
} {
  if (raw === undefined || raw === null || raw === '') {
    return { parsed: {} };
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return { parsed: raw as Record<string, any> };
  }
  if (typeof raw === 'string') {
    try {
      const val = JSON.parse(raw);
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        return { parsed: val, rawArguments: raw };
      }
      return {
        parsed: {},
        rawArguments: raw,
        parseError: 'Tool arguments JSON did not decode to an object.',
      };
    } catch (err: any) {
      return {
        parsed: {},
        rawArguments: raw,
        parseError: `Invalid JSON arguments: ${err?.message || err}`,
      };
    }
  }
  return {
    parsed: {},
    parseError: `Unsupported tool arguments type: ${typeof raw}`,
  };
}

function normalizeProviderToolCalls(
  rawToolCalls: any[],
  startIdx: number = 0
): ToolCall[] {
  const out: ToolCall[] = [];
  let idx = startIdx;
  for (const tc of rawToolCalls) {
    if (!tc) continue;
    const fn = tc.function || tc;
    const name = typeof fn?.name === 'string' ? fn.name.trim() : '';
    if (!name) continue;
    const { parsed, rawArguments, parseError } = parseToolArguments(
      fn?.arguments ?? tc.input ?? tc.arguments
    );
    out.push({
      id: typeof tc.id === 'string' && tc.id.trim() ? tc.id : `call_${idx}`,
      name,
      arguments: parsed,
      ...(rawArguments !== undefined ? { rawArguments } : {}),
      ...(parseError ? { parseError } : {}),
    });
    idx++;
  }
  return out;
}

function formatMessagesForOllama(messages: Message[]): any[] {
  return messages.map((m) => {
    if (m.role === 'assistant' && m.tool_calls && m.tool_calls.length > 0) {
      return {
        role: 'assistant',
        content: m.content || '',
        tool_calls: m.tool_calls.map((tc) => ({
          ...(tc.id ? { id: tc.id } : {}),
          type: 'function',
          function: {
            name: tc.function.name,
            arguments:
              typeof tc.function.arguments === 'string'
                ? parseToolArguments(tc.function.arguments).parsed
                : tc.function.arguments || {},
          },
        })),
      };
    }
    if (m.role === 'tool') {
      return {
        role: 'tool',
        content: m.content || '',
        ...(m.name ? { tool_name: m.name } : {}),
      };
    }
    return { role: m.role, content: m.content || '' };
  });
}

function formatMessagesForOpenAI(messages: Message[]): any[] {
  return messages.map((m) => {
    if (m.role === 'assistant' && m.tool_calls && m.tool_calls.length > 0) {
      return {
        role: 'assistant',
        content: m.content || null,
        tool_calls: m.tool_calls.map((tc, idx) => ({
          id: tc.id || `call_${idx}`,
          type: 'function',
          function: {
            name: tc.function.name,
            arguments:
              typeof tc.function.arguments === 'string'
                ? tc.function.arguments
                : JSON.stringify(tc.function.arguments || {}),
          },
        })),
      };
    }
    if (m.role === 'tool') {
      return {
        role: 'tool',
        tool_call_id: m.tool_call_id || 'call_0',
        ...(m.name ? { name: m.name } : {}),
        content: m.content || '',
      };
    }
    return { role: m.role, content: m.content || '' };
  });
}

function formatMessagesForAnthropic(messages: Message[]): any[] {
  const formatted: any[] = [];
  const nonSystem = messages.filter((m) => m.role !== 'system');

  for (const m of nonSystem) {
    if (m.role === 'assistant' && m.tool_calls && m.tool_calls.length > 0) {
      const blocks: any[] = [];
      if (m.content && m.content.trim()) {
        blocks.push({ type: 'text', text: m.content });
      }
      m.tool_calls.forEach((tc, idx) => {
        const inputObj =
          typeof tc.function.arguments === 'string'
            ? parseToolArguments(tc.function.arguments).parsed
            : tc.function.arguments || {};
        blocks.push({
          type: 'tool_use',
          id: tc.id || `toolu_${idx}`,
          name: tc.function.name,
          input: inputObj,
        });
      });
      formatted.push({ role: 'assistant', content: blocks });
    } else if (m.role === 'tool') {
      const resultBlock = {
        type: 'tool_result',
        tool_use_id: m.tool_call_id || 'toolu_0',
        content: m.content || '',
      };
      const prev = formatted[formatted.length - 1];
      if (prev && prev.role === 'user' && Array.isArray(prev.content)) {
        prev.content.push(resultBlock);
      } else {
        formatted.push({ role: 'user', content: [resultBlock] });
      }
    } else {
      formatted.push({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content || '',
      });
    }
  }

  return formatted;
}

function convertToolsForAnthropic(tools: any[]): any[] {
  return tools.map((t) => {
    if (t?.type === 'function' && t?.function) {
      return {
        name: t.function.name,
        description: t.function.description || '',
        input_schema: t.function.parameters || { type: 'object', properties: {}, required: [] },
      };
    }
    return t;
  });
}

export async function runInference(
  messages: Message[],
  options: InferenceOptions = {}
): Promise<string> {
  const turn = await runInferenceTurn(messages, options);
  return turn.content;
}

export async function runInferenceTurn(
  messages: Message[],
  options: InferenceOptions = {}
): Promise<InferenceTurnResult> {
  // Ensure loopback bypasses any system environment proxies
  delete process.env.HTTP_PROXY;
  delete process.env.http_proxy;
  delete process.env.HTTPS_PROXY;
  delete process.env.https_proxy;
  process.env.no_proxy = '*';
  process.env.NO_PROXY = '*';

  const mockWrap = (content: string): InferenceTurnResult => ({
    content,
    toolCalls: [],
    provider: 'mock',
    model: 'mock',
    durationMs: 0,
    finishReason: 'stop',
  });

  if (process.env.MOCK_INFERENCE === 'true') {
    const sysPrompt = messages.find(m => m.role === 'system')?.content || '';
    if (sysPrompt.includes('You are the Queen Agent')) {
      return mockWrap(JSON.stringify({
        contextType: "canonical",
        mvpId: "MVP-001",
        projectName: "Todo App",
        problemStatement: "Manage tasks efficiently",
        projectDescription: "A robust task list app",
        projectGoal: "Provide CRUD operations for tasks",
        mvpScope: {
          included: ["Add Task", "Delete Task", "View Tasks"],
          excluded: ["Collaborative editing", "Push notifications"]
        },
        constraints: ["SQLite only", "Local execution"],
        risks: ["Data corruption if disk full"],
        agentInstructions: {
          planner: "Map tasks",
          architect: "Design structure",
          system: "Design DB tables",
          designer: "Create layout",
          reviewer: "Review specs",
          coder: "Write code",
          tester: "Write tests",
          debugger: "Debug errors",
          security: "Audit vulnerabilities",
          refiner: "Refine output"
        }
      }));
    }
    if (sysPrompt.includes('You are the Planner Agent')) {
      return mockWrap(JSON.stringify({
        contextType: "canonical",
        projectName: "Todo App",
        mvpReference: "MVP-001",
        recommendedTechStack: {
          frontend: "react",
          backend: "express",
          database: "sqlite",
          authentication: "none",
          deployment: "local",
          additionalTechnologies: []
        },
        features: [
          {
            id: "Feature-001",
            mvpReference: "MVP-001",
            name: "Add Task",
            description: "User can type task and add it",
            priority: "Critical"
          }
        ],
        functionalRequirements: ["Support adding tasks"],
        nonFunctionalRequirements: {
          security: ["None"],
          performance: ["Fast response"],
          scalability: ["Single user scale"],
          usability: ["Simple input"],
          maintainability: ["Clean components"],
          accessibility: ["Accessible elements"],
          reliability: ["Local storage persist"]
        },
        deliverables: ["TodoPage component"],
        agentInstructions: {
          architect: "Map TodoPage",
          system: "Design task schema",
          designer: "Map UI props",
          coder: "Synthesize page",
          tester: "Verify tasks add",
          debugger: "Fix index errors",
          security: "Sanitize inputs"
        }
      }));
    }
    if (sysPrompt.includes('You are the Architect Agent')) {
      return mockWrap(JSON.stringify({
        contextType: "canonical",
        projectName: "Todo App",
        mvpReference: "MVP-001",
        architectureStyle: "layered",
        projectStructure: {
          root: "src",
          directories: ["pages", "components"],
          files: [
            { path: "src/pages/TodoPage.tsx", module: "Module-001" },
            { path: "src/components/TodoItem.tsx", module: "Module-001" }
          ]
        },
        modules: [
          {
            id: "Module-001",
            name: "TodoModule",
            purpose: "CRUD for tasks",
            supportsFeatures: ["Feature-001"],
            directories: ["src/pages", "src/components"],
            files: ["src/pages/TodoPage.tsx", "src/components/TodoItem.tsx"],
            dependsOn: [],
            usedBy: []
          }
        ],
        sharedResources: {
          configuration: [],
          constants: [],
          types: [],
          utilities: [],
          middleware: [],
          assets: [],
          environment: [],
          others: []
        },
        projectConventions: {
          namingConvention: "camelCase",
          folderConvention: "lowercase",
          codingConvention: "standard",
          importConvention: "absolute"
        }
      }));
    }
    if (sysPrompt.includes('You are the System Agent')) {
      return mockWrap(JSON.stringify({
        contextType: "canonical",
        projectName: "Todo App",
        mvpReference: "MVP-001",
        database: {
          type: "sqlite",
          entities: [
            {
              id: "Entity-001",
              name: "Task",
              purpose: "Stores todo items",
              fields: ["id: string", "title: string"],
              relationships: [],
              indexes: [],
              constraints: []
            }
          ]
        },
        apis: [
          {
            id: "API-001",
            name: "addTodo",
            method: "POST",
            route: "/api/todos",
            purpose: "Creates tasks",
            featureId: "Feature-001",
            request: {},
            response: {},
            middleware: []
          }
        ],
        routing: {
          routerStructure: [
            { apiId: "API-001", path: "/api/todos" }
          ],
          routeGroups: []
        },
        middleware: [],
        services: [
          { id: "Service-001", name: "TodoService", purpose: "Handles tasks persistence", usedByApis: ["API-001"] }
        ],
        configuration: {
          environmentVariables: [],
          storage: [],
          cache: [],
          externalServices: [],
          authentication: [],
          authorization: [],
          others: []
        },
        backendRules: {
          validationRules: [],
          businessRules: [],
          errorHandling: [],
          securityPolicies: []
        }
      }));
    }
    if (sysPrompt.includes('You are the Designer Agent')) {
      return mockWrap(JSON.stringify({
        contextType: "canonical",
        projectName: "Todo App",
        mvpReference: "MVP-001",
        designPhilosophy: {
          theme: "dark",
          designPrinciples: ["Simple", "Clean"],
          targetExperience: "Smooth task additions",
          brandingGuidelines: []
        },
        navigation: {
          primaryNavigation: [],
          secondaryNavigation: [],
          userFlows: []
        },
        pages: [
          {
            id: "Page-Login",
            name: "TodoPage",
            purpose: "Manage tasks layout",
            layout: "standard",
            supportsFeature: "Feature-001",
            components: ["Component-001"]
          }
        ],
        components: [
          {
            id: "Component-001",
            name: "TodoItem",
            purpose: "List task line view",
            pageId: "Page-Login",
            variants: [],
            states: []
          }
        ],
        designSystem: {
          colors: ["bg-slate-900"],
          typography: [],
          spacing: [],
          icons: [],
          animations: [],
          responsiveBreakpoints: [],
          elevation: [],
          borders: []
        },
        accessibility: {
          standards: [],
          requirements: []
        },
        interactionGuidelines: {
          feedback: [],
          transitions: [],
          errorStates: [],
          loadingStates: []
        }
      }));
    }
    if (sysPrompt.includes('Blueprinter in a strict')) {
      return mockWrap(JSON.stringify({
        blueprints: [
          {
            file: "src/pages/TodoPage.tsx",
            purpose: "Render tasks list",
            imports: [],
            exports: ["TodoPage"],
            dependencies: [],
            interfaces: [],
            functions: ["render"],
            apiUsage: [],
            componentRelationships: [],
            acceptanceCriteria: []
          }
        ]
      }));
    }
    if (sysPrompt.includes('You are the Coder Agent')) {
      return mockWrap(JSON.stringify({
        contextType: "canonical",
        projectName: "Todo App",
        mvpReference: "MVP-001",
        generatedFiles: [
          {
            path: "src/pages/TodoPage.tsx",
            architectFileId: "src/pages/TodoPage.tsx",
            module: "Module-001",
            implementsFeatures: ["Feature-001"],
            type: "page",
            language: "tsx",
            content: "export function TodoPage() { return <div>Todo Page</div>; }"
          }
        ],
        generationSummary: {
          filesGenerated: 1,
          filesSkipped: [],
          conflicts: [],
          warnings: [],
          status: "Success"
        }
      }));
    }
    if (sysPrompt.includes('You are the Tester Agent')) {
      return mockWrap(JSON.stringify({
        contextType: "canonical",
        projectName: "Todo App",
        mvpReference: "MVP-001",
        generatedTestFiles: [
          {
            id: "Test-001",
            path: "src/__tests__/TodoPage.test.tsx",
            targetFile: "src/pages/TodoPage.tsx",
            coversFeature: "Feature-001",
            type: "unit",
            language: "tsx",
            content: "describe('TodoPage', () => {})"
          }
        ],
        testReport: {
          summary: {
            totalTests: 1,
            passed: 1,
            failed: 0,
            skipped: 0,
            coverage: "100%",
            coveredFeatures: ["Feature-001"],
            missingFeatures: []
          },
          defects: [],
          warnings: [],
          status: "Success"
        }
      }));
    }
    if (sysPrompt.includes('You are the Debugger Agent')) {
      return mockWrap(JSON.stringify({
        contextType: "canonical",
        projectName: "Todo App",
        mvpReference: "MVP-001",
        debugReport: {
          issues: [],
          summary: {
            issuesDetected: 0,
            issuesResolved: 0,
            remainingIssues: 0
          },
          warnings: [],
          status: "Success"
        }
      }));
    }
    if (sysPrompt.includes('You are the Security Agent')) {
      return mockWrap(JSON.stringify({
        contextType: "canonical",
        projectName: "Todo App",
        mvpReference: "MVP-001",
        securityReport: {
          issues: [],
          summary: {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            informational: 0
          },
          warnings: [],
          status: "Success"
        }
      }));
    }
    if (sysPrompt.includes('Reviewer agent in a')) {
      return mockWrap(JSON.stringify({
        qualityScore: 95,
        annotations: []
      }));
    }
    throw new Error(`UAT Mock Inference: unknown agent prompt matching: ${sysPrompt.slice(0, 100)}`);
  }

function combineAbortSignals(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const sig of signals) {
    if (!sig) continue;
    if (sig.aborted) { controller.abort(sig.reason); return controller.signal; }
    sig.addEventListener('abort', () => controller.abort(sig.reason), { once: true });
  }
  return controller.signal;
}

  const baseConfig = options.configOverride?.provider && options.fetchImpl
    ? {
        provider: options.configOverride.provider,
        ollamaHost: options.configOverride.ollamaHost || 'http://127.0.0.1:11434',
        ollamaModel: options.configOverride.ollamaModel || 'llama3:8b-instruct',
        openaiApiKey: options.configOverride.openaiApiKey || '',
        openaiModel: options.configOverride.openaiModel || 'gpt-4o-mini',
        anthropicApiKey: options.configOverride.anthropicApiKey || '',
        anthropicModel: options.configOverride.anthropicModel || 'claude-3-5-sonnet-20241022',
      }
    : { ...(await getLLMConfig()), ...(options.configOverride || {}) };

  const config = baseConfig;
  const temp = options.temperature ?? 0.2;
  const hasTools = Array.isArray(options.tools) && options.tools.length > 0;
  // Never force strict JSON output mode alongside tool definitions (Ollama conflicts format:'json' + tools)
  const isJson = options.format === 'json' && !hasTools;

  // Combine client abort signal with timeout signal (400 hours / 1,440,000s)
  const startTime = Date.now();
  if (options.model) {
    if (config.provider === 'ollama') config.ollamaModel = options.model;
    else if (config.provider === 'openai') config.openaiModel = options.model;
    else if (config.provider === 'anthropic') config.anthropicModel = options.model;
  }

  const effectiveTimeout = options.timeoutMs ? Math.max(options.timeoutMs, 600_000) : 1440000000; // Minimum 10 minutes timeout for inference operations
  const timeoutSignal = typeof AbortSignal.timeout === 'function'
    ? AbortSignal.timeout(effectiveTimeout)
    : (() => { const c = new AbortController(); setTimeout(() => c.abort(), effectiveTimeout); return c.signal; })();
  const combinedSignal: AbortSignal = options.signal ? combineAbortSignals(options.signal, timeoutSignal) : timeoutSignal;

  let result = '';
  let toolCalls: ToolCall[] = [];
  let finishReason: string | undefined;
  const ollamaFetchFn = options.fetchImpl || undiciFetch;
  const remoteFetchFn = options.fetchImpl || fetch;

  if (config.provider === 'ollama') {
    const host = config.ollamaHost;
    if (!options.fetchImpl) {
      const isAlive = await checkOllamaConnection(host);
      if (!isAlive) {
        throw new Error(`Ollama is not running at ${host}. Please start Ollama before executing.`);
      }
    }

    const formattedMessages = formatMessagesForOllama(messages);
    const payload: any = {
      model: config.ollamaModel,
      messages: formattedMessages,
      keep_alive: -1, // Force Ollama to keep model loaded in VRAM permanently during pipeline run!
      options: {
        temperature: temp,
        num_ctx: (() => {
          const promptChars =
            messages.reduce(
              (sum, m) =>
                sum +
                (m.content || '').length +
                (m.tool_calls ? JSON.stringify(m.tool_calls).length : 0),
              0
            ) + (hasTools ? JSON.stringify(options.tools).length : 0);
          const needed = Math.ceil(promptChars / 4) + (options.maxTokens || 4096) + 512;
          return Math.min(131072, Math.max(32768, needed));
        })(),
      },
      stream: true,
    };

    if (options.maxTokens) {
      payload.options.num_predict = options.maxTokens;
    }

    if (hasTools) {
      payload.tools = options.tools;
    } else if (isJson) {
      payload.format = 'json';
    }

    const isSocketError = (e: any) => {
      if (combinedSignal?.aborted) return false;
      const msg = String(e?.message || '').toLowerCase();
      const code = String(e?.code ?? '').toLowerCase();
      const causeMsg = String(e?.cause?.message || '').toLowerCase();
      return (
        msg.includes('terminated') ||
        msg.includes('other side closed') ||
        msg.includes('und_err_socket') ||
        msg.includes('fetch failed') ||
        msg.includes('socket hung up') ||
        msg.includes('econnreset') ||
        causeMsg.includes('terminated') ||
        causeMsg.includes('other side closed') ||
        causeMsg.includes('und_err_socket') ||
        code === 'und_err_socket' ||
        code === 'econnreset'
      );
    };

    let attempt = 0;
    const maxAttempts = 3;

    while (attempt < maxAttempts) {
      attempt++;
      try {
        let res: any;
        try {
          res = await ollamaFetchFn(`${host}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
            body: JSON.stringify(payload),
            signal: combinedSignal,
            ...(!options.fetchImpl && longTimeoutDispatcher ? { dispatcher: longTimeoutDispatcher } : {} as any),
          });
        } catch (fetchErr: any) {
          if (attempt < maxAttempts && isSocketError(fetchErr)) {
            console.warn(`[Inference] Transient fetch error on attempt ${attempt}/${maxAttempts}, retrying in 2s...`);
            await new Promise(r => setTimeout(r, 2000));
            continue;
          }
          throw fetchErr;
        }

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Ollama inference failed: ${res.statusText} - ${errText}`);
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = '';
        const accumulatedToolCalls: ToolCall[] = [];

        const processOllamaLine = (parsed: any) => {
          const content = parsed.message?.content || '';
          if (content) {
            accumulatedContent += content;
            if (options.onChunk) {
              options.onChunk(content);
            }
          }
          if (Array.isArray(parsed.message?.tool_calls) && parsed.message.tool_calls.length > 0) {
            accumulatedToolCalls.push(
              ...normalizeProviderToolCalls(parsed.message.tool_calls, accumulatedToolCalls.length)
            );
          }
          if (parsed.done_reason) {
            finishReason = parsed.done_reason;
          }
        };

        if (reader) {
          try {
            let buffer = '';
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              // Save the last line if it is incomplete
              buffer = lines.pop() || '';
              
              for (const line of lines) {
                if (!line.trim()) continue;
                try {
                  processOllamaLine(JSON.parse(line));
                } catch (e) {
                  // Ignore partial JSON errors
                }
              }
            }
            // Parse any remaining buffer content
            if (buffer.trim()) {
              try {
                processOllamaLine(JSON.parse(buffer));
              } catch (e) {}
            }
          } finally {
            reader.releaseLock();
          }
          result = accumulatedContent;
          toolCalls = accumulatedToolCalls;
        } else {
          const data = (await res.json()) as any;
          result = data.message?.content || '';
          if (Array.isArray(data.message?.tool_calls)) {
            toolCalls = normalizeProviderToolCalls(data.message.tool_calls, 0);
          }
          finishReason = data.done_reason;
        }

        // Successfully received and parsed full response
        break;
      } catch (streamErr: any) {
        if (combinedSignal?.aborted) {
          throw streamErr;
        }
        if (attempt < maxAttempts && isSocketError(streamErr)) {
          console.warn(`[Inference] Mid-stream socket drop (${streamErr.message}) on attempt ${attempt}/${maxAttempts}. Reconnecting in 3s...`);
          await new Promise(r => setTimeout(r, 3000));
          continue;
        }
        throw streamErr;
      }
    }
  } else if (config.provider === 'openai') {
    if (!config.openaiApiKey) {
      throw new Error('OpenAI API Key is not configured.');
    }

    const payload: any = {
      model: config.openaiModel,
      messages: formatMessagesForOpenAI(messages),
      temperature: temp,
    };

    if (options.maxTokens) {
      payload.max_tokens = options.maxTokens;
    }

    if (hasTools) {
      payload.tools = options.tools;
    } else if (isJson) {
      payload.response_format = { type: 'json_object' };
    }

    const res = await remoteFetchFn('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.openaiApiKey}`,
      },
      body: JSON.stringify(payload),
      signal: combinedSignal,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI API failed: ${res.statusText} - ${errText}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    const msg = choice?.message || {};
    result = typeof msg.content === 'string' ? msg.content : '';
    if (options.onChunk && result) {
      options.onChunk(result);
    }
    if (Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
      toolCalls = normalizeProviderToolCalls(msg.tool_calls, 0);
    }
    finishReason = choice?.finish_reason;
  } else if (config.provider === 'anthropic') {
    if (!config.anthropicApiKey) {
      throw new Error('Anthropic API Key is not configured.');
    }

    // Split system prompt from messages for Anthropic
    const systemMessage = messages.find((m) => m.role === 'system');
    const anthropicMessages = formatMessagesForAnthropic(messages);

    const payload: any = {
      model: config.anthropicModel,
      messages: anthropicMessages,
      max_tokens: options.maxTokens ?? 4096,
      temperature: temp,
    };

    if (systemMessage) {
      payload.system = systemMessage.content;
    }

    if (hasTools) {
      payload.tools = convertToolsForAnthropic(options.tools!);
    }

    const res = await remoteFetchFn('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
      signal: combinedSignal,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic API failed: ${res.statusText} - ${errText}`);
    }

    const data = await res.json();
    const blocks = Array.isArray(data.content) ? data.content : [];
    const textParts: string[] = [];
    const toolBlocks: any[] = [];
    for (const block of blocks) {
      if (block?.type === 'text' && typeof block.text === 'string') {
        textParts.push(block.text);
      } else if (block?.type === 'tool_use') {
        toolBlocks.push({
          id: block.id,
          function: {
            name: block.name,
            arguments: block.input || {},
          },
        });
      }
    }
    result = textParts.join('');
    if (options.onChunk && result) {
      options.onChunk(result);
    }
    if (toolBlocks.length > 0) {
      toolCalls = normalizeProviderToolCalls(toolBlocks, 0);
    }
    finishReason = data.stop_reason;
  } else {
    throw new Error(`Unsupported LLM provider: ${config.provider}`);
  }

  const durationMs = Date.now() - startTime;
  const resolvedModel = config.provider === 'ollama' ? config.ollamaModel : (config.provider === 'openai' ? config.openaiModel : config.anthropicModel);
  console.log('[InferenceTrace]', JSON.stringify({
    provider: config.provider,
    requestedModel: options.model || resolvedModel,
    resolvedModel,
    durationMs,
    outputLength: result.length,
    toolCallCount: toolCalls.length,
    timestamp: new Date().toISOString(),
  }));

  return {
    content: result,
    toolCalls,
    provider: config.provider,
    model: resolvedModel,
    durationMs,
    finishReason,
  };
}

let ollamaHeartbeatTimer: NodeJS.Timeout | null = null;

export function startOllamaKeepAlive(host: string = 'http://127.0.0.1:11434') {
  if (ollamaHeartbeatTimer) return;

  // Active Keep-Alive Heartbeat Daemon: Pings Ollama every 10s to keep TCP socket & process active
  ollamaHeartbeatTimer = setInterval(async () => {
    try {
      await undiciFetch(`${host}/api/version`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
        ...(longTimeoutDispatcher ? { dispatcher: longTimeoutDispatcher } : {} as any),
      });
    } catch (e) {
      // Ignore transient ping errors
    }
  }, 10000);
  if (typeof (ollamaHeartbeatTimer as any).unref === 'function') {
    (ollamaHeartbeatTimer as any).unref();
  }
}

export function stopOllamaKeepAlive() {
  if (ollamaHeartbeatTimer) {
    clearInterval(ollamaHeartbeatTimer);
    ollamaHeartbeatTimer = null;
  }
}

