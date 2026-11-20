import ts from 'typescript';
import { normalizeProjectPath } from './workspace-policy';

export type ImportExportIssueCode =
  | 'MODULE_NOT_FOUND'
  | 'EXPORT_NOT_FOUND'
  | 'DEFAULT_EXPORT_NOT_FOUND'
  | 'INVALID_IMPORT_FORM'
  | 'REEXPORT_SOURCE_NOT_FOUND'
  | 'REEXPORT_SYMBOL_NOT_FOUND'
  | 'UNDECLARED_BLUEPRINT_DEPENDENCY'
  | 'UNUSED_BLUEPRINT_DEPENDENCY'
  | 'RUNTIME_BOUNDARY_VIOLATION'
  | 'SOURCE_PARSE_ERROR';

export interface ImportExportDiagnostic {
  code: ImportExportIssueCode;
  severity: 'error' | 'warning';
  importerPath: string;
  moduleSpecifier?: string;
  resolvedPath?: string;
  importedName?: string;
  line?: number;
  column?: number;
  message: string;
  relatedPath?: string;
}

export interface ImportExportValidationResult {
  valid: boolean;
  errors: ImportExportDiagnostic[];
  warnings: ImportExportDiagnostic[];
  diagnostics: ImportExportDiagnostic[];
  summary: string;
}

interface ModuleExports {
  named: Set<string>;
  hasDefault: boolean;
  typesOnly: Set<string>;
}

/**
 * Resolves all exported symbols from a workspace module file using the TypeScript compiler API.
 * Tracks re-exports and strictly respects export * default exclusion semantics.
 */
function resolveModuleExports(
  targetFile: string,
  fileMap: Map<string, string>,
  compilerOptions: ts.CompilerOptions,
  resolutionHost: ts.ModuleResolutionHost,
  visited: Set<string> = new Set(),
  diagnostics?: ImportExportDiagnostic[]
): ModuleExports {
  const normTarget = normalizeProjectPath(targetFile);
  if (visited.has(normTarget)) {
    return { named: new Set(), hasDefault: false, typesOnly: new Set() };
  }
  visited.add(normTarget);

  const content = fileMap.get(normTarget);
  if (!content) {
    return { named: new Set(), hasDefault: false, typesOnly: new Set() };
  }

  const isTsx = normTarget.endsWith('.tsx');
  const isJsx = normTarget.endsWith('.jsx');
  const scriptKind = isTsx ? ts.ScriptKind.TSX : isJsx ? ts.ScriptKind.JSX : normTarget.endsWith('.ts') ? ts.ScriptKind.TS : ts.ScriptKind.JS;

  const sourceFile = ts.createSourceFile(normTarget, content, ts.ScriptTarget.Latest, true, scriptKind);
  const named = new Set<string>();
  const typesOnly = new Set<string>();
  let hasDefault = false;

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

    if (ts.isExportAssignment(node)) {
      hasDefault = true;
    }

    // 2. export const / function / class / interface / type x
    if (hasExportMod) {
      if (ts.isVariableStatement(node)) {
        for (const decl of node.declarationList.declarations) {
          if (ts.isIdentifier(decl.name)) named.add(decl.name.text);
        }
      } else if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isEnumDeclaration(node)) {
        if (node.name && ts.isIdentifier(node.name)) named.add(node.name.text);
      } else if (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) {
        if (node.name && ts.isIdentifier(node.name)) {
          named.add(node.name.text);
          typesOnly.add(node.name.text);
        }
      }
    }

    // 3. export { a as b, default as d } without `from` (local export clause)
    if (ts.isExportDeclaration(node) && !node.moduleSpecifier && node.exportClause && ts.isNamedExports(node.exportClause)) {
      const isExportTypeOnly = Boolean(node.isTypeOnly);
      for (const el of node.exportClause.elements) {
        const localName = (el.propertyName || el.name).text;
        const exportedName = el.name.text;
        const isElementFiltered = isExportTypeOnly || Boolean(el.isTypeOnly);

        if (!localDeclarations.has(localName) && diagnostics) {
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(el.getStart());
          diagnostics.push({
            code: 'REEXPORT_SYMBOL_NOT_FOUND',
            severity: 'error',
            importerPath: normTarget,
            importedName: localName,
            line: line + 1,
            column: character + 1,
            message: `[${normTarget}] Exported symbol "${localName}" is not declared in this file.`,
          });
        }

        if (exportedName === 'default') {
          hasDefault = true;
        } else {
          named.add(exportedName);
          if (isElementFiltered) typesOnly.add(exportedName);
        }
      }
    }

    // 4. Re-exports: export { x } from './other' or export * from './other'
    if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const subSpec = node.moduleSpecifier.text;
      const subRes = ts.resolveModuleName(subSpec, normTarget, compilerOptions, resolutionHost);

      if (subRes.resolvedModule && !subRes.resolvedModule.isExternalLibraryImport) {
        const subFile = normalizeProjectPath(subRes.resolvedModule.resolvedFileName);
        const subExports = resolveModuleExports(subFile, fileMap, compilerOptions, resolutionHost, visited, diagnostics);

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

            if (!isAvailable && diagnostics) {
              const { line, character } = sourceFile.getLineAndCharacterOfPosition(el.getStart());
              diagnostics.push({
                code: 'REEXPORT_SYMBOL_NOT_FOUND',
                severity: 'error',
                importerPath: normTarget,
                moduleSpecifier: subSpec,
                importedName: importedFromSub,
                line: line + 1,
                column: character + 1,
                message: `[${normTarget}] Cannot re-export "${importedFromSub}" from "${subSpec}" because it is not exported by the target.`,
              });
            }

            if (exportedAs === 'default') {
              hasDefault = true;
            } else {
              named.add(exportedAs);
            }
          }
        }
        // 4c. export * from './other' (export * NEVER re-exports default)
        else if (!node.exportClause) {
          for (const n of subExports.named) {
            named.add(n);
          }
        }
      } else if (!subRes.resolvedModule && diagnostics) {
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        diagnostics.push({
          code: 'REEXPORT_SOURCE_NOT_FOUND',
          severity: 'error',
          importerPath: normTarget,
          moduleSpecifier: subSpec,
          line: line + 1,
          column: character + 1,
          message: `[${normTarget}] Re-export source "${subSpec}" resolves to a missing file in the workspace.`,
        });
      }
    }
  });

  return { named, hasDefault, typesOnly };
}

/**
 * Deterministic Import/Export Validator.
 * Uses the TypeScript compiler API to statically resolve modules, verify exported names,
 * and validate import forms (default vs named vs re-exports).
 */
export function validateImportExportIntegrity(
  fileMap: Map<string, string>,
  options?: {
    declaredDependencies?: Map<string, string[]>;
  }
): ImportExportValidationResult {
  const diagnostics: ImportExportDiagnostic[] = [];

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

  // 1. Resolve exported symbols for all JS/TS files in workspace
  for (const [filePath] of fileMap.entries()) {
    if (!/\.(js|ts|jsx|tsx)$/.test(filePath)) continue;
    resolveModuleExports(filePath, fileMap, compilerOptions, resolutionHost, new Set(), diagnostics);
  }

  // 2. Validate all imports across project files
  for (const [filePath, content] of fileMap.entries()) {
    if (!/\.(js|ts|jsx|tsx)$/.test(filePath)) continue;

    const isTsx = filePath.endsWith('.tsx');
    const isJsx = filePath.endsWith('.jsx');
    const scriptKind = isTsx ? ts.ScriptKind.TSX : isJsx ? ts.ScriptKind.JSX : filePath.endsWith('.ts') ? ts.ScriptKind.TS : ts.ScriptKind.JS;

    let sourceFile: ts.SourceFile;
    try {
      sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, scriptKind);
    } catch (err: any) {
      diagnostics.push({
        code: 'SOURCE_PARSE_ERROR',
        severity: 'error',
        importerPath: filePath,
        message: `Failed to parse source file: ${err?.message || err}`,
      });
      continue;
    }

    ts.forEachChild(sourceFile, (node) => {
      if (!ts.isImportDeclaration(node)) return;
      if (!node.moduleSpecifier || !ts.isStringLiteral(node.moduleSpecifier)) return;

      const specifier = node.moduleSpecifier.text;
      if (specifier.startsWith('node:')) return;

      const resolution = ts.resolveModuleName(specifier, filePath, compilerOptions, resolutionHost);

      // Skip external packages
      if (resolution.resolvedModule?.isExternalLibraryImport) return;

      if (!specifier.startsWith('.') && !specifier.startsWith('/') && !specifier.startsWith('@/')) {
        const isPathMapped = compilerOptions.paths && Object.keys(compilerOptions.paths).some((p) => specifier.startsWith(p.replace(/\*$/, '')));
        if (!isPathMapped) return;
      }

      const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());

      if (!resolution.resolvedModule) {
        diagnostics.push({
          code: 'MODULE_NOT_FOUND',
          severity: 'error',
          importerPath: filePath,
          moduleSpecifier: specifier,
          line: line + 1,
          column: character + 1,
          message: `[${filePath}] Import "${specifier}" resolves to a file that does not exist in the workspace.`,
        });
        return;
      }

      const resolvedFile = normalizeProjectPath(resolution.resolvedModule.resolvedFileName);
      if (resolvedFile.endsWith('.css') || resolvedFile.endsWith('.json')) return;

      const exports = resolveModuleExports(resolvedFile, fileMap, compilerOptions, resolutionHost, new Set(), diagnostics);

      if (node.importClause) {
        // Default import
        if (node.importClause.name && !exports.hasDefault) {
          diagnostics.push({
            code: 'DEFAULT_EXPORT_NOT_FOUND',
            severity: 'error',
            importerPath: filePath,
            moduleSpecifier: specifier,
            resolvedPath: resolvedFile,
            line: line + 1,
            column: character + 1,
            message: `[${filePath}] Module "${specifier}" does not have a default export.`,
          });
        }

        // Named imports
        if (node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
          for (const el of node.importClause.namedBindings.elements) {
            const importedName = (el.propertyName || el.name).text;
            if (!exports.named.has(importedName)) {
              diagnostics.push({
                code: 'EXPORT_NOT_FOUND',
                severity: 'error',
                importerPath: filePath,
                moduleSpecifier: specifier,
                resolvedPath: resolvedFile,
                importedName,
                line: line + 1,
                column: character + 1,
                message: `[${filePath}] Named import "${importedName}" is not exported from "${specifier}".`,
              });
            }
          }
        }
      }
    });
  }

  // 3. Blueprint reconciliation if declaredDependencies is provided
  if (options?.declaredDependencies) {
    for (const [file, declaredDeps] of options.declaredDependencies.entries()) {
      const normFile = normalizeProjectPath(file);
      for (const dep of declaredDeps) {
        if (!dep || dep === 'None') continue;
        const normDep = normalizeProjectPath(dep);
        if (!fileMap.has(normDep)) {
          diagnostics.push({
            code: 'UNDECLARED_BLUEPRINT_DEPENDENCY',
            severity: 'warning',
            importerPath: normFile,
            relatedPath: normDep,
            message: `Blueprint file "${file}" declares dependency "${dep}" which does not exist in workspace.`,
          });
        }
      }
    }
  }

  const errors = diagnostics.filter((d) => d.severity === 'error');
  const warnings = diagnostics.filter((d) => d.severity === 'warning');

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    diagnostics,
    summary: errors.length === 0
      ? `Import/export validation passed with ${warnings.length} warning(s).`
      : `Found ${errors.length} import/export error(s) and ${warnings.length} warning(s).`,
  };
}
