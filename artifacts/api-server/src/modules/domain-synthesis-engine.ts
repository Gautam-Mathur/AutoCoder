import { detectDomainFromText, getAllDomains, type IndustryDomain, type DomainEntity, type DomainModule, type DomainWorkflow, type UserRole } from './domain-knowledge.js';

export interface SynthesizedDomain extends IndustryDomain {
  synthesized: true;
  sourceDescription: string;
  blendedFrom: string[];
  confidenceBreakdown: {
    structuralMatch: number;
    keywordMatch: number;
    entityCoverage: number;
    workflowCoverage: number;
  };
}

export interface NLPEntityExtraction {
  entities: ExtractedEntity[];
  workflows: ExtractedWorkflow[];
  roles: ExtractedRole[];
  kpis: string[];
}

export interface ExtractedEntity {
  name: string;
  source: 'mentioned' | 'inferred' | 'synthesized';
  fields: { name: string; type: string; required?: boolean; description?: string }[];
  relationships?: { entity: string; type: 'one-to-many' | 'many-to-one' | 'many-to-many'; field?: string }[];
}

export interface ExtractedWorkflow {
  name: string;
  entity: string;
  states: string[];
  transitions: { from: string; to: string; action: string; role?: string }[];
}

export interface ExtractedRole {
  name: string;
  permissions: string[];
  description: string;
}

const NOUN_PATTERNS = [
  /(?:manage|track|handle|organize|monitor|control|maintain|process|schedule|coordinate)\s+(?:the\s+)?(\w+(?:\s+\w+){0,2})/gi,
  /(\w+(?:\s+\w+){0,2})\s+(?:management|tracking|system|module|portal|dashboard|tool)/gi,
  /(?:with|including|features?|for)\s+(\w+(?:\s+\w+){0,2})/gi,
  /(?:need|want|require)\s+(?:a\s+|an\s+)?(\w+(?:\s+\w+){0,2})\s+(?:system|tool|feature|module|page|view|list)/gi,
  /(\w+(?:\s+\w+){0,2})\s+(?:list|listing|catalog|directory|registry|database|records?)/gi,
];

const VERB_PATTERNS = [
  /(?:users?\s+can|should\s+be\s+able\s+to|allow\s+(?:users?\s+)?to)\s+(\w+(?:\s+\w+){0,3})/gi,
  /(?:ability\s+to|option\s+to|feature\s+to)\s+(\w+(?:\s+\w+){0,3})/gi,
];

const ENTITY_TEMPLATES: Record<string, { fields: { name: string; type: string; required?: boolean }[]; relationships?: string[] }> = {
  person: {
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'firstName', type: 'string', required: true },
      { name: 'lastName', type: 'string', required: true },
      { name: 'email', type: 'string', required: true },
      { name: 'phone', type: 'string' },
      { name: 'status', type: 'enum:active,inactive', required: true },
      { name: 'createdAt', type: 'datetime' },
    ],
  },
  item: {
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'description', type: 'string' },
      { name: 'category', type: 'string' },
      { name: 'status', type: 'enum:active,inactive,archived', required: true },
      { name: 'createdAt', type: 'datetime' },
    ],
  },
  transaction: {
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'type', type: 'string', required: true },
      { name: 'amount', type: 'number', required: true },
      { name: 'date', type: 'date', required: true },
      { name: 'status', type: 'enum:pending,completed,cancelled', required: true },
      { name: 'reference', type: 'string' },
      { name: 'notes', type: 'string' },
      { name: 'createdAt', type: 'datetime' },
    ],
  },
  event: {
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'title', type: 'string', required: true },
      { name: 'description', type: 'string' },
      { name: 'startDate', type: 'datetime', required: true },
      { name: 'endDate', type: 'datetime' },
      { name: 'location', type: 'string' },
      { name: 'status', type: 'enum:scheduled,in-progress,completed,cancelled', required: true },
      { name: 'createdAt', type: 'datetime' },
    ],
  },
  record: {
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'type', type: 'string' },
      { name: 'value', type: 'string' },
      { name: 'notes', type: 'string' },
      { name: 'createdAt', type: 'datetime' },
    ],
  },
  location: {
    fields: [
      { name: 'id', type: 'serial', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'address', type: 'string' },
      { name: 'city', type: 'string' },
      { name: 'state', type: 'string' },
      { name: 'phone', type: 'string' },
      { name: 'status', type: 'enum:active,inactive', required: true },
      { name: 'createdAt', type: 'datetime' },
    ],
  },
};

const ENTITY_TYPE_HEURISTICS: Record<string, string> = {
  customer: 'person', client: 'person', patient: 'person', student: 'person',
  member: 'person', employee: 'person', staff: 'person', vendor: 'person',
  supplier: 'person', teacher: 'person', instructor: 'person', trainer: 'person',
  resident: 'person', tenant: 'person', volunteer: 'person', candidate: 'person',
  driver: 'person', technician: 'person', agent: 'person', contact: 'person',
  pet: 'item', animal: 'item', vehicle: 'item', equipment: 'item',
  product: 'item', item: 'item', asset: 'item', tool: 'item',
  room: 'item', table: 'item', machine: 'item', device: 'item',
  service: 'item', plan: 'item', package: 'item', subscription: 'item',
  order: 'transaction', invoice: 'transaction', payment: 'transaction',
  booking: 'transaction', reservation: 'transaction', purchase: 'transaction',
  refund: 'transaction', claim: 'transaction', request: 'transaction',
  appointment: 'event', session: 'event', class: 'event', meeting: 'event',
  event: 'event', shift: 'event', visit: 'event', inspection: 'event',
  report: 'record', log: 'record', note: 'record', review: 'record',
  feedback: 'record', assessment: 'record', evaluation: 'record',
  warehouse: 'location', branch: 'location', office: 'location',
  store: 'location', clinic: 'location', facility: 'location', site: 'location',
};

const DOMAIN_SIMILARITY_VECTORS: Record<string, string[]> = {
  'consulting': ['project', 'client', 'invoice', 'timesheet', 'task', 'contract', 'milestone', 'proposal'],
  'manufacturing': ['product', 'order', 'inventory', 'quality', 'supplier', 'machine', 'batch', 'defect'],
  'healthcare': ['patient', 'appointment', 'doctor', 'prescription', 'medical', 'diagnosis', 'treatment', 'lab'],
  'retail': ['product', 'order', 'customer', 'payment', 'catalog', 'cart', 'shipping', 'return'],
  'education': ['student', 'course', 'grade', 'teacher', 'class', 'enrollment', 'attendance', 'curriculum'],
  'realestate': ['property', 'tenant', 'lease', 'maintenance', 'listing', 'showing', 'rent', 'inspection'],
  'hr': ['employee', 'leave', 'payroll', 'department', 'recruitment', 'performance', 'training', 'benefits'],
  'restaurant': ['menu', 'order', 'table', 'reservation', 'kitchen', 'recipe', 'ingredient', 'staff'],
  'fitness': ['member', 'class', 'trainer', 'workout', 'membership', 'schedule', 'equipment', 'body'],
  'logistics': ['shipment', 'vehicle', 'route', 'driver', 'warehouse', 'delivery', 'tracking', 'fleet'],
  'finance': ['account', 'transaction', 'budget', 'expense', 'report', 'tax', 'audit', 'ledger'],
  'project-management': ['project', 'task', 'milestone', 'team', 'sprint', 'board', 'timeline', 'resource'],
  'crm': ['contact', 'deal', 'pipeline', 'lead', 'opportunity', 'activity', 'campaign', 'account'],
  'inventory': ['item', 'stock', 'warehouse', 'supplier', 'purchase', 'movement', 'location', 'barcode'],
};

export function synthesizeDomain(userDescription: string): SynthesizedDomain | IndustryDomain | null {
  const lower = userDescription.toLowerCase();

  const directMatches = detectDomainFromText(lower);
  if (directMatches.length > 0 && directMatches[0].confidence >= 0.6) {
    return directMatches[0].domain;
  }

  const similarityScores = computeSimilarityScores(lower);
  const topDomains = similarityScores
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (topDomains.length === 0) {
    return buildCustomDomainFromDescription(lower, userDescription);
  }

  if (topDomains.length === 1 || (topDomains.length >= 2 && topDomains[0].score > topDomains[1].score * 2)) {
    const domain = getAllDomains().find(d => d.id === topDomains[0].domainId);
    if (domain) return domain;
  }

  return blendDomains(topDomains, lower, userDescription);
}

function computeSimilarityScores(text: string): { domainId: string; score: number; matchedTerms: string[] }[] {
  const words = text.split(/\s+/);
  const results: { domainId: string; score: number; matchedTerms: string[] }[] = [];

  for (const [domainId, vector] of Object.entries(DOMAIN_SIMILARITY_VECTORS)) {
    let score = 0;
    const matchedTerms: string[] = [];

    for (const term of vector) {
      if (text.includes(term)) {
        score += 1;
        matchedTerms.push(term);

        if (vector.indexOf(term) < 3) {
          score += 0.5;
        }
      }

      for (const word of words) {
        if (word.length > 3 && term.length > 3) {
          const similarity = computeLevenshteinSimilarity(word, term);
          if (similarity > 0.75 && !matchedTerms.includes(term)) {
            score += similarity * 0.5;
            matchedTerms.push(term);
          }
        }
      }
    }

    const normalizedScore = score / vector.length;
    results.push({ domainId, score: normalizedScore, matchedTerms });
  }

  return results;
}

function computeLevenshteinSimilarity(a: string, b: string): number {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j - 1][i] + 1,
        matrix[j][i - 1] + 1,
        matrix[j - 1][i - 1] + cost
      );
    }
  }

  const distance = matrix[b.length][a.length];
  const maxLen = Math.max(a.length, b.length);
  return 1 - distance / maxLen;
}

function blendDomains(
  topDomains: { domainId: string; score: number; matchedTerms: string[] }[],
  lowerText: string,
  originalDescription: string
): SynthesizedDomain {
  const allDomains = getAllDomains();
  const primary = allDomains.find(d => d.id === topDomains[0].domainId)!;
  const secondary = topDomains.length > 1 ? allDomains.find(d => d.id === topDomains[1].domainId) : null;

  const mergedModules: DomainModule[] = [...primary.modules];
  const mergedEntities: DomainEntity[] = [...primary.entities];
  const mergedWorkflows: DomainWorkflow[] = [...primary.workflows];
  const mergedRoles: UserRole[] = [...primary.roles];
  const mergedKPIs = [...primary.defaultKPIs];
  const mergedIntegrations = [...primary.commonIntegrations];

  if (secondary) {
    for (const mod of secondary.modules) {
      if (!mergedModules.some(m => m.name === mod.name)) {
        const modTerms = [...mod.entities.map(e => e.toLowerCase()), mod.name.toLowerCase()];
        if (modTerms.some(t => lowerText.includes(t))) {
          mergedModules.push(mod);
        }
      }
    }

    for (const entity of secondary.entities) {
      if (!mergedEntities.some(e => e.name === entity.name)) {
        if (lowerText.includes(entity.name.toLowerCase()) ||
            entity.fields.some(f => lowerText.includes(f.name.toLowerCase()))) {
          mergedEntities.push(entity);
        }
      }
    }

    for (const wf of secondary.workflows) {
      if (!mergedWorkflows.some(w => w.name === wf.name)) {
        mergedWorkflows.push(wf);
      }
    }

    for (const role of secondary.roles) {
      if (!mergedRoles.some(r => r.name === role.name)) {
        mergedRoles.push(role);
      }
    }

    for (const kpi of secondary.defaultKPIs) {
      if (!mergedKPIs.includes(kpi)) mergedKPIs.push(kpi);
    }
  }

  const nlpEntities = extractEntitiesFromText(lowerText);
  for (const extracted of nlpEntities.entities) {
    if (!mergedEntities.some(e => e.name.toLowerCase() === extracted.name.toLowerCase())) {
      mergedEntities.push({
        name: extracted.name,
        fields: extracted.fields,
        relationships: extracted.relationships,
      });

      const moduleName = `${extracted.name} Management`;
      if (!mergedModules.some(m => m.name === moduleName)) {
        mergedModules.push({
          name: moduleName,
          description: `Manage ${extracted.name.toLowerCase()} records`,
          entities: [extracted.name],
          pages: [
            { name: `${extracted.name} List`, path: `/${extracted.name.toLowerCase()}s`, description: `All ${extracted.name.toLowerCase()} records`, features: ['search', 'filter-by-status', 'sort'] },
            { name: `${extracted.name} Detail`, path: `/${extracted.name.toLowerCase()}s/:id`, description: `${extracted.name} details`, features: ['edit', 'delete', 'status-tracking'] },
          ],
        });
      }
    }
  }

  const blendedName = secondary
    ? `${primary.name} + ${secondary.name}`
    : `Custom ${primary.name}`;

  return {
    id: `synthesized-${primary.id}${secondary ? `-${secondary.id}` : ''}`,
    name: blendedName,
    description: `A synthesized domain combining ${primary.name}${secondary ? ` and ${secondary.name}` : ''} capabilities, tailored to your specific needs.`,
    keywords: [...primary.keywords, ...(secondary?.keywords || [])],
    modules: mergedModules,
    entities: mergedEntities,
    workflows: mergedWorkflows,
    roles: mergedRoles,
    defaultKPIs: mergedKPIs.slice(0, 8),
    commonIntegrations: mergedIntegrations.slice(0, 6),
    synthesized: true,
    sourceDescription: originalDescription,
    blendedFrom: [primary.id, ...(secondary ? [secondary.id] : [])],
    confidenceBreakdown: {
      structuralMatch: topDomains[0].score,
      keywordMatch: topDomains[0].matchedTerms.length / DOMAIN_SIMILARITY_VECTORS[topDomains[0].domainId].length,
      entityCoverage: mergedEntities.length / (primary.entities.length + (secondary?.entities.length || 0)),
      workflowCoverage: mergedWorkflows.length > 0 ? 1 : 0.5,
    },
  };
}

function buildCustomDomainFromDescription(lowerText: string, originalDescription: string): SynthesizedDomain {
  const extracted = extractEntitiesFromText(lowerText);

  if (extracted.entities.length === 0) {
    extracted.entities.push({
      name: 'Record',
      source: 'synthesized',
      fields: ENTITY_TEMPLATES.record.fields,
    });
  }

  const modules: DomainModule[] = [];
  modules.push({
    name: 'Dashboard',
    description: 'Overview dashboard with key metrics',
    entities: [],
    pages: [
      { name: 'Dashboard', path: '/', description: 'Main dashboard with KPIs and recent activity', features: ['kpi-cards', 'recent-activity', 'charts'] },
    ],
    kpis: ['Total Records', 'Active Items', 'Recent Activity', 'Growth Rate'],
  });

  for (const entity of extracted.entities) {
    modules.push({
      name: `${entity.name} Management`,
      description: `Manage ${entity.name.toLowerCase()} records`,
      entities: [entity.name],
      pages: [
        { name: `${entity.name} List`, path: `/${entity.name.toLowerCase()}s`, description: `All ${entity.name.toLowerCase()} records with search and filters`, features: ['search', 'filter-by-status', 'sort', 'create'] },
        { name: `${entity.name} Detail`, path: `/${entity.name.toLowerCase()}s/:id`, description: `View and edit ${entity.name.toLowerCase()} details`, features: ['edit', 'delete', 'status-tracking'] },
      ],
    });
  }

  if (extracted.entities.length >= 2) {
    modules.push({
      name: 'Reports',
      description: 'Analytics and reporting',
      entities: [],
      pages: [
        { name: 'Reports', path: '/reports', description: 'Analytics and reporting dashboard', features: ['date-range', 'charts', 'export'] },
      ],
      kpis: extracted.entities.map(e => `Total ${e.name}s`),
    });
  }

  const domainEntities: DomainEntity[] = extracted.entities.map(e => ({
    name: e.name,
    fields: e.fields,
    relationships: e.relationships,
  }));

  const workflows: DomainWorkflow[] = extracted.workflows;

  const roles: UserRole[] = extracted.roles.length > 0 ? extracted.roles : [
    { name: 'Admin', permissions: ['all'], description: 'Full system access' },
    { name: 'Manager', permissions: ['manage-all', 'view-reports', 'approve'], description: 'Management access with approval permissions' },
    { name: 'User', permissions: ['view', 'create', 'edit-own'], description: 'Standard user access' },
  ];

  const kpis = extracted.kpis.length > 0 ? extracted.kpis :
    extracted.entities.map(e => `Total ${e.name}s`).concat(['Active Records', 'Recent Activity']);

  const appType = extractAppType(lowerText);

  return {
    id: `custom-${Date.now()}`,
    name: `Custom ${appType}`,
    description: `A custom-built ${appType.toLowerCase()} system tailored to your specific requirements.`,
    keywords: lowerText.split(/\s+/).filter(w => w.length > 3).slice(0, 10),
    modules,
    entities: domainEntities,
    workflows,
    roles,
    defaultKPIs: kpis.slice(0, 6),
    commonIntegrations: ['Email', 'File Storage', 'Reports'],
    synthesized: true,
    sourceDescription: originalDescription,
    blendedFrom: [],
    confidenceBreakdown: {
      structuralMatch: 0.3,
      keywordMatch: 0.2,
      entityCoverage: 1,
      workflowCoverage: workflows.length > 0 ? 0.8 : 0.4,
    },
  };
}

export function singularize(word: string): string {
  const lower = word.toLowerCase();

  // Irregular plurals
  const irregulars: Record<string, string> = {
    'people': 'person', 'children': 'child', 'men': 'man', 'women': 'woman',
    'mice': 'mouse', 'teeth': 'tooth', 'feet': 'foot', 'geese': 'goose',
    'oxen': 'ox', 'data': 'datum', 'criteria': 'criterion', 'analyses': 'analysis',
    'diagnoses': 'diagnosis', 'indices': 'index', 'matrices': 'matrix',
    'vertices': 'vertex', 'appendices': 'appendix',
  };
  if (irregulars[lower]) return irregulars[lower];

  // Already singular or uncountable
  if (lower.length <= 2) return word;
  const uncountable = ['equipment', 'information', 'rice', 'money', 'species', 'series', 'fish', 'sheep', 'deer', 'aircraft', 'software', 'hardware', 'feedback', 'staff', 'furniture'];
  if (uncountable.includes(lower)) return word;

  // Rules in order of specificity
  if (lower.endsWith('ies') && lower.length > 4) {
    // categories -> category, companies -> company
    // But NOT: series (handled above), movies -> movie (ends in 'ies' but 'ie' root)
    const beforeIes = lower.slice(0, -3);
    // Check if the character before 'ies' is a consonant
    const lastChar = beforeIes[beforeIes.length - 1];
    if (lastChar && !'aeiou'.includes(lastChar)) {
      // Corrected logic for -ies to -y
      return word.slice(0, -3) + (word.endsWith('IES') ? 'Y' : 'y');
    }
  }
  if (lower.endsWith('ves')) {
    // knives -> knife, leaves -> leaf
    return word.slice(0, -3) + 'fe';
  }
  if (lower.endsWith('ses') && (lower.endsWith('sses') || lower.endsWith('uses') || lower.endsWith('ases') || lower.endsWith('ises') || lower.endsWith('oses'))) {
    // addresses -> address, classes -> class, statuses -> status, databases -> database, buses -> bus
    if (lower.endsWith('sses')) return word.slice(0, -2); // classes -> class
    if (lower.endsWith('uses')) return word.slice(0, -2); // statuses -> status
    if (lower.endsWith('ases')) return word.slice(0, -1); // databases -> database, cases -> case
    if (lower.endsWith('ises')) return word.slice(0, -1); // exercises -> exercise
    if (lower.endsWith('oses')) return word.slice(0, -1); // purposes -> purpose
  }
  if (lower.endsWith('xes') || lower.endsWith('ches') || lower.endsWith('shes') || lower.endsWith('sses') || lower.endsWith('zzes')) {
    // boxes -> box, watches -> watch, dishes -> dish, classes -> class
    return word.slice(0, -2);
  }
  if (lower.endsWith('s') && !lower.endsWith('ss') && !lower.endsWith('us') && !lower.endsWith('is') && lower.length > 3) {
    return word.slice(0, -1);
  }

  return word;
}

export function synthesizeEntitiesFromText(text: string): string[] {
  const lower = text.toLowerCase();
  const words = lower.split(/\W+/).filter(w => w.length > 3);
  const commonStopWords = ['build', 'create', 'system', 'platform', 'management', 'tracking', 'tracker', 'simple', 'comprehensive', 'application', 'portal'];
  const nouns = words.filter(w => !commonStopWords.includes(w)).map(singularize);
  return Array.from(new Set(nouns));
}

export function extractEntitiesFromText(text: string): NLPEntityExtraction {
  const entities: ExtractedEntity[] = [];
  const workflows: ExtractedWorkflow[] = [];
  const roles: ExtractedRole[] = [];
  const kpis: string[] = [];
  const seenEntities = new Set<string>();

  for (const pattern of NOUN_PATTERNS) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(text)) !== null) {
      const rawNoun = match[1]?.trim();
      if (!rawNoun || rawNoun.length < 2 || rawNoun.length > 30) continue;

      const words = rawNoun.split(/\s+/);
      const lastWord = words[words.length - 1].toLowerCase();

      const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'for', 'with', 'that', 'this', 'it', 'all', 'my', 'our',
        'app', 'application', 'system', 'tool', 'platform', 'software', 'website', 'portal', 'feature', 'module',
        'data', 'information', 'thing', 'stuff', 'ability', 'option', 'function', 'users', 'people',
        'operation', 'operations', 'card', 'cards', 'chart', 'charts', 'metric', 'metrics',
        'field', 'fields', 'record', 'records', 'type', 'types', 'value', 'values',
        'view', 'views', 'page', 'pages', 'section', 'sections', 'panel', 'panels',
        'button', 'buttons', 'input', 'inputs', 'form', 'forms', 'table', 'tables',
        'step', 'steps', 'action', 'actions', 'method', 'methods', 'request', 'response',
        'detail', 'details', 'summary', 'overview', 'interface', 'layout', 'component',
        'service', 'endpoint', 'route', 'config', 'setting', 'settings', 'access',
        'support', 'include', 'includes', 'requirement', 'requirements',
        'like', 'such', 'each', 'every', 'any', 'some', 'other', 'more', 'also', 'well',
        'way', 'case', 'level', 'based', 'full', 'comprehensive', 'complete', 'basic', 'simple', 'standard',
        'key', 'performance', 'activity', 'management', 'tracking', 'filtering']);

      const verbStopWords = new Set(['build', 'create', 'make', 'develop', 'design', 'implement', 'add', 'setup',
        'deploy', 'configure', 'manage', 'track', 'generate', 'run', 'start', 'launch', 'test', 'check',
        'get', 'set', 'update', 'delete', 'edit', 'remove', 'find', 'search', 'filter', 'sort',
        'view', 'show', 'display', 'list', 'process', 'handle', 'send', 'receive', 'upload', 'download',
        'export', 'import', 'connect', 'integrate', 'use', 'allow', 'enable', 'provide', 'ensure',
        'should', 'would', 'could', 'must', 'need', 'want', 'require', 'can', 'will', 'may',
        'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did']);

      if (stopWords.has(lastWord)) continue;

      const firstWord = words[0].toLowerCase();
      if (verbStopWords.has(firstWord)) continue;

      const allWordsAreStop = words.every(w => stopWords.has(w.toLowerCase()) || verbStopWords.has(w.toLowerCase()) || w.length <= 2);
      if (allWordsAreStop) continue;

      const entityName = words.map((w, idx) => {
        const singular = idx === words.length - 1 ? singularize(w) : w;
        return singular.charAt(0).toUpperCase() + singular.slice(1);
      }).join('');

      if (entityName.length <= 2) continue;

      const singularNoun = singularize(lastWord);

      if (seenEntities.has(entityName.toLowerCase())) continue;
      seenEntities.add(entityName.toLowerCase());

      const entityType = ENTITY_TYPE_HEURISTICS[singularNoun] || 'item';
      const template = ENTITY_TEMPLATES[entityType];

      const fields = template.fields.map(f => ({
        ...f,
        name: f.name === 'name' && entityType === 'person' ? 'firstName' : f.name,
      }));

      const customFields = inferCustomFields(singularNoun, text);
      for (const cf of customFields) {
        if (!fields.some(f => f.name === cf.name)) {
          fields.splice(fields.length - 1, 0, cf);
        }
      }

      entities.push({
        name: entityName,
        source: 'inferred',
        fields,
      });

      const hasStatus = fields.some(f => f.name === 'status');
      if (hasStatus) {
        const statusField = fields.find(f => f.name === 'status')!;
        const states = statusField.type.startsWith('enum:')
          ? statusField.type.replace('enum:', '').split(',')
          : ['draft', 'active', 'completed'];

        workflows.push({
          name: `${entityName} Lifecycle`,
          entity: entityName,
          states,
          transitions: buildTransitions(states),
        });

        kpis.push(`Total ${entityName}s`);
        kpis.push(`Active ${entityName}s`);
      }
    }
  }

  for (const pattern of VERB_PATTERNS) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(text)) !== null) {
      const action = match[1]?.trim().toLowerCase();
      if (!action || action.length < 3) continue;

      if (action.includes('approv') || action.includes('review') || action.includes('sign off')) {
        roles.push({
          name: 'Approver',
          permissions: ['approve', 'reject', 'view-all'],
          description: 'Can approve or reject submissions',
        });
      }
    }
  }

  if (text.includes('admin')) {
    if (!roles.some(r => r.name === 'Admin')) {
      roles.push({ name: 'Admin', permissions: ['all'], description: 'Full system access' });
    }
  }
  if (text.includes('manager') || text.includes('supervisor')) {
    if (!roles.some(r => r.name === 'Manager')) {
      roles.push({ name: 'Manager', permissions: ['manage-all', 'view-reports'], description: 'Management access' });
    }
  }

  inferRelationships(entities);

  return { entities: entities.slice(0, 12), workflows, roles, kpis };
}

function inferCustomFields(entityNoun: string, text: string): { name: string; type: string; required?: boolean }[] {
  const customFields: { name: string; type: string; required?: boolean }[] = [];
  const lower = text.toLowerCase();

  if (lower.includes('price') || lower.includes('cost') || lower.includes('fee')) {
    customFields.push({ name: 'price', type: 'number' });
  }
  if (lower.includes('location') || lower.includes('address')) {
    customFields.push({ name: 'address', type: 'string' });
    customFields.push({ name: 'city', type: 'string' });
  }
  if (lower.includes('image') || lower.includes('photo') || lower.includes('picture')) {
    customFields.push({ name: 'imageUrl', type: 'string' });
  }
  if (lower.includes('priority') || lower.includes('urgent')) {
    customFields.push({ name: 'priority', type: 'enum:low,medium,high,urgent' });
  }
  if (lower.includes('assign') || lower.includes('responsible')) {
    customFields.push({ name: 'assignedTo', type: 'string' });
  }
  if (lower.includes('deadline') || lower.includes('due')) {
    customFields.push({ name: 'dueDate', type: 'date' });
  }
  if (lower.includes('tag') || lower.includes('label') || lower.includes('categor')) {
    customFields.push({ name: 'tags', type: 'string[]' });
  }
  if (lower.includes('rating') || lower.includes('review') || lower.includes('score')) {
    customFields.push({ name: 'rating', type: 'number' });
  }
  if (lower.includes('quantity') || lower.includes('stock') || lower.includes('count')) {
    customFields.push({ name: 'quantity', type: 'number' });
  }

  return customFields.slice(0, 5);
}

function inferRelationships(entities: ExtractedEntity[]): void {
  const entityNames = entities.map(e => e.name.toLowerCase());

  for (const entity of entities) {
    const refFields = entity.fields.filter(f =>
      f.name.endsWith('Id') && f.name !== 'id'
    );

    for (const field of refFields) {
      const refName = field.name.replace(/Id$/, '');
      const relatedEntity = entities.find(e => e.name.toLowerCase() === refName.toLowerCase());
      if (relatedEntity) {
        if (!entity.relationships) entity.relationships = [];
        entity.relationships.push({
          entity: relatedEntity.name,
          type: 'many-to-one',
          field: field.name,
        });
      }
    }
  }
}

function buildTransitions(states: string[]): { from: string; to: string; action: string }[] {
  const transitions: { from: string; to: string; action: string }[] = [];
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
  return transitions;
}

function extractAppType(text: string): string {
  const appTypes: [string, string[]][] = [
    ['Portfolio / Personal Site', ['portfolio', 'personal website', 'personal site', 'personal page', 'showcase', 'resume website', 'cv website', 'developer site', 'freelancer site']],
    ['Blog / Content Platform', ['blog', 'blogging', 'content management', 'cms', 'publishing platform', 'articles', 'writing platform', 'news site', 'magazine']],
    ['Landing Page / Marketing Site', ['landing page', 'marketing site', 'promotional', 'product page', 'launch page', 'coming soon', 'waitlist', 'lead capture', 'squeeze page']],
    ['E-Commerce / Online Store', ['ecommerce', 'e-commerce', 'online store', 'shop', 'shopping', 'storefront', 'product catalog', 'cart', 'checkout']],
    ['Social Network / Community', ['social network', 'social media', 'social platform', 'community', 'forum', 'discussion board', 'social app', 'feed', 'timeline', 'followers']],
    ['Chat / Messaging Platform', ['chat', 'messaging', 'instant messaging', 'messenger', 'real-time chat', 'chatroom', 'direct message', 'dm', 'conversations']],
    ['Booking / Scheduling Platform', ['booking', 'appointment', 'scheduling', 'reservation', 'calendar booking', 'slot booking', 'salon', 'spa', 'grooming', 'service booking']],
    ['Event Management Platform', ['event', 'events', 'conference', 'meetup', 'ticket', 'ticketing', 'rsvp', 'event planning', 'venue', 'concert', 'workshop', 'webinar']],
    ['SaaS / Dashboard Platform', ['saas', 'subscription', 'multi-tenant', 'admin panel', 'analytics dashboard', 'control panel', 'reporting tool', 'business intelligence']],
    ['Documentation / Wiki Site', ['documentation', 'docs', 'wiki', 'knowledge base', 'help center', 'faq', 'reference', 'manual', 'guide']],
    ['Recipe / Food Platform', ['recipe', 'recipes', 'cookbook', 'meal plan', 'food', 'cooking', 'ingredients', 'nutrition']],
    ['Fitness / Health Tracker', ['fitness', 'workout', 'exercise', 'health tracker', 'gym', 'wellness', 'step counter', 'calorie', 'weight tracker', 'habit tracker']],
    ['Gaming / Entertainment', ['game', 'gaming', 'quiz', 'trivia', 'leaderboard', 'scoreboard', 'puzzle', 'arcade', 'multiplayer']],
    ['Job Board / Recruitment', ['job board', 'job listing', 'careers', 'recruitment', 'hiring', 'job portal', 'applicant', 'resume', 'candidate']],
    ['Learning / Education Platform', ['course', 'learning', 'education', 'tutorial', 'e-learning', 'lms', 'student', 'lesson', 'quiz platform', 'study', 'academy']],
    ['Finance / Budget Tracker', ['budget', 'expense tracker', 'finance', 'money', 'spending', 'savings', 'income', 'financial', 'accounting', 'invoice']],
    ['Task / Project Management', ['task manager', 'project management', 'todo', 'to-do', 'kanban', 'task board', 'issue tracker', 'sprint', 'backlog', 'planner']],
    ['Marketplace', ['marketplace', 'buy', 'sell', 'listing', 'vendor', 'multi-vendor', 'classified', 'auction']],
    ['Analytics / Reporting Tool', ['analytics', 'reporting', 'metrics', 'data visualization', 'chart', 'statistics', 'insights', 'kpi']],
    ['Inventory / Warehouse', ['inventory', 'stock', 'warehouse', 'supply chain', 'logistics', 'shipping', 'fulfillment']],
    ['CRM / Sales Platform', ['crm', 'customer relationship', 'sales pipeline', 'leads', 'deals', 'prospect', 'sales']],
    ['Real Estate Platform', ['real estate', 'property', 'rental', 'listing', 'apartment', 'housing', 'tenant', 'landlord']],
    ['Healthcare / Medical', ['healthcare', 'medical', 'patient', 'hospital', 'clinic', 'appointment', 'prescription', 'health record']],
    ['Business Management', ['business', 'company', 'organization', 'enterprise', 'corporate']],
    ['Service Platform', ['service', 'service platform']],
    ['Operations System', ['operations', 'ops', 'workflow', 'process', 'automation']],
    ['Tracking System', ['track', 'monitor', 'log', 'record']],
    ['Management Portal', ['portal', 'admin', 'control', 'dashboard']],
    ['Web Application', ['website', 'web app', 'webapp', 'web application', 'site', 'app', 'application', 'platform', 'tool']],
  ];

  for (const [appType, keywords] of appTypes) {
    if (keywords.some(k => text.includes(k))) {
      return appType;
    }
  }

  return 'Web Application';
}

export function isDomainSynthesized(domain: IndustryDomain): domain is SynthesizedDomain {
  return 'synthesized' in domain && (domain as any).synthesized === true;
}