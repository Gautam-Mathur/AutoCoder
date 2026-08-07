import { StageLedger } from './memory';
import { AGENT_DEFS } from './agents';

export interface MinimalContextResult {
  contextText: string;
  bytesSaved: number;
  reductionRatio: number;
  injectedKeys: string[];
}

export async function buildMinimalContext(ledger: StageLedger, agentName: string, targetFile?: string): Promise<MinimalContextResult> {
  const fullMemoryState = ledger.getState();
  const rawMemoryString = JSON.stringify(fullMemoryState, null, 2);
  const rawBytes = rawMemoryString.length;

  const agentDef = AGENT_DEFS[agentName];
  let contextText = '';
  if (agentDef && typeof agentDef.getContext === 'function') {
    contextText = await agentDef.getContext(ledger, targetFile);
  } else {
    contextText = rawMemoryString;
  }

  const optimizedBytes = contextText.length;
  const bytesSaved = Math.max(0, rawBytes - optimizedBytes);
  const reductionRatio = rawBytes > 0 ? Math.round((bytesSaved / rawBytes) * 100) : 0;

  return {
    contextText,
    bytesSaved,
    reductionRatio,
    injectedKeys: [agentName]
  };
}
