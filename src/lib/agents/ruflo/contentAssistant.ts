import { StageLedger } from './memory';
import { KnowledgeResolver } from './knowledgeResolver';
import { AGENT_DEFS } from './agents';

export interface MinimalContextResult {
  contextText: string;
  bytesSaved: number;
  reductionRatio: number;
  injectedKeys: string[];
}

export async function buildMinimalContext(ledger: StageLedger, agentName: string): Promise<MinimalContextResult> {
  const knowledgeResolver = new KnowledgeResolver();
  const fullMemoryState = ledger.getState();
  const rawMemoryString = JSON.stringify(fullMemoryState, null, 2);
  const rawBytes = rawMemoryString.length;

  if (['SystemsArchitect', 'Architect', 'BackendArchitect', 'System', 'UIUXArchitect', 'Designer', 'Coder'].includes(agentName)) {
    const contextObject: Record<string, any> = {
      project: ledger.read('taskSpec'),
      runtime: ledger.read('tester')
    };

    switch (agentName) {
      case 'SystemsArchitect':
      case 'Architect':
        contextObject.queen = ledger.query('Architect', { fromAgent: 'Queen', select: ['projectName', 'projectGoal', 'mvpScope.included', 'constraints'] });
        contextObject.planner = ledger.query('Architect', { fromAgent: 'Planner', select: ['recommendedTechStack', 'features', 'functionalRequirements', 'nonFunctionalRequirements.performance', 'nonFunctionalRequirements.scalability'] });
        break;

      case 'BackendArchitect':
      case 'System':
        contextObject.queen = ledger.query('System', { fromAgent: 'Queen', select: ['projectName', 'projectGoal', 'constraints'] });
        contextObject.planner = ledger.query('System', { fromAgent: 'Planner', select: ['recommendedTechStack', 'features', 'functionalRequirements', 'nonFunctionalRequirements.security', 'nonFunctionalRequirements.reliability'] });
        contextObject.systemsArchitect = ledger.query('System', { fromAgent: 'Architect', select: ['modules', 'projectStructure.files'] });
        break;

      case 'UIUXArchitect':
      case 'Designer':
        contextObject.queen = ledger.query('Designer', { fromAgent: 'Queen', select: ['projectName', 'projectGoal', 'mvpScope.included', 'constraints'] });
        contextObject.planner = ledger.query('Designer', { fromAgent: 'Planner', select: ['recommendedTechStack', 'features', 'functionalRequirements', 'nonFunctionalRequirements.accessibility', 'nonFunctionalRequirements.usability'] });
        contextObject.systemsArchitect = ledger.query('Designer', { fromAgent: 'Architect', select: ['modules', 'projectStructure.files'] });
        contextObject.backendArchitect = ledger.query('Designer', { fromAgent: 'System', select: ['apis', 'database.entities'] });
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

    const contextText = JSON.stringify(contextObject, null, 2);
    const optimizedBytes = contextText.length;
    const bytesSaved = Math.max(0, rawBytes - optimizedBytes);
    const reductionRatio = rawBytes > 0 ? Math.round((bytesSaved / rawBytes) * 100) : 0;
    const injectedKeys = Object.keys(contextObject);

    return {
      contextText,
      bytesSaved,
      reductionRatio,
      injectedKeys
    };
  }

  // Fallback to legacy context builder for other agents
  const agentDef = AGENT_DEFS[agentName];
  let contextText = '';
  if (agentDef && typeof agentDef.getContext === 'function') {
    contextText = await agentDef.getContext(ledger);
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
    injectedKeys: ['legacy_fallback']
  };
}
