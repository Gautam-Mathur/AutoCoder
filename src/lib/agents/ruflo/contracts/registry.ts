import { CONTRACT_VERSIONS, StageName } from './versions';

export type StageInputArtifact = {
  name: string;
  contract: string;
  minVersion: string;
};

export type StageOutputArtifact = {
  name: string;
  contract: string;
  version: string;
};

export type StageContract = {
  name: StageName;
  version: string;
  inputArtifacts: StageInputArtifact[];
  outputArtifact: StageOutputArtifact;
};

export const STAGE_CONTRACTS: Record<StageName, StageContract> = {
  Queen: {
    name: 'Queen',
    version: CONTRACT_VERSIONS.Queen.version,
    inputArtifacts: [],
    outputArtifact: {
      name: CONTRACT_VERSIONS.Queen.outputArtifactName,
      contract: CONTRACT_VERSIONS.Queen.name,
      version: CONTRACT_VERSIONS.Queen.version,
    },
  },
  Planner: {
    name: 'Planner',
    version: CONTRACT_VERSIONS.Planner.version,
    inputArtifacts: [
      {
        name: 'requirements.md',
        contract: CONTRACT_VERSIONS.Queen.name,
        minVersion: '1.0.0',
      },
    ],
    outputArtifact: {
      name: CONTRACT_VERSIONS.Planner.outputArtifactName,
      contract: CONTRACT_VERSIONS.Planner.name,
      version: CONTRACT_VERSIONS.Planner.version,
    },
  },
  Architect: {
    name: 'Architect',
    version: CONTRACT_VERSIONS.Architect.version,
    inputArtifacts: [
      {
        name: 'plan.md',
        contract: CONTRACT_VERSIONS.Planner.name,
        minVersion: '1.0.0',
      },
      {
        name: 'requirements.md',
        contract: CONTRACT_VERSIONS.Queen.name,
        minVersion: '1.0.0',
      },
    ],
    outputArtifact: {
      name: CONTRACT_VERSIONS.Architect.outputArtifactName,
      contract: CONTRACT_VERSIONS.Architect.name,
      version: CONTRACT_VERSIONS.Architect.version,
    },
  },
  System: {
    name: 'System',
    version: CONTRACT_VERSIONS.System.version,
    inputArtifacts: [
      {
        name: 'architecture.md',
        contract: CONTRACT_VERSIONS.Architect.name,
        minVersion: '1.0.0',
      },
      {
        name: 'plan.md',
        contract: CONTRACT_VERSIONS.Planner.name,
        minVersion: '1.0.0',
      },
    ],
    outputArtifact: {
      name: CONTRACT_VERSIONS.System.outputArtifactName,
      contract: CONTRACT_VERSIONS.System.name,
      version: CONTRACT_VERSIONS.System.version,
    },
  },
  Designer: {
    name: 'Designer',
    version: CONTRACT_VERSIONS.Designer.version,
    inputArtifacts: [
      {
        name: 'architecture.md',
        contract: CONTRACT_VERSIONS.Architect.name,
        minVersion: '1.0.0',
      },
      {
        name: 'plan.md',
        contract: CONTRACT_VERSIONS.Planner.name,
        minVersion: '1.0.0',
      },
    ],
    outputArtifact: {
      name: CONTRACT_VERSIONS.Designer.outputArtifactName,
      contract: CONTRACT_VERSIONS.Designer.name,
      version: CONTRACT_VERSIONS.Designer.version,
    },
  },
  Blueprinter: {
    name: 'Blueprinter',
    version: CONTRACT_VERSIONS.Blueprinter.version,
    inputArtifacts: [
      {
        name: 'architecture.md',
        contract: CONTRACT_VERSIONS.Architect.name,
        minVersion: '1.0.0',
      },
      {
        name: 'system_spec.md',
        contract: CONTRACT_VERSIONS.System.name,
        minVersion: '1.0.0',
      },
      {
        name: 'ui_spec.md',
        contract: CONTRACT_VERSIONS.Designer.name,
        minVersion: '1.0.0',
      },
    ],
    outputArtifact: {
      name: CONTRACT_VERSIONS.Blueprinter.outputArtifactName,
      contract: CONTRACT_VERSIONS.Blueprinter.name,
      version: CONTRACT_VERSIONS.Blueprinter.version,
    },
  },
  Coder: {
    name: 'Coder',
    version: CONTRACT_VERSIONS.Coder.version,
    inputArtifacts: [
      {
        name: 'blueprint.json',
        contract: CONTRACT_VERSIONS.Blueprinter.name,
        minVersion: '1.0.0',
      },
      {
        name: 'architecture.md',
        contract: CONTRACT_VERSIONS.Architect.name,
        minVersion: '1.0.0',
      },
    ],
    outputArtifact: {
      name: CONTRACT_VERSIONS.Coder.outputArtifactName,
      contract: CONTRACT_VERSIONS.Coder.name,
      version: CONTRACT_VERSIONS.Coder.version,
    },
  },
  Tester: {
    name: 'Tester',
    version: CONTRACT_VERSIONS.Tester.version,
    inputArtifacts: [
      {
        name: 'workspace',
        contract: CONTRACT_VERSIONS.Coder.name,
        minVersion: '1.0.0',
      },
    ],
    outputArtifact: {
      name: CONTRACT_VERSIONS.Tester.outputArtifactName,
      contract: CONTRACT_VERSIONS.Tester.name,
      version: CONTRACT_VERSIONS.Tester.version,
    },
  },
  Debugger: {
    name: 'Debugger',
    version: CONTRACT_VERSIONS.Debugger.version,
    inputArtifacts: [
      {
        name: 'test_report.md',
        contract: CONTRACT_VERSIONS.Tester.name,
        minVersion: '1.0.0',
      },
      {
        name: 'workspace',
        contract: CONTRACT_VERSIONS.Coder.name,
        minVersion: '1.0.0',
      },
    ],
    outputArtifact: {
      name: CONTRACT_VERSIONS.Debugger.outputArtifactName,
      contract: CONTRACT_VERSIONS.Debugger.name,
      version: CONTRACT_VERSIONS.Debugger.version,
    },
  },
  Reviewer: {
    name: 'Reviewer',
    version: CONTRACT_VERSIONS.Reviewer.version,
    inputArtifacts: [
      {
        name: 'test_report.md',
        contract: CONTRACT_VERSIONS.Tester.name,
        minVersion: '1.0.0',
      },
      {
        name: 'architecture.md',
        contract: CONTRACT_VERSIONS.Architect.name,
        minVersion: '1.0.0',
      },
    ],
    outputArtifact: {
      name: CONTRACT_VERSIONS.Reviewer.outputArtifactName,
      contract: CONTRACT_VERSIONS.Reviewer.name,
      version: CONTRACT_VERSIONS.Reviewer.version,
    },
  },
  Security: {
    name: 'Security',
    version: CONTRACT_VERSIONS.Security.version,
    inputArtifacts: [
      {
        name: 'workspace',
        contract: CONTRACT_VERSIONS.Coder.name,
        minVersion: '1.0.0',
      },
      {
        name: 'architecture.md',
        contract: CONTRACT_VERSIONS.Architect.name,
        minVersion: '1.0.0',
      },
    ],
    outputArtifact: {
      name: CONTRACT_VERSIONS.Security.outputArtifactName,
      contract: CONTRACT_VERSIONS.Security.name,
      version: CONTRACT_VERSIONS.Security.version,
    },
  },
};

export function getStageContract(stageName: string): StageContract {
  const contract = STAGE_CONTRACTS[stageName as StageName];
  if (!contract) {
    throw new Error(`Unknown stage contract requested: ${stageName}`);
  }
  return contract;
}
