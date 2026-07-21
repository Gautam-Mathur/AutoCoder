import { StageLedger } from '../memory';
import path from 'path';

export const name = 'Blueprinter';
export const temperature = 0.1;
export const maxTokens = 2048;

export const systemPrompt = `DETERMINISTIC BLUEPRINT ENGINE`;

export const schema = {
  type: 'object',
  properties: {
    blueprints: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          file: { type: 'string' },
          moduleId: { type: 'string' },
          featureIds: { type: 'array', items: { type: 'string' } },
          plannerRequirementIds: { type: 'array', items: { type: 'string' } },
          language: { type: 'string' },
          languageProfile: { type: 'string' },
          purpose: { type: 'string' },
          compileOrder: { type: 'number' },
          compileAfter: { type: 'array', items: { type: 'string' } },
          imports: { type: 'array', items: { type: 'string' } },
          exports: { type: 'array', items: { type: 'string' } },
          dependencies: { type: 'array', items: { type: 'string' } },
          interfaces: { type: 'array', items: { type: 'string' } },
          classes: { type: 'array', items: { type: 'string' } },
          functions: { type: 'array', items: { type: 'string' } },
          implementedApis: { type: 'array', items: { type: 'string' } },
          consumedApis: { type: 'array', items: { type: 'string' } },
          databaseEntities: { type: 'array', items: { type: 'string' } },
          designerPageId: {
            anyOf: [
              { type: 'string' },
              { type: 'null' }
            ]
          },
          designerComponentIds: { type: 'array', items: { type: 'string' } },
          acceptanceCriteria: { type: 'array', items: { type: 'string' } },
          allowedConstructs: { type: 'array', items: { type: 'string' } },
          forbiddenConstructs: { type: 'array', items: { type: 'string' } },
          validationRules: { type: 'array', items: { type: 'string' } }
        },
        required: [
          'id', 'file', 'moduleId', 'featureIds', 'plannerRequirementIds',
          'language', 'languageProfile', 'purpose', 'compileOrder', 'compileAfter',
          'imports', 'exports', 'dependencies', 'interfaces', 'classes',
          'functions', 'implementedApis', 'consumedApis', 'databaseEntities',
          'designerPageId', 'designerComponentIds', 'acceptanceCriteria',
          'allowedConstructs', 'forbiddenConstructs', 'validationRules'
        ]
      }
    }
  },
  required: ['blueprints']
};

export async function getContext(ledger: StageLedger): Promise<string> {
  return '';
}

/**
 * Deterministically constructs application blueprints from contract specifications (No LLM).
 */
export async function runDeterministic(ledger: StageLedger): Promise<any> {
  const planner = ledger.read('planner') || {};
  const architect = ledger.read('architect') || {};
  const system = ledger.read('system') || {};
  const designer = ledger.read('designer') || {};

  const filesList = architect.projectStructure?.files || [];
  const modules = architect.modules || [];
  const apis = system.apis || [];
  const dbEntities = system.database?.entities || [];
  const pages = designer.pages || [];
  const components = designer.components || [];

  const blueprints: any[] = [];

  // Helper: Detect language/profile from file extension
  const getLanguageDetails = (filepath: string) => {
    const ext = path.extname(filepath).toLowerCase();
    switch (ext) {
      case '.html': return { language: 'HTML', profile: 'HTML' };
      case '.css': return { language: 'CSS', profile: 'CSS' };
      case '.scss': return { language: 'SCSS', profile: 'SCSS' };
      case '.js': return { language: 'JavaScript', profile: 'JavaScript' };
      case '.jsx': return { language: 'JSX', profile: 'JSX' };
      case '.ts': return { language: 'TypeScript', profile: 'TypeScript' };
      case '.tsx': return { language: 'TSX', profile: 'TypeScript' };
      case '.py': return { language: 'Python', profile: 'Python' };
      case '.json': return { language: 'JSON', profile: 'JSON' };
      case '.sql': return { language: 'SQL', profile: 'SQL' };
      case '.sh': return { language: 'Bash', profile: 'Bash' };
      default: return { language: 'Generic Text', profile: 'YAML' };
    }
  };

  // Helper: Assign compile order based on file semantics (Topological Build Order)
  const getCompileOrder = (filepath: string) => {
    const name = filepath.toLowerCase();
    if (name.includes('config') || name.includes('constant') || name.includes('types') || name.includes('db')) {
      return 1; // Infrastructure/configuration compiles first
    }
    if (name.includes('entity') || name.includes('model') || name.includes('schema')) {
      return 2; // Database layer
    }
    if (name.includes('service') || name.includes('util') || name.includes('helper')) {
      return 3; // Helper/Service layer
    }
    if (name.includes('controller') || name.includes('route') || name.includes('api')) {
      return 4; // API endpoints/routing
    }
    if (name.includes('component') || name.includes('page') || name.includes('view')) {
      return 5; // UI/Components
    }
    return 6; // Entry points (e.g. index.html, index.js, app.js)
  };

  for (let idx = 0; idx < filesList.length; idx++) {
    const fileEntry = filesList[idx];
    const filepath = fileEntry.path;
    const moduleName = fileEntry.module;

    const langInfo = getLanguageDetails(filepath);
    const order = getCompileOrder(filepath);

    // Locate owning module
    const owningModule = modules.find((m: any) => m.id === moduleName || m.name === moduleName) || {};
    const moduleId = owningModule.id || moduleName || 'm_unknown';
    const featureIds = owningModule.supportsFeatures || [];
    
    // Trace requirement IDs from planner matching features
    const plannerRequirementIds: string[] = [];
    if (planner.features) {
      planner.features.forEach((feat: any) => {
        if (featureIds.includes(feat.id) && feat.requirements) {
          plannerRequirementIds.push(...feat.requirements);
        }
      });
    }

    // Trace APIs matching features/module
    const implementedApis: string[] = [];
    const consumedApis: string[] = [];
    apis.forEach((api: any) => {
      if (featureIds.includes(api.featureId)) {
        implementedApis.push(api.id);
      }
    });

    // Trace DB Entities
    const databaseEntities: string[] = [];
    if (filepath.includes('db') || filepath.includes('model') || filepath.includes('schema') || filepath.includes('entity')) {
      dbEntities.forEach((ent: any) => {
        databaseEntities.push(ent.id);
      });
    }

    // UI elements mappings
    let designerPageId: string | null = null;
    const designerComponentIds: string[] = [];

    const pageMatch = pages.find((p: any) => p.name && filepath.toLowerCase().includes(p.name.toLowerCase()));
    if (pageMatch) {
      designerPageId = pageMatch.id;
    }

    components.forEach((comp: any) => {
      if (comp.name && filepath.toLowerCase().includes(comp.name.toLowerCase())) {
        designerComponentIds.push(comp.id);
      }
    });

    // Validation rules & constraints based on file language
    const allowedConstructs: string[] = [];
    const forbiddenConstructs: string[] = [];
    const validationRules: string[] = [];

    if (langInfo.language === 'CSS') {
      forbiddenConstructs.push('HTML', 'script', 'javascript');
      validationRules.push('Must parse as valid CSS syntax');
    } else if (langInfo.language === 'HTML') {
      forbiddenConstructs.push('inline-style', 'inline-javascript');
      validationRules.push('Must parse as valid HTML5 markup');
    } else if (langInfo.language === 'TypeScript' || langInfo.language === 'TSX') {
      validationRules.push('Must compile cleanly with no TypeScript diagnostics errors');
    }

    blueprints.push({
      id: `BP_${String(idx + 1).padStart(3, '0')}`,
      file: filepath,
      moduleId,
      featureIds,
      plannerRequirementIds,
      language: langInfo.language,
      languageProfile: langInfo.profile,
      purpose: owningModule.purpose || `Implements features for module: ${owningModule.name || moduleName}`,
      compileOrder: order,
      compileAfter: [], // Populated dynamically in topological ordering pass
      imports: [],
      exports: [],
      dependencies: [],
      interfaces: [],
      classes: [],
      functions: [],
      implementedApis,
      consumedApis,
      databaseEntities,
      designerPageId,
      designerComponentIds,
      acceptanceCriteria: owningModule.purpose ? [owningModule.purpose] : ['Must fulfill architectural constraints'],
      allowedConstructs,
      forbiddenConstructs,
      validationRules
    });
  }

  // Topological sorting step: Populate compileAfter referencing files with lower compileOrder
  blueprints.forEach((bp: any) => {
    blueprints.forEach((other: any) => {
      if (other.compileOrder < bp.compileOrder) {
        bp.compileAfter.push(other.id);
      }
    });
  });

  return { blueprints };
}
