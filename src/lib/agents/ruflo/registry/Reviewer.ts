import { StageLedger } from '../memory';

export const name = 'Reviewer';
export const temperature = 0.2;
export const maxTokens = 1536;

export const systemPrompt = `You are the Reviewer Agent in the RuFlo software engineering pipeline.

Your responsibility is to perform the final engineering review of the completed project before release.

You determine whether the project is acceptable for delivery, not how it should be implemented or corrected.

Your objective is to verify that the generated software is internally consistent, complete, maintainable, and aligned with the approved project specification.

The review you produce becomes the final engineering assessment of the project.

## Input

The Reviewer receives the following project context:

### From Queen

- Project Goal

### From Planner

- Features
- Functional Requirements

### From Runtime

- Complete project source code
- Final project structure
- Build results
- Test results
- Debugging report
- Generated documentation (if available)

In addition, the runtime injects:

- Software engineering knowledge
- Language-specific engineering knowledge
- Framework knowledge
- Engineering review rules
- Quality standards

## Responsibilities

You must:

- Verify project completeness.
- Verify implementation consistency.
- Verify maintainability.
- Verify architectural consistency.
- Verify coding quality.
- Verify requirement coverage.
- Verify feature completeness.
- Verify project readiness for release.
- Produce a complete review report matching the required schema.

## Boundaries

You must never:

- Modify source code.
- Fix defects.
- Suggest new features.
- Change project scope.
- Redesign architecture.
- Rewrite implementations.

Those responsibilities belong to earlier stages.

Your responsibility is engineering evaluation only.

## Review Principles

When reviewing:

- Evaluate the completed project as a whole.
- Assess engineering quality.
- Assess implementation consistency.
- Assess maintainability.
- Assess long-term project health.

Focus on engineering quality rather than implementation style preferences.

## Assessment Principles

Every assessment should be:

- Objective.
- Evidence-based.
- Reproducible.
- Traceable to the project.

Avoid subjective preferences.

## Output Contract

- Produce only valid JSON.
- Populate every required schema field.
- Every finding must have a stable identifier.
- Every recommendation must reference supporting evidence.
- Produce no explanatory text outside the JSON object.`;

export const schema = {
  type: 'object',
  properties: {
    summary: {
      type: 'object',
      properties: {
        overallAssessment: { type: 'string', enum: ['APPROVED', 'APPROVED_WITH_RECOMMENDATIONS', 'REQUIRES_REWORK', 'REJECTED'] },
        engineeringQuality: { type: 'string', enum: ['EXCELLENT', 'GOOD', 'FAIR', 'POOR'] },
        releaseReadiness: { type: 'string', enum: ['READY', 'READY_WITH_MINOR_IMPROVEMENTS', 'NOT_READY'] }
      }
    },
    requirementCoverage: {
      type: 'object',
      properties: {
        features: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              featureId: { type: 'string' },
              status: { type: 'string', enum: ['COMPLETE', 'PARTIAL', 'MISSING'] },
              notes: { type: 'string' }
            }
          }
        },
        functionalRequirements: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              requirementId: { type: 'string' },
              status: { type: 'string', enum: ['SATISFIED', 'PARTIAL', 'UNSATISFIED'] }
            }
          }
        }
      }
    },
    architectureReview: {
      type: 'object',
      properties: {
        structureConsistency: { type: 'string', enum: ['PASS', 'FAIL'] },
        moduleOrganization: { type: 'string', enum: ['PASS', 'FAIL'] },
        dependencyQuality: { type: 'string', enum: ['PASS', 'FAIL'] },
        projectOrganization: { type: 'string', enum: ['PASS', 'FAIL'] },
        notes: { type: 'array', items: { type: 'string' } }
      }
    },
    codeQuality: {
      type: 'object',
      properties: {
        readability: { type: 'string', enum: ['EXCELLENT', 'GOOD', 'FAIR', 'POOR'] },
        maintainability: { type: 'string', enum: ['EXCELLENT', 'GOOD', 'FAIR', 'POOR'] },
        modularity: { type: 'string', enum: ['EXCELLENT', 'GOOD', 'FAIR', 'POOR'] },
        consistency: { type: 'string', enum: ['EXCELLENT', 'GOOD', 'FAIR', 'POOR'] },
        notes: { type: 'array', items: { type: 'string' } }
      }
    },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          severity: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
          category: { type: 'string', enum: ['ARCHITECTURE', 'CODE_QUALITY', 'MAINTAINABILITY', 'CONSISTENCY', 'DOCUMENTATION', 'BEST_PRACTICE'] },
          title: { type: 'string' },
          description: { type: 'string' },
          affectedFiles: { type: 'array', items: { type: 'string' } },
          recommendation: { type: 'string' }
        }
      }
    },
    strengths: { type: 'array', items: { type: 'string' } },
    recommendations: { type: 'array', items: { type: 'string' } },
    metadata: {
      type: 'object',
      properties: {
        version: { type: 'string' },
        generatedAt: { type: 'string' },
        status: { type: 'string' }
      }
    },
    qualityScore: { type: 'number' },
    annotations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          note: { type: 'string' },
          agent: { type: 'string' },
          severity: { type: 'string' }
        }
      }
    }
  }
};

export async function getContext(ledger: StageLedger): Promise<string> {
  const queenData = ledger.query('Reviewer', { fromAgent: 'Queen', select: ['projectGoal'] });
  const plannerData = ledger.query('Reviewer', { fromAgent: 'Planner', select: ['features', 'functionalRequirements'] });
  const coderData = ledger.read('coder') || {};
  return JSON.stringify({ Queen: queenData, Planner: plannerData, Coder: coderData }, null, 2);
}
