import ts from 'typescript';
import { prisma } from '../../db';
import { listVirtualFiles, readVirtualFile, writeVirtualFile, sanitizePath } from './vfs';
import { NodeType, EdgeType } from './ledgerTypes';

export interface GraphNodeInput {
  id: string;
  type: NodeType;
  title: string;
  summary?: string;
  payload: Record<string, any>;
}

export interface GraphEdgeInput {
  sourceId: string;
  targetId: string;
  type: EdgeType;
  metadata?: Record<string, any>;
}

export interface StructuralGraphResult {
  nodes: GraphNodeInput[];
  edges: GraphEdgeInput[];
  warnings: string[];
  errors: string[];
}

export interface BlueprintFileSection {
  file: string;
  purpose: string;
  dependencies: string[];
  specsRequired: string[];
  exports: string[];
  details?: string;
  rawSection?: string;
}

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

/**
 * Derives stable Node ID for a File node.
 */
export function fileNodeId(conversationId: string, filePath: string): string {
  const clean = filePath.replace(/\\/g, '/').replace(/^[/\\]+/, '').toLowerCase();
  return `file:${conversationId}:${clean}`;
}

/**
 * Derives stable Node ID for a Symbol node.
 */
export function symbolNodeId(conversationId: string, filePath: string, symbolName: string): string {
  const clean = filePath.replace(/\\/g, '/').replace(/^[/\\]+/, '').toLowerCase();
  return `symbol:${conversationId}:${clean}:${symbolName}`;
}

/**
 * Resolves an import module specifier relative to the importing file against the VFS file set.
 */
function resolveImportPath(importingFilePath: string, specifier: string, vfsFiles: Set<string>): string | null {
  if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
    // Non-relative import — check if exact match exists in VFS
    const cleanSpec = specifier.replace(/\\/g, '/').replace(/^[/\\]+/, '').toLowerCase();
    if (vfsFiles.has(cleanSpec)) return cleanSpec;
    return null;
  }

  const dir = importingFilePath.includes('/')
    ? importingFilePath.substring(0, importingFilePath.lastIndexOf('/'))
    : '';

  let rawTarget = specifier.startsWith('/')
    ? specifier.substring(1)
    : (dir ? `${dir}/${specifier}` : specifier);

  // Normalize path segments (e.g. foo/bar/../baz -> foo/baz)
  const parts = rawTarget.replace(/\\/g, '/').split('/');
  const stack: string[] = [];
  for (const part of parts) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      if (stack.length > 0) stack.pop();
    } else {
      stack.push(part);
    }
  }
  const baseTarget = stack.join('/').toLowerCase();

  const extensionsToTry = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
  for (const ext of extensionsToTry) {
    const candidate = baseTarget + ext;
    if (vfsFiles.has(candidate)) {
      return candidate;
    }
  }

  return null;
}

/**
 * Builds structural graph from VFS files using TypeScript AST parser.
 */
export async function buildStructuralGraph(conversationId: string): Promise<StructuralGraphResult> {
  const allFiles = await listVirtualFiles(conversationId);
  const normalizedVfsFiles = new Map<string, string>();
  for (const f of allFiles) {
    normalizedVfsFiles.set(f.replace(/\\/g, '/').replace(/^[/\\]+/, '').toLowerCase(), f);
  }
  const vfsFileSet = new Set(normalizedVfsFiles.keys());

  const nodes: GraphNodeInput[] = [];
  const edges: GraphEdgeInput[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  const processedNodeIds = new Set<string>();

  for (const originalFilePath of allFiles) {
    const ext = originalFilePath.substring(originalFilePath.lastIndexOf('.')).toLowerCase();
    if (!SOURCE_EXTENSIONS.has(ext)) continue;

    const normalizedPath = originalFilePath.replace(/\\/g, '/').replace(/^[/\\]+/, '').toLowerCase();
    const content = await readVirtualFile(conversationId, originalFilePath);
    if (content === null) continue;

    const fNodeId = fileNodeId(conversationId, normalizedPath);
    if (!processedNodeIds.has(fNodeId)) {
      processedNodeIds.add(fNodeId);
      nodes.push({
        id: fNodeId,
        type: 'FILE',
        title: originalFilePath,
        summary: `Source file ${originalFilePath}`,
        payload: {
          path: originalFilePath,
          extension: ext,
          language: ext.includes('ts') ? 'typescript' : 'javascript',
        },
      });
    }

    // Parse source code with TypeScript compiler API
    let sourceFile: ts.SourceFile;
    try {
      sourceFile = ts.createSourceFile(
        originalFilePath,
        content,
        ts.ScriptTarget.Latest,
        true
      );
    } catch (err: any) {
      warnings.push(`AST Parse warning for ${originalFilePath}: ${err.message}`);
      continue;
    }

    const fileSymbols = new Set<string>();

    function addSymbolNode(name: string, kind: string, isExported: boolean) {
      if (!name || fileSymbols.has(name)) return;
      fileSymbols.add(name);

      const sNodeId = symbolNodeId(conversationId, normalizedPath, name);
      if (!processedNodeIds.has(sNodeId)) {
        processedNodeIds.add(sNodeId);
        nodes.push({
          id: sNodeId,
          type: 'SYMBOL',
          title: name,
          summary: `${kind} "${name}" in ${originalFilePath}`,
          payload: { name, kind, file: originalFilePath, isExported },
        });
      }

      // Add CONTAINS edge
      edges.push({
        sourceId: fNodeId,
        targetId: sNodeId,
        type: 'CONTAINS',
      });

      // Add EXPORTS edge if exported
      if (isExported) {
        edges.push({
          sourceId: fNodeId,
          targetId: sNodeId,
          type: 'EXPORTS',
        });
      }
    }

    function checkExportModifier(node: ts.Node): boolean {
      const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
      return !!modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    }

    function visit(node: ts.Node) {
      if (ts.isFunctionDeclaration(node) && node.name) {
        addSymbolNode(node.name.text, 'function', checkExportModifier(node));
      } else if (ts.isClassDeclaration(node) && node.name) {
        addSymbolNode(node.name.text, 'class', checkExportModifier(node));
      } else if (ts.isInterfaceDeclaration(node) && node.name) {
        addSymbolNode(node.name.text, 'interface', checkExportModifier(node));
      } else if (ts.isTypeAliasDeclaration(node) && node.name) {
        addSymbolNode(node.name.text, 'type', checkExportModifier(node));
      } else if (ts.isVariableStatement(node)) {
        const isExported = checkExportModifier(node);
        for (const decl of node.declarationList.declarations) {
          if (ts.isIdentifier(decl.name)) {
            addSymbolNode(decl.name.text, 'variable', isExported);
          }
        }
      } else if (ts.isImportDeclaration(node)) {
        const moduleSpec = (node.moduleSpecifier as ts.StringLiteral).text;
        const targetPath = resolveImportPath(normalizedPath, moduleSpec, vfsFileSet);

        if (targetPath) {
          const targetNodeId = fileNodeId(conversationId, targetPath);
          edges.push({
            sourceId: fNodeId,
            targetId: targetNodeId,
            type: 'IMPORTS',
            metadata: { specifier: moduleSpec },
          });
        } else if (moduleSpec.startsWith('.') || moduleSpec.startsWith('/')) {
          warnings.push(`Broken import in "${originalFilePath}": target "${moduleSpec}" not found in VFS.`);
        }
      } else if (ts.isExportDeclaration(node)) {
        if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
          const moduleSpec = node.moduleSpecifier.text;
          const targetPath = resolveImportPath(normalizedPath, moduleSpec, vfsFileSet);
          if (targetPath) {
            const targetNodeId = fileNodeId(conversationId, targetPath);
            edges.push({
              sourceId: fNodeId,
              targetId: targetNodeId,
              type: 'IMPORTS',
              metadata: { specifier: moduleSpec, reexport: true },
            });
          }
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  }

  return { nodes, edges, warnings, errors };
}

import { resolveModule, parseTsConfigOptions } from './module-resolver';

/**
 * Persists derived structural graph nodes and edges into Prisma database after clearing stale records.
 */
export async function persistStructuralGraph(
  conversationId: string,
  graph: StructuralGraphResult
): Promise<void> {
  // Clear stale graph state prior to persisting fresh derived graph
  await prisma.graphEdge.deleteMany({ where: { conversationId } });
  await prisma.graphNode.deleteMany({ where: { conversationId } });

  // Upsert all nodes
  for (const node of graph.nodes) {
    await prisma.graphNode.upsert({
      where: { id: node.id },
      update: {
        title: node.title,
        summary: node.summary || null,
        payload: JSON.stringify(node.payload),
        type: node.type,
      },
      create: {
        id: node.id,
        conversationId,
        type: node.type,
        title: node.title,
        summary: node.summary || null,
        payload: JSON.stringify(node.payload),
      },
    });
  }

  // Create unique edges
  for (const edge of graph.edges) {
    await prisma.graphEdge.upsert({
      where: {
        conversationId_sourceNodeId_targetNodeId_type: {
          conversationId,
          sourceNodeId: edge.sourceId,
          targetNodeId: edge.targetId,
          type: edge.type,
        },
      },
      update: {
        metadata: edge.metadata ? JSON.stringify(edge.metadata) : null,
      },
      create: {
        conversationId,
        sourceNodeId: edge.sourceId,
        targetNodeId: edge.targetId,
        type: edge.type,
        metadata: edge.metadata ? JSON.stringify(edge.metadata) : null,
      },
    });
  }
}

/**
 * Builds and persists structural graph for a conversation in one call.
 */
export async function buildAndPersistStructuralGraph(
  conversationId: string
): Promise<StructuralGraphResult> {
  const result = await buildStructuralGraph(conversationId);
  await persistStructuralGraph(conversationId, result);
  return result;
}

// ─── Graph Query API ─────────────────────────────────────────────────────────

export async function getFileDependencies(conversationId: string, filePath: string): Promise<string[]> {
  const fNodeId = fileNodeId(conversationId, filePath);
  const edges = await prisma.graphEdge.findMany({
    where: { conversationId, sourceNodeId: fNodeId, type: 'IMPORTS' },
    include: { targetNode: true },
  });
  return edges.map((e) => e.targetNode.title);
}

export async function getFileDependents(conversationId: string, filePath: string): Promise<string[]> {
  const fNodeId = fileNodeId(conversationId, filePath);
  const edges = await prisma.graphEdge.findMany({
    where: { conversationId, targetNodeId: fNodeId, type: 'IMPORTS' },
    include: { sourceNode: true },
  });
  return edges.map((e) => e.sourceNode.title);
}

export async function getFileSymbols(conversationId: string, filePath: string): Promise<string[]> {
  const fNodeId = fileNodeId(conversationId, filePath);
  const edges = await prisma.graphEdge.findMany({
    where: { conversationId, sourceNodeId: fNodeId, type: 'CONTAINS' },
    include: { targetNode: true },
  });
  return edges.map((e) => e.targetNode.title);
}

export async function findDependencyCycles(conversationId: string): Promise<string[][]> {
  const edges = await prisma.graphEdge.findMany({
    where: { conversationId, type: 'IMPORTS' },
    select: { sourceNodeId: true, targetNodeId: true },
  });

  const adj = new Map<string, string[]>();
  const nodes = new Set<string>();

  for (const edge of edges) {
    nodes.add(edge.sourceNodeId);
    nodes.add(edge.targetNodeId);
    if (!adj.has(edge.sourceNodeId)) adj.set(edge.sourceNodeId, []);
    adj.get(edge.sourceNodeId)!.push(edge.targetNodeId);
  }

  const cycles: string[][] = [];
  const visited = new Set<string>();
  const stack = new Set<string>();
  const path: string[] = [];

  function dfs(curr: string) {
    visited.add(curr);
    stack.add(curr);
    path.push(curr);

    const neighbors = adj.get(curr) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      } else if (stack.has(neighbor)) {
        const cycleStart = path.indexOf(neighbor);
        if (cycleStart !== -1) {
          cycles.push(path.slice(cycleStart).map((id) => id.split(':').pop() || id));
        }
      }
    }

    path.pop();
    stack.delete(curr);
  }

  for (const n of nodes) {
    if (!visited.has(n)) {
      dfs(n);
    }
  }

  return cycles;
}

export async function getSubgraph(
  conversationId: string,
  nodeId: string,
  depth: number = 1
): Promise<StructuralGraphResult> {
  const visitedNodes = new Map<string, GraphNodeInput>();
  const visitedEdges = new Map<string, GraphEdgeInput>();

  async function traverse(currId: string, currDepth: number) {
    if (currDepth < 0 || visitedNodes.has(currId)) return;

    const dbNode = await prisma.graphNode.findUnique({ where: { id: currId } });
    if (!dbNode) return;

    visitedNodes.set(currId, {
      id: dbNode.id,
      type: dbNode.type as NodeType,
      title: dbNode.title,
      summary: dbNode.summary || undefined,
      payload: dbNode.payload ? JSON.parse(dbNode.payload) : {},
    });

    if (currDepth === 0) return;

    const outgoing = await prisma.graphEdge.findMany({ where: { conversationId, sourceNodeId: currId } });
    for (const edge of outgoing) {
      const edgeKey = `${edge.sourceNodeId}->${edge.type}->${edge.targetNodeId}`;
      if (!visitedEdges.has(edgeKey)) {
        visitedEdges.set(edgeKey, {
          sourceId: edge.sourceNodeId,
          targetId: edge.targetNodeId,
          type: edge.type as EdgeType,
          metadata: edge.metadata ? JSON.parse(edge.metadata) : undefined,
        });
      }
      await traverse(edge.targetNodeId, currDepth - 1);
    }

    const incoming = await prisma.graphEdge.findMany({ where: { conversationId, targetNodeId: currId } });
    for (const edge of incoming) {
      const edgeKey = `${edge.sourceNodeId}->${edge.type}->${edge.targetNodeId}`;
      if (!visitedEdges.has(edgeKey)) {
        visitedEdges.set(edgeKey, {
          sourceId: edge.sourceNodeId,
          targetId: edge.targetNodeId,
          type: edge.type as EdgeType,
          metadata: edge.metadata ? JSON.parse(edge.metadata) : undefined,
        });
      }
      await traverse(edge.sourceNodeId, currDepth - 1);
    }
  }

  await traverse(nodeId, depth);

  return {
    nodes: Array.from(visitedNodes.values()),
    edges: Array.from(visitedEdges.values()),
    warnings: [],
    errors: [],
  };
}

// ─── Architecture Drift Detector ──────────────────────────────────────────────

export async function detectAndPersistArchitectureDrift(
  conversationId: string,
  blueprintSections: BlueprintFileSection[]
): Promise<string> {
  const graph = await buildStructuralGraph(conversationId);
  const actualVfsFiles = await listVirtualFiles(conversationId);
  const actualFileSet = new Set(actualVfsFiles.map((f) => f.replace(/\\/g, '/').replace(/^[/\\]+/, '').toLowerCase()));

  const blueprintFileMap = new Map<string, BlueprintFileSection>();
  for (const s of blueprintSections) {
    blueprintFileMap.set(s.file.replace(/\\/g, '/').replace(/^[/\\]+/, '').toLowerCase(), s);
  }

  const missingImplementations: string[] = [];
  const unplannedFiles: string[] = [];
  const dependencyDrifts: string[] = [];
  const brokenImports: string[] = [...graph.warnings];
  const dependencyCycles = await findDependencyCycles(conversationId);

  // 1. Missing implementations (in blueprint, absent from VFS)
  for (const [normBpFile, section] of blueprintFileMap.entries()) {
    if (!actualFileSet.has(normBpFile)) {
      missingImplementations.push(section.file);
    }
  }

  // 2. Unplanned files (in VFS, absent from blueprint)
  for (const actualFile of actualVfsFiles) {
    const normActual = actualFile.replace(/\\/g, '/').replace(/^[/\\]+/, '').toLowerCase();
    // Exclude markdown specs/reports
    if (actualFile.endsWith('.md')) continue;
    if (!blueprintFileMap.has(normActual)) {
      unplannedFiles.push(actualFile);
    }
  }

  // 3. Symmetric Dependency Drifts (declared vs actual imports)
  for (const [normBpFile, section] of blueprintFileMap.entries()) {
    if (!actualFileSet.has(normBpFile)) continue;
    const actualDeps = await getFileDependencies(conversationId, section.file);
    const actualDepSet = new Set(actualDeps.map((d) => d.replace(/\\/g, '/').replace(/^[/\\]+/, '').toLowerCase()));

    const declaredSet = new Set<string>();
    for (const declaredDep of section.dependencies) {
      if (declaredDep === 'None') continue;
      const normDeclared = declaredDep.replace(/\\/g, '/').replace(/^[/\\]+/, '').toLowerCase();
      declaredSet.add(normDeclared);
      if (!actualDepSet.has(normDeclared)) {
        dependencyDrifts.push(`${section.file}: Blueprint declared dependency "${declaredDep}" is not imported in code.`);
      }
    }

    for (const actualDep of actualDepSet) {
      if (!declaredSet.has(actualDep)) {
        dependencyDrifts.push(`${section.file}: Actual code import "${actualDep}" was not declared in blueprint.`);
      }
    }
  }

  const hasDrift =
    missingImplementations.length > 0 ||
    unplannedFiles.length > 0 ||
    dependencyDrifts.length > 0 ||
    brokenImports.length > 0 ||
    dependencyCycles.length > 0;

  const status = hasDrift ? 'DRIFT_DETECTED' : 'ALIGNED';

  let reportMd = `# Architecture Drift Report\n\n## Overall Status\n\n${status}\n\n`;

  reportMd += `## Missing Implementations\n`;
  if (missingImplementations.length > 0) {
    reportMd += missingImplementations.map((f) => `- \`${f}\``).join('\n') + '\n\n';
  } else {
    reportMd += `None\n\n`;
  }

  reportMd += `## Unplanned Files\n`;
  if (unplannedFiles.length > 0) {
    reportMd += unplannedFiles.map((f) => `- \`${f}\``).join('\n') + '\n\n';
  } else {
    reportMd += `None\n\n`;
  }

  reportMd += `## Dependency Drift\n`;
  if (dependencyDrifts.length > 0) {
    reportMd += dependencyDrifts.map((d) => `- ${d}`).join('\n') + '\n\n';
  } else {
    reportMd += `None\n\n`;
  }

  reportMd += `## Broken Imports\n`;
  if (brokenImports.length > 0) {
    reportMd += brokenImports.map((b) => `- ${b}`).join('\n') + '\n\n';
  } else {
    reportMd += `None\n\n`;
  }

  reportMd += `## Dependency Cycles\n`;
  if (dependencyCycles.length > 0) {
    reportMd += dependencyCycles.map((c) => `- \`${c.join(' -> ')}\``).join('\n') + '\n\n';
  } else {
    reportMd += `None\n\n`;
  }

  reportMd += `## Summary\n\n`;
  reportMd += `- Missing implementations: ${missingImplementations.length}\n`;
  reportMd += `- Unplanned files: ${unplannedFiles.length}\n`;
  reportMd += `- Dependency mismatches: ${dependencyDrifts.length}\n`;
  reportMd += `- Broken imports: ${brokenImports.length}\n`;
  reportMd += `- Cycles: ${dependencyCycles.length}\n`;

  await writeVirtualFile(conversationId, 'architecture_drift_report.md', reportMd);
  return reportMd;
}
