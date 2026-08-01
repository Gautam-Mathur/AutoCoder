import { StageLedger } from '../memory';

export const name = 'Queen';
export const temperature = 0.2;
export const maxTokens = 1024;

export const systemPrompt = `You are the Queen Agent, the first agent in the RuFlo software engineering pipeline.

Your responsibility is to convert a user's software request into the project's canonical software specification.

You define what should be built, not how it should be built.

The specification you produce becomes the authoritative project specification consumed by downstream agents.

## Responsibilities

- Determine whether the request is a valid software engineering request.
- Identify the actual problem being solved.
- Define the project purpose.
- Define the expected project outcome.
- Define an achievable MVP scope.
- Record explicit constraints.
- Record obvious implementation risks.
- Produce a valid JSON document matching the required schema.

## Boundaries

You must never:

- Design architecture
- Select technologies
- Design APIs
- Design databases
- Design UI
- Design implementation
- Generate source code

Those responsibilities belong to downstream agents.

## Decision Rules

When information is missing:

- Make conservative assumptions.
- Prefer the smallest practical MVP.
- Never expand the project beyond the user's request.

## Output Contract

- Produce only valid JSON.
- Populate every required schema field.
- Use "N/A" only when genuinely not applicable.
- Produce no additional text.`;

export const schema = {
  type: 'object',
  properties: {
    project: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        type: { type: 'string' },
        summary: { type: 'string' },
        problemStatement: { type: 'string' },
        goal: { type: 'string' },
        targetUsers: { type: 'array', items: { type: 'string' } },
        platforms: { type: 'array', items: { type: 'string' } },
        deploymentTarget: { type: 'string' }
      }
    },
    scope: {
      type: 'object',
      properties: {
        mvp: {
          type: 'object',
          properties: {
            included: { type: 'array', items: { type: 'string' } },
            excluded: { type: 'array', items: { type: 'string' } }
          }
        },
        futureScope: { type: 'array', items: { type: 'string' } }
      }
    },
    constraints: {
      type: 'object',
      properties: {
        technical: { type: 'array', items: { type: 'string' } },
        business: { type: 'array', items: { type: 'string' } },
        platform: { type: 'array', items: { type: 'string' } },
        legal: { type: 'array', items: { type: 'string' } },
        budget: { type: 'string' },
        timeline: { type: 'string' },
        other: { type: 'array', items: { type: 'string' } }
      }
    },
    assumptions: { type: 'array', items: { type: 'string' } },
    risks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] }
        }
      }
    },
    metadata: {
      type: 'object',
      properties: {
        version: { type: 'string' },
        generatedAt: { type: 'string' },
        status: { type: 'string' }
      }
    },
    projectName: { type: 'string' },
    problemStatement: { type: 'string' },
    projectDescription: { type: 'string' },
    projectGoal: { type: 'string' },
    mvpScope: {
      type: 'object',
      properties: {
        included: { type: 'array', items: { type: 'string' } },
        excluded: { type: 'array', items: { type: 'string' } }
      }
    }
  }
};

export async function getContext(ledger: StageLedger): Promise<string> {
  return '{}';
}
