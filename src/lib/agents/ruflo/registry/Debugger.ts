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
    contextType: { type: 'string', const: 'canonical' },
    projectName: { type: 'string' },
    mvpReference: { type: 'string' },
    debugReport: {
      type: 'object',
      properties: {
        issues: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              testerDefectId: { type: 'string' },
              severity: { type: 'string', enum: ['Critical', 'High', 'Medium', 'Low'] },
              category: { type: 'string', enum: ['Compilation', 'Runtime', 'Functional', 'Integration', 'API', 'UI', 'Security', 'Performance'] },
              file: { type: 'string' },
              module: { type: 'string' },
              class: { type: 'string' },
              function: { type: 'string' },
              location: { type: 'string' },
              rootCause: { type: 'string' },
              stackTrace: { type: 'string' },
              impact: { type: 'string' },
              recommendedFix: { type: 'string' },
              implementationInstructions: { type: 'array', items: { type: 'string' } },
              regressionRisk: { type: 'string', enum: ['Low', 'Medium', 'High'] }
            },
            required: [
              'id', 'testerDefectId', 'severity', 'category', 'file', 'module', 'class', 'function',
              'location', 'rootCause', 'stackTrace', 'impact', 'recommendedFix', 'implementationInstructions', 'regressionRisk'
            ]
          }
        },
        summary: {
          type: 'object',
          properties: {
            issuesDetected: { type: 'integer' },
            issuesResolved: { type: 'integer' },
            remainingIssues: { type: 'integer' }
          },
          required: ['issuesDetected', 'issuesResolved', 'remainingIssues']
        },
        warnings: { type: 'array', items: { type: 'string' } },
        status: { type: 'string', enum: ['Success', 'Partial', 'Failed'] }
      },
      required: ['issues', 'summary', 'warnings', 'status']
    }
  },
  required: ['contextType', 'projectName', 'mvpReference', 'debugReport']
};

export async function getContext(ledger: StageLedger): Promise<string> {
  const queenData = ledger.query('Debugger', {
    fromAgent: 'Queen',
    select: ['projectGoal', 'constraints']
  });
  const plannerData = ledger.query('Debugger', {
    fromAgent: 'Planner',
    select: ['features', 'functionalRequirements', 'nonFunctionalRequirements', 'recommendedTechStack']
  });
  const architectData = ledger.query('Debugger', {
    fromAgent: 'Architect',
    select: ['modules', 'projectStructure', 'projectConventions']
  });
  const systemData = ledger.query('Debugger', {
    fromAgent: 'System',
    select: ['database', 'apis']
  });
  const designerData = ledger.query('Debugger', {
    fromAgent: 'Designer',
    select: ['pages', 'components', 'designSystem', 'navigation', 'designPhilosophy']
  });
  const testerData = ledger.query('Debugger', {
    fromAgent: 'Tester',
    select: ['testReport']
  });
  const coderData = ledger.read('coder') || {};
  return JSON.stringify({
    Queen: queenData,
    Planner: plannerData,
    Architect: architectData,
    System: systemData,
    Designer: designerData,
    Tester: testerData,
    Coder: coderData
  }, null, 2);
}
