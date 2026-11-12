import {
  readVirtualFile,
  writeVirtualFile,
  listVirtualFiles,
  applyDiff,
  deleteVirtualFile,
  flushVfsToDisk,
} from './vfs';
import { runLinter } from './linter';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import {
  isControlPlaneArtifact,
  normalizeProjectPath,
} from './workspace-policy';
import { createContentHash } from './contracts/fingerprints';
import { AGENT_DEFS } from './agents';

const execFileAsync = promisify(execFile);

const SAFE_NPM_PACKAGE_SPEC_REGEX =
  /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*(?:@[a-z0-9-._~^>=<|-]+)?$/i;

export function isValidNpmPackageSpec(spec: string): boolean {
  if (!spec || typeof spec !== 'string') return false;
  const trimmed = spec.trim();
  if (!trimmed || trimmed.length > 214) return false;
  if (/[;&|`$<>\\!\n\r]/.test(trimmed) || trimmed.startsWith('-')) return false;
  return SAFE_NPM_PACKAGE_SPEC_REGEX.test(trimmed);
}

export interface ToolExecutionContext {
  conversationId: string;
  pipelineRunId: string;
  stageExecutionId?: string;
  stageName?: string;
  isSetupOperation?: boolean;
  allowedMutationPaths?: string[];
}

function resolveConversationProjectDir(conversationId: string): string {
  if (
    typeof conversationId !== 'string' ||
    !/^[A-Za-z0-9_-]{8,128}$/.test(conversationId)
  ) {
    throw new Error('Security Exception: Invalid conversationId.');
  }

  const projectsRoot = path.resolve(process.cwd(), 'projects');
  const projectDir = path.resolve(projectsRoot, conversationId);

  if (path.dirname(projectDir) !== projectsRoot) {
    throw new Error('Security Exception: Project directory escaped workspace root.');
  }
  if (!fs.existsSync(projectDir)) {
    throw new Error(`Project directory does not exist for conversation ${conversationId}.`);
  }

  const realRoot = fs.realpathSync(projectsRoot);
  const realProject = fs.realpathSync(projectDir);
  if (realProject !== realRoot && !realProject.startsWith(realRoot + path.sep)) {
    throw new Error('Security Exception: Project directory resolves outside workspace root.');
  }
  return realProject;
}

async function runProjectBinary(
  binary: string,
  args: string[],
  conversationId: string,
  timeoutMs: number = 180000
) {
  let projectDir: string;
  try {
    projectDir = resolveConversationProjectDir(conversationId);
  } catch (err: any) {
    return {
      success: false,
      exitCode: 1,
      stdout: '',
      stderr: err.message,
    };
  }
  try {
    await flushVfsToDisk(conversationId);
  } catch (err: any) {
    return {
      success: false,
      exitCode: 1,
      stdout: '',
      stderr: `VFS synchronization failed; command not executed: ${err.message}`,
    };
  }
  const resolvedBin =
    process.platform === 'win32' && (binary === 'npm' || binary === 'npx')
      ? `${binary}.cmd`
      : binary;
  try {
    const { stdout, stderr } = await execFileAsync(resolvedBin, args, {
      cwd: projectDir,
      timeout: timeoutMs,
      windowsHide: true,
      env: {
        PATH: process.env.PATH,
        SystemRoot: process.env.SystemRoot,
        HOME: process.env.HOME || process.env.USERPROFILE,
        USERPROFILE: process.env.USERPROFILE,
        TEMP: process.env.TEMP,
        TMP: process.env.TMP,
        NODE_ENV: 'development',
      },
    });
    return { success: true, exitCode: 0, stdout: (stdout || '').trim(), stderr: (stderr || '').trim() };
  } catch (err: any) {
    return {
      success: false,
      exitCode: typeof err.code === 'number' ? err.code : 1,
      stdout: (err.stdout || '').trim(),
      stderr: (err.stderr || err.message || '').trim(),
    };
  }
}

export interface ToolParameter {
  type: 'string' | 'number' | 'integer' | 'boolean';
  description: string;
  required: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, ToolParameter>;
  execute: (args: Record<string, any>, contextOrConversationId: string | ToolExecutionContext) => Promise<any>;
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
    execute: async (args, contextOrConversationId) => {
      const conversationId = typeof contextOrConversationId === 'string'
        ? contextOrConversationId
        : contextOrConversationId.conversationId;
      const content = await readVirtualFile(conversationId, args.file_path);
      if (content === null) {
        return { 
          found: false, 
          content: null, 
          message: `File "${args.file_path}" does not exist yet. Suggestion: Use list_files to see exact paths of all existing files.` 
        };
      }
      return {
        found: true,
        content,
        lineCount: content.split('\n').length,
        contentHash: createContentHash(content),
      };
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
    execute: async (args, contextOrConversationId) => {
      const ctx = typeof contextOrConversationId === 'string'
        ? ({ conversationId: contextOrConversationId, pipelineRunId: '' } as ToolExecutionContext)
        : contextOrConversationId;

      if (!ctx.pipelineRunId || typeof ctx.pipelineRunId !== 'string' || !ctx.pipelineRunId.trim()) {
        throw new Error(
          `Authorization Exception: active pipelineRunId is mandatory for tool mutation. Conversation-wide fallback authorization without a pipelineRunId is strictly forbidden.`
        );
      }

      await writeVirtualFile(ctx.conversationId, args.file_path, args.content, {
        pipelineRunId: ctx.pipelineRunId,
        stageExecutionId: ctx.stageExecutionId,
        stageName: ctx.stageName,
        isSetupOperation: ctx.isSetupOperation,
        allowedMutationPaths: ctx.allowedMutationPaths,
      });
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
      expected_content_hash: {
        type: 'string',
        description: 'The contentHash returned by read_file. Prevents applying a patch to stale content.',
        required: true,
      },
    },
    execute: async (args, contextOrConversationId) => {
      const ctx = typeof contextOrConversationId === 'string'
        ? ({ conversationId: contextOrConversationId, pipelineRunId: '' } as ToolExecutionContext)
        : contextOrConversationId;

      if (!ctx.pipelineRunId || typeof ctx.pipelineRunId !== 'string' || !ctx.pipelineRunId.trim()) {
        throw new Error(
          `Authorization Exception: active pipelineRunId is mandatory for tool mutation. Conversation-wide fallback authorization without a pipelineRunId is strictly forbidden.`
        );
      }

      if (!args.expected_content_hash || typeof args.expected_content_hash !== 'string' || !args.expected_content_hash.trim()) {
        throw new Error('Parameter "expected_content_hash" must be a non-empty content hash string.');
      }

      await applyDiff(
        ctx.conversationId,
        args.file_path,
        args.start_line,
        args.end_line,
        args.new_content,
        {
          pipelineRunId: ctx.pipelineRunId,
          stageExecutionId: ctx.stageExecutionId,
          stageName: ctx.stageName,
          isSetupOperation: ctx.isSetupOperation,
          allowedMutationPaths: ctx.allowedMutationPaths,
        },
        args.expected_content_hash
      );
      return { success: true, message: `Lines ${args.start_line}-${args.end_line} of "${args.file_path}" replaced successfully.` };
    },
  },

  {
    name: 'delete_file',
    description:
      'Deletes an authorized file from the project workspace. ' +
      'Cannot be used to delete control-plane artifacts.',
    parameters: {
      file_path: {
        type: 'string',
        description: 'The relative path of the file to delete.',
        required: true,
      },
    },
    execute: async (args, contextOrConversationId) => {
      const ctx = typeof contextOrConversationId === 'string'
        ? ({ conversationId: contextOrConversationId, pipelineRunId: '' } as ToolExecutionContext)
        : contextOrConversationId;

      if (!ctx.pipelineRunId || typeof ctx.pipelineRunId !== 'string' || !ctx.pipelineRunId.trim()) {
        throw new Error(
          `Authorization Exception: active pipelineRunId is mandatory for tool mutation. Conversation-wide fallback authorization without a pipelineRunId is strictly forbidden.`
        );
      }

      const deleted = await deleteVirtualFile(ctx.conversationId, args.file_path, {
        pipelineRunId: ctx.pipelineRunId,
        stageExecutionId: ctx.stageExecutionId,
        stageName: ctx.stageName,
        isSetupOperation: ctx.isSetupOperation,
        allowedMutationPaths: ctx.allowedMutationPaths,
      });
      return {
        success: deleted,
        message: deleted
          ? `File "${args.file_path}" deleted successfully.`
          : `File "${args.file_path}" did not exist.`,
      };
    },
  },

  {
    name: 'list_files',
    description:
      'Returns a list of all file paths currently in the project workspace. ' +
      'Use this at the start of a task to understand what already exists before creating new files.',
    parameters: {},
    execute: async (args, contextOrConversationId) => {
      const conversationId = typeof contextOrConversationId === 'string'
        ? contextOrConversationId
        : contextOrConversationId.conversationId;
      const files = await listVirtualFiles(conversationId);
      const visibleFiles = files.filter(
        (p) => !isControlPlaneArtifact(normalizeProjectPath(p))
      );
      return {
        count: visibleFiles.length,
        files: visibleFiles,
        message: visibleFiles.length === 0
          ? 'The workspace is empty. No files have been created yet.'
          : `Found ${visibleFiles.length} project file(s) in the workspace.`,
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
    execute: async (args, contextOrConversationId) => {
      const conversationId = typeof contextOrConversationId === 'string'
        ? contextOrConversationId
        : contextOrConversationId.conversationId;
      const result = await runLinter(conversationId, args.file_path);
      return result;
    },
  },

  {
    name: 'npm_install',
    description:
      'Runs npm install inside the project workspace directory to install dependencies specified in package.json.',
    parameters: {
      package_name: {
        type: 'string',
        description: 'Optional package name to install, e.g. "lucide-react". Omit to install all dependencies.',
        required: false,
      },
    },
    execute: async (args, contextOrConversationId) => {
      const conversationId = typeof contextOrConversationId === 'string'
        ? contextOrConversationId
        : contextOrConversationId.conversationId;
      if (args.package_name) {
        const pkg = String(args.package_name).trim();
        if (!isValidNpmPackageSpec(pkg)) {
          throw new Error(
            `Security Exception: Invalid or unsafe npm package specifier "${pkg}".`
          );
        }
        return await runProjectBinary('npm', ['install', pkg], conversationId, 120000);
      }
      return await runProjectBinary('npm', ['install'], conversationId, 120000);
    },
  },

  {
    name: 'typecheck',
    description:
      'Runs full project TypeScript typechecking (tsc --noEmit) across all files in the workspace.',
    parameters: {},
    execute: async (_args, contextOrConversationId) => {
      const conversationId = typeof contextOrConversationId === 'string'
        ? contextOrConversationId
        : contextOrConversationId.conversationId;
      return await runProjectBinary('npx', ['tsc', '--noEmit'], conversationId, 60000);
    },
  },

  {
    name: 'build_project',
    description:
      'Runs the production build command (npm run build) for the generated project and returns success status and logs.',
    parameters: {},
    execute: async (_args, contextOrConversationId) => {
      const conversationId = typeof contextOrConversationId === 'string'
        ? contextOrConversationId
        : contextOrConversationId.conversationId;
      return await runProjectBinary('npm', ['run', 'build'], conversationId, 120000);
    },
  },

  {
    name: 'run_tests',
    description:
      'Runs test suite (npm test) for the generated project and returns test results.',
    parameters: {},
    execute: async (_args, contextOrConversationId) => {
      const conversationId = typeof contextOrConversationId === 'string'
        ? contextOrConversationId
        : contextOrConversationId.conversationId;
      return await runProjectBinary('npm', ['test'], conversationId, 60000);
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
  contextOrConversationId: string | ToolExecutionContext,
  options?: Partial<ToolExecutionContext>
): Promise<any> {
  const tool = TOOL_REGISTRY.find((t) => t.name === toolName);

  if (!tool) {
    return {
      error: true,
      message: `Tool "${toolName}" is not registered. Available tools: ${TOOL_REGISTRY.map((t) => t.name).join(', ')}`,
    };
  }

  const context: ToolExecutionContext =
    typeof contextOrConversationId === 'string'
      ? {
          conversationId: contextOrConversationId,
          pipelineRunId: options?.pipelineRunId || '',
          stageExecutionId: options?.stageExecutionId,
          stageName: options?.stageName,
          isSetupOperation: options?.isSetupOperation,
          allowedMutationPaths: options?.allowedMutationPaths,
        }
      : {
          ...contextOrConversationId,
          ...options,
        };

  const validatedArgs: Record<string, any> = {};

  try {
    if (!context.stageName) {
      throw new Error('Authorization Exception: stageName is required for tool execution.');
    }
    const agentDef = AGENT_DEFS[context.stageName];
    if (!agentDef || !agentDef.tools.includes(toolName)) {
      throw new Error(
        `Authorization Exception: Tool "${toolName}" is not permitted for stage "${context.stageName}".`
      );
    }

    if (
      toolArgs !== undefined &&
      toolArgs !== null &&
      (typeof toolArgs !== 'object' || Array.isArray(toolArgs))
    ) {
      throw new Error(`Invalid arguments payload for tool "${toolName}": expected an object.`);
    }

    const argsInput = toolArgs || {};
    const allowedNames = new Set(Object.keys(tool.parameters));
    for (const suppliedName of Object.keys(argsInput)) {
      if (!allowedNames.has(suppliedName)) {
        throw new Error(`Unknown parameter "${suppliedName}" for tool "${toolName}".`);
      }
    }

    for (const [paramName, paramDef] of Object.entries(tool.parameters)) {
      const value = argsInput[paramName];

      if (value === undefined || value === null) {
        if (paramDef.required) {
          throw new Error(`Missing required parameter "${paramName}".`);
        }
        continue;
      }

      if (paramDef.type === 'string') {
        if (typeof value !== 'string') {
          throw new Error(`Parameter "${paramName}" must be a string.`);
        }
        validatedArgs[paramName] = value;
      } else if (paramDef.type === 'integer') {
        const parsed = typeof value === 'number'
          ? value
          : typeof value === 'string' && /^-?\d+$/.test(value.trim())
            ? Number(value.trim())
            : Number.NaN;
        if (!Number.isSafeInteger(parsed)) {
          throw new Error(`Parameter "${paramName}" must be a safe integer.`);
        }
        validatedArgs[paramName] = parsed;
      } else if (paramDef.type === 'number') {
        const parsed = typeof value === 'number'
          ? value
          : typeof value === 'string' && value.trim() !== ''
            ? Number(value)
            : Number.NaN;
        if (!Number.isFinite(parsed)) {
          throw new Error(`Parameter "${paramName}" must be a finite number.`);
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

    return await tool.execute(validatedArgs, context);
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

export function toolToAnthropicFormat(tool: ToolDefinition): object {
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
    name: tool.name,
    description: tool.description,
    input_schema: {
      type: 'object',
      properties,
      required,
    },
  };
}

export function toolsToProviderFormat(
  tools: ToolDefinition[],
  provider: string = 'ollama'
): object[] {
  if (provider === 'anthropic') {
    return tools.map(toolToAnthropicFormat);
  }
  return tools.map(toolToOllamaFormat);
}
