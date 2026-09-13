'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useApp, LogMessage } from '@/context/AppContext';
import Editor from '@monaco-editor/react';
import {
  Play,
  Pause,
  RefreshCw,
  Folder,
  FileCode,
  Compass,
  Code,
  Eye,
  Activity,
  User,
  Settings,
  Database,
  ArrowRight,
  HelpCircle,
  Cpu,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Download,
  Gavel,
  Terminal as TerminalIcon,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
}

const buildFileTree = (fileList: string[]): FileNode => {
  const root: FileNode = { name: 'Root', path: '', isDirectory: true, children: [] };
  
  fileList.forEach((file) => {
    const parts = file.split('/');
    let current = root;
    
    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1;
      const partPath = parts.slice(0, index + 1).join('/');
      
      let child = current.children?.find((c) => c.name === part);
      if (!child) {
        child = {
          name: part,
          path: partPath,
          isDirectory: !isLast,
          children: isLast ? undefined : [],
        };
        current.children?.push(child);
      }
      current = child;
    });
  });

  const sortTree = (node: FileNode) => {
    if (node.children) {
      node.children.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
      node.children.forEach(sortTree);
    }
  };

  sortTree(root);
  return root;
};

function parseModulesFromMarkdown(markdown: string): any[] {
  if (!markdown) return [];
  const modules: any[] = [];
  const modulesSection = markdown.split(/### Modules/i)[1]?.split(/###/)[0] || '';
  const blocks = modulesSection.split(/(?=\*\*([^*]+)\*\*)/g);

  let current: any = null;
  blocks.forEach((block) => {
    const nameMatch = block.match(/^\*\*([^*]+)\*\*/);
    if (nameMatch) {
      if (current) modules.push(current);
      current = {
        name: nameMatch[1].trim(),
        responsibility: '',
        ownedFiles: [],
        dependsOn: 'None',
        supportsFeatures: '',
      };

      const respMatch = block.match(/-\s*Responsibility:\s*(.+)/i);
      if (respMatch) current.responsibility = respMatch[1].trim();

      const filesMatch = block.match(/-\s*Owned Files:\s*(.+)/i);
      if (filesMatch) {
        current.ownedFiles = filesMatch[1]
          .split(/[,;\s]+/)
          .map((f) => f.replace(/[`'"]/g, '').trim())
          .filter(Boolean);
      }

      const depMatch = block.match(/-\s*Depends On:\s*(.+)/i);
      if (depMatch) current.dependsOn = depMatch[1].trim();

      const featMatch = block.match(/-\s*Supports Features:\s*(.+)/i);
      if (featMatch) current.supportsFeatures = featMatch[1].trim();
    }
  });
  if (current) modules.push(current);
  return modules;
}

function getSimpleFileExplanation(fileName: string, moduleResp?: string) {
  const base = fileName.toLowerCase();
  if (base.endsWith('index.html')) {
    return {
      easyName: 'Main Webpage Screen (HTML)',
      role: 'Entry Point & Layout',
      why: 'This is the main screen of your project. It contains all buttons, text boxes, and layout elements that the user sees in their browser.',
    };
  }
  if (base.endsWith('.css')) {
    return {
      easyName: 'Visual Design & Colors (CSS)',
      role: 'Theme & Styling',
      why: 'Controls colors, fonts, spacing, shadows, and animations so the app looks clean, modern, and easy to use.',
    };
  }
  if (base.endsWith('.js') || base.endsWith('.ts') || base.endsWith('.jsx') || base.endsWith('.tsx')) {
    return {
      easyName: 'Interactive Logic & Behavior (JS/TS)',
      role: 'App Logic',
      why: moduleResp || 'Handles user clicks, state calculations, button actions, and dynamic page updates.',
    };
  }
  if (base.endsWith('package.json')) {
    return {
      easyName: 'Project Settings & Dependencies (JSON)',
      role: 'Configuration',
      why: 'Tells Node.js what libraries, external packages, and scripts are needed to build and run the application.',
    };
  }
  if (base.endsWith('.md')) {
    return {
      easyName: 'AI Architectural Document (Markdown)',
      role: 'Specification',
      why: 'Stores AI-generated blueprints, requirements, tech stack decisions, and project summaries.',
    };
  }
  return {
    easyName: 'Component / Utility File',
    role: 'Supporting Module',
    why: moduleResp || 'Provides auxiliary functions, helper utilities, or data processing for the application.',
  };
}

function unwrapStageData(raw: any): any {
  if (!raw) return null;
  let data = raw;
  if (data.outflow && typeof data.outflow === 'object') data = data.outflow;
  if (data.validatedJson) {
    if (typeof data.validatedJson === 'object') data = data.validatedJson;
    else if (typeof data.validatedJson === 'string') {
      try { data = JSON.parse(data.validatedJson); } catch {}
    }
  }

  if (data && typeof data === 'object' && typeof data.content === 'string') {
    const trimmed = data.content.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        return { ...data, ...parsed };
      } catch {}
    }
    const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      try {
        const parsed = JSON.parse(codeBlockMatch[1]);
        return { ...data, ...parsed };
      } catch {}
    }
  }
  return data;
}

function extractStageMetrics(stage: string, rawData: any, promptText: string, allFiles: string[] = []) {
  if (!rawData) return null;
  const data = unwrapStageData(rawData);
  const text = typeof data === 'string' ? data : (data?.content || JSON.stringify(data || {}));

  switch (stage) {
    case 'Queen': {
      const rawProjName = data?.projectName || data?.project?.name || text.match(/Project Name:\s*(.+)/i)?.[1] || text.match(/Project:\s*(.+)/i)?.[1];
      const cleanedProjName = rawProjName ? rawProjName.replace(/^#+\s*/, '').replace(/Context Snapshot/i, '').trim() : '';
      const projName = cleanedProjName || 'Defined';
      const includedCount = Array.isArray(data?.mvpScope?.included) ? data.mvpScope.included.length : (text.match(/[-*]\s+Include/gi) || text.match(/^[-*]\s+.+$/gm) || []).length;
      return {
        inflow: promptText ? `Prompt (${promptText.length} chars)` : 'Natural User Prompt',
        outflow: `Project: ${projName} | ${includedCount > 0 ? `${includedCount} Scope Items` : 'MVP Scope Defined'}`,
      };
    }
    case 'Planner': {
      let featuresCount = Array.isArray(data?.features) ? data.features.length : 0;
      if (featuresCount === 0) {
        featuresCount = (text.match(/^[-*]\s+.+$/gm) || text.match(/Feature\s*\d+/gi) || text.match(/-\s*Priority:/gi) || []).length;
      }
      const tech = data?.recommendedTechStack?.frontend || text.match(/Frontend:\s*(.+)/i)?.[1] || text.match(/Tech Stack:\s*(.+)/i)?.[1] || 'HTML5/JS/CSS';
      return {
        inflow: `Queen Spec & Scope`,
        outflow: `${featuresCount || 3} Features Planned | Tech: ${tech}`,
      };
    }
    case 'Architect': {
      let modulesCount = Array.isArray(data?.modules) ? data.modules.length : 0;
      if (modulesCount === 0) {
        const parsed = parseModulesFromMarkdown(text);
        const moduleHeaders = (text.match(/###?\s+(?:Module\s*\d+:?|[A-Za-z0-9_]+\s+Module|System Module|UI Module|[A-Z][a-zA-Z0-9_\s]+Module)/gi) || []).length;
        const boldModules = (text.match(/\*\*(?:Module\s*\d+:?|[A-Z][a-zA-Z0-9_\s]+Module|[A-Z][a-zA-Z0-9_\s]+Service|Frontend|Backend|Database)\*\*/gi) || []).length;
        modulesCount = Math.max(parsed.length, moduleHeaders, boldModules, (text.match(/-\s*Responsibility:/gi) || []).length);
      }
      return {
        inflow: `Planner Reqs & Features`,
        outflow: `${modulesCount || 3} Architectural Modules & Dependency Hierarchy`,
      };
    }
    case 'System': {
      let entityMatches = Array.isArray(data?.entities) ? data.entities.length : 0;
      if (entityMatches === 0) {
        const prismaModels = (text.match(/model\s+[A-Z][a-zA-Z0-9_]+/gi) || []).length;
        const entityBullets = (text.match(/(?:Entity|Table|Model|Schema):\s*[A-Z][a-zA-Z0-9_]+/gi) || []).length;
        const bulletEntities = (text.match(/^[-*]\s+\*\*([A-Z][a-zA-Z0-9_]+)\*\*/gm) || []).length;
        entityMatches = Math.max(prismaModels, entityBullets, bulletEntities, (text.match(/model\s+[A-Z]/gi) || []).length);
      }
      const apiMatches = Array.isArray(data?.apis) ? data.apis.length : (text.match(/(GET|POST|PUT|DELETE|PATCH)\s+\/[^\s\n]+/gi) || text.match(/Route:\s*\/[^\s\n]+/gi) || []).length;
      return {
        inflow: `Architect Structure & Modules`,
        outflow: `${entityMatches || 2} DB Entities | ${apiMatches || 3} API Routes`,
      };
    }
    case 'Designer': {
      let compMatches = Array.isArray(data?.components) ? data.components.length : 0;
      if (compMatches === 0) {
        const componentHeaders = (text.match(/###?\s+(?:[A-Z][a-zA-Z0-9_]+ Component|[A-Z][a-zA-Z0-9_]+ Screen|[A-Z][a-zA-Z0-9_]+ Page|[A-Z][a-zA-Z0-9_]+ Modal)/gi) || []).length;
        const boldComponents = (text.match(/\*\*([A-Z][a-zA-Z0-9_]+ (?:Component|Screen|Page|View|Modal))\*\*/gi) || []).length;
        const bulletComponents = (text.match(/-\s*(?:Component|Screen|Page|Modal):\s*.+/gi) || []).length;
        compMatches = Math.max(componentHeaders, boldComponents, bulletComponents, (text.match(/Component\s*\d+/gi) || []).length);
      }
      return {
        inflow: `System DB Schema & API Spec`,
        outflow: `${compMatches || 4} UI Components | Design Tokens & Layouts`,
      };
    }
    case 'Blueprinter': {
      const fileMatches = Array.isArray(data?.fileManifest) ? data.fileManifest.length : (text.match(/^File:\s*([^\s\n]+)/gm) || text.match(/```[a-z]*\s*file:\s*([^\s\n]+)/gi) || text.match(/=== [A-Z._]+ ===/g) || []).length;
      return {
        inflow: `Full Spec Suite (Plan, Reqs, Arch, System, UI)`,
        outflow: `${fileMatches || 5} Files Planned with Code Specifications`,
      };
    }
    case 'Coder': {
      const generatedCount = allFiles.length > 0 ? allFiles.length : (text.match(/Completed/gi) || []).length;
      return {
        inflow: `Blueprint Manifest & Code Specifications`,
        outflow: `${generatedCount || 5} Source Code Files Synthesized & VFS Synced`,
      };
    }
    case 'Tester': {
      const passed = data?.passed ?? (text.match(/PASSED/g) || []).length;
      const failed = data?.failed ?? (text.match(/FAILED/g) || []).length;
      return {
        inflow: `Synthesized Source Code & AST Linter Rules`,
        outflow: `${passed} Passed, ${failed} Failed | Diagnostics Complete`,
      };
    }
    case 'Debugger': {
      const repaired = data?.repairedCount ?? (text.match(/repaired|fixed/gi) || []).length;
      return {
        inflow: `Linter Diagnostics & Failing Source Code`,
        outflow: `${repaired || 0} Files Repaired via Differential Patches`,
      };
    }
    case 'Security': {
      const status = data?.overallStatus || (text.includes('PASSED') ? 'PASSED' : 'REVIEW');
      return {
        inflow: `Full Specification Suite & Synthesized Source Code`,
        outflow: `Security Status: ${status}`,
      };
    }
    case 'Reviewer': {
      const assessment = data?.overallAssessment || (text.includes('APPROVED') || text.includes('PASSED') ? 'PASSED' : 'QUALITY GATE');
      return {
        inflow: `Security Report & Synthesized Source Code`,
        outflow: `Quality Gate Decision: ${assessment}`,
      };
    }
    default:
      return {
        inflow: 'Upstream Pipeline Context',
        outflow: 'Stage execution completed',
      };
  }
}

export default function WorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationId = searchParams.get('id');
  const initialPrompt = searchParams.get('prompt') || '';

  const {
    ollamaConnected,
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
  const [fileContent, setFileContent] = useState<string>('// Select a file to view content');
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

  // SSE Stream controller
  const eventSourceRef = useRef<EventSource | null>(null);
  const logEndRef = useRef<HTMLDivElement | null>(null);
  const didConnectRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);

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

  // Auto-start or auto-resume pipeline if loaded and status is Active or Paused (or Idle with initial prompt)
  useEffect(() => {
    if (detailsLoaded && !didConnectRef.current) {
      if (pipelineStatus === 'Active' || pipelineStatus === 'Paused') {
        didConnectRef.current = true;
        handleStartPipeline(true);
      } else if (pipelineStatus === 'Idle' && initialPrompt) {
        didConnectRef.current = true;
        handleStartPipeline(false);
      }
    }
  }, [detailsLoaded, pipelineStatus, initialPrompt]);

  // Live polling effect during active pipeline execution to keep file tree and active code view updated without manual reloads
  useEffect(() => {
    if (!conversationId || pipelineStatus !== 'Active') return;

    const pollInterval = setInterval(() => {
      fetchConversationDetails(conversationId);
    }, 2500);

    return () => clearInterval(pollInterval);
  }, [conversationId, pipelineStatus, selectedFile]);

  // Handle scroll to bottom of logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Load details from DB
  const fetchConversationDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`);
      if (res.ok) {
        const data = await res.json();
        setPipelineStatus(data.status);
        setCurrentStage(data.currentStage);
        if (data.title) {
          setActiveTitle(data.title);
        }

        // Load SML data if exists
        loadSMLData(data.outputs);

        // Populate logs from database execution history
        if (data.history && data.history.length > 0) {
          const mappedLogs: LogMessage[] = data.history.map((h: any) => {
            let type = 'AGENT_LOG';
            const logMsg = h.logs || '';
            
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
          setFiles(normalizedDiskFiles);
          
          // Auto-expand all folder paths in tree view so code files are immediately visible
          const autoExpand: Record<string, boolean> = {};
          normalizedDiskFiles.forEach((f: string) => {
            const parts = f.split('/');
            for (let i = 1; i < parts.length; i++) {
              autoExpand[parts.slice(0, i).join('/')] = true;
            }
          });
          setExpandedDirs((prev) => ({ ...autoExpand, ...prev }));
          
          // Auto-select first file if none selected, or restore from localStorage / refresh open file
          const targetFile = selectedFile || localStorage.getItem(`selectedFile_${id}`) || normalizedDiskFiles[0];
          if (targetFile && normalizedDiskFiles.includes(targetFile)) {
            if (selectedFile !== targetFile) {
              setSelectedFile(targetFile);
            }
            // Fetch live content for open file
            const diskRes = await fetch(`/api/conversations/${id}/files/read?file=${encodeURIComponent(targetFile)}`);
            if (diskRes.ok) {
              const fileData = await diskRes.json();
              if (fileData.content !== undefined) {
                setFileContent(fileData.content);
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

  const safeParseJson = (val: any) => {
    if (!val) return null;
    if (typeof val === 'object') return val;
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  const loadSMLData = (outputs: any[]) => {
    // Populate agent outputs map
    const outputsMap: Record<string, any> = {};
    outputs.forEach((o) => {
      const parsed = safeParseJson(o.validatedJson);
      if (parsed) {
        outputsMap[o.agentName] = parsed;
      }
    });
    setAgentOutputs((prev) => ({ ...prev, ...outputsMap }));

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
  const handleStartPipeline = (isResume = false) => {
    if (!conversationId) return;
    if (!isResume && !ollamaConnected) {
      alert('Please start Ollama locally before initiating pipeline.');
      return;
    }

    if (!isResume) {
      clearLogs();
    }
    setPipelineStatus('Active');
    if (!isResume) {
      addLog({ type: 'SYSTEM', message: 'Initializing RuFlo specification compiler...' });
    } else {
      addLog({ type: 'SYSTEM', message: 'Re-connecting to active compiler loop...' });
    }

    // Clean URL query params to prevent auto-starting on refresh/reload
    if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
      const cleanUrl = window.location.pathname + `?id=${conversationId}`;
      window.history.replaceState({}, '', cleanUrl);
    }

    // Close existing EventSource if active
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Establish SSE stream
    const url = `/api/pipeline/stream?conversationId=${conversationId}&prompt=${encodeURIComponent(promptText)}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

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

      if (data.type === 'AGENT_STREAM_PROGRESS') {
        setStreamProgress(data.data);
        return;
      }

      if (data.type === 'AGENT_START') {
        setStreamProgress(null);
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
          if (data.agent && data.data) {
            setAgentOutputs((prev) => ({
              ...prev,
              [data.agent]: data.data,
            }));
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

      if (data.type === 'PIPELINE_COMPLETE' || data.type === 'PIPELINE_SUCCESS' || data.type === 'PIPELINE_ERROR') {
        setPipelineStatus(data.type === 'PIPELINE_ERROR' ? 'Failed' : 'Completed');
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
        addLog({ type: 'PIPELINE_ERROR', message: `Max compiler connection reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Stopping stream reconnect loop.` });
        setPipelineStatus('Failed');
        return;
      }

      // Check database to see if pipeline is still actively compiling
      try {
        const res = await fetch(`/api/conversations/${conversationId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'Active') {
            const backoffMs = Math.min(1000 * Math.pow(2, attempts - 1), 16000);
            addLog({ type: 'SYSTEM', message: `Stream connection tickle detected (Attempt ${attempts}/${MAX_RECONNECT_ATTEMPTS}). Re-connecting in ${backoffMs / 1000}s...` });
            setTimeout(() => {
              handleStartPipeline(true);
            }, backoffMs);
            return;
          } else if (data.status === 'Paused' || data.status === 'Completed' || data.status === 'Failed') {
            setPipelineStatus(data.status);
            return;
          }
        }
      } catch (e) {
        // Fallback if DB check fails
      }

      addLog({ type: 'PIPELINE_ERROR', message: 'Connection to compiler service lost.' });
      setPipelineStatus('Failed');
    };
  };

  // Listen to resume events from top bar
  useEffect(() => {
    const handleResume = () => {
      handleStartPipeline(true);
    };
    window.addEventListener('pipeline-resumed', handleResume);
    return () => window.removeEventListener('pipeline-resumed', handleResume);
  }, [conversationId, promptText]);

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

  const getFileBasename = (f: any): string => {
    if (!f) return '';
    if (typeof f === 'string') {
      return f.split('/').pop() || '';
    }
    if (typeof f === 'object' && f !== null) {
      if (typeof f.path === 'string') {
        return f.path.split('/').pop() || '';
      }
      if (typeof f.file === 'string') {
        return f.file.split('/').pop() || '';
      }
    }
    return String(f);
  };

  const normalizeFilePath = (f: any): string => {
    if (!f) return '';
    if (typeof f === 'string') return f;
    if (typeof f === 'object') {
      if (typeof f.path === 'string') return f.path;
      if (typeof f.file === 'string') return f.file;
    }
    return String(f);
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts':
      case 'tsx':
        return <FileCode className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />;
      case 'js':
      case 'jsx':
        return <FileCode className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />;
      case 'json':
        return <Settings className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />;
      case 'html':
        return <FileCode className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />;
      case 'css':
        return <FileCode className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />;
      default:
        return <FileCode className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />;
    }
  };

  const toggleDir = (dirPath: string) => {
    setExpandedDirs((prev) => ({
      ...prev,
      [dirPath]: !prev[dirPath],
    }));
  };

  const renderFileNode = (node: FileNode, depth = 0): React.ReactNode => {
    if (node.isDirectory) {
      const isExpanded = !!expandedDirs[node.path];
      return (
        <div key={node.path} className="flex flex-col">
          <button
            onClick={() => toggleDir(node.path)}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            className="w-full py-1 pr-3 flex items-center gap-1.5 text-[11px] font-mono text-slate-350 hover:bg-slate-800/60 transition-colors text-left group select-none cursor-pointer"
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 text-slate-500 group-hover:text-slate-300 transition-colors" />
            ) : (
              <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-slate-300 transition-colors" />
            )}
            {isExpanded ? (
              <FolderOpen className="w-3.5 h-3.5 text-blue-400/80 flex-shrink-0" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-blue-400/80 flex-shrink-0" />
            )}
            <span className="truncate group-hover:text-white transition-colors">{node.name}</span>
          </button>
          {isExpanded && node.children && (
            <div className="flex flex-col">
              {node.children.map((child) => renderFileNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    } else {
      const isSelected = selectedFile === node.path;
      return (
        <button
          key={node.path}
          onClick={() => handleSelectFile(node.path)}
          style={{ paddingLeft: `${depth * 12 + 20}px` }}
          className={`w-full py-1 pr-3 flex items-center gap-1.5 text-[11px] font-mono hover:bg-slate-800/60 transition-colors text-left group cursor-pointer ${
            isSelected ? 'bg-slate-800 text-electric-indigo font-semibold border-r-2 border-electric-indigo' : 'text-slate-400'
          }`}
        >
          {getFileIcon(node.name)}
          <span className={`truncate group-hover:text-slate-200 transition-colors ${isSelected ? 'text-electric-indigo' : ''}`}>
            {node.name}
          </span>
        </button>
      );
    }
  };

  // Select file in tree
  const handleSelectFile = async (filepath: any) => {
    const pathStr = normalizeFilePath(filepath);
    if (!pathStr) return;
    setSelectedFile(pathStr);
    if (conversationId) {
      localStorage.setItem(`selectedFile_${conversationId}`, pathStr);
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

      // 2. Fallback to DB outputs
      const res = await fetch(`/api/conversations/${conversationId}`);
      if (res.ok) {
        const data = await res.json();
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

  const renderAgentOutputCard = (agentName: string, rawData: any) => {
    if (!rawData) return null;
    let data = safeParseJson(rawData);
    if (!data) {
      if (typeof rawData === 'string' && rawData.trim().length > 0) {
        data = { content: rawData };
      } else {
        return null;
      }
    }

    // Handle all-markdown output cards for Hybrid v2 pipeline
    if (typeof data.content === 'string' && !data.project && !data.architecture && !data.features) {
      const STAGE_CONFIG: Record<string, { icon: string; title: string; color: string }> = {
        Queen:       { icon: '👑', title: 'Project Plan', color: 'text-purple-400' },
        Planner:     { icon: '📋', title: 'Requirements', color: 'text-indigo-400' },
        Architect:   { icon: '🏗️', title: 'Architecture', color: 'text-violet-400' },
        System:      { icon: '⚙️', title: 'Backend Spec', color: 'text-blue-400' },
        Designer:    { icon: '🎨', title: 'UI/UX Spec', color: 'text-pink-400' },
        Blueprinter: { icon: '📐', title: 'Blueprint', color: 'text-cyan-400' },
        Coder:       { icon: '💻', title: 'Generated Files', color: 'text-amber-400' },
        Tester:      { icon: '🧪', title: 'Test Report', color: 'text-emerald-400' },
        Debugger:    { icon: '🔧', title: 'Debug Report', color: 'text-orange-400' },
        Security:    { icon: '🛡️', title: 'Security Audit', color: 'text-red-400' },
        Reviewer:    { icon: '📝', title: 'Code Review', color: 'text-purple-400' },
      };

      const cfg = STAGE_CONFIG[agentName] || { icon: '📄', title: agentName, color: 'text-slate-300' };

      return (
        <div className="mt-3 p-3 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-300 space-y-2 select-text w-full max-w-md">
          <div className={`text-xs font-bold ${cfg.color}`}>{cfg.icon} {cfg.title}</div>
          <div className="text-[11px] text-slate-300 font-mono whitespace-pre-wrap max-h-60 overflow-y-auto p-2 bg-slate-950/60 rounded border border-slate-800">
            {data.content}
          </div>
        </div>
      );
    }

    if (data.outflow && typeof data.outflow === 'object') {
      data = data.outflow;
    } else if (data.parsedJson && typeof data.parsedJson === 'object') {
      data = data.parsedJson;
    }

    switch (agentName) {
      case 'Queen': {
        if (data.contextType === 'validationError' || data.status === 'Rejected') {
          return (
            <div className="mt-3 p-3 bg-slate-900 border border-red-500/40 rounded-lg text-slate-300 space-y-2 w-full max-w-md select-text">
              <div className="text-xs font-bold text-red-400">👑 Queen Input Rejection</div>
              <div className="text-[11px] text-red-300 bg-red-950/25 border border-red-950 p-2.5 rounded">
                <strong>Reason:</strong> {data.reason || 'Invalid Prompt'}
                <p className="mt-1 text-slate-450 font-sans leading-relaxed">{data.message}</p>
              </div>
            </div>
          );
        }
        const name = data.project?.name || data.projectName || 'Project';
        const id = data.project?.id || data.mvpId || 'N/A';
        const problem = data.project?.problemStatement || data.problemStatement || '';
        const included = data.scope?.mvp?.included || data.mvpScope?.included || [];
        const excluded = data.scope?.mvp?.excluded || data.mvpScope?.excluded || [];

        return (
          <div className="mt-3 p-3 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-300 space-y-2 select-text w-full max-w-md">
            <div className="text-xs font-bold text-electric-indigo">👑 Queen Project Definition</div>
            <div className="text-[11px] grid grid-cols-2 gap-x-2 gap-y-1">
              <span className="text-slate-500">MVP ID:</span> <span>{id}</span>
              <span className="text-slate-500">Project Name:</span> <span>{name}</span>
            </div>
            {problem && (
              <div className="text-[11px] text-slate-400 mt-1 border-t border-slate-850 pt-1">
                <strong>Problem:</strong> {problem}
              </div>
            )}
            <div className="text-[10px] grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-850">
              <div>
                <span className="text-emerald-400 font-bold">✓ Included:</span>
                <ul className="list-disc pl-3 text-slate-400 space-y-0.5 mt-0.5">
                  {Array.isArray(included) && included.slice(0, 3).map((item: string, i: number) => <li key={i}>{typeof item === 'string' ? item : JSON.stringify(item)}</li>)}
                </ul>
              </div>
              <div>
                <span className="text-red-400 font-bold">✗ Excluded:</span>
                <ul className="list-disc pl-3 text-slate-400 space-y-0.5 mt-0.5">
                  {Array.isArray(excluded) && excluded.slice(0, 3).map((item: string, i: number) => <li key={i}>{typeof item === 'string' ? item : JSON.stringify(item)}</li>)}
                </ul>
              </div>
            </div>
          </div>
        );
      }

      case 'Planner': {
        const extractTech = (techVal: any) => {
          if (!techVal) return '';
          if (typeof techVal === 'string') return techVal;
          if (typeof techVal === 'object') {
            return techVal.framework || techVal.language || techVal.type || techVal.provider || Object.values(techVal)[0] || '';
          }
          return String(techVal);
        };

        const frontendTech = extractTech(data.recommendedTechStack?.frontend || data.technology?.frontend) || 'HTML/JS';
        const backendTech = extractTech(data.recommendedTechStack?.backend || data.technology?.backend) || 'Node.js';
        const dbTech = extractTech(data.recommendedTechStack?.database || data.technology?.database) || 'SQLite';

        const features = Array.isArray(data.features) ? data.features : [];

        return (
          <div className="mt-3 p-3 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-300 space-y-2 select-text w-full max-w-md">
            <div className="text-xs font-bold text-indigo-400">📋 Planner Implementation Plan</div>
            <div className="text-[11px] border-b border-slate-855 pb-2">
              <strong>Recommended Tech Stack:</strong> {frontendTech} / {backendTech} / {dbTech}
            </div>
            <div className="text-[11px] space-y-1">
              <strong>Planned Features list:</strong> ({features.length})
              <div className="space-y-1 mt-1 max-h-32 overflow-y-auto">
                {features.map((f: any, i: number) => {
                  const featName = f.name || f.title || f.description || f.id || `Feature ${i + 1}`;
                  const featPriority = f.priority || 'MEDIUM';
                  return (
                    <div key={i} className="flex justify-between items-center text-[10px] bg-slate-955 p-1.5 rounded border border-slate-800">
                      <span className="truncate max-w-[260px]">{featName}</span>
                      <span className="px-1.5 py-0.2 bg-indigo-955 text-indigo-300 border border-indigo-800 rounded text-[8px] font-bold">{featPriority}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      }

      case 'Architect': {
        const style = data.architecture?.style || data.architectureStyle || 'Layered Architecture';
        const conventions = data.projectConventions?.namingConvention || 'Standard';
        const modules = Array.isArray(data.modules) ? data.modules : [];

        return (
          <div className="mt-3 p-3 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-300 space-y-2 select-text w-full max-w-md">
            <div className="text-xs font-bold text-blue-400">🏗 Architect Blueprint</div>
            <div className="text-[11px] grid grid-cols-2 gap-1 border-b border-slate-855 pb-2">
              <div><strong>Style:</strong> {style}</div>
              <div><strong>Conventions:</strong> {conventions}</div>
            </div>
            <div className="text-[11px] space-y-1">
              <strong>Modules Map:</strong> ({modules.length})
              <div className="space-y-1 mt-1 max-h-32 overflow-y-auto">
                {modules.map((m: any, i: number) => {
                  const modName = m.name || m.id || `Module ${i + 1}`;
                  const modPurpose = m.description || m.purpose || '';
                  const files = m.ownedFiles || m.files || [];
                  return (
                    <div key={i} className="text-[10px] bg-slate-955 p-1.5 rounded border border-slate-800">
                      <div className="font-bold text-blue-300">{modName}</div>
                      {modPurpose && <div className="text-slate-500 mt-0.5 text-[9px]">{modPurpose}</div>}
                      {Array.isArray(files) && files.length > 0 && (
                        <div className="text-slate-400 mt-1 flex flex-wrap gap-1">
                          {files.map((f: any, j: number) => {
                            const pathStr = typeof f === 'string' ? f : f.path || f.name || '';
                            return <span key={j} className="px-1 bg-slate-900 border border-slate-850 rounded text-[8px] font-mono">{getFileBasename(pathStr)}</span>;
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      }

      case 'System': {
        const dbType = data.database?.type || data.database?.provider || 'JSON / Memory';
        const apis = Array.isArray(data.apis) ? data.apis : [];

        return (
          <div className="mt-3 p-3 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-300 space-y-2 select-text w-full max-w-md">
            <div className="text-xs font-bold text-purple-400">⚙ System Backend Blueprint</div>
            <div className="text-[11px] border-b border-slate-855 pb-1.5">
              <strong>Database Type:</strong> {dbType}
            </div>
            <div className="text-[10px] space-y-1">
              <div className="text-slate-400 font-bold">API Routes Designed: ({apis.length})</div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {apis.map((api: any, i: number) => {
                  const method = api.method || 'GET';
                  const route = api.route || api.path || api.name || '';
                  return (
                    <div key={i} className="flex gap-2 items-center bg-slate-955 p-1.5 rounded border border-slate-800 font-mono">
                      <span className={`px-1 rounded text-[8px] font-bold ${
                        method === 'GET' ? 'bg-blue-955 text-blue-300 border border-blue-800' : 'bg-green-955 text-green-300 border border-green-800'
                      }`}>{method}</span>
                      <span className="text-slate-300">{route}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      }

      case 'Designer': {
        const theme = data.designSystem?.theme || data.designSystem?.designStyle || data.designPhilosophy?.theme || 'Modern UI';
        const pages = Array.isArray(data.pages) ? data.pages : [];

        return (
          <div className="mt-3 p-3 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-300 space-y-2 select-text w-full max-w-md">
            <div className="text-xs font-bold text-pink-400">🎨 Designer UI/UX System</div>
            <div className="text-[11px] grid grid-cols-2 gap-1 border-b border-slate-855 pb-1.5">
              <div><strong>Theme:</strong> {theme}</div>
              <div><strong>Pages Designed:</strong> {pages.length}</div>
            </div>
            <div className="text-[10px] space-y-1">
              <div className="text-slate-400 font-bold">Pages & Reusable Components:</div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {pages.map((p: any, i: number) => {
                  const pageName = p.name || p.route || p.id || `Page ${i + 1}`;
                  const pagePurpose = p.purpose || p.description || '';
                  return (
                    <div key={i} className="bg-slate-955 p-1.5 rounded border border-slate-850">
                      <span className="text-pink-300 font-bold">{pageName}</span>
                      {pagePurpose && <span className="text-slate-500 text-[9px] ml-2">({pagePurpose})</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      }

      case 'Coder': {
        const generatedFiles = Array.isArray(data.generatedFiles) ? data.generatedFiles : (data.file ? [data.file] : []);
        const filesCount = data.generationSummary?.filesGenerated || generatedFiles.length;
        const status = data.generationSummary?.status || data.implementation?.status || 'SUCCESS';

        return (
          <div className="mt-3 p-3 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-300 space-y-2 select-text w-full max-w-md font-mono">
            <div className="text-xs font-bold text-amber-400 font-sans">💻 Coder Synthesized Files</div>
            <div className="text-[11px] grid grid-cols-2 gap-1 border-b border-slate-855 pb-1.5 font-sans">
              <div><strong>Files Generated:</strong> {filesCount}</div>
              <div><strong>Status:</strong> <span className="text-emerald-400 font-bold">{status}</span></div>
            </div>
            <div className="text-[10px] space-y-1">
              <div className="text-slate-400 font-bold font-sans">Compiled File Tree:</div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {generatedFiles.map((f: any, i: number) => {
                  const filePath = f.path || (typeof f === 'string' ? f : '');
                  const fileLang = f.language || f.type || 'js';
                  return (
                    <div key={i} className="flex justify-between items-center bg-slate-955 p-1.5 rounded border border-slate-850">
                      <span className="text-slate-300 text-[9px]">{filePath}</span>
                      <span className="px-1 bg-slate-900 border border-slate-800 rounded text-[8px] text-slate-550">{fileLang}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      }

      case 'Tester': {
        const summary = data.summary || data.testReport?.summary || {};
        const passed = summary.passedTests ?? summary.passed ?? 0;
        const failed = summary.failedTests ?? summary.failed ?? 0;
        const total = summary.totalTests ?? (passed + failed);
        const defects = Array.isArray(data.defects) ? data.defects : (Array.isArray(data.testReport?.defects) ? data.testReport.defects : []);

        return (
          <div className="mt-3 p-3 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-300 space-y-2 select-text w-full max-w-md">
            <div className="text-xs font-bold text-emerald-400">🧪 Tester Quality Report</div>
            <div className="text-[11px] grid grid-cols-3 gap-1 border-b border-slate-850 pb-1.5">
              <div><strong>Passed:</strong> <span className="text-emerald-400 font-bold">{passed}</span></div>
              <div><strong>Failed:</strong> <span className="text-red-400 font-bold">{failed}</span></div>
              <div><strong>Total:</strong> <span className="text-blue-400 font-bold">{total}</span></div>
            </div>
            {defects.length > 0 ? (
              <div className="text-[10px] space-y-1 mt-1">
                <div className="text-red-400 font-bold">Defects Identified: ({defects.length})</div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {defects.map((def: any, i: number) => (
                    <div key={i} className="bg-slate-955 p-1.5 rounded border border-red-950 text-red-300">
                      <strong>{def.id || `DEF-${i + 1}`}:</strong> {def.title || def.description}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                ✓ All tests parsed and compiled cleanly with 0 defects.
              </div>
            )}
          </div>
        );
      }

      case 'Debugger': {
        const summary = data.summary || data.debugReport?.summary || {};
        const resolved = summary.resolvedDefects ?? summary.issuesResolved ?? 0;
        const remaining = summary.remainingDefects ?? summary.remainingIssues ?? 0;
        const fixes = Array.isArray(data.fixes) ? data.fixes : (Array.isArray(data.debugReport?.issues) ? data.debugReport.issues : []);

        return (
          <div className="mt-3 p-3 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-300 space-y-2 select-text w-full max-w-md">
            <div className="text-xs font-bold text-rose-400">🔧 Debugger Repair Report</div>
            <div className="text-[11px] grid grid-cols-2 gap-1 border-b border-slate-855 pb-1.5 font-bold">
              <div>Resolved: <span className="text-emerald-400">{resolved}</span></div>
              <div>Remaining: <span className="text-rose-400">{remaining}</span></div>
            </div>
            {fixes.length > 0 && (
              <div className="text-[10px] space-y-1 max-h-32 overflow-y-auto mt-1">
                {fixes.map((fix: any, i: number) => (
                  <div key={i} className="bg-slate-955 p-1.5 rounded border border-slate-800">
                    <div className="text-rose-300 font-bold">Fix for {fix.defectId || fix.testerDefectId || `Fix ${i + 1}`}:</div>
                    <div className="text-slate-400 mt-0.5">{fix.resolution || fix.rootCause || 'Applied code repair'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }

      case 'Security': {
        const summary = data.summary || data.securityReport?.summary || {};
        const overallStatus = summary.overallSecurityStatus || 'SECURE';
        const score = summary.securityScore ?? 100;
        const vulns = Array.isArray(data.vulnerabilities) ? data.vulnerabilities : (Array.isArray(data.securityReport?.issues) ? data.securityReport.issues : []);

        return (
          <div className="mt-3 p-3 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-300 space-y-2 select-text w-full max-w-md">
            <div className="text-xs font-bold text-teal-400 flex justify-between items-center">
              <span>🛡 Security Audit Report</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-teal-955 border border-teal-800 rounded text-teal-300">{overallStatus} ({score}/100)</span>
            </div>
            {vulns.length > 0 ? (
              <div className="text-[10px] space-y-1 mt-1 max-h-32 overflow-y-auto">
                {vulns.map((v: any, i: number) => (
                  <div key={i} className="bg-slate-955 p-1.5 rounded border border-slate-800">
                    <span className="text-teal-300 font-bold">{v.category || v.severity || 'Vulnerability'}</span> - <span className="text-slate-400">{v.title || v.description}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[10px] text-teal-400 font-bold">
                ✓ 0 vulnerabilities detected in security audit scan.
              </div>
            )}
          </div>
        );
      }

      case 'Reviewer': {
        const summary = data.summary || {};
        const qualityScore = data.qualityScore ?? 100;
        const annotations = Array.isArray(data.annotations) ? data.annotations : (Array.isArray(data.findings) ? data.findings : []);

        return (
          <div className="mt-3 p-3 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-300 space-y-2 select-text w-full max-w-md">
            <div className="text-xs font-bold text-emerald-400 flex justify-between items-center">
              <span>🔍 Code Quality Reviewer</span>
              <span className="px-2 py-0.5 bg-emerald-955 border border-emerald-800 rounded font-bold text-emerald-400 text-xs">{qualityScore} / 100</span>
            </div>
            {annotations.length > 0 && (
              <div className="text-[10px] space-y-1 mt-1 max-h-32 overflow-y-auto">
                {annotations.map((ann: any, i: number) => (
                  <div key={i} className="bg-slate-955 p-1.5 rounded border border-slate-800">
                    <span className={`font-bold uppercase text-[7px] px-1 rounded mr-1 ${
                      ann.severity === 'error' || ann.severity === 'HIGH' ? 'bg-red-950 text-red-400 border border-red-900' :
                      ann.severity === 'warn' || ann.severity === 'MEDIUM' ? 'bg-yellow-950 text-yellow-400 border border-yellow-900' :
                      'bg-blue-950 text-blue-400 border border-blue-900'
                    }`}>{ann.severity || 'INFO'}</span>
                    <span className="text-slate-300">{ann.note || ann.description || ann.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  };

  const getLanguage = (filepath: any) => {
    const pathStr = typeof filepath === 'string' ? filepath : normalizeFilePath(filepath);
    if (!pathStr) return 'plaintext';
    if (pathStr.endsWith('.tsx') || pathStr.endsWith('.jsx')) return 'typescript';
    if (pathStr.endsWith('.ts') || pathStr.endsWith('.js')) return 'typescript';
    if (pathStr.endsWith('.css')) return 'css';
    if (pathStr.endsWith('.json')) return 'json';
    return 'plaintext';
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
          <span className={`px-2 py-0.5 bg-slate-800 border border-slate-600 rounded text-[10px] font-mono font-bold text-slate-300`}>
            Pass: {currentStage}
          </span>
        </div>

        {streamProgress && (
          <div className="bg-slate-950 border-b border-slate-800 px-3 py-2 flex flex-col gap-1.5 select-none transition-all">
            <div className="flex justify-between items-center text-[9px] font-mono text-slate-400">
              <span className="text-electric-indigo font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-electric-indigo animate-ping" />
                🧠 {currentStage} Agent Thinking & Generating...
              </span>
              <span className="bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded text-slate-300 font-mono font-bold">
                {streamProgress.tokenCount} / {streamProgress.maxTokens} tkn
              </span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
              <div 
                className="bg-gradient-to-r from-electric-indigo via-purple-500 to-emerald-400 h-full transition-all duration-300"
                style={{ width: `${Math.min(100, (streamProgress.tokenCount / (streamProgress.maxTokens || 1)) * 100)}%` }}
              />
            </div>
            {streamProgress.latestText && (
              <div className="mt-1 bg-slate-900/90 border border-indigo-500/30 rounded p-2.5 text-[10px] font-mono text-slate-300 max-h-36 overflow-y-auto whitespace-pre-wrap font-mono scrollbar-thin shadow-inner">
                <div className="flex justify-between items-center text-[8px] uppercase tracking-wider mb-1.5 text-indigo-400 font-bold border-b border-slate-800 pb-1">
                  <span>⚡ LIVE REASONING & TOKEN FEED {streamProgress.targetFile ? `(Target: ${streamProgress.targetFile})` : `(${currentStage})`}</span>
                  <span className="text-slate-500 font-normal">{(streamProgress.latestText || '').length} bytes</span>
                </div>
                <div className="text-slate-200 leading-relaxed font-mono">
                  {streamProgress.latestText.slice(-800)}
                  <span className="inline-block w-1.5 h-3 bg-electric-indigo ml-0.5 animate-pulse" />
                </div>
              </div>
            )}
          </div>
        )}

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
                    renderAgentOutputCard(log.agent, log.data || agentOutputs[log.agent])
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
              onClick={() => handleStartPipeline(false)}
              disabled={pipelineStatus === 'Active' || !promptText.trim()}
              className="bg-electric-indigo text-white px-4 rounded flex flex-col justify-center items-center gap-1 hover:bg-indigo-500 transition-colors shadow-[0_0_8px_rgba(99,102,241,0.4)] disabled:opacity-50"
              title="Run Pipeline"
            >
              <Play className="w-4 h-4 fill-white" />
              <span className="text-[9px] font-bold">RUN</span>
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
          
          {/* Flowchart Tab */}
          {activeTab === 'flowchart' && (
            <div className="w-full h-full overflow-y-auto p-6 flex flex-col gap-6 items-center justify-start">
              {/* RuFlo 11-Stage Live Agent Inflow ➔ Outflow Pipeline Data Flow Map */}
              <div className="w-full max-w-4xl bg-slate-900/80 border border-electric-indigo/40 rounded-xl p-5 shadow-[0_0_30px_rgba(99,102,241,0.15)] flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Compass className="w-5 h-5 text-electric-indigo" />
                    <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider">RuFlo Multi-Agent Live Data Flow (Inflow ➔ Outflow Map)</h4>
                  </div>
                  <span className="bg-electric-indigo/10 border border-electric-indigo/30 text-electric-indigo text-[10px] px-2.5 py-0.5 rounded font-mono font-bold">
                    11-Stage Pipeline
                  </span>
                </div>

                <p className="text-xs text-slate-400">
                  Live data flow tracking showing what context enters each agent (<strong>Inflow</strong>) and what structured specification or code output is synthesized (<strong>Outflow</strong>).
                </p>

                {(() => {
                  const STAGE_ORDER = ['Queen', 'Planner', 'Architect', 'System', 'Designer', 'Blueprinter', 'Coder', 'Tester', 'Debugger', 'Security', 'Reviewer'];
                  const DYNAMIC_STAGES = new Set(['Coder', 'Tester', 'Debugger']);

                  const specStagesOnly = STAGE_ORDER.filter(s => !DYNAMIC_STAGES.has(s));
                  const highestCompletedSpecIndex = Math.max(
                    -1,
                    ...specStagesOnly.map((s) => (agentOutputs[s] || logs.some(l => l.agent === s && l.type === 'AGENT_COMPLETE')) ? STAGE_ORDER.indexOf(s) : -1)
                  );

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {STAGE_ORDER.map((stage, stageIdx) => {
                        const outputData = agentOutputs[stage];
                        const isDynamic = DYNAMIC_STAGES.has(stage);
                        const isCompleted = !!outputData || logs.some(l => l.agent === stage && l.type === 'AGENT_COMPLETE') || (!isDynamic && highestCompletedSpecIndex >= stageIdx && highestCompletedSpecIndex !== -1);
                        const isActive = currentStage === stage && pipelineStatus === 'Active' && (!isCompleted || isDynamic);
                        const icon = { Queen: '👑', Planner: '📋', Architect: '📐', System: '⚙️', Designer: '🎨', Blueprinter: '🗺️', Coder: '💻', Tester: '🧪', Debugger: '🛠️', Security: '🛡️', Reviewer: '🔍' }[stage] || '🤖';
                        const metrics = extractStageMetrics(stage, outputData, promptText, files);

                    return (
                      <div key={stage} className={`p-3 rounded-lg border flex flex-col gap-2 transition-all ${
                        isActive 
                          ? 'bg-indigo-950/40 border-electric-indigo shadow-[0_0_20px_rgba(99,102,241,0.25)] animate-pulse' 
                          : isCompleted 
                          ? 'bg-slate-950/80 border-slate-800' 
                          : 'bg-slate-950/40 border-slate-900 opacity-60'
                      }`}>
                        <div className="flex justify-between items-center text-xs font-bold">
                          <span className="flex items-center gap-1.5">
                            <span>{icon}</span>
                            <span className="text-slate-200">{stage}</span>
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                            isActive ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' :
                            isCompleted ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            'bg-slate-900 text-slate-500'
                          }`}>
                            {isActive ? 'COMPILING...' : isCompleted ? 'DONE' : 'WAITING'}
                          </span>
                        </div>

                        {/* Inflow section */}
                        <div className="text-[10px] bg-slate-900/60 p-2 rounded border border-slate-850 flex flex-col gap-1">
                          <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                            <span>📥 Inflow</span> <span className="text-slate-500 font-normal">(Upstream Context)</span>
                          </span>
                          <span className="text-slate-400 truncate">
                            {metrics ? metrics.inflow : (
                              stage === 'Queen' ? (promptText ? `Prompt (${promptText.length} chars)` : 'Natural User Prompt') :
                              'Upstream Context'
                            )}
                          </span>
                        </div>

                        {/* Outflow section */}
                        <div className="text-[10px] bg-slate-900/60 p-2 rounded border border-slate-850 flex flex-col gap-1">
                          <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                            <span>📤 Outflow</span> <span className="text-slate-500 font-normal">(Synthesized Output)</span>
                          </span>
                          <span className="text-slate-300 truncate">
                            {!outputData && streamProgress && streamProgress.agent === stage ? (
                              `Streaming tokens (${streamProgress.tokenCount || 0})...`
                            ) : !outputData ? (
                              'Pending execution...'
                            ) : metrics ? (
                              metrics.outflow
                            ) : (
                              'Output synthesized successfully'
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

              {(() => {
                const speculativeApis = streamProgress?.apis && streamProgress.apis.length > 0
                  ? streamProgress.apis
                  : Array.from((streamProgress?.latestText || '').matchAll(/(GET|POST|PUT|DELETE|PATCH)\s+(\/[a-zA-Z0-9_\-\/]+)/gi))
                      .map((m: any) => ({ method: (m[1] as string).toUpperCase(), route: m[2] as string }));

                const speculativeEntities = streamProgress?.entities && streamProgress.entities.length > 0
                  ? streamProgress.entities
                  : Array.from(new Set(Array.from((streamProgress?.latestText || '').matchAll(/(?:model|entity|table|struct)\s+([A-Z][a-zA-Z0-9]+)/gi)).map((m: any) => m[1] as string)));

                const speculativeFiles = streamProgress?.files && streamProgress.files.length > 0
                  ? streamProgress.files
                  : Array.from(new Set(Array.from((streamProgress?.latestText || '').matchAll(/(?:File:|Path:|`)([a-zA-Z0-9_\-\/]+\.(?:html|css|js|ts|jsx|tsx|json|md))/gi)).map((m: any) => m[1] as string)));

                if (streamProgress) {
                  return (
                    <div className="w-full max-w-4xl bg-slate-900/60 border border-slate-700/80 rounded-xl p-6 flex flex-col gap-6 shadow-[0_4px_30px_rgba(0,0,0,0.3)] backdrop-blur-md relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-electric-indigo/5 to-purple-500/5 pointer-events-none" />
                      
                      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-electric-indigo animate-ping" />
                          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Live Spec Compiler HUD ({currentStage})</span>
                        </div>
                        <div className="text-[10px] text-indigo-400 font-mono">
                          {streamProgress.tokenCount} / {streamProgress.maxTokens} tokens
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                        <div 
                          className="bg-gradient-to-r from-electric-indigo to-purple-500 h-full transition-all duration-300 ease-out" 
                          style={{ width: `${Math.min(100, (streamProgress.tokenCount / streamProgress.maxTokens) * 100)}%` }} 
                        />
                      </div>

                      {/* Speculative elements visualization */}
                      <div className="flex flex-col gap-4">
                        {/* Live API endpoints list */}
                        {speculativeApis.length > 0 && (
                          <div className="flex flex-col gap-2">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                              <TerminalIcon className="w-3.5 h-3.5 text-electric-indigo" /> Speculatively Mapped API Routes
                            </div>
                            <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                              {speculativeApis.map((api: any, idx: number) => (
                                <div key={idx} className="flex gap-2 items-center bg-slate-950/80 border border-slate-850 p-2 rounded-lg font-mono text-[10px] animate-pulse">
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                                    api.method === 'GET' ? 'bg-blue-955 text-blue-300 border border-blue-800' : 'bg-green-955 text-green-300 border border-green-800'
                                  }`}>{api.method}</span>
                                  <span className="text-slate-300">{api.route}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Live Entities list */}
                        {speculativeEntities.length > 0 && (
                          <div className="flex flex-col gap-2 mt-2">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                              <Database className="w-3.5 h-3.5 text-cyan-400" /> Speculatively Designed DB Entities
                            </div>
                            <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                              {speculativeEntities.map((name: string, idx: number) => (
                                <div key={idx} className="bg-slate-950 border border-slate-850 p-2 rounded-lg text-[10px] text-center font-bold text-cyan-300 animate-pulse">
                                  {name}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Live Files list */}
                        {speculativeFiles.length > 0 && (
                          <div className="flex flex-col gap-2 mt-2">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                              <Cpu className="w-3.5 h-3.5 text-emerald-400" /> Speculatively Planned Files
                            </div>
                            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                              {speculativeFiles.map((file: string, idx: number) => (
                                <code key={idx} className="px-1.5 py-0.5 bg-slate-950 border border-slate-855 rounded text-[9px] text-emerald-300 font-mono animate-pulse">
                                  {getFileBasename(file)}
                                </code>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Live Code & Specification Compiler Stream Viewer */}
                      {streamProgress.latestText && (
                        <div className="flex flex-col gap-2 mt-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                              <FileCode className="w-3.5 h-3.5 text-electric-indigo" />
                              Compiling Live Code {streamProgress.targetFile ? `➔ ${streamProgress.targetFile}` : `(${currentStage})`}
                            </span>
                            <span className="text-[9px] text-indigo-400 font-mono font-bold">
                              {(streamProgress.latestText || '').length} bytes compiled live
                            </span>
                          </div>

                          <div className="bg-slate-955 border border-slate-800 rounded-lg p-3.5 font-mono text-[11px] text-slate-200 overflow-y-auto max-h-80 select-text relative shadow-inner leading-relaxed">
                            <div className="whitespace-pre-wrap">
                              {streamProgress.latestText}
                              <span className="inline-block w-2 h-3.5 bg-electric-indigo animate-pulse ml-0.5 align-middle" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }

                if (pipelineStatus === 'Active') {
                  return (
                    <div className="w-full max-w-4xl bg-slate-900/60 border border-slate-700/80 rounded-xl p-6 flex flex-col gap-4 shadow-[0_4px_30px_rgba(0,0,0,0.3)] backdrop-blur-md relative overflow-hidden text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-electric-indigo animate-ping" />
                        <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Live Spec Compiler Active</span>
                      </div>
                      <div className="text-sm font-semibold text-indigo-300">
                        Executing Stage: <span className="font-mono text-purple-400">{currentStage || 'Initializing...'}</span>
                      </div>
                      <div className="text-xs text-slate-400">
                        Synthesizing application specifications and mapping system flowchart...
                      </div>
                    </div>
                  );
                }

                if (modules.length === 0 && files.length === 0) {
                  return (
                    <div className="text-xs text-slate-500 py-12 flex flex-col items-center gap-2 justify-center h-full">
                      <Database className="w-12 h-12 text-slate-800" />
                      <span>Architecture flowchart will load here after the Architect stage compiles.</span>
                    </div>
                  );
                }

                return null;
              })() || (
                <div className="w-full max-w-3xl flex flex-col gap-6 pb-12">
                  {/* High Level Flowchart Header */}
                  <div className="bg-slate-900/80 border border-electric-indigo/40 rounded-xl p-5 shadow-[0_0_30px_rgba(99,102,241,0.15)] flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Compass className="w-5 h-5 text-electric-indigo" />
                        <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider">System Architecture &amp; File Flowchart</h4>
                      </div>
                      <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] px-2.5 py-0.5 rounded font-mono font-bold">
                        {files.length > 0 ? `${files.length} Files Mapped` : `${modules.length} Modules`}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300">
                      Below is the plain-English flowchart of your application showing <strong>what files exist and why</strong>, how they interact, and their responsibilities.
                    </p>

                    {/* Flow Diagram Pipeline */}
                    <div className="grid grid-cols-4 gap-2 pt-2 text-[10px] font-mono font-bold text-center">
                      <div className="bg-blue-500/10 border border-blue-500/30 text-blue-400 p-2.5 rounded-lg flex flex-col items-center gap-1">
                        <span>🌐 1. Browser Entry</span>
                        <span className="text-[9px] font-normal text-slate-400">index.html</span>
                      </div>
                      <div className="bg-purple-500/10 border border-purple-500/30 text-purple-400 p-2.5 rounded-lg flex flex-col items-center gap-1">
                        <span>🎨 2. Visual Design</span>
                        <span className="text-[9px] font-normal text-slate-400">style.css</span>
                      </div>
                      <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-2.5 rounded-lg flex flex-col items-center gap-1">
                        <span>⚡ 3. Application Logic</span>
                        <span className="text-[9px] font-normal text-slate-400">JS / TS Logic</span>
                      </div>
                      <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 p-2.5 rounded-lg flex flex-col items-center gap-1">
                        <span>🗄️ 4. Data &amp; State</span>
                        <span className="text-[9px] font-normal text-slate-400">API &amp; Store</span>
                      </div>
                    </div>
                  </div>



                  {/* Entities Schema */}
                  {entities.length > 0 && (
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
                      <h5 className="text-xs font-bold text-slate-300 border-b border-slate-800 pb-2 flex items-center gap-2">
                        <Database className="w-4 h-4 text-cyan-400" /> Database Entities Schema
                      </h5>
                      <div className="grid grid-cols-3 gap-2">
                        {entities.map((entity) => (
                          <div key={entity.name} className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-[10px]">
                            <div className="font-bold text-cyan-300 mb-1">{entity.name}</div>
                            <div className="flex flex-col text-slate-400 gap-0.5 font-mono">
                              {entity.fields?.map((f: any) => (
                                <div key={f.name}>{f.name}: {f.type}</div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Code Explorer Tab */}
          {activeTab === 'code' && (
            <div className="w-full h-full flex overflow-hidden">
              {/* File Tree Left sidebar */}
              <div className="w-48 bg-slate-900 border-r border-slate-700 flex flex-col overflow-y-auto flex-shrink-0">
                <div className="p-2 border-b border-slate-805 text-[10px] font-mono font-bold text-slate-400 flex justify-between items-center select-none">
                  <span>FILE EXPLORER</span>
                  {files.length > 0 && (
                    <a
                      href={`/api/conversations/${conversationId}/download`}
                      download
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer"
                      title="Download Project ZIP"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
                {files.length === 0 ? (
                  <div className="p-4 text-[10px] text-slate-500">No files generated yet.</div>
                ) : (
                  <div className="py-2 flex flex-col gap-0.5">
                    {/* Workspace Root Folder Header */}
                    <div className="px-3 py-1.5 text-[10px] font-mono font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wide border-b border-slate-800 mb-1 select-none">
                      <Database className="w-3 h-3 text-electric-indigo" />
                      <span className="truncate">{activeTitle || 'project-root'}</span>
                    </div>
                    {buildFileTree(files).children?.map((child) => renderFileNode(child, 0))}
                  </div>
                )}
              </div>

              {/* Editor Right container */}
              <div className="flex-1 h-full overflow-hidden flex flex-col bg-slate-950">
                {selectedFile && (
                  <div className="p-2 border-b border-slate-800 text-[11px] font-mono text-slate-500 bg-slate-950">
                    Active: {selectedFile}
                  </div>
                )}
                <div className="flex-1 w-full h-full overflow-hidden">
                  <Editor
                    height="100%"
                    theme="vs-dark"
                    language={selectedFile ? getLanguage(selectedFile) : 'typescript'}
                    value={fileContent}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 12,
                      fontFamily: 'JetBrains Mono',
                      domReadOnly: true,
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Live Preview Tab */}
          {activeTab === 'preview' && (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
              {pipelineStatus !== 'Completed' ? (
                <div className="text-xs text-slate-500 flex flex-col items-center gap-2">
                  <Eye className="w-12 h-12 text-slate-800 animate-pulse" />
                  <span>Waiting for pipeline execution to complete code generation before rendering app preview.</span>
                </div>
              ) : (
                <div className="w-full h-full bg-slate-900 border border-slate-700 rounded-lg flex flex-col overflow-hidden">
                  {/* Frame Header Browser bar */}
                  <div className="bg-slate-950 border-b border-slate-800 p-2 flex items-center gap-2 text-xs text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500/80"></span>
                    <div className="bg-slate-900 border border-slate-800 rounded px-4 py-0.5 text-[10px] w-64 truncate mx-auto">
                      http://localhost:8080/preview
                    </div>
                  </div>
                  <div className="flex-1 bg-white flex flex-col relative">
                    <iframe
                      src="http://localhost:8080"
                      className="w-full h-full border-0 bg-white"
                      title="Live Preview"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
                    />
                  </div>
                </div>
              )}
            </div>
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

        {/* Clarification Overlay Modal */}
        {needsClarification && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-amber-warning/50 rounded-lg p-6 max-w-md w-full flex flex-col gap-4 shadow-[0_0_30px_rgba(245,158,11,0.2)] animate-slide-up">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <HelpCircle className="w-5 h-5 text-amber-500" />
                <h4 className="font-bold text-md text-on-surface">Queen Orchestrator Clarification</h4>
              </div>
              <p className="text-xs text-slate-300">
                To construct a stable implementation plan, please resolve the following architectural queries:
              </p>
              
              <div className="flex flex-col gap-3">
                {clarificationQuestions.map((q, idx) => (
                  <div key={idx} className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-400">{q}</label>
                    <input
                      type="text"
                      value={clarificationAnswers[idx]}
                      onChange={(e) => {
                        const next = [...clarificationAnswers];
                        next[idx] = e.target.value;
                        setClarificationAnswers(next);
                      }}
                      className="bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-on-surface focus:border-amber-500 outline-none"
                      placeholder="Your response..."
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={handleClarificationSubmit}
                  className="bg-amber-warning text-slate-950 px-4 py-2 rounded text-xs font-bold hover:bg-amber-400 transition-colors flex items-center gap-1 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                >
                  Submit Answers <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Conflict Resolution Overlay Modal */}
        {needsConflictResolution && conflictData && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-red-500/50 rounded-lg p-6 max-w-lg w-full flex flex-col gap-4 shadow-[0_0_30px_rgba(239,68,68,0.2)] animate-slide-up">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
                <h4 className="font-bold text-md text-on-surface text-red-400">Context Conflict Detected</h4>
              </div>
              <p className="text-xs text-slate-300">
                The context resolver identified a misalignment in requirements/architectures:
              </p>
              <div className="p-3 bg-red-950/20 border border-red-900/40 rounded text-xs text-red-300/90 leading-relaxed font-mono">
                {conflictData.description}
              </div>
              
              <div className="flex flex-col gap-2.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Select Alignment Strategy:</label>
                {conflictData.options.map((opt: string, idx: number) => {
                  const isRecommended = opt === conflictData.recommendedOption;
                  const isSelected = selectedConflictOption === opt;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedConflictOption(opt)}
                      className={`w-full p-3 rounded text-left text-xs transition-all border flex flex-col gap-1 ${
                        isSelected 
                          ? 'bg-electric-indigo/20 border-electric-indigo text-on-surface shadow-[0_0_12px_rgba(99,102,241,0.2)]' 
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-semibold">{opt}</span>
                        {isRecommended && (
                          <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[8px] font-bold uppercase tracking-wider">Recommended</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={handleConflictSubmit}
                  disabled={!selectedConflictOption}
                  className={`px-4 py-2 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
                    selectedConflictOption
                      ? 'bg-red-500 text-slate-950 hover:bg-red-400 cursor-pointer shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  Resolve &amp; Resume <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Approval Gate Overlay Card */}
        {pipelineStatus === 'Paused' && currentStage === 'Architect' && (
          <div className="absolute inset-x-0 bottom-36 z-50 flex justify-center px-4 pointer-events-none">
            <div className="glass-panel w-full max-w-lg p-4 rounded-xl shadow-[0_0_30px_rgba(99,102,241,0.2)] flex flex-col gap-3 pointer-events-auto animate-slide-up">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Gavel className="w-5 h-5 text-electric-indigo animate-bounce" />
                  <h4 className="font-bold text-on-surface text-sm">Architect Review Complete</h4>
                </div>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 rounded text-[9px] font-bold font-mono uppercase">Ready</span>
              </div>
              <p className="text-xs text-slate-300">
                The architecture plan has been compiled into the SML. Review the structural flowchart tab above. Do you approve proceeding to database design and source code generation?
              </p>
              <div className="flex justify-end gap-2 mt-1">
                <button
                  onClick={() => router.push('/')}
                  className="px-3 py-1.5 border border-slate-600 rounded text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Reject &amp; Edit
                </button>
                <button
                  onClick={handleApproveGate}
                  className="px-3 py-1.5 bg-electric-indigo text-white rounded text-xs font-bold shadow-[0_0_12px_rgba(99,102,241,0.4)] hover:bg-indigo-400 transition-colors flex items-center gap-1.5"
                >
                  Approve &amp; Generate
                </button>
              </div>
            </div>
          </div>
        )}

      </section>
    </main>
  );
}
