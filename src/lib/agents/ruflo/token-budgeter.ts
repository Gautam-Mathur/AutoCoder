import { StageLedger } from './memory';
import { AGENT_DEFS } from './agents';

export interface TokenBudgetResult {
  budget: number;
  timeoutMs: number;
  breakdown: {
    featuresCount?: number;
    fileCount?: number;
    totalCodeChars?: number;
    formulaApplied: string;
  };
}

export const DEFAULT_STAGE_TIMEOUT_MS: Record<string, number> = {
  Queen: 600_000,       // 10 minutes
  Planner: 600_000,     // 10 minutes
  Architect: 900_000,   // 15 minutes
  System: 900_000,      // 15 minutes
  Designer: 900_000,    // 15 minutes
  Blueprinter: 1200_000, // 20 minutes
  Coder: 1800_000,      // 30 minutes
  Tester: 900_000,      // 15 minutes
  Debugger: 1200_000,   // 20 minutes
  Security: 900_000,    // 15 minutes
  Reviewer: 900_000,    // 15 minutes
};

export function countSectionItems(markdown: string, sectionName: string): number {
  if (!markdown) return 0;
  const escaped = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = markdown.match(
    new RegExp(`^#{1,4}\\s*${escaped}\\s*$([\\s\\S]*?)(?=^#{1,4}\\s+|$)`, 'im')
  );
  if (!match) return 0;
  return match[1].split('\n').filter((line) => /^\s*(?:[-*]|\d+\.)\s+/.test(line)).length;
}

export function calculateTokenBudget(
  agentName: string,
  ledger: StageLedger
): TokenBudgetResult {
  let budget = 16384;
  const breakdown: {
    featuresCount?: number;
    fileCount?: number;
    totalCodeChars?: number;
    formulaApplied: string;
  } = {
    formulaApplied: 'base_default',
  };

  if (agentName === 'Planner') {
    const taskSpec = ledger.read('taskSpec');
    const featuresCount = countSectionItems(typeof taskSpec === 'string' ? taskSpec : taskSpec?.content || '', 'Features') || 3;
    budget = 16384 + featuresCount * 1024;
    breakdown.featuresCount = featuresCount;
    breakdown.formulaApplied = '16384 + (featuresCount * 1024)';
  } else if (agentName === 'Architect') {
    const planner = ledger.read('planner');
    const featuresCount = countSectionItems(typeof planner === 'string' ? planner : planner?.content || '', 'Features') || 3;
    budget = 16384 + featuresCount * 1024;
    breakdown.featuresCount = featuresCount;
    breakdown.formulaApplied = '16384 + (featuresCount * 1024)';
  } else if (agentName === 'System' || agentName === 'Designer') {
    const planner = ledger.read('planner');
    const featuresCount = countSectionItems(typeof planner === 'string' ? planner : planner?.content || '', 'Features') || 3;
    const architect = ledger.read('architect');
    const fileCount = countSectionItems(typeof architect === 'string' ? architect : architect?.content || '', 'Project Folder Structure') || 5;
    budget = 16384 + featuresCount * 1024 + fileCount * 1024;
    breakdown.featuresCount = featuresCount;
    breakdown.fileCount = fileCount;
    breakdown.formulaApplied = '16384 + (featuresCount * 1024) + (fileCount * 1024)';
  } else if (agentName === 'Coder') {
    const architect = ledger.read('architect');
    const fileCount = countSectionItems(typeof architect === 'string' ? architect : architect?.content || '', 'Project Folder Structure') || 5;
    budget = 32768 + fileCount * 2048;
    breakdown.fileCount = fileCount;
    breakdown.formulaApplied = '32768 + (fileCount * 2048)';
  } else if (agentName === 'Debugger' || agentName === 'Tester') {
    const coderState = ledger.read('coder') || {};
    let totalChars = 0;
    Object.values(coderState).forEach((code: any) => {
      const codeStr = typeof code === 'string' ? code : code?.content ?? '';
      totalChars += codeStr.length;
    });
    const totalTokens = Math.round(totalChars / 4);
    budget = Math.max(16384, Math.round(totalTokens * 0.5));
    breakdown.totalCodeChars = totalChars;
    breakdown.formulaApplied = 'max(16384, round((totalCodeChars / 4) * 0.5))';
  } else if (agentName === 'Security' || agentName === 'Reviewer') {
    budget = 8192;
    breakdown.formulaApplied = 'fixed_8192_for_audit_agents';
  } else {
    const def = AGENT_DEFS[agentName];
    if (def && typeof def.maxTokens === 'number') {
      budget = Math.max(16384, def.maxTokens);
    }
    breakdown.formulaApplied = 'agent_def_max_tokens_fallback';
  }

  const MAX_BUDGET = agentName === 'Coder' || agentName === 'Debugger' ? 65536 : 32768;
  budget = Math.min(budget, MAX_BUDGET);

  const baseTimeout = DEFAULT_STAGE_TIMEOUT_MS[agentName] || 600_000;
  const timeoutMs = Math.max(baseTimeout, Math.round(budget * 50));

  return {
    budget,
    timeoutMs,
    breakdown,
  };
}
