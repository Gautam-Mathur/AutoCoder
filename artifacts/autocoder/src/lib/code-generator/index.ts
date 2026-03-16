// Code Generator - Local Template-Based Engine + Pro Generator + AI-Powered Generation
// Pro Generator for multi-file React projects, Templates for simple requests

export { generateCode, generateCodeWithContext, generateCodeWithThinking, getAvailableTemplates, isCodingRequest } from "./engine";
export type { ThinkingGenerationResult } from "./engine";
export type { CodeTemplate } from "./templates";
export { matchRunnableTemplate, runnableTemplates } from "./runnable-templates";
export type { RunnableProject } from "./runnable-templates";
export { generateFullStackApp, generateFullStackAppSync, shouldUseAIGeneration } from "./ai-fullstack-generator";
export type { GeneratedProject, GenerationProgress } from "./ai-fullstack-generator";
export { analyzePrompt, generateProject, formatProjectResponse, shouldUseProGenerator, analyzePromptWithThinking, generateProjectWithThinking } from "./pro-generator";
export type { ProjectRequirements, ThinkingStep, ThinkingCallback } from "./pro-generator";
export type { GeneratedProject as ProGeneratedProject } from "./pro-generator";
export { validateGeneratedCode, autoFixCode } from "./code-validator";
export type { ValidationResult, ValidationError, ValidationWarning } from "./code-validator";
export { detectStandaloneScript, generateStandaloneScript, formatScriptResponse } from "./script-generator";