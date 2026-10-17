import { CONTRACT_VERSIONS } from '../versions';

export const ARCHITECT_SCHEMA = {
  contractName: CONTRACT_VERSIONS.Architect.name,
  version: CONTRACT_VERSIONS.Architect.version,
  format: CONTRACT_VERSIONS.Architect.format,
  requiredSections: CONTRACT_VERSIONS.Architect.requiredHeadings,
  requiredFields: ['techStack', 'treeFiles', 'projectFiles', 'modules', 'conventions'],
  mandatoryInvariants: [
    'Every implementation/framework-managed file must have exactly one module owner',
    'Every Owned Files entry must exist in Project Folder Structure and Project Files',
    'Every Depends On value must match a declared architecture module without cycles',
    'Invalid Next.js dynamic segment [...] is forbidden',
    'Standard Next.js public assets belong in root-level public/',
  ],
} as const;
