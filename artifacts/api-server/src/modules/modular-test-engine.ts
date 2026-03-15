import { analyzeCode, autoFixCode, continuousDebug } from './continuous-debugger.js';
import { analyzeError, parseStackTrace, generateFixChain } from './deep-debugging-engine.js';
import type { DebugAnalysis, FixStep } from './deep-debugging-engine.js';
import { parseErrors, analyzeAndFix } from './vite-error-fixer.js';
import type { FixAction, FixResult } from './vite-error-fixer.js';
import { getPipelineStages, getStageDescription } from './pipeline-orchestrator.js';
import type { PipelineStage } from './pipeline-orchestrator.js';

export interface DiagnosticIssue {
  file: string;
  severity: 'critical' | 'error' | 'warning' | 'info';
  type: string;
  message: string;
  line?: number;
  column?: number;
  autoFixable: boolean;
  source: 'continuous-debugger' | 'deep-debugger' | 'vite-fixer';
}

export interface DiagnosticsReport {
  totalIssues: number;
  bySeverity: { critical: number; error: number; warning: number; info: number };
  byFile: Record<string, DiagnosticIssue[]>;
  fileCount: number;
  healthyFiles: number;
  unhealthyFiles: number;
}

export interface ModularFixResult {
  file: string;
  originalContent: string;
  fixedContent: string;
  iterations: number;
  fixesApplied: string[];
  remainingIssues: DiagnosticIssue[];
  success: boolean;
}

export interface StageTestResult {
  stageId: string;
  stageName: string;
  durationMs: number;
  success: boolean;
  output: unknown;
  errors: string[];
}

const STAGE_EXECUTORS: Record<string, (payload: any) => { output: unknown; errors: string[] }> = {};

export function registerStageExecutor(stageId: string, executor: (payload: any) => { output: unknown; errors: string[] }): void {
  STAGE_EXECUTORS[stageId] = executor;
}

export function runStageTest(stageId: string, payload: unknown): StageTestResult {
  const stage = getStageDescription(stageId);
  if (!stage) {
    return {
      stageId,
      stageName: 'Unknown',
      durationMs: 0,
      success: false,
      output: null,
      errors: [`Unknown stage: ${stageId}`],
    };
  }

  const executor = STAGE_EXECUTORS[stageId];
  if (!executor) {
    return {
      stageId,
      stageName: stage.name,
      durationMs: 0,
      success: false,
      output: null,
      errors: [`No executor registered for stage: ${stageId}`],
    };
  }

  const start = Date.now();
  try {
    const result = executor(payload);
    return {
      stageId,
      stageName: stage.name,
      durationMs: Date.now() - start,
      success: result.errors.length === 0,
      output: result.output,
      errors: result.errors,
    };
  } catch (err) {
    return {
      stageId,
      stageName: stage.name,
      durationMs: Date.now() - start,
      success: false,
      output: null,
      errors: [err instanceof Error ? err.message : String(err)],
    };
  }
}

export function getAvailableStages(): { id: string; name: string; hasExecutor: boolean }[] {
  return getPipelineStages().map((s: PipelineStage) => ({
    id: s.id,
    name: s.name,
    hasExecutor: !!STAGE_EXECUTORS[s.id],
  }));
}

export function runDiagnostics(files: { path: string; content: string }[]): DiagnosticsReport {
  const byFile: Record<string, DiagnosticIssue[]> = {};
  const bySeverity = { critical: 0, error: 0, warning: 0, info: 0 };
  let totalIssues = 0;
  let healthyFiles = 0;
  let unhealthyFiles = 0;

  for (const file of files) {
    const ext = file.path.split('.').pop() || '';
    if (!['ts', 'tsx', 'js', 'jsx', 'css', 'json'].includes(ext)) {
      healthyFiles++;
      continue;
    }

    const issues: DiagnosticIssue[] = [];

    const analysis = analyzeCode(file.content, ext === 'css' ? 'css' : 'javascript');
    for (const issue of analysis.issues) {
      if (issue.severity === 'info') continue;
      issues.push({
        file: file.path,
        severity: issue.severity,
        type: issue.type,
        message: issue.message,
        line: issue.line,
        column: issue.column,
        autoFixable: issue.autoFixable,
        source: 'continuous-debugger',
      });
    }

    if (issues.length > 0) {
      byFile[file.path] = issues;
      unhealthyFiles++;
      for (const i of issues) {
        bySeverity[i.severity]++;
        totalIssues++;
      }
    } else {
      healthyFiles++;
    }
  }

  return {
    totalIssues,
    bySeverity,
    byFile,
    fileCount: files.length,
    healthyFiles,
    unhealthyFiles,
  };
}

const MAX_FIX_ITERATIONS = 5;

export function runModularFix(
  filePath: string,
  fileContent: string,
  errorDescription: string,
  allFiles?: { path: string; content: string }[]
): ModularFixResult {
  let currentContent = fileContent;
  const allFixes: string[] = [];
  let iteration = 0;

  for (iteration = 1; iteration <= MAX_FIX_ITERATIONS; iteration++) {
    let changed = false;

    const debugResult = continuousDebug(currentContent, `fix-${filePath}-${iteration}`);
    if (debugResult.autoFixes.length > 0) {
      currentContent = debugResult.fixedCode;
      allFixes.push(...debugResult.autoFixes.map(f => `[continuous-debugger] ${f}`));
      changed = true;
    }

    try {
      const parsed = parseStackTrace(errorDescription);
      const deepAnalysis = analyzeError(errorDescription, currentContent);
      const automatedFixes = deepAnalysis.fixChain.filter(f => f.automated && f.code);
      for (const fix of automatedFixes) {
        if (fix.code && currentContent !== fix.code) {
          currentContent = fix.code;
          allFixes.push(`[deep-debugger] ${fix.description}`);
          changed = true;
        }
      }
    } catch {}

    try {
      const parsedErrors = parseErrors([errorDescription]);
      if (parsedErrors.length > 0) {
        const projectFiles = [{ path: filePath, content: currentContent, language: getLanguage(filePath) }];
        if (allFiles) {
          for (const f of allFiles) {
            if (f.path !== filePath) {
              projectFiles.push({ path: f.path, content: f.content, language: getLanguage(f.path) });
            }
          }
        }
        const viteFixes = analyzeAndFix(parsedErrors, projectFiles);
        for (const fix of viteFixes.fixes) {
          if (fix.filePath === filePath && fix.type === 'patch_file') {
            if (fix.oldContent) {
              const patched = currentContent.replace(fix.oldContent, fix.newContent);
              if (patched !== currentContent) {
                currentContent = patched;
                allFixes.push(`[vite-fixer] ${fix.description}`);
                changed = true;
              }
            } else if (fix.newContent) {
              currentContent = fix.newContent;
              allFixes.push(`[vite-fixer] ${fix.description}`);
              changed = true;
            }
          }
        }
      }
    } catch {}

    if (!changed) break;

    const recheck = analyzeCode(currentContent);
    const remainingErrors = recheck.issues.filter(i => i.severity === 'critical' || i.severity === 'error');
    if (remainingErrors.length === 0) break;
  }

  const finalCheck = analyzeCode(currentContent);
  const remainingIssues: DiagnosticIssue[] = finalCheck.issues
    .filter(i => i.severity !== 'info')
    .map(i => ({
      file: filePath,
      severity: i.severity,
      type: i.type,
      message: i.message,
      line: i.line,
      column: i.column,
      autoFixable: i.autoFixable,
      source: 'continuous-debugger' as const,
    }));

  return {
    file: filePath,
    originalContent: fileContent,
    fixedContent: currentContent,
    iterations: iteration,
    fixesApplied: allFixes,
    remainingIssues,
    success: remainingIssues.filter(i => i.severity === 'critical' || i.severity === 'error').length === 0,
  };
}

function getLanguage(filePath: string): string {
  const ext = filePath.split('.').pop() || '';
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    css: 'css', json: 'json', html: 'html',
  };
  return map[ext] || 'javascript';
}
