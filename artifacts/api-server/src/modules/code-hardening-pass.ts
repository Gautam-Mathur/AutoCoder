/**
 * Code Hardening Pass
 *
 * Post-generation pass that injects defensive patterns into generated code:
 * - try/catch around API calls in components
 * - null/undefined checks on optional data access
 * - loading/error/empty states for async operations
 * - edge case handling (empty arrays, missing relationships)
 * - form validation guards
 * - safe property access patterns
 */

interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

export interface HardeningIssue {
  type: 'missing_error_handling' | 'missing_loading_state' | 'missing_empty_state' | 'unsafe_access' | 'missing_validation' | 'missing_try_catch';
  severity: 'error' | 'warning';
  file: string;
  line: number;
  message: string;
  fix?: { search: string; replace: string };
}

export interface HardeningReport {
  issues: HardeningIssue[];
  fixes: Array<{ file: string; search: string; replace: string; description: string }>;
  stats: {
    filesScanned: number;
    issuesFound: number;
    autoFixed: number;
    categories: Record<string, number>;
  };
}

function findUnhandledFetchCalls(content: string, filePath: string): HardeningIssue[] {
  const issues: HardeningIssue[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/(?:fetch|apiRequest)\s*\(/.test(line) && !/\.catch\(/.test(line)) {
      let insideTryCatch = false;
      for (let j = Math.max(0, i - 10); j < i; j++) {
        if (/\btry\s*\{/.test(lines[j])) {
          insideTryCatch = true;
          break;
        }
      }
      if (/\.then\(/.test(line)) continue;
      if (/await\s/.test(line) && !insideTryCatch) {
        issues.push({
          type: 'missing_try_catch',
          severity: 'warning',
          file: filePath,
          line: i + 1,
          message: 'Awaited fetch/API call without try/catch error handling',
        });
      }
    }
  }

  return issues;
}

function findMissingLoadingStates(content: string, filePath: string): HardeningIssue[] {
  const issues: HardeningIssue[] = [];

  const queryMatches = Array.from(content.matchAll(/const\s*\{([^}]+)\}\s*=\s*useQuery/g));
  for (const match of queryMatches) {
    const destructured = match[1];
    if (!destructured.includes('isLoading') && !destructured.includes('isPending') && !destructured.includes('status')) {
      issues.push({
        type: 'missing_loading_state',
        severity: 'warning',
        file: filePath,
        line: content.substring(0, match.index).split('\n').length,
        message: 'useQuery result missing isLoading/isPending destructuring — UI won\'t show loading state',
      });
    }
    if (!destructured.includes('error') && !destructured.includes('isError')) {
      issues.push({
        type: 'missing_error_handling',
        severity: 'warning',
        file: filePath,
        line: content.substring(0, match.index).split('\n').length,
        message: 'useQuery result missing error destructuring — errors will be silently swallowed',
      });
    }
  }

  return issues;
}

function findMissingEmptyStates(content: string, filePath: string): HardeningIssue[] {
  const issues: HardeningIssue[] = [];

  const mapCalls = Array.from(content.matchAll(/(\w+)\.map\s*\(/g));
  for (const match of mapCalls) {
    const varName = match[1];
    const matchPos = match.index || 0;
    const contextBefore = content.substring(Math.max(0, matchPos - 300), matchPos);

    if (!/\blength\b/.test(contextBefore) &&
        !/\.length\s*(===|!==|>|<|>=|<=)\s*\d/.test(contextBefore) &&
        !/\?\s*\.map/.test(content.substring(matchPos - 5, matchPos + match[0].length))) {

      if (['data', 'items', 'results', 'list', 'records', 'entries', 'rows'].some(
        word => varName.toLowerCase().includes(word) || varName.endsWith('s')
      )) {
        issues.push({
          type: 'missing_empty_state',
          severity: 'warning',
          file: filePath,
          line: content.substring(0, matchPos).split('\n').length,
          message: `Array "${varName}" mapped without empty state check — UI will show nothing if empty`,
        });
      }
    }
  }

  return issues;
}

function findUnsafeAccess(content: string, filePath: string): HardeningIssue[] {
  const issues: HardeningIssue[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const deepAccess = line.match(/(\w+)\.(\w+)\.(\w+)\.(\w+)/);
    if (deepAccess && !line.includes('?.') && !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
      const root = deepAccess[1];
      if (!['console', 'process', 'window', 'document', 'Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'Date', 'Promise', 'Error', 'RegExp', 'req', 'res'].includes(root)) {
        issues.push({
          type: 'unsafe_access',
          severity: 'warning',
          file: filePath,
          line: i + 1,
          message: `Deep property access "${deepAccess[0]}" without optional chaining — may throw if intermediate values are null/undefined`,
        });
      }
    }
  }

  return issues;
}

function findMissingFormValidation(content: string, filePath: string): HardeningIssue[] {
  const issues: HardeningIssue[] = [];

  if (content.includes('<form') || content.includes('onSubmit')) {
    if (!content.includes('zodResolver') && !content.includes('useForm') && !content.includes('validate')) {
      issues.push({
        type: 'missing_validation',
        severity: 'warning',
        file: filePath,
        line: 1,
        message: 'Form component without validation library integration — user inputs won\'t be validated',
      });
    }
  }

  return issues;
}

function findMissingRouteErrorHandling(content: string, filePath: string): HardeningIssue[] {
  const issues: HardeningIssue[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const routeMatch = line.match(/app\.(get|post|put|patch|delete)\s*\(/);
    if (!routeMatch) continue;

    let depth = 0;
    let hasTryCatch = false;
    let hasStatusError = false;

    for (let j = i; j < Math.min(lines.length, i + 50); j++) {
      const routeLine = lines[j];
      depth += (routeLine.match(/\{/g) || []).length;
      depth -= (routeLine.match(/\}/g) || []).length;
      if (/\btry\s*\{/.test(routeLine)) hasTryCatch = true;
      if (/res\.status\s*\(\s*(4|5)\d\d\s*\)/.test(routeLine)) hasStatusError = true;
      if (depth <= 0 && j > i) break;
    }

    if (!hasTryCatch) {
      issues.push({
        type: 'missing_try_catch',
        severity: 'warning',
        file: filePath,
        line: i + 1,
        message: `${routeMatch[1].toUpperCase()} route handler without try/catch — unhandled errors will crash the server`,
      });
    }
  }

  return issues;
}

function generateLoadingFix(content: string, filePath: string): Array<{ file: string; search: string; replace: string; description: string }> {
  const fixes: Array<{ file: string; search: string; replace: string; description: string }> = [];

  const queryRegex = /const\s*\{\s*data\s*(?::\s*\w+)?\s*\}\s*=\s*useQuery\s*\(\s*\{/g;
  let match;
  while ((match = queryRegex.exec(content)) !== null) {
    const original = match[0];
    const hasColon = original.includes(':');
    const replacement = hasColon
      ? original.replace('{ data', '{ data, isLoading, error')
      : original.replace('{ data', '{ data, isLoading, error');

    fixes.push({
      file: filePath,
      search: original,
      replace: replacement,
      description: `Add isLoading and error to useQuery destructuring in ${filePath}`,
    });
  }

  return fixes;
}

function generateTryCatchFix(content: string, filePath: string): Array<{ file: string; search: string; replace: string; description: string }> {
  const fixes: Array<{ file: string; search: string; replace: string; description: string }> = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const routeMatch = line.match(/(app\.(get|post|put|patch|delete)\s*\(\s*['"`][^'"`]+['"`]\s*,\s*(?:(?:\w+,\s*)*)?async\s*\(\s*req\s*,\s*res\s*\)\s*=>\s*)\{/);
    if (!routeMatch) continue;

    let depth = 0;
    let hasTryCatch = false;
    for (let j = i; j < Math.min(lines.length, i + 50); j++) {
      depth += (lines[j].match(/\{/g) || []).length;
      depth -= (lines[j].match(/\}/g) || []).length;
      if (/\btry\s*\{/.test(lines[j])) hasTryCatch = true;
      if (depth <= 0 && j > i) break;
    }

    if (!hasTryCatch) {
      const indent = line.match(/^(\s*)/)?.[1] || '  ';
      const bodyIndent = indent + '    ';
      fixes.push({
        file: filePath,
        search: routeMatch[0],
        replace: routeMatch[1] + '{\n' + bodyIndent + 'try {',
        description: `Wrap ${routeMatch[2].toUpperCase()} route handler in try/catch in ${filePath}`,
      });
    }
  }

  return fixes;
}

export function hardenGeneratedCode(files: GeneratedFile[]): HardeningReport {
  const allIssues: HardeningIssue[] = [];
  const allFixes: Array<{ file: string; search: string; replace: string; description: string }> = [];
  const categories: Record<string, number> = {};
  let filesScanned = 0;

  for (const file of files) {
    if (!file.path.endsWith('.ts') && !file.path.endsWith('.tsx')) continue;
    filesScanned++;

    const isComponent = file.path.endsWith('.tsx');
    const isRoute = file.path.includes('routes') || file.path.includes('server/');

    let issues: HardeningIssue[] = [];

    if (isComponent) {
      issues = [
        ...findMissingLoadingStates(file.content, file.path),
        ...findMissingEmptyStates(file.content, file.path),
        ...findMissingFormValidation(file.content, file.path),
        ...findUnhandledFetchCalls(file.content, file.path),
      ];
      allFixes.push(...generateLoadingFix(file.content, file.path));
    }

    if (isRoute) {
      issues = [
        ...issues,
        ...findMissingRouteErrorHandling(file.content, file.path),
      ];
      allFixes.push(...generateTryCatchFix(file.content, file.path));
    }

    issues.push(...findUnsafeAccess(file.content, file.path));

    for (const issue of issues) {
      categories[issue.type] = (categories[issue.type] || 0) + 1;
    }

    allIssues.push(...issues);
  }

  return {
    issues: allIssues,
    fixes: allFixes,
    stats: {
      filesScanned,
      issuesFound: allIssues.length,
      autoFixed: allFixes.length,
      categories,
    },
  };
}

export function applyHardeningFixes(
  files: GeneratedFile[],
  fixes: Array<{ file: string; search: string; replace: string }>
): GeneratedFile[] {
  const fixedFiles = files.map(f => ({ ...f }));

  for (const fix of fixes) {
    const file = fixedFiles.find(f => f.path === fix.file);
    if (!file) continue;
    if (file.content.includes(fix.search)) {
      file.content = file.content.replace(fix.search, fix.replace);
    }
  }

  return fixedFiles;
}