'use client';

import type React from 'react';
import type { LogMessage } from '@/context/AppContext';
import {
  CoderFileProgress,
  extractLiveStreamingCode,
  safeParseJson,
  STAGE_FILE_TO_AGENT,
  STAGE_OUTPUT_FILES,
} from './workspace-helpers';

export interface UsePipelineStreamDeps {
  conversationId: string | null;
  provider: string;
  providerConnected: boolean;
  healthReason: string;
  promptText: string;
  currentStage: string;
  fileContent: string;
  coderFileProgress: CoderFileProgress;
  eventSourceRef: React.MutableRefObject<EventSource | null>;
  selectedFileRef: React.MutableRefObject<string | null>;
  lastEventIdRef: React.MutableRefObject<number>;
  reconnectAttemptsRef: React.MutableRefObject<number>;
  clearLogs: () => void;
  addLog: (log: Omit<LogMessage, 'timestamp'>) => void;
  setPipelineStatus: (status: string) => void;
  setCurrentStage: (stage: string) => void;
  setCoderFileProgress: React.Dispatch<React.SetStateAction<CoderFileProgress>>;
  setActiveStreamingFile: React.Dispatch<React.SetStateAction<string | null>>;
  setFiles: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedFile: React.Dispatch<React.SetStateAction<string | null>>;
  setFileContent: React.Dispatch<React.SetStateAction<string>>;
  setAgentActivityState: React.Dispatch<React.SetStateAction<'idle' | 'reading_inflow' | 'synthesizing_outflow'>>;
  setStreamProgress: React.Dispatch<React.SetStateAction<any>>;
  setStreamingFileContent: React.Dispatch<React.SetStateAction<string>>;
  setInflowDetail: React.Dispatch<React.SetStateAction<string>>;
  setAgentOutputs: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  setNeedsClarification: React.Dispatch<React.SetStateAction<boolean>>;
  setClarificationQuestions: React.Dispatch<React.SetStateAction<string[]>>;
  setNeedsConflictResolution: React.Dispatch<React.SetStateAction<boolean>>;
  setConflictData: React.Dispatch<React.SetStateAction<any>>;
  setSelectedConflictOption: React.Dispatch<React.SetStateAction<string>>;
  fetchConversationDetails: (id: string) => Promise<void>;
}

export function usePipelineStream(deps: UsePipelineStreamDeps) {
  const {
    conversationId,
    provider,
    providerConnected,
    healthReason,
    promptText,
    currentStage,
    fileContent,
    coderFileProgress,
    eventSourceRef,
    selectedFileRef,
    lastEventIdRef,
    reconnectAttemptsRef,
    clearLogs,
    addLog,
    setPipelineStatus,
    setCurrentStage,
    setCoderFileProgress,
    setActiveStreamingFile,
    setFiles,
    setSelectedFile,
    setFileContent,
    setAgentActivityState,
    setStreamProgress,
    setStreamingFileContent,
    setInflowDetail,
    setAgentOutputs,
    setNeedsClarification,
    setClarificationQuestions,
    setNeedsConflictResolution,
    setConflictData,
    setSelectedConflictOption,
    fetchConversationDetails,
  } = deps;

  const handleStartPipeline = (isResume = false) => {
    if (!conversationId) return;
    if (!isResume && !providerConnected) {
      alert(healthReason || `Please configure or start your active LLM provider (${provider}) before initiating pipeline.`);
      return;
    }

    if (!isResume) {
      clearLogs();
    }
    setPipelineStatus('Active');
    addLog({
      type: 'SYSTEM',
      message: isResume ? 'Re-connecting to active compiler loop...' : 'Initializing RuFlo specification compiler...',
    });

    if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
      const cleanUrl = window.location.pathname + `?id=${conversationId}`;
      window.history.replaceState({}, '', cleanUrl);
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const promptQuery = promptText && promptText.length < 500 ? `&prompt=${encodeURIComponent(promptText)}` : '';
    const lastIdQuery = lastEventIdRef.current > 0 ? `&lastEventId=${lastEventIdRef.current}` : '';
    const url = `/api/pipeline/stream?conversationId=${conversationId}${promptQuery}${lastIdQuery}${isResume ? '&resume=true' : ''}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      if (event.lastEventId) {
        const parsedId = parseInt(event.lastEventId, 10);
        if (!isNaN(parsedId) && parsedId > lastEventIdRef.current) {
          lastEventIdRef.current = parsedId;
        }
      }
      const data = JSON.parse(event.data);
      if (data.sequence && typeof data.sequence === 'number' && data.sequence > lastEventIdRef.current) {
        lastEventIdRef.current = data.sequence;
      }

      if (data.type === 'PING') return;
      reconnectAttemptsRef.current = 0;

      if (data.type === 'HISTORY_REPLAY') {
        if (data.message && data.message.trim()) {
          addLog({
            type: data.status === 'Completed' || data.status === 'Success' ? 'AGENT_COMPLETE' : 'AGENT_LOG',
            agent: data.agent,
            message: data.message,
          });
        }
        return;
      }

      if (data.type === 'CODER_TARGET_FILE') {
        const tf = data.data?.targetFile || data.targetFile;
        const fIdx = data.data?.fileIndex;
        const total = data.data?.totalFiles;
        const all = data.data?.allFiles || [];

        setCurrentStage('Coder');
        setCoderFileProgress((prev) => ({
          ...prev,
          currentFile: tf,
          fileIndex: fIdx,
          totalFiles: total,
          allFiles: all.length > 0 ? all : prev.allFiles,
        }));

        if (tf) {
          setActiveStreamingFile(tf);
          setFiles((prev) => (prev.includes(tf) ? prev : [...prev, tf]));
          selectedFileRef.current = tf;
          setSelectedFile(tf);
          fetch(`/api/conversations/${conversationId}/files/read?file=${encodeURIComponent(tf)}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((fd) => {
              if (fd && fd.content && fd.content.trim().length > 0) {
                setFileContent(fd.content);
              } else {
                setFileContent(
                  `// [Coder] Implementing file: "${tf}" (${fIdx || 1} of ${total || 1})...\n// Analyzing blueprint and architecture specifications...`
                );
              }
            })
            .catch(() => {
              setFileContent(
                `// [Coder] Implementing file: "${tf}" (${fIdx || 1} of ${total || 1})...\n// Analyzing blueprint and architecture specifications...`
              );
            });
        }

        addLog({
          type: 'AGENT_LOG',
          agent: 'Coder',
          message: data.message || `💻 [Coder] Implementing file: "${tf}" (${fIdx} of ${total})`,
          data: data.data,
        });
        return;
      }

      if (data.type === 'CODER_FILE_COMPLETE') {
        const tf = data.data?.targetFile || data.targetFile;
        if (tf) {
          setCoderFileProgress((prev) => ({
            ...prev,
            completedFiles: Array.from(new Set([...(prev.completedFiles || []), tf])),
          }));
          fetchConversationDetails(conversationId);
        }
        addLog({
          type: 'AGENT_LOG',
          agent: 'Coder',
          message: data.message || `✅ [Coder] Completed file: "${tf}"`,
          data: data.data,
        });
        return;
      }

      if (data.type === 'AGENT_INFLOW_READING') {
        setAgentActivityState('reading_inflow');
        setStreamProgress(null);
        setStreamingFileContent('');
        const agentName = data.agent || data.stage;
        if (agentName) setCurrentStage(agentName);
        if (data.data?.inflow) {
          setInflowDetail(data.data.inflow);
        }
        const target =
          data.data?.targetFile ||
          data.targetFile ||
          (agentName === 'Coder' ? coderFileProgress.currentFile || 'index.html' : agentName && STAGE_OUTPUT_FILES[agentName]) ||
          `${agentName}.md`;

        if (agentName === 'Coder' && (data.data?.targetFile || data.targetFile)) {
          const tf = data.data?.targetFile || data.targetFile;
          setCoderFileProgress((prev) => ({
            ...prev,
            currentFile: tf,
            fileIndex: data.data?.fileIndex ?? prev.fileIndex,
            totalFiles: data.data?.totalFiles ?? prev.totalFiles,
            allFiles: data.data?.allFiles || prev.allFiles,
          }));
        }

        if (target) {
          setActiveStreamingFile(target);
          setFiles((prev) => (prev.includes(target) ? prev : [...prev, target]));
          const isPriorStageFile =
            !selectedFileRef.current || (selectedFileRef.current in STAGE_FILE_TO_AGENT && selectedFileRef.current !== target);
          if (isPriorStageFile || agentName === 'Coder') {
            selectedFileRef.current = target;
            setSelectedFile(target);
            setFileContent(`// [${agentName}] Reading inflow context for ${target}:\n// ${data.data?.inflow || 'Upstream specifications'}`);
          }
        }
        addLog({
          type: 'AGENT_LOG',
          agent: data.agent,
          message: data.message,
          data: data.data,
        });
        return;
      }

      if (data.type === 'AGENT_OUTFLOW_STARTING') {
        setAgentActivityState('synthesizing_outflow');
        setStreamProgress(null);
        setStreamingFileContent('');
        const agentName = data.agent || data.stage || currentStage;
        if (agentName) setCurrentStage(agentName);
        const target =
          data.data?.targetFile ||
          data.targetFile ||
          (agentName === 'Coder' ? coderFileProgress.currentFile || 'index.html' : agentName && STAGE_OUTPUT_FILES[agentName]) ||
          `${agentName}.md`;

        if (agentName === 'Coder' && (data.data?.targetFile || data.targetFile)) {
          const tf = data.data?.targetFile || data.targetFile;
          setCoderFileProgress((prev) => ({
            ...prev,
            currentFile: tf,
            fileIndex: data.data?.fileIndex ?? prev.fileIndex,
            totalFiles: data.data?.totalFiles ?? prev.totalFiles,
            allFiles: data.data?.allFiles || prev.allFiles,
          }));
        }

        if (target) {
          setActiveStreamingFile(target);
          setFiles((prev) => (prev.includes(target) ? prev : [...prev, target]));
          const isPriorStageFile =
            !selectedFileRef.current || (selectedFileRef.current in STAGE_FILE_TO_AGENT && selectedFileRef.current !== target);
          if (isPriorStageFile || agentName === 'Coder') {
            selectedFileRef.current = target;
            setSelectedFile(target);
            fetch(`/api/conversations/${conversationId}/files/read?file=${encodeURIComponent(target)}`)
              .then((r) => (r.ok ? r.json() : null))
              .then((fd) => {
                if (fd && fd.content && fd.content.trim().length > 0) {
                  setFileContent(fd.content);
                } else {
                  setFileContent(`// [${agentName}] Synthesizing outflow for ${target}...`);
                }
              })
              .catch(() => {
                setFileContent(`// [${agentName}] Synthesizing outflow for ${target}...`);
              });
          }
        }
        addLog({
          type: 'AGENT_LOG',
          agent: data.agent,
          message: data.message,
          data: data.data,
        });
        return;
      }

      if (data.type === 'AGENT_STREAM_PROGRESS') {
        setAgentActivityState('synthesizing_outflow');
        const progressData = data.data?.data && (data.data.type || data.data.agent) ? data.data.data : data.data;
        const agentName = data.agent || data.stage || data.data?.agent || currentStage;
        if (agentName && agentName !== currentStage) {
          setCurrentStage(agentName);
        }
        setStreamProgress(progressData);

        const currentTarget =
          progressData?.targetFile ||
          data.data?.targetFile ||
          data.targetFile ||
          (agentName === 'Coder' ? coderFileProgress.currentFile || 'index.html' : agentName && STAGE_OUTPUT_FILES[agentName]) ||
          (currentStage && STAGE_OUTPUT_FILES[currentStage]) ||
          `${agentName || 'outflow'}.md`;

        if (agentName === 'Coder' && progressData?.targetFile) {
          setCoderFileProgress((prev) => ({
            ...prev,
            currentFile: progressData.targetFile,
            fileIndex: progressData.fileIndex ?? prev.fileIndex,
            totalFiles: progressData.totalFiles ?? prev.totalFiles,
            allFiles: progressData.allFiles || prev.allFiles,
          }));
        }

        if (currentTarget) {
          setActiveStreamingFile(currentTarget);
          const rawFullText = progressData?.fullText || progressData?.latestText || '';
          const liveCode =
            progressData?.liveCode !== undefined && progressData.liveCode.trim().length > 0
              ? progressData.liveCode
              : extractLiveStreamingCode(rawFullText);

          setFiles((prev) => (prev.includes(currentTarget) ? prev : [...prev, currentTarget]));

          const isPriorStageFile =
            !selectedFileRef.current || (selectedFileRef.current in STAGE_FILE_TO_AGENT && selectedFileRef.current !== currentTarget);

          if (isPriorStageFile || (!selectedFileRef.current && agentName === 'Coder')) {
            if (selectedFileRef.current !== currentTarget) {
              selectedFileRef.current = currentTarget;
              setSelectedFile(currentTarget);
            }
          }

          if (liveCode && liveCode.trim().length > 0) {
            setStreamingFileContent(liveCode);
            if (selectedFileRef.current === currentTarget) {
              setFileContent(liveCode);
            }
          } else {
            if (!fileContent || fileContent.startsWith('//') || fileContent.trim().length === 0) {
              fetch(`/api/conversations/${conversationId}/files/read?file=${encodeURIComponent(currentTarget)}`)
                .then((r) => (r.ok ? r.json() : null))
                .then((fd) => {
                  if (fd && fd.content && fd.content.trim().length > 0) {
                    setFileContent(fd.content);
                  }
                })
                .catch(() => {});
            }
          }
        }
        return;
      }

      if (data.type === 'AGENT_START') {
        setStreamProgress(null);
        setStreamingFileContent('');
        setAgentActivityState('reading_inflow');
        const agentName = data.agent || data.stage;
        if (agentName) setCurrentStage(agentName);
        const target =
          data.data?.targetFile ||
          data.targetFile ||
          (agentName === 'Coder' ? coderFileProgress.currentFile || 'index.html' : agentName && STAGE_OUTPUT_FILES[agentName]) ||
          `${agentName}.md`;

        if (agentName === 'Coder') {
          const tf = data.data?.targetFile || data.targetFile;
          if (tf) {
            setCoderFileProgress((prev) => ({
              ...prev,
              currentFile: tf,
              fileIndex: data.data?.fileIndex ?? prev.fileIndex,
              totalFiles: data.data?.totalFiles ?? prev.totalFiles,
              allFiles: data.data?.allFiles || prev.allFiles,
            }));
          }
        }

        setActiveStreamingFile(target);
        setFiles((prev) => (prev.includes(target) ? prev : [...prev, target]));

        const isPriorStageFile =
          !selectedFileRef.current || (selectedFileRef.current in STAGE_FILE_TO_AGENT && selectedFileRef.current !== target);

        if (isPriorStageFile || agentName === 'Coder') {
          selectedFileRef.current = target;
          setSelectedFile(target);
          setFileContent(`// [${agentName}] Agent started targeting ${target}...`);
        }
      }

      addLog({
        type: data.type,
        agent: data.agent,
        message: data.message,
        data: data.data,
      });

      if (data.agent) {
        setCurrentStage(data.agent);
      }

      if (data.type === 'AGENT_COMPLETE' || data.type === 'AGENT_LOG') {
        if (data.type === 'AGENT_COMPLETE') {
          setStreamProgress(null);
          setStreamingFileContent('');
          setActiveStreamingFile(null);
          setAgentActivityState('idle');
          const agentName = data.agent || data.stage;
          const target = agentName && STAGE_OUTPUT_FILES[agentName];
          if (agentName && data.data) {
            setAgentOutputs((prev) => ({
              ...prev,
              [agentName]: data.data,
            }));
            const parsed = safeParseJson(data.data);
            const finalTxt = parsed?.content || (typeof data.data === 'string' ? data.data : '');
            if (finalTxt && target && selectedFileRef.current === target) {
              setFileContent(finalTxt);
            }
          }
        }
        fetchConversationDetails(conversationId);
      }

      if (data.type === 'QUALITY_GATE_PAUSE' || data.type === 'PAUSE_APPROVAL_GATE') {
        setPipelineStatus('Paused');
        fetchConversationDetails(conversationId);
        eventSource.close();
      }

      if (data.type === 'PAUSE_CLARIFICATION') {
        setPipelineStatus('Paused');
        setNeedsClarification(true);
        setClarificationQuestions(data.data.questions || []);
        eventSource.close();
      }

      if (data.type === 'PAUSE_CONFLICT') {
        setPipelineStatus('Paused');
        setNeedsConflictResolution(true);
        setConflictData(data.data.conflict || null);
        setSelectedConflictOption(data.data.conflict?.recommendedOption || '');
        eventSource.close();
      }

      if (data.type === 'PIPELINE_COMPLETE' || data.type === 'PIPELINE_SUCCESS') {
        setPipelineStatus('Completed');
        fetchConversationDetails(conversationId);
        eventSource.close();
      }

      if (data.type === 'PIPELINE_ERROR') {
        const isInterruption =
          data.message?.includes('INFRASTRUCTURE INTERRUPTION') ||
          data.message?.includes('Pipeline paused') ||
          data.message?.includes('fetch failed');

        if (isInterruption) {
          setPipelineStatus('Paused');
          addLog({
            type: 'PIPELINE_ERROR',
            message: data.message || 'Pipeline paused due to infrastructure interruption.',
          });
          eventSource.close();
          const attempts = reconnectAttemptsRef.current + 1;
          reconnectAttemptsRef.current = attempts;
          const backoffMs = Math.min(2000 * attempts, 10000);
          setTimeout(async () => {
            try {
              const checkRes = await fetch(`/api/conversations/${conversationId}`);
              if (checkRes.ok) {
                const conv = await checkRes.json();
                if (conv.status === 'Active' || conv.status === 'Running') {
                  setPipelineStatus('Active');
                  handleStartPipeline(true);
                }
              }
            } catch {}
          }, backoffMs);
          return;
        }

        setPipelineStatus('Failed');
        fetchConversationDetails(conversationId);
        eventSource.close();
      }
    };

    eventSource.onerror = async () => {
      eventSource.close();

      reconnectAttemptsRef.current += 1;
      const attempts = reconnectAttemptsRef.current;
      const MAX_RECONNECT_ATTEMPTS = 5;

      if (attempts > MAX_RECONNECT_ATTEMPTS) {
        addLog({
          type: 'PIPELINE_ERROR',
          message: `Max compiler connection reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Stopping stream reconnect loop.`,
        });
        setPipelineStatus('Failed');
        return;
      }

      try {
        const res = await fetch(`/api/conversations/${conversationId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'Active') {
            const backoffMs = Math.min(1000 * Math.pow(2, attempts - 1), 16000);
            addLog({
              type: 'SYSTEM',
              message: `Stream connection tickle detected (Attempt ${attempts}/${MAX_RECONNECT_ATTEMPTS}). Re-connecting in ${backoffMs / 1000}s...`,
            });
            setTimeout(() => {
              handleStartPipeline(true);
            }, backoffMs);
            return;
          } else if (data.status === 'Paused' || data.status === 'Completed' || data.status === 'Failed') {
            setPipelineStatus(data.status);
            return;
          }
        }
      } catch {}

      addLog({ type: 'PIPELINE_ERROR', message: 'Connection to compiler service lost.' });
      setPipelineStatus('Failed');
    };
  };

  return { handleStartPipeline };
}
