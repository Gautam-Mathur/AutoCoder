export type RuntimeContext =
  | 'NEXT_SERVER'
  | 'NEXT_CLIENT'
  | 'BROWSER'
  | 'SERVER'
  | 'SHARED';

/**
 * Classifies file runtime context deterministically based on path, content directives, and project framework.
 */
export function classifyRuntimeContext(
  filePath: string,
  content?: string,
  framework: string = 'STATIC_HTML'
): RuntimeContext {
  const cleanPath = filePath.replace(/\\/g, '/').replace(/^\.\//, '');
  const isHtml = cleanPath.endsWith('.html');
  const hasUseClient = content ? /^\s*['"]use client['"]/m.test(content) : false;
  const hasUseServer = content ? /^\s*['"]use server['"]/m.test(content) : false;

  if (framework === 'NEXT_APP_ROUTER') {
    // 1. Next.js App Router Route Handlers & Server Actions
    if (
      /(^|\/)api\//i.test(cleanPath) ||
      cleanPath.endsWith('/route.ts') ||
      cleanPath.endsWith('/route.tsx') ||
      cleanPath.endsWith('/route.js') ||
      cleanPath.endsWith('/route.jsx') ||
      hasUseServer
    ) {
      return 'NEXT_SERVER';
    }

    // 2. Explicit Client Component Directive
    if (hasUseClient) {
      return 'NEXT_CLIENT';
    }

    // 3. Database / Server-only modules
    if (
      cleanPath.includes('lib/prisma') ||
      cleanPath.includes('lib/db') ||
      cleanPath.startsWith('prisma/') ||
      cleanPath.includes('/prisma/') ||
      cleanPath.startsWith('server/') ||
      cleanPath.startsWith('api/')
    ) {
      return 'NEXT_SERVER';
    }

    // 4. Default App Router files (app/page.tsx, app/layout.tsx, etc.) without "use client" are Server Components
    if (cleanPath.startsWith('app/') || cleanPath.startsWith('src/app/')) {
      return 'NEXT_SERVER';
    }

    // 5. Shared components or utilities outside app/
    if (cleanPath.startsWith('src/components/') || cleanPath.startsWith('components/')) {
      return hasUseClient ? 'NEXT_CLIENT' : 'NEXT_SERVER';
    }

    return 'SHARED';
  }

  if (framework === 'NEXT_PAGES_ROUTER') {
    if (cleanPath.startsWith('pages/api/') || cleanPath.startsWith('src/pages/api/')) {
      return 'NEXT_SERVER';
    }
    return 'NEXT_CLIENT';
  }

  if (framework === 'VITE_SPA' || framework === 'REACT_WEBPACK_SPA' || framework === 'STATIC_HTML') {
    if (cleanPath.startsWith('server/') || cleanPath.startsWith('api/')) {
      return 'SERVER';
    }
    if (isHtml || cleanPath.startsWith('src/') || /(^|\/)(main|index|app)\.(tsx|jsx|ts|js)$/i.test(cleanPath)) {
      return 'BROWSER';
    }
    return 'SHARED';
  }

  return 'SHARED';
}
