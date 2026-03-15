import { localAI } from './local-ai-engine.js';
import { templateRegistry } from './template-registry.js';
import {
  analyzeConstraints,
  analyzeFeatureInteractions,
  generateDatabaseIntelligence,
  mapComponents,
  optimizeDependencies,
  runStaticAudit,
} from './deterministic-stages.js';
import {
  interpretIntent,
  createStrategicPlan,
  buildSemanticDomainModel,
  synthesizeArchitecture,
  generateAdaptiveUX,
} from './knowledge-stages.js';
import {
  designAPISpec,
  synthesizeCode,
  generateTests,
  simulateRuntime,
} from './generation-stages.js';
import { learningBrain } from './learning-stage.js';
import { generateProjectFromPlan } from './plan-driven-generator.js';
import { analyzeSemantics } from './contextual-reasoning-engine.js';
import { inferEntityFields, isSemanticDuplicate } from './entity-field-inference.js';
import type { ProjectPlan } from './plan-generator.js';
import type { ConstraintAnalysis } from './deterministic-stages.js';
import type { IntentInterpretation, StrategicPlan, SemanticDomainModel, ArchitectureSynthesis, AdaptiveUXResult } from './knowledge-stages.js';
import type { APISpec, CodeOutput, TestSuite, SimulationResult } from './generation-stages.js';
import type { LearningOutcome } from './learning-stage.js';

function bridgeToPlan(
  resolvedEntities: any[],
  domainModel: SemanticDomainModel | null,
  strategicPlan: StrategicPlan | null,
  userRequest: string
): ProjectPlan {
  const dataModel = resolvedEntities.map(e => ({
    name: e.name || e.entityName,
    fields: (e.fields || []).map((f: any) => ({
      name: f.name,
      type: f.type || 'text',
      required: f.required || false,
      description: f.description || '',
    })),
    relationships: (e.relationships || []).map((r: any) => ({
      entity: r.entity || r.target,
      type: r.type || 'one-to-many',
      field: r.field || '',
    })),
  }));

  const entityNames = dataModel.map(e => e.name);
  const fallbackDomainId = domainModel?.domain || strategicPlan?.projectType?.toLowerCase().replace(/[^a-z]/g, '') || undefined;
  try {
    const inferred = inferEntityFields(entityNames, fallbackDomainId);
    for (const entity of dataModel) {
      const match = inferred.find(i => i.name === entity.name);
      if (match && match.matchConfidence > 0.5) {
        const existingFieldNames = new Set(entity.fields.map((f: any) => f.name));
        for (const f of match.fields) {
          if (!existingFieldNames.has(f.name) && !isSemanticDuplicate(f.name, existingFieldNames)) {
            entity.fields.push({
              name: f.name,
              type: f.type,
              required: f.required || false,
              description: f.description || '',
            });
          }
        }
      }
    }
  } catch {}

  const pages = (strategicPlan?.mvpScope?.pages || entityNames.map(n => `${n} List`)).map((p: string) => ({
    name: p,
    componentName: p.replace(/\s+/g, ''),
    route: `/${p.toLowerCase().replace(/\s+/g, '-')}`,
    layout: 'default' as const,
    entities: entityNames,
    features: ['list', 'create', 'edit', 'delete'],
    description: `Page for ${p}`,
  }));

  const apiEndpoints = dataModel.flatMap(e => {
    const slug = e.name.toLowerCase().replace(/([A-Z])/g, '-$1').replace(/^-/, '');
    return [
      { method: 'GET' as const, path: `/api/${slug}s`, description: `List ${e.name}s`, entity: e.name },
      { method: 'GET' as const, path: `/api/${slug}s/:id`, description: `Get ${e.name}`, entity: e.name },
      { method: 'POST' as const, path: `/api/${slug}s`, description: `Create ${e.name}`, entity: e.name },
      { method: 'PUT' as const, path: `/api/${slug}s/:id`, description: `Update ${e.name}`, entity: e.name },
      { method: 'DELETE' as const, path: `/api/${slug}s/:id`, description: `Delete ${e.name}`, entity: e.name },
    ];
  });

  return {
    projectName: strategicPlan?.projectType || 'Generated App',
    overview: userRequest,
    techStack: { frontend: 'React + TypeScript + Tailwind', backend: 'Express + Drizzle', database: 'PostgreSQL' },
    dataModel,
    pages,
    apiEndpoints,
    features: strategicPlan?.mvpScope?.features || [],
    roles: [],
  };
}

function inferFieldType(fieldName: string): string {
  const n = fieldName.toLowerCase();
  if (n === 'email') return 'email';
  if (n === 'password') return 'password';
  if (n === 'phone') return 'phone';
  if (n.includes('url') || n.includes('image') || n.includes('avatar') || n.includes('photo')) return 'text';
  if (n.includes('price') || n.includes('amount') || n.includes('cost') || n.includes('total') || n.includes('salary') || n.includes('fee')) return 'integer';
  if (n.includes('quantity') || n.includes('count') || n.includes('stock') || n.includes('rating') || n.includes('priority') || n.includes('order') || n.includes('capacity')) return 'integer';
  if (n.includes('date') || n.includes('time') || n === 'duedate' || n === 'startdate' || n === 'enddate') return 'timestamp';
  if (n.includes('active') || n.includes('published') || n.includes('verified') || n.includes('completed') || n.includes('enabled')) return 'boolean';
  if (n.includes('latitude') || n.includes('longitude') || n.includes('weight') || n.includes('percentage')) return 'real';
  if (n.endsWith('id') && n !== 'id') return 'integer';
  return 'text';
}

export interface LocalPipelineResult {
  success: boolean;
  stages: LocalStageResult[];
  plan: Record<string, any>;
  totalDurationMs: number;
  overallScore: number;
  files: Array<{ path: string; content: string; language: string }>;
  testFiles: Array<{ path: string; content: string }>;
  summary: PipelineSummary;
}

export interface LocalStageResult {
  stageNumber: number;
  stageName: string;
  role: string;
  success: boolean;
  durationMs: number;
  score: number;
  output: any;
  warnings: string[];
  errors: string[];
}

export interface PipelineSummary {
  totalStages: number;
  completedStages: number;
  failedStages: string[];
  overallQuality: number;
  highlights: string[];
  warnings: string[];
  metrics: {
    fileCount: number;
    lineCount: number;
    testCount: number;
    entityCount: number;
    routeCount: number;
    componentCount: number;
  };
}

const STAGE_DEFINITIONS = [
  { number: 1, name: 'Intent Interpreter', role: 'Product Manager', type: 'knowledge' },
  { number: 2, name: 'Strategic Planner', role: 'Project Manager', type: 'knowledge' },
  { number: 3, name: 'Constraint Analyzer', role: 'Senior Advisor', type: 'deterministic' },
  { number: 4, name: 'Semantic Domain Modeler', role: 'Technical Analyst', type: 'knowledge' },
  { number: 5, name: 'Architecture Synthesizer', role: 'System Architect', type: 'knowledge' },
  { number: 6, name: 'Adaptive UX Designer', role: 'UI/UX Designer', type: 'knowledge' },
  { number: 7, name: 'Feature Interaction Graph', role: 'Feature Analyst', type: 'deterministic' },
  { number: 8, name: 'Database Intelligence', role: 'Database Engineer', type: 'deterministic' },
  { number: 9, name: 'API Designer', role: 'API Architect', type: 'generation' },
  { number: 10, name: 'Component Mapper', role: 'UI Engineer', type: 'deterministic' },
  { number: 11, name: 'Code Synthesizer', role: 'Full-Stack Developer', type: 'generation' },
  { number: 12, name: 'Dependency Optimizer', role: 'DevOps Engineer', type: 'deterministic' },
  { number: 13, name: 'Static Auditor', role: 'Code Reviewer', type: 'deterministic' },
  { number: 14, name: 'Test Generator', role: 'QA Engineer', type: 'generation' },
  { number: 15, name: 'Runtime Simulator', role: 'Release Engineer', type: 'generation' },
  { number: 16, name: 'Learning Brain', role: 'Knowledge Manager', type: 'learning' },
];

export type StageCallback = (stage: number, name: string, status: string, detail?: string) => void;

export async function runLocalPipeline(
  userRequest: string,
  entities?: any[],
  relationships?: any[],
  features?: any[],
  onStage?: StageCallback
): Promise<LocalPipelineResult> {
  const pipelineStart = Date.now();
  const stages: LocalStageResult[] = [];
  const pipelineId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  let intentResult: IntentInterpretation | null = null;
  let strategicPlan: StrategicPlan | null = null;
  let constraintAnalysis: ConstraintAnalysis | null = null;
  let domainModel: SemanticDomainModel | null = null;
  let architecture: ArchitectureSynthesis | null = null;
  let uxDesign: AdaptiveUXResult | null = null;
  let apiSpec: APISpec | null = null;
  let codeOutput: CodeOutput | null = null;
  let testSuite: TestSuite | null = null;
  let simulation: SimulationResult | null = null;

  const resolvedEntities = entities || [];
  const resolvedRelationships = relationships || [];
  const resolvedFeatures = features || [];

  const emit = (stageNum: number, status: string, detail?: string) => {
    const def = STAGE_DEFINITIONS[stageNum - 1];
    if (onStage && def) onStage(stageNum, def.name, status, detail);
  };

  const runStage = async (stageNum: number, executor: () => Promise<{ score: number; output: any; warnings?: string[] }>) => {
    const def = STAGE_DEFINITIONS[stageNum - 1];
    const start = Date.now();
    emit(stageNum, 'running', `${def.role} starting...`);

    try {
      const result = await executor();
      const duration = Date.now() - start;
      emit(stageNum, 'complete', `Score: ${result.score}/100 in ${duration}ms`);

      stages.push({
        stageNumber: stageNum,
        stageName: def.name,
        role: def.role,
        success: true,
        durationMs: duration,
        score: result.score,
        output: result.output,
        warnings: result.warnings || [],
        errors: [],
      });
      return result;
    } catch (err) {
      const duration = Date.now() - start;
      const errorMsg = err instanceof Error ? err.message : String(err);
      emit(stageNum, 'failed', errorMsg);

      stages.push({
        stageNumber: stageNum,
        stageName: def.name,
        role: def.role,
        success: false,
        durationMs: duration,
        score: 0,
        output: null,
        warnings: [],
        errors: [errorMsg],
      });
      return { score: 0, output: null, warnings: [errorMsg] };
    }
  };

  await runStage(1, async () => {
    intentResult = await interpretIntent(userRequest);
    return {
      score: Math.round(intentResult.confidence * 100),
      output: {
        entities: intentResult.intent.entities.length,
        domain: intentResult.intent.domain?.name,
        archetype: intentResult.archetypeMatch?.name,
        confidence: intentResult.confidence,
      },
      warnings: intentResult.clarificationNeeded ? ['Low confidence - clarification may be needed'] : [],
    };
  });

  const ACTION_WORDS = new Set(['build', 'create', 'make', 'develop', 'design', 'implement', 'add', 'setup', 'deploy', 'configure', 'manage', 'track', 'generate', 'run', 'start', 'launch', 'test', 'check', 'get', 'set', 'update', 'delete', 'edit', 'remove', 'find', 'search', 'filter', 'sort', 'view', 'show', 'display', 'list', 'process', 'handle', 'send', 'receive', 'upload', 'download', 'export', 'import', 'connect', 'integrate', 'online', 'system', 'platform', 'application', 'app', 'website', 'site', 'page', 'feature', 'tool', 'service', 'with', 'using', 'based', 'powered', 'full', 'complete', 'simple', 'basic', 'advanced', 'custom', 'modern']);

  if (intentResult && intentResult.intent.entities.length > 0 && resolvedEntities.length === 0) {
    for (const e of intentResult.intent.entities) {
      if (ACTION_WORDS.has(e.name.toLowerCase())) continue;

      const inferredFields = e.fields || [];
      const structuredFields: any[] = [];

      if (Array.isArray(inferredFields) && inferredFields.length > 0) {
        for (const f of inferredFields) {
          const fieldName = typeof f === 'string' ? f : (f.name || 'field');
          if (fieldName === 'id' || fieldName === 'createdAt' || fieldName === 'created_at') continue;
          const fieldType = typeof f === 'object' && f.type ? f.type : inferFieldType(fieldName);
          structuredFields.push({
            name: fieldName,
            type: fieldType,
            required: fieldName === 'name' || fieldName === 'title' || fieldName === 'email',
          });
        }
      }

      if (structuredFields.length === 0) {
        structuredFields.push({ name: 'name', type: 'text', required: true });
        structuredFields.push({ name: 'description', type: 'text', required: false });
        structuredFields.push({ name: 'status', type: 'text', required: false });
      }

      resolvedEntities.push({ name: e.name, fields: structuredFields, entityName: e.name });
    }
  }

  await runStage(2, async () => {
    strategicPlan = await createStrategicPlan(
      intentResult!.intent,
      intentResult!.archetypeMatch,
      resolvedEntities
    );
    return {
      score: Math.min(100, 60 + resolvedEntities.length * 5 + (strategicPlan.saasPatterns.length * 3)),
      output: {
        projectType: strategicPlan.projectType,
        mvpEntities: strategicPlan.mvpScope.entities.length,
        phases: strategicPlan.phases.length,
        saasPatterns: strategicPlan.saasPatterns.length,
      },
    };
  });

  await runStage(3, async () => {
    constraintAnalysis = analyzeConstraints(resolvedEntities, resolvedFeatures);
    return {
      score: Math.max(0, 100 - constraintAnalysis.riskScore),
      output: {
        constraints: constraintAnalysis.constraints.length,
        satisfied: constraintAnalysis.satisfiedCount,
        violations: constraintAnalysis.violationCount,
        risk: constraintAnalysis.riskScore,
      },
      warnings: constraintAnalysis.recommendations,
    };
  });

  await runStage(4, async () => {
    domainModel = await buildSemanticDomainModel(intentResult!.intent, resolvedEntities);
    return {
      score: Math.min(100, 60 + domainModel.entities.length * 5 + domainModel.relationships.length * 3),
      output: {
        domain: domainModel.domain.name,
        entities: domainModel.entities.length,
        relationships: domainModel.relationships.length,
        workflows: domainModel.workflows.length,
      },
    };
  });

  await runStage(5, async () => {
    architecture = await synthesizeArchitecture(
      intentResult!.intent,
      resolvedEntities,
      constraintAnalysis
    );
    return {
      score: Math.min(100, 70 + architecture.patterns.length * 5),
      output: {
        pattern: architecture.decision.pattern,
        patterns: architecture.patterns.length,
        constraints: architecture.constraints.length,
        tradeoffs: architecture.tradeoffs.length,
      },
    };
  });

  await runStage(6, async () => {
    uxDesign = await generateAdaptiveUX(intentResult!.intent, resolvedEntities, intentResult!.archetypeMatch);
    return {
      score: 85,
      output: {
        layout: uxDesign.layout.type,
        navigation: uxDesign.navigation.type,
        userType: uxDesign.userType,
        interactions: uxDesign.interactions.length,
      },
    };
  });

  await runStage(7, async () => {
    const result = analyzeFeatureInteractions(resolvedEntities, resolvedRelationships);
    return {
      score: result.cycles.length === 0 ? 95 : Math.max(50, 95 - result.cycles.length * 10),
      output: {
        nodes: result.graph.nodes.size,
        edges: result.graph.edges.length,
        cycles: result.cycles.length,
        conflicts: result.conflicts.length,
        buildOrder: result.buildOrder.length,
      },
      warnings: result.riskAreas,
    };
  });

  await runStage(8, async () => {
    const dbIntel = generateDatabaseIntelligence(resolvedEntities, resolvedRelationships);
    return {
      score: Math.min(100, 60 + dbIntel.tables.length * 5 + dbIntel.indexes.length * 2),
      output: {
        tables: dbIntel.tables.length,
        indexes: dbIntel.indexes.length,
        relationships: dbIntel.relationships.length,
        migrations: dbIntel.migrations.length,
        estimatedSize: dbIntel.estimatedSize,
      },
      warnings: dbIntel.optimizations,
    };
  });

  await runStage(9, async () => {
    apiSpec = designAPISpec(resolvedEntities, resolvedRelationships, resolvedFeatures);
    return {
      score: Math.min(100, 60 + apiSpec.routes.length * 3),
      output: {
        routes: apiSpec.routes.length,
        middleware: apiSpec.middleware.length,
        validationSchemas: Object.keys(apiSpec.validationSchemas).length,
      },
    };
  });

  await runStage(10, async () => {
    const componentMap = mapComponents(resolvedEntities, strategicPlan?.mvpScope?.pages?.map(p => ({ name: p })) || [], uxDesign);
    return {
      score: Math.min(100, 60 + componentMap.components.length * 2),
      output: {
        components: componentMap.components.length,
        shared: componentMap.sharedComponents.length,
        renderCost: componentMap.renderCostEstimate,
      },
      warnings: componentMap.optimizations,
    };
  });

  await runStage(11, async () => {
    codeOutput = synthesizeCode(resolvedEntities, apiSpec!, uxDesign?.colorScheme, architecture?.decision);

    try {
      const bridgedPlan = bridgeToPlan(resolvedEntities, domainModel, strategicPlan, userRequest);
      const reasoning = analyzeSemantics(bridgedPlan);
      const unifiedFiles = generateProjectFromPlan(bridgedPlan, undefined, {
        reasoning,
      });
      const unifiedHasSchema = unifiedFiles.some(f => f.path.includes('schema'));
      const unifiedHasRoutes = unifiedFiles.some(f => f.path.includes('routes'));
      const unifiedQuality = (unifiedHasSchema ? 1 : 0) + (unifiedHasRoutes ? 1 : 0) + (unifiedFiles.length >= 5 ? 1 : 0);
      if (unifiedQuality >= 2 || unifiedFiles.length > codeOutput.totalFiles) {
        codeOutput = {
          ...codeOutput,
          files: unifiedFiles.map(f => ({ path: f.path, content: f.content, language: f.language || 'typescript' })),
          totalFiles: unifiedFiles.length,
          totalLines: unifiedFiles.reduce((sum, f) => sum + f.content.split('\n').length, 0),
        };
        emit(11, 'unified', `Upgraded to main orchestrator output: ${unifiedFiles.length} files (quality score: ${unifiedQuality}/3)`);
      }
    } catch (unifyErr) {
      emit(11, 'info', `Using local code synthesis (unified bridge unavailable)`);
    }

    return {
      score: Math.min(100, 50 + codeOutput.totalFiles * 3),
      output: {
        files: codeOutput.totalFiles,
        lines: codeOutput.totalLines,
        entryPoint: codeOutput.entryPoint,
      },
    };
  });

  await runStage(12, async () => {
    const depAnalysis = optimizeDependencies(codeOutput?.files || []);
    return {
      score: 85 - depAnalysis.duplicates.length * 5,
      output: {
        dependencies: depAnalysis.dependencies.length,
        devDependencies: depAnalysis.devDependencies.length,
        bundleSize: `${depAnalysis.totalBundleSize}KB`,
        treeShakenSize: `${depAnalysis.treeShakenSize}KB`,
        duplicates: depAnalysis.duplicates.length,
        alternatives: depAnalysis.alternatives.length,
      },
      warnings: depAnalysis.duplicates.concat(depAnalysis.securityFlags),
    };
  });

  await runStage(13, async () => {
    const audit = runStaticAudit(codeOutput?.files || []);
    return {
      score: audit.score,
      output: {
        grade: audit.grade,
        score: audit.score,
        issues: audit.issues.length,
        autoFixes: audit.fixes.length,
        categories: audit.categories.map(c => `${c.name}: ${c.score}/${c.maxScore}`),
      },
      warnings: audit.issues.filter(i => i.severity === 'warning').map(i => `${i.file}: ${i.message}`),
    };
  });

  await runStage(14, async () => {
    testSuite = generateTests(resolvedEntities, apiSpec!, codeOutput?.files || []);
    return {
      score: Math.min(100, 50 + testSuite.testCount * 5),
      output: {
        testFiles: testSuite.files.length,
        testCount: testSuite.testCount,
        coverage: testSuite.coverage,
      },
    };
  });

  await runStage(15, async () => {
    simulation = simulateRuntime(resolvedEntities, apiSpec!, codeOutput?.files || []);
    return {
      score: Math.round(simulation.passRate),
      output: {
        flows: simulation.flows.length,
        errors: simulation.errors.length,
        passRate: `${simulation.passRate}%`,
        performance: simulation.performance,
      },
      warnings: simulation.errors.map(e => `${e.location}: ${e.message}`),
    };
  });

  await runStage(16, async () => {
    const stageScores: Record<string, number> = {};
    for (const s of stages) {
      stageScores[s.stageName] = s.score;
    }

    const outcome: LearningOutcome = {
      pipelineId,
      projectType: strategicPlan?.projectType || 'unknown',
      domain: domainModel?.domain?.name || 'general',
      entities: resolvedEntities.map(e => e.name || e.entityName || 'unknown'),
      qualityScore: computeOverallScore(stages),
      stageScores,
      patterns: extractPatterns(domainModel, architecture, uxDesign),
      errorPatterns: extractErrors(stages),
      timestamp: Date.now(),
    };

    await learningBrain.recordOutcome(outcome);
    const stats = await learningBrain.getStats();
    const templateStats = templateRegistry.getStats();

    return {
      score: 90,
      output: {
        recorded: true,
        totalOutcomes: stats.totalOutcomes,
        avgQuality: stats.averageQuality,
        trend: stats.improvementTrend,
        templateLibrary: templateStats,
      },
    };
  });

  const totalDuration = Date.now() - pipelineStart;
  const overallScore = computeOverallScore(stages);
  const failedStages = stages.filter(s => !s.success).map(s => s.stageName);
  const allWarnings = stages.flatMap(s => s.warnings);

  const files = codeOutput?.files?.map(f => ({
    path: f.path,
    content: f.content,
    language: f.language,
  })) || [];

  const testFiles = testSuite?.files?.map(f => ({
    path: f.path,
    content: f.content,
  })) || [];

  const plan = assemblePlan(
    intentResult, strategicPlan, domainModel, architecture,
    uxDesign, apiSpec, resolvedEntities, resolvedRelationships,
    resolvedFeatures, constraintAnalysis, codeOutput, testSuite, simulation
  );

  return {
    success: failedStages.length === 0,
    stages,
    plan,
    totalDurationMs: totalDuration,
    overallScore,
    files,
    testFiles,
    summary: {
      totalStages: STAGE_DEFINITIONS.length,
      completedStages: stages.filter(s => s.success).length,
      failedStages,
      overallQuality: overallScore,
      highlights: buildHighlights(stages, codeOutput, testSuite),
      warnings: allWarnings.slice(0, 10),
      metrics: {
        fileCount: codeOutput?.totalFiles || 0,
        lineCount: codeOutput?.totalLines || 0,
        testCount: testSuite?.testCount || 0,
        entityCount: resolvedEntities.length,
        routeCount: apiSpec?.routes?.length || 0,
        componentCount: stages.find(s => s.stageNumber === 10)?.output?.components || 0,
      },
    },
  };
}

function computeOverallScore(stages: LocalStageResult[]): number {
  if (stages.length === 0) return 0;
  const weights = [2, 2, 1, 2, 2, 1, 1, 2, 2, 1, 3, 1, 1, 1, 1, 1];
  let weightedSum = 0;
  let totalWeight = 0;
  for (let i = 0; i < stages.length; i++) {
    const w = weights[i] || 1;
    weightedSum += stages[i].score * w;
    totalWeight += w;
  }
  return Math.round(weightedSum / totalWeight);
}

function buildHighlights(stages: LocalStageResult[], code: CodeOutput | null, tests: TestSuite | null): string[] {
  const highlights: string[] = [];
  const completed = stages.filter(s => s.success).length;
  highlights.push(`${completed}/${stages.length} stages completed successfully`);
  if (code) highlights.push(`Generated ${code.totalFiles} files with ${code.totalLines} lines of code`);
  if (tests) highlights.push(`${tests.testCount} tests across ${tests.files.length} test files`);

  const topStage = stages.reduce((best, s) => s.score > best.score ? s : best, stages[0]);
  if (topStage) highlights.push(`Best stage: ${topStage.stageName} (${topStage.score}/100)`);

  return highlights;
}

function extractPatterns(
  domain: SemanticDomainModel | null,
  arch: ArchitectureSynthesis | null,
  ux: AdaptiveUXResult | null
): Array<{ category: string; key: string; value: any; confidence: number; sourceProject: string }> {
  const patterns: Array<{ category: string; key: string; value: any; confidence: number; sourceProject: string }> = [];

  if (domain) {
    for (const entity of domain.entities) {
      patterns.push({
        category: 'entity-structure',
        key: entity.name,
        value: { type: entity.type, fieldCount: entity.fields.length, behaviors: entity.behaviors },
        confidence: 0.8,
        sourceProject: domain.domain.name || 'unknown',
      });
    }
  }

  if (arch) {
    for (const pattern of arch.patterns) {
      patterns.push({
        category: 'tech-choice',
        key: pattern.category,
        value: { chosen: pattern.chosen, reason: pattern.reason },
        confidence: 0.9,
        sourceProject: 'architecture',
      });
    }
  }

  if (ux) {
    patterns.push({
      category: 'ui-layout',
      key: ux.layout.type,
      value: { navigation: ux.navigation.type, userType: ux.userType },
      confidence: 0.7,
      sourceProject: 'ux-design',
    });
  }

  return patterns;
}

function extractErrors(stages: LocalStageResult[]): Array<{ stage: string; errorType: string; message: string; fix: string; frequency: number }> {
  const errors: Array<{ stage: string; errorType: string; message: string; fix: string; frequency: number }> = [];
  for (const stage of stages) {
    for (const err of stage.errors) {
      errors.push({
        stage: stage.stageName,
        errorType: 'stage-failure',
        message: err,
        fix: 'Review stage input data',
        frequency: 1,
      });
    }
  }
  return errors;
}

function assemblePlan(
  intent: IntentInterpretation | null,
  strategic: StrategicPlan | null,
  domain: SemanticDomainModel | null,
  arch: ArchitectureSynthesis | null,
  ux: AdaptiveUXResult | null,
  api: APISpec | null,
  entities: any[],
  relationships: any[],
  features: any[],
  constraints: ConstraintAnalysis | null,
  code: CodeOutput | null,
  tests: TestSuite | null,
  simulation: SimulationResult | null
): Record<string, any> {
  return {
    projectName: strategic?.projectType || intent?.archetypeMatch?.name || 'Generated Project',
    domain: domain?.domain?.name || intent?.intent?.domain?.name || 'general',
    archetype: intent?.archetypeMatch?.name || 'Custom App',
    confidence: intent?.confidence || 0,
    entities: (domain?.entities || []).map(e => ({
      name: e.name,
      type: e.type,
      fields: e.fields,
      behaviors: e.behaviors,
    })),
    relationships: (domain?.relationships || relationships || []).map((r: any) => ({
      from: r.from,
      to: r.to,
      type: r.type,
      cardinality: r.cardinality,
    })),
    workflows: (domain?.workflows || []).map((w: any) => ({
      name: w.name,
      steps: w.steps,
      trigger: w.trigger,
    })),
    architecture: arch ? {
      pattern: arch.decision?.pattern,
      patterns: arch.patterns,
      constraints: arch.constraints,
      tradeoffs: arch.tradeoffs,
    } : null,
    ux: ux ? {
      layout: ux.layout,
      navigation: ux.navigation,
      userType: ux.userType,
      colorScheme: ux.colorScheme,
      interactions: ux.interactions,
    } : null,
    api: api ? {
      routes: api.routes.map(r => ({
        method: r.method,
        path: r.path,
        handler: r.handler,
        description: r.description,
      })),
      middleware: api.middleware,
    } : null,
    mvpScope: strategic?.mvpScope || null,
    phases: strategic?.phases || [],
    constraints: constraints ? {
      total: constraints.constraints.length,
      satisfied: constraints.satisfiedCount,
      violations: constraints.violationCount,
      risk: constraints.riskScore,
    } : null,
    codeStats: code ? {
      totalFiles: code.totalFiles,
      totalLines: code.totalLines,
      entryPoint: code.entryPoint,
    } : null,
    testStats: tests ? {
      testCount: tests.testCount,
      coverage: tests.coverage,
      fileCount: tests.files.length,
    } : null,
    simulation: simulation ? {
      passRate: simulation.passRate,
      flowCount: simulation.flows.length,
      errorCount: simulation.errors.length,
    } : null,
  };
}

export { STAGE_DEFINITIONS };