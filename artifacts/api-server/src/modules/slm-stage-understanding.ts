/**
 * SLM Stage: Understanding — Enhances deep understanding with SLM
 *
 * SAFE stage: SLM improves intent nuance, multi-domain blending,
 * analogy interpretation, and implicit requirements.
 *
 * SLM outputs structured JSON matching UnderstandingResult schema.
 * Rule engine validates and normalizes.
 */

import { registerStageTemplate } from './slm-inference-engine.js';

export const UNDERSTANDING_STAGE_ID = 'understand';

export function registerUnderstandingTemplate(): void {
  registerStageTemplate({
    stage: UNDERSTANDING_STAGE_ID,
    systemPrompt: `You are a senior product manager analyzing a software project request.
Your job is to deeply understand the user's intent and extract structured requirements.

You excel at:
- Detecting the primary domain and any secondary domains being blended
- Understanding analogies ("like Airbnb but for X")
- Inferring implicit requirements the user hasn't stated
- Breaking down complex requests into clear goals and features
- Detecting workflows, user roles, and business processes
- Understanding emotional intent (speed, simplicity, professionalism, fun)

THINKING PROCESS (reason step by step before producing JSON):
1. Identify what kind of app this is and its main purpose
2. List every entity (thing) the app needs to store or manage
3. Think about who will use it and what they need to do
4. Ask: what did the user NOT say but obviously needs? (e.g. auth, search, notifications)
5. Assess complexity based on entity count, workflows, and roles
6. Only then produce the JSON output

EXAMPLE:
Request: "build me a task manager for teams"
Reasoning:
- App type: project management / task tracking
- Entities: Task, Project, Team, User, Comment, Attachment
- Roles: admin (manages team), member (creates/completes tasks)
- Implied: due dates, priority levels, status transitions, email notifications, activity log
- Complexity: moderate (multi-user, workflow states, notifications)

Output a structured JSON analysis.`,

    userPromptBuilder: (context: Record<string, any>) => {
      let prompt = `Analyze this software project request:\n\n"${context.userRequest || context.ruleOutput?.level1_intent?.primaryGoal || ''}"`;

      if (context.ruleOutput) {
        prompt += `\n\nThe rule-based analyzer already detected:\n`;
        const rule = context.ruleOutput;

        if (rule.level1_intent) {
          prompt += `- Primary goal: ${rule.level1_intent.primaryGoal}\n`;
          prompt += `- App type: ${rule.level1_intent.appType || 'unknown'}\n`;
          if (rule.level1_intent.secondaryGoals?.length > 0) {
            prompt += `- Secondary goals: ${rule.level1_intent.secondaryGoals.join(', ')}\n`;
          }
        }

        if (rule.level2_domain) {
          prompt += `- Domain: ${rule.level2_domain.primaryDomain?.name || 'unknown'}\n`;
        }

        if (rule.level3_entities?.entities?.length > 0) {
          prompt += `- Entities found: ${rule.level3_entities.entities.map((e: any) => e.name).join(', ')}\n`;
        }

        if (rule.level4_workflows?.workflows?.length > 0) {
          prompt += `- Workflows: ${rule.level4_workflows.workflows.map((w: any) => w.name).join(', ')}\n`;
        }

        prompt += `\nEnhance this analysis. Focus on what the rule engine might have missed:
- Hidden entities or relationships
- Implied features the user expects but didn't say
- Domain-specific patterns that should be applied
- User journey nuances`;
      }

      return prompt;
    },

    outputSchema: {
      type: 'object',
      properties: {
        primaryGoal: { type: 'string', description: 'Main purpose of the application' },
        secondaryGoals: { type: 'array', items: { type: 'string' } },
        appType: { type: 'string', description: 'Type: dashboard, marketplace, social, cms, etc.' },
        domains: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              confidence: { type: 'number' },
              reason: { type: 'string' },
            },
          },
        },
        entities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              isImplied: { type: 'boolean' },
              relationships: { type: 'array', items: { type: 'string' } },
            },
          },
        },
        roles: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              permissions: { type: 'array', items: { type: 'string' } },
            },
          },
        },
        workflows: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              steps: { type: 'array', items: { type: 'string' } },
              trigger: { type: 'string' },
            },
          },
        },
        implicitRequirements: {
          type: 'array',
          items: { type: 'string' },
          description: 'Requirements the user likely needs but did not mention',
        },
        complexity: { type: 'string', enum: ['simple', 'moderate', 'complex', 'enterprise'] },
        analogies: { type: 'array', items: { type: 'string' }, description: 'Detected analogies to known products' },
      },
      required: ['primaryGoal', 'entities', 'complexity'],
    },

    maxTokens: 2048,
    temperature: 0.3,
    timeoutMs: 20000,
  });
}

export function mergeUnderstandingResults(ruleResult: any, slmResult: any): any {
  if (!slmResult) return ruleResult;
  if (!ruleResult) return slmResult;

  const merged = JSON.parse(JSON.stringify(ruleResult));

  if (slmResult.implicitRequirements?.length > 0) {
    if (!merged.level1_intent) merged.level1_intent = {};
    if (!merged.level1_intent.impliedFeatures) merged.level1_intent.impliedFeatures = [];

    for (const req of slmResult.implicitRequirements) {
      if (!merged.level1_intent.impliedFeatures.includes(req)) {
        merged.level1_intent.impliedFeatures.push(req);
      }
    }
  }

  if (slmResult.entities?.length > 0) {
    if (!merged.level3_entities) merged.level3_entities = { mentionedEntities: [], inferredEntities: [], relationships: [], domainEntities: [] };
    if (!merged.level3_entities.inferredEntities) merged.level3_entities.inferredEntities = [];

    const existingInferred = new Set(merged.level3_entities.inferredEntities.map((e: string) => e.toLowerCase()));
    const existingMentioned = new Set((merged.level3_entities.mentionedEntities || []).map((e: string) => e.toLowerCase()));

    for (const entity of slmResult.entities) {
      if (entity.isImplied && !existingInferred.has(entity.name.toLowerCase()) && !existingMentioned.has(entity.name.toLowerCase())) {
        merged.level3_entities.inferredEntities.push(entity.name);
        existingInferred.add(entity.name.toLowerCase());
      }
    }
  }

  if (slmResult.workflows?.length > 0) {
    if (!merged.level4_workflows) merged.level4_workflows = { mentionedWorkflows: [], inferredWorkflows: [], approvalFlows: [], statusTrackingNeeded: [] };
    if (!merged.level4_workflows.inferredWorkflows) merged.level4_workflows.inferredWorkflows = [];

    const existingWorkflows = new Set(merged.level4_workflows.inferredWorkflows.map((w: any) => (w.name || '').toLowerCase()));

    for (const workflow of slmResult.workflows) {
      if (!existingWorkflows.has(workflow.name.toLowerCase())) {
        merged.level4_workflows.inferredWorkflows.push({
          name: workflow.name,
          entity: workflow.name,
          states: workflow.steps || [],
          transitions: [],
        });
        existingWorkflows.add(workflow.name.toLowerCase());
      }
    }
  }

  if (slmResult.roles?.length > 0) {
    if (!merged.level5_clarification) merged.level5_clarification = {};
    if (!merged.level5_clarification.assumptions) merged.level5_clarification.assumptions = [];

    for (const role of slmResult.roles) {
      const assumption = `User role "${role.name}" with permissions: ${(role.permissions || []).join(', ')}`;
      if (!merged.level5_clarification.assumptions.includes(assumption)) {
        merged.level5_clarification.assumptions.push(assumption);
      }
    }
  }

  return merged;
}

export function scoreUnderstandingOutput(output: any, _context: Record<string, any>): number {
  let score = 0.5;

  if (output?.level1_intent?.primaryGoal || output?.primaryGoal) score += 0.1;
  if (output?.level3_entities?.entities?.length > 0 || output?.entities?.length > 0) score += 0.1;
  if (output?.level4_workflows?.workflows?.length > 0 || output?.workflows?.length > 0) score += 0.1;
  if (output?.implicitRequirements?.length > 0) score += 0.1;
  if (output?.roles?.length > 0) score += 0.05;
  if (output?.analogies?.length > 0) score += 0.05;

  return Math.min(score, 1.0);
}