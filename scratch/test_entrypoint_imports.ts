import { parseBlueprintFiles } from '../src/lib/agents/ruflo/orchestrator';
import { runLinter } from '../src/lib/agents/ruflo/linter';
import { writeVirtualFile } from '../src/lib/agents/ruflo/vfs';
import { prisma } from '../src/lib/db';

async function main() {
  console.log('=== TESTING FRONTEND ENTRY POINT & IMPORT VALIDATION ENGINE ===\n');

  // 1. Test parseBlueprintFiles entry point injection
  const sampleWebBlueprint = `
### File: style.css
- **Purpose**: Styling rules
- **Dependencies**: None
- **Specs Required**: None
- **Exports**: None
- **Implementation Details**:
  1. Root variables and flexbox body

### File: calculator.js
- **Purpose**: App logic
- **Dependencies**: None
- **Specs Required**: None
- **Exports**: None
- **Implementation Details**:
  1. Add click handlers
  `;

  const sections = parseBlueprintFiles(sampleWebBlueprint);
  console.log(`[1] Parsed Blueprint Sections Count: ${sections.length}`);
  console.log(`- File #1: ${sections[0]?.file} (Purpose: ${sections[0]?.purpose})`);

  if (sections[0]?.file !== 'index.html') {
    throw new Error('Deterministic entry point injection failed: index.html is not File #1!');
  }
  console.log('  ✅ Injected index.html as File #1 successfully.');

  // 2. Test HTML link verification in linter
  const testId = `test_linter_${Date.now()}`;
  try {
    await writeVirtualFile(testId, 'style.css', 'body { margin: 0; }');
    await writeVirtualFile(testId, 'index.html', '<!DOCTYPE html><html><head><link rel="stylesheet" href="style.css"></head><body><script src="missing_script.js"></script></body></html>');

    const lintResult = await runLinter(testId, 'index.html');
    console.log(`\n[2] Linter check on index.html: success=${lintResult.success}`);
    console.log(`- Summary: ${lintResult.summary}`);
    if (lintResult.errors.length > 0) {
      console.log(`- Detected issue: ${lintResult.errors[0].message}`);
    }

    if (lintResult.success) {
      throw new Error('Linter failed to catch unlinked missing_script.js!');
    }
    console.log('  ✅ HTML Link Verifier correctly flagged missing_script.js.');

    console.log('\n✅ FRONTEND ENTRY POINT & IMPORT VALIDATION ENGINE VERIFIED!');
  } finally {
    await prisma.virtualFile.deleteMany({ where: { conversationId: testId } });
  }
}

main().catch(console.error);
