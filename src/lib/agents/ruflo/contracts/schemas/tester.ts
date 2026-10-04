import { countHeading, extractRequiredSection } from '../markdown-sections';

export interface TesterOutput {
  result: 'PASS' | 'FAIL';
  summary: string;
  tests: string;
  failures: string;
  workspaceHash: string;
  verificationRunId: string | null;
}

export const TESTER_SCHEMA = {
  contractName: 'TesterOutput',
  version: '1.0.0',
  requiredFields: ['result', 'summary', 'tests', 'failures', 'workspaceHash'],
  mandatoryInvariants: [
    'Tester must render accurate summary from test verification run',
    'Tester result must be PASS for acceptance',
    'Tester report must include valid Workspace Hash matching current project state',
  ],
} as const;

export function parseTesterOutput(content: string): { output: TesterOutput | null; errors: string[] } {
  const errors: string[] = [];

  if (!content || !content.trim()) {
    return { output: null, errors: ['Test report is empty.'] };
  }

  const requiredSections = ['Result', 'Summary', 'Tests', 'Failures', 'Workspace Hash'];
  for (const s of requiredSections) {
    const count = countHeading(content, `### ${s}`);
    if (count === 0) {
      errors.push(`Tester Contract Error: Missing required section "### ${s}".`);
    } else if (count > 1) {
      errors.push(`Tester Contract Error: Duplicate section "### ${s}".`);
    }
  }

  if (errors.length > 0) {
    return { output: null, errors };
  }

  const resultText = (extractRequiredSection(content, 'Result') || '').trim().toUpperCase();
  if (resultText !== 'PASS' && resultText !== 'FAIL') {
    errors.push(`Tester Contract Error: Invalid Result token "${resultText}". Must be PASS or FAIL.`);
  }

  const hashText = (extractRequiredSection(content, 'Workspace Hash') || '').trim();
  const hashMatch = hashText.match(/([a-f0-9]{64})/i);
  if (!hashMatch) {
    errors.push(`Tester Contract Error: Invalid or missing Workspace Hash in section "### Workspace Hash".`);
  }

  const runIdSec = countHeading(content, '### Verification Run ID') > 0
    ? (extractRequiredSection(content, 'Verification Run ID') || '').trim()
    : null;


  if (errors.length > 0) {
    return { output: null, errors };
  }

  return {
    output: {
      result: resultText as 'PASS' | 'FAIL',
      summary: extractRequiredSection(content, 'Summary') || '',
      tests: extractRequiredSection(content, 'Tests') || '',
      failures: extractRequiredSection(content, 'Failures') || '',
      workspaceHash: hashMatch![1],
      verificationRunId: runIdSec,
    },
    errors: [],
  };
}
