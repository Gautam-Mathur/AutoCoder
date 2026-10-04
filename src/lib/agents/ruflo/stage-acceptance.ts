import { validateArchitectureArtifact } from './spec-contract';

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

export function extractRequiredSection(content: string, heading: string): string {
  const headingIndex = content.indexOf(heading);
  if (headingIndex === -1) return '';
  const startIndex = headingIndex + heading.length;
  const nextHeadingMatch = content.slice(startIndex).match(/\n#{1,3}\s+/);
  const endIndex = nextHeadingMatch ? startIndex + nextHeadingMatch.index! : content.length;
  return content.slice(startIndex, endIndex).trim();
}

function validateQueen(content: string): AcceptanceResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const requiredHeadings = [
    '### Project Name',
    '### Project Goal',
    '### MVP Scope',
    '### Technical Constraints',
    '### Risks',
  ];

  for (const heading of requiredHeadings) {
    if (!content.includes(heading)) {
      errors.push(`Queen candidate output must contain "${heading}".`);
    }
  }

  const projectName = extractRequiredSection(content, '### Project Name');
  const projectGoal = extractRequiredSection(content, '### Project Goal');
  const scope = extractRequiredSection(content, '### MVP Scope');
  const constraints = extractRequiredSection(content, '### Technical Constraints');
  const risks = extractRequiredSection(content, '### Risks');

  if (!projectName) errors.push('Queen Project Name section is empty.');
  if (!projectGoal) errors.push('Queen Project Goal section is empty.');
  if (!scope) errors.push('Queen MVP Scope section is empty.');
  if (!constraints) errors.push('Queen Technical Constraints section is empty.');
  if (!risks) errors.push('Queen Risks section is empty.');

  if (content.match(/^###\s+/gm)?.length !== 5) {
    warnings.push('Queen output contains unexpected additional H3 sections.');
  }

  return { accepted: errors.length === 0, errors, warnings };
}

function validatePlanner(content: string): AcceptanceResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const requiredHeadings = [
    '### Features',
    '### Functional Requirements',
    '### Acceptance Criteria',
  ];

  for (const heading of requiredHeadings) {
    if (!content.includes(heading)) {
      errors.push(`Planner candidate output must contain "${heading}".`);
    }
  }

  const features = extractRequiredSection(content, '### Features');
  const funcReqs = extractRequiredSection(content, '### Functional Requirements');
  const criteria = extractRequiredSection(content, '### Acceptance Criteria');

  if (!features) errors.push('Planner Features section is empty.');
  if (!funcReqs) errors.push('Planner Functional Requirements section is empty.');
  if (!criteria) errors.push('Planner Acceptance Criteria section is empty.');

  if (features && !/(Description|Priority|Depends On)/i.test(features)) {
    warnings.push('Planner Features section should contain Description, Priority, and Depends On fields.');
  }

  return { accepted: errors.length === 0, errors, warnings };
}

function validateArchitect(content: string): AcceptanceResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const requiredHeadings = [
    '### Tech Stack',
    '### Project Folder Structure',
    '### Modules',
    '### Conventions',
  ];

  for (const heading of requiredHeadings) {
    if (!content.includes(heading)) {
      errors.push(`Architect candidate output must contain "${heading}".`);
    }
  }

  const archResult = validateArchitectureArtifact(content);
  if (!archResult.valid) {
    errors.push(...archResult.errors);
  }

  const techStack = extractRequiredSection(content, '### Tech Stack');
  if (techStack && !/(Frontend|Backend|Database|ORM)/i.test(techStack)) {
    errors.push('Architect Tech Stack section must define Frontend, Backend, Database, and ORM.');
  }

  return { accepted: errors.length === 0, errors, warnings };
}

function validateSystem(content: string): AcceptanceResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (content.includes('### No Backend Required')) {
    if (!/No backend, database, or API endpoints are needed/i.test(content) && !/frontend-only/i.test(content)) {
      warnings.push('No Backend Required section is brief.');
    }
    return { accepted: true, errors: [], warnings };
  }

  const requiredHeadings = [
    '### Database Design',
    '### Seed Data',
    '### API Endpoints',
  ];

  for (const heading of requiredHeadings) {
    if (!content.includes(heading)) {
      errors.push(`System candidate output must contain "${heading}".`);
    }
  }

  const dbDesign = extractRequiredSection(content, '### Database Design');
  const apiEndpoints = extractRequiredSection(content, '### API Endpoints');

  if (!dbDesign) errors.push('System Database Design section is empty.');
  if (!apiEndpoints) errors.push('System API Endpoints section is empty.');

  return { accepted: errors.length === 0, errors, warnings };
}

function validateDesigner(content: string): AcceptanceResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const requiredHeadings = [
    '### Design System',
    '### Pages',
    '### Components',
    '### Global Feedback',
  ];

  for (const heading of requiredHeadings) {
    if (!content.includes(heading)) {
      errors.push(`Designer candidate output must contain "${heading}".`);
    }
  }

  const designSystem = extractRequiredSection(content, '### Design System');
  const pages = extractRequiredSection(content, '### Pages');
  const components = extractRequiredSection(content, '### Components');
  const globalFeedback = extractRequiredSection(content, '### Global Feedback');

  if (!designSystem) errors.push('Designer Design System section is empty.');
  if (!pages) errors.push('Designer Pages section is empty.');
  if (!components) errors.push('Designer Components section is empty.');
  if (!globalFeedback) errors.push('Designer Global Feedback section is empty.');

  return { accepted: errors.length === 0, errors, warnings };
}

function validateBlueprinter(content: string): AcceptanceResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!content.includes('### File:')) {
    errors.push('Blueprinter candidate output must contain at least one "### File:" section.');
    return { accepted: false, errors, warnings };
  }

  const fileSections = content.split(/### File:\s+/).filter(Boolean);
  if (fileSections.length === 0) {
    errors.push('Blueprinter output does not specify any files.');
  }

  for (const section of fileSections) {
    const lines = section.trim().split('\n');
    const filePath = lines[0].trim();
    if (!filePath) {
      errors.push('Blueprinter section missing file path.');
    }
  }

  return { accepted: errors.length === 0, errors, warnings };
}

function validateCoder(content: string): AcceptanceResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const parsed = JSON.parse(content);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.files)) {
      errors.push('Coder candidate output is not a valid WorkspaceManifest JSON object.');
      return { accepted: false, errors, warnings };
    }
    if (parsed.files.length === 0) {
      errors.push('Coder workspace manifest contains zero generated files.');
    }
    if (!parsed.schemaVersion || !parsed.projectRoot || !parsed.directories) {
      errors.push('Coder workspace manifest is missing mandatory schema fields.');
    }
  } catch (e: any) {
    errors.push(`Coder candidate output is not a valid WorkspaceManifest JSON: ${e.message}`);
  }

  return { accepted: errors.length === 0, errors, warnings };
}

function validateTester(content: string): AcceptanceResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const hasReportHeading = /#\s+(Test Report|Verification Report)/i.test(content) || /##\s+(Result|Summary)/i.test(content);
  const hasResultStatus = /(PASS|FAIL)/i.test(content);

  if (!hasReportHeading) {
    errors.push('Tester candidate output must contain a "# Test Report" heading.');
  }
  if (!hasResultStatus) {
    errors.push('Tester candidate report must state an explicit result status (PASS or FAIL).');
  }

  return { accepted: errors.length === 0, errors, warnings };
}

function validateDebugger(content: string): AcceptanceResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const parsed = JSON.parse(content);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.patches)) {
      errors.push('Debugger candidate output must be a valid JSON object with a "patches" array.');
      return { accepted: false, errors, warnings };
    }

    for (let i = 0; i < parsed.patches.length; i++) {
      const p = parsed.patches[i];
      if (!p.file || typeof p.file !== 'string') {
        errors.push(`Patch #${i + 1} is missing a valid 'file' string.`);
      } else if (p.file.startsWith('/') || p.file.includes('..')) {
        errors.push(`Patch #${i + 1} contains unsafe or absolute file path '${p.file}'.`);
      }
      if (typeof p.startLine !== 'number' || p.startLine < 1) {
        errors.push(`Patch #${i + 1} has invalid startLine (${p.startLine}).`);
      }
      if (typeof p.endLine !== 'number' || p.endLine < p.startLine) {
        errors.push(`Patch #${i + 1} has invalid endLine (${p.endLine}).`);
      }
      if (typeof p.replacement !== 'string') {
        errors.push(`Patch #${i + 1} is missing a string replacement.`);
      }
      if (!p.reason || typeof p.reason !== 'string') {
        errors.push(`Patch #${i + 1} is missing a non-empty reason string.`);
      }
    }
  } catch (e: any) {
    errors.push(`Debugger candidate output is not valid JSON: ${e.message}`);
  }

  return { accepted: errors.length === 0, errors, warnings };
}

function validateSecurity(content: string): AcceptanceResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const requiredHeadings = [
    '### Overall Status',
    '### Security Score',
    '### Vulnerabilities Found',
    '### Security Checks Performed',
    '### Recommendations',
  ];

  for (const heading of requiredHeadings) {
    if (!content.includes(heading)) {
      errors.push(`Security candidate output must contain "${heading}".`);
    }
  }

  const overallStatus = extractRequiredSection(content, '### Overall Status');
  const validStatuses = ['SECURE', 'SECURE_WITH_WARNINGS', 'VULNERABLE', 'CRITICAL'];
  if (!overallStatus || !validStatuses.some((s) => overallStatus.includes(s))) {
    errors.push(`Security Overall Status must be one of: ${validStatuses.join(', ')}.`);
  }

  const scoreText = extractRequiredSection(content, '### Security Score');
  const scoreMatch = scoreText.match(/\b\d{1,3}\b/);
  if (!scoreMatch || parseInt(scoreMatch[0], 10) < 0 || parseInt(scoreMatch[0], 10) > 100) {
    errors.push('Security Score must be a valid number between 0 and 100.');
  }

  return { accepted: errors.length === 0, errors, warnings };
}

function validateReviewer(content: string): AcceptanceResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const parsed = JSON.parse(content);
    if (!parsed || typeof parsed !== 'object') {
      errors.push('Reviewer candidate output must be a valid JSON object.');
      return { accepted: false, errors, warnings };
    }

    if (!parsed.status || (parsed.status !== 'PASS' && parsed.status !== 'REPAIR_REQUIRED')) {
      errors.push('Reviewer status must be either "PASS" or "REPAIR_REQUIRED".');
    }

    if (!Array.isArray(parsed.findings)) {
      errors.push('Reviewer output must contain a "findings" array.');
    } else {
      for (let i = 0; i < parsed.findings.length; i++) {
        const f = parsed.findings[i];
        if (!f.id || !f.severity || !f.category || !f.description) {
          errors.push(`Reviewer finding #${i + 1} is missing mandatory fields (id, severity, category, description).`);
        }
      }
    }

    if (!parsed.summary || typeof parsed.summary !== 'string') {
      errors.push('Reviewer output must contain a non-empty "summary" string.');
    }
  } catch (e: any) {
    errors.push(`Reviewer candidate output is not valid JSON: ${e.message}`);
  }

  return { accepted: errors.length === 0, errors, warnings };
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
      return validateSystem(content);
    case 'Designer':
      return validateDesigner(content);
    case 'Blueprinter':
      return validateBlueprinter(content);
    case 'Coder':
      return validateCoder(content);
    case 'Tester':
      return validateTester(content);
    case 'Debugger':
      return validateDebugger(content);
    case 'Security':
      return validateSecurity(content);
    case 'Reviewer':
      return validateReviewer(content);
    default:
      return { accepted: true, errors: [], warnings: [] };
  }
}

