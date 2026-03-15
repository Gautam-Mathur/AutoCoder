/**
 * Deep Debugging Engine
 * Claude-level root cause analysis, stack trace parsing,
 * fix chains, and variable tracking
 */

// ============================================
// TYPES AND INTERFACES
// ============================================

export interface DebugAnalysis {
  error: ParsedError;
  rootCause: RootCause;
  fixChain: FixStep[];
  variables: VariableTrace[];
  context: DebugContext;
  suggestions: string[];
  confidence: number;
}

export interface ParsedError {
  type: string;
  message: string;
  code?: string;
  file?: string;
  line?: number;
  column?: number;
  stack: StackFrame[];
  originalText: string;
}

export interface StackFrame {
  function: string;
  file: string;
  line: number;
  column?: number;
  isInternal: boolean;
  context?: string;
}

export interface RootCause {
  category: string;
  description: string;
  likelihood: number;
  evidence: string[];
  relatedPatterns: string[];
}

export interface FixStep {
  order: number;
  action: string;
  description: string;
  code?: string;
  file?: string;
  line?: number;
  automated: boolean;
}

export interface VariableTrace {
  name: string;
  type: string;
  value?: string;
  lastAssignment?: number;
  usages: number[];
  suspicious: boolean;
  reason?: string;
}

export interface DebugContext {
  runtime: string;
  framework?: string;
  environment: string;
  dependencies: string[];
  recentChanges?: string[];
}

// ============================================
// ERROR PATTERN DATABASE
// ============================================

const ERROR_PATTERNS: Array<{
  pattern: RegExp;
  type: string;
  category: string;
  description: string;
  commonCauses: string[];
  fixes: string[];
}> = [
  // ========== JAVASCRIPT/TYPESCRIPT ERRORS ==========
  {
    pattern: /TypeError:\s*Cannot read propert(?:y|ies)\s+(?:of\s+)?(?:undefined|null)/i,
    type: 'TypeError',
    category: 'null-reference',
    description: 'Accessing property on undefined or null value',
    commonCauses: [
      'Variable not initialized before use',
      'Async data not loaded yet',
      'Object path does not exist',
      'Function returned undefined',
      'API response missing expected field',
    ],
    fixes: [
      'Add null/undefined check before access',
      'Use optional chaining (?.) operator',
      'Add default value with nullish coalescing (??)',
      'Ensure data is loaded before access',
      'Validate API response structure',
    ],
  },
  {
    pattern: /TypeError:\s*(\w+)\s+is not a function/i,
    type: 'TypeError',
    category: 'not-callable',
    description: 'Trying to call something that is not a function',
    commonCauses: [
      'Variable shadowing a function',
      'Incorrect import/export',
      'Method not bound correctly',
      'Object instead of function assigned',
      'Typo in function name',
    ],
    fixes: [
      'Check variable naming conflicts',
      'Verify import statement',
      'Bind method to correct context',
      'Check assignment to variable',
      'Fix typo in function name',
    ],
  },
  {
    pattern: /ReferenceError:\s*(\w+)\s+is not defined/i,
    type: 'ReferenceError',
    category: 'undefined-variable',
    description: 'Using a variable that has not been declared',
    commonCauses: [
      'Variable not declared with let/const/var',
      'Typo in variable name',
      'Scope issue - variable out of scope',
      'Missing import statement',
      'Using before declaration (temporal dead zone)',
    ],
    fixes: [
      'Declare variable before use',
      'Fix typo in variable name',
      'Move declaration to accessible scope',
      'Add missing import statement',
      'Reorder code to declare before use',
    ],
  },
  {
    pattern: /SyntaxError:\s*Unexpected token/i,
    type: 'SyntaxError',
    category: 'syntax',
    description: 'Invalid syntax - unexpected character or token',
    commonCauses: [
      'Missing closing bracket/parenthesis/brace',
      'Extra or misplaced comma',
      'Unclosed string literal',
      'Invalid JSON format',
      'Using reserved keyword as identifier',
    ],
    fixes: [
      'Check bracket/brace matching',
      'Remove extra commas',
      'Close string literals properly',
      'Validate JSON syntax',
      'Rename reserved keyword variables',
    ],
  },
  {
    pattern: /RangeError:\s*Maximum call stack size exceeded/i,
    type: 'RangeError',
    category: 'stack-overflow',
    description: 'Infinite recursion or too deep call stack',
    commonCauses: [
      'Recursive function without base case',
      'Circular dependency between functions',
      'Infinite loop causing stack growth',
      'Event handler triggering itself',
      'useEffect infinite loop in React',
    ],
    fixes: [
      'Add proper base case to recursion',
      'Break circular dependencies',
      'Convert recursion to iteration',
      'Add condition to prevent re-triggering',
      'Add dependencies to useEffect',
    ],
  },
  {
    pattern: /Error:\s*ENOENT.*no such file or directory/i,
    type: 'Error',
    category: 'file-not-found',
    description: 'File or directory does not exist',
    commonCauses: [
      'Incorrect file path',
      'File not created yet',
      'Path separator wrong for OS',
      'Case sensitivity issue',
      'Working directory different than expected',
    ],
    fixes: [
      'Verify file path exists',
      'Create file/directory before access',
      'Use path.join() for cross-platform paths',
      'Check case of filename',
      'Use __dirname or process.cwd()',
    ],
  },
  {
    pattern: /Error:\s*EADDRINUSE.*address already in use/i,
    type: 'Error',
    category: 'port-in-use',
    description: 'Port already being used by another process',
    commonCauses: [
      'Previous server instance still running',
      'Another application using the port',
      'Zombie process holding port',
      'Docker container using port',
    ],
    fixes: [
      'Kill the process using the port',
      'Use different port',
      'Check for running instances',
      'Stop Docker containers',
    ],
  },
  {
    pattern: /UnhandledPromiseRejectionWarning|Unhandled promise rejection/i,
    type: 'UnhandledRejection',
    category: 'promise-rejection',
    description: 'Promise rejected without catch handler',
    commonCauses: [
      'Missing .catch() on promise',
      'async function without try/catch',
      'Forgotten await statement',
      'Error thrown in then() callback',
    ],
    fixes: [
      'Add .catch() to promise chain',
      'Wrap async code in try/catch',
      'Add await keyword',
      'Add error handler to then callback',
    ],
  },

  // ========== PYTHON ERRORS ==========
  {
    pattern: /TypeError:\s*(?:'[\w]+'\s+)?object (?:is not|has no)/i,
    type: 'TypeError',
    category: 'type-mismatch',
    description: 'Operation not supported for object type',
    commonCauses: [
      'Using wrong type for operation',
      'None value where object expected',
      'Missing method on custom class',
      'Incorrect data structure',
    ],
    fixes: [
      'Check and convert types',
      'Add None check',
      'Implement missing method',
      'Use correct data structure',
    ],
  },
  {
    pattern: /ImportError:\s*No module named/i,
    type: 'ImportError',
    category: 'missing-module',
    description: 'Module not installed or not found',
    commonCauses: [
      'Package not installed',
      'Virtual environment not activated',
      'Incorrect module name',
      'PYTHONPATH not set correctly',
    ],
    fixes: [
      'Install package: pip install <module>',
      'Activate virtual environment',
      'Check module name spelling',
      'Add directory to PYTHONPATH',
    ],
  },
  {
    pattern: /IndentationError:/i,
    type: 'IndentationError',
    category: 'indentation',
    description: 'Incorrect Python indentation',
    commonCauses: [
      'Mixed tabs and spaces',
      'Inconsistent indentation level',
      'Missing indentation after :',
      'Copy-pasted code with wrong indent',
    ],
    fixes: [
      'Convert all tabs to spaces (or vice versa)',
      'Use consistent 4-space indentation',
      'Add proper indentation after colons',
      'Re-indent pasted code',
    ],
  },

  // ========== DATABASE ERRORS ==========
  {
    pattern: /error:\s*relation\s+"[\w]+"\s+does not exist/i,
    type: 'DatabaseError',
    category: 'missing-table',
    description: 'Database table does not exist',
    commonCauses: [
      'Migrations not run',
      'Wrong database selected',
      'Table name case sensitivity',
      'Schema not created',
    ],
    fixes: [
      'Run database migrations',
      'Check database connection string',
      'Use correct table name case',
      'Create schema or run setup',
    ],
  },
  {
    pattern: /duplicate key value violates unique constraint/i,
    type: 'DatabaseError',
    category: 'unique-violation',
    description: 'Trying to insert duplicate unique value',
    commonCauses: [
      'Inserting existing ID',
      'Duplicate email or username',
      'Retry creating same record',
      'Seed data conflict',
    ],
    fixes: [
      'Check before insert or use upsert',
      'Validate uniqueness in application',
      'Use unique ID generator',
      'Clear or update existing data',
    ],
  },

  // ========== NETWORK ERRORS ==========
  {
    pattern: /(?:CORS|Access-Control-Allow-Origin)/i,
    type: 'CORSError',
    category: 'cors',
    description: 'Cross-Origin Resource Sharing blocked',
    commonCauses: [
      'Server missing CORS headers',
      'Incorrect origin configured',
      'Preflight request failing',
      'Credentials mode mismatch',
    ],
    fixes: [
      'Add CORS middleware to server',
      'Configure allowed origins',
      'Handle OPTIONS preflight',
      'Match credentials settings',
    ],
  },
  {
    pattern: /fetch failed|ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i,
    type: 'NetworkError',
    category: 'connection',
    description: 'Network connection failed',
    commonCauses: [
      'Server not running',
      'Wrong URL or port',
      'Firewall blocking connection',
      'DNS resolution failed',
      'Network timeout',
    ],
    fixes: [
      'Verify server is running',
      'Check URL and port',
      'Configure firewall rules',
      'Check DNS settings',
      'Increase timeout value',
    ],
  },
];

// ============================================
// STACK TRACE PARSER
// ============================================

export function parseStackTrace(errorText: string): ParsedError {
  const lines = errorText.split('\n');
  const firstLine = lines[0] || '';

  // Extract error type and message
  const typeMatch = firstLine.match(/^(\w+Error|\w+Exception|Error):\s*(.+)/);
  const type = typeMatch?.[1] || 'Error';
  const message = typeMatch?.[2] || firstLine;

  // Extract file and line from error message
  const locationMatch = errorText.match(/(?:at\s+)?(?:[\w/.]+)[:(](\d+)(?::(\d+))?/);
  const line = locationMatch ? parseInt(locationMatch[1]) : undefined;
  const column = locationMatch && locationMatch[2] ? parseInt(locationMatch[2]) : undefined;

  // Parse stack frames
  const stack: StackFrame[] = [];
  const framePatterns = [
    // JavaScript/Node.js: at functionName (file:line:col) or at file:line:col
    /^\s*at\s+(?:(.+?)\s+\()?([^():]+):(\d+)(?::(\d+))?\)?$/,
    // Python: File "path", line X, in function
    /^\s*File\s+"([^"]+)",\s+line\s+(\d+),\s+in\s+(\w+)/,
    // Go: file.go:line +offset
    /^\s*([^\s]+\.go):(\d+)\s+\+?/,
    // Rust: at file.rs:line:col
    /^\s*at\s+([^:]+):(\d+):(\d+)/,
  ];

  for (const line of lines.slice(1)) {
    for (const pattern of framePatterns) {
      const match = line.match(pattern);
      if (match) {
        const isNode = pattern.source.includes('at');
        const frame: StackFrame = isNode ? {
          function: match[1] || '<anonymous>',
          file: match[2],
          line: parseInt(match[3]),
          column: match[4] ? parseInt(match[4]) : undefined,
          isInternal: match[2].includes('node_modules') || match[2].includes('internal/'),
        } : {
          function: match[3] || '<module>',
          file: match[1],
          line: parseInt(match[2]),
          isInternal: match[1].includes('site-packages') || match[1].includes('/usr/'),
        };

        stack.push(frame);
        break;
      }
    }
  }

  // Find file from stack
  const userFrame = stack.find(f => !f.isInternal);
  const file = userFrame?.file;

  return {
    type,
    message,
    file,
    line: userFrame?.line || line,
    column: userFrame?.column || column,
    stack,
    originalText: errorText,
  };
}

// ============================================
// ROOT CAUSE ANALYZER
// ============================================

export function analyzeRootCause(error: ParsedError, code?: string): RootCause {
  // Match against known patterns
  for (const pattern of ERROR_PATTERNS) {
    if (pattern.pattern.test(error.originalText)) {
      return {
        category: pattern.category,
        description: pattern.description,
        likelihood: 0.85,
        evidence: [error.message],
        relatedPatterns: pattern.commonCauses,
      };
    }
  }

  // Generic analysis based on error type
  const typeAnalysis: Record<string, RootCause> = {
    TypeError: {
      category: 'type-error',
      description: 'Type mismatch or undefined access',
      likelihood: 0.7,
      evidence: [error.message],
      relatedPatterns: ['Check variable types', 'Add null checks'],
    },
    SyntaxError: {
      category: 'syntax',
      description: 'Invalid code syntax',
      likelihood: 0.9,
      evidence: [error.message],
      relatedPatterns: ['Check brackets', 'Verify string quotes', 'Check semicolons'],
    },
    ReferenceError: {
      category: 'reference',
      description: 'Undefined variable or function',
      likelihood: 0.8,
      evidence: [error.message],
      relatedPatterns: ['Check imports', 'Verify variable declaration', 'Check scope'],
    },
  };

  return typeAnalysis[error.type] || {
    category: 'unknown',
    description: `${error.type}: ${error.message}`,
    likelihood: 0.5,
    evidence: [error.message],
    relatedPatterns: ['Review error message', 'Check recent changes', 'Search for similar issues'],
  };
}

// ============================================
// FIX CHAIN GENERATOR
// ============================================

export function generateFixChain(error: ParsedError, rootCause: RootCause, code?: string): FixStep[] {
  const steps: FixStep[] = [];

  // Find matching pattern
  const matchedPattern = ERROR_PATTERNS.find(p => p.pattern.test(error.originalText));

  if (matchedPattern) {
    // Generate steps from pattern fixes
    matchedPattern.fixes.forEach((fix, index) => {
      steps.push({
        order: index + 1,
        action: getActionFromFix(fix),
        description: fix,
        automated: isAutomatable(fix),
      });
    });
  }

  // Add generic debugging steps
  if (error.file && error.line) {
    steps.unshift({
      order: 0,
      action: 'locate',
      description: `Go to ${error.file} line ${error.line}`,
      file: error.file,
      line: error.line,
      automated: true,
    });
  }

  // Add verification step
  steps.push({
    order: steps.length + 1,
    action: 'verify',
    description: 'Run the code again to verify the fix',
    automated: true,
  });

  return steps;
}

function getActionFromFix(fix: string): string {
  if (fix.includes('Add') || fix.includes('Install')) return 'add';
  if (fix.includes('Remove') || fix.includes('Delete')) return 'remove';
  if (fix.includes('Check') || fix.includes('Verify')) return 'check';
  if (fix.includes('Change') || fix.includes('Convert') || fix.includes('Fix')) return 'modify';
  return 'review';
}

function isAutomatable(fix: string): boolean {
  const automatableKeywords = ['Add null check', 'Add optional chaining', 'Add catch', 'Add import', 'Add type'];
  return automatableKeywords.some(kw => fix.includes(kw));
}

// ============================================
// VARIABLE TRACKER
// ============================================

export function trackVariables(code: string, errorLine?: number): VariableTrace[] {
  const traces: VariableTrace[] = [];
  const lines = code.split('\n');

  // Track variable declarations and usages
  const varPatterns = [
    { pattern: /(?:const|let|var)\s+(\w+)\s*(?::\s*[\w<>[\]|]+)?\s*=/, type: 'declaration' },
    { pattern: /(\w+)\s*=(?!=)/, type: 'assignment' },
    { pattern: /\b(\w+)\b(?!\s*[=:(])/, type: 'usage' },
  ];

  const variableMap = new Map<string, { assignments: number[], usages: number[], type: string }>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Check for declarations
    const declMatch = line.match(/(?:const|let|var)\s+(\w+)\s*(?::\s*([\w<>[\]|]+))?\s*=/);
    if (declMatch) {
      const varName = declMatch[1];
      const varType = declMatch[2] || 'inferred';

      if (!variableMap.has(varName)) {
        variableMap.set(varName, { assignments: [], usages: [], type: varType });
      }
      variableMap.get(varName)!.assignments.push(lineNum);
    }

    // Check for usages
    const words = line.match(/\b[a-zA-Z_]\w*\b/g) || [];
    for (const word of words) {
      if (variableMap.has(word)) {
        const data = variableMap.get(word)!;
        if (!data.assignments.includes(lineNum)) {
          data.usages.push(lineNum);
        }
      }
    }
  }

  // Convert to traces
  for (const [name, data] of variableMap) {
    const lastAssignment = data.assignments[data.assignments.length - 1];
    const usedBeforeAssigned = data.usages.some(u => u < (data.assignments[0] || Infinity));
    const usedNearError = errorLine ? data.usages.some(u => Math.abs(u - errorLine) <= 3) : false;

    traces.push({
      name,
      type: data.type,
      lastAssignment,
      usages: data.usages,
      suspicious: usedBeforeAssigned || (errorLine !== undefined && usedNearError),
      reason: usedBeforeAssigned ? 'Used before assignment' :
              usedNearError ? 'Used near error location' : undefined,
    });
  }

  return traces.filter(t => t.suspicious || t.usages.length > 0).slice(0, 20);
}

// ============================================
// MAIN DEBUG ANALYZER
// ============================================

export function analyzeError(
  errorText: string,
  code?: string,
  context?: Partial<DebugContext>
): DebugAnalysis {
  // Parse the error
  const error = parseStackTrace(errorText);

  // Analyze root cause
  const rootCause = analyzeRootCause(error, code);

  // Generate fix chain
  const fixChain = generateFixChain(error, rootCause, code);

  // Track variables if code provided
  const variables = code ? trackVariables(code, error.line) : [];

  // Build context
  const debugContext: DebugContext = {
    runtime: detectRuntime(errorText),
    framework: context?.framework,
    environment: context?.environment || 'development',
    dependencies: context?.dependencies || [],
    recentChanges: context?.recentChanges,
  };

  // Generate suggestions
  const suggestions = generateDebugSuggestions(error, rootCause, variables);

  // Calculate confidence
  const confidence = calculateConfidence(error, rootCause, variables);

  return {
    error,
    rootCause,
    fixChain,
    variables,
    context: debugContext,
    suggestions,
    confidence,
  };
}

function detectRuntime(errorText: string): string {
  if (errorText.includes('node_modules') || errorText.includes('at Object.')) return 'Node.js';
  if (errorText.includes('File "') && errorText.includes('.py')) return 'Python';
  if (errorText.includes('.go:')) return 'Go';
  if (errorText.includes('.rs:')) return 'Rust';
  if (errorText.includes('.java:')) return 'Java';
  if (errorText.includes('at ') && errorText.includes(':')) return 'JavaScript';
  return 'Unknown';
}

function generateDebugSuggestions(error: ParsedError, rootCause: RootCause, variables: VariableTrace[]): string[] {
  const suggestions: string[] = [];

  // Add root cause related suggestions
  suggestions.push(...rootCause.relatedPatterns.slice(0, 3));

  // Add variable related suggestions
  const suspiciousVars = variables.filter(v => v.suspicious);
  if (suspiciousVars.length > 0) {
    suggestions.push(`Check variable: ${suspiciousVars[0].name} (${suspiciousVars[0].reason})`);
  }

  // Add stack-based suggestions
  if (error.stack.length > 10) {
    suggestions.push('Deep call stack detected - consider breaking up function calls');
  }

  // Add file-based suggestions
  if (error.file && error.line) {
    suggestions.push(`Add console.log/debugger at ${error.file}:${error.line}`);
  }

  return [...new Set(suggestions)].slice(0, 5);
}

function calculateConfidence(error: ParsedError, rootCause: RootCause, variables: VariableTrace[]): number {
  let confidence = rootCause.likelihood;

  // Increase if we have good stack trace
  if (error.stack.length > 0) {
    confidence += 0.05;
  }

  // Increase if we found suspicious variables
  if (variables.some(v => v.suspicious)) {
    confidence += 0.05;
  }

  // Cap at 0.95
  return Math.min(confidence, 0.95);
}

// ============================================
// FORMAT AS MARKDOWN
// ============================================

export function formatDebugAnalysisAsMarkdown(analysis: DebugAnalysis): string {
  const lines = [
    '## Debug Analysis',
    '',
    `### Error: ${analysis.error.type}`,
    `**Message**: ${analysis.error.message}`,
    '',
  ];

  if (analysis.error.file) {
    lines.push(`**Location**: ${analysis.error.file}:${analysis.error.line || '?'}`);
    lines.push('');
  }

  lines.push(`### Root Cause (${Math.round(analysis.confidence * 100)}% confidence)`);
  lines.push(`**Category**: ${analysis.rootCause.category}`);
  lines.push(`**Description**: ${analysis.rootCause.description}`);
  lines.push('');

  if (analysis.rootCause.relatedPatterns.length > 0) {
    lines.push('**Possible Causes**:');
    for (const cause of analysis.rootCause.relatedPatterns.slice(0, 3)) {
      lines.push(`- ${cause}`);
    }
    lines.push('');
  }

  if (analysis.fixChain.length > 0) {
    lines.push('### Fix Steps');
    for (const step of analysis.fixChain) {
      const auto = step.automated ? ' ⚡' : '';
      lines.push(`${step.order}. **${step.action}**: ${step.description}${auto}`);
      if (step.code) {
        lines.push('   ```');
        lines.push(`   ${step.code}`);
        lines.push('   ```');
      }
    }
    lines.push('');
  }

  if (analysis.variables.filter(v => v.suspicious).length > 0) {
    lines.push('### Suspicious Variables');
    for (const v of analysis.variables.filter(v => v.suspicious)) {
      lines.push(`- \`${v.name}\`: ${v.reason}`);
    }
    lines.push('');
  }

  if (analysis.error.stack.length > 0) {
    lines.push('### Stack Trace');
    lines.push('```');
    for (const frame of analysis.error.stack.slice(0, 5)) {
      const internal = frame.isInternal ? ' (internal)' : '';
      lines.push(`  at ${frame.function} (${frame.file}:${frame.line})${internal}`);
    }
    if (analysis.error.stack.length > 5) {
      lines.push(`  ... ${analysis.error.stack.length - 5} more frames`);
    }
    lines.push('```');
  }

  return lines.join('\n');
}
