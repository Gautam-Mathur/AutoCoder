import { runOrchestrator } from '../src/lib/agents/ruflo/orchestrator';
import { prisma } from '../src/lib/db';

async function runBenchmark() {
  const benchmarks = [
    { name: 'todo-crud', prompt: 'Build a full stack Todo CRUD web application with task categories, filter by status, and local storage persistence.' },
    { name: 'dashboard', prompt: 'Build an interactive analytics dashboard web app with charts, key metric cards, and responsive layout.' },
  ];

  console.log('=== AUTOCODER PIPELINE BENCHMARK HARNESS ===\n');

  for (const item of benchmarks) {
    console.log(`[START BENCHMARK] ${item.name}`);
    const conversation = await prisma.conversation.create({
      data: {
        title: `Benchmark: ${item.name}`,
        status: 'Active',
        currentStage: 'Queen',
        originalPrompt: item.prompt,
      },
    });

    const startTime = Date.now();
    try {
      await runOrchestrator(
        conversation.id,
        item.prompt,
        (evt) => {
          if (evt.type === 'STAGE_START' || evt.type === 'PIPELINE_COMPLETE') {
            console.log(`  [${evt.agent || 'SYSTEM'}] ${evt.message}`);
          }
        }
      );
      const durationMs = Date.now() - startTime;
      console.log(`✅ Benchmark "${item.name}" completed in ${(durationMs / 1000).toFixed(2)}s\n`);
    } catch (e: any) {
      console.error(`❌ Benchmark "${item.name}" failed: ${e.message}\n`);
    }
  }

  process.exit(0);
}

runBenchmark().catch((err) => {
  console.error('Benchmark error:', err);
  process.exit(1);
});
