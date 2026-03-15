/**
 * SLM Stage: Schema Design — Patch-based SLM enhancement
 *
 * CONSTRAINED: Rule engine generates canonical schema.
 * SLM proposes patches only: better constraint naming, index suggestions,
 * composite unique hints, optionality corrections.
 * Patches validated against structural contracts before applying.
 */

import { registerStageTemplate } from './slm-inference-engine.js';
import { getConfig } from './prompt-config.js';
import { getSchemaSuggestions, getWorkflowPattern, matchEntityToArchetype } from './knowledge-base.js';

export const SCHEMA_STAGE_ID = 'schema';

export function registerSchemaTemplate(): void {
  registerStageTemplate({
    stage: SCHEMA_STAGE_ID,
    systemPrompt: `You are a database architect reviewing a Drizzle ORM schema for a PostgreSQL database.
Your job is to propose PATCHES to improve the schema — not rewrite it.

You can suggest:
- Better column constraint naming (e.g., more descriptive check constraint names)
- Additional indexes for frequently queried fields
- Composite unique constraints that enforce business rules
- Optionality corrections (fields that should/shouldn't be nullable)
- Default value suggestions for new records
- Better foreign key naming conventions
- Index strategy improvements (btree vs gin for text search)
- Enum value suggestions for status/type fields

You CANNOT:
- Add or remove tables (that's the rule engine's job)
- Rename tables or primary columns
- Change primary key strategies
- Remove existing columns
- Change column types fundamentally

Output patches as an array. Each patch targets a specific table and field.`,

    userPromptBuilder: (context: Record<string, any>) => {
      const config = getConfig();
      let prompt = `Review this Drizzle schema and propose improvement patches:\n\n`;

      // Inject schema-relevant config preferences
      if (config.securityFocus !== 'standard') {
        prompt += `User preference: ${config.securityFocus} security — ensure password/token columns are NOT selected by default (use .select() without password), add indexes for email and auth-related columns.\n\n`;
      }
      if (config.typescriptStrictness === 'strict') {
        prompt += `User preference: strict TypeScript — ensure all columns have explicit Drizzle types with correct notNull() or .default() declarations.\n\n`;
      }
      if (config.alwaysPaginate) {
        prompt += `User preference: always paginate — suggest createdAt DESC + id indexes on all user-facing list tables.\n\n`;
      }

      if (context.ruleOutput) {
        const schema = context.ruleOutput;
        if (schema.tables?.length > 0) {
          for (const table of schema.tables.slice(0, 10)) {
            prompt += `Table: ${table.name}\n`;
            if (table.columns?.length > 0) {
              for (const col of table.columns) {
                prompt += `  - ${col.name}: ${col.type}${col.nullable ? ' (nullable)' : ''}${col.primaryKey ? ' (PK)' : ''}${col.references ? ` → ${col.references}` : ''}\n`;
              }
            }
            if (table.indexes?.length > 0) {
              prompt += `  Indexes: ${table.indexes.map((i: any) => i.name || i.columns?.join(',')).join(', ')}\n`;
            }
            prompt += '\n';
          }
        }
      }

      if (context.plan?.dataModel) {
        prompt += `\nBusiness context:\n`;
        for (const entity of context.plan.dataModel.slice(0, 10)) {
          prompt += `- ${entity.name}: ${entity.description || entity.fields?.map((f: any) => f.name).join(', ')}\n`;
        }
      }

      // Inject archetype-based schema suggestions for every table
      const tableNames: string[] = context.ruleOutput?.tables?.map((t: any) => t.name) ?? context.plan?.dataModel?.map((e: any) => e.name) ?? [];
      if (tableNames.length > 0) {
        prompt += `\n## Archetype Schema Guidance\n`;
        prompt += `Use these field/index/workflow patterns as the ground truth for each entity:\n\n`;
        for (const tableName of tableNames.slice(0, 8)) {
          const arch = matchEntityToArchetype(tableName);
          if (arch) {
            const suggestions = getSchemaSuggestions(tableName);
            prompt += `${suggestions}\n\n`;
            if (arch.defaultWorkflow) {
              const wf = getWorkflowPattern(arch.id);
              if (wf) prompt += `${wf}\n\n`;
            }
          }
        }
      }

      prompt += `\nPropose patches to improve this schema. Focus on:
1. Missing indexes for search/filter fields
2. Better constraints for data integrity (CHECK constraints for status fields)
3. Nullable corrections (non-nullable fields that are nullable)
4. Default values that make sense
5. Composite unique constraints for business rules
6. Workflow status column with correct CHECK constraint values`;

      return prompt;
    },

    outputSchema: {
      type: 'object',
      properties: {
        patches: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              field: { type: 'string', description: 'table.column or table-level target' },
              patchedValue: { type: 'object', description: 'The patch details' },
              originalValue: { type: 'object' },
              reason: { type: 'string' },
              confidence: { type: 'number' },
              type: { type: 'string', enum: ['add-index', 'add-constraint', 'change-nullable', 'add-default', 'add-unique', 'rename-constraint'] },
            },
          },
        },
        summary: { type: 'string' },
      },
      required: ['patches'],
    },

    maxTokens: 1536,
    temperature: 0.2,
    timeoutMs: 20000,
  });
}

export function validateSchemaPatch(patch: any, ruleOutput: any): boolean {
  if (!patch.field || !patch.reason) return false;
  if ((patch.confidence || 0) < 0.5) return false;

  const forbidden = ['drop', 'delete', 'remove-table', 'change-pk', 'rename-table'];
  if (forbidden.includes(patch.type)) return false;

  if (patch.type === 'add-index' || patch.type === 'add-constraint' || patch.type === 'add-unique' || patch.type === 'add-default' || patch.type === 'change-nullable') {
    return true;
  }

  return false;
}

export function scoreSchemaPatchOutput(output: any, _context: Record<string, any>): number {
  if (!output?.patches) return 0.3;

  let score = 0.5;
  const patches = output.patches as any[];

  if (patches.length > 0) score += 0.1;
  if (patches.length > 3) score += 0.1;

  const avgConfidence = patches.reduce((sum: number, p: any) => sum + (p.confidence || 0), 0) / Math.max(patches.length, 1);
  score += avgConfidence * 0.2;

  const hasReasons = patches.every((p: any) => p.reason && p.reason.length > 10);
  if (hasReasons) score += 0.1;

  return Math.min(score, 1.0);
}