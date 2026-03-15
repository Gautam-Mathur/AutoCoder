/**
 * SLM Stage: Semantic Analysis — Enhances contextual reasoning with SLM
 *
 * MODERATE risk: SLM proposes hidden relationships, implied business constraints,
 * derived entities, and role assumptions.
 *
 * Proposals validated by rules before merging into reasoning graph.
 * Never mutates graph directly.
 */

import { registerStageTemplate } from './slm-inference-engine.js';

export const SEMANTIC_STAGE_ID = 'reason';

export function registerSemanticTemplate(): void {
  registerStageTemplate({
    stage: SEMANTIC_STAGE_ID,
    systemPrompt: `You are a senior software architect analyzing entity relationships and business rules for a web application.

Your job is to identify:
1. Hidden relationships between entities that weren't explicitly stated
2. Implied business constraints and validation rules
3. Derived/computed fields that would improve the data model
4. Role-based access patterns for different entities
5. Cascade behaviors (what happens when parent entities are deleted)
6. Temporal patterns (status transitions, scheduling, expiry)

Rules:
- Only PROPOSE enhancements, never restructure the base model
- Each proposal must include a confidence score (0-1)
- Each proposal must explain WHY it should be added
- Focus on relationships and constraints, not new entities
- Respect the existing entity structure from the rule engine`,

    userPromptBuilder: (context: Record<string, any>) => {
      let prompt = `Analyze the semantic relationships for this application:\n\n`;

      if (context.ruleOutput) {
        const reasoning = context.ruleOutput;

        if (reasoning.fieldSemantics?.length > 0) {
          prompt += `Existing field semantics:\n`;
          for (const fs of reasoning.fieldSemantics.slice(0, 20)) {
            prompt += `  - ${fs.entityName}.${fs.fieldName}: ${fs.semanticType || 'unknown'} (${fs.displayPattern || 'default'})\n`;
          }
        }

        if (reasoning.relationships?.length > 0) {
          prompt += `\nExisting relationships:\n`;
          for (const rel of reasoning.relationships) {
            prompt += `  - ${rel.from} → ${rel.to}: ${rel.type} (${rel.semanticMeaning || 'association'})\n`;
          }
        }

        if (reasoning.computedFields?.length > 0) {
          prompt += `\nExisting computed fields:\n`;
          for (const cf of reasoning.computedFields.slice(0, 10)) {
            prompt += `  - ${cf.entityName}.${cf.fieldName}: ${cf.formula || cf.description}\n`;
          }
        }
      }

      if (context.plan) {
        prompt += `\nEntities in the plan:\n`;
        for (const entity of (context.plan.dataModel || []).slice(0, 15)) {
          prompt += `  ${entity.name}: ${entity.fields?.map((f: any) => f.name).join(', ')}\n`;
        }
      }

      prompt += `\nPropose enhancements to the semantic analysis. Focus on:
- Missing relationships between entities
- Business rules that should be enforced
- Computed fields that would be useful
- Status transition rules
- Cascade delete behaviors
- Data validation constraints beyond type checking`;

      return prompt;
    },

    outputSchema: {
      type: 'object',
      properties: {
        proposedRelationships: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              from: { type: 'string' },
              to: { type: 'string' },
              type: { type: 'string', enum: ['one-to-many', 'many-to-many', 'one-to-one', 'belongs-to'] },
              semanticMeaning: { type: 'string' },
              confidence: { type: 'number' },
              reason: { type: 'string' },
            },
          },
        },
        proposedComputedFields: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              entityName: { type: 'string' },
              fieldName: { type: 'string' },
              formula: { type: 'string' },
              description: { type: 'string' },
              confidence: { type: 'number' },
            },
          },
        },
        proposedBusinessRules: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              entityName: { type: 'string' },
              rule: { type: 'string' },
              type: { type: 'string', enum: ['validation', 'constraint', 'cascade', 'transition', 'access'] },
              confidence: { type: 'number' },
              reason: { type: 'string' },
            },
          },
        },
        proposedCascades: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              parentEntity: { type: 'string' },
              childEntity: { type: 'string' },
              action: { type: 'string', enum: ['cascade-delete', 'set-null', 'restrict', 'archive'] },
              reason: { type: 'string' },
            },
          },
        },
      },
      required: ['proposedRelationships'],
    },

    maxTokens: 2048,
    temperature: 0.3,
    timeoutMs: 20000,
  });
}

export function mergeSemanticResults(ruleResult: any, slmResult: any): any {
  if (!slmResult) return ruleResult;
  if (!ruleResult) return slmResult;

  const merged = JSON.parse(JSON.stringify(ruleResult));
  const CONFIDENCE_THRESHOLD = 0.6;

  if (slmResult.proposedRelationships?.length > 0) {
    if (!merged.relationships) merged.relationships = [];
    const existingPairs = new Set(
      merged.relationships.map((r: any) => `${r.from.toLowerCase()}-${r.to.toLowerCase()}`)
    );

    for (const rel of slmResult.proposedRelationships) {
      if ((rel.confidence || 0) < CONFIDENCE_THRESHOLD) continue;
      const key = `${rel.from.toLowerCase()}-${rel.to.toLowerCase()}`;
      if (!existingPairs.has(key)) {
        merged.relationships.push({
          from: rel.from,
          to: rel.to,
          type: rel.type,
          semanticMeaning: rel.semanticMeaning,
          source: 'slm-proposed',
          confidence: rel.confidence,
        });
        existingPairs.add(key);
      }
    }
  }

  if (slmResult.proposedComputedFields?.length > 0) {
    if (!merged.computedFields) merged.computedFields = [];
    const existingComputed = new Set(
      merged.computedFields.map((cf: any) => `${cf.entityName.toLowerCase()}.${cf.fieldName.toLowerCase()}`)
    );

    for (const cf of slmResult.proposedComputedFields) {
      if ((cf.confidence || 0) < CONFIDENCE_THRESHOLD) continue;
      const key = `${cf.entityName.toLowerCase()}.${cf.fieldName.toLowerCase()}`;
      if (!existingComputed.has(key)) {
        merged.computedFields.push({
          entityName: cf.entityName,
          fieldName: cf.fieldName,
          formula: cf.formula,
          description: cf.description,
          source: 'slm-proposed',
        });
      }
    }
  }

  if (slmResult.proposedBusinessRules?.length > 0) {
    if (!merged.businessRules) merged.businessRules = [];
    for (const rule of slmResult.proposedBusinessRules) {
      if ((rule.confidence || 0) < CONFIDENCE_THRESHOLD) continue;
      merged.businessRules.push({
        entityName: rule.entityName,
        rule: rule.rule,
        type: rule.type,
        source: 'slm-proposed',
      });
    }
  }

  return merged;
}

export function scoreSemanticOutput(output: any, _context: Record<string, any>): number {
  let score = 0.5;

  if (output?.relationships?.length > 0 || output?.proposedRelationships?.length > 0) score += 0.15;
  if (output?.computedFields?.length > 0 || output?.proposedComputedFields?.length > 0) score += 0.1;
  if (output?.businessRules?.length > 0 || output?.proposedBusinessRules?.length > 0) score += 0.1;
  if (output?.proposedCascades?.length > 0) score += 0.05;
  if (output?.fieldSemantics?.length > 3) score += 0.1;

  return Math.min(score, 1.0);
}