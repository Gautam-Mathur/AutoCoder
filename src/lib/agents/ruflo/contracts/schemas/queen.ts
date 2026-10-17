import { CONTRACT_VERSIONS } from '../versions';

export const QUEEN_SCHEMA = {
  contractName: CONTRACT_VERSIONS.Queen.name,
  version: CONTRACT_VERSIONS.Queen.version,
  format: CONTRACT_VERSIONS.Queen.format,
  requiredSections: CONTRACT_VERSIONS.Queen.requiredHeadings,
  requiredFields: ['projectName', 'projectGoal', 'mvpScope', 'technicalConstraints', 'risks'],
  mandatoryInvariants: [
    'Project name must be a non-empty string',
    'Project goal, MVP scope, technical constraints, and risks must be explicitly defined',
  ],
} as const;
