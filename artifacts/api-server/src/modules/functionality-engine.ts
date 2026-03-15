import type { ProjectPlan, PlannedEntity, PlannedPage, PlannedWorkflow, DashboardWidget, CustomAction } from './plan-generator.js';
import type { ReasoningResult, UIPattern } from './contextual-reasoning-engine.js';

export interface EntityFeatureSpec {
  entityName: string;
  crudEnhancements: CrudEnhancement[];
  interactiveFeatures: InteractiveFeature[];
  dataDisplayFeatures: DataDisplayFeature[];
  automationFeatures: AutomationFeature[];
}

export interface CrudEnhancement {
  type: 'inline-edit' | 'bulk-actions' | 'soft-delete' | 'duplicate' | 'import-export' | 'quick-create' | 'archive';
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export interface InteractiveFeature {
  type: 'drag-drop' | 'status-transition' | 'assignee-picker' | 'date-picker-range' | 'color-picker' | 'file-upload' | 'rich-text' | 'autocomplete' | 'multi-select-tags' | 'inline-comments' | 'activity-timeline' | 'progress-tracker';
  description: string;
  config: Record<string, any>;
  requiredImports: string[];
}

export interface DataDisplayFeature {
  type: 'charts' | 'sparkline' | 'progress-bar' | 'avatar-stack' | 'status-timeline' | 'image-gallery' | 'stat-card' | 'comparison-table' | 'grouped-list' | 'timeline-view' | 'heatmap' | 'count-badge';
  description: string;
  config: Record<string, any>;
}

export interface AutomationFeature {
  type: 'auto-status-update' | 'notification-trigger' | 'computed-field' | 'cascade-update' | 'deadline-warning' | 'recurrence' | 'auto-assign';
  description: string;
  trigger: string;
  action: string;
}

export interface PageFeatureSpec {
  pageName: string;
  pagePath: string;
  layoutType: 'dashboard' | 'list-detail' | 'kanban' | 'calendar' | 'card-grid' | 'form-wizard' | 'split-view' | 'timeline' | 'table';
  headerFeatures: HeaderFeature[];
  contentFeatures: ContentFeature[];
  sidebarFeatures: SidebarFeature[];
  emptyStateMessage: string;
  loadingPattern: 'skeleton' | 'spinner' | 'shimmer';
  errorPattern: 'toast' | 'inline' | 'page-error';
  refreshStrategy: 'auto-refetch' | 'manual' | 'realtime';
}

export interface HeaderFeature {
  type: 'search-bar' | 'filter-chips' | 'view-toggle' | 'sort-dropdown' | 'date-range' | 'action-button' | 'breadcrumbs' | 'tab-navigation' | 'count-indicator';
  config: Record<string, any>;
}

export interface ContentFeature {
  type: 'data-table' | 'kanban-board' | 'card-grid' | 'calendar-view' | 'timeline' | 'form' | 'chart-section' | 'kpi-row' | 'activity-feed' | 'split-pane' | 'accordion-list' | 'master-detail';
  config: Record<string, any>;
}

export interface SidebarFeature {
  type: 'filter-panel' | 'quick-actions' | 'related-items' | 'stats-panel' | 'help-panel' | 'activity-log';
  config: Record<string, any>;
}

export interface FunctionalitySpec {
  entityFeatures: EntityFeatureSpec[];
  pageFeatures: PageFeatureSpec[];
  globalFeatures: GlobalFeature[];
  requiredComponents: RequiredComponent[];
}

export interface GlobalFeature {
  name: string;
  type: 'keyboard-shortcuts' | 'dark-mode-toggle' | 'notification-center' | 'global-search' | 'breadcrumbs' | 'user-preferences' | 'export-all';
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export interface RequiredComponent {
  name: string;
  path: string;
  type: 'ui' | 'feature' | 'layout';
  description: string;
}

const ENTITY_FEATURE_RULES: Record<string, (entity: PlannedEntity, workflows: PlannedWorkflow[]) => Partial<EntityFeatureSpec>> = {
  'task-like': (entity, workflows) => {
    const workflow = workflows.find(w => w.entity === entity.name);
    const features: Partial<EntityFeatureSpec> = {
      interactiveFeatures: [
        {
          type: 'status-transition',
          description: `Workflow transitions for ${entity.name}`,
          config: { states: workflow?.states || [], transitions: workflow?.transitions || [] },
          requiredImports: ['useState'],
        },
      ],
      crudEnhancements: [
        { type: 'quick-create', description: 'Quick add from list/board view', priority: 'high' },
        { type: 'bulk-actions', description: 'Bulk status change, assign, delete', priority: 'medium' },
      ],
      dataDisplayFeatures: [
        { type: 'count-badge', description: 'Count per status column', config: { groupBy: 'status' } },
        { type: 'progress-bar', description: 'Completion progress', config: { field: 'status', doneState: 'done' } },
      ],
    };
    if (entity.fields.some(f => f.name === 'assigneeId' || f.name === 'assignee')) {
      features.interactiveFeatures!.push({
        type: 'assignee-picker',
        description: 'Assign to team members',
        config: { allowMultiple: false },
        requiredImports: ['useState'],
      });
    }
    if (entity.fields.some(f => f.name === 'dueDate' || f.name === 'deadline')) {
      features.automationFeatures = [{
        type: 'deadline-warning',
        description: 'Highlight overdue items',
        trigger: 'dueDate < now && status !== done',
        action: 'Show warning badge',
      }];
    }
    if (entity.fields.some(f => f.name === 'priority')) {
      features.interactiveFeatures!.push({
        type: 'multi-select-tags',
        description: 'Priority quick-set',
        config: { field: 'priority', options: ['low', 'medium', 'high', 'urgent'] },
        requiredImports: [],
      });
    }
    if (entity.fields.some(f => f.name === 'labels' || f.name === 'tags')) {
      features.interactiveFeatures!.push({
        type: 'multi-select-tags',
        description: 'Label/tag management',
        config: { field: 'labels', freeform: true },
        requiredImports: ['useState'],
      });
    }
    return features;
  },

  'contact-like': (entity) => ({
    interactiveFeatures: [
      {
        type: 'autocomplete',
        description: 'Search contacts by name/email',
        config: { searchFields: ['firstName', 'lastName', 'email', 'name'] },
        requiredImports: ['useState', 'useMemo'],
      },
    ],
    crudEnhancements: [
      { type: 'import-export', description: 'CSV import/export for contacts', priority: 'medium' },
      { type: 'duplicate', description: 'Duplicate contact record', priority: 'low' },
    ],
    dataDisplayFeatures: [
      { type: 'avatar-stack', description: 'Avatar display with initials fallback', config: { field: 'avatar' } },
      ...(entity.fields.some(f => f.name === 'status') ?
        [{ type: 'count-badge' as const, description: 'Contact count by status', config: { groupBy: 'status' } }] : []),
    ],
  }),

  'deal-like': (entity, workflows) => {
    const workflow = workflows.find(w => w.entity === entity.name);
    return {
      interactiveFeatures: [
        {
          type: 'drag-drop',
          description: 'Drag deals between pipeline stages',
          config: { columns: workflow?.states || ['new', 'in-progress', 'won', 'lost'] },
          requiredImports: ['useState'],
        },
        {
          type: 'status-transition',
          description: 'Pipeline stage transitions',
          config: { states: workflow?.states || [], transitions: workflow?.transitions || [] },
          requiredImports: ['useState'],
        },
      ],
      dataDisplayFeatures: [
        { type: 'stat-card', description: 'Deal value summary', config: { aggregateField: 'value', format: 'currency' } },
        { type: 'charts', description: 'Pipeline value by stage', config: { type: 'bar', groupBy: 'stage', valueField: 'value' } },
      ],
      crudEnhancements: [
        { type: 'quick-create', description: 'Quick add deal to stage', priority: 'high' },
      ],
    };
  },

  'product-like': (entity) => ({
    interactiveFeatures: [
      ...(entity.fields.some(f => /image|photo|picture|thumbnail/i.test(f.name)) ?
        [{ type: 'file-upload' as const, description: 'Product image upload', config: { accept: 'image/*', multiple: true }, requiredImports: ['useState'] }] : []),
    ],
    dataDisplayFeatures: [
      ...(entity.fields.some(f => /image|photo|picture|thumbnail/i.test(f.name)) ?
        [{ type: 'image-gallery' as const, description: 'Product image gallery', config: { field: 'image' } }] : []),
      ...(entity.fields.some(f => /price|cost|amount/i.test(f.name)) ?
        [{ type: 'stat-card' as const, description: 'Price display with formatting', config: { format: 'currency' } }] : []),
    ],
    crudEnhancements: [
      { type: 'duplicate', description: 'Duplicate product', priority: 'medium' },
      { type: 'archive', description: 'Archive discontinued products', priority: 'low' },
      { type: 'import-export', description: 'Bulk import/export products', priority: 'medium' },
    ],
  }),

  'event-like': () => ({
    interactiveFeatures: [
      {
        type: 'date-picker-range',
        description: 'Date/time range selection',
        config: { includeTime: true },
        requiredImports: ['useState'],
      },
    ],
    dataDisplayFeatures: [
      { type: 'timeline-view', description: 'Events on timeline', config: { dateField: 'startDate' } },
    ],
    crudEnhancements: [
      { type: 'quick-create', description: 'Quick event creation', priority: 'high' },
    ],
    automationFeatures: [
      { type: 'recurrence', description: 'Recurring event support', trigger: 'recurrence rule', action: 'Create next occurrence' },
    ],
  }),

  'comment-like': () => ({
    interactiveFeatures: [
      {
        type: 'rich-text',
        description: 'Rich text comment editor',
        config: { features: ['bold', 'italic', 'link', 'code'] },
        requiredImports: ['useState'],
      },
      {
        type: 'activity-timeline',
        description: 'Threaded comment timeline',
        config: { sortOrder: 'newest-first' },
        requiredImports: [],
      },
    ],
    crudEnhancements: [],
    dataDisplayFeatures: [],
  }),

  'project-like': (entity) => ({
    interactiveFeatures: [
      {
        type: 'progress-tracker',
        description: 'Project completion tracking',
        config: { field: 'progress', max: 100 },
        requiredImports: [],
      },
    ],
    dataDisplayFeatures: [
      { type: 'progress-bar', description: 'Project progress bar', config: { field: 'progress' } },
      { type: 'charts', description: 'Project status distribution', config: { type: 'pie', groupBy: 'status' } },
      ...(entity.fields.some(f => f.name === 'startDate' || f.name === 'endDate') ?
        [{ type: 'timeline-view' as const, description: 'Project timeline/gantt', config: { startField: 'startDate', endField: 'endDate' } }] : []),
    ],
    crudEnhancements: [
      { type: 'archive', description: 'Archive completed projects', priority: 'medium' },
    ],
  }),
};

function classifyEntity(entity: PlannedEntity, workflows: PlannedWorkflow[]): string {
  const name = entity.name.toLowerCase();
  const fieldNames = entity.fields.map(f => f.name.toLowerCase());
  const hasWorkflow = workflows.some(w => w.entity === entity.name);

  if (/^(task|todo|issue|ticket|bug|story|epic|subtask|item)$/i.test(name)) return 'task-like';
  if (/^(contact|person|customer|client|member|user|employee|staff|people|patient)$/i.test(name)) return 'contact-like';
  if (/^(deal|opportunity|lead|prospect|sale)$/i.test(name)) return 'deal-like';
  if (/^(product|item|sku|goods|merchandise|service|listing)$/i.test(name)) return 'product-like';
  if (/^(event|appointment|meeting|booking|reservation|schedule|session|class)$/i.test(name)) return 'event-like';
  if (/^(comment|note|reply|message|feedback|review)$/i.test(name)) return 'comment-like';
  if (/^(project|campaign|program|initiative|workspace)$/i.test(name)) return 'project-like';

  if (hasWorkflow && fieldNames.includes('status') && (fieldNames.includes('assigneeid') || fieldNames.includes('priority'))) return 'task-like';
  if (fieldNames.includes('email') && (fieldNames.includes('phone') || fieldNames.includes('firstname'))) return 'contact-like';
  if (fieldNames.includes('value') && fieldNames.includes('stage')) return 'deal-like';
  if (fieldNames.includes('price') && (fieldNames.includes('sku') || fieldNames.includes('quantity'))) return 'product-like';
  if (fieldNames.includes('startdate') && fieldNames.includes('enddate')) return 'event-like';
  if (fieldNames.includes('content') && (fieldNames.includes('authorid') || fieldNames.includes('parentid'))) return 'comment-like';
  if (fieldNames.includes('progress') && fieldNames.includes('status')) return 'project-like';

  return 'task-like';
}

function analyzeEntityFeatures(entity: PlannedEntity, workflows: PlannedWorkflow[]): EntityFeatureSpec {
  const classification = classifyEntity(entity, workflows);
  const ruleFn = ENTITY_FEATURE_RULES[classification];
  const derived = ruleFn ? ruleFn(entity, workflows) : {};

  return {
    entityName: entity.name,
    crudEnhancements: derived.crudEnhancements || [],
    interactiveFeatures: derived.interactiveFeatures || [],
    dataDisplayFeatures: derived.dataDisplayFeatures || [],
    automationFeatures: derived.automationFeatures || [],
  };
}

function determinePageLayout(page: PlannedPage, uiPatterns: UIPattern[]): PageFeatureSpec['layoutType'] {
  const pattern = uiPatterns.find(p => page.dataNeeded.includes(p.entityName));

  if (page.path === '/') return 'dashboard';
  if (pattern?.pattern === 'kanban') return 'kanban';
  if (pattern?.pattern === 'calendar') return 'calendar';
  if (pattern?.pattern === 'card-grid') return 'card-grid';
  if (page.path.includes(':id')) return 'list-detail';

  const features = page.features.map(f => f.toLowerCase());
  if (features.some(f => f.includes('kanban') || f.includes('board') || f.includes('drag-drop'))) return 'kanban';
  if (features.some(f => f.includes('calendar') || f.includes('schedule'))) return 'calendar';
  if (features.some(f => f.includes('card') || f.includes('grid'))) return 'card-grid';
  if (features.some(f => f.includes('timeline'))) return 'timeline';

  return 'table';
}

function getCustomActionsForEntity(plan: ProjectPlan, entityName: string): CustomAction[] {
  if (!plan.customActions || plan.customActions.length === 0) return [];
  return plan.customActions.filter(a => a.entity.toLowerCase() === entityName.toLowerCase());
}

function buildHeaderFeatures(page: PlannedPage, entityFeatures: EntityFeatureSpec | undefined, plan?: ProjectPlan): HeaderFeature[] {
  const headers: HeaderFeature[] = [];
  const features = page.features.map(f => f.toLowerCase());

  if (features.some(f => f.includes('search'))) {
    headers.push({ type: 'search-bar', config: { placeholder: `Search ${page.name.toLowerCase()}...` } });
  }

  const filterFeatures = features.filter(f => f.includes('filter'));
  if (filterFeatures.length > 0) {
    headers.push({
      type: 'filter-chips',
      config: { filters: filterFeatures.map(f => f.replace('-filter', '').replace('filter-by-', '')) },
    });
  }

  if (features.some(f => f.includes('sort'))) {
    headers.push({ type: 'sort-dropdown', config: {} });
  }

  const createFeature = features.find(f => f.includes('create') || f.includes('add'));
  if (createFeature) {
    const label = createFeature.replace('create-', 'New ').replace('add-', 'Add ');
    headers.push({ type: 'action-button', config: { label: label.charAt(0).toUpperCase() + label.slice(1), variant: 'primary' } });
  }

  if (page.path !== '/' && !page.path.includes(':id') && entityFeatures) {
    const hasKanban = entityFeatures.interactiveFeatures.some(f => f.type === 'drag-drop' || f.type === 'status-transition');
    if (hasKanban) {
      headers.push({ type: 'view-toggle', config: { views: ['table', 'board', 'card'] } });
    }
  }

  if (plan && page.dataNeeded[0]) {
    const entityActions = getCustomActionsForEntity(plan, page.dataNeeded[0]);
    for (const action of entityActions) {
      headers.push({
        type: 'action-button',
        config: {
          label: action.action,
          variant: 'secondary',
          endpoint: action.path,
          method: action.method,
          confirmation: action.confirmation || false,
          description: action.description,
          requiredRole: action.requiredRole,
          statusTransition: action.statusTransition,
          isCustomAction: true,
        },
      });
    }
  }

  return headers;
}

function buildContentFeatures(
  page: PlannedPage,
  layoutType: PageFeatureSpec['layoutType'],
  entityFeatures: EntityFeatureSpec | undefined,
  plan: ProjectPlan
): ContentFeature[] {
  const content: ContentFeature[] = [];

  switch (layoutType) {
    case 'dashboard': {
      if (plan.dashboardWidgets && plan.dashboardWidgets.length > 0) {
        const statWidgets = plan.dashboardWidgets.filter(w => w.type === 'stat-card');
        if (statWidgets.length > 0) {
          content.push({
            type: 'kpi-row',
            config: {
              kpis: statWidgets.map(w => ({
                title: w.title,
                entity: w.entity,
                metric: w.metric,
                aggregation: w.aggregation || 'count',
                size: w.size,
              })),
            },
          });
        } else {
          content.push({ type: 'kpi-row', config: { kpis: plan.kpis.slice(0, 4) } });
        }

        const chartWidgets = plan.dashboardWidgets.filter(w =>
          w.type === 'line-chart' || w.type === 'bar-chart' || w.type === 'pie-chart' ||
          w.type === 'donut-chart' || w.type === 'area-chart'
        );
        for (const cw of chartWidgets) {
          content.push({
            type: 'chart-section',
            config: {
              type: cw.type.replace('-chart', ''),
              entity: cw.entity,
              title: cw.title,
              metric: cw.metric,
              aggregation: cw.aggregation,
              groupBy: cw.groupBy,
              timeRange: cw.timeRange,
              size: cw.size,
            },
          });
        }

        const tableWidgets = plan.dashboardWidgets.filter(w => w.type === 'table');
        for (const tw of tableWidgets) {
          content.push({
            type: 'data-table',
            config: {
              entity: tw.entity,
              title: tw.title,
              metric: tw.metric,
              size: tw.size,
              pagination: false,
              sortable: true,
              selectable: false,
            },
          });
        }

        const feedWidgets = plan.dashboardWidgets.filter(w => w.type === 'activity-feed');
        if (feedWidgets.length > 0) {
          for (const fw of feedWidgets) {
            content.push({
              type: 'activity-feed',
              config: { limit: 10, entity: fw.entity, title: fw.title },
            });
          }
        } else {
          content.push({ type: 'activity-feed', config: { limit: 10 } });
        }

        const progressWidgets = plan.dashboardWidgets.filter(w => w.type === 'progress-bar');
        for (const pw of progressWidgets) {
          content.push({
            type: 'kpi-row',
            config: {
              kpis: [{
                title: pw.title,
                entity: pw.entity,
                metric: pw.metric,
                aggregation: pw.aggregation || 'count',
                size: pw.size,
                displayType: 'progress',
              }],
            },
          });
        }

        const calendarWidgets = plan.dashboardWidgets.filter(w => w.type === 'calendar-mini');
        for (const calW of calendarWidgets) {
          content.push({
            type: 'calendar-view',
            config: { entity: calW.entity, title: calW.title, mini: true },
          });
        }

        if (chartWidgets.length === 0 && plan.dataModel.length > 0) {
          content.push({ type: 'chart-section', config: { type: 'area', entity: plan.dataModel[0].name } });
        }
      } else {
        content.push({ type: 'kpi-row', config: { kpis: plan.kpis.slice(0, 4) } });
        if (plan.dataModel.length > 0) {
          content.push({ type: 'chart-section', config: { type: 'area', entity: plan.dataModel[0].name } });
        }
        content.push({ type: 'activity-feed', config: { limit: 10 } });
      }
      break;
    }
    case 'kanban': {
      const workflow = plan.workflows.find(w => page.dataNeeded.includes(w.entity));
      content.push({
        type: 'kanban-board',
        config: {
          columns: workflow?.states || ['todo', 'in-progress', 'done'],
          entity: page.dataNeeded[0],
          draggable: true,
        },
      });
      break;
    }
    case 'calendar': {
      content.push({
        type: 'calendar-view',
        config: { entity: page.dataNeeded[0], dateField: 'startDate' },
      });
      break;
    }
    case 'card-grid': {
      content.push({
        type: 'card-grid',
        config: { entity: page.dataNeeded[0], columns: 3 },
      });
      break;
    }
    case 'list-detail': {
      content.push({
        type: 'form',
        config: { entity: page.dataNeeded[0], mode: 'edit' },
      });
      if (entityFeatures?.interactiveFeatures.some(f => f.type === 'activity-timeline')) {
        content.push({ type: 'activity-feed', config: { entity: page.dataNeeded[0] } });
      }
      if (page.dataNeeded[0]) {
        const detailActions = getCustomActionsForEntity(plan, page.dataNeeded[0]);
        if (detailActions.length > 0) {
          content.push({
            type: 'form',
            config: {
              entity: page.dataNeeded[0],
              mode: 'custom-actions',
              customActions: detailActions.map(a => ({
                action: a.action,
                label: a.action,
                method: a.method,
                endpoint: a.path,
                confirmation: a.confirmation || false,
                description: a.description,
                requiredRole: a.requiredRole,
                statusTransition: a.statusTransition,
              })),
            },
          });
        }
      }
      break;
    }
    default: {
      const tableActions = page.dataNeeded[0]
        ? getCustomActionsForEntity(plan, page.dataNeeded[0])
        : [];
      content.push({
        type: 'data-table',
        config: {
          entity: page.dataNeeded[0],
          pagination: true,
          sortable: true,
          selectable: entityFeatures?.crudEnhancements.some(e => e.type === 'bulk-actions') || false,
          ...(tableActions.length > 0 ? {
            rowActions: tableActions.map(a => ({
              action: a.action,
              label: a.action,
              method: a.method,
              endpoint: a.path,
              confirmation: a.confirmation || false,
              description: a.description,
              requiredRole: a.requiredRole,
              statusTransition: a.statusTransition,
            })),
          } : {}),
        },
      });
      break;
    }
  }

  return content;
}

function buildSidebarFeatures(
  page: PlannedPage,
  layoutType: PageFeatureSpec['layoutType'],
  entityFeatures: EntityFeatureSpec | undefined
): SidebarFeature[] {
  const sidebar: SidebarFeature[] = [];

  if (layoutType === 'list-detail' && page.path.includes(':id')) {
    sidebar.push({ type: 'related-items', config: {} });
    if (entityFeatures?.interactiveFeatures.some(f => f.type === 'activity-timeline' || f.type === 'inline-comments')) {
      sidebar.push({ type: 'activity-log', config: {} });
    }
  }

  if (layoutType === 'table' || layoutType === 'card-grid') {
    const features = page.features.map(f => f.toLowerCase());
    if (features.filter(f => f.includes('filter')).length >= 2) {
      sidebar.push({ type: 'filter-panel', config: {} });
    }
  }

  return sidebar;
}

function getEmptyStateMessage(page: PlannedPage, plan: ProjectPlan): string {
  if (page.path === '/') return `Welcome to ${plan.projectName}! Start by adding some data.`;
  const entity = page.dataNeeded[0] || 'items';
  if (page.path.includes(':id')) return `This ${entity.toLowerCase()} could not be found.`;
  return `No ${entity.toLowerCase()}s yet. Click the button above to create your first one.`;
}

function analyzePageFeatures(
  page: PlannedPage,
  plan: ProjectPlan,
  reasoning: ReasoningResult,
  entityFeatureMap: Map<string, EntityFeatureSpec>
): PageFeatureSpec {
  const entityFeatures = page.dataNeeded[0] ? entityFeatureMap.get(page.dataNeeded[0]) : undefined;
  const layoutType = determinePageLayout(page, reasoning.uiPatterns);

  return {
    pageName: page.name,
    pagePath: page.path,
    layoutType,
    headerFeatures: buildHeaderFeatures(page, entityFeatures, plan),
    contentFeatures: buildContentFeatures(page, layoutType, entityFeatures, plan),
    sidebarFeatures: buildSidebarFeatures(page, layoutType, entityFeatures),
    emptyStateMessage: getEmptyStateMessage(page, plan),
    loadingPattern: layoutType === 'dashboard' ? 'skeleton' : 'shimmer',
    errorPattern: 'toast',
    refreshStrategy: layoutType === 'kanban' ? 'auto-refetch' : 'manual',
  };
}

function determineGlobalFeatures(plan: ProjectPlan): GlobalFeature[] {
  const features: GlobalFeature[] = [
    { name: 'Dark Mode Toggle', type: 'dark-mode-toggle', description: 'Switch between dark and light themes', priority: 'high' },
  ];

  if (plan.pages.length > 4) {
    features.push({ name: 'Breadcrumb Navigation', type: 'breadcrumbs', description: 'Navigation breadcrumbs for deep page hierarchies', priority: 'medium' });
  }

  if (plan.dataModel.length > 3) {
    features.push({ name: 'Global Search', type: 'global-search', description: 'Search across all entities', priority: 'medium' });
  }

  return features;
}

function determineRequiredComponents(
  entityFeatures: EntityFeatureSpec[],
  pageFeatures: PageFeatureSpec[]
): RequiredComponent[] {
  const components: RequiredComponent[] = [];
  const needed = new Set<string>();

  for (const ef of entityFeatures) {
    for (const f of ef.interactiveFeatures) {
      if (f.type === 'status-transition') needed.add('status-badge');
      if (f.type === 'assignee-picker') needed.add('avatar');
      if (f.type === 'multi-select-tags') needed.add('tag-input');
      if (f.type === 'activity-timeline') needed.add('activity-item');
      if (f.type === 'progress-tracker') needed.add('progress-ring');
    }
    for (const f of ef.dataDisplayFeatures) {
      if (f.type === 'progress-bar') needed.add('progress-bar');
      if (f.type === 'avatar-stack') needed.add('avatar');
      if (f.type === 'stat-card') needed.add('stat-card');
      if (f.type === 'charts') needed.add('chart-wrapper');
      if (f.type === 'count-badge') needed.add('count-badge');
    }
  }

  for (const pf of pageFeatures) {
    for (const h of pf.headerFeatures) {
      if (h.type === 'search-bar') needed.add('search-input');
      if (h.type === 'filter-chips') needed.add('filter-chip');
      if (h.type === 'view-toggle') needed.add('view-toggle');
    }
    if (pf.layoutType === 'kanban') needed.add('kanban-column');
    if (pf.loadingPattern === 'skeleton') needed.add('skeleton');
    if (pf.loadingPattern === 'shimmer') needed.add('shimmer-loader');
  }

  const componentDefs: Record<string, { path: string; type: 'ui' | 'feature'; description: string }> = {
    'status-badge': { path: 'src/components/ui/status-badge.tsx', type: 'ui', description: 'Colored status indicator badge' },
    'avatar': { path: 'src/components/ui/avatar.tsx', type: 'ui', description: 'User avatar with initials fallback' },
    'tag-input': { path: 'src/components/ui/tag-input.tsx', type: 'ui', description: 'Multi-select tag input' },
    'activity-item': { path: 'src/components/ui/activity-item.tsx', type: 'ui', description: 'Activity timeline item' },
    'progress-ring': { path: 'src/components/ui/progress-ring.tsx', type: 'ui', description: 'Circular progress indicator' },
    'progress-bar': { path: 'src/components/ui/progress-bar.tsx', type: 'ui', description: 'Linear progress bar' },
    'stat-card': { path: 'src/components/ui/stat-card.tsx', type: 'ui', description: 'Statistical summary card' },
    'chart-wrapper': { path: 'src/components/ui/chart-wrapper.tsx', type: 'ui', description: 'Recharts wrapper component' },
    'count-badge': { path: 'src/components/ui/count-badge.tsx', type: 'ui', description: 'Numeric count badge' },
    'search-input': { path: 'src/components/ui/search-input.tsx', type: 'ui', description: 'Search input with icon' },
    'filter-chip': { path: 'src/components/ui/filter-chip.tsx', type: 'ui', description: 'Filter chip toggle' },
    'view-toggle': { path: 'src/components/ui/view-toggle.tsx', type: 'ui', description: 'List/Board/Card view toggle' },
    'kanban-column': { path: 'src/components/feature/kanban-column.tsx', type: 'feature', description: 'Kanban board column' },
    'skeleton': { path: 'src/components/ui/skeleton.tsx', type: 'ui', description: 'Skeleton loading placeholder' },
    'shimmer-loader': { path: 'src/components/ui/shimmer-loader.tsx', type: 'ui', description: 'Shimmer loading effect' },
  };

  for (const name of Array.from(needed)) {
    const def = componentDefs[name];
    if (def) {
      components.push({ name, path: def.path, type: def.type, description: def.description });
    }
  }

  return components;
}

export function generateFunctionalitySpec(plan: ProjectPlan, reasoning: ReasoningResult): FunctionalitySpec {
  const entityFeatureMap = new Map<string, EntityFeatureSpec>();
  const entityFeatures: EntityFeatureSpec[] = [];

  for (const entity of plan.dataModel) {
    const spec = analyzeEntityFeatures(entity, plan.workflows);
    entityFeatures.push(spec);
    entityFeatureMap.set(entity.name, spec);
  }

  const pageFeatures: PageFeatureSpec[] = plan.pages.map(page =>
    analyzePageFeatures(page, plan, reasoning, entityFeatureMap)
  );

  const globalFeatures = determineGlobalFeatures(plan);
  const requiredComponents = determineRequiredComponents(entityFeatures, pageFeatures);

  return {
    entityFeatures,
    pageFeatures,
    globalFeatures,
    requiredComponents,
  };
}

export function getEntityFeatureSpec(spec: FunctionalitySpec, entityName: string): EntityFeatureSpec | undefined {
  return spec.entityFeatures.find(e => e.entityName === entityName);
}

export function getPageFeatureSpec(spec: FunctionalitySpec, pagePath: string): PageFeatureSpec | undefined {
  return spec.pageFeatures.find(p => p.pagePath === pagePath);
}

export function hasFeature(spec: FunctionalitySpec, entityName: string, featureType: InteractiveFeature['type']): boolean {
  const ef = spec.entityFeatures.find(e => e.entityName === entityName);
  return ef?.interactiveFeatures.some(f => f.type === featureType) || false;
}