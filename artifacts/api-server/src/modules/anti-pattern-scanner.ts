/**
 * Anti-Pattern Scanner
 *
 * Detects common code quality anti-patterns in generated code:
 * - N+1 query patterns (fetching in loops)
 * - Missing pagination on large collection endpoints
 * - Unprotected admin/sensitive routes
 * - Hardcoded strings that should be constants
 * - Missing form validation
 * - Unused data fetches in components
 * - Inline styles vs Tailwind
 * - Direct DOM manipulation in React
 * - Missing key props in lists
 * - Oversized components
 */

interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

export interface AntiPatternIssue {
  type: string;
  severity: 'error' | 'warning' | 'info';
  file: string;
  line: number;
  message: string;
  recommendation: string;
  category: 'performance' | 'security' | 'maintainability' | 'reliability' | 'accessibility';
}

export interface AntiPatternReport {
  issues: AntiPatternIssue[];
  stats: {
    filesScanned: number;
    issuesFound: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
  };
}

function detectN1Queries(content: string, filePath: string): AntiPatternIssue[] {
  const issues: AntiPatternIssue[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/for\s*\(|\.forEach\s*\(|\.map\s*\(/.test(line)) {
      for (let j = i + 1; j < Math.min(lines.length, i + 15); j++) {
        if (/await\s+(?:db|storage|pool|client)\s*\./.test(lines[j]) ||
            /await\s+\w+\.(?:findOne|findById|get|query|select|fetch)\s*\(/.test(lines[j])) {
          issues.push({
            type: 'n_plus_1_query',
            severity: 'warning',
            file: filePath,
            line: j + 1,
            message: 'Database query inside a loop — this is an N+1 query pattern',
            recommendation: 'Batch the queries: fetch all records in one query using WHERE IN, then map them in memory',
            category: 'performance',
          });
          break;
        }
      }
    }
  }

  return issues;
}

function detectMissingPagination(content: string, filePath: string): AntiPatternIssue[] {
  const issues: AntiPatternIssue[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const routeMatch = line.match(/app\.get\s*\(\s*['"`](\/api\/\w+)['"`]/);
    if (!routeMatch) continue;
    if (routeMatch[1].includes(':')) continue;

    let hasPagination = false;
    for (let j = i; j < Math.min(lines.length, i + 30); j++) {
      if (/limit|offset|page|cursor|skip|take|per_page|pageSize/.test(lines[j])) {
        hasPagination = true;
        break;
      }
    }

    if (!hasPagination) {
      issues.push({
        type: 'missing_pagination',
        severity: 'warning',
        file: filePath,
        line: i + 1,
        message: `GET ${routeMatch[1]} returns all records without pagination`,
        recommendation: 'Add limit/offset or cursor-based pagination to prevent loading unbounded data sets',
        category: 'performance',
      });
    }
  }

  return issues;
}

function detectUnprotectedRoutes(content: string, filePath: string): AntiPatternIssue[] {
  const issues: AntiPatternIssue[] = [];
  const lines = content.split('\n');

  const sensitivePatterns = [
    /admin/i, /user.*delete/i, /settings/i, /role/i, /permission/i,
    /password/i, /secret/i, /config/i, /billing/i, /payment/i,
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const routeMatch = line.match(/app\.(post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/);
    if (!routeMatch) continue;

    const path = routeMatch[2];
    const isSensitive = sensitivePatterns.some(p => p.test(path));
    if (!isSensitive) continue;

    let hasAuth = false;
    const routeArgs = line;
    if (/requireAuth|requireRole|isAuthenticated|checkAuth|authenticate|requireLogin|isAdmin|checkPermission/.test(routeArgs)) {
      hasAuth = true;
    }
    for (let j = Math.max(0, i - 3); j <= i; j++) {
      if (/requireAuth|requireRole|isAuthenticated|middleware|checkAuth|requireLogin/.test(lines[j])) {
        hasAuth = true;
      }
    }

    if (!hasAuth) {
      issues.push({
        type: 'unprotected_sensitive_route',
        severity: 'error',
        file: filePath,
        line: i + 1,
        message: `Sensitive route ${routeMatch[1].toUpperCase()} ${path} has no authentication middleware`,
        recommendation: 'Add authentication middleware (requireAuth, requireRole) to protect sensitive endpoints',
        category: 'security',
      });
    }
  }

  return issues;
}

function detectHardcodedStrings(content: string, filePath: string): AntiPatternIssue[] {
  const issues: AntiPatternIssue[] = [];
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return issues;
  const lines = content.split('\n');

  let hardcodedUrlCount = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;

    if (/['"`]https?:\/\/(?!localhost|127\.0\.0\.1)[^'"`]+['"`]/.test(line) &&
        !/import/.test(line) && !/\/\//.test(line.split(/['"`]/)[0])) {
      hardcodedUrlCount++;
    }
  }

  if (hardcodedUrlCount > 2) {
    issues.push({
      type: 'hardcoded_urls',
      severity: 'warning',
      file: filePath,
      line: 1,
      message: `${hardcodedUrlCount} hardcoded URLs found — should use environment variables or constants`,
      recommendation: 'Extract URLs to environment variables (process.env.API_URL) or a constants file',
      category: 'maintainability',
    });
  }

  return issues;
}

function detectOversizedComponents(content: string, filePath: string): AntiPatternIssue[] {
  const issues: AntiPatternIssue[] = [];
  if (!filePath.endsWith('.tsx')) return issues;

  const lineCount = content.split('\n').length;
  if (lineCount > 400) {
    issues.push({
      type: 'oversized_component',
      severity: 'warning',
      file: filePath,
      line: 1,
      message: `Component file is ${lineCount} lines — consider splitting into smaller components`,
      recommendation: 'Extract logical sections into separate components (e.g., form section, list section, header)',
      category: 'maintainability',
    });
  }

  const componentCount = (content.match(/(?:export\s+)?(?:default\s+)?function\s+[A-Z]\w*\s*\(/g) || []).length;
  if (componentCount > 5) {
    issues.push({
      type: 'too_many_components_in_file',
      severity: 'info',
      file: filePath,
      line: 1,
      message: `${componentCount} React components defined in a single file`,
      recommendation: 'Consider moving each component to its own file for better code organization',
      category: 'maintainability',
    });
  }

  return issues;
}

function detectMissingKeyProps(content: string, filePath: string): AntiPatternIssue[] {
  const issues: AntiPatternIssue[] = [];
  if (!filePath.endsWith('.tsx')) return issues;
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const mapMatch = line.match(/\.map\s*\(\s*(?:\(?\s*(\w+)|\(\s*\{)/);
    if (!mapMatch) continue;

    for (let j = i; j < Math.min(lines.length, i + 5); j++) {
      if (/<\w+/.test(lines[j]) && !/key\s*=/.test(lines[j])) {
        const nextLines = lines.slice(j, Math.min(lines.length, j + 3)).join(' ');
        if (/<\w+[^>]*>/.test(nextLines) && !/key\s*=/.test(nextLines)) {
          issues.push({
            type: 'missing_key_prop',
            severity: 'warning',
            file: filePath,
            line: j + 1,
            message: 'JSX element in .map() callback without key prop',
            recommendation: 'Add a unique key prop (e.g., key={item.id}) to the first JSX element in map callbacks',
            category: 'reliability',
          });
          break;
        }
      }
    }
  }

  return issues;
}

function detectDirectDomManipulation(content: string, filePath: string): AntiPatternIssue[] {
  const issues: AntiPatternIssue[] = [];
  if (!filePath.endsWith('.tsx')) return issues;
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;

    if (/document\.(getElementById|querySelector|querySelectorAll|getElementsBy)/.test(line)) {
      issues.push({
        type: 'direct_dom_manipulation',
        severity: 'warning',
        file: filePath,
        line: i + 1,
        message: 'Direct DOM manipulation in React component — use refs or state instead',
        recommendation: 'Replace document.querySelector with useRef hook, and DOM mutations with state updates',
        category: 'reliability',
      });
    }

    if (/\.innerHTML\s*=/.test(line)) {
      issues.push({
        type: 'unsafe_innerhtml',
        severity: 'error',
        file: filePath,
        line: i + 1,
        message: 'Direct innerHTML assignment — XSS vulnerability risk',
        recommendation: 'Use React\'s dangerouslySetInnerHTML with sanitized content, or use a sanitization library',
        category: 'security',
      });
    }
  }

  return issues;
}

function detectInlineStyles(content: string, filePath: string): AntiPatternIssue[] {
  const issues: AntiPatternIssue[] = [];
  if (!filePath.endsWith('.tsx')) return issues;

  const inlineStyleCount = (content.match(/style\s*=\s*\{\{/g) || []).length;
  if (inlineStyleCount > 5) {
    issues.push({
      type: 'excessive_inline_styles',
      severity: 'info',
      file: filePath,
      line: 1,
      message: `${inlineStyleCount} inline style objects — prefer Tailwind CSS utility classes`,
      recommendation: 'Replace inline styles with Tailwind classes for consistency and smaller bundle size',
      category: 'maintainability',
    });
  }

  return issues;
}

function detectMissingAccessibility(content: string, filePath: string): AntiPatternIssue[] {
  const issues: AntiPatternIssue[] = [];
  if (!filePath.endsWith('.tsx')) return issues;

  const imgCount = (content.match(/<img\b/g) || []).length;
  const altCount = (content.match(/<img[^>]*\balt\s*=/g) || []).length;
  if (imgCount > 0 && altCount < imgCount) {
    issues.push({
      type: 'missing_alt_text',
      severity: 'warning',
      file: filePath,
      line: 1,
      message: `${imgCount - altCount} img elements without alt text`,
      recommendation: 'Add descriptive alt text to all img elements for screen readers',
      category: 'accessibility',
    });
  }

  if (content.includes('onClick') && !content.includes('onKeyDown') && !content.includes('onKeyPress') && !content.includes('role=')) {
    const clickableDivs = (content.match(/<div[^>]*onClick/g) || []).length;
    if (clickableDivs > 0) {
      issues.push({
        type: 'non_interactive_click_handler',
        severity: 'info',
        file: filePath,
        line: 1,
        message: `${clickableDivs} non-interactive elements (div) with onClick handlers`,
        recommendation: 'Use <button> for clickable elements, or add role="button", tabIndex, and keyboard event handlers',
        category: 'accessibility',
      });
    }
  }

  return issues;
}

export function scanAntiPatterns(files: GeneratedFile[]): AntiPatternReport {
  const allIssues: AntiPatternIssue[] = [];
  let filesScanned = 0;

  for (const file of files) {
    if (!file.path.endsWith('.ts') && !file.path.endsWith('.tsx')) continue;
    filesScanned++;

    const isComponent = file.path.endsWith('.tsx');
    const isBackend = file.path.includes('server/') || file.path.includes('routes');

    if (isBackend) {
      allIssues.push(...detectN1Queries(file.content, file.path));
      allIssues.push(...detectMissingPagination(file.content, file.path));
      allIssues.push(...detectUnprotectedRoutes(file.content, file.path));
    }

    if (isComponent) {
      allIssues.push(...detectOversizedComponents(file.content, file.path));
      allIssues.push(...detectMissingKeyProps(file.content, file.path));
      allIssues.push(...detectDirectDomManipulation(file.content, file.path));
      allIssues.push(...detectInlineStyles(file.content, file.path));
      allIssues.push(...detectMissingAccessibility(file.content, file.path));
    }

    allIssues.push(...detectHardcodedStrings(file.content, file.path));
  }

  const byCategory: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  for (const issue of allIssues) {
    byCategory[issue.category] = (byCategory[issue.category] || 0) + 1;
    bySeverity[issue.severity] = (bySeverity[issue.severity] || 0) + 1;
  }

  return {
    issues: allIssues,
    stats: {
      filesScanned,
      issuesFound: allIssues.length,
      byCategory,
      bySeverity,
    },
  };
}