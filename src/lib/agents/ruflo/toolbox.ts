import { readVirtualFile, writeVirtualFile, listVirtualFiles, applyDiff } from './vfs';
import { runLinter } from './linter';

export interface ToolParameter {
  type: 'string' | 'number' | 'integer' | 'boolean';
  description: string;
  required: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, ToolParameter>;
  execute: (args: Record<string, any>, conversationId: string) => Promise<any>;
}

export const TOOL_REGISTRY: ToolDefinition[] = [
  {
    name: 'read_file',
    description:
      'Reads the complete content of a file from the project workspace. ' +
      'Use this before modifying a file to understand its current state. ' +
      'Returns null if the file does not exist yet.',
    parameters: {
      file_path: {
        type: 'string',
        description: 'The relative path of the file to read, e.g. "src/components/Button.tsx".',
        required: true,
      },
    },
    execute: async (args, conversationId) => {
      const content = await readVirtualFile(conversationId, args.file_path);
      if (content === null) {
        return { 
          found: false, 
          content: null, 
          message: `File "${args.file_path}" does not exist yet. Suggestion: Use list_files to see exact paths of all existing files.` 
        };
      }
      return { found: true, content, lineCount: content.split('\n').length };
    },
  },

  {
    name: 'write_file',
    description:
      'Creates or completely overwrites a file in the project workspace with the provided content. ' +
      'Use this to create new files or to make large changes to existing files. ' +
      'For small targeted fixes to existing files, prefer apply_diff instead.',
    parameters: {
      file_path: {
        type: 'string',
        description: 'The relative path where the file should be written, e.g. "src/utils/helpers.ts".',
        required: true,
      },
      content: {
        type: 'string',
        description: 'The complete source code content to write to the file.',
        required: true,
      },
    },
    execute: async (args, conversationId) => {
      await writeVirtualFile(conversationId, args.file_path, args.content);
      return { success: true, message: `File "${args.file_path}" written successfully (${args.content.length} bytes).` };
    },
  },

  {
    name: 'apply_diff',
    description:
      'Replaces specific lines in an existing file with new content. ' +
      'Use this for small, targeted fixes — for example, fixing a bug on line 42. ' +
      'Much more efficient than rewriting the entire file. ' +
      'Line numbers are 1-indexed (first line of file = line 1).',
    parameters: {
      file_path: {
        type: 'string',
        description: 'The relative path of the file to modify.',
        required: true,
      },
      start_line: {
        type: 'integer',
        description: 'The first line number to replace (1-indexed, inclusive). Must be an integer.',
        required: true,
      },
      end_line: {
        type: 'integer',
        description: 'The last line number to replace (1-indexed, inclusive). To replace a single line, set this equal to start_line. Must be an integer.',
        required: true,
      },
      new_content: {
        type: 'string',
        description: 'The new content to place at the specified line range. This replaces all lines between start_line and end_line.',
        required: true,
      },
    },
    execute: async (args, conversationId) => {
      await applyDiff(conversationId, args.file_path, args.start_line, args.end_line, args.new_content);
      return { success: true, message: `Lines ${args.start_line}-${args.end_line} of "${args.file_path}" replaced successfully.` };
    },
  },

  {
    name: 'list_files',
    description:
      'Returns a list of all file paths currently in the project workspace. ' +
      'Use this at the start of a task to understand what already exists before creating new files.',
    parameters: {},
    execute: async (args, conversationId) => {
      const files = await listVirtualFiles(conversationId);
      return {
        count: files.length,
        files,
        message: files.length === 0
          ? 'The workspace is empty. No files have been created yet.'
          : `Found ${files.length} file(s) in the workspace.`,
      };
    },
  },

  {
    name: 'check_syntax',
    description:
      'Checks a file in the workspace for syntax errors and type errors using the TypeScript compiler. ' +
      'Always call this after writing or modifying a TypeScript or JavaScript file to verify it is correct. ' +
      'Returns a list of errors with their exact line numbers. ' +
      'If success is true, the file is syntactically valid.',
    parameters: {
      file_path: {
        type: 'string',
        description: 'The relative path of the file to check, e.g. "src/api/users.ts".',
        required: true,
      },
    },
    execute: async (args, conversationId) => {
      const result = await runLinter(conversationId, args.file_path);
      return result;
    },
  },
];

export function getToolsForAgent(toolNames: string[]): ToolDefinition[] {
  return TOOL_REGISTRY.filter((tool) => toolNames.includes(tool.name));
}

/**
 * Executes a tool by name with the given arguments.
 * Includes strong parameter validation, safe type coercion, and a standard try-catch response wrapper.
 */
export async function executeTool(
  toolName: string,
  toolArgs: Record<string, any>,
  conversationId: string
): Promise<any> {
  const tool = TOOL_REGISTRY.find((t) => t.name === toolName);

  if (!tool) {
    return {
      error: true,
      message: `Tool "${toolName}" is not registered. Available tools: ${TOOL_REGISTRY.map((t) => t.name).join(', ')}`,
    };
  }

  const validatedArgs: Record<string, any> = {};

  try {
    for (const [paramName, paramDef] of Object.entries(tool.parameters)) {
      const value = toolArgs[paramName];

      if (value === undefined || value === null) {
        if (paramDef.required) {
          throw new Error(`Missing required parameter "${paramName}".`);
        }
        continue;
      }

      // Strong type validation and safe coercion
      if (paramDef.type === 'string') {
        validatedArgs[paramName] = String(value);
      } else if (paramDef.type === 'integer') {
        const parsed = parseInt(value, 10);
        if (isNaN(parsed)) {
          throw new Error(`Parameter "${paramName}" must be a valid integer, got: "${value}".`);
        }
        validatedArgs[paramName] = parsed;
      } else if (paramDef.type === 'number') {
        const parsed = Number(value);
        if (isNaN(parsed)) {
          throw new Error(`Parameter "${paramName}" must be a valid number, got: "${value}".`);
        }
        validatedArgs[paramName] = parsed;
      } else if (paramDef.type === 'boolean') {
        if (typeof value === 'boolean') {
          validatedArgs[paramName] = value;
        } else if (value === 'true' || value === 1 || value === '1') {
          validatedArgs[paramName] = true;
        } else if (value === 'false' || value === 0 || value === '0') {
          validatedArgs[paramName] = false;
        } else {
          throw new Error(`Parameter "${paramName}" must be a valid boolean, got: "${value}".`);
        }
      }
    }

    return await tool.execute(validatedArgs, conversationId);
  } catch (err: any) {
    return {
      error: true,
      message: `Tool "${toolName}" execution error: ${err.message}`,
    };
  }
}

export function toolToOllamaFormat(tool: ToolDefinition): object {
  const properties: Record<string, any> = {};
  const required: string[] = [];

  for (const [name, param] of Object.entries(tool.parameters)) {
    properties[name] = {
      type: param.type === 'integer' ? 'integer' : param.type,
      description: param.description,
    };
    if (param.required) {
      required.push(name);
    }
  }

  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties,
        required,
      },
    },
  };
}
