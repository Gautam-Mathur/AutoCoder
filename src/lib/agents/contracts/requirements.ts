export interface Requirement {
  id: string; // e.g. "REQ-001"
  title: string;
  category: 'Functional' | 'Security' | 'Performance' | 'UI' | 'Data';
  description: string;
  priority: 'P0' | 'P1' | 'P2';
  acceptanceCriteria: string[];
}

export interface RequirementTrace {
  requirementId: string;
  implementedInFiles: string[];
  testedInFiles: string[];
  verifiedStatus: 'PENDING' | 'PASSED' | 'FAILED';
}
