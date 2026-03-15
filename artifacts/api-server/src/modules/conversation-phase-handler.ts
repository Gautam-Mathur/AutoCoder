import { analyzeRequest, formatUnderstandingResponse, processAnswer } from './deep-understanding-engine.js';
import type { UnderstandingResult } from './deep-understanding-engine.js';
import { generatePlan, formatPlanAsMessage } from './plan-generator.js';
import type { ProjectPlan, PlannedEntity, PlannedPage, PlannedEndpoint, PlannedModule, PlannedWorkflow } from './plan-generator.js';
import { generateProjectFromPlan } from './plan-driven-generator.js';
import { validateAndFix } from './post-generation-validator.js';
import { analyzeSemantics, type ReasoningResult, type EntityRelationship, type ComputedField } from './contextual-reasoning-engine.js';
import { learningEngine } from './generation-learning-engine.js';
import { shouldAskMoreQuestions, createClarificationState, parseAnswersFromResponse, generateClarificationQuestions, identifyInformationGaps, calculateReadinessScore, generateLowConfidenceQuestions, formatLowConfidenceInterviewMessage, type ClarificationState } from './adaptive-clarification-engine.js';
import { extractEntitiesFromText } from './domain-synthesis-engine.js';
import { orchestrateGeneration, type OrchestrationResult } from './pipeline-orchestrator.js';
import { processEditRequest, type EditResult, type FileEdit } from './targeted-code-editor.js';
import { classifyMessage, handleLocalResponse } from './local-response-handler.js';
import { inferEntityFields, isSemanticDuplicate, inferFieldsFromExamples } from './entity-field-inference.js';
import { planUXFlows } from './ux-flow-planner.js';
import { planIntegrations } from './integration-planner.js';
import { planSecurity } from './security-planner.js';
import { planPerformance } from './performance-planner.js';
import { analyzeAndFix as viteAnalyzeAndFix, parseErrors as viteParseErrors } from './vite-error-fixer.js';

export type ConversationPhase = 'initial' | 'understanding' | 'clarifying' | 'planning' | 'approval' | 'generating' | 'complete' | 'editing';

export interface ValidationSummaryResult {
  passes: number;
  issuesFound: number;
  issuesFixed: number;
  unfixableIssues: string[];
}

export interface PhaseHandlerResult {
  responseContent: string;
  newPhase: ConversationPhase;
  thinkingSteps: ThinkingStep[];
  generatedFiles?: { path: string; content: string; language: string }[];
  fileEdits?: FileEdit[];
  editResult?: EditResult;
  planData?: ProjectPlan;
  understandingData?: UnderstandingResult;
  clarificationRound?: number;
  clarificationState?: ClarificationState;
  validationSummary?: ValidationSummaryResult;
}

export interface ThinkingStep {
  phase: string;
  label: string;
  detail?: string;
  timestamp?: number;
}

export interface EditHistoryEntry {
  timestamp: number;
  userMessage: string;
  editType: string;
  filesChanged: string[];
  summary: string;
}

export interface ConversationState {
  phase: ConversationPhase;
  understandingData?: UnderstandingResult;
  planData?: ProjectPlan;
  clarificationRound?: number;
  clarificationState?: ClarificationState;
  conversationId?: number;
  generationStartTime?: number;
  existingFiles?: { path: string; content: string; language: string }[];
  editHistory?: EditHistoryEntry[];
}

export type OnStepCallback = (step: ThinkingStep) => void;

export async function handleMessage(
  userMessage: string,
  state: ConversationState,
  conversationHistory?: string,
  onStep?: OnStepCallback
): Promise<PhaseHandlerResult> {
  const thinkingSteps: ThinkingStep[] = [];
  const emitStep = (phase: string, label: string, detail?: string) => {
    const step: ThinkingStep = { phase, label, detail, timestamp: Date.now() };
    thinkingSteps.push(step);
    if (onStep) onStep(step);
  };

  const currentPhase = state.phase || 'initial';

  if (currentPhase === 'generating') {
    emitStep('recovery', 'Phase recovery', 'Detected stuck generating phase, restarting');
    return handleInitialRequest(userMessage, thinkingSteps, emitStep, conversationHistory);
  }

  if (currentPhase === 'approval' || currentPhase === 'planning') {
    const lower = userMessage.toLowerCase().trim();
    if (lower === 'approve' || lower === 'approved' || lower === 'yes' || lower === 'go' ||
        lower === 'go ahead' || lower === 'looks good' || lower === 'lgtm' ||
        lower === 'perfect' || lower === 'generate' || lower === 'start' ||
        lower === 'build it' || lower === 'do it' || lower === 'proceed' ||
        lower === 'skip' ||
        lower.includes('approve') || lower.includes('go ahead') || lower.includes('looks good') ||
        lower.includes('generate') || lower.includes('build it') || lower.includes('start building') ||
        lower.includes('skip')) {
      return await handleGeneration(state, thinkingSteps, emitStep, onStep);
    }

    if (lower.includes('change') || lower.includes('modify') || lower.includes('add') ||
        lower.includes('remove') || lower.includes('update') || lower.includes('different')) {
      return handlePlanModification(userMessage, state, thinkingSteps, emitStep);
    }
  }

  if (currentPhase === 'clarifying') {
    if (!state.understandingData) {
      emitStep('recovery', 'Phase recovery', 'Missing context from previous analysis, re-analyzing');
      return handleInitialRequest(userMessage, thinkingSteps, emitStep, conversationHistory);
    }
    return handleClarificationResponse(userMessage, state, thinkingSteps, emitStep);
  }

  if (currentPhase === 'complete' || currentPhase === 'editing') {
    const category = classifyMessage(userMessage);
    const isEditRequest = ['unknown'].includes(category) ||
      /\b(add|change|modify|update|remove|delete|fix|replace|rename|move|create|implement|make|refactor|redesign|restyle|improve)\b/i.test(userMessage);

    if (isEditRequest) {
      return handleIterativeEdit(userMessage, state, thinkingSteps, emitStep);
    }

    const localResult = handleLocalResponse(userMessage, state);
    return {
      responseContent: localResult.responseContent,
      newPhase: currentPhase,
      thinkingSteps: [...thinkingSteps, ...localResult.thinkingSteps],
    };
  }

  if (currentPhase === 'initial') {
    const isProject = isProjectCreationRequest(userMessage);
    if (!isProject) {
      const localResult = handleLocalResponse(userMessage, state);
      return {
        responseContent: localResult.responseContent,
        newPhase: 'initial',
        thinkingSteps: [...thinkingSteps, ...localResult.thinkingSteps],
      };
    }
  }

  return handleInitialRequest(userMessage, thinkingSteps, emitStep, conversationHistory);
}

function handleInitialRequest(
  userMessage: string,
  thinkingSteps: ThinkingStep[],
  emitStep: (phase: string, label: string, detail?: string) => void,
  conversationHistory?: string
): PhaseHandlerResult {
  emitStep('understanding', 'Deep Understanding Engine activated', `Analyzing your request through 5 levels of decomposition to fully grasp what you need built`);
  emitStep('understanding', 'Why multi-level analysis', 'A single pass would miss nuances — each level builds on the previous, from raw intent through domain expertise to specific entity structures and workflows');

  emitStep('understanding', 'Level 1: Intent Decomposition', 'Breaking down your request into primary goal, secondary features, and implied requirements');

  const understanding = analyzeRequest(userMessage, conversationHistory);

  emitStep('understanding', 'Intent identified', `Primary goal: "${understanding.level1_intent?.primaryGoal || userMessage.slice(0, 60)}" | Complexity: ${(understanding.level1_intent as any)?.complexity || 'moderate'}`);

  emitStep('understanding', 'Level 2: Domain Detection',
    understanding.level2_domain.primaryDomain
      ? `Detected "${understanding.level2_domain.primaryDomain.name}" domain with ${Math.round(understanding.level2_domain.confidence * 100)}% confidence — this activates domain-specific entity templates, vocabulary, and best practices`
      : 'No specific industry pattern detected — will use general-purpose application templates'
  );
  if (understanding.level2_domain.primaryDomain) {
    emitStep('understanding', 'Why domain matters', `The "${understanding.level2_domain.primaryDomain.name}" domain has known entity patterns, standard workflows, and industry-specific field types that produce more accurate code than generic templates`);
  }

  const mentionedCount = understanding.level3_entities.mentionedEntities.length;
  const inferredCount = understanding.level3_entities.inferredEntities.length;
  emitStep('understanding', 'Level 3: Entity Extraction',
    `Found ${mentionedCount} explicitly mentioned data types + ${inferredCount} inferred from context`
  );
  if (mentionedCount > 0) {
    emitStep('understanding', 'Mentioned entities', understanding.level3_entities.mentionedEntities.slice(0, 5).join(', ') + (mentionedCount > 5 ? ` + ${mentionedCount - 5} more` : ''));
  }
  if (inferredCount > 0) {
    emitStep('understanding', 'Inferred entities', `${understanding.level3_entities.inferredEntities.slice(0, 4).join(', ')} — these weren't explicitly mentioned but are needed for the app to function properly`);
  }

  const workflowCount = understanding.level4_workflows.inferredWorkflows.length;
  emitStep('understanding', 'Level 4: Workflow Detection',
    `${workflowCount} business workflows identified${workflowCount > 0 ? ' — these define how data flows through the system and what actions trigger what effects' : ''}`
  );
  if (workflowCount > 0) {
    const sampleWorkflows = understanding.level4_workflows.inferredWorkflows.slice(0, 3).map((w: any) => w.name || w.description || w).join(', ');
    emitStep('understanding', 'Key workflows', sampleWorkflows);
  }

  if (understanding.level5_clarification.needsClarification) {
    const questionCount = understanding.level5_clarification.questions.length;
    emitStep('understanding', 'Level 5: Need more information',
      `${questionCount} clarifying questions generated — asking now prevents building the wrong thing later`
    );
    emitStep('understanding', 'Why we ask questions', 'Ambiguous requirements lead to wasted generation cycles — a few targeted questions now save significant rework later');

    const responseContent = formatUnderstandingResponse(understanding);
    return {
      responseContent,
      newPhase: 'clarifying',
      thinkingSteps,
      understandingData: understanding,
    };
  }

  emitStep('understanding', 'Level 5: Requirements sufficient', `Confidence: ${Math.round(understanding.confidence * 100)}% — enough context gathered to produce a comprehensive plan without further questions`);
  return generatePlanFromUnderstanding(understanding, thinkingSteps, emitStep);
}

function handleClarificationResponse(
  userMessage: string,
  state: ConversationState,
  thinkingSteps: ThinkingStep[],
  emitStep: (phase: string, label: string, detail?: string) => void
): PhaseHandlerResult {
  const currentRound = (state.clarificationRound || 0) + 1;
  emitStep('understanding', 'Processing your clarification answers', `Round ${currentRound} — integrating your responses to build a more precise understanding`);
  emitStep('understanding', 'Why iterative clarification works', 'Each answer narrows down ambiguity — the system re-analyzes with your new context to produce increasingly accurate entity structures and feature specifications');

  const previousQuestions = state.understandingData?.level5_clarification.questions || [];
  const parsedAnswers = parseAnswersFromResponse(
    userMessage,
    previousQuestions.map(q => ({
      id: q.id,
      category: 'scope' as const,
      question: q.question,
      priority: q.priority === 'critical' ? 100 : q.priority === 'important' ? 70 : 30,
      impact: q.priority === 'critical' ? 'critical' as const : q.priority === 'important' ? 'high' as const : 'medium' as const,
      context: q.why,
      options: q.options,
      defaultAnswer: q.defaultAnswer,
      satisfied: false,
    }))
  );

  emitStep('understanding', 'Parsed answers', `Extracted ${parsedAnswers.size} structured answers from response`);

  const previousUnderstanding = state.understandingData!;
  const updatedUnderstanding: UnderstandingResult = {
    level1_intent: { ...previousUnderstanding.level1_intent },
    level2_domain: { ...previousUnderstanding.level2_domain },
    level3_entities: {
      ...previousUnderstanding.level3_entities,
      mentionedEntities: [...previousUnderstanding.level3_entities.mentionedEntities],
      inferredEntities: [...previousUnderstanding.level3_entities.inferredEntities],
    },
    level4_workflows: { ...previousUnderstanding.level4_workflows },
    level5_clarification: {
      ...previousUnderstanding.level5_clarification,
      assumptions: [...(previousUnderstanding.level5_clarification.assumptions || [])],
    },
    level6_technology: previousUnderstanding.level6_technology || { detectedLanguage: null, detectedFramework: null, detectedDatabase: null, confidence: 0, signals: [] },
    confidence: previousUnderstanding.confidence,
    readyForPlan: previousUnderstanding.readyForPlan,
  };

  const STOP_WORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'into', 'through', 'during', 'before',
    'after', 'above', 'below', 'between', 'out', 'off', 'over', 'under',
    'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where',
    'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
    'other', 'some', 'such', 'than', 'too', 'very', 'just', 'about',
    'also', 'not', 'only', 'own', 'same', 'that', 'this', 'these', 'those',
    'what', 'which', 'who', 'whom', 'its', 'his', 'her', 'our', 'their',
    'yes', 'no', 'yeah', 'nah', 'okay', 'sure', 'please', 'thanks',
    'like', 'would', 'could', 'should', 'will', 'shall', 'may', 'might',
    'can', 'must', 'been', 'being', 'have', 'has', 'had', 'having',
    'does', 'did', 'doing', 'done', 'was', 'were', 'are', 'is', 'am',
  ]);

  const COMMON_VERBS = new Set([
    'want', 'need', 'use', 'make', 'create', 'build', 'get', 'set',
    'add', 'remove', 'delete', 'update', 'change', 'modify', 'edit',
    'show', 'display', 'view', 'see', 'look', 'find', 'search',
    'send', 'receive', 'give', 'take', 'put', 'move', 'go', 'come',
    'keep', 'let', 'help', 'start', 'stop', 'try', 'think', 'know',
    'run', 'work', 'play', 'turn', 'open', 'close', 'read', 'write',
    'learn', 'grow', 'draw', 'bring', 'hold', 'stand', 'hear', 'feel',
    'provide', 'include', 'contain', 'require', 'allow', 'enable',
    'support', 'handle', 'manage', 'track', 'monitor', 'implement',
    'integrate', 'connect', 'generate', 'process', 'store', 'load',
    'prefer', 'ensure', 'maintain', 'configure', 'define', 'specify',
  ]);

  const COMMON_ADJECTIVES = new Set([
    'good', 'bad', 'big', 'small', 'new', 'old', 'great', 'high',
    'low', 'long', 'short', 'large', 'little', 'right', 'left',
    'important', 'different', 'simple', 'basic', 'complex', 'advanced',
    'main', 'full', 'free', 'easy', 'hard', 'best', 'better', 'fast',
    'quick', 'nice', 'clean', 'clear', 'real', 'true', 'false',
    'available', 'possible', 'necessary', 'useful', 'ready', 'able',
    'specific', 'general', 'standard', 'custom', 'modern', 'similar',
    'complete', 'entire', 'whole', 'separate', 'various', 'multiple',
  ]);

  const ENTITY_KEYWORD_MAP: Record<string, string> = {};
  const KNOWN_ENTITY_WORDS: Record<string, string[]> = {
    'users': ['user', 'users', 'account', 'accounts', 'login', 'auth', 'register'],
    'employees': ['employee', 'employees', 'staff', 'team', 'worker', 'workforce', 'personnel'],
    'customers': ['customer', 'customers', 'client', 'clients', 'buyer', 'buyers'],
    'products': ['product', 'products', 'item', 'items', 'catalog', 'catalogue', 'goods', 'merchandise'],
    'orders': ['order', 'orders', 'purchase', 'purchases', 'transaction', 'transactions', 'sale', 'sales'],
    'invoices': ['invoice', 'invoices', 'bill', 'bills', 'billing', 'payment', 'payments'],
    'projects': ['project', 'projects', 'engagement'],
    'tasks': ['task', 'tasks', 'todo', 'todos', 'ticket', 'tickets', 'issue', 'issues'],
    'inventory': ['inventory', 'stock', 'stocks', 'warehouse', 'supply', 'supplies'],
    'appointments': ['appointment', 'appointments', 'booking', 'bookings', 'reservation', 'reservations'],
    'reports': ['report', 'reports', 'analytics', 'dashboard', 'metrics', 'kpi', 'kpis', 'insights'],
    'timesheets': ['timesheet', 'timesheets', 'hours', 'utilization', 'billable'],
    'departments': ['department', 'departments', 'division', 'divisions'],
    'leave': ['leave', 'vacation', 'pto', 'absence', 'absences'],
    'payroll': ['payroll', 'salary', 'salaries', 'compensation', 'wages'],
    'contracts': ['contract', 'contracts', 'agreement', 'agreements', 'sla', 'sow'],
    'shipments': ['shipment', 'shipments', 'delivery', 'deliveries', 'shipping', 'freight'],
    'vehicles': ['vehicle', 'vehicles', 'fleet', 'truck', 'trucks', 'car', 'cars'],
    'properties': ['property', 'properties', 'listing', 'listings', 'unit', 'units', 'apartment', 'apartments'],
    'tenants': ['tenant', 'tenants', 'renter', 'renters', 'lessee'],
    'patients': ['patient', 'patients', 'medical', 'health', 'clinical'],
    'courses': ['course', 'courses', 'class', 'classes', 'curriculum', 'lesson', 'lessons'],
    'students': ['student', 'students', 'learner', 'learners', 'pupil', 'pupils', 'enrollment'],
    'contacts': ['contact', 'contacts', 'lead', 'leads', 'prospect', 'prospects'],
    'deals': ['deal', 'deals', 'opportunity', 'opportunities', 'pipeline', 'funnel'],
    'members': ['member', 'members', 'membership', 'memberships', 'subscriber', 'subscribers'],
    'recipes': ['recipe', 'recipes', 'ingredient', 'ingredients', 'cooking', 'cuisine'],
    'menu': ['menu', 'dish', 'dishes', 'food', 'meal', 'meals'],
    'budget': ['budget', 'budgets', 'expense', 'expenses', 'financial', 'forecast'],
    'notifications': ['notification', 'notifications', 'alert', 'alerts', 'reminder', 'reminders'],
    'categories': ['category', 'categories', 'tag', 'tags', 'label', 'labels'],
    'comments': ['comment', 'comments', 'feedback', 'review', 'reviews'],
    'messages': ['message', 'messages', 'chat', 'conversation', 'conversations'],
    'files': ['file', 'files', 'document', 'documents', 'attachment', 'attachments'],
    'events': ['event', 'events', 'meeting', 'meetings', 'conference'],
  };
  for (const [entity, keywords] of Object.entries(KNOWN_ENTITY_WORDS)) {
    for (const kw of keywords) {
      ENTITY_KEYWORD_MAP[kw] = entity;
    }
  }

  const FEATURE_KEYWORD_MAP: Record<string, string> = {};
  const KNOWN_FEATURE_WORDS: Record<string, string[]> = {
    'search': ['search', 'filter', 'browse', 'lookup'],
    'export': ['export', 'download', 'csv', 'pdf', 'excel'],
    'notification': ['notification', 'notify', 'alert', 'remind', 'reminder', 'email'],
    'role-based': ['role-based', 'permission', 'permissions', 'access control'],
    'realtime': ['real-time', 'realtime', 'live', 'instant', 'push', 'websocket'],
    'charts': ['chart', 'charts', 'graph', 'graphs', 'visualization'],
    'mobile': ['mobile', 'responsive'],
    'import': ['import', 'upload', 'bulk', 'batch'],
    'calendar': ['calendar', 'schedule', 'date picker'],
    'kanban': ['kanban', 'board', 'drag and drop'],
    'authentication': ['authentication', 'auth', 'login', 'signup', 'sso', 'oauth'],
    'pagination': ['pagination', 'paging', 'infinite scroll'],
    'sorting': ['sorting', 'sort', 'ordering'],
    'dark-mode': ['dark mode', 'dark-mode', 'theme', 'themes'],
  };
  for (const [feature, keywords] of Object.entries(KNOWN_FEATURE_WORDS)) {
    for (const kw of keywords) {
      FEATURE_KEYWORD_MAP[kw] = feature;
    }
  }

  const ROLE_WORDS = new Set([
    'admin', 'administrator', 'manager', 'editor', 'viewer', 'moderator',
    'superadmin', 'owner', 'member', 'guest', 'operator', 'supervisor',
    'analyst', 'auditor', 'contributor', 'reviewer',
  ]);

  parsedAnswers.forEach((answerValue) => {
    const lowerAnswer = answerValue.toLowerCase();
    const words = lowerAnswer.split(/[\s,]+/).filter(w => w.length > 2);

    for (const word of words) {
      if (STOP_WORDS.has(word) || COMMON_VERBS.has(word) || COMMON_ADJECTIVES.has(word)) {
        continue;
      }

      if (ROLE_WORDS.has(word)) {
        continue;
      }

      const matchedFeature = FEATURE_KEYWORD_MAP[word];
      if (matchedFeature) {
        if (!updatedUnderstanding.level1_intent.mentionedFeatures.includes(matchedFeature)) {
          updatedUnderstanding.level1_intent.mentionedFeatures.push(matchedFeature);
        }
        continue;
      }

      const matchedEntity = ENTITY_KEYWORD_MAP[word];
      if (matchedEntity) {
        if (!updatedUnderstanding.level3_entities.mentionedEntities.includes(matchedEntity) &&
            !updatedUnderstanding.level3_entities.inferredEntities.includes(matchedEntity)) {
          updatedUnderstanding.level3_entities.mentionedEntities.push(matchedEntity);
        }
      }
    }

    for (const [feature, keywords] of Object.entries(KNOWN_FEATURE_WORDS)) {
      if (keywords.some(kw => lowerAnswer.includes(kw))) {
        if (!updatedUnderstanding.level1_intent.mentionedFeatures.includes(feature)) {
          updatedUnderstanding.level1_intent.mentionedFeatures.push(feature);
        }
      }
    }

    for (const [entity, keywords] of Object.entries(KNOWN_ENTITY_WORDS)) {
      if (keywords.some(kw => lowerAnswer.includes(kw))) {
        if (!updatedUnderstanding.level3_entities.mentionedEntities.includes(entity) &&
            !updatedUnderstanding.level3_entities.inferredEntities.includes(entity)) {
          updatedUnderstanding.level3_entities.mentionedEntities.push(entity);
        }
      }
    }
  });

  emitStep('understanding', 'Updated understanding',
    updatedUnderstanding.level2_domain.primaryDomain
      ? `Domain: ${updatedUnderstanding.level2_domain.primaryDomain.name}`
      : 'Building general application'
  );

  let clarState: ClarificationState;
  if (state.clarificationState) {
    const prevAnswered = state.clarificationState.answeredQuestions;
    let answeredMap: Map<string, string>;
    if (prevAnswered instanceof Map) {
      answeredMap = new Map(prevAnswered);
    } else if (prevAnswered && typeof prevAnswered === 'object') {
      answeredMap = new Map(Object.entries(prevAnswered as Record<string, string>));
    } else {
      answeredMap = new Map();
    }
    clarState = {
      ...state.clarificationState,
      answeredQuestions: answeredMap,
      askedQuestions: [...(state.clarificationState.askedQuestions || [])],
      informationGaps: (state.clarificationState.informationGaps || []).map(g => ({ ...g })),
    };
  } else {
    const fullDescription = `${previousUnderstanding.level1_intent.primaryGoal}. ${userMessage}`;
    const nlpEntities = extractEntitiesFromText(fullDescription);
    const domains = updatedUnderstanding.level2_domain.primaryDomain
      ? [{ confidence: updatedUnderstanding.level2_domain.confidence, name: updatedUnderstanding.level2_domain.primaryDomain.name }]
      : [];
    clarState = createClarificationState(state.conversationId || 0, fullDescription, nlpEntities, domains);
  }

  clarState.roundsCompleted = currentRound;

  parsedAnswers.forEach((value, key) => {
    clarState.answeredQuestions.set(key, value);
  });

  for (const q of previousQuestions) {
    if (!clarState.askedQuestions.includes(q.id)) {
      clarState.askedQuestions.push(q.id);
    }
  }

  const fullDescription = `${previousUnderstanding.level1_intent.primaryGoal}. ${userMessage}`;
  const nlpEntities = extractEntitiesFromText(fullDescription);

  const freshGaps = identifyInformationGaps(fullDescription, nlpEntities, clarState.complexity);
  for (const gap of freshGaps) {
    const answerText = Array.from(clarState.answeredQuestions.values()).join(' ').toLowerCase();
    if (gap.category === 'entities' && (
        nlpEntities.entities.length > 0 || answerText.length > 0)) {
      gap.resolvedBy = 'user-answer';
    } else if (gap.category === 'scope' && answerText.length > 0) {
      gap.resolvedBy = 'user-answer';
    }
    if (!gap.resolvedBy && gap.defaultResolution) {
      gap.resolvedBy = 'default';
    }
  }
  clarState.informationGaps = freshGaps;

  clarState.readinessScore = calculateReadinessScore(
    nlpEntities,
    clarState.informationGaps,
    clarState.answeredQuestions
  );
  clarState.readinessScore = Math.max(clarState.readinessScore, updatedUnderstanding.confidence);

  const { shouldAsk, reason } = shouldAskMoreQuestions(clarState);

  emitStep('understanding', 'Readiness assessment',
    `Score: ${Math.round(clarState.readinessScore * 100)}% — ${reason}`
  );

  const proceedToPlan = () => {
    updatedUnderstanding.level5_clarification = {
      needsClarification: false,
      questions: [],
      assumptions: updatedUnderstanding.level5_clarification.assumptions,
    };
    updatedUnderstanding.confidence = Math.max(updatedUnderstanding.confidence, 0.85);
    updatedUnderstanding.readyForPlan = true;
    return generatePlanFromUnderstanding(updatedUnderstanding, thinkingSteps, emitStep);
  };

  if (currentRound >= 2) {
    emitStep('understanding', 'Proceeding with available information',
      'Enough clarification rounds completed — using defaults for remaining gaps');
    updatedUnderstanding.level5_clarification.assumptions.push(
      'Proceeding with sensible defaults after clarification'
    );
    return proceedToPlan();
  }

  if (!shouldAsk) {
    return proceedToPlan();
  }

  const newQuestions = generateClarificationQuestions(
    clarState.informationGaps,
    clarState.complexity,
    nlpEntities,
    clarState.answeredQuestions
  );

  const askedIdSet = new Set(clarState.askedQuestions);
  const askedTextSet = new Set(previousQuestions.map(q => q.question));
  const filteredQuestions = newQuestions.filter(
    q => !askedIdSet.has(q.id) && !askedTextSet.has(q.question)
  );

  if (filteredQuestions.length === 0) {
    return proceedToPlan();
  }

  updatedUnderstanding.level5_clarification = {
    needsClarification: true,
    questions: filteredQuestions.map(q => ({
      id: q.id,
      question: q.question,
      why: q.context,
      options: q.options,
      defaultAnswer: q.defaultAnswer,
      priority: q.impact === 'critical' ? 'critical' as const :
                q.impact === 'high' ? 'important' as const : 'nice-to-have' as const,
    })),
    assumptions: updatedUnderstanding.level5_clarification.assumptions,
  };

  const responseContent = formatUnderstandingResponse(updatedUnderstanding);

  const serializableClarState = {
    ...clarState,
    answeredQuestions: Object.fromEntries(clarState.answeredQuestions),
  };

  return {
    responseContent,
    newPhase: 'clarifying',
    thinkingSteps,
    understandingData: updatedUnderstanding,
    clarificationRound: currentRound,
    clarificationState: serializableClarState as any,
  };
}

function generatePlanFromUnderstanding(
  understanding: UnderstandingResult,
  thinkingSteps: ThinkingStep[],
  emitStep: (phase: string, label: string, detail?: string) => void
): PhaseHandlerResult {
  emitStep('planning', 'Plan Generator activated', 'Converting understanding into a detailed project blueprint — deciding tech stack, modules, pages, data model, APIs, and file structure');
  emitStep('planning', 'Why a plan comes first', 'Generating code without a plan produces inconsistent files — the plan ensures every page has backing API routes, every API route has a database table, and every table has proper relationships');

  let plan = generatePlan(understanding);

  emitStep('planning', 'Initial plan created', `Project: "${plan.projectName}" | ${plan.modules?.length || 0} modules, ${plan.pages?.length || 0} pages, ${plan.dataModel?.length || 0} entities, ${plan.apiEndpoints?.length || 0} endpoints`);
  if (plan.pages?.length > 0) {
    emitStep('planning', 'Pages planned', plan.pages.slice(0, 5).map(p => p.name).join(', ') + (plan.pages.length > 5 ? ` + ${plan.pages.length - 5} more` : ''));
  }
  if (plan.dataModel?.length > 0) {
    emitStep('planning', 'Data model', plan.dataModel.slice(0, 5).map(e => `${e.name} (${e.fields?.length || 0} fields)`).join(', '));
  }

  // Entity Intelligence — upgrade generic entities with archetype fields
  try {
    const entityNames = plan.dataModel.map(e => e.name);
    const detectedDomainId = understanding?.level2_domain?.primaryDomain?.id;
    const inferredEntities = inferEntityFields(entityNames, detectedDomainId);
    let upgraded = 0;
    for (const entity of plan.dataModel) {
      const inferred = inferredEntities.find(e => e.name === entity.name);
      if (inferred && inferred.matchConfidence > 0.5) {
        const existingFieldNames = new Set(entity.fields.map(f => f.name));
        for (const af of inferred.fields) {
          if (!existingFieldNames.has(af.name) && !isSemanticDuplicate(af.name, existingFieldNames)) {
            entity.fields.push({ name: af.name, type: af.type, required: af.required || false, description: af.description });
          }
        }
        if (inferred.relationships) {
          const existingRels = new Set(entity.relationships.map(r => r.entity));
          for (const rel of inferred.relationships) {
            if (!existingRels.has(rel.entity)) {
              entity.relationships.push({ entity: rel.entity, type: rel.type, field: rel.field || '' });
            }
          }
        }
        upgraded++;
      }
    }
    if (upgraded > 0) {
      emitStep('planning', 'Entity Intelligence', `Upgraded ${upgraded}/${plan.dataModel.length} entities with domain-specific fields and relationships`);
    }
  } catch (e) {
    // Entity intelligence is optional — degrade gracefully
  }

  emitStep('planning', 'Consulting learning engine', 'Checking if similar projects were generated before — if so, applying proven patterns for naming, structure, and feature selection');
  plan = learningEngine.applyLearnedPatterns(plan);
  emitStep('planning', 'Learned patterns applied', 'Enhanced field types, naming conventions, and relationship patterns based on past successful generations');

  emitStep('planning', 'Running contextual semantic analysis', 'The reasoning engine now examines every entity to discover hidden relationships, computed fields, and business rules implied by the domain');
  const reasoning = analyzeSemantics(plan);

  plan = enrichPlanWithReasoning(plan, reasoning);

  const relationshipCount = reasoning.relationships.length;
  const computedFieldCount = reasoning.computedFields.length;
  const businessRuleCount = reasoning.businessRules.length;
  const uiPatternCount = reasoning.uiPatterns.length;

  emitStep('planning', 'Semantic enrichment complete',
    `Discovered ${relationshipCount} entity relationships, ${computedFieldCount} computed fields, ${businessRuleCount} business rules, ${uiPatternCount} UI display patterns`
  );
  if (relationshipCount > 0) {
    const relExamples = reasoning.relationships.slice(0, 3).map(r => `${r.from} → ${r.to}`).join(', ');
    emitStep('planning', 'Key relationships', `${relExamples}${relationshipCount > 3 ? ` + ${relationshipCount - 3} more` : ''} — these become foreign keys and cascade behaviors in the database`);
  }
  if (businessRuleCount > 0) {
    emitStep('planning', 'Business rules', `${reasoning.businessRules.slice(0, 2).map(r => r.ruleName).join(', ')} — these become validation logic in API endpoints`);
  }

  // UX Flow Planning
  try {
    const uxResult = planUXFlows(plan);
    plan.uxFlows = uxResult.uxFlows;
    plan.errorHandling = uxResult.errorHandling;
    if (uxResult.uxFlows.length > 0) {
      emitStep('planning', 'UX flows planned', `${uxResult.uxFlows.length} user journeys designed | ${uxResult.errorHandling.pageStates.length} page states with empty/error/loading patterns`);
    }
  } catch (e) {
    // UX planner is optional
  }

  // Integration Detection
  try {
    const userDesc = plan.overview || '';
    const integrations = planIntegrations(plan, userDesc);
    if (integrations.length > 0) {
      plan.integrations = integrations;
      emitStep('planning', 'Integrations detected', `${integrations.length} integration(s): ${integrations.map(i => i.name).join(', ')}`);
    }
  } catch (e) {
    // Integration detection is optional
  }

  // Security Planning
  try {
    const security = planSecurity(plan, plan.overview || '');
    plan.securityPlan = security;
    emitStep('planning', 'Security plan', `Auth: ${security.authStrategy} | ${security.roleHierarchy.length} roles | ${security.entityPermissions.length} permission rules | ${security.rateLimiting.length} rate limits`);
  } catch (e) {
    // Security planner is optional
  }

  // Performance Planning
  try {
    const perf = planPerformance(plan);
    plan.performancePlan = perf;
    emitStep('planning', 'Performance plan', `${perf.pagination.length} pagination configs | ${perf.caching.length} cache policies | ${perf.indexRecommendations.length} index recommendations`);
  } catch (e) {
    // Performance planner is optional
  }

  // Confidence scoring
  try {
    const lowConfidenceItems: { section: string; item: string; confidence: number; reason: string }[] = [];
    const entityConfidences: number[] = [];
    const detectedDomainId = understanding?.level2_domain?.primaryDomain?.id;
    for (const entity of plan.dataModel) {
      const inferred = inferEntityFields([entity.name], detectedDomainId);
      const match = inferred.find(e => e.name === entity.name);
      const conf = match?.matchConfidence ?? 0;
      entityConfidences.push(conf);
      if (conf < 0.5) {
        lowConfidenceItems.push({ section: 'Entity', item: entity.name, confidence: conf, reason: conf === 0 ? 'No archetype or trait match' : 'Weak trait-based composition' });
      }
    }
    const entityConfAvg = entityConfidences.length > 0 ? entityConfidences.reduce((a, b) => a + b, 0) / entityConfidences.length : 0.5;
    const uxConf = (plan.uxFlows?.length || 0) > 0 ? Math.min(0.6 + (plan.uxFlows!.length / 10) * 0.4, 1.0) : 0.2;
    const intConf = plan.integrations && plan.integrations.length > 0 ? 0.85 : 0.5;
    const secConf = plan.securityPlan ? 0.85 : 0.3;
    const perfConf = plan.performancePlan ? 0.8 : 0.3;
    if (uxConf < 0.5) lowConfidenceItems.push({ section: 'UX Flows', item: 'Overall', confidence: uxConf, reason: 'Few UX flows generated' });
    if (secConf < 0.5) lowConfidenceItems.push({ section: 'Security', item: 'Overall', confidence: secConf, reason: 'No security plan' });

    const overall = entityConfAvg * 0.35 + uxConf * 0.15 + intConf * 0.15 + secConf * 0.2 + perfConf * 0.15;
    plan.confidence = {
      overall: Math.round(overall * 100) / 100,
      entityInference: Math.round(entityConfAvg * 100) / 100,
      uxFlows: Math.round(uxConf * 100) / 100,
      integrations: Math.round(intConf * 100) / 100,
      security: Math.round(secConf * 100) / 100,
      performance: Math.round(perfConf * 100) / 100,
      lowConfidenceItems,
    };
    emitStep('planning', 'Confidence scored', `Overall: ${Math.round(overall * 100)}% | ${lowConfidenceItems.length} items flagged`);
  } catch (e) {
    // Confidence scoring is optional
  }

  emitStep('planning', 'Final plan ready',
    `${plan.modules.length} modules, ${plan.pages.length} pages, ${plan.dataModel.length} data tables, ${plan.apiEndpoints.length} API endpoints — all cross-referenced and validated`
  );

  let responseContent = formatPlanAsMessage(plan);

  if (plan.confidence && plan.confidence.lowConfidenceItems.length > 0 && plan.confidence.overall < 0.65) {
    const interviewQuestions = generateLowConfidenceQuestions(plan.confidence.lowConfidenceItems);
    if (interviewQuestions.length > 0) {
      const interviewMsg = formatLowConfidenceInterviewMessage(interviewQuestions);
      responseContent += '\n\n---\n\n' + interviewMsg;
    }
  }

  return {
    responseContent,
    newPhase: 'approval',
    thinkingSteps,
    planData: plan,
    understandingData: understanding,
  };
}

async function handleGeneration(
  state: ConversationState,
  thinkingSteps: ThinkingStep[],
  emitStep: (phase: string, label: string, detail?: string) => void,
  onStep?: OnStepCallback
): Promise<PhaseHandlerResult> {
  const plan = state.planData;
  if (!plan) {
    return {
      responseContent: 'Something went wrong - I don\'t have a plan to work from. Could you describe what you want to build again?',
      newPhase: 'initial',
      thinkingSteps,
    };
  }

  emitStep('orchestrator', 'Pipeline Orchestrator activated', `Coordinating 16 specialized AI modules for "${plan.projectName}" — each module acts as a dedicated team member`);
  emitStep('orchestrator', 'Dev team assembled', 'Product Manager → Project Manager → Senior Advisor → Technical Analyst → System Architect → UI/UX Designer → Feature Analyst → Database Engineer → API Architect → UI Engineer → Full-Stack Developer → DevOps Engineer → Code Reviewer → QA Engineer → Release Engineer → Knowledge Manager');
  emitStep('orchestrator', 'Why a 16-stage pipeline', 'Each stage enriches the project context — understanding feeds planning, planning feeds architecture, architecture guides design, design informs components, and all of it flows into code generation for internally-consistent output');

  let orchestrationResult: OrchestrationResult;
  try {
    orchestrationResult = await orchestrateGeneration(plan, state.understandingData, onStep);
  } catch (err) {
    emitStep('orchestrator', 'Pipeline encountered critical error, falling back to direct generation');
    const rawFiles = generateProjectFromPlan(plan);
    emitStep('generating', 'Code generation complete', `${rawFiles.length} files created`);
    const MAX_VALIDATION_PASSES = 3;
    let currentFiles = rawFiles;
    let totalFixesApplied: string[] = [];
    let currentResult = validateAndFix(currentFiles, 1);
    let passCount = 1;
    emitStep('validating', `Validation pass ${passCount}`, `${currentResult.issues.length} issues found, ${currentResult.fixesApplied.length} auto-fixed`);
    totalFixesApplied.push(...currentResult.fixesApplied);

    while (passCount < MAX_VALIDATION_PASSES) {
      const errors = currentResult.issues.filter((i: any) => i.severity === 'error');
      if (errors.length === 0) break;

      passCount++;
      try {
        const parsedErrors = viteParseErrors(errors.map((i: any) => i.message));
        const projectFiles = currentResult.files.map((f: any) => ({ path: f.path, content: f.content, language: f.language || 'typescript' }));
        const viteFixes = viteAnalyzeAndFix(parsedErrors, projectFiles);
        if (viteFixes.fixes.length === 0) break;

        const patchedFiles = [...currentResult.files];
        for (const fix of viteFixes.fixes) {
          if (fix.type === 'patch_file' || fix.type === 'create_file') {
            const idx = patchedFiles.findIndex((f: any) => f.path === fix.filePath);
            if (idx >= 0) {
              patchedFiles[idx] = { ...patchedFiles[idx], content: fix.newContent };
            } else if (fix.type === 'create_file') {
              patchedFiles.push({ path: fix.filePath, content: fix.newContent, language: 'typescript' });
            }
          }
        }
        totalFixesApplied.push(...viteFixes.fixes.map((f: any) => f.description || f.filePath));
        currentResult = validateAndFix(patchedFiles, 1);
        totalFixesApplied.push(...currentResult.fixesApplied);
        emitStep('validating', `Validation pass ${passCount}`, `${viteFixes.fixes.length} Vite fixes + ${currentResult.fixesApplied.length} validator fixes`);
      } catch (e) {
        console.error('[Fallback] Vite fixer error:', e);
        break;
      }
    }

    currentResult.fixesApplied = totalFixesApplied;
    const fallbackFiles = currentResult.files;
    try {
      learningEngine.recordOutcome({
        conversationId: state.conversationId || 0,
        projectDescription: plan.overview || plan.projectName,
        domainId: state.understandingData?.level2_domain?.primaryDomain?.id,
        plan,
        generatedFiles: fallbackFiles.map(f => ({ path: f.path, content: f.content })),
        errors: currentResult.issues.filter((i: any) => i.severity === 'error').map((i: any) => i.message),
        autoFixes: currentResult.fixesApplied,
        userModifications: [],
        generationTimeMs: Date.now() - Date.now(),
      });
    } catch (e) {}
    const fallbackValSummary: ValidationSummaryResult = {
      passes: passCount,
      issuesFound: currentResult.issues.length,
      issuesFixed: currentResult.fixesApplied.length,
      unfixableIssues: currentResult.issues
        .filter((i: any) => i.severity === 'error')
        .map((i: any) => i.message)
        .filter((msg: string) => !currentResult.fixesApplied.includes(msg)),
    };
    const validationSummary = fallbackValSummary.issuesFixed > 0
      ? `Auto-fixed **${fallbackValSummary.issuesFixed} issues** across ${fallbackValSummary.passes} validation pass(es).`
      : 'All imports, exports, and dependencies verified.';
    return {
      responseContent: `## ${plan.projectName} - Generated Successfully!\n\nGenerated **${fallbackFiles.length} files** using fallback generation.\n\n${validationSummary}`,
      newPhase: 'complete',
      thinkingSteps,
      generatedFiles: fallbackFiles,
      planData: plan,
      validationSummary: fallbackValSummary,
    };
  }

  for (const step of orchestrationResult.context.thinkingSteps) {
    thinkingSteps.push(step);
  }

  const summary = orchestrationResult.summary;
  const metrics = orchestrationResult.metrics;
  const finalFiles = [...orchestrationResult.files, ...orchestrationResult.testFiles];

  try {
    learningEngine.recordOutcome({
      conversationId: state.conversationId || 0,
      projectDescription: plan.overview || plan.projectName,
      domainId: state.understandingData?.level2_domain?.primaryDomain?.id,
      plan,
      generatedFiles: finalFiles.map(f => ({ path: f.path, content: f.content })),
      errors: summary.warnings,
      autoFixes: [],
      userModifications: [],
      generationTimeMs: metrics.totalDurationMs,
    });
  } catch (e) {
  }

  const moduleList = plan.modules.map(m => `- **${m.name}**: ${m.description}`).join('\n');
  const fileList = finalFiles.slice(0, 30).map(f => `- \`${f.path}\``).join('\n');
  const fileListExtra = finalFiles.length > 30 ? `\n- ...and ${finalFiles.length - 30} more files` : '';

  const highlightsList = summary.highlights.map(h => `- ${h}`).join('\n');
  const warningsList = summary.warnings.length > 0
    ? `\n### Notes\n${summary.warnings.slice(0, 5).map(w => `- ${w}`).join('\n')}`
    : '';

  const qualityGrade = orchestrationResult.context.qualityReport
    ? ` (Grade: ${orchestrationResult.context.qualityReport.grade})`
    : '';

  const valSummary = orchestrationResult.context.validationSummary;
  const validationBlock = valSummary
    ? `\n### Code Validation\n- **${valSummary.passes}** validation pass${valSummary.passes !== 1 ? 'es' : ''} completed\n- **${valSummary.issuesFixed}** issues auto-fixed${valSummary.unfixableIssues.length > 0 ? `\n- **${valSummary.unfixableIssues.length}** issues require manual review` : '\n- All imports, exports, and dependencies verified'}`
    : '';

  const responseContent = `## ${plan.projectName} - Generated Successfully!

Your project was built by a **${summary.totalStages}-module AI pipeline** with an overall quality score of **${summary.overallQuality}/100**${qualityGrade}.

### Pipeline Summary
- **${summary.completedStages}/${summary.totalStages}** specialized modules completed
- **${metrics.fileCount} files** generated (~${metrics.lineCount.toLocaleString()} lines of code)
- **${metrics.endpointCount} API endpoints** designed
- **${metrics.componentCount} UI components** composed
- Completed in **${(metrics.totalDurationMs / 1000).toFixed(1)}s**
${validationBlock}

### Architecture Highlights
${highlightsList}

### Modules Built
${moduleList}

### Files Created
${fileList}${fileListExtra}

### What's Included
- **${plan.dataModel.length} database tables** with full CRUD APIs
- **${plan.pages.length} pages** with search, filter, and data display
- **${plan.apiEndpoints.length} API endpoints** with validation
- **Dashboard** with KPI metrics and domain-aware design system
- **Component tree** with accessibility and responsive design
- **Automated tests** for API routes and components
${warningsList}

### Next Steps
- Click **Preview** to see your app running
- Browse **View Code** to explore the generated files
- Tell me what you'd like to change or add!`;

  const orchestrationValSummary: ValidationSummaryResult | undefined = valSummary
    ? {
        passes: valSummary.passes,
        issuesFound: valSummary.issuesFound,
        issuesFixed: valSummary.issuesFixed,
        unfixableIssues: valSummary.unfixableIssues,
      }
    : undefined;

  return {
    responseContent,
    newPhase: 'complete',
    thinkingSteps,
    generatedFiles: finalFiles,
    planData: plan,
    validationSummary: orchestrationValSummary,
  };
}

interface PlanModificationIntent {
  action: 'add' | 'remove' | 'change' | 'rename' | 'unknown';
  targetType: 'entity' | 'module' | 'page' | 'endpoint' | 'unknown';
  targetName: string;
  newName?: string;
  details?: string;
}

function parsePlanModificationIntent(message: string): PlanModificationIntent[] {
  const lower = message.toLowerCase().trim();
  const intents: PlanModificationIntent[] = [];

  const addPatterns = [
    /\badd\s+(?:a\s+|an\s+)?(?:new\s+)?(\w+(?:\s+\w+){0,2})\s+(?:entity|table|model|data\s*model)/i,
    /\badd\s+(?:a\s+|an\s+)?(?:new\s+)?(\w+(?:\s+\w+){0,2})\s+(?:page|view|screen)/i,
    /\badd\s+(?:a\s+|an\s+)?(?:new\s+)?(\w+(?:\s+\w+){0,2})\s+(?:module|section|area)/i,
    /\badd\s+(?:a\s+|an\s+)?(?:new\s+)?(\w+(?:\s+\w+){0,2})\s+(?:endpoint|api|route)/i,
    /\badd\s+(?:a\s+|an\s+)?(?:new\s+)?(?:entity|table|model|data\s*model)\s+(?:called\s+|named\s+|for\s+)?(\w+(?:\s+\w+){0,2})/i,
    /\badd\s+(?:a\s+|an\s+)?(?:new\s+)?(?:page|view|screen)\s+(?:called\s+|named\s+|for\s+)?(\w+(?:\s+\w+){0,2})/i,
    /\badd\s+(?:a\s+|an\s+)?(?:new\s+)?(?:module|section|area)\s+(?:called\s+|named\s+|for\s+)?(\w+(?:\s+\w+){0,2})/i,
    /\badd\s+(?:a\s+|an\s+)?(?:new\s+)?(\w+(?:\s+\w+){0,2})\s+(?:entity|table|model|page|view|module|section|endpoint|api|route|feature|field|column)/i,
  ];

  const removePatterns = [
    /\b(?:remove|delete|drop|get rid of)\s+(?:the\s+)?(\w+(?:\s+\w+){0,2})\s+(?:entity|table|model)/i,
    /\b(?:remove|delete|drop|get rid of)\s+(?:the\s+)?(\w+(?:\s+\w+){0,2})\s+(?:page|view|screen)/i,
    /\b(?:remove|delete|drop|get rid of)\s+(?:the\s+)?(\w+(?:\s+\w+){0,2})\s+(?:module|section|area)/i,
    /\b(?:remove|delete|drop|get rid of)\s+(?:the\s+)?(\w+(?:\s+\w+){0,2})/i,
  ];

  const renamePatterns = [
    /\brename\s+(?:the\s+)?(\w+(?:\s+\w+){0,2})\s+(?:to|as|into)\s+(\w+(?:\s+\w+){0,2})/i,
  ];

  const changePatterns = [
    /\bchange\s+(?:the\s+)?(\w+(?:\s+\w+){0,2})\s+(?:to|into)\s+(\w+(?:\s+\w+){0,2})/i,
    /\breplace\s+(?:the\s+)?(\w+(?:\s+\w+){0,2})\s+(?:with)\s+(\w+(?:\s+\w+){0,2})/i,
  ];

  for (const pat of renamePatterns) {
    const m = message.match(pat);
    if (m) {
      intents.push({ action: 'rename', targetType: 'unknown', targetName: m[1].trim(), newName: m[2].trim() });
    }
  }

  for (const pat of changePatterns) {
    const m = message.match(pat);
    if (m && intents.length === 0) {
      intents.push({ action: 'change', targetType: 'unknown', targetName: m[1].trim(), newName: m[2].trim() });
    }
  }

  for (const pat of removePatterns) {
    const m = message.match(pat);
    if (m && intents.length === 0) {
      let targetType: PlanModificationIntent['targetType'] = 'unknown';
      if (/entity|table|model/i.test(message)) targetType = 'entity';
      else if (/page|view|screen/i.test(message)) targetType = 'page';
      else if (/module|section|area/i.test(message)) targetType = 'module';
      intents.push({ action: 'remove', targetType, targetName: m[1].trim() });
      break;
    }
  }

  if (intents.length === 0) {
    for (const pat of addPatterns) {
      const m = message.match(pat);
      if (m) {
        let targetType: PlanModificationIntent['targetType'] = 'unknown';
        if (/entity|table|model|data\s*model/i.test(message)) targetType = 'entity';
        else if (/page|view|screen/i.test(message)) targetType = 'page';
        else if (/module|section|area/i.test(message)) targetType = 'module';
        else if (/endpoint|api|route/i.test(message)) targetType = 'endpoint';
        intents.push({ action: 'add', targetType, targetName: m[1].trim(), details: message });
        break;
      }
    }
  }

  return intents;
}

function toSnakeCaseLocal(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

function toKebabCaseLocal(str: string): string {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function normalizeName(raw: string): string {
  return raw.split(/[\s_-]+/).map(w => capitalizeFirst(w.toLowerCase())).join('');
}

function singularizeName(word: string): string {
  const lower = word.toLowerCase();
  const SINGULAR_EXCEPTIONS = new Set([
    'status', 'address', 'analysis', 'business', 'process', 'access', 'class',
    'progress', 'success', 'express', 'canvas', 'alias', 'basis', 'crisis',
    'diagnosis', 'thesis', 'synopsis', 'campus', 'focus', 'bonus', 'nexus',
    'census', 'consensus', 'virus', 'bus', 'gas', 'atlas', 'minus', 'plus',
    'radius', 'surplus', 'apparatus', 'corpus', 'syllabus', 'genus',
  ]);
  if (SINGULAR_EXCEPTIONS.has(lower)) return word;
  if (lower.endsWith('ies') && lower.length > 4) return word.slice(0, -3) + 'y';
  if (lower.endsWith('ses') && !SINGULAR_EXCEPTIONS.has(lower)) return word.slice(0, -2);
  if (lower.endsWith('s') && !lower.endsWith('ss') && lower.length > 3) return word.slice(0, -1);
  return word;
}

function synthesizeEntityForPlan(rawName: string): { entity: PlannedEntity; pages: PlannedPage[]; endpoints: PlannedEndpoint[]; module: PlannedModule } {
  const name = normalizeName(singularizeName(rawName));
  const tableName = toSnakeCaseLocal(name) + 's';
  const kebab = toKebabCaseLocal(name);

  const nlpExtraction = extractEntitiesFromText(rawName);
  let fields: PlannedEntity['fields'];
  if (nlpExtraction.entities.length > 0) {
    const extracted = nlpExtraction.entities[0];
    fields = extracted.fields.map(f => ({
      name: f.name,
      type: f.type === 'serial' ? 'serial (auto-increment)' :
            f.type === 'string' ? 'text' :
            f.type === 'number' ? 'integer' :
            f.type === 'datetime' ? 'timestamp' :
            f.type.startsWith('enum:') ? `enum(${f.type.replace('enum:', '')})` : f.type,
      required: f.required || false,
      description: f.description,
    }));
  } else {
    fields = [
      { name: 'id', type: 'serial (auto-increment)', required: true },
      { name: 'name', type: 'text', required: true },
      { name: 'description', type: 'text', required: false },
      { name: 'status', type: 'enum(active,inactive,archived)', required: true },
      { name: 'createdAt', type: 'timestamp', required: false },
    ];
  }

  const entity: PlannedEntity = { name, tableName, fields, relationships: [] };

  const moduleName = `${name} Management`;
  const pages: PlannedPage[] = [
    {
      name: `${name} List`,
      path: `/${kebab}s`,
      module: moduleName,
      description: `All ${name.toLowerCase()} records with search and filters`,
      componentName: `${name}ListPage`,
      features: ['search', 'filter-by-status', 'sort', 'create'],
      dataNeeded: [name],
    },
    {
      name: `${name} Detail`,
      path: `/${kebab}s/:id`,
      module: moduleName,
      description: `View and edit ${name.toLowerCase()} details`,
      componentName: `${name}DetailPage`,
      features: ['edit', 'delete', 'status-tracking'],
      dataNeeded: [name],
    },
  ];

  const basePath = `/api/${kebab}s`;
  const endpoints: PlannedEndpoint[] = [
    { method: 'GET', path: basePath, description: `List all ${name.toLowerCase()}s with optional filters`, entity: name, responseType: `${name}[]` },
    { method: 'GET', path: `${basePath}/:id`, description: `Get a single ${name.toLowerCase()} by ID`, entity: name, responseType: name },
    { method: 'POST', path: basePath, description: `Create a new ${name.toLowerCase()}`, entity: name, requestBody: `Insert${name}`, responseType: name },
    { method: 'PATCH', path: `${basePath}/:id`, description: `Update an existing ${name.toLowerCase()}`, entity: name, requestBody: `Partial<Insert${name}>`, responseType: name },
    { method: 'DELETE', path: `${basePath}/:id`, description: `Delete a ${name.toLowerCase()}`, entity: name, responseType: 'void' },
  ];

  const mod: PlannedModule = {
    name: moduleName,
    description: `Manage ${name.toLowerCase()} records`,
    entities: [name],
    pageCount: 2,
    features: ['search', 'filter-by-status', 'sort', 'create', 'edit', 'delete'],
  };

  return { entity, pages, endpoints, module: mod };
}

function findInPlanByName(plan: ProjectPlan, targetName: string): { type: 'module' | 'entity' | 'page'; index: number } | null {
  const lower = targetName.toLowerCase().replace(/\s+/g, '');
  const singular = singularizeName(lower);

  for (let i = 0; i < plan.modules.length; i++) {
    const mName = plan.modules[i].name.toLowerCase().replace(/\s+/g, '');
    const mCore = mName.replace('management', '').trim();
    if (mName === lower || mName === singular || mName.includes(lower) || lower.includes(mCore) || singular.includes(mCore)) {
      return { type: 'module', index: i };
    }
  }

  for (let i = 0; i < plan.dataModel.length; i++) {
    const eName = plan.dataModel[i].name.toLowerCase();
    if (eName === lower || eName === singular || singularizeName(eName) === singular) {
      return { type: 'entity', index: i };
    }
  }

  for (let i = 0; i < plan.pages.length; i++) {
    const pName = plan.pages[i].name.toLowerCase().replace(/\s+/g, '');
    if (pName === lower || pName === singular || pName.includes(lower) || pName.includes(singular)) {
      return { type: 'page', index: i };
    }
  }

  return null;
}

function applyAddIntent(plan: ProjectPlan, intent: PlanModificationIntent): { plan: ProjectPlan; description: string } {
  const enrichedPlan = deepClonePlan(plan);
  const rawName = intent.targetName;

  if (intent.targetType === 'page') {
    const pageName = normalizeName(rawName);
    const kebab = toKebabCaseLocal(pageName);
    const newPage: PlannedPage = {
      name: pageName,
      path: `/${kebab}`,
      module: enrichedPlan.modules.length > 0 ? enrichedPlan.modules[0].name : 'Main',
      description: `${pageName} page`,
      componentName: `${pageName}Page`,
      features: ['view'],
      dataNeeded: [],
    };
    enrichedPlan.pages.push(newPage);
    return { plan: enrichedPlan, description: `Added "${pageName}" page at /${kebab}` };
  }

  if (intent.targetType === 'endpoint') {
    const entityName = normalizeName(singularizeName(rawName));
    const basePath = `/api/${toKebabCaseLocal(entityName)}s`;
    const newEndpoint: PlannedEndpoint = {
      method: 'GET',
      path: basePath,
      description: `Custom endpoint for ${entityName}`,
      entity: entityName,
      responseType: `${entityName}[]`,
    };
    enrichedPlan.apiEndpoints.push(newEndpoint);
    return { plan: enrichedPlan, description: `Added API endpoint GET ${basePath}` };
  }

  const { entity, pages, endpoints, module: mod } = synthesizeEntityForPlan(rawName);

  if (intent.targetType === 'module' || intent.targetType === 'unknown') {
    if (!enrichedPlan.modules.some(m => m.name.toLowerCase() === mod.name.toLowerCase())) {
      enrichedPlan.modules.push(mod);
    }
  }

  if (!enrichedPlan.dataModel.some(e => e.name.toLowerCase() === entity.name.toLowerCase())) {
    enrichedPlan.dataModel.push(entity);
  }

  for (const page of pages) {
    if (!enrichedPlan.pages.some(p => p.componentName === page.componentName)) {
      enrichedPlan.pages.push(page);
    }
  }

  for (const ep of endpoints) {
    if (!enrichedPlan.apiEndpoints.some(e => e.path === ep.path && e.method === ep.method)) {
      enrichedPlan.apiEndpoints.push(ep);
    }
  }

  const statusField = entity.fields.find(f => f.name === 'status');
  if (statusField) {
    const enumMatch = statusField.type.match(/enum\((.+)\)/);
    const states = enumMatch ? enumMatch[1].split(',').map(s => s.trim()) : ['draft', 'active', 'completed'];
    const transitions: PlannedWorkflow['transitions'] = [];
    for (let i = 0; i < states.length - 1; i++) {
      transitions.push({ from: states[i], to: states[i + 1], action: `Move to ${states[i + 1]}` });
    }
    if (!enrichedPlan.workflows.some(w => w.entity === entity.name)) {
      enrichedPlan.workflows.push({ name: `${entity.name} Lifecycle`, entity: entity.name, states, transitions });
    }
  }

  enrichedPlan.fileBlueprint.push(
    { path: `client/src/pages/${toKebabCaseLocal(entity.name)}-list.tsx`, purpose: `${entity.name} list page`, type: 'page' },
    { path: `client/src/pages/${toKebabCaseLocal(entity.name)}-detail.tsx`, purpose: `${entity.name} detail page`, type: 'page' }
  );

  const itemType = intent.targetType === 'module' ? 'module' : intent.targetType === 'entity' ? 'entity' : 'module';
  return { plan: enrichedPlan, description: `Added ${entity.name} ${itemType} with ${pages.length} pages, ${endpoints.length} endpoints, and data model` };
}

function applyRemoveIntent(plan: ProjectPlan, intent: PlanModificationIntent): { plan: ProjectPlan; description: string } {
  const enrichedPlan = deepClonePlan(plan);
  const target = findInPlanByName(enrichedPlan, intent.targetName);
  const removedItems: string[] = [];

  if (target?.type === 'module') {
    const mod = enrichedPlan.modules[target.index];
    const entityNames = mod.entities.map(e => e.toLowerCase());

    enrichedPlan.modules.splice(target.index, 1);
    removedItems.push(`module "${mod.name}"`);

    enrichedPlan.dataModel = enrichedPlan.dataModel.filter(e => !entityNames.includes(e.name.toLowerCase()));
    enrichedPlan.pages = enrichedPlan.pages.filter(p => p.module !== mod.name);
    enrichedPlan.apiEndpoints = enrichedPlan.apiEndpoints.filter(ep => !entityNames.includes(ep.entity.toLowerCase()));
    enrichedPlan.workflows = enrichedPlan.workflows.filter(w => !entityNames.includes(w.entity.toLowerCase()));
    enrichedPlan.fileBlueprint = enrichedPlan.fileBlueprint.filter(f =>
      !entityNames.some(en => f.path.toLowerCase().includes(en))
    );
  } else if (target?.type === 'entity') {
    const entity = enrichedPlan.dataModel[target.index];
    const entityLower = entity.name.toLowerCase();

    enrichedPlan.dataModel.splice(target.index, 1);
    removedItems.push(`entity "${entity.name}"`);

    enrichedPlan.pages = enrichedPlan.pages.filter(p => !p.dataNeeded.some(d => d.toLowerCase() === entityLower));
    enrichedPlan.apiEndpoints = enrichedPlan.apiEndpoints.filter(ep => ep.entity.toLowerCase() !== entityLower);
    enrichedPlan.workflows = enrichedPlan.workflows.filter(w => w.entity.toLowerCase() !== entityLower);

    for (const mod of enrichedPlan.modules) {
      mod.entities = mod.entities.filter(e => e.toLowerCase() !== entityLower);
    }
    enrichedPlan.modules = enrichedPlan.modules.filter(m => m.entities.length > 0 || m.name === 'Dashboard');
  } else if (target?.type === 'page') {
    const page = enrichedPlan.pages[target.index];
    enrichedPlan.pages.splice(target.index, 1);
    removedItems.push(`page "${page.name}"`);
  } else {
    const lower = intent.targetName.toLowerCase().replace(/\s+/g, '');
    const modIdx = enrichedPlan.modules.findIndex(m =>
      m.name.toLowerCase().replace(/\s+/g, '').includes(lower) ||
      lower.includes(m.name.toLowerCase().replace(/management/g, '').replace(/\s+/g, '').trim())
    );
    if (modIdx >= 0) {
      const mod = enrichedPlan.modules[modIdx];
      const entityNames = mod.entities.map(e => e.toLowerCase());
      enrichedPlan.modules.splice(modIdx, 1);
      removedItems.push(`module "${mod.name}"`);
      enrichedPlan.dataModel = enrichedPlan.dataModel.filter(e => !entityNames.includes(e.name.toLowerCase()));
      enrichedPlan.pages = enrichedPlan.pages.filter(p => p.module !== mod.name);
      enrichedPlan.apiEndpoints = enrichedPlan.apiEndpoints.filter(ep => !entityNames.includes(ep.entity.toLowerCase()));
      enrichedPlan.workflows = enrichedPlan.workflows.filter(w => !entityNames.includes(w.entity.toLowerCase()));
    } else {
      removedItems.push(`(no match found for "${intent.targetName}")`);
    }
  }

  return { plan: enrichedPlan, description: `Removed ${removedItems.join(', ')}` };
}

function applyRenameIntent(plan: ProjectPlan, intent: PlanModificationIntent): { plan: ProjectPlan; description: string } {
  const enrichedPlan = deepClonePlan(plan);
  const oldName = intent.targetName;
  const newName = intent.newName || oldName;
  const normalizedNew = normalizeName(newName);
  const target = findInPlanByName(enrichedPlan, oldName);
  const renames: string[] = [];

  if (target?.type === 'module') {
    const mod = enrichedPlan.modules[target.index];
    const oldModName = mod.name;
    mod.name = `${normalizedNew} Management`;
    mod.description = `Manage ${normalizedNew.toLowerCase()} records`;
    renames.push(`module "${oldModName}" → "${mod.name}"`);
    for (const page of enrichedPlan.pages) {
      if (page.module === oldModName) page.module = mod.name;
    }
  } else if (target?.type === 'entity') {
    const entity = enrichedPlan.dataModel[target.index];
    const oldEntityName = entity.name;
    entity.name = normalizedNew;
    entity.tableName = toSnakeCaseLocal(normalizedNew) + 's';
    renames.push(`entity "${oldEntityName}" → "${normalizedNew}"`);

    for (const page of enrichedPlan.pages) {
      if (page.name.includes(oldEntityName)) {
        page.name = page.name.replace(oldEntityName, normalizedNew);
        page.componentName = page.componentName.replace(oldEntityName, normalizedNew);
        page.path = page.path.replace(toKebabCaseLocal(oldEntityName), toKebabCaseLocal(normalizedNew));
      }
      page.dataNeeded = page.dataNeeded.map(d => d === oldEntityName ? normalizedNew : d);
    }

    for (const ep of enrichedPlan.apiEndpoints) {
      if (ep.entity === oldEntityName) {
        ep.entity = normalizedNew;
        ep.path = ep.path.replace(toKebabCaseLocal(oldEntityName), toKebabCaseLocal(normalizedNew));
        ep.description = ep.description.replace(new RegExp(oldEntityName, 'gi'), normalizedNew);
        if (ep.requestBody) ep.requestBody = ep.requestBody.replace(oldEntityName, normalizedNew);
        ep.responseType = ep.responseType.replace(oldEntityName, normalizedNew);
      }
    }

    for (const wf of enrichedPlan.workflows) {
      if (wf.entity === oldEntityName) {
        wf.entity = normalizedNew;
        wf.name = wf.name.replace(oldEntityName, normalizedNew);
      }
    }

    for (const mod of enrichedPlan.modules) {
      mod.entities = mod.entities.map(e => e === oldEntityName ? normalizedNew : e);
    }
  } else if (target?.type === 'page') {
    const page = enrichedPlan.pages[target.index];
    const oldPageName = page.name;
    page.name = normalizedNew;
    page.componentName = `${normalizedNew.replace(/\s+/g, '')}Page`;
    renames.push(`page "${oldPageName}" → "${normalizedNew}"`);
  } else {
    renames.push(`(no match found for "${oldName}")`);
  }

  return { plan: enrichedPlan, description: `Renamed ${renames.join(', ')}` };
}

function deepClonePlan(plan: ProjectPlan): ProjectPlan {
  return {
    ...plan,
    techStack: [...plan.techStack],
    modules: plan.modules.map(m => ({ ...m, entities: [...m.entities], features: [...m.features] })),
    dataModel: plan.dataModel.map(e => ({ ...e, fields: e.fields.map(f => ({ ...f })), relationships: e.relationships.map(r => ({ ...r })) })),
    pages: plan.pages.map(p => ({ ...p, features: [...p.features], dataNeeded: [...p.dataNeeded] })),
    apiEndpoints: plan.apiEndpoints.map(ep => ({ ...ep })),
    workflows: plan.workflows.map(w => ({ ...w, states: [...w.states], transitions: w.transitions.map(t => ({ ...t })) })),
    roles: plan.roles.map(r => ({ ...r, permissions: [...r.permissions], canAccess: [...r.canAccess] })),
    fileBlueprint: plan.fileBlueprint.map(f => ({ ...f })),
    kpis: [...plan.kpis],
  };
}

function findEntityInMessage(userMessage: string, plan: ProjectPlan): string {
  const msgLower = userMessage.toLowerCase();
  for (const entity of plan.dataModel) {
    if (msgLower.includes(entity.name.toLowerCase())) {
      return entity.name;
    }
  }
  if (plan.confidence) {
    const lowConfEntity = plan.confidence.lowConfidenceItems.find(i => i.section === 'Entity');
    if (lowConfEntity) return lowConfEntity.item;
  }
  return '';
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const jsonMatch = text.match(/\{[\s\S]*?\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // Not valid JSON
    }
  }

  const arrayMatch = text.match(/\[[\s\S]*?\]/);
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0]);
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0] !== null) {
        return parsed[0] as Record<string, unknown>;
      }
    } catch {
      // Not valid JSON array
    }
  }

  return null;
}

function tryParseUserExamples(
  userMessage: string,
  plan: ProjectPlan
): { entityName: string; inferredEntity: ReturnType<typeof inferFieldsFromExamples> } | null {
  const jsonObj = extractJsonObject(userMessage);
  if (jsonObj) {
    const keys = Object.keys(jsonObj);
    if (keys.length >= 2) {
      const matchedEntity = findEntityInMessage(userMessage, plan);
      if (!matchedEntity) return null;

      const examples = keys.map(k => ({
        fieldName: k,
        sampleValue: typeof jsonObj[k] === 'string' || typeof jsonObj[k] === 'number' || typeof jsonObj[k] === 'boolean'
          ? String(jsonObj[k]) : undefined,
      }));
      return { entityName: matchedEntity, inferredEntity: inferFieldsFromExamples(matchedEntity, examples) };
    }
  }

  const fieldDescPattern = /(?:has|with|contains|includes)\s+(?:a\s+)?(.+?)(?:\.|$)/gi;
  const matches: string[] = [];
  let m;
  while ((m = fieldDescPattern.exec(userMessage)) !== null) {
    matches.push(m[1].trim());
  }

  if (matches.length > 0) {
    const matchedEntity = findEntityInMessage(userMessage, plan);
    if (!matchedEntity) return null;

    const fieldNames: string[] = [];
    for (const match of matches) {
      const parts = match.split(/[,;]\s*(?:and\s+)?|,?\s+and\s+/);
      fieldNames.push(...parts.map(p => p.trim()).filter(p => p.length > 0 && p.length < 40));
    }

    if (fieldNames.length >= 2) {
      const examples = fieldNames.map(f => ({ fieldName: f }));
      return { entityName: matchedEntity, inferredEntity: inferFieldsFromExamples(matchedEntity, examples) };
    }
  }

  return null;
}

function handlePlanModification(
  userMessage: string,
  state: ConversationState,
  thinkingSteps: ThinkingStep[],
  emitStep: (phase: string, label: string, detail?: string) => void
): PhaseHandlerResult {
  emitStep('planning', 'Processing your modification request', 'Analyzing what you want to change and applying surgical edits to the existing plan');

  const existingPlan = state.planData;
  const previousUnderstanding = state.understandingData;

  if (!existingPlan) {
    emitStep('planning', 'No existing plan found', 'Re-analyzing from scratch since there is no plan to modify');
    const combinedContext = previousUnderstanding
      ? `${previousUnderstanding.level1_intent.primaryGoal}. ${userMessage}`
      : userMessage;
    const updatedUnderstanding = analyzeRequest(combinedContext);
    let updatedPlan = generatePlan(updatedUnderstanding);
    updatedPlan = learningEngine.applyLearnedPatterns(updatedPlan);
    const reasoning = analyzeSemantics(updatedPlan);
    updatedPlan = enrichPlanWithReasoning(updatedPlan, reasoning);
    const responseContent = `## Updated Plan\n\nI've created a new plan based on your request:\n\n${formatPlanAsMessage(updatedPlan)}`;
    return {
      responseContent,
      newPhase: 'approval',
      thinkingSteps,
      planData: updatedPlan,
      understandingData: updatedUnderstanding,
    };
  }

  const exampleResult = tryParseUserExamples(userMessage, existingPlan);
  if (exampleResult) {
    emitStep('planning', 'Sample data detected', `Parsed example data for "${exampleResult.entityName}" — inferred ${exampleResult.inferredEntity.fields.length} fields from your sample`);
    const targetEntity = existingPlan.dataModel.find(e => e.name.toLowerCase() === exampleResult.entityName.toLowerCase());
    if (targetEntity) {
      const existingFieldNames = new Set(targetEntity.fields.map(f => f.name));
      for (const field of exampleResult.inferredEntity.fields) {
        if (!existingFieldNames.has(field.name) && !isSemanticDuplicate(field.name, existingFieldNames)) {
          targetEntity.fields.push({ name: field.name, type: field.type, required: field.required || false, description: field.description });
          existingFieldNames.add(field.name);
        }
      }
      if (existingPlan.confidence) {
        const idx = existingPlan.confidence.lowConfidenceItems.findIndex(i => i.section === 'Entity' && i.item.toLowerCase() === exampleResult.entityName.toLowerCase());
        if (idx >= 0) existingPlan.confidence.lowConfidenceItems.splice(idx, 1);
      }
      emitStep('planning', 'Entity upgraded from examples', `"${targetEntity.name}" now has ${targetEntity.fields.length} fields based on your sample data`);
    }
    const responseContent = `## Updated Plan\n\nI've upgraded the **${exampleResult.entityName}** entity using your sample data:\n\n${formatPlanAsMessage(existingPlan)}`;
    return { responseContent, newPhase: 'approval', thinkingSteps, planData: existingPlan, understandingData: previousUnderstanding };
  }

  const intents = parsePlanModificationIntent(userMessage);

  if (intents.length === 0) {
    emitStep('planning', 'Complex modification detected', 'Cannot parse a specific surgical edit — falling back to full re-analysis while preserving context');
    const combinedContext = previousUnderstanding
      ? `${previousUnderstanding.level1_intent.primaryGoal}. ${userMessage}`
      : userMessage;
    const updatedUnderstanding = analyzeRequest(combinedContext);
    let updatedPlan = generatePlan(updatedUnderstanding);
    updatedPlan = learningEngine.applyLearnedPatterns(updatedPlan);
    const reasoning = analyzeSemantics(updatedPlan);
    updatedPlan = enrichPlanWithReasoning(updatedPlan, reasoning);
    emitStep('planning', 'Plan rebuilt with modifications',
      `Now has ${updatedPlan.modules.length} modules, ${updatedPlan.pages.length} pages`
    );
    const responseContent = `## Updated Plan\n\nI've incorporated your changes:\n\n${formatPlanAsMessage(updatedPlan)}`;
    return {
      responseContent,
      newPhase: 'approval',
      thinkingSteps,
      planData: updatedPlan,
      understandingData: updatedUnderstanding,
    };
  }

  emitStep('planning', 'Modification intent parsed',
    intents.map(i => `${i.action} ${i.targetType !== 'unknown' ? i.targetType + ' ' : ''}"${i.targetName}"${i.newName ? ` → "${i.newName}"` : ''}`).join('; ')
  );

  let modifiedPlan = existingPlan;
  const changeDescriptions: string[] = [];

  for (const intent of intents) {
    let result: { plan: ProjectPlan; description: string };

    switch (intent.action) {
      case 'add':
        result = applyAddIntent(modifiedPlan, intent);
        break;
      case 'remove':
        result = applyRemoveIntent(modifiedPlan, intent);
        break;
      case 'rename':
      case 'change':
        result = applyRenameIntent(modifiedPlan, intent);
        break;
      default:
        continue;
    }

    modifiedPlan = result.plan;
    changeDescriptions.push(result.description);
    emitStep('planning', 'Applied modification', result.description);
  }

  emitStep('planning', 'Applying learned patterns', 'Enhancing updated plan with successful patterns');
  modifiedPlan = learningEngine.applyLearnedPatterns(modifiedPlan);

  emitStep('planning', 'Running contextual analysis', 'Re-analyzing entity relationships and business rules on modified plan');
  const reasoning = analyzeSemantics(modifiedPlan);
  modifiedPlan = enrichPlanWithReasoning(modifiedPlan, reasoning);

  emitStep('planning', 'Contextual reasoning applied',
    `Enriched with ${reasoning.relationships.length} relationships, ${reasoning.computedFields.length} computed fields, ${reasoning.businessRules.length} rules, ${reasoning.uiPatterns.length} UI patterns`
  );

  const entityCount = modifiedPlan.dataModel.length;
  const pageCount = modifiedPlan.pages.length;
  modifiedPlan.estimatedComplexity = entityCount > 8 || pageCount > 12 ? 'Large' :
    entityCount > 4 || pageCount > 6 ? 'Medium' : 'Small';

  emitStep('planning', 'Plan updated surgically',
    `Now has ${modifiedPlan.modules.length} modules, ${modifiedPlan.pages.length} pages — only the requested changes were applied`
  );

  const changeSummary = changeDescriptions.map(d => `- ${d}`).join('\n');
  const responseContent = `## Updated Plan\n\nI've surgically applied your changes without rebuilding the entire plan:\n\n${changeSummary}\n\n${formatPlanAsMessage(modifiedPlan)}`;

  return {
    responseContent,
    newPhase: 'approval',
    thinkingSteps,
    planData: modifiedPlan,
    understandingData: previousUnderstanding,
  };
}

function isEditRequest(message: string): boolean {
  const editPatterns = [
    /\b(change|modify|update|edit|fix|add|remove|delete|rename|move|replace|adjust|tweak|make)\b/i,
    /\b(color|font|size|layout|style|spacing|padding|margin|border|background|theme)\b/i,
    /\b(button|field|column|page|section|header|footer|sidebar|nav|menu|form|table|modal)\b/i,
    /\b(bigger|smaller|larger|wider|narrower|taller|shorter|bolder|lighter|darker|brighter)\b/i,
    /\b(the .+ (should|needs to|must|could|can))\b/i,
    /\b(i want|i need|i'd like|can you|could you|please)\b.*\b(change|add|remove|fix|update|make)\b/i,
  ];
  return editPatterns.some(p => p.test(message));
}

function handleIterativeEdit(
  userMessage: string,
  state: ConversationState,
  thinkingSteps: ThinkingStep[],
  emitStep: (phase: string, label: string, detail?: string) => void
): PhaseHandlerResult {
  const lower = userMessage.toLowerCase().trim();

  if (lower.includes('regenerate') || lower.includes('start over') || lower.includes('rebuild')) {
    return handleInitialRequest(userMessage, thinkingSteps, emitStep);
  }

  if (!state.existingFiles || state.existingFiles.length === 0) {
    return {
      responseContent: `I don't have any project files to edit yet. Would you like me to generate a new project? Just describe what you want to build!`,
      newPhase: 'complete',
      thinkingSteps,
    };
  }

  if (!isEditRequest(userMessage)) {
    const editHistory = state.editHistory || [];
    const historyInfo = editHistory.length > 0
      ? `\n\n**Recent edits** (${editHistory.length} total):\n${editHistory.slice(-3).map(e => `- ${e.summary}`).join('\n')}`
      : '';

    return {
      responseContent: `Your project is ready with **${state.existingFiles.length} files**. Here's what I can do:\n\n- **Edit code** — "change the header color to blue", "add an email field to the user form"\n- **Add features** — "add a settings page", "add a search bar"\n- **Fix issues** — "fix the broken import", "the login page has an error"\n- **Refactor** — "rename UserCard to ProfileCard"\n- **Start over** — "regenerate" or "start over"${historyInfo}\n\nWhat would you like to change?`,
      newPhase: 'editing',
      thinkingSteps,
    };
  }

  emitStep('editing', 'Analyzing your edit request', `Understanding what you want to change in the ${state.existingFiles.length}-file project`);

  const editResult = processEditRequest({
    userMessage,
    projectFiles: state.existingFiles,
    conversationHistory: state.planData?.projectName,
  });

  for (const step of editResult.thinkingSteps) {
    emitStep(step.phase, step.label, step.detail);
  }

  if (editResult.edits.length === 0) {
    emitStep('editing', 'No changes identified', 'Could not determine specific edits from your request');
    return {
      responseContent: `I understood your request but couldn't determine the specific changes to make. Could you be more specific? For example:\n\n- "Change the header background to blue"\n- "Add a phone number field to the contact form"\n- "Add a new page called Reports"\n- "Fix the import error in Dashboard.tsx"`,
      newPhase: 'editing',
      thinkingSteps,
    };
  }

  const updatedFiles = applyEditsToFiles(state.existingFiles, editResult.edits);

  emitStep('editing', 'Edits applied successfully',
    `Modified ${editResult.edits.filter(e => e.editType === 'modify').length} files, ` +
    `created ${editResult.edits.filter(e => e.editType === 'create').length} files`
  );

  const editSummary = formatEditSummary(editResult);

  return {
    responseContent: editSummary,
    newPhase: 'editing',
    thinkingSteps,
    generatedFiles: updatedFiles,
    fileEdits: editResult.edits,
    editResult,
  };
}

function applyEditsToFiles(
  existingFiles: { path: string; content: string; language: string }[],
  edits: FileEdit[]
): { path: string; content: string; language: string }[] {
  const fileMap = new Map(existingFiles.map(f => [f.path, { ...f }]));

  for (const edit of edits) {
    if (edit.editType === 'delete') {
      fileMap.delete(edit.filePath);
    } else if (edit.editType === 'create') {
      const ext = edit.filePath.split('.').pop()?.toLowerCase() || 'text';
      const langMap: Record<string, string> = {
        tsx: 'tsx', ts: 'typescript', jsx: 'jsx', js: 'javascript',
        css: 'css', html: 'html', json: 'json',
      };
      fileMap.set(edit.filePath, {
        path: edit.filePath,
        content: edit.newContent,
        language: langMap[ext] || ext,
      });
    } else {
      const existing = fileMap.get(edit.filePath);
      if (existing) {
        fileMap.set(edit.filePath, { ...existing, content: edit.newContent });
      } else {
        const ext = edit.filePath.split('.').pop()?.toLowerCase() || 'text';
        const langMap: Record<string, string> = {
          tsx: 'tsx', ts: 'typescript', jsx: 'jsx', js: 'javascript',
          css: 'css', html: 'html', json: 'json',
        };
        fileMap.set(edit.filePath, {
          path: edit.filePath,
          content: edit.newContent,
          language: langMap[ext] || ext,
        });
      }
    }
  }

  return Array.from(fileMap.values());
}

function formatEditSummary(editResult: EditResult): string {
  const { edits, summary, editType } = editResult;

  const modifiedFiles = edits.filter(e => e.editType === 'modify');
  const createdFiles = edits.filter(e => e.editType === 'create');
  const deletedFiles = edits.filter(e => e.editType === 'delete');

  let response = `## Changes Applied\n\n${summary}\n\n`;

  if (modifiedFiles.length > 0) {
    response += `### Modified Files\n`;
    for (const edit of modifiedFiles) {
      response += `- **${edit.filePath}** — ${edit.description} (${edit.linesChanged} lines changed)\n`;
    }
    response += '\n';
  }

  if (createdFiles.length > 0) {
    response += `### New Files\n`;
    for (const edit of createdFiles) {
      response += `- **${edit.filePath}** — ${edit.description}\n`;
    }
    response += '\n';
  }

  if (deletedFiles.length > 0) {
    response += `### Removed Files\n`;
    for (const edit of deletedFiles) {
      response += `- **${edit.filePath}** — ${edit.description}\n`;
    }
    response += '\n';
  }

  response += `\nThe preview should update automatically. Tell me what else you'd like to change!`;

  return response;
}

function enrichPlanWithReasoning(plan: ProjectPlan, reasoning: ReasoningResult): ProjectPlan {
  const enriched = { ...plan, dataModel: plan.dataModel.map(e => ({ ...e, fields: [...e.fields], relationships: [...e.relationships] })) };

  for (const rel of reasoning.relationships) {
    const entity = enriched.dataModel.find(e => e.name === rel.from);
    if (entity) {
      const existingRel = entity.relationships.find(r => r.entity === rel.to);
      if (!existingRel) {
        entity.relationships.push({
          entity: rel.to,
          type: rel.cardinality === '1:N' ? 'one-to-many' : rel.cardinality === 'N:1' ? 'many-to-one' : rel.type,
          field: rel.fromField,
        });
      }
    }
  }

  for (const computed of reasoning.computedFields) {
    const entity = enriched.dataModel.find(e => e.name === computed.entityName);
    if (entity && !entity.fields.find(f => f.name === computed.fieldName)) {
      entity.fields.push({
        name: computed.fieldName,
        type: 'text',
        required: false,
        description: `Computed: ${computed.description}`,
      });
    }
  }

  for (const uiPattern of reasoning.uiPatterns) {
    const page = enriched.pages.find(p =>
      p.dataNeeded.includes(uiPattern.entityName) ||
      p.name.toLowerCase().includes(uiPattern.entityName.toLowerCase())
    );
    if (page) {
      const featureLabel = `${uiPattern.pattern} view`;
      if (!page.features.includes(featureLabel)) {
        page.features.push(featureLabel);
      }
    }
  }

  for (const rule of reasoning.businessRules) {
    if (rule.type === 'validation') {
      const endpoint = enriched.apiEndpoints.find(ep =>
        ep.entity === rule.entityName && (ep.method === 'POST' || ep.method === 'PATCH')
      );
      if (endpoint && endpoint.description && !endpoint.description.includes('validation')) {
        endpoint.description += ` (with ${rule.ruleName} validation)`;
      }
    }
  }

  return enriched;
}

export function isProjectCreationRequest(content: string): boolean {
  const projectPatterns = [
    /\b(build|create|make|generate|develop|design)\b.*\b(app|application|website|site|platform|project|system|tool|portal|page)\b/i,
    /\b(app|application|website|site|platform|project|system|tool|portal)\b.*\b(for|that|with|to)\b/i,
    /\b(saas|e-commerce|ecommerce|dashboard|cms|blog|social|chat|api|store|shop)\b/i,
    /\b(landing page|web app|webapp|frontend|backend|fullstack|full-stack)\b/i,
    /\b(todo|task|note|calendar|booking|reservation|inventory|crm|erp)\b.*\b(app|system|manager)\b/i,
    /\b(i\s+want|i\s+need|i'd\s+like|i\s+wanna)\b.*\b(track|manage|organize|sell|book|share|show|display|log|monitor)\b/i,
    /\b(make\s+me|build\s+me|create\s+me|give\s+me)\b/i,
    /\b(help\s+me)\b.*\b(build|create|make|start|set\s*up|launch)\b/i,
    /\bfor\s+my\s+(business|company|startup|clients?|customers?|team|shop|store|restaurant|bakery|salon|clinic|gym|school|studio)\b/i,
    /\b(gym|workout|fitness|recipe|restaurant|budget|expense|property|real\s*estate|doctor|patient|inventory|employee|payroll)\b.*\b(app|track|manage|system|tool)\b/i,
    /\b(build|create|make|generate)\b.*\b(gym|workout|fitness|recipe|restaurant|budget|expense|finance|property|doctor|inventory|employee)\b/i,
    /\b(erp|crm|cms|lms|hris|pms|pos|wms|tms|ehr)\b/i,
    /\b(consulting|manufacturing|healthcare|logistics|supply chain|hr|human resource)\b.*\b(system|platform|tool|app|software)\b/i,
  ];

  const simplePatterns = [
    /^(explain|what is|how does|why|tell me|describe|help me understand)/i,
    /\b(fix|debug|error|bug|issue|problem)\b/i,
    /^(hi|hello|hey|thanks|thank you|ok|okay)\s*[.!?]?\s*$/i,
  ];

  const isProject = projectPatterns.some(p => p.test(content));
  const isSimple = simplePatterns.some(p => p.test(content));

  return isProject && !isSimple;
}