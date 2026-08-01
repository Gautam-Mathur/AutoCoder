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
  anyOf: [
    {
      type: 'object',
      properties: {
        contextType: { type: 'string', const: 'canonical' },
        mvpId: { type: 'string' },
        projectName: { type: 'string' },
        problemStatement: { type: 'string' },
        projectDescription: { type: 'string' },
        projectGoal: { type: 'string' },
        mvpScope: {
          type: 'object',
          properties: {
            included: { type: 'array', items: { type: 'string' } },
            excluded: { type: 'array', items: { type: 'string' } }
          },
          required: ['included', 'excluded']
        },
        constraints: { type: 'array', items: { type: 'string' } },
        risks: { type: 'array', items: { type: 'string' } },
        agentInstructions: {
          anyOf: [
            {
              type: 'object',
              properties: {
                planner: { type: 'string' },
                architect: { type: 'string' },
                system: { type: 'string' },
                designer: { type: 'string' },
                reviewer: { type: 'string' },
                coder: { type: 'string' },
                tester: { type: 'string' },
                debugger: { type: 'string' },
                security: { type: 'string' }
              }
            },
            {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  agentName: { type: 'string' },
                  responsibilities: { type: 'array', items: { type: 'string' } }
                }
              }
            }
          ]
        }
      },
      required: ['contextType', 'mvpId', 'projectName', 'problemStatement', 'projectDescription', 'projectGoal', 'mvpScope', 'constraints', 'risks', 'agentInstructions']
    },
    {
      type: 'object',
      properties: {
        contextType: { type: 'string', const: 'validationError' },
        status: { type: 'string', const: 'Rejected' },
        reason: { type: 'string' },
        message: { type: 'string' }
      },
      required: ['contextType', 'status', 'reason', 'message']
    }
  ]
};

export async function getContext(ledger: StageLedger): Promise<string> {
  return '{}';
}
