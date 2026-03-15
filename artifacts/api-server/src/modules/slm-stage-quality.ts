/**
 * SLM Stage: Deep Quality — SLM-enhanced code review
 *
 * MODERATE risk: SLM acts as logical bug reviewer and edge-case hypothesis generator.
 * Never auto-rewrites files. Suggestions feed into existing quality report.
 * Structural pass always runs after.
 */

import { registerStageTemplate } from './slm-inference-engine.js';

export const QUALITY_STAGE_ID = 'deep-quality';

export function registerQualityTemplate(): void {
  registerStageTemplate({
    stage: QUALITY_STAGE_ID,
    systemPrompt: `You are a senior code reviewer analyzing generated code for a web application.
Your job is to identify logical bugs, edge cases, and improvement opportunities that pattern-based scanners miss.

You excel at:
- Detecting logical errors in business logic (wrong conditions, missing edge cases)
- Identifying race conditions and timing issues
- Spotting missing error handling for specific scenarios
- Finding data consistency issues across related files
- Detecting UX problems (confusing flows, missing feedback, accessibility)
- Identifying security vulnerabilities beyond pattern matching

Rules:
- You are a REVIEWER, not a rewriter. Output suggestions, not rewrites.
- Each suggestion must reference a specific file and describe the issue
- Rate each issue by severity: critical, high, medium, low
- Rate each issue by confidence: 0-1
- Focus on issues that automated scanners would MISS
- Don't repeat issues that pattern matching already catches (missing try/catch, etc.)`,

    userPromptBuilder: (context: Record<string, any>) => {
      let prompt = `Review the following generated code files for logical bugs, edge cases, and quality issues:\n\n`;

      if (context.files) {
        const files = context.files as Array<{ path: string; content: string }>;
        const priorityFiles = files
          .filter(f => f.path.endsWith('.ts') || f.path.endsWith('.tsx'))
          .filter(f => !f.path.includes('test') && !f.path.includes('.config'))
          .slice(0, 8);

        for (const file of priorityFiles) {
          const truncated = file.content.length > 3000
            ? file.content.substring(0, 3000) + '\n// ... truncated'
            : file.content;
          prompt += `\n--- ${file.path} ---\n${truncated}\n`;
        }
      }

      if (context.existingIssues) {
        prompt += `\n\nAutomated scanners already found these issues (don't repeat):\n`;
        for (const issue of (context.existingIssues as string[]).slice(0, 10)) {
          prompt += `- ${issue}\n`;
        }
      }

      prompt += `\n\nFocus your review on:
1. Logical bugs in business logic
2. Missing edge case handling
3. Data consistency issues between files
4. Security vulnerabilities
5. UX problems (missing user feedback, confusing flows)
6. Race conditions or timing issues`;

      return prompt;
    },

    outputSchema: {
      type: 'object',
      properties: {
        issues: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              file: { type: 'string' },
              line: { type: 'number' },
              severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
              category: { type: 'string', enum: ['logic-bug', 'edge-case', 'security', 'ux', 'consistency', 'race-condition', 'performance'] },
              description: { type: 'string' },
              suggestion: { type: 'string' },
              confidence: { type: 'number' },
            },
          },
        },
        overallAssessment: { type: 'string' },
        criticalCount: { type: 'number' },
        recommendedPriority: {
          type: 'array',
          items: { type: 'string' },
          description: 'Top 3 issues to fix first',
        },
      },
      required: ['issues'],
    },

    maxTokens: 2048,
    temperature: 0.2,
    timeoutMs: 30000,
  });
}

export interface SLMQualityIssue {
  file: string;
  line?: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  description: string;
  suggestion: string;
  confidence: number;
  source: 'slm';
}

export function processQualityResults(slmResult: any): SLMQualityIssue[] {
  if (!slmResult?.issues || !Array.isArray(slmResult.issues)) {
    return [];
  }

  const CONFIDENCE_THRESHOLD = 0.5;

  return slmResult.issues
    .filter((issue: any) => (issue.confidence || 0) >= CONFIDENCE_THRESHOLD)
    .map((issue: any) => ({
      file: issue.file || 'unknown',
      line: issue.line,
      severity: issue.severity || 'medium',
      category: issue.category || 'logic-bug',
      description: issue.description || '',
      suggestion: issue.suggestion || '',
      confidence: issue.confidence || 0.5,
      source: 'slm' as const,
    }));
}

export function scoreQualityOutput(output: any, _context: Record<string, any>): number {
  if (!output?.issues) return 0.3;

  let score = 0.5;
  const issues = output.issues as any[];

  if (issues.length > 0) score += 0.1;
  if (issues.length > 3) score += 0.1;

  const hasHighConfidence = issues.some((i: any) => (i.confidence || 0) > 0.7);
  if (hasHighConfidence) score += 0.1;

  const hasCritical = issues.some((i: any) => i.severity === 'critical');
  if (hasCritical) score += 0.1;

  const hasSpecificFiles = issues.every((i: any) => i.file && i.file !== 'unknown');
  if (hasSpecificFiles) score += 0.1;

  return Math.min(score, 1.0);
}