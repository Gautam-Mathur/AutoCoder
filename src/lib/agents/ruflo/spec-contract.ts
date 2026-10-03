import crypto from 'crypto';
import {
  ProjectContract,
  ApiEndpointContract,
  ModelContract,
  ContractValidation,
  ContractEvidence,
  ImplementationBoundary,
} from './contracts';

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
  const explicitFrontendEntry = arch.match(/Frontend Entry Point:\s*([^\n]+)/i)?.[1]?.trim().replace(/[*`'"]/g, '');

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

  if (!architectureContent.trim()) {
    return { valid: true, errors, warnings };
  }

  // 1. Extract Project Folder Structure ASCII tree files
  const treeSectionMatch = architectureContent.match(/###\s*Project\s*Folder\s*Structure[\s\S]*?(?=###|$)/i);
  const treeSection = treeSectionMatch ? treeSectionMatch[0] : '';

  const rawTreeLines = treeSection
    .split('\n')
    .filter((l) => {
      const t = l.trim();
      return t && !t.startsWith('###') && !t.startsWith('Format:') && !t.startsWith('Rules') && !t.startsWith('-');
    });

  const treeFiles: string[] = [];
  const pathStack: { depth: number; path: string }[] = [];

  for (const line of rawTreeLines) {
    const cleanName = line
      .replace(/^[\s│\|├└─\+\-\\]+/, '')
      .replace(/[*`'"]/g, '')
      .trim();

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

  const normalizedTreeFileSet = new Set(treeFiles.map((f) => f.replace(/\\/g, '/').replace(/^\.\//, '').toLowerCase()));

  // 2. Extract Modules and Owned Files
  const moduleSectionMatch = architectureContent.match(/###\s*Modules[\s\S]*?(?=###\s*Conventions|###\s*Tech|###\s*Project|$)/i);
  const moduleSection = moduleSectionMatch ? moduleSectionMatch[0] : architectureContent;

  const moduleHeaderRegex = /(?:\*\*|###)\s*\[?([^\*\#\]\n]+)\]?\s*(?:\*\*|\n)/g;
  const fileToModulesMap = new Map<string, string[]>();
  const allModuleOwnedFiles = new Set<string>();

  let mMatch: RegExpExecArray | null;
  const headersFound: Array<{ name: string; index: number }> = [];

  while ((mMatch = moduleHeaderRegex.exec(moduleSection)) !== null) {
    const name = mMatch[1].trim();
    const nameLower = name.toLowerCase();
    if (
      nameLower === 'modules' ||
      nameLower.includes('tech stack') ||
      nameLower.includes('folder structure') ||
      nameLower.includes('conventions')
    ) {
      continue;
    }
    headersFound.push({ name, index: mMatch.index });
  }

  for (let i = 0; i < headersFound.length; i++) {
    const modHeader = headersFound[i].name;
    const startIdx = headersFound[i].index;
    const endIdx = i + 1 < headersFound.length ? headersFound[i + 1].index : moduleSection.length;
    const modBody = moduleSection.slice(startIdx, endIdx);

    const ownedMatch = modBody.match(/- Owned Files:\s*([^\n]+)/i);
    if (!ownedMatch) continue;

    const ownedFilesRaw = ownedMatch[1].split(/[,;]/).map((s) => s.trim().replace(/[*`'"]/g, '')).filter(Boolean);

    if (ownedFilesRaw.length === 0 || ownedFilesRaw[0].toLowerCase() === 'none') {
      errors.push(`Architecture Contract Error: Module "${modHeader}" has no owned files.`);
      continue;
    }

    for (const rawF of ownedFilesRaw) {
      const normF = rawF.replace(/\\/g, '/').replace(/^\.\//, '');
      const lowerF = normF.toLowerCase();

      allModuleOwnedFiles.add(lowerF);
      const existing = fileToModulesMap.get(lowerF) || [];
      existing.push(modHeader);
      fileToModulesMap.set(lowerF, existing);
    }
  }

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
  if (normalizedTreeFileSet.size > 0) {
    for (const lowerFile of allModuleOwnedFiles) {
      if (!normalizedTreeFileSet.has(lowerFile)) {
        const mods = fileToModulesMap.get(lowerFile) || [];
        errors.push(
          `Architecture Contract Error: Module "${mods[0]}" claims file "${lowerFile}" which is absent from Project Folder Structure tree.`
        );
      }
    }
  }

  // Check C: Unclaimed tree files (in tree but absent from all modules)
  const IGNORED_ROOT_FILES = new Set([
    'package.json',
    'tsconfig.json',
    'vite.config.ts',
    'vite.config.js',
    'next.config.js',
    'next.config.mjs',
    'next.config.ts',
    'tailwind.config.js',
    'postcss.config.js',
    'readme.md',
    '.gitignore',
    '.env',
    '.env.local',
    'prisma/schema.prisma',
    'schema.prisma',
  ]);

  for (const treeFile of treeFiles) {
    const lowerFile = treeFile.toLowerCase();
    if (IGNORED_ROOT_FILES.has(lowerFile)) continue;
    if (!allModuleOwnedFiles.has(lowerFile)) {
      errors.push(`Architecture Contract Error: File "${treeFile}" from Project Folder Structure is not claimed by any module.`);
    }
  }

  // Check D: Next.js Unnamed Dynamic Segment Rule
  for (const treeFile of treeFiles) {
    if (/\/\[\s*\.\.\.\s*\]\//.test(treeFile) || /\/\[\s*\.\.\.\s*\]$/.test(treeFile) || /\/\[\s*\]\//.test(treeFile)) {
      errors.push(
        `Next.js Architecture Error: Invalid unnamed catch-all route segment "${treeFile}". Dynamic segments must be named (e.g., "[id]", "[...slug]", "[[...slug]]").`
      );
    }
  }

  // Check E: Integration coverage (e.g. Stripe)
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
