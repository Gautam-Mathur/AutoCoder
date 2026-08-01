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
    contextType: { type: 'string', const: 'canonical' },
    projectName: { type: 'string' },
    mvpReference: { type: 'string' },
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
              purpose: { type: 'string' },
              fields: { type: 'array', items: { type: 'string' } },
              relationships: { type: 'array', items: { type: 'string' } },
              indexes: { type: 'array', items: { type: 'string' } },
              constraints: { type: 'array', items: { type: 'string' } }
            },
            required: ['id', 'name', 'purpose', 'fields', 'relationships', 'indexes', 'constraints']
          }
        }
      },
      required: ['type', 'entities']
    },
    apis: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          method: { type: 'string' },
          route: { type: 'string' },
          purpose: { type: 'string' },
          featureId: { type: 'string' },
          request: { type: 'object' },
          response: { type: 'object' },
          middleware: { type: 'array', items: { type: 'string' } }
        },
        required: ['id', 'name', 'method', 'route', 'purpose', 'featureId', 'request', 'response', 'middleware']
      }
    },
    routing: {
      type: 'object',
      properties: {
        routerStructure: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              apiId: { type: 'string' },
              path: { type: 'string' }
            },
            required: ['apiId', 'path']
          }
        },
        routeGroups: { type: 'array', items: { type: 'string' } }
      },
      required: ['routerStructure', 'routeGroups']
    },
    middleware: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          purpose: { type: 'string' },
          appliesTo: { type: 'array', items: { type: 'string' } }
        },
        required: ['name', 'purpose', 'appliesTo']
      }
    },
    services: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          purpose: { type: 'string' },
          usedByApis: { type: 'array', items: { type: 'string' } }
        },
        required: ['id', 'name', 'purpose', 'usedByApis']
      }
    },
    configuration: {
      type: 'object',
      properties: {
        environmentVariables: { type: 'array', items: { type: 'string' } },
        storage: { type: 'array', items: { type: 'string' } },
        cache: { type: 'array', items: { type: 'string' } },
        externalServices: { type: 'array', items: { type: 'string' } },
        authentication: { type: 'array', items: { type: 'string' } },
        authorization: { type: 'array', items: { type: 'string' } },
        others: { type: 'array', items: { type: 'string' } }
      },
      required: ['environmentVariables', 'storage', 'cache', 'externalServices', 'authentication', 'authorization', 'others']
    },
    backendRules: {
      type: 'object',
      properties: {
        validationRules: { type: 'array', items: { type: 'string' } },
        businessRules: { type: 'array', items: { type: 'string' } },
        errorHandling: { type: 'array', items: { type: 'string' } },
        securityPolicies: { type: 'array', items: { type: 'string' } }
      },
      required: ['validationRules', 'businessRules', 'errorHandling', 'securityPolicies']
    }
  },
  required: ['contextType', 'projectName', 'mvpReference', 'database', 'apis', 'routing', 'middleware', 'services', 'configuration', 'backendRules']
};

export async function getContext(ledger: StageLedger): Promise<string> {
  const plannerData = ledger.query('System', {
    fromAgent: 'Planner',
    select: ['features', 'functionalRequirements', 'nonFunctionalRequirements', 'recommendedTechStack']
  });
  const architectData = ledger.query('System', {
    fromAgent: 'Architect',
    select: ['modules']
  });
  const queenData = ledger.query('System', {
    fromAgent: 'Queen',
    select: ['constraints']
  });
  return JSON.stringify({ Planner: plannerData, Architect: architectData, Queen: queenData }, null, 2);
}
