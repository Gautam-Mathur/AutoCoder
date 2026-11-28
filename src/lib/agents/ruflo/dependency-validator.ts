import { builtinModules } from 'node:module';
import ts from 'typescript';

export interface DependencyValidationResult {
  valid: boolean;
  usedPackages: string[];
  declaredPackages: string[];
  missingPackages: string[];
  unusedPackages: string[];
  warnings: string[];
}

const NODE_BUILTINS = new Set<string>([
  ...builtinModules.map((m) => m.replace(/^node:/, '')),
  ...builtinModules.map((m) => m.replace(/^node:/, '').split('/')[0]),
  'sys',
]);

/**
 * Extracts external NPM package names imported across all VFS code files using the TypeScript AST.
 */
export function collectExternalDependencies(vfsFiles: Record<string, string>): string[] {
  const packages = new Set<string>();

  const isStringLikeSpecifier = (
    node: ts.Node | undefined
  ): node is ts.StringLiteral | ts.NoSubstitutionTemplateLiteral =>
    Boolean(node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)));

  for (const [filename, content] of Object.entries(vfsFiles)) {
    const extension = filename.toLowerCase().split('.').pop();
    if (!['js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs'].includes(extension || '') || !content) {
      continue;
    }

    const scriptKind =
      extension === 'tsx'
        ? ts.ScriptKind.TSX
        : extension === 'jsx'
        ? ts.ScriptKind.JSX
        : extension === 'js' || extension === 'mjs' || extension === 'cjs'
        ? ts.ScriptKind.JS
        : ts.ScriptKind.TS;

    const sourceFile = ts.createSourceFile(
      filename,
      content,
      ts.ScriptTarget.Latest,
      true,
      scriptKind
    );

    const addSpecifier = (specifier: string) => {
      if (
        !specifier ||
        specifier.startsWith('.') ||
        specifier.startsWith('/') ||
        specifier.startsWith('@/') ||
        specifier.startsWith('~/') ||
        specifier.startsWith('#')
      ) {
        return;
      }

      if (specifier.startsWith('node:')) {
        return;
      }

      const withoutNodePrefix = specifier.replace(/^node:/, '');
      const builtinRoot = withoutNodePrefix.split('/')[0];
      if (NODE_BUILTINS.has(withoutNodePrefix) || NODE_BUILTINS.has(builtinRoot)) {
        return;
      }

      const parts = specifier.split('/');
      const packageName = specifier.startsWith('@')
        ? parts.length >= 2
          ? `${parts[0]}/${parts[1]}`
          : specifier
        : parts[0];

      if (packageName) {
        packages.add(packageName);
      }
    };

    const visit = (node: ts.Node): void => {
      if (ts.isImportDeclaration(node) && isStringLikeSpecifier(node.moduleSpecifier)) {
        addSpecifier(node.moduleSpecifier.text);
      } else if (
        ts.isExportDeclaration(node) &&
        node.moduleSpecifier &&
        isStringLikeSpecifier(node.moduleSpecifier)
      ) {
        addSpecifier(node.moduleSpecifier.text);
      } else if (
        ts.isImportEqualsDeclaration(node) &&
        ts.isExternalModuleReference(node.moduleReference) &&
        isStringLikeSpecifier(node.moduleReference.expression)
      ) {
        addSpecifier(node.moduleReference.expression.text);
      } else if (ts.isCallExpression(node) && node.arguments.length === 1) {
        const argument = node.arguments[0];
        if (!isStringLikeSpecifier(argument)) {
          ts.forEachChild(node, visit);
          return;
        }

        const isRequire =
          ts.isIdentifier(node.expression) && node.expression.text === 'require';
        const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;

        if (isRequire || isDynamicImport) {
          addSpecifier(argument.text);
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  return Array.from(packages);
}

/**
 * Validates that all imported NPM packages exist in package.json dependencies.
 */
export function validatePackageDependencies(
  vfsFiles: Record<string, string>,
  packageJsonContent: string
): DependencyValidationResult {
  const usedPackages = collectExternalDependencies(vfsFiles);
  const declaredPackages: string[] = [];
  const warnings: string[] = [];

  if (packageJsonContent) {
    try {
      const pkg = JSON.parse(packageJsonContent);
      const deps = pkg.dependencies || {};
      const devDeps = pkg.devDependencies || {};
      Object.keys(deps).forEach(d => declaredPackages.push(d));
      Object.keys(devDeps).forEach(d => {
        if (!declaredPackages.includes(d)) declaredPackages.push(d);
      });
    } catch (e) {
      warnings.push('Failed to parse package.json content.');
    }
  }

  const declaredSet = new Set(declaredPackages);
  const missingPackages = usedPackages.filter(pkg => !declaredSet.has(pkg));
  const usedSet = new Set(usedPackages);
  const unusedPackages = declaredPackages.filter(pkg => !usedSet.has(pkg) && !['react', 'react-dom', 'next', 'typescript'].includes(pkg));

  return {
    valid: missingPackages.length === 0,
    usedPackages,
    declaredPackages,
    missingPackages,
    unusedPackages,
    warnings,
  };
}
