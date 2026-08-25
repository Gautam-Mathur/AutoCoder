import { parseBlueprintFiles, sanitizeStageOutput } from '../src/lib/agents/ruflo/orchestrator.js';
import { runLinter } from '../src/lib/agents/ruflo/linter.js';
import { cleanJsonResponse } from '../src/lib/agents/inference.js';
import { writeVirtualFile } from '../src/lib/agents/ruflo/vfs.js';
import { prisma } from '../src/lib/db.js';

async function main() {
  console.log('🧪 Running Comprehensive Pipeline Resilience & RCA Verification...\n');

  // 1. Test Blueprint Header Path Cleaning
  const mockBlueprint = `
### File: **index.html**
- **Purpose**: Web entry
- **Dependencies**: None
- **Specs Required**: None
- **Exports**: None
- **Implementation Details**:
  1. DOCTYPE html

### File: \`src/app.js\`
- **Purpose**: App logic
- **Dependencies**: None
- **Specs Required**: None
- **Exports**: None
- **Implementation Details**:
  1. Logic

### File: /api/server.js (Node Backend)
- **Purpose**: API backend
- **Dependencies**: None
- **Specs Required**: None
- **Exports**: None
- **Implementation Details**:
  1. Express server
`;

  const parsedSections = parseBlueprintFiles(mockBlueprint);
  console.log('1. Blueprint Path Cleaning Test:');
  parsedSections.forEach(s => console.log(`  • Cleaned Path: "${s.file}"`));

  if (parsedSections[0].file !== 'index.html' || parsedSections[1].file !== 'src/app.js' || parsedSections[2].file !== 'api/server.js') {
    throw new Error('Blueprint path cleaning failed!');
  }
  console.log('  ✓ Blueprint headers successfully cleaned of markdown, leading slashes, and parenthetical text!\n');

  // 2. Test Outer-Only Fence Sanitizer
  const codeWithInnerBackticks = "```javascript\nconst tpl = `Hello ${name}`;\nconsole.log(tpl);\n```";
  const cleanedCode = sanitizeStageOutput(codeWithInnerBackticks);
  console.log('2. Code Sanitizer Test:');
  console.log(`  Raw: ${JSON.stringify(codeWithInnerBackticks)}`);
  console.log(`  Cleaned: ${JSON.stringify(cleanedCode)}`);
  if (cleanedCode !== "const tpl = `Hello ${name}`;\nconsole.log(tpl);") {
    throw new Error('Code sanitizer corrupted inner backticks!');
  }
  console.log('  ✓ Outer code fences stripped while inner template literals preserved cleanly!\n');

  // 3. Test JSON Response Cleaner
  const rawJsonResp = "```json\n{\n  \"action\": \"RETRY\",\n  \"targetFile\": \"app.js\"\n}\n```";
  const cleanJson = cleanJsonResponse(rawJsonResp);
  console.log('3. JSON Response Cleaner Test:');
  const parsedObj = JSON.parse(cleanJson);
  console.log(`  Parsed Action: ${parsedObj.action}, Target: ${parsedObj.targetFile}`);
  if (parsedObj.action !== 'RETRY' || parsedObj.targetFile !== 'app.js') {
    throw new Error('JSON response cleaner failed!');
  }
  console.log('  ✓ Markdown fences successfully stripped from JSON response!\n');

  // 4. Test JS AST Linter Syntax Diagnostics
  const testConvoId = `rca-test-${Date.now()}`;
  await prisma.conversation.create({
    data: {
      id: testConvoId,
      title: 'RCA Linter Verification',
      status: 'Active',
      currentStage: 'Coder',
    },
  });

  // Write valid JS file with external module import
  await writeVirtualFile(testConvoId, 'valid.js', `import express from 'express';\nconst app = express();\nexport default app;`);
  const validRes = await runLinter(testConvoId, 'valid.js');
  console.log('4. JS AST Linter Verification:');
  console.log(`  • valid.js Result: Success = ${validRes.success} (${validRes.summary})`);
  if (!validRes.success) {
    throw new Error('Linter failed on valid JS file with external imports!');
  }

  // Write truncated / broken JS file (like empirical truncated function cutoff)
  await writeVirtualFile(testConvoId, 'broken.js', `import { PrismaClient } from '@prisma/client';\nconst prisma = new PrismaClient();\nexport default function handler(req, res) {`);
  const brokenRes = await runLinter(testConvoId, 'broken.js');
  console.log(`  • broken.js Result: Success = ${brokenRes.success} (${brokenRes.summary})`);
  if (brokenRes.success) {
    throw new Error('Linter failed to detect truncated JS syntax error!');
  }
  console.log('  ✓ JS AST linter correctly caught truncated JavaScript syntax error!\n');

  // Cleanup test conversation
  await prisma.conversation.delete({ where: { id: testConvoId } });
  console.log('🎉 ALL PIPELINE RESILIENCE & RCA VERIFICATIONS PASSED SUCCESSFULLY!');
}

main().catch(err => {
  console.error('❌ Verification Failed:', err);
  process.exit(1);
});
