import { detectTechStack, type TechStackProfile } from './framework-detector.js';

export interface FileInfo {
  path: string;
  content: string;
  language: string;
}

export interface ImportEdge {
  from: string;
  to: string;
  importedSymbols: string[];
  isDefault: boolean;
  isTypeOnly: boolean;
  raw: string;
}

export interface ExportedSymbol {
  name: string;
  type: 'function' | 'class' | 'const' | 'type' | 'interface' | 'enum' | 'default' | 'component' | 'unknown';
  isDefault: boolean;
  line: number;
}

export interface ExtractedComponent {
  name: string;
  filePath: string;
  props: { name: string; type: string; required: boolean }[];
  hooks: string[];
  childComponents: string[];
  hasState: boolean;
  hasEffects: boolean;
  routePath?: string;
}

export interface ExtractedRoute {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'ALL';
  path: string;
  handlerFile: string;
  middlewares: string[];
  line: number;
}

export interface ExtractedModel {
  name: string;
  filePath: string;
  fields: { name: string; type: string; nullable: boolean; hasDefault: boolean; isPrimary: boolean; isUnique: boolean; isForeignKey: boolean; references?: string }[];
  tableName?: string;
  ormType: 'drizzle' | 'prisma' | 'typeorm' | 'sequelize' | 'mongoose' | 'sqlalchemy' | 'raw-sql' | 'unknown';
}

export interface ExtractedMiddleware {
  name: string;
  filePath: string;
  type: 'auth' | 'validation' | 'cors' | 'rate-limit' | 'logging' | 'error-handler' | 'custom';
  appliedTo: string[];
}

export interface FileNode {
  path: string;
  language: string;
  imports: ImportEdge[];
  exports: ExportedSymbol[];
  components: ExtractedComponent[];
  routes: ExtractedRoute[];
  models: ExtractedModel[];
  middlewares: ExtractedMiddleware[];
  linesOfCode: number;
  category: 'component' | 'page' | 'route' | 'model' | 'middleware' | 'util' | 'config' | 'test' | 'style' | 'asset' | 'unknown';
}

export interface DependencyGraph {
  nodes: Map<string, FileNode>;
  edges: ImportEdge[];
  circularDeps: string[][];
  orphanFiles: string[];
  entryPoints: string[];
}

export interface LogicalModule {
  name: string;
  files: string[];
  type: 'feature' | 'shared' | 'config' | 'test' | 'style';
  entities: string[];
  pages: string[];
  routes: string[];
}

export interface CodebaseAnalysis {
  techStack: TechStackProfile;
  graph: DependencyGraph;
  components: ExtractedComponent[];
  routes: ExtractedRoute[];
  models: ExtractedModel[];
  middlewares: ExtractedMiddleware[];
  modules: LogicalModule[];
  stats: {
    totalFiles: number;
    totalLines: number;
    filesByLanguage: Record<string, number>;
    componentCount: number;
    routeCount: number;
    modelCount: number;
  };
}

const IMPORT_PATTERNS = [
  /import\s+(?:type\s+)?(?:\{([^}]*)\})\s+from\s+['"]([^'"]+)['"]/g,
  /import\s+(?:type\s+)?(\w+)\s+from\s+['"]([^'"]+)['"]/g,
  /import\s+(\w+)\s*,\s*\{([^}]*)\}\s+from\s+['"]([^'"]+)['"]/g,
  /import\s+['"]([^'"]+)['"]/g,
  /const\s+(?:\{([^}]*)\}|\w+)\s*=\s*require\(['"]([^'"]+)['"]\)/g,
  /from\s+(\w+)\s+import\s+([\w,\s*]+)/g,
  /import\s+([\w.]+)/g,
];

function parseImports(content: string, filePath: string): ImportEdge[] {
  const imports: ImportEdge[] = [];
  const seen = new Set<string>();

  const esDefaultImport = /import\s+(type\s+)?(\w+)\s*,?\s*(?:\{([^}]*)\})?\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = esDefaultImport.exec(content)) !== null) {
    const isTypeOnly = !!match[1];
    const defaultName = match[2];
    const namedImports = match[3] ? match[3].split(',').map(s => s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean) : [];
    const source = match[4];
    const key = `${filePath}->${source}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const symbols = [defaultName, ...namedImports].filter(s => s && s !== 'type');
    imports.push({
      from: filePath,
      to: resolveImportPath(source, filePath),
      importedSymbols: symbols,
      isDefault: true,
      isTypeOnly,
      raw: match[0],
    });
  }

  const esNamedImport = /import\s+(type\s+)?\{([^}]*)\}\s+from\s+['"]([^'"]+)['"]/g;
  while ((match = esNamedImport.exec(content)) !== null) {
    const isTypeOnly = !!match[1];
    const symbols = match[2].split(',').map(s => s.trim().split(/\s+as\s+/)[0].replace(/^type\s+/, '').trim()).filter(Boolean);
    const source = match[3];
    const key = `${filePath}->{${symbols.join(',')}}->${source}`;
    if (seen.has(key)) continue;
    seen.add(key);
    imports.push({
      from: filePath,
      to: resolveImportPath(source, filePath),
      importedSymbols: symbols,
      isDefault: false,
      isTypeOnly,
      raw: match[0],
    });
  }

  const sideEffectImport = /import\s+['"]([^'"]+)['"]\s*;?/g;
  while ((match = sideEffectImport.exec(content)) !== null) {
    if (match[0].includes(' from ')) continue;
    const source = match[1];
    const key = `${filePath}->side->${source}`;
    if (seen.has(key)) continue;
    seen.add(key);
    imports.push({
      from: filePath,
      to: resolveImportPath(source, filePath),
      importedSymbols: [],
      isDefault: false,
      isTypeOnly: false,
      raw: match[0],
    });
  }

  const requireImport = /(?:const|let|var)\s+(?:\{([^}]*)\}|(\w+))\s*=\s*require\(['"]([^'"]+)['"]\)/g;
  while ((match = requireImport.exec(content)) !== null) {
    const symbols = match[1]
      ? match[1].split(',').map(s => s.trim().split(':')[0].trim()).filter(Boolean)
      : match[2] ? [match[2]] : [];
    const source = match[3];
    const key = `${filePath}->req->${source}`;
    if (seen.has(key)) continue;
    seen.add(key);
    imports.push({
      from: filePath,
      to: resolveImportPath(source, filePath),
      importedSymbols: symbols,
      isDefault: !match[1],
      isTypeOnly: false,
      raw: match[0],
    });
  }

  const pyImport = /^(?:from\s+([\w.]+)\s+import\s+([\w,\s*]+)|import\s+([\w.]+))/gm;
  if (/\.py$/.test(filePath)) {
    while ((match = pyImport.exec(content)) !== null) {
      if (match[1]) {
        const source = match[1];
        const symbols = match[2].split(',').map(s => s.trim()).filter(Boolean);
        imports.push({
          from: filePath,
          to: source.replace(/\./g, '/') + '.py',
          importedSymbols: symbols,
          isDefault: false,
          isTypeOnly: false,
          raw: match[0],
        });
      } else if (match[3]) {
        imports.push({
          from: filePath,
          to: match[3].replace(/\./g, '/') + '.py',
          importedSymbols: [match[3].split('.').pop()!],
          isDefault: true,
          isTypeOnly: false,
          raw: match[0],
        });
      }
    }
  }

  return imports;
}

function resolveImportPath(source: string, fromFile: string): string {
  if (source.startsWith('.')) {
    const fromDir = fromFile.substring(0, fromFile.lastIndexOf('/')) || '.';
    const parts = fromDir.split('/');
    const sourceParts = source.split('/');
    for (const sp of sourceParts) {
      if (sp === '.') continue;
      if (sp === '..') parts.pop();
      else parts.push(sp);
    }
    let resolved = parts.join('/');
    if (!resolved.match(/\.\w+$/)) {
      resolved += '.ts';
    }
    return resolved;
  }
  if (source.startsWith('@/') || source.startsWith('~/')) {
    return 'src/' + source.substring(2) + (source.match(/\.\w+$/) ? '' : '.ts');
  }
  return source;
}

function parseExports(content: string, filePath: string): ExportedSymbol[] {
  const exports: ExportedSymbol[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    let match;
    if ((match = line.match(/export\s+default\s+(?:function|class)\s+(\w+)/))) {
      exports.push({ name: match[1], type: line.includes('class') ? 'class' : 'function', isDefault: true, line: lineNum });
    } else if ((match = line.match(/export\s+default\s+(\w+)/))) {
      exports.push({ name: match[1], type: 'default', isDefault: true, line: lineNum });
    } else if ((match = line.match(/export\s+(?:async\s+)?function\s+(\w+)/))) {
      exports.push({ name: match[1], type: 'function', isDefault: false, line: lineNum });
    } else if ((match = line.match(/export\s+class\s+(\w+)/))) {
      exports.push({ name: match[1], type: 'class', isDefault: false, line: lineNum });
    } else if ((match = line.match(/export\s+(?:const|let|var)\s+(\w+)/))) {
      const isComponent = /^[A-Z]/.test(match[1]) && /\.(tsx|jsx)$/.test(filePath);
      exports.push({ name: match[1], type: isComponent ? 'component' : 'const', isDefault: false, line: lineNum });
    } else if ((match = line.match(/export\s+(?:type|interface)\s+(\w+)/))) {
      exports.push({ name: match[1], type: line.includes('interface') ? 'interface' : 'type', isDefault: false, line: lineNum });
    } else if ((match = line.match(/export\s+enum\s+(\w+)/))) {
      exports.push({ name: match[1], type: 'enum', isDefault: false, line: lineNum });
    }
  }

  if (exports.length === 0 && /\.(tsx|jsx)$/.test(filePath)) {
    const defaultFnMatch = content.match(/(?:export\s+)?default\s+function\s+(\w+)/);
    if (defaultFnMatch) {
      exports.push({ name: defaultFnMatch[1], type: 'component', isDefault: true, line: 1 });
    }
  }

  return exports;
}

function extractComponents(content: string, filePath: string): ExtractedComponent[] {
  if (!/\.(tsx|jsx|vue|svelte)$/.test(filePath)) return [];

  const components: ExtractedComponent[] = [];

  const funcComponentPattern = /(?:export\s+(?:default\s+)?)?(?:const|function)\s+([A-Z]\w+)\s*(?::\s*React\.FC[^=]*)?(?:\s*=\s*)?(?:\(([^)]*)\)|[^{]*\{)/g;
  let match;
  while ((match = funcComponentPattern.exec(content)) !== null) {
    const name = match[1];
    const propsStr = match[2] || '';

    const hasReturn = content.indexOf('return', match.index) !== -1;
    const hasJSX = /<\w/.test(content.substring(match.index, Math.min(match.index + 2000, content.length)));
    if (!hasReturn && !hasJSX) continue;

    const props = parseProps(propsStr, content);
    const hooks = extractHooks(content);
    const childComponents = extractChildComponents(content, name);
    const hasState = /useState|useReducer|useRecoilState|useAtom/.test(content);
    const hasEffects = /useEffect|useLayoutEffect|useMemo|useCallback/.test(content);

    const routeMatch = content.match(/(?:path|route)\s*[:=]\s*['"]([^'"]+)['"]/);

    components.push({
      name,
      filePath,
      props,
      hooks,
      childComponents,
      hasState,
      hasEffects,
      routePath: routeMatch?.[1],
    });
  }

  return components;
}

function parseProps(propsStr: string, content: string): { name: string; type: string; required: boolean }[] {
  const props: { name: string; type: string; required: boolean }[] = [];

  if (propsStr.includes('{')) {
    const destructured = propsStr.match(/\{\s*([^}]+)\s*\}/);
    if (destructured) {
      const parts = destructured[1].split(',');
      for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        const [name, defaultVal] = trimmed.split('=').map(s => s.trim());
        const cleanName = name.replace(/[?:][\s\S]*/, '').trim();
        if (cleanName) {
          props.push({
            name: cleanName,
            type: 'unknown',
            required: !defaultVal && !trimmed.includes('?'),
          });
        }
      }
    }
  }

  const interfaceMatch = content.match(/interface\s+\w*Props\w*\s*\{([^}]+)\}/);
  const typeMatch = content.match(/type\s+\w*Props\w*\s*=\s*\{([^}]+)\}/);
  const propsBlock = interfaceMatch?.[1] || typeMatch?.[1];
  if (propsBlock) {
    const lines = propsBlock.split(/[;\n]/).filter(l => l.trim());
    for (const line of lines) {
      const propMatch = line.match(/^\s*(\w+)(\??)\s*:\s*(.+)/);
      if (propMatch) {
        const existing = props.find(p => p.name === propMatch[1]);
        if (existing) {
          existing.type = propMatch[3].trim();
          existing.required = !propMatch[2];
        } else {
          props.push({
            name: propMatch[1],
            type: propMatch[3].trim(),
            required: !propMatch[2],
          });
        }
      }
    }
  }

  return props;
}

function extractHooks(content: string): string[] {
  const hookPattern = /\b(use[A-Z]\w+)\s*\(/g;
  const hooks = new Set<string>();
  let match;
  while ((match = hookPattern.exec(content)) !== null) {
    hooks.add(match[1]);
  }
  return Array.from(hooks);
}

function extractChildComponents(content: string, selfName: string): string[] {
  const componentPattern = /<([A-Z]\w+)\s/g;
  const children = new Set<string>();
  let match;
  while ((match = componentPattern.exec(content)) !== null) {
    if (match[1] !== selfName) {
      children.add(match[1]);
    }
  }
  return Array.from(children);
}

function extractRoutes(content: string, filePath: string): ExtractedRoute[] {
  const routes: ExtractedRoute[] = [];

  const expressPattern = /(?:app|router)\.(get|post|put|patch|delete|all)\s*\(\s*['"]([^'"]+)['"]/gi;
  let match;
  while ((match = expressPattern.exec(content)) !== null) {
    const method = match[1].toUpperCase() as ExtractedRoute['method'];
    const path = match[2];
    const lineNum = content.substring(0, match.index).split('\n').length;

    const middlewareMatch = content.substring(match.index, match.index + 500).match(/,\s*(\w+)\s*,/g);
    const middlewares = middlewareMatch
      ? middlewareMatch.map(m => m.replace(/,\s*/g, '').trim()).filter(m => m !== 'async' && m !== 'req')
      : [];

    routes.push({ method, path, handlerFile: filePath, middlewares, line: lineNum });
  }

  const fastifyPattern = /fastify\.(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]/gi;
  while ((match = fastifyPattern.exec(content)) !== null) {
    const method = match[1].toUpperCase() as ExtractedRoute['method'];
    routes.push({ method, path: match[2], handlerFile: filePath, middlewares: [], line: content.substring(0, match.index).split('\n').length });
  }

  const nestControllerMatch = content.match(/@Controller\s*\(\s*['"]([^'"]*)['"]\s*\)/);
  if (nestControllerMatch) {
    const basePath = nestControllerMatch[1];
    const nestRoutePattern = /@(Get|Post|Put|Patch|Delete)\s*\(\s*['"]?([^'")\s]*)?['"]?\s*\)/gi;
    while ((match = nestRoutePattern.exec(content)) !== null) {
      const method = match[1].toUpperCase() as ExtractedRoute['method'];
      const subPath = match[2] || '';
      routes.push({
        method,
        path: `/${basePath}/${subPath}`.replace(/\/+/g, '/'),
        handlerFile: filePath,
        middlewares: [],
        line: content.substring(0, match.index).split('\n').length,
      });
    }
  }

  const flaskPattern = /@app\.route\s*\(\s*['"]([^'"]+)['"]\s*(?:,\s*methods\s*=\s*\[([^\]]+)\])?\)/g;
  while ((match = flaskPattern.exec(content)) !== null) {
    const path = match[1];
    const methods = match[2] ? match[2].replace(/['"]/g, '').split(',').map(m => m.trim()) : ['GET'];
    for (const method of methods) {
      routes.push({
        method: method.toUpperCase() as ExtractedRoute['method'],
        path,
        handlerFile: filePath,
        middlewares: [],
        line: content.substring(0, match.index).split('\n').length,
      });
    }
  }

  const nextApiPattern = /export\s+(?:default\s+)?(?:async\s+)?function\s+(?:handler|GET|POST|PUT|PATCH|DELETE)/;
  if (nextApiPattern.test(content) && (filePath.includes('pages/api/') || filePath.includes('app/') && filePath.includes('route.'))) {
    const methodMatches = content.match(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)/g);
    if (methodMatches) {
      for (const mm of methodMatches) {
        const method = mm.match(/(GET|POST|PUT|PATCH|DELETE)/)![1] as ExtractedRoute['method'];
        const apiPath = filePath
          .replace(/.*pages\/api/, '/api')
          .replace(/.*app/, '')
          .replace(/\/route\.\w+$/, '')
          .replace(/\.\w+$/, '')
          .replace(/\[(\w+)\]/g, ':$1');
        routes.push({ method, path: apiPath, handlerFile: filePath, middlewares: [], line: 1 });
      }
    } else {
      const apiPath = filePath
        .replace(/.*pages\/api/, '/api')
        .replace(/\.\w+$/, '')
        .replace(/\[(\w+)\]/g, ':$1');
      routes.push({ method: 'ALL', path: apiPath, handlerFile: filePath, middlewares: [], line: 1 });
    }
  }

  return routes;
}

function extractModels(content: string, filePath: string): ExtractedModel[] {
  const models: ExtractedModel[] = [];

  const drizzlePattern = /(?:export\s+)?(?:const\s+)?(\w+)\s*=\s*pgTable\s*\(\s*['"](\w+)['"]\s*,\s*\{([\s\S]*?)\}\s*\)/g;
  let match;
  while ((match = drizzlePattern.exec(content)) !== null) {
    const varName = match[1];
    const tableName = match[2];
    const fieldsBlock = match[3];
    const fields = parseDrizzleFields(fieldsBlock);
    const name = varName.charAt(0).toUpperCase() + varName.slice(1).replace(/s$/, '');
    models.push({ name, filePath, fields, tableName, ormType: 'drizzle' });
  }

  const mysqlTable = /(?:export\s+)?(?:const\s+)?(\w+)\s*=\s*mysqlTable\s*\(\s*['"](\w+)['"]\s*,\s*\{([\s\S]*?)\}\s*\)/g;
  while ((match = mysqlTable.exec(content)) !== null) {
    const fields = parseDrizzleFields(match[3]);
    const name = match[1].charAt(0).toUpperCase() + match[1].slice(1).replace(/s$/, '');
    models.push({ name, filePath, fields, tableName: match[2], ormType: 'drizzle' });
  }

  const prismaModel = /model\s+(\w+)\s*\{([\s\S]*?)\}/g;
  while ((match = prismaModel.exec(content)) !== null) {
    const name = match[1];
    const fieldsBlock = match[2];
    const fields = parsePrismaFields(fieldsBlock);
    models.push({ name, filePath, fields, ormType: 'prisma' });
  }

  const typeormEntity = /@Entity\s*\((?:['"](\w+)['"])?\)\s*(?:export\s+)?class\s+(\w+)/g;
  while ((match = typeormEntity.exec(content)) !== null) {
    const name = match[2];
    const tableName = match[1] || name.toLowerCase();
    const classBody = extractClassBody(content, match.index);
    const fields = parseTypeORMFields(classBody);
    models.push({ name, filePath, fields, tableName, ormType: 'typeorm' });
  }

  const mongooseSchema = /(?:const|let)\s+(\w+)Schema\s*=\s*new\s+(?:mongoose\.)?Schema\s*\(\s*\{([\s\S]*?)\}\s*(?:,|\))/g;
  while ((match = mongooseSchema.exec(content)) !== null) {
    const name = match[1].charAt(0).toUpperCase() + match[1].slice(1);
    const fields = parseMongooseFields(match[2]);
    models.push({ name, filePath, fields, ormType: 'mongoose' });
  }

  const sequelizeModel = /sequelize\.define\s*\(\s*['"](\w+)['"]\s*,\s*\{([\s\S]*?)\}\s*(?:,|\))/g;
  while ((match = sequelizeModel.exec(content)) !== null) {
    const name = match[1].charAt(0).toUpperCase() + match[1].slice(1);
    const fields = parseSequelizeFields(match[2]);
    models.push({ name, filePath, fields, ormType: 'sequelize' });
  }

  const sqlalchemyModel = /class\s+(\w+)\s*\(.*(?:db\.Model|Base)\s*\):\s*([\s\S]*?)(?=\nclass\s|\Z)/g;
  while ((match = sqlalchemyModel.exec(content)) !== null) {
    const name = match[1];
    const body = match[2];
    const fields = parseSQLAlchemyFields(body);
    const tableMatch = body.match(/__tablename__\s*=\s*['"](\w+)['"]/);
    models.push({ name, filePath, fields, tableName: tableMatch?.[1], ormType: 'sqlalchemy' });
  }

  return models;
}

function parseDrizzleFields(block: string): ExtractedModel['fields'] {
  const fields: ExtractedModel['fields'] = [];
  const lines = block.split('\n');
  for (const line of lines) {
    const match = line.match(/(\w+)\s*:\s*(serial|text|varchar|integer|boolean|timestamp|real|numeric|jsonb|uuid|bigint|smallint|date|json)\s*\(/);
    if (!match) continue;
    const name = match[1];
    const type = match[2];
    fields.push({
      name,
      type,
      nullable: line.includes('.notNull') ? false : true,
      hasDefault: /\.default\(/.test(line) || /\.defaultNow\(\)/.test(line),
      isPrimary: /\.primaryKey\(\)/.test(line),
      isUnique: /\.unique\(\)/.test(line),
      isForeignKey: /\.references\(\)/.test(line),
      references: line.match(/references\(\s*\(\)\s*=>\s*(\w+)\./)?.[1],
    });
  }
  return fields;
}

function parsePrismaFields(block: string): ExtractedModel['fields'] {
  const fields: ExtractedModel['fields'] = [];
  const lines = block.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('@@') && !l.startsWith('//'));
  for (const line of lines) {
    const match = line.match(/^(\w+)\s+(String|Int|Float|Boolean|DateTime|Json|BigInt|Decimal|Bytes)(\?)?/);
    if (!match) continue;
    fields.push({
      name: match[1],
      type: match[2].toLowerCase(),
      nullable: !!match[3],
      hasDefault: /@default/.test(line),
      isPrimary: /@id/.test(line),
      isUnique: /@unique/.test(line),
      isForeignKey: /@relation/.test(line),
      references: line.match(/@relation\s*\(\s*fields:\s*\[(\w+)\]/)?.[1],
    });
  }
  return fields;
}

function parseTypeORMFields(body: string): ExtractedModel['fields'] {
  const fields: ExtractedModel['fields'] = [];
  const propPattern = /@(?:Column|PrimaryGeneratedColumn|PrimaryColumn|ManyToOne|OneToMany|OneToOne|ManyToMany)\s*\(([^)]*)\)\s*(\w+)\s*(?:!|:)\s*(\w+)/g;
  let match;
  while ((match = propPattern.exec(body)) !== null) {
    const decorator = body.substring(body.lastIndexOf('@', match.index), match.index + match[0].length);
    fields.push({
      name: match[2],
      type: match[3].toLowerCase(),
      nullable: /nullable:\s*true/.test(decorator),
      hasDefault: /default:/.test(decorator),
      isPrimary: /@PrimaryGeneratedColumn|@PrimaryColumn/.test(decorator),
      isUnique: /unique:\s*true/.test(decorator),
      isForeignKey: /@ManyToOne|@OneToOne/.test(decorator),
    });
  }
  return fields;
}

function parseMongooseFields(block: string): ExtractedModel['fields'] {
  const fields: ExtractedModel['fields'] = [];
  const fieldPattern = /(\w+)\s*:\s*(?:\{\s*type\s*:\s*(\w+)|(\w+))/g;
  let match;
  while ((match = fieldPattern.exec(block)) !== null) {
    const type = (match[2] || match[3] || 'string').toLowerCase();
    if (['string', 'number', 'boolean', 'date', 'buffer', 'objectid', 'array', 'map', 'mixed'].includes(type)) {
      fields.push({
        name: match[1],
        type,
        nullable: !/required\s*:\s*true/.test(block.substring(match.index, match.index + 200)),
        hasDefault: /default\s*:/.test(block.substring(match.index, match.index + 200)),
        isPrimary: match[1] === '_id',
        isUnique: /unique\s*:\s*true/.test(block.substring(match.index, match.index + 200)),
        isForeignKey: type === 'objectid',
      });
    }
  }
  return fields;
}

function parseSequelizeFields(block: string): ExtractedModel['fields'] {
  const fields: ExtractedModel['fields'] = [];
  const fieldPattern = /(\w+)\s*:\s*\{\s*type\s*:\s*(?:DataTypes\.|Sequelize\.)(\w+)/g;
  let match;
  while ((match = fieldPattern.exec(block)) !== null) {
    fields.push({
      name: match[1],
      type: match[2].toLowerCase(),
      nullable: !/allowNull\s*:\s*false/.test(block.substring(match.index, match.index + 200)),
      hasDefault: /defaultValue\s*:/.test(block.substring(match.index, match.index + 200)),
      isPrimary: /primaryKey\s*:\s*true/.test(block.substring(match.index, match.index + 200)),
      isUnique: /unique\s*:\s*true/.test(block.substring(match.index, match.index + 200)),
      isForeignKey: false,
    });
  }
  return fields;
}

function parseSQLAlchemyFields(body: string): ExtractedModel['fields'] {
  const fields: ExtractedModel['fields'] = [];
  const colPattern = /(\w+)\s*=\s*(?:db\.)?Column\s*\(\s*(?:db\.)?(\w+)/g;
  let match;
  while ((match = colPattern.exec(body)) !== null) {
    fields.push({
      name: match[1],
      type: match[2].toLowerCase(),
      nullable: !/nullable\s*=\s*False/.test(body.substring(match.index, match.index + 200)),
      hasDefault: /default\s*=/.test(body.substring(match.index, match.index + 200)),
      isPrimary: /primary_key\s*=\s*True/.test(body.substring(match.index, match.index + 200)),
      isUnique: /unique\s*=\s*True/.test(body.substring(match.index, match.index + 200)),
      isForeignKey: /ForeignKey/.test(body.substring(match.index, match.index + 200)),
      references: body.substring(match.index, match.index + 200).match(/ForeignKey\s*\(\s*['"](\w+)/)?.[1],
    });
  }
  return fields;
}

function extractClassBody(content: string, startIndex: number): string {
  let braceCount = 0;
  let started = false;
  let bodyStart = startIndex;
  for (let i = startIndex; i < content.length; i++) {
    if (content[i] === '{') {
      if (!started) bodyStart = i + 1;
      started = true;
      braceCount++;
    } else if (content[i] === '}') {
      braceCount--;
      if (braceCount === 0 && started) {
        return content.substring(bodyStart, i);
      }
    }
  }
  return content.substring(bodyStart);
}

function extractMiddlewares(content: string, filePath: string): ExtractedMiddleware[] {
  const middlewares: ExtractedMiddleware[] = [];

  if (!/middleware|auth|cors|rate.?limit|logging|error.?handler/i.test(filePath) &&
      !/middleware|passport|helmet|cors|rateLimit/i.test(content)) {
    return middlewares;
  }

  const exportedFns = content.match(/export\s+(?:default\s+)?(?:async\s+)?function\s+(\w+)/g);
  if (exportedFns) {
    for (const fn of exportedFns) {
      const name = fn.match(/function\s+(\w+)/)![1];
      let type: ExtractedMiddleware['type'] = 'custom';
      const lower = name.toLowerCase();
      if (lower.includes('auth') || lower.includes('protect') || lower.includes('verify') || lower.includes('session')) type = 'auth';
      else if (lower.includes('valid')) type = 'validation';
      else if (lower.includes('cors')) type = 'cors';
      else if (lower.includes('rate') || lower.includes('limit') || lower.includes('throttle')) type = 'rate-limit';
      else if (lower.includes('log')) type = 'logging';
      else if (lower.includes('error') || lower.includes('catch')) type = 'error-handler';

      middlewares.push({ name, filePath, type, appliedTo: [] });
    }
  }

  if (/app\.use\s*\(\s*cors/i.test(content)) {
    middlewares.push({ name: 'cors', filePath, type: 'cors', appliedTo: ['*'] });
  }
  if (/app\.use\s*\(\s*helmet/i.test(content)) {
    middlewares.push({ name: 'helmet', filePath, type: 'custom', appliedTo: ['*'] });
  }
  if (/rateLimit|RateLimiter/i.test(content)) {
    middlewares.push({ name: 'rateLimiter', filePath, type: 'rate-limit', appliedTo: ['*'] });
  }

  return middlewares;
}

function categorizeFile(path: string, content: string): FileNode['category'] {
  const lower = path.toLowerCase();

  if (/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(lower) || lower.includes('__tests__/') || lower.includes('e2e/')) return 'test';
  if (/\.(css|scss|sass|less|styl)$/.test(lower)) return 'style';
  if (/\.(png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot|mp4|mp3)$/.test(lower)) return 'asset';
  if (/\.(json|ya?ml|toml|env|ini|conf)$/.test(lower) || lower.includes('config') || lower.includes('.rc')) return 'config';

  if (lower.includes('pages/') || lower.includes('views/') || lower.match(/app\/.*\/page\./)) return 'page';
  if (lower.includes('route') && /\.(ts|js)$/.test(lower)) return 'route';
  if (lower.includes('schema') || lower.includes('model') || lower.includes('entity') || lower.endsWith('.prisma')) return 'model';
  if (lower.includes('middleware') || lower.includes('guard')) return 'middleware';
  if (lower.includes('component') || /\.(tsx|jsx)$/.test(lower)) return 'component';
  if (lower.includes('util') || lower.includes('helper') || lower.includes('lib/') || lower.includes('service')) return 'util';

  return 'unknown';
}

function findCircularDeps(edges: ImportEdge[]): string[][] {
  const adj = new Map<string, string[]>();
  for (const edge of edges) {
    if (!adj.has(edge.from)) adj.set(edge.from, []);
    adj.get(edge.from)!.push(edge.to);
  }

  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recStack = new Set<string>();

  function dfs(node: string, path: string[]): void {
    visited.add(node);
    recStack.add(node);

    const neighbors = adj.get(node) || [];
    for (const neighbor of neighbors) {
      if (!adj.has(neighbor)) continue;

      if (recStack.has(neighbor)) {
        const cycleStart = path.indexOf(neighbor);
        if (cycleStart !== -1) {
          cycles.push(path.slice(cycleStart).concat(neighbor));
        }
      } else if (!visited.has(neighbor)) {
        dfs(neighbor, [...path, neighbor]);
      }
    }

    recStack.delete(node);
  }

  for (const node of Array.from(adj.keys())) {
    if (!visited.has(node)) {
      dfs(node, [node]);
    }
  }

  return cycles.slice(0, 10);
}

function findOrphanFiles(nodes: Map<string, FileNode>, edges: ImportEdge[]): string[] {
  const imported = new Set<string>();
  const importers = new Set<string>();
  for (const e of edges) {
    imported.add(e.to);
    importers.add(e.from);
  }

  const orphans: string[] = [];
  for (const [path, node] of Array.from(nodes.entries())) {
    if (node.category === 'config' || node.category === 'test' || node.category === 'style' || node.category === 'asset') continue;
    if (!imported.has(path) && node.imports.length === 0 && !isEntryPoint(path)) {
      orphans.push(path);
    }
  }
  return orphans;
}

function isEntryPoint(path: string): boolean {
  const lower = path.toLowerCase();
  return /^(index|main|app|server|entry)\.(ts|tsx|js|jsx|py|go|rs)$/.test(lower.split('/').pop() || '') ||
    lower.includes('pages/') || lower.includes('app/') ||
    lower === 'manage.py' || lower === 'wsgi.py';
}

function findEntryPoints(files: FileInfo[]): string[] {
  const entries: string[] = [];
  for (const f of files) {
    if (isEntryPoint(f.path)) entries.push(f.path);
  }
  if (entries.length === 0) {
    const candidates = files.filter(f => /\.(ts|tsx|js|jsx|py)$/.test(f.path));
    if (candidates.length > 0) entries.push(candidates[0].path);
  }
  return entries;
}

function groupIntoModules(nodes: Map<string, FileNode>): LogicalModule[] {
  const dirGroups = new Map<string, string[]>();

  for (const [path] of Array.from(nodes.entries())) {
    const parts = path.split('/');
    const dirKey = parts.length > 2
      ? parts.slice(0, 2).join('/')
      : parts.length > 1
        ? parts[0]
        : 'root';
    if (!dirGroups.has(dirKey)) dirGroups.set(dirKey, []);
    dirGroups.get(dirKey)!.push(path);
  }

  const modules: LogicalModule[] = [];
  for (const [dir, files] of Array.from(dirGroups.entries())) {
    const entities: string[] = [];
    const pages: string[] = [];
    const routes: string[] = [];

    for (const fp of files) {
      const node = nodes.get(fp);
      if (!node) continue;
      if (node.category === 'model') entities.push(...node.models.map(m => m.name));
      if (node.category === 'page') pages.push(fp);
      if (node.category === 'route') routes.push(fp);
    }

    let type: LogicalModule['type'] = 'feature';
    const lower = dir.toLowerCase();
    if (lower.includes('shared') || lower.includes('common') || lower.includes('lib') || lower.includes('util')) type = 'shared';
    if (lower.includes('config') || lower === 'root') type = 'config';
    if (lower.includes('test') || lower.includes('spec')) type = 'test';
    if (lower.includes('style') || lower.includes('css')) type = 'style';

    modules.push({
      name: dir,
      files,
      type,
      entities: Array.from(new Set(entities)),
      pages,
      routes,
    });
  }

  return modules;
}

export function analyzeCodebase(files: FileInfo[]): CodebaseAnalysis {
  const codeFiles = files.filter(f =>
    /\.(ts|tsx|js|jsx|py|go|rs|rb|php|java|vue|svelte|astro|prisma|sql|graphql|gql)$/.test(f.path) ||
    f.path === 'package.json' || f.path.endsWith('/package.json')
  );

  const techStack = detectTechStack(files.map(f => ({ path: f.path, content: f.content })));

  const nodes = new Map<string, FileNode>();
  const allEdges: ImportEdge[] = [];
  const allComponents: ExtractedComponent[] = [];
  const allRoutes: ExtractedRoute[] = [];
  const allModels: ExtractedModel[] = [];
  const allMiddlewares: ExtractedMiddleware[] = [];

  for (const file of codeFiles) {
    const imports = parseImports(file.content, file.path);
    const exports = parseExports(file.content, file.path);
    const components = extractComponents(file.content, file.path);
    const routes = extractRoutes(file.content, file.path);
    const models = extractModels(file.content, file.path);
    const middlewares = extractMiddlewares(file.content, file.path);
    const category = categorizeFile(file.path, file.content);
    const linesOfCode = file.content.split('\n').length;

    nodes.set(file.path, {
      path: file.path,
      language: file.language,
      imports,
      exports,
      components,
      routes,
      models,
      middlewares,
      linesOfCode,
      category,
    });

    allEdges.push(...imports);
    allComponents.push(...components);
    allRoutes.push(...routes);
    allModels.push(...models);
    allMiddlewares.push(...middlewares);
  }

  const circularDeps = findCircularDeps(allEdges.filter(e => e.to.startsWith('.') || e.to.startsWith('src/') || nodes.has(e.to)));
  const orphanFiles = findOrphanFiles(nodes, allEdges);
  const entryPoints = findEntryPoints(files);

  const graph: DependencyGraph = {
    nodes,
    edges: allEdges,
    circularDeps,
    orphanFiles,
    entryPoints,
  };

  const modules = groupIntoModules(nodes);

  const filesByLanguage: Record<string, number> = {};
  for (const file of files) {
    filesByLanguage[file.language] = (filesByLanguage[file.language] || 0) + 1;
  }

  return {
    techStack,
    graph,
    components: allComponents,
    routes: allRoutes,
    models: allModels,
    middlewares: allMiddlewares,
    modules,
    stats: {
      totalFiles: files.length,
      totalLines: files.reduce((sum, f) => sum + f.content.split('\n').length, 0),
      filesByLanguage,
      componentCount: allComponents.length,
      routeCount: allRoutes.length,
      modelCount: allModels.length,
    },
  };
}

export function formatAnalysisReport(analysis: CodebaseAnalysis): string {
  const sections: string[] = [];

  sections.push(`# Codebase Analysis Report\n`);
  sections.push(`**${analysis.stats.totalFiles} files** | **${analysis.stats.totalLines.toLocaleString()} lines** | **${analysis.stats.componentCount} components** | **${analysis.stats.routeCount} routes** | **${analysis.stats.modelCount} models**\n`);

  sections.push(`\n${analysis.techStack.summary}\n`);

  if (analysis.models.length > 0) {
    sections.push(`\n## Data Models (${analysis.models.length})`);
    for (const model of analysis.models) {
      sections.push(`- **${model.name}** (${model.ormType}${model.tableName ? `, table: ${model.tableName}` : ''}) — ${model.fields.length} fields`);
    }
  }

  if (analysis.routes.length > 0) {
    sections.push(`\n## API Routes (${analysis.routes.length})`);
    for (const route of analysis.routes) {
      sections.push(`- \`${route.method} ${route.path}\` → ${route.handlerFile}`);
    }
  }

  if (analysis.components.length > 0) {
    sections.push(`\n## Components (${analysis.components.length})`);
    for (const comp of analysis.components.slice(0, 20)) {
      const info: string[] = [];
      if (comp.props.length > 0) info.push(`${comp.props.length} props`);
      if (comp.hooks.length > 0) info.push(`hooks: ${comp.hooks.join(', ')}`);
      if (comp.hasState) info.push('stateful');
      sections.push(`- **${comp.name}** (${comp.filePath})${info.length > 0 ? ' — ' + info.join(', ') : ''}`);
    }
  }

  if (analysis.modules.length > 0) {
    sections.push(`\n## Modules (${analysis.modules.length})`);
    for (const mod of analysis.modules) {
      sections.push(`- **${mod.name}** (${mod.type}) — ${mod.files.length} files`);
    }
  }

  if (analysis.graph.circularDeps.length > 0) {
    sections.push(`\n## Circular Dependencies (${analysis.graph.circularDeps.length})`);
    for (const cycle of analysis.graph.circularDeps.slice(0, 5)) {
      sections.push(`- ${cycle.join(' → ')}`);
    }
  }

  if (analysis.graph.orphanFiles.length > 0) {
    sections.push(`\n## Orphan Files (${analysis.graph.orphanFiles.length})`);
    for (const orphan of analysis.graph.orphanFiles.slice(0, 10)) {
      sections.push(`- ${orphan}`);
    }
  }

  return sections.join('\n');
}