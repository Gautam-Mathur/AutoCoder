import { StageLedger } from './memory';

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

/**
 * Resolves context for downstream agents, tracing references and identifying conflicts/misalignments.
 */
export async function resolveContext(
  conversationId: string,
  ledger: StageLedger
): Promise<ContextPack> {
  const taskSpec = ledger.read('taskSpec') || {};
  const planner = ledger.read('planner') || {};
  const architect = ledger.read('architect') || {};
  const system = ledger.read('system') || {};
  const designer = ledger.read('designer') || {};
  const decisions = ledger.read('decisions') || [];

  const projectName = planner.projectName || taskSpec.projectName || 'Generated App';
  let techStack: string[] = [];
  if (Array.isArray(planner.techStack)) {
    techStack = planner.techStack;
  } else if (planner.techStack && typeof planner.techStack === 'object') {
    techStack = Object.values(planner.techStack).flatMap((val: any) =>
      typeof val === 'string' ? [val] : Array.isArray(val) ? val : []
    ).filter((v): v is string => typeof v === 'string');
  }

  let constraints: string[] = [];
  if (Array.isArray(taskSpec.constraints)) {
    constraints = taskSpec.constraints;
  } else if (taskSpec.constraints && typeof taskSpec.constraints === 'object') {
    constraints = Object.values(taskSpec.constraints).flatMap((val: any) =>
      typeof val === 'string' ? [val] : Array.isArray(val) ? val : []
    ).filter((v): v is string => typeof v === 'string');
  }

  const features = planner.features || [];
  const conflicts: ConflictData[] = [];

  const hasDecision = (desc: string) => {
    return decisions.some((d: any) => d.type === 'conflict_resolution' && d.description === desc);
  };

  // --- CONFLICT & MISALIGNMENT DETECTION RULES ---

  // Rule 1: Database constraint vs Database schema definition
  const databaseDisabled = constraints.some((c: string) =>
    /no\s+db|no\s+database|local\s+storage\s+only|offline\s+only/i.test(c)
  );
  const databaseEntitiesPlanned = system.database?.entities && system.database.entities.length > 0;
  
  const desc1 = 'Rule 1: Database constraint vs Database schema definition';
  if (databaseDisabled && databaseEntitiesPlanned && !hasDecision(desc1)) {
    conflicts.push({
      description: desc1,
      recommendedOption: 'Keep relational database schema but enforce local/client-side storage mapping in Coder.',
      options: [
        'Keep relational database schema but enforce local/client-side storage mapping in Coder.',
        'Remove database entities completely and store all data as static memory.',
        'Override user constraint and proceed with database setup.'
      ]
    });
  }

  // Rule 2: Tech stack conflict (e.g. user specifies Python but files are JS/TS)
  const isPythonProject = techStack.some((t: string) => /python|flask|django|fastapi/i.test(t));
  const hasJsFiles = architect.projectStructure?.files?.some((f: any) =>
    /\.js$|\.ts$|\.tsx$|\.jsx$/i.test(f.path)
  );

  const desc2 = 'Rule 2: Tech stack conflict (Python tech stack with JS/TS files)';
  if (isPythonProject && hasJsFiles && !hasDecision(desc2)) {
    conflicts.push({
      description: desc2,
      recommendedOption: 'Convert JS/TS files to Python equivalents (e.g., app.py instead of app.js).',
      options: [
        'Convert JS/TS files to Python equivalents (e.g., app.py instead of app.js).',
        'Use JavaScript/TypeScript (Node.js) as the primary execution environment.',
        'Setup a hybrid structure (Python backend, JS frontend).'
      ]
    });
  }

  // Rule 3: Missing API route matching frontend expectations
  if (system.apis && designer.components) {
    const plannedApiRoutes = new Set(system.apis.map((a: any) => a.route));
    const designerComponentFeatures = new Set<string>(
      (designer.components || [])
        .map((c: any) => c.purpose)
        .filter((p: any): p is string => typeof p === 'string')
    );
    
    // Check if any component mentions fetching from a route not planned
    for (const purpose of designerComponentFeatures) {
      const match = purpose.match(/fetch(?:ing)?\s+from\s+([/\w\-_]+)/i);
      if (match && match[1]) {
        const route = match[1];
        const desc3 = `Rule 3: Missing API route "${route}" for component purpose "${purpose}"`;
        if (!plannedApiRoutes.has(route) && !hasDecision(desc3)) {
          conflicts.push({
            description: desc3,
            recommendedOption: `Register dynamic mock handler for endpoint "${route}" in fallback API services.`,
            options: [
              `Register dynamic mock handler for endpoint "${route}" in fallback API services.`,
              `Ignore API call and mock data inside the client-side component directly.`,
              `Regenerate API endpoints to include "${route}" explicitly.`
            ]
          });
        }
      }
    }
  }

  // Build Resolved Context Pack
  const resolvedContext = {
    projectName,
    techStack,
    features,
    constraints,
    architectures: {
      systems: architect,
      backend: system,
      uiux: designer,
    }
  };

  return {
    projectName,
    techStack,
    features,
    constraints,
    resolvedContext,
    conflicts
  };
}
