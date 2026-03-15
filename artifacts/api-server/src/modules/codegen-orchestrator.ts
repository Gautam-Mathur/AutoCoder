import type { ProjectPlan, PlannedPage, PlannedEntity, PlannedIntegration, SecurityPlan, CustomAction, PerformancePlan } from './plan-generator.js';
import type { ReasoningResult, UIPattern } from './contextual-reasoning-engine.js';
import type { DesignSystem } from './design-system-engine.js';
import type { ArchitecturePlan } from './architecture-planner.js';
import type { SchemaDesign, TableDesign, IndexDesign, ColumnDesign } from './schema-designer.js';
import type { APIDesign, RouteDesign, PaginationDesign } from './api-designer.js';
import type { ComponentTree } from './component-composer.js';
import type { FunctionalitySpec, EntityFeatureSpec, PageFeatureSpec } from './functionality-engine.js';
import { AVAILABLE_DEPS, DEV_DEPS } from './dependency-registry.js';
import {
  getAllBaseComponents,
  resolveComponentDependencies,
  collectNpmPackages,
  type ComponentTemplate,
} from './codegen-components.js';
import {
  generateListPage,
  generateDetailPage,
  generateDashboardPage,
  generateGenericPage,
  generateKanbanPage,
  generateCalendarPage,
  generateSettingsPage,
  generateTimelinePage,
  generateGalleryPage,
} from './codegen-page-builder.js';
import { validateGeneratedProject, formatValidationReport } from './codegen-validator.js';


export interface EnrichmentContext {
  architecture?: ArchitecturePlan;
  schemaDesign?: SchemaDesign;
  apiDesign?: APIDesign;
  componentTree?: ComponentTree;
  reasoning?: ReasoningResult | null;
  designSystem?: DesignSystem;
  functionalitySpec?: FunctionalitySpec;
}

interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

function toKebab(str: string): string {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '').replace(/[\s_]+/g, '-');
}

function toSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

function toTitle(str: string): string {
  return str.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
}

function toCamel(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

function toSlug(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export type ProgressCallback = (phase: string, detail: string) => void;

function generateIntegrationSetupFiles(integrations: PlannedIntegration[]): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  const envLines: string[] = [];
  const setupNotes: string[] = [];

  for (const integration of integrations) {
    setupNotes.push(`# ${integration.name} (${integration.type})`);
    setupNotes.push(`# ${integration.reason}`);
    if (integration.setupNotes) {
      setupNotes.push(`# Setup: ${integration.setupNotes}`);
    }
    if (integration.packages && integration.packages.length > 0) {
      setupNotes.push(`# Packages: ${integration.packages.join(', ')}`);
    }
    if (integration.apiRoutes && integration.apiRoutes.length > 0) {
      setupNotes.push(`# API Routes:`);
      for (const route of integration.apiRoutes) {
        setupNotes.push(`#   ${route.method} ${route.path} - ${route.description}`);
      }
    }
    if (integration.uiComponents && integration.uiComponents.length > 0) {
      setupNotes.push(`# UI Components: ${integration.uiComponents.join(', ')}`);
    }
    setupNotes.push('');

    if (integration.envVariables && integration.envVariables.length > 0) {
      for (const envVar of integration.envVariables) {
        envLines.push(`${envVar}=`);
      }
    }
  }

  files.push({
    path: 'server/integrations/setup.ts',
    language: 'typescript',
    content: `/**
 * Integration Setup Configuration
 * Auto-generated from project plan
 *
${setupNotes.map(line => ` * ${line}`).join('\n')}
 */

export interface IntegrationConfig {
  name: string;
  type: string;
  envVars: string[];
  enabled: boolean;
}

export const integrations: IntegrationConfig[] = [
${integrations.map(i => `  {
    name: "${i.name}",
    type: "${i.type}",
    envVars: [${i.envVariables.map(v => `"${v}"`).join(', ')}],
    enabled: ${i.envVariables.length > 0 ? i.envVariables.map(v => `!!process.env.${v}`).join(' && ') : 'true'},
  }`).join(',\n')}
];

export function getEnabledIntegrations(): IntegrationConfig[] {
  return integrations.filter(i => i.enabled);
}

export function checkIntegrationEnvVars(): { integration: string; missing: string[] }[] {
  const issues: { integration: string; missing: string[] }[] = [];
  for (const i of integrations) {
    const missing = i.envVars.filter(v => !process.env[v]);
    if (missing.length > 0) {
      issues.push({ integration: i.name, missing });
    }
  }
  return issues;
}
`,
  });

  if (envLines.length > 0) {
    files.push({
      path: '.env.example',
      language: 'text',
      content: `# Auto-generated environment variables for integrations
# Copy this file to .env and fill in the values

DATABASE_URL=

# Integration environment variables
${envLines.join('\n')}
`,
    });
  }

  return files;
}

function generateSecurityConfig(securityPlan: SecurityPlan): GeneratedFile {
  const roleChecks = securityPlan.roleHierarchy
    .sort((a, b) => a.level - b.level)
    .map(r => `  "${r.role}": ${r.level}`);

  const rateLimitRules = securityPlan.rateLimiting.map(rl =>
    `  { category: "${rl.category}", maxRequests: ${rl.maxRequests}, windowSeconds: ${rl.windowSeconds} }`
  );

  const auditEntities = securityPlan.auditLog?.entities || [];
  const auditOperations = securityPlan.auditLog?.operations || [];

  const entityPermBlocks = securityPlan.entityPermissions.map(ep =>
    `  { entity: "${ep.entity}", role: "${ep.role}", actions: [${ep.actions.map(a => `"${a}"`).join(', ')}] }`
  );

  return {
    path: 'server/security.ts',
    language: 'typescript',
    content: `/**
 * Security Configuration
 * Auth Strategy: ${securityPlan.authStrategy}
 * Auto-generated from project plan
 */

import type { Request, Response, NextFunction } from "express";

export const AUTH_STRATEGY = "${securityPlan.authStrategy}" as const;

export const ROLE_LEVELS: Record<string, number> = {
${roleChecks.join(',\n')}
};

export const ENTITY_PERMISSIONS = [
${entityPermBlocks.join(',\n')}
];

export const RATE_LIMIT_RULES = [
${rateLimitRules.join(',\n')}
];

export const AUDIT_CONFIG = {
  entities: [${auditEntities.map(e => `"${e}"`).join(', ')}],
  operations: [${auditOperations.map(o => `"${o}"`).join(', ')}],
};

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: true, message: "Authentication required" });
    }
    const userRole = user.role as string;
    if (!allowedRoles.includes(userRole)) {
      const userLevel = ROLE_LEVELS[userRole] ?? -1;
      const hasInheritedAccess = allowedRoles.some(r => {
        const requiredLevel = ROLE_LEVELS[r] ?? Infinity;
        return userLevel >= requiredLevel;
      });
      if (!hasInheritedAccess) {
        return res.status(403).json({ error: true, message: "Insufficient permissions" });
      }
    }
    next();
  };
}

export function checkEntityPermission(entity: string, action: "create" | "read" | "update" | "delete") {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: true, message: "Authentication required" });
    }
    const userRole = user.role as string;
    const permission = ENTITY_PERMISSIONS.find(
      p => p.entity === entity && p.role === userRole
    );
    if (!permission || !permission.actions.includes(action)) {
      return res.status(403).json({ error: true, message: \`No \${action} permission on \${entity}\` });
    }
    next();
  };
}

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(category: string) {
  const rule = RATE_LIMIT_RULES.find(r => r.category === category);
  if (!rule) return (_req: Request, _res: Response, next: NextFunction) => next();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = \`\${category}:\${(req as any).user?.id || req.ip}\`;
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetAt) {
      rateLimitStore.set(key, { count: 1, resetAt: now + rule.windowSeconds * 1000 });
      return next();
    }

    if (entry.count >= rule.maxRequests) {
      return res.status(429).json({ error: true, message: "Rate limit exceeded" });
    }

    entry.count++;
    next();
  };
}

export function auditLog(entity: string, operation: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (AUDIT_CONFIG.entities.includes(entity) && AUDIT_CONFIG.operations.includes(operation)) {
      const user = (req as any).user;
      console.log(\`[AUDIT] \${new Date().toISOString()} | user=\${user?.id || "anonymous"} | \${operation} \${entity} | path=\${req.path}\`);
    }
    next();
  };
}
`,
  };
}

function generatePerformanceConfig(perf: PerformancePlan, plan: ProjectPlan): GeneratedFile {
  const paginationConfigs = perf.pagination.map(p =>
    `  { entity: "${p.entity}", strategy: "${p.strategy}", pageSize: ${p.pageSize} }`
  );
  const cachingRules = perf.caching.map(c =>
    `  { endpoint: "${c.endpoint}", ttlSeconds: ${c.ttlSeconds}, invalidateOn: [${c.invalidateOn.map(i => `"${i}"`).join(', ')}] }`
  );
  const indexRecs = perf.indexRecommendations.map(idx =>
    `  { entity: "${idx.entity}", fields: [${idx.fields.map(f => `"${f}"`).join(', ')}], type: "${idx.type}" }`
  );
  const lazyTargets = perf.lazyLoadTargets.map(l =>
    `  { component: "${l.component}", reason: "${l.reason}" }`
  );

  return {
    path: 'server/performance.ts',
    language: 'typescript',
    content: `/**
 * Performance Configuration
 * Auto-generated from project plan
 */

import type { Request, Response, NextFunction } from "express";

export const PAGINATION_CONFIG = [
${paginationConfigs.join(',\n')}
];

export const CACHING_RULES = [
${cachingRules.join(',\n')}
];

export const INDEX_RECOMMENDATIONS = [
${indexRecs.join(',\n')}
];

export const LAZY_LOAD_TARGETS = [
${lazyTargets.join(',\n')}
];

export function getPaginationConfig(entity: string) {
  return PAGINATION_CONFIG.find(p => p.entity === entity) || { entity, strategy: "offset" as const, pageSize: 20 };
}

const responseCache = new Map<string, { data: any; expiresAt: number }>();

export function cacheMiddleware(endpoint: string) {
  const rule = CACHING_RULES.find(r => r.endpoint === endpoint);
  if (!rule) return (_req: Request, _res: Response, next: NextFunction) => next();

  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET") {
      for (const pattern of rule.invalidateOn) {
        for (const key of responseCache.keys()) {
          if (key.includes(pattern)) responseCache.delete(key);
        }
      }
      return next();
    }

    const cacheKey = \`\${endpoint}:\${req.url}\`;
    const cached = responseCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return res.json(cached.data);
    }

    const originalJson = res.json.bind(res);
    res.json = (data: any) => {
      responseCache.set(cacheKey, { data, expiresAt: Date.now() + rule.ttlSeconds * 1000 });
      return originalJson(data);
    };
    next();
  };
}
`,
  };
}

function generateCustomActionRoutes(customActions: CustomAction[], plan: ProjectPlan): GeneratedFile {
  const actionRouteBlocks = customActions.map(action => {
    const tableVar = `${toCamel(action.entity)}s`;
    const statusUpdate = action.statusTransition
      ? `
      const [item] = await db.select().from(${tableVar}).where(eq(${tableVar}.id, id));
      if (!item) return res.status(404).json({ error: true, message: "${action.entity} not found" });
      ${action.statusTransition.from !== '*' ? `if ((item as any).status !== "${action.statusTransition.from}") return res.status(400).json({ error: true, message: "Invalid status transition: expected ${action.statusTransition.from}" });` : ''}
      const [updated] = await db.update(${tableVar}).set({ status: "${action.statusTransition.to}", updatedAt: new Date() }).where(eq(${tableVar}.id, id)).returning();
      res.json(updated);`
      : `
      const [item] = await db.select().from(${tableVar}).where(eq(${tableVar}.id, id));
      if (!item) return res.status(404).json({ error: true, message: "${action.entity} not found" });
      res.json({ success: true, action: "${action.action}", entity: "${action.entity}", id });`;

    const roleGuard = action.requiredRole
      ? `\n    // Requires role: ${action.requiredRole}`
      : '';

    return `  // Custom Action: ${action.action} on ${action.entity}
  // ${action.description}${roleGuard}
  app.${action.method.toLowerCase()}("${action.path}", async (req, res) => {
    try {
      const id = Number(req.params.id);${statusUpdate}
    } catch (error: any) {
      res.status(500).json({ error: true, message: error.message, code: "INTERNAL_ERROR" });
    }
  });`;
  });

  const tableImports = Array.from(new Set(customActions.map(a => `${toCamel(a.entity)}s`))).join(', ');

  return {
    path: 'server/custom-actions.ts',
    language: 'typescript',
    content: `/**
 * Custom Action Routes
 * Auto-generated from project plan
 */

import type { Express } from "express";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { ${tableImports} } from "../shared/schema";

export function registerCustomActions(app: Express) {
${actionRouteBlocks.join('\n\n')}
}
`,
  };
}

export function generateProject(
  plan: ProjectPlan,
  reasoning: ReasoningResult | null,
  designSystem: DesignSystem | undefined,
  onProgress?: ProgressCallback,
  enrichment?: EnrichmentContext
): { files: GeneratedFile[]; validation: ReturnType<typeof validateGeneratedProject>; report: string } {
  const files: GeneratedFile[] = [];
  const emit = onProgress || (() => {});

  emit('components', 'Resolving component dependencies...');
  const allBaseComponents = getAllBaseComponents(plan);
  const requiredComponentIds = determineRequiredComponents(plan, reasoning);
  const resolvedComponents = resolveComponentDependencies(requiredComponentIds, allBaseComponents);
  emit('components', `Resolved ${resolvedComponents.length} components (${requiredComponentIds.length} required + transitive deps)`);

  for (const comp of resolvedComponents) {
    files.push({ path: comp.path, content: comp.content, language: comp.language });
  }

  const additionalNpmPackages = collectNpmPackages(resolvedComponents);

  emit('config', 'Generating project config files...');
  files.push(generatePackageJson(plan, additionalNpmPackages));
  files.push(generateIndexHtml(plan));
  files.push(generateMainTsx());
  files.push(generateViteConfig());
  files.push(generateTailwindConfig());
  files.push(generatePostcssConfig());
  files.push(generateTsConfig());
  files.push(generateTsConfigNode());
  files.push(generateIndexCss(designSystem));
  emit('config', 'Config files ready (package.json, vite, tailwind, tsconfig, postcss, index.css)');

  const hasAuth = planNeedsAuth(plan, enrichment);

  if (hasAuth) {
    const userEntity = plan.dataModel.find(e => {
      const n = e.name.toLowerCase();
      return n === 'user' || n === 'account' || n === 'member';
    });
    if (userEntity) {
      if (!userEntity.fields.find(f => f.name === 'password')) {
        userEntity.fields.push({ name: 'password', type: 'string', required: true, description: 'Hashed password' });
      }
      if (!userEntity.fields.find(f => f.name === 'email') && !userEntity.fields.find(f => f.name === 'username')) {
        userEntity.fields.push({ name: 'email', type: 'string', required: true, description: 'User email for login' });
      }
    }
  }

  emit('schema', 'Generating shared schema, database connection, and server routes...');
  files.push(generateSharedSchema(plan, reasoning, enrichment?.schemaDesign));
  files.push(generateDbFile());
  files.push(generateDrizzleConfig());
  files.push(generateServerRoutes(plan, reasoning, enrichment?.apiDesign));
  files.push(generateServerIndex(plan, hasAuth));
  if (hasAuth) {
    emit('schema', 'Generating authentication module (passport + sessions)...');
    files.push(generateAuthModule(plan));
  }
  emit('schema', `Schema: ${plan.dataModel?.length || 0} entities (Drizzle + PostgreSQL) | Server: ${plan.apiEndpoints?.length || 0} endpoints${hasAuth ? ' | Auth: enabled' : ''}`);

  emit('modules', 'Generating server modules...');
  const serverModuleFiles = generateServerModules(plan);
  for (const f of serverModuleFiles) {
    files.push(f);
  }

  if (plan.modules.length >= 2) {
    emit('modules', 'Generating client modules...');
    const clientModuleFiles = generateClientModules(plan);
    for (const f of clientModuleFiles) {
      files.push(f);
    }
  }

  const coreIssues = quickValidateCore(files);
  if (coreIssues.length > 0) {
    emit('validation', `Early validation found ${coreIssues.length} core issue(s): ${coreIssues.slice(0, 3).join('; ')}`);
  }

  emit('pages', `Building ${plan.pages.length} page components...`);
  const generatedPagePaths = new Set<string>();
  for (let i = 0; i < plan.pages.length; i++) {
    const page = plan.pages[i];
    const pagePath = `src/pages/${toKebab(page.componentName)}.tsx`;
    if (generatedPagePaths.has(pagePath)) continue;
    generatedPagePaths.add(pagePath);
    emit('pages', `[${i + 1}/${plan.pages.length}] Building ${page.componentName}...`);
    const content = generatePageContent(page, plan, reasoning, enrichment?.functionalitySpec);

    files.push({
      path: pagePath,
      content,
      language: 'tsx',
    });
  }

  if (hasAuth) {
    files.push(generateLoginPage());
    files.push(generateAuthHook());
  }
  files.push(generateAppTsx(plan, hasAuth));
  emit('pages', `All ${plan.pages.length} pages built + App shell${hasAuth ? ' + Auth pages' : ''}`);

  const allFilePaths = new Set(files.map(f => f.path));
  for (let i = 0; i < files.length; i++) {
    if (files[i].language === 'tsx' && files[i].path.startsWith('src/pages/')) {
      files[i] = { ...files[i], content: fixMissingLocalImports(files[i].content, allFilePaths) };
    }
  }

  if (plan.integrations && plan.integrations.length > 0) {
    emit('integrations', `Generating setup for ${plan.integrations.length} integration(s)...`);
    const integrationFiles = generateIntegrationSetupFiles(plan.integrations);
    for (const f of integrationFiles) {
      files.push(f);
    }
    emit('integrations', `Integration setup: ${plan.integrations.map(i => i.name).join(', ')}`);
  }

  if (plan.securityPlan) {
    emit('security', 'Generating security configuration...');
    files.push(generateSecurityConfig(plan.securityPlan));
    emit('security', `Security: ${plan.securityPlan.authStrategy} auth | ${plan.securityPlan.roleHierarchy?.length || 0} roles | ${plan.securityPlan.rateLimiting?.length || 0} rate limit rules`);
  }

  if (plan.customActions && plan.customActions.length > 0) {
    emit('custom-actions', `Generating ${plan.customActions.length} custom action route(s)...`);
    files.push(generateCustomActionRoutes(plan.customActions, plan));
    emit('custom-actions', `Custom actions: ${plan.customActions.map(a => `${a.action}(${a.entity})`).join(', ')}`);
  }

  if (plan.performancePlan) {
    emit('performance', 'Generating performance configuration...');
    files.push(generatePerformanceConfig(plan.performancePlan, plan));
    emit('performance', `Performance: ${plan.performancePlan.pagination?.length || 0} pagination configs | ${plan.performancePlan.caching?.length || 0} cache rules | ${plan.performancePlan.indexRecommendations?.length || 0} index recommendations`);
  }

  emit('validation', 'Running post-generation validation...');
  const validation = validateGeneratedProject(files);
  const report = formatValidationReport(validation);
  emit('validation', `Validation: ${validation.errors.length} errors, ${validation.warnings.length} warnings`);

  return { files, validation, report };
}

function determineRequiredComponents(plan: ProjectPlan, reasoning: ReasoningResult | null): string[] {
  const required = new Set([
    'lib-utils',
    'lib-queryClient',
    'hook-useToast',
    'ui-button',
    'ui-card',
    'ui-input',
    'ui-label',
    'ui-dialog',
    'ui-toaster',
    'ui-badge',
    'ui-tabs',
    'ui-select',
    'ui-textarea',
    'comp-confirm-dialog',
    'comp-loading-skeleton',
    'comp-theme-provider',
    'comp-data-table',
    'comp-search-bar',
    'comp-empty-state',
    'comp-status-badge',
  ]);

  const hasDashboard = plan.pages.some(p =>
    p.name.toLowerCase().includes('dashboard') || p.features?.includes('dashboard')
  );
  if (hasDashboard) required.add('comp-kpi-card');

  return Array.from(required);
}

function fixMissingLocalImports(content: string, knownPaths: Set<string>): string {
  const lines = content.split('\n');
  const result: string[] = [];

  for (const line of lines) {
    const match = line.match(/^import\s+.*\s+from\s+["']@\/(.+?)["'];?\s*$/);
    if (match) {
      const importPath = `src/${match[1]}`;
      const resolvedPaths = [
        importPath,
        `${importPath}.ts`,
        `${importPath}.tsx`,
        `${importPath}/index.ts`,
        `${importPath}/index.tsx`,
      ];
      const exists = resolvedPaths.some(p => knownPaths.has(p));
      if (exists) {
        result.push(line);
      }
    } else {
      result.push(line);
    }
  }

  return result.join('\n');
}

function generatePageContent(page: PlannedPage, plan: ProjectPlan, reasoning: ReasoningResult | null, functionalitySpec?: FunctionalitySpec): string {
  const pageType = classifyPage(page, plan);
  const uiPattern = reasoning?.uiPatterns?.find(p => p.entityName === page.dataNeeded?.[0]);

  const entityName = page.dataNeeded?.[0];
  const entityFeatures = entityName
    ? functionalitySpec?.entityFeatures?.find(ef => ef.entityName === entityName)
    : undefined;
  const pageFeatures = functionalitySpec?.pageFeatures?.find(pf => pf.pageName === page.name || pf.pagePath === page.path);

  if (pageType === 'list' && entityFeatures && uiPattern) {
    const hasKanbanFeature = entityFeatures.interactiveFeatures?.some(f => f.type === 'drag-drop' || f.type === 'status-transition');
    if (hasKanbanFeature && !uiPattern.pattern) {
      uiPattern.pattern = 'table';
    }
  }

  switch (pageType) {
    case 'kanban':
      return generateKanbanPage(page, plan, reasoning);
    case 'calendar':
      return generateCalendarPage(page, plan, reasoning);
    case 'settings':
      return generateSettingsPage(page, plan, reasoning);
    case 'timeline':
      return generateTimelinePage(page, plan, reasoning);
    case 'gallery':
      return generateGalleryPage(page, plan, reasoning);
    case 'list':
      return generateListPage(page, plan, reasoning, uiPattern);
    case 'detail':
      return generateDetailPage(page, plan, reasoning);
    case 'dashboard':
      return generateDashboardPage(page, plan, reasoning);
    default:
      return generateGenericPage(page);
  }
}

type PageType = 'list' | 'detail' | 'dashboard' | 'kanban' | 'calendar' | 'settings' | 'timeline' | 'gallery' | 'generic';

function classifyPage(page: PlannedPage, plan: ProjectPlan): PageType {
  const nameLower = page.name.toLowerCase();
  const pathLower = page.path.toLowerCase();
  const feats = (page.features || []).map(f => f.toLowerCase());
  const allText = `${nameLower} ${pathLower} ${feats.join(' ')}`;

  if (nameLower.includes('dashboard') || feats.includes('dashboard') || pathLower === '/' || pathLower === '/dashboard') {
    return 'dashboard';
  }

  if (pathLower.includes('/:id') || nameLower.includes('detail') || nameLower.includes('view ')) {
    return 'detail';
  }

  if (/kanban|board/.test(allText) && !allText.includes('dashboard')) {
    return 'kanban';
  }

  if (/calendar|schedule|planner/.test(allText) && !allText.includes('list')) {
    return 'calendar';
  }

  if (/settings|preferences|configuration|account settings/.test(allText)) {
    return 'settings';
  }

  if (/timeline|activity.?feed|activity.?log|audit.?log|history/.test(allText)) {
    return 'timeline';
  }

  if (/gallery|portfolio|showcase|photo|media.?library/.test(allText)) {
    return 'gallery';
  }

  if (page.dataNeeded?.length > 0) {
    const entity = plan.dataModel.find(e => e.name === page.dataNeeded[0]);
    if (entity) {
      return 'list';
    }
  }

  if (feats.some(f => f.includes('list') || f.includes('table') || f.includes('crud'))) {
    return 'list';
  }

  return 'generic';
}

function generatePackageJson(plan: ProjectPlan, additionalPackages: Set<string>): GeneratedFile {
  const deps: Record<string, string> = { ...AVAILABLE_DEPS };

  for (const pkg of Array.from(additionalPackages.values())) {
    if (AVAILABLE_DEPS[pkg]) {
      deps[pkg] = AVAILABLE_DEPS[pkg];
    }
  }

  const content = JSON.stringify({
    name: toSlug(plan.projectName),
    private: true,
    version: '1.0.0',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview',
    },
    dependencies: deps,
    devDependencies: DEV_DEPS,
  }, null, 2);

  return { path: 'package.json', content, language: 'json' };
}

function generateIndexHtml(plan: ProjectPlan): GeneratedFile {
  return {
    path: 'index.html',
    language: 'html',
    content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${plan.projectName}</title>
    <meta name="description" content="${plan.overview}" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
  };
}

function generateMainTsx(): GeneratedFile {
  return {
    path: 'src/main.tsx',
    language: 'tsx',
    content: `import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

document.documentElement.classList.add("dark");

createRoot(document.getElementById("root")!).render(<App />);
`,
  };
}

function generateViteConfig(): GeneratedFile {
  return {
    path: 'vite.config.ts',
    language: 'typescript',
    content: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5200,
  },
});
`,
  };
}

function generateTailwindConfig(): GeneratedFile {
  return {
    path: 'tailwind.config.ts',
    language: 'typescript',
    content: `import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
} satisfies Config;
`,
  };
}

function generatePostcssConfig(): GeneratedFile {
  return {
    path: 'postcss.config.js',
    language: 'javascript',
    content: `export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
`,
  };
}

function generateTsConfig(): GeneratedFile {
  return {
    path: 'tsconfig.json',
    language: 'json',
    content: JSON.stringify({
      compilerOptions: {
        target: 'ES2020',
        useDefineForClassFields: true,
        lib: ['ES2020', 'DOM', 'DOM.Iterable'],
        module: 'ESNext',
        skipLibCheck: true,
        moduleResolution: 'bundler',
        allowImportingTsExtensions: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: 'react-jsx',
        strict: true,
        noUnusedLocals: false,
        noUnusedParameters: false,
        noFallthroughCasesInSwitch: true,
        paths: {
          '@/*': ['./src/*'],
          '@shared/*': ['./shared/*'],
        },
        baseUrl: '.',
      },
      include: ['src'],
      references: [{ path: './tsconfig.node.json' }],
    }, null, 2),
  };
}

function generateTsConfigNode(): GeneratedFile {
  return {
    path: 'tsconfig.node.json',
    language: 'json',
    content: JSON.stringify({
      compilerOptions: {
        composite: true,
        skipLibCheck: true,
        module: 'ESNext',
        moduleResolution: 'bundler',
        allowSyntheticDefaultImports: true,
      },
      include: ['vite.config.ts'],
    }, null, 2),
  };
}

function generateIndexCss(designSystem?: DesignSystem): GeneratedFile {
  const light = designSystem?.lightTokens;
  const dark = designSystem?.darkTokens;

  return {
    path: 'src/index.css',
    language: 'css',
    content: `@import "tailwindcss";

@theme inline {
  --color-background: hsl(${light?.background || "0 0% 100%"});
  --color-foreground: hsl(${light?.foreground || "222.2 84% 4.9%"});
  --color-card: hsl(${light?.card || "0 0% 100%"});
  --color-card-foreground: hsl(${light?.cardForeground || "222.2 84% 4.9%"});
  --color-popover: hsl(${light?.popover || "0 0% 100%"});
  --color-popover-foreground: hsl(${light?.popoverForeground || "222.2 84% 4.9%"});
  --color-primary: hsl(${light?.primary || "222.2 47.4% 11.2%"});
  --color-primary-foreground: hsl(${light?.primaryForeground || "210 40% 98%"});
  --color-secondary: hsl(${light?.secondary || "210 40% 96.1%"});
  --color-secondary-foreground: hsl(${light?.secondaryForeground || "222.2 47.4% 11.2%"});
  --color-muted: hsl(${light?.muted || "210 40% 96.1%"});
  --color-muted-foreground: hsl(${light?.mutedForeground || "215.4 16.3% 46.9%"});
  --color-accent: hsl(${light?.accent || "210 40% 96.1%"});
  --color-accent-foreground: hsl(${light?.accentForeground || "222.2 47.4% 11.2%"});
  --color-destructive: hsl(${light?.destructive || "0 84.2% 60.2%"});
  --color-destructive-foreground: hsl(${light?.destructiveForeground || "210 40% 98%"});
  --color-border: hsl(${light?.border || "214.3 31.8% 91.4%"});
  --color-input: hsl(${light?.input || "214.3 31.8% 91.4%"});
  --color-ring: hsl(${light?.ring || "222.2 84% 4.9%"});
  --radius: 0.5rem;
  --radius-lg: var(--radius);
  --radius-md: calc(var(--radius) - 2px);
  --radius-sm: calc(var(--radius) - 4px);
}

:root {
  --background: ${light?.background || "0 0% 100%"};
  --foreground: ${light?.foreground || "222.2 84% 4.9%"};
  --card: ${light?.card || "0 0% 100%"};
  --card-foreground: ${light?.cardForeground || "222.2 84% 4.9%"};
  --popover: ${light?.popover || "0 0% 100%"};
  --popover-foreground: ${light?.popoverForeground || "222.2 84% 4.9%"};
  --primary: ${light?.primary || "222.2 47.4% 11.2%"};
  --primary-foreground: ${light?.primaryForeground || "210 40% 98%"};
  --secondary: ${light?.secondary || "210 40% 96.1%"};
  --secondary-foreground: ${light?.secondaryForeground || "222.2 47.4% 11.2%"};
  --muted: ${light?.muted || "210 40% 96.1%"};
  --muted-foreground: ${light?.mutedForeground || "215.4 16.3% 46.9%"};
  --accent: ${light?.accent || "210 40% 96.1%"};
  --accent-foreground: ${light?.accentForeground || "222.2 47.4% 11.2%"};
  --destructive: ${light?.destructive || "0 84.2% 60.2%"};
  --destructive-foreground: ${light?.destructiveForeground || "210 40% 98%"};
  --border: ${light?.border || "214.3 31.8% 91.4%"};
  --input: ${light?.input || "214.3 31.8% 91.4%"};
  --ring: ${light?.ring || "222.2 84% 4.9%"};
  --radius: 0.5rem;
}

.dark {
  --background: ${dark?.background || "222.2 84% 4.9%"};
  --foreground: ${dark?.foreground || "210 40% 98%"};
  --card: ${dark?.card || "222.2 84% 4.9%"};
  --card-foreground: ${dark?.cardForeground || "210 40% 98%"};
  --popover: ${dark?.popover || "222.2 84% 4.9%"};
  --popover-foreground: ${dark?.popoverForeground || "210 40% 98%"};
  --primary: ${dark?.primary || "210 40% 98%"};
  --primary-foreground: ${dark?.primaryForeground || "222.2 47.4% 11.2%"};
  --secondary: ${dark?.secondary || "217.2 32.6% 17.5%"};
  --secondary-foreground: ${dark?.secondaryForeground || "210 40% 98%"};
  --muted: ${dark?.muted || "217.2 32.6% 17.5%"};
  --muted-foreground: ${dark?.mutedForeground || "215 20.2% 65.1%"};
  --accent: ${dark?.accent || "217.2 32.6% 17.5%"};
  --accent-foreground: ${dark?.accentForeground || "210 40% 98%"};
  --destructive: ${dark?.destructive || "0 62.8% 30.6%"};
  --destructive-foreground: ${dark?.destructiveForeground || "210 40% 98%"};
  --border: ${dark?.border || "217.2 32.6% 17.5%"};
  --input: ${dark?.input || "217.2 32.6% 17.5%"};
  --ring: ${dark?.ring || "212.7 26.8% 83.9%"};
}

* {
  border-color: hsl(var(--border));
}

body {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes zoom-in-95 {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.animate-in {
  animation: fade-in 0.15s ease-out, zoom-in-95 0.15s ease-out;
}
`,
  };
}

function fieldToDrizzleColumn(f: { name: string; type: string; required: boolean; description?: string }, tableDesign?: TableDesign, enumVarName?: string): string {
  const snakeName = toSnakeCase(f.name);

  if (f.name === 'id') {
    return `  id: serial("id").primaryKey()`;
  }

  const col = tableDesign?.columns?.find(c => c.name === snakeName);

  if (f.type === 'boolean') {
    const base = `boolean("${snakeName}")`;
    return `  ${f.name}: ${base}${col?.defaultValue ? `.default(${col.defaultValue})` : ''}${!f.required ? '' : '.notNull()'}`;
  }

  if (f.type === 'integer' || f.type === 'number') {
    const base = `integer("${snakeName}")`;
    return `  ${f.name}: ${base}${col?.defaultValue ? `.default(${col.defaultValue})` : ''}${!f.required ? '' : '.notNull()'}`;
  }

  if (f.type === 'real' || f.type.includes('decimal') || f.type === 'float' || f.type === 'double') {
    const prec = col?.precision || 10;
    const scale = col?.scale || 2;
    const base = `numeric("${snakeName}", { precision: ${prec}, scale: ${scale} })`;
    return `  ${f.name}: ${base}${!f.required ? '' : '.notNull()'}`;
  }

  if (f.type === 'datetime' || f.type === 'timestamp') {
    const base = `timestamp("${snakeName}")`;
    const def = col?.defaultValue === 'CURRENT_TIMESTAMP' ? '.defaultNow()' : '';
    return `  ${f.name}: ${base}${def}${!f.required ? '' : '.notNull()'}`;
  }

  if (f.type === 'date') {
    const base = `date("${snakeName}")`;
    return `  ${f.name}: ${base}${!f.required ? '' : '.notNull()'}`;
  }

  if (f.type.includes('enum') || enumVarName) {
    if (enumVarName) {
      const base = `${enumVarName}("${snakeName}")`;
      return `  ${f.name}: ${base}${!f.required ? '' : '.notNull()'}`;
    }
    const enumMatch = f.type.match(/enum\(([^)]+)\)/);
    if (enumMatch) {
      const base = `text("${snakeName}")`;
      return `  ${f.name}: ${base}${!f.required ? '' : '.notNull()'}`;
    }
  }

  if (f.type === 'json' || f.type === 'jsonb') {
    const base = `jsonb("${snakeName}")`;
    return `  ${f.name}: ${base}`;
  }

  const maxLen = col?.maxLength;
  if (maxLen) {
    const base = `varchar("${snakeName}", { length: ${maxLen} })`;
    return `  ${f.name}: ${base}${!f.required ? '' : '.notNull()'}`;
  }

  const base = `text("${snakeName}")`;
  return `  ${f.name}: ${base}${!f.required ? '' : '.notNull()'}`;
}

function generateSchemaEvolutionComment(plan: ProjectPlan, existingEntities?: string[]): string {
  if (!existingEntities || existingEntities.length === 0) return '';

  const existing = new Set(existingEntities.map(e => e.toLowerCase()));
  const newEntities = plan.dataModel.filter(e => !existing.has(e.name.toLowerCase()));
  const modifiedEntities = plan.dataModel.filter(e => existing.has(e.name.toLowerCase()));

  if (newEntities.length === 0 && modifiedEntities.length === 0) return '';

  const lines = ['/**', ' * Schema Evolution Notes:'];
  if (newEntities.length > 0) {
    lines.push(` * NEW TABLES: ${newEntities.map(e => e.name).join(', ')}`);
    lines.push(` * - Run \`npm run db:push\` to create these tables`);
  }
  if (modifiedEntities.length > 0) {
    lines.push(` * MODIFIED TABLES: ${modifiedEntities.map(e => e.name).join(', ')}`);
    lines.push(` * - New columns use .default() for backward compatibility`);
    lines.push(` * - Run \`npm run db:push\` to apply additive changes`);
    lines.push(` * - WARNING: Removing columns requires manual migration`);
  }
  lines.push(' */\n');
  return lines.join('\n');
}

function generateSharedSchema(plan: ProjectPlan, reasoning: ReasoningResult | null, schemaDesign?: SchemaDesign): GeneratedFile {
  const drizzleImports = new Set<string>(['pgTable', 'serial', 'text']);

  const enumMap = new Map<string, string>();
  const enumDeclarations: string[] = [];

  if (schemaDesign?.enums && schemaDesign.enums.length > 0) {
    drizzleImports.add('pgEnum');
    for (const enumDef of schemaDesign.enums) {
      const varName = enumDef.name.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()) + 'Enum';
      const valuesStr = enumDef.values.map(v => `"${v}"`).join(', ');
      enumDeclarations.push(`export const ${varName} = pgEnum("${enumDef.name}", [${valuesStr}]);`);
      for (const usage of enumDef.usedBy) {
        enumMap.set(`${usage.table}:${usage.column}`, varName);
      }
    }
  }

  for (const entity of plan.dataModel) {
    for (const field of entity.fields) {
      if (field.type.includes('enum')) {
        const enumMatch = field.type.match(/enum\(([^)]+)\)/);
        if (enumMatch) {
          const tableName = toSnakeCase(entity.name);
          const colName = toSnakeCase(field.name);
          const key = `${tableName}:${colName}`;
          if (!enumMap.has(key)) {
            drizzleImports.add('pgEnum');
            const enumName = `${tableName}_${colName}`;
            const varName = enumName.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()) + 'Enum';
            const values = enumMatch[1].split(',').map(v => v.trim().replace(/'/g, ''));
            const valuesStr = values.map(v => `"${v}"`).join(', ');
            enumDeclarations.push(`export const ${varName} = pgEnum("${enumName}", [${valuesStr}]);`);
            enumMap.set(key, varName);
          }
        }
      }
    }
  }

  const tableDefinitions = plan.dataModel.map(entity => {
    const tableDesign = schemaDesign?.tables?.find(t => t.entityName === entity.name);
    const tableName = toSnakeCase(entity.name) + 's';
    const tableNameNoPlural = toSnakeCase(entity.name);

    const allFields = [...entity.fields];
    if (tableDesign) {
      if (tableDesign.hasTimestamps) {
        if (!allFields.find(f => f.name === 'createdAt')) {
          allFields.push({ name: 'createdAt', type: 'timestamp', required: false, description: 'Record creation timestamp' });
        }
        if (!allFields.find(f => f.name === 'updatedAt')) {
          allFields.push({ name: 'updatedAt', type: 'timestamp', required: false, description: 'Last update timestamp' });
        }
      }
      if (tableDesign.hasSoftDelete && !allFields.find(f => f.name === 'deletedAt')) {
        allFields.push({ name: 'deletedAt', type: 'timestamp', required: false, description: 'Soft delete timestamp' });
      }
      for (const fk of tableDesign.foreignKeys) {
        const fkFieldName = fk.column.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
        if (!allFields.find(f => f.name === fkFieldName || toSnakeCase(f.name) === fk.column)) {
          allFields.push({ name: fkFieldName, type: 'integer', required: false, description: `Foreign key to ${fk.referencesTable}` });
        }
      }
    } else {
      if (!allFields.find(f => f.name === 'createdAt')) {
        allFields.push({ name: 'createdAt', type: 'timestamp', required: false, description: 'Record creation timestamp' });
      }
      if (!allFields.find(f => f.name === 'updatedAt')) {
        allFields.push({ name: 'updatedAt', type: 'timestamp', required: false, description: 'Last update timestamp' });
      }
    }

    for (const f of allFields) {
      if (f.name === 'id') { drizzleImports.add('serial'); continue; }
      const colName = toSnakeCase(f.name);
      const enumKey = `${tableNameNoPlural}:${colName}`;
      if (enumMap.has(enumKey)) continue;
      if (f.type === 'boolean') drizzleImports.add('boolean');
      else if (f.type === 'integer' || f.type === 'number') drizzleImports.add('integer');
      else if (f.type === 'real' || f.type.includes('decimal') || f.type === 'float' || f.type === 'double') drizzleImports.add('numeric');
      else if (f.type === 'datetime' || f.type === 'timestamp') drizzleImports.add('timestamp');
      else if (f.type === 'date') drizzleImports.add('date');
      else if (f.type === 'json' || f.type === 'jsonb') drizzleImports.add('jsonb');
      else {
        const col = tableDesign?.columns?.find(c => c.name === colName);
        if (col?.maxLength) drizzleImports.add('varchar');
        else drizzleImports.add('text');
      }
    }

    const columnLines = allFields.map(f => {
      const colName = toSnakeCase(f.name);
      const enumKey = `${tableNameNoPlural}:${colName}`;
      const enumVar = enumMap.get(enumKey);
      return fieldToDrizzleColumn(f, tableDesign, enumVar);
    }).join(',\n');

    const tableIndexes: IndexDesign[] = [];
    if (tableDesign?.indexes) {
      tableIndexes.push(...tableDesign.indexes);
    }
    if (schemaDesign?.indexes) {
      for (const idx of schemaDesign.indexes) {
        if (idx.table === tableName || idx.table === toSnakeCase(entity.name)) {
          if (!tableIndexes.find(ti => ti.name === idx.name)) {
            tableIndexes.push(idx);
          }
        }
      }
    }

    if (tableIndexes.length > 0) {
      for (const idx of tableIndexes) {
        if (idx.unique) {
          drizzleImports.add('uniqueIndex');
        } else {
          drizzleImports.add('index');
        }
      }

      const tableVarName = toCamel(entity.name) + 's';
      const indexLines = tableIndexes.map(idx => {
        const idxFn = idx.unique ? 'uniqueIndex' : 'index';
        const colRefs = idx.columns.map(col => {
          const camelCol = col.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
          return `table.${camelCol}`;
        }).join(', ');
        return `    ${idxFn}("${idx.name}").on(${colRefs})`;
      }).join(',\n');

      return `export const ${tableVarName} = pgTable("${tableName}", {
${columnLines},
}, (table) => [
${indexLines},
]);`;
    }

    return `export const ${toCamel(entity.name)}s = pgTable("${tableName}", {
${columnLines},
});`;
  }).join('\n\n');

  let junctionTableDefs = '';
  if (schemaDesign?.junctionTables && schemaDesign.junctionTables.length > 0) {
    drizzleImports.add('integer');
    junctionTableDefs = '\n\n' + schemaDesign.junctionTables.map(jt => {
      const varName = jt.name.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
      return `export const ${varName} = pgTable("${jt.name}", {
  id: serial("id").primaryKey(),
  ${jt.leftColumn}: integer("${toSnakeCase(jt.leftColumn)}").notNull(),
  ${jt.rightColumn}: integer("${toSnakeCase(jt.rightColumn)}").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});`;
    }).join('\n\n');
  }

  const findEnumValues = (entityName: string, fieldName: string): string[] | null => {
    const tableName = toSnakeCase(entityName);
    const colName = toSnakeCase(fieldName);
    const key = `${tableName}:${colName}`;
    if (enumMap.has(key) && schemaDesign?.enums) {
      const enumDef = schemaDesign.enums.find(e =>
        e.usedBy.some(u => u.table === tableName && u.column === colName)
      );
      if (enumDef) return enumDef.values;
    }
    return null;
  };

  const zodSchemas = plan.dataModel.map(entity => {
    const tableDesign = schemaDesign?.tables?.find(t => t.entityName === entity.name);
    const allFields = [...entity.fields];
    if (tableDesign?.hasTimestamps || !tableDesign) {
      if (!allFields.find(f => f.name === 'createdAt')) allFields.push({ name: 'createdAt', type: 'datetime', required: false, description: '' });
      if (!allFields.find(f => f.name === 'updatedAt')) allFields.push({ name: 'updatedAt', type: 'datetime', required: false, description: '' });
    }
    if (tableDesign?.hasSoftDelete && !allFields.find(f => f.name === 'deletedAt')) {
      allFields.push({ name: 'deletedAt', type: 'datetime', required: false, description: '' });
    }
    if (tableDesign?.foreignKeys) {
      for (const fk of tableDesign.foreignKeys) {
        const fkFieldName = fk.column.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
        if (!allFields.find(f => f.name === fkFieldName)) {
          allFields.push({ name: fkFieldName, type: 'integer', required: false, description: '' });
        }
      }
    }

    const resolveZodType = (f: { name: string; type: string; required?: boolean }) => {
      let zodType = 'z.string()';
      if (f.type === 'boolean') zodType = 'z.boolean()';
      else if (f.type === 'integer' || f.type === 'number') zodType = 'z.number()';
      else if (f.type === 'real' || f.type.includes('decimal') || f.type === 'float' || f.type === 'double') zodType = 'z.number()';
      else if (f.type === 'datetime' || f.type === 'timestamp' || f.type === 'date') zodType = 'z.string()';
      else if (f.type.includes('enum')) {
        const enumMatch = f.type.match(/enum\(([^)]+)\)/);
        if (enumMatch) {
          const values = enumMatch[1].split(',').map(v => v.trim().replace(/'/g, ''));
          zodType = `z.enum([${values.map(v => `"${v}"`).join(', ')}])`;
        }
      }
      if (zodType === 'z.string()') {
        const enumValues = findEnumValues(entity.name, f.name);
        if (enumValues) {
          zodType = `z.enum([${enumValues.map(v => `"${v}"`).join(', ')}])`;
        }
      }
      if (tableDesign && zodType === 'z.string()') {
        const col = tableDesign.columns.find(c => c.name === toSnakeCase(f.name));
        if (col?.maxLength) zodType = `z.string().max(${col.maxLength})`;
      }
      return zodType;
    };

    const fieldLines = allFields.map(f => {
      if (f.name === 'id') return `  ${f.name}: z.number()`;
      let zodType = resolveZodType(f);
      if (!f.required && f.name !== 'id') zodType += '.optional()';
      return `  ${f.name}: ${zodType}`;
    }).join(',\n');

    const insertFields = allFields
      .filter(f => f.name !== 'id' && f.name !== 'createdAt' && f.name !== 'updatedAt' && f.name !== 'deletedAt')
      .map(f => {
        let zodType = resolveZodType(f);
        if (!f.required) zodType += '.optional()';
        return `  ${f.name}: ${zodType}`;
      }).join(',\n');

    return `export const ${toCamel(entity.name)}Schema = z.object({
${fieldLines},
});

export const insert${entity.name}Schema = z.object({
${insertFields},
});

export type ${entity.name} = z.infer<typeof ${toCamel(entity.name)}Schema>;
export type Insert${entity.name} = z.infer<typeof insert${entity.name}Schema>;`;
  }).join('\n\n');

  const drizzleImportList = Array.from(drizzleImports).sort().join(', ');

  return {
    path: 'shared/schema.ts',
    language: 'typescript',
    content: `${generateSchemaEvolutionComment(plan)}import { ${drizzleImportList} } from "drizzle-orm/pg-core";
import { z } from "zod";
${enumDeclarations.length > 0 ? `
// ============================================================================
// Enum Definitions
// ============================================================================

${enumDeclarations.join('\n\n')}
` : ''}
// ============================================================================
// Drizzle Table Definitions (used by server routes for database operations)
// ============================================================================

${tableDefinitions}${junctionTableDefs}

// ============================================================================
// Zod Schemas (used for API validation)
// ============================================================================

${zodSchemas}
`,
  };
}

function generateServerRoutes(plan: ProjectPlan, reasoning: ReasoningResult | null, apiDesign?: APIDesign): GeneratedFile {
  const paginationDesign = apiDesign?.pagination;
  const defaultPageSize = paginationDesign?.defaultPageSize || 20;
  const maxPageSize = paginationDesign?.maxPageSize || 100;

  const tableImports = plan.dataModel.map(entity => `${toCamel(entity.name)}s`).join(', ');
  const zodImports = plan.dataModel.map(entity => `insert${entity.name}Schema`).join(', ');

  const routeBlocks = plan.dataModel.map(entity => {
    const entitySlug = toKebab(entity.name);
    const endpoint = `/api/${entitySlug}s`;
    const tableVar = `${toCamel(entity.name)}s`;

    const searchableFields = entity.fields.filter(f => {
      const n = f.name.toLowerCase();
      return n.includes('name') || n.includes('title') || n.includes('description') || n === 'email';
    });
    const filterableFields = entity.fields.filter(f => {
      const n = f.name.toLowerCase();
      return n === 'status' || n === 'type' || n === 'category' || n === 'priority' || n === 'role';
    });

    const hasApiPagination = apiDesign?.routes?.some(r => r.entity === entity.name && r.operation === 'list' && r.responseSchema?.shape === 'paginated');

    const validationFields = entity.fields
      .filter(f => f.name !== 'id' && f.name !== 'createdAt' && f.name !== 'updatedAt')
      .map(f => {
        const n = f.name.toLowerCase();
        if (n.includes('email')) return `      if (data.${f.name} && !/^[^@]+@[^@]+\\.[^@]+$/.test(data.${f.name})) return res.status(400).json({ error: true, message: "Invalid email format", code: "VALIDATION_ERROR" });`;
        if (n.includes('price') || n.includes('amount') || n.includes('cost')) return `      if (data.${f.name} !== undefined && data.${f.name} < 0) return res.status(400).json({ error: true, message: "${f.name} must be non-negative", code: "VALIDATION_ERROR" });`;
        return null;
      }).filter(Boolean);

    const validationBlock = validationFields.length > 0
      ? validationFields.join('\n') + '\n'
      : '';

    const whereConditions: string[] = [];
    if (searchableFields.length > 0) {
      const orConditions = searchableFields.map(f =>
        `ilike(${tableVar}.${f.name}, \`%\${search}%\`)`
      ).join(', ');
      whereConditions.push(`search ? or(${orConditions}) : undefined`);
    }
    for (const f of filterableFields) {
      whereConditions.push(`req.query.${f.name} ? eq(${tableVar}.${f.name}, req.query.${f.name} as string) : undefined`);
    }

    const needsSearch = searchableFields.length > 0;
    const needsFilter = filterableFields.length > 0;
    const needsPagination = hasApiPagination || needsSearch || needsFilter;

    let listHandler: string;
    if (needsPagination) {
      const whereBlock = whereConditions.length > 0
        ? `\n      const conditions = [${whereConditions.join(', ')}].filter(Boolean);\n      if (conditions.length > 0) query = query.where(and(...conditions));`
        : '';

      listHandler = `  app.get("${endpoint}", async (req, res) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(${maxPageSize}, Math.max(1, Number(req.query.limit) || ${defaultPageSize}));
      const search = req.query.search as string | undefined;
      const offset = (page - 1) * limit;

      let query = db.select().from(${tableVar}).$dynamic();${whereBlock}

      const [countResult] = await db.select({ count: sql\`count(*)\` }).from(${tableVar});
      const total = Number(countResult?.count || 0);
      const data = await query.limit(limit).offset(offset).orderBy(desc(${tableVar}.id));

      res.json({ data, total, page, pageSize: limit, hasMore: offset + limit < total });
    } catch (error: any) {
      res.status(500).json({ error: true, message: error.message, code: "INTERNAL_ERROR" });
    }
  });`;
    } else {
      listHandler = `  app.get("${endpoint}", async (_req, res) => {
    try {
      const items = await db.select().from(${tableVar}).orderBy(desc(${tableVar}.id));
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ error: true, message: error.message, code: "INTERNAL_ERROR" });
    }
  });`;
    }

    return `  // ${entity.name} CRUD
${listHandler}

  app.get("${endpoint}/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const [item] = await db.select().from(${tableVar}).where(eq(${tableVar}.id, id));
      if (!item) return res.status(404).json({ error: true, message: "${entity.name} not found", code: "NOT_FOUND" });
      res.json(item);
    } catch (error: any) {
      res.status(500).json({ error: true, message: error.message, code: "INTERNAL_ERROR" });
    }
  });

  app.post("${endpoint}", async (req, res) => {
    try {
      const data = insert${entity.name}Schema.parse(req.body);
${validationBlock}      const [item] = await db.insert(${tableVar}).values(data).returning();
      res.status(201).json(item);
    } catch (error: any) {
      res.status(400).json({ error: true, message: error.message, code: "VALIDATION_ERROR" });
    }
  });

  app.put("${endpoint}/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const data = req.body;
${validationBlock}      const [updated] = await db.update(${tableVar}).set({ ...data, updatedAt: new Date() }).where(eq(${tableVar}.id, id)).returning();
      if (!updated) return res.status(404).json({ error: true, message: "${entity.name} not found", code: "NOT_FOUND" });
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: true, message: error.message, code: "VALIDATION_ERROR" });
    }
  });

  app.delete("${endpoint}/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const [deleted] = await db.delete(${tableVar}).where(eq(${tableVar}.id, id)).returning();
      if (!deleted) return res.status(404).json({ error: true, message: "${entity.name} not found", code: "NOT_FOUND" });
      res.status(204).end();
    } catch (error: any) {
      res.status(500).json({ error: true, message: error.message, code: "INTERNAL_ERROR" });
    }
  });`;
  }).join('\n\n');

  const needsOr = plan.dataModel.some(entity => {
    const searchableFields = entity.fields.filter(f => {
      const n = f.name.toLowerCase();
      return n.includes('name') || n.includes('title') || n.includes('description') || n === 'email';
    });
    return searchableFields.length > 0;
  });

  const needsAnd = plan.dataModel.some(entity => {
    const searchableFields = entity.fields.filter(f => {
      const n = f.name.toLowerCase();
      return n.includes('name') || n.includes('title') || n.includes('description') || n === 'email';
    });
    const filterableFields = entity.fields.filter(f => {
      const n = f.name.toLowerCase();
      return n === 'status' || n === 'type' || n === 'category' || n === 'priority' || n === 'role';
    });
    return searchableFields.length > 0 || filterableFields.length > 0;
  });

  const needsIlike = needsOr;
  const needsSql = plan.dataModel.some(entity => {
    const apiPag = apiDesign?.routes?.some(r => r.entity === entity.name && r.operation === 'list' && r.responseSchema?.shape === 'paginated');
    const searchableFields = entity.fields.filter(f => {
      const n = f.name.toLowerCase();
      return n.includes('name') || n.includes('title') || n.includes('description') || n === 'email';
    });
    return apiPag || searchableFields.length > 0;
  });

  const drizzleOrmImports = ['eq', 'desc'];
  if (needsOr) drizzleOrmImports.push('or');
  if (needsAnd) drizzleOrmImports.push('and');
  if (needsIlike) drizzleOrmImports.push('ilike');
  if (needsSql) drizzleOrmImports.push('sql');

  return {
    path: 'server/routes.ts',
    language: 'typescript',
    content: `import type { Express } from "express";
import { ${drizzleOrmImports.join(', ')} } from "drizzle-orm";
import { db } from "./db";
import { ${tableImports}, ${zodImports} } from "../shared/schema";

export function registerRoutes(app: Express) {
${routeBlocks}
}
`,
  };
}

function generateDbFile(): GeneratedFile {
  return {
    path: 'server/db.ts',
    language: 'typescript',
    content: `import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import * as schema from "../shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
`,
  };
}

function generateDrizzleConfig(): GeneratedFile {
  return {
    path: 'drizzle.config.ts',
    language: 'typescript',
    content: `import type { Config } from "drizzle-kit";

export default {
  schema: "./shared/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
`,
  };
}

function planNeedsAuth(plan: ProjectPlan, enrichment?: EnrichmentContext): boolean {
  const hasUserEntity = plan.dataModel.some(e => {
    const n = e.name.toLowerCase();
    return n === 'user' || n === 'account' || n === 'member';
  });
  const hasRoles = (plan.roles && plan.roles.length > 0);
  const archHasAuth = enrichment?.architecture?.authPattern?.type &&
    enrichment.architecture.authPattern.type !== 'none';
  return hasUserEntity || !!hasRoles || !!archHasAuth;
}

function generateAuthModule(plan: ProjectPlan): GeneratedFile {
  const userEntity = plan.dataModel.find(e => {
    const n = e.name.toLowerCase();
    return n === 'user' || n === 'account' || n === 'member';
  });
  const userTable = userEntity ? `${toCamel(userEntity.name)}s` : 'users';
  const hasEmailField = userEntity?.fields.some(f => f.name.toLowerCase() === 'email');
  const loginField = hasEmailField ? 'email' : 'username';

  return {
    path: 'server/auth.ts',
    language: 'typescript',
    content: `import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import { Pool } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import type { Express, Request, Response, NextFunction } from "express";
import { db } from "./db";
import { ${userTable} } from "../shared/schema";
import { eq } from "drizzle-orm";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const PgStore = ConnectPgSimple(session);

export function setupAuth(app: Express) {
  const sessionSecret = process.env.SESSION_SECRET || "autocoder-dev-secret";

  app.use(session({
    store: new PgStore({ pool, createTableIfMissing: true }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 },
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(new LocalStrategy(
    { usernameField: "${loginField}" },
    async (${loginField}, password, done) => {
      try {
        const [user] = await db.select().from(${userTable}).where(eq(${userTable}.${loginField}, ${loginField}));
        if (!user) return done(null, false, { message: "Invalid credentials" });
        const isValid = await bcrypt.compare(password, (user as any).password);
        if (!isValid) return done(null, false, { message: "Invalid credentials" });
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  ));

  passport.serializeUser((user: any, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db.select().from(${userTable}).where(eq(${userTable}.id, id));
      done(null, user || null);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { ${loginField}, password, ...rest } = req.body;
      if (!${loginField} || !password) {
        return res.status(400).json({ error: true, message: "${loginField} and password are required" });
      }
      const [existing] = await db.select().from(${userTable}).where(eq(${userTable}.${loginField}, ${loginField}));
      if (existing) {
        return res.status(409).json({ error: true, message: "${loginField} already exists" });
      }
      const hashed = await bcrypt.hash(password, 10);
      const [user] = await db.insert(${userTable}).values({ ${loginField}, password: hashed, ...rest }).returning();
      const { password: _, ...safeUser } = user as any;
      req.login(safeUser, (err) => {
        if (err) return res.status(500).json({ error: true, message: err.message });
        res.status(201).json(safeUser);
      });
    } catch (error: any) {
      res.status(400).json({ error: true, message: error.message });
    }
  });

  app.post("/api/auth/login", (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ error: true, message: info?.message || "Invalid credentials" });
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        const { password: _, ...safeUser } = user;
        return res.json(safeUser);
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ error: true, message: err.message });
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: true, message: "Not authenticated" });
    const { password: _, ...safeUser } = req.user as any;
    res.json(safeUser);
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: true, message: "Authentication required" });
}
`,
  };
}

function generateLoginPage(): GeneratedFile {
  return {
    path: 'src/pages/auth-page.tsx',
    language: 'tsx',
    content: `import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      navigate("/");
    },
    onError: (err: Error) => {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; name?: string }) => {
      const res = await apiRequest("POST", "/api/auth/register", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      navigate("/");
    },
    onError: (err: Error) => {
      toast({ title: "Registration failed", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      loginMutation.mutate({ email, password });
    } else {
      registerMutation.mutate({ email, password, name: name || undefined });
    }
  };

  const isPending = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" data-testid="page-auth">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle data-testid="text-auth-title">{isLogin ? "Sign In" : "Create Account"}</CardTitle>
          <CardDescription>
            {isLogin ? "Enter your credentials to continue" : "Fill in your details to get started"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  data-testid="input-name"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="input-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                data-testid="input-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isPending} data-testid="button-auth-submit">
              {isPending ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => setIsLogin(!isLogin)}
              data-testid="button-toggle-auth"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
`,
  };
}

function generateServerIndex(plan: ProjectPlan, hasAuth: boolean): GeneratedFile {
  if (hasAuth) {
    return {
      path: 'server/index.ts',
      language: 'typescript',
      content: `import express from "express";
import { setupAuth } from "./auth";
import { registerRoutes } from "./routes";

const app = express();
app.use(express.json());

setupAuth(app);
registerRoutes(app);

const port = Number(process.env.PORT) || 5200;
app.listen(port, "0.0.0.0", () => {
  console.log(\`Server running on port \${port}\`);
});
`,
    };
  }

  return {
    path: 'server/index.ts',
    language: 'typescript',
    content: `import express from "express";
import { registerRoutes } from "./routes";

const app = express();
app.use(express.json());

registerRoutes(app);

const port = Number(process.env.PORT) || 5200;
app.listen(port, "0.0.0.0", () => {
  console.log(\`Server running on port \${port}\`);
});
`,
  };
}

function generateAuthHook(): GeneratedFile {
  return {
    path: 'src/hooks/use-auth.ts',
    language: 'typescript',
    content: `import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", credentials);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; name?: string }) => {
      const res = await apiRequest("POST", "/api/auth/register", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
  };
}
`,
  };
}

function generateAppTsx(plan: ProjectPlan, hasAuth = false): GeneratedFile {
  const seen = new Set<string>();
  const pageImports = plan.pages
    .filter(page => {
      const key = page.componentName;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(page => {
      const componentName = page.componentName;
      const fileName = toKebab(componentName);
      return `import ${componentName} from "@/pages/${fileName}";`;
    }).join('\n');

  const routes = plan.pages.map(page => {
    return `          <Route path="${page.path}" component={${page.componentName}} />`;
  }).join('\n');

  const navLinks = plan.pages
    .filter(p => !p.path.includes('/:'))
    .map(p => {
      return `            <Link href="${p.path}">
              <Button variant={location === "${p.path}" ? "secondary" : "ghost"} size="sm" data-testid="nav-${toKebab(p.componentName)}">
                ${p.name}
              </Button>
            </Link>`;
    }).join('\n');

  const hasSidebar = plan.pages.filter(p => !p.path.includes('/:id')).length > 3;

  const authImport = hasAuth ? `import AuthPage from "@/pages/auth-page";\nimport { useAuth } from "@/hooks/use-auth";\n` : '';
  const authRoute = hasAuth ? `          <Route path="/auth" component={AuthPage} />\n` : '';
  const logoutButton = hasAuth ? `
            <Button variant="ghost" size="sm" onClick={() => logout()} data-testid="button-logout">
              Logout
            </Button>` : '';

  if (hasSidebar) {
    if (hasAuth) {
      return {
        path: 'src/App.tsx',
        language: 'tsx',
        content: `import { Switch, Route, Link, useLocation, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Menu, X, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import AuthPage from "@/pages/auth-page";
${pageImports}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="flex items-center justify-center h-full p-8">Loading...</div>;
  if (!isAuthenticated) return <Redirect to="/auth" />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
${plan.pages.map(page => `      <Route path="${page.path}">{() => <ProtectedRoute component={${page.componentName}} />}</Route>`).join('\n')}
      <Route>
        <div className="p-6">
          <h1 className="text-2xl font-bold">Page not found</h1>
          <p className="text-muted-foreground mt-2">The page you're looking for doesn't exist.</p>
        </div>
      </Route>
    </Switch>
  );
}

function Sidebar() {
  const [location] = useLocation();
  const { logout } = useAuth();
  return (
    <div className="flex flex-col gap-1 p-3 h-full">
      <div className="flex-1 space-y-1">
${plan.pages.filter(p => !p.path.includes('/:id')).map(p => `        <Link href="${p.path}">
          <Button variant={location === "${p.path}" ? "secondary" : "ghost"} className="w-full justify-start" size="sm" data-testid="nav-${toKebab(p.componentName)}">
            ${p.name}
          </Button>
        </Link>`).join('\n')}
      </div>
      <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={() => logout()} data-testid="button-logout">
        <LogOut className="h-4 w-4 mr-2" /> Logout
      </Button>
    </div>
  );
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <QueryClientProvider client={queryClient}>
        <div className="flex items-center justify-center h-screen">Loading...</div>
        <Toaster />
      </QueryClientProvider>
    );
  }

  if (!isAuthenticated) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthPage />
        <Toaster />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-screen w-full">
        {sidebarOpen && (
          <aside className="w-56 border-r bg-card flex-shrink-0 overflow-y-auto">
            <div className="p-3 border-b">
              <h2 className="font-semibold text-sm" data-testid="text-app-title">${plan.projectName}</h2>
            </div>
            <Sidebar />
          </aside>
        )}
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center gap-2 p-2 border-b">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} data-testid="button-sidebar-toggle">
              {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </header>
          <main className="flex-1 overflow-y-auto">
            <Router />
          </main>
        </div>
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}
`,
      };
    }

    return {
      path: 'src/App.tsx',
      language: 'tsx',
      content: `import { Switch, Route, Link, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Menu, X } from "lucide-react";
${pageImports}

function Router() {
  return (
    <Switch>
${routes}
      <Route>
        <div className="p-6">
          <h1 className="text-2xl font-bold">Page not found</h1>
          <p className="text-muted-foreground mt-2">The page you're looking for doesn't exist.</p>
        </div>
      </Route>
    </Switch>
  );
}

function Sidebar() {
  const [location] = useLocation();
  return (
    <div className="flex flex-col gap-1 p-3">
${plan.pages.filter(p => !p.path.includes('/:id')).map(p => `      <Link href="${p.path}">
        <Button variant={location === "${p.path}" ? "secondary" : "ghost"} className="w-full justify-start" size="sm" data-testid="nav-${toKebab(p.componentName)}">
          ${p.name}
        </Button>
      </Link>`).join('\n')}
    </div>
  );
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-screen w-full">
        {sidebarOpen && (
          <aside className="w-56 border-r bg-card flex-shrink-0 overflow-y-auto">
            <div className="p-3 border-b">
              <h2 className="font-semibold text-sm" data-testid="text-app-title">${plan.projectName}</h2>
            </div>
            <Sidebar />
          </aside>
        )}
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center gap-2 p-2 border-b">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} data-testid="button-sidebar-toggle">
              {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </header>
          <main className="flex-1 overflow-y-auto">
            <Router />
          </main>
        </div>
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}
`,
    };
  }

  return {
    path: 'src/App.tsx',
    language: 'tsx',
    content: `import { Switch, Route, Link, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
${pageImports}

function Router() {
  return (
    <Switch>
${routes}
      <Route>
        <div className="p-6">
          <h1 className="text-2xl font-bold">Page not found</h1>
          <p className="text-muted-foreground mt-2">The page you're looking for doesn't exist.</p>
        </div>
      </Route>
    </Switch>
  );
}

export default function App() {
  const [location] = useLocation();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen">
        <header className="border-b">
          <nav className="flex items-center gap-1 p-2 flex-wrap">
            <span className="font-semibold text-sm mr-2" data-testid="text-app-title">${plan.projectName}</span>
${navLinks}
          </nav>
        </header>
        <main>
          <Router />
        </main>
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}
`,
  };
}

function generateServerModules(plan: ProjectPlan): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  for (const module of plan.modules) {
    const moduleName = toKebab(module.name);
    const entities = module.entities || [];
    if (entities.length === 0) continue;

    const imports = entities.map(e => `${toCamel(e)}s`).join(', ');
    const zodImports = entities.map(e => `insert${e}Schema, type ${e}, type Insert${e}`).join(', ');

    const serviceFunctions = entities.map(entity => {
      const tableVar = `${toCamel(entity)}s`;
      const entityName = entity;
      const kebabEntity = toKebab(entity);

      return `
/**
 * Service functions for ${entityName}
 */
export const ${toCamel(entityName)}Service = {
  async getAll() {
    return await db.select().from(${tableVar}).orderBy(desc(${tableVar}.id));
  },

  async getById(id: number) {
    const [item] = await db.select().from(${tableVar}).where(eq(${tableVar}.id, id));
    return item || null;
  },

  async create(data: Insert${entityName}) {
    const validated = insert${entityName}Schema.parse(data);
    const [item] = await db.insert(${tableVar}).values(validated).returning();
    return item;
  },

  async update(id: number, data: Partial<Insert${entityName}>) {
    const [updated] = await db.update(${tableVar})
      .set({ ...data, updatedAt: new Date() })
      .where(eq(${tableVar}.id, id))
      .returning();
    return updated || null;
  },

  async delete(id: number) {
    const [deleted] = await db.delete(${tableVar})
      .where(eq(${tableVar}.id, id))
      .returning();
    return deleted || null;
  }
};`;
    }).join('\n');

    files.push({
      path: `server/modules/${moduleName}.ts`,
      language: 'typescript',
      content: `import { db } from "../db";
import { eq, desc } from "drizzle-orm";
import { ${imports}, ${zodImports} } from "../../shared/schema";

${serviceFunctions}
`,
    });
  }

  return files;
}

function generateClientModules(plan: ProjectPlan): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  for (const module of plan.modules) {
    const moduleName = toKebab(module.name);
    const modulePages = plan.pages.filter(p => p.module === module.name);
    if (modulePages.length === 0) continue;

    const imports = modulePages.map(p => `import ${p.componentName} from "../../pages/${toKebab(p.componentName)}";`).join('\n');
    const exports = modulePages.map(p => `  ${p.componentName},`).join('\n');

    files.push({
      path: `src/modules/${moduleName}/index.ts`,
      language: 'typescript',
      content: `${imports}

export {
${exports}
};
`,
    });
  }

  return files;
}

interface GeneratedFileRef {
  path: string;
  content: string;
  language: string;
}

function quickValidateCore(files: GeneratedFileRef[]): string[] {
  const issues: string[] = [];
  const schemaFile = files.find(f => f.path === 'shared/schema.ts');
  const routesFile = files.find(f => f.path === 'server/routes.ts');

  if (!schemaFile) {
    issues.push('Missing shared/schema.ts');
    return issues;
  }

  const schemaExports = Array.from(schemaFile.content.matchAll(/export\s+(?:const|type|interface|function)\s+(\w+)/g)).map(m => m[1]);

  if (routesFile) {
    const routeImports = Array.from(routesFile.content.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"].*schema['"]/g));
    for (const match of routeImports) {
      const names = match[1].split(',').map(n => n.trim().split(/\s+as\s+/)[0].replace(/^type\s+/, '').trim()).filter(Boolean);
      for (const name of names) {
        if (!schemaExports.includes(name)) {
          issues.push(`routes.ts imports "${name}" from schema but schema does not export it`);
        }
      }
    }
  }

  return issues;
}