// Learning Module - Constant learning and pattern memory
// The AI learns from interactions and remembers successful patterns

export interface LearnedPattern {
  id: string;
  trigger: string[];        // Keywords that trigger this pattern
  solution: string;         // Template or approach to use
  context: string;          // What type of request this solves
  successCount: number;     // How many times this worked
  lastUsed: number;         // Timestamp
  metadata: Record<string, any>;
}

export interface LearningMemory {
  patterns: LearnedPattern[];
  synonyms: Record<string, string[]>;
  corrections: Record<string, string>;
  preferences: Record<string, any>;
}

// ========================================
// PERSISTENT LEARNING STORAGE
// ========================================

const STORAGE_KEY = 'sage_learning_memory';

function loadMemory(): LearningMemory {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.log('Learning memory not available in this context');
  }
  return getDefaultMemory();
}

function saveMemory(memory: LearningMemory): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  } catch (e) {
    console.log('Cannot persist learning memory');
  }
}

function getDefaultMemory(): LearningMemory {
  return {
    patterns: [...builtInPatterns],
    synonyms: { ...builtInSynonyms },
    corrections: { ...builtInCorrections },
    preferences: {}
  };
}

// ========================================
// BUILT-IN KNOWLEDGE (Always available)
// ========================================

const builtInPatterns: LearnedPattern[] = [
  // Business patterns
  {
    id: "erp-pattern",
    trigger: ["erp", "enterprise", "business system", "all-in-one business"],
    solution: "html-dashboard",
    context: "Enterprise applications need dashboards with sidebar navigation",
    successCount: 100,
    lastUsed: Date.now(),
    metadata: { category: "business", complexity: "complex" }
  },
  {
    id: "crm-pattern",
    trigger: ["crm", "customer relationship", "sales pipeline", "lead management"],
    solution: "html-dashboard",
    context: "CRM systems are data-heavy dashboards with tables and charts",
    successCount: 100,
    lastUsed: Date.now(),
    metadata: { category: "business", complexity: "complex" }
  },
  {
    id: "saas-landing",
    trigger: ["saas", "startup", "product launch", "coming soon"],
    solution: "html-landing",
    context: "SaaS products need marketing landing pages with hero, features, pricing",
    successCount: 100,
    lastUsed: Date.now(),
    metadata: { category: "marketing", complexity: "medium" }
  },

  // E-commerce patterns
  {
    id: "shop-pattern",
    trigger: ["shop", "store", "ecommerce", "buy", "sell", "products for sale"],
    solution: "html-card-grid",
    context: "E-commerce needs product grids with cards",
    successCount: 100,
    lastUsed: Date.now(),
    metadata: { category: "ecommerce", complexity: "medium" }
  },

  // Interactive patterns
  {
    id: "form-pattern",
    trigger: ["form", "contact us", "sign up", "registration", "subscribe"],
    solution: "html-form",
    context: "Forms need validation and good UX",
    successCount: 100,
    lastUsed: Date.now(),
    metadata: { category: "ui", complexity: "simple" }
  },

  // Dashboard patterns
  {
    id: "analytics-pattern",
    trigger: ["analytics", "metrics", "statistics", "monitoring", "tracking"],
    solution: "html-dashboard",
    context: "Analytics needs charts, KPIs, and data tables",
    successCount: 100,
    lastUsed: Date.now(),
    metadata: { category: "analytics", complexity: "complex" }
  },

  // Portfolio patterns
  {
    id: "portfolio-pattern",
    trigger: ["portfolio", "gallery", "showcase", "my work", "projects showcase"],
    solution: "html-card-grid",
    context: "Portfolios need visual card grids",
    successCount: 100,
    lastUsed: Date.now(),
    metadata: { category: "personal", complexity: "medium" }
  }
];

const builtInSynonyms: Record<string, string[]> = {
  "dashboard": ["admin panel", "control panel", "back office", "management console", "admin"],
  "landing": ["homepage", "home page", "front page", "marketing page", "splash page"],
  "form": ["input", "registration", "signup", "contact form", "questionnaire"],
  "ecommerce": ["shop", "store", "marketplace", "online store", "web shop"],
  "blog": ["articles", "posts", "news", "content", "magazine"],
  "portfolio": ["gallery", "showcase", "work samples", "projects"],
  "authentication": ["login", "signin", "auth", "user access"],
  "crud": ["create read update delete", "data management", "records"],
  "api": ["backend", "server", "endpoints", "rest api", "web service"],
  "responsive": ["mobile friendly", "adaptive", "mobile first", "cross device"],
  "realtime": ["live", "instant", "real-time", "live updates", "websocket"],
  "chart": ["graph", "visualization", "data viz", "diagram"],
  "table": ["grid", "list", "data table", "spreadsheet"],
  "modal": ["popup", "dialog", "overlay", "lightbox"],
  "sidebar": ["side menu", "navigation", "left menu", "drawer"],
  "navbar": ["header", "top menu", "navigation bar", "top bar"],
  "card": ["tile", "box", "panel", "widget"],
  "button": ["cta", "action", "link button", "submit"],
  "search": ["find", "filter", "lookup", "query"],
  "pagination": ["paging", "next previous", "page navigation"],
  "notification": ["alert", "toast", "message", "notice"],
  "loading": ["spinner", "skeleton", "progress", "waiting"]
};

const builtInCorrections: Record<string, string> = {
  "dashbord": "dashboard",
  "dashbaord": "dashboard",
  "landig": "landing",
  "landng": "landing",
  "ecomerce": "ecommerce",
  "ecoomerce": "ecommerce",
  "portfoilo": "portfolio",
  "portfolo": "portfolio",
  "authenication": "authentication",
  "authentcation": "authentication",
  "managment": "management",
  "mangement": "management",
  "registation": "registration",
  "resgistration": "registration",
  "calender": "calendar",
  "calander": "calendar",
  "acount": "account",
  "acccount": "account",
  "profle": "profile",
  "profiel": "profile",
  "anayltics": "analytics",
  "anlaytics": "analytics",
  "notifcation": "notification",
  "notificaton": "notification"
};

// ========================================
// LEARNING ENGINE
// ========================================

class LearningEngine {
  private memory: LearningMemory;

  constructor() {
    this.memory = loadMemory();
  }

  // Learn a new pattern
  learn(trigger: string[], solution: string, context: string, metadata: Record<string, any> = {}): void {
    const id = `learned-${Date.now()}`;
    const pattern: LearnedPattern = {
      id,
      trigger,
      solution,
      context,
      successCount: 1,
      lastUsed: Date.now(),
      metadata
    };

    this.memory.patterns.push(pattern);
    this.save();
  }

  // Reinforce a pattern (it worked!)
  reinforce(patternId: string): void {
    const pattern = this.memory.patterns.find(p => p.id === patternId);
    if (pattern) {
      pattern.successCount++;
      pattern.lastUsed = Date.now();
      this.save();
    }
  }

  // Find matching patterns for input
  findPatterns(input: string): LearnedPattern[] {
    const lowerInput = this.correctSpelling(input.toLowerCase());
    const expandedInput = this.expandSynonyms(lowerInput);

    return this.memory.patterns
      .filter(pattern =>
        pattern.trigger.some(t =>
          expandedInput.includes(t.toLowerCase()) ||
          lowerInput.includes(t.toLowerCase())
        )
      )
      .sort((a, b) => b.successCount - a.successCount);
  }

  // Get best matching pattern
  getBestMatch(input: string): LearnedPattern | null {
    const matches = this.findPatterns(input);
    return matches.length > 0 ? matches[0] : null;
  }

  // Learn a synonym
  learnSynonym(term: string, synonym: string): void {
    if (!this.memory.synonyms[term]) {
      this.memory.synonyms[term] = [];
    }
    if (!this.memory.synonyms[term].includes(synonym)) {
      this.memory.synonyms[term].push(synonym);
      this.save();
    }
  }

  // Expand synonyms in text
  expandSynonyms(text: string): string {
    let expanded = text;
    for (const [term, synonyms] of Object.entries(this.memory.synonyms)) {
      for (const synonym of synonyms) {
        if (text.includes(synonym)) {
          expanded += ` ${term}`;
        }
      }
    }
    return expanded;
  }

  // Correct common spelling mistakes
  correctSpelling(text: string): string {
    let corrected = text;
    for (const [wrong, right] of Object.entries(this.memory.corrections)) {
      corrected = corrected.replace(new RegExp(wrong, 'gi'), right);
    }
    return corrected;
  }

  // Learn a spelling correction
  learnCorrection(wrong: string, right: string): void {
    this.memory.corrections[wrong.toLowerCase()] = right.toLowerCase();
    this.save();
  }

  // Set a preference
  setPreference(key: string, value: any): void {
    this.memory.preferences[key] = value;
    this.save();
  }

  // Get a preference
  getPreference(key: string): any {
    return this.memory.preferences[key];
  }

  // Get all patterns
  getAllPatterns(): LearnedPattern[] {
    return this.memory.patterns;
  }

  // Get pattern count
  getPatternCount(): number {
    return this.memory.patterns.length;
  }

  // Get learning stats
  getStats(): { patterns: number; synonyms: number; corrections: number } {
    return {
      patterns: this.memory.patterns.length,
      synonyms: Object.keys(this.memory.synonyms).length,
      corrections: Object.keys(this.memory.corrections).length
    };
  }

  // Reset to defaults
  reset(): void {
    this.memory = getDefaultMemory();
    this.save();
  }

  // Save to storage
  private save(): void {
    saveMemory(this.memory);
  }
}

// ========================================
// INTELLIGENT UNDERSTANDING LAYER
// ========================================

export function intelligentParse(input: string): {
  corrected: string;
  expanded: string;
  matchedPatterns: LearnedPattern[];
  suggestedSolution: string | null;
  confidence: number;
} {
  const engine = new LearningEngine();

  const corrected = engine.correctSpelling(input);
  const expanded = engine.expandSynonyms(corrected.toLowerCase());
  const matchedPatterns = engine.findPatterns(expanded);
  const bestMatch = matchedPatterns.length > 0 ? matchedPatterns[0] : null;

  return {
    corrected,
    expanded,
    matchedPatterns,
    suggestedSolution: bestMatch?.solution || null,
    confidence: bestMatch ? Math.min(bestMatch.successCount / 100, 1) : 0
  };
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let learningEngineInstance: LearningEngine | null = null;

export function getLearningEngine(): LearningEngine {
  if (!learningEngineInstance) {
    learningEngineInstance = new LearningEngine();
  }
  return learningEngineInstance;
}

// Export for use
export { LearningEngine };