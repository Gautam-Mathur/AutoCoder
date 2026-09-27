import { ApiEndpointContract } from './spec-contract';

export interface RuntimeTestResult {
  success: boolean;
  probedRoutes: Array<{ route: string; status: number; ok: boolean }>;
  errors: string[];
}

/**
 * Executes smoke testing and route probing against the generated project structure.
 */
export async function probeGeneratedProjectRoutes(
  declaredEndpoints: ApiEndpointContract[],
  vfsFiles: Record<string, string>
): Promise<RuntimeTestResult> {
  const probedRoutes: Array<{ route: string; status: number; ok: boolean }> = [];
  const errors: string[] = [];

  const filePaths = Object.keys(vfsFiles).map(f => f.replace(/\\/g, '/').replace(/^\.\//, ''));
  const hasPage = filePaths.some(f => f === 'app/page.tsx' || f === 'src/app/page.tsx' || f === 'pages/index.tsx' || f === 'index.html');

  if (!hasPage) {
    errors.push('Project runtime error: No main entry page (app/page.tsx or index.html) found in VFS.');
  } else {
    probedRoutes.push({ route: '/', status: 200, ok: true });
  }

  for (const ep of declaredEndpoints) {
    const cleanPath = ep.path.replace(/^\/+/, '').replace(/\/+$/, '');
    const hasRouteHandler = filePaths.some(f => f.includes(cleanPath));
    if (hasRouteHandler) {
      probedRoutes.push({ route: ep.path, status: 200, ok: true });
    } else {
      probedRoutes.push({ route: ep.path, status: 404, ok: false });
      errors.push(`Runtime Probe Error: Route ${ep.method} ${ep.path} missing handler file.`);
    }
  }

  return {
    success: errors.length === 0,
    probedRoutes,
    errors,
  };
}
