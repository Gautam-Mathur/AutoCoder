/**
 * Natural Language Understanding Module
 * Provides Claude-level language understanding: intent classification, entity extraction, semantic parsing
 */

// ============================================
// Intent Classification
// ============================================

export type Intent =
  | 'build' | 'fix' | 'explain' | 'refactor' | 'optimize' | 'debug'
  | 'add_feature' | 'remove_feature' | 'modify' | 'style' | 'test'
  | 'deploy' | 'document' | 'integrate' | 'convert' | 'compare'
  | 'question' | 'greeting' | 'confirmation' | 'rejection' | 'unclear';

export interface IntentResult {
  primary: Intent;
  secondary: Intent | null;
  confidence: number; // 0-1
  indicators: string[];
}

const INTENT_PATTERNS: Record<Intent, RegExp[]> = {
  build: [
    /\b(build|create|make|generate|develop|construct|set up|setup|implement|scaffold)\b/i,
    /\b(new|from scratch|start|initialize)\b/i,
  ],
  fix: [
    /\b(fix|repair|solve|resolve|correct|patch|debug|troubleshoot)\b/i,
    /\b(broken|not working|doesn't work|error|bug|issue|problem)\b/i,
  ],
  explain: [
    /\b(explain|describe|what does|what is|how does|tell me about|walk through)\b/i,
    /\b(understand|clarify|break down|elaborate)\b/i,
  ],
  refactor: [
    /\b(refactor|restructure|reorganize|clean up|improve structure|modularize)\b/i,
    /\b(better structure|cleaner code|extract|consolidate)\b/i,
  ],
  optimize: [
    /\b(optimize|speed up|faster|improve performance|efficient|reduce|minimize)\b/i,
    /\b(slow|bottleneck|memory|cpu|load time)\b/i,
  ],
  debug: [
    /\b(debug|trace|find the bug|what's wrong|why is it|diagnose)\b/i,
    /\b(console\.log|breakpoint|step through)\b/i,
  ],
  add_feature: [
    /\b(add|include|insert|put|append|attach|incorporate)\b/i,
    /\b(feature|functionality|capability|option|button|form|modal)\b/i,
  ],
  remove_feature: [
    /\b(remove|delete|get rid of|take out|eliminate|drop)\b/i,
    /\b(unnecessary|unused|deprecated|legacy)\b/i,
  ],
  modify: [
    /\b(change|update|modify|alter|edit|adjust|tweak|switch)\b/i,
    /\b(different|another|instead|replace)\b/i,
  ],
  style: [
    /\b(style|css|design|look|appearance|theme|color|font|layout)\b/i,
    /\b(prettier|beautiful|modern|responsive|mobile|dark mode)\b/i,
  ],
  test: [
    /\b(test|unit test|integration test|e2e|coverage|jest|mocha)\b/i,
    /\b(spec|assertion|expect|mock|stub)\b/i,
  ],
  deploy: [
    /\b(deploy|publish|release|launch|ship|go live|production)\b/i,
    /\b(hosting|server|domain|ssl|ci\/cd)\b/i,
  ],
  document: [
    /\b(document|readme|jsdoc|comment|annotate|api docs)\b/i,
    /\b(documentation|wiki|guide|tutorial)\b/i,
  ],
  integrate: [
    /\b(integrate|connect|link|hook up|sync|api|third.?party)\b/i,
    /\b(stripe|firebase|aws|google|auth|oauth|webhook)\b/i,
  ],
  convert: [
    /\b(convert|transform|migrate|port|translate|change from|to)\b/i,
    /\b(typescript|javascript|python|react|vue|angular)\b/i,
  ],
  compare: [
    /\b(compare|difference|versus|vs|which is better|pros and cons)\b/i,
    /\b(alternatives|options|choices)\b/i,
  ],
  question: [
    /\b(what|why|how|when|where|which|who|can you|could you|is it possible)\b/i,
    /\?$/,
  ],
  greeting: [
    /\b(hello|hi|hey|greetings|good morning|good afternoon|good evening)\b/i,
    /^(hi|hey|hello)[\s!.,]*$/i,
  ],
  confirmation: [
    /\b(yes|yeah|yep|sure|okay|ok|correct|right|exactly|perfect|great|thanks)\b/i,
    /^(y|yes|ok|sure)[\s!.,]*$/i,
  ],
  rejection: [
    /\b(no|nope|nah|wrong|incorrect|don't|cancel|stop|never mind)\b/i,
    /^(n|no|nope)[\s!.,]*$/i,
  ],
  unclear: [],
};

export function classifyIntent(text: string): IntentResult {
  const scores: Record<Intent, number> = {} as Record<Intent, number>;
  const allIndicators: Record<Intent, string[]> = {} as Record<Intent, string[]>;

  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    scores[intent as Intent] = 0;
    allIndicators[intent as Intent] = [];

    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        scores[intent as Intent] += 1;
        allIndicators[intent as Intent].push(matches[0]);
      }
    }
  }

  // Sort by score
  const sorted = Object.entries(scores)
    .filter(([_, score]) => score > 0)
    .sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) {
    return {
      primary: 'unclear',
      secondary: null,
      confidence: 0.2,
      indicators: [],
    };
  }

  const [primary, primaryScore] = sorted[0];
  const secondary = sorted.length > 1 ? sorted[1][0] as Intent : null;

  // Calculate confidence based on score and text length
  const maxPossibleScore = INTENT_PATTERNS[primary as Intent].length;
  const confidence = Math.min(0.95, (primaryScore / Math.max(maxPossibleScore, 1)) * 0.7 + 0.3);

  return {
    primary: primary as Intent,
    secondary,
    confidence,
    indicators: allIndicators[primary as Intent],
  };
}

// ============================================
// Entity Extraction
// ============================================

export interface Entity {
  type: 'language' | 'framework' | 'library' | 'feature' | 'component' | 'action' | 'target' | 'modifier' | 'file' | 'color' | 'size' | 'technology';
  value: string;
  normalized: string;
  position: { start: number; end: number };
}

const ENTITY_PATTERNS: Record<Entity['type'], Record<string, RegExp>> = {
  language: {
    javascript: /\b(javascript|js|ecmascript|es6|es2015)\b/i,
    typescript: /\b(typescript|ts)\b/i,
    python: /\b(python|py)\b/i,
    go: /\b(golang|go)\b/i,
    rust: /\b(rust|rs)\b/i,
    java: /\b(java)\b/i,
    csharp: /\b(c#|csharp|c-sharp)\b/i,
    cpp: /\b(c\+\+|cpp)\b/i,
    ruby: /\b(ruby|rb)\b/i,
    php: /\b(php)\b/i,
    swift: /\b(swift)\b/i,
    kotlin: /\b(kotlin)\b/i,
    html: /\b(html|html5)\b/i,
    css: /\b(css|css3|stylesheet)\b/i,
    sql: /\b(sql|mysql|postgresql|postgres|sqlite)\b/i,
  },
  framework: {
    react: /\b(react|reactjs|react\.js)\b/i,
    vue: /\b(vue|vuejs|vue\.js)\b/i,
    angular: /\b(angular|angularjs)\b/i,
    svelte: /\b(svelte|sveltekit)\b/i,
    nextjs: /\b(next\.?js|nextjs)\b/i,
    express: /\b(express|expressjs)\b/i,
    fastapi: /\b(fastapi|fast-api)\b/i,
    flask: /\b(flask)\b/i,
    django: /\b(django)\b/i,
    gin: /\b(gin|gin-gonic)\b/i,
    spring: /\b(spring|springboot|spring boot)\b/i,
    rails: /\b(rails|ruby on rails|ror)\b/i,
    laravel: /\b(laravel)\b/i,
    nestjs: /\b(nestjs|nest\.js)\b/i,
  },
  library: {
    tailwind: /\b(tailwind|tailwindcss)\b/i,
    bootstrap: /\b(bootstrap)\b/i,
    jquery: /\b(jquery|\$\()\b/i,
    axios: /\b(axios)\b/i,
    lodash: /\b(lodash|_\.)\b/i,
    moment: /\b(moment|dayjs|date-fns)\b/i,
    redux: /\b(redux|zustand|mobx)\b/i,
    prisma: /\b(prisma)\b/i,
    drizzle: /\b(drizzle)\b/i,
    mongoose: /\b(mongoose)\b/i,
    jest: /\b(jest|vitest|mocha|jasmine)\b/i,
    webpack: /\b(webpack|vite|rollup|parcel)\b/i,
  },
  feature: {
    auth: /\b(auth|authentication|login|signup|sign up|register|oauth)\b/i,
    database: /\b(database|db|storage|persist|crud)\b/i,
    api: /\b(api|rest|graphql|endpoint|route)\b/i,
    form: /\b(form|input|validation|submit)\b/i,
    modal: /\b(modal|popup|dialog|overlay)\b/i,
    table: /\b(table|grid|list|data table)\b/i,
    chart: /\b(chart|graph|visualization|dashboard)\b/i,
    search: /\b(search|filter|find|query)\b/i,
    pagination: /\b(pagination|paging|infinite scroll)\b/i,
    upload: /\b(upload|file upload|image upload|drag and drop)\b/i,
    notification: /\b(notification|toast|alert|message)\b/i,
    navigation: /\b(nav|navigation|menu|sidebar|header)\b/i,
    animation: /\b(animation|transition|motion|animate)\b/i,
  },
  component: {
    button: /\b(button|btn|cta)\b/i,
    input: /\b(input|text field|text box)\b/i,
    select: /\b(select|dropdown|combobox)\b/i,
    checkbox: /\b(checkbox|toggle|switch)\b/i,
    card: /\b(card|tile|panel)\b/i,
    header: /\b(header|navbar|topbar)\b/i,
    footer: /\b(footer|bottom bar)\b/i,
    sidebar: /\b(sidebar|side panel|drawer)\b/i,
    icon: /\b(icon|symbol|glyph)\b/i,
    image: /\b(image|img|photo|picture|avatar)\b/i,
    link: /\b(link|anchor|href)\b/i,
  },
  action: {
    click: /\b(click|press|tap|select)\b/i,
    hover: /\b(hover|mouse over|on hover)\b/i,
    scroll: /\b(scroll|scrolling)\b/i,
    drag: /\b(drag|drop|drag and drop|dnd)\b/i,
    type: /\b(type|enter|input)\b/i,
    submit: /\b(submit|send|post)\b/i,
    load: /\b(load|loading|fetch|get)\b/i,
    save: /\b(save|store|persist)\b/i,
    delete: /\b(delete|remove|clear)\b/i,
  },
  target: {
    user: /\b(user|account|profile|member)\b/i,
    product: /\b(product|item|good)\b/i,
    order: /\b(order|purchase|transaction)\b/i,
    payment: /\b(payment|checkout|billing)\b/i,
    message: /\b(message|chat|comment)\b/i,
    post: /\b(post|article|blog)\b/i,
    file: /\b(file|document|attachment)\b/i,
    setting: /\b(setting|config|preference)\b/i,
  },
  modifier: {
    responsive: /\b(responsive|mobile.?first|adaptive)\b/i,
    accessible: /\b(accessible|a11y|aria|screen reader)\b/i,
    secure: /\b(secure|encrypted|safe|protected)\b/i,
    fast: /\b(fast|quick|performant|optimized)\b/i,
    simple: /\b(simple|minimal|basic|clean)\b/i,
    modern: /\b(modern|contemporary|latest)\b/i,
    professional: /\b(professional|enterprise|production)\b/i,
  },
  file: {
    file: /\b[\w\-]+\.(js|ts|jsx|tsx|py|go|rs|java|css|scss|html|json|md|yaml|yml|env|sql)\b/i,
  },
  color: {
    color: /\b(red|blue|green|yellow|orange|purple|pink|black|white|gray|grey|dark|light|primary|secondary|accent)\b/i,
    hex: /#[0-9a-fA-F]{3,8}\b/,
  },
  size: {
    size: /\b(small|medium|large|xl|xs|sm|md|lg|tiny|huge|big)\b/i,
    pixels: /\b\d+\s?(px|em|rem|vh|vw|%)\b/i,
  },
  technology: {
    aws: /\b(aws|amazon|s3|ec2|lambda|cloudfront)\b/i,
    gcp: /\b(gcp|google cloud|firebase|firestore)\b/i,
    azure: /\b(azure|microsoft cloud)\b/i,
    docker: /\b(docker|container|kubernetes|k8s)\b/i,
    git: /\b(git|github|gitlab|bitbucket)\b/i,
    npm: /\b(npm|yarn|pnpm|package)\b/i,
  },
};

export function extractEntities(text: string): Entity[] {
  const entities: Entity[] = [];

  for (const [type, patterns] of Object.entries(ENTITY_PATTERNS)) {
    for (const [normalized, pattern] of Object.entries(patterns)) {
      let match;
      const regex = new RegExp(pattern.source, 'gi');

      while ((match = regex.exec(text)) !== null) {
        entities.push({
          type: type as Entity['type'],
          value: match[0],
          normalized,
          position: { start: match.index, end: match.index + match[0].length },
        });
      }
    }
  }

  // Sort by position
  entities.sort((a, b) => a.position.start - b.position.start);

  return entities;
}

// ============================================
// Semantic Parsing
// ============================================

export interface SemanticFrame {
  action: string;
  target: string | null;
  modifiers: string[];
  context: string[];
  constraints: string[];
}

export interface SemanticAnalysis {
  frames: SemanticFrame[];
  complexity: 'simple' | 'moderate' | 'complex';
  isMultiPart: boolean;
  parts: string[];
  implicitRequirements: string[];
}

export function parseSemantics(text: string): SemanticAnalysis {
  const intent = classifyIntent(text);
  const entities = extractEntities(text);

  // Split into parts if multi-part request
  const parts = text.split(/(?:,\s*and\s+|,\s*then\s+|\.\s+|;\s*)/i).filter(p => p.trim().length > 5);
  const isMultiPart = parts.length > 1;

  // Build semantic frames
  const frames: SemanticFrame[] = parts.map(part => {
    const partEntities = extractEntities(part);
    const partIntent = classifyIntent(part);

    const actions = partEntities.filter(e => e.type === 'action');
    const targets = partEntities.filter(e => ['target', 'component', 'feature'].includes(e.type));
    const modifiers = partEntities.filter(e => e.type === 'modifier');
    const tech = partEntities.filter(e => ['language', 'framework', 'library', 'technology'].includes(e.type));

    return {
      action: actions.length > 0 ? actions[0].normalized : partIntent.primary,
      target: targets.length > 0 ? targets[0].normalized : null,
      modifiers: modifiers.map(m => m.normalized),
      context: tech.map(t => t.normalized),
      constraints: [],
    };
  });

  // Determine complexity
  const uniqueTypes = new Set(entities.map(e => e.type)).size;
  const complexity: 'simple' | 'moderate' | 'complex' =
    uniqueTypes <= 2 && entities.length <= 3 ? 'simple' :
    uniqueTypes <= 4 && entities.length <= 8 ? 'moderate' : 'complex';

  // Infer implicit requirements
  const implicitRequirements: string[] = [];

  const hasAuth = entities.some(e => e.normalized === 'auth');
  const hasForm = entities.some(e => e.normalized === 'form');
  const hasDatabase = entities.some(e => e.normalized === 'database');
  const hasApi = entities.some(e => e.normalized === 'api');

  if (hasAuth) {
    implicitRequirements.push('session management', 'password hashing', 'protected routes');
  }
  if (hasForm) {
    implicitRequirements.push('validation', 'error handling', 'submit handling');
  }
  if (hasDatabase) {
    implicitRequirements.push('connection pooling', 'error handling', 'data validation');
  }
  if (hasApi) {
    implicitRequirements.push('error responses', 'request validation', 'rate limiting');
  }

  return {
    frames,
    complexity,
    isMultiPart,
    parts,
    implicitRequirements,
  };
}

// ============================================
// Sentiment & Urgency Detection
// ============================================

export interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral' | 'frustrated' | 'excited';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  indicators: string[];
}

const SENTIMENT_PATTERNS = {
  positive: [/\b(love|great|awesome|amazing|excellent|perfect|thanks|thank you|please)\b/i],
  negative: [/\b(hate|terrible|awful|worst|bad|broken|useless|stupid)\b/i],
  frustrated: [/\b(again|still|not working|doesn't work|why won't|can't|won't|help|please)\b/i, /!{2,}/, /\?{2,}/],
  excited: [/\b(wow|cool|excited|can't wait|awesome)\b/i, /!$/],
};

const URGENCY_PATTERNS = {
  critical: [/\b(urgent|asap|immediately|emergency|critical|production down|broken)\b/i],
  high: [/\b(soon|quickly|fast|hurry|deadline|today|now)\b/i],
  medium: [/\b(when you can|would be nice|should)\b/i],
  low: [/\b(eventually|sometime|no rush|whenever)\b/i],
};

export function analyzeSentiment(text: string): SentimentResult {
  const indicators: string[] = [];
  let sentiment: SentimentResult['sentiment'] = 'neutral';
  let urgency: SentimentResult['urgency'] = 'medium';

  // Check sentiment
  for (const [sent, patterns] of Object.entries(SENTIMENT_PATTERNS)) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        sentiment = sent as SentimentResult['sentiment'];
        indicators.push(match[0]);
      }
    }
  }

  // Check urgency
  for (const [urg, patterns] of Object.entries(URGENCY_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        urgency = urg as SentimentResult['urgency'];
        break;
      }
    }
    if (urgency !== 'medium') break;
  }

  return { sentiment, urgency, indicators };
}

// ============================================
// Full NLU Analysis
// ============================================

export interface NLUResult {
  intent: IntentResult;
  entities: Entity[];
  semantics: SemanticAnalysis;
  sentiment: SentimentResult;
  summary: string;
}

export function analyzeNLU(text: string): NLUResult {
  const intent = classifyIntent(text);
  const entities = extractEntities(text);
  const semantics = parseSemantics(text);
  const sentiment = analyzeSentiment(text);

  // Generate summary
  const primaryEntities = entities.slice(0, 3).map(e => e.normalized).join(', ');
  const summary = `${intent.primary} request (${intent.confidence.toFixed(0)}% confident) involving ${primaryEntities || 'general task'}. Complexity: ${semantics.complexity}. Urgency: ${sentiment.urgency}.`;

  return {
    intent,
    entities,
    semantics,
    sentiment,
    summary,
  };
}

export function formatNLUAsMarkdown(result: NLUResult): string {
  const lines = [
    '## Natural Language Analysis',
    '',
    `**Intent**: ${result.intent.primary} (${(result.intent.confidence * 100).toFixed(0)}% confident)`,
    result.intent.secondary ? `**Secondary Intent**: ${result.intent.secondary}` : '',
    '',
    '### Entities Detected',
    ...result.entities.slice(0, 10).map(e => `- **${e.type}**: ${e.value} → ${e.normalized}`),
    '',
    `**Complexity**: ${result.semantics.complexity}`,
    `**Multi-part Request**: ${result.semantics.isMultiPart ? 'Yes' : 'No'}`,
    '',
    '### Implicit Requirements',
    ...result.semantics.implicitRequirements.map(r => `- ${r}`),
    '',
    `**Sentiment**: ${result.sentiment.sentiment}`,
    `**Urgency**: ${result.sentiment.urgency}`,
  ];

  return lines.filter(l => l !== '').join('\n');
}