export const CODER_SCHEMA = {
  contractName: 'CoderOutput',
  version: '1.0.0',
  requiredFields: ['filePath', 'content'],
  mandatoryInvariants: [
    'Generated files must parse cleanly and contain valid syntax',
    'No placeholder comments or incomplete implementations allowed',
  ],
} as const;
