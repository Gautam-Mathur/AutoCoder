import { createHash } from 'crypto';
import path from 'path';
import ts from 'typescript';
import { prisma } from '../../db';
import { createContentHash } from './contracts/fingerprints';
import {
  computeWorkspaceFingerprint,
  VerificationFailure,
} from './verification-loop';
import {
  AuthorizedFileSet,
  isControlPlaneArtifact,
  loadAuthorizedFileSet,
  normalizeProjectPath,
} from './workspace-policy';
import { CheckStatus } from './security-gate';
import { parseDebuggerOutput } from './contracts/schemas/debugger';
import { readVirtualFile, listVirtualFiles } from './vfs';
import { parseHtmlDocument } from './dom-contract-validator';
import { resolveModule, parseTsConfigOptions } from './module-resolver';

export type FailureId = string;
export type WorkspaceVersion = string;
export type RepairAttemptId = string;

export interface NormalizedFailure {
  id: FailureId;
  source: 'tester' | 'validator' | 'build';
  message: string;
  affectedFiles: string[];
  evidence?: string[];
}

export interface RepairPlan {
  basedOnWorkspaceVersion: WorkspaceVersion;
  failureIds: FailureId[];
  affectedFiles: string[];
  instructions: string[];
  verificationTargets: string[];
  status?: 'repairable' | 'needs_information' | 'not_repairable';
  rootCauses?: Record<FailureId, string>;
}

export interface RepairPlanValidation {
  valid: boolean;
  acceptedFailureIds: string[];
  unaddressedFailureIds: string[];
  authorizedTargets: string[];
  rejectedTargets: Array<{ path: string; reason: string }>;
  issues: Array<{
    code: string;
    message: string;
    relatedFailureIds: string[];
  }>;
}

export interface RepairEvidence {
  planValid: boolean;
  allChangesAuthorized: boolean;
  testerWorkspaceVersion: string;
  postRepairWorkspaceVersion: string;
  requiredChecks: Array<{ name: string; status: CheckStatus }>;
  unresolvedOriginalFailureIds: string[];
  acceptedRunId: string;
  pipelineRunId: string;
  acceptedWorkspaceVersion: string;
}

export interface RepairAttemptResult {
  attemptId: RepairAttemptId;
  status: 'repaired' | 'retryable' | 'conflict' | 'failed';
  beforeVersion: WorkspaceVersion;
  afterVersion?: WorkspaceVersion;
  resolvedFailureIds: FailureId[];
  unresolvedFailureIds: FailureId[];
  changedFiles: string[];
  reason?: string;
}

/**
 * Strict 6-condition evidence conjunction governing repair success (Section 18.2).
 */
export function isRepairSuccessful(evidence: RepairEvidence): boolean {
  return (
    evidence.planValid &&
    evidence.allChangesAuthorized &&
    evidence.testerWorkspaceVersion === evidence.postRepairWorkspaceVersion &&
    evidence.requiredChecks.every((check) => check.status === 'passed') &&
    evidence.unresolvedOriginalFailureIds.length === 0 &&
    evidence.acceptedRunId === evidence.pipelineRunId &&
    evidence.acceptedWorkspaceVersion === evidence.postRepairWorkspaceVersion
  );
}

export type RepairAttemptState =
  | 'PLANNED'
  | 'AUTHORIZED'
  | 'STAGED'
  | 'COMMITTED'
  | 'VERIFIED'
  | 'ACCEPTED'
  | 'RECOVERY_REQUIRED'
  | 'FAILED';

export interface DurableRepairAttempt {
  attemptId: RepairAttemptId;
  idempotencyKey: string;
  workspaceId: string;
  pipelineRunId: string;
  baseRevision: WorkspaceVersion;
  normalizedFailureIds: FailureId[];
  planDigest: string;
  authorizedTargets: string[];
  state: RepairAttemptState;
  committedRevision?: WorkspaceVersion;
  commitReceiptId?: string;
  recoveryNote?: string;
}

export interface CommitReceipt {
  commitReceiptId: string;
  attemptId: RepairAttemptId;
  idempotencyKey: string;
  committedRevision: WorkspaceVersion;
  contentHash: string;
  timestamp: number;
}

export function createDurableRepairAttempt(params: {
  workspaceId: string;
  pipelineRunId: string;
  baseRevision: WorkspaceVersion;
  normalizedFailureIds: FailureId[];
  planDigest: string;
  authorizedTargets: string[];
  attemptNumber?: number;
}): DurableRepairAttempt {
  const attemptNumber = params.attemptNumber ?? 1;
  const attemptId = `ATTEMPT-${params.pipelineRunId.slice(0, 8)}-${attemptNumber}-${Date.now()}`;
  const idempotencyKey = createContentHash(
    `${params.pipelineRunId}:${attemptId}:${params.baseRevision}:${params.authorizedTargets.sort().join(',')}`
  );

  return {
    attemptId,
    idempotencyKey,
    workspaceId: params.workspaceId,
    pipelineRunId: params.pipelineRunId,
    baseRevision: params.baseRevision,
    normalizedFailureIds: params.normalizedFailureIds,
    planDigest: params.planDigest,
    authorizedTargets: params.authorizedTargets,
    state: 'PLANNED',
  };
}

export function recordCommitReceipt(
  attempt: DurableRepairAttempt,
  committedRevision: WorkspaceVersion,
  contentHash: string
): { attempt: DurableRepairAttempt; receipt: CommitReceipt } {
  const commitReceiptId = `RECEIPT-${attempt.attemptId}`;
  const receipt: CommitReceipt = {
    commitReceiptId,
    attemptId: attempt.attemptId,
    idempotencyKey: attempt.idempotencyKey,
    committedRevision,
    contentHash,
    timestamp: Date.now(),
  };

  const updatedAttempt: DurableRepairAttempt = {
    ...attempt,
    state: 'COMMITTED',
    committedRevision,
    commitReceiptId,
  };

  return { attempt: updatedAttempt, receipt };
}

/**
 * Reconciles repair attempt state after a worker crash or restart (Section 22.1 / Gate 2A).
 * Idempotently determines whether a commit occurred or whether partial recovery is required.
 */
export function reconcileRepairAttemptCrash(
  attempt: DurableRepairAttempt,
  backendReceipts: Map<string, CommitReceipt>
): {
  action: 'resume_verification' | 'safe_to_retry' | 'recovery_required';
  reconciledAttempt: DurableRepairAttempt;
  reason: string;
} {
  const matchingReceipt = backendReceipts.get(attempt.idempotencyKey);

  // 1. If backend has an authoritative commit receipt matching idempotencyKey
  if (matchingReceipt) {
    const reconciledAttempt: DurableRepairAttempt = {
      ...attempt,
      state: 'COMMITTED',
      committedRevision: matchingReceipt.committedRevision,
      commitReceiptId: matchingReceipt.commitReceiptId,
      recoveryNote: `Reconciled from backend commit receipt ${matchingReceipt.commitReceiptId}. Do not re-apply patch.`,
    };
    return {
      action: 'resume_verification',
      reconciledAttempt,
      reason: 'Commit was confirmed in storage. Resuming verification without reapplying patch.',
    };
  }

  // 2. If crash occurred before commit (state was PLANNED or AUTHORIZED)
  if (attempt.state === 'PLANNED' || attempt.state === 'AUTHORIZED') {
    const reconciledAttempt: DurableRepairAttempt = {
      ...attempt,
      recoveryNote: 'Crash occurred before commit. No workspace mutation was applied.',
    };
    return {
      action: 'safe_to_retry',
      reconciledAttempt,
      reason: 'No mutations were committed to storage. Safe to retry within budget.',
    };
  }

  // 3. If crash occurred during staging or in an ambiguous state without a receipt
  const reconciledAttempt: DurableRepairAttempt = {
    ...attempt,
    state: 'RECOVERY_REQUIRED',
    recoveryNote: 'Ambiguous mutation state: attempted staging/commit without authoritative receipt.',
  };
  return {
    action: 'recovery_required',
    reconciledAttempt,
    reason: 'Ambiguous commit state requires operator inspection or backend journal rollback.',
  };
}

/**
 * Section 22.2: Global Budget Model
 */
export interface RepairBudget {
  pipelineRunId: string;
  repairOperationId: string;
  deadlineAt: number; // Unix timestamp ms
  maxRepairAttempts: number;
  repairAttemptsUsed: number;
  maxConflictRetries: number;
  conflictRetriesUsed: number;
  maxModelInvocations: number;
  modelInvocationsUsed: number;
  maxToolInvocations: number;
  toolInvocationsUsed: number;
  state: 'ACTIVE' | 'EXHAUSTED' | 'CANCELLED' | 'COMPLETED';
}

export function createRepairBudget(params: {
  pipelineRunId: string;
  repairOperationId?: string;
  maxWallClockMs?: number;
  maxRepairAttempts?: number;
  maxConflictRetries?: number;
  maxModelInvocations?: number;
  maxToolInvocations?: number;
}): RepairBudget {
  const now = Date.now();
  const maxWallClockMs = params.maxWallClockMs ?? 300_000;
  return {
    pipelineRunId: params.pipelineRunId,
    repairOperationId: params.repairOperationId ?? `REPAIR-OP-${params.pipelineRunId}`,
    deadlineAt: now + maxWallClockMs,
    maxRepairAttempts: params.maxRepairAttempts ?? 3,
    repairAttemptsUsed: 0,
    maxConflictRetries: params.maxConflictRetries ?? 2,
    conflictRetriesUsed: 0,
    maxModelInvocations: params.maxModelInvocations ?? 10,
    modelInvocationsUsed: 0,
    maxToolInvocations: params.maxToolInvocations ?? 20,
    toolInvocationsUsed: 0,
    state: 'ACTIVE',
  };
}

export function assertBudgetAvailable(
  budget: RepairBudget,
  cost?: { modelCalls?: number; toolCalls?: number }
): void {
  if (budget.state === 'EXHAUSTED') {
    throw new Error(`BUDGET_EXHAUSTED: Repair operation ${budget.repairOperationId} has exhausted its budget.`);
  }
  if (budget.state === 'CANCELLED') {
    throw new Error(`OPERATION_CANCELLED: Repair operation ${budget.repairOperationId} was cancelled.`);
  }
  if (Date.now() > budget.deadlineAt) {
    budget.state = 'EXHAUSTED';
    throw new Error(`BUDGET_EXHAUSTED: Wall-clock deadline exceeded for repair operation ${budget.repairOperationId}.`);
  }
  if (cost?.modelCalls && budget.modelInvocationsUsed + cost.modelCalls > budget.maxModelInvocations) {
    budget.state = 'EXHAUSTED';
    throw new Error(`BUDGET_EXHAUSTED: Maximum model invocations limit (${budget.maxModelInvocations}) reached.`);
  }
  if (cost?.toolCalls && budget.toolInvocationsUsed + cost.toolCalls > budget.maxToolInvocations) {
    budget.state = 'EXHAUSTED';
    throw new Error(`BUDGET_EXHAUSTED: Maximum tool invocations limit (${budget.maxToolInvocations}) reached.`);
  }
}

export function consumeRepairBudget(
  budget: RepairBudget,
  cost: {
    attempts?: number;
    conflicts?: number;
    modelCalls?: number;
    toolCalls?: number;
  }
): void {
  assertBudgetAvailable(budget, cost);

  if (cost.attempts) {
    budget.repairAttemptsUsed += cost.attempts;
    if (budget.repairAttemptsUsed > budget.maxRepairAttempts) {
      budget.state = 'EXHAUSTED';
      throw new Error(`BUDGET_EXHAUSTED: Maximum repair attempts (${budget.maxRepairAttempts}) exceeded.`);
    }
  }

  if (cost.conflicts) {
    budget.conflictRetriesUsed += cost.conflicts;
    if (budget.conflictRetriesUsed > budget.maxConflictRetries) {
      budget.state = 'EXHAUSTED';
      throw new Error(`BUDGET_EXHAUSTED: Maximum conflict retries (${budget.maxConflictRetries}) exceeded.`);
    }
  }

  if (cost.modelCalls) budget.modelInvocationsUsed += cost.modelCalls;
  if (cost.toolCalls) budget.toolInvocationsUsed += cost.toolCalls;
}

/**
 * Normalizes Tester report string or failures array into stable NormalizedFailure records.
 */
export function normalizeFailures(
  testerOutput: string | VerificationFailure[]
): NormalizedFailure[] {
  const normalized: NormalizedFailure[] = [];

  if (Array.isArray(testerOutput)) {
    for (let idx = 0; idx < testerOutput.length; idx++) {
      const f = testerOutput[idx];
      const normFile = f.file && f.file !== 'imports' && f.file !== 'project' && f.file !== 'tester'
        ? normalizeProjectPath(f.file)
        : '';
      normalized.push({
        id: `FAIL-${String(idx + 1).padStart(3, '0')}`,
        source: f.code === 'build' ? 'build' : 'tester',
        message: f.message || 'Verification failure',
        affectedFiles: normFile ? [normFile] : [],
        evidence: [f.message],
      });
    }
    return normalized;
  }

  if (typeof testerOutput === 'string') {
    const lines = testerOutput.split('\n');
    let inFailuresSection = false;
    let failIdx = 1;
    let currentFailure: NormalizedFailure | null = null;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (line.startsWith('### Failures')) {
        inFailuresSection = true;
        currentFailure = null;
        continue;
      }
      if (inFailuresSection && line.startsWith('### ')) {
        inFailuresSection = false;
        currentFailure = null;
        continue;
      }
      if (!inFailuresSection) continue;

      if (line.startsWith('-')) {
        currentFailure = null;
        const match = line.match(/^-\s*\[([^\]]+)\]\s*(.*)$/);
        if (match) {
          const filePath = match[1].trim();
          const message = match[2].trim();
          const normFile = filePath !== 'imports' && filePath !== 'project' && filePath !== 'tester'
            ? normalizeProjectPath(filePath)
            : '';
          currentFailure = {
            id: `FAIL-${String(failIdx++).padStart(3, '0')}`,
            source: 'tester',
            message,
            affectedFiles: normFile ? [normFile] : [],
            evidence: [line],
          };
          normalized.push(currentFailure);
        } else {
          const msg = line.replace(/^-\s*/, '').trim();
          if (msg && !/^None\b/i.test(msg)) {
            currentFailure = {
              id: `FAIL-${String(failIdx++).padStart(3, '0')}`,
              source: 'tester',
              message: msg,
              affectedFiles: [],
              evidence: [line],
            };
            normalized.push(currentFailure);
          }
        }
      } else if (line && currentFailure) {
        currentFailure.message = currentFailure.message
          ? `${currentFailure.message}\n${line}`
          : line;
        currentFailure.evidence = [...(currentFailure.evidence || []), line];
      }
    }
  }

  return normalized;
}

/**
 * Validates repair-plan completeness, failure linkage, and file authorization (Section 20.4).
 */
export function validateRepairPlan(params: {
  plan: RepairPlan;
  failures: NormalizedFailure[];
  baseWorkspaceVersion: WorkspaceVersion;
  authorized: AuthorizedFileSet;
}): RepairPlanValidation {
  const { plan, failures, baseWorkspaceVersion, authorized } = params;
  const issues: Array<{ code: string; message: string; relatedFailureIds: string[] }> = [];
  const rejectedTargets: Array<{ path: string; reason: string }> = [];
  const authorizedTargets: string[] = [];

  const knownFailureIds = new Set(failures.map((f) => f.id));
  const planFailureIds = new Set(plan?.failureIds || []);
  const acceptedFailureIds: string[] = [];
  const unaddressedFailureIds: string[] = [];

  // 1. Structural and base version check
  if (!plan) {
    issues.push({ code: 'MISSING_PLAN', message: 'Repair plan is missing.', relatedFailureIds: [] });
    return { valid: false, acceptedFailureIds, unaddressedFailureIds, authorizedTargets, rejectedTargets, issues };
  }

  if (!plan.basedOnWorkspaceVersion) {
    issues.push({
      code: 'MISSING_BASE_VERSION',
      message: 'Repair plan is missing required basedOnWorkspaceVersion.',
      relatedFailureIds: [],
    });
  } else if (plan.basedOnWorkspaceVersion !== baseWorkspaceVersion) {
    issues.push({
      code: 'STALE_BASE_VERSION',
      message: `Repair plan base version (${plan.basedOnWorkspaceVersion}) does not match current workspace version (${baseWorkspaceVersion}).`,
      relatedFailureIds: [],
    });
  }

  // 2. Failure linkage
  if (!plan.failureIds || plan.failureIds.length === 0) {
    if (failures.length > 0) {
      issues.push({
        code: 'EMPTY_FAILURE_IDS',
        message: 'Repair plan does not reference any failure IDs.',
        relatedFailureIds: [],
      });
    }
  } else {
    for (const fId of plan.failureIds) {
      if (!knownFailureIds.has(fId)) {
        issues.push({
          code: 'UNKNOWN_FAILURE_ID',
          message: `Repair plan references unknown failure ID "${fId}".`,
          relatedFailureIds: [fId],
        });
      } else {
        acceptedFailureIds.push(fId);
      }
    }
  }

  for (const f of failures) {
    if (!planFailureIds.has(f.id)) {
      unaddressedFailureIds.push(f.id);
    }
  }

  // 3. Scope and authorization validation
  const authFiles =
    authorized.coderAuthorizedFiles && authorized.coderAuthorizedFiles.length > 0
      ? authorized.coderAuthorizedFiles
      : authorized.authorizedFiles || [];
  const authSet = new Set(authFiles.map((f) => f.toLowerCase()));

  if (!plan.affectedFiles || plan.affectedFiles.length === 0) {
    issues.push({
      code: 'NO_REPAIR_TARGETS',
      message: 'Repair plan specifies no affected files to repair.',
      relatedFailureIds: plan.failureIds || [],
    });
  } else {
    for (const rawPath of plan.affectedFiles) {
      const norm = normalizeProjectPath(rawPath);
      if (isControlPlaneArtifact(norm)) {
        rejectedTargets.push({ path: norm, reason: 'Target is a control-plane artifact.' });
        issues.push({
          code: 'CONTROL_PLANE_TARGET',
          message: `Repair target "${norm}" is a protected control-plane artifact.`,
          relatedFailureIds: plan.failureIds || [],
        });
      } else if (!authSet.has(norm.toLowerCase())) {
        rejectedTargets.push({ path: norm, reason: 'Target is not in authorized file set.' });
        issues.push({
          code: 'UNAUTHORIZED_TARGET',
          message: `Repair target "${norm}" is not in authorized blueprint file set.`,
          relatedFailureIds: plan.failureIds || [],
        });
      } else {
        authorizedTargets.push(norm);
      }
    }
  }

  const valid = issues.length === 0 && authorizedTargets.length > 0;

  return {
    valid,
    acceptedFailureIds,
    unaddressedFailureIds,
    authorizedTargets: valid ? authorizedTargets : [],
    rejectedTargets,
    issues,
  };
}

/**
 * Extracts a structured RepairPlan from Debugger Markdown report or structured response.
 */
export function extractRepairPlanFromDebuggerOutput(
  debuggerContent: string,
  baseWorkspaceVersion: string,
  normalizedFailures: NormalizedFailure[],
  authorized?: AuthorizedFileSet
): RepairPlan {
  const parsed = parseDebuggerOutput(debuggerContent);
  const failureIds = normalizedFailures.map((f) => f.id);
  const affectedFilesSet = new Set<string>();

  // Extract file paths prioritizing Patches Applied section (avoiding noise in diagnostic explanations)
  const patchTextToScan = `${parsed.output?.patchesApplied || ''}`;

  // Match "- File: <path>", "**File: <path>**", "1. **<path>**", "### File: <path>", "- Target: <path>", or "- Path: <path>"
  const explicitMatches = patchTextToScan.matchAll(
    /(?:(?:[-*#]+|\d+\.)\s*)?(?:\*\*)?(?:File|Target|Path)?\s*:?\s*(?:\*\*)?\s*[`'"]?([a-zA-Z0-9_\-\.\/]+\.(?:tsx|ts|jsx|json|js|html|css|prisma|sql|md)\b)[`'"]?\*?\*?/gi
  );
  for (const match of explicitMatches) {
    const raw = match[1].replace(/[*`'"]/g, '').trim();
    if (raw) {
      const norm = normalizeProjectPath(raw);
      if (!norm.includes('node_modules') && !norm.endsWith('.d.ts')) {
        affectedFilesSet.add(norm);
      }
    }
  }

  // Also match general project paths within patchesApplied if no explicit matches found
  if (affectedFilesSet.size === 0) {
    const pathTokens = patchTextToScan.match(
      /\b(?:(?:src|app|pages|server|components|lib|utils|public|config|styles)[\/\w\-\[\].]+\.(?:tsx|ts|jsx|json|js|html|css|prisma|sql|md)|(?:package\.json|tsconfig\.json|vite\.config\.ts|index\.html|README\.md))\b/gi
    ) || [];
    for (const token of pathTokens) {
      const norm = normalizeProjectPath(token);
      if (!norm.includes('node_modules') && !norm.endsWith('.d.ts')) {
        affectedFilesSet.add(norm);
      }
    }
  }

  // Fallback: if Patches Applied yielded no targets, scan Issues Addressed as last resort
  if (affectedFilesSet.size === 0 && parsed.output?.issuesAddressed) {
    const issueText = `${parsed.output.issuesAddressed}`;
    const issueMatches = issueText.matchAll(
      /(?:(?:[-*#]+|\d+\.)\s*)?(?:\*\*)?(?:File|Target|Path)?\s*:?\s*(?:\*\*)?\s*[`'"]?([a-zA-Z0-9_\-\.\/]+\.(?:tsx|ts|jsx|json|js|html|css|prisma|sql|md)\b)[`'"]?\*?\*?/gi
    );
    for (const match of issueMatches) {
      const raw = match[1].replace(/[*`'"]/g, '').trim();
      if (raw) {
        const norm = normalizeProjectPath(raw);
        if (!norm.includes('node_modules') && !norm.endsWith('.d.ts')) {
          affectedFilesSet.add(norm);
        }
      }
    }
    if (affectedFilesSet.size === 0) {
      const pathTokens = issueText.match(
        /\b(?:(?:src|app|pages|server|components|lib|utils|public|config|styles)[\/\w\-\[\].]+\.(?:tsx|ts|jsx|json|js|html|css|prisma|sql|md)|(?:package\.json|tsconfig\.json|vite\.config\.ts|index\.html|README\.md))\b/gi
      ) || [];
      for (const token of pathTokens) {
        const norm = normalizeProjectPath(token);
        if (!norm.includes('node_modules') && !norm.endsWith('.d.ts')) {
          affectedFilesSet.add(norm);
        }
      }
    }
  }

  // If authorized set is provided, filter affectedFiles to ensure only authorized files are targeted
  let affectedFiles = Array.from(affectedFilesSet);
  if (authorized) {
    const validAuth = new Set(
      (authorized.coderAuthorizedFiles && authorized.coderAuthorizedFiles.length > 0
        ? authorized.coderAuthorizedFiles
        : authorized.authorizedFiles || []
      ).map((f) => f.toLowerCase())
    );
    const filtered = affectedFiles.filter((f) => validAuth.has(f.toLowerCase()));
    if (filtered.length > 0) {
      affectedFiles = filtered;
    }
  }

  // Extract base workspace version if explicitly specified in Debugger report
  const versionMatch = debuggerContent.match(/(?:Base Workspace Version|Workspace Version|Workspace Hash)[:\s]+([a-f0-9]{32,64})/i);
  const planVersion = versionMatch ? versionMatch[1] : baseWorkspaceVersion;

  const instructions: string[] = [];
  if (parsed.output?.patchesApplied) {
    instructions.push(parsed.output.patchesApplied);
  }

  return {
    basedOnWorkspaceVersion: planVersion,
    failureIds,
    affectedFiles,
    instructions,
    verificationTargets: failureIds,
    status: 'repairable',
  };
}

export interface CoordinateRepairParams {
  conversationId: string;
  pipelineRunId: string;
  executeStageFn: (stageName: string, customInput?: string, targetFile?: string) => Promise<any>;
  emit: (evt: any) => void;
  maxCycles?: number;
  /**
   * Optional direct dependency injection of the authorized file set.
   * Preserves legitimate isolated-test behavior without database fixtures.
   */
  authorizedFileSet?: AuthorizedFileSet;
  /**
   * Optional custom loader for authorized file set.
   */
  loadAuthorizedFileSetFn?: (conversationId: string, pipelineRunId: string) => Promise<AuthorizedFileSet>;
  /**
   * Optional repair budget to enforce limits.
   */
  budget?: RepairBudget;
}

export interface RepairHistoryRecord {
  cycle: number;
  beforeVersion: string;
  targets: string[];
  strategySummary: string;
  failureCount: number;
}

export interface CanonicalRepairContext {
  targetFile: string;
  inflowFiles: Array<{ path: string; content: string; role: string }>;
  domContractSnippet?: string;
  priorRepairDiff?: string;
}

function extractLocalModuleSpecifiers(filePath: string, content: string): string[] {
  const specs: string[] = [];
  const scriptKind = filePath.endsWith('.tsx')
    ? ts.ScriptKind.TSX
    : filePath.endsWith('.jsx')
    ? ts.ScriptKind.JSX
    : filePath.endsWith('.ts')
    ? ts.ScriptKind.TS
    : ts.ScriptKind.JS;
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.ES2022, true, scriptKind);

  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      specs.push(node.moduleSpecifier.text);
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      specs.push(node.moduleSpecifier.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return specs;
}

/**
 * Produces a bounded line-level diff summary between two versions of a file across repair cycles.
 */
export function buildCompactLineDiff(
  filePath: string,
  beforeContent: string,
  afterContent: string,
  maxChars: number = 2500
): string {
  if (beforeContent === afterContent) {
    return `--- ${filePath}\n+++ ${filePath}\nNo text delta produced in prior cycle (file stayed identical).`;
  }
  const beforeLines = beforeContent.split('\n');
  const afterLines = afterContent.split('\n');
  const maxLines = Math.max(beforeLines.length, afterLines.length);
  const hunks: string[] = [`--- a/${filePath}`, `+++ b/${filePath}`];

  for (let i = 0; i < maxLines; i++) {
    const prev = beforeLines[i];
    const next = afterLines[i];
    if (prev !== next) {
      if (prev !== undefined) hunks.push(`- L${i + 1}: ${prev}`);
      if (next !== undefined) hunks.push(`+ L${i + 1}: ${next}`);
    }
  }

  const joined = hunks.join('\n');
  if (joined.length <= maxChars) return joined;
  return `${joined.slice(0, maxChars)}\n... [truncated ${joined.length - maxChars} chars]`;
}

/**
 * Resolves source dependencies strictly via canonical POSIX paths, AST imports, and verified template references.
 * Zero file-count heuristics or suffix-matching fallbacks.
 */
export async function resolveCanonicalRepairContext(
  conversationId: string,
  targetFile: string,
  priorDiff?: string
): Promise<CanonicalRepairContext> {
  const allVirtualFiles = await listVirtualFiles(conversationId);
  const fileContents = new Map<string, string>();

  for (const filePath of allVirtualFiles) {
    const content = await readVirtualFile(conversationId, filePath);
    if (typeof content === 'string') {
      const cleanPath = normalizeProjectPath(path.posix.normalize(filePath.replace(/\\/g, '/')));
      if (!isControlPlaneArtifact(cleanPath)) {
        fileContents.set(cleanPath, content);
      }
    }
  }

  const normalizedTarget = normalizeProjectPath(path.posix.normalize(targetFile.replace(/\\/g, '/')));
  const inflowFiles: Array<{ path: string; content: string; role: string }> = [];
  const seenPaths = new Set<string>();

  const addInflow = (p: string, content: string, role: string) => {
    const clean = normalizeProjectPath(path.posix.normalize(p.replace(/\\/g, '/')));
    if (seenPaths.has(clean)) return;
    seenPaths.add(clean);
    inflowFiles.push({ path: clean, content, role });
  };

  // Always include the target file's own current content so surgical repairs see exact current code/markup
  const targetCurrentContent = fileContents.get(normalizedTarget);
  if (targetCurrentContent !== undefined) {
    addInflow(
      normalizedTarget,
      targetCurrentContent,
      'TARGET_FILE: Current contents of the target file being repaired.'
    );
  }

  const isScript = /\.(js|jsx|ts|tsx|mjs|cjs)$/.test(normalizedTarget);
  const isHtml = normalizedTarget.endsWith('.html');
  const isCss = normalizedTarget.endsWith('.css');

  // Case 1: Target is a Script (e.g., shop/script.js or src/app/page.tsx)
  if (isScript) {
    for (const [filePath, content] of fileContents) {
      if (filePath.endsWith('.html')) {
        const doc = parseHtmlDocument(filePath, content);

        // Strict canonical path match: script must be in doc.linkedScripts
        if (doc.linkedScripts.includes(normalizedTarget)) {
          addInflow(
            filePath,
            content,
            'HOST_HTML_TEMPLATE: Defines the DOM elements, IDs, and classes queried by this script.'
          );

          // Inflow ONLY stylesheets explicitly linked by this specific host template
          for (const cssPath of doc.linkedStylesheets) {
            const cssContent = fileContents.get(cssPath);
            if (cssContent !== undefined) {
              addInflow(
                cssPath,
                cssContent,
                'LINKED_STYLESHEET: Declares style classes and visual animations for the host template.'
              );
            }
          }
        }
      }
    }

    // Resolve explicit local TS/JS module imports via canonical TS AST + ModuleResolver
    if (targetCurrentContent) {
      const workspaceFilePaths = Array.from(fileContents.keys());
      const tsConfigContent = fileContents.get('tsconfig.json') || fileContents.get('jsconfig.json') || '';
      const tsConfigOpts = tsConfigContent ? parseTsConfigOptions(tsConfigContent) : {};
      const specifiers = extractLocalModuleSpecifiers(normalizedTarget, targetCurrentContent);

      for (const spec of specifiers) {
        if (!spec.startsWith('.') && !spec.startsWith('@/') && !spec.startsWith('/')) continue;
        const resolved = resolveModule(normalizedTarget, spec, {
          files: workspaceFilePaths,
          ...tsConfigOpts,
        });
        if (resolved) {
          const cleanResolved = normalizeProjectPath(path.posix.normalize(resolved));
          const modContent = fileContents.get(cleanResolved);
          if (modContent !== undefined) {
            addInflow(
              cleanResolved,
              modContent,
              'IMPORTED_MODULE: Local module directly imported by the target script.'
            );
          }
        }
      }
    }
  }

  // Case 2: Target is an HTML Document (e.g., index.html)
  if (isHtml && targetCurrentContent !== undefined) {
    const doc = parseHtmlDocument(normalizedTarget, targetCurrentContent);

    for (const scriptPath of doc.linkedScripts) {
      const scriptContent = fileContents.get(scriptPath);
      if (scriptContent !== undefined) {
        addInflow(
          scriptPath,
          scriptContent,
          'LINKED_SCRIPT: Script logic executed by this HTML template.'
        );
      }
    }

    for (const cssPath of doc.linkedStylesheets) {
      const cssContent = fileContents.get(cssPath);
      if (cssContent !== undefined) {
        addInflow(
          cssPath,
          cssContent,
          'LINKED_STYLESHEET: Stylesheet applied to this HTML template.'
        );
      }
    }
  }

  // Case 3: Target is a Stylesheet (e.g., styles.css) -> include host HTML documents linking it
  if (isCss) {
    for (const [filePath, content] of fileContents) {
      if (filePath.endsWith('.html')) {
        const doc = parseHtmlDocument(filePath, content);
        if (doc.linkedStylesheets.includes(normalizedTarget)) {
          addInflow(
            filePath,
            content,
            'HOST_HTML_TEMPLATE: Defines the DOM elements styled by this stylesheet.'
          );
        }
      }
    }
  }

  // Extract compact authoritative DOM contract if one or more host HTML templates are in context
  const hostHtmlFiles = inflowFiles.filter((f) => f.path.endsWith('.html'));
  let domContractSnippet = '';
  if (hostHtmlFiles.length > 0) {
    domContractSnippet = hostHtmlFiles
      .map((hostHtml) => {
        const doc = parseHtmlDocument(hostHtml.path, hostHtml.content);
        return [
          `### AUTHORITATIVE DOM CONTRACT (${hostHtml.path})`,
          `- Declared Element IDs: ${[...doc.ids].join(', ') || 'none'}`,
          `- Declared CSS Classes: ${[...doc.classes].join(', ') || 'none'}`,
          `CRITICAL INSTRUCTION: Every getElementById() and querySelector() MUST strictly match the declared IDs/classes above. Never query unlisted identifiers.`,
        ].join('\n');
      })
      .join('\n\n');
  }

  return {
    targetFile: normalizedTarget,
    inflowFiles,
    domContractSnippet,
    priorRepairDiff: priorDiff || undefined,
  };
}

export interface DiagnosticFingerprint {
  cycle: number;
  uniqueFailureCount: number;
  signatureHash: string;
  signatures: Set<string>;
}

function createNormalizedFailureSignature(failure: VerificationFailure): string {
  const normMsg = failure.message.replace(/\s+/g, ' ').trim().slice(0, 200);
  return `${failure.file}:${failure.code || 'NO_CODE'}:${normMsg}`;
}

export function computeDiagnosticFingerprint(
  cycle: number,
  failures: VerificationFailure[]
): DiagnosticFingerprint {
  const signatures = new Set(failures.map(createNormalizedFailureSignature));
  const sorted = [...signatures].sort().join('|');
  const signatureHash = createHash('sha256').update(sorted).digest('hex').slice(0, 16);

  return {
    cycle,
    uniqueFailureCount: signatures.size,
    signatureHash,
    signatures,
  };
}

/**
 * Analyzes the repair trajectory with strict precedence:
 * 1. True Oscillation Check (exact signature recurrence after an intervening state: A -> B -> A)
 * 2. Diminishing Returns Check (failure count non-decreasing over 3 consecutive cycles)
 * 3. Budget Cap Check (cycle count threshold)
 */
export function analyzeRepairTrajectory(
  history: DiagnosticFingerprint[],
  current: DiagnosticFingerprint,
  maxAllowedCycles = 10
): { shouldHalt: boolean; reason?: 'OSCILLATION_DETECTED' | 'DIMINISHING_RETURNS' | 'BUDGET_EXCEEDED' } {
  // CHECK 1: True Oscillation Check (recurrence after visiting a different state: A -> B -> A)
  // Requires at least one intervening cycle with a DIFFERENT signatureHash (so A -> A -> A falls through to Diminishing Returns)
  for (let i = 0; i < history.length - 1; i++) {
    if (history[i].signatureHash === current.signatureHash) {
      const hasInterveningChange = history
        .slice(i + 1)
        .some((prev) => prev.signatureHash !== current.signatureHash);
      if (hasInterveningChange) {
        return { shouldHalt: true, reason: 'OSCILLATION_DETECTED' };
      }
    }
  }

  // CHECK 2: Diminishing returns (Unique failure count non-decreasing over 3 consecutive cycles)
  if (history.length >= 3) {
    const prev1 = history[history.length - 1];
    const prev2 = history[history.length - 2];
    const prev3 = history[history.length - 3];
    if (
      current.uniqueFailureCount >= prev1.uniqueFailureCount &&
      prev1.uniqueFailureCount >= prev2.uniqueFailureCount &&
      prev2.uniqueFailureCount >= prev3.uniqueFailureCount
    ) {
      return { shouldHalt: true, reason: 'DIMINISHING_RETURNS' };
    }
  }

  // CHECK 3: Budget cap threshold
  if (current.cycle >= maxAllowedCycles) {
    return { shouldHalt: true, reason: 'BUDGET_EXCEEDED' };
  }

  return { shouldHalt: false };
}

/**
 * The Canonical Repair Coordinator owning Tester -> Debugger -> Coder -> Tester lifecycle.
 */
export async function coordinateRepair(params: CoordinateRepairParams): Promise<void> {
  const { conversationId, pipelineRunId, executeStageFn, emit, maxCycles = 10 } = params;
  const repairHistory: RepairHistoryRecord[] = [];
  const diagnosticHistory: DiagnosticFingerprint[] = [];
  const priorDiffsByFile = new Map<string, string>();

  for (let cycle = 1; cycle <= maxCycles; cycle++) {
    // 1. Run Tester
    emit({
      type: 'AGENT_START',
      agent: 'Tester',
      message: `Running deterministic workspace verification cycle ${cycle}/${maxCycles}...`,
    });

    const testerResult = await executeStageFn('Tester');
    const testerAccepted =
      testerResult &&
      (testerResult.status === 'ACCEPTED' || testerResult.stageExecution?.state === 'ACCEPTED');

    if (!testerAccepted) {
      throw new Error(`Tester execution failed on cycle ${cycle}.`);
    }

    const isPass =
      /###\s*Result\s*\r?\n\s*PASS\b/i.test(testerResult.content || '') &&
      !/###\s*Result\s*\r?\n\s*FAIL\b/i.test(testerResult.content || '');

    if (isPass) {
      emit({
        type: 'AGENT_LOG',
        agent: 'Tester',
        message: `[REPAIR_VERIFIED] Workspace verification passed cleanly on cycle ${cycle}.`,
      });
      emit({
        type: 'AGENT_COMPLETE',
        agent: 'Tester',
        message: `Workspace verification passed cleanly on cycle ${cycle}.`,
      });
      return;
    }

    emit({
      type: 'AGENT_LOG',
      agent: 'Tester',
      message: `[REPAIR_RETRY] Workspace verification reported defects on cycle ${cycle}. Initiating surgical repair...`,
    });

    // 2. Normalize failures and capture active workspace revision
    const normalizedFailures = normalizeFailures(testerResult.content || '');
    const beforeVersion = await computeWorkspaceFingerprint(conversationId);

    // Evaluate trajectory (Oscillation -> Diminishing Returns -> Budget Cap)
    const currentFingerprint = computeDiagnosticFingerprint(
      cycle,
      normalizedFailures.map((f) => ({
        file: f.affectedFiles[0] || 'workspace',
        message: f.message,
        code: f.id,
      }))
    );
    const trajectory = analyzeRepairTrajectory(diagnosticHistory, currentFingerprint, maxCycles);
    if (trajectory.shouldHalt) {
      emit({
        type: 'AGENT_FAIL',
        agent: 'Debugger',
        message: `Repair loop halted: ${trajectory.reason}.`,
      });
      throw new Error(`Workspace verification failed after ${cycle} debug repair cycles (${trajectory.reason}).`);
    }
    diagnosticHistory.push(currentFingerprint);

    emit({
      type: 'AGENT_START',
      agent: 'Debugger',
      message: `Launching Debugger repair cycle ${cycle} (${normalizedFailures.length} failure(s) identified)...`,
    });

    // 3. Execute Debugger to diagnose and plan repairs
    const hasJsFailures = normalizedFailures.some((f) =>
      f.affectedFiles.some((file) => file.endsWith('.js') || file.endsWith('.jsx'))
    );
    const jsGuidance = hasJsFailures
      ? [
          `### Language-Specific Rules for JavaScript`,
          `Target files include JavaScript (.js/.jsx). TypeScript checkJs is active. Do NOT prescribe TypeScript type syntax ('as Type' or ': Type') as that causes TS8010 syntax error. Use runtime instanceof guards (e.g. 'if (form instanceof HTMLFormElement)'), document.querySelector('form'), or JSDoc type annotations.`,
        ].join('\n')
      : '';

    const historyBlock = repairHistory.length > 0
      ? [
          `### Previous Repair Attempts (Most Recent First)`,
          ...repairHistory.slice(-5).reverse().map((h) =>
            `- Cycle ${h.cycle} (Version ${h.beforeVersion.slice(0, 8)}...): Targets=[${h.targets.join(', ')}]. Strategy: "${h.strategySummary}". Failures: ${h.failureCount}.`
          ),
          `Notice: If a previous strategy introduced syntax errors (such as TS8010/TS8011 in .js), do NOT prescribe it again. Use runtime instanceof guards or JSDoc.`,
        ].join('\n')
      : '';

    const preCycleContents = new Map<string, string>();
    let canonicalDebugSourcesBlock = '';
    try {
      const workspaceFileNames = await listVirtualFiles(conversationId);
      const workspaceSet = new Set(
        workspaceFileNames
          .map((p) => normalizeProjectPath(path.posix.normalize(p.replace(/\\/g, '/'))))
          .filter((p) => !isControlPlaneArtifact(p))
      );

      for (const wf of workspaceSet) {
        const content = await readVirtualFile(conversationId, wf);
        if (typeof content === 'string') {
          preCycleContents.set(wf, content);
        }
      }

      const candidateTargets = new Set<string>();
      for (const f of normalizedFailures) {
        for (const af of f.affectedFiles) {
          const clean = normalizeProjectPath(path.posix.normalize(af.replace(/\\/g, '/')));
          if (workspaceSet.has(clean)) {
            candidateTargets.add(clean);
          }
        }
        // Extract exact workspace file paths mentioned in runtime/import failure details
        for (const wf of workspaceSet) {
          if (wf && f.message.includes(wf)) {
            candidateTargets.add(wf);
          }
        }
      }

      // If runtime failure has no file token matched yet and canonical index.html exists in VFS, resolve from index.html
      if (candidateTargets.size === 0 && normalizedFailures.some((f) => f.affectedFiles.includes('runtime')) && workspaceSet.has('index.html')) {
        candidateTargets.add('index.html');
      }

      const seenDebugFiles = new Set<string>();
      const sourceSections: string[] = [];
      const domSnippets: string[] = [];
      const diffSections: string[] = [];

      for (const ct of candidateTargets) {
        const ctx = await resolveCanonicalRepairContext(conversationId, ct, priorDiffsByFile.get(ct));
        if (ctx.domContractSnippet && !domSnippets.includes(ctx.domContractSnippet)) {
          domSnippets.push(ctx.domContractSnippet);
        }
        if (ctx.priorRepairDiff) {
          diffSections.push(ctx.priorRepairDiff);
        }
        for (const inf of ctx.inflowFiles) {
          if (seenDebugFiles.has(inf.path)) continue;
          seenDebugFiles.add(inf.path);
          sourceSections.push(`#### ${inf.path} (${inf.role})\n\`\`\`\n${inf.content}\n\`\`\``);
        }
      }

      canonicalDebugSourcesBlock = [
        domSnippets.length > 0 ? domSnippets.join('\n\n') : '',
        diffSections.length > 0 ? `### Prior Cycle Repair Diffs\n\`\`\`diff\n${diffSections.join('\n\n')}\n\`\`\`` : '',
        sourceSections.length > 0 ? `### Canonical Repair Source Context\n${sourceSections.join('\n\n')}` : '',
      ].filter(Boolean).join('\n\n');
    } catch {}

    const debugContext = [
      `### Active Base Workspace Version`,
      beforeVersion,
      `### Normalized Failures`,
      ...normalizedFailures.map((f) => `- [${f.id}] (${f.affectedFiles.join(', ') || 'workspace'}): ${f.message}`),
      jsGuidance,
      historyBlock,
      canonicalDebugSourcesBlock,
      `### Original Tester Output`,
      testerResult.content || '',
    ].filter(Boolean).join('\n\n');

    const debugResult = await executeStageFn('Debugger', debugContext);
    const debugAccepted =
      debugResult &&
      (debugResult.status === 'ACCEPTED' || debugResult.stageExecution?.state === 'ACCEPTED');

    if (!debugAccepted) {
      throw new Error(`Debugger repair planning failed on cycle ${cycle}.`);
    }

    // 4. Load authorized file set (fail closed on loader failure)
    let authorized: AuthorizedFileSet;
    try {
      if (params.authorizedFileSet) {
        authorized = params.authorizedFileSet;
      } else if (params.loadAuthorizedFileSetFn) {
        authorized = await params.loadAuthorizedFileSetFn(conversationId, pipelineRunId);
      } else {
        authorized = await loadAuthorizedFileSet(conversationId, pipelineRunId);
      }
    } catch (authErr: any) {
      emit({
        type: 'AGENT_FAIL',
        agent: 'Debugger',
        message: `Failed to load authorized file set: ${authErr?.message || authErr}`,
      });
      throw new Error(
        `Repair coordinator authorization loader failed on cycle ${cycle}: ${authErr?.message || authErr}`
      );
    }

    // 5. Extract canonical repair plan from Debugger output and validate against active revision & authorized files
    const plan = extractRepairPlanFromDebuggerOutput(
      debugResult.content || '',
      beforeVersion,
      normalizedFailures,
      authorized
    );

    const planValidation = validateRepairPlan({
      plan,
      failures: normalizedFailures,
      baseWorkspaceVersion: beforeVersion,
      authorized,
    });

    if (!planValidation.valid) {
      const issueSummary = planValidation.issues.map((i) => `[${i.code}] ${i.message}`).join('; ');
      emit({
        type: 'AGENT_FAIL',
        agent: 'Debugger',
        message: `Canonical repair plan failed validation: ${issueSummary || 'Invalid repair plan'}`,
      });
      throw new Error(
        `Repair plan validation failed on cycle ${cycle}: ${issueSummary || 'Plan did not meet validation criteria'}`
      );
    }

    const authorizedTargets = planValidation.authorizedTargets;
    if (!authorizedTargets || authorizedTargets.length === 0) {
      emit({
        type: 'AGENT_FAIL',
        agent: 'Debugger',
        message: 'Canonical repair plan validated but resolved 0 authorized repair targets.',
      });
      throw new Error(
        `Repair plan validation failed on cycle ${cycle}: Resolved 0 authorized repair targets.`
      );
    }

    emit({
      type: 'AGENT_LOG',
      agent: 'Debugger',
      message: `[REPAIR_PLAN_VALIDATED] Repair plan validated for ${authorizedTargets.length} file(s) on revision ${beforeVersion.slice(0, 8)}.`,
    });

    const strategySummary = (plan.instructions || [])
      .map((l: string) => l.trim().replace(/^[-*#\d.]+\s*/, ''))
      .filter((l: string) => l.length > 0)
      .slice(0, 2)
      .join('; ')
      .slice(0, 150) || 'Targeted surgical repair';

    repairHistory.push({
      cycle,
      beforeVersion,
      targets: authorizedTargets,
      strategySummary,
      failureCount: normalizedFailures.length,
    });

    // 6. Check whether Debugger already applied direct surgical patches via tools, and invoke Coder only for remaining unpatched targets
    const targetsNeedingCoder: string[] = [];
    for (const targetFile of authorizedTargets) {
      const normTarget = normalizeProjectPath(path.posix.normalize(targetFile.replace(/\\/g, '/')));
      const preContent = preCycleContents.get(normTarget);
      let patchedByDebugger = false;
      if (typeof preContent === 'string') {
        try {
          const postDebugContent = await readVirtualFile(conversationId, normTarget);
          if (typeof postDebugContent === 'string' && postDebugContent !== preContent && postDebugContent.trim().length > 0) {
            patchedByDebugger = true;
            priorDiffsByFile.set(
              normTarget,
              buildCompactLineDiff(normTarget, preContent, postDebugContent)
            );
            emit({
              type: 'AGENT_LOG',
              agent: 'Debugger',
              message: `[REPAIR_DIRECT_APPLIED] Debugger patched "${normTarget}" directly via tools; skipping redundant Coder rewrite.`,
            });
          }
        } catch {}
      }
      if (!patchedByDebugger) {
        targetsNeedingCoder.push(targetFile);
      }
    }

    if (targetsNeedingCoder.length > 0) {
      emit({
        type: 'AGENT_START',
        agent: 'Coder',
        message: `Invoking Coder to implement targeted repairs across ${targetsNeedingCoder.length} authorized file(s)...`,
      });

      const coderRepairInstructions = [
        `### Targeted Repair Plan`,
        `Base Workspace Version: ${beforeVersion}`,
        plan.instructions.length ? `Patches & Fix Instructions from Debugger:\n${plan.instructions.join('\n')}` : '',
        `Issues To Resolve:`,
        ...normalizedFailures.map((f) => `- ${f.id}: ${f.message}`),
      ].filter(Boolean).join('\n\n');

      for (const targetFile of targetsNeedingCoder) {
        try {
          const normTarget = normalizeProjectPath(path.posix.normalize(targetFile.replace(/\\/g, '/')));
          let fileRepairInstructions = coderRepairInstructions;
          let preRepairContent = preCycleContents.get(normTarget);
          try {
            if (preRepairContent === undefined) {
              preRepairContent = (await readVirtualFile(conversationId, normTarget)) ?? undefined;
            }
            const priorDiff = priorDiffsByFile.get(normTarget);
            const repairContext = await resolveCanonicalRepairContext(conversationId, normTarget, priorDiff);
            if (repairContext.domContractSnippet) {
              fileRepairInstructions += `\n\n${repairContext.domContractSnippet}`;
            }
            if (repairContext.priorRepairDiff) {
              fileRepairInstructions += `\n\n### Prior Repair Diff (Previous Cycle Attempt on ${normTarget}):\n\`\`\`diff\n${repairContext.priorRepairDiff}\n\`\`\`\nAvoid repeating an ineffective edit; fix the underlying root cause cleanly.`;
            }
            if (repairContext.inflowFiles.length > 0) {
              fileRepairInstructions +=
                `\n\n### Linked Context Files:\n` +
                repairContext.inflowFiles
                  .map((f) => `#### ${f.path} (${f.role})\n\`\`\`\n${f.content}\n\`\`\``)
                  .join('\n\n');
            }
          } catch {}

          if (targetFile.endsWith('.js') || targetFile.endsWith('.jsx')) {
            fileRepairInstructions += `\n\nIMPORTANT LANGUAGE RULE FOR JAVASCRIPT (.js):\nOutput pure standard ECMAScript only. DO NOT use TypeScript 'as Type' type assertions or ': Type' annotations (they trigger TS8010 syntax error). For DOM properties (.value, .reset, .dataset), use runtime guards (e.g., if (el instanceof HTMLInputElement)), querySelector, or JSDoc.`;
          }
          await executeStageFn('Coder', fileRepairInstructions, targetFile);

          try {
            const afterRepairContent = await readVirtualFile(conversationId, normTarget);
            if (preRepairContent !== undefined && typeof afterRepairContent === 'string') {
              priorDiffsByFile.set(
                normTarget,
                buildCompactLineDiff(normTarget, preRepairContent, afterRepairContent)
              );
            }
          } catch {}
        } catch (err: any) {
          if (err?.message?.includes('Unexpected stage Coder')) {
            break;
          }
          throw err;
        }
      }
    }

    emit({
      type: 'AGENT_LOG',
      agent: targetsNeedingCoder.length > 0 ? 'Coder' : 'Debugger',
      message: `[REPAIR_COMMITTED] Applied and committed targeted repairs across ${authorizedTargets.join(', ')}.`,
    });

    emit({
      type: 'AGENT_COMPLETE',
      agent: 'Debugger',
      message: `Debugger repair cycle ${cycle} completed. Re-running Tester verification...`,
    });
  }
}
