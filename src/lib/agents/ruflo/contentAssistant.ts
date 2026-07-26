import { StageLedger } from './memory';
import { KnowledgeResolver } from './knowledgeResolver';
import { AGENT_DEFS } from './agents';

export async function buildMinimalContext(ledger: StageLedger, agentName: string): Promise<string> {
  const knowledgeResolver = new KnowledgeResolver();

  if (['SystemsArchitect', 'Architect', 'BackendArchitect', 'System', 'UIUXArchitect', 'Designer', 'Coder'].includes(agentName)) {
    const contextObject: Record<string, any> = {
      project: ledger.read('taskSpec'),
      runtime: ledger.read('tester')
    };

    switch (agentName) {
      case 'SystemsArchitect':
      case 'Architect':
        contextObject.planner = ledger.read('planner');
        break;

      case 'BackendArchitect':
      case 'System':
        contextObject.systemsArchitect = ledger.read('architect');
        contextObject.planner = ledger.read('planner');
        break;

      case 'UIUXArchitect':
      case 'Designer':
        contextObject.systemsArchitect = ledger.read('architect');
        contextObject.backendArchitect = ledger.read('system');
        contextObject.conventions = knowledgeResolver.conventions('typescript');
        break;

      case 'Coder':
        const coderState = ledger.read('coder') || {};
        contextObject.systemsArchitect = ledger.read('architect');
        contextObject.backendArchitect = ledger.read('system');
        contextObject.uiuxArchitect = ledger.read('designer');
        contextObject.generatedFileList = Object.keys(coderState).map(file => ({
          file,
          sizeBytes: coderState[file].length
        }));
        break;
    }

    return JSON.stringify(contextObject, null, 2);
  }

  // Fallback to legacy context builder for other agents
  const agentDef = AGENT_DEFS[agentName];
  if (agentDef && typeof agentDef.getContext === 'function') {
    return await agentDef.getContext(ledger);
  }
  return '{}';
}
