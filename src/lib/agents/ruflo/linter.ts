import * as ts from 'typescript';
import { prisma } from '../../db';
import { normalizeProjectPath } from './workspace-policy';

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

  if (filePath.endsWith('.prisma')) {
    return runPrismaSchemaCheck(content, filePath);
  }

  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx') && !filePath.endsWith('.js') && !filePath.endsWith('.jsx')) {
    return runBracketBalanceCheck(content, filePath);
  }

  const isJsOrJsx = filePath.endsWith('.js') || filePath.endsWith('.jsx');

  const cwd = process.cwd().replace(/\\/g, '/');

  function getVirtualContent(fileName: string): { key: string; content: string } | undefined {
    const cleanName = fileName.replace(/\\/g, '/');
    // Critical: never hijack real installed node_modules with virtual workspace files
    if (cleanName.includes('/node_modules/')) {
      return undefined;
    }
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
    jsx: ts.JsxEmit.ReactJSX,
    strict: false,
    noEmit: true,
    allowJs: true,
    checkJs: true,
    skipLibCheck: true,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    baseUrl: '.',
    paths: {
      '@/*': ['./src/*', './*'],
    },
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

  // Next.js App Router 'use client' directive check
  if ((filePath.startsWith('app/') || filePath.includes('/app/')) &&
      /\.(tsx|jsx)$/.test(filePath)) {
    const hasClientHooks = /\b(useState|useEffect|useRef|useCallback|useMemo|useContext)\b/.test(content);
    const hasUseClient = content.trimStart().startsWith("'use client'") || content.trimStart().startsWith('"use client"');
    if (hasClientHooks && !hasUseClient) {
      errors.push({
        line: 1, character: 1,
        message: `File uses React hooks but missing 'use client' directive (required for Next.js App Router).`,
        severity: 'error',
      });
    }
  }

  allDiagnostics.forEach((diagnostic) => {
    if (diagnostic.file && diagnostic.start !== undefined) {
      const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');

      // For JS/JSX files, ignore external missing npm module errors, but retain broken local import errors (./, ../, @/)
      if (isJsOrJsx) {
        if (diagnostic.code === 2307 || diagnostic.code === 7016) {
          const isLocalImport = /['"](\.|\/|@\/)/i.test(message);
          if (!isLocalImport) return;
        } else if (diagnostic.code === 1479 || diagnostic.code === 2304 || diagnostic.code === 2552) {
          return;
        }
      }

      // In a virtual workspace, Prisma client models are defined in schema.prisma/backend_spec.md
      // but not generated into the host's node_modules/@prisma/client. Ignore ungenerated Prisma client model access.
      if (diagnostic.code === 2339 && message.includes('PrismaClient')) {
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
    const cssMatches = [...lineText.matchAll(/<link[^>]+href=["']([^"']+)["']/gi)];
    for (const match of cssMatches) {
      const ref = match[1];
      if (!ref.startsWith('http://') && !ref.startsWith('https://') && !ref.startsWith('//')) {
        const cleanRef = ref.replace(/^\.\//, '');
        if (!fileMap.has(cleanRef) && !fileMap.has('public/' + cleanRef)) {
          errors.push({
            line: idx + 1,
            character: match.index || 1,
            message: `HTML <link> references "${ref}" which does not exist in workspace.`,
            severity: 'warning',
          });
        }
      }
    }

    // Check <script src="...">
    const scriptMatches = [...lineText.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)];
    for (const match of scriptMatches) {
      const ref = match[1];
      if (!ref.startsWith('http://') && !ref.startsWith('https://') && !ref.startsWith('//')) {
        const cleanRef = ref.replace(/^\.\//, '');
        if (!fileMap.has(cleanRef) && !fileMap.has('public/' + cleanRef)) {
          errors.push({
            line: idx + 1,
            character: match.index || 1,
            message: `HTML <script> references "${ref}" which does not exist in workspace.`,
            severity: 'warning',
          });
        } else {
          // ES module check: if the JS file uses import/export, script tag needs type="module"
          const jsContent = fileMap.get(cleanRef) || fileMap.get('public/' + cleanRef);
          if (jsContent && /\b(import\s+|export\s+)/.test(jsContent)) {
            if (!match[0].includes('type="module"')) {
              errors.push({
                line: idx + 1,
                character: match.index || 1,
                message: `Script "${ref}" uses ES module syntax but loaded without type="module".`,
                severity: 'error',
              });
            }
          }
        }
      }
    }
  });

  const hardErrors = errors.filter(e => e.severity === 'error');
  return {
    success: hardErrors.length === 0,
    errors,
    summary: errors.length > 0
      ? `HTML check found ${hardErrors.length} error(s) and ${errors.length - hardErrors.length} warning(s) in "${filePath}".`
      : 'HTML links verified.',
  };
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
    'box-sizing', 'list-style', 'outline', 'pointer-events', 'user-select',
    'inset', 'aspect-ratio', 'place-items', 'place-content', 'backdrop-filter',
    'animation', 'animation-name', 'animation-duration', 'animation-delay',
    'animation-fill-mode', 'animation-timing-function', 'animation-iteration-count',
    'content', 'white-space', 'word-break', 'word-wrap', 'overflow-wrap',
    'letter-spacing', 'object-fit', 'object-position', 'resize', 'scroll-behavior',
    'flex-grow', 'flex-shrink', 'flex-basis', 'align-self', 'align-content', 'order',
    'column-gap', 'row-gap', 'appearance', 'accent-color', 'caret-color',
    'will-change', 'contain', 'isolation', 'mix-blend-mode', 'filter',
    'clip-path', 'writing-mode', 'text-overflow', 'vertical-align',
    'text-indent', 'text-shadow', 'outline-offset', 'outline-style',
    'outline-color', 'outline-width', 'table-layout', 'border-collapse',
    'border-spacing', 'empty-cells', 'float', 'clear',
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

/**
 * Validates Prisma schema files for LLM-generated preamble contamination.
 */
export function runPrismaSchemaCheck(content: string, filePath: string): LintResult {
  const errors: LintResult['errors'] = [];
  const lines = content.split('\n');

  const firstValidLine = lines.findIndex(l =>
    /^\s*(generator|datasource|model|enum)\s+/.test(l)
  );

  if (firstValidLine > 0) {
    errors.push({
      line: 1, character: 1,
      message: `Prisma schema contains ${firstValidLine} lines of non-Prisma preamble before first valid keyword.`,
      severity: 'error',
    });
  }

  return {
    success: errors.length === 0,
    errors,
    summary: errors.length === 0
      ? `Prisma schema "${filePath}" validated cleanly.`
      : `Found ${errors.length} issue(s) in Prisma schema "${filePath}".`,
  };
}

export interface ModuleExports {
  named: Set<string>;
  hasDefault: boolean;
}

/**
 * Recursively resolves all exported symbols from a module file, tracking re-export chains
 * and preventing circular dependency infinite loops.
 * Strictly enforces that export * from ... NEVER re-exports default exports.
 */
function resolveExportedSymbols(
  targetFile: string,
  fileMap: Map<string, string>,
  compilerOptions: ts.CompilerOptions,
  resolutionHost: ts.ModuleResolutionHost,
  visited: Set<string> = new Set(),
  errors?: LintResult['errors']
): ModuleExports {
  const normTarget = normalizeProjectPath(targetFile);
  if (visited.has(normTarget)) {
    return { named: new Set(), hasDefault: false };
  }
  visited.add(normTarget);

  const content = fileMap.get(normTarget);
  if (!content) {
    return { named: new Set(), hasDefault: false };
  }

  const sourceFile = ts.createSourceFile(normTarget, content, ts.ScriptTarget.Latest, true);
  const named = new Set<string>();
  let hasDefault = false;

  // Track locally declared symbols to verify `export { x }`
  const localDeclarations = new Set<string>();
  ts.forEachChild(sourceFile, (node) => {
    if (ts.isFunctionDeclaration(node) && node.name) localDeclarations.add(node.name.text);
    if (ts.isClassDeclaration(node) && node.name) localDeclarations.add(node.name.text);
    if (ts.isTypeAliasDeclaration(node)) localDeclarations.add(node.name.text);
    if (ts.isInterfaceDeclaration(node)) localDeclarations.add(node.name.text);
    if (ts.isEnumDeclaration(node)) localDeclarations.add(node.name.text);
    if (ts.isVariableStatement(node)) {
      for (const d of node.declarationList.declarations) {
        if (ts.isIdentifier(d.name)) localDeclarations.add(d.name.text);
      }
    }
  });

  ts.forEachChild(sourceFile, (node) => {
    const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
    const hasExportMod = modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
    const hasDefaultMod = modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword) ?? false;

    // 1. export default ...
    if (hasExportMod && hasDefaultMod) {
      hasDefault = true;
    }

    // 2. export const / function / class / interface / type x
    if (hasExportMod) {
      if (ts.isVariableStatement(node)) {
        for (const decl of node.declarationList.declarations) {
          if (ts.isIdentifier(decl.name)) named.add(decl.name.text);
        }
      } else if (
        ts.isFunctionDeclaration(node) ||
        ts.isClassDeclaration(node) ||
        ts.isTypeAliasDeclaration(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isEnumDeclaration(node)
      ) {
        if (node.name && ts.isIdentifier(node.name)) named.add(node.name.text);
      }
    }

    // 3. export { a as b, default as d } without `from` (local export clause)
    if (ts.isExportDeclaration(node) && !node.moduleSpecifier && node.exportClause && ts.isNamedExports(node.exportClause)) {
      for (const el of node.exportClause.elements) {
        const localName = (el.propertyName || el.name).text;
        const exportedName = el.name.text;

        // Verify local symbol exists
        if (!localDeclarations.has(localName) && errors) {
          const { line } = sourceFile.getLineAndCharacterOfPosition(el.getStart());
          errors.push({
            line: line + 1,
            character: 1,
            message: `[${normTarget}] Exported symbol "${localName}" is not declared in this file.`,
            severity: 'error',
          });
        }

        if (exportedName === 'default') {
          hasDefault = true;
        } else {
          named.add(exportedName);
        }
      }
    }

    // 4. Re-exports: export { x } from './other' or export * from './other'
    if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const subSpec = node.moduleSpecifier.text;
      const subRes = ts.resolveModuleName(subSpec, normTarget, compilerOptions, resolutionHost);

      if (subRes.resolvedModule && !subRes.resolvedModule.isExternalLibraryImport) {
        const subFile = normalizeProjectPath(subRes.resolvedModule.resolvedFileName);
        const subExports = resolveExportedSymbols(subFile, fileMap, compilerOptions, resolutionHost, visited, errors);

        // 4a. export * as ns from './other'
        if (node.exportClause && ts.isNamespaceExport(node.exportClause)) {
          named.add(node.exportClause.name.text);
        }
        // 4b. export { a as b } from './other'
        else if (node.exportClause && ts.isNamedExports(node.exportClause)) {
          for (const el of node.exportClause.elements) {
            const importedFromSub = (el.propertyName || el.name).text;
            const exportedAs = el.name.text;

            const isAvailable = importedFromSub === 'default' ? subExports.hasDefault : subExports.named.has(importedFromSub);
            if (!isAvailable && errors) {
              const { line } = sourceFile.getLineAndCharacterOfPosition(el.getStart());
              errors.push({
                line: line + 1,
                character: 1,
                message: `[${normTarget}] Cannot re-export "${importedFromSub}" from "${subSpec}" because it is not exported by the target.`,
                severity: 'error',
              });
            }

            if (exportedAs === 'default') {
              hasDefault = true;
            } else {
              named.add(exportedAs);
            }
          }
        }
        // 4c. export * from './other'
        // CRITICAL SPEC INVARIANT: export * NEVER re-exports default
        else if (!node.exportClause) {
          for (const n of subExports.named) {
            named.add(n);
          }
        }
      }
    }
  });

  return { named, hasDefault };
}

/**
 * Cross-file import resolution check.
 * Validates that all relative imports resolve to existing files in the workspace
 * and that named imports correspond to actual exports.
 */
export function runCrossFileImportCheck(
  fileMap: Map<string, string>
): LintResult {
  const errors: LintResult['errors'] = [];

  let compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    allowJs: true,
    noEmit: true,
  };

  const tsconfigContent = fileMap.get('tsconfig.json');
  if (tsconfigContent) {
    try {
      const parsedJson = ts.parseConfigFileTextToJson('tsconfig.json', tsconfigContent);
      if (!parsedJson.error && parsedJson.config) {
        const dummyHost: ts.ParseConfigHost = {
          useCaseSensitiveFileNames: true,
          readDirectory: () => [],
          fileExists: (f) => fileMap.has(normalizeProjectPath(f)),
          readFile: (f) => fileMap.get(normalizeProjectPath(f)),
        };
        const parsed = ts.parseJsonConfigFileContent(parsedJson.config, dummyHost, '.');
        compilerOptions = { ...compilerOptions, ...parsed.options };
      }
    } catch {}
  }

  const resolutionHost: ts.ModuleResolutionHost = {
    fileExists: (fileName: string) => fileMap.has(normalizeProjectPath(fileName)),
    readFile: (fileName: string) => fileMap.get(normalizeProjectPath(fileName)),
    directoryExists: (dirName: string) => {
      const norm = normalizeProjectPath(dirName);
      for (const k of fileMap.keys()) {
        if (k.startsWith(norm + '/')) return true;
      }
      return false;
    },
    getCurrentDirectory: () => '.',
    getDirectories: () => [],
  };

  // 1. Inspect Exports Across Project Files (validating local export clauses & re-exports)
  for (const [filePath] of fileMap.entries()) {
    if (!/\.(js|ts|jsx|tsx)$/.test(filePath)) continue;
    resolveExportedSymbols(filePath, fileMap, compilerOptions, resolutionHost, new Set(), errors);
  }

  // 2. Inspect Imports Across Project Files
  for (const [filePath, content] of fileMap.entries()) {
    if (!/\.(js|ts|jsx|tsx)$/.test(filePath)) continue;

    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

    ts.forEachChild(sourceFile, (node) => {
      if (!ts.isImportDeclaration(node)) return;
      if (!node.moduleSpecifier || !ts.isStringLiteral(node.moduleSpecifier)) return;

      const specifier = node.moduleSpecifier.text;

      // Skip Node built-ins
      if (specifier.startsWith('node:')) return;

      const resolution = ts.resolveModuleName(specifier, filePath, compilerOptions, resolutionHost);

      // If resolved to external library (node_modules), skip local workspace check
      if (resolution.resolvedModule?.isExternalLibraryImport) return;

      // Skip standard 3P packages when not resolved to workspace
      if (!specifier.startsWith('.') && !specifier.startsWith('/') && !specifier.startsWith('@/')) {
        const isPathMapped = compilerOptions.paths && Object.keys(compilerOptions.paths).some((p) => specifier.startsWith(p.replace(/\*$/, '')));
        if (!isPathMapped) return;
      }

      const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());

      if (!resolution.resolvedModule) {
        errors.push({
          line: line + 1,
          character: 1,
          message: `[${filePath}] Import "${specifier}" resolves to a file that does not exist in the workspace.`,
          severity: 'error',
        });
        return;
      }

      const resolvedFile = normalizeProjectPath(resolution.resolvedModule.resolvedFileName);
      if (resolvedFile.endsWith('.css') || resolvedFile.endsWith('.json')) return;

      const exports = resolveExportedSymbols(resolvedFile, fileMap, compilerOptions, resolutionHost, new Set(), errors);

      if (node.importClause) {
        // Default import: import Foo from './mod'
        if (node.importClause.name && !exports.hasDefault) {
          errors.push({
            line: line + 1,
            character: 1,
            message: `[${filePath}] Module "${specifier}" does not have a default export.`,
            severity: 'error',
          });
        }
        // Named imports: import { a, b as c } from './mod'
        if (node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
          for (const el of node.importClause.namedBindings.elements) {
            const importedName = (el.propertyName || el.name).text;
            if (!exports.named.has(importedName)) {
              errors.push({
                line: line + 1,
                character: 1,
                message: `[${filePath}] Named import "${importedName}" is not exported from "${specifier}".`,
                severity: 'error',
              });
            }
          }
        }
      }
    });
  }

  return {
    success: errors.length === 0,
    errors,
    summary: errors.length === 0
      ? 'Cross-file import validation passed.'
      : `Found ${errors.length} cross-file import error(s).`,
  };
}
