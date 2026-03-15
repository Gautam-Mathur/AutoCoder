import type { PlannedEntity, PlannedWorkflow } from './plan-generator.js';
import type { NLPEntityExtraction } from './domain-synthesis-engine.js';

export interface ClarificationQuestion {
  id: string;
  category: 'scope' | 'entities' | 'workflows' | 'ui' | 'roles' | 'integrations' | 'data' | 'business-rules';
  question: string;
  priority: number;
  impact: 'critical' | 'high' | 'medium' | 'low';
  context: string;
  options?: string[];
  defaultAnswer?: string;
  satisfied: boolean;
  answer?: string;
}

export interface ComplexityProfile {
  score: number;
  level: 'trivial' | 'simple' | 'moderate' | 'complex' | 'enterprise';
  factors: ComplexityFactor[];
  recommendedRounds: number;
  maxRounds: number;
  entityCount: number;
  workflowCount: number;
  roleCount: number;
  integrationCount: number;
  ambiguityScore: number;
}

export interface ComplexityFactor {
  name: string;
  weight: number;
  value: number;
  description: string;
}

export interface InformationGap {
  category: string;
  description: string;
  severity: 'blocking' | 'important' | 'nice-to-have';
  resolvedBy?: string;
  defaultResolution?: string;
}

export interface ClarificationState {
  conversationId: number;
  complexity: ComplexityProfile;
  questions: ClarificationQuestion[];
  askedQuestions: string[];
  answeredQuestions: Map<string, string>;
  informationGaps: InformationGap[];
  roundsCompleted: number;
  shouldContinue: boolean;
  readinessScore: number;
}

export function assessComplexity(
  description: string,
  extractedEntities: NLPEntityExtraction,
  detectedDomains: { confidence: number; name: string }[]
): ComplexityProfile {
  const factors: ComplexityFactor[] = [];
  let totalScore = 0;

  const entityCount = extractedEntities.entities.length;
  const entityFactor = Math.min(entityCount / 8, 1);
  factors.push({
    name: 'Entity Count',
    weight: 0.25,
    value: entityFactor,
    description: `${entityCount} entities detected`,
  });
  totalScore += entityFactor * 0.25;

  const workflowCount = extractedEntities.workflows.length;
  const workflowFactor = Math.min(workflowCount / 4, 1);
  factors.push({
    name: 'Workflow Complexity',
    weight: 0.2,
    value: workflowFactor,
    description: `${workflowCount} workflows with state transitions`,
  });
  totalScore += workflowFactor * 0.2;

  const roleCount = extractedEntities.roles.length;
  const roleFactor = Math.min(roleCount / 4, 1);
  factors.push({
    name: 'Role Complexity',
    weight: 0.1,
    value: roleFactor,
    description: `${roleCount} user roles defined`,
  });
  totalScore += roleFactor * 0.1;

  const domainConfidence = detectedDomains.length > 0 ? detectedDomains[0].confidence : 0;
  const domainAmbiguity = 1 - domainConfidence;
  factors.push({
    name: 'Domain Ambiguity',
    weight: 0.2,
    value: domainAmbiguity,
    description: domainConfidence > 0.7 ? 'Clear domain detected' :
                 domainConfidence > 0.3 ? 'Partial domain match' : 'Unclear or novel domain',
  });
  totalScore += domainAmbiguity * 0.2;

  const words = description.split(/\s+/).length;
  const descriptionDepth = Math.min(words / 100, 1);
  const descriptionBrevity = words < 20 ? 0.8 : words < 50 ? 0.4 : 0;
  factors.push({
    name: 'Description Completeness',
    weight: 0.15,
    value: descriptionBrevity,
    description: `${words} words - ${words < 20 ? 'very brief' : words < 50 ? 'moderate' : 'detailed'} description`,
  });
  totalScore += descriptionBrevity * 0.15;

  const integrationKeywords = ['api', 'integration', 'connect', 'sync', 'import', 'export', 'webhook', 'third-party', 'payment', 'email', 'sms', 'notification'];
  const integrationCount = integrationKeywords.filter(k => description.toLowerCase().includes(k)).length;
  const integrationFactor = Math.min(integrationCount / 4, 1);
  factors.push({
    name: 'Integration Needs',
    weight: 0.1,
    value: integrationFactor,
    description: `${integrationCount} integration references detected`,
  });
  totalScore += integrationFactor * 0.1;

  const level: ComplexityProfile['level'] =
    totalScore < 0.15 ? 'trivial' :
    totalScore < 0.3 ? 'simple' :
    totalScore < 0.5 ? 'moderate' :
    totalScore < 0.7 ? 'complex' : 'enterprise';

  const recommendedRounds =
    level === 'trivial' ? 0 :
    level === 'simple' ? 1 :
    level === 'moderate' ? 2 :
    level === 'complex' ? 3 : 4;

  const maxRounds =
    level === 'trivial' ? 1 :
    level === 'simple' ? 2 :
    level === 'moderate' ? 3 :
    level === 'complex' ? 4 : 5;

  const ambiguityScore = (domainAmbiguity * 0.4 + descriptionBrevity * 0.4 + (entityCount === 0 ? 0.2 : 0));

  return {
    score: totalScore,
    level,
    factors,
    recommendedRounds,
    maxRounds,
    entityCount,
    workflowCount,
    roleCount,
    integrationCount,
    ambiguityScore,
  };
}

export function identifyInformationGaps(
  description: string,
  extractedEntities: NLPEntityExtraction,
  complexity: ComplexityProfile
): InformationGap[] {
  const gaps: InformationGap[] = [];
  const lower = description.toLowerCase();

  if (extractedEntities.entities.length === 0) {
    gaps.push({
      category: 'entities',
      description: 'No clear data entities identified from description',
      severity: 'blocking',
      defaultResolution: 'Use generic Record entity with standard fields',
    });
  }

  if (complexity.ambiguityScore > 0.6 && complexity.level !== 'trivial' && complexity.level !== 'simple') {
    gaps.push({
      category: 'scope',
      description: 'The project scope is ambiguous - unclear what features are needed',
      severity: 'blocking',
    });
  }

  if (extractedEntities.roles.length === 0 && lower.includes('user')) {
    gaps.push({
      category: 'roles',
      description: 'User roles not specified - unclear who uses the system and what permissions they need',
      severity: 'important',
      defaultResolution: 'Default to Admin/Manager/User roles',
    });
  }

  for (const entity of extractedEntities.entities) {
    if (entity.fields.length <= 3) {
      gaps.push({
        category: 'entities',
        description: `${entity.name} has very few fields - may need more detail about what data to track`,
        severity: 'important',
        defaultResolution: `Use standard ${entity.name.toLowerCase()} fields from domain knowledge`,
      });
    }
  }

  if (extractedEntities.workflows.length === 0 && extractedEntities.entities.length >= 2) {
    gaps.push({
      category: 'workflows',
      description: 'No workflows detected - unclear how data flows between entities',
      severity: 'important',
      defaultResolution: 'Generate standard CRUD workflows with basic status transitions',
    });
  }

  if (!lower.includes('dashboard') && !lower.includes('report') && !lower.includes('analytics')) {
    gaps.push({
      category: 'ui',
      description: 'No explicit dashboard/reporting requirements mentioned',
      severity: 'nice-to-have',
      defaultResolution: 'Include a default dashboard with KPI cards and recent activity',
    });
  }

  const hasRelationshipClues = lower.includes('belong') || lower.includes('has') ||
    lower.includes('owns') || lower.includes('relates') || lower.includes('linked') ||
    lower.includes('associated');
  if (!hasRelationshipClues && extractedEntities.entities.length >= 3) {
    gaps.push({
      category: 'data',
      description: 'Entity relationships not clearly specified - unclear how data connects',
      severity: 'important',
      defaultResolution: 'Infer relationships from field naming conventions (e.g., customerId -> Customer)',
    });
  }

  if (extractedEntities.entities.some(e =>
    e.fields.some(f => /status|state|phase/i.test(f.name))
  ) && !lower.includes('notification') && !lower.includes('alert')) {
    gaps.push({
      category: 'business-rules',
      description: 'Status-driven entities detected but no notification rules specified',
      severity: 'nice-to-have',
      defaultResolution: 'Skip notifications for initial version',
    });
  }

  return gaps;
}

export function generateClarificationQuestions(
  gaps: InformationGap[],
  complexity: ComplexityProfile,
  extractedEntities: NLPEntityExtraction,
  previousAnswers: Map<string, string> = new Map()
): ClarificationQuestion[] {
  const questions: ClarificationQuestion[] = [];
  let qId = 0;

  const blockingGaps = gaps.filter(g => g.severity === 'blocking');
  const importantGaps = gaps.filter(g => g.severity === 'important');
  const niceToHaveGaps = gaps.filter(g => g.severity === 'nice-to-have');

  for (const gap of blockingGaps) {
    const question = generateQuestionForGap(gap, extractedEntities, `q${++qId}`);
    if (question && !previousAnswers.has(question.id)) {
      questions.push(question);
    }
  }

  if (complexity.level !== 'trivial') {
    for (const gap of importantGaps) {
      const question = generateQuestionForGap(gap, extractedEntities, `q${++qId}`);
      if (question && !previousAnswers.has(question.id)) {
        questions.push(question);
      }
    }
  }

  if (complexity.level === 'complex' || complexity.level === 'enterprise') {
    for (const gap of niceToHaveGaps) {
      const question = generateQuestionForGap(gap, extractedEntities, `q${++qId}`);
      if (question && !previousAnswers.has(question.id)) {
        questions.push(question);
      }
    }
  }

  questions.sort((a, b) => b.priority - a.priority);

  const maxQuestions = complexity.level === 'trivial' ? 2 :
                       complexity.level === 'simple' ? 3 :
                       complexity.level === 'moderate' ? 4 :
                       complexity.level === 'complex' ? 5 : 6;

  return questions.slice(0, maxQuestions);
}

function generateQuestionForGap(
  gap: InformationGap,
  extractedEntities: NLPEntityExtraction,
  id: string
): ClarificationQuestion | null {
  switch (gap.category) {
    case 'scope':
      return {
        id,
        category: 'scope',
        question: 'Could you describe the main things you want to manage or track in this application? For example, "I want to manage customers, orders, and products."',
        priority: 100,
        impact: 'critical',
        context: gap.description,
        satisfied: false,
      };

    case 'entities':
      if (gap.description.includes('No clear data entities')) {
        return {
          id,
          category: 'entities',
          question: 'What are the main items or records you need to keep track of? For example, employees, products, appointments, etc.',
          priority: 95,
          impact: 'critical',
          context: gap.description,
          satisfied: false,
        };
      } else {
        const entityName = gap.description.split(' ')[0];
        return {
          id,
          category: 'entities',
          question: `What specific details do you need to track for each ${entityName}? For example, name, email, status, date, amount, etc.`,
          priority: 70,
          impact: 'high',
          context: gap.description,
          satisfied: false,
        };
      }

    case 'roles':
      return {
        id,
        category: 'roles',
        question: 'Who will use this system? For example: admins who manage everything, managers who approve items, and regular users who can only view and create their own records.',
        priority: 60,
        impact: 'medium',
        context: gap.description,
        options: ['Admin only', 'Admin + Users', 'Admin + Manager + Users', 'Multiple role types'],
        defaultAnswer: 'Admin + Users',
        satisfied: false,
      };

    case 'workflows':
      const entityNames = extractedEntities.entities.map(e => e.name).join(', ');
      return {
        id,
        category: 'workflows',
        question: `How should the workflow progress for your ${entityNames}? For example, "Orders go from draft -> pending -> approved -> shipped -> delivered."`,
        priority: 65,
        impact: 'high',
        context: gap.description,
        satisfied: false,
      };

    case 'ui':
      return {
        id,
        category: 'ui',
        question: 'Would you like a dashboard with key performance indicators (like total counts, recent activity, charts)? What metrics matter most to you?',
        priority: 40,
        impact: 'medium',
        context: gap.description,
        options: ['Yes, include a dashboard', 'No dashboard needed', 'Simple overview page'],
        defaultAnswer: 'Yes, include a dashboard',
        satisfied: false,
      };

    case 'data':
      return {
        id,
        category: 'data',
        question: `How are your data items related? For example: "Each order belongs to a customer" or "Projects have multiple tasks."`,
        priority: 55,
        impact: 'high',
        context: gap.description,
        satisfied: false,
      };

    case 'business-rules':
      return {
        id,
        category: 'business-rules',
        question: 'Are there any special rules or automations you need? For example: "Send notification when order status changes" or "Auto-calculate total from line items."',
        priority: 30,
        impact: 'low',
        context: gap.description,
        defaultAnswer: 'No special rules for now',
        satisfied: false,
      };

    case 'integrations':
      return {
        id,
        category: 'integrations',
        question: 'Do you need to connect with any external services? For example: payment processing, email sending, file storage, etc.',
        priority: 35,
        impact: 'medium',
        context: gap.description,
        options: ['No integrations needed', 'Email notifications', 'Payment processing', 'File uploads', 'Other'],
        defaultAnswer: 'No integrations needed',
        satisfied: false,
      };

    default:
      return null;
  }
}

export function shouldAskMoreQuestions(state: ClarificationState): { shouldAsk: boolean; reason: string } {
  const readinessThreshold = state.complexity.level === 'trivial' ? 0.6 :
    state.complexity.level === 'simple' ? 0.7 :
    state.complexity.level === 'moderate' ? 0.8 : 0.85;
  if (state.readinessScore >= readinessThreshold) {
    return { shouldAsk: false, reason: `Sufficient information gathered (readiness >= ${Math.round(readinessThreshold * 100)}% for ${state.complexity.level} project)` };
  }

  if (state.roundsCompleted >= state.complexity.maxRounds) {
    return { shouldAsk: false, reason: `Maximum rounds reached (${state.complexity.maxRounds})` };
  }

  const blockingGaps = state.informationGaps.filter(g => g.severity === 'blocking' && !g.resolvedBy);
  if (blockingGaps.length > 0 && state.roundsCompleted < state.complexity.maxRounds) {
    return { shouldAsk: true, reason: `${blockingGaps.length} critical information gaps remain` };
  }

  const unansweredCritical = state.questions.filter(q =>
    !q.satisfied && (q.impact === 'critical' || q.impact === 'high')
  );
  if (unansweredCritical.length > 0 && state.roundsCompleted < state.complexity.recommendedRounds) {
    return { shouldAsk: true, reason: `${unansweredCritical.length} important questions unanswered` };
  }

  if (state.complexity.level === 'trivial' || state.complexity.level === 'simple') {
    if (state.roundsCompleted >= 1) {
      return { shouldAsk: false, reason: 'Simple project with 1 round of clarification completed' };
    }
  }

  const diminishingReturns = state.roundsCompleted >= 2 &&
    state.answeredQuestions.size > 0 &&
    state.readinessScore > 0.6;
  if (diminishingReturns) {
    return { shouldAsk: false, reason: 'Diminishing returns - proceeding with defaults for remaining gaps' };
  }

  return {
    shouldAsk: state.roundsCompleted < state.complexity.recommendedRounds,
    reason: state.roundsCompleted < state.complexity.recommendedRounds
      ? `Round ${state.roundsCompleted + 1} of ${state.complexity.recommendedRounds} recommended`
      : 'Recommended rounds completed',
  };
}

export function calculateReadinessScore(
  extractedEntities: NLPEntityExtraction,
  gaps: InformationGap[],
  answeredQuestions: Map<string, string>
): number {
  let score = 0;

  if (extractedEntities.entities.length > 0) score += 0.3;
  if (extractedEntities.entities.length >= 3) score += 0.1;

  if (extractedEntities.workflows.length > 0) score += 0.15;

  if (extractedEntities.roles.length > 0) score += 0.1;

  const blockingResolved = gaps.filter(g => g.severity === 'blocking' && g.resolvedBy).length;
  const totalBlocking = gaps.filter(g => g.severity === 'blocking').length;
  if (totalBlocking === 0) {
    score += 0.2;
  } else {
    score += (blockingResolved / totalBlocking) * 0.2;
  }

  if (answeredQuestions.size >= 2) score += 0.1;
  if (answeredQuestions.size >= 4) score += 0.05;

  return Math.min(score, 1);
}

export function processAnswer(
  state: ClarificationState,
  questionId: string,
  answer: string
): ClarificationState {
  const question = state.questions.find(q => q.id === questionId);
  if (question) {
    question.satisfied = true;
    question.answer = answer;
  }

  state.answeredQuestions.set(questionId, answer);

  for (const gap of state.informationGaps) {
    if (question && gap.category === question.category && !gap.resolvedBy) {
      gap.resolvedBy = questionId;
    }
  }

  return state;
}

export function applyDefaultsForUnresolvedGaps(gaps: InformationGap[]): InformationGap[] {
  return gaps.map(gap => {
    if (!gap.resolvedBy && gap.defaultResolution) {
      return { ...gap, resolvedBy: 'default' };
    }
    return gap;
  });
}

export function createClarificationState(
  conversationId: number,
  description: string,
  extractedEntities: NLPEntityExtraction,
  detectedDomains: { confidence: number; name: string }[]
): ClarificationState {
  const complexity = assessComplexity(description, extractedEntities, detectedDomains);
  const gaps = identifyInformationGaps(description, extractedEntities, complexity);
  const questions = generateClarificationQuestions(gaps, complexity, extractedEntities);
  const readinessScore = calculateReadinessScore(extractedEntities, gaps, new Map());

  return {
    conversationId,
    complexity,
    questions,
    askedQuestions: [],
    answeredQuestions: new Map(),
    informationGaps: gaps,
    roundsCompleted: 0,
    shouldContinue: questions.length > 0 && complexity.level !== 'trivial',
    readinessScore,
  };
}

export function formatClarificationMessage(questions: ClarificationQuestion[]): string {
  if (questions.length === 0) return '';

  const lines: string[] = [];
  lines.push("I have a few questions to make sure I build exactly what you need:\n");

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    lines.push(`**${i + 1}.** ${q.question}`);

    if (q.options && q.options.length > 0) {
      lines.push(`   Options: ${q.options.join(' | ')}`);
    }

    if (q.defaultAnswer) {
      lines.push(`   _(If not sure, I'll go with: "${q.defaultAnswer}")_`);
    }
    lines.push('');
  }

  lines.push("Feel free to answer any or all of these. For anything you skip, I'll use sensible defaults.");

  return lines.join('\n');
}

export function parseAnswersFromResponse(
  response: string,
  questions: ClarificationQuestion[]
): Map<string, string> {
  const answers = new Map<string, string>();
  const lines = response.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  const numberedPattern = /^(\d+)[.)]\s*(.+)/;
  for (const line of lines) {
    const match = line.match(numberedPattern);
    if (match) {
      const questionIndex = parseInt(match[1]) - 1;
      if (questionIndex >= 0 && questionIndex < questions.length) {
        answers.set(questions[questionIndex].id, match[2].trim());
      }
    }
  }

  if (answers.size === 0 && questions.length === 1) {
    answers.set(questions[0].id, response.trim());
  }

  if (answers.size === 0 && lines.length >= questions.length) {
    for (let i = 0; i < Math.min(lines.length, questions.length); i++) {
      answers.set(questions[i].id, lines[i]);
    }
  }

  if (answers.size === 0 && questions.length > 0) {
    for (const q of questions) {
      if (q.options && q.options.length > 0) {
        const responseLower = response.toLowerCase();
        for (const option of q.options) {
          if (responseLower.includes(option.toLowerCase())) {
            answers.set(q.id, option);
            break;
          }
        }
      }
    }
  }

  return answers;
}

export interface LowConfidenceQuestion {
  entityName: string;
  question: string;
  questionType: 'fields' | 'purpose' | 'example';
  priority: number;
}

export function generateLowConfidenceQuestions(
  lowConfidenceItems: { section: string; item: string; confidence: number; reason: string }[]
): LowConfidenceQuestion[] {
  const questions: LowConfidenceQuestion[] = [];

  const entityItems = lowConfidenceItems.filter(i => i.section === 'Entity');

  for (const item of entityItems.slice(0, 3)) {
    if (item.confidence === 0) {
      questions.push({
        entityName: item.item,
        question: `I'm not sure what a "${item.item}" looks like in your application. Could you describe what fields or properties a ${item.item} record should have? For example: "A ${item.item} has a title, description, start date, and priority level."`,
        questionType: 'fields',
        priority: 100,
      });
    } else if (item.confidence < 0.3) {
      questions.push({
        entityName: item.item,
        question: `I made some guesses about what a "${item.item}" should contain, but I'm not very confident. Could you either describe its key fields, or paste a sample record so I can get the structure right?`,
        questionType: 'example',
        priority: 90,
      });
    } else {
      questions.push({
        entityName: item.item,
        question: `I've inferred some fields for "${item.item}" but want to confirm — what's the primary purpose of this entity in your application?`,
        questionType: 'purpose',
        priority: 70,
      });
    }
  }

  const nonEntityItems = lowConfidenceItems.filter(i => i.section !== 'Entity');
  for (const item of nonEntityItems.slice(0, 2)) {
    if (item.section === 'Security' && item.confidence < 0.5) {
      questions.push({
        entityName: item.item,
        question: 'What kind of user access control do you need? For example: "Only admins can delete records" or "Each user should only see their own data."',
        questionType: 'purpose',
        priority: 60,
      });
    }
    if (item.section === 'UX Flows' && item.confidence < 0.5) {
      questions.push({
        entityName: item.item,
        question: 'Are there any specific user workflows or multi-step processes (like onboarding, checkout, or approval flows) that are important for this application?',
        questionType: 'purpose',
        priority: 50,
      });
    }
  }

  questions.sort((a, b) => b.priority - a.priority);
  return questions.slice(0, 4);
}

export function formatLowConfidenceInterviewMessage(questions: LowConfidenceQuestion[]): string {
  if (questions.length === 0) return '';

  const lines: string[] = [];
  lines.push("I've built a plan, but I have **lower confidence** in a few areas. Answering these quick questions will significantly improve the generated code:\n");

  for (let i = 0; i < questions.length; i++) {
    lines.push(`**${i + 1}.** ${questions[i].question}`);
  }

  lines.push("\n*You can answer any or all of these, or just say \"skip\" to proceed with my best guesses. You can also paste a sample record for any entity (e.g., a JSON example) and I'll infer the structure from it.*");

  return lines.join('\n');
}