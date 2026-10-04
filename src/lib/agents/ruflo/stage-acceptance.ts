import { validateProjectContract, validateArchitectureArtifact } from './spec-contract';
import { validateGeneratedProject } from './project-validator';

export interface StageCandidate {
  stage: string;
  executionId: string;
  attempt: number;
  content: string;
  contentHash: string;
  generatedAt: Date;
}

export interface AcceptanceResult<T = unknown> {
  accepted: boolean;
  artifact?: T;
  errors: string[];
  warnings: string[];
}

export interface StageAcceptanceContext {
  conversationId: string;
  pipelineRunId: string;
  candidate: StageCandidate;
  upstreamContext?: Record<string, string>;
}

export async function validateStageCandidate(
  ctx: StageAcceptanceContext
): Promise<AcceptanceResult> {
  switch (ctx.candidate.stage) {
    case 'Architect': {
      const result = validateArchitectureArtifact(ctx.candidate.content);
      return {
        accepted: result.valid,
        errors: result.errors,
        warnings: result.warnings,
      };
    }

    case 'Planner': {
      // Basic plan artifact check
      const valid = ctx.candidate.content.includes('# Project Plan') || ctx.candidate.content.length > 50;
      return {
        accepted: valid,
        errors: valid ? [] : ['Planner candidate output failed validation.'],
        warnings: [],
      };
    }

    case 'Blueprinter': {
      try {
        const parsed = JSON.parse(ctx.candidate.content);
        const valid = Array.isArray(parsed) || (typeof parsed === 'object' && parsed !== null);
        return {
          accepted: valid,
          errors: valid ? [] : ['Blueprinter candidate must produce valid JSON.'],
          warnings: [],
        };
      } catch (err: any) {
        return {
          accepted: false,
          errors: [`Blueprinter candidate JSON parse error: ${err.message}`],
          warnings: [],
        };
      }
    }

    case 'Coder': {
      // Coder file validation
      return {
        accepted: ctx.candidate.content.trim().length > 0,
        errors: ctx.candidate.content.trim().length > 0 ? [] : ['Coder candidate content is empty.'],
        warnings: [],
      };
    }

    default:
      return {
        accepted: true,
        errors: [],
        warnings: [],
      };
  }
}
