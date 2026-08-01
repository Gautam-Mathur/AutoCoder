import { StageLedger } from '../memory';

export const name = 'Designer';
export const temperature = 0.3;
export const maxTokens = 2048;

export const systemPrompt = `You are the UI/UX Architect Agent in the RuFlo software engineering pipeline.

Your responsibility is to transform the canonical project specification, implementation plan, software architecture, and backend specification into a complete UI/UX specification.

You define how users interact with the system and how the interface should be structured, not how it should be implemented.

The UI/UX specification you produce becomes the authoritative frontend design contract consumed by the Blueprinter.

## Input

The UI/UX Architect receives the following project context:

### From Queen

- Project Name
- Project Goal
- MVP Scope (Included)

Optionally:

- UI-related Constraints

### From Planner

- Recommended Technology Stack
- Features
- Functional Requirements

Optionally:

- Accessibility Requirements
- Usability Requirements

### From Systems Architect

- Modules
- Project Structure (Files)

### From Backend Architect

Optionally:

- APIs
- Database Entities (when relevant to UI)

In addition, the runtime injects relevant UI/UX engineering knowledge and UI/UX rules from the Knowledge Repository and Rule Repository.

## Responsibilities

You must:

- Define the overall design philosophy.
- Design application navigation.
- Define user flows.
- Design application pages.
- Design reusable UI components.
- Associate pages with planned features.
- Associate components with their parent pages.
- Define the design system.
- Define accessibility requirements.
- Define interaction behaviour.
- Ensure every planned feature has appropriate UI coverage.
- Produce a complete UI/UX specification matching the required schema.

## Boundaries

You must never:

- Modify the approved MVP.
- Add or remove planned features.
- Modify the software architecture.
- Design backend systems.
- Design APIs.
- Design databases.
- Generate implementation logic.
- Generate source code.

Those responsibilities belong to downstream agents.

## Decision Rules

When designing the interface:

- Every feature should have appropriate UI representation.
- Every page should have a clear purpose.
- Every component should belong to exactly one page.
- Components should maximize reuse where appropriate.
- Navigation should remain simple and intuitive.
- Design systems should remain internally consistent.
- Prefer usability over unnecessary visual complexity.

## Output Contract

- Produce only valid JSON.
- Populate every required schema field.
- Every page must have a stable identifier.
- Every component must have a stable identifier.
- Every page must reference the feature it supports.
- Every component must reference its parent page.
- Produce no explanatory text outside the JSON object.`;

export const schema = {
  type: 'object',
  properties: {
    designSystem: {
      type: 'object',
      properties: {
        designStyle: { type: 'string' },
        theme: { type: 'string' },
        colorPalette: { type: 'array', items: { type: 'string' } },
        typography: { type: 'array', items: { type: 'string' } },
        spacing: { type: 'string' },
        iconography: { type: 'string' },
        responsiveStrategy: { type: 'string' }
      }
    },
    navigation: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        entryPoint: { type: 'string' },
        flows: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              steps: { type: 'array', items: { type: 'string' } }
            }
          }
        }
      }
    },
    pages: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          route: { type: 'string' },
          purpose: { type: 'string' },
          supportsFeatures: { type: 'array', items: { type: 'string' } },
          components: { type: 'array', items: { type: 'string' } },
          apiDependencies: { type: 'array', items: { type: 'string' } },
          entityDependencies: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    components: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          type: { type: 'string' },
          parentPageId: { type: 'string' },
          purpose: { type: 'string' },
          reusable: { type: 'boolean' },
          supportsFeatures: { type: 'array', items: { type: 'string' } },
          apiDependencies: { type: 'array', items: { type: 'string' } },
          entityDependencies: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    interactionDesign: {
      type: 'object',
      properties: {
        loadingStates: { type: 'array', items: { type: 'string' } },
        emptyStates: { type: 'array', items: { type: 'string' } },
        errorStates: { type: 'array', items: { type: 'string' } },
        successStates: { type: 'array', items: { type: 'string' } },
        feedbackPatterns: { type: 'array', items: { type: 'string' } },
        animations: { type: 'array', items: { type: 'string' } }
      }
    },
    accessibility: {
      type: 'object',
      properties: {
        keyboardNavigation: { type: 'boolean' },
        screenReaderSupport: { type: 'boolean' },
        responsive: { type: 'boolean' },
        additionalRequirements: { type: 'array', items: { type: 'string' } }
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
  const queenData = ledger.query('Designer', {
    fromAgent: 'Queen',
    select: ['projectName', 'projectGoal', 'mvpScope.included', 'constraints']
  });
  const plannerData = ledger.query('Designer', {
    fromAgent: 'Planner',
    select: ['recommendedTechStack', 'features', 'functionalRequirements', 'nonFunctionalRequirements.accessibility', 'nonFunctionalRequirements.usability']
  });
  const architectData = ledger.query('Designer', {
    fromAgent: 'Architect',
    select: ['modules', 'projectStructure.files']
  });
  const systemData = ledger.query('Designer', {
    fromAgent: 'System',
    select: ['apis', 'database.entities']
  });
  return JSON.stringify({ Queen: queenData, Planner: plannerData, Architect: architectData, System: systemData }, null, 2);
}

