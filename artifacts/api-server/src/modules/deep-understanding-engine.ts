import { detectDomainFromText, getAllDomains, getDomain, buildEntitiesForModules, buildPagesForModules, buildWorkflowsForEntities } from './domain-knowledge.js';
import type { IndustryDomain, DomainEntity, DomainModule, DomainWorkflow, UserRole } from './domain-knowledge.js';
import { synthesizeDomain, extractEntitiesFromText as nlpExtractEntities, isDomainSynthesized, type NLPEntityExtraction } from './domain-synthesis-engine.js';
import { assessComplexity, identifyInformationGaps, generateClarificationQuestions as generateAdaptiveClarifications, shouldAskMoreQuestions, calculateReadinessScore, formatClarificationMessage, createClarificationState, type ClarificationState, type ClarificationQuestion as AdaptiveClarificationQuestion } from './adaptive-clarification-engine.js';

export interface TechnologyDetectionResult {
  detectedLanguage: string | null;
  detectedFramework: string | null;
  detectedDatabase: string | null;
  confidence: number;
  signals: string[];
}

export interface UnderstandingResult {
  level1_intent: IntentDecomposition;
  level2_domain: DomainDetectionResult;
  level3_entities: EntityExtractionResult;
  level4_workflows: WorkflowDetectionResult;
  level5_clarification: ClarificationResult;
  level6_technology: TechnologyDetectionResult;
  confidence: number;
  readyForPlan: boolean;
}

export interface IntentDecomposition {
  primaryGoal: string;
  applicationType: string;
  targetAudience: string;
  scale: 'small' | 'medium' | 'large' | 'enterprise' | 'unknown';
  keyRequirements: string[];
  impliedFeatures: string[];
  mentionedFeatures: string[];
}

export interface DomainDetectionResult {
  primaryDomain: IndustryDomain | null;
  secondaryDomains: IndustryDomain[];
  confidence: number;
  matchedKeywords: string[];
  detectedModules: string[];
  suggestedModules: string[];
}

export interface EntityExtractionResult {
  mentionedEntities: string[];
  inferredEntities: string[];
  relationships: { from: string; to: string; type: string }[];
  domainEntities: DomainEntity[];
}

export interface WorkflowDetectionResult {
  mentionedWorkflows: string[];
  inferredWorkflows: DomainWorkflow[];
  approvalFlows: string[];
  statusTrackingNeeded: string[];
}

export interface ClarificationResult {
  needsClarification: boolean;
  questions: ClarifyingQuestion[];
  assumptions: string[];
}

export interface ClarifyingQuestion {
  id: string;
  question: string;
  why: string;
  options?: string[];
  defaultAnswer?: string;
  priority: 'critical' | 'important' | 'nice-to-have';
}

const ENTITY_KEYWORDS: Record<string, string[]> = {
  'users': ['user', 'users', 'account', 'accounts', 'login', 'auth', 'sign up', 'register'],
  'employees': ['employee', 'employees', 'staff', 'team', 'worker', 'workforce', 'personnel'],
  'customers': ['customer', 'customers', 'client', 'clients', 'buyer', 'buyers'],
  'products': ['product', 'products', 'item', 'items', 'catalog', 'catalogue', 'goods', 'merchandise'],
  'orders': ['order', 'orders', 'purchase', 'purchases', 'transaction', 'transactions', 'sale', 'sales'],
  'invoices': ['invoice', 'invoices', 'bill', 'bills', 'billing', 'payment', 'payments'],
  'projects': ['project', 'projects', 'engagement', 'engagement'],
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

const WORKFLOW_INDICATORS: Record<string, string[]> = {
  'approval': ['approval', 'approve', 'reject', 'pending', 'submitted', 'review', 'sign off', 'authorize'],
  'status-tracking': ['status', 'track', 'tracking', 'progress', 'lifecycle', 'pipeline', 'stage', 'phase', 'workflow'],
  'order-fulfillment': ['fulfillment', 'fulfill', 'ship', 'deliver', 'dispatch', 'receive'],
  'scheduling': ['schedule', 'scheduling', 'booking', 'calendar', 'availability', 'slot', 'appointment'],
  'billing': ['billing', 'invoice', 'charge', 'payment', 'pay', 'due', 'overdue'],
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

const SCALE_INDICATORS: Record<string, string[]> = {
  'small': ['simple', 'basic', 'small', 'startup', 'mvp', 'minimal', 'quick', 'lightweight', 'solo', 'personal', 'freelance'],
  'medium': ['medium', 'growing', 'team', 'small business', 'smb', 'moderate'],
  'large': ['large', 'enterprise', 'corporation', 'corporate', 'complex', 'comprehensive', 'full-featured', 'complete', 'robust', 'advanced'],
  'enterprise': ['enterprise', 'multi-tenant', 'multi-location', 'global', 'scalable', 'high-availability', 'microservices'],
};

const APP_TYPE_PATTERNS: Record<string, string[]> = {
  'erp': ['erp', 'enterprise resource planning', 'business management', 'all-in-one business'],
  'crm': ['crm', 'customer relationship', 'sales management', 'lead management', 'pipeline'],
  'cms': ['cms', 'content management', 'blog', 'website builder', 'publishing'],
  'lms': ['lms', 'learning management', 'course platform', 'e-learning', 'online learning', 'education platform'],
  'hris': ['hris', 'hr system', 'human resource', 'people management', 'hr management'],
  'pms': ['project management', 'task management', 'project tracker', 'issue tracker'],
  'pos': ['pos', 'point of sale', 'cash register', 'checkout'],
  'wms': ['wms', 'warehouse management', 'inventory management', 'stock management'],
  'tms': ['tms', 'transport management', 'fleet management', 'logistics'],
  'ehr': ['ehr', 'electronic health', 'medical records', 'clinical', 'patient management'],
  'dashboard': ['dashboard', 'analytics', 'reporting tool', 'data visualization', 'admin panel'],
  'marketplace': ['marketplace', 'multi-vendor', 'platform', 'two-sided'],
  'booking': ['booking', 'reservation', 'appointment scheduler', 'calendar booking'],
  'social': ['social', 'community', 'forum', 'chat', 'messaging', 'network'],
  'saas': ['saas', 'subscription', 'multi-tenant', 'platform'],
};

const WELL_KNOWN_APP_PATTERNS: Record<string, { domain: string; modules: string[]; description: string }> = {
  'task manager': { domain: 'project-management', modules: ['Projects', 'Tasks', 'Team', 'Dashboard'], description: 'Task management application' },
  'task tracker': { domain: 'project-management', modules: ['Projects', 'Tasks', 'Team', 'Dashboard'], description: 'Task tracking application' },
  'todo app': { domain: 'project-management', modules: ['Projects', 'Tasks', 'Dashboard'], description: 'Todo list application' },
  'todo list': { domain: 'project-management', modules: ['Projects', 'Tasks', 'Dashboard'], description: 'Todo list application' },
  'project manager': { domain: 'project-management', modules: ['Projects', 'Tasks', 'Team', 'Dashboard'], description: 'Project management application' },
  'project tracker': { domain: 'project-management', modules: ['Projects', 'Tasks', 'Team', 'Dashboard'], description: 'Project tracking application' },
  'issue tracker': { domain: 'project-management', modules: ['Projects', 'Tasks', 'Team', 'Dashboard'], description: 'Issue tracking application' },
  'kanban board': { domain: 'project-management', modules: ['Projects', 'Tasks', 'Dashboard'], description: 'Kanban board application' },
  'blog': { domain: 'project-management', modules: ['Tasks'], description: 'Blog platform' },
  'crm': { domain: 'crm', modules: ['Contacts', 'Deals', 'Pipeline', 'Dashboard'], description: 'CRM application' },
  'inventory manager': { domain: 'inventory', modules: ['Products', 'Stock', 'Dashboard'], description: 'Inventory management application' },
  'inventory tracker': { domain: 'inventory', modules: ['Products', 'Stock', 'Dashboard'], description: 'Inventory tracking application' },
  'invoice app': { domain: 'finance', modules: ['Invoices', 'Clients', 'Dashboard'], description: 'Invoice management application' },
  'expense tracker': { domain: 'finance', modules: ['Expenses', 'Budget', 'Dashboard'], description: 'Expense tracking application' },
  'booking system': { domain: 'restaurant', modules: ['Reservations', 'Dashboard'], description: 'Booking system' },
  'appointment scheduler': { domain: 'healthcare', modules: ['Appointments', 'Patients', 'Dashboard'], description: 'Appointment scheduling application' },
  'recipe app': { domain: 'restaurant', modules: ['Recipes', 'Categories', 'Dashboard'], description: 'Recipe collection application' },
  'recipe collection': { domain: 'restaurant', modules: ['Recipes', 'Categories', 'Dashboard'], description: 'Recipe collection application' },
  'recipe manager': { domain: 'restaurant', modules: ['Recipes', 'Categories', 'Dashboard'], description: 'Recipe management application' },
  'recipe book': { domain: 'restaurant', modules: ['Recipes', 'Categories', 'Dashboard'], description: 'Recipe book application' },
  'cookbook': { domain: 'restaurant', modules: ['Recipes', 'Categories', 'Dashboard'], description: 'Cookbook application' },
  'meal planner': { domain: 'restaurant', modules: ['Meals', 'Recipes', 'Calendar', 'Dashboard'], description: 'Meal planning application' },
  'contact manager': { domain: 'crm', modules: ['Contacts', 'Dashboard'], description: 'Contact management application' },
  'employee directory': { domain: 'hr', modules: ['Employees', 'Departments', 'Dashboard'], description: 'Employee directory application' },
  'employee manager': { domain: 'hr', modules: ['Employees', 'Departments', 'Dashboard'], description: 'Employee management application' },
  'budget tracker': { domain: 'finance', modules: ['Budget', 'Expenses', 'Dashboard'], description: 'Budget tracking application' },
  'portfolio': { domain: 'portfolio', modules: ['Projects', 'About', 'Contact', 'Skills'], description: 'Portfolio website' },
  'portfolio website': { domain: 'portfolio', modules: ['Projects', 'About', 'Contact', 'Skills'], description: 'Portfolio website' },
  'portfolio site': { domain: 'portfolio', modules: ['Projects', 'About', 'Contact', 'Skills'], description: 'Portfolio website' },
  'personal portfolio': { domain: 'portfolio', modules: ['Projects', 'About', 'Contact', 'Skills'], description: 'Personal portfolio website' },
  'personal website': { domain: 'portfolio', modules: ['Projects', 'About', 'Contact', 'Skills'], description: 'Personal website' },
  'landing page': { domain: 'landing-page', modules: ['Hero', 'Features', 'Pricing', 'FAQ', 'CTA'], description: 'Landing page' },
  'chat app': { domain: 'chat-messaging', modules: ['Messages', 'Conversations', 'Users', 'Dashboard'], description: 'Chat application' },
  'chat application': { domain: 'chat-messaging', modules: ['Messages', 'Conversations', 'Users', 'Dashboard'], description: 'Chat application' },
  'messaging app': { domain: 'chat-messaging', modules: ['Messages', 'Conversations', 'Users', 'Dashboard'], description: 'Messaging application' },
  'ecommerce': { domain: 'retail', modules: ['Products', 'Cart', 'Checkout', 'Orders', 'Dashboard'], description: 'E-commerce store' },
  'online store': { domain: 'retail', modules: ['Products', 'Cart', 'Checkout', 'Orders', 'Dashboard'], description: 'Online store' },
  'e-commerce': { domain: 'retail', modules: ['Products', 'Cart', 'Checkout', 'Orders', 'Dashboard'], description: 'E-commerce store' },
  'fitness tracker': { domain: 'fitness', modules: ['Workouts', 'Exercises', 'Goals', 'Dashboard'], description: 'Fitness tracking application' },
  'workout tracker': { domain: 'fitness', modules: ['Workouts', 'Exercises', 'Goals', 'Dashboard'], description: 'Workout tracking application' },
  'social media': { domain: 'social-network', modules: ['Profiles', 'Posts', 'Feed', 'Followers'], description: 'Social media platform' },
  'social network': { domain: 'social-network', modules: ['Profiles', 'Posts', 'Feed', 'Followers'], description: 'Social network' },
  'job board': { domain: 'job-board', modules: ['Jobs', 'Applications', 'Companies', 'Dashboard'], description: 'Job board platform' },
  'marketplace': { domain: 'marketplace', modules: ['Listings', 'Orders', 'Users', 'Dashboard'], description: 'Marketplace platform' },
  'wiki': { domain: 'documentation', modules: ['Articles', 'Categories', 'Search', 'Dashboard'], description: 'Wiki/knowledge base' },
  'knowledge base': { domain: 'documentation', modules: ['Articles', 'Categories', 'Search', 'Dashboard'], description: 'Knowledge base' },
  'analytics dashboard': { domain: 'analytics', modules: ['Charts', 'Metrics', 'Reports', 'Dashboard'], description: 'Analytics dashboard' },
  'admin dashboard': { domain: 'saas-dashboard', modules: ['Charts', 'Metrics', 'Reports', 'Dashboard'], description: 'Admin dashboard' },
};

const WELL_KNOWN_APP_SIGNALS: string[] = Object.keys(WELL_KNOWN_APP_PATTERNS);

function isWellKnownApp(text: string): string | null {
  const lower = text.toLowerCase().replace(/^(create|build|make|develop|design|i want|i need|give me|generate)\s+(a|an|the|me\s+a|me\s+an)?\s*/i, '').trim();
  
  // Exact match or app/application suffix
  for (const pattern of WELL_KNOWN_APP_SIGNALS) {
    if (lower === pattern || lower === `${pattern} app` || lower === `${pattern} application` ||
        lower.startsWith(`${pattern} to `) || lower.startsWith(`${pattern} for `) ||
        lower.startsWith(`${pattern} that `) || lower.startsWith(`${pattern} with `)) {
      return pattern;
    }
  }

  // Partial match using signals
  for (const pattern of WELL_KNOWN_APP_SIGNALS) {
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const boundary = new RegExp(`(?:^|\\s|[^a-z])${escaped}(?:$|\\s|[^a-z])`, 'i');
    if (boundary.test(lower)) {
      return pattern;
    }
  }
  return null;
}

export function analyzeRequest(userMessage: string, conversationContext?: string, clarificationRound: number = 0): UnderstandingResult {
  const fullText = conversationContext ? `${conversationContext} ${userMessage}` : userMessage;
  const lower = fullText.toLowerCase();

  const level1 = decomposeIntent(lower, userMessage);
  const level2 = detectDomain(lower, level1, fullText);
  const level3 = extractEntities(lower, level2, level1);
  const level4 = detectWorkflows(lower, level3, level2);

  const wellKnownMatch = isWellKnownApp(userMessage);
  const isSimpleRequest = userMessage.split(/\s+/).length <= 15;

  const level6 = detectTechnology(lower);

  if (wellKnownMatch && isSimpleRequest && clarificationRound === 0) {
    const appInfo = WELL_KNOWN_APP_PATTERNS[wellKnownMatch];
    const assumptions: string[] = [];
    if (level2.primaryDomain) {
      assumptions.push(`This is for the ${level2.primaryDomain.name} industry`);
    }
    assumptions.push(`Well-known app type: ${appInfo.description}`);
    if (level2.detectedModules.length > 0) {
      assumptions.push(`Key modules: ${level2.detectedModules.join(', ')}`);
    } else {
      assumptions.push(`Key modules: ${appInfo.modules.join(', ')}`);
    }
    const allEntities = [...level3.mentionedEntities, ...level3.inferredEntities];
    if (allEntities.length > 0) {
      assumptions.push(`Key data: ${allEntities.slice(0, 5).join(', ')}`);
    }

    const boostedConfidence = Math.max(calculateOverallConfidence(level1, level2, level3, level4), 0.85);

    return {
      level1_intent: level1,
      level2_domain: { ...level2, confidence: Math.max(level2.confidence, 0.8) },
      level3_entities: level3,
      level4_workflows: level4,
      level5_clarification: { needsClarification: false, questions: [], assumptions },
      level6_technology: level6,
      confidence: boostedConfidence,
      readyForPlan: true,
    };
  }

  const highConfidenceDomain = level2.primaryDomain && level2.confidence >= 0.70 && isSimpleRequest && clarificationRound === 0;
  if (highConfidenceDomain) {
    const assumptions: string[] = [];
    assumptions.push(`This is for the ${level2.primaryDomain!.name} industry`);
    if (level2.detectedModules.length > 0) {
      assumptions.push(`Key modules: ${level2.detectedModules.join(', ')}`);
    } else if (level2.suggestedModules.length > 0) {
      assumptions.push(`Suggested modules: ${level2.suggestedModules.slice(0, 5).join(', ')}`);
    }
    const allEntities = [...level3.mentionedEntities, ...level3.inferredEntities];
    if (allEntities.length > 0) {
      assumptions.push(`Key data: ${allEntities.slice(0, 5).join(', ')}`);
    }

    const boostedConfidence = Math.max(calculateOverallConfidence(level1, level2, level3, level4), 0.85);

    return {
      level1_intent: level1,
      level2_domain: { ...level2, confidence: Math.max(level2.confidence, 0.8) },
      level3_entities: level3,
      level4_workflows: level4,
      level5_clarification: { needsClarification: false, questions: [], assumptions },
      level6_technology: level6,
      confidence: boostedConfidence,
      readyForPlan: true,
    };
  }

  const level5 = generateClarifications(level1, level2, level3, level4, userMessage, clarificationRound);

  const confidence = calculateOverallConfidence(level1, level2, level3, level4);
  const readyForPlan = confidence >= 0.65 && !level5.needsClarification;

  return {
    level1_intent: level1,
    level2_domain: level2,
    level3_entities: level3,
    level4_workflows: level4,
    level5_clarification: level5,
    level6_technology: level6,
    confidence,
    readyForPlan,
  };
}

function decomposeIntent(lower: string, original: string): IntentDecomposition {
  let applicationType = 'web application';
  for (const [type, patterns] of Object.entries(APP_TYPE_PATTERNS)) {
    if (patterns.some(p => lower.includes(p))) {
      applicationType = type;
      break;
    }
  }

  let scale: IntentDecomposition['scale'] = 'unknown';
  for (const [s, indicators] of Object.entries(SCALE_INDICATORS)) {
    if (indicators.some(i => lower.includes(i))) {
      scale = s as IntentDecomposition['scale'];
      break;
    }
  }

  const mentionedFeatures: string[] = [];
  for (const [feature, keywords] of Object.entries(FEATURE_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) {
      mentionedFeatures.push(feature);
    }
  }

  const impliedFeatures: string[] = [];
  if (['erp', 'crm', 'hris', 'pms'].includes(applicationType)) {
    impliedFeatures.push('role-based', 'charts', 'export', 'search');
  }
  if (['pos', 'marketplace', 'booking'].includes(applicationType)) {
    impliedFeatures.push('search', 'notification');
  }
  if (scale === 'large' || scale === 'enterprise') {
    impliedFeatures.push('role-based', 'export', 'api');
  }

  const keyRequirements: string[] = [];
  const requirementPatterns = [
    /(?:need|want|require|must have|should have|with)\s+(.+?)(?:\.|,|$)/gi,
    /(?:track|manage|handle|support)\s+(.+?)(?:\.|,|$)/gi,
    /(?:features?|functionality|capabilities?)\s*(?:like|such as|including)?\s*:?\s*(.+?)(?:\.|$)/gi,
  ];
  for (const pattern of requirementPatterns) {
    let match;
    while ((match = pattern.exec(original)) !== null) {
      const req = match[1].trim();
      if (req.length > 3 && req.length < 100) {
        keyRequirements.push(req);
      }
    }
  }

  let targetAudience = 'internal team';
  if (lower.includes('customer') || lower.includes('public') || lower.includes('user-facing') || lower.includes('consumer')) {
    targetAudience = 'external customers';
  } else if (lower.includes('admin') || lower.includes('internal') || lower.includes('back office') || lower.includes('operations')) {
    targetAudience = 'internal team';
  } else if (lower.includes('both') || lower.includes('customer portal') || lower.includes('self-service')) {
    targetAudience = 'both internal and external';
  }

  let primaryGoal = `Build a ${applicationType}`;
  if (keyRequirements.length > 0) {
    primaryGoal += ` with ${keyRequirements.slice(0, 3).join(', ')}`;
  }

  return { primaryGoal, applicationType, targetAudience, scale, keyRequirements, impliedFeatures, mentionedFeatures };
}

function extractPrimaryIntentPhrase(text: string): string {
  const sentences = text.split(/[.!?\n]+/).filter(s => s.trim().length > 5);
  if (sentences.length === 0) return text;
  const first = sentences[0].toLowerCase().trim();
  const buildPrefix = first.match(/^(?:build|create|make|develop|design|i want|i need|give me|generate)\s+(?:a|an|the|me\s+a|me\s+an)?\s*(.+)/i);
  return buildPrefix ? buildPrefix[1].trim() : first;
}

function detectDomain(lower: string, intent: IntentDecomposition, originalText?: string): DomainDetectionResult {
  const primaryPhrase = extractPrimaryIntentPhrase(originalText || lower);
  const primaryMatches = detectDomainFromText(primaryPhrase);
  const fullMatches = detectDomainFromText(lower);

  const domainScores = new Map<string, { domain: IndustryDomain; score: number; keywords: string[] }>();

  for (const pm of primaryMatches) {
    domainScores.set(pm.domain.id, {
      domain: pm.domain,
      score: pm.confidence * 2.0,
      keywords: pm.matchedKeywords,
    });
  }

  for (const fm of fullMatches) {
    const existing = domainScores.get(fm.domain.id);
    if (existing) {
      existing.score += fm.confidence * 0.5;
      for (const kw of fm.matchedKeywords) {
        if (!existing.keywords.includes(kw)) existing.keywords.push(kw);
      }
    } else {
      domainScores.set(fm.domain.id, {
        domain: fm.domain,
        score: fm.confidence * 0.5,
        keywords: fm.matchedKeywords,
      });
    }
  }

  const domainMatches = Array.from(domainScores.values())
    .sort((a, b) => b.score - a.score)
    .map(entry => ({
      domain: entry.domain,
      confidence: Math.min(entry.score, 1),
      matchedKeywords: entry.keywords,
    }));

  if (domainMatches.length === 0) {
    const synthesized = synthesizeDomain(originalText || lower);
    if (synthesized) {
      const allSynModules = synthesized.modules.map(m => m.name);
      const matchedSynModules = synthesized.modules
        .filter(m => {
          const modKeywords = [...m.entities.map(e => e.toLowerCase()), m.name.toLowerCase()];
          return modKeywords.some(k => lower.includes(k));
        })
        .map(m => m.name);
      const detectedSynModules = matchedSynModules.length > 0 ? matchedSynModules : allSynModules;
      const suggestedSynModules = allSynModules.filter(m => !detectedSynModules.includes(m));
      return {
        primaryDomain: synthesized,
        secondaryDomains: [],
        confidence: isDomainSynthesized(synthesized) ? 0.5 : 0.4,
        matchedKeywords: [],
        detectedModules: detectedSynModules,
        suggestedModules: suggestedSynModules,
      };
    }
    return {
      primaryDomain: null,
      secondaryDomains: [],
      confidence: 0,
      matchedKeywords: [],
      detectedModules: [],
      suggestedModules: [],
    };
  }

  let primaryDomain = domainMatches[0].domain;
  let secondaryDomains = domainMatches.slice(1, 3).map(m => m.domain);
  let matchedKeywords = domainMatches.flatMap(m => m.matchedKeywords);
  let confidence = domainMatches[0].confidence;

  if (domainMatches.length >= 2) {
    const top = domainMatches[0];
    const second = domainMatches[1];
    if (Math.abs(top.confidence - second.confidence) <= 0.15) {
      const secondaryModuleNames = second.domain.modules.map(m => m.name);
      const primaryModuleNames = primaryDomain.modules.map(m => m.name);
      const mergedModules = [...primaryDomain.modules];
      for (const mod of second.domain.modules) {
        if (!primaryModuleNames.includes(mod.name)) {
          mergedModules.push(mod);
        }
      }
      const primaryEntityNames = primaryDomain.entities.map(e => e.name);
      const mergedEntities = [...primaryDomain.entities];
      for (const ent of second.domain.entities) {
        if (!primaryEntityNames.includes(ent.name)) {
          mergedEntities.push(ent);
        }
      }
      primaryDomain = {
        ...primaryDomain,
        modules: mergedModules,
        entities: mergedEntities,
      };
      if (!secondaryDomains.find(d => d.id === second.domain.id)) {
        secondaryDomains = [second.domain, ...secondaryDomains.filter(d => d.id !== second.domain.id)].slice(0, 3);
      }
    }
  }

  let detectedModules: string[] = [];
  let suggestedModules: string[] = [];

  detectedModules = primaryDomain.modules
    .filter(m => {
      const modKeywords = [...m.entities.map(e => e.toLowerCase()), m.name.toLowerCase()];
      return modKeywords.some(k => lower.includes(k));
    })
    .map(m => m.name);

  // Supplement detected modules with core domain modules to build a complete app.
  // When confidence is high, we include Dashboard + related core modules even if not
  // explicitly mentioned — e.g. "task manager" implies Projects, Team, and a Dashboard.
  if (confidence >= 0.6 && detectedModules.length > 0) {
    // Always include Dashboard / Overview if the domain has one
    const dashboardMod = primaryDomain.modules.find(m =>
      m.name.toLowerCase() === 'dashboard' || m.name.toLowerCase() === 'overview'
    );
    if (dashboardMod && !detectedModules.includes(dashboardMod.name)) {
      detectedModules.push(dashboardMod.name);
    }

    // Count entity-bearing modules already in the selection
    const detectedEntityModCount = detectedModules.filter(d =>
      primaryDomain.modules.find(m => m.name === d && m.entities.length > 0)
    ).length;

    // If fewer than 3 entity modules detected, add core ones to flesh out the app
    if (detectedEntityModCount < 3) {
      const additionalModules = primaryDomain.modules
        .filter(m => !detectedModules.includes(m.name) && m.entities.length > 0)
        .slice(0, 3 - detectedEntityModCount);
      for (const mod of additionalModules) {
        if (detectedModules.length < 6) {
          detectedModules.push(mod.name);
        }
      }
    }
  }

  suggestedModules = primaryDomain.modules
    .filter(m => !detectedModules.includes(m.name))
    .map(m => m.name);

  if (detectedModules.length === 0) {
    if (intent.applicationType === 'erp' || lower.includes('full') || lower.includes('complete') || lower.includes('everything')) {
      detectedModules = primaryDomain.modules.map(m => m.name);
      suggestedModules = [];
    } else {
      const coreModules = primaryDomain.modules.filter(m =>
        m.name.toLowerCase().includes('dashboard') ||
        m.entities.length > 0
      );
      suggestedModules = coreModules.map(m => m.name);
    }
  }

  return { primaryDomain, secondaryDomains, confidence, matchedKeywords, detectedModules, suggestedModules };
}

function extractEntities(lower: string, domainResult: DomainDetectionResult, intent: IntentDecomposition): EntityExtractionResult {
  const mentionedEntities: string[] = [];
  for (const [entity, keywords] of Object.entries(ENTITY_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) {
      mentionedEntities.push(entity);
    }
  }

  const entityCaps: Record<string, number> = {
    'small': 4,
    'medium': 8,
    'large': 12,
    'enterprise': 12,
    'unknown': 6,
  };
  const maxEntities = entityCaps[intent.scale] || 6;

  const inferredEntities: string[] = [];
  const domain = domainResult.primaryDomain;
  if (domain) {
    const selectedModules = domainResult.detectedModules.length > 0
      ? domainResult.detectedModules
      : domain.modules.slice(0, 5).map(m => m.name);

    const domainEntities = buildEntitiesForModules(domain, selectedModules);
    for (const de of domainEntities) {
      const entityKey = de.name.toLowerCase();
      if (!mentionedEntities.includes(entityKey)) {
        inferredEntities.push(de.name);
      }
    }
  } else {
    const irrelevantForContext: Record<string, string[]> = {
      'restaurant': ['vehicles', 'shipments', 'tenants', 'properties', 'patients', 'courses', 'students', 'deals', 'contracts'],
      'school': ['vehicles', 'shipments', 'tenants', 'properties', 'patients', 'menu', 'deals', 'inventory'],
      'hospital': ['vehicles', 'shipments', 'tenants', 'properties', 'menu', 'deals', 'students', 'courses', 'inventory'],
      'hotel': ['vehicles', 'patients', 'courses', 'students', 'deals', 'shipments', 'contracts'],
      'store': ['vehicles', 'patients', 'courses', 'students', 'tenants', 'properties', 'contracts', 'timesheets'],
      'clinic': ['vehicles', 'shipments', 'tenants', 'properties', 'menu', 'deals', 'students', 'courses', 'inventory'],
      'gym': ['vehicles', 'shipments', 'tenants', 'properties', 'patients', 'courses', 'contracts', 'menu', 'deals'],
      'fitness': ['vehicles', 'shipments', 'tenants', 'properties', 'patients', 'courses', 'contracts', 'menu', 'deals'],
      'salon': ['vehicles', 'shipments', 'tenants', 'properties', 'patients', 'courses', 'students', 'contracts', 'inventory'],
      'spa': ['vehicles', 'shipments', 'tenants', 'properties', 'patients', 'courses', 'students', 'contracts', 'inventory'],
      'warehouse': ['patients', 'courses', 'students', 'tenants', 'properties', 'menu', 'deals', 'appointments', 'leave'],
      'farm': ['tenants', 'properties', 'patients', 'courses', 'students', 'deals', 'contracts', 'menu'],
      'library': ['vehicles', 'shipments', 'tenants', 'properties', 'patients', 'menu', 'deals', 'inventory', 'payroll'],
      'church': ['vehicles', 'shipments', 'tenants', 'properties', 'patients', 'inventory', 'deals', 'contracts', 'payroll'],
      'nonprofit': ['vehicles', 'shipments', 'tenants', 'properties', 'patients', 'inventory', 'menu', 'payroll'],
      'garage': ['tenants', 'properties', 'patients', 'courses', 'students', 'menu', 'deals', 'payroll'],
      'bakery': ['vehicles', 'shipments', 'tenants', 'properties', 'patients', 'courses', 'students', 'deals', 'contracts'],
      'pharmacy': ['vehicles', 'shipments', 'tenants', 'properties', 'courses', 'students', 'deals', 'contracts', 'menu'],
      'daycare': ['vehicles', 'shipments', 'tenants', 'properties', 'deals', 'contracts', 'menu', 'inventory', 'payroll'],
      'veterinary': ['tenants', 'properties', 'courses', 'students', 'deals', 'contracts', 'menu', 'payroll'],
    };

    let excludeEntities: string[] = [];
    for (const [contextKey, excluded] of Object.entries(irrelevantForContext)) {
      if (lower.includes(contextKey)) {
        excludeEntities = [...excludeEntities, ...excluded];
      }
    }

    for (const [entity, keywords] of Object.entries(ENTITY_KEYWORDS)) {
      if (!mentionedEntities.includes(entity) && !excludeEntities.includes(entity)) {
        const relevanceScore = keywords.filter(k => lower.includes(k)).length;
        if (relevanceScore >= 2) {
          inferredEntities.push(entity);
        }
      }
    }
  }

  if (inferredEntities.length > maxEntities) {
    inferredEntities.splice(maxEntities);
  }

  const relationships: { from: string; to: string; type: string }[] = [];
  if (domain) {
    for (const entity of domain.entities) {
      if (entity.relationships) {
        for (const rel of entity.relationships) {
          relationships.push({
            from: entity.name,
            to: rel.entity,
            type: rel.type,
          });
        }
      }
    }
  }

  const effectiveModules = domainResult.detectedModules.length > 0
    ? domainResult.detectedModules
    : domain ? domain.modules.slice(0, 5).map(m => m.name) : [];
  const domainEntities = domain
    ? buildEntitiesForModules(domain, effectiveModules)
    : [];

  return { mentionedEntities, inferredEntities, relationships, domainEntities };
}

function detectWorkflows(lower: string, entityResult: EntityExtractionResult, domainResult: DomainDetectionResult): WorkflowDetectionResult {
  const mentionedWorkflows: string[] = [];
  for (const [workflow, indicators] of Object.entries(WORKFLOW_INDICATORS)) {
    if (indicators.some(i => lower.includes(i))) {
      mentionedWorkflows.push(workflow);
    }
  }

  const domain = domainResult.primaryDomain;
  const allEntityNames = [...entityResult.mentionedEntities, ...entityResult.inferredEntities];
  const inferredWorkflows: DomainWorkflow[] = domain ? buildWorkflowsForEntities(domain, allEntityNames.map(e => {
    const de = domain.entities.find(d => d.name.toLowerCase() === e.toLowerCase());
    return de ? de.name : e;
  })) : [];

  if (domain && inferredWorkflows.length === 0) {
    const allEntityNames = [...entityResult.mentionedEntities, ...entityResult.inferredEntities];
    const relevantWorkflows = domain.workflows
      .filter(w => allEntityNames.some(e => w.entity.toLowerCase().includes(e.toLowerCase()) || e.toLowerCase().includes(w.entity.toLowerCase())))
      .slice(0, 3);
    if (relevantWorkflows.length > 0) {
      inferredWorkflows.push(...relevantWorkflows);
    } else {
      inferredWorkflows.push(...domain.workflows.slice(0, 3));
    }
  }

  const approvalFlows: string[] = [];
  const statusTrackingNeeded: string[] = [];
  if (lower.includes('approval') || lower.includes('approve')) {
    approvalFlows.push('approval-workflow');
  }
  const STATUS_FIELD_NAMES = ['status', 'state', 'phase', 'stage', 'condition'];
  for (const entity of entityResult.domainEntities) {
    const hasStatus = entity.fields.some(f => f.type.startsWith('enum:') && STATUS_FIELD_NAMES.includes(f.name));
    if (hasStatus) {
      statusTrackingNeeded.push(entity.name);
    }
  }

  if (!domain && inferredWorkflows.length === 0) {
    const ENTITY_WORKFLOW_TEMPLATES: Record<string, { states: string[]; transitions: { from: string; to: string; action: string }[] }> = {
      'orders': { states: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'], transitions: [{ from: 'pending', to: 'confirmed', action: 'Confirm' }, { from: 'confirmed', to: 'processing', action: 'Process' }, { from: 'processing', to: 'shipped', action: 'Ship' }, { from: 'shipped', to: 'delivered', action: 'Deliver' }, { from: 'pending', to: 'cancelled', action: 'Cancel' }] },
      'tasks': { states: ['open', 'in-progress', 'review', 'done', 'closed'], transitions: [{ from: 'open', to: 'in-progress', action: 'Start' }, { from: 'in-progress', to: 'review', action: 'Submit for Review' }, { from: 'review', to: 'done', action: 'Approve' }, { from: 'review', to: 'in-progress', action: 'Request Changes' }, { from: 'done', to: 'closed', action: 'Close' }] },
      'projects': { states: ['planning', 'active', 'on-hold', 'completed', 'archived'], transitions: [{ from: 'planning', to: 'active', action: 'Start' }, { from: 'active', to: 'on-hold', action: 'Pause' }, { from: 'on-hold', to: 'active', action: 'Resume' }, { from: 'active', to: 'completed', action: 'Complete' }, { from: 'completed', to: 'archived', action: 'Archive' }] },
      'invoices': { states: ['draft', 'sent', 'paid', 'overdue', 'cancelled', 'void'], transitions: [{ from: 'draft', to: 'sent', action: 'Send' }, { from: 'sent', to: 'paid', action: 'Mark Paid' }, { from: 'sent', to: 'overdue', action: 'Mark Overdue' }, { from: 'overdue', to: 'paid', action: 'Mark Paid' }, { from: 'draft', to: 'cancelled', action: 'Cancel' }, { from: 'sent', to: 'void', action: 'Void' }] },
      'appointments': { states: ['requested', 'confirmed', 'in-progress', 'completed', 'no-show', 'cancelled'], transitions: [{ from: 'requested', to: 'confirmed', action: 'Confirm' }, { from: 'confirmed', to: 'in-progress', action: 'Check In' }, { from: 'in-progress', to: 'completed', action: 'Complete' }, { from: 'confirmed', to: 'no-show', action: 'Mark No-Show' }, { from: 'requested', to: 'cancelled', action: 'Cancel' }] },
      'leave': { states: ['draft', 'submitted', 'approved', 'rejected', 'cancelled'], transitions: [{ from: 'draft', to: 'submitted', action: 'Submit' }, { from: 'submitted', to: 'approved', action: 'Approve' }, { from: 'submitted', to: 'rejected', action: 'Reject' }, { from: 'draft', to: 'cancelled', action: 'Cancel' }] },
      'contracts': { states: ['draft', 'review', 'negotiation', 'signed', 'active', 'expired', 'terminated'], transitions: [{ from: 'draft', to: 'review', action: 'Submit for Review' }, { from: 'review', to: 'negotiation', action: 'Negotiate' }, { from: 'negotiation', to: 'signed', action: 'Sign' }, { from: 'signed', to: 'active', action: 'Activate' }, { from: 'active', to: 'expired', action: 'Expire' }, { from: 'active', to: 'terminated', action: 'Terminate' }] },
      'shipments': { states: ['created', 'picked-up', 'in-transit', 'out-for-delivery', 'delivered', 'returned'], transitions: [{ from: 'created', to: 'picked-up', action: 'Pick Up' }, { from: 'picked-up', to: 'in-transit', action: 'Ship' }, { from: 'in-transit', to: 'out-for-delivery', action: 'Out for Delivery' }, { from: 'out-for-delivery', to: 'delivered', action: 'Deliver' }, { from: 'out-for-delivery', to: 'returned', action: 'Return' }] },
      'deals': { states: ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'], transitions: [{ from: 'lead', to: 'qualified', action: 'Qualify' }, { from: 'qualified', to: 'proposal', action: 'Send Proposal' }, { from: 'proposal', to: 'negotiation', action: 'Negotiate' }, { from: 'negotiation', to: 'won', action: 'Win' }, { from: 'negotiation', to: 'lost', action: 'Lose' }] },
    };
    const DEFAULT_WORKFLOW = { states: ['draft', 'active', 'completed', 'cancelled'], transitions: [{ from: 'draft', to: 'active', action: 'Activate' }, { from: 'active', to: 'completed', action: 'Complete' }, { from: 'active', to: 'cancelled', action: 'Cancel' }] };
    const statusEntities = Object.keys(ENTITY_WORKFLOW_TEMPLATES);
    for (const entityName of allEntityNames) {
      const lowerEntity = entityName.toLowerCase();
      if (statusEntities.includes(lowerEntity) || statusEntities.some(se => lowerEntity.includes(se.replace(/s$/, '')))) {
        const capitalizedName = entityName.charAt(0).toUpperCase() + entityName.slice(1);
        const template = ENTITY_WORKFLOW_TEMPLATES[lowerEntity] || DEFAULT_WORKFLOW;
        inferredWorkflows.push({
          name: `${capitalizedName} Status Tracking`,
          entity: capitalizedName,
          states: template.states,
          transitions: template.transitions,
        });
        approvalFlows.push(`${entityName}-approval`);
      }
    }
  }

  return { mentionedWorkflows, inferredWorkflows, approvalFlows, statusTrackingNeeded };
}

function generateClarifications(
  intent: IntentDecomposition,
  domain: DomainDetectionResult,
  entities: EntityExtractionResult,
  workflows: WorkflowDetectionResult,
  originalMessage: string,
  clarificationRound: number = 0
): ClarificationResult {
  const assumptions: string[] = [];

  const nlpExtracted = nlpExtractEntities(originalMessage.toLowerCase());

  const detectedDomains = domain.primaryDomain
    ? [{ confidence: domain.confidence, name: domain.primaryDomain.name }]
    : [];

  const complexity = assessComplexity(originalMessage, nlpExtracted, detectedDomains);

  if (clarificationRound >= complexity.maxRounds) {
    if (!domain.primaryDomain) {
      const synthesized = synthesizeDomain(originalMessage);
      if (synthesized) {
        assumptions.push(`Detected custom domain: ${synthesized.name}`);
      } else {
        assumptions.push('Assuming general-purpose business application');
      }
    } else {
      assumptions.push(`This is for the ${domain.primaryDomain.name} industry`);
    }
    if (intent.scale === 'unknown') {
      assumptions.push('Scale: medium (default assumption)');
    } else {
      assumptions.push(`Scale: ${intent.scale}`);
    }
    if (domain.detectedModules.length > 0) {
      assumptions.push(`Key modules: ${domain.detectedModules.join(', ')}`);
    } else if (domain.suggestedModules.length > 0) {
      assumptions.push(`Will include suggested modules: ${domain.suggestedModules.slice(0, 5).join(', ')}`);
    }
    const allEntities = [...entities.mentionedEntities, ...entities.inferredEntities];
    if (allEntities.length > 0) {
      assumptions.push(`Key data: ${allEntities.slice(0, 5).join(', ')}`);
    } else if (nlpExtracted.entities.length > 0) {
      assumptions.push(`Inferred data: ${nlpExtracted.entities.map(e => e.name).slice(0, 5).join(', ')}`);
    } else {
      assumptions.push('Will include standard data entities based on application type');
    }
    return { needsClarification: false, questions: [], assumptions };
  }

  const answeredMap = new Map<string, string>();

  if (clarificationRound > 0) {
    if (entities.mentionedEntities.length > 0) {
      answeredMap.set('q-entities', entities.mentionedEntities.join(', '));
    }
    if (domain.primaryDomain) {
      answeredMap.set('q-scope', domain.primaryDomain.name);
    }
    if (workflows.inferredWorkflows.length > 0) {
      answeredMap.set('q-workflows', workflows.inferredWorkflows.map(w => w.name).join(', '));
    }
    if (intent.targetAudience !== 'internal team') {
      answeredMap.set('q-roles', intent.targetAudience);
    }
  }

  const gaps = identifyInformationGaps(originalMessage, nlpExtracted, complexity);
  const readiness = calculateReadinessScore(nlpExtracted, gaps, answeredMap);

  if (readiness >= 0.85) {
    if (domain.primaryDomain) {
      assumptions.push(`This is for the ${domain.primaryDomain.name} industry`);
    }
    if (intent.scale !== 'unknown') {
      assumptions.push(`Scale: ${intent.scale}`);
    }
    const allEntities = [...entities.mentionedEntities, ...entities.inferredEntities];
    if (allEntities.length > 0) {
      assumptions.push(`Key data: ${allEntities.slice(0, 5).join(', ')}`);
    }
    return { needsClarification: false, questions: [], assumptions };
  }

  const adaptiveQuestions = generateAdaptiveClarifications(gaps, complexity, nlpExtracted, answeredMap);

  const questions: ClarifyingQuestion[] = adaptiveQuestions.map((aq, i) => ({
    id: aq.id,
    question: aq.question,
    why: aq.context,
    options: aq.options,
    defaultAnswer: aq.defaultAnswer,
    priority: aq.impact === 'critical' ? 'critical' as const :
              aq.impact === 'high' ? 'important' as const : 'nice-to-have' as const,
  }));

  if (complexity.level === 'trivial') {
    if (domain.primaryDomain) assumptions.push(`This is for the ${domain.primaryDomain.name} industry`);
    if (intent.scale !== 'unknown') assumptions.push(`Scale: ${intent.scale}`);
    const allEntities = [...entities.mentionedEntities, ...entities.inferredEntities];
    if (allEntities.length > 0) {
      assumptions.push(`Key data: ${allEntities.slice(0, 5).join(', ')}`);
    }
    return { needsClarification: false, questions: [], assumptions };
  }

  if (domain.primaryDomain) {
    assumptions.push(`Industry: ${domain.primaryDomain.name} (${Math.round(domain.confidence * 100)}% confidence)`);
  }
  if (intent.scale !== 'unknown') {
    assumptions.push(`Scale: ${intent.scale}`);
  }
  if (domain.detectedModules.length > 0) {
    assumptions.push(`Detected modules: ${domain.detectedModules.join(', ')}`);
  }
  if (entities.inferredEntities.length > 0) {
    assumptions.push(`Key data: ${entities.inferredEntities.slice(0, 5).join(', ')}`);
  }

  const criticalCount = questions.filter(q => q.priority === 'critical').length;
  const needsClarification = criticalCount > 0;

  return { needsClarification, questions, assumptions };
}

function calculateOverallConfidence(
  intent: IntentDecomposition,
  domain: DomainDetectionResult,
  entities: EntityExtractionResult,
  workflows: WorkflowDetectionResult
): number {
  let score = 0;

  if (domain.primaryDomain) score += 0.3;
  if (domain.confidence > 0.5) score += 0.1;

  if (intent.applicationType !== 'web application') score += 0.1;
  if (intent.scale !== 'unknown') score += 0.05;
  if (intent.keyRequirements.length > 0) score += 0.1;
  if (intent.mentionedFeatures.length > 0) score += 0.05;

  const totalEntities = entities.mentionedEntities.length + entities.inferredEntities.length;
  if (totalEntities > 0) score += 0.1;
  if (totalEntities > 3) score += 0.1;

  if (workflows.inferredWorkflows.length > 0) score += 0.05;
  if (domain.detectedModules.length > 0) score += 0.05;

  return Math.min(score, 1);
}

export function processAnswer(
  previousResult: UnderstandingResult,
  userAnswer: string,
  questionId: string
): UnderstandingResult {
  const lower = userAnswer.toLowerCase();
  const result = { ...previousResult };

  if (questionId === 'domain') {
    const domainMatches = detectDomainFromText(lower);
    if (domainMatches.length > 0) {
      const domain = domainMatches[0].domain;
      result.level2_domain = { ...result.level2_domain };
      result.level2_domain.primaryDomain = domain;
      result.level2_domain.confidence = domainMatches[0].confidence;
      result.level2_domain.matchedKeywords = domainMatches[0].matchedKeywords;
      result.level2_domain.suggestedModules = domain.modules.map(m => m.name);
    }
  }

  if (questionId === 'scale') {
    result.level1_intent = { ...result.level1_intent };
    if (lower.includes('just me') || lower.includes('1-5')) result.level1_intent.scale = 'small';
    else if (lower.includes('5-20') || lower.includes('small team')) result.level1_intent.scale = 'medium';
    else if (lower.includes('20-100') || lower.includes('medium')) result.level1_intent.scale = 'medium';
    else if (lower.includes('100+') || lower.includes('large')) result.level1_intent.scale = 'large';
  }

  if (questionId === 'modules' && result.level2_domain.primaryDomain) {
    const domain = result.level2_domain.primaryDomain;
    const selectedModules = domain.modules.filter(m =>
      lower.includes(m.name.toLowerCase()) || lower.includes('all') || lower.includes('everything')
    ).map(m => m.name);

    result.level2_domain = { ...result.level2_domain };
    if (selectedModules.length > 0) {
      result.level2_domain.detectedModules = selectedModules;
    } else if (lower.includes('all') || lower.includes('everything')) {
      result.level2_domain.detectedModules = domain.modules.map(m => m.name);
    }
  }

  const SHORT_DOMAIN_TERMS = new Set(['hr', 'ai', 'qa', 'it', 'pm', 'ui', 'ux', 'bi', 'ml', 'ci', 'cd', 'db', 'vm', 'os', 'crm', 'erp', 'pos', 'ehr', 'lms', 'cms', 'api']);
  const answerWords = lower.split(/[\s,]+/).filter(w => w.length > 2 || SHORT_DOMAIN_TERMS.has(w));
  const entities = { ...result.level3_entities };
  entities.mentionedEntities = [...entities.mentionedEntities];
  for (const word of answerWords) {
    for (const [entity, keywords] of Object.entries(ENTITY_KEYWORDS)) {
      if (keywords.includes(word) && !entities.mentionedEntities.includes(entity)) {
        entities.mentionedEntities.push(entity);
      }
    }
  }
  result.level3_entities = entities;

  const wordCount = lower.split(/\s+/).filter(w => w.length > 1).length;
  const confidenceBoost = wordCount <= 2 ? 0.05 :
                          wordCount <= 5 ? 0.10 :
                          wordCount <= 15 ? 0.15 :
                          0.20;
  result.confidence = Math.min(result.confidence + confidenceBoost, 1.0);

  return result;
}

export function formatUnderstandingResponse(result: UnderstandingResult): string {
  const sections: string[] = [];

  sections.push('## Understanding Your Request\n');

  if (result.level2_domain.primaryDomain) {
    sections.push(`**Industry:** ${result.level2_domain.primaryDomain.name}`);
  }
  sections.push(`**Application Type:** ${result.level1_intent.applicationType.toUpperCase()}`);
  if (result.level1_intent.scale !== 'unknown') {
    sections.push(`**Scale:** ${result.level1_intent.scale}`);
  }
  sections.push(`**Target Users:** ${result.level1_intent.targetAudience}`);

  if (result.level5_clarification.assumptions.length > 0) {
    sections.push('\n**My Understanding:**');
    for (const assumption of result.level5_clarification.assumptions) {
      sections.push(`- ${assumption}`);
    }
  }

  if (result.level3_entities.domainEntities.length > 0) {
    sections.push(`\n**Key Data I'll Include:** ${result.level3_entities.domainEntities.slice(0, 6).map(e => e.name).join(', ')}`);
  }

  if (result.level4_workflows.inferredWorkflows.length > 0) {
    sections.push(`\n**Business Workflows:** ${result.level4_workflows.inferredWorkflows.map(w => w.name).join(', ')}`);
  }

  if (result.level5_clarification.needsClarification) {
    sections.push('\n---\n');
    sections.push('Before I create a detailed plan, I have a few questions:\n');
    for (const q of result.level5_clarification.questions.filter(q => q.priority === 'critical' || q.priority === 'important')) {
      sections.push(`**${q.question}**`);
      if (q.options && q.options.length > 0) {
        sections.push(q.options.map((o, i) => `  ${i + 1}. ${o}`).join('\n'));
      }
      sections.push('');
    }
  } else {
    sections.push('\n---\n');
    sections.push(`I have a good understanding of what you need. Let me create a detailed plan for your **${result.level1_intent.applicationType.toUpperCase()}** system.`);
  }

  return sections.join('\n');
}

interface TechSignal {
  language: string;
  framework?: string;
  priority: number;
  signals: string[];
}

const TECHNOLOGY_SIGNALS: TechSignal[] = [
  { language: 'python', framework: 'django', priority: 10, signals: ['\\bdjango\\b', '\\bdrf\\b', '\\bdjango rest\\b'] },
  { language: 'python', framework: 'fastapi', priority: 10, signals: ['\\bfastapi\\b', '\\bfast api\\b'] },
  { language: 'python', framework: 'flask', priority: 10, signals: ['\\bflask\\b'] },
  { language: 'python', priority: 5, signals: ['\\bpython\\b', '\\bpip\\b', '\\bpytest\\b', '\\bsqlalchemy\\b'] },
  { language: 'go', framework: 'gin', priority: 10, signals: ['\\bgin\\b(?!\\s+and\\b)'] },
  { language: 'go', framework: 'echo', priority: 10, signals: ['\\becho framework\\b', '\\blabstack\\b'] },
  { language: 'go', framework: 'fiber', priority: 10, signals: ['\\bgofiber\\b', '\\bfiber framework\\b'] },
  { language: 'go', priority: 5, signals: ['\\bgolang\\b', '\\bgo\\b(?=\\s+(?:api|app|server|backend|project|service|microservice))'] },
  { language: 'rust', framework: 'actix-web', priority: 10, signals: ['\\bactix\\b'] },
  { language: 'rust', framework: 'axum', priority: 10, signals: ['\\baxum\\b'] },
  { language: 'rust', framework: 'rocket', priority: 10, signals: ['\\brocket\\b(?=\\s+(?:framework|server|api))'] },
  { language: 'rust', priority: 5, signals: ['\\brust\\b', '\\bcargo\\b'] },
  { language: 'java', framework: 'spring-boot', priority: 10, signals: ['\\bspring boot\\b', '\\bspring framework\\b', '\\bspringboot\\b'] },
  { language: 'java', priority: 5, signals: ['\\bjava\\b', '\\bmaven\\b', '\\bgradle\\b', '\\bjvm\\b'] },
  { language: 'csharp', framework: 'aspnet-core', priority: 10, signals: ['\\basp\\.net\\b', '\\baspnet\\b'] },
  { language: 'csharp', priority: 5, signals: ['\\bc#\\b', '\\bcsharp\\b', '\\b\\.net\\b', '\\bdotnet\\b', '\\bblazor\\b'] },
  { language: 'ruby', framework: 'rails', priority: 10, signals: ['\\brails\\b', '\\bruby on rails\\b'] },
  { language: 'ruby', framework: 'sinatra', priority: 10, signals: ['\\bsinatra\\b'] },
  { language: 'ruby', priority: 5, signals: ['\\bruby\\b'] },
  { language: 'php', framework: 'laravel', priority: 10, signals: ['\\blaravel\\b'] },
  { language: 'php', priority: 5, signals: ['\\bphp\\b', '\\bsymfony\\b', '\\bcomposer\\b'] },
  { language: 'kotlin', framework: 'ktor', priority: 10, signals: ['\\bktor\\b'] },
  { language: 'kotlin', priority: 5, signals: ['\\bkotlin\\b'] },
  { language: 'swift', priority: 5, signals: ['\\bswift\\b', '\\bvapor\\b'] },
  { language: 'dart', priority: 5, signals: ['\\bdart\\b', '\\bflutter\\b'] },
  { language: 'elixir', framework: 'phoenix', priority: 10, signals: ['\\bphoenix\\b(?=\\s+(?:framework|server|api|app))'] },
  { language: 'elixir', priority: 5, signals: ['\\belixir\\b'] },
  { language: 'scala', priority: 5, signals: ['\\bscala\\b', '\\bplay framework\\b', '\\bakka\\b'] },
  { language: 'haskell', priority: 5, signals: ['\\bhaskell\\b', '\\byesod\\b', '\\bservant\\b'] },
  { language: 'typescript', framework: 'express', priority: 8, signals: ['\\bexpress\\b(?=\\s+(?:server|api|app|backend))'] },
  { language: 'typescript', framework: 'nextjs', priority: 10, signals: ['\\bnext\\.?js\\b', '\\bnextjs\\b'] },
  { language: 'typescript', framework: 'nuxt', priority: 10, signals: ['\\bnuxt\\b', '\\bnuxt\\.?js\\b'] },
  { language: 'typescript', framework: 'svelte', priority: 10, signals: ['\\bsvelte\\b', '\\bsveltekit\\b'] },
  { language: 'typescript', framework: 'angular', priority: 10, signals: ['\\bangular\\b(?!\\s+(?:js|1))'] },
  { language: 'typescript', framework: 'vue', priority: 10, signals: ['\\bvue\\b', '\\bvue\\.?js\\b', '\\bvuejs\\b'] },
  { language: 'typescript', framework: 'react', priority: 8, signals: ['\\breact\\b(?=\\s+(?:app|project|frontend|ui|native))', '\\breactjs\\b'] },
  { language: 'typescript', priority: 4, signals: ['\\btypescript\\b', '\\bnestjs\\b', '\\bnode\\.?js\\b'] },
  { language: 'cpp', priority: 5, signals: ['\\bc\\+\\+\\b', '\\bcpp\\b'] },
  { language: 'c', priority: 5, signals: ['\\bc language\\b', '\\bansi c\\b', '\\bplain c\\b'] },
  { language: 'zig', priority: 5, signals: ['\\bzig\\b'] },
  { language: 'lua', priority: 5, signals: ['\\blua\\b'] },
  { language: 'perl', priority: 5, signals: ['\\bperl\\b', '\\bmojolicious\\b'] },
  { language: 'r', priority: 5, signals: ['\\br language\\b', '\\bshiny\\b', '\\bplumber\\b', '\\brstudio\\b'] },
  { language: 'julia', priority: 5, signals: ['\\bjulia\\b(?=\\s+(?:lang|language|server|api|app))'] },
];

const DATABASE_PATTERNS: Record<string, string[]> = {
  postgresql: ['\\bpostgres\\b', '\\bpostgresql\\b', '\\bpg\\b'],
  mysql: ['\\bmysql\\b', '\\bmariadb\\b'],
  sqlite: ['\\bsqlite\\b'],
  mongodb: ['\\bmongodb\\b', '\\bmongo\\b', '\\bnosql\\b'],
  redis: ['\\bredis\\b'],
  dynamodb: ['\\bdynamodb\\b'],
  firebase: ['\\bfirebase\\b', '\\bfirestore\\b'],
};

function matchesSignal(text: string, signal: string): boolean {
  try {
    return new RegExp(signal, 'i').test(text);
  } catch {
    return text.includes(signal);
  }
}

function detectTechnology(lower: string): TechnologyDetectionResult {
  const signals: string[] = [];
  let detectedLanguage: string | null = null;
  let detectedFramework: string | null = null;
  let detectedDatabase: string | null = null;
  let bestPriority = 0;

  const sortedSignals = [...TECHNOLOGY_SIGNALS].sort((a, b) => b.priority - a.priority);

  for (const tech of sortedSignals) {
    let matched = false;
    for (const signal of tech.signals) {
      if (matchesSignal(lower, signal)) {
        signals.push(signal.replace(/\\b/g, ''));
        matched = true;
      }
    }
    if (matched) {
      if (tech.priority > bestPriority) {
        detectedLanguage = tech.language;
        if (tech.framework) {
          detectedFramework = tech.framework;
        }
        bestPriority = tech.priority;
      } else if (tech.priority === bestPriority && tech.framework && !detectedFramework) {
        detectedFramework = tech.framework;
        detectedLanguage = tech.language;
      }
    }
  }

  for (const [db, patterns] of Object.entries(DATABASE_PATTERNS)) {
    if (patterns.some(p => matchesSignal(lower, p))) {
      detectedDatabase = db;
      signals.push(db);
      break;
    }
  }

  let confidence = 0;
  if (detectedFramework) {
    confidence = 0.9;
  } else if (detectedLanguage) {
    confidence = 0.8;
  }

  if (!detectedLanguage) {
    detectedLanguage = 'typescript';
    confidence = 0.5;
    signals.push('default: typescript');
  }

  if (!detectedDatabase) {
    detectedDatabase = 'postgresql';
  }

  return { detectedLanguage, detectedFramework, detectedDatabase, confidence, signals };
}