// Auto-Tester Module - Automatically tests and debugs generated code
// Runs generated code, captures errors, and fixes them iteratively

import { checkErrors, CodeError } from './debug-module';

export interface TestResult {
  passed: boolean;
  errors: CodeError[];
  runtimeErrors: string[];
  suggestions: string[];
  iterations: number;
  finalCode: string;
}

export interface TestConfig {
  maxIterations: number;
  autoFix: boolean;
  testTimeout: number;
  captureConsole: boolean;
}

const defaultConfig: TestConfig = {
  maxIterations: 3,
  autoFix: true,
  testTimeout: 5000,
  captureConsole: true
};

// Common fixes for detected errors
const autoFixes: Record<string, (code: string, error: CodeError) => string> = {
  // Syntax fixes
  'Missing colon': (code, error) => {
    if (error.line && error.code) {
      const lines = code.split('\n');
      if (lines[error.line - 1] && !lines[error.line - 1].trim().endsWith(':')) {
        lines[error.line - 1] = lines[error.line - 1].trimEnd() + ':';
        return lines.join('\n');
      }
    }
    return code;
  },

  'Unclosed string': (code, error) => {
    // Try to find and close unclosed strings
    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const singleQuotes = (line.match(/'/g) || []).length;
      const doubleQuotes = (line.match(/"/g) || []).length;
      const backticks = (line.match(/`/g) || []).length;

      if (singleQuotes % 2 !== 0) lines[i] += "'";
      if (doubleQuotes % 2 !== 0) lines[i] += '"';
      if (backticks % 2 !== 0) lines[i] += '`';
    }
    return lines.join('\n');
  },

  'Unclosed bracket': (code, error) => {
    // Count brackets and add missing ones
    const opens = { '(': 0, '[': 0, '{': 0 };
    const closes: Record<string, string> = { '(': ')', '[': ']', '{': '}' };

    let inString = false;
    let stringChar = '';

    for (const char of code) {
      if ((char === '"' || char === "'" || char === '`') && !inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar && inString) {
        inString = false;
      }

      if (!inString) {
        if (char in opens) opens[char as keyof typeof opens]++;
        if (char === ')') opens['(']--;
        if (char === ']') opens['[']--;
        if (char === '}') opens['{']--;
      }
    }

    // Add missing closing brackets
    let result = code;
    for (const [open, count] of Object.entries(opens)) {
      for (let i = 0; i < count; i++) {
        result += '\n' + closes[open];
      }
    }

    return result;
  },

  'innerHTML': (code, error) => {
    // Replace innerHTML with textContent where safe
    return code.replace(/\.innerHTML\s*=\s*([^;]+);/g, (match, content) => {
      // If content looks like it contains HTML tags, keep innerHTML but add comment
      if (content.includes('<') || content.includes('>')) {
        return match + ' // TODO: Sanitize this HTML';
      }
      return `.textContent = ${content};`;
    });
  },

  'eval': (code, error) => {
    // Replace eval with JSON.parse where applicable
    return code.replace(/eval\s*\(\s*(['"`])([^'"]+)\1\s*\)/g, (match, quote, content) => {
      try {
        // If it looks like JSON, use JSON.parse
        if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
          return `JSON.parse(${quote}${content}${quote})`;
        }
      } catch (e) {}
      return match + ' // WARNING: eval is dangerous';
    });
  },

  'var': (code, error) => {
    // Replace var with let/const
    return code.replace(/\bvar\s+(\w+)\s*=/g, (match, varName) => {
      // Check if variable is reassigned
      const reassigned = new RegExp(`\\b${varName}\\s*=(?!=)`, 'g');
      const matches = code.match(reassigned);
      if (matches && matches.length > 1) {
        return `let ${varName} =`;
      }
      return `const ${varName} =`;
    });
  },

  '== instead of ===': (code, error) => {
    // Replace == with === (but not !== or ===)
    return code.replace(/([^!=])={2}(?!=)/g, '$1===');
  },

  'Missing alt': (code, error) => {
    // Add alt="" to images missing alt
    return code.replace(/<img(?![^>]*alt\s*=)([^>]*)>/gi, '<img$1 alt="">');
  },

  'Missing doctype': (code, error) => {
    if (!code.trim().toLowerCase().startsWith('<!doctype')) {
      return '<!DOCTYPE html>\n' + code;
    }
    return code;
  },

  'Missing viewport': (code, error) => {
    if (code.includes('<head>') && !code.includes('viewport')) {
      return code.replace(/<head>/i, '<head>\n  <meta name="viewport" content="width=device-width, initial-scale=1">');
    }
    return code;
  },

  'console.log': (code, error) => {
    // Comment out console.log statements
    return code.replace(/(\s*)(console\.log\([^)]+\);?)/g, '$1// $2 // Removed for production');
  },

  'debugger': (code, error) => {
    // Remove debugger statements
    return code.replace(/\s*debugger\s*;?\s*/g, '\n');
  },

  // ==================== LOGIC ERROR AUTO-FIXES ====================

  'Assignment in condition': (code, error) => {
    // Fix if (x = y) to if (x === y)
    return code.replace(/if\s*\(\s*(\w+)\s*=\s*([^=][^)]+)\)/g, 'if ($1 === $2)');
  },

  'NaN comparison': (code, error) => {
    // Fix == NaN to Number.isNaN()
    return code.replace(/(\w+)\s*===?\s*NaN/g, 'Number.isNaN($1)');
  },

  'Infinite loop': (code, error) => {
    // Add break condition hint for while(true) without break
    return code.replace(/(while\s*\(\s*true\s*\)\s*\{)(?![\s\S]*break)/g,
      '$1\n    // WARNING: Add break condition to prevent infinite loop\n    if (/* condition */) break;');
  },

  'forEach with async': (code, error) => {
    // Convert forEach async to for...of
    return code.replace(/(\w+)\.forEach\s*\(\s*async\s*\(([^)]*)\)\s*=>\s*\{/g,
      'for (const $2 of $1) {\n    // Converted from forEach async');
  },

  'Closure bug': (code, error) => {
    // Replace var with let in for loops
    return code.replace(/for\s*\(\s*var\s+(\w+)/g, 'for (let $1');
  },

  'Null reference': (code, error) => {
    // Add optional chaining for common null reference patterns
    return code.replace(/(\w+)\.(\w+)\.(\w+)/g, (match, obj, prop1, prop2) => {
      // Only add optional chaining if it looks like a chain that could be null
      if (['undefined', 'null', 'length'].includes(prop2)) return match;
      return `${obj}?.${prop1}?.${prop2}`;
    });
  },

  'Missing await': (code, error) => {
    // Add await to fetch calls that are missing it
    return code.replace(/(?<!await\s+)fetch\s*\(/g, 'await fetch(');
  },

  'useEffect async': (code, error) => {
    // Fix useEffect(async ...) pattern
    return code.replace(
      /useEffect\s*\(\s*async\s*\(\s*\)\s*=>\s*\{([\s\S]*?)\}\s*,/g,
      'useEffect(() => {\n    const fetchData = async () => {$1};\n    fetchData();\n  },'
    );
  },

  'Array map async': (code, error) => {
    // Wrap async map in Promise.all
    return code.replace(
      /const\s+(\w+)\s*=\s*(\w+)\.map\s*\(\s*async/g,
      'const $1 = await Promise.all($2.map(async'
    );
  },

  'localStorage null': (code, error) => {
    // Add fallback for localStorage.getItem
    return code.replace(
      /JSON\.parse\s*\(\s*localStorage\.getItem\s*\(\s*(['"`][^'"`]+['"`])\s*\)\s*\)/g,
      'JSON.parse(localStorage.getItem($1) || "{}")'
    );
  },

  'Divide by zero': (code, error) => {
    // Add zero check for division
    return code.replace(
      /(\w+)\s*\/\s*(\w+)(?!\s*\|\|)/g,
      '($2 !== 0 ? $1 / $2 : 0)'
    );
  },

  'Missing return': (code, error) => {
    // Add return statement to arrow functions without explicit return
    return code.replace(
      /=>\s*\{\s*([^{}]+[^;{}])\s*\}/g,
      (match, body) => {
        if (body.includes('return') || body.includes(';')) return match;
        return `=> { return ${body.trim()}; }`;
      }
    );
  },

  'Empty catch': (code, error) => {
    // Add error logging to empty catch blocks
    return code.replace(
      /catch\s*\(\s*(\w+)\s*\)\s*\{\s*\}/g,
      'catch ($1) { console.error("Error:", $1.message); }'
    );
  },

  'Unused variable': (code, error) => {
    // Prefix unused variables with underscore
    if (error.code) {
      const varMatch = error.code.match(/(\w+)/);
      if (varMatch) {
        const varName = varMatch[1];
        // Only add underscore if not already prefixed
        if (!varName.startsWith('_')) {
          return code.replace(new RegExp(`\\b${varName}\\b`, 'g'), `_${varName}`);
        }
      }
    }
    return code;
  },

  'String concatenation': (code, error) => {
    // Convert string concatenation to template literals
    return code.replace(
      /(['"])([^'"]*)\1\s*\+\s*(\w+)\s*\+\s*(['"])([^'"]*)\4/g,
      '`$2${$3}$5`'
    );
  },

  'Double negative': (code, error) => {
    // Simplify double negatives
    return code.replace(/!\s*!\s*/g, '');
  },

  'Missing type check': (code, error) => {
    // Add type check before array operations
    return code.replace(
      /(\w+)\.forEach\s*\(/g,
      '(Array.isArray($1) ? $1 : []).forEach('
    );
  }
};

// Test executor class
export class AutoTester {
  private config: TestConfig;
  private testFrame: HTMLIFrameElement | null = null;

  constructor(config: Partial<TestConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  // Main test function - tests code and optionally fixes errors
  async testAndFix(code: string, language: string = 'html'): Promise<TestResult> {
    let currentCode = code;
    let allErrors: CodeError[] = [];
    let runtimeErrors: string[] = [];
    let iteration = 0;

    while (iteration < this.config.maxIterations) {
      iteration++;

      // Step 1: Static analysis
      const staticErrors = checkErrors(currentCode);
      allErrors = staticErrors;

      // Step 2: Runtime test (for HTML/JS)
      if (language === 'html' || language === 'javascript') {
        const runtime = await this.executeCode(currentCode);
        runtimeErrors = runtime.errors;

        // Convert runtime errors to CodeError format
        for (const err of runtime.errors) {
          allErrors.push({
            type: 'runtime',
            severity: 'error',
            language,
            message: err,
            code: err,
            suggestion: this.getSuggestionForRuntimeError(err),
            confidence: 0.9
          });
        }
      }

      // If no errors, we're done!
      if (allErrors.length === 0 && runtimeErrors.length === 0) {
        return {
          passed: true,
          errors: [],
          runtimeErrors: [],
          suggestions: ['Code passed all tests!'],
          iterations: iteration,
          finalCode: currentCode
        };
      }

      // Step 3: Auto-fix if enabled
      if (this.config.autoFix && iteration < this.config.maxIterations) {
        const fixedCode = this.applyFixes(currentCode, allErrors);

        // If no changes made, stop iterating
        if (fixedCode === currentCode) {
          break;
        }

        currentCode = fixedCode;
      } else {
        break;
      }
    }

    // Return final result
    return {
      passed: allErrors.filter(e => e.severity === 'error').length === 0,
      errors: allErrors,
      runtimeErrors,
      suggestions: this.generateSuggestions(allErrors),
      iterations: iteration,
      finalCode: currentCode
    };
  }

  // Execute code in a sandboxed iframe
  private async executeCode(code: string): Promise<{ errors: string[]; logs: string[] }> {
    return new Promise((resolve) => {
      const errors: string[] = [];
      const logs: string[] = [];

      // Create test iframe
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.sandbox.add('allow-scripts');
      document.body.appendChild(iframe);

      // Set up message listener for errors
      const messageHandler = (event: MessageEvent) => {
        if (event.data?.type === 'test-error') {
          errors.push(event.data.message);
        } else if (event.data?.type === 'test-log') {
          logs.push(event.data.message);
        }
      };

      window.addEventListener('message', messageHandler);

      // Inject error-catching wrapper
      const wrappedCode = this.wrapCodeForTesting(code);

      try {
        const doc = iframe.contentDocument;
        if (doc) {
          doc.open();
          doc.write(wrappedCode);
          doc.close();
        }
      } catch (e) {
        errors.push(String(e));
      }

      // Wait for execution and errors
      setTimeout(() => {
        window.removeEventListener('message', messageHandler);
        document.body.removeChild(iframe);
        resolve({ errors, logs });
      }, this.config.testTimeout);
    });
  }

  // Wrap code with error catching
  private wrapCodeForTesting(code: string): string {
    const errorCatcher = `
      <script>
        window.onerror = function(msg, url, line, col, error) {
          parent.postMessage({ type: 'test-error', message: msg + ' at line ' + line }, '*');
          return true;
        };
        window.onunhandledrejection = function(e) {
          parent.postMessage({ type: 'test-error', message: 'Unhandled promise: ' + e.reason }, '*');
        };
        const origConsoleError = console.error;
        console.error = function(...args) {
          parent.postMessage({ type: 'test-error', message: args.join(' ') }, '*');
          origConsoleError.apply(console, args);
        };
        const origConsoleLog = console.log;
        console.log = function(...args) {
          parent.postMessage({ type: 'test-log', message: args.join(' ') }, '*');
          origConsoleLog.apply(console, args);
        };
        // Catch fetch errors
        const origFetch = window.fetch;
        window.fetch = async function(...args) {
          try {
            const response = await origFetch.apply(this, args);
            if (!response.ok) {
              parent.postMessage({ type: 'test-error', message: 'Fetch failed: ' + response.status + ' ' + args[0] }, '*');
            }
            return response;
          } catch (e) {
            parent.postMessage({ type: 'test-error', message: 'Fetch error: ' + e.message }, '*');
            throw e;
          }
        };
        // Signal test start
        parent.postMessage({ type: 'test-start' }, '*');
      </script>
    `;

    // Insert error catcher after <head> or at start
    if (code.includes('<head>')) {
      return code.replace('<head>', '<head>' + errorCatcher);
    } else if (code.includes('<html>')) {
      return code.replace('<html>', '<html><head>' + errorCatcher + '</head>');
    } else {
      return errorCatcher + code;
    }
  }

  // Apply automatic fixes
  private applyFixes(code: string, errors: CodeError[]): string {
    let fixedCode = code;

    for (const error of errors) {
      // Find matching fix
      for (const [pattern, fixFn] of Object.entries(autoFixes)) {
        if (error.message.toLowerCase().includes(pattern.toLowerCase())) {
          const before = fixedCode;
          fixedCode = fixFn(fixedCode, error);

          if (fixedCode !== before) {
            console.log(`Auto-fixed: ${pattern}`);
          }
          break;
        }
      }
    }

    return fixedCode;
  }

  // Get suggestion for runtime error
  private getSuggestionForRuntimeError(error: string): string {
    const suggestions: Record<string, string> = {
      'undefined': 'Check if variable is defined before use',
      'null': 'Add null check before accessing properties',
      'not a function': 'Verify the value is callable',
      'fetch failed': 'Check URL and server availability',
      'cors': 'Add CORS headers to server or use proxy',
      'syntaxerror': 'Check for missing brackets or quotes',
      'referenceerror': 'Ensure variable is declared',
      'typeerror': 'Check data types match expected',
      'networkerror': 'Check network connectivity',
    };

    const lowerError = error.toLowerCase();
    for (const [key, suggestion] of Object.entries(suggestions)) {
      if (lowerError.includes(key)) {
        return suggestion;
      }
    }

    return 'Review the error message and fix accordingly';
  }

  // Generate helpful suggestions from errors
  private generateSuggestions(errors: CodeError[]): string[] {
    const suggestions: string[] = [];
    const seen = new Set<string>();

    for (const error of errors) {
      if (error.suggestion && !seen.has(error.suggestion)) {
        suggestions.push(error.suggestion);
        seen.add(error.suggestion);
      }
    }

    if (suggestions.length === 0 && errors.length > 0) {
      suggestions.push('Review the detected errors and fix them manually');
    }

    return suggestions;
  }

  // Quick validation without full test
  quickValidate(code: string): { valid: boolean; issues: string[] } {
    const errors = checkErrors(code);
    const criticalErrors = errors.filter(e => e.severity === 'error');

    return {
      valid: criticalErrors.length === 0,
      issues: criticalErrors.map(e => e.message)
    };
  }
}

// Singleton instance
let autoTester: AutoTester | null = null;

export function getAutoTester(): AutoTester {
  if (!autoTester) {
    autoTester = new AutoTester();
  }
  return autoTester;
}

// Quick test function
export async function testCode(code: string, language?: string): Promise<TestResult> {
  return getAutoTester().testAndFix(code, language);
}

// Quick validation
export function validateCode(code: string): { valid: boolean; issues: string[] } {
  return getAutoTester().quickValidate(code);
}

// Generate self-testing report
export function generateTestReport(result: TestResult): string {
  let report = `## 🧪 Auto-Test Report\n\n`;

  if (result.passed) {
    report += `✅ **All tests passed!** (${result.iterations} iteration${result.iterations > 1 ? 's' : ''})\n\n`;
  } else {
    report += `❌ **Tests failed** after ${result.iterations} iteration${result.iterations > 1 ? 's' : ''}\n\n`;
  }

  if (result.errors.length > 0) {
    report += `### Issues Found (${result.errors.length})\n`;

    const grouped = new Map<string, CodeError[]>();
    for (const err of result.errors) {
      const key = err.type;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(err);
    }

    for (const [type, errs] of Array.from(grouped)) {
      report += `\n**${type.toUpperCase()}**\n`;
      for (const err of errs.slice(0, 3)) {
        report += `- ${err.message}`;
        if (err.line) report += ` (line ${err.line})`;
        report += '\n';
      }
      if (errs.length > 3) {
        report += `- _...and ${errs.length - 3} more_\n`;
      }
    }
  }

  if (result.runtimeErrors.length > 0) {
    report += `\n### Runtime Errors\n`;
    for (const err of result.runtimeErrors.slice(0, 5)) {
      report += `- ${err}\n`;
    }
  }

  if (result.suggestions.length > 0) {
    report += `\n### Suggestions\n`;
    for (const sug of result.suggestions.slice(0, 5)) {
      report += `💡 ${sug}\n`;
    }
  }

  return report;
}