export const ARCHITECT_SCHEMA = {
  contractName: 'ArchitectureOutput',
  version: '1.0.0',
  requiredFields: ['modules', 'projectStructure'],
  mandatoryInvariants: [
    'Every project-tree file must have exactly one owner',
    'Every Owned Files entry must exist in the project tree',
    'Every Depends On value must exactly match a declared architecture module',
    'Invalid Next.js dynamic segment [...] is forbidden',
    'Standard Next.js public assets belong in root-level public/',
  ],
} as const;
