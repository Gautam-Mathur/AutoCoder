import { StageLedger } from '../memory';

export const name = 'Security';
export const temperature = 0.2;
export const maxTokens = 2048;

export const systemPrompt = `You are the Security Auditor Agent in the RuFlo software engineering pipeline.

Your responsibility is to perform the final security assessment of the completed project.

You determine whether the implementation satisfies fundamental software security requirements and identify security vulnerabilities, insecure patterns, and potential attack surfaces.

You do not redesign the system or implement security fixes.

Your assessment becomes the authoritative security review for the project.

## Input

The Security Auditor receives the following project context:

### From Queen

- Constraints

### From Planner

- Security Requirements
- Features

### From Runtime

- Complete project source code
- Final project structure
- Build artifacts
- Configuration files
- Environment configuration (if available)
- Dependency manifests
- Test reports (if available)

In addition, the runtime injects:

- Security engineering knowledge
- Technology-specific security knowledge
- Security auditing rules
- Secure development rules

## Responsibilities

You must:

- Identify security vulnerabilities.
- Verify compliance with declared security requirements.
- Identify insecure coding patterns.
- Evaluate authentication and authorization mechanisms.
- Evaluate data handling practices.
- Evaluate secret management.
- Evaluate configuration security.
- Evaluate dependency security.
- Evaluate API security.
- Evaluate input validation.
- Produce a complete security audit report matching the required schema.

## Boundaries

You must never:

- Modify source code.
- Fix vulnerabilities.
- Redesign the architecture.
- Redesign APIs.
- Change project scope.
- Introduce new security features.
- Rewrite implementations.

Your responsibility is security assessment only.

## Security Assessment Principles

When auditing:

- Focus on observable security risks.
- Base findings on evidence.
- Report realistic attack vectors.
- Prioritize practical exploitability.
- Avoid hypothetical vulnerabilities without supporting evidence.

## Risk Assessment Principles

Every reported finding should include:

- Vulnerability description.
- Security impact.
- Exploitation likelihood.
- Severity.
- Affected components.
- Recommended mitigation.

Recommendations should preserve the existing project architecture whenever possible.

## Output Contract

- Produce only valid JSON.
- Populate every required schema field.
- Every finding must have a stable identifier.
- Every vulnerability must include severity.
- Every recommendation must reference the corresponding finding.
- Produce no explanatory text outside the JSON object.`;

export const schema = {
  type: 'object',
  properties: {
    contextType: { type: 'string', const: 'canonical' },
    projectName: { type: 'string' },
    mvpReference: { type: 'string' },
    securityReport: {
      type: 'object',
      properties: {
        issues: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              severity: { type: 'string', enum: ['Critical', 'High', 'Medium', 'Low', 'Informational'] },
              category: {
                type: 'string',
                enum: [
                  'Authentication', 'Authorization', 'Input Validation', 'Injection', 'XSS', 'CSRF', 'SSRF',
                  'File Upload', 'Security Headers', 'Session Management', 'Configuration', 'Secrets',
                  'Dependency', 'API', 'Cryptography', 'Transport Security', 'Other'
                ]
              },
              file: { type: 'string' },
              location: { type: 'string' },
              description: { type: 'string' },
              risk: { type: 'string' },
              recommendation: { type: 'string' },
              affectedFeature: { type: 'string' },
              owaspTop10: { type: 'string' },
              cweReference: { type: 'string' },
              confidence: { type: 'string', enum: ['High', 'Medium', 'Low'] }
            },
            required: [
              'id', 'severity', 'category', 'file', 'location', 'description', 'risk', 'recommendation',
              'affectedFeature', 'owaspTop10', 'cweReference', 'confidence'
            ]
          }
        },
        summary: {
          type: 'object',
          properties: {
            critical: { type: 'integer' },
            high: { type: 'integer' },
            medium: { type: 'integer' },
            low: { type: 'integer' },
            informational: { type: 'integer' }
          },
          required: ['critical', 'high', 'medium', 'low', 'informational']
        },
        warnings: { type: 'array', items: { type: 'string' } },
        status: { type: 'string', enum: ['Success', 'Partial', 'Failed'] }
      },
      required: ['issues', 'summary', 'warnings', 'status']
    }
  },
  required: ['contextType', 'projectName', 'mvpReference', 'securityReport']
};

export async function getContext(ledger: StageLedger): Promise<string> {
  const queenData = ledger.query('Security', {
    fromAgent: 'Queen',
    select: ['projectGoal', 'constraints']
  });
  const plannerData = ledger.query('Security', {
    fromAgent: 'Planner',
    select: ['features', 'functionalRequirements', 'nonFunctionalRequirements', 'recommendedTechStack']
  });
  const architectData = ledger.query('Security', {
    fromAgent: 'Architect',
    select: ['modules', 'projectStructure', 'projectConventions']
  });
  const systemData = ledger.query('Security', {
    fromAgent: 'System',
    select: ['database', 'apis']
  });
  const designerData = ledger.query('Security', {
    fromAgent: 'Designer',
    select: ['pages', 'components', 'designSystem', 'navigation', 'designPhilosophy']
  });
  const coderData = ledger.read('coder') || {};
  return JSON.stringify({
    Queen: queenData,
    Planner: plannerData,
    Architect: architectData,
    System: systemData,
    Designer: designerData,
    Coder: coderData
  }, null, 2);
}
