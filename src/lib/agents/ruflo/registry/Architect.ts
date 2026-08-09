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

- Every module must have a clear responsibility.
- Module dependencies should be explicit and minimal.
- Prefer simple architectures over unnecessary complexity.
- Follow conventions appropriate to the selected technology stack.
- **Entry Point Conventions**:
  - Web application HTML entry point ('index.html') MUST ALWAYS be placed at the project root ('index.html') or inside 'public/index.html'. NEVER place 'index.html' inside 'src/' or 'src/ui/'.
  - Config files ('vite.config.js', 'webpack.config.js', 'package.json', 'tsconfig.json') MUST ALWAYS be placed at the project root.

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
    architectureStyle: { type: 'string' },
    modules: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          purpose: { type: 'string' },
          supportsFeatures: { type: 'array', items: { type: 'string' } },
          dependsOn: { type: 'array', items: { type: 'string' } },
          ownedDirectories: { type: 'array', items: { type: 'string' } },
          ownedFiles: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    projectStructure: {
      type: 'object',
      properties: {
        root: { type: 'string' },
        directories: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              path: { type: 'string' },
              moduleId: { type: 'string' }
            }
          }
        },
        files: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              path: { type: 'string' },
              moduleId: { type: 'string' },
              module: { type: 'string' },
              purpose: { type: 'string' },
              type: { type: 'string' }
            }
          }
        }
      }
    },
    sharedResources: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          type: { type: 'string' },
          purpose: { type: 'string' },
          usedByModules: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    moduleDependencies: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          moduleId: { type: 'string' },
          dependsOn: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    projectConventions: {
      type: 'object',
      properties: {
        namingConvention: { type: 'string' },
        folderConvention: { type: 'string' },
        importConvention: { type: 'string' },
        codeOrganization: { type: 'string' }
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
  required: ['architectureStyle', 'modules', 'projectStructure', 'projectConventions']
};

import { ContextResolver } from '../contextResolver';

export async function getContext(ledger: StageLedger): Promise<string> {
  const convoId = (ledger as any).conversationId;
  if (convoId) {
    const data = await ContextResolver.resolveExactPaths(convoId, [
      { fromAgent: 'Queen', select: ['projectName', 'projectGoal', 'mvpScope.included', 'constraints'] },
      { fromAgent: 'Planner', select: ['recommendedTechStack', 'features', 'functionalRequirements', 'nonFunctionalRequirements.performance', 'nonFunctionalRequirements.scalability'] }
    ]);
    return JSON.stringify(data, null, 2);
  }
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
