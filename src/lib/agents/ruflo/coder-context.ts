import path from 'path';
import { getStageContract } from './contracts/registry';
import { ProjectContract } from './contracts';
import { extractProjectContract, validateProjectContract, validateArchitectureArtifact } from './spec-contract';
import { extractDependencyInterfaceAST } from './source-analysis';
import { readVirtualFile } from './vfs';

export const VFS_OUTPUT_MAP: Record<string, string> = {
  Queen: 'plan.md',
  Planner: 'requirements.md',
  Architect: 'architecture.md',
  System: 'backend_spec.md',
  Designer: 'ui_spec.md',
  Blueprinter: 'blueprint.md',
  Security: 'security_report.md',
  Reviewer: 'review_report.md',
};

export const EXPECTED_FIRST_HEADERS: Record<string, string> = {
  Queen: 'Project Name',
  Planner: 'Features',
  Architect: 'Tech Stack',
  System: 'Database Design',
  Designer: 'Design System',
  Blueprinter: 'File:',
  Security: 'Overall Status',
  Reviewer: 'Overall Assessment',
  Debugger: 'Issues Addressed',
};

export function extractMdSection(content: string, sectionName: string): string {
  const escaped = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const headerMatch = content.match(new RegExp(`(#{1,4})\\s*${escaped}`, 'i'));
  if (!headerMatch || headerMatch.index === undefined) return '';

  const headingLevel = headerMatch[1].length;
  const startIdx = headerMatch.index;
  const rest = content.substring(startIdx + headerMatch[0].length);

  const endPattern = new RegExp(`\\n#{1,${headingLevel}}\\s+[^#]`);
  const nextHeading = rest.match(endPattern);

  if (nextHeading && nextHeading.index !== undefined) {
    return content.substring(startIdx, startIdx + headerMatch[0].length + nextHeading.index).trim();
  }
  return content.substring(startIdx).trim();
}

export async function buildArtifactContext(
  conversationId: string,
  agentName: string
): Promise<string> {
  let requiredArtifacts: string[] = [];
  try {
    const contract = getStageContract(agentName);
    requiredArtifacts = contract.inputArtifacts.map((i) => i.name);
  } catch {
    return '';
  }

  if (requiredArtifacts.length === 0) return '';

  let context = '';
  const missing: string[] = [];

  for (const artifactPath of requiredArtifacts) {
    const content = await readVirtualFile(conversationId, artifactPath);
    if (content && content.trim()) {
      context += `=== ARTIFACT: ${artifactPath} ===\n${content.trim()}\n=== END ARTIFACT: ${artifactPath} ===\n\n`;
    } else {
      missing.push(artifactPath);
    }
  }

  if (missing.length > 0) {
    console.warn(`[buildArtifactContext] Agent "${agentName}" missing required artifacts: ${missing.join(', ')}`);
  }

  return context.trim();
}

export function parseSpecsRequired(blueprintSection: string): Array<{ file: string; section: string }> {
  const match = blueprintSection.match(/\*\*Specs Required\*\*:\s*(.+)/i);
  if (!match || match[1].trim().toLowerCase() === 'none') {
    return [];
  }

  return match[1]
    .split(',')
    .map((entry) => {
      const parts = entry.trim().split('#');
      const file = parts[0]?.trim() || '';
      const section = parts[1]?.trim() || '';
      return { file, section };
    })
    .filter((e) => e.file && e.section);
}

/**
 * Validates Architect candidate output against project specifications and architecture contracts.
 */
export async function validateArchitectOutput(
  conversationId: string,
  content: string
): Promise<{
  valid: boolean;
  contract?: ProjectContract;
  errors: string[];
  warnings: string[];
}> {
  const specContents: Record<string, string> = {
    'architecture.md': content,
  };

  const planContent = await readVirtualFile(conversationId, 'plan.md');
  if (planContent) specContents['plan.md'] = planContent;

  const reqContent = await readVirtualFile(conversationId, 'requirements.md');
  if (reqContent) specContents['requirements.md'] = reqContent;

  const backendContent = await readVirtualFile(conversationId, 'backend_spec.md');
  if (backendContent) specContents['backend_spec.md'] = backendContent;

  const uiContent = await readVirtualFile(conversationId, 'ui_spec.md');
  if (uiContent) specContents['ui_spec.md'] = uiContent;

  const contract = extractProjectContract(specContents);
  const specVal = validateProjectContract(contract);
  const archVal = validateArchitectureArtifact(content, contract);

  const errors = Array.from(new Set([...specVal.errors, ...archVal.errors]));
  const warnings = Array.from(new Set([...specVal.warnings, ...archVal.warnings]));

  return {
    valid: errors.length === 0,
    contract,
    errors,
    warnings,
  };
}

export async function extractSection(conversationId: string, vfsPath: string, sectionName: string): Promise<string> {
  const fullContent = (await readVirtualFile(conversationId, vfsPath)) || '';
  const section = extractMdSection(fullContent, sectionName);
  if (section) return section;
  return `[Section "${sectionName}" not found in ${vfsPath}]`;
}

export function extractDependencyInterface(filePath: string, content: string): string {
  return extractDependencyInterfaceAST(filePath, content);
}

export type TargetLanguagePolicy = {
  language: 'javascript' | 'typescript' | 'html' | 'css' | 'json' | 'markdown' | 'unknown';
  rules: string[];
};

export function getTargetLanguagePolicy(targetFile: string): TargetLanguagePolicy {
  const ext = path.extname(targetFile).toLowerCase();
  if (ext === '.js' || ext === '.jsx') {
    return {
      language: 'javascript',
      rules: [
        'JavaScript (ECMAScript) only. Do NOT emit TypeScript syntax.',
        'Do NOT use `as Type` assertions, type annotations (`: string`), interfaces, or type aliases.',
        'For DOM properties (.value, .reset, .dataset), narrow at runtime using `if (el instanceof HTMLInputElement)` or `document.querySelector`.',
        'JSDoc comments (`/** @type {HTMLInputElement} */`) are permitted if syntactically valid JavaScript.',
      ],
    };
  }
  if (ext === '.ts' || ext === '.tsx') {
    return {
      language: 'typescript',
      rules: [
        'TypeScript syntax permitted. Adhere strictly to project tsconfig and interface contracts.',
      ],
    };
  }
  if (ext === '.html') {
    return { language: 'html', rules: ['Emit clean, semantic HTML5 only. Keep styles in .css and scripts in .js.'] };
  }
  if (ext === '.css') {
    return { language: 'css', rules: ['Emit valid CSS only with standard responsive rules and CSS variables.'] };
  }
  if (ext === '.json') {
    return { language: 'json', rules: ['Emit strict JSON only. Zero comments, zero trailing commas.'] };
  }
  if (ext === '.md') {
    return { language: 'markdown', rules: ['Emit standard GitHub Flavored Markdown only.'] };
  }
  return { language: 'unknown', rules: ['Follow standard language conventions for this file type.'] };
}

export async function buildCoderContext(
  conversationId: string,
  blueprintSection: string,
  dependencyInterfaces: string
): Promise<string> {
  const fileMatch = blueprintSection.match(/###\s*File:\s*(.+)/i);
  const fileName = fileMatch ? fileMatch[1].trim().replace(/[*`'"]/g, '').split(/\s*[(\[{]/)[0].trim() : 'unknown';
  let context = `TARGET FILE: ${fileName}\n\n`;

  const uiSpec = await readVirtualFile(conversationId, 'ui_spec.md');
  if (uiSpec) {
    const dsSection = extractMdSection(uiSpec, 'Design System');
    if (dsSection) context += `=== DESIGN SYSTEM ===\n${dsSection}\n\n`;
  }

  const backendSpec = await readVirtualFile(conversationId, 'backend_spec.md');
  if (backendSpec) {
    const apiSection = extractMdSection(backendSpec, 'API Endpoints');
    if (apiSection) context += `=== API ENDPOINTS ===\n${apiSection}\n\n`;
  }

  if (backendSpec) {
    const dbSection = extractMdSection(backendSpec, 'Database Design');
    if (dbSection) context += `=== DATABASE SCHEMA (DO NOT DEVIATE) ===\n${dbSection}\n\n`;
  }

  if (uiSpec && /\.(jsx|tsx|js|html)$/.test(fileName)) {
    const compSection = extractMdSection(uiSpec, 'Components');
    if (compSection) context += `=== COMPONENT PROP CONTRACTS (USE EXACT PROP NAMES) ===\n${compSection}\n\n`;
  }

  const archSpec = await readVirtualFile(conversationId, 'architecture.md');
  const planSpec = await readVirtualFile(conversationId, 'plan.md');

  if (planSpec) {
    const projGoal = extractMdSection(planSpec, 'Project Goal');
    const projName = extractMdSection(planSpec, 'Project Name');
    if (projGoal || projName) {
      context += `=== PROJECT IDENTITY & GOAL ===\n${projName ? `${projName}\n` : ''}${projGoal || ''}\n\n`;
    }
  }

  if (archSpec) {
    const techStack = extractMdSection(archSpec, 'Tech Stack');
    if (techStack) {
      context += `=== AUTHORITATIVE TECH STACK & DEPENDENCIES ===\n${techStack}\n\n`;
    }
  }

  if (dependencyInterfaces) context += `=== DEPENDENCY INTERFACES ===\n${dependencyInterfaces}\n\n`;

  const specsNeeded = parseSpecsRequired(blueprintSection);
  if (specsNeeded.length > 0) {
    context += `=== REFERENCED SPECS ===\n`;
    for (const spec of specsNeeded) {
      const sectionText = await extractSection(conversationId, spec.file, spec.section);
      context += `--- [${spec.file}#${spec.section}] ---\n${sectionText}\n\n`;
    }
  }

  context += `=== IMPLEMENTATION BLUEPRINT — FOLLOW EXACTLY ===\n${blueprintSection}`;
  return context.trim();
}

export function composeAgentUserContent(params: {
  upstreamContext: string;
  customUserContent?: string;
  userPromptText: string;
  attempt: number;
  validationError?: string;
}): string {
  const { upstreamContext, customUserContent, userPromptText, attempt, validationError } = params;

  const retryPrefix =
    attempt > 1
      ? `[RETRY ${attempt}/3] Your previous output failed verification. Error: ${
          validationError || 'Ensure ALL required section headers are present.'
        }.\n\n`
      : '';

  const parts: string[] = [];

  if (upstreamContext.trim()) {
    parts.push(`Upstream Specification Context:\n${upstreamContext.trim()}`);
  }

  if (customUserContent?.trim()) {
    parts.push(customUserContent.trim());
  }

  parts.push(`Original Request:\n"${userPromptText}"`);

  return retryPrefix + parts.join('\n\n');
}

export function shouldPersistAgentOutput(agentName: string, persistOutput: boolean): boolean {
  return Boolean(VFS_OUTPUT_MAP[agentName]) && persistOutput;
}
