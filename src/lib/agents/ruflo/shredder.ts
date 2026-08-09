import { prisma } from '../../db';
import { fuzzyParseJson } from './fuzzyParser';
import { IngestionResult } from './ledgerTypes';
import { OutputNormalizer } from './normalizer';
import { SchemaValidator } from './validator';
import { StagePersistence } from './persistence';
import { CorrelationService } from './correlationService';
import { AGENT_DEFS } from './agents';

/**
 * High-level Pipeline Engine Orchestrator for stage outputs:
 * LLM Output -> OutputNormalizer -> SchemaValidator -> StagePersistence -> CorrelationService
 */
export async function shredAndIngest(
  conversationId: string,
  stage: string,
  rawOutput: string | Record<string, any>
): Promise<IngestionResult> {
  const normalizedStage = stage.toLowerCase();
  const canonicalStageName = stage.charAt(0).toUpperCase() + stage.slice(1);

  let parsed: any;
  let repaired = false;

  if (typeof rawOutput === 'string') {
    const fuzzy = fuzzyParseJson(rawOutput);
    parsed = fuzzy.parsed;
    repaired = fuzzy.repaired;
  } else {
    parsed = rawOutput;
  }

  // 1. OutputNormalizer
  const normalizedPayload = OutputNormalizer.normalize(parsed);

  // 2. SchemaValidator (Strict 100% Schema Check)
  const agentDef = AGENT_DEFS[canonicalStageName];
  if (agentDef && agentDef.schema) {
    const schemaError = SchemaValidator.validate(normalizedPayload, agentDef.schema);
    if (schemaError) {
      throw new Error(`SchemaValidator Invariant Failure for stage "${stage}": ${schemaError}`);
    }
  }

  // 3. StagePersistence (Write to physical *StageOutput table)
  const stageOutputId = await StagePersistence.persistStageOutput(canonicalStageName, conversationId, normalizedPayload);

  // 4. CorrelationService (Manage sequence +1, correlationCode, and ACTIVE/SUPERSEDED/INVALIDATED state machine)
  const correlationResult = await CorrelationService.createAuthoritativeCorrelation({
    conversationId,
    stage: canonicalStageName,
    stageOutputId,
  });

  // 5. Populate Domain Graph Nodes & Edges (Required Domain Graph for Blueprinter Code Layout)
  const nodesToUpsert: any[] = [];
  const edgesToUpsert: any[] = [];

  switch (normalizedStage) {
    case 'queen': {
      const name = normalizedPayload.projectName || normalizedPayload.project?.name || 'Project';
      const nodeId = `${conversationId}:task_spec_main`;

      nodesToUpsert.push({
        id: nodeId,
        conversationId,
        type: 'TASK_SPEC',
        title: name,
        summary: normalizedPayload.problemStatement || normalizedPayload.summary || '',
        payload: JSON.stringify(normalizedPayload),
        version: 1,
      });

      await prisma.$transaction([
        prisma.graphEdge.deleteMany({ where: { conversationId, sourceNode: { type: 'TASK_SPEC' } } }),
        prisma.graphNode.deleteMany({ where: { conversationId, type: 'TASK_SPEC' } }),
        prisma.graphNode.createMany({ data: nodesToUpsert }),
      ]);
      break;
    }

    case 'planner': {
      const features = Array.isArray(normalizedPayload.features) ? normalizedPayload.features : [];

      features.forEach((feat: any, idx: number) => {
        const rawId = feat.id || `feat_${idx + 1}`;
        const nodeId = `${conversationId}:${rawId}_${idx}`;
        const featName = feat.name || feat.title || `Feature ${idx + 1}`;

        nodesToUpsert.push({
          id: nodeId,
          conversationId,
          type: 'FEATURE',
          title: featName,
          summary: feat.description || '',
          payload: JSON.stringify(feat),
          version: 1,
        });

        edgesToUpsert.push({
          conversationId,
          sourceNodeId: nodeId,
          targetNodeId: `${conversationId}:task_spec_main`,
          type: 'IMPLEMENTS',
        });
      });

      await prisma.$transaction([
        prisma.graphEdge.deleteMany({ where: { conversationId, sourceNode: { type: 'FEATURE' } } }),
        prisma.graphNode.deleteMany({ where: { conversationId, type: 'FEATURE' } }),
        ...(nodesToUpsert.length > 0 ? [prisma.graphNode.createMany({ data: nodesToUpsert })] : []),
        ...(edgesToUpsert.length > 0 ? [prisma.graphEdge.createMany({ data: edgesToUpsert })] : []),
      ]);
      break;
    }

    case 'architect': {
      const modules = Array.isArray(normalizedPayload.modules) ? normalizedPayload.modules : [];

      modules.forEach((mod: any, idx: number) => {
        const rawId = mod.id || `mod_${idx + 1}`;
        const nodeId = `${conversationId}:${rawId}_${idx}`;
        const modName = mod.name || `Module ${idx + 1}`;

        nodesToUpsert.push({
          id: nodeId,
          conversationId,
          type: 'MODULE',
          title: modName,
          summary: mod.purpose || mod.description || '',
          payload: JSON.stringify(mod),
          version: 1,
        });

        edgesToUpsert.push({
          conversationId,
          sourceNodeId: nodeId,
          targetNodeId: `${conversationId}:task_spec_main`,
          type: 'BELONGS_TO',
        });
      });

      await prisma.$transaction([
        prisma.graphEdge.deleteMany({ where: { conversationId, sourceNode: { type: 'MODULE' } } }),
        prisma.graphNode.deleteMany({ where: { conversationId, type: 'MODULE' } }),
        ...(nodesToUpsert.length > 0 ? [prisma.graphNode.createMany({ data: nodesToUpsert })] : []),
        ...(edgesToUpsert.length > 0 ? [prisma.graphEdge.createMany({ data: edgesToUpsert })] : []),
      ]);
      break;
    }

    case 'system': {
      const apis = Array.isArray(normalizedPayload.apis) ? normalizedPayload.apis : [];

      apis.forEach((api: any, idx: number) => {
        const rawId = api.id || `api_${idx + 1}`;
        const nodeId = `${conversationId}:${rawId}_${idx}`;
        const apiTitle = `${api.method || 'GET'} ${api.route || api.path || ''}`;

        nodesToUpsert.push({
          id: nodeId,
          conversationId,
          type: 'API_ENDPOINT',
          title: apiTitle,
          summary: api.purpose || '',
          payload: JSON.stringify(api),
          version: 1,
        });
      });

      await prisma.$transaction([
        prisma.graphEdge.deleteMany({ where: { conversationId, sourceNode: { type: 'API_ENDPOINT' } } }),
        prisma.graphNode.deleteMany({ where: { conversationId, type: 'API_ENDPOINT' } }),
        ...(nodesToUpsert.length > 0 ? [prisma.graphNode.createMany({ data: nodesToUpsert })] : []),
      ]);
      break;
    }

    case 'designer': {
      const components = Array.isArray(normalizedPayload.components) ? normalizedPayload.components : [];

      components.forEach((comp: any, idx: number) => {
        const rawId = comp.id || `comp_${idx + 1}`;
        const nodeId = `${conversationId}:${rawId}_${idx}`;
        const compTitle = comp.name || `Component ${idx + 1}`;

        nodesToUpsert.push({
          id: nodeId,
          conversationId,
          type: 'UI_COMPONENT',
          title: compTitle,
          summary: comp.description || '',
          payload: JSON.stringify(comp),
          version: 1,
        });
      });

      await prisma.$transaction([
        prisma.graphEdge.deleteMany({ where: { conversationId, sourceNode: { type: 'UI_COMPONENT' } } }),
        prisma.graphNode.deleteMany({ where: { conversationId, type: 'UI_COMPONENT' } }),
        ...(nodesToUpsert.length > 0 ? [prisma.graphNode.createMany({ data: nodesToUpsert })] : []),
      ]);
      break;
    }
  }

  // 6. Record Execution Log Audit Entry
  const rawText = typeof rawOutput === 'string' ? rawOutput : JSON.stringify(rawOutput);
  const lastLog = await prisma.stageExecutionLog.findFirst({
    where: { conversationId },
    orderBy: { sequence: 'desc' },
  });
  const nextSeq = (lastLog?.sequence || 0) + 1;

  await prisma.stageExecutionLog.create({
    data: {
      conversationId,
      stageName: canonicalStageName,
      repairLoops: 0,
      rawOutput: rawText,
      status: repaired ? 'FUZZY_REPAIRED' : 'SUCCESS',
      sequence: nextSeq,
    },
  });

  return {
    status: repaired ? 'FUZZY_REPAIRED' : 'SUCCESS',
    rawOutput: rawText,
    repairedPayload: normalizedPayload,
    createdNodesCount: nodesToUpsert.length,
    createdEdgesCount: edgesToUpsert.length,
    correlationCode: correlationResult.correlationCode,
  };
}
