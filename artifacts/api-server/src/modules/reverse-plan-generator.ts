import type { CodebaseAnalysis, ExtractedModel, ExtractedRoute, ExtractedComponent } from './codebase-analyzer.js';
import type { TechStackProfile } from './framework-detector.js';
import type {
  ProjectPlan, PlannedEntity, PlannedPage, PlannedEndpoint, PlannedModule,
  PlannedWorkflow, PlannedRole, PlannedIntegration, SecurityPlan, PerformancePlan,
  CustomAction
} from './plan-generator.js';

function toKebab(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/[\s_]+/g, '-').toLowerCase();
}

function toTitle(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
}

function toSnake(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1_$2').replace(/[\s-]+/g, '_').toLowerCase();
}

function mapFieldType(ormType: string): string {
  const typeMap: Record<string, string> = {
    serial: 'number', integer: 'number', int: 'number', bigint: 'number', smallint: 'number',
    float: 'number', real: 'number', numeric: 'number', decimal: 'number', double: 'number',
    text: 'string', varchar: 'string', char: 'string', string: 'string',
    boolean: 'boolean', bool: 'boolean',
    timestamp: 'date', datetime: 'date', date: 'date', time: 'string',
    json: 'json', jsonb: 'json', uuid: 'string', objectid: 'string',
    buffer: 'string', bytes: 'string', mixed: 'json', array: 'string[]',
    map: 'json', number: 'number',
  };
  return typeMap[ormType.toLowerCase()] || 'string';
}

function modelToEntity(model: ExtractedModel): PlannedEntity {
  const fields: { name: string; type: string; required: boolean; description?: string }[] = model.fields.map(f => ({
    name: f.name,
    type: mapFieldType(f.type),
    required: !f.nullable,
    description: f.isPrimary ? 'Primary key' : f.isForeignKey ? `References ${f.references || 'related entity'}` : undefined,
  }));

  if (fields.length === 0) {
    fields.push(
      { name: 'id', type: 'number', required: true, description: 'Primary key' },
      { name: 'name', type: 'string', required: true },
      { name: 'createdAt', type: 'date', required: false }
    );
  }

  if (!fields.some(f => f.name === 'id' || f.description === 'Primary key')) {
    fields.unshift({ name: 'id', type: 'number', required: true, description: 'Primary key' });
  }

  const relationships: { entity: string; type: string; field?: string }[] = [];
  for (const f of model.fields) {
    if (f.isForeignKey && f.references) {
      const targetEntity = f.references.charAt(0).toUpperCase() + f.references.slice(1).replace(/s$/, '');
      relationships.push({ entity: targetEntity, type: 'many-to-one', field: f.name });
    }
  }

  return {
    name: model.name,
    tableName: model.tableName || toSnake(model.name) + 's',
    fields,
    relationships,
  };
}

function routeToEndpoint(route: ExtractedRoute): PlannedEndpoint {
  const pathParts = route.path.split('/').filter(Boolean);
  const entityGuess = pathParts.find(p => !p.startsWith(':') && p !== 'api' && p !== 'v1' && p !== 'v2') || 'resource';
  const entityName = entityGuess.charAt(0).toUpperCase() + entityGuess.slice(1).replace(/s$/, '');

  let description = '';
  let responseType = '';
  switch (route.method) {
    case 'GET':
      if (route.path.includes(':id') || route.path.includes(':')) {
        description = `Get ${entityName} by ID`;
        responseType = entityName;
      } else {
        description = `List all ${entityName}s`;
        responseType = `${entityName}[]`;
      }
      break;
    case 'POST':
      description = `Create a new ${entityName}`;
      responseType = entityName;
      break;
    case 'PUT':
    case 'PATCH':
      description = `Update ${entityName}`;
      responseType = entityName;
      break;
    case 'DELETE':
      description = `Delete ${entityName}`;
      responseType = '{ success: boolean }';
      break;
    default:
      description = `${route.method} ${route.path}`;
      responseType = 'any';
  }

  return {
    method: route.method as PlannedEndpoint['method'],
    path: route.path,
    description,
    entity: entityName,
    responseType,
  };
}

function componentToPage(comp: ExtractedComponent, allModuleName: string): PlannedPage | null {
  const name = comp.name;
  if (/^(Button|Card|Modal|Dialog|Input|Header|Footer|Nav|Sidebar|Layout|Provider|Context|Loading|Spinner|Error|Icon|Badge|Avatar|Tooltip|Dropdown|Select|Checkbox|Radio|Switch|Tabs|Accordion)/i.test(name)) {
    return null;
  }

  const isPage = comp.filePath.includes('pages/') ||
    comp.filePath.includes('views/') ||
    comp.filePath.includes('app/') ||
    comp.routePath ||
    /Page$|View$|Screen$/i.test(name);

  if (!isPage && comp.childComponents.length < 2) return null;

  const routePath = comp.routePath || guessMountPath(comp.filePath, name);

  const features: string[] = [];
  if (comp.hooks.includes('useQuery') || comp.hooks.includes('useSWR')) features.push('data-fetching');
  if (comp.hooks.includes('useMutation')) features.push('data-mutation');
  if (comp.hooks.includes('useForm')) features.push('form');
  if (comp.childComponents.some(c => /Table|DataGrid|List/i.test(c))) features.push('data-table');
  if (comp.childComponents.some(c => /Chart|Graph|Pie|Line|Bar/i.test(c))) features.push('charts');
  if (comp.childComponents.some(c => /Modal|Dialog|Sheet/i.test(c))) features.push('modal');
  if (comp.childComponents.some(c => /Search|Filter/i.test(c))) features.push('search');
  if (comp.childComponents.some(c => /Pagination/i.test(c))) features.push('pagination');

  const dataNeeded: string[] = [];
  const entityGuess = name.replace(/(Page|View|Screen|List|Detail|Dashboard|Settings|Profile|Create|Edit|New|Add|Form)$/i, '');
  if (entityGuess && entityGuess !== name && entityGuess.length > 1) {
    dataNeeded.push(entityGuess);
  }

  return {
    name: toTitle(name.replace(/(Page|View|Screen)$/i, '')),
    path: routePath,
    module: allModuleName,
    componentName: name,
    description: `Page for ${toTitle(name.replace(/(Page|View|Screen)$/i, ''))}`,
    features,
    dataNeeded,
  };
}

function guessMountPath(filePath: string, componentName: string): string {
  const pathParts = filePath.split('/');
  const fileName = pathParts[pathParts.length - 1].replace(/\.(tsx|jsx|ts|js|vue|svelte)$/, '');

  if (fileName === 'index' || fileName === 'page') {
    const dir = pathParts[pathParts.length - 2] || '';
    return dir === 'pages' || dir === 'app' ? '/' : `/${toKebab(dir)}`;
  }

  if (pathParts.includes('pages') || pathParts.includes('views')) {
    const pagesIdx = pathParts.indexOf('pages') !== -1 ? pathParts.indexOf('pages') : pathParts.indexOf('views');
    const remainder = pathParts.slice(pagesIdx + 1).join('/').replace(/\.(tsx|jsx|ts|js|vue|svelte)$/, '').replace(/\[(\w+)\]/g, ':$1');
    return '/' + remainder;
  }

  return `/${toKebab(fileName)}`;
}

function inferPageType(name: string): string {
  if (/Dashboard/i.test(name)) return 'dashboard';
  if (/List|Index|All/i.test(name)) return 'list';
  if (/Detail|View|Show|Single/i.test(name)) return 'detail';
  if (/Create|New|Add|Edit|Update|Modify/i.test(name)) return 'form';
  if (/Setting/i.test(name)) return 'settings';
  if (/Login|Register|Signup|Auth/i.test(name)) return 'auth';
  if (/Landing|Home|Welcome/i.test(name)) return 'landing';
  if (/Report|Analytic/i.test(name)) return 'dashboard';
  if (/Kanban|Board/i.test(name)) return 'kanban';
  if (/Calendar|Schedule/i.test(name)) return 'calendar';
  return 'generic';
}

function inferRoles(analysis: CodebaseAnalysis): PlannedRole[] {
  const roles: PlannedRole[] = [];
  const roleEvidence = new Set<string>();

  for (const mw of analysis.middlewares) {
    if (mw.type === 'auth') roleEvidence.add('auth');
  }

  for (const [, node] of Array.from(analysis.graph.nodes.entries())) {
    for (const exp of node.exports) {
      const lower = exp.name.toLowerCase();
      if (lower.includes('admin')) roleEvidence.add('admin');
      if (lower.includes('manager')) roleEvidence.add('manager');
      if (lower.includes('moderator')) roleEvidence.add('moderator');
      if (lower.includes('editor')) roleEvidence.add('editor');
    }
  }

  if (roleEvidence.has('admin')) {
    roles.push({ name: 'Admin', permissions: ['all'], description: 'Full system access', canAccess: ['*'] });
  }
  if (roleEvidence.has('manager')) {
    roles.push({ name: 'Manager', permissions: ['manage-all', 'view-reports'], description: 'Management access', canAccess: ['*'] });
  }
  if (roleEvidence.has('moderator') || roleEvidence.has('editor')) {
    roles.push({ name: 'Editor', permissions: ['create', 'read', 'update'], description: 'Content editing access', canAccess: ['*'] });
  }

  if (roleEvidence.has('auth') && roles.length === 0) {
    roles.push(
      { name: 'Admin', permissions: ['all'], description: 'Full system access', canAccess: ['*'] },
      { name: 'User', permissions: ['view', 'create', 'edit-own'], description: 'Standard user access', canAccess: ['*'] }
    );
  }

  if (roles.length === 0) {
    roles.push({ name: 'User', permissions: ['all'], description: 'Default user role', canAccess: ['*'] });
  }

  return roles;
}

function inferWorkflows(entities: PlannedEntity[]): PlannedWorkflow[] {
  const workflows: PlannedWorkflow[] = [];

  for (const entity of entities) {
    const statusField = entity.fields.find(f =>
      f.name === 'status' || f.name === 'state' || f.name === 'phase'
    );

    if (statusField) {
      const states = ['pending', 'active', 'completed'];
      const transitions: { from: string; to: string; action: string }[] = [];
      for (let i = 0; i < states.length - 1; i++) {
        transitions.push({ from: states[i], to: states[i + 1], action: `Move to ${states[i + 1]}` });
      }
      workflows.push({ name: `${entity.name} Lifecycle`, entity: entity.name, states, transitions });
    }
  }

  return workflows;
}

function inferIntegrations(analysis: CodebaseAnalysis): PlannedIntegration[] {
  const integrations: PlannedIntegration[] = [];

  for (const lib of analysis.techStack.additional) {
    if (lib.name === 'Stripe') {
      integrations.push({
        type: 'payment', name: 'Stripe', reason: 'Stripe package detected in dependencies',
        packages: ['stripe', '@stripe/stripe-js'], envVariables: ['STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY'],
        apiRoutes: [{ method: 'POST', path: '/api/checkout', description: 'Create checkout session' }, { method: 'POST', path: '/api/webhooks/stripe', description: 'Handle Stripe webhooks' }],
        uiComponents: ['CheckoutForm', 'PricingTable'], setupNotes: 'Stripe integration detected from package dependencies',
      });
    }
    if (lib.name === 'Socket.IO') {
      integrations.push({
        type: 'realtime', name: 'Socket.IO', reason: 'Socket.IO package detected',
        packages: ['socket.io', 'socket.io-client'], envVariables: [], apiRoutes: [],
        uiComponents: ['LiveUpdates'], setupNotes: 'Real-time communication via Socket.IO',
      });
    }
  }

  if (analysis.techStack.auth) {
    integrations.push({
      type: 'auth-provider', name: analysis.techStack.auth.name, reason: `${analysis.techStack.auth.name} detected as authentication provider`,
      packages: [], envVariables: [],
      apiRoutes: [{ method: 'POST', path: '/api/auth/login', description: 'User login' }, { method: 'POST', path: '/api/auth/register', description: 'User registration' }],
      uiComponents: ['LoginForm', 'RegisterForm'], setupNotes: `Using ${analysis.techStack.auth.name} for authentication`,
    });
  }

  return integrations;
}

function inferSecurityPlan(analysis: CodebaseAnalysis, entities: PlannedEntity[], roles: PlannedRole[]): SecurityPlan {
  let authStrategy: SecurityPlan['authStrategy'] = 'none';
  if (analysis.techStack.auth) {
    const authName = analysis.techStack.auth.name.toLowerCase();
    if (authName.includes('jwt') || authName.includes('jose')) authStrategy = 'jwt';
    else if (authName.includes('oauth') || authName.includes('auth0') || authName.includes('clerk') || authName.includes('nextauth')) authStrategy = 'oauth';
    else authStrategy = 'session';
  } else if (analysis.middlewares.some(m => m.type === 'auth')) {
    authStrategy = 'session';
  }

  const roleHierarchy = roles.map((r, i) => ({
    role: r.name, level: roles.length - i, inheritsFrom: i < roles.length - 1 ? roles[i + 1].name : undefined,
  }));

  const entityPermissions: SecurityPlan['entityPermissions'] = [];
  for (const entity of entities) {
    for (const role of roles) {
      const actions: ('create' | 'read' | 'update' | 'delete')[] = role.permissions.includes('all')
        ? ['create', 'read', 'update', 'delete'] : ['read'];
      entityPermissions.push({ entity: entity.name, role: role.name, actions });
    }
  }

  const rateLimiting: SecurityPlan['rateLimiting'] = analysis.middlewares.some(m => m.type === 'rate-limit')
    ? [{ category: 'auth', maxRequests: 5, windowSeconds: 60 }, { category: 'write', maxRequests: 30, windowSeconds: 60 }, { category: 'read', maxRequests: 100, windowSeconds: 60 }]
    : [];

  return {
    authStrategy, roleHierarchy, entityPermissions, fieldVisibility: [], dataIsolation: [],
    validationRules: [], rateLimiting, auditLog: { entities: [], operations: [] },
  };
}

function inferPerformancePlan(analysis: CodebaseAnalysis, entities: PlannedEntity[]): PerformancePlan {
  const pagination: PerformancePlan['pagination'] = [];
  const indexRecommendations: PerformancePlan['indexRecommendations'] = [];

  for (const entity of entities) {
    const hasMany = /order|log|message|transaction|event|activity|notification|comment|history|audit|entry/i.test(entity.name);
    pagination.push({ entity: entity.name, strategy: hasMany ? 'cursor' : 'offset', pageSize: hasMany ? 50 : 25, reason: hasMany ? 'High-volume entity benefits from cursor pagination' : 'Standard offset pagination' });

    const searchFields = entity.fields.filter(f => f.type === 'string' && f.name !== 'id' && f.name !== 'password');
    if (searchFields.length > 0) {
      indexRecommendations.push({ entity: entity.name, fields: searchFields.slice(0, 3).map(f => f.name), type: 'btree', reason: 'Text search fields need indexing' });
    }

    const statusField = entity.fields.find(f => f.name === 'status' || f.name === 'state');
    if (statusField) {
      indexRecommendations.push({ entity: entity.name, fields: [statusField.name], type: 'btree', reason: 'Status field used for filtering' });
    }
  }

  const lazyLoadTargets: PerformancePlan['lazyLoadTargets'] = [];
  for (const comp of analysis.components) {
    if (comp.childComponents.some(cc => /Chart|Graph|Map|Editor|Preview/i.test(cc))) {
      lazyLoadTargets.push({ component: comp.name, reason: 'Heavy component with charts/maps should be lazy loaded' });
    }
  }

  return {
    pagination,
    caching: [{ endpoint: '/api/*/list', ttlSeconds: 30, invalidateOn: ['create', 'update', 'delete'] }, { endpoint: '/api/*/detail', ttlSeconds: 60, invalidateOn: ['update', 'delete'] }],
    lazyLoadTargets, virtualScroll: [], indexRecommendations, prefetch: [], imageOptimization: [],
  };
}

function inferCustomActions(routes: ExtractedRoute[], entities: PlannedEntity[]): CustomAction[] {
  const actions: CustomAction[] = [];
  const crudPaths = new Set<string>();

  for (const entity of entities) {
    const base = `/api/${toKebab(entity.name)}s`;
    crudPaths.add(`GET ${base}`);
    crudPaths.add(`POST ${base}`);
    crudPaths.add(`GET ${base}/:id`);
    crudPaths.add(`PUT ${base}/:id`);
    crudPaths.add(`PATCH ${base}/:id`);
    crudPaths.add(`DELETE ${base}/:id`);
  }

  for (const route of routes) {
    const key = `${route.method} ${route.path}`;
    if (crudPaths.has(key)) continue;
    if (route.method !== 'POST' && route.method !== 'PATCH') continue;

    const entityMatch = route.path.match(/\/api\/(\w+?)s?\//);
    if (!entityMatch) continue;

    const entityName = entityMatch[1].charAt(0).toUpperCase() + entityMatch[1].slice(1);
    const actionPart = route.path.split('/').pop() || '';
    if (/^:/.test(actionPart)) continue;

    actions.push({
      entity: entityName,
      action: actionPart || route.path,
      method: route.method as 'POST' | 'PATCH',
      path: route.path,
      description: `Custom action: ${route.method} ${route.path}`,
      statusTransition: undefined,
    });
  }

  return actions;
}

function buildTechStack(profile: TechStackProfile): { category: string; technology: string; justification: string }[] {
  const stack: { category: string; technology: string; justification: string }[] = [];
  const add = (cat: string, fw: { name: string; version?: string; evidence: string[] } | null) => {
    if (fw) stack.push({ category: cat, technology: fw.name + (fw.version ? ` v${fw.version}` : ''), justification: fw.evidence[0] || 'Detected from codebase' });
  };
  add('Language', profile.language);
  add('Frontend', profile.frontend);
  add('Backend', profile.backend);
  add('Database', profile.orm);
  add('Styling', profile.css);
  add('Build', profile.buildTool);
  add('State', profile.stateManagement);
  add('Auth', profile.auth);
  for (const lib of profile.additional) {
    stack.push({ category: lib.category || 'Library', technology: lib.name, justification: lib.evidence[0] || 'Detected' });
  }
  return stack;
}

function buildModules(entities: PlannedEntity[], pages: PlannedPage[]): PlannedModule[] {
  const modules: PlannedModule[] = [];

  const dashPages = pages.filter(p => {
    const pt = inferPageType(p.componentName);
    return pt === 'dashboard' || pt === 'landing';
  });
  if (dashPages.length > 0) {
    modules.push({ name: 'Dashboard', description: 'Main dashboard and overview', entities: [], pageCount: dashPages.length, features: ['kpi-cards', 'recent-activity'] });
  }

  for (const entity of entities) {
    const relatedPages = pages.filter(p => (p.dataNeeded || []).includes(entity.name));
    modules.push({ name: `${entity.name} Management`, description: `Manage ${entity.name} records`, entities: [entity.name], pageCount: Math.max(relatedPages.length, 2), features: ['search', 'filter', 'sort', 'create', 'edit', 'delete'] });
  }

  const authPages = pages.filter(p => inferPageType(p.componentName) === 'auth');
  if (authPages.length > 0) {
    modules.push({ name: 'Authentication', description: 'User authentication', entities: [], pageCount: authPages.length, features: ['login', 'register'] });
  }

  const settingsPages = pages.filter(p => inferPageType(p.componentName) === 'settings');
  if (settingsPages.length > 0) {
    modules.push({ name: 'Settings', description: 'Application settings', entities: [], pageCount: settingsPages.length, features: ['profile', 'preferences'] });
  }

  if (modules.length === 0) {
    modules.push({ name: 'Core', description: 'Core application functionality', entities: entities.map(e => e.name), pageCount: pages.length, features: ['crud'] });
  }

  return modules;
}

function estimateComplexity(analysis: CodebaseAnalysis): string {
  const score = analysis.stats.totalFiles + analysis.stats.modelCount * 5 + analysis.stats.routeCount * 2 + analysis.stats.componentCount * 2;
  if (score > 200) return 'enterprise';
  if (score > 100) return 'complex';
  if (score > 40) return 'moderate';
  if (score > 15) return 'simple';
  return 'trivial';
}

export function generatePlanFromCodebase(analysis: CodebaseAnalysis): ProjectPlan {
  const entities = analysis.models.map(m => modelToEntity(m));
  const endpoints = analysis.routes.map(r => routeToEndpoint(r));

  const defaultModuleName = 'Core';
  const pages: PlannedPage[] = [];
  for (const comp of analysis.components) {
    const page = componentToPage(comp, defaultModuleName);
    if (page) pages.push(page);
  }

  if (pages.length === 0 && entities.length > 0) {
    pages.push({
      name: 'Dashboard', path: '/', module: 'Dashboard', componentName: 'Dashboard',
      description: 'Main dashboard with overview metrics', features: ['kpi-cards', 'recent-activity'],
      dataNeeded: entities.slice(0, 3).map(e => e.name),
    });

    for (const entity of entities) {
      pages.push({
        name: `${entity.name} List`, path: `/${toKebab(entity.name)}s`, module: `${entity.name} Management`,
        componentName: `${entity.name}List`, description: `Browse and manage ${entity.name} records`,
        features: ['search', 'filter', 'sort', 'create'], dataNeeded: [entity.name],
      });
      pages.push({
        name: `${entity.name} Detail`, path: `/${toKebab(entity.name)}s/:id`, module: `${entity.name} Management`,
        componentName: `${entity.name}Detail`, description: `View and edit ${entity.name} details`,
        features: ['edit', 'delete'], dataNeeded: [entity.name],
      });
    }
  }

  const roles = inferRoles(analysis);
  const workflows = inferWorkflows(entities);
  const integrations = inferIntegrations(analysis);
  const securityPlan = inferSecurityPlan(analysis, entities, roles);
  const performancePlan = inferPerformancePlan(analysis, entities);
  const customActions = inferCustomActions(analysis.routes, entities);
  const techStack = buildTechStack(analysis.techStack);
  const modules = buildModules(entities, pages);

  return {
    projectName: 'Imported Project',
    overview: `Reverse-engineered plan from ${analysis.stats.totalFiles} files: ${entities.length} data models, ${pages.length} pages, ${endpoints.length} API endpoints. ${analysis.techStack.summary}`,
    techStack,
    modules,
    dataModel: entities,
    pages,
    apiEndpoints: endpoints,
    workflows,
    roles,
    fileBlueprint: [],
    kpis: entities.map(e => `Total ${e.name}s`),
    estimatedComplexity: estimateComplexity(analysis),
    integrations: integrations.length > 0 ? integrations : undefined,
    securityPlan,
    performancePlan,
    customActions: customActions.length > 0 ? customActions : undefined,
  };
}

export function formatReversePlanSummary(plan: ProjectPlan, analysis: CodebaseAnalysis): string {
  const sections: string[] = [];

  sections.push(`# Codebase Understanding Report\n`);
  sections.push(`I've analyzed your codebase and here's what I found:\n`);

  sections.push(`## Overview`);
  sections.push(`- **${analysis.stats.totalFiles} files** across **${Object.keys(analysis.stats.filesByLanguage).length} languages**`);
  sections.push(`- **${analysis.stats.totalLines.toLocaleString()} lines** of code`);
  sections.push(`- **Complexity**: ${plan.estimatedComplexity}`);
  sections.push(`- **Stack**: ${analysis.techStack.summary}\n`);

  if (plan.dataModel.length > 0) {
    sections.push(`## Data Models (${plan.dataModel.length})`);
    for (const entity of plan.dataModel) {
      const fieldList = entity.fields.slice(0, 6).map(f => f.name).join(', ');
      const more = entity.fields.length > 6 ? ` +${entity.fields.length - 6} more` : '';
      sections.push(`- **${entity.name}**: ${fieldList}${more}`);
      if (entity.relationships && entity.relationships.length > 0) {
        for (const rel of entity.relationships) {
          sections.push(`  → ${rel.type} relationship with ${rel.entity}`);
        }
      }
    }
    sections.push('');
  }

  if (plan.pages.length > 0) {
    sections.push(`## Pages (${plan.pages.length})`);
    for (const page of plan.pages) {
      sections.push(`- **${page.name}** (\`${page.path}\`)${page.features.length > 0 ? ' — ' + page.features.join(', ') : ''}`);
    }
    sections.push('');
  }

  if (plan.apiEndpoints.length > 0) {
    sections.push(`## API Endpoints (${plan.apiEndpoints.length})`);
    for (const ep of plan.apiEndpoints.slice(0, 20)) {
      sections.push(`- \`${ep.method} ${ep.path}\` — ${ep.description}`);
    }
    if (plan.apiEndpoints.length > 20) sections.push(`- ...and ${plan.apiEndpoints.length - 20} more`);
    sections.push('');
  }

  if (plan.workflows && plan.workflows.length > 0) {
    sections.push(`## Workflows (${plan.workflows.length})`);
    for (const wf of plan.workflows) {
      sections.push(`- **${wf.name}**: ${wf.states.join(' → ')}`);
    }
    sections.push('');
  }

  if (plan.integrations && plan.integrations.length > 0) {
    sections.push(`## Detected Integrations`);
    for (const int of plan.integrations) {
      sections.push(`- **${int.name}** (${int.type}) — ${int.reason}`);
    }
    sections.push('');
  }

  if (plan.securityPlan && plan.securityPlan.authStrategy !== 'none') {
    sections.push(`## Security`);
    sections.push(`- **Auth**: ${plan.securityPlan.authStrategy}`);
    sections.push(`- **Roles**: ${plan.roles.map(r => r.name).join(', ')}`);
    sections.push('');
  }

  sections.push(`---\nI now have a complete understanding of your codebase. I can:\n- **Add features** — "add a search bar to the users page"\n- **Edit code** — "change the header color to blue"\n- **Add fields** — "add an email field to the customer table"\n- **Fix issues** — "fix the broken import in app.tsx"\n- **Explain code** — "how does the authentication work?"\n\nWhat would you like to change?`);

  return sections.join('\n');
}