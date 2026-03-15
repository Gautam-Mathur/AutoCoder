// AutoCoder Intelligence Modules - Export all modules

export * from './clarification-engine';
export * from './testing-engine';
export * from './security-module';
export * from './transparency-module';
export * from './intel-memory';
export * from './dependency-intelligence';
export * from './export-system';

// Advanced capabilities
export * from './advanced-reasoning';
export * from './context-memory';
export * from './live-code-analysis';
export * from './framework-patterns';

// Claude-level capabilities
export * from './natural-language-understanding';
export * from './code-explanation-engine';
export * from './knowledge-base';
export {
  detectFollowUp,
  updateContext,
  generateClarification,
  getResponseHints,
  summarizeConversation,
  getConversationContext,
  formatConversationContextAsMarkdown,
} from './conversational-flexibility';

// Continuous debugging (renamed exports to avoid conflicts)
export {
  analyzeCode as continuousAnalyzeCode,
  autoFixCode as continuousAutoFixCode,
  continuousDebug,
  parseError,
  startDebugSession,
  getDebugSession,
  addIssueToSession,
  getDebugStatus,
  formatDebugReport,
} from './continuous-debugger';

// Complete Code Intelligence - Comprehensive patterns for full-stack development
export {
  PROJECT_BLUEPRINTS,
  FRAMEWORK_PATTERNS,
  BACKEND_PATTERNS,
  UI_COMPONENTS,
  AUTH_PATTERNS,
  DATABASE_PATTERNS,
  ERROR_SOLUTIONS,
  REAL_TIME_PATTERNS,
  PAYMENT_PATTERNS,
  TESTING_PATTERNS,
  SECURITY_PATTERNS,
  getPatternByType,
  getBlueprintFiles,
  getAllBlueprints,
} from './complete-code-intelligence.js';

// AI Code Refiner - Continuous code improvement with AI
export {
  refineCode,
  quickRefine,
  reviewProject,
  isAIRefinementAvailable,
  type FileToRefine,
  type RefinementResult,
  type RefinementOptions,
} from './ai-code-refiner.js';