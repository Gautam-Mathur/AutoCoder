import { StageLedger } from '../memory';
import { resolveReferences } from '../knowledge/referenceResolver';
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
          designerPageId: { type: 'string' },
          designerComponentIds: { type: 'array', items: { type: 'string' } },
          acceptanceCriteria: { type: 'array', items: { type: 'string' } },
          allowedConstructs: { type: 'array', items: { type: 'string' } },
          forbiddenConstructs: { type: 'array', items: { type: 'string' } },
          validationRules: { type: 'array', items: { type: 'string' } }
        }
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
  const planner = ledger.query('Blueprinter', { fromAgent: 'Planner', select: ['features'] }) || {};
  const architect = ledger.read('architect') || {};
  const system = ledger.query('Blueprinter', { fromAgent: 'System', select: ['database', 'apis', 'services'] }) || {};
  const designer = ledger.query('Blueprinter', { fromAgent: 'Designer', select: ['pages', 'components'] }) || {};

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
    const name = path.basename(filepath).toLowerCase();
    const HTML_ENTRY_PATTERN = /^(index|main|app)\.(html|htm)$/i;
    if (HTML_ENTRY_PATTERN.test(name)) {
      return 999;
    }
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
      const matchesFeature = featureIds.includes(api.featureId) ||
        (Array.isArray(api.supportsFeatures) && api.supportsFeatures.some((fId: string) => featureIds.includes(fId)));
      if (matchesFeature) {
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

    // Resolve dynamic module dependencies
    const dependencyModuleNames: string[] = owningModule.dependsOn || [];
    const moduleFileDependencies = filesList
      .filter((f: any) => dependencyModuleNames.includes(f.module) && f.path !== filepath)
      .map((f: any) => f.path);

    // Resolve symbols used / imported
    const fileImports: string[] = [];
    const fileExports: string[] = [];

    if (langInfo.language === 'TypeScript' || langInfo.language === 'TSX' || langInfo.language === 'JavaScript') {
      apis.forEach((api: any) => {
        if (api.id && (owningModule.purpose?.includes(api.id) || filepath.includes(api.id))) {
          fileImports.push(api.id);
        }
      });
      components.forEach((comp: any) => {
        if (comp.name && filepath.includes(comp.name)) {
          fileExports.push(comp.name);
        }
      });
    }

    // Resolve targeted reference guidelines on-demand
    const requestedRefKeys: string[] = [];
    const designerText = JSON.stringify(designer).toLowerCase();
    const systemText = JSON.stringify(system).toLowerCase();
    const plannerText = JSON.stringify(planner).toLowerCase();
    const normFile = filepath.toLowerCase();

    // UI & Web Design References
    if (langInfo.language === 'CSS' || langInfo.language === 'HTML' || normFile.includes('style') || normFile.includes('app.css') || normFile.includes('globals.css')) {
      requestedRefKeys.push('modern_web_design');
    }
    if (designerText.includes('glassmorphism') || designerText.includes('frosted glass')) {
      if (langInfo.language === 'CSS' || langInfo.language === 'HTML' || designerComponentIds.length > 0 || normFile.includes('style')) {
        requestedRefKeys.push('glassmorphism');
      }
    }
    if (designerText.includes('svg') || designerText.includes('chart') || designerText.includes('sparkline') || normFile.includes('chart')) {
      if (langInfo.language === 'HTML' || langInfo.language === 'TSX' || langInfo.language === 'JSX' || normFile.includes('component')) {
        requestedRefKeys.push('svg_charts');
      }
    }
    if (designerText.includes('dark') || plannerText.includes('dark')) {
      if (langInfo.language === 'CSS' || langInfo.language === 'HTML' || normFile.includes('style')) {
        requestedRefKeys.push('dark_theme');
      }
    }

    // Frameworks & Languages References
    if (langInfo.language === 'TSX' || langInfo.language === 'JSX' || plannerText.includes('react') || normFile.includes('component')) {
      requestedRefKeys.push('react');
    }
    if (langInfo.language === 'TypeScript' || langInfo.language === 'TSX') {
      requestedRefKeys.push('typescript');
    }
    if (systemText.includes('express') || normFile.includes('server') || normFile.includes('route')) {
      requestedRefKeys.push('express');
    }

    // Architecture & Security References
    if (systemText.includes('rest') || normFile.includes('route') || normFile.includes('api') || normFile.includes('controller')) {
      requestedRefKeys.push('rest_api');
    }
    if (normFile.includes('auth') || normFile.includes('user') || normFile.includes('form') || normFile.includes('security')) {
      requestedRefKeys.push('owasp_web_security');
    }
    if (systemText.includes('jwt') || normFile.includes('auth') || normFile.includes('jwt')) {
      requestedRefKeys.push('jwt_auth');
    }

    // Databases & Capabilities References
    if (systemText.includes('sqlite') || normFile.includes('db') || normFile.includes('database') || normFile.includes('schema') || normFile.includes('model')) {
      requestedRefKeys.push('sqlite_db');
    }
    if (plannerText.includes('local storage') || plannerText.includes('localstorage') || normFile.includes('storage') || normFile.includes('store')) {
      requestedRefKeys.push('local_storage');
    }
    if (normFile.includes('service') || normFile.includes('api') || normFile.includes('client') || normFile.includes('fetch')) {
      requestedRefKeys.push('fetch_client');
    }

    const resolvedRefDocs = resolveReferences(requestedRefKeys);

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
      imports: fileImports,
      exports: fileExports,
      dependencies: moduleFileDependencies,
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
      validationRules,
      references: resolvedRefDocs
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

  // Inject script and link stylesheet requirements into HTML entry points using path-relative calculations
  const HTML_ENTRY_PATTERN = /^(index|main|app)\.(html|htm)$/i;
  blueprints.forEach((bp: any) => {
    if (HTML_ENTRY_PATTERN.test(path.basename(bp.file))) {
      // Find JS siblings
      const jsSiblings = blueprints.filter(
        (other: any) => /\.(js|mjs|jsx)$/i.test(other.file) && other.file !== bp.file
      );
      jsSiblings.forEach((jsBp: any) => {
        const relPath = path.relative(path.dirname(bp.file), jsBp.file).replace(/\\/g, '/');
        bp.consumedApis.push(
          `REQUIRED: Include <script src="${relPath}"></script> in the HTML body to load script assets.`
        );
      });

      // Find CSS siblings
      const cssSiblings = blueprints.filter(
        (other: any) => /\.css$/i.test(other.file) && other.file !== bp.file
      );
      cssSiblings.forEach((cssBp: any) => {
        const relPath = path.relative(path.dirname(bp.file), cssBp.file).replace(/\\/g, '/');
        bp.consumedApis.push(
          `REQUIRED: Include <link rel="stylesheet" href="${relPath}"> in the HTML <head> to load style assets.`
        );
      });
    }
  });

  return { blueprints };
}
