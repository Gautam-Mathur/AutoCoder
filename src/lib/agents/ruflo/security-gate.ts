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
}

/**
 * Deterministic security verification gate checking for hardcoded secrets, SQL injection, unsafe eval, and client secret leaks.
 */
export function validateSecurityGate(vfsFiles: Record<string, string>): SecurityGateResult {
  const blocking: SecurityFinding[] = [];
  const warnings: SecurityFinding[] = [];

  const HARDCODED_SECRET_PATTERNS = [
    { pattern: /sk-[A-Za-z0-9]{32,}/g, name: 'OpenAI Secret Key' },
    { pattern: /sk_live_[A-Za-z0-9]{24,}/g, name: 'Stripe Live Secret Key' },
    { pattern: /sk_test_[A-Za-z0-9]{24,}/g, name: 'Stripe Test Secret Key' },
    { pattern: /ghp_[A-Za-z0-9]{36}/g, name: 'GitHub Personal Access Token' },
    { pattern: /AKIA[0-9A-Z]{16}/g, name: 'AWS Access Key ID' },
  ];

  const SERVER_ENV_SECRETS = ['STRIPE_SECRET_KEY', 'DATABASE_URL', 'JWT_SECRET', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'AWS_SECRET_ACCESS_KEY'];

  for (const [filename, content] of Object.entries(vfsFiles)) {
    if (!/\.(js|jsx|ts|tsx)$/.test(filename) || !content) continue;
    const cleanPath = filename.replace(/\\/g, '/').replace(/^\.\//, '');
    const lines = content.split('\n');
    const hasUseClient = /^\s*['"]use client['"]/m.test(content);

    for (let lIdx = 0; lIdx < lines.length; lIdx++) {
      const line = lines[lIdx];

      // 1. Check for Hardcoded Secrets
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

  return {
    passed: blocking.length === 0,
    blocking,
    warnings,
  };
}
