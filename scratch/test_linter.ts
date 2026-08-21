import { runLinter, runBracketBalanceCheck } from '../src/lib/agents/ruflo/linter';
import { writeVirtualFile } from '../src/lib/agents/ruflo/vfs';
import { prisma } from '../src/lib/db';

async function runLinterTests() {
  console.log('--- STARTING PROGRAMMATIC LINTER SUITE VERIFICATION ---');
  const testConvoId = 'linter-test-suite-' + Date.now();

  try {
    // Clean pre-existing test data
    await prisma.virtualFile.deleteMany({ where: { conversationId: testConvoId } });

    // 1. Test Synchronous Virtual Module Resolution
    console.log('[TEST 1] Synchronous Virtual Module Resolution (Cross-File)...');
    await writeVirtualFile(
      testConvoId,
      'math.ts',
      'export function add(a: number, b: number): number { return a + b; }'
    );
    await writeVirtualFile(
      testConvoId,
      'app.ts',
      'import { add } from "./math";\nconst sum = add(5, 10);\nconsole.log(sum);'
    );

    const crossFileResult = await runLinter(testConvoId, 'app.ts');
    console.log('  Result summary:', crossFileResult.summary);
    if (!crossFileResult.success) {
      throw new Error(`Cross-file module resolution failed: ${crossFileResult.summary}`);
    }
    console.log('  ✓ Synchronous Virtual Module Resolution passed');

    // 2. Test TypeScript Diagnostic Error Detection
    console.log('[TEST 2] TypeScript Type Mismatch Diagnostic...');
    await writeVirtualFile(
      testConvoId,
      'invalid.ts',
      'const value: number = "this is a string";'
    );
    const diagResult = await runLinter(testConvoId, 'invalid.ts');
    console.log('  Result summary:', diagResult.summary);
    if (diagResult.success || diagResult.errors.length === 0) {
      throw new Error('Type mismatch diagnostic test failed: expected error but got success');
    }
    if (diagResult.errors[0].line !== 1) {
      throw new Error(`Expected error at line 1, got line ${diagResult.errors[0].line}`);
    }
    console.log('  ✓ TypeScript Type Mismatch Diagnostic passed (Line ' + diagResult.errors[0].line + ')');

    // 3. Test Stateful Bracket Balancer (Valid Strings/Comments)
    console.log('[TEST 3] Stateful Bracket Balancer (Valid Embedded Brackets)...');
    const validCodeWithBrackets = `
      // Single line comment with unclosed bracket {
      /* Multi-line comment { ( [ */
      const str1 = "String with unclosed bracket { ( [";
      const str2 = 'Another string } ] )';
      const template = \`Template string { \${1 + 2} }\`;
      function test() {
        return { ok: true };
      }
    `;
    const balanceResultValid = runBracketBalanceCheck(validCodeWithBrackets, 'valid.js');
    console.log('  Valid Balance Result:', balanceResultValid.summary);
    if (!balanceResultValid.success) {
      throw new Error(`Stateful bracket check failed on valid code: ${balanceResultValid.summary}`);
    }
    console.log('  ✓ Stateful Bracket Balancer passed for valid code');

    // 4. Test Stateful Bracket Balancer (Mismatched Bracket)
    console.log('[TEST 4] Stateful Bracket Balancer (Mismatched Closing Bracket)...');
    const invalidCode = 'function broken() { return (1 + 2]; }';
    const balanceResultInvalid = runBracketBalanceCheck(invalidCode, 'invalid.js');
    console.log('  Invalid Balance Result:', balanceResultInvalid.summary);
    if (balanceResultInvalid.success || balanceResultInvalid.errors.length === 0) {
      throw new Error('Expected bracket balance failure for mismatched brackets, but passed');
    }
    console.log('  ✓ Stateful Bracket Balancer correctly caught mismatch');

    // Clean test data
    await prisma.virtualFile.deleteMany({ where: { conversationId: testConvoId } });
    console.log('--- ALL LINTER TESTS PASSED SUCCESSFULLY! ---');
  } catch (err: any) {
    console.error('❌ PROGRAMMATIC LINTER TEST SUITE FAILED:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runLinterTests();
