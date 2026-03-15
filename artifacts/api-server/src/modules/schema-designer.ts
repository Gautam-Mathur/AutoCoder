/**
 * Schema Designer - The "Database Engineer" of the development team
 *
 * Designs optimized database schemas:
 * - Entity normalization (1NF, 2NF, 3NF)
 * - Index planning (primary, unique, composite, partial)
 * - Relationship mapping (foreign keys, junction tables)
 * - Field type optimization
 * - Audit trail fields (createdAt, updatedAt, deletedAt)
 * - Soft delete strategy
 * - Default values and constraints
 * - Migration safety analysis
 */

import type { ProjectPlan, PlannedEntity, SecurityPlan, PerformancePlan } from './plan-generator.js';
import type { ReasoningResult, EntityRelationship } from './contextual-reasoning-engine.js';

export interface SchemaDesign {
  tables: TableDesign[];
  junctionTables: JunctionTable[];
  enums: EnumType[];
  indexes: IndexDesign[];
  constraints: ConstraintDesign[];
  auditStrategy: AuditStrategy;
  softDelete: boolean;
  migrationNotes: string[];
}

export interface TableDesign {
  name: string;
  entityName: string;
  columns: ColumnDesign[];
  primaryKey: string;
  indexes: IndexDesign[];
  constraints: ConstraintDesign[];
  foreignKeys: ForeignKeyDesign[];
  hasTimestamps: boolean;
  hasSoftDelete: boolean;
}

export interface ColumnDesign {
  name: string;
  type: SQLType;
  nullable: boolean;
  defaultValue?: string;
  unique: boolean;
  maxLength?: number;
  precision?: number;
  scale?: number;
  comment?: string;
  generated?: string;
}

export type SQLType = 'serial' | 'integer' | 'bigint' | 'varchar' | 'text' | 'boolean' | 'timestamp' |
  'date' | 'time' | 'decimal' | 'float' | 'json' | 'jsonb' | 'uuid' | 'enum';

export interface IndexDesign {
  name: string;
  table: string;
  columns: string[];
  unique: boolean;
  type: 'btree' | 'hash' | 'gin' | 'gist';
  partial?: string;
  comment?: string;
}

export interface ConstraintDesign {
  name: string;
  table: string;
  type: 'check' | 'unique' | 'not-null' | 'foreign-key';
  definition: string;
}

export interface ForeignKeyDesign {
  column: string;
  referencesTable: string;
  referencesColumn: string;
  onDelete: 'cascade' | 'set-null' | 'restrict' | 'no-action';
  onUpdate: 'cascade' | 'no-action';
}

export interface JunctionTable {
  name: string;
  leftEntity: string;
  rightEntity: string;
  leftColumn: string;
  rightColumn: string;
  extraColumns: ColumnDesign[];
}

export interface EnumType {
  name: string;
  values: string[];
  usedBy: { table: string; column: string }[];
}

export interface AuditStrategy {
  timestampColumns: boolean;
  createdBy: boolean;
  updatedBy: boolean;
  changeLog: boolean;
}

export function designSchema(plan: ProjectPlan, reasoning?: ReasoningResult | null): SchemaDesign {
  const entities = plan.dataModel || [];
  const relationships = reasoning?.relationships || [];

  const tables = entities.map(entity => designTable(entity, relationships));
  const junctionTables = detectJunctionTables(entities, relationships);
  const enums = extractEnums(entities);
  const indexes = planIndexes(tables, relationships);
  const constraints = planConstraints(tables, entities);
  const auditStrategy = determineAuditStrategy(entities);
  const softDelete = shouldUseSoftDelete(entities);
  const migrationNotes = generateMigrationNotes(tables, junctionTables);

  if (softDelete) {
    for (const table of tables) {
      table.hasSoftDelete = true;
      if (!table.columns.find(c => c.name === 'deleted_at')) {
        table.columns.push({
          name: 'deleted_at',
          type: 'timestamp',
          nullable: true,
          unique: false,
          comment: 'Soft delete timestamp',
        });
      }
    }
  }

  if (plan.performancePlan?.indexRecommendations) {
    for (const rec of plan.performancePlan.indexRecommendations) {
      const tableName = toSnakeCase(rec.entity);
      const table = tables.find(t => t.entityName === rec.entity || t.name === tableName);
      if (table) {
        const snakeFields = rec.fields.map(f => toSnakeCase(f));
        const indexName = `idx_${tableName}_${snakeFields.join('_')}`;
        const alreadyExists = table.indexes.some(i => i.name === indexName) || indexes.some(i => i.name === indexName);
        if (!alreadyExists) {
          const indexType = rec.type === 'unique' ? 'btree' : rec.type as 'btree' | 'hash' | 'gin' | 'gist';
          const newIndex: IndexDesign = {
            name: indexName,
            table: tableName,
            columns: snakeFields,
            unique: rec.type === 'unique',
            type: indexType,
            comment: `Performance recommendation: ${rec.reason}`,
          };
          table.indexes.push(newIndex);
          indexes.push(newIndex);
        }
      }
    }
  }

  if (plan.securityPlan?.fieldVisibility) {
    for (const vis of plan.securityPlan.fieldVisibility) {
      const tableName = toSnakeCase(vis.entity);
      const table = tables.find(t => t.entityName === vis.entity || t.name === tableName);
      if (table) {
        const colName = toSnakeCase(vis.field);
        const column = table.columns.find(c => c.name === colName);
        if (column) {
          const rolesStr = vis.visibleTo.join(', ');
          const restriction = `Restricted: visible to [${rolesStr}] only`;
          column.comment = column.comment ? `${column.comment} | ${restriction}` : restriction;
        }
      }
    }
  }

  if (plan.securityPlan?.entityPermissions) {
    for (const perm of plan.securityPlan.entityPermissions) {
      const tableName = toSnakeCase(perm.entity);
      const table = tables.find(t => t.entityName === perm.entity || t.name === tableName);
      if (table) {
        const actionsStr = perm.actions.join(', ');
        const note = `${perm.role} can: ${actionsStr}`;
        if (!migrationNotes.some(n => n.includes(note))) {
          migrationNotes.push(`Permission [${table.name}]: ${note}`);
        }
      }
    }
  }

  if (plan.performancePlan?.pagination) {
    for (const pag of plan.performancePlan.pagination) {
      const tableName = toSnakeCase(pag.entity);
      const table = tables.find(t => t.entityName === pag.entity || t.name === tableName);
      if (table) {
        migrationNotes.push(`Pagination [${table.name}]: ${pag.strategy} strategy, page size ${pag.pageSize}`);
      }
    }
  }

  return { tables, junctionTables, enums, indexes, constraints, auditStrategy, softDelete, migrationNotes };
}

function designTable(entity: PlannedEntity, relationships: EntityRelationship[]): TableDesign {
  const tableName = toSnakeCase(entity.name);
  const columns: ColumnDesign[] = [];

  columns.push({
    name: 'id',
    type: 'serial',
    nullable: false,
    unique: true,
    comment: 'Primary key',
  });

  for (const field of entity.fields) {
    const column = fieldToColumn(field, entity.name);
    if (column.name !== 'id') {
      columns.push(column);
    }
  }

  const hasCreatedAt = columns.some(c => c.name === 'created_at');
  const hasUpdatedAt = columns.some(c => c.name === 'updated_at');

  if (!hasCreatedAt) {
    columns.push({
      name: 'created_at',
      type: 'timestamp',
      nullable: false,
      defaultValue: 'CURRENT_TIMESTAMP',
      unique: false,
      comment: 'Record creation timestamp',
    });
  }

  if (!hasUpdatedAt) {
    columns.push({
      name: 'updated_at',
      type: 'timestamp',
      nullable: false,
      defaultValue: 'CURRENT_TIMESTAMP',
      unique: false,
      comment: 'Last update timestamp',
    });
  }

  const foreignKeys = deriveForeignKeys(entity, relationships);

  for (const fk of foreignKeys) {
    if (!columns.find(c => c.name === fk.column)) {
      columns.push({
        name: fk.column,
        type: 'integer',
        nullable: true,
        unique: false,
        comment: `Foreign key to ${fk.referencesTable}`,
      });
    }
  }

  const tableIndexes: IndexDesign[] = [];
  for (const fk of foreignKeys) {
    tableIndexes.push({
      name: `idx_${tableName}_${fk.column}`,
      table: tableName,
      columns: [fk.column],
      unique: false,
      type: 'btree',
      comment: `Index for foreign key lookup`,
    });
  }

  const statusCol = columns.find(c => c.name === 'status');
  if (statusCol) {
    tableIndexes.push({
      name: `idx_${tableName}_status`,
      table: tableName,
      columns: ['status'],
      unique: false,
      type: 'btree',
      comment: 'Index for status filtering',
    });
  }

  return {
    name: tableName,
    entityName: entity.name,
    columns,
    primaryKey: 'id',
    indexes: tableIndexes,
    constraints: [],
    foreignKeys,
    hasTimestamps: true,
    hasSoftDelete: false,
  };
}

function fieldToColumn(field: { name: string; type: string; required?: boolean }, entityName: string): ColumnDesign {
  const name = toSnakeCase(field.name);
  const typeInfo = mapFieldType(field.type, field.name);

  return {
    name,
    type: typeInfo.sqlType,
    nullable: !field.required,
    unique: isUniqueField(field.name),
    maxLength: typeInfo.maxLength,
    precision: typeInfo.precision,
    scale: typeInfo.scale,
    defaultValue: inferDefaultValue(field.name, typeInfo.sqlType),
    comment: undefined,
  };
}

function mapFieldType(fieldType: string, fieldName: string): { sqlType: SQLType; maxLength?: number; precision?: number; scale?: number } {
  const lower = fieldType.toLowerCase();
  const nameL = fieldName.toLowerCase();

  if (nameL.includes('email')) return { sqlType: 'varchar', maxLength: 255 };
  if (nameL.includes('phone')) return { sqlType: 'varchar', maxLength: 50 };
  if (nameL.includes('url') || nameL.includes('website') || nameL.includes('link')) return { sqlType: 'varchar', maxLength: 2048 };
  if (nameL.includes('color')) return { sqlType: 'varchar', maxLength: 20 };
  if (nameL.includes('ip')) return { sqlType: 'varchar', maxLength: 45 };

  if (nameL.includes('price') || nameL.includes('amount') || nameL.includes('cost') ||
      nameL.includes('salary') || nameL.includes('revenue') || nameL.includes('budget')) {
    return { sqlType: 'decimal', precision: 12, scale: 2 };
  }
  if (nameL.includes('percentage') || nameL.includes('rate') || nameL.includes('ratio')) {
    return { sqlType: 'decimal', precision: 5, scale: 2 };
  }
  if (nameL.includes('latitude') || nameL.includes('longitude')) {
    return { sqlType: 'decimal', precision: 10, scale: 7 };
  }

  if (nameL.includes('description') || nameL.includes('content') || nameL.includes('body') ||
      nameL.includes('notes') || nameL.includes('bio') || nameL.includes('summary')) {
    return { sqlType: 'text' };
  }
  if (nameL.includes('metadata') || nameL.includes('settings') || nameL.includes('config') || nameL.includes('options')) {
    return { sqlType: 'jsonb' };
  }
  if (nameL.includes('tags') || nameL.includes('labels') || nameL.includes('permissions') || nameL.includes('features')) {
    return { sqlType: 'jsonb' };
  }

  if (lower === 'string' || lower === 'text') {
    if (nameL.includes('name') || nameL.includes('title')) return { sqlType: 'varchar', maxLength: 255 };
    if (nameL.includes('code') || nameL.includes('sku') || nameL.includes('slug')) return { sqlType: 'varchar', maxLength: 100 };
    return { sqlType: 'varchar', maxLength: 255 };
  }
  if (lower === 'number' || lower === 'integer' || lower === 'int') return { sqlType: 'integer' };
  if (lower === 'float' || lower === 'double' || lower === 'decimal') return { sqlType: 'decimal', precision: 10, scale: 2 };
  if (lower === 'boolean' || lower === 'bool') return { sqlType: 'boolean' };
  if (lower === 'date') return { sqlType: 'date' };
  if (lower === 'datetime' || lower === 'timestamp') return { sqlType: 'timestamp' };
  if (lower === 'json' || lower === 'object' || lower === 'array') return { sqlType: 'jsonb' };
  if (lower === 'uuid') return { sqlType: 'uuid' };

  return { sqlType: 'varchar', maxLength: 255 };
}

function isUniqueField(name: string): boolean {
  const lower = name.toLowerCase();
  return lower === 'email' || lower === 'username' || lower === 'slug' || lower === 'code' || lower === 'sku';
}

function inferDefaultValue(name: string, sqlType: SQLType): string | undefined {
  const lower = name.toLowerCase();
  if (lower === 'status') return "'active'";
  if (lower === 'is_active' || lower === 'active' || lower === 'enabled') return 'true';
  if (lower === 'is_deleted' || lower === 'deleted') return 'false';
  if (lower === 'sort_order' || lower === 'order' || lower === 'position') return '0';
  if (lower === 'count' || lower === 'views' || lower === 'likes') return '0';
  if (lower === 'priority') return '0';
  if (sqlType === 'jsonb' && (lower.includes('tags') || lower.includes('labels'))) return "'[]'::jsonb";
  if (sqlType === 'jsonb') return "'{}'::jsonb";
  return undefined;
}

function deriveForeignKeys(entity: PlannedEntity, relationships: EntityRelationship[]): ForeignKeyDesign[] {
  const fks: ForeignKeyDesign[] = [];

  for (const rel of relationships) {
    if (rel.to === entity.name && (rel.type === 'parent-child' || rel.type === 'reference')) {
      const column = `${toSnakeCase(rel.from)}_id`;
      if (!fks.find(f => f.column === column)) {
        fks.push({
          column,
          referencesTable: toSnakeCase(rel.from),
          referencesColumn: 'id',
          onDelete: rel.type === 'reference' ? 'cascade' : 'set-null',
          onUpdate: 'cascade',
        });
      }
    }

    if (rel.from === entity.name && rel.type === 'composition') {
      const column = `${toSnakeCase(rel.to)}_id`;
      if (!fks.find(f => f.column === column)) {
        fks.push({
          column,
          referencesTable: toSnakeCase(rel.to),
          referencesColumn: 'id',
          onDelete: 'cascade',
          onUpdate: 'cascade',
        });
      }
    }
  }

  for (const field of entity.fields) {
    const lower = field.name.toLowerCase();
    if (lower.endsWith('_id') || lower.endsWith('Id')) {
      const refName = lower.replace(/_?id$/i, '');
      const column = toSnakeCase(field.name);
      if (!fks.find(f => f.column === column)) {
        fks.push({
          column,
          referencesTable: toSnakeCase(refName),
          referencesColumn: 'id',
          onDelete: 'set-null',
          onUpdate: 'cascade',
        });
      }
    }
  }

  return fks;
}

function detectJunctionTables(entities: PlannedEntity[], relationships: EntityRelationship[]): JunctionTable[] {
  const junctions: JunctionTable[] = [];

  for (const rel of relationships) {
    if (rel.type === 'many-to-many') {
      const leftTable = toSnakeCase(rel.from);
      const rightTable = toSnakeCase(rel.to);
      const name = `${leftTable}_${rightTable}`;

      junctions.push({
        name,
        leftEntity: rel.from,
        rightEntity: rel.to,
        leftColumn: `${leftTable}_id`,
        rightColumn: `${rightTable}_id`,
        extraColumns: [
          { name: 'created_at', type: 'timestamp', nullable: false, defaultValue: 'CURRENT_TIMESTAMP', unique: false },
        ],
      });
    }
  }

  return junctions;
}

function extractEnums(entities: PlannedEntity[]): EnumType[] {
  const enums: EnumType[] = [];
  const enumFields = ['status', 'type', 'category', 'role', 'priority', 'level', 'state'];

  for (const entity of entities) {
    for (const field of entity.fields) {
      const lower = field.name.toLowerCase();
      if (enumFields.includes(lower) || lower.endsWith('_type') || lower.endsWith('_status')) {
        const values = inferEnumValues(field.name, entity.name);
        if (values.length > 0) {
          const enumName = `${toSnakeCase(entity.name)}_${toSnakeCase(field.name)}`;
          enums.push({
            name: enumName,
            values,
            usedBy: [{ table: toSnakeCase(entity.name), column: toSnakeCase(field.name) }],
          });
        }
      }
    }
  }

  return enums;
}

function inferEnumValues(fieldName: string, entityName: string): string[] {
  const lower = fieldName.toLowerCase();

  if (lower === 'status') {
    const entityL = entityName.toLowerCase();
    if (entityL.includes('task') || entityL.includes('ticket') || entityL.includes('issue'))
      return ['todo', 'in_progress', 'in_review', 'done', 'cancelled'];
    if (entityL.includes('order') || entityL.includes('booking'))
      return ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (entityL.includes('project'))
      return ['planning', 'active', 'on_hold', 'completed', 'archived'];
    if (entityL.includes('invoice') || entityL.includes('payment'))
      return ['draft', 'sent', 'paid', 'overdue', 'cancelled'];
    return ['active', 'inactive', 'pending', 'archived'];
  }
  if (lower === 'priority') return ['low', 'medium', 'high', 'critical'];
  if (lower === 'role') return ['admin', 'manager', 'member', 'viewer'];
  if (lower === 'type') return ['standard', 'premium', 'custom'];
  if (lower === 'level') return ['beginner', 'intermediate', 'advanced', 'expert'];

  return [];
}

function planIndexes(tables: TableDesign[], relationships: EntityRelationship[]): IndexDesign[] {
  const indexes: IndexDesign[] = [];

  for (const table of tables) {
    const nameCol = table.columns.find(c => c.name === 'name' || c.name === 'title');
    if (nameCol) {
      indexes.push({
        name: `idx_${table.name}_${nameCol.name}`,
        table: table.name,
        columns: [nameCol.name],
        unique: false,
        type: 'btree',
      });
    }

    const emailCol = table.columns.find(c => c.name === 'email');
    if (emailCol) {
      indexes.push({
        name: `idx_${table.name}_email`,
        table: table.name,
        columns: ['email'],
        unique: true,
        type: 'btree',
      });
    }

    if (table.hasTimestamps) {
      indexes.push({
        name: `idx_${table.name}_created_at`,
        table: table.name,
        columns: ['created_at'],
        unique: false,
        type: 'btree',
        comment: 'Index for sorting by creation date',
      });
    }

    indexes.push(...table.indexes);
  }

  return indexes;
}

function planConstraints(tables: TableDesign[], entities: PlannedEntity[]): ConstraintDesign[] {
  const constraints: ConstraintDesign[] = [];

  for (const table of tables) {
    for (const col of table.columns) {
      if (col.name.includes('email')) {
        constraints.push({
          name: `chk_${table.name}_${col.name}_format`,
          table: table.name,
          type: 'check',
          definition: `${col.name} ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'`,
        });
      }

      if (col.name.includes('price') || col.name.includes('amount') || col.name.includes('cost')) {
        constraints.push({
          name: `chk_${table.name}_${col.name}_positive`,
          table: table.name,
          type: 'check',
          definition: `${col.name} >= 0`,
        });
      }

      if (col.name.includes('percentage') || col.name.includes('rate')) {
        constraints.push({
          name: `chk_${table.name}_${col.name}_range`,
          table: table.name,
          type: 'check',
          definition: `${col.name} >= 0 AND ${col.name} <= 100`,
        });
      }
    }
  }

  return constraints;
}

function determineAuditStrategy(entities: PlannedEntity[]): AuditStrategy {
  const hasUsers = entities.some(e => e.name.toLowerCase().includes('user'));
  return {
    timestampColumns: true,
    createdBy: hasUsers,
    updatedBy: hasUsers,
    changeLog: entities.length > 5,
  };
}

function shouldUseSoftDelete(entities: PlannedEntity[]): boolean {
  return entities.some(e => {
    const name = e.name.toLowerCase();
    return name.includes('user') || name.includes('customer') || name.includes('order') ||
           name.includes('invoice') || name.includes('project') || name.includes('account');
  });
}

function generateMigrationNotes(tables: TableDesign[], junctions: JunctionTable[]): string[] {
  const notes: string[] = [];
  notes.push(`Total tables: ${tables.length + junctions.length}`);
  notes.push(`Junction tables: ${junctions.length}`);

  const fkCount = tables.reduce((sum, t) => sum + t.foreignKeys.length, 0);
  if (fkCount > 0) notes.push(`Foreign keys: ${fkCount} — create referenced tables first`);

  const softDeleteTables = tables.filter(t => t.hasSoftDelete);
  if (softDeleteTables.length > 0) notes.push(`Soft delete enabled on: ${softDeleteTables.map(t => t.name).join(', ')}`);

  return notes;
}

function toSnakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}