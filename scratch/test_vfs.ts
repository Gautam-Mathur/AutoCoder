import { 
  writeVirtualFile, 
  readVirtualFile, 
  listVirtualFiles, 
  applyDiff, 
  sanitizePath 
} from '../src/lib/agents/ruflo/vfs';
import { prisma } from '../src/lib/db';

async function runVFSTests() {
  console.log('--- STARTING VFS SUITE VERIFICATION ---');
  const testConvoId = 'vfs-test-suite-' + Date.now();

  try {
    // 1. Clean up any pre-existing test records
    await prisma.virtualFile.deleteMany({ where: { conversationId: testConvoId } });

    // 2. Test Basic Write and Read
    console.log('[TEST 1] Write and Read VirtualFile...');
    await writeVirtualFile(testConvoId, 'src/index.ts', 'console.log("hello vfs");');
    const content = await readVirtualFile(testConvoId, 'src/index.ts');
    if (content !== 'console.log("hello vfs");') {
      throw new Error(`Write/Read Mismatch: expected 'console.log("hello vfs");', got '${content}'`);
    }
    console.log('  ✓ Basic Write and Read passed');

    // 3. Test List Files
    console.log('[TEST 2] List VirtualFiles...');
    await writeVirtualFile(testConvoId, 'package.json', '{"name": "vfs-app"}');
    await writeVirtualFile(testConvoId, 'README.md', '# VFS App');
    const files = await listVirtualFiles(testConvoId);
    console.log('  Files list:', files);
    if (files.length !== 3 || !files.includes('src/index.ts') || !files.includes('package.json') || !files.includes('README.md')) {
      throw new Error('List files mismatch');
    }
    console.log('  ✓ List VirtualFiles passed');

    // 4. Test Append Line (startLine = lines.length + 1)
    console.log('[TEST 3] Line Append via applyDiff...');
    // Existing content has 1 line: 'console.log("hello vfs");'
    await applyDiff(testConvoId, 'src/index.ts', 2, 2, 'console.log("appended line");');
    const appendedContent = await readVirtualFile(testConvoId, 'src/index.ts');
    console.log('  Appended Content:\n' + appendedContent);
    const expectedAppended = 'console.log("hello vfs");\nconsole.log("appended line");';
    if (appendedContent !== expectedAppended) {
      throw new Error(`Append Mismatch:\nExpected:\n${expectedAppended}\nGot:\n${appendedContent}`);
    }
    console.log('  ✓ Line Append passed');

    // 5. Test Race Condition (5 Concurrent applyDiff Calls)
    console.log('[TEST 4] Race Condition Check (5 Concurrent Writes)...');
    await writeVirtualFile(testConvoId, 'counter.txt', 'Line 0');
    // We trigger 5 concurrent applyDiff calls appending new lines
    const concurrentPushes = Array.from({ length: 5 }, (_, i) => 
      applyDiff(testConvoId, 'counter.txt', i + 2, i + 2, `Line ${i + 1}`)
    );
    await Promise.all(concurrentPushes);
    const finalCounter = await readVirtualFile(testConvoId, 'counter.txt');
    console.log('  Final Counter Content:\n' + finalCounter);
    const counterLines = (finalCounter || '').split('\n');
    if (counterLines.length !== 6) {
      throw new Error(`Race condition test failed: expected 6 lines, got ${counterLines.length}`);
    }
    console.log('  ✓ Race Condition check passed');

    // 6. Test Security Path Traversal Protection
    console.log('[TEST 5] Path Traversal Protection...');
    const dangerousPaths = ['../etc/passwd', '/absolute/path', 'src/../../secret.txt', ''];
    let rejectedCount = 0;
    for (const dp of dangerousPaths) {
      try {
        sanitizePath(dp);
      } catch (err: any) {
        if (err.message.includes('Security Exception')) {
          rejectedCount++;
        }
      }
    }
    if (rejectedCount !== dangerousPaths.length) {
      throw new Error(`Security Test Failed: expected ${dangerousPaths.length} rejections, got ${rejectedCount}`);
    }
    console.log('  ✓ Path Traversal Protection passed');

    // Cleanup
    await prisma.virtualFile.deleteMany({ where: { conversationId: testConvoId } });
    console.log('--- ALL VFS TESTS PASSED SUCCESSFULLY! ---');
  } catch (error: any) {
    console.error('❌ VFS TEST SUITE FAILED:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runVFSTests();
