import { detectDomainFromText, getDomain, getAllDomains, type IndustryDomain } from './domain-knowledge.js';
import { analyzeRequest, type UnderstandingResult } from './deep-understanding-engine.js';

export interface PromptGenOptions {
  scale?: 'small' | 'medium' | 'large';
  includeAuth?: boolean;
  includeAnalytics?: boolean;
  style?: 'minimal' | 'detailed';
}

export interface PromptEnhancerResult {
  prompt: string;
  additions: string[];
  domain?: string;
  entityCount: number;
  featureCount: number;
}

const ENTITY_KEYWORDS: Record<string, string[]> = {
  'users': ['user', 'users', 'account', 'accounts', 'login', 'auth', 'sign up', 'register'],
  'employees': ['employee', 'employees', 'staff', 'team', 'worker', 'workforce', 'personnel'],
  'customers': ['customer', 'customers', 'client', 'clients', 'buyer', 'buyers'],
  'products': ['product', 'products', 'item', 'items', 'catalog', 'catalogue', 'goods', 'merchandise'],
  'orders': ['order', 'orders', 'purchase', 'purchases', 'transaction', 'transactions', 'sale', 'sales'],
  'invoices': ['invoice', 'invoices', 'bill', 'bills', 'billing', 'payment', 'payments'],
  'projects': ['project', 'projects', 'engagement'],
  'tasks': ['task', 'tasks', 'todo', 'todos', 'ticket', 'tickets', 'issue', 'issues'],
  'inventory': ['inventory', 'stock', 'stocks', 'warehouse', 'supply', 'supplies'],
  'appointments': ['appointment', 'appointments', 'booking', 'bookings', 'reservation', 'reservations', 'schedule'],
  'reports': ['report', 'reports', 'analytics', 'dashboard', 'metrics', 'kpi', 'kpis', 'insights'],
  'timesheets': ['timesheet', 'timesheets', 'time tracking', 'hours', 'utilization', 'billable'],
  'departments': ['department', 'departments', 'team', 'teams', 'division', 'divisions', 'org chart'],
  'leave': ['leave', 'vacation', 'pto', 'time off', 'absence', 'absences', 'sick leave'],
  'payroll': ['payroll', 'salary', 'salaries', 'compensation', 'pay', 'wages'],
  'contracts': ['contract', 'contracts', 'agreement', 'agreements', 'sla', 'sow'],
  'shipments': ['shipment', 'shipments', 'delivery', 'deliveries', 'shipping', 'freight', 'tracking'],
  'vehicles': ['vehicle', 'vehicles', 'fleet', 'truck', 'trucks', 'car', 'cars', 'van', 'vans'],
  'properties': ['property', 'properties', 'listing', 'listings', 'unit', 'units', 'apartment', 'apartments'],
  'tenants': ['tenant', 'tenants', 'renter', 'renters', 'lessee'],
  'patients': ['patient', 'patients', 'medical', 'health', 'clinical'],
  'courses': ['course', 'courses', 'class', 'classes', 'curriculum', 'lesson', 'lessons'],
  'students': ['student', 'students', 'learner', 'learners', 'pupil', 'pupils', 'enrollment'],
  'contacts': ['contact', 'contacts', 'lead', 'leads', 'prospect', 'prospects'],
  'deals': ['deal', 'deals', 'opportunity', 'opportunities', 'pipeline', 'funnel'],
  'members': ['member', 'members', 'membership', 'memberships', 'subscriber', 'subscribers'],
  'recipes': ['recipe', 'recipes', 'ingredient', 'ingredients', 'cooking', 'cuisine'],
  'menu': ['menu', 'dish', 'dishes', 'food', 'meal', 'meals'],
  'budget': ['budget', 'budgets', 'expense', 'expenses', 'financial', 'forecast'],
};

const FEATURE_KEYWORDS: Record<string, string[]> = {
  'search': ['search', 'find', 'look up', 'filter', 'browse'],
  'export': ['export', 'download', 'csv', 'pdf', 'excel', 'report'],
  'notification': ['notification', 'notify', 'alert', 'remind', 'reminder', 'email'],
  'role-based': ['role', 'roles', 'permission', 'permissions', 'access control', 'admin', 'manager'],
  'realtime': ['real-time', 'realtime', 'real time', 'live', 'instant', 'push', 'websocket'],
  'charts': ['chart', 'charts', 'graph', 'graphs', 'visualization', 'analytics', 'dashboard'],
  'mobile': ['mobile', 'responsive', 'phone', 'tablet'],
  'import': ['import', 'upload', 'csv', 'bulk', 'batch'],
  'calendar': ['calendar', 'schedule', 'date picker', 'event', 'booking'],
  'kanban': ['kanban', 'board', 'drag and drop', 'columns', 'cards'],
  'multi-language': ['multi-language', 'multilingual', 'i18n', 'internationalization', 'localization', 'translate'],
  'api': ['api', 'rest', 'endpoint', 'integration', 'webhook', 'connect'],
};

const WORKFLOW_INDICATORS: Record<string, string[]> = {
  'approval': ['approval', 'approve', 'reject', 'pending', 'submitted', 'review', 'sign off', 'authorize'],
  'status-tracking': ['status', 'track', 'tracking', 'progress', 'lifecycle', 'pipeline', 'stage', 'phase', 'workflow'],
  'order-fulfillment': ['fulfillment', 'fulfill', 'ship', 'deliver', 'dispatch', 'receive'],
  'scheduling': ['schedule', 'scheduling', 'booking', 'calendar', 'availability', 'slot', 'appointment'],
  'billing': ['billing', 'invoice', 'charge', 'payment', 'pay', 'due', 'overdue'],
};

const TOPIC_TEMPLATES: Record<string, { appName: string; intro: string; actors: string[]; coreActions: string[]; entities: string[]; features: string[] }> = {
  'pet adoption': {
    appName: 'pet adoption management platform',
    intro: 'where shelters can list available pets with photos, descriptions, breed, age, and health status',
    actors: ['shelter administrators', 'staff members', 'adopters'],
    coreActions: [
      'Potential adopters can browse pets, search by breed or location, and submit adoption applications',
      'Include an application review workflow where shelter staff can approve, reject, or request more information',
    ],
    entities: ['pets', 'adopters', 'applications', 'shelters'],
    features: ['search', 'filtering', 'status tracking', 'email notifications', 'photo uploads'],
  },
  'restaurant ordering': {
    appName: 'restaurant ordering and management system',
    intro: 'where restaurants can manage their menus, accept orders, and track deliveries',
    actors: ['restaurant owners', 'kitchen staff', 'delivery drivers', 'customers'],
    coreActions: [
      'Customers can browse the menu, customize orders, and place them for dine-in, takeout, or delivery',
      'Kitchen staff receive real-time order notifications and can update order status as items are prepared',
      'Include order tracking so customers can see the progress of their orders from preparation to delivery',
    ],
    entities: ['restaurants', 'menu items', 'orders', 'customers', 'delivery drivers'],
    features: ['search', 'filtering', 'real-time order tracking', 'payment processing', 'order history'],
  },
  'fitness tracker': {
    appName: 'fitness tracking and wellness platform',
    intro: 'where users can log workouts, track progress, and set fitness goals',
    actors: ['members', 'personal trainers', 'administrators'],
    coreActions: [
      'Members can log daily workouts with exercises, sets, reps, and duration',
      'Trainers can create and assign workout plans to their clients with scheduled routines',
      'Track body measurements, weight, and progress photos over time with visual charts',
    ],
    entities: ['members', 'workouts', 'exercises', 'workout plans', 'progress logs', 'goals'],
    features: ['search', 'progress charts', 'goal tracking', 'workout calendar', 'notifications'],
  },

  // ── Cybersecurity ──────────────────────────────────────────────────────────
  'vapt': {
    appName: 'vulnerability assessment and penetration testing (VAPT) platform',
    intro: 'for security teams to plan, execute, and document penetration tests and vulnerability assessments',
    actors: ['security administrators', 'penetration testers', 'auditors', 'clients'],
    coreActions: [
      'Security teams create assessment projects with defined scope — target assets, IP ranges, and domains — and assign testers with deadlines',
      'Testers log findings with severity ratings (Critical, High, Medium, Low, Informational), CVE references, proof-of-concept steps, affected assets, and remediation recommendations',
      'Generate professional assessment reports with executive summaries, risk scoring, vulnerability breakdowns, and compliance status (OWASP, PCI-DSS, ISO 27001)',
      'Track remediation progress: clients mark findings as fixed, testers re-test and close them, with full audit trail',
    ],
    entities: ['assessments', 'assets', 'vulnerabilities', 'findings', 'reports', 'remediation tasks'],
    features: ['severity scoring (CVSS)', 'CVE tracking', 'PDF report generation', 'remediation workflow', 'risk dashboard', 'team assignment'],
  },
  'penetration test': {
    appName: 'penetration testing management platform',
    intro: 'for security professionals to manage pentest engagements from scoping to final report',
    actors: ['pentesters', 'project managers', 'clients', 'administrators'],
    coreActions: [
      'Create engagement projects with scope definition, target IP ranges, rules of engagement, and test methodology (black-box, grey-box, white-box)',
      'Document vulnerabilities found during testing with severity (CVSS score), exploitation steps, impact analysis, and remediation guidance',
      'Track engagement progress through phases: reconnaissance, scanning, exploitation, post-exploitation, and reporting',
    ],
    entities: ['engagements', 'targets', 'vulnerabilities', 'findings', 'reports', 'evidence'],
    features: ['CVSS scoring', 'finding templates', 'report generation', 'status tracking', 'evidence upload', 'client portal'],
  },
  'security scanner': {
    appName: 'security vulnerability scanner and management platform',
    intro: 'for continuously scanning infrastructure and applications for security vulnerabilities',
    actors: ['security engineers', 'DevSecOps teams', 'compliance officers'],
    coreActions: [
      'Schedule and run automated scans against hosts, web applications, APIs, and cloud resources',
      'Aggregate vulnerability findings from multiple scan sources, deduplicate results, and prioritize by risk score',
      'Track patch status and remediation assignments, with SLA tracking and escalation alerts for overdue critical vulnerabilities',
    ],
    entities: ['scans', 'targets', 'vulnerabilities', 'findings', 'patches', 'scan schedules'],
    features: ['automated scanning', 'risk prioritization', 'SLA tracking', 'integration with ticketing', 'trend charts', 'compliance reporting'],
  },
  'bug tracker': {
    appName: 'bug and issue tracking platform',
    intro: 'for development teams to report, prioritize, and resolve software defects',
    actors: ['developers', 'QA engineers', 'project managers', 'stakeholders'],
    coreActions: [
      'QA and developers report bugs with title, description, steps to reproduce, severity, affected version, and screenshots',
      'Project managers triage incoming bugs — assign priority, set target fix version, and assign to developers',
      'Track bug lifecycle from New → In Progress → In Review → Fixed → Verified → Closed with time-to-resolve metrics',
    ],
    entities: ['bugs', 'projects', 'milestones', 'comments', 'attachments', 'users'],
    features: ['filtering by severity and status', 'label tagging', 'activity feed', 'email notifications', 'sprint boards', 'burndown charts'],
  },
  'issue tracker': {
    appName: 'issue and ticket tracking system',
    intro: 'for teams to manage issues, tasks, and work items across projects',
    actors: ['team members', 'project managers', 'reporters', 'administrators'],
    coreActions: [
      'Create and assign issues with type (bug, feature, task), priority, due date, and component area',
      'Manage work in sprints or kanban boards with drag-and-drop status updates',
      'Link related issues, track blockers, and see time estimates vs. actuals',
    ],
    entities: ['issues', 'projects', 'sprints', 'labels', 'comments', 'users'],
    features: ['kanban board', 'sprint planning', 'priority filtering', 'activity log', 'time tracking', 'notifications'],
  },

  // ── DevOps / Infrastructure ────────────────────────────────────────────────
  'ci/cd': {
    appName: 'CI/CD pipeline management dashboard',
    intro: 'for engineering teams to monitor builds, deployments, and pipeline health across all services',
    actors: ['developers', 'DevOps engineers', 'release managers'],
    coreActions: [
      'View real-time status of all pipeline runs — builds, tests, and deployments — across repositories and environments',
      'Configure pipeline triggers, environment variables, and deployment approvals with role-based gating',
      'Drill into failed pipeline stages to see logs, error messages, and flaky test history',
    ],
    entities: ['pipelines', 'runs', 'stages', 'deployments', 'environments', 'repositories'],
    features: ['build status monitoring', 'deployment approvals', 'log viewer', 'failure analytics', 'notifications', 'environment promotion'],
  },
  'monitoring': {
    appName: 'infrastructure and application monitoring platform',
    intro: 'for operations teams to observe system health, track metrics, and respond to alerts',
    actors: ['site reliability engineers', 'DevOps teams', 'on-call responders'],
    coreActions: [
      'Collect and visualize metrics (CPU, memory, latency, error rates) from hosts, containers, and services with real-time dashboards',
      'Set alert thresholds and notification rules — trigger PagerDuty, Slack, or email when metrics breach SLOs',
      'Create and manage on-call schedules, track incidents from detection through postmortem, and record action items',
    ],
    entities: ['services', 'hosts', 'alerts', 'incidents', 'dashboards', 'on-call schedules'],
    features: ['real-time dashboards', 'threshold alerting', 'incident management', 'on-call scheduling', 'SLO tracking', 'anomaly detection'],
  },
  'devops': {
    appName: 'DevOps operations and deployment management platform',
    intro: 'for engineering teams to manage infrastructure, deployments, and operational workflows',
    actors: ['developers', 'DevOps engineers', 'system administrators'],
    coreActions: [
      'Manage infrastructure resources — servers, containers, databases — with provisioning and decommissioning workflows',
      'Track deployments across environments (dev, staging, production) with rollback capability and change logs',
      'Monitor service health with automated alerts and incident response runbooks',
    ],
    entities: ['services', 'deployments', 'environments', 'incidents', 'change requests', 'runbooks'],
    features: ['deployment tracking', 'environment management', 'incident management', 'change approval', 'audit log', 'notifications'],
  },

  // ── Content / CMS ──────────────────────────────────────────────────────────
  'cms': {
    appName: 'content management system',
    intro: 'for content teams to create, edit, schedule, and publish content across channels',
    actors: ['content editors', 'authors', 'administrators', 'reviewers'],
    coreActions: [
      'Authors create and edit content using a rich text editor with media uploads, SEO metadata, and custom fields',
      'Content goes through a review and approval workflow before being scheduled and published',
      'Manage content taxonomy — categories, tags, and collections — with version history and rollback',
    ],
    entities: ['posts', 'pages', 'media', 'categories', 'tags', 'authors'],
    features: ['rich text editor', 'media library', 'SEO fields', 'publish scheduling', 'version history', 'content workflow'],
  },
  'knowledge base': {
    appName: 'knowledge base and documentation platform',
    intro: 'for teams to write, organize, and search internal documentation and how-to guides',
    actors: ['authors', 'editors', 'readers', 'administrators'],
    coreActions: [
      'Authors write articles with rich text, code blocks, images, and embedded videos organized into collections and categories',
      'Full-text search across all articles with relevance ranking, tag filtering, and version diffs',
      'Track article feedback, view counts, and helpfulness ratings to surface outdated or underperforming docs',
    ],
    entities: ['articles', 'collections', 'categories', 'comments', 'authors', 'revisions'],
    features: ['full-text search', 'table of contents', 'version history', 'feedback rating', 'public/private visibility', 'notifications'],
  },

  // ── Finance / Business ─────────────────────────────────────────────────────
  'expense': {
    appName: 'expense management and reimbursement platform',
    intro: 'for employees to submit expenses and for finance teams to review and process reimbursements',
    actors: ['employees', 'managers', 'finance team', 'administrators'],
    coreActions: [
      'Employees submit expense reports with receipts, category, amount, currency, and business justification',
      'Managers review and approve or reject expense reports with comments; multi-level approval for large amounts',
      'Finance team processes approved expenses for reimbursement and tracks budget utilization by department and category',
    ],
    entities: ['expense reports', 'expenses', 'receipts', 'approvals', 'budgets', 'employees'],
    features: ['receipt upload', 'multi-currency', 'approval workflow', 'budget tracking', 'export to CSV/PDF', 'policy enforcement'],
  },
  'erp': {
    appName: 'enterprise resource planning (ERP) platform',
    intro: 'for businesses to manage core operations including finance, inventory, procurement, and HR in one system',
    actors: ['finance managers', 'inventory managers', 'HR staff', 'executives', 'administrators'],
    coreActions: [
      'Manage the complete procure-to-pay cycle: purchase requisitions, vendor quotes, purchase orders, goods receipt, and invoice matching',
      'Track inventory levels, stock movements, and warehouse operations with automatic reorder point alerts',
      'Handle HR operations including employee records, payroll, leave management, and performance reviews',
    ],
    entities: ['vendors', 'purchase orders', 'inventory items', 'employees', 'invoices', 'departments'],
    features: ['procurement workflow', 'inventory tracking', 'financial reporting', 'HR management', 'audit trail', 'dashboard KPIs'],
  },

  // ── Support / Service ──────────────────────────────────────────────────────
  'helpdesk': {
    appName: 'helpdesk and customer support platform',
    intro: 'for support teams to manage customer requests, track SLAs, and resolve tickets efficiently',
    actors: ['support agents', 'team leads', 'customers', 'administrators'],
    coreActions: [
      'Customers submit support tickets via portal or email; agents are auto-assigned based on category and workload',
      'Agents respond to tickets, escalate to specialists, and track resolution time against SLA targets',
      'Build a self-service knowledge base so customers can find answers to common questions without submitting tickets',
    ],
    entities: ['tickets', 'customers', 'agents', 'categories', 'SLAs', 'knowledge articles'],
    features: ['ticket assignment', 'SLA tracking', 'canned responses', 'escalation rules', 'satisfaction ratings', 'knowledge base'],
  },
  'lms': {
    appName: 'learning management system (LMS)',
    intro: 'for organizations to create, deliver, and track online training and courses',
    actors: ['instructors', 'learners', 'administrators', 'managers'],
    coreActions: [
      'Instructors create courses with video lessons, quizzes, assignments, and downloadable resources organized into modules',
      'Learners enroll in courses, track progress, complete assessments, and earn certificates upon completion',
      'Managers monitor team completion rates, assessment scores, and assign mandatory training with deadlines',
    ],
    entities: ['courses', 'modules', 'lessons', 'enrollments', 'assessments', 'certificates'],
    features: ['video player', 'progress tracking', 'quiz engine', 'certificates', 'completion reporting', 'assignment management'],
  },
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function naturalList(items: string[], conjunction: string = 'and'): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, ${conjunction} ${items[items.length - 1]}`;
}

function pickScaleDescription(scale: string): string {
  switch (scale) {
    case 'small': return 'a lightweight';
    case 'large': return 'a comprehensive, full-featured';
    default: return 'a';
  }
}

function buildPromptFromDomain(domain: IndustryDomain, topic: string, options: PromptGenOptions): PromptEnhancerResult {
  const scale = options.scale || 'medium';
  const style = options.style || 'detailed';
  const additions: string[] = [];
  const scaleDesc = pickScaleDescription(scale);

  const moduleCap = scale === 'small' ? 3 : scale === 'large' ? domain.modules.length : Math.min(5, domain.modules.length);
  const selectedModules = domain.modules.slice(0, moduleCap);
  const moduleNames = selectedModules.map(m => m.name);

  const entityNames: string[] = [];
  for (const mod of selectedModules) {
    for (const e of mod.entities) {
      if (!entityNames.includes(e)) entityNames.push(e);
    }
  }

  const allFeatures: string[] = [];
  for (const mod of selectedModules) {
    for (const page of mod.pages) {
      for (const f of page.features) {
        if (!allFeatures.includes(f)) allFeatures.push(f);
      }
    }
  }

  const sentences: string[] = [];

  sentences.push(`${topic}. Build ${scaleDesc} ${domain.description.toLowerCase().includes('management') ? 'system' : 'management platform'} for ${domain.description.toLowerCase()}.`);
  additions.push(`Core concept: ${domain.name}`);

  if (style === 'detailed') {
    const coreModDescs = selectedModules
      .filter(m => m.name.toLowerCase() !== 'dashboard')
      .slice(0, 4)
      .map(m => `${m.name.toLowerCase()} (${m.description.toLowerCase()})`);
    if (coreModDescs.length > 0) {
      sentences.push(`The system should include modules for ${naturalList(coreModDescs)}.`);
      additions.push(`Added ${coreModDescs.length} modules`);
    }
  } else {
    sentences.push(`Key modules include ${naturalList(moduleNames.filter(n => n.toLowerCase() !== 'dashboard'))}.`);
    additions.push(`Added ${moduleNames.length} modules`);
  }

  if (entityNames.length > 0) {
    const entityList = entityNames.slice(0, 8);
    sentences.push(`Core data entities include ${naturalList(entityList)}.`);
    additions.push(`Added ${entityList.length} entities`);
  }

  if (domain.workflows.length > 0 && style === 'detailed') {
    const wfDescs = domain.workflows.slice(0, 3).map(wf => {
      const stateList = wf.states.slice(0, 4).join(', ');
      return `${wf.name.toLowerCase()} (${stateList})`;
    });
    sentences.push(`Include workflows for ${naturalList(wfDescs)}.`);
    additions.push(`Added ${wfDescs.length} workflows`);
  }

  if (domain.defaultKPIs.length > 0) {
    const kpis = domain.defaultKPIs.slice(0, 5);
    sentences.push(`The dashboard should display key metrics such as ${naturalList(kpis)}.`);
    additions.push('Added KPI dashboard');
  }

  if ((options.includeAuth !== false) && domain.roles.length > 0) {
    const roleNames = domain.roles.map(r => r.name.toLowerCase());
    sentences.push(`Support role-based access control with roles for ${naturalList(roleNames)}.`);
    additions.push(`Added ${roleNames.length} roles`);
  }

  const featureList: string[] = [];
  if (allFeatures.includes('search') || allFeatures.includes('filter-by-status')) featureList.push('search and filtering');
  if (allFeatures.includes('export')) featureList.push('data export');
  if (allFeatures.includes('kpi-cards') || allFeatures.includes('charts') || options.includeAnalytics) featureList.push('analytics charts');
  if (allFeatures.includes('drag-drop') || allFeatures.includes('kanban')) featureList.push('kanban boards');
  if (allFeatures.includes('calendar') || allFeatures.includes('gantt-chart')) featureList.push('calendar views');
  featureList.push('status tracking');
  if (options.includeAuth !== false) featureList.push('email notifications');

  const uniqueFeatures = featureList.filter((f, i) => featureList.indexOf(f) === i);
  sentences.push(`Include features for ${naturalList(uniqueFeatures)}.`);
  additions.push(`Added ${uniqueFeatures.length} features`);

  return {
    prompt: sentences.join(' '),
    additions,
    domain: domain.name,
    entityCount: entityNames.length,
    featureCount: uniqueFeatures.length,
  };
}

function buildPromptFromTemplate(topic: string, template: typeof TOPIC_TEMPLATES[string], options: PromptGenOptions): PromptEnhancerResult {
  const scale = options.scale || 'medium';
  const style = options.style || 'detailed';
  const scaleDesc = pickScaleDescription(scale);
  const additions: string[] = [];
  const sentences: string[] = [];

  sentences.push(`${topic}. Build ${scaleDesc} ${template.appName} ${template.intro}.`);
  additions.push(`Core concept: ${template.appName}`);

  for (const action of template.coreActions) {
    // Only add template actions if they aren't already mentioned in the user's topic
    const actionWords = action.toLowerCase().split(/\W+/).filter(w => w.length > 3);
    const alreadyMentioned = actionWords.filter(w => topic.toLowerCase().includes(w)).length / actionWords.length > 0.4;
    
    if (!alreadyMentioned) {
      sentences.push(`${action}.`);
    }
  }
  additions.push(`Added ${template.coreActions.length} core workflows`);

  if (template.entities.length > 0) {
    additions.push(`Added ${template.entities.length} entities`);
  }

  if (options.includeAnalytics !== false) {
    sentences.push(`The system should have a dashboard with key metrics like total ${template.entities[0] || 'records'}, pending actions, and completion rates.`);
    additions.push('Added analytics dashboard');
  }

  if (options.includeAuth !== false && template.actors.length > 0) {
    sentences.push(`Support role-based access for ${naturalList(template.actors)}.`);
    additions.push(`Added ${template.actors.length} roles`);
  }

  const features = [...template.features];
  if (options.includeAuth !== false && !features.includes('role-based access')) features.push('role-based access');
  sentences.push(`Include features for ${naturalList(features)}.`);
  additions.push(`Added ${features.length} features`);

  return {
    prompt: sentences.join(' '),
    additions,
    entityCount: template.entities.length,
    featureCount: features.length,
  };
}

function buildPromptFromKeywords(topic: string, options: PromptGenOptions): PromptEnhancerResult {
  const lower = topic.toLowerCase();
  const scale = options.scale || 'medium';
  const scaleDesc = pickScaleDescription(scale);
  const additions: string[] = [];
  const sentences: string[] = [];

  const entityMatchScores: Map<string, { entity: string; matchedKeywords: string[] }> = new Map();

  for (const [entity, keywords] of Object.entries(ENTITY_KEYWORDS)) {
    const matched = keywords.filter(k => {
      // Use word-boundary matching to avoid partial-word false positives
      // e.g. "team" should not match "teamwork leads" for 'contacts' (which has "lead")
      const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const boundary = new RegExp(`(?:^|\\s|[^a-z])${escaped}(?:$|\\s|[^a-z])`, 'i');
      return boundary.test(lower);
    });

    if (matched.length === 0) continue;

    // Short/generic keywords (≤4 chars) require 2+ matches to avoid false positives
    // Specific keywords (5+ chars) only need 1 match
    const hasSpecificMatch = matched.some(k => k.length >= 5);
    if (hasSpecificMatch || matched.length >= 2) {
      entityMatchScores.set(entity, { entity, matchedKeywords: matched });
    }
  }

  // Resolve conflicts: if two entities share the same matched keyword and
  // neither has a unique-to-itself match, keep only the one with more total matches
  const matchedEntities: string[] = [];
  const entries = Array.from(entityMatchScores.entries());
  for (const [entity, info] of entries) {
    const hasUniqueKeyword = info.matchedKeywords.some((kw: string) => {
      // Check if this keyword appears in any other matched entity's list
      const sharedWith = entries
        .filter(([otherEntity]) => otherEntity !== entity)
        .filter(([, otherInfo]) => otherInfo.matchedKeywords.includes(kw));
      return sharedWith.length === 0;
    });

    if (hasUniqueKeyword || info.matchedKeywords.length >= 2) {
      matchedEntities.push(entity);
    }
  }

  const matchedFeatures: string[] = [];
  for (const [feature, keywords] of Object.entries(FEATURE_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) {
      matchedFeatures.push(feature);
    }
  }

  const matchedWorkflows: string[] = [];
  for (const [workflow, keywords] of Object.entries(WORKFLOW_INDICATORS)) {
    if (keywords.some(k => lower.includes(k))) {
      matchedWorkflows.push(workflow);
    }
  }

  // Avoid "X management management platform" when topic already ends with "management"
  const platformLabel = /\bmanagement\b/i.test(topic) ? 'platform' : 'management platform';
  sentences.push(`Build ${scaleDesc} ${topic} ${platformLabel}.`);
  additions.push(`Core concept: ${topic}`);

  if (matchedEntities.length > 0) {
    sentences.push(`The system should manage ${naturalList(matchedEntities)} with full CRUD operations.`);
    additions.push(`Detected ${matchedEntities.length} entities from topic`);
  } else {
    const inferredEntities = inferEntitiesFromTopic(topic);
    if (inferredEntities.length > 0) {
      sentences.push(`The system should manage ${naturalList(inferredEntities)} with full CRUD operations.`);
      matchedEntities.push(...inferredEntities);
      additions.push(`Inferred ${inferredEntities.length} entities`);
    }
  }

  if (matchedWorkflows.length > 0) {
    const workflowDescs = matchedWorkflows.map(w => w.replace(/-/g, ' '));
    sentences.push(`Include workflows for ${naturalList(workflowDescs)}.`);
    additions.push(`Added ${matchedWorkflows.length} workflows`);
  }

  if (options.includeAnalytics !== false) {
    sentences.push(`Include a dashboard with summary cards, activity charts, and key performance metrics.`);
    additions.push('Added analytics dashboard');
  }

  if (options.includeAuth !== false) {
    sentences.push(`Support role-based access control with administrator, manager, and standard user roles.`);
    additions.push('Added role-based access');
  }

  const defaultFeatures = ['search', 'filtering', 'status tracking'];
  if (options.includeAnalytics !== false) defaultFeatures.push('analytics charts');
  if (options.includeAuth !== false) defaultFeatures.push('email notifications');

  for (const f of matchedFeatures) {
    if (!defaultFeatures.includes(f)) {
      defaultFeatures.push(f.replace(/-/g, ' '));
    }
  }

  sentences.push(`Include features for ${naturalList(defaultFeatures)}.`);
  additions.push(`Added ${defaultFeatures.length} features`);

  return {
    prompt: sentences.join(' '),
    additions,
    entityCount: matchedEntities.length,
    featureCount: defaultFeatures.length,
  };
}

function inferEntitiesFromTopic(topic: string): string[] {
  const lower = topic.toLowerCase();
  const entities: string[] = [];

  const topicEntityMap: Record<string, string[]> = {
    // General
    'adoption': ['pets', 'adopters', 'applications'],
    'pet': ['pets', 'owners', 'veterinary records'],
    'restaurant': ['menu items', 'orders', 'reservations', 'customers'],
    'food': ['menu items', 'orders', 'customers'],
    'fitness': ['members', 'workouts', 'exercises', 'goals'],
    'gym': ['members', 'classes', 'trainers', 'memberships'],
    'school': ['students', 'courses', 'teachers', 'grades'],
    'education': ['students', 'courses', 'enrollments', 'assignments'],
    'hospital': ['patients', 'appointments', 'doctors', 'prescriptions'],
    'clinic': ['patients', 'appointments', 'practitioners'],
    'hotel': ['guests', 'rooms', 'reservations', 'services'],
    'library': ['books', 'members', 'loans', 'categories'],
    'rental': ['items', 'customers', 'bookings', 'payments'],
    'event': ['events', 'venues', 'tickets', 'attendees'],
    'parking': ['parking spots', 'vehicles', 'reservations', 'payments'],
    'laundry': ['orders', 'customers', 'services', 'pickups'],
    'pharmacy': ['medications', 'prescriptions', 'customers', 'inventory'],
    'salon': ['appointments', 'services', 'stylists', 'clients'],
    'delivery': ['orders', 'drivers', 'customers', 'routes'],
    'e-commerce': ['products', 'orders', 'customers', 'payments', 'reviews'],
    'shop': ['products', 'orders', 'customers', 'payments'],
    'blog': ['posts', 'authors', 'categories', 'comments'],
    'social': ['users', 'posts', 'comments', 'likes', 'followers'],
    'chat': ['users', 'conversations', 'messages'],
    'survey': ['surveys', 'questions', 'responses', 'participants'],
    'poll': ['polls', 'options', 'votes', 'participants'],
    'ticket': ['tickets', 'agents', 'customers', 'categories'],
    'support': ['tickets', 'agents', 'customers', 'knowledge base articles'],
    'crm': ['contacts', 'deals', 'companies', 'activities'],
    'hr': ['employees', 'departments', 'leave requests', 'performance reviews'],
    'inventory': ['items', 'categories', 'stock movements', 'suppliers'],
    'warehouse': ['items', 'locations', 'stock movements', 'shipments'],
    'fleet': ['vehicles', 'drivers', 'trips', 'maintenance records'],
    'real estate': ['properties', 'tenants', 'leases', 'maintenance requests'],
    'property': ['properties', 'tenants', 'leases', 'payments'],

    // Cybersecurity
    'vapt': ['assessments', 'vulnerabilities', 'assets', 'findings', 'reports', 'remediation tasks'],
    'pentest': ['engagements', 'targets', 'vulnerabilities', 'findings', 'reports', 'evidence'],
    'penetration test': ['engagements', 'targets', 'vulnerabilities', 'findings', 'reports'],
    'vulnerability': ['vulnerabilities', 'assets', 'patches', 'remediations', 'scans'],
    'vulnerability assessment': ['assessments', 'vulnerabilities', 'assets', 'findings', 'reports'],
    'security audit': ['audits', 'findings', 'controls', 'risks', 'reports'],
    'security scan': ['scans', 'targets', 'vulnerabilities', 'findings', 'patches'],
    'soc': ['incidents', 'alerts', 'assets', 'threat intelligence', 'playbooks'],
    'siem': ['events', 'alerts', 'incidents', 'correlation rules', 'dashboards'],
    'cyber': ['incidents', 'assets', 'threats', 'vulnerabilities', 'alerts'],

    // DevOps / Infrastructure
    'devops': ['services', 'deployments', 'environments', 'incidents', 'change requests'],
    'ci/cd': ['pipelines', 'runs', 'deployments', 'environments', 'repositories'],
    'pipeline': ['pipelines', 'stages', 'runs', 'deployments', 'environments'],
    'monitoring': ['services', 'hosts', 'alerts', 'incidents', 'dashboards'],
    'observability': ['services', 'traces', 'metrics', 'logs', 'alerts'],
    'infrastructure': ['servers', 'services', 'deployments', 'environments', 'change requests'],
    'incident': ['incidents', 'services', 'alerts', 'postmortems', 'action items'],

    // Content / Knowledge
    'cms': ['posts', 'pages', 'media', 'categories', 'authors'],
    'content management': ['posts', 'pages', 'media', 'categories', 'authors'],
    'knowledge base': ['articles', 'collections', 'categories', 'authors', 'revisions'],
    'documentation': ['articles', 'sections', 'categories', 'authors', 'revisions'],
    'wiki': ['pages', 'categories', 'revisions', 'authors', 'comments'],

    // Finance / Business
    'expense': ['expense reports', 'expenses', 'receipts', 'approvals', 'budgets'],
    'erp': ['vendors', 'purchase orders', 'inventory items', 'employees', 'invoices'],
    'accounting': ['transactions', 'accounts', 'invoices', 'payments', 'reports'],
    'procurement': ['purchase orders', 'vendors', 'requisitions', 'approvals', 'contracts'],

    // Support / Learning
    'helpdesk': ['tickets', 'customers', 'agents', 'categories', 'knowledge articles'],
    'lms': ['courses', 'modules', 'lessons', 'enrollments', 'assessments'],
    'learning management': ['courses', 'modules', 'learners', 'enrollments', 'assessments'],
    'training': ['courses', 'trainees', 'sessions', 'assessments', 'certificates'],

    // Bug / Issue
    'bug tracker': ['bugs', 'projects', 'milestones', 'comments', 'attachments'],
    'issue tracker': ['issues', 'projects', 'sprints', 'labels', 'comments'],
    'defect': ['defects', 'projects', 'builds', 'comments', 'attachments'],
  };

  for (const [keyword, ents] of Object.entries(topicEntityMap)) {
    if (lower.includes(keyword)) {
      for (const e of ents) {
        if (!entities.includes(e)) entities.push(e);
      }
    }
  }

  if (entities.length === 0) {
    // Smarter fallback: map well-known tech/domain acronyms to meaningful entities
    // before resorting to the generic "$word records" pattern
    const acronymEntityMap: Record<string, string[]> = {
      'api': ['endpoints', 'services', 'api keys', 'usage logs'],
      'sdk': ['packages', 'versions', 'documentation', 'releases'],
      'saas': ['tenants', 'subscriptions', 'users', 'billing'],
      'pos': ['sales', 'products', 'customers', 'receipts'],
      'iot': ['devices', 'sensors', 'readings', 'alerts'],
      'ai': ['models', 'datasets', 'experiments', 'predictions'],
      'ml': ['models', 'datasets', 'experiments', 'metrics'],
      'etl': ['pipelines', 'sources', 'jobs', 'logs'],
      'crm': ['contacts', 'deals', 'companies', 'activities'],
      'iam': ['users', 'roles', 'permissions', 'policies'],
      'rbac': ['users', 'roles', 'permissions', 'resources'],
      'sla': ['contracts', 'clients', 'metrics', 'incidents'],
      'kpi': ['metrics', 'targets', 'departments', 'reports'],
    };

    for (const [acronym, ents] of Object.entries(acronymEntityMap)) {
      if (lower.includes(acronym)) {
        entities.push(...ents.filter(e => !entities.includes(e)));
      }
    }

    if (entities.length === 0) {
      // Last-resort: extract meaningful nouns from the topic.
      // Use "entries" instead of "records" for better readability.
      const words = lower.split(/\W+/).filter(w => w.length > 3);
      const stopWords = new Set(['build', 'create', 'system', 'platform', 'management', 'tracking', 'tracker', 'simple', 'comprehensive', 'tool', 'tools', 'manager', 'dashboard', 'admin', 'panel', 'portal', 'application', 'software', 'solution', 'service']);
      const potentialEntities = words.filter(w => !stopWords.has(w));

      if (potentialEntities.length > 0) {
        // Use "entries" suffix instead of "records", limit to first 3 meaningful words
        entities.push(...potentialEntities.slice(0, 3).map(w => `${w} entries`));
      } else {
        entities.push('records', 'categories', 'users');
      }
    }
  }

  return entities.slice(0, 6);
}

export function generatePrompt(topic: string, options?: PromptGenOptions): PromptEnhancerResult {
  const opts: PromptGenOptions = {
    scale: 'medium',
    includeAuth: true,
    includeAnalytics: true,
    style: 'detailed',
    ...options,
  };

  const lowerTopic = topic.toLowerCase().trim();

  const templateKey = Object.keys(TOPIC_TEMPLATES).find(k => lowerTopic.includes(k) || k.includes(lowerTopic));
  if (templateKey) {
    return buildPromptFromTemplate(topic, TOPIC_TEMPLATES[templateKey], opts);
  }

  const domainMatches = detectDomainFromText(lowerTopic);
  if (domainMatches.length > 0 && domainMatches[0].confidence > 0.1) {
    return buildPromptFromDomain(domainMatches[0].domain, topic, opts);
  }

  const allDomains = getAllDomains();
  for (const domain of allDomains) {
    const domainTerms = [
      domain.id,
      domain.name.toLowerCase(),
      ...domain.keywords,
    ];
    if (domainTerms.some(t => lowerTopic.includes(t) || t.includes(lowerTopic))) {
      return buildPromptFromDomain(domain, topic, opts);
    }
  }

  return buildPromptFromKeywords(topic, opts);
}

export function upgradePrompt(existingPrompt: string): PromptEnhancerResult {
  const analysis = analyzeRequest(existingPrompt);
  const additions: string[] = [];
  const lower = existingPrompt.toLowerCase();

  const existingEntities: string[] = [
    ...analysis.level3_entities.mentionedEntities,
    ...analysis.level3_entities.inferredEntities,
  ];
  const existingFeatures: string[] = [
    ...analysis.level1_intent.mentionedFeatures,
    ...analysis.level1_intent.impliedFeatures,
  ];
  const existingWorkflows: string[] = [
    ...analysis.level4_workflows.mentionedWorkflows,
  ];

  const enrichments: string[] = [];

  const domain = analysis.level2_domain.primaryDomain;
  const domainName = domain?.name;
  const domainConfidence = analysis.level2_domain.confidence;

  if (domain && domainConfidence >= 0.75) {
    for (const entity of domain.entities) {
      const entityLower = entity.name.toLowerCase();
      
      // Relevance score based on keywords in description/fields matching user prompt
      const relevanceKeywords = [entityLower, ...entity.fields.map(f => f.name.toLowerCase())];
      const relevanceScore = relevanceKeywords.filter(k => lower.includes(k)).length;

      if (relevanceScore > 0 && !existingEntities.includes(entityLower) && !existingEntities.includes(entity.name) && !lower.includes(entityLower)) {
        const keyFields = entity.fields
          .filter(f => f.name !== 'id' && f.name !== 'createdAt' && f.required)
          .slice(0, 4)
          .map(f => f.name.replace(/([A-Z])/g, ' $1').toLowerCase().trim());

        if (keyFields.length > 0) {
          enrichments.push(`Track ${entityLower} records with fields like ${naturalList(keyFields)}.`);
          existingEntities.push(entityLower);
          additions.push(`Added entity: ${entity.name}`);
        }
      }
    }

    for (const wf of domain.workflows) {
      const wfLower = wf.name.toLowerCase();
      if (!existingWorkflows.includes(wfLower) && !lower.includes(wfLower)) {
        const stateList = wf.states.slice(0, 4).join(', ');
        enrichments.push(`Include a ${wfLower} with states: ${stateList}.`);
        additions.push(`Added workflow: ${wf.name}`);
      }
    }

    if (domain.defaultKPIs.length > 0 && !lower.includes('dashboard') && !lower.includes('kpi') && !lower.includes('metric')) {
      const kpis = domain.defaultKPIs.slice(0, 4);
      enrichments.push(`Add a dashboard displaying key metrics such as ${naturalList(kpis)}.`);
      additions.push('Added KPI dashboard');
    }

    if (domain.roles.length > 0 && !existingFeatures.includes('role-based') && !lower.includes('role') && !lower.includes('permission')) {
      const roleNames = domain.roles.map(r => r.name.toLowerCase());
      enrichments.push(`Support role-based access control with roles for ${naturalList(roleNames)}.`);
      additions.push(`Added ${roleNames.length} user roles`);
    }
  }

  const FEATURE_EVIDENCE: Record<string, { weight: number; keywords: string[] }> = {
    'search': { weight: 0.5, keywords: ['find', 'search', 'lookup', 'filter'] },
    'export': { weight: 0.6, keywords: ['export', 'download', 'csv', 'pdf', 'excel'] },
    'notification': { weight: 0.4, keywords: ['email', 'notify', 'alert', 'remind'] },
    'charts': { weight: 0.7, keywords: ['dashboard', 'metrics', 'charts', 'reports', 'kpi', 'analytics'] },
  };

  const missingFeatures: string[] = [];
  for (const [feature, evidence] of Object.entries(FEATURE_EVIDENCE)) {
    if (!existingFeatures.includes(feature)) {
      const matches = evidence.keywords.filter(k => lower.includes(k));
      const score = (matches.length / evidence.keywords.length) * evidence.weight;
      
      if (score > 0.1 || matches.length >= 1) {
        const readable = feature.replace(/-/g, ' ');
        if (!lower.includes(readable) && !lower.includes(feature)) {
          missingFeatures.push(readable);
        }
      }
    }
  }
  if (missingFeatures.length > 0) {
    enrichments.push(`Include additional features for ${naturalList(missingFeatures)}.`);
    additions.push(`Added ${missingFeatures.length} missing features`);
  }

  if (analysis.level1_intent.scale === 'unknown') {
    enrichments.push('The system should be designed to handle a moderate number of concurrent users with room to scale.');
    additions.push('Added scale guidance');
  }

  if (!lower.includes('responsive') && !lower.includes('mobile')) {
    enrichments.push('Ensure the interface is fully responsive and works well on both desktop and mobile devices.');
    additions.push('Added responsive design requirement');
  }

  let enhancedPrompt = existingPrompt.trim();
  if (!enhancedPrompt.endsWith('.')) {
    enhancedPrompt += '.';
  }
  if (enrichments.length > 0) {
    enhancedPrompt += ' ' + enrichments.join(' ');
  }

  const totalEntities = existingEntities.length;
  const totalFeatures = existingFeatures.length + missingFeatures.length;

  return {
    prompt: enhancedPrompt,
    additions,
    domain: domainConfidence >= 0.6 ? domainName : undefined,
    entityCount: totalEntities,
    featureCount: totalFeatures,
  };
}