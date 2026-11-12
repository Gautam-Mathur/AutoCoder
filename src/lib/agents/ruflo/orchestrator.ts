import { EventEmitter } from 'events';
import ts from 'typescript';
import { prisma } from '../../db';
import {
  runInference,
  getLLMConfig,
  startOllamaKeepAlive,
  stopOllamaKeepAlive,
  cleanJsonResponse,
  InferenceOptions,
  InferenceTurnResult,
  Message,
} from '../inference';
import { getToolsForAgent } from './toolbox';
import { executeToolLoop, ToolCallLogEntry } from './tool-loop';
import { writeAgentOutput, queryAgentOutput } from '../sml';
import { AGENT_DEFS, AgentDef } from './agents';
import { loadExecutiveMemory, writeExecutiveMemoryRecord, OWNERSHIP, StageLedger } from './memory';
import { calculateTokenBudget } from './token-budgeter';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
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
import { acquirePipelineLease, releasePipelineLease, renewPipelineLease, assertPipelineLease, startLeaseHeartbeat } from './pipeline-lease';
import { getStageContract, StageName } from './contracts/registry';
import { getCanonicalStageOrder } from './contracts/stage-graph';
import { CONTRACT_VERSIONS } from './contracts/versions';
import { executeContractStage } from './contract-executor';
import { evaluateFinalPipelineGate } from './final-gate';
import crypto from 'crypto';
import { arbitrateSpecificationContradiction } from './spec-arbitrator';
import {
  prepareReconciliationTransaction,
  commitReconciliationTransaction,
  abortReconciliationTransaction,
  detectSpecificationOscillation,
} from './spec-reconciliation-coordinator';
import { verifyAndRepairWorkspace } from './verification-loop';
import { appendPipelineEvent } from './pipeline-events';
import { commitAcceptedArtifact, findReusableAcceptedArtifact, refreshCoderWorkspaceManifest, resolveAcceptedStageInputs } from './artifact-store';
import { validateStageCandidate } from './stage-acceptance';
import { createContentHash } from './contracts/fingerprints';
import { normalizeProjectPath } from './workspace-policy';


// Global Event Emitter for decoupling browser SSE streams from background Node pipeline compilation
export const pipelineEvents = new EventEmitter();
pipelineEvents.setMaxListeners(100);

export const activePipelines = new Set<string>();
export const pipelineAbortControllers = new Map<string, AbortController>();
const abortedBeforeRegistration = new Set<string>();

export async function abortPipelineExecution(conversationId: string): Promise<void> {
  abortedBeforeRegistration.add(conversationId);
  const controller = pipelineAbortControllers.get(conversationId);
  if (controller) {
    controller.abort();
    pipelineAbortControllers.delete(conversationId);
  }
  activePipelines.delete(conversationId);
  if (activePipelines.size === 0) {
    stopOllamaKeepAlive();
  }

  try {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { status: 'Cancelled' },
    });
    await prisma.pipelineRun.upsert({
      where: { conversationId },
      update: { state: 'CANCELLED', leaseOwner: null, leaseExpiresAt: null },
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
  'terminated',
  'other side closed',
  'und_err_socket',
  'fetch failed',
  'socket hung up',
  'econnreset',
] as const;

function isInfrastructureError(err: any): boolean {
  const msg = String(err?.message || '').toLowerCase();
  const code = String(err?.code ?? '').toLowerCase();
  const causeMsg = String(err?.cause?.message || '').toLowerCase();
  return (
    INFRA_ERROR_SIGNATURES.some(sig => msg.includes(sig) || causeMsg.includes(sig)) ||
    code === 'und_err_socket' ||
    code === 'econnreset' ||
    code === 'econnrefused'
  );
}

async function handleInfrastructurePause(
  conversationId: string,
  onEvent: PipelineEventCallback,
  errorMessage: string
): Promise<void> {
  onEvent({
    type: 'PIPELINE_ERROR',
    message: `⚠️ INFRASTRUCTURE INTERRUPTION: LLM host connection interrupted.\n` +
             `Error: ${errorMessage}\n` +
             `Pipeline paused. All progress saved. Click Resume Pipeline to continue.`,
  });
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { status: 'Paused' },
  });
  await prisma.pipelineRun.updateMany({
    where: { conversationId },
    data: {
      state: 'PAUSED',
      leaseOwner: null,
      leaseExpiresAt: null,
    },
  });
  await writeHistoryLog(
    conversationId,
    'System',
    'Failed',
    `Pipeline paused due to infrastructure interruption: ${errorMessage}`
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
        timeoutMs: 120000,
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

const EXPECTED_FIRST_HEADERS: Record<string, string> = {
  'Queen':       'Project Name',
  'Planner':     'Features',
  'Architect':   'Tech Stack',
  'System':      'Database Design',
  'Designer':    'Design System',
  'Blueprinter': 'File:',
  'Security':    'Overall Status',
  'Reviewer':    'Overall Assessment',
  'Debugger':    'Issues Addressed',
};

function extractMdSection(content: string, sectionName: string): string {
  const escaped = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const headerMatch = content.match(new RegExp(`(#{1,4})\\s*${escaped}`, 'i'));
  if (!headerMatch || headerMatch.index === undefined) return '';

  const headingLevel = headerMatch[1].length;
  const startIdx = headerMatch.index;
  const rest = content.substring(startIdx + headerMatch[0].length);

  const endPattern = new RegExp(`\\n#{1,${headingLevel}}\\s+[^#]`);
  const nextHeading = rest.match(endPattern);

  if (nextHeading && nextHeading.index !== undefined) {
    return content.substring(startIdx, startIdx + headerMatch[0].length + nextHeading.index).trim();
  }
  return content.substring(startIdx).trim();
}

// ─── Artifact Context Resolver (Replaces Snapshot System) ────────────────────
// Reads full VFS Markdown artifacts for each stage based on canonical contract registry.
// No truncation, no snapshot extraction, no typed DB override.

export async function buildArtifactContext(
  conversationId: string,
  agentName: string
): Promise<string> {
  let requiredArtifacts: string[] = [];
  try {
    const contract = getStageContract(agentName);
    requiredArtifacts = contract.inputArtifacts.map((i) => i.name);
  } catch (e) {
    return '';
  }

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

  // 1. Strip outer code fences at start and end of output
  while (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-zA-Z0-9_-]*\r?\n?/, '').trim();
  }
  while (cleaned.endsWith('```')) {
    cleaned = cleaned.replace(/\r?\n?```$/, '').trim();
  }

  if (!expectedFirstHeader) return cleaned.trim();

  // 2. Find expected first header anchor and strip preamble
  const headerRegex = new RegExp(
    `(#{1,4})\\s*${expectedFirstHeader.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
    'i'
  );
  const headerMatch = cleaned.match(headerRegex);

  if (headerMatch && headerMatch.index !== undefined && headerMatch.index > 0) {
    cleaned = cleaned.substring(headerMatch.index);
  }

  // Strip trailing code fence if any remained after substring
  while (cleaned.endsWith('```')) {
    cleaned = cleaned.replace(/\r?\n?```$/, '').trim();
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

export type TargetLanguagePolicy = {
  language: 'javascript' | 'typescript' | 'html' | 'css' | 'json' | 'markdown' | 'unknown';
  rules: string[];
};

export function getTargetLanguagePolicy(targetFile: string): TargetLanguagePolicy {
  const ext = path.extname(targetFile).toLowerCase();
  if (ext === '.js' || ext === '.jsx') {
    return {
      language: 'javascript',
      rules: [
        'JavaScript (ECMAScript) only. Do NOT emit TypeScript syntax.',
        'Do NOT use `as Type` assertions, type annotations (`: string`), interfaces, or type aliases.',
        'For DOM properties (.value, .reset, .dataset), narrow at runtime using `if (el instanceof HTMLInputElement)` or `document.querySelector`.',
        'JSDoc comments (`/** @type {HTMLInputElement} */`) are permitted if syntactically valid JavaScript.',
      ],
    };
  }
  if (ext === '.ts' || ext === '.tsx') {
    return {
      language: 'typescript',
      rules: [
        'TypeScript syntax permitted. Adhere strictly to project tsconfig and interface contracts.',
      ],
    };
  }
  if (ext === '.html') {
    return { language: 'html', rules: ['Emit clean, semantic HTML5 only. Keep styles in .css and scripts in .js.'] };
  }
  if (ext === '.css') {
    return { language: 'css', rules: ['Emit valid CSS only with standard responsive rules and CSS variables.'] };
  }
  if (ext === '.json') {
    return { language: 'json', rules: ['Emit strict JSON only. Zero comments, zero trailing commas.'] };
  }
  if (ext === '.md') {
    return { language: 'markdown', rules: ['Emit standard GitHub Flavored Markdown only.'] };
  }
  return { language: 'unknown', rules: ['Follow standard language conventions for this file type.'] };
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

  // Inject Tech Stack and Project Goal (Architecture & Plan) — essential for package.json, configs, and main entry points
  const archSpec = await readVirtualFile(conversationId, 'architecture.md');
  const planSpec = await readVirtualFile(conversationId, 'plan.md');

  if (planSpec) {
    const projGoal = extractMdSection(planSpec, 'Project Goal');
    const projName = extractMdSection(planSpec, 'Project Name');
    if (projGoal || projName) {
      context += `=== PROJECT IDENTITY & GOAL ===\n${projName ? `${projName}\n` : ''}${projGoal || ''}\n\n`;
    }
  }

  if (archSpec) {
    const techStack = extractMdSection(archSpec, 'Tech Stack');
    if (techStack) {
      context += `=== AUTHORITATIVE TECH STACK & DEPENDENCIES ===\n${techStack}\n\n`;
    }
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

    const sanitizedEnv: NodeJS.ProcessEnv = {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      HOME: process.env.HOME || process.env.USERPROFILE,
      USERPROFILE: process.env.USERPROFILE,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      NODE_ENV: 'development',
    };

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
      execFile(
        process.execPath,
        [entryFile],
        { cwd: projectPath, env: sanitizedEnv, timeout: 60000, windowsHide: true },
        (error) => {
          if (error) {
            onEvent({
              type: 'AGENT_LOG',
              message: `⚠️ Node.js Runtime Error: ${error.message}`,
            });
          }
        }
      );
    } else if (fs.existsSync(path.join(projectPath, 'index.html'))) {
      onEvent({
        type: 'AGENT_LOG',
        message: `⚡ Automatic Local Execution: Launching local web preview server (npx serve)...`,
      });
      const npxBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
      execFile(
        npxBin,
        ['serve', '-s', '.', '-l', '8080'],
        { cwd: projectPath, env: sanitizedEnv, timeout: 60000, windowsHide: true },
        () => {}
      );
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
 * Robust, parser-backed, file-type-aware sanitizer for Coder output.
 * 1. Checks for markdown code fences.
 *    - Matches fences by language tag.
 *    - Validates syntax with TypeScript parser / JSON.parse / CSS balance before extraction.
 *    - Disambiguates multiple blocks by checking for module exports.
 * 2. If no valid fence, handles raw content:
 *    - JSON: bidirectional scan with JSON.parse.
 *    - JS/TS: finds first valid statement and tests with TypeScript parser.
 *    - CSS: balances at-rules and brackets.
 *    - HTML: extracts from <!DOCTYPE or root element.
 *    - Prisma: extracts from valid schema keywords.
 * 3. Never destructively truncates valid source based on conversational keywords like "Note:".
 */
export function sanitizeCoderOutputForFile(raw: string, filePath?: string): string {
  if (!raw || !raw.trim()) return '';

  let text = raw.trim();
  const ext = filePath ? path.extname(filePath).toLowerCase() : '';
  const extWithoutDot = ext.replace(/^\./, '');

  // 1. Language-Aware Fence Parsing
  const fenceRegex = /```([a-zA-Z0-9_+.-]*)\r?\n([\s\S]*?)\r?\n```/g;
  const matches = [...text.matchAll(fenceRegex)];

  if (matches.length > 0) {
    const isMatchingTag = (tag: string): boolean => {
      const t = tag.toLowerCase().trim();
      if (!t) return false;
      if (t === extWithoutDot) return true;
      if (['ts', 'tsx'].includes(extWithoutDot) && ['typescript', 'ts', 'tsx'].includes(t)) return true;
      if (['js', 'jsx', 'mjs', 'cjs'].includes(extWithoutDot) && ['javascript', 'js', 'jsx'].includes(t)) return true;
      if (['css', 'scss', 'less'].includes(extWithoutDot) && ['css', 'scss', 'less'].includes(t)) return true;
      if (extWithoutDot === 'html' && ['html', 'htm'].includes(t)) return true;
      if (extWithoutDot === 'json' && t === 'json') return true;
      if (extWithoutDot === 'prisma' && t === 'prisma') return true;
      return false;
    };

    // Filter candidate fences that match the target file extension
    const candidateFences = matches.filter((m) => isMatchingTag(m[1]));

    if (candidateFences.length === 1) {
      const codeCandidate = candidateFences[0][2].trim();
      if (isParserValid(codeCandidate, ext)) {
        return codeCandidate;
      }
    } else if (candidateFences.length > 1) {
      // Multiple tagged blocks: test parser validity
      const validBlocks = candidateFences
        .map((m) => m[2].trim())
        .filter((code) => isParserValid(code, ext));
      if (validBlocks.length === 1) {
        return validBlocks[0];
      }
      // If multiple distinct blocks parse cleanly, prioritize export-containing module
      const exportContaining = validBlocks.filter((b) => /\b(export\s+|module\.exports\b)/.test(b));
      if (exportContaining.length === 1) {
        return exportContaining[0];
      }
      if (validBlocks.length > 0) {
        return validBlocks.reduce((prev, curr) => (curr.length > prev.length ? curr : prev));
      }
    } else {
      // No tag matched directly: check generic fences for parse validity
      const validGeneric = matches
        .map((m) => m[2].trim())
        .filter((code) => code.length > 10 && isParserValid(code, ext));
      if (validGeneric.length === 1) {
        return validGeneric[0];
      }
    }
  }

  // 2. Strip single unclosed outer markdown fence if present
  text = text.replace(/^```[a-zA-Z0-9_+.-]*\r?\n/, '').replace(/\r?\n```\s*$/, '').trim();

  // 3. JSON Parsing (.json)
  if (ext === '.json') {
    const firstBrace = text.search(/[{\[]/);
    if (firstBrace >= 0) {
      for (let endIdx = text.length; endIdx > firstBrace; endIdx--) {
        const char = text[endIdx - 1];
        if (char === '}' || char === ']') {
          const candidate = text.substring(firstBrace, endIdx);
          try {
            JSON.parse(candidate);
            return candidate.trim();
          } catch {}
        }
      }
    }
    return text;
  }

  // 4. JavaScript / TypeScript (.js, .jsx, .ts, .tsx)
  if (['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'].includes(ext)) {
    const jsStart = text.search(
      /^(?:\s*['"]use (?:client|server)['"];?|#!|\/\/|\/\*|import\s+|export\s+|const\s+|let\s+|var\s+|(?:async\s+)?function\s+|class\s+|interface\s+|type\s+|enum\s+|declare\s+|namespace\s+|\(\s*(?:async\s*)?\([^)]*\)\s*=>)/m
    );
    if (jsStart > 0) {
      const candidate = text.substring(jsStart).trim();
      if (isParserValid(candidate, ext)) {
        return candidate;
      }
    }
    return text.trim();
  }

  // 5. CSS / SCSS (.css, .scss, .less)
  if (['.css', '.scss', '.less'].includes(ext)) {
    const cssStart = text.search(
      /^(?:\/\*|@(?:tailwind|import|charset|layer|property|keyframes|media|supports|font-face|container|page)|:root|\*|[.#a-zA-Z0-9_\-\[\]="':,\s]+\{)/m
    );
    if (cssStart > 0) {
      return text.substring(cssStart).trim();
    }
    return text.trim();
  }

  // 6. HTML / SVG (.html, .svg)
  if (['.html', '.svg'].includes(ext)) {
    const htmlStart = text.search(
      /^(?:<!DOCTYPE\s+html|<\?xml|<html|<head|<title|<meta|<link|<style|<script|<body|<header|<main|<nav|<footer|<section|<div|<svg|<!--)/im
    );
    if (htmlStart > 0) {
      return text.substring(htmlStart).trim();
    }
    return text.trim();
  }

  // 7. Prisma (.prisma)
  if (ext === '.prisma') {
    const prismaStart = text.search(/^(?:\/\/\s*[\w\-\s]+|datasource\s+|generator\s+|model\s+|enum\s+|type\s+)/m);
    if (prismaStart > 0) {
      return text.substring(prismaStart).trim();
    }
    return text.trim();
  }

  return text.trim();
}

/**
 * Verifies syntax validity using actual language parsers before accepting extracted code.
 */
function isParserValid(content: string, ext: string): boolean {
  if (!content || !content.trim()) return false;
  if (ext === '.json') {
    try {
      JSON.parse(content);
      return true;
    } catch {
      return false;
    }
  }
  if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
    try {
      const sf = ts.createSourceFile('test' + ext, content, ts.ScriptTarget.Latest, true);
      const diagnostics = (sf as unknown as { parseDiagnostics?: ts.Diagnostic[] }).parseDiagnostics || [];
      const fatalErrors = diagnostics.filter((d: ts.Diagnostic) => d.category === ts.DiagnosticCategory.Error);
      return fatalErrors.length === 0;
    } catch {
      return false;
    }
  }
  return true;
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

export interface RunAgentRuntimeOptions {
  pipelineRunId?: string;
  stageExecutionId?: string;
  isSetupOperation?: boolean;
  allowedMutationPaths?: string[];
  maxToolIterations?: number;
  enableTools?: boolean;
  inferenceTurnFn?: (messages: Message[], options?: InferenceOptions) => Promise<InferenceTurnResult>;
}

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
  persistOutput: boolean = true,
  runtimeOptions?: RunAgentRuntimeOptions
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

  const permittedTools =
    agentDef.tools.length > 0 &&
    Boolean(runtimeOptions?.pipelineRunId) &&
    runtimeOptions?.enableTools !== false &&
    process.env.MOCK_INFERENCE !== 'true'
      ? getToolsForAgent(agentDef.tools)
      : [];

  const constraintsBlock = `\n\nActive System Constraints:
- Output MUST be valid structured markdown matching the exact header specifications.
- Do NOT wrap your entire response in markdown code blocks (\`\`\`markdown). Return raw text directly.`;

  let systemInstructions =
    agentName === 'Coder'
      ? agentDef.systemPrompt
      : agentDef.systemPrompt + constraintsBlock;

  if (permittedTools.length > 0) {
    if (agentName === 'Coder' && targetFile) {
      systemInstructions += `\n\n=== WORKSPACE TOOLS ENABLED (SCOPED TO ${targetFile}) ===
You have interactive workspace tools to verify dependencies and check syntax before finishing:
- list_files(): list existing workspace files.
- read_file({ file_path }): inspect exact exports, types, or DOM IDs in dependency files (returns contentHash required for apply_diff).
- write_file({ file_path, content }): write the complete file content to "${targetFile}".
- apply_diff({ file_path, start_line, end_line, new_content, expected_content_hash }): surgically patch "${targetFile}" after reading it.
- check_syntax({ file_path }): run TypeScript/JavaScript compiler syntax & type diagnostics on "${targetFile}".
- typecheck(): run workspace-wide tsc --noEmit if tsconfig.json exists.
Mutation scope is strictly restricted to "${targetFile}". If you write or patch "${targetFile}" using tools, always call check_syntax on "${targetFile}" and fix any reported errors before finishing, then return a brief summary or final code. If you do not call write_file or apply_diff, output ONLY the raw complete source code for "${targetFile}".`;
    } else if (agentName === 'Debugger') {
      systemInstructions += `\n\n=== WORKSPACE TOOLS DIAGNOSTIC & REPAIR GUIDANCE ===
You have access to authorized workspace tools (${permittedTools.map((t) => t.name).join(', ')}).
- Use read_file({ file_path }) before apply_diff to inspect exact lines and obtain expected_content_hash (= contentHash).
- Use check_syntax, typecheck, or build_project to verify fixes against the actual workspace.
- Only describe modifications in ### Patches Applied and verification results in ### Verification that reflect real edits and actual checks.`;
    }
  }

  let userContent: string;
  if (agentName === 'Coder' && targetFile) {
    const blueprintText = await readVirtualFile(conversationId, 'blueprint.md');
    let targetSection = '';
    let dependencyInterfaces = '';

    if (blueprintText) {
      const parsedSections = parseBlueprintFiles(blueprintText);
      const normalizedTarget = normalizeProjectPath(targetFile).toLowerCase();
      const match = parsedSections.find(
        (s) => normalizeProjectPath(s.file).toLowerCase() === normalizedTarget
      );
      if (match) {
        targetSection = match.rawSection;
        for (const dep of match.dependencies) {
          const depContent = await readVirtualFile(conversationId, dep);
          if (depContent) {
            const iface = extractDependencyInterface(dep, depContent);
            dependencyInterfaces += `${dep}:\n${iface}\n`;
          }
        }
      }
    }

    if (!targetSection) {
      const archText = await readVirtualFile(conversationId, 'architecture.md');
      const techStackSummary = archText ? extractMdSection(archText, 'Tech Stack') : '';
      targetSection = `### File: ${targetFile}\n- **Purpose**: Configuration and build manifest for ${targetFile}\n- **Dependencies**: Grounded from Architecture Tech Stack: ${techStackSummary.replace(/\n+/g, ' ').trim() || 'Required project dependencies'}\n- **Exports**: None`;
    }

    const coderContext = await buildCoderContext(conversationId, targetSection, dependencyInterfaces);

    onEvent({
      type: 'AGENT_LOG',
      agent: 'Coder',
      message: `📥 Inflow Context for ${targetFile}: Blueprint section + tech stack dependencies (${coderContext.length.toLocaleString()} chars)`,
    });
    const retryPrefix =
      attempt > 1
        ? `[RETRY ${attempt}/3] Your previous implementation of ${targetFile} had errors:\n${
            validationError || 'Fix all syntax, import, and logic errors.'
          }\nPlease fix these issues and output the complete, corrected code.\n\n`
        : '';

    const langPolicy = getTargetLanguagePolicy(targetFile);
    const langPolicyBlock = `### Target Language Policy (${langPolicy.language.toUpperCase()})\n` +
      langPolicy.rules.map(r => `- ${r}`).join('\n');

    userContent = `${retryPrefix}TARGET FILE TO IMPLEMENT: ${targetFile}\nOutput ONLY the complete raw source code for "${targetFile}". Do NOT output markdown code fences or headers.\n\n${langPolicyBlock}\n\n${coderContext}${
      customUserContent ? `\n\n${customUserContent}` : ''
    }`;
  } else {
    userContent = composeAgentUserContent({
      upstreamContext,
      customUserContent,
      userPromptText,
      attempt,
      validationError,
    });
  }

  let requiredArtifactNames: string[] = [];
  try {
    const contract = getStageContract(agentName);
    requiredArtifactNames = contract.inputArtifacts.map((i) => i.name);
  } catch (e) {
    requiredArtifactNames = [];
  }

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

  const onChunkHandler = (chunk: string) => {
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
  };

  let rawResponse = '';
  let toolExecutions: ToolCallLogEntry[] = [];
  let mutatedFiles: string[] = [];
  let toolIterations = 1;

  if (permittedTools.length > 0) {
    onEvent({
      type: 'AGENT_LOG',
      agent: agentName,
      message: `🧰 Tool runtime enabled for ${agentName} (${permittedTools.map((t) => t.name).join(', ')})`,
    });

    const loopResult = await executeToolLoop({
      messages: [
        { role: 'system', content: systemInstructions },
        { role: 'user', content: userContent },
      ],
      tools: permittedTools,
      toolContext: {
        conversationId,
        pipelineRunId: runtimeOptions?.pipelineRunId || '',
        stageExecutionId: runtimeOptions?.stageExecutionId,
        stageName: agentName,
        isSetupOperation: runtimeOptions?.isSetupOperation,
        allowedMutationPaths: runtimeOptions?.allowedMutationPaths,
      },
      inferenceOptions: {
        model: agentDef.model,
        temperature: agentDef.temperature,
        maxTokens: budget,
        timeoutMs,
        signal,
        onChunk: onChunkHandler,
      },
      maxIterations: runtimeOptions?.maxToolIterations ?? (agentName === 'Debugger' ? 10 : 8),
      onEvent,
      ...(runtimeOptions?.inferenceTurnFn ? { inferenceTurnFn: runtimeOptions.inferenceTurnFn } : {}),
    });

    rawResponse = loopResult.content;
    toolExecutions = loopResult.toolExecutions;
    mutatedFiles = loopResult.mutatedFiles;
    toolIterations = loopResult.iterations;
  } else {
    rawResponse = await runInference(
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
        onChunk: onChunkHandler,
      }
    );
  }

  const normTargetFile = targetFile ? normalizeProjectPath(targetFile) : '';
  let mutatedTargetViaTool = false;

  let finalContent: string;
  if (agentName === 'Coder') {
    if (
      normTargetFile &&
      mutatedFiles.some((mf) => mf.toLowerCase() === normTargetFile.toLowerCase())
    ) {
      const persistedVfsContent = await readVirtualFile(conversationId, normTargetFile);
      if (persistedVfsContent && persistedVfsContent.trim().length > 0) {
        finalContent = persistedVfsContent;
        mutatedTargetViaTool = true;
      } else {
        finalContent = sanitizeCoderOutputForFile(rawResponse, targetFile);
      }
    } else {
      finalContent = sanitizeCoderOutputForFile(rawResponse, targetFile);
    }
  } else {
    finalContent = sanitizeStageOutput(rawResponse, EXPECTED_FIRST_HEADERS[agentName]);
  }

  // If agent specifies an output filename in VFS_OUTPUT_MAP, write to VFS
  const outputFilename = VFS_OUTPUT_MAP[agentName];
  if (outputFilename && persistOutput) {
    const runId =
      runtimeOptions?.pipelineRunId ||
      (await prisma.pipelineRun.findUnique({ where: { conversationId } }))?.id ||
      'system-run';
    await writeVirtualFile(conversationId, outputFilename, finalContent, {
      pipelineRunId: runId,
      allowControlPlane: true,
    });
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
      orchestration: {
        durationMs,
        toolIterations,
        toolCallCount: toolExecutions.length,
        mutatedFiles,
      },
      inflow: { systemInstructions, userContent, context: contextTelemetry },
      thought: finalContent,
      ...(toolExecutions.length > 0 ? { toolExecutions } : {}),
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
    `Agent ${agentName} completed in ${durationMs}ms (${finalContent.length} bytes generated${toolExecutions.length > 0 ? `, ${toolExecutions.length} tool call(s)` : ''}). Estimated tokens: ${estimatedTokens}`
  );

  onEvent({
    type: 'AGENT_LOG',
    agent: agentName,
    message: `Agent ${agentName} completed in ${durationMs}ms (${finalContent.length} bytes generated${toolExecutions.length > 0 ? `, ${toolExecutions.length} tool call(s)` : ''}). [${inferenceId}]`,
  });

  return {
    content: finalContent,
    raw: rawResponse,
    mutatedViaTool: mutatedTargetViaTool,
    mutatedFiles,
    toolExecutions,
  };
}

export const localActivePipelines = new Map<string, string>();

export interface StageCandidate {
  stage: string;
  executionId: string;
  attempt: number;
  content: string;
  contentHash: string;
  generatedAt: Date;
}

export async function generateStageCandidate(params: {
  conversationId: string;
  agentName: string;
  userPromptText: string;
  attempt: number;
  customUserContent?: string;
  validationError?: string;
  executionSignal?: AbortSignal;
}): Promise<StageCandidate> {
  const executionId = path.basename(params.conversationId) + '-' + Math.random().toString(36).substring(2, 9);
  const upstreamContext = await buildArtifactContext(params.conversationId, params.agentName);

  const contextStr = params.customUserContent || JSON.stringify(upstreamContext);

  const result = await runInference(
    [
      { role: 'system', content: AGENT_DEFS[params.agentName as keyof typeof AGENT_DEFS]?.systemPrompt || '' },
      { role: 'user', content: `${params.userPromptText}\n\n[CONTEXT]\n${contextStr}` },
    ],
    { signal: params.executionSignal }
  );

  const content = sanitizeStageOutput(result, EXPECTED_FIRST_HEADERS[params.agentName]);
  if (!content.trim()) {
    throw new Error(`${params.agentName} produced an empty candidate`);
  }

  return {
    stage: params.agentName,
    executionId,
    attempt: params.attempt,
    content,
    contentHash: createContentHash(content),
    generatedAt: new Date(),
  };
}

export async function startPipelineIfUnowned(
  conversationId: string,
  userPrompt: string,
  onEvent?: PipelineEventCallback,
  startStage?: string
): Promise<{ started: boolean }> {
  const lease = await acquirePipelineLease(conversationId);
  if (!lease.acquired) {
    return { started: false };
  }

  runOrchestrator(
    conversationId,
    userPrompt,
    onEvent || (() => {}),
    undefined,
    startStage,
    lease.ownerId
  ).catch(async (error) => {
    await releasePipelineLease(conversationId, lease.ownerId, 'FAILED');
  });

  return { started: true };
}

// ─── Main Pipeline Orchestrator Loop (11 Stages) ───────────────────────────

export async function runOrchestrator(
  conversationId: string,
  userPrompt: string,
  onEvent: PipelineEventCallback,
  signal?: AbortSignal,
  startStage?: string,
  existingLeaseOwnerId?: string
): Promise<void> {
  abortedBeforeRegistration.delete(conversationId);
  if (signal?.aborted) {
    throw new Error('Pipeline compilation aborted due to client disconnect.');
  }

  let leaseOwnerId = existingLeaseOwnerId;
  if (!leaseOwnerId) {
    const lease = await acquirePipelineLease(conversationId);
    if (!lease.acquired) {
      const attachMsg = { type: 'AGENT_LOG', message: 'Reattached to active background compilation loop.' };
      onEvent(attachMsg as any);
      pipelineEvents.emit(`event:${conversationId}`, attachMsg);
      return;
    }
    leaseOwnerId = lease.ownerId;
  }

  if (abortedBeforeRegistration.has(conversationId)) {
    abortedBeforeRegistration.delete(conversationId);
    await releasePipelineLease(conversationId, leaseOwnerId, 'CANCELLED').catch(() => {});
    return;
  }

  localActivePipelines.set(conversationId, leaseOwnerId);
  activePipelines.add(conversationId);

  // Dedicated internal AbortController for background execution (decoupled from browser reload signals)
  const internalController = new AbortController();
  pipelineAbortControllers.set(conversationId, internalController);
  const executionSignal = internalController.signal;

  let finalPipelineState = 'COMPLETED';
  let stopHeartbeat: (() => void) | undefined;

  // Single Event Emission: Emits to global EventEmitter for browser SSE streams & persists to DB
  const emit = (event: any) => {
    pipelineEvents.emit(`event:${conversationId}`, event);
    prisma.pipelineRun.findUnique({ where: { conversationId } }).then((run) => {
      if (run) {
        appendPipelineEvent({
          conversationId,
          pipelineRunId: run.id,
          eventType: event.type || 'AGENT_LOG',
          stageName: event.agent || event.stage,
          payload: event,
        }).catch(() => {});
      }
    }).catch(() => {});
  };

  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    if (conversation.status === 'Cancelled' || executionSignal.aborted) {
      finalPipelineState = 'CANCELLED';
      return;
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

    stopHeartbeat = startLeaseHeartbeat(conversationId, leaseOwnerId, () => {
      internalController.abort();
    });

    // ─── 11 STAGES DEFINITION (Derived from Canonical Stage Graph) ───────────

    const STAGES: StageName[] = getCanonicalStageOrder() as StageName[];

    const startIndex = startStage ? STAGES.indexOf(startStage as StageName) : 0;
    const executionStages = startIndex >= 0 ? STAGES.slice(startIndex) : STAGES;

    const pipelineRun = await prisma.pipelineRun.findUnique({ where: { conversationId } });
    const runId = pipelineRun?.id || '';

    let debuggerExecutedInRun = false;

    for (const stageName of executionStages) {
      if (executionSignal.aborted) throw new Error('Pipeline compilation aborted by user.');

      // Update currentStage in database so state and UI remain 100% in sync
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { currentStage: stageName },
      }).catch(() => {});

      if (runId) {
        await prisma.pipelineRun.update({
          where: { id: runId },
          data: { currentStage: stageName },
        }).catch(() => {});
      }

      // Assert lease before stage execution
      await assertPipelineLease(conversationId, leaseOwnerId);

      // Fast-Forward Guard: Check if an ACCEPTED, lineage-bound, fresh artifact exists for this run
      const versionInfo = CONTRACT_VERSIONS[stageName];
      let reusableArtifact = null;

      try {
        const resolvedInputs = await resolveAcceptedStageInputs({
          conversationId,
          pipelineRunId: runId,
          stageName,
        });

        reusableArtifact = await findReusableAcceptedArtifact({
          conversationId,
          stageName,
          pipelineRunId: runId,
          expectedDependencyFingerprint: resolvedInputs.dependencyFingerprint,
          expectedContractVersion: versionInfo.version,
          expectedPromptVersion: versionInfo.promptVersion,
          expectedValidatorVersion: versionInfo.validatorVersion,
        });

      } catch {
        // Inputs not ready or missing, cannot fast-forward
      }

      if (reusableArtifact && startStage && stageName !== startStage) {
        emit({
          type: 'AGENT_COMPLETE',
          agent: stageName,
          message: `Stage ${stageName} artifact is fresh and valid. Fast-forwarding to next stage...`,
          data: reusableArtifact.content,
        });
        continue;
      }

      emit({
        type: 'STAGE_START',
        agent: stageName,
        message: `Entering Stage: ${stageName}...`,
      });

      if (stageName === 'Tester') {
        await verifyAndRepairWorkspace(
          conversationId,
          runId,
          async (targetStage: string, customInput?: string, targetFile?: string) => {
            if (targetStage === 'Debugger') {
              debuggerExecutedInRun = true;
            }
            const res = await executeContractStage({
              conversationId,
              pipelineRunId: runId,
              stageName: targetStage as StageName,
              userPromptText: userPrompt,
              onEvent: emit,
              ledger,
              leaseOwnerId,
              signal: executionSignal,
              customUserContent: customInput,
              targetFile,
            });
            if (targetStage === 'Debugger') {
              await refreshCoderWorkspaceManifest(conversationId, runId, res.stageExecution.id);
            }
            return res;
          },
          emit
        );

        await flushVfsToDisk(conversationId);
        continue;
      }

      if (stageName === 'Debugger') {
        if (debuggerExecutedInRun) {
          emit({
            type: 'AGENT_COMPLETE',
            agent: 'Debugger',
            message: 'Stage Debugger completed during repair cycle.',
          });
        } else {
          emit({
            type: 'AGENT_COMPLETE',
            agent: 'Debugger',
            message: 'Stage Debugger skipped (Tester passed without repair).',
          });
        }
        await flushVfsToDisk(conversationId);
        continue;
      }


      // Execute canonical contract stage via executeContractStage
      const contractResult = await executeContractStage({
        conversationId,
        pipelineRunId: runId,
        stageName,
        attempt: 1,
        userPromptText: userPrompt,
        onEvent: emit,
        ledger,
        leaseOwnerId,
        signal: executionSignal,
      });

      emit({
        type: 'AGENT_COMPLETE',
        agent: stageName,
        message: `Stage ${stageName} completed successfully.`,
        data: contractResult.content,
      });

      // Auto-flush VFS to physical disk after each stage completes
      await flushVfsToDisk(conversationId);

      // Specification Contradiction Reconciliation Gate after System stage
      if (stageName === 'System') {
        let specReconciliationCycle = 0;
        const MAX_SPEC_RECONCILIATION_CYCLES = 2;
        const reconciliationHistory: Array<{ targetStage: string; selectedApproach: string; fingerprint: string }> = [];

        while (specReconciliationCycle <= MAX_SPEC_RECONCILIATION_CYCLES) {
          const planMd = (await readVirtualFile(conversationId, 'plan.md')) || '';
          const reqsMd = (await readVirtualFile(conversationId, 'requirements.md')) || '';
          const archMd = (await readVirtualFile(conversationId, 'architecture.md')) || '';
          const backendMd = (await readVirtualFile(conversationId, 'backend_spec.md')) || '';

          const currentSpecs = {
            'plan.md': planMd,
            'requirements.md': reqsMd,
            'architecture.md': archMd,
            'backend_spec.md': backendMd,
          };

          const extractedContract = extractProjectContract(currentSpecs);
          const contractValidation = validateProjectContract(extractedContract);

          if (contractValidation.valid) {
            if (specReconciliationCycle > 0) {
              emit({
                type: 'SPECIFICATION_RECONCILED',
                agent: 'System',
                message: `Specification contradiction successfully resolved on cycle ${specReconciliationCycle}.`,
              });
            }
            break; // Contract is verified and consistent; proceed to Designer/Blueprinter/Coder
          }

          // Validation Failed: Increment Cycle and Check Budget
          specReconciliationCycle++;
          if (specReconciliationCycle > MAX_SPEC_RECONCILIATION_CYCLES) {
            const fatalErr = `Specification Contradiction Gate Failed after ${MAX_SPEC_RECONCILIATION_CYCLES} reconciliation cycles: ${contractValidation.errors.join('; ')}`;
            emit({ type: 'PIPELINE_ERROR', message: fatalErr });
            throw new Error(fatalErr);
          }

          const fingerprint = crypto
            .createHash('sha256')
            .update(contractValidation.errors.sort().join('::'))
            .digest('hex');

          emit({
            type: 'SPECIFICATION_CONTRADICTION_DETECTED',
            agent: 'System',
            message: `Specification contradiction caught (Cycle ${specReconciliationCycle}/${MAX_SPEC_RECONCILIATION_CYCLES}). Initiating collective arbitration...`,
            data: { errors: contractValidation.errors },
          });

          // Step 1: Arbitrate Strategy via Ollama within Deterministic Boundaries
          const decision = await arbitrateSpecificationContradiction({
            userPromptText: userPrompt,
            specs: currentSpecs,
            contract: extractedContract,
            validationErrors: contractValidation.errors,
            signal: executionSignal,
          });

          // Step 2: Anti-Oscillation Fail-Closed Guard
          if (detectSpecificationOscillation(reconciliationHistory, { ...decision, fingerprint })) {
            const oscErr = `Specification Reconciliation Aborted: Oscillation detected on cycle ${specReconciliationCycle}. System halted to prevent infinite loop.`;
            emit({ type: 'PIPELINE_ERROR', message: oscErr });
            throw new Error(oscErr);
          }
          reconciliationHistory.push({ ...decision, fingerprint });

          // Step 3: Phase 1 (Prepare) — Snapshot VFS & Lock Transaction
          const tx = await prepareReconciliationTransaction({
            conversationId,
            pipelineRunId: runId,
            cycleNumber: specReconciliationCycle,
            leaseOwnerId,
            targetStage: decision.targetStage as StageName,
            selectedApproach: decision.selectedApproach,
            directive: decision.reconciliationDirective,
            fingerprint,
            validationErrors: contractValidation.errors,
          });

          // Step 4: Re-execute Target Stage (Orchestrator Drives Execution!)
          emit({
            type: 'SPECIFICATION_RECONCILING',
            agent: decision.targetStage,
            message: `Re-executing ${decision.targetStage} with reconciliation directive: ${decision.selectedApproach}`,
            data: { directive: decision.reconciliationDirective },
          });

          try {
            await executeContractStage({
              conversationId,
              pipelineRunId: runId,
              stageName: decision.targetStage as StageName,
              userPromptText: userPrompt,
              onEvent: emit,
              ledger,
              leaseOwnerId,
              signal: executionSignal,
              customUserContent: decision.reconciliationDirective,
            });

            // If Architect was regenerated, System must also regenerate to consume new architecture
            if (decision.targetStage === 'Architect') {
              emit({
                type: 'SPECIFICATION_RECONCILING',
                agent: 'System',
                message: 'Cascading regeneration: Re-executing System to align with updated architecture.md',
              });
              await executeContractStage({
                conversationId,
                pipelineRunId: runId,
                stageName: 'System',
                userPromptText: userPrompt,
                onEvent: emit,
                ledger,
                leaseOwnerId,
                signal: executionSignal,
              });
            }

            // Step 5: Verify Contract Consistency Post-Regeneration
            const postPlan = (await readVirtualFile(conversationId, 'plan.md')) || '';
            const postReqs = (await readVirtualFile(conversationId, 'requirements.md')) || '';
            const postArch = (await readVirtualFile(conversationId, 'architecture.md')) || '';
            const postBackend = (await readVirtualFile(conversationId, 'backend_spec.md')) || '';

            const postContract = extractProjectContract({
              'plan.md': postPlan,
              'requirements.md': postReqs,
              'architecture.md': postArch,
              'backend_spec.md': postBackend,
            });

            const postValidation = validateProjectContract(postContract);

            if (postValidation.valid) {
              // Phase 2 (Commit): Atomically publish accepted versions
              await commitReconciliationTransaction(tx);
              emit({
                type: 'SPECIFICATION_RECONCILED',
                agent: 'System',
                message: `Specification contradiction successfully reconciled on cycle ${specReconciliationCycle}.`,
              });
              break; // Proceed to Designer
            } else {
              // Validation rejected: Rollback VFS to snapshot
              await abortReconciliationTransaction(tx, postValidation.errors.join('; '));
              if (specReconciliationCycle >= MAX_SPEC_RECONCILIATION_CYCLES) {
                const fatalErr = `Specification Contradiction Gate Failed after ${MAX_SPEC_RECONCILIATION_CYCLES} reconciliation cycles: ${postValidation.errors.join('; ')}`;
                emit({ type: 'PIPELINE_ERROR', message: fatalErr });
                throw new Error(fatalErr);
              }
            }
          } catch (err: any) {
            // Execution exception: Rollback VFS to snapshot
            await abortReconciliationTransaction(tx, err.message);
            throw err;
          }
        }
      }

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
          data: contractResult.content,
        });

        if (stopHeartbeat) stopHeartbeat();
        return; // Exit orchestrator loop, waiting for user resume signal
      }
    }

    // Flush all VFS files to disk workspace before final gate & deterministic verification
    await flushVfsToDisk(conversationId);

    // Assert pipeline lease before final gate evaluation
    await assertPipelineLease(conversationId, leaseOwnerId);

    // Run deterministic Security Gate & persist GateDecision (F-06, F-14)
    const vfsRecordsForGate = await prisma.virtualFile.findMany({ where: { conversationId } });
    const vfsMapForGate: Record<string, string> = {};
    for (const vf of vfsRecordsForGate) {
      vfsMapForGate[vf.filePath] = vf.content;
    }
    const securityGateRes = validateSecurityGate(vfsMapForGate);
    if (runId) {
      await prisma.gateDecision.create({
        data: {
          conversationId,
          pipelineRunId: runId,
          stageName: 'Security',
          gateName: 'SECURITY_GATE',
          decision: securityGateRes.passed ? 'PASSED' : 'BLOCKED',
          actor: 'SYSTEM',
          reason: securityGateRes.passed
            ? 'DETERMINISTIC_SCAN_CLEAN'
            : `SECURITY_HARD_BLOCK: ${securityGateRes.blocking.map((b) => b.message).join('; ')}`,
        },
      });
    }

    // Evaluate final gate before launching preview or marking Completed
    const finalGate = await evaluateFinalPipelineGate(conversationId, runId, leaseOwnerId);
    if (!finalGate.valid) {
      if (runId) {
        await prisma.gateDecision.create({
          data: {
            conversationId,
            pipelineRunId: runId,
            stageName: 'Reviewer',
            gateName: 'QUALITY_GATE',
            decision: 'BLOCKED',
            actor: 'SYSTEM',
            reason: finalGate.errors.join('; '),
          },
        });
      }
      const gateErr = `Final Pipeline Gate Validation Failed: ${finalGate.errors.join('; ')}`;
      emit({
        type: 'PIPELINE_ERROR',
        message: gateErr,
      });
      throw new Error(gateErr);
    }

    if (runId) {
      await prisma.gateDecision.create({
        data: {
          conversationId,
          pipelineRunId: runId,
          stageName: 'Reviewer',
          gateName: 'QUALITY_GATE',
          decision: 'PASSED',
          actor: 'SYSTEM',
          reason: 'FINAL_GATE_PASSED',
        },
      });
    }

    // Launch preview ONLY after Final Gate and deterministic Security/Quality Gates pass (F-08)
    await launchVSCodePreview(conversationId, emit);

    await prisma.$transaction([
      prisma.conversation.update({
        where: { id: conversationId },
        data: { status: 'Completed' },
      }),
      prisma.pipelineRun.update({
        where: { conversationId },
        data: { state: 'COMPLETED' },
      }),
    ]);

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
    }).catch(() => {});
    finalPipelineState = 'FAILED';
  } finally {
    if (stopHeartbeat) stopHeartbeat();
    stopOllamaKeepAlive();
    pipelineAbortControllers.delete(conversationId);
    await flushVfsToDisk(conversationId).catch(() => {});
    localActivePipelines.delete(conversationId);
    activePipelines.delete(conversationId);
    if (leaseOwnerId) {
      await releasePipelineLease(conversationId, leaseOwnerId, finalPipelineState).catch(() => {});
    }
  }
}
