// Context Memory Module - Stores user preferences and learns from interactions
// This gives AutoCoder memory across conversations

export interface ContextUserPreferences {
  codingStyle: CodingStylePrefs;
  uiPreferences: UIPrefs;
  techPreferences: TechPrefs;
  conversationHistory: ConversationContext[];
}

export interface CodingStylePrefs {
  preferredFramework?: 'react' | 'vue' | 'vanilla' | 'svelte';
  preferredStyling?: 'tailwind' | 'css' | 'styled-components' | 'sass';
  preferredBackend?: 'express' | 'fastapi' | 'go' | 'rust';
  codeComments?: 'minimal' | 'moderate' | 'extensive';
  namingConvention?: 'camelCase' | 'snake_case' | 'kebab-case';
}

export interface UIPrefs {
  theme?: 'dark' | 'light' | 'auto';
  colorScheme?: string;
  animations?: boolean;
  glassmorphism?: boolean;
  rounded?: 'none' | 'small' | 'medium' | 'large';
}

export interface TechPrefs {
  databases: string[];
  apiStyle: 'rest' | 'graphql';
  authentication: 'jwt' | 'session' | 'oauth';
}

export interface ConversationContext {
  timestamp: number;
  prompt: string;
  projectType: string;
  features: string[];
  satisfaction?: 'positive' | 'neutral' | 'negative';
}

// In-memory storage (persists during session)
const memoryStore = new Map<string, ContextUserPreferences>();

// Extract preferences from user messages
export function learnFromInteraction(
  userId: string,
  prompt: string,
  response: string,
  feedback?: 'positive' | 'negative'
): void {
  const prefs = memoryStore.get(userId) || createDefaultContextPreferences();

  // Learn from prompt patterns
  const lower = prompt.toLowerCase();

  // Learn framework preferences
  if (lower.includes('react')) prefs.codingStyle.preferredFramework = 'react';
  if (lower.includes('vue')) prefs.codingStyle.preferredFramework = 'vue';
  if (lower.includes('vanilla') || lower.includes('no framework')) prefs.codingStyle.preferredFramework = 'vanilla';

  // Learn styling preferences
  if (lower.includes('tailwind')) prefs.codingStyle.preferredStyling = 'tailwind';
  if (lower.includes('styled-components')) prefs.codingStyle.preferredStyling = 'styled-components';

  // Learn UI preferences
  if (lower.includes('dark mode') || lower.includes('dark theme')) prefs.uiPreferences.theme = 'dark';
  if (lower.includes('light mode') || lower.includes('light theme')) prefs.uiPreferences.theme = 'light';
  if (lower.includes('animation') || lower.includes('animate')) prefs.uiPreferences.animations = true;
  if (lower.includes('glass') || lower.includes('blur')) prefs.uiPreferences.glassmorphism = true;
  if (lower.includes('rounded') || lower.includes('smooth')) prefs.uiPreferences.rounded = 'large';

  // Learn backend preferences
  if (lower.includes('express') || lower.includes('node')) prefs.codingStyle.preferredBackend = 'express';
  if (lower.includes('python') || lower.includes('fastapi')) prefs.codingStyle.preferredBackend = 'fastapi';
  if (lower.includes('go') || lower.includes('golang')) prefs.codingStyle.preferredBackend = 'go';

  // Store conversation context
  prefs.conversationHistory.push({
    timestamp: Date.now(),
    prompt: prompt.substring(0, 200),
    projectType: detectProjectType(prompt),
    features: extractFeatures(prompt),
    satisfaction: feedback === 'positive' ? 'positive' : feedback === 'negative' ? 'negative' : undefined,
  });

  // Keep only last 20 conversations
  if (prefs.conversationHistory.length > 20) {
    prefs.conversationHistory = prefs.conversationHistory.slice(-20);
  }

  memoryStore.set(userId, prefs);
}

// Get user preferences
export function getContextPreferences(userId: string): ContextUserPreferences {
  return memoryStore.get(userId) || createDefaultContextPreferences();
}

// Apply preferences to a generation request
export function applyContextPreferences(userId: string, basePrompt: string): string {
  const prefs = getContextPreferences(userId);
  let enhanced = basePrompt;

  const additions: string[] = [];

  if (prefs.codingStyle.preferredFramework && !basePrompt.toLowerCase().includes(prefs.codingStyle.preferredFramework)) {
    additions.push(`Use ${prefs.codingStyle.preferredFramework}`);
  }

  if (prefs.codingStyle.preferredStyling && !basePrompt.toLowerCase().includes(prefs.codingStyle.preferredStyling)) {
    additions.push(`Style with ${prefs.codingStyle.preferredStyling}`);
  }

  if (prefs.uiPreferences.theme === 'dark') {
    additions.push('Include dark mode support');
  }

  if (prefs.uiPreferences.animations) {
    additions.push('Add smooth animations');
  }

  if (prefs.uiPreferences.glassmorphism) {
    additions.push('Use glassmorphism effects');
  }

  if (additions.length > 0) {
    enhanced += `\n\n[User Preferences: ${additions.join(', ')}]`;
  }

  return enhanced;
}

// Get relevant context from past conversations
export function getRelevantContext(userId: string, currentPrompt: string): string[] {
  const prefs = getContextPreferences(userId);
  const context: string[] = [];

  // Find similar past projects
  const currentType = detectProjectType(currentPrompt);
  const similar = prefs.conversationHistory.filter(c => c.projectType === currentType);

  if (similar.length > 0) {
    context.push(`User has built ${similar.length} similar ${currentType} project(s) before`);

    // Get commonly requested features
    const featureCounts = new Map<string, number>();
    for (const conv of similar) {
      for (const f of conv.features) {
        featureCounts.set(f, (featureCounts.get(f) || 0) + 1);
      }
    }

    const topFeatures = Array.from(featureCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([f]) => f);

    if (topFeatures.length > 0) {
      context.push(`Usually requests: ${topFeatures.join(', ')}`);
    }
  }

  return context;
}

function createDefaultContextPreferences(): ContextUserPreferences {
  return {
    codingStyle: {},
    uiPreferences: {},
    techPreferences: {
      databases: ['postgresql'],
      apiStyle: 'rest',
      authentication: 'session',
    },
    conversationHistory: [],
  };
}

function detectProjectType(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (lower.includes('dashboard')) return 'dashboard';
  if (lower.includes('landing')) return 'landing';
  if (lower.includes('ecommerce') || lower.includes('shop')) return 'ecommerce';
  if (lower.includes('portfolio')) return 'portfolio';
  if (lower.includes('blog')) return 'blog';
  if (lower.includes('api')) return 'api';
  if (lower.includes('chat')) return 'chat';
  return 'webapp';
}

function extractFeatures(prompt: string): string[] {
  const features: string[] = [];
  const lower = prompt.toLowerCase();

  const featureMap: Record<string, string> = {
    'login': 'authentication',
    'signup': 'authentication',
    'auth': 'authentication',
    'search': 'search',
    'filter': 'filtering',
    'chart': 'charts',
    'graph': 'charts',
    'dark mode': 'dark-mode',
    'animation': 'animations',
    'responsive': 'responsive',
    'api': 'api',
    'database': 'database',
    'payment': 'payments',
    'upload': 'file-upload',
  };

  for (const [keyword, feature] of Object.entries(featureMap)) {
    if (lower.includes(keyword)) {
      features.push(feature);
    }
  }

  return Array.from(new Set(features));
}

// Format memory summary for display
export function formatMemorySummary(userId: string): string {
  const prefs = getContextPreferences(userId);

  let summary = '## Your Preferences\n\n';

  if (prefs.codingStyle.preferredFramework) {
    summary += `**Framework:** ${prefs.codingStyle.preferredFramework}\n`;
  }
  if (prefs.codingStyle.preferredStyling) {
    summary += `**Styling:** ${prefs.codingStyle.preferredStyling}\n`;
  }
  if (prefs.uiPreferences.theme) {
    summary += `**Theme:** ${prefs.uiPreferences.theme}\n`;
  }
  if (prefs.uiPreferences.animations) {
    summary += `**Animations:** Enabled\n`;
  }

  if (prefs.conversationHistory.length > 0) {
    summary += `\n**Past Projects:** ${prefs.conversationHistory.length}\n`;
    const types = Array.from(new Set(prefs.conversationHistory.map(c => c.projectType)));
    summary += `**Project Types:** ${types.join(', ')}\n`;
  }

  return summary;
}