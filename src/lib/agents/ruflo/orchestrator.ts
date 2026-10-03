import { EventEmitter } from 'events';
import { prisma } from '../../db';
import { runInference, getLLMConfig, startOllamaKeepAlive, stopOllamaKeepAlive, cleanJsonResponse } from '../inference';
import { writeAgentOutput, queryAgentOutput } from '../sml';
import { AGENT_DEFS, AgentDef } from './agents';
import { loadExecutiveMemory, writeExecutiveMemoryRecord, OWNERSHIP, StageLedger } from './memory';
import { calculateTokenBudget } from './token-budgeter';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { writeVirtualFile, readVirtualFile, listVirtualFiles, applyDiff, flushVfsToDisk, safeWriteFileSync } from './vfs';
import { runLinter, runCrossFileImportCheck } from './linter';
import { buildAndPersistStructuralGraph, detectAndPersistArchitectureDrift } from './structural-graph';
import { ProjectContract } from './contracts';
import { extractProjectContract, validateProjectContract, validateArchitectureArtifact } from './spec-contract';

function escapeRegex(val: string): string {
  return val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
import { resolveModule, parseTsConfigOptions } from './module-resolver';
import { validatePackageDependencies } from './dependency-validator';
import { validateGeneratedProject } from './project-validator';
import { validatePrismaUsage } from './prisma-validator';
import { validateApiContracts } from './api-contract-validator';
import { validateFrameworkBoundaries } from './framework-validator';
import { probeGeneratedProjectRoutes } from './runtime-validator';
import { validateSecurityGate } from './security-gate';
import { evaluateQualityGate } from './quality-gate';

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

// ─── Deterministic Artifact Dependency Registry ─────────────────────────────
// Each stage declares which VFS Markdown artifacts it requires as input context.
// This replaces the old UPSTREAM_AGENT_MAP + Context Snapshot system.
const STAGE_ARTIFACT_DEPS: Record<string, string[]> = {
  'Queen':       [],                                                          // Receives only user prompt
  'Planner':     ['plan.md'],                                                 // Reads Queen output
  'Architect':   ['plan.md', 'requirements.md'],                              // Reads Queen + Planner
  'System':      ['plan.md', 'requirements.md', 'architecture.md'],           // Reads Queen + Planner + Architect
  'Designer':    ['plan.md', 'requirements.md', 'architecture.md', 'backend_spec.md'],
  'Blueprinter': ['plan.md', 'requirements.md', 'architecture.md', 'backend_spec.md', 'ui_spec.md'],
  'Security':    ['requirements.md', 'architecture.md', 'backend_spec.md'],
  'Reviewer':    ['plan.md', 'requirements.md', 'architecture.md', 'backend_spec.md', 'ui_spec.md', 'blueprint.md'],
};

const EXPECTED_FIRST_HEADERS: Record<string, string> = {
  'Queen':       'Project Name',
  'Planner':     'Features',
  'Architect':   'Tech Stack',
  // System intentionally excluded — has two valid first headers
  'Designer':    'Design System',
  'Blueprinter': 'File:',
  'Security':    'Overall Status',
  'Reviewer':    'Overall Assessment',
  // Coder intentionally excluded — outputs raw code
};

// MAX_SNAPSHOT_CHARS and truncateAtBullet removed — full artifacts are now passed directly

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

// ─── Artifact Context Resolver (Replaces Snapshot System) ────────────────────
// Reads full VFS Markdown artifacts for each stage based on STAGE_ARTIFACT_DEPS.
// No truncation, no snapshot extraction, no typed DB override.

export async function buildArtifactContext(
  conversationId: string,
  agentName: string
): Promise<string> {
  const requiredArtifacts = STAGE_ARTIFACT_DEPS[agentName] ?? [];
  if (requiredArtifacts.length === 0) return '';

  let context = '';
  const missing: string[] = [];

  for (const artifactPath of requiredArtifacts) {
    const content = await readVirtualFile(conversationId, artifactPath);
    if (content && content.trim()) {
      context += `=== ARTIFACT: ${artifactPath} ===\n${content.trim()}\n=== END ARTIFACT: ${artifactPath} ===\n\n`;
    } else {
      missing.push(artifactPath);
    }
  }

  if (missing.length > 0) {
    console.warn(`[buildArtifactContext] Agent "${agentName}" missing required artifacts: ${missing.join(', ')}`);
  }

  return context.trim();
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

/**
 * Validates Architect candidate output against project specifications and architecture contracts.
 */
export async function validateArchitectOutput(
  conversationId: string,
  content: string
): Promise<{
  valid: boolean;
  contract?: ProjectContract;
  errors: string[];
  warnings: string[];
}> {
  const specContents: Record<string, string> = {
    'architecture.md': content,
  };

  const planContent = await readVirtualFile(conversationId, 'plan.md');
  if (planContent) specContents['plan.md'] = planContent;

  const reqContent = await readVirtualFile(conversationId, 'requirements.md');
  if (reqContent) specContents['requirements.md'] = reqContent;

  const backendContent = await readVirtualFile(conversationId, 'backend_spec.md');
  if (backendContent) specContents['backend_spec.md'] = backendContent;

  const uiContent = await readVirtualFile(conversationId, 'ui_spec.md');
  if (uiContent) specContents['ui_spec.md'] = uiContent;

  const contract = extractProjectContract(specContents);
  const specVal = validateProjectContract(contract);
  const archVal = validateArchitectureArtifact(content, contract);

  const errors = Array.from(new Set([...specVal.errors, ...archVal.errors]));
  const warnings = Array.from(new Set([...specVal.warnings, ...archVal.warnings]));

  return {
    valid: errors.length === 0,
    contract,
    errors,
    warnings,
  };
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

  const seenFileMap = new Map<string, number>();

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

    const normKey = file.toLowerCase();

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

    // If file section was already parsed, merge dependencies and skip adding duplicate section
    if (seenFileMap.has(normKey)) {
      const existingIdx = seenFileMap.get(normKey)!;
      const existing = sections[existingIdx];
      for (const d of dependencies) {
        if (!existing.dependencies.includes(d)) {
          existing.dependencies.push(d);
        }
      }
      continue;
    }

    seenFileMap.set(normKey, sections.length);
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
  const val = validateBlueprintGraph(sections);
  return [...val.errors, ...val.warnings];
}

export interface BlueprintGraphValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  order: string[];
}

export function classifyBlueprintDependency(dep: string): 'LOCAL_FILE' | 'PACKAGE' | 'EXTERNAL' {
  if (!dep || dep === 'None') return 'EXTERNAL';
  const clean = dep.trim();

  // Explicit local references starting with relative path or alias (@/) or ending with code extension
  if (clean.startsWith('.') || clean.startsWith('@/') || clean.startsWith('~/') || /\.(ts|tsx|js|jsx|css|json|prisma)$/i.test(clean)) {
    return 'LOCAL_FILE';
  }

  // Scoped npm package: e.g. @lucide/react, @prisma/client, @tanstack/react-query, @radix-ui/react-dialog
  if (/^@[a-z0-9_.-]+\/[a-z0-9_.-]+/i.test(clean)) {
    return 'PACKAGE';
  }

  // Standard package or framework subpath: e.g. next/server, next/navigation, react-dom/client, lucide-react, express
  if (/^[a-z0-9_.-]+(\/[a-z0-9_.-]+)*$/i.test(clean)) {
    return 'PACKAGE';
  }

  return 'EXTERNAL';
}

/**
 * Validates blueprint file graph for duplicates, missing dependencies, cycles, and computes topological ordering.
 */
export function validateBlueprintGraph(
  sections: BlueprintFileSection[],
  tsConfigContent?: string,
  contract?: ProjectContract
): BlueprintGraphValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const fileMap = new Map<string, BlueprintFileSection>();
  const normalizedFileSet = new Set<string>();

  // 1. Check duplicate files
  for (const s of sections) {
    const norm = s.file.replace(/\\/g, '/').replace(/^[/\\]+/, '').toLowerCase();
    if (normalizedFileSet.has(norm)) {
      errors.push(`Duplicate file section in blueprint: "${s.file}"`);
    } else {
      normalizedFileSet.add(norm);
      fileMap.set(norm, s);
    }
  }

  // 2. Prepare Module Resolution Context
  const tsOpts = parseTsConfigOptions(tsConfigContent || '');
  const moduleContext = {
    files: sections.map((s) => s.file),
    baseUrl: tsOpts.baseUrl || '.',
    paths: tsOpts.paths || { '@/*': ['./src/*', './*'], '~/*': ['./src/*', './*'] },
  };

  const inDegree = new Map<string, number>();
  const graph = new Map<string, string[]>();

  for (const normFile of normalizedFileSet) {
    inDegree.set(normFile, 0);
    graph.set(normFile, []);
  }

  // 3. Resolve dependencies using resolveModule & build canonical graph edges
  for (const [normFile, section] of fileMap.entries()) {
    for (const dep of section.dependencies) {
      if (!dep || dep === 'None') continue;
      const depType = classifyBlueprintDependency(dep);
      if (depType === 'LOCAL_FILE') {
        const resolved = resolveModule(section.file, dep, moduleContext);
        if (!resolved) {
          errors.push(`Blueprint file "${section.file}" lists local file dependency "${dep}" which is not defined in blueprint.`);
        } else {
          const normResolved = resolved.replace(/\\/g, '/').replace(/^[/\\]+/, '').toLowerCase();
          if (fileMap.has(normResolved) && normResolved !== normFile) {
            graph.get(normResolved)!.push(normFile);
            inDegree.set(normFile, (inDegree.get(normFile) || 0) + 1);
          }
        }
      } else {
        warnings.push(`Blueprint file "${section.file}" lists external/package dependency "${dep}".`);
      }
    }
  }

  // 4. Dependency cycles & Topological sort (Kahn's Algorithm)
  const queue: string[] = [];
  for (const [node, deg] of inDegree.entries()) {
    if (deg === 0) queue.push(node);
  }

  const order: string[] = [];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    const section = fileMap.get(curr);
    if (section) order.push(section.file);

    const neighbors = graph.get(curr) || [];
    for (const n of neighbors) {
      const newDeg = (inDegree.get(n) || 1) - 1;
      inDegree.set(n, newDeg);
      if (newDeg === 0) queue.push(n);
    }
  }

  if (order.length < normalizedFileSet.size) {
    errors.push(`Dependency cycle detected in blueprint file graph.`);
  }

  // 5. Framework-Aware Directional Runtime Boundary Validation
  const framework = contract?.framework || 'STATIC_HTML';

  for (const [, section] of fileMap.entries()) {
    const srcFile = section.file.replace(/\\/g, '/').replace(/^\.\//, '');
    const isHtml = srcFile.endsWith('.html');
    const isNextServerFile =
      framework === 'NEXT_APP_ROUTER' &&
      (/(^|\/)api\//i.test(srcFile) ||
        srcFile.endsWith('/route.ts') ||
        srcFile.endsWith('/route.js') ||
        srcFile.includes('lib/prisma') ||
        srcFile.includes('lib/db'));

    const isClientFile =
      !isNextServerFile &&
      !srcFile.startsWith('server/') &&
      !srcFile.startsWith('api/') &&
      (isHtml ||
        srcFile.startsWith('src/') ||
        /(^|\/)(main|index|app)\.(tsx|jsx|ts|js)$/i.test(srcFile) ||
        /(^|\/)(components|hooks|styles|pages|services|utils)\//i.test(srcFile) ||
        (contract?.entryPoints?.includes(srcFile) ?? false));

    for (const dep of section.dependencies) {
      if (!dep || dep === 'None') continue;
      const cleanDep = dep.replace(/\\/g, '/').replace(/^\.\//, '');

      const isServerDep =
        cleanDep.startsWith('server/') ||
        cleanDep.startsWith('api/') ||
        cleanDep.includes('/server/') ||
        cleanDep.includes('/api/') ||
        /(^|\/)(server|app)\.(js|ts)$/i.test(cleanDep);

      const isDatabaseDep =
        cleanDep.startsWith('prisma/') ||
        cleanDep.includes('/prisma/') ||
        cleanDep.endsWith('prisma/schema.prisma') ||
        cleanDep.includes('lib/prisma') ||
        cleanDep === '@prisma/client' ||
        cleanDep === 'prisma';

      if (isHtml) {
        if (isServerDep || isDatabaseDep) {
          errors.push(
            `Blueprint Runtime Boundary Error: HTML entry "${srcFile}" cannot depend on server/database file "${cleanDep}". HTML cannot import server/database runtime files.`
          );
        }
      } else if (framework === 'VITE_SPA' || framework === 'REACT_WEBPACK_SPA' || framework === 'STATIC_HTML') {
        if (isClientFile && (isServerDep || isDatabaseDep)) {
          errors.push(
            `Blueprint Runtime Boundary Error: Frontend file "${srcFile}" cannot depend on server/database file "${cleanDep}". Client code cannot import server/database runtime files.`
          );
        }
      } else if (framework === 'NEXT_APP_ROUTER') {
        if (!isNextServerFile && isDatabaseDep && !cleanDep.startsWith('/api/') && !cleanDep.startsWith('api/')) {
          const purposeLower = section.purpose.toLowerCase();
          const isClientComponent =
            /(^|\/)components\//i.test(srcFile) ||
            (purposeLower.includes('client') && !purposeLower.includes('prisma') && !purposeLower.includes('db'));
          if (isClientComponent) {
            errors.push(
              `Blueprint Runtime Boundary Error: Next.js client component "${srcFile}" cannot depend on server-only database file "${cleanDep}".`
            );
          }
        }
      }
    }
  }

  // 6. Contract Hash Enforcement
  if (contract?.contractHash) {
    let bpHash: string | undefined;
    for (const s of sections) {
      const match = s.rawSection.match(/(?:Contract\s*Hash|contractHash)\s*:\s*([a-f0-9]{64})/i);
      if (match) {
        bpHash = match[1];
        break;
      }
    }
    if (bpHash && bpHash !== contract.contractHash) {
      errors.push(
        `Contract Hash Mismatch: Blueprint was generated from contract hash ${bpHash}, but current spec contract hash is ${contract.contractHash}.`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    order,
  };
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
/**
 * Post-Pass HTML Asset Link Synchronizer.
 * Inspects generated HTML files and ensures appropriate frontend assets are linked,
 * while preventing backend script injection and respecting bundler/framework contracts.
 */
export function syncHtmlAssetLinks(
  htmlContent: string,
  allFiles: string[],
  contract?: ProjectContract
): { updatedHtml: string; syncedLinks: string[] } {
  let updatedHtml = htmlContent;
  const syncedLinks: string[] = [];

  // 0. Remove any erroneously injected server/backend script tags from HTML
  const serverScriptRegex = /<script\b[^>]*\bsrc=["'](?:(?:\/)?(?:server|api)\/|[^"']*\b(?:server|app)\.(?:js|ts))["'][^>]*>(?:<\/script>)?\n?/gi;
  if (serverScriptRegex.test(updatedHtml)) {
    updatedHtml = updatedHtml.replace(serverScriptRegex, '');
    syncedLinks.push('Removed backend script reference from HTML');
  }

  const framework = contract?.framework || 'STATIC_HTML';

  if (framework === 'VITE_SPA') {
    const entryPoints = contract?.entryPoints || ['src/pages/index.tsx', 'src/main.tsx', 'src/index.tsx'];
    const canonicalEntry = entryPoints.find((e: string) => allFiles.includes(e)) || entryPoints[0] || 'src/pages/index.tsx';
    const normEntry = canonicalEntry.startsWith('/') ? canonicalEntry : `/${canonicalEntry}`;
    const altEntry = canonicalEntry.replace(/^\//, '');

    const scriptPattern = new RegExp(`<script\\b[^>]*\\bsrc=["'](?:${escapeRegex(normEntry)}|${escapeRegex(altEntry)}|${escapeRegex('/' + altEntry)})["'][^>]*>`, 'i');

    if (scriptPattern.test(updatedHtml)) {
      if (!/<script\b[^>]*type=["']module["'][^>]*\bsrc=/i.test(updatedHtml) && !/<script\b[^>]*\bsrc=[^>]*type=["']module["']/i.test(updatedHtml)) {
        updatedHtml = updatedHtml.replace(
          new RegExp(`(<script\\b)([^>]*\\bsrc=["'](?:${escapeRegex(normEntry)}|${escapeRegex(altEntry)}|${escapeRegex('/' + altEntry)})["'])`, 'i'),
          '$1 type="module"$2'
        );
        syncedLinks.push(`Added type="module" to Vite entry script tag (${normEntry})`);
      }
    } else {
      const scriptTag = `  <script type="module" src="${normEntry}"></script>\n`;
      if (/<\/body>/i.test(updatedHtml)) {
        updatedHtml = updatedHtml.replace(/<\/body>/i, `${scriptTag}</body>`);
      } else if (/<\/head>/i.test(updatedHtml)) {
        updatedHtml = updatedHtml.replace(/<\/head>/i, `${scriptTag}</head>`);
      } else {
        updatedHtml = `${updatedHtml}\n${scriptTag}`;
      }
      syncedLinks.push(`Connected Vite module script <script type="module" src="${normEntry}"></script>`);
    }

    const cssFiles = allFiles.filter((f) => f.endsWith('.css') && !f.includes('node_modules'));
    for (const cssFile of cssFiles) {
      const cssBasename = cssFile.split('/').pop() || cssFile;
      const isLinked = updatedHtml.includes(cssFile) || updatedHtml.includes(cssBasename);
      if (!isLinked) {
        const linkTag = `  <link rel="stylesheet" href="${cssFile}">\n`;
        if (/<\/head>/i.test(updatedHtml)) {
          updatedHtml = updatedHtml.replace(/<\/head>/i, `${linkTag}</head>`);
        } else {
          updatedHtml = `${linkTag}` + updatedHtml;
        }
        syncedLinks.push(`Connected stylesheet <link rel="stylesheet" href="${cssFile}"> to <head>`);
      }
    }

    return { updatedHtml, syncedLinks };
  }

  if (framework === 'NEXT_APP_ROUTER' || framework === 'NEXT_PAGES_ROUTER') {
    const badScriptRegex = /<script\b[^>]*\bsrc=["'](?:(?:\/)?(?:server|api|src\/components|components|src\/services)\/|[^"']*\.(?:tsx|jsx|ts))["'][^>]*>(?:<\/script>)?\n?/gi;
    if (badScriptRegex.test(updatedHtml)) {
      updatedHtml = updatedHtml.replace(badScriptRegex, '');
      syncedLinks.push('Removed raw component/server script reference from Next.js HTML');
    }
    return { updatedHtml, syncedLinks };
  }

  if (framework === 'REACT_WEBPACK_SPA') {
    const entryPoints = contract?.entryPoints || ['src/index.tsx', 'src/pages/index.tsx'];
    const canonicalEntry = entryPoints[0] || 'bundle.js';
    const bundleName = canonicalEntry.endsWith('.js') ? canonicalEntry : 'bundle.js';

    if (!updatedHtml.includes(bundleName) && !updatedHtml.includes('dist/bundle.js')) {
      const scriptTag = `  <script src="${bundleName}" defer></script>\n`;
      if (/<\/body>/i.test(updatedHtml)) {
        updatedHtml = updatedHtml.replace(/<\/body>/i, `${scriptTag}</body>`);
      } else {
        updatedHtml = `${updatedHtml}\n${scriptTag}`;
      }
      syncedLinks.push(`Connected React Webpack bundle script <script src="${bundleName}" defer></script>`);
    }
    return { updatedHtml, syncedLinks };
  }

  const cssFiles = allFiles.filter((f) => f.endsWith('.css') && !f.includes('node_modules'));
  const jsFiles = allFiles.filter(
    (f) =>
      /\.(js|ts|jsx|tsx)$/.test(f) &&
      !f.endsWith('.d.ts') &&
      !f.includes('config') &&
      !f.includes('test') &&
      !f.startsWith('server/') &&
      !f.startsWith('api/') &&
      !f.startsWith('src/components/') &&
      !f.startsWith('src/services/') &&
      !f.startsWith('src/hooks/') &&
      !f.includes('/server/') &&
      !f.includes('/api/') &&
      !f.includes('/components/')
  );

  for (const cssFile of cssFiles) {
    const cssBasename = cssFile.split('/').pop() || cssFile;
    const isLinked = updatedHtml.includes(cssFile) || updatedHtml.includes(cssBasename);
    if (!isLinked) {
      const linkTag = `  <link rel="stylesheet" href="${cssFile}">\n`;
      if (/<\/head>/i.test(updatedHtml)) {
        updatedHtml = updatedHtml.replace(/<\/head>/i, `${linkTag}</head>`);
      } else {
        updatedHtml = `${linkTag}` + updatedHtml;
      }
      syncedLinks.push(`Connected stylesheet <link rel="stylesheet" href="${cssFile}"> to <head>`);
    }
  }

  for (const jsFile of jsFiles) {
    const jsBasename = jsFile.split('/').pop() || jsFile;
    const isLinked = updatedHtml.includes(jsFile) || updatedHtml.includes(jsBasename);
    if (!isLinked) {
      const scriptTag = `  <script src="${jsFile}" defer></script>\n`;
      if (/<\/body>/i.test(updatedHtml)) {
        updatedHtml = updatedHtml.replace(/<\/body>/i, `${scriptTag}</body>`);
      } else if (/<\/head>/i.test(updatedHtml)) {
        updatedHtml = updatedHtml.replace(/<\/head>/i, `${scriptTag}</head>`);
      } else {
        updatedHtml = `${updatedHtml}\n${scriptTag}`;
      }
      syncedLinks.push(`Connected script <script src="${jsFile}" defer></script>`);
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

export function composeAgentUserContent(params: {
  upstreamContext: string;
  customUserContent?: string;
  userPromptText: string;
  attempt: number;
  validationError?: string;
}): string {
  const {
    upstreamContext,
    customUserContent,
    userPromptText,
    attempt,
    validationError,
  } = params;

  const retryPrefix =
    attempt > 1
      ? `[RETRY ${attempt}/3] Your previous output failed verification. Error: ${
          validationError ||
          'Ensure ALL required section headers are present.'
        }.\n\n`
      : '';

  const parts: string[] = [];

  if (upstreamContext.trim()) {
    parts.push(
      `Upstream Specification Context:\n${upstreamContext.trim()}`
    );
  }

  if (customUserContent?.trim()) {
    parts.push(customUserContent.trim());
  }

  parts.push(`Original Request:\n"${userPromptText}"`);

  return retryPrefix + parts.join('\n\n');
}

export function shouldPersistAgentOutput(
  agentName: string,
  persistOutput: boolean
): boolean {
  return Boolean(VFS_OUTPUT_MAP[agentName]) && persistOutput;
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
  targetFile?: string,
  persistOutput: boolean = true
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
  const upstreamContext = await buildArtifactContext(conversationId, agentName);

  const constraintsBlock = `\n\nActive System Constraints:
- Output MUST be valid structured markdown matching the exact header specifications.
- Do NOT wrap your entire response in markdown code blocks (\`\`\`markdown). Return raw text directly.`;

  const systemInstructions = agentDef.systemPrompt + constraintsBlock;
  
  const userContent = composeAgentUserContent({
    upstreamContext,
    customUserContent,
    userPromptText,
    attempt,
    validationError,
  });

  const requiredArtifactNames = STAGE_ARTIFACT_DEPS[agentName] ?? [];

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
  if (outputFilename && persistOutput) {
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
      inflow: { systemInstructions, userContent, context: contextTelemetry },
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
        const testReportLines: string[] = ['### Test Report', `- **Total Files Tested**: ${codeFiles.length}`, ''];

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

        // Extract authoritative contract for Coder stage blueprint validation
        const coderSpecFiles = ['plan.md', 'requirements.md', 'architecture.md', 'backend_spec.md', 'ui_spec.md'];
        const coderSpecContents: Record<string, string> = {};
        for (const sf of coderSpecFiles) {
          const sc = await readVirtualFile(conversationId, sf);
          if (sc) coderSpecContents[sf] = sc;
        }
        const coderContract = extractProjectContract(coderSpecContents);

        // Validate blueprint graph gate (blocking on errors)
        const blueprintValidation = validateBlueprintGraph(fileSections, undefined, coderContract);
        for (const bpw of blueprintValidation.warnings) {
          emit({ type: 'AGENT_LOG', agent: 'Coder', message: `⚠️ ${bpw}` });
        }

        if (!blueprintValidation.valid) {
          for (const bpe of blueprintValidation.errors) {
            emit({ type: 'AGENT_LOG', agent: 'Coder', message: `❌ Blueprint Graph Error: ${bpe}` });
          }
          emit({
            type: 'PIPELINE_ERROR',
            message: `Blueprint graph validation failed: ${blueprintValidation.errors.join('; ')}`,
          });
          throw new Error('Blueprint graph validation failed. Coder execution aborted.');
        }

        // Apply topological ordering to Coder synthesis loop
        if (blueprintValidation.order.length === fileSections.length) {
          const fileOrderMap = new Map(blueprintValidation.order.map((f, i) => [f.toLowerCase(), i]));
          fileSections.sort((a, b) => {
            const idxA = fileOrderMap.get(a.file.toLowerCase()) ?? 0;
            const idxB = fileOrderMap.get(b.file.toLowerCase()) ?? 0;
            return idxA - idxB;
          });
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
        const syncSpecMap: Record<string, string> = {};
        for (const sf of ['plan.md', 'requirements.md', 'architecture.md', 'backend_spec.md', 'ui_spec.md']) {
          const sc = await readVirtualFile(conversationId, sf);
          if (sc) syncSpecMap[sf] = sc;
        }
        const syncContract = extractProjectContract(syncSpecMap);

        for (const htmlFile of htmlFiles) {
          const rawHtml = (await readVirtualFile(conversationId, htmlFile)) || '';
          if (rawHtml) {
            const { updatedHtml, syncedLinks } = syncHtmlAssetLinks(rawHtml, allVfs, syncContract);
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

        // Build structural graph and detect architecture drift post-Coder
        try {
          await buildAndPersistStructuralGraph(conversationId);
          await detectAndPersistArchitectureDrift(conversationId, fileSections);
          emit({
            type: 'AGENT_LOG',
            agent: 'Coder',
            message: '📊 Structural graph extracted and architecture drift report generated.',
          });
        } catch (graphErr: any) {
          emit({
            type: 'AGENT_LOG',
            agent: 'Coder',
            message: `⚠️ Structural graph build warning: ${graphErr.message}`,
          });
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

        // P0: Validate Specification Contract for cross-document contradictions
        const specContract = extractProjectContract(specContents);
        const specVal = validateProjectContract(specContract);
        for (const warn of specVal.warnings) {
          emit({ type: 'AGENT_LOG', agent: 'Blueprinter', message: `⚠️ Spec Contract Warning: ${warn}` });
        }
        if (!specVal.valid) {
          for (const err of specVal.errors) {
            emit({ type: 'AGENT_LOG', agent: 'Blueprinter', message: `❌ Spec Contract Error: ${err}` });
          }
          emit({
            type: 'PIPELINE_ERROR',
            message: `Specification contract validation failed: ${specVal.errors.join('; ')}`,
          });
          throw new Error('Specification contract validation failed. Blueprinter execution aborted.');
        }

        const archContent = specContents['architecture.md'] || '';

        // Validate Architecture Artifact (folder tree alignment, module ownership, route syntax)
        const archVal = validateArchitectureArtifact(archContent, specContract);
        for (const warn of archVal.warnings) {
          emit({ type: 'AGENT_LOG', agent: 'Blueprinter', message: `⚠️ Architecture Warning: ${warn}` });
        }
        if (!archVal.valid) {
          for (const err of archVal.errors) {
            emit({ type: 'AGENT_LOG', agent: 'Blueprinter', message: `❌ Architecture Error: ${err}` });
          }
          emit({
            type: 'PIPELINE_ERROR',
            message: `Architecture artifact validation failed: ${archVal.errors.join('; ')}`,
          });
          throw new Error(`Architecture artifact validation failed: ${archVal.errors.join('; ')}`);
        }

        const targetFiles = extractFilesFromArchitecture(archContent);

        // Full artifact context — no truncation, no snapshot extraction
        let prunedContext = '';
        for (const [name, content] of Object.entries(specContents)) {
          prunedContext += `=== ARTIFACT: ${name} ===\n${content.trim()}\n=== END ARTIFACT: ${name} ===\n\n`;
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

          // Parse generated sections and sort by topological dependency order
          const parsedSections = parseBlueprintFiles(rawJoined);
          if (parsedSections.length > 0) {
            const bpVal = validateBlueprintGraph(parsedSections, undefined, specContract);
            if (bpVal.order.length === parsedSections.length) {
              const fileOrderMap = new Map(bpVal.order.map((f, i) => [f.toLowerCase(), i]));
              parsedSections.sort((a, b) => {
                const idxA = fileOrderMap.get(a.file.toLowerCase()) ?? 0;
                const idxB = fileOrderMap.get(b.file.toLowerCase()) ?? 0;
                return idxA - idxB;
              });
            }
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

        // Parse, validate, and topologically order final blueprint sections before persisting
        const finalSections = parseBlueprintFiles(finalBlueprintText);
        if (finalSections.length > 0) {
          const bpVal = validateBlueprintGraph(finalSections, undefined, specContract);
          for (const warn of bpVal.warnings) {
            emit({ type: 'AGENT_LOG', agent: 'Blueprinter', message: `⚠️ ${warn}` });
          }
          if (!bpVal.valid) {
            for (const err of bpVal.errors) {
              emit({ type: 'AGENT_LOG', agent: 'Blueprinter', message: `❌ Blueprint Graph Error: ${err}` });
            }
            emit({
              type: 'PIPELINE_ERROR',
              message: `Blueprint graph validation failed: ${bpVal.errors.join('; ')}`,
            });
            throw new Error(`Blueprint graph validation failed: ${bpVal.errors.join('; ')}`);
          }
          if (bpVal.order.length === finalSections.length) {
            const fileOrderMap = new Map(bpVal.order.map((f, i) => [f.toLowerCase(), i]));
            finalSections.sort((a, b) => {
              const idxA = fileOrderMap.get(a.file.toLowerCase()) ?? 0;
              const idxB = fileOrderMap.get(b.file.toLowerCase()) ?? 0;
              return idxA - idxB;
            });
            finalBlueprintText = finalSections.map((s) => s.rawSection).join('\n\n');
          }
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
        const specContentsMap: Record<string, string> = {};
        for (const sf of specFiles) {
          const sc = await readVirtualFile(conversationId, sf);
          if (sc) {
            specContext += `=== ${sf.toUpperCase()} ===\n${sc}\n\n`;
            specContentsMap[sf] = sc;
          }
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
        const driftReport = await readVirtualFile(conversationId, 'architecture_drift_report.md');
        const fullCtx =
          specContext +
          (codeContext ? `\n=== GENERATED SOURCE CODE ===\n${codeContext}` : '\n=== NOTE: No source code files found ===') +
          (driftReport ? `\n=== ARCHITECTURE DRIFT REPORT ===\n${driftReport}` : '');
        const srOut = await runAgent(conversationId, stageName, userPrompt, emit, ledger, 1, fullCtx, executionSignal);

        // Execute Deterministic Quality Gate Evaluation Stack
        const allVfsList = await listVirtualFiles(conversationId);
        const vfsFilesRecord: Record<string, string> = {};
        for (const f of allVfsList) {
          const c = await readVirtualFile(conversationId, f);
          if (c !== null) vfsFilesRecord[f] = c;
        }

        const specContract = extractProjectContract(specContentsMap);
        const specVal = validateProjectContract(specContract);

        const blueprintText = (await readVirtualFile(conversationId, 'blueprint.md')) || '';
        const fileSections = parseBlueprintFiles(blueprintText);
        const blueprintVal = validateBlueprintGraph(fileSections, undefined, specContract);

        const projVal = await validateGeneratedProject(conversationId);
        const packageVal = validatePackageDependencies(vfsFilesRecord, vfsFilesRecord['package.json'] || '');
        const prismaVal = validatePrismaUsage(vfsFilesRecord, vfsFilesRecord['prisma/schema.prisma'] || '');
        const apiVal = validateApiContracts(specContract, vfsFilesRecord);
        const frameworkVal = validateFrameworkBoundaries(vfsFilesRecord, specContract.framework, specContract);
        const runtimeVal = await probeGeneratedProjectRoutes(specContract, vfsFilesRecord);
        const securityVal = validateSecurityGate(vfsFilesRecord);

        const qGate = evaluateQualityGate({
          specContract,
          specValidation: specVal,
          blueprintValidation: blueprintVal,
          projectValidation: projVal,
          packageValidation: packageVal,
          prismaValidation: prismaVal,
          apiValidation: apiVal,
          frameworkValidation: frameworkVal,
          runtimeValidation: runtimeVal,
          securityValidation: securityVal,
        });

        emit({
          type: 'AGENT_LOG',
          agent: 'Reviewer',
          message: `🛡️ Deterministic Quality Gate Evaluation: Score ${qGate.score}/100 | Status: ${qGate.status}`,
        });

        for (const reason of qGate.blockingReasons) {
          emit({ type: 'AGENT_LOG', agent: 'Reviewer', message: `❌ Quality Gate Blocking: ${reason}` });
        }

        const qGateReport = `# Quality Gate Evaluation Report\n\n- Status: **${qGate.status}**\n- Verification Score: **${qGate.score}/100**\n\n### Summary\n- Specifications Valid: ${qGate.summary.specsValid ? '✅' : '❌'}\n- Blueprint Valid: ${qGate.summary.blueprintValid ? '✅' : '❌'}\n- Whole Project Compiles: ${qGate.summary.projectCompiles ? '✅' : '❌'}\n- Package Dependencies Valid: ${qGate.summary.packagesValid ? '✅' : '❌'}\n- Prisma DB Contract Matches: ${qGate.summary.prismaValid ? '✅' : '❌'}\n- API Contracts Implemented: ${qGate.summary.apiContractsValid ? '✅' : '❌'}\n- Framework Boundaries Valid: ${qGate.summary.frameworkBoundariesValid ? '✅' : '❌'}\n- Runtime Probes Pass: ${qGate.summary.runtimeProbesValid ? '✅' : '❌'}\n- Security Gate Passed: ${qGate.summary.securityGatePassed ? '✅' : '❌'}\n\n### Blocking Reasons\n${qGate.blockingReasons.length > 0 ? qGate.blockingReasons.map(r => `- ${r}`).join('\n') : 'None'}\n\n### Warnings\n${qGate.warnings.length > 0 ? qGate.warnings.map(w => `- ${w}`).join('\n') : 'None'}\n`;
        await writeVirtualFile(conversationId, 'quality_gate_report.md', qGateReport);

        if (!qGate.passed) {
          emit({
            type: 'PIPELINE_ERROR',
            message: `Pipeline Quality Gate failed with status ${qGate.status}: ${qGate.blockingReasons.join('; ')}`,
          });
          throw new Error(`Pipeline Quality Gate failed (${qGate.status}): ${qGate.blockingReasons.join('; ')}`);
        }

        emit({ type: 'AGENT_COMPLETE', agent: stageName, message: `Stage ${stageName} completed (Quality Gate: ${qGate.status}).`, data: srOut.content });
        await flushVfsToDisk(conversationId);
        continue;
      }

      // ─── STAGES: Queen, Planner, Architect, System, Designer ───────────────
      let extraContext: string | undefined = undefined;
      if (stageName === 'Architect' || stageName === 'System') {
        extraContext = `=== ORIGINAL USER REQUEST (HIGHEST PRIORITY TECH STACK PREFERENCES) ===\n${userPrompt}\n\n`;
      }

      let stageOutput: any = null;

      if (stageName === 'Architect') {
        const MAX_ARCHITECT_VALIDATION_RETRIES = 2;
        let validationErrorFeedback: string | undefined = undefined;
        let accepted = false;

        for (let attempt = 1; attempt <= MAX_ARCHITECT_VALIDATION_RETRIES + 1; attempt++) {
          if (executionSignal.aborted) throw new Error('Pipeline compilation aborted by user.');

          let customContext = extraContext || '';
          if (validationErrorFeedback) {
            customContext += `=== ARCHITECT VALIDATION FAILURE (ATTEMPT ${attempt - 1}) ===\n${validationErrorFeedback}\n=== END VALIDATION FAILURE ===\n\n`;
          }

          stageOutput = await runAgent(
            conversationId,
            'Architect',
            userPrompt,
            emit,
            ledger,
            attempt,
            customContext,
            executionSignal,
            validationErrorFeedback,
            undefined,
            false
          );

          const validation = await validateArchitectOutput(conversationId, stageOutput.content);

          for (const warn of validation.warnings) {
            emit({ type: 'AGENT_LOG', agent: 'Architect', message: `⚠️ Architect Warning: ${warn}` });
          }

          if (validation.valid) {
            await writeVirtualFile(
              conversationId,
              'architecture.md',
              stageOutput.content
            );
            accepted = true;
            break;
          }

          for (const err of validation.errors) {
            emit({
              type: 'AGENT_LOG',
              agent: 'Architect',
              message: `❌ Architect Validation Error (Attempt ${attempt}/${MAX_ARCHITECT_VALIDATION_RETRIES + 1}): ${err}`,
            });
          }

          if (attempt <= MAX_ARCHITECT_VALIDATION_RETRIES) {
            emit({
              type: 'AGENT_LOG',
              agent: 'Architect',
              message: `⚠️ Architect output failed validation. Retrying (${attempt}/${MAX_ARCHITECT_VALIDATION_RETRIES + 1})...`,
            });
            validationErrorFeedback = `=== ARCHITECT VALIDATION FAILURE ===\n\nThe previous architecture.md is invalid.\n\nErrors:\n${validation.errors.map((e) => `- ${e}`).join('\n')}\n\nRegenerate the COMPLETE architecture.md.\nDo not preserve invalid paths from the previous attempt.\nDo not explain the correction.\nOutput only the required architecture.md document.`;
          } else {
            const errSummary = validation.errors.join('; ');
            emit({
              type: 'PIPELINE_ERROR',
              message: `Architect validation failed after ${attempt} attempts: ${errSummary}`,
            });
            throw new Error(`Architect validation failed after ${attempt} attempts: ${errSummary}`);
          }
        }

        if (!accepted) {
          throw new Error('Architect output validation failed.');
        }
      } else {
        stageOutput = await runAgent(
          conversationId,
          stageName,
          userPrompt,
          emit,
          ledger,
          1,
          extraContext,
          executionSignal
        );
      }

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
