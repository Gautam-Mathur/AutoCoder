/**
 * Architecture Planner - The "System Architect" of the development team
 *
 * Makes high-level architecture decisions:
 * - Application pattern (SPA, dashboard, multi-page)
 * - Folder structure strategy
 * - State management approach
 * - Authentication pattern
 * - Data flow architecture
 * - Performance strategy
 * - Error handling strategy
 * - Deployment considerations
 */

import type { ProjectPlan, PlannedEntity, PlannedPage, PlannedWorkflow } from './plan-generator.js';
import type { ReasoningResult, EntityRelationship } from './contextual-reasoning-engine.js';
import { getDomainModel, getBestPractices } from './knowledge-base.js';

export interface ArchitecturePlan {
  pattern: AppPattern;
  folderStructure: FolderStructure;
  stateManagement: StateStrategy;
  authPattern: AuthPattern;
  dataFlow: DataFlowPattern;
  performance: PerformanceStrategy;
  errorHandling: ErrorStrategy;
  routing: RoutingStrategy;
  codeOrganization: CodeOrganization;
  decisions: ArchitectureDecision[];
}

export type AppPattern = 'spa-dashboard' | 'spa-crud' | 'spa-workflow' | 'multi-page' | 'portal' | 'marketplace' | 'social' | 'analytics';

export interface FolderStructure {
  strategy: 'feature-based' | 'type-based' | 'hybrid';
  directories: DirectorySpec[];
}

export interface DirectorySpec {
  path: string;
  purpose: string;
  filePattern: string;
}

export interface StateStrategy {
  approach: 'local-first' | 'context-heavy' | 'global-store' | 'server-state';
  localStateEntities: string[];
  sharedStateEntities: string[];
  serverStateEntities: string[];
  cacheStrategy: 'aggressive' | 'moderate' | 'minimal';
  cacheTTL: number;
}

export interface AuthPattern {
  type: 'none' | 'session' | 'jwt' | 'oauth' | 'api-key';
  roles: string[];
  protectedRoutes: string[];
  publicRoutes: string[];
  sessionDuration: number;
}

export interface DataFlowPattern {
  primary: 'rest' | 'graphql' | 'rpc';
  realtime: boolean;
  realtimeEntities: string[];
  optimisticUpdates: string[];
  polling: PollingConfig[];
}

export interface PollingConfig {
  entity: string;
  intervalMs: number;
  reason: string;
}

export interface PerformanceStrategy {
  codeSplitting: boolean;
  lazyRoutes: string[];
  prefetchRoutes: string[];
  imageLazyLoading: boolean;
  virtualScrollEntities: string[];
  memoizedComponents: string[];
  debounceInputs: string[];
}

export interface ErrorStrategy {
  globalHandler: boolean;
  errorBoundaries: string[];
  retryableOperations: string[];
  maxRetries: number;
  fallbackUI: boolean;
  offlineSupport: boolean;
}

export interface RoutingStrategy {
  type: 'flat' | 'nested' | 'tabbed';
  routes: RouteSpec[];
  defaultRoute: string;
  notFoundRoute: boolean;
  breadcrumbs: boolean;
}

export interface RouteSpec {
  path: string;
  component: string;
  layout?: string;
  protected: boolean;
  lazy: boolean;
  children?: RouteSpec[];
}

export interface CodeOrganization {
  maxFileLines: number;
  componentPattern: 'functional' | 'class' | 'mixed';
  hookExtractionThreshold: number;
  sharedUtilityThreshold: number;
  barrelExports: boolean;
}

export interface ArchitectureDecision {
  area: string;
  decision: string;
  rationale: string;
  tradeoffs: string[];
}

export function planArchitecture(plan: ProjectPlan, reasoning?: ReasoningResult | null, detectedDomain?: string): ArchitecturePlan {
  const entities = plan.dataModel || [];
  const pages = plan.pages || [];
  const workflows = plan.workflows || [];
  const roles = plan.roles || [];

  const pattern = detectAppPattern(entities, pages, workflows);
  const folderStructure = planFolderStructure(pattern, entities, pages);
  const stateManagement = planStateManagement(entities, reasoning);
  const authPattern = planAuth(roles, pages);
  const dataFlow = planDataFlow(entities, workflows, reasoning);
  const performance = planPerformance(entities, pages);
  const errorHandling = planErrorHandling(pattern, entities);
  const routing = planRouting(pages, authPattern, pattern);
  const codeOrganization = planCodeOrganization(entities);
  const decisions = collectDecisions(pattern, stateManagement, authPattern, dataFlow, performance);

  if (detectedDomain) {
    const domainModel = getDomainModel(detectedDomain);
    if (domainModel) {
      decisions.push({
        area: 'Domain Architecture',
        decision: `Applying ${domainModel.name} domain architecture idioms`,
        rationale: `KB domain model "${domainModel.name}" prescribes patterns for ${domainModel.coreEntities?.join(', ') || 'this domain'}`,
        tradeoffs: ['Domain-specific optimizations', 'Less generic but more appropriate patterns'],
      });

      if (domainModel.coreEntities.length > 5 && folderStructure.strategy !== 'feature-based') {
        folderStructure.strategy = 'feature-based';
        decisions.push({
          area: 'Folder Structure',
          decision: 'Switched to feature-based structure due to domain complexity',
          rationale: `Domain "${domainModel.name}" has ${domainModel.coreEntities.length} core entities — feature-based grouping prevents flat directory sprawl`,
          tradeoffs: ['Better entity isolation', 'More directories to navigate'],
        });
      }

      for (const feature of domainModel.typicalFeatures.slice(0, 3)) {
        const featureDir = feature.replace(/\s+/g, '-').toLowerCase();
        if (!folderStructure.directories.some(d => d.purpose.toLowerCase().includes(featureDir))) {
          folderStructure.directories.push({
            path: `src/features/${featureDir}`,
            purpose: `Domain feature: ${feature}`,
            filePattern: '*.tsx',
          });
        }
      }

      if (domainModel.securityConsiderations.length > 0) {
        decisions.push({
          area: 'Security',
          decision: domainModel.securityConsiderations[0],
          rationale: `KB domain "${domainModel.name}" security consideration`,
          tradeoffs: domainModel.securityConsiderations.slice(1, 3),
        });
      }
    }

    const archBestPractices = getBestPractices('architecture');
    if (archBestPractices.length > 0) {
      for (const bp of archBestPractices.slice(0, 3)) {
        decisions.push({
          area: 'KB Best Practice',
          decision: bp.title || bp.id,
          rationale: bp.description || '',
          tradeoffs: bp.do?.slice(0, 2) || [],
        });
      }
    }
  }

  return {
    pattern,
    folderStructure,
    stateManagement,
    authPattern,
    dataFlow,
    performance,
    errorHandling,
    routing,
    codeOrganization,
    decisions,
  };
}

function detectAppPattern(entities: PlannedEntity[], pages: PlannedPage[], workflows: PlannedWorkflow[]): AppPattern {
  const hasDashboard = pages.some(p => p.name?.toLowerCase().includes('dashboard'));
  const hasWorkflows = workflows.length > 2;
  const hasMarketplace = entities.some(e =>
    e.name.toLowerCase().includes('product') || e.name.toLowerCase().includes('order') || e.name.toLowerCase().includes('cart'));
  const hasSocial = entities.some(e =>
    e.name.toLowerCase().includes('post') || e.name.toLowerCase().includes('comment') || e.name.toLowerCase().includes('follow'));
  const hasAnalytics = pages.some(p => p.name?.toLowerCase().includes('analytics') || p.name?.toLowerCase().includes('report'));
  const hasPortal = (pages.filter(p => p.name?.toLowerCase().includes('list') || p.name?.toLowerCase().includes('detail')).length > 4);

  if (hasMarketplace) return 'marketplace';
  if (hasSocial) return 'social';
  if (hasAnalytics && hasDashboard) return 'analytics';
  if (hasWorkflows && entities.length > 3) return 'spa-workflow';
  if (hasPortal) return 'portal';
  if (hasDashboard) return 'spa-dashboard';
  return 'spa-crud';
}

function planFolderStructure(pattern: AppPattern, entities: PlannedEntity[], pages: PlannedPage[]): FolderStructure {
  const strategy = entities.length > 5 ? 'feature-based' : entities.length > 2 ? 'hybrid' : 'type-based';

  const baseDirectories: DirectorySpec[] = [
    { path: 'src/components/ui', purpose: 'Shared UI primitives (Button, Card, Input, etc.)', filePattern: '*.tsx' },
    { path: 'src/components/layout', purpose: 'Layout components (Sidebar, Header, Footer)', filePattern: '*.tsx' },
    { path: 'src/hooks', purpose: 'Custom React hooks', filePattern: 'use-*.ts' },
    { path: 'src/lib', purpose: 'Utilities, API client, constants', filePattern: '*.ts' },
    { path: 'src/types', purpose: 'TypeScript type definitions', filePattern: '*.ts' },
    { path: 'server', purpose: 'Backend Express server', filePattern: '*.ts' },
  ];

  if (strategy === 'feature-based') {
    for (const entity of entities) {
      const name = entity.name.toLowerCase().replace(/\s+/g, '-');
      baseDirectories.push({
        path: `src/features/${name}`,
        purpose: `${entity.name} feature module (pages, components, hooks)`,
        filePattern: '*.tsx',
      });
    }
  } else {
    baseDirectories.push(
      { path: 'src/pages', purpose: 'Page-level route components', filePattern: '*.tsx' },
      { path: 'src/components/shared', purpose: 'Shared feature components', filePattern: '*.tsx' },
    );
  }

  return { strategy, directories: baseDirectories };
}

function planStateManagement(entities: PlannedEntity[], reasoning?: ReasoningResult | null): StateStrategy {
  const localStateEntities: string[] = [];
  const sharedStateEntities: string[] = [];
  const serverStateEntities: string[] = [];

  for (const entity of entities) {
    const hasRelationships = reasoning?.relationships?.some((r: EntityRelationship) =>
      r.from === entity.name || r.to === entity.name) || false;
    const isFrequentlyAccessed = entity.fields.length > 5 || hasRelationships;

    if (isFrequentlyAccessed || hasRelationships) {
      serverStateEntities.push(entity.name);
    } else {
      localStateEntities.push(entity.name);
    }
  }

  const hasComplexRelationships = (reasoning?.relationships?.length || 0) > 3;
  const approach = hasComplexRelationships ? 'server-state' as const : 'local-first' as const;
  const cacheStrategy = entities.length > 5 ? 'aggressive' as const : 'moderate' as const;

  return {
    approach,
    localStateEntities,
    sharedStateEntities,
    serverStateEntities,
    cacheStrategy,
    cacheTTL: cacheStrategy === 'aggressive' ? 300000 : 60000,
  };
}

function planAuth(roles: Array<{ name: string }>, pages: PlannedPage[]): AuthPattern {
  if (!roles || roles.length === 0) {
    return {
      type: 'none',
      roles: [],
      protectedRoutes: [],
      publicRoutes: pages.map(p => `/${(p.name || '').toLowerCase().replace(/\s+/g, '-')}`),
      sessionDuration: 0,
    };
  }

  const roleNames = roles.map(r => r.name);
  const hasAdmin = roleNames.some(r => r.toLowerCase().includes('admin'));
  const protectedRoutes: string[] = [];
  const publicRoutes: string[] = [];

  for (const page of pages) {
    const path = `/${(page.name || '').toLowerCase().replace(/\s+/g, '-')}`;
    if (page.name?.toLowerCase().includes('login') || page.name?.toLowerCase().includes('register') ||
        page.name?.toLowerCase().includes('landing') || page.name?.toLowerCase() === 'home') {
      publicRoutes.push(path);
    } else {
      protectedRoutes.push(path);
    }
  }

  return {
    type: 'session',
    roles: roleNames,
    protectedRoutes,
    publicRoutes,
    sessionDuration: 86400000,
  };
}

function planDataFlow(entities: PlannedEntity[], workflows: PlannedWorkflow[], reasoning?: ReasoningResult | null): DataFlowPattern {
  const realtimeEntities: string[] = [];
  const optimisticUpdates: string[] = [];
  const polling: PollingConfig[] = [];

  for (const entity of entities) {
    const hasStatus = entity.fields.some(f => f.name.toLowerCase().includes('status'));
    const isCollaborative = entity.fields.some(f =>
      f.name.toLowerCase().includes('assignee') || f.name.toLowerCase().includes('assigned'));

    if (hasStatus && isCollaborative) {
      realtimeEntities.push(entity.name);
    }
    if (hasStatus) {
      optimisticUpdates.push(entity.name);
    }
  }

  for (const entity of entities) {
    const hasNotification = entity.name.toLowerCase().includes('notification') || entity.name.toLowerCase().includes('alert');
    if (hasNotification) {
      polling.push({ entity: entity.name, intervalMs: 30000, reason: 'Real-time notification updates' });
    }
  }

  return {
    primary: 'rest',
    realtime: realtimeEntities.length > 0,
    realtimeEntities,
    optimisticUpdates,
    polling,
  };
}

function planPerformance(entities: PlannedEntity[], pages: PlannedPage[]): PerformanceStrategy {
  const lazyRoutes: string[] = [];
  const prefetchRoutes: string[] = [];
  const virtualScrollEntities: string[] = [];
  const memoizedComponents: string[] = [];
  const debounceInputs: string[] = [];

  for (const page of pages) {
    const path = `/${(page.name || '').toLowerCase().replace(/\s+/g, '-')}`;
    if (page.name?.toLowerCase().includes('dashboard') || page.name?.toLowerCase() === 'home') {
      prefetchRoutes.push(path);
    } else {
      lazyRoutes.push(path);
    }
  }

  for (const entity of entities) {
    if (entity.fields.length > 8) {
      virtualScrollEntities.push(entity.name);
    }
    const hasSearch = entity.fields.some(f =>
      f.name.toLowerCase().includes('search') || f.name.toLowerCase().includes('query') || f.name.toLowerCase().includes('filter'));
    if (hasSearch) {
      debounceInputs.push(`${entity.name}Search`);
    }
  }

  return {
    codeSplitting: pages.length > 4,
    lazyRoutes,
    prefetchRoutes,
    imageLazyLoading: true,
    virtualScrollEntities,
    memoizedComponents,
    debounceInputs,
  };
}

function planErrorHandling(pattern: AppPattern, entities: PlannedEntity[]): ErrorStrategy {
  const errorBoundaries = ['App', 'PageLayout'];
  const retryableOperations: string[] = [];

  for (const entity of entities) {
    retryableOperations.push(`fetch${entity.name}List`, `create${entity.name}`, `update${entity.name}`);
  }

  return {
    globalHandler: true,
    errorBoundaries,
    retryableOperations,
    maxRetries: 3,
    fallbackUI: true,
    offlineSupport: pattern === 'spa-dashboard' || pattern === 'spa-workflow',
  };
}

function planRouting(pages: PlannedPage[], auth: AuthPattern, pattern: AppPattern): RoutingStrategy {
  const routes: RouteSpec[] = [];

  for (const page of pages) {
    const name = (page.name || 'page').toLowerCase().replace(/\s+/g, '-');
    const isDashboard = name.includes('dashboard');
    const path = isDashboard ? '/' : `/${name}`;
    const isProtected = auth.protectedRoutes.includes(path);

    routes.push({
      path,
      component: `${capitalize(page.name || 'Page')}Page`,
      layout: isDashboard ? 'DashboardLayout' : 'MainLayout',
      protected: isProtected,
      lazy: path !== '/',
    });

    if (page.name?.toLowerCase().includes('list')) {
      routes.push({
        path: `/${name}/:id`,
        component: `${capitalize(page.name || 'Page')}DetailPage`,
        layout: 'MainLayout',
        protected: isProtected,
        lazy: true,
      });
    }
  }

  const hasNested = pattern === 'portal' || pattern === 'spa-dashboard';

  return {
    type: hasNested ? 'nested' : 'flat',
    routes,
    defaultRoute: '/',
    notFoundRoute: true,
    breadcrumbs: pages.length > 4,
  };
}

function planCodeOrganization(entities: PlannedEntity[]): CodeOrganization {
  return {
    maxFileLines: 300,
    componentPattern: 'functional',
    hookExtractionThreshold: 20,
    sharedUtilityThreshold: 2,
    barrelExports: entities.length > 5,
  };
}

function collectDecisions(
  pattern: AppPattern,
  state: StateStrategy,
  auth: AuthPattern,
  dataFlow: DataFlowPattern,
  perf: PerformanceStrategy
): ArchitectureDecision[] {
  const decisions: ArchitectureDecision[] = [
    {
      area: 'Application Pattern',
      decision: `Using ${pattern} architecture`,
      rationale: `Best fit for the detected entity types and page structure`,
      tradeoffs: ['More complex routing', 'Better user experience'],
    },
    {
      area: 'State Management',
      decision: `${state.approach} with ${state.cacheStrategy} caching`,
      rationale: `${state.serverStateEntities.length} entities benefit from server-state, ${state.localStateEntities.length} are local-only`,
      tradeoffs: ['Reduced network calls', 'Stale data risk with aggressive caching'],
    },
    {
      area: 'Authentication',
      decision: auth.type === 'none' ? 'No authentication required' : `${auth.type}-based auth with ${auth.roles.length} roles`,
      rationale: auth.type === 'none' ? 'No roles detected in requirements' : `${auth.roles.join(', ')} roles need access control`,
      tradeoffs: auth.type === 'none' ? [] : ['Added complexity', 'Better security'],
    },
    {
      area: 'Data Flow',
      decision: `${dataFlow.primary} API${dataFlow.realtime ? ' with real-time updates' : ''}`,
      rationale: dataFlow.realtime ? `Collaborative entities: ${dataFlow.realtimeEntities.join(', ')}` : 'Standard request-response sufficient',
      tradeoffs: dataFlow.realtime ? ['WebSocket overhead', 'Live collaboration'] : ['Simpler architecture'],
    },
    {
      area: 'Performance',
      decision: `Code splitting: ${perf.codeSplitting ? 'enabled' : 'disabled'}, ${perf.lazyRoutes.length} lazy routes`,
      rationale: `${perf.lazyRoutes.length} routes can be lazy-loaded to reduce initial bundle`,
      tradeoffs: ['Faster initial load', 'Navigation micro-delays'],
    },
  ];

  return decisions;
}

function capitalize(str: string): string {
  return str.replace(/(?:^|\s|-)\w/g, m => m.toUpperCase()).replace(/[\s-]/g, '');
}