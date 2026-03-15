import { analyzeCode, continuousDebug } from './continuous-debugger.js';
import { analyzeError } from './deep-debugging-engine.js';
import { parseErrors, analyzeAndFix } from './vite-error-fixer.js';
import { getPipelineStages, getStageDescription } from './pipeline-orchestrator.js';
import type { PipelineStage } from './pipeline-orchestrator.js';
import { analyzeRequest } from './deep-understanding-engine.js';
import { generatePlan } from './plan-generator.js';
import { analyzeSemantics } from './contextual-reasoning-engine.js';
import { planArchitecture } from './architecture-planner.js';
import { generateDesignSystem } from './design-system-engine.js';
import { designSchema } from './schema-designer.js';
import { designAPI } from './api-designer.js';
import { composeComponents } from './component-composer.js';
import { generateProjectFromPlan } from './plan-driven-generator.js';
import { validateAndFix } from './post-generation-validator.js';
import { learnFromInteraction } from './context-memory.js';
import { resolveDependencies } from './dependency-resolver.js';
import { runTests } from './testing-engine.js';

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

function initBuiltinExecutors(): void {
  registerStageExecutor('understand', (payload) => {
    const { userRequest, conversationContext } = payload || {};
    if (!userRequest) return { output: null, errors: ['Missing required field: userRequest'] };
    try {
      const result = analyzeRequest(userRequest, conversationContext);
      return { output: result, errors: [] };
    } catch (err) {
      return { output: null, errors: [err instanceof Error ? err.message : String(err)] };
    }
  });

  registerStageExecutor('plan', (payload) => {
    const { understanding } = payload || {};
    if (!understanding) return { output: null, errors: ['Missing required field: understanding'] };
    try {
      const result = generatePlan(understanding);
      return { output: result, errors: [] };
    } catch (err) {
      return { output: null, errors: [err instanceof Error ? err.message : String(err)] };
    }
  });

  registerStageExecutor('reason', (payload) => {
    const { plan } = payload || {};
    if (!plan) return { output: null, errors: ['Missing required field: plan'] };
    try {
      const result = analyzeSemantics(plan);
      return { output: result, errors: [] };
    } catch (err) {
      return { output: null, errors: [err instanceof Error ? err.message : String(err)] };
    }
  });

  registerStageExecutor('architect', (payload) => {
    const { plan, reasoning } = payload || {};
    if (!plan) return { output: null, errors: ['Missing required field: plan'] };
    try {
      const result = planArchitecture(plan, reasoning || null);
      return { output: result, errors: [] };
    } catch (err) {
      return { output: null, errors: [err instanceof Error ? err.message : String(err)] };
    }
  });

  registerStageExecutor('design', (payload) => {
    const { plan, reasoning } = payload || {};
    if (!plan) return { output: null, errors: ['Missing required field: plan'] };
    try {
      const result = generateDesignSystem(plan, reasoning);
      return { output: result, errors: [] };
    } catch (err) {
      return { output: null, errors: [err instanceof Error ? err.message : String(err)] };
    }
  });

  registerStageExecutor('schema', (payload) => {
    const { plan, reasoning } = payload || {};
    if (!plan) return { output: null, errors: ['Missing required field: plan'] };
    try {
      const result = designSchema(plan, reasoning || null);
      return { output: result, errors: [] };
    } catch (err) {
      return { output: null, errors: [err instanceof Error ? err.message : String(err)] };
    }
  });

  registerStageExecutor('api', (payload) => {
    const { plan, reasoning, schema } = payload || {};
    if (!plan) return { output: null, errors: ['Missing required field: plan'] };
    try {
      const result = designAPI(plan, reasoning || null, schema || null);
      return { output: result, errors: [] };
    } catch (err) {
      return { output: null, errors: [err instanceof Error ? err.message : String(err)] };
    }
  });

  registerStageExecutor('compose', (payload) => {
    const { plan, reasoning, funcSpec, designSystem } = payload || {};
    if (!plan) return { output: null, errors: ['Missing required field: plan'] };
    try {
      const result = composeComponents(plan, reasoning || null, funcSpec || null, designSystem || null);
      return { output: result, errors: [] };
    } catch (err) {
      return { output: null, errors: [err instanceof Error ? err.message : String(err)] };
    }
  });

  registerStageExecutor('generate', (payload) => {
    const { plan } = payload || {};
    if (!plan) return { output: null, errors: ['Missing required field: plan'] };
    try {
      const files = generateProjectFromPlan(plan);
      return { output: { files: files.map(f => ({ path: f.path, language: f.language, lineCount: f.content.split('\n').length })), fileCount: files.length }, errors: [] };
    } catch (err) {
      return { output: null, errors: [err instanceof Error ? err.message : String(err)] };
    }
  });

  registerStageExecutor('validate', (payload) => {
    const { files } = payload || {};
    if (!files || !Array.isArray(files)) return { output: null, errors: ['Missing required field: files (array of {path, content, language})'] };
    try {
      const result = validateAndFix(files, 1);
      return {
        output: {
          issueCount: result.issues.length,
          fixesApplied: result.fixesApplied,
          issues: result.issues.slice(0, 20),
        },
        errors: [],
      };
    } catch (err) {
      return { output: null, errors: [err instanceof Error ? err.message : String(err)] };
    }
  });

  registerStageExecutor('learn', (payload) => {
    const { userId, prompt, response } = payload || {};
    if (!userId || !prompt) return { output: null, errors: ['Missing required fields: userId, prompt'] };
    try {
      learnFromInteraction(userId, prompt, response || '', {});
      return { output: { learned: true, userId }, errors: [] };
    } catch (err) {
      return { output: null, errors: [err instanceof Error ? err.message : String(err)] };
    }
  });

  registerStageExecutor('specify', (payload) => {
    const { plan } = payload || {};
    if (!plan) return { output: null, errors: ['Missing required field: plan'] };
    try {
      const features = (plan.features || []).map((f: any) => ({
        name: f.name || f,
        type: f.type || 'feature',
        pages: f.pages || [],
        crudOps: f.crudOps || ['read'],
      }));
      return { output: { features, featureCount: features.length }, errors: [] };
    } catch (err) {
      return { output: null, errors: [err instanceof Error ? err.message : String(err)] };
    }
  });

  registerStageExecutor('resolve', (payload) => {
    const { plan, files } = payload || {};
    if (!plan) return { output: null, errors: ['Missing required field: plan'] };
    try {
      const result = resolveDependencies(plan, files || []);
      return { output: result, errors: [] };
    } catch (err) {
      return { output: null, errors: [err instanceof Error ? err.message : String(err)] };
    }
  });

  registerStageExecutor('quality', (payload) => {
    const { files } = payload || {};
    if (!files || !Array.isArray(files)) return { output: null, errors: ['Missing required field: files'] };
    try {
      const report = runDiagnostics(files);
      return {
        output: {
          totalIssues: report.totalIssues,
          bySeverity: report.bySeverity,
          healthyFiles: report.healthyFiles,
          unhealthyFiles: report.unhealthyFiles,
        },
        errors: [],
      };
    } catch (err) {
      return { output: null, errors: [err instanceof Error ? err.message : String(err)] };
    }
  });

  registerStageExecutor('test', (payload) => {
    const { files, plan } = payload || {};
    if (!files || !Array.isArray(files)) return { output: null, errors: ['Missing required field: files'] };
    try {
      const testableFiles = files.filter((f: any) => /\.(ts|tsx|js|jsx)$/.test(f.path));
      const testSuite = {
        name: plan?.projectName || 'project',
        tests: testableFiles.map((f: any) => ({
          name: `validate-${f.path}`,
          type: 'unit' as const,
          target: f.path,
          assertions: [{ type: 'exists' as const, expected: true }],
        })),
      };
      const results = runTests(testSuite, testableFiles.map((f: any) => f.content).join('\n'));
      return { output: { passed: results.passed, failed: results.failed, total: results.total }, errors: [] };
    } catch (err) {
      return { output: null, errors: [err instanceof Error ? err.message : String(err)] };
    }
  });

  registerStageExecutor('deep-quality', (payload) => {
    const { files } = payload || {};
    if (!files || !Array.isArray(files)) return { output: null, errors: ['Missing required field: files'] };
    try {
      const report = runDiagnostics(files);
      const crossFileIssues: string[] = [];
      const importMap = new Map<string, string[]>();
      for (const file of files) {
        const imports = (file.content.match(/from\s+['"]([^'"]+)['"]/g) || [])
          .map((m: string) => m.replace(/from\s+['"]|['"]/g, ''));
        importMap.set(file.path, imports);
      }
      const filePaths = new Set(files.map((f: any) => f.path));
      for (const [filePath, imports] of importMap) {
        for (const imp of imports) {
          const resolved = imp.startsWith('.') ? imp.replace(/^\.\//, '') : null;
          if (resolved && !filePaths.has(resolved) && !filePaths.has(resolved + '.ts') && !filePaths.has(resolved + '.tsx')) {
            crossFileIssues.push(`${filePath} imports '${imp}' which may not exist in project`);
          }
        }
      }
      return {
        output: {
          diagnostics: { totalIssues: report.totalIssues, bySeverity: report.bySeverity },
          crossFileIssues,
          qualityScore: Math.max(0, 100 - report.totalIssues * 5 - crossFileIssues.length * 10),
        },
        errors: [],
      };
    } catch (err) {
      return { output: null, errors: [err instanceof Error ? err.message : String(err)] };
    }
  });

  registerStageExecutor('record', (payload) => {
    const { plan, metrics, outcome } = payload || {};
    try {
      const record = {
        timestamp: Date.now(),
        projectName: plan?.projectName || 'unknown',
        fileCount: metrics?.fileCount || 0,
        outcome: outcome || 'completed',
        recorded: true,
      };
      return { output: record, errors: [] };
    } catch (err) {
      return { output: null, errors: [err instanceof Error ? err.message : String(err)] };
    }
  });
}

initBuiltinExecutors();

const STAGE_ALIASES: Record<string, string> = {
  'schema-design': 'schema',
  'api-design': 'api',
  'component-compose': 'compose',
  'code-generate': 'generate',
  'post-validate': 'validate',
  'deep-understand': 'understand',
  'plan-generate': 'plan',
  'semantic-reason': 'reason',
  'arch-plan': 'architect',
  'design-system': 'design',
};

function resolveStageId(input: string): string {
  return STAGE_ALIASES[input] || input;
}

export function runStageTest(stageId: string, payload: unknown): StageTestResult {
  const resolvedId = resolveStageId(stageId);
  const stage = getStageDescription(resolvedId);
  if (!stage) {
    return {
      stageId,
      stageName: 'Unknown',
      durationMs: 0,
      success: false,
      output: null,
      errors: [`Unknown stage: ${stageId}${stageId !== resolvedId ? ` (resolved to ${resolvedId})` : ''}`],
    };
  }

  const executor = STAGE_EXECUTORS[resolvedId];
  if (!executor) {
    return {
      stageId: resolvedId,
      stageName: stage.name,
      durationMs: 0,
      success: false,
      output: null,
      errors: [`No executor registered for stage: ${resolvedId}`],
    };
  }

  const start = Date.now();
  try {
    const result = executor(payload);
    return {
      stageId: resolvedId,
      stageName: stage.name,
      durationMs: Date.now() - start,
      success: result.errors.length === 0,
      output: result.output,
      errors: result.errors,
    };
  } catch (err) {
    return {
      stageId: resolvedId,
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
      if (issue.severity === 'info' || issue.severity === 'warning') continue;
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
      const deepAnalysis = analyzeError(errorDescription, currentContent);
      const automatedFixes = deepAnalysis.fixChain.filter(f => f.automated && f.code);
      for (const fix of automatedFixes) {
        if (fix.code && currentContent !== fix.code) {
          currentContent = fix.code;
          allFixes.push(`[deep-debugger] ${fix.description}`);
          changed = true;
        }
      }
    } catch (err) {
      allFixes.push(`[deep-debugger] analysis skipped: ${err instanceof Error ? err.message : 'unknown error'}`);
    }

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
    } catch (err) {
      allFixes.push(`[vite-fixer] analysis skipped: ${err instanceof Error ? err.message : 'unknown error'}`);
    }

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
    iterations: Math.min(iteration, MAX_FIX_ITERATIONS),
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
