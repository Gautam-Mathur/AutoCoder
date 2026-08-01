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
    contextType: { type: 'string', const: 'canonical' },
    projectName: { type: 'string' },
    mvpReference: { type: 'string' },
    recommendedTechStack: {
      type: 'object',
      properties: {
        frontend: { type: 'string' },
        backend: { type: 'string' },
        database: { type: 'string' },
        authentication: { type: 'string' },
        deployment: { type: 'string' },
        additionalTechnologies: { type: 'array', items: { type: 'string' } }
      },
      required: ['frontend', 'backend', 'database', 'authentication', 'deployment', 'additionalTechnologies']
    },
    features: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          mvpReference: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          priority: { type: 'string', enum: ['Critical', 'High', 'Medium', 'Low'] }
        },
        required: ['id', 'mvpReference', 'name', 'description', 'priority']
      }
    },
    functionalRequirements: { type: 'array', items: { type: 'string' } },
    nonFunctionalRequirements: {
      type: 'object',
      properties: {
        security: { type: 'array', items: { type: 'string' } },
        performance: { type: 'array', items: { type: 'string' } },
        scalability: { type: 'array', items: { type: 'string' } },
        usability: { type: 'array', items: { type: 'string' } },
        maintainability: { type: 'array', items: { type: 'string' } },
        accessibility: { type: 'array', items: { type: 'string' } },
        reliability: { type: 'array', items: { type: 'string' } }
      },
      required: ['security', 'performance', 'scalability', 'usability', 'maintainability', 'accessibility', 'reliability']
    },
    deliverables: { type: 'array', items: { type: 'string' } },
    agentInstructions: {
      type: 'object',
      properties: {
        architect: { type: 'string' },
        system: { type: 'string' },
        designer: { type: 'string' },
        coder: { type: 'string' },
        tester: { type: 'string' },
        debugger: { type: 'string' },
        security: { type: 'string' }
      },
      required: ['architect', 'system', 'designer', 'coder', 'tester', 'debugger', 'security']
    }
  },
  required: ['contextType', 'projectName', 'mvpReference', 'recommendedTechStack', 'features', 'functionalRequirements', 'nonFunctionalRequirements', 'deliverables', 'agentInstructions']
};

export async function getContext(ledger: StageLedger): Promise<string> {
  const data = ledger.query('Planner', {
    fromAgent: 'Queen',
    select: ['projectName', 'problemStatement', 'projectDescription', 'projectGoal', 'mvpScope', 'constraints', 'risks']
  });
  return JSON.stringify({ Queen: data }, null, 2);
}
