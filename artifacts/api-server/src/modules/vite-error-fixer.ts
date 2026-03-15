// Vite Error Analysis Engine - Parses build/runtime errors and generates automated fixes

export interface ParsedError {
  type: 'missing_import' | 'missing_module' | 'missing_file' | 'syntax' | 'export_mismatch' |
        'type_error' | 'reference_error' | 'jsx_error' | 'css_error' | 'dependency_conflict' |
        'hook_violation' | 'runtime' | 'config' | 'unknown';
  message: string;
  filePath?: string;
  line?: number;
  column?: number;
  importName?: string;
  moduleName?: string;
  raw: string;
}

export interface FixAction {
  type: 'patch_file' | 'create_file' | 'add_dependency' | 'delete_import' | 'fix_path';
  filePath: string;
  description: string;
  oldContent?: string;
  newContent: string;
  confidence: 'high' | 'medium' | 'low';
  packageName?: string;
  packageVersion?: string;
}

export interface FixResult {
  errors: ParsedError[];
  fixes: FixAction[];
  unfixable: ParsedError[];
  summary: string;
}

interface ProjectFile {
  path: string;
  content: string;
  language: string;
}

interface ErrorPattern {
  pattern: RegExp;
  type: ParsedError['type'];
  extract: (match: RegExpMatchArray, raw: string) => Partial<ParsedError>;
}

const VITE_ERROR_PATTERNS: ErrorPattern[] = [
  {
    pattern: /Failed to resolve import "([^"]+)" from "([^"]+)"/,
    type: 'missing_import',
    extract: (m) => ({ importName: m[1], filePath: m[2] }),
  },
  {
    pattern: /Module not found: (?:Error: )?Can't resolve '([^']+)' in '([^']+)'/,
    type: 'missing_module',
    extract: (m) => ({ moduleName: m[1], filePath: m[2] }),
  },
  {
    pattern: /Cannot find module '([^']+)'/,
    type: 'missing_module',
    extract: (m) => ({ moduleName: m[1] }),
  },
  {
    pattern: /Error: No matching export in "([^"]+)" for import "([^"]+)"/,
    type: 'export_mismatch',
    extract: (m) => ({ filePath: m[1], importName: m[2] }),
  },
  {
    pattern: /\[plugin:vite:import-analysis\] Failed to parse source for import analysis.*?(\S+\.\w+)/,
    type: 'syntax',
    extract: (m) => ({ filePath: m[1] }),
  },
  {
    pattern: /SyntaxError: (?:.*?) \((\d+):(\d+)\)(?:.*?in (\S+))?/,
    type: 'syntax',
    extract: (m) => ({ line: parseInt(m[1]), column: parseInt(m[2]), filePath: m[3] }),
  },
  {
    pattern: /Unexpected token.*?(?:in |at )(\S+\.(?:jsx?|tsx?|vue)):?(\d+)?/,
    type: 'syntax',
    extract: (m) => ({ filePath: m[1], line: m[2] ? parseInt(m[2]) : undefined }),
  },
  {
    pattern: /ReferenceError: (\w+) is not defined/,
    type: 'reference_error',
    extract: (m) => ({ importName: m[1] }),
  },
  {
    pattern: /TypeError: (.+)/,
    type: 'type_error',
    extract: (m) => ({}),
  },
  {
    pattern: /Cannot use import statement outside a module/,
    type: 'config',
    extract: () => ({}),
  },
  {
    pattern: /React\.createElement.*is not a function|Invalid hook call/,
    type: 'hook_violation',
    extract: () => ({}),
  },
  {
    pattern: /JSX element type '(\w+)' does not have any construct or call signatures/,
    type: 'jsx_error',
    extract: (m) => ({ importName: m[1] }),
  },
  {
    pattern: /Unknown at rule @([\w-]+)/,
    type: 'css_error',
    extract: (m) => ({ importName: m[1] }),
  },
  {
    pattern: /Conflicting peer dependency|ERESOLVE unable to resolve dependency tree/,
    type: 'dependency_conflict',
    extract: () => ({}),
  },
  {
    pattern: /ENOENT.*?'([^']+)'/,
    type: 'missing_file',
    extract: (m) => ({ filePath: m[1] }),
  },
  {
    pattern: /(?:Cannot find|not found|does not exist):?\s*['"]?([./][\w./\-@]+)/,
    type: 'missing_file',
    extract: (m) => ({ filePath: m[1] }),
  },
  {
    pattern: /Cannot read propert(?:y|ies) of (?:undefined|null)(?:.*?reading '(\w+)')?/,
    type: 'runtime' as const,
    extract: (m: RegExpMatchArray) => ({ importName: m[1] }),
  },
  {
    pattern: /(?:TypeError|Error): ([\w.]+) is not a function/,
    type: 'runtime' as const,
    extract: (m: RegExpMatchArray) => ({ importName: m[1] }),
  },
  {
    pattern: /Objects are not valid as a React child.*?found: (object|array)/,
    type: 'runtime' as const,
    extract: (m: RegExpMatchArray) => ({ importName: m[1] }),
  },
  {
    pattern: /Too many re-renders\. React limits the number of renders/,
    type: 'runtime' as const,
    extract: () => ({}),
  },
  {
    pattern: /(?:Rendered more hooks than during the previous render|React has detected a change in the order of Hooks)/,
    type: 'runtime' as const,
    extract: () => ({}),
  },
  {
    pattern: /(?:Maximum update depth exceeded|Warning: Cannot update a component.*while rendering a different component)/,
    type: 'runtime' as const,
    extract: () => ({}),
  },
  {
    pattern: /Uncaught (?:TypeError|ReferenceError|Error): (.+?)(?:\n|$)/,
    type: 'runtime' as const,
    extract: (m: RegExpMatchArray) => ({ message: m[1] }),
  },
  {
    pattern: /(?:Unhandled|Uncaught) (?:Promise |)(?:Rejection|Error).*?(?:at|in) ([\w./]+\.(?:tsx?|jsx?))(?::(\d+))?/,
    type: 'runtime' as const,
    extract: (m: RegExpMatchArray) => ({ filePath: m[1], line: m[2] ? parseInt(m[2]) : undefined }),
  },
  {
    pattern: /Each child in a list should have a unique "key" prop/,
    type: 'runtime' as const,
    extract: () => ({}),
  },
  {
    pattern: /Cannot update during an existing state transition/,
    type: 'runtime' as const,
    extract: () => ({}),
  },
  {
    pattern: /(?:fetch|axios|XMLHttpRequest).*?(?:Failed to fetch|Network Error|net::ERR_)/,
    type: 'runtime' as const,
    extract: () => ({}),
  },
  {
    pattern: /Hydration failed because.*?(?:server|client)/i,
    type: 'runtime' as const,
    extract: () => ({}),
  },
  // TypeScript LSP / tsc diagnostic errors (shown in IDE diagnostics panels)
  {
    pattern: /Mismatched brackets.*?expected ['"]([^'"]+)['"] but found ['"]([^'"]+)['"]\)?.*?(?:in |at )?([^\s(]+\.[jt]sx?)?(?:\s*\((?:line )?(\d+)\))?/i,
    type: 'syntax' as const,
    extract: (m) => ({ filePath: m[3], line: m[4] ? parseInt(m[4]) : undefined }),
  },
  {
    pattern: /Unexpected closing ['"][)}\]]['"] without matching opening.*?(?:in |at )?([^\s(]+\.[jt]sx?)?(?:\s*\((?:line )?(\d+)\))?/i,
    type: 'syntax' as const,
    extract: (m) => ({ filePath: m[1], line: m[2] ? parseInt(m[2]) : undefined }),
  },
  {
    pattern: /Expected ['"][)}\]]['"].*?(?:in |at )?([^\s(]+\.[jt]sx?)?(?:\s*\((?:line )?(\d+)\))?/i,
    type: 'syntax' as const,
    extract: (m) => ({ filePath: m[1], line: m[2] ? parseInt(m[2]) : undefined }),
  },
  {
    // tsc: error TS1005: '}' expected.  src/server/auth.ts:31:5
    pattern: /error TS\d+:.*?expected\.?\s+([^\s:]+\.[jt]sx?):(\d+)/i,
    type: 'syntax' as const,
    extract: (m) => ({ filePath: m[1], line: parseInt(m[2]) }),
  },
];

const COMMON_PACKAGES: Record<string, string> = {
  'react': '^18.2.0',
  'react-dom': '^18.2.0',
  'react-router-dom': '^6.20.0',
  'axios': '^1.6.0',
  'zustand': '^4.4.0',
  'framer-motion': '^10.16.0',
  'recharts': '^2.10.0',
  'lucide-react': '^0.294.0',
  'date-fns': '^2.30.0',
  'clsx': '^2.0.0',
  'tailwind-merge': '^2.0.0',
  '@tanstack/react-query': '^5.0.0',
  'react-hook-form': '^7.48.0',
  'zod': '^3.22.0',
  '@hookform/resolvers': '^3.3.0',
  'class-variance-authority': '^0.7.0',
  'react-icons': '^4.12.0',
  'uuid': '^9.0.0',
  'nanoid': '^5.0.0',
  '@radix-ui/react-slot': '^1.0.2',
  '@radix-ui/react-dialog': '^1.0.5',
  '@radix-ui/react-dropdown-menu': '^2.0.6',
  '@radix-ui/react-tabs': '^1.0.4',
  '@radix-ui/react-toast': '^1.1.5',
  '@radix-ui/react-tooltip': '^1.0.7',
  '@radix-ui/react-select': '^2.0.0',
  '@radix-ui/react-label': '^2.0.2',
  '@radix-ui/react-switch': '^1.0.3',
  '@radix-ui/react-checkbox': '^1.0.4',
  '@radix-ui/react-separator': '^1.0.3',
  '@radix-ui/react-scroll-area': '^1.0.5',
  '@radix-ui/react-avatar': '^1.0.4',
  '@radix-ui/react-popover': '^1.0.7',
  'tailwindcss': '3.4.17',
  'autoprefixer': '^10.4.0',
  'postcss': '^8.4.0',
};

const REACT_HOOKS = ['useState', 'useEffect', 'useCallback', 'useMemo', 'useRef', 'useContext', 'useReducer', 'useId', 'useTransition', 'useDeferredValue', 'useLayoutEffect', 'useImperativeHandle', 'useDebugValue', 'useSyncExternalStore', 'useInsertionEffect'];

export function parseErrors(errorMessages: string[]): ParsedError[] {
  const parsed: ParsedError[] = [];

  for (const raw of errorMessages) {
    let matched = false;

    for (const { pattern, type, extract } of VITE_ERROR_PATTERNS) {
      const match = raw.match(pattern);
      if (match) {
        const extracted = extract(match, raw);
        parsed.push({
          type,
          message: match[0],
          raw,
          ...extracted,
        });
        matched = true;
        break;
      }
    }

    if (!matched && raw.trim().length > 5) {
      parsed.push({
        type: 'unknown',
        message: raw.slice(0, 200),
        raw,
      });
    }
  }

  return parsed;
}

export function analyzeAndFix(errors: ParsedError[], files: ProjectFile[]): FixResult {
  const fixes: FixAction[] = [];
  const unfixable: ParsedError[] = [];
  const fileMap = new Map<string, ProjectFile>();

  for (const f of files) {
    fileMap.set(f.path, f);
    fileMap.set('./' + f.path, f);
    fileMap.set('/' + f.path, f);
    const noExt = f.path.replace(/\.\w+$/, '');
    fileMap.set(noExt, f);
    fileMap.set('./' + noExt, f);
  }

  for (const error of errors) {
    const errorFixes = generateFixes(error, files, fileMap);
    if (errorFixes.length > 0) {
      fixes.push(...errorFixes);
    } else {
      unfixable.push(error);
    }
  }

  const deduped = deduplicateFixes(fixes);

  return {
    errors,
    fixes: deduped,
    unfixable,
    summary: buildSummary(deduped, unfixable),
  };
}

function generateFixes(error: ParsedError, files: ProjectFile[], fileMap: Map<string, ProjectFile>): FixAction[] {
  switch (error.type) {
    case 'missing_import':
      return fixMissingImport(error, files, fileMap);
    case 'missing_module':
      return fixMissingModule(error, files);
    case 'missing_file':
      return fixMissingFile(error, files, fileMap);
    case 'export_mismatch':
      return fixExportMismatch(error, files, fileMap);
    case 'syntax':
      return fixSyntaxError(error, files, fileMap);
    case 'reference_error':
      return fixReferenceError(error, files);
    case 'jsx_error':
      return fixJsxError(error, files, fileMap);
    case 'css_error':
      return fixCssError(error, files);
    case 'hook_violation':
      return fixHookViolation(error, files);
    case 'config':
      return fixConfigError(error, files);
    case 'dependency_conflict':
      return fixDependencyConflict(error, files);
    case 'runtime':
      return fixRuntimeError(error, files, fileMap);
    case 'jsx_error':
      return fixJsxError(error, files, fileMap);
    default:
      return [];
  }
}

function fixJsxError(error: ParsedError, files: ProjectFile[], fileMap: Map<string, ProjectFile>): FixAction[] {
  const componentName = error.importName || '';
  const filePath = error.filePath;
  const targetFile = filePath ? findFile(filePath, fileMap) : undefined;

  if (targetFile && targetFile.content.includes(`<Badge`)) {
    if (!targetFile.content.includes(`import { Badge }`)) {
      return [{
        type: 'patch_file',
        filePath: targetFile.path,
        description: 'Add missing Badge import',
        oldContent: targetFile.content,
        newContent: `import { Badge } from "@/components/ui/badge";\n` + targetFile.content,
        confidence: 'high',
      }];
    }
  }

  if (targetFile && (targetFile.content.includes(`useLocation`) || targetFile.content.includes(`Link`))) {
    if (!targetFile.content.includes(`from "wouter"`) && !targetFile.content.includes(`from 'wouter'`)) {
      return [{
        type: 'patch_file',
        filePath: targetFile.path,
        description: 'Add missing wouter import',
        oldContent: targetFile.content,
        newContent: `import { Link, useLocation } from "wouter";\n` + targetFile.content,
        confidence: 'high',
      }];
    }
  }

  // Adjacent JSX wrapping
  if (targetFile && error.raw.includes('Adjacent JSX elements must be wrapped in an enclosing tag')) {
    if (error.line) {
      const newContent = targetFile.content.replace(/return \(\s*([\s\S]*?)\s*\);/m, (match, p1) => {
        if (p1.trim().startsWith('<') && !p1.trim().startsWith('<>')) {
          return `return (\n    <>\n      ${p1.trim()}\n    </>\n  );`;
        }
        return match;
      });

      if (newContent !== targetFile.content) {
        return [{
          type: 'patch_file',
          filePath: targetFile.path,
          description: 'Wrap adjacent JSX elements in a fragment',
          oldContent: targetFile.content,
          newContent,
          confidence: 'medium',
        }];
      }
    }
  }

  // Scan all files for a missing component import
  if (componentName) {
    for (const file of files) {
      if (/\.(jsx|tsx)$/.test(file.path) && file.content.includes(`<${componentName}`)) {
        const hasImport = file.content.includes('import') && file.content.includes(componentName);
        if (!hasImport) {
          const possibleSource = files.find(f =>
            f.path !== file.path &&
            (f.content.includes(`export default function ${componentName}`) ||
             f.content.includes(`export function ${componentName}`) ||
             f.content.includes(`export const ${componentName}`))
          );
          if (possibleSource) {
            const relativePath = getRelativePath(file.path, possibleSource.path);
            return [{
              type: 'patch_file',
              filePath: file.path,
              description: `Add import for component ${componentName} from ${possibleSource.path}`,
              oldContent: file.content,
              newContent: `import { ${componentName} } from '${relativePath}';\n` + file.content,
              confidence: 'high',
            }];
          }
        }
      }
    }
  }

  return [];
}

function fixMissingImport(error: ParsedError, files: ProjectFile[], fileMap: Map<string, ProjectFile>): FixAction[] {
  const fixes: FixAction[] = [];
  const importPath = error.importName || '';
  const sourceFile = error.filePath ? findFile(error.filePath, fileMap) : undefined;

  if (importPath.startsWith('.') || importPath.startsWith('/')) {
    const correctedPath = findCorrectPath(importPath, files, sourceFile?.path);
    if (correctedPath && sourceFile) {
      const oldImportRegex = new RegExp(`(['"])${escapeRegex(importPath)}\\1`, 'g');
      const newContent = sourceFile.content.replace(oldImportRegex, `'${correctedPath}'`);
      if (newContent !== sourceFile.content) {
        fixes.push({
          type: 'fix_path',
          filePath: sourceFile.path,
          description: `Fix import path: "${importPath}" -> "${correctedPath}"`,
          oldContent: sourceFile.content,
          newContent,
          confidence: 'high',
        });
      }
    } else {
      const missingFile = generateMissingFile(importPath, sourceFile);
      if (missingFile) {
        fixes.push(missingFile);
      }
    }
  } else {
    if (COMMON_PACKAGES[importPath]) {
      fixes.push({
        type: 'add_dependency',
        filePath: 'package.json',
        description: `Add missing package: ${importPath}`,
        newContent: '',
        packageName: importPath,
        packageVersion: COMMON_PACKAGES[importPath],
        confidence: 'high',
      });
    } else {
      const baseName = importPath.split('/')[0];
      const scopedName = importPath.startsWith('@') ? importPath.split('/').slice(0, 2).join('/') : baseName;

      if (COMMON_PACKAGES[scopedName]) {
        fixes.push({
          type: 'add_dependency',
          filePath: 'package.json',
          description: `Add missing package: ${scopedName}`,
          newContent: '',
          packageName: scopedName,
          packageVersion: COMMON_PACKAGES[scopedName],
          confidence: 'high',
        });
      } else {
        fixes.push({
          type: 'add_dependency',
          filePath: 'package.json',
          description: `Add missing package: ${scopedName} (latest)`,
          newContent: '',
          packageName: scopedName,
          packageVersion: 'latest',
          confidence: 'medium',
        });
      }
    }
  }

  return fixes;
}

function fixMissingModule(error: ParsedError, files: ProjectFile[]): FixAction[] {
  const moduleName = error.moduleName || '';
  if (!moduleName) return [];

  if (moduleName.startsWith('.') || moduleName.startsWith('/')) {
    const missingFile = generateMissingFile(moduleName);
    return missingFile ? [missingFile] : [];
  }

  const baseName = moduleName.startsWith('@') ? moduleName.split('/').slice(0, 2).join('/') : moduleName.split('/')[0];
  const version = COMMON_PACKAGES[baseName] || 'latest';

  return [{
    type: 'add_dependency',
    filePath: 'package.json',
    description: `Install missing module: ${baseName}`,
    newContent: '',
    packageName: baseName,
    packageVersion: version,
    confidence: 'high',
  }];
}

function fixMissingFile(error: ParsedError, files: ProjectFile[], fileMap: Map<string, ProjectFile>): FixAction[] {
  const filePath = error.filePath || '';
  if (!filePath) return [];

  const corrected = findCorrectPath(filePath, files);
  if (corrected) {
    return [];
  }

  const missingFile = generateMissingFile(filePath);
  return missingFile ? [missingFile] : [];
}

function fixExportMismatch(error: ParsedError, files: ProjectFile[], fileMap: Map<string, ProjectFile>): FixAction[] {
  const targetPath = error.filePath || '';
  const exportName = error.importName || '';
  const targetFile = findFile(targetPath, fileMap);

  if (!targetFile || !exportName) return [];

  const hasDefaultExport = /export\s+default\s/.test(targetFile.content);
  const hasNamedExport = new RegExp(`export\\s+(?:const|function|class|let|var|type|interface)\\s+${escapeRegex(exportName)}\\b`).test(targetFile.content);

  if (!hasNamedExport) {
    let newContent = targetFile.content;
    if (hasDefaultExport) {
      newContent += `\nexport const ${exportName} = {} as any;\n`;
    } else {
      newContent += `\nexport function ${exportName}() { return null; }\n`;
    }

    return [{
      type: 'patch_file',
      filePath: targetFile.path,
      description: `Add missing export "${exportName}" to ${targetFile.path}`,
      oldContent: targetFile.content,
      newContent,
      confidence: 'medium',
    }];
  }

  return [];
}

function stripTSGenericsForCounting(code: string): string {
  let result = '';
  let depth = 0;
  let inLineComment = false;
  let inBlockComment = false;
  let inString = false;
  let stringChar = '';
  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    const next = code[i + 1] || '';
    if (inLineComment) {
      if (ch === '\n') { inLineComment = false; result += ch; }
      continue;
    }
    if (inBlockComment) {
      if (ch === '*' && next === '/') { inBlockComment = false; i++; }
      continue;
    }
    if (inString) {
      if (ch === stringChar && code[i - 1] !== '\\') inString = false;
      if (depth === 0) result += ch;
      continue;
    }
    if (ch === '/' && next === '/') { inLineComment = true; continue; }
    if (ch === '/' && next === '*') { inBlockComment = true; i++; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { inString = true; stringChar = ch; result += ch; continue; }
    if (ch === '<' && /[\w\]>]/.test(result.trimEnd().slice(-1))) {
      depth++;
      continue;
    }
    if (depth > 0) {
      if (ch === '<') depth++;
      else if (ch === '>') depth--;
      continue;
    }
    result += ch;
  }
  return result;
}

export function fixTSGenericBracketMismatch(content: string): string {
  let fixed = content;

  // Fix 1: `TypeName> =>` → `TypeName) =>`
  // Happens when LLM closes function param list with > instead of )
  fixed = fixed.replace(/([A-Z][A-Za-z0-9_]*)\s*>\s*(=>)/g, '$1) $2');

  // Fix 2: `TypeName> {` when it's a standalone arrow function body opener
  // e.g., `res: Response> {` → `res: Response) {`
  fixed = fixed.replace(/([A-Z][A-Za-z0-9_]*)\s*>\s*(\{)/g, (match, typeName, brace) => {
    return `${typeName}) ${brace}`;
  });

  // Fix 3: `) =>` written as `> =>` after a type annotation on the same param line
  // e.g., `req: Request<P>>, res: Response> =>` (double >)
  fixed = fixed.replace(/>(\s*=>\s*\{)/g, ')$1');

  // Fix 4: Standalone line ending in `> {` that is actually a function body (not JSX or ternary)
  // Only trigger when there is no matching open < on the same line left over
  const lines = fixed.split('\n');
  const repairedLines = lines.map(line => {
    const stripped = stripTSGenericsForCounting(line);
    const openP = (stripped.match(/\(/g) || []).length;
    const closeP = (stripped.match(/\)/g) || []).length;
    if (closeP > openP) {
      // More ) than ( after stripping generics — one ) was actually a > we already fixed
      return line;
    }
    if (openP > closeP && line.trimEnd().endsWith('>')) {
      // Unclosed paren on a line ending with > — the > should be )
      return line.slice(0, line.lastIndexOf('>')) + ')';
    }
    return line;
  });
  fixed = repairedLines.join('\n');

  return fixed;
}

function fixSyntaxError(error: ParsedError, files: ProjectFile[], fileMap: Map<string, ProjectFile>): FixAction[] {
  const targetFile = error.filePath ? findFile(error.filePath, fileMap) : undefined;
  if (!targetFile) return [];

  const content = targetFile.content;
  let fixed = content;

  // Fix TypeScript generic > used in place of ) before applying bracket counts
  fixed = fixTSGenericBracketMismatch(fixed);

  // Count brackets after stripping TS generics so <T> doesn't inflate counts
  const stripped = stripTSGenericsForCounting(fixed);

  const openBraces = (stripped.match(/{/g) || []).length;
  const closeBraces = (stripped.match(/}/g) || []).length;
  if (openBraces > closeBraces) {
    fixed += '\n' + '}'.repeat(openBraces - closeBraces);
  }

  const openParens = (stripped.match(/\(/g) || []).length;
  const closeParens = (stripped.match(/\)/g) || []).length;
  if (openParens > closeParens) {
    fixed += ')'.repeat(openParens - closeParens);
  }

  fixed = fixed.replace(/<(img|br|hr|input|meta|link|area|base|col|embed|source|track|wbr)([^>]*?)(?<!\/)>/gi,
    (match, tag, attrs) => `<${tag}${attrs} />`);

  if (fixed !== content) {
    return [{
      type: 'patch_file',
      filePath: targetFile.path,
      description: `Fix TypeScript bracket/syntax issues in ${targetFile.path}`,
      oldContent: content,
      newContent: fixed,
      confidence: 'medium',
    }];
  }

  return [];
}

const INLINE_REPLACEMENTS: Record<string, string> = {
  toKebab: `((s) => s.replace(/([A-Z])/g, (m, c, i) => (i > 0 ? '-' : '') + c.toLowerCase()))`,
  toTitle: `((s) => s.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim())`,
  toCamel: `((s) => s.replace(/[-_](.)/g, (_, c) => c.toUpperCase()))`,
  toPascal: `((s) => s.replace(/(^|[-_ ])(\\w)/g, (_, __, c) => c.toUpperCase()))`,
  formatCurrency: `((n) => typeof n === 'number' ? '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '$0.00')`,
  formatNumber: `((n) => typeof n === 'number' ? n.toLocaleString() : '0')`,
  formatPercent: `((n) => typeof n === 'number' ? n.toFixed(1) + '%' : '0%')`,
  formatDate: `((d) => d ? new Date(d).toLocaleDateString() : '')`,
  formatDateTime: `((d) => d ? new Date(d).toLocaleString() : '')`,
  safeGet: `((obj, key) => obj && typeof obj === 'object' ? (obj[key] ?? '') : '')`,
};

const UTIL_EXPORTS = ['cn', 'formatCurrency', 'formatNumber', 'safeGet', 'toTitleCase', 'toKebabCase', 'formatPercent', 'formatDate', 'formatDateTime'];

function fixReferenceError(error: ParsedError, files: ProjectFile[]): FixAction[] {
  const varName = error.importName || '';
  if (!varName) return [];

  if (REACT_HOOKS.includes(varName)) {
    for (const file of files) {
      if (file.content.includes(varName) && !file.content.includes(`import`) && /\.(jsx|tsx)$/.test(file.path)) {
        const importStatement = `import { ${varName} } from 'react';\n`;
        return [{
          type: 'patch_file',
          filePath: file.path,
          description: `Add missing import for ${varName} from 'react'`,
          oldContent: file.content,
          newContent: importStatement + file.content,
          confidence: 'high',
        }];
      }

      if (file.content.includes(varName) && /\.(jsx|tsx)$/.test(file.path)) {
        const reactImportMatch = file.content.match(/import\s*{([^}]*)}\s*from\s*['"]react['"]/);
        if (reactImportMatch && !reactImportMatch[1].includes(varName)) {
          const currentImports = reactImportMatch[1].trim();
          const newImports = currentImports ? `${currentImports}, ${varName}` : varName;
          const newContent = file.content.replace(reactImportMatch[0], `import { ${newImports} } from 'react'`);
          return [{
            type: 'patch_file',
            filePath: file.path,
            description: `Add ${varName} to React imports in ${file.path}`,
            oldContent: file.content,
            newContent,
            confidence: 'high',
          }];
        }
      }
    }
  }

  if (UTIL_EXPORTS.includes(varName)) {
    for (const file of files) {
      if (file.content.includes(varName) && /\.(jsx|tsx)$/.test(file.path)) {
        const utilsImportMatch = file.content.match(/import\s*{([^}]*)}\s*from\s*["']@\/lib\/utils["']/);
        if (utilsImportMatch && !utilsImportMatch[1].includes(varName)) {
          const currentImports = utilsImportMatch[1].trim();
          const newImports = `${currentImports}, ${varName}`;
          const newContent = file.content.replace(utilsImportMatch[0], `import { ${newImports} } from "@/lib/utils"`);
          return [{
            type: 'patch_file',
            filePath: file.path,
            description: `Add ${varName} to utils imports in ${file.path}`,
            oldContent: file.content,
            newContent,
            confidence: 'high',
          }];
        } else if (!utilsImportMatch) {
          const importStatement = `import { ${varName} } from "@/lib/utils";\n`;
          return [{
            type: 'patch_file',
            filePath: file.path,
            description: `Add missing utils import for ${varName}`,
            oldContent: file.content,
            newContent: importStatement + file.content,
            confidence: 'high',
          }];
        }
      }
    }
  }

  for (const sourceFile of files) {
    const exportMatch = sourceFile.content.match(new RegExp(`export\\s+(?:default\\s+)?(?:function|const|class)\\s+${varName}\\b`));
    if (exportMatch && sourceFile.path !== error.filePath) {
      const normalizedPath = sourceFile.path.replace(/^(client\/)?src\//, '');
      const importPath = '@/' + normalizedPath.replace(/\.(tsx?|jsx?)$/, '');
      const isDefault = exportMatch[0].includes('default');
      const importStatement = isDefault
        ? `import ${varName} from "${importPath}";\n`
        : `import { ${varName} } from "${importPath}";\n`;

      for (const file of files) {
        if (file.content.includes(varName) && /\.(jsx|tsx)$/.test(file.path) && !file.content.includes(`from "${importPath}"`)) {
          const insertPos = findImportInsertPosition(file.content);
          const newContent = file.content.slice(0, insertPos) + importStatement + file.content.slice(insertPos);
          return [{
            type: 'patch_file',
            filePath: file.path,
            description: `Add missing import for ${varName} from ${importPath}`,
            oldContent: file.content,
            newContent,
            confidence: 'high',
          }];
        }
      }
    }
  }

  if (INLINE_REPLACEMENTS[varName]) {
    for (const file of files) {
      if (file.content.includes(varName) && /\.(jsx|tsx|ts|js)$/.test(file.path)) {
        const alreadyDeclared = new RegExp(`(?:const|let|var|function)\\s+${varName}\\b`).test(file.content);
        if (alreadyDeclared) continue;
        const stub = `const ${varName} = ${INLINE_REPLACEMENTS[varName]};\n`;
        const insertPos = findImportInsertPosition(file.content);
        const newContent = file.content.slice(0, insertPos) + stub + file.content.slice(insertPos);
        return [{
          type: 'patch_file',
          filePath: file.path,
          description: `Add inline implementation for missing ${varName}`,
          oldContent: file.content,
          newContent,
          confidence: 'medium',
        }];
      }
    }
  }

  for (const file of files) {
    if (file.content.includes(varName) && /\.(jsx|tsx|ts|js)$/.test(file.path)) {
      const alreadyDeclared = new RegExp(`(?:const|let|var|function)\\s+${varName}\\b`).test(file.content);
      if (alreadyDeclared) continue;
      const stub = `const ${varName} = (...args: any[]) => args[0] ?? '';\n`;
      const insertPos = findImportInsertPosition(file.content);
      const newContent = file.content.slice(0, insertPos) + stub + file.content.slice(insertPos);
      return [{
        type: 'patch_file',
        filePath: file.path,
        description: `Add fallback stub for undefined ${varName} to prevent crash`,
        oldContent: file.content,
        newContent,
        confidence: 'low',
      }];
    }
  }

  return [];
}

function findImportInsertPosition(content: string): number {
  const lines = content.split('\n');
  let lastImportLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*import\s/.test(lines[i])) {
      lastImportLine = i;
    }
  }
  if (lastImportLine === -1) return 0;
  let pos = 0;
  for (let i = 0; i <= lastImportLine; i++) {
    pos += lines[i].length + 1;
  }
  return pos;
}

function fixCssError(error: ParsedError, files: ProjectFile[]): FixAction[] {
  const atRule = error.importName || '';

  if (atRule === 'tailwind' || atRule === 'apply' || atRule === 'layer' || atRule === 'screen') {
    const cssFile = files.find(f => f.path.endsWith('.css') && f.content.includes(`@${atRule}`));
    if (cssFile) {
      return [{
        type: 'patch_file',
        filePath: cssFile.path,
        description: `CSS @${atRule} requires PostCSS/Tailwind configuration`,
        oldContent: cssFile.content,
        newContent: cssFile.content,
        confidence: 'low',
      }];
    }
  }

  return [];
}

function fixHookViolation(error: ParsedError, files: ProjectFile[]): FixAction[] {
  const pkgFile = files.find(f => f.path === 'package.json' || f.path.endsWith('/package.json'));
  if (!pkgFile) return [];

  try {
    const pkg = JSON.parse(pkgFile.content);
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    if (deps['react'] && deps['react-dom']) {
      const reactVersion = deps['react'].replace(/[\^~]/, '');
      const reactDomVersion = deps['react-dom'].replace(/[\^~]/, '');
      if (reactVersion !== reactDomVersion) {
        const newPkg = { ...pkg };
        newPkg.dependencies = { ...newPkg.dependencies, 'react-dom': deps['react'] };
        return [{
          type: 'patch_file',
          filePath: pkgFile.path,
          description: 'Align react and react-dom versions',
          oldContent: pkgFile.content,
          newContent: JSON.stringify(newPkg, null, 2),
          confidence: 'high',
        }];
      }
    }
  } catch {}

  return [];
}

function fixConfigError(error: ParsedError, files: ProjectFile[]): FixAction[] {
  return [];
}

function fixDependencyConflict(error: ParsedError, files: ProjectFile[]): FixAction[] {
  return [];
}

function findFile(path: string, fileMap: Map<string, ProjectFile>): ProjectFile | undefined {
  const cleanPath = path.replace(/^\.?\//, '');
  return fileMap.get(path) || fileMap.get(cleanPath) || fileMap.get('./' + cleanPath) || fileMap.get('/' + cleanPath);
}

function findCorrectPath(importPath: string, files: ProjectFile[], fromFile?: string): string | null {
  const cleanImport = importPath.replace(/^\.\//, '').replace(/^\//, '');

  for (const file of files) {
    const cleanFile = file.path.replace(/^\.\//, '').replace(/^\//, '');

    if (cleanFile === cleanImport) return './' + cleanFile;

    const withoutExt = cleanFile.replace(/\.\w+$/, '');
    const importWithoutExt = cleanImport.replace(/\.\w+$/, '');
    if (withoutExt === importWithoutExt) {
      if (fromFile) {
        return getRelativePath(fromFile, file.path);
      }
      return './' + cleanFile;
    }

    const fileName = cleanFile.split('/').pop()?.replace(/\.\w+$/, '');
    const importFileName = cleanImport.split('/').pop()?.replace(/\.\w+$/, '');
    if (fileName && importFileName && fileName.toLowerCase() === importFileName.toLowerCase() && fileName !== importFileName) {
      if (fromFile) {
        return getRelativePath(fromFile, file.path);
      }
      return './' + cleanFile;
    }
  }

  const extensions = ['.tsx', '.ts', '.jsx', '.js', '.css', '.json'];
  for (const ext of extensions) {
    for (const file of files) {
      const cleanFile = file.path.replace(/^\.\//, '').replace(/^\//, '');
      if (cleanFile === cleanImport + ext) {
        if (fromFile) {
          return getRelativePath(fromFile, file.path);
        }
        return './' + cleanFile;
      }

      if (cleanFile === cleanImport + '/index' + ext) {
        if (fromFile) {
          return getRelativePath(fromFile, file.path);
        }
        return './' + cleanFile;
      }
    }
  }

  return null;
}

function generateMissingFile(importPath: string, sourceFile?: ProjectFile): FixAction | null {
  let filePath = importPath.replace(/^\.\//, '').replace(/^\//, '');

  if (!/\.\w+$/.test(filePath)) {
    if (importPath.includes('component') || importPath.includes('Component') || /^[A-Z]/.test(filePath.split('/').pop() || '')) {
      filePath += '.tsx';
    } else if (importPath.includes('style') || importPath.includes('css')) {
      filePath += '.css';
    } else {
      filePath += '.ts';
    }
  }

  const ext = filePath.split('.').pop() || '';
  const baseName = filePath.split('/').pop()?.replace(/\.\w+$/, '') || 'Component';
  const componentName = baseName.charAt(0).toUpperCase() + baseName.slice(1);

  let content = '';

  if (ext === 'tsx' || ext === 'jsx') {
    content = `export default function ${componentName}() {\n  return (\n    <div>\n      <h2>${componentName}</h2>\n      <p>This component is under construction.</p>\n    </div>\n  );\n}\n`;

    if (sourceFile) {
      const importRegex = new RegExp(`import\\s*{([^}]*)}\\s*from\\s*['"].*?${escapeRegex(baseName)}['"]`);
      const importMatch = sourceFile.content.match(importRegex);
      if (importMatch) {
        const namedExports = importMatch[1].split(',').map(s => s.trim()).filter(Boolean);
        const exports = namedExports
          .filter(n => n !== 'default' && n !== componentName)
          .map(n => `export const ${n} = null;\n`)
          .join('');
        if (exports) {
          content += '\n' + exports;
        }
      }
    }
  } else if (ext === 'ts' || ext === 'js') {
    content = `// ${baseName} module\n\nexport default {};\n`;

    if (sourceFile) {
      const importRegex = new RegExp(`import\\s*{([^}]*)}\\s*from\\s*['"].*?${escapeRegex(baseName)}['"]`);
      const importMatch = sourceFile.content.match(importRegex);
      if (importMatch) {
        const namedExports = importMatch[1].split(',').map(s => s.trim()).filter(Boolean);
        content = `// ${baseName} module\n\n`;
        for (const name of namedExports) {
          content += `export const ${name} = null;\n`;
        }
        content += '\nexport default {};\n';
      }
    }
  } else if (ext === 'css') {
    content = `/* ${baseName} styles */\n`;
  } else if (ext === 'json') {
    content = '{}';
  } else {
    return null;
  }

  return {
    type: 'create_file',
    filePath,
    description: `Generate missing file: ${filePath}`,
    newContent: content,
    confidence: 'medium',
  };
}

function getRelativePath(from: string, to: string): string {
  const fromParts = from.replace(/^\.\//, '').split('/');
  fromParts.pop();
  const toParts = to.replace(/^\.\//, '').split('/');

  let commonLength = 0;
  for (let i = 0; i < Math.min(fromParts.length, toParts.length); i++) {
    if (fromParts[i] === toParts[i]) {
      commonLength++;
    } else {
      break;
    }
  }

  const upCount = fromParts.length - commonLength;
  const upPath = upCount > 0 ? '../'.repeat(upCount) : './';
  const downPath = toParts.slice(commonLength).join('/');

  const result = upPath + downPath;
  return result.replace(/\.\w+$/, '');
}

function deduplicateFixes(fixes: FixAction[]): FixAction[] {
  const seen = new Set<string>();
  return fixes.filter(fix => {
    const key = `${fix.type}:${fix.filePath}:${fix.description}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildSummary(fixes: FixAction[], unfixable: ParsedError[]): string {
  const parts: string[] = [];

  const byType = fixes.reduce((acc, f) => {
    acc[f.type] = (acc[f.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (byType['fix_path']) parts.push(`${byType['fix_path']} import path(s) corrected`);
  if (byType['create_file']) parts.push(`${byType['create_file']} missing file(s) generated`);
  if (byType['add_dependency']) parts.push(`${byType['add_dependency']} dependency(ies) added`);
  if (byType['patch_file']) parts.push(`${byType['patch_file']} file(s) patched`);
  if (byType['delete_import']) parts.push(`${byType['delete_import']} import(s) removed`);

  if (unfixable.length > 0) {
    parts.push(`${unfixable.length} issue(s) need manual review`);
  }

  return parts.length > 0 ? parts.join(', ') : 'No fixes needed';
}

export function validateImportPaths(files: ProjectFile[]): FixAction[] {
  const fixes: FixAction[] = [];
  const filePaths = new Set(files.map(f => f.path.replace(/^\.\//, '')));
  const filePathsNoExt = new Set(files.map(f => f.path.replace(/^\.\//, '').replace(/\.\w+$/, '')));

  for (const file of files) {
    if (!/\.(js|jsx|ts|tsx)$/.test(file.path)) continue;

    const importRegex = /import\s+(?:.*?\s+from\s+)?['"](\.[^'"]+)['"]/g;
    let match;
    let newContent = file.content;
    let changed = false;

    while ((match = importRegex.exec(file.content)) !== null) {
      const importPath = match[1];
      const resolvedPath = resolveImportPath(file.path, importPath);

      if (!resolvedPath) continue;

      const exists = filePaths.has(resolvedPath) || filePathsNoExt.has(resolvedPath.replace(/\.\w+$/, ''));

      if (!exists) {
        const correctedPath = findCorrectPath(importPath, files, file.path);
        if (correctedPath) {
          newContent = newContent.replace(
            new RegExp(`(['"])${escapeRegex(importPath)}\\1`),
            `'${correctedPath}'`
          );
          changed = true;
        }
      }
    }

    if (changed) {
      fixes.push({
        type: 'fix_path',
        filePath: file.path,
        description: `Fix import paths in ${file.path}`,
        oldContent: file.content,
        newContent,
        confidence: 'high',
      });
    }
  }

  return fixes;
}

function resolveImportPath(fromFile: string, importPath: string): string | null {
  if (!importPath.startsWith('.')) return null;

  const fromDir = fromFile.replace(/^\.\//, '').split('/').slice(0, -1).join('/');
  const parts = importPath.split('/');
  const resultParts = fromDir ? fromDir.split('/') : [];

  for (const part of parts) {
    if (part === '.') continue;
    if (part === '..') {
      resultParts.pop();
    } else {
      resultParts.push(part);
    }
  }

  return resultParts.join('/');
}

export function addDependenciesToPackageJson(packageJsonContent: string, dependencies: { name: string; version: string }[]): string {
  try {
    const pkg = JSON.parse(packageJsonContent);
    if (!pkg.dependencies) pkg.dependencies = {};

    for (const dep of dependencies) {
      if (!pkg.dependencies[dep.name]) {
        pkg.dependencies[dep.name] = dep.version;
      }
    }

    return JSON.stringify(pkg, null, 2);
  } catch {
    return packageJsonContent;
  }
}

function fixRuntimeError(error: ParsedError, files: ProjectFile[], fileMap: Map<string, ProjectFile>): FixAction[] {
  const fixes: FixAction[] = [];
  const raw = error.raw;

  if (/Cannot read propert(?:y|ies) of (?:undefined|null)/.test(raw)) {
    const propMatch = raw.match(/reading '(\w+)'/);
    const propName = propMatch ? propMatch[1] : null;
    const targetFile = error.filePath ? findFile(error.filePath, fileMap) : undefined;
    const searchFiles = targetFile ? [targetFile] : files.filter(f => /\.(tsx?|jsx?)$/.test(f.path));

    for (const file of searchFiles) {
      let content = file.content;
      let changed = false;

      if (propName) {
        const dotAccessPattern = new RegExp(`(\\w+)\\.${escapeRegex(propName)}\\b`, 'g');
        const replaced = content.replace(dotAccessPattern, (match, obj) => {
          if (['Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'console', 'window', 'document', 'process'].includes(obj)) {
            return match;
          }
          changed = true;
          return `${obj}?.${propName}`;
        });
        if (changed) content = replaced;
      }

      const mapOnUndefinedPattern = /(\w+)(\.map\s*\()/g;
      const mapReplaced = content.replace(mapOnUndefinedPattern, (match, varName, mapCall) => {
        if (['Array', 'Object', 'JSON', 'Math'].includes(varName)) return match;
        if (content.includes(`${varName}?.map`)) return match;
        changed = true;
        return `(${varName} || [])${mapCall}`;
      });
      if (mapReplaced !== content) content = mapReplaced;

      const forEachPattern = /(\w+)(\.forEach\s*\()/g;
      const forEachReplaced = content.replace(forEachPattern, (match, varName, call) => {
        if (['Array', 'Object', 'JSON', 'document'].includes(varName)) return match;
        changed = true;
        return `(${varName} || [])${call}`;
      });
      if (forEachReplaced !== content) content = forEachReplaced;

      if (changed && content !== file.content) {
        fixes.push({
          type: 'patch_file',
          filePath: file.path,
          description: `Add null safety (optional chaining / fallback arrays) for property access in ${file.path}`,
          oldContent: file.content,
          newContent: content,
          confidence: 'medium',
        });
      }
    }
  }

  if (/is not a function/.test(raw)) {
    const fnMatch = raw.match(/(?:TypeError|Error): ([\w.]+) is not a function/);
    const fnName = fnMatch ? fnMatch[1] : error.importName;
    if (fnName) {
      const parts = fnName.split('.');
      const baseName = parts[0];

      for (const file of files) {
        if (!/\.(tsx?|jsx?)$/.test(file.path)) continue;
        if (!file.content.includes(baseName)) continue;

        let content = file.content;
        let changed = false;

        const defaultImportPattern = new RegExp(`import\\s+${escapeRegex(baseName)}\\s+from\\s+['"]([^'"]+)['"]`);
        const namedImportPattern = new RegExp(`import\\s*\\{[^}]*\\b${escapeRegex(baseName)}\\b[^}]*\\}\\s*from\\s+['"]([^'"]+)['"]`);

        if (defaultImportPattern.test(content)) {
          const match = content.match(defaultImportPattern);
          if (match) {
            const modulePath = match[1];
            const moduleFile = findFile(modulePath, fileMap);
            if (moduleFile && !moduleFile.content.includes('export default')) {
              const namedExportCheck = new RegExp(`export\\s+(?:const|function|class)\\s+${escapeRegex(baseName)}`);
              if (namedExportCheck.test(moduleFile.content)) {
                content = content.replace(defaultImportPattern, `import { ${baseName} } from '${modulePath}'`);
                changed = true;
              }
            }
          }
        } else if (namedImportPattern.test(content)) {
          const match = content.match(namedImportPattern);
          if (match) {
            const modulePath = match[1];
            const moduleFile = findFile(modulePath, fileMap);
            if (moduleFile && moduleFile.content.includes('export default') && !new RegExp(`export\\s+(?:const|function|class)\\s+${escapeRegex(baseName)}`).test(moduleFile.content)) {
              content = content.replace(namedImportPattern, `import ${baseName} from '${modulePath}'`);
              changed = true;
            }
          }
        }

        if (parts.length > 1) {
          const methodName = parts[parts.length - 1];
          const mapCallPattern = new RegExp(`(\\w+)\\.${escapeRegex(methodName)}\\s*\\(`);
          if (mapCallPattern.test(content) && methodName === 'map') {
            content = content.replace(
              new RegExp(`(\\w+)\\.map\\s*\\(`, 'g'),
              (match, varName) => {
                if (['Array', 'Object'].includes(varName)) return match;
                changed = true;
                return `Array.from(${varName} || []).map(`;
              }
            );
          }
        }

        if (changed && content !== file.content) {
          fixes.push({
            type: 'patch_file',
            filePath: file.path,
            description: `Fix "${fnName} is not a function" - correct import style or add type guards in ${file.path}`,
            oldContent: file.content,
            newContent: content,
            confidence: 'medium',
          });
        }
      }
    }
  }

  if (/Objects are not valid as a React child/.test(raw)) {
    for (const file of files) {
      if (!/\.(tsx|jsx)$/.test(file.path)) continue;

      let content = file.content;
      let changed = false;

      const jsxObjectPattern = /(\{)(\s*)([\w.]+)(\s*\})/g;
      content = content.replace(jsxObjectPattern, (match, open, ws1, expr, close) => {
        if (/^['"`\d]/.test(expr)) return match;
        if (expr.includes('(') || expr.includes(')')) return match;
        if (/^(?:true|false|null|undefined)$/.test(expr)) return match;
        if (expr.startsWith('...')) return match;
        const parts = expr.split('.');
        const varName = parts[0];
        const isLikelyObject = /^(?:data|result|response|item|record|entry|obj|config|settings|user|profile|payload)$/i.test(varName);
        if (isLikelyObject && parts.length === 1) {
          changed = true;
          return `{${ws1}JSON.stringify(${expr})${close}`;
        }
        return match;
      });

      const dateRenderPattern = /\{(\s*)(new Date\([^)]*\))(\s*)\}/g;
      content = content.replace(dateRenderPattern, (match, ws1, dateExpr, ws2) => {
        changed = true;
        return `{${ws1}${dateExpr}.toLocaleDateString()${ws2}}`;
      });

      const dateVarPattern = /\{(\s*)([\w.]+Date[\w.]*)(\s*)\}/g;
      content = content.replace(dateVarPattern, (match, ws1, expr, ws2) => {
        if (expr.includes('toLocale') || expr.includes('toString') || expr.includes('format')) return match;
        changed = true;
        return `{${ws1}String(${expr})${ws2}}`;
      });

      if (changed && content !== file.content) {
        fixes.push({
          type: 'patch_file',
          filePath: file.path,
          description: `Fix "Objects are not valid as a React child" - stringify or extract properties in ${file.path}`,
          oldContent: file.content,
          newContent: content,
          confidence: 'medium',
        });
      }
    }
  }

  if (/Too many re-renders|Maximum update depth exceeded/.test(raw)) {
    for (const file of files) {
      if (!/\.(tsx|jsx)$/.test(file.path)) continue;

      let content = file.content;
      let changed = false;

      const inlineSetStatePattern = /(\w+)=\{(set\w+)\(([^)]*)\)\}/g;
      content = content.replace(inlineSetStatePattern, (match, attr, setter, args) => {
        if (/^on[A-Z]/.test(attr)) {
          changed = true;
          return `${attr}={() => ${setter}(${args})}`;
        }
        return match;
      });

      const directCallInJsx = /(\w+)=\{(\(\)\s*=>\s*)?(\w+)\(([^)]*)\)\s*\}/g;
      content = content.replace(directCallInJsx, (match, attr, arrow, fnName, args) => {
        if (arrow) return match;
        if (/^on[A-Z]/.test(attr) && /^(?:set[A-Z]|dispatch|navigate|push)/.test(fnName)) {
          changed = true;
          return `${attr}={() => ${fnName}(${args})}`;
        }
        return match;
      });

      if (changed && content !== file.content) {
        fixes.push({
          type: 'patch_file',
          filePath: file.path,
          description: `Fix "Too many re-renders" - wrap setState calls in arrow functions in ${file.path}`,
          oldContent: file.content,
          newContent: content,
          confidence: 'high',
        });
      }
    }
  }

  if (/Rendered more hooks than during the previous render|change in the order of Hooks/.test(raw)) {
    for (const file of files) {
      if (!/\.(tsx|jsx)$/.test(file.path)) continue;
      if (!REACT_HOOKS.some(h => file.content.includes(h))) continue;

      let content = file.content;
      let changed = false;

      const conditionalHookPattern = /if\s*\([^)]+\)\s*\{[^}]*\b(use(?:State|Effect|Callback|Memo|Ref|Context|Reducer|Query|Mutation))\s*\(/;
      const conditionalMatch = content.match(conditionalHookPattern);
      if (conditionalMatch) {
        const hookName = conditionalMatch[1];
        fixes.push({
          type: 'patch_file',
          filePath: file.path,
          description: `Warning: Hook "${hookName}" called conditionally in ${file.path} - hooks must be called in the same order every render. Move hook call before any conditional returns or if-blocks.`,
          oldContent: content,
          newContent: content,
          confidence: 'low',
        });
      }

      const earlyReturnBeforeHooks = /^(\s*(?:export\s+)?(?:default\s+)?function\s+\w+[^{]*\{[\s\S]*?)(return\s+[^;]+;)([\s\S]*?)(use(?:State|Effect|Callback|Memo|Ref)\s*\()/m;
      const earlyReturnMatch = content.match(earlyReturnBeforeHooks);
      if (earlyReturnMatch) {
        fixes.push({
          type: 'patch_file',
          filePath: file.path,
          description: `Warning: Early return detected before hook calls in ${file.path} - move all hooks before any conditional returns.`,
          oldContent: content,
          newContent: content,
          confidence: 'low',
        });
      }
    }
  }

  if (/Each child in a list should have a unique "key" prop/.test(raw)) {
    for (const file of files) {
      if (!/\.(tsx|jsx)$/.test(file.path)) continue;

      let content = file.content;
      let changed = false;

      const mapWithJsxPattern = /\.map\s*\(\s*\(\s*(\w+)\s*(?:,\s*(\w+))?\s*\)\s*=>\s*(?:\(?\s*)<(\w+)(?![^>]*\bkey\b)/g;
      content = content.replace(mapWithJsxPattern, (match, itemVar, indexVar, tagName) => {
        changed = true;
        const keyProp = indexVar ? `key={${indexVar}}` : `key={${itemVar}.id || ${itemVar}}`;
        return match.replace(`<${tagName}`, `<${tagName} ${keyProp}`);
      });

      const mapWithReturnPattern = /\.map\s*\(\s*\(\s*(\w+)\s*(?:,\s*(\w+))?\s*\)\s*=>\s*\{[\s\S]*?return\s*(?:\(?\s*)<(\w+)(?![^>]*\bkey\b)/g;
      content = content.replace(mapWithReturnPattern, (match, itemVar, indexVar, tagName) => {
        changed = true;
        const keyProp = indexVar ? `key={${indexVar}}` : `key={${itemVar}.id || ${itemVar}}`;
        return match.replace(`<${tagName}`, `<${tagName} ${keyProp}`);
      });

      if (changed && content !== file.content) {
        fixes.push({
          type: 'patch_file',
          filePath: file.path,
          description: `Add missing "key" props to list items in ${file.path}`,
          oldContent: file.content,
          newContent: content,
          confidence: 'high',
        });
      }
    }
  }

  if (/Cannot update during an existing state transition/.test(raw)) {
    for (const file of files) {
      if (!/\.(tsx|jsx)$/.test(file.path)) continue;

      let content = file.content;
      let changed = false;

      const renderBodySetStatePattern = /^(\s*)(set\w+\([^)]*\)\s*;)/gm;
      const lines = content.split('\n');
      const newLines: string[] = [];
      let inComponent = false;
      let inHandler = false;
      let braceDepth = 0;

      for (const line of lines) {
        const componentStart = /(?:export\s+)?(?:default\s+)?function\s+[A-Z]\w*/.test(line);
        if (componentStart) inComponent = true;

        const handlerStart = /(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)|[\w]+)\s*=>/.test(line) ||
                             /(?:function\s+\w+|on[A-Z]\w*)\s*\(/.test(line) ||
                             /useEffect\s*\(/.test(line) ||
                             /useCallback\s*\(/.test(line);
        if (handlerStart) inHandler = true;

        if (inComponent && !inHandler) {
          const setStateMatch = line.match(/^(\s*)(set[A-Z]\w*\([^)]*\)\s*;)/);
          if (setStateMatch) {
            const indent = setStateMatch[1];
            const stateCall = setStateMatch[2];
            newLines.push(`${indent}useEffect(() => { ${stateCall} }, []);`);
            changed = true;
            continue;
          }
        }

        newLines.push(line);
      }

      if (changed) {
        const newContent = newLines.join('\n');
        fixes.push({
          type: 'patch_file',
          filePath: file.path,
          description: `Wrap state updates in useEffect to prevent updates during render in ${file.path}`,
          oldContent: file.content,
          newContent,
          confidence: 'medium',
        });
      }
    }
  }

  if (/(?:fetch|axios|XMLHttpRequest).*?(?:Failed to fetch|Network Error|net::ERR_)/.test(raw) ||
      /(?:Unhandled|Uncaught) (?:Promise |)(?:Rejection|Error)/.test(raw)) {
    for (const file of files) {
      if (!/\.(tsx?|jsx?)$/.test(file.path)) continue;

      let content = file.content;
      let changed = false;

      const fetchWithoutCatch = /(?:^|\n)([ \t]*)((?:const|let|var)\s+\w+\s*=\s*)?(?:await\s+)?fetch\s*\([^)]+\)(?![\s\S]*?\.catch)(?![\s\S]*?catch\s*\()/gm;
      content = content.replace(fetchWithoutCatch, (match, indent, assignment) => {
        if (content.includes('try') && content.indexOf('try') < content.indexOf(match)) {
          return match;
        }
        changed = true;
        const fetchExpr = match.trim();
        return `\n${indent}try {\n${indent}  ${fetchExpr}\n${indent}} catch (err) {\n${indent}  console.error('Fetch error:', err);\n${indent}}`;
      });

      const thenWithoutCatch = /\.(then\s*\([^)]*\)(?:\s*\.then\s*\([^)]*\))*)(?!\s*\.catch)/g;
      content = content.replace(thenWithoutCatch, (match) => {
        changed = true;
        return `${match}.catch((err: unknown) => console.error('Unhandled promise error:', err))`;
      });

      if (changed && content !== file.content) {
        fixes.push({
          type: 'patch_file',
          filePath: file.path,
          description: `Add error handling for fetch/promise calls in ${file.path}`,
          oldContent: file.content,
          newContent: content,
          confidence: 'medium',
        });
      }
    }
  }

  if (/Hydration failed/.test(raw)) {
    for (const file of files) {
      if (!/\.(tsx|jsx)$/.test(file.path)) continue;

      let content = file.content;
      let changed = false;

      if (content.includes('typeof window') || content.includes('useEffect')) {
        const windowCheckPattern = /\{(\s*)typeof window !== ['"]undefined['"]\s*&&\s*([\s\S]+?)(\s*)\}/;
        if (!windowCheckPattern.test(content)) {
          const dateNowPattern = /\{(\s*)(?:Date\.now\(\)|new Date\(\)\.toISOString\(\)|Math\.random\(\))(\s*)\}/g;
          content = content.replace(dateNowPattern, (match) => {
            changed = true;
            return match;
          });
        }
      }

      if (/dangerouslySetInnerHTML/.test(content) && !content.includes('suppressHydrationWarning')) {
        content = content.replace(
          /(<\w+)(\s+dangerouslySetInnerHTML)/g,
          (match, tag, attr) => {
            changed = true;
            return `${tag} suppressHydrationWarning${attr}`;
          }
        );
      }

      if (changed && content !== file.content) {
        fixes.push({
          type: 'patch_file',
          filePath: file.path,
          description: `Fix hydration mismatch issues in ${file.path}`,
          oldContent: file.content,
          newContent: content,
          confidence: 'medium',
        });
      }
    }
  }

  return fixes;
}

export function classifyRuntimeError(errorMessage: string): {
  category: string;
  severity: 'critical' | 'warning' | 'info';
  description: string;
  suggestedFix: string;
} {
  if (/Cannot read propert(?:y|ies) of (?:undefined|null)/.test(errorMessage)) {
    return {
      category: 'null_reference',
      severity: 'critical',
      description: 'Attempted to access a property on an undefined or null value. This often happens when API data has not loaded yet or a variable was not properly initialized.',
      suggestedFix: 'Add optional chaining (?.) to property accesses, provide default values with ?? or ||, and check for loading states before accessing data.',
    };
  }

  if (/is not a function/.test(errorMessage)) {
    return {
      category: 'type_mismatch',
      severity: 'critical',
      description: 'A value was called as a function but is not callable. This may be caused by incorrect import/export patterns or accessing the wrong property.',
      suggestedFix: 'Verify import statements match the export style (default vs named). Check that the variable holds a function before calling it.',
    };
  }

  if (/Objects are not valid as a React child/.test(errorMessage)) {
    return {
      category: 'invalid_render',
      severity: 'critical',
      description: 'A plain object or array is being rendered directly in JSX. React can only render strings, numbers, elements, or null.',
      suggestedFix: 'Use JSON.stringify() for debugging, access a specific string/number property on the object, or map arrays to JSX elements.',
    };
  }

  if (/Too many re-renders/.test(errorMessage)) {
    return {
      category: 'infinite_loop',
      severity: 'critical',
      description: 'The component is re-rendering infinitely, usually because setState is called directly in the render body without proper guards.',
      suggestedFix: 'Wrap state updates in useEffect with proper dependencies, or ensure event handlers use arrow functions: onClick={() => setState(x)} instead of onClick={setState(x)}.',
    };
  }

  if (/Rendered more hooks|change in the order of Hooks/.test(errorMessage)) {
    return {
      category: 'hook_order_violation',
      severity: 'critical',
      description: 'React hooks must be called in the exact same order on every render. Conditional or looped hook calls break this rule.',
      suggestedFix: 'Move all hook calls to the top level of the component function, before any conditional returns, if-blocks, or loops.',
    };
  }

  if (/Maximum update depth exceeded/.test(errorMessage)) {
    return {
      category: 'infinite_update',
      severity: 'critical',
      description: 'A component triggered an infinite chain of state updates, often from useEffect with incorrect dependencies or from calling setState during render.',
      suggestedFix: 'Check useEffect dependency arrays for objects/arrays that create new references each render. Use useMemo/useCallback to stabilize references.',
    };
  }

  if (/Each child in a list should have a unique "key" prop/.test(errorMessage)) {
    return {
      category: 'missing_key',
      severity: 'warning',
      description: 'Elements rendered in a list via .map() are missing unique key props, which degrades performance and can cause rendering bugs.',
      suggestedFix: 'Add a unique key prop to the outermost element inside .map() callbacks: key={item.id} using a stable identifier. Avoid using array index as key if the list can be reordered.',
    };
  }

  if (/Cannot update during an existing state transition/.test(errorMessage)) {
    return {
      category: 'state_during_render',
      severity: 'critical',
      description: 'A state update was triggered while another component was rendering. This typically happens when a parent sets state in response to a child render.',
      suggestedFix: 'Defer the state update to useEffect or wrap in queueMicrotask/setTimeout to move it outside the current render cycle.',
    };
  }

  if (/Failed to fetch|Network Error|net::ERR_/.test(errorMessage)) {
    return {
      category: 'network_error',
      severity: 'warning',
      description: 'A network request failed, possibly due to server being unavailable, CORS issues, or connectivity problems.',
      suggestedFix: 'Add try/catch around fetch calls, implement retry logic, and display user-friendly error states. Check CORS configuration on the server.',
    };
  }

  if (/Unhandled.*(?:Rejection|Error)|Uncaught.*(?:Rejection|Error)/.test(errorMessage)) {
    return {
      category: 'unhandled_error',
      severity: 'warning',
      description: 'An error or promise rejection was not caught by any error handler, which may crash the application.',
      suggestedFix: 'Add .catch() to promise chains, wrap async code in try/catch, and add React Error Boundaries around critical components.',
    };
  }

  if (/Hydration failed/.test(errorMessage)) {
    return {
      category: 'hydration_mismatch',
      severity: 'warning',
      description: 'The server-rendered HTML does not match what React generated on the client. This is common when using browser-only APIs during SSR.',
      suggestedFix: 'Guard browser-only code with typeof window checks, use useEffect for client-only logic, and add suppressHydrationWarning where appropriate.',
    };
  }

  return {
    category: 'unknown',
    severity: 'info',
    description: `An unrecognized runtime error occurred: ${errorMessage.slice(0, 150)}`,
    suggestedFix: 'Check the browser console for the full stack trace, identify the source file and line number, and review recent code changes.',
  };
}

export function generateRuntimeSafetyPatches(files: ProjectFile[]): FixAction[] {
  const fixes: FixAction[] = [];

  for (const file of files) {
    if (!/\.(tsx|jsx)$/.test(file.path)) continue;

    let content = file.content;
    let changed = false;

    const unsafeMapPattern = /(?<!\|\|\s*\[\]\))(?<!\?)(\b\w+)(\.map\s*\()/g;
    content = content.replace(unsafeMapPattern, (match, varName, mapCall) => {
      if (['Array', 'Object', 'JSON', 'Math', 'String', 'console', 'window', 'document'].includes(varName)) return match;
      if (/^['"`\d]/.test(varName)) return match;
      if (varName === 'children' || varName === 'props') return match;
      const beforeMatch = content.slice(0, content.indexOf(match));
      const lastLine = beforeMatch.split('\n').pop() || '';
      if (lastLine.includes('||') || lastLine.includes('??')) return match;
      changed = true;
      return `(${varName} || [])${mapCall}`;
    });

    const unsafeFilterPattern = /(?<!\|\|\s*\[\]\))(?<!\?)(\b\w+)(\.filter\s*\()/g;
    content = content.replace(unsafeFilterPattern, (match, varName, filterCall) => {
      if (['Array', 'Object', 'JSON', 'Math'].includes(varName)) return match;
      if (/^['"`\d]/.test(varName)) return match;
      changed = true;
      return `(${varName} || [])${filterCall}`;
    });

    const apiDataAccessPattern = /(?:data|response|result|payload)\.(\w+)\.(\w+)/g;
    content = content.replace(apiDataAccessPattern, (match, prop1, prop2) => {
      if (match.includes('?.')) return match;
      changed = true;
      return `data?.${prop1}?.${prop2}`;
    });

    const mapWithJsxNoKeyPattern = /\.map\s*\(\s*\(\s*(\w+)\s*(?:,\s*(\w+))?\s*\)\s*=>\s*(?:\(?\s*)<(\w+)(?![^>]*\bkey\b)/g;
    content = content.replace(mapWithJsxNoKeyPattern, (match, itemVar, indexVar, tagName) => {
      changed = true;
      const keyProp = indexVar ? `key={${indexVar}}` : `key={${itemVar}.id || ${itemVar}}`;
      return match.replace(`<${tagName}`, `<${tagName} ${keyProp}`);
    });

    const inlineSetStateInHandler = /(\w+=)\{(set[A-Z]\w*)\(([^)]*)\)\}/g;
    content = content.replace(inlineSetStateInHandler, (match, attr, setter, args) => {
      if (/^on[A-Z]/.test(attr.replace('=', ''))) {
        changed = true;
        return `${attr}{() => ${setter}(${args})}`;
      }
      return match;
    });

    if (changed && content !== file.content) {
      fixes.push({
        type: 'patch_file',
        filePath: file.path,
        description: `Apply proactive runtime safety patches in ${file.path}`,
        oldContent: file.content,
        newContent: content,
        confidence: 'medium',
      });
    }
  }

  for (const file of files) {
    if (!/\.(tsx?|jsx?)$/.test(file.path)) continue;

    let content = file.content;
    let changed = false;

    const useEffectAsyncPattern = /useEffect\s*\(\s*\(\)\s*=>\s*\{([\s\S]*?await\s[\s\S]*?)\}\s*,/g;
    content = content.replace(useEffectAsyncPattern, (match, body) => {
      if (body.includes('try') && body.includes('catch')) return match;
      changed = true;
      const wrappedBody = body.replace(
        /([\s\S]*)/,
        'try {\n$1\n} catch (err) {\n  console.error(err);\n}'
      );
      return match.replace(body, wrappedBody);
    });

    const asyncArrowWithoutTryCatch = /const\s+(\w+)\s*=\s*async\s*\([^)]*\)\s*=>\s*\{(?![\s\S]*?try\s*\{)([\s\S]*?)\}/g;
    content = content.replace(asyncArrowWithoutTryCatch, (match, name, body) => {
      if (body.includes('.catch(') || body.trim().length < 20) return match;
      changed = true;
      return match.replace(body, `\n    try {${body}\n    } catch (err) {\n      console.error('Error in ${name}:', err);\n      throw err;\n    }\n  `);
    });

    if (changed && content !== file.content) {
      fixes.push({
        type: 'patch_file',
        filePath: file.path,
        description: `Add error handling to async operations in ${file.path}`,
        oldContent: file.content,
        newContent: content,
        confidence: 'medium',
      });
    }
  }

  return fixes;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}