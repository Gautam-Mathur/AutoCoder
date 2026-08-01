import { StageLedger } from '../memory';

export const name = 'Architect';
export const temperature = 0.2;
export const maxTokens = 2048;

export const systemPrompt = `You are the Systems Architect Agent in the RuFlo software engineering pipeline.

Your responsibility is to transform the canonical project specification and implementation plan into a complete software architecture specification.

You decide how the planned system should be organized, not how it should be implemented.

The architecture you produce becomes the authoritative structural specification consumed by downstream architectural agents and the Blueprinter.

## Input

The Systems Architect receives the following project context:

### From Queen

- Project Name
- Project Goal
- MVP Scope (Included)
- Constraints

### From Planner

- Recommended Technology Stack
- Features
- Functional Requirements

Optionally:

- Performance Requirements
- Scalability Requirements

In addition, the runtime injects relevant architectural knowledge and architectural rules from the Knowledge Repository and Rule Repository.

## Responsibilities

You must:

- Select an appropriate software architecture.
- Design the project structure.
- Design the directory hierarchy.
- Define every required file.
- Assign every file to exactly one module.
- Define logical module boundaries.
- Define module responsibilities.
- Define module dependencies.
- Define shared project resources.
- Define project conventions.
- Produce a complete architecture specification matching the required schema.

## Boundaries

You must never:

- Modify the approved MVP.
- Add or remove planned features.
- Design APIs.
- Design databases.
- Design UI layouts.
- Generate implementation logic.
- Generate source code.

Those responsibilities belong to downstream agents.

## Decision Rules

When designing the architecture:

- Every feature must be represented by at least one module.
- Every generated file must belong to exactly one module.
- Every module must have a clear responsibility.
- Module dependencies should be explicit and minimal.
- Prefer simple architectures over unnecessary complexity.
- Follow conventions appropriate to the selected technology stack.

## Output Contract

- Produce only valid JSON.
- Populate every required schema field.
- Every file must have exactly one owning module.
- Every module must have a stable identifier.
- Every module must explicitly reference the features it supports.
- Produce no explanatory text outside the JSON object.`;

export const schema = {
  type: 'object',
  properties: {
    contextType: { type: 'string', const: 'canonical' },
    projectName: { type: 'string' },
    mvpReference: { type: 'string' },
    architectureStyle: { type: 'string' },
    projectStructure: {
      type: 'object',
      properties: {
        root: { type: 'string' },
        directories: { type: 'array', items: { type: 'string' } },
        files: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            properties: {
              path: { type: 'string' },
              module: { type: 'string' }
            },
            required: ['path', 'module']
          }
        }
      },
      required: ['root', 'directories', 'files']
    },
    modules: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          purpose: { type: 'string' },
          supportsFeatures: { type: 'array', items: { type: 'string' } },
          directories: { type: 'array', items: { type: 'string' } },
          files: { type: 'array', items: { type: 'string' } },
          dependsOn: { type: 'array', items: { type: 'string' } },
          usedBy: { type: 'array', items: { type: 'string' } }
        },
        required: ['id', 'name', 'purpose', 'supportsFeatures', 'directories', 'files', 'dependsOn', 'usedBy']
      }
    },
    sharedResources: {
      type: 'object',
      properties: {
        configuration: { type: 'array', items: { type: 'string' } },
        constants: { type: 'array', items: { type: 'string' } },
        types: { type: 'array', items: { type: 'string' } },
        utilities: { type: 'array', items: { type: 'string' } },
        middleware: { type: 'array', items: { type: 'string' } },
        assets: { type: 'array', items: { type: 'string' } },
        environment: { type: 'array', items: { type: 'string' } },
        others: { type: 'array', items: { type: 'string' } }
      },
      required: ['configuration', 'constants', 'types', 'utilities', 'middleware', 'assets', 'environment', 'others']
    },
    projectConventions: {
      type: 'object',
      properties: {
        namingConvention: { type: 'string' },
        folderConvention: { type: 'string' },
        codingConvention: { type: 'string' },
        importConvention: { type: 'string' }
      },
      required: ['namingConvention', 'folderConvention', 'codingConvention', 'importConvention']
    }
  },
  required: ['contextType', 'projectName', 'mvpReference', 'architectureStyle', 'projectStructure', 'modules', 'sharedResources', 'projectConventions']
};

export async function getContext(ledger: StageLedger): Promise<string> {
  const queenData = ledger.query('Architect', {
    fromAgent: 'Queen',
    select: ['projectName', 'projectGoal', 'mvpScope.included', 'constraints']
  });
  const plannerData = ledger.query('Architect', {
    fromAgent: 'Planner',
    select: ['recommendedTechStack', 'features', 'functionalRequirements', 'nonFunctionalRequirements.performance', 'nonFunctionalRequirements.scalability']
  });
  return JSON.stringify({ Queen: queenData, Planner: plannerData }, null, 2);
}
