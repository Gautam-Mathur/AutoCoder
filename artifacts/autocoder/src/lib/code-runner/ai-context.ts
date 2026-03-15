// AI Context Persistence - Save and restore AI conversation context

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: {
    generatedFiles?: string[];
    templateUsed?: string;
    tokensUsed?: number;
  };
}

export interface AIContext {
  id: string;
  conversationId: number;
  name: string;
  messages: AIMessage[];
  projectType?: string;
  techStack?: string[];
  preferences: UserPreferences;
  createdAt: number;
  updatedAt: number;
}

export interface UserPreferences {
  language: 'javascript' | 'typescript' | 'python';
  framework?: string;
  styling?: 'css' | 'tailwind' | 'scss' | 'styled-components';
  database?: 'none' | 'sqlite' | 'postgres' | 'mongodb';
  codeStyle?: {
    semicolons: boolean;
    singleQuotes: boolean;
    tabWidth: number;
  };
  features?: string[];
}

const defaultPreferences: UserPreferences = {
  language: 'javascript',
  framework: 'react',
  styling: 'css',
  database: 'none',
  codeStyle: {
    semicolons: true,
    singleQuotes: true,
    tabWidth: 2
  }
};

class AIContextManager {
  private contexts: Map<number, AIContext> = new Map();
  private storageKey = 'autocoder-ai-contexts';
  private maxMessages = 100;
  private maxContexts = 20;

  constructor() {
    this.loadFromStorage();
  }

  // Create or get context for conversation
  getOrCreateContext(conversationId: number, name?: string): AIContext {
    let context = this.contexts.get(conversationId);

    if (!context) {
      context = {
        id: `ctx-${conversationId}-${Date.now()}`,
        conversationId,
        name: name || `Conversation ${conversationId}`,
        messages: [],
        preferences: { ...defaultPreferences },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      this.contexts.set(conversationId, context);
      this.saveToStorage();
    }

    return context;
  }

  // Add message to context
  addMessage(
    conversationId: number,
    role: AIMessage['role'],
    content: string,
    metadata?: AIMessage['metadata']
  ): AIMessage {
    const context = this.getOrCreateContext(conversationId);

    const message: AIMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: Date.now(),
      metadata
    };

    context.messages.push(message);

    // Trim old messages if exceeding limit
    if (context.messages.length > this.maxMessages) {
      // Keep system messages and trim oldest user/assistant messages
      const systemMessages = context.messages.filter(m => m.role === 'system');
      const otherMessages = context.messages.filter(m => m.role !== 'system');
      context.messages = [...systemMessages, ...otherMessages.slice(-this.maxMessages + systemMessages.length)];
    }

    context.updatedAt = Date.now();
    this.saveToStorage();

    return message;
  }

  // Get messages for context
  getMessages(conversationId: number): AIMessage[] {
    const context = this.contexts.get(conversationId);
    return context?.messages || [];
  }

  // Get recent messages (for API context window)
  getRecentMessages(conversationId: number, count: number = 20): AIMessage[] {
    const messages = this.getMessages(conversationId);
    return messages.slice(-count);
  }

  // Build prompt context from conversation history
  buildPromptContext(conversationId: number): string {
    const context = this.contexts.get(conversationId);
    if (!context) return '';

    const recentMessages = this.getRecentMessages(conversationId, 10);

    let prompt = '';

    // Add project context
    if (context.projectType) {
      prompt += `Project Type: ${context.projectType}\n`;
    }
    if (context.techStack?.length) {
      prompt += `Tech Stack: ${context.techStack.join(', ')}\n`;
    }

    // Add user preferences
    prompt += `\nUser Preferences:\n`;
    prompt += `- Language: ${context.preferences.language}\n`;
    if (context.preferences.framework) {
      prompt += `- Framework: ${context.preferences.framework}\n`;
    }
    prompt += `- Styling: ${context.preferences.styling}\n`;
    if (context.preferences.database !== 'none') {
      prompt += `- Database: ${context.preferences.database}\n`;
    }

    // Add conversation summary
    if (recentMessages.length > 0) {
      prompt += `\nRecent Conversation Summary:\n`;
      for (const msg of recentMessages.slice(-5)) {
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        const preview = msg.content.slice(0, 100) + (msg.content.length > 100 ? '...' : '');
        prompt += `${role}: ${preview}\n`;
      }
    }

    return prompt;
  }

  // Update preferences
  updatePreferences(conversationId: number, preferences: Partial<UserPreferences>): void {
    const context = this.getOrCreateContext(conversationId);
    context.preferences = { ...context.preferences, ...preferences };
    context.updatedAt = Date.now();
    this.saveToStorage();
  }

  // Update project context
  updateProjectContext(conversationId: number, projectType?: string, techStack?: string[]): void {
    const context = this.getOrCreateContext(conversationId);
    if (projectType) context.projectType = projectType;
    if (techStack) context.techStack = techStack;
    context.updatedAt = Date.now();
    this.saveToStorage();
  }

  // Extract context from code
  extractContextFromCode(code: string): Partial<AIContext> {
    const extracted: Partial<AIContext> = {
      techStack: []
    };

    // Detect frameworks
    if (code.includes('import React') || code.includes('from "react"')) {
      extracted.techStack!.push('React');
    }
    if (code.includes('from "vue"')) {
      extracted.techStack!.push('Vue');
    }
    if (code.includes('from "express"')) {
      extracted.techStack!.push('Express');
    }
    if (code.includes('from "next"')) {
      extracted.techStack!.push('Next.js');
    }

    // Detect styling
    if (code.includes('tailwind') || code.includes('className=')) {
      extracted.techStack!.push('Tailwind CSS');
    }
    if (code.includes('styled-components')) {
      extracted.techStack!.push('styled-components');
    }

    // Detect database
    if (code.includes('prisma') || code.includes('@prisma/client')) {
      extracted.techStack!.push('Prisma');
    }
    if (code.includes('drizzle') || code.includes('drizzle-orm')) {
      extracted.techStack!.push('Drizzle');
    }
    if (code.includes('mongoose')) {
      extracted.techStack!.push('MongoDB');
    }

    return extracted;
  }

  // Clear conversation context
  clearContext(conversationId: number): void {
    this.contexts.delete(conversationId);
    this.saveToStorage();
  }

  // Get all contexts
  getAllContexts(): AIContext[] {
    return Array.from(this.contexts.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  // Rename context
  renameContext(conversationId: number, name: string): void {
    const context = this.contexts.get(conversationId);
    if (context) {
      context.name = name;
      context.updatedAt = Date.now();
      this.saveToStorage();
    }
  }

  // Export context as JSON
  exportContext(conversationId: number): string {
    const context = this.contexts.get(conversationId);
    return context ? JSON.stringify(context, null, 2) : '{}';
  }

  // Import context from JSON
  importContext(json: string): AIContext | null {
    try {
      const context = JSON.parse(json) as AIContext;
      context.id = `ctx-imported-${Date.now()}`;
      context.updatedAt = Date.now();
      this.contexts.set(context.conversationId, context);
      this.saveToStorage();
      return context;
    } catch (e) {
      console.error('Failed to import context:', e);
      return null;
    }
  }

  // Save to localStorage
  private saveToStorage(): void {
    try {
      const data = Array.from(this.contexts.entries());

      // Limit number of stored contexts
      if (data.length > this.maxContexts) {
        const sorted = data.sort(([, a], [, b]) => b.updatedAt - a.updatedAt);
        const toKeep = sorted.slice(0, this.maxContexts);
        this.contexts = new Map(toKeep);
      }

      localStorage.setItem(this.storageKey, JSON.stringify(Array.from(this.contexts.entries())));
    } catch (e) {
      console.warn('Failed to save AI context:', e);
    }
  }

  // Load from localStorage
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored) as [number, AIContext][];
        this.contexts = new Map(data);
      }
    } catch (e) {
      console.warn('Failed to load AI context:', e);
    }
  }

  // Summarize conversation for context compression
  async summarizeConversation(conversationId: number): Promise<string> {
    const messages = this.getMessages(conversationId);
    if (messages.length < 5) {
      return messages.map(m => `${m.role}: ${m.content.slice(0, 100)}`).join('\n');
    }

    // Create summary from key messages
    const userMessages = messages.filter(m => m.role === 'user');
    const features = messages
      .filter(m => m.metadata?.generatedFiles?.length)
      .map(m => m.metadata!.generatedFiles!.join(', '));

    let summary = 'Conversation Summary:\n';
    summary += `- ${userMessages.length} user requests\n`;
    summary += `- Generated files: ${features.length > 0 ? features.join(', ') : 'none'}\n`;
    summary += `- Last topic: ${userMessages[userMessages.length - 1]?.content.slice(0, 100)}...\n`;

    return summary;
  }
}

// Singleton instance
export const aiContext = new AIContextManager();

// React hook for AI context
export function useAIContext(conversationId: number) {
  return {
    getContext: () => aiContext.getOrCreateContext(conversationId),
    addMessage: (role: AIMessage['role'], content: string, metadata?: AIMessage['metadata']) =>
      aiContext.addMessage(conversationId, role, content, metadata),
    getMessages: () => aiContext.getMessages(conversationId),
    getRecentMessages: (count?: number) => aiContext.getRecentMessages(conversationId, count),
    buildPromptContext: () => aiContext.buildPromptContext(conversationId),
    updatePreferences: (prefs: Partial<UserPreferences>) => aiContext.updatePreferences(conversationId, prefs),
    updateProjectContext: (type?: string, stack?: string[]) => aiContext.updateProjectContext(conversationId, type, stack),
    clearContext: () => aiContext.clearContext(conversationId),
    exportContext: () => aiContext.exportContext(conversationId),
    summarize: () => aiContext.summarizeConversation(conversationId)
  };
}