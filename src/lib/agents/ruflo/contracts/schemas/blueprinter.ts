export const BLUEPRINTER_SCHEMA = {
  contractName: 'BlueprintOutput',
  version: '1.0.0',
  requiredFields: ['blueprints'],
  mandatoryInvariants: [
    'Blueprints must cover all modules declared by Architect',
    'Each file blueprint must specify target path and complete code specifications',
  ],
} as const;
