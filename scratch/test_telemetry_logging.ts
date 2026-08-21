import { prisma } from '../src/lib/db';
import { runAgent, writeHistoryLog } from '../src/lib/agents/ruflo/orchestrator';

async function main() {
  console.log('=== TESTING TELEMETRY LOGGING SYSTEM ===\n');

  // 1. Create a dummy conversation
  const testConvo = await prisma.conversation.create({
    data: {
      title: 'Telemetry Integration Test',
      status: 'Active',
      currentStage: 'Queen',
    },
  });
  console.log(`Created test conversation ID: ${testConvo.id}`);

  try {
    // 2. Simulate stage history logs
    await writeHistoryLog(
      testConvo.id,
      'Queen',
      'Started',
      'Agent Queen started (Attempt 1/3)... Estimated tokens: 1024'
    );

    await writeHistoryLog(
      testConvo.id,
      'Queen',
      'Completed',
      'Agent Queen completed in 1250ms (450 bytes generated). Estimated tokens: 350'
    );

    await writeHistoryLog(
      testConvo.id,
      'Planner',
      'Completed',
      'Agent Planner completed in 1800ms (890 bytes generated). Estimated tokens: 620'
    );

    await writeHistoryLog(
      testConvo.id,
      'Coder',
      'Completed',
      'File index.html synthesized in 2100ms (1200 bytes generated). Estimated tokens: 950'
    );

    // 3. Query prisma.executionHistory directly
    const historyRecords = await prisma.executionHistory.findMany({
      where: { conversationId: testConvo.id },
    });
    console.log(`\nDirect DB Query: Found ${historyRecords.length} history log records in prisma.executionHistory:`);
    historyRecords.forEach((rec) => {
      console.log(`- [${rec.stage}] Status: ${rec.status} | Logs: ${rec.logs}`);
    });

    // 4. Test telemetry parsing logic matching /api/conversations/[id]/telemetry
    const tokenUsageMap: Record<string, number> = {};
    const latencyHistory: Array<{ stage: string; timeMs: number }> = [];
    const frequencyMap: Record<string, number> = {};

    historyRecords.forEach((h) => {
      const logMsg = h.logs || '';
      const match = logMsg.match(/(?:Estimated tokens:|Tokens generated: ~)\s*(\d+)/i);
      if (match) {
        const val = parseInt(match[1]);
        if (h.stage !== 'System' && h.stage !== 'Unknown') {
          tokenUsageMap[h.stage] = (tokenUsageMap[h.stage] || 0) + val;
        }
      }

      const lMatch = logMsg.match(/in (\d+)ms/i);
      if (lMatch) {
        latencyHistory.push({
          stage: h.stage,
          timeMs: parseInt(lMatch[1]),
        });
      }

      if (logMsg.includes('started (Attempt') || logMsg.includes('loop started') || logMsg.includes('completed in') || logMsg.includes('synthesized in')) {
        frequencyMap[h.stage] = (frequencyMap[h.stage] || 0) + 1;
      }
    });

    let totalTokens = 0;
    Object.keys(tokenUsageMap).forEach((k) => (totalTokens += tokenUsageMap[k]));

    const avgLatency = latencyHistory.length > 0
      ? Math.round(latencyHistory.reduce((sum, item) => sum + item.timeMs, 0) / latencyHistory.length)
      : 0;

    console.log('\n=== PARSED METRICS SUMMARY ===');
    console.log(`Total Tokens: ${totalTokens}`);
    console.log(`Average Latency: ${avgLatency}ms`);
    console.log('Token Usage per Stage:', tokenUsageMap);
    console.log('Tool Frequency per Stage:', frequencyMap);

    if (totalTokens > 0 && avgLatency > 0) {
      console.log('\n✅ TELEMETRY LOGGING INTEGRATION VERIFIED SUCCESSFULLY!');
    } else {
      console.error('\n❌ Telemetry parsing returned 0s.');
    }
  } finally {
    // Cleanup test record
    await prisma.executionHistory.deleteMany({ where: { conversationId: testConvo.id } });
    await prisma.conversation.delete({ where: { id: testConvo.id } });
    console.log(`Cleaned up test conversation ${testConvo.id}`);
  }
}

main().catch(console.error);
