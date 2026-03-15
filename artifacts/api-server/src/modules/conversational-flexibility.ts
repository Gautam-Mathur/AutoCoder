/**
 * Conversational Flexibility Module
 * Follow-up detection, pronoun resolution, context carryover
 */

// ============================================
// Conversation Context
// ============================================

export interface ConversationContext {
  lastTopic: string | null;
  lastAction: string | null;
  lastTarget: string | null;
  recentEntities: Map<string, string>; // pronoun -> actual entity
  recentCode: string | null;
  recentFile: string | null;
  turnCount: number;
  history: ConversationTurn[];
}

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  extractedEntities: string[];
}

// In-memory conversation contexts
const conversationContexts = new Map<string, ConversationContext>();

export function getConversationContext(conversationId: string): ConversationContext {
  if (!conversationContexts.has(conversationId)) {
    conversationContexts.set(conversationId, {
      lastTopic: null,
      lastAction: null,
      lastTarget: null,
      recentEntities: new Map(),
      recentCode: null,
      recentFile: null,
      turnCount: 0,
      history: [],
    });
  }
  return conversationContexts.get(conversationId)!;
}

// ============================================
// Follow-up Detection
// ============================================

export interface FollowUpAnalysis {
  isFollowUp: boolean;
  type: 'continuation' | 'modification' | 'clarification' | 'new-topic' | 'rejection' | 'confirmation';
  confidence: number;
  indicators: string[];
  resolvedPrompt: string;
}

const FOLLOW_UP_PATTERNS = {
  continuation: [
    /^(now|next|then|also|and)\b/i,
    /^(can you|could you) (also|additionally|now)/i,
    /^(add|include|put) (that|this|it)/i,
  ],
  modification: [
    /^(change|make|update) (it|that|this|the)/i,
    /^(instead|rather|but)/i,
    /^(more|less|bigger|smaller|darker|lighter)/i,
    /^(not that|no,? (I meant|I want))/i,
  ],
  clarification: [
    /^(what|which|how|where|when) (do you mean|did you mean|exactly)/i,
    /^(can you explain|I don't understand|what's)/i,
    /^(you mean|so it's|like this)/i,
  ],
  rejection: [
    /^(no|nope|wrong|that's not|not what I)/i,
    /^(undo|revert|go back|cancel)/i,
    /^(start over|from scratch|forget that)/i,
  ],
  confirmation: [
    /^(yes|yeah|yep|correct|right|exactly|perfect)/i,
    /^(that's (it|right|correct|good))/i,
    /^(looks? good|great|nice|awesome)/i,
  ],
};

// Pronouns and demonstratives that indicate follow-up
const REFERENTIAL_PATTERNS = [
  /\b(it|that|this|these|those|the same|them)\b/i,
  /\b(the button|the form|the component|the function|the file)\b/i,
  /\b(like (before|that|I said))\b/i,
];

export function detectFollowUp(
  currentPrompt: string,
  context: ConversationContext
): FollowUpAnalysis {
  const indicators: string[] = [];
  let type: FollowUpAnalysis['type'] = 'new-topic';
  let confidence = 0.3;

  // Check for explicit follow-up patterns
  for (const [patternType, patterns] of Object.entries(FOLLOW_UP_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(currentPrompt)) {
        type = patternType as FollowUpAnalysis['type'];
        confidence = 0.8;
        const match = currentPrompt.match(pattern);
        if (match) indicators.push(match[0]);
        break;
      }
    }
    if (confidence > 0.5) break;
  }

  // Check for referential language
  for (const pattern of REFERENTIAL_PATTERNS) {
    if (pattern.test(currentPrompt)) {
      if (type === 'new-topic') type = 'continuation';
      confidence = Math.max(confidence, 0.7);
      const match = currentPrompt.match(pattern);
      if (match) indicators.push(match[0]);
    }
  }

  // Check if prompt is short (likely follow-up)
  const wordCount = currentPrompt.split(/\s+/).length;
  if (wordCount < 5 && context.turnCount > 0) {
    confidence = Math.max(confidence, 0.6);
    indicators.push('short prompt');
  }

  // Resolve the prompt with context
  const resolvedPrompt = resolvePronouns(currentPrompt, context);

  return {
    isFollowUp: confidence > 0.5,
    type,
    confidence,
    indicators,
    resolvedPrompt,
  };
}

// ============================================
// Pronoun Resolution
// ============================================

const PRONOUN_MAPPINGS: Record<string, string> = {
  'it': 'TARGET',
  'that': 'TARGET',
  'this': 'TARGET',
  'them': 'TARGETS',
  'the button': 'COMPONENT:button',
  'the form': 'COMPONENT:form',
  'the modal': 'COMPONENT:modal',
  'the component': 'COMPONENT',
  'the function': 'FUNCTION',
  'the file': 'FILE',
  'the same': 'PREVIOUS',
};

export function resolvePronouns(prompt: string, context: ConversationContext): string {
  let resolved = prompt;

  // Resolve "it", "that", "this" to last target
  if (context.lastTarget) {
    resolved = resolved.replace(/\b(it|that|this)\b(?!\s+(is|was|looks))/gi, context.lastTarget);
  }

  // Resolve "the button", "the form", etc. to specific components
  for (const [pronoun, type] of Object.entries(PRONOUN_MAPPINGS)) {
    if (resolved.toLowerCase().includes(pronoun)) {
      const entity = context.recentEntities.get(type);
      if (entity) {
        resolved = resolved.replace(new RegExp(pronoun, 'gi'), entity);
      }
    }
  }

  // Resolve file references
  if (context.recentFile && /\b(the file|this file)\b/i.test(resolved)) {
    resolved = resolved.replace(/\b(the file|this file)\b/gi, context.recentFile);
  }

  return resolved;
}

// ============================================
// Context Carryover
// ============================================

export function updateContext(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
  extractedEntities: string[] = []
): void {
  const context = getConversationContext(conversationId);

  // Add to history
  context.history.push({
    role,
    content,
    timestamp: Date.now(),
    extractedEntities,
  });

  // Keep only last 10 turns
  if (context.history.length > 10) {
    context.history = context.history.slice(-10);
  }

  context.turnCount++;

  // Extract entities and update context
  if (role === 'user') {
    // Extract potential targets
    const targetMatch = content.match(/(?:the|a|an)\s+(\w+(?:\s+\w+)?)/i);
    if (targetMatch) {
      context.lastTarget = targetMatch[1];
    }

    // Extract file references
    const fileMatch = content.match(/[\w\-]+\.(js|ts|jsx|tsx|py|css|html|json)/i);
    if (fileMatch) {
      context.recentFile = fileMatch[0];
    }

    // Extract action
    const actionMatch = content.match(/^(add|create|make|build|fix|update|change|remove|delete|style)/i);
    if (actionMatch) {
      context.lastAction = actionMatch[1].toLowerCase();
    }

    // Update entity map
    for (const entity of extractedEntities) {
      const parts = entity.split(':');
      if (parts.length === 2) {
        context.recentEntities.set(parts[0], parts[1]);
      }
    }
  }

  // Extract code from assistant response
  if (role === 'assistant') {
    const codeMatch = content.match(/```[\w]*\n([\s\S]*?)```/);
    if (codeMatch) {
      context.recentCode = codeMatch[1];
    }

    // Extract topic from assistant response
    const topicMatch = content.match(/(?:created?|built?|added?|implemented?)\s+(?:a|an|the)\s+(\w+(?:\s+\w+)?)/i);
    if (topicMatch) {
      context.lastTopic = topicMatch[1];
    }
  }
}

// ============================================
// Smart Clarification
// ============================================

export interface ClarificationRequest {
  needed: boolean;
  questions: string[];
  suggestions: string[];
  ambiguities: string[];
}

export function generateClarification(
  prompt: string,
  context: ConversationContext
): ClarificationRequest {
  const ambiguities: string[] = [];
  const questions: string[] = [];
  const suggestions: string[] = [];

  // Check for vague size/color/style references
  if (/\b(bigger|smaller|larger|different)\b/i.test(prompt) && !context.lastTarget) {
    ambiguities.push('Reference to size without context');
    questions.push('What would you like me to make bigger/smaller?');
  }

  // Check for "it" without clear antecedent
  if (/\b(make it|change it|fix it)\b/i.test(prompt) && !context.lastTarget) {
    ambiguities.push('Pronoun "it" has no clear antecedent');
    questions.push('What specifically would you like me to change?');
  }

  // Check for incomplete feature requests
  if (/\badd\s+(a|an)?\s*$/i.test(prompt.trim())) {
    ambiguities.push('Incomplete request');
    questions.push('What would you like me to add?');
  }

  // Suggest based on context
  if (context.lastAction === 'add' && context.lastTarget) {
    suggestions.push(`Would you like me to style the ${context.lastTarget}?`);
    suggestions.push(`Should I add more features to the ${context.lastTarget}?`);
  }

  if (context.recentCode) {
    suggestions.push('I can explain how this code works');
    suggestions.push('I can add error handling');
    suggestions.push('I can add tests for this code');
  }

  return {
    needed: questions.length > 0,
    questions,
    suggestions,
    ambiguities,
  };
}

// ============================================
// Context-Aware Response Hints
// ============================================

export interface ResponseHint {
  tone: 'casual' | 'professional' | 'technical' | 'educational';
  verbosity: 'brief' | 'normal' | 'detailed';
  includeExamples: boolean;
  includeAlternatives: boolean;
  suggestedFormat: 'code-only' | 'explanation-first' | 'mixed';
}

export function getResponseHints(
  prompt: string,
  context: ConversationContext
): ResponseHint {
  const isQuestion = /\?$|^(what|why|how|when|where|which|can|could|would)\b/i.test(prompt);
  const wantsExplanation = /explain|how does|what is|why/i.test(prompt);
  const wantsQuick = /just|quick|simply|only/i.test(prompt);
  const wantsOptions = /options|alternatives|ways|different/i.test(prompt);

  // Check sentiment from recent history
  const recentFrustration = context.history
    .slice(-3)
    .some(h => /!{2,}|\?{2,}|doesn't work|still not|wrong/i.test(h.content));

  return {
    tone: recentFrustration ? 'professional' : isQuestion ? 'educational' : 'casual',
    verbosity: wantsQuick ? 'brief' : wantsExplanation ? 'detailed' : 'normal',
    includeExamples: !wantsQuick && (isQuestion || wantsExplanation),
    includeAlternatives: wantsOptions,
    suggestedFormat: wantsQuick ? 'code-only' : wantsExplanation ? 'explanation-first' : 'mixed',
  };
}

// ============================================
// Conversation Summary
// ============================================

export function summarizeConversation(conversationId: string): string {
  const context = getConversationContext(conversationId);

  if (context.history.length === 0) {
    return 'New conversation with no history.';
  }

  const topics = context.history
    .filter(h => h.extractedEntities.length > 0)
    .flatMap(h => h.extractedEntities)
    .slice(-5);

  const summary = [
    `Conversation with ${context.turnCount} turns.`,
    context.lastTopic ? `Currently discussing: ${context.lastTopic}.` : '',
    context.lastAction ? `Last action: ${context.lastAction}.` : '',
    topics.length > 0 ? `Topics covered: ${Array.from(new Set(topics)).join(', ')}.` : '',
    context.recentFile ? `Working on file: ${context.recentFile}.` : '',
  ].filter(Boolean).join(' ');

  return summary;
}

export function formatConversationContextAsMarkdown(conversationId: string): string {
  const context = getConversationContext(conversationId);

  return `## Conversation Context

**Turns**: ${context.turnCount}
**Last Topic**: ${context.lastTopic || 'None'}
**Last Action**: ${context.lastAction || 'None'}
**Last Target**: ${context.lastTarget || 'None'}
**Current File**: ${context.recentFile || 'None'}

### Recent Entities
${Array.from(context.recentEntities.entries()).map(([k, v]) => `- ${k}: ${v}`).join('\n') || 'None'}

### History Summary
${context.history.slice(-5).map(h => `- **${h.role}**: ${h.content.slice(0, 100)}...`).join('\n') || 'No history'}
`;
}
