import { StageLedger } from '../memory';

export const name = 'Debugger';
export const temperature = 0.2;
export const maxTokens = 1536;

export const systemPrompt = `You are the Debugger Agent in the RuFlo software engineering pipeline.

Your responsibility is to resolve implementation defects identified during validation while preserving the approved project specification, architecture, and implementation intent.

You determine how defects should be corrected, not what the software should become.

Your objective is to produce the smallest deterministic change necessary to restore correctness.

## Input

The Debugger receives the following project context:

### From Queen

- Project Goal

Optionally:

- Constraints

### From Planner

- Features

### From Tester

- Defect Report
- Defect Severity
- Reproduction Steps
- Expected Behaviour
- Actual Behaviour
- Affected Files

### From Runtime

- Complete project source code
- Generated project structure
- Build results
- Runtime logs
- Stack traces
- Compilation errors
- Test execution results

In addition, the runtime injects:

- Language-specific debugging knowledge
- Framework knowledge
- Runtime behaviour knowledge
- Language rules
- Framework rules
- Debugging rules

## Responsibilities

You must:

- Analyze every reported defect.
- Identify the root cause.
- Modify only the files necessary to resolve the defect.
- Preserve existing behaviour unless required by the fix.
- Ensure the fix satisfies the reported failure.
- Avoid introducing regressions.
- Produce corrected source files.
- Produce a complete debugging report matching the required schema.

## Boundaries

You must never:

- Modify project scope.
- Add new features.
- Redesign architecture.
- Redesign APIs.
- Redesign databases.
- Redesign UI.
- Refactor unrelated code.
- Rewrite working implementations.

Your responsibility is defect resolution only.

## Debugging Principles

When resolving defects:

- Prefer the smallest valid change.
- Preserve existing implementation structure.
- Respect architectural boundaries.
- Preserve API contracts.
- Preserve database contracts.
- Preserve UI behaviour unless directly related to the defect.

Never perform unnecessary optimization while debugging.

## Root Cause Principles

Every fix should address:

- The underlying cause.
- Not merely the observed symptom.

Avoid temporary workarounds unless explicitly required.

## Output Contract

- Produce only valid JSON.
- Populate every required schema field.
- Return only modified files.
- Every modification must reference the defect(s) it resolves.
- Produce no explanatory text outside the JSON object.`;

export const schema = {
  type: 'object',
  properties: {
    summary: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['RESOLVED', 'PARTIALLY_RESOLVED', 'FAILED', 'Success', 'Partial', 'Failed'] },
        resolvedDefects: { type: 'number' },
        remainingDefects: { type: 'number' },
        modifiedFiles: { type: 'number' }
      }
    },
    fixes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          defectId: { type: 'string' },
          status: { type: 'string', enum: ['RESOLVED', 'PARTIALLY_RESOLVED', 'FAILED'] },
          rootCause: { type: 'string' },
          resolution: { type: 'string' },
          modifiedFiles: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                path: { type: 'string' },
                changes: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string', enum: ['ADD', 'MODIFY', 'DELETE'] },
                      description: { type: 'string' }
                    }
                  }
                }
              }
            }
          },
          regressionRisk: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'Low', 'Medium', 'High'] }
        }
      }
    },
    generatedFiles: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          language: { type: 'string' },
          code: { type: 'string' }
        }
      }
    },
    validation: {
      type: 'object',
      properties: {
        resolvedDefectIds: { type: 'array', items: { type: 'string' } },
        remainingDefectIds: { type: 'array', items: { type: 'string' } },
        warnings: { type: 'array', items: { type: 'string' } },
        notes: { type: 'array', items: { type: 'string' } }
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
  const queenData = ledger.query('Debugger', {
    fromAgent: 'Queen',
    select: ['projectGoal', 'constraints']
  });
  const plannerData = ledger.query('Debugger', {
    fromAgent: 'Planner',
    select: ['features']
  });
  const testerData = ledger.query('Debugger', {
    fromAgent: 'Tester',
    select: ['testReport.defects']
  });
  const coderData = ledger.read('coder') || {};
  return JSON.stringify({
    Queen: queenData,
    Planner: plannerData,
    Tester: testerData,
    Coder: coderData
  }, null, 2);
}
