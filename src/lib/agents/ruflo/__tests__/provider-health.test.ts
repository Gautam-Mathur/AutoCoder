import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { resolveProviderHealth } from '../../provider-health';
import type { LLMConfig } from '../../inference';

const baseConfig: LLMConfig = {
  provider: 'ollama',
  ollamaHost: 'http://127.0.0.1:11434',
  ollamaModel: 'qwen3-coder:30b',
  openaiApiKey: '',
  openaiModel: 'gpt-4o-mini',
  anthropicApiKey: '',
  anthropicModel: 'claude-3-5-sonnet-20241022',
};

describe('Multi-Provider Health Resolution', () => {
  test('openai provider reports connected when API key is configured without probing Ollama', async () => {
    let calledUrls: string[] = [];
    const res = await resolveProviderHealth(
      { ...baseConfig, provider: 'openai', openaiApiKey: 'sk-test-1234' },
      {
        fetchImpl: async (url) => {
          calledUrls.push(url);
          return { ok: false, json: async () => ({}) };
        },
      }
    );

    assert.equal(res.connected, true);
    assert.equal(res.ollamaConnected, false);
    assert.equal(res.provider, 'openai');
    assert.equal(res.model, 'gpt-4o-mini');
    assert.equal(calledUrls.length, 0, 'Should not probe localhost Ollama when OpenAI is active');
    assert.ok(res.models.includes('gpt-4o-mini'));
  });

  test('openai provider reports disconnected when API key is missing', async () => {
    const res = await resolveProviderHealth({
      ...baseConfig,
      provider: 'openai',
      openaiApiKey: '',
    });

    assert.equal(res.connected, false);
    assert.equal(res.provider, 'openai');
    assert.match(res.reason || '', /OpenAI API key is not configured/i);
  });

  test('anthropic provider verifies remote models endpoint when verifyRemote=true', async () => {
    let seenHeaders: Record<string, string> | undefined;
    const res = await resolveProviderHealth(
      { ...baseConfig, provider: 'anthropic', anthropicApiKey: 'sk-ant-test-999' },
      {
        verifyRemote: true,
        fetchImpl: async (url, init) => {
          assert.equal(url, 'https://api.anthropic.com/v1/models');
          seenHeaders = init?.headers as Record<string, string>;
          return { ok: true, status: 200, json: async () => ({ data: [] }) };
        },
      }
    );

    assert.equal(res.connected, true);
    assert.equal(res.provider, 'anthropic');
    assert.equal(seenHeaders?.['x-api-key'], 'sk-ant-test-999');
  });

  test('ollama provider probes /api/tags and returns installed models', async () => {
    const res = await resolveProviderHealth(
      { ...baseConfig, provider: 'ollama' },
      {
        fetchImpl: async (url) => {
          assert.ok(url.endsWith('/api/tags'));
          return {
            ok: true,
            status: 200,
            json: async () => ({ models: [{ name: 'qwen3-coder:30b' }, { name: 'llama3:8b' }] }),
          };
        },
      }
    );

    assert.equal(res.connected, true);
    assert.equal(res.ollamaConnected, true);
    assert.deepEqual(res.models, ['qwen3-coder:30b', 'llama3:8b']);
  });
});
