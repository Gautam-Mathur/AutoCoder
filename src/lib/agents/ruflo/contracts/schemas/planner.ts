import { CONTRACT_VERSIONS } from '../versions';

export const PLANNER_SCHEMA = {
  contractName: CONTRACT_VERSIONS.Planner.name,
  version: CONTRACT_VERSIONS.Planner.version,
  format: CONTRACT_VERSIONS.Planner.format,
  requiredSections: CONTRACT_VERSIONS.Planner.requiredHeadings,
  requiredFields: ['features', 'functionalRequirements', 'acceptanceCriteria'],
  mandatoryInvariants: [
    'Every feature must have a stable Feature-NNN identifier and priority',
    'Functional requirements and acceptance criteria must trace to declared features',
  ],
} as const;
