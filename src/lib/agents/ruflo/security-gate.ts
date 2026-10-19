import crypto from 'node:crypto';

export interface SecurityFinding {
  file: string;
  line: number;
  severity: 'BLOCKING' | 'WARNING';
  ruleId: string;
  message: string;
}

export interface SecurityGateResult {
  passed: boolean;
  blocking: SecurityFinding[];
  warnings: SecurityFinding[];
  scannedFiles: string[];
  skippedFiles: string[];
  failedFiles: string[];
}

export type CheckStatus =
  | 'passed'
  | 'failed'
  | 'inconclusive'
  | 'unavailable'
  | 'timed_out'
  | 'skipped';

export type CheckCriticality = 'blocking' | 'advisory';

export interface GateDecisionResult {
  decision: 'allow' | 'block';
  reasons: string[];
}

export interface TrustedGateException {
  checkName: string;
  workspaceVersion: string;
  pipelineRunId: string;
  approver: string;
  signature: string;
  expiresAt: number;
  rationale: string;
}

export interface CanonicalExceptionPayload {
  checkName: string;
  workspaceVersion: string;
  pipelineRunId: string;
  approver: string;
  expiresAt: number;
  rationale: string;
}

export interface TrustedApprover {
  id: string;
  name: string;
  role: string;
  publicKey: string | crypto.KeyObject;
  algorithm?: string; // defaults to 'ed25519'
  status: 'ACTIVE' | 'REVOKED' | 'SUSPENDED';
  allowedChecks?: string[]; // e.g. ['*'] or ['UNSAFE_EVAL', 'HARDCODED_SECRET']
  expiresAt?: number;
}

export interface TrustedExceptionAuthorizationService {
  getApprover(approverId: string): Promise<TrustedApprover | null> | TrustedApprover | null;
  isApproverAuthorized?(approverId: string, checkName: string): Promise<boolean> | boolean;
}

const FORBIDDEN_AGENT_APPROVERS = new Set([
  'coder',
  'debugger',
  'queen',
  'planner',
  'architect',
  'system',
  'designer',
  'blueprinter',
  'tester',
  'security',
  'reviewer',
  'agent',
  'llm',
  'autocoder',
  'autogod',
  'assistant',
]);

/**
 * In-memory authority registry implementing TrustedExceptionAuthorizationService.
 * External IAM/PKI/KMS systems can plug in by implementing the interface.
 */
export class TrustedAuthorityRegistry implements TrustedExceptionAuthorizationService {
  private approvers = new Map<string, TrustedApprover>();

  register(approver: TrustedApprover): void {
    if (!approver || !approver.id) {
      throw new Error('Approver must have a valid id.');
    }
    const cleanId = approver.id.trim();
    if (FORBIDDEN_AGENT_APPROVERS.has(cleanId.toLowerCase())) {
      throw new Error(`Cannot register agent "${cleanId}" as a trusted release exception approver.`);
    }
    if (!approver.publicKey) {
      throw new Error(`Approver "${cleanId}" must provide a valid public key.`);
    }
    this.approvers.set(cleanId, {
      ...approver,
      id: cleanId,
      status: approver.status || 'ACTIVE',
      algorithm: approver.algorithm || 'ed25519',
    });
  }

  unregister(approverId: string): boolean {
    return this.approvers.delete(approverId.trim());
  }

  clear(): void {
    this.approvers.clear();
  }

  getApprover(approverId: string): TrustedApprover | null {
    if (!approverId) return null;
    return this.approvers.get(approverId.trim()) || null;
  }

  isApproverAuthorized(approverId: string, checkName: string): boolean {
    const approver = this.getApprover(approverId);
    if (!approver) return false;
    if (approver.status !== 'ACTIVE') return false;
    if (approver.expiresAt && Date.now() > approver.expiresAt) return false;
    if (FORBIDDEN_AGENT_APPROVERS.has(approver.id.toLowerCase())) return false;
    if (!approver.allowedChecks || approver.allowedChecks.includes('*')) return true;
    return approver.allowedChecks.includes(checkName);
  }
}

export const defaultTrustedApproverRegistry = new TrustedAuthorityRegistry();

export function registerTrustedApprover(approver: TrustedApprover): void {
  defaultTrustedApproverRegistry.register(approver);
}

export function unregisterTrustedApprover(approverId: string): boolean {
  return defaultTrustedApproverRegistry.unregister(approverId);
}

export function clearTrustedApprovers(): void {
  defaultTrustedApproverRegistry.clear();
}

/**
 * Produces a deterministic canonical string binding all 6 required fields of the exception.
 */
export function createCanonicalExceptionPayload(params: CanonicalExceptionPayload): string {
  return [
    'RELEASE_GATE_EXCEPTION_V1',
    `checkName:${params.checkName}`,
    `workspaceVersion:${params.workspaceVersion}`,
    `pipelineRunId:${params.pipelineRunId}`,
    `approver:${params.approver}`,
    `expiresAt:${params.expiresAt}`,
    `rationale:${params.rationale}`,
  ].join('\n');
}

/**
 * Signs a canonical exception payload using an asymmetric private key (Ed25519 or RSA/ECDSA).
 */
export function signGateException(
  payload: CanonicalExceptionPayload,
  privateKey: crypto.KeyLike | string,
  algorithm?: string
): string {
  const canonical = createCanonicalExceptionPayload(payload);
  const data = Buffer.from(canonical, 'utf8');
  const algo = algorithm && algorithm.toLowerCase() !== 'ed25519' ? algorithm : null;
  const signature = crypto.sign(algo, data, privateKey);
  return signature.toString('base64');
}

/**
 * Cryptographically verifies an exception signature against the registered public key.
 */
export function verifyExceptionSignature(
  canonicalPayload: string,
  signatureBase64: string,
  publicKey: crypto.KeyLike | string,
  algorithm?: string
): boolean {
  try {
    if (!signatureBase64 || typeof signatureBase64 !== 'string') return false;
    const data = Buffer.from(canonicalPayload, 'utf8');
    const signature = Buffer.from(signatureBase64, 'base64');
    if (signature.length === 0) return false;

    const algo = algorithm && algorithm.toLowerCase() !== 'ed25519' ? algorithm : null;
    return crypto.verify(algo, data, publicKey, signature);
  } catch {
    return false;
  }
}

/**
 * Helper to construct a fully bound, cryptographically signed gate exception record.
 */
export function createSignedGateException(
  params: CanonicalExceptionPayload,
  privateKey: crypto.KeyLike | string,
  algorithm?: string
): TrustedGateException {
  const signature = signGateException(params, privateKey, algorithm);
  return {
    ...params,
    signature,
  };
}

/**
 * Validates that an exception was issued by a trusted identity enrolled in the authorization directory,
 * is cryptographically signed against the approver's registered public key, is bound to the exact
 * workspace revision, pipeline run ID, and check name, is unexpired, and includes a valid rationale (Section 22.3).
 *
 * Fails closed if the identity is unknown, revoked, suspended, unpermitted, or if signature verification fails.
 */
export function validateGateException(
  exception: TrustedGateException | undefined,
  expected: {
    checkName: string;
    workspaceVersion?: string;
    pipelineRunId?: string;
    authorityService?: TrustedExceptionAuthorizationService;
    currentTime?: number;
  }
): { valid: boolean; reason?: string } {
  if (!exception) {
    return { valid: false, reason: 'Missing exception authorization record.' };
  }

  // Fail closed if expected release context is missing
  if (!expected.checkName || typeof expected.checkName !== 'string' || !expected.checkName.trim()) {
    return { valid: false, reason: 'Validation context is missing required checkName.' };
  }
  if (!expected.workspaceVersion || typeof expected.workspaceVersion !== 'string' || !expected.workspaceVersion.trim()) {
    return { valid: false, reason: 'Validation context is missing required workspaceVersion.' };
  }
  if (!expected.pipelineRunId || typeof expected.pipelineRunId !== 'string' || !expected.pipelineRunId.trim()) {
    return { valid: false, reason: 'Validation context is missing required pipelineRunId.' };
  }

  // Reject malformed exception structure
  if (typeof exception !== 'object') {
    return { valid: false, reason: 'Malformed exception: payload must be an object.' };
  }
  if (typeof exception.checkName !== 'string' || !exception.checkName.trim()) {
    return { valid: false, reason: 'Malformed exception: checkName is missing or invalid.' };
  }
  if (typeof exception.workspaceVersion !== 'string' || !exception.workspaceVersion.trim()) {
    return { valid: false, reason: 'Malformed exception: workspaceVersion is missing or invalid.' };
  }
  if (typeof exception.pipelineRunId !== 'string' || !exception.pipelineRunId.trim()) {
    return { valid: false, reason: 'Malformed exception: pipelineRunId is missing or invalid.' };
  }
  if (typeof exception.approver !== 'string' || !exception.approver.trim()) {
    return { valid: false, reason: 'Malformed exception: approver is missing or invalid.' };
  }
  if (typeof exception.rationale !== 'string' || !exception.rationale.trim()) {
    return { valid: false, reason: 'Malformed exception: rationale is missing or empty.' };
  }
  if (typeof exception.expiresAt !== 'number' || !Number.isFinite(exception.expiresAt) || exception.expiresAt <= 0) {
    return { valid: false, reason: 'Malformed exception: expiresAt is missing or invalid timestamp.' };
  }
  if (typeof exception.signature !== 'string' || !exception.signature.trim()) {
    return { valid: false, reason: 'Malformed exception: signature is missing or empty.' };
  }

  // Exact context bindings
  if (exception.checkName !== expected.checkName) {
    return { valid: false, reason: `Exception is for "${exception.checkName}", not "${expected.checkName}".` };
  }
  if (exception.workspaceVersion !== expected.workspaceVersion) {
    return { valid: false, reason: 'Exception workspace version does not match active revision.' };
  }
  if (exception.pipelineRunId !== expected.pipelineRunId) {
    return { valid: false, reason: 'Exception pipelineRunId does not match active run.' };
  }

  // Check agent blacklist
  const approverId = exception.approver.trim();
  if (FORBIDDEN_AGENT_APPROVERS.has(approverId.toLowerCase())) {
    return { valid: false, reason: `Unauthorized self-approval: approver "${exception.approver}" is an agent.` };
  }

  // Check expiration
  const now = expected.currentTime ?? Date.now();
  if (now > exception.expiresAt) {
    return { valid: false, reason: 'Exception has expired.' };
  }

  // Check authority service (fail closed if authority or approver not registered)
  const authorityService = expected.authorityService ?? defaultTrustedApproverRegistry;
  let approverRecord: TrustedApprover | null = null;
  try {
    const res = authorityService.getApprover(approverId);
    if (res && typeof (res as Promise<any>).then === 'function') {
      return {
        valid: false,
        reason: 'Async authorization service cannot be evaluated synchronously. Provide synchronous authority registry.',
      };
    }
    approverRecord = res as TrustedApprover | null;
  } catch (err: any) {
    return {
      valid: false,
      reason: `Authorization service lookup error for "${approverId}": ${err?.message || 'unknown error'}`,
    };
  }

  if (!approverRecord) {
    return {
      valid: false,
      reason: `Unauthorized approver: approver "${approverId}" is not enrolled in the trusted authority directory (fail-closed: identity/key missing).`,
    };
  }

  if (approverRecord.status !== 'ACTIVE') {
    return {
      valid: false,
      reason: `Unauthorized approver: authority record for "${approverId}" has status "${approverRecord.status}".`,
    };
  }

  if (approverRecord.expiresAt && now > approverRecord.expiresAt) {
    return {
      valid: false,
      reason: `Unauthorized approver: authority certificate for "${approverId}" has expired.`,
    };
  }

  if (
    approverRecord.allowedChecks &&
    !approverRecord.allowedChecks.includes('*') &&
    !approverRecord.allowedChecks.includes(expected.checkName)
  ) {
    return {
      valid: false,
      reason: `Unauthorized approver: "${approverId}" is not authorized to grant exceptions for check "${expected.checkName}".`,
    };
  }

  if (!approverRecord.publicKey) {
    return {
      valid: false,
      reason: `Unauthorized approver: missing public key in authority record for "${approverId}".`,
    };
  }

  // Cryptographic signature verification against approver's registered public key
  const canonicalPayload = createCanonicalExceptionPayload({
    checkName: exception.checkName,
    workspaceVersion: exception.workspaceVersion,
    pipelineRunId: exception.pipelineRunId,
    approver: exception.approver,
    expiresAt: exception.expiresAt,
    rationale: exception.rationale,
  });

  const isSigValid = verifyExceptionSignature(
    canonicalPayload,
    exception.signature,
    approverRecord.publicKey,
    approverRecord.algorithm
  );

  if (!isSigValid) {
    return {
      valid: false,
      reason: 'Cryptographic signature verification failed: signature is forged, corrupt, or does not match canonical payload.',
    };
  }

  return { valid: true };
}

/**
 * Evaluates pipeline release readiness based on check criticality and status (Section 20.5 & 22.3).
 *
 * Mandatory Release Boundary Enforcement:
 * - Advisory checks do not block release.
 * - Passed checks do not block release.
 * - Blocking non-passed checks fail closed unless covered by an authenticated, cryptographically
 *   verified TrustedGateException bound to the exact check, active workspaceVersion, and pipelineRunId.
 * - Legacy `approvedException: true` bypass is strictly removed from production release decisions.
 */
export function decideRelease(
  checks: Array<{
    name: string;
    status: CheckStatus;
    criticality: CheckCriticality;
    approvedException?: boolean;
    trustedException?: TrustedGateException;
  }>,
  context?: {
    workspaceVersion?: string;
    pipelineRunId?: string;
    authorityService?: TrustedExceptionAuthorizationService;
    currentTime?: number;
    enforceTrustedExceptionsOnly?: boolean;
  }
): GateDecisionResult {
  const blockers = checks.filter((check) => {
    if (check.criticality === 'advisory') return false;
    if (check.status === 'passed') return false;

    // Legacy approvedException: true is completely ignored.
    // Blocking check MUST have a valid, cryptographically verified trustedException.
    if (!check.trustedException) {
      return true;
    }

    if (!context?.workspaceVersion || !context?.pipelineRunId) {
      // Cannot validate exception without active release context -> fail closed
      return true;
    }

    const val = validateGateException(check.trustedException, {
      checkName: check.name,
      workspaceVersion: context.workspaceVersion,
      pipelineRunId: context.pipelineRunId,
      authorityService: context.authorityService,
      currentTime: context.currentTime,
    });

    if (val.valid) {
      return false; // Valid trusted exception waives this check
    }

    return true; // Invalid / untrusted / forged / expired exception -> block!
  });

  return blockers.length === 0
    ? { decision: 'allow', reasons: [] }
    : {
        decision: 'block',
        reasons: blockers.map((check) => `${check.name}: ${check.status}`),
      };
}

/**
 * Security Rule Specification Metadata (Section 18.5)
 */
export const SECURITY_RULES_METADATA = {
  HARDCODED_SECRET: {
    threat: 'Exposure of production API credentials, cloud tokens, and secret keys in workspace source code.',
    scope: 'All workspace text files including config, JSON, env, and source code.',
    detectionMethod: 'Stateless prefix-anchored regex matching known credential patterns.',
    positiveExamples: ['const k = "sk-proj-1234567890abcdef1234567890abcdef";', 'OPENAI_API_KEY=sk-ant-api03-...'],
    negativeExamples: ['const k = process.env.OPENAI_API_KEY;', 'const k = "dummy-placeholder";'],
    limitations: 'Dynamic key derivation or obfuscated secrets cannot be detected via prefix matching alone.',
    severity: 'BLOCKING',
    failureSemantics: 'Fails closed if target file is unreadable.',
  },
  CLIENT_SECRET_LEAK: {
    threat: 'Server-side secrets accessed inside Next.js Client Components bundle leaked to browser.',
    scope: 'JavaScript/TypeScript files marked with "use client".',
    detectionMethod: 'Lexical analysis detecting process.env reference to server-only secret variable names.',
    positiveExamples: ["'use client';\nconst k = process.env.STRIPE_SECRET_KEY;"],
    negativeExamples: ["'use client';\nconst k = process.env.NEXT_PUBLIC_STRIPE_KEY;"],
    limitations: 'Server environment variables accessed via dynamic indexing (process.env[name]) are not tracked.',
    severity: 'BLOCKING',
    failureSemantics: 'Fails closed if client component cannot be parsed.',
  },
  UNSAFE_EVAL: {
    threat: 'Arbitrary code execution via dynamic eval() or new Function() constructors.',
    scope: 'JavaScript/TypeScript code files.',
    detectionMethod: 'Lexical scan stripping comments and string literals, matching executable eval() and new Function().',
    positiveExamples: ['eval(userInput);', 'const fn = new Function("a", userInput);'],
    negativeExamples: ['// eval(userInput) is forbidden', '/* new Function() is unsafe */', 'console.log("eval(x)");'],
    limitations: 'Indirect eval via window["ev"+"al"] is out of scope for lexical scanning.',
    severity: 'BLOCKING',
    failureSemantics: 'Fails closed if file is unreadable.',
  },
  SQL_INJECTION_RISK: {
    threat: 'SQL query construction through raw string concatenation rather than parameterized queries.',
    scope: 'JavaScript/TypeScript files.',
    detectionMethod: 'Lexical scan identifying SQL statements combined with + concatenation outside comments.',
    positiveExamples: ['const q = "SELECT * FROM users WHERE id = " + id;'],
    negativeExamples: ['// SELECT * FROM users + id', 'prisma.user.findUnique({ where: { id } });', 'db.query("SELECT * FROM users WHERE id = $1", [id]);'],
    limitations: 'Complex multi-variable templating or ORM raw queries with safe formatting are advisory.',
    severity: 'WARNING',
    failureSemantics: 'Emits warning if query concatenation is suspected.',
  },
} as const;

const SCANNABLE_FILE_REGEX = /\.(?:js|jsx|ts|tsx|mjs|cjs|json|html|yml|yaml|prisma|sql|sh|py|rb|go|rs|toml|ini|conf)$/i;
const ENV_FILE_REGEX = /(?:^|\/)\.env(?:\.[a-zA-Z0-9._-]+)?$/i;

/**
 * Strips comments from a single line of JS/TS code while tracking multiline block comment state.
 */
export function stripCommentsFromLine(
  line: string,
  state: { inBlockComment: boolean }
): string {
  let result = '';
  let i = 0;

  while (i < line.length) {
    if (state.inBlockComment) {
      const endCommentIdx = line.indexOf('*/', i);
      if (endCommentIdx === -1) {
        return result;
      }
      i = endCommentIdx + 2;
      state.inBlockComment = false;
      continue;
    }

    if (line[i] === '/' && line[i + 1] === '/') {
      return result;
    }

    if (line[i] === '/' && line[i + 1] === '*') {
      state.inBlockComment = true;
      i += 2;
      continue;
    }

    result += line[i];
    i++;
  }

  return result;
}

/**
 * Strips string literal contents from executable code, leaving empty quotes,
 * so string constants like "eval(x)" are not flagged as executable code.
 */
export function stripStringsFromCode(code: string): string {
  return code
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/`(?:[^`\\]|\\.)*`/g, '``');
}

/**
 * Deterministic security verification gate checking for hardcoded secrets, SQL injection, unsafe eval, and client secret leaks.
 * Uses stateless (non-global) regexes and lexical comment/string filtering.
 */
export function validateSecurityGate(
  vfsFiles: Record<string, string>,
  requiredFiles?: string[]
): SecurityGateResult {
  const blocking: SecurityFinding[] = [];
  const warnings: SecurityFinding[] = [];
  const scannedFiles: string[] = [];
  const skippedFiles: string[] = [];
  const failedFiles: string[] = [];

  // Stateless regexes (NO /g flag)
  const HARDCODED_SECRET_PATTERNS = [
    { pattern: /sk-[A-Za-z0-9]{32,}/, name: 'OpenAI Secret Key' },
    { pattern: /sk_live_[A-Za-z0-9]{24,}/, name: 'Stripe Live Secret Key' },
    { pattern: /sk_test_[A-Za-z0-9]{24,}/, name: 'Stripe Test Secret Key' },
    { pattern: /ghp_[A-Za-z0-9]{36}/, name: 'GitHub Personal Access Token' },
    { pattern: /AKIA[0-9A-Z]{16}/, name: 'AWS Access Key ID' },
    { pattern: /sk-ant-[A-Za-z0-9_-]{32,}/, name: 'Anthropic API Key' },
  ];

  const SERVER_ENV_SECRETS = [
    'STRIPE_SECRET_KEY',
    'DATABASE_URL',
    'JWT_SECRET',
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'AWS_SECRET_ACCESS_KEY',
  ];

  const normalizedMap = new Map<string, string>();
  for (const [rawName, content] of Object.entries(vfsFiles || {})) {
    const cleanPath = rawName.replace(/\\/g, '/').replace(/^\.\//, '');
    normalizedMap.set(cleanPath, content);
  }

  // Fail closed if required workspace files are missing or unreadable
  if (requiredFiles && requiredFiles.length > 0) {
    for (const reqFile of requiredFiles) {
      const cleanReq = reqFile.replace(/\\/g, '/').replace(/^\.\//, '');
      if (!normalizedMap.has(cleanReq)) {
        failedFiles.push(cleanReq);
        blocking.push({
          file: cleanReq,
          line: 1,
          severity: 'BLOCKING',
          ruleId: 'MISSING_REQUIRED_WORKSPACE_FILE',
          message: `Security Hard Block: Required workspace file "${cleanReq}" is missing from the security scan input.`,
        });
      }
    }
  }

  for (const [cleanPath, content] of normalizedMap.entries()) {
    const isScannable =
      SCANNABLE_FILE_REGEX.test(cleanPath) ||
      ENV_FILE_REGEX.test(cleanPath) ||
      cleanPath.toLowerCase() === 'dockerfile';

    if (!isScannable) {
      skippedFiles.push(cleanPath);
      continue;
    }

    if (typeof content !== 'string') {
      failedFiles.push(cleanPath);
      blocking.push({
        file: cleanPath,
        line: 1,
        severity: 'BLOCKING',
        ruleId: 'UNREADABLE_WORKSPACE_FILE',
        message: `Security Hard Block: Workspace file "${cleanPath}" could not be read as text during security scan.`,
      });
      continue;
    }

    scannedFiles.push(cleanPath);
    if (!content) continue;

    const lines = content.split('\n');
    const isCodeFile = /\.(?:js|jsx|ts|tsx|mjs|cjs)$/i.test(cleanPath);
    const hasUseClient = isCodeFile && /^\s*['"]use client['"]/m.test(content);
    const commentState = { inBlockComment: false };

    for (let lIdx = 0; lIdx < lines.length; lIdx++) {
      const line = lines[lIdx];

      // 1. Check for Hardcoded Secrets across all scannable files
      for (const sp of HARDCODED_SECRET_PATTERNS) {
        if (sp.pattern.test(line)) {
          blocking.push({
            file: cleanPath,
            line: lIdx + 1,
            severity: 'BLOCKING',
            ruleId: 'HARDCODED_SECRET',
            message: `Security Hard Block: Hardcoded ${sp.name} detected on line ${lIdx + 1}. Use process.env variables instead.`,
          });
        }
      }

      if (isCodeFile) {
        // 2. Check for Server Secrets Exposed in Client Components
        if (hasUseClient) {
          for (const sSecret of SERVER_ENV_SECRETS) {
            if (line.includes(`process.env.${sSecret}`)) {
              blocking.push({
                file: cleanPath,
                line: lIdx + 1,
                severity: 'BLOCKING',
                ruleId: 'CLIENT_SECRET_LEAK',
                message: `Security Hard Block: Client component "${cleanPath}" accesses server secret "process.env.${sSecret}". Client components must only access NEXT_PUBLIC_ prefixed environment variables.`,
              });
            }
          }
        }

        // Strip comments to obtain executable code on this line
        const codeWithoutComments = stripCommentsFromLine(line, commentState);
        const codeWithoutStrings = stripStringsFromCode(codeWithoutComments);

        // 3. Check for Unsafe eval / new Function in executable code (ignoring comments and strings)
        if (
          (/\beval\s*\(|\bnew\s+Function\s*\(/i.test(codeWithoutStrings)) &&
          !line.includes('// eslint-disable')
        ) {
          blocking.push({
            file: cleanPath,
            line: lIdx + 1,
            severity: 'BLOCKING',
            ruleId: 'UNSAFE_EVAL',
            message: `Security Hard Block: Unsafe execution function (eval / new Function) detected on line ${lIdx + 1}.`,
          });
        }

        // 4. Check for SQL Injection String Concatenation in executable code (ignoring comments)
        if (
          codeWithoutComments &&
          /\b(SELECT|INSERT|UPDATE|DELETE)\b.*\+/i.test(codeWithoutComments) &&
          !line.includes('// eslint-disable')
        ) {
          warnings.push({
            file: cleanPath,
            line: lIdx + 1,
            severity: 'WARNING',
            ruleId: 'SQL_INJECTION_RISK',
            message: `Security Warning: Possible SQL string concatenation on line ${lIdx + 1}. Use parameterized queries or Prisma ORM calls.`,
          });
        }
      }
    }
  }

  return {
    passed: blocking.length === 0 && failedFiles.length === 0,
    blocking,
    warnings,
    scannedFiles,
    skippedFiles,
    failedFiles,
  };
}
