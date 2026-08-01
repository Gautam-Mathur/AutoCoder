import { StageLedger } from '../memory';

export const name = 'Tester';
export const temperature = 0.2;
export const maxTokens = 2048;

export const systemPrompt = `You are the Tester Agent in the RuFlo software engineering pipeline.

Your responsibility is to verify that the generated software satisfies the approved project specification and implementation plan.

You identify what is incorrect, what is missing, and what violates the specification.

You do not fix defects.

The defects you report become the authoritative input for the Debugger Agent.

## Input

The Tester receives the following project context:

### From Queen

- Project Goal
- Constraints

### From Planner

- Features
- Functional Requirements

Optionally:

- Non-Functional Requirements

### From Runtime

- Complete generated project source code
- Generated project structure
- Build artifacts (if available)
- Runtime logs (if available)
- Compilation results (if available)

In addition, the runtime injects:

- Language-specific testing knowledge
- Framework testing knowledge
- Testing methodologies
- Validation rules
- Quality rules

## Responsibilities

You must:

- Verify feature completeness.
- Verify functional correctness.
- Verify project consistency.
- Verify implementation against requirements.
- Verify implementation against project constraints.
- Generate appropriate test files.
- Identify defects.
- Classify defect severity.
- Describe defect reproduction.
- Produce a complete testing report matching the required schema.

## Boundaries

You must never:

- Modify source code.
- Fix defects.
- Suggest architectural changes.
- Change APIs.
- Change databases.
- Change UI.
- Rewrite implementation.

Those responsibilities belong to the Debugger Agent.

## Validation Principles

When testing:

- Validate observable behaviour.
- Validate project requirements.
- Validate feature completeness.
- Validate integration between components.
- Prefer deterministic validation.
- Report only reproducible defects.

Do not speculate about hypothetical issues.

## Defect Principles

Every reported defect must include:

- Clear description.
- Expected behaviour.
- Actual behaviour.
- Reproduction steps.
- Severity.
- Category.
- Affected file.

Only report genuine implementation defects.

## Output Contract

- Produce only valid JSON.
- Populate every required schema field.
- Every generated test file must have a stable identifier.
- Every reported defect must have a stable identifier.
- Every defect must be reproducible.
- Produce no explanatory text outside the JSON object.`;

export const schema = {
  type: 'object',
  properties: {
    summary: {
      type: 'object',
      properties: {
        overallStatus: { type: 'string', enum: ['PASSED', 'PASSED_WITH_WARNINGS', 'FAILED'] },
        totalTests: { type: 'number' },
        passedTests: { type: 'number' },
        failedTests: { type: 'number' },
        skippedTests: { type: 'number' }
      }
    },
    coverage: {
      type: 'object',
      properties: {
        features: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              featureId: { type: 'string' },
              status: { type: 'string', enum: ['PASSED', 'FAILED', 'PARTIAL'] },
              testedRequirements: { type: 'array', items: { type: 'string' } }
            }
          }
        },
        functionalRequirements: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              requirementId: { type: 'string' },
              status: { type: 'string', enum: ['PASSED', 'FAILED', 'PARTIAL'] }
            }
          }
        },
        nonFunctionalRequirements: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              category: { type: 'string' },
              status: { type: 'string', enum: ['PASSED', 'FAILED', 'NOT_APPLICABLE'] },
              notes: { type: 'string' }
            }
          }
        }
      }
    },
    testCases: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          type: { type: 'string', enum: ['UNIT', 'INTEGRATION', 'SYSTEM', 'E2E'] },
          relatedFeatureId: { type: 'string' },
          relatedRequirementIds: { type: 'array', items: { type: 'string' } },
          expectedResult: { type: 'string' },
          actualResult: { type: 'string' },
          status: { type: 'string', enum: ['PASSED', 'FAILED', 'SKIPPED'] },
          affectedFiles: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    defects: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          severity: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
          category: { type: 'string', enum: ['FUNCTIONAL', 'UI', 'API', 'DATABASE', 'SECURITY', 'PERFORMANCE', 'VALIDATION', 'INTEGRATION'] },
          relatedFeatureId: { type: 'string' },
          relatedRequirementIds: { type: 'array', items: { type: 'string' } },
          affectedFiles: { type: 'array', items: { type: 'string' } },
          expectedBehavior: { type: 'string' },
          actualBehavior: { type: 'string' },
          reproductionSteps: { type: 'array', items: { type: 'string' } },
          rootCauseHypothesis: { type: 'string' }
        }
      }
    },
    generatedTests: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          purpose: { type: 'string' }
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
  required: ['summary', 'defects']
};

export async function getContext(ledger: StageLedger): Promise<string> {
  const queenData = ledger.query('Tester', {
    fromAgent: 'Queen',
    select: ['projectGoal', 'constraints']
  });
  const plannerData = ledger.query('Tester', {
    fromAgent: 'Planner',
    select: ['features', 'functionalRequirements', 'nonFunctionalRequirements']
  });
  const coderData = ledger.read('coder') || {};
  return JSON.stringify({
    Queen: queenData,
    Planner: plannerData,
    Coder: coderData
  }, null, 2);
}
