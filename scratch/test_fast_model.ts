import { runInference } from '../src/lib/agents/inference';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('=== TESTING FAST MODEL INFERENCE (qwen2.5:3b) ===\n');

  // Temporarily set model to qwen2.5:3b for speed check
  const settingsPath = path.join(process.cwd(), 'settings.json');
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  console.log(`Current configured model: ${settings.ollamaModel}`);

  const startTime = Date.now();
  try {
    const res = await runInference([
      { role: 'system', content: 'You are Queen agent. Output ### Context Snapshot' },
      { role: 'user', content: 'Build a calculator app.' }
    ], {
      temperature: 0.1,
      maxTokens: 300,
      timeoutMs: 30000
    });

    const elapsed = Date.now() - startTime;
    console.log(`\n🎉 Model Response Success in ${elapsed}ms:\n"${res.substring(0, 200)}..."`);
  } catch (err: any) {
    console.error(`\n❌ Error after ${Date.now() - startTime}ms:`, err.message);
  }
}

main().catch(console.error);
