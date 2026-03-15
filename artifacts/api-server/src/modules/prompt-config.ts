/**
 * Prompt Configuration Module
 *
 * Stores user-defined generation preferences and translates them into
 * concrete LLM prompt instructions. These instructions are injected into
 * SLM stage system prompts at registration time and into userPromptBuilders
 * at request time, so user preferences affect every generated file.
 *
 * Config persists to .local/prompt-config.json so it survives server restarts.
 */

import fs from 'node:fs';
import path from 'node:path';

// ─── Config Schema ────────────────────────────────────────────────────────────

export interface PromptConfig {
  preset: 'standard' | 'strict-typescript' | 'security-focused' | 'production-ready' | 'custom';

  // Code style
  codeStyle: 'functional' | 'oop' | 'mixed';
  namingStyle: 'concise' | 'descriptive';
  functionSize: 'small' | 'medium' | 'any';

  // TypeScript
  typescriptStrictness: 'strict' | 'balanced' | 'relaxed';
  avoidAny: boolean;
  preferInterfaces: boolean;

  // Documentation
  commentDensity: 'none' | 'minimal' | 'jsdoc' | 'verbose';

  // Error handling
  errorHandling: 'try-catch' | 'result-type' | 'both';
  alwaysLogErrors: boolean;

  // Security
  securityFocus: 'standard' | 'heightened' | 'enterprise';

  // Anti-patterns to enforce (IDs from anti-pattern registry)
  enforcedAntiPatterns: string[];

  // Frameworks / tooling preferences
  preferZod: boolean;
  preferReactQuery: boolean;
  alwaysPaginate: boolean;
  preferFunctionalComponents: boolean;

  // Custom freeform instructions appended to every system prompt
  customRules: string;
}

export interface PromptPreset {
  id: PromptConfig['preset'];
  name: string;
  description: string;
  emoji: string;
  config: Partial<PromptConfig>;
}

// ─── Presets ─────────────────────────────────────────────────────────────────

export const PROMPT_PRESETS: PromptPreset[] = [
  {
    id: 'standard',
    name: 'Standard',
    description: 'Balanced defaults. Good for most projects.',
    emoji: '⚖️',
    config: {
      preset: 'standard',
      codeStyle: 'mixed',
      namingStyle: 'descriptive',
      functionSize: 'medium',
      typescriptStrictness: 'balanced',
      avoidAny: true,
      preferInterfaces: true,
      commentDensity: 'minimal',
      errorHandling: 'try-catch',
      alwaysLogErrors: true,
      securityFocus: 'standard',
      enforcedAntiPatterns: ['any-type', 'empty-catch', 'n-plus-one', 'missing-loading-state', 'array-index-key', 'hardcoded-secrets'],
      preferZod: true,
      preferReactQuery: false,
      alwaysPaginate: true,
      preferFunctionalComponents: true,
      customRules: '',
    },
  },
  {
    id: 'strict-typescript',
    name: 'Strict TypeScript',
    description: 'Maximum type safety. No any, explicit types everywhere, discriminated unions.',
    emoji: '🔷',
    config: {
      preset: 'strict-typescript',
      codeStyle: 'functional',
      namingStyle: 'descriptive',
      functionSize: 'small',
      typescriptStrictness: 'strict',
      avoidAny: true,
      preferInterfaces: true,
      commentDensity: 'jsdoc',
      errorHandling: 'result-type',
      alwaysLogErrors: true,
      securityFocus: 'standard',
      enforcedAntiPatterns: ['any-type', 'empty-catch', 'n-plus-one', 'missing-loading-state', 'array-index-key', 'hardcoded-secrets', 'magic-numbers', 'synchronous-blocking'],
      preferZod: true,
      preferReactQuery: false,
      alwaysPaginate: true,
      preferFunctionalComponents: true,
      customRules: 'Use discriminated unions for all state machines. Use const assertions (as const) for literal objects. All exported functions must have explicit return types. Prefer type aliases over inline types for complex shapes.',
    },
  },
  {
    id: 'security-focused',
    name: 'Security-First',
    description: 'OWASP-hardened. Input validation, auth, rate limiting on every endpoint.',
    emoji: '🔒',
    config: {
      preset: 'security-focused',
      codeStyle: 'mixed',
      namingStyle: 'descriptive',
      functionSize: 'small',
      typescriptStrictness: 'strict',
      avoidAny: true,
      preferInterfaces: true,
      commentDensity: 'jsdoc',
      errorHandling: 'try-catch',
      alwaysLogErrors: true,
      securityFocus: 'heightened',
      enforcedAntiPatterns: ['any-type', 'empty-catch', 'hardcoded-secrets', 'missing-input-validation', 'sql-injection', 'n-plus-one', 'no-pagination', 'console-log-production', 'synchronous-blocking'],
      preferZod: true,
      preferReactQuery: false,
      alwaysPaginate: true,
      preferFunctionalComponents: true,
      customRules: 'Every API route MUST validate request body and params with Zod before any business logic. Every route that modifies data MUST require authentication. Add rate limiting to all auth endpoints. Never expose stack traces or internal errors to API consumers. Sanitize all user-supplied strings used in dynamic content.',
    },
  },
  {
    id: 'production-ready',
    name: 'Production Ready',
    description: 'Full observability, strict types, error boundaries, pagination, and security.',
    emoji: '🚀',
    config: {
      preset: 'production-ready',
      codeStyle: 'functional',
      namingStyle: 'descriptive',
      functionSize: 'small',
      typescriptStrictness: 'strict',
      avoidAny: true,
      preferInterfaces: true,
      commentDensity: 'jsdoc',
      errorHandling: 'both',
      alwaysLogErrors: true,
      securityFocus: 'heightened',
      enforcedAntiPatterns: ['any-type', 'empty-catch', 'n-plus-one', 'missing-loading-state', 'array-index-key', 'hardcoded-secrets', 'missing-input-validation', 'no-pagination', 'missing-error-boundary', 'console-log-production', 'synchronous-blocking', 'select-star', 'magic-numbers'],
      preferZod: true,
      preferReactQuery: true,
      alwaysPaginate: true,
      preferFunctionalComponents: true,
      customRules: 'Every React component tree section must be wrapped in an ErrorBoundary. All list views must have loading skeletons, error states with retry buttons, and empty states with call-to-action. Use structured logging (pino) not console.log. All DB list queries must have LIMIT/pagination. Every environment variable must be validated at startup using Zod. Add JSDoc to all exported functions.',
    },
  },
];

export const DEFAULT_CONFIG: PromptConfig = PROMPT_PRESETS[0].config as PromptConfig;

// ─── Persistence ──────────────────────────────────────────────────────────────

const CONFIG_FILE = path.resolve(process.cwd(), '../../.local/prompt-config.json');

let activeConfig: PromptConfig = { ...DEFAULT_CONFIG };

export function loadConfig(): PromptConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const saved = JSON.parse(raw) as Partial<PromptConfig>;
      activeConfig = { ...DEFAULT_CONFIG, ...saved };
    }
  } catch {
    activeConfig = { ...DEFAULT_CONFIG };
  }
  return activeConfig;
}

export function saveConfig(config: PromptConfig): void {
  activeConfig = config;
  try {
    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch {
    // Persist fails silently — in-memory config is still updated
  }
}

export function getConfig(): PromptConfig {
  return activeConfig;
}

export function applyPreset(presetId: PromptConfig['preset']): PromptConfig {
  const preset = PROMPT_PRESETS.find(p => p.id === presetId);
  if (!preset) return activeConfig;
  const next = { ...DEFAULT_CONFIG, ...preset.config } as PromptConfig;
  saveConfig(next);
  return next;
}

// ─── Instruction Builder ──────────────────────────────────────────────────────

/**
 * Converts the active PromptConfig into a dense, LLM-readable instruction block.
 * Returns an empty string if the config is all defaults (saves tokens).
 */
export function buildPromptInstructions(config: PromptConfig = activeConfig): string {
  const lines: string[] = [];
  lines.push('## Generation Preferences (User-Configured)');
  lines.push('Apply these rules to ALL code you write or enhance:');
  lines.push('');

  // ── TypeScript rules ──────────────────────────────────────────────────────
  lines.push('### TypeScript');
  if (config.typescriptStrictness === 'strict') {
    lines.push('- TypeScript STRICT mode: every variable, parameter, and return type must be explicitly typed');
    lines.push('- NEVER use `any` — use `unknown` with type guards, or specific union types');
    lines.push('- Enable `strictNullChecks`: always check for null/undefined before accessing properties');
    lines.push('- Use `as const` for literal object and tuple types');
  } else if (config.typescriptStrictness === 'balanced') {
    lines.push('- TypeScript BALANCED: type all function parameters and return types; allow inferred types for obvious locals');
    lines.push('- Avoid `any`; use `unknown` or generics instead');
  } else {
    lines.push('- TypeScript RELAXED: type the most important values; inference is acceptable for local variables');
  }

  if (config.avoidAny) {
    lines.push('- ❌ FORBIDDEN: `any` type — reject any function that uses it');
  }
  if (config.preferInterfaces) {
    lines.push('- Prefer `interface` over `type` for object shapes; use `type` for unions and aliases');
  }
  lines.push('');

  // ── Code style ────────────────────────────────────────────────────────────
  lines.push('### Code Style');
  if (config.codeStyle === 'functional') {
    lines.push('- FUNCTIONAL style: pure functions over classes, immutable data, map/filter/reduce over loops, no mutation');
    lines.push('- Avoid class-based components — use function components with hooks exclusively');
    lines.push('- Prefer function composition and higher-order functions');
  } else if (config.codeStyle === 'oop') {
    lines.push('- OOP style: use classes for services and repositories, encapsulate related behaviour together');
    lines.push('- Use constructor injection for dependencies');
  } else {
    lines.push('- MIXED style: functional React components with hooks; class-based backend services where appropriate');
  }

  if (config.functionSize === 'small') {
    lines.push('- Keep functions under 20 lines. Extract any logic block over 15 lines into a named helper function');
    lines.push('- Single responsibility: every function does exactly one thing');
  } else if (config.functionSize === 'medium') {
    lines.push('- Keep functions under 50 lines. Extract large blocks into helpers with descriptive names');
  }

  if (config.namingStyle === 'descriptive') {
    lines.push('- Use descriptive names: `getUserById` not `getUser`, `isValidEmailAddress` not `isValid`, `handleFormSubmit` not `handleSubmit`');
    lines.push('- Boolean variables are questions: `isLoading`, `hasPermission`, `canDeleteUser`');
  }
  lines.push('');

  // ── Comments ──────────────────────────────────────────────────────────────
  lines.push('### Documentation');
  if (config.commentDensity === 'none') {
    lines.push('- No comments — code should be self-documenting through naming');
  } else if (config.commentDensity === 'minimal') {
    lines.push('- Minimal comments: only explain non-obvious "why" decisions, never "what" the code does');
  } else if (config.commentDensity === 'jsdoc') {
    lines.push('- JSDoc on all exported functions and types: `/** @param userId - The user\'s UUID */`');
    lines.push('- Inline comments for complex algorithms and non-obvious business logic');
  } else if (config.commentDensity === 'verbose') {
    lines.push('- Verbose comments: document every function, every complex block, all business rule rationale');
    lines.push('- Add // Step 1/2/3 comments for multi-step procedures');
  }
  lines.push('');

  // ── Error handling ────────────────────────────────────────────────────────
  lines.push('### Error Handling');
  if (config.errorHandling === 'try-catch') {
    lines.push('- Error handling: use try/catch for all async operations');
    lines.push('- catch blocks MUST log the error and either rethrow or return a user-friendly message');
    lines.push('- Never leave empty catch blocks');
  } else if (config.errorHandling === 'result-type') {
    lines.push('- Error handling: use Result<T, E> pattern — functions that can fail return { ok: true, value: T } | { ok: false, error: E }');
    lines.push('- Callers must handle both branches — no silent failures');
    lines.push('- Reserve exceptions for truly unexpected conditions (programmer errors)');
  } else {
    lines.push('- Error handling: use try/catch at boundaries (API routes, React event handlers) and Result<T> for business logic');
    lines.push('- Inner functions propagate errors upward; boundaries translate to HTTP status codes or UI messages');
  }

  if (config.alwaysLogErrors) {
    lines.push('- Log every caught error with: operation name, error message, relevant IDs (userId, entityId, etc.)');
    lines.push('- Log format: `console.error("[operationName]", { userId, error: err.message })`');
  }
  lines.push('');

  // ── Security ──────────────────────────────────────────────────────────────
  lines.push('### Security');
  if (config.securityFocus === 'standard') {
    lines.push('- Standard security: validate inputs with Zod, parameterise queries, store secrets in env vars, hash passwords with bcrypt');
  } else if (config.securityFocus === 'heightened') {
    lines.push('- HEIGHTENED security mode — apply ALL of the following:');
    lines.push('  · Validate every request body and query param with Zod at the route boundary');
    lines.push('  · Add rate limiting to ALL authentication endpoints (login, register, forgot-password)');
    lines.push('  · Return 429 with Retry-After header on rate limit breaches');
    lines.push('  · Use HttpOnly + Secure + SameSite=Strict for all cookies');
    lines.push('  · Never expose stack traces, SQL errors, or internal details to API consumers');
    lines.push('  · Validate JWT audience and issuer claims, not just signature');
    lines.push('  · Sanitise any user-supplied HTML with DOMPurify before rendering');
  } else if (config.securityFocus === 'enterprise') {
    lines.push('- ENTERPRISE security mode:');
    lines.push('  · Everything in heightened mode, PLUS:');
    lines.push('  · RBAC: every route must check both authentication AND role/permission');
    lines.push('  · Audit log: every data mutation must write an audit record (who, what, when, old value, new value)');
    lines.push('  · Data classification: mark PII fields and add field-level access controls');
    lines.push('  · Encryption at rest for sensitive columns (email, phone)');
    lines.push('  · Automatic session revocation on password change');
    lines.push('  · CSRF tokens for all state-changing form submissions');
  }
  lines.push('');

  // ── Frameworks / tooling ──────────────────────────────────────────────────
  lines.push('### Framework & Tooling Preferences');
  const frameworkRules: string[] = [];
  if (config.preferZod) frameworkRules.push('Use Zod for ALL input validation and schema definition — not manual type guards');
  if (config.preferReactQuery) frameworkRules.push('Use @tanstack/react-query for all server state fetching — not raw fetch in useEffect');
  if (!config.preferReactQuery) frameworkRules.push('Fetch data with custom useAsync hooks or fetch directly in useEffect — wrap with try/catch');
  if (config.alwaysPaginate) frameworkRules.push('ALL list API endpoints MUST include page/pageSize parameters and return pagination metadata');
  if (config.preferFunctionalComponents) frameworkRules.push('Use function components with hooks — never class components for new code');

  for (const rule of frameworkRules) {
    lines.push(`- ${rule}`);
  }
  lines.push('');

  // ── Custom rules ──────────────────────────────────────────────────────────
  if (config.customRules.trim()) {
    lines.push('### Custom Rules (User-Specified)');
    lines.push('The following custom rules take HIGHEST priority — apply them first:');
    for (const rule of config.customRules.split('\n').filter(r => r.trim())) {
      lines.push(`- ${rule.trim()}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Returns a compact one-liner summary of the active config for UI display.
 */
export function getConfigSummary(config: PromptConfig = activeConfig): string {
  const parts: string[] = [];
  parts.push(`TS: ${config.typescriptStrictness}`);
  parts.push(`Style: ${config.codeStyle}`);
  parts.push(`Errors: ${config.errorHandling}`);
  parts.push(`Security: ${config.securityFocus}`);
  parts.push(`Comments: ${config.commentDensity}`);
  if (config.customRules.trim()) parts.push(`+${config.customRules.split('\n').filter(r => r.trim()).length} custom rule(s)`);
  return parts.join(' · ');
}

// Load config on module init
loadConfig();
