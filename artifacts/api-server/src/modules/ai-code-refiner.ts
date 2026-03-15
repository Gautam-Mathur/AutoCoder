/**
 * AI Code Refiner - Local Pattern-Based Code Analysis & Improvement
 *
 * Zero-config: Uses built-in knowledge base and patterns
 * No external APIs required
 */

import {
  SECURITY_PATTERNS,
  ERROR_SOLUTIONS,
  getPatternByType
} from './complete-code-intelligence.js';

export interface FileToRefine {
  path: string;
  content: string;
  type: string;
}

export interface CodeIssue {
  type: 'security' | 'quality' | 'performance' | 'consistency';
  severity: 'critical' | 'high' | 'medium' | 'low';
  line?: number;
  message: string;
  suggestion: string;
  pattern?: string;
}

export interface RefinementResult {
  path: string;
  originalContent: string;
  refinedContent: string;
  improvements: string[];
  issues: CodeIssue[];
  wasImproved: boolean;
}

export interface RefinementOptions {
  enableSecurityReview?: boolean;
  enableCodeQuality?: boolean;
  enablePerformance?: boolean;
  enableConsistency?: boolean;
  maxFilesToRefine?: number;
}

// Always available - no external dependencies
export function isAIRefinementAvailable(): boolean {
  return true;
}

// ============================================
// SECURITY PATTERNS - Detect vulnerabilities
// ============================================

const SECURITY_RULES: Array<{
  name: string;
  pattern: RegExp;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  suggestion: string;
  replacement?: (match: string) => string;
}> = [
  {
    name: 'sql-injection',
    pattern: /(\$\{.*?\}|"\s*\+\s*\w+\s*\+\s*"|\+\s*\w+\s*\+).*?(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)/gi,
    severity: 'critical',
    message: 'Potential SQL injection vulnerability - string concatenation in query',
    suggestion: 'Use parameterized queries or prepared statements instead of string concatenation',
  },
  {
    name: 'xss-innerhtml',
    pattern: /\.innerHTML\s*=\s*[^"'`]/g,
    severity: 'high',
    message: 'Potential XSS vulnerability - setting innerHTML with dynamic content',
    suggestion: 'Use textContent or sanitize HTML before inserting',
  },
  {
    name: 'eval-usage',
    pattern: /\beval\s*\(/g,
    severity: 'critical',
    message: 'Use of eval() is dangerous and can execute arbitrary code',
    suggestion: 'Avoid eval() - use JSON.parse() for JSON or Function constructor with caution',
  },
  {
    name: 'hardcoded-secret',
    pattern: /(password|secret|api_?key|token|auth)\s*[=:]\s*['"][^'"]{8,}['"]/gi,
    severity: 'critical',
    message: 'Hardcoded secret or credential detected',
    suggestion: 'Use environment variables for secrets: process.env.SECRET_NAME',
  },
  {
    name: 'http-not-https',
    pattern: /['"]http:\/\/(?!localhost|127\.0\.0\.1)/g,
    severity: 'medium',
    message: 'Using HTTP instead of HTTPS for external URLs',
    suggestion: 'Use HTTPS for secure communication',
  },
  {
    name: 'missing-auth-check',
    pattern: /app\.(get|post|put|delete|patch)\s*\(\s*['"][^'"]*['"],\s*(?:async\s*)?\([^)]*\)\s*=>/g,
    severity: 'medium',
    message: 'Route handler without explicit authentication middleware',
    suggestion: 'Consider adding authentication middleware for protected routes',
  },
  {
    name: 'cors-wildcard',
    pattern: /origin:\s*['"]\*['"]/g,
    severity: 'medium',
    message: 'CORS configured with wildcard origin',
    suggestion: 'Restrict CORS to specific allowed origins in production',
  },
  {
    name: 'no-rate-limit',
    pattern: /app\.use\s*\(\s*['"]\/api/g,
    severity: 'low',
    message: 'API routes may benefit from rate limiting',
    suggestion: 'Consider adding rate limiting to prevent abuse',
  },
];

// ============================================
// CODE QUALITY PATTERNS
// ============================================

const QUALITY_RULES: Array<{
  name: string;
  pattern: RegExp;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  suggestion: string;
  replacement?: (match: string, content: string) => string;
}> = [
  {
    name: 'missing-try-catch-async',
    pattern: /async\s+\w+\s*\([^)]*\)\s*\{(?![^}]*try\s*\{)/g,
    severity: 'medium',
    message: 'Async function without try-catch error handling',
    suggestion: 'Wrap async operations in try-catch blocks',
  },
  {
    name: 'console-log-in-production',
    pattern: /console\.(log|debug|info)\s*\(/g,
    severity: 'low',
    message: 'Console logging should be removed or replaced with proper logging',
    suggestion: 'Use a proper logger or remove console statements for production',
  },
  {
    name: 'empty-catch-block',
    pattern: /catch\s*\([^)]*\)\s*\{\s*\}/g,
    severity: 'high',
    message: 'Empty catch block silently swallows errors',
    suggestion: 'Log errors or rethrow them - never silently ignore',
  },
  {
    name: 'magic-numbers',
    pattern: /(?<![.\d])\b(?:86400|3600|60000|1000|100|10)\b(?!\.\d)/g,
    severity: 'low',
    message: 'Magic number detected - consider using named constants',
    suggestion: 'Use named constants for clarity: const SECONDS_IN_DAY = 86400',
  },
  {
    name: 'any-type-usage',
    pattern: /:\s*any\b/g,
    severity: 'medium',
    message: 'Using "any" type defeats TypeScript safety',
    suggestion: 'Define proper types or use "unknown" with type guards',
  },
  {
    name: 'todo-fixme-comments',
    pattern: /\/\/\s*(TODO|FIXME|HACK|XXX):/gi,
    severity: 'low',
    message: 'TODO/FIXME comment found - may indicate incomplete code',
    suggestion: 'Address TODO items or create issues to track them',
  },
  {
    name: 'nested-callbacks',
    pattern: /\)\s*=>\s*\{[^}]*\)\s*=>\s*\{[^}]*\)\s*=>/g,
    severity: 'medium',
    message: 'Deeply nested callbacks - callback hell',
    suggestion: 'Refactor using async/await or extract into separate functions',
  },
  {
    name: 'no-return-type',
    pattern: /(?:export\s+)?(?:async\s+)?function\s+\w+\s*\([^)]*\)\s*\{/g,
    severity: 'low',
    message: 'Function missing explicit return type',
    suggestion: 'Add return type annotation for better type safety',
  },
];

// ============================================
// PERFORMANCE PATTERNS
// ============================================

const PERFORMANCE_RULES: Array<{
  name: string;
  pattern: RegExp;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  suggestion: string;
}> = [
  {
    name: 'n-plus-1-query',
    pattern: /for\s*\([^)]*\)\s*\{[^}]*await\s+\w+\.(find|query|select|get)/gi,
    severity: 'high',
    message: 'Potential N+1 query problem - database call inside loop',
    suggestion: 'Batch database queries or use eager loading',
  },
  {
    name: 'sync-file-operations',
    pattern: /fs\.(readFileSync|writeFileSync|appendFileSync|existsSync)/g,
    severity: 'medium',
    message: 'Synchronous file operation blocks the event loop',
    suggestion: 'Use async versions: fs.promises.readFile, fs.promises.writeFile',
  },
  {
    name: 'missing-pagination',
    pattern: /\.find\(\s*\{\s*\}\s*\)|\.findAll\(\s*\)|SELECT\s+\*\s+FROM\s+\w+(?!\s+WHERE|\s+LIMIT)/gi,
    severity: 'medium',
    message: 'Query without pagination may return too many results',
    suggestion: 'Add LIMIT/OFFSET or pagination for large datasets',
  },
  {
    name: 'large-object-in-state',
    pattern: /useState\s*\(\s*\[[\s\S]{100,}\]\s*\)/g,
    severity: 'medium',
    message: 'Large initial state may cause performance issues',
    suggestion: 'Consider lazy loading or pagination for large datasets',
  },
  {
    name: 'missing-usememo',
    pattern: /const\s+\w+\s*=\s*\w+\.(filter|map|reduce|sort)\([^)]+\)(?!\s*,\s*\[)/g,
    severity: 'low',
    message: 'Expensive array operation may benefit from useMemo',
    suggestion: 'Wrap expensive computations in useMemo for React components',
  },
  {
    name: 'useeffect-missing-deps',
    pattern: /useEffect\s*\(\s*\(\s*\)\s*=>\s*\{[^}]*\},\s*\[\s*\]\s*\)/g,
    severity: 'low',
    message: 'useEffect with empty deps runs only once - verify this is intended',
    suggestion: 'Ensure empty dependency array is intentional',
  },
];

// ============================================
// CONSISTENCY PATTERNS
// ============================================

const CONSISTENCY_RULES: Array<{
  name: string;
  pattern: RegExp;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  suggestion: string;
}> = [
  {
    name: 'mixed-quotes',
    pattern: /(?:['"][^'"]*['"].*){3,}/g,
    severity: 'low',
    message: 'Inconsistent quote style detected',
    suggestion: 'Use consistent quote style throughout the file',
  },
  {
    name: 'mixed-arrow-function',
    pattern: /function\s+\w+\s*\([^)]*\)[\s\S]*=>\s*\{/g,
    severity: 'low',
    message: 'Mixed function declaration styles',
    suggestion: 'Use consistent function style - prefer arrow functions or regular functions',
  },
  {
    name: 'inconsistent-error-handling',
    pattern: /res\.status\((?:4|5)\d{2}\)\.(?:json|send)\(\s*\{?\s*(?:error|message|msg)/gi,
    severity: 'medium',
    message: 'Inconsistent error response format',
    suggestion: 'Use consistent error response structure: { error: string, code?: string }',
  },
  {
    name: 'missing-semicolons',
    pattern: /\}\s*\n\s*(?:const|let|var|function|class|export|import)/g,
    severity: 'low',
    message: 'Inconsistent semicolon usage',
    suggestion: 'Use consistent semicolon style - preferably always use them',
  },
];

// ============================================
// AUTO-FIX PATTERNS
// ============================================

const AUTO_FIXES: Array<{
  name: string;
  pattern: RegExp;
  fix: (content: string) => string;
  description: string;
}> = [
  {
    name: 'add-try-catch-async',
    pattern: /(async\s+(?:function\s+)?(\w+)\s*\([^)]*\)\s*\{)((?:(?!\btry\b)[\s\S])*?)(\n\s*\})/g,
    fix: (content: string) => {
      return content.replace(
        /(async\s+(?:function\s+)?(\w+)\s*\([^)]*\)\s*\{)((?:(?!\btry\b)[\s\S])*?)(\n\s*\})/g,
        (match, start, name, body, end) => {
          if (body.includes('try {') || body.trim().length < 20) return match;
          const indent = '    ';
          const indentedBody = body.split('\n').map((line: string) => indent + line).join('\n');
          return `${start}\n  try {${indentedBody}\n  } catch (error) {\n    console.error('Error in ${name}:', error);\n    throw error;\n  }${end}`;
        }
      );
    },
    description: 'Added try-catch wrapper to async function',
  },
  {
    name: 'replace-var-with-const',
    pattern: /\bvar\s+(\w+)\s*=/g,
    fix: (content: string) => content.replace(/\bvar\s+(\w+)\s*=/g, 'const $1 ='),
    description: 'Replaced var with const',
  },
  {
    name: 'add-strict-equality',
    pattern: /([^!=])={2}(?!=)/g,
    fix: (content: string) => content.replace(/([^!=])={2}(?!=)/g, '$1==='),
    description: 'Changed == to === for strict equality',
  },
];

// ============================================
// ANALYSIS FUNCTIONS
// ============================================

function analyzeFile(file: FileToRefine, options: RefinementOptions): CodeIssue[] {
  const issues: CodeIssue[] = [];
  const content = file.content;
  const lines = content.split('\n');

  // Security analysis
  if (options.enableSecurityReview !== false) {
    for (const rule of SECURITY_RULES) {
      const matches = content.match(rule.pattern);
      if (matches) {
        for (const match of matches) {
          const lineNum = findLineNumber(content, match);
          issues.push({
            type: 'security',
            severity: rule.severity,
            line: lineNum,
            message: rule.message,
            suggestion: rule.suggestion,
            pattern: rule.name,
          });
        }
      }
    }
  }

  // Quality analysis
  if (options.enableCodeQuality !== false) {
    for (const rule of QUALITY_RULES) {
      const matches = content.match(rule.pattern);
      if (matches) {
        // Limit to first 3 matches to avoid noise
        for (const match of matches.slice(0, 3)) {
          const lineNum = findLineNumber(content, match);
          issues.push({
            type: 'quality',
            severity: rule.severity,
            line: lineNum,
            message: rule.message,
            suggestion: rule.suggestion,
            pattern: rule.name,
          });
        }
      }
    }
  }

  // Performance analysis
  if (options.enablePerformance) {
    for (const rule of PERFORMANCE_RULES) {
      const matches = content.match(rule.pattern);
      if (matches) {
        for (const match of matches.slice(0, 2)) {
          const lineNum = findLineNumber(content, match);
          issues.push({
            type: 'performance',
            severity: rule.severity,
            line: lineNum,
            message: rule.message,
            suggestion: rule.suggestion,
            pattern: rule.name,
          });
        }
      }
    }
  }

  // Consistency analysis
  if (options.enableConsistency) {
    for (const rule of CONSISTENCY_RULES) {
      const matches = content.match(rule.pattern);
      if (matches && matches.length > 0) {
        issues.push({
          type: 'consistency',
          severity: rule.severity,
          message: rule.message,
          suggestion: rule.suggestion,
          pattern: rule.name,
        });
      }
    }
  }

  return issues;
}

function findLineNumber(content: string, match: string): number {
  const index = content.indexOf(match);
  if (index === -1) return 0;
  return content.substring(0, index).split('\n').length;
}

function applyAutoFixes(content: string, options: RefinementOptions): { content: string; fixes: string[] } {
  let result = content;
  const fixes: string[] = [];

  for (const autoFix of AUTO_FIXES) {
    if (autoFix.pattern.test(result)) {
      const before = result;
      result = autoFix.fix(result);
      if (result !== before) {
        fixes.push(autoFix.description);
      }
    }
  }

  return { content: result, fixes };
}

// ============================================
// PUBLIC API
// ============================================

export async function refineCode(
  files: FileToRefine[],
  options: RefinementOptions = {}
): Promise<RefinementResult[]> {
  const {
    enableSecurityReview = true,
    enableCodeQuality = true,
    enablePerformance = false,
    enableConsistency = false,
    maxFilesToRefine = 20,
  } = options;

  // Filter to important source files
  const priorityFiles = files
    .filter((f) => {
      const isSourceFile = f.type === 'source' || f.path.endsWith('.ts') || f.path.endsWith('.tsx') || f.path.endsWith('.js');
      const isImportantFile =
        f.path.includes('/services/') ||
        f.path.includes('/controllers/') ||
        f.path.includes('/routes') ||
        f.path.includes('/middleware/') ||
        f.path.includes('/api/') ||
        f.path.includes('/hooks/') ||
        f.path.includes('/utils/');
      return isSourceFile && isImportantFile && f.content.length > 100;
    })
    .slice(0, maxFilesToRefine);

  const results: RefinementResult[] = [];

  for (const file of priorityFiles) {
    const issues = analyzeFile(file, {
      enableSecurityReview,
      enableCodeQuality,
      enablePerformance,
      enableConsistency,
    });

    const { content: refinedContent, fixes } = applyAutoFixes(file.content, options);

    const improvements = [
      ...fixes,
      ...issues.filter(i => i.severity === 'critical' || i.severity === 'high')
        .map(i => `${i.type}: ${i.message}`),
    ];

    results.push({
      path: file.path,
      originalContent: file.content,
      refinedContent,
      improvements,
      issues,
      wasImproved: refinedContent !== file.content || issues.length > 0,
    });
  }

  return results;
}

export async function quickRefine(
  files: FileToRefine[],
  maxFiles: number = 10
): Promise<RefinementResult[]> {
  return refineCode(files, {
    enableSecurityReview: true,
    enableCodeQuality: true,
    enablePerformance: false,
    enableConsistency: false,
    maxFilesToRefine: maxFiles,
  });
}

export async function reviewProject(
  files: FileToRefine[]
): Promise<{ summary: string; fileReviews: Array<{ path: string; issues: CodeIssue[] }> }> {
  const priorityFiles = files
    .filter((f) => {
      const isSourceFile = f.path.endsWith('.ts') || f.path.endsWith('.tsx') || f.path.endsWith('.js');
      return isSourceFile && f.content.length > 100;
    })
    .slice(0, 15);

  const fileReviews: Array<{ path: string; issues: CodeIssue[] }> = [];

  for (const file of priorityFiles) {
    const issues = analyzeFile(file, {
      enableSecurityReview: true,
      enableCodeQuality: true,
      enablePerformance: true,
      enableConsistency: true,
    });

    if (issues.length > 0) {
      fileReviews.push({ path: file.path, issues });
    }
  }

  const totalIssues = fileReviews.reduce((sum, r) => sum + r.issues.length, 0);
  const criticalCount = fileReviews.reduce(
    (sum, r) => sum + r.issues.filter(i => i.severity === 'critical').length,
    0
  );
  const highCount = fileReviews.reduce(
    (sum, r) => sum + r.issues.filter(i => i.severity === 'high').length,
    0
  );

  let summary: string;
  if (totalIssues === 0) {
    summary = 'No issues found. Code quality looks good!';
  } else if (criticalCount > 0) {
    summary = `Found ${criticalCount} critical and ${highCount} high severity issues across ${fileReviews.length} files. Immediate attention required.`;
  } else if (highCount > 0) {
    summary = `Found ${highCount} high severity issues and ${totalIssues - highCount} other issues across ${fileReviews.length} files.`;
  } else {
    summary = `Found ${totalIssues} potential improvements across ${fileReviews.length} files.`;
  }

  return { summary, fileReviews };
}

// ============================================
// PATTERN ENHANCEMENT - Use knowledge base
// ============================================

export function getSecurityPatternSuggestion(issueType: string): string | undefined {
  const patterns: Record<string, string> = {
    'sql-injection': SECURITY_PATTERNS?.validation || 'Use parameterized queries',
    'xss': SECURITY_PATTERNS?.headers || 'Sanitize user input before rendering',
    'auth': SECURITY_PATTERNS?.csrf || 'Implement proper authentication middleware',
    'rate-limit': SECURITY_PATTERNS?.rateLimit || 'Add rate limiting to prevent abuse',
  };
  return patterns[issueType];
}

export function getErrorSolution(category: string, errorType: string): string | undefined {
  try {
    if (ERROR_SOLUTIONS && typeof ERROR_SOLUTIONS === 'object') {
      const categoryErrors = (ERROR_SOLUTIONS as Record<string, Record<string, { fix?: string }>>)[category];
      if (categoryErrors && typeof categoryErrors === 'object') {
        const error = categoryErrors[errorType];
        if (error && error.fix) {
          return error.fix;
        }
      }
    }
  } catch {
    // Ignore type errors
  }
  return undefined;
}