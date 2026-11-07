import { ProjectContract } from './contracts';

export type BackendRequirementStatus = 'REQUIRED' | 'FORBIDDEN' | 'OPTIONAL_OR_MOCK';

export interface BackendTopologyDecision {
  status: BackendRequirementStatus;
  runtime: 'express' | 'nextjs_route_handlers' | 'none';
  evidence: string[];
}

/**
 * Determines whether a backend is required strictly from explicit user prompt intent,
 * user functional requirements, and architecture specifications.
 * 
 * STATIC_HTML specifies only the presentation format; it NEVER forbids backend presence.
 */
export function determineBackendTopology(
  userPromptText: string,
  specs: Record<string, string>,
  framework: ProjectContract['framework']
): BackendTopologyDecision {
  const reqs = specs['requirements.md'] || '';
  const arch = specs['architecture.md'] || '';
  const backend = specs['backend_spec.md'] || '';
  const evidence: string[] = [];

  // Check 1: Explicit user prompt forbidding backend (e.g. single-file, no-server, pure client)
  const explicitNoBackendPrompt = [
    /\b(?:no\s+backend|without\s+backend|no\s+server|client[- ]only|pure\s+frontend|single[- ]file\s+html)\b/i,
    /\bstatic\s+html\s+only\b/i,
  ].some((pattern) => pattern.test(userPromptText));

  if (explicitNoBackendPrompt) {
    evidence.push('User prompt explicitly requested a backend-free/pure-client application.');
    return {
      status: 'FORBIDDEN',
      runtime: 'none',
      evidence,
    };
  }

  // Check 2: Explicit backend necessity in Prompt or Requirements (e.g. database, APIs, multi-user)
  const explicitBackendRequired = [
    /\b(?:database|postgres(?:ql)?|sqlite|prisma|mongodb|sql)\b/i,
    /\b(?:api\s+endpoints?|rest\s+api|crud\s+operations?|backend\s+routes?)\b/i,
    /\b(?:server[- ]side|node\.?js\s+server|express\s+app)\b/i,
    /\b(?:jwt\s+tokens?|session\s+cookies?|password\s+hash(?:ing)?|bcrypt)\b/i,
  ].some((pattern) => pattern.test(userPromptText) || pattern.test(reqs));

  if (explicitBackendRequired) {
    evidence.push('User prompt or functional requirements declare server-side persistence, APIs, or database.');
    const runtime = framework === 'NEXT_APP_ROUTER' ? 'nextjs_route_handlers' : 'express';
    return {
      status: 'REQUIRED',
      runtime,
      evidence,
    };
  }

  // Check 3: Architecture Contract explicitly declares Backend: None AND Database: None
  const archSaysNoBackend = [
    /Backend(?:\s*Runtime)?\s*:\s*(?:None|N\/A|Client[- ]Only)\b/i,
    /###\s*No Backend Required/i,
  ].some((pattern) => pattern.test(arch) || pattern.test(backend));

  const archSaysNoDb = /Database(?:\s*Engine)?\s*:\s*(?:None|N\/A)\b/i.test(arch);

  if (archSaysNoBackend && archSaysNoDb) {
    evidence.push('Architecture and Backend specifications both declare Backend: None and Database: None.');
    return {
      status: 'FORBIDDEN',
      runtime: 'none',
      evidence,
    };
  }

  // Fallback: Optional / Mockable
  evidence.push('No mandatory server-side backend required; client-side mocks or local persistence permitted.');
  return {
    status: 'OPTIONAL_OR_MOCK',
    runtime: 'none',
    evidence,
  };
}
