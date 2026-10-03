import { ApiEndpointContract, ProjectContract } from './contracts';

export interface ApiContractError {
  endpoint: string;
  method: string;
  message: string;
  file?: string;
}

export interface ApiContractValidationResult {
  valid: boolean;
  declaredCount: number;
  implementedCount: number;
  errors: ApiContractError[];
  warnings: ApiContractError[];
}

function normalizeRoutePath(p: string): string {
  return p
    .trim()
    .replace(/\/+/g, '/')
    .replace(/\/$/, '')
    .replace(/:[a-zA-Z0-9_]+/g, ':param')
    .replace(/\{[a-zA-Z0-9_]+\}/g, ':param');
}

function expressRouteExists(
  endpoint: ApiEndpointContract,
  vfsFiles: Record<string, string>
): string | undefined {
  const method = endpoint.method.toLowerCase();
  const targetNormPath = normalizeRoutePath(endpoint.path);

  // 1. Direct Regex check in all JS/TS files
  for (const [file, content] of Object.entries(vfsFiles)) {
    if (!/\.(ts|tsx|js|jsx)$/.test(file)) continue;

    const routeRegex = new RegExp(
      `\\.(?:${method}|all|use)\\s*\\(\\s*['"]([^'"]+)['"]`,
      'gi'
    );
    let match: RegExpExecArray | null;
    while ((match = routeRegex.exec(content)) !== null) {
      const declaredPath = match[1];
      if (normalizeRoutePath(declaredPath) === targetNormPath) {
        return file;
      }
    }
  }

  // 2. Router prefix composition check (e.g. app.use('/api', router) + router.get('/boards'))
  const mounts: Array<{ prefix: string; file: string }> = [];
  for (const [file, content] of Object.entries(vfsFiles)) {
    if (!/\.(ts|tsx|js|jsx)$/.test(file)) continue;

    const useMatches = content.matchAll(/app\.use\s*\(\s*['"]([^'"]+)['"]\s*,\s*([a-zA-Z0-9_\$]+)/g);
    for (const um of useMatches) {
      mounts.push({ prefix: um[1], file });
    }
  }

  for (const [file, content] of Object.entries(vfsFiles)) {
    if (!/\.(ts|tsx|js|jsx)$/.test(file)) continue;

    const routerMethodRegex = new RegExp(
      `(?:router|app)\\.(?:${method}|all)\\s*\\(\\s*['"]([^'"]+)['"]`,
      'gi'
    );
    let rm: RegExpExecArray | null;
    while ((rm = routerMethodRegex.exec(content)) !== null) {
      const subPath = rm[1];
      for (const m of mounts) {
        const combinedPath = normalizeRoutePath(`${m.prefix}/${subPath}`);
        if (combinedPath === targetNormPath) {
          return file;
        }
      }
      if (normalizeRoutePath(subPath) === targetNormPath) {
        return file;
      }
    }
  }

  return undefined;
}

/**
 * Validates implemented API routes in VFS against declared API endpoints from backend_spec.md or ProjectContract.
 */
export function validateApiContracts(
  target: ApiEndpointContract[] | ProjectContract | { apiEndpoints: ApiEndpointContract[] },
  vfsFiles: Record<string, string>
): ApiContractValidationResult {
  const errors: ApiContractError[] = [];
  const warnings: ApiContractError[] = [];

  const declaredEndpoints = Array.isArray(target)
    ? target
    : target.apiEndpoints || [];

  const vfsFilePaths = Object.keys(vfsFiles).map((f) => f.replace(/\\/g, '/').replace(/^\.\//, ''));

  let implementedCount = 0;

  for (const decl of declaredEndpoints) {
    const cleanPath = decl.path.replace(/^\/+/, '').replace(/\/+$/, '');
    const methodUpper = decl.method.toUpperCase();

    // Check 1: Express route registration pattern in code files
    const expressMatch = expressRouteExists(decl, vfsFiles);
    if (expressMatch) {
      implementedCount++;
      continue;
    }

    // Check 2: Next.js App Router & Pages Router filesystem routes
    const appRoutePath = `app/${cleanPath}/route.ts`;
    const appRoutePathTsx = `app/${cleanPath}/route.tsx`;
    const appRoutePathJs = `app/${cleanPath}/route.js`;
    const pagesRoutePath = `pages/${cleanPath}.ts`;
    const pagesRoutePathTsx = `pages/${cleanPath}.tsx`;

    const matchingFile = vfsFilePaths.find(
      (f) =>
        f === appRoutePath ||
        f === appRoutePathTsx ||
        f === appRoutePathJs ||
        f === pagesRoutePath ||
        f === pagesRoutePathTsx ||
        f.toLowerCase().includes(cleanPath.toLowerCase())
    );

    if (!matchingFile) {
      errors.push({
        endpoint: decl.path,
        method: decl.method,
        message: `Declared API endpoint "${decl.method} ${decl.path}" has no corresponding route handler implementation in VFS (expected Express route registration or ${appRoutePath}).`,
      });
      continue;
    }

    implementedCount++;

    // Method Handler Check for App Router (exports GET, POST, etc.)
    const fileContent = vfsFiles[matchingFile] || '';
    if (matchingFile.includes('/app/') || matchingFile.includes('route.')) {
      const exportMethodRegex = new RegExp(
        `export\\s+(?:async\\s+)?function\\s+${methodUpper}\\b|export\\s+const\\s+${methodUpper}\\b`,
        'i'
      );
      if (!exportMethodRegex.test(fileContent)) {
        errors.push({
          endpoint: decl.path,
          method: decl.method,
          file: matchingFile,
          message: `API route file "${matchingFile}" exists for "${decl.path}", but does not export HTTP handler function "${methodUpper}".`,
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    declaredCount: declaredEndpoints.length,
    implementedCount,
    errors,
    warnings,
  };
}
