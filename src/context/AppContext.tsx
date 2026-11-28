'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface LogMessage {
  type: string;
  agent?: string;
  message: string;
  data?: any;
  timestamp: string;
}

interface AppContextType {
  activeId: string | null;
  activeTitle: string;
  setActiveId: (id: string | null) => void;
  setActiveTitle: (title: string) => void;
  provider: string;
  providerConnected: boolean;
  providerHost: string;
  healthReason: string;
  availableModels: string[];
  /** @deprecated Use providerConnected instead */
  ollamaConnected: boolean;
  /** @deprecated Use availableModels instead */
  ollamaModels: string[];
  activeModel: string;
  setActiveModel: (model: string) => Promise<void>;
  checkProviderHealth: (verifyRemote?: boolean) => Promise<boolean>;
  /** @deprecated Use checkProviderHealth instead */
  checkOllama: () => Promise<boolean>;
  logs: LogMessage[];
  setLogs: (logs: LogMessage[]) => void;
  clearLogs: () => void;
  addLog: (log: Omit<LogMessage, 'timestamp'>) => void;
  activePrompt: string;
  setActivePrompt: (prompt: string) => void;
  currentStage: string;
  setCurrentStage: (stage: string) => void;
  pipelineStatus: string;
  setPipelineStatus: (status: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState<string>('No Active Project');
  const [provider, setProvider] = useState<string>('ollama');
  const [providerConnected, setProviderConnected] = useState<boolean>(false);
  const [providerHost, setProviderHost] = useState<string>('http://127.0.0.1:11434');
  const [healthReason, setHealthReason] = useState<string>('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [activeModel, setActiveModel] = useState<string>('');
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [activePrompt, setActivePrompt] = useState<string>('');
  const [currentStage, setCurrentStage] = useState<string>('Queen');
  const [pipelineStatus, setPipelineStatus] = useState<string>('Idle');

  // Load from localStorage on mount
  useEffect(() => {
    const savedId = localStorage.getItem('activeId');
    const savedTitle = localStorage.getItem('activeTitle');
    if (savedId) setActiveId(savedId);
    if (savedTitle) setActiveTitle(savedTitle);
  }, []);

  const handleSetActiveId = (id: string | null) => {
    setActiveId(id);
    if (id) {
      localStorage.setItem('activeId', id);
    } else {
      localStorage.removeItem('activeId');
      localStorage.removeItem('activeTitle');
      setActiveTitle('No Active Project');
    }
  };

  const handleSetActiveTitle = (title: string) => {
    setActiveTitle(title);
    localStorage.setItem('activeTitle', title);
  };

  const checkProviderHealth = async (verifyRemote = false) => {
    try {
      const url = verifyRemote ? '/api/health?verify=true' : '/api/health';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const isConnected = Boolean(data.providerConnected ?? data.connected);
        setProvider(data.provider || 'ollama');
        setProviderConnected(isConnected);
        setProviderHost(data.host || '');
        setHealthReason(data.reason || '');
        setAvailableModels(data.models || []);
        if (data.model) setActiveModel(data.model);
        return isConnected;
      }
    } catch {
      setProviderConnected(false);
    }
    return false;
  };

  const checkOllama = () => checkProviderHealth(false);

  const handleSetActiveModel = async (model: string) => {
    setActiveModel(model);
    const modelField =
      provider === 'openai'
        ? 'openaiModel'
        : provider === 'anthropic'
        ? 'anthropicModel'
        : 'ollamaModel';
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const currentSettings = await res.json();
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...currentSettings,
            [modelField]: model,
          }),
        });
      }
    } catch (e) {
      console.error('Failed to update active model:', e);
    }
  };

  useEffect(() => {
    checkProviderHealth();
    const interval = setInterval(() => checkProviderHealth(), 5000); // Check every 5s for rapid UI status updates

    const handleFocus = () => {
      checkProviderHealth();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleFocus);
    };
  }, []);

  const clearLogs = () => setLogs([]);

  const addLog = (log: Omit<LogMessage, 'timestamp'>) => {
    setLogs((prev) => [
      ...prev,
      {
        ...log,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  return (
    <AppContext.Provider
      value={{
        activeId,
        activeTitle,
        setActiveId: handleSetActiveId,
        setActiveTitle: handleSetActiveTitle,
        provider,
        providerConnected,
        providerHost,
        healthReason,
        availableModels,
        ollamaConnected: providerConnected,
        ollamaModels: availableModels,
        activeModel,
        setActiveModel: handleSetActiveModel,
        checkProviderHealth,
        checkOllama,
        logs,
        setLogs,
        clearLogs,
        addLog,
        activePrompt,
        setActivePrompt,
        currentStage,
        setCurrentStage,
        pipelineStatus,
        setPipelineStatus,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
