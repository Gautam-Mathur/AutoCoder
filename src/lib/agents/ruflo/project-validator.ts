import ts from 'typescript';
import { readVirtualFile, listVirtualFiles } from './vfs';

export interface ProjectValidationError {
  file: string;
  line: number;
  message: string;
  code?: number;
}

export interface ProjectValidationResult {
  success: boolean;
  errors: ProjectValidationError[];
  warnings: ProjectValidationError[];
}

const COMPLETE_REACT_HOOKS = new Set([
  'useState',
  'useEffect',
  'useContext',
  'useReducer',
  'useCallback',
  'useMemo',
  'useRef',
  'useLayoutEffect',
  'useTransition',
  'useId',
  'useDeferredValue',
  'useImperativeHandle',
  'useSyncExternalStore',
  'useInsertionEffect',
  'useOptimistic',
  'useActionState',
]);

/**
 * Ascends the AST parent chain from a call node to check whether an identifier is declared
 * in any enclosing lexical scope (block statement, function declaration, parameters, arrow, etc.).
 */
function isIdentifierDeclaredInLexicalScope(node: ts.Node, name: string): boolean {
  let curr: ts.Node | undefined = node.parent;

  while (curr) {
    // 1. Function / Method / Arrow parameters
    if (
      ts.isFunctionDeclaration(curr) ||
      ts.isFunctionExpression(curr) ||
      ts.isArrowFunction(curr) ||
      ts.isMethodDeclaration(curr)
    ) {
      for (const param of curr.parameters) {
        if (ts.isIdentifier(param.name) && param.name.text === name) {
          return true;
        }
      }
    }

    // 2. Block / SourceFile statement declarations
    if (ts.isBlock(curr) || ts.isSourceFile(curr)) {
      for (const stmt of curr.statements) {
        if (ts.isVariableStatement(stmt)) {
          for (const decl of stmt.declarationList.declarations) {
            if (ts.isIdentifier(decl.name) && decl.name.text === name) {
              return true;
            }
          }
        }
        if (ts.isFunctionDeclaration(stmt) && stmt.name && stmt.name.text === name) {
          return true;
        }
        if (ts.isClassDeclaration(stmt) && stmt.name && stmt.name.text === name) {
          return true;
        }
      }
    }

    // 3. Catch clause variable
    if (ts.isCatchClause(curr) && curr.variableDeclaration) {
      if (ts.isIdentifier(curr.variableDeclaration.name) && curr.variableDeclaration.name.text === name) {
        return true;
      }
    }

    curr = curr.parent;
  }

  return false;
}

/**
 * AST-based lexical scope-aware validation of React hook imports and call expressions.
 * Accurately accepts:
 * - import { useState } from 'react';
 * - import React, { useState } from 'react';
 * - import * as React from 'react'; React.useState();
 * - import { useState as useMyState } from 'react';
 * - Local variables or functions shadowing hook names in their enclosing scope.
 * Correctly rejects:
 * - Unimported React.useState()
 * - Unimported direct hook calls not shadowed in lexical scope.
 */
export function validateReactHookImports(
  file: string,
  content: string,
  errors: ProjectValidationError[]
): void {
  const isReactFile = file.endsWith('.tsx') || file.endsWith('.jsx') || /from\s*['"]react['"]/.test(content);
  if (!isReactFile) return;

  const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);

  const importedHooks = new Set<string>();
  let reactNamespaceIdent: string | null = null;
  let reactDefaultIdent: string | null = null;

  // 1. Pass 1: Collect React Imports
  function collectImports(node: ts.Node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text === 'react') {
      const clause = node.importClause;
      if (clause) {
        if (clause.name) {
          reactDefaultIdent = clause.name.text;
        }
        if (clause.namedBindings) {
          if (ts.isNamespaceImport(clause.namedBindings)) {
            reactNamespaceIdent = clause.namedBindings.name.text;
          }
          if (ts.isNamedImports(clause.namedBindings)) {
            for (const el of clause.namedBindings.elements) {
              const originalHook = (el.propertyName || el.name).text;
              if (COMPLETE_REACT_HOOKS.has(originalHook)) {
                importedHooks.add(el.name.text);
              }
            }
          }
        }
      }
    }
    ts.forEachChild(node, collectImports);
  }

  collectImports(sourceFile);

  // 2. Pass 2: Traverse Call Expressions with Lexical Scope Checking
  function visitCalls(node: ts.Node) {
    if (ts.isCallExpression(node)) {
      const expr = node.expression;

      // Direct call: useState(...)
      if (ts.isIdentifier(expr) && COMPLETE_REACT_HOOKS.has(expr.text)) {
        const isShadowedLocally = isIdentifierDeclaredInLexicalScope(node, expr.text);
        if (!isShadowedLocally && !importedHooks.has(expr.text)) {
          const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
          errors.push({
            file,
            line: line + 1,
            message: `React hook "${expr.text}" is used but is not explicitly imported from "react".`,
          });
        }
      }

      // Member call: React.useState(...) or R.useEffect(...)
      if (ts.isPropertyAccessExpression(expr) && ts.isIdentifier(expr.expression) && ts.isIdentifier(expr.name)) {
        const callerName = expr.expression.text;
        const methodName = expr.name.text;

        if (COMPLETE_REACT_HOOKS.has(methodName)) {
          const isCallerShadowed = isIdentifierDeclaredInLexicalScope(node, callerName);
          const isLegitimateReactImport =
            !isCallerShadowed &&
            ((reactNamespaceIdent !== null && callerName === reactNamespaceIdent) ||
             (reactDefaultIdent !== null && callerName === reactDefaultIdent));

          if (!isLegitimateReactImport) {
            const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
            if (callerName === 'React') {
              errors.push({
                file,
                line: line + 1,
                message: `React hook "${methodName}" called on "React", but "React" was not imported from "react".`,
              });
            } else {
              errors.push({
                file,
                line: line + 1,
                message: `React hook "${methodName}" called on unknown object "${callerName}". Expected valid React import.`,
              });
            }
          }
        }
      }
    }

    ts.forEachChild(node, visitCalls);
  }

  visitCalls(sourceFile);
}

function getProjectCompilerOptions(
  vfsContentMap: Map<string, string>
): ts.CompilerOptions {
  let tsconfigRaw: string | undefined;
  for (const [k, v] of vfsContentMap.entries()) {
    if (k === 'tsconfig.json' || k.endsWith('/tsconfig.json')) {
      tsconfigRaw = v;
      break;
    }
  }

  const baseOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX,
    allowJs: true,
    esModuleInterop: true,
    noEmit: true,
    skipLibCheck: true,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    baseUrl: '.',
    paths: {
      '@/*': ['./src/*', './*'],
    },
  };

  if (!tsconfigRaw) {
    return baseOptions;
  }

  const parsedJson = ts.parseConfigFileTextToJson('tsconfig.json', tsconfigRaw);
  if (parsedJson.error) {
    return baseOptions;
  }

  const parseHost: ts.ParseConfigHost = {
    useCaseSensitiveFileNames: true,
    readDirectory: () => [],
    fileExists: (f) => {
      const normalized = f.replace(/\\/g, '/').replace(/^\.\//, '');
      if (vfsContentMap.has(normalized)) return true;
      for (const k of vfsContentMap.keys()) {
        if (normalized.endsWith(k)) return true;
      }
      return false;
    },
    readFile: (f) => {
      const normalized = f.replace(/\\/g, '/').replace(/^\.\//, '');
      if (vfsContentMap.has(normalized)) return vfsContentMap.get(normalized);
      for (const [k, v] of vfsContentMap.entries()) {
        if (normalized.endsWith(k)) return v;
      }
      return undefined;
    },
  };

  const parsed = ts.parseJsonConfigFileContent(
    parsedJson.config,
    parseHost,
    '.'
  );

  return {
    ...baseOptions,
    ...parsed.options,
    noEmit: true,
    skipLibCheck: parsed.options.skipLibCheck ?? true,
  };
}

/**
 * Executes a whole-project TypeScript compilation pass across all files in the Virtual File System.
 */
export async function validateGeneratedProject(
  input: string | Map<string, string> | Record<string, string>
): Promise<ProjectValidationResult> {
  const vfsContentMap = new Map<string, string>();
  let codeFiles: string[] = [];

  if (typeof input === 'string') {
    const allVfsFiles = await listVirtualFiles(input);
    codeFiles = allVfsFiles.filter((f: string) => /\.(js|jsx|ts|tsx)$/.test(f));
    for (const f of codeFiles) {
      const content = await readVirtualFile(input, f);
      if (content !== null) {
        vfsContentMap.set(f, content);
      }
    }
  } else if (input instanceof Map) {
    for (const [k, v] of input.entries()) {
      vfsContentMap.set(k.replace(/\\/g, '/').replace(/^\.\//, ''), v);
    }
    codeFiles = Array.from(vfsContentMap.keys()).filter((f) => /\.(js|jsx|ts|tsx)$/.test(f));
  } else {
    for (const [k, v] of Object.entries(input)) {
      vfsContentMap.set(k.replace(/\\/g, '/').replace(/^\.\//, ''), v);
    }
    codeFiles = Array.from(vfsContentMap.keys()).filter((f) => /\.(js|jsx|ts|tsx)$/.test(f));
  }

  const errors: ProjectValidationError[] = [];
  const warnings: ProjectValidationError[] = [];

  for (const [file, content] of vfsContentMap.entries()) {
    if (/\.(tsx?|jsx?)$/.test(file)) {
      validateReactHookImports(file, content, errors);
    }
  }

  const compilerOptions = getProjectCompilerOptions(vfsContentMap);
  const host = ts.createCompilerHost(compilerOptions);
  const defaultReadFile = host.readFile;
  const defaultFileExists = host.fileExists;

  host.readFile = (fileName: string) => {
    const normalized = fileName.replace(/\\/g, '/').replace(/^\.\//, '');
    if (normalized.includes('/node_modules/')) {
      return defaultReadFile(fileName);
    }
    if (vfsContentMap.has(normalized)) {
      return vfsContentMap.get(normalized)!;
    }
    for (const [k, v] of vfsContentMap.entries()) {
      if (normalized.endsWith(k)) return v;
    }
    return defaultReadFile(fileName);
  };

  host.fileExists = (fileName: string) => {
    const normalized = fileName.replace(/\\/g, '/').replace(/^\.\//, '');
    if (normalized.includes('/node_modules/')) {
      return defaultFileExists(fileName);
    }
    if (vfsContentMap.has(normalized)) return true;
    for (const k of vfsContentMap.keys()) {
      if (normalized.endsWith(k)) return true;
    }
    return defaultFileExists(fileName);
  };

  const program = ts.createProgram(codeFiles, compilerOptions, host);
  const diagnostics = ts.getPreEmitDiagnostics(program);

  for (const diag of diagnostics) {
    let file = 'project';
    let line = 1;

    if (diag.file) {
      file = diag.file.fileName.replace(/\\/g, '/');
      if (diag.start !== undefined) {
        const pos = diag.file.getLineAndCharacterOfPosition(diag.start);
        line = pos.line + 1;
      }
    }

    const message = ts.flattenDiagnosticMessageText(diag.messageText, '\n');

    // In a virtual workspace, Prisma client models are defined dynamically in schema.prisma/backend_spec.md
    // but not generated into the host's node_modules/@prisma/client. Ignore ungenerated Prisma client model access.
    if (diag.code === 2339 && message.includes('PrismaClient')) {
      continue;
    }

    const errObj: ProjectValidationError = {
      file,
      line,
      message,
      code: diag.code,
    };

    if (diag.category === ts.DiagnosticCategory.Error) {
      errors.push(errObj);
    } else {
      warnings.push(errObj);
    }
  }

  return {
    success: errors.length === 0,
    errors,
    warnings,
  };
}
