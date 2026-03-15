import { db } from '@workspace/db';
import { eq, and, desc, sql } from 'drizzle-orm';
import {
  architecturePatterns,
  ruleDefinitions,
  uxBlueprints,
  componentTemplates,
  vectorEmbeddings,
  domainKnowledgeBase,
  generationPatterns,
} from '@workspace/db';

export interface ScoredPattern {
  id: number;
  patternKey: string;
  patternValue: Record<string, any>;
  score: number;
  category: string;
}

export interface RuleResult {
  ruleId: number;
  name: string;
  matched: boolean;
  action: { type: string; params: Record<string, any> };
  priority: number;
}

export interface ScoringCriteria {
  field: string;
  weight: number;
  min?: number;
  max?: number;
  direction?: 'asc' | 'desc';
}

export interface RankedResult {
  item: any;
  totalScore: number;
  scores: Record<string, number>;
  rank: number;
}

export interface SelectedTemplate {
  id: number;
  name: string;
  layout: any;
  colorScheme: any;
  typography: any;
  componentMap: any;
  score: number;
}

export interface ComponentTemplateResult {
  id: number;
  name: string;
  category: string;
  framework: string;
  templateCode: string;
  propsSchema: any;
  dependencies: string[];
  score: number;
}

export interface FeatureGraphData {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
}

export interface GraphNode {
  id: string;
  type: string;
  label: string;
  properties: Record<string, any>;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  weight: number;
}

export interface GraphConflict {
  nodeA: string;
  nodeB: string;
  reason: string;
}

export interface SimilarResult {
  id: number;
  sourceType: string;
  sourceId: string;
  content: string;
  similarity: number;
  metadata: any;
}

export interface ParsedIntent {
  entities: ExtractedEntity[];
  actions: string[];
  relationships: { from: string; to: string; type: string }[];
  domain: DetectedDomain;
  complexity: ComplexityEstimate;
  keywords: string[];
}

export interface ExtractedEntity {
  name: string;
  type: string;
  fields: string[];
  confidence: number;
}

export interface DetectedDomain {
  primary: string;
  confidence: number;
  secondary: string[];
  keywords: string[];
}

export interface ComplexityEstimate {
  level: 'simple' | 'moderate' | 'complex' | 'enterprise';
  score: number;
  factors: string[];
}

export interface SynthesisResult {
  patterns: ScoredPattern[];
  rules: RuleResult[];
  templates: SelectedTemplate | null;
  vectorMatches: SimilarResult[];
  decision: Record<string, any>;
  confidence: number;
  reasoning: string[];
}

export interface ArchitectureDecision {
  pattern: string;
  frontend: string;
  backend: string;
  database: string;
  styling: string;
  stateManagement: string;
  authentication: string;
  folderStructure: Record<string, string[]>;
  reasoning: string[];
  tradeoffs: { pros: string[]; cons: string[] };
}

export interface SchemaRecommendation {
  tables: { name: string; columns: { name: string; type: string; nullable: boolean; references?: string }[] }[];
  indexes: { table: string; columns: string[]; unique: boolean }[];
  relationships: { from: string; to: string; type: string; foreignKey: string }[];
  reasoning: string[];
}

const DOMAIN_VOCABULARY: Record<string, { keywords: string[]; entities: string[]; actions: string[] }> = {
  healthcare: {
    keywords: ['patient', 'doctor', 'hospital', 'medical', 'clinic', 'health', 'diagnosis', 'prescription', 'appointment', 'ehr', 'emr', 'pharmacy', 'nurse', 'treatment', 'symptom', 'vital', 'lab', 'insurance', 'billing', 'telemedicine', 'hipaa'],
    entities: ['Patient', 'Doctor', 'Appointment', 'Prescription', 'MedicalRecord', 'Diagnosis', 'LabResult', 'Insurance', 'Billing', 'Department'],
    actions: ['schedule', 'diagnose', 'prescribe', 'admit', 'discharge', 'refer', 'bill', 'triage', 'consult'],
  },
  ecommerce: {
    keywords: ['product', 'cart', 'order', 'payment', 'shop', 'store', 'catalog', 'inventory', 'shipping', 'checkout', 'discount', 'coupon', 'review', 'wishlist', 'marketplace', 'sku', 'price', 'customer', 'refund', 'return'],
    entities: ['Product', 'Category', 'Cart', 'Order', 'OrderItem', 'Customer', 'Payment', 'Review', 'Coupon', 'Shipping'],
    actions: ['browse', 'addToCart', 'checkout', 'purchase', 'ship', 'refund', 'review', 'search', 'filter', 'wishlist'],
  },
  education: {
    keywords: ['student', 'teacher', 'course', 'class', 'grade', 'assignment', 'exam', 'lecture', 'semester', 'enrollment', 'curriculum', 'quiz', 'lms', 'learning', 'school', 'university', 'tutor', 'syllabus', 'transcript', 'degree'],
    entities: ['Student', 'Teacher', 'Course', 'Assignment', 'Grade', 'Enrollment', 'Exam', 'Lecture', 'Department', 'Semester'],
    actions: ['enroll', 'submit', 'grade', 'teach', 'attend', 'assess', 'graduate', 'register', 'schedule'],
  },
  finance: {
    keywords: ['account', 'transaction', 'balance', 'bank', 'investment', 'portfolio', 'stock', 'budget', 'expense', 'income', 'loan', 'interest', 'credit', 'debit', 'ledger', 'audit', 'tax', 'invoice', 'payment', 'fintech'],
    entities: ['Account', 'Transaction', 'Budget', 'Investment', 'Portfolio', 'Loan', 'Invoice', 'Expense', 'Income', 'Report'],
    actions: ['transfer', 'deposit', 'withdraw', 'invest', 'budget', 'audit', 'reconcile', 'approve', 'report'],
  },
  social: {
    keywords: ['user', 'post', 'comment', 'like', 'follow', 'feed', 'profile', 'message', 'notification', 'share', 'friend', 'group', 'community', 'chat', 'story', 'media', 'hashtag', 'timeline', 'reaction', 'mention'],
    entities: ['User', 'Post', 'Comment', 'Like', 'Follow', 'Message', 'Notification', 'Group', 'Media', 'Story'],
    actions: ['post', 'comment', 'like', 'share', 'follow', 'message', 'notify', 'block', 'report', 'search'],
  },
  productivity: {
    keywords: ['task', 'project', 'board', 'sprint', 'kanban', 'todo', 'deadline', 'milestone', 'team', 'workspace', 'calendar', 'note', 'document', 'agenda', 'workflow', 'automation', 'reminder', 'priority', 'status', 'label'],
    entities: ['Task', 'Project', 'Board', 'Sprint', 'Milestone', 'Team', 'Workspace', 'Document', 'Note', 'Calendar'],
    actions: ['create', 'assign', 'complete', 'prioritize', 'schedule', 'track', 'collaborate', 'automate', 'archive'],
  },
  logistics: {
    keywords: ['shipment', 'warehouse', 'delivery', 'tracking', 'fleet', 'route', 'driver', 'package', 'cargo', 'freight', 'supply chain', 'dispatch', 'inventory', 'container', 'customs', 'manifest', 'dock', 'pallet', 'carrier', 'transit'],
    entities: ['Shipment', 'Warehouse', 'Route', 'Driver', 'Vehicle', 'Package', 'Delivery', 'Inventory', 'Carrier', 'Order'],
    actions: ['ship', 'track', 'deliver', 'dispatch', 'route', 'receive', 'store', 'pick', 'pack', 'load'],
  },
  entertainment: {
    keywords: ['movie', 'music', 'game', 'stream', 'playlist', 'video', 'content', 'media', 'episode', 'series', 'podcast', 'album', 'artist', 'genre', 'rating', 'subscription', 'download', 'watch', 'listen', 'play'],
    entities: ['Content', 'Playlist', 'User', 'Subscription', 'Rating', 'Genre', 'Artist', 'Episode', 'Series', 'Comment'],
    actions: ['play', 'stream', 'rate', 'subscribe', 'download', 'recommend', 'curate', 'share', 'review'],
  },
  realestate: {
    keywords: ['property', 'listing', 'agent', 'tenant', 'lease', 'mortgage', 'rental', 'house', 'apartment', 'building', 'broker', 'inspection', 'offer', 'contract', 'valuation', 'mls', 'showing', 'closing', 'escrow', 'deed'],
    entities: ['Property', 'Listing', 'Agent', 'Tenant', 'Lease', 'Transaction', 'Showing', 'Offer', 'Contract', 'Inspection'],
    actions: ['list', 'show', 'offer', 'negotiate', 'inspect', 'appraise', 'lease', 'sell', 'buy', 'close'],
  },
  hr: {
    keywords: ['employee', 'department', 'payroll', 'leave', 'attendance', 'recruitment', 'onboarding', 'performance', 'benefits', 'compensation', 'training', 'review', 'applicant', 'job', 'position', 'salary', 'timeoff', 'shift', 'policy', 'compliance'],
    entities: ['Employee', 'Department', 'Position', 'Leave', 'Payroll', 'Applicant', 'JobPosting', 'PerformanceReview', 'Training', 'Benefit'],
    actions: ['hire', 'onboard', 'review', 'promote', 'terminate', 'train', 'compensate', 'recruit', 'evaluate', 'approve'],
  },
  food: {
    keywords: ['restaurant', 'menu', 'order', 'delivery', 'recipe', 'ingredient', 'kitchen', 'table', 'reservation', 'chef', 'cuisine', 'meal', 'dish', 'catering', 'food', 'beverage', 'tip', 'waiter', 'pos', 'nutrition'],
    entities: ['Restaurant', 'Menu', 'MenuItem', 'Order', 'Reservation', 'Table', 'Customer', 'Review', 'Ingredient', 'Recipe'],
    actions: ['order', 'reserve', 'prepare', 'serve', 'deliver', 'rate', 'tip', 'cook', 'customize', 'cater'],
  },
  travel: {
    keywords: ['booking', 'flight', 'hotel', 'destination', 'itinerary', 'trip', 'passenger', 'reservation', 'tour', 'guide', 'visa', 'airport', 'cruise', 'adventure', 'vacation', 'resort', 'ticket', 'baggage', 'check-in', 'tourism'],
    entities: ['Trip', 'Booking', 'Hotel', 'Flight', 'Destination', 'Itinerary', 'Passenger', 'Review', 'Tour', 'Guide'],
    actions: ['book', 'search', 'compare', 'reserve', 'check-in', 'review', 'cancel', 'plan', 'explore', 'recommend'],
  },
  fitness: {
    keywords: ['workout', 'exercise', 'gym', 'trainer', 'nutrition', 'diet', 'weight', 'cardio', 'strength', 'routine', 'progress', 'goal', 'membership', 'class', 'schedule', 'body', 'health', 'bmi', 'calories', 'rep'],
    entities: ['Workout', 'Exercise', 'User', 'Trainer', 'MealPlan', 'Goal', 'Progress', 'Membership', 'Schedule', 'Class'],
    actions: ['track', 'log', 'train', 'measure', 'plan', 'schedule', 'achieve', 'coach', 'assess', 'recommend'],
  },
  analytics: {
    keywords: ['dashboard', 'metric', 'report', 'chart', 'data', 'insight', 'visualization', 'kpi', 'trend', 'forecast', 'segment', 'funnel', 'conversion', 'retention', 'cohort', 'ab test', 'event', 'tracking', 'export', 'pipeline'],
    entities: ['Dashboard', 'Report', 'Metric', 'DataSource', 'Chart', 'Alert', 'Segment', 'Event', 'Funnel', 'Goal'],
    actions: ['analyze', 'visualize', 'report', 'forecast', 'segment', 'track', 'alert', 'export', 'compare', 'drill-down'],
  },
};

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
  'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
  'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'both',
  'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
  'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
  'because', 'but', 'and', 'or', 'if', 'while', 'that', 'this', 'it',
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she', 'they',
  'them', 'what', 'which', 'who', 'whom', 'its', 'his', 'her', 'their',
  'about', 'up', 'also', 'like', 'want', 'make', 'get',
]);

const ARCHITECTURE_FALLBACKS: Record<string, ArchitectureDecision> = {
  webapp: {
    pattern: 'modular-mvc',
    frontend: 'react',
    backend: 'express',
    database: 'postgresql',
    styling: 'tailwind',
    stateManagement: 'react-query',
    authentication: 'session',
    folderStructure: {
      'client/src/pages': ['Home', 'Dashboard'],
      'client/src/components': ['Layout', 'Sidebar', 'Header'],
      'server': ['routes.ts', 'storage.ts'],
      'shared': ['schema.ts'],
    },
    reasoning: ['Standard web app architecture with React + Express', 'Tailwind for rapid UI development', 'PostgreSQL for relational data'],
    tradeoffs: { pros: ['Well-supported ecosystem', 'Easy deployment'], cons: ['Server-side rendering requires extra setup'] },
  },
  dashboard: {
    pattern: 'data-driven-dashboard',
    frontend: 'react',
    backend: 'express',
    database: 'postgresql',
    styling: 'tailwind',
    stateManagement: 'react-query',
    authentication: 'session',
    folderStructure: {
      'client/src/pages': ['Dashboard', 'Reports', 'Settings'],
      'client/src/components': ['Charts', 'KPICards', 'DataTable', 'Filters'],
      'server': ['routes.ts', 'storage.ts'],
      'shared': ['schema.ts'],
    },
    reasoning: ['Dashboard-focused layout with chart components', 'Heavy use of data tables and filters', 'Real-time data refresh with react-query'],
    tradeoffs: { pros: ['Optimized for data display', 'Responsive charts'], cons: ['Complex state for filter combinations'] },
  },
  ecommerce: {
    pattern: 'ecommerce-fullstack',
    frontend: 'react',
    backend: 'express',
    database: 'postgresql',
    styling: 'tailwind',
    stateManagement: 'react-query',
    authentication: 'session',
    folderStructure: {
      'client/src/pages': ['Shop', 'ProductDetail', 'Cart', 'Checkout', 'Orders'],
      'client/src/components': ['ProductCard', 'CartDrawer', 'SearchBar', 'Filters'],
      'server': ['routes.ts', 'storage.ts'],
      'shared': ['schema.ts'],
    },
    reasoning: ['E-commerce optimized with cart state management', 'Product catalog with filtering and search', 'Order management workflow'],
    tradeoffs: { pros: ['Proven e-commerce patterns', 'Payment integration ready'], cons: ['Complex inventory management'] },
  },
};

class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

export class LocalAIEngine {
  private patternCache = new LRUCache<string, ScoredPattern[]>(50);
  private ruleCache = new LRUCache<number, RuleResult[]>(20);
  private templateCache = new LRUCache<string, SelectedTemplate>(30);
  private embeddingCache = new LRUCache<string, number[]>(100);
  private idfCache = new Map<string, number>();
  private corpusSize = 0;

  tokenize(text: string): string[] {
    const normalized = text
      .toLowerCase()
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_\-./\\]/g, ' ')
      .replace(/[^a-z0-9\s+#]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return normalized
      .split(' ')
      .filter(t => t.length > 1 && !STOP_WORDS.has(t));
  }

  computeTextSimilarity(a: string, b: string): number {
    const tokensA = this.tokenize(a);
    const tokensB = this.tokenize(b);
    if (tokensA.length === 0 || tokensB.length === 0) return 0;

    const freqA = new Map<string, number>();
    const freqB = new Map<string, number>();
    for (const t of tokensA) freqA.set(t, (freqA.get(t) || 0) + 1);
    for (const t of tokensB) freqB.set(t, (freqB.get(t) || 0) + 1);

    const allTokens = new Set([...freqA.keys(), ...freqB.keys()]);
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (const token of allTokens) {
      const wA = (freqA.get(token) || 0) * this.getIDF(token);
      const wB = (freqB.get(token) || 0) * this.getIDF(token);
      dotProduct += wA * wB;
      normA += wA * wA;
      normB += wB * wB;
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private getIDF(token: string): number {
    if (this.idfCache.has(token)) return this.idfCache.get(token)!;
    const allDomainWords = new Set<string>();
    for (const domain of Object.values(DOMAIN_VOCABULARY)) {
      for (const kw of domain.keywords) allDomainWords.add(kw);
      for (const e of domain.entities) allDomainWords.add(e.toLowerCase());
      for (const a of domain.actions) allDomainWords.add(a.toLowerCase());
    }
    const N = allDomainWords.size || 1000;
    const df = allDomainWords.has(token) ? 5 : 1;
    const idf = Math.log((N + 1) / (df + 1)) + 1;
    this.idfCache.set(token, idf);
    return idf;
  }

  async findMatchingPatterns(input: string, category: string, limit: number = 10): Promise<ScoredPattern[]> {
    const cacheKey = `${input.substring(0, 50)}:${category}:${limit}`;
    const cached = this.patternCache.get(cacheKey);
    if (cached) return cached;

    const results: ScoredPattern[] = [];

    try {
      if (db) {
        const genPatterns = await db
          .select()
          .from(generationPatterns)
          .where(eq(generationPatterns.patternType, category))
          .limit(100);

        for (const p of genPatterns) {
          const compareText = `${p.patternKey} ${JSON.stringify(p.patternValue || {})}`;
          const score = this.computeTextSimilarity(input, compareText);
          if (score > 0.05) {
            results.push({
              id: p.id,
              patternKey: p.patternKey,
              patternValue: (p.patternValue as Record<string, any>) || {},
              score,
              category: p.patternType,
            });
          }
        }

        const archPatterns = await db
          .select()
          .from(architecturePatterns)
          .where(eq(architecturePatterns.category, category))
          .limit(50);

        for (const ap of archPatterns) {
          const compareText = `${ap.name} ${ap.description} ${ap.category}`;
          const score = this.computeTextSimilarity(input, compareText);
          if (score > 0.05) {
            results.push({
              id: ap.id,
              patternKey: ap.name,
              patternValue: { description: ap.description, techStack: ap.techStack, tradeoffs: ap.tradeoffs, folderStructure: ap.folderStructure },
              score,
              category: ap.category,
            });
          }
        }
      }
    } catch {
      // DB unavailable, fall back to built-in patterns
    }

    if (results.length === 0) {
      const domainMatch = this.detectDomain(input);
      const vocab = DOMAIN_VOCABULARY[domainMatch.primary];
      if (vocab) {
        results.push({
          id: 0,
          patternKey: `${domainMatch.primary}-default`,
          patternValue: { entities: vocab.entities, actions: vocab.actions, domain: domainMatch.primary },
          score: domainMatch.confidence,
          category,
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    const limited = results.slice(0, limit);
    this.patternCache.set(cacheKey, limited);
    return limited;
  }

  async evaluateRules(stageNumber: number, context: Record<string, any>): Promise<RuleResult[]> {
    const cached = this.ruleCache.get(stageNumber);
    if (cached) return cached;

    const results: RuleResult[] = [];

    try {
      if (db) {
        const rules = await db
          .select()
          .from(ruleDefinitions)
          .where(and(
            eq(ruleDefinitions.stageNumber, stageNumber),
            eq(ruleDefinitions.enabled, true),
          ))
          .orderBy(desc(ruleDefinitions.priority));

        for (const rule of rules) {
          const conditions = rule.condition as { field: string; operator: string; value: any }[];
          const allMatch = conditions.every(c => this.matchCondition(c, context));
          results.push({
            ruleId: rule.id,
            name: rule.name,
            matched: allMatch,
            action: rule.action as { type: string; params: Record<string, any> },
            priority: rule.priority ?? 50,
          });
        }
      }
    } catch {
      // DB unavailable
    }

    if (results.length === 0) {
      results.push({
        ruleId: 0,
        name: 'default-fallback',
        matched: true,
        action: { type: 'proceed', params: { useDefaults: true } },
        priority: 1,
      });
    }

    this.ruleCache.set(stageNumber, results);
    return results;
  }

  matchCondition(condition: { field: string; operator: string; value: any }, context: Record<string, any>): boolean {
    const fieldValue = this.resolveFieldPath(condition.field, context);

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;

      case 'contains':
        if (typeof fieldValue === 'string') return fieldValue.toLowerCase().includes(String(condition.value).toLowerCase());
        if (Array.isArray(fieldValue)) return fieldValue.includes(condition.value);
        return false;

      case 'greater_than':
        return typeof fieldValue === 'number' && fieldValue > Number(condition.value);

      case 'less_than':
        return typeof fieldValue === 'number' && fieldValue < Number(condition.value);

      case 'in':
        if (Array.isArray(condition.value)) return condition.value.includes(fieldValue);
        return false;

      case 'not_in':
        if (Array.isArray(condition.value)) return !condition.value.includes(fieldValue);
        return true;

      case 'matches_pattern':
        try {
          const regex = new RegExp(String(condition.value), 'i');
          return regex.test(String(fieldValue));
        } catch {
          return false;
        }

      case 'has_tag':
        if (Array.isArray(fieldValue)) return fieldValue.some(v => String(v).toLowerCase() === String(condition.value).toLowerCase());
        return false;

      default:
        return false;
    }
  }

  private resolveFieldPath(path: string, obj: Record<string, any>): any {
    const parts = path.split('.');
    let current: any = obj;
    for (const part of parts) {
      if (current == null) return undefined;
      current = current[part];
    }
    return current;
  }

  scoreAndRank(candidates: any[], criteria: ScoringCriteria[]): RankedResult[] {
    const scored: RankedResult[] = candidates.map(item => {
      const scores: Record<string, number> = {};
      let totalScore = 0;

      for (const c of criteria) {
        const rawValue = typeof item[c.field] === 'number' ? item[c.field] : 0;
        let normalized = this.normalizeScore(rawValue, c.min ?? 0, c.max ?? 100);
        if (c.direction === 'asc') normalized = 1 - normalized;
        scores[c.field] = normalized;
        totalScore += normalized * c.weight;
      }

      return { item, totalScore, scores, rank: 0 };
    });

    scored.sort((a, b) => b.totalScore - a.totalScore);
    scored.forEach((s, i) => { s.rank = i + 1; });
    return scored;
  }

  normalizeScore(value: number, min: number, max: number): number {
    if (max === min) return 0.5;
    const clamped = Math.max(min, Math.min(max, value));
    return (clamped - min) / (max - min);
  }

  async selectTemplate(projectType: string, userType: string, constraints: Record<string, any>): Promise<SelectedTemplate> {
    const cacheKey = `${projectType}:${userType}`;
    const cached = this.templateCache.get(cacheKey);
    if (cached) return cached;

    try {
      if (db) {
        const blueprints = await db
          .select()
          .from(uxBlueprints)
          .where(and(
            eq(uxBlueprints.projectType, projectType),
            eq(uxBlueprints.userType, userType),
          ))
          .orderBy(desc(uxBlueprints.rating))
          .limit(10);

        if (blueprints.length > 0) {
          const ranked = this.scoreAndRank(
            blueprints.map(b => ({ ...b, usageCount: b.usageCount ?? 0, rating: b.rating ?? 0 })),
            [
              { field: 'rating', weight: 0.6, min: 0, max: 5 },
              { field: 'usageCount', weight: 0.4, min: 0, max: 100, direction: 'desc' },
            ],
          );

          const best = ranked[0].item;
          const result: SelectedTemplate = {
            id: best.id,
            name: best.name,
            layout: best.layout,
            colorScheme: best.colorScheme,
            typography: best.typography,
            componentMap: best.componentMap,
            score: ranked[0].totalScore,
          };
          this.templateCache.set(cacheKey, result);
          return result;
        }
      }
    } catch {
      // DB unavailable
    }

    const fallback: SelectedTemplate = {
      id: 0,
      name: `${projectType}-default`,
      layout: { type: 'sidebar', regions: ['header', 'sidebar', 'main', 'footer'], navigation: 'sidebar', responsive: true },
      colorScheme: { primary: '#3B82F6', secondary: '#6366F1', accent: '#F59E0B', background: '#FFFFFF', text: '#111827' },
      typography: { headingFont: 'Inter', bodyFont: 'Inter', scale: '1.25' },
      componentMap: [
        { region: 'header', components: ['Logo', 'Navigation', 'UserMenu'] },
        { region: 'sidebar', components: ['SideNav', 'QuickActions'] },
        { region: 'main', components: ['PageContent', 'DataTable'] },
      ],
      score: 0.5,
    };
    this.templateCache.set(cacheKey, fallback);
    return fallback;
  }

  async selectComponentTemplate(category: string, framework: string): Promise<ComponentTemplateResult> {
    try {
      if (db) {
        const templates = await db
          .select()
          .from(componentTemplates)
          .where(and(
            eq(componentTemplates.category, category),
            eq(componentTemplates.framework, framework),
          ))
          .orderBy(desc(componentTemplates.usageCount))
          .limit(5);

        if (templates.length > 0) {
          const best = templates[0];
          return {
            id: best.id,
            name: best.name,
            category: best.category,
            framework: best.framework ?? 'react',
            templateCode: best.templateCode,
            propsSchema: best.propsSchema,
            dependencies: (best.dependencies ?? []) as string[],
            score: 1.0,
          };
        }
      }
    } catch {
      // DB unavailable
    }

    return {
      id: 0,
      name: `${category}-default`,
      category,
      framework,
      templateCode: this.getDefaultComponentTemplate(category),
      propsSchema: {},
      dependencies: [],
      score: 0.3,
    };
  }

  private getDefaultComponentTemplate(category: string): string {
    const templates: Record<string, string> = {
      form: 'export function FormComponent({ onSubmit, fields }) { return (<form onSubmit={onSubmit}>{fields.map(f => (<div key={f.name}><label>{f.label}</label><input type={f.type} name={f.name} /></div>))}<button type="submit">Submit</button></form>); }',
      table: 'export function DataTable({ data, columns }) { return (<table><thead><tr>{columns.map(c => (<th key={c.key}>{c.label}</th>))}</tr></thead><tbody>{data.map((row, i) => (<tr key={i}>{columns.map(c => (<td key={c.key}>{row[c.key]}</td>))}</tr>))}</tbody></table>); }',
      card: 'export function Card({ title, children, footer }) { return (<div className="card"><div className="card-header">{title}</div><div className="card-body">{children}</div>{footer && <div className="card-footer">{footer}</div>}</div>); }',
      list: 'export function ListComponent({ items, renderItem }) { return (<ul>{items.map((item, i) => (<li key={i}>{renderItem(item)}</li>))}</ul>); }',
      modal: 'export function Modal({ isOpen, onClose, title, children }) { if (!isOpen) return null; return (<div className="modal-overlay" onClick={onClose}><div className="modal" onClick={e => e.stopPropagation()}><h2>{title}</h2>{children}</div></div>); }',
    };
    return templates[category] || templates['card'];
  }

  buildFeatureGraph(entities: any[], relationships: any[]): FeatureGraphData {
    const nodes = new Map<string, GraphNode>();
    const edges: GraphEdge[] = [];

    for (const entity of entities) {
      const id = entity.name || entity.id || String(entities.indexOf(entity));
      nodes.set(id, {
        id,
        type: entity.type || 'entity',
        label: entity.name || id,
        properties: entity,
      });
    }

    for (const rel of relationships) {
      const source = rel.from || rel.source;
      const target = rel.to || rel.target;
      if (source && target) {
        if (!nodes.has(source)) {
          nodes.set(source, { id: source, type: 'entity', label: source, properties: {} });
        }
        if (!nodes.has(target)) {
          nodes.set(target, { id: target, type: 'entity', label: target, properties: {} });
        }
        edges.push({
          source,
          target,
          type: rel.type || 'depends_on',
          weight: rel.weight || 1,
        });
      }
    }

    return { nodes, edges };
  }

  detectCycles(graph: FeatureGraphData): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const adjacency = new Map<string, string[]>();
    for (const edge of graph.edges) {
      if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
      adjacency.get(edge.source)!.push(edge.target);
    }

    const dfs = (node: string) => {
      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const neighbors = adjacency.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor);
        } else if (recursionStack.has(neighbor)) {
          const cycleStart = path.indexOf(neighbor);
          if (cycleStart !== -1) {
            cycles.push([...path.slice(cycleStart), neighbor]);
          }
        }
      }

      path.pop();
      recursionStack.delete(node);
    };

    for (const nodeId of graph.nodes.keys()) {
      if (!visited.has(nodeId)) {
        dfs(nodeId);
      }
    }

    return cycles;
  }

  detectConflicts(graph: FeatureGraphData): GraphConflict[] {
    const conflicts: GraphConflict[] = [];

    const incomingCount = new Map<string, number>();
    for (const edge of graph.edges) {
      incomingCount.set(edge.target, (incomingCount.get(edge.target) || 0) + 1);
    }

    for (const [nodeId, count] of incomingCount) {
      if (count > 5) {
        conflicts.push({
          nodeA: nodeId,
          nodeB: '',
          reason: `Node "${nodeId}" has ${count} incoming dependencies - potential bottleneck`,
        });
      }
    }

    const bidirectional = new Set<string>();
    for (const edge of graph.edges) {
      const reverseKey = `${edge.target}->${edge.source}`;
      const forwardKey = `${edge.source}->${edge.target}`;
      if (bidirectional.has(reverseKey)) {
        conflicts.push({
          nodeA: edge.source,
          nodeB: edge.target,
          reason: `Bidirectional dependency between "${edge.source}" and "${edge.target}"`,
        });
      }
      bidirectional.add(forwardKey);
    }

    return conflicts;
  }

  topologicalSort(graph: FeatureGraphData): string[] {
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    for (const nodeId of graph.nodes.keys()) {
      inDegree.set(nodeId, 0);
      adjacency.set(nodeId, []);
    }

    for (const edge of graph.edges) {
      if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
      adjacency.get(edge.source)!.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    }

    const queue: string[] = [];
    for (const [nodeId, degree] of inDegree) {
      if (degree === 0) queue.push(nodeId);
    }

    const sorted: string[] = [];
    while (queue.length > 0) {
      const node = queue.shift()!;
      sorted.push(node);
      for (const neighbor of (adjacency.get(node) || [])) {
        const newDegree = (inDegree.get(neighbor) || 1) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) queue.push(neighbor);
      }
    }

    if (sorted.length < graph.nodes.size) {
      for (const nodeId of graph.nodes.keys()) {
        if (!sorted.includes(nodeId)) sorted.push(nodeId);
      }
    }

    return sorted;
  }

  generateEmbedding(text: string): number[] {
    const cached = this.embeddingCache.get(text);
    if (cached) return cached;

    const DIMENSIONS = 384;
    const vector = new Float64Array(DIMENSIONS).fill(0);
    const tokens = this.tokenize(text);
    if (tokens.length === 0) {
      const result = Array.from(vector);
      this.embeddingCache.set(text, result);
      return result;
    }

    const freq = new Map<string, number>();
    for (const t of tokens) freq.set(t, (freq.get(t) || 0) + 1);

    const maxFreq = Math.max(...freq.values());

    for (const [token, count] of freq) {
      const tf = 0.5 + 0.5 * (count / maxFreq);
      const idf = this.getIDF(token);
      const weight = tf * idf;

      const hash1 = this.hashString(token, 0);
      const hash2 = this.hashString(token, 7919);
      const hash3 = this.hashString(token, 104729);

      const idx1 = Math.abs(hash1) % DIMENSIONS;
      const idx2 = Math.abs(hash2) % DIMENSIONS;
      const idx3 = Math.abs(hash3) % DIMENSIONS;

      vector[idx1] += weight;
      vector[idx2] += weight * 0.7;
      vector[idx3] += weight * 0.4;

      for (let i = 0; i < 3; i++) {
        const bigramIdx = Math.abs(this.hashString(token + String(i), 31337)) % DIMENSIONS;
        vector[bigramIdx] += weight * 0.3;
      }
    }

    const bigrams: string[] = [];
    for (let i = 0; i < tokens.length - 1; i++) {
      bigrams.push(tokens[i] + '_' + tokens[i + 1]);
    }
    for (const bg of bigrams) {
      const idx = Math.abs(this.hashString(bg, 65537)) % DIMENSIONS;
      vector[idx] += 0.5;
    }

    let norm = 0;
    for (let i = 0; i < DIMENSIONS; i++) norm += vector[i] * vector[i];
    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (let i = 0; i < DIMENSIONS; i++) vector[i] /= norm;
    }

    const result = Array.from(vector);
    this.embeddingCache.set(text, result);
    return result;
  }

  private hashString(str: string, seed: number): number {
    let h = seed;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return h;
  }

  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async searchSimilar(query: string, category: string, limit: number = 10): Promise<SimilarResult[]> {
    const queryEmbedding = this.generateEmbedding(query);
    const results: SimilarResult[] = [];

    try {
      if (db) {
        const query_builder = category === 'all'
          ? db.select().from(vectorEmbeddings).limit(200)
          : db.select().from(vectorEmbeddings).where(eq(vectorEmbeddings.category, category)).limit(200);
        const stored = await query_builder;

        for (const entry of stored) {
          const storedEmbedding = entry.embedding as number[];
          if (storedEmbedding && storedEmbedding.length > 0) {
            const similarity = this.cosineSimilarity(queryEmbedding, storedEmbedding);
            if (similarity > 0.1) {
              results.push({
                id: entry.id,
                sourceType: entry.sourceType,
                sourceId: entry.sourceId,
                content: entry.content,
                similarity,
                metadata: entry.metadata,
              });
            }
          }
        }
      }
    } catch {
      // DB unavailable
    }

    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, limit);
  }

  async storeEmbedding(sourceType: string, sourceId: string, content: string, category: string, metadata?: any): Promise<void> {
    const embedding = this.generateEmbedding(content);

    try {
      if (db) {
        await db.insert(vectorEmbeddings).values({
          sourceType,
          sourceId,
          content,
          embedding,
          dimensions: 384,
          category,
          metadata: metadata || {},
        });
      }
    } catch {
      // DB unavailable - embedding generated but not stored
    }
  }

  parseIntent(description: string): ParsedIntent {
    const entities = this.extractEntities(description);
    const domain = this.detectDomain(description);
    const tokens = this.tokenize(description);

    const actionWords = ['create', 'build', 'make', 'develop', 'design', 'implement', 'add', 'remove',
      'update', 'delete', 'edit', 'manage', 'track', 'monitor', 'search', 'filter',
      'sort', 'export', 'import', 'upload', 'download', 'send', 'receive', 'notify',
      'schedule', 'assign', 'approve', 'reject', 'submit', 'review', 'publish',
      'share', 'analyze', 'report', 'visualize', 'configure', 'deploy', 'integrate',
      'authenticate', 'authorize', 'validate', 'process', 'calculate', 'generate'];

    const actions = tokens.filter(t => actionWords.includes(t));

    const relationships: { from: string; to: string; type: string }[] = [];
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const eName1 = entities[i].name.toLowerCase();
        const eName2 = entities[j].name.toLowerCase();
        const descLower = description.toLowerCase();
        const patterns = [
          { regex: new RegExp(`${eName1}.*has.*${eName2}`, 'i'), type: 'one-to-many' },
          { regex: new RegExp(`${eName1}.*belongs.*${eName2}`, 'i'), type: 'many-to-one' },
          { regex: new RegExp(`${eName1}.*and.*${eName2}`, 'i'), type: 'association' },
          { regex: new RegExp(`${eName2}.*for.*${eName1}`, 'i'), type: 'one-to-many' },
        ];
        for (const p of patterns) {
          if (p.regex.test(descLower)) {
            relationships.push({ from: entities[i].name, to: entities[j].name, type: p.type });
            break;
          }
        }
      }
    }

    const complexity = this.estimateComplexity(description, entities.length);

    return {
      entities,
      actions,
      relationships,
      domain,
      complexity,
      keywords: tokens.slice(0, 20),
    };
  }

  extractEntities(text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    const seen = new Set<string>();
    const textLower = text.toLowerCase();

    for (const [, vocab] of Object.entries(DOMAIN_VOCABULARY)) {
      for (const entityName of vocab.entities) {
        const normalizedEntity = entityName.toLowerCase();
        if (textLower.includes(normalizedEntity) && !seen.has(normalizedEntity)) {
          seen.add(normalizedEntity);
          entities.push({
            name: entityName,
            type: 'domain-entity',
            fields: this.inferFieldsForEntity(entityName),
            confidence: 0.9,
          });
        }
      }
    }

    const words = text.split(/\s+/);
    for (const word of words) {
      const clean = word.replace(/[^a-zA-Z]/g, '');
      if (clean.length > 2 && /^[A-Z]/.test(clean) && !seen.has(clean.toLowerCase())) {
        const isLikelyEntity = clean.length > 3 && !/^(The|This|That|With|From|About|Into|Over|When|Where|What|Which|Here|There|They|Their|Some|Each|Every|Also|Just|More|Most|Very|Only|Than|Then|Both|Such|Much|Many)$/.test(clean);
        if (isLikelyEntity) {
          seen.add(clean.toLowerCase());
          entities.push({
            name: clean,
            type: 'inferred-entity',
            fields: this.inferFieldsForEntity(clean),
            confidence: 0.5,
          });
        }
      }
    }

    const pluralPatterns = [
      { regex: /manage\s+(\w+)/gi, confidence: 0.7 },
      { regex: /track\s+(\w+)/gi, confidence: 0.7 },
      { regex: /list\s+of\s+(\w+)/gi, confidence: 0.8 },
      { regex: /(\w+)\s+management/gi, confidence: 0.75 },
      { regex: /(\w+)\s+tracking/gi, confidence: 0.7 },
      { regex: /(\w+)\s+system/gi, confidence: 0.6 },
    ];

    for (const pattern of pluralPatterns) {
      let match;
      while ((match = pattern.regex.exec(text)) !== null) {
        let name = match[1];
        if (name.endsWith('s') && name.length > 3) name = name.slice(0, -1);
        name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
        if (!seen.has(name.toLowerCase()) && name.length > 2 && !STOP_WORDS.has(name.toLowerCase())) {
          seen.add(name.toLowerCase());
          entities.push({
            name,
            type: 'pattern-inferred',
            fields: this.inferFieldsForEntity(name),
            confidence: pattern.confidence,
          });
        }
      }
    }

    return entities;
  }

  private inferFieldsForEntity(entityName: string): string[] {
    const base = ['id', 'name', 'createdAt'];
    const nameL = entityName.toLowerCase();
    const extra: string[] = [];

    if (['user', 'customer', 'employee', 'member', 'patient', 'student', 'teacher', 'trainer', 'agent', 'driver'].some(n => nameL.includes(n))) {
      extra.push('email', 'phone', 'status', 'role');
    }
    if (['order', 'invoice', 'payment', 'transaction', 'booking', 'subscription'].some(n => nameL.includes(n))) {
      extra.push('amount', 'status', 'date', 'userId');
    }
    if (['product', 'item', 'menuitem', 'course', 'workout', 'exercise'].some(n => nameL.includes(n))) {
      extra.push('title', 'description', 'price', 'category', 'status');
    }
    if (['post', 'comment', 'message', 'review', 'note', 'document'].some(n => nameL.includes(n))) {
      extra.push('content', 'authorId', 'status');
    }
    if (['task', 'ticket', 'issue', 'milestone', 'goal'].some(n => nameL.includes(n))) {
      extra.push('title', 'description', 'status', 'priority', 'assigneeId', 'dueDate');
    }
    if (['property', 'listing', 'hotel', 'restaurant', 'warehouse'].some(n => nameL.includes(n))) {
      extra.push('address', 'description', 'status', 'capacity');
    }
    if (extra.length === 0) {
      extra.push('description', 'status');
    }

    return [...base, ...extra];
  }

  detectDomain(text: string): DetectedDomain {
    const textLower = text.toLowerCase();
    const scores: { domain: string; score: number; keywords: string[] }[] = [];

    for (const [domainId, vocab] of Object.entries(DOMAIN_VOCABULARY)) {
      let score = 0;
      const matchedKeywords: string[] = [];
      for (const kw of vocab.keywords) {
        if (textLower.includes(kw)) {
          score += kw.length > 5 ? 2 : 1;
          matchedKeywords.push(kw);
        }
      }
      for (const entity of vocab.entities) {
        if (textLower.includes(entity.toLowerCase())) {
          score += 3;
          matchedKeywords.push(entity);
        }
      }
      for (const action of vocab.actions) {
        if (textLower.includes(action)) {
          score += 0.5;
        }
      }
      if (score > 0) {
        scores.push({ domain: domainId, score, keywords: matchedKeywords });
      }
    }

    scores.sort((a, b) => b.score - a.score);

    if (scores.length === 0) {
      return { primary: 'general', confidence: 0.3, secondary: [], keywords: [] };
    }

    const best = scores[0];
    const maxPossible = DOMAIN_VOCABULARY[best.domain].keywords.length * 2 + DOMAIN_VOCABULARY[best.domain].entities.length * 3;
    const confidence = Math.min(0.99, best.score / Math.max(maxPossible * 0.3, 1));

    return {
      primary: best.domain,
      confidence,
      secondary: scores.slice(1, 3).map(s => s.domain),
      keywords: best.keywords,
    };
  }

  estimateComplexity(description: string, entityCount: number): ComplexityEstimate {
    const factors: string[] = [];
    let score = 0;

    score += entityCount * 8;
    if (entityCount > 0) factors.push(`${entityCount} entities detected`);

    const complexIndicators = [
      { pattern: /real.?time/i, weight: 15, factor: 'Real-time features' },
      { pattern: /authentication|auth|login|signup/i, weight: 10, factor: 'Authentication system' },
      { pattern: /payment|billing|subscription|stripe/i, weight: 15, factor: 'Payment processing' },
      { pattern: /dashboard|analytics|report/i, weight: 10, factor: 'Analytics dashboard' },
      { pattern: /upload|file|image|media/i, weight: 8, factor: 'File management' },
      { pattern: /notification|email|sms|push/i, weight: 8, factor: 'Notification system' },
      { pattern: /role|permission|admin|rbac/i, weight: 12, factor: 'Role-based access' },
      { pattern: /search|filter|sort|pagination/i, weight: 5, factor: 'Advanced querying' },
      { pattern: /workflow|pipeline|automation/i, weight: 12, factor: 'Workflow automation' },
      { pattern: /api|integration|webhook/i, weight: 8, factor: 'API integration' },
      { pattern: /multi.?tenant|saas/i, weight: 20, factor: 'Multi-tenancy' },
      { pattern: /i18n|localization|multilingual/i, weight: 10, factor: 'Internationalization' },
      { pattern: /chat|messaging|socket/i, weight: 12, factor: 'Real-time messaging' },
      { pattern: /map|geolocation|gps/i, weight: 10, factor: 'Geolocation features' },
    ];

    for (const indicator of complexIndicators) {
      if (indicator.pattern.test(description)) {
        score += indicator.weight;
        factors.push(indicator.factor);
      }
    }

    const wordCount = description.split(/\s+/).length;
    if (wordCount > 100) { score += 10; factors.push('Detailed requirements'); }
    if (wordCount > 200) { score += 10; factors.push('Extensive specification'); }

    let level: ComplexityEstimate['level'];
    if (score < 20) level = 'simple';
    else if (score < 50) level = 'moderate';
    else if (score < 100) level = 'complex';
    else level = 'enterprise';

    return { level, score: Math.min(100, score), factors };
  }

  async synthesize(stage: number, input: any): Promise<SynthesisResult> {
    const description = typeof input === 'string' ? input : (input?.description || input?.userRequest || JSON.stringify(input));
    const reasoning: string[] = [];

    const [patterns, rules, vectorMatches] = await Promise.all([
      this.findMatchingPatterns(description, `stage-${stage}`),
      this.evaluateRules(stage, typeof input === 'object' ? input : { description }),
      this.searchSimilar(description, `stage-${stage}`, 5),
    ]);

    reasoning.push(`Found ${patterns.length} matching patterns for stage ${stage}`);
    reasoning.push(`Evaluated ${rules.length} rules, ${rules.filter(r => r.matched).length} matched`);
    reasoning.push(`Found ${vectorMatches.length} similar previous results`);

    const projectType = typeof input === 'object' ? (input.projectType || 'webapp') : 'webapp';
    const userType = typeof input === 'object' ? (input.userType || 'developer') : 'developer';
    const constraints = typeof input === 'object' ? (input.constraints || {}) : {};

    let template: SelectedTemplate | null = null;
    if (stage >= 6) {
      template = await this.selectTemplate(projectType, userType, constraints);
      reasoning.push(`Selected template: ${template.name} (score: ${template.score.toFixed(2)})`);
    }

    const matchedRules = rules.filter(r => r.matched);
    const decision: Record<string, any> = {
      stage,
      topPattern: patterns[0] || null,
      applicableRules: matchedRules.map(r => r.action),
      template: template?.name || null,
      vectorConfidence: vectorMatches.length > 0 ? vectorMatches[0].similarity : 0,
    };

    const patternConfidence = patterns.length > 0 ? patterns[0].score : 0;
    const ruleConfidence = matchedRules.length > 0 ? 0.8 : 0.4;
    const vectorConfidence = vectorMatches.length > 0 ? vectorMatches[0].similarity : 0;
    const confidence = (patternConfidence * 0.4 + ruleConfidence * 0.3 + vectorConfidence * 0.3);

    return {
      patterns,
      rules,
      templates: template,
      vectorMatches,
      decision,
      confidence: Math.min(0.99, confidence),
      reasoning,
    };
  }

  generateArchitectureDecision(projectType: string, constraints: any): ArchitectureDecision {
    const fallback = ARCHITECTURE_FALLBACKS[projectType] || ARCHITECTURE_FALLBACKS['webapp'];
    const decision = { ...fallback };

    if (constraints) {
      if (constraints.framework) decision.frontend = constraints.framework;
      if (constraints.database) decision.database = constraints.database;
      if (constraints.styling) decision.styling = constraints.styling;
      if (constraints.authentication) decision.authentication = constraints.authentication;
      if (constraints.stateManagement) decision.stateManagement = constraints.stateManagement;
    }

    decision.reasoning = [
      `Selected ${decision.pattern} pattern for ${projectType} project`,
      `Frontend: ${decision.frontend} with ${decision.styling}`,
      `Backend: ${decision.backend} with ${decision.database}`,
      `State: ${decision.stateManagement}, Auth: ${decision.authentication}`,
    ];

    return decision;
  }

  generateSchemaRecommendation(entities: any[]): SchemaRecommendation {
    const tables: SchemaRecommendation['tables'] = [];
    const indexes: SchemaRecommendation['indexes'] = [];
    const relationships: SchemaRecommendation['relationships'] = [];
    const reasoning: string[] = [];

    for (const entity of entities) {
      const name = entity.name || entity;
      const tableName = this.toSnakeCase(typeof name === 'string' ? name : 'unknown');
      const columns: { name: string; type: string; nullable: boolean; references?: string }[] = [
        { name: 'id', type: 'serial', nullable: false },
        { name: 'created_at', type: 'timestamp', nullable: false },
      ];

      const fields = entity.fields || this.inferFieldsForEntity(typeof name === 'string' ? name : 'unknown');
      for (const field of fields) {
        const fieldName = typeof field === 'string' ? field : field.name;
        if (['id', 'createdAt', 'created_at'].includes(fieldName)) continue;

        const snakeName = this.toSnakeCase(fieldName);
        let type = 'text';
        if (typeof field === 'object' && field.type) {
          type = this.mapFieldType(field.type);
        } else {
          type = this.inferFieldType(fieldName);
        }

        const isFk = fieldName.endsWith('Id') || fieldName.endsWith('_id');
        columns.push({
          name: snakeName,
          type,
          nullable: typeof field === 'object' ? !(field.required ?? false) : true,
          ...(isFk ? { references: this.toSnakeCase(fieldName.replace(/Id$|_id$/, '')) + 's' } : {}),
        });

        if (isFk) {
          const targetTable = this.toSnakeCase(fieldName.replace(/Id$|_id$/, '')) + 's';
          relationships.push({
            from: tableName + 's',
            to: targetTable,
            type: 'many-to-one',
            foreignKey: snakeName,
          });
        }
      }

      tables.push({ name: tableName + 's', columns });

      indexes.push({ table: tableName + 's', columns: ['id'], unique: true });
      const fkColumns = columns.filter(c => c.references);
      for (const fk of fkColumns) {
        indexes.push({ table: tableName + 's', columns: [fk.name], unique: false });
      }

      reasoning.push(`Generated table "${tableName}s" with ${columns.length} columns`);
    }

    return { tables, indexes, relationships, reasoning };
  }

  private toSnakeCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/[\s\-]+/g, '_')
      .toLowerCase();
  }

  private mapFieldType(type: string): string {
    const typeMap: Record<string, string> = {
      'string': 'text',
      'text': 'text',
      'number': 'integer',
      'integer': 'integer',
      'float': 'real',
      'decimal': 'numeric',
      'boolean': 'boolean',
      'bool': 'boolean',
      'date': 'timestamp',
      'datetime': 'timestamp',
      'timestamp': 'timestamp',
      'json': 'jsonb',
      'object': 'jsonb',
      'array': 'jsonb',
      'serial': 'serial',
      'uuid': 'uuid',
    };
    if (type.startsWith('enum:')) return 'text';
    return typeMap[type.toLowerCase()] || 'text';
  }

  private inferFieldType(fieldName: string): string {
    const name = fieldName.toLowerCase();
    if (name === 'id' || name.endsWith('id') || name.endsWith('_id')) return 'integer';
    if (name.includes('email')) return 'text';
    if (name.includes('phone')) return 'text';
    if (name.includes('url') || name.includes('link') || name.includes('avatar') || name.includes('image')) return 'text';
    if (name.includes('price') || name.includes('amount') || name.includes('cost') || name.includes('rate') || name.includes('salary')) return 'numeric';
    if (name.includes('count') || name.includes('quantity') || name.includes('age') || name.includes('score')) return 'integer';
    if (name.includes('is') || name.includes('has') || name.includes('enabled') || name.includes('active') || name.includes('verified')) return 'boolean';
    if (name.includes('date') || name.includes('at') || name.includes('time')) return 'timestamp';
    if (name.includes('data') || name.includes('config') || name.includes('settings') || name.includes('metadata') || name.includes('options')) return 'jsonb';
    if (name.includes('tags') || name.includes('skills') || name.includes('permissions')) return 'text[]';
    return 'text';
  }
}

export const localAI = new LocalAIEngine();