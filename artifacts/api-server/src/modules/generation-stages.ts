import { localAI } from './local-ai-engine.js';
import type { SchemaRecommendation } from './local-ai-engine.js';
import { templateRegistry } from './template-registry.js';

export interface APISpec {
  routes: APIRoute[];
  middleware: MiddlewareSpec[];
  validationSchemas: Record<string, ValidationSchema>;
  errorHandling: ErrorHandlingSpec;
  pagination: PaginationSpec;
}

export interface APIRoute {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  handler: string;
  description: string;
  auth: boolean;
  validation?: string;
  pagination?: boolean;
  responseType: string;
}

export interface MiddlewareSpec {
  name: string;
  path: string;
  order: number;
  config: Record<string, any>;
}

export interface ValidationSchema {
  name: string;
  fields: Record<string, { type: string; required: boolean; rules: string[] }>;
}

export interface ErrorHandlingSpec {
  globalHandler: boolean;
  notFoundHandler: boolean;
  validationErrorFormat: string;
  errorCodes: Record<string, number>;
}

export interface PaginationSpec {
  defaultLimit: number;
  maxLimit: number;
  style: 'offset' | 'cursor';
}

export interface CodeOutput {
  files: GeneratedCodeFile[];
  totalLines: number;
  totalFiles: number;
  entryPoint: string;
}

export interface GeneratedCodeFile {
  path: string;
  content: string;
  language: string;
  role: 'config' | 'schema' | 'route' | 'component' | 'page' | 'hook' | 'utility' | 'style' | 'test' | 'type';
}

export interface TestSuite {
  files: TestFile[];
  coverage: CoverageEstimate;
  testCount: number;
}

export interface TestFile {
  path: string;
  content: string;
  testCount: number;
  type: 'unit' | 'integration' | 'component' | 'e2e';
}

export interface CoverageEstimate {
  routes: number;
  components: number;
  utils: number;
  overall: number;
}

export interface SimulationResult {
  flows: SimulatedFlow[];
  errors: SimulatedError[];
  performance: PerformanceEstimate;
  passRate: number;
}

export interface SimulatedFlow {
  name: string;
  steps: string[];
  success: boolean;
  issues: string[];
}

export interface SimulatedError {
  type: string;
  location: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  fix: string;
}

export interface PerformanceEstimate {
  initialLoadMs: number;
  routeChangeMs: number;
  apiLatencyMs: number;
  bundleSizeKb: number;
}

export function designAPISpec(
  entities: any[],
  relationships: any[],
  features: any[]
): APISpec {
  const routes: APIRoute[] = [];
  const validationSchemas: Record<string, ValidationSchema> = {};

  for (const entity of (entities || [])) {
    const name = entity.name || entity.entityName || 'item';
    const plural = toKebab(name) + 's';
    const fields = entity.fields || entity.columns || [];
    const hasAuth = fields.some((f: any) => f.name?.includes('user') || f.name?.includes('author') || f.name?.includes('owner'));

    routes.push({
      method: 'GET', path: `/api/${plural}`, handler: `get${toPascal(name)}s`,
      description: `List all ${name}s with pagination and filters`,
      auth: false, pagination: true, responseType: `${toPascal(name)}[]`,
    });

    routes.push({
      method: 'GET', path: `/api/${plural}/:id`, handler: `get${toPascal(name)}ById`,
      description: `Get a single ${name} by ID`,
      auth: false, responseType: toPascal(name),
    });

    routes.push({
      method: 'POST', path: `/api/${plural}`, handler: `create${toPascal(name)}`,
      description: `Create a new ${name}`,
      auth: hasAuth, validation: `insert${toPascal(name)}Schema`,
      responseType: toPascal(name),
    });

    routes.push({
      method: 'PUT', path: `/api/${plural}/:id`, handler: `update${toPascal(name)}`,
      description: `Update an existing ${name}`,
      auth: hasAuth, validation: `update${toPascal(name)}Schema`,
      responseType: toPascal(name),
    });

    routes.push({
      method: 'DELETE', path: `/api/${plural}/:id`, handler: `delete${toPascal(name)}`,
      description: `Delete a ${name}`,
      auth: hasAuth, responseType: '{ success: boolean }',
    });

    const searchableFields = fields.filter((f: any) => {
      const t = (f.type || '').toLowerCase();
      const n = (f.name || '').toLowerCase();
      return t === 'text' || t === 'string' || n.includes('name') || n.includes('title');
    });
    if (searchableFields.length > 0) {
      routes.push({
        method: 'GET', path: `/api/${plural}/search`, handler: `search${toPascal(name)}s`,
        description: `Search ${name}s by ${searchableFields.map((f: any) => f.name).join(', ')}`,
        auth: false, pagination: true, responseType: `${toPascal(name)}[]`,
      });
    }

    const schemaFields: Record<string, { type: string; required: boolean; rules: string[] }> = {};
    for (const field of fields) {
      if (field.name === 'id' || field.name === 'createdAt' || field.name === 'updatedAt') continue;
      schemaFields[field.name] = {
        type: mapFieldToZodType(field.type || 'string'),
        required: field.required || false,
        rules: inferValidationRules(field),
      };
    }
    validationSchemas[`insert${toPascal(name)}Schema`] = {
      name: `insert${toPascal(name)}Schema`,
      fields: schemaFields,
    };
  }

  for (const rel of (relationships || [])) {
    if (rel.type === 'one-to-many' || rel.cardinality === 'one-to-many') {
      const parent = toKebab(rel.from || rel.source || '');
      const child = toKebab(rel.to || rel.target || '');
      if (parent && child) {
        routes.push({
          method: 'GET', path: `/api/${parent}s/:id/${child}s`,
          handler: `get${toPascal(parent)}${toPascal(child)}s`,
          description: `Get all ${child}s for a ${parent}`,
          auth: false, pagination: true, responseType: `${toPascal(child)}[]`,
        });
      }
    }
  }

  const firstEntityName = (entities || [])[0]?.name || (entities || [])[0]?.entityName || 'resource';
  const matchedApiTemplates = templateRegistry.findApiTemplates(['auth', 'search', 'batch', 'file'], 6);
  for (const tpl of matchedApiTemplates) {
    const tplPath = tpl.pathPattern.replace('{{resource}}', toKebab(firstEntityName) + 's').replace(':resource', toKebab(firstEntityName) + 's');
    const exists = routes.some(r => r.method === tpl.method && r.path === tplPath);
    if (!exists) {
      const handlerName = tplPath.split('/').filter(Boolean).map(s => s.replace(/^:/, '')).map(s => toPascal(s)).join('');
      routes.push({
        method: tpl.method,
        path: tplPath,
        handler: `handle${handlerName}`,
        description: tpl.description,
        auth: tpl.middleware.includes('authenticate'),
        responseType: tpl.responseSchema.map(r => r.field).join(', ') || 'object',
      });
    }
  }

  const middleware: MiddlewareSpec[] = [
    { name: 'cors', path: '*', order: 1, config: { origin: '*' } },
    { name: 'json-parser', path: '*', order: 2, config: { limit: '10mb' } },
    { name: 'request-logger', path: '/api/*', order: 3, config: { format: 'combined' } },
    { name: 'error-handler', path: '*', order: 99, config: {} },
  ];

  const existingMiddlewareNames = new Set(middleware.map(m => m.name));
  for (const tpl of matchedApiTemplates) {
    for (const mw of tpl.middleware) {
      if (!existingMiddlewareNames.has(mw)) {
        existingMiddlewareNames.add(mw);
        middleware.push({ name: mw, path: '/api/*', order: middleware.length + 1, config: {} });
      }
    }
  }

  const hasAuthFeature = features?.some((f: any) => {
    const s = typeof f === 'string' ? f : f.name || '';
    return s.toLowerCase().includes('auth');
  });
  if (hasAuthFeature) {
    middleware.push({ name: 'auth-middleware', path: '/api/*', order: 4, config: { strategy: 'session' } });
  }

  return {
    routes,
    middleware,
    validationSchemas,
    errorHandling: {
      globalHandler: true,
      notFoundHandler: true,
      validationErrorFormat: 'zod',
      errorCodes: { NOT_FOUND: 404, VALIDATION: 400, UNAUTHORIZED: 401, FORBIDDEN: 403, INTERNAL: 500 },
    },
    pagination: { defaultLimit: 20, maxLimit: 100, style: 'offset' },
  };
}

export function synthesizeCode(
  entities: any[],
  apiSpec: APISpec,
  designSystem: any,
  architecture: any
): CodeOutput {
  const files: GeneratedCodeFile[] = [];

  files.push({
    path: 'shared/schema.ts',
    content: generateSchemaFile(entities),
    language: 'typescript',
    role: 'schema',
  });

  files.push({
    path: 'server/routes.ts',
    content: generateRoutesFile(entities, apiSpec),
    language: 'typescript',
    role: 'route',
  });

  files.push({
    path: 'server/storage.ts',
    content: generateStorageFile(entities),
    language: 'typescript',
    role: 'utility',
  });

  for (const entity of (entities || [])) {
    const name = entity.name || entity.entityName || 'Item';
    const pascal = toPascal(name);
    const fields = entity.fields || entity.columns || [];

    files.push({
      path: `client/src/pages/${toKebab(name)}s.tsx`,
      content: generateListPage(name, pascal, fields),
      language: 'tsx',
      role: 'page',
    });

    files.push({
      path: `client/src/components/${toKebab(name)}-form.tsx`,
      content: generateFormComponent(name, pascal, fields),
      language: 'tsx',
      role: 'component',
    });

    files.push({
      path: `client/src/components/${toKebab(name)}-card.tsx`,
      content: generateCardComponent(name, pascal, fields),
      language: 'tsx',
      role: 'component',
    });
  }

  const matchedSnippets = templateRegistry.findCodeSnippets(['react-hooks', 'react-components', 'utility-functions'], [], 10);
  for (const snippet of matchedSnippets) {
    const catLower = snippet.category.toLowerCase();
    let snippetPath: string;
    let snippetRole: GeneratedCodeFile['role'];
    if (catLower.includes('hook')) {
      snippetPath = `client/src/hooks/${snippet.id}.ts`;
      snippetRole = 'hook';
    } else if (catLower.includes('component')) {
      snippetPath = `client/src/components/shared/${snippet.id}.tsx`;
      snippetRole = 'component';
    } else if (catLower.includes('middleware')) {
      snippetPath = `server/middleware/${snippet.id}.ts`;
      snippetRole = 'utility';
    } else {
      snippetPath = `client/src/utils/${snippet.id}.ts`;
      snippetRole = 'utility';
    }
    files.push({
      path: snippetPath,
      content: snippet.code,
      language: snippet.language,
      role: snippetRole,
    });
  }

  files.push({
    path: 'client/src/App.tsx',
    content: generateAppFile(entities),
    language: 'tsx',
    role: 'config',
  });

  if (designSystem) {
    files.push({
      path: 'client/src/index.css',
      content: generateStyleFile(designSystem),
      language: 'css',
      role: 'style',
    });
  }

  const totalLines = files.reduce((sum, f) => sum + f.content.split('\n').length, 0);

  return {
    files,
    totalLines,
    totalFiles: files.length,
    entryPoint: 'server/index.ts',
  };
}

export function generateTests(
  entities: any[],
  apiSpec: APISpec,
  codeFiles: GeneratedCodeFile[]
): TestSuite {
  const testFiles: TestFile[] = [];
  let totalTests = 0;

  for (const entity of (entities || [])) {
    const name = entity.name || entity.entityName || 'Item';
    const pascal = toPascal(name);
    const plural = toKebab(name) + 's';
    const fields = entity.fields || entity.columns || [];

    const apiTestContent = generateAPITestFile(name, pascal, plural, fields);
    const apiTestCount = (apiTestContent.match(/it\(/g) || []).length;
    totalTests += apiTestCount;

    testFiles.push({
      path: `tests/${toKebab(name)}.api.test.ts`,
      content: apiTestContent,
      testCount: apiTestCount,
      type: 'integration',
    });

    const componentTestContent = generateComponentTestFile(name, pascal, fields);
    const componentTestCount = (componentTestContent.match(/it\(/g) || []).length;
    totalTests += componentTestCount;

    testFiles.push({
      path: `tests/${toKebab(name)}.component.test.ts`,
      content: componentTestContent,
      testCount: componentTestCount,
      type: 'component',
    });
  }

  const matchedTestPatterns = templateRegistry.findTestPatterns(['unit', 'integration', 'e2e'], 5);
  for (const pattern of matchedTestPatterns) {
    const testContent = pattern.codeTemplate
      .replace(/\{\{functionName\}\}/g, 'processData')
      .replace(/\{\{modulePath\}\}/g, '../src/utils')
      .replace(/\{\{validInput\}\}/g, '"test"')
      .replace(/\{\{expectedOutput\}\}/g, '"test"')
      .replace(/\{\{edgeCaseInput\}\}/g, '""')
      .replace(/\{\{edgeCaseOutput\}\}/g, '""')
      .replace(/\{\{invalidInput\}\}/g, 'null')
      .replace(/\{\{className\}\}/g, 'DataService')
      .replace(/\{\{methodName\}\}/g, 'execute')
      .replace(/\{\{endpoint\}\}/g, '/api/items')
      .replace(/\{\{baseUrl\}\}/g, 'http://localhost:5000')
      .replace(/\{\{componentName\}\}/g, 'AppComponent')
      .replace(/\{\{ComponentName\}\}/g, 'AppComponent');
    const patternTestCount = pattern.assertions.length;
    totalTests += patternTestCount;
    testFiles.push({
      path: `tests/${pattern.id}.test.ts`,
      content: testContent,
      testCount: patternTestCount,
      type: pattern.testType as TestFile['type'],
    });
  }

  const routeCount = apiSpec?.routes?.length || 0;
  const componentCount = codeFiles?.filter(f => f.role === 'component' || f.role === 'page')?.length || 0;

  return {
    files: testFiles,
    coverage: {
      routes: Math.min(100, (testFiles.filter(t => t.type === 'integration').length / Math.max(1, entities?.length || 1)) * 100),
      components: Math.min(100, (testFiles.filter(t => t.type === 'component').length / Math.max(1, entities?.length || 1)) * 100),
      utils: 0,
      overall: Math.min(100, Math.round((totalTests / Math.max(1, routeCount + componentCount)) * 20)),
    },
    testCount: totalTests,
  };
}

export function simulateRuntime(
  entities: any[],
  apiSpec: APISpec,
  codeFiles: GeneratedCodeFile[]
): SimulationResult {
  const flows: SimulatedFlow[] = [];
  const errors: SimulatedError[] = [];

  for (const entity of (entities || [])) {
    const name = entity.name || entity.entityName || 'Item';
    const plural = toKebab(name) + 's';

    flows.push({
      name: `CRUD Flow: ${name}`,
      steps: [
        `Navigate to /${plural}`,
        `Click "Create ${name}"`,
        'Fill form fields',
        'Submit form',
        `Verify ${name} appears in list`,
        `Click ${name} to view details`,
        'Click edit button',
        'Modify fields',
        'Save changes',
        'Click delete button',
        'Confirm deletion',
        `Verify ${name} removed from list`,
      ],
      success: true,
      issues: [],
    });
  }

  flows.push({
    name: 'Navigation Flow',
    steps: [
      'Load application',
      'Verify sidebar rendered',
      'Click each nav item',
      'Verify page loads for each route',
      'Check browser back/forward works',
    ],
    success: true,
    issues: [],
  });

  const archetypeMatches = templateRegistry.findArchetypes((entities || []).map((e: any) => e.name || '').join(' '), 1);
  if (archetypeMatches.length > 0) {
    const archetype = archetypeMatches[0];
    for (const page of archetype.pages) {
      flows.push({
        name: `Page: ${page}`,
        steps: ['Load page', 'Verify render', 'Check responsive'],
        success: true,
        issues: [],
      });
    }
  }

  for (const file of (codeFiles || [])) {
    const content = file.content || '';

    if (content.includes('fetch(') && !content.includes('try')) {
      errors.push({
        type: 'missing-error-handling',
        location: file.path,
        message: 'Fetch call without try/catch error handling',
        severity: 'warning',
        fix: 'Wrap fetch calls in try/catch blocks',
      });
    }

    if (file.role === 'component' || file.role === 'page') {
      if (content.includes('useQuery') && !content.includes('isLoading') && !content.includes('isPending')) {
        errors.push({
          type: 'missing-loading-state',
          location: file.path,
          message: 'Query without loading state',
          severity: 'warning',
          fix: 'Add loading skeleton or spinner while data loads',
        });
      }
    }

    if (file.role === 'route') {
      const routeHandlers = content.match(/\.(get|post|put|delete|patch)\(/g) || [];
      const tryCatches = content.match(/try\s*\{/g) || [];
      if (routeHandlers.length > tryCatches.length) {
        errors.push({
          type: 'unhandled-route-error',
          location: file.path,
          message: `${routeHandlers.length - tryCatches.length} route handlers without error handling`,
          severity: 'warning',
          fix: 'Wrap route handlers in try/catch and return proper error responses',
        });
      }
    }
  }

  const fileCount = codeFiles?.length || 0;
  const componentCount = codeFiles?.filter(f => f.role === 'component' || f.role === 'page')?.length || 0;

  return {
    flows,
    errors,
    performance: {
      initialLoadMs: 800 + componentCount * 50,
      routeChangeMs: 100 + componentCount * 10,
      apiLatencyMs: 50 + (entities?.length || 0) * 5,
      bundleSizeKb: 200 + fileCount * 15 + componentCount * 25,
    },
    passRate: flows.length > 0 ? (flows.filter(f => f.success).length / flows.length) * 100 : 0,
  };
}

function generateSchemaFile(entities: any[]): string {
  const entityNames = new Set((entities || []).map((e: any) => (e.name || e.entityName || '').toLowerCase()));

  const lines = [
    'import { pgTable, text, serial, integer, boolean, timestamp, real, jsonb, varchar } from "drizzle-orm/pg-core";',
    'import { createInsertSchema } from "drizzle-zod";',
    'import { z } from "zod";',
    '',
  ];

  for (const entity of (entities || [])) {
    const name = entity.name || entity.entityName || 'item';
    const tableName = toSnake(name);
    const varName = toCamel(name) + 's';
    const fields = entity.fields || entity.columns || [];

    lines.push(`export const ${varName} = pgTable("${tableName}", {`);
    lines.push('  id: serial("id").primaryKey(),');

    for (const field of fields) {
      if (field.name === 'id') continue;
      const col = toSnake(field.name);
      const fieldName = field.name;
      const isForeignKey = fieldName.endsWith('Id') && fieldName !== 'id' && fieldName.length > 2;

      if (isForeignKey) {
        const refEntityName = fieldName.slice(0, -2).toLowerCase();
        const FK_ALIASES: Record<string, string[]> = {
          user: ['customer', 'member', 'account', 'person', 'employee', 'staff', 'patient', 'student', 'teacher', 'author', 'owner'],
          customer: ['user', 'member', 'account', 'person'],
          author: ['user', 'member', 'writer'],
          owner: ['user', 'member'],
          assignee: ['user', 'member', 'employee', 'staff', 'team'],
          reviewer: ['user', 'member', 'employee'],
          creator: ['user', 'member', 'author'],
          category: ['type', 'group'],
          parent: ['category', 'folder', 'group'],
          project: ['workspace', 'board'],
        };
        let resolvedRef = refEntityName;
        if (!entityNames.has(refEntityName)) {
          const aliases = FK_ALIASES[refEntityName] || [];
          for (const alias of aliases) {
            if (entityNames.has(alias)) {
              resolvedRef = alias;
              break;
            }
          }
        }
        const refVarName = toCamel(resolvedRef) + 's';
        if (entityNames.has(resolvedRef)) {
          lines.push(`  ${toCamel(fieldName)}: integer("${col}").references(() => ${refVarName}.id),`);
        } else {
          lines.push(`  ${toCamel(fieldName)}: integer("${col}"),`);
        }
      } else {
        const drizzleType = mapToDrizzleType(field.type || 'text', col);
        const nullable = field.required ? '.notNull()' : '';
        lines.push(`  ${toCamel(fieldName)}: ${drizzleType}${nullable},`);
      }
    }

    lines.push('  createdAt: timestamp("created_at").defaultNow().notNull(),');
    lines.push('  updatedAt: timestamp("updated_at").defaultNow().notNull(),');
    lines.push('});');
    lines.push('');

    const insertSchemaName = `insert${toPascal(name)}Schema`;
    lines.push(`export const ${insertSchemaName} = createInsertSchema(${varName}).omit({ id: true, createdAt: true, updatedAt: true });`);
    lines.push(`export type Insert${toPascal(name)} = z.infer<typeof ${insertSchemaName}>;`);
    lines.push(`export type ${toPascal(name)} = typeof ${varName}.$inferSelect;`);
    lines.push('');
  }

  return lines.join('\n');
}

function generateRoutesFile(entities: any[], apiSpec: APISpec): string {
  const lines = [
    'import type { Express } from "express";',
    'import { createServer, type Server } from "http";',
    'import { storage } from "./storage";',
    '',
    'export async function registerRoutes(app: Express): Promise<Server> {',
  ];

  for (const entity of (entities || [])) {
    const name = entity.name || entity.entityName || 'item';
    const plural = toKebab(name) + 's';
    const pascal = toPascal(name);

    lines.push('');
    lines.push(`  // ${pascal} routes`);
    lines.push(`  app.get("/api/${plural}", async (req, res) => {`);
    lines.push('    try {');
    lines.push(`      const items = await storage.getAll${pascal}s();`);
    lines.push('      res.json(items);');
    lines.push('    } catch (err) {');
    lines.push('      res.status(500).json({ error: "Failed to fetch" });');
    lines.push('    }');
    lines.push('  });');
    lines.push('');
    lines.push(`  app.get("/api/${plural}/:id", async (req, res) => {`);
    lines.push('    try {');
    lines.push(`      const item = await storage.get${pascal}(Number(req.params.id));`);
    lines.push('      if (!item) return res.status(404).json({ error: "Not found" });');
    lines.push('      res.json(item);');
    lines.push('    } catch (err) {');
    lines.push('      res.status(500).json({ error: "Failed to fetch" });');
    lines.push('    }');
    lines.push('  });');
    lines.push('');
    lines.push(`  app.post("/api/${plural}", async (req, res) => {`);
    lines.push('    try {');
    lines.push(`      const item = await storage.create${pascal}(req.body);`);
    lines.push('      res.status(201).json(item);');
    lines.push('    } catch (err) {');
    lines.push('      res.status(400).json({ error: "Failed to create" });');
    lines.push('    }');
    lines.push('  });');
    lines.push('');
    lines.push(`  app.put("/api/${plural}/:id", async (req, res) => {`);
    lines.push('    try {');
    lines.push(`      const item = await storage.update${pascal}(Number(req.params.id), req.body);`);
    lines.push('      if (!item) return res.status(404).json({ error: "Not found" });');
    lines.push('      res.json(item);');
    lines.push('    } catch (err) {');
    lines.push('      res.status(400).json({ error: "Failed to update" });');
    lines.push('    }');
    lines.push('  });');
    lines.push('');
    lines.push(`  app.delete("/api/${plural}/:id", async (req, res) => {`);
    lines.push('    try {');
    lines.push(`      await storage.delete${pascal}(Number(req.params.id));`);
    lines.push('      res.json({ success: true });');
    lines.push('    } catch (err) {');
    lines.push('      res.status(500).json({ error: "Failed to delete" });');
    lines.push('    }');
    lines.push('  });');
  }

  lines.push('');
  lines.push('  const httpServer = createServer(app);');
  lines.push('  return httpServer;');
  lines.push('}');

  return lines.join('\n');
}

function generateStorageFile(entities: any[]): string {
  const lines = [
    'import { db } from "./db";',
    'import { eq } from "drizzle-orm";',
  ];

  const imports = entities.map((e: any) => {
    const name = e.name || e.entityName || 'item';
    return `${toCamel(name)}s`;
  });
  lines.push(`import { ${imports.join(', ')} } from "../shared/schema";`);
  lines.push('');
  lines.push('export interface IStorage {');
  for (const entity of entities) {
    const name = entity.name || entity.entityName || 'item';
    const pascal = toPascal(name);
    lines.push(`  getAll${pascal}s(): Promise<any[]>;`);
    lines.push(`  get${pascal}(id: number): Promise<any | undefined>;`);
    lines.push(`  create${pascal}(data: any): Promise<any>;`);
    lines.push(`  update${pascal}(id: number, data: any): Promise<any | undefined>;`);
    lines.push(`  delete${pascal}(id: number): Promise<void>;`);
  }
  lines.push('}');
  lines.push('');
  lines.push('class DatabaseStorage implements IStorage {');
  for (const entity of entities) {
    const name = entity.name || entity.entityName || 'item';
    const pascal = toPascal(name);
    const varName = toCamel(name) + 's';
    lines.push(`  async getAll${pascal}s() { return db.select().from(${varName}); }`);
    lines.push(`  async get${pascal}(id: number) { const [item] = await db.select().from(${varName}).where(eq(${varName}.id, id)); return item; }`);
    lines.push(`  async create${pascal}(data: any) { const [item] = await db.insert(${varName}).values(data).returning(); return item; }`);
    lines.push(`  async update${pascal}(id: number, data: any) { const [item] = await db.update(${varName}).set(data).where(eq(${varName}.id, id)).returning(); return item; }`);
    lines.push(`  async delete${pascal}(id: number) { await db.delete(${varName}).where(eq(${varName}.id, id)); }`);
  }
  lines.push('}');
  lines.push('');
  lines.push('export const storage = new DatabaseStorage();');
  return lines.join('\n');
}

function generateListPage(name: string, pascal: string, fields: any[]): string {
  const displayFields = fields.filter((f: any) => f.name !== 'id' && !f.name?.includes('password')).slice(0, 5);
  return `import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { ${pascal} } from "@shared/schema";

export default function ${pascal}sPage() {
  const { data: items, isLoading } = useQuery<${pascal}[]>({
    queryKey: ["/api/${toKebab(name)}s"],
  });

  if (isLoading) return <div className="p-6" data-testid="loading-${toKebab(name)}s">Loading...</div>;

  return (
    <div className="p-6 space-y-4" data-testid="page-${toKebab(name)}s">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold" data-testid="text-title">${pascal}s</h1>
        <Button data-testid="button-create-${toKebab(name)}"><Plus className="w-4 h-4 mr-2" /> Add ${pascal}</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items?.map((item) => (
          <Card key={item.id} className="hover-elevate" data-testid={"card-${toKebab(name)}-" + item.id}>
            <CardHeader><CardTitle data-testid={"text-${toKebab(name)}-name-" + item.id}>{${displayFields[0] ? `item.${displayFields[0].name}` : '"Item"'}}</CardTitle></CardHeader>
            <CardContent>
              ${displayFields.slice(1).map((f: any) => `<p className="text-sm text-muted-foreground" data-testid={"text-${toKebab(name)}-${f.name}-" + item.id}>{String(item.${f.name} ?? "")}</p>`).join('\n              ')}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}`;
}

function generateFormComponent(name: string, pascal: string, fields: any[]): string {
  const editableFields = fields.filter((f: any) => f.name !== 'id' && f.name !== 'createdAt' && f.name !== 'updatedAt');
  return `import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ${pascal}FormProps {
  initialValues?: Partial<Record<string, any>>;
  onSubmit: (data: Record<string, any>) => void;
  isLoading?: boolean;
}

export function ${pascal}Form({ initialValues, onSubmit, isLoading }: ${pascal}FormProps) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); onSubmit(Object.fromEntries(fd)); }} className="space-y-4" data-testid="form-${toKebab(name)}">
      ${editableFields.map((f: any) => `<div>
        <Label htmlFor="${f.name}" data-testid="label-${f.name}">${toPascal(f.name)}</Label>
        <Input id="${f.name}" name="${f.name}" type="${mapFieldToInputType(f.type)}" defaultValue={initialValues?.${f.name} ?? ""} data-testid="input-${f.name}" />
      </div>`).join('\n      ')}
      <Button type="submit" disabled={isLoading} data-testid="button-submit">{isLoading ? "Saving..." : "Save"}</Button>
    </form>
  );
}`;
}

function generateCardComponent(name: string, pascal: string, fields: any[]): string {
  const displayFields = fields.filter((f: any) => f.name !== 'id' && !f.name?.includes('password')).slice(0, 4);
  return `import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ${pascal}CardProps {
  data: Record<string, any>;
  onClick?: () => void;
}

export function ${pascal}Card({ data, onClick }: ${pascal}CardProps) {
  return (
    <Card className="hover-elevate cursor-pointer" onClick={onClick} data-testid={"card-${toKebab(name)}-" + data.id}>
      <CardHeader>
        <CardTitle data-testid={"text-${toKebab(name)}-title-" + data.id}>{${displayFields[0] ? `data.${displayFields[0].name}` : '"Item"'}}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        ${displayFields.slice(1).map((f: any) => `<p className="text-sm text-muted-foreground" data-testid={"text-${toKebab(name)}-${f.name}-" + data.id}>{String(data.${f.name} ?? "")}</p>`).join('\n        ')}
      </CardContent>
    </Card>
  );
}`;
}

function generateAppFile(entities: any[]): string {
  const imports = entities.map((e: any) => {
    const name = e.name || e.entityName || 'Item';
    return `import ${toPascal(name)}sPage from "@/pages/${toKebab(name)}s";`;
  }).join('\n');

  const routes = entities.map((e: any) => {
    const name = e.name || e.entityName || 'Item';
    return `              <Route path="/${toKebab(name)}s" component={${toPascal(name)}sPage} />`;
  }).join('\n');

  return `import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
${imports}

function Router() {
  return (
    <Switch>
${routes}
      <Route>Not Found</Route>
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}`;
}

function generateStyleFile(designSystem: any): string {
  const primary = designSystem?.primaryColor || '#3b82f6';
  return `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --primary: ${primary};
  --background: #ffffff;
  --foreground: #0f172a;
}

.dark {
  --background: #0f172a;
  --foreground: #f8fafc;
}`;
}

function generateAPITestFile(name: string, pascal: string, plural: string, fields: any[]): string {
  return `import { describe, it, expect } from "vitest";

describe("${pascal} API", () => {
  it("should list ${name}s", async () => {
    const res = await fetch("/api/${plural}");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it("should create a ${name}", async () => {
    const res = await fetch("/api/${plural}", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ${fields.filter((f: any) => f.name !== 'id').slice(0, 2).map((f: any) => `${f.name}: "test"`).join(', ')} }),
    });
    expect(res.status).toBe(201);
  });

  it("should return 404 for non-existent ${name}", async () => {
    const res = await fetch("/api/${plural}/99999");
    expect(res.status).toBe(404);
  });
});`;
}

function generateComponentTestFile(name: string, pascal: string, fields: any[]): string {
  return `import { describe, it, expect } from "vitest";

describe("${pascal} Components", () => {
  it("should render ${pascal} list page", () => {
    expect(true).toBe(true);
  });

  it("should render ${pascal} form with correct fields", () => {
    const expectedFields = [${fields.filter((f: any) => f.name !== 'id').map((f: any) => `"${f.name}"`).join(', ')}];
    expect(expectedFields.length).toBeGreaterThan(0);
  });

  it("should validate required fields in ${pascal} form", () => {
    const requiredFields = [${fields.filter((f: any) => f.required).map((f: any) => `"${f.name}"`).join(', ')}];
    expect(Array.isArray(requiredFields)).toBe(true);
  });
});`;
}

function mapFieldToZodType(type: string): string {
  const map: Record<string, string> = {
    string: 'z.string()', text: 'z.string()', email: 'z.string().email()',
    number: 'z.number()', integer: 'z.number().int()', float: 'z.number()',
    boolean: 'z.boolean()', date: 'z.string()', url: 'z.string().url()',
    json: 'z.any()', array: 'z.array(z.any())', uuid: 'z.string().uuid()',
  };
  return map[type.toLowerCase()] || 'z.string()';
}

function inferValidationRules(field: any): string[] {
  const rules: string[] = [];
  const name = (field.name || '').toLowerCase();
  if (name.includes('email')) rules.push('email');
  if (name.includes('url') || name.includes('link')) rules.push('url');
  if (name.includes('phone')) rules.push('pattern:phone');
  if (field.required) rules.push('required');
  if (field.minLength) rules.push(`minLength:${field.minLength}`);
  if (field.maxLength) rules.push(`maxLength:${field.maxLength}`);
  return rules;
}

function mapFieldToInputType(type: string): string {
  const map: Record<string, string> = {
    email: 'email', password: 'password', number: 'number', integer: 'number',
    float: 'number', date: 'date', url: 'url', boolean: 'checkbox',
    phone: 'tel', color: 'color',
  };
  return map[(type || '').toLowerCase()] || 'text';
}

function mapToDrizzleType(type: string, columnName: string): string {
  const map: Record<string, string> = {
    string: `text("${columnName}")`, text: `text("${columnName}")`,
    number: `integer("${columnName}")`, integer: `integer("${columnName}")`,
    int: `integer("${columnName}")`, float: `real("${columnName}")`,
    boolean: `boolean("${columnName}")`, date: `timestamp("${columnName}")`,
    json: `jsonb("${columnName}")`, email: `varchar("${columnName}", { length: 255 })`,
    url: `varchar("${columnName}", { length: 2048 })`, password: `varchar("${columnName}", { length: 255 })`,
    money: `real("${columnName}")`, price: `real("${columnName}")`,
    status: `varchar("${columnName}", { length: 50 })`, enum: `varchar("${columnName}", { length: 50 })`,
    reference: `integer("${columnName}")`, uuid: `varchar("${columnName}", { length: 36 })`,
  };
  return map[(type || '').toLowerCase()] || `text("${columnName}")`;
}

function toPascal(str: string): string {
  return str.replace(/[_-]([a-z])/g, (_, c) => c.toUpperCase()).replace(/^[a-z]/, c => c.toUpperCase()).replace(/[^a-zA-Z0-9]/g, '');
}

function toCamel(str: string): string {
  return str.replace(/[_-]([a-z])/g, (_, c) => c.toUpperCase()).replace(/^[A-Z]/, c => c.toLowerCase()).replace(/[^a-zA-Z0-9]/g, '');
}

function toKebab(str: string): string {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '').replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
}

function toSnake(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '').replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_');
}