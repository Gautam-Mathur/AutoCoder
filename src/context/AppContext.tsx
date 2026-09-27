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
  ollamaConnected: boolean;
  ollamaModels: string[];
  activeModel: string;
  setActiveModel: (model: string) => Promise<void>;
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
  const [ollamaConnected, setOllamaConnected] = useState<boolean>(false);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
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

  const checkOllama = async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setOllamaConnected(data.connected);
        setOllamaModels(data.models || []);
        if (data.model) setActiveModel(data.model);
        return data.connected;
      }
    } catch (e) {
      setOllamaConnected(false);
    }
    return false;
  };

  const handleSetActiveModel = async (model: string) => {
    setActiveModel(model);
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const currentSettings = await res.json();
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...currentSettings,
            ollamaModel: model,
          }),
        });
      }
    } catch (e) {
      console.error('Failed to update active model:', e);
    }
  };

  useEffect(() => {
    checkOllama();
    const interval = setInterval(checkOllama, 5000); // Check every 5s for rapid UI status updates

    const handleFocus = () => {
      checkOllama();
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
        ollamaConnected,
        ollamaModels,
        activeModel,
        setActiveModel: handleSetActiveModel,
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
