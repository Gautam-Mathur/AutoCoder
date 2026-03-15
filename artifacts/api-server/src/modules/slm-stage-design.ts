/**
 * SLM Stage: Design System — Enhances design choices with SLM
 *
 * SAFE stage: Low structural risk, high creative gain.
 * SLM generates domain-aware color palettes, typography, and animation choices.
 * Rule palette is always fallback.
 */

import { registerStageTemplate } from './slm-inference-engine.js';

export const DESIGN_STAGE_ID = 'design';

export function registerDesignTemplate(): void {
  registerStageTemplate({
    stage: DESIGN_STAGE_ID,
    systemPrompt: `You are an expert UI/UX designer specializing in web application design systems.
Your job is to create cohesive, domain-appropriate design tokens for a web application.

You excel at:
- Matching color palettes to industry domains (healthcare = calm blues/greens, finance = navy/gold, food = warm oranges/reds)
- Typography pairing for readability and brand personality
- Animation and transition choices that enhance UX without being distracting
- Dark mode color adaptation that maintains contrast and accessibility
- Component styling that matches the application's personality
- Spacing and layout rhythm that feels professional

Consider:
- WCAG 2.1 AA contrast requirements (4.5:1 for text, 3:1 for large text)
- Color psychology for the domain
- Professional vs playful tone based on the application type
- Consistency across light and dark modes`,

    userPromptBuilder: (context: Record<string, any>) => {
      let prompt = `Create a design system for this application:\n`;

      if (context.ruleOutput) {
        const design = context.ruleOutput;
        prompt += `\nThe rule engine already generated these design tokens:\n`;

        if (design.colors) {
          prompt += `- Primary color: ${design.colors.primary || 'not set'}\n`;
          prompt += `- Secondary color: ${design.colors.secondary || 'not set'}\n`;
          prompt += `- Accent color: ${design.colors.accent || 'not set'}\n`;
        }

        if (design.typography) {
          prompt += `- Heading font: ${design.typography.headingFont || 'not set'}\n`;
          prompt += `- Body font: ${design.typography.bodyFont || 'not set'}\n`;
        }

        prompt += `\nDomain: ${context.domain || 'general'}\n`;
        prompt += `App type: ${context.appType || 'web application'}\n`;
        prompt += `Complexity: ${context.complexity || 'moderate'}\n`;

        if (context.projectName) {
          prompt += `Project name: ${context.projectName}\n`;
        }

        prompt += `\nEnhance this design system:
- Improve color harmony and domain appropriateness
- Suggest better font pairings if needed
- Add semantic color tokens (success, warning, error, info)
- Suggest animation/transition values
- Ensure dark mode colors maintain proper contrast
- Add spacing rhythm and border radius tokens`;
      }

      return prompt;
    },

    outputSchema: {
      type: 'object',
      properties: {
        colors: {
          type: 'object',
          properties: {
            primary: { type: 'string', description: 'Primary brand color (hex)' },
            primaryLight: { type: 'string' },
            primaryDark: { type: 'string' },
            secondary: { type: 'string' },
            secondaryLight: { type: 'string' },
            secondaryDark: { type: 'string' },
            accent: { type: 'string' },
            background: { type: 'string' },
            surface: { type: 'string' },
            text: { type: 'string' },
            textSecondary: { type: 'string' },
            success: { type: 'string' },
            warning: { type: 'string' },
            error: { type: 'string' },
            info: { type: 'string' },
          },
        },
        darkColors: {
          type: 'object',
          description: 'Dark mode color overrides',
          properties: {
            background: { type: 'string' },
            surface: { type: 'string' },
            text: { type: 'string' },
            textSecondary: { type: 'string' },
          },
        },
        typography: {
          type: 'object',
          properties: {
            headingFont: { type: 'string' },
            bodyFont: { type: 'string' },
            monoFont: { type: 'string' },
            baseSize: { type: 'string' },
            scaleRatio: { type: 'number' },
          },
        },
        spacing: {
          type: 'object',
          properties: {
            unit: { type: 'number', description: 'Base spacing unit in px' },
            rhythm: { type: 'array', items: { type: 'number' }, description: 'Spacing scale multipliers' },
          },
        },
        borderRadius: {
          type: 'object',
          properties: {
            small: { type: 'string' },
            medium: { type: 'string' },
            large: { type: 'string' },
            full: { type: 'string' },
          },
        },
        animations: {
          type: 'object',
          properties: {
            duration: { type: 'object', properties: { fast: { type: 'string' }, normal: { type: 'string' }, slow: { type: 'string' } } },
            easing: { type: 'object', properties: { default: { type: 'string' }, in: { type: 'string' }, out: { type: 'string' } } },
          },
        },
        personality: { type: 'string', description: 'Design personality: professional, playful, minimal, bold, elegant' },
        reasoning: { type: 'string', description: 'Why these design choices suit the domain' },
      },
      required: ['colors', 'typography', 'personality'],
    },

    maxTokens: 1536,
    temperature: 0.5,
    timeoutMs: 15000,
  });
}

export function mergeDesignResults(ruleResult: any, slmResult: any): any {
  if (!slmResult) return ruleResult;
  if (!ruleResult) return slmResult;

  const merged = JSON.parse(JSON.stringify(ruleResult));

  if (slmResult.colors) {
    if (!merged.colors) merged.colors = {};
    for (const [key, value] of Object.entries(slmResult.colors)) {
      if (value && typeof value === 'string' && isValidColor(value)) {
        merged.colors[key] = value;
      }
    }
  }

  if (slmResult.darkColors) {
    if (!merged.darkMode) merged.darkMode = {};
    for (const [key, value] of Object.entries(slmResult.darkColors)) {
      if (value && typeof value === 'string' && isValidColor(value)) {
        merged.darkMode[key] = value;
      }
    }
  }

  if (slmResult.typography?.headingFont) {
    if (!merged.typography) merged.typography = {};
    merged.typography.headingFont = slmResult.typography.headingFont;
    if (slmResult.typography.bodyFont) merged.typography.bodyFont = slmResult.typography.bodyFont;
    if (slmResult.typography.monoFont) merged.typography.monoFont = slmResult.typography.monoFont;
  }

  if (slmResult.animations) {
    merged.animations = slmResult.animations;
  }

  if (slmResult.spacing) {
    merged.spacing = slmResult.spacing;
  }

  if (slmResult.borderRadius) {
    merged.borderRadius = slmResult.borderRadius;
  }

  return merged;
}

function isValidColor(color: string): boolean {
  return /^#[0-9a-fA-F]{3,8}$/.test(color) ||
         /^rgb\(/.test(color) ||
         /^hsl\(/.test(color) ||
         /^[a-z]+$/i.test(color);
}

export function scoreDesignOutput(output: any, _context: Record<string, any>): number {
  let score = 0.5;

  if (output?.colors?.primary) score += 0.1;
  if (output?.colors?.secondary) score += 0.05;
  if (output?.colors?.success && output?.colors?.error) score += 0.1;
  if (output?.typography?.headingFont && output?.typography?.bodyFont) score += 0.1;
  if (output?.animations) score += 0.05;
  if (output?.darkColors || output?.darkMode) score += 0.05;
  if (output?.reasoning) score += 0.05;

  return Math.min(score, 1.0);
}