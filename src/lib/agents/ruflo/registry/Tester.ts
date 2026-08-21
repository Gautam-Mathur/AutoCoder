import { StageLedger } from '../memory';

export const name = 'Tester';
export const temperature = 0.0;
export const maxTokens = 512;
export const allowedTools: string[] = [];

// Tester is fully deterministic — the orchestrator runs runLinter() directly.
// This prompt is never sent to the LLM. It exists only for type compatibility.
export const systemPrompt = `Tester stage. This prompt is unused. The orchestrator runs the deterministic linter directly.`;

export const schema = {
  type: 'object',
  properties: { passed: { type: 'number' }, failed: { type: 'number' }, total: { type: 'number' } },
  required: ['passed', 'failed', 'total']
};

export async function getContext(): Promise<string> {
  return "";
}
