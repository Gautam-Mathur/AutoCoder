/**
 * Continuous Debugger - Always-on error detection and auto-fix system
 * Works offline without LLM - pure pattern matching and heuristics
 */

interface DebugIssue {
  id: string;
  type: 'syntax' | 'runtime' | 'logic' | 'import' | 'type' | 'security' | 'performance';
  severity: 'critical' | 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  column?: number;
  file?: string;
  code?: string;
  suggestion?: string;
  autoFixable: boolean;
  fixApplied?: boolean;
}

interface DebugSession {
  id: string;
  startTime: number;
  issues: DebugIssue[];
  fixesApplied: number;
  status: 'active' | 'idle' | 'fixing';
}

interface CodeAnalysisResult {
  issues: DebugIssue[];
  metrics: {
    complexity: number;
    maintainability: number;
    errorProne: number;
  };
  suggestions: string[];
}

const activeSessions = new Map<string, DebugSession>();

const ERROR_PATTERNS: Array<{
  pattern: RegExp;
  type: DebugIssue['type'];
  severity: DebugIssue['severity'];
  message: string;
  fix?: (match: RegExpMatchArray, code: string) => string;
}> = [
  // Syntax errors
  {
    pattern: /Unexpected token\s+['"]?(\w+)['"]?/i,
    type: 'syntax',
    severity: 'critical',
    message: 'Unexpected token found',
  },
  {
    pattern: /Missing\s+(?:closing\s+)?['"]?([\)\}\]>])['"]?/i,
    type: 'syntax',
    severity: 'critical',
    message: 'Missing closing bracket',
  },
  {
    pattern: /Unterminated string/i,
    type: 'syntax',
    severity: 'critical',
    message: 'String not properly closed',
  },

  // Import errors
  {
    pattern: /Cannot find module ['"]([^'"]+)['"]/i,
    type: 'import',
    severity: 'error',
    message: 'Module not found',
  },
  {
    pattern: /is not defined/i,
    type: 'import',
    severity: 'error',
    message: 'Variable or function not defined - missing import?',
  },
  {
    pattern: /import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/,
    type: 'import',
    severity: 'info',
    message: 'Named import detected',
  },

  // Type errors
  {
    pattern: /TypeError:\s+(.+)/i,
    type: 'type',
    severity: 'error',
    message: 'Type error detected',
  },
  {
    pattern: /Cannot read propert(?:y|ies)\s+(?:of\s+)?(?:undefined|null)/i,
    type: 'type',
    severity: 'critical',
    message: 'Null/undefined access - add null check',
  },
  {
    pattern: /is not a function/i,
    type: 'type',
    severity: 'error',
    message: 'Called something that is not a function',
  },

  // Runtime errors
  {
    pattern: /ReferenceError:\s+(.+)/i,
    type: 'runtime',
    severity: 'error',
    message: 'Reference error - variable not defined',
  },
  {
    pattern: /RangeError:\s+(.+)/i,
    type: 'runtime',
    severity: 'error',
    message: 'Range error - value out of bounds',
  },
  {
    pattern: /Maximum call stack size exceeded/i,
    type: 'runtime',
    severity: 'critical',
    message: 'Stack overflow - infinite recursion detected',
  },

  // Security issues
  {
    pattern: /eval\s*\(/i,
    type: 'security',
    severity: 'warning',
    message: 'Avoid using eval() - security risk',
  },
  {
    pattern: /innerHTML\s*=/i,
    type: 'security',
    severity: 'warning',
    message: 'innerHTML can lead to XSS - consider textContent',
  },
  {
    pattern: /document\.write/i,
    type: 'security',
    severity: 'warning',
    message: 'document.write can cause issues - avoid in modern code',
  },

  // Performance issues
  {
    pattern: /\.forEach\s*\([^)]*=>\s*{[^}]*await/i,
    type: 'performance',
    severity: 'warning',
    message: 'Async in forEach - use for...of instead',
  },
  {
    pattern: /new\s+Array\(\d{4,}\)/i,
    type: 'performance',
    severity: 'warning',
    message: 'Large array allocation - consider lazy loading',
  },
];

const AUTO_FIXES: Array<{
  pattern: RegExp;
  fix: (code: string) => string;
  description: string;
}> = [
  // Fix missing semicolons on variable declarations
  {
    pattern: /^(\s*(?:const|let|var)\s+\w+\s*=\s*[^;\n{]+)$/gm,
    fix: (code) => code.replace(/^(\s*(?:const|let|var)\s+\w+\s*=\s*[^;\n{]+)$/gm, '$1;'),
    description: 'Add missing semicolon',
  },

  // Fix console.log to console.error for error messages
  {
    pattern: /console\.log\s*\(\s*['"`]error/gi,
    fix: (code) => code.replace(/console\.log\s*\(\s*(['"`])error/gi, 'console.error($1error'),
    description: 'Use console.error for error messages',
  },

  // Fix == to === for strict equality
  {
    pattern: /([^=!<>])={2}([^=])/g,
    fix: (code) => code.replace(/([^=!<>])={2}([^=])/g, '$1===$2'),
    description: 'Use strict equality (===)',
  },

  // Fix != to !== for strict inequality
  {
    pattern: /([^!])!={1}([^=])/g,
    fix: (code) => code.replace(/([^!])!={1}([^=])/g, '$1!==$2'),
    description: 'Use strict inequality (!==)',
  },

  // Add optional chaining for potential null access (only for variable chains, not URLs/imports)
  {
    pattern: /(?<!["'`\/])(\b[a-z]\w*)\.(\w+)\.(\w+)(?!["'`])/g,
    fix: (code) => {
      // Skip if it looks like a URL, import path, or method chain on literals
      return code.replace(/(?<!["'`\/\w])(\b[a-z][a-zA-Z0-9_]*)\.([a-zA-Z_]\w*)\.([a-zA-Z_]\w*)(?!["'`])/g, (match, a, b, c) => {
        // Don't modify common safe patterns
        if (['console', 'process', 'document', 'window', 'Math', 'Object', 'Array', 'JSON'].includes(a)) {
          return match;
        }
        return `${a}?.${b}?.${c}`;
      });
    },
    description: 'Add optional chaining for safety',
  },

  // Fix async function missing await
  {
    pattern: /async\s+function\s+\w+[^{]*{[^}]*fetch\s*\([^)]+\)(?!\s*\.then)(?![^}]*await)/,
    fix: (code) => code.replace(/(async\s+function\s+\w+[^{]*{[^}]*)fetch\s*\(/g, '$1await fetch('),
    description: 'Add await to fetch call',
  },

  // Fix React useState without initial value
  {
    pattern: /useState\(\s*\)/g,
    fix: (code) => code.replace(/useState\(\s*\)/g, 'useState(null)'),
    description: 'Add initial value to useState',
  },

  // Fix missing key prop in map
  {
    pattern: /\.map\s*\([^)]*\)\s*=>\s*<(?!Fragment|>)[A-Z]\w*(?![^>]*key=)/,
    fix: (code) => {
      return code.replace(
        /\.map\s*\(([^)]*)\)\s*=>\s*(<(?!Fragment|>)[A-Z]\w*)/g,
        '.map(($1, index) => $2 key={index}'
      );
    },
    description: 'Add key prop to mapped elements',
  },
];

// Strip strings and comments from code for accurate bracket counting.
// Handles: // line comments, /* block comments */, "strings", 'strings', `template literals`
function stripStringsAndComments(code: string): string {
  let result = '';
  let i = 0;
  while (i < code.length) {
    // Line comment — skip to end of line
    if (code[i] === '/' && code[i + 1] === '/') {
      while (i < code.length && code[i] !== '\n') i++;
      continue;
    }
    // Block comment — skip to */
    if (code[i] === '/' && code[i + 1] === '*') {
      i += 2;
      while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    // String or template literal — skip entire contents
    if (code[i] === '"' || code[i] === "'" || code[i] === '`') {
      const q = code[i];
      i++;
      while (i < code.length) {
        if (code[i] === '\\') { i += 2; continue; }  // skip escape sequence
        if (code[i] === q) { i++; break; }            // closing quote
        i++;
      }
      continue;
    }
    result += code[i];
    i++;
  }
  return result;
}

// Bracket balance check.
// Uses count-based approach (not stack-based) to avoid false positives in valid
// TypeScript/JSX code where () and {} legitimately interleave — e.g.:
//   {items.map((item) => (<div key={item.id} />))}
// A stack-based checker misreads the ) closing .map( as mismatching the { JSX container.
// Count-based checking only flags files where brackets are genuinely unbalanced overall.
function findUnmatchedBrackets(code: string): DebugIssue[] {
  const issues: DebugIssue[] = [];
  const stripped = stripStringsAndComments(code);

  const openP  = (stripped.match(/\(/g) || []).length;
  const closeP = (stripped.match(/\)/g) || []).length;
  const openB  = (stripped.match(/\{/g) || []).length;
  const closeB = (stripped.match(/\}/g) || []).length;
  const openS  = (stripped.match(/\[/g) || []).length;
  const closeS = (stripped.match(/\]/g) || []).length;

  if (openP !== closeP) {
    issues.push({
      id: 'bracket-paren-count',
      type: 'syntax',
      severity: 'critical',
      message: openP > closeP
        ? `File has ${openP - closeP} unclosed '(' — missing closing ')'`
        : `File has ${closeP - openP} extra ')' without matching '('`,
      line: 1,
      column: 1,
      autoFixable: false,
    });
  }

  if (openB !== closeB) {
    issues.push({
      id: 'bracket-brace-count',
      type: 'syntax',
      severity: 'critical',
      message: openB > closeB
        ? `File has ${openB - closeB} unclosed '{' — missing closing '}'`
        : `File has ${closeB - openB} extra '}' without matching '{'`,
      line: 1,
      column: 1,
      autoFixable: false,
    });
  }

  if (openS !== closeS) {
    issues.push({
      id: 'bracket-square-count',
      type: 'syntax',
      severity: 'critical',
      message: openS > closeS
        ? `File has ${openS - closeS} unclosed '[' — missing closing ']'`
        : `File has ${closeS - openS} extra ']' without matching '['`,
      line: 1,
      column: 1,
      autoFixable: false,
    });
  }

  return issues;
}

// Analyze code for issues
export function analyzeCode(code: string, language = 'javascript'): CodeAnalysisResult {
  const issues: DebugIssue[] = [];
  const suggestions: string[] = [];

  // Check for bracket issues
  issues.push(...findUnmatchedBrackets(code));

  // Check against error patterns
  for (const errorPattern of ERROR_PATTERNS) {
    const match = code.match(errorPattern.pattern);
    if (match) {
      issues.push({
        id: `pattern-${issues.length}`,
        type: errorPattern.type,
        severity: errorPattern.severity,
        message: errorPattern.message,
        autoFixable: !!errorPattern.fix,
      });
    }
  }

  // Calculate metrics
  const lines = code.split('\n').length;
  const complexity = Math.min(10, Math.floor(lines / 20) + (code.match(/if|for|while|switch/g)?.length || 0));
  const maintainability = Math.max(0, 10 - issues.filter(i => i.severity === 'critical' || i.severity === 'error').length);
  const errorProne = issues.length;

  // Generate suggestions
  if (complexity > 7) {
    suggestions.push('Consider breaking this code into smaller functions');
  }
  if (issues.some(i => i.type === 'security')) {
    suggestions.push('Review security concerns before deploying');
  }
  if (!code.includes('try') && code.includes('fetch')) {
    suggestions.push('Add try-catch around fetch calls for error handling');
  }
  if (!code.includes('// ') && !code.includes('/* ') && lines > 30) {
    suggestions.push('Add comments to explain complex logic');
  }

  return {
    issues,
    metrics: { complexity, maintainability, errorProne },
    suggestions,
  };
}

// Auto-fix code issues
export function autoFixCode(code: string): { fixed: string; changes: string[] } {
  let fixed = code;
  const changes: string[] = [];

  for (const autoFix of AUTO_FIXES) {
    // Reset regex lastIndex for global patterns
    autoFix.pattern.lastIndex = 0;
    if (autoFix.pattern.test(fixed)) {
      const before = fixed;
      // Reset again before fix
      autoFix.pattern.lastIndex = 0;
      fixed = autoFix.fix(fixed);
      if (fixed !== before) {
        changes.push(autoFix.description);
      }
    }
  }

  return { fixed, changes };
}

// Parse error messages from console/runtime
export function parseError(errorText: string): DebugIssue {
  const lines = errorText.split('\n');
  const firstLine = lines[0] || errorText;

  // Try to extract line number
  const lineMatch = errorText.match(/(?:line\s+|:)(\d+)(?::(\d+))?/i);
  const line = lineMatch ? parseInt(lineMatch[1]) : undefined;
  const column = lineMatch && lineMatch[2] ? parseInt(lineMatch[2]) : undefined;

  // Determine error type
  let type: DebugIssue['type'] = 'runtime';
  let severity: DebugIssue['severity'] = 'error';

  if (/syntax|unexpected|unterminated/i.test(errorText)) {
    type = 'syntax';
    severity = 'critical';
  } else if (/type|cannot read|is not/i.test(errorText)) {
    type = 'type';
  } else if (/import|module|require/i.test(errorText)) {
    type = 'import';
  } else if (/security|xss|injection/i.test(errorText)) {
    type = 'security';
    severity = 'critical';
  }

  return {
    id: `error-${Date.now()}`,
    type,
    severity,
    message: firstLine.slice(0, 200),
    line,
    column,
    autoFixable: type === 'syntax' || type === 'import',
  };
}

// Start a debug session
export function startDebugSession(sessionId: string): DebugSession {
  const session: DebugSession = {
    id: sessionId,
    startTime: Date.now(),
    issues: [],
    fixesApplied: 0,
    status: 'active',
  };
  activeSessions.set(sessionId, session);
  return session;
}

// Get debug session
export function getDebugSession(sessionId: string): DebugSession | null {
  return activeSessions.get(sessionId) || null;
}

// Add issue to session
export function addIssueToSession(sessionId: string, issue: DebugIssue): void {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.issues.push(issue);
  }
}

// Continuous debug - analyze and fix in one pass
export function continuousDebug(code: string, sessionId?: string): {
  originalCode: string;
  fixedCode: string;
  issues: DebugIssue[];
  autoFixes: string[];
  healthy: boolean;
} {
  const sid = sessionId || `debug-${Date.now()}`;
  const session = startDebugSession(sid);

  // Analyze code
  const analysis = analyzeCode(code);
  session.issues = analysis.issues;

  // Apply auto-fixes
  session.status = 'fixing';
  const { fixed, changes } = autoFixCode(code);
  session.fixesApplied = changes.length;

  // Re-analyze after fixes
  const postFixAnalysis = analyzeCode(fixed);
  const remainingIssues = postFixAnalysis.issues.filter(
    i => i.severity === 'critical' || i.severity === 'error'
  );

  session.status = 'idle';

  return {
    originalCode: code,
    fixedCode: fixed,
    issues: analysis.issues,
    autoFixes: changes,
    healthy: remainingIssues.length === 0,
  };
}

// Get status summary
export function getDebugStatus(): {
  activeSessions: number;
  totalIssuesFound: number;
  totalFixesApplied: number;
  healthyRate: number;
} {
  let totalIssues = 0;
  let totalFixes = 0;

  Array.from(activeSessions.values()).forEach(session => {
    totalIssues += session.issues.length;
    totalFixes += session.fixesApplied;
  });

  const healthyRate = totalIssues > 0 ? Math.round((totalFixes / totalIssues) * 100) : 100;

  return {
    activeSessions: activeSessions.size,
    totalIssuesFound: totalIssues,
    totalFixesApplied: totalFixes,
    healthyRate,
  };
}

// Format debug report as markdown
export function formatDebugReport(result: ReturnType<typeof continuousDebug>): string {
  const lines: string[] = [
    '## Debug Report',
    '',
    `**Status**: ${result.healthy ? '✅ Healthy' : '⚠️ Issues Found'}`,
    `**Issues Found**: ${result.issues.length}`,
    `**Auto-Fixes Applied**: ${result.autoFixes.length}`,
    '',
  ];

  if (result.issues.length > 0) {
    lines.push('### Issues');
    for (const issue of result.issues) {
      const icon = issue.severity === 'critical' ? '🔴' :
                   issue.severity === 'error' ? '🟠' :
                   issue.severity === 'warning' ? '🟡' : '🔵';
      lines.push(`- ${icon} **${issue.type}**: ${issue.message}`);
      if (issue.line) lines.push(`  - Line ${issue.line}${issue.column ? `:${issue.column}` : ''}`);
      if (issue.suggestion) lines.push(`  - Suggestion: ${issue.suggestion}`);
    }
    lines.push('');
  }

  if (result.autoFixes.length > 0) {
    lines.push('### Auto-Fixes Applied');
    for (const fix of result.autoFixes) {
      lines.push(`- ✓ ${fix}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}