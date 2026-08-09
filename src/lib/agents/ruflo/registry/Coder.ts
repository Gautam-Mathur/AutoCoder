import { StageLedger } from '../memory';

export const name = 'Coder';
export const temperature = 0.1;
export const maxTokens = 4096;

export const systemPrompt = `You are the Coder Agent in the RuFlo software engineering pipeline.

Your responsibility is to transform a single Blueprint into one complete, production-ready source file.

You implement exactly one file per execution.

The Blueprint is the authoritative implementation specification.

You must faithfully implement it without modifying its intent.

## Input

The Coder receives only one Blueprint.

The Blueprint contains:

- Target filepath
- Module ownership
- Feature references
- Planner requirement references
- Language
- Language profile
- Implementation purpose
- Compile order
- Dependencies
- Imports
- Exports
- Implemented APIs
- Consumed APIs
- Database entities
- Designer page
- Designer components
- Acceptance criteria
- Allowed constructs
- Forbidden constructs
- Validation rules

In addition, the runtime injects:

- Language-specific engineering knowledge
- Framework knowledge
- Technology knowledge
- Platform knowledge
- Coding rules
- Language rules
- Framework rules

No additional project context is provided.

The Blueprint is the single source of truth.

## Responsibilities

You must:

- Generate the complete source code for the target file.
- Satisfy every acceptance criterion.
- Respect every validation rule.
- Respect all allowed and forbidden constructs.
- Correctly implement referenced APIs.
- Correctly integrate referenced entities.
- Produce compilable, production-ready code.
- Generate only the requested file.

## Boundaries

You must never:

- Modify the Blueprint.
- Modify architecture.
- Modify APIs.
- Modify database contracts.
- Modify UI specifications.
- Invent new features.
- Generate additional files.
- Omit required functionality.
- Produce partial implementations.

If required information appears inconsistent, implement the Blueprint as provided.

Conflict resolution belongs to upstream stages.

## Implementation Principles

When implementing:

- Follow the Blueprint exactly.
- Produce complete implementations.
- Prefer readability.
- Prefer maintainability.
- Avoid unnecessary abstraction.
- Keep implementations deterministic.
- Ensure internal consistency.

Do not optimize beyond the Blueprint requirements.

## Output Contract

Produce only:

\`\`\`json
{
  "file": "...",
  "code": "..."
}
\`\`\`

Requirements:

- The generated code must be complete.
- The file must compile independently within the project.
- No surrounding explanations.
- No markdown.
- No commentary.`;

export const schema = {

  type: 'object',
  properties: {
    file: { type: 'string' },
    code: { type: 'string' }
  },
  required: ['file', 'code']
};

import { ContextResolver } from '../contextResolver';

export async function getContext(ledger: StageLedger, targetFile?: string): Promise<string> {
  const convoId = (ledger as any).conversationId;
  let plannerData: any = {};
  let architectData: any = {};
  let systemData: any = {};
  let designerData: any = {};

  if (convoId) {
    const data = await ContextResolver.resolveExactPaths(convoId, [
      { fromAgent: 'Planner', select: ['features', 'recommendedTechStack'] },
      { fromAgent: 'Architect', select: ['modules', 'projectStructure', 'projectConventions'] },
      { fromAgent: 'System', select: ['database', 'apis'] },
      { fromAgent: 'Designer', select: ['pages', 'components', 'designSystem', 'navigation', 'interactionDesign'] }
    ]);
    plannerData = data.Planner || {};
    architectData = data.Architect || {};
    systemData = data.System || {};
    designerData = data.Designer || {};
  } else {
    plannerData = ledger.query('Coder', {
      fromAgent: 'Planner',
      select: ['features', 'recommendedTechStack']
    });
    architectData = ledger.query('Coder', {
      fromAgent: 'Architect',
      select: ['modules', 'projectStructure', 'projectConventions']
    });
    systemData = ledger.query('Coder', {
      fromAgent: 'System',
      select: ['database', 'apis']
    });
    designerData = ledger.query('Coder', {
      fromAgent: 'Designer',
      select: ['pages', 'components', 'designSystem', 'navigation', 'interactionDesign']
    });
  }

  // Read previously generated code files from the ledger
  const generatedCode: Record<string, string> = ledger.read('coder') || {};
  let filteredGeneratedCode: Record<string, string> = {};

  if (!targetFile) {
    filteredGeneratedCode = generatedCode;
  } else {
    const normalizedTarget = targetFile.toLowerCase();
    const isFrontendTarget =
      /^(index|main|app)\.(html|htm)$/i.test(normalizedTarget) ||
      /\.(html|htm|css|scss|jsx|tsx)$/i.test(normalizedTarget) ||
      normalizedTarget.includes('/components/') ||
      normalizedTarget.includes('/pages/') ||
      normalizedTarget.includes('/views/') ||
      normalizedTarget.includes('/frontend/');

    const isBackendTarget =
      /\.(py|sql)$/i.test(normalizedTarget) ||
      normalizedTarget.includes('/backend/') ||
      normalizedTarget.includes('/routes/') ||
      normalizedTarget.includes('/controllers/') ||
      normalizedTarget.includes('/models/') ||
      normalizedTarget.includes('/middleware/') ||
      normalizedTarget.includes('/database/') ||
      normalizedTarget.includes('/config/');

    const blueprintsData = ledger.read('blueprinter');
    const blueprints: any[] = Array.isArray(blueprintsData)
      ? blueprintsData
      : blueprintsData?.blueprints || [];
    const targetBp = blueprints.find(
      (bp: any) => bp.file === targetFile || bp.file?.toLowerCase() === normalizedTarget
    );

    const explicitDependencies = new Set<string>();
    if (targetBp) {
      (targetBp.dependencies || []).forEach((d: string) => explicitDependencies.add(d.toLowerCase()));
      (targetBp.imports || []).forEach((imp: string) => explicitDependencies.add(imp.toLowerCase()));
    }

    for (const [filepath, code] of Object.entries(generatedCode)) {
      const normalizedPath = filepath.toLowerCase();

      // Rule 1: Always include shared linking files (API services, shared types, DTOs, contracts)
      const isLinkingFile =
        normalizedPath.includes('/services/') ||
        normalizedPath.includes('/api/') ||
        normalizedPath.includes('api') ||
        normalizedPath.includes('service') ||
        normalizedPath.includes('dto') ||
        normalizedPath.includes('types') ||
        normalizedPath.includes('contract') ||
        normalizedPath.includes('fetch');

      // Rule 2: Explicit dependency match
      const isExplicitDependency =
        explicitDependencies.has(filepath) || explicitDependencies.has(normalizedPath);

      if (isLinkingFile || isExplicitDependency) {
        filteredGeneratedCode[filepath] = code; // Retain 100% full, un-truncated source code
        continue;
      }

      if (isFrontendTarget) {
        // Exclude isolated backend infrastructure
        const isIsolatedBackend =
          normalizedPath.includes('/routes/') ||
          normalizedPath.includes('/controllers/') ||
          normalizedPath.includes('/models/') ||
          normalizedPath.includes('/middleware/') ||
          normalizedPath.includes('/database/') ||
          normalizedPath.includes('/config/') ||
          normalizedPath.endsWith('server.js') ||
          normalizedPath.endsWith('schema.js');

        if (!isIsolatedBackend) {
          filteredGeneratedCode[filepath] = code;
        }
      } else if (isBackendTarget) {
        // Exclude isolated frontend UI templates/layouts
        const isIsolatedFrontend =
          normalizedPath.endsWith('.html') ||
          normalizedPath.endsWith('.css') ||
          normalizedPath.endsWith('.scss');

        if (!isIsolatedFrontend) {
          filteredGeneratedCode[filepath] = code;
        }
      } else {
        filteredGeneratedCode[filepath] = code;
      }
    }
  }

  return JSON.stringify({
    Planner: plannerData,
    Architect: architectData,
    System: systemData,
    Designer: designerData,
    generatedCode: filteredGeneratedCode
  }, null, 2);
}
