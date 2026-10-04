import crypto from 'crypto';
import {
  ProjectContract,
  ApiEndpointContract,
  ModelContract,
  ContractValidation,
  ContractEvidence,
  ImplementationBoundary,
} from './contracts';

import { parseArchitecture } from './architecture-parser';
import { requiresModuleOwnership } from './architecture-file-policy';
import { isValidNextDynamicSegment } from './api-contract-validator';

export type { ApiEndpointContract, ModelContract, ProjectContract, ContractValidation, ContractEvidence, ImplementationBoundary };

export function getPackageRoot(specifier: string): string {
  const clean = specifier.trim().replace(/[*`'"]/g, '');
  if (!clean) return '';
  if (clean.startsWith('@')) {
    const parts = clean.split('/');
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : clean;
  }
  return clean.split('/')[0];
}

export function detectExplicitNoAuth(text: string): boolean {
  return [
    /authentication\s*:\s*none\b/i,
    /auth\s*:\s*none\b/i,
    /authentication\s*\/\s*session\s*:\s*none\b/i,
    /auth\s*\/\s*session\s*:\s*none\b/i,
    /authentication\s*required\s*:\s*no\b/i,
    /auth\s*required\s*:\s*no\b/i,
    /\bno\s+auth(?:entication)?\b/i,
    /\bwithout\s+auth(?:entication)?\b/i,
  ].some((pattern) => pattern.test(text));
}

export function detectExplicitAuthRequired(text: string): boolean {
  return [
    /authentication\s*:\s*(yes|required|enabled)\b/i,
    /auth\s*required\s*:\s*yes\b/i,
    /authentication\s+required\b/i,
    /authmiddleware\b/i,
    /\bbearer\b/i,
    /\bjwt\b/i,
    /\b(session|cookie|token|jwt)-?based\s+auth(?:entication)?\b/i,
    /\bsession\s+auth(?:entication)?\b/i,
    /\bauthenticated\s+session\b/i,
    /\bexpress-session\b/i,
    /\bnext-auth\b/i,
    /\bpassport\b/i,
    /\buser\s+authentication\b|\bauthenticated\s+users?\b/i,
    /\baccess[_\s]+token\b|\brefresh[_\s]+token\b/i,
    /\boauth2?\b/i,
    /\blog\s*in\b|\blogged\s+in\b|\bsign\s*in\b|\bsigned\s+in\b/i,
  ].some((pattern) => pattern.test(text));
}

export function inferFrameworkDependencies(
  contract: Partial<ProjectContract> & {
    framework?: string;
    orm?: string;
    dependencies?: string[];
    implementationBoundaries?: ImplementationBoundary[];
  }
): string[] {
  const deps = new Set<string>(contract.dependencies || []);

  if (contract.framework === 'VITE_SPA' || contract.framework === 'REACT_WEBPACK_SPA') {
    deps.add('react');
    deps.add('react-dom');
  }

  if (contract.framework === 'VITE_SPA') {
    deps.add('vite');
  }

  if (contract.orm === 'prisma') {
    deps.add('prisma');
    deps.add('@prisma/client');
  }

  const backendBoundary = contract.implementationBoundaries?.find((b) => b.kind === 'backend' || b.runtime === 'express');
  if (backendBoundary?.runtime === 'express' || contract.implementationBoundaries?.some((b) => b.runtime === 'express')) {
    deps.add('express');
  }

  return Array.from(deps);
}

/**
 * Deterministically extracts a unified ProjectContract from Markdown specification artifacts and project facts.
 */
export function extractProjectContract(specs: Record<string, string>): ProjectContract {
  const plan = specs['plan.md'] || '';
  const reqs = specs['requirements.md'] || '';
  const arch = specs['architecture.md'] || '';
  const backend = specs['backend_spec.md'] || '';
  const ui = specs['ui_spec.md'] || '';
  const prismaSchema = specs['prisma/schema.prisma'] || specs['schema.prisma'] || '';

  const combined = `${plan}\n${reqs}\n${arch}\n${backend}\n${ui}`;

  // 1. Detect Framework & Routing
  let framework: ProjectContract['framework'] = 'STATIC_HTML';
  if (/next\.js|nextjs|app router/i.test(combined)) {
    if (/pages router|pages\//i.test(arch) && !/app router|app\//i.test(arch)) {
      framework = 'NEXT_PAGES_ROUTER';
    } else {
      framework = 'NEXT_APP_ROUTER';
    }
  } else if (/vite/i.test(combined)) {
    framework = 'VITE_SPA';
  } else if (/react/i.test(combined) && /webpack/i.test(combined)) {
    framework = 'REACT_WEBPACK_SPA';
  }

  const routingStyle: ProjectContract['routing']['style'] =
    framework === 'NEXT_APP_ROUTER' ? 'app' : framework === 'NEXT_PAGES_ROUTER' ? 'pages' : 'static';

  // 2. Detect Language
  const language: ProjectContract['language'] = /typescript|\.tsx?|\.ts\b/i.test(combined) ? 'typescript' : 'javascript';

  // 3. Detect ORM & Database Engine
  const hasPrisma = /prisma/i.test(combined) || !!prismaSchema;
  const orm: ProjectContract['orm'] = hasPrisma ? 'prisma' : 'none';

  let database: ProjectContract['database'] = 'none';
  if (/provider\s*=\s*"postgresql"/i.test(prismaSchema) || /postgresql|postgres\b/i.test(combined)) {
    database = 'postgresql';
  } else if (/provider\s*=\s*"sqlite"/i.test(prismaSchema) || /\bsqlite\b/i.test(combined)) {
    database = 'sqlite';
  }

  // 4. Detect Authentication Requirements & Evidence Collection
  const evidence: ContractEvidence[] = [];
  const specMap: Record<string, string> = {
    'plan.md': plan,
    'requirements.md': reqs,
    'architecture.md': arch,
    'backend_spec.md': backend,
    'ui_spec.md': ui,
  };

  for (const [source, text] of Object.entries(specMap)) {
    if (detectExplicitNoAuth(text)) {
      evidence.push({ source, field: 'authentication', value: 'none' });
    }
    if (detectExplicitAuthRequired(text)) {
      evidence.push({ source, field: 'authentication', value: 'required' });
    }
  }

  const hasExplicitNoAuth = evidence.some((e) => e.field === 'authentication' && e.value === 'none');
  const hasExplicitAuth = evidence.some((e) => e.field === 'authentication' && e.value === 'required');
  const authRequired = hasExplicitAuth && !hasExplicitNoAuth;

  const mechanismMatch = combined.match(/auth\s*mechanism:\s*(.+)/i) || combined.match(/authentication:\s*(jwt|session|next-auth|clerk|oauth)/i);
  const mechanism = authRequired ? (mechanismMatch ? mechanismMatch[1].trim() : undefined) : undefined;

  // 5. Extract API Endpoints from backend_spec
  const apiEndpoints: ApiEndpointContract[] = [];
  const endpointRegex = /(GET|POST|PUT|DELETE|PATCH)\s+([\/\w\-:\.\{\}]+)/gi;
  let match: RegExpExecArray | null;

  while ((match = endpointRegex.exec(backend)) !== null) {
    const method = match[1].toUpperCase();
    const path = match[2].trim();
    const startIndex = match.index;
    const nextMatch = backend.slice(startIndex + match[0].length).search(/(GET|POST|PUT|DELETE|PATCH)\s+[\/\w\-:\.\{\}]+|###/i);
    const blockText = nextMatch !== -1 ? backend.slice(startIndex, startIndex + match[0].length + nextMatch) : backend.slice(startIndex);

    const hasExplicitAuthYes = /auth\s*required\s*:\s*yes|auth:\s*true|protected|private|requires\s+auth/i.test(blockText);
    const hasExplicitAuthNo = /auth\s*required\s*:\s*no|auth:\s*false|public/i.test(blockText);

    const isAuth = (hasExplicitAuthYes || (authRequired && !hasExplicitAuthNo));

    if (!apiEndpoints.some((e) => e.method === method && e.path === path)) {
      apiEndpoints.push({
        method,
        path,
        authRequired: isAuth,
        source: 'backend_spec.md',
      });
    }
  }

  // 6. Extract Prisma Models from backend_spec or schema.prisma
  const models: ModelContract[] = [];
  const sourceSchemaText = prismaSchema || backend;
  const modelBlocks = sourceSchemaText.split(/model\s+([A-Za-z0-9_]+)\s*\{/gi);
  for (let i = 1; i < modelBlocks.length; i += 2) {
    const name = modelBlocks[i].trim();
    const body = modelBlocks[i + 1] ? modelBlocks[i + 1].split('}')[0] : '';
    const fields: Record<string, string> = {};

    const fieldLines = body.split('\n');
    for (const line of fieldLines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@')) continue;
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 2) {
        fields[parts[0]] = parts[1];
      }
    }

    models.push({ name, fields });
  }

  // Fallback for markdown entity blocks if no explicit Prisma model blocks are defined
  if (models.length === 0 && backend) {
    const entityBlocks = backend.split(/\n\*\*([A-Za-z0-9_]+)\*\*/gi);
    for (let i = 1; i < entityBlocks.length; i += 2) {
      const name = entityBlocks[i].trim();
      const body = entityBlocks[i + 1] ? entityBlocks[i + 1].split(/\n\*\*/)[0] : '';
      const fields: Record<string, string> = {};
      const fieldMatches = body.matchAll(/-\s*([A-Za-z0-9_]+)\s*:\s*([^\s—\n]+)/gi);
      for (const fm of fieldMatches) {
        fields[fm[1]] = fm[2];
      }
      if (Object.keys(fields).length > 0) {
        models.push({ name, fields });
      }
    }
  }

  // 7. Extract Entry Points
  const entryPoints: string[] = [];
  const explicitFrontendEntry = arch.match(/Frontend Entry Point(?:\*\*)?:\s*([^\n]+)/i)?.[1]?.trim().replace(/[*`'"]/g, '');

  if (framework === 'NEXT_APP_ROUTER') {
    if (explicitFrontendEntry) {
      entryPoints.push(explicitFrontendEntry);
    } else if (/src\/app\/page\.(tsx|jsx|js|ts)/i.test(arch)) {
      entryPoints.push('src/app/page.tsx');
    } else {
      entryPoints.push('app/page.tsx');
    }
  } else if (framework === 'NEXT_PAGES_ROUTER') {
    if (explicitFrontendEntry) {
      entryPoints.push(explicitFrontendEntry);
    } else if (/src\/pages\/index\.(tsx|jsx|js|ts)/i.test(arch)) {
      entryPoints.push('src/pages/index.tsx');
    } else {
      entryPoints.push('pages/index.tsx');
    }
  } else if (framework === 'REACT_WEBPACK_SPA' || framework === 'VITE_SPA') {
    entryPoints.push(explicitFrontendEntry || 'src/pages/index.tsx');
  } else {
    entryPoints.push(explicitFrontendEntry || 'index.html');
  }

  const backendEntryPoints: string[] = [];
  const backendEntryMatch = arch.match(/Backend Entry Point[s]?(?:\*\*)?:\s*([^\n]+)/i);
  if (backendEntryMatch) {
    const rawVal = backendEntryMatch[1].trim().replace(/[*`'"]/g, '');
    if (rawVal && rawVal.toLowerCase() !== 'none') {
      const splitEntries = rawVal.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
      for (const e of splitEntries) {
        if (!backendEntryPoints.includes(e)) {
          backendEntryPoints.push(e);
        }
      }
    }
  }

  // 8. Extract Implementation Boundaries from Architecture
  const implementationBoundaries: ImplementationBoundary[] = [];
  const moduleSectionForBoundaries = (arch.match(/###\s*Modules[\s\S]*?(?=###\s*Conventions|###\s*Tech|###\s*Project|$)/i)?.[0] || arch)
    .replace(/###\s*Modules/i, '');
  const ownedMatches = moduleSectionForBoundaries.matchAll(/(?:\*\*|###)\s*\[?([^\*\#\]\n]+)\]?\s*(?:\*\*|\n)[\s\S]*?- Owned Files:\s*([^\n]+)/gi);
  for (const om of ownedMatches) {
    const moduleName = om[1].trim();
    if (moduleName.toLowerCase() === 'modules') continue;
    const files = om[2].split(/[,;]/).map((s) => s.trim().replace(/[*`'"]/g, '')).filter(Boolean);
    let kind: ImplementationBoundary['kind'] = 'shared';
    if (/frontend/i.test(moduleName)) kind = 'frontend';
    else if (/backend/i.test(moduleName)) kind = 'backend';
    else if (/database|db/i.test(moduleName)) kind = 'database';

    const entryMatch = arch.match(new RegExp(`${moduleName}[\\s\\S]*?Entry Point:\\s*([^\\n]+)`, 'i'));
    implementationBoundaries.push({
      id: moduleName.toLowerCase().replace(/\s+/g, '-'),
      kind,
      ownedFiles: files,
      entryPoint: entryMatch ? entryMatch[1].trim().replace(/[*`'"]/g, '') : undefined,
      runtime: kind === 'backend' && !framework.startsWith('NEXT_') && /express/i.test(combined) ? 'express' : undefined,
    });
  }

  // 9. Extract raw dependencies & integrations from specs
  const dependencies: string[] = [];
  const depMatches = combined.matchAll(/`([@a-z0-9\/-]+)`|[\-\*]\s+([@a-z0-9\/-]+)/gi);
  for (const match of depMatches) {
    const dep = (match[1] || match[2] || '').trim();
    if (dep && !dep.startsWith('.') && !dep.startsWith('/') && !dependencies.includes(dep)) {
      dependencies.push(dep);
    }
  }

  const integrations: string[] = [];
  if (/\bstripe\b/i.test(combined)) {
    integrations.push('stripe');
  }

  const normalizedDependencies = inferFrameworkDependencies({
    framework,
    orm,
    dependencies,
    implementationBoundaries,
  });

  const moduleSystem: 'ESM' | 'COMMONJS' =
    /import\s+.*from|export\s+/i.test(combined) || /ES6|ESM|module/i.test(combined) ? 'ESM' : 'COMMONJS';

  const rawContract = {
    framework,
    language,
    orm,
    database,
    authentication: {
      required: authRequired,
      mechanism,
      evidence,
    },
    routing: {
      style: routingStyle,
    },
    moduleSystem,
    entryPoints,
    backendEntryPoints,
    apiEndpoints,
    models,
    dependencies: normalizedDependencies,
    integrations,
    implementationBoundaries,
  };

  const canonicalJson = JSON.stringify(rawContract, Object.keys(rawContract).sort());
  const contractHash = crypto.createHash('sha256').update(canonicalJson).digest('hex');

  return {
    ...rawContract,
    contractHash,
  };
}

export interface ParsedArchitectureModule {
  name: string;
  responsibility: string;
  ownedFiles: string[];
  dependsOn: string[];
  supportsFeatures: string[];
  startLine: number;
  endLine: number;
}

export interface ParsedArchitectureArtifact {
  treeFiles: string[];
  modules: ParsedArchitectureModule[];
  parserErrors: string[];
}

const MODULE_HEADER_RE = /^\*\*\s*([^*\r\n]+?)\s*\*\*\s*$/;
const RESPONSIBILITY_RE = /^-\s*Responsibility:\s*(.*)$/i;
const OWNED_FILES_RE = /^-\s*Owned Files:\s*(.*)$/i;
const DEPENDS_ON_RE = /^-\s*Depends On:\s*(.*)$/i;
const SUPPORTS_FEATURES_RE = /^-\s*Supports Features:\s*(.*)$/i;

export function parseArchitectureModules(
  architectureContent: string
): {
  modules: ParsedArchitectureModule[];
  errors: string[];
} {
  const lines = architectureContent.replace(/\r\n/g, '\n').split('\n');

  const modules: ParsedArchitectureModule[] = [];
  const errors: string[] = [];

  const modulesHeadingIndex = lines.findIndex((line) =>
    /^###\s*Modules\s*$/i.test(line.trim())
  );

  if (modulesHeadingIndex === -1) {
    return {
      modules: [],
      errors: ['Architecture Parser Error: Missing "### Modules" section.'],
    };
  }

  const conventionsHeadingIndex = lines.findIndex(
    (line, index) =>
      index > modulesHeadingIndex &&
      /^###\s*Conventions\s*$/i.test(line.trim())
  );

  const endIndex =
    conventionsHeadingIndex === -1
      ? lines.length
      : conventionsHeadingIndex;

  let current: ParsedArchitectureModule | null = null;
  let currentStartLine = -1;

  const finishCurrent = (endLine: number) => {
    if (!current) return;

    current.endLine = endLine;

    if (!current.responsibility.trim()) {
      errors.push(
        `Architecture Parser Error: Module "${current.name}" is missing "- Responsibility:".`
      );
    }

    if (current.ownedFiles.length === 0) {
      errors.push(
        `Architecture Parser Error: Module "${current.name}" has no "- Owned Files:" entries.`
      );
    }

    modules.push(current);
    current = null;
    currentStartLine = -1;
  };

  for (let index = modulesHeadingIndex + 1; index < endIndex; index++) {
    const rawLine = lines[index];
    const line = rawLine.trim();

    if (!line) continue;

    const moduleMatch = line.match(MODULE_HEADER_RE);

    if (moduleMatch) {
      finishCurrent(index);

      const name = moduleMatch[1].trim();

      if (!name || name.includes(':')) {
        errors.push(
          `Architecture Parser Error: Invalid module name "${name}".`
        );
        continue;
      }

      currentStartLine = index + 1;

      current = {
        name,
        responsibility: '',
        ownedFiles: [],
        dependsOn: [],
        supportsFeatures: [],
        startLine: currentStartLine,
        endLine: currentStartLine,
      };

      continue;
    }

    if (!current) {
      errors.push(
        `Architecture Parser Error: Unexpected content in "### Modules" at line ${index + 1}: "${line}"`
      );
      continue;
    }

    const responsibilityMatch = line.match(RESPONSIBILITY_RE);
    if (responsibilityMatch) {
      current.responsibility = responsibilityMatch[1].trim();
      continue;
    }

    const ownedFilesMatch = line.match(OWNED_FILES_RE);
    if (ownedFilesMatch) {
      const rawFiles = ownedFilesMatch[1].trim();

      if (
        rawFiles &&
        rawFiles.toLowerCase() !== 'none'
      ) {
        current.ownedFiles = rawFiles
          .split(/[,;]/)
          .map((file) =>
            file
              .trim()
              .replace(/[*`'"]/g, '')
              .replace(/^\.\/+/, '')
              .replace(/^\/+/, '')
          )
          .filter(Boolean);
      }

      continue;
    }

    const dependsOnMatch = line.match(DEPENDS_ON_RE);
    if (dependsOnMatch) {
      const rawDeps = dependsOnMatch[1].trim();

      if (
        rawDeps &&
        rawDeps.toLowerCase() !== 'none'
      ) {
        current.dependsOn = rawDeps
          .split(/[,;]/)
          .map((dep) =>
            dep
              .trim()
              .replace(/[*`'"]/g, '')
          )
          .filter(Boolean);
      }

      continue;
    }

    const supportsFeaturesMatch = line.match(SUPPORTS_FEATURES_RE);
    if (supportsFeaturesMatch) {
      const rawFeatures = supportsFeaturesMatch[1].trim();

      if (
        rawFeatures &&
        rawFeatures.toLowerCase() !== 'none'
      ) {
        current.supportsFeatures = rawFeatures
          .split(/[,;]/)
          .map((feature) =>
            feature.trim().replace(/[*`'"]/g, '')
          )
          .filter(Boolean);
      }

      continue;
    }
  }

  finishCurrent(endIndex);

  const seen = new Set<string>();

  for (const module of modules) {
    const key = module.name.toLowerCase();

    if (seen.has(key)) {
      errors.push(
        `Architecture Parser Error: Duplicate module declaration "${module.name}".`
      );
    }

    seen.add(key);
  }

  return {
    modules,
    errors,
  };
}

export function looksLikeArchitectureModuleName(value: string): boolean {
  const clean = value.trim();

  if (!clean) return false;

  if (
    clean.includes('/') ||
    clean.includes('\\') ||
    clean.includes('@') ||
    clean.includes('.') ||
    clean.includes(':')
  ) {
    return false;
  }

  return true;
}

export function detectModuleDependencyCycles(
  modules: Map<string, { name: string; deps: string[] }>
): string[] {
  const errors: string[] = [];

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];

  const visit = (node: string) => {
    if (visiting.has(node)) {
      const cycleStart = stack.indexOf(node);
      const cycle =
        cycleStart >= 0
          ? [...stack.slice(cycleStart), node]
          : [...stack, node];

      errors.push(
        `Architecture Contract Error: Module dependency cycle detected: ${cycle.join(' -> ')}.`
      );

      return;
    }

    if (visited.has(node)) return;

    visiting.add(node);
    stack.push(node);

    const info = modules.get(node);

    if (info) {
      for (const dep of info.deps) {
        const depLower = dep.toLowerCase();

        if (modules.has(depLower)) {
          visit(depLower);
        }
      }
    }

    stack.pop();
    visiting.delete(node);
    visited.add(node);
  };

  for (const key of modules.keys()) {
    visit(key);
  }

  return errors;
}

export function validateNextPublicAssetPath(
  treeFiles: string[],
  framework: ProjectContract['framework']
): string[] {
  if (
    framework !== 'NEXT_APP_ROUTER' &&
    framework !== 'NEXT_PAGES_ROUTER'
  ) {
    return [];
  }

  const errors: string[] = [];

  for (const file of treeFiles) {
    const clean = file.replace(/\\/g, '/');

    if (/^src\/public\//i.test(clean)) {
      errors.push(
        `Next.js Architecture Error: Static public asset "${file}" must be placed under project-root "public/" rather than "src/public/".`
      );
    }
  }

  return errors;
}

export interface ArchitectureValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates architecture.md artifact for folder tree alignment, module ownership uniqueness, and route validity.
 */
export function validateArchitectureArtifact(
  architectureContent: string,
  contract?: ProjectContract
): ArchitectureValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  let contentToParse = architectureContent;
  if (contentToParse && !/###\s*Project Files/i.test(contentToParse)) {
    const modulesIdx = contentToParse.search(/###\s*Modules/i);
    if (modulesIdx !== -1) {
      const treeMatch = contentToParse.match(/###\s*Project Folder Structure[\s\S]*?(?=###|$)/i);
      if (treeMatch) {
        const treeLines = treeMatch[0].split('\n').filter((l) => {
          const t = l.trim();
          return t && !t.startsWith('###') && !t.startsWith('Format:') && !t.startsWith('Rules') && !t.startsWith('-');
        });
        const treeFiles: string[] = [];
        const pathStack: { depth: number; path: string }[] = [];
        for (const line of treeLines) {
          const cleanName = line.replace(/^[\s│\|├└─\+\-\\]+/, '').replace(/[*`'"]/g, '').trim();
          if (!cleanName || cleanName.toLowerCase() === 'project-root/' || cleanName === '.') continue;
          const nameStartCol = line.indexOf(cleanName);
          const isDir = cleanName.endsWith('/');
          const nameWithoutSlash = cleanName.replace(/\/$/, '');
          while (pathStack.length > 0 && pathStack[pathStack.length - 1].depth >= nameStartCol) {
            pathStack.pop();
          }
          const parentPath = pathStack.length > 0 ? pathStack[pathStack.length - 1].path : '';
          const fullPath = parentPath ? `${parentPath}/${nameWithoutSlash}` : nameWithoutSlash;
          if (isDir) {
            pathStack.push({ depth: nameStartCol, path: fullPath });
          } else {
            treeFiles.push(fullPath);
          }
        }
        const pfSection = `### Project Files\n${treeFiles.map((f) => `- ${f}`).join('\n')}\n\n`;
        contentToParse = contentToParse.slice(0, modulesIdx) + pfSection + contentToParse.slice(modulesIdx);
      }
    }
  }

  const parsed = parseArchitecture(contentToParse);
  if (parsed.parserErrors.length > 0) {
    errors.push(...parsed.parserErrors);
    return { valid: false, errors, warnings };
  }


  const { treeFiles, ownership, moduleGraph } = parsed;
  const normalizedTreeFileSet = new Set(treeFiles.map((f) => f.replace(/\\/g, '/').replace(/^\.\//, '').toLowerCase()));

  const fileToModulesMap = ownership;
  const allModuleOwnedFiles = new Set(ownership.keys());

  // Check A: Duplicate file ownership
  for (const [lowerFile, mods] of fileToModulesMap.entries()) {
    if (mods.length > 1) {
      const origFile = treeFiles.find((f) => f.toLowerCase() === lowerFile) || lowerFile;
      errors.push(
        `Architecture Contract Error: File "${origFile}" is claimed by modules "${mods.join('" and "')}". Each file must have exactly one owning module.`
      );
    }
  }

  // Check B: Orphan module files (claimed by module but missing from tree)
  for (const lowerFile of allModuleOwnedFiles) {
    if (!normalizedTreeFileSet.has(lowerFile)) {
      const mods = fileToModulesMap.get(lowerFile) || [];
      errors.push(
        `Architecture Contract Error: Module "${mods[0]}" claims file "${lowerFile}" which is absent from Project Folder Structure tree.`
      );
    }
  }

  // Check C: Unclaimed tree files using centralized requiresModuleOwnership policy
  for (const treeFile of treeFiles) {
    const lowerFile = treeFile.toLowerCase();
    if (requiresModuleOwnership(treeFile)) {
      if (!allModuleOwnedFiles.has(lowerFile)) {
        errors.push(`Architecture Contract Error: File "${treeFile}" from Project Folder Structure is not claimed by any module.`);
      }
    }
  }

  // Check D: Module Dependency Graph Validation (Rule 1, Rule 2, & Cycle Detection)
  for (const [modLower, modInfo] of moduleGraph.entries()) {
    for (const depName of modInfo.deps) {
      const depLower = depName.toLowerCase();

      if (!looksLikeArchitectureModuleName(depName)) {
        errors.push(
          `Architecture Contract Error: Module "${modInfo.name}" has invalid dependency "${depName}". "Depends On" must contain declared architecture module names only, not files, packages, components, or technologies.`
        );
        continue;
      }

      if (depLower === modLower) {
        errors.push(
          `Architecture Contract Error: Module "${modInfo.name}" cannot depend on itself.`
        );
      } else if (!moduleGraph.has(depLower)) {
        errors.push(
          `Architecture Contract Error: Module "${modInfo.name}" depends on unknown module "${depName}".`
        );
      }
    }
  }

  errors.push(...detectModuleDependencyCycles(moduleGraph));

  // Check E: Next.js Unnamed Dynamic Segment Rule & Backend Entry Validation
  const framework = contract?.framework || (/next\.js|nextjs|app router/i.test(architectureContent) ? 'NEXT_APP_ROUTER' : 'STATIC_HTML');

  errors.push(...validateNextPublicAssetPath(treeFiles, framework));

  for (const treeFile of treeFiles) {
    const segments = treeFile.split('/');
    for (const seg of segments) {
      if (seg.includes('[') || seg.includes(']')) {
        if (!isValidNextDynamicSegment(seg)) {
          errors.push(
            `Next.js Architecture Error: Invalid dynamic route segment "${seg}" in path "${treeFile}". Dynamic segments must be named (e.g., "[id]", "[...slug]", "[[...slug]]").`
          );
        }
      }
    }
  }

  const backendEntryMatch = architectureContent.match(/Backend Entry Point[s]?(?:\*\*)?:\s*([^\n]+)/i)?.[1]?.trim().replace(/[*`'"]/g, '');
  if (backendEntryMatch && backendEntryMatch.toLowerCase() !== 'none') {
    const rawEntries = backendEntryMatch.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    for (const entry of rawEntries) {
      if (/\/\[\s*\.\.\.\s*\]\//.test(entry) || /\/\[\s*\.\.\.\s*\]$/.test(entry) || entry.includes('[...]')) {
        errors.push(
          `Next.js Architecture Error: Invalid unnamed dynamic segment in Backend Entry Point "${entry}". Dynamic segments must be named (e.g., "[id]", "[...slug]", "[[...slug]]").`
        );
      } else if (framework === 'NEXT_APP_ROUTER') {
        const cleanEntry = entry.replace(/\\/g, '/').replace(/^\.\//, '');
        const isNextAppRouteHandler = /^(?:src\/)?app\/.+\/route\.(ts|tsx|js|jsx)$/i.test(cleanEntry);
        if (!isNextAppRouteHandler) {
          errors.push(
            `Next.js Architecture Error: Backend Entry Point "${entry}" must be a valid Next.js App Router route handler (e.g., "src/app/api/[...slug]/route.ts").`
          );
        }
      }
    }
  }

  // Check F: Integration coverage (e.g. Stripe)
  if (contract?.integrations?.includes('stripe') || /\bStripe\b/i.test(architectureContent)) {
    const hasStripeLocation =
      treeFiles.some((f) => /stripe|payment|checkout/i.test(f)) ||
      Array.from(allModuleOwnedFiles).some((f) => /stripe|payment|checkout/i.test(f));

    if (!hasStripeLocation) {
      warnings.push(
        `Architecture Warning: Integration "stripe" was declared, but no dedicated Stripe/checkout file path (e.g. src/lib/stripe.ts or src/app/api/checkout/route.ts) was found in folder structure.`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function looksLikeServerEntry(file: string): boolean {
  return /(^|\/)(server|api|app|index|main|route)\.(ts|tsx|js|jsx)$/i.test(file) || file.endsWith('/route.ts') || file.endsWith('/route.js');
}

function looksLikeFrontendClient(file: string): boolean {
  return /(^|\/)(apiClient|client|httpClient)\.(ts|tsx|js|jsx)$/i.test(file);
}

/**
 * Validates a ProjectContract for internal contradictions across specification documents.
 */
export function validateProjectContract(contract: ProjectContract): ContractValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Contradiction Check 1: Authentication Contradictions across Artifacts
  const authEvidence = contract.authentication.evidence || [];
  const noAuthEvidence = authEvidence.filter((e) => e.field === 'authentication' && e.value === 'none');
  const reqAuthEvidence = authEvidence.filter((e) => e.field === 'authentication' && e.value === 'required');

  if (noAuthEvidence.length > 0 && reqAuthEvidence.length > 0) {
    errors.push(
      `Authentication contradiction across specification artifacts. No-auth evidence: ${noAuthEvidence
        .map((e) => `${e.source}=${e.value}`)
        .join(', ')} | Auth-required evidence: ${reqAuthEvidence.map((e) => `${e.source}=${e.value}`).join(', ')}`
    );
  }

  // Contradiction Check 2: Authentication Enabled vs No Auth Mechanism
  if (contract.authentication.required && !contract.authentication.mechanism) {
    warnings.push('Authentication is marked as required, but no specific mechanism (JWT/NextAuth/Session) was declared in specs.');
  }

  // Contradiction Check 3: Auth Required on Endpoints when Auth is Disabled globally
  if (!contract.authentication.required) {
    const protectedEndpoints = contract.apiEndpoints.filter((e) => e.authRequired);
    if (protectedEndpoints.length > 0) {
      errors.push(
        `Specification Contradiction: Authentication is set to NONE in high-level plan/architecture, but backend_spec requires auth for endpoints: ${protectedEndpoints
          .map((e) => `${e.method} ${e.path}`)
          .join(', ')}`
      );
    }
  }

  // Contradiction Check 4: Express Backend Topology Contradiction
  const backendBoundary = contract.implementationBoundaries?.find((b) => b.kind === 'backend' || b.runtime === 'express');
  if (backendBoundary || contract.implementationBoundaries?.some((b) => b.runtime === 'express')) {
    const bBoundary = backendBoundary || contract.implementationBoundaries?.find((b) => b.runtime === 'express')!;
    const hasServerEntry = Boolean(bBoundary.entryPoint) || bBoundary.ownedFiles.some(looksLikeServerEntry);
    const onlyClientOrShared =
      bBoundary.ownedFiles.length > 0 &&
      bBoundary.ownedFiles.every(
        (file) =>
          looksLikeFrontendClient(file) ||
          /(^|\/)(types|shared)\//i.test(file) ||
          /(^|\/)types\.(ts|tsx|js|jsx)$/i.test(file) ||
          file.endsWith('/types/index.ts')
      );

    if (!hasServerEntry) {
      errors.push(
        'Backend topology contradiction: Express backend is declared but no server entry point or server-owned implementation file is defined.'
      );
    }

    if (onlyClientOrShared) {
      errors.push(
        'Backend topology contradiction: Express backend contains only frontend/shared files and no server implementation.'
      );
    }
  }

  // Contradiction Check 5: Database Required vs No Models Defined
  if (contract.database !== 'none' && contract.models.length === 0 && contract.apiEndpoints.length > 0) {
    warnings.push(`Database is configured as ${contract.database}, but no database models were parsed from backend_spec.md.`);
  }

  // Contradiction Check 6: App Router vs Pages Router Routing Conflicts
  if (contract.framework === 'NEXT_APP_ROUTER') {
    const invalidPages = contract.entryPoints.filter((e) => e.startsWith('pages/'));
    if (invalidPages.length > 0) {
      errors.push(`Routing Contradiction: Next.js App Router selected, but entry points list Pages Router routes: ${invalidPages.join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
