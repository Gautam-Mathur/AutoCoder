export const REVIEWER_SCHEMA = {
  contractName: 'ReviewerOutput',
  version: '1.0.0',
  requiredFields: ['summary', 'qualityScore'],
  mandatoryInvariants: [
    'Quality score must reflect architectural conformance and requirement coverage',
  ],
} as const;
