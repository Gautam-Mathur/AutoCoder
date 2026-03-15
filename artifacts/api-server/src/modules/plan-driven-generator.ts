import type { ProjectPlan } from './plan-generator.js';
import { analyzeSemantics } from './contextual-reasoning-engine.js';
import { generateTestFiles } from './test-generator.js';
import { generateDesignSystem } from './design-system-engine.js';
import { generateProject as generateProjectV2, type ProgressCallback, type EnrichmentContext } from './codegen-orchestrator.js';

interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

function logPlanDimensions(plan: ProjectPlan): void {
  const dimensions: string[] = [];
  if (plan.integrations?.length) dimensions.push(`integrations(${plan.integrations.length})`);
  if (plan.securityPlan) dimensions.push(`security(${plan.securityPlan.authStrategy})`);
  if (plan.performancePlan) dimensions.push(`performance`);
  if (plan.errorHandling) dimensions.push(`errorHandling(${plan.errorHandling.pageStates?.length || 0} pages)`);
  if (plan.uxFlows?.length) dimensions.push(`uxFlows(${plan.uxFlows.length})`);
  if (plan.customActions?.length) dimensions.push(`customActions(${plan.customActions.length})`);
  if (plan.dashboardWidgets?.length) dimensions.push(`dashboardWidgets(${plan.dashboardWidgets.length})`);
  if (plan.notifications) dimensions.push(`notifications(${plan.notifications.channels?.join(',') || 'none'})`);

  if (dimensions.length > 0) {
    console.log(`[CodeGen] Plan dimensions detected: ${dimensions.join(', ')}`);
  }
}

function enrichPlanPagesWithErrorHandling(plan: ProjectPlan): ProjectPlan {
  if (!plan.errorHandling?.pageStates?.length) return plan;

  const errorStateMap = new Map(
    plan.errorHandling.pageStates.map(ps => [ps.page.toLowerCase(), ps])
  );

  const enrichedPages = plan.pages.map(page => {
    const errorState = errorStateMap.get(page.name.toLowerCase());
    if (errorState) {
      const additionalFeatures: string[] = [];
      if (!page.features.includes('empty-state')) {
        additionalFeatures.push('empty-state');
      }
      if (!page.features.includes('error-state')) {
        additionalFeatures.push('error-state');
      }
      if (!page.features.includes(errorState.loadingPattern)) {
        additionalFeatures.push(errorState.loadingPattern);
      }
      if (additionalFeatures.length > 0) {
        return { ...page, features: [...page.features, ...additionalFeatures] };
      }
    }
    return page;
  });

  return { ...plan, pages: enrichedPages };
}

function enrichPlanPagesWithUXFlows(plan: ProjectPlan): ProjectPlan {
  if (!plan.uxFlows?.length) return plan;

  const flowsByEntity = new Map<string, string[]>();
  for (const flow of plan.uxFlows) {
    if (flow.entity) {
      const key = flow.entity.toLowerCase();
      if (!flowsByEntity.has(key)) flowsByEntity.set(key, []);
      flowsByEntity.get(key)!.push(flow.type);
    }
  }

  const enrichedPages = plan.pages.map(page => {
    const additionalFeatures: string[] = [];
    for (const dataItem of page.dataNeeded) {
      const flowTypes = flowsByEntity.get(dataItem.toLowerCase());
      if (flowTypes) {
        for (const ft of flowTypes) {
          if (!page.features.includes(ft) && !additionalFeatures.includes(ft)) {
            additionalFeatures.push(ft);
          }
        }
      }
    }
    if (additionalFeatures.length > 0) {
      return { ...page, features: [...page.features, ...additionalFeatures] };
    }
    return page;
  });

  return { ...plan, pages: enrichedPages };
}

function enrichPlanWithIntegrationEndpoints(plan: ProjectPlan): ProjectPlan {
  if (!plan.integrations?.length) return plan;

  const additionalEndpoints = plan.integrations.flatMap(integration =>
    (integration.apiRoutes || []).map(route => ({
      method: route.method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
      path: route.path,
      description: `${integration.name}: ${route.description}`,
      entity: integration.name,
      responseType: 'json',
    }))
  );

  if (additionalEndpoints.length === 0) return plan;

  const existingPaths = new Set(plan.apiEndpoints.map(e => `${e.method}:${e.path}`));
  const newEndpoints = additionalEndpoints.filter(
    e => !existingPaths.has(`${e.method}:${e.path}`)
  );

  if (newEndpoints.length === 0) return plan;

  return { ...plan, apiEndpoints: [...plan.apiEndpoints, ...newEndpoints] };
}

function enrichPlanWithCustomActionEndpoints(plan: ProjectPlan): ProjectPlan {
  if (!plan.customActions?.length) return plan;

  const existingPaths = new Set(plan.apiEndpoints.map(e => `${e.method}:${e.path}`));
  const newEndpoints = plan.customActions
    .filter(action => !existingPaths.has(`${action.method}:${action.path}`))
    .map(action => ({
      method: action.method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
      path: action.path,
      description: `${action.entity}: ${action.description}`,
      entity: action.entity,
      responseType: 'json',
    }));

  if (newEndpoints.length === 0) return plan;

  return { ...plan, apiEndpoints: [...plan.apiEndpoints, ...newEndpoints] };
}

export function generateProjectFromPlan(plan: ProjectPlan, onProgress?: ProgressCallback, enrichment?: EnrichmentContext): GeneratedFile[] {
  logPlanDimensions(plan);

  let enrichedPlan = plan;
  enrichedPlan = enrichPlanPagesWithErrorHandling(enrichedPlan);
  enrichedPlan = enrichPlanPagesWithUXFlows(enrichedPlan);
  enrichedPlan = enrichPlanWithIntegrationEndpoints(enrichedPlan);
  enrichedPlan = enrichPlanWithCustomActionEndpoints(enrichedPlan);

  if (!enrichment?.reasoning) {
    console.warn('[CodeGen] WARNING: enrichment.reasoning not provided — falling back to analyzeSemantics(). This should not happen in normal pipeline execution.');
  }
  const reasoning = enrichment?.reasoning || analyzeSemantics(enrichedPlan);
  if (!enrichment?.designSystem) {
    console.warn('[CodeGen] WARNING: enrichment.designSystem not provided — falling back to generateDesignSystem().');
  }
  const designSystem = enrichment?.designSystem || generateDesignSystem(enrichedPlan, reasoning);

  const enrichmentCtx: EnrichmentContext = {
    ...enrichment,
    reasoning,
    designSystem,
  };

  const { files, validation, report } = generateProjectV2(enrichedPlan, reasoning, designSystem, onProgress, enrichmentCtx);

  console.log('[CodeGen V2] Validation Report:');
  console.log(report);

  if (!validation.valid) {
    console.warn('[CodeGen V2] Validation found errors — attempting to proceed anyway');
  }

  const testFiles = generateTestFiles(enrichedPlan, reasoning);
  files.push(...testFiles);

  return files;
}