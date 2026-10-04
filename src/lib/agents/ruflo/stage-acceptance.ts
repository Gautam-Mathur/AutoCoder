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
  const content = ctx.candidate.content.trim();
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!content) {
    return {
      accepted: false,
      errors: [`Candidate content for stage '${ctx.candidate.stage}' is empty.`],
      warnings: [],
    };
  }

  switch (ctx.candidate.stage) {
    case 'Queen': {
      const hasPlanHeading = /#\s+(Project Plan|Plan|Executive Summary|Architectural Goal|Implementation Plan)/i.test(content);
      const hasScope = /(scope|overview|objective|architecture|requirements)/i.test(content);
      if (!hasPlanHeading && !hasScope) {
        errors.push("Queen candidate output must contain a valid project plan heading and scope specification.");
      }
      return { accepted: errors.length === 0, errors, warnings };
    }

    case 'Planner': {
      const hasReqHeading = /#\s+(Requirements|Project Requirements|Functional Requirements|Specification)/i.test(content) || /##\s+(Requirements|Functional Requirements|Non-Functional Requirements)/i.test(content);
      const hasContent = content.length >= 100;
      if (!hasReqHeading || !hasContent) {
        errors.push("Planner candidate output must contain structured functional/non-functional requirements.");
      }
      return { accepted: errors.length === 0, errors, warnings };
    }

    case 'Architect': {
      const result = validateArchitectureArtifact(content);
      return {
        accepted: result.valid,
        errors: result.errors,
        warnings: result.warnings,
      };
    }

    case 'System': {
      const hasBackendSpec = /#\s+(Backend Specification|System Spec|Backend Architecture|Server Specification)/i.test(content) || /##\s+(API|Endpoints|Server|Database|Services)/i.test(content);
      if (!hasBackendSpec) {
        errors.push("System candidate output must contain a valid backend architecture and API specification.");
      }
      return { accepted: errors.length === 0, errors, warnings };
    }

    case 'Designer': {
      const hasUiSpec = /#\s+(UI Specification|Designer Spec|Frontend Specification|UI Architecture)/i.test(content) || /##\s+(Components|Pages|Views|User Interface|Design)/i.test(content);
      if (!hasUiSpec) {
        errors.push("Designer candidate output must contain a valid UI and frontend architecture specification.");
      }
      return { accepted: errors.length === 0, errors, warnings };
    }

    case 'Blueprinter': {
      const isMdBlueprint = /#\s+(Blueprint|Project Blueprint|File Ownership|File Structure)/i.test(content) || /##\s+(Modules|Files|Dependencies|Architecture)/i.test(content);
      let isJsonBlueprint = false;
      try {
        const parsed = JSON.parse(content);
        isJsonBlueprint = Array.isArray(parsed) || (typeof parsed === 'object' && parsed !== null);
      } catch (e) {
        // Not JSON
      }
      if (!isMdBlueprint && !isJsonBlueprint) {
        errors.push("Blueprinter candidate output must be a valid blueprint markdown document or blueprint JSON manifest.");
      }
      return { accepted: errors.length === 0, errors, warnings };
    }

    case 'Coder': {
      try {
        const parsed = JSON.parse(content);
        if (parsed && Array.isArray(parsed.files)) {
          return { accepted: true, errors: [], warnings: [] };
        }
      } catch (e) {
        // Not manifest JSON, check file content
      }
      if (content.length < 10) {
        errors.push("Coder candidate content is invalid or empty.");
      }
      return { accepted: errors.length === 0, errors, warnings };
    }

    case 'Tester': {
      const hasReportHeading = /#\s+(Test Report|Verification Report|Tester Report)/i.test(content) || /##\s+(Result|Results|Validation|Summary)/i.test(content);
      if (!hasReportHeading) {
        errors.push("Tester candidate output must be a structured test report.");
      }
      return { accepted: errors.length === 0, errors, warnings };
    }

    case 'Debugger': {
      const hasDebugHeading = /#\s+(Debug Report|Debugger Report|Repair Report)/i.test(content) || /##\s+(Result|Patches|Repairs|Fixes)/i.test(content) || content.includes('patches');
      if (!hasDebugHeading) {
        errors.push("Debugger candidate output must be a valid debug report or patch specification.");
      }
      return { accepted: errors.length === 0, errors, warnings };
    }

    case 'Security': {
      const hasSecurityHeading = /#\s+(Security Report|Security Evaluation|Security Audit)/i.test(content) || /##\s+(Result|Security Audit|Vulnerabilities|Status)/i.test(content);
      const isPass = /PASS/i.test(content);
      if (!hasSecurityHeading) {
        errors.push("Security candidate output must be a structured security report.");
      }
      if (!isPass) {
        errors.push("Security candidate report did not indicate PASS.");
      }
      return { accepted: errors.length === 0, errors, warnings };
    }

    case 'Reviewer': {
      const hasReviewHeading = /#\s+(Review Report|Code Review|Reviewer Report)/i.test(content) || /##\s+(Result|Assessment|Code Review|Status)/i.test(content);
      const isPass = /PASS/i.test(content);
      if (!hasReviewHeading) {
        errors.push("Reviewer candidate output must be a structured review report.");
      }
      if (!isPass) {
        errors.push("Reviewer candidate report did not indicate PASS.");
      }
      return { accepted: errors.length === 0, errors, warnings };
    }

    default:
      return { accepted: true, errors: [], warnings: [] };
  }
}
