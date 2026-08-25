import { prisma } from '../src/lib/db.js';

async function main() {
  console.log('🧪 Simulating Frontend Conversation Start & /api/pipeline/stream Check...\n');

  // 1. Create a conversation (just like POST /api/conversations)
  const convo = await prisma.conversation.create({
    data: {
      title: 'Test Queen Calling Bug',
      status: 'Idle',
      currentStage: 'Queen',
    },
  });

  console.log(`Created Conversation: id=${convo.id}, status="${convo.status}", stage="${convo.currentStage}"`);

  // 2. Simulate what /api/pipeline/stream did BEFORE our fix:
  console.log('\n--- BEFORE FIX SIMULATION ---');
  const fetchedConvoBefore = await prisma.conversation.findUnique({ where: { id: convo.id } });
  if (fetchedConvoBefore && fetchedConvoBefore.status === 'Active') {
    console.log('✅ Orchestrator WOULD run');
  } else {
    console.log(`❌ Orchestrator WOULD NOT RUN because status is "${fetchedConvoBefore?.status}" (expected "Active")!`);
  }

  // 3. Cleanup
  await prisma.conversation.delete({ where: { id: convo.id } });
}

main().catch(err => {
  console.error('Test error:', err);
});
