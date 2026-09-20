import * as Queen from './registry/Queen';
import * as Planner from './registry/Planner';
import * as Architect from './registry/Architect';
import * as System from './registry/System';
import * as Designer from './registry/Designer';
import * as Blueprinter from './registry/Blueprinter';
import * as Coder from './registry/Coder';
import * as Tester from './registry/Tester';
import * as Debugger from './registry/Debugger';
import * as Security from './registry/Security';
import * as Reviewer from './registry/Reviewer';

export interface AgentDef {
  name: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  schema?: any;
  getContext?: (ledger: any, targetFile?: string) => Promise<string>;
  tools: string[];
  model?: string;
}

export const AGENT_DEFS: Record<string, AgentDef> = {
  Queen:       { ...Queen, tools: [] },
  Planner:     { ...Planner, tools: [] },
  Architect:   { ...Architect, tools: [] },
  System:      { ...System, tools: [] },
  Designer:    { ...Designer, tools: [] },
  Blueprinter: { ...Blueprinter, tools: [] },
  Coder:       { ...Coder, tools: ['read_file', 'write_file', 'apply_diff', 'list_files', 'check_syntax', 'typecheck', 'build_project'] },
  Tester:      { ...Tester, tools: [] },
  Debugger:    { ...Debugger, tools: ['read_file', 'write_file', 'apply_diff', 'list_files', 'check_syntax', 'typecheck', 'build_project'] },
  Security:    { ...Security, tools: [] },
  Reviewer:    { ...Reviewer, tools: [] },
};
