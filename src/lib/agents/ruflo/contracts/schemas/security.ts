export const SECURITY_SCHEMA = {
  contractName: 'SecurityOutput',
  version: '1.0.0',
  requiredFields: ['summary', 'vulnerabilities'],
  mandatoryInvariants: [
    'Security checks must audit authentication, data validation, and secrets',
  ],
} as const;
