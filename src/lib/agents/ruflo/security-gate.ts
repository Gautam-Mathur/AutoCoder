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

const SCANNABLE_FILE_REGEX = /\.(?:js|jsx|ts|tsx|mjs|cjs|json|html|yml|yaml|prisma|sql|sh|py|rb|go|rs|toml|ini|conf)$/i;
const ENV_FILE_REGEX = /(?:^|\/)\.env(?:\.[a-zA-Z0-9._-]+)?$/i;

/**
 * Deterministic security verification gate checking for hardcoded secrets, SQL injection, unsafe eval, and client secret leaks.
 * Uses stateless (non-global) regexes so repeated .test() evaluations across lines and files are 100% deterministic.
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

        // 3. Check for Unsafe eval / new Function
        if (/\beval\(|\bnew Function\(/i.test(line) && !line.includes('// eslint-disable')) {
          blocking.push({
            file: cleanPath,
            line: lIdx + 1,
            severity: 'BLOCKING',
            ruleId: 'UNSAFE_EVAL',
            message: `Security Hard Block: Unsafe execution function (eval / new Function) detected on line ${lIdx + 1}.`,
          });
        }

        // 4. Check for SQL Injection String Concatenation
        if (/\b(SELECT|INSERT|UPDATE|DELETE)\b.*\+/i.test(line) && !line.includes('// eslint-disable')) {
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
