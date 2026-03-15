// Intel Memory System - Stores user preferences, architectural choices, learns from past generations

interface IntelRecord {
  id: string;
  type: 'preference' | 'decision' | 'pattern' | 'mistake' | 'context';
  category: string;
  key: string;
  value: string;
  confidence: number; // 0-1
  source: 'explicit' | 'inferred' | 'learned';
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
}

interface UserPreferences {
  designStyle?: 'minimal' | 'modern' | 'corporate' | 'playful' | 'dark' | 'colorful';
  codeStyle?: 'concise' | 'verbose' | 'documented';
  techStack?: string[];
  colorPreferences?: string[];
  componentPreferences?: string[];
  avoidPatterns?: string[];
}

interface ProjectIntel {
  conversationId: number;
  intel: IntelRecord[];
  preferences: UserPreferences;
  learnings: Learning[];
}

interface Learning {
  id: string;
  type: 'success' | 'failure' | 'preference';
  pattern: string;
  outcome: string;
  weight: number; // Higher = more important
  timestamp: Date;
}

// In-memory intel store (would be persisted to DB in production)
const intelStore = new Map<number, ProjectIntel>();

// Extract intel from conversation messages
export function extractIntelFromMessages(
  conversationId: number,
  messages: { role: string; content: string }[]
): IntelRecord[] {
  const intel: IntelRecord[] = [];
  const now = new Date();

  for (const message of messages) {
    if (message.role === 'user') {
      // Extract preferences from user messages
      const extracted = extractPreferencesFromText(message.content);
      for (const pref of extracted) {
        intel.push({
          id: `intel-${conversationId}-${intel.length}`,
          type: pref.type,
          category: pref.category,
          key: pref.key,
          value: pref.value,
          confidence: pref.confidence,
          source: 'inferred',
          createdAt: now,
          updatedAt: now,
          usageCount: 0,
        });
      }
    }
  }

  return intel;
}

// Extract preferences from text
function extractPreferencesFromText(text: string): Partial<IntelRecord>[] {
  const preferences: Partial<IntelRecord>[] = [];
  const lowerText = text.toLowerCase();

  // Design style preferences
  const stylePatterns: Record<string, string[]> = {
    'minimal': ['minimal', 'minimalist', 'clean', 'simple', 'sleek'],
    'modern': ['modern', 'contemporary', 'cutting-edge', 'trendy'],
    'corporate': ['corporate', 'professional', 'business', 'enterprise'],
    'playful': ['playful', 'fun', 'creative', 'colorful', 'vibrant'],
    'dark': ['dark', 'dark mode', 'dark theme', 'night'],
  };

  for (const [style, keywords] of Object.entries(stylePatterns)) {
    if (keywords.some(k => lowerText.includes(k))) {
      preferences.push({
        type: 'preference',
        category: 'design',
        key: 'style',
        value: style,
        confidence: 0.8,
      });
    }
  }

  // Color preferences
  const colorPattern = /(?:color|colours?|palette|theme)(?:[:\s]+)?(?:is\s+)?(?:be\s+)?(\w+(?:\s+and\s+\w+)*)/i;
  const colorMatch = text.match(colorPattern);
  if (colorMatch) {
    preferences.push({
      type: 'preference',
      category: 'design',
      key: 'colors',
      value: colorMatch[1],
      confidence: 0.9,
    });
  }

  // Explicit color mentions
  const colors = ['blue', 'green', 'red', 'purple', 'orange', 'teal', 'indigo', 'pink', 'yellow'];
  for (const color of colors) {
    if (lowerText.includes(color)) {
      preferences.push({
        type: 'preference',
        category: 'design',
        key: 'primaryColor',
        value: color,
        confidence: 0.6,
      });
      break;
    }
  }

  // Tech stack preferences
  const techPatterns: Record<string, string[]> = {
    'React': ['react', 'reactjs'],
    'Vue': ['vue', 'vuejs'],
    'Angular': ['angular'],
    'Tailwind': ['tailwind', 'tailwindcss'],
    'Bootstrap': ['bootstrap'],
    'TypeScript': ['typescript', 'ts'],
    'Node.js': ['node', 'nodejs', 'express'],
    'PostgreSQL': ['postgres', 'postgresql', 'pg'],
  };

  for (const [tech, keywords] of Object.entries(techPatterns)) {
    if (keywords.some(k => lowerText.includes(k))) {
      preferences.push({
        type: 'preference',
        category: 'tech',
        key: 'stack',
        value: tech,
        confidence: 0.95,
      });
    }
  }

  // Negative preferences (things to avoid)
  const avoidPattern = /(?:don't|do not|no|avoid|without|not)\s+(?:use|include|want|need)\s+(\w+)/gi;
  let avoidMatch;
  while ((avoidMatch = avoidPattern.exec(text)) !== null) {
    preferences.push({
      type: 'preference',
      category: 'avoid',
      key: 'noUse',
      value: avoidMatch[1],
      confidence: 0.95,
    });
  }

  // Feature requests
  const featurePatterns = [
    { pattern: /(?:need|want|add|include)\s+(?:a\s+)?(\w+\s+\w+)/gi, confidence: 0.7 },
    { pattern: /(?:should|must)\s+have\s+(\w+)/gi, confidence: 0.8 },
  ];

  for (const { pattern, confidence } of featurePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      preferences.push({
        type: 'context',
        category: 'feature',
        key: 'required',
        value: match[1],
        confidence,
      });
    }
  }

  return preferences;
}

// Store intel for a conversation
export function storeIntel(conversationId: number, intel: IntelRecord[]): void {
  const existing = intelStore.get(conversationId);
  if (existing) {
    // Merge with existing intel
    for (const record of intel) {
      const existingRecord = existing.intel.find(
        i => i.key === record.key && i.category === record.category
      );
      if (existingRecord) {
        // Update existing record if new one has higher confidence
        if (record.confidence > existingRecord.confidence) {
          existingRecord.value = record.value;
          existingRecord.confidence = record.confidence;
          existingRecord.updatedAt = new Date();
        }
        existingRecord.usageCount++;
      } else {
        existing.intel.push(record);
      }
    }
  } else {
    intelStore.set(conversationId, {
      conversationId,
      intel,
      preferences: derivePreferences(intel),
      learnings: [],
    });
  }
}

// Derive user preferences from intel records
function derivePreferences(intel: IntelRecord[]): UserPreferences {
  const preferences: UserPreferences = {};

  // Get design style
  const styleRecord = intel.find(i => i.category === 'design' && i.key === 'style');
  if (styleRecord) {
    preferences.designStyle = styleRecord.value as UserPreferences['designStyle'];
  }

  // Get color preferences
  const colorRecords = intel.filter(i => i.category === 'design' && i.key.includes('color'));
  if (colorRecords.length > 0) {
    preferences.colorPreferences = colorRecords.map(r => r.value);
  }

  // Get tech stack
  const techRecords = intel.filter(i => i.category === 'tech' && i.key === 'stack');
  if (techRecords.length > 0) {
    preferences.techStack = techRecords.map(r => r.value);
  }

  // Get avoid patterns
  const avoidRecords = intel.filter(i => i.category === 'avoid');
  if (avoidRecords.length > 0) {
    preferences.avoidPatterns = avoidRecords.map(r => r.value);
  }

  return preferences;
}

// Get intel for a conversation
export function getIntel(conversationId: number): ProjectIntel | undefined {
  return intelStore.get(conversationId);
}

// Get preferences for a conversation
export function getPreferences(conversationId: number): UserPreferences {
  const intel = intelStore.get(conversationId);
  return intel?.preferences || {};
}

// Record a learning from user feedback
export function recordLearning(
  conversationId: number,
  type: 'success' | 'failure' | 'preference',
  pattern: string,
  outcome: string
): void {
  const intel = intelStore.get(conversationId);
  if (intel) {
    intel.learnings.push({
      id: `learning-${Date.now()}`,
      type,
      pattern,
      outcome,
      weight: type === 'failure' ? 1.5 : 1.0, // Weight failures more heavily
      timestamp: new Date(),
    });
  }
}

// Generate context string for AI prompts based on intel
export function generateIntelContext(conversationId: number): string {
  const intel = intelStore.get(conversationId);
  if (!intel || intel.intel.length === 0) {
    return '';
  }

  let context = '\n## User Intel (What I know about their preferences)\n';

  const prefs = intel.preferences;

  if (prefs.designStyle) {
    context += `- Prefers ${prefs.designStyle} design style\n`;
  }

  if (prefs.colorPreferences && prefs.colorPreferences.length > 0) {
    context += `- Likes these colors: ${prefs.colorPreferences.join(', ')}\n`;
  }

  if (prefs.techStack && prefs.techStack.length > 0) {
    context += `- Prefers using: ${prefs.techStack.join(', ')}\n`;
  }

  if (prefs.avoidPatterns && prefs.avoidPatterns.length > 0) {
    context += `- Wants to AVOID: ${prefs.avoidPatterns.join(', ')}\n`;
  }

  // Add learnings
  const recentLearnings = intel.learnings.slice(-5);
  if (recentLearnings.length > 0) {
    context += '\n### Past Learnings:\n';
    for (const learning of recentLearnings) {
      const icon = learning.type === 'success' ? '[OK]' : learning.type === 'failure' ? '[X]' : '[i]';
      context += `${icon} ${learning.pattern}: ${learning.outcome}\n`;
    }
  }

  return context;
}

// Clear intel for a conversation
export function clearIntel(conversationId: number): void {
  intelStore.delete(conversationId);
}

// Export intel summary
export function exportIntelSummary(conversationId: number): string {
  const intel = intelStore.get(conversationId);
  if (!intel) {
    return 'No intel stored for this project.';
  }

  let summary = '## Project Intel Summary\n\n';

  summary += '### Stored Preferences\n';
  const prefs = intel.preferences;
  if (Object.keys(prefs).length === 0) {
    summary += '_No explicit preferences stored_\n';
  } else {
    if (prefs.designStyle) summary += `- Design Style: ${prefs.designStyle}\n`;
    if (prefs.colorPreferences) summary += `- Colors: ${prefs.colorPreferences.join(', ')}\n`;
    if (prefs.techStack) summary += `- Tech Stack: ${prefs.techStack.join(', ')}\n`;
    if (prefs.avoidPatterns) summary += `- Avoid: ${prefs.avoidPatterns.join(', ')}\n`;
  }

  summary += '\n### Intel Records\n';
  summary += `Total records: ${intel.intel.length}\n`;

  const categories = new Set(intel.intel.map(i => i.category));
  for (const cat of categories) {
    const records = intel.intel.filter(i => i.category === cat);
    summary += `- ${cat}: ${records.length} records\n`;
  }

  summary += '\n### Learnings\n';
  summary += `Total learnings: ${intel.learnings.length}\n`;
  const successCount = intel.learnings.filter(l => l.type === 'success').length;
  const failureCount = intel.learnings.filter(l => l.type === 'failure').length;
  summary += `- Successes: ${successCount}\n`;
  summary += `- Failures: ${failureCount}\n`;

  return summary;
}

export {
  IntelRecord,
  UserPreferences,
  ProjectIntel,
  Learning,
};