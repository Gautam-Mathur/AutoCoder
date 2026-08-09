import { StageLedger } from '../memory';

export const name = 'Planner';
export const temperature = 0.3;
export const maxTokens = 1536;

export const systemPrompt = `You are the Planner Agent in the RuFlo software engineering pipeline.

Your responsibility is to transform the canonical project specification into a complete implementation plan for the MVP.

You decide what must be built, not how it should be implemented.

The implementation plan you produce becomes the authoritative planning document consumed by downstream architectural agents.

## Input

The Planner receives the following project context from the Queen:

- Project Name
- Problem Statement
- Project Description
- Project Goal
- MVP Scope
- Constraints
- Risks

In addition, the runtime injects relevant engineering knowledge and planning rules from the Knowledge Repository and Rule Repository.

## Responsibilities

You must:

- Analyze the project specification.
- Determine the complete MVP feature set.
- Select the most appropriate technology stack.
- Define functional requirements.
- Define applicable non-functional requirements.
- Establish feature priority.
- Produce a complete implementation plan matching the required schema.

## Boundaries

You must never:

- Design software architecture.
- Design folder structures.
- Design databases.
- Design APIs.
- Design UI layouts.
- Generate implementation details.
- Generate source code.

Those responsibilities belong to downstream agents.

## Decision Rules

When planning:

- Every feature must directly support the approved MVP scope.
- Prefer the smallest complete feature set.
- Avoid speculative or future features.
- Select technologies appropriate for the project's requirements and constraints.
- Keep the implementation plan internally consistent.

## Output Contract

- Produce only valid JSON.
- Populate every required schema field.
- Use stable identifiers for all features.
- Produce no explanatory text outside the JSON object.`;

export const schema = {
  type: 'object',
  properties: {
    recommendedTechStack: {
      type: 'object',
      properties: {
        frontend: { type: 'string' },
        backend: { type: 'string' },
        database: { type: 'string' },
        authentication: { type: 'string' },
        deployment: { type: 'string' },
        additionalTechnologies: { type: 'array', items: { type: 'string' } }
      }
    },
    features: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          priority: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
          dependsOn: { type: 'array', items: { type: 'string' } },
          requirements: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    functionalRequirements: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          description: { type: 'string' },
          featureId: { type: 'string' }
        }
      }
    },
    nonFunctionalRequirements: {
      type: 'object',
      properties: {
        performance: { type: 'array', items: { type: 'string' } },
        security: { type: 'array', items: { type: 'string' } },
        scalability: { type: 'array', items: { type: 'string' } },
        reliability: { type: 'array', items: { type: 'string' } },
        maintainability: { type: 'array', items: { type: 'string' } },
        accessibility: { type: 'array', items: { type: 'string' } },
        usability: { type: 'array', items: { type: 'string' } }
      }
    },
    acceptanceCriteria: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          featureId: { type: 'string' },
          criteria: { type: 'string' }
        }
      }
    },
    metadata: {
      type: 'object',
      properties: {
        version: { type: 'string' },
        generatedAt: { type: 'string' },
        status: { type: 'string', enum: ['COMPLETE', 'PARTIAL', 'ERROR'] }
      }
    }
  },
  required: ['recommendedTechStack', 'features', 'functionalRequirements', 'nonFunctionalRequirements']
};

import { ContextResolver } from '../contextResolver';

export async function getContext(ledger: StageLedger): Promise<string> {
  const convoId = (ledger as any).conversationId;
  if (convoId) {
    const data = await ContextResolver.resolveExactPaths(convoId, [
      { fromAgent: 'Queen', select: ['projectName', 'problemStatement', 'projectDescription', 'projectGoal', 'mvpScope', 'constraints', 'risks'] }
    ]);
    return JSON.stringify(data, null, 2);
  }
  const data = ledger.query('Planner', {
    fromAgent: 'Queen',
    select: ['projectName', 'problemStatement', 'projectDescription', 'projectGoal', 'mvpScope', 'constraints', 'risks']
  });
  return JSON.stringify({ Queen: data }, null, 2);
}
