import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { prisma } from '../../db';
import {
  runInference,
  stopOllamaKeepAlive,
  cleanJsonResponse,
} from '../inference';
import { flushVfsToDisk } from './vfs';

export type PipelineEventCallback = (event: {
  type: string;
  agent?: string;
  message: string;
  data?: any;
}) => void;

export const pipelineEvents = new EventEmitter();
pipelineEvents.setMaxListeners(100);

export const activePipelines = new Set<string>();
export const pipelineAbortControllers = new Map<string, AbortController>();
export const abortedBeforeRegistration = new Set<string>();

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

export function isAbortError(err: any, signal?: AbortSignal): boolean {
  if (signal?.aborted) return true;
  if (!err) return false;
  if (err.name === 'TimeoutError') return false;
  if (err.name === 'DOMException' && String(err.message || '').toLowerCase().includes('timeout')) return false;
  const msg = String(err.message || '').toLowerCase();
  if (msg.includes('timeout') || msg.includes('timed out')) return false;
  if (err.name === 'AbortError') return true;
  if (err.name === 'DOMException' && msg.includes('abort')) return true;
  return (
    msg.includes('aborted by signal') ||
    msg.includes('the user aborted a request') ||
    msg.includes('aborted during tool execution') ||
    msg.includes('aborted before inference') ||
    (msg.includes('operation was aborted') && !msg.includes('timeout'))
  );
}

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

export function isInfrastructureError(err: any): boolean {
  const msg = String(err?.message || '').toLowerCase();
  const code = String(err?.code ?? '').toLowerCase();
  const causeMsg = String(err?.cause?.message || '').toLowerCase();
  return (
    INFRA_ERROR_SIGNATURES.some((sig) => msg.includes(sig) || causeMsg.includes(sig)) ||
    code === 'und_err_socket' ||
    code === 'econnreset' ||
    code === 'econnrefused'
  );
}

export async function handleInfrastructurePause(
  conversationId: string,
  onEvent: PipelineEventCallback,
  errorMessage: string
): Promise<void> {
  onEvent({
    type: 'PIPELINE_ERROR',
    message:
      `⚠️ INFRASTRUCTURE INTERRUPTION: LLM host connection interrupted.\n` +
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

export async function classifyIsSoftwareRequest(
  prompt: string,
  signal?: AbortSignal
): Promise<{ isSoftware: boolean; reason: string | null }> {
  try {
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
        signal,
      }
    );

    const cleaned = cleanJsonResponse(responseText);
    const parsed = JSON.parse(cleaned);
    return {
      isSoftware: !!parsed.isSoftware,
      reason: parsed.reason || null,
    };
  } catch {
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

export function evaluateComplexity(
  planSnapshot: string,
  fileCount: number
): { complexity: 'SIMPLE' | 'MODERATE' | 'COMPLEX'; recommendedTokens: number; enableReasoning: boolean } {
  if (fileCount <= 3) {
    return { complexity: 'SIMPLE', recommendedTokens: 1024, enableReasoning: false };
  }
  if (fileCount >= 15) {
    return { complexity: 'COMPLEX', recommendedTokens: 4096, enableReasoning: true };
  }

  const hasBackend =
    !planSnapshot.toLowerCase().includes('no backend') && !planSnapshot.toLowerCase().includes('frontend-only');
  if (hasBackend) {
    return { complexity: 'COMPLEX', recommendedTokens: 3072, enableReasoning: true };
  }
  return { complexity: 'MODERATE', recommendedTokens: 2048, enableReasoning: false };
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
