// Progress Estimator - Estimate generation time and show meaningful progress

export interface GenerationMetrics {
  promptLength: number;
  complexity: 'simple' | 'moderate' | 'complex' | 'enterprise';
  estimatedTokens: number;
  estimatedFiles: number;
  estimatedTimeMs: number;
}

export interface ProgressState {
  stage: 'analyzing' | 'planning' | 'generating' | 'validating' | 'fixing' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
  subMessage?: string;
  estimatedRemainingMs: number;
  startTime: number;
  metrics?: GenerationMetrics;
}

// Complexity keywords for estimation
const complexityIndicators = {
  simple: ['button', 'form', 'counter', 'hello world', 'simple', 'basic', 'static'],
  moderate: ['todo', 'crud', 'api', 'login', 'auth', 'list', 'table', 'chart'],
  complex: ['ecommerce', 'dashboard', 'admin', 'full-stack', 'realtime', 'websocket', 'payment'],
  enterprise: ['microservices', 'kubernetes', 'multi-tenant', 'scalable', 'distributed', 'saas']
};

// Average generation times by complexity (in ms)
const baseGenerationTimes = {
  simple: 15000,      // 15 seconds
  moderate: 30000,    // 30 seconds
  complex: 60000,     // 60 seconds
  enterprise: 120000  // 2 minutes
};

// Stage progress weights
const stageWeights = {
  analyzing: { start: 0, end: 15, defaultDuration: 2000 },
  planning: { start: 15, end: 30, defaultDuration: 3000 },
  generating: { start: 30, end: 85, defaultDuration: 0 }, // Main generation
  validating: { start: 85, end: 95, defaultDuration: 2000 },
  fixing: { start: 95, end: 99, defaultDuration: 1500 },
  complete: { start: 100, end: 100, defaultDuration: 0 },
  error: { start: 0, end: 0, defaultDuration: 0 }
};

// Analyze prompt to estimate complexity
export function analyzePromptComplexity(prompt: string): GenerationMetrics {
  const lowerPrompt = prompt.toLowerCase();
  const words = lowerPrompt.split(/\s+/).length;

  // Determine complexity
  let complexity: GenerationMetrics['complexity'] = 'moderate';

  for (const indicator of complexityIndicators.enterprise) {
    if (lowerPrompt.includes(indicator)) {
      complexity = 'enterprise';
      break;
    }
  }

  if (complexity === 'moderate') {
    for (const indicator of complexityIndicators.complex) {
      if (lowerPrompt.includes(indicator)) {
        complexity = 'complex';
        break;
      }
    }
  }

  if (complexity === 'moderate') {
    for (const indicator of complexityIndicators.simple) {
      if (lowerPrompt.includes(indicator)) {
        complexity = 'simple';
        break;
      }
    }
  }

  // Adjust based on word count
  if (words > 100) complexity = upgradeComplexity(complexity);
  if (words > 200) complexity = upgradeComplexity(complexity);

  // Estimate other metrics
  const estimatedTokens = estimateTokenCount(prompt, complexity);
  const estimatedFiles = estimateFileCount(complexity);
  const estimatedTimeMs = calculateEstimatedTime(complexity, words);

  return {
    promptLength: prompt.length,
    complexity,
    estimatedTokens,
    estimatedFiles,
    estimatedTimeMs
  };
}

// Upgrade complexity level
function upgradeComplexity(current: GenerationMetrics['complexity']): GenerationMetrics['complexity'] {
  switch (current) {
    case 'simple': return 'moderate';
    case 'moderate': return 'complex';
    case 'complex': return 'enterprise';
    default: return 'enterprise';
  }
}

// Estimate token count
function estimateTokenCount(prompt: string, complexity: GenerationMetrics['complexity']): number {
  const baseTokens = {
    simple: 2000,
    moderate: 5000,
    complex: 10000,
    enterprise: 15000
  };

  // Add prompt tokens (roughly 1 token per 4 characters)
  const promptTokens = Math.ceil(prompt.length / 4);

  return baseTokens[complexity] + promptTokens;
}

// Estimate file count
function estimateFileCount(complexity: GenerationMetrics['complexity']): number {
  switch (complexity) {
    case 'simple': return 3;
    case 'moderate': return 6;
    case 'complex': return 12;
    case 'enterprise': return 20;
    default: return 6;
  }
}

// Calculate estimated time
function calculateEstimatedTime(complexity: GenerationMetrics['complexity'], wordCount: number): number {
  let time = baseGenerationTimes[complexity];

  // Add time for longer prompts
  time += wordCount * 100; // ~100ms per word

  // Add variance (+/- 20%)
  const variance = 0.2;
  const randomFactor = 1 + (Math.random() * variance * 2 - variance);

  return Math.round(time * randomFactor);
}

// Format time for display
export function formatTime(ms: number): string {
  if (ms < 1000) return 'less than a second';
  if (ms < 60000) {
    const seconds = Math.ceil(ms / 1000);
    return `${seconds} second${seconds > 1 ? 's' : ''}`;
  }

  const minutes = Math.floor(ms / 60000);
  const seconds = Math.ceil((ms % 60000) / 1000);

  if (seconds === 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Progress manager class
class ProgressManager {
  private states: Map<string, ProgressState> = new Map();
  private listeners: Map<string, ((state: ProgressState) => void)[]> = new Map();
  private intervals: Map<string, ReturnType<typeof setInterval>> = new Map();

  // Start tracking progress for a generation
  start(id: string, metrics: GenerationMetrics): ProgressState {
    const state: ProgressState = {
      stage: 'analyzing',
      progress: 0,
      message: 'Analyzing your requirements...',
      estimatedRemainingMs: metrics.estimatedTimeMs,
      startTime: Date.now(),
      metrics
    };

    this.states.set(id, state);
    this.startProgressUpdates(id);
    this.notifyListeners(id, state);

    return state;
  }

  // Update to a new stage
  updateStage(id: string, stage: ProgressState['stage'], message?: string): ProgressState | null {
    const state = this.states.get(id);
    if (!state) return null;

    state.stage = stage;
    state.progress = stageWeights[stage].start;
    state.message = message || this.getDefaultMessage(stage);

    if (stage === 'complete' || stage === 'error') {
      this.stopProgressUpdates(id);
      state.estimatedRemainingMs = 0;
      state.progress = stage === 'complete' ? 100 : state.progress;
    }

    this.notifyListeners(id, state);
    return state;
  }

  // Update progress within current stage
  updateProgress(id: string, progress: number, subMessage?: string): ProgressState | null {
    const state = this.states.get(id);
    if (!state) return null;

    const weights = stageWeights[state.stage];
    const stageProgress = weights.start + (progress / 100) * (weights.end - weights.start);
    state.progress = Math.min(stageProgress, weights.end);

    if (subMessage) {
      state.subMessage = subMessage;
    }

    // Update remaining time estimate
    const elapsed = Date.now() - state.startTime;
    const totalEstimate = state.metrics?.estimatedTimeMs || 60000;
    const progressRatio = state.progress / 100;
    const estimatedTotal = elapsed / progressRatio;
    state.estimatedRemainingMs = Math.max(0, estimatedTotal - elapsed);

    this.notifyListeners(id, state);
    return state;
  }

  // Get current state
  getState(id: string): ProgressState | null {
    return this.states.get(id) || null;
  }

  // Register listener for progress updates
  onProgress(id: string, listener: (state: ProgressState) => void): () => void {
    const listeners = this.listeners.get(id) || [];
    listeners.push(listener);
    this.listeners.set(id, listeners);

    // Send current state immediately
    const state = this.states.get(id);
    if (state) listener(state);

    return () => {
      const current = this.listeners.get(id) || [];
      const idx = current.indexOf(listener);
      if (idx > -1) current.splice(idx, 1);
    };
  }

  // Complete generation
  complete(id: string): void {
    this.updateStage(id, 'complete', 'Generation complete!');
    this.cleanup(id);
  }

  // Error occurred
  error(id: string, message: string): void {
    this.updateStage(id, 'error', message);
    this.cleanup(id);
  }

  // Cleanup
  cleanup(id: string): void {
    this.stopProgressUpdates(id);
    // Don't delete state immediately to allow final state access
    setTimeout(() => {
      this.states.delete(id);
      this.listeners.delete(id);
    }, 5000);
  }

  // Start automatic progress updates
  private startProgressUpdates(id: string): void {
    const interval = setInterval(() => {
      const state = this.states.get(id);
      if (!state || state.stage === 'complete' || state.stage === 'error') {
        this.stopProgressUpdates(id);
        return;
      }

      // Slowly increment progress
      const weights = stageWeights[state.stage];
      const maxProgress = weights.end - 5; // Leave room for actual completion

      if (state.progress < maxProgress) {
        state.progress += 0.5;
        state.estimatedRemainingMs = Math.max(0, state.estimatedRemainingMs - 500);
        this.notifyListeners(id, state);
      }
    }, 500);

    this.intervals.set(id, interval);
  }

  // Stop progress updates
  private stopProgressUpdates(id: string): void {
    const interval = this.intervals.get(id);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(id);
    }
  }

  // Notify all listeners
  private notifyListeners(id: string, state: ProgressState): void {
    const listeners = this.listeners.get(id) || [];
    for (const listener of listeners) {
      listener({ ...state });
    }
  }

  // Get default message for stage
  private getDefaultMessage(stage: ProgressState['stage']): string {
    switch (stage) {
      case 'analyzing': return 'Analyzing your requirements...';
      case 'planning': return 'Planning project architecture...';
      case 'generating': return 'Generating code...';
      case 'validating': return 'Validating generated code...';
      case 'fixing': return 'Applying auto-fixes...';
      case 'complete': return 'Generation complete!';
      case 'error': return 'An error occurred';
      default: return 'Processing...';
    }
  }
}

// Singleton instance
export const progressManager = new ProgressManager();

// React hook for progress
export function useProgress(generationId: string) {
  return {
    start: (metrics: GenerationMetrics) => progressManager.start(generationId, metrics),
    updateStage: (stage: ProgressState['stage'], message?: string) =>
      progressManager.updateStage(generationId, stage, message),
    updateProgress: (progress: number, subMessage?: string) =>
      progressManager.updateProgress(generationId, progress, subMessage),
    getState: () => progressManager.getState(generationId),
    onProgress: (listener: (state: ProgressState) => void) =>
      progressManager.onProgress(generationId, listener),
    complete: () => progressManager.complete(generationId),
    error: (message: string) => progressManager.error(generationId, message)
  };
}