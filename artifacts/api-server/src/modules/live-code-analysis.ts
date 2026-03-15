// Live Code Analysis Module - Error detection, auto-fix suggestions, and real-time code analysis
// This gives AutoCoder the ability to iterate on code like Claude

export interface CodeAnalysisResult {
  language: string;
  errors: CodeError[];
  warnings: CodeWarning[];
  suggestions: CodeSuggestion[];
  complexity: ComplexityAnalysis;
  dependencies: DependencyInfo[];
}

export interface CodeError {
  line: number;
  column?: number;
  message: string;
  type: 'syntax' | 'runtime' | 'type' | 'logic';
  severity: 'error' | 'fatal';
  fix?: AutoFix;
}

export interface CodeWarning {
  line: number;
  message: string;
  type: 'performance' | 'security' | 'style' | 'deprecated';
  fix?: AutoFix;
}

export interface CodeSuggestion {
  message: string;
  type: 'refactor' | 'optimize' | 'best-practice' | 'accessibility';
  priority: 'low' | 'medium' | 'high';
}

export interface AutoFix {
  description: string;
  before: string;
  after: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface ComplexityAnalysis {
  linesOfCode: number;
  cyclomaticComplexity: number;
  maintainabilityIndex: number;
  rating: 'simple' | 'moderate' | 'complex' | 'very_complex';
}

export interface DependencyInfo {
  name: string;
  version?: string;
  type: 'import' | 'require' | 'cdn';
  isExternal: boolean;
}

// Common error patterns with fixes
const ERROR_PATTERNS: { pattern: RegExp; type: CodeError['type']; getMessage: (m: RegExpMatchArray) => string; getFix?: (m: RegExpMatchArray, code: string) => AutoFix }[] = [
  {
    pattern: /(\w+)\s+is\s+not\s+defined/i,
    type: 'runtime',
    getMessage: (m) => `'${m[1]}' is not defined`,
    getFix: (m) => ({
      description: `Define '${m[1]}' before using it`,
      before: m[1],
      after: `const ${m[1]} = undefined; // TODO: initialize`,
      confidence: 'medium',
    }),
  },
  {
    pattern: /Unexpected token '?(\w+)'?/i,
    type: 'syntax',
    getMessage: (m) => `Unexpected token '${m[1]}'`,
  },
  {
    pattern: /Cannot read propert(y|ies) of (null|undefined)/i,
    type: 'runtime',
    getMessage: () => 'Attempting to access property of null/undefined',
    getFix: () => ({
      description: 'Add null check before accessing property',
      before: 'obj.property',
      after: 'obj?.property',
      confidence: 'high',
    }),
  },
  {
    pattern: /missing.*semicolon/i,
    type: 'syntax',
    getMessage: () => 'Missing semicolon',
    getFix: () => ({
      description: 'Add missing semicolon',
      before: 'statement',
      after: 'statement;',
      confidence: 'high',
    }),
  },
  {
    pattern: /Unexpected end of (input|JSON)/i,
    type: 'syntax',
    getMessage: () => 'Unexpected end of input - likely missing closing bracket or quote',
  },
];

// Warning patterns
const WARNING_PATTERNS: { pattern: RegExp; type: CodeWarning['type']; message: string; fix?: AutoFix }[] = [
  {
    pattern: /eval\s*\(/,
    type: 'security',
    message: 'Avoid using eval() - security risk',
    fix: {
      description: 'Use safer alternatives like JSON.parse() for data',
      before: "eval('code')",
      after: "JSON.parse(jsonString) // or Function constructor",
      confidence: 'high',
    },
  },
  {
    pattern: /innerHTML\s*=/,
    type: 'security',
    message: 'innerHTML can lead to XSS vulnerabilities',
    fix: {
      description: 'Use textContent for text, or sanitize HTML input',
      before: "element.innerHTML = userInput",
      after: "element.textContent = userInput // or use DOMPurify",
      confidence: 'medium',
    },
  },
  {
    pattern: /document\.write/,
    type: 'deprecated',
    message: 'document.write is deprecated and can cause issues',
    fix: {
      description: 'Use DOM manipulation methods instead',
      before: "document.write('<div>content</div>')",
      after: "document.body.insertAdjacentHTML('beforeend', '<div>content</div>')",
      confidence: 'high',
    },
  },
  {
    pattern: /var\s+\w+\s*=/,
    type: 'style',
    message: 'Use const or let instead of var',
    fix: {
      description: 'Replace var with const (if not reassigned) or let',
      before: 'var x = 1',
      after: 'const x = 1',
      confidence: 'high',
    },
  },
  {
    pattern: /==(?!=)/,
    type: 'style',
    message: 'Use === instead of == for strict equality',
    fix: {
      description: 'Use strict equality to avoid type coercion',
      before: 'a == b',
      after: 'a === b',
      confidence: 'high',
    },
  },
  {
    pattern: /console\.(log|warn|error)/,
    type: 'style',
    message: 'Consider removing console statements in production',
  },
  {
    pattern: /TODO|FIXME|HACK/i,
    type: 'style',
    message: 'Contains TODO/FIXME comments that should be addressed',
  },
];

// Analyze code for errors, warnings, and suggestions
export function analyzeCode(code: string, language: string = 'javascript'): CodeAnalysisResult {
  const errors: CodeError[] = [];
  const warnings: CodeWarning[] = [];
  const suggestions: CodeSuggestion[] = [];

  const lines = code.split('\n');

  // Check for syntax errors
  if (language === 'javascript' || language === 'typescript') {
    // Check bracket balance
    const brackets = { '(': 0, '[': 0, '{': 0 };
    const bracketPairs: Record<string, keyof typeof brackets> = { ')': '(', ']': '[', '}': '{' };

    lines.forEach((line, i) => {
      for (const char of line) {
        if (char in brackets) brackets[char as keyof typeof brackets]++;
        if (char in bracketPairs) brackets[bracketPairs[char]]--;
      }
    });

    if (brackets['('] !== 0) {
      errors.push({
        line: lines.length,
        message: `Unbalanced parentheses: ${brackets['('] > 0 ? 'missing )' : 'extra )'}`,
        type: 'syntax',
        severity: 'error',
      });
    }
    if (brackets['['] !== 0) {
      errors.push({
        line: lines.length,
        message: `Unbalanced brackets: ${brackets['['] > 0 ? 'missing ]' : 'extra ]'}`,
        type: 'syntax',
        severity: 'error',
      });
    }
    if (brackets['{'] !== 0) {
      errors.push({
        line: lines.length,
        message: `Unbalanced braces: ${brackets['{'] > 0 ? 'missing }' : 'extra }'}`,
        type: 'syntax',
        severity: 'error',
      });
    }

    // Check for warning patterns
    lines.forEach((line, i) => {
      for (const { pattern, type, message, fix } of WARNING_PATTERNS) {
        if (pattern.test(line)) {
          warnings.push({ line: i + 1, message, type, fix });
        }
      }
    });
  }

  // Extract dependencies
  const dependencies = extractDependencies(code, language);

  // Calculate complexity
  const complexity = calculateComplexity(code);

  // Generate suggestions based on analysis
  if (complexity.cyclomaticComplexity > 10) {
    suggestions.push({
      message: 'Consider breaking this code into smaller functions',
      type: 'refactor',
      priority: 'high',
    });
  }

  if (code.length > 500 && !code.includes('// ') && !code.includes('/* ')) {
    suggestions.push({
      message: 'Consider adding comments to explain complex logic',
      type: 'best-practice',
      priority: 'medium',
    });
  }

  if (language === 'javascript' && !code.includes("'use strict'") && !code.includes('"use strict"')) {
    suggestions.push({
      message: "Consider adding 'use strict' or using ES modules",
      type: 'best-practice',
      priority: 'low',
    });
  }

  // Accessibility suggestions for HTML
  if (language === 'html') {
    if (code.includes('<img') && !code.includes('alt=')) {
      suggestions.push({
        message: 'Add alt attributes to images for accessibility',
        type: 'accessibility',
        priority: 'high',
      });
    }
    if (code.includes('<button') && !code.includes('aria-')) {
      suggestions.push({
        message: 'Consider adding ARIA labels to buttons',
        type: 'accessibility',
        priority: 'medium',
      });
    }
  }

  return {
    language,
    errors,
    warnings,
    suggestions,
    complexity,
    dependencies,
  };
}

// Extract import/require statements
function extractDependencies(code: string, language: string): DependencyInfo[] {
  const deps: DependencyInfo[] = [];

  // ES6 imports
  const importRegex = /import\s+(?:(?:\{[^}]+\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    deps.push({
      name: match[1],
      type: 'import',
      isExternal: !match[1].startsWith('.') && !match[1].startsWith('/'),
    });
  }

  // CommonJS require
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = requireRegex.exec(code)) !== null) {
    deps.push({
      name: match[1],
      type: 'require',
      isExternal: !match[1].startsWith('.') && !match[1].startsWith('/'),
    });
  }

  // CDN scripts
  const cdnRegex = /<script[^>]+src=['"]([^'"]+)['"]/gi;
  while ((match = cdnRegex.exec(code)) !== null) {
    if (match[1].startsWith('http')) {
      deps.push({
        name: match[1],
        type: 'cdn',
        isExternal: true,
      });
    }
  }

  return deps;
}

// Calculate code complexity metrics
function calculateComplexity(code: string): ComplexityAnalysis {
  const lines = code.split('\n');
  const linesOfCode = lines.filter(l => l.trim() && !l.trim().startsWith('//')).length;

  // Count decision points for cyclomatic complexity
  const decisionKeywords = /\b(if|else|for|while|switch|case|catch|&&|\|\||\?)\b/g;
  const decisions = (code.match(decisionKeywords) || []).length;
  const cyclomaticComplexity = decisions + 1;

  // Simple maintainability index (simplified version)
  // Higher is better, range roughly 0-100
  const avgLineLength = code.length / Math.max(linesOfCode, 1);
  const commentRatio = (code.match(/\/\//g) || []).length / Math.max(linesOfCode, 1);
  const maintainabilityIndex = Math.max(0, Math.min(100,
    100 - (cyclomaticComplexity * 2) - (avgLineLength / 2) + (commentRatio * 20)
  ));

  let rating: ComplexityAnalysis['rating'];
  if (cyclomaticComplexity <= 5) rating = 'simple';
  else if (cyclomaticComplexity <= 10) rating = 'moderate';
  else if (cyclomaticComplexity <= 20) rating = 'complex';
  else rating = 'very_complex';

  return {
    linesOfCode,
    cyclomaticComplexity,
    maintainabilityIndex: Math.round(maintainabilityIndex),
    rating,
  };
}

// Attempt to auto-fix common errors
export function autoFixCode(code: string, errors: CodeError[]): { code: string; fixes: string[] } {
  let fixed = code;
  const appliedFixes: string[] = [];

  for (const error of errors) {
    if (error.fix && error.fix.confidence === 'high') {
      // Try to apply the fix
      if (fixed.includes(error.fix.before)) {
        fixed = fixed.replace(error.fix.before, error.fix.after);
        appliedFixes.push(error.fix.description);
      }
    }
  }

  return { code: fixed, fixes: appliedFixes };
}

// Analyze error message and suggest fix
export function diagnoseError(errorMessage: string): {
  diagnosis: string;
  possibleCauses: string[];
  suggestedFix: string;
} {
  const lower = errorMessage.toLowerCase();

  // Common error patterns
  if (lower.includes('is not defined')) {
    const varMatch = errorMessage.match(/(\w+)\s+is\s+not\s+defined/i);
    const varName = varMatch ? varMatch[1] : 'variable';
    return {
      diagnosis: `The variable '${varName}' is used before it's declared`,
      possibleCauses: [
        'Variable declared in a different scope',
        'Typo in variable name',
        'Missing import statement',
        'Variable declared after it\'s used (hoisting issue)',
      ],
      suggestedFix: `Check if '${varName}' is spelled correctly and declared before use. If it's from a module, add the import statement.`,
    };
  }

  if (lower.includes('unexpected token')) {
    return {
      diagnosis: 'Syntax error - the code structure is invalid',
      possibleCauses: [
        'Missing or extra brackets/parentheses',
        'Missing comma in array or object',
        'Using reserved keyword as variable name',
        'Mixing ES6 and CommonJS syntax incorrectly',
      ],
      suggestedFix: 'Check the line before the error for missing punctuation. Look for unclosed brackets or strings.',
    };
  }

  if (lower.includes('cannot read') && (lower.includes('null') || lower.includes('undefined'))) {
    return {
      diagnosis: 'Trying to access a property on null or undefined value',
      possibleCauses: [
        'API call returned no data',
        'DOM element doesn\'t exist',
        'Object property not initialized',
        'Async operation not completed',
      ],
      suggestedFix: 'Add a null check before accessing the property: use optional chaining (?.) or if statement.',
    };
  }

  if (lower.includes('cors') || lower.includes('cross-origin')) {
    return {
      diagnosis: 'Cross-Origin Resource Sharing (CORS) error',
      possibleCauses: [
        'Server doesn\'t allow requests from this origin',
        'Missing CORS headers on server response',
        'Trying to access API from different domain',
      ],
      suggestedFix: 'Add CORS headers on the server, or use a proxy. For Express: app.use(cors())',
    };
  }

  if (lower.includes('network') || lower.includes('failed to fetch')) {
    return {
      diagnosis: 'Network request failed',
      possibleCauses: [
        'Server is not running',
        'Wrong API URL',
        'Network connectivity issue',
        'Request blocked by firewall or ad blocker',
      ],
      suggestedFix: 'Check if the server is running and the URL is correct. Verify network connectivity.',
    };
  }

  // Generic fallback
  return {
    diagnosis: 'An error occurred in the code',
    possibleCauses: [
      'Check the error message for specific details',
      'Look at the stack trace for the exact location',
    ],
    suggestedFix: 'Review the code around the error location and check for common issues like typos or missing dependencies.',
  };
}

// Format analysis as markdown
export function formatAnalysisAsMarkdown(analysis: CodeAnalysisResult): string {
  let md = `## Code Analysis\n\n`;

  md += `**Language:** ${analysis.language}\n`;
  md += `**Lines of Code:** ${analysis.complexity.linesOfCode}\n`;
  md += `**Complexity:** ${analysis.complexity.rating} (score: ${analysis.complexity.cyclomaticComplexity})\n`;
  md += `**Maintainability:** ${analysis.complexity.maintainabilityIndex}/100\n\n`;

  if (analysis.errors.length > 0) {
    md += `### Errors (${analysis.errors.length})\n`;
    for (const err of analysis.errors) {
      md += `- **Line ${err.line}:** ${err.message}\n`;
      if (err.fix) {
        md += `  Fix: ${err.fix.description}\n`;
      }
    }
    md += '\n';
  }

  if (analysis.warnings.length > 0) {
    md += `### Warnings (${analysis.warnings.length})\n`;
    for (const warn of analysis.warnings) {
      md += `- **Line ${warn.line}:** ${warn.message} [${warn.type}]\n`;
    }
    md += '\n';
  }

  if (analysis.suggestions.length > 0) {
    md += `### Suggestions\n`;
    for (const sug of analysis.suggestions) {
      const icon = sug.priority === 'high' ? '🔴' : sug.priority === 'medium' ? '🟡' : '🟢';
      md += `${icon} ${sug.message}\n`;
    }
    md += '\n';
  }

  if (analysis.dependencies.length > 0) {
    const external = analysis.dependencies.filter(d => d.isExternal);
    if (external.length > 0) {
      md += `### External Dependencies\n`;
      for (const dep of external) {
        md += `- ${dep.name} (${dep.type})\n`;
      }
    }
  }

  return md;
}