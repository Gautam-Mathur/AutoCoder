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
import { writeVirtualFile, readVirtualFile, listVirtualFiles, applyDiff, flushVfsToDisk, safeWriteFileSync } from './vfs';
import { runLinter, runCrossFileImportCheck } from './linter';

// Global Event Emitter for decoupling browser SSE streams from background Node pipeline compilation
export const pipelineEvents = new EventEmitter();
pipelineEvents.setMaxListeners(100);

export const activePipelines = new Set<string>();
export const pipelineAbortControllers = new Map<string, AbortController>();

export async function abortPipelineExecution(conversationId: string): Promise<void> {
  const controller = pipelineAbortControllers.get(conversationId);
  if (controller) {
    controller.abort();
    pipelineAbortControllers.delete(conversationId);
  }
  activePipelines.delete(conversationId);

  try {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { status: 'Cancelled' },
    });
    await prisma.pipelineRun.upsert({
      where: { conversationId },
      update: { state: 'CANCELLED' },
      create: { conversationId, state: 'CANCELLED' },
    });
  } catch (e) {
    console.error(`Failed to update database status to Cancelled for ${conversationId}:`, e);
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

    const cleaned = cleanJsonResponse(responseText);
    const parsed = JSON.parse(cleaned);
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
  'Blueprinter': [],  // Handler provides full VFS context directly — no upstream map needed
  'Security':    ['Queen'],
  'Reviewer':    ['Queen', 'Planner', 'Architect'],
};

const EXPECTED_FIRST_HEADERS: Record<string, string> = {
  'Queen':       'Context Snapshot',
  'Planner':     'Context Snapshot',
  'Architect':   'Context Snapshot',
  // System intentionally excluded — has two valid first headers
  'Designer':    'Context Snapshot',
  'Blueprinter': 'File:',
  'Security':    'Overall Status',
  'Reviewer':    'Overall Assessment',
  // Coder intentionally excluded — outputs raw code
};

const MAX_SNAPSHOT_CHARS = 2000;

function truncateAtBullet(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const lines = text.split('\n');
  let result = '';
  for (const line of lines) {
    if ((result + '\n' + line).length > maxChars) break;
    result += (result ? '\n' : '') + line;
  }
  return result + '\n...[SNAPSHOT TRUNCATED]';
}

/**
 * Extracts a markdown section by name, capturing all content until the next
 * heading of the SAME or HIGHER level. Sub-headings within the section are included.
 */
function extractMdSection(content: string, sectionName: string): string {
  const escaped = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const headerMatch = content.match(new RegExp(`(#{1,4})\\s*${escaped}`, 'i'));
  if (!headerMatch || headerMatch.index === undefined) return '';

  const headingLevel = headerMatch[1].length;
  const startIdx = headerMatch.index;
  const rest = content.substring(startIdx + headerMatch[0].length);

  // Find next heading of same or higher level (fewer or equal #'s)
  const endPattern = new RegExp(`\\n#{1,${headingLevel}}\\s+[^#]`);
  const nextHeading = rest.match(endPattern);

  if (nextHeading && nextHeading.index !== undefined) {
    return content.substring(startIdx, startIdx + headerMatch[0].length + nextHeading.index).trim();
  }
  return content.substring(startIdx).trim();
}

// ─── Snapshot Extraction & Context Assembly ──────────────────────────────────

export async function extractSnapshot(conversationId: string, vfsPath: string): Promise<string> {
  const fullContent = (await readVirtualFile(conversationId, vfsPath)) || '';
  if (!fullContent) return '';

  // Tier 1: Extract using heading-aware parser
  const snapshotSection = extractMdSection(fullContent, 'Context Snapshot');
  if (snapshotSection) {
    return truncateAtBullet(snapshotSection, MAX_SNAPSHOT_CHARS);
  }

  // Tier 2: Fuzzy match
  const fuzzy = fullContent.match(/(#+)?\s*(context|snapshot|summary|overview)[\s\S]*?(?=\n#{1,4}\s[^#]|$)/i);
  if (fuzzy) {
    let snapshotText = fuzzy[0].trim();
    return truncateAtBullet(snapshotText, MAX_SNAPSHOT_CHARS);
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
  const snapshotSection = extractMdSection(content, 'Context Snapshot');
  if (snapshotSection) {
    return truncateAtBullet(snapshotSection, MAX_SNAPSHOT_CHARS);
  }
  const fuzzy = content.match(/(#+)?\s*(context|snapshot|summary|overview)[\s\S]*?(?=\n#{1,4}\s[^#]|$)/i);
  if (fuzzy) {
    let snapshotText = fuzzy[0].trim();
    return truncateAtBullet(snapshotText, MAX_SNAPSHOT_CHARS);
  }
  return content.substring(0, 800) + (content.length > 800 ? '\n...[TRUNCATED]' : '');
}

async function getTypedStageContext(conversationId: string, agentName: string): Promise<string | null> {
  try {
    if (agentName === 'Queen') {
      const q = await prisma.queenStageOutput.findUnique({ where: { conversationId } });
      if (q) return `=== ORIGINAL USER INTENT ===\nProject: ${q.projectName}\nGoal: ${q.goal || q.summary || ''}\nProblem: ${q.problemStatement || ''}`;
    } else if (agentName === 'Planner') {
      const p = await prisma.plannerStageOutput.findUnique({ where: { conversationId } });
      if (p) return `--- [FROM Planner] ---\nFeatures: ${p.features || ''}\nRequirements: ${p.functionalRequirements || ''}`;
    } else if (agentName === 'Architect') {
      const a = await prisma.architectStageOutput.findUnique({ where: { conversationId } });
      if (a) return `--- [FROM Architect] ---\nStyle: ${a.architectureStyle || ''}\nStructure: ${a.projectStructure || ''}`;
    } else if (agentName === 'System') {
      const s = await prisma.systemStageOutput.findUnique({ where: { conversationId } });
      if (s) return `--- [FROM System] ---\nDB: ${s.databaseType || ''}\nAPIs: ${s.apis || ''}`;
    }
  } catch (e) {}
  return null;
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
    // Tier 0: Attempt to read structured typed context from dedicated DB tables first
    const typedContext = await getTypedStageContext(conversationId, agentName);
    if (typedContext) {
      context += `${typedContext}\n\n`;
      continue;
    }

    // Tier 1: Fallback to reading executive memory markdown snapshot
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
    cleaned = cleaned.substring(headerMatch.index);
  }

  return cleaned.trim();
}

export function sanitizeCoderOutput(raw: string): string {
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```[a-zA-Z0-9_+.-]*\r?\n?/gm, '').replace(/\r?\n?```\s*$/gm, '');
  const codeStart = cleaned.search(/^(<[!a-zA-Z\/]|[a-zA-Z_$\/*{]|import |const |let |var |function |class |\/\/|\/\*|#!|\s*<!)/m);
  if (codeStart > 5) cleaned = cleaned.substring(codeStart);
  const trailingIdx = cleaned.search(/\n{2,}(?:I hope|This implementation|This code|Note:|The above|Feel free|Let me know)/i);
  if (trailingIdx > 0) cleaned = cleaned.substring(0, trailingIdx);

  // Detect lazy placeholder patterns — log warning but keep content for linter to catch
  const placeholderPattern = /\/\/\s*\.\.\.?\s*(rest of|existing|unchanged|same as|remaining|previous)/i;
  if (placeholderPattern.test(cleaned)) {
    console.warn(`[WARN] Coder output contains lazy placeholder: "${cleaned.match(placeholderPattern)?.[0]}". Content preserved for linter detection.`);
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
  const section = extractMdSection(fullContent, sectionName);
  if (section) return section;
  return `[Section "${sectionName}" not found in ${vfsPath}]`;
}

export function extractDependencyInterface(filePath: string, content: string): string {
  if (filePath.endsWith('.html')) {
    const ids = [...content.matchAll(/\bid=["']([^"']+)["']/g)].map(m => m[1]);
    const cssLinks = [...content.matchAll(/href=["']([^"']+\.css)["']/g)].map(m => m[1]);
    const jsLinks = [...content.matchAll(/src=["']([^"']+\.js)["']/g)].map(m => m[1]);
    return `[HTML] IDs: ${[...new Set(ids)].join(', ') || 'none'} | CSS links: ${cssLinks.join(', ') || 'none'} | Scripts: ${jsLinks.join(', ') || 'none'}`;
  }
  if (filePath.endsWith('.css')) {
    const selectors = [...content.matchAll(/^([.#][\w-]+)/gm)].map(m => m[1]);
    const vars = [...content.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]);
    return `[CSS] Selectors: ${[...new Set(selectors)].join(', ') || 'none'} | Variables: ${[...new Set(vars)].join(', ') || 'none'}`;
  }
  if (/\.(js|ts|jsx|tsx)$/.test(filePath)) {
    const named = [...content.matchAll(/export\s+(?:async\s+)?(?:function|const|class|let|var|type|interface|enum)\s+(\w+)/g)].map(m => m[1]);
    const reExports = [...content.matchAll(/export\s*\{([^}]+)\}/g)].flatMap(m =>
      m[1].split(',').map(s => s.trim().split(/\s+as\s+/).pop()!.trim()).filter(Boolean)
    );
    const dflt = content.match(/export\s+default\s+(?:class|function)?\s*(\w+)/)?.[1];
    const allExports = [...new Set([...named, ...reExports, ...(dflt ? [`default:${dflt}`] : [])])];
    return `[JS/TS] Exports: ${allExports.join(', ') || 'none'}`;
  }
  return content.substring(0, 300);
}

export async function buildCoderContext(
  conversationId: string,
  blueprintSection: string,
  dependencyInterfaces: string
): Promise<string> {
  const fileMatch = blueprintSection.match(/###\s*File:\s*(.+)/i);
  const fileName = fileMatch ? fileMatch[1].trim().replace(/[*`'"]/g, '').split(/\s*[(\[{]/)[0].trim() : 'unknown';
  let context = `TARGET FILE: ${fileName}\n\n`;

  // Inject Design System (Designer) — color palette, font, spacing
  const uiSpec = await readVirtualFile(conversationId, 'ui_spec.md');
  if (uiSpec) {
    const dsSection = extractMdSection(uiSpec, 'Design System');
    if (dsSection) context += `=== DESIGN SYSTEM ===\n${dsSection}\n\n`;
  }

  // Inject API Endpoints (System)
  const backendSpec = await readVirtualFile(conversationId, 'backend_spec.md');
  if (backendSpec) {
    const apiSection = extractMdSection(backendSpec, 'API Endpoints');
    if (apiSection) context += `=== API ENDPOINTS ===\n${apiSection}\n\n`;
  }

  // Inject Database Schema (System) — critical for API route files and services
  if (backendSpec) {
    const dbSection = extractMdSection(backendSpec, 'Database Design');
    if (dbSection) context += `=== DATABASE SCHEMA (DO NOT DEVIATE) ===\n${dbSection}\n\n`;
  }

  // Inject Component Prop Contracts (Designer) — critical for frontend files
  if (uiSpec && /\.(jsx|tsx|js|html)$/.test(fileName)) {
    const compSection = extractMdSection(uiSpec, 'Components');
    if (compSection) context += `=== COMPONENT PROP CONTRACTS (USE EXACT PROP NAMES) ===\n${compSection}\n\n`;
  }

  if (dependencyInterfaces) context += `=== DEPENDENCY INTERFACES ===\n${dependencyInterfaces}\n\n`;

  const specsNeeded = parseSpecsRequired(blueprintSection);
  if (specsNeeded.length > 0) {
    context += `=== REFERENCED SPECS ===\n`;
    for (const spec of specsNeeded) {
      const sectionText = await extractSection(conversationId, spec.file, spec.section);
      context += `--- [${spec.file}#${spec.section}] ---\n${sectionText}\n\n`;
    }
  }

  // Blueprint at BOTTOM — highest LLM attention zone
  context += `=== IMPLEMENTATION BLUEPRINT — FOLLOW EXACTLY ===\n${blueprintSection}`;
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
  safeWriteFileSync(fullPath, normalizedContent);
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
      .trim()
      .replace(/\/+$/, '');

    if (!file || rawFile.trim().endsWith('/') || rawFile.trim().endsWith('/`')) continue;

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

  // Entry Point Guard: Only unshift static index.html if web project lacks HTML and is NOT a Next.js/SSR framework app
  const isWebProject = sections.some((s) => s.file.endsWith('.css') || s.file.endsWith('.html') || s.file.endsWith('.js') || s.file.endsWith('.jsx') || s.file.endsWith('.tsx'));
  const hasHtmlEntryPoint = sections.some((s) => s.file === 'index.html' || s.file === 'public/index.html' || s.file.endsWith('.html'));
  const isFrameworkApp = sections.some((s) => s.file.startsWith('pages/') || s.file.startsWith('app/') || s.file === 'next.config.js' || s.file === 'vite.config.js');

  if (isWebProject && !hasHtmlEntryPoint && !isFrameworkApp) {
    const cssFiles = sections.filter(s => s.file.endsWith('.css')).map(s => s.file);
    const jsFiles = sections.filter(s => /\.(js|ts)$/.test(s.file)).map(s => s.file);
    const primaryCss = cssFiles[0] || 'style.css';
    const primaryJs = jsFiles[jsFiles.length - 1] || 'script.js';
    const allDeps = [...cssFiles, ...jsFiles];
    const defaultHtmlSection: BlueprintFileSection = {
      file: 'index.html',
      purpose: 'Main web entry point mounting project layout and scripts',
      dependencies: allDeps,
      specsRequired: [],
      exports: [],
      details: `HTML5 entry linking ${primaryCss} and loading ${primaryJs}`,
      rawSection: `### File: index.html\n- **Purpose**: Main web entry point\n- **Dependencies**: ${allDeps.join(', ') || 'None'}\n- **Specs Required**: None\n- **Exports**: None\n- **Implementation Details**:\n  1. HTML5 Doctype lang="en"\n  2. Head with meta charset="UTF-8", viewport meta, descriptive title\n  3. Head: <link rel="stylesheet" href="${primaryCss}">\n  4. Body with main container div id="app"\n  5. End of body: <script src="${primaryJs}" defer></script>`,
    };
    sections.unshift(defaultHtmlSection);
  }

  return sections;
}

/**
 * Validates that blueprint dependencies reference files that actually exist in the blueprint.
 */
export function validateBlueprintImports(sections: BlueprintFileSection[]): string[] {
  const allFiles = new Set(sections.map(s => s.file));
  const warnings: string[] = [];
  for (const section of sections) {
    for (const dep of section.dependencies) {
      const normalizedDep = dep.replace(/^\.\.\//, '').replace(/^\.\//, '').replace(/^\//, '');
      if (!allFiles.has(normalizedDep) && !allFiles.has(dep)) {
        warnings.push(
          `Blueprint Warning: "${section.file}" lists dependency "${dep}" which is not defined as a ### File: section.`
        );
      }
    }
  }
  return warnings;
}

export function extractFilesFromArchitecture(archContent: string): string[] {
  const files: string[] = [];
  if (!archContent) return files;

  // 1. Extract from "Owned Files: file1, file2" in Modules section
  const ownedMatches = archContent.matchAll(/Owned Files:\s*([^\n]+)/gi);
  for (const match of ownedMatches) {
    const parts = match[1].split(/[,;]/).map((s) => s.trim());
    for (const p of parts) {
      const clean = p.replace(/[*`'"]/g, '').replace(/^\.\//, '').replace(/^\//, '').split(/\s*[\(\[\{]/)[0].trim();
      if (clean && clean.toLowerCase() !== 'none' && !clean.endsWith('/') && !files.includes(clean)) {
        files.push(clean);
      }
    }
  }

  // 2. Stack-based ASCII Folder Tree Parser (preserves nested directory paths)
  if (files.length === 0) {
    const treeMatch = archContent.match(/### Project Folder Structure([\s\S]*?)(###|$)/i);
    if (treeMatch) {
      const lines = treeMatch[1].split('\n');
      const dirStack: { depth: number; path: string }[] = [];

      for (const line of lines) {
        if (!line.trim() || line.trim().startsWith('#')) continue;

        // Calculate depth from leading spaces and branch characters
        const indentMatch = line.match(/^([│├└─\s]*)/);
        const indentStr = indentMatch ? indentMatch[1] : '';
        const depth = Math.floor(indentStr.replace(/│/g, ' ').length / 2);

        const cleanItem = line.replace(/[│├└─\s]/g, '').replace(/[*`'"]/g, '').trim();
        if (!cleanItem || cleanItem.startsWith('project-root') || cleanItem === 'project-root/') continue;

        const nameOnly = cleanItem.split(/\s*[\(\[\{]/)[0].replace(/^\.\//, '').replace(/^\//, '').trim();
        if (!nameOnly) continue;

        // Pop directories from stack deeper or equal to current depth
        while (dirStack.length > 0 && dirStack[dirStack.length - 1].depth >= depth) {
          dirStack.pop();
        }

        const parentPath = dirStack.map((d) => d.path).join('');

        if (nameOnly.endsWith('/') || (!nameOnly.includes('.') && !nameOnly.startsWith('['))) {
          // Directory entry
          const dirName = nameOnly.endsWith('/') ? nameOnly : `${nameOnly}/`;
          dirStack.push({ depth, path: dirName });
        } else {
          // File entry
          const fullPath = `${parentPath}${nameOnly}`;
          if (!files.includes(fullPath)) {
            files.push(fullPath);
          }
        }
      }
    }
  }

  return files;
}

/**
 * Post-Pass HTML Asset Link Synchronizer.
 * Inspects generated HTML files and ensures all created CSS and JS files in VFS
 * are properly linked (<link rel="stylesheet"> and <script src="...">).
 */
export function syncHtmlAssetLinks(
  htmlContent: string,
  allFiles: string[]
): { updatedHtml: string; syncedLinks: string[] } {
  let updatedHtml = htmlContent;
  const syncedLinks: string[] = [];

  const cssFiles = allFiles.filter((f) => f.endsWith('.css'));
  const jsFiles = allFiles.filter(
    (f) =>
      /\.(js|ts|jsx|tsx)$/.test(f) &&
      !f.endsWith('.d.ts') &&
      !f.includes('config') &&
      !f.includes('test')
  );

  const lowerHtml = updatedHtml.toLowerCase();

  // 1. Sync CSS files
  for (const cssFile of cssFiles) {
    const cssBasename = cssFile.split('/').pop() || cssFile;
    const isLinked = updatedHtml.includes(cssFile) || updatedHtml.includes(cssBasename);

    if (!isLinked) {
      const linkTag = `  <link rel="stylesheet" href="${cssFile}">\n`;
      if (lowerHtml.includes('</head>')) {
        updatedHtml = updatedHtml.replace(/<\/head>/i, `${linkTag}</head>`);
      } else {
        updatedHtml = `${linkTag}` + updatedHtml;
      }
      syncedLinks.push(`Connected stylesheet <link rel="stylesheet" href="${cssFile}"> to <head>`);
    }
  }

  // 2. Sync JS / TS script files
  for (const jsFile of jsFiles) {
    const jsBasename = jsFile.split('/').pop() || jsFile;
    const isLinked = updatedHtml.includes(jsFile) || updatedHtml.includes(jsBasename);

    if (!isLinked) {
      const scriptTag = `  <script src="${jsFile}" defer></script>\n`;
      if (lowerHtml.includes('</body>')) {
        updatedHtml = updatedHtml.replace(/<\/body>/i, `${scriptTag}</body>`);
      } else if (lowerHtml.includes('</head>')) {
        updatedHtml = updatedHtml.replace(/<\/head>/i, `${scriptTag}</head>`);
      } else {
        updatedHtml = updatedHtml + `\n${scriptTag}`;
      }
      syncedLinks.push(`Connected script <script src="${jsFile}" defer></script> before </body>`);
    }
  }

  return { updatedHtml, syncedLinks };
}

/**
 * File-type-specific sanitizer for Coder output.
 * Strips LLM preamble from .prisma, .json, and .html files.
 */
export function sanitizeCoderOutputForFile(raw: string, filePath?: string): string {
  let cleaned = sanitizeCoderOutput(raw);

  if (filePath?.endsWith('.prisma')) {
    const prismaStart = cleaned.search(/^(datasource|generator|model|enum)\s+/m);
    if (prismaStart > 0) cleaned = cleaned.substring(prismaStart);
  }

  if (filePath?.endsWith('.json')) {
    const jsonStart = cleaned.search(/[{\[]/);
    if (jsonStart > 0) {
      const candidate = cleaned.substring(jsonStart);
      try { JSON.parse(candidate); cleaned = candidate; } catch { /* keep original */ }
    }
  }

  if (filePath?.endsWith('.html')) {
    const htmlStart = cleaned.search(/<!DOCTYPE|<html/i);
    if (htmlStart > 0) cleaned = cleaned.substring(htmlStart);
  }

  return cleaned.trim();
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

  const systemInstructions = agentDef.systemPrompt + constraintsBlock;
  const retryPrefix = attempt > 1 ? `[RETRY ${attempt}/3] Your previous output failed verification. Error: ${validationError || 'Ensure ALL required section headers are present.'}.\n\n` : '';
  const baseUserContent = customUserContent || (upstreamContext ? `Upstream Specification Context:\n${upstreamContext}\n\nOriginal Request:\n"${userPromptText}"` : `Original Request:\n"${userPromptText}"`);
  const userContent = retryPrefix + baseUserContent;

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
      model: agentDef.model,
      temperature: agentDef.temperature,
      maxTokens: budget,
      timeoutMs,
      signal,
      onChunk: (chunk: string) => {
        tokenCount += Math.max(1, Math.round(chunk.length / 4));
        chunkBuffer += chunk;
        if (chunkBuffer.length > 4000) {
          chunkBuffer = chunkBuffer.slice(-4000); // rolling 4000-char window of live generated code/markdown
        }

        const now = Date.now();
        if (now - lastEmittedTime > 120) {
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
            message: 'Streaming agent output...',
            data: {
              tokenCount,
              maxTokens: budget,
              latestText: chunkBuffer,
              targetFile: targetFile || undefined,
              apis: speculativeApis.slice(-5),
              entities: Array.from(new Set(speculativeEntities)).slice(-6),
              files: Array.from(new Set(speculativeFiles)).slice(-8),
            },
          };
          onEvent(evt);
          pipelineEvents.emit(`event:${conversationId}`, evt);
        }
      },
    }
  );

  const sanitized = sanitizeStageOutput(rawResponse, EXPECTED_FIRST_HEADERS[agentName]);
  let finalContent = sanitized;
  if (agentName === 'Coder') {
    const deepCleaned = sanitizeCoderOutputForFile(sanitized, targetFile);
    if (deepCleaned.length > 10) finalContent = deepCleaned;
  }

  // If agent specifies an output filename in VFS_OUTPUT_MAP, write to VFS
  const outputFilename = VFS_OUTPUT_MAP[agentName];
  if (outputFilename) {
    await writeVirtualFile(conversationId, outputFilename, finalContent);
  }

  const durationMs = Date.now() - startTime;
  const estimatedTokens = Math.round((systemInstructions.length + userContent.length + finalContent.length) / 4);

  await writeRichTelemetryLog({
    conversationId,
    agentName,
    status: 'Completed',
    richLog: {
      telemetryType: 'rich_step_log',
      executionMemory: { stage: agentName },
      orchestration: { durationMs },
      inflow: { systemInstructions, userContent },
      thought: finalContent,
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

  // 1. Write to ExecutiveMemory ledger
  const inferenceId = await writeExecutiveMemoryRecord({
    conversationId,
    agentName,
    contentMd: finalContent,
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
    `Agent ${agentName} completed in ${durationMs}ms (${finalContent.length} bytes generated). Estimated tokens: ${estimatedTokens}`
  );

  onEvent({
    type: 'AGENT_LOG',
    agent: agentName,
    message: `Agent ${agentName} completed in ${durationMs}ms (${finalContent.length} bytes generated). [${inferenceId}]`,
  });

  return { content: finalContent, raw: rawResponse };
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

  // Single Event Emission: Emits to global EventEmitter for browser SSE streams
  const emit = (event: any) => {
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
      if (executionSignal.aborted) throw new Error('Pipeline compilation aborted by user.');

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
        const fileRepairAttemptsMap = new Map<string, number>();
        for (const targetFile of failingFiles) {
          const attempts = (fileRepairAttemptsMap.get(targetFile) || 0) + 1;
          fileRepairAttemptsMap.set(targetFile, attempts);
          if (attempts > 2) {
            emit({
              type: 'AGENT_LOG',
              agent: 'Debugger',
              message: `⚠️ Max repair attempts (2) reached for ${targetFile}. Skipping further repair to prevent infinite loop.`,
            });
            continue;
          }

          const fileContent = (await readVirtualFile(conversationId, targetFile)) || '';
          if (!fileContent) continue;

          const relevantErrors = testReport.split('\n')
            .filter(l => l.includes(targetFile) || l.startsWith('###') || l.startsWith('- **Total'))
            .join('\n');
          const repairPrompt = `File to fix: ${targetFile}\n\nCurrent source code:\n${fileContent}\n\nLinter errors for THIS file:\n${relevantErrors}\n\nOutput ONLY the complete corrected file. No markdown fences. No explanation.`;
          const repairResult = await runAgent(
            conversationId,
            'Debugger',
            userPrompt,
            onEvent,
            ledger,
            1,
            repairPrompt,
            executionSignal,
            undefined,
            targetFile
          );

          if (repairResult && repairResult.content) {
            let appliedPatches = false;
            try {
              const cleaned = cleanJsonResponse(repairResult.content);
              const parsed = JSON.parse(cleaned);
              if (parsed && Array.isArray(parsed.patches) && parsed.patches.length > 0) {
                for (const patch of parsed.patches) {
                  const patchTarget = patch.file || targetFile;
                  if (patchTarget && patch.startLine && patch.endLine && patch.replacement !== undefined) {
                    await applyDiff(conversationId, patchTarget, patch.startLine, patch.endLine, patch.replacement);
                    emit({ type: 'AGENT_LOG', agent: 'Debugger', message: `🛠️ Applied diff patch to ${patchTarget} (L${patch.startLine}-L${patch.endLine}): ${patch.reason}` });
                  }
                }
                appliedPatches = true;
              }
            } catch (e) {
              // Fallback for full file response
            }

            if (!appliedPatches) {
              const repairedContent = sanitizeCoderOutput(repairResult.content) || repairResult.content;
              await writeVirtualFile(conversationId, targetFile, repairedContent);
              writeProjectFile(conversationId, targetFile, repairedContent);
            }

            const postLint = await runLinter(conversationId, targetFile);
            if (postLint.success) {
              repairedCount++;
              emit({ type: 'AGENT_LOG', agent: 'Debugger', message: `✅ ${targetFile} repair verified clean.` });
            } else {
              emit({ type: 'AGENT_LOG', agent: 'Debugger', message: `⚠️ ${targetFile} repair still has errors: ${postLint.summary}` });
            }
          }
        }

        // Post-Debugger re-lint: update test_report.md with post-repair status
        const existingReport = (await readVirtualFile(conversationId, 'test_report.md')) || '';
        let postRepairLines: string[] = ['\n### Post-Debugger Verification'];
        let postPassed = 0;
        let postFailed = 0;
        for (const targetFile of failingFiles) {
          const postCheck = await runLinter(conversationId, targetFile);
          if (postCheck.success) {
            postPassed++;
            postRepairLines.push(`- **${targetFile}**: ✅ PASSED (repaired)`);
          } else {
            postFailed++;
            postRepairLines.push(`- **${targetFile}**: ❌ STILL FAILING — ${postCheck.errors.map(e => `L${e.line}: ${e.message}`).join('; ')}`);
          }
        }
        await writeVirtualFile(conversationId, 'test_report.md', existingReport + '\n' + postRepairLines.join('\n'));
        writeProjectFile(conversationId, 'test_report.md', existingReport + '\n' + postRepairLines.join('\n'));

        await writeVirtualFile(
          conversationId,
          'debug_report.md',
          `### Debug Report\nRepaired ${repairedCount}/${failingFiles.length} failing file(s): ${failingFiles.join(', ')}\nPost-repair: ${postPassed} fixed, ${postFailed} still failing.`
        );

        emit({
          type: 'AGENT_COMPLETE',
          agent: 'Debugger',
          message: `Debugger completed: ${postPassed} repaired, ${postFailed} still failing.`,
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

        // Validate blueprint cross-references before generation
        const bpWarnings = validateBlueprintImports(fileSections);
        for (const bpw of bpWarnings) {
          emit({ type: 'AGENT_LOG', agent: 'Coder', message: `⚠️ ${bpw}` });
        }

        emit({
          type: 'AGENT_START',
          agent: 'Coder',
          message: `Coder loop starting: Synthesizing ${fileSections.length} files from blueprint...`,
        });

        for (const fileSec of fileSections) {
          if (executionSignal.aborted) throw new Error('Pipeline compilation aborted by user.');

          // Build dependency code context
          let depCodeText = '';
          for (const depFile of fileSec.dependencies) {
            const depContent = await readVirtualFile(conversationId, depFile);
            if (depContent) {
              depCodeText += `--- [${depFile}] ---\n${extractDependencyInterface(depFile, depContent)}\n\n`;
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
            executionSignal,
            undefined,
            fileSec.file
          );

          if (coderOutput && coderOutput.content) {
            // Apply file-type-specific sanitization before writing
            coderOutput.content = sanitizeCoderOutputForFile(coderOutput.content, fileSec.file);

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

              // Surgical diff prompt for ≤3 errors, full rewrite for more
              const errorCount = lCheck.errors.length;
              const repairPrompt = errorCount <= 3
                ? `File: ${fileSec.file}\n\nCurrent code (DO NOT REWRITE from scratch — fix ONLY the errored lines):\n${coderOutput.content}\n\nFix ONLY these ${errorCount} errors:\n${errDetails}\n\nOutput the COMPLETE corrected file. Preserve all working code exactly.`
                : `File: ${fileSec.file}\nBlueprint Specification:\n${fileSec.rawSection}\n\nCurrent Broken Code:\n${coderOutput.content}\n\nLinter Errors (MUST FIX):\n${errDetails}\n\nRewrite the COMPLETE corrected source code for ${fileSec.file}. Output ONLY raw source code.`;

              const repairedOutput = await runAgent(
                conversationId,
                'Coder',
                userPrompt,
                emit,
                ledger,
                repairAttempt + 1,
                repairPrompt,
                executionSignal,
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

        // R3-2: Cross-file DOM coherence check after Coder loop
        const allVfs = await listVirtualFiles(conversationId);
        const htmlFiles = allVfs.filter(f => f.endsWith('.html'));
        const jsFiles = allVfs.filter(f => /\.(js|ts|jsx|tsx)$/.test(f));
        let domWarnings = 0;
        for (const htmlFile of htmlFiles) {
          const htmlContent = (await readVirtualFile(conversationId, htmlFile)) || '';
          const definedIds = new Set([...htmlContent.matchAll(/\bid=["']([^"']+)["']/g)].map(m => m[1]));
          for (const jsFile of jsFiles) {
            const jsContent = (await readVirtualFile(conversationId, jsFile)) || '';
            const referencedIds = [...jsContent.matchAll(/getElementById\(["']([^"']+)["']\)|querySelectorAll?\(["']#([^"']+)["']\)/g)]
              .map(m => m[1] || m[2]).filter(Boolean);
            for (const refId of referencedIds) {
              if (!definedIds.has(refId)) {
                domWarnings++;
                emit({
                  type: 'AGENT_LOG',
                  agent: 'Coder',
                  message: `⚠️ DOM Coherence Warning: "${jsFile}" references ID "${refId}" which is missing in "${htmlFile}".`,
                });
              }
            }
          }
        }

        // R3-3: Post-Pass HTML Asset Link Synchronization & Auto-Connection
        for (const htmlFile of htmlFiles) {
          const rawHtml = (await readVirtualFile(conversationId, htmlFile)) || '';
          if (rawHtml) {
            const { updatedHtml, syncedLinks } = syncHtmlAssetLinks(rawHtml, allVfs);
            if (syncedLinks.length > 0) {
              await writeVirtualFile(conversationId, htmlFile, updatedHtml);
              writeProjectFile(conversationId, htmlFile, updatedHtml);
              for (const linkMsg of syncedLinks) {
                emit({
                  type: 'AGENT_LOG',
                  agent: 'Coder',
                  message: `🔗 HTML Link Sync (${htmlFile}): ${linkMsg}`,
                });
              }
            }
          }
        }

        // Cross-file import validation after full Coder loop
        const crossFileMap = new Map<string, string>();
        for (const vfsFile of allVfs) {
          const vContent = await readVirtualFile(conversationId, vfsFile);
          if (vContent) crossFileMap.set(vfsFile, vContent);
        }
        const importCheck = runCrossFileImportCheck(crossFileMap);
        if (!importCheck.success) {
          for (const err of importCheck.errors) {
            emit({ type: 'AGENT_LOG', agent: 'Coder', message: `⚠️ Import Error: ${err.message}` });
          }
        }

        emit({
          type: 'AGENT_COMPLETE',
          agent: 'Coder',
          message: `Coder loop completed: Synthesized and verified ${fileSections.length} files (${domWarnings} DOM warning(s), ${importCheck.errors.length} import error(s)).`,
        });
        continue;
      }

      // ─── STAGE: BLUEPRINTER (Parallel / Batched Per-File Synthesis + Context Pruning) ───
      if (stageName === 'Blueprinter') {
        const specFiles = ['plan.md', 'requirements.md', 'architecture.md', 'backend_spec.md', 'ui_spec.md'];
        const specContents: Record<string, string> = {};
        for (const sf of specFiles) {
          const sc = await readVirtualFile(conversationId, sf);
          if (sc) specContents[sf] = sc;
        }

        const archContent = specContents['architecture.md'] || '';
        const targetFiles = extractFilesFromArchitecture(archContent);

        // Build pruned spec context
        let prunedContext = '';
        for (const [name, content] of Object.entries(specContents)) {
          const match = content.match(/### Context Snapshot([\s\S]*?)(###|$)/i);
          if (match) {
            prunedContext += `=== ${name.toUpperCase()} (SNAPSHOT) ===\n### Context Snapshot\n${match[1].trim()}\n\n`;
          } else {
            prunedContext += `=== ${name.toUpperCase()} (SUMMARY) ===\n${content.slice(0, 1200).trim()}\n\n`;
          }
        }

        let finalBlueprintText = '';

        if (targetFiles.length > 0) {
          emit({
            type: 'AGENT_LOG',
            agent: 'Blueprinter',
            message: `📐 Blueprinter: Parallelizing blueprint synthesis across ${targetFiles.length} target file(s)...`,
          });

          // Batch files into concurrent clusters of up to 3 files
          const BATCH_SIZE = 3;
          const batches: string[][] = [];
          for (let i = 0; i < targetFiles.length; i += BATCH_SIZE) {
            batches.push(targetFiles.slice(i, i + BATCH_SIZE));
          }

          const batchPromises = batches.map(async (batchFiles) => {
            const batchPrompt = `${userPrompt}\n\n=== TARGET FILES TO BLUEPRINT ===\nSynthesize blueprint sections ONLY for the following file(s):\n${batchFiles.map(f => `- ${f}`).join('\n')}\n\nStart your output immediately with ### File: ${batchFiles[0]}`;
            const batchContext = `${prunedContext}\n=== BATCH TARGET FILES ===\n${batchFiles.join(', ')}`;
            const res = await runAgent(
              conversationId,
              'Blueprinter',
              batchPrompt,
              emit,
              ledger,
              1,
              batchContext,
              executionSignal
            );
            return res ? res.content : '';
          });

          const batchOutputs = await Promise.all(batchPromises);
          const rawJoined = batchOutputs.join('\n\n');

          // Parse generated sections and sort by dependency order
          const parsedSections = parseBlueprintFiles(rawJoined);
          if (parsedSections.length > 0) {
            // Sort: index.html or entry points first, then files with no deps, then others
            parsedSections.sort((a, b) => {
              if (a.file === 'index.html' || a.file === 'public/index.html') return -1;
              if (b.file === 'index.html' || b.file === 'public/index.html') return 1;
              if (a.dependencies.length === 0 && b.dependencies.length > 0) return -1;
              if (b.dependencies.length === 0 && a.dependencies.length > 0) return 1;
              return 0;
            });

            finalBlueprintText = parsedSections.map((s) => s.rawSection).join('\n\n');
          } else {
            // Fallback to raw output if parseBlueprintFiles returned empty
            finalBlueprintText = rawJoined;
          }
        }

        // Fallback if targetFiles was empty or parallel execution yielded no content
        if (!finalBlueprintText.trim()) {
          emit({
            type: 'AGENT_LOG',
            agent: 'Blueprinter',
            message: `⚠️ Blueprinter fallback: running full single-pass synthesis...`,
          });
          let fullContext = '';
          for (const [sf, sc] of Object.entries(specContents)) {
            fullContext += `=== ${sf.toUpperCase()} ===\n${sc}\n\n`;
          }
          const bpOut = await runAgent(conversationId, 'Blueprinter', userPrompt, emit, ledger, 1, fullContext.trim(), executionSignal);
          finalBlueprintText = bpOut.content;
        }

        // Save blueprint.md to VFS and flush to disk
        await writeVirtualFile(conversationId, 'blueprint.md', finalBlueprintText);
        writeProjectFile(conversationId, 'blueprint.md', finalBlueprintText);
        await flushVfsToDisk(conversationId);

        emit({ type: 'AGENT_COMPLETE', agent: 'Blueprinter', message: 'Blueprinter completed.', data: finalBlueprintText });
        continue;
      }

      // ─── STAGES: SECURITY & REVIEWER (Spec + Source Code Context) ─────────
      if (stageName === 'Security' || stageName === 'Reviewer') {
        const specFiles = ['plan.md', 'requirements.md', 'architecture.md', 'backend_spec.md', 'ui_spec.md'];
        let specContext = '';
        for (const sf of specFiles) {
          const sc = await readVirtualFile(conversationId, sf);
          if (sc) specContext += `=== ${sf.toUpperCase()} ===\n${sc}\n\n`;
        }
        const allVfsFiles = await listVirtualFiles(conversationId);
        const codeFiles = allVfsFiles.filter(f => /\.(js|ts|jsx|tsx|html|css|py|go|java|rs|sh)$/.test(f));
        let codeContext = '';
        let totalChars = 0;
        const CODE_CHAR_LIMIT = 30000;
        for (const f of codeFiles) {
          if (totalChars >= CODE_CHAR_LIMIT) {
            codeContext += `\n[Remaining ${codeFiles.length - codeFiles.indexOf(f)} files omitted for size]\n`;
            break;
          }
          const fc = await readVirtualFile(conversationId, f);
          if (fc) {
            codeContext += `\n--- FILE: ${f} ---\n${fc}\n`;
            totalChars += fc.length;
          }
        }
        const fullCtx = specContext + (codeContext ? `\n=== GENERATED SOURCE CODE ===\n${codeContext}` : '\n=== NOTE: No source code files found ===');
        const srOut = await runAgent(conversationId, stageName, userPrompt, emit, ledger, 1, fullCtx, executionSignal);

        // Reviewer rework guard: if Reviewer found critical issues, log them prominently
        if (stageName === 'Reviewer' && srOut.content) {
          const hasRework = /\b(MAJOR|CRITICAL|REWORK|FAIL)\b/i.test(srOut.content);
          if (hasRework) {
            emit({
              type: 'AGENT_LOG',
              agent: 'Reviewer',
              message: '⚠️ Reviewer flagged CRITICAL/REWORK issues. Review recommended before deployment.',
            });
          }
        }

        emit({ type: 'AGENT_COMPLETE', agent: stageName, message: `Stage ${stageName} completed.`, data: srOut.content });
        await flushVfsToDisk(conversationId);
        continue;
      }

      // ─── STAGES: Queen, Planner, Architect, System, Designer ───────────────
      const stageOutput = await runAgent(
        conversationId,
        stageName,
        userPrompt,
        emit,
        ledger,
        1,
        undefined,
        executionSignal
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
