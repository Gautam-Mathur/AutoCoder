import { CONTRACT_VERSIONS, StageName } from './versions';
export type { StageName };

export type StageInputArtifact = {
  name: string;
  contract: string;
  minVersion: string;
};

export type StageOutputArtifact = {
  name: string;
  contract: string;
  version: string;
  outputFormat: 'markdown' | 'json';
  requiredHeadings: readonly string[];
  parserId: string;
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
      outputFormat: CONTRACT_VERSIONS.Queen.format,
      requiredHeadings: CONTRACT_VERSIONS.Queen.requiredHeadings,
      parserId: CONTRACT_VERSIONS.Queen.parserId,
    },
  },
  Planner: {
    name: 'Planner',
    version: CONTRACT_VERSIONS.Planner.version,
    inputArtifacts: [
      {
        name: 'plan.md',
        contract: CONTRACT_VERSIONS.Queen.name,
        minVersion: CONTRACT_VERSIONS.Queen.version,
      },
    ],
    outputArtifact: {
      name: CONTRACT_VERSIONS.Planner.outputArtifactName,
      contract: CONTRACT_VERSIONS.Planner.name,
      version: CONTRACT_VERSIONS.Planner.version,
      outputFormat: CONTRACT_VERSIONS.Planner.format,
      requiredHeadings: CONTRACT_VERSIONS.Planner.requiredHeadings,
      parserId: CONTRACT_VERSIONS.Planner.parserId,
    },
  },
  Architect: {
    name: 'Architect',
    version: CONTRACT_VERSIONS.Architect.version,
    inputArtifacts: [
      {
        name: 'requirements.md',
        contract: CONTRACT_VERSIONS.Planner.name,
        minVersion: CONTRACT_VERSIONS.Planner.version,
      },
      {
        name: 'plan.md',
        contract: CONTRACT_VERSIONS.Queen.name,
        minVersion: CONTRACT_VERSIONS.Queen.version,
      },
    ],
    outputArtifact: {
      name: CONTRACT_VERSIONS.Architect.outputArtifactName,
      contract: CONTRACT_VERSIONS.Architect.name,
      version: CONTRACT_VERSIONS.Architect.version,
      outputFormat: CONTRACT_VERSIONS.Architect.format,
      requiredHeadings: CONTRACT_VERSIONS.Architect.requiredHeadings,
      parserId: CONTRACT_VERSIONS.Architect.parserId,
    },
  },
  System: {
    name: 'System',
    version: CONTRACT_VERSIONS.System.version,
    inputArtifacts: [
      {
        name: 'architecture.md',
        contract: CONTRACT_VERSIONS.Architect.name,
        minVersion: CONTRACT_VERSIONS.Architect.version,
      },
      {
        name: 'requirements.md',
        contract: CONTRACT_VERSIONS.Planner.name,
        minVersion: CONTRACT_VERSIONS.Planner.version,
      },
    ],
    outputArtifact: {
      name: CONTRACT_VERSIONS.System.outputArtifactName,
      contract: CONTRACT_VERSIONS.System.name,
      version: CONTRACT_VERSIONS.System.version,
      outputFormat: CONTRACT_VERSIONS.System.format,
      requiredHeadings: CONTRACT_VERSIONS.System.requiredHeadings,
      parserId: CONTRACT_VERSIONS.System.parserId,
    },
  },
  Designer: {
    name: 'Designer',
    version: CONTRACT_VERSIONS.Designer.version,
    inputArtifacts: [
      {
        name: 'architecture.md',
        contract: CONTRACT_VERSIONS.Architect.name,
        minVersion: CONTRACT_VERSIONS.Architect.version,
      },
      {
        name: 'requirements.md',
        contract: CONTRACT_VERSIONS.Planner.name,
        minVersion: CONTRACT_VERSIONS.Planner.version,
      },
    ],
    outputArtifact: {
      name: CONTRACT_VERSIONS.Designer.outputArtifactName,
      contract: CONTRACT_VERSIONS.Designer.name,
      version: CONTRACT_VERSIONS.Designer.version,
      outputFormat: CONTRACT_VERSIONS.Designer.format,
      requiredHeadings: CONTRACT_VERSIONS.Designer.requiredHeadings,
      parserId: CONTRACT_VERSIONS.Designer.parserId,
    },
  },
  Blueprinter: {
    name: 'Blueprinter',
    version: CONTRACT_VERSIONS.Blueprinter.version,
    inputArtifacts: [
      {
        name: 'architecture.md',
        contract: CONTRACT_VERSIONS.Architect.name,
        minVersion: CONTRACT_VERSIONS.Architect.version,
      },
      {
        name: 'backend_spec.md',
        contract: CONTRACT_VERSIONS.System.name,
        minVersion: CONTRACT_VERSIONS.System.version,
      },
      {
        name: 'ui_spec.md',
        contract: CONTRACT_VERSIONS.Designer.name,
        minVersion: CONTRACT_VERSIONS.Designer.version,
      },
    ],
    outputArtifact: {
      name: CONTRACT_VERSIONS.Blueprinter.outputArtifactName,
      contract: CONTRACT_VERSIONS.Blueprinter.name,
      version: CONTRACT_VERSIONS.Blueprinter.version,
      outputFormat: CONTRACT_VERSIONS.Blueprinter.format,
      requiredHeadings: CONTRACT_VERSIONS.Blueprinter.requiredHeadings,
      parserId: CONTRACT_VERSIONS.Blueprinter.parserId,
    },
  },
  Coder: {
    name: 'Coder',
    version: CONTRACT_VERSIONS.Coder.version,
    inputArtifacts: [
      {
        name: 'blueprint.md',
        contract: CONTRACT_VERSIONS.Blueprinter.name,
        minVersion: CONTRACT_VERSIONS.Blueprinter.version,
      },
      {
        name: 'architecture.md',
        contract: CONTRACT_VERSIONS.Architect.name,
        minVersion: CONTRACT_VERSIONS.Architect.version,
      },
      {
        name: 'backend_spec.md',
        contract: CONTRACT_VERSIONS.System.name,
        minVersion: CONTRACT_VERSIONS.System.version,
      },
      {
        name: 'ui_spec.md',
        contract: CONTRACT_VERSIONS.Designer.name,
        minVersion: CONTRACT_VERSIONS.Designer.version,
      },
    ],
    outputArtifact: {
      name: CONTRACT_VERSIONS.Coder.outputArtifactName,
      contract: CONTRACT_VERSIONS.Coder.name,
      version: CONTRACT_VERSIONS.Coder.version,
      outputFormat: CONTRACT_VERSIONS.Coder.format,
      requiredHeadings: CONTRACT_VERSIONS.Coder.requiredHeadings,
      parserId: CONTRACT_VERSIONS.Coder.parserId,
    },
  },
  Tester: {
    name: 'Tester',
    version: CONTRACT_VERSIONS.Tester.version,
    inputArtifacts: [
      {
        name: 'workspace.manifest.json',
        contract: CONTRACT_VERSIONS.Coder.name,
        minVersion: CONTRACT_VERSIONS.Coder.version,
      },
    ],
    outputArtifact: {
      name: CONTRACT_VERSIONS.Tester.outputArtifactName,
      contract: CONTRACT_VERSIONS.Tester.name,
      version: CONTRACT_VERSIONS.Tester.version,
      outputFormat: CONTRACT_VERSIONS.Tester.format,
      requiredHeadings: CONTRACT_VERSIONS.Tester.requiredHeadings,
      parserId: CONTRACT_VERSIONS.Tester.parserId,
    },
  },
  Debugger: {
    name: 'Debugger',
    version: CONTRACT_VERSIONS.Debugger.version,
    inputArtifacts: [
      {
        name: 'test_report.md',
        contract: CONTRACT_VERSIONS.Tester.name,
        minVersion: CONTRACT_VERSIONS.Tester.version,
      },
      {
        name: 'workspace.manifest.json',
        contract: CONTRACT_VERSIONS.Coder.name,
        minVersion: CONTRACT_VERSIONS.Coder.version,
      },
    ],
    outputArtifact: {
      name: CONTRACT_VERSIONS.Debugger.outputArtifactName,
      contract: CONTRACT_VERSIONS.Debugger.name,
      version: CONTRACT_VERSIONS.Debugger.version,
      outputFormat: CONTRACT_VERSIONS.Debugger.format,
      requiredHeadings: CONTRACT_VERSIONS.Debugger.requiredHeadings,
      parserId: CONTRACT_VERSIONS.Debugger.parserId,
    },
  },
  Reviewer: {
    name: 'Reviewer',
    version: CONTRACT_VERSIONS.Reviewer.version,
    inputArtifacts: [
      {
        name: 'test_report.md',
        contract: CONTRACT_VERSIONS.Tester.name,
        minVersion: CONTRACT_VERSIONS.Tester.version,
      },
      {
        name: 'architecture.md',
        contract: CONTRACT_VERSIONS.Architect.name,
        minVersion: CONTRACT_VERSIONS.Architect.version,
      },
      {
        name: 'workspace.manifest.json',
        contract: CONTRACT_VERSIONS.Coder.name,
        minVersion: CONTRACT_VERSIONS.Coder.version,
      },
    ],
    outputArtifact: {
      name: CONTRACT_VERSIONS.Reviewer.outputArtifactName,
      contract: CONTRACT_VERSIONS.Reviewer.name,
      version: CONTRACT_VERSIONS.Reviewer.version,
      outputFormat: CONTRACT_VERSIONS.Reviewer.format,
      requiredHeadings: CONTRACT_VERSIONS.Reviewer.requiredHeadings,
      parserId: CONTRACT_VERSIONS.Reviewer.parserId,
    },
  },
  Security: {
    name: 'Security',
    version: CONTRACT_VERSIONS.Security.version,
    inputArtifacts: [
      {
        name: 'workspace.manifest.json',
        contract: CONTRACT_VERSIONS.Coder.name,
        minVersion: CONTRACT_VERSIONS.Coder.version,
      },
      {
        name: 'architecture.md',
        contract: CONTRACT_VERSIONS.Architect.name,
        minVersion: CONTRACT_VERSIONS.Architect.version,
      },
    ],
    outputArtifact: {
      name: CONTRACT_VERSIONS.Security.outputArtifactName,
      contract: CONTRACT_VERSIONS.Security.name,
      version: CONTRACT_VERSIONS.Security.version,
      outputFormat: CONTRACT_VERSIONS.Security.format,
      requiredHeadings: CONTRACT_VERSIONS.Security.requiredHeadings,
      parserId: CONTRACT_VERSIONS.Security.parserId,
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
