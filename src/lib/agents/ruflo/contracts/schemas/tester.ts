export const TESTER_SCHEMA = {
  contractName: 'TesterOutput',
  version: '1.0.0',
  requiredFields: ['overallStatus', 'totalTests', 'passedTests', 'failedTests'],
  mandatoryInvariants: [
    'Tester must render accurate summary from test verification run',
    'Tester must not mutate its own evidence or test workspace',
  ],
} as const;
