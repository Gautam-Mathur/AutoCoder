// Advanced Intelligence Module - Makes Code Brain as capable as an AI agent
// 7 Core Capabilities: NLU, Reasoning, Memory, Error Analysis, Code Understanding, Creativity, Explanations

// ============================================================================
// 1. NATURAL LANGUAGE UNDERSTANDING
// ============================================================================

interface SemanticIntent {
  action: 'create' | 'modify' | 'delete' | 'explain' | 'fix' | 'refactor' | 'add' | 'remove' | 'change' | 'optimize' | 'test' | 'deploy';
  target: string;
  attributes: Record<string, string>;
  context: string[];
  confidence: number;
  ambiguities: string[];
}

const synonymMap: Record<string, string[]> = {
  create: ['make', 'build', 'generate', 'develop', 'construct', 'setup', 'initialize', 'scaffold', 'bootstrap', 'craft', 'design', 'implement', 'write', 'code', 'add new'],
  modify: ['change', 'update', 'edit', 'alter', 'adjust', 'tweak', 'revise', 'transform', 'convert', 'replace', 'swap'],
  delete: ['remove', 'drop', 'eliminate', 'clear', 'erase', 'destroy', 'trash', 'get rid of', 'kill'],
  fix: ['repair', 'solve', 'resolve', 'debug', 'correct', 'patch', 'heal', 'mend', 'troubleshoot', 'address'],
  refactor: ['restructure', 'reorganize', 'clean up', 'optimize', 'improve', 'enhance', 'simplify', 'streamline'],
  explain: ['describe', 'tell me', 'what is', 'how does', 'why', 'show me', 'help me understand', 'clarify'],
  add: ['include', 'insert', 'put', 'attach', 'append', 'integrate', 'incorporate'],
  button: ['btn', 'cta', 'click', 'action button', 'submit', 'trigger'],
  form: ['input', 'fields', 'submission', 'entry', 'data entry'],
  page: ['screen', 'view', 'route', 'section', 'tab'],
  component: ['element', 'widget', 'module', 'block', 'piece', 'part'],
  dashboard: ['admin', 'panel', 'control center', 'overview', 'analytics'],
  authentication: ['auth', 'login', 'signin', 'signup', 'register', 'user access', 'session'],
  database: ['db', 'storage', 'data store', 'persistence', 'backend data'],
  api: ['endpoint', 'route', 'service', 'backend', 'server'],
  style: ['css', 'design', 'look', 'appearance', 'theme', 'visual'],
  responsive: ['mobile-friendly', 'adaptive', 'flexible', 'multi-device'],
  animation: ['transition', 'motion', 'effect', 'movement', 'dynamic'],
  modal: ['popup', 'dialog', 'overlay', 'lightbox', 'prompt'],
  table: ['grid', 'list', 'data view', 'spreadsheet', 'rows'],
  chart: ['graph', 'visualization', 'plot', 'diagram', 'analytics'],
  search: ['filter', 'find', 'query', 'lookup', 'search bar'],
  upload: ['import', 'attach file', 'file input', 'dropzone'],
  download: ['export', 'save', 'get file'],
  notification: ['alert', 'toast', 'message', 'snackbar', 'banner'],
  error: ['bug', 'issue', 'problem', 'failure', 'crash', 'broken'],
  loading: ['spinner', 'skeleton', 'pending', 'fetching', 'wait'],
  card: ['tile', 'box', 'container', 'panel'],
  header: ['navbar', 'topbar', 'navigation', 'menu bar'],
  footer: ['bottom bar', 'site footer'],
  sidebar: ['sidenav', 'left menu', 'drawer', 'nav panel'],
};

const contextPatterns: Record<string, RegExp[]> = {
  ecommerce: [/shop/i, /store/i, /cart/i, /checkout/i, /product/i, /order/i, /payment/i, /inventory/i],
  blog: [/post/i, /article/i, /blog/i, /content/i, /author/i, /publish/i, /comment/i],
  social: [/feed/i, /follow/i, /like/i, /share/i, /profile/i, /friend/i, /message/i, /chat/i],
  saas: [/subscription/i, /plan/i, /billing/i, /tenant/i, /workspace/i, /team/i],
  crm: [/customer/i, /lead/i, /contact/i, /deal/i, /pipeline/i, /sales/i],
  dashboard: [/analytics/i, /metrics/i, /kpi/i, /report/i, /chart/i, /widget/i],
  portfolio: [/project/i, /work/i, /showcase/i, /gallery/i, /about me/i],
  booking: [/appointment/i, /schedule/i, /calendar/i, /reservation/i, /slot/i],
};

export function parseSemanticIntent(input: string): SemanticIntent {
  const normalized = input.toLowerCase().trim();
  const words = normalized.split(/\s+/);

  let action: SemanticIntent['action'] = 'create';
  let confidence = 0.5;
  const ambiguities: string[] = [];

  for (const [baseAction, synonyms] of Object.entries(synonymMap)) {
    if (['create', 'modify', 'delete', 'fix', 'refactor', 'explain', 'add', 'remove', 'change', 'optimize', 'test', 'deploy'].includes(baseAction)) {
      for (const synonym of synonyms) {
        if (normalized.includes(synonym)) {
          action = baseAction as SemanticIntent['action'];
          confidence = 0.8;
          break;
        }
      }
    }
  }

  const target = extractTarget(normalized);
  const attributes = extractAttributes(normalized);
  const context = detectContext(normalized);

  if (normalized.includes('or') || normalized.includes('maybe') || normalized.includes('possibly')) {
    ambiguities.push('User expressed uncertainty - may need clarification');
    confidence *= 0.7;
  }

  if (words.length < 3) {
    ambiguities.push('Request is very short - may need more details');
    confidence *= 0.8;
  }

  return { action, target, attributes, context, confidence, ambiguities };
}

function extractTarget(input: string): string {
  const targetPatterns = [
    /(?:create|build|make|add|modify|change|fix|update)\s+(?:a\s+)?(?:new\s+)?(.+?)(?:\s+with|\s+that|\s+for|\s+using|$)/i,
    /(?:the\s+)?(.+?)\s+(?:component|page|feature|button|form|section)/i,
    /(.+?)\s+(?:is|are|was|were)\s+(?:broken|not working|buggy)/i,
  ];

  for (const pattern of targetPatterns) {
    const match = input.match(pattern);
    if (match) return match[1].trim();
  }

  const nouns = ['button', 'form', 'page', 'component', 'modal', 'table', 'chart', 'header', 'footer', 'sidebar', 'card', 'list', 'menu', 'dashboard', 'login', 'signup', 'profile', 'settings', 'api', 'database'];
  for (const noun of nouns) {
    if (input.includes(noun)) return noun;
  }

  return 'application';
}

function extractAttributes(input: string): Record<string, string> {
  const attrs: Record<string, string> = {};

  const colorMatch = input.match(/(?:in\s+)?(?:color\s+)?(?:be\s+)?(red|blue|green|yellow|purple|orange|pink|black|white|gray|primary|secondary|accent)/i);
  if (colorMatch) attrs.color = colorMatch[1];

  const sizeMatch = input.match(/(small|medium|large|xl|xs|sm|md|lg|tiny|huge|compact|full[- ]?width)/i);
  if (sizeMatch) attrs.size = sizeMatch[1];

  const positionMatch = input.match(/(left|right|center|top|bottom|fixed|sticky|absolute|floating)/i);
  if (positionMatch) attrs.position = positionMatch[1];

  const styleMatch = input.match(/(rounded|square|outlined|filled|ghost|gradient|shadow|flat|minimal|modern|classic)/i);
  if (styleMatch) attrs.style = styleMatch[1];

  const numberMatch = input.match(/(\d+)\s*(?:items?|columns?|rows?|cards?|buttons?)/i);
  if (numberMatch) attrs.count = numberMatch[1];

  return attrs;
}

function detectContext(input: string): string[] {
  const contexts: string[] = [];

  for (const [context, patterns] of Object.entries(contextPatterns)) {
    if (patterns.some(p => p.test(input))) {
      contexts.push(context);
    }
  }

  return contexts;
}

export function resolveSynonyms(input: string): string {
  let resolved = input.toLowerCase();

  for (const [canonical, synonyms] of Object.entries(synonymMap)) {
    for (const synonym of synonyms) {
      if (synonym.includes(' ')) {
        const regex = new RegExp(synonym, 'gi');
        resolved = resolved.replace(regex, canonical);
      }
    }
  }

  for (const [canonical, synonyms] of Object.entries(synonymMap)) {
    for (const synonym of synonyms) {
      if (!synonym.includes(' ')) {
        const regex = new RegExp(`\\b${synonym}\\b`, 'gi');
        resolved = resolved.replace(regex, canonical);
      }
    }
  }

  return resolved;
}

export function handleAmbiguousRequest(input: string): { clarifications: string[]; suggestions: string[] } {
  const intent = parseSemanticIntent(input);
  const clarifications: string[] = [];
  const suggestions: string[] = [];

  if (intent.target === 'application' && intent.action === 'create') {
    clarifications.push('What type of application would you like to build?');
    suggestions.push('E-commerce store', 'Blog platform', 'Dashboard', 'Portfolio site', 'SaaS application');
  }

  if (intent.action === 'modify' && !input.includes('the') && !input.includes('my')) {
    clarifications.push('Which specific element would you like to modify?');
  }

  if (intent.action === 'fix' && intent.confidence < 0.6) {
    clarifications.push('Can you describe the error or issue you are experiencing?');
  }

  if (Object.keys(intent.attributes).length === 0 && intent.action === 'create') {
    clarifications.push('Would you like any specific styling or features?');
    suggestions.push('Modern design', 'Dark mode support', 'Mobile responsive', 'With animations');
  }

  return { clarifications, suggestions };
}

// ============================================================================
// 2. REASONING ENGINE
// ============================================================================

interface Task {
  id: string;
  description: string;
  type: 'file' | 'component' | 'function' | 'style' | 'config' | 'integration';
  dependencies: string[];
  priority: number;
  estimatedComplexity: 'trivial' | 'simple' | 'moderate' | 'complex' | 'very_complex';
}

interface DecomposedProblem {
  mainGoal: string;
  tasks: Task[];
  executionOrder: string[];
  conflicts: string[];
  warnings: string[];
}

export function decomposeProblem(input: string): DecomposedProblem {
  const intent = parseSemanticIntent(input);
  const tasks: Task[] = [];
  const conflicts: string[] = [];
  const warnings: string[] = [];

  if (intent.action === 'create') {
    tasks.push(...generateCreationTasks(intent));
  } else if (intent.action === 'modify' || intent.action === 'change') {
    tasks.push(...generateModificationTasks(intent));
  } else if (intent.action === 'fix') {
    tasks.push(...generateFixTasks(intent));
  } else if (intent.action === 'refactor') {
    tasks.push(...generateRefactorTasks(intent));
  }

  const resolved = resolveDependencies(tasks);
  detectConflicts(tasks, conflicts, warnings);

  return {
    mainGoal: `${intent.action} ${intent.target}`,
    tasks: resolved.tasks,
    executionOrder: resolved.order,
    conflicts,
    warnings,
  };
}

function generateCreationTasks(intent: SemanticIntent): Task[] {
  const tasks: Task[] = [];
  const target = intent.target.toLowerCase();

  if (intent.context.includes('ecommerce') || target.includes('shop') || target.includes('store')) {
    tasks.push(
      { id: 'schema', description: 'Define database schema for products, orders, users', type: 'config', dependencies: [], priority: 1, estimatedComplexity: 'moderate' },
      { id: 'api-products', description: 'Create product CRUD API endpoints', type: 'function', dependencies: ['schema'], priority: 2, estimatedComplexity: 'moderate' },
      { id: 'api-orders', description: 'Create order management API', type: 'function', dependencies: ['schema'], priority: 2, estimatedComplexity: 'complex' },
      { id: 'api-cart', description: 'Create shopping cart API', type: 'function', dependencies: ['schema'], priority: 2, estimatedComplexity: 'moderate' },
      { id: 'auth', description: 'Set up user authentication', type: 'integration', dependencies: ['schema'], priority: 2, estimatedComplexity: 'complex' },
      { id: 'product-list', description: 'Create product listing component', type: 'component', dependencies: ['api-products'], priority: 3, estimatedComplexity: 'moderate' },
      { id: 'product-detail', description: 'Create product detail page', type: 'component', dependencies: ['api-products'], priority: 3, estimatedComplexity: 'moderate' },
      { id: 'cart-component', description: 'Create shopping cart component', type: 'component', dependencies: ['api-cart'], priority: 3, estimatedComplexity: 'complex' },
      { id: 'checkout', description: 'Create checkout flow', type: 'component', dependencies: ['api-orders', 'cart-component', 'auth'], priority: 4, estimatedComplexity: 'very_complex' },
      { id: 'styles', description: 'Apply e-commerce styling and theme', type: 'style', dependencies: [], priority: 5, estimatedComplexity: 'moderate' },
    );
  } else if (intent.context.includes('dashboard') || target.includes('dashboard') || target.includes('admin')) {
    tasks.push(
      { id: 'layout', description: 'Create dashboard layout with sidebar', type: 'component', dependencies: [], priority: 1, estimatedComplexity: 'moderate' },
      { id: 'auth', description: 'Set up admin authentication', type: 'integration', dependencies: [], priority: 1, estimatedComplexity: 'complex' },
      { id: 'api-stats', description: 'Create statistics API endpoints', type: 'function', dependencies: [], priority: 2, estimatedComplexity: 'moderate' },
      { id: 'charts', description: 'Create chart components', type: 'component', dependencies: ['api-stats'], priority: 3, estimatedComplexity: 'moderate' },
      { id: 'widgets', description: 'Create dashboard widgets', type: 'component', dependencies: ['api-stats'], priority: 3, estimatedComplexity: 'simple' },
      { id: 'data-table', description: 'Create data table component', type: 'component', dependencies: ['api-stats'], priority: 3, estimatedComplexity: 'complex' },
      { id: 'styles', description: 'Apply dashboard theme', type: 'style', dependencies: [], priority: 4, estimatedComplexity: 'simple' },
    );
  } else if (target.includes('button')) {
    tasks.push(
      { id: 'button-component', description: 'Create button component', type: 'component', dependencies: [], priority: 1, estimatedComplexity: 'trivial' },
      { id: 'button-styles', description: 'Style the button', type: 'style', dependencies: ['button-component'], priority: 2, estimatedComplexity: 'trivial' },
    );
  } else if (target.includes('form')) {
    tasks.push(
      { id: 'form-component', description: 'Create form component with fields', type: 'component', dependencies: [], priority: 1, estimatedComplexity: 'moderate' },
      { id: 'validation', description: 'Add form validation', type: 'function', dependencies: ['form-component'], priority: 2, estimatedComplexity: 'moderate' },
      { id: 'form-styles', description: 'Style the form', type: 'style', dependencies: ['form-component'], priority: 3, estimatedComplexity: 'simple' },
    );
  } else if (target.includes('page') || target.includes('component')) {
    tasks.push(
      { id: 'component', description: `Create ${intent.target} component`, type: 'component', dependencies: [], priority: 1, estimatedComplexity: 'moderate' },
      { id: 'styles', description: 'Add styling', type: 'style', dependencies: ['component'], priority: 2, estimatedComplexity: 'simple' },
    );
  } else {
    tasks.push(
      { id: 'main', description: `Create ${intent.target}`, type: 'component', dependencies: [], priority: 1, estimatedComplexity: 'moderate' },
    );
  }

  return tasks;
}

function generateModificationTasks(intent: SemanticIntent): Task[] {
  const tasks: Task[] = [];

  tasks.push(
    { id: 'analyze', description: `Analyze current ${intent.target} implementation`, type: 'function', dependencies: [], priority: 1, estimatedComplexity: 'simple' },
    { id: 'modify', description: `Apply modifications to ${intent.target}`, type: 'component', dependencies: ['analyze'], priority: 2, estimatedComplexity: 'moderate' },
    { id: 'test', description: 'Verify modifications work correctly', type: 'function', dependencies: ['modify'], priority: 3, estimatedComplexity: 'simple' },
  );

  return tasks;
}

function generateFixTasks(intent: SemanticIntent): Task[] {
  return [
    { id: 'diagnose', description: 'Analyze error and identify root cause', type: 'function', dependencies: [], priority: 1, estimatedComplexity: 'moderate' },
    { id: 'fix', description: 'Apply fix to resolve the issue', type: 'function', dependencies: ['diagnose'], priority: 2, estimatedComplexity: 'moderate' },
    { id: 'verify', description: 'Verify fix resolves the issue', type: 'function', dependencies: ['fix'], priority: 3, estimatedComplexity: 'simple' },
  ];
}

function generateRefactorTasks(intent: SemanticIntent): Task[] {
  return [
    { id: 'analyze-structure', description: 'Analyze current code structure', type: 'function', dependencies: [], priority: 1, estimatedComplexity: 'moderate' },
    { id: 'plan-refactor', description: 'Plan refactoring approach', type: 'function', dependencies: ['analyze-structure'], priority: 2, estimatedComplexity: 'moderate' },
    { id: 'refactor', description: 'Apply refactoring changes', type: 'function', dependencies: ['plan-refactor'], priority: 3, estimatedComplexity: 'complex' },
    { id: 'verify-behavior', description: 'Verify behavior is preserved', type: 'function', dependencies: ['refactor'], priority: 4, estimatedComplexity: 'moderate' },
  ];
}

function resolveDependencies(tasks: Task[]): { tasks: Task[]; order: string[] } {
  const order: string[] = [];
  const resolved = new Set<string>();
  const taskMap = new Map(tasks.map(t => [t.id, t]));

  function resolve(taskId: string) {
    if (resolved.has(taskId)) return;
    const task = taskMap.get(taskId);
    if (!task) return;

    for (const dep of task.dependencies) {
      resolve(dep);
    }

    resolved.add(taskId);
    order.push(taskId);
  }

  const sorted = [...tasks].sort((a, b) => a.priority - b.priority);
  for (const task of sorted) {
    resolve(task.id);
  }

  return { tasks, order };
}

function detectConflicts(tasks: Task[], conflicts: string[], warnings: string[]) {
  const hasAuth = tasks.some(t => t.id.includes('auth'));
  const hasPublicApi = tasks.some(t => t.type === 'function' && !t.dependencies.includes('auth'));

  if (hasAuth && hasPublicApi) {
    warnings.push('Some API endpoints may need authentication protection');
  }

  const complexTasks = tasks.filter(t => t.estimatedComplexity === 'complex' || t.estimatedComplexity === 'very_complex');
  if (complexTasks.length > 3) {
    warnings.push('This request involves multiple complex tasks - consider breaking into phases');
  }

  const styleConflicts = tasks.filter(t => t.type === 'style');
  if (styleConflicts.length > 1) {
    warnings.push('Multiple styling tasks - ensure consistent theme application');
  }
}

// ============================================================================
// 3. CONTEXT MEMORY
// ============================================================================

interface BuiltComponent {
  name: string;
  type: 'component' | 'page' | 'api' | 'style' | 'utility';
  filePath: string;
  code: string;
  timestamp: number;
  dependencies: string[];
}

interface ConversationContext {
  messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }>;
  builtComponents: BuiltComponent[];
  currentProject: {
    name: string;
    type: string;
    files: string[];
    lastModified: string;
  } | null;
  preferences: Record<string, string>;
  referencedElements: Map<string, BuiltComponent>;
}

let context: ConversationContext = {
  messages: [],
  builtComponents: [],
  currentProject: null,
  preferences: {},
  referencedElements: new Map(),
};

export function addToMemory(role: 'user' | 'assistant', content: string) {
  context.messages.push({ role, content, timestamp: Date.now() });

  if (context.messages.length > 100) {
    context.messages = context.messages.slice(-100);
  }

  if (role === 'user') {
    extractPreferences(content);
  }
}

export function rememberComponent(component: BuiltComponent) {
  context.builtComponents.push(component);
  context.referencedElements.set(component.name.toLowerCase(), component);

  const aliases = generateAliases(component.name);
  for (const alias of aliases) {
    context.referencedElements.set(alias, component);
  }
}

function generateAliases(name: string): string[] {
  const aliases: string[] = [];
  const lower = name.toLowerCase();

  aliases.push(lower);
  aliases.push(lower.replace(/component$/i, ''));
  aliases.push(lower.replace(/page$/i, ''));

  if (lower.includes('button')) aliases.push('the button', 'that button', 'btn');
  if (lower.includes('form')) aliases.push('the form', 'that form');
  if (lower.includes('header')) aliases.push('the header', 'navbar', 'nav');
  if (lower.includes('modal')) aliases.push('the modal', 'popup', 'dialog');
  if (lower.includes('sidebar')) aliases.push('the sidebar', 'side menu', 'sidenav');

  return aliases;
}

export function resolveReference(input: string): BuiltComponent | null {
  const lower = input.toLowerCase();

  const patterns = [
    /(?:the|that|this|my)\s+(\w+)/gi,
    /change\s+(?:the\s+)?(\w+)/gi,
    /modify\s+(?:the\s+)?(\w+)/gi,
    /update\s+(?:the\s+)?(\w+)/gi,
    /fix\s+(?:the\s+)?(\w+)/gi,
  ];

  for (const pattern of patterns) {
    const matches = Array.from(lower.matchAll(pattern));
    for (const match of matches) {
      const ref = match[1];
      if (context.referencedElements.has(ref)) {
        return context.referencedElements.get(ref)!;
      }

      const entries = Array.from(context.referencedElements.entries());
      for (const [key, component] of entries) {
        if (key.includes(ref) || ref.includes(key)) {
          return component;
        }
      }
    }
  }

  if (context.builtComponents.length > 0) {
    const sorted = [...context.builtComponents].sort((a, b) => b.timestamp - a.timestamp);

    for (const comp of sorted.slice(0, 5)) {
      if (lower.includes(comp.type) || lower.includes(comp.name.toLowerCase())) {
        return comp;
      }
    }
  }

  return null;
}

function extractPreferences(content: string) {
  const lower = content.toLowerCase();

  if (lower.includes('dark mode') || lower.includes('dark theme')) {
    context.preferences.theme = 'dark';
  } else if (lower.includes('light mode') || lower.includes('light theme')) {
    context.preferences.theme = 'light';
  }

  if (lower.includes('tailwind')) context.preferences.styling = 'tailwind';
  if (lower.includes('styled-components')) context.preferences.styling = 'styled-components';
  if (lower.includes('css modules')) context.preferences.styling = 'css-modules';

  if (lower.includes('typescript') || lower.includes('ts')) context.preferences.language = 'typescript';
  if (lower.includes('javascript') || lower.includes('js')) context.preferences.language = 'javascript';

  const colorMatch = lower.match(/(?:use|prefer|like)\s+(?:the\s+)?(?:color\s+)?(blue|green|red|purple|orange|teal)/);
  if (colorMatch) context.preferences.primaryColor = colorMatch[1];
}

export function getRecentContext(limit: number = 5): string {
  const recent = context.messages.slice(-limit);
  return recent.map(m => `${m.role}: ${m.content}`).join('\n');
}

export function getBuiltComponents(): BuiltComponent[] {
  return context.builtComponents;
}

export function getCurrentProject() {
  return context.currentProject;
}

export function setCurrentProject(project: ConversationContext['currentProject']) {
  context.currentProject = project;
}

export function getPreferences(): Record<string, string> {
  return context.preferences;
}

export function clearMemory() {
  context = {
    messages: [],
    builtComponents: [],
    currentProject: null,
    preferences: {},
    referencedElements: new Map(),
  };
}

// ============================================================================
// 4. ERROR ANALYSIS & SELF-CORRECTION
// ============================================================================

interface ErrorAnalysis {
  errorType: string;
  errorMessage: string;
  filePath: string | null;
  lineNumber: number | null;
  rootCause: string;
  relatedFiles: string[];
  suggestedFixes: Array<{
    description: string;
    code: string;
    confidence: number;
  }>;
}

const errorPatterns: Array<{
  pattern: RegExp;
  type: string;
  extractor: (match: RegExpMatchArray) => Partial<ErrorAnalysis>;
}> = [
  {
    pattern: /Cannot find module ['"](.+?)['"]/,
    type: 'MODULE_NOT_FOUND',
    extractor: (match) => ({
      rootCause: `Module "${match[1]}" is not installed or path is incorrect`,
      suggestedFixes: [
        { description: `Install the missing module`, code: `npm install ${match[1]}`, confidence: 0.9 },
        { description: `Check import path`, code: `// Verify the import path is correct`, confidence: 0.7 },
      ],
    }),
  },
  {
    pattern: /(\w+) is not defined/,
    type: 'REFERENCE_ERROR',
    extractor: (match) => ({
      rootCause: `Variable or function "${match[1]}" is used before being declared`,
      suggestedFixes: [
        { description: `Import or define ${match[1]}`, code: `import { ${match[1]} } from './module';`, confidence: 0.8 },
        { description: `Declare the variable`, code: `const ${match[1]} = /* value */;`, confidence: 0.7 },
      ],
    }),
  },
  {
    pattern: /Cannot read propert(?:y|ies) (?:of|'(\w+)' of) (undefined|null)/,
    type: 'NULL_REFERENCE',
    extractor: (match) => ({
      rootCause: `Attempting to access property on ${match[2] || 'undefined'} value`,
      suggestedFixes: [
        { description: `Add optional chaining`, code: `object?.property`, confidence: 0.9 },
        { description: `Add null check`, code: `if (object) { object.property }`, confidence: 0.85 },
        { description: `Provide default value`, code: `const value = object?.property ?? defaultValue;`, confidence: 0.8 },
      ],
    }),
  },
  {
    pattern: /TypeError: (.+) is not a function/,
    type: 'TYPE_ERROR',
    extractor: (match) => ({
      rootCause: `"${match[1]}" is not callable - it may be undefined or wrong type`,
      suggestedFixes: [
        { description: `Check if function exists before calling`, code: `if (typeof fn === 'function') fn();`, confidence: 0.85 },
        { description: `Verify import is correct`, code: `// Check named vs default export`, confidence: 0.8 },
      ],
    }),
  },
  {
    pattern: /SyntaxError: Unexpected token ['"]?(\S+)['"]?/,
    type: 'SYNTAX_ERROR',
    extractor: (match) => ({
      rootCause: `Syntax error near "${match[1]}" - likely missing bracket, comma, or incorrect syntax`,
      suggestedFixes: [
        { description: `Check for missing brackets or commas`, code: `// Review the syntax near the error`, confidence: 0.7 },
        { description: `Validate JSON if applicable`, code: `JSON.parse(str)`, confidence: 0.6 },
      ],
    }),
  },
  {
    pattern: /ENOENT: no such file or directory.*['"](.+?)['"]/,
    type: 'FILE_NOT_FOUND',
    extractor: (match) => ({
      rootCause: `File "${match[1]}" does not exist`,
      suggestedFixes: [
        { description: `Create the missing file`, code: `touch ${match[1]}`, confidence: 0.9 },
        { description: `Check the file path`, code: `// Verify path is correct`, confidence: 0.8 },
      ],
    }),
  },
  {
    pattern: /Failed to fetch|NetworkError|CORS/i,
    type: 'NETWORK_ERROR',
    extractor: () => ({
      rootCause: `Network request failed - could be CORS, server down, or incorrect URL`,
      suggestedFixes: [
        { description: `Check API URL is correct`, code: `// Verify the endpoint URL`, confidence: 0.8 },
        { description: `Add CORS headers on server`, code: `res.setHeader('Access-Control-Allow-Origin', '*');`, confidence: 0.85 },
        { description: `Use a proxy for development`, code: `// Configure Vite proxy in vite.config.ts`, confidence: 0.7 },
      ],
    }),
  },
  {
    pattern: /Invalid hook call/i,
    type: 'REACT_HOOK_ERROR',
    extractor: () => ({
      rootCause: `React hooks must be called inside function components at the top level`,
      suggestedFixes: [
        { description: `Move hook to top of component`, code: `// Hooks cannot be in conditions or loops`, confidence: 0.9 },
        { description: `Ensure component is a function`, code: `function Component() { const [state] = useState(); }`, confidence: 0.85 },
      ],
    }),
  },
  {
    pattern: /Objects are not valid as a React child/i,
    type: 'REACT_RENDER_ERROR',
    extractor: () => ({
      rootCause: `Trying to render an object directly in JSX`,
      suggestedFixes: [
        { description: `Convert to string`, code: `{JSON.stringify(object)}`, confidence: 0.9 },
        { description: `Access specific property`, code: `{object.propertyName}`, confidence: 0.85 },
        { description: `Map array to elements`, code: `{array.map(item => <div key={item.id}>{item.name}</div>)}`, confidence: 0.8 },
      ],
    }),
  },
  {
    pattern: /unique "key" prop/i,
    type: 'REACT_KEY_ERROR',
    extractor: () => ({
      rootCause: `List items need unique key props for React reconciliation`,
      suggestedFixes: [
        { description: `Add unique key`, code: `{items.map(item => <div key={item.id}>{item.name}</div>)}`, confidence: 0.95 },
        { description: `Use index as fallback`, code: `{items.map((item, index) => <div key={index}>{item}</div>)}`, confidence: 0.7 },
      ],
    }),
  },
];

export function analyzeError(errorMessage: string, codeContext?: string): ErrorAnalysis {
  const analysis: ErrorAnalysis = {
    errorType: 'UNKNOWN',
    errorMessage,
    filePath: null,
    lineNumber: null,
    rootCause: 'Unable to determine root cause',
    relatedFiles: [],
    suggestedFixes: [],
  };

  const fileMatch = errorMessage.match(/(?:at\s+)?(?:\S+\s+\()?(\S+\.[tj]sx?):(\d+)/);
  if (fileMatch) {
    analysis.filePath = fileMatch[1];
    analysis.lineNumber = parseInt(fileMatch[2], 10);
    analysis.relatedFiles.push(fileMatch[1]);
  }

  for (const { pattern, type, extractor } of errorPatterns) {
    const match = errorMessage.match(pattern);
    if (match) {
      analysis.errorType = type;
      const extracted = extractor(match);
      Object.assign(analysis, extracted);
      break;
    }
  }

  if (codeContext) {
    const additionalFixes = analyzeCodeContext(codeContext, analysis.errorType);
    analysis.suggestedFixes.push(...additionalFixes);
  }

  analysis.suggestedFixes.sort((a, b) => b.confidence - a.confidence);

  return analysis;
}

function analyzeCodeContext(code: string, errorType: string): ErrorAnalysis['suggestedFixes'] {
  const fixes: ErrorAnalysis['suggestedFixes'] = [];

  if (errorType === 'REACT_HOOK_ERROR') {
    if (code.includes('if (') && code.includes('useState')) {
      fixes.push({
        description: 'Move useState outside of conditional',
        code: 'const [state, setState] = useState(initialValue);\nif (condition) { /* use state here */ }',
        confidence: 0.95,
      });
    }
  }

  if (code.includes('async') && !code.includes('await') && !code.includes('.then')) {
    fixes.push({
      description: 'Async function may need await',
      code: 'const result = await asyncFunction();',
      confidence: 0.7,
    });
  }

  if (code.includes('fetch(') && !code.includes('try') && !code.includes('catch')) {
    fixes.push({
      description: 'Add error handling for fetch',
      code: 'try { const res = await fetch(url); } catch (err) { console.error(err); }',
      confidence: 0.8,
    });
  }

  return fixes;
}

export function generateFix(analysis: ErrorAnalysis): string {
  if (analysis.suggestedFixes.length === 0) {
    return `// Unable to auto-generate fix for: ${analysis.errorType}\n// ${analysis.rootCause}`;
  }

  const bestFix = analysis.suggestedFixes[0];
  return `// Fix: ${bestFix.description}\n${bestFix.code}`;
}

export function traceRootCause(error: string, files: Record<string, string>): string[] {
  const trace: string[] = [];
  const analysis = analyzeError(error);

  trace.push(`Error Type: ${analysis.errorType}`);
  trace.push(`Root Cause: ${analysis.rootCause}`);

  if (analysis.filePath && files[analysis.filePath]) {
    trace.push(`Location: ${analysis.filePath}:${analysis.lineNumber}`);

    const fileContent = files[analysis.filePath];
    const lines = fileContent.split('\n');

    if (analysis.lineNumber && analysis.lineNumber > 0) {
      const start = Math.max(0, analysis.lineNumber - 3);
      const end = Math.min(lines.length, analysis.lineNumber + 2);
      trace.push('Context:');
      for (let i = start; i < end; i++) {
        const marker = i + 1 === analysis.lineNumber ? '>>> ' : '    ';
        trace.push(`${marker}${i + 1}: ${lines[i]}`);
      }
    }
  }

  for (const [filePath, content] of Object.entries(files)) {
    if (filePath !== analysis.filePath) {
      const imports = content.match(/import .+ from ['"](.+)['"]/g) || [];
      for (const imp of imports) {
        if (analysis.filePath && imp.includes(analysis.filePath.replace(/\.[tj]sx?$/, ''))) {
          trace.push(`Related: ${filePath} imports from error location`);
          analysis.relatedFiles.push(filePath);
        }
      }
    }
  }

  return trace;
}

// ============================================================================
// 5. CODE UNDERSTANDING
// ============================================================================

interface CodeStructure {
  type: 'component' | 'function' | 'class' | 'module' | 'hook' | 'utility';
  name: string;
  exports: string[];
  imports: Array<{ name: string; from: string }>;
  dependencies: string[];
  props?: Array<{ name: string; type: string; required: boolean }>;
  state?: Array<{ name: string; type: string }>;
  methods?: Array<{ name: string; params: string[]; returns: string }>;
  hooks?: string[];
  complexity: number;
}

export function parseCode(code: string): CodeStructure {
  const structure: CodeStructure = {
    type: 'module',
    name: 'Unknown',
    exports: [],
    imports: [],
    dependencies: [],
    complexity: 0,
  };

  const importMatches = Array.from(code.matchAll(/import\s+(?:(\w+)(?:\s*,\s*)?)?(?:\{([^}]+)\})?\s+from\s+['"]([^'"]+)['"]/g));
  for (const match of importMatches) {
    const defaultImport = match[1];
    const namedImports = match[2]?.split(',').map((s: string) => s.trim()) || [];
    const from = match[3];

    if (defaultImport) {
      structure.imports.push({ name: defaultImport, from });
    }
    for (const named of namedImports) {
      structure.imports.push({ name: named.split(' as ')[0].trim(), from });
    }

    if (!from.startsWith('.') && !from.startsWith('/')) {
      structure.dependencies.push(from);
    }
  }

  const exportMatches = Array.from(code.matchAll(/export\s+(?:default\s+)?(?:const|function|class|let|var)?\s*(\w+)/g));
  for (const match of exportMatches) {
    structure.exports.push(match[1]);
  }

  const componentMatch = code.match(/(?:export\s+(?:default\s+)?)?(?:const|function)\s+(\w+)\s*(?::\s*React\.FC)?[^{]*\{[\s\S]*?return\s*\(/);
  if (componentMatch) {
    structure.type = 'component';
    structure.name = componentMatch[1];

    const propsMatch = code.match(/(?:props|{[^}]+})\s*:\s*(\w+Props|\{[^}]+\})/);
    if (propsMatch) {
      structure.props = parseProps(propsMatch[1], code);
    }

    structure.hooks = [];
    const hookMatches = Array.from(code.matchAll(/use(\w+)\(/g));
    for (const match of hookMatches) {
      structure.hooks.push(`use${match[1]}`);
    }

    structure.state = [];
    const stateMatches = Array.from(code.matchAll(/const\s+\[(\w+),\s*set\w+\]\s*=\s*useState(?:<([^>]+)>)?\(([^)]*)\)/g));
    for (const match of stateMatches) {
      structure.state.push({ name: match[1], type: match[2] || 'unknown' });
    }
  }

  const hookMatch = code.match(/(?:export\s+(?:default\s+)?)?(?:const|function)\s+(use\w+)/);
  if (hookMatch && !componentMatch) {
    structure.type = 'hook';
    structure.name = hookMatch[1];
  }

  const classMatch = code.match(/class\s+(\w+)/);
  if (classMatch) {
    structure.type = 'class';
    structure.name = classMatch[1];

    structure.methods = [];
    const methodMatches = Array.from(code.matchAll(/(?:async\s+)?(\w+)\s*\(([^)]*)\)(?:\s*:\s*(\w+))?\s*\{/g));
    for (const match of methodMatches) {
      if (match[1] !== 'constructor') {
        structure.methods.push({
          name: match[1],
          params: match[2].split(',').map((p: string) => p.trim()).filter(Boolean),
          returns: match[3] || 'void',
        });
      }
    }
  }

  structure.complexity = calculateComplexity(code);

  return structure;
}

function parseProps(propsType: string, fullCode: string): CodeStructure['props'] {
  const props: NonNullable<CodeStructure['props']> = [];

  if (propsType.startsWith('{')) {
    const propsContent = propsType.slice(1, -1);
    const propMatches = Array.from(propsContent.matchAll(/(\w+)(\?)?:\s*([^;,]+)/g));
    for (const match of propMatches) {
      props.push({ name: match[1], type: match[3].trim(), required: !match[2] });
    }
  } else {
    const interfaceMatch = fullCode.match(new RegExp(`interface\\s+${propsType}\\s*\\{([^}]+)\\}`));
    if (interfaceMatch) {
      const propsContent = interfaceMatch[1];
      const propMatches = Array.from(propsContent.matchAll(/(\w+)(\?)?:\s*([^;]+)/g));
      for (const match of propMatches) {
        props.push({ name: match[1], type: match[3].trim(), required: !match[2] });
      }
    }
  }

  return props;
}

function calculateComplexity(code: string): number {
  let complexity = 1;

  const branches = (code.match(/\b(if|else|switch|case|\?|&&|\|\|)\b/g) || []).length;
  complexity += branches;

  const loops = (code.match(/\b(for|while|do|\.map|\.forEach|\.filter|\.reduce)\b/g) || []).length;
  complexity += loops;

  const functions = (code.match(/\b(function|=>)\b/g) || []).length;
  complexity += Math.floor(functions / 2);

  return complexity;
}

export function modifyCode(code: string, modification: {
  type: 'add' | 'remove' | 'replace' | 'wrap';
  target: string;
  content?: string;
  wrapper?: { before: string; after: string };
}): string {
  let result = code;

  switch (modification.type) {
    case 'add':
      if (modification.target === 'import') {
        const lastImport = code.lastIndexOf('import');
        const endOfImport = code.indexOf('\n', lastImport);
        result = code.slice(0, endOfImport + 1) + modification.content + '\n' + code.slice(endOfImport + 1);
      } else if (modification.target === 'component-body') {
        const returnIndex = code.lastIndexOf('return (');
        result = code.slice(0, returnIndex) + modification.content + '\n  ' + code.slice(returnIndex);
      } else if (modification.target === 'jsx') {
        const closingTag = code.lastIndexOf('</');
        result = code.slice(0, closingTag) + '  ' + modification.content + '\n    ' + code.slice(closingTag);
      }
      break;

    case 'remove':
      const removePattern = new RegExp(modification.target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      result = code.replace(removePattern, '');
      break;

    case 'replace':
      const replacePattern = new RegExp(modification.target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      result = code.replace(replacePattern, modification.content || '');
      break;

    case 'wrap':
      if (modification.wrapper) {
        const targetPattern = new RegExp(`(${modification.target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g');
        result = code.replace(targetPattern, `${modification.wrapper.before}$1${modification.wrapper.after}`);
      }
      break;
  }

  return result;
}

export function refactorCode(code: string, refactorType: 'extract-component' | 'extract-hook' | 'simplify' | 'add-types'): {
  refactored: string;
  extracted?: string;
  changes: string[];
} {
  const changes: string[] = [];
  let refactored = code;
  let extracted: string | undefined;

  switch (refactorType) {
    case 'extract-component':
      const jsxMatch = code.match(/<div[^>]*className="([^"]+)"[^>]*>([\s\S]*?)<\/div>/);
      if (jsxMatch) {
        const componentName = jsxMatch[1].split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
        extracted = `function ${componentName}() {\n  return (\n    ${jsxMatch[0]}\n  );\n}`;
        refactored = code.replace(jsxMatch[0], `<${componentName} />`);
        changes.push(`Extracted ${componentName} component`);
      }
      break;

    case 'extract-hook':
      const statePattern = /const\s+\[(\w+),\s*(set\w+)\]\s*=\s*useState\(([^)]+)\);?\s*(?:const\s+\w+\s*=\s*[^;]+;)*/g;
      const stateMatch = code.match(statePattern);
      if (stateMatch && stateMatch.length > 1) {
        const hookName = 'useCustomState';
        extracted = `function ${hookName}() {\n  ${stateMatch.join('\n  ')}\n  return { /* state values */ };\n}`;
        changes.push(`Extracted ${hookName} custom hook`);
      }
      break;

    case 'simplify':
      refactored = code.replace(/\n\s*\n\s*\n/g, '\n\n');

      refactored = refactored.replace(/if\s*\((\w+)\)\s*\{\s*return\s+true;\s*\}\s*(?:else\s*)?\{\s*return\s+false;\s*\}/g, 'return $1;');

      refactored = refactored.replace(/(\w+)\s*\?\s*\1\s*:\s*(\w+)/g, '$1 || $2');

      changes.push('Simplified code structure');
      break;

    case 'add-types':
      refactored = code.replace(/const\s+(\w+)\s*=\s*\[\]/g, 'const $1: unknown[] = []');
      refactored = refactored.replace(/const\s+(\w+)\s*=\s*\{\}/g, 'const $1: Record<string, unknown> = {}');
      refactored = refactored.replace(/function\s+(\w+)\s*\(([^)]*)\)\s*\{/g, (match, name, params) => {
        const typedParams = params.split(',').map((p: string) => {
          const trimmed = p.trim();
          if (trimmed && !trimmed.includes(':')) {
            return `${trimmed}: unknown`;
          }
          return trimmed;
        }).join(', ');
        return `function ${name}(${typedParams}): unknown {`;
      });
      changes.push('Added TypeScript types');
      break;
  }

  return { refactored, extracted, changes };
}

// ============================================================================
// 6. CREATIVE PROBLEM SOLVING
// ============================================================================

interface CreativeSolution {
  approach: string;
  implementation: string;
  pros: string[];
  cons: string[];
  complexity: 'low' | 'medium' | 'high';
  novelty: number;
}

export function solveCreatively(problem: string, constraints: string[] = []): CreativeSolution[] {
  const solutions: CreativeSolution[] = [];
  const intent = parseSemanticIntent(problem);

  if (intent.target.includes('infinite') || intent.target.includes('scroll')) {
    solutions.push({
      approach: 'Intersection Observer Pattern',
      implementation: `
const useInfiniteScroll = (loadMore: () => void) => {
  const observerRef = useRef<IntersectionObserver>();
  const lastElementRef = useCallback((node: HTMLElement | null) => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadMore();
    });
    if (node) observerRef.current.observe(node);
  }, [loadMore]);
  return lastElementRef;
};`,
      pros: ['Native browser API', 'Performant', 'No dependencies'],
      cons: ['Requires understanding of refs'],
      complexity: 'medium',
      novelty: 0.7,
    });

    solutions.push({
      approach: 'Virtual Scrolling',
      implementation: `
const VirtualList = ({ items, itemHeight, windowHeight }) => {
  const [scrollTop, setScrollTop] = useState(0);
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(startIndex + Math.ceil(windowHeight / itemHeight) + 1, items.length);
  const visibleItems = items.slice(startIndex, endIndex);

  return (
    <div style={{ height: items.length * itemHeight, position: 'relative' }}>
      {visibleItems.map((item, i) => (
        <div key={startIndex + i} style={{ position: 'absolute', top: (startIndex + i) * itemHeight }}>
          {item}
        </div>
      ))}
    </div>
  );
};`,
      pros: ['Handles 100k+ items', 'Constant memory usage'],
      cons: ['Fixed item heights', 'More complex'],
      complexity: 'high',
      novelty: 0.9,
    });
  }

  if (intent.target.includes('dark') || intent.target.includes('theme')) {
    solutions.push({
      approach: 'CSS Custom Properties with Context',
      implementation: `
const ThemeContext = createContext({ theme: 'light', toggle: () => {} });

const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() =>
    localStorage.getItem('theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggle: () => setTheme(t => t === 'light' ? 'dark' : 'light') }}>
      {children}
    </ThemeContext.Provider>
  );
};`,
      pros: ['System preference detection', 'Persists choice', 'Zero flash'],
      cons: ['Requires CSS variable setup'],
      complexity: 'medium',
      novelty: 0.8,
    });
  }

  if (intent.target.includes('drag') || intent.target.includes('sort') || intent.target.includes('reorder')) {
    solutions.push({
      approach: 'Native Drag and Drop API',
      implementation: `
const DraggableList = ({ items, onReorder }) => {
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const handleDragStart = (e: DragEvent, idx: number) => {
    setDraggedIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === idx) return;
    const newItems = [...items];
    const [dragged] = newItems.splice(draggedIdx, 1);
    newItems.splice(idx, 0, dragged);
    onReorder(newItems);
    setDraggedIdx(idx);
  };

  return items.map((item, idx) => (
    <div
      key={item.id}
      draggable
      onDragStart={(e) => handleDragStart(e, idx)}
      onDragOver={(e) => handleDragOver(e, idx)}
      onDragEnd={() => setDraggedIdx(null)}
    >
      {item.content}
    </div>
  ));
};`,
      pros: ['No dependencies', 'Accessible', 'Touch support with polyfill'],
      cons: ['Styling drag preview is tricky'],
      complexity: 'medium',
      novelty: 0.75,
    });
  }

  if (intent.target.includes('undo') || intent.target.includes('history')) {
    solutions.push({
      approach: 'Command Pattern with History Stack',
      implementation: `
const useUndoRedo = <T>(initialState: T) => {
  const [history, setHistory] = useState<T[]>([initialState]);
  const [index, setIndex] = useState(0);

  const state = history[index];

  const setState = (newState: T | ((prev: T) => T)) => {
    const resolved = typeof newState === 'function' ? (newState as Function)(state) : newState;
    const newHistory = history.slice(0, index + 1);
    newHistory.push(resolved);
    setHistory(newHistory);
    setIndex(newHistory.length - 1);
  };

  const undo = () => setIndex(Math.max(0, index - 1));
  const redo = () => setIndex(Math.min(history.length - 1, index + 1));
  const canUndo = index > 0;
  const canRedo = index < history.length - 1;

  return { state, setState, undo, redo, canUndo, canRedo };
};`,
      pros: ['Full history', 'Memory efficient with limit', 'Generic'],
      cons: ['Memory grows with actions'],
      complexity: 'medium',
      novelty: 0.85,
    });
  }

  if (solutions.length === 0) {
    solutions.push(generateGenericSolution(problem, constraints));
  }

  return solutions.sort((a, b) => b.novelty - a.novelty);
}

function generateGenericSolution(problem: string, constraints: string[]): CreativeSolution {
  return {
    approach: 'Modular Component Architecture',
    implementation: `
// Generic solution structure
const Solution = () => {
  // State management
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Side effects
  useEffect(() => {
    // Initialize or fetch data
  }, []);

  // Event handlers
  const handleAction = async () => {
    setLoading(true);
    try {
      // Perform action
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  // Render
  if (loading) return <Loading />;
  if (error) return <Error message={error.message} />;
  return <MainContent data={data} onAction={handleAction} />;
};`,
    pros: ['Follows React best practices', 'Handles loading/error states', 'Easy to extend'],
    cons: ['May need customization for specific use case'],
    complexity: 'low',
    novelty: 0.5,
  };
}

export function combinePatterns(patterns: string[]): string {
  const combinedImports = new Set<string>();
  const combinedHooks: string[] = [];
  const combinedJsx: string[] = [];

  for (const pattern of patterns) {
    const importMatches = Array.from(pattern.matchAll(/import .+ from ['"][^'"]+['"]/g));
    for (const match of importMatches) {
      combinedImports.add(match[0]);
    }

    const hookMatch = pattern.match(/const \[.+\] = use\w+\(.+\)/g);
    if (hookMatch) combinedHooks.push(...hookMatch);

    const jsxMatch = pattern.match(/<[A-Z]\w+[^]*?\/>/g);
    if (jsxMatch) combinedJsx.push(...jsxMatch);
  }

  return `
${Array.from(combinedImports).join('\n')}

function CombinedComponent() {
  ${combinedHooks.join('\n  ')}

  return (
    <div>
      ${combinedJsx.join('\n      ')}
    </div>
  );
}

export default CombinedComponent;
`;
}

// ============================================================================
// 7. EXPLANATION GENERATION
// ============================================================================

interface CodeExplanation {
  summary: string;
  lineByLine: Array<{ lines: string; explanation: string }>;
  concepts: Array<{ name: string; description: string; learnMore: string }>;
  alternatives: Array<{ approach: string; code: string; tradeoff: string }>;
}

export function explainCode(code: string): CodeExplanation {
  const structure = parseCode(code);
  const explanation: CodeExplanation = {
    summary: '',
    lineByLine: [],
    concepts: [],
    alternatives: [],
  };

  explanation.summary = generateSummary(structure, code);
  explanation.lineByLine = generateLineByLine(code);
  explanation.concepts = extractConcepts(code);
  explanation.alternatives = suggestAlternatives(code, structure);

  return explanation;
}

function generateSummary(structure: CodeStructure, code: string): string {
  let summary = '';

  switch (structure.type) {
    case 'component':
      summary = `This is a React ${structure.name} component`;
      if (structure.props && structure.props.length > 0) {
        summary += ` that accepts ${structure.props.length} prop(s): ${structure.props.map(p => p.name).join(', ')}`;
      }
      if (structure.state && structure.state.length > 0) {
        summary += `. It manages ${structure.state.length} piece(s) of state: ${structure.state.map(s => s.name).join(', ')}`;
      }
      if (structure.hooks && structure.hooks.length > 0) {
        summary += `. Uses hooks: ${structure.hooks.join(', ')}`;
      }
      break;

    case 'hook':
      summary = `This is a custom React hook called ${structure.name}. Custom hooks let you extract and reuse stateful logic across components.`;
      break;

    case 'class':
      summary = `This is a ${structure.name} class`;
      if (structure.methods && structure.methods.length > 0) {
        summary += ` with ${structure.methods.length} method(s): ${structure.methods.map(m => m.name).join(', ')}`;
      }
      break;

    default:
      summary = `This is a ${structure.type} that exports: ${structure.exports.join(', ')}`;
  }

  summary += `. Complexity score: ${structure.complexity} (${structure.complexity < 5 ? 'simple' : structure.complexity < 10 ? 'moderate' : 'complex'}).`;

  return summary;
}

function generateLineByLine(code: string): CodeExplanation['lineByLine'] {
  const explanations: CodeExplanation['lineByLine'] = [];
  const lines = code.split('\n');

  const patterns: Array<{ pattern: RegExp; explain: (match: RegExpMatchArray) => string }> = [
    {
      pattern: /import\s+(?:\{([^}]+)\}|(\w+))\s+from\s+['"]([^'"]+)['"]/,
      explain: (m) => `Imports ${m[1] || m[2]} from the "${m[3]}" package/file`,
    },
    {
      pattern: /const\s+\[(\w+),\s*set(\w+)\]\s*=\s*useState\(([^)]*)\)/,
      explain: (m) => `Creates state variable "${m[1]}" with initial value ${m[3] || 'undefined'}. set${m[2]} updates it.`,
    },
    {
      pattern: /useEffect\(\s*\(\)\s*=>\s*\{/,
      explain: () => `Side effect hook - runs code after render. The dependency array controls when it re-runs.`,
    },
    {
      pattern: /const\s+(\w+)\s*=\s*useRef\(([^)]*)\)/,
      explain: (m) => `Creates a ref "${m[1]}" - a mutable value that persists across renders without causing re-renders.`,
    },
    {
      pattern: /const\s+(\w+)\s*=\s*useMemo\(\s*\(\)\s*=>/,
      explain: (m) => `Memoizes the value of "${m[1]}" - only recalculates when dependencies change, for performance.`,
    },
    {
      pattern: /const\s+(\w+)\s*=\s*useCallback\(/,
      explain: (m) => `Memoizes the function "${m[1]}" - prevents recreation on every render, useful for child components.`,
    },
    {
      pattern: /async\s+function\s+(\w+)/,
      explain: (m) => `Declares an async function "${m[1]}" - can use await inside for handling promises.`,
    },
    {
      pattern: /\.map\(\s*\(?(\w+)/,
      explain: (m) => `Transforms each item (called "${m[1]}") in an array into something new.`,
    },
    {
      pattern: /\.filter\(\s*\(?(\w+)/,
      explain: (m) => `Keeps only items where the condition is true.`,
    },
    {
      pattern: /try\s*\{/,
      explain: () => `Error handling block - if any error occurs inside, execution jumps to the catch block.`,
    },
    {
      pattern: /\?\./,
      explain: () => `Optional chaining - safely accesses nested properties, returns undefined if path doesn't exist.`,
    },
    {
      pattern: /\?\?\s/,
      explain: () => `Nullish coalescing - uses the right side value only if left side is null or undefined.`,
    },
  ];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) {
      i++;
      continue;
    }

    let matched = false;
    for (const { pattern, explain } of patterns) {
      const match = line.match(pattern);
      if (match) {
        explanations.push({ lines: line.trim(), explanation: explain(match) });
        matched = true;
        break;
      }
    }

    if (!matched && trimmed.startsWith('<') && !trimmed.startsWith('</')) {
      const tagMatch = trimmed.match(/<(\w+)/);
      if (tagMatch) {
        const isComponent = tagMatch[1][0] === tagMatch[1][0].toUpperCase();
        explanations.push({
          lines: trimmed.slice(0, 50) + (trimmed.length > 50 ? '...' : ''),
          explanation: isComponent ? `Renders the ${tagMatch[1]} component` : `Creates a ${tagMatch[1]} HTML element`,
        });
      }
    }

    i++;
  }

  return explanations;
}

function extractConcepts(code: string): CodeExplanation['concepts'] {
  const concepts: CodeExplanation['concepts'] = [];

  if (code.includes('useState')) {
    concepts.push({
      name: 'useState Hook',
      description: 'Lets you add state to functional components. Returns current value and a setter function.',
      learnMore: 'https://react.dev/reference/react/useState',
    });
  }

  if (code.includes('useEffect')) {
    concepts.push({
      name: 'useEffect Hook',
      description: 'Runs side effects after render. Use for data fetching, subscriptions, or DOM updates.',
      learnMore: 'https://react.dev/reference/react/useEffect',
    });
  }

  if (code.includes('useContext')) {
    concepts.push({
      name: 'React Context',
      description: 'Passes data through the component tree without prop drilling.',
      learnMore: 'https://react.dev/reference/react/useContext',
    });
  }

  if (code.includes('async') || code.includes('await') || code.includes('Promise')) {
    concepts.push({
      name: 'Async/Await',
      description: 'Modern way to handle asynchronous operations. Makes async code look synchronous.',
      learnMore: 'https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous/Promises',
    });
  }

  if (code.includes('.map(') || code.includes('.filter(') || code.includes('.reduce(')) {
    concepts.push({
      name: 'Array Methods',
      description: 'Functional programming methods for transforming arrays without mutation.',
      learnMore: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array',
    });
  }

  if (code.includes('...')) {
    concepts.push({
      name: 'Spread Operator',
      description: 'Expands arrays/objects. Used for copying, merging, or passing multiple arguments.',
      learnMore: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax',
    });
  }

  return concepts;
}

function suggestAlternatives(code: string, structure: CodeStructure): CodeExplanation['alternatives'] {
  const alternatives: CodeExplanation['alternatives'] = [];

  if (code.includes('useState') && code.includes('useEffect') && (code.match(/useState/g) || []).length > 3) {
    alternatives.push({
      approach: 'useReducer for Complex State',
      code: `const [state, dispatch] = useReducer(reducer, initialState);`,
      tradeoff: 'More boilerplate but better for complex state logic with multiple sub-values',
    });
  }

  if (code.includes('fetch(') && !code.includes('useQuery')) {
    alternatives.push({
      approach: 'React Query for Data Fetching',
      code: `const { data, isLoading, error } = useQuery({ queryKey: ['key'], queryFn: fetchData });`,
      tradeoff: 'Adds dependency but handles caching, refetching, and loading states automatically',
    });
  }

  if (code.includes('createContext')) {
    alternatives.push({
      approach: 'Zustand for Global State',
      code: `const useStore = create((set) => ({ count: 0, inc: () => set(s => ({ count: s.count + 1 })) }));`,
      tradeoff: 'Simpler API than Context, no provider needed, better performance',
    });
  }

  if (code.includes('.map(') && code.includes('key=')) {
    alternatives.push({
      approach: 'Virtualized List for Large Data',
      code: `import { FixedSizeList } from 'react-window';`,
      tradeoff: 'More complex but essential for 1000+ items to maintain performance',
    });
  }

  return alternatives;
}

export function teachConcept(concept: string): string {
  const teachings: Record<string, string> = {
    'react': `
**React** is a JavaScript library for building user interfaces.

**Key Concepts:**
1. **Components** - Reusable building blocks that return JSX
2. **Props** - Data passed from parent to child components
3. **State** - Data that changes over time, managed with useState
4. **Hooks** - Functions that let you use React features in functional components

**Example:**
\`\`\`jsx
function Greeting({ name }) {
  const [count, setCount] = useState(0);
  return (
    <div>
      <h1>Hello, {name}!</h1>
      <button onClick={() => setCount(c => c + 1)}>
        Clicked {count} times
      </button>
    </div>
  );
}
\`\`\`
`,
    'hooks': `
**React Hooks** let you use state and other React features in functional components.

**Essential Hooks:**
- \`useState\` - Add state to your component
- \`useEffect\` - Run side effects (fetch data, subscriptions)
- \`useContext\` - Access context values
- \`useRef\` - Persist values without re-renders
- \`useMemo\` - Memoize expensive calculations
- \`useCallback\` - Memoize functions

**Rules of Hooks:**
1. Only call hooks at the top level (not in loops/conditions)
2. Only call hooks from React functions
`,
    'state': `
**State** is data that changes over time and triggers re-renders.

\`\`\`jsx
// Simple state
const [count, setCount] = useState(0);

// Object state
const [user, setUser] = useState({ name: '', email: '' });
setUser(prev => ({ ...prev, name: 'John' }));

// Array state
const [items, setItems] = useState([]);
setItems(prev => [...prev, newItem]);
\`\`\`
`,
    'async': `
**Async/Await** makes asynchronous code easier to read and write.

\`\`\`javascript
// Without async/await (callbacks/promises)
fetch('/api/data')
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));

// With async/await
async function fetchData() {
  try {
    const res = await fetch('/api/data');
    const data = await res.json();
    console.log(data);
  } catch (err) {
    console.error(err);
  }
}
\`\`\`
`,
    'api': `
**REST API** is a way to communicate between frontend and backend.

**HTTP Methods:**
- \`GET\` - Fetch data
- \`POST\` - Create new data
- \`PUT/PATCH\` - Update existing data
- \`DELETE\` - Remove data

\`\`\`javascript
// GET request
const response = await fetch('/api/users');
const users = await response.json();

// POST request
await fetch('/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'John' })
});
\`\`\`
`,
  };

  const key = Object.keys(teachings).find(k => concept.toLowerCase().includes(k));
  return teachings[key || 'react'] || `
**${concept}**

This concept helps you build better applications. Would you like me to explain a specific aspect of it?

Common topics I can explain:
- React fundamentals
- State management
- Hooks (useState, useEffect, etc.)
- Async/await and Promises
- API calls and data fetching
- Component patterns
`;
}

// ============================================================================
// MASTER INTEGRATION
// ============================================================================

export interface IntelligenceResult {
  intent: SemanticIntent;
  decomposition: DecomposedProblem;
  solutions: CreativeSolution[];
  explanation?: CodeExplanation;
  contextualComponent?: BuiltComponent;
  errorAnalysis?: ErrorAnalysis;
}

export function processWithIntelligence(input: string, existingCode?: string): IntelligenceResult {
  addToMemory('user', input);

  const resolvedInput = resolveSynonyms(input);
  const intent = parseSemanticIntent(resolvedInput);

  const contextualComponent = resolveReference(input) || undefined;

  const decomposition = decomposeProblem(resolvedInput);

  const solutions = solveCreatively(resolvedInput);

  let explanation: CodeExplanation | undefined;
  if (existingCode) {
    explanation = explainCode(existingCode);
  }

  let errorAnalysis: ErrorAnalysis | undefined;
  if (intent.action === 'fix' && existingCode) {
    const errorMatch = input.match(/error[:\s]+(.+)/i);
    if (errorMatch) {
      errorAnalysis = analyzeError(errorMatch[1], existingCode);
    }
  }

  return {
    intent,
    decomposition,
    solutions,
    explanation,
    contextualComponent,
    errorAnalysis,
  };
}

export {
  type SemanticIntent,
  type Task,
  type DecomposedProblem,
  type BuiltComponent,
  type ConversationContext,
  type ErrorAnalysis,
  type CodeStructure,
  type CreativeSolution,
  type CodeExplanation,
};