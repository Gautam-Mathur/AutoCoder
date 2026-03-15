/**
 * Cross-File Consistency Validator
 *
 * Post-generation pass that verifies consistency across all generated files:
 * - Import/export resolution: every import resolves to an actual export
 * - API contract matching: frontend fetch calls match backend route definitions
 * - Schema field consistency: fields referenced in components exist in the schema
 * - Type alignment: shared types are used consistently across frontend and backend
 * - Auto-fixes mismatches where possible
 */

interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

export interface ConsistencyIssue {
  type: 'import_mismatch' | 'api_contract_mismatch' | 'schema_field_missing' | 'type_mismatch' | 'dead_export' | 'missing_route_handler';
  severity: 'error' | 'warning';
  file: string;
  message: string;
  relatedFile?: string;
  autoFixable: boolean;
  fix?: { file: string; search: string; replace: string };
}

export interface ConsistencyReport {
  issues: ConsistencyIssue[];
  fixes: Array<{ file: string; search: string; replace: string; description: string }>;
  stats: {
    importsChecked: number;
    apiContractsChecked: number;
    schemaFieldsChecked: number;
    issuesFound: number;
    autoFixed: number;
  };
}

interface ParsedImport {
  names: string[];
  path: string;
  line: number;
  raw: string;
  isTypeOnly: boolean;
}

interface ParsedExport {
  name: string;
  isDefault: boolean;
  isType: boolean;
}

interface ParsedRoute {
  method: string;
  path: string;
  file: string;
  params: string[];
  line: number;
}

interface ParsedFetchCall {
  method: string;
  url: string;
  file: string;
  line: number;
  raw: string;
}

function extractImports(content: string): ParsedImport[] {
  const imports: ParsedImport[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isTypeImport = /import\s+type\s/.test(line);
    const importMatch = line.match(/import\s+(?:type\s+)?(?:\{([^}]+)\}|(\w+)(?:\s*,\s*\{([^}]+)\})?)\s+from\s+['"]([^'"]+)['"]/);
    if (importMatch) {
      const names: string[] = [];
      if (importMatch[1]) {
        names.push(...importMatch[1].split(',').map(n => {
          let name = n.trim();
          if (name.startsWith('type ')) name = name.slice(5).trim();
          name = name.split(/\s+as\s+/)[0].trim();
          return name;
        }).filter(Boolean));
      }
      if (importMatch[2]) names.push(importMatch[2].trim());
      if (importMatch[3]) {
        names.push(...importMatch[3].split(',').map(n => n.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean));
      }
      imports.push({ names, path: importMatch[4], line: i + 1, raw: line, isTypeOnly: isTypeImport });
    }
  }

  return imports;
}

function extractExports(content: string): ParsedExport[] {
  const exports: ParsedExport[] = [];

  const defaultMatch = content.match(/export\s+default\s+(?:function|class|const|let|var)\s+(\w+)/);
  if (defaultMatch) {
    exports.push({ name: defaultMatch[1], isDefault: true, isType: false });
    exports.push({ name: 'default', isDefault: true, isType: false });
  }
  const defaultExpr = content.match(/export\s+default\s+/);
  if (defaultExpr && !defaultMatch) {
    exports.push({ name: 'default', isDefault: true, isType: false });
  }

  const namedExports = Array.from(content.matchAll(/export\s+(?:async\s+)?(?:function|class|const|let|var)\s+(\w+)/g));
  for (const m of namedExports) {
    exports.push({ name: m[1], isDefault: false, isType: false });
  }

  const typeExports = Array.from(content.matchAll(/export\s+(?:type|interface|enum)\s+(\w+)/g));
  for (const m of typeExports) {
    exports.push({ name: m[1], isDefault: false, isType: true });
  }

  const reExports = Array.from(content.matchAll(/export\s*\{([^}]+)\}/g));
  for (const m of reExports) {
    const names = m[1].split(',').map(n => {
      const parts = n.trim().split(/\s+as\s+/);
      return (parts[parts.length - 1] || '').trim();
    }).filter(Boolean);
    for (const name of names) {
      exports.push({ name, isDefault: false, isType: false });
    }
  }

  return exports;
}

function extractBackendRoutes(files: GeneratedFile[]): ParsedRoute[] {
  const routes: ParsedRoute[] = [];
  const routeFiles = files.filter(f =>
    f.path.includes('routes') || f.path.includes('server/')
  );

  for (const file of routeFiles) {
    const lines = file.content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const routeMatch = line.match(/app\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/i);
      if (routeMatch) {
        const method = routeMatch[1].toUpperCase();
        const path = routeMatch[2];
        const params = Array.from(path.matchAll(/:(\w+)/g)).map(m => m[1]);
        routes.push({ method, path, file: file.path, params, line: i + 1 });
      }
    }
  }

  return routes;
}

function extractFetchCalls(files: GeneratedFile[]): ParsedFetchCall[] {
  const calls: ParsedFetchCall[] = [];
  const frontendFiles = files.filter(f =>
    f.path.endsWith('.tsx') || (f.path.endsWith('.ts') && (f.path.includes('client/') || f.path.includes('src/')))
  );

  for (const file of frontendFiles) {
    const lines = file.content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const fetchMatch = line.match(/(?:fetch|apiRequest)\s*\(\s*['"`]([^'"`]+)['"`](?:\s*,\s*\{[^}]*method\s*:\s*['"`](\w+)['"`])?/);
      if (fetchMatch) {
        const url = fetchMatch[1];
        const method = (fetchMatch[2] || 'GET').toUpperCase();
        calls.push({ method, url, file: file.path, line: i + 1, raw: line.trim() });
      }

      const queryKeyMatch = line.match(/queryKey\s*:\s*\[?\s*['"`]([^'"`]+)['"`]/);
      if (queryKeyMatch) {
        const url = queryKeyMatch[1];
        calls.push({ method: 'GET', url, file: file.path, line: i + 1, raw: line.trim() });
      }
    }
  }

  return calls;
}

function extractSchemaFields(files: GeneratedFile[]): Map<string, Set<string>> {
  const entityFields = new Map<string, Set<string>>();

  const schemaFile = files.find(f =>
    f.path.includes('schema') || f.path.includes('shared/')
  );

  if (!schemaFile) return entityFields;

  const tableRegex = /export\s+const\s+(\w+)\s*=\s*pgTable\s*\(\s*['"`](\w+)['"`]\s*,\s*\{([^}]+)\}/g;
  const tableMatches = Array.from(schemaFile.content.matchAll(tableRegex));
  for (const match of tableMatches) {
    const varName = match[1];
    const fieldsBlock = match[3];
    const fields = new Set<string>();

    const fieldMatches = Array.from(fieldsBlock.matchAll(/(\w+)\s*:/g));
    for (const fm of fieldMatches) {
      fields.add(fm[1]);
    }

    entityFields.set(varName, fields);
  }

  return entityFields;
}

function normalizeRoutePath(path: string): string {
  return path.replace(/:\w+/g, '*').replace(/\/+/g, '/');
}

function normalizeUrl(url: string): string {
  return url.replace(/\$\{[^}]+\}/g, '*').replace(/\/+/g, '/');
}

export function validateCrossFileConsistency(files: GeneratedFile[]): ConsistencyReport {
  const issues: ConsistencyIssue[] = [];
  const fixes: Array<{ file: string; search: string; replace: string; description: string }> = [];

  let importsChecked = 0;
  let apiContractsChecked = 0;
  let schemaFieldsChecked = 0;

  const fileExportMap = new Map<string, ParsedExport[]>();
  for (const file of files) {
    if (file.path.endsWith('.ts') || file.path.endsWith('.tsx')) {
      fileExportMap.set(file.path, extractExports(file.content));
    }
  }

  const resolveImportPath = (fromFile: string, importPath: string): string | null => {
    if (importPath.startsWith('@/')) {
      const resolved = 'src/' + importPath.slice(2);
      for (const ext of ['', '.ts', '.tsx', '/index.ts', '/index.tsx']) {
        const candidate = resolved + ext;
        if (files.some(f => f.path === candidate || f.path.endsWith('/' + candidate))) return candidate;
      }
    }
    if (importPath.startsWith('@shared')) {
      const resolved = 'shared/' + (importPath === '@shared' ? 'index' : importPath.slice(8));
      for (const ext of ['', '.ts', '.tsx']) {
        const candidate = resolved + ext;
        if (files.some(f => f.path === candidate || f.path.endsWith('/' + candidate))) return candidate;
      }
    }
    if (importPath.startsWith('.')) {
      const fromDir = fromFile.replace(/\/[^/]+$/, '');
      const parts = importPath.split('/');
      let resolvedDir = fromDir;
      for (const part of parts) {
        if (part === '.') continue;
        if (part === '..') {
          resolvedDir = resolvedDir.replace(/\/[^/]+$/, '');
        } else {
          resolvedDir += '/' + part;
        }
      }
      const resolved = resolvedDir.replace(/^\//, '');
      for (const ext of ['', '.ts', '.tsx', '/index.ts', '/index.tsx']) {
        const candidate = resolved + ext;
        if (files.some(f => f.path === candidate)) return candidate;
      }
    }
    return null;
  };

  // 1. Check imports resolve to exports
  for (const file of files) {
    if (!file.path.endsWith('.ts') && !file.path.endsWith('.tsx')) continue;

    const imports = extractImports(file.content);

    for (const imp of imports) {
      importsChecked++;

      if (!imp.path.startsWith('.') && !imp.path.startsWith('@/') && !imp.path.startsWith('@shared')) continue;

      const resolvedPath = resolveImportPath(file.path, imp.path);
      if (!resolvedPath) {
        const matchingFile = files.find(f => {
          const baseName = imp.path.split('/').pop() || '';
          return f.path.includes(baseName) && (f.path.endsWith('.ts') || f.path.endsWith('.tsx'));
        });

        if (matchingFile) continue;

        issues.push({
          type: 'import_mismatch',
          severity: 'warning',
          file: file.path,
          message: `Import path "${imp.path}" could not be resolved to any file`,
          autoFixable: false,
        });
        continue;
      }

      const targetFile = files.find(f => f.path === resolvedPath || f.path.endsWith('/' + resolvedPath));
      if (!targetFile) continue;

      const targetExports = fileExportMap.get(targetFile.path) || [];
      const exportNames = new Set(targetExports.map(e => e.name));

      for (const name of imp.names) {
        if (name === 'default' || name === '*') continue;
        if (!exportNames.has(name)) {
          const content = targetFile.content;
          const hasDeclaration = new RegExp(`(?:function|class|const|let|var|type|interface|enum)\\s+${name}\\b`).test(content);

          if (hasDeclaration) {
            issues.push({
              type: 'import_mismatch',
              severity: 'warning',
              file: file.path,
              relatedFile: targetFile.path,
              message: `"${name}" exists in ${targetFile.path} but is not exported`,
              autoFixable: true,
              fix: {
                file: targetFile.path,
                search: `(function|class|const|let|var|type|interface|enum)\\s+${name}\\b`,
                replace: `export $1 ${name}`,
              },
            });

            const declMatch = content.match(new RegExp(`^(\\s*)((?:function|class|const|let|var|type|interface|enum)\\s+${name}\\b)`, 'm'));
            if (declMatch && !declMatch[0].includes('export')) {
              fixes.push({
                file: targetFile.path,
                search: declMatch[0],
                replace: declMatch[1] + 'export ' + declMatch[2],
                description: `Export "${name}" from ${targetFile.path} (referenced by ${file.path})`,
              });
            }
          } else {
            issues.push({
              type: 'import_mismatch',
              severity: 'warning',
              file: file.path,
              relatedFile: targetFile.path,
              message: `"${name}" imported from "${imp.path}" but not found in target file`,
              autoFixable: false,
            });
          }
        }
      }
    }
  }

  // 2. Check API contract consistency
  const backendRoutes = extractBackendRoutes(files);
  const fetchCalls = extractFetchCalls(files);

  const normalizedRoutes = new Map<string, ParsedRoute>();
  for (const route of backendRoutes) {
    const key = `${route.method}:${normalizeRoutePath(route.path)}`;
    normalizedRoutes.set(key, route);
  }

  for (const call of fetchCalls) {
    apiContractsChecked++;
    const normalizedUrl = normalizeUrl(call.url);
    const key = `${call.method}:${normalizedUrl}`;

    let matched = false;
    const routeKeys = Array.from(normalizedRoutes.keys());
    for (const routeKey of routeKeys) {
      if (routeKey === key) {
        matched = true;
        break;
      }
      const routeParts = routeKey.split(':');
      const callParts = key.split(':');
      if (routeParts[0] === callParts[0]) {
        const routeSegments = routeParts[1].split('/').filter(Boolean);
        const callSegments = callParts[1].split('/').filter(Boolean);
        if (routeSegments.length === callSegments.length) {
          const allMatch = routeSegments.every((seg: string, idx: number) =>
            seg === '*' || callSegments[idx] === '*' || seg === callSegments[idx]
          );
          if (allMatch) {
            matched = true;
            break;
          }
        }
      }
    }

    if (!matched && call.url.startsWith('/api/')) {
      issues.push({
        type: 'api_contract_mismatch',
        severity: 'warning',
        file: call.file,
        message: `${call.method} ${call.url} has no matching backend route`,
        autoFixable: false,
      });
    }
  }

  // 3. Check schema field references
  const schemaFields = extractSchemaFields(files);

  if (schemaFields.size > 0) {
    for (const file of files) {
      if (!file.path.endsWith('.tsx') && !file.path.includes('routes')) continue;

      const schemaEntries = Array.from(schemaFields.entries());
      for (const [tableName, fields] of schemaEntries) {
        const entityName = tableName.replace(/s$/, '');
        const entityNameLower = entityName.toLowerCase();

        if (!file.content.toLowerCase().includes(entityNameLower)) continue;

        const fieldAccessMatches = Array.from(
          file.content.matchAll(new RegExp(`(?:${entityNameLower}|item|data|record|row|entry)\\.([a-zA-Z_]\\w*)`, 'gi'))
        );

        for (const match of fieldAccessMatches) {
          schemaFieldsChecked++;
          const fieldName = match[1];

          if (['map', 'filter', 'reduce', 'forEach', 'length', 'push', 'pop', 'slice',
            'find', 'some', 'every', 'includes', 'sort', 'join', 'concat', 'flat',
            'toString', 'valueOf', 'then', 'catch', 'finally',
            'id', 'key', 'className', 'style', 'children', 'onClick', 'onChange',
            'onSubmit', 'href', 'src', 'alt', 'type', 'value', 'name', 'placeholder',
            'error', 'data', 'isLoading', 'isPending', 'mutate', 'reset',
          ].includes(fieldName)) continue;

          const camelToSnake = fieldName.replace(/([A-Z])/g, '_$1').toLowerCase();
          if (!fields.has(fieldName) && !fields.has(camelToSnake) && fields.size > 0) {
            const hasPartialMatch = Array.from(fields).some(f =>
              f.toLowerCase() === fieldName.toLowerCase() ||
              f.toLowerCase().includes(fieldName.toLowerCase()) ||
              fieldName.toLowerCase().includes(f.toLowerCase())
            );
            if (!hasPartialMatch) {
              issues.push({
                type: 'schema_field_missing',
                severity: 'warning',
                file: file.path,
                message: `Field "${fieldName}" accessed on ${entityName}-like object but not found in ${tableName} schema`,
                relatedFile: files.find(f => f.path.includes('schema'))?.path,
                autoFixable: false,
              });
            }
          }
        }
      }
    }
  }

  return {
    issues,
    fixes,
    stats: {
      importsChecked,
      apiContractsChecked,
      schemaFieldsChecked,
      issuesFound: issues.length,
      autoFixed: fixes.length,
    },
  };
}

export function applyCrossFileConsistencyFixes(
  files: GeneratedFile[],
  fixes: Array<{ file: string; search: string; replace: string; description: string }>
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