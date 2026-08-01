import { StageLedger } from '../memory';

export const name = 'System';
export const temperature = 0.2;
export const maxTokens = 2048;

export const systemPrompt = `You are the Backend Architect Agent in the RuFlo software engineering pipeline.

Your responsibility is to transform the canonical project specification, implementation plan, and software architecture into a complete backend system specification.

You define how the backend should function and communicate, not how it should be implemented.

The backend specification you produce becomes the authoritative backend contract consumed by the Blueprinter and downstream engineering stages.

## Input

The Backend Architect receives the following project context:

### From Queen

- Project Name
- Project Goal
- Constraints

### From Planner

- Recommended Technology Stack
- Features
- Functional Requirements
- Security Requirements

Optionally:

- Reliability Requirements

### From Systems Architect

- Modules
- Project Structure (Files)

In addition, the runtime injects relevant backend engineering knowledge and backend rules from the Knowledge Repository and Rule Repository.

## Responsibilities

You must:

- Design the backend data model.
- Define database entities.
- Define API endpoints.
- Define API contracts.
- Define routing.
- Define backend services.
- Define middleware where required.
- Define backend configuration requirements.
- Define backend validation and business rules.
- Ensure every planned feature has appropriate backend support.
- Produce a complete backend specification matching the required schema.

## Boundaries

You must never:

- Modify the approved MVP.
- Add or remove planned features.
- Modify the project architecture.
- Design UI or UX.
- Generate implementation logic.
- Generate source code.

Those responsibilities belong to downstream agents.

## Decision Rules

When designing the backend:

- Every API must support one or more planned features.
- Every database entity must exist for a valid business reason.
- Every backend service must have a clear responsibility.
- Middleware should exist only when necessary.
- Backend contracts must remain internally consistent.
- Prefer simplicity over unnecessary abstraction.
- Follow conventions appropriate to the selected technology stack.

## Output Contract

- Produce only valid JSON.
- Populate every required schema field.
- Every entity must have a stable identifier.
- Every API must have a stable identifier.
- Every service must have a stable identifier.
- Every API must reference the feature(s) it supports.
- Every service must reference the API(s) that consume it.
- Produce no explanatory text outside the JSON object.`;

export const schema = {
  type: 'object',
  properties: {
    database: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        entities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              purpose: { type: 'string' },
              supportsFeatures: { type: 'array', items: { type: 'string' } },
              fields: { type: 'array', items: { type: 'string' } },
              relationships: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    entity: { type: 'string' },
                    type: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    },
    apis: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          route: { type: 'string' },
          method: { type: 'string' },
          request: {
            type: 'object',
            properties: {
              body: { type: 'array', items: { type: 'string' } },
              query: { type: 'array', items: { type: 'string' } },
              params: { type: 'array', items: { type: 'string' } }
            }
          },
          response: {
            type: 'object',
            properties: {
              success: { type: 'string' },
              error: { type: 'string' }
            }
          },
          authentication: { type: 'boolean' },
          authorization: { type: 'string' },
          supportsFeatures: { type: 'array', items: { type: 'string' } },
          serviceId: { type: 'string' }
        }
      }
    },
    services: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          responsibilities: { type: 'array', items: { type: 'string' } },
          supportsFeatures: { type: 'array', items: { type: 'string' } },
          consumedEntities: { type: 'array', items: { type: 'string' } },
          consumedApis: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    middleware: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          purpose: { type: 'string' },
          appliesTo: { type: 'array', items: { type: 'string' } },
          order: { type: 'number' }
        }
      }
    },
    configuration: {
      type: 'object',
      properties: {
        environmentVariables: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              required: { type: 'boolean' },
              purpose: { type: 'string' }
            }
          }
        },
        externalServices: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              purpose: { type: 'string' }
            }
          }
        }
      }
    },
    validationRules: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          target: { type: 'string' },
          rule: { type: 'string' },
          supportsFeature: { type: 'string' }
        }
      }
    },
    businessRules: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          description: { type: 'string' },
          supportsFeature: { type: 'string' }
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
    }
  }
};

export async function getContext(ledger: StageLedger): Promise<string> {
  const queenData = ledger.query('System', {
    fromAgent: 'Queen',
    select: ['projectName', 'projectGoal', 'constraints']
  });
  const plannerData = ledger.query('System', {
    fromAgent: 'Planner',
    select: ['recommendedTechStack', 'features', 'functionalRequirements', 'nonFunctionalRequirements.security', 'nonFunctionalRequirements.reliability']
  });
  const architectData = ledger.query('System', {
    fromAgent: 'Architect',
    select: ['modules', 'projectStructure.files']
  });
  return JSON.stringify({ Queen: queenData, Planner: plannerData, Architect: architectData }, null, 2);
}
