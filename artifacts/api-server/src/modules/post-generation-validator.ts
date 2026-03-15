import { ALL_KNOWN_PACKAGES } from './dependency-registry.js';
import { fixTSGenericBracketMismatch } from './vite-error-fixer.js';

interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

export interface ValidationIssue {
  type: 'missing_import' | 'missing_export' | 'missing_dependency' | 'schema_mismatch' | 'unused_import' | 'syntax_hint' | 'runtime_pattern';
  severity: 'error' | 'warning';
  file: string;
  message: string;
  importPath?: string;
  exportName?: string;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  fixesApplied: string[];
  iterations: number;
  files: { path: string; content: string; language: string }[];
}

const EXTERNAL_PACKAGES = ALL_KNOWN_PACKAGES;

function isExternalImport(importPath: string): boolean {
  if (importPath.startsWith('.') || importPath.startsWith('/') || importPath.startsWith('@/') || importPath.startsWith('@shared')) {
    return false;
  }
  const basePkg = importPath.startsWith('@') ? importPath.split('/').slice(0, 2).join('/') : importPath.split('/')[0];
  return EXTERNAL_PACKAGES.has(basePkg);
}

function extractImports(content: string): { names: string[]; path: string; line: number; raw: string }[] {
  const imports: { names: string[]; path: string; line: number; raw: string }[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const importMatch = line.match(/import\s+(?:(?:type\s+)?(?:\{([^}]+)\}|(\w+)(?:\s*,\s*\{([^}]+)\})?)\s+from\s+)?['"]([^'"]+)['"]/);
    if (importMatch) {
      const cleanName = (n: string): string => {
        let name = n.trim();
        if (name.startsWith('type ')) name = name.slice(5).trim();
        name = name.split(/\s+as\s+/)[0].trim();
        return name;
      };
      const names: string[] = [];
      if (importMatch[1]) {
        names.push(...importMatch[1].split(',').map(cleanName).filter(Boolean));
      }
      if (importMatch[2]) {
        names.push(cleanName(importMatch[2]));
      }
      if (importMatch[3]) {
        names.push(...importMatch[3].split(',').map(cleanName).filter(Boolean));
      }
      imports.push({ names, path: importMatch[4], line: i + 1, raw: line });
    }
  }

  return imports;
}

function extractExports(content: string): string[] {
  const exports: string[] = [];

  const defaultMatch = content.match(/export\s+default\s+(?:function|class|const|let|var)\s+(\w+)/);
  if (defaultMatch) exports.push('default', defaultMatch[1]);

  const defaultExpr = content.match(/export\s+default\s+/);
  if (defaultExpr && !defaultMatch) exports.push('default');

  const namedExports = Array.from(content.matchAll(/export\s+(?:async\s+)?(?:function|class|const|let|var|type|interface|enum)\s+(\w+)/g));
  for (const m of namedExports) {
    exports.push(m[1]);
  }

  const reExports = Array.from(content.matchAll(/export\s*\{([^}]+)\}/g));
  for (const m of reExports) {
    const names = m[1].split(',').map((n: string) => n.trim().split(/\s+as\s+/).pop()?.trim()).filter(Boolean);
    exports.push(...(names as string[]));
  }

  return Array.from(new Set(exports));
}

function resolveAliasPath(importPath: string): string {
  if (importPath.startsWith('@/')) {
    return 'src/' + importPath.slice(2);
  }
  if (importPath.startsWith('@shared/')) {
    return 'shared/' + importPath.slice(8);
  }
  if (importPath === '@shared') {
    return 'shared/index';
  }
  return importPath;
}

function findMatchingFile(resolvedPath: string, fileMap: Map<string, GeneratedFile>): GeneratedFile | undefined {
  const extensions = ['.ts', '.tsx', '.js', '.jsx', ''];
  const basePaths = [resolvedPath, resolvedPath + '/index'];

  for (const base of basePaths) {
    for (const ext of extensions) {
      const candidate = base + ext;
      if (fileMap.has(candidate)) return fileMap.get(candidate);
    }
  }
  return undefined;
}

function buildFileMap(files: GeneratedFile[]): Map<string, GeneratedFile> {
  const map = new Map<string, GeneratedFile>();
  for (const f of files) {
    map.set(f.path, f);
    const noExt = f.path.replace(/\.\w+$/, '');
    map.set(noExt, f);
  }
  return map;
}

function extractPackageJsonDeps(files: GeneratedFile[]): Set<string> {
  const pkgFile = files.find(f => f.path === 'package.json');
  if (!pkgFile) return new Set();

  try {
    const pkg = JSON.parse(pkgFile.content);
    const deps = new Set<string>();
    for (const d of Object.keys(pkg.dependencies || {})) deps.add(d);
    for (const d of Object.keys(pkg.devDependencies || {})) deps.add(d);
    return deps;
  } catch {
    return new Set();
  }
}

function exportMatchesImport(exports: string[], importName: string): boolean {
  if (exports.includes(importName)) return true;
  const lowerImport = importName.toLowerCase();
  return exports.some(exp => exp.toLowerCase() === lowerImport);
}

function detectImplicitDependencies(files: GeneratedFile[], packageDeps: Set<string>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const patterns: { regex: RegExp; pkg: string; label: string }[] = [
    { regex: /<(?:LineChart|BarChart|PieChart|ResponsiveContainer|AreaChart|RadarChart|ScatterChart)\b/, pkg: 'recharts', label: 'Recharts component' },
    { regex: /\bformat\s*\(\s*(?:new\s+Date|Date\.|parseISO|subDays|addDays)/, pkg: 'date-fns', label: 'date-fns format usage' },
    { regex: /(?:<motion\.|motion\.)/, pkg: 'framer-motion', label: 'Framer Motion usage' },
    { regex: /\buseForm\s*\(/, pkg: 'react-hook-form', label: 'react-hook-form useForm' },
    { regex: /\bzodResolver\b/, pkg: '@hookform/resolvers', label: 'zodResolver from @hookform/resolvers' },
  ];

  for (const file of files) {
    if (file.path === 'package.json' || file.path.endsWith('.css') || file.path.endsWith('.html') || file.path.endsWith('.json')) {
      continue;
    }

    for (const pattern of patterns) {
      if (pattern.regex.test(file.content) && !packageDeps.has(pattern.pkg)) {
        const imports = extractImports(file.content);
        const alreadyImported = imports.some(imp => {
          const basePkg = imp.path.startsWith('@') ? imp.path.split('/').slice(0, 2).join('/') : imp.path.split('/')[0];
          return basePkg === pattern.pkg;
        });

        if (!alreadyImported) {
          issues.push({
            type: 'missing_dependency',
            severity: 'warning',
            file: file.path,
            message: `${pattern.label} detected but "${pattern.pkg}" may not be in package.json or imported`,
            importPath: pattern.pkg,
            suggestion: `Ensure "${pattern.pkg}" is added to package.json and properly imported`,
          });
        }
      }
    }
  }

  return issues;
}

function validateViteCompatibility(files: GeneratedFile[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const packageDeps = extractPackageJsonDeps(files);

  const cssFile = files.find(f => f.path.endsWith('index.css') || f.path.endsWith('globals.css') || f.path.endsWith('app.css') || f.path.endsWith('styles.css'));
  if (cssFile) {
    const isTailwindV4 = packageDeps.has('tailwindcss') && (() => {
      const pkgFile = files.find(f => f.path === 'package.json');
      if (!pkgFile) return false;
      try {
        const pkg = JSON.parse(pkgFile.content);
        const ver = pkg.dependencies?.tailwindcss || pkg.devDependencies?.tailwindcss || '';
        return ver.startsWith('4') || ver.startsWith('^4') || ver.startsWith('~4');
      } catch { return false; }
    })();

    if (isTailwindV4) {
      if (/@tailwind\s+(base|components|utilities)/.test(cssFile.content)) {
        issues.push({
          type: 'syntax_hint',
          severity: 'error',
          file: cssFile.path,
          message: 'Tailwind v4 does not use @tailwind directives. Use @import "tailwindcss" instead.',
          suggestion: 'Replace @tailwind base/components/utilities with @import "tailwindcss"',
        });
      }
      if (/@apply\s+/.test(cssFile.content) && !cssFile.content.includes('@import "tailwindcss"') && !cssFile.content.includes("@import 'tailwindcss'")) {
        issues.push({
          type: 'syntax_hint',
          severity: 'error',
          file: cssFile.path,
          message: 'Tailwind v4 requires @import "tailwindcss" before @apply directives work.',
          suggestion: 'Add @import "tailwindcss" at the top of the CSS file',
        });
      }
    }
  }

  const viteConfigFile = files.find(f => f.path === 'vite.config.ts' || f.path === 'vite.config.js');
  if (viteConfigFile) {
    if (!viteConfigFile.content.includes('@vitejs/plugin-react')) {
      const hasJsx = files.some(f => f.path.endsWith('.tsx') || f.path.endsWith('.jsx'));
      if (hasJsx) {
        issues.push({
          type: 'missing_dependency',
          severity: 'error',
          file: viteConfigFile.path,
          message: 'Vite config does not include @vitejs/plugin-react but project has JSX/TSX files',
          importPath: '@vitejs/plugin-react',
          suggestion: 'Add @vitejs/plugin-react to vite.config and package.json',
        });
      }
    }
    const hasSrcFiles = files.some(f => f.path.startsWith('src/'));
    const usesAtAlias = files.some(f => f.content.includes("from '@/") || f.content.includes('from "@/'));
    if (hasSrcFiles && usesAtAlias && !viteConfigFile.content.includes("'@'") && !viteConfigFile.content.includes('"@"') && !viteConfigFile.content.includes("'@/'")) {
      issues.push({
        type: 'syntax_hint',
        severity: 'error',
        file: viteConfigFile.path,
        message: 'Project uses @/ path alias in imports but vite.config has no resolve.alias for "@"',
        suggestion: 'Add resolve.alias: { "@": "/src" } to vite.config',
      });
    }
  } else {
    const hasVite = packageDeps.has('vite');
    if (hasVite) {
      issues.push({
        type: 'syntax_hint',
        severity: 'error',
        file: 'vite.config.ts',
        message: 'Vite is in package.json but no vite.config.ts file exists',
        suggestion: 'Create a vite.config.ts with React plugin configuration',
      });
    }
  }

  const appFile = files.find(f =>
    f.path === 'src/App.tsx' || f.path === 'src/App.jsx' || f.path === 'src/app.tsx' || f.path === 'src/app.jsx'
  );
  if (appFile) {
    const appExports = extractExports(appFile.content);
    if (!appExports.includes('default') && !appExports.some(e => e === 'App' || e === 'app')) {
      issues.push({
        type: 'missing_export',
        severity: 'error',
        file: appFile.path,
        message: 'App component file has no default export — Vite will fail to render',
        suggestion: 'Add "export default App" or "export default function App()"',
      });
    }
  }

  const indexHtml = files.find(f => f.path === 'index.html');
  if (indexHtml) {
    if (!indexHtml.content.includes('<div id="root"') && !indexHtml.content.includes("<div id='root'") && !indexHtml.content.includes('id="root"')) {
      issues.push({
        type: 'syntax_hint',
        severity: 'warning',
        file: 'index.html',
        message: 'index.html missing <div id="root"> — React will have nowhere to mount',
        suggestion: 'Add <div id="root"></div> before the script tag',
      });
    }
    if (!indexHtml.content.includes('<script') || !indexHtml.content.includes('src="/src/main')) {
      if (!indexHtml.content.includes('src="/src/index')) {
        issues.push({
          type: 'syntax_hint',
          severity: 'warning',
          file: 'index.html',
          message: 'index.html may be missing the entry script tag',
          suggestion: 'Add <script type="module" src="/src/main.tsx"></script>',
        });
      }
    }
  }

  for (const file of files) {
    if (!file.path.endsWith('.tsx') && !file.path.endsWith('.jsx')) continue;
    if (file.content.includes('className=') || /<[A-Z]/.test(file.content) || /<[a-z]+[\s>]/.test(file.content)) {
      const hasJsxContent = /<[A-Za-z]/.test(file.content);
      if (hasJsxContent && !file.content.includes("from 'react'") && !file.content.includes('from "react"') && !file.content.includes("from 'React'")) {
        const hasReactFeature = /\buseState\b|\buseEffect\b|\buseRef\b|\buseMemo\b|\buseCallback\b|\buseContext\b|\buseReducer\b/.test(file.content);
        if (hasReactFeature) {
          issues.push({
            type: 'missing_import',
            severity: 'error',
            file: file.path,
            message: 'File uses React hooks but does not import from "react"',
            importPath: 'react',
            suggestion: 'Add: import { useState, useEffect, ... } from "react"',
          });
        }
      }
    }
  }

  return issues;
}

function validateRuntimePatterns(files: GeneratedFile[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const usesQueryHooks = files.some(f =>
    f.path !== 'package.json' &&
    !f.path.endsWith('.css') &&
    (/\buseQuery\s*\(/.test(f.content) || /\buseMutation\s*\(/.test(f.content))
  );

  if (usesQueryHooks) {
    const appFile = files.find(f => f.path.endsWith('App.tsx') || f.path.endsWith('App.jsx'));
    if (appFile && !appFile.content.includes('<QueryClientProvider')) {
      issues.push({
        type: 'runtime_pattern',
        severity: 'warning',
        file: appFile.path,
        message: 'useQuery/useMutation is used but App.tsx does not wrap content in <QueryClientProvider>',
        suggestion: 'Wrap your app content with <QueryClientProvider client={queryClient}> in App.tsx',
      });
    }
  }

  for (const file of files) {
    if (file.path === 'package.json' || file.path.endsWith('.css') || file.path.endsWith('.html') || file.path.endsWith('.json')) {
      continue;
    }

    const defaultExportMatches = file.content.match(/export\s+default\b/g);
    if (defaultExportMatches && defaultExportMatches.length > 1) {
      issues.push({
        type: 'runtime_pattern',
        severity: 'error',
        file: file.path,
        message: `File has ${defaultExportMatches.length} "export default" statements, only one is allowed`,
        suggestion: 'Remove duplicate default exports, keep only one per file',
      });
    }

    const exportedComponentMatches = Array.from(
      file.content.matchAll(/export\s+(?:default\s+)?function\s+([A-Z]\w*)/g)
    );
    for (const match of exportedComponentMatches) {
      const compName = match[1];
      const funcStartIndex = match.index!;
      let braceDepth = 0;
      let funcBody = '';
      let foundStart = false;
      for (let i = funcStartIndex; i < file.content.length; i++) {
        const ch = file.content[i];
        if (ch === '{') {
          braceDepth++;
          foundStart = true;
        }
        if (foundStart) funcBody += ch;
        if (ch === '}') {
          braceDepth--;
          if (braceDepth === 0 && foundStart) break;
        }
      }

      if (funcBody && !(/return\s*[\s(]/.test(funcBody) || /return\s*</.test(funcBody) || /=>\s*</.test(funcBody) || /=>\s*\(/.test(funcBody))) {
        issues.push({
          type: 'runtime_pattern',
          severity: 'warning',
          file: file.path,
          message: `Component "${compName}" may be missing a return statement with JSX`,
          suggestion: `Ensure "${compName}" returns JSX content`,
        });
      }
    }

    if (file.path.endsWith('.tsx') || file.path.endsWith('.jsx')) {
      const lines = file.content.split('\n');
      const nonImportLines = lines.filter(l => !l.trim().startsWith('import ') && l.trim().length > 0);
      if (nonImportLines.length < 3 && lines.length > 0) {
        issues.push({
          type: 'runtime_pattern',
          severity: 'warning',
          file: file.path,
          message: 'Component file has very little actual code (less than 3 non-import lines)',
          suggestion: 'This file may be incomplete or empty - ensure it has meaningful content',
        });
      }
    }
  }

  return issues;
}

export function validateGeneratedFiles(files: GeneratedFile[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const fileMap = buildFileMap(files);
  const packageDeps = extractPackageJsonDeps(files);

  for (const file of files) {
    if (file.path === 'package.json' || file.path.endsWith('.css') || file.path.endsWith('.html') || file.path.endsWith('.json')) {
      continue;
    }

    const imports = extractImports(file.content);

    for (const imp of imports) {
      if (isExternalImport(imp.path)) {
        const basePkg = imp.path.startsWith('@') ? imp.path.split('/').slice(0, 2).join('/') : imp.path.split('/')[0];
        const isNodeBuiltin = ['http', 'path', 'fs', 'crypto', 'stream', 'events', 'url', 'util', 'os', 'child_process', 'net', 'tls', 'dns', 'dgram'].includes(basePkg);
        if (!packageDeps.has(basePkg) && !isNodeBuiltin) {
          issues.push({
            type: 'missing_dependency',
            severity: 'error',
            file: file.path,
            message: `Package "${basePkg}" is imported but not in package.json`,
            importPath: imp.path,
            suggestion: `Add "${basePkg}" to package.json dependencies`,
          });
        }
        continue;
      }

      if (imp.path.startsWith('@/') || imp.path.startsWith('@shared') || imp.path.startsWith('.')) {
        let resolvedPath: string;
        if (imp.path.startsWith('.')) {
          const dir = file.path.split('/').slice(0, -1).join('/');
          resolvedPath = normalizePath(dir + '/' + imp.path);
        } else {
          resolvedPath = resolveAliasPath(imp.path);
        }

        const targetFile = findMatchingFile(resolvedPath, fileMap);
        if (!targetFile) {
          issues.push({
            type: 'missing_import',
            severity: 'error',
            file: file.path,
            message: `Import "${imp.path}" does not resolve to any generated file`,
            importPath: imp.path,
            suggestion: `Create the missing file or fix the import path`,
          });
          continue;
        }

        const targetExports = extractExports(targetFile.content);
        for (const name of imp.names) {
          if (name === 'type' || name === 'React') continue;
          if (!exportMatchesImport(targetExports, name) && !targetExports.includes('default')) {
            const isDefaultImportedAsName = imp.raw.match(new RegExp(`import\\s+${name}\\s+from`));
            if (isDefaultImportedAsName && targetExports.includes('default')) continue;

            issues.push({
              type: 'missing_export',
              severity: 'error',
              file: file.path,
              message: `"${name}" is imported from "${imp.path}" but not exported by "${targetFile.path}"`,
              importPath: imp.path,
              exportName: name,
              suggestion: `Add "export" to "${name}" in ${targetFile.path}, or fix the import`,
            });
          }
        }
      }
    }
  }

  issues.push(...detectImplicitDependencies(files, packageDeps));
  issues.push(...validateRuntimePatterns(files));
  issues.push(...validateViteCompatibility(files));

  return issues;
}

function normalizePath(p: string): string {
  const parts = p.split('/');
  const result: string[] = [];
  for (const part of parts) {
    if (part === '..') result.pop();
    else if (part !== '.' && part !== '') result.push(part);
  }
  return result.join('/');
}

export function autoFixFiles(files: GeneratedFile[], issues: ValidationIssue[]): { files: GeneratedFile[]; fixesApplied: string[] } {
  const fixesApplied: string[] = [];
  const fileMap = new Map<string, GeneratedFile>();
  for (const f of files) fileMap.set(f.path, { ...f });

  const missingFiles = new Map<string, { importers: string[]; names: string[] }>();

  for (const issue of issues) {
    if (issue.type === 'missing_import' && issue.importPath) {
      let resolvedPath: string;
      if (issue.importPath.startsWith('@/')) {
        resolvedPath = 'src/' + issue.importPath.slice(2);
      } else if (issue.importPath.startsWith('@shared')) {
        resolvedPath = 'shared/' + issue.importPath.replace('@shared/', '').replace('@shared', 'index');
      } else if (issue.importPath.startsWith('.')) {
        const dir = issue.file.split('/').slice(0, -1).join('/');
        resolvedPath = normalizePath(dir + '/' + issue.importPath);
      } else {
        continue;
      }

      if (!resolvedPath.match(/\.\w+$/)) {
        resolvedPath += '.tsx';
      }

      if (!missingFiles.has(resolvedPath)) {
        missingFiles.set(resolvedPath, { importers: [], names: [] });
      }
      const entry = missingFiles.get(resolvedPath)!;
      entry.importers.push(issue.file);

      const sourceFile = fileMap.get(issue.file);
      if (sourceFile) {
        const imports = extractImports(sourceFile.content);
        const matchingImport = imports.find(i => i.path === issue.importPath);
        if (matchingImport) {
          entry.names.push(...matchingImport.names);
        }
      }
    }

    if (issue.type === 'missing_export' && issue.exportName && issue.importPath) {
      let resolvedPath: string;
      if (issue.importPath.startsWith('@/')) {
        resolvedPath = 'src/' + issue.importPath.slice(2);
      } else if (issue.importPath.startsWith('@shared')) {
        resolvedPath = 'shared/' + issue.importPath.replace('@shared/', '');
      } else {
        continue;
      }

      const targetFile = findMatchingFile(resolvedPath, buildFileMap(Array.from(fileMap.values())));
      if (targetFile && issue.exportName) {
        const mutableFile = fileMap.get(targetFile.path);
        if (mutableFile) {
          const funcPattern = new RegExp(`^(\\s*)(function\\s+${issue.exportName}\\b)`, 'm');
          const constPattern = new RegExp(`^(\\s*)((?:const|let|var)\\s+${issue.exportName}\\b)`, 'm');
          const classPattern = new RegExp(`^(\\s*)(class\\s+${issue.exportName}\\b)`, 'm');

          let patched = false;
          for (const pattern of [funcPattern, constPattern, classPattern]) {
            if (pattern.test(mutableFile.content)) {
              mutableFile.content = mutableFile.content.replace(pattern, '$1export $2');
              patched = true;
              break;
            }
          }

          if (patched) {
            fixesApplied.push(`Added export to "${issue.exportName}" in ${targetFile.path}`);
          }
        }
      }
    }

    if (issue.type === 'missing_dependency' && issue.importPath) {
      const pkgFile = fileMap.get('package.json');
      if (pkgFile) {
        try {
          const pkg = JSON.parse(pkgFile.content);
          const basePkg = issue.importPath.startsWith('@') ? issue.importPath.split('/').slice(0, 2).join('/') : issue.importPath.split('/')[0];
          if (!pkg.dependencies) pkg.dependencies = {};
          if (!pkg.dependencies[basePkg]) {
            const KNOWN_VERSIONS: Record<string, string> = {
              'react': '^18.3.1', 'react-dom': '^18.3.1', 'wouter': '^3.0.0',
              '@tanstack/react-query': '^5.0.0', 'lucide-react': '^0.344.0',
              'recharts': '^2.12.0', 'date-fns': '^3.3.1', 'clsx': '^2.1.0',
              'tailwind-merge': '^2.2.0', 'express': '^4.18.0', 'drizzle-orm': '^0.29.0',
              'zod': '^3.22.0', '@vitejs/plugin-react': '^4.2.0',
              'tailwindcss': '3.4.17', 'postcss': '^8.4.0', 'autoprefixer': '^10.4.0',
              '@hookform/resolvers': '^3.3.0',
              'react-hook-form': '^7.50.0',
              'class-variance-authority': '^0.7.0',
              'framer-motion': '^11.0.0',
              'uuid': '^9.0.0',
              'nanoid': '^5.0.0',
              'axios': '^1.6.0',
              'dayjs': '^1.11.0',
              'lodash': '^4.17.21',
              'zustand': '^4.5.0',
              'react-icons': '^5.0.0',
              '@radix-ui/react-dialog': '^1.0.0',
              '@radix-ui/react-select': '^2.0.0',
              '@radix-ui/react-label': '^2.0.0',
              '@radix-ui/react-tabs': '^1.0.0',
              '@radix-ui/react-tooltip': '^1.0.0',
              '@radix-ui/react-popover': '^1.0.0',
              '@radix-ui/react-dropdown-menu': '^2.0.0',
              '@radix-ui/react-checkbox': '^1.0.0',
              '@radix-ui/react-separator': '^1.0.0',
              '@radix-ui/react-scroll-area': '^1.0.0',
              '@radix-ui/react-switch': '^1.0.0',
              '@radix-ui/react-slot': '^1.0.0',
              '@radix-ui/react-avatar': '^1.0.0',
              '@radix-ui/react-alert-dialog': '^1.0.0',
              '@radix-ui/react-accordion': '^1.0.0',
            };
            const DEV_ONLY_PACKAGES = new Set([
              '@vitejs/plugin-react', 'vite', 'typescript', 'tailwindcss', 'postcss', 'autoprefixer',
              '@types/react', '@types/react-dom', '@types/node', '@types/express', '@types/cors',
              'vitest', '@testing-library/react', '@testing-library/jest-dom', '@testing-library/user-event',
              'jsdom', 'picomatch', 'fast-glob', 'drizzle-kit', 'tsx',
            ]);
            if (DEV_ONLY_PACKAGES.has(basePkg)) {
              if (!pkg.devDependencies) pkg.devDependencies = {};
              if (!pkg.devDependencies[basePkg]) {
                pkg.devDependencies[basePkg] = KNOWN_VERSIONS[basePkg] || 'latest';
                pkgFile.content = JSON.stringify(pkg, null, 2);
                fixesApplied.push(`Added "${basePkg}" to package.json devDependencies`);
              }
            } else {
              pkg.dependencies[basePkg] = KNOWN_VERSIONS[basePkg] || 'latest';
              pkgFile.content = JSON.stringify(pkg, null, 2);
              fixesApplied.push(`Added "${basePkg}" to package.json dependencies`);
            }
          }
        } catch {}
      }
    }
  }

  for (const issue of issues) {
    if (issue.type === 'syntax_hint' && issue.message.includes('Tailwind v4 does not use @tailwind directives')) {
      const f = fileMap.get(issue.file);
      if (f) {
        f.content = f.content
          .replace(/@tailwind\s+base\s*;?\s*\n?/g, '')
          .replace(/@tailwind\s+components\s*;?\s*\n?/g, '')
          .replace(/@tailwind\s+utilities\s*;?\s*\n?/g, '');
        if (!f.content.includes('@import "tailwindcss"') && !f.content.includes("@import 'tailwindcss'")) {
          f.content = '@import "tailwindcss";\n\n' + f.content.trimStart();
        }
        fixesApplied.push(`Fixed Tailwind v4 directives in ${issue.file}`);
      }
    }

    if (issue.type === 'syntax_hint' && issue.message.includes('Tailwind v4 requires @import')) {
      const f = fileMap.get(issue.file);
      if (f && !f.content.includes('@import "tailwindcss"') && !f.content.includes("@import 'tailwindcss'")) {
        f.content = '@import "tailwindcss";\n\n' + f.content.trimStart();
        fixesApplied.push(`Added @import "tailwindcss" to ${issue.file}`);
      }
    }

    if (issue.type === 'syntax_hint' && issue.message.includes('no vite.config.ts file exists')) {
      if (!fileMap.has('vite.config.ts')) {
        const viteConfig = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
`;
        fileMap.set('vite.config.ts', { path: 'vite.config.ts', content: viteConfig, language: 'typescript' });
        fixesApplied.push('Created missing vite.config.ts');
      }
    }

    if (issue.type === 'syntax_hint' && issue.message.includes('vite.config has no resolve.alias')) {
      const f = fileMap.get(issue.file);
      if (f) {
        let patched = false;
        if (f.content.includes('resolve:') || f.content.includes('resolve :')) {
          const updated = f.content.replace(
            /(resolve\s*:\s*\{)/,
            `$1\n    alias: {\n      '@': '/src',\n    },`
          );
          if (updated !== f.content) { f.content = updated; patched = true; }
        }
        if (!patched) {
          const updated = f.content.replace(
            /(plugins\s*:\s*\[[^\]]*\]\s*,?)/,
            `$1\n  resolve: {\n    alias: {\n      '@': '/src',\n    },\n  },`
          );
          if (updated !== f.content) { f.content = updated; patched = true; }
        }
        if (!patched) {
          const updated = f.content.replace(
            /(defineConfig\s*\(\s*\{)/,
            `$1\n  resolve: {\n    alias: {\n      '@': '/src',\n    },\n  },`
          );
          if (updated !== f.content) { f.content = updated; patched = true; }
        }
        if (patched) {
          fixesApplied.push(`Added @/ path alias to ${issue.file}`);
        }
      }
    }

    if (issue.type === 'missing_export' && issue.message.includes('App component file has no default export')) {
      const f = fileMap.get(issue.file);
      if (f) {
        const funcMatch = f.content.match(/(?:export\s+)?function\s+(App)\b/);
        if (funcMatch) {
          if (!f.content.includes('export default')) {
            f.content += '\n\nexport default App;\n';
            fixesApplied.push(`Added default export to ${issue.file}`);
          }
        }
      }
    }

    if (issue.type === 'syntax_hint' && issue.message.includes('missing <div id="root">')) {
      const f = fileMap.get('index.html');
      if (f && !f.content.includes('id="root"')) {
        f.content = f.content.replace(/<body[^>]*>/, '$&\n  <div id="root"></div>');
        fixesApplied.push('Added <div id="root"> to index.html');
      }
    }

    if (issue.type === 'missing_import' && issue.message.includes('React hooks but does not import from "react"')) {
      const f = fileMap.get(issue.file);
      if (f) {
        const hooks: string[] = [];
        const hookNames = ['useState', 'useEffect', 'useRef', 'useMemo', 'useCallback', 'useContext', 'useReducer'];
        for (const hook of hookNames) {
          if (new RegExp(`\\b${hook}\\b`).test(f.content)) hooks.push(hook);
        }
        if (hooks.length > 0) {
          const importLine = `import { ${hooks.join(', ')} } from 'react';\n`;
          f.content = importLine + f.content;
          fixesApplied.push(`Added React hooks import to ${issue.file}`);
        }
      }
    }
  }

  const missingEntries = Array.from(missingFiles.entries());
  for (const [path, info] of missingEntries) {
    if (!fileMap.has(path)) {
      const uniqueNames = Array.from(new Set(info.names));
      const stub = generateStubFile(path, uniqueNames);
      const newFile: GeneratedFile = { path, content: stub, language: path.endsWith('.tsx') || path.endsWith('.jsx') ? 'tsx' : 'typescript' };
      fileMap.set(path, newFile);
      fixesApplied.push(`Created stub file: ${path} (exports: ${uniqueNames.join(', ')})`);
    }
  }

  return { files: Array.from(fileMap.values()), fixesApplied };
}

function generateStubFile(path: string, exportNames: string[]): string {
  const isComponent = path.endsWith('.tsx') || path.endsWith('.jsx');
  const lines: string[] = [];

  for (const name of exportNames) {
    const isUpperCase = name[0] === name[0].toUpperCase();
    const isHook = name.startsWith('use') && name.length > 3 && name[3] === name[3].toUpperCase();
    const isType = name.endsWith('Props') || name.endsWith('Type') || name.endsWith('Interface') || (name === name.toUpperCase() && name.length > 1);

    if (isType) {
      lines.push(`export type ${name} = Record<string, any>;
`);
    } else if (isHook) {
      lines.push(`export function ${name}(...args: any[]) {
  return {};
}
`);
    } else if (isComponent && isUpperCase) {
      lines.push(`export function ${name}({ children, className, ...props }: any) {
  return <div className={className} {...props}>{children || "${name}"}</div>;
}
`);
    } else {
      lines.push(`export function ${name}(...args: any[]) {
  return null;
}
`);
    }
  }

  if (exportNames.length === 1) {
    const name = exportNames[0];
    const isUpperCase = name[0] === name[0].toUpperCase();
    const isType = name.endsWith('Props') || name.endsWith('Type') || name.endsWith('Interface') || (name === name.toUpperCase() && name.length > 1);
    if (isComponent && isUpperCase && !isType) {
      lines.push(`export default ${name};`);
    }
  }

  return lines.join('\n');
}

export function validateAndFix(files: GeneratedFile[], maxIterations: number = 3): ValidationResult {
  // Proactively fix TypeScript generic-bracket mismatches on every TS/TSX file
  // before any validation runs — catches LLM errors like `res: Response> =>` → `res: Response) =>`
  let currentFiles = files.map(f => {
    if (/\.(ts|tsx)$/.test(f.path)) {
      const fixed = fixTSGenericBracketMismatch(f.content);
      if (fixed !== f.content) {
        return { ...f, content: fixed };
      }
    }
    return f;
  });
  let allFixes: string[] = [];
  let iteration = 0;

  while (iteration < maxIterations) {
    iteration++;
    const issues = validateGeneratedFiles(currentFiles);
    const errors = issues.filter(i => i.severity === 'error');

    if (errors.length === 0) {
      return {
        valid: true,
        issues: issues.filter(i => i.severity === 'warning'),
        fixesApplied: allFixes,
        iterations: iteration,
        files: currentFiles,
      };
    }

    const { files: fixedFiles, fixesApplied } = autoFixFiles(currentFiles, errors);

    if (fixesApplied.length === 0) {
      return {
        valid: false,
        issues: errors,
        fixesApplied: allFixes,
        iterations: iteration,
        files: currentFiles,
      };
    }

    allFixes.push(...fixesApplied);
    currentFiles = fixedFiles;
  }

  const remainingIssues = validateGeneratedFiles(currentFiles);
  return {
    valid: remainingIssues.filter(i => i.severity === 'error').length === 0,
    issues: remainingIssues,
    fixesApplied: allFixes,
    iterations: maxIterations,
    files: currentFiles,
  };
}