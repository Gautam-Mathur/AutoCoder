import { ApiEndpointContract } from './spec-contract';

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

/**
 * Validates implemented API routes in VFS against declared API endpoints from backend_spec.md.
 */
export function validateApiContracts(
  declaredEndpoints: ApiEndpointContract[],
  vfsFiles: Record<string, string>
): ApiContractValidationResult {
  const errors: ApiContractError[] = [];
  const warnings: ApiContractError[] = [];

  const vfsFilePaths = Object.keys(vfsFiles).map(f => f.replace(/\\/g, '/').replace(/^\.\//, ''));

  let implementedCount = 0;

  for (const decl of declaredEndpoints) {
    const cleanPath = decl.path.replace(/^\/+/, '').replace(/\/+$/, '');
    const methodUpper = decl.method.toUpperCase();

    // Check App Router path: app/api/path/route.ts
    const appRoutePath = `app/${cleanPath}/route.ts`;
    const appRoutePathTsx = `app/${cleanPath}/route.tsx`;
    const appRoutePathJs = `app/${cleanPath}/route.js`;
    // Check Pages Router path: pages/api/path.ts or pages/api/path/index.ts
    const pagesRoutePath = `pages/${cleanPath}.ts`;
    const pagesRoutePathTsx = `pages/${cleanPath}.tsx`;

    const matchingFile = vfsFilePaths.find(f => 
      f === appRoutePath || f === appRoutePathTsx || f === appRoutePathJs ||
      f === pagesRoutePath || f === pagesRoutePathTsx ||
      f.toLowerCase().includes(cleanPath.toLowerCase())
    );

    if (!matchingFile) {
      errors.push({
        endpoint: decl.path,
        method: decl.method,
        message: `Declared API endpoint "${decl.method} ${decl.path}" has no corresponding route handler implementation in VFS (expected ${appRoutePath}).`,
      });
      continue;
    }

    implementedCount++;

    // Method Handler Check for App Router (exports GET, POST, etc.)
    const fileContent = vfsFiles[matchingFile] || '';
    if (matchingFile.includes('/app/') || matchingFile.includes('route.')) {
      const exportMethodRegex = new RegExp(`export\\s+(?:async\\s+)?function\\s+${methodUpper}\\b|export\\s+const\\s+${methodUpper}\\b`, 'i');
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
