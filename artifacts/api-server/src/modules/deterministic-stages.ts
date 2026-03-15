import { localAI } from './local-ai-engine.js';
import type { FeatureGraphData, GraphConflict, RuleResult } from './local-ai-engine.js';
import { templateRegistry } from './template-registry.js';

export interface ConstraintAnalysis {
  constraints: ConstraintRule[];
  satisfiedCount: number;
  violationCount: number;
  riskScore: number;
  recommendations: string[];
}

export interface ConstraintRule {
  id: string;
  name: string;
  type: 'memory' | 'performance' | 'security' | 'compatibility' | 'complexity' | 'data';
  severity: 'critical' | 'warning' | 'info';
  satisfied: boolean;
  details: string;
  mitigation?: string;
}

export interface FeatureInteractionResult {
  graph: FeatureGraphData;
  cycles: string[][];
  conflicts: GraphConflict[];
  buildOrder: string[];
  riskAreas: string[];
  simplifications: string[];
}

export interface DatabaseIntelligence {
  tables: TableSpec[];
  indexes: IndexRecommendation[];
  relationships: RelationshipSpec[];
  migrations: MigrationStep[];
  estimatedSize: string;
  optimizations: string[];
}

export interface TableSpec {
  name: string;
  columns: ColumnSpec[];
  primaryKey: string;
  timestamps: boolean;
  softDelete: boolean;
}

export interface ColumnSpec {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  unique?: boolean;
  references?: { table: string; column: string };
}

export interface IndexRecommendation {
  table: string;
  columns: string[];
  type: 'btree' | 'hash' | 'gin' | 'gist';
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

export interface RelationshipSpec {
  from: string;
  to: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  foreignKey: string;
  onDelete: 'cascade' | 'set null' | 'restrict';
  junctionTable?: string;
}

export interface MigrationStep {
  order: number;
  sql: string;
  description: string;
  reversible: boolean;
}

export interface ComponentMap {
  components: MappedComponent[];
  sharedComponents: string[];
  layoutTree: LayoutNode;
  renderCostEstimate: number;
  optimizations: string[];
}

export interface MappedComponent {
  name: string;
  type: 'page' | 'layout' | 'container' | 'presentational' | 'form' | 'list' | 'detail' | 'modal' | 'widget';
  entity?: string;
  props: string[];
  children: string[];
  renderWeight: number;
  memoizable: boolean;
}

export interface LayoutNode {
  name: string;
  type: string;
  children: LayoutNode[];
  weight: number;
}

export interface DependencyAnalysis {
  dependencies: DependencyEntry[];
  devDependencies: DependencyEntry[];
  totalBundleSize: number;
  treeShakenSize: number;
  duplicates: string[];
  securityFlags: string[];
  alternatives: DependencyAlternative[];
}

export interface DependencyEntry {
  name: string;
  version: string;
  size: number;
  treeShakeable: boolean;
  category: 'core' | 'ui' | 'state' | 'utility' | 'dev' | 'build';
}

export interface DependencyAlternative {
  current: string;
  alternative: string;
  reason: string;
  sizeSaving: number;
}

export interface StaticAuditReport {
  score: number;
  grade: string;
  categories: AuditCategory[];
  issues: AuditIssue[];
  fixes: AuditFix[];
  summary: string;
}

export interface AuditCategory {
  name: string;
  score: number;
  maxScore: number;
  issues: number;
}

export interface AuditIssue {
  file: string;
  line?: number;
  category: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  rule: string;
}

export interface AuditFix {
  file: string;
  description: string;
  before: string;
  after: string;
  auto: boolean;
}

const TYPE_MAP: Record<string, string> = {
  string: 'text',
  text: 'text',
  number: 'integer',
  integer: 'integer',
  int: 'integer',
  float: 'real',
  double: 'real',
  decimal: 'numeric',
  boolean: 'boolean',
  bool: 'boolean',
  date: 'timestamp',
  datetime: 'timestamp',
  timestamp: 'timestamp',
  json: 'jsonb',
  object: 'jsonb',
  array: 'jsonb',
  uuid: 'uuid',
  email: 'varchar(255)',
  url: 'varchar(2048)',
  phone: 'varchar(20)',
  image: 'varchar(2048)',
  file: 'varchar(2048)',
  password: 'varchar(255)',
  money: 'numeric(12,2)',
  price: 'numeric(12,2)',
  currency: 'numeric(12,2)',
  percent: 'numeric(5,2)',
  rating: 'integer',
  color: 'varchar(7)',
  slug: 'varchar(255)',
  status: 'varchar(50)',
  enum: 'varchar(50)',
  reference: 'integer',
  foreignKey: 'integer',
};

const TIMESTAMP_FIELDS = ['createdAt', 'updatedAt', 'created_at', 'updated_at', 'deletedAt', 'deleted_at'];
const SOFT_DELETE_FIELDS = ['deletedAt', 'deleted_at', 'isDeleted', 'is_deleted'];

const BUNDLE_SIZES: Record<string, number> = {
  react: 42, 'react-dom': 130, 'react-router-dom': 28,
  wouter: 3, '@tanstack/react-query': 39, zustand: 3,
  'framer-motion': 105, recharts: 165, 'chart.js': 65,
  tailwindcss: 0, axios: 13, zod: 12,
  'date-fns': 75, dayjs: 7, moment: 290,
  lodash: 72, 'lodash-es': 72, underscore: 24,
  express: 0, 'drizzle-orm': 0, prisma: 0,
  '@radix-ui/react-dialog': 15, '@radix-ui/react-select': 18,
  '@radix-ui/react-dropdown-menu': 16, '@radix-ui/react-tooltip': 8,
  '@radix-ui/react-tabs': 6, '@radix-ui/react-accordion': 8,
  'lucide-react': 0, '@heroicons/react': 0,
  '@hookform/resolvers': 3, 'react-hook-form': 25,
  uuid: 4, nanoid: 1, clsx: 1,
  'class-variance-authority': 2, 'tailwind-merge': 5,
};

const SECURITY_PATTERNS: Array<{ pattern: RegExp; message: string; severity: 'error' | 'warning' }> = [
  { pattern: /eval\s*\(/, message: 'Use of eval() is a security risk', severity: 'error' },
  { pattern: /innerHTML\s*=/, message: 'Direct innerHTML assignment risks XSS', severity: 'error' },
  { pattern: /dangerouslySetInnerHTML/, message: 'dangerouslySetInnerHTML requires sanitization', severity: 'warning' },
  { pattern: /document\.write/, message: 'document.write is deprecated and insecure', severity: 'error' },
  { pattern: /password.*=\s*['"][^'"]+['"]/, message: 'Hardcoded password detected', severity: 'error' },
  { pattern: /api[_-]?key.*=\s*['"][^'"]+['"]/, message: 'Hardcoded API key detected', severity: 'error' },
  { pattern: /console\.log\(.*password/i, message: 'Logging sensitive data', severity: 'warning' },
  { pattern: /localStorage\.setItem\(.*token/i, message: 'Storing tokens in localStorage is risky', severity: 'warning' },
];

const REACT_PATTERNS: Array<{ pattern: RegExp; message: string; severity: 'error' | 'warning' }> = [
  { pattern: /useEffect\(\s*\(\)\s*=>\s*\{[^}]*fetch/s, message: 'Use TanStack Query instead of fetch in useEffect', severity: 'warning' },
  { pattern: /useState\(.*\)\s*;.*useState\(.*\)\s*;.*useState\(.*\)\s*;.*useState\(.*\)\s*;/s, message: 'Too many useState calls; consider useReducer', severity: 'info' },
  { pattern: /\.map\(\s*\([^)]*\)\s*=>\s*<[^>]+>\s*\)(?!\s*\.filter)/s, message: 'Missing key prop on mapped elements check', severity: 'warning' },
  { pattern: /import\s+React\s+from\s+['"]react['"]/, message: 'React import not needed with JSX transform', severity: 'info' },
];

export function analyzeConstraints(
  entities: any[],
  features: any[],
  targetRAM: number = 16384
): ConstraintAnalysis {
  const constraints: ConstraintRule[] = [];
  const entityCount = entities?.length || 0;
  const featureCount = features?.length || 0;

  const estimatedMemoryMB = entityCount * 2 + featureCount * 5 + 200;
  constraints.push({
    id: 'mem-001',
    name: 'RAM Budget',
    type: 'memory',
    severity: estimatedMemoryMB > targetRAM * 0.8 ? 'critical' : estimatedMemoryMB > targetRAM * 0.5 ? 'warning' : 'info',
    satisfied: estimatedMemoryMB <= targetRAM,
    details: `Estimated ${estimatedMemoryMB}MB of ${targetRAM}MB available`,
    mitigation: estimatedMemoryMB > targetRAM ? 'Reduce entity count or use pagination for large datasets' : undefined,
  });

  const totalFields = entities?.reduce((sum: number, e: any) => sum + (e.fields?.length || 0), 0) || 0;
  constraints.push({
    id: 'cplx-001',
    name: 'Schema Complexity',
    type: 'complexity',
    severity: totalFields > 200 ? 'critical' : totalFields > 100 ? 'warning' : 'info',
    satisfied: totalFields <= 200,
    details: `${totalFields} total fields across ${entityCount} entities`,
    mitigation: totalFields > 200 ? 'Consider splitting large entities into related sub-entities' : undefined,
  });

  const hasAuth = features?.some((f: any) =>
    typeof f === 'string' ? f.includes('auth') : f.name?.includes('auth') || f.type?.includes('auth')
  );
  constraints.push({
    id: 'sec-001',
    name: 'Authentication Required',
    type: 'security',
    severity: hasAuth ? 'info' : 'warning',
    satisfied: true,
    details: hasAuth ? 'Authentication feature detected' : 'No authentication feature detected - consider adding one',
    mitigation: !hasAuth ? 'Add user authentication for data protection' : undefined,
  });

  const hasFileUpload = features?.some((f: any) =>
    typeof f === 'string' ? f.includes('upload') || f.includes('file') :
    f.name?.includes('upload') || f.name?.includes('file')
  );
  if (hasFileUpload) {
    constraints.push({
      id: 'perf-001',
      name: 'File Upload Size',
      type: 'performance',
      severity: 'warning',
      satisfied: true,
      details: 'File upload detected - ensure proper size limits and streaming',
      mitigation: 'Set max file size to 10MB and use multer with disk storage',
    });
  }

  const relationships = entities?.reduce((count: number, e: any) => {
    return count + (e.fields?.filter((f: any) => f.type === 'reference' || f.type === 'foreignKey' || f.references)?.length || 0);
  }, 0) || 0;
  if (relationships > entityCount * 3) {
    constraints.push({
      id: 'cplx-002',
      name: 'Relationship Density',
      type: 'complexity',
      severity: 'warning',
      satisfied: false,
      details: `${relationships} relationships for ${entityCount} entities is high density`,
      mitigation: 'Review relationships for unnecessary coupling',
    });
  }

  const hasRealtime = features?.some((f: any) =>
    typeof f === 'string' ? f.includes('realtime') || f.includes('websocket') || f.includes('chat') :
    f.name?.includes('realtime') || f.name?.includes('websocket') || f.name?.includes('chat')
  );
  if (hasRealtime) {
    constraints.push({
      id: 'perf-002',
      name: 'WebSocket Connections',
      type: 'performance',
      severity: 'warning',
      satisfied: true,
      details: 'Real-time features detected - monitor WebSocket connection count',
      mitigation: 'Limit concurrent connections and implement heartbeat',
    });
  }

  constraints.push({
    id: 'compat-001',
    name: 'Node.js Compatibility',
    type: 'compatibility',
    severity: 'info',
    satisfied: true,
    details: 'Target: Node.js 18+ with ESM modules',
  });

  constraints.push({
    id: 'data-001',
    name: 'Database Capacity',
    type: 'data',
    severity: entityCount > 20 ? 'warning' : 'info',
    satisfied: entityCount <= 50,
    details: `${entityCount} tables planned for PostgreSQL`,
    mitigation: entityCount > 20 ? 'Consider table partitioning for large datasets' : undefined,
  });

  const satisfied = constraints.filter(c => c.satisfied).length;
  const violations = constraints.filter(c => !c.satisfied).length;
  const riskScore = constraints.reduce((sum, c) => {
    if (!c.satisfied) {
      return sum + (c.severity === 'critical' ? 30 : c.severity === 'warning' ? 15 : 5);
    }
    return sum;
  }, 0);

  const recommendations: string[] = [];
  if (riskScore > 50) recommendations.push('High risk score - review critical constraints before proceeding');
  if (entityCount > 15) recommendations.push('Consider implementing lazy loading for entity pages');
  if (totalFields > 100) recommendations.push('Add field-level validation to prevent data quality issues');
  if (!hasAuth) recommendations.push('Add authentication to protect user data');

  return {
    constraints,
    satisfiedCount: satisfied,
    violationCount: violations,
    riskScore: Math.min(100, riskScore),
    recommendations,
  };
}

export function analyzeFeatureInteractions(
  entities: any[],
  relationships: any[]
): FeatureInteractionResult {
  const graph = localAI.buildFeatureGraph(entities || [], relationships || []);
  const cycles = localAI.detectCycles(graph);
  const conflicts = localAI.detectConflicts(graph);
  const buildOrder = localAI.topologicalSort(graph);

  const riskAreas: string[] = [];
  const simplifications: string[] = [];

  if (cycles.length > 0) {
    riskAreas.push(`${cycles.length} circular dependency cycle(s) detected`);
    for (const cycle of cycles) {
      riskAreas.push(`Cycle: ${cycle.join(' -> ')} -> ${cycle[0]}`);
      simplifications.push(`Break cycle by extracting shared logic from ${cycle[0]} and ${cycle[cycle.length - 1]} into a common module`);
    }
  }

  if (conflicts.length > 0) {
    for (const conflict of conflicts) {
      riskAreas.push(`Conflict between ${conflict.nodeA} and ${conflict.nodeB}: ${conflict.reason}`);
    }
  }

  const nodesArray = Array.from(graph.nodes.values());
  const highDegreeNodes = nodesArray.filter(n => {
    const inDegree = graph.edges.filter(e => e.target === n.id).length;
    const outDegree = graph.edges.filter(e => e.source === n.id).length;
    return inDegree + outDegree > 5;
  });
  if (highDegreeNodes.length > 0) {
    riskAreas.push(`${highDegreeNodes.length} highly connected entity/entities detected: ${highDegreeNodes.map(n => n.id).join(', ')}`);
    simplifications.push('Consider introducing an intermediary service layer for highly connected entities');
  }

  const isolatedNodes = nodesArray.filter(n =>
    !graph.edges.some(e => e.source === n.id || e.target === n.id)
  );
  if (isolatedNodes.length > 0) {
    simplifications.push(`${isolatedNodes.length} isolated entity/entities with no relationships: ${isolatedNodes.map(n => n.id).join(', ')}`);
  }

  return { graph, cycles, conflicts, buildOrder, riskAreas, simplifications };
}

export function generateDatabaseIntelligence(
  entities: any[],
  relationships: any[]
): DatabaseIntelligence {
  const tables: TableSpec[] = [];
  const indexes: IndexRecommendation[] = [];
  const relSpecs: RelationshipSpec[] = [];
  const migrations: MigrationStep[] = [];

  for (const entity of (entities || [])) {
    const entityName = entity.name || entity.entityName || 'unknown';
    const tableName = toSnakeCase(entityName);
    const fields = entity.fields || entity.columns || [];

    const hasTimestamps = fields.some((f: any) => TIMESTAMP_FIELDS.includes(f.name));
    const hasSoftDelete = fields.some((f: any) => SOFT_DELETE_FIELDS.includes(f.name));

    const columns: ColumnSpec[] = [
      { name: 'id', type: 'serial', nullable: false, unique: true },
    ];

    for (const field of fields) {
      const fieldName = toSnakeCase(field.name || 'unknown');
      if (fieldName === 'id') continue;

      const rawType = (field.type || field.dataType || 'text').toLowerCase();
      const pgType = TYPE_MAP[rawType] || 'text';
      const isNullable = field.nullable !== false && field.required !== true;

      const col: ColumnSpec = {
        name: fieldName,
        type: pgType,
        nullable: isNullable,
      };

      if (field.default !== undefined) col.defaultValue = String(field.default);
      if (field.unique) col.unique = true;

      if (field.references || field.ref || field.foreignKey) {
        const refTable = field.references?.table || field.ref || field.foreignKey;
        col.references = { table: toSnakeCase(refTable), column: 'id' };
        col.type = 'integer';
      }

      columns.push(col);
    }

    if (!hasTimestamps) {
      columns.push({ name: 'created_at', type: 'timestamp', nullable: false, defaultValue: 'now()' });
      columns.push({ name: 'updated_at', type: 'timestamp', nullable: false, defaultValue: 'now()' });
    }

    tables.push({
      name: tableName,
      columns,
      primaryKey: 'id',
      timestamps: true,
      softDelete: hasSoftDelete,
    });

    const foreignKeyColumns = columns.filter(c => c.references);
    for (const fkCol of foreignKeyColumns) {
      indexes.push({
        table: tableName,
        columns: [fkCol.name],
        type: 'btree',
        reason: `Foreign key lookup on ${fkCol.name}`,
        priority: 'high',
      });
    }

    const statusColumns = columns.filter(c => c.name.includes('status') || c.name.includes('type') || c.name.includes('category'));
    for (const sc of statusColumns) {
      indexes.push({
        table: tableName,
        columns: [sc.name],
        type: 'btree',
        reason: `Frequently filtered column: ${sc.name}`,
        priority: 'medium',
      });
    }

    const emailColumns = columns.filter(c => c.name.includes('email'));
    for (const ec of emailColumns) {
      indexes.push({
        table: tableName,
        columns: [ec.name],
        type: 'btree',
        reason: `Unique lookup on ${ec.name}`,
        priority: 'high',
      });
    }

    const textSearchColumns = columns.filter(c =>
      (c.type === 'text' || c.type.startsWith('varchar')) &&
      (c.name.includes('name') || c.name.includes('title') || c.name.includes('description'))
    );
    if (textSearchColumns.length > 0) {
      indexes.push({
        table: tableName,
        columns: textSearchColumns.map(c => c.name),
        type: 'gin',
        reason: `Full-text search on ${textSearchColumns.map(c => c.name).join(', ')}`,
        priority: 'low',
      });
    }
  }

  for (const rel of (relationships || [])) {
    const from = toSnakeCase(rel.from || rel.source || '');
    const to = toSnakeCase(rel.to || rel.target || '');
    const cardinality = rel.cardinality || rel.type || 'one-to-many';

    if (cardinality === 'many-to-many') {
      const junctionName = `${from}_${to}`;
      relSpecs.push({
        from, to, type: 'many-to-many',
        foreignKey: `${from}_id`,
        onDelete: 'cascade',
        junctionTable: junctionName,
      });

      tables.push({
        name: junctionName,
        columns: [
          { name: 'id', type: 'serial', nullable: false, unique: true },
          { name: `${from}_id`, type: 'integer', nullable: false, references: { table: from, column: 'id' } },
          { name: `${to}_id`, type: 'integer', nullable: false, references: { table: to, column: 'id' } },
          { name: 'created_at', type: 'timestamp', nullable: false, defaultValue: 'now()' },
        ],
        primaryKey: 'id',
        timestamps: true,
        softDelete: false,
      });
    } else {
      relSpecs.push({
        from, to,
        type: cardinality as 'one-to-one' | 'one-to-many',
        foreignKey: `${to}_id`,
        onDelete: rel.onDelete || 'set null',
      });
    }
  }

  let migrationOrder = 0;
  const sortedTables = sortTablesByDependency(tables);
  for (const table of sortedTables) {
    const columnDefs = table.columns.map(c => {
      let def = `"${c.name}" ${c.type}`;
      if (c.name === 'id' && c.type === 'serial') def += ' PRIMARY KEY';
      if (!c.nullable && c.name !== 'id') def += ' NOT NULL';
      if (c.unique && c.name !== 'id') def += ' UNIQUE';
      if (c.defaultValue) def += ` DEFAULT ${c.defaultValue}`;
      if (c.references) def += ` REFERENCES "${c.references.table}"("${c.references.column}")`;
      return def;
    }).join(',\n  ');

    migrations.push({
      order: ++migrationOrder,
      sql: `CREATE TABLE IF NOT EXISTS "${table.name}" (\n  ${columnDefs}\n);`,
      description: `Create ${table.name} table`,
      reversible: true,
    });
  }

  for (const idx of indexes) {
    const idxName = `idx_${idx.table}_${idx.columns.join('_')}`;
    const using = idx.type !== 'btree' ? ` USING ${idx.type}` : '';
    migrations.push({
      order: ++migrationOrder,
      sql: `CREATE INDEX IF NOT EXISTS "${idxName}" ON "${idx.table}"${using} (${idx.columns.map(c => `"${c}"`).join(', ')});`,
      description: `Add ${idx.type} index on ${idx.table}(${idx.columns.join(', ')})`,
      reversible: true,
    });
  }

  const totalColumns = tables.reduce((sum, t) => sum + t.columns.length, 0);
  const estimatedRows = tables.length * 1000;
  const avgRowSize = (totalColumns * 50) / tables.length;
  const estimatedSizeMB = Math.ceil((estimatedRows * avgRowSize) / (1024 * 1024));

  const optimizations: string[] = [];
  if (tables.length > 10) optimizations.push('Consider connection pooling with pg-pool for many tables');
  if (indexes.length > tables.length * 3) optimizations.push('High index count may slow writes - review low-priority indexes');
  const textColumns = tables.flatMap(t => t.columns).filter(c => c.type === 'text');
  if (textColumns.length > 5) optimizations.push('Consider text length constraints (varchar) instead of unlimited text for validation');

  const schemaMatches = templateRegistry.findSchemaTemplates(
    (entities || []).map((e: any) => e.name || e.entityName || ''),
    (entities || []).flatMap((e: any) => (e.fields || []).map((f: any) => f.name || '')),
    5
  );
  for (const template of schemaMatches) {
    for (const tplTable of template.tables) {
      const existingTable = tables.find(t => t.name === tplTable.name);
      if (!existingTable) {
        const tplColumns: ColumnSpec[] = tplTable.columns.map(c => ({
          name: c.name,
          type: c.type,
          nullable: !(c.constraints || []).some((ct: string) => ct.includes('NOT NULL')),
          unique: (c.constraints || []).some((ct: string) => ct.includes('UNIQUE')),
          defaultValue: (c.constraints || []).find((ct: string) => ct.includes('DEFAULT'))?.replace('DEFAULT ', ''),
        }));
        tables.push({
          name: tplTable.name,
          columns: tplColumns,
          primaryKey: tplColumns.find(c => (tplTable.columns.find(tc => tc.name === c.name)?.constraints || []).some((ct: string) => ct.includes('PRIMARY KEY')))?.name || 'id',
          timestamps: tplColumns.some(c => c.name === 'created_at' || c.name === 'updated_at'),
          softDelete: tplColumns.some(c => c.name === 'deleted_at'),
        });
      }
      if (tplTable.indexes) {
        for (const idxStr of tplTable.indexes) {
          const idxMatch = idxStr.match(/ON\s+\w+\(([^)]+)\)/);
          if (idxMatch) {
            const idxCols = idxMatch[1].split(',').map((s: string) => s.trim());
            indexes.push({
              table: tplTable.name,
              columns: idxCols,
              type: 'btree',
              reason: `Template index from ${template.name}`,
              priority: 'medium',
            });
          }
        }
      }
      if (tplTable.foreignKeys) {
        for (const fk of tplTable.foreignKeys) {
          const refMatch = fk.references.match(/^(\w+)\((\w+)\)$/);
          if (refMatch) {
            const existingRel = relSpecs.find(r => r.from === tplTable.name && r.to === refMatch[1]);
            if (!existingRel) {
              relSpecs.push({
                from: tplTable.name,
                to: refMatch[1],
                type: 'one-to-many',
                foreignKey: fk.column,
                onDelete: 'cascade',
              });
            }
          }
        }
      }
    }
    optimizations.push(`Template: ${template.name} - ${template.description}`);
  }

  return {
    tables,
    indexes,
    relationships: relSpecs,
    migrations,
    estimatedSize: `~${estimatedSizeMB}MB for 1K rows per table`,
    optimizations,
  };
}

export function mapComponents(
  entities: any[],
  pages: any[],
  designSystem: any
): ComponentMap {
  const components: MappedComponent[] = [];
  const sharedComponents: string[] = ['Layout', 'Header', 'Footer', 'ErrorBoundary', 'LoadingSpinner', 'EmptyState'];

  const rootLayout: LayoutNode = {
    name: 'AppLayout',
    type: 'layout',
    children: [],
    weight: 1,
  };

  const headerNode: LayoutNode = { name: 'Header', type: 'layout', children: [], weight: 1 };
  const mainNode: LayoutNode = { name: 'MainContent', type: 'container', children: [], weight: 3 };
  rootLayout.children.push(headerNode, mainNode);

  components.push({
    name: 'AppLayout',
    type: 'layout',
    props: ['children'],
    children: ['Header', 'MainContent', 'Footer'],
    renderWeight: 1,
    memoizable: false,
  });

  components.push({
    name: 'Header',
    type: 'layout',
    props: ['title', 'navigation'],
    children: ['NavMenu', 'UserMenu'],
    renderWeight: 1,
    memoizable: true,
  });

  for (const entity of (entities || [])) {
    const name = entity.name || entity.entityName || 'Item';
    const pascal = toPascalCase(name);
    const fields = entity.fields || entity.columns || [];
    const fieldNames = fields.map((f: any) => f.name || 'field');

    components.push({
      name: `${pascal}List`,
      type: 'list',
      entity: name,
      props: ['items', 'onSelect', 'onDelete', 'filters'],
      children: [`${pascal}Card`],
      renderWeight: fields.length * 2,
      memoizable: true,
    });

    components.push({
      name: `${pascal}Card`,
      type: 'presentational',
      entity: name,
      props: fieldNames.concat(['onClick']),
      children: [],
      renderWeight: fields.length,
      memoizable: true,
    });

    components.push({
      name: `${pascal}Form`,
      type: 'form',
      entity: name,
      props: ['initialValues', 'onSubmit', 'isLoading'],
      children: fieldNames.map((f: string) => `FormField_${f}`),
      renderWeight: fields.length * 3,
      memoizable: false,
    });

    components.push({
      name: `${pascal}Detail`,
      type: 'detail',
      entity: name,
      props: ['id', 'data', 'onEdit', 'onDelete'],
      children: [`${pascal}Card`],
      renderWeight: fields.length * 2,
      memoizable: true,
    });

    const pageNode: LayoutNode = {
      name: `${pascal}Page`,
      type: 'page',
      children: [
        { name: `${pascal}List`, type: 'list', children: [], weight: fields.length * 2 },
        { name: `${pascal}Form`, type: 'form', children: [], weight: fields.length * 3 },
      ],
      weight: fields.length * 5,
    };
    mainNode.children.push(pageNode);

    sharedComponents.push(`${pascal}Card`);
  }

  for (const page of (pages || [])) {
    const pageName = page.name || page.pageName || 'Page';
    const pascal = toPascalCase(pageName);

    if (!components.find(c => c.name === pascal)) {
      components.push({
        name: pascal,
        type: 'page',
        props: [],
        children: page.components || [],
        renderWeight: 5,
        memoizable: false,
      });
    }
  }

  const hasDashboard = pages?.some((p: any) =>
    (p.name || '').toLowerCase().includes('dashboard')
  );
  if (hasDashboard) {
    sharedComponents.push('StatCard', 'Chart', 'RecentActivity');
    components.push({
      name: 'StatCard',
      type: 'widget',
      props: ['title', 'value', 'change', 'icon'],
      children: [],
      renderWeight: 2,
      memoizable: true,
    });
  }

  if (entities?.length > 3) {
    sharedComponents.push('DataTable', 'SearchBar', 'Pagination', 'FilterPanel');
  }

  const uiMatches = templateRegistry.findUIComponents([], (entities || []).map((e: any) => e.name || e.entityName || ''), 8);
  for (const uiTpl of uiMatches) {
    if (!components.find(c => c.name === uiTpl.name)) {
      components.push({
        name: uiTpl.name,
        type: 'presentational',
        props: uiTpl.props.map(p => p.name),
        children: [],
        renderWeight: 1,
        memoizable: true,
      });
    }
    if (!sharedComponents.includes(uiTpl.name)) {
      sharedComponents.push(uiTpl.name);
    }
  }

  const totalRenderWeight = components.reduce((sum, c) => sum + c.renderWeight, 0);
  const optimizations: string[] = [];
  const memoizableCount = components.filter(c => c.memoizable).length;
  if (memoizableCount > 0) optimizations.push(`${memoizableCount} components marked for React.memo optimization`);

  const heavyComponents = components.filter(c => c.renderWeight > 20);
  if (heavyComponents.length > 0) {
    optimizations.push(`${heavyComponents.length} heavy component(s): ${heavyComponents.map(c => c.name).join(', ')} - consider virtualization`);
  }

  if (components.length > 20) optimizations.push('Consider code splitting with React.lazy for page components');

  return {
    components,
    sharedComponents: [...new Set(sharedComponents)],
    layoutTree: rootLayout,
    renderCostEstimate: totalRenderWeight,
    optimizations,
  };
}

export function optimizeDependencies(
  files: Array<{ path: string; content: string }>,
  existingDeps?: Record<string, string>
): DependencyAnalysis {
  const importMap = new Map<string, number>();

  for (const file of (files || [])) {
    const content = file.content || '';
    const importMatches = content.matchAll(/import\s+(?:[\s\S]*?)\s+from\s+['"]([^.][^'"]*)['"]/g);
    for (const match of importMatches) {
      const pkg = match[1].startsWith('@') ? match[1].split('/').slice(0, 2).join('/') : match[1].split('/')[0];
      importMap.set(pkg, (importMap.get(pkg) || 0) + 1);
    }

    const requireMatches = content.matchAll(/require\(['"]([^.][^'"]*)['"]\)/g);
    for (const match of requireMatches) {
      const pkg = match[1].startsWith('@') ? match[1].split('/').slice(0, 2).join('/') : match[1].split('/')[0];
      importMap.set(pkg, (importMap.get(pkg) || 0) + 1);
    }
  }

  const dependencies: DependencyEntry[] = [];
  const devDependencies: DependencyEntry[] = [];
  const duplicates: string[] = [];
  const securityFlags: string[] = [];
  const alternatives: DependencyAlternative[] = [];
  let totalBundleSize = 0;
  let treeShakenSize = 0;

  const devPackages = new Set(['vitest', '@testing-library/react', '@types/', 'typescript', 'eslint', 'prettier', 'postcss', 'autoprefixer', 'tailwindcss', 'vite', '@vitejs/']);

  for (const [pkg, usageCount] of importMap) {
    const isDev = [...devPackages].some(dp => pkg.startsWith(dp));
    const size = BUNDLE_SIZES[pkg] || 10;
    const treeShakeable = !['moment', 'lodash'].includes(pkg);
    const actualSize = treeShakeable ? Math.ceil(size * Math.min(usageCount * 0.2, 1)) : size;

    const category = categorizePackage(pkg);
    const version = existingDeps?.[pkg] || 'latest';

    const entry: DependencyEntry = { name: pkg, version, size: actualSize, treeShakeable, category };

    if (isDev) {
      devDependencies.push(entry);
    } else {
      dependencies.push(entry);
      totalBundleSize += size;
      treeShakenSize += actualSize;
    }
  }

  if (importMap.has('moment') && !importMap.has('dayjs')) {
    alternatives.push({
      current: 'moment',
      alternative: 'dayjs',
      reason: 'dayjs is 97% smaller with similar API',
      sizeSaving: 283,
    });
  }

  if (importMap.has('lodash') && !importMap.has('lodash-es')) {
    alternatives.push({
      current: 'lodash',
      alternative: 'lodash-es',
      reason: 'lodash-es supports tree-shaking for smaller bundles',
      sizeSaving: Math.ceil(72 * 0.7),
    });
  }

  if (importMap.has('axios') && importMap.has('ky')) {
    duplicates.push('axios and ky both handle HTTP requests');
  }
  if (importMap.has('date-fns') && importMap.has('dayjs')) {
    duplicates.push('date-fns and dayjs both handle date operations');
  }

  const depSnippets = templateRegistry.findCodeSnippets([], ['dependency', 'optimization', 'bundle'], 3);
  for (const snippet of depSnippets) {
    for (const depName of snippet.dependencies) {
      if (!dependencies.find(d => d.name === depName) && !devDependencies.find(d => d.name === depName)) {
        const size = BUNDLE_SIZES[depName] || 10;
        dependencies.push({
          name: depName,
          version: 'latest',
          size,
          treeShakeable: true,
          category: categorizePackage(depName),
        });
        totalBundleSize += size;
        treeShakenSize += size;
      }
    }
  }

  return {
    dependencies,
    devDependencies,
    totalBundleSize,
    treeShakenSize,
    duplicates,
    securityFlags,
    alternatives,
  };
}

export function runStaticAudit(
  files: Array<{ path: string; content: string }>
): StaticAuditReport {
  const issues: AuditIssue[] = [];
  const fixes: AuditFix[] = [];
  const categoryScores: Record<string, { score: number; max: number; issues: number }> = {
    'TypeScript': { score: 100, max: 100, issues: 0 },
    'React Patterns': { score: 100, max: 100, issues: 0 },
    'Error Handling': { score: 100, max: 100, issues: 0 },
    'Security': { score: 100, max: 100, issues: 0 },
    'Performance': { score: 100, max: 100, issues: 0 },
    'Accessibility': { score: 100, max: 100, issues: 0 },
    'Code Style': { score: 100, max: 100, issues: 0 },
    'UI States': { score: 100, max: 100, issues: 0 },
  };

  for (const file of (files || [])) {
    const content = file.content || '';
    const lines = content.split('\n');
    const isReactFile = file.path.endsWith('.tsx') || file.path.endsWith('.jsx');
    const isTypeScript = file.path.endsWith('.ts') || file.path.endsWith('.tsx');

    for (const { pattern, message, severity } of SECURITY_PATTERNS) {
      const match = content.match(pattern);
      if (match) {
        const lineNum = content.substring(0, match.index).split('\n').length;
        issues.push({ file: file.path, line: lineNum, category: 'Security', severity, message, rule: 'security-check' });
        categoryScores['Security'].score -= severity === 'error' ? 15 : 5;
        categoryScores['Security'].issues++;
      }
    }

    if (isReactFile) {
      for (const { pattern, message, severity } of REACT_PATTERNS) {
        if (pattern.test(content)) {
          issues.push({ file: file.path, category: 'React Patterns', severity, message, rule: 'react-patterns' });
          categoryScores['React Patterns'].score -= severity === 'error' ? 10 : severity === 'warning' ? 5 : 2;
          categoryScores['React Patterns'].issues++;
        }
      }

      if (!content.includes('loading') && !content.includes('isLoading') && !content.includes('isPending')) {
        if (content.includes('useQuery') || content.includes('useMutation')) {
          issues.push({ file: file.path, category: 'UI States', severity: 'warning', message: 'Query/mutation without loading state handling', rule: 'loading-state' });
          categoryScores['UI States'].score -= 5;
          categoryScores['UI States'].issues++;
        }
      }

      if (!content.includes('error') && !content.includes('isError') && !content.includes('ErrorBoundary')) {
        if (content.includes('useQuery') || content.includes('useMutation')) {
          issues.push({ file: file.path, category: 'Error Handling', severity: 'warning', message: 'Query/mutation without error handling', rule: 'error-handling' });
          categoryScores['Error Handling'].score -= 5;
          categoryScores['Error Handling'].issues++;
        }
      }

      if (content.includes('<img') && !content.includes('alt=')) {
        issues.push({ file: file.path, category: 'Accessibility', severity: 'warning', message: 'Image missing alt attribute', rule: 'img-alt' });
        categoryScores['Accessibility'].score -= 5;
        categoryScores['Accessibility'].issues++;
        fixes.push({
          file: file.path,
          description: 'Add alt attribute to images',
          before: '<img src=',
          after: '<img alt="" src=',
          auto: true,
        });
      }

      if (content.includes('<button') && !content.includes('aria-label') && !content.includes('aria-labelledby')) {
        const hasTextContent = /<button[^>]*>[^<]+<\/button>/.test(content);
        if (!hasTextContent) {
          issues.push({ file: file.path, category: 'Accessibility', severity: 'warning', message: 'Button without accessible label', rule: 'button-label' });
          categoryScores['Accessibility'].score -= 3;
          categoryScores['Accessibility'].issues++;
        }
      }
    }

    if (isTypeScript) {
      const anyCount = (content.match(/:\s*any\b/g) || []).length;
      if (anyCount > 3) {
        issues.push({ file: file.path, category: 'TypeScript', severity: 'warning', message: `${anyCount} uses of 'any' type - consider stricter typing`, rule: 'no-any' });
        categoryScores['TypeScript'].score -= Math.min(anyCount * 2, 15);
        categoryScores['TypeScript'].issues++;
      }
    }

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].length > 200) {
        issues.push({ file: file.path, line: i + 1, category: 'Code Style', severity: 'info', message: `Line exceeds 200 characters (${lines[i].length})`, rule: 'line-length' });
        categoryScores['Code Style'].score -= 1;
        categoryScores['Code Style'].issues++;
      }
    }

    if (isReactFile && content.includes('.map(') && !content.includes('useMemo')) {
      const mapCount = (content.match(/\.map\(/g) || []).length;
      if (mapCount > 3) {
        issues.push({ file: file.path, category: 'Performance', severity: 'info', message: `${mapCount} array maps without memoization`, rule: 'memo-maps' });
        categoryScores['Performance'].score -= 3;
        categoryScores['Performance'].issues++;
      }
    }
  }

  const securitySnippets = templateRegistry.findCodeSnippets(['auth', 'security'], [], 3);
  const allContent = (files || []).map(f => f.content || '').join('\n');
  for (const snippet of securitySnippets) {
    const snippetKeywords = snippet.keywords.filter(k => k.length > 3);
    for (const keyword of snippetKeywords) {
      if (!allContent.toLowerCase().includes(keyword.toLowerCase())) {
        issues.push({
          file: 'project',
          category: 'Security',
          severity: 'info',
          message: `Consider implementing ${snippet.name}: ${snippet.description}`,
          rule: `template-${snippet.id}`,
        });
        categoryScores['Security'].issues++;
        break;
      }
    }
  }

  for (const key in categoryScores) {
    categoryScores[key].score = Math.max(0, categoryScores[key].score);
  }

  const categories: AuditCategory[] = Object.entries(categoryScores).map(([name, data]) => ({
    name,
    score: data.score,
    maxScore: data.max,
    issues: data.issues,
  }));

  const totalScore = Math.round(categories.reduce((sum, c) => sum + c.score, 0) / categories.length);
  const grade = totalScore >= 90 ? 'A+' : totalScore >= 80 ? 'A' : totalScore >= 70 ? 'B+' :
    totalScore >= 60 ? 'B' : totalScore >= 50 ? 'C' : totalScore >= 40 ? 'D' : 'F';

  return {
    score: totalScore,
    grade,
    categories,
    issues,
    fixes,
    summary: `${grade} (${totalScore}/100) - ${issues.length} issues across ${files.length} files, ${fixes.length} auto-fixable`,
  };
}

function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_');
}

function toPascalCase(str: string): string {
  return str
    .replace(/[_-]([a-z])/g, (_, c) => c.toUpperCase())
    .replace(/^[a-z]/, c => c.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '');
}

function categorizePackage(pkg: string): 'core' | 'ui' | 'state' | 'utility' | 'dev' | 'build' {
  if (['react', 'react-dom', 'wouter', 'react-router-dom', 'express', 'drizzle-orm'].includes(pkg)) return 'core';
  if (pkg.startsWith('@radix-ui') || pkg.includes('lucide') || pkg.includes('icon') || pkg.includes('ui')) return 'ui';
  if (['zustand', '@tanstack/react-query', 'jotai', 'recoil', 'redux'].includes(pkg)) return 'state';
  if (['vite', 'typescript', 'eslint', 'vitest', 'postcss', 'tailwindcss'].includes(pkg) || pkg.startsWith('@types/') || pkg.startsWith('@vitejs/')) return 'build';
  return 'utility';
}

function sortTablesByDependency(tables: TableSpec[]): TableSpec[] {
  const deps = new Map<string, Set<string>>();
  for (const t of tables) {
    const tableDeps = new Set<string>();
    for (const col of t.columns) {
      if (col.references && col.references.table !== t.name) {
        tableDeps.add(col.references.table);
      }
    }
    deps.set(t.name, tableDeps);
  }

  const sorted: TableSpec[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(name: string) {
    if (visited.has(name)) return;
    if (visiting.has(name)) return;
    visiting.add(name);
    const tableDeps = deps.get(name) || new Set();
    for (const dep of tableDeps) {
      visit(dep);
    }
    visiting.delete(name);
    visited.add(name);
    const table = tables.find(t => t.name === name);
    if (table) sorted.push(table);
  }

  for (const t of tables) visit(t.name);
  return sorted;
}