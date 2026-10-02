import crypto from 'crypto';
import {
  ProjectContract,
  ApiEndpointContract,
  ModelContract,
  ContractValidation,
} from './contracts';

export type { ApiEndpointContract, ModelContract, ProjectContract, ContractValidation };

export function getPackageRoot(specifier: string): string {
  const clean = specifier.trim().replace(/[*`'"]/g, '');
  if (!clean) return '';
  if (clean.startsWith('@')) {
    const parts = clean.split('/');
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : clean;
  }
  return clean.split('/')[0];
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
  }

  const routingStyle: ProjectContract['routing']['style'] = framework === 'NEXT_APP_ROUTER' ? 'app' : (framework === 'NEXT_PAGES_ROUTER' ? 'pages' : 'static');

  // 2. Detect Language
  const language: ProjectContract['language'] = /typescript|\.tsx?|\.ts\b/i.test(combined) ? 'typescript' : 'javascript';

  // 3. Detect ORM & Database Engine
  const hasPrisma = /prisma/i.test(combined) || !!prismaSchema;
  const orm: ProjectContract['orm'] = hasPrisma ? 'prisma' : 'none';

  let database: ProjectContract['database'] = 'none';
  if (/provider\s*=\s*"postgresql"/i.test(prismaSchema) || /postgresql|postgres\b/i.test(combined)) {
    database = 'postgresql';
  } else if (/provider\s*=\s*"sqlite"/i.test(prismaSchema) || /sqlite/i.test(combined) || hasPrisma) {
    database = 'sqlite';
  }

  // 4. Detect Authentication Requirements
  const planNoAuth = /auth:\s*none|no auth|authentication:\s*none/i.test(plan) || /without auth/i.test(plan);
  const backendHasAuth = /auth\s*required|authentication\s*required|auth:\s*true/i.test(backend) || /bearer|jwt|session/i.test(backend);
  const authRequired = !planNoAuth && (backendHasAuth || /auth:\s*required|authentication:\s*required/i.test(combined));

  const mechanismMatch = combined.match(/auth\s*mechanism:\s*(.+)/i) || combined.match(/authentication:\s*(jwt|session|next-auth|clerk|oauth)/i);
  const mechanism = authRequired ? (mechanismMatch ? mechanismMatch[1].trim() : undefined) : undefined;

  // 5. Extract API Endpoints from backend_spec
  const apiEndpoints: ApiEndpointContract[] = [];
  const endpointRegex = /(GET|POST|PUT|DELETE|PATCH)\s+([\/\w\-:\.\{\}]+)(?:\s+-\s+([^\n]+))?/gi;
  let match: RegExpExecArray | null;

  while ((match = endpointRegex.exec(backend)) !== null) {
    const method = match[1].toUpperCase();
    const path = match[2].trim();
    const notes = match[3] || '';
    const isAuth = /auth|protected|private/i.test(notes) || authRequired;

    if (!apiEndpoints.some(e => e.method === method && e.path === path)) {
      apiEndpoints.push({
        method,
        path,
        authRequired: isAuth,
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

  // 7. Extract Entry Points
  const entryPoints: string[] = [];
  if (framework === 'NEXT_APP_ROUTER') {
    entryPoints.push('app/page.tsx', 'app/layout.tsx');
  } else if (framework === 'NEXT_PAGES_ROUTER') {
    entryPoints.push('pages/index.tsx', 'pages/_app.tsx');
  } else {
    entryPoints.push('index.html');
  }

  // 8. Extract Declared Dependencies using getPackageRoot
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
    },
    routing: {
      style: routingStyle,
    },
    entryPoints,
    apiEndpoints,
    models,
    dependencies,
  };

  const canonicalJson = JSON.stringify(rawContract, Object.keys(rawContract).sort());
  const contractHash = crypto.createHash('sha256').update(canonicalJson).digest('hex');

  return {
    ...rawContract,
    contractHash,
  };
}

/**
 * Validates a ProjectContract for internal contradictions across specification documents.
 */
export function validateProjectContract(contract: ProjectContract): ContractValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Contradiction Check 1: Authentication Enabled vs No Auth Mechanism
  if (contract.authentication.required && !contract.authentication.mechanism) {
    warnings.push('Authentication is marked as required, but no specific mechanism (JWT/NextAuth/Session) was declared in specs.');
  }

  // Contradiction Check 2: Auth Required on Endpoints when Auth is Disabled globally
  if (!contract.authentication.required) {
    const protectedEndpoints = contract.apiEndpoints.filter(e => e.authRequired);
    if (protectedEndpoints.length > 0) {
      errors.push(`Specification Contradiction: Authentication is set to NONE in high-level plan, but backend_spec requires auth for endpoints: ${protectedEndpoints.map(e => `${e.method} ${e.path}`).join(', ')}`);
    }
  }

  // Contradiction Check 3: Database Required vs No Models Defined
  if (contract.database !== 'none' && contract.models.length === 0 && contract.apiEndpoints.length > 0) {
    warnings.push(`Database is configured as ${contract.database}, but no database models were parsed from backend_spec.md.`);
  }

  // Contradiction Check 4: App Router vs Pages Router Routing Conflicts
  if (contract.framework === 'NEXT_APP_ROUTER') {
    const invalidPages = contract.entryPoints.filter(e => e.startsWith('pages/'));
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
