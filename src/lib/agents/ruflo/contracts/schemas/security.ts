import { countHeading, extractRequiredSection } from '../markdown-sections';

export type SecurityStatusToken =
  | 'SECURE'
  | 'SECURE_WITH_WARNINGS'
  | 'VULNERABLE'
  | 'CRITICAL';

export interface SecurityOutput {
  status: SecurityStatusToken;
  securityScore: number;
  vulnerabilities: string;
  checksPerformed: string;
  recommendations: string;
  workspaceHash: string;
}

export const SECURITY_SCHEMA = {
  contractName: 'SecurityOutput',
  version: '1.2.0',
  requiredFields: [
    'status',
    'securityScore',
    'vulnerabilities',
    'checksPerformed',
    'recommendations',
    'workspaceHash',
  ],
  mandatoryInvariants: [
    'Security checks must audit authentication, data validation, and secrets',
    'Status must explicitly be SECURE, SECURE_WITH_WARNINGS, VULNERABLE, or CRITICAL',
    'Security Score must be an integer between 0 and 100',
    'Security report must contain valid Workspace Hash matching current project state',
  ],
} as const;

export function parseSecurityOutput(content: string): { output: SecurityOutput | null; errors: string[] } {
  const errors: string[] = [];

  if (!content || !content.trim()) {
    return { output: null, errors: ['Security report is empty.'] };
  }

  const requiredSections = [
    'Overall Status',
    'Security Score',
    'Vulnerabilities Found',
    'Security Checks Performed',
    'Recommendations',
    'Workspace Hash',
  ];

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

  // 1. Overall Status
  const statusText = (extractRequiredSection(content, 'Overall Status') || '').trim();
  const upperStatus = statusText.toUpperCase();
  let statusToken: SecurityStatusToken | null = null;

  if (upperStatus.startsWith('SECURE_WITH_WARNINGS') || upperStatus === 'SECURE_WITH_WARNINGS') {
    statusToken = 'SECURE_WITH_WARNINGS';
  } else if (upperStatus.startsWith('SECURE') || upperStatus === 'SECURE') {
    statusToken = 'SECURE';
  } else if (upperStatus.startsWith('VULNERABLE') || upperStatus === 'VULNERABLE') {
    statusToken = 'VULNERABLE';
  } else if (upperStatus.startsWith('CRITICAL') || upperStatus === 'CRITICAL') {
    statusToken = 'CRITICAL';
  } else {
    errors.push(`Security Contract Error: Invalid Security Status token "${statusText}". Must be SECURE, SECURE_WITH_WARNINGS, VULNERABLE, or CRITICAL.`);
  }

  // 2. Security Score
  const scoreText = (extractRequiredSection(content, 'Security Score') || '').trim();
  const scoreMatch = scoreText.match(/(-?\d+)/);
  let securityScore = -1;
  if (!scoreMatch || isNaN(Number(scoreMatch[1]))) {
    errors.push(`Security Contract Error: Section "### Security Score" must contain an integer between 0 and 100, got: "${scoreText}".`);
  } else {
    securityScore = parseInt(scoreMatch[1], 10);
    if (isNaN(securityScore) || securityScore < 0 || securityScore > 100) {
      errors.push(`Security Contract Error: Security Score must be between 0 and 100, got: ${securityScore}.`);
    }
  }

  // 3. Vulnerabilities Found
  const vulnerabilities = (extractRequiredSection(content, 'Vulnerabilities Found') || '').trim();
  if (!vulnerabilities) {
    errors.push('Security Contract Error: Section "### Vulnerabilities Found" cannot be empty.');
  }

  // 4. Security Checks Performed
  const checksPerformed = (extractRequiredSection(content, 'Security Checks Performed') || '').trim();
  if (!checksPerformed) {
    errors.push('Security Contract Error: Section "### Security Checks Performed" cannot be empty.');
  }

  // 5. Recommendations
  const recommendations = (extractRequiredSection(content, 'Recommendations') || '').trim();
  if (!recommendations) {
    errors.push('Security Contract Error: Section "### Recommendations" cannot be empty.');
  }

  // 6. Workspace Hash
  const hashText = (extractRequiredSection(content, 'Workspace Hash') || '').trim();
  const hashMatch = hashText.match(/([a-f0-9]{64})/i);
  if (!hashMatch) {
    errors.push('Security Contract Error: Section "### Workspace Hash" must contain a valid 64-character SHA-256 hex string.');
  }
  const workspaceHash = hashMatch ? hashMatch[1].toLowerCase() : '';

  if (errors.length > 0) {
    return { output: null, errors };
  }

  return {
    output: {
      status: statusToken!,
      securityScore,
      vulnerabilities,
      checksPerformed,
      recommendations,
      workspaceHash,
    },
    errors: [],
  };
}
