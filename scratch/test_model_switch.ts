import { runInference, getLLMConfig } from '../src/lib/agents/inference';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('=== TESTING INFERENCE WITH 180s TIMEOUT ===\n');

  const config = await getLLMConfig();
  console.log(`LLM Config: provider=${config.provider}, model=${config.ollamaModel}, host=${config.ollamaHost}`);

  const startTime = Date.now();
  try {
    const res = await runInference([
      { role: 'system', content: 'You are Queen agent. Output ### Context Snapshot\n- **Core Goal**: Test goal\n- **Key Constraints**: None\n- **Scope Summary**: Test' },
      { role: 'user', content: 'Build a calculator app.' }
    ], {
      temperature: 0.1,
      maxTokens: 500,
      timeoutMs: 180000 // 180s timeout
    });

    const elapsed = Date.now() - startTime;
    console.log(`\n🎉 Model Response Success in ${elapsed}ms:\n"${res.substring(0, 300)}..."`);
  } catch (err: any) {
    console.error(`\n❌ Error after ${Date.now() - startTime}ms:`, err.message);
  }
}

main().catch(console.error);
