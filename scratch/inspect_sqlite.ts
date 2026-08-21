import { prisma } from '../src/lib/db';

async function inspectSQLite(conversationId?: string) {
  console.log('=== AUTOGOD SQLITE DATABASE INSPECTOR ===\n');

  if (!conversationId) {
    const latestConvo = await prisma.conversation.findFirst({
      orderBy: { updatedAt: 'desc' },
    });
    if (!latestConvo) {
      console.log('No conversations found in SQLite.');
      return;
    }
    conversationId = latestConvo.id;
  }

  const convo = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      queenOutput: true,
      plannerOutput: true,
      architectOutput: true,
      systemOutput: true,
      designerOutput: true,
      blueprinterOutput: true,
      testerOutput: true,
      debuggerOutput: true,
      reviewerOutput: true,
      securityOutput: true,
      history: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });

  if (!convo) {
    console.log(`Conversation ${conversationId} not found.`);
    return;
  }

  console.log(`📌 Conversation ID: ${convo.id}`);
  console.log(`📝 Title: "${convo.title}"`);
  console.log(`⚡ Status: ${convo.status} | Current Stage: ${convo.currentStage}`);
  console.log(`📅 Updated At: ${convo.updatedAt.toISOString()}\n`);

  console.log('=== 1. COMPLETED STAGE OUTFLOWS STORED ===');
  console.log(`- Queen Output:       ${convo.queenOutput ? '✅ STORED (' + (convo.queenOutput.projectName || '') + ')' : '❌ None'}`);
  console.log(`- Planner Output:     ${convo.plannerOutput ? '✅ STORED (' + (convo.plannerOutput.frontendFramework || '') + ' + ' + (convo.plannerOutput.databaseType || '') + ')' : '❌ None'}`);
  console.log(`- Architect Output:   ${convo.architectOutput ? '✅ STORED (' + (convo.architectOutput.architectureStyle || '') + ')' : '❌ None'}`);
  console.log(`- System Output:      ${convo.systemOutput ? '✅ STORED (' + (convo.systemOutput.databaseType || '') + ')' : '❌ None'}`);
  console.log(`- Designer Output:    ${convo.designerOutput ? '✅ STORED (' + (convo.designerOutput.designStyle || '') + ')' : '❌ None'}`);
  console.log(`- Blueprinter Output: ${convo.blueprinterOutput ? '✅ STORED (' + (convo.blueprinterOutput.status || '') + ')' : '❌ None'}`);
  console.log(`- Tester Output:      ${convo.testerOutput ? '✅ STORED' : '❌ None'}`);
  console.log(`- Debugger Output:    ${convo.debuggerOutput ? '✅ STORED' : '❌ None'}`);
  console.log(`- Reviewer Output:    ${convo.reviewerOutput ? '✅ STORED' : '❌ None'}`);
  console.log(`- Security Output:    ${convo.securityOutput ? '✅ STORED' : '❌ None'}`);

  const vfsFiles = await prisma.virtualFile.findMany({
    where: { conversationId },
    select: { filePath: true, content: true },
  });

  console.log(`\n=== 2. VIRTUAL FILE SYSTEM (VFS) FILES STORED (${vfsFiles.length} files) ===`);
  for (const file of vfsFiles) {
    console.log(`- 📄 ${file.filePath} (${file.content.length} bytes)`);
  }

  console.log('\n=== 3. RECENT EXECUTION HISTORY LOGS (Last 5) ===');
  for (const h of convo.history.slice(0, 5)) {
    console.log(`- [${h.createdAt.toISOString()}] Stage: ${h.stage.padEnd(12)} | Status: ${h.status.padEnd(10)} | ${h.logs.substring(0, 90)}...`);
  }
}

const targetConvo = process.argv[2];
inspectSQLite(targetConvo).catch(console.error);
