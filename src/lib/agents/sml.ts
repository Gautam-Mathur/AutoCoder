import { prisma } from '../db';
import { ContextResolver } from './ruflo/contextResolver';
import { shredAndIngest } from './ruflo/shredder';

export interface WriteAgentOutputParams {
  conversationId: string;
  agentName: string;
  stage: string;
  schemaVersion: string;
  model: string;
  validatedJson: Record<string, any>;
  executionTime: number;
  tokenUsage: number;
  attempt: number;
}

export async function writeAgentOutput(params: WriteAgentOutputParams) {
  const {
    conversationId,
    agentName,
    stage,
    schemaVersion,
    model,
    validatedJson,
    executionTime,
    tokenUsage,
    attempt,
  } = params;

  const jsonStr = JSON.stringify(validatedJson);

  // 1. Save main output
  const output = await prisma.agentOutput.create({
    data: {
      conversationId,
      agentName,
      stage,
      schemaVersion,
      model,
      validatedJson: jsonStr,
      executionTime,
      tokenUsage,
      attempt,
    },
  });

  // 2. Generate indexes for top-level keys
  const indexPromises = Object.keys(validatedJson).map((key) => {
    const path = `${agentName}.${key}`;
    const value = JSON.stringify(validatedJson[key]);
    return prisma.agentIndex.create({
      data: {
        conversationId,
        outputId: output.id,
        path,
        value,
      },
    });
  });

  await Promise.all(indexPromises);

  // 3. Atomically shred and ingest into hybrid ledger database
  try {
    await shredAndIngest(conversationId, stage, validatedJson);
  } catch (e: any) {
    console.error(`Ledger ingestion notice for stage ${stage}:`, e.message);
  }

  return output;
}

export async function queryAgentOutput(
  conversationId: string,
  agentName: string,
  path: string
): Promise<any | null> {
  try {
    const resolved = await ContextResolver.resolveExactPaths(conversationId, [
      { fromAgent: agentName, select: [path] },
    ]);
    if (resolved[agentName] && path in resolved[agentName]) {
      return resolved[agentName][path];
    }
  } catch {
    // Fallback to agentIndex if not in authoritative stage output
  }

  const indexPath = `${agentName}.${path}`;
  const index = await prisma.agentIndex.findFirst({
    where: {
      conversationId,
      path: indexPath,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!index) return null;
  return JSON.parse(index.value);
}

// ----------------------------------------------------
// Schema-Aware Extraction Tools via ContextResolver
// ----------------------------------------------------

export async function getVocabulary(conversationId: string): Promise<string[]> {
  try {
    const res = await ContextResolver.resolveExactPaths(conversationId, [
      { fromAgent: 'Planner', select: ['recommendedTechStack'] },
    ]);
    const tech = res.Planner?.recommendedTechStack;
    if (tech) {
      const terms: string[] = [];
      if (tech.frontend) terms.push(tech.frontend);
      if (tech.backend) terms.push(tech.backend);
      if (tech.database) terms.push(tech.database);
      if (terms.length > 0) return terms;
    }
  } catch {}
  return [];
}

export async function getFeatures(conversationId: string): Promise<any[]> {
  try {
    const res = await ContextResolver.resolveExactPaths(conversationId, [
      { fromAgent: 'Planner', select: ['features'] },
    ]);
    return res.Planner?.features || [];
  } catch {
    return [];
  }
}

export async function getRequirements(conversationId: string): Promise<any | null> {
  try {
    const res = await ContextResolver.resolveExactPaths(conversationId, [
      { fromAgent: 'Planner', select: ['functionalRequirements'] },
    ]);
    return res.Planner?.functionalRequirements || [];
  } catch {
    return [];
  }
}

export async function getModules(conversationId: string): Promise<any[]> {
  try {
    const res = await ContextResolver.resolveExactPaths(conversationId, [
      { fromAgent: 'Architect', select: ['modules'] },
    ]);
    return res.Architect?.modules || [];
  } catch {
    return [];
  }
}

export async function getEntities(conversationId: string): Promise<any[]> {
  try {
    const res = await ContextResolver.resolveExactPaths(conversationId, [
      { fromAgent: 'System', select: ['database.entities'] },
    ]);
    return res.System?.['database.entities'] || [];
  } catch {
    return [];
  }
}

export async function getBusinessRules(conversationId: string): Promise<string[]> {
  try {
    const res = await ContextResolver.resolveExactPaths(conversationId, [
      { fromAgent: 'System', select: ['businessRules'] },
    ]);
    return res.System?.businessRules || [];
  } catch {
    return [];
  }
}

export async function getEndpoints(conversationId: string): Promise<string[]> {
  try {
    const res = await ContextResolver.resolveExactPaths(conversationId, [
      { fromAgent: 'System', select: ['apis'] },
    ]);
    const apis = res.System?.apis || [];
    return apis.map((api: any) => {
      if (typeof api === 'string') return api;
      const method = api.method || 'GET';
      const route = api.route || api.path || api.name || '';
      return `${method} ${route}`.trim();
    });
  } catch {
    return [];
  }
}

export async function getNavigation(conversationId: string): Promise<string[]> {
  try {
    const res = await ContextResolver.resolveExactPaths(conversationId, [
      { fromAgent: 'Designer', select: ['navigation.flows'] },
    ]);
    return res.Designer?.['navigation.flows'] || [];
  } catch {
    return [];
  }
}

export async function getComponents(conversationId: string): Promise<any[]> {
  try {
    const res = await ContextResolver.resolveExactPaths(conversationId, [
      { fromAgent: 'Designer', select: ['components'] },
    ]);
    return res.Designer?.components || [];
  } catch {
    return [];
  }
}

export async function getBlueprint(conversationId: string, file: string): Promise<any | null> {
  try {
    const res = await ContextResolver.resolveExactPaths(conversationId, [
      { fromAgent: 'Blueprinter', select: ['blueprints'] },
    ]);
    const allBlueprints = res.Blueprinter?.blueprints || [];
    return allBlueprints.find((b: any) => b.file === file) || null;
  } catch {
    return null;
  }
}

export async function getSecurityIssues(conversationId: string): Promise<any[]> {
  try {
    const res = await ContextResolver.resolveExactPaths(conversationId, [
      { fromAgent: 'Security', select: ['vulnerabilities'] },
    ]);
    return res.Security?.vulnerabilities || [];
  } catch {
    return [];
  }
}

export async function getFailures(conversationId: string): Promise<any[]> {
  try {
    const res = await ContextResolver.resolveExactPaths(conversationId, [
      { fromAgent: 'Tester', select: ['defects'] },
    ]);
    return res.Tester?.defects || [];
  } catch {
    return [];
  }
}

export async function getQualityAnnotations(conversationId: string): Promise<any[]> {
  try {
    const res = await ContextResolver.resolveExactPaths(conversationId, [
      { fromAgent: 'Reviewer', select: ['annotations'] },
    ]);
    return res.Reviewer?.annotations || [];
  } catch {
    return [];
  }
}
