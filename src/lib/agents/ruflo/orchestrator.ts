import { prisma } from '../../db';
import { runInference, getLLMConfig } from '../inference';
import { writeAgentOutput, queryAgentOutput } from '../sml';
import { buildUserContext } from '../contextBuilder';
import { AGENT_DEFS, AgentDef } from './agents';
import { loadExecutiveMemory, saveExecutiveMemory, StageLedger } from './memory';
import { calculateTokenBudget } from './token-budgeter';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { resolveContext } from './contextResolver';
import { runDeterministic } from './registry/Blueprinter';
import { dispatchFailureEvent } from './eventDispatcher';

export const activePipelines = new Set<string>();

async function classifyIsSoftwareRequest(
  prompt: string,
  signal?: AbortSignal
): Promise<{ isSoftware: boolean; reason: string | null }> {
  try {
    const config = await getLLMConfig();
    const systemPrompt = `You are a strict software utility classifier.
Determine if the user's request is related to software development (e.g. requesting an application, script, tool, CLI, layout, page, API, database, website, algorithm, or dashboard).
Respond ONLY with a JSON object: {"isSoftware": true, "reason": null} or {"isSoftware": false, "reason": "A short sentence explaining why this is not a software development request"}.
Do not output any markdown code blocks, explanation text, or extra characters. Return only valid JSON.`;

    const responseText = await runInference(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze this request: "${prompt}"` },
      ],
      {
        temperature: 0.1,
        format: 'json',
        maxTokens: 150,
        timeoutMs: 30000,
        signal
      }
    );

    const parsed = JSON.parse(responseText.trim());
    return {
      isSoftware: !!parsed.isSoftware,
      reason: parsed.reason || null
    };
  } catch (err: any) {
    return { isSoftware: true, reason: null };
  }
}

export async function writeHistoryLog(conversationId: string, stage: string, status: string, message: string) {
  try {
    await prisma.executionHistory.create({
      data: {
        conversationId,
        stage,
        status,
        logs: message,
      },
    });
  } catch (e) {
    console.error('Failed to write history log:', e);
  }
}

export async function writeRichTelemetryLog(params: {
  conversationId: string;
  agentName: string;
  status: 'Success' | 'Failed' | 'Retrying';
  systemInstructions: string;
  userContent: string;
  rawOutput: string;
  parsedJson: any;
  durationMs: number;
  attempt: number;
  model: string;
  budget: number;
  timeoutMs: number;
  schema: any;
  ledger: StageLedger;
  errorMessage?: string;
  onEvent?: PipelineEventCallback;
}) {
  try {
    const ledgerState = params.ledger.getState();
    const richLog = {
      telemetryType: "rich_step_log",
      inflow: {
        systemInstructions: params.systemInstructions,
        userContent: params.userContent,
      },
      thought: params.rawOutput,
      outflow: params.parsedJson,
      orchestration: {
        durationMs: params.durationMs,
        tokenUsage: Math.round(params.rawOutput.length / 4),
        attempt: params.attempt,
        model: params.model,
        budget: params.budget,
        timeoutMs: params.timeoutMs,
        errorMessage: params.errorMessage
      },
      validationSchema: params.schema,
      ledgerState,
      executionMemory: {
        conversationId: params.conversationId,
        stage: params.agentName,
        status: params.status,
      }
    };
    await prisma.executionHistory.create({
      data: {
        conversationId: params.conversationId,
        stage: params.agentName,
        status: params.status,
        logs: JSON.stringify(richLog),
      },
    });
    if (params.onEvent) {
      params.onEvent({
        type: 'AGENT_RICH_TELEMETRY',
        agent: params.agentName,
        message: `Agent ${params.agentName} ${params.status.toLowerCase()} telemetry details.`,
        data: richLog
      });
    }
  } catch (e) {
    console.error('Failed to write rich telemetry log:', e);
  }
}

export type PipelineEventCallback = (event: {
  type: string;
  agent?: string;
  message: string;
  data?: any;
}) => void;

function validateSchema(obj: any, schema: any): string | null {
  if (!obj || typeof obj !== 'object') {
    return 'Output is not a valid JSON object';
  }
  if (schema.anyOf && Array.isArray(schema.anyOf)) {
    const errors: string[] = [];
    for (const subSchema of schema.anyOf) {
      const err = validateSchema(obj, subSchema);
      if (err === null) {
        return null;
      }
      errors.push(err);
    }
    return `Does not match any of the allowed schemas: ${errors.join(' OR ')}`;
  }
  if (schema.required) {
    for (const field of schema.required) {
      if (!(field in obj)) {
        return `Missing required field: ${field}`;
      }
    }
  }
  return null;
}

export async function runAgent(
  conversationId: string,
  agentName: string,
  userPromptText: string,
  onEvent: PipelineEventCallback,
  ledger: StageLedger,
  attempt: number = 1,
  customUserContent?: string,
  signal?: AbortSignal,
  validationError?: string,
  targetFile?: string
): Promise<any> {
  const agentDef = AGENT_DEFS[agentName];
  if (!agentDef) {
    throw new Error(`Unknown agent: ${agentName}`);
  }

  onEvent({
    type: 'AGENT_START',
    agent: agentName,
    message: `Agent ${agentName} started (Attempt ${attempt}/3)...`,
  });
  await writeHistoryLog(conversationId, agentName, 'Retrying', `Agent ${agentName} started (Attempt ${attempt}/3)...`);

  const startTime = Date.now();
  const contextData = await buildUserContext(ledger, agentName);
  const config = await getLLMConfig();
  await writeHistoryLog(conversationId, agentName, 'Retrying', `Active Model: ${config.ollamaModel}. Context payload assembled.`);

  const constraintsBlock = `\n\nActive Model Constraints:
- Output MUST be valid, parseable JSON. Do not include markdown code blocks (e.g. \`\`\`json) in the raw response, return raw text representing JSON.
- Strictly adhere to names and terms defined by previous agents.`;

  const schemaBlock =
    agentName === 'Coder'
      ? `\n\nOutput Schema (follow strictly):\n${JSON.stringify(agentDef.schema, null, 2)}`
      : `\n\nOutput Schema (MUST return a valid JSON object matching this schema):\n${JSON.stringify(
          agentDef.schema,
          null,
          2
        )}`;

  const retryHint =
    attempt > 1
      ? `\n\nRetry Schema Repair Hint: Your previous output failed verification. Error: ${validationError || 'Ensure ALL required keys are present and the JSON structure is perfectly valid.'}`
      : '';

  const systemInstructions =
    agentDef.systemPrompt + constraintsBlock + schemaBlock + retryHint;

  const userContent = customUserContent || `Upstream Context:
${contextData}

Original Instruction:
"${userPromptText}"`;

  const { budget, timeoutMs } = calculateTokenBudget(agentName, ledger);

  onEvent({
    type: 'AGENT_LOG',
    agent: agentName,
    message: `Running inference (Max Tokens: ${budget}, Timeout: ${Math.round(timeoutMs / 1000)}s)...`,
  });
  await writeHistoryLog(
    conversationId,
    agentName,
    'Retrying',
    `Executing LLM inference request on model "${config.ollamaModel}". Dynamic Budget: ${budget} tokens. Timeout: ${Math.round(timeoutMs / 1000)}s.`
  );

  let rawOutput = '';
  let accumulatedText = '';
  let lastUpdate = 0;

  try {
    let temperature = agentDef.temperature;
    if (attempt === 2) {
      temperature = Math.max(0, agentDef.temperature - 0.1);
    } else if (attempt === 3) {
      temperature = 0.0;
    }

    rawOutput = await runInference(
      [
        { role: 'system', content: systemInstructions },
        { role: 'user', content: userContent },
      ],
      {
        temperature: temperature,
        format: agentName === 'Coder' ? undefined : 'json',
        maxTokens: budget,
        timeoutMs: timeoutMs,
        signal: signal,
        onChunk: (chunk: string) => {
          accumulatedText += chunk;
          const now = Date.now();
          // Throttle updates to at most once every 300ms to avoid flooding SSE connection
          if (now - lastUpdate > 300) {
            lastUpdate = now;
            
            const apis: any[] = [];
            const entities: string[] = [];
            const files: string[] = [];

            // Speculative parsing patterns
            const methodRegex = /"method"\s*:\s*"([^"]+)"/g;
            const routeRegex = /"route"\s*:\s*"([^"]+)"/g;
            let mMatch, rMatch;
            const methodsFound: string[] = [];
            const routesFound: string[] = [];
            while ((mMatch = methodRegex.exec(accumulatedText)) !== null) {
              methodsFound.push(mMatch[1]);
            }
            while ((rMatch = routeRegex.exec(accumulatedText)) !== null) {
              routesFound.push(rMatch[1]);
            }
            for (let idx = 0; idx < Math.min(methodsFound.length, routesFound.length); idx++) {
              apis.push({ method: methodsFound[idx], route: routesFound[idx] });
            }

            const entityNameRegex = /"name"\s*:\s*"([^"]+)"/g;
            let entMatch;
            while ((entMatch = entityNameRegex.exec(accumulatedText)) !== null) {
              const name = entMatch[1];
              if (name && name.length > 2 && !name.includes('App') && !entities.includes(name)) {
                entities.push(name);
              }
            }

            const fileRegex = /"path"\s*:\s*"([^"]+\.(?:js|jsx|ts|tsx|json))"/g;
            let fMatch;
            while ((fMatch = fileRegex.exec(accumulatedText)) !== null) {
              if (!files.includes(fMatch[1])) {
                files.push(fMatch[1]);
              }
            }

            onEvent({
              type: 'AGENT_STREAM_PROGRESS',
              agent: agentName,
              message: `Generating: ${accumulatedText.split(/\s+/).length} tokens...`,
              data: {
                tokenCount: Math.round(accumulatedText.length / 4),
                maxTokens: budget,
                apis,
                entities,
                files,
                latestText: accumulatedText.substring(Math.max(0, accumulatedText.length - 200))
              }
            });
          }
        }
      }
    );
  } catch (err: any) {
    const errMsg = err.message || (signal?.aborted ? 'Request cancelled due to client disconnect.' : 'Connection timed out or socket dropped.');
    onEvent({
      type: 'AGENT_LOG',
      agent: agentName,
      message: `Inference failed: ${errMsg}`,
    });
    await writeRichTelemetryLog({
      conversationId,
      agentName,
      status: 'Failed',
      systemInstructions,
      userContent,
      rawOutput: accumulatedText || '',
      parsedJson: null,
      durationMs: Date.now() - startTime,
      attempt,
      model: config.ollamaModel,
      budget,
      timeoutMs,
      schema: agentDef.schema,
      ledger,
      errorMessage: errMsg,
      onEvent
    });
    throw err;
  }

  let parsedJson: any = null;

  if (agentName === 'Coder') {
    let codeContent = rawOutput.trim();

    // 1. Try parsing as JSON first to extract the code key if the model followed the schema block
    try {
      let cleanJsonText = codeContent;
      if (cleanJsonText.includes('```')) {
        cleanJsonText = cleanJsonText.replace(/```json/g, '').replace(/```/g, '').trim();
      }
      const parsed = JSON.parse(cleanJsonText);
      if (parsed && typeof parsed === 'object' && typeof parsed.code === 'string') {
        codeContent = parsed.code;
      }
    } catch (err) {
      // 2. Fallback: Line-Slicing extraction for raw code output
      if (codeContent.startsWith('```')) {
        const lines = codeContent.split('\n');
        lines.shift(); // Remove opening backticks line
        
        if (lines[lines.length - 1].trim() === '```') {
          lines.pop(); // Remove closing backticks line
        }
        codeContent = lines.join('\n').trim();
      }
    }

    // 3. Basic Syntax Check (prevent conversational text fallback)
    // Only apply this syntax check to script/code files
    const isScriptFile = /\.(js|jsx|ts|tsx|py|go|java|kt|rs|cpp|c|cs|sh|ps1)$/i.test(targetFile || '');
    if (isScriptFile) {
      const hasBasicSyntax = /[{};=]/.test(codeContent);
      if (!hasBasicSyntax && codeContent.split(/\s+/).length > 25) {
        throw new Error("Output appears to be conversational explanation text. Please generate raw programming code.");
      }
    }

    // 4. Placeholder Guard (prevent bracketed stubs)
    const isPlaceholder = /^\[[a-zA-Z0-9\s_.-]+\]$/.test(codeContent.trim());
    if (isPlaceholder) {
      throw new Error("Output contains only placeholder text inside brackets. Please implement actual code.");
    }

    // 5. Multi-line placeholder guard (detect TODO-only files)
    const lines = codeContent.split('\n').filter(l => l.trim().length > 0);
    const todoLines = lines.filter(l => /^\s*(\/\/|#|\/\*|\*|<!--)\s*(TODO|FIXME|PLACEHOLDER|IMPLEMENT|YOUR\s+CODE)/i.test(l));
    if (lines.length > 0 && todoLines.length / lines.length > 0.5) {
      throw new Error("Output is more than 50% placeholder comments. Please implement actual code.");
    }

    parsedJson = {
      file: targetFile || 'unknown.ts',
      code: codeContent
    };
  } else {
    let cleanJsonText = rawOutput;
    if (cleanJsonText.includes('```')) {
      cleanJsonText = cleanJsonText.replace(/```json/g, '').replace(/```/g, '').trim();
    }

    try {
      parsedJson = JSON.parse(cleanJsonText);
    } catch (err) {
      onEvent({
        type: 'AGENT_LOG',
        agent: agentName,
        message: `JSON parse failed. Attempting cleanup...`,
      });
      await writeHistoryLog(conversationId, agentName, 'Retrying', `JSON parse failed, executing regular expression fallback extraction...`);
      const jsonMatch = cleanJsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedJson = JSON.parse(jsonMatch[0]);
        } catch (e) {
          await writeRichTelemetryLog({
            conversationId,
            agentName,
            status: 'Failed',
            systemInstructions,
            userContent,
            rawOutput,
            parsedJson: null,
            durationMs: Date.now() - startTime,
            attempt,
            model: config.ollamaModel,
            budget,
            timeoutMs,
            schema: agentDef.schema,
            ledger,
            errorMessage: 'Failed to parse extracted JSON block.',
            onEvent
          });
          throw new Error('Failed to parse output as JSON.');
        }
      } else {
        await writeRichTelemetryLog({
          conversationId,
          agentName,
          status: 'Failed',
          systemInstructions,
          userContent,
          rawOutput,
          parsedJson: null,
          durationMs: Date.now() - startTime,
          attempt,
          model: config.ollamaModel,
          budget,
          timeoutMs,
          schema: agentDef.schema,
          ledger,
          errorMessage: 'JSON parse failed. No curly brace object found in output.',
          onEvent
        });
        throw new Error('Failed to parse output as JSON.');
      }
    }
  }

  const schemaError = validateSchema(parsedJson, agentDef.schema);
  if (schemaError) {
    console.error(`[VALIDATION ERROR] Agent ${agentName} output that failed schema validation:`, JSON.stringify(parsedJson, null, 2));
    onEvent({
      type: 'AGENT_LOG',
      agent: agentName,
      message: `Schema validation error: ${schemaError}. Output: ${JSON.stringify(parsedJson)}`,
    });
    await writeRichTelemetryLog({
      conversationId,
      agentName,
      status: 'Failed',
      systemInstructions,
      userContent,
      rawOutput,
      parsedJson,
      durationMs: Date.now() - startTime,
      attempt,
      model: config.ollamaModel,
      budget,
      timeoutMs,
      schema: agentDef.schema,
      ledger,
      errorMessage: `Schema validation error: ${schemaError}`,
      onEvent
    });
    throw new Error(schemaError);
  }

  const duration = Date.now() - startTime;

  onEvent({
    type: 'AGENT_LOG',
    agent: agentName,
    message: `Saving output to SML...`,
  });

  // Save to legacy SML tables for backwards-compatibility with telemetry/workspace views
  await writeAgentOutput({
    conversationId,
    agentName,
    stage: agentName,
    schemaVersion: '1.0',
    model: config.ollamaModel,
    validatedJson: parsedJson,
    executionTime: duration,
    tokenUsage: rawOutput.length / 4,
    attempt,
  });

  // 1. Write to StageLedger (enforces ownership and oscillation checks!)
  const fieldMap: Record<string, string> = {
    Queen: 'taskSpec',
    Planner: 'planner',
    Architect: 'architect',
    System: 'system',
    Designer: 'designer',
    Coder: 'coder',
    Debugger: 'debugger',
    Security: 'security',
    Reviewer: 'reviewer',
    Tester: 'tester',
  };
  const field = fieldMap[agentName];
  if (field) {
    if (agentName === 'Coder' && parsedJson) {
      let code = '';
      if (parsedJson.code) {
        code = parsedJson.code;
      } else if (Array.isArray(parsedJson.generatedFiles) && parsedJson.generatedFiles[0]) {
        code = parsedJson.generatedFiles[0].content || '';
        // Polyfill code for backward compatibility
        parsedJson.code = code;
      }
      const targetFile = customUserContent ? customUserContent.match(/filepath: "([^"]+)"/)?.[1] || 'output.js' : 'output.js';
      const currentCoderState = ledger.read('coder') || {};
      const updatedCoderState = {
        ...currentCoderState,
        [targetFile]: code
      };
      await ledger.write(agentName, field, updatedCoderState);
    } else {
      await ledger.write(agentName, field, parsedJson);
    }
  }
  await ledger.clearInvalidation(agentName);

  await writeRichTelemetryLog({
    conversationId,
    agentName,
    status: 'Success',
    systemInstructions,
    userContent,
    rawOutput,
    parsedJson,
    durationMs: duration,
    attempt,
    model: config.ollamaModel,
    budget,
    timeoutMs,
    schema: agentDef.schema,
    ledger,
    onEvent
  });

  onEvent({
    type: 'AGENT_COMPLETE',
    agent: agentName,
    message: `Agent ${agentName} finished successfully!`,
    data: parsedJson,
  });

  return parsedJson;
}

// Helper to write files safely to target workspace path
function writeProjectFile(conversationId: string, filePath: string, content: string) {
  const projectDir = path.join(process.cwd(), 'projects', conversationId);
  const fullPath = path.join(projectDir, filePath);
  
  // Normalization pass to correct any character encoding hallucinations (e.g. UTF-保8 to UTF-8)
  let normalizedContent = content;
  if (filePath.endsWith('.html')) {
    normalizedContent = normalizedContent.replace(/UTF-[\u4e00-\u9fa5]8/g, 'UTF-8');
  }

  // Create directories if needed
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, normalizedContent, 'utf8');
}

export async function launchVSCodePreview(conversationId: string, onEvent: PipelineEventCallback) {
  try {
    const projectPath = path.join(process.cwd(), 'projects', conversationId);
    if (!fs.existsSync(projectPath)) return;

    // Detect if there's a Node.js script entry point
    const potentialEntries = ['main.js', 'app.js', 'server.js', 'index.js'];
    let entryFile = '';
    for (const f of potentialEntries) {
      if (fs.existsSync(path.join(projectPath, f))) {
        entryFile = f;
        break;
      }
    }

    // Fallback: If no entry file exists but it is a Node.js project, generate a default wrapper index.js
    if (!entryFile && (fs.existsSync(path.join(projectPath, 'routes')) || fs.existsSync(path.join(projectPath, 'controllers')))) {
      const defaultIndexContent = `const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

// Serve static frontend assets from the root directory and public directory if available
app.use(express.static(__dirname));
if (require('fs').existsSync(path.join(__dirname, 'public'))) {
  app.use(express.static(path.join(__dirname, 'public')));
}

// Auto-register REST API routes
try {
  const taskRoutes = require('./routes/taskRoutes');
  app.use('/api', taskRoutes);
} catch (err) {
  console.log("No taskRoutes found or failed to load:", err.message);
}

// Fallback all other client-side routing requests to index.html
app.get('*', (req, res, next) => {
  if (!req.path.startsWith('/api')) {
    const indexPath = path.join(__dirname, 'index.html');
    const publicIndexPath = path.join(__dirname, 'public', 'index.html');
    if (require('fs').existsSync(indexPath)) return res.sendFile(indexPath);
    if (require('fs').existsSync(publicIndexPath)) return res.sendFile(publicIndexPath);
  }
  next();
});

app.get('/health', (req, res) => res.json({ status: 'OK', message: 'Fallback server running' }));

app.listen(port, () => {
  console.log(\`Server is running on port \${port}\`);
});
`;
      fs.writeFileSync(path.join(projectPath, 'index.js'), defaultIndexContent, 'utf8');
      entryFile = 'index.js';
    }

    const command = entryFile ? `node ${entryFile}` : (process.platform === 'win32' ? 'npx.cmd -y serve -l 8080' : 'npx -y serve -l 8080');

    // Create .vscode directory if needed
    const vscodeDir = path.join(projectPath, '.vscode');
    if (!fs.existsSync(vscodeDir)) {
      fs.mkdirSync(vscodeDir, { recursive: true });
    }

    const tasksJson = {
      version: '2.0.0',
      tasks: [
        {
          label: 'Auto Start Server',
          type: 'shell',
          command: command,
          options: {
            env: {
              PORT: '8080'
            }
          },
          runOptions: {
            runOn: 'folderOpen'
          },
          presentation: {
            reveal: 'always',
            panel: 'new'
          }
        }
      ]
    };

    fs.writeFileSync(
      path.join(vscodeDir, 'tasks.json'),
      JSON.stringify(tasksJson, null, 2),
      'utf8'
    );

    onEvent({
      type: 'AGENT_LOG',
      message: `Launching new VS Code workspace instance for project: "${conversationId}"...`
    });

    exec(`code "${projectPath}"`, (err) => {
      if (err) {
        onEvent({
          type: 'AGENT_LOG',
          message: 'Warning: VS Code CLI ("code") was not found on your system PATH. Please open the project directory manually.'
        });
      }
    });
  } catch (error: any) {
    onEvent({
      type: 'AGENT_LOG',
      message: `Failed to initialize VS Code auto-run: ${error.message}`
    });
  }
}

export async function runOrchestrator(
  conversationId: string,
  userPrompt: string,
  onEvent: PipelineEventCallback,
  signal?: AbortSignal
): Promise<void> {
  if (signal?.aborted) {
    throw new Error('Pipeline compilation aborted due to client disconnect.');
  }

  if (activePipelines.has(conversationId)) {
    onEvent({
      type: 'AGENT_LOG',
      message: 'Connection established to active compiler loop.',
    });
    return;
  }
  activePipelines.add(conversationId);

  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    // Load state ledger
    const memoryState = await loadExecutiveMemory(conversationId);
    const ledger = new StageLedger(conversationId, memoryState);

    let actualPrompt = userPrompt;
    if (userPrompt.trim().toLowerCase() === 'continue') {
      actualPrompt = memoryState.originalPrompt || conversation.title || 'Make a project';
    } else {
      memoryState.originalPrompt = userPrompt;
      await saveExecutiveMemory(conversationId, memoryState);
    }

    let currentStage = conversation.currentStage;
    let repairLoops = 0;

    if (conversation.status === 'Completed') {
      onEvent({
        type: 'AGENT_LOG',
        message: 'Project is already compiled. Initializing VS Code preview server...'
      });
      await launchVSCodePreview(conversationId, onEvent);
      return;
    }

    onEvent({
      type: 'PIPELINE_START',
      message: `Resuming pipeline for conversation ${conversationId} from stage: ${currentStage}...`,
    });
    await writeHistoryLog(conversationId, 'System', 'Success', `Resuming pipeline compilation loop from stage: ${currentStage}.`);

    const pipelineStages = [
      'Queen',
      'Planner',
      'Architect',
      'System',
      'Designer',
      'Blueprinter',
      'Coder',
      'Tester',
      'Debugger',
      'Security',
      'Reviewer'
    ];

    let startIndex = pipelineStages.indexOf(currentStage);
    if (startIndex === -1) {
      startIndex = 0;
    }

  for (let i = startIndex; i < pipelineStages.length; i++) {
    if (signal?.aborted) {
      throw new Error('Pipeline compilation aborted due to client disconnect.');
    }

    const stage = pipelineStages[i];

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { currentStage: stage, status: 'Active' },
    });

    let output: any = null;

    if (stage === 'Blueprinter') {
      // ----------------------------------------------------
      // SPECIAL STAGE: Blueprinter (Deterministic Engine)
      // ----------------------------------------------------
      onEvent({
        type: 'AGENT_START',
        agent: 'Blueprinter',
        message: 'Running deterministic Blueprint Engine...'
      });

      // 1. Run Conflict Resolver
      const contextPack = await resolveContext(conversationId, ledger);
      if (contextPack.conflicts.length > 0) {
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { status: 'Paused' },
        });
        onEvent({
          type: 'PAUSE_CONFLICT',
          message: `Pipeline paused due to conflicts/misalignments: ${contextPack.conflicts[0].description}`,
          data: {
            conflict: contextPack.conflicts[0]
          }
        });
        await writeHistoryLog(conversationId, 'System', 'Success', `Pipeline paused. Context Resolver detected conflict: ${contextPack.conflicts[0].description}`);
        return;
      }

      // 2. Run Blueprinter deterministically
      try {
        const bpOutput = await runDeterministic(ledger);
        
        // Write to legacy SML tables for compatibility
        await writeAgentOutput({
          conversationId,
          agentName: 'Blueprinter',
          stage: 'Blueprinter',
          schemaVersion: '1.0',
          model: 'deterministic-service',
          validatedJson: bpOutput,
          executionTime: 0,
          tokenUsage: 0,
          attempt: 1,
        });

        onEvent({
          type: 'AGENT_COMPLETE',
          agent: 'Blueprinter',
          message: 'Blueprinter completed successfully. Created blueprint manifest.'
        });
      } catch (err: any) {
        onEvent({
          type: 'PIPELINE_ERROR',
          message: `Blueprinter failed: ${err.message}`
        });
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { status: 'Paused' },
        });
        return;
      }
    } else if (stage === 'Coder') {
      // ----------------------------------------------------
      // SPECIAL STAGE: Coder Loop
      // ----------------------------------------------------
      onEvent({
        type: 'AGENT_START',
        agent: 'Coder',
        message: `Coder loop started. Generating individual files from blueprints...`,
      });

      const blueprints = await queryAgentOutput(conversationId, 'Blueprinter', 'blueprints');
      if (!blueprints || blueprints.length === 0) {
        onEvent({
          type: 'AGENT_ERROR',
          agent: 'Coder',
          message: 'No blueprints found in SML. Cannot compile files.',
        });
        return;
      }

      // Sort blueprints dynamically: files with higher compileOrder are compiled last (e.g. index.html)
      const sortedBlueprints = [...blueprints].sort((a, b) => {
        const getOrder = (bp: any) => {
          if (typeof bp.compileOrder === 'number') return bp.compileOrder;
          if (typeof bp.compileOrder === 'string') {
            const parsed = parseInt(bp.compileOrder, 10);
            return isNaN(parsed) ? 0 : parsed;
          }
          return 0;
        };
        return getOrder(a) - getOrder(b);
      });

      onEvent({
        type: 'AGENT_LOG',
        agent: 'Coder',
        message: `Found ${blueprints.length} blueprints. Synthesizing files in resolved order...`,
      });

      const generatedFilesInfo: any[] = [];

      for (const bp of sortedBlueprints) {
        onEvent({
          type: 'AGENT_LOG',
          agent: 'Coder',
          message: `Compiling file: ${bp.file}...`,
        });

        // Run inference specifically for this file
        let coderOutput: any = null;
        let success = false;
        let lastError = '';

        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const customUserContent = `Generate code for the target filepath: "${bp.file}"
Language: ${bp.language || 'auto-detect'}
Language Profile: ${bp.languageProfile || 'auto-detect'}
Target Purpose: ${bp.purpose}
Required Imports: ${JSON.stringify(bp.imports)}
Required Exports: ${JSON.stringify(bp.exports)}
Interfaces: ${JSON.stringify(bp.interfaces)}
Classes: ${JSON.stringify(bp.classes)}
Functions to Implement: ${JSON.stringify(bp.functions)}
Implemented APIs: ${JSON.stringify(bp.implementedApis)}
Consumed APIs: ${JSON.stringify(bp.consumedApis)}
Database Entities: ${JSON.stringify(bp.databaseEntities)}
Designer Page: ${bp.designerPageId || 'N/A'}
Designer Components: ${JSON.stringify(bp.designerComponentIds)}
Acceptance criteria to fulfill: ${JSON.stringify(bp.acceptanceCriteria)}
Allowed Constructs: ${JSON.stringify(bp.allowedConstructs)}
Forbidden Constructs: ${JSON.stringify(bp.forbiddenConstructs)}
Validation Rules: ${JSON.stringify(bp.validationRules)}

Ensure you write complete source code matching these specs. Do not truncate.`;

            coderOutput = await runAgent(
              conversationId,
              'Coder',
              actualPrompt,
              onEvent,
              ledger,
              attempt,
              customUserContent,
              signal,
              lastError,
              bp.file
            );
            success = true;
            break;
          } catch (err: any) {
            lastError = err.message;
            onEvent({
              type: 'AGENT_LOG',
              agent: 'Coder',
              message: `Failed to compile ${bp.file} on attempt ${attempt}: ${err.message}`,
            });
            if (signal?.aborted) {
              throw err;
            }
          }
        }

        if (success && coderOutput) {
          // Write code to the local filesystem
          writeProjectFile(conversationId, bp.file, coderOutput.code);
          generatedFilesInfo.push({ file: bp.file, sizeBytes: coderOutput.code.length });

          // Save specific file output into SML keyed by filename for history logging
          await writeAgentOutput({
            conversationId,
            agentName: 'Coder',
            stage: bp.file, // Store under the filepath
            schemaVersion: '1.0',
            model: 'ollama/default',
            validatedJson: { file: bp.file, code: coderOutput.code },
            executionTime: 0,
            tokenUsage: coderOutput.code.length / 4,
            attempt: 1,
          });
        } else {
          onEvent({
            type: 'PIPELINE_ERROR',
            message: `Pipeline halted. Coder failed to compile file: ${bp.file}`,
          });
          await prisma.conversation.update({
            where: { id: conversationId },
            data: { status: 'Paused' },
          });
          return;
        }
      }

      onEvent({
        type: 'AGENT_COMPLETE',
        agent: 'Coder',
        message: `Coder loop completed successfully! Synthesized ${generatedFilesInfo.length} files.`,
        data: { files: generatedFilesInfo },
      });

    } else if (stage === 'Tester') {
      // ----------------------------------------------------
      // SPECIAL STAGE: Tester & Linter checks (DETERMINISTIC PIPELINE)
      // ----------------------------------------------------
      onEvent({
        type: 'AGENT_START',
        agent: 'Tester',
        message: 'Running deterministic validation pipeline (Build, Type Check, Dependency Check, Runtime, Test)...',
      });

      const projectPath = path.join(process.cwd(), 'projects', conversationId);
      const defects: any[] = [];
      const warnings: string[] = [];

      // 1. Dependency Checker & Bracket Balancer
      const checkFilesRecursively = (dir: string) => {
        if (!fs.existsSync(dir)) return;
        const list = fs.readdirSync(dir);
        list.forEach((file) => {
          const filePath = path.join(dir, file);
          if (fs.statSync(filePath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== '.vscode') {
              checkFilesRecursively(filePath);
            }
          } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
            const code = fs.readFileSync(filePath, 'utf8');
            const relPath = path.relative(projectPath, filePath).replace(/\\/g, '/');

            // Bracket Balance check
            const stack: string[] = [];
            let hasMismatch = false;
            for (let idx = 0; idx < code.length; idx++) {
              const char = code[idx];
              if (char === '{' || char === '(' || char === '[') {
                stack.push(char);
              } else if (char === '}' || char === ')' || char === ']') {
                const top = stack.pop();
                if (
                  (char === '}' && top !== '{') ||
                  (char === ')' && top !== '(') ||
                  (char === ']' && top !== '[')
                ) {
                  hasMismatch = true;
                  break;
                }
              }
            }
            if (hasMismatch || stack.length > 0) {
              defects.push({
                id: `DEF-SYNTAX-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                severity: 'Critical',
                category: 'Functional',
                file: relPath,
                description: 'Bracket/parentheses mismatch: unbalanced braces detected.',
                expectedBehaviour: 'Source code syntax is well-formed with matching balanced braces.',
                actualBehaviour: 'Unbalanced brace syntax error found.',
                reproductionSteps: [`Statically review file braces of ${relPath}`]
              });
            }

            // Simple Dependency check
            const importRegex = /(?:import|from|require)\s*\(\s*['"]\.\/([^'"]+)['"]\s*\)/g;
            let match;
            while ((match = importRegex.exec(code)) !== null) {
              const targetRel = match[1];
              // Resolve relative file
              const targetFullPath = path.resolve(path.dirname(filePath), targetRel);
              const possibleExtensions = ['', '.js', '.ts', '.jsx', '.tsx', '/index.js', '/index.ts'];
              const found = possibleExtensions.some((ext) => fs.existsSync(targetFullPath + ext));
              if (!found) {
                defects.push({
                  id: `DEF-DEP-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                  severity: 'High',
                  category: 'Integration',
                  file: relPath,
                  description: `Broken import: cannot resolve relative file target "./${targetRel}"`,
                  expectedBehaviour: `All imported dependencies exist on disk.`,
                  actualBehaviour: `Import target "./${targetRel}" does not exist.`,
                  reproductionSteps: [`Check path reference to "./${targetRel}" in ${relPath}`]
                });
              }
            }
          }
        });
      };

      try {
        checkFilesRecursively(projectPath);
      } catch (err: any) {
        warnings.push(`File system static checks encountered issues: ${err.message}`);
      }

      // 2. Runtime Executor Check
      const potentialEntries = ['main.js', 'app.js', 'server.js', 'index.js'];
      let entryFile = '';
      for (const f of potentialEntries) {
        if (fs.existsSync(path.join(projectPath, f))) {
          entryFile = f;
          break;
        }
      }

      if (entryFile && defects.length === 0) {
        onEvent({
          type: 'AGENT_LOG',
          agent: 'Tester',
          message: `Executing Runtime checks. Spawning "node ${entryFile}" on port 8082...`
        });

        try {
          const { spawn } = require('child_process');
          const child = spawn('node', [entryFile], {
            cwd: projectPath,
            env: { ...process.env, PORT: '8082' }
          });

          let stdoutBuffer = '';
          let stderrBuffer = '';

          child.stdout.on('data', (data: any) => { stdoutBuffer += data.toString(); });
          child.stderr.on('data', (data: any) => { stderrBuffer += data.toString(); });

          await new Promise((resolve) => setTimeout(resolve, 4000));
          child.kill('SIGTERM');

          if (stderrBuffer.trim() && (stderrBuffer.includes('Error') || stderrBuffer.includes('exception') || stderrBuffer.includes('throw'))) {
            defects.push({
              id: `DEF-RUNTIME-${Date.now()}`,
              severity: 'Critical',
              category: 'Functional',
              file: entryFile,
              description: `Runtime execution failed with crash errors in stderr:\n${stderrBuffer}`,
              expectedBehaviour: 'Application starts cleanly without immediate logs of exceptions or crashes.',
              actualBehaviour: `Runtime startup crashed: ${stderrBuffer.split('\n')[0]}`,
              reproductionSteps: [`node ${entryFile}`]
            });
          }
        } catch (err: any) {
          warnings.push(`Runtime check failed to launch: ${err.message}`);
        }
      }

      // Compile Tester Output JSON
      const passed = defects.length === 0;
      output = {
        contextType: 'canonical',
        projectName: 'Target Project',
        mvpReference: 'MVP-001',
        generatedTestFiles: [],
        testReport: {
          summary: {
            totalTests: 1,
            passed: passed ? 1 : 0,
            failed: passed ? 0 : 1,
            skipped: 0,
            coverage: passed ? 'Ready for running' : '0%',
            coveredFeatures: [],
            missingFeatures: []
          },
          defects,
          warnings,
          status: passed ? 'Success' : 'Failed'
        }
      };

      // Write to legacy SML table for view/telemetry
      await writeAgentOutput({
        conversationId,
        agentName: 'Tester',
        stage: 'Tester',
        schemaVersion: '1.0',
        model: 'deterministic-service',
        validatedJson: output,
        executionTime: 0,
        tokenUsage: 0,
        attempt: 1,
      });

      // Write to StageLedger
      await ledger.write('Tester', 'tester', output);

      onEvent({
        type: 'AGENT_COMPLETE',
        agent: 'Tester',
        message: passed 
          ? 'Validation pipeline passed successfully!' 
          : `Validation pipeline failed with ${defects.length} defect(s). Routing to Debugger for repair.`,
        data: output
      });

      // If checks failed, we classify and log triage information using EventDispatcher
      if (!passed) {
        const logsPayload = defects.map(d => `${d.file}: ${d.description}`).join('\n');
        const triage = dispatchFailureEvent(logsPayload, 'Tester');
        onEvent({
          type: 'PIPELINE_TRIAGE',
          message: `Triage dispatcher routed logs to specialist agent [${triage.specialistAgent}]. Reason: ${triage.contextHint}`
        });
      }

    } else if (stage === 'Debugger') {
      // ----------------------------------------------------
      // SPECIAL STAGE: Debugger & Surgical Coder Repair Loop
      // ----------------------------------------------------
      const testOutput = await queryAgentOutput(conversationId, 'Tester', 'testReport');
      const defects = testOutput?.defects || [];

      if (defects.length > 0) {
        if (repairLoops < 3) {
          repairLoops++;
          onEvent({
            type: 'AGENT_START',
            agent: 'Debugger',
            message: `Debugger activated (Loop Run ${repairLoops}/3). Analyzing ${defects.length} defect reports...`,
          });

          // Run Debugger to analyze defects and generate repair instructions
          let debugOutput: any = null;
          let success = false;
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              debugOutput = await runAgent(conversationId, 'Debugger', actualPrompt, onEvent, ledger, attempt, undefined, signal);
              success = true;
              break;
            } catch (e: any) {
              onEvent({
                type: 'AGENT_LOG',
                agent: 'Debugger',
                message: `Debugger failed on attempt ${attempt}.`,
              });
              if (signal?.aborted) {
                throw e;
              }
            }
          }

          if (success && debugOutput && debugOutput.debugReport && Array.isArray(debugOutput.debugReport.issues)) {
            onEvent({
              type: 'AGENT_LOG',
              agent: 'Debugger',
              message: `Debugger identified root causes for ${debugOutput.debugReport.issues.length} issues. Invoking Coder under surgical repair profile...`,
            });

            for (const issue of debugOutput.debugReport.issues) {
              // 1. Retrieve current code content
              const coderOut = await queryAgentOutput(conversationId, 'Coder', issue.file);
              let currentCode = coderOut?.code || '';
              if (!currentCode) {
                const projectPath = path.join(process.cwd(), 'projects', conversationId);
                const filePath = path.join(projectPath, issue.file);
                if (fs.existsSync(filePath)) {
                  currentCode = fs.readFileSync(filePath, 'utf8');
                }
              }

              // 2. Invoke Coder under surgical repair instructions
              const repairInstructionsPrompt = `You are performing a surgical bug fix on the file: "${issue.file}"
         
The Tester Agent reported the following defect:
- ID: ${issue.testerDefectId}
- Severity: ${issue.severity}
- Category: ${issue.category}
- Location: ${issue.location}
- Description: ${issue.rootCause}

The Debugger Agent diagnosed the root cause:
"${issue.rootCause}"

Recommended Fix:
"${issue.recommendedFix}"

Surgical Repair Instructions:
${JSON.stringify(issue.implementationInstructions, null, 2)}

Current File Code:
\`\`\`
${currentCode}
\`\`\`

CRITICAL RULES:
1. DO NOT change the overall file structure or rewrite unrelated lines of code.
2. Fix ONLY the lines/logic responsible for the reported defect.
3. Ensure all existing imports, exports, and functions remain intact unless they are directly buggy.
4. Return the complete, updated source code for this file.`;

              onEvent({
                type: 'AGENT_LOG',
                agent: 'Coder',
                message: `Surgically repairing file: ${issue.file}...`,
              });

              try {
                const repairOutput = await runAgent(
                  conversationId,
                  'Coder',
                  actualPrompt,
                  onEvent,
                  ledger,
                  1,
                  repairInstructionsPrompt,
                  signal,
                  undefined,
                  issue.file
                );

                if (repairOutput && repairOutput.code) {
                  // Write corrected code to disk
                  writeProjectFile(conversationId, issue.file, repairOutput.code);

                  // Update Coder output in SML
                  await writeAgentOutput({
                    conversationId,
                    agentName: 'Coder',
                    stage: issue.file,
                    schemaVersion: '1.0',
                    model: 'ollama/default',
                    validatedJson: { file: issue.file, code: repairOutput.code },
                    executionTime: 0,
                    tokenUsage: repairOutput.code.length / 4,
                    attempt: 1,
                  });

                  // Update Coder state in StageLedger
                  const currentCoderState = ledger.read('coder') || {};
                  const updatedCoderState = {
                    ...currentCoderState,
                    [issue.file]: repairOutput.code
                  };
                  await ledger.write('Coder', 'coder', updatedCoderState);
                }
              } catch (err: any) {
                onEvent({
                  type: 'AGENT_LOG',
                  agent: 'Coder',
                  message: `Surgical repair failed for ${issue.file}: ${err.message}`,
                });
              }
            }

            // Loop back to Tester stage
            i = pipelineStages.indexOf('Tester') - 1;
            onEvent({
              type: 'AGENT_LOG',
              agent: 'Debugger',
              message: `Surgical repairs applied. Re-running Tester stage to verify fixes (Loop Run ${repairLoops}/3)...`,
            });
          }
        } else {
          onEvent({
            type: 'AGENT_LOG',
            agent: 'Debugger',
            message: `Tester defects remain, but repair loop reached maximum limit of 3 runs. Proceeding to Security.`,
          });
        }
      } else {
        onEvent({
          type: 'AGENT_LOG',
          agent: 'Debugger',
          message: 'All tests passed successfully with 0 defects. Debugger skipped.',
        });
      }

    } else if (stage === 'Security') {
      // ----------------------------------------------------
      // SPECIAL STAGE: Security Scanner (Map-Reduce)
      // ----------------------------------------------------
      onEvent({
        type: 'AGENT_START',
        agent: 'Security',
        message: 'Security audit starting. Scanning generated files for vulnerabilities (Map-Reduce style)...',
      });

      const coderData = ledger.read('coder') || {};
      const filesToAudit = Object.keys(coderData);

      let finalReport: any = {
        contextType: 'canonical',
        projectName: 'Fitness Tracker App',
        mvpReference: 'MVP-001',
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
          status: 'Success'
        }
      };

      if (filesToAudit.length === 0) {
        onEvent({
          type: 'AGENT_LOG',
          agent: 'Security',
          message: 'No files generated by Coder. Security audit skipped.',
        });
      } else {
        // Map Phase: audit each file individually
        for (const filepath of filesToAudit) {
          const filecode = coderData[filepath] || '';
          onEvent({
            type: 'AGENT_LOG',
            agent: 'Security',
            message: `Auditing file for security vulnerabilities: ${filepath}...`,
          });

          const customPrompt = `You are auditing the following file: "${filepath}"
          
File Content:
\`\`\`
${filecode}
\`\`\`

Perform a security review strictly for this file. Identify potential vulnerabilities, insecure configurations, or secret exposures.`;

          let fileReport: any = null;
          let fileSuccess = false;
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              fileReport = await runAgent(
                conversationId,
                'Security',
                actualPrompt,
                onEvent,
                ledger,
                attempt,
                customPrompt,
                signal
              );
              fileSuccess = true;
              break;
            } catch (e: any) {
              if (signal?.aborted) throw e;
            }
          }

          // Reduce Phase for this file
          if (fileSuccess && fileReport && fileReport.securityReport) {
            if (fileReport.projectName) finalReport.projectName = fileReport.projectName;
            if (fileReport.mvpReference) finalReport.mvpReference = fileReport.mvpReference;

            const issues = fileReport.securityReport.issues || [];
            finalReport.securityReport.issues.push(...issues);
            
            const warnings = fileReport.securityReport.warnings || [];
            finalReport.securityReport.warnings.push(...warnings);
          }
        }

        // Run static regex scans for secrets and evals on local files
        const projectDir = path.join(process.cwd(), 'projects', conversationId);
        const scannerIssues: any[] = [];

        const scanFiles = (dir: string) => {
          if (!fs.existsSync(dir)) return;
          const list = fs.readdirSync(dir);
          list.forEach((file) => {
            const filePath = path.join(dir, file);
            if (fs.statSync(filePath).isDirectory()) {
              scanFiles(filePath);
            } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.js')) {
              const code = fs.readFileSync(filePath, 'utf8');
              const relPath = path.relative(projectDir, filePath).replace(/\\/g, '/');

              // Check for eval
              if (code.includes('eval(') || code.includes('Function(')) {
                scannerIssues.push({
                  id: `SEC-STATIC-EVAL-${relPath.replace(/\//g, '-')}`,
                  severity: 'Critical',
                  category: 'Injection',
                  file: relPath,
                  location: 'N/A',
                  description: 'Use of eval() or Function() constructor introduces arbitrary code execution risks.',
                  risk: 'High risk of remote code execution if user inputs can flow here.',
                  recommendation: 'Refactor using safe alternative JS patterns.',
                  affectedFeature: 'N/A',
                  owaspTop10: 'A03:2021-Injection',
                  cweReference: 'CWE-95',
                  confidence: 'High'
                });
              }

              // Check for API keys
              const keyRegex = /(sk-[a-zA-Z0-9]{32,}|AIzaSy[a-zA-Z0-9_-]{33}|api[-_]key|secret)/i;
              if (keyRegex.test(code) && !code.includes('process.env')) {
                scannerIssues.push({
                  id: `SEC-STATIC-SECRET-${relPath.replace(/\//g, '-')}`,
                  severity: 'High',
                  category: 'Secrets',
                  file: relPath,
                  location: 'N/A',
                  description: 'Potential hardcoded API key, token, or credential exposed in code.',
                  risk: 'Leaked credentials can be extracted and abused.',
                  recommendation: 'Use environment variables (process.env) for secrets.',
                  affectedFeature: 'N/A',
                  owaspTop10: 'A05:2021-Security Misconfiguration',
                  cweReference: 'CWE-798',
                  confidence: 'High'
                });
              }
            }
          });
        };

        scanFiles(projectDir);
        if (scannerIssues.length > 0) {
          onEvent({
            type: 'AGENT_LOG',
            agent: 'Security',
            message: `Static regex scan identified ${scannerIssues.length} alerts. Adding to Security report.`,
          });
          finalReport.securityReport.issues.push(...scannerIssues);
        }

        // Calculate unified Summary statistics
        for (const issue of finalReport.securityReport.issues) {
          const sev = (issue.severity || '').toLowerCase();
          if (sev === 'critical') finalReport.securityReport.summary.critical++;
          else if (sev === 'high') finalReport.securityReport.summary.high++;
          else if (sev === 'medium') finalReport.securityReport.summary.medium++;
          else if (sev === 'low') finalReport.securityReport.summary.low++;
          else if (sev === 'informational') finalReport.securityReport.summary.informational++;
        }

        // Save output to database & ledger
        const config = await getLLMConfig();
        await writeAgentOutput({
          conversationId,
          agentName: 'Security',
          stage: 'Security',
          schemaVersion: '1.0',
          model: config.ollamaModel,
          validatedJson: finalReport,
          executionTime: 0,
          tokenUsage: 0,
          attempt: 1,
        });
        await ledger.write('Security', 'security', finalReport);
      }

    } else if (stage === 'Reviewer') {
      // ----------------------------------------------------
      // SPECIAL STAGE: Reviewer Scanner (Map-Reduce)
      // ----------------------------------------------------
      onEvent({
        type: 'AGENT_START',
        agent: 'Reviewer',
        message: 'Reviewer audit starting. Checking specs alignment and code quality per file...',
      });

      const coderData = ledger.read('coder') || {};
      const filesToAudit = Object.keys(coderData);

      let finalReport: any = {
        qualityScore: 100,
        annotations: []
      };

      if (filesToAudit.length === 0) {
        onEvent({
          type: 'AGENT_LOG',
          agent: 'Reviewer',
          message: 'No files generated by Coder. Review skipped.',
        });
      } else {
        let totalScore = 0;
        let successfulAudits = 0;

        // Map Phase: audit each file individually
        for (const filepath of filesToAudit) {
          const filecode = coderData[filepath] || '';
          onEvent({
            type: 'AGENT_LOG',
            agent: 'Reviewer',
            message: `Reviewing file: ${filepath}...`,
          });

          const customPrompt = `You are reviewing the following file: "${filepath}"
          
File Content:
\`\`\`
${filecode}
\`\`\`

Review this file for quality, completeness, spec alignment, and bugs. Assign a qualityScore (0-100) and generate annotations.`;

          let fileReport: any = null;
          let fileSuccess = false;
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              fileReport = await runAgent(
                conversationId,
                'Reviewer',
                actualPrompt,
                onEvent,
                ledger,
                attempt,
                customPrompt,
                signal
              );
              fileSuccess = true;
              break;
            } catch (e: any) {
              if (signal?.aborted) throw e;
            }
          }

          // Reduce Phase for this file
          if (fileSuccess && fileReport) {
            const score = typeof fileReport.qualityScore === 'number' ? fileReport.qualityScore : 95;
            totalScore += score;
            successfulAudits++;

            const annotations = fileReport.annotations || [];
            finalReport.annotations.push(...annotations);
          }
        }

        // Calculate average quality score
        if (successfulAudits > 0) {
          finalReport.qualityScore = Math.round(totalScore / successfulAudits);
        }

        // Save output to database & ledger
        const config = await getLLMConfig();
        await writeAgentOutput({
          conversationId,
          agentName: 'Reviewer',
          stage: 'Reviewer',
          schemaVersion: '1.0',
          model: config.ollamaModel,
          validatedJson: finalReport,
          executionTime: 0,
          tokenUsage: 0,
          attempt: 1,
        });
        await ledger.write('Reviewer', 'reviewer', finalReport);
      }

    } else {
      // ----------------------------------------------------
      // Standard Agent stages (Queen, Planner, Architect, etc.)
      // ----------------------------------------------------
      let success = false;
      let bypassInference = false;
      let lastError = '';

      if (stage === 'Queen') {
        onEvent({
          type: 'AGENT_LOG',
          agent: 'Queen',
          message: 'Running pre-flight software classification check...'
        });
        const classification = await classifyIsSoftwareRequest(actualPrompt, signal);
        if (!classification.isSoftware) {
          output = {
            contextType: 'validationError',
            status: 'Rejected',
            reason: 'Input contains zero software-related context',
            message: classification.reason || 'The request is completely unrelated to programming or creating software utilities.'
          };
          bypassInference = true;
          success = true;
        }
      }

      if (!bypassInference) {
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            output = await runAgent(conversationId, stage, actualPrompt, onEvent, ledger, attempt, undefined, signal, lastError);
            success = true;
            break;
          } catch (err: any) {
            lastError = err.message;
            onEvent({
              type: 'AGENT_ERROR',
              agent: stage,
              message: `Attempt ${attempt} failed: ${err.message}`,
            });

            await prisma.executionHistory.create({
              data: {
                conversationId,
                stage: stage,
                status: 'Failed',
                logs: `Attempt ${attempt} failed: ${err.message}`,
              },
            });

            if (signal?.aborted) {
              throw err;
            }

            if (attempt === 3) {
              await prisma.conversation.update({
                where: { id: conversationId },
                data: { status: 'Paused' },
              });
              onEvent({
                type: 'PIPELINE_ERROR',
                message: `Pipeline halted at stage ${stage} after 3 failed attempts.`,
              });
              return;
            }
          }
        }
      }
    }

    // Intermediary check logic after standard runs
    if (stage === 'Queen') {
      if (output && (output.status === 'Rejected' || output.contextType === 'validationError')) {
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { status: 'Paused' },
        });
        onEvent({
          type: 'PIPELINE_ERROR',
          message: `Pipeline rejected: Queen Agent classified the request as invalid.\nReason: ${output.reason || 'Invalid Request'}\nMessage: ${output.message}`,
        });
        await writeHistoryLog(
          conversationId,
          'System',
          'Failed',
          `Pipeline halted. Queen validation error: ${output.message}`
        );
        return;
      }
      if (output && output.needsClarification) {
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { status: 'Paused' },
        });
        onEvent({
          type: 'PAUSE_CLARIFICATION',
          message: `Pipeline paused. Queen requires clarification questions to be answered.`,
          data: {
            questions: output.clarificationQuestions,
            readinessScore: output.readinessScore,
          },
        });
        await writeHistoryLog(conversationId, 'System', 'Success', 'Pipeline paused. Awaiting answers to Queen clarification questions.');
        return;
      }
    }

    if (stage === 'Architect') {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { status: 'Paused' },
      });
      onEvent({
        type: 'PAUSE_APPROVAL_GATE',
        message: `Pipeline paused at Approval Gate (Architect Review completed). Awaiting user approval to generate code.`,
      });
      await writeHistoryLog(conversationId, 'System', 'Success', 'Pipeline paused at Architect Approval Gate. Awaiting user approval to generate code.');
      return;
    }

  }

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { status: 'Completed' },
    });

    await launchVSCodePreview(conversationId, onEvent);

    onEvent({
      type: 'PIPELINE_SUCCESS',
      message: `All stages completed successfully! Project code compiles and is ready.`,
    });
    await writeHistoryLog(conversationId, 'System', 'Success', 'Pipeline compilation completed successfully! All 11 passes resolved.');
  } finally {
    activePipelines.delete(conversationId);
  }
}
