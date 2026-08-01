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
    summary: {
      type: 'object',
      properties: {
        overallSecurityStatus: { type: 'string', enum: ['SECURE', 'SECURE_WITH_WARNINGS', 'VULNERABLE', 'CRITICAL'] },
        securityScore: { type: 'number' },
        overallRisk: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] }
      }
    },
    securityRequirements: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          requirement: { type: 'string' },
          status: { type: 'string', enum: ['SATISFIED', 'PARTIAL', 'UNSATISFIED'] },
          notes: { type: 'string' }
        }
      }
    },
    securityChecks: {
      type: 'object',
      properties: {
        authentication: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['PASS', 'FAIL', 'NOT_APPLICABLE'] },
            findings: { type: 'array', items: { type: 'string' } }
          }
        },
        authorization: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['PASS', 'FAIL', 'NOT_APPLICABLE'] },
            findings: { type: 'array', items: { type: 'string' } }
          }
        },
        inputValidation: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['PASS', 'FAIL', 'NOT_APPLICABLE'] },
            findings: { type: 'array', items: { type: 'string' } }
          }
        },
        dataProtection: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['PASS', 'FAIL', 'NOT_APPLICABLE'] },
            findings: { type: 'array', items: { type: 'string' } }
          }
        },
        secretManagement: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['PASS', 'FAIL', 'NOT_APPLICABLE'] },
            findings: { type: 'array', items: { type: 'string' } }
          }
        },
        configuration: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['PASS', 'FAIL', 'NOT_APPLICABLE'] },
            findings: { type: 'array', items: { type: 'string' } }
          }
        },
        dependencySecurity: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['PASS', 'FAIL', 'NOT_APPLICABLE'] },
            findings: { type: 'array', items: { type: 'string' } }
          }
        },
        apiSecurity: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['PASS', 'FAIL', 'NOT_APPLICABLE'] },
            findings: { type: 'array', items: { type: 'string' } }
          }
        }
      }
    },
    vulnerabilities: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          severity: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'] },
          category: { type: 'string', enum: ['AUTHENTICATION', 'AUTHORIZATION', 'INPUT_VALIDATION', 'DATA_EXPOSURE', 'CONFIGURATION', 'DEPENDENCY', 'API', 'SECRET_MANAGEMENT', 'OTHER'] },
          affectedFiles: { type: 'array', items: { type: 'string' } },
          attackSurface: { type: 'string' },
          businessImpact: { type: 'string' },
          evidence: { type: 'string' },
          recommendation: { type: 'string' }
        }
      }
    },
    securityStrengths: { type: 'array', items: { type: 'string' } },
    recommendations: { type: 'array', items: { type: 'string' } },
    metadata: {
      type: 'object',
      properties: {
        version: { type: 'string' },
        generatedAt: { type: 'string' },
        status: { type: 'string', enum: ['COMPLETE', 'PARTIAL', 'ERROR'] }
      }
    }
  },
  required: ['summary', 'vulnerabilities']
};

export async function getContext(ledger: StageLedger): Promise<string> {
  const queenData = ledger.query('Security', {
    fromAgent: 'Queen',
    select: ['constraints']
  });
  const plannerData = ledger.query('Security', {
    fromAgent: 'Planner',
    select: ['nonFunctionalRequirements.security', 'features']
  });
  const systemData = ledger.query('Security', {
    fromAgent: 'System',
    select: ['apis', 'configuration']
  });
  const coderData = ledger.read('coder') || {};
  return JSON.stringify({
    Queen: queenData,
    Planner: plannerData,
    System: systemData,
    Coder: coderData
  }, null, 2);
}
