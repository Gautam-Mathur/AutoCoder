import { prisma } from '../db';

// Ensure localhost bypasses any system proxies so Ollama connections aren't intercepted
if (!process.env.no_proxy) {
  process.env.no_proxy = 'localhost,127.0.0.1,::1';
} else if (!process.env.no_proxy.includes('localhost')) {
  process.env.no_proxy += ',localhost,127.0.0.1,::1';
}

const undici = typeof window === 'undefined' ? require('undici') : null;
const undiciAgent = undici ? undici.Agent : null;
const undiciFetch = undici ? undici.fetch : fetch;

// Reusable Undici Agent with a 30-minute idle socket timeout (cached globally to survive dev server hot-reloads)
const globalForAgent = global as unknown as { ollamaAgent: any };
const longTimeoutDispatcher = globalForAgent.ollamaAgent ?? (undiciAgent ? new undiciAgent({
  headersTimeout: 1800000,   // 30 minutes in ms
  bodyTimeout: 1800000,      // 30 minutes in ms
  keepAliveTimeout: 1800000, // 30 minutes in ms
}) : null);
if (process.env.NODE_ENV !== 'production' && typeof window === 'undefined') {
  globalForAgent.ollamaAgent = longTimeoutDispatcher;
}

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface InferenceOptions {
  temperature?: number;
  format?: 'json' | 'text';
  maxTokens?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  onChunk?: (text: string) => void;
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
    const hostsToTry = [config.ollamaHost];
    if (config.ollamaHost.includes('localhost')) {
      hostsToTry.push(config.ollamaHost.replace('localhost', '127.0.0.1'));
    }

    for (const h of hostsToTry) {
      try {
        const res = await fetch(`${h}/api/tags`, {
          method: 'GET',
          cache: 'no-store',
          signal: AbortSignal.timeout(2000),
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
  const hostsToTry = [host];
  if (host.includes('localhost')) {
    hostsToTry.push(host.replace('localhost', '127.0.0.1'));
  }

  for (const h of hostsToTry) {
    try {
      const res = await fetch(`${h}/api/tags`, {
        method: 'GET',
        cache: 'no-store',
        signal: AbortSignal.timeout(3000), // 3 second timeout
      });
      if (res.ok) return true;
    } catch (e) {
      // Continue to next host attempt
    }
  }
  return false;
}

export async function runInference(
  messages: Message[],
  options: InferenceOptions = {}
): Promise<string> {
  if (process.env.MOCK_INFERENCE === 'true') {
    const sysPrompt = messages.find(m => m.role === 'system')?.content || '';
    if (sysPrompt.includes('You are the Queen Agent')) {
      return JSON.stringify({
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
      });
    }
    if (sysPrompt.includes('You are the Planner Agent')) {
      return JSON.stringify({
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
      });
    }
    if (sysPrompt.includes('You are the Architect Agent')) {
      return JSON.stringify({
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
      });
    }
    if (sysPrompt.includes('You are the System Agent')) {
      return JSON.stringify({
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
      });
    }
    if (sysPrompt.includes('You are the Designer Agent')) {
      return JSON.stringify({
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
      });
    }
    if (sysPrompt.includes('Blueprinter in a strict')) {
      return JSON.stringify({
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
      });
    }
    if (sysPrompt.includes('You are the Coder Agent')) {
      return JSON.stringify({
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
      });
    }
    if (sysPrompt.includes('You are the Tester Agent')) {
      return JSON.stringify({
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
      });
    }
    if (sysPrompt.includes('You are the Debugger Agent')) {
      return JSON.stringify({
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
      });
    }
    if (sysPrompt.includes('You are the Security Agent')) {
      return JSON.stringify({
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
      });
    }
    if (sysPrompt.includes('Reviewer agent in a')) {
      return JSON.stringify({
        qualityScore: 95,
        annotations: []
      });
    }
    throw new Error(`UAT Mock Inference: unknown agent prompt matching: ${sysPrompt.slice(0, 100)}`);
  }

  const config = await getLLMConfig();
  const temp = options.temperature ?? 0.2;
  const isJson = options.format === 'json';

  // Combine client abort signal with timeout signal (default fallback timeout 180s)
  const effectiveTimeout = options.timeoutMs || 180000;
  const timeoutSignal = AbortSignal.timeout(effectiveTimeout);
  const combinedSignal: AbortSignal = options.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal;

  if (config.provider === 'ollama') {
    const host = config.ollamaHost;
    const isAlive = await checkOllamaConnection(host);
    if (!isAlive) {
      throw new Error(`Ollama is not running at ${host}. Please start Ollama before executing.`);
    }

    const payload: any = {
      model: config.ollamaModel,
      messages: messages,
      options: {
        temperature: temp,
        num_ctx: 32768, // Request 32K context window to fit large specs and file histories
      },
      stream: true,
    };

    if (options.maxTokens) {
      payload.options.num_predict = options.maxTokens;
    }

    if (isJson) {
      payload.format = 'json';
    }

    const res = await undiciFetch(`${host}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify(payload),
      signal: combinedSignal,
      // Pass the custom dispatcher with extended timeouts using type-casting
      ...(longTimeoutDispatcher ? { dispatcher: longTimeoutDispatcher } : {} as any),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Ollama inference failed: ${res.statusText} - ${errText}`);
    }

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let accumulatedContent = '';

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
              const parsed = JSON.parse(line);
              const content = parsed.message?.content || '';
              accumulatedContent += content;
              if (options.onChunk && content) {
                options.onChunk(content);
              }
            } catch (e) {
              // Ignore partial JSON errors
            }
          }
        }
        // Parse any remaining buffer content
        if (buffer.trim()) {
          try {
            const parsed = JSON.parse(buffer);
            const content = parsed.message?.content || '';
            accumulatedContent += content;
            if (options.onChunk && content) {
              options.onChunk(content);
            }
          } catch (e) {}
        }
      } finally {
        reader.releaseLock();
      }
    } else {
      const data = (await res.json()) as any;
      return data.message.content;
    }
    return accumulatedContent;
  } else if (config.provider === 'openai') {
    if (!config.openaiApiKey) {
      throw new Error('OpenAI API Key is not configured.');
    }

    const payload: any = {
      model: config.openaiModel,
      messages: messages,
      temperature: temp,
    };

    if (options.maxTokens) {
      payload.max_tokens = options.maxTokens;
    }

    if (isJson) {
      payload.response_format = { type: 'json_object' };
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
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
    return data.choices[0].message.content;
  } else if (config.provider === 'anthropic') {
    if (!config.anthropicApiKey) {
      throw new Error('Anthropic API Key is not configured.');
    }

    // Split system prompt from messages for Anthropic
    const systemMessage = messages.find((m) => m.role === 'system');
    const userMessages = messages.filter((m) => m.role !== 'system');

    const payload: any = {
      model: config.anthropicModel,
      messages: userMessages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
      max_tokens: options.maxTokens ?? 4096,
      temperature: temp,
    };

    if (systemMessage) {
      payload.system = systemMessage.content;
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
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
    return data.content[0].text;
  } else {
    throw new Error(`Unsupported LLM provider: ${config.provider}`);
  }
}
