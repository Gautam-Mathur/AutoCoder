import fs from 'fs';
import path from 'path';

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

main().catch(console.error);
