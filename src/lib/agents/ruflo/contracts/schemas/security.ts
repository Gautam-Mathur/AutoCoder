import { countHeading, extractRequiredSection } from '../markdown-sections';

export type SecurityStatusToken = 'SECURE' | 'SECURE_WITH_WARNINGS';

export interface SecurityOutput {
  status: SecurityStatusToken;
  vulnerabilities: string;
  recommendations: string;
  workspaceHash: string;
}

export const SECURITY_SCHEMA = {
  contractName: 'SecurityOutput',
  version: '1.0.0',
  requiredFields: ['status', 'vulnerabilities', 'recommendations', 'workspaceHash'],
  mandatoryInvariants: [
    'Security checks must audit authentication, data validation, and secrets',
    'Status must explicitly be SECURE or SECURE_WITH_WARNINGS',
    'Security report must contain valid Workspace Hash matching current project state',
  ],
} as const;

export function parseSecurityOutput(content: string): { output: SecurityOutput | null; errors: string[] } {
  const errors: string[] = [];

  if (!content || !content.trim()) {
    return { output: null, errors: ['Security report is empty.'] };
  }

  const requiredSections = ['Status', 'Vulnerabilities', 'Recommendations', 'Workspace Hash'];
  for (const s of requiredSections) {
    const count = countHeading(content, `### ${s}`);
    if (count === 0) {

      errors.push(`Security Contract Error: Missing required section "### ${s}".`);
    } else if (count > 1) {
      errors.push(`Security Contract Error: Duplicate section "### ${s}".`);
    }
  }

  if (errors.length > 0) {
    return { output: null, errors };
  }

  const statusText = (extractRequiredSection(content, 'Status') || '').trim();
  const token = statusText.toUpperCase();

  if (token.includes('NOT SECURE') || token.includes('VULNERABLE') || token.includes('CRITICAL') || token.includes('FAIL')) {
    errors.push(`Security Contract Error: Security status indicates vulnerabilities or failure: "${statusText}".`);
  } else if (!token.includes('SECURE')) {
    errors.push(`Security Contract Error: Invalid Security Status token "${statusText}". Must be SECURE or SECURE_WITH_WARNINGS.`);
  }

  const statusToken: SecurityStatusToken = token.includes('WARNING')
    ? 'SECURE_WITH_WARNINGS'
    : 'SECURE';

  const hashText = (extractRequiredSection(content, 'Workspace Hash') || '').trim();
  const hashMatch = hashText.match(/([a-f0-9]{64})/i);
  if (!hashMatch) {
    errors.push(`Security Contract Error: Invalid or missing Workspace Hash in section "### Workspace Hash".`);
  }

  if (errors.length > 0) {
    return { output: null, errors };
  }

  return {
    output: {
      status: statusToken,
      vulnerabilities: extractRequiredSection(content, 'Vulnerabilities') || '',
      recommendations: extractRequiredSection(content, 'Recommendations') || '',
      workspaceHash: hashMatch![1],
    },
    errors: [],
  };
}
