/**
 * Type Contract Verifier
 *
 * Ensures consistency across the generated type system:
 * - Drizzle schema column definitions match Zod validator schemas
 * - Insert/select type exports match schema table structure
 * - API route request bodies match Zod validation schemas
 * - Frontend query response types align with backend response shapes
 * - Shared types are used consistently on both sides
 */

interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

export interface TypeContractIssue {
  type: 'schema_zod_mismatch' | 'missing_insert_schema' | 'missing_select_type' | 'route_validation_gap' | 'frontend_type_mismatch' | 'missing_shared_type';
  severity: 'error' | 'warning';
  file: string;
  message: string;
  relatedFile?: string;
  entity?: string;
  autoFixable: boolean;
  fix?: { file: string; search: string; replace: string };
}

export interface TypeContractReport {
  issues: TypeContractIssue[];
  fixes: Array<{ file: string; search: string; replace: string; description: string }>;
  stats: {
    tablesChecked: number;
    zodSchemasFound: number;
    routesChecked: number;
    issuesFound: number;
    autoFixed: number;
  };
}

interface SchemaTable {
  name: string;
  varName: string;
  columns: Array<{ name: string; type: string; nullable: boolean; hasDefault: boolean }>;
}

interface ZodSchema {
  name: string;
  basedOn: string;
  omittedFields: string[];
}

function parseSchemaFile(content: string): SchemaTable[] {
  const tables: SchemaTable[] = [];

  const tableRegex = /export\s+const\s+(\w+)\s*=\s*pgTable\s*\(\s*['"`](\w+)['"`]\s*,\s*\{([^}]+)\}/g;
  let match;
  while ((match = tableRegex.exec(content)) !== null) {
    const varName = match[1];
    const tableName = match[2];
    const columnsBlock = match[3];
    const columns: SchemaTable['columns'] = [];

    const colRegex = /(\w+)\s*:\s*([\w.]+)\s*\(([^)]*)\)([^,}]*)/g;
    let colMatch;
    while ((colMatch = colRegex.exec(columnsBlock)) !== null) {
      const colName = colMatch[1];
      const colType = colMatch[2];
      const chain = colMatch[4] || '';
      columns.push({
        name: colName,
        type: colType,
        nullable: !chain.includes('.notNull()'),
        hasDefault: chain.includes('.default(') || chain.includes('.defaultNow(') || colType === 'serial',
      });
    }

    tables.push({ name: tableName, varName, columns });
  }

  return tables;
}

function parseZodSchemas(content: string): ZodSchema[] {
  const schemas: ZodSchema[] = [];

  const zodRegex = /export\s+const\s+(\w+)\s*=\s*createInsertSchema\s*\(\s*(\w+)\s*\)(?:\.omit\s*\(\s*\{([^}]+)\}\s*\))?/g;
  let match;
  while ((match = zodRegex.exec(content)) !== null) {
    const schemaName = match[1];
    const basedOn = match[2];
    const omitBlock = match[3] || '';
    const omittedFields = omitBlock
      .split(',')
      .map(f => f.trim().split(':')[0].trim())
      .filter(Boolean);

    schemas.push({ name: schemaName, basedOn, omittedFields });
  }

  return schemas;
}

function findRouteValidation(files: GeneratedFile[]): Array<{ file: string; method: string; path: string; usesValidation: boolean; validationSchema?: string; line: number }> {
  const routes: Array<{ file: string; method: string; path: string; usesValidation: boolean; validationSchema?: string; line: number }> = [];

  const routeFiles = files.filter(f => f.path.includes('routes') || (f.path.includes('server/') && f.path.endsWith('.ts')));

  for (const file of routeFiles) {
    const lines = file.content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const routeMatch = line.match(/app\.(post|put|patch)\s*\(\s*['"`]([^'"`]+)['"`]/);
      if (!routeMatch) continue;

      const method = routeMatch[1].toUpperCase();
      const path = routeMatch[2];

      let usesValidation = false;
      let validationSchema: string | undefined;

      for (let j = i; j < Math.min(lines.length, i + 30); j++) {
        const bodyLine = lines[j];
        if (/\.parse\s*\(/.test(bodyLine) || /\.safeParse\s*\(/.test(bodyLine)) {
          usesValidation = true;
          const schemaMatch = bodyLine.match(/(\w+)\.(?:safe)?[Pp]arse/);
          if (schemaMatch) validationSchema = schemaMatch[1];
        }
        if (/zodResolver|z\.object|insertSchema|createInsertSchema/.test(bodyLine)) {
          usesValidation = true;
        }
      }

      routes.push({ file: file.path, method, path, usesValidation, validationSchema, line: i + 1 });
    }
  }

  return routes;
}

function checkInsertTypes(content: string, tables: SchemaTable[]): TypeContractIssue[] {
  const issues: TypeContractIssue[] = [];

  for (const table of tables) {
    const insertSchemaPattern = new RegExp(`insert${capitalize(table.varName)}Schema|insert${capitalize(singularize(table.varName))}Schema`);
    if (!insertSchemaPattern.test(content)) {
      issues.push({
        type: 'missing_insert_schema',
        severity: 'warning',
        file: '',
        entity: table.varName,
        message: `Table "${table.varName}" has no corresponding createInsertSchema export`,
        autoFixable: true,
      });
    }

    const selectTypePattern = new RegExp(`${capitalize(singularize(table.varName))}\\s*=\\s*typeof\\s+${table.varName}\\.\\$inferSelect|type\\s+${capitalize(singularize(table.varName))}\\b`);
    if (!selectTypePattern.test(content)) {
      issues.push({
        type: 'missing_select_type',
        severity: 'warning',
        file: '',
        entity: table.varName,
        message: `Table "${table.varName}" has no corresponding select type export ($inferSelect)`,
        autoFixable: true,
      });
    }
  }

  return issues;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function singularize(s: string): string {
  if (s.endsWith('ies')) return s.slice(0, -3) + 'y';
  if (s.endsWith('ses') || s.endsWith('xes') || s.endsWith('zes')) return s.slice(0, -2);
  if (s.endsWith('s') && !s.endsWith('ss')) return s.slice(0, -1);
  return s;
}

export function verifyTypeContracts(files: GeneratedFile[]): TypeContractReport {
  const issues: TypeContractIssue[] = [];
  const fixes: Array<{ file: string; search: string; replace: string; description: string }> = [];
  let tablesChecked = 0;
  let zodSchemasFound = 0;
  let routesChecked = 0;

  const schemaFile = files.find(f =>
    f.path.includes('schema') && (f.path.endsWith('.ts') || f.path.endsWith('.tsx'))
  );

  if (!schemaFile) {
    return {
      issues: [{ type: 'missing_shared_type', severity: 'warning', file: '', message: 'No schema file found — cannot verify type contracts', autoFixable: false }],
      fixes: [],
      stats: { tablesChecked: 0, zodSchemasFound: 0, routesChecked: 0, issuesFound: 1, autoFixed: 0 },
    };
  }

  const tables = parseSchemaFile(schemaFile.content);
  tablesChecked = tables.length;

  const zodSchemas = parseZodSchemas(schemaFile.content);
  zodSchemasFound = zodSchemas.length;

  // 1. Check each table has insert schema and select type
  const insertTypeIssues = checkInsertTypes(schemaFile.content, tables);
  for (const issue of insertTypeIssues) {
    issue.file = schemaFile.path;
    issues.push(issue);
  }

  // 2. Check Zod schemas reference existing tables
  for (const schema of zodSchemas) {
    const table = tables.find(t => t.varName === schema.basedOn);
    if (!table) {
      issues.push({
        type: 'schema_zod_mismatch',
        severity: 'error',
        file: schemaFile.path,
        entity: schema.basedOn,
        message: `Zod schema "${schema.name}" references table "${schema.basedOn}" which doesn't exist`,
        autoFixable: false,
      });
      continue;
    }

    for (const omitted of schema.omittedFields) {
      if (!table.columns.find(c => c.name === omitted)) {
        issues.push({
          type: 'schema_zod_mismatch',
          severity: 'warning',
          file: schemaFile.path,
          entity: schema.basedOn,
          message: `Zod schema "${schema.name}" omits field "${omitted}" which doesn't exist in table "${table.varName}"`,
          autoFixable: true,
          fix: {
            file: schemaFile.path,
            search: `${omitted}: true`,
            replace: '',
          },
        });
      }
    }

    for (const col of table.columns) {
      if (col.hasDefault && !schema.omittedFields.includes(col.name)) {
        if (col.name === 'id' || col.name === 'createdAt' || col.name === 'updatedAt') {
          issues.push({
            type: 'schema_zod_mismatch',
            severity: 'warning',
            file: schemaFile.path,
            entity: schema.basedOn,
            message: `Auto-generated field "${col.name}" in table "${table.varName}" is not omitted from insert schema "${schema.name}"`,
            autoFixable: false,
          });
        }
      }
    }
  }

  // 3. Check write routes use validation
  const routeValidation = findRouteValidation(files);
  routesChecked = routeValidation.length;

  for (const route of routeValidation) {
    if (!route.usesValidation) {
      issues.push({
        type: 'route_validation_gap',
        severity: 'warning',
        file: route.file,
        message: `${route.method} ${route.path} accepts request body without Zod validation — unsafe user input`,
        autoFixable: false,
      });
    }
  }

  // 4. Check frontend files reference shared types
  const frontendFiles = files.filter(f => f.path.endsWith('.tsx') || (f.path.endsWith('.ts') && f.path.includes('client/')));
  for (const file of frontendFiles) {
    for (const table of tables) {
      const entityName = capitalize(singularize(table.varName));
      const regex = new RegExp(`\\b${entityName}\\b`);
      if (regex.test(file.content)) {
        const importsShared = file.content.includes('@shared') || file.content.includes('../shared') || file.content.includes('./shared');
        if (!importsShared && !file.content.includes(`interface ${entityName}`) && !file.content.includes(`type ${entityName}`)) {
          issues.push({
            type: 'frontend_type_mismatch',
            severity: 'warning',
            file: file.path,
            entity: entityName,
            message: `Component references type "${entityName}" but doesn't import from shared schema — may have local type definition that drifts`,
            autoFixable: false,
          });
        }
      }
    }
  }

  return {
    issues,
    fixes,
    stats: {
      tablesChecked,
      zodSchemasFound,
      routesChecked,
      issuesFound: issues.length,
      autoFixed: fixes.length,
    },
  };
}