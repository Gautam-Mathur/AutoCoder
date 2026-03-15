// Code Formatter - Format code with consistent style (Prettier-like)

export interface FormatOptions {
  printWidth?: number;
  tabWidth?: number;
  useTabs?: boolean;
  semi?: boolean;
  singleQuote?: boolean;
  trailingComma?: 'none' | 'es5' | 'all';
  bracketSpacing?: boolean;
  arrowParens?: 'avoid' | 'always';
  endOfLine?: 'lf' | 'crlf' | 'auto';
}

const defaultOptions: FormatOptions = {
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  trailingComma: 'es5',
  bracketSpacing: true,
  arrowParens: 'avoid',
  endOfLine: 'lf'
};

// Simple JavaScript/TypeScript formatter
export function formatJavaScript(code: string, options: FormatOptions = {}): string {
  const opts = { ...defaultOptions, ...options };
  let result = code;

  // Normalize line endings
  result = result.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Fix spacing around operators
  result = result.replace(/\s*([+\-*/%=<>!&|^~?:])\s*/g, ' $1 ');
  result = result.replace(/\s+([+\-*/%])\s*=\s*/g, ' $1= ');
  result = result.replace(/\s*!\s*=\s*/g, ' != ');
  result = result.replace(/\s*=\s*=\s*/g, ' == ');
  result = result.replace(/\s*=\s*=\s*=\s*/g, ' === ');
  result = result.replace(/\s*!\s*=\s*=\s*/g, ' !== ');
  result = result.replace(/\s*<\s*=\s*/g, ' <= ');
  result = result.replace(/\s*>\s*=\s*/g, ' >= ');
  result = result.replace(/\s*&\s*&\s*/g, ' && ');
  result = result.replace(/\s*\|\s*\|\s*/g, ' || ');
  result = result.replace(/\s*=\s*>\s*/g, ' => ');

  // Fix unary operators
  result = result.replace(/!\s+/g, '!');
  result = result.replace(/\s+-\s*-/g, '--');
  result = result.replace(/\s+\+\s*\+/g, '++');

  // Fix colons in objects/types
  result = result.replace(/:\s+/g, ': ');

  // Fix semicolons
  if (opts.semi) {
    // Add semicolons after statements (simplified)
    result = result.replace(/([^;{}\s])(\n)/g, '$1;$2');
    // Don't add after certain keywords
    result = result.replace(/(if|else|for|while|function|class|interface|type);/g, '$1');
    result = result.replace(/\{;/g, '{');
    result = result.replace(/};+/g, '}');
  } else {
    // Remove semicolons
    result = result.replace(/;(\s*\n)/g, '$1');
  }

  // Fix quotes
  if (opts.singleQuote) {
    result = result.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match, content) => {
      if (content.includes("'")) return match;
      return `'${content}'`;
    });
  } else {
    result = result.replace(/'([^'\\]*(\\.[^'\\]*)*)'/g, (match, content) => {
      if (content.includes('"')) return match;
      return `"${content}"`;
    });
  }

  // Fix bracket spacing
  if (opts.bracketSpacing) {
    result = result.replace(/\{\s*/g, '{ ');
    result = result.replace(/\s*\}/g, ' }');
    result = result.replace(/\{\s*\}/g, '{}');
  } else {
    result = result.replace(/\{\s+/g, '{');
    result = result.replace(/\s+\}/g, '}');
  }

  // Fix arrow function parens
  if (opts.arrowParens === 'avoid') {
    result = result.replace(/\((\w+)\)\s*=>/g, '$1 =>');
  } else {
    result = result.replace(/(\s|^)(\w+)\s*=>/g, '$1($2) =>');
  }

  // Fix trailing commas
  if (opts.trailingComma === 'none') {
    result = result.replace(/,(\s*[}\]])/g, '$1');
  }

  // Fix indentation
  const indent = opts.useTabs ? '\t' : ' '.repeat(opts.tabWidth!);
  const lines = result.split('\n');
  let indentLevel = 0;
  const formattedLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      formattedLines.push('');
      continue;
    }

    // Decrease indent for closing brackets
    if (/^[}\]\)]/.test(trimmed)) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    formattedLines.push(indent.repeat(indentLevel) + trimmed);

    // Increase indent after opening brackets
    if (/[{\[\(]$/.test(trimmed) && !/\}|\]|\)/.test(trimmed.slice(-2, -1))) {
      indentLevel++;
    }
  }

  result = formattedLines.join('\n');

  // Clean up multiple empty lines
  result = result.replace(/\n{3,}/g, '\n\n');

  // Ensure file ends with newline
  if (!result.endsWith('\n')) {
    result += '\n';
  }

  return result;
}

// Format HTML
export function formatHTML(code: string, options: FormatOptions = {}): string {
  const opts = { ...defaultOptions, ...options };
  let result = code;
  const indent = opts.useTabs ? '\t' : ' '.repeat(opts.tabWidth!);

  // Normalize line endings
  result = result.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Remove extra whitespace
  result = result.replace(/>\s+</g, '>\n<');

  // Format with indentation
  const lines = result.split('\n');
  const formattedLines: string[] = [];
  let indentLevel = 0;
  const voidElements = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check for closing tags
    if (/^<\//.test(trimmed)) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    formattedLines.push(indent.repeat(indentLevel) + trimmed);

    // Check for opening tags (not self-closing or void)
    const tagMatch = trimmed.match(/^<(\w+)/);
    if (tagMatch) {
      const tagName = tagMatch[1].toLowerCase();
      const isSelfClosing = /\/>$/.test(trimmed);
      const isVoid = voidElements.includes(tagName);
      const hasClosing = new RegExp(`</${tagName}>$`, 'i').test(trimmed);

      if (!isSelfClosing && !isVoid && !hasClosing && !trimmed.startsWith('<!')) {
        indentLevel++;
      }
    }
  }

  return formattedLines.join('\n') + '\n';
}

// Format CSS
export function formatCSS(code: string, options: FormatOptions = {}): string {
  const opts = { ...defaultOptions, ...options };
  let result = code;
  const indent = opts.useTabs ? '\t' : ' '.repeat(opts.tabWidth!);

  // Normalize line endings
  result = result.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Format selectors
  result = result.replace(/\s*{\s*/g, ' {\n');
  result = result.replace(/\s*}\s*/g, '\n}\n\n');

  // Format properties
  result = result.replace(/;\s*/g, ';\n');
  result = result.replace(/:\s*/g, ': ');

  // Add indentation
  const lines = result.split('\n');
  const formattedLines: string[] = [];
  let indentLevel = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed === '}') {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    formattedLines.push(indent.repeat(indentLevel) + trimmed);

    if (trimmed.endsWith('{')) {
      indentLevel++;
    }
  }

  return formattedLines.join('\n') + '\n';
}

// Format JSON
export function formatJSON(code: string, options: FormatOptions = {}): string {
  const opts = { ...defaultOptions, ...options };

  try {
    const parsed = JSON.parse(code);
    const indent = opts.useTabs ? '\t' : ' '.repeat(opts.tabWidth!);
    return JSON.stringify(parsed, null, indent) + '\n';
  } catch {
    return code;
  }
}

// Format Python (basic)
export function formatPython(code: string, options: FormatOptions = {}): string {
  const opts = { ...defaultOptions, ...options };
  let result = code;
  const indent = ' '.repeat(4); // PEP 8 standard

  // Normalize line endings
  result = result.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Fix spacing around operators
  result = result.replace(/\s*([+\-*/%=<>!])\s*/g, ' $1 ');
  result = result.replace(/\s*([+\-*/%])=\s*/g, ' $1= ');

  // Fix spacing after commas
  result = result.replace(/,\s*/g, ', ');

  // Fix colons
  result = result.replace(/\s*:\s*$/gm, ':');
  result = result.replace(/:\s+/g, ': ');

  // Two blank lines between functions/classes
  result = result.replace(/(\n)(def |class )/g, '\n\n$2');
  result = result.replace(/\n{3,}/g, '\n\n');

  return result;
}

// Auto-detect language and format
export function formatCode(code: string, language: string, options: FormatOptions = {}): string {
  switch (language.toLowerCase()) {
    case 'javascript':
    case 'js':
    case 'typescript':
    case 'ts':
    case 'jsx':
    case 'tsx':
      return formatJavaScript(code, options);
    case 'html':
    case 'htm':
      return formatHTML(code, options);
    case 'css':
    case 'scss':
    case 'less':
      return formatCSS(code, options);
    case 'json':
      return formatJSON(code, options);
    case 'python':
    case 'py':
      return formatPython(code, options);
    default:
      return code;
  }
}

// Format all files in a project
export function formatProject(
  files: { path: string; content: string; language?: string }[],
  options: FormatOptions = {}
): { path: string; content: string; language?: string }[] {
  return files.map(file => {
    const ext = file.path.split('.').pop()?.toLowerCase() || '';
    const language = file.language || ext;

    return {
      ...file,
      content: formatCode(file.content, language, options)
    };
  });
}

// Linting rules (simple)
export interface LintIssue {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  rule: string;
}

export function lintJavaScript(code: string): LintIssue[] {
  const issues: LintIssue[] = [];
  const lines = code.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for console.log
    if (/console\.(log|warn|error|info|debug)/.test(line)) {
      issues.push({
        line: i + 1,
        column: line.indexOf('console'),
        message: 'Unexpected console statement',
        severity: 'warning',
        rule: 'no-console'
      });
    }

    // Check for var usage
    if (/\bvar\s+/.test(line)) {
      issues.push({
        line: i + 1,
        column: line.indexOf('var'),
        message: 'Unexpected var, use let or const instead',
        severity: 'warning',
        rule: 'no-var'
      });
    }

    // Check for == instead of ===
    if (/[^=!<>]==[^=]/.test(line)) {
      issues.push({
        line: i + 1,
        column: line.search(/[^=!<>]==/),
        message: 'Expected === and instead saw ==',
        severity: 'warning',
        rule: 'eqeqeq'
      });
    }

    // Check for debugger
    if (/\bdebugger\b/.test(line)) {
      issues.push({
        line: i + 1,
        column: line.indexOf('debugger'),
        message: 'Unexpected debugger statement',
        severity: 'error',
        rule: 'no-debugger'
      });
    }

    // Check line length
    if (line.length > 120) {
      issues.push({
        line: i + 1,
        column: 120,
        message: 'Line exceeds maximum length of 120 characters',
        severity: 'info',
        rule: 'max-len'
      });
    }

    // Check for trailing whitespace
    if (/\s+$/.test(line)) {
      issues.push({
        line: i + 1,
        column: line.trimEnd().length,
        message: 'Trailing whitespace',
        severity: 'info',
        rule: 'no-trailing-spaces'
      });
    }
  }

  return issues;
}