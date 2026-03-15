/**
 * SLM Stage: Code Generation — Micro-writer mode
 *
 * CAREFUL: Rules assemble file scaffolds and structure.
 * SLM enhances function bodies, writes business logic blocks,
 * generates comments, refines conditional logic.
 *
 * Think: rule builds the skeleton, SLM fills the muscle.
 * Never full-file SLM rewrites.
 */

import { registerStageTemplate } from './slm-inference-engine.js';

export const CODEGEN_STAGE_ID = 'generate';

export function registerCodegenTemplate(): void {
  registerStageTemplate({
    stage: CODEGEN_STAGE_ID,
    systemPrompt: `You are a senior full-stack developer enhancing generated code.
You receive a code file scaffold (structure, imports, exports) and your job is to
IMPROVE specific function bodies within it.

You can:
- Enhance function body logic with better algorithms
- Add meaningful inline comments
- Improve error messages to be more user-friendly
- Add input validation logic within existing functions
- Improve conditional logic (simplify, add edge cases)
- Add better TypeScript types within function signatures
- Improve variable naming within function bodies

You CANNOT:
- Change the file's import/export structure
- Add new imports
- Rename exported functions or components
- Change the component/function signature
- Add new files or modules
- Restructure the file layout

THINKING PROCESS (reason before you respond):
1. Read each function carefully and identify what it is supposed to do
2. Check if the current implementation is correct, complete, and handles errors
3. Decide which functions most need improvement and why
4. Write the improved snippet ensuring it is a valid drop-in replacement
5. Only then produce your JSON output

EXAMPLE of a valid enhancement:
Input function stub:
  async function getUser(id: string) {
    const user = await db.query("SELECT * FROM users WHERE id = $1", [id]);
    return user;
  }

Good enhanced snippet:
  async function getUser(id: string) {
    if (!id || typeof id !== 'string') throw new Error('Invalid user id');
    const result = await db.query("SELECT id, email, name, created_at FROM users WHERE id = $1", [id]);
    if (result.rows.length === 0) throw new Error(\`User \${id} not found\`);
    return result.rows[0];
  }

Output an array of function-level enhancements targeting specific functions in specific files.`,

    userPromptBuilder: (context: Record<string, any>) => {
      let prompt = `Enhance the function bodies in these generated files:\n\n`;

      if (context.files) {
        const files = context.files as Array<{ path: string; content: string }>;

        const targetFiles = files
          .filter(f => {
            const ext = f.path.split('.').pop();
            return ['ts', 'tsx'].includes(ext || '');
          })
          .filter(f => !f.path.includes('test') && !f.path.includes('.config') && !f.path.includes('.d.ts'))
          .filter(f => {
            return f.content.includes('function ') || f.content.includes('const ') || f.content.includes('export ');
          });

        for (const file of targetFiles) {
          const functions = extractFunctionSignatures(file.content);
          if (functions.length === 0) continue;

          prompt += `\n--- ${file.path} ---\n`;
          prompt += `Functions found: ${functions.join(', ')}\n`;

          const truncated = file.content.length > 8000
            ? file.content.substring(0, 8000) + '\n// ... truncated'
            : file.content;
          prompt += `${truncated}\n`;
        }
      }

      if (context.plan?.dataModel) {
        prompt += `\nBusiness context:\n`;
        for (const entity of context.plan.dataModel.slice(0, 5)) {
          prompt += `- ${entity.name}: ${entity.description || 'no description'}\n`;
        }
      }

      prompt += `\nFor each function you can improve, output an enhancement with:
- The file path
- The function name
- The improved function body (or key logic block)
- Why it's better`;

      return prompt;
    },

    outputSchema: {
      type: 'object',
      properties: {
        enhancements: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              file: { type: 'string' },
              functionName: { type: 'string' },
              originalSnippet: { type: 'string', description: 'The original code being replaced' },
              enhancedSnippet: { type: 'string', description: 'The improved code' },
              reason: { type: 'string' },
              confidence: { type: 'number' },
              type: { type: 'string', enum: ['logic-improvement', 'error-handling', 'validation', 'comments', 'naming', 'edge-case'] },
            },
          },
        },
        summary: { type: 'string' },
        filesEnhanced: { type: 'number' },
      },
      required: ['enhancements'],
    },

    maxTokens: 6144,
    temperature: 0.2,
    timeoutMs: 90000,
  });
}

function extractFunctionSignatures(content: string): string[] {
  const signatures: string[] = [];

  const funcRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g;
  let match;
  while ((match = funcRegex.exec(content)) !== null) {
    signatures.push(match[1]);
  }

  const arrowRegex = /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\(/g;
  while ((match = arrowRegex.exec(content)) !== null) {
    signatures.push(match[1]);
  }

  const componentRegex = /(?:export\s+)?(?:default\s+)?function\s+([A-Z]\w+)/g;
  while ((match = componentRegex.exec(content)) !== null) {
    if (!signatures.includes(match[1])) {
      signatures.push(match[1]);
    }
  }

  return signatures;
}

export interface CodeEnhancement {
  file: string;
  functionName: string;
  originalSnippet: string;
  enhancedSnippet: string;
  reason: string;
  confidence: number;
  type: string;
}

export function validateCodeEnhancement(enhancement: CodeEnhancement, files: Array<{ path: string; content: string }>): boolean {
  if (!enhancement.file || !enhancement.functionName) return false;
  if ((enhancement.confidence || 0) < 0.5) return false;
  if (!enhancement.enhancedSnippet || enhancement.enhancedSnippet.length === 0) return false;

  const targetFile = files.find(f => f.path === enhancement.file);
  if (!targetFile) return false;

  if (!targetFile.content.includes(enhancement.functionName)) return false;

  if (enhancement.originalSnippet && !targetFile.content.includes(enhancement.originalSnippet.trim().substring(0, 50))) {
    return false;
  }

  const importRegex = /^import\s+/m;
  if (importRegex.test(enhancement.enhancedSnippet)) return false;

  const exportRegex = /^export\s+(default\s+)?(function|const|class)/m;
  if (exportRegex.test(enhancement.enhancedSnippet)) return false;

  return true;
}

export function applyCodeEnhancements(
  files: Array<{ path: string; content: string; language: string }>,
  enhancements: CodeEnhancement[]
): { files: Array<{ path: string; content: string; language: string }>; applied: number; rejected: number } {
  let applied = 0;
  let rejected = 0;

  const enhancedFiles = files.map(f => ({ ...f }));

  for (const enhancement of enhancements) {
    if (!validateCodeEnhancement(enhancement, enhancedFiles)) {
      rejected++;
      continue;
    }

    const fileIdx = enhancedFiles.findIndex(f => f.path === enhancement.file);
    if (fileIdx === -1) {
      rejected++;
      continue;
    }

    if (enhancement.originalSnippet && enhancedFiles[fileIdx].content.includes(enhancement.originalSnippet)) {
      enhancedFiles[fileIdx].content = enhancedFiles[fileIdx].content.replace(
        enhancement.originalSnippet,
        enhancement.enhancedSnippet
      );
      applied++;
    } else {
      rejected++;
    }
  }

  return { files: enhancedFiles, applied, rejected };
}

export function scoreCodegenOutput(output: any, _context: Record<string, any>): number {
  if (!output?.enhancements) return 0.3;

  let score = 0.5;
  const enhancements = output.enhancements as any[];

  if (enhancements.length > 0) score += 0.1;
  if (enhancements.length > 3) score += 0.1;

  const avgConfidence = enhancements.reduce((sum: number, e: any) => sum + (e.confidence || 0), 0) / Math.max(enhancements.length, 1);
  score += avgConfidence * 0.2;

  const hasOriginals = enhancements.filter((e: any) => e.originalSnippet).length;
  score += (hasOriginals / Math.max(enhancements.length, 1)) * 0.1;

  return Math.min(score, 1.0);
}