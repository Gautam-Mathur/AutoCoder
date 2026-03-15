import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, ProjectContext } from "../storage";
import OpenAI from "openai";
import { z } from "zod";
import type { Conversation } from "@workspace/db";

import { logger, requestLogger } from "../modules/logger";

import { analyzePrompt, formatClarificationQuestions } from "../modules/clarification-engine";
import { generateProjectPlan, formatPlanAsMarkdown } from "../modules/planning-module";
import { generateTestsForCode, runTests, formatTestResults, validateBuild } from "../modules/testing-engine";
import { scanForVulnerabilities, formatSecurityReport, getSecurityRecommendations } from "../modules/security-module";
import { extractAssumptions, formatTransparencyReport } from "../modules/transparency-module";
import { extractIntelFromMessages, storeIntel, getIntel, generateIntelContext } from "../modules/intel-memory";
import { analyzeDependencies, formatDependencyReport, generateEnvExample } from "../modules/dependency-intelligence";
import { generateProjectExport, generateDownloadData } from "../modules/export-system";
import { parseErrors, analyzeAndFix, validateImportPaths, addDependenciesToPackageJson, fixTSGenericBracketMismatch } from "../modules/vite-error-fixer";
import { analyzeAndPlan, formatReasoningAsMarkdown, quickAnalysis } from "../modules/advanced-reasoning";
import { learnFromInteraction, getContextPreferences, applyContextPreferences, getRelevantContext, formatMemorySummary } from "../modules/context-memory";
import { analyzeCode, diagnoseError, formatAnalysisAsMarkdown, autoFixCode } from "../modules/live-code-analysis";
import { getAllFrameworks, getFramework, getFrameworksByLanguage, getFrameworkCount, getFrameworkSummary } from "../modules/framework-patterns";
import { getLanguage, getLanguageCount, getLanguageSummary } from "../modules/language-registry";
import { emitProject, previewEmission, type ProjectBlueprint } from "../modules/universal-code-emitter";
import { learningEngine } from "../modules/generation-learning-engine";
import { analyzeNLU, classifyIntent, extractEntities, formatNLUAsMarkdown } from "../modules/natural-language-understanding";
import { explainCode, detectPatterns, formatExplanationAsMarkdown } from "../modules/code-explanation-engine";
import {
  getConcept, searchConcepts, getBestPractices, getBestPractice, getLearningPath,
  formatConceptAsMarkdown, formatBestPracticeAsMarkdown, formatAntiPatternAsMarkdown,
  getAllAntiPatterns, getAntiPatternsByTag, getAntiPatternsBySeverity,
  getAllCodeSnippets, getSnippetsByTech, getSnippetsByTag,
  getAllLearningPaths, getContextForGeneration,
  getConceptsByCategory, getConceptsByDifficulty, getRelatedConcepts,
  matchEntityToArchetype, getAllEntityArchetypes, getArchetypesByDomain,
  getDomainModel, getAllDomainModels, getSchemaSuggestions,
  getWorkflowPattern, resolveEntityArchetypes, getDomainModelContext,
  getEntityFields,
} from "../modules/knowledge-base";
import { detectFollowUp, updateContext, generateClarification, getResponseHints, summarizeConversation, getConversationContext, formatConversationContextAsMarkdown } from "../modules/conversational-flexibility";
import { continuousDebug, parseError, getDebugStatus, getDebugSession, formatDebugReport } from "../modules/continuous-debugger";
import { recognizeIntent, isQuestion, extractEntitiesEnhanced, formatIntentAsMarkdown } from "../modules/enhanced-intent-recognition";
import { generateProject, formatProjectAsTree, formatProjectAsMarkdown } from "../modules/advanced-code-generation";
import { explainCodeUniversal, formatExplanationAsMarkdownUniversal } from "../modules/universal-code-explanation";
import { analyzeError, formatDebugAnalysisAsMarkdown } from "../modules/deep-debugging-engine";
import { createContextWindow, addChunk, getContextWindow, getRelevantContext as getRelevantContextChunks, formatContextWindowAsMarkdown } from "../modules/context-window-manager";
import { getLanguageById, getSnippet, listAllLanguages, formatLanguageSummary } from "../modules/multi-language-templates";
import { createConversation as createConvState, processTurn, getConversation as getConvState, getResponseHints as getConvHints, getConversationSummary, getRelevantMemory } from "../modules/true-conversational-ai";
import { listBlueprints, listFeatures, getBlueprint, getFeature } from "../modules/deep-project-generator";
import { validateGeneratedCode, autoFixCode as clientAutoFixCode } from "../client-lib/code-generator/code-validator";
import { analyzePrompt as proAnalyzePrompt, generateProject as proGenerateProject } from "../client-lib/code-generator/pro-generator";
import { preparePreviewProject, startPreviewServer, stopPreviewServer, getPreviewStatus } from "../modules/preview-project-manager";
import { handleMessage as handlePhaseMessage, isProjectCreationRequest, type ConversationState } from "../modules/conversation-phase-handler";
import { analyzeCodebase, type FileInfo as IngestionFileInfo } from "../modules/codebase-analyzer";
import { generatePlanFromCodebase, formatReversePlanSummary } from "../modules/reverse-plan-generator";
import { traceCrossFileRelationships } from "../modules/cross-file-tracer";
import { runStageTest, getAvailableStages, runModularFix, runDiagnostics } from "../modules/modular-test-engine";
import { getConfig, saveConfig, applyPreset, buildPromptInstructions, getConfigSummary, PROMPT_PRESETS, DEFAULT_CONFIG } from "../modules/prompt-config";
import { initializeSLMSystem, connectSLMEndpoint, getSLMSystemStatus, getAllStageModes, setStageMode } from "../modules/slm-registry";
import { getRegisteredStages } from "../modules/slm-inference-engine";

function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function parseValidId(raw: string): number | null {
  const id = parseInt(raw);
  if (isNaN(id) || id < 0 || id > 2147483647) return null;
  return id;
}

function inferLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    tsx: 'tsx', ts: 'typescript', jsx: 'jsx', js: 'javascript',
    json: 'json', html: 'html', css: 'css', md: 'markdown', svg: 'svg',
  };
  return map[ext] || 'text';
}

let runtimeAIConfig = {
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "",
  baseUrl: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || "",
  model: process.env.OPENAI_MODEL || "qwen2.5-coder:7b",
};

export function hasCloudAI(): boolean { return !!runtimeAIConfig.apiKey; }
export function getAIModel(): string { return runtimeAIConfig.model; }

let openai: OpenAI | null = null;
function rebuildOpenAIClient() {
  if (runtimeAIConfig.apiKey) {
    openai = new OpenAI({
      apiKey: runtimeAIConfig.apiKey,
      ...(runtimeAIConfig.baseUrl ? { baseURL: runtimeAIConfig.baseUrl } : {}),
    });
  } else {
    openai = null;
  }
}
rebuildOpenAIClient();

export function reconfigureAI(cfg: { baseUrl?: string; apiKey?: string; model?: string }) {
  if (cfg.baseUrl !== undefined) runtimeAIConfig.baseUrl = cfg.baseUrl;
  if (cfg.apiKey !== undefined) runtimeAIConfig.apiKey = cfg.apiKey;
  if (cfg.model !== undefined) runtimeAIConfig.model = cfg.model;
  rebuildOpenAIClient();
  console.log(`[AI Config] Reconfigured — endpoint=${runtimeAIConfig.baseUrl || '(default)'}, model=${runtimeAIConfig.model}, hasKey=${!!runtimeAIConfig.apiKey}`);
}

export function getAIConfig() {
  return {
    baseUrl: runtimeAIConfig.baseUrl || null,
    model: runtimeAIConfig.model,
    hasApiKey: !!runtimeAIConfig.apiKey,
    clientReady: openai !== null,
  };
}

const createConversationSchema = z.object({
  title: z.string().min(1).max(200).optional().default("New Chat"),
});

const sendMessageSchema = z.object({
  content: z.string().min(1).max(32000),
});

const updateProjectContextSchema = z.object({
  projectName: z.string().optional(),
  projectDescription: z.string().optional(),
  techStack: z.array(z.string()).optional(),
  featuresBuilt: z.array(z.string()).optional(),
  projectSummary: z.string().optional(),
  lastCodeGenerated: z.string().optional(),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Request logging middleware
  app.use(requestLogger());

  logger.info("Server", "Routes registration started");

  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      engine: "local-pipeline",
      stages: 16,
      domains: 15,
      aiEnhancement: hasCloudAI(),
      message: "AutoCoder local pipeline active"
    });
  });

  // Preview scripts proxy - fetches CDN scripts and serves with proper CORS/COEP headers
  const scriptCache = new Map<string, { content: string; timestamp: number }>();
  const SCRIPT_URLS: Record<string, string> = {
    'react': 'https://cdn.jsdelivr.net/npm/react@18/umd/react.production.min.js',
    'react-dom': 'https://cdn.jsdelivr.net/npm/react-dom@18/umd/react-dom.production.min.js',
    'babel': 'https://cdn.jsdelivr.net/npm/@babel/standalone@7/babel.min.js'
  };
  const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  app.get("/api/preview-scripts/:lib", async (req, res) => {
    const lib = req.params.lib;
    const url = SCRIPT_URLS[lib];

    if (!url) {
      return res.status(404).json({ error: `Unknown library: ${lib}` });
    }

    try {
      // Check cache first
      const cached = scriptCache.get(lib);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        res.setHeader('Content-Type', 'application/javascript');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.send(cached.content);
      }

      // Fetch from CDN
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`CDN returned ${response.status}`);
      }

      const content = await response.text();

      // Cache the script
      scriptCache.set(lib, { content, timestamp: Date.now() });

      // Send with proper headers for COEP compatibility
      res.setHeader('Content-Type', 'application/javascript');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(content);
    } catch (error) {
      console.error(`Failed to fetch ${lib}:`, error);
      res.status(502).json({ error: `Failed to fetch ${lib} from CDN` });
    }
  });

  // Server-side TSX transpilation endpoint for fallback
  app.post("/api/preview-transpile", async (req, res) => {
    try {
      const { code } = req.body;
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: 'Code is required' });
      }

      // Use a simple transformation since we don't have Babel on server
      // This is a basic JSX to createElement transformation
      let transpiled = code;

      // Remove TypeScript type annotations (basic patterns)
      transpiled = transpiled.replace(/:\s*\w+(\[\])?(\s*[,\)\}=])/g, '$2');
      transpiled = transpiled.replace(/<\w+>/g, ''); // Generic types
      transpiled = transpiled.replace(/interface\s+\w+\s*\{[^}]*\}/g, '');
      transpiled = transpiled.replace(/type\s+\w+\s*=\s*[^;]+;/g, '');

      res.json({ transpiled, success: true });
    } catch (error) {
      console.error('Transpilation error:', error);
      res.status(500).json({ error: 'Transpilation failed', success: false });
    }
  });

  // Preview Project Vite Server API (port 6000)
  app.post("/api/preview/prepare/:conversationId", async (req, res) => {
    try {
      const conversationId = parseValidId(req.params.conversationId);
      if (conversationId === null) {
        return res.status(400).json({ error: 'Invalid conversation ID' });
      }

      const projectFiles = await storage.getProjectFiles(conversationId);
      if (!projectFiles || projectFiles.length === 0) {
        return res.status(404).json({ error: 'No project files found for this conversation' });
      }

      const files = projectFiles.map(f => ({ path: f.path, content: f.content }));
      const projectPath = await preparePreviewProject(conversationId, files);

      logger.info('PREVIEW', `Prepared preview project for conversation ${conversationId} at ${projectPath}`);

      res.json({
        success: true,
        projectPath,
        fileCount: files.length
      });
    } catch (error: any) {
      logger.error('PREVIEW', `Failed to prepare preview: ${error.message}`);
      res.status(500).json({ error: error.message, success: false });
    }
  });

  app.post("/api/preview/start/:conversationId", async (req, res) => {
    try {
      const conversationId = parseValidId(req.params.conversationId);
      if (conversationId === null) {
        return res.status(400).json({ error: 'Invalid conversation ID' });
      }

      const projectFiles = await storage.getProjectFiles(conversationId);
      if (!projectFiles || projectFiles.length === 0) {
        return res.status(404).json({ error: 'No project files found' });
      }

      const files = projectFiles.map(f => ({ path: f.path, content: f.content }));
      await preparePreviewProject(conversationId, files);

      const result = await startPreviewServer(conversationId);

      if (result.success) {
        logger.info('PREVIEW', `Started preview server for conversation ${conversationId} at ${result.url}`);
      } else {
        logger.error('PREVIEW', `Failed to start preview: ${result.error}`);
      }

      res.json(result);
    } catch (error: any) {
      logger.error('PREVIEW', `Failed to start preview: ${error.message}`);
      res.status(500).json({ error: error.message, success: false });
    }
  });

  app.post("/api/preview/stop", async (req, res) => {
    try {
      await stopPreviewServer();
      logger.info('PREVIEW', 'Stopped preview server');
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message, success: false });
    }
  });

  app.get("/api/preview/status", (req, res) => {
    const status = getPreviewStatus();
    res.json(status);
  });

  // Cloud Sandbox API endpoints
  app.post("/api/sandbox/create", async (req, res) => {
    try {
      const { files } = req.body;
      if (!files || !Array.isArray(files)) {
        return res.status(400).json({ error: 'Files array required', available: false });
      }

      const cloudSandboxEnabled = process.env.CLOUD_SANDBOX_ENABLED === 'true';
      if (!cloudSandboxEnabled) {
        return res.status(503).json({
          error: 'Cloud sandbox not available',
          available: false,
          message: 'Cloud execution is a planned feature. Using local preview.',
          fallbackTo: 'static-preview'
        });
      }

      res.status(503).json({
        error: 'Cloud sandbox not configured',
        available: false,
        fallbackTo: 'static-preview'
      });
    } catch (error) {
      console.error('Sandbox creation error:', error);
      res.status(500).json({ error: 'Internal server error', available: false });
    }
  });

  app.post("/api/sandbox/stop", async (req, res) => {
    res.json({ success: true, message: 'No active session found' });
  });

  app.get("/api/sandbox/status", async (req, res) => {
    const cloudSandboxEnabled = process.env.CLOUD_SANDBOX_ENABLED === 'true';
    res.json({
      available: cloudSandboxEnabled,
      activeSessions: 0,
      features: {
        nodeExecution: cloudSandboxEnabled,
        databaseAccess: false,
        persistentStorage: false,
      },
      limits: {
        maxSessionsPerUser: 2,
        maxExecutionTimeMs: 300000,
        maxMemoryMB: 512,
      }
    });
  });

  // Logger API endpoints
  app.get("/api/logs", (req, res) => {
    try {
      const { level, category, limit, search } = req.query;
      const logs = logger.getLogs({
        level: level as any,
        category: category as string,
        limit: limit ? parseInt(limit as string) : 200,
        search: search as string,
      });
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  });

  app.get("/api/logs/stats", (req, res) => {
    try {
      const stats = logger.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch log stats" });
    }
  });

  app.delete("/api/logs", (req, res) => {
    try {
      logger.clear();
      logger.info("Server", "Logs cleared by user");
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear logs" });
    }
  });

  app.get("/api/conversations", async (req, res) => {
    try {
      const conversations = await storage.getAllConversations();
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", async (req, res) => {
    try {
      const id = parseValidId(req.params.id);
      if (id === null) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }
      const conversation = await storage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const messages = await storage.getMessagesByConversation(id);
      res.json({ ...conversation, messages });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.post("/api/conversations", async (req, res) => {
    try {
      const parsed = createConversationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
      }
      const sanitizedTitle = sanitizeHtml(parsed.data.title);
      const conversation = await storage.createConversation(sanitizedTitle);
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.delete("/api/conversations/:id", async (req, res) => {
    try {
      const id = parseValidId(req.params.id);
      if (id === null) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }
      await storage.deleteConversation(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  // Save assistant message (for local engine mode)
  app.post("/api/conversations/:id/assistant-message", async (req, res) => {
    try {
      const id = parseValidId(req.params.id);
      if (id === null) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }

      const { content, thinkingSteps } = req.body;
      if (!content || typeof content !== "string") {
        return res.status(400).json({ error: "Content is required" });
      }

      const message = await storage.createMessage(id, "assistant", content, thinkingSteps || undefined);
      res.status(201).json(message);
    } catch (error) {
      console.error("Error saving assistant message:", error);
      res.status(500).json({ error: "Failed to save assistant message" });
    }
  });

  // Update project context for a conversation
  app.put("/api/conversations/:id/context", async (req, res) => {
    try {
      const id = parseValidId(req.params.id);
      if (id === null) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }

      const parsed = updateProjectContextSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
      }

      const updated = await storage.updateProjectContext(id, parsed.data);
      if (!updated) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating project context:", error);
      res.status(500).json({ error: "Failed to update project context" });
    }
  });

  app.post("/api/conversations/:id/messages", async (req, res) => {
    try {
      const conversationId = parseValidId(req.params.id);
      if (conversationId === null) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }

      const parsed = sendMessageSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
      }

      const { content } = parsed.data;

      // Get conversation with project context
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      await storage.createMessage(conversationId, "user", content);

      const existingFiles = await storage.getProjectFiles(conversationId);

      const currentPhase = (conversation as any).conversationPhase || 'initial';

      const convState: ConversationState = {
        phase: currentPhase as any,
        understandingData: (conversation as any).understandingData as any,
        planData: (conversation as any).projectPlanData as any,
        clarificationRound: (conversation as any).clarificationRound as number | undefined,
        clarificationState: (conversation as any).clarificationState as any,
        conversationId: conversationId,
        existingFiles: existingFiles.length > 0 ? existingFiles.map((f: any) => ({
          path: f.path,
          content: f.content,
          language: f.language || inferLanguageFromPath(f.path),
        })) : undefined,
        editHistory: (conversation as any).editHistory as any,
      };

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const recentMsgs = await storage.getMessagesByConversation(conversationId);
      const conversationHistory = recentMsgs
        .slice(-6)
        .map((m: any) => `[${m.role}]: ${typeof m.content === 'string' ? m.content.slice(0, 300) : ''}`)
        .join('\n');

      const onStep = (step: { phase: string; label: string; detail?: string; timestamp?: number }) => {
        try {
          res.write(`data: ${JSON.stringify({ type: 'thinking', step })}\n\n`);
        } catch {}
      };

      const result = await handlePhaseMessage(content, convState, conversationHistory, onStep);

      if (result.generatedFiles && result.generatedFiles.length > 0) {
        const isIterativeEdit = result.fileEdits && result.fileEdits.length > 0;

        if (isIterativeEdit) {
          for (const edit of result.fileEdits!) {
            if (edit.editType === 'delete') {
              const allFiles = await storage.getProjectFiles(conversationId);
              const fileToDelete = allFiles.find((f: any) => f.path === edit.filePath);
              if (fileToDelete) {
                await storage.deleteProjectFile(fileToDelete.id);
              }
            } else {
              const fixedContent = clientAutoFixCode(edit.newContent, edit.filePath);
              const lang = inferLanguageFromPath(edit.filePath);
              await storage.upsertProjectFile(conversationId, edit.filePath, fixedContent, lang);
            }
          }
        } else {
          const validation = validateGeneratedCode(
            result.generatedFiles.map(f => ({ path: f.path, content: f.content }))
          );
          const filesToSave = validation.fixedFiles.length > 0
            ? validation.fixedFiles
            : result.generatedFiles;

          await storage.deleteProjectFilesByConversation(conversationId);
          for (const file of filesToSave) {
            const fixedContent = clientAutoFixCode(file.content, file.path);
            const lang = ('language' in file && typeof file.language === 'string') ? file.language : inferLanguageFromPath(file.path);
            await storage.upsertProjectFile(conversationId, file.path, fixedContent, lang);
          }
        }
      }

      const updateData: any = {
        conversationPhase: result.newPhase,
        ...(result.planData ? { projectPlanData: result.planData as any } : {}),
        ...(result.understandingData ? { understandingData: result.understandingData as any } : {}),
        ...(result.clarificationRound != null ? { clarificationRound: result.clarificationRound } : {}),
        ...(result.clarificationState ? { clarificationState: result.clarificationState as any } : {}),
        ...(result.planData ? {
          projectName: result.planData.projectName,
          planGenerated: true,
        } : {}),
      };
      if (result.fileEdits && result.fileEdits.length > 0) {
        const prevHistory = (conversation as any).editHistory || [];
        updateData.editHistory = [...prevHistory, {
          timestamp: Date.now(),
          edits: result.fileEdits.map((e: any) => ({
            filePath: e.filePath,
            editType: e.editType,
            description: e.description,
          })),
          userMessage: content,
        }].slice(-50);
      }
      await storage.updateProjectContext(conversationId, updateData);

      const savedMessage = await storage.createMessage(conversationId, "assistant", result.responseContent, result.thinkingSteps);

      const chunks = result.responseContent.split(/(?<=\s)/);
      for (const chunk of chunks) {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const donePayload: any = {
        done: true,
        thinkingSteps: result.thinkingSteps,
        messageId: savedMessage.id,
        phase: result.newPhase,
      };
      if (result.generatedFiles && !result.fileEdits) {
        donePayload.deepProject = {
          name: result.planData?.projectName || 'Generated Project',
          totalFiles: result.generatedFiles.length,
        };
      }
      if (result.fileEdits && result.fileEdits.length > 0) {
        donePayload.fileEdits = result.fileEdits.map(e => ({
          filePath: e.filePath,
          editType: e.editType,
          description: e.description,
          linesChanged: e.linesChanged,
        }));
        donePayload.editType = result.editResult?.editType;
      }
      if (result.validationSummary) {
        donePayload.validationSummary = result.validationSummary;
      }
      donePayload.slmEnhanced = result.slmEnhanced || false;
      donePayload.slmStagesRun = result.slmStagesRun || [];
      if (result.diagnostics) {
        donePayload.diagnostics = result.diagnostics;
      }
      if (result.newPhase === 'approval') {
        donePayload.showApproval = true;
      }

      res.write(`data: ${JSON.stringify(donePayload)}\n\n`);
      res.end();

      if (result.diagnostics) {
        setImmediate(async () => {
          try {
            await storage.updateProjectContext(conversationId, { diagnostics: result.diagnostics });
          } catch (err) {
            console.error('[Diagnostics] Failed to persist diagnostics:', err);
          }
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to generate response" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to send message" });
      }
    }
  });

  // Project Files API
  app.get("/api/conversations/:id/files", async (req, res) => {
    try {
      const conversationId = parseValidId(req.params.id);
      if (conversationId === null) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }
      const files = await storage.getProjectFiles(conversationId);
      res.json(files);
    } catch (error) {
      console.error("Error fetching project files:", error);
      res.status(500).json({ error: "Failed to fetch project files" });
    }
  });

  app.post("/api/conversations/:id/files", async (req, res) => {
    try {
      const conversationId = parseValidId(req.params.id);
      if (conversationId === null) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }

      const { path, content, language } = req.body;
      if (!path || !content || !language) {
        return res.status(400).json({ error: "Missing required fields: path, content, language" });
      }

      const fixedContent = clientAutoFixCode(content, path);
      const file = await storage.upsertProjectFile(conversationId, path, fixedContent, language);
      res.status(201).json(file);
    } catch (error) {
      console.error("Error creating project file:", error);
      res.status(500).json({ error: "Failed to create project file" });
    }
  });

  app.put("/api/files/:id", async (req, res) => {
    try {
      const id = parseValidId(req.params.id);
      if (id === null) {
        return res.status(400).json({ error: "Invalid file ID" });
      }

      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ error: "Missing content" });
      }

      const file = await storage.updateProjectFile(id, content);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      res.json(file);
    } catch (error) {
      console.error("Error updating project file:", error);
      res.status(500).json({ error: "Failed to update project file" });
    }
  });

  app.delete("/api/files/:id", async (req, res) => {
    try {
      const id = parseValidId(req.params.id);
      if (id === null) {
        return res.status(400).json({ error: "Invalid file ID" });
      }
      await storage.deleteProjectFile(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting project file:", error);
      res.status(500).json({ error: "Failed to delete project file" });
    }
  });

  // Delete all files for a conversation (used before regeneration to prevent duplicates)
  app.delete("/api/conversations/:id/files", async (req, res) => {
    try {
      const conversationId = parseValidId(req.params.id);
      if (conversationId === null) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }
      await storage.deleteProjectFilesByConversation(conversationId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting project files:", error);
      res.status(500).json({ error: "Failed to delete project files" });
    }
  });

  // Bulk save files from code generation
  app.post("/api/conversations/:id/files/bulk", async (req, res) => {
    try {
      const conversationId = parseValidId(req.params.id);
      if (conversationId === null) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }

      const { files } = req.body;
      if (!Array.isArray(files)) {
        return res.status(400).json({ error: "Files must be an array" });
      }

      const savedFiles = [];
      for (const file of files) {
        if (file.path && file.content && file.language) {
          const fixedContent = clientAutoFixCode(file.content, file.path);
          const saved = await storage.upsertProjectFile(conversationId, file.path, fixedContent, file.language);
          savedFiles.push(saved);
        }
      }

      res.status(201).json(savedFiles);
    } catch (error) {
      console.error("Error bulk saving project files:", error);
      res.status(500).json({ error: "Failed to save project files" });
    }
  });

  // ========== INTELLIGENCE MODULE ROUTES ==========

  // Analyze prompt for clarification questions
  app.post("/api/analyze-prompt", async (req, res) => {
    try {
      const { prompt, conversationId } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      let existingContext = null;
      if (conversationId) {
        const conversation = await storage.getConversation(conversationId);
        existingContext = conversation;
      }

      const analysis = analyzePrompt(prompt, existingContext);
      const questions = formatClarificationQuestions(analysis.suggestedQuestions);

      res.json({
        ...analysis,
        formattedQuestions: questions,
      });
    } catch (error) {
      console.error("Error analyzing prompt:", error);
      res.status(500).json({ error: "Failed to analyze prompt" });
    }
  });

  // Generate project plan
  app.post("/api/conversations/:id/plan", async (req, res) => {
    try {
      const conversationId = parseValidId(req.params.id);
      if (conversationId === null) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }

      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      const { requirements } = req.body;
      const projectName = conversation.projectName || "New Project";
      const projectType = conversation.projectType || "webapp";
      const complexity = (conversation.complexity || "moderate") as 'simple' | 'moderate' | 'complex';

      const plan = generateProjectPlan(projectName, projectType, requirements || "", complexity);
      const markdown = formatPlanAsMarkdown(plan);

      // Save plan to database
      await storage.createProjectPlan({
        conversationId,
        summary: plan.summary,
        techStack: plan.techStack,
        architecture: plan.architecture.overview,
        folderStructure: markdown,
        designDecisions: plan.designDecisions.map(d => ({ decision: d.decision, rationale: d.rationale })),
        securityConsiderations: plan.securityConsiderations,
      });

      // Update conversation
      await storage.updateProjectContext(conversationId, { planGenerated: true });

      res.json({ plan, markdown });
    } catch (error) {
      console.error("Error generating plan:", error);
      res.status(500).json({ error: "Failed to generate project plan" });
    }
  });

  // Get project plan
  app.get("/api/conversations/:id/plan", async (req, res) => {
    try {
      const conversationId = parseValidId(req.params.id);
      if (conversationId === null) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }

      const plan = await storage.getProjectPlan(conversationId);
      res.json(plan || null);
    } catch (error) {
      console.error("Error fetching plan:", error);
      res.status(500).json({ error: "Failed to fetch project plan" });
    }
  });

  // Run tests on project files
  app.post("/api/conversations/:id/test", async (req, res) => {
    try {
      const conversationId = parseValidId(req.params.id);
      if (conversationId === null) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }

      const files = await storage.getProjectFiles(conversationId);
      if (files.length === 0) {
        return res.json({ message: "No files to test", results: [] });
      }

      const allResults = [];
      let totalPassed = 0;
      let totalFailed = 0;

      for (const file of files) {
        const suite = generateTestsForCode(file.content, file.language, file.path);
        const results = runTests(suite, file.content);

        totalPassed += results.passed;
        totalFailed += results.failed;

        // Save test results
        await storage.createTestResult({
          conversationId,
          targetFile: file.path,
          passed: results.passed,
          failed: results.failed,
          skipped: results.skipped,
          coverage: results.coverage,
          details: results.details,
        });

        allResults.push({
          file: file.path,
          ...results,
          formatted: formatTestResults(results),
        });
      }

      // Update conversation test stats
      await storage.updateProjectContext(conversationId, {
        testsPassed: totalPassed,
        testsFailed: totalFailed,
      });

      // Validate build
      const buildValidation = validateBuild(files.map(f => ({
        path: f.path,
        content: f.content,
        language: f.language,
      })));

      res.json({
        totalPassed,
        totalFailed,
        buildValid: buildValidation.valid,
        buildErrors: buildValidation.errors,
        buildWarnings: buildValidation.warnings,
        fileResults: allResults,
      });
    } catch (error) {
      console.error("Error running tests:", error);
      res.status(500).json({ error: "Failed to run tests" });
    }
  });

  // Security scan
  app.post("/api/conversations/:id/security-scan", async (req, res) => {
    try {
      const conversationId = parseValidId(req.params.id);
      if (conversationId === null) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }

      const files = await storage.getProjectFiles(conversationId);
      if (files.length === 0) {
        return res.json({ message: "No files to scan", score: 100, grade: "A", issues: [], passedChecks: [], checks: [], totalChecks: 0, report: "No files to scan", recommendations: [] });
      }

      const scanResult = scanForVulnerabilities(files.map(f => ({
        path: f.path,
        content: f.content,
        language: f.language,
      })));

      const report = formatSecurityReport(scanResult);
      const conversation = await storage.getConversation(conversationId);
      const recommendations = getSecurityRecommendations(conversation?.projectType || "webapp");

      // Save scan results
      await storage.createSecurityScan({
        conversationId,
        score: scanResult.score,
        grade: scanResult.grade,
        issues: scanResult.issues.map(i => ({
          severity: i.severity,
          category: i.category,
          title: i.title,
          recommendation: i.recommendation,
        })),
        passedChecks: scanResult.passedChecks,
      });

      // Update conversation security score
      await storage.updateProjectContext(conversationId, {
        securityScore: scanResult.score,
      });

      res.json({
        ...scanResult,
        report,
        recommendations,
      });
    } catch (error) {
      console.error("Error running security scan:", error);
      res.status(500).json({ error: "Failed to run security scan" });
    }
  });

  // Auto-fix errors endpoint
  app.post("/api/conversations/:id/auto-fix", async (req, res) => {
    try {
      const conversationId = parseValidId(req.params.id);
      if (conversationId === null) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }

      const { errors: errorMessages = [], attempt = 1 } = req.body;

      if (!Array.isArray(errorMessages) || errorMessages.length === 0) {
        return res.json({ fixes: [], summary: "No errors to fix", attempt });
      }

      const files = await storage.getProjectFiles(conversationId);
      if (files.length === 0) {
        return res.json({ fixes: [], summary: "No files to fix", attempt });
      }

      const projectFiles = files.map(f => ({
        path: f.path,
        content: f.content,
        language: f.language,
      }));

      // Proactively fix TypeScript generic bracket mismatches on every TS/TSX file
      // before parsing errors — catches `res: Response> =>` style LLM mistakes
      // that don't match any Vite error pattern but show up in IDE diagnostics
      const tsBracketFixes: { filePath: string; description: string; type: string }[] = [];
      const tsFixedFiles = projectFiles.map(f => {
        if (/\.(ts|tsx)$/.test(f.path)) {
          const patched = fixTSGenericBracketMismatch(f.content);
          if (patched !== f.content) {
            tsBracketFixes.push({
              filePath: f.path,
              description: `Fixed TypeScript generic bracket mismatch in ${f.path}`,
              type: 'patch_file',
            });
            return { ...f, content: patched };
          }
        }
        return f;
      });

      // Persist TS bracket fixes immediately
      for (const fix of tsBracketFixes) {
        const original = files.find(f => f.path === fix.filePath);
        const patched = tsFixedFiles.find(f => f.path === fix.filePath);
        if (original && patched && patched.content !== original.content) {
          await storage.updateProjectFile(original.id, patched.content);
        }
      }

      // Parse the error messages
      const parsedErrors = parseErrors(errorMessages);

      // Analyze and generate fixes (use TS-fixed file list as base)
      const result = analyzeAndFix(parsedErrors, tsFixedFiles);

      // Also run import path validation
      const importFixes = validateImportPaths(tsFixedFiles);
      const allFixes = [...result.fixes];
      for (const importFix of importFixes) {
        if (!allFixes.some(f => f.filePath === importFix.filePath && f.type === importFix.type)) {
          allFixes.push(importFix);
        }
      }

      // Apply the fixes
      const appliedFixes: { filePath: string; description: string; type: string }[] = [];
      const newDependencies: { name: string; version: string }[] = [];

      for (const fix of allFixes) {
        try {
          if (fix.type === 'add_dependency' && fix.packageName) {
            newDependencies.push({ name: fix.packageName, version: fix.packageVersion || 'latest' });
            appliedFixes.push({ filePath: fix.filePath, description: fix.description, type: fix.type });
            continue;
          }

          if (fix.type === 'create_file') {
            await storage.upsertProjectFile(
              conversationId,
              fix.filePath,
              fix.newContent,
              fix.filePath.split('.').pop() || 'text'
            );
            appliedFixes.push({ filePath: fix.filePath, description: fix.description, type: fix.type });
            continue;
          }

          if (fix.type === 'patch_file' || fix.type === 'fix_path') {
            const existingFile = files.find(f => f.path === fix.filePath);
            if (existingFile && fix.newContent && fix.newContent !== existingFile.content) {
              await storage.updateProjectFile(existingFile.id, fix.newContent);
              appliedFixes.push({ filePath: fix.filePath, description: fix.description, type: fix.type });
            }
            continue;
          }
        } catch (fixError: any) {
          logger.error(`Failed to apply fix for ${fix.filePath}:`, String(fixError));
        }
      }

      // Handle dependency additions - update package.json
      if (newDependencies.length > 0) {
        const pkgFile = files.find(f => f.path === 'package.json' || f.path.endsWith('/package.json'));
        if (pkgFile) {
          const updatedPkg = addDependenciesToPackageJson(pkgFile.content, newDependencies);
          if (updatedPkg !== pkgFile.content) {
            await storage.updateProjectFile(pkgFile.id, updatedPkg);
          }
        }
      }

      // Log the fix attempt to transparency
      try {
        await storage.createIntelRecord({
          conversationId,
          type: 'debug',
          category: 'auto-fix',
          key: `auto-fix-attempt-${attempt}`,
          value: JSON.stringify({
            fixesApplied: appliedFixes.length,
            unfixable: result.unfixable.length,
            summary: result.summary,
            errors: errorMessages.slice(0, 5),
          }),
        });
      } catch (logError) {
        // Non-critical, continue
      }

      const allApplied = [...tsBracketFixes, ...appliedFixes];
      res.json({
        fixes: allApplied,
        unfixable: result.unfixable.map(e => ({ type: e.type, message: e.message })),
        newDependencies,
        summary: tsBracketFixes.length > 0
          ? `Fixed ${tsBracketFixes.length} TypeScript bracket mismatch(es); ${result.summary}`
          : result.summary,
        attempt,
        totalErrors: parsedErrors.length,
        totalFixed: allApplied.length,
      });
    } catch (error: any) {
      logger.error("Error running auto-fix:", String(error));
      res.status(500).json({ error: "Failed to auto-fix errors" });
    }
  });

  // Get transparency report
  app.get("/api/conversations/:id/transparency", async (req, res) => {
    try {
      const conversationId = parseValidId(req.params.id);
      if (conversationId === null) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }

      const files = await storage.getProjectFiles(conversationId);
      const conversation = await storage.getConversation(conversationId);
      const logs = await storage.getGenerationLogs(conversationId);
      const messages = await storage.getMessagesByConversation(conversationId);

      const thinkingSteps: any[] = [];
      for (const msg of messages) {
        if (msg.thinkingSteps && Array.isArray(msg.thinkingSteps)) {
          thinkingSteps.push(...(msg.thinkingSteps as any[]));
        }
      }

      const assumptions = extractAssumptions(
        "",
        conversation?.projectType || "webapp",
        files.map(f => ({ path: f.path, content: f.content }))
      );

      const report = formatTransparencyReport(
        files.map(f => ({ path: f.path, content: f.content, language: f.language })),
        assumptions,
        logs.length > 1
      );

      res.json({
        report,
        assumptions,
        logs,
        thinkingSteps,
        fileCount: files.length,
      });
    } catch (error) {
      console.error("Error generating transparency report:", error);
      res.status(500).json({ error: "Failed to generate transparency report" });
    }
  });

  // Get/update intel records
  app.get("/api/conversations/:id/intel", async (req, res) => {
    try {
      const conversationId = parseValidId(req.params.id);
      if (conversationId === null) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }

      const records = await storage.getIntelRecords(conversationId);
      const inMemoryIntel = getIntel(conversationId);

      res.json({
        records,
        preferences: inMemoryIntel?.preferences || {},
        learnings: inMemoryIntel?.learnings || [],
      });
    } catch (error) {
      console.error("Error fetching intel:", error);
      res.status(500).json({ error: "Failed to fetch intel" });
    }
  });

  // Extract and store intel from messages
  app.post("/api/conversations/:id/intel/extract", async (req, res) => {
    try {
      const conversationId = parseValidId(req.params.id);
      if (conversationId === null) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }

      const messages = await storage.getMessagesByConversation(conversationId);
      const intel = extractIntelFromMessages(conversationId, messages.map(m => ({
        role: m.role,
        content: m.content,
      })));

      // Store in memory
      storeIntel(conversationId, intel);

      // Store in database
      for (const record of intel) {
        await storage.upsertIntelRecord(
          conversationId,
          record.key,
          record.category,
          record.value,
          record.type
        );
      }

      const context = generateIntelContext(conversationId);

      res.json({
        extracted: intel.length,
        records: intel,
        contextForAI: context,
      });
    } catch (error) {
      console.error("Error extracting intel:", error);
      res.status(500).json({ error: "Failed to extract intel" });
    }
  });

  // Analyze dependencies
  app.get("/api/conversations/:id/dependencies", async (req, res) => {
    try {
      const conversationId = parseValidId(req.params.id);
      if (conversationId === null) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }

      const files = await storage.getProjectFiles(conversationId);
      if (files.length === 0) {
        return res.json({ message: "No files to analyze", dependencies: [] });
      }

      const analysis = analyzeDependencies(files.map(f => ({
        path: f.path,
        content: f.content,
        language: f.language,
      })));

      const report = formatDependencyReport(analysis);
      const envExample = generateEnvExample(analysis.envVariables);

      res.json({
        ...analysis,
        report,
        envExample,
      });
    } catch (error) {
      console.error("Error analyzing dependencies:", error);
      res.status(500).json({ error: "Failed to analyze dependencies" });
    }
  });

  // Export project
  app.get("/api/conversations/:id/export", async (req, res) => {
    try {
      const conversationId = parseValidId(req.params.id);
      if (conversationId === null) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }

      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      const files = await storage.getProjectFiles(conversationId);
      if (files.length === 0) {
        return res.status(400).json({ error: "No files to export" });
      }

      const projectName = conversation.projectName || conversation.title || "project";
      const projectType = conversation.projectType || "webapp";

      const exportData = generateProjectExport(
        projectName,
        projectType,
        files.map(f => ({
          path: f.path,
          content: f.content,
          language: f.language,
        }))
      );

      const download = generateDownloadData(exportData);

      res.json({
        projectName: exportData.name,
        fileCount: exportData.files.length,
        readme: exportData.readme,
        download,
      });
    } catch (error) {
      console.error("Error exporting project:", error);
      res.status(500).json({ error: "Failed to export project" });
    }
  });

  // Download project as text bundle
  app.get("/api/conversations/:id/download", async (req, res) => {
    try {
      const conversationId = parseValidId(req.params.id);
      if (conversationId === null) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }

      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      const files = await storage.getProjectFiles(conversationId);
      if (files.length === 0) {
        return res.status(400).json({ error: "No files to download" });
      }

      const projectName = conversation.projectName || conversation.title || "project";
      const projectType = conversation.projectType || "webapp";

      const exportData = generateProjectExport(
        projectName,
        projectType,
        files.map(f => ({
          path: f.path,
          content: f.content,
          language: f.language,
        }))
      );

      const download = generateDownloadData(exportData);

      res.setHeader("Content-Type", download.mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${download.filename}"`);
      res.send(download.content);
    } catch (error) {
      console.error("Error downloading project:", error);
      res.status(500).json({ error: "Failed to download project" });
    }
  });

  // Generation logs
  app.post("/api/conversations/:id/logs", async (req, res) => {
    try {
      const conversationId = parseValidId(req.params.id);
      if (conversationId === null) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }

      const { action, targetFile, description, linesChanged, reasoning, assumptions } = req.body;

      const log = await storage.createGenerationLog({
        conversationId,
        action: action || "create",
        targetFile: targetFile || "unknown",
        description: description || "Generated code",
        linesChanged: linesChanged || 0,
        reasoning,
        assumptions,
      });

      res.status(201).json(log);
    } catch (error) {
      console.error("Error creating generation log:", error);
      res.status(500).json({ error: "Failed to create generation log" });
    }
  });

  app.get("/api/conversations/:id/logs", async (req, res) => {
    try {
      const conversationId = parseValidId(req.params.id);
      if (conversationId === null) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }

      const logs = await storage.getGenerationLogs(conversationId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching generation logs:", error);
      res.status(500).json({ error: "Failed to fetch generation logs" });
    }
  });

  // Project stats summary
  app.get("/api/conversations/:id/stats", async (req, res) => {
    try {
      const conversationId = parseValidId(req.params.id);
      if (conversationId === null) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }

      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      const files = await storage.getProjectFiles(conversationId);
      const messages = await storage.getMessagesByConversation(conversationId);
      const securityScan = await storage.getLatestSecurityScan(conversationId);
      const testResults = await storage.getTestResults(conversationId);
      const plan = await storage.getProjectPlan(conversationId);

      // Calculate totals
      const totalLines = files.reduce((sum, f) => sum + f.content.split('\n').length, 0);
      const latestTests = testResults[0];

      res.json({
        projectName: conversation.projectName || conversation.title,
        projectType: conversation.projectType,
        complexity: conversation.complexity,
        designStyle: conversation.designStyle,
        techStack: conversation.techStack || [],
        featuresBuilt: conversation.featuresBuilt || [],
        fileCount: files.length,
        totalLines,
        messageCount: messages.length,
        securityScore: securityScan?.score || conversation.securityScore,
        securityGrade: securityScan?.grade,
        testsPassed: latestTests?.passed || conversation.testsPassed || 0,
        testsFailed: latestTests?.failed || conversation.testsFailed || 0,
        hasPlan: !!plan,
        createdAt: conversation.createdAt,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch project stats" });
    }
  });

  // ==========================================
  // GitHub Integration Routes
  // ==========================================

  // Helper function to get GitHub client
  async function getGitHubClient() {
    const { Octokit } = await import("@octokit/rest");

    const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
    const xReplitToken = process.env.REPL_IDENTITY
      ? 'repl ' + process.env.REPL_IDENTITY
      : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

    if (!xReplitToken || !hostname) {
      throw new Error('GitHub integration not available');
    }

    const response = await fetch(
      'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
      {
        headers: {
          'Accept': 'application/json',
          'X_REPLIT_TOKEN': xReplitToken
        }
      }
    );

    const data = await response.json();
    const connectionSettings = data.items?.[0];
    const accessToken = connectionSettings?.settings?.access_token ||
                        connectionSettings?.settings?.oauth?.credentials?.access_token;

    if (!connectionSettings || !accessToken) {
      throw new Error('GitHub not connected');
    }

    return new Octokit({ auth: accessToken });
  }

  // List user's GitHub repositories
  app.get("/api/github/repos", async (req, res) => {
    try {
      const octokit = await getGitHubClient();
      const { data: repos } = await octokit.repos.listForAuthenticatedUser({
        sort: 'updated',
        per_page: 50
      });

      res.json(repos.map(repo => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        html_url: repo.html_url,
        language: repo.language,
        default_branch: repo.default_branch,
        updated_at: repo.updated_at,
        private: repo.private
      })));
    } catch (error) {
      console.error("Error fetching GitHub repos:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  // Get repository contents (files)
  // Supports X-GitHub-Token header for private repos
  app.get("/api/github/repos/:owner/:repo/contents", async (req, res) => {
    try {
      const { owner, repo } = req.params;
      const path = (req.query.path as string) || '';
      const ref = (req.query.ref as string) || undefined;

      // Check for custom token in header (for private repos)
      const customToken = req.headers['x-github-token'] as string | undefined;

      let octokit;
      if (customToken) {
        const { Octokit } = await import("@octokit/rest");
        octokit = new Octokit({ auth: customToken });
      } else {
        octokit = await getGitHubClient();
      }

      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path,
        ref
      });

      res.json(data);
    } catch (error: any) {
      console.error("Error fetching repo contents:", error);
      const status = error.status || 500;
      const message = error.message || "Unknown error";
      res.status(status).json({ error: message });
    }
  });

  // Import files from GitHub repository to conversation
  const importGithubSchema = z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    branch: z.string().optional(),
    files: z.array(z.string()).min(1)
  });

  app.post("/api/conversations/:id/import-github", async (req, res) => {
    try {
      const conversationId = parseValidId(req.params.id);
      if (conversationId === null) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }

      const validation = importGithubSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid request", details: validation.error.errors });
      }

      const { owner, repo, branch, files: filePaths } = validation.data;

      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      const octokit = await getGitHubClient();
      const importedFiles = [];

      for (const filePath of filePaths) {
        try {
          const { data } = await octokit.repos.getContent({
            owner,
            repo,
            path: filePath,
            ref: branch
          });

          if (!Array.isArray(data) && data.type === 'file' && data.content) {
            const content = Buffer.from(data.content, 'base64').toString('utf-8');
            const ext = filePath.split('.').pop()?.toLowerCase() || 'text';
            const languageMap: Record<string, string> = {
              'js': 'javascript',
              'mjs': 'javascript',
              'jsx': 'javascript',
              'ts': 'typescript',
              'tsx': 'typescript',
              'css': 'css',
              'html': 'html',
              'json': 'json',
              'md': 'markdown',
              'py': 'python',
            };
            const language = languageMap[ext] || ext;

            const file = await storage.createProjectFile({
              conversationId,
              path: filePath,
              content,
              language
            });

            importedFiles.push(file);
          }
        } catch (err) {
          console.error(`Failed to import ${filePath}:`, err);
        }
      }

      let ingestionResult = null;
      if (importedFiles.length > 0) {
        try {
          const allFiles = await storage.getProjectFiles(conversationId);
          const ingestionFiles: IngestionFileInfo[] = allFiles.map(f => ({
            path: f.path,
            content: f.content,
            language: f.language,
          }));
          const analysis = analyzeCodebase(ingestionFiles);
          const plan = generatePlanFromCodebase(analysis);
          const summary = formatReversePlanSummary(plan, analysis);

          await storage.updateProjectContext(conversationId, {
            conversationPhase: 'editing',
            projectPlanData: plan as any,
            understandingData: {
              level1_intent: { primaryGoal: 'Imported codebase from GitHub', secondaryFeatures: [], impliedRequirements: [] },
              level2_domain: { primaryDomain: null, confidence: 0 },
              level3_entities: { mentionedEntities: plan.dataModel.map(e => e.name), inferredEntities: [] },
              level4_workflows: { inferredWorkflows: plan.workflows || [] },
              level5_clarification: { needsClarification: false, questions: [] },
            } as any,
          });

          await storage.createMessage(
            conversationId,
            'assistant',
            summary,
            [
              { phase: 'ingestion', label: 'Auto-Ingestion', detail: `Automatically analyzed ${analysis.stats.totalFiles} imported files` },
              { phase: 'ingestion', label: 'Plan Reconstruction', detail: `${plan.dataModel.length} entities, ${plan.pages.length} pages, ${plan.apiEndpoints.length} endpoints` },
            ]
          );

          ingestionResult = {
            analyzed: true,
            stats: analysis.stats,
            techStack: analysis.techStack.summary,
            entities: plan.dataModel.length,
            pages: plan.pages.length,
            endpoints: plan.apiEndpoints.length,
          };
        } catch (ingestionErr) {
          console.error("Auto-ingestion after GitHub import failed (non-fatal):", ingestionErr);
          ingestionResult = { analyzed: false, error: 'Ingestion failed but files were imported successfully' };
        }
      }

      res.json({
        success: true,
        importedCount: importedFiles.length,
        files: importedFiles,
        ingestion: ingestionResult,
      });
    } catch (error) {
      console.error("Error importing from GitHub:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  // Upload files to conversation
  const uploadFilesSchema = z.object({
    files: z.array(z.object({
      path: z.string().min(1),
      content: z.string()
    })).min(1)
  });

  app.post("/api/conversations/:id/upload-files", async (req, res) => {
    try {
      const conversationId = parseValidId(req.params.id);
      if (conversationId === null) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }

      const validation = uploadFilesSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid request", details: validation.error.errors });
      }

      const { files } = validation.data;

      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      const uploadedFiles = [];

      for (const fileData of files) {
        if (!fileData.path || !fileData.content) continue;

        const ext = fileData.path.split('.').pop()?.toLowerCase() || 'text';
        const languageMap: Record<string, string> = {
          'js': 'javascript',
          'mjs': 'javascript',
          'jsx': 'javascript',
          'ts': 'typescript',
          'tsx': 'typescript',
          'css': 'css',
          'html': 'html',
          'json': 'json',
          'md': 'markdown',
          'py': 'python',
        };
        const language = languageMap[ext] || ext;

        // Check if file already exists
        const existingFiles = await storage.getProjectFiles(conversationId);
        const existing = existingFiles.find(f => f.path === fileData.path);

        if (existing) {
          // Update existing file
          const updated = await storage.updateProjectFile(existing.id, fileData.content);
          if (updated) uploadedFiles.push(updated);
        } else {
          // Create new file
          const file = await storage.createProjectFile({
            conversationId,
            path: fileData.path,
            content: fileData.content,
            language
          });
          uploadedFiles.push(file);
        }
      }

      res.json({
        success: true,
        uploadedCount: uploadedFiles.length,
        files: uploadedFiles
      });
    } catch (error) {
      console.error("Error uploading files:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/conversations/:id/ingest", async (req, res) => {
    try {
      const conversationId = parseValidId(req.params.id);
      if (conversationId === null) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }

      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      const existingFiles = await storage.getProjectFiles(conversationId);
      if (existingFiles.length === 0) {
        return res.status(400).json({ error: "No files to analyze. Import or upload files first." });
      }

      const ingestionFiles: IngestionFileInfo[] = existingFiles.map(f => ({
        path: f.path,
        content: f.content,
        language: f.language,
      }));

      const analysis = analyzeCodebase(ingestionFiles);
      const plan = generatePlanFromCodebase(analysis);
      const crossFileReport = traceCrossFileRelationships(analysis);
      const summary = formatReversePlanSummary(plan, analysis);

      await storage.updateProjectContext(conversationId, {
        conversationPhase: 'editing',
        projectPlanData: plan as any,
        understandingData: {
          level1_intent: { primaryGoal: 'Imported codebase', secondaryFeatures: [], impliedRequirements: [] },
          level2_domain: { primaryDomain: null, confidence: 0 },
          level3_entities: { mentionedEntities: plan.dataModel.map(e => e.name), inferredEntities: [] },
          level4_workflows: { inferredWorkflows: plan.workflows || [] },
          level5_clarification: { needsClarification: false, questions: [] },
        } as any,
      });

      await storage.createMessage(
        conversationId,
        'assistant',
        summary,
        [
          { phase: 'ingestion', label: 'Codebase Ingestion', detail: `Analyzed ${analysis.stats.totalFiles} files` },
          { phase: 'ingestion', label: 'Tech Stack Detection', detail: analysis.techStack.summary },
          { phase: 'ingestion', label: 'Entity Extraction', detail: `Found ${analysis.models.length} data models` },
          { phase: 'ingestion', label: 'Route Mapping', detail: `Found ${analysis.routes.length} API routes` },
          { phase: 'ingestion', label: 'Component Analysis', detail: `Found ${analysis.components.length} components` },
          { phase: 'ingestion', label: 'Plan Reconstruction', detail: `Generated plan with ${plan.dataModel.length} entities, ${plan.pages.length} pages` },
        ]
      );

      res.json({
        success: true,
        summary,
        stats: analysis.stats,
        techStack: analysis.techStack.summary,
        plan: {
          entities: plan.dataModel.length,
          pages: plan.pages.length,
          endpoints: plan.apiEndpoints.length,
          modules: plan.modules.length,
          workflows: plan.workflows.length,
          integrations: plan.integrations?.length || 0,
        },
        crossFileReport: {
          hotFiles: crossFileReport.hotFiles.slice(0, 10),
          layers: crossFileReport.layerMap.map(l => ({ layer: l.layer, count: l.files.length })),
          brokenLinks: crossFileReport.brokenLinks.length,
          dataFlows: crossFileReport.dataFlows.length,
        },
      });
    } catch (error) {
      console.error("Error ingesting codebase:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  // Push project files to GitHub repository
  app.post("/api/github/push", async (req, res) => {
    try {
      const { owner, repo, branch = "main", message = "Update from AutoCoder", files, token } = req.body;

      if (!owner || !repo || !files || !Array.isArray(files)) {
        return res.status(400).json({ error: "Missing owner, repo, or files" });
      }

      const { Octokit } = await import("@octokit/rest");

      // Use provided token or try to get from connector
      let octokit: InstanceType<typeof Octokit>;
      if (token) {
        octokit = new Octokit({ auth: token });
      } else {
        try {
          octokit = await getGitHubClient();
        } catch (e) {
          return res.status(401).json({ error: "No GitHub token. Provide a token in the request." });
        }
      }

      const results = [];

      for (const file of files) {
        if (!file.path || !file.content) continue;

        try {
          // Get current file SHA if it exists (needed for updates)
          let sha: string | undefined;
          try {
            const { data: existingFile } = await octokit.repos.getContent({
              owner,
              repo,
              path: file.path,
              ref: branch
            });
            if ('sha' in existingFile) {
              sha = existingFile.sha;
            }
          } catch (e) {
            // File doesn't exist, that's fine
          }

          // Create or update file
          await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: file.path,
            message: `${message}: ${file.path}`,
            content: Buffer.from(file.content).toString('base64'),
            branch,
            sha
          });

          results.push({ path: file.path, status: 'success' });
        } catch (fileError: any) {
          results.push({ path: file.path, status: 'error', error: fileError.message });
        }
      }

      const successCount = results.filter(r => r.status === 'success').length;
      res.json({
        success: true,
        pushed: successCount,
        total: files.length,
        results
      });
    } catch (error) {
      console.error("GitHub push error:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/conversations/:id/github-push", async (req, res) => {
    try {
      const conversationId = parseValidId(req.params.id);
      if (conversationId === null) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }

      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      const files = await storage.getProjectFiles(conversationId);
      if (files.length === 0) {
        return res.status(400).json({ error: "No files to push" });
      }

      const octokit = await getGitHubClient();
      const { data: user } = await octokit.users.getAuthenticated();

      const repoName = (conversation.projectName || conversation.title || `autocoder-project-${conversationId}`)
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 100);

      let repoUrl: string;
      try {
        const { data: repo } = await octokit.repos.get({ owner: user.login, repo: repoName });
        repoUrl = repo.html_url;
      } catch {
        const { data: repo } = await octokit.repos.createForAuthenticatedUser({
          name: repoName,
          description: `Generated by AutoCoder: ${conversation.title || 'Project'}`,
          auto_init: true,
        });
        repoUrl = repo.html_url;
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      let pushed = 0;
      for (const file of files) {
        try {
          let sha: string | undefined;
          try {
            const { data: existing } = await octokit.repos.getContent({
              owner: user.login, repo: repoName, path: file.path
            });
            if ('sha' in existing) sha = existing.sha;
          } catch {}

          await octokit.repos.createOrUpdateFileContents({
            owner: user.login,
            repo: repoName,
            path: file.path,
            message: `Update ${file.path} via AutoCoder`,
            content: Buffer.from(file.content).toString('base64'),
            sha
          });
          pushed++;
        } catch (e) {
          console.error(`Failed to push ${file.path}:`, e);
        }
      }

      res.json({ success: true, url: repoUrl, pushed, total: files.length });
    } catch (error) {
      console.error("Conversation GitHub push error:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  // ============================================
  // AI FULL-STACK GENERATOR ENDPOINTS
  // ============================================

  // Import the AI generator module
  const { generateFullStackAppStream, generateFullStackApp, modifyCode } = await import("../modules/ai-fullstack-generator");

  // Streaming generation endpoint
  app.post("/api/generate-fullstack", async (req, res) => {
    try {
      const { prompt, conversationId } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      logger.info(`AI Full-Stack Generation: "${prompt.substring(0, 100)}..."`, "AI");

      await generateFullStackAppStream(prompt, res);

    } catch (error) {
      console.error("AI Generation Error:", error);
      const message = error instanceof Error ? error.message : "Generation failed";
      res.status(500).json({ error: message });
    }
  });

  // Synchronous generation endpoint (simpler, no streaming)
  app.post("/api/generate-fullstack-sync", async (req, res) => {
    try {
      const { prompt, conversationId } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      logger.info(`AI Full-Stack Sync Generation: "${prompt.substring(0, 100)}..."`, "AI");

      const project = await generateFullStackApp(prompt);

      // If conversationId provided, save files to database
      if (conversationId) {
        for (const file of project.files) {
          const fixedContent = clientAutoFixCode(file.content, file.path);
          await storage.upsertProjectFile(conversationId, file.path, fixedContent, file.language);
        }
      }

      res.json(project);

    } catch (error) {
      console.error("AI Generation Error:", error);
      const message = error instanceof Error ? error.message : "Generation failed";
      res.status(500).json({ error: message });
    }
  });

  // Code modification endpoint
  app.post("/api/modify-code", async (req, res) => {
    try {
      const { code, instructions, language } = req.body;

      if (!code || !instructions) {
        return res.status(400).json({ error: "Code and instructions are required" });
      }

      const modifiedCode = await modifyCode(code, instructions, language);
      res.json({ code: modifiedCode });

    } catch (error) {
      console.error("Code Modification Error:", error);
      const message = error instanceof Error ? error.message : "Modification failed";
      res.status(500).json({ error: message });
    }
  });

  // ============================================
  // LOCAL LLM CODE INTELLIGENCE ENDPOINTS
  // For understanding, editing, and fixing code
  // ============================================

  const {
    generateWithLocalLLM,
    isLocalLLMAvailable,
    EDIT_CODE_PROMPT,
    FIX_CODE_PROMPT,
    UNDERSTAND_CODE_PROMPT
  } = await import("../modules/local-llm-client");
  const { cleanCodeArtifacts } = await import("../modules/code-cleaner");

  // Understand code - analyze what code does
  app.post("/api/ai/understand", async (req, res) => {
    try {
      const { code, question } = req.body;

      if (!code) {
        return res.status(400).json({ error: "Code is required" });
      }

      const isLocal = await isLocalLLMAvailable();
      if (!isLocal) {
        return res.status(503).json({
          error: "Local LLM not available",
          message: "Start Ollama on your machine (ollama serve) to use AI code analysis",
          localOnly: true
        });
      }

      const prompt = question
        ? `Analyze this code and answer: ${question}\n\nCode:\n${code}`
        : `Analyze this code and explain what it does:\n\n${code}`;

      const response = await generateWithLocalLLM(prompt, UNDERSTAND_CODE_PROMPT);

      // Try to parse as JSON if structured output expected
      const { extractJSON } = await import("../modules/local-llm-client");
      const jsonContent = extractJSON(response);

      if (jsonContent) {
        try {
          const parsed = JSON.parse(jsonContent);
          res.json({ analysis: parsed, raw: response, structured: true });
        } catch {
          res.json({ analysis: response, structured: false });
        }
      } else {
        res.json({ analysis: response, structured: false });
      }

    } catch (error) {
      console.error("Code Understanding Error:", error);
      const message = error instanceof Error ? error.message : "Analysis failed";
      res.status(500).json({ error: message });
    }
  });

  // Edit code - modify code based on instructions
  app.post("/api/ai/edit", async (req, res) => {
    try {
      const { code, instructions, language } = req.body;

      if (!code || !instructions) {
        return res.status(400).json({ error: "Code and instructions are required" });
      }

      const isLocal = await isLocalLLMAvailable();
      if (!isLocal) {
        return res.status(503).json({
          error: "Local LLM not available",
          message: "Start Ollama on your machine (ollama serve) to use AI code editing",
          localOnly: true
        });
      }

      const prompt = `Language: ${language || 'javascript'}

CURRENT CODE:
${code}

INSTRUCTIONS:
${instructions}

Output ONLY the modified code. No explanations.`;

      const response = await generateWithLocalLLM(prompt, EDIT_CODE_PROMPT);
      const cleanedCode = cleanCodeArtifacts(response);
      res.json({ code: cleanedCode });

    } catch (error) {
      console.error("Code Edit Error:", error);
      const message = error instanceof Error ? error.message : "Edit failed";
      res.status(500).json({ error: message });
    }
  });

  // Fix code - fix bugs and errors
  app.post("/api/ai/fix", async (req, res) => {
    try {
      const { code, error: errorMessage, language } = req.body;

      if (!code) {
        return res.status(400).json({ error: "Code is required" });
      }

      const isLocal = await isLocalLLMAvailable();
      if (!isLocal) {
        return res.status(503).json({
          error: "Local LLM not available",
          message: "Start Ollama on your machine (ollama serve) to use AI bug fixing",
          localOnly: true
        });
      }

      const prompt = `Language: ${language || 'javascript'}

BROKEN CODE:
${code}

${errorMessage ? `ERROR MESSAGE: ${errorMessage}` : 'This code has bugs. Find and fix them.'}

Output ONLY the fixed code. No explanations.`;

      const response = await generateWithLocalLLM(prompt, FIX_CODE_PROMPT);
      const cleanedCode = cleanCodeArtifacts(response);
      res.json({ code: cleanedCode, fixed: true });

    } catch (error) {
      console.error("Code Fix Error:", error);
      const message = error instanceof Error ? error.message : "Fix failed";
      res.status(500).json({ error: message });
    }
  });

  // Check if local LLM is available
  app.get("/api/ai/status", async (req, res) => {
    try {
      const available = await isLocalLLMAvailable();
      res.json({
        localLLM: available,
        status: available ? 'ready' : 'offline',
        message: available ? 'Local AI ready' : 'Start Ollama to use local AI'
      });
    } catch (error) {
      res.json({ localLLM: false, status: 'error', message: 'Failed to check status' });
    }
  });

  // ============================================
  // Advanced AI Capabilities
  // ============================================

  // Zod schemas for advanced AI endpoints
  const planSchema = z.object({
    prompt: z.string().min(1, 'Prompt is required'),
  });

  const codeAnalysisSchema = z.object({
    code: z.string().min(1, 'Code is required'),
    language: z.string().optional().default('javascript'),
  });

  const diagnoseSchema = z.object({
    errorMessage: z.string().min(1, 'Error message is required'),
  });

  const learnSchema = z.object({
    userId: z.string().min(1, 'User ID is required'),
    prompt: z.string().min(1, 'Prompt is required'),
    response: z.string().optional().default(''),
    feedback: z.enum(['positive', 'negative']).optional(),
  });

  const contextSchema = z.object({
    userId: z.string().min(1, 'User ID is required'),
    prompt: z.string().min(1, 'Prompt is required'),
  });

  const patternQuerySchema = z.object({
    language: z.string().optional(),
    framework: z.string().optional(),
    category: z.string().optional(),
    search: z.string().optional(),
  });

  // Multi-step reasoning and planning
  app.post("/api/ai/plan", async (req, res) => {
    try {
      const parsed = planSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      }

      const { prompt } = parsed.data;
      const chain = analyzeAndPlan(prompt);
      const markdown = formatReasoningAsMarkdown(chain);

      res.json({
        success: true,
        plan: chain,
        markdown,
        summary: {
          intent: chain.understanding.coreIntent,
          steps: chain.steps.length,
          complexity: chain.timeline.complexity,
          estimatedMinutes: chain.timeline.estimatedMinutes,
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Planning failed';
      res.status(500).json({ error: message });
    }
  });

  // Quick analysis endpoint
  app.post("/api/ai/quick-analyze", async (req, res) => {
    try {
      const parsed = planSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      }

      const { prompt } = parsed.data;
      const analysis = quickAnalysis(prompt);
      res.json({ success: true, analysis });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Analysis failed';
      res.status(500).json({ error: message });
    }
  });

  // Live code analysis
  app.post("/api/ai/analyze-code", async (req, res) => {
    try {
      const parsed = codeAnalysisSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      }

      const { code, language } = parsed.data;
      const analysis = analyzeCode(code, language);
      const markdown = formatAnalysisAsMarkdown(analysis);

      res.json({
        success: true,
        analysis,
        markdown,
        summary: {
          errors: analysis.errors.length,
          warnings: analysis.warnings.length,
          suggestions: analysis.suggestions.length,
          complexity: analysis.complexity.rating,
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Analysis failed';
      res.status(500).json({ error: message });
    }
  });

  // Error diagnosis
  app.post("/api/ai/diagnose", async (req, res) => {
    try {
      const parsed = diagnoseSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      }

      const { errorMessage } = parsed.data;
      const diagnosis = diagnoseError(errorMessage);
      res.json({ success: true, diagnosis });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Diagnosis failed';
      res.status(500).json({ error: message });
    }
  });

  // Auto-fix code
  app.post("/api/ai/auto-fix", async (req, res) => {
    try {
      const parsed = codeAnalysisSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      }

      const { code, language } = parsed.data;
      const analysis = analyzeCode(code, language);
      const { code: fixedCode, fixes } = autoFixCode(code, analysis.errors);

      res.json({
        success: true,
        originalErrors: analysis.errors.length,
        fixesApplied: fixes.length,
        fixes,
        code: fixedCode,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Auto-fix failed';
      res.status(500).json({ error: message });
    }
  });

  // Context memory - learn from interaction
  app.post("/api/ai/learn", async (req, res) => {
    try {
      const parsed = learnSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      }

      const { userId, prompt, response, feedback } = parsed.data;
      learnFromInteraction(userId, prompt, response, feedback);
      res.json({ success: true, message: 'Preferences updated' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Learning failed';
      res.status(500).json({ error: message });
    }
  });

  // Get user context and preferences
  app.get("/api/ai/context/:userId", async (req, res) => {
    try {
      const userId = req.params.userId;
      const prefs = getContextPreferences(userId);
      const summary = formatMemorySummary(userId);

      res.json({
        success: true,
        preferences: prefs,
        summary,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get context';
      res.status(500).json({ error: message });
    }
  });

  // Get relevant context for a prompt
  app.post("/api/ai/relevant-context", async (req, res) => {
    try {
      const parsed = contextSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      }

      const { userId, prompt } = parsed.data;
      const context = getRelevantContext(userId, prompt);
      const enhancedPrompt = applyContextPreferences(userId, prompt);

      res.json({
        success: true,
        context,
        enhancedPrompt,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get context';
      res.status(500).json({ error: message });
    }
  });

  // Framework patterns library
  app.get("/api/ai/patterns", async (req, res) => {
    try {
      const parsed = patternQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid query parameters', details: parsed.error.issues });
      }

      let frameworks = getAllFrameworks();
      if (parsed.data.language) {
        frameworks = getFrameworksByLanguage(parsed.data.language);
      }
      if (parsed.data.category) {
        frameworks = frameworks.filter(f => f.category === parsed.data.category);
      }
      if (parsed.data.search) {
        const search = parsed.data.search.toLowerCase();
        frameworks = frameworks.filter(f =>
          f.name.toLowerCase().includes(search) ||
          f.description.toLowerCase().includes(search) ||
          f.language.toLowerCase().includes(search)
        );
      }

      res.json({
        success: true,
        count: frameworks.length,
        patterns: frameworks.map(f => ({
          id: f.id,
          name: f.name,
          language: f.language,
          category: f.category,
          description: f.description,
          version: f.version,
        })),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get patterns';
      res.status(500).json({ error: message });
    }
  });

  // Get specific framework pattern
  app.get("/api/ai/patterns/:id", async (req, res) => {
    try {
      const framework = getFramework(req.params.id);
      if (!framework) {
        return res.status(404).json({ error: 'Pattern not found' });
      }

      res.json({ success: true, pattern: framework });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get pattern';
      res.status(500).json({ error: message });
    }
  });

  // Universal Language Engine endpoints
  app.get("/api/ai/languages", async (_req, res) => {
    try {
      res.json({
        success: true,
        count: getLanguageCount(),
        languages: getLanguageSummary(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get languages';
      res.status(500).json({ error: message });
    }
  });

  app.get("/api/ai/languages/:id", async (req, res) => {
    try {
      const lang = getLanguage(req.params.id);
      if (!lang) {
        return res.status(404).json({ error: 'Language not found' });
      }
      const frameworks = getFrameworksByLanguage(req.params.id);
      res.json({ success: true, language: lang, frameworks: frameworks.map(f => ({ id: f.id, name: f.name, version: f.version, category: f.category })) });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get language';
      res.status(500).json({ error: message });
    }
  });

  app.get("/api/ai/frameworks", async (_req, res) => {
    try {
      res.json({
        success: true,
        count: getFrameworkCount(),
        frameworks: getFrameworkSummary(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get frameworks';
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/ai/emit", async (req, res) => {
    try {
      const blueprint = req.body as ProjectBlueprint;
      if (!blueprint.language || !blueprint.entities || !blueprint.name) {
        return res.status(400).json({ error: 'Blueprint must include name, language, and entities' });
      }

      const result = emitProject(blueprint);
      res.json({
        success: true,
        fileCount: result.files.length,
        language: result.language.displayName,
        framework: result.framework?.name || null,
        startCommand: result.startCommand,
        installCommand: result.installCommand,
        files: result.files,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to emit project';
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/ai/emit/preview", async (req, res) => {
    try {
      const blueprint = req.body as ProjectBlueprint;
      if (!blueprint.language || !blueprint.entities || !blueprint.name) {
        return res.status(400).json({ error: 'Blueprint must include name, language, and entities' });
      }
      const preview = previewEmission(blueprint);
      res.json({ success: true, ...preview });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to preview emission';
      res.status(500).json({ error: message });
    }
  });

  // ============================================
  // Claude-Level Capabilities
  // ============================================

  // Natural Language Understanding
  const nluSchema = z.object({
    text: z.string().min(1, 'Text is required'),
  });

  app.post("/api/ai/nlu", async (req, res) => {
    try {
      const parsed = nluSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      }

      const { text } = parsed.data;
      const analysis = analyzeNLU(text);
      const markdown = formatNLUAsMarkdown(analysis);

      res.json({
        success: true,
        analysis,
        markdown,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'NLU analysis failed';
      res.status(500).json({ error: message });
    }
  });

  // Intent classification only
  app.post("/api/ai/intent", async (req, res) => {
    try {
      const parsed = nluSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      }

      const { text } = parsed.data;
      const intent = classifyIntent(text);

      res.json({ success: true, intent });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Intent classification failed';
      res.status(500).json({ error: message });
    }
  });

  // Entity extraction only
  app.post("/api/ai/entities", async (req, res) => {
    try {
      const parsed = nluSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      }

      const { text } = parsed.data;
      const entities = extractEntities(text);

      res.json({ success: true, entities });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Entity extraction failed';
      res.status(500).json({ error: message });
    }
  });

  // Code explanation
  const explainCodeSchema = z.object({
    code: z.string().min(1, 'Code is required'),
    language: z.string().optional().default('javascript'),
  });

  app.post("/api/ai/explain", async (req, res) => {
    try {
      const parsed = explainCodeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      }

      const { code, language } = parsed.data;
      const explanation = explainCode(code, language);
      const markdown = formatExplanationAsMarkdown(explanation);

      res.json({
        success: true,
        explanation,
        markdown,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Code explanation failed';
      res.status(500).json({ error: message });
    }
  });

  // Detect code patterns
  app.post("/api/ai/detect-patterns", async (req, res) => {
    try {
      const parsed = explainCodeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      }

      const { code } = parsed.data;
      const patterns = detectPatterns(code);

      res.json({ success: true, patterns });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Pattern detection failed';
      res.status(500).json({ error: message });
    }
  });

  // Knowledge base - concepts
  app.get("/api/ai/concepts/:id", async (req, res) => {
    try {
      const concept = getConcept(req.params.id);
      if (!concept) {
        return res.status(404).json({ error: 'Concept not found' });
      }

      const markdown = formatConceptAsMarkdown(concept);
      res.json({ success: true, concept, markdown });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get concept';
      res.status(500).json({ error: message });
    }
  });

  // Search concepts
  app.get("/api/ai/concepts", async (req, res) => {
    try {
      const query = req.query.q as string || '';
      const concepts = query ? searchConcepts(query) : [];

      res.json({ success: true, count: concepts.length, concepts });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Search failed';
      res.status(500).json({ error: message });
    }
  });

  // Best practices
  app.get("/api/ai/best-practices", async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const practices = getBestPractices(category);

      res.json({ success: true, count: practices.length, practices });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get best practices';
      res.status(500).json({ error: message });
    }
  });

  app.get("/api/ai/best-practices/:id", async (req, res) => {
    try {
      const practice = getBestPractice(req.params.id);
      if (!practice) {
        return res.status(404).json({ error: 'Best practice not found' });
      }

      const markdown = formatBestPracticeAsMarkdown(practice);
      res.json({ success: true, practice, markdown });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get best practice';
      res.status(500).json({ error: message });
    }
  });

  // Learning paths
  app.get("/api/ai/learning-path/:topic", async (req, res) => {
    try {
      const path = getLearningPath(req.params.topic);
      if (!path) {
        return res.status(404).json({ error: 'Learning path not found' });
      }

      res.json({ success: true, path });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get learning path';
      res.status(500).json({ error: message });
    }
  });

  // ── Prompt Configuration ──────────────────────────────────────────────────

  app.get("/api/ai/prompt-config", (_req, res) => {
    try {
      const config = getConfig();
      const summary = getConfigSummary(config);
      const preview = buildPromptInstructions(config);
      res.json({ success: true, config, summary, preview, presets: PROMPT_PRESETS });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get prompt config';
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/ai/prompt-config", (req, res) => {
    try {
      const incoming = req.body as Partial<typeof DEFAULT_CONFIG>;
      const current = getConfig();
      const next = { ...current, ...incoming } as typeof DEFAULT_CONFIG;
      saveConfig(next);
      const summary = getConfigSummary(next);
      const preview = buildPromptInstructions(next);
      res.json({ success: true, config: next, summary, preview });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save prompt config';
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/ai/prompt-config/preset", (req, res) => {
    try {
      const { preset } = req.body as { preset: string };
      if (!preset) return res.status(400).json({ error: 'preset is required' });
      const config = applyPreset(preset as any);
      const summary = getConfigSummary(config);
      const preview = buildPromptInstructions(config);
      res.json({ success: true, config, summary, preview });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to apply preset';
      res.status(500).json({ error: message });
    }
  });

  app.get("/api/ai/prompt-config/preview", (req, res) => {
    try {
      const config = getConfig();
      const preview = buildPromptInstructions(config);
      res.json({ success: true, preview, charCount: preview.length, lineCount: preview.split('\n').length });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to build preview';
      res.status(500).json({ error: message });
    }
  });

  // All learning paths
  app.get("/api/ai/learning-paths", async (_req, res) => {
    try {
      const paths = getAllLearningPaths();
      res.json({ success: true, count: paths.length, paths });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get learning paths';
      res.status(500).json({ error: message });
    }
  });

  // Concepts by category or difficulty
  app.get("/api/ai/concepts/category/:category", async (req, res) => {
    try {
      const concepts = getConceptsByCategory(req.params.category as any);
      res.json({ success: true, count: concepts.length, concepts });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get concepts by category';
      res.status(500).json({ error: message });
    }
  });

  app.get("/api/ai/concepts/related/:id", async (req, res) => {
    try {
      const concepts = getRelatedConcepts(req.params.id);
      res.json({ success: true, count: concepts.length, concepts });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get related concepts';
      res.status(500).json({ error: message });
    }
  });

  // Anti-patterns
  app.get("/api/ai/anti-patterns", async (req, res) => {
    try {
      const { tag, severity } = req.query as { tag?: string; severity?: string };
      let patterns;
      if (tag) {
        patterns = getAntiPatternsByTag(tag);
      } else if (severity) {
        patterns = getAntiPatternsBySeverity(severity as any);
      } else {
        patterns = getAllAntiPatterns();
      }
      res.json({ success: true, count: patterns.length, patterns });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get anti-patterns';
      res.status(500).json({ error: message });
    }
  });

  app.get("/api/ai/anti-patterns/:id", async (req, res) => {
    try {
      const all = getAllAntiPatterns();
      const pattern = all.find(ap => ap.id === req.params.id);
      if (!pattern) return res.status(404).json({ error: 'Anti-pattern not found' });
      const markdown = formatAntiPatternAsMarkdown(pattern);
      res.json({ success: true, pattern, markdown });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get anti-pattern';
      res.status(500).json({ error: message });
    }
  });

  // Code snippets
  app.get("/api/ai/snippets", async (req, res) => {
    try {
      const { tech, tag } = req.query as { tech?: string; tag?: string };
      let snippets;
      if (tech) {
        snippets = getSnippetsByTech(tech);
      } else if (tag) {
        snippets = getSnippetsByTag(tag);
      } else {
        snippets = getAllCodeSnippets();
      }
      res.json({ success: true, count: snippets.length, snippets });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get snippets';
      res.status(500).json({ error: message });
    }
  });

  app.get("/api/ai/snippets/:id", async (req, res) => {
    try {
      const snippet = getAllCodeSnippets().find(s => s.id === req.params.id);
      if (!snippet) return res.status(404).json({ error: 'Snippet not found' });
      res.json({ success: true, snippet });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get snippet';
      res.status(500).json({ error: message });
    }
  });

  // Generation context — inject into LLM prompts
  app.post("/api/ai/knowledge/context", async (req, res) => {
    try {
      const ctx = req.body || {};
      const context = getContextForGeneration({
        appType: ctx.appType,
        domain: ctx.domain,
        features: ctx.features,
        entities: ctx.entities,
        fileExtension: ctx.fileExtension,
        fileRole: ctx.fileRole,
        techStack: ctx.techStack,
        isAuthRequired: ctx.isAuthRequired,
        hasDatabaseAccess: ctx.hasDatabaseAccess,
        hasWorkflow: ctx.hasWorkflow,
        primaryEntity: ctx.primaryEntity,
      });
      res.json({ success: true, context });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to build context';
      res.status(500).json({ error: message });
    }
  });

  // Entity Archetypes — list all or filter by domain
  app.get("/api/ai/entity-archetypes", async (req, res) => {
    try {
      const domain = req.query.domain as string | undefined;
      const archetypes = getAllEntityArchetypes(domain);
      res.json({ success: true, archetypes, count: archetypes.length });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get archetypes';
      res.status(500).json({ error: message });
    }
  });

  // Entity Archetype — match a single entity name to its archetype
  app.get("/api/ai/entity-archetypes/match", async (req, res) => {
    try {
      const name = req.query.name as string;
      if (!name) return res.status(400).json({ error: 'name query param required' });
      const archetype = matchEntityToArchetype(name);
      if (!archetype) return res.json({ success: true, archetype: null, message: 'No matching archetype found' });
      res.json({ success: true, archetype });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to match archetype';
      res.status(500).json({ error: message });
    }
  });

  // Entity Archetype — resolve a list of entity names to archetypes (formatted)
  app.post("/api/ai/entity-archetypes/resolve", async (req, res) => {
    try {
      const { entities } = req.body;
      if (!Array.isArray(entities)) return res.status(400).json({ error: 'entities array required' });
      const resolved = entities.map(name => ({
        name,
        archetype: matchEntityToArchetype(name),
      }));
      const context = resolveEntityArchetypes(entities);
      res.json({ success: true, resolved, context });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to resolve archetypes';
      res.status(500).json({ error: message });
    }
  });

  // Schema Suggestions — get field/index/workflow suggestions for an entity
  app.get("/api/ai/schema-suggestions", async (req, res) => {
    try {
      const entity = req.query.entity as string;
      const domain = req.query.domain as string | undefined;
      if (!entity) return res.status(400).json({ error: 'entity query param required' });
      const suggestions = getSchemaSuggestions(entity, domain);
      const archetype = matchEntityToArchetype(entity);
      const workflow = archetype ? getWorkflowPattern(archetype.id) : null;
      res.json({ success: true, suggestions, workflow, archetype });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get schema suggestions';
      res.status(500).json({ error: message });
    }
  });

  // Domain Models — list all domains or get a specific one
  app.get("/api/ai/domain-models", async (req, res) => {
    try {
      const domain = req.query.domain as string | undefined;
      if (domain) {
        const model = getDomainModel(domain);
        if (!model) return res.status(404).json({ error: `Domain model '${domain}' not found` });
        const context = getDomainModelContext(domain);
        return res.json({ success: true, model, context });
      }
      const models = getAllDomainModels();
      res.json({ success: true, models, count: models.length });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get domain models';
      res.status(500).json({ error: message });
    }
  });

  // Generation Learning Engine - Stats
  app.get("/api/learning/stats", async (_req, res) => {
    try {
      await learningEngine.ensureReady();
      const stats = await learningEngine.getLearningStats();
      res.json({ success: true, ...stats });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get learning stats';
      res.status(500).json({ error: message });
    }
  });

  // Generation Learning Engine - Export all data (portable)
  app.get("/api/learning/export", async (_req, res) => {
    try {
      await learningEngine.ensureReady();
      const data = learningEngine.getFullExport();
      res.json({ success: true, ...data });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export learning data';
      res.status(500).json({ error: message });
    }
  });

  // Generation Learning Engine - Import data (portable)
  app.post("/api/learning/import", async (req, res) => {
    try {
      await learningEngine.ensureReady();
      const { patterns, preferences } = req.body;
      const result = learningEngine.importFullData({ patterns, preferences });
      res.json({ success: true, ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import learning data';
      res.status(500).json({ error: message });
    }
  });

  // Generation Learning Engine - Save to file (for repo persistence)
  app.post("/api/learning/save", async (_req, res) => {
    try {
      await learningEngine.ensureReady();
      learningEngine.persistToFile();
      res.json({ success: true, message: 'Learning data saved to file' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save learning data';
      res.status(500).json({ error: message });
    }
  });

  // Generation Learning Engine - Get patterns by type
  app.get("/api/learning/patterns", async (req, res) => {
    try {
      await learningEngine.ensureReady();
      const minReliability = parseFloat(req.query.minReliability as string) || 0;
      const patternType = req.query.type as string | undefined;
      const category = req.query.category as string | undefined;
      let patterns = minReliability > 0
        ? learningEngine.getReliablePatterns(minReliability)
        : learningEngine.exportPatterns();
      if (patternType) {
        patterns = patterns.filter(p => p.patternType === patternType);
      }
      if (category) {
        patterns = patterns.filter(p => (p as any).category === category || p.patternType === category);
      }
      res.json({ success: true, count: patterns.length, patterns });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get patterns';
      res.status(500).json({ error: message });
    }
  });

  // Generation Learning Engine - Get entity recommendations
  app.get("/api/learning/entity/:name", async (req, res) => {
    try {
      await learningEngine.ensureReady();
      const recommendations = learningEngine.getEntityRecommendations(req.params.name);
      const workflow = learningEngine.getWorkflowRecommendation(req.params.name);
      res.json({ success: true, entity: req.params.name, recommendations, workflow });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get entity recommendations';
      res.status(500).json({ error: message });
    }
  });

  // Conversational flexibility - follow-up detection
  const followUpSchema = z.object({
    conversationId: z.string().min(1, 'Conversation ID is required'),
    prompt: z.string().min(1, 'Prompt is required'),
  });

  app.post("/api/ai/follow-up", async (req, res) => {
    try {
      const parsed = followUpSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      }

      const { conversationId, prompt } = parsed.data;
      const context = getConversationContext(conversationId);
      const analysis = detectFollowUp(prompt, context);

      res.json({ success: true, analysis });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Follow-up detection failed';
      res.status(500).json({ error: message });
    }
  });

  // Conversation context update
  const contextUpdateSchema = z.object({
    conversationId: z.string().min(1, 'Conversation ID is required'),
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1, 'Content is required'),
    entities: z.array(z.string()).optional().default([]),
  });

  app.post("/api/ai/context-update", async (req, res) => {
    try {
      const parsed = contextUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      }

      const { conversationId, role, content, entities } = parsed.data;
      updateContext(conversationId, role, content, entities);

      res.json({ success: true, message: 'Context updated' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Context update failed';
      res.status(500).json({ error: message });
    }
  });

  // Clarification generation
  app.post("/api/ai/clarification", async (req, res) => {
    try {
      const parsed = followUpSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      }

      const { conversationId, prompt } = parsed.data;
      const context = getConversationContext(conversationId);
      const clarification = generateClarification(prompt, context);

      res.json({ success: true, clarification });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Clarification generation failed';
      res.status(500).json({ error: message });
    }
  });

  // Response hints
  app.post("/api/ai/response-hints", async (req, res) => {
    try {
      const parsed = followUpSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      }

      const { conversationId, prompt } = parsed.data;
      const context = getConversationContext(conversationId);
      const hints = getResponseHints(prompt, context);

      res.json({ success: true, hints });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Response hints failed';
      res.status(500).json({ error: message });
    }
  });

  // Conversation summary
  app.get("/api/ai/conversation/:id/summary", async (req, res) => {
    try {
      const summary = summarizeConversation(req.params.id);
      const context = getConversationContext(req.params.id);
      const markdown = formatConversationContextAsMarkdown(req.params.id);

      res.json({
        success: true,
        summary,
        context: {
          turnCount: context.turnCount,
          lastTopic: context.lastTopic,
          lastAction: context.lastAction,
          lastTarget: context.lastTarget,
        },
        markdown,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Summary failed';
      res.status(500).json({ error: message });
    }
  });

  // ============================================
  // Continuous Debugging API
  // ============================================

  const debugCodeSchema = z.object({
    code: z.string().min(1, 'Code is required'),
    language: z.string().optional().default('javascript'),
    sessionId: z.string().optional(),
  });

  // Continuous debug - analyze and auto-fix
  app.post("/api/debug/continuous", async (req, res) => {
    try {
      const parsed = debugCodeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      }

      const { code, sessionId } = parsed.data;
      const result = continuousDebug(code, sessionId);
      const markdown = formatDebugReport(result);

      res.json({
        success: true,
        ...result,
        markdown,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Debug failed';
      res.status(500).json({ error: message });
    }
  });

  // Parse error message
  app.post("/api/debug/parse-error", async (req, res) => {
    try {
      const schema = z.object({ error: z.string().min(1) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      }

      const issue = parseError(parsed.data.error);
      res.json({ success: true, issue });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Parse failed';
      res.status(500).json({ error: message });
    }
  });

  // Get debug status
  app.get("/api/debug/status", async (_req, res) => {
    try {
      const status = getDebugStatus();
      res.json({ success: true, ...status });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Status failed';
      res.status(500).json({ error: message });
    }
  });

  // Get debug session
  app.get("/api/debug/session/:id", async (req, res) => {
    try {
      const session = getDebugSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      res.json({ success: true, session });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Session lookup failed';
      res.status(500).json({ error: message });
    }
  });

  // ============================================
  // MODULAR TEST & FIX ENGINE
  // ============================================

  app.get("/api/modules/stages", async (_req, res) => {
    try {
      const stages = getAvailableStages();
      res.json({ success: true, stages });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list stages';
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/modules/test", async (req, res) => {
    try {
      const schema = z.object({
        stage: z.string().min(1),
        payload: z.any().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      }

      let stagePayload = parsed.data.payload;
      if (!stagePayload || (typeof stagePayload === 'object' && Object.keys(stagePayload).length === 0)) {
        const { stage, payload, ...rest } = req.body;
        if (Object.keys(rest).length > 0) {
          stagePayload = rest;
        }
      }

      const result = runStageTest(parsed.data.stage, stagePayload || {});
      res.json({ success: true, ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Stage test failed';
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/modules/fix", async (req, res) => {
    try {
      const schema = z.object({
        filePath: z.string().min(1),
        fileContent: z.string().optional().default(''),
        error: z.string().min(1),
        conversationId: z.number().optional(),
        allFiles: z.array(z.object({
          path: z.string(),
          content: z.string(),
        })).optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      }

      let fileContent = parsed.data.fileContent;
      let fileId: number | undefined;
      const convId = parsed.data.conversationId;
      if (!fileContent && convId) {
        const projectFiles = await storage.getProjectFiles(convId);
        const match = projectFiles.find(f => f.path === parsed.data.filePath);
        if (match) {
          fileContent = match.content;
          fileId = match.id;
        }
      }
      if (!fileContent) {
        return res.status(400).json({ error: 'No file content provided and file not found in project' });
      }

      let allFiles = parsed.data.allFiles;
      if (!allFiles && convId) {
        const projectFiles = await storage.getProjectFiles(convId);
        allFiles = projectFiles.map(f => ({ path: f.path, content: f.content }));
      }

      const result = runModularFix(
        parsed.data.filePath,
        fileContent,
        parsed.data.error,
        allFiles
      );

      let persisted = false;
      if (result.success && result.fixedContent !== fileContent && convId) {
        if (fileId) {
          await storage.updateProjectFile(fileId, result.fixedContent);
          persisted = true;
        } else {
          const lang = inferLanguageFromPath(parsed.data.filePath);
          await storage.upsertProjectFile(convId, parsed.data.filePath, result.fixedContent, lang);
          persisted = true;
        }
      }

      res.json({
        success: true,
        file: result.file,
        fixedContent: result.fixedContent,
        iterations: result.iterations,
        fixesApplied: result.fixesApplied,
        remainingIssues: result.remainingIssues,
        fixed: result.success,
        persisted,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Fix failed';
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/modules/diagnostics", async (req, res) => {
    try {
      const schema = z.object({
        files: z.array(z.object({
          path: z.string(),
          content: z.string(),
        })),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      }

      const report = runDiagnostics(parsed.data.files);
      res.json({ success: true, ...report });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Diagnostics failed';
      res.status(500).json({ error: message });
    }
  });

  // ============================================
  // ENHANCED Claude-Level AI APIs
  // ============================================

  // Enhanced Intent Recognition
  app.post("/api/ai/enhanced/intent", async (req, res) => {
    try {
      const schema = z.object({ text: z.string().min(1) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      }

      const result = recognizeIntent(parsed.data.text);
      const questionInfo = isQuestion(parsed.data.text);
      const entities = extractEntitiesEnhanced(parsed.data.text);
      const markdown = formatIntentAsMarkdown(result);

      res.json({
        success: true,
        intent: result,
        isQuestion: questionInfo,
        entities,
        markdown,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Intent recognition failed';
      res.status(500).json({ error: message });
    }
  });

  // Advanced Project Generation
  app.post("/api/ai/enhanced/generate-project", async (req, res) => {
    try {
      const schema = z.object({
        projectType: z.string().optional(),
        language: z.string().default('typescript'),
        framework: z.string().optional(),
        features: z.array(z.string()).default([]),
        database: z.string().optional(),
        auth: z.boolean().optional(),
        api: z.boolean().optional(),
        styling: z.string().optional(),
        testing: z.boolean().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      }

      const project = generateProject({
        ...parsed.data,
        projectType: parsed.data.projectType || 'fullstack',
      });
      const tree = formatProjectAsTree(project);
      const markdown = formatProjectAsMarkdown(project);

      res.json({
        success: true,
        project,
        tree,
        markdown,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Project generation failed';
      res.status(500).json({ error: message });
    }
  });

  // Universal Code Explanation
  app.post("/api/ai/enhanced/explain-code", async (req, res) => {
    try {
      const schema = z.object({
        code: z.string().min(1),
        language: z.string().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      }

      const explanation = explainCodeUniversal(parsed.data.code, parsed.data.language);
      const markdown = formatExplanationAsMarkdownUniversal(explanation);

      res.json({
        success: true,
        explanation,
        markdown,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Code explanation failed';
      res.status(500).json({ error: message });
    }
  });

  // Deep Error Analysis
  app.post("/api/ai/enhanced/analyze-error", async (req, res) => {
    try {
      const schema = z.object({
        error: z.string().min(1),
        code: z.string().optional(),
        context: z.object({
          framework: z.string().optional(),
          environment: z.string().optional(),
          dependencies: z.array(z.string()).optional(),
        }).optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      }

      const analysis = analyzeError(parsed.data.error, parsed.data.code, parsed.data.context);
      const markdown = formatDebugAnalysisAsMarkdown(analysis);

      res.json({
        success: true,
        analysis,
        markdown,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error analysis failed';
      res.status(500).json({ error: message });
    }
  });

  // Context Window Management
  app.post("/api/ai/enhanced/context/create", async (req, res) => {
    try {
      const schema = z.object({
        id: z.string().min(1),
        maxTokens: z.number().optional().default(100000),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      }

      const window = createContextWindow(parsed.data.id, parsed.data.maxTokens);
      res.json({ success: true, window });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Context creation failed';
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/ai/enhanced/context/add", async (req, res) => {
    try {
      const schema = z.object({
        windowId: z.string().min(1),
        type: z.enum(['code', 'conversation', 'documentation', 'error', 'system']),
        content: z.string().min(1),
        importance: z.number().min(0).max(1).optional().default(0.5),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      }

      const window = addChunk(parsed.data.windowId, {
        type: parsed.data.type,
        content: parsed.data.content,
        importance: parsed.data.importance,
        timestamp: Date.now(),
      });

      if (!window) {
        return res.status(404).json({ error: 'Context window not found' });
      }

      res.json({ success: true, window });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Context add failed';
      res.status(500).json({ error: message });
    }
  });

  app.get("/api/ai/enhanced/context/:id", async (req, res) => {
    try {
      const window = getContextWindow(req.params.id);
      if (!window) {
        return res.status(404).json({ error: 'Context window not found' });
      }

      const markdown = formatContextWindowAsMarkdown(window);
      res.json({ success: true, window, markdown });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Context lookup failed';
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/ai/enhanced/context/relevant", async (req, res) => {
    try {
      const schema = z.object({
        windowId: z.string().min(1),
        query: z.string().min(1),
        maxTokens: z.number().optional().default(4000),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      }

      const chunks = getRelevantContextChunks(parsed.data.windowId, parsed.data.query, parsed.data.maxTokens);
      res.json({ success: true, chunks });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Context retrieval failed';
      res.status(500).json({ error: message });
    }
  });

  // Multi-language Templates
  app.get("/api/ai/enhanced/languages", async (req, res) => {
    try {
      const languages = listAllLanguages();
      res.json({ success: true, count: languages.length, languages });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Language list failed';
      res.status(500).json({ error: message });
    }
  });

  app.get("/api/ai/enhanced/languages/:id", async (req, res) => {
    try {
      const lang = getLanguageById(req.params.id);
      if (!lang) {
        return res.status(404).json({ error: 'Language not found' });
      }

      const markdown = formatLanguageSummary(lang);
      res.json({ success: true, language: lang, markdown });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Language lookup failed';
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/ai/enhanced/snippet", async (req, res) => {
    try {
      const schema = z.object({
        language: z.string().min(1),
        snippet: z.string().min(1),
        variables: z.record(z.string()).optional().default({}),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      }

      const code = getSnippet(parsed.data.language, parsed.data.snippet, parsed.data.variables);
      if (!code) {
        return res.status(404).json({ error: 'Snippet not found' });
      }

      res.json({ success: true, code });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Snippet generation failed';
      res.status(500).json({ error: message });
    }
  });

  // True Conversational AI
  app.post("/api/ai/enhanced/conversation/create", async (req, res) => {
    try {
      const schema = z.object({
        id: z.string().min(1),
        userId: z.string().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      }

      const state = createConvState(parsed.data.id, parsed.data.userId);
      res.json({ success: true, conversation: state });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Conversation creation failed';
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/ai/enhanced/conversation/turn", async (req, res) => {
    try {
      const schema = z.object({
        conversationId: z.string().min(1),
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      }

      const turn = processTurn(parsed.data.conversationId, parsed.data.role, parsed.data.content);
      const hints = getConvHints(parsed.data.conversationId, parsed.data.content);

      res.json({ success: true, turn, hints });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Turn processing failed';
      res.status(500).json({ error: message });
    }
  });

  app.get("/api/ai/enhanced/conversation/:id", async (req, res) => {
    try {
      const state = getConvState(req.params.id);
      if (!state) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      const summary = getConversationSummary(req.params.id);
      res.json({ success: true, conversation: state, summary });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Conversation lookup failed';
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/ai/enhanced/conversation/memory", async (req, res) => {
    try {
      const schema = z.object({
        conversationId: z.string().min(1),
        query: z.string().min(1),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      }

      const memory = getRelevantMemory(parsed.data.conversationId, parsed.data.query);
      res.json({ success: true, memory });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Memory retrieval failed';
      res.status(500).json({ error: message });
    }
  });

  // ============================================
  // DEEP PROJECT GENERATOR APIs
  // ============================================

  // List available project blueprints
  app.get("/api/ai/deep/blueprints", async (req, res) => {
    try {
      const blueprints = listBlueprints();
      res.json({ success: true, count: blueprints.length, blueprints });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list blueprints';
      res.status(500).json({ error: message });
    }
  });

  // Get specific blueprint details
  app.get("/api/ai/deep/blueprints/:id", async (req, res) => {
    try {
      const blueprint = getBlueprint(req.params.id);
      if (!blueprint) {
        return res.status(404).json({ error: 'Blueprint not found' });
      }
      res.json({ success: true, blueprint });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get blueprint';
      res.status(500).json({ error: message });
    }
  });

  // List available feature modules
  app.get("/api/ai/deep/features", async (req, res) => {
    try {
      const features = listFeatures();
      res.json({ success: true, count: features.length, features });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list features';
      res.status(500).json({ error: message });
    }
  });

  // Get specific feature details
  app.get("/api/ai/deep/features/:id", async (req, res) => {
    try {
      const feature = getFeature(req.params.id);
      if (!feature) {
        return res.status(404).json({ error: 'Feature not found' });
      }
      res.json({ success: true, feature });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get feature';
      res.status(500).json({ error: message });
    }
  });

  // Generate a deep project (uses pro-generator for clean JSX output)
  app.post("/api/ai/deep/generate", async (req, res) => {
    try {
      const schema = z.object({
        blueprint: z.string().min(1),
        name: z.string().min(1),
        features: z.array(z.string()).default([]),
        includeTests: z.boolean().optional().default(false),
        includeDocker: z.boolean().optional().default(false),
        includeDocs: z.boolean().optional().default(true),
        conversationId: z.number().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      }

      const prompt = `${parsed.data.name} with features: ${parsed.data.features.join(', ')}`;
      const requirements = proAnalyzePrompt(prompt);
      const proProject = proGenerateProject(requirements, prompt);
      const validation = validateGeneratedCode(proProject.files.map(f => ({ path: f.path, content: f.content })));
      const filesToSave = validation.fixedFiles.length > 0 ? validation.fixedFiles : proProject.files;

      if (parsed.data.conversationId) {
        const convId = parsed.data.conversationId;
        for (const file of filesToSave) {
          const ext = file.path.split('.').pop() || 'txt';
          const langMap: Record<string, string> = {
            ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx',
            css: 'css', html: 'html', json: 'json', md: 'markdown',
            py: 'python', go: 'go', rs: 'rust', sql: 'sql'
          };
          const language = langMap[ext] || ext;
          const fixedContent = clientAutoFixCode(file.content, file.path);
          await storage.upsertProjectFile(convId, file.path, fixedContent, language);
        }
      }

      res.json({
        success: true,
        project: {
          name: parsed.data.name,
          blueprint: parsed.data.blueprint,
          totalFiles: filesToSave.length,
          features: parsed.data.features,
          structure: filesToSave.map(f => f.path),
        },
        files: filesToSave.map(f => ({
          path: f.path,
          type: 'source',
          size: f.content.length,
          content: f.content,
        })),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Project generation failed';
      res.status(500).json({ error: message });
    }
  });

  // Generate a deep project with AI refinement (uses pro-generator for clean JSX output)
  app.post("/api/ai/deep/generate-refined", async (req, res) => {
    try {
      const schema = z.object({
        blueprint: z.string().min(1),
        name: z.string().min(1),
        features: z.array(z.string()).default([]),
        includeTests: z.boolean().optional().default(false),
        includeDocker: z.boolean().optional().default(false),
        includeDocs: z.boolean().optional().default(true),
        enableAIRefinement: z.boolean().optional().default(true),
        aiRefinementOptions: z.object({
          enableSecurityReview: z.boolean().optional().default(true),
          enableCodeQuality: z.boolean().optional().default(true),
          enablePerformance: z.boolean().optional().default(false),
          enableConsistency: z.boolean().optional().default(false),
          maxFilesToRefine: z.number().optional().default(15),
        }).optional(),
        conversationId: z.number().optional(),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      }

      const prompt = `${parsed.data.name} with features: ${parsed.data.features.join(', ')}`;
      const requirements = proAnalyzePrompt(prompt);
      const proProject = proGenerateProject(requirements, prompt);
      const validation = validateGeneratedCode(proProject.files.map(f => ({ path: f.path, content: f.content })));
      const filesToSave = validation.fixedFiles.length > 0 ? validation.fixedFiles : proProject.files;

      res.json({
        success: true,
        project: {
          name: parsed.data.name,
          blueprint: parsed.data.blueprint,
          totalFiles: filesToSave.length,
          features: parsed.data.features,
          structure: filesToSave.map(f => f.path),
        },
        files: filesToSave.map(f => ({
          path: f.path,
          type: 'source',
          size: f.content.length,
          content: f.content,
        })),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Project generation with AI refinement failed';
      res.status(500).json({ error: message });
    }
  });

  // Review existing code with AI
  app.post("/api/ai/review", async (req, res) => {
    try {
      const { isAIRefinementAvailable, reviewProject } = await import('./modules/ai-code-refiner');

      if (!isAIRefinementAvailable()) {
        return res.status(503).json({
          error: 'AI refinement not available',
          message: 'OpenAI API key not configured. Set OPENAI_API_KEY to enable AI code review.',
          available: false,
        });
      }

      const schema = z.object({
        files: z.array(z.object({
          path: z.string(),
          content: z.string(),
          type: z.string().optional().default('source'),
        })),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      }

      const review = await reviewProject(parsed.data.files);

      res.json({
        success: true,
        review,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Code review failed';
      res.status(500).json({ error: message });
    }
  });

  // Quick refine code
  app.post("/api/ai/refine", async (req, res) => {
    try {
      const { isAIRefinementAvailable, quickRefine } = await import('./modules/ai-code-refiner');

      if (!isAIRefinementAvailable()) {
        return res.status(503).json({
          error: 'AI refinement not available',
          message: 'OpenAI API key not configured. Set OPENAI_API_KEY to enable AI code refinement.',
          available: false,
        });
      }

      const schema = z.object({
        files: z.array(z.object({
          path: z.string(),
          content: z.string(),
          type: z.string().optional().default('source'),
        })),
        maxFiles: z.number().optional().default(10),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      }

      const results = await quickRefine(parsed.data.files, parsed.data.maxFiles);

      res.json({
        success: true,
        results: results.map(r => ({
          path: r.path,
          wasImproved: r.wasImproved,
          improvements: r.improvements,
          refinedContent: r.refinedContent,
        })),
        summary: {
          filesReviewed: results.length,
          filesImproved: results.filter(r => r.wasImproved).length,
          totalImprovements: results.reduce((sum, r) => sum + r.improvements.length, 0),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Code refinement failed';
      res.status(500).json({ error: message });
    }
  });

  // Check AI refinement availability
  app.get("/api/ai/refinement-status", async (_req, res) => {
    try {
      const { isAIRefinementAvailable } = await import('./modules/ai-code-refiner');
      const available = isAIRefinementAvailable();

      res.json({
        available,
        message: available
          ? 'AI refinement is available and ready to use'
          : 'AI refinement requires OPENAI_API_KEY to be configured',
      });
    } catch (error) {
      res.status(500).json({ available: false, error: 'Failed to check status' });
    }
  });

  // ============================================
  // VAPT Dashboard API Routes
  // ============================================

  const vaptAssetSchema = z.object({
    name: z.string().min(1),
    type: z.enum(['ip', 'domain', 'url', 'network_range']),
    value: z.string().min(1),
    criticality: z.enum(['low', 'medium', 'high', 'critical']),
    tags: z.array(z.string()).optional(),
    status: z.string().optional(),
  });

  const vaptVulnSchema = z.object({
    assetId: z.number().optional(),
    cveId: z.string().optional(),
    title: z.string().min(1),
    description: z.string().min(1),
    severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
    cvssScore: z.string().optional(),
    component: z.string().optional(),
    owaspCategory: z.string().optional(),
    status: z.enum(['open', 'in_progress', 'resolved', 'verified', 'false_positive']).optional(),
    assignedTo: z.string().optional(),
    deadline: z.string().optional(),
    remediation: z.string().optional(),
    evidence: z.string().optional(),
    scanId: z.number().optional(),
  });

  const vaptScanSchema = z.object({
    assetId: z.number().optional(),
    scanType: z.enum(['quick', 'standard', 'deep', 'custom']),
  });

  // Get all VAPT assets
  app.get("/api/vapt/assets", async (req, res) => {
    try {
      const assets = await storage.getVaptAssets();
      res.json(assets);
    } catch (error) {
      console.error("Error fetching VAPT assets:", error);
      res.status(500).json({ error: "Failed to fetch assets" });
    }
  });

  // Create VAPT asset
  app.post("/api/vapt/assets", async (req, res) => {
    try {
      const validated = vaptAssetSchema.parse(req.body);
      const asset = await storage.createVaptAsset(validated);
      res.status(201).json(asset);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("Error creating VAPT asset:", error);
      res.status(500).json({ error: "Failed to create asset" });
    }
  });

  // Update VAPT asset
  app.put("/api/vapt/assets/:id", async (req, res) => {
    try {
      const id = parseValidId(req.params.id);
      if (id === null) {
        return res.status(400).json({ error: "Invalid asset ID" });
      }
      const validated = vaptAssetSchema.partial().parse(req.body);
      const asset = await storage.updateVaptAsset(id, validated);
      res.json(asset);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("Error updating VAPT asset:", error);
      res.status(500).json({ error: "Failed to update asset" });
    }
  });

  // Delete VAPT asset
  app.delete("/api/vapt/assets/:id", async (req, res) => {
    try {
      const id = parseValidId(req.params.id);
      if (id === null) {
        return res.status(400).json({ error: "Invalid asset ID" });
      }
      await storage.deleteVaptAsset(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting VAPT asset:", error);
      res.status(500).json({ error: "Failed to delete asset" });
    }
  });

  // Get all vulnerabilities
  app.get("/api/vapt/vulnerabilities", async (req, res) => {
    try {
      const vulns = await storage.getVaptVulnerabilities();
      res.json(vulns);
    } catch (error) {
      console.error("Error fetching vulnerabilities:", error);
      res.status(500).json({ error: "Failed to fetch vulnerabilities" });
    }
  });

  // Create vulnerability
  app.post("/api/vapt/vulnerabilities", async (req, res) => {
    try {
      const validated = vaptVulnSchema.parse(req.body);
      const vuln = await storage.createVaptVulnerability(validated as any);
      res.status(201).json(vuln);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("Error creating vulnerability:", error);
      res.status(500).json({ error: "Failed to create vulnerability" });
    }
  });

  // Update vulnerability
  app.put("/api/vapt/vulnerabilities/:id", async (req, res) => {
    try {
      const id = parseValidId(req.params.id);
      if (id === null) {
        return res.status(400).json({ error: "Invalid vulnerability ID" });
      }
      const validated = vaptVulnSchema.partial().parse(req.body);
      const vuln = await storage.updateVaptVulnerability(id, validated as any);
      res.json(vuln);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("Error updating vulnerability:", error);
      res.status(500).json({ error: "Failed to update vulnerability" });
    }
  });

  // Delete vulnerability
  app.delete("/api/vapt/vulnerabilities/:id", async (req, res) => {
    try {
      const id = parseValidId(req.params.id);
      if (id === null) {
        return res.status(400).json({ error: "Invalid vulnerability ID" });
      }
      await storage.deleteVaptVulnerability(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting vulnerability:", error);
      res.status(500).json({ error: "Failed to delete vulnerability" });
    }
  });

  // Get all scans
  app.get("/api/vapt/scans", async (req, res) => {
    try {
      const scans = await storage.getVaptScans();
      res.json(scans);
    } catch (error) {
      console.error("Error fetching scans:", error);
      res.status(500).json({ error: "Failed to fetch scans" });
    }
  });

  // Create scan
  app.post("/api/vapt/scans", async (req, res) => {
    try {
      const validated = vaptScanSchema.parse(req.body);
      const scan = await storage.createVaptScan(validated);
      res.status(201).json(scan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("Error creating scan:", error);
      res.status(500).json({ error: "Failed to create scan" });
    }
  });

  // Run scan (simulated)
  app.post("/api/vapt/scans/:id/run", async (req, res) => {
    try {
      const id = parseValidId(req.params.id);
      if (id === null) {
        return res.status(400).json({ error: "Invalid scan ID" });
      }
      const result = await storage.runVaptScan(id);
      res.json(result);
    } catch (error) {
      console.error("Error running scan:", error);
      res.status(500).json({ error: "Failed to run scan" });
    }
  });

  // Get schedules
  app.get("/api/vapt/schedules", async (req, res) => {
    try {
      const schedules = await storage.getVaptSchedules();
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      res.status(500).json({ error: "Failed to fetch schedules" });
    }
  });

  // Create schedule
  app.post("/api/vapt/schedules", async (req, res) => {
    try {
      const schedule = await storage.createVaptSchedule(req.body);
      res.status(201).json(schedule);
    } catch (error) {
      console.error("Error creating schedule:", error);
      res.status(500).json({ error: "Failed to create schedule" });
    }
  });

  // Get team members
  app.get("/api/vapt/team", async (req, res) => {
    try {
      const team = await storage.getVaptTeamMembers();
      res.json(team);
    } catch (error) {
      console.error("Error fetching team:", error);
      res.status(500).json({ error: "Failed to fetch team" });
    }
  });

  // Create team member
  app.post("/api/vapt/team", async (req, res) => {
    try {
      const member = await storage.createVaptTeamMember(req.body);
      res.status(201).json(member);
    } catch (error) {
      console.error("Error creating team member:", error);
      res.status(500).json({ error: "Failed to create team member" });
    }
  });

  // Get audit logs
  app.get("/api/vapt/audit-logs", async (req, res) => {
    try {
      const logs = await storage.getVaptAuditLogs();
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  // Get VAPT dashboard stats
  app.get("/api/vapt/dashboard", async (req, res) => {
    try {
      const stats = await storage.getVaptDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // Seed demo data
  app.post("/api/vapt/seed-demo", async (req, res) => {
    try {
      await storage.seedVaptDemoData();
      res.json({ success: true, message: "Demo data seeded successfully" });
    } catch (error) {
      console.error("Error seeding demo data:", error);
      res.status(500).json({ error: "Failed to seed demo data" });
    }
  });

  // ============================================
  // Local AI Pipeline Routes
  // ============================================

  app.post("/api/local-pipeline/run", async (req, res) => {
    try {
      const { runLocalPipeline } = await import("../modules/local-pipeline-router.js");
      const { userRequest, entities, relationships, features } = req.body;
      if (!userRequest || typeof userRequest !== 'string') {
        return res.status(400).json({ error: "userRequest is required and must be a string" });
      }
      if (userRequest.length > 50000) {
        return res.status(400).json({ error: "userRequest exceeds maximum length of 50000 characters" });
      }
      const result = await runLocalPipeline(userRequest, entities, relationships, features);
      res.json(result);
    } catch (error) {
      console.error("Local pipeline error:", error);
      res.status(500).json({ error: "Pipeline execution failed" });
    }
  });

  app.get("/api/local-pipeline/stages", async (_req, res) => {
    try {
      const { STAGE_DEFINITIONS } = await import("../modules/local-pipeline-router.js");
      res.json(STAGE_DEFINITIONS);
    } catch (error) {
      res.status(500).json({ error: "Failed to load stage definitions" });
    }
  });

  app.post("/api/local-ai/parse-intent", async (req, res) => {
    try {
      const { localAI } = await import("../modules/local-ai-engine.js");
      const { description } = req.body;
      if (!description) return res.status(400).json({ error: "description is required" });
      const result = localAI.parseIntent(description);
      res.json(result);
    } catch (error) {
      console.error("Intent parse error:", error);
      res.status(500).json({ error: "Failed to parse intent" });
    }
  });

  app.post("/api/local-ai/search-similar", async (req, res) => {
    try {
      const { localAI } = await import("../modules/local-ai-engine.js");
      const { query, category, limit } = req.body;
      if (!query) return res.status(400).json({ error: "query is required" });
      const results = await localAI.searchSimilar(query, category || "all", limit || 10);
      res.json(results);
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ error: "Search failed" });
    }
  });

  app.get("/api/local-ai/stats", async (_req, res) => {
    try {
      const { learningBrain } = await import("../modules/learning-stage.js");
      const { templateRegistry } = await import("../modules/template-registry.js");
      const stats = await learningBrain.getStats();
      const templateStats = templateRegistry.getStats();
      res.json({ learning: stats, templates: templateStats });
    } catch (error) {
      res.status(500).json({ error: "Failed to get stats" });
    }
  });

  app.post("/api/local-ai/feedback", async (req, res) => {
    try {
      const { learningBrain } = await import("../modules/learning-stage.js");
      const { pipelineId, rating, comment } = req.body;
      if (!pipelineId || rating === undefined) {
        return res.status(400).json({ error: "pipelineId and rating are required" });
      }
      await learningBrain.recordFeedback(pipelineId, rating, comment || "");
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to record feedback" });
    }
  });

  app.post("/api/prompt/generate", async (req, res) => {
    try {
      const { generatePrompt } = await import("../modules/prompt-enhancer.js");
      const schema = z.object({
        topic: z.string().min(1).max(500),
        options: z.object({
          scale: z.enum(['small', 'medium', 'large']).optional(),
          includeAuth: z.boolean().optional(),
          includeAnalytics: z.boolean().optional(),
          style: z.enum(['minimal', 'detailed']).optional(),
        }).optional().default({}),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid input" });
      }
      const result = generatePrompt(parsed.data.topic.trim(), parsed.data.options);
      res.json(result);
    } catch (error: any) {
      console.error("Prompt generate error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/prompt/upgrade", async (req, res) => {
    try {
      const { upgradePrompt } = await import("../modules/prompt-enhancer.js");
      const schema = z.object({
        prompt: z.string().min(1).max(5000),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid input" });
      }
      const result = upgradePrompt(parsed.data.prompt.trim());
      res.json(result);
    } catch (error: any) {
      console.error("Prompt upgrade error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/codegen-v2/test", async (_req, res) => {
    try {
      const { runAllTests } = await import("../modules/codegen-e2e-test.js");
      const result = runAllTests();
      res.json(result);
    } catch (error: any) {
      console.error("CodeGen V2 test error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Per-project snapshot build/status endpoints
  app.post("/api/cache/build-snapshot", async (req, res) => {
    try {
      const { packageJsonContent, hash } = req.body;
      if (!packageJsonContent || typeof packageJsonContent !== 'string') {
        return res.status(400).json({ error: 'packageJsonContent is required' });
      }
      if (!hash || typeof hash !== 'string' || !/^[a-f0-9]{8,32}$/.test(hash)) {
        return res.status(400).json({ error: 'hash must be 8-32 hex characters' });
      }
      const { buildSnapshotAsync, getSnapshotStatus, upgradePackageJson } = await import("../modules/snapshot-builder.js");
      const currentStatus = getSnapshotStatus(hash);
      if (currentStatus === 'ready') {
        return res.json({ status: 'ready', url: `/cache/snapshot-${hash}.json.gz` });
      }

      const upgradeResult = upgradePackageJson(packageJsonContent);
      const cleanedContent = JSON.stringify(upgradeResult.packageJson, null, 2);

      if (currentStatus !== 'building') {
        buildSnapshotAsync(hash, cleanedContent);
      }
      res.json({
        status: 'building',
        message: `Snapshot build started for hash ${hash}`,
        upgradedPackageJson: cleanedContent,
        upgradeInfo: {
          removedPackages: upgradeResult.removedPackages,
          renamedPackages: upgradeResult.renamedPackages,
          upgradedVersions: upgradeResult.upgradedVersions.length,
          warnings: upgradeResult.warnings,
        },
      });
    } catch (error: any) {
      console.error("Snapshot build error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/cache/snapshot-status/:hash", async (req, res) => {
    try {
      const { hash } = req.params;
      if (!hash || !/^[a-f0-9]{8,32}$/.test(hash)) {
        return res.status(400).json({ error: 'Invalid hash' });
      }
      const { getSnapshotStatus } = await import("../modules/snapshot-builder.js");
      const status = getSnapshotStatus(hash);
      res.json({
        hash,
        status,
        url: status === 'ready' ? `/cache/snapshot-${hash}.json.gz` : null,
      });
    } catch (error: any) {
      console.error("Snapshot status error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/cache/rebuild-prewarm", async (_req, res) => {
    res.status(410).json({
      status: 'disabled',
      message: 'Prewarm snapshots are disabled. Use per-project snapshots via /api/cache/build-snapshot.',
    });
  });

  app.get("/api/cache/prewarm-status", async (_req, res) => {
    res.json({
      status: 'disabled',
      url: null,
      message: 'Prewarm snapshots are disabled. Use per-project snapshots via /api/cache/build-snapshot.',
    });
  });

  app.get("/api/ai/connection", (_req, res) => {
    try {
      res.json(getAIConfig());
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/config", async (req, res) => {
    try {
      const { baseUrl, apiKey, model } = req.body || {};
      reconfigureAI({ baseUrl, apiKey, model });

      try {
        const { reconfigureGenerator } = await import("../modules/ai-fullstack-generator");
        reconfigureGenerator({ baseUrl, apiKey, model });
      } catch (syncErr: any) {
        console.warn(`[AI Config] Generator sync failed: ${syncErr?.message || syncErr}`);
      }

      if (baseUrl) {
        connectSLMEndpoint(baseUrl);
      }

      res.json({ success: true, config: getAIConfig() });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/test", async (req, res) => {
    try {
      if (!openai) {
        return res.status(400).json({ success: false, error: "No AI client configured. Set an endpoint + API key first." });
      }
      const model = runtimeAIConfig.model;
      const startMs = Date.now();
      const completion = await openai.chat.completions.create({
        model,
        messages: [{ role: "user", content: "Reply with exactly: OK" }],
        max_tokens: 5,
        temperature: 0,
      });
      const latencyMs = Date.now() - startMs;
      const reply = completion.choices?.[0]?.message?.content || "";
      res.json({ success: true, reply: reply.trim(), model, latencyMs });
    } catch (error: any) {
      res.status(200).json({ success: false, error: error.message || "Connection failed" });
    }
  });

  app.get("/api/slm/status", (_req, res) => {
    try {
      const status = getSLMSystemStatus();
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/slm/initialize", (req, res) => {
    try {
      const config = req.body || {};
      initializeSLMSystem(config);
      const status = getSLMSystemStatus();
      res.json({ success: true, status });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/slm/connect", (req, res) => {
    try {
      const { endpoint } = req.body;
      if (!endpoint || typeof endpoint !== "string") {
        return res.status(400).json({ error: "endpoint is required" });
      }
      connectSLMEndpoint(endpoint);
      const status = getSLMSystemStatus();
      res.json({ success: true, status });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/slm/stages", (_req, res) => {
    try {
      const stages = getRegisteredStages();
      const modes = getAllStageModes();
      res.json({ stages, modes });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/slm/stages/:stage", (req, res) => {
    try {
      const { stage } = req.params;
      const { mode } = req.body;
      if (!mode || (mode !== "rules-only" && mode !== "slm-enhanced")) {
        return res.status(400).json({ error: "mode must be 'rules-only' or 'slm-enhanced'" });
      }
      const stages = getRegisteredStages();
      if (!stages.includes(stage)) {
        return res.status(404).json({ error: `Stage '${stage}' not found` });
      }
      setStageMode(stage, mode);
      res.json({ success: true, stage, mode });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}