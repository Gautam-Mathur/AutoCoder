import type { UnderstandingResult, TechnologyDetectionResult } from './deep-understanding-engine.js';

import type { DomainEntity, DomainModule, DomainWorkflow, UserRole, IndustryDomain } from './domain-knowledge.js';
import { buildEntitiesForModules, buildPagesForModules, buildWorkflowsForEntities } from './domain-knowledge.js';
import { extractEntitiesFromText } from './domain-synthesis-engine.js';
import { inferFieldsForEntity } from './entity-field-inference.js';

const SUPPORTED_LIBRARY_SIGNALS: Record<string, { category: string; technology: string; justification: string; replaces?: string }> = {
  'zustand': { category: 'State', technology: 'Zustand', justification: 'Lightweight, flexible client state management', replaces: 'State' },
  'jotai': { category: 'State', technology: 'Jotai', justification: 'Atomic state management for React', replaces: 'State' },
  'redux': { category: 'State', technology: 'Redux Toolkit', justification: 'Predictable state container with dev tools', replaces: 'State' },
  'recoil': { category: 'State', technology: 'Recoil', justification: 'Facebook state management for React', replaces: 'State' },
  'context api': { category: 'State', technology: 'React Context', justification: 'Built-in React state management', replaces: 'State' },
  'react context': { category: 'State', technology: 'React Context', justification: 'Built-in React state management', replaces: 'State' },
  'chart.js': { category: 'Charts', technology: 'Chart.js', justification: 'Flexible charting library', replaces: 'Charts' },
  'chartjs': { category: 'Charts', technology: 'Chart.js', justification: 'Flexible charting library', replaces: 'Charts' },
  'recharts': { category: 'Charts', technology: 'Recharts', justification: 'Composable React charting library', replaces: 'Charts' },
  'nivo': { category: 'Charts', technology: 'Nivo', justification: 'Rich data visualization components', replaces: 'Charts' },
  'd3': { category: 'Charts', technology: 'D3.js', justification: 'Low-level data-driven visualization', replaces: 'Charts' },
  'formik': { category: 'Forms', technology: 'Formik', justification: 'Form state management with validation', replaces: 'Forms' },
  'react-hook-form': { category: 'Forms', technology: 'React Hook Form', justification: 'Performant form library with minimal re-renders', replaces: 'Forms' },
  'framer motion': { category: 'Animation', technology: 'Framer Motion', justification: 'Production-ready animation library for React' },
  'framer-motion': { category: 'Animation', technology: 'Framer Motion', justification: 'Production-ready animation library for React' },
  'dnd-kit': { category: 'Drag & Drop', technology: '@dnd-kit', justification: 'Modern drag and drop toolkit for React' },
  'react-dnd': { category: 'Drag & Drop', technology: 'React DnD', justification: 'Drag and drop for complex interfaces' },
  'socket.io': { category: 'Realtime', technology: 'Socket.IO', justification: 'Real-time bidirectional event-based communication' },
  'socket': { category: 'Realtime', technology: 'Socket.IO', justification: 'Real-time bidirectional event-based communication' },
  'websocket': { category: 'Realtime', technology: 'WebSocket', justification: 'Native real-time communication' },
  'tanstack table': { category: 'Tables', technology: 'TanStack Table', justification: 'Headless table library with sorting, filtering, pagination' },
  'react-table': { category: 'Tables', technology: 'TanStack Table', justification: 'Headless table library with sorting, filtering, pagination' },
  'dayjs': { category: 'Date', technology: 'Day.js', justification: 'Lightweight date manipulation library' },
  'date-fns': { category: 'Date', technology: 'date-fns', justification: 'Modern date utility library' },
  'moment': { category: 'Date', technology: 'Day.js', justification: 'Lightweight date manipulation (modern Moment.js alternative)' },
  'i18next': { category: 'i18n', technology: 'i18next', justification: 'Internationalization framework' },
  'react-i18next': { category: 'i18n', technology: 'react-i18next', justification: 'React internationalization with i18next' },
  'sass': { category: 'Styling', technology: 'Sass + Tailwind CSS + shadcn/ui', justification: 'CSS preprocessing with utility-first framework', replaces: 'Styling' },
  'scss': { category: 'Styling', technology: 'Sass + Tailwind CSS + shadcn/ui', justification: 'CSS preprocessing with utility-first framework', replaces: 'Styling' },
};

function detectLibraryPreferences(understanding: UnderstandingResult): TechStackItem[] {
  const additionalItems: TechStackItem[] = [];
  const seenCategories = new Set<string>();

  const searchText = [
    ...understanding.level6_technology.signals,
    ...understanding.level1_intent.keyRequirements,
    ...understanding.level1_intent.mentionedFeatures,
    understanding.level1_intent.primaryGoal,
  ].join(' ').toLowerCase();

  for (const [keyword, libInfo] of Object.entries(SUPPORTED_LIBRARY_SIGNALS)) {
    const resolvedCategory = libInfo.replaces || libInfo.category;
    if (seenCategories.has(resolvedCategory)) continue;

    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(searchText)) {
      additionalItems.push({
        category: libInfo.category,
        technology: libInfo.technology,
        justification: libInfo.justification,
      });
      seenCategories.add(resolvedCategory);
    }
  }

  return additionalItems;
}

function buildTechStack(understanding: UnderstandingResult): TechStackItem[] {
  const baseStack: TechStackItem[] = [
    { category: 'Frontend', technology: 'React 18 + TypeScript', justification: 'Modern, type-safe UI development' },
    { category: 'Styling', technology: 'Tailwind CSS + shadcn/ui', justification: 'Rapid, consistent UI with pre-built components' },
    { category: 'Routing', technology: 'Wouter', justification: 'Lightweight client-side routing' },
    { category: 'State', technology: 'TanStack Query', justification: 'Server state management with caching' },
    { category: 'Backend', technology: 'Express.js + TypeScript', justification: 'Fast, flexible API server' },
    { category: 'Database', technology: 'PostgreSQL + Drizzle ORM', justification: 'Relational data with type-safe queries' },
    { category: 'Validation', technology: 'Zod', justification: 'Runtime type validation for API requests' },
    { category: 'Build', technology: 'Vite', justification: 'Fast builds with HMR' },
  ];

  const libraryPrefs = detectLibraryPreferences(understanding);

  if (libraryPrefs.length === 0) {
    return baseStack;
  }

  const replacedCategories = new Set<string>();
  for (const pref of libraryPrefs) {
    const replaces = SUPPORTED_LIBRARY_SIGNALS[
      Object.keys(SUPPORTED_LIBRARY_SIGNALS).find(k =>
        SUPPORTED_LIBRARY_SIGNALS[k].technology === pref.technology
      ) || ''
    ]?.replaces;
    if (replaces) {
      replacedCategories.add(replaces);
    }
  }

  const finalStack = baseStack.filter(item => !replacedCategories.has(item.category));

  for (const pref of libraryPrefs) {
    finalStack.push(pref);
  }

  return finalStack;
}

function toSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

function toKebabCase(str: string): string {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
}

function mapFieldType(type: string): string {
  if (type === 'serial') return 'serial (auto-increment)';
  if (type === 'string') return 'text';
  if (type === 'number') return 'integer';
  if (type === 'boolean') return 'boolean';
  if (type === 'date') return 'date';
  if (type === 'datetime') return 'timestamp';
  if (type === 'string[]') return 'text[]';
  if (type.startsWith('enum:')) return `enum(${type.replace('enum:', '')})`;
  return type;
}

export interface PlanConfidence {
  overall: number;
  entityInference: number;
  uxFlows: number;
  integrations: number;
  security: number;
  performance: number;
  lowConfidenceItems: { section: string; item: string; confidence: number; reason: string }[];
}

export interface ProjectPlan {
  projectName: string;
  overview: string;
  techStack: TechStackItem[];
  modules: PlannedModule[];
  dataModel: PlannedEntity[];
  pages: PlannedPage[];
  apiEndpoints: PlannedEndpoint[];
  workflows: PlannedWorkflow[];
  roles: PlannedRole[];
  fileBlueprint: PlannedFile[];
  kpis: string[];
  estimatedComplexity: string;
  integrations?: PlannedIntegration[];
  securityPlan?: SecurityPlan;
  performancePlan?: PerformancePlan;
  errorHandling?: ErrorHandlingPlan;
  uxFlows?: UXFlow[];
  customActions?: CustomAction[];
  dashboardWidgets?: DashboardWidget[];
  notifications?: NotificationPlan;
  confidence?: PlanConfidence;
}

export interface PlannedIntegration {
  type: 'payment' | 'email' | 'file-storage' | 'auth-provider' | 'calendar' | 'maps' | 'realtime' | 'charts' | 'sms' | 'analytics';
  name: string;
  reason: string;
  packages: string[];
  envVariables: string[];
  apiRoutes: { method: string; path: string; description: string }[];
  uiComponents: string[];
  setupNotes: string;
}

export interface SecurityPlan {
  authStrategy: 'session' | 'jwt' | 'oauth' | 'api-key' | 'none';
  roleHierarchy: { role: string; inheritsFrom?: string; level: number }[];
  entityPermissions: { entity: string; role: string; actions: ('create' | 'read' | 'update' | 'delete')[] }[];
  fieldVisibility: { entity: string; field: string; visibleTo: string[] }[];
  dataIsolation: { strategy: 'none' | 'user-scoped' | 'org-scoped' | 'role-scoped'; scopeField?: string }[];
  validationRules: { entity: string; field: string; rule: string; description: string }[];
  rateLimiting: { category: string; maxRequests: number; windowSeconds: number }[];
  auditLog: { entities: string[]; operations: string[] };
}

export interface PerformancePlan {
  pagination: { entity: string; strategy: 'offset' | 'cursor'; pageSize: number; reason: string }[];
  caching: { endpoint: string; ttlSeconds: number; invalidateOn: string[] }[];
  lazyLoadTargets: { component: string; reason: string }[];
  virtualScroll: { entity: string; reason: string }[];
  indexRecommendations: { entity: string; fields: string[]; type: 'btree' | 'hash' | 'gin' | 'unique'; reason: string }[];
  prefetch: { from: string; prefetchTarget: string }[];
  imageOptimization: { entity: string; field: string; strategies: string[] }[];
}

export interface ErrorHandlingPlan {
  pageStates: PageErrorState[];
  globalErrorStrategy: string;
  retryPolicy: { operations: string[]; maxRetries: number; backoffMs: number };
}

export interface PageErrorState {
  page: string;
  emptyState: { message: string; actionLabel: string; actionTarget: string };
  errorState: { message: string; retryable: boolean };
  loadingPattern: 'skeleton' | 'spinner' | 'shimmer';
}

export interface UXFlow {
  name: string;
  type: 'onboarding' | 'crud-create' | 'crud-edit' | 'wizard' | 'status-transition' | 'search-filter' | 'bulk-action' | 'settings';
  entity?: string;
  steps: UXFlowStep[];
  triggerAction: string;
  completionAction: string;
}

export interface UXFlowStep {
  order: number;
  label: string;
  description: string;
  fields?: string[];
  validation?: string;
  uiComponent: string;
}

export interface CustomAction {
  entity: string;
  action: string;
  method: 'POST' | 'PATCH';
  path: string;
  description: string;
  requiredRole?: string;
  confirmation?: boolean;
  statusTransition?: { from: string; to: string };
}

export interface DashboardWidget {
  type: 'stat-card' | 'line-chart' | 'bar-chart' | 'pie-chart' | 'donut-chart' | 'area-chart' | 'table' | 'activity-feed' | 'progress-bar' | 'calendar-mini';
  title: string;
  entity: string;
  metric: string;
  aggregation?: 'count' | 'sum' | 'average' | 'min' | 'max';
  groupBy?: string;
  timeRange?: string;
  size: 'small' | 'medium' | 'large';
}

export interface NotificationPlan {
  triggers: NotificationTrigger[];
  channels: ('in-app' | 'email' | 'sms' | 'push')[];
  preferences: boolean;
}

export interface NotificationTrigger {
  event: string;
  entity: string;
  channel: string;
  template: string;
  recipients: string;
}

export interface TechStackItem {
  category: string;
  technology: string;
  justification: string;
}

export interface PlannedModule {
  name: string;
  description: string;
  entities: string[];
  pageCount: number;
  features: string[];
}

export interface PlannedEntity {
  name: string;
  tableName: string;
  fields: { name: string; type: string; required: boolean; description?: string }[];
  relationships: { entity: string; type: string; field?: string }[];
}

export interface PlannedPage {
  name: string;
  path: string;
  module: string;
  description: string;
  componentName: string;
  features: string[];
  dataNeeded: string[];
}

export interface PlannedEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  entity: string;
  requestBody?: string;
  responseType: string;
}

export interface PlannedWorkflow {
  name: string;
  entity: string;
  states: string[];
  transitions: { from: string; to: string; action: string; role?: string }[];
}

export interface PlannedRole {
  name: string;
  description: string;
  permissions: string[];
  canAccess: string[];
}

export interface PlannedFile {
  path: string;
  purpose: string;
  type: 'component' | 'page' | 'api' | 'schema' | 'hook' | 'utility' | 'style' | 'config';
}

export function generatePlan(understanding: UnderstandingResult): ProjectPlan {
  const domain = understanding.level2_domain.primaryDomain;
  const intent = understanding.level1_intent;

  const projectName = generateProjectName(intent, domain);
  const overview = generateOverview(intent, domain);

  const selectedModuleNames = understanding.level2_domain.detectedModules.length > 0
    ? understanding.level2_domain.detectedModules
    : domain ? domain.modules.map(m => m.name) : [];

  const modules = planModules(domain, selectedModuleNames, understanding);
  const dataModel = planDataModel(domain, selectedModuleNames, understanding);
  const pages = planPages(domain, selectedModuleNames, understanding, dataModel);
  const apiEndpoints = planEndpoints(dataModel, pages);
  const workflows = planWorkflows(domain, dataModel, understanding);
  const roles = planRoles(domain, pages, understanding);
  const fileBlueprint = planFiles(pages, dataModel, modules);
  const kpis = planKPIs(domain, selectedModuleNames);

  const techStack: TechStackItem[] = buildTechStack(understanding);

  const entityCount = dataModel.length;
  const pageCount = pages.length;
  const estimatedComplexity = entityCount > 8 || pageCount > 12 ? 'Large' :
    entityCount > 4 || pageCount > 6 ? 'Medium' : 'Small';

  const customActions = deriveCustomActions(dataModel, workflows);
  const dashboardWidgets = deriveDashboardWidgets(dataModel, kpis);

  const basePlan: ProjectPlan = {
    projectName,
    overview,
    techStack,
    modules,
    dataModel,
    pages,
    apiEndpoints,
    workflows,
    roles,
    fileBlueprint,
    kpis,
    estimatedComplexity,
    customActions,
    dashboardWidgets,
  };

  // Module pruning: remove modules with no entities AND no pages
  basePlan.modules = basePlan.modules.filter(m => {
    const hasEntities = m.entities && m.entities.length > 0;
    const hasPages = basePlan.pages.some(p => p.module === m.name);
    // Cross-reference entities against data model to ensure they exist
    if (hasEntities) {
      m.entities = m.entities.filter(e => 
        basePlan.dataModel.some(dm => dm.name.toLowerCase() === e.toLowerCase())
      );
    }
    return (m.entities && m.entities.length > 0) || hasPages;
  });

  (basePlan as any)._detectedTechnology = understanding.level6_technology;

  return basePlan;
}

function generateProjectName(intent: IntentDecomposition, domain: IndustryDomain | null): string {
  if (domain) {
    const typeMap: Record<string, string> = {
      'consulting': 'ConsultingHub',
      'manufacturing': 'FactoryFlow',
      'healthcare': 'MediCare Pro',
      'retail': 'RetailEdge',
      'education': 'EduTrack',
      'realestate': 'PropertyHub',
      'hr': 'PeopleForce',
      'restaurant': 'DineOps',
      'fitness': 'FitManager',
      'logistics': 'LogiTrack',
      'finance': 'FinanceHub',
      'project-management': 'ProjectFlow',
      'crm': 'SalesPipe',
      'inventory': 'StockSense',
    };
    return typeMap[domain.id] || `${domain.name.split('/')[0].trim()} Manager`;
  }
  const words = intent.primaryGoal.replace(/^Build a /, '').split(/\s+/).slice(0, 3);
  const name = words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return name || `${intent.applicationType.toUpperCase()} System`;
}

function generateOverview(intent: IntentDecomposition, domain: IndustryDomain | null): string {
  if (domain) {
    return `A comprehensive ${domain.name.toLowerCase()} management system designed for ${intent.targetAudience}. ${domain.description}. Built with modern web technologies for reliability, speed, and ease of use.`;
  }
  return `A ${intent.applicationType} built for ${intent.targetAudience}. ${intent.primaryGoal}.`;
}

type IntentDecomposition = UnderstandingResult['level1_intent'];

function planModules(domain: IndustryDomain | null, selectedModuleNames: string[], understanding: UnderstandingResult): PlannedModule[] {
  if (domain) {
    return domain.modules
      .filter(m => selectedModuleNames.includes(m.name))
      .map(m => ({
        name: m.name,
        description: m.description,
        entities: m.entities,
        pageCount: m.pages.length,
        features: m.pages.flatMap(p => p.features).slice(0, 8),
      }));
  }

  const entities = understanding.level3_entities;
  const intent = understanding.level1_intent;
  const entitySet = new Set([...entities.mentionedEntities, ...entities.inferredEntities]);
  const allEntityNames = Array.from(entitySet);

  const modules: PlannedModule[] = [];

  modules.push({
    name: 'Dashboard',
    description: 'Overview dashboard with key metrics and recent activity',
    entities: [],
    pageCount: 1,
    features: ['kpi-cards', 'recent-activity', 'charts'],
  });

  const grouped = groupEntitiesByFunctionality(allEntityNames, intent);
  for (const [moduleName, moduleEntities] of Object.entries(grouped)) {
    modules.push({
      name: moduleName,
      description: `Manage ${moduleEntities.map(e => e.toLowerCase()).join(', ')} records`,
      entities: moduleEntities,
      pageCount: moduleEntities.length * 2,
      features: ['search', 'filter-by-status', 'sort', 'create', 'edit', 'delete'],
    });
  }

  return modules;
}

function groupEntitiesByFunctionality(
  entityNames: string[],
  intent: UnderstandingResult['level1_intent']
): Record<string, string[]> {
  const groups: Record<string, string[]> = {};

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  for (const name of entityNames) {
    const normalized = capitalize(name.replace(/s$/, ''));
    const moduleName = `${normalized} Management`;
    if (!groups[moduleName]) groups[moduleName] = [];
    groups[moduleName].push(normalized);
  }

  return groups;
}

function detectAndBreakCircularRelationships(entities: PlannedEntity[]): PlannedEntity[] {
  const entityNames = new Set(entities.map(e => e.name.toLowerCase()));

  const adjacency = new Map<string, { target: string; entityIdx: number; relIdx: number }[]>();
  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    const src = entity.name.toLowerCase();
    if (!adjacency.has(src)) adjacency.set(src, []);
    for (let j = 0; j < entity.relationships.length; j++) {
      const rel = entity.relationships[j];
      const target = rel.entity.toLowerCase();
      if (entityNames.has(target)) {
        adjacency.get(src)!.push({ target, entityIdx: i, relIdx: j });
      }
    }
  }

  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];
  const cyclesToBreak: { entityIdx: number; relIdx: number }[] = [];

  const dfs = (node: string) => {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const neighbors = adjacency.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor.target)) {
        dfs(neighbor.target);
      } else if (recursionStack.has(neighbor.target)) {
        cyclesToBreak.push({ entityIdx: neighbor.entityIdx, relIdx: neighbor.relIdx });
        console.warn(
          `[plan-generator] Circular dependency detected: ${path.slice(path.indexOf(neighbor.target)).join(' -> ')} -> ${neighbor.target}. Breaking by removing relationship from "${entities[neighbor.entityIdx].name}" to "${neighbor.target}".`
        );
      }
    }

    path.pop();
    recursionStack.delete(node);
  };

  const entityNameArray = Array.from(entityNames);
  for (const name of entityNameArray) {
    if (!visited.has(name)) {
      dfs(name);
    }
  }

  if (cyclesToBreak.length > 0) {
    const relIndicesToRemove = new Map<number, Set<number>>();
    for (const { entityIdx, relIdx } of cyclesToBreak) {
      if (!relIndicesToRemove.has(entityIdx)) relIndicesToRemove.set(entityIdx, new Set());
      relIndicesToRemove.get(entityIdx)!.add(relIdx);
    }

    const entries = Array.from(relIndicesToRemove.entries());
    for (const [entityIdx, relIndices] of entries) {
      entities[entityIdx].relationships = entities[entityIdx].relationships.filter(
        (_, idx) => !relIndices.has(idx)
      );
    }
  }

  return entities;
}

function planDataModel(domain: IndustryDomain | null, selectedModuleNames: string[], understanding: UnderstandingResult): PlannedEntity[] {
  if (domain) {
    const entities = buildEntitiesForModules(domain, selectedModuleNames);
    if (entities.length === 0) {
      return detectAndBreakCircularRelationships(domain.entities.map(mapEntity));
    }
    return detectAndBreakCircularRelationships(entities.map(mapEntity));
  }

  const entitiesResult = understanding.level3_entities;
  const entitySet2 = new Set([...entitiesResult.mentionedEntities, ...entitiesResult.inferredEntities]);
  const allEntityNames = Array.from(entitySet2);

  if (allEntityNames.length === 0) {
    return [];
  }

  const nlpExtraction = extractEntitiesFromText(
    understanding.level1_intent.primaryGoal + ' ' +
    understanding.level1_intent.keyRequirements.join(' ') + ' ' +
    allEntityNames.join(' ')
  );

  const plannedEntities: PlannedEntity[] = [];
  const seenNames = new Set<string>();

  for (const extracted of nlpExtraction.entities) {
    if (seenNames.has(extracted.name.toLowerCase())) continue;
    seenNames.add(extracted.name.toLowerCase());
    plannedEntities.push({
      name: extracted.name,
      tableName: toSnakeCase(extracted.name) + 's',
      fields: extracted.fields.map(f => ({
        name: f.name,
        type: mapFieldType(f.type),
        required: f.required || false,
        description: f.description,
      })),
      relationships: (extracted.relationships || []).map(r => ({
        entity: r.entity,
        type: r.type,
        field: r.field,
      })),
    });
  }

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  for (const name of allEntityNames) {
    const normalized = capitalize(name.replace(/s$/, ''));
    if (seenNames.has(normalized.toLowerCase())) continue;
    seenNames.add(normalized.toLowerCase());

    const inferred = inferFieldsForEntity(normalized);
    plannedEntities.push({
      name: normalized,
      tableName: toSnakeCase(normalized) + 's',
      fields: inferred.fields.map(f => ({
        name: f.name,
        type: mapFieldType(f.type),
        required: f.required || false,
        description: f.description,
      })),
      relationships: inferred.relationships.map(r => ({
        entity: r.entity,
        type: r.type,
        field: r.field,
      })),
    });
  }

  const validEntityNames = new Set(plannedEntities.map(e => e.name.toLowerCase()));
  for (const entity of plannedEntities) {
    entity.relationships = entity.relationships.filter(r => {
      const targetExists = validEntityNames.has(r.entity.toLowerCase());
      if (!targetExists) {
        console.warn(`[plan-generator] Dropping relationship from "${entity.name}" to non-existent entity "${r.entity}"`);
      }
      return targetExists;
    });
  }

  return detectAndBreakCircularRelationships(plannedEntities);
}

function mapEntity(entity: DomainEntity): PlannedEntity {
  const tableName = toSnakeCase(entity.name) + 's';
  return {
    name: entity.name,
    tableName,
    fields: entity.fields.map(f => ({
      name: f.name,
      type: mapFieldType(f.type),
      required: f.required || false,
      description: f.description,
    })),
    relationships: (entity.relationships || []).map(r => ({
      entity: r.entity,
      type: r.type,
      field: r.field,
    })),
  };
}

function planPages(domain: IndustryDomain | null, selectedModuleNames: string[], understanding: UnderstandingResult, dataModel: PlannedEntity[]): PlannedPage[] {
  if (domain) {
    const pageGroups = buildPagesForModules(domain, selectedModuleNames);
    const pages: PlannedPage[] = [];

    for (const group of pageGroups) {
      for (const page of group.pages) {
        const componentName = page.name.replace(/[^a-zA-Z0-9]/g, '') + 'Page';
        pages.push({
          name: page.name,
          path: page.path,
          module: group.module,
          description: page.description,
          componentName,
          features: page.features,
          dataNeeded: extractDataNeeded(page.features, domain, group.module),
        });
      }
    }

    return pages;
  }

  const pages: PlannedPage[] = [];

  pages.push({
    name: 'Dashboard',
    path: '/',
    module: 'Dashboard',
    description: 'Main dashboard with KPIs and recent activity',
    componentName: 'DashboardPage',
    features: ['kpi-cards', 'recent-activity', 'charts'],
    dataNeeded: dataModel.map(e => e.name),
  });

  for (const entity of dataModel) {
    const entityLower = entity.name.toLowerCase();
    const moduleName = `${entity.name} Management`;

    pages.push({
      name: `${entity.name} List`,
      path: `/${toKebabCase(entity.name)}s`,
      module: moduleName,
      description: `All ${entityLower} records with search and filters`,
      componentName: `${entity.name}ListPage`,
      features: ['search', 'filter-by-status', 'sort', 'create'],
      dataNeeded: [entity.name],
    });

    pages.push({
      name: `${entity.name} Detail`,
      path: `/${toKebabCase(entity.name)}s/:id`,
      module: moduleName,
      description: `View and edit ${entityLower} details`,
      componentName: `${entity.name}DetailPage`,
      features: ['edit', 'delete', 'status-tracking'],
      dataNeeded: [entity.name],
    });
  }

  return pages;
}

function extractDataNeeded(features: string[], domain: IndustryDomain, moduleName: string): string[] {
  const mod = domain.modules.find(m => m.name === moduleName);
  if (!mod) return [];
  return mod.entities;
}

function planEndpoints(dataModel: PlannedEntity[], pages?: PlannedPage[]): PlannedEndpoint[] {
  const endpoints: PlannedEndpoint[] = [];
  const entityRelMap = new Map<string, string[]>();
  for (const entity of dataModel) {
    for (const rel of entity.relationships) {
      if (!entityRelMap.has(rel.entity)) entityRelMap.set(rel.entity, []);
      entityRelMap.get(rel.entity)!.push(entity.name);
    }
  }

  for (const entity of dataModel) {
    const basePath = `/api/${toKebabCase(entity.name)}s`;
    const entityName = entity.name;
    const lower = entityName.toLowerCase();

    endpoints.push({
      method: 'GET',
      path: basePath,
      description: `List all ${lower}s with optional filters`,
      entity: entityName,
      responseType: `${entityName}[]`,
    });

    endpoints.push({
      method: 'GET',
      path: `${basePath}/:id`,
      description: `Get a single ${lower} by ID`,
      entity: entityName,
      responseType: entityName,
    });

    endpoints.push({
      method: 'POST',
      path: basePath,
      description: `Create a new ${lower}`,
      entity: entityName,
      requestBody: `Insert${entityName}`,
      responseType: entityName,
    });

    endpoints.push({
      method: 'PATCH',
      path: `${basePath}/:id`,
      description: `Update an existing ${lower}`,
      entity: entityName,
      requestBody: `Partial<Insert${entityName}>`,
      responseType: entityName,
    });

    endpoints.push({
      method: 'DELETE',
      path: `${basePath}/:id`,
      description: `Delete a ${lower}`,
      entity: entityName,
      responseType: 'void',
    });

    const hasTextFields = entity.fields.some(f =>
      f.type === 'text' && ['name', 'title', 'description', 'notes', 'content', 'summary'].includes(f.name)
    );
    if (hasTextFields) {
      endpoints.push({
        method: 'GET',
        path: `${basePath}/search`,
        description: `Search ${lower}s by text query`,
        entity: entityName,
        responseType: `${entityName}[]`,
      });
    }

    const statusField = entity.fields.find(f => f.name === 'status');
    if (statusField) {
      const enumMatch = statusField.type.match(/enum\((.+)\)/);
      if (enumMatch) {
        const states = enumMatch[1].split(',').map(s => s.trim());
        for (const state of states) {
          if (['approved', 'rejected', 'completed', 'archived', 'cancelled', 'published', 'active', 'shipped', 'delivered', 'confirmed', 'closed', 'suspended'].includes(state)) {
            const action = state === 'approved' ? 'approve' : state === 'rejected' ? 'reject' : state;
            endpoints.push({
              method: 'POST',
              path: `${basePath}/:id/${action}`,
              description: `${action.charAt(0).toUpperCase() + action.slice(1)} a ${lower}`,
              entity: entityName,
              responseType: entityName,
            });
          }
        }
      }
    }

    const childEntities = entityRelMap.get(entityName) || [];
    for (const child of childEntities) {
      const childPath = toKebabCase(child) + 's';
      endpoints.push({
        method: 'GET',
        path: `${basePath}/:id/${childPath}`,
        description: `Get all ${child.toLowerCase()}s for a specific ${lower}`,
        entity: child,
        responseType: `${child}[]`,
      });
    }

    const hasNumericFields = entity.fields.some(f =>
      ['integer', 'number', 'decimal', 'float'].some(t => f.type.includes(t)) ||
      /price|cost|amount|total|salary|revenue|quantity|count|score|rating/.test(f.name)
    );
    const hasDashboardPage = pages?.some(p =>
      p.dataNeeded.includes(entityName) && (p.features.includes('charts') || p.features.includes('kpi-cards') || p.module === 'Dashboard')
    );
    if (hasNumericFields || hasDashboardPage) {
      endpoints.push({
        method: 'GET',
        path: `${basePath}/stats`,
        description: `Get aggregate statistics for ${lower}s`,
        entity: entityName,
        responseType: `${entityName}Stats`,
      });
    }

    if (dataModel.length > 3) {
      endpoints.push({
        method: 'POST',
        path: `${basePath}/bulk`,
        description: `Bulk create or update ${lower}s`,
        entity: entityName,
        requestBody: `Insert${entityName}[]`,
        responseType: `${entityName}[]`,
      });
    }
  }

  const seen = new Set<string>();
  const deduped: PlannedEndpoint[] = [];
  for (const ep of endpoints) {
    const key = `${ep.method}:${ep.path}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(ep);
    }
  }
  return deduped;
}

function deriveCustomActions(dataModel: PlannedEntity[], workflows: PlannedWorkflow[]): CustomAction[] {
  const actions: CustomAction[] = [];

  for (const workflow of workflows) {
    for (const transition of workflow.transitions) {
      const entity = dataModel.find(e => e.name === workflow.entity);
      if (!entity) continue;
      const actionSlug = transition.action.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      actions.push({
        entity: workflow.entity,
        action: transition.action,
        method: 'POST',
        path: `/api/${toKebabCase(workflow.entity)}s/:id/${actionSlug}`,
        description: `${transition.action} (${transition.from} → ${transition.to})`,
        requiredRole: transition.role,
        confirmation: ['delete', 'archive', 'cancel', 'reject', 'suspend', 'terminate'].some(w => actionSlug.includes(w)),
        statusTransition: { from: transition.from, to: transition.to },
      });
    }
  }

  return actions;
}

function deriveDashboardWidgets(dataModel: PlannedEntity[], kpis: string[]): DashboardWidget[] {
  const widgets: DashboardWidget[] = [];

  for (const entity of dataModel) {
    widgets.push({
      type: 'stat-card',
      title: `Total ${entity.name}s`,
      entity: entity.name,
      metric: 'id',
      aggregation: 'count',
      size: 'small',
    });

    const statusField = entity.fields.find(f => f.name === 'status');
    if (statusField) {
      widgets.push({
        type: 'donut-chart',
        title: `${entity.name}s by Status`,
        entity: entity.name,
        metric: 'status',
        aggregation: 'count',
        groupBy: 'status',
        size: 'medium',
      });
    }

    const amountField = entity.fields.find(f =>
      /price|cost|amount|total|salary|revenue/.test(f.name)
    );
    const dateField = entity.fields.find(f =>
      f.type.includes('date') || f.type.includes('timestamp') || f.name === 'createdAt'
    );
    if (amountField && dateField) {
      widgets.push({
        type: 'area-chart',
        title: `${entity.name} ${amountField.name} Over Time`,
        entity: entity.name,
        metric: amountField.name,
        aggregation: 'sum',
        groupBy: dateField.name,
        timeRange: '30d',
        size: 'large',
      });
    }
  }

  widgets.push({
    type: 'activity-feed',
    title: 'Recent Activity',
    entity: dataModel[0]?.name || 'Activity',
    metric: 'createdAt',
    size: 'medium',
  });

  return widgets;
}

function planWorkflows(domain: IndustryDomain | null, dataModel: PlannedEntity[], understanding: UnderstandingResult): PlannedWorkflow[] {
  if (domain) {
    const entityNames = dataModel.map(e => e.name);
    return buildWorkflowsForEntities(domain, entityNames).map(w => ({
      name: w.name,
      entity: w.entity,
      states: w.states,
      transitions: w.transitions,
    }));
  }

  const workflows: PlannedWorkflow[] = [];
  for (const entity of dataModel) {
    const statusField = entity.fields.find(f => f.name === 'status');
    if (!statusField) continue;

    const enumMatch = statusField.type.match(/enum\((.+)\)/);
    const states = enumMatch
      ? enumMatch[1].split(',').map(s => s.trim())
      : ['draft', 'active', 'completed'];

    const transitions: PlannedWorkflow['transitions'] = [];
    for (let i = 0; i < states.length - 1; i++) {
      transitions.push({
        from: states[i],
        to: states[i + 1],
        action: `Move to ${states[i + 1]}`,
      });
    }
    if (states.length > 2) {
      transitions.push({
        from: states[states.length - 2],
        to: states[0],
        action: `Reset to ${states[0]}`,
      });
    }

    workflows.push({
      name: `${entity.name} Lifecycle`,
      entity: entity.name,
      states,
      transitions,
    });
  }

  return workflows;
}

function planRoles(domain: IndustryDomain | null, pages: PlannedPage[], understanding: UnderstandingResult): PlannedRole[] {
  if (domain) {
    return domain.roles.map(r => ({
      name: r.name,
      description: r.description,
      permissions: r.permissions,
      canAccess: r.permissions.includes('all')
        ? pages.map(p => p.path)
        : pages.filter(p => {
          const moduleLower = p.module.toLowerCase();
          return r.permissions.some(perm =>
            perm.includes(moduleLower) || perm.includes('view') || perm.includes('manage')
          );
        }).map(p => p.path),
    }));
  }

  const allPaths = pages.map(p => p.path);
  return [
    {
      name: 'Admin',
      description: 'Full system access',
      permissions: ['all'],
      canAccess: allPaths,
    },
    {
      name: 'User',
      description: 'Standard user access',
      permissions: ['view', 'create', 'edit-own'],
      canAccess: allPaths,
    },
  ];
}

function planFiles(pages: PlannedPage[], dataModel: PlannedEntity[], modules: PlannedModule[]): PlannedFile[] {
  const files: PlannedFile[] = [];

  files.push({ path: 'shared/schema.ts', purpose: 'Database schema and types for all entities', type: 'schema' });
  files.push({ path: 'server/routes.ts', purpose: 'All API endpoint handlers', type: 'api' });
  files.push({ path: 'server/storage.ts', purpose: 'Database access layer (CRUD operations)', type: 'utility' });
  files.push({ path: 'client/src/App.tsx', purpose: 'Root component with routing and layout', type: 'config' });
  files.push({ path: 'client/src/lib/queryClient.ts', purpose: 'API client and TanStack Query setup', type: 'utility' });

  for (const page of pages) {
    const fileName = toKebabCase(page.componentName.replace('Page', ''));
    files.push({
      path: `client/src/pages/${fileName}.tsx`,
      purpose: page.description,
      type: 'page',
    });
  }

  for (const entity of dataModel) {
    const hasListPage = pages.some(p => p.dataNeeded.includes(entity.name));
    if (hasListPage) {
      files.push({
        path: `client/src/components/${toKebabCase(entity.name)}-form.tsx`,
        purpose: `Create/edit form for ${entity.name}`,
        type: 'component',
      });
    }
  }

  files.push({ path: 'client/src/components/layout.tsx', purpose: 'App shell with sidebar navigation', type: 'component' });
  files.push({ path: 'client/src/components/kpi-card.tsx', purpose: 'Reusable KPI metric card', type: 'component' });
  files.push({ path: 'client/src/components/data-table.tsx', purpose: 'Reusable data table with search, filter, sort', type: 'component' });
  files.push({ path: 'client/src/components/status-badge.tsx', purpose: 'Status badge with color-coded states', type: 'component' });

  return files;
}

function planKPIs(domain: IndustryDomain | null, selectedModuleNames: string[]): string[] {
  if (!domain) return ['Total Records', 'Active Items', 'Recent Activity'];

  const moduleKPIs = domain.modules
    .filter(m => selectedModuleNames.includes(m.name))
    .flatMap(m => m.kpis || []);

  const scored: { kpi: string; score: number }[] = [];
  const seen = new Set<string>();

  for (const kpi of domain.defaultKPIs) {
    if (!seen.has(kpi)) {
      scored.push({ kpi, score: 10 });
      seen.add(kpi);
    }
  }
  for (const kpi of moduleKPIs) {
    if (!seen.has(kpi)) {
      scored.push({ kpi, score: 5 });
      seen.add(kpi);
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 8).map(s => s.kpi);
}

export function formatPlanAsMessage(plan: ProjectPlan): string {
  const sections: string[] = [];

  sections.push(`# Project Plan: ${plan.projectName}\n`);
  sections.push(`${plan.overview}\n`);
  sections.push(`**Estimated Complexity:** ${plan.estimatedComplexity} | **${plan.pages.length} pages** | **${plan.dataModel.length} data tables** | **${plan.apiEndpoints.length} API endpoints**\n`);

  sections.push('---\n');
  sections.push('## Tech Stack\n');
  for (const item of plan.techStack) {
    sections.push(`- **${item.category}:** ${item.technology} - ${item.justification}`);
  }
  if ((plan as any)._detectedTechnology) {
    const tech = (plan as any)._detectedTechnology as TechnologyDetectionResult;
    if (tech.detectedLanguage && tech.confidence > 0.5) {
      const parts: string[] = [];
      if (tech.detectedLanguage) parts.push(`Language: ${tech.detectedLanguage}`);
      if (tech.detectedFramework) parts.push(`Framework: ${tech.detectedFramework}`);
      if (tech.detectedDatabase) parts.push(`Database: ${tech.detectedDatabase}`);
      sections.push(`\n*Detected preferences: ${parts.join(', ')} (${Math.round(tech.confidence * 100)}% confidence)*`);
    }
  }

  sections.push('\n---\n');
  sections.push('## Modules\n');
  for (const mod of plan.modules) {
    sections.push(`### ${mod.name}`);
    sections.push(`${mod.description}`);
    sections.push(`- **Pages:** ${mod.pageCount} | **Key Features:** ${mod.features.slice(0, 5).join(', ')}`);
    if (mod.entities.length > 0) {
      sections.push(`- **Data:** ${mod.entities.join(', ')}`);
    }
    sections.push('');
  }

  sections.push('---\n');
  sections.push('## Pages\n');
  sections.push('| Page | Path | Module | Features |');
  sections.push('|------|------|--------|----------|');
  for (const page of plan.pages) {
    sections.push(`| ${page.name} | \`${page.path}\` | ${page.module} | ${page.features.slice(0, 3).join(', ')} |`);
  }

  sections.push('\n---\n');
  sections.push('## Data Model\n');
  for (const entity of plan.dataModel) {
    const fieldList = entity.fields
      .filter(f => f.name !== 'id')
      .map(f => `${f.name} (${f.type}${f.required ? ', required' : ''})`)
      .join(', ');
    sections.push(`- **${entity.name}** → \`${entity.tableName}\`: ${fieldList}`);
  }

  if (plan.workflows.length > 0) {
    sections.push('\n---\n');
    sections.push('## Workflows\n');
    for (const wf of plan.workflows) {
      sections.push(`### ${wf.name}`);
      sections.push(`**States:** ${wf.states.join(' → ')}`);
      sections.push('**Transitions:**');
      for (const t of wf.transitions) {
        sections.push(`- ${t.from} → ${t.to}: "${t.action}" ${t.role ? `(by ${t.role})` : ''}`);
      }
      sections.push('');
    }
  }

  sections.push('---\n');
  sections.push('## API Endpoints\n');
  const groupedEndpoints: Record<string, PlannedEndpoint[]> = {};
  for (const ep of plan.apiEndpoints) {
    if (!groupedEndpoints[ep.entity]) groupedEndpoints[ep.entity] = [];
    groupedEndpoints[ep.entity].push(ep);
  }
  for (const [entity, eps] of Object.entries(groupedEndpoints)) {
    sections.push(`**${entity}:**`);
    for (const ep of eps) {
      sections.push(`- \`${ep.method} ${ep.path}\` - ${ep.description}`);
    }
    sections.push('');
  }

  if (plan.roles.length > 0) {
    sections.push('---\n');
    sections.push('## User Roles\n');
    for (const role of plan.roles) {
      sections.push(`- **${role.name}:** ${role.description} (${role.permissions.slice(0, 4).join(', ')})`);
    }
  }

  if (plan.customActions && plan.customActions.length > 0) {
    sections.push('\n---\n');
    sections.push('## Custom Actions\n');
    const actionsByEntity: Record<string, CustomAction[]> = {};
    for (const a of plan.customActions) {
      if (!actionsByEntity[a.entity]) actionsByEntity[a.entity] = [];
      actionsByEntity[a.entity].push(a);
    }
    for (const [entity, actions] of Object.entries(actionsByEntity)) {
      sections.push(`**${entity}:**`);
      for (const a of actions) {
        sections.push(`- \`${a.method} ${a.path}\` — ${a.description}${a.confirmation ? ' (requires confirmation)' : ''}${a.requiredRole ? ` [${a.requiredRole}]` : ''}`);
      }
      sections.push('');
    }
  }

  if (plan.dashboardWidgets && plan.dashboardWidgets.length > 0) {
    sections.push('---\n');
    sections.push('## Dashboard Widgets\n');
    for (const w of plan.dashboardWidgets) {
      sections.push(`- **${w.title}** (${w.type}) — ${w.entity}.${w.metric}${w.aggregation ? ` [${w.aggregation}]` : ''}${w.groupBy ? ` grouped by ${w.groupBy}` : ''} | Size: ${w.size}`);
    }
  }

  if (plan.integrations && plan.integrations.length > 0) {
    sections.push('\n---\n');
    sections.push('## Integrations\n');
    for (const integ of plan.integrations) {
      sections.push(`### ${integ.name} (${integ.type})`);
      sections.push(`${integ.reason}`);
      sections.push(`- **Packages:** ${integ.packages.join(', ')}`);
      if (integ.envVariables.length > 0) sections.push(`- **Env Variables:** ${integ.envVariables.join(', ')}`);
      if (integ.uiComponents.length > 0) sections.push(`- **UI Components:** ${integ.uiComponents.join(', ')}`);
      sections.push('');
    }
  }

  if (plan.securityPlan) {
    sections.push('---\n');
    sections.push('## Security Plan\n');
    sections.push(`- **Auth Strategy:** ${plan.securityPlan.authStrategy}`);
    if (plan.securityPlan.roleHierarchy.length > 0) {
      sections.push(`- **Role Hierarchy:** ${plan.securityPlan.roleHierarchy.map(r => r.role).join(' > ')}`);
    }
    if (plan.securityPlan.fieldVisibility.length > 0) {
      sections.push(`- **Restricted Fields:** ${plan.securityPlan.fieldVisibility.map(f => `${f.entity}.${f.field} → ${f.visibleTo.join(', ')}`).join('; ')}`);
    }
    if (plan.securityPlan.rateLimiting.length > 0) {
      sections.push(`- **Rate Limiting:** ${plan.securityPlan.rateLimiting.map(r => `${r.category}: ${r.maxRequests}/${r.windowSeconds}s`).join(', ')}`);
    }
    if (plan.securityPlan.dataIsolation.some(d => d.strategy !== 'none')) {
      sections.push(`- **Data Isolation:** ${plan.securityPlan.dataIsolation.filter(d => d.strategy !== 'none').map(d => `${d.strategy}${d.scopeField ? ` (${d.scopeField})` : ''}`).join(', ')}`);
    }
  }

  if (plan.performancePlan) {
    sections.push('\n---\n');
    sections.push('## Performance Plan\n');
    if (plan.performancePlan.pagination.length > 0) {
      sections.push(`- **Pagination:** ${plan.performancePlan.pagination.map(p => `${p.entity}: ${p.strategy} (${p.pageSize}/page)`).join(', ')}`);
    }
    if (plan.performancePlan.indexRecommendations.length > 0) {
      sections.push(`- **Indexes:** ${plan.performancePlan.indexRecommendations.map(i => `${i.entity}(${i.fields.join(', ')}) [${i.type}]`).join(', ')}`);
    }
    if (plan.performancePlan.virtualScroll.length > 0) {
      sections.push(`- **Virtual Scroll:** ${plan.performancePlan.virtualScroll.map(v => v.entity).join(', ')}`);
    }
    if (plan.performancePlan.lazyLoadTargets.length > 0) {
      sections.push(`- **Lazy Loaded:** ${plan.performancePlan.lazyLoadTargets.map(l => l.component).join(', ')}`);
    }
  }

  if (plan.uxFlows && plan.uxFlows.length > 0) {
    sections.push('\n---\n');
    sections.push('## UX Flows\n');
    for (const flow of plan.uxFlows.slice(0, 5)) {
      const stepLabels = flow.steps.map(s => s.label).join(' → ');
      sections.push(`- **${flow.name}** (${flow.type}): ${stepLabels}`);
    }
    if (plan.uxFlows.length > 5) {
      sections.push(`- *...and ${plan.uxFlows.length - 5} more flows*`);
    }
  }

  if (plan.errorHandling) {
    sections.push('\n---\n');
    sections.push('## Error Handling\n');
    sections.push(`- **Strategy:** ${plan.errorHandling.globalErrorStrategy}`);
    sections.push(`- **Retry Policy:** ${plan.errorHandling.retryPolicy.maxRetries} retries, ${plan.errorHandling.retryPolicy.backoffMs}ms backoff`);
    const emptyStates = plan.errorHandling.pageStates.filter(p => p.emptyState);
    if (emptyStates.length > 0) {
      sections.push(`- **Empty States:** ${emptyStates.length} pages configured with contextual empty states`);
    }
  }

  if (plan.notifications) {
    sections.push('\n---\n');
    sections.push('## Notifications\n');
    sections.push(`- **Channels:** ${plan.notifications.channels.join(', ')}`);
    sections.push(`- **Triggers:** ${plan.notifications.triggers.map(t => `${t.entity}: ${t.event}`).join(', ')}`);
  }

  sections.push('\n---\n');
  sections.push(`## KPIs & Metrics\n`);
  sections.push(plan.kpis.map(k => `- ${k}`).join('\n'));

  sections.push('\n---\n');
  sections.push('## Files to Generate\n');
  sections.push(`**${plan.fileBlueprint.length} files total:**\n`);
  const filesByType: Record<string, PlannedFile[]> = {};
  for (const f of plan.fileBlueprint) {
    if (!filesByType[f.type]) filesByType[f.type] = [];
    filesByType[f.type].push(f);
  }
  for (const [type, files] of Object.entries(filesByType)) {
    sections.push(`**${type.charAt(0).toUpperCase() + type.slice(1)}s:**`);
    for (const f of files) {
      sections.push(`- \`${f.path}\` - ${f.purpose}`);
    }
    sections.push('');
  }

  if (plan.confidence) {
    sections.push('---\n');
    sections.push('## Plan Confidence\n');
    const pct = (v: number) => `${Math.round(v * 100)}%`;
    const bar = (v: number) => {
      const filled = Math.round(v * 10);
      return '█'.repeat(filled) + '░'.repeat(10 - filled);
    };
    sections.push(`**Overall:** ${bar(plan.confidence.overall)} ${pct(plan.confidence.overall)}\n`);
    sections.push(`| Dimension | Confidence |`);
    sections.push(`|-----------|------------|`);
    sections.push(`| Entity Inference | ${bar(plan.confidence.entityInference)} ${pct(plan.confidence.entityInference)} |`);
    sections.push(`| UX Flows | ${bar(plan.confidence.uxFlows)} ${pct(plan.confidence.uxFlows)} |`);
    sections.push(`| Integrations | ${bar(plan.confidence.integrations)} ${pct(plan.confidence.integrations)} |`);
    sections.push(`| Security | ${bar(plan.confidence.security)} ${pct(plan.confidence.security)} |`);
    sections.push(`| Performance | ${bar(plan.confidence.performance)} ${pct(plan.confidence.performance)} |`);

    if (plan.confidence.lowConfidenceItems.length > 0) {
      sections.push(`\n**⚠ Items needing review (${plan.confidence.lowConfidenceItems.length}):**`);
      for (const item of plan.confidence.lowConfidenceItems) {
        sections.push(`- **${item.section}: ${item.item}** — ${pct(item.confidence)} confidence. ${item.reason}`);
      }
      sections.push(`\n*You can provide more details about flagged items to improve the plan. For example, describe the fields a "${plan.confidence.lowConfidenceItems[0]?.item}" should have, or paste a sample record.*`);
    }
  }

  sections.push('\n---\n');
  sections.push('**Ready to generate this project?** Reply "approve" to start code generation, or tell me what you\'d like to change.');

  return sections.join('\n');
}