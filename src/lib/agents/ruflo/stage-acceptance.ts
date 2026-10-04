import { validateArchitectureArtifact } from './spec-contract';
import { parseArchitecture, parseCanonicalArchitecture } from './architecture-parser';
import {
  countHeading,
  extractRequiredSection,
} from './contracts/markdown-sections';
import {
  computeAuthorizedFileSet,
  validateWorkspaceManifest as validateManifestPolicy,
  normalizeProjectPath,
  isControlPlaneArtifact,
  AuthorizedFileSet,
} from './workspace-policy';

import { parseTesterOutput } from './contracts/schemas/tester';
import { parseSecurityOutput } from './contracts/schemas/security';
import { parseReviewerOutput } from './contracts/schemas/reviewer';
import { parseDebuggerOutput } from './contracts/schemas/debugger';
import { WorkspaceManifest } from './contracts/schemas/coder';

export { extractRequiredSection };

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
  evidence?: {
    workspaceFiles?: Map<string, string> | Record<string, string>;
    verificationRun?: any;
    currentWorkspaceHash?: string;
    authorized?: AuthorizedFileSet;
  };
}

function validateQueen(content: string): AcceptanceResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const requiredHeadings = [
    'Project Name',
    'Project Goal',
    'MVP Scope',
    'Technical Constraints',
    'Risks',
  ];

  for (const s of requiredHeadings) {
    const count = countHeading(content, `### ${s}`);
    if (count === 0) {
      errors.push(`Queen Contract Error: Missing required section "### ${s}".`);
    } else if (count > 1) {
      errors.push(`Queen Contract Error: Duplicate section "### ${s}".`);
    }
  }

  if (errors.length > 0) {
    return { accepted: false, errors, warnings };
  }

  const projectName = extractRequiredSection(content, 'Project Name');
  const projectGoal = extractRequiredSection(content, 'Project Goal');
  const scope = extractRequiredSection(content, 'MVP Scope');
  const constraints = extractRequiredSection(content, 'Technical Constraints');
  const risks = extractRequiredSection(content, 'Risks');

  if (!projectName) errors.push('Queen Project Name section is empty.');
  if (!projectGoal) errors.push('Queen Project Goal section is empty.');
  if (!scope) errors.push('Queen MVP Scope section is empty.');
  if (!constraints) errors.push('Queen Technical Constraints section is empty.');
  if (!risks) errors.push('Queen Risks section is empty.');

  return { accepted: errors.length === 0, errors, warnings };
}

function validatePlanner(content: string): AcceptanceResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const requiredHeadings = [
    'Features',
    'Functional Requirements',
    'Acceptance Criteria',
  ];

  for (const s of requiredHeadings) {
    const count = countHeading(content, `### ${s}`);
    if (count === 0) {
      errors.push(`Planner Contract Error: Missing required section "### ${s}".`);
    } else if (count > 1) {
      errors.push(`Planner Contract Error: Duplicate section "### ${s}".`);
    }
  }

  if (errors.length > 0) {
    return { accepted: false, errors, warnings };
  }

  const features = extractRequiredSection(content, 'Features');
  const funcReqs = extractRequiredSection(content, 'Functional Requirements');
  const criteria = extractRequiredSection(content, 'Acceptance Criteria');

  if (!features) errors.push('Planner Features section is empty.');
  if (!funcReqs) errors.push('Planner Functional Requirements section is empty.');
  if (!criteria) errors.push('Planner Acceptance Criteria section is empty.');

  // Validate Feature-NNN identifiers
  const featureIds = features.match(/\bFeature-\d{3}\b/g) || [];
  if (featureIds.length === 0) {
    errors.push('Planner Contract Error: Features section must declare at least one feature using "Feature-NNN" format (e.g. Feature-001).');
  } else {
    const seen = new Set<string>();
    for (const fid of featureIds) {
      if (seen.has(fid)) {
        errors.push(`Planner Contract Error: Duplicate Feature ID "${fid}".`);
      }
      seen.add(fid);
    }
  }

  return { accepted: errors.length === 0, errors, warnings };
}

function validateArchitect(content: string): AcceptanceResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const archResult = validateArchitectureArtifact(content);
  if (!archResult.valid) {
    errors.push(...archResult.errors);
  }
  if (archResult.warnings.length > 0) {
    warnings.push(...archResult.warnings);
  }

  const techStack = extractRequiredSection(content, 'Tech Stack');
  if (techStack && !/(Frontend|Backend|Database|ORM)/i.test(techStack)) {
    errors.push('Architect Tech Stack section must define Frontend, Backend, Database, and ORM.');
  }

  return { accepted: errors.length === 0, errors, warnings };
}

function validateSystem(content: string, ctx?: StageAcceptanceContext): AcceptanceResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (content.includes('### No Backend Required')) {
    if (!/No backend, database, or API endpoints are needed/i.test(content) && !/frontend-only/i.test(content)) {
      warnings.push('No Backend Required section is brief.');
    }
    return { accepted: true, errors: [], warnings };
  }

  const requiredHeadings = ['Database Design', 'Seed Data', 'API Endpoints'];

  for (const s of requiredHeadings) {
    const count = countHeading(content, `### ${s}`);
    if (count === 0) {
      errors.push(`System Contract Error: Missing required section "### ${s}".`);
    } else if (count > 1) {
      errors.push(`System Contract Error: Duplicate section "### ${s}".`);
    }
  }

  if (errors.length > 0) {
    return { accepted: false, errors, warnings };
  }

  const dbDesign = extractRequiredSection(content, 'Database Design');
  const apiEndpoints = extractRequiredSection(content, 'API Endpoints');

  if (!dbDesign) errors.push('System Database Design section is empty.');
  if (!apiEndpoints) errors.push('System API Endpoints section is empty.');

  // Validate API Endpoint file paths against Architecture project files
  if (ctx?.upstreamContext?.['architecture.md']) {
    const parsedArch = parseArchitecture(ctx.upstreamContext['architecture.md']);
    if (parsedArch.projectFiles.length > 0) {
      const archFilesLower = new Set(parsedArch.projectFiles.map((f) => f.toLowerCase()));
      const endpointPathTokens = apiEndpoints.match(/[\/\w\-]+\.(?:ts|tsx|js|jsx|json)/gi) || [];
      for (const token of endpointPathTokens) {
        const norm = normalizeProjectPath(token).toLowerCase();
        if (!archFilesLower.has(norm)) {
          errors.push(`System Contract Error: API endpoint path "${token}" is absent from architecture project files.`);
        }
      }
    }
  }

  return { accepted: errors.length === 0, errors, warnings };
}

function validateDesigner(content: string, ctx?: StageAcceptanceContext): AcceptanceResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const requiredHeadings = [
    'Design System',
    'Pages',
    'Components',
    'Global Feedback',
  ];

  for (const s of requiredHeadings) {
    const count = countHeading(content, `### ${s}`);
    if (count === 0) {
      errors.push(`Designer Contract Error: Missing required section "### ${s}".`);
    } else if (count > 1) {
      errors.push(`Designer Contract Error: Duplicate section "### ${s}".`);
    }
  }

  if (errors.length > 0) {
    return { accepted: false, errors, warnings };
  }

  const designSystem = extractRequiredSection(content, 'Design System');
  const pages = extractRequiredSection(content, 'Pages');
  const components = extractRequiredSection(content, 'Components');
  const globalFeedback = extractRequiredSection(content, 'Global Feedback');

  if (!designSystem) errors.push('Designer Design System section is empty.');
  if (!pages) errors.push('Designer Pages section is empty.');
  if (!components) errors.push('Designer Components section is empty.');
  if (!globalFeedback) errors.push('Designer Global Feedback section is empty.');

  // Check Feature-NNN traceability from Planner
  if (ctx?.upstreamContext?.['requirements.md']) {
    const reqContent = ctx.upstreamContext['requirements.md'];
    const declaredFeatures = Array.from(new Set(reqContent.match(/\bFeature-\d{3}\b/g) || []));

    const designerText = `${pages}\n${components}`;
    for (const fid of declaredFeatures) {
      if (!designerText.includes(fid)) {
        errors.push(`Designer Contract Error: Feature ID "${fid}" declared in requirements.md is missing from Designer pages/components.`);
      }
    }
  }

  return { accepted: errors.length === 0, errors, warnings };
}

function validateBlueprinter(content: string, ctx?: StageAcceptanceContext): AcceptanceResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const archContent = ctx?.upstreamContext?.['architecture.md'];
  if (!archContent) {
    errors.push('Blueprinter Contract Error: Missing upstream "architecture.md" artifact context for validation.');
    return { accepted: false, errors, warnings };
  }

  const { authorizedFileSet, errors: authErrors } = computeAuthorizedFileSet(archContent, content);
  if (!authorizedFileSet || authErrors.length > 0) {
    errors.push(...authErrors);
    return { accepted: false, errors, warnings };
  }

  return { accepted: true, errors: [], warnings: [] };
}

function validateCoder(content: string, ctx?: StageAcceptanceContext): AcceptanceResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  let manifest: WorkspaceManifest;
  try {
    manifest = JSON.parse(content);
    if (!manifest || typeof manifest !== 'object' || !Array.isArray(manifest.files)) {
      errors.push('Coder candidate output is not a valid WorkspaceManifest JSON object.');
      return { accepted: false, errors, warnings };
    }
  } catch (e: any) {
    errors.push(`Coder candidate output is not a valid WorkspaceManifest JSON: ${e.message}`);
    return { accepted: false, errors, warnings };
  }

  if (ctx?.evidence?.authorized && ctx.evidence.workspaceFiles) {
    const valRes = validateManifestPolicy({
      manifest,
      workspaceFiles: ctx.evidence.workspaceFiles,
      authorized: ctx.evidence.authorized,
    });
    if (!valRes.valid) {
      errors.push(...valRes.errors);
    }
  }

  return { accepted: errors.length === 0, errors, warnings };
}

function validateTester(content: string, ctx?: StageAcceptanceContext): AcceptanceResult {
  const { output, errors } = parseTesterOutput(content);
  if (!output || errors.length > 0) {
    return { accepted: false, errors, warnings: [] };
  }

  const extraErrors: string[] = [];
  if (output.result !== 'PASS') {
    extraErrors.push('Tester Contract Error: Verification result is FAIL.');
  }

  if (ctx?.evidence?.currentWorkspaceHash && output.workspaceHash !== ctx.evidence.currentWorkspaceHash) {
    extraErrors.push(
      `Tester Contract Error: Stale workspace hash in test report. Expected "${ctx.evidence.currentWorkspaceHash}", got "${output.workspaceHash}".`
    );
  }

  return { accepted: extraErrors.length === 0, errors: extraErrors, warnings: [] };
}

function validateDebugger(content: string, ctx?: StageAcceptanceContext): AcceptanceResult {
  const { output, errors } = parseDebuggerOutput(content);
  if (!output || errors.length > 0) {
    return { accepted: false, errors, warnings: [] };
  }

  const extraErrors: string[] = [];

  // Check if patches mention any control plane artifacts
  if (output.patchesApplied) {
    for (const line of output.patchesApplied.split('\n')) {
      const fileMatch = line.match(/`([^`]+)`/);
      if (fileMatch) {
        const norm = normalizeProjectPath(fileMatch[1]);
        if (isControlPlaneArtifact(norm)) {
          extraErrors.push(`Debugger Contract Error: Debugger patch targets control plane artifact "${norm}".`);
        }
      }
    }
  }

  return { accepted: extraErrors.length === 0, errors: extraErrors, warnings: [] };
}

function validateSecurity(content: string, ctx?: StageAcceptanceContext): AcceptanceResult {
  const { output, errors } = parseSecurityOutput(content);
  if (!output || errors.length > 0) {
    return { accepted: false, errors, warnings: [] };
  }

  const extraErrors: string[] = [];

  if (ctx?.evidence?.currentWorkspaceHash && output.workspaceHash !== ctx.evidence.currentWorkspaceHash) {
    extraErrors.push(
      `Security Contract Error: Stale workspace hash in security report. Expected "${ctx.evidence.currentWorkspaceHash}", got "${output.workspaceHash}".`
    );
  }

  return { accepted: extraErrors.length === 0, errors: extraErrors, warnings: [] };
}

function validateReviewer(content: string, ctx?: StageAcceptanceContext): AcceptanceResult {
  const { output, errors } = parseReviewerOutput(content);
  if (!output || errors.length > 0) {
    return { accepted: false, errors, warnings: [] };
  }

  const extraErrors: string[] = [];

  if (output.qualityScore < 80) {
    extraErrors.push(`Reviewer Contract Error: Quality score (${output.qualityScore}) is below required minimum of 80.`);
  }
  if (!output.architecturalConformance) {
    extraErrors.push('Reviewer Contract Error: Architectural conformance is false.');
  }
  if (!output.requirementCoverage) {
    extraErrors.push('Reviewer Contract Error: Requirement coverage is false.');
  }

  if (ctx?.evidence?.currentWorkspaceHash && output.workspaceHash !== ctx.evidence.currentWorkspaceHash) {
    extraErrors.push(
      `Reviewer Contract Error: Stale workspace hash in reviewer report. Expected "${ctx.evidence.currentWorkspaceHash}", got "${output.workspaceHash}".`
    );
  }

  return { accepted: extraErrors.length === 0, errors: extraErrors, warnings: [] };
}

export async function validateStageCandidate(
  ctx: StageAcceptanceContext
): Promise<AcceptanceResult> {
  const content = ctx.candidate.content.trim();

  if (!content) {
    return {
      accepted: false,
      errors: [`Candidate content for stage '${ctx.candidate.stage}' is empty.`],
      warnings: [],
    };
  }

  switch (ctx.candidate.stage) {
    case 'Queen':
      return validateQueen(content);
    case 'Planner':
      return validatePlanner(content);
    case 'Architect':
      return validateArchitect(content);
    case 'System':
      return validateSystem(content, ctx);
    case 'Designer':
      return validateDesigner(content, ctx);
    case 'Blueprinter':
      return validateBlueprinter(content, ctx);
    case 'Coder':
      return validateCoder(content, ctx);
    case 'Tester':
      return validateTester(content, ctx);
    case 'Debugger':
      return validateDebugger(content, ctx);
    case 'Security':
      return validateSecurity(content, ctx);
    case 'Reviewer':
      return validateReviewer(content, ctx);
    default:
      return { accepted: true, errors: [], warnings: [] };
  }
}
