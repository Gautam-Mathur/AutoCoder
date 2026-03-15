// Clarification Engine - Analyzes prompts and asks smart questions before generating code

interface ClarificationQuestion {
  category: 'scope' | 'features' | 'design' | 'tech' | 'users' | 'data';
  question: string;
  priority: 'high' | 'medium' | 'low';
  context: string;
}

interface PromptAnalysis {
  hasAmbiguity: boolean;
  missingInfo: string[];
  inferredIntent: string;
  suggestedQuestions: ClarificationQuestion[];
  projectType: string;
  complexity: 'simple' | 'moderate' | 'complex';
  canProceed: boolean;
}

// Keywords that indicate different project types
const PROJECT_TYPE_PATTERNS = {
  landing: ['landing', 'homepage', 'website', 'page'],
  dashboard: ['dashboard', 'admin', 'panel', 'management'],
  ecommerce: ['shop', 'store', 'ecommerce', 'cart', 'checkout', 'product'],
  saas: ['saas', 'subscription', 'billing', 'pricing', 'plan'],
  portfolio: ['portfolio', 'resume', 'cv', 'personal'],
  blog: ['blog', 'posts', 'articles', 'content'],
  webapp: ['app', 'application', 'tool', 'system', 'platform'],
  api: ['api', 'backend', 'server', 'endpoint'],
  social: ['social', 'chat', 'messaging', 'community', 'forum'],
};

// Required information for different project types
const REQUIRED_INFO: Record<string, string[]> = {
  landing: ['business/product name', 'target audience', 'key features or sections'],
  dashboard: ['data being displayed', 'user roles', 'main actions/features'],
  ecommerce: ['product types', 'payment method', 'shipping requirements'],
  saas: ['core features', 'pricing tiers', 'user types'],
  portfolio: ['profession/field', 'projects to showcase', 'contact method'],
  blog: ['content topics', 'author info', 'comment system needed'],
  webapp: ['core functionality', 'user workflow', 'data to store'],
  api: ['endpoints needed', 'data models', 'authentication type'],
  social: ['interaction types', 'user relationships', 'content types'],
};

// Analyze the user prompt for ambiguity and missing information
export function analyzePrompt(prompt: string, existingContext?: any): PromptAnalysis {
  const lowerPrompt = prompt.toLowerCase();

  // Detect project type
  let projectType = 'webapp';
  for (const [type, patterns] of Object.entries(PROJECT_TYPE_PATTERNS)) {
    if (patterns.some(p => lowerPrompt.includes(p))) {
      projectType = type;
      break;
    }
  }

  // Check what information is present vs missing
  const missingInfo: string[] = [];
  const requiredFields = REQUIRED_INFO[projectType] || REQUIRED_INFO.webapp;

  // Detection patterns for different info types
  const infoPatterns = {
    'business/product name': /(?:called|named|for)\s+["']?([A-Z][a-zA-Z0-9]+)["']?/i,
    'target audience': /(?:for|users?|audience|customers?)\s+(?:are|is|who)/i,
    'key features or sections': /(?:with|including|features?|sections?|components?)/i,
    'data being displayed': /(?:show|display|data|metrics|stats|analytics)/i,
    'user roles': /(?:admin|user|roles?|permissions?|access)/i,
    'main actions/features': /(?:can|should|able to|actions?|features?)/i,
    'product types': /(?:products?|items?|goods|inventory)/i,
    'payment method': /(?:payment|pay|stripe|paypal|checkout)/i,
    'core functionality': /(?:should|can|does|functionality|features?)/i,
    'user workflow': /(?:workflow|flow|process|steps?|journey)/i,
    'data to store': /(?:store|save|database|persist|data)/i,
  };

  for (const field of requiredFields) {
    const pattern = infoPatterns[field as keyof typeof infoPatterns];
    if (pattern && !pattern.test(prompt)) {
      missingInfo.push(field);
    }
  }

  // Generate clarifying questions for missing info
  const suggestedQuestions: ClarificationQuestion[] = [];

  const questionTemplates: Record<string, ClarificationQuestion> = {
    'business/product name': {
      category: 'scope',
      question: "What is the name of your product or business?",
      priority: 'high',
      context: "I'll use this to generate realistic branding and content.",
    },
    'target audience': {
      category: 'users',
      question: "Who is the target audience for this product?",
      priority: 'high',
      context: "This helps me tailor the design, copy, and UX appropriately.",
    },
    'key features or sections': {
      category: 'features',
      question: "What are the main sections or features you need?",
      priority: 'high',
      context: "I'll structure the app/page around these core elements.",
    },
    'data being displayed': {
      category: 'data',
      question: "What kind of data or metrics will be displayed?",
      priority: 'high',
      context: "This determines the charts, tables, and widgets needed.",
    },
    'user roles': {
      category: 'users',
      question: "What user roles or permission levels are needed?",
      priority: 'medium',
      context: "I'll implement appropriate access controls.",
    },
    'core functionality': {
      category: 'features',
      question: "What is the main thing users should be able to do?",
      priority: 'high',
      context: "I'll build the core workflow around this.",
    },
    'user workflow': {
      category: 'features',
      question: "Can you describe the typical user journey or workflow?",
      priority: 'medium',
      context: "This helps me design the right UX flow.",
    },
    'data to store': {
      category: 'data',
      question: "What data needs to be saved or persisted?",
      priority: 'medium',
      context: "I'll design the appropriate data model.",
    },
  };

  for (const missing of missingInfo.slice(0, 3)) { // Max 3 questions
    const template = questionTemplates[missing];
    if (template) {
      suggestedQuestions.push(template);
    }
  }

  // Determine complexity
  let complexity: 'simple' | 'moderate' | 'complex' = 'moderate';
  const complexIndicators = ['authentication', 'database', 'api', 'integration', 'real-time', 'payment'];
  const simpleIndicators = ['simple', 'basic', 'quick', 'just', 'only'];

  if (complexIndicators.some(i => lowerPrompt.includes(i))) {
    complexity = 'complex';
  } else if (simpleIndicators.some(i => lowerPrompt.includes(i))) {
    complexity = 'simple';
  }

  // Infer intent from prompt
  const inferredIntent = inferIntent(prompt, projectType);

  // Can we proceed without asking questions?
  // If prompt is long enough and has clear intent, we can proceed
  const canProceed = prompt.length > 50 || missingInfo.length <= 1;

  return {
    hasAmbiguity: missingInfo.length > 0,
    missingInfo,
    inferredIntent,
    suggestedQuestions,
    projectType,
    complexity,
    canProceed,
  };
}

function inferIntent(prompt: string, projectType: string): string {
  const actions = {
    'create': 'Build a new',
    'build': 'Construct a',
    'make': 'Create a',
    'design': 'Design and build a',
    'develop': 'Develop a',
  };

  let action = 'Build a';
  for (const [key, value] of Object.entries(actions)) {
    if (prompt.toLowerCase().includes(key)) {
      action = value;
      break;
    }
  }

  const typeNames: Record<string, string> = {
    landing: 'landing page',
    dashboard: 'dashboard interface',
    ecommerce: 'e-commerce platform',
    saas: 'SaaS application',
    portfolio: 'portfolio website',
    blog: 'blog platform',
    webapp: 'web application',
    api: 'API backend',
    social: 'social platform',
  };

  return `${action} ${typeNames[projectType] || 'web application'} based on the user's requirements.`;
}

// Format questions for display to user
export function formatClarificationQuestions(questions: ClarificationQuestion[]): string {
  if (questions.length === 0) return '';

  let output = "**Before I start building, I have a few quick questions:**\n\n";

  questions.forEach((q, i) => {
    output += `${i + 1}. ${q.question}\n   _${q.context}_\n\n`;
  });

  output += "_Feel free to answer these or just tell me to proceed with sensible defaults._";

  return output;
}

// Check if a message is answering clarification questions
export function isAnsweringQuestions(message: string, previousQuestions: ClarificationQuestion[]): boolean {
  if (!previousQuestions || previousQuestions.length === 0) return false;

  // Check for numbered answers or direct responses
  const hasNumberedAnswers = /^\s*\d+[.)]/m.test(message);
  const hasQuestionRelatedContent = previousQuestions.some(q => {
    const keywords = q.question.toLowerCase().split(' ').filter(w => w.length > 4);
    return keywords.some(k => message.toLowerCase().includes(k));
  });

  return hasNumberedAnswers || hasQuestionRelatedContent;
}

// Extract requirements from user's answers to clarification questions
export function extractRequirements(
  originalPrompt: string,
  clarificationAnswers: string,
  questions: ClarificationQuestion[]
): Record<string, string> {
  const requirements: Record<string, string> = {};

  // Try to match numbered answers
  const numberedPattern = /(\d+)[.)]\s*([^\n]+)/g;
  let match;
  let i = 0;

  while ((match = numberedPattern.exec(clarificationAnswers)) !== null && i < questions.length) {
    const questionCategory = questions[i]?.category;
    if (questionCategory) {
      requirements[questionCategory] = match[2].trim();
    }
    i++;
  }

  // If no numbered answers, treat the whole response as general requirements
  if (Object.keys(requirements).length === 0) {
    requirements.general = clarificationAnswers;
  }

  return requirements;
}

// Generate an enhanced prompt based on analysis
export function enhancePrompt(
  originalPrompt: string,
  analysis: PromptAnalysis,
  additionalRequirements?: Record<string, string>
): string {
  let enhanced = originalPrompt;

  // Add inferred context
  enhanced += `\n\n[AI Context: ${analysis.inferredIntent}]`;
  enhanced += `\n[Project Type: ${analysis.projectType}]`;
  enhanced += `\n[Complexity: ${analysis.complexity}]`;

  // Add any extracted requirements
  if (additionalRequirements) {
    enhanced += "\n\n[User Requirements:";
    for (const [key, value] of Object.entries(additionalRequirements)) {
      enhanced += `\n- ${key}: ${value}`;
    }
    enhanced += "]";
  }

  return enhanced;
}