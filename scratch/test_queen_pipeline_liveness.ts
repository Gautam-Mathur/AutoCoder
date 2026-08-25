import { prisma } from '../src/lib/db.js';
import { GET as streamGET } from '../src/app/api/pipeline/stream/route.js';
import { NextRequest } from 'next/server';

async function main() {
  console.log('🧪 Verifying Queen Pipeline Liveness & Automatic Status Update Fix...\n');

  // 1. Create a conversation with status 'Idle' (simulating user project creation)
  const testId = `queen-live-${Date.now()}`;
  const convo = await prisma.conversation.create({
    data: {
      id: testId,
      title: 'Queen Liveness Verification',
      status: 'Idle',
      currentStage: 'Queen',
    },
  });

  console.log(`Created new conversation: ID="${convo.id}", Initial Status="${convo.status}"`);

  // 2. Simulate GET request to /api/pipeline/stream?conversationId=...
  const req = new NextRequest(`http://localhost:3000/api/pipeline/stream?conversationId=${testId}&prompt=Build+a+web+app`);

  console.log('Connecting to /api/pipeline/stream endpoint...');
  const res = await streamGET(req);
  console.log(`Stream Response status: ${res.status}, content-type: ${res.headers.get('content-type')}`);

  // Give background orchestrator 2 seconds to initialize Queen
  await new Promise(r => setTimeout(r, 2500));

  // 3. Verify SQLite Conversation Status & History Logs
  const updatedConvo = await prisma.conversation.findUnique({ where: { id: testId } });
  console.log(`Updated Conversation Status in DB: "${updatedConvo?.status}"`);

  const historyLogs = await prisma.executionHistory.findMany({
    where: { conversationId: testId },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`History Logs recorded: ${historyLogs.length}`);
  historyLogs.forEach(h => console.log(`  [${h.stage}] ${h.status}: ${h.logs}`));

  if (updatedConvo?.status !== 'Active') {
    throw new Error('Conversation status failed to update to Active!');
  }

  console.log('\n✅ VERIFICATION SUCCESSFUL: Queen stage initialized and conversation set to Active automatically!');

  // Cleanup
  await prisma.conversation.delete({ where: { id: testId } }).catch(() => {});
}

main().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
