/**
 * SLM Registry — Central registration point for all SLM stage templates
 *
 * Initializes the SLM subsystem, registers all stage prompt templates,
 * and provides a unified API for querying SLM status.
 */

import { initializeSLMEngine, configureSLMEndpoint, isSLMAvailable, getSLMHealth, getRegisteredStages } from './slm-inference-engine.js';
import type { SLMConfig } from './slm-inference-engine.js';
import { initializeModelManager, configureEndpoint as configureManagerEndpoint, getManagerStatus } from './slm-model-manager.js';
import type { ModelManagerConfig } from './slm-model-manager.js';
import { registerUnderstandingTemplate } from './slm-stage-understanding.js';
import { registerDesignTemplate } from './slm-stage-design.js';
import { registerSemanticTemplate } from './slm-stage-semantic.js';
import { registerQualityTemplate } from './slm-stage-quality.js';
import { registerSchemaTemplate } from './slm-stage-schema.js';
import { registerAPITemplate } from './slm-stage-api.js';
import { registerComponentTemplate } from './slm-stage-components.js';
import { registerCodegenTemplate } from './slm-stage-codegen.js';
import { getFeedbackDashboardData } from './slm-feedback-loop.js';
import { getCollectorSummary } from './slm-training-collector.js';

let initialized = false;

const stageModesConfig: Record<string, 'rules-only' | 'slm-enhanced'> = {};

export interface SLMSystemConfig {
  engine?: Partial<SLMConfig>;
  modelManager?: Partial<ModelManagerConfig>;
  endpoint?: string;
}

export function registerAllSLMTemplates(): void {
  registerUnderstandingTemplate();
  registerDesignTemplate();
  registerSemanticTemplate();
  registerQualityTemplate();
  registerSchemaTemplate();
  registerAPITemplate();
  registerComponentTemplate();
  registerCodegenTemplate();
}

export function initializeSLMSystem(config?: SLMSystemConfig): void {
  if (initialized) {
    console.log('[SLM Registry] Already initialized — skipping');
    return;
  }

  initializeSLMEngine(config?.engine);
  initializeModelManager(config?.modelManager);

  registerAllSLMTemplates();

  if (config?.endpoint) {
    configureSLMEndpoint(config.endpoint);
    configureManagerEndpoint(config.endpoint);
  }

  initialized = true;
  console.log(`[SLM Registry] System initialized — ${getRegisteredStages().length} stage templates registered`);
}

export function connectSLMEndpoint(endpoint: string): void {
  configureSLMEndpoint(endpoint);
  configureManagerEndpoint(endpoint);
  console.log(`[SLM Registry] Connected to SLM endpoint: ${endpoint}`);
}

export function getSLMSystemStatus(): {
  initialized: boolean;
  available: boolean;
  registeredStages: string[];
  health: ReturnType<typeof getSLMHealth>;
  modelManager: ReturnType<typeof getManagerStatus>;
  trainingData: ReturnType<typeof getCollectorSummary>;
  feedback: ReturnType<typeof getFeedbackDashboardData>;
} {
  const stages = getRegisteredStages();
  const modes: Record<string, string> = {};
  for (const s of stages) {
    modes[s] = stageModesConfig[s] || 'rules-only';
  }
  return {
    initialized,
    available: isSLMAvailable(),
    registeredStages: stages,
    stageModes: modes,
    health: getSLMHealth(),
    modelManager: getManagerStatus(),
    trainingData: getCollectorSummary(),
    feedback: getFeedbackDashboardData(),
  };
}

export function isSLMSystemReady(): boolean {
  return initialized && isSLMAvailable();
}

export function getStageMode(stageId: string): 'rules-only' | 'slm-enhanced' {
  return stageModesConfig[stageId] || 'rules-only';
}

export function setStageMode(stageId: string, mode: 'rules-only' | 'slm-enhanced'): void {
  stageModesConfig[stageId] = mode;
  console.log(`[SLM Registry] Stage "${stageId}" set to ${mode}`);
}

export function getAllStageModes(): Record<string, 'rules-only' | 'slm-enhanced'> {
  const stages = getRegisteredStages();
  const result: Record<string, 'rules-only' | 'slm-enhanced'> = {};
  for (const stage of stages) {
    result[stage] = stageModesConfig[stage] || 'rules-only';
  }
  return result;
}