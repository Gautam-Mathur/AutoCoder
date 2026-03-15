import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, MessageSquare, Trash2, MoreHorizontal, Terminal, PanelRightClose, PanelRight, Pencil, ShieldCheck, AlertTriangle, Sparkles, Bug, ChevronDown, ChevronRight, Wrench, Cpu, Settings, X, Download, Loader2 } from "lucide-react";
import { isWebContainerSupported, onPreWarmProgress, getPreWarmStatus } from "@/lib/code-runner/webcontainer";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import { ChatMessage } from "@/components/chat-message";
import { ChatInput } from "@/components/chat-input";
import { EmptyState } from "@/components/empty-state";
import { ThemeToggle } from "@/components/theme-toggle";
import { PreviewPanel } from "@/components/preview-panel";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { ThinkingStep } from "@/lib/code-generator";
import { autoFixCode } from "@/lib/code-generator/code-validator";
import type { Conversation, Message, ProjectFile } from "@shared/schema";

// Extract code files from AI response and save to project
async function saveCodeToProject(conversationId: number, aiResponse: string) {
  const files: { path: string; content: string; language: string }[] = [];

  // Check for multi-file format: --- FILE: path ---
  const multiFilePattern = /---\s*FILE:\s*([^\s]+)\s*---/gi;
  const multiFileMatches: RegExpExecArray[] = [];
  let match: RegExpExecArray | null;

  while ((match = multiFilePattern.exec(aiResponse)) !== null) {
    multiFileMatches.push(match);
  }

  // Handle multi-file format (even single file updates use this format now)
  if (multiFileMatches.length >= 1) {
    for (let i = 0; i < multiFileMatches.length; i++) {
      const m = multiFileMatches[i];
      const filePath = m[1];
      const startIndex = m.index + m[0].length;
      // For single file, find end markers like "**Changes made:**" or next file marker
      let endIndex: number;
      if (i < multiFileMatches.length - 1) {
        endIndex = multiFileMatches[i + 1].index;
      } else {
        // Find common end markers for single file updates
        const endMarkers = ["**Changes made:**", "**Changes:**", "\n\n**", "\n\nThe preview"];
        endIndex = aiResponse.length;
        for (const marker of endMarkers) {
          const markerIdx = aiResponse.indexOf(marker, startIndex);
          if (markerIdx !== -1 && markerIdx < endIndex) {
            endIndex = markerIdx;
          }
        }
      }

      let content = aiResponse.slice(startIndex, endIndex).trim();

      // Remove any trailing markdown/text that's not part of the code
      // Look for </html> or </body> as natural end points for HTML
      if (filePath.endsWith('.html')) {
        const htmlEndIdx = content.lastIndexOf('</html>');
        if (htmlEndIdx !== -1) {
          content = content.slice(0, htmlEndIdx + 7).trim();
        }
      }

      const ext = filePath.split('.').pop()?.toLowerCase() || 'text';
      const languageMap: Record<string, string> = {
        'js': 'javascript', 'ts': 'typescript', 'tsx': 'typescript', 'jsx': 'javascript',
        'css': 'css', 'html': 'html', 'json': 'json', 'md': 'markdown', 'py': 'python',
      };

      if (content && content.length > 20) {
        files.push({ path: filePath, content, language: languageMap[ext] || ext });
      }
    }
  }

  // If no files found from multi-file format, try code blocks
  if (files.length === 0) {
    // Extract individual code blocks
    const codeBlockPattern = /```(\w+)?\n([\s\S]*?)```/g;
    let blockMatch;
    let htmlCount = 0, cssCount = 0, jsCount = 0;

    while ((blockMatch = codeBlockPattern.exec(aiResponse)) !== null) {
      const lang = (blockMatch[1] || 'text').toLowerCase();
      const content = blockMatch[2].trim();

      if (!content || content.length < 20) continue;

      let path = '';
      let language = lang;

      if (lang === 'html') {
        path = htmlCount === 0 ? 'index.html' : `page${htmlCount + 1}.html`;
        htmlCount++;
      } else if (lang === 'css') {
        path = cssCount === 0 ? 'styles.css' : `styles${cssCount + 1}.css`;
        cssCount++;
      } else if (lang === 'javascript' || lang === 'js') {
        path = jsCount === 0 ? 'script.js' : `script${jsCount + 1}.js`;
        language = 'javascript';
        jsCount++;
      } else if (lang === 'typescript' || lang === 'ts') {
        path = 'app.ts';
        language = 'typescript';
      } else if (lang === 'python' || lang === 'py') {
        path = 'main.py';
        language = 'python';
      } else if (lang === 'json') {
        path = 'data.json';
      } else {
        continue;
      }

      files.push({ path, content, language });
    }
  }

  if (files.length > 0) {
    const fixedFiles = files.map(f => ({
      ...f,
      content: autoFixCode(f.content, f.path),
    }));
    try {
      await apiRequest("POST", `/api/conversations/${conversationId}/files/bulk`, { files: fixedFiles });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "files"] });
    } catch (error) {
      console.error("Error saving code to project:", error);
    }
  }
}

interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

// Extract and update project context from user messages and AI responses
async function updateProjectContextFromResponse(conversationId: number, userMessage: string, aiResponse: string) {
  try {
    // First fetch current conversation to get existing context
    const convRes = await fetch(`/api/conversations/${conversationId}`);
    const currentConv = convRes.ok ? await convRes.json() : null;

    const context: Record<string, unknown> = {};

    // Extract project name from user message (only if not already set)
    if (!currentConv?.projectName) {
      const namePatterns = [
        /(?:building|create|making|develop)\s+(?:a\s+)?(?:an?\s+)?["']?([A-Z][a-zA-Z0-9\s]+?)["']?\s+(?:app|website|dashboard|platform|tool|system)/i,
        /["']([A-Z][a-zA-Z0-9]+)["']\s+(?:is\s+(?:a|an)|will\s+be)/i,
        /(?:called|named)\s+["']?([A-Z][a-zA-Z0-9]+)["']?/i,
      ];

      for (const pattern of namePatterns) {
        const match = userMessage.match(pattern);
        if (match && match[1]) {
          context.projectName = match[1].trim();
          break;
        }
      }
    }

    // Extract tech stack from AI response
    const techKeywords = ['HTML', 'CSS', 'JavaScript', 'React', 'TypeScript'];
    const foundTech = techKeywords.filter(tech =>
      aiResponse.toLowerCase().includes(tech.toLowerCase())
    );
    if (foundTech.length > 0) {
      const existingTech = currentConv?.techStack || [];
      const combined = [...existingTech, ...foundTech];
      const uniqueTech = combined.filter((t, i) => combined.indexOf(t) === i);
      if (uniqueTech.length > existingTech.length) {
        context.techStack = uniqueTech;
      }
    }

    // Extract features from code
    const featurePatterns = [
      { pattern: /<nav|navigation|navbar/i, feature: 'Navigation' },
      { pattern: /<form|contact.*form/i, feature: 'Forms' },
      { pattern: /dashboard|admin.*panel/i, feature: 'Dashboard' },
      { pattern: /hero.*section|landing/i, feature: 'Hero Section' },
      { pattern: /settings|preferences/i, feature: 'Settings Panel' },
    ];

    const existingFeatures = currentConv?.featuresBuilt || [];
    const features = [...existingFeatures];
    for (const { pattern, feature } of featurePatterns) {
      if (pattern.test(aiResponse) && !features.includes(feature)) {
        features.push(feature);
      }
    }
    if (features.length > existingFeatures.length) {
      context.featuresBuilt = features;
    }

    // Only update if we found something new
    if (Object.keys(context).length > 0) {
      const res = await apiRequest("PUT", `/api/conversations/${conversationId}/context`, context);
      const updatedConv = await res.json();

      // Directly update the cache with the updated conversation
      queryClient.setQueryData<ConversationWithMessages>(
        ["/api/conversations", conversationId],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            projectName: updatedConv.projectName,
            projectDescription: updatedConv.projectDescription,
            techStack: updatedConv.techStack,
            featuresBuilt: updatedConv.featuresBuilt,
            projectSummary: updatedConv.projectSummary,
          };
        }
      );

      // Also refresh the conversations list
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    }
  } catch (error) {
    console.error("Error updating project context:", error);
  }
}

export default function Chat() {
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [streamingThinkingSteps, setStreamingThinkingSteps] = useState<ThinkingStep[]>([]);
  const [completedThinkingSteps, setCompletedThinkingSteps] = useState<Map<number, ThinkingStep[]>>(new Map());
  const [conversationPhase, setConversationPhase] = useState<string>("initial");
  const [approvalMessageId, setApprovalMessageId] = useState<number | null>(null);
  const [preWarmState, setPreWarmState] = useState<string>(getPreWarmStatus());
  const [preWarmMessage, setPreWarmMessage] = useState<string>('');
  const [recentEdits, setRecentEdits] = useState<{filePath: string; editType: string; description: string; linesChanged: number}[]>([]);
  const [validationSummary, setValidationSummary] = useState<{passes: number; issuesFound: number; issuesFixed: number; unfixableIssues: string[]} | null>(null);
  const [slmEnhanced, setSlmEnhanced] = useState<boolean>(false);
  const [slmStagesRun, setSlmStagesRun] = useState<string[]>([]);
  const [noAiBannerDismissed, setNoAiBannerDismissed] = useState(false);
  const [generationStage, setGenerationStage] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const { data: aiConfigStatus } = useQuery<{ baseUrl: string | null; model: string; hasApiKey: boolean; clientReady: boolean }>({
    queryKey: ["/api/ai/connection"],
    refetchInterval: 15000,
  });
  const [diagnostics, setDiagnostics] = useState<{
    totalIssues: number;
    bySeverity: { critical: number; error: number; warning: number; info: number };
    byFile: Record<string, { file: string; severity: string; type: string; message: string; line?: number; autoFixable: boolean }[]>;
    fileCount: number;
    healthyFiles: number;
    unhealthyFiles: number;
  } | null>(null);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [fixingFiles, setFixingFiles] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Prevent CMD+1/CMD+2 from interfering with the app
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === '1' || e.key === '2')) {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isWebContainerSupported()) {
      const unsubscribe = onPreWarmProgress((status, message) => {
        setPreWarmState(status);
        setPreWarmMessage(message);
      });
      return () => { unsubscribe(); };
    }
  }, []);

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const { data: activeConversation } = useQuery<ConversationWithMessages>({
    queryKey: ["/api/conversations", activeConversationId],
    enabled: !!activeConversationId,
  });

  const { data: conversationFiles = [] } = useQuery<ProjectFile[]>({
    queryKey: ["/api/conversations", activeConversationId, "files"],
    enabled: !!activeConversationId,
  });

  useEffect(() => {
    if (activeConversation?.messages && activeConversationId) {
      const stepsMap = new Map(completedThinkingSteps);
      let changed = false;
      for (const msg of activeConversation.messages) {
        if (msg.role === 'assistant' && msg.thinkingSteps && Array.isArray(msg.thinkingSteps) && (msg.thinkingSteps as any[]).length > 0) {
          if (!stepsMap.has(activeConversationId)) {
            stepsMap.set(activeConversationId, msg.thinkingSteps as any[]);
            changed = true;
          }
        }
      }
      if (changed) {
        setCompletedThinkingSteps(stepsMap);
      }
    }
  }, [activeConversation?.messages, activeConversationId]);

  useEffect(() => {
    if (activeConversation) {
      const phase = (activeConversation as any).conversationPhase || 'initial';
      setConversationPhase(phase);
      if ((phase === 'approval' || phase === 'planning') && activeConversation.messages?.length > 0) {
        const lastAssistant = [...activeConversation.messages].reverse().find((m: any) => m.role === 'assistant');
        if (lastAssistant) {
          setApprovalMessageId(lastAssistant.id);
        }
      } else {
        setApprovalMessageId(null);
      }
      const storedDiagnostics = (activeConversation as any).diagnostics;
      if (storedDiagnostics && storedDiagnostics.totalIssues > 0) {
        setDiagnostics(storedDiagnostics);
      }
    }
  }, [activeConversation]);

  const createConversationMutation = useMutation({
    mutationFn: async (title: string) => {
      const res = await apiRequest("POST", "/api/conversations", { title });
      return res.json();
    },
    onSuccess: (data: Conversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setActiveConversationId(data.id);
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/conversations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      if (activeConversationId === deleteConversationMutation.variables) {
        setActiveConversationId(null);
      }
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages, streamingContent]);

  const handleSendMessage = async (content: string) => {
    if (!activeConversationId) {
      const res = await apiRequest("POST", "/api/conversations", { title: content.slice(0, 50) });
      const newConversation = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setActiveConversationId(newConversation.id);

      setTimeout(() => sendMessageToConversation(newConversation.id, content), 100);
      return;
    }

    sendMessageToConversation(activeConversationId, content);
  };

  // Handle fix requests from the debug panel
  const handleRequestFix = useCallback((errorMessage: string, _code: string) => {
    if (!activeConversationId) return;

    const fixRequest = `Fix this error in the project: ${errorMessage}`;
    handleSendMessage(fixRequest);
  }, [activeConversationId]);

  const sendMessageToConversation = async (conversationId: number, content: string) => {
    setIsStreaming(true);
    setStreamingContent("");
    setValidationSummary(null);
    setSlmEnhanced(false);
    setSlmStagesRun([]);
    setDiagnostics(null);
    setDiagnosticsOpen(false);
    setStreamingThinkingSteps([]);
    setGenerationStage(null);
    setGenerationError(null);

    queryClient.setQueryData<ConversationWithMessages>(
      ["/api/conversations", conversationId],
      (old) => {
        if (!old) return old;
        return {
          ...old,
          messages: [
            ...old.messages,
            {
              id: Date.now(),
              conversationId,
              role: "user",
              content,
              thinkingSteps: null,
              createdAt: new Date(),
            },
          ],
        };
      }
    );

    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        let errorMsg = "Failed to send message";
        try {
          const errBody = await response.json();
          if (errBody.error) errorMsg = errBody.error;
        } catch {}
        throw new Error(errorMsg);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'thinking' && data.step) {
                setStreamingThinkingSteps(prev => [...prev, data.step]);
                const phaseMap: Record<string, string> = {
                  'orchestrator': 'Understanding',
                  'understand': 'Understanding',
                  'plan': 'Schema',
                  'learn': 'Schema',
                  'schema': 'Schema',
                  'kb': 'Schema',
                  'architect': 'Architecture',
                  'generate': 'Code',
                  'deep-quality': 'Quality',
                  'record': 'Quality',
                };
                const phase = data.step.phase;
                if (phase) {
                  setGenerationStage(phaseMap[phase] || phase);
                } else if (data.step.label) {
                  setGenerationStage(data.step.label);
                }
                continue;
              }

              if (data.error) {
                setGenerationError(data.error);
                setGenerationStage(null);
                continue;
              }

              if (data.content) {
                fullContent += data.content;
                setStreamingContent(fullContent);
              }
              if (data.done) {
                setGenerationStage(null);
                if (fullContent && !data.phase) {
                  await saveCodeToProject(conversationId, fullContent);
                }
                if (data.phase) {
                  setConversationPhase(data.phase);
                  if (data.showApproval && data.messageId) {
                    setApprovalMessageId(data.messageId);
                  } else {
                    setApprovalMessageId(null);
                  }
                }
                if (data.validationSummary) {
                  setValidationSummary(data.validationSummary);
                }
                setSlmEnhanced(data.slmEnhanced || false);
                setSlmStagesRun(data.slmStagesRun || []);
                if (data.diagnostics) {
                  setDiagnostics(data.diagnostics);
                  if (data.diagnostics.totalIssues > 0) {
                    setDiagnosticsOpen(true);
                  }
                }
                if (data.fileEdits && data.fileEdits.length > 0) {
                  setRecentEdits(data.fileEdits);
                  setTimeout(() => setRecentEdits([]), 10000);
                }
                if (data.thinkingSteps && data.thinkingSteps.length > 0) {
                  setCompletedThinkingSteps(prev => {
                    const updated = new Map(prev);
                    updated.set(conversationId, data.thinkingSteps);
                    return updated;
                  });
                } else if (streamingThinkingSteps.length > 0) {
                  setCompletedThinkingSteps(prev => {
                    const updated = new Map(prev);
                    updated.set(conversationId, [...streamingThinkingSteps]);
                    return updated;
                  });
                }
                setIsStreaming(false);
                setStreamingContent("");
                setStreamingThinkingSteps([]);
                queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
                queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "files"] });
              }
            } catch {
            }
          }
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setIsStreaming(false);
      setStreamingContent("");
      setStreamingThinkingSteps([]);
      setGenerationStage(null);
      setGenerationError(error instanceof Error ? error.message : "An unexpected error occurred during generation.");
    }
  };

  const handleExportZip = async () => {
    if (!activeConversationId || isExporting) return;
    setIsExporting(true);
    try {
      const resp = await fetch(`/api/conversations/${activeConversationId}/export`);
      if (!resp.ok) throw new Error('Export failed');
      const blob = await resp.blob();
      const disposition = resp.headers.get('content-disposition');
      const filenameMatch = disposition?.match(/filename="([^"]+)"/);
      const filename = filenameMatch?.[1] || 'project.zip';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 15000);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    setStreamingContent("");
    setIsStreaming(false);
    setStreamingThinkingSteps([]);
    setCompletedThinkingSteps(new Map());
    setGenerationStage(null);
    setGenerationError(null);
    queryClient.removeQueries({ queryKey: ["/api/conversations", null] });
  };

  const handleSelectConversation = (id: number) => {
    setActiveConversationId(id);
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString();
  };

  const messages = activeConversation?.messages || [];
  const displayMessages = [...messages];
  if (isStreaming && (streamingContent || streamingThinkingSteps.length > 0)) {
    displayMessages.push({
      id: -1,
      conversationId: activeConversationId || 0,
      role: "assistant",
      content: streamingContent,
      thinkingSteps: null,
      createdAt: new Date(),
    });
  }

  const sidebarStyle = {
    "--sidebar-width": "15rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full bg-background">
        <Sidebar>
          <SidebarHeader className="p-3 border-b border-sidebar-border">
            <Button
              onClick={handleNewChat}
              disabled={createConversationMutation.isPending}
              className="w-full justify-center gap-2 rounded-md"
              variant="default"
              data-testid="button-new-chat"
            >
              <Plus className="h-4 w-4" />
              New Chat
            </Button>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {conversations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-xs px-3" data-testid="text-no-conversations">
                      No conversations yet
                    </div>
                  ) : (
                    conversations.map((conversation) => (
                      <SidebarMenuItem key={conversation.id} className="group">
                        <SidebarMenuButton
                          onClick={() => handleSelectConversation(conversation.id)}
                          isActive={activeConversationId === conversation.id}
                          className="w-full"
                          data-testid={`conversation-item-${conversation.id}`}
                        >
                          <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-[13px] truncate">{conversation.title}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {formatDate(conversation.createdAt)}
                            </div>
                          </div>
                        </SidebarMenuButton>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover-elevate"
                              onClick={(e) => e.stopPropagation()}
                              data-testid={`button-conversation-menu-${conversation.id}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteConversationMutation.mutate(conversation.id);
                              }}
                              data-testid={`button-delete-conversation-${conversation.id}`}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </SidebarMenuItem>
                    ))
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-3 border-t border-sidebar-border">
            <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground/60" data-testid="text-ai-status">
              <Terminal className="w-3 h-3" />
              <span>AutoCoder</span>
            </div>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex min-w-0">
          <div className="w-[40%] min-w-[340px] max-w-[520px] flex flex-col border-r border-border flex-shrink-0">
            <header className="h-12 border-b border-border/60 bg-background flex items-center justify-between px-4 flex-shrink-0">
              <div className="flex items-center gap-3">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <Link href="/">
                  <div className="flex items-center gap-2 cursor-pointer" data-testid="link-home">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Terminal className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="font-semibold text-sm hidden sm:inline">AutoCoder</span>
                  </div>
                </Link>
                {activeConversation?.projectName && (
                  <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground" data-testid="project-context-indicator">
                    <span className="text-border/60">/</span>
                    <span className="font-medium text-foreground/80 truncate max-w-[120px]">{activeConversation.projectName}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                {isWebContainerSupported() && preWarmState !== 'idle' && preWarmState !== 'ready' && (
                  <div
                    className="flex items-center gap-1.5 text-xs text-muted-foreground mr-2"
                    title={preWarmMessage || 'Caching core packages...'}
                    data-testid="prewarm-status-indicator"
                  >
                    <div
                      data-testid="status-prewarm-dot"
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        preWarmState === 'failed' ? 'bg-red-500 dark:bg-red-400'
                          : 'bg-yellow-500 dark:bg-yellow-400 animate-pulse'
                      }`}
                    />
                  </div>
                )}
                {conversationFiles.length > 0 && activeConversationId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={handleExportZip}
                    disabled={isExporting}
                    data-testid="button-download-zip-header"
                  >
                    {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">Download ZIP</span>
                  </Button>
                )}
                <Link href="/slm">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs"
                    data-testid="link-slm-settings"
                  >
                    <Cpu className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">SLM Settings</span>
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPreview(!showPreview)}
                  className={showPreview ? 'text-primary' : ''}
                  data-testid="button-toggle-preview"
                >
                  {showPreview ? <PanelRightClose className="h-4 w-4" /> : <PanelRight className="h-4 w-4" />}
                </Button>
                <ThemeToggle />
              </div>
            </header>

            {aiConfigStatus && !aiConfigStatus.clientReady && !noAiBannerDismissed && (
              <div className="mx-4 mt-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-4 py-3 flex items-center gap-3" data-testid="no-ai-banner">
                <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">No AI model connected</p>
                  <p className="text-xs text-muted-foreground">Code generation requires a model. Connect one in settings.</p>
                </div>
                <Link href="/slm">
                  <Button size="sm" variant="outline" className="gap-1.5 shrink-0 border-yellow-500/30 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/10">
                    <Settings className="w-3.5 h-3.5" />
                    Configure
                  </Button>
                </Link>
                <button onClick={() => setNoAiBannerDismissed(true)} className="text-muted-foreground hover:text-foreground shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-auto min-h-0">
                {!activeConversationId && messages.length === 0 ? (
                  <EmptyState onSuggestionClick={handleSendMessage} />
                ) : (
                  <ScrollArea className="h-full">
                    <div className="px-4 py-4 space-y-4">
                      {displayMessages.map((message, index) => (
                        <ChatMessage
                          key={message.id}
                          role={message.role as "user" | "assistant"}
                          content={message.content}
                          isStreaming={isStreaming && index === displayMessages.length - 1 && message.role === "assistant"}
                          generatedFiles={conversationFiles.map(f => ({ path: f.path, content: f.content }))}
                          thinkingSteps={
                            message.id === -1 && isStreaming
                              ? streamingThinkingSteps
                              : message.role === "assistant" && (message as any).thinkingSteps && Array.isArray((message as any).thinkingSteps) && ((message as any).thinkingSteps as any[]).length > 0
                                ? (message as any).thinkingSteps as ThinkingStep[]
                                : message.role === "assistant" && activeConversationId && index === displayMessages.length - 1
                                  ? completedThinkingSteps.get(activeConversationId) as ThinkingStep[] | undefined
                                  : undefined
                          }
                          showApproval={message.id === approvalMessageId}
                          onSendMessage={handleSendMessage}
                        />
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                )}
              </div>

              <div className="px-4 py-3 flex-shrink-0 border-t border-border/40">
                {isStreaming && generationStage && (
                  <div className="flex items-center gap-2 mb-2 text-xs" data-testid="generation-stage-indicator">
                    <Loader2 className="h-3 w-3 animate-spin text-primary flex-shrink-0" />
                    <span className="text-muted-foreground truncate">{generationStage}</span>
                  </div>
                )}
                {generationError && (
                  <div className="flex items-start gap-2 mb-2 text-xs rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2" data-testid="generation-error-panel">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-red-600 dark:text-red-400 font-medium">Generation failed</p>
                      <p className="text-muted-foreground mt-0.5">{generationError}</p>
                    </div>
                    <button onClick={() => setGenerationError(null)} className="text-muted-foreground hover:text-foreground shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {validationSummary && (
                  <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground" data-testid="validation-summary-panel">
                    {validationSummary.unfixableIssues.length > 0 ? (
                      <AlertTriangle className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                    ) : (
                      <ShieldCheck className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                    )}
                    <span className="truncate">
                      {validationSummary.passes} validation pass{validationSummary.passes !== 1 ? 'es' : ''}
                      {validationSummary.issuesFixed > 0 && ` \u00b7 ${validationSummary.issuesFixed} auto-fixed`}
                      {validationSummary.unfixableIssues.length > 0
                        ? ` \u00b7 ${validationSummary.unfixableIssues.length} need review`
                        : ' \u00b7 all verified'}
                    </span>
                  </div>
                )}
                {slmEnhanced && slmStagesRun.length > 0 && (
                  <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground" data-testid="slm-enhanced-panel">
                    <Sparkles className="h-3 w-3 text-violet-500 flex-shrink-0" />
                    <span className="truncate">
                      AI-enhanced: {slmStagesRun.join(', ')}
                    </span>
                  </div>
                )}
                {conversationFiles.length > 0 && (
                  <div className="mb-2" data-testid="diagnostics-panel">
                    {diagnostics && diagnostics.totalIssues > 0 ? (
                      <>
                        <button
                          onClick={() => setDiagnosticsOpen(!diagnosticsOpen)}
                          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
                        >
                          <Bug className="h-3 w-3 text-orange-500 flex-shrink-0" />
                          <span>
                            {diagnostics.totalIssues} diagnostic issue{diagnostics.totalIssues !== 1 ? 's' : ''} in {diagnostics.unhealthyFiles} file{diagnostics.unhealthyFiles !== 1 ? 's' : ''}
                            {diagnostics.bySeverity.critical > 0 && ` (${diagnostics.bySeverity.critical} critical)`}
                          </span>
                          {diagnosticsOpen ? <ChevronDown className="h-3 w-3 ml-auto" /> : <ChevronRight className="h-3 w-3 ml-auto" />}
                        </button>
                        {diagnosticsOpen && (
                          <div className="mt-1 pl-5 space-y-1 max-h-40 overflow-y-auto text-xs">
                            <div className="flex gap-3 text-muted-foreground mb-1 items-center">
                              {diagnostics.bySeverity.critical > 0 && <span className="text-red-500">{diagnostics.bySeverity.critical} critical</span>}
                              {diagnostics.bySeverity.error > 0 && <span className="text-orange-500">{diagnostics.bySeverity.error} error</span>}
                              {diagnostics.bySeverity.warning > 0 && <span className="text-yellow-500">{diagnostics.bySeverity.warning} warning</span>}
                              <button
                                onClick={async () => {
                                  if (!activeConversationId) return;
                                  const fileEntries = Object.entries(diagnostics.byFile);
                                  for (const [filePath, issues] of fileEntries) {
                                    setFixingFiles(prev => new Set(prev).add(filePath));
                                    try {
                                      await fetch(`/api/modules/fix`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          filePath,
                                          error: issues.map(i => i.message).join('; '),
                                          conversationId: activeConversationId,
                                        }),
                                      });
                                    } catch {}
                                    setFixingFiles(prev => { const s = new Set(prev); s.delete(filePath); return s; });
                                  }
                                  queryClient.invalidateQueries({ queryKey: ["/api/conversations", activeConversationId, "files"] });
                                  try {
                                    const updatedFiles = await (await fetch(`/api/conversations/${activeConversationId}/files`)).json();
                                    const resp = await fetch(`/api/modules/diagnostics`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ files: updatedFiles.map((f: any) => ({ path: f.path, content: f.content })) }),
                                    });
                                    if (resp.ok) setDiagnostics(await resp.json());
                                  } catch {}
                                }}
                                disabled={fixingFiles.size > 0}
                                className="text-[10px] text-primary hover:text-primary/80 disabled:opacity-50"
                              >
                                Fix All
                              </button>
                              <button
                                onClick={async () => {
                                  try {
                                    const resp = await fetch(`/api/modules/diagnostics`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ files: conversationFiles.map(f => ({ path: f.path, content: f.content })) }),
                                    });
                                    if (resp.ok) {
                                      const report = await resp.json();
                                      setDiagnostics(report);
                                    }
                                  } catch {}
                                }}
                                className="ml-auto text-[10px] text-primary hover:text-primary/80"
                              >
                                Re-run
                              </button>
                            </div>
                            {Object.entries(diagnostics.byFile).map(([filePath, issues]) => (
                              <div key={filePath} className="border border-border/50 rounded px-2 py-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-mono text-[11px] text-foreground/70 truncate">{filePath}</span>
                                  <button
                                    onClick={async () => {
                                      if (!activeConversationId) return;
                                      setFixingFiles(prev => new Set(prev).add(filePath));
                                      try {
                                        const fileMatch = conversationFiles.find(f => f.path === filePath);
                                        const resp = await fetch(`/api/modules/fix`, {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({
                                            filePath,
                                            fileContent: fileMatch?.content || '',
                                            error: issues.map(i => i.message).join('; '),
                                            conversationId: activeConversationId,
                                          }),
                                        });
                                        if (resp.ok) {
                                          const result = await resp.json();
                                          if (result.fixed) {
                                            queryClient.invalidateQueries({ queryKey: ["/api/conversations", activeConversationId, "files"] });
                                            setDiagnostics(prev => {
                                              if (!prev) return prev;
                                              const updated = { ...prev };
                                              const remaining = result.remainingIssues || [];
                                              if (remaining.length === 0) {
                                                const { [filePath]: _, ...rest } = updated.byFile;
                                                updated.byFile = rest;
                                                updated.unhealthyFiles--;
                                                updated.healthyFiles++;
                                              } else {
                                                updated.byFile[filePath] = remaining;
                                              }
                                              updated.totalIssues = Object.values(updated.byFile).reduce((sum, arr) => sum + arr.length, 0);
                                              updated.bySeverity = { critical: 0, error: 0, warning: 0, info: 0 };
                                              for (const fileIssues of Object.values(updated.byFile)) {
                                                for (const issue of fileIssues) {
                                                  const sev = issue.severity as keyof typeof updated.bySeverity;
                                                  if (updated.bySeverity[sev] !== undefined) updated.bySeverity[sev]++;
                                                }
                                              }
                                              return updated;
                                            });
                                          }
                                        }
                                      } catch {}
                                      setFixingFiles(prev => { const s = new Set(prev); s.delete(filePath); return s; });
                                    }}
                                    disabled={fixingFiles.has(filePath)}
                                    className="text-[10px] text-primary hover:text-primary/80 flex items-center gap-1 disabled:opacity-50"
                                  >
                                    <Wrench className="h-2.5 w-2.5" />
                                    {fixingFiles.has(filePath) ? 'Fixing...' : 'Fix'}
                                  </button>
                                </div>
                                {issues.slice(0, 3).map((issue, idx) => (
                                  <div key={idx} className="text-[11px] text-muted-foreground pl-1">
                                    <span className={issue.severity === 'critical' ? 'text-red-500' : issue.severity === 'error' ? 'text-orange-500' : 'text-yellow-500'}>
                                      {issue.severity}
                                    </span>
                                    {' '}{issue.message}
                                    {issue.line ? ` (line ${issue.line})` : ''}
                                  </div>
                                ))}
                                {issues.length > 3 && (
                                  <div className="text-[11px] text-muted-foreground pl-1">...and {issues.length - 3} more</div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : diagnostics && diagnostics.totalIssues === 0 ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Bug className="h-3 w-3 text-green-500 flex-shrink-0" />
                        <span>No issues found</span>
                        <button
                          onClick={async () => {
                            try {
                              const resp = await fetch(`/api/modules/diagnostics`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ files: conversationFiles.map(f => ({ path: f.path, content: f.content })) }),
                              });
                              if (resp.ok) {
                                const report = await resp.json();
                                setDiagnostics(report);
                                if (report.totalIssues > 0) setDiagnosticsOpen(true);
                              }
                            } catch {}
                          }}
                          className="text-[10px] text-primary hover:text-primary/80 ml-auto"
                        >
                          Re-run
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={async () => {
                          try {
                            const resp = await fetch(`/api/modules/diagnostics`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ files: conversationFiles.map(f => ({ path: f.path, content: f.content })) }),
                            });
                            if (resp.ok) {
                              const report = await resp.json();
                              setDiagnostics(report);
                              if (report.totalIssues > 0) setDiagnosticsOpen(true);
                            }
                          } catch {}
                        }}
                        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Bug className="h-3 w-3 flex-shrink-0" />
                        <span>Run Diagnostics</span>
                      </button>
                    )}
                  </div>
                )}
                {recentEdits.length > 0 && (
                  <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground" data-testid="recent-edits-panel">
                    <Pencil className="h-3 w-3 text-primary flex-shrink-0" />
                    <span className="truncate">
                      {recentEdits.length} file{recentEdits.length !== 1 ? 's' : ''} changed
                    </span>
                    {recentEdits.slice(0, 2).map((edit, i) => (
                      <span key={i} className="font-mono text-[11px] text-foreground/60 truncate hidden sm:inline" data-testid={`edit-indicator-${i}`}>
                        {edit.filePath.split('/').pop()}
                      </span>
                    ))}
                  </div>
                )}
                <ChatInput
                  onSend={handleSendMessage}
                  isLoading={isStreaming}
                  placeholder={
                    (conversationPhase === 'editing' || conversationPhase === 'complete') && conversationFiles.length > 0
                      ? "Describe what you'd like to change..."
                      : activeConversationId
                      ? "What would you like to change?"
                      : "Describe what you want to build..."
                  }
                  conversationId={activeConversationId}
                  onFilesUploaded={() => {
                    queryClient.invalidateQueries({ queryKey: ["/api/conversations", activeConversationId, "files"] });
                  }}
                />
              </div>
            </div>
          </div>

          {showPreview ? (
            <div className="flex-1 min-w-[400px] h-full">
              <PreviewPanel
                conversationId={activeConversationId}
                onRequestFix={handleRequestFix}
                onRegenerateFile={async (filePath) => {
                  if (!activeConversationId) return;
                  try {
                    const res = await fetch(`/api/conversations/${activeConversationId}/regenerate-file`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ filePath }),
                    });
                    if (res.ok) {
                      const data = await res.json();
                      if (data.prompt) {
                        handleSendMessage(data.prompt);
                        return;
                      }
                    }
                  } catch {}
                  const prompt = `Please regenerate the file "${filePath}" while keeping all other project files intact. Maintain the same interfaces, exports, and integration points. Improve the implementation quality.`;
                  handleSendMessage(prompt);
                }}
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-card/30 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(var(--primary)/0.03)_0%,_transparent_70%)] pointer-events-none" />
              <div className="text-center space-y-3 relative z-10">
                <div className="w-12 h-12 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto glow-sm">
                  <PanelRight className="h-5 w-5 text-primary" />
                </div>
                <div className="text-sm text-muted-foreground">Preview panel hidden</div>
                <Button variant="outline" size="sm" onClick={() => setShowPreview(true)} data-testid="button-show-preview">
                  Show Preview
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </SidebarProvider>
  );
}
