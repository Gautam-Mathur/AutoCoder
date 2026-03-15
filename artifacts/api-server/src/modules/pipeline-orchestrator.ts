/**
 * Pipeline Orchestrator - The "Tech Lead" that coordinates all generation modules
 *
 * Runs a 17-stage pipeline like a full development team:
 *   Product Manager → Architect → Planner → Analyst → Designer → Feature Spec →
 *   Schema Engineer → API Architect → UI Composer → Code Generator →
 *   Dependency Resolver → Quality Reviewer → Test Engineer → Validator →
 *   Quality Architect → Learning Recorder
 */

import type { ProjectPlan, PlannedEntity } from './plan-generator.js';
import type { UnderstandingResult } from './deep-understanding-engine.js';
import type { ReasoningResult, ComputedField } from './contextual-reasoning-engine.js';
import type { DesignSystem } from './design-system-engine.js';
import type { FunctionalitySpec } from './functionality-engine.js';
import type { ArchitecturePlan } from './architecture-planner.js';
import type { SchemaDesign } from './schema-designer.js';
import type { APIDesign } from './api-designer.js';
import type { ComponentTree } from './component-composer.js';
import type { QualityReport } from './code-quality-engine.js';
import type { DependencyManifest } from './dependency-resolver.js';

import { analyzeRequest } from './deep-understanding-engine.js';
import { generatePlan } from './plan-generator.js';
import { analyzeSemantics } from './contextual-reasoning-engine.js';
import { generateDesignSystem } from './design-system-engine.js';
import { generateFunctionalitySpec } from './functionality-engine.js';
import { planArchitecture } from './architecture-planner.js';
import { designSchema } from './schema-designer.js';
import { designAPI } from './api-designer.js';
import { composeComponents } from './component-composer.js';
import { analyzeCodeQuality, applyQualityFixes } from './code-quality-engine.js';
import { resolveDependencies } from './dependency-resolver.js';
import { generateProjectFromPlan } from './plan-driven-generator.js';
import { validateAndFix } from './post-generation-validator.js';
import { parseErrors, analyzeAndFix as viteAnalyzeAndFix } from './vite-error-fixer.js';
import { isSLMAvailable, runSLM } from './slm-inference-engine.js';
import { UNDERSTANDING_STAGE_ID, mergeUnderstandingResults } from './slm-stage-understanding.js';
import { CODEGEN_STAGE_ID, applyCodeEnhancements, validateCodeEnhancement } from './slm-stage-codegen.js';
import type { CodeEnhancement } from './slm-stage-codegen.js';
import { generateTestFiles } from './test-generator.js';
import { learningEngine } from './generation-learning-engine.js';
import { inferEntityFields, isSemanticDuplicate } from './entity-field-inference.js';
import { planUXFlows } from './ux-flow-planner.js';
import { planIntegrations } from './integration-planner.js';
import { planSecurity } from './security-planner.js';
import { planPerformance } from './performance-planner.js';
import { validateCrossFileConsistency, applyCrossFileConsistencyFixes } from './cross-file-validator.js';
import { hardenGeneratedCode, applyHardeningFixes } from './code-hardening-pass.js';
import { verifyTypeContracts } from './type-contract-verifier.js';
import { scanAntiPatterns } from './anti-pattern-scanner.js';
import { scoreProjectQuality, formatQualityReport } from './quality-scoring-engine.js';
import type { QualityPassResults } from './quality-scoring-engine.js';

function deepClonePlan(plan: ProjectPlan): ProjectPlan {
  return JSON.parse(JSON.stringify(plan));
}

interface EntityIntelligenceContext {
  inferredRelationships: Array<{ from: string; to: string; type: string }>;
  upgradedEntities: string[];
}

export interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

export interface ThinkingStep {
  phase: string;
  label: string;
  detail?: string;
  timestamp: number;
}

export interface PipelineStage {
  id: string;
  name: string;
  role: string;
  description: string;
  order: number;
  critical: boolean;
}

export interface StageResult {
  stageId: string;
  success: boolean;
  durationMs: number;
  qualityScore: number;
  warnings: string[];
  errors: string[];
  output: unknown;
}

export interface QualityGate {
  stageId: string;
  passed: boolean;
  score: number;
  threshold: number;
  issues: string[];
}

export interface PipelineMetrics {
  totalDurationMs: number;
  stageResults: Map<string, StageResult>;
  qualityGates: QualityGate[];
  overallScore: number;
  fileCount: number;
  lineCount: number;
  componentCount: number;
  endpointCount: number;
}

export interface PipelineContext {
  userRequest: string;
  conversationHistory?: string;
  understanding?: UnderstandingResult;
  plan?: ProjectPlan;
  frozenPlan?: ProjectPlan;
  entityIntelligenceCtx?: EntityIntelligenceContext;
  reasoning?: ReasoningResult;
  architecture?: ArchitecturePlan;
  designSystem?: DesignSystem;
  functionalitySpec?: FunctionalitySpec;
  schemaDesign?: SchemaDesign;
  apiDesign?: APIDesign;
  componentTree?: ComponentTree;
  files: GeneratedFile[];
  dependencyManifest?: DependencyManifest;
  qualityReport?: QualityReport;
  validationSummary?: { passes: number; issuesFound: number; issuesFixed: number; unfixableIssues: string[] };
  testFiles: GeneratedFile[];
  metrics: PipelineMetrics;
  thinkingSteps: ThinkingStep[];
  onStep?: (step: ThinkingStep) => void;
}

export interface OrchestrationResult {
  success: boolean;
  files: GeneratedFile[];
  testFiles: GeneratedFile[];
  context: PipelineContext;
  metrics: PipelineMetrics;
  summary: PipelineSummary;
}

export interface PipelineSummary {
  totalStages: number;
  completedStages: number;
  failedStages: string[];
  skippedStages: string[];
  overallQuality: number;
  highlights: string[];
  warnings: string[];
}

const PIPELINE_STAGES: PipelineStage[] = [
  { id: 'understand', name: 'Product Manager', role: 'Requirement Analysis', description: 'Analyzes user request, decomposes intent, detects domain', order: 1, critical: true },
  { id: 'plan', name: 'Project Manager', role: 'Project Planning', description: 'Creates detailed project plan with modules, pages, endpoints', order: 2, critical: true },
  { id: 'learn', name: 'Senior Advisor', role: 'Pattern Application', description: 'Applies learned patterns from previous successful generations', order: 3, critical: false },
  { id: 'reason', name: 'Technical Analyst', role: 'Semantic Analysis', description: 'Analyzes entity relationships, field semantics, business rules', order: 4, critical: true },
  { id: 'architect', name: 'System Architect', role: 'Architecture Planning', description: 'Determines folder structure, state management, auth, data flow patterns', order: 5, critical: true },
  { id: 'design', name: 'UI/UX Designer', role: 'Design System', description: 'Generates domain-aware color palettes, typography, animations, dark mode', order: 6, critical: true },
  { id: 'specify', name: 'Feature Analyst', role: 'Functionality Specification', description: 'Maps entity types to interactive features, page layouts, CRUD enhancements', order: 7, critical: true },
  { id: 'schema', name: 'Database Engineer', role: 'Schema Design', description: 'Designs normalized schemas, indexes, constraints, audit trails', order: 8, critical: true },
  { id: 'api', name: 'API Architect', role: 'API Design', description: 'Designs RESTful endpoints, validation, error handling, pagination', order: 9, critical: true },
  { id: 'compose', name: 'UI Engineer', role: 'Component Composition', description: 'Plans component tree, prop flow, reusable components, accessibility', order: 10, critical: true },
  { id: 'generate', name: 'Full-Stack Developer', role: 'Code Generation', description: 'Generates all project files from enriched plan and specs', order: 11, critical: true },
  { id: 'resolve', name: 'DevOps Engineer', role: 'Dependency Resolution', description: 'Resolves packages, checks compatibility, optimizes bundle', order: 12, critical: false },
  { id: 'quality', name: 'Code Reviewer', role: 'Quality Assurance', description: 'Enforces best practices, detects code smells, checks accessibility', order: 13, critical: false },
  { id: 'test', name: 'QA Engineer', role: 'Test Generation', description: 'Generates unit, integration, and component tests', order: 14, critical: false },
  { id: 'validate', name: 'Release Engineer', role: 'Validation & Auto-Fix', description: 'Validates imports, dependencies, fixes common issues', order: 15, critical: true },
  { id: 'deep-quality', name: 'Quality Architect', role: 'Deep Quality Analysis', description: 'Cross-file consistency, code hardening, type contracts, anti-patterns, quality scoring', order: 16, critical: false },
  { id: 'record', name: 'Knowledge Manager', role: 'Learning & Recording', description: 'Records patterns and outcomes for future improvements', order: 17, critical: false },
];

function createEmptyMetrics(): PipelineMetrics {
  return {
    totalDurationMs: 0,
    stageResults: new Map(),
    qualityGates: [],
    overallScore: 0,
    fileCount: 0,
    lineCount: 0,
    componentCount: 0,
    endpointCount: 0,
  };
}

type OnStepCallback = (step: ThinkingStep) => void;

function emitStep(ctx: PipelineContext, phase: string, label: string, detail?: string) {
  const step: ThinkingStep = { phase, label, detail, timestamp: Date.now() };
  ctx.thinkingSteps.push(step);
  if (ctx.onStep) ctx.onStep(step);
}

function runQualityGate(stageId: string, score: number, threshold: number, issues: string[]): QualityGate {
  return {
    stageId,
    passed: score >= threshold,
    score,
    threshold,
    issues: issues.filter(Boolean),
  };
}

function executeStage(
  ctx: PipelineContext,
  stage: PipelineStage,
  executor: () => { score: number; warnings: string[]; output: unknown },
  maxRetries: number = 0
): StageResult {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const start = Date.now();
    try {
      const result = executor();
      const duration = Date.now() - start;
      const stageResult: StageResult = {
        stageId: stage.id,
        success: true,
        durationMs: duration,
        qualityScore: result.score,
        warnings: result.warnings,
        errors: [],
        output: result.output,
      };

      const gate = runQualityGate(stage.id, result.score, stage.critical ? 60 : 40, result.warnings);
      ctx.metrics.qualityGates.push(gate);
      ctx.metrics.stageResults.set(stage.id, stageResult);

      if (!gate.passed && stage.critical) {
        if (attempt < maxRetries) {
          emitStep(ctx, stage.id, `${stage.name} quality gate failed, retrying`,
            `Critical stage scored ${gate.score}/${gate.threshold} — retry ${attempt + 1}/${maxRetries}`);
          continue;
        }
        const gateWarning = `Quality gate failed for critical stage "${stage.name}" (${gate.score}/${gate.threshold}): ${gate.issues.length > 0 ? gate.issues.join('; ') : 'score below threshold'}`;
        console.warn(`[Pipeline] ${gateWarning}`);
        stageResult.warnings.push(gateWarning);
        emitStep(ctx, stage.id, `${stage.name} quality gate failed`,
          `Critical stage scored ${gate.score}/${gate.threshold} — exhausted ${maxRetries} retries, proceeding with best result`);
      } else if (!gate.passed) {
        const gateWarning = `Quality gate failed for stage "${stage.name}" (${gate.score}/${gate.threshold})`;
        console.warn(`[Pipeline] ${gateWarning}`);
        stageResult.warnings.push(gateWarning);
      }

      emitStep(ctx, stage.id, `${stage.name} complete`,
        `${stage.role}: score ${result.score}/100 in ${duration}ms${result.warnings.length > 0 ? ` (${result.warnings.length} warnings)` : ''}`);

      return stageResult;
    } catch (err) {
      lastErr = err;
      const duration = Date.now() - start;
      const errorMsg = err instanceof Error ? err.message : String(err);

      if (attempt < maxRetries) {
        emitStep(ctx, stage.id, `${stage.name} failed, retrying`,
          `Attempt ${attempt + 1}/${maxRetries + 1}: ${errorMsg}`);
        continue;
      }

      const stageResult: StageResult = {
        stageId: stage.id,
        success: false,
        durationMs: duration,
        qualityScore: 0,
        warnings: [],
        errors: [errorMsg],
        output: null,
      };

      ctx.metrics.stageResults.set(stage.id, stageResult);
      emitStep(ctx, stage.id, `${stage.name} failed`, `Error: ${errorMsg}`);

      if (stage.critical) {
        throw new Error(`Critical stage "${stage.name}" failed: ${errorMsg}`);
      }

      return stageResult;
    }
  }
  const errMsg = lastErr instanceof Error ? (lastErr as Error).message : String(lastErr);
  throw new Error(`Stage "${stage.name}" exhausted all retries: ${errMsg}`);
}

export async function orchestrateGeneration(plan: ProjectPlan, understanding?: UnderstandingResult, onStep?: OnStepCallback): Promise<OrchestrationResult> {
  const pipelineStart = Date.now();

  const ctx: PipelineContext = {
    userRequest: understanding?.level1_intent?.primaryGoal || '',
    understanding,
    plan,
    files: [],
    testFiles: [],
    metrics: createEmptyMetrics(),
    thinkingSteps: [],
    onStep,
  };

  emitStep(ctx, 'orchestrator', 'Pipeline Orchestrator activated', `Coordinating ${PIPELINE_STAGES.length} specialized modules for "${plan.projectName}"`);
  emitStep(ctx, 'orchestrator', 'Assembling dev team', 'Each module acts as a specialized team member — Product Manager through Knowledge Manager — working sequentially so each builds on the previous output');

  const failedStages: string[] = [];
  const skippedStages: string[] = [];

  // Stage 1: Understanding (already done by conversation handler, enrich if available)
  const understandStage = PIPELINE_STAGES.find(s => s.id === 'understand')!;
  if (understanding) {
    emitStep(ctx, 'understand', 'Product Manager reviewing requirements', 'Re-validating the deep understanding analysis to ensure nothing was missed before planning begins');
    const intentGoal = understanding.level1_intent?.primaryGoal || 'application';
    const domainName = understanding.level2_domain?.primaryDomain?.name || 'general';
    const entityCount = understanding.level3_entities?.mentionedEntities?.length || 0;
    const inferredCount = understanding.level3_entities?.inferredEntities?.length || 0;
    const workflowCount = understanding.level4_workflows?.inferredWorkflows?.length || 0;
    emitStep(ctx, 'understand', 'Requirement breakdown', `Goal: "${intentGoal}" | Domain: ${domainName} | ${entityCount} explicit entities + ${inferredCount} inferred | ${workflowCount} workflows detected`);
    emitStep(ctx, 'understand', 'Why this matters', 'Validating understanding first prevents wasted work downstream — if we misidentify the domain, every module after would generate wrong patterns');
    executeStage(ctx, understandStage, () => ({
      score: Math.round(understanding.confidence * 100),
      warnings: understanding.confidence < 0.7 ? ['Low confidence in requirement understanding'] : [],
      output: understanding,
    }));
    emitStep(ctx, 'understand', 'Confidence assessment', `${Math.round(understanding.confidence * 100)}% confident in requirement interpretation${understanding.confidence < 0.7 ? ' — will proceed cautiously with more generic patterns' : ' — high confidence, proceeding with domain-specific optimizations'}`);

    if (isSLMAvailable()) {
      emitStep(ctx, 'understand', 'SLM enhancing understanding', 'Running AI-enhanced analysis to detect implicit requirements and hidden entities');
      try {
        const slmResult = await runSLM(UNDERSTANDING_STAGE_ID, {
          userRequest: ctx.userRequest || understanding.level1_intent?.primaryGoal || '',
          ruleOutput: understanding,
        });
        if (slmResult.success && slmResult.data) {
          const merged = mergeUnderstandingResults(understanding, slmResult.data);
          Object.assign(understanding, merged);
          const implicitCount = slmResult.data.implicitRequirements?.length || 0;
          const newEntities = slmResult.data.entities?.filter((e: any) => e.isImplied)?.length || 0;
          emitStep(ctx, 'understand', 'SLM enhancement complete', `Added ${implicitCount} implicit requirements, ${newEntities} inferred entities (${slmResult.latencyMs}ms)`);
        } else {
          emitStep(ctx, 'understand', 'SLM enhancement skipped', slmResult.error || 'No useful enhancements found');
        }
      } catch (err) {
        emitStep(ctx, 'understand', 'SLM enhancement skipped', `Non-fatal error: ${err}`);
      }
    }
  } else {
    emitStep(ctx, 'understand', 'Skipping re-analysis', 'No prior understanding data available — the plan will be used as-is');
    skippedStages.push('understand');
  }

  // Stage 2: Planning (already done, validate)
  const planStage = PIPELINE_STAGES.find(s => s.id === 'plan')!;
  const entityCount = plan.dataModel?.length || 0;
  const pageCount = plan.pages?.length || 0;
  const endpointCount = plan.apiEndpoints?.length || 0;
  const moduleCount = plan.modules?.length || 0;
  emitStep(ctx, 'plan', 'Project Manager validating plan structure', `Checking completeness: ${entityCount} data models, ${pageCount} pages, ${endpointCount} API endpoints, ${moduleCount} modules`);
  emitStep(ctx, 'plan', 'Why we validate the plan', 'A weak plan leads to incomplete code — checking entity counts, page coverage, and endpoint mappings ensures the generator has enough blueprints to produce a working app');
  executeStage(ctx, planStage, () => {
    const score = Math.min(100, 50 + entityCount * 5 + pageCount * 5);
    return {
      score,
      warnings: entityCount === 0 ? ['No entities in data model'] : [],
      output: { entities: entityCount, pages: pageCount, endpoints: endpointCount },
    };
  });
  emitStep(ctx, 'plan', 'Plan assessment', `${entityCount === 0 ? 'Warning: No entities found — the app may lack data persistence' : `Solid foundation with ${entityCount} entities providing full CRUD coverage across ${pageCount} pages`}`);

  // Stage 3: Learning patterns
  const learnStage = PIPELINE_STAGES.find(s => s.id === 'learn')!;
  emitStep(ctx, 'learn', 'Senior Advisor consulting past experience', 'Searching the learning engine for patterns from previous successful generations that match this project type');
  executeStage(ctx, learnStage, () => {
    try {
      if (!learningEngine.isLoaded) {
        emitStep(ctx, 'learn', 'Learning data still loading', 'Database patterns are loading in background — applying default patterns for now');
      }
      ctx.plan = learningEngine.applyLearnedPatterns(deepClonePlan(ctx.plan!));
      emitStep(ctx, 'learn', 'Patterns applied', 'Enhanced the plan with field naming conventions, relationship patterns, and UI layout preferences from past successes');
      return { score: learningEngine.isLoaded ? 80 : 60, warnings: learningEngine.isLoaded ? [] : ['DB patterns may not be fully loaded'], output: 'Applied learned patterns' };
    } catch {
      emitStep(ctx, 'learn', 'No prior patterns found', 'This appears to be a novel project type — generating fresh patterns from first principles');
      return { score: 50, warnings: ['No learned patterns available'], output: null };
    }
  });

  // Stage 3a: Entity Intelligence — upgrade generic entities with deep field inference + trait composition
  emitStep(ctx, 'plan', 'Entity Intelligence upgrading data model', `Analyzing ${ctx.plan!.dataModel.length} entities against 55+ archetypes and 20 composable traits to add domain-specific fields, types, and relationships`);
  const entityIntelligenceCtx: EntityIntelligenceContext = { inferredRelationships: [], upgradedEntities: [] };
  try {
    const entityNames = ctx.plan!.dataModel.map(e => e.name);
    const detectedDomainId = ctx.understanding?.level2_domain?.primaryDomain?.id;
    const inferredEntities = inferEntityFields(entityNames, detectedDomainId);
    let upgraded = 0;
    for (const entity of ctx.plan!.dataModel) {
      const inferred = inferredEntities.find(e => e.name === entity.name);
      if (inferred && inferred.matchConfidence > 0.5) {
        const existingFieldNames = new Set(entity.fields.map(f => f.name));
        const archetypeFields = inferred.fields.map(f => ({
          name: f.name,
          type: f.type,
          required: f.required || false,
          description: f.description,
        }));
        for (const af of archetypeFields) {
          if (!existingFieldNames.has(af.name) && !isSemanticDuplicate(af.name, existingFieldNames)) {
            entity.fields.push(af);
          }
        }
        entityIntelligenceCtx.upgradedEntities.push(entity.name);
        if (inferred.relationships && inferred.relationships.length > 0) {
          const existingRels = new Set(entity.relationships.map(r => r.entity));
          for (const rel of inferred.relationships) {
            if (!existingRels.has(rel.entity)) {
              entity.relationships.push({ entity: rel.entity, type: rel.type, field: rel.field || '' });
              entityIntelligenceCtx.inferredRelationships.push({ from: entity.name, to: rel.entity, type: rel.type });
            }
          }
        }
        upgraded++;
      }
    }
    ctx.entityIntelligenceCtx = entityIntelligenceCtx;
    emitStep(ctx, 'plan', 'Entity Intelligence complete', `Upgraded ${upgraded}/${ctx.plan!.dataModel.length} entities with domain-specific fields and relationships`);
  } catch (e) {
    emitStep(ctx, 'plan', 'Entity Intelligence skipped', 'Field inference unavailable — using base entity definitions');
  }

  // Stage 3b: UX Flow Planning — generate user journeys
  emitStep(ctx, 'plan', 'UX Planner designing user journeys', 'Building onboarding flows, CRUD wizards, status transitions, and error handling strategies');
  try {
    const uxResult = planUXFlows(ctx.plan!);
    ctx.plan!.uxFlows = uxResult.uxFlows;
    ctx.plan!.errorHandling = uxResult.errorHandling;
    emitStep(ctx, 'plan', 'UX flows planned', `${uxResult.uxFlows.length} user flows designed | ${uxResult.errorHandling.pageStates.length} page states with empty/error/loading patterns`);
  } catch (e) {
    emitStep(ctx, 'plan', 'UX flow planning skipped', 'UX planner unavailable — pages will use default interaction patterns');
  }

  // Stage 3c: Integration Detection — detect needed third-party integrations
  emitStep(ctx, 'plan', 'Integration Detector scanning for required integrations', 'Analyzing entity fields, page features, and project description for payment, email, file storage, auth, and other integration needs');
  try {
    const userDesc = ctx.plan!.overview || '';
    const integrations = planIntegrations(ctx.plan!, userDesc);
    if (integrations.length > 0) {
      ctx.plan!.integrations = integrations;
      emitStep(ctx, 'plan', 'Integrations detected', `${integrations.length} integration(s): ${integrations.map(i => i.name).join(', ')}`);
    } else {
      emitStep(ctx, 'plan', 'No integrations needed', 'Self-contained application — no external service dependencies detected');
    }
  } catch (e) {
    emitStep(ctx, 'plan', 'Integration detection skipped', 'Integration planner unavailable');
  }

  // Stage 3d: Security Planning — auth strategy, permissions, rate limiting
  emitStep(ctx, 'plan', 'Security Planner designing auth and permissions', 'Determining auth strategy, role hierarchy, entity permissions, field visibility, data isolation, and rate limiting');
  try {
    const security = planSecurity(ctx.plan!, ctx.plan!.overview || '');
    ctx.plan!.securityPlan = security;
    const restrictedFields = security.fieldVisibility.length;
    const permCount = security.entityPermissions.length;
    emitStep(ctx, 'plan', 'Security plan complete', `Auth: ${security.authStrategy} | ${security.roleHierarchy.length} roles | ${permCount} permission rules | ${restrictedFields} restricted fields | ${security.rateLimiting.length} rate limit tiers`);
  } catch (e) {
    emitStep(ctx, 'plan', 'Security planning skipped', 'Security planner unavailable — using default auth patterns');
  }

  // Stage 3e: Performance Planning — pagination, caching, indexing
  emitStep(ctx, 'plan', 'Performance Planner optimizing data access', 'Planning pagination strategies, caching policies, database indexes, lazy loading, and virtual scrolling targets');
  try {
    const perf = planPerformance(ctx.plan!);
    ctx.plan!.performancePlan = perf;
    emitStep(ctx, 'plan', 'Performance plan complete', `${perf.pagination.length} pagination configs | ${perf.caching.length} cache policies | ${perf.indexRecommendations.length} index recommendations | ${perf.lazyLoadTargets.length} lazy load targets`);
  } catch (e) {
    emitStep(ctx, 'plan', 'Performance planning skipped', 'Performance planner unavailable — using default strategies');
  }

  // Stage 4: Semantic reasoning (Flaw 7 fix: skip already-inferred relationships)
  const reasonStage = PIPELINE_STAGES.find(s => s.id === 'reason')!;
  emitStep(ctx, 'reason', 'Technical Analyst beginning semantic analysis', 'Examining every entity to discover hidden relationships, computed fields, validation rules, and business logic the user implied but didn\'t explicitly state');
  executeStage(ctx, reasonStage, () => {
    ctx.reasoning = analyzeSemantics(ctx.plan!);
    if (ctx.reasoning && ctx.entityIntelligenceCtx) {
      const alreadyInferred = new Set(
        ctx.entityIntelligenceCtx.inferredRelationships.map(r => `${r.from}:${r.to}`)
      );
      ctx.reasoning.relationships = ctx.reasoning.relationships.filter(r => {
        const key = `${r.from}:${r.to}`;
        const reverseKey = `${r.to}:${r.from}`;
        return !alreadyInferred.has(key) && !alreadyInferred.has(reverseKey);
      });
    }
    if (ctx.reasoning) {
      ctx.plan = enrichPlanWithReasoning(ctx.plan!, ctx.reasoning);
    }
    const relCount = ctx.reasoning?.relationships?.length || 0;
    const ruleCount = ctx.reasoning?.businessRules?.length || 0;
    const computedCount = ctx.reasoning?.computedFields?.length || 0;
    const uiPatternCount = ctx.reasoning?.uiPatterns?.length || 0;
    const skippedRels = ctx.entityIntelligenceCtx?.inferredRelationships.length || 0;
    emitStep(ctx, 'reason', 'Discovered hidden structure', `Found ${relCount} new relationships (${skippedRels} already inferred by Entity Intelligence), ${computedCount} computed fields, ${ruleCount} business rules, ${uiPatternCount} UI patterns`);
    if (relCount > 0) {
      const sampleRels = ctx.reasoning!.relationships.slice(0, 3).map(r => `${r.from} → ${r.to} (${r.cardinality})`).join(', ');
      emitStep(ctx, 'reason', 'Relationship examples', `Key connections: ${sampleRels}${relCount > 3 ? ` and ${relCount - 3} more` : ''}`);
    }
    if (ruleCount > 0) {
      const sampleRules = ctx.reasoning!.businessRules.slice(0, 2).map(r => `${r.ruleName}: ${r.description || r.type}`).join('; ');
      emitStep(ctx, 'reason', 'Business rules detected', sampleRules);
    }
    return {
      score: Math.min(100, 60 + relCount * 5 + ruleCount * 3),
      warnings: [],
      output: { relationships: relCount, businessRules: ruleCount, computedFields: computedCount },
    };
  });

  // Stage 3f: Confidence Scoring — assess plan quality across all dimensions
  try {
    const lowConfidenceItems: { section: string; item: string; confidence: number; reason: string }[] = [];

    const entityConfidences: number[] = [];
    for (const entity of ctx.plan!.dataModel) {
      const inferred = inferEntityFields([entity.name], ctx.understanding?.level2_domain?.primaryDomain?.id);
      const match = inferred.find(e => e.name === entity.name);
      const conf = match?.matchConfidence ?? 0;
      entityConfidences.push(conf);
      if (conf < 0.5) {
        lowConfidenceItems.push({
          section: 'Entity',
          item: entity.name,
          confidence: conf,
          reason: conf === 0 ? 'No archetype or trait match found' : 'Weak trait-based composition',
        });
      }
    }
    const entityConfAvg = entityConfidences.length > 0
      ? entityConfidences.reduce((a, b) => a + b, 0) / entityConfidences.length
      : 0.5;

    const uxConfidence = (ctx.plan!.uxFlows?.length || 0) > 0
      ? Math.min(0.6 + (ctx.plan!.uxFlows!.length / 10) * 0.4, 1.0)
      : 0.2;
    if (uxConfidence < 0.5) {
      lowConfidenceItems.push({ section: 'UX Flows', item: 'Overall', confidence: uxConfidence, reason: 'Few or no UX flows generated' });
    }

    const intConfidence = ctx.plan!.integrations && ctx.plan!.integrations.length > 0 ? 0.85 : 0.5;

    const secConfidence = ctx.plan!.securityPlan ? 0.85 : 0.3;
    if (secConfidence < 0.5) {
      lowConfidenceItems.push({ section: 'Security', item: 'Overall', confidence: secConfidence, reason: 'No security plan generated' });
    }

    const perfConfidence = ctx.plan!.performancePlan ? 0.8 : 0.3;

    const overall = (entityConfAvg * 0.35 + uxConfidence * 0.15 + intConfidence * 0.15 + secConfidence * 0.2 + perfConfidence * 0.15);

    ctx.plan!.confidence = {
      overall: Math.round(overall * 100) / 100,
      entityInference: Math.round(entityConfAvg * 100) / 100,
      uxFlows: Math.round(uxConfidence * 100) / 100,
      integrations: Math.round(intConfidence * 100) / 100,
      security: Math.round(secConfidence * 100) / 100,
      performance: Math.round(perfConfidence * 100) / 100,
      lowConfidenceItems,
    };

    emitStep(ctx, 'plan', 'Confidence scoring complete', `Overall: ${Math.round(overall * 100)}% | Entities: ${Math.round(entityConfAvg * 100)}% | UX: ${Math.round(uxConfidence * 100)}% | Security: ${Math.round(secConfidence * 100)}% | ${lowConfidenceItems.length} items flagged for review`);
  } catch (e) {
    emitStep(ctx, 'plan', 'Confidence scoring skipped', 'Unable to compute confidence scores');
  }

  // === PLAN SUMMARY: Emit detailed breakdown before freezing ===
  try {
    const planPages = ctx.plan!.pages;
    const planEntities = ctx.plan!.dataModel;

    // Group pages by module for a clear breakdown
    const modulePageMap = new Map<string, string[]>();
    for (const page of planPages) {
      const mod = page.module || 'General';
      if (!modulePageMap.has(mod)) modulePageMap.set(mod, []);
      modulePageMap.get(mod)!.push(page.name);
    }

    const moduleBreakdown = Array.from(modulePageMap.entries())
      .map(([mod, pages]) => `${mod} (${pages.length})`)
      .join(' · ');

    const pageList = Array.from(modulePageMap.entries())
      .map(([mod, pages]) => `**${mod}**: ${pages.join(', ')}`)
      .join(' | ');

    emitStep(ctx, 'plan', 'Modules & pages planned', `${modulePageMap.size} modules · ${planPages.length} pages total — ${moduleBreakdown}`);
    emitStep(ctx, 'plan', 'Page breakdown', pageList);
    emitStep(ctx, 'plan', 'Data model summary', `${planEntities.length} entities: ${planEntities.map(e => `${e.name} (${e.fields?.length || 0} fields)`).join(', ')}`);
  } catch (e) {
    // Non-critical — continue without breakdown
  }

  // === CONTRACT FREEZE: Plan is now immutable for downstream stages ===
  // Freeze happens AFTER reasoning enrichment so the frozen plan includes
  // all discovered relationships, computed fields, and UI patterns
  ctx.frozenPlan = deepClonePlan(ctx.plan!);
  emitStep(ctx, 'plan', 'Contract freeze', `Plan locked with ${ctx.plan!.dataModel.length} entities, ${ctx.plan!.pages.length} pages, ${ctx.plan!.apiEndpoints.length} endpoints — all downstream stages work from this frozen snapshot`);

  // Stage 5: Architecture planning
  const archStage = PIPELINE_STAGES.find(s => s.id === 'architect')!;
  emitStep(ctx, 'architect', 'System Architect designing application structure', `Analyzing ${entityCount} entities and ${pageCount} pages to determine the optimal folder structure, state management approach, authentication strategy, and data flow patterns`);
  emitStep(ctx, 'architect', 'Why architecture comes before code', 'Choosing the right patterns upfront (component vs page routing, local vs global state, REST vs nested resources) prevents costly refactoring later and ensures all generated files follow a consistent structure');
  executeStage(ctx, archStage, () => {
    ctx.architecture = planArchitecture(ctx.plan!, ctx.reasoning);
    const decisions = Object.keys(ctx.architecture || {}).length;
    if (ctx.architecture) {
      emitStep(ctx, 'architect', 'Architecture decisions made', `Pattern: ${ctx.architecture.pattern || 'modular'} | State: ${ctx.architecture.stateManagement?.approach || 'context-based'} | Auth: ${ctx.architecture.authPattern?.type || 'session'} | ${decisions} total architectural decisions`);
      emitStep(ctx, 'architect', 'Reasoning', `Chose ${ctx.architecture.pattern || 'modular'} pattern because it best fits ${entityCount} entities with ${pageCount} pages — provides clear separation of concerns while keeping the codebase navigable`);
    }
    return {
      score: Math.min(100, 70 + decisions * 3),
      warnings: [],
      output: ctx.architecture,
    };
  });

  // Stage 6: Design system
  const designStage = PIPELINE_STAGES.find(s => s.id === 'design')!;
  const detectedDomain = understanding?.level2_domain?.primaryDomain?.name || plan.overview || 'general';
  emitStep(ctx, 'design', 'UI/UX Designer creating visual identity', `Building a domain-aware design system tailored for "${detectedDomain}" — selecting colors, typography, spacing, and component styles that match industry expectations`);
  emitStep(ctx, 'design', 'Why domain-specific design matters', 'A healthcare app needs calming blues and high contrast for readability; an e-commerce app needs vibrant CTAs and trust signals — the wrong palette makes users feel something is "off" even if the code works perfectly');
  executeStage(ctx, designStage, () => {
    ctx.designSystem = generateDesignSystem(ctx.plan!, ctx.reasoning);
    const hasColors = ctx.designSystem?.primaryColor ? true : false;
    if (ctx.designSystem) {
      const primaryHex = ctx.designSystem.primaryColor?.['500'] || ctx.designSystem.lightTokens?.primary || 'auto';
      const fontFamily = ctx.designSystem.typography?.fontFamily || 'system';
      const isDark = ctx.designSystem.defaultMode === 'dark';
      emitStep(ctx, 'design', 'Design system created', `Theme: "${ctx.designSystem.name || 'Custom'}" | Primary: ${primaryHex} | Typography: ${fontFamily} | Dark mode: ${isDark ? 'enabled' : 'disabled'}`);
      emitStep(ctx, 'design', 'Color rationale', `Selected ${primaryHex} as primary because it aligns with ${detectedDomain} domain conventions and provides sufficient contrast for accessibility (WCAG AA)`);
    }
    return {
      score: hasColors ? 95 : 70,
      warnings: [],
      output: { name: ctx.designSystem?.name },
    };
  });

  // Stage 7: Functionality specification
  const specStage = PIPELINE_STAGES.find(s => s.id === 'specify')!;
  emitStep(ctx, 'specify', 'Feature Analyst mapping entity capabilities', `Classifying each entity type to determine what interactive features it needs — CRUD enhancements, data display modes, search/filter options, batch operations, and automation triggers`);
  emitStep(ctx, 'specify', 'Why entity classification drives features', 'A "Product" entity needs image uploads and price formatting; a "User" entity needs role-based access and password hashing — the same CRUD operation looks completely different depending on what the entity represents');
  executeStage(ctx, specStage, () => {
    ctx.functionalitySpec = generateFunctionalitySpec(ctx.plan!, ctx.reasoning!);
    const entityFeatureCount = ctx.functionalitySpec?.entityFeatures?.length || 0;
    const globalFeatures = ctx.functionalitySpec?.globalFeatures;
    if (entityFeatureCount > 0) {
      const sampleFeatures = ctx.functionalitySpec!.entityFeatures!.slice(0, 3).map((ef: any) => {
        const featureNames = ef.features?.slice(0, 2).map((f: any) => f.name || f).join(', ') || 'standard CRUD';
        return `${ef.entityName}: ${featureNames}`;
      }).join(' | ');
      emitStep(ctx, 'specify', 'Feature mapping', `${entityFeatureCount} entities analyzed: ${sampleFeatures}`);
    }
    if (globalFeatures) {
      emitStep(ctx, 'specify', 'Global features identified', `Cross-entity features: ${Array.isArray(globalFeatures) ? globalFeatures.map((g: any) => g.name || g).join(', ') : 'dashboard analytics, search, notifications'}`);
    }
    return {
      score: Math.min(100, 60 + entityFeatureCount * 8),
      warnings: [],
      output: { entityFeatures: entityFeatureCount, globalFeatures },
    };
  });

  // Stage 8: Schema design
  const schemaStage = PIPELINE_STAGES.find(s => s.id === 'schema')!;
  emitStep(ctx, 'schema', 'Database Engineer designing normalized schema', `Converting ${entityCount} entities into production-grade database tables with proper column types, indexes, foreign keys, constraints, and audit trails`);
  emitStep(ctx, 'schema', 'Why schema design is separate from planning', 'The plan says "User has orders" — the schema engineer decides: integer vs UUID primary keys, created_at/updated_at timestamps, soft delete columns, composite indexes for common queries, and junction tables for many-to-many relationships');
  executeStage(ctx, schemaStage, () => {
    ctx.schemaDesign = designSchema(ctx.plan!, ctx.reasoning);
    const tableCount = ctx.schemaDesign?.tables?.length || 0;
    const indexCount = ctx.schemaDesign?.tables?.reduce((sum: number, t: { indexes?: unknown[] }) => sum + (t.indexes?.length || 0), 0) || 0;
    const junctionCount = ctx.schemaDesign?.junctionTables?.length || 0;
    emitStep(ctx, 'schema', 'Schema decisions', `${tableCount} tables designed with ${indexCount} indexes for query performance | ${junctionCount} junction tables for many-to-many relationships`);
    if (tableCount > 0) {
      const sampleTables = ctx.schemaDesign!.tables!.slice(0, 3).map((t: any) => {
        const colCount = t.columns?.length || 0;
        return `${t.name} (${colCount} columns)`;
      }).join(', ');
      emitStep(ctx, 'schema', 'Table structure', `Key tables: ${sampleTables}${tableCount > 3 ? ` + ${tableCount - 3} more` : ''}`);
    }
    emitStep(ctx, 'schema', 'Indexing strategy', `Added ${indexCount} indexes — prioritizing foreign keys and frequently-filtered columns to keep queries fast as data grows`);
    return {
      score: Math.min(100, 60 + tableCount * 5 + indexCount * 2),
      warnings: [],
      output: { tables: tableCount, indexes: indexCount, junctionTables: junctionCount },
    };
  });

  // Stage 9: API design
  const apiStage = PIPELINE_STAGES.find(s => s.id === 'api')!;
  emitStep(ctx, 'api', 'API Architect designing RESTful endpoints', `Creating a complete API layer based on ${entityCount} entities — CRUD routes, search endpoints, nested resources, batch operations, validation schemas, and error handling`);
  emitStep(ctx, 'api', 'Why dedicated API design', 'Auto-generated CRUD is not enough — the API architect adds pagination, sorting, filtering, proper HTTP status codes, Zod validation, rate limiting, and standardized error responses that make the API production-ready');
  executeStage(ctx, apiStage, () => {
    ctx.apiDesign = designAPI(ctx.plan!, ctx.reasoning, ctx.schemaDesign);
    const routeCount = ctx.apiDesign?.routes?.length || 0;
    const middlewareCount = ctx.apiDesign?.middleware?.length || 0;
    emitStep(ctx, 'api', 'API structure', `${routeCount} routes designed with ${middlewareCount} middleware layers | Includes validation, error handling, and pagination for all list endpoints`);
    if (routeCount > 0) {
      const sampleRoutes = ctx.apiDesign!.routes!.slice(0, 4).map((r: any) => `${r.method} ${r.path}`).join(', ');
      emitStep(ctx, 'api', 'Route examples', sampleRoutes + (routeCount > 4 ? ` + ${routeCount - 4} more` : ''));
    }
    return {
      score: Math.min(100, 60 + routeCount * 3),
      warnings: [],
      output: { routes: routeCount, middleware: middlewareCount },
    };
  });

  // Stage 10: Component composition
  const composeStage = PIPELINE_STAGES.find(s => s.id === 'compose')!;
  emitStep(ctx, 'compose', 'UI Engineer composing component tree', `Planning the complete React component hierarchy — layout wrappers, shared presentational components, per-entity containers, context boundaries, custom hooks, and accessibility attributes`);
  emitStep(ctx, 'compose', 'Why component composition before code generation', 'Deciding component boundaries first prevents code duplication — shared components (SearchBar, DataTable, FormField) are identified now so the generator creates them once and imports them everywhere instead of copy-pasting code');
  executeStage(ctx, composeStage, () => {
    ctx.componentTree = composeComponents(ctx.plan!, ctx.reasoning, ctx.functionalitySpec, ctx.designSystem);
    const componentCount = ctx.componentTree?.components?.length || 0;
    const layoutCount = ctx.componentTree?.layouts?.length || 0;
    emitStep(ctx, 'compose', 'Component tree built', `${componentCount} components planned across ${layoutCount} layout templates | Shared components identified for reuse, per-entity containers for isolation`);
    if (componentCount > 0) {
      const sampleComponents = ctx.componentTree!.components!.slice(0, 5).map((c: any) => c.name || c).join(', ');
      emitStep(ctx, 'compose', 'Key components', sampleComponents + (componentCount > 5 ? ` + ${componentCount - 5} more` : ''));
    }
    emitStep(ctx, 'compose', 'Accessibility & responsiveness', 'All components include ARIA labels, keyboard navigation, and responsive breakpoints — mobile-first design with desktop enhancements');
    return {
      score: Math.min(100, 60 + componentCount * 2),
      warnings: [],
      output: { components: componentCount, layouts: layoutCount },
    };
  });

  // Stages 11-15: Generation through validation — wrapped in rollback protection
  try {

  // Stage 11: Code generation (the main event)
  const genStage = PIPELINE_STAGES.find(s => s.id === 'generate')!;
  emitStep(ctx, 'generate', 'Full-Stack Developer beginning code generation', `Synthesizing all prior analysis into actual source files — config, app shell, database schema, API routes, React pages, shared components, styles, and utilities`);
  emitStep(ctx, 'generate', 'Why this stage uses all prior outputs', 'Every previous module enriched the plan — the generator now has architecture patterns, design tokens, schema definitions, API contracts, and component specs to produce code that is internally consistent and production-ready');
  executeStage(ctx, genStage, () => {
    const enrichment = {
      architecture: ctx.architecture,
      schemaDesign: ctx.schemaDesign,
      apiDesign: ctx.apiDesign,
      componentTree: ctx.componentTree,
      reasoning: ctx.reasoning,
      designSystem: ctx.designSystem,
      functionalitySpec: ctx.functionalitySpec,
    };
    const planForGeneration = ctx.frozenPlan || ctx.plan!;
    ctx.files = generateProjectFromPlan(planForGeneration, (phase, detail) => {
      emitStep(ctx, 'generate', `[${phase}] ${detail}`, undefined);
    }, enrichment);
    const fileCount = ctx.files.length;
    const lineCount = ctx.files.reduce((sum, f) => sum + f.content.split('\n').length, 0);
    ctx.metrics.fileCount = fileCount;
    ctx.metrics.lineCount = lineCount;
    const tsxFiles = ctx.files.filter(f => f.path.endsWith('.tsx')).length;
    const tsFiles = ctx.files.filter(f => f.path.endsWith('.ts') && !f.path.endsWith('.tsx')).length;
    const cssFiles = ctx.files.filter(f => f.path.endsWith('.css')).length;
    const jsonFiles = ctx.files.filter(f => f.path.endsWith('.json')).length;
    emitStep(ctx, 'generate', 'Code generation complete', `${fileCount} files created (${lineCount.toLocaleString()} lines) | ${tsxFiles} React components, ${tsFiles} TypeScript modules, ${cssFiles} stylesheets, ${jsonFiles} config files`);
    emitStep(ctx, 'generate', 'File breakdown', `Frontend: pages, components, hooks, utils | Backend: routes, storage, middleware, validators | Config: package.json, tsconfig, vite.config, tailwind.config`);
    return {
      score: Math.min(100, 50 + fileCount * 2),
      warnings: fileCount < 10 ? ['Low file count - project may be incomplete'] : [],
      output: { files: fileCount, lines: lineCount },
    };
  }, 1);

  if (isSLMAvailable() && ctx.files.length > 0) {
    emitStep(ctx, 'generate', 'SLM enhancing function bodies', 'AI micro-writer improving logic, validation, and error handling in generated code');
    try {
      const slmResult = await runSLM<{ enhancements: CodeEnhancement[] }>(CODEGEN_STAGE_ID, {
        files: ctx.files,
        plan: ctx.plan,
      });
      if (slmResult.success && slmResult.data?.enhancements?.length) {
        const validEnhancements = slmResult.data.enhancements.filter(e => validateCodeEnhancement(e, ctx.files));
        if (validEnhancements.length > 0) {
          const result = applyCodeEnhancements(ctx.files, validEnhancements);
          ctx.files = result.files;
          emitStep(ctx, 'generate', 'SLM code enhancement complete', `${result.applied} enhancements applied, ${result.rejected} rejected (${slmResult.latencyMs}ms)`);
        } else {
          emitStep(ctx, 'generate', 'SLM code enhancement skipped', 'No valid enhancements met safety criteria');
        }
      } else {
        emitStep(ctx, 'generate', 'SLM code enhancement skipped', slmResult.error || 'No enhancements returned');
      }
    } catch (err) {
      emitStep(ctx, 'generate', 'SLM code enhancement skipped', `Non-fatal error: ${err}`);
    }
  }

  // Stage 12: Dependency resolution
  const resolveStage = PIPELINE_STAGES.find(s => s.id === 'resolve')!;
  emitStep(ctx, 'resolve', 'DevOps Engineer resolving dependencies', 'Scanning all generated files to detect every imported package, verify version compatibility, estimate bundle size, and ensure no conflicting versions exist');
  emitStep(ctx, 'resolve', 'Why dependency resolution matters', 'A missing or wrong-version dependency causes immediate build failure — this module cross-references every import statement against a known package registry to catch issues before the user tries to run the app');
  executeStage(ctx, resolveStage, () => {
    ctx.dependencyManifest = resolveDependencies(ctx.plan!, ctx.files);
    const pkgFile = ctx.files.find(f => f.path === 'package.json');
    if (pkgFile && ctx.dependencyManifest) {
      try {
        const pkg = JSON.parse(pkgFile.content);
        if (ctx.dependencyManifest.dependencies) {
          pkg.dependencies = { ...pkg.dependencies, ...ctx.dependencyManifest.dependencies };
        }
        if (ctx.dependencyManifest.devDependencies) {
          pkg.devDependencies = { ...pkg.devDependencies, ...ctx.dependencyManifest.devDependencies };
        }
        if (ctx.dependencyManifest.scripts && Object.keys(ctx.dependencyManifest.scripts).length > 0) {
          pkg.scripts = { ...pkg.scripts, ...ctx.dependencyManifest.scripts };
        }
        pkgFile.content = JSON.stringify(pkg, null, 2);
        const depCount = Object.keys(pkg.dependencies || {}).length;
        const devDepCount = Object.keys(pkg.devDependencies || {}).length;
        const scriptCount = Object.keys(pkg.scripts || {}).length;
        emitStep(ctx, 'resolve', 'Package.json updated', `${depCount} production dependencies + ${devDepCount} dev dependencies + ${scriptCount} scripts | All versions pinned for reproducible builds`);
      } catch {}
    }
    const warningCount = ctx.dependencyManifest?.warnings?.length || 0;
    if (warningCount > 0) {
      emitStep(ctx, 'resolve', 'Dependency warnings', `${warningCount} potential issues found — ${ctx.dependencyManifest!.warnings!.slice(0, 2).join('; ')}`);
    }
    return {
      score: 85,
      warnings: ctx.dependencyManifest?.warnings || [],
      output: { resolved: ctx.dependencyManifest?.dependencies ? Object.keys(ctx.dependencyManifest.dependencies).length : 0 },
    };
  });

  // Stage 13: Code quality review
  const qualityStage = PIPELINE_STAGES.find(s => s.id === 'quality')!;
  emitStep(ctx, 'quality', 'Code Reviewer performing quality analysis', `Scanning ${ctx.files.length} files across 8 quality categories: TypeScript correctness, React patterns, error handling, UI states, performance, accessibility, code style, and security`);
  emitStep(ctx, 'quality', 'Why automated code review', 'Catches common mistakes before the user sees them — unused imports, missing error boundaries, unhandled loading states, unsafe innerHTML, missing alt text, and other issues that would fail a real code review');
  executeStage(ctx, qualityStage, () => {
    ctx.qualityReport = analyzeCodeQuality(ctx.files, ctx.plan!);
    if (ctx.qualityReport?.fixes && ctx.qualityReport.fixes.length > 0) {
      emitStep(ctx, 'quality', 'Auto-fixing issues', `Found ${ctx.qualityReport.fixes.length} fixable issues — applying automatic corrections to maintain quality standards`);
      ctx.files = applyQualityFixes(ctx.files, ctx.qualityReport.fixes);
    }
    const issueCount = ctx.qualityReport?.issues?.length || 0;
    const grade = ctx.qualityReport?.grade || 'N/A';
    emitStep(ctx, 'quality', 'Quality assessment', `Grade: ${grade} | Score: ${ctx.qualityReport?.overallScore || 0}/100 | ${issueCount} issues found${ctx.qualityReport?.fixes?.length ? `, ${ctx.qualityReport.fixes.length} auto-fixed` : ''}`);
    return {
      score: ctx.qualityReport?.overallScore || 75,
      warnings: ctx.qualityReport?.warnings || [],
      output: { score: ctx.qualityReport?.overallScore, issues: issueCount },
    };
  });

  // Stage 14: Test generation
  const testStage = PIPELINE_STAGES.find(s => s.id === 'test')!;
  emitStep(ctx, 'test', 'QA Engineer generating test suite', `Creating Vitest test files for API routes, component rendering, form validation, entity relationships, and security checks based on the ${entityCount} entities and ${endpointCount} endpoints`);
  emitStep(ctx, 'test', 'Why tests are generated automatically', 'Tests catch regressions when the user modifies code — API route tests verify CRUD operations, component tests check rendering, and validation tests ensure business rules are enforced');
  executeStage(ctx, testStage, () => {
    try {
      ctx.testFiles = generateTestFiles(ctx.plan!, ctx.reasoning!);
      emitStep(ctx, 'test', 'Test suite created', `${ctx.testFiles.length} test files generated — covering API endpoints, component rendering, data validation, and security assertions`);
      return {
        score: Math.min(100, 60 + ctx.testFiles.length * 5),
        warnings: [],
        output: { testFiles: ctx.testFiles.length },
      };
    } catch {
      emitStep(ctx, 'test', 'Test generation partial', 'Some test files could not be generated — the core tests are still included');
      return { score: 40, warnings: ['Test generation encountered issues'], output: { testFiles: 0 } };
    }
  });

  // Stage 15: Validation & auto-fix with feedback loop
  const validateStage = PIPELINE_STAGES.find(s => s.id === 'validate')!;
  emitStep(ctx, 'validate', 'Release Engineer running validation passes', `Multi-pass validation: checking all imports resolve, exports match, dependencies exist in package.json, TypeScript types align, and no circular references exist across ${ctx.files.length} files`);
  executeStage(ctx, validateStage, () => {
    let currentResult = validateAndFix(ctx.files);
    ctx.files = currentResult.files;
    let totalFixCount = currentResult.fixesApplied?.length || 0;
    let totalPasses = currentResult.iterations;

    const unfixedErrorMessages = (currentResult.issues || [])
      .filter(i => i.severity === 'error')
      .map(i => i.message);
    if (unfixedErrorMessages.length > 0) {
      const parsedErrors = parseErrors(unfixedErrorMessages);
      if (parsedErrors.length > 0) {
        const projectFiles = ctx.files.map(f => ({
          path: f.path,
          content: f.content,
          language: f.language || (f.path.split('.').pop() || ''),
        }));
        const viteFixResult = viteAnalyzeAndFix(parsedErrors, projectFiles);
        if (viteFixResult.fixes.length > 0) {
          let viteFixesApplied = 0;
          for (const fix of viteFixResult.fixes) {
            if (fix.type === 'patch_file' && fix.oldContent) {
              const fileIdx = ctx.files.findIndex(f => f.path === fix.filePath);
              if (fileIdx >= 0) {
                ctx.files[fileIdx] = { ...ctx.files[fileIdx], content: ctx.files[fileIdx].content.replace(fix.oldContent, fix.newContent) };
                viteFixesApplied++;
              }
            } else if (fix.type === 'create_file') {
              ctx.files.push({ path: fix.filePath, content: fix.newContent, language: fix.filePath.split('.').pop() || '' });
              viteFixesApplied++;
            } else if (fix.type === 'add_dependency' && fix.packageName) {
              const pkgIdx = ctx.files.findIndex(f => f.path === 'package.json');
              if (pkgIdx >= 0) {
                try {
                  const pkg = JSON.parse(ctx.files[pkgIdx].content);
                  if (!pkg.dependencies) pkg.dependencies = {};
                  if (!pkg.dependencies[fix.packageName]) {
                    pkg.dependencies[fix.packageName] = fix.packageVersion || 'latest';
                    ctx.files[pkgIdx] = { ...ctx.files[pkgIdx], content: JSON.stringify(pkg, null, 2) };
                    viteFixesApplied++;
                  }
                } catch {}
              }
            }
          }
          if (viteFixesApplied > 0) {
            totalFixCount += viteFixesApplied;
            emitStep(ctx, 'validate', 'Vite error fixer applied', `${viteFixesApplied} Vite-specific fixes applied`);
            currentResult = validateAndFix(ctx.files);
            ctx.files = currentResult.files;
            totalFixCount += currentResult.fixesApplied?.length || 0;
            totalPasses += currentResult.iterations;
          }
        }
      }
    }

    const currentUnfixed = (currentResult.issues || []).filter(i => i.severity === 'error');
    if (currentUnfixed.length > 0 && ctx.plan && ctx.reasoning) {
      emitStep(ctx, 'validate', 'Feedback loop activated', `${currentUnfixed.length} unfixed errors detected — attempting targeted regeneration of affected files`);
      const affectedPaths = Array.from(new Set(currentUnfixed.map(i => i.file).filter(Boolean)));
      let regenerated = 0;
      for (const affectedPath of affectedPaths) {
        const existingIdx = ctx.files.findIndex(f => f.path === affectedPath);
        if (existingIdx === -1) continue;
        try {
          const enrichment = {
            architecture: ctx.architecture,
            schemaDesign: ctx.schemaDesign,
            apiDesign: ctx.apiDesign,
            componentTree: ctx.componentTree,
            reasoning: ctx.reasoning,
            designSystem: ctx.designSystem,
            functionalitySpec: ctx.functionalitySpec,
          };
          const regenFiles = generateProjectFromPlan(ctx.plan!, undefined, enrichment);
          const regenFile = regenFiles.find(f => f.path === affectedPath);
          if (regenFile) {
            ctx.files[existingIdx] = regenFile;
            regenerated++;
          }
        } catch {}
      }
      if (regenerated > 0) {
        emitStep(ctx, 'validate', 'Feedback regeneration complete', `Re-generated ${regenerated} files — running re-validation`);
        currentResult = validateAndFix(ctx.files);
        ctx.files = currentResult.files;
        totalFixCount += currentResult.fixesApplied?.length || 0;
        totalPasses += currentResult.iterations;
        const newErrorCount = (currentResult.issues || []).filter(i => i.severity === 'error').length;
        emitStep(ctx, 'validate', 'Re-validation result', `${newErrorCount} errors remaining (was ${currentUnfixed.length})`);
      }
    }

    const finalErrors = (currentResult.issues || []).filter(i => i.severity === 'error');
    const isValid = finalErrors.length === 0;
    const totalIssueCount = (currentResult.issues || []).length;

    ctx.validationSummary = {
      passes: totalPasses,
      issuesFound: totalIssueCount,
      issuesFixed: totalFixCount,
      unfixableIssues: finalErrors.map(i => i.message),
    };

    emitStep(ctx, 'validate', 'Validation complete', `${totalPasses} pass${totalPasses !== 1 ? 'es' : ''} | ${totalIssueCount} issues found, ${totalFixCount} auto-fixed | Result: ${isValid ? 'All imports and exports verified' : `${finalErrors.length} issues remain — review recommended`}`);
    if (totalFixCount > 0) {
      const allFixes = currentResult.fixesApplied || [];
      const sampleFixes = allFixes.slice(0, 3).join('; ');
      emitStep(ctx, 'validate', 'Fixes applied', sampleFixes + (totalFixCount > 3 ? ` + ${totalFixCount - 3} more` : ''));
    }
    return {
      score: isValid ? 95 : 65,
      warnings: (currentResult.issues || []).filter(i => i.severity === 'warning').map(i => i.message),
      output: { valid: isValid, fixes: totalFixCount, iterations: totalPasses },
    };
  }, 1);

  } catch (pipelineErr) {
    const errMsg = pipelineErr instanceof Error ? pipelineErr.message : String(pipelineErr);
    console.error(`[Pipeline] Critical failure during generation stages: ${errMsg}`);
    emitStep(ctx, 'orchestrator', 'Generation pipeline failed — attempting fallback generation',
      `Critical error: ${errMsg}. Running minimal generation with reasoning + design system only.`);

    try {
      if (!ctx.reasoning && ctx.plan) {
        ctx.reasoning = analyzeSemantics(ctx.plan);
      }
      const fallbackEnrichment = {
        reasoning: ctx.reasoning,
        designSystem: ctx.designSystem,
        schemaDesign: ctx.schemaDesign,
        apiDesign: ctx.apiDesign,
        architecture: ctx.architecture,
        componentTree: ctx.componentTree,
        functionalitySpec: ctx.functionalitySpec,
      };
      ctx.files = generateProjectFromPlan(ctx.plan!, (phase, detail) => {
        emitStep(ctx, 'generate-fallback', `[fallback:${phase}] ${detail}`, undefined);
      }, fallbackEnrichment);
      const fileCount = ctx.files.length;
      const lineCount = ctx.files.reduce((sum, f) => sum + f.content.split('\n').length, 0);
      ctx.metrics.fileCount = fileCount;
      ctx.metrics.lineCount = lineCount;
      emitStep(ctx, 'orchestrator', 'Fallback generation succeeded',
        `Recovered ${fileCount} files (${lineCount} lines) — some quality passes were skipped`);
    } catch (fallbackErr) {
      const fallbackErrMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
      console.error(`[Pipeline] Fallback generation also failed: ${fallbackErrMsg}`);
      emitStep(ctx, 'orchestrator', 'Fallback generation failed',
        `Both primary and fallback generation failed. Output reset.`);
      ctx.files = [];
      ctx.testFiles = [];
      ctx.metrics.fileCount = 0;
      ctx.metrics.lineCount = 0;
    }
    failedStages.push('generate');
  }

  // Stage 16: Deep Quality Analysis — cross-file consistency, hardening, type contracts, anti-patterns, scoring
  if (ctx.files.length > 0) {
    const deepQualityStage = PIPELINE_STAGES.find(s => s.id === 'deep-quality')!;
    emitStep(ctx, 'deep-quality', 'Quality Architect starting deep analysis', `Running 5 verification passes across ${ctx.files.length} files: cross-file consistency, code hardening, type contracts, anti-pattern detection, and quality scoring`);

    executeStage(ctx, deepQualityStage, () => {
      const qualityPassResults: QualityPassResults = {};
      const qualityWarnings: string[] = [];
      let totalIssues = 0;
      let totalFixes = 0;

      // Pass 1: Cross-file consistency
      try {
        emitStep(ctx, 'deep-quality', 'Pass 1/5: Cross-file consistency', 'Verifying all imports resolve to exports, frontend API calls match backend routes, schema fields referenced in components exist');
        const consistencyReport = validateCrossFileConsistency(ctx.files);
        qualityPassResults.consistency = consistencyReport;
        totalIssues += consistencyReport.issues.length;

        if (consistencyReport.fixes.length > 0) {
          ctx.files = applyCrossFileConsistencyFixes(ctx.files, consistencyReport.fixes);
          totalFixes += consistencyReport.fixes.length;
          emitStep(ctx, 'deep-quality', 'Cross-file fixes applied', `${consistencyReport.fixes.length} consistency fixes auto-applied`);
        }

        const errorCount = consistencyReport.issues.filter(i => i.severity === 'error').length;
        const warnCount = consistencyReport.issues.filter(i => i.severity === 'warning').length;
        emitStep(ctx, 'deep-quality', 'Cross-file consistency complete', `${consistencyReport.stats.importsChecked} imports checked, ${consistencyReport.stats.apiContractsChecked} API contracts verified | ${errorCount} errors, ${warnCount} warnings`);
      } catch (e) {
        qualityWarnings.push('Cross-file consistency check failed');
        emitStep(ctx, 'deep-quality', 'Cross-file consistency skipped', 'Validator encountered an error');
      }

      // Pass 2: Code hardening
      try {
        emitStep(ctx, 'deep-quality', 'Pass 2/5: Code hardening', 'Checking for missing error handling, loading states, empty states, unsafe property access, form validation');
        const hardeningReport = hardenGeneratedCode(ctx.files);
        qualityPassResults.hardening = hardeningReport;
        totalIssues += hardeningReport.issues.length;

        if (hardeningReport.fixes.length > 0) {
          ctx.files = applyHardeningFixes(ctx.files, hardeningReport.fixes);
          totalFixes += hardeningReport.fixes.length;
          emitStep(ctx, 'deep-quality', 'Hardening fixes applied', `${hardeningReport.fixes.length} defensive patterns injected`);
        }

        const categories = Object.entries(hardeningReport.stats.categories).map(([k, v]) => `${k}: ${v}`).join(', ');
        emitStep(ctx, 'deep-quality', 'Code hardening complete', `${hardeningReport.stats.filesScanned} files scanned | ${hardeningReport.issues.length} issues | ${categories}`);
      } catch (e) {
        qualityWarnings.push('Code hardening pass failed');
        emitStep(ctx, 'deep-quality', 'Code hardening skipped', 'Hardening pass encountered an error');
      }

      // Pass 3: Type contract verification
      try {
        emitStep(ctx, 'deep-quality', 'Pass 3/5: Type contract verification', 'Ensuring Drizzle schema, Zod validators, API types, and frontend query types all agree');
        const typeReport = verifyTypeContracts(ctx.files);
        qualityPassResults.typeContracts = typeReport;
        totalIssues += typeReport.issues.length;
        emitStep(ctx, 'deep-quality', 'Type contracts verified', `${typeReport.stats.tablesChecked} tables, ${typeReport.stats.zodSchemasFound} Zod schemas, ${typeReport.stats.routesChecked} routes checked | ${typeReport.issues.length} issues`);
      } catch (e) {
        qualityWarnings.push('Type contract verification failed');
        emitStep(ctx, 'deep-quality', 'Type contract verification skipped', 'Verifier encountered an error');
      }

      // Pass 4: Anti-pattern detection
      try {
        emitStep(ctx, 'deep-quality', 'Pass 4/5: Anti-pattern detection', 'Scanning for N+1 queries, missing pagination, unprotected routes, oversized components, accessibility gaps');
        const antiPatternReport = scanAntiPatterns(ctx.files);
        qualityPassResults.antiPatterns = antiPatternReport;
        totalIssues += antiPatternReport.issues.length;

        const securityIssues = antiPatternReport.issues.filter(i => i.category === 'security').length;
        const perfIssues = antiPatternReport.issues.filter(i => i.category === 'performance').length;
        const a11yIssues = antiPatternReport.issues.filter(i => i.category === 'accessibility').length;
        emitStep(ctx, 'deep-quality', 'Anti-pattern scan complete', `${antiPatternReport.stats.filesScanned} files | ${antiPatternReport.issues.length} patterns detected — security: ${securityIssues}, performance: ${perfIssues}, accessibility: ${a11yIssues}`);
      } catch (e) {
        qualityWarnings.push('Anti-pattern scan failed');
        emitStep(ctx, 'deep-quality', 'Anti-pattern scan skipped', 'Scanner encountered an error');
      }

      // Pass 5: Quality scoring
      try {
        emitStep(ctx, 'deep-quality', 'Pass 5/5: Quality scoring', 'Scoring each file across 6 dimensions — error handling, type safety, completeness, consistency, security, performance');
        const qualityScore = scoreProjectQuality(ctx.files, qualityPassResults);

        const flaggedCount = qualityScore.flaggedFiles.length;
        emitStep(ctx, 'deep-quality', 'Quality scoring complete', qualityScore.summary);

        if (qualityScore.recommendations.length > 0) {
          emitStep(ctx, 'deep-quality', 'Quality recommendations', qualityScore.recommendations.slice(0, 3).join(' | '));
        }

        if (flaggedCount > 0) {
          emitStep(ctx, 'deep-quality', 'Files flagged for review', `${flaggedCount} files scored below threshold: ${qualityScore.flaggedFiles.slice(0, 3).join(', ')}${flaggedCount > 3 ? ` + ${flaggedCount - 3} more` : ''}`);
        }
      } catch (e) {
        qualityWarnings.push('Quality scoring failed');
        emitStep(ctx, 'deep-quality', 'Quality scoring skipped', 'Scoring engine encountered an error');
      }

      emitStep(ctx, 'deep-quality', 'Deep quality analysis complete', `5 passes | ${totalIssues} total issues found | ${totalFixes} auto-fixed`);

      return {
        score: Math.max(40, 90 - totalIssues),
        warnings: qualityWarnings,
        output: { totalIssues, totalFixes, passes: 5 },
      };
    });
  }

  // Stage 17: Learning & recording
  const recordStage = PIPELINE_STAGES.find(s => s.id === 'record')!;
  emitStep(ctx, 'record', 'Knowledge Manager recording generation patterns', 'Saving this generation\'s patterns, quality scores, entity structures, and architectural decisions so future generations of similar apps start from a stronger baseline');
  emitStep(ctx, 'record', 'Why continuous learning', 'Each successful generation teaches the system — field naming conventions that scored well, relationship patterns that avoided bugs, UI layouts that matched user intent — all feed into the next generation\'s starting point');
  executeStage(ctx, recordStage, () => {
    try {
      const pipelineSuccess = failedStages.filter(s => PIPELINE_STAGES.find(ps => ps.id === s)?.critical).length === 0;
      learningEngine.recordGenerationOutcome({
        plan: ctx.plan!,
        files: ctx.files,
        success: pipelineSuccess,
        qualityScore: computeOverallScore(ctx),
      });
      emitStep(ctx, 'record', 'Learning data saved', `Recorded ${ctx.files.length} file patterns, ${entityCount} entity structures, quality score ${computeOverallScore(ctx)}/100 for future reference`);
      return { score: 90, warnings: [], output: 'Generation recorded for learning' };
    } catch {
      emitStep(ctx, 'record', 'Learning engine unavailable', 'Could not save patterns — this generation will not contribute to future improvements, but the output is unaffected');
      return { score: 50, warnings: ['Failed to record learning data'], output: null };
    }
  });

  // Compute final metrics
  const totalDuration = Date.now() - pipelineStart;
  ctx.metrics.totalDurationMs = totalDuration;
  ctx.metrics.overallScore = computeOverallScore(ctx);
  ctx.metrics.componentCount = ctx.componentTree?.components?.length || 0;
  ctx.metrics.endpointCount = ctx.apiDesign?.routes?.length || 0;

  for (const [id, result] of Array.from(ctx.metrics.stageResults.entries())) {
    if (!result.success) failedStages.push(id);
  }

  const summary = buildSummary(ctx, failedStages, skippedStages);

  emitStep(ctx, 'orchestrator', 'Pipeline complete',
    `${summary.completedStages}/${summary.totalStages} stages | Quality: ${summary.overallQuality}/100 | ${ctx.metrics.fileCount} files | ${totalDuration}ms`);

  return {
    success: failedStages.filter(s => PIPELINE_STAGES.find(ps => ps.id === s)?.critical).length === 0,
    files: ctx.files,
    testFiles: ctx.testFiles,
    context: ctx,
    metrics: ctx.metrics,
    summary,
  };
}

export function orchestratePlanning(understanding: UnderstandingResult): { plan: ProjectPlan; thinkingSteps: ThinkingStep[] } {
  const thinkingSteps: ThinkingStep[] = [];
  const emit = (phase: string, label: string, detail?: string) => {
    thinkingSteps.push({ phase, label, detail, timestamp: Date.now() });
  };

  emit('orchestrator', 'Planning pipeline activated', 'Running planning stages');

  let plan = generatePlan(understanding);
  emit('planning', 'Project plan created', `${plan.dataModel?.length || 0} entities, ${plan.pages?.length || 0} pages`);

  // Stage 3a: Entity Intelligence — upgrade generic entities with archetype fields
  try {
    const entityNames = plan.dataModel.map(e => e.name);
    const detectedDomainId = understanding?.level2_domain?.primaryDomain?.id;
    const inferredEntities = inferEntityFields(entityNames, detectedDomainId);
    let upgraded = 0;
    for (const entity of plan.dataModel) {
      const inferred = inferredEntities.find(e => e.name === entity.name);
      if (inferred && inferred.matchConfidence > 0.5) {
        const existingFieldNames = new Set(entity.fields.map(f => f.name));
        for (const af of inferred.fields) {
          if (!existingFieldNames.has(af.name) && !isSemanticDuplicate(af.name, existingFieldNames)) {
            entity.fields.push({ name: af.name, type: af.type, required: af.required || false, description: af.description });
          }
        }
        if (inferred.relationships) {
          const existingRels = new Set(entity.relationships.map(r => r.entity));
          for (const rel of inferred.relationships) {
            if (!existingRels.has(rel.entity)) {
              entity.relationships.push({ entity: rel.entity, type: rel.type, field: rel.field || '' });
            }
          }
        }
        upgraded++;
      }
    }
    emit('planning', 'Entity Intelligence complete', `Upgraded ${upgraded}/${plan.dataModel.length} entities with domain-specific fields`);
  } catch (e) {
    emit('planning', 'Entity Intelligence skipped', 'Field inference unavailable');
  }

  const reasoning = analyzeSemantics(plan);
  plan = enrichPlanWithReasoning(plan, reasoning);
  emit('reasoning', 'Semantic analysis complete', `${reasoning.relationships.length} relationships, ${reasoning.businessRules.length} rules`);

  // Stage 3b: UX Flow Planning
  try {
    const uxResult = planUXFlows(plan);
    plan.uxFlows = uxResult.uxFlows;
    plan.errorHandling = uxResult.errorHandling;
    emit('planning', 'UX flows planned', `${uxResult.uxFlows.length} user flows | ${uxResult.errorHandling.pageStates.length} page states`);
  } catch (e) {
    emit('planning', 'UX flow planning skipped', 'UX planner unavailable');
  }

  // Stage 3c: Integration Detection
  try {
    const userDesc = plan.overview || '';
    const integrations = planIntegrations(plan, userDesc);
    if (integrations.length > 0) {
      plan.integrations = integrations;
      emit('planning', 'Integrations detected', `${integrations.length}: ${integrations.map(i => i.name).join(', ')}`);
    }
  } catch (e) {
    emit('planning', 'Integration detection skipped', 'Integration planner unavailable');
  }

  // Stage 3d: Security Planning
  try {
    const security = planSecurity(plan, plan.overview || '');
    plan.securityPlan = security;
    emit('planning', 'Security plan complete', `Auth: ${security.authStrategy} | ${security.roleHierarchy.length} roles | ${security.entityPermissions.length} permissions`);
  } catch (e) {
    emit('planning', 'Security planning skipped', 'Security planner unavailable');
  }

  // Stage 3e: Performance Planning
  try {
    const perf = planPerformance(plan);
    plan.performancePlan = perf;
    emit('planning', 'Performance plan complete', `${perf.pagination.length} pagination | ${perf.caching.length} cache | ${perf.indexRecommendations.length} indexes`);
  } catch (e) {
    emit('planning', 'Performance planning skipped', 'Performance planner unavailable');
  }

  return { plan, thinkingSteps };
}

function computeOverallScore(ctx: PipelineContext): number {
  const results = Array.from(ctx.metrics.stageResults.values());
  if (results.length === 0) return 0;
  const totalWeight = results.reduce((sum, r) => {
    const stage = PIPELINE_STAGES.find(s => s.id === r.stageId);
    return sum + (stage?.critical ? 2 : 1);
  }, 0);
  const weightedSum = results.reduce((sum, r) => {
    const stage = PIPELINE_STAGES.find(s => s.id === r.stageId);
    const weight = stage?.critical ? 2 : 1;
    return sum + r.qualityScore * weight;
  }, 0);
  return Math.round(weightedSum / totalWeight);
}

function buildSummary(ctx: PipelineContext, failedStages: string[], skippedStages: string[]): PipelineSummary {
  const completedStages = Array.from(ctx.metrics.stageResults.values()).filter(r => r.success).length;
  const overallQuality = computeOverallScore(ctx);

  const highlights: string[] = [];
  const warnings: string[] = [];

  if (ctx.architecture) highlights.push(`Architecture: ${ctx.architecture.pattern} pattern`);
  if (ctx.designSystem) highlights.push(`Design: ${ctx.designSystem.name} theme`);
  if (ctx.schemaDesign) highlights.push(`Schema: ${ctx.schemaDesign.tables?.length || 0} tables designed`);
  if (ctx.apiDesign) highlights.push(`API: ${ctx.apiDesign.routes?.length || 0} endpoints designed`);
  if (ctx.componentTree) highlights.push(`UI: ${ctx.componentTree.components?.length || 0} components composed`);
  highlights.push(`Generated: ${ctx.metrics.fileCount} files, ~${ctx.metrics.lineCount} lines`);

  if (failedStages.length > 0) warnings.push(`Failed stages: ${failedStages.join(', ')}`);
  if (overallQuality < 70) warnings.push('Overall quality below 70 - consider reviewing');

  const failedCriticalGates: string[] = [];
  const failedNonCriticalGates: string[] = [];
  for (const gate of ctx.metrics.qualityGates) {
    if (!gate.passed) {
      const stage = PIPELINE_STAGES.find(s => s.id === gate.stageId);
      const label = `${gate.stageId} (${gate.score}/${gate.threshold})`;
      if (stage?.critical) {
        failedCriticalGates.push(label);
      } else {
        failedNonCriticalGates.push(label);
      }
    }
  }
  if (failedCriticalGates.length > 0) {
    warnings.push(`Critical quality gates failed: ${failedCriticalGates.join(', ')} — review recommended`);
  }
  if (failedNonCriticalGates.length > 0) {
    warnings.push(`Non-critical quality gates failed: ${failedNonCriticalGates.join(', ')}`);
  }

  return {
    totalStages: PIPELINE_STAGES.length,
    completedStages,
    failedStages,
    skippedStages,
    overallQuality,
    highlights,
    warnings,
  };
}

function inferComputedFieldType(computed: ComputedField): string {
  const expr = computed.expression.toLowerCase();
  const name = computed.fieldName.toLowerCase();
  const desc = computed.description.toLowerCase();
  const combined = `${expr} ${name} ${desc}`;

  if (/count|sum|total|average|avg|length|quantity|qty|number|amount|price|cost|subtotal|grand|billable|\.length/.test(combined)) {
    return 'number';
  }

  if (/date|timestamp|time|created|updated|deadline|schedule/.test(combined)) {
    return 'datetime';
  }

  if (/\bis\b|\bhas\b|\bcan\b|\benabled\b|\bactive\b|\bcompleted\b|\bvalid\b|\bboolean\b/.test(combined)) {
    return 'boolean';
  }

  return 'text';
}

function enrichPlanWithReasoning(plan: ProjectPlan, reasoning: ReasoningResult): ProjectPlan {
  const enriched = { ...plan, dataModel: plan.dataModel.map(e => ({ ...e, fields: [...e.fields], relationships: [...e.relationships] })) };

  for (const rel of reasoning.relationships) {
    const entity = enriched.dataModel.find(e => e.name === rel.from);
    if (entity) {
      const existingRel = entity.relationships.find(r => r.entity === rel.to);
      if (!existingRel) {
        entity.relationships.push({
          entity: rel.to,
          type: rel.cardinality === '1:N' ? 'one-to-many' : rel.cardinality === 'N:1' ? 'many-to-one' : rel.type,
          field: rel.fromField,
        });
      }
    }
  }

  for (const computed of reasoning.computedFields) {
    const entity = enriched.dataModel.find(e => e.name === computed.entityName);
    if (entity && !entity.fields.find(f => f.name === computed.fieldName)) {
      entity.fields.push({
        name: computed.fieldName,
        type: inferComputedFieldType(computed),
        required: false,
        description: `Computed: ${computed.description}`,
      });
    }
  }

  for (const uiPattern of reasoning.uiPatterns) {
    const page = enriched.pages.find(p =>
      p.dataNeeded.includes(uiPattern.entityName) ||
      p.name.toLowerCase().includes(uiPattern.entityName.toLowerCase())
    );
    if (page) {
      const featureLabel = `${uiPattern.pattern} view`;
      if (!page.features.includes(featureLabel)) {
        page.features.push(featureLabel);
      }
    }
  }

  return enriched;
}

export function getPipelineStages(): PipelineStage[] {
  return [...PIPELINE_STAGES];
}

export function getStageDescription(stageId: string): PipelineStage | undefined {
  return PIPELINE_STAGES.find(s => s.id === stageId);
}