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
      const hasScope = /(scope|overview|goals|objective|architecture|features|requirements)/i.test(content);
      if (!hasPlanHeading) {
        errors.push("Queen candidate output must contain '# Project Plan' heading.");
      }
      if (!hasScope) {
        errors.push("Queen candidate output must specify project scope, goals, and feature requirements.");
      }
      return { accepted: errors.length === 0, errors, warnings };
    }

    case 'Planner': {
      const hasReqHeading = /#\s+(Requirements|Project Requirements|Functional Requirements|Specification)/i.test(content) || /##\s+(Functional Requirements|Non-Functional Requirements|Requirements)/i.test(content);
      const hasAcceptance = /(acceptance criteria|user stories|non-functional)/i.test(content);
      if (!hasReqHeading) {
        errors.push("Planner candidate output must contain '# Requirements' heading.");
      }
      if (!hasAcceptance) {
        errors.push("Planner candidate output must include functional requirements and acceptance criteria.");
      }
      return { accepted: errors.length === 0, errors, warnings };
    }

    case 'Architect': {
      const result = validateArchitectureArtifact(content);
      if (!result.valid) {
        errors.push(...result.errors);
      }
      const hasTechStack = /(tech stack|frontend|backend|database|orm)/i.test(content);
      if (!hasTechStack) {
        errors.push("Architect candidate output must explicitly define technology stack (Frontend, Backend, Database/ORM).");
      }
      return { accepted: errors.length === 0, errors, warnings };
    }

    case 'System': {
      const hasBackendSpec = /#\s+(Backend Specification|System Spec|Backend Architecture|Server Specification)/i.test(content) || /##\s+(API|Endpoints|Server|Database|Services|Models)/i.test(content);
      const hasEndpointsOrModels = /(endpoints?|models?|routes?|controllers?|schemas?)/i.test(content);
      if (!hasBackendSpec || !hasEndpointsOrModels) {
        errors.push("System candidate output must contain a valid backend architecture, endpoints, and data contracts.");
      }
      return { accepted: errors.length === 0, errors, warnings };
    }

    case 'Designer': {
      const hasUiSpec = /#\s+(UI Specification|Designer Spec|Frontend Specification|UI Architecture)/i.test(content) || /##\s+(Components|Pages|Views|User Interface|Design System)/i.test(content);
      const hasPagesOrComponents = /(pages?|components?|views?|layouts?|styling)/i.test(content);
      if (!hasUiSpec || !hasPagesOrComponents) {
        errors.push("Designer candidate output must specify UI structure, pages/views, components, and styling rules.");
      }
      return { accepted: errors.length === 0, errors, warnings };
    }

    case 'Blueprinter': {
      const isMdBlueprint = /#\s+(Blueprint|Project Blueprint|File Ownership|File Structure)/i.test(content) || /##\s+(Modules|Files|Dependencies|Architecture)/i.test(content);
      let isJsonBlueprint = false;
      try {
        const parsed = JSON.parse(content);
        isJsonBlueprint = (Array.isArray(parsed) || (typeof parsed === 'object' && parsed !== null)) && Boolean(parsed.files || Array.isArray(parsed));
      } catch (e) {
        // Not JSON
      }
      if (!isMdBlueprint && !isJsonBlueprint) {
        errors.push("Blueprinter candidate output must be a valid blueprint markdown specification or file structure manifest JSON.");
      }
      return { accepted: errors.length === 0, errors, warnings };
    }

    case 'Coder': {
      try {
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.files)) {
          if (parsed.files.length === 0) {
            errors.push("Coder workspace manifest contains zero generated files.");
          }
          if (!parsed.schemaVersion || !parsed.projectRoot || !parsed.directories) {
            errors.push("Coder workspace manifest is missing mandatory schema fields.");
          }
          return { accepted: errors.length === 0, errors, warnings };
        }
      } catch (e: any) {
        errors.push(`Coder candidate output is not a valid WorkspaceManifest JSON: ${e.message}`);
      }
      if (errors.length === 0 && content.length < 10) {
        errors.push("Coder candidate content is invalid or empty.");
      }
      return { accepted: errors.length === 0, errors, warnings };
    }

    case 'Tester': {
      const hasReportHeading = /#\s+(Test Report|Verification Report|Tester Report)/i.test(content) || /##\s+(Result|Results|Validation|Summary)/i.test(content);
      const hasResultStatus = /(PASS|FAIL)/i.test(content);
      if (!hasReportHeading) {
        errors.push("Tester candidate output must be a structured '# Test Report'.");
      }
      if (!hasResultStatus) {
        errors.push("Tester candidate report must state an explicit result status (PASS or FAIL).");
      }
      return { accepted: errors.length === 0, errors, warnings };
    }

    case 'Debugger': {
      const hasDebugHeading = /#\s+(Debug Report|Debugger Report|Repair Report)/i.test(content) || /##\s+(Result|Patches|Repairs|Fixes)/i.test(content) || content.includes('patches');
      const hasResultStatus = /(PASS|FAIL)/i.test(content);
      if (!hasDebugHeading) {
        errors.push("Debugger candidate output must be a structured '# Debug Report'.");
      }
      if (!hasResultStatus) {
        errors.push("Debugger candidate report must state an explicit repair status (PASS or FAIL).");
      }
      return { accepted: errors.length === 0, errors, warnings };
    }

    case 'Security': {
      const hasSecurityHeading = /#\s+(Security Report|Security Evaluation|Security Audit)/i.test(content) || /##\s+(Result|Security Audit|Vulnerabilities|Status)/i.test(content);
      const isPass = /PASS/i.test(content);
      if (!hasSecurityHeading) {
        errors.push("Security candidate output must be a structured '# Security Report'.");
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
        errors.push("Reviewer candidate output must be a structured '# Review Report'.");
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

