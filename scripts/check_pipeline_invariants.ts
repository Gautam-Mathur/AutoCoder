import fs from 'fs';
import path from 'path';
import { STAGE_CONTRACTS } from '../src/lib/agents/ruflo/contracts/registry';
import { CONTRACT_VERSIONS } from '../src/lib/agents/ruflo/contracts/versions';

const FORBIDDEN_PATTERNS = [
  {
    name: 'Raw status check bypassing StageExecution',
    pattern: /status:\s*['"]Completed['"]/,
    description: 'Use StageExecution state instead of Conversation/ExecutionHistory status for completed checks.',
  },
  {
    name: 'Unsafe direct path suffix matching',
    pattern: /endsWith\(['"]\/['"]\s*\+/,
    description: 'Use normalizeWorkspacePath() instead of raw path endsWith checks.',
  },
];

function scanDirectory(dir: string, results: Array<{ file: string; line: number; match: string; description: string }>) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next' && entry.name !== '__tests__') {
        scanDirectory(fullPath, results);
      }
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');

      lines.forEach((lineText, index) => {
        // Skip comment lines or check_pipeline_invariants itself
        if (fullPath.includes('check_pipeline_invariants.ts')) return;
        if (lineText.trim().startsWith('//') || lineText.trim().startsWith('*')) return;

        for (const rule of FORBIDDEN_PATTERNS) {
          if (rule.pattern.test(lineText)) {
            results.push({
              file: fullPath,
              line: index + 1,
              match: lineText.trim(),
              description: rule.description,
            });
          }
        }
      });
    }
  }
}

async function main() {
  console.log('🔍 Running Pipeline Invariant Static Code Scanner...\n');
  const results: Array<{ file: string; line: number; match: string; description: string }> = [];

  const targetDir = path.join(process.cwd(), 'src', 'lib', 'agents', 'ruflo');
  scanDirectory(targetDir, results);

  console.log(`Scan completed across ${targetDir}.`);

  // Verify Stage Contract Registry Invariants
  console.log('\n🔍 Verifying Stage Contract Graph & Filename Invariants...');
  const canonicalFilenames: Record<string, string> = {
    Queen: 'plan.md',
    Planner: 'requirements.md',
    Architect: 'architecture.md',
    System: 'backend_spec.md',
    Designer: 'ui_spec.md',
    Blueprinter: 'blueprint.md',
    Coder: 'workspace.manifest.json',
    Tester: 'test_report.md',
    Debugger: 'debug_report.md',
    Security: 'security_report.md',
    Reviewer: 'review_report.md',
  };

  const producers = new Map<string, string>();
  for (const [stage, contract] of Object.entries(STAGE_CONTRACTS)) {
    const expectedFile = canonicalFilenames[stage];
    if (contract.outputArtifact.name !== expectedFile) {
      console.error(`❌ Invariant Error: Stage ${stage} output artifact name '${contract.outputArtifact.name}' != canonical '${expectedFile}'`);
      process.exit(1);
    }
    producers.set(contract.outputArtifact.name, stage);
  }

  // Verify all input artifacts have a valid producer
  for (const [stage, contract] of Object.entries(STAGE_CONTRACTS)) {
    for (const input of contract.inputArtifacts) {
      if (!producers.has(input.name)) {
        console.error(`❌ Invariant Error: Stage ${stage} requires '${input.name}' which has no registered producer stage.`);
        process.exit(1);
      }
    }
  }

  console.log('✅ Stage Contract Graph & Filename Invariants verified successfully!');

  if (results.length === 0) {
    console.log('✅ No invariant violations found!');
  } else {
    console.log(`\n⚠️ Found ${results.length} potential invariant warning(s):\n`);
    for (const res of results) {
      console.log(`- ${path.relative(process.cwd(), res.file)}:${res.line}`);
      console.log(`  Match: "${res.match}"`);
      console.log(`  Rule:  ${res.description}\n`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

