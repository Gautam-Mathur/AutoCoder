export interface ReviewerOutput {
  summary: string;
  qualityScore: number;
  architecturalConformance: boolean;
  requirementCoverage: boolean;
  workspaceHash: string;
  findings: string[];
}

export const REVIEWER_SCHEMA = {
  contractName: 'ReviewerOutput',
  version: '1.0.0',
  requiredFields: [
    'summary',
    'qualityScore',
    'architecturalConformance',
    'requirementCoverage',
    'workspaceHash',
    'findings',
  ],
  mandatoryInvariants: [
    'Quality score must reflect architectural conformance and requirement coverage',
    'Reviewer JSON output must contain valid workspaceHash matching current project workspace state',
  ],
} as const;

export function parseReviewerOutput(content: string): { output: ReviewerOutput | null; errors: string[] } {
  const errors: string[] = [];
  if (!content || !content.trim()) {
    return { output: null, errors: ['Reviewer output is empty.'] };
  }

  try {
    const parsed = JSON.parse(content);
    if (!parsed || typeof parsed !== 'object') {
      return { output: null, errors: ['Reviewer output is not a valid JSON object.'] };
    }

    if (typeof parsed.summary !== 'string' || !parsed.summary.trim()) {
      errors.push('Reviewer output missing string "summary".');
    }
    if (typeof parsed.qualityScore !== 'number' || parsed.qualityScore < 0 || parsed.qualityScore > 100) {
      errors.push('Reviewer output "qualityScore" must be a number between 0 and 100.');
    }
    if (typeof parsed.architecturalConformance !== 'boolean') {
      errors.push('Reviewer output missing boolean "architecturalConformance".');
    }
    if (typeof parsed.requirementCoverage !== 'boolean') {
      errors.push('Reviewer output missing boolean "requirementCoverage".');
    }
    if (typeof parsed.workspaceHash !== 'string' || !/^[a-f0-9]{64}$/i.test(parsed.workspaceHash)) {
      errors.push('Reviewer output missing valid sha256 hex string "workspaceHash".');
    }
    if (!Array.isArray(parsed.findings)) {
      errors.push('Reviewer output missing array "findings".');
    }

    if (errors.length > 0) {
      return { output: null, errors };
    }

    return {
      output: {
        summary: parsed.summary,
        qualityScore: parsed.qualityScore,
        architecturalConformance: parsed.architecturalConformance,
        requirementCoverage: parsed.requirementCoverage,
        workspaceHash: parsed.workspaceHash,
        findings: parsed.findings.map(String),
      },
      errors: [],
    };
  } catch (err: any) {
    return { output: null, errors: [`Reviewer JSON parse error: ${err.message}`] };
  }
}
