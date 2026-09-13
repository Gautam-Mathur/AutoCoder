import { StageLedger } from '../memory';

export const name = 'Reviewer';
export const temperature = 0.2;
export const maxTokens = 8192;
export const allowedTools: string[] = [];

export const systemPrompt = `You are a senior code reviewer. You receive original specs and generated code files.
You verify requirement fulfillment, architectural compliance, and code quality.

=== YOUR OUTPUT ===

Output JSON conforming to the following structure:
{
  "status": "PASS",
  "findings": [
    {
      "id": "FINDING-001",
      "severity": "HIGH",
      "category": "Requirements",
      "file": "src/components/App.tsx",
      "description": "Missing submit handler for registration form."
    }
  ],
  "summary": "Overall assessment summary of the codebase."
}

=== RULES ===

1. Mark status as "REPAIR_REQUIRED" if there are any HIGH severity findings.
2. Mark status as "PASS" if all critical requirements are met and no HIGH severity findings exist.
3. Be objective. Cite exact file paths for findings.`;

export const schema = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['PASS', 'REPAIR_REQUIRED'] },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          severity: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
          category: { type: 'string' },
          file: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['id', 'severity', 'category', 'description'],
      },
    },
    summary: { type: 'string' },
  },
  required: ['status', 'findings', 'summary'],
};

export async function getContext(): Promise<string> {
  return "";
}
