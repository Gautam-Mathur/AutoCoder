/**
 * Enhanced Intent Recognition System
 * Claude-level intent understanding with 100+ patterns,
 * fuzzy matching, semantic similarity, and multi-intent detection
 */

// ============================================
// INTENT TAXONOMY - Comprehensive categorization
// ============================================

export interface IntentResult {
  primary: string;
  secondary: string[];
  confidence: number;
  subcategory?: string;
  action?: string;
  target?: string;
  modifiers: string[];
  isMultiIntent: boolean;
  intents: SingleIntent[];
  semanticCategory: string;
  complexity: 'simple' | 'moderate' | 'complex' | 'expert';
  suggestedApproach?: string;
}

export interface SingleIntent {
  intent: string;
  confidence: number;
  span: { start: number; end: number };
  keywords: string[];
}

// Master intent categories with subcategories
const INTENT_TAXONOMY: Record<string, {
  subcategories: string[];
  indicators: string[];
  weight: number;
  semanticCategory: string;
}> = {
  // ========== CREATION INTENTS ==========
  create: {
    subcategories: ['build', 'make', 'generate', 'develop', 'implement', 'code', 'write', 'design', 'craft', 'construct', 'produce', 'compose'],
    indicators: ['create', 'build', 'make', 'generate', 'develop', 'implement', 'code', 'write', 'design', 'new', 'start', 'init', 'scaffold', 'bootstrap', 'setup', 'craft', 'construct', 'produce', 'compose', 'author', 'draft', 'establish', 'form', 'forge', 'manufacture', 'originate', 'spawn', 'synthesize'],
    weight: 1.0,
    semanticCategory: 'construction',
  },

  // ========== MODIFICATION INTENTS ==========
  modify: {
    subcategories: ['edit', 'update', 'change', 'alter', 'adjust', 'tweak', 'revise', 'amend'],
    indicators: ['modify', 'edit', 'update', 'change', 'alter', 'adjust', 'tweak', 'revise', 'amend', 'mutate', 'transform', 'convert', 'morph', 'reshape', 'rework', 'rewrite', 'patch', 'fix up'],
    weight: 0.9,
    semanticCategory: 'transformation',
  },

  refactor: {
    subcategories: ['restructure', 'reorganize', 'clean', 'improve', 'modernize'],
    indicators: ['refactor', 'restructure', 'reorganize', 'clean', 'clean up', 'improve', 'modernize', 'upgrade', 'optimize structure', 'simplify', 'consolidate', 'streamline', 'decompose', 'extract', 'inline', 'rename', 'move', 'split', 'merge', 'decouple'],
    weight: 0.95,
    semanticCategory: 'transformation',
  },

  // ========== ANALYSIS INTENTS ==========
  explain: {
    subcategories: ['describe', 'clarify', 'elaborate', 'interpret', 'analyze'],
    indicators: ['explain', 'describe', 'clarify', 'elaborate', 'interpret', 'what is', 'what does', 'how does', 'why does', 'tell me about', 'walk me through', 'break down', 'elucidate', 'expound', 'illustrate', 'define', 'meaning of', 'purpose of', 'understand'],
    weight: 0.85,
    semanticCategory: 'comprehension',
  },

  analyze: {
    subcategories: ['review', 'examine', 'inspect', 'audit', 'evaluate', 'assess'],
    indicators: ['analyze', 'review', 'examine', 'inspect', 'audit', 'evaluate', 'assess', 'check', 'scan', 'investigate', 'study', 'scrutinize', 'probe', 'dissect', 'diagnose', 'profile', 'benchmark', 'measure'],
    weight: 0.9,
    semanticCategory: 'comprehension',
  },

  // ========== DEBUGGING INTENTS ==========
  fix: {
    subcategories: ['repair', 'resolve', 'correct', 'patch', 'heal'],
    indicators: ['fix', 'repair', 'resolve', 'correct', 'patch', 'heal', 'mend', 'remedy', 'rectify', 'restore', 'recover', 'solve', 'address', 'handle', 'deal with', 'sort out', 'clear up', 'iron out'],
    weight: 1.0,
    semanticCategory: 'remediation',
  },

  debug: {
    subcategories: ['troubleshoot', 'diagnose', 'trace', 'investigate'],
    indicators: ['debug', 'troubleshoot', 'diagnose', 'trace', 'investigate', 'find bug', 'find error', 'find issue', 'find problem', 'track down', 'root cause', 'why is', 'why isn\'t', 'not working', 'broken', 'failing', 'crashed', 'error', 'exception'],
    weight: 1.0,
    semanticCategory: 'remediation',
  },

  // ========== OPTIMIZATION INTENTS ==========
  optimize: {
    subcategories: ['speed up', 'improve performance', 'enhance', 'tune'],
    indicators: ['optimize', 'speed up', 'improve performance', 'enhance', 'tune', 'boost', 'accelerate', 'faster', 'quicker', 'efficient', 'performance', 'reduce latency', 'minimize', 'maximize', 'cache', 'lazy load', 'debounce', 'throttle', 'memoize', 'parallelize'],
    weight: 0.95,
    semanticCategory: 'enhancement',
  },

  // ========== STYLING INTENTS ==========
  style: {
    subcategories: ['design', 'theme', 'beautify', 'format'],
    indicators: ['style', 'design', 'theme', 'beautify', 'format', 'css', 'colors', 'fonts', 'layout', 'responsive', 'mobile', 'dark mode', 'light mode', 'animation', 'transition', 'hover', 'ui', 'ux', 'look', 'appearance', 'visual', 'aesthetic', 'pretty', 'beautiful', 'modern', 'sleek', 'clean'],
    weight: 0.8,
    semanticCategory: 'presentation',
  },

  // ========== TESTING INTENTS ==========
  test: {
    subcategories: ['verify', 'validate', 'check', 'ensure'],
    indicators: ['test', 'verify', 'validate', 'check', 'ensure', 'unit test', 'integration test', 'e2e', 'end to end', 'coverage', 'assertion', 'expect', 'mock', 'stub', 'spy', 'jest', 'mocha', 'cypress', 'playwright', 'selenium', 'qa', 'quality'],
    weight: 0.9,
    semanticCategory: 'verification',
  },

  // ========== DOCUMENTATION INTENTS ==========
  document: {
    subcategories: ['comment', 'annotate', 'describe', 'readme'],
    indicators: ['document', 'comment', 'annotate', 'describe', 'readme', 'jsdoc', 'tsdoc', 'docstring', 'documentation', 'wiki', 'guide', 'tutorial', 'api docs', 'swagger', 'openapi', 'changelog', 'notes'],
    weight: 0.75,
    semanticCategory: 'documentation',
  },

  // ========== DEPLOYMENT INTENTS ==========
  deploy: {
    subcategories: ['publish', 'release', 'ship', 'launch'],
    indicators: ['deploy', 'publish', 'release', 'ship', 'launch', 'production', 'staging', 'live', 'host', 'serve', 'ci', 'cd', 'pipeline', 'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'vercel', 'netlify', 'heroku', 'push to', 'go live'],
    weight: 0.85,
    semanticCategory: 'deployment',
  },

  // ========== SECURITY INTENTS ==========
  secure: {
    subcategories: ['protect', 'authenticate', 'authorize', 'encrypt'],
    indicators: ['secure', 'protect', 'authenticate', 'authorize', 'encrypt', 'hash', 'salt', 'jwt', 'oauth', 'session', 'csrf', 'xss', 'sql injection', 'sanitize', 'validate input', 'rate limit', 'firewall', 'ssl', 'https', 'cors', 'permission', 'role', 'access control'],
    weight: 0.95,
    semanticCategory: 'security',
  },

  // ========== DATABASE INTENTS ==========
  database: {
    subcategories: ['query', 'migrate', 'seed', 'model'],
    indicators: ['database', 'db', 'query', 'migrate', 'migration', 'seed', 'model', 'schema', 'table', 'column', 'index', 'relation', 'foreign key', 'primary key', 'orm', 'sql', 'nosql', 'mongodb', 'postgres', 'mysql', 'redis', 'crud', 'insert', 'select', 'update', 'delete', 'join'],
    weight: 0.9,
    semanticCategory: 'data',
  },

  // ========== API INTENTS ==========
  api: {
    subcategories: ['endpoint', 'route', 'rest', 'graphql'],
    indicators: ['api', 'endpoint', 'route', 'rest', 'graphql', 'fetch', 'request', 'response', 'get', 'post', 'put', 'patch', 'delete', 'webhook', 'websocket', 'socket', 'realtime', 'sse', 'polling', 'axios', 'http', 'https', 'status code', 'header', 'body', 'json', 'xml'],
    weight: 0.9,
    semanticCategory: 'integration',
  },

  // ========== LEARNING INTENTS ==========
  learn: {
    subcategories: ['understand', 'study', 'explore', 'discover'],
    indicators: ['learn', 'understand', 'study', 'explore', 'discover', 'teach me', 'show me', 'how to', 'tutorial', 'guide', 'example', 'sample', 'demo', 'practice', 'exercise', 'beginner', 'introduction', 'getting started', 'basics', 'fundamentals'],
    weight: 0.7,
    semanticCategory: 'education',
  },

  // ========== COMPARISON INTENTS ==========
  compare: {
    subcategories: ['contrast', 'versus', 'difference', 'choose'],
    indicators: ['compare', 'contrast', 'versus', 'vs', 'difference', 'choose', 'which is better', 'pros and cons', 'advantages', 'disadvantages', 'trade-offs', 'alternatives', 'options', 'benchmark', 'should i use'],
    weight: 0.75,
    semanticCategory: 'analysis',
  },

  // ========== INTEGRATION INTENTS ==========
  integrate: {
    subcategories: ['connect', 'link', 'combine', 'merge'],
    indicators: ['integrate', 'connect', 'link', 'combine', 'merge', 'incorporate', 'embed', 'import', 'export', 'sync', 'third party', 'plugin', 'extension', 'addon', 'library', 'package', 'sdk', 'api integration', 'stripe', 'paypal', 'google', 'facebook', 'twitter'],
    weight: 0.9,
    semanticCategory: 'integration',
  },

  // ========== REMOVAL INTENTS ==========
  remove: {
    subcategories: ['delete', 'clear', 'purge', 'eliminate'],
    indicators: ['remove', 'delete', 'clear', 'purge', 'eliminate', 'drop', 'erase', 'wipe', 'clean out', 'get rid of', 'discard', 'dispose', 'uninstall', 'detach', 'disconnect', 'strip', 'trim', 'prune'],
    weight: 0.85,
    semanticCategory: 'destruction',
  },

  // ========== CONVERSION INTENTS ==========
  convert: {
    subcategories: ['transform', 'translate', 'migrate', 'port'],
    indicators: ['convert', 'transform', 'translate', 'migrate', 'port', 'change from', 'change to', 'switch to', 'move to', 'upgrade to', 'downgrade to', 'from x to y', 'rewrite in', 'typescript', 'javascript', 'python', 'go', 'rust'],
    weight: 0.85,
    semanticCategory: 'transformation',
  },

  // ========== CONFIGURATION INTENTS ==========
  configure: {
    subcategories: ['setup', 'settings', 'options', 'environment'],
    indicators: ['configure', 'setup', 'settings', 'options', 'environment', 'config', 'env', 'dotenv', 'yaml', 'json', 'toml', 'ini', 'properties', 'flags', 'parameters', 'arguments', 'cli', 'terminal', 'command line'],
    weight: 0.8,
    semanticCategory: 'configuration',
  },
};

// ============================================
// FUZZY MATCHING SYSTEM
// ============================================

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function fuzzyMatch(text: string, pattern: string, threshold = 0.8): { match: boolean; score: number } {
  const textLower = text.toLowerCase();
  const patternLower = pattern.toLowerCase();

  // Exact match
  if (textLower.includes(patternLower)) {
    return { match: true, score: 1.0 };
  }

  // Word-level matching
  const words = textLower.split(/\s+/);
  for (const word of words) {
    const distance = levenshteinDistance(word, patternLower);
    const maxLen = Math.max(word.length, patternLower.length);
    const similarity = 1 - distance / maxLen;

    if (similarity >= threshold) {
      return { match: true, score: similarity };
    }
  }

  // Substring matching with tolerance
  for (let i = 0; i <= textLower.length - patternLower.length; i++) {
    const substring = textLower.substring(i, i + patternLower.length);
    const distance = levenshteinDistance(substring, patternLower);
    const similarity = 1 - distance / patternLower.length;

    if (similarity >= threshold) {
      return { match: true, score: similarity * 0.9 };
    }
  }

  return { match: false, score: 0 };
}

// ============================================
// SEMANTIC SIMILARITY ENGINE
// ============================================

const SEMANTIC_CLUSTERS: Record<string, string[]> = {
  creation: ['create', 'build', 'make', 'generate', 'develop', 'implement', 'code', 'write', 'design', 'construct', 'produce', 'craft', 'forge', 'manufacture', 'compose', 'author', 'establish', 'form', 'spawn', 'synthesize', 'originate', 'devise', 'formulate', 'architect'],

  modification: ['modify', 'edit', 'update', 'change', 'alter', 'adjust', 'tweak', 'revise', 'amend', 'patch', 'fix', 'correct', 'improve', 'enhance', 'upgrade', 'transform', 'convert', 'adapt', 'customize', 'personalize', 'tailor'],

  destruction: ['remove', 'delete', 'clear', 'purge', 'eliminate', 'drop', 'erase', 'wipe', 'destroy', 'discard', 'dispose', 'uninstall', 'detach', 'disconnect', 'strip', 'trim', 'prune', 'cut', 'excise'],

  analysis: ['analyze', 'examine', 'inspect', 'review', 'evaluate', 'assess', 'study', 'investigate', 'explore', 'probe', 'scrutinize', 'dissect', 'audit', 'check', 'scan', 'survey', 'observe'],

  explanation: ['explain', 'describe', 'clarify', 'elaborate', 'define', 'interpret', 'elucidate', 'expound', 'illustrate', 'demonstrate', 'show', 'tell', 'teach', 'educate', 'inform'],

  optimization: ['optimize', 'improve', 'enhance', 'boost', 'accelerate', 'speed up', 'streamline', 'refine', 'tune', 'polish', 'perfect', 'maximize', 'minimize', 'reduce', 'increase'],

  debugging: ['debug', 'fix', 'repair', 'resolve', 'troubleshoot', 'diagnose', 'solve', 'remedy', 'rectify', 'heal', 'mend', 'patch', 'correct', 'address'],

  testing: ['test', 'verify', 'validate', 'check', 'confirm', 'ensure', 'assert', 'prove', 'examine', 'trial', 'experiment'],

  security: ['secure', 'protect', 'safeguard', 'defend', 'shield', 'guard', 'encrypt', 'authenticate', 'authorize', 'validate', 'sanitize'],
};

function getSemanticSimilarity(word: string, category: string): number {
  const cluster = SEMANTIC_CLUSTERS[category];
  if (!cluster) return 0;

  const wordLower = word.toLowerCase();

  // Direct match in cluster
  if (cluster.includes(wordLower)) {
    return 1.0;
  }

  // Fuzzy match against cluster words
  let maxScore = 0;
  for (const clusterWord of cluster) {
    const { score } = fuzzyMatch(wordLower, clusterWord, 0.75);
    maxScore = Math.max(maxScore, score);
  }

  return maxScore;
}

// ============================================
// MULTI-INTENT DETECTION
// ============================================

const INTENT_CONJUNCTIONS = ['and', 'also', 'then', 'after that', 'plus', 'as well as', 'along with', 'additionally', 'furthermore', 'moreover', 'besides', 'next', 'finally', 'first', 'second', 'third', 'lastly'];

function splitMultiIntent(text: string): string[] {
  let parts: string[] = [text];

  // Split by conjunctions
  for (const conj of INTENT_CONJUNCTIONS) {
    const newParts: string[] = [];
    for (const part of parts) {
      const regex = new RegExp(`\\b${conj}\\b`, 'gi');
      const splits = part.split(regex).filter(s => s.trim().length > 3);
      newParts.push(...splits);
    }
    if (newParts.length > parts.length) {
      parts = newParts;
    }
  }

  // Split by numbered lists
  const numberedPattern = /(?:^|\s)(\d+[\.\)]\s+)/g;
  if (numberedPattern.test(text)) {
    parts = text.split(/\d+[\.\)]\s+/).filter(s => s.trim().length > 3);
  }

  // Split by bullet points
  if (text.includes('•') || text.includes('-')) {
    const bulletParts = text.split(/[•\-]\s+/).filter(s => s.trim().length > 3);
    if (bulletParts.length > 1) {
      parts = bulletParts;
    }
  }

  return parts.map(p => p.trim());
}

// ============================================
// COMPLEXITY ASSESSMENT
// ============================================

function assessComplexity(text: string, intents: SingleIntent[]): 'simple' | 'moderate' | 'complex' | 'expert' {
  const wordCount = text.split(/\s+/).length;
  const intentCount = intents.length;

  // Technical term detection
  const technicalTerms = [
    'microservices', 'kubernetes', 'docker', 'ci/cd', 'graphql', 'websocket',
    'authentication', 'authorization', 'encryption', 'distributed', 'scalable',
    'event-driven', 'serverless', 'monorepo', 'polymorphism', 'inheritance',
    'dependency injection', 'inversion of control', 'singleton', 'factory',
    'observer', 'strategy', 'decorator', 'adapter', 'facade', 'proxy',
    'middleware', 'interceptor', 'resolver', 'mutation', 'subscription',
    'sharding', 'replication', 'caching', 'load balancing', 'rate limiting'
  ];

  const technicalCount = technicalTerms.filter(term =>
    text.toLowerCase().includes(term)
  ).length;

  // Multi-step detection
  const multiStepIndicators = ['first', 'then', 'after', 'before', 'finally', 'step', 'phase', 'stage'];
  const hasMultiStep = multiStepIndicators.some(ind => text.toLowerCase().includes(ind));

  // Scoring
  let score = 0;
  score += Math.min(wordCount / 20, 2); // Up to 2 points for length
  score += intentCount * 0.5; // 0.5 points per intent
  score += technicalCount * 0.75; // 0.75 points per technical term
  score += hasMultiStep ? 1 : 0;

  if (score < 2) return 'simple';
  if (score < 4) return 'moderate';
  if (score < 7) return 'complex';
  return 'expert';
}

// ============================================
// MAIN INTENT RECOGNITION
// ============================================

export function recognizeIntent(text: string): IntentResult {
  const textLower = text.toLowerCase();
  const words = textLower.split(/\s+/);

  // Detect multi-intent
  const intentParts = splitMultiIntent(text);
  const isMultiIntent = intentParts.length > 1;

  // Score each intent category
  const scores: Map<string, { score: number; matches: string[] }> = new Map();

  for (const [intentName, config] of Object.entries(INTENT_TAXONOMY)) {
    let totalScore = 0;
    const matches: string[] = [];

    // Check indicators with fuzzy matching
    for (const indicator of config.indicators) {
      const { match, score } = fuzzyMatch(textLower, indicator, 0.8);
      if (match) {
        totalScore += score * config.weight;
        matches.push(indicator);
      }
    }

    // Semantic similarity boost
    for (const word of words) {
      const semanticScore = getSemanticSimilarity(word, config.semanticCategory);
      totalScore += semanticScore * 0.3;
    }

    if (totalScore > 0) {
      scores.set(intentName, { score: totalScore, matches });
    }
  }

  // Sort by score
  const sorted = Array.from(scores.entries())
    .sort((a, b) => b[1].score - a[1].score);

  // Extract primary and secondary intents
  const primary = sorted[0]?.[0] || 'unknown';
  const primaryScore = sorted[0]?.[1].score || 0;
  const secondary = sorted.slice(1, 4).map(([name]) => name);

  // Build individual intent results
  const intents: SingleIntent[] = [];
  for (const part of intentParts) {
    const partScores: [string, number, string[]][] = [];

    for (const [intentName, config] of Object.entries(INTENT_TAXONOMY)) {
      let score = 0;
      const keywords: string[] = [];

      for (const indicator of config.indicators) {
        if (part.toLowerCase().includes(indicator)) {
          score += config.weight;
          keywords.push(indicator);
        }
      }

      if (score > 0) {
        partScores.push([intentName, score, keywords]);
      }
    }

    partScores.sort((a, b) => b[1] - a[1]);
    if (partScores[0]) {
      const startIndex = text.toLowerCase().indexOf(part.toLowerCase());
      intents.push({
        intent: partScores[0][0],
        confidence: Math.min(partScores[0][1] / 3, 1),
        span: { start: startIndex, end: startIndex + part.length },
        keywords: partScores[0][2],
      });
    }
  }

  // Get semantic category and config
  const primaryConfig = INTENT_TAXONOMY[primary];
  const semanticCategory = primaryConfig?.semanticCategory || 'general';

  // Extract action and target
  const actionMatch = textLower.match(/^(\w+)\s+(?:a\s+)?(\w+)/);
  const action = actionMatch?.[1];
  const target = actionMatch?.[2];

  // Extract modifiers
  const modifierPatterns = [
    /quickly?/i, /fast/i, /simple/i, /complex/i, /secure/i, /scalable/i,
    /responsive/i, /modern/i, /clean/i, /efficient/i, /robust/i,
    /production[- ]ready/i, /enterprise/i, /minimal/i, /comprehensive/i
  ];

  const modifiers = modifierPatterns
    .filter(p => p.test(text))
    .map(p => text.match(p)?.[0]?.toLowerCase() || '')
    .filter(Boolean);

  // Calculate overall confidence
  const maxPossibleScore = Object.values(INTENT_TAXONOMY)
    .reduce((sum, c) => sum + c.indicators.length * c.weight, 0);
  const confidence = Math.min(primaryScore / 5, 0.99);

  // Assess complexity
  const complexity = assessComplexity(text, intents);

  // Generate suggested approach
  const suggestedApproach = generateApproachSuggestion(primary, complexity, modifiers);

  return {
    primary,
    secondary,
    confidence,
    subcategory: primaryConfig?.subcategories[0],
    action,
    target,
    modifiers,
    isMultiIntent,
    intents,
    semanticCategory,
    complexity,
    suggestedApproach,
  };
}

function generateApproachSuggestion(intent: string, complexity: string, modifiers: string[]): string {
  const approaches: Record<string, Record<string, string>> = {
    create: {
      simple: 'Quick scaffold with minimal configuration',
      moderate: 'Structured project with common patterns',
      complex: 'Full architecture with testing and documentation',
      expert: 'Enterprise-grade with microservices consideration',
    },
    fix: {
      simple: 'Direct fix with minimal changes',
      moderate: 'Fix with related cleanup',
      complex: 'Root cause analysis and systematic fix',
      expert: 'Comprehensive debugging with prevention measures',
    },
    optimize: {
      simple: 'Quick wins and low-hanging fruit',
      moderate: 'Profile and target bottlenecks',
      complex: 'Systematic optimization with benchmarks',
      expert: 'Full performance audit and architectural changes',
    },
    refactor: {
      simple: 'Clean up and organize',
      moderate: 'Extract patterns and improve structure',
      complex: 'Major restructuring with backward compatibility',
      expert: 'Complete rewrite with migration path',
    },
  };

  const intentApproaches = approaches[intent] || approaches.create;
  return intentApproaches[complexity] || 'Analyze and implement systematically';
}

// ============================================
// QUESTION DETECTION
// ============================================

export function isQuestion(text: string): { isQuestion: boolean; type: string; confidence: number } {
  const textLower = text.toLowerCase().trim();

  // Question word starters
  const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'whose', 'whom', 'can', 'could', 'would', 'should', 'is', 'are', 'do', 'does', 'did', 'will', 'have', 'has', 'had'];

  // Check for question mark
  const hasQuestionMark = text.includes('?');

  // Check for question word at start
  const startsWithQuestion = questionWords.some(w => textLower.startsWith(w + ' '));

  // Determine question type
  let type = 'statement';
  if (textLower.startsWith('what')) type = 'definition';
  else if (textLower.startsWith('how')) type = 'process';
  else if (textLower.startsWith('why')) type = 'reasoning';
  else if (textLower.startsWith('when') || textLower.startsWith('where')) type = 'context';
  else if (textLower.startsWith('can') || textLower.startsWith('could')) type = 'capability';
  else if (textLower.startsWith('should')) type = 'recommendation';
  else if (textLower.startsWith('is') || textLower.startsWith('are')) type = 'verification';

  const isQuestionResult = hasQuestionMark || startsWithQuestion;
  const confidence = hasQuestionMark ? 0.95 : (startsWithQuestion ? 0.85 : 0.2);

  return { isQuestion: isQuestionResult, type, confidence };
}

// ============================================
// ENTITY EXTRACTION (ENHANCED)
// ============================================

export interface ExtractedEntity {
  type: string;
  value: string;
  normalized: string;
  confidence: number;
  position: { start: number; end: number };
  metadata?: Record<string, any>;
}

const ENTITY_PATTERNS: Array<{
  type: string;
  patterns: RegExp[];
  normalizer?: (match: string) => string;
}> = [
  {
    type: 'programming_language',
    patterns: [
      /\b(javascript|typescript|python|java|c\+\+|c#|go|golang|rust|ruby|php|swift|kotlin|scala|haskell|elixir|clojure|r|matlab|perl|lua|dart|julia)\b/gi,
    ],
    normalizer: (m) => m.toLowerCase().replace('golang', 'go'),
  },
  {
    type: 'framework',
    patterns: [
      /\b(react|vue|angular|svelte|next\.?js|nuxt|gatsby|remix|express|fastify|koa|nest\.?js|django|flask|fastapi|spring|rails|laravel|asp\.net|gin|echo|fiber|actix|rocket)\b/gi,
    ],
    normalizer: (m) => m.toLowerCase().replace(/\.js$/i, ''),
  },
  {
    type: 'database',
    patterns: [
      /\b(postgresql?|mysql|mongodb|redis|sqlite|mariadb|oracle|mssql|sql\s*server|dynamodb|cassandra|couchdb|neo4j|elasticsearch|firestore|supabase|planetscale|neon)\b/gi,
    ],
    normalizer: (m) => m.toLowerCase().replace('postgres', 'postgresql'),
  },
  {
    type: 'cloud_service',
    patterns: [
      /\b(aws|amazon\s*web\s*services|gcp|google\s*cloud|azure|vercel|netlify|heroku|digitalocean|linode|cloudflare|fly\.io|render|railway)\b/gi,
    ],
  },
  {
    type: 'feature',
    patterns: [
      /\b(authentication|auth|login|signup|register|dashboard|admin|api|crud|search|filter|sort|pagination|upload|download|notification|chat|messaging|payment|checkout|cart|profile|settings|analytics|reports|export|import)\b/gi,
    ],
  },
  {
    type: 'component',
    patterns: [
      /\b(button|form|input|modal|dialog|dropdown|menu|navbar|sidebar|header|footer|table|list|card|grid|carousel|slider|tabs|accordion|tooltip|popover|toast|alert|badge|avatar|icon|image|video)\b/gi,
    ],
  },
  {
    type: 'file_type',
    patterns: [
      /\b(\w+\.(tsx?|jsx?|py|java|go|rs|rb|php|vue|svelte|css|scss|sass|less|html|json|ya?ml|md|sql|graphql))\b/gi,
      /\.(tsx?|jsx?|py|java|go|rs|rb|php|vue|svelte|css|scss|html|json|ya?ml|sql)\s+files?\b/gi,
    ],
  },
  {
    type: 'package',
    patterns: [
      /\b(axios|lodash|moment|dayjs|date-fns|uuid|zod|yup|joi|prisma|drizzle|sequelize|mongoose|typeorm|jest|vitest|mocha|chai|cypress|playwright|webpack|vite|rollup|esbuild|tailwind|bootstrap|mui|chakra|ant\s*design)\b/gi,
    ],
  },
  {
    type: 'architecture_pattern',
    patterns: [
      /\b(mvc|mvvm|microservices?|monolith|serverless|event[- ]driven|domain[- ]driven|clean\s*architecture|hexagonal|onion|cqrs|event\s*sourcing|saga|repository\s*pattern)\b/gi,
    ],
  },
  {
    type: 'number',
    patterns: [
      /\b(\d+(?:\.\d+)?)\s*(users?|items?|records?|rows?|pages?|requests?|seconds?|minutes?|hours?|days?|mb|gb|kb)\b/gi,
    ],
  },
  {
    type: 'url',
    patterns: [
      /(https?:\/\/[^\s]+)/gi,
      /\b(localhost:\d+)\b/gi,
    ],
  },
  {
    type: 'version',
    patterns: [
      /\bv?(\d+\.\d+(?:\.\d+)?(?:-\w+)?)\b/gi,
    ],
  },
];

export function extractEntitiesEnhanced(text: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];
  const seen = new Set<string>();

  for (const { type, patterns, normalizer } of ENTITY_PATTERNS) {
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match;

      while ((match = pattern.exec(text)) !== null) {
        const value = match[1] || match[0];
        const key = `${type}:${value.toLowerCase()}`;

        if (!seen.has(key)) {
          seen.add(key);
          entities.push({
            type,
            value,
            normalized: normalizer ? normalizer(value) : value.toLowerCase(),
            confidence: 0.9,
            position: { start: match.index, end: match.index + match[0].length },
          });
        }
      }
    }
  }

  return entities.sort((a, b) => a.position.start - b.position.start);
}

// ============================================
// FORMAT AS MARKDOWN
// ============================================

export function formatIntentAsMarkdown(result: IntentResult): string {
  const lines: string[] = [
    '## Intent Analysis',
    '',
    `**Primary Intent**: ${result.primary} (${Math.round(result.confidence * 100)}% confidence)`,
    `**Semantic Category**: ${result.semanticCategory}`,
    `**Complexity**: ${result.complexity}`,
    '',
  ];

  if (result.secondary.length > 0) {
    lines.push(`**Secondary Intents**: ${result.secondary.join(', ')}`);
  }

  if (result.action && result.target) {
    lines.push(`**Action**: ${result.action} → **Target**: ${result.target}`);
  }

  if (result.modifiers.length > 0) {
    lines.push(`**Modifiers**: ${result.modifiers.join(', ')}`);
  }

  lines.push('');

  if (result.isMultiIntent) {
    lines.push('### Multiple Intents Detected');
    for (const intent of result.intents) {
      lines.push(`- **${intent.intent}** (${Math.round(intent.confidence * 100)}%): ${intent.keywords.join(', ')}`);
    }
    lines.push('');
  }

  if (result.suggestedApproach) {
    lines.push(`### Suggested Approach`);
    lines.push(result.suggestedApproach);
  }

  return lines.join('\n');
}