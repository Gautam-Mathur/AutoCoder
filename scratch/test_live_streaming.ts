import { runOrchestrator } from '../src/lib/agents/ruflo/orchestrator';
import { prisma } from '../src/lib/db';

async function testLiveStreaming() {
  console.log('=== TESTING LIVE TELEMETRY TEXT STREAMING ===\n');

  const convo = await prisma.conversation.create({
    data: {
      title: 'Streaming Test Convo',
      status: 'Active',
      currentStage: 'Queen',
    },
  });

  let streamChunkCount = 0;
  const onEvent = (evt: any) => {
    if (evt.type === 'AGENT_STREAM_PROGRESS') {
      streamChunkCount++;
      const textPreview = evt.data.latestText.replace(/\n/g, ' ').substring(0, 60);
      console.log(`⚡ [STREAM CHUNK #${streamChunkCount}] ${evt.data.tokenCount}/${evt.data.maxTokens} tkns | Text: "${textPreview}..."`);
    } else {
      console.log(`📌 [EVENT]: [${evt.type}] ${evt.message}`);
    }
  };

  try {
    console.log(`Launching test runOrchestrator for convo ${convo.id}...`);
    await runOrchestrator(convo.id, 'Create a fast REST API in Node.js', onEvent);
    console.log(`\n🎉 Completed! Stream chunks received: ${streamChunkCount}`);
  } finally {
    await prisma.conversation.delete({ where: { id: convo.id } }).catch(() => {});
  }
}

testLiveStreaming().catch(console.error);
