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

function countMarkdownItems(state: any): number {
  if (!state) return 0;
  const content = typeof state === 'string' ? state : state.content || '';
  if (!content) return 0;
  const lines = content.split('\n');
  const bulletLines = lines.filter((l: string) => /^\s*[-*]\s+/.test(l));
  return bulletLines.length || 3;
}

export function calculateTokenBudget(
  agentName: string,
  ledger: StageLedger
): TokenBudgetResult {
  let budget = 16384; // Default base fallback
  const breakdown: {
    featuresCount?: number;
    fileCount?: number;
    totalCodeChars?: number;
    formulaApplied: string;
  } = {
    formulaApplied: 'base_default'
  };

  // 1. Task-based Scaling Math
  if (agentName === 'Planner') {
    const taskSpec = ledger.read('taskSpec');
    const featuresCount = taskSpec?.mvpScope?.included?.length || countMarkdownItems(taskSpec);
    budget = 16384 + (featuresCount * 1024);
    breakdown.featuresCount = featuresCount;
    breakdown.formulaApplied = '16384 + (featuresCount * 1024)';
  } 
  else if (agentName === 'Architect') {
    const planner = ledger.read('planner');
    const featuresCount = planner?.features?.length || countMarkdownItems(planner);
    budget = 16384 + (featuresCount * 1024);
    breakdown.featuresCount = featuresCount;
    breakdown.formulaApplied = '16384 + (featuresCount * 1024)';
  }
  else if (agentName === 'System' || agentName === 'Designer') {
    const planner = ledger.read('planner');
    const featuresCount = planner?.features?.length || countMarkdownItems(planner);
    const architect = ledger.read('architect');
    const fileCount = architect?.projectStructure?.files?.length || countMarkdownItems(architect);
    budget = 16384 + (featuresCount * 1024) + (fileCount * 1024);
    breakdown.featuresCount = featuresCount;
    breakdown.fileCount = fileCount;
    breakdown.formulaApplied = '16384 + (featuresCount * 1024) + (fileCount * 1024)';
  } 
  else if (agentName === 'Coder') {
    const architect = ledger.read('architect');
    const fileCount = architect?.projectStructure?.files?.length || countMarkdownItems(architect);
    budget = 32768 + (fileCount * 2048);
    breakdown.fileCount = fileCount;
    breakdown.formulaApplied = '32768 + (fileCount * 2048)';
  } 
  else if (agentName === 'Debugger' || agentName === 'Tester') {
    const coderState = ledger.read('coder') || {};
    let totalChars = 0;
    Object.values(coderState).forEach((code: any) => {
      const codeStr = typeof code === 'string' ? code : (code?.content ?? '');
      totalChars += codeStr.length;
    });
    const totalTokens = Math.round(totalChars / 4);
    budget = Math.max(16384, Math.round(totalTokens * 0.5));
    breakdown.totalCodeChars = totalChars;
    breakdown.formulaApplied = 'max(16384, round((totalCodeChars / 4) * 0.5))';
  } 
  else {
    // For other agents (Queen, Reviewer, Security), fall back to metadata configurations
    const def = AGENT_DEFS[agentName];
    if (def && typeof def.maxTokens === 'number') {
      budget = Math.max(16384, def.maxTokens);
    }
    breakdown.formulaApplied = 'agent_def_max_tokens_fallback';
  }

  // Clamp budget to a safe upper limit matching local LLM context window (32768)
  const MAX_BUDGET = 32768;
  budget = Math.min(budget, MAX_BUDGET);

  // 2. Timeout Scaling Math: scale timeout linearly to calculated token budget (600s / 10m to 3600s / 60m)
  const timeoutSeconds = Math.max(600, Math.min(3600, Math.round((budget / 32768) * 3000 + 600)));
  const timeoutMs = timeoutSeconds * 1000;

  return {
    budget,
    timeoutMs,
    breakdown
  };
}
