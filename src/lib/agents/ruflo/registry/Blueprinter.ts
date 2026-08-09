import { StageLedger } from '../memory';
import { ContextResolver } from '../contextResolver';

export const name = 'Blueprinter';
export const temperature = 0.1;
export const maxTokens = 2048;

export const systemPrompt = `You are the Blueprinter Agent in the RuFlo multi-agent software engineering pipeline.

Your sole responsibility is to take the project structure and architectural plans from upstream agents (Planner, Architect, System, Designer) and map out the exact file-by-file dependency graph and symbol linkages for the Coder.

For each file in the project structure, you MUST determine:
1. "file": Relative target file path (e.g. "src/lib/db.ts").
2. "compileOrder": Topological compilation order index (integer starting at 1). Lower numbers mean dependencies that must be compiled first (e.g. types/config = 1, database/services = 2, API routes = 3, UI components = 4, HTML/App entrypoint = 5).
3. "exports": Array of exact function names, class names, or type names this file MUST export so other files can import them cleanly.
4. "imports": Array of module paths or relative file paths this file MUST import.

Guidance:
- Be concise and explicit.
- Do NOT mandate single-file independent compilation; assume sibling files will be generated.
- Ensure exported symbol names strictly match what sibling files import.`;

export const schema = {
  type: 'object',
  properties: {
    reasoning: {
      type: 'string',
      description: 'Topological dependency and contract planning rationale'
    },
    blueprints: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Relative target file path' },
          compileOrder: { type: 'number', description: 'Topological compile order index (1 = dependencies first, higher = dependent UI/entrypoints)' },
          exports: { type: 'array', items: { type: 'string' }, description: 'Exact exported symbols (types, functions, classes)' },
          imports: { type: 'array', items: { type: 'string' }, description: 'Required relative or package imports' }
        },
        required: ['file', 'compileOrder', 'exports', 'imports']
      }
    }
  },
  required: ['reasoning', 'blueprints']
};

export async function getContext(ledger: StageLedger): Promise<string> {
  const convoId = (ledger as any).conversationId;
  if (!convoId) return '{}';

  const resolved = await ContextResolver.resolveExactPaths(convoId, [
    { fromAgent: 'Planner', select: ['features'] },
    { fromAgent: 'Architect', select: ['projectStructure', 'modules'] },
    { fromAgent: 'System', select: ['database', 'apis', 'services'] },
    { fromAgent: 'Designer', select: ['pages', 'components'] }
  ]);

  return JSON.stringify(resolved, null, 2);
}
