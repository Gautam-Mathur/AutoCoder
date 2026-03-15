/**
 * Context Window Manager
 * Claude-level context handling with chunking, summarization,
 * and conversation compression (simulates 100K+ tokens)
 */

// ============================================
// TYPES AND INTERFACES
// ============================================

export interface ContextChunk {
  id: string;
  type: 'code' | 'conversation' | 'documentation' | 'error' | 'system';
  content: string;
  tokens: number;
  importance: number;
  timestamp: number;
  summary?: string;
  metadata?: Record<string, any>;
}

export interface ContextWindow {
  id: string;
  chunks: ContextChunk[];
  totalTokens: number;
  maxTokens: number;
  compressionLevel: number;
  summaries: ContextSummary[];
}

export interface ContextSummary {
  id: string;
  originalChunkIds: string[];
  summary: string;
  tokens: number;
  compressionRatio: number;
  topics: string[];
}

export interface ConversationTurn {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  tokens: number;
  entities?: string[];
  intent?: string;
}

export interface CompressedConversation {
  turns: ConversationTurn[];
  summaries: string[];
  totalOriginalTokens: number;
  totalCompressedTokens: number;
  compressionRatio: number;
  keyTopics: string[];
  keyEntities: string[];
}

// ============================================
// TOKEN ESTIMATION
// ============================================

export function estimateTokens(text: string): number {
  // GPT-4 style: ~4 chars per token for English
  // Adjust for code which tends to be denser
  const isCode = /^[\s]*(?:function|const|let|var|class|def|fn|impl|public|private)/.test(text) ||
                 text.includes('{') && text.includes('}');

  const charPerToken = isCode ? 3.5 : 4;
  return Math.ceil(text.length / charPerToken);
}

export function countTokens(chunks: ContextChunk[]): number {
  return chunks.reduce((sum, chunk) => sum + chunk.tokens, 0);
}

// ============================================
// CONTEXT WINDOW MANAGEMENT
// ============================================

const contextWindows = new Map<string, ContextWindow>();

export function createContextWindow(id: string, maxTokens = 100000): ContextWindow {
  const window: ContextWindow = {
    id,
    chunks: [],
    totalTokens: 0,
    maxTokens,
    compressionLevel: 0,
    summaries: [],
  };

  contextWindows.set(id, window);
  return window;
}

export function getContextWindow(id: string): ContextWindow | null {
  return contextWindows.get(id) || null;
}

export function addChunk(windowId: string, chunk: Omit<ContextChunk, 'id' | 'tokens'>): ContextWindow | null {
  const window = contextWindows.get(windowId);
  if (!window) return null;

  const fullChunk: ContextChunk = {
    ...chunk,
    id: `chunk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tokens: estimateTokens(chunk.content),
  };

  window.chunks.push(fullChunk);
  window.totalTokens += fullChunk.tokens;

  // Check if compression needed
  if (window.totalTokens > window.maxTokens * 0.9) {
    compressWindow(windowId);
  }

  return window;
}

// ============================================
// COMPRESSION STRATEGIES
// ============================================

export function compressWindow(windowId: string): ContextWindow | null {
  const window = contextWindows.get(windowId);
  if (!window) return null;

  window.compressionLevel++;

  // Strategy 1: Summarize old chunks
  const oldChunks = window.chunks.filter(c =>
    Date.now() - c.timestamp > 5 * 60 * 1000 && // Older than 5 minutes
    c.importance < 0.7
  );

  if (oldChunks.length > 3) {
    const summary = summarizeChunks(oldChunks);
    window.summaries.push(summary);

    // Remove summarized chunks
    const summarizedIds = new Set(summary.originalChunkIds);
    window.chunks = window.chunks.filter(c => !summarizedIds.has(c.id));

    // Add summary as a new chunk
    window.chunks.push({
      id: summary.id,
      type: 'system',
      content: summary.summary,
      tokens: summary.tokens,
      importance: 0.8,
      timestamp: Date.now(),
      summary: 'Compressed context',
    });
  }

  // Strategy 2: Reduce detail in code chunks
  window.chunks = window.chunks.map(chunk => {
    if (chunk.type === 'code' && chunk.tokens > 500) {
      const compressed = compressCode(chunk.content);
      return {
        ...chunk,
        content: compressed,
        tokens: estimateTokens(compressed),
        summary: 'Code (compressed)',
      };
    }
    return chunk;
  });

  // Recalculate total tokens
  window.totalTokens = countTokens(window.chunks);

  return window;
}

function summarizeChunks(chunks: ContextChunk[]): ContextSummary {
  // Extract key information from chunks
  const topics: string[] = [];
  const keyPoints: string[] = [];

  for (const chunk of chunks) {
    // Extract topics from content
    const words = chunk.content.toLowerCase().split(/\W+/);
    const topicWords = words.filter(w => w.length > 4 && !STOP_WORDS.has(w));
    topics.push(...topicWords.slice(0, 5));

    // Extract first meaningful sentence
    const sentences = chunk.content.split(/[.!?]\s/);
    if (sentences[0] && sentences[0].length < 200) {
      keyPoints.push(sentences[0]);
    }
  }

  // Build summary
  const uniqueTopics = [...new Set(topics)].slice(0, 10);
  const summary = `[Context Summary] Topics: ${uniqueTopics.join(', ')}. ` +
                  `Key points: ${keyPoints.slice(0, 3).join('; ')}`;

  const originalTokens = chunks.reduce((sum, c) => sum + c.tokens, 0);
  const summaryTokens = estimateTokens(summary);

  return {
    id: `summary-${Date.now()}`,
    originalChunkIds: chunks.map(c => c.id),
    summary,
    tokens: summaryTokens,
    compressionRatio: originalTokens / summaryTokens,
    topics: uniqueTopics,
  };
}

function compressCode(code: string): string {
  const lines = code.split('\n');
  const result: string[] = [];

  let inFunction = false;
  let braceDepth = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Keep important lines
    if (trimmed.startsWith('import ') ||
        trimmed.startsWith('export ') ||
        trimmed.startsWith('const ') ||
        trimmed.startsWith('function ') ||
        trimmed.startsWith('class ') ||
        trimmed.startsWith('interface ') ||
        trimmed.startsWith('type ') ||
        trimmed.startsWith('def ') ||
        trimmed.startsWith('fn ')) {
      result.push(line);
      inFunction = trimmed.includes('{') || trimmed.endsWith(':');
      if (trimmed.includes('{')) braceDepth++;
    } else if (braceDepth === 0 && trimmed.length > 0) {
      result.push(line);
    } else if (trimmed === '}') {
      braceDepth--;
      if (braceDepth === 0) {
        result.push(line);
      }
    } else if (inFunction && braceDepth <= 1) {
      // Keep first-level statements in functions
      if (trimmed.startsWith('return ') ||
          trimmed.startsWith('if ') ||
          trimmed.startsWith('for ') ||
          trimmed.startsWith('try ')) {
        result.push('  // ... ' + trimmed.substring(0, 30));
      }
    }

    if (trimmed.includes('{')) braceDepth++;
    if (trimmed.includes('}')) braceDepth = Math.max(0, braceDepth - 1);
  }

  return result.join('\n');
}

// ============================================
// CONVERSATION COMPRESSION
// ============================================

export function compressConversation(turns: ConversationTurn[]): CompressedConversation {
  const keyTopics: string[] = [];
  const keyEntities: string[] = [];
  const summaries: string[] = [];

  let totalOriginalTokens = 0;
  const compressedTurns: ConversationTurn[] = [];

  // Keep last 5 turns fully
  const recentTurns = turns.slice(-5);
  const oldTurns = turns.slice(0, -5);

  // Summarize old turns in batches
  const batchSize = 5;
  for (let i = 0; i < oldTurns.length; i += batchSize) {
    const batch = oldTurns.slice(i, i + batchSize);
    const batchTokens = batch.reduce((sum, t) => sum + t.tokens, 0);
    totalOriginalTokens += batchTokens;

    // Extract info from batch
    for (const turn of batch) {
      if (turn.entities) keyEntities.push(...turn.entities);
      if (turn.intent) keyTopics.push(turn.intent);

      // Extract important words
      const words = turn.content.toLowerCase().split(/\W+/);
      keyTopics.push(...words.filter(w => w.length > 5 && !STOP_WORDS.has(w)).slice(0, 3));
    }

    // Create batch summary
    const summary = summarizeTurnBatch(batch);
    summaries.push(summary);

    // Add compressed turn
    compressedTurns.push({
      role: 'system',
      content: `[Previous context]: ${summary}`,
      timestamp: batch[0].timestamp,
      tokens: estimateTokens(summary),
    });
  }

  // Add recent turns uncompressed
  for (const turn of recentTurns) {
    totalOriginalTokens += turn.tokens;
    compressedTurns.push(turn);
  }

  const totalCompressedTokens = compressedTurns.reduce((sum, t) => sum + t.tokens, 0);

  return {
    turns: compressedTurns,
    summaries,
    totalOriginalTokens,
    totalCompressedTokens,
    compressionRatio: totalOriginalTokens / totalCompressedTokens,
    keyTopics: [...new Set(keyTopics)].slice(0, 20),
    keyEntities: [...new Set(keyEntities)].slice(0, 20),
  };
}

function summarizeTurnBatch(turns: ConversationTurn[]): string {
  const userTurns = turns.filter(t => t.role === 'user');
  const assistantTurns = turns.filter(t => t.role === 'assistant');

  // Extract key requests from user
  const requests = userTurns.map(t => {
    const firstSentence = t.content.split(/[.!?]/)[0];
    return firstSentence.length < 100 ? firstSentence : firstSentence.substring(0, 100) + '...';
  });

  // Extract key actions from assistant
  const actions = assistantTurns.map(t => {
    if (t.content.includes('```')) return 'provided code';
    if (t.content.includes('created')) return 'created something';
    if (t.content.includes('fixed')) return 'fixed an issue';
    if (t.content.includes('explained')) return 'gave explanation';
    return 'responded';
  });

  return `User asked: ${requests.join('; ')}. Assistant ${actions.join(', ')}.`;
}

// ============================================
// RELEVANCE SCORING
// ============================================

export function scoreRelevance(chunk: ContextChunk, query: string): number {
  let score = 0;
  const queryLower = query.toLowerCase();
  const contentLower = chunk.content.toLowerCase();

  // Keyword matching
  const queryWords = queryLower.split(/\W+/).filter(w => w.length > 2);
  for (const word of queryWords) {
    if (contentLower.includes(word)) {
      score += 0.1;
    }
  }

  // Recency bonus
  const ageMinutes = (Date.now() - chunk.timestamp) / (1000 * 60);
  if (ageMinutes < 5) score += 0.3;
  else if (ageMinutes < 30) score += 0.2;
  else if (ageMinutes < 60) score += 0.1;

  // Importance bonus
  score += chunk.importance * 0.3;

  // Type relevance
  if (chunk.type === 'error' && queryLower.includes('error')) score += 0.2;
  if (chunk.type === 'code' && queryLower.includes('code')) score += 0.2;

  return Math.min(score, 1);
}

export function getRelevantContext(windowId: string, query: string, maxTokens = 4000): ContextChunk[] {
  const window = contextWindows.get(windowId);
  if (!window) return [];

  // Score all chunks
  const scored = window.chunks.map(chunk => ({
    chunk,
    score: scoreRelevance(chunk, query),
  }));

  // Sort by relevance
  scored.sort((a, b) => b.score - a.score);

  // Select chunks within token budget
  const selected: ContextChunk[] = [];
  let tokens = 0;

  for (const { chunk, score } of scored) {
    if (tokens + chunk.tokens > maxTokens) break;
    if (score > 0.1) {
      selected.push(chunk);
      tokens += chunk.tokens;
    }
  }

  return selected;
}

// ============================================
// SMART CHUNKING
// ============================================

export function smartChunk(content: string, type: ContextChunk['type']): string[] {
  const chunks: string[] = [];
  const maxChunkSize = 2000; // characters

  if (type === 'code') {
    // Chunk by logical boundaries
    const lines = content.split('\n');
    let currentChunk: string[] = [];
    let braceDepth = 0;

    for (const line of lines) {
      currentChunk.push(line);

      // Track braces
      braceDepth += (line.match(/\{/g)?.length || 0) - (line.match(/\}/g)?.length || 0);

      // Complete at function/class boundaries
      if (braceDepth === 0 && currentChunk.join('\n').length > maxChunkSize / 2) {
        chunks.push(currentChunk.join('\n'));
        currentChunk = [];
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join('\n'));
    }
  } else {
    // Chunk by paragraphs/sentences
    const paragraphs = content.split(/\n\n+/);
    let currentChunk = '';

    for (const para of paragraphs) {
      if (currentChunk.length + para.length > maxChunkSize) {
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = para;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + para;
      }
    }

    if (currentChunk) chunks.push(currentChunk);
  }

  return chunks;
}

// ============================================
// UTILITIES
// ============================================

const STOP_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
  'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
  'function', 'const', 'let', 'var', 'return', 'import', 'export', 'from',
]);

// ============================================
// FORMAT AS MARKDOWN
// ============================================

export function formatContextWindowAsMarkdown(window: ContextWindow): string {
  const lines = [
    '## Context Window Status',
    '',
    `**ID**: ${window.id}`,
    `**Total Tokens**: ${window.totalTokens.toLocaleString()} / ${window.maxTokens.toLocaleString()}`,
    `**Utilization**: ${Math.round(window.totalTokens / window.maxTokens * 100)}%`,
    `**Compression Level**: ${window.compressionLevel}`,
    `**Chunks**: ${window.chunks.length}`,
    `**Summaries**: ${window.summaries.length}`,
    '',
    '### Chunk Breakdown',
  ];

  const byType: Record<string, number> = {};
  for (const chunk of window.chunks) {
    byType[chunk.type] = (byType[chunk.type] || 0) + chunk.tokens;
  }

  for (const [type, tokens] of Object.entries(byType)) {
    lines.push(`- **${type}**: ${tokens.toLocaleString()} tokens`);
  }

  if (window.summaries.length > 0) {
    lines.push('');
    lines.push('### Compression History');
    for (const summary of window.summaries.slice(-3)) {
      lines.push(`- Compressed ${summary.originalChunkIds.length} chunks (${summary.compressionRatio.toFixed(1)}x ratio)`);
    }
  }

  return lines.join('\n');
}
