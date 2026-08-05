'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Settings as SettingsIcon,
  Save,
  Server,
  Cloud,
  CheckCircle,
  XCircle,
  HelpCircle,
  Sliders,
} from 'lucide-react';

export default function SettingsPage() {
  const { checkOllama, ollamaConnected, ollamaModels } = useApp();

  const [provider, setProvider] = useState('ollama');
  const [ollamaHost, setOllamaHost] = useState('http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState('llama3:8b-instruct');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [openaiModel, setOpenaiModel] = useState('gpt-4o-mini');
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  const [anthropicModel, setAnthropicModel] = useState('claude-3-5-sonnet-20241022');
  const [temperature, setTemperature] = useState(0.2);

  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'failed'>('idle');

  // Load existing settings
  useEffect(() => {
    fetch('/api/settings')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error();
      })
      .then((data) => {
        if (data.provider) setProvider(data.provider);
        if (data.ollamaHost) setOllamaHost(data.ollamaHost);
        if (data.ollamaModel) setOllamaModel(data.ollamaModel);
        if (data.openaiApiKey) setOpenaiApiKey(data.openaiApiKey);
        if (data.openaiModel) setOpenaiModel(data.openaiModel);
        if (data.anthropicApiKey) setAnthropicApiKey(data.anthropicApiKey);
        if (data.anthropicModel) setAnthropicModel(data.anthropicModel);
      })
      .catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('saving');

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          ollamaHost,
          ollamaModel,
          openaiApiKey,
          openaiModel,
          anthropicApiKey,
          anthropicModel,
        }),
      });

      if (res.ok) {
        setSaveStatus('success');
        // Refresh connection
        await checkOllama();
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('failed');
      }
    } catch (err) {
      setSaveStatus('failed');
    }
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    const isConnected = await checkOllama();
    setTestStatus(isConnected ? 'success' : 'failed');
    setTimeout(() => setTestStatus('idle'), 4000);
  };

  return (
    <main className="flex-1 overflow-y-auto bg-slate-950 p-6 flex flex-col gap-6">
      {/* Page Header */}
      <div className="border-b border-slate-700 pb-4">
        <h2 className="text-xl font-bold text-on-surface">SLM Model Settings</h2>
        <p className="text-xs text-slate-400 mt-1">Control center for local model routing and credentials.</p>
      </div>

      <div className="max-w-2xl bg-slate-900 border border-slate-700 rounded-lg p-6 flex flex-col gap-6">
        <form onSubmit={handleSave} className="flex flex-col gap-6">
          
          {/* LLM Provider Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Cloud className="w-4 h-4 text-electric-indigo" /> LLM Routing Provider
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded p-2 text-xs font-mono text-on-surface focus:border-electric-indigo outline-none"
            >
              <option value="ollama">Ollama (Local LLM)</option>
              <option value="openai">OpenAI API (Cloud)</option>
              <option value="anthropic">Anthropic API (Cloud)</option>
            </select>
          </div>

          {/* Conditional provider details */}
          {provider === 'ollama' && (
            <div className="border border-slate-800 bg-slate-950/40 p-4 rounded flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-emerald-ship" /> Ollama Local Config
                </span>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testStatus === 'testing'}
                  className="px-3 py-1 bg-slate-900 border border-slate-700 rounded text-[10px] font-bold text-slate-300 hover:text-on-surface hover:border-slate-500 transition-colors"
                >
                  {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                </button>
              </div>

              {testStatus === 'success' && (
                <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                  <CheckCircle className="w-3.5 h-3.5" /> Connection verified successfully.
                </div>
              )}
              {testStatus === 'failed' && (
                <div className="text-[11px] text-red-400 flex items-center gap-1 font-mono animate-pulse">
                  <XCircle className="w-3.5 h-3.5" /> Connection failed. Start Ollama and expose port 11434.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 font-mono">Ollama Host Address</label>
                  <input
                    type="text"
                    value={ollamaHost}
                    onChange={(e) => setOllamaHost(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded p-2 text-xs font-mono text-on-surface focus:border-electric-indigo outline-none"
                    placeholder="e.g. http://localhost:11434"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 font-mono">Inference Model Tag</label>
                  {ollamaConnected && ollamaModels.length > 0 ? (
                    <select
                      value={ollamaModel}
                      onChange={(e) => setOllamaModel(e.target.value)}
                      className="bg-slate-950 border border-slate-700 rounded p-2 text-xs font-mono text-on-surface focus:border-electric-indigo outline-none cursor-pointer"
                    >
                      {ollamaModels.map((m) => (
                        <option key={m} value={m} className="bg-slate-900 text-slate-300">
                          {m}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={ollamaModel}
                      onChange={(e) => setOllamaModel(e.target.value)}
                      className="bg-slate-950 border border-slate-700 rounded p-2 text-xs font-mono text-on-surface focus:border-electric-indigo outline-none"
                      placeholder="e.g. llama3:8b-instruct"
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {provider === 'openai' && (
            <div className="border border-slate-800 bg-slate-950/40 p-4 rounded flex flex-col gap-4">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                <Cloud className="w-4 h-4 text-electric-indigo" /> OpenAI Configuration
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 font-mono">OpenAI API Key</label>
                  <input
                    type="password"
                    value={openaiApiKey}
                    onChange={(e) => setOpenaiApiKey(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded p-2 text-xs font-mono text-on-surface focus:border-electric-indigo outline-none"
                    placeholder="sk-..."
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 font-mono">Target Model</label>
                  <input
                    type="text"
                    value={openaiModel}
                    onChange={(e) => setOpenaiModel(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded p-2 text-xs font-mono text-on-surface focus:border-electric-indigo outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {provider === 'anthropic' && (
            <div className="border border-slate-800 bg-slate-950/40 p-4 rounded flex flex-col gap-4">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                <Cloud className="w-4 h-4 text-electric-indigo" /> Anthropic Configuration
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 font-mono">Anthropic API Key</label>
                  <input
                    type="password"
                    value={anthropicApiKey}
                    onChange={(e) => setAnthropicApiKey(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded p-2 text-xs font-mono text-on-surface focus:border-electric-indigo outline-none"
                    placeholder="sk-ant-..."
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 font-mono">Target Model</label>
                  <input
                    type="text"
                    value={anthropicModel}
                    onChange={(e) => setAnthropicModel(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded p-2 text-xs font-mono text-on-surface focus:border-electric-indigo outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Hyperparameters Controls */}
          <div className="border border-slate-800 p-4 rounded flex flex-col gap-4">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Sliders className="w-4 h-4 text-electric-indigo" /> Hyperparameters
            </span>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                <span>Inference Temperature</span>
                <span>{temperature}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1.0"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-electric-indigo"
              />
              <span className="text-[9px] text-slate-500 font-mono">
                Lower values yield deterministic structural code; higher values encourage creative architectural splits.
              </span>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-between items-center border-t border-slate-800 pt-4 mt-2">
            <div className="text-[11px] font-mono">
              {saveStatus === 'success' && <span className="text-emerald-400">Settings saved successfully.</span>}
              {saveStatus === 'failed' && <span className="text-red-400">Failed to save settings.</span>}
            </div>
            <button
              type="submit"
              disabled={saveStatus === 'saving'}
              className="bg-electric-indigo text-white px-6 py-2 rounded text-xs font-bold hover:bg-indigo-500 transition-colors shadow-[0_0_12px_rgba(129,140,248,0.5)] flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saveStatus === 'saving' ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>

        </form>
      </div>
    </main>
  );
}
