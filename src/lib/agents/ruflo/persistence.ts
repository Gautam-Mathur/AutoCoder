import { prisma } from '../../db';

function safeJsonStringify(val: any): string | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') return val;
  try {
    return JSON.stringify(val);
  } catch {
    return null;
  }
}

export class StagePersistence {
  static async persistStageOutput(stage: string, conversationId: string, data: any): Promise<string> {
    const safeData = data || {};

    switch (stage) {
      case 'Queen': {
        const payload = {
          conversationId,
          projectId: safeData.projectId || null,
          projectName: safeData.projectName || safeData.project?.name || 'Project',
          problemStatement: safeData.problemStatement || null,
          projectDescription: safeData.projectDescription || null,
          goal: safeData.projectGoal || safeData.goal || null,
          projectType: safeData.projectType || null,
          summary: safeData.summary || null,
          targetUsers: safeData.targetUsers || null,
          platforms: safeJsonStringify(safeData.platforms),
          deploymentTarget: safeData.deploymentTarget || null,
          mvpIncludedScope: safeJsonStringify(safeData.mvpScope?.included),
          mvpExcludedScope: safeJsonStringify(safeData.mvpScope?.excluded),
          futureScope: safeJsonStringify(safeData.futureScope),
          technicalConstraints: safeJsonStringify(safeData.constraints?.technical),
          businessConstraints: safeJsonStringify(safeData.constraints?.business),
          platformConstraints: safeJsonStringify(safeData.constraints?.platform),
          legalConstraints: safeJsonStringify(safeData.constraints?.legal),
          otherConstraints: safeJsonStringify(safeData.constraints?.other),
          budget: safeData.budget || safeData.constraints?.budget || null,
          timeline: safeData.timeline || safeData.constraints?.timeline || null,
          assumptions: safeJsonStringify(safeData.assumptions),
          risks: safeJsonStringify(safeData.risks),
          metadata: safeJsonStringify(safeData.metadata),
          version: safeData.metadata?.version || safeData.version || '1.0.0',
          status: safeData.metadata?.status || safeData.status || 'APPROVED',
        };

        const record = await prisma.queenStageOutput.upsert({
          where: { conversationId },
          update: payload,
          create: payload,
        });
        return record.id;
      }

      case 'Planner': {
        const tech = safeData.recommendedTechStack || safeData.technology || {};
        const payload = {
          conversationId,
          frontendFramework: typeof tech.frontend === 'string' ? tech.frontend : tech.frontend?.framework || null,
          frontendLanguage: typeof tech.frontend === 'object' ? tech.frontend?.language : null,
          frontendStyling: safeJsonStringify(tech.frontend?.styling),
          frontendStateManagement: typeof tech.frontend === 'object' ? tech.frontend?.stateManagement : null,
          frontendRouting: typeof tech.frontend === 'object' ? tech.frontend?.routing : null,
          frontendBuildTool: typeof tech.frontend === 'object' ? tech.frontend?.buildTool : null,
          backendFramework: typeof tech.backend === 'string' ? tech.backend : tech.backend?.framework || null,
          backendLanguage: typeof tech.backend === 'object' ? tech.backend?.language : null,
          backendRuntime: typeof tech.backend === 'object' ? tech.backend?.runtime : null,
          databaseType: typeof tech.database === 'string' ? tech.database : tech.database?.type || null,
          databaseProvider: typeof tech.database === 'object' ? tech.database?.provider : null,
          databaseOrm: typeof tech.database === 'object' ? tech.database?.orm : null,
          authRequired: Boolean(safeData.authRequired ?? true),
          authStrategy: safeData.authStrategy || null,
          authenticationTech: typeof tech.authentication === 'string' ? tech.authentication : null,
          deploymentTech: typeof tech.deployment === 'string' ? tech.deployment : null,
          deploymentFrontend: typeof tech.deployment === 'object' ? tech.deployment?.frontend : null,
          deploymentBackend: typeof tech.deployment === 'object' ? tech.deployment?.backend : null,
          deploymentDatabase: typeof tech.deployment === 'object' ? tech.deployment?.database : null,
          additionalTechnologies: safeJsonStringify(tech.additionalTechnologies),
          features: safeJsonStringify(safeData.features),
          functionalRequirements: safeJsonStringify(safeData.functionalRequirements),
          nonFunctionalRequirements: safeJsonStringify(safeData.nonFunctionalRequirements),
          acceptanceCriteria: safeJsonStringify(safeData.acceptanceCriteria),
          metadata: safeJsonStringify(safeData.metadata),
          version: safeData.metadata?.version || safeData.version || '1.0.0',
          status: safeData.metadata?.status || safeData.status || 'APPROVED',
        };

        const record = await prisma.plannerStageOutput.upsert({
          where: { conversationId },
          update: payload,
          create: payload,
        });
        return record.id;
      }

      case 'Architect': {
        const payload = {
          conversationId,
          architectureStyle: safeData.architectureStyle || safeData.architecture?.style || null,
          architectureReasoning: safeData.architectureReasoning || safeData.architecture?.reasoning || null,
          modules: safeJsonStringify(safeData.modules),
          projectStructure: safeJsonStringify(safeData.projectStructure),
          sharedResources: safeJsonStringify(safeData.sharedResources),
          moduleDependencies: safeJsonStringify(safeData.moduleDependencies),
          projectConventions: safeJsonStringify(safeData.projectConventions),
          metadata: safeJsonStringify(safeData.metadata),
          version: safeData.metadata?.version || safeData.version || '1.0.0',
          status: safeData.metadata?.status || safeData.status || 'APPROVED',
        };

        const record = await prisma.architectStageOutput.upsert({
          where: { conversationId },
          update: payload,
          create: payload,
        });
        return record.id;
      }

      case 'System': {
        const payload = {
          conversationId,
          databaseType: safeData.databaseType || safeData.database?.type || null,
          databaseEntities: safeJsonStringify(safeData.databaseEntities || safeData.database?.entities),
          apis: safeJsonStringify(safeData.apis),
          services: safeJsonStringify(safeData.services),
          middleware: safeJsonStringify(safeData.middleware),
          configuration: safeJsonStringify(safeData.configuration),
          validationRules: safeJsonStringify(safeData.validationRules),
          businessRules: safeJsonStringify(safeData.businessRules),
          metadata: safeJsonStringify(safeData.metadata),
          version: safeData.metadata?.version || safeData.version || '1.0.0',
          status: safeData.metadata?.status || safeData.status || 'APPROVED',
        };

        const record = await prisma.systemStageOutput.upsert({
          where: { conversationId },
          update: payload,
          create: payload,
        });
        return record.id;
      }

      case 'Designer': {
        const des = safeData.designSystem || {};
        const nav = safeData.navigation || {};

        const payload = {
          conversationId,
          designStyle: des.designStyle || safeData.designStyle || null,
          theme: safeJsonStringify(des.theme || safeData.theme),
          colorPalette: safeJsonStringify(des.colorPalette || safeData.colorPalette),
          typography: safeJsonStringify(des.typography || safeData.typography),
          spacing: des.spacing || safeData.spacing || null,
          iconography: des.iconography || safeData.iconography || null,
          responsiveStrategy: des.responsiveStrategy || safeData.responsiveStrategy || null,
          navigationType: nav.type || safeData.navigationType || null,
          navigationEntryPoint: nav.entryPoint || safeData.navigationEntryPoint || null,
          navigationFlows: safeJsonStringify(nav.flows || safeData.navigationFlows),
          pages: safeJsonStringify(safeData.pages),
          components: safeJsonStringify(safeData.components),
          interactionDesign: safeJsonStringify(safeData.interactionDesign),
          accessibility: safeJsonStringify(safeData.accessibility),
          metadata: safeJsonStringify(safeData.metadata),
          version: safeData.metadata?.version || safeData.version || '1.0.0',
          status: safeData.metadata?.status || safeData.status || 'APPROVED',
        };

        const record = await prisma.designerStageOutput.upsert({
          where: { conversationId },
          update: payload,
          create: payload,
        });
        return record.id;
      }

      case 'Blueprinter': {
        const payload = {
          conversationId,
          reasoning: safeData.reasoning || null,
          blueprints: safeJsonStringify(safeData.blueprints),
          metadata: safeJsonStringify(safeData.metadata),
          version: safeData.metadata?.version || safeData.version || '1.0.0',
          status: safeData.metadata?.status || safeData.status || 'COMPLETED',
        };

        const record = await prisma.blueprinterStageOutput.upsert({
          where: { conversationId },
          update: payload,
          create: payload,
        });
        return record.id;
      }

      case 'Tester': {
        const summary = safeData.summary || {};
        const payload = {
          conversationId,
          summary: safeJsonStringify(summary),
          overallStatus: summary.overallStatus || safeData.overallStatus || 'PASSED',
          totalTests: typeof summary.totalTests === 'number' ? summary.totalTests : (typeof safeData.totalTests === 'number' ? safeData.totalTests : 0),
          passedTests: typeof summary.passedTests === 'number' ? summary.passedTests : (typeof safeData.passedTests === 'number' ? safeData.passedTests : 0),
          failedTests: typeof summary.failedTests === 'number' ? summary.failedTests : (typeof safeData.failedTests === 'number' ? safeData.failedTests : 0),
          skippedTests: typeof summary.skippedTests === 'number' ? summary.skippedTests : (typeof safeData.skippedTests === 'number' ? safeData.skippedTests : 0),
          coverage: safeJsonStringify(safeData.coverage),
          testCases: safeJsonStringify(safeData.testCases),
          defects: safeJsonStringify(safeData.defects),
          generatedTests: safeJsonStringify(safeData.generatedTests),
          metadata: safeJsonStringify(safeData.metadata),
          version: safeData.metadata?.version || safeData.version || '1.0.0',
          status: safeData.metadata?.status || safeData.status || 'COMPLETED',
        };

        const record = await prisma.testerStageOutput.upsert({
          where: { conversationId },
          update: payload,
          create: payload,
        });
        return record.id;
      }

      case 'Debugger': {
        const payload = {
          conversationId,
          summary: safeJsonStringify(safeData.summary),
          fixes: safeJsonStringify(safeData.fixes),
          generatedFiles: safeJsonStringify(safeData.generatedFiles),
          validation: safeJsonStringify(safeData.validation),
          metadata: safeJsonStringify(safeData.metadata),
          version: safeData.metadata?.version || safeData.version || '1.0.0',
          status: safeData.metadata?.status || safeData.status || 'COMPLETED',
        };

        const record = await prisma.debuggerStageOutput.upsert({
          where: { conversationId },
          update: payload,
          create: payload,
        });
        return record.id;
      }

      case 'Reviewer': {
        const rawScore = safeData.qualityScore;
        const score = typeof rawScore === 'number' ? rawScore : (typeof rawScore === 'string' ? parseInt(rawScore, 10) || 85 : 85);
        const payload = {
          conversationId,
          summary: safeJsonStringify(safeData.summary),
          requirementCoverage: safeJsonStringify(safeData.requirementCoverage),
          architectureReview: safeJsonStringify(safeData.architectureReview),
          codeQuality: safeJsonStringify(safeData.codeQuality),
          findings: safeJsonStringify(safeData.findings),
          strengths: safeJsonStringify(safeData.strengths),
          recommendations: safeJsonStringify(safeData.recommendations),
          qualityScore: score,
          annotations: safeJsonStringify(safeData.annotations),
          metadata: safeJsonStringify(safeData.metadata),
          version: safeData.metadata?.version || safeData.version || '1.0.0',
          status: safeData.metadata?.status || safeData.status || 'COMPLETED',
        };

        const record = await prisma.reviewerStageOutput.upsert({
          where: { conversationId },
          update: payload,
          create: payload,
        });
        return record.id;
      }

      case 'Security': {
        const payload = {
          conversationId,
          summary: safeJsonStringify(safeData.summary),
          securityRequirements: safeJsonStringify(safeData.securityRequirements),
          securityChecks: safeJsonStringify(safeData.securityChecks),
          vulnerabilities: safeJsonStringify(safeData.vulnerabilities),
          securityStrengths: safeJsonStringify(safeData.securityStrengths),
          recommendations: safeJsonStringify(safeData.recommendations),
          metadata: safeJsonStringify(safeData.metadata),
          version: safeData.metadata?.version || safeData.version || '1.0.0',
          status: safeData.metadata?.status || safeData.status || 'COMPLETED',
        };

        const record = await prisma.securityStageOutput.upsert({
          where: { conversationId },
          update: payload,
          create: payload,
        });
        return record.id;
      }

      default:
        throw new Error(`Unsupported stage output persistence for stage: ${stage}`);
    }
  }
}
