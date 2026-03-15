import type { CodebaseAnalysis, FileNode, ImportEdge } from './codebase-analyzer.js';

export interface DataFlowTrace {
  entity: string;
  definedIn: string;
  usedIn: string[];
  flow: DataFlowStep[];
}

export interface DataFlowStep {
  file: string;
  action: 'define' | 'import' | 'query' | 'mutate' | 'render' | 'export' | 'validate' | 'transform';
  symbol: string;
  detail?: string;
}

export interface ComponentTree {
  name: string;
  file: string;
  children: ComponentTree[];
  props: string[];
  depth: number;
}

export interface RouteMap {
  path: string;
  method: string;
  handler: string;
  file: string;
  middlewares: string[];
  relatedEntity?: string;
  relatedPage?: string;
}

export interface CrossFileReport {
  dataFlows: DataFlowTrace[];
  componentTree: ComponentTree[];
  routeMap: RouteMap[];
  hotFiles: { path: string; inDegree: number; outDegree: number; score: number }[];
  layerMap: { layer: string; files: string[] }[];
  brokenLinks: { from: string; to: string; symbol: string }[];
}

export function traceCrossFileRelationships(analysis: CodebaseAnalysis): CrossFileReport {
  const dataFlows = traceDataFlows(analysis);
  const componentTree = buildComponentTree(analysis);
  const routeMap = buildRouteMap(analysis);
  const hotFiles = findHotFiles(analysis);
  const layerMap = detectLayers(analysis);
  const brokenLinks = findBrokenLinks(analysis);

  return { dataFlows, componentTree, routeMap, hotFiles, layerMap, brokenLinks };
}

function traceDataFlows(analysis: CodebaseAnalysis): DataFlowTrace[] {
  const flows: DataFlowTrace[] = [];

  for (const model of analysis.models) {
    const flow: DataFlowStep[] = [];
    const usedIn: string[] = [];

    flow.push({
      file: model.filePath,
      action: 'define',
      symbol: model.name,
      detail: `Schema/model definition with ${model.fields.length} fields`,
    });

    for (const [path, node] of Array.from(analysis.graph.nodes.entries())) {
      if (path === model.filePath) continue;

      const importsModel = node.imports.some(imp =>
        imp.importedSymbols.some((s: string) => s === model.name || s === model.name.toLowerCase() || s === `${model.name}Schema` || s === `insert${model.name}Schema`)
      );

      if (importsModel) {
        usedIn.push(path);

        let action: DataFlowStep['action'] = 'import';
        if (node.category === 'route') action = 'query';
        else if (node.category === 'page') action = 'render';
        else if (node.category === 'component') action = 'render';
        else if (node.category === 'model') action = 'transform';

        const hasWrite = node.exports.some(e =>
          /create|insert|update|delete|add|remove|save|put|post|patch/i.test(e.name)
        );
        if (hasWrite) action = 'mutate';

        flow.push({ file: path, action, symbol: model.name, detail: `Used in ${node.category}` });
      }
    }

    flows.push({ entity: model.name, definedIn: model.filePath, usedIn, flow });
  }

  return flows;
}

function buildComponentTree(analysis: CodebaseAnalysis): ComponentTree[] {
  const compMap = new Map<string, { name: string; file: string; children: string[]; props: string[] }>();
  for (const comp of analysis.components) {
    compMap.set(comp.name, { name: comp.name, file: comp.filePath, children: comp.childComponents, props: comp.props.map(p => p.name) });
  }

  const childOf = new Set<string>();
  for (const comp of analysis.components) {
    for (const child of comp.childComponents) {
      childOf.add(child);
    }
  }

  const roots = analysis.components.filter(c => !childOf.has(c.name));

  function buildTree(name: string, depth: number, visited: Set<string>): ComponentTree | null {
    if (visited.has(name) || depth > 10) return null;
    visited.add(name);

    const info = compMap.get(name);
    if (!info) return { name, file: '', children: [], props: [], depth };

    const children: ComponentTree[] = [];
    for (const childName of info.children) {
      const childTree = buildTree(childName, depth + 1, new Set(visited));
      if (childTree) children.push(childTree);
    }

    return { name: info.name, file: info.file, children, props: info.props, depth };
  }

  const trees: ComponentTree[] = [];
  for (const root of roots) {
    const tree = buildTree(root.name, 0, new Set<string>());
    if (tree) trees.push(tree);
  }

  return trees;
}

function buildRouteMap(analysis: CodebaseAnalysis): RouteMap[] {
  const routeMap: RouteMap[] = [];

  for (const route of analysis.routes) {
    const entityGuess = route.path.split('/').filter(Boolean).find(p => !p.startsWith(':') && p !== 'api' && p !== 'v1' && p !== 'v2');
    const entityName = entityGuess ? entityGuess.charAt(0).toUpperCase() + entityGuess.slice(1).replace(/s$/, '') : undefined;

    const matchingPage = analysis.components.find(c => {
      if (!c.routePath) return false;
      const cleanRoute = route.path.replace(/:\w+/g, ':id');
      const cleanPage = c.routePath.replace(/:\w+/g, ':id');
      return cleanRoute === cleanPage || route.path.includes(entityGuess || '___never___');
    });

    routeMap.push({
      path: route.path,
      method: route.method,
      handler: route.handlerFile,
      file: route.handlerFile,
      middlewares: route.middlewares,
      relatedEntity: entityName,
      relatedPage: matchingPage?.name,
    });
  }

  return routeMap;
}

function findHotFiles(analysis: CodebaseAnalysis): { path: string; inDegree: number; outDegree: number; score: number }[] {
  const inDegree = new Map<string, number>();
  const outDegree = new Map<string, number>();

  for (const edge of analysis.graph.edges) {
    inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
    outDegree.set(edge.from, (outDegree.get(edge.from) || 0) + 1);
  }

  const results: { path: string; inDegree: number; outDegree: number; score: number }[] = [];
  for (const [path] of Array.from(analysis.graph.nodes.entries())) {
    const inD = inDegree.get(path) || 0;
    const outD = outDegree.get(path) || 0;
    const score = inD * 2 + outD;
    if (score > 2) {
      results.push({ path, inDegree: inD, outDegree: outD, score });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 20);
}

function detectLayers(analysis: CodebaseAnalysis): { layer: string; files: string[] }[] {
  const layers = new Map<string, string[]>();

  for (const [path, node] of Array.from(analysis.graph.nodes.entries())) {
    let layer = 'other';

    if (node.category === 'page') layer = 'pages';
    else if (node.category === 'component') layer = 'components';
    else if (node.category === 'route') layer = 'api';
    else if (node.category === 'model') layer = 'data';
    else if (node.category === 'middleware') layer = 'middleware';
    else if (node.category === 'config') layer = 'config';
    else if (node.category === 'test') layer = 'test';
    else if (node.category === 'style') layer = 'styles';
    else if (node.category === 'util') layer = 'utilities';
    else if (path.includes('hook') || path.includes('hooks/')) layer = 'hooks';
    else if (path.includes('store') || path.includes('redux') || path.includes('zustand')) layer = 'state';
    else if (path.includes('service') || path.includes('api/')) layer = 'services';

    if (!layers.has(layer)) layers.set(layer, []);
    layers.get(layer)!.push(path);
  }

  const result: { layer: string; files: string[] }[] = [];
  for (const [layer, files] of Array.from(layers.entries())) {
    result.push({ layer, files });
  }

  const layerOrder = ['pages', 'components', 'hooks', 'state', 'services', 'api', 'middleware', 'data', 'utilities', 'config', 'styles', 'test', 'other'];
  result.sort((a, b) => layerOrder.indexOf(a.layer) - layerOrder.indexOf(b.layer));

  return result;
}

function findBrokenLinks(analysis: CodebaseAnalysis): { from: string; to: string; symbol: string }[] {
  const broken: { from: string; to: string; symbol: string }[] = [];

  for (const edge of analysis.graph.edges) {
    const targetNode = analysis.graph.nodes.get(edge.to);
    if (!targetNode && !edge.to.includes('node_modules')) {
      const symbol = edge.importedSymbols.length > 0 ? edge.importedSymbols.join(', ') : 'unknown';
      broken.push({ from: edge.from, to: edge.to, symbol });
    }
  }

  return broken.slice(0, 20);
}