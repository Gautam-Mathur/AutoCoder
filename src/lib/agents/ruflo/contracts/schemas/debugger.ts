export const DEBUGGER_SCHEMA = {
  contractName: 'DebuggerOutput',
  version: '1.0.0',
  requiredFields: ['fixes', 'summary'],
  mandatoryInvariants: [
    'Debugger fixes must directly target failing test diagnostics',
    'Debugger must verify fixes via test execution',
  ],
} as const;
