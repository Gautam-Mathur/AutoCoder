import ts from 'typescript';

export type ExportKind =
  | 'function'
  | 'class'
  | 'variable'
  | 'interface'
  | 'type'
  | 'enum'
  | 're-export'
  | 'unknown';

export interface ExportRecord {
  exportedName: string;
  localName?: string;
  isDefault: boolean;
  isTypeOnly: boolean;
  kind: ExportKind;
  signature?: string;
  sourceModule?: string;
}

export interface DependencyInterface {
  filePath: string;
  exports: ExportRecord[];
  parseDiagnostics: string[];
  analysisStatus: 'ok' | 'partial' | 'failed';
}

/**
 * Extracts compact TypeScript AST declarations and signatures from source files.
 * Replaces fragile regex extraction with deterministic compiler AST traversal.
 */
export function analyzeSourceExports(filePath: string, content: string): DependencyInterface {
  const parseDiagnostics: string[] = [];
  const exports: ExportRecord[] = [];

  // 1. Specialized handling for non-JS/TS files
  if (filePath.endsWith('.html')) {
    return {
      filePath,
      exports: [],
      parseDiagnostics: [],
      analysisStatus: 'ok',
    };
  }

  if (filePath.endsWith('.css')) {
    return {
      filePath,
      exports: [],
      parseDiagnostics: [],
      analysisStatus: 'ok',
    };
  }

  // 2. TypeScript / JavaScript AST extraction
  try {
    const isTsx = filePath.endsWith('.tsx');
    const isJsx = filePath.endsWith('.jsx');
    const scriptKind = isTsx
      ? ts.ScriptKind.TSX
      : isJsx
      ? ts.ScriptKind.JSX
      : filePath.endsWith('.ts')
      ? ts.ScriptKind.TS
      : ts.ScriptKind.JS;

    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true,
      scriptKind
    );

    // Collect syntax parse diagnostics if any
    const anySourceFile = sourceFile as any;
    if (anySourceFile.parseDiagnostics && Array.isArray(anySourceFile.parseDiagnostics)) {
      for (const diag of anySourceFile.parseDiagnostics) {
        if (typeof diag.messageText === 'string') {
          parseDiagnostics.push(diag.messageText);
        } else if (diag.messageText?.messageText) {
          parseDiagnostics.push(diag.messageText.messageText);
        }
      }
    }

    const formatSignature = (node: ts.Node, fallbackName: string): string => {
      try {
        const text = node.getText(sourceFile).trim();
        // Remove trailing body or block { ... } to keep signature compact
        const bodyIdx = text.indexOf('{');
        if (bodyIdx !== -1) {
          return text.substring(0, bodyIdx).trim();
        }
        return text.replace(/;$/, '').trim();
      } catch {
        return fallbackName;
      }
    };

    ts.forEachChild(sourceFile, (node) => {
      const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
      const hasExport = modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
      const hasDefault = modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword) ?? false;

      // export default function / class / expr
      if (hasDefault) {
        if (ts.isFunctionDeclaration(node)) {
          const fnName = node.name?.text || 'default';
          exports.push({
            exportedName: 'default',
            localName: node.name?.text,
            isDefault: true,
            isTypeOnly: false,
            kind: 'function',
            signature: formatSignature(node, `default function ${fnName}()`),
          });
          return;
        }

        if (ts.isClassDeclaration(node)) {
          const clsName = node.name?.text || 'default';
          exports.push({
            exportedName: 'default',
            localName: node.name?.text,
            isDefault: true,
            isTypeOnly: false,
            kind: 'class',
            signature: formatSignature(node, `default class ${clsName}`),
          });
          return;
        }

        // export default identifier / expression
        exports.push({
          exportedName: 'default',
          isDefault: true,
          isTypeOnly: false,
          kind: 'unknown',
          signature: formatSignature(node, 'export default ...'),
        });
        return;
      }

      // export default assignment: export default expr;
      if (ts.isExportAssignment(node)) {
        const exprText = node.expression.getText(sourceFile).trim();
        exports.push({
          exportedName: 'default',
          localName: exprText,
          isDefault: true,
          isTypeOnly: false,
          kind: 'unknown',
          signature: `export default ${exprText}`,
        });
        return;
      }

      // export function / class / const / interface / type / enum
      if (hasExport) {
        if (ts.isFunctionDeclaration(node) && node.name) {
          exports.push({
            exportedName: node.name.text,
            localName: node.name.text,
            isDefault: false,
            isTypeOnly: false,
            kind: 'function',
            signature: formatSignature(node, `function ${node.name.text}()`),
          });
          return;
        }

        if (ts.isClassDeclaration(node) && node.name) {
          exports.push({
            exportedName: node.name.text,
            localName: node.name.text,
            isDefault: false,
            isTypeOnly: false,
            kind: 'class',
            signature: formatSignature(node, `class ${node.name.text}`),
          });
          return;
        }

        if (ts.isInterfaceDeclaration(node)) {
          exports.push({
            exportedName: node.name.text,
            localName: node.name.text,
            isDefault: false,
            isTypeOnly: true,
            kind: 'interface',
            signature: formatSignature(node, `interface ${node.name.text}`),
          });
          return;
        }

        if (ts.isTypeAliasDeclaration(node)) {
          exports.push({
            exportedName: node.name.text,
            localName: node.name.text,
            isDefault: false,
            isTypeOnly: true,
            kind: 'type',
            signature: formatSignature(node, `type ${node.name.text}`),
          });
          return;
        }

        if (ts.isEnumDeclaration(node)) {
          exports.push({
            exportedName: node.name.text,
            localName: node.name.text,
            isDefault: false,
            isTypeOnly: false,
            kind: 'enum',
            signature: formatSignature(node, `enum ${node.name.text}`),
          });
          return;
        }

        if (ts.isVariableStatement(node)) {
          for (const decl of node.declarationList.declarations) {
            if (ts.isIdentifier(decl.name)) {
              const typeText = decl.type ? `: ${decl.type.getText(sourceFile)}` : '';
              exports.push({
                exportedName: decl.name.text,
                localName: decl.name.text,
                isDefault: false,
                isTypeOnly: false,
                kind: 'variable',
                signature: `const ${decl.name.text}${typeText}`,
              });
            }
          }
          return;
        }
      }

      // export { a, b as c } [from './mod']
      if (ts.isExportDeclaration(node)) {
        const sourceModule = node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)
          ? node.moduleSpecifier.text
          : undefined;
        const isTypeOnly = Boolean(node.isTypeOnly);

        // export * from './mod'
        if (!node.exportClause && sourceModule) {
          exports.push({
            exportedName: '*',
            isDefault: false,
            isTypeOnly,
            kind: 're-export',
            sourceModule,
            signature: `export * from '${sourceModule}'`,
          });
          return;
        }

        // export * as ns from './mod'
        if (node.exportClause && ts.isNamespaceExport(node.exportClause)) {
          exports.push({
            exportedName: node.exportClause.name.text,
            isDefault: false,
            isTypeOnly,
            kind: 're-export',
            sourceModule,
            signature: `export * as ${node.exportClause.name.text} from '${sourceModule}'`,
          });
          return;
        }

        // export { a, b as c }
        if (node.exportClause && ts.isNamedExports(node.exportClause)) {
          for (const el of node.exportClause.elements) {
            const localName = (el.propertyName || el.name).text;
            const exportedName = el.name.text;
            const elTypeOnly = isTypeOnly || Boolean(el.isTypeOnly);

            exports.push({
              exportedName,
              localName,
              isDefault: exportedName === 'default',
              isTypeOnly: elTypeOnly,
              kind: sourceModule ? 're-export' : 'unknown',
              sourceModule,
              signature: sourceModule
                ? `export { ${localName !== exportedName ? `${localName} as ` : ''}${exportedName} } from '${sourceModule}'`
                : `export { ${localName !== exportedName ? `${localName} as ` : ''}${exportedName} }`,
            });
          }
        }
      }
    });

    return {
      filePath,
      exports,
      parseDiagnostics,
      analysisStatus: parseDiagnostics.length > 0 ? 'partial' : 'ok',
    };
  } catch (err: any) {
    return {
      filePath,
      exports: [],
      parseDiagnostics: [err?.message || String(err)],
      analysisStatus: 'failed',
    };
  }
}

/**
 * Produces a concise, authoritative AST summary of dependency interfaces for Coder context.
 */
export function extractDependencyInterfaceAST(filePath: string, content: string): string {
  if (filePath.endsWith('.html')) {
    const ids = [...content.matchAll(/\bid=["']([^"']+)["']/g)].map((m) => m[1]);
    const cssLinks = [...content.matchAll(/href=["']([^"']+\.css)["']/g)].map((m) => m[1]);
    const jsLinks = [...content.matchAll(/src=["']([^"']+\.js)["']/g)].map((m) => m[1]);
    return `[HTML] IDs: ${[...new Set(ids)].join(', ') || 'none'} | CSS links: ${cssLinks.join(', ') || 'none'} | Scripts: ${jsLinks.join(', ') || 'none'}`;
  }

  if (filePath.endsWith('.css')) {
    const selectors = [...content.matchAll(/^([.#][\w-]+)/gm)].map((m) => m[1]);
    const vars = [...content.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]);
    return `[CSS] Selectors: ${[...new Set(selectors)].join(', ') || 'none'} | Variables: ${[...new Set(vars)].join(', ') || 'none'}`;
  }

  if (/\.(js|ts|jsx|tsx)$/.test(filePath)) {
    const analysis = analyzeSourceExports(filePath, content);
    if (analysis.exports.length === 0) {
      if (analysis.analysisStatus === 'failed') {
        return `[JS/TS] Parse Failed: ${analysis.parseDiagnostics.join('; ')}`;
      }
      return '[JS/TS] Exports: none';
    }

    const formatted = analysis.exports.map((e) => {
      if (e.isDefault) {
        return e.signature ? `default (${e.signature})` : 'default';
      }
      return e.signature || e.exportedName;
    });

    return `[JS/TS AST] Exports:\n${formatted.map((f) => `  - ${f}`).join('\n')}`;
  }

  return content.substring(0, 300);
}
