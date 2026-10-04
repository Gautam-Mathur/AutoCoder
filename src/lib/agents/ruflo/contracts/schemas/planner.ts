export const PLANNER_SCHEMA = {
  contractName: 'PlannerOutput',
  version: '1.0.0',
  requiredFields: ['frontendFramework', 'backendFramework', 'databaseType'],
  mandatoryInvariants: [
    'Frontend framework must be valid (Next.js, Vite, etc.)',
    'Backend framework and database provider must be compatible',
  ],
} as const;
