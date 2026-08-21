process.env.no_proxy = 'localhost,127.0.0.1,::1,127.0.0.1:11434,*';
process.env.NO_PROXY = 'localhost,127.0.0.1,::1,127.0.0.1:11434,*';
delete process.env.HTTP_PROXY;
delete process.env.http_proxy;
delete process.env.HTTPS_PROXY;
delete process.env.https_proxy;

import { runInference, getLLMConfig } from '../src/lib/agents/inference';

async function main() {
  console.log('=== TESTING OLLAMA INFERENCE WITH FULL PROXY BYPASS FIX ===\n');

  try {
    const config = await getLLMConfig();
    console.log(`LLM Config: provider=${config.provider}, model=${config.ollamaModel}, host=${config.ollamaHost}`);

    const res = await runInference([
      { role: 'system', content: 'You are a project analyst.' },
      { role: 'user', content: 'Say hello in 3 words.' }
    ], {
      temperature: 0.1,
      maxTokens: 50,
      timeoutMs: 15000
    });

    console.log(`\n🎉 Inference Response Success:\n"${res.trim()}"`);
  } catch (err: any) {
    console.error(`\n❌ Ollama Inference Error:`, err.message);
  }
}

main().catch(console.error);
