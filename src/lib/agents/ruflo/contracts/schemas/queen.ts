export const QUEEN_SCHEMA = {
  contractName: 'QueenOutput',
  version: '1.0.0',
  requiredFields: ['projectName', 'goal'],
  mandatoryInvariants: [
    'Project name must be a non-empty string',
    'Goal must be explicitly defined',
  ],
} as const;
