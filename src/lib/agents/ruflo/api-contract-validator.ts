import { ApiEndpointContract } from './contracts';

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

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function expressRouteExists(
  endpoint: ApiEndpointContract,
  vfsFiles: Record<string, string>
): string | undefined {
  const method = endpoint.method.toLowerCase();
  const path = endpoint.path;

  const pattern = new RegExp(
    `\\.(?:${method}|all|use)\\s*\\(\\s*['"]${escapeRegex(path)}['"]`,
    'i'
  );

  for (const [file, content] of Object.entries(vfsFiles)) {
    if (!/\.(ts|tsx|js|jsx)$/.test(file)) continue;
    if (pattern.test(content)) return file;
  }

  return undefined;
}

/**
 * Validates implemented API routes in VFS against declared API endpoints from backend_spec.md.
 */
export function validateApiContracts(
  declaredEndpoints: ApiEndpointContract[],
  vfsFiles: Record<string, string>
): ApiContractValidationResult {
  const errors: ApiContractError[] = [];
  const warnings: ApiContractError[] = [];

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
