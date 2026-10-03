import { ProjectContract } from './contracts';

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
  targetFramework: 'NEXT_APP_ROUTER' | 'NEXT_PAGES_ROUTER' | 'VITE_SPA' | 'REACT_WEBPACK_SPA' | 'STATIC_HTML' = 'NEXT_APP_ROUTER',
  contract?: ProjectContract
): FrameworkValidationResult {
  const errors: FrameworkValidationError[] = [];
  const warnings: FrameworkValidationError[] = [];

  const filePaths = Object.keys(vfsFiles).map((f) => f.replace(/\\/g, '/').replace(/^\.\//, ''));

  // 1. Router Style Consistency Check
  const appRoutes = filePaths.filter((f) => f.startsWith('app/') || f.startsWith('src/app/'));
  const pagesRoutes = filePaths.filter(
    (f) =>
      (f.startsWith('pages/') || f.startsWith('src/pages/')) &&
      !f.includes('pages/_app') &&
      !f.includes('pages/_document')
  );

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

  if (targetFramework === 'NEXT_APP_ROUTER') {
    const entryPoints = contract?.entryPoints || ['src/app/page.tsx', 'app/page.tsx'];
    const hasCanonicalEntry =
      entryPoints.some((ep) => filePaths.includes(ep) || filePaths.some((f) => f === ep || f.endsWith(ep))) ||
      appRoutes.length > 0;

    if (!hasCanonicalEntry) {
      errors.push({
        file: entryPoints[0] || 'src/app/page.tsx',
        line: 1,
        severity: 'ERROR',
        message: `Next.js App Router project is missing a root page entry point (${entryPoints.join(' or ')}).`,
      });
    }
  }

  // 2. App Router Client/Server Execution Boundary & Stripe Secret Validation
  const SERVER_ONLY_IMPORTS = ['prisma', '@prisma/client', '@/lib/prisma', 'lib/prisma', 'fs', 'fs/promises', 'child_process'];

  for (const [filename, content] of Object.entries(vfsFiles)) {
    if (!/\.(js|jsx|ts|tsx)$/.test(filename) || !content) continue;
    const cleanPath = filename.replace(/\\/g, '/').replace(/^\.\//, '');

    const isAppRouterFile = cleanPath.startsWith('app/') || cleanPath.startsWith('src/app/');
    const hasUseClient = /^\s*['"]use client['"]/m.test(content);
    const usesReactHooks = /\b(useState|useEffect|useContext|useReducer|useCallback|useMemo|useRef|useLayoutEffect|useTransition)\b/.test(
      content
    );

    // Rule 0: Reject malformed / unnamed dynamic route segment paths
    if (/(^|\/)(app|pages)\/.*\[\s*\.\.\.\s*\]/i.test(cleanPath) || /(^|\/)(app|pages)\/.*\[\s*\]/i.test(cleanPath)) {
      errors.push({
        file: cleanPath,
        line: 1,
        severity: 'ERROR',
        message: `Next.js Invalid Route Segment: File path "${cleanPath}" contains an unnamed dynamic segment. Segment must be named (e.g., "[id]", "[...slug]", "[[...slug]]").`,
      });
    }

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

    // Rule C: Client components / browser files CANNOT expose Stripe secrets or server Stripe SDK
    if (hasUseClient || cleanPath.startsWith('src/components/') || cleanPath.startsWith('components/')) {
      if (
        /STRIPE_SECRET_KEY|sk_live_|sk_test_/i.test(content) ||
        /require\(['"]stripe['"]\)|from\s+['"]stripe['"]|new\s+Stripe\(/i.test(content)
      ) {
        errors.push({
          file: cleanPath,
          line: 1,
          severity: 'ERROR',
          message: `Security & Boundary Violation: Client component "${cleanPath}" exposes Stripe secret key or server-side Stripe SDK. Move Stripe secret operations to API route handlers or Server Components.`,
        });
      }
    }
  }

  if (targetFramework === 'VITE_SPA') {
    validateViteBootstrap(vfsFiles, errors, contract);
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

function validateViteBootstrap(
  vfsFiles: Record<string, string>,
  errors: FrameworkValidationError[],
  contract?: ProjectContract
): void {
  const viteConfig = Object.keys(vfsFiles).find((f) => /(^|\/)vite\.config\.(js|cjs|mjs|ts)$/i.test(f));

  if (!viteConfig) {
    errors.push({
      file: 'vite.config.js',
      line: 1,
      severity: 'ERROR',
      message: 'VITE_SPA requires a vite configuration file (e.g. vite.config.js or vite.config.ts).',
    });
  }

  let mountIdInCode: string | null = null;
  const canonicalEntries = contract?.entryPoints || [];
  for (const entry of canonicalEntries) {
    const code = vfsFiles[entry] || vfsFiles[`./${entry}`] || vfsFiles[`/${entry}`];
    if (code) {
      const match = code.match(/document\.getElementById\(["']([^"']+)["']\)/i);
      if (match) {
        mountIdInCode = match[1];
        break;
      }
    }
  }

  if (!mountIdInCode) {
    for (const [file, code] of Object.entries(vfsFiles)) {
      if (!/\.(js|jsx|ts|tsx)$/.test(file) || !code) continue;
      const match = code.match(/document\.getElementById\(["']([^"']+)["']\)/i);
      if (match) {
        mountIdInCode = match[1];
        break;
      }
    }
  }

  for (const [file, html] of Object.entries(vfsFiles)) {
    if (!/\.html$/i.test(file)) continue;

    const scriptMatches = Array.from(html.matchAll(/<script\b([^>]*)>(?:<\/script>)?/gi));

    let hasModuleScript = false;

    for (const m of scriptMatches) {
      const attrs = m[1];
      const srcMatch = attrs.match(/src=["']([^"']+)["']/i);
      const isModule = /type=["']module["']/i.test(attrs);

      if (srcMatch) {
        const src = srcMatch[1];
        if (isModule) {
          hasModuleScript = true;
        }

        if (/^(?:\/)?(server|api)\//i.test(src) || /(^|\/)(server|app)\.(js|ts)$/i.test(src)) {
          errors.push({
            file,
            line: 1,
            severity: 'ERROR',
            message: `Vite HTML must not reference backend/server script "${src}".`,
          });
        }

        if (/(^|\/)(components|services|types|utils|hooks)\//i.test(src)) {
          errors.push({
            file,
            line: 1,
            severity: 'ERROR',
            message: `Vite HTML must not directly link non-entry source module "${src}". Import it in your entry module instead.`,
          });
        }
      }
    }

    if (!hasModuleScript) {
      errors.push({
        file,
        line: 1,
        severity: 'ERROR',
        message: 'Vite HTML must include a <script type="module" src="..."> entry point.',
      });
    }

    const targetId = mountIdInCode || 'root';
    const idRegex = new RegExp(`id=["']${targetId}["']`, 'i');
    if (!idRegex.test(html)) {
      if (mountIdInCode) {
        errors.push({
          file,
          line: 1,
          severity: 'ERROR',
          message: `React mount target mismatch: React entry point mounts to element id="${mountIdInCode}" but "${file}" does not contain an element with id="${mountIdInCode}".`,
        });
      } else if (!/<div[^>]+id=["'](root|app)["']/i.test(html)) {
        errors.push({
          file,
          line: 1,
          severity: 'ERROR',
          message: 'Vite HTML is missing a React mount container (e.g. <div id="root"> or <div id="app">).',
        });
      }
    }
  }
}

function validateReactWebpackBootstrap(vfsFiles: Record<string, string>, errors: FrameworkValidationError[]): void {
  const webpackConfig = Object.keys(vfsFiles).find((f) => /(^|\/)webpack\.config\.(js|cjs|mjs|ts)$/i.test(f));

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

    const scripts = Array.from(html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)).map((m) => m[1]);

    const duplicates = [...new Set(scripts.filter((src, i) => scripts.indexOf(src) !== i))];

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
