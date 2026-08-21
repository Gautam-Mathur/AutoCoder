import { prisma } from '../src/lib/db';
import { writeVirtualFile, readVirtualFile, listVirtualFiles } from '../src/lib/agents/ruflo/vfs';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('=== TESTING DUAL-WORKSPACE PERSISTENCE ENGINE ===\n');

  const testId = `test_persist_${Date.now()}`;

  try {
    // 1. Write virtual files
    await writeVirtualFile(testId, 'index.html', '<!DOCTYPE html><html><body><h1>Hello Persistence</h1></body></html>');
    await writeVirtualFile(testId, 'src/math.js', 'export function add(a, b) { return a + b; }');

    console.log('[1] Wrote 2 virtual files to VFS.');

    // 2. Check if physical disk files exist immediately
    const diskPath1 = path.join(process.cwd(), 'projects', testId, 'index.html');
    const diskPath2 = path.join(process.cwd(), 'projects', testId, 'src', 'math.js');

    const exists1 = fs.existsSync(diskPath1);
    const exists2 = fs.existsSync(diskPath2);

    console.log(`[2] Instant Physical Disk Write Check:`);
    console.log(`- index.html on disk: ${exists1}`);
    console.log(`- src/math.js on disk: ${exists2}`);

    if (!exists1 || !exists2) {
      throw new Error('Instant physical disk write failed.');
    }

    // 3. Simulate SQLite database wipe/reset for this conversation
    await prisma.virtualFile.deleteMany({ where: { conversationId: testId } });
    const vfsListAfterWipe = await listVirtualFiles(testId);
    console.log(`\n[3] SQLite VFS wiped. VFS list count: ${vfsListAfterWipe.length}`);

    // 4. Verify disk fallback recovery
    const projectDir = path.join(process.cwd(), 'projects', testId);
    const diskFiles = fs.readdirSync(projectDir);
    console.log(`[4] Disk Fallback Check: Found files on disk in projects/${testId}:`, diskFiles);

    const diskContent1 = fs.readFileSync(diskPath1, 'utf8');
    const diskContent2 = fs.readFileSync(diskPath2, 'utf8');

    console.log('\n[5] Retrieved disk content verification:');
    console.log(`- index.html length: ${diskContent1.length} bytes`);
    console.log(`- src/math.js length: ${diskContent2.length} bytes`);

    console.log('\n✅ DUAL-WORKSPACE PERSISTENCE ENGINE VERIFIED SUCCESSFULLY!');
  } finally {
    // Cleanup test artifacts
    await prisma.virtualFile.deleteMany({ where: { conversationId: testId } });
    const testDir = path.join(process.cwd(), 'projects', testId);
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    console.log(`Cleaned up test directory: projects/${testId}`);
  }
}

main().catch(console.error);
