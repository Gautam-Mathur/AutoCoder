import { prisma } from '../src/lib/db.js';

async function main() {
  console.log('🔍 Auditing SQLite Pipeline Execution Logs and Failure Patterns...\n');

  // 1. Fetch recent ExecutionHistory logs with status != 'Completed' or containing error keywords
  const historyLogs = await prisma.executionHistory.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  console.log(`=== Total ExecutionHistory Records Scanned: ${historyLogs.length} ===`);
  const failureHistory = historyLogs.filter(h => 
    h.status === 'Failed' || 
    h.status === 'Retrying' || 
    h.logs.toLowerCase().includes('error') || 
    h.logs.toLowerCase().includes('failed') ||
    h.logs.toLowerCase().includes('timeout')
  );

  console.log(`Found ${failureHistory.length} failure/retry logs in ExecutionHistory:`);
  failureHistory.slice(0, 15).forEach(h => {
    console.log(`\n[Convo: ${h.conversationId}] Stage: ${h.stage} | Status: ${h.status}`);
    console.log(`Logs snippet: ${h.logs.substring(0, 300)}`);
  });

  // 2. Fetch StageExecutionLog table records
  const stageLogs = await prisma.stageExecutionLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  console.log(`\n=== Total StageExecutionLog Records Scanned: ${stageLogs.length} ===`);
  const failedStageLogs = stageLogs.filter(s => s.status === 'FAILED' || s.errorMessage);
  console.log(`Found ${failedStageLogs.length} failed StageExecutionLogs:`);
  failedStageLogs.slice(0, 15).forEach(s => {
    console.log(`\nStage: ${s.stageName} | Status: ${s.status} | Repair Loops: ${s.repairLoops}`);
    console.log(`Error: ${s.errorMessage}`);
  });

  // 3. Inspect recent AgentOutputs for truncated/malformed outputs
  const outputs = await prisma.agentOutput.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  console.log(`\n=== Total AgentOutputs Scanned: ${outputs.length} ===`);
  outputs.forEach(o => {
    let content = '';
    try {
      const parsed = JSON.parse(o.validatedJson);
      content = parsed.content || '';
    } catch {
      content = o.validatedJson;
    }
    const isTruncated = content.endsWith('...') || content.includes('[TRUNCATED]') || content.includes('UNTERMINATED');
    const isShort = content.length < 50;
    if (isTruncated || isShort) {
      console.log(`⚠️ Potential output defect: Agent: ${o.agentName} | ExecTime: ${o.executionTime}ms | Bytes: ${content.length} | Truncated: ${isTruncated}`);
    }
  });

  // 4. Inspect VirtualFiles for empty or malformed files
  const vfsFiles = await prisma.virtualFile.findMany({
    take: 100,
  });
  console.log(`\n=== Total VirtualFiles Scanned: ${vfsFiles.length} ===`);
  const suspectFiles = vfsFiles.filter(f => f.content.length < 20 || f.content.includes('undefined') || f.content.includes('[object Object]'));
  console.log(`Found ${suspectFiles.length} suspect VirtualFiles:`);
  suspectFiles.forEach(f => {
    console.log(`  • ${f.filePath} (Convo: ${f.conversationId}) - ${f.content.length} bytes: "${f.content.substring(0, 100)}"`);
  });
}

main().catch(err => {
  console.error('Audit script error:', err);
});
