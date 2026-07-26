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
  schema: any;
  getContext: (ledger: any) => Promise<string>;
}

export const AGENT_DEFS: Record<string, AgentDef> = {
  Queen,
  Planner,
  Architect,
  System,
  Designer,
  Blueprinter,
  Coder,
  Tester,
  Debugger,
  Security,
  Reviewer,

  // RuFlo target architecture stage aliases mapping
  SystemsArchitect: Architect,
  BackendArchitect: System,
  UIUXArchitect: Designer,
  VerificationAgent: Reviewer,
  SecurityAuditor: Security
};
