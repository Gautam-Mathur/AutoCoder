export interface DependencyValidationResult {
  valid: boolean;
  usedPackages: string[];
  declaredPackages: string[];
  missingPackages: string[];
  unusedPackages: string[];
  warnings: string[];
}

const NODE_BUILTINS = new Set([
  'assert', 'async_hooks', 'buffer', 'child_process', 'cluster', 'console',
  'constants', 'crypto', 'dgram', 'dns', 'domain', 'events', 'fs', 'fs/promises',
  'http', 'http2', 'https', 'inspector', 'module', 'net', 'os', 'path',
  'perf_hooks', 'process', 'punycode', 'querystring', 'readline', 'repl',
  'stream', 'string_decoder', 'sys', 'timers', 'tls', 'tty', 'dgram', 'url',
  'util', 'v8', 'vm', 'wasi', 'worker_threads', 'zlib'
]);

/**
 * Extracts external NPM package names imported across all VFS code files.
 */
export function collectExternalDependencies(vfsFiles: Record<string, string>): string[] {
  const packages = new Set<string>();

  for (const [filename, content] of Object.entries(vfsFiles)) {
    if (!/\.(js|jsx|ts|tsx)$/.test(filename) || !content) continue;

    // Match import statements: import x from 'specifier' or import 'specifier'
    const importRegex = /(?:import\s+[\s\S]*?\s+from\s+['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\))/g;
    let match: RegExpExecArray | null;

    while ((match = importRegex.exec(content)) !== null) {
      const specifier = match[1] || match[2] || match[3];
      if (!specifier) continue;

      // Skip relative imports and path aliases
      if (specifier.startsWith('.') || specifier.startsWith('/') || specifier.startsWith('@/')) {
        continue;
      }

      // Skip Node built-ins
      if (NODE_BUILTINS.has(specifier) || specifier.startsWith('node:')) {
        continue;
      }

      // Normalize package name: @scope/pkg/subpath -> @scope/pkg, pkg/subpath -> pkg
      let pkgName = specifier;
      if (specifier.startsWith('@')) {
        const parts = specifier.split('/');
        if (parts.length >= 2) {
          pkgName = `${parts[0]}/${parts[1]}`;
        }
      } else {
        pkgName = specifier.split('/')[0];
      }

      packages.add(pkgName);
    }
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
