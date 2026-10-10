import { countHeading, extractRequiredSection } from '../markdown-sections';

export interface DebuggerOutput {
  issuesAddressed: string;
  patchesApplied: string;
  verification: string;
}

export const DEBUGGER_SCHEMA = {
  contractName: 'DebuggerOutput',
  version: '1.2.0',
  requiredFields: ['issuesAddressed', 'patchesApplied', 'verification'],
  mandatoryInvariants: [
    'Debugger fixes must directly target failing test diagnostics',
    'Debugger must verify fixes via test execution',
    'Debugger patches must only target authorized non-control plane project files',
  ],
} as const;

export function parseDebuggerOutput(content: string): { output: DebuggerOutput | null; errors: string[] } {
  const errors: string[] = [];

  if (!content || !content.trim()) {
    return { output: null, errors: ['Debugger report is empty.'] };
  }

  const requiredSections = ['Issues Addressed', 'Patches Applied', 'Verification'];
  for (const s of requiredSections) {
    const count = countHeading(content, `### ${s}`);
    if (count === 0) {
      errors.push(`Debugger Contract Error: Missing required section "### ${s}".`);
    } else if (count > 1) {
      errors.push(`Debugger Contract Error: Duplicate section "### ${s}".`);
    }
  }

  if (errors.length > 0) {
    return { output: null, errors };
  }

  const issuesAddressed = extractRequiredSection(content, 'Issues Addressed')?.trim() || '';
  const patchesApplied = extractRequiredSection(content, 'Patches Applied')?.trim() || '';
  const verification = extractRequiredSection(content, 'Verification')?.trim() || '';

  if (!issuesAddressed) {
    errors.push('Debugger Contract Error: Section "### Issues Addressed" cannot be empty.');
  }

  if (!patchesApplied) {
    errors.push('Debugger Contract Error: Section "### Patches Applied" cannot be empty.');
  }

  if (!verification) {
    errors.push('Debugger Contract Error: Section "### Verification" cannot be empty.');
  }

  if (errors.length > 0) {
    return { output: null, errors };
  }

  return {
    output: {
      issuesAddressed,
      patchesApplied,
      verification,
    },
    errors: [],
  };
}
