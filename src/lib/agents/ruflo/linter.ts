import * as ts from 'typescript';
import { prisma } from '../../db';

export interface LintResult {
  success: boolean;
  errors: Array<{
    line: number;
    character: number;
    message: string;
    severity: 'error' | 'warning';
  }>;
  summary: string;
}

/**
 * Runs the TypeScript compiler on a file from the virtual workspace.
 * Pre-loads all workspace files in the conversation into memory to support synchronous module resolution.
 */
export async function runLinter(
  conversationId: string,
  filePath: string
): Promise<LintResult> {
  // Pre-load all virtual workspace files for this conversation into memory
  const virtualFiles = await prisma.virtualFile.findMany({
    where: { conversationId },
  });

  const fileMap = new Map<string, string>();
  for (const vf of virtualFiles) {
    fileMap.set(vf.filePath.replace(/\\/g, '/'), vf.content);
  }

  const targetPath = filePath.replace(/\\/g, '/');
  const content = fileMap.get(targetPath);

  if (content === undefined) {
    return {
      success: false,
      errors: [{ line: 0, character: 0, message: `File not found in virtual workspace: ${filePath}`, severity: 'error' }],
      summary: `Cannot lint: file "${filePath}" does not exist.`,
    };
  }

  if (filePath.endsWith('.html')) {
    const htmlCheck = runHtmlLinkCheck(content, filePath, fileMap);
    if (!htmlCheck.success) return htmlCheck;
    return runBracketBalanceCheck(content, filePath);
  }

  if (filePath.endsWith('.css')) {
    return runCssPropertyCheck(content, filePath);
  }

  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx') && !filePath.endsWith('.js') && !filePath.endsWith('.jsx')) {
    return runBracketBalanceCheck(content, filePath);
  }

  const isJsOrJsx = filePath.endsWith('.js') || filePath.endsWith('.jsx');

  const cwd = process.cwd().replace(/\\/g, '/');

  function getVirtualContent(fileName: string): { key: string; content: string } | undefined {
    const cleanName = fileName.replace(/\\/g, '/');
    if (fileMap.has(cleanName)) {
      return { key: cleanName, content: fileMap.get(cleanName)! };
    }
    const relativePath = cleanName.startsWith(cwd + '/') ? cleanName.slice(cwd.length + 1) : cleanName;
    if (fileMap.has(relativePath)) {
      return { key: relativePath, content: fileMap.get(relativePath)! };
    }
    for (const [key, val] of fileMap.entries()) {
      if (cleanName.endsWith('/' + key) || cleanName === key) {
        return { key, content: val };
      }
    }
    return undefined;
  }

  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.React,
    strict: false,
    noEmit: true,
    allowJs: true,
    checkJs: true,
    skipLibCheck: true,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
  };

  const host = ts.createCompilerHost(compilerOptions);
  const originalGetSourceFile = host.getSourceFile;

  // Intercept file existence checks synchronously from the memory cache
  host.fileExists = (fileName) => {
    if (getVirtualContent(fileName) !== undefined) return true;
    return ts.sys.fileExists(fileName);
  };

  // Intercept file reading synchronously from the memory cache
  host.readFile = (fileName) => {
    const virtual = getVirtualContent(fileName);
    if (virtual !== undefined) {
      return virtual.content;
    }
    return ts.sys.readFile(fileName);
  };

  // Intercept source file creation synchronously from the memory cache
  host.getSourceFile = (name, languageVersion) => {
    const virtual = getVirtualContent(name);
    if (virtual !== undefined) {
      return ts.createSourceFile(name, virtual.content, languageVersion, true);
    }
    return originalGetSourceFile.call(host, name, languageVersion);
  };

  const program = ts.createProgram([targetPath], compilerOptions, host);
  const allDiagnostics = ts.getPreEmitDiagnostics(program);
  const errors: LintResult['errors'] = [];

  // Run bracket balance check for structural unclosed bracket validation
  const bracketCheck = runBracketBalanceCheck(content, filePath);
  if (!bracketCheck.success) {
    errors.push(...bracketCheck.errors);
  }

  allDiagnostics.forEach((diagnostic) => {
    if (diagnostic.file && diagnostic.start !== undefined) {
      const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');

      // For JS/JSX files, ignore external missing module errors (TS2307, TS1479, TS7016, TS2304 for globals) and focus on true syntax/parser errors
      if (isJsOrJsx && (diagnostic.code === 2307 || diagnostic.code === 1479 || diagnostic.code === 7016 || diagnostic.code === 2304 || diagnostic.code === 2552)) {
        return;
      }

      errors.push({
        line: line + 1,
        character: character + 1,
        message,
        severity: diagnostic.category === ts.DiagnosticCategory.Error ? 'error' : 'warning',
      });
    }
  });

  const success = errors.filter((e) => e.severity === 'error').length === 0;

  return {
    success,
    errors,
    summary: success
      ? `No errors found in "${filePath}".`
      : `Found ${errors.length} issue(s) in "${filePath}": ${errors.map((e) => `Line ${e.line}: ${e.message}`).join('; ')}`,
  };
}

/**
 * State-aware fallback bracket check for non-TS files.
 * Ignores comments, string literals, and escape sequences to avoid false positives.
 */
export function runBracketBalanceCheck(content: string, filePath: string): LintResult {
  const stack: Array<{ char: string; line: number }> = [];
  let inSingleLineComment = false;
  let inMultiLineComment = false;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inTemplateLiteral = false;
  let escapeNext = false;

  const lines = content.split('\n');

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    inSingleLineComment = false; // Reset single-line comment at newline

    for (let charIdx = 0; charIdx < line.length; charIdx++) {
      const char = line[charIdx];
      const nextChar = line[charIdx + 1] || '';

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      // Handle escape sequences in strings
      if (char === '\\' && (inSingleQuote || inDoubleQuote || inTemplateLiteral)) {
        escapeNext = true;
        continue;
      }

      // Handle comments
      if (!inSingleQuote && !inDoubleQuote && !inTemplateLiteral) {
        if (inMultiLineComment) {
          if (char === '*' && nextChar === '/') {
            inMultiLineComment = false;
            charIdx++;
          }
          continue;
        }

        if (char === '/' && nextChar === '/') {
          inSingleLineComment = true;
          break; // Ignore rest of the line
        }

        if (char === '/' && nextChar === '*') {
          inMultiLineComment = true;
          charIdx++;
          continue;
        }
      }

      if (inMultiLineComment || inSingleLineComment) {
        continue;
      }

      // Handle string literal boundaries
      if (char === "'" && !inDoubleQuote && !inTemplateLiteral) {
        inSingleQuote = !inSingleQuote;
        continue;
      }
      if (char === '"' && !inSingleQuote && !inTemplateLiteral) {
        inDoubleQuote = !inDoubleQuote;
        continue;
      }
      if (char === '`' && !inSingleQuote && !inDoubleQuote) {
        inTemplateLiteral = !inTemplateLiteral;
        continue;
      }

      // Ignore brackets nested within string values
      if (inSingleQuote || inDoubleQuote || inTemplateLiteral) {
        continue;
      }

      // Balance validation
      if (char === '{' || char === '(' || char === '[') {
        stack.push({ char, line: lineIdx + 1 });
      } else if (char === '}' || char === ')' || char === ']') {
        const top = stack[stack.length - 1];
        const isMatch =
          (char === '}' && top?.char === '{') ||
          (char === ')' && top?.char === '(') ||
          (char === ']' && top?.char === '[');

        if (!isMatch) {
          return {
            success: false,
            errors: [{
              line: lineIdx + 1,
              character: charIdx + 1,
              message: `Mismatched closing bracket "${char}". Expected matching pair for "${top?.char || 'none'}"`,
              severity: 'error'
            }],
            summary: `Bracket mismatch found in "${filePath}" near line ${lineIdx + 1}.`,
          };
        }
        stack.pop();
      }
    }
  }

  if (stack.length > 0) {
    const unclosed = stack[stack.length - 1];
    return {
      success: false,
      errors: [{
        line: unclosed.line,
        character: 0,
        message: `Unclosed bracket "${unclosed.char}" detected.`,
        severity: 'error'
      }],
      summary: `Unclosed bracket "${unclosed.char}" found in "${filePath}" starting at line ${unclosed.line}.`,
    };
  }

  return {
    success: true,
    errors: [],
    summary: `No bracket errors found in "${filePath}".`,
  };
}

function runHtmlLinkCheck(content: string, filePath: string, fileMap: Map<string, string>): LintResult {
  const errors: Array<{ line: number; character: number; message: string; severity: 'error' | 'warning' }> = [];
  const lines = content.split('\n');

  lines.forEach((lineText, idx) => {
    // Check <link href="...">
    const cssMatches = lineText.matchAll(/<link[^>]+href=["']([^"']+)["']/gi);
    for (const match of cssMatches) {
      const ref = match[1];
      if (!ref.startsWith('http://') && !ref.startsWith('https://') && !ref.startsWith('//')) {
        const cleanRef = ref.replace(/^\.\//, '');
        if (!fileMap.has(cleanRef) && !fileMap.has('public/' + cleanRef)) {
          errors.push({
            line: idx + 1,
            character: match.index || 1,
            message: `HTML <link> tag references CSS file "${ref}" which does not exist in workspace.`,
            severity: 'warning',
          });
        }
      }
    }

    // Check <script src="...">
    const scriptMatches = lineText.matchAll(/<script[^>]+src=["']([^"']+)["']/gi);
    for (const match of scriptMatches) {
      const ref = match[1];
      if (!ref.startsWith('http://') && !ref.startsWith('https://') && !ref.startsWith('//')) {
        const cleanRef = ref.replace(/^\.\//, '');
        if (!fileMap.has(cleanRef) && !fileMap.has('public/' + cleanRef)) {
          errors.push({
            line: idx + 1,
            character: match.index || 1,
            message: `HTML <script> tag references JavaScript file "${ref}" which does not exist in workspace.`,
            severity: 'warning',
          });
        }
      }
    }
  });

  if (errors.length > 0) {
    return {
      success: false,
      errors,
      summary: `HTML Link Verification found ${errors.length} unlinked script/CSS tags in "${filePath}".`,
    };
  }

  return { success: true, errors: [], summary: 'HTML links verified.' };
}

export function runCssPropertyCheck(content: string, filePath: string): LintResult {
  const bracketCheck = runBracketBalanceCheck(content, filePath);
  if (!bracketCheck.success) return bracketCheck;

  const COMMON_CSS_PROPS = new Set([
    'color', 'background', 'background-color', 'background-image', 'background-size', 'background-position', 'background-repeat',
    'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'text-align', 'text-decoration', 'text-transform',
    'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'width', 'min-width', 'max-width', 'height', 'min-height', 'max-height',
    'display', 'position', 'top', 'right', 'bottom', 'left', 'flex', 'flex-direction', 'flex-wrap', 'justify-content', 'align-items',
    'gap', 'grid', 'grid-template-columns', 'grid-template-rows', 'grid-column', 'grid-row',
    'border', 'border-radius', 'border-top', 'border-right', 'border-bottom', 'border-left', 'border-color', 'border-style', 'border-width',
    'box-shadow', 'opacity', 'visibility', 'z-index', 'overflow', 'overflow-x', 'overflow-y', 'cursor', 'transition', 'transform',
    'box-sizing', 'list-style', 'outline', 'pointer-events', 'user-select'
  ]);

  const errors: LintResult['errors'] = [];
  const lines = content.split('\n');

  lines.forEach((lineText, idx) => {
    const trimmed = lineText.trim();
    if (!trimmed || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('//') || trimmed.startsWith('@')) return;
    const propMatch = trimmed.match(/^([a-zA-Z-]+)\s*:/);
    if (propMatch) {
      const propName = propMatch[1].toLowerCase();
      if (!propName.startsWith('--') && !propName.startsWith('-webkit-') && !propName.startsWith('-moz-') && !COMMON_CSS_PROPS.has(propName)) {
        errors.push({
          line: idx + 1,
          character: 1,
          message: `Unknown or misspelled CSS property "${propName}".`,
          severity: 'warning',
        });
      }
    }
  });

  return {
    success: true, // Warnings do not cause lint failure
    errors,
    summary: errors.length > 0 ? `CSS property check found ${errors.length} warning(s) in "${filePath}".` : `CSS properties verified cleanly for "${filePath}".`
  };
}
