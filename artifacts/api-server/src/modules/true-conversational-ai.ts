/**
 * True Conversational AI System
 * Claude-level semantic memory, topic tracking, coreference resolution,
 * and personality consistency
 */

// ============================================
// TYPES AND INTERFACES
// ============================================

export interface ConversationState {
  id: string;
  userId?: string;
  turns: ConversationTurn[];
  memory: SemanticMemory;
  topics: TopicTracker;
  entities: EntityTracker;
  personality: PersonalityState;
  context: ConversationContext;
  lastUpdated: number;
}

export interface ConversationTurn {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  intent?: string;
  entities?: ExtractedEntity[];
  sentiment?: number;
  topics?: string[];
}

export interface SemanticMemory {
  shortTerm: MemoryItem[];
  longTerm: MemoryItem[];
  facts: FactItem[];
  preferences: PreferenceItem[];
  codeContext: CodeContextItem[];
}

export interface MemoryItem {
  id: string;
  content: string;
  type: 'statement' | 'question' | 'code' | 'error' | 'decision';
  importance: number;
  timestamp: number;
  references: string[];
  embeddings?: number[];
}

export interface FactItem {
  subject: string;
  predicate: string;
  object: string;
  confidence: number;
  source: string;
  timestamp: number;
}

export interface PreferenceItem {
  category: string;
  preference: string;
  value: any;
  confidence: number;
  occurrences: number;
}

export interface CodeContextItem {
  file?: string;
  language?: string;
  snippet: string;
  purpose: string;
  timestamp: number;
}

export interface TopicTracker {
  currentTopic: string;
  topicHistory: TopicTransition[];
  topicKeywords: Record<string, string[]>;
  topicSentiment: Record<string, number>;
}

export interface TopicTransition {
  from: string;
  to: string;
  timestamp: number;
  trigger: string;
}

export interface EntityTracker {
  entities: TrackedEntity[];
  references: ReferenceChain[];
  pronouns: PronounResolution[];
}

export interface TrackedEntity {
  id: string;
  name: string;
  type: string;
  aliases: string[];
  mentions: number[];
  attributes: Record<string, any>;
  lastMention: number;
}

export interface ReferenceChain {
  pronoun: string;
  resolvedTo: string;
  turnIndex: number;
  confidence: number;
}

export interface PronounResolution {
  pronoun: string;
  candidates: string[];
  resolved: string;
  confidence: number;
}

export interface PersonalityState {
  tone: 'helpful' | 'technical' | 'casual' | 'formal';
  verbosity: 'concise' | 'detailed' | 'balanced';
  codeStyle: 'minimal' | 'documented' | 'verbose';
  adaptations: string[];
}

export interface ConversationContext {
  projectType?: string;
  currentFile?: string;
  currentLanguage?: string;
  activeError?: string;
  recentFiles: string[];
  recentActions: string[];
}

export interface ExtractedEntity {
  text: string;
  type: string;
  normalized: string;
  position: { start: number; end: number };
}

// ============================================
// CONVERSATION STATE MANAGEMENT
// ============================================

const conversationStates = new Map<string, ConversationState>();

export function createConversation(id: string, userId?: string): ConversationState {
  const state: ConversationState = {
    id,
    userId,
    turns: [],
    memory: {
      shortTerm: [],
      longTerm: [],
      facts: [],
      preferences: [],
      codeContext: [],
    },
    topics: {
      currentTopic: 'general',
      topicHistory: [],
      topicKeywords: {},
      topicSentiment: {},
    },
    entities: {
      entities: [],
      references: [],
      pronouns: [],
    },
    personality: {
      tone: 'helpful',
      verbosity: 'balanced',
      codeStyle: 'documented',
      adaptations: [],
    },
    context: {
      recentFiles: [],
      recentActions: [],
    },
    lastUpdated: Date.now(),
  };

  conversationStates.set(id, state);
  return state;
}

export function getConversation(id: string): ConversationState | null {
  return conversationStates.get(id) || null;
}

// ============================================
// SEMANTIC MEMORY SYSTEM
// ============================================

export function addToMemory(
  conversationId: string,
  content: string,
  type: MemoryItem['type'],
  importance = 0.5
): void {
  const state = conversationStates.get(conversationId);
  if (!state) return;

  const item: MemoryItem = {
    id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    content,
    type,
    importance,
    timestamp: Date.now(),
    references: [],
  };

  // Add to short-term memory
  state.memory.shortTerm.push(item);

  // Keep short-term memory bounded
  if (state.memory.shortTerm.length > 20) {
    // Move important items to long-term
    const toPromote = state.memory.shortTerm
      .filter(m => m.importance > 0.7)
      .slice(0, 5);

    state.memory.longTerm.push(...toPromote);
    state.memory.shortTerm = state.memory.shortTerm.slice(-15);
  }

  state.lastUpdated = Date.now();
}

export function extractFacts(text: string): FactItem[] {
  const facts: FactItem[] = [];
  const patterns = [
    // "X is Y" patterns
    { regex: /(\w+(?:\s+\w+)?)\s+is\s+(?:a|an|the)?\s*(\w+(?:\s+\w+)?)/gi, pred: 'is' },
    // "X uses Y" patterns
    { regex: /(?:I|we|the project)\s+use[sd]?\s+(\w+)/gi, pred: 'uses' },
    // "X prefers Y" patterns
    { regex: /(?:I|we)\s+prefer\s+(\w+)/gi, pred: 'prefers' },
    // "X wants Y" patterns
    { regex: /(?:I|we)\s+want\s+(?:to\s+)?(\w+(?:\s+\w+)?)/gi, pred: 'wants' },
    // "X is called Y" patterns
    { regex: /(?:the|my|our)\s+(\w+)\s+is\s+called\s+(\w+)/gi, pred: 'named' },
  ];

  for (const { regex, pred } of patterns) {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      facts.push({
        subject: match[1]?.toLowerCase() || 'unknown',
        predicate: pred,
        object: match[2]?.toLowerCase() || match[1]?.toLowerCase() || 'unknown',
        confidence: 0.7,
        source: 'extraction',
        timestamp: Date.now(),
      });
    }
  }

  return facts;
}

export function learnPreferences(conversationId: string, text: string): void {
  const state = conversationStates.get(conversationId);
  if (!state) return;

  // Detect code style preferences
  if (text.includes('typescript') || text.includes('type safety')) {
    updatePreference(state, 'language', 'typescript', true);
  }
  if (text.includes('simple') || text.includes('minimal')) {
    updatePreference(state, 'complexity', 'minimal', true);
  }
  if (text.includes('detailed') || text.includes('verbose') || text.includes('comments')) {
    updatePreference(state, 'documentation', 'verbose', true);
  }

  // Detect framework preferences
  const frameworks = ['react', 'vue', 'angular', 'svelte', 'express', 'fastapi', 'django'];
  for (const fw of frameworks) {
    if (text.toLowerCase().includes(fw)) {
      updatePreference(state, 'framework', fw, true);
    }
  }

  // Detect tone preferences
  if (text.includes('explain') || text.includes('help me understand')) {
    state.personality.verbosity = 'detailed';
  }
  if (text.includes('just') || text.includes('quickly') || text.includes('tldr')) {
    state.personality.verbosity = 'concise';
  }
}

function updatePreference(state: ConversationState, category: string, value: any, positive: boolean): void {
  const existing = state.memory.preferences.find(
    p => p.category === category && p.preference === value
  );

  if (existing) {
    existing.occurrences++;
    existing.confidence = Math.min(existing.confidence + 0.1, 1);
  } else {
    state.memory.preferences.push({
      category,
      preference: value,
      value: positive,
      confidence: 0.5,
      occurrences: 1,
    });
  }
}

// ============================================
// TOPIC TRACKING
// ============================================

const TOPIC_PATTERNS: Record<string, RegExp[]> = {
  'code-generation': [/create|build|generate|make|implement|write.*code/i],
  'debugging': [/fix|error|bug|issue|problem|broken|not working|crash/i],
  'explanation': [/explain|how does|what is|why|understand|clarify/i],
  'refactoring': [/refactor|improve|optimize|clean|restructure/i],
  'testing': [/test|spec|coverage|unit test|integration/i],
  'deployment': [/deploy|publish|host|production|live/i],
  'styling': [/style|css|design|ui|ux|look|appearance|color/i],
  'database': [/database|db|query|sql|schema|migration|table/i],
  'authentication': [/auth|login|signup|session|jwt|oauth/i],
  'api': [/api|endpoint|route|rest|graphql|fetch|request/i],
  'configuration': [/config|setup|environment|settings|install/i],
  'documentation': [/document|readme|comment|docs|jsdoc/i],
};

export function detectTopic(text: string): string {
  const textLower = text.toLowerCase();

  for (const [topic, patterns] of Object.entries(TOPIC_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(textLower)) {
        return topic;
      }
    }
  }

  return 'general';
}

export function updateTopic(conversationId: string, newTopic: string, trigger: string): void {
  const state = conversationStates.get(conversationId);
  if (!state) return;

  if (state.topics.currentTopic !== newTopic) {
    state.topics.topicHistory.push({
      from: state.topics.currentTopic,
      to: newTopic,
      timestamp: Date.now(),
      trigger,
    });

    state.topics.currentTopic = newTopic;
  }

  // Track topic keywords
  const words = trigger.toLowerCase().split(/\W+/).filter(w => w.length > 3);
  if (!state.topics.topicKeywords[newTopic]) {
    state.topics.topicKeywords[newTopic] = [];
  }
  state.topics.topicKeywords[newTopic].push(...words);

  // Keep unique and limit
  state.topics.topicKeywords[newTopic] = Array.from(new Set(state.topics.topicKeywords[newTopic])).slice(-50);
}

// ============================================
// COREFERENCE RESOLUTION
// ============================================

const PRONOUNS: Record<string, { type: string; number: 'singular' | 'plural' }> = {
  'it': { type: 'thing', number: 'singular' },
  'its': { type: 'thing', number: 'singular' },
  'this': { type: 'thing', number: 'singular' },
  'that': { type: 'thing', number: 'singular' },
  'they': { type: 'thing', number: 'plural' },
  'them': { type: 'thing', number: 'plural' },
  'their': { type: 'thing', number: 'plural' },
  'these': { type: 'thing', number: 'plural' },
  'those': { type: 'thing', number: 'plural' },
  'he': { type: 'person', number: 'singular' },
  'him': { type: 'person', number: 'singular' },
  'his': { type: 'person', number: 'singular' },
  'she': { type: 'person', number: 'singular' },
  'her': { type: 'person', number: 'singular' },
  'hers': { type: 'person', number: 'singular' },
};

export function resolveReferences(conversationId: string, text: string): Map<string, string> {
  const state = conversationStates.get(conversationId);
  if (!state) return new Map();

  const resolutions = new Map<string, string>();

  // Find pronouns in text
  const words = text.toLowerCase().split(/\W+/);

  for (const word of words) {
    if (PRONOUNS[word]) {
      const resolved = findReferent(state, word, PRONOUNS[word]);
      if (resolved) {
        resolutions.set(word, resolved);

        state.entities.pronouns.push({
          pronoun: word,
          candidates: state.entities.entities.map(e => e.name),
          resolved,
          confidence: 0.8,
        });
      }
    }
  }

  return resolutions;
}

function findReferent(
  state: ConversationState,
  pronoun: string,
  info: { type: string; number: 'singular' | 'plural' }
): string | null {
  // Get recent entities
  const recentEntities = state.entities.entities
    .sort((a, b) => b.lastMention - a.lastMention)
    .slice(0, 10);

  // Filter by type compatibility
  const compatible = recentEntities.filter(e => {
    if (info.type === 'person') {
      return e.type === 'person' || e.type === 'user';
    }
    return true;
  });

  // "it/this" usually refers to most recent singular entity
  if (info.number === 'singular' && compatible.length > 0) {
    return compatible[0].name;
  }

  // "they/these" might refer to a collection
  if (info.number === 'plural') {
    const pluralEntity = compatible.find(e =>
      e.name.endsWith('s') || e.type === 'collection'
    );
    if (pluralEntity) return pluralEntity.name;
  }

  // Fall back to code context
  if (state.context.currentFile) {
    return state.context.currentFile;
  }

  return compatible[0]?.name || null;
}

export function trackEntity(conversationId: string, entity: ExtractedEntity, turnIndex: number): void {
  const state = conversationStates.get(conversationId);
  if (!state) return;

  const existing = state.entities.entities.find(
    e => e.name.toLowerCase() === entity.normalized.toLowerCase() ||
         e.aliases.includes(entity.normalized.toLowerCase())
  );

  if (existing) {
    existing.mentions.push(turnIndex);
    existing.lastMention = turnIndex;
  } else {
    state.entities.entities.push({
      id: `entity-${Date.now()}`,
      name: entity.normalized,
      type: entity.type,
      aliases: [entity.text.toLowerCase()],
      mentions: [turnIndex],
      attributes: {},
      lastMention: turnIndex,
    });
  }
}

// ============================================
// FOLLOW-UP DETECTION
// ============================================

export function isFollowUp(conversationId: string, text: string): { isFollowUp: boolean; context: string } {
  const state = conversationStates.get(conversationId);
  if (!state || state.turns.length === 0) {
    return { isFollowUp: false, context: '' };
  }

  const textLower = text.toLowerCase();

  // Check for explicit follow-up indicators
  const followUpIndicators = [
    'also', 'and also', 'additionally', 'furthermore',
    'what about', 'how about', 'can you also',
    'one more thing', 'another thing',
    'following up', 'related to',
  ];

  for (const indicator of followUpIndicators) {
    if (textLower.includes(indicator)) {
      return { isFollowUp: true, context: getRecentContext(state) };
    }
  }

  // Check for pronouns referring to previous context
  const hasReferentialPronouns = ['it', 'this', 'that', 'they', 'them'].some(
    p => new RegExp(`\\b${p}\\b`, 'i').test(text)
  );

  if (hasReferentialPronouns) {
    return { isFollowUp: true, context: getRecentContext(state) };
  }

  // Check for short, contextual messages
  if (text.split(/\s+/).length < 5 && state.turns.length > 0) {
    return { isFollowUp: true, context: getRecentContext(state) };
  }

  return { isFollowUp: false, context: '' };
}

function getRecentContext(state: ConversationState): string {
  const recentTurns = state.turns.slice(-4);
  const context: string[] = [];

  for (const turn of recentTurns) {
    if (turn.role === 'user') {
      context.push(`User: ${turn.content.substring(0, 100)}`);
    } else if (turn.role === 'assistant') {
      context.push(`Assistant: ${turn.content.substring(0, 100)}`);
    }
  }

  return context.join('\n');
}

// ============================================
// PERSONALITY ADAPTATION
// ============================================

export function adaptPersonality(conversationId: string, text: string): void {
  const state = conversationStates.get(conversationId);
  if (!state) return;

  const textLower = text.toLowerCase();

  // Detect formality level
  if (textLower.includes('please') || textLower.includes('could you') || textLower.includes('would you')) {
    if (!state.personality.adaptations.includes('formal')) {
      state.personality.tone = 'formal';
      state.personality.adaptations.push('formal');
    }
  }

  if (textLower.includes('lol') || textLower.includes('haha') || textLower.includes('cool')) {
    if (!state.personality.adaptations.includes('casual')) {
      state.personality.tone = 'casual';
      state.personality.adaptations.push('casual');
    }
  }

  // Detect expertise level
  const technicalTerms = ['async', 'middleware', 'polymorphism', 'dependency injection', 'kubernetes'];
  const technicalCount = technicalTerms.filter(t => textLower.includes(t)).length;

  if (technicalCount >= 2) {
    state.personality.tone = 'technical';
    state.personality.codeStyle = 'minimal';
  }

  // Detect verbosity preference
  if (textLower.includes('explain') || textLower.includes('why') || textLower.includes('how does')) {
    state.personality.verbosity = 'detailed';
  }

  if (textLower.includes('just') || textLower.includes('quickly') || textLower.includes('briefly')) {
    state.personality.verbosity = 'concise';
  }
}

// ============================================
// SENTIMENT ANALYSIS
// ============================================

const SENTIMENT_WORDS = {
  positive: ['great', 'thanks', 'awesome', 'perfect', 'love', 'excellent', 'amazing', 'helpful', 'works', 'nice', 'good', 'yes', 'correct', 'right'],
  negative: ['bad', 'wrong', 'error', 'fail', 'broken', 'issue', 'problem', 'hate', 'terrible', 'frustrated', 'annoying', 'stuck', 'confused', 'not working'],
};

export function analyzeSentiment(text: string): number {
  const words = text.toLowerCase().split(/\W+/);
  let score = 0;

  for (const word of words) {
    if (SENTIMENT_WORDS.positive.includes(word)) score += 0.1;
    if (SENTIMENT_WORDS.negative.includes(word)) score -= 0.1;
  }

  // Clamp between -1 and 1
  return Math.max(-1, Math.min(1, score));
}

// ============================================
// MAIN CONVERSATION PROCESSING
// ============================================

export function processTurn(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string
): ConversationTurn {
  let state = conversationStates.get(conversationId);
  if (!state) {
    state = createConversation(conversationId);
  }

  const turnIndex = state.turns.length;

  // Detect topic
  const topic = detectTopic(content);
  updateTopic(conversationId, topic, content);

  // Analyze sentiment
  const sentiment = analyzeSentiment(content);

  // Extract entities
  const entities = extractEntitiesFromText(content);
  for (const entity of entities) {
    trackEntity(conversationId, entity, turnIndex);
  }

  // Learn preferences
  learnPreferences(conversationId, content);

  // Adapt personality
  if (role === 'user') {
    adaptPersonality(conversationId, content);
  }

  // Resolve references
  resolveReferences(conversationId, content);

  // Extract and store facts
  const facts = extractFacts(content);
  state.memory.facts.push(...facts);

  // Add to memory
  addToMemory(conversationId, content, detectMemoryType(content));

  // Create turn
  const turn: ConversationTurn = {
    id: `turn-${Date.now()}`,
    role,
    content,
    timestamp: Date.now(),
    intent: detectIntent(content),
    entities,
    sentiment,
    topics: [topic],
  };

  state.turns.push(turn);
  state.lastUpdated = Date.now();

  return turn;
}

function extractEntitiesFromText(text: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];

  // Programming languages
  const langPattern = /\b(javascript|typescript|python|java|go|rust|ruby|php|swift|kotlin)\b/gi;
  let match;
  while ((match = langPattern.exec(text)) !== null) {
    entities.push({
      text: match[0],
      type: 'programming_language',
      normalized: match[0].toLowerCase(),
      position: { start: match.index, end: match.index + match[0].length },
    });
  }

  // Frameworks
  const fwPattern = /\b(react|vue|angular|svelte|express|fastapi|django|flask|spring|rails)\b/gi;
  while ((match = fwPattern.exec(text)) !== null) {
    entities.push({
      text: match[0],
      type: 'framework',
      normalized: match[0].toLowerCase(),
      position: { start: match.index, end: match.index + match[0].length },
    });
  }

  // File paths
  const filePattern = /[\w\/.-]+\.(tsx?|jsx?|py|go|rs|java|json|yaml|md)/gi;
  while ((match = filePattern.exec(text)) !== null) {
    entities.push({
      text: match[0],
      type: 'file',
      normalized: match[0],
      position: { start: match.index, end: match.index + match[0].length },
    });
  }

  return entities;
}

function detectMemoryType(content: string): MemoryItem['type'] {
  if (content.includes('?')) return 'question';
  if (content.includes('```') || content.includes('function') || content.includes('const ')) return 'code';
  if (content.includes('error') || content.includes('Error')) return 'error';
  if (content.includes('decided') || content.includes('let\'s') || content.includes('we should')) return 'decision';
  return 'statement';
}

function detectIntent(content: string): string {
  const contentLower = content.toLowerCase();

  if (contentLower.includes('create') || contentLower.includes('build') || contentLower.includes('make')) {
    return 'create';
  }
  if (contentLower.includes('fix') || contentLower.includes('error') || contentLower.includes('bug')) {
    return 'debug';
  }
  if (contentLower.includes('explain') || contentLower.includes('what') || contentLower.includes('how')) {
    return 'explain';
  }
  if (contentLower.includes('change') || contentLower.includes('modify') || contentLower.includes('update')) {
    return 'modify';
  }

  return 'general';
}

// ============================================
// CONTEXT RETRIEVAL
// ============================================

export function getRelevantMemory(conversationId: string, query: string): MemoryItem[] {
  const state = conversationStates.get(conversationId);
  if (!state) return [];

  const queryWords = query.toLowerCase().split(/\W+/);

  // Score all memory items
  const scored = [...state.memory.shortTerm, ...state.memory.longTerm].map(item => {
    let score = item.importance;

    const itemWords = item.content.toLowerCase().split(/\W+/);
    for (const qw of queryWords) {
      if (itemWords.includes(qw)) {
        score += 0.1;
      }
    }

    // Recency bonus
    const ageMinutes = (Date.now() - item.timestamp) / 60000;
    if (ageMinutes < 5) score += 0.2;
    else if (ageMinutes < 30) score += 0.1;

    return { item, score };
  });

  // Return top relevant items
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(s => s.item);
}

export function getConversationSummary(conversationId: string): string {
  const state = conversationStates.get(conversationId);
  if (!state) return 'No conversation found.';

  const lines = [
    `## Conversation Summary`,
    '',
    `**Turns**: ${state.turns.length}`,
    `**Current Topic**: ${state.topics.currentTopic}`,
    `**Personality**: ${state.personality.tone} / ${state.personality.verbosity}`,
    '',
  ];

  if (state.memory.preferences.length > 0) {
    lines.push('### Preferences');
    for (const pref of state.memory.preferences.slice(0, 5)) {
      lines.push(`- ${pref.category}: ${pref.preference} (${Math.round(pref.confidence * 100)}%)`);
    }
    lines.push('');
  }

  if (state.entities.entities.length > 0) {
    lines.push('### Key Entities');
    for (const entity of state.entities.entities.slice(0, 10)) {
      lines.push(`- **${entity.name}** (${entity.type}): ${entity.mentions.length} mentions`);
    }
    lines.push('');
  }

  if (state.topics.topicHistory.length > 0) {
    lines.push('### Topic History');
    for (const transition of state.topics.topicHistory.slice(-5)) {
      lines.push(`- ${transition.from} → ${transition.to}`);
    }
  }

  return lines.join('\n');
}

// ============================================
// RESPONSE GENERATION HINTS
// ============================================

export function getResponseHints(conversationId: string, query: string): {
  tone: string;
  verbosity: string;
  codeStyle: string;
  relevantContext: string[];
  suggestedApproach: string;
} {
  const state = conversationStates.get(conversationId);
  if (!state) {
    return {
      tone: 'helpful',
      verbosity: 'balanced',
      codeStyle: 'documented',
      relevantContext: [],
      suggestedApproach: 'Provide a helpful response',
    };
  }

  const relevantMemory = getRelevantMemory(conversationId, query);
  const followUpResult = isFollowUp(conversationId, query);

  const relevantContext: string[] = [];
  if (followUpResult.isFollowUp && followUpResult.context) {
    relevantContext.push(`[Follow-up context]: ${followUpResult.context.substring(0, 200)}`);
  }
  for (const mem of relevantMemory.slice(0, 3)) {
    relevantContext.push(mem.content.substring(0, 100));
  }

  let suggestedApproach = 'Provide a helpful response';

  const topic = detectTopic(query);
  if (topic === 'code-generation') {
    suggestedApproach = 'Generate code based on requirements';
  } else if (topic === 'debugging') {
    suggestedApproach = 'Analyze the error and provide fixes';
  } else if (topic === 'explanation') {
    suggestedApproach = 'Explain clearly with examples';
  }

  return {
    tone: state.personality.tone,
    verbosity: state.personality.verbosity,
    codeStyle: state.personality.codeStyle,
    relevantContext,
    suggestedApproach,
  };
}
