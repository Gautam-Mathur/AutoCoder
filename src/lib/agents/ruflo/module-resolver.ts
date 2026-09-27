export interface ModuleResolutionContext {
  files: string[];
  baseUrl?: string;
  paths?: Record<string, string[]>;
}

/**
 * Parses compilerOptions from a raw tsconfig.json or jsconfig.json content string.
 */
export function parseTsConfigOptions(tsConfigContent: string): { baseUrl?: string; paths?: Record<string, string[]> } {
  if (!tsConfigContent) return {};
  try {
    // Strip trailing commas and comments before parsing
    const cleaned = tsConfigContent
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*/g, '')
      .replace(/,\s*([\}\]])/g, '$1');
    const parsed = JSON.parse(cleaned);
    const opts = parsed.compilerOptions || {};
    return {
      baseUrl: opts.baseUrl || '.',
      paths: opts.paths || { '@/*': ['./src/*', './*'] },
    };
  } catch (e) {
    return { baseUrl: '.', paths: { '@/*': ['./src/*', './*'] } };
  }
}

/**
 * Resolves an import specifier relative to the importing file and project file set.
 */
export function resolveModule(
  importer: string,
  specifier: string,
  context: ModuleResolutionContext
): string | null {
  const { files, baseUrl = '.', paths = { '@/*': ['./src/*', './*'] } } = context;
  const fileSet = new Set(files.map(f => f.replace(/\\/g, '/').replace(/^[/\\]+/, '').toLowerCase()));

  const resolvePathCandidates = (basePath: string): string | null => {
    const clean = basePath.replace(/\\/g, '/').replace(/^[/\\]+/, '');
    const candidates = [
      clean,
      `${clean}.ts`,
      `${clean}.tsx`,
      `${clean}.js`,
      `${clean}.jsx`,
      `${clean}/index.ts`,
      `${clean}/index.tsx`,
      `${clean}/index.js`,
      `${clean}/index.jsx`,
    ];

    for (const cand of candidates) {
      const normCand = cand.toLowerCase();
      if (fileSet.has(normCand)) {
        // Return matching filename preserving original casing from context.files
        const match = files.find(f => f.replace(/\\/g, '/').replace(/^[/\\]+/, '').toLowerCase() === normCand);
        return match || cand;
      }
    }
    return null;
  };

  // 1. Handle Relative Imports (./ or ../)
  if (specifier.startsWith('.')) {
    const importerDirParts = importer.replace(/\\/g, '/').split('/').slice(0, -1);
    const specParts = specifier.split('/');

    for (const part of specParts) {
      if (part === '.') continue;
      if (part === '..') {
        importerDirParts.pop();
      } else {
        importerDirParts.push(part);
      }
    }

    const resolvedPath = importerDirParts.join('/');
    return resolvePathCandidates(resolvedPath);
  }

  // 2. Handle TypeScript Path Aliases (e.g. @/*)
  for (const [aliasPattern, targetPatterns] of Object.entries(paths)) {
    const prefix = aliasPattern.replace(/\*$/, '');
    if (specifier.startsWith(prefix)) {
      const remainder = specifier.slice(prefix.length);
      for (const targetPattern of targetPatterns) {
        const targetPrefix = targetPattern.replace(/\*$/, '').replace(/^\.\//, '');
        const targetPath = `${targetPrefix}${remainder}`;
        const resolved = resolvePathCandidates(targetPath);
        if (resolved) return resolved;
      }
    }
  }

  // 3. Fallback: Direct Resolution from Base URL
  if (baseUrl) {
    const cleanBase = baseUrl.replace(/^\.\//, '').replace(/^\//, '');
    const directPath = cleanBase && cleanBase !== '.' ? `${cleanBase}/${specifier}` : specifier;
    const resolved = resolvePathCandidates(directPath);
    if (resolved) return resolved;
  }

  return null;
}
