/**
 * SLM Stage: API Design — Patch-based SLM enhancement
 *
 * CONSTRAINED: Rule engine generates endpoint list (structural truth).
 * SLM proposes patches: better route naming, error response patterns,
 * additional filter params.
 * Endpoint list always originates from deterministic planner.
 */

import { registerStageTemplate } from './slm-inference-engine.js';

export const API_STAGE_ID = 'api';

export function registerAPITemplate(): void {
  registerStageTemplate({
    stage: API_STAGE_ID,
    systemPrompt: `You are an API architect reviewing a REST API design for a web application.
Your job is to propose PATCHES to improve the API — not redesign it.

You can suggest:
- Better route naming conventions (RESTful improvements)
- Additional query parameters for filtering and sorting
- Improved error response structures
- Better validation rule descriptions
- Pagination parameter suggestions
- Response field selections (sparse fieldsets)
- Rate limiting annotations
- Better HTTP status code usage

You CANNOT:
- Add or remove endpoints (that's the rule engine's job)
- Change the entity structure
- Modify authentication strategy
- Change the base URL pattern

Output patches as an array targeting specific endpoints.`,

    userPromptBuilder: (context: Record<string, any>) => {
      let prompt = `Review this API design and propose improvement patches:\n\n`;

      if (context.ruleOutput) {
        const api = context.ruleOutput;
        if (api.endpoints?.length > 0) {
          for (const ep of api.endpoints.slice(0, 20)) {
            prompt += `${ep.method} ${ep.path}`;
            if (ep.description) prompt += ` — ${ep.description}`;
            prompt += '\n';
            if (ep.params?.length > 0) {
              prompt += `  Params: ${ep.params.map((p: any) => `${p.name}:${p.type}`).join(', ')}\n`;
            }
            if (ep.queryParams?.length > 0) {
              prompt += `  Query: ${ep.queryParams.map((p: any) => `${p.name}:${p.type}`).join(', ')}\n`;
            }
          }
        }
      }

      if (context.plan?.dataModel) {
        prompt += `\nEntities:\n`;
        for (const entity of context.plan.dataModel.slice(0, 10)) {
          const fieldNames = entity.fields?.map((f: any) => `${f.name}:${f.type}`).join(', ');
          prompt += `- ${entity.name}: ${fieldNames}\n`;
        }
      }

      prompt += `\nPropose patches to improve this API. Focus on:
1. Missing query parameters for filtering/sorting
2. Better error response suggestions
3. Pagination improvements
4. Validation rule descriptions
5. Rate limiting suggestions`;

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
              field: { type: 'string', description: 'endpoint path being patched' },
              patchedValue: { type: 'object' },
              originalValue: { type: 'object' },
              reason: { type: 'string' },
              confidence: { type: 'number' },
              type: { type: 'string', enum: ['add-query-param', 'improve-error', 'add-pagination', 'add-validation', 'add-rate-limit', 'improve-naming'] },
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

export function validateAPIPatch(patch: any, _ruleOutput: any): boolean {
  if (!patch.field || !patch.reason) return false;
  if ((patch.confidence || 0) < 0.5) return false;

  const allowed = ['add-query-param', 'improve-error', 'add-pagination', 'add-validation', 'add-rate-limit', 'improve-naming'];
  if (!allowed.includes(patch.type)) return false;

  return true;
}

export function scoreAPIPatchOutput(output: any, _context: Record<string, any>): number {
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