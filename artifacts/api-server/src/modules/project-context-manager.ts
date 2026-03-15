export interface ProjectFile {
  path: string;
  content: string;
  language: string;
}

export interface FileMetadata {
  path: string;
  language: string;
  lineCount: number;
  imports: ImportInfo[];
  exports: ExportInfo[];
  components: string[];
  functions: string[];
  interfaces: string[];
  types: string[];
  dbTables: string[];
  apiRoutes: ApiRouteInfo[];
}

export interface ImportInfo {
  source: string;
  names: string[];
  isDefault: boolean;
  isTypeOnly: boolean;
}

export interface ExportInfo {
  name: string;
  isDefault: boolean;
  kind: 'function' | 'class' | 'const' | 'type' | 'interface' | 'enum' | 'unknown';
}

export interface ApiRouteInfo {
  method: string;
  path: string;
}

export interface DependencyEdge {
  from: string;
  to: string;
  imports: string[];
}

export interface ProjectSummary {
  fileCount: number;
  totalLines: number;
  entities: string[];
  pages: string[];
  components: string[];
  apiRoutes: ApiRouteInfo[];
  dbTables: string[];
  filesByLanguage: Record<string, number>;
}

export interface ProjectContext {
  files: ProjectFile[];
  fileIndex: Map<string, FileMetadata>;
  dependencyGraph: DependencyEdge[];
  summary: ProjectSummary;
}

const IMPORT_REGEX = /import\s+(?:type\s+)?(?:(\w+)(?:\s*,\s*)?)?(?:\{([^}]*)\})?\s*from\s*['"]([^'"]+)['"]/g;
const IMPORT_STAR_REGEX = /import\s+\*\s+as\s+(\w+)\s+from\s*['"]([^'"]+)['"]/g;
const IMPORT_SIDE_EFFECT_REGEX = /import\s+['"]([^'"]+)['"]/g;

const EXPORT_DEFAULT_FUNC_REGEX = /export\s+default\s+function\s+(\w+)/g;
const EXPORT_DEFAULT_CLASS_REGEX = /export\s+default\s+class\s+(\w+)/g;
const EXPORT_DEFAULT_ANON_REGEX = /export\s+default\s+(?:function|class)\s*[({]/g;
const EXPORT_DEFAULT_EXPR_REGEX = /export\s+default\s+(\w+)\s*;/g;
const EXPORT_NAMED_REGEX = /export\s+(?:async\s+)?(?:function|class|const|let|var)\s+(\w+)/g;
const EXPORT_TYPE_REGEX = /export\s+(?:type|interface)\s+(\w+)/g;
const EXPORT_ENUM_REGEX = /export\s+enum\s+(\w+)/g;
const RE_EXPORT_REGEX = /export\s+\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g;

const COMPONENT_REGEX = /(?:export\s+(?:default\s+)?)?function\s+([A-Z]\w*)\s*\(/g;
const ARROW_COMPONENT_REGEX = /(?:export\s+)?(?:const|let)\s+([A-Z]\w*)\s*(?::\s*(?:React\.)?FC[^=]*)?=\s*(?:\([^)]*\)|[^=])\s*=>/g;
const MEMO_COMPONENT_REGEX = /(?:export\s+)?(?:const|let)\s+([A-Z]\w*)\s*=\s*(?:React\.)?memo\s*\(/g;
const FORWARDREF_COMPONENT_REGEX = /(?:export\s+)?(?:const|let)\s+([A-Z]\w*)\s*=\s*(?:React\.)?forwardRef/g;

const INTERFACE_REGEX = /(?:export\s+)?interface\s+(\w+)/g;
const TYPE_ALIAS_REGEX = /(?:export\s+)?type\s+(\w+)\s*=/g;

const FUNCTION_REGEX = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/g;
const ARROW_FUNC_REGEX = /(?:export\s+)?(?:const|let)\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[^=])\s*=>/g;

const DB_TABLE_REGEX = /(\w+)\s*=\s*pgTable\s*\(\s*['"](\w+)['"]/g;
const DB_TABLE_ALT_REGEX = /pgTable\s*\(\s*['"](\w+)['"]/g;

const API_ROUTE_REGEX = /(?:app|router|server)\.(get|post|put|patch|delete|all|options|head)\s*\(\s*['"`]([^'"`]+)['"`]/g;

const FILE_TYPE_PATTERNS: Record<string, (path: string, meta: FileMetadata) => boolean> = {
  component: (p, m) => m.components.length > 0 || /\/components\//.test(p),
  page: (p, m) => /\/pages\//.test(p) || /page\.(tsx?|jsx?)$/.test(p),
  api: (p, m) => m.apiRoutes.length > 0 || /\/api\//.test(p) || /routes?\.(ts|js)$/.test(p),
  schema: (p, m) => m.dbTables.length > 0 || /schema\.(ts|js)$/.test(p) || /models?\.(ts|js)$/.test(p),
  style: (p) => /\.(css|scss|sass|less|styl)$/.test(p),
  test: (p) => /\.(test|spec)\.(ts|js|tsx|jsx)$/.test(p),
  config: (p) => /\.(config|rc)\.(ts|js|json|cjs|mjs)$/.test(p) || p.endsWith('.json'),
  hook: (p) => /\/hooks\//.test(p) || /use[A-Z]\w*\.(ts|tsx)$/.test(p),
  util: (p) => /\/utils?\//.test(p) || /\/lib\//.test(p) || /\/helpers?\//.test(p),
  type: (p, m) => m.interfaces.length > 0 && m.functions.length === 0 && m.components.length === 0,
};

function resetRegex(regex: RegExp): void {
  regex.lastIndex = 0;
}

function extractImports(content: string): ImportInfo[] {
  const imports: ImportInfo[] = [];

  resetRegex(IMPORT_REGEX);
  let match: RegExpExecArray | null;
  while ((match = IMPORT_REGEX.exec(content)) !== null) {
    const defaultName = match[1];
    const namedPart = match[2];
    const source = match[3];
    const isTypeOnly = /import\s+type\s/.test(match[0]);

    if (defaultName) {
      imports.push({ source, names: [defaultName], isDefault: true, isTypeOnly });
    }
    if (namedPart) {
      const names = namedPart
        .split(',')
        .map(n => n.trim().replace(/\s+as\s+\w+/, '').replace(/^type\s+/, ''))
        .filter(n => n.length > 0);
      if (names.length > 0) {
        imports.push({ source, names, isDefault: false, isTypeOnly });
      }
    }
    if (!defaultName && !namedPart) {
      imports.push({ source, names: [], isDefault: false, isTypeOnly });
    }
  }

  resetRegex(IMPORT_STAR_REGEX);
  while ((match = IMPORT_STAR_REGEX.exec(content)) !== null) {
    imports.push({ source: match[2], names: [match[1]], isDefault: false, isTypeOnly: false });
  }

  resetRegex(IMPORT_SIDE_EFFECT_REGEX);
  while ((match = IMPORT_SIDE_EFFECT_REGEX.exec(content)) !== null) {
    const source = match[1];
    const alreadyCaptured = imports.some(i => i.source === source);
    if (!alreadyCaptured) {
      imports.push({ source, names: [], isDefault: false, isTypeOnly: false });
    }
  }

  return imports;
}

function extractExports(content: string): ExportInfo[] {
  const exports: ExportInfo[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;

  resetRegex(EXPORT_DEFAULT_FUNC_REGEX);
  while ((match = EXPORT_DEFAULT_FUNC_REGEX.exec(content)) !== null) {
    if (!seen.has(match[1])) {
      exports.push({ name: match[1], isDefault: true, kind: 'function' });
      seen.add(match[1]);
    }
  }

  resetRegex(EXPORT_DEFAULT_CLASS_REGEX);
  while ((match = EXPORT_DEFAULT_CLASS_REGEX.exec(content)) !== null) {
    if (!seen.has(match[1])) {
      exports.push({ name: match[1], isDefault: true, kind: 'class' });
      seen.add(match[1]);
    }
  }

  resetRegex(EXPORT_DEFAULT_ANON_REGEX);
  while ((match = EXPORT_DEFAULT_ANON_REGEX.exec(content)) !== null) {
    if (!seen.has('default')) {
      exports.push({ name: 'default', isDefault: true, kind: 'function' });
      seen.add('default');
    }
  }

  resetRegex(EXPORT_DEFAULT_EXPR_REGEX);
  while ((match = EXPORT_DEFAULT_EXPR_REGEX.exec(content)) !== null) {
    if (!seen.has(match[1]) && !seen.has('default')) {
      exports.push({ name: match[1], isDefault: true, kind: 'unknown' });
      seen.add(match[1]);
    }
  }

  resetRegex(EXPORT_NAMED_REGEX);
  while ((match = EXPORT_NAMED_REGEX.exec(content)) !== null) {
    if (!seen.has(match[1])) {
      const line = content.substring(Math.max(0, match.index - 5), match.index + match[0].length);
      let kind: ExportInfo['kind'] = 'const';
      if (/function/.test(line)) kind = 'function';
      else if (/class/.test(line)) kind = 'class';
      exports.push({ name: match[1], isDefault: false, kind });
      seen.add(match[1]);
    }
  }

  resetRegex(EXPORT_TYPE_REGEX);
  while ((match = EXPORT_TYPE_REGEX.exec(content)) !== null) {
    if (!seen.has(match[1])) {
      const line = content.substring(Math.max(0, match.index), match.index + match[0].length + 5);
      const kind: ExportInfo['kind'] = /interface/.test(match[0]) ? 'interface' : 'type';
      exports.push({ name: match[1], isDefault: false, kind });
      seen.add(match[1]);
    }
  }

  resetRegex(EXPORT_ENUM_REGEX);
  while ((match = EXPORT_ENUM_REGEX.exec(content)) !== null) {
    if (!seen.has(match[1])) {
      exports.push({ name: match[1], isDefault: false, kind: 'enum' });
      seen.add(match[1]);
    }
  }

  resetRegex(RE_EXPORT_REGEX);
  while ((match = RE_EXPORT_REGEX.exec(content)) !== null) {
    const names = match[1].split(',').map(n => n.trim().replace(/\s+as\s+\w+/, '')).filter(n => n.length > 0);
    for (const name of names) {
      if (!seen.has(name)) {
        exports.push({ name, isDefault: false, kind: 'unknown' });
        seen.add(name);
      }
    }
  }

  return exports;
}

function extractComponents(content: string): string[] {
  const components = new Set<string>();
  let match: RegExpExecArray | null;

  resetRegex(COMPONENT_REGEX);
  while ((match = COMPONENT_REGEX.exec(content)) !== null) {
    const surrounding = content.substring(match.index, Math.min(content.length, match.index + 200));
    if (/return\s*\(?\s*</.test(surrounding) || /jsx|tsx/.test(surrounding) || /<\w/.test(surrounding)) {
      components.add(match[1]);
    }
  }

  resetRegex(ARROW_COMPONENT_REGEX);
  while ((match = ARROW_COMPONENT_REGEX.exec(content)) !== null) {
    components.add(match[1]);
  }

  resetRegex(MEMO_COMPONENT_REGEX);
  while ((match = MEMO_COMPONENT_REGEX.exec(content)) !== null) {
    components.add(match[1]);
  }

  resetRegex(FORWARDREF_COMPONENT_REGEX);
  while ((match = FORWARDREF_COMPONENT_REGEX.exec(content)) !== null) {
    components.add(match[1]);
  }

  return Array.from(components);
}

function extractInterfaces(content: string): string[] {
  const interfaces = new Set<string>();
  let match: RegExpExecArray | null;
  resetRegex(INTERFACE_REGEX);
  while ((match = INTERFACE_REGEX.exec(content)) !== null) {
    interfaces.add(match[1]);
  }
  return Array.from(interfaces);
}

function extractTypes(content: string): string[] {
  const types = new Set<string>();
  let match: RegExpExecArray | null;
  resetRegex(TYPE_ALIAS_REGEX);
  while ((match = TYPE_ALIAS_REGEX.exec(content)) !== null) {
    types.add(match[1]);
  }
  return Array.from(types);
}

function extractFunctions(content: string): string[] {
  const functions = new Set<string>();
  let match: RegExpExecArray | null;

  resetRegex(FUNCTION_REGEX);
  while ((match = FUNCTION_REGEX.exec(content)) !== null) {
    if (match[1][0] !== match[1][0].toUpperCase() || !/return\s*\(?\s*</.test(content.substring(match.index, match.index + 300))) {
      functions.add(match[1]);
    }
  }

  resetRegex(ARROW_FUNC_REGEX);
  while ((match = ARROW_FUNC_REGEX.exec(content)) !== null) {
    if (match[1][0] !== match[1][0].toUpperCase()) {
      functions.add(match[1]);
    }
  }

  return Array.from(functions);
}

function extractDbTables(content: string): string[] {
  const tables = new Set<string>();
  let match: RegExpExecArray | null;

  resetRegex(DB_TABLE_REGEX);
  while ((match = DB_TABLE_REGEX.exec(content)) !== null) {
    tables.add(match[2]);
  }

  if (tables.size === 0) {
    resetRegex(DB_TABLE_ALT_REGEX);
    while ((match = DB_TABLE_ALT_REGEX.exec(content)) !== null) {
      tables.add(match[1]);
    }
  }

  return Array.from(tables);
}

function extractApiRoutes(content: string): ApiRouteInfo[] {
  const routes: ApiRouteInfo[] = [];
  let match: RegExpExecArray | null;
  resetRegex(API_ROUTE_REGEX);
  while ((match = API_ROUTE_REGEX.exec(content)) !== null) {
    routes.push({ method: match[1].toUpperCase(), path: match[2] });
  }
  return routes;
}

function analyzeFile(file: ProjectFile): FileMetadata {
  const content = file.content;
  return {
    path: file.path,
    language: file.language,
    lineCount: content.split('\n').length,
    imports: extractImports(content),
    exports: extractExports(content),
    components: extractComponents(content),
    functions: extractFunctions(content),
    interfaces: extractInterfaces(content),
    types: extractTypes(content),
    dbTables: extractDbTables(content),
    apiRoutes: extractApiRoutes(content),
  };
}

function normalizeImportSource(source: string, fromFilePath: string): string {
  if (!source.startsWith('.')) return source;

  const fromDir = fromFilePath.split('/').slice(0, -1).join('/');
  const parts = source.split('/');
  const resolved: string[] = fromDir ? fromDir.split('/') : [];

  for (const part of parts) {
    if (part === '.') continue;
    else if (part === '..') resolved.pop();
    else resolved.push(part);
  }

  return resolved.join('/');
}

export class ProjectContextManager {
  private files: ProjectFile[] = [];
  private fileIndex: Map<string, FileMetadata> = new Map();
  private contentMap: Map<string, string> = new Map();

  buildContext(files: ProjectFile[]): void {
    this.files = files;
    this.fileIndex.clear();
    this.contentMap.clear();

    for (const file of files) {
      const metadata = analyzeFile(file);
      this.fileIndex.set(file.path, metadata);
      this.contentMap.set(file.path, file.content);
    }
  }

  getFileIndex(): Map<string, FileMetadata> {
    return new Map(this.fileIndex);
  }

  getFileContent(path: string): string | undefined {
    return this.contentMap.get(path);
  }

  findFilesContaining(searchTerm: string): FileMetadata[] {
    const results: FileMetadata[] = [];
    const lowerTerm = searchTerm.toLowerCase();

    for (const [path, meta] of this.fileIndex) {
      const content = this.contentMap.get(path);
      if (!content) continue;

      if (content.toLowerCase().includes(lowerTerm)) {
        results.push(meta);
      }
    }

    return results;
  }

  getRelatedFiles(filePath: string): FileMetadata[] {
    const meta = this.fileIndex.get(filePath);
    if (!meta) return [];

    const related = new Set<string>();

    for (const imp of meta.imports) {
      const resolved = normalizeImportSource(imp.source, filePath);
      for (const [candidatePath] of this.fileIndex) {
        const candidateNoExt = candidatePath.replace(/\.\w+$/, '');
        if (candidatePath === resolved || candidateNoExt === resolved ||
            candidatePath.endsWith('/' + resolved) || candidateNoExt.endsWith('/' + resolved)) {
          related.add(candidatePath);
        }
      }
    }

    for (const [otherPath, otherMeta] of this.fileIndex) {
      if (otherPath === filePath) continue;
      for (const imp of otherMeta.imports) {
        const resolved = normalizeImportSource(imp.source, otherPath);
        const fileNoExt = filePath.replace(/\.\w+$/, '');
        if (filePath === resolved || fileNoExt === resolved ||
            filePath.endsWith('/' + resolved) || fileNoExt.endsWith('/' + resolved)) {
          related.add(otherPath);
        }
      }
    }

    return Array.from(related)
      .filter(p => p !== filePath)
      .map(p => this.fileIndex.get(p)!)
      .filter(Boolean);
  }

  getDependencyGraph(): DependencyEdge[] {
    const edges: DependencyEdge[] = [];

    for (const [filePath, meta] of this.fileIndex) {
      for (const imp of meta.imports) {
        const resolved = normalizeImportSource(imp.source, filePath);

        for (const [candidatePath] of this.fileIndex) {
          const candidateNoExt = candidatePath.replace(/\.\w+$/, '');
          if (candidatePath === resolved || candidateNoExt === resolved ||
              candidatePath.endsWith('/' + resolved) || candidateNoExt.endsWith('/' + resolved)) {
            edges.push({
              from: filePath,
              to: candidatePath,
              imports: imp.names,
            });
            break;
          }
        }
      }
    }

    return edges;
  }

  summarizeProject(): ProjectSummary {
    const entities = new Set<string>();
    const pages = new Set<string>();
    const components = new Set<string>();
    const allRoutes: ApiRouteInfo[] = [];
    const allTables = new Set<string>();
    const langCounts: Record<string, number> = {};
    let totalLines = 0;

    for (const [path, meta] of this.fileIndex) {
      totalLines += meta.lineCount;
      langCounts[meta.language] = (langCounts[meta.language] || 0) + 1;

      for (const table of meta.dbTables) {
        allTables.add(table);
        entities.add(table.charAt(0).toUpperCase() + table.slice(1).replace(/_(\w)/g, (_, c) => c.toUpperCase()));
      }

      for (const iface of meta.interfaces) {
        if (/^[A-Z]/.test(iface) && !iface.endsWith('Props') && !iface.endsWith('State') && !iface.endsWith('Config') && !iface.endsWith('Options')) {
          entities.add(iface);
        }
      }

      if (/\/pages\//.test(path) || /page\.(tsx?|jsx?)$/.test(path)) {
        for (const comp of meta.components) {
          pages.add(comp);
        }
        if (meta.components.length === 0) {
          const fileName = path.split('/').pop()?.replace(/\.\w+$/, '') || '';
          if (fileName && fileName !== 'index') {
            pages.add(fileName.charAt(0).toUpperCase() + fileName.slice(1));
          }
        }
      }

      for (const comp of meta.components) {
        components.add(comp);
      }

      allRoutes.push(...meta.apiRoutes);
    }

    return {
      fileCount: this.files.length,
      totalLines,
      entities: Array.from(entities),
      pages: Array.from(pages),
      components: Array.from(components),
      apiRoutes: allRoutes,
      dbTables: Array.from(allTables),
      filesByLanguage: langCounts,
    };
  }

  getFilesByType(type: string): FileMetadata[] {
    const matcher = FILE_TYPE_PATTERNS[type.toLowerCase()];
    if (!matcher) {
      const ext = type.startsWith('.') ? type : '.' + type;
      return Array.from(this.fileIndex.values()).filter(m => m.path.endsWith(ext));
    }

    return Array.from(this.fileIndex.entries())
      .filter(([path, meta]) => matcher(path, meta))
      .map(([_, meta]) => meta);
  }

  findEntityFiles(entityName: string): FileMetadata[] {
    const results: FileMetadata[] = [];
    const lowerEntity = entityName.toLowerCase();
    const camelCase = entityName.charAt(0).toLowerCase() + entityName.slice(1);
    const snakeCase = entityName.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
    const pluralLower = lowerEntity.endsWith('s') ? lowerEntity : lowerEntity + 's';

    const searchTerms = new Set([entityName, lowerEntity, camelCase, snakeCase, pluralLower]);

    for (const [path, meta] of this.fileIndex) {
      const content = this.contentMap.get(path);
      if (!content) continue;

      let matched = false;

      for (const term of searchTerms) {
        if (content.includes(term)) {
          matched = true;
          break;
        }
      }

      if (!matched) {
        if (meta.dbTables.some(t => t.toLowerCase() === lowerEntity || t.toLowerCase() === pluralLower)) {
          matched = true;
        }
      }

      if (!matched) {
        if (meta.interfaces.some(i => i.toLowerCase() === lowerEntity)) {
          matched = true;
        }
      }

      if (!matched) {
        if (meta.types.some(t => t.toLowerCase() === lowerEntity)) {
          matched = true;
        }
      }

      if (matched) {
        results.push(meta);
      }
    }

    return results;
  }
}

export function buildProjectContext(files: ProjectFile[]): ProjectContext {
  const manager = new ProjectContextManager();
  manager.buildContext(files);

  return {
    files,
    fileIndex: manager.getFileIndex(),
    dependencyGraph: manager.getDependencyGraph(),
    summary: manager.summarizeProject(),
  };
}