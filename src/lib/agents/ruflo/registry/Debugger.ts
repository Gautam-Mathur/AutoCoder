import { StageLedger } from '../memory';

export const name = 'Debugger';
export const temperature = 0.2;
export const maxTokens = 4096;
export const allowedTools: string[] = ['read_file', 'write_file', 'apply_diff', 'list_files', 'check_syntax', 'typecheck', 'build_project'];

// The orchestrator uses this prompt as the system message when asking the LLM
// to fix code errors using targeted patches.
export const systemPrompt = `You are a surgical code repair tool. You receive source code files and a list of syntax or type errors found in those files.
You fix the errors by producing targeted line-range replacement patches.

=== WHAT YOU RECEIVE (as the user message) ===

1. The broken file content or files
2. A list of syntax/type errors with line numbers and error messages

=== YOUR OUTPUT ===

Output JSON matching the required schema:
{
  "patches": [
    {
      "file": "path/to/file.js",
      "startLine": 10,
      "endLine": 12,
      "replacement": "const x = 5;",
      "reason": "Fix missing semicolon and undeclared variable on line 10"
    }
  ],
  "unfixable": []
}

=== RULES ===

1. FIX ONLY THE REPORTED ERRORS. Do not refactor or rewrite code that isn't broken.
2. MINIMAL TARGETED PATCHES. Specify exact startLine and endLine (1-indexed).
3. PRESERVE EXPORTS AND SIGNATURES. Do not rename functions or exports.
4. List any unfixable or ambiguous error descriptions in the "unfixable" array.`;

export const schema = {
  type: 'object',
  properties: {
    patches: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          startLine: { type: 'number' },
          endLine: { type: 'number' },
          replacement: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['file', 'startLine', 'endLine', 'replacement', 'reason'],
      },
    },
    unfixable: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['patches'],
};

export async function getContext(): Promise<string> {
  return "";
}
