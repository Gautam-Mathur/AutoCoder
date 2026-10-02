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
  if (framework === 'NEXT_APP_ROUTER') {
    entryPoints.push('app/page.tsx', 'app/layout.tsx');
  } else if (framework === 'NEXT_PAGES_ROUTER') {
    entryPoints.push('pages/index.tsx', 'pages/_app.tsx');
  } else if (framework === 'REACT_WEBPACK_SPA') {
    const explicitEntry = arch.match(/Frontend Entry Point:\s*([^\n]+)/i)?.[1]?.trim().replace(/[*`'"]/g, '');
    entryPoints.push(explicitEntry || 'src/pages/index.tsx');
  } else {
    entryPoints.push('index.html');
  }

  // 8. Extract Implementation Boundaries from Architecture
  const implementationBoundaries: ImplementationBoundary[] = [];
  const ownedMatches = arch.matchAll(/\*\*([^*]+)\*\*\s*\n(?:[^\n]+\n)*?- Owned Files:\s*([^\n]+)/gi);
  for (const om of ownedMatches) {
    const moduleName = om[1].trim();
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
      runtime: kind === 'backend' && /express/i.test(combined) ? 'express' : undefined,
    });
  }

  // 9. Extract Declared Dependencies using getPackageRoot
  const dependencies: string[] = [];
  const depMatches = combined.matchAll(/(?:dependency|dependencies|package|packages):\s*([^\n]+)/gi);
  for (const dm of depMatches) {
    const parts = dm[1].split(/[,;]/);
    for (const p of parts) {
      const pkgRoot = getPackageRoot(p);
      if (pkgRoot && !pkgRoot.startsWith('.') && !pkgRoot.startsWith('@/') && !dependencies.includes(pkgRoot)) {
        dependencies.push(pkgRoot);
      }
    }
  }

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
    entryPoints,
    apiEndpoints,
    models,
    dependencies,
    implementationBoundaries,
  };

  const canonicalJson = JSON.stringify(rawContract, Object.keys(rawContract).sort());
  const contractHash = crypto.createHash('sha256').update(canonicalJson).digest('hex');

  return {
    ...rawContract,
    contractHash,
  };
}

function looksLikeServerEntry(file: string): boolean {
  return /(^|\/)(server|api|app|index|main)\.(ts|tsx|js|jsx)$/i.test(file);
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
