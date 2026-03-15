import { localAI } from './local-ai-engine.js';
import type { ParsedIntent, DetectedDomain, SynthesisResult, ArchitectureDecision } from './local-ai-engine.js';
import { templateRegistry } from './template-registry.js';

export interface IntentInterpretation {
  intent: ParsedIntent;
  archetypeMatch: ArchetypeMatch | null;
  clarificationNeeded: boolean;
  suggestedQuestions: string[];
  confidence: number;
}

export interface ArchetypeMatch {
  name: string;
  similarity: number;
  templateKey: string;
  defaultEntities: string[];
  defaultPages: string[];
  defaultFeatures: string[];
}

export interface StrategicPlan {
  projectType: string;
  mvpScope: MVPScope;
  phases: ProjectPhase[];
  saasPatterns: SaaSPattern[];
  riskAssessment: RiskItem[];
  estimatedComplexity: number;
}

export interface MVPScope {
  entities: string[];
  pages: string[];
  endpoints: string[];
  excludedFeatures: string[];
  rationale: string;
}

export interface ProjectPhase {
  name: string;
  order: number;
  entities: string[];
  features: string[];
  duration: string;
}

export interface SaaSPattern {
  name: string;
  applicable: boolean;
  confidence: number;
  components: string[];
}

export interface RiskItem {
  area: string;
  level: 'low' | 'medium' | 'high';
  description: string;
  mitigation: string;
}

export interface SemanticDomainModel {
  domain: DetectedDomain;
  entities: DomainEntity[];
  relationships: DomainRelationship[];
  workflows: DomainWorkflow[];
  vocabulary: string[];
  industryPatterns: string[];
}

export interface DomainEntity {
  name: string;
  type: 'primary' | 'secondary' | 'junction' | 'lookup';
  fields: DomainField[];
  behaviors: string[];
  relatedEntities: string[];
}

export interface DomainField {
  name: string;
  type: string;
  semantic: string;
  required: boolean;
  validations: string[];
}

export interface DomainRelationship {
  from: string;
  to: string;
  type: 'has-many' | 'belongs-to' | 'has-one' | 'many-to-many';
  throughEntity?: string;
  label: string;
}

export interface DomainWorkflow {
  name: string;
  trigger: string;
  steps: string[];
  entities: string[];
}

export interface ArchitectureSynthesis {
  decision: ArchitectureDecision;
  patterns: PatternChoice[];
  constraints: string[];
  tradeoffs: Tradeoff[];
}

export interface PatternChoice {
  category: string;
  chosen: string;
  alternatives: string[];
  reason: string;
}

export interface Tradeoff {
  decision: string;
  pros: string[];
  cons: string[];
}

export interface AdaptiveUXResult {
  userType: string;
  layout: UXLayout;
  navigation: NavigationPattern;
  colorScheme: ColorRecommendation;
  interactions: InteractionPattern[];
  accessibilityLevel: string;
}

export interface UXLayout {
  type: 'sidebar' | 'topnav' | 'dashboard' | 'wizard' | 'split' | 'single';
  primaryContent: string;
  secondaryContent: string;
  responsive: boolean;
}

export interface NavigationPattern {
  type: 'sidebar' | 'tabs' | 'breadcrumb' | 'nested' | 'flat';
  items: NavItem[];
  depth: number;
}

export interface NavItem {
  label: string;
  path: string;
  icon?: string;
  children?: NavItem[];
}

export interface ColorRecommendation {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  darkMode: boolean;
}

export interface InteractionPattern {
  name: string;
  trigger: string;
  response: string;
  component: string;
}

const ARCHETYPES: Record<string, ArchetypeMatch> = {
  'todo-app': {
    name: 'Todo/Task Manager',
    similarity: 0,
    templateKey: 'todo',
    defaultEntities: ['Task', 'Category', 'User'],
    defaultPages: ['Dashboard', 'Tasks', 'Settings'],
    defaultFeatures: ['CRUD tasks', 'categorize', 'filter', 'search', 'due dates', 'priority'],
  },
  'ecommerce': {
    name: 'E-Commerce Store',
    similarity: 0,
    templateKey: 'ecommerce',
    defaultEntities: ['Product', 'Category', 'Cart', 'Order', 'User', 'Review'],
    defaultPages: ['Home', 'Products', 'Product Detail', 'Cart', 'Checkout', 'Orders', 'Admin'],
    defaultFeatures: ['product listing', 'search', 'cart', 'checkout', 'order tracking', 'reviews', 'admin panel'],
  },
  'blog': {
    name: 'Blog/CMS',
    similarity: 0,
    templateKey: 'blog',
    defaultEntities: ['Post', 'Category', 'Tag', 'Comment', 'User'],
    defaultPages: ['Home', 'Posts', 'Post Detail', 'Editor', 'Categories', 'Profile'],
    defaultFeatures: ['write posts', 'categories', 'tags', 'comments', 'search', 'markdown editor'],
  },
  'crm': {
    name: 'CRM System',
    similarity: 0,
    templateKey: 'crm',
    defaultEntities: ['Contact', 'Company', 'Deal', 'Activity', 'Note', 'User'],
    defaultPages: ['Dashboard', 'Contacts', 'Companies', 'Deals', 'Pipeline', 'Reports'],
    defaultFeatures: ['contact management', 'deal pipeline', 'activity tracking', 'notes', 'reports', 'search'],
  },
  'project-management': {
    name: 'Project Management',
    similarity: 0,
    templateKey: 'project-mgmt',
    defaultEntities: ['Project', 'Task', 'Milestone', 'Team', 'Member', 'Comment'],
    defaultPages: ['Dashboard', 'Projects', 'Board', 'Timeline', 'Team', 'Settings'],
    defaultFeatures: ['kanban board', 'task assignments', 'milestones', 'team management', 'timeline', 'comments'],
  },
  'social-network': {
    name: 'Social Network',
    similarity: 0,
    templateKey: 'social',
    defaultEntities: ['User', 'Post', 'Comment', 'Like', 'Follow', 'Message'],
    defaultPages: ['Feed', 'Profile', 'Messages', 'Explore', 'Notifications', 'Settings'],
    defaultFeatures: ['post feed', 'comments', 'likes', 'follows', 'messaging', 'notifications', 'profiles'],
  },
  'dashboard': {
    name: 'Analytics Dashboard',
    similarity: 0,
    templateKey: 'dashboard',
    defaultEntities: ['Metric', 'Report', 'DataSource', 'Widget', 'User'],
    defaultPages: ['Dashboard', 'Reports', 'Data Sources', 'Settings'],
    defaultFeatures: ['charts', 'KPIs', 'data visualization', 'filters', 'date ranges', 'export'],
  },
  'booking': {
    name: 'Booking/Reservation System',
    similarity: 0,
    templateKey: 'booking',
    defaultEntities: ['Service', 'Provider', 'Booking', 'TimeSlot', 'Customer', 'Review'],
    defaultPages: ['Home', 'Services', 'Book', 'My Bookings', 'Calendar', 'Admin'],
    defaultFeatures: ['service listing', 'time slot picker', 'booking flow', 'calendar view', 'reminders', 'reviews'],
  },
  'inventory': {
    name: 'Inventory Management',
    similarity: 0,
    templateKey: 'inventory',
    defaultEntities: ['Product', 'Category', 'Warehouse', 'StockMovement', 'Supplier', 'Order'],
    defaultPages: ['Dashboard', 'Products', 'Stock', 'Suppliers', 'Orders', 'Reports'],
    defaultFeatures: ['stock tracking', 'low stock alerts', 'supplier management', 'purchase orders', 'reports'],
  },
  'learning': {
    name: 'Learning Management System',
    similarity: 0,
    templateKey: 'lms',
    defaultEntities: ['Course', 'Lesson', 'Quiz', 'Student', 'Enrollment', 'Progress'],
    defaultPages: ['Home', 'Courses', 'Course Detail', 'Lesson', 'Quiz', 'My Progress', 'Admin'],
    defaultFeatures: ['course listing', 'lessons', 'quizzes', 'progress tracking', 'enrollment', 'certificates'],
  },
  'chat': {
    name: 'Chat/Messaging App',
    similarity: 0,
    templateKey: 'chat',
    defaultEntities: ['User', 'Conversation', 'Message', 'Channel', 'Attachment'],
    defaultPages: ['Chat', 'Channels', 'Contacts', 'Settings'],
    defaultFeatures: ['real-time messaging', 'channels', 'file sharing', 'online status', 'notifications'],
  },
  'hr': {
    name: 'HR Management',
    similarity: 0,
    templateKey: 'hr',
    defaultEntities: ['Employee', 'Department', 'LeaveRequest', 'Attendance', 'Payroll', 'Performance'],
    defaultPages: ['Dashboard', 'Employees', 'Departments', 'Leave', 'Attendance', 'Payroll', 'Reports'],
    defaultFeatures: ['employee directory', 'leave management', 'attendance', 'payroll', 'performance reviews'],
  },
  'healthcare': {
    name: 'Healthcare/Clinic Management',
    similarity: 0,
    templateKey: 'healthcare',
    defaultEntities: ['Patient', 'Doctor', 'Appointment', 'MedicalRecord', 'Prescription', 'Department'],
    defaultPages: ['Dashboard', 'Patients', 'Appointments', 'Records', 'Prescriptions', 'Doctors'],
    defaultFeatures: ['patient records', 'appointment scheduling', 'prescriptions', 'medical history', 'billing'],
  },
  'real-estate': {
    name: 'Real Estate Platform',
    similarity: 0,
    templateKey: 'realestate',
    defaultEntities: ['Property', 'Agent', 'Listing', 'Inquiry', 'Showing', 'Client'],
    defaultPages: ['Home', 'Listings', 'Property Detail', 'Map View', 'Agents', 'Saved'],
    defaultFeatures: ['property listing', 'search', 'map view', 'virtual tours', 'inquiries', 'agent profiles'],
  },
  'fitness': {
    name: 'Fitness/Wellness App',
    similarity: 0,
    templateKey: 'fitness',
    defaultEntities: ['Workout', 'Exercise', 'Plan', 'Progress', 'User', 'Goal'],
    defaultPages: ['Dashboard', 'Workouts', 'Plans', 'Progress', 'Goals', 'Profile'],
    defaultFeatures: ['workout tracking', 'exercise library', 'plans', 'progress charts', 'goals', 'streaks'],
  },
  'recipe': {
    name: 'Recipe/Food App',
    similarity: 0,
    templateKey: 'recipe',
    defaultEntities: ['Recipe', 'Ingredient', 'Category', 'MealPlan', 'ShoppingList', 'User'],
    defaultPages: ['Home', 'Recipes', 'Recipe Detail', 'Meal Plans', 'Shopping List', 'Profile'],
    defaultFeatures: ['recipe browser', 'ingredients', 'meal planning', 'shopping lists', 'favorites', 'ratings'],
  },
};

const ARCHETYPE_KEYWORDS: Record<string, string[]> = {
  'todo-app': ['todo', 'task', 'checklist', 'to-do', 'task manager', 'to do'],
  'ecommerce': ['shop', 'store', 'ecommerce', 'e-commerce', 'product', 'cart', 'checkout', 'buy', 'sell', 'marketplace'],
  'blog': ['blog', 'post', 'article', 'cms', 'content', 'publish', 'writer', 'writing'],
  'crm': ['crm', 'customer', 'lead', 'deal', 'pipeline', 'sales', 'contact management'],
  'project-management': ['project', 'kanban', 'scrum', 'sprint', 'milestone', 'task board', 'project management'],
  'social-network': ['social', 'feed', 'follow', 'friend', 'post', 'like', 'share', 'network', 'community'],
  'dashboard': ['dashboard', 'analytics', 'metrics', 'report', 'chart', 'visualization', 'kpi'],
  'booking': ['booking', 'reservation', 'appointment', 'schedule', 'slot', 'availability'],
  'inventory': ['inventory', 'stock', 'warehouse', 'supply', 'goods', 'procurement'],
  'learning': ['course', 'lesson', 'quiz', 'student', 'learn', 'education', 'training', 'lms'],
  'chat': ['chat', 'message', 'messaging', 'conversation', 'channel', 'real-time', 'instant'],
  'hr': ['employee', 'hr', 'human resource', 'payroll', 'leave', 'attendance', 'department'],
  'healthcare': ['patient', 'doctor', 'clinic', 'hospital', 'medical', 'health', 'prescription', 'appointment'],
  'real-estate': ['property', 'listing', 'real estate', 'house', 'apartment', 'rent', 'buy', 'agent'],
  'fitness': ['workout', 'exercise', 'fitness', 'gym', 'training', 'health', 'wellness'],
  'recipe': ['recipe', 'cook', 'food', 'meal', 'ingredient', 'kitchen', 'dining', 'restaurant'],
};

const SAAS_INDICATORS = [
  { keyword: 'subscription', pattern: 'subscription-billing', components: ['PricingPage', 'BillingDashboard', 'PlanSelector'] },
  { keyword: 'tenant', pattern: 'multi-tenancy', components: ['TenantSwitcher', 'TenantSettings', 'DataIsolation'] },
  { keyword: 'team', pattern: 'team-collaboration', components: ['TeamInvite', 'RoleManager', 'ActivityFeed'] },
  { keyword: 'api', pattern: 'api-gateway', components: ['APIKeyManager', 'UsageDashboard', 'RateLimitConfig'] },
  { keyword: 'billing', pattern: 'payment-processing', components: ['PaymentForm', 'InvoiceList', 'SubscriptionManager'] },
  { keyword: 'analytics', pattern: 'usage-analytics', components: ['UsageChart', 'EventTracker', 'ReportBuilder'] },
  { keyword: 'notification', pattern: 'notification-system', components: ['NotificationCenter', 'EmailTemplates', 'WebhookConfig'] },
  { keyword: 'role', pattern: 'rbac', components: ['RoleEditor', 'PermissionMatrix', 'AccessControl'] },
  { keyword: 'webhook', pattern: 'webhook-system', components: ['WebhookManager', 'EventLog', 'RetryDashboard'] },
  { keyword: 'integration', pattern: 'integrations', components: ['IntegrationMarketplace', 'OAuthFlow', 'ConnectorConfig'] },
];

const DOMAIN_COLORS: Record<string, ColorRecommendation> = {
  healthcare: { primary: '#0ea5e9', secondary: '#06b6d4', accent: '#10b981', background: '#f8fafc', surface: '#ffffff', text: '#0f172a', darkMode: true },
  ecommerce: { primary: '#f97316', secondary: '#8b5cf6', accent: '#ec4899', background: '#fafaf9', surface: '#ffffff', text: '#1c1917', darkMode: true },
  education: { primary: '#3b82f6', secondary: '#6366f1', accent: '#f59e0b', background: '#f8fafc', surface: '#ffffff', text: '#1e293b', darkMode: true },
  finance: { primary: '#059669', secondary: '#0284c7', accent: '#7c3aed', background: '#f9fafb', surface: '#ffffff', text: '#111827', darkMode: true },
  social: { primary: '#8b5cf6', secondary: '#ec4899', accent: '#f59e0b', background: '#faf5ff', surface: '#ffffff', text: '#1e1b4b', darkMode: true },
  productivity: { primary: '#2563eb', secondary: '#0891b2', accent: '#16a34a', background: '#f8fafc', surface: '#ffffff', text: '#0f172a', darkMode: true },
  logistics: { primary: '#0d9488', secondary: '#0284c7', accent: '#d97706', background: '#f0fdfa', surface: '#ffffff', text: '#134e4a', darkMode: true },
  entertainment: { primary: '#e11d48', secondary: '#9333ea', accent: '#f59e0b', background: '#fff1f2', surface: '#ffffff', text: '#1c1917', darkMode: true },
  realestate: { primary: '#16a34a', secondary: '#0284c7', accent: '#d97706', background: '#f0fdf4', surface: '#ffffff', text: '#14532d', darkMode: true },
  hr: { primary: '#7c3aed', secondary: '#2563eb', accent: '#059669', background: '#faf5ff', surface: '#ffffff', text: '#1e1b4b', darkMode: true },
  food: { primary: '#ea580c', secondary: '#16a34a', accent: '#d97706', background: '#fff7ed', surface: '#ffffff', text: '#431407', darkMode: true },
  travel: { primary: '#0284c7', secondary: '#0d9488', accent: '#f59e0b', background: '#f0f9ff', surface: '#ffffff', text: '#0c4a6e', darkMode: true },
  fitness: { primary: '#dc2626', secondary: '#16a34a', accent: '#f59e0b', background: '#fef2f2', surface: '#ffffff', text: '#450a0a', darkMode: true },
  analytics: { primary: '#4f46e5', secondary: '#0891b2', accent: '#10b981', background: '#eef2ff', surface: '#ffffff', text: '#1e1b4b', darkMode: true },
  general: { primary: '#3b82f6', secondary: '#8b5cf6', accent: '#f59e0b', background: '#f8fafc', surface: '#ffffff', text: '#0f172a', darkMode: true },
};

const FIELD_TYPE_MAP: Record<string, { type: string; validations: string[] }> = {
  name: { type: 'text', validations: ['minLength:2', 'maxLength:100'] },
  title: { type: 'text', validations: ['minLength:1', 'maxLength:200'] },
  description: { type: 'text', validations: ['maxLength:2000'] },
  email: { type: 'email', validations: ['email'] },
  password: { type: 'password', validations: ['minLength:8', 'pattern:hasUppercase', 'pattern:hasNumber'] },
  phone: { type: 'phone', validations: ['pattern:phone'] },
  url: { type: 'url', validations: ['url'] },
  image: { type: 'url', validations: ['url'] },
  avatar: { type: 'url', validations: ['url'] },
  price: { type: 'money', validations: ['min:0'] },
  amount: { type: 'money', validations: ['min:0'] },
  quantity: { type: 'integer', validations: ['min:0', 'integer'] },
  count: { type: 'integer', validations: ['min:0', 'integer'] },
  rating: { type: 'integer', validations: ['min:1', 'max:5'] },
  status: { type: 'enum', validations: [] },
  date: { type: 'date', validations: [] },
  startDate: { type: 'date', validations: [] },
  endDate: { type: 'date', validations: [] },
  dueDate: { type: 'date', validations: [] },
  isActive: { type: 'boolean', validations: [] },
  isPublished: { type: 'boolean', validations: [] },
  content: { type: 'richtext', validations: ['maxLength:50000'] },
  body: { type: 'richtext', validations: ['maxLength:50000'] },
  address: { type: 'text', validations: ['maxLength:500'] },
  city: { type: 'text', validations: ['maxLength:100'] },
  country: { type: 'text', validations: ['maxLength:100'] },
  zipCode: { type: 'text', validations: ['pattern:zipCode'] },
  latitude: { type: 'float', validations: ['min:-90', 'max:90'] },
  longitude: { type: 'float', validations: ['min:-180', 'max:180'] },
  color: { type: 'color', validations: ['pattern:hexColor'] },
  slug: { type: 'slug', validations: ['pattern:slug'] },
  order: { type: 'integer', validations: ['min:0'] },
  priority: { type: 'integer', validations: ['min:1', 'max:5'] },
  weight: { type: 'float', validations: ['min:0'] },
  percentage: { type: 'float', validations: ['min:0', 'max:100'] },
};

const LAYOUT_CHOICES: Record<string, UXLayout> = {
  dashboard: { type: 'dashboard', primaryContent: 'widgets', secondaryContent: 'sidebar', responsive: true },
  crud: { type: 'sidebar', primaryContent: 'data-table', secondaryContent: 'detail-panel', responsive: true },
  content: { type: 'topnav', primaryContent: 'article', secondaryContent: 'sidebar', responsive: true },
  wizard: { type: 'wizard', primaryContent: 'steps', secondaryContent: 'progress', responsive: true },
  chat: { type: 'split', primaryContent: 'messages', secondaryContent: 'conversation-list', responsive: true },
  landing: { type: 'single', primaryContent: 'hero', secondaryContent: 'features', responsive: true },
};

export async function interpretIntent(description: string): Promise<IntentInterpretation> {
  const intent = localAI.parseIntent(description);
  const lowerDesc = description.toLowerCase();

  let bestArchetype: ArchetypeMatch | null = null;
  let bestScore = 0;

  for (const [key, keywords] of Object.entries(ARCHETYPE_KEYWORDS)) {
    let score = 0;
    let matchCount = 0;
    for (const kw of keywords) {
      if (lowerDesc.includes(kw)) {
        score += kw.split(' ').length;
        matchCount++;
      }
    }
    const normalizedScore = matchCount > 0 ? (score * matchCount) / keywords.length : 0;
    if (normalizedScore > bestScore && matchCount > 0) {
      bestScore = normalizedScore;
      bestArchetype = { ...ARCHETYPES[key], similarity: Math.min(normalizedScore, 1) };
    }
  }

  const templateArchetypes = templateRegistry.findArchetypes(description, 3);
  for (const ta of templateArchetypes) {
    if (ta.matchScore > 0.3 && ta.matchScore > bestScore && !bestArchetype) {
      bestScore = ta.matchScore;
      bestArchetype = {
        name: ta.name,
        similarity: Math.min(ta.matchScore, 1),
        templateKey: ta.id,
        defaultEntities: ta.entities.map(e => e.name),
        defaultPages: ta.pages,
        defaultFeatures: ta.features,
      };
    }
  }

  const suggestedQuestions: string[] = [];
  let clarificationNeeded = false;

  if (intent.entities.length === 0) {
    clarificationNeeded = true;
    suggestedQuestions.push('What are the main data types or objects in your application?');
  }

  if (!intent.domain || intent.domain.confidence < 0.5) {
    clarificationNeeded = true;
    suggestedQuestions.push('What industry or domain is this application for?');
  }

  if (intent.complexity.level === 'unknown') {
    suggestedQuestions.push('How many different types of users will use this application?');
  }

  if (description.split(' ').length < 10) {
    clarificationNeeded = true;
    suggestedQuestions.push('Can you describe the main features you want in more detail?');
  }

  const confidence = Math.min(1, (
    (intent.entities.length > 0 ? 0.3 : 0) +
    (intent.domain ? intent.domain.confidence * 0.3 : 0) +
    (intent.actions.length > 0 ? 0.2 : 0) +
    (bestArchetype ? bestArchetype.similarity * 0.2 : 0)
  ));

  return {
    intent,
    archetypeMatch: bestArchetype,
    clarificationNeeded,
    suggestedQuestions,
    confidence,
  };
}

export async function createStrategicPlan(
  intent: ParsedIntent,
  archetype: ArchetypeMatch | null,
  entities: any[]
): Promise<StrategicPlan> {
  const entityNames = entities?.map((e: any) => e.name || e.entityName || 'Unknown') || [];
  const allEntities = [...new Set([
    ...entityNames,
    ...(archetype?.defaultEntities || []),
  ])];

  const templateMatches = templateRegistry.findArchetypes(intent.domain?.name || '', 1);
  if (templateMatches.length > 0) {
    const tmpl = templateMatches[0];
    for (const feat of tmpl.features) {
      if (!archetype?.defaultFeatures?.includes(feat)) {
        archetype = archetype || { name: tmpl.name, similarity: tmpl.matchScore, templateKey: tmpl.id, defaultEntities: [], defaultPages: [], defaultFeatures: [] };
        if (!archetype.defaultFeatures.includes(feat)) {
          archetype.defaultFeatures.push(feat);
        }
      }
    }
    for (const page of tmpl.pages) {
      if (!archetype?.defaultPages?.includes(page)) {
        archetype = archetype || { name: tmpl.name, similarity: tmpl.matchScore, templateKey: tmpl.id, defaultEntities: [], defaultPages: [], defaultFeatures: [] };
        if (!archetype.defaultPages.includes(page)) {
          archetype.defaultPages.push(page);
        }
      }
    }
  }

  const allPages = archetype?.defaultPages || inferPages(allEntities, intent);
  const allEndpoints = allEntities.flatMap(e => [
    `GET /api/${toKebab(e)}`,
    `POST /api/${toKebab(e)}`,
    `GET /api/${toKebab(e)}/:id`,
    `PUT /api/${toKebab(e)}/:id`,
    `DELETE /api/${toKebab(e)}/:id`,
  ]);

  const mvpEntities = allEntities.slice(0, Math.min(allEntities.length, 5));
  const mvpPages = allPages.slice(0, Math.min(allPages.length, 4));
  const mvpEndpoints = mvpEntities.flatMap(e => [
    `GET /api/${toKebab(e)}`,
    `POST /api/${toKebab(e)}`,
  ]);

  const excludedFeatures: string[] = [];
  const advancedFeatures = ['real-time', 'notifications', 'analytics', 'export', 'import', 'webhooks'];
  for (const feat of advancedFeatures) {
    if (intent.actions.some(a => a.includes(feat))) {
      excludedFeatures.push(`${feat} (deferred to phase 2)`);
    }
  }

  const phases: ProjectPhase[] = [
    {
      name: 'MVP - Core CRUD',
      order: 1,
      entities: mvpEntities,
      features: ['CRUD operations', 'basic UI', 'navigation', 'forms'],
      duration: '1-2 days',
    },
    {
      name: 'Enhancement - Relationships & Search',
      order: 2,
      entities: allEntities.slice(mvpEntities.length),
      features: ['entity relationships', 'search', 'filters', 'sorting', 'pagination'],
      duration: '2-3 days',
    },
    {
      name: 'Polish - UX & Advanced Features',
      order: 3,
      entities: [],
      features: excludedFeatures.map(f => f.replace(' (deferred to phase 2)', '')).concat(['dark mode', 'responsive design', 'error handling']),
      duration: '1-2 days',
    },
  ];

  const lowerActions = intent.actions.map(a => a.toLowerCase()).join(' ');
  const lowerDesc = (intent.domain?.name || '').toLowerCase() + ' ' + entityNames.join(' ').toLowerCase();
  const saasPatterns: SaaSPattern[] = SAAS_INDICATORS.map(ind => {
    const applicable = lowerActions.includes(ind.keyword) || lowerDesc.includes(ind.keyword);
    return {
      name: ind.pattern,
      applicable,
      confidence: applicable ? 0.8 : 0.1,
      components: ind.components,
    };
  }).filter(p => p.applicable);

  const riskAssessment: RiskItem[] = [];
  if (allEntities.length > 10) {
    riskAssessment.push({ area: 'Scope', level: 'high', description: 'Many entities increase complexity', mitigation: 'Phase delivery and prioritize MVP' });
  }
  if (intent.complexity.level === 'high' || intent.complexity.level === 'enterprise') {
    riskAssessment.push({ area: 'Complexity', level: 'high', description: 'High complexity project', mitigation: 'Break into smaller independent modules' });
  }
  if (saasPatterns.length > 3) {
    riskAssessment.push({ area: 'SaaS Features', level: 'medium', description: 'Multiple SaaS patterns needed', mitigation: 'Implement billing and auth first' });
  }

  return {
    projectType: archetype?.name || intent.domain?.name || 'Custom Application',
    mvpScope: {
      entities: mvpEntities,
      pages: mvpPages,
      endpoints: mvpEndpoints,
      excludedFeatures,
      rationale: `MVP focuses on ${mvpEntities.length} core entities with basic CRUD to validate the concept`,
    },
    phases,
    saasPatterns,
    riskAssessment,
    estimatedComplexity: intent.complexity.score,
  };
}

export async function buildSemanticDomainModel(
  intent: ParsedIntent,
  entities: any[]
): Promise<SemanticDomainModel> {
  const domain = intent.domain || localAI.detectDomain(entities.map((e: any) => e.name).join(' '));
  const domainEntities: DomainEntity[] = [];
  const relationships: DomainRelationship[] = [];
  const workflows: DomainWorkflow[] = [];

  for (const entity of (entities || [])) {
    const name = entity.name || entity.entityName || 'Item';
    const fields = entity.fields || entity.columns || [];

    const domainFields: DomainField[] = fields.map((f: any) => {
      const fieldName = f.name || 'field';
      const fieldInfo = FIELD_TYPE_MAP[fieldName] || { type: f.type || 'text', validations: [] };
      return {
        name: fieldName,
        type: fieldInfo.type,
        semantic: inferFieldSemantic(fieldName),
        required: f.required || fieldName === 'name' || fieldName === 'title',
        validations: fieldInfo.validations,
      };
    });

    const entityType = inferEntityType(name, fields);
    const behaviors = inferBehaviors(name, fields, intent.actions);

    domainEntities.push({
      name,
      type: entityType,
      fields: domainFields,
      behaviors,
      relatedEntities: findRelatedEntities(name, fields, entities),
    });
  }

  for (let i = 0; i < domainEntities.length; i++) {
    for (const related of domainEntities[i].relatedEntities) {
      const relatedEntity = domainEntities.find(e => e.name === related);
      if (relatedEntity) {
        const relType = inferRelationshipType(domainEntities[i], relatedEntity);
        if (!relationships.find(r => r.from === domainEntities[i].name && r.to === related)) {
          relationships.push({
            from: domainEntities[i].name,
            to: related,
            type: relType,
            label: `${domainEntities[i].name} ${relType.replace('-', ' ')} ${related}`,
          });
        }
      }
    }
  }

  if (entities.some((e: any) => (e.name || '').toLowerCase().includes('order') || (e.name || '').toLowerCase().includes('booking'))) {
    workflows.push({
      name: 'Order/Booking Flow',
      trigger: 'User action',
      steps: ['Select items', 'Review', 'Confirm', 'Process payment', 'Send confirmation'],
      entities: entities.filter((e: any) => {
        const n = (e.name || '').toLowerCase();
        return n.includes('order') || n.includes('cart') || n.includes('booking') || n.includes('payment');
      }).map((e: any) => e.name),
    });
  }

  if (entities.some((e: any) => (e.name || '').toLowerCase().includes('user'))) {
    workflows.push({
      name: 'User Registration',
      trigger: 'New user',
      steps: ['Sign up form', 'Validate email', 'Create profile', 'Welcome email'],
      entities: ['User'],
    });
  }

  const domainProfile = templateRegistry.findDomainProfile(domain.name || '');
  let vocabulary = domain.keywords || [];
  let industryPatterns = domain.commonEntities || [];

  if (domainProfile) {
    for (const wf of domainProfile.workflows) {
      workflows.push({
        name: wf.name,
        trigger: wf.triggers?.[0] || 'System event',
        steps: wf.steps,
        entities: [],
      });
    }
    industryPatterns = [...new Set([...industryPatterns, ...domainProfile.businessRules])];
    for (const [term, definition] of Object.entries(domainProfile.terminology)) {
      vocabulary.push(`${term}: ${definition}`);
    }
  }

  return {
    domain,
    entities: domainEntities,
    relationships,
    workflows,
    vocabulary,
    industryPatterns,
  };
}

export async function synthesizeArchitecture(
  intent: ParsedIntent,
  entities: any[],
  constraints: any
): Promise<ArchitectureSynthesis> {
  const projectType = intent.domain?.name || 'general';
  const decision = await localAI.generateArchitectureDecision(projectType, constraints || {});

  const patterns: PatternChoice[] = [];

  patterns.push({
    category: 'State Management',
    chosen: entities.length > 5 ? 'TanStack Query + Context' : 'TanStack Query',
    alternatives: ['Zustand', 'Redux Toolkit', 'Jotai'],
    reason: entities.length > 5
      ? 'Multiple entities benefit from server-state caching plus lightweight client state'
      : 'Server-state caching handles most needs for smaller apps',
  });

  patterns.push({
    category: 'Routing',
    chosen: 'Wouter',
    alternatives: ['React Router', 'TanStack Router'],
    reason: 'Lightweight routing with minimal bundle impact',
  });

  patterns.push({
    category: 'Form Handling',
    chosen: 'React Hook Form + Zod',
    alternatives: ['Formik', 'Final Form'],
    reason: 'Best performance with schema-based validation',
  });

  patterns.push({
    category: 'Styling',
    chosen: 'Tailwind CSS + shadcn/ui',
    alternatives: ['Styled Components', 'CSS Modules', 'Chakra UI'],
    reason: 'Utility-first CSS with pre-built accessible components',
  });

  patterns.push({
    category: 'API Pattern',
    chosen: intent.actions.some(a => a.includes('real-time') || a.includes('chat')) ? 'REST + WebSocket' : 'REST',
    alternatives: ['GraphQL', 'tRPC'],
    reason: 'Standard REST for simplicity with WebSocket for real-time if needed',
  });

  patterns.push({
    category: 'Database',
    chosen: 'PostgreSQL + Drizzle ORM',
    alternatives: ['Prisma', 'TypeORM', 'Sequelize'],
    reason: 'Type-safe SQL with lightweight ORM and excellent PostgreSQL support',
  });

  const archPatterns = templateRegistry.findArchitecturePatterns({
    keywords: [intent.domain?.name || 'general'],
    complexity: intent.complexity.level === 'high' || intent.complexity.level === 'enterprise' ? 'complex' : intent.complexity.level === 'medium' ? 'medium' : 'simple',
  }, 2);

  for (const ap of archPatterns) {
    patterns.push({
      category: 'Architecture Reference',
      chosen: ap.name,
      alternatives: [],
      reason: ap.description,
    });
  }

  const tradeoffs: Tradeoff[] = [
    {
      decision: 'Server-side rendering vs SPA',
      pros: ['Simpler deployment', 'Better client-side interactivity', 'Easier development'],
      cons: ['Slower initial load', 'SEO requires additional setup'],
    },
    {
      decision: 'Monolith vs Microservices',
      pros: ['Simpler architecture', 'Easier debugging', 'Lower operational overhead'],
      cons: ['Harder to scale individual components', 'Coupled deployment'],
    },
  ];

  for (const ap of archPatterns) {
    tradeoffs.push({
      decision: ap.name,
      pros: ap.pros,
      cons: ap.cons,
    });
  }

  return {
    decision,
    patterns,
    constraints: decision.constraints || [],
    tradeoffs,
  };
}

export async function generateAdaptiveUX(
  intent: ParsedIntent,
  entities: any[],
  archetype: ArchetypeMatch | null
): Promise<AdaptiveUXResult> {
  const domain = intent.domain?.name || 'general';
  const entityCount = entities?.length || 0;

  const userType = intent.complexity.level === 'enterprise' ? 'power-user' :
    intent.complexity.level === 'high' ? 'professional' :
    intent.complexity.level === 'medium' ? 'regular' : 'casual';

  let layoutType: keyof typeof LAYOUT_CHOICES = 'crud';
  if (archetype?.templateKey === 'dashboard' || domain === 'analytics') layoutType = 'dashboard';
  else if (archetype?.templateKey === 'chat') layoutType = 'chat';
  else if (archetype?.templateKey === 'blog' || domain === 'education') layoutType = 'content';
  else if (entityCount <= 2) layoutType = 'landing';

  const layout = LAYOUT_CHOICES[layoutType];

  const navItems: NavItem[] = [];
  if (entityCount > 0) {
    navItems.push({ label: 'Dashboard', path: '/', icon: 'LayoutDashboard' });
  }
  for (const entity of (entities || []).slice(0, 8)) {
    const name = entity.name || entity.entityName || 'Item';
    navItems.push({
      label: name + 's',
      path: `/${toKebab(name)}s`,
      icon: inferIcon(name),
    });
  }
  navItems.push({ label: 'Settings', path: '/settings', icon: 'Settings' });

  const colorScheme = DOMAIN_COLORS[domain] || DOMAIN_COLORS['general'];

  const interactions: InteractionPattern[] = [
    { name: 'Create', trigger: 'button-click', response: 'modal-form', component: 'CreateDialog' },
    { name: 'Edit', trigger: 'row-click', response: 'inline-edit', component: 'EditForm' },
    { name: 'Delete', trigger: 'button-click', response: 'confirm-dialog', component: 'DeleteConfirm' },
    { name: 'Search', trigger: 'input-change', response: 'live-filter', component: 'SearchBar' },
    { name: 'Sort', trigger: 'header-click', response: 'column-sort', component: 'SortableHeader' },
  ];

  if (intent.actions.some(a => a.includes('drag') || a.includes('kanban'))) {
    interactions.push({ name: 'Drag & Drop', trigger: 'drag-start', response: 'reorder', component: 'DragContainer' });
  }

  const uiComponents = templateRegistry.findUIComponents(['layout', 'navigation', 'data-display'], [domain], 5);
  for (const comp of uiComponents) {
    interactions.push({
      name: comp.name,
      trigger: 'navigation',
      response: 'render',
      component: comp.name,
    });
  }

  return {
    userType,
    layout,
    navigation: {
      type: entityCount > 5 ? 'sidebar' : 'tabs',
      items: navItems,
      depth: entityCount > 8 ? 2 : 1,
    },
    colorScheme,
    interactions,
    accessibilityLevel: 'WCAG AA',
  };
}

function inferPages(entities: string[], intent: ParsedIntent): string[] {
  const pages = ['Dashboard'];
  for (const entity of entities.slice(0, 6)) {
    pages.push(entity + 's');
  }
  if (intent.actions.some(a => a.includes('auth') || a.includes('login'))) {
    pages.push('Login', 'Register');
  }
  pages.push('Settings');
  return pages;
}

function inferFieldSemantic(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('email')) return 'contact-email';
  if (lower.includes('phone')) return 'contact-phone';
  if (lower.includes('name') && lower.includes('first')) return 'person-first-name';
  if (lower.includes('name') && lower.includes('last')) return 'person-last-name';
  if (lower.includes('name')) return 'identifier-name';
  if (lower.includes('title')) return 'identifier-title';
  if (lower.includes('description')) return 'content-description';
  if (lower.includes('price') || lower.includes('amount') || lower.includes('cost')) return 'financial-amount';
  if (lower.includes('date') || lower.includes('time')) return 'temporal';
  if (lower.includes('status')) return 'state-status';
  if (lower.includes('image') || lower.includes('photo') || lower.includes('avatar')) return 'media-image';
  if (lower.includes('url') || lower.includes('link')) return 'reference-url';
  if (lower.includes('address')) return 'location-address';
  if (lower.includes('password')) return 'auth-password';
  if (lower.includes('role')) return 'auth-role';
  return 'generic';
}

function inferEntityType(name: string, fields: any[]): 'primary' | 'secondary' | 'junction' | 'lookup' {
  const lower = name.toLowerCase();
  const fkCount = fields.filter((f: any) => f.type === 'reference' || f.type === 'foreignKey' || f.references).length;

  if (fkCount >= 2 && fields.length <= fkCount + 3) return 'junction';
  if (lower.includes('category') || lower.includes('type') || lower.includes('status') || lower.includes('tag')) return 'lookup';
  if (fkCount > 0 && fields.length < 5) return 'secondary';
  return 'primary';
}

function inferBehaviors(name: string, fields: any[], actions: string[]): string[] {
  const behaviors: string[] = ['create', 'read', 'update', 'delete'];
  const lower = name.toLowerCase();

  if (fields.some((f: any) => f.name?.includes('status') || f.name?.includes('state'))) {
    behaviors.push('status-transition');
  }
  if (fields.some((f: any) => f.name?.includes('order') || f.name?.includes('position') || f.name?.includes('sort'))) {
    behaviors.push('reorder');
  }
  if (fields.some((f: any) => f.name?.includes('image') || f.name?.includes('file') || f.name?.includes('attachment'))) {
    behaviors.push('file-upload');
  }
  if (lower.includes('user') || lower.includes('account')) {
    behaviors.push('authenticate', 'authorize');
  }
  if (actions.some(a => a.includes('search'))) behaviors.push('search');
  if (actions.some(a => a.includes('export'))) behaviors.push('export');
  if (actions.some(a => a.includes('import'))) behaviors.push('import');

  return behaviors;
}

function findRelatedEntities(name: string, fields: any[], allEntities: any[]): string[] {
  const related: string[] = [];
  const entityNames = allEntities.map((e: any) => (e.name || e.entityName || '').toLowerCase());

  for (const field of fields) {
    const fname = (field.name || '').toLowerCase();
    if (field.references || field.ref || field.foreignKey) {
      const refName = field.references?.table || field.ref || field.foreignKey;
      if (refName) related.push(refName);
    } else if (fname.endsWith('_id') || fname.endsWith('Id')) {
      const entityRef = fname.replace(/_id$/i, '').replace(/Id$/i, '');
      if (entityNames.includes(entityRef.toLowerCase())) {
        const match = allEntities.find((e: any) => (e.name || e.entityName || '').toLowerCase() === entityRef.toLowerCase());
        if (match) related.push(match.name || match.entityName);
      }
    }
  }

  return [...new Set(related)];
}

function inferRelationshipType(
  from: DomainEntity,
  to: DomainEntity
): 'has-many' | 'belongs-to' | 'has-one' | 'many-to-many' {
  if (from.type === 'junction') return 'many-to-many';

  const hasFK = from.fields.some(f =>
    f.name.toLowerCase().includes(to.name.toLowerCase()) && f.name.toLowerCase().endsWith('id')
  );
  if (hasFK) return 'belongs-to';

  const toHasFK = to.fields.some(f =>
    f.name.toLowerCase().includes(from.name.toLowerCase()) && f.name.toLowerCase().endsWith('id')
  );
  if (toHasFK) return 'has-many';

  return 'has-one';
}

function inferIcon(entityName: string): string {
  const lower = entityName.toLowerCase();
  const iconMap: Record<string, string> = {
    user: 'Users', customer: 'Users', employee: 'Users', member: 'Users', person: 'Users',
    product: 'Package', item: 'Package', goods: 'Package',
    order: 'ShoppingCart', cart: 'ShoppingCart', purchase: 'ShoppingCart',
    post: 'FileText', article: 'FileText', blog: 'FileText', content: 'FileText',
    message: 'MessageSquare', chat: 'MessageSquare', comment: 'MessageSquare',
    task: 'CheckSquare', todo: 'CheckSquare',
    project: 'FolderKanban', workspace: 'FolderKanban',
    category: 'Tag', tag: 'Tag', label: 'Tag',
    setting: 'Settings', config: 'Settings',
    report: 'BarChart', metric: 'BarChart', analytics: 'BarChart',
    payment: 'CreditCard', invoice: 'CreditCard', billing: 'CreditCard',
    notification: 'Bell', alert: 'Bell',
    file: 'File', document: 'File', attachment: 'File',
    event: 'Calendar', appointment: 'Calendar', booking: 'Calendar',
    location: 'MapPin', address: 'MapPin', property: 'MapPin',
    review: 'Star', rating: 'Star', feedback: 'Star',
  };

  for (const [key, icon] of Object.entries(iconMap)) {
    if (lower.includes(key)) return icon;
  }
  return 'Circle';
}

function toKebab(str: string): string {
  return str
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-');
}