export interface FrameworkValidationError {
  file: string;
  line: number;
  message: string;
  severity: 'ERROR' | 'WARNING';
}

export interface FrameworkValidationResult {
  valid: boolean;
  routingStyle: 'NEXT_APP_ROUTER' | 'NEXT_PAGES_ROUTER' | 'VITE_SPA' | 'REACT_WEBPACK_SPA' | 'STATIC_HTML';
  errors: FrameworkValidationError[];
  warnings: FrameworkValidationError[];
}

/**
 * Comprehensive Next.js / Framework Execution Context and Client-Server Boundary Validator.
 */
export function validateFrameworkBoundaries(
  vfsFiles: Record<string, string>,
  targetFramework: 'NEXT_APP_ROUTER' | 'NEXT_PAGES_ROUTER' | 'VITE_SPA' | 'REACT_WEBPACK_SPA' | 'STATIC_HTML' = 'NEXT_APP_ROUTER'
): FrameworkValidationResult {
  const errors: FrameworkValidationError[] = [];
  const warnings: FrameworkValidationError[] = [];

  const filePaths = Object.keys(vfsFiles).map(f => f.replace(/\\/g, '/').replace(/^\.\//, ''));

  // 1. Router Style Consistency Check
  const appRoutes = filePaths.filter(f => f.startsWith('app/') || f.startsWith('src/app/'));
  const pagesRoutes = filePaths.filter(f => (f.startsWith('pages/') || f.startsWith('src/pages/')) && !f.includes('pages/_app') && !f.includes('pages/_document'));

  if (targetFramework === 'NEXT_APP_ROUTER' && pagesRoutes.length > 0 && appRoutes.length > 0) {
    errors.push({
      file: pagesRoutes[0],
      line: 1,
      severity: 'ERROR',
      message: `Framework Routing Contradiction: Project uses Next.js App Router (${appRoutes.length} app routes), but contains conflicting Pages Router routes: ${pagesRoutes.join(', ')}.`,
    });
  }

  if (targetFramework === 'NEXT_PAGES_ROUTER' && appRoutes.length > 0) {
    errors.push({
      file: appRoutes[0],
      line: 1,
      severity: 'ERROR',
      message: `Framework Routing Contradiction: Project configured for Pages Router, but contains App Router routes: ${appRoutes.join(', ')}.`,
    });
  }

  // 2. App Router Client/Server Execution Boundary Validation
  const SERVER_ONLY_IMPORTS = ['prisma', '@prisma/client', '@/lib/prisma', 'lib/prisma', 'fs', 'fs/promises', 'child_process'];

  for (const [filename, content] of Object.entries(vfsFiles)) {
    if (!/\.(js|jsx|ts|tsx)$/.test(filename) || !content) continue;
    const cleanPath = filename.replace(/\\/g, '/').replace(/^\.\//, '');

    const isAppRouterFile = cleanPath.startsWith('app/') || cleanPath.startsWith('src/app/');
    const hasUseClient = /^\s*['"]use client['"]/m.test(content);
    const usesReactHooks = /\b(useState|useEffect|useContext|useReducer|useCallback|useMemo|useRef|useLayoutEffect|useTransition)\b/.test(content);

    // Rule A: React Hooks in App Router require 'use client'
    if (isAppRouterFile && usesReactHooks && !hasUseClient) {
      errors.push({
        file: cleanPath,
        line: 1,
        severity: 'ERROR',
        message: `Next.js Boundary Violation: File "${cleanPath}" uses React hooks but is missing the 'use client' directive at the top of the file.`,
      });
    }

    // Rule B: Client components ('use client') CANNOT import server-only modules
    if (hasUseClient) {
      const lines = content.split('\n');
      for (let lIdx = 0; lIdx < lines.length; lIdx++) {
        const line = lines[lIdx];
        for (const sImp of SERVER_ONLY_IMPORTS) {
          const importPattern = new RegExp(`import\\s+.*\\s+from\\s+['"]${sImp}['"]|require\\(['"]${sImp}['"]\\)`, 'i');
          if (importPattern.test(line)) {
            errors.push({
              file: cleanPath,
              line: lIdx + 1,
              severity: 'ERROR',
              message: `Next.js Boundary Violation: Client component "${cleanPath}" ('use client') imports server-only module "${sImp}". Move server queries to Server Components or API Route handlers.`,
            });
          }
        }
      }
    }
  }

  if (targetFramework === 'REACT_WEBPACK_SPA') {
    validateReactWebpackBootstrap(vfsFiles, errors);
  }

  return {
    valid: errors.length === 0,
    routingStyle: targetFramework,
    errors,
    warnings,
  };
}

function validateReactWebpackBootstrap(
  vfsFiles: Record<string, string>,
  errors: FrameworkValidationError[]
): void {
  const webpackConfig = Object.keys(vfsFiles).find((f) =>
    /(^|\/)webpack\.config\.(js|cjs|mjs|ts)$/i.test(f)
  );

  if (!webpackConfig) {
    errors.push({
      file: 'webpack.config.js',
      line: 1,
      severity: 'ERROR',
      message: 'REACT_WEBPACK_SPA requires a webpack configuration file.',
    });
  }

  for (const [file, html] of Object.entries(vfsFiles)) {
    if (!/\.html$/i.test(file)) continue;

    const scripts = Array.from(
      html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)
    ).map((m) => m[1]);

    const duplicates = [
      ...new Set(scripts.filter((src, i) => scripts.indexOf(src) !== i)),
    ];

    for (const src of duplicates) {
      errors.push({
        file,
        line: 1,
        severity: 'ERROR',
        message: `Duplicate script reference "${src}" in React/Webpack HTML.`,
      });
    }

    for (const src of scripts) {
      if (/\.tsx?$/i.test(src) || /^src\//i.test(src) || /^\.\/src\//i.test(src)) {
        errors.push({
          file,
          line: 1,
          severity: 'ERROR',
          message: `React/Webpack HTML must not directly execute source module "${src}".`,
        });
      }
    }

    if (!/<div[^>]+id=["']root["']/i.test(html)) {
      errors.push({
        file,
        line: 1,
        severity: 'ERROR',
        message: 'React/Webpack HTML is missing the React root container.',
      });
    }
  }
}

