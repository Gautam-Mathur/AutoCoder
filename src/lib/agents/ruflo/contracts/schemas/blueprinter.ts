import { CONTRACT_VERSIONS } from '../versions';

export const BLUEPRINTER_SCHEMA = {
  contractName: CONTRACT_VERSIONS.Blueprinter.name,
  version: CONTRACT_VERSIONS.Blueprinter.version,
  format: CONTRACT_VERSIONS.Blueprinter.format,
  requiredSections: CONTRACT_VERSIONS.Blueprinter.requiredHeadings,
  requiredFields: ['files'],
  mandatoryInvariants: [
    'Blueprints must cover all implementation files owned by modules in architecture.md',
    'Each ### File: section must declare Owner Module matching architecture.md ownership',
  ],
} as const;
