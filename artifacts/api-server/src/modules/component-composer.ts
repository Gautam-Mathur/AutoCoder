/**
 * Component Composer - The "UI Engineer" of the development team
 *
 * Plans the component architecture:
 * - Component tree and hierarchy
 * - Smart component splitting (container/presentational)
 * - Reusable component identification
 * - Prop interface design
 * - State lifting decisions
 * - Context boundary decisions
 * - Layout system planning
 * - Responsive strategy
 * - Accessibility requirements
 * - Animation and transition planning
 */

import type { ProjectPlan, PlannedEntity, PlannedPage, UXFlow, ErrorHandlingPlan, PageErrorState } from './plan-generator.js';
import type { ReasoningResult } from './contextual-reasoning-engine.js';
import type { FunctionalitySpec, EntityFeatureSpec } from './functionality-engine.js';
import type { DesignSystem } from './design-system-engine.js';
import { getAntiPatternChecklist, getBestPractices, getDomainModel, matchEntityToArchetype } from './knowledge-base.js';

export interface ComponentTree {
  components: ComponentSpec[];
  layouts: LayoutSpec[];
  contexts: ContextSpec[];
  sharedHooks: HookSpec[];
  accessibility: AccessibilityPlan;
  responsive: ResponsiveStrategy;
  animations: AnimationPlan;
  reusabilityMap: ReusabilityMap;
}

export interface ComponentSpec {
  name: string;
  type: 'page' | 'container' | 'presentational' | 'layout' | 'form' | 'list' | 'detail' | 'widget' | 'modal';
  path: string;
  props: PropSpec[];
  state: StateSpec[];
  children: string[];
  hooks: string[];
  features: string[];
  accessibility: ComponentA11y;
  responsive: boolean;
  memoized: boolean;
  lazyLoaded: boolean;
}

export interface PropSpec {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: string;
  description: string;
}

export interface StateSpec {
  name: string;
  type: string;
  source: 'local' | 'context' | 'server' | 'url';
  initialValue: string;
}

export interface LayoutSpec {
  name: string;
  type: 'sidebar' | 'topbar' | 'split' | 'stack' | 'grid' | 'full-width';
  slots: SlotSpec[];
  responsive: boolean;
  breakpoints: BreakpointConfig;
}

export interface SlotSpec {
  name: string;
  purpose: string;
  required: boolean;
  defaultComponent?: string;
}

export interface BreakpointConfig {
  mobile: string;
  tablet: string;
  desktop: string;
  wide?: string;
}

export interface ContextSpec {
  name: string;
  purpose: string;
  providedValues: string[];
  consumers: string[];
}

export interface HookSpec {
  name: string;
  purpose: string;
  params: string[];
  returnType: string;
  usedBy: string[];
}

export interface ComponentA11y {
  role?: string;
  ariaLabel?: string;
  keyboardNav: boolean;
  focusManagement: boolean;
  announcements: boolean;
}

export interface AccessibilityPlan {
  skipLinks: boolean;
  focusTrap: string[];
  liveRegions: string[];
  landmarkRoles: Record<string, string>;
  colorContrast: boolean;
  reducedMotion: boolean;
}

export interface ResponsiveStrategy {
  approach: 'mobile-first' | 'desktop-first';
  breakpoints: Record<string, number>;
  stackOnMobile: string[];
  hideOnMobile: string[];
  fullWidthOnMobile: string[];
}

export interface AnimationPlan {
  pageTransitions: boolean;
  listAnimations: boolean;
  microInteractions: string[];
  loadingStates: string[];
  respectReducedMotion: boolean;
}

export interface ReusabilityMap {
  shared: string[];
  entitySpecific: Record<string, string[]>;
  utilityComponents: string[];
}

export function composeComponents(
  plan: ProjectPlan,
  reasoning?: ReasoningResult | null,
  funcSpec?: FunctionalitySpec | null,
  designSystem?: DesignSystem | null,
  detectedDomain?: string,
): ComponentTree {
  const entities = plan.dataModel || [];
  const pages = plan.pages || [];

  const layouts = planLayouts(pages, entities);
  const components = planComponents(pages, entities, funcSpec, plan.errorHandling, plan.uxFlows);
  const contexts = planContexts(entities, components);
  const sharedHooks = planHooks(entities, components);
  const accessibility = planAccessibility(pages, components);
  const responsive = planResponsive(pages, components);
  const animations = planAnimations(designSystem);
  const reusabilityMap = analyzeReusability(components, entities);

  try {
    const antiPatternGuidance = getAntiPatternChecklist(['react', 'hooks', 'ux', 'rendering']);
    if (antiPatternGuidance && antiPatternGuidance.length > 0) {
      for (const component of components) {
        if (component.props.length > 8) {
          component.features.push('kb-warning:too-many-props');
        }
        if (component.type === 'container' && !component.hooks.some(h => h.includes('Query') || h.includes('Mutation'))) {
          if (component.state.some(s => s.source === 'server')) {
            component.features.push('kb-warning:prop-drilling-risk');
          }
        }
        if (!component.accessibility.role && !['presentational'].includes(component.type)) {
          component.features.push('kb-warning:missing-aria-role');
        }
      }
    }

    const uiBestPractices = getBestPractices('react');
    if (uiBestPractices.length > 0) {
      for (const component of components) {
        if (component.type === 'form' && !component.features.includes('validation')) {
          component.features.push('kb-recommendation:add-validation');
        }
      }
    }

    if (detectedDomain) {
      const domainModel = getDomainModel(detectedDomain);
      if (domainModel) {
        for (const component of components) {
          const entityName = component.name.replace(/(List|Detail|Form|Page|Card|Table)$/i, '');
          const archetype = matchEntityToArchetype(entityName);
          if (archetype) {
            if (archetype.traits.includes('searchable') && !component.features.includes('search')) {
              component.features.push('search');
            }
            if (archetype.traits.includes('pageable') && !component.features.includes('pagination')) {
              component.features.push('pagination');
            }
            if (archetype.traits.includes('workflowable') && !component.features.includes('status-filter')) {
              component.features.push('status-filter');
            }
            if (archetype.traits.includes('assignable') && !component.features.includes('assignee-filter')) {
              component.features.push('assignee-filter');
            }
            if (archetype.traits.includes('taggable') && !component.features.includes('tag-filter')) {
              component.features.push('tag-filter');
            }
            if (archetype.traits.includes('auditable') && !component.hooks.includes('useAuditLog')) {
              component.hooks.push('useAuditLog');
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn('[KB] component composition enrichment failed:', e);
  }

  return { components, layouts, contexts, sharedHooks, accessibility, responsive, animations, reusabilityMap };
}

function planLayouts(pages: PlannedPage[], entities: PlannedEntity[]): LayoutSpec[] {
  const layouts: LayoutSpec[] = [];

  layouts.push({
    name: 'MainLayout',
    type: 'sidebar',
    slots: [
      { name: 'sidebar', purpose: 'Navigation sidebar', required: true, defaultComponent: 'Sidebar' },
      { name: 'header', purpose: 'Top header bar', required: true, defaultComponent: 'Header' },
      { name: 'content', purpose: 'Main content area', required: true },
    ],
    responsive: true,
    breakpoints: { mobile: 'hidden sidebar, hamburger menu', tablet: 'collapsible sidebar', desktop: 'fixed sidebar' },
  });

  const hasDashboard = pages.some(p => p.name?.toLowerCase().includes('dashboard'));
  if (hasDashboard) {
    layouts.push({
      name: 'DashboardLayout',
      type: 'grid',
      slots: [
        { name: 'stats', purpose: 'KPI stat cards row', required: true },
        { name: 'charts', purpose: 'Chart/graph area', required: false },
        { name: 'tables', purpose: 'Recent data tables', required: false },
        { name: 'activity', purpose: 'Activity feed sidebar', required: false },
      ],
      responsive: true,
      breakpoints: { mobile: '1 column stack', tablet: '2 column grid', desktop: '3-4 column grid' },
    });
  }

  layouts.push({
    name: 'FormLayout',
    type: 'stack',
    slots: [
      { name: 'header', purpose: 'Form title and actions', required: true },
      { name: 'fields', purpose: 'Form field groups', required: true },
      { name: 'footer', purpose: 'Submit/cancel buttons', required: true },
    ],
    responsive: true,
    breakpoints: { mobile: 'single column', tablet: 'single column', desktop: '2 column for wide forms' },
  });

  layouts.push({
    name: 'ListDetailLayout',
    type: 'split',
    slots: [
      { name: 'list', purpose: 'Item list panel', required: true },
      { name: 'detail', purpose: 'Selected item detail panel', required: true },
    ],
    responsive: true,
    breakpoints: { mobile: 'full-width toggle', tablet: '40/60 split', desktop: '30/70 split' },
  });

  return layouts;
}

function planComponents(pages: PlannedPage[], entities: PlannedEntity[], funcSpec?: FunctionalitySpec | null, errorHandling?: ErrorHandlingPlan, uxFlows?: UXFlow[]): ComponentSpec[] {
  const components: ComponentSpec[] = [];

  components.push(createComponent('Sidebar', 'layout', 'src/components/layout/Sidebar.tsx', {
    props: [{ name: 'collapsed', type: 'boolean', required: false, defaultValue: 'false', description: 'Sidebar collapsed state' }],
    children: ['NavItem', 'UserMenu'],
    features: ['navigation', 'active-route-highlight', 'collapse-toggle'],
    accessibility: { role: 'navigation', ariaLabel: 'Main navigation', keyboardNav: true, focusManagement: false, announcements: false },
  }));

  components.push(createComponent('Header', 'layout', 'src/components/layout/Header.tsx', {
    props: [{ name: 'title', type: 'string', required: false, defaultValue: "''", description: 'Page title' }],
    children: ['SearchBar', 'NotificationBell', 'UserAvatar'],
    features: ['breadcrumbs', 'search', 'notifications'],
    accessibility: { role: 'banner', ariaLabel: 'Page header', keyboardNav: true, focusManagement: false, announcements: false },
  }));

  components.push(createComponent('DataTable', 'presentational', 'src/components/shared/DataTable.tsx', {
    props: [
      { name: 'data', type: 'T[]', required: true, description: 'Array of data items' },
      { name: 'columns', type: 'ColumnDef<T>[]', required: true, description: 'Column definitions' },
      { name: 'onSort', type: '(field: string) => void', required: false, description: 'Sort handler' },
      { name: 'onFilter', type: '(filters: Record<string, string>) => void', required: false, description: 'Filter handler' },
      { name: 'loading', type: 'boolean', required: false, defaultValue: 'false', description: 'Loading state' },
    ],
    features: ['sorting', 'filtering', 'pagination', 'row-selection', 'empty-state'],
    memoized: true,
    accessibility: { role: 'table', ariaLabel: 'Data table', keyboardNav: true, focusManagement: true, announcements: true },
  }));

  components.push(createComponent('SearchBar', 'presentational', 'src/components/shared/SearchBar.tsx', {
    props: [
      { name: 'value', type: 'string', required: true, description: 'Search input value' },
      { name: 'onChange', type: '(value: string) => void', required: true, description: 'Change handler' },
      { name: 'placeholder', type: 'string', required: false, defaultValue: "'Search...'", description: 'Placeholder text' },
    ],
    features: ['debounce', 'clear-button', 'keyboard-shortcut'],
    accessibility: { role: 'search', ariaLabel: 'Search', keyboardNav: true, focusManagement: false, announcements: true },
  }));

  components.push(createComponent('StatCard', 'presentational', 'src/components/shared/StatCard.tsx', {
    props: [
      { name: 'title', type: 'string', required: true, description: 'Stat label' },
      { name: 'value', type: 'string | number', required: true, description: 'Stat value' },
      { name: 'change', type: 'number', required: false, description: 'Percentage change' },
      { name: 'icon', type: 'ReactNode', required: false, description: 'Icon element' },
    ],
    features: ['trend-indicator', 'loading-skeleton', 'click-to-drill-down'],
    accessibility: { keyboardNav: false, focusManagement: false, announcements: false },
  }));

  components.push(createComponent('EmptyState', 'presentational', 'src/components/shared/EmptyState.tsx', {
    props: [
      { name: 'title', type: 'string', required: true, description: 'Empty state title' },
      { name: 'description', type: 'string', required: false, description: 'Description text' },
      { name: 'action', type: 'ReactNode', required: false, description: 'CTA button' },
      { name: 'icon', type: 'ReactNode', required: false, description: 'Illustration or icon' },
    ],
    features: ['illustration', 'cta-button'],
    accessibility: { role: 'status', keyboardNav: false, focusManagement: false, announcements: true },
  }));

  components.push(createComponent('ConfirmDialog', 'presentational', 'src/components/shared/ConfirmDialog.tsx', {
    props: [
      { name: 'open', type: 'boolean', required: true, description: 'Dialog open state' },
      { name: 'onConfirm', type: '() => void', required: true, description: 'Confirm handler' },
      { name: 'onCancel', type: '() => void', required: true, description: 'Cancel handler' },
      { name: 'title', type: 'string', required: true, description: 'Dialog title' },
      { name: 'description', type: 'string', required: false, description: 'Dialog description' },
      { name: 'destructive', type: 'boolean', required: false, defaultValue: 'false', description: 'Destructive action styling' },
    ],
    features: ['focus-trap', 'escape-close', 'backdrop-close'],
    accessibility: { role: 'alertdialog', ariaLabel: 'Confirmation dialog', keyboardNav: true, focusManagement: true, announcements: true },
  }));

  components.push(createComponent('LoadingSkeleton', 'presentational', 'src/components/shared/LoadingSkeleton.tsx', {
    props: [
      { name: 'variant', type: "'card' | 'table' | 'form' | 'list'", required: false, defaultValue: "'card'", description: 'Skeleton variant' },
      { name: 'count', type: 'number', required: false, defaultValue: '3', description: 'Number of skeleton items' },
    ],
    features: ['shimmer-animation', 'variant-shapes'],
    accessibility: { role: 'status', ariaLabel: 'Loading content', keyboardNav: false, focusManagement: false, announcements: true },
  }));

  for (const entity of entities) {
    const entitySpec = funcSpec?.entityFeatures?.find((s: EntityFeatureSpec) => s.entityName === entity.name);

    components.push(createComponent(`${entity.name}List`, 'container', `src/components/${toKebab(entity.name)}/${entity.name}List.tsx`, {
      state: [
        { name: 'items', type: `${entity.name}[]`, source: 'server', initialValue: '[]' },
        { name: 'filters', type: 'FilterState', source: 'url', initialValue: '{}' },
        { name: 'sortBy', type: 'string', source: 'url', initialValue: "'createdAt'" },
      ],
      children: ['DataTable', 'SearchBar', 'FilterBar', `${entity.name}Row`],
      hooks: [`use${entity.name}Query`, 'useDebounce', 'useUrlParams'],
      features: ['pagination', 'search', 'filter', 'sort', 'bulk-actions', ...(entitySpec?.crudEnhancements || [])],
      accessibility: { role: 'region', ariaLabel: `${entity.name} list`, keyboardNav: true, focusManagement: true, announcements: true },
    }));

    components.push(createComponent(`${entity.name}Form`, 'form', `src/components/${toKebab(entity.name)}/${entity.name}Form.tsx`, {
      props: [
        { name: 'initialData', type: `Partial<${entity.name}>`, required: false, description: 'Pre-fill data for editing' },
        { name: 'onSubmit', type: `(data: ${entity.name}) => void`, required: true, description: 'Submit handler' },
        { name: 'mode', type: "'create' | 'edit'", required: false, defaultValue: "'create'", description: 'Form mode' },
      ],
      state: entity.fields.filter(f => f.name !== 'id').map(f => ({
        name: f.name,
        type: f.type,
        source: 'local' as const,
        initialValue: inferFormDefault(f.type),
      })),
      children: ['FormField', 'Button'],
      hooks: ['useForm', 'useToast'],
      features: ['validation', 'error-display', 'dirty-tracking', 'auto-save-draft'],
      accessibility: { role: 'form', ariaLabel: `${entity.name} form`, keyboardNav: true, focusManagement: true, announcements: true },
    }));

    components.push(createComponent(`${entity.name}Detail`, 'detail', `src/components/${toKebab(entity.name)}/${entity.name}Detail.tsx`, {
      props: [{ name: 'id', type: 'number', required: true, description: `${entity.name} ID` }],
      state: [{ name: 'data', type: entity.name, source: 'server', initialValue: 'null' }],
      children: [`${entity.name}Form`, 'StatCard', 'ActivityFeed'],
      hooks: [`use${entity.name}Query`, 'useToast'],
      features: ['inline-edit', 'delete-confirm', 'related-data', ...(entitySpec?.interactiveFeatures || [])],
      accessibility: { role: 'article', ariaLabel: `${entity.name} details`, keyboardNav: true, focusManagement: false, announcements: true },
    }));
  }

  for (const page of pages) {
    const pageName = capitalize(page.name || 'Page');
    if (!components.find(c => c.name === `${pageName}Page`)) {
      const baseChildren = page.name?.toLowerCase().includes('dashboard')
        ? ['StatCard', 'DataTable', 'Chart']
        : (page.name?.toLowerCase().includes('list') || page.description?.toLowerCase().includes('list'))
          ? [`${pageName}List`, 'SearchBar']
          : [`${pageName}Detail`];
      const baseFeatures: string[] = page.name?.toLowerCase().includes('dashboard') ? ['kpi-cards', 'charts', 'recent-activity'] : ['breadcrumbs'];

      const pageErrorState = errorHandling?.pageStates?.find(
        (ps: PageErrorState) => ps.page?.toLowerCase() === (page.name || '').toLowerCase()
      );
      if (pageErrorState) {
        baseChildren.push('EmptyState', 'ErrorState', 'LoadingSkeleton');
        baseFeatures.push('empty-state', 'error-state', `loading-${pageErrorState.loadingPattern || 'skeleton'}`);
        if (pageErrorState.errorState?.retryable) {
          baseFeatures.push('error-retry');
        }
      }

      const relatedFlows = uxFlows?.filter(
        (flow: UXFlow) => flow.steps?.some(step => step.uiComponent?.toLowerCase() === (page.name || '').toLowerCase())
      );
      if (relatedFlows && relatedFlows.length > 0) {
        baseFeatures.push('flow-breadcrumbs', 'flow-next-step-indicator');
        baseChildren.push('FlowBreadcrumbs', 'FlowStepIndicator');
        for (const flow of relatedFlows) {
          baseFeatures.push(`flow:${flow.name}`);
        }
      }

      components.push(createComponent(`${pageName}Page`, 'page', `src/pages/${toKebab(page.name || 'page')}.tsx`, {
        children: baseChildren,
        features: baseFeatures,
        lazyLoaded: !page.name?.toLowerCase().includes('dashboard'),
        accessibility: { role: 'main', ariaLabel: `${page.name} page`, keyboardNav: true, focusManagement: false, announcements: false },
      }));
    }
  }

  return components;
}

function planContexts(entities: PlannedEntity[], components: ComponentSpec[]): ContextSpec[] {
  const contexts: ContextSpec[] = [];

  contexts.push({
    name: 'ThemeContext',
    purpose: 'Dark/light mode and design tokens',
    providedValues: ['theme', 'toggleTheme', 'designTokens'],
    consumers: components.filter(c => c.type === 'layout' || c.type === 'presentational').map(c => c.name),
  });

  contexts.push({
    name: 'ToastContext',
    purpose: 'Toast notification system',
    providedValues: ['toast', 'dismiss'],
    consumers: components.filter(c => c.type === 'container' || c.type === 'form').map(c => c.name),
  });

  if (entities.length > 3) {
    contexts.push({
      name: 'SidebarContext',
      purpose: 'Sidebar collapsed state',
      providedValues: ['collapsed', 'toggleSidebar'],
      consumers: ['Sidebar', 'MainLayout', 'Header'],
    });
  }

  return contexts;
}

function planHooks(entities: PlannedEntity[], components: ComponentSpec[]): HookSpec[] {
  const hooks: HookSpec[] = [];

  hooks.push({
    name: 'useDebounce',
    purpose: 'Debounce rapidly changing values (search, filters)',
    params: ['value: T', 'delay: number'],
    returnType: 'T',
    usedBy: components.filter(c => c.features.includes('search') || c.features.includes('filter')).map(c => c.name),
  });

  hooks.push({
    name: 'useUrlParams',
    purpose: 'Sync component state with URL query parameters',
    params: ['defaults: Record<string, string>'],
    returnType: '{ params: Record<string, string>, setParam: (key: string, value: string) => void }',
    usedBy: components.filter(c => c.type === 'container').map(c => c.name),
  });

  hooks.push({
    name: 'useMediaQuery',
    purpose: 'Responsive breakpoint detection',
    params: ['query: string'],
    returnType: 'boolean',
    usedBy: ['MainLayout', 'Sidebar'],
  });

  hooks.push({
    name: 'useKeyboardShortcut',
    purpose: 'Register keyboard shortcuts',
    params: ['key: string', 'callback: () => void', 'options?: { ctrl?: boolean, shift?: boolean }'],
    returnType: 'void',
    usedBy: ['SearchBar', 'DataTable', 'ConfirmDialog'],
  });

  for (const entity of entities) {
    hooks.push({
      name: `use${entity.name}Query`,
      purpose: `Fetch and cache ${entity.name} data via TanStack Query`,
      params: ['filters?: FilterState'],
      returnType: `{ data: ${entity.name}[], isLoading: boolean, error: Error | null, refetch: () => void }`,
      usedBy: [`${entity.name}List`, `${entity.name}Detail`],
    });

    hooks.push({
      name: `use${entity.name}Mutation`,
      purpose: `Create/update/delete ${entity.name} records`,
      params: [],
      returnType: `{ create: (data: Partial<${entity.name}>) => Promise<${entity.name}>, update: (id: number, data: Partial<${entity.name}>) => Promise<${entity.name}>, remove: (id: number) => Promise<void> }`,
      usedBy: [`${entity.name}Form`, `${entity.name}List`],
    });
  }

  return hooks;
}

function planAccessibility(pages: PlannedPage[], components: ComponentSpec[]): AccessibilityPlan {
  return {
    skipLinks: true,
    focusTrap: components.filter(c => c.type === 'modal' || c.name.includes('Dialog')).map(c => c.name),
    liveRegions: ['ToastContainer', 'SearchResults', 'FormErrors'],
    landmarkRoles: {
      'Sidebar': 'navigation',
      'Header': 'banner',
      'MainContent': 'main',
      'Footer': 'contentinfo',
    },
    colorContrast: true,
    reducedMotion: true,
  };
}

function planResponsive(pages: PlannedPage[], components: ComponentSpec[]): ResponsiveStrategy {
  return {
    approach: 'mobile-first',
    breakpoints: { sm: 640, md: 768, lg: 1024, xl: 1280 },
    stackOnMobile: components.filter(c => c.type === 'container' || c.type === 'page').map(c => c.name),
    hideOnMobile: ['Sidebar'],
    fullWidthOnMobile: components.filter(c => c.type === 'form' || c.type === 'list').map(c => c.name),
  };
}

function planAnimations(designSystem?: DesignSystem | null): AnimationPlan {
  return {
    pageTransitions: true,
    listAnimations: true,
    microInteractions: ['button-press', 'toggle-switch', 'checkbox-check', 'card-hover', 'input-focus'],
    loadingStates: ['skeleton-shimmer', 'spinner', 'progress-bar', 'pulse'],
    respectReducedMotion: true,
  };
}

function analyzeReusability(components: ComponentSpec[], entities: PlannedEntity[]): ReusabilityMap {
  const shared = components.filter(c => c.type === 'presentational' || c.type === 'layout').map(c => c.name);
  const entitySpecific: Record<string, string[]> = {};

  for (const entity of entities) {
    entitySpecific[entity.name] = components
      .filter(c => c.name.startsWith(entity.name))
      .map(c => c.name);
  }

  const utilityComponents = ['LoadingSkeleton', 'EmptyState', 'ErrorBoundary', 'ConfirmDialog', 'SearchBar'];

  return { shared, entitySpecific, utilityComponents };
}

function createComponent(name: string, type: ComponentSpec['type'], path: string, overrides: Partial<ComponentSpec> = {}): ComponentSpec {
  return {
    name,
    type,
    path,
    props: overrides.props || [],
    state: overrides.state || [],
    children: overrides.children || [],
    hooks: overrides.hooks || [],
    features: overrides.features || [],
    accessibility: overrides.accessibility || { keyboardNav: false, focusManagement: false, announcements: false },
    responsive: overrides.responsive !== undefined ? overrides.responsive : true,
    memoized: overrides.memoized || false,
    lazyLoaded: overrides.lazyLoaded || false,
  };
}

function inferFormDefault(type: string): string {
  const lower = type.toLowerCase();
  if (lower === 'string' || lower === 'text') return "''";
  if (lower === 'number' || lower === 'integer') return '0';
  if (lower === 'boolean') return 'false';
  if (lower === 'date' || lower === 'datetime') return "''";
  if (lower === 'array' || lower === 'json') return '[]';
  return "''";
}

function capitalize(str: string): string {
  return str.replace(/(?:^|\s|-)\w/g, m => m.toUpperCase()).replace(/[\s-]/g, '');
}

function toKebab(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/[\s_]+/g, '-').toLowerCase();
}