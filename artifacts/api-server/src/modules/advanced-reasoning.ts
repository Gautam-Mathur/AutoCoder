// Advanced Reasoning Module - Multi-step planning, task decomposition, and architecture decisions
// This gives AutoCoder Claude-level reasoning depth

export interface ReasoningStep {
  id: number;
  type: 'analyze' | 'plan' | 'design' | 'implement' | 'validate';
  title: string;
  description: string;
  substeps?: string[];
  dependencies?: number[];
  output?: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface ReasoningChain {
  originalPrompt: string;
  understanding: PromptUnderstanding;
  steps: ReasoningStep[];
  architecture: ArchitectureDecision[];
  risks: RiskAssessment[];
  timeline: TimelineEstimate;
}

export interface PromptUnderstanding {
  coreIntent: string;
  implicitRequirements: string[];
  assumptionsMade: string[];
  ambiguities: string[];
  scope: 'minimal' | 'standard' | 'comprehensive';
}

export interface ArchitectureDecision {
  area: string;
  decision: string;
  reasoning: string;
  alternatives: { option: string; whyNot: string }[];
  confidence: 'high' | 'medium' | 'low';
}

export interface RiskAssessment {
  risk: string;
  severity: 'low' | 'medium' | 'high';
  mitigation: string;
}

export interface TimelineEstimate {
  complexity: 'trivial' | 'simple' | 'moderate' | 'complex' | 'very_complex';
  estimatedMinutes: number;
  breakdown: { task: string; minutes: number }[];
}

// Pattern database for recognizing common requirements
const REQUIREMENT_PATTERNS = {
  authentication: {
    triggers: ['login', 'signup', 'register', 'auth', 'user account', 'password', 'session'],
    implies: ['user model', 'password hashing', 'session management', 'protected routes'],
  },
  crud: {
    triggers: ['create', 'edit', 'delete', 'manage', 'list', 'add', 'remove', 'update'],
    implies: ['database', 'form handling', 'validation', 'API endpoints'],
  },
  realtime: {
    triggers: ['real-time', 'realtime', 'live', 'instant', 'push', 'notification', 'chat'],
    implies: ['WebSocket or SSE', 'event handling', 'state synchronization'],
  },
  payment: {
    triggers: ['payment', 'pay', 'checkout', 'cart', 'purchase', 'billing', 'subscription'],
    implies: ['payment gateway integration', 'order management', 'security considerations'],
  },
  search: {
    triggers: ['search', 'find', 'filter', 'query', 'lookup'],
    implies: ['search index', 'filtering logic', 'pagination'],
  },
  file: {
    triggers: ['upload', 'file', 'image', 'document', 'attachment', 'media'],
    implies: ['file storage', 'upload handling', 'file validation'],
  },
  api: {
    triggers: ['api', 'endpoint', 'rest', 'backend', 'server'],
    implies: ['route definitions', 'request validation', 'error handling', 'authentication'],
  },
  dashboard: {
    triggers: ['dashboard', 'analytics', 'metrics', 'stats', 'overview'],
    implies: ['data aggregation', 'charts/visualization', 'real-time updates'],
  },
};

// Complexity factors
const COMPLEXITY_WEIGHTS = {
  authentication: 3,
  crud: 2,
  realtime: 4,
  payment: 5,
  search: 2,
  file: 3,
  api: 2,
  dashboard: 3,
  database: 2,
  responsive: 1,
  animations: 1,
  darkMode: 1,
};

// Main reasoning function - analyzes prompt and creates execution plan
export function analyzeAndPlan(prompt: string, context?: any): ReasoningChain {
  const understanding = understandPrompt(prompt);
  const steps = generateExecutionSteps(understanding, prompt);
  const architecture = decideArchitecture(understanding, prompt);
  const risks = assessRisks(understanding, architecture);
  const timeline = estimateTimeline(steps);

  return {
    originalPrompt: prompt,
    understanding,
    steps,
    architecture,
    risks,
    timeline,
  };
}

// Deep prompt understanding
function understandPrompt(prompt: string): PromptUnderstanding {
  const lower = prompt.toLowerCase();

  // Detect core intent
  let coreIntent = 'Build a web application';
  const intentPatterns = [
    { pattern: /build (?:a |an )?(.+?)(?:\.|,|with|that|which|for|$)/i, prefix: 'Build' },
    { pattern: /create (?:a |an )?(.+?)(?:\.|,|with|that|which|for|$)/i, prefix: 'Create' },
    { pattern: /make (?:a |an )?(.+?)(?:\.|,|with|that|which|for|$)/i, prefix: 'Build' },
    { pattern: /design (?:a |an )?(.+?)(?:\.|,|with|that|which|for|$)/i, prefix: 'Design' },
    { pattern: /develop (?:a |an )?(.+?)(?:\.|,|with|that|which|for|$)/i, prefix: 'Develop' },
  ];

  for (const { pattern, prefix } of intentPatterns) {
    const match = prompt.match(pattern);
    if (match) {
      coreIntent = `${prefix} ${match[1].trim()}`;
      break;
    }
  }

  // Detect implicit requirements
  const implicitRequirements: string[] = [];
  for (const [category, data] of Object.entries(REQUIREMENT_PATTERNS)) {
    if (data.triggers.some(t => lower.includes(t))) {
      implicitRequirements.push(...data.implies.map(i => `${category}: ${i}`));
    }
  }

  // Detect assumptions we need to make
  const assumptionsMade: string[] = [];
  if (!lower.includes('mobile') && !lower.includes('desktop')) {
    assumptionsMade.push('Responsive design for all screen sizes');
  }
  if (!lower.includes('database') && !lower.includes('storage') && hasDataNeeds(lower)) {
    assumptionsMade.push('Data persistence required');
  }
  if (!lower.includes('style') && !lower.includes('theme')) {
    assumptionsMade.push('Modern, clean visual design');
  }

  // Detect ambiguities
  const ambiguities: string[] = [];
  if (lower.includes('user') && !lower.includes('role') && !lower.includes('type')) {
    ambiguities.push('User roles/permissions not specified');
  }
  if ((lower.includes('data') || lower.includes('content')) && !lower.includes('example')) {
    ambiguities.push('Specific data structure not defined');
  }

  // Determine scope
  const scope = determineScope(prompt);

  return {
    coreIntent,
    implicitRequirements: Array.from(new Set(implicitRequirements)),
    assumptionsMade,
    ambiguities,
    scope,
  };
}

function hasDataNeeds(lower: string): boolean {
  const dataKeywords = ['save', 'store', 'list', 'manage', 'create', 'add', 'track', 'user', 'order', 'product'];
  return dataKeywords.some(k => lower.includes(k));
}

function determineScope(prompt: string): 'minimal' | 'standard' | 'comprehensive' {
  const lower = prompt.toLowerCase();

  if (lower.includes('simple') || lower.includes('basic') || lower.includes('quick') || lower.includes('just')) {
    return 'minimal';
  }
  if (lower.includes('full') || lower.includes('complete') || lower.includes('comprehensive') || lower.includes('production')) {
    return 'comprehensive';
  }
  return 'standard';
}

// Generate step-by-step execution plan
function generateExecutionSteps(understanding: PromptUnderstanding, prompt: string): ReasoningStep[] {
  const steps: ReasoningStep[] = [];
  let stepId = 1;

  // Step 1: Analysis
  steps.push({
    id: stepId++,
    type: 'analyze',
    title: 'Analyze Requirements',
    description: 'Parse the user request and identify all requirements',
    substeps: [
      'Extract core functionality needed',
      'Identify data models required',
      'Determine UI components needed',
      'List API endpoints required',
    ],
    status: 'completed',
    output: understanding.coreIntent,
  });

  // Step 2: Design
  steps.push({
    id: stepId++,
    type: 'design',
    title: 'Design Architecture',
    description: 'Plan the technical architecture and structure',
    substeps: [
      'Choose appropriate tech stack',
      'Design database schema',
      'Plan component hierarchy',
      'Define API contract',
    ],
    dependencies: [1],
    status: 'pending',
  });

  // Step 3: Data Layer
  if (understanding.implicitRequirements.some(r => r.includes('database') || r.includes('model'))) {
    steps.push({
      id: stepId++,
      type: 'implement',
      title: 'Build Data Layer',
      description: 'Create database schema and data access layer',
      substeps: [
        'Define database schema',
        'Create ORM models',
        'Set up data validation',
        'Implement CRUD operations',
      ],
      dependencies: [2],
      status: 'pending',
    });
  }

  // Step 4: API Layer
  if (understanding.implicitRequirements.some(r => r.includes('API') || r.includes('endpoint'))) {
    steps.push({
      id: stepId++,
      type: 'implement',
      title: 'Build API Layer',
      description: 'Create backend API endpoints',
      substeps: [
        'Set up route handlers',
        'Implement request validation',
        'Add error handling',
        'Connect to data layer',
      ],
      dependencies: [stepId - 1],
      status: 'pending',
    });
  }

  // Step 5: UI Layer
  steps.push({
    id: stepId++,
    type: 'implement',
    title: 'Build User Interface',
    description: 'Create frontend components and pages',
    substeps: [
      'Create layout components',
      'Build feature components',
      'Implement forms and interactions',
      'Add styling and animations',
    ],
    dependencies: understanding.implicitRequirements.length > 0 ? [stepId - 1] : [2],
    status: 'pending',
  });

  // Step 6: Integration
  steps.push({
    id: stepId++,
    type: 'implement',
    title: 'Integrate Components',
    description: 'Connect frontend with backend',
    substeps: [
      'Wire up API calls',
      'Handle loading states',
      'Implement error handling',
      'Add success feedback',
    ],
    dependencies: [stepId - 1],
    status: 'pending',
  });

  // Step 7: Polish
  if (understanding.scope !== 'minimal') {
    steps.push({
      id: stepId++,
      type: 'validate',
      title: 'Polish & Validate',
      description: 'Final testing and refinements',
      substeps: [
        'Test all user flows',
        'Fix edge cases',
        'Optimize performance',
        'Add final styling touches',
      ],
      dependencies: [stepId - 1],
      status: 'pending',
    });
  }

  return steps;
}

// Make architecture decisions with reasoning
function decideArchitecture(understanding: PromptUnderstanding, prompt: string): ArchitectureDecision[] {
  const decisions: ArchitectureDecision[] = [];
  const lower = prompt.toLowerCase();

  // Frontend framework decision
  const needsComplexState = lower.includes('real-time') || lower.includes('dashboard') || lower.includes('interactive');
  decisions.push({
    area: 'Frontend Framework',
    decision: needsComplexState ? 'React with TypeScript' : 'Vanilla HTML/CSS/JS',
    reasoning: needsComplexState
      ? 'Complex state management and interactivity benefit from React\'s component model and hooks'
      : 'Simple requirements can be met with vanilla JS, reducing complexity and bundle size',
    alternatives: [
      { option: 'Vue.js', whyNot: 'React has broader ecosystem and more resources available' },
      { option: 'Svelte', whyNot: 'Smaller community, less pre-built components' },
    ],
    confidence: 'high',
  });

  // Backend decision
  const needsBackend = understanding.implicitRequirements.length > 0 || lower.includes('api') || lower.includes('data');
  if (needsBackend) {
    decisions.push({
      area: 'Backend Framework',
      decision: 'Express.js with TypeScript',
      reasoning: 'Lightweight, flexible, and shares TypeScript with frontend for consistency',
      alternatives: [
        { option: 'FastAPI (Python)', whyNot: 'Would require separate language, though faster for pure APIs' },
        { option: 'Next.js API Routes', whyNot: 'Tied to Next.js ecosystem, less flexibility' },
      ],
      confidence: 'high',
    });
  }

  // Database decision
  const needsDatabase = understanding.implicitRequirements.some(r => r.toLowerCase().includes('database'));
  if (needsDatabase) {
    const isRelational = lower.includes('relation') || lower.includes('join') || lower.includes('transaction');
    decisions.push({
      area: 'Database',
      decision: isRelational ? 'PostgreSQL with Drizzle ORM' : 'PostgreSQL with Drizzle ORM',
      reasoning: 'Robust, scalable, excellent TypeScript integration with Drizzle',
      alternatives: [
        { option: 'MongoDB', whyNot: 'Relational data patterns detected, SQL is more appropriate' },
        { option: 'SQLite', whyNot: 'Less scalable for production use' },
      ],
      confidence: 'high',
    });
  }

  // State management
  if (needsComplexState) {
    decisions.push({
      area: 'State Management',
      decision: 'TanStack Query + React Context',
      reasoning: 'Server state with TanStack Query, minimal client state with Context - avoids Redux complexity',
      alternatives: [
        { option: 'Redux', whyNot: 'Overkill for most applications, more boilerplate' },
        { option: 'Zustand', whyNot: 'Good option but TanStack Query handles most state needs' },
      ],
      confidence: 'high',
    });
  }

  // Styling decision
  decisions.push({
    area: 'Styling',
    decision: 'Tailwind CSS + CSS Variables',
    reasoning: 'Rapid development, consistent design system, easy theming with CSS variables',
    alternatives: [
      { option: 'Styled Components', whyNot: 'Runtime overhead, less performant' },
      { option: 'Plain CSS', whyNot: 'Slower to develop, harder to maintain consistency' },
    ],
    confidence: 'high',
  });

  return decisions;
}

// Assess potential risks
function assessRisks(understanding: PromptUnderstanding, architecture: ArchitectureDecision[]): RiskAssessment[] {
  const risks: RiskAssessment[] = [];

  if (understanding.ambiguities.length > 0) {
    risks.push({
      risk: 'Unclear requirements may lead to incorrect implementation',
      severity: 'medium',
      mitigation: 'Make reasonable assumptions and allow for easy iteration',
    });
  }

  if (understanding.implicitRequirements.some(r => r.includes('payment'))) {
    risks.push({
      risk: 'Payment integration requires careful security handling',
      severity: 'high',
      mitigation: 'Use established payment processors (Stripe), never store card data',
    });
  }

  if (understanding.implicitRequirements.some(r => r.includes('authentication'))) {
    risks.push({
      risk: 'Authentication security is critical',
      severity: 'high',
      mitigation: 'Use proven libraries, hash passwords with bcrypt, implement session management properly',
    });
  }

  if (understanding.scope === 'comprehensive') {
    risks.push({
      risk: 'Large scope may exceed time expectations',
      severity: 'medium',
      mitigation: 'Prioritize core features, build incrementally',
    });
  }

  return risks;
}

// Estimate timeline
function estimateTimeline(steps: ReasoningStep[]): TimelineEstimate {
  const breakdown: { task: string; minutes: number }[] = [];
  let totalMinutes = 0;

  for (const step of steps) {
    let minutes = 0;
    switch (step.type) {
      case 'analyze': minutes = 2; break;
      case 'design': minutes = 3; break;
      case 'implement': minutes = 5 + (step.substeps?.length || 0) * 2; break;
      case 'validate': minutes = 3; break;
      default: minutes = 5;
    }
    breakdown.push({ task: step.title, minutes });
    totalMinutes += minutes;
  }

  let complexity: TimelineEstimate['complexity'];
  if (totalMinutes < 10) complexity = 'trivial';
  else if (totalMinutes < 20) complexity = 'simple';
  else if (totalMinutes < 40) complexity = 'moderate';
  else if (totalMinutes < 60) complexity = 'complex';
  else complexity = 'very_complex';

  return { complexity, estimatedMinutes: totalMinutes, breakdown };
}

// Format reasoning chain as markdown for display
export function formatReasoningAsMarkdown(chain: ReasoningChain): string {
  let md = `## Understanding Your Request\n\n`;
  md += `**Core Intent:** ${chain.understanding.coreIntent}\n\n`;

  if (chain.understanding.implicitRequirements.length > 0) {
    md += `### What I Detected\n`;
    for (const req of chain.understanding.implicitRequirements.slice(0, 6)) {
      md += `- ${req}\n`;
    }
    md += '\n';
  }

  if (chain.understanding.assumptionsMade.length > 0) {
    md += `### Assumptions I'm Making\n`;
    for (const assumption of chain.understanding.assumptionsMade) {
      md += `- ${assumption}\n`;
    }
    md += '\n';
  }

  md += `### Execution Plan\n`;
  for (const step of chain.steps) {
    const icon = step.status === 'completed' ? '✅' : step.status === 'in_progress' ? '🔄' : '⏳';
    md += `${icon} **Step ${step.id}: ${step.title}**\n`;
    md += `   ${step.description}\n`;
  }
  md += '\n';

  md += `### Architecture Decisions\n`;
  for (const decision of chain.architecture) {
    md += `- **${decision.area}:** ${decision.decision}\n`;
    md += `  _${decision.reasoning}_\n`;
  }
  md += '\n';

  if (chain.risks.length > 0) {
    md += `### Risk Assessment\n`;
    for (const risk of chain.risks) {
      const icon = risk.severity === 'high' ? '🔴' : risk.severity === 'medium' ? '🟡' : '🟢';
      md += `${icon} ${risk.risk}\n`;
      md += `   → ${risk.mitigation}\n`;
    }
    md += '\n';
  }

  md += `### Timeline Estimate\n`;
  md += `**Complexity:** ${chain.timeline.complexity}\n`;
  md += `**Estimated Time:** ~${chain.timeline.estimatedMinutes} minutes\n`;

  return md;
}

// Export a simple analysis for quick use
export function quickAnalysis(prompt: string): {
  intent: string;
  complexity: string;
  keyFeatures: string[];
  warnings: string[];
} {
  const chain = analyzeAndPlan(prompt);

  return {
    intent: chain.understanding.coreIntent,
    complexity: chain.timeline.complexity,
    keyFeatures: chain.understanding.implicitRequirements.slice(0, 5),
    warnings: chain.risks.filter(r => r.severity === 'high').map(r => r.risk),
  };
}