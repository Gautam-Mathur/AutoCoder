export interface TestResult {
  filePath: string;
  success: boolean;
  errors: Array<{ line: number; character: number; message: string }>;
}

export interface ReviewFinding {
  id: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  file?: string;
  description: string;
}

export interface ReviewOutput {
  status: 'PASS' | 'REPAIR_REQUIRED';
  findings: ReviewFinding[];
  summary: string;
}
