/**
 * SLM Stage: Component Composition — Patch-based SLM enhancement
 *
 * CONSTRAINED: Component hierarchy follows plan-driven generation (no freestyle trees).
 * SLM enhances UX details: better prop naming, accessibility attributes,
 * interaction patterns. Structural tree stays rule-controlled.
 */

import { registerStageTemplate } from './slm-inference-engine.js';
import { getAntiPatternChecklist } from './knowledge-base.js';

export const COMPONENT_STAGE_ID = 'compose';

export function registerComponentTemplate(): void {
  registerStageTemplate({
    stage: COMPONENT_STAGE_ID,
    systemPrompt: `You are a senior React UI engineer reviewing a component composition plan.
Your job is to propose PATCHES to improve the component tree — not restructure it.

You can suggest:
- Better prop naming for clarity
- Missing accessibility attributes (aria labels, roles, keyboard navigation)
- Improved interaction patterns (hover states, focus management, transitions)
- Missing loading/error/empty state considerations
- Better component naming conventions
- Responsive design adjustments
- Reusable component extraction opportunities

You CANNOT:
- Add or remove pages
- Change the component hierarchy structure
- Modify the routing architecture
- Remove planned components

${getAntiPatternChecklist(['react', 'hooks', 'ux', 'rendering', 'accessibility'])}

Key React patterns to enforce:
- Every list of items MUST use item.id as key, never array index
- Every component that fetches data MUST have loading, error, and empty states
- Interactive components MUST have keyboard navigation (onKeyDown Enter/Space for custom buttons)
- Large lists (>50 items) should use virtualization (recommend react-window)
- Async side effects in useEffect MUST have cleanup return functions for subscriptions/timers
- All form inputs MUST have associated labels (htmlFor or aria-label)

Output patches targeting specific components.`,

    userPromptBuilder: (context: Record<string, any>) => {
      let prompt = `Review this component composition plan and propose improvements:\n\n`;

      if (context.ruleOutput) {
        const tree = context.ruleOutput;
        if (tree.pages?.length > 0) {
          for (const page of tree.pages.slice(0, 8)) {
            prompt += `Page: ${page.name} (${page.route || page.path || '/'})\n`;
            if (page.components?.length > 0) {
              for (const comp of page.components.slice(0, 5)) {
                prompt += `  - ${comp.name}: ${comp.type || 'component'}`;
                if (comp.props?.length > 0) prompt += ` (props: ${comp.props.join(', ')})`;
                prompt += '\n';
              }
            }
          }
        }

        if (tree.sharedComponents?.length > 0) {
          prompt += `\nShared components:\n`;
          for (const comp of tree.sharedComponents.slice(0, 10)) {
            prompt += `  - ${comp.name}: ${comp.description || comp.type || 'shared'}\n`;
          }
        }
      }

      if (context.features?.length > 0) {
        prompt += `\nFeatures in this app: ${context.features.join(', ')}\n`;
      }

      prompt += `\nPropose patches. Focus on:
1. Missing accessibility attributes (aria-label, role, tabIndex, keyboard handlers)
2. Better prop naming for clarity
3. Missing state considerations (loading skeleton, error message with retry, empty state illustration)
4. Interaction improvements (hover, focus, active states)
5. Responsive design notes (mobile-first, breakpoints)
6. ErrorBoundary wrapping for data-heavy components`;

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
              field: { type: 'string', description: 'component name or page.component path' },
              patchedValue: { type: 'object' },
              originalValue: { type: 'object' },
              reason: { type: 'string' },
              confidence: { type: 'number' },
              type: { type: 'string', enum: ['add-a11y', 'rename-prop', 'add-state', 'add-interaction', 'add-responsive', 'extract-shared'] },
            },
          },
        },
        summary: { type: 'string' },
      },
      required: ['patches'],
    },

    maxTokens: 1536,
    temperature: 0.3,
    timeoutMs: 15000,
  });
}

export function validateComponentPatch(patch: any, _ruleOutput: any): boolean {
  if (!patch.field || !patch.reason) return false;
  if ((patch.confidence || 0) < 0.5) return false;

  const allowed = ['add-a11y', 'rename-prop', 'add-state', 'add-interaction', 'add-responsive', 'extract-shared'];
  if (!allowed.includes(patch.type)) return false;

  return true;
}

export function scoreComponentPatchOutput(output: any, _context: Record<string, any>): number {
  if (!output?.patches) return 0.3;

  let score = 0.5;
  const patches = output.patches as any[];

  if (patches.length > 0) score += 0.1;
  if (patches.some((p: any) => p.type === 'add-a11y')) score += 0.15;
  if (patches.some((p: any) => p.type === 'add-state')) score += 0.1;

  const avgConfidence = patches.reduce((sum: number, p: any) => sum + (p.confidence || 0), 0) / Math.max(patches.length, 1);
  score += avgConfidence * 0.15;

  return Math.min(score, 1.0);
}