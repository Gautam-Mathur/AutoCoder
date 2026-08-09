import { prisma } from '../../db';
import { CorrelationResolver } from './correlationResolver';

export interface ConflictData {
  description: string;
  recommendedOption: string;
  options: string[];
}

export interface ContextPack {
  projectName: string;
  techStack: string[];
  features: any[];
  constraints: string[];
  resolvedContext: Record<string, any>;
  conflicts: ConflictData[];
}

function safeParseJson(val: any): any {
  if (val === null || val === undefined) return null;
  if (typeof val !== 'string') return val;
  try {
    return JSON.parse(val);
  } catch {
    return val;
  }
}

function getPathValue(obj: any, path: string): { found: boolean; value: any } {
  if (obj === null || obj === undefined) return { found: false, value: undefined };
  if (!path) return { found: true, value: obj };

  // Normalize path notation (e.g., features[0].id -> features.0.id)
  const normalizedPath = path.replace(/\[(\d+)\]/g, '.$1');
  const parts = normalizedPath.split('.');

  let curr = obj;
  for (const part of parts) {
    if (curr !== null && typeof curr === 'object' && part in curr) {
      curr = curr[part];
    } else {
      return { found: false, value: undefined };
    }
  }

  return { found: true, value: curr };
}

/**
 * ContextResolver - Schema-driven, addressable context extraction.
 * Invariant: Agent -> Context Resolver -> Correlation -> Stage Output.
 */
export class ContextResolver {
  /**
   * Resolves exact schema paths for an agent from authoritative stage outputs via Correlation.
   * Throws an explicit error if a requested field path does not exist (FAIL CLEARLY).
   */
  static async resolveExactPaths(conversationId: string, requests: { fromAgent: string; select: string[] }[]): Promise<Record<string, any>> {
    const result: Record<string, any> = {};

    for (const req of requests) {
      const { fromAgent, select } = req;
      const correlation = await CorrelationResolver.getAuthoritativeCorrelation(conversationId, fromAgent);

      if (!correlation) {
        // Fallback check: If stage hasn't run yet, return empty/null for optional reads
        result[fromAgent] = null;
        continue;
      }

      // Fetch the full stage output row from the appropriate table
      const stageData = await ContextResolver.fetchStageOutputRecord(fromAgent, correlation.stageOutputId);
      if (!stageData) {
        result[fromAgent] = null;
        continue;
      }

      const agentData: Record<string, any> = {};

      for (const rawPath of select) {
        const { found, value } = getPathValue(stageData, rawPath);
        if (!found || value === undefined) {
          agentData[rawPath] = null;
        } else {
          agentData[rawPath] = value;
        }
      }

      result[fromAgent] = agentData;
    }

    return result;
  }

  private static async fetchStageOutputRecord(agentName: string, stageOutputId: string): Promise<Record<string, any> | null> {
    switch (agentName) {
      case 'Queen': {
        const row = await prisma.queenStageOutput.findUnique({ where: { id: stageOutputId } });
        if (!row) return null;
        return {
          projectName: row.projectName,
          problemStatement: row.problemStatement,
          projectDescription: row.projectDescription,
          projectGoal: row.goal,
          mvpScope: {
            included: safeParseJson(row.mvpIncludedScope),
            excluded: safeParseJson(row.mvpExcludedScope),
          },
          constraints: {
            technical: safeParseJson(row.technicalConstraints),
            business: safeParseJson(row.businessConstraints),
            platform: safeParseJson(row.platformConstraints),
            legal: safeParseJson(row.legalConstraints),
            other: safeParseJson(row.otherConstraints),
            budget: row.budget,
            timeline: row.timeline,
          },
          assumptions: safeParseJson(row.assumptions),
          risks: safeParseJson(row.risks),
          metadata: safeParseJson(row.metadata),
        };
      }
      case 'Planner': {
        const row = await prisma.plannerStageOutput.findUnique({ where: { id: stageOutputId } });
        if (!row) return null;
        return {
          recommendedTechStack: {
            frontend: row.frontendFramework,
            backend: row.backendFramework,
            database: row.databaseType,
            authentication: row.authenticationTech,
            deployment: row.deploymentTech,
            additionalTechnologies: safeParseJson(row.additionalTechnologies),
          },
          features: safeParseJson(row.features),
          functionalRequirements: safeParseJson(row.functionalRequirements),
          nonFunctionalRequirements: safeParseJson(row.nonFunctionalRequirements),
          acceptanceCriteria: safeParseJson(row.acceptanceCriteria),
          metadata: safeParseJson(row.metadata),
        };
      }
      case 'Architect': {
        const row = await prisma.architectStageOutput.findUnique({ where: { id: stageOutputId } });
        if (!row) return null;
        return {
          architectureStyle: row.architectureStyle,
          architectureReasoning: row.architectureReasoning,
          modules: safeParseJson(row.modules),
          projectStructure: safeParseJson(row.projectStructure),
          sharedResources: safeParseJson(row.sharedResources),
          moduleDependencies: safeParseJson(row.moduleDependencies),
          projectConventions: safeParseJson(row.projectConventions),
          metadata: safeParseJson(row.metadata),
        };
      }
      case 'System': {
        const row = await prisma.systemStageOutput.findUnique({ where: { id: stageOutputId } });
        if (!row) return null;
        return {
          database: {
            type: row.databaseType,
            entities: safeParseJson(row.databaseEntities),
          },
          apis: safeParseJson(row.apis),
          services: safeParseJson(row.services),
          middleware: safeParseJson(row.middleware),
          configuration: safeParseJson(row.configuration),
          validationRules: safeParseJson(row.validationRules),
          businessRules: safeParseJson(row.businessRules),
          metadata: safeParseJson(row.metadata),
        };
      }
      case 'Designer': {
        const row = await prisma.designerStageOutput.findUnique({ where: { id: stageOutputId } });
        if (!row) return null;
        return {
          designSystem: {
            designStyle: row.designStyle,
            theme: row.theme,
            colorPalette: safeParseJson(row.colorPalette),
            typography: safeParseJson(row.typography),
            spacing: row.spacing,
            iconography: row.iconography,
            responsiveStrategy: row.responsiveStrategy,
          },
          navigation: {
            type: row.navigationType,
            entryPoint: row.navigationEntryPoint,
            flows: safeParseJson(row.navigationFlows),
          },
          pages: safeParseJson(row.pages),
          components: safeParseJson(row.components),
          interactionDesign: safeParseJson(row.interactionDesign),
          accessibility: safeParseJson(row.accessibility),
          metadata: safeParseJson(row.metadata),
        };
      }
      case 'Blueprinter': {
        const row = await prisma.blueprinterStageOutput.findUnique({ where: { id: stageOutputId } });
        if (!row) return null;
        return {
          reasoning: row.reasoning,
          blueprints: safeParseJson(row.blueprints),
          metadata: safeParseJson(row.metadata),
        };
      }
      case 'Tester': {
        const row = await prisma.testerStageOutput.findUnique({ where: { id: stageOutputId } });
        if (!row) return null;
        return {
          summary: safeParseJson(row.summary) || {
            overallStatus: row.overallStatus,
            totalTests: row.totalTests,
            passedTests: row.passedTests,
            failedTests: row.failedTests,
            skippedTests: row.skippedTests,
          },
          coverage: safeParseJson(row.coverage),
          testCases: safeParseJson(row.testCases),
          defects: safeParseJson(row.defects),
          generatedTests: safeParseJson(row.generatedTests),
          metadata: safeParseJson(row.metadata),
        };
      }
      case 'Debugger': {
        const row = await prisma.debuggerStageOutput.findUnique({ where: { id: stageOutputId } });
        if (!row) return null;
        return {
          summary: safeParseJson(row.summary),
          fixes: safeParseJson(row.fixes),
          generatedFiles: safeParseJson(row.generatedFiles),
          validation: safeParseJson(row.validation),
          metadata: safeParseJson(row.metadata),
        };
      }
      case 'Reviewer': {
        const row = await prisma.reviewerStageOutput.findUnique({ where: { id: stageOutputId } });
        if (!row) return null;
        return {
          summary: safeParseJson(row.summary),
          requirementCoverage: safeParseJson(row.requirementCoverage),
          architectureReview: safeParseJson(row.architectureReview),
          codeQuality: safeParseJson(row.codeQuality),
          findings: safeParseJson(row.findings),
          strengths: safeParseJson(row.strengths),
          recommendations: safeParseJson(row.recommendations),
          qualityScore: row.qualityScore,
          annotations: safeParseJson(row.annotations),
          metadata: safeParseJson(row.metadata),
        };
      }
      case 'Security': {
        const row = await prisma.securityStageOutput.findUnique({ where: { id: stageOutputId } });
        if (!row) return null;
        return {
          summary: safeParseJson(row.summary),
          securityRequirements: safeParseJson(row.securityRequirements),
          securityChecks: safeParseJson(row.securityChecks),
          vulnerabilities: safeParseJson(row.vulnerabilities),
          securityStrengths: safeParseJson(row.securityStrengths),
          recommendations: safeParseJson(row.recommendations),
          metadata: safeParseJson(row.metadata),
        };
      }
      default:
        return null;
    }
  }
}

/**
 * Legacy support for context resolution packs during conflict checking
 */
export async function resolveContext(
  conversationId: string,
  ledger?: any
): Promise<ContextPack> {
  const queenCorr = await CorrelationResolver.getAuthoritativeCorrelation(conversationId, 'Queen');
  const plannerCorr = await CorrelationResolver.getAuthoritativeCorrelation(conversationId, 'Planner');

  const queenData = queenCorr ? await (ContextResolver as any).fetchStageOutputRecord('Queen', queenCorr.stageOutputId) : {};
  const plannerData = plannerCorr ? await (ContextResolver as any).fetchStageOutputRecord('Planner', plannerCorr.stageOutputId) : {};

  const projectName = plannerData?.projectName || queenData?.projectName || 'Generated App';
  const features = plannerData?.features || [];
  const constraints = queenData?.constraints?.technical || [];

  return {
    projectName,
    techStack: [plannerData?.recommendedTechStack?.frontend, plannerData?.recommendedTechStack?.backend].filter(Boolean),
    features,
    constraints,
    resolvedContext: { queen: queenData, planner: plannerData },
    conflicts: [],
  };
}
