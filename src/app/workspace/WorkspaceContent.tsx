'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useApp, LogMessage } from '@/context/AppContext';
import {
  Play,
  Compass,
  Code,
  Eye,
  Activity,
  Terminal as TerminalIcon,
} from 'lucide-react';
import {
  STAGE_OUTPUT_FILES,
  STAGE_FILE_TO_AGENT,
  parseModulesFromMarkdown,
  safeParseJson,
  getFileBasename,
  normalizeFilePath,
} from '@/components/workspace/workspace-helpers';
import { usePipelineStream } from '@/components/workspace/usePipelineStream';
import { AgentOutputCard } from '@/components/workspace/AgentOutputCard';
import { StageStatusBanners } from '@/components/workspace/StageStatusBanners';
import { FlowchartTab } from '@/components/workspace/FlowchartTab';
import { CodeExplorerTab } from '@/components/workspace/CodeExplorerTab';
import { LivePreviewTab } from '@/components/workspace/LivePreviewTab';
import { WorkspaceModals } from '@/components/workspace/WorkspaceModals';

export default function WorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationId = searchParams.get('id');
  const initialPrompt = searchParams.get('prompt') || '';

  const {
    provider,
    providerConnected,
    healthReason,
    activeId,
    setActiveId,
    activeTitle,
    setActiveTitle,
    logs,
    setLogs,
    addLog,
    clearLogs,
    currentStage,
    setCurrentStage,
    pipelineStatus,
    setPipelineStatus
  } = useApp();

  const [activeTab, setActiveTab] = useState<'flowchart' | 'code' | 'preview'>('flowchart');
  const [promptText, setPromptText] = useState(initialPrompt);

  // DB entities/blueprints loaded after compilation
  const [entities, setEntities] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [navigation, setNavigation] = useState<string[]>([]);
  const [componentsList, setComponentsList] = useState<any[]>([]);
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const selectedFileRef = useRef<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('// Select a file to view content');
  const [activeStreamingFile, setActiveStreamingFile] = useState<string | null>(null);
  const [streamingFileContent, setStreamingFileContent] = useState<string>('');
  const [agentActivityState, setAgentActivityState] = useState<'idle' | 'reading_inflow' | 'synthesizing_outflow'>('idle');
  const [inflowDetail, setInflowDetail] = useState<string>('');
  const [agentOutputs, setAgentOutputs] = useState<Record<string, any>>({});
  const [expandedDirs, setExpandedDirs] = useState<Record<string, boolean>>({});

  // Clarification state
  const [clarificationQuestions, setClarificationQuestions] = useState<string[]>([]);
  const [clarificationAnswers, setClarificationAnswers] = useState<string[]>(['', '', '']);
  const [needsClarification, setNeedsClarification] = useState(false);
  const [needsConflictResolution, setNeedsConflictResolution] = useState(false);
  const [conflictData, setConflictData] = useState<any>(null);
  const [selectedConflictOption, setSelectedConflictOption] = useState<string>('');
  const [detailsLoaded, setDetailsLoaded] = useState(false);
  const [streamProgress, setStreamProgress] = useState<any>(null);
  const [previewDoc, setPreviewDoc] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [coderFileProgress, setCoderFileProgress] = useState<{
    currentFile?: string;
    fileIndex?: number;
    totalFiles?: number;
    allFiles?: string[];
    completedFiles?: string[];
  }>({});

  // SSE Stream controller
  const eventSourceRef = useRef<EventSource | null>(null);
  const logEndRef = useRef<HTMLDivElement | null>(null);
  const didConnectRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const lastEventIdRef = useRef<number>(0);

  // Sync conversation ID to global context
  useEffect(() => {
    if (conversationId) {
      setActiveId(conversationId);
      didConnectRef.current = false;
      fetchConversationDetails(conversationId);
    }
  }, [conversationId]);

  // Unmount cleanup for EventSource stream
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  // Auto-start or auto-resume pipeline if loaded and status is Active or Paused (or Idle with prompt)
  useEffect(() => {
    if (detailsLoaded && !didConnectRef.current) {
      if (pipelineStatus === 'Active' || pipelineStatus === 'Paused') {
        didConnectRef.current = true;
        handleStartPipeline(true);
      } else if (pipelineStatus === 'Idle' && promptText?.trim()) {
        didConnectRef.current = true;
        handleStartPipeline(false);
      }
    }
  }, [detailsLoaded, pipelineStatus, promptText]);

  // Live polling effect during active pipeline execution to keep file tree and active code view updated without manual reloads
  useEffect(() => {
    if (!conversationId || (pipelineStatus !== 'Active' && pipelineStatus !== 'Paused')) return;

    const pollInterval = setInterval(() => {
      fetchConversationDetails(conversationId);
    }, 2500);

    return () => clearInterval(pollInterval);
  }, [conversationId, pipelineStatus, selectedFile]);

  // Handle scroll to bottom of logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Load and bundle live app DOM preview
  const loadLivePreview = async () => {
    if (!conversationId) return;
    setPreviewLoading(true);
    try {
      // 1. Fetch index.html from VFS
      let htmlContent = '';
      const htmlRes = await fetch(`/api/conversations/${conversationId}/files/read?file=index.html`);
      if (htmlRes.ok) {
        const d = await htmlRes.json();
        htmlContent = d.content || '';
      }

      // If index.html is currently being streamed in memory and not yet flushed to VFS
      if (!htmlContent && activeStreamingFile === 'index.html' && streamingFileContent.trim().length > 0) {
        htmlContent = streamingFileContent;
      }

      if (!htmlContent) {
        setPreviewDoc('');
        setPreviewLoading(false);
        return;
      }

      // 2. Fetch style.css if present
      let cssContent = '';
      const cssRes = await fetch(`/api/conversations/${conversationId}/files/read?file=style.css`);
      if (cssRes.ok) {
        const d = await cssRes.json();
        cssContent = d.content || '';
      } else if (activeStreamingFile === 'style.css' && streamingFileContent.trim().length > 0) {
        cssContent = streamingFileContent;
      }

      // 3. Fetch script.js if present
      let jsContent = '';
      const jsRes = await fetch(`/api/conversations/${conversationId}/files/read?file=script.js`);
      if (jsRes.ok) {
        const d = await jsRes.json();
        jsContent = d.content || '';
      } else if (activeStreamingFile === 'script.js' && streamingFileContent.trim().length > 0) {
        jsContent = streamingFileContent;
      }

      // In-line styles and scripts if referenced externally
      let doc = htmlContent;
      if (cssContent) {
        if (doc.includes('<link rel="stylesheet"') || doc.includes('style.css')) {
          doc = doc.replace(/<link[^>]+href=["'][^"']*style\.css["'][^>]*>/gi, `<style>\n${cssContent}\n</style>`);
        } else if (doc.includes('</head>')) {
          doc = doc.replace('</head>', `<style>\n${cssContent}\n</style>\n</head>`);
        } else {
          doc = `<style>\n${cssContent}\n</style>\n` + doc;
        }
      }

      if (jsContent) {
        if (doc.includes('<script src="script.js"') || doc.includes('script.js')) {
          doc = doc.replace(/<script[^>]+src=["'][^"']*script\.js["'][^>]*><\/script>/gi, `<script>\n${jsContent}\n</script>`);
        } else if (doc.includes('</body>')) {
          doc = doc.replace('</body>', `<script>\n${jsContent}\n</script>\n</body>`);
        } else {
          doc = doc + `\n<script>\n${jsContent}\n</script>`;
        }
      }

      setPreviewDoc(doc);
    } catch (e) {
      console.error('Failed to load preview doc:', e);
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'preview' && conversationId) {
      loadLivePreview();
    }
  }, [activeTab, conversationId]);

  // Load details from DB
  const fetchConversationDetails = async (id: string) => {
    try {
      let data: any = null;
      let lastCoderFile: string | undefined;
      let lastCoderIdx: number | undefined;
      let lastCoderTotal: number | undefined;
      let latestHistory: any = null;
      const completedCoderFiles: string[] = [];

      const res = await fetch(`/api/conversations/${id}`);
      if (res.ok) {
        data = await res.json();
        setPipelineStatus(data.status);
        setCurrentStage(data.currentStage);
        if (data.title) {
          setActiveTitle(data.title);
        }
        if (data.originalPrompt && !promptText) {
          setPromptText(data.originalPrompt);
        }

        // Auto-reconnect SSE if database indicates Active but SSE is disconnected
        if (data.status === 'Active' && (!eventSourceRef.current || eventSourceRef.current.readyState === EventSource.CLOSED)) {
          handleStartPipeline(true);
        }

        // Load SML data if exists
        loadSMLData(data.outputs);

        // Inspect latest pipelineEvents if returned by backend API
        if (Array.isArray(data.pipelineEvents) && data.pipelineEvents.length > 0) {
          for (const ev of data.pipelineEvents) {
            let pPayload: any = {};
            try {
              pPayload = typeof ev.payload === 'string' ? JSON.parse(ev.payload) : ev.payload;
            } catch (err) {
              pPayload = {};
            }

            const pTarget = pPayload?.data?.targetFile || pPayload?.targetFile;
            const pIdx = pPayload?.data?.fileIndex ?? pPayload?.fileIndex;
            const pTotal = pPayload?.data?.totalFiles ?? pPayload?.totalFiles;

            if (pTarget) {
              if (!lastCoderFile && (ev.eventType === 'CODER_TARGET_FILE' || ev.eventType === 'AGENT_STREAM_PROGRESS' || ev.eventType === 'CODER_FILE_COMPLETE')) {
                lastCoderFile = pTarget;
                if (pIdx) lastCoderIdx = pIdx;
                if (pTotal) lastCoderTotal = pTotal;
              }
              if (ev.eventType === 'CODER_FILE_COMPLETE' && !completedCoderFiles.includes(pTarget)) {
                completedCoderFiles.push(pTarget);
              }
            }
          }
        }

        latestHistory = data.history && data.history.length > 0 ? data.history[0] : null;

        // Populate logs from database execution history
        if (data.history && data.history.length > 0) {
          // If the pipeline is currently Active and we don't have stream progress yet,
          // infer the current stage activity state and inflow from the latest history item
          if (data.status === 'Active' && latestHistory && (latestHistory.status === 'Started' || latestHistory.status === 'Running')) {
            setAgentActivityState((prev) => (prev === 'idle' ? 'reading_inflow' : prev));
            let stageArtifact = STAGE_OUTPUT_FILES[latestHistory.stage] || `${latestHistory.stage}.md`;
            if (latestHistory.stage === 'Coder') {
              if (lastCoderFile) {
                stageArtifact = lastCoderFile;
              } else if (coderFileProgress.currentFile) {
                stageArtifact = coderFileProgress.currentFile;
              } else if (latestHistory.logs) {
                const coderMatch = latestHistory.logs.match(/(?:Implementing file:|targeting)\s+"([^"]+)"/i);
                if (coderMatch && coderMatch[1]) {
                  stageArtifact = coderMatch[1];
                }
              }
            }
            setActiveStreamingFile(stageArtifact);
            // Ensure target file appears in file explorer tree
            setFiles((prev) => (prev.includes(stageArtifact) ? prev : [...prev, stageArtifact]));

            const STAGE_INFLOW_SUMMARY: Record<string, string> = {
              Queen: 'User Prompt',
              Planner: '[plan.md, User Prompt]',
              Architect: '[requirements.md, plan.md]',
              System: '[architecture.md, requirements.md]',
              Designer: '[requirements.md, architecture.md]',
              Blueprinter: '[architecture.md, backend_spec.md, ui_spec.md]',
              Coder: '[blueprint.md, architecture.md]',
              Tester: 'Workspace Source Code Files',
              Debugger: '[test_report.md, Workspace Source Files]',
              Security: '[workspace.manifest.json, Source Files]',
              Reviewer: '[workspace.manifest.json, System Specs]',
            };
            setInflowDetail((prev) => prev || STAGE_INFLOW_SUMMARY[latestHistory.stage] || 'Upstream Stage Specifications');
          }

          const mappedLogs: LogMessage[] = data.history.map((h: any) => {
            let type = 'AGENT_LOG';
            const logMsg = h.logs || '';

            // Extract Coder file progress across historic logs
            const coderMatch = logMsg.match(/(?:Implementing file:|targeting)\s+"([^"]+)"(?:\s+\((\d+)\s+(?:of|\/)\s+(\d+)\))?/i);
            if (coderMatch && coderMatch[1]) {
              if (!lastCoderFile) lastCoderFile = coderMatch[1];
              if (coderMatch[2] && !lastCoderIdx) lastCoderIdx = parseInt(coderMatch[2], 10);
              if (coderMatch[3] && !lastCoderTotal) lastCoderTotal = parseInt(coderMatch[3], 10);
            }
            const completedMatch = logMsg.match(/(?:Completed file:|Target file)\s+"([^"]+)"/i);
            if (completedMatch && completedMatch[1] && (logMsg.includes('Completed') || logMsg.includes('already generated') || logMsg.includes('verified'))) {
              if (!completedCoderFiles.includes(completedMatch[1])) {
                completedCoderFiles.push(completedMatch[1]);
              }
            }
            
            if (logMsg.trim().startsWith('{') && logMsg.includes('"telemetryType":"rich_step_log"')) {
              try {
                const parsed = JSON.parse(logMsg);
                const step = parsed.executionMemory?.stage || h.stage;
                const status = parsed.executionMemory?.status || h.status;
                const attempt = parsed.orchestration?.attempt || 1;
                const duration = parsed.orchestration?.durationMs || 0;
                
                let summaryMsg = `[Rich Log] Agent ${step} ${status === 'Success' ? 'completed successfully' : 'failed'} in ${duration}ms (Attempt ${attempt}/3).`;
                if (parsed.orchestration?.errorMessage) {
                  summaryMsg += ` Error: ${parsed.orchestration.errorMessage}`;
                }
                return {
                  type: status === 'Success' ? 'AGENT_COMPLETE' : 'PIPELINE_ERROR',
                  agent: step,
                  message: summaryMsg,
                  timestamp: new Date(h.createdAt).toLocaleTimeString(),
                  data: parsed.outflow || parsed.parsedJson || parsed
                };
              } catch (e) {
                // fallback
              }
            }

            if (h.status === 'Success' && (logMsg.includes('finished successfully!') || logMsg.includes('completed successfully!') || logMsg.includes('completed successfully'))) {
              type = 'AGENT_COMPLETE';
            } else if (h.status === 'Failed') {
              type = 'AGENT_ERROR';
            } else if (logMsg.includes('started')) {
              type = 'AGENT_START';
            } else if (h.stage === 'System') {
              type = 'SYSTEM';
            }
            return {
              type,
              agent: h.stage !== 'System' ? h.stage : undefined,
              message: logMsg,
              timestamp: new Date(h.createdAt).toLocaleTimeString(),
            };
          });

          if (lastCoderFile || completedCoderFiles.length > 0) {
            const filteredCompleted = lastCoderFile
              ? completedCoderFiles.filter((f) => f !== lastCoderFile)
              : completedCoderFiles;
            setCoderFileProgress((prev) => ({
              ...prev,
              currentFile: lastCoderFile || prev.currentFile,
              fileIndex: lastCoderIdx ?? prev.fileIndex,
              totalFiles: lastCoderTotal ?? prev.totalFiles,
              completedFiles: Array.from(new Set([
                ...(prev.completedFiles || []).filter((f) => f !== lastCoderFile),
                ...filteredCompleted,
              ])),
            }));
          }
          // Restore chronological order
          setLogs(mappedLogs.reverse());
        }
      }

      // Also try to query files on disk
      const filesRes = await fetch(`/api/conversations/${id}/files`);
      if (filesRes.ok) {
        const diskFiles = await filesRes.json();
        if (diskFiles && diskFiles.length > 0) {
          const normalizedDiskFiles = diskFiles.map(normalizeFilePath).filter(Boolean);
          
          // Make sure activeStreamingFile and any stage outputs are always in files list
          setFiles((prev) => {
            const list = [...normalizedDiskFiles];
            if (activeStreamingFile && !list.includes(activeStreamingFile)) {
              list.push(activeStreamingFile);
            }
            if (Array.isArray(data.outputs)) {
              data.outputs.forEach((out: any) => {
                const stageFile = STAGE_OUTPUT_FILES[out.agentName || out.stage];
                if (stageFile && !list.includes(stageFile)) {
                  list.push(stageFile);
                }
              });
            }
            return Array.from(new Set(list));
          });
          
          // Auto-expand all folder paths in tree view so code files are immediately visible
          const autoExpand: Record<string, boolean> = {};
          normalizedDiskFiles.forEach((f: string) => {
            const parts = f.split('/');
            for (let i = 1; i < parts.length; i++) {
              autoExpand[parts.slice(0, i).join('/')] = true;
            }
          });
          setExpandedDirs((prev) => ({ ...autoExpand, ...prev }));
          
          // Auto-select active streaming file, active stage output file, or restore selection
          const activeStageName = currentStage || (data?.pipelineRun?.currentStage) || (data?.currentStage);
          const activeStageFile = activeStageName ? STAGE_OUTPUT_FILES[activeStageName] : null;

          const activeCoderTarget = lastCoderFile || coderFileProgress.currentFile || (activeStreamingFile && activeStreamingFile !== 'index.html' ? activeStreamingFile : null);
          const isCoderStage = (activeStageName === 'Coder' || latestHistory?.stage === 'Coder' || currentStage === 'Coder');

          let targetFile = selectedFileRef.current;
          const isCurrentSelectedCompletedOrStageOutput = !targetFile ||
            targetFile in STAGE_FILE_TO_AGENT ||
            completedCoderFiles.includes(targetFile);

          if (isCoderStage && activeCoderTarget && isCurrentSelectedCompletedOrStageOutput && normalizedDiskFiles.includes(activeCoderTarget)) {
            targetFile = activeCoderTarget;
          } else if (!targetFile) {
            if (activeStreamingFile && agentActivityState === 'synthesizing_outflow') {
              targetFile = activeStreamingFile;
            } else if (data?.status === 'Active' && activeStageFile) {
              targetFile = activeStageFile;
            } else {
              targetFile = localStorage.getItem(`selectedFile_${id}`) || activeStageFile || normalizedDiskFiles[0];
            }
          }

          if (targetFile) {
            if (selectedFileRef.current !== targetFile) {
              selectedFileRef.current = targetFile;
              setSelectedFile(targetFile);
            }
            // Fetch live content for open file (preserve live character-by-character stream while actively synthesizing)
            if (agentActivityState === 'synthesizing_outflow' && (activeStreamingFile === targetFile || currentStage === 'Coder') && streamingFileContent && streamingFileContent.trim().length > 0) {
              setFileContent(streamingFileContent);
            } else {
              const diskRes = await fetch(`/api/conversations/${id}/files/read?file=${encodeURIComponent(targetFile)}`);
              if (diskRes.ok) {
                const fileData = await diskRes.json();
                if (fileData.content !== undefined && fileData.content.trim().length > 0) {
                  if (!streamingFileContent || streamingFileContent.trim().length === 0) {
                    setFileContent(fileData.content);
                  }
                }
              }
            }
          }
        }
      }
      setDetailsLoaded(true);
    } catch (e) {
      console.error(e);
      setDetailsLoaded(true);
    }
  };


  const loadSMLData = (outputs: any[]) => {
    // Populate agent outputs map
    const outputsMap: Record<string, any> = {};
    const stageArtifactMap: Record<string, string> = {
      Queen: 'plan.md',
      Planner: 'requirements.md',
      Architect: 'architecture.md',
      System: 'backend_spec.md',
      Designer: 'ui_spec.md',
      Blueprinter: 'blueprint.md',
      Security: 'security_report.md',
      Reviewer: 'review_report.md',
      Debugger: 'debug_report.md',
    };
    const stageFiles: string[] = [];

    outputs.forEach((o) => {
      const parsed = safeParseJson(o.validatedJson);
      if (parsed) {
        outputsMap[o.agentName] = parsed;
      }
      const mappedFile = stageArtifactMap[o.agentName] || stageArtifactMap[o.stage];
      if (mappedFile) {
        stageFiles.push(mappedFile);
      }
    });
    setAgentOutputs((prev) => ({ ...prev, ...outputsMap }));

    if (stageFiles.length > 0) {
      setFiles((prev) => [...new Set([...prev, ...stageFiles])]);
    }

    // Extrapolate outputs
    const plannerOut = outputs.find((o) => o.agentName === 'Planner');
    const archOut = outputs.find((o) => o.agentName === 'Architect');
    const sysOut = outputs.find((o) => o.agentName === 'System');
    const designerOut = outputs.find((o) => o.agentName === 'Designer');
    const coderOutputs = outputs.filter((o) => o.agentName === 'Coder');

    if (plannerOut) {
      const json = safeParseJson(plannerOut.validatedJson);
    }

    if (archOut) {
      let modulesList: any[] = [];
      const json = safeParseJson(archOut.validatedJson);
      if (json && Array.isArray(json.modules)) {
        modulesList = json.modules;
      } else if (archOut.validatedJson?.content) {
        modulesList = parseModulesFromMarkdown(archOut.validatedJson.content);
      }
      setModules(modulesList);
      
      // Collate files list
      const filePaths: string[] = [];
      modulesList.forEach((mod: any) => {
        const collect = (arr: any) => {
          if (Array.isArray(arr)) {
            arr.forEach((f: any) => {
              const norm = normalizeFilePath(f);
              if (norm) filePaths.push(norm);
            });
          }
        };
        collect(mod.files);
        collect(mod.ownedFiles);
        collect(mod.pages);
        collect(mod.components);
        collect(mod.services);
        collect(mod.apis);
      });
      if (filePaths.length > 0) {
        setFiles((prev) => [...new Set([...prev, ...filePaths])]);
      }
    }

    if (sysOut) {
      const json = safeParseJson(sysOut.validatedJson);
      if (json) {
        setEntities(json.entities || []);
      }
    }

    if (designerOut) {
      const json = safeParseJson(designerOut.validatedJson);
      if (json) {
        setNavigation(json.navigationMap || []);
        setComponentsList(json.components || []);
      }
    }

    // Load file contents
    if (coderOutputs.length > 0) {
      coderOutputs.forEach((out) => {
        const json = safeParseJson(out.validatedJson);
      });
    }
  };

  // Start execution stream
  const { handleStartPipeline } = usePipelineStream({
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
  });

  const [isRetrying, setIsRetrying] = useState(false);

  // Listen to resume events from top bar
  useEffect(() => {
    const handleResume = (e: any) => {
      setPipelineStatus('Active');
      if (e?.detail?.nextStage) {
        setCurrentStage(e.detail.nextStage);
      }
      handleStartPipeline(true);
    };
    window.addEventListener('pipeline-resumed', handleResume as EventListener);
    return () => window.removeEventListener('pipeline-resumed', handleResume as EventListener);
  }, [conversationId, promptText]);

  const handleRetryFailedPipeline = async () => {
    if (!conversationId) return;
    setIsRetrying(true);
    addLog({
      type: 'SYSTEM',
      message: `Resuming pipeline compilation from stage ${currentStage}...`,
    });

    try {
      const res = await fetch('/api/pipeline/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      });

      if (res.ok) {
        const data = await res.json();
        setPipelineStatus('Active');
        if (data.nextStage) {
          setCurrentStage(data.nextStage);
        }
        handleStartPipeline(true);
      } else {
        const err = await res.json().catch(() => ({}));
        addLog({
          type: 'PIPELINE_ERROR',
          message: `Failed to resume pipeline: ${err.error || 'Server error'}`,
        });
      }
    } catch (e: any) {
      addLog({
        type: 'PIPELINE_ERROR',
        message: `Failed to resume pipeline: ${e.message}`,
      });
    } finally {
      setIsRetrying(false);
    }
  };

  // Handle Clarification Submit
  const handleClarificationSubmit = async () => {
    if (!conversationId) return;
    addLog({
      type: 'SYSTEM',
      message: 'Submitting clarification answers to Queen orchestrator...',
    });

    try {
      // Save answers as feedback or append to prompt
      const mergedAnswersPrompt = `${promptText}\n\nClarification Answers:\n` +
        clarificationQuestions.map((q, idx) => `Q: ${q}\nA: ${clarificationAnswers[idx]}`).join('\n');
      
      setPromptText(mergedAnswersPrompt);
      setNeedsClarification(false);

      const res = await fetch('/api/pipeline/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      });

      if (res.ok) {
        // Restart SSE stream
        handleStartPipeline();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Conflict Submit
  const handleConflictSubmit = async () => {
    if (!conversationId || !conflictData) return;
    addLog({
      type: 'SYSTEM',
      message: `Resolving conflict alignment with choice: "${selectedConflictOption}"...`,
    });

    try {
      setNeedsConflictResolution(false);

      const res = await fetch('/api/pipeline/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          conflictDescription: conflictData.description,
          resolvedConflictOption: selectedConflictOption
        }),
      });

      if (res.ok) {
        handleStartPipeline();
      } else {
        const data = await res.json();
        addLog({
          type: 'PIPELINE_ERROR',
          message: `Failed to resume pipeline: ${data.error || 'Unknown error'}`,
        });
      }
    } catch (err: any) {
      addLog({
        type: 'PIPELINE_ERROR',
        message: `Failed to resume pipeline: ${err.message}`,
      });
    }
  };

  // Handle Approve Gate
  const handleApproveGate = async () => {
    if (!conversationId) return;
    addLog({
      type: 'SYSTEM',
      message: 'User approved architecture. Resuming pipeline and advancing to System stage...',
    });

    try {
      const res = await fetch('/api/pipeline/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      });

      if (res.ok) {
        window.dispatchEvent(new CustomEvent('pipeline-resumed'));
      } else {
        const data = await res.json();
        addLog({
          type: 'SYSTEM',
          message: `Failed to resume pipeline: ${data.error || 'Unknown error'}`,
        });
      }
    } catch (err: any) {
      addLog({
        type: 'SYSTEM',
        message: `Failed to resume pipeline: ${err.message}`,
      });
    }
  };


  const toggleDir = (dirPath: string) => {
    setExpandedDirs((prev) => ({
      ...prev,
      [dirPath]: !prev[dirPath],
    }));
  };

  // Select file in tree
  const handleSelectFile = async (filepath: any) => {
    const pathStr = normalizeFilePath(filepath);
    if (!pathStr) return;
    selectedFileRef.current = pathStr;
    setSelectedFile(pathStr);
    if (conversationId) {
      localStorage.setItem(`selectedFile_${conversationId}`, pathStr);
    }

    // If this file is currently actively streaming outflow live, display current streaming content immediately
    if (agentActivityState === 'synthesizing_outflow' && activeStreamingFile === pathStr && streamingFileContent.trim().length > 0) {
      setFileContent(streamingFileContent);
      return;
    }

    setFileContent('// Loading file content...');

    try {
      // 1. Try reading from filesystem
      const diskRes = await fetch(`/api/conversations/${conversationId}/files/read?file=${encodeURIComponent(pathStr)}`);
      if (diskRes.ok) {
        const fileData = await diskRes.json();
        if (fileData.content) {
          setFileContent(fileData.content);
          return;
        }
      }

      // 2. Fallback to DB outputs (both Coder files and stage specification outputs e.g. plan.md, requirements.md)
      const res = await fetch(`/api/conversations/${conversationId}`);
      if (res.ok) {
        const data = await res.json();

        // 2a. Check if this path matches a stage specification artifact in VFS_OUTPUT_MAP
        const targetAgent = STAGE_FILE_TO_AGENT[pathStr];
        if (targetAgent && Array.isArray(data.outputs)) {
          const stageOutput = data.outputs.find((o: any) => o.agentName === targetAgent || o.stage === targetAgent);
          if (stageOutput) {
            const parsed = safeParseJson(stageOutput.validatedJson);
            const content = parsed?.content || (typeof stageOutput.validatedJson === 'string' ? stageOutput.validatedJson : '');
            if (content && content.trim().length > 0) {
              setFileContent(content);
              return;
            }
          }
        }

        const coderOutputs = data.outputs.filter((o: any) => o.agentName === 'Coder');
        
        let foundContent = '';
        coderOutputs.forEach((out: any) => {
          const json = JSON.parse(out.validatedJson);
          if (json.file === filepath || out.stage === filepath) {
            foundContent = json.code;
          }
        });

        if (foundContent) {
          setFileContent(foundContent);
        } else {
          // Fallback template mock file if coder hasn't completed yet
          setFileContent(`// Compiled artifact: ${filepath}\n// Status: Awaiting Coder compiler pass.\n\nexport function ${getFileBasename(filepath).split('.')[0]}() {\n  return (\n    <div className="p-4 bg-slate-900 border border-slate-700">\n      <h1>Autogenerated Module Content</h1>\n    </div>\n  );\n}`);
        }
      }
    } catch (e) {
      setFileContent('// Error loading file contents.');
    }
  };


  return (
    <main className="flex-1 flex flex-col lg:flex-row bg-slate-950 overflow-y-auto lg:overflow-hidden relative h-auto lg:h-full">
      
      {/* Left Pane: Compiler Console & Controls (40%) */}
      <section className="w-full lg:w-[40%] flex flex-col border-r border-slate-700 bg-slate-900 overflow-hidden h-[500px] lg:h-full">
        {/* Panel Header */}
        <div className="p-3 border-b border-slate-700 flex justify-between items-center bg-slate-900">
          <div className="flex items-center gap-2">
            <TerminalIcon className="w-4 h-4 text-electric-indigo" />
            <span className="text-[10px] font-mono tracking-wider font-bold text-on-surface uppercase">Pipeline Interactions</span>
          </div>
          <div className="flex items-center gap-2">
            {pipelineStatus === 'Active' && agentActivityState === 'reading_inflow' && (
              <span className="px-2 py-0.5 bg-sky-500/10 border border-sky-500/40 rounded text-[10px] font-mono font-bold text-sky-400 flex items-center gap-1.5 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping"></span>
                📥 Reading Inflow
              </span>
            )}
            {pipelineStatus === 'Active' && agentActivityState === 'synthesizing_outflow' && (
              <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/40 rounded text-[10px] font-mono font-bold text-amber-400 flex items-center gap-1.5 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                📤 Synthesizing Outflow
              </span>
            )}
            <span className={`px-2 py-0.5 bg-slate-800 border border-slate-600 rounded text-[10px] font-mono font-bold text-slate-300`}>
              Pass: {currentStage}
            </span>
          </div>
        </div>

        <StageStatusBanners
          pipelineStatus={pipelineStatus}
          agentActivityState={agentActivityState}
          currentStage={currentStage}
          coderFileProgress={coderFileProgress}
          activeStreamingFile={activeStreamingFile}
          inflowDetail={inflowDetail}
          streamingFileContent={streamingFileContent}
          streamProgress={streamProgress}
        />

        {/* Console Log Feed */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 font-mono text-xs">
          {logs.length === 0 && (
            <div className="flex flex-col items-start gap-1">
              <div className="bg-slate-950 border border-slate-700 p-3 rounded-lg rounded-tl-none max-w-[90%]">
                <span className="text-electric-indigo font-bold">System Orchestrator</span>
                <p className="text-slate-300 mt-1">
                  {pipelineStatus === 'Active'
                    ? 'Connected to active compiler loop — receiving live telemetry...'
                    : pipelineStatus === 'Paused'
                    ? 'Pipeline compilation paused. Click Resume or provide input to continue.'
                    : pipelineStatus === 'Completed'
                    ? 'Pipeline compilation complete. All specifications synthesized.'
                    : 'Provide project details and hit run to compile the specifications.'}
                </p>
              </div>
            </div>
          )}

          {logs.map((log, idx) => {
            const isSystem = log.type === 'SYSTEM';
            const isComplete = log.type === 'AGENT_COMPLETE';
            const isError = log.type === 'AGENT_ERROR' || log.type === 'PIPELINE_ERROR';

            return (
              <div key={idx} className="flex flex-col items-start gap-1">
                <div className={`p-3 rounded-lg rounded-tl-none max-w-[95%] border ${
                  isError ? 'bg-red-950/20 border-red-500/30 text-red-300' :
                  isComplete ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' :
                  'bg-slate-950 border-slate-800 text-slate-300'
                }`}>
                  <span className="text-electric-indigo font-bold">
                    {log.agent ? `${log.agent} Agent` : 'System'}
                  </span>
                  <div className="text-[11px] mt-1 whitespace-pre-line">{log.message}</div>
                  {log.agent && log.type === 'AGENT_COMPLETE' && (log.data || agentOutputs[log.agent]) && (
                    <AgentOutputCard agentName={log.agent} rawData={log.data || agentOutputs[log.agent]} />
                  )}
                </div>
              </div>
            );
          })}
          <div ref={logEndRef} />
        </div>

        {/* Input Trigger Block */}
        <div className="p-3 border-t border-slate-700 bg-slate-900">
          <div className="flex gap-2">
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              disabled={pipelineStatus === 'Active'}
              className="flex-1 bg-slate-950 border border-slate-700 rounded p-2 text-xs font-mono text-on-surface focus:border-electric-indigo focus:ring-0 placeholder-slate-500 outline-none resize-none h-16 disabled:opacity-50"
              placeholder="Send prompt or refine instructions..."
            />
            <button
              onClick={async () => {
                if (pipelineStatus === 'Failed') {
                  handleRetryFailedPipeline();
                } else {
                  if (conversationId && promptText?.trim()) {
                    try {
                      await fetch(`/api/conversations/${conversationId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ originalPrompt: promptText.trim() }),
                      });
                    } catch (err) {
                      console.error('Failed to update conversation prompt before run:', err);
                    }
                  }
                  handleStartPipeline(false);
                }
              }}
              disabled={pipelineStatus === 'Active' || (!promptText.trim() && pipelineStatus !== 'Failed')}
              className="bg-electric-indigo text-white px-4 rounded flex flex-col justify-center items-center gap-1 hover:bg-indigo-500 transition-colors shadow-[0_0_8px_rgba(99,102,241,0.4)] disabled:opacity-50"
              title={pipelineStatus === 'Failed' ? 'Resume Pipeline' : 'Run Pipeline'}
            >
              <Play className="w-4 h-4 fill-white" />
              <span className="text-[9px] font-bold">{pipelineStatus === 'Failed' ? 'RESUME' : 'RUN'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Right Pane: Multi-Tab Workspace (60%) */}
      <section className="w-full lg:w-[60%] flex flex-col bg-slate-900 relative border-l border-slate-700 h-[600px] lg:h-full">
        {/* Tabs Headers */}
        <div className="flex border-b border-slate-700 bg-slate-900 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('flowchart')}
            className={`px-4 py-2 text-xs font-mono font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'flowchart' ? 'text-electric-indigo border-electric-indigo bg-slate-950' : 'text-slate-400 border-transparent hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <Compass className="w-4 h-4" /> Flowchart
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`px-4 py-2 text-xs font-mono font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'code' ? 'text-electric-indigo border-electric-indigo bg-slate-950' : 'text-slate-400 border-transparent hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <Code className="w-4 h-4" /> Code Explorer
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 text-xs font-mono font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'preview' ? 'text-electric-indigo border-electric-indigo bg-slate-950' : 'text-slate-400 border-transparent hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <Eye className="w-4 h-4" /> Live Preview
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-hidden relative bg-slate-950">
          
          {activeTab === 'flowchart' && (
            <FlowchartTab
              agentOutputs={agentOutputs}
              logs={logs}
              currentStage={currentStage}
              pipelineStatus={pipelineStatus}
              promptText={promptText}
              files={files}
              modules={modules}
              entities={entities}
              streamProgress={streamProgress}
            />
          )}

          {activeTab === 'code' && (
            <CodeExplorerTab
              conversationId={conversationId}
              activeTitle={activeTitle}
              files={files}
              selectedFile={selectedFile}
              fileContent={fileContent}
              expandedDirs={expandedDirs}
              toggleDir={toggleDir}
              onSelectFile={handleSelectFile}
              activeStreamingFile={activeStreamingFile}
              agentActivityState={agentActivityState}
              pipelineStatus={pipelineStatus}
              currentStage={currentStage}
              coderFileProgress={coderFileProgress}
              inflowDetail={inflowDetail}
            />
          )}

          {activeTab === 'preview' && (
            <LivePreviewTab
              previewDoc={previewDoc}
              previewLoading={previewLoading}
              pipelineStatus={pipelineStatus}
              activeTitle={activeTitle}
              onReload={loadLivePreview}
            />
          )}



        </div>

        {/* Telemetry live streams bottom dock */}
        <div className="border-t border-slate-700 bg-slate-950 h-32 flex flex-col flex-shrink-0">
          <div className="px-3 py-1.5 border-b border-slate-700 flex justify-between items-center bg-slate-900">
            <span className="text-[10px] font-mono tracking-wider font-bold text-slate-400 flex items-center gap-1.5 uppercase">
              <Activity className="w-3.5 h-3.5 text-electric-indigo" /> Live Telemetry
            </span>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${pipelineStatus === 'Active' ? 'bg-indigo-500 animate-ping' : 'bg-slate-500'}`} />
              <span className="text-[10px] font-mono text-slate-500 uppercase">{pipelineStatus}</span>
            </div>
          </div>
          <div className="flex-1 p-2 overflow-y-auto font-mono text-[10px] text-slate-500 space-y-1 bg-slate-950/70">
            {logs.map((log, idx) => (
              <div key={idx} className="flex gap-2">
                <span className="text-slate-600">[{log.timestamp}]</span>
                <span className={`${
                  log.type === 'PIPELINE_ERROR' ? 'text-red-400' :
                  log.type === 'AGENT_COMPLETE' ? 'text-emerald-400' :
                  'text-slate-400'
                }`}>
                  [{log.agent || 'SYSTEM'}]
                </span>
                <span>{log.message}</span>
              </div>
            ))}
          </div>
        </div>

        <WorkspaceModals
          needsClarification={needsClarification}
          clarificationQuestions={clarificationQuestions}
          clarificationAnswers={clarificationAnswers}
          setClarificationAnswers={setClarificationAnswers}
          onClarificationSubmit={handleClarificationSubmit}
          needsConflictResolution={needsConflictResolution}
          conflictData={conflictData}
          selectedConflictOption={selectedConflictOption}
          setSelectedConflictOption={setSelectedConflictOption}
          onConflictSubmit={handleConflictSubmit}
          pipelineStatus={pipelineStatus}
          currentStage={currentStage}
          isRetrying={isRetrying}
          onApproveGate={handleApproveGate}
          onRetryFailedPipeline={handleRetryFailedPipeline}
          onExitHome={() => router.push('/')}
        />

      </section>
    </main>
  );
}
