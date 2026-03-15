/**
 * SLM Model Manager — Registry, assignment, and health management for local SLMs
 *
 * Features:
 *   - Model registry with per-stage assignment
 *   - Health checks and memory management
 *   - Initially supports single 7B model shared across stages
 *   - Later supports per-stage specialization with fine-tuned models
 *   - Model swap without restart
 */

export interface ModelInfo {
  id: string;
  name: string;
  path: string;
  sizeBytes: number;
  sizeLabel: string;
  parameterCount: string;
  quantization: string;
  contextLength: number;
  type: 'general' | 'stage-specific';
  assignedStages: string[];
  status: 'available' | 'loading' | 'loaded' | 'error' | 'not-found';
  lastUsed: number | null;
  totalInferences: number;
  avgLatencyMs: number;
  errorCount: number;
}

export interface StageAssignment {
  stage: string;
  modelId: string;
  priority: number;
  fallbackModelId: string | null;
  enabled: boolean;
}

export interface ModelManagerConfig {
  maxLoadedModels: number;
  maxMemoryMB: number;
  healthCheckIntervalMs: number;
  autoUnloadAfterMs: number;
  defaultModelId: string | null;
}

export interface ModelManagerStatus {
  initialized: boolean;
  registeredModels: number;
  loadedModels: number;
  assignedStages: number;
  totalMemoryUsedMB: number;
  maxMemoryMB: number;
  defaultModel: string | null;
  endpointConfigured: boolean;
  endpointUrl: string | null;
}

const DEFAULT_CONFIG: ModelManagerConfig = {
  maxLoadedModels: 2,
  maxMemoryMB: 8192,
  healthCheckIntervalMs: 60000,
  autoUnloadAfterMs: 300000,
  defaultModelId: null,
};

let config = { ...DEFAULT_CONFIG };
const modelRegistry: Map<string, ModelInfo> = new Map();
const stageAssignments: Map<string, StageAssignment> = new Map();
let endpointUrl: string | null = null;
let initialized = false;

export function initializeModelManager(newConfig?: Partial<ModelManagerConfig>): void {
  if (newConfig) {
    config = { ...config, ...newConfig };
  }
  initialized = true;
  console.log(`[Model Manager] Initialized — max ${config.maxLoadedModels} models, ${config.maxMemoryMB}MB memory limit`);
}

export function configureEndpoint(url: string): void {
  endpointUrl = url;
  console.log(`[Model Manager] Endpoint configured: ${url}`);
}

export function getEndpointUrl(): string | null {
  return endpointUrl;
}

export function registerModel(model: Omit<ModelInfo, 'status' | 'lastUsed' | 'totalInferences' | 'avgLatencyMs' | 'errorCount'>): ModelInfo {
  const fullModel: ModelInfo = {
    ...model,
    status: 'available',
    lastUsed: null,
    totalInferences: 0,
    avgLatencyMs: 0,
    errorCount: 0,
  };

  modelRegistry.set(model.id, fullModel);

  if (!config.defaultModelId) {
    config.defaultModelId = model.id;
  }

  console.log(`[Model Manager] Registered model: ${model.name} (${model.sizeLabel}, ${model.parameterCount})`);
  return fullModel;
}

export function unregisterModel(modelId: string): boolean {
  const model = modelRegistry.get(modelId);
  if (!model) return false;

  stageAssignments.forEach((assignment, stage) => {
    if (assignment.modelId === modelId) {
      stageAssignments.delete(stage);
    }
  });

  if (config.defaultModelId === modelId) {
    config.defaultModelId = null;
    const remaining = Array.from(modelRegistry.keys()).filter(id => id !== modelId);
    if (remaining.length > 0) {
      config.defaultModelId = remaining[0];
    }
  }

  modelRegistry.delete(modelId);
  return true;
}

export function assignModelToStage(
  stage: string,
  modelId: string,
  options?: { priority?: number; fallbackModelId?: string; enabled?: boolean }
): boolean {
  const model = modelRegistry.get(modelId);
  if (!model) {
    console.warn(`[Model Manager] Cannot assign unknown model ${modelId} to stage ${stage}`);
    return false;
  }

  const assignment: StageAssignment = {
    stage,
    modelId,
    priority: options?.priority ?? 1,
    fallbackModelId: options?.fallbackModelId ?? config.defaultModelId,
    enabled: options?.enabled ?? true,
  };

  stageAssignments.set(stage, assignment);

  if (!model.assignedStages.includes(stage)) {
    model.assignedStages.push(stage);
  }

  return true;
}

export function unassignStage(stage: string): void {
  const assignment = stageAssignments.get(stage);
  if (assignment) {
    const model = modelRegistry.get(assignment.modelId);
    if (model) {
      model.assignedStages = model.assignedStages.filter(s => s !== stage);
    }
    stageAssignments.delete(stage);
  }
}

export function getModelForStage(stage: string): ModelInfo | null {
  const assignment = stageAssignments.get(stage);

  if (assignment?.enabled) {
    const model = modelRegistry.get(assignment.modelId);
    if (model && model.status !== 'error' && model.status !== 'not-found') {
      return model;
    }
    if (assignment.fallbackModelId) {
      const fallback = modelRegistry.get(assignment.fallbackModelId);
      if (fallback) return fallback;
    }
  }

  if (config.defaultModelId) {
    return modelRegistry.get(config.defaultModelId) || null;
  }

  return null;
}

export function isStageEnabled(stage: string): boolean {
  const assignment = stageAssignments.get(stage);
  if (assignment) return assignment.enabled;
  return config.defaultModelId !== null;
}

export function enableStage(stage: string, enabled: boolean): void {
  const assignment = stageAssignments.get(stage);
  if (assignment) {
    assignment.enabled = enabled;
  }
}

export function recordInference(modelId: string, latencyMs: number, success: boolean): void {
  const model = modelRegistry.get(modelId);
  if (!model) return;

  model.lastUsed = Date.now();
  model.totalInferences++;

  if (success) {
    model.avgLatencyMs = (model.avgLatencyMs * (model.totalInferences - 1) + latencyMs) / model.totalInferences;
  } else {
    model.errorCount++;
  }
}

export function getModelInfo(modelId: string): ModelInfo | null {
  return modelRegistry.get(modelId) || null;
}

export function getAllModels(): ModelInfo[] {
  return Array.from(modelRegistry.values());
}

export function getAllAssignments(): StageAssignment[] {
  return Array.from(stageAssignments.values());
}

export function getManagerStatus(): ModelManagerStatus {
  const loadedCount = Array.from(modelRegistry.values()).filter(m => m.status === 'loaded').length;
  const totalMemory = Array.from(modelRegistry.values())
    .filter(m => m.status === 'loaded')
    .reduce((sum, m) => sum + m.sizeBytes / (1024 * 1024), 0);

  return {
    initialized,
    registeredModels: modelRegistry.size,
    loadedModels: loadedCount,
    assignedStages: stageAssignments.size,
    totalMemoryUsedMB: Math.round(totalMemory),
    maxMemoryMB: config.maxMemoryMB,
    defaultModel: config.defaultModelId,
    endpointConfigured: endpointUrl !== null,
    endpointUrl,
  };
}

export function setDefaultModel(modelId: string): boolean {
  if (!modelRegistry.has(modelId)) return false;
  config.defaultModelId = modelId;
  return true;
}

export function resetModelManager(): void {
  modelRegistry.clear();
  stageAssignments.clear();
  config = { ...DEFAULT_CONFIG };
  endpointUrl = null;
  initialized = false;
}