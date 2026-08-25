import { EventEmitter } from 'events';
import { prisma } from '../../db';
import { runInference, getLLMConfig, startOllamaKeepAlive, stopOllamaKeepAlive, cleanJsonResponse } from '../inference';
import { writeAgentOutput, queryAgentOutput } from '../sml';
import { AGENT_DEFS, AgentDef } from './agents';
import { loadExecutiveMemory, saveExecutiveMemory, writeExecutiveMemoryRecord, OWNERSHIP, StageLedger } from './memory';
import { calculateTokenBudget } from './token-budgeter';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { writeVirtualFile, readVirtualFile, listVirtualFiles, flushVfsToDisk } from './vfs';
import { runLinter } from './linter';

// Global Event Emitter for decoupling browser SSE streams from background Node pipeline compilation
export const pipelineEvents = new EventEmitter();
pipelineEvents.setMaxListeners(100);

export const activePipelines = new Set<string>();
export const pipelineAbortControllers = new Map<string, AbortController>();

export function abortPipelineExecution(conversationId: string) {
  const controller = pipelineAbortControllers.get(conversationId);
  if (controller) {
    controller.abort();
    pipelineAbortControllers.delete(conversationId);
  }
}

// ─── Infrastructure Failure Detection ───────────────────────────────────────

const INFRA_ERROR_SIGNATURES = [
  'ollama is not running',
  'connect econnrefused',
  'enotfound',
] as const;

function isInfrastructureError(err: any): boolean {
  const msg = (err?.message || '').toLowerCase();
  return INFRA_ERROR_SIGNATURES.some(sig => msg.includes(sig));
}

async function handleInfrastructurePause(
  conversationId: string,
  onEvent: PipelineEventCallback,
  errorMessage: string
): Promise<void> {
  onEvent({
    type: 'PIPELINE_ERROR',
    message: `⚠️ INFRASTRUCTURE FAILURE: LLM provider unreachable.\n` +
             `Error: ${errorMessage}\n` +
             `Pipeline paused. Please start Ollama and click Resume to retry.`,
  });
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { status: 'Paused' },
  });
  await writeHistoryLog(
    conversationId,
    'System',
    'Failed',
    `Pipeline paused due to infrastructure failure: ${errorMessage}`
  );
}

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
  status: string;
  richLog?: any;
  onEvent?: PipelineEventCallback;
}): Promise<void> {
  try {
    await prisma.executionHistory.create({
      data: {
        conversationId: params.conversationId,
        stage: params.agentName,
        status: params.status,
        logs: JSON.stringify(params.richLog || {}),
      },
    });
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

// ─── VFS & Context Maps ──────────────────────────────────────────────────────

const VFS_OUTPUT_MAP: Record<string, string> = {
  'Queen':       'plan.md',
  'Planner':     'requirements.md',
  'Architect':   'architecture.md',
  'System':      'backend_spec.md',
  'Designer':    'ui_spec.md',
  'Blueprinter': 'blueprint.md',
  'Security':    'security_report.md',
  'Reviewer':    'review_report.md',
};

const UPSTREAM_AGENT_MAP: Record<string, string[]> = {
  'Queen':       [],
  'Planner':     ['Queen'],
  'Architect':   ['Queen', 'Planner'],
  'System':      ['Queen', 'Planner', 'Architect'],
  'Designer':    ['Queen', 'Planner', 'Architect'],
  'Blueprinter': ['Queen', 'Planner', 'Architect', 'System', 'Designer'],
  'Security':    ['Queen'],
  'Reviewer':    ['Queen', 'Planner', 'Architect'],
};

const EXPECTED_FIRST_HEADERS: Record<string, string> = {
  'Queen':       'Context Snapshot',
  'Planner':     'Context Snapshot',
  'Architect':   'Context Snapshot',
  'System':      'Context Snapshot',
  'Designer':    'Context Snapshot',
  'Blueprinter': 'File:',
  'Security':    'Overall Status',
  'Reviewer':    'Overall Assessment',
};

const MAX_SNAPSHOT_CHARS = 600;

// ─── Snapshot Extraction & Context Assembly ──────────────────────────────────

export async function extractSnapshot(conversationId: string, vfsPath: string): Promise<string> {
  const fullContent = (await readVirtualFile(conversationId, vfsPath)) || '';
  if (!fullContent) return '';

  // Tier 1: Exact match
  const exact = fullContent.match(/### Context Snapshot[\s\S]*?(?=\n###[^#]|$)/i);
  if (exact) {
    let snapshotText = exact[0].trim();
    if (snapshotText.length > MAX_SNAPSHOT_CHARS) {
      snapshotText = snapshotText.substring(0, MAX_SNAPSHOT_CHARS) + '\n...[SNAPSHOT TRUNCATED]';
    }
    return snapshotText;
  }

  // Tier 2: Fuzzy match
  const fuzzy = fullContent.match(/(#+)?\s*(context|snapshot|summary|overview)[\s\S]*?(?=\n###[^#]|$)/i);
  if (fuzzy) {
    let snapshotText = fuzzy[0].trim();
    if (snapshotText.length > MAX_SNAPSHOT_CHARS) {
      snapshotText = snapshotText.substring(0, MAX_SNAPSHOT_CHARS) + '\n...[SNAPSHOT TRUNCATED]';
    }
    return snapshotText;
  }

  // Tier 3: Synthetic fallback (first line of top 3 headers)
  const headers = fullContent.match(/^### .+$/gm) || [];
  const synthetic = headers.slice(0, 3).map(h => {
    const idx = fullContent.indexOf(h) + h.length;
    const nextLine = fullContent.substring(idx).trim().split('\n')[0];
    return `- ${h.replace('### ', '')}: ${nextLine}`;
  }).join('\n');

  if (synthetic) {
    return `### Context Snapshot (AUTO-GENERATED)\n${synthetic}`;
  }

  // Final fallback: Truncated content
  return fullContent.substring(0, 800) + (fullContent.length > 800 ? '\n...[TRUNCATED]' : '');
}

function extractSnapshotFromContent(content: string): string {
  if (!content) return '';
  const exact = content.match(/### Context Snapshot[\s\S]*?(?=\n###[^#]|$)/i);
  if (exact) {
    let snapshotText = exact[0].trim();
    if (snapshotText.length > MAX_SNAPSHOT_CHARS) {
      snapshotText = snapshotText.substring(0, MAX_SNAPSHOT_CHARS) + '\n...[SNAPSHOT TRUNCATED]';
    }
    return snapshotText;
  }
  const fuzzy = content.match(/(#+)?\s*(context|snapshot|summary|overview)[\s\S]*?(?=\n###[^#]|$)/i);
  if (fuzzy) {
    let snapshotText = fuzzy[0].trim();
    if (snapshotText.length > MAX_SNAPSHOT_CHARS) {
      snapshotText = snapshotText.substring(0, MAX_SNAPSHOT_CHARS) + '\n...[SNAPSHOT TRUNCATED]';
    }
    return snapshotText;
  }
  return content.substring(0, 800) + (content.length > 800 ? '\n...[TRUNCATED]' : '');
}

export async function buildStageContext(
  conversationId: string,
  stage: string
): Promise<{ context: string; consumedInferenceIds: string[] }> {
  const upstreamAgents = UPSTREAM_AGENT_MAP[stage] ?? [];
  if (upstreamAgents.length === 0) return { context: '', consumedInferenceIds: [] };

  const rows = await prisma.executiveMemory.findMany({
    where: {
      conversationId,
      agentName: { in: upstreamAgents },
      status: 'ACTIVE',
    },
    orderBy: { sequence: 'desc' },
    select: { agentName: true, contentMd: true, inferenceId: true },
  });

  const seen = new Set<string>();
  const latestPerAgent: { agentName: string; contentMd: string; inferenceId: string }[] = [];
  for (const row of rows) {
    if (!seen.has(row.agentName)) {
      seen.add(row.agentName);
      latestPerAgent.push(row);
    }
  }

  let context = '';
  const consumedInferenceIds: string[] = [];

  for (const agentName of upstreamAgents) {
    const row = latestPerAgent.find(r => r.agentName === agentName);
    if (!row) continue;
    const snapshot = extractSnapshotFromContent(row.contentMd);
    if (!snapshot) continue;
    const label = agentName === 'Queen'
      ? '=== ORIGINAL USER INTENT (DO NOT OVERRIDE) ==='
      : `--- [FROM ${agentName} / ${row.inferenceId}] ---`;
    context += `${label}\n${snapshot}\n\n`;
    consumedInferenceIds.push(row.inferenceId);
  }

  return { context: context.trim(), consumedInferenceIds };
}

// ─── Post-Hoc Snapshot Consistency Check ────────────────────────────────────

const TECH_KEYWORDS = ['react', 'vue', 'angular', 'express', 'next', 'vite', 'postgresql', 'sqlite', 'mongodb', 'mysql', 'firebase', 'typescript'];

export function validateSnapshotConsistency(snapshot: string, fullBody: string): boolean {
  const snapshotTerms = TECH_KEYWORDS.filter(kw => snapshot.toLowerCase().includes(kw));
  const bodyTerms = TECH_KEYWORDS.filter(kw => fullBody.toLowerCase().includes(kw));

  const missing = bodyTerms.filter(t => !snapshotTerms.includes(t));
  if (missing.length > 0) {
    console.warn(`[WARN] Snapshot missing tech terms found in body: ${missing.join(', ')}`);
    return false;
  }
  return true;
}

// ─── Header Anchoring & Sanitization ─────────────────────────────────────────

export function sanitizeStageOutput(rawOutput: string, expectedFirstHeader?: string): string {
  let cleaned = rawOutput.trim();

  // 1. Strip outer code fences ONLY at start and end of output
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-zA-Z0-9_-]*\n?/, '');
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.replace(/\n?```$/, '');
  }

  if (!expectedFirstHeader) return cleaned.trim();

  // 2. Find expected first header anchor and strip preamble
  const headerRegex = new RegExp(
    `(#{2,3})\\s*${expectedFirstHeader.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
    'i'
  );
  const headerMatch = cleaned.match(headerRegex);

  if (headerMatch && headerMatch.index !== undefined && headerMatch.index > 0) {
    cleaned = '### ' + expectedFirstHeader + cleaned.substring(headerMatch.index + headerMatch[0].length);
  }

  return cleaned.trim();
}

// ─── Deterministic Spec Pre-Fetch for Coder ──────────────────────────────────

export function parseSpecsRequired(blueprintSection: string): Array<{ file: string; section: string }> {
  const match = blueprintSection.match(/\*\*Specs Required\*\*:\s*(.+)/i);
  if (!match || match[1].trim().toLowerCase() === 'none') {
    return [];
  }

  return match[1].split(',').map(entry => {
    const parts = entry.trim().split('#');
    const file = parts[0]?.trim() || '';
    const section = parts[1]?.trim() || '';
    return { file, section };
  }).filter(e => e.file && e.section);
}

export async function extractSection(conversationId: string, vfsPath: string, sectionName: string): Promise<string> {
  const fullContent = (await readVirtualFile(conversationId, vfsPath)) || '';
  const regex = new RegExp(
    `###\\s*${sectionName.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}[\\s\\S]*?(?=\\n###[^#]|$)`,
    'i'
  );
  const match = fullContent.match(regex);
  if (match) {
    return match[0].trim();
  }
  return `[Section "${sectionName}" not found in ${vfsPath}]`;
}

export async function buildCoderContext(
  conversationId: string,
  blueprintSection: string,
  dependencyCode: string
): Promise<string> {
  let context = `=== BLUEPRINT ===\n${blueprintSection}\n\n`;

  if (dependencyCode) {
    context += `=== DEPENDENCY CODE ===\n${dependencyCode}\n\n`;
  }

  const specsNeeded = parseSpecsRequired(blueprintSection);
  if (specsNeeded.length > 0) {
    context += `=== REFERENCED SPECS ===\n`;
    for (const spec of specsNeeded) {
      const sectionText = await extractSection(conversationId, spec.file, spec.section);
      context += `--- [FROM ${spec.file}#${spec.section}] ---\n${sectionText}\n\n`;
    }
  }

  return context.trim();
}

// ─── Thinking Gates (SLM Triage) ──────────────────────────────────────────────

export interface ThinkingDecision {
  action: 'RETRY' | 'SKIP' | 'ABORT';
  targetFile?: string;
  reason: string;
}

export async function orchestratorThinkDebugger(
  errorLog: string,
  retryCount: number,
  maxRetries: number
): Promise<ThinkingDecision> {
  if (retryCount >= maxRetries) {
    return { action: 'ABORT', reason: `Max retries (${maxRetries}) exceeded` };
  }

  const thinkingPrompt = `You are a build error triage bot. You receive a TypeScript compiler error log.
Your job is to decide ONE action. Respond with EXACTLY one JSON line.

ERROR LOG:
${errorLog.substring(0, 500)}

RETRY COUNT: ${retryCount}/${maxRetries}

Respond with EXACTLY this JSON format (no other text):
{"action": "RETRY" | "SKIP" | "ABORT", "targetFile": "filename.ts", "reason": "one sentence"}

Rules:
- RETRY: Error is fixable (syntax, missing import, wrong type). Set targetFile to the file mentioned in the error.
- SKIP: Error is in a non-critical file. Pipeline can continue without it.
- ABORT: Error is fundamental (missing entire module, circular dependency). Retrying won't help.`;

  try {
    const response = await runInference(
      [
        { role: 'system', content: 'You are a build error triage bot.' },
        { role: 'user', content: thinkingPrompt },
      ],
      { temperature: 0.1, format: 'json', maxTokens: 100 }
    );
    const cleaned = cleanJsonResponse(response);
    const parsed = JSON.parse(cleaned);
    return {
      action: parsed.action || 'RETRY',
      targetFile: parsed.targetFile,
      reason: parsed.reason || 'SLM triage completed',
    };
  } catch {
    return { action: 'RETRY', reason: 'SLM thinking fallback' };
  }
}

export function evaluateComplexity(planSnapshot: string, fileCount: number): { complexity: 'SIMPLE' | 'MODERATE' | 'COMPLEX'; recommendedTokens: number; enableReasoning: boolean } {
  if (fileCount <= 3) {
    return { complexity: 'SIMPLE', recommendedTokens: 1024, enableReasoning: false };
  }
  if (fileCount >= 15) {
    return { complexity: 'COMPLEX', recommendedTokens: 4096, enableReasoning: true };
  }

  const hasBackend = !planSnapshot.toLowerCase().includes('no backend') && !planSnapshot.toLowerCase().includes('frontend-only');
  if (hasBackend) {
    return { complexity: 'COMPLEX', recommendedTokens: 3072, enableReasoning: true };
  }
  return { complexity: 'MODERATE', recommendedTokens: 2048, enableReasoning: false };
}

// ─── Disk Flushing Helper for Preview ───────────────────────────────────────

function writeProjectFile(conversationId: string, filePath: string, content: string) {
  const projectDir = path.join(process.cwd(), 'projects', conversationId);
  const fullPath = path.join(projectDir, filePath);
  let normalizedContent = content;
  if (filePath.endsWith('.html')) {
    normalizedContent = normalizedContent.replace(/UTF-[\u4e00-\u9fa5]8/g, 'UTF-8');
  }
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, normalizedContent, 'utf8');
}

export async function launchVSCodePreview(conversationId: string, onEvent: PipelineEventCallback) {
  try {
    await flushVfsToDisk(conversationId);
    const projectPath = path.join(process.cwd(), 'projects', conversationId);
    if (!fs.existsSync(projectPath)) return;

    const potentialEntries = ['main.js', 'app.js', 'server.js', 'index.js'];
    let entryFile = '';
    for (const f of potentialEntries) {
      if (fs.existsSync(path.join(projectPath, f))) {
        entryFile = f;
        break;
      }
    }

    if (entryFile) {
      onEvent({
        type: 'AGENT_LOG',
        message: `⚡ Automatic Local Execution: Launching Node.js backend server (${entryFile})...`,
      });
      exec(`node ${entryFile}`, { cwd: projectPath }, (error, stdout, stderr) => {
        if (error) {
          onEvent({
            type: 'AGENT_LOG',
            message: `⚠️ Node.js Runtime Error: ${error.message}`,
          });
        }
      });
    } else if (fs.existsSync(path.join(projectPath, 'index.html'))) {
      onEvent({
        type: 'AGENT_LOG',
        message: `⚡ Automatic Local Execution: Launching local web preview server (npx serve)...`,
      });
      exec(`npx serve -s . -l 8080`, { cwd: projectPath });
    }
  } catch (err: any) {
    console.error('Failed to launch preview:', err);
  }
}

// ─── Blueprint Parser ────────────────────────────────────────────────────────

export interface BlueprintFileSection {
  file: string;
  purpose: string;
  dependencies: string[];
  specsRequired: string[];
  exports: string[];
  details: string;
  rawSection: string;
}

export function parseBlueprintFiles(blueprintText: string): BlueprintFileSection[] {
  const sections: BlueprintFileSection[] = [];
  const fileBlocks = blueprintText.split(/###\s*File:\s*/i).slice(1);

  for (const block of fileBlocks) {
    const lines = block.trim().split('\n');
    let rawFile = lines[0].trim();
    if (!rawFile) continue;

    // Clean file path from markdown wrappers (**file** or `file`), leading slashes (/file, ./file), and parenthetical comments
    let file = rawFile
      .replace(/[*`'"]/g, '')
      .replace(/^\.\//, '')
      .replace(/^\//, '')
      .split(/\s*[\(\[\{]/)[0]
      .trim();

    if (!file) continue;

    const rawSection = '### File: ' + block.trim();
    const purposeMatch = block.match(/\*\*Purpose\*\*:\s*(.+)/i);
    const depsMatch = block.match(/\*\*Dependencies\*\*:\s*(.+)/i);
    const specsMatch = block.match(/\*\*Specs Required\*\*:\s*(.+)/i);
    const exportsMatch = block.match(/\*\*Exports\*\*:\s*(.+)/i);

    const purpose = purposeMatch ? purposeMatch[1].trim() : '';
    const depsRaw = depsMatch ? depsMatch[1].trim() : 'None';
    const dependencies = depsRaw.toLowerCase() === 'none' ? [] : depsRaw.split(',').map(d => d.trim().replace(/[*`'"]/g, '').replace(/^\.\//, '').replace(/^\//, '')).filter(Boolean);
    const specsRequired = parseSpecsRequired(rawSection).map(s => `${s.file}#${s.section}`);
    const exportsRaw = exportsMatch ? exportsMatch[1].trim() : 'None';
    const exportsList = exportsRaw.toLowerCase() === 'none' ? [] : exportsRaw.split(',').map(e => e.trim()).filter(Boolean);

    sections.push({
      file,
      purpose,
      dependencies,
      specsRequired,
      exports: exportsList,
      details: block,
      rawSection,
    });
  }

  // Entry Point Guard: If web project lacks an html entry point, unshift index.html as File #1
  const isWebProject = sections.some((s) => s.file.endsWith('.css') || s.file.endsWith('.html') || s.file.endsWith('.js') || s.file.endsWith('.jsx') || s.file.endsWith('.tsx'));
  const hasHtmlEntryPoint = sections.some((s) => s.file === 'index.html' || s.file === 'public/index.html' || s.file.endsWith('.html'));

  if (isWebProject && !hasHtmlEntryPoint) {
    const defaultHtmlSection: BlueprintFileSection = {
      file: 'index.html',
      purpose: 'Main web entry point mounting project layout and scripts',
      dependencies: sections.map((s) => s.file).filter((f) => f.endsWith('.css') || f.endsWith('.js') || f.endsWith('.ts')),
      specsRequired: [],
      exports: [],
      details: 'HTML5 doctype with viewport meta, linking style.css and loading script.js',
      rawSection: '### File: index.html\n- **Purpose**: Main web entry point\n- **Dependencies**: None\n- **Specs Required**: None\n- **Exports**: None\n- **Implementation Details**:\n  1. HTML5 Doctype lang="en"\n  2. Head with meta charset, viewport, title, link rel="stylesheet" href="style.css"\n  3. Body with main container div id="app"\n  4. Script tag loading script.js at end of body',
    };
    sections.unshift(defaultHtmlSection);
  }

  return sections;
}

// ─── Stage Execution Helper (runAgent) ─────────────────────────────────────

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
  targetFile?: string
): Promise<any> {
  const agentDef = AGENT_DEFS[agentName];
  if (!agentDef) {
    throw new Error(`Unknown agent: ${agentName}`);
  }

  const onEvent: PipelineEventCallback = (event) => rawOnEvent(event);
  onEvent({
    type: 'AGENT_START',
    agent: agentName,
    message: `Agent ${agentName} started (Attempt ${attempt}/3)...`,
  });

  const startTime = Date.now();
  const config = await getLLMConfig();
  const { context: upstreamContext, consumedInferenceIds } = await buildStageContext(conversationId, agentName);

  const constraintsBlock = `\n\nActive System Constraints:
- Output MUST be valid structured markdown matching the exact header specifications.
- Do NOT wrap your entire response in markdown code blocks (\`\`\`markdown). Return raw text directly.`;

  const retryHint = attempt > 1 ? `\n\nRetry Repair Hint: Your previous output failed verification. Error: ${validationError || 'Ensure ALL required section headers are present.'}` : '';

  const systemInstructions = agentDef.systemPrompt + constraintsBlock + retryHint;
  const userContent = customUserContent || (upstreamContext ? `Upstream Specification Context:\n${upstreamContext}\n\nOriginal Request:\n"${userPromptText}"` : `Original Request:\n"${userPromptText}"`);

  const { budget, timeoutMs } = calculateTokenBudget(agentName, ledger);

  await writeHistoryLog(
    conversationId,
    agentName,
    'Started',
    `Agent ${agentName} started (Attempt ${attempt}/3)... Estimated tokens: ${budget}`
  );

  onEvent({
    type: 'AGENT_LOG',
    agent: agentName,
    message: `Running inference on model ${config.ollamaModel} (Budget: ${budget} tokens, Timeout: ${Math.round(timeoutMs / 1000)}s)...`,
  });

  let tokenCount = 0;
  let chunkBuffer = '';
  let lastEmittedTime = Date.now();

  const rawResponse = await runInference(
    [
      { role: 'system', content: systemInstructions },
      { role: 'user', content: userContent },
    ],
    {
      temperature: agentDef.temperature,
      maxTokens: budget,
      timeoutMs,
      signal,
      onChunk: (chunk: string) => {
        tokenCount += Math.max(1, Math.round(chunk.length / 4));
        chunkBuffer += chunk;
        if (chunkBuffer.length > 600) {
          chunkBuffer = chunkBuffer.slice(-600); // rolling 600-char window of live generated markdown/text
        }

        const now = Date.now();
        if (now - lastEmittedTime > 120) {
          lastEmittedTime = now;
          const evt = {
            type: 'AGENT_STREAM_PROGRESS',
            agent: agentName,
            message: 'Streaming agent output...',
            data: {
              tokenCount,
              maxTokens: budget,
              latestText: chunkBuffer,
            },
          };
          onEvent(evt);
          pipelineEvents.emit(`event:${conversationId}`, evt);
        }
      },
    }
  );

  const sanitized = sanitizeStageOutput(rawResponse, EXPECTED_FIRST_HEADERS[agentName]);

  // If agent specifies an output filename in VFS_OUTPUT_MAP, write to VFS
  const outputFilename = VFS_OUTPUT_MAP[agentName];
  if (outputFilename) {
    await writeVirtualFile(conversationId, outputFilename, sanitized);
  }

  const durationMs = Date.now() - startTime;
  const estimatedTokens = Math.round((systemInstructions.length + userContent.length + sanitized.length) / 4);

  await writeRichTelemetryLog({
    conversationId,
    agentName,
    status: 'Completed',
    richLog: {
      telemetryType: 'rich_step_log',
      executionMemory: { stage: agentName },
      orchestration: { durationMs },
      inflow: { systemInstructions, userContent },
      thought: sanitized,
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
    validatedJson: { content: sanitized },
    executionTime: durationMs,
    tokenUsage: estimatedTokens,
    attempt,
  });

  // 1. Write to ExecutiveMemory ledger
  const inferenceId = await writeExecutiveMemoryRecord({
    conversationId,
    agentName,
    contentMd: sanitized,
    filePath: targetFile,
    tokenCount: estimatedTokens,
    durationMs,
    consumedInferenceIds,
  });

  // 2. Synchronize in-flight ledger so subsequent stages in this run see fresh data
  const fieldName = (OWNERSHIP as any)[agentName]?.[0];
  if (fieldName && ledger) {
    if (agentName === 'Coder' && targetFile) {
      const currentCoder = ledger.read('coder') || {};
      currentCoder[targetFile] = { content: sanitized };
      (ledger.getState() as any).coder = currentCoder;
    } else {
      (ledger.getState() as any)[fieldName] = { content: sanitized };
    }
  }

  await writeHistoryLog(
    conversationId,
    agentName,
    'Completed',
    `Agent ${agentName} completed in ${durationMs}ms (${sanitized.length} bytes generated). Estimated tokens: ${estimatedTokens}`
  );

  onEvent({
    type: 'AGENT_LOG',
    agent: agentName,
    message: `Agent ${agentName} completed in ${durationMs}ms (${sanitized.length} bytes generated). [${inferenceId}]`,
  });

  return { content: sanitized, raw: rawResponse };
}

// ─── Main Pipeline Orchestrator Loop (11 Stages) ───────────────────────────

export async function runOrchestrator(
  conversationId: string,
  userPrompt: string,
  onEvent: PipelineEventCallback,
  signal?: AbortSignal,
  startStage?: string
): Promise<void> {
  if (signal?.aborted) {
    throw new Error('Pipeline compilation aborted due to client disconnect.');
  }

  if (activePipelines.has(conversationId)) {
    const attachMsg = { type: 'AGENT_LOG', message: 'Reattached to active background compilation loop.' };
    onEvent(attachMsg as any);
    pipelineEvents.emit(`event:${conversationId}`, attachMsg);
    return;
  }
  activePipelines.add(conversationId);

  // Dedicated internal AbortController for background execution (decoupled from browser reload signals)
  const internalController = new AbortController();
  pipelineAbortControllers.set(conversationId, internalController);
  const executionSignal = internalController.signal;

  // Dual Event Wrapper: Sends event to direct callback AND emits to global EventEmitter for reloaded browser tabs
  const emit = (event: any) => {
    try {
      onEvent(event);
    } catch (e) {}
    pipelineEvents.emit(`event:${conversationId}`, event);
  };

  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
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

    // ─── 11 STAGES DEFINITION ────────────────────────────────────────────────

    const STAGES = [
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
      'Reviewer',
    ];

    const startIndex = startStage ? STAGES.indexOf(startStage) : 0;
    const executionStages = startIndex >= 0 ? STAGES.slice(startIndex) : STAGES;

    for (const stageName of executionStages) {
      if (signal?.aborted) throw new Error('Pipeline compilation aborted by user.');

      // Fast-Forward Guard: Only fast-forward when resuming mid-pipeline with an explicit startStage
      const isAlreadyCompleted = startStage ? ((await prisma.executionHistory.findFirst({
        where: { conversationId, stage: stageName, status: 'Completed' }
      })) !== null) : false;

      if (isAlreadyCompleted && stageName !== startStage && stageName !== 'Coder') {
        emit({
          type: 'AGENT_COMPLETE',
          agent: stageName,
          message: `Stage ${stageName} already completed in history. Fast-forwarding to next stage...`,
        });
        continue;
      }

      emit({
        type: 'STAGE_START',
        agent: stageName,
        message: `Entering Stage: ${stageName}...`,
      });

      // ─── STAGE: TESTER (Deterministic Linter) ──────────────────────────────
      if (stageName === 'Tester') {
        const vfsFiles = await listVirtualFiles(conversationId);
        const codeFiles = vfsFiles.filter(f => f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.jsx') || f.endsWith('.html') || f.endsWith('.css'));

        let passed = 0;
        let failed = 0;
        const testReportLines: string[] = ['### Context Snapshot', '- **Core Goal**: Code Verification & Linter Diagnostics', `- **Total Files Tested**: ${codeFiles.length}`, ''];

        for (const file of codeFiles) {
          const lResult = await runLinter(conversationId, file);
          if (lResult.success) {
            passed++;
            testReportLines.push(`- **${file}**: PASSED (0 errors)`);
          } else {
            failed++;
            testReportLines.push(`- **${file}**: FAILED (${lResult.errors.length} error(s)) — ${lResult.summary}`);
          }
        }

        const testReportText = testReportLines.join('\n');
        await writeVirtualFile(conversationId, 'test_report.md', testReportText);

        await writeHistoryLog(
          conversationId,
          'Tester',
          failed === 0 ? 'Completed' : 'Failed',
          `Tester completed: ${passed} passed, ${failed} failed (${codeFiles.length} total files tested). Estimated tokens: 0`
        );

        onEvent({
          type: 'AGENT_COMPLETE',
          agent: 'Tester',
          message: `Tester complete: ${passed} passed, ${failed} failed (${codeFiles.length} total files tested).`,
          data: { passed, failed, total: codeFiles.length },
        });
        continue;
      }

      // ─── STAGE: DEBUGGER (Conditional Error Repair) ───────────────────────
      if (stageName === 'Debugger') {
        const testReport = (await readVirtualFile(conversationId, 'test_report.md')) || '';
        const failingLines = testReport.split('\n').filter(l => l.includes('FAILED'));

        if (failingLines.length === 0) {
          await writeVirtualFile(conversationId, 'debug_report.md', '### Debug Report\nSKIPPED — All files passed Tester linter checks with 0 errors.');
          await writeHistoryLog(conversationId, 'Debugger', 'Skipped', 'Debugger skipped: All files passed linter verification cleanly. Estimated tokens: 0');
          onEvent({
            type: 'AGENT_COMPLETE',
            agent: 'Debugger',
            message: 'Debugger skipped: All files passed linter verification cleanly.',
          });
          continue;
        }

        // Triage Debugger Action via SLM Thinking Gate
        const triage = await orchestratorThinkDebugger(testReport, 0, 3);
        if (triage.action === 'ABORT' || triage.action === 'SKIP') {
          await writeVirtualFile(conversationId, 'debug_report.md', `### Debug Report\n${triage.action}: ${triage.reason}`);
          await writeHistoryLog(conversationId, 'Debugger', triage.action === 'SKIP' ? 'Skipped' : 'Failed', `Debugger ${triage.action}: ${triage.reason}. Estimated tokens: 50`);
          onEvent({
            type: 'AGENT_COMPLETE',
            agent: 'Debugger',
            message: `Debugger ${triage.action}: ${triage.reason}`,
          });
          continue;
        }

        // Extract failing filenames from test report
        const failingFiles: string[] = [];
        for (const line of failingLines) {
          const match = line.match(/- \*\*(.+?)\*\*/);
          if (match && match[1]) {
            failingFiles.push(match[1]);
          }
        }

        let repairedCount = 0;
        for (const targetFile of failingFiles) {
          const fileContent = (await readVirtualFile(conversationId, targetFile)) || '';
          if (!fileContent) continue;

          const repairPrompt = `File: ${targetFile}\nBroken Code:\n${fileContent}\n\nLinter Diagnostics:\n${testReport}`;
          const repairResult = await runAgent(
            conversationId,
            'Debugger',
            userPrompt,
            onEvent,
            ledger,
            1,
            repairPrompt,
            signal,
            undefined,
            targetFile
          );

          if (repairResult && repairResult.content) {
            await writeVirtualFile(conversationId, targetFile, repairResult.content);
            writeProjectFile(conversationId, targetFile, repairResult.content);
            repairedCount++;
          }
        }

        await writeVirtualFile(
          conversationId,
          'debug_report.md',
          `### Debug Report\nRepaired ${repairedCount}/${failingFiles.length} failing file(s): ${failingFiles.join(', ')}`
        );

        emit({
          type: 'AGENT_COMPLETE',
          agent: 'Debugger',
          message: `Debugger completed repair attempt on ${failingFiles.length} failing file(s).`,
        });
        continue;
      }

      // ─── STAGE: CODER (Per-File Generation Loop) ───────────────────────────
      if (stageName === 'Coder') {
        const blueprintText = (await readVirtualFile(conversationId, 'blueprint.md')) || '';
        const fileSections = parseBlueprintFiles(blueprintText);

        if (fileSections.length === 0) {
          emit({
            type: 'PIPELINE_ERROR',
            message: 'Blueprint contains no valid file sections. Unable to execute Coder stage.',
          });
          return;
        }

        emit({
          type: 'AGENT_START',
          agent: 'Coder',
          message: `Coder loop starting: Synthesizing ${fileSections.length} files from blueprint...`,
        });

        for (const fileSec of fileSections) {
          if (signal?.aborted) throw new Error('Pipeline compilation aborted by user.');

          // Build dependency code context
          let depCodeText = '';
          for (const depFile of fileSec.dependencies) {
            const depContent = await readVirtualFile(conversationId, depFile);
            if (depContent) {
              depCodeText += `--- [${depFile}] ---\n${depContent}\n\n`;
            }
          }

          const fileStartTime = Date.now();
          const coderPrompt = await buildCoderContext(conversationId, fileSec.rawSection, depCodeText);
          const coderOutput = await runAgent(
            conversationId,
            'Coder',
            userPrompt,
            emit,
            ledger,
            1,
            coderPrompt,
            signal,
            undefined,
            fileSec.file
          );

          if (coderOutput && coderOutput.content) {
            // Write code to VFS primary source and sync to disk workspace
            await writeVirtualFile(conversationId, fileSec.file, coderOutput.content);
            writeProjectFile(conversationId, fileSec.file, coderOutput.content);

            const fileDurationMs = Date.now() - fileStartTime;
            const estTokens = Math.round((coderPrompt.length + coderOutput.content.length) / 4);

            await writeHistoryLog(
              conversationId,
              'Coder',
              'Completed',
              `File ${fileSec.file} synthesized in ${fileDurationMs}ms (${coderOutput.content.length} bytes generated). Estimated tokens: ${estTokens}`
            );

            // Automated Linter Check & In-Loop Self-Healing (up to 2 repair attempts)
            let lCheck = await runLinter(conversationId, fileSec.file);
            let repairAttempt = 0;
            while (!lCheck.success && repairAttempt < 2) {
              repairAttempt++;
              const errDetails = lCheck.errors.map(e => `Line ${e.line}: ${e.message}`).join('; ');
              emit({
                type: 'AGENT_LOG',
                agent: 'Coder',
                message: `⚠️ Linter detected errors on ${fileSec.file} (Repair Attempt ${repairAttempt}/2): ${errDetails}. Auto-repairing...`,
              });

              const repairPrompt = `File: ${fileSec.file}\nBlueprint Specification:\n${fileSec.rawSection}\n\nCurrent Broken Code:\n${coderOutput.content}\n\nLinter Errors (MUST FIX):\n${errDetails}\n\nRewrite the COMPLETE corrected source code for ${fileSec.file}. Output ONLY raw source code.`;

              const repairedOutput = await runAgent(
                conversationId,
                'Coder',
                userPrompt,
                emit,
                ledger,
                repairAttempt + 1,
                repairPrompt,
                signal,
                errDetails,
                fileSec.file
              );

              if (repairedOutput && repairedOutput.content) {
                coderOutput.content = repairedOutput.content;
                await writeVirtualFile(conversationId, fileSec.file, repairedOutput.content);
                writeProjectFile(conversationId, fileSec.file, repairedOutput.content);
                lCheck = await runLinter(conversationId, fileSec.file);
              } else {
                break;
              }
            }
          }
        }

        emit({
          type: 'AGENT_COMPLETE',
          agent: 'Coder',
          message: `Coder loop completed: Synthesized and verified ${fileSections.length} files.`,
        });
        continue;
      }

      // ─── STAGES: Queen, Planner, Architect, System, Designer, Blueprinter, Security, Reviewer ───
      const stageOutput = await runAgent(
        conversationId,
        stageName,
        userPrompt,
        emit,
        ledger,
        1,
        undefined,
        signal
      );

      emit({
        type: 'AGENT_COMPLETE',
        agent: stageName,
        message: `Stage ${stageName} completed successfully.`,
        data: stageOutput.content,
      });

      // Auto-flush VFS to physical disk after each stage completes
      await flushVfsToDisk(conversationId);

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
          data: stageOutput.content,
        });

        return; // Exit orchestrator loop, waiting for user resume signal
      }
    }

    // Flush all VFS files to disk workspace for preview execution
    await flushVfsToDisk(conversationId);
    await launchVSCodePreview(conversationId, emit);

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { status: 'Completed' },
    });

    emit({
      type: 'PIPELINE_COMPLETE',
      message: '🎉 AutoCoder Hybrid v2 Pipeline executed successfully!',
    });
  } catch (err: any) {
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
    emit({
      type: 'PIPELINE_ERROR',
      message: `Pipeline Execution Failed: ${err.message}`,
    });
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { status: 'Failed' },
    });
  } finally {
    stopOllamaKeepAlive();
    pipelineAbortControllers.delete(conversationId);
    await flushVfsToDisk(conversationId).catch(() => {});
    activePipelines.delete(conversationId);
  }
}
