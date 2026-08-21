import { runInference, getLLMConfig } from '../src/lib/agents/inference';

async function main() {
  console.log('=== CHECKING OLLAMA CONNECTION & MODEL ACCESSIBILITY ===\n');

  try {
    const config = await getLLMConfig();
    console.log(`LLM Config: provider=${config.provider}, model=${config.ollamaModel}, host=${config.ollamaHost}`);

    const res = await runInference([
      { role: 'system', content: 'You are a test assistant.' },
      { role: 'user', content: 'Say hello in 3 words.' }
    ], {
      temperature: 0.1,
      maxTokens: 50,
      timeoutMs: 10000
    });

    console.log(`\nInference Response Success:\n"${res.trim()}"`);
  } catch (err: any) {
    console.error(`\n❌ Ollama Inference Error:`, err.message);
  }
}

main().catch(console.error);
