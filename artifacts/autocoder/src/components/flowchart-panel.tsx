import { useMemo, useCallback, useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  Handle,
  Position,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import type { ProjectFile } from "@shared/schema";
import {
  FileCode, Database, Server, Layout, Palette, Settings, Box,
  AlertTriangle, XCircle, Unlink, RefreshCw, ShieldCheck, AlertCircle, Wrench,
} from "lucide-react";

interface FileRelationship {
  source: string;
  target: string;
  label: string;
}

type FileCategory = "config" | "schema" | "server" | "page" | "component" | "hook" | "style" | "other";

type IssueSeverity = "error" | "warning" | "info";
type IssueType = "broken-import" | "circular-dep" | "orphan" | "missing-export" | "empty-file";

interface FileIssue {
  type: IssueType;
  severity: IssueSeverity;
  message: string;
  detail?: string;
}

interface BrokenImportEdge {
  source: string;
  rawImport: string;
}

function categorizeFile(path: string): FileCategory {
  const lower = path.toLowerCase();
  if (lower.endsWith(".css") || lower.endsWith(".scss")) return "style";
  if (lower.includes("schema") || lower.includes("db.ts") || lower.includes("drizzle")) return "schema";
  if (lower.includes("server/") || lower.includes("routes") || lower.includes("auth.ts")) return "server";
  if (lower.includes("pages/") || lower.includes("page.tsx") || lower.includes("page.ts")) return "page";
  if (lower.includes("components/") || lower.includes("component")) return "component";
  if (lower.includes("hooks/") || lower.includes("lib/") || lower.includes("utils")) return "hook";
  if (
    lower.includes("package.json") ||
    lower.includes("tsconfig") ||
    lower.includes("vite.config") ||
    lower.includes("tailwind.config") ||
    lower.includes("postcss") ||
    lower.includes("vitest") ||
    lower.includes(".config")
  )
    return "config";
  return "other";
}

const CATEGORY_COLORS: Record<FileCategory, { bg: string; border: string; text: string; accent: string }> = {
  config: { bg: "#f9fafb", border: "#e5e7eb", text: "#6b7280", accent: "#9ca3af" },
  schema: { bg: "#f0f7ff", border: "#bfdbfe", text: "#3b82f6", accent: "#60a5fa" },
  server: { bg: "#f0fdf4", border: "#bbf7d0", text: "#22c55e", accent: "#4ade80" },
  page: { bg: "#fefce8", border: "#fde68a", text: "#ca8a04", accent: "#facc15" },
  component: { bg: "#ecfeff", border: "#a5f3fc", text: "#06b6d4", accent: "#22d3ee" },
  hook: { bg: "#f5f3ff", border: "#c4b5fd", text: "#7c3aed", accent: "#a78bfa" },
  style: { bg: "#fdf2f8", border: "#f9a8d4", text: "#db2777", accent: "#f472b6" },
  other: { bg: "#f9fafb", border: "#e5e7eb", text: "#6b7280", accent: "#9ca3af" },
};

const CATEGORY_LABELS: Record<FileCategory, string> = {
  config: "Config",
  schema: "Database",
  server: "Server",
  page: "Page",
  component: "Component",
  hook: "Lib / Hook",
  style: "Style",
  other: "Other",
};

function getCategoryIcon(category: FileCategory) {
  switch (category) {
    case "config": return <Settings className="w-3 h-3" />;
    case "schema": return <Database className="w-3 h-3" />;
    case "server": return <Server className="w-3 h-3" />;
    case "page": return <Layout className="w-3 h-3" />;
    case "component": return <Box className="w-3 h-3" />;
    case "hook": return <FileCode className="w-3 h-3" />;
    case "style": return <Palette className="w-3 h-3" />;
    default: return <FileCode className="w-3 h-3" />;
  }
}

function extractExports(content: string): string[] {
  const exports: string[] = [];

  const defaultDeclRegex = /export\s+default\s+(?:function|class|const|let|var)\s+(\w+)/g;
  let m;
  while ((m = defaultDeclRegex.exec(content)) !== null) {
    if (m[1]) { exports.push("default"); exports.push(m[1]); }
  }
  if (exports.indexOf("default") === -1 && /export\s+default\s+/.test(content)) {
    exports.push("default");
  }

  const namedDeclRegex = /export\s+(?:async\s+)?(?:function|class|const|let|var|type|interface|enum)\s+(\w+)/g;
  while ((m = namedDeclRegex.exec(content)) !== null) {
    if (m[1] && !exports.includes(m[1])) exports.push(m[1]);
  }

  const reExportRegex = /export\s*\{([^}]+)\}/g;
  while ((m = reExportRegex.exec(content)) !== null) {
    const names = m[1].split(",").map((n) => n.trim().split(/\s+as\s+/).pop()?.trim()).filter(Boolean);
    for (const name of names) {
      if (name && !exports.includes(name)) exports.push(name);
    }
  }

  if (/export\s*\*\s*from\s+/.test(content)) {
    exports.push("*");
  }

  return exports;
}

function extractImports(content: string): string[] {
  const imports: string[] = [];
  const importRegex = /(?:import\s+(?:[\s\S]*?)\s+from\s+["']([^"']+)["']|import\s+["']([^"']+)["']|require\s*\(\s*["']([^"']+)["']\s*\))/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const path = match[1] || match[2] || match[3];
    if (path) imports.push(path);
  }
  return imports;
}

function extractNamedImports(content: string): { path: string; names: string[] }[] {
  const result: { path: string; names: string[] }[] = [];
  const regex = /import\s+\{([^}]+)\}\s+from\s+["']([^"']+)["']/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const names = match[1].split(",").map((n) => n.trim().split(" as ")[0].trim()).filter(Boolean);
    result.push({ path: match[2], names });
  }
  return result;
}

function resolveImportPath(importPath: string, sourceFile: string, allPaths: string[]): string | null {
  if (importPath.startsWith("@/")) {
    const resolved = "src/" + importPath.slice(2);
    return findMatchingFile(resolved, allPaths);
  }
  if (importPath.startsWith("@shared/")) {
    const resolved = "shared/" + importPath.slice(8);
    return findMatchingFile(resolved, allPaths);
  }
  if (importPath.startsWith("@assets/")) return null;
  if (importPath.startsWith("./") || importPath.startsWith("../")) {
    const sourceDir = sourceFile.split("/").slice(0, -1).join("/");
    const parts = importPath.split("/");
    const resolvedParts = sourceDir ? sourceDir.split("/") : [];
    for (const part of parts) {
      if (part === ".") continue;
      if (part === "..") { resolvedParts.pop(); continue; }
      resolvedParts.push(part);
    }
    const resolved = resolvedParts.join("/");
    return findMatchingFile(resolved, allPaths);
  }
  return null;
}

function findMatchingFile(basePath: string, allPaths: string[]): string | null {
  if (allPaths.includes(basePath)) return basePath;
  const extensions = [".ts", ".tsx", ".js", ".jsx", ".json", ".css"];
  for (const ext of extensions) {
    if (allPaths.includes(basePath + ext)) return basePath + ext;
  }
  for (const ext of extensions) {
    if (allPaths.includes(basePath + "/index" + ext)) return basePath + "/index" + ext;
  }
  return null;
}

function isLocalImport(imp: string): boolean {
  return imp.startsWith("./") || imp.startsWith("../") || imp.startsWith("@/") || imp.startsWith("@shared/");
}

function buildRelationships(files: ProjectFile[]): FileRelationship[] {
  const allPaths = files.map((f) => f.path);
  const relationships: FileRelationship[] = [];
  const seen = new Set<string>();

  for (const file of files) {
    if (!file.content) continue;
    const imports = extractImports(file.content);
    for (const imp of imports) {
      const resolved = resolveImportPath(imp, file.path, allPaths);
      if (resolved && resolved !== file.path) {
        const key = `${file.path}→${resolved}`;
        if (!seen.has(key)) {
          seen.add(key);
          relationships.push({
            source: file.path,
            target: resolved,
            label: "imports",
          });
        }
      }
    }
  }
  return relationships;
}

function detectCircularDeps(relationships: FileRelationship[]): string[][] {
  const graph = new Map<string, string[]>();
  for (const rel of relationships) {
    if (!graph.has(rel.source)) graph.set(rel.source, []);
    graph.get(rel.source)!.push(rel.target);
  }

  const cycles: string[][] = [];
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const path: string[] = [];

  function dfs(node: string) {
    if (inStack.has(node)) {
      const cycleStart = path.indexOf(node);
      if (cycleStart !== -1) {
        cycles.push([...path.slice(cycleStart), node]);
      }
      return;
    }
    if (visited.has(node)) return;
    visited.add(node);
    inStack.add(node);
    path.push(node);

    for (const neighbor of graph.get(node) || []) {
      dfs(neighbor);
    }

    path.pop();
    inStack.delete(node);
  }

  for (const node of graph.keys()) {
    dfs(node);
  }
  return cycles;
}

function analyzeFileIssues(
  files: ProjectFile[],
  relationships: FileRelationship[],
  codeErrors: { file?: string; message: string }[],
  runtimeErrors: { source?: string; message: string }[],
): { issueMap: Map<string, FileIssue[]>; brokenImports: BrokenImportEdge[]; circularEdges: Set<string> } {
  const issueMap = new Map<string, FileIssue[]>();
  const brokenImports: BrokenImportEdge[] = [];
  const allPaths = files.map((f) => f.path);

  const addIssue = (filePath: string, issue: FileIssue) => {
    if (!issueMap.has(filePath)) issueMap.set(filePath, []);
    issueMap.get(filePath)!.push(issue);
  };

  for (const file of files) {
    if (!file.content) continue;
    const imports = extractImports(file.content);
    for (const imp of imports) {
      if (!isLocalImport(imp)) continue;
      const resolved = resolveImportPath(imp, file.path, allPaths);
      if (!resolved) {
        addIssue(file.path, {
          type: "broken-import",
          severity: "error",
          message: `Cannot find '${imp}'`,
          detail: "This import points to a file that doesn't exist in the project",
        });
        brokenImports.push({ source: file.path, rawImport: imp });
      }
    }

    const namedImports = extractNamedImports(file.content);
    for (const ni of namedImports) {
      if (!isLocalImport(ni.path)) continue;
      const resolved = resolveImportPath(ni.path, file.path, allPaths);
      if (!resolved) continue;
      const targetFile = files.find((f) => f.path === resolved);
      if (!targetFile?.content) continue;
      const targetExports = extractExports(targetFile.content);
      if (targetExports.includes("*")) continue;
      for (const name of ni.names) {
        if (!targetExports.includes(name)) {
          addIssue(file.path, {
            type: "missing-export",
            severity: "warning",
            message: `'${name}' not exported from '${getShortName(resolved)}'`,
            detail: `${getShortName(resolved)} exports: ${targetExports.slice(0, 5).join(", ") || "nothing"}`,
          });
        }
      }
    }
  }

  const cycles = detectCircularDeps(relationships);
  const circularEdges = new Set<string>();
  for (const cycle of cycles) {
    const cycleNames = cycle.map(getShortName).join(" → ");
    for (let i = 0; i < cycle.length - 1; i++) {
      circularEdges.add(`${cycle[i]}→${cycle[i + 1]}`);
      addIssue(cycle[i], {
        type: "circular-dep",
        severity: "warning",
        message: `Circular dependency detected`,
        detail: cycleNames,
      });
    }
  }

  const importedSet = new Set<string>();
  const importsFromSet = new Set<string>();
  for (const rel of relationships) {
    importedSet.add(rel.target);
    importsFromSet.add(rel.source);
  }

  for (const file of files) {
    const cat = categorizeFile(file.path);
    if (cat === "config") continue;
    if (!importedSet.has(file.path) && !importsFromSet.has(file.path)) {
      addIssue(file.path, {
        type: "orphan",
        severity: "info",
        message: "Disconnected file",
        detail: "This file isn't imported by or importing any other file",
      });
    }

    if (file.content !== undefined && file.content !== null && file.content.trim().length < 10 && cat !== "style") {
      addIssue(file.path, {
        type: "empty-file",
        severity: "warning",
        message: "File is empty or nearly empty",
      });
    }
  }

  for (const err of codeErrors) {
    if (err.file) {
      const match = files.find((f) => f.path === err.file || f.path.endsWith(err.file!));
      if (match) {
        addIssue(match.path, {
          type: "broken-import",
          severity: "error",
          message: err.message.slice(0, 80),
          detail: "Code error detected by the debug system",
        });
      }
    }
  }

  for (const err of runtimeErrors) {
    if (err.source) {
      const match = files.find((f) => f.path === err.source || f.path.endsWith(err.source!));
      if (match) {
        addIssue(match.path, {
          type: "broken-import",
          severity: "error",
          message: err.message.slice(0, 80),
          detail: "Runtime error",
        });
      }
    }
  }

  return { issueMap, brokenImports, circularEdges };
}

function getShortName(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1];
}

function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: "TB" | "LR" = "TB"
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 80, ranksep: 110, edgesep: 50 });

  for (const node of nodes) {
    g.setNode(node.id, { width: 220, height: 80 });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 100,
        y: nodeWithPosition.y - 28,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

interface FileNodeData {
  label: string;
  category: FileCategory;
  fullPath: string;
  description: string;
  lineCount: number;
  exportCount: number;
  issues: FileIssue[];
  isOrphan: boolean;
}

function FileNode({ data, selected }: { data: FileNodeData; selected?: boolean }) {
  const colors = CATEGORY_COLORS[data.category];
  const [hovered, setHovered] = useState(false);
  const errorCount = data.issues.filter((i) => i.severity === "error").length;
  const warningCount = data.issues.filter((i) => i.severity === "warning").length;
  const hasErrors = errorCount > 0;
  const hasWarnings = warningCount > 0;

  const borderColor = hasErrors
    ? "#fca5a5"
    : hasWarnings
    ? "#fcd34d"
    : selected
    ? colors.accent
    : hovered
    ? colors.border
    : colors.border + "99";

  const shadowStyle = hasErrors
    ? "0 0 0 1px #fca5a544, 0 2px 8px rgba(239,68,68,0.08)"
    : hasWarnings
    ? "0 0 0 1px #fcd34d44, 0 2px 8px rgba(245,158,11,0.06)"
    : selected
    ? `0 0 0 1px ${colors.accent}33, 0 2px 10px rgba(0,0,0,0.08)`
    : hovered
    ? "0 2px 10px rgba(0,0,0,0.06)"
    : "0 1px 4px rgba(0,0,0,0.04)";

  return (
    <>
      <Handle type="target" position={Position.Top} style={{ background: colors.accent + "88", border: `2px solid ${colors.bg}`, width: 7, height: 7, borderRadius: 4 }} />
      <div
        style={{
          background: data.isOrphan ? colors.bg + "cc" : colors.bg,
          border: `1px solid ${borderColor}`,
          borderRadius: 12,
          padding: "10px 14px",
          minWidth: 170,
          maxWidth: 230,
          cursor: "pointer",
          boxShadow: shadowStyle,
          transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: selected ? "scale(1.02)" : "scale(1)",
          position: "relative",
          opacity: data.isOrphan && !hovered && !selected ? 0.55 : 1,
        }}
        data-testid={`flow-node-${data.label}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {(hasErrors || hasWarnings) && (
          <div
            style={{
              position: "absolute",
              top: -5,
              right: -5,
              width: 16,
              height: 16,
              borderRadius: 8,
              background: hasErrors ? "#ef4444" : "#f59e0b",
              color: "white",
              fontSize: 9,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
              zIndex: 2,
            }}
            data-testid={`flow-badge-${data.label}`}
          >
            {errorCount + warningCount}
          </div>
        )}
        {data.isOrphan && !hasErrors && !hasWarnings && (
          <div
            style={{
              position: "absolute",
              top: -5,
              right: -5,
              color: "#d1d5db",
              zIndex: 2,
            }}
          >
            <Unlink className="w-3 h-3" />
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 8,
              background: colors.accent + "14",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: colors.accent,
              flexShrink: 0,
            }}
          >
            {getCategoryIcon(data.category)}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: 11.5,
                fontWeight: 500,
                color: colors.text,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                letterSpacing: "-0.01em",
              }}
            >
              {data.label}
            </div>
            <div style={{ fontSize: 9, color: colors.accent + "aa", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 1 }}>
              {CATEGORY_LABELS[data.category]}
            </div>
          </div>
        </div>
        {(hovered || selected) && (
          <div
            style={{
              marginTop: 8,
              paddingTop: 7,
              borderTop: `1px solid ${colors.border}44`,
              fontSize: 10,
              color: colors.text + "cc",
              lineHeight: 1.5,
            }}
          >
            {data.issues.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {data.issues.slice(0, 3).map((issue, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 5 }}>
                    <span style={{ color: issue.severity === "error" ? "#ef4444" : issue.severity === "warning" ? "#f59e0b" : "#9ca3af", flexShrink: 0, marginTop: 1, fontSize: 8 }}>
                      {issue.severity === "error" ? "●" : issue.severity === "warning" ? "●" : "●"}
                    </span>
                    <span style={{ fontSize: 9, lineHeight: 1.4 }}>{issue.message}</span>
                  </div>
                ))}
                {data.issues.length > 3 && (
                  <span style={{ fontSize: 9, color: "#9ca3af" }}>+{data.issues.length - 3} more</span>
                )}
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 4, fontSize: 9.5, lineHeight: 1.4 }}>{data.description}</div>
                <div style={{ display: "flex", gap: 10, fontSize: 9, color: colors.accent + "99" }}>
                  {data.lineCount > 0 && <span>{data.lineCount} lines</span>}
                  {data.exportCount > 0 && <span>{data.exportCount} exports</span>}
                </div>
              </>
            )}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: colors.accent + "88", border: `2px solid ${colors.bg}`, width: 7, height: 7, borderRadius: 4 }} />
    </>
  );
}

const nodeTypes = { fileNode: FileNode };

interface FlowchartPanelProps {
  files: ProjectFile[];
  codeErrors?: { file?: string; message: string }[];
  runtimeErrors?: { source?: string; message: string }[];
  isAutoFixing?: boolean;
  autoFixLogs?: { timestamp: number; fileName: string; fixes: string[] }[];
}

function FlowchartInner({ files, codeErrors = [], runtimeErrors = [], isAutoFixing = false, autoFixLogs = [] }: FlowchartPanelProps) {
  const reactFlowInstance = useReactFlow();

  const relationships = useMemo(() => {
    if (!files || files.length === 0) return [];
    return buildRelationships(files);
  }, [files]);

  const diagnostics = useMemo(() => {
    if (!files || files.length === 0) return { issueMap: new Map(), brokenImports: [], circularEdges: new Set<string>() };
    return analyzeFileIssues(files, relationships, codeErrors, runtimeErrors);
  }, [files, relationships, codeErrors, runtimeErrors]);

  const issueSummary = useMemo(() => {
    let brokenImportCount = 0;
    let circularCount = 0;
    let orphanCount = 0;
    let missingExportCount = 0;
    let emptyCount = 0;
    const errorNodes: string[] = [];
    const warningNodes: string[] = [];
    const orphanNodes: string[] = [];

    for (const [filePath, issues] of diagnostics.issueMap) {
      for (const issue of issues) {
        if (issue.type === "broken-import") { brokenImportCount++; if (!errorNodes.includes(filePath)) errorNodes.push(filePath); }
        if (issue.type === "circular-dep") { circularCount++; if (!warningNodes.includes(filePath)) warningNodes.push(filePath); }
        if (issue.type === "orphan") { orphanCount++; orphanNodes.push(filePath); }
        if (issue.type === "missing-export") { missingExportCount++; if (!warningNodes.includes(filePath)) warningNodes.push(filePath); }
        if (issue.type === "empty-file") { emptyCount++; if (!warningNodes.includes(filePath)) warningNodes.push(filePath); }
      }
    }

    const totalFiles = files.length;
    const filesWithIssues = diagnostics.issueMap.size;
    const healthScore = totalFiles > 0 ? Math.round(((totalFiles - filesWithIssues) / totalFiles) * 100) : 100;

    return { brokenImportCount, circularCount, orphanCount, missingExportCount, emptyCount, errorNodes, warningNodes, orphanNodes, healthScore, totalIssues: brokenImportCount + circularCount + orphanCount + missingExportCount + emptyCount };
  }, [diagnostics, files]);

  const { initialNodes, initialEdges, legend } = useMemo(() => {
    if (!files || files.length === 0) {
      return { initialNodes: [], initialEdges: [], legend: [] };
    }

    const connectedFiles = new Set<string>();
    for (const rel of relationships) {
      connectedFiles.add(rel.source);
      connectedFiles.add(rel.target);
    }

    const relevantFiles = files.filter(
      (f) => connectedFiles.has(f.path) || categorizeFile(f.path) !== "config"
    );

    const categoryDescriptions: Record<FileCategory, string> = {
      config: "Sets up project tooling and build settings",
      schema: "Defines data models, types, and validation",
      server: "Handles API routes, auth, or middleware",
      page: "Full-page view the user navigates to",
      component: "Reusable UI building block",
      hook: "Shared logic, hooks, or helpers",
      style: "Visual appearance and layout rules",
      other: "Project file",
    };

    const rawNodes: Node[] = relevantFiles.map((file) => {
      const category = categorizeFile(file.path);
      const content = file.content || "";
      const exports = extractExports(content);
      const issues = diagnostics.issueMap.get(file.path) || [];
      const isOrphan = issues.some((i) => i.type === "orphan");
      return {
        id: file.path,
        type: "fileNode",
        data: {
          label: getShortName(file.path),
          category,
          fullPath: file.path,
          description: categoryDescriptions[category],
          lineCount: content ? content.split("\n").length : 0,
          exportCount: exports.length,
          issues,
          isOrphan,
        } as FileNodeData,
        position: { x: 0, y: 0 },
      };
    });

    const rawEdges: Edge[] = relationships
      .filter((rel) => relevantFiles.some((f) => f.path === rel.source) && relevantFiles.some((f) => f.path === rel.target))
      .map((rel, i) => {
        const edgeKey = `${rel.source}→${rel.target}`;
        const isCircular = diagnostics.circularEdges.has(edgeKey);
        const edgeColor = isCircular ? "#f59e0b" : CATEGORY_COLORS[categorizeFile(rel.source)].accent + "66";
        return {
          id: `e-${i}`,
          source: rel.source,
          target: rel.target,
          animated: isCircular,
          style: {
            stroke: edgeColor,
            strokeWidth: isCircular ? 1.5 : 1,
            strokeDasharray: isCircular ? "6 3" : undefined,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: edgeColor,
            width: 14,
            height: 14,
          },
          label: isCircular ? "⟳" : undefined,
          labelStyle: isCircular ? { fontSize: 12 } : undefined,
        };
      });

    for (const bi of diagnostics.brokenImports) {
      const sourceInRelevant = relevantFiles.some((f) => f.path === bi.source);
      if (sourceInRelevant) {
        rawEdges.push({
          id: `broken-${bi.source}-${bi.rawImport}`,
          source: bi.source,
          target: bi.source,
          type: "default",
          animated: false,
          style: { stroke: "#fca5a5", strokeWidth: 1.5, strokeDasharray: "4 4" },
          label: `✕ ${bi.rawImport.split("/").pop()}`,
          labelStyle: { fontSize: 8, fill: "#ef4444", fontWeight: 500 },
          labelBgStyle: { fill: "#fef2f2", stroke: "#fecaca", strokeWidth: 0.5, rx: 4 },
          labelBgPadding: [4, 2] as [number, number],
        });
      }
    }

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rawNodes, rawEdges);

    const usedCategories = new Set(relevantFiles.map((f) => categorizeFile(f.path)));
    const legendItems = Array.from(usedCategories).map((cat) => ({
      category: cat,
      label: CATEGORY_LABELS[cat],
      color: CATEGORY_COLORS[cat],
    }));

    return { initialNodes: layoutedNodes, initialEdges: layoutedEdges, legend: legendItems };
  }, [files, relationships, diagnostics]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [highlightFilter, setHighlightFilter] = useState<string | null>(null);

  const displayEdges = useMemo(() => {
    const baseEdges = selectedNodeId
      ? edges.map((edge) => {
          const isConnected = edge.source === selectedNodeId || edge.target === selectedNodeId;
          return {
            ...edge,
            animated: isConnected || (edge as any).animated,
            style: {
              ...edge.style,
              strokeWidth: isConnected ? 1.8 : ((edge.style as any)?.strokeWidth || 1),
              opacity: isConnected ? 1 : 0.2,
            },
          };
        })
      : edges;
    return baseEdges;
  }, [edges, selectedNodeId]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
    setHighlightFilter(null);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setHighlightFilter(null);
  }, []);

  const focusNodes = useCallback((nodeIds: string[]) => {
    if (nodeIds.length === 0) return;
    setSelectedNodeId(null);
    setHighlightFilter(null);
    setTimeout(() => {
      reactFlowInstance.fitView({
        nodes: nodeIds.map((id) => ({ id })),
        padding: 0.3,
        duration: 400,
      });
    }, 50);
  }, [reactFlowInstance]);

  if (!files || files.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground" data-testid="flow-empty">
        <div className="text-center space-y-2">
          <FileCode className="w-8 h-8 mx-auto opacity-50" />
          <p className="text-sm">No files generated yet</p>
          <p className="text-xs">Generate a project to see the dependency flowchart</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative" data-testid="flowchart-panel">
      {(issueSummary.totalIssues > 0 || isAutoFixing) && (
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur-md border border-border/50 rounded-xl flex items-center gap-1.5 px-3 py-2"
          style={{ zIndex: 15, boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
          data-testid="flow-debug-bar"
        >
          {isAutoFixing && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-50 text-blue-500 animate-pulse" data-testid="flow-autofix-indicator">
              <Wrench className="w-3 h-3 animate-spin" />
              Auto-fixing...
            </div>
          )}
          {!isAutoFixing && <>
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium"
              style={{
                background: issueSummary.healthScore >= 80 ? "#f0fdf4" : issueSummary.healthScore >= 50 ? "#fefce8" : "#fef2f2",
                color: issueSummary.healthScore >= 80 ? "#22c55e" : issueSummary.healthScore >= 50 ? "#ca8a04" : "#ef4444",
              }}
              data-testid="flow-health-score"
            >
              {issueSummary.healthScore >= 80 ? <ShieldCheck className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              {issueSummary.healthScore}%
            </div>
            <div className="w-px h-3.5 bg-border/40 mx-0.5" />
            {issueSummary.brokenImportCount > 0 && (
              <button
                onClick={() => focusNodes(issueSummary.errorNodes)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium hover:bg-red-50/80 transition-colors"
                style={{ color: "#ef4444" }}
                data-testid="flow-filter-broken"
              >
                <XCircle className="w-3 h-3" />
                {issueSummary.brokenImportCount} broken
              </button>
            )}
            {issueSummary.circularCount > 0 && (
              <button
                onClick={() => focusNodes(issueSummary.warningNodes)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium hover:bg-amber-50/80 transition-colors"
                style={{ color: "#f59e0b" }}
                data-testid="flow-filter-circular"
              >
                <RefreshCw className="w-3 h-3" />
                {issueSummary.circularCount} circular
              </button>
            )}
            {issueSummary.missingExportCount > 0 && (
              <button
                onClick={() => focusNodes(issueSummary.warningNodes)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium hover:bg-amber-50/80 transition-colors"
                style={{ color: "#f59e0b" }}
                data-testid="flow-filter-missing"
              >
                <AlertTriangle className="w-3 h-3" />
                {issueSummary.missingExportCount} missing
              </button>
            )}
            {issueSummary.orphanCount > 0 && (
              <button
                onClick={() => focusNodes(issueSummary.orphanNodes)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium hover:bg-muted/60 transition-colors"
                style={{ color: "#9ca3af" }}
                data-testid="flow-filter-orphan"
              >
                <Unlink className="w-3 h-3" />
                {issueSummary.orphanCount} orphan
              </button>
            )}
          </>}
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={displayEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#f1f5f9" gap={24} size={0.8} />
        <Controls
          showInteractive={false}
          style={{
            borderRadius: 10,
            overflow: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            border: "1px solid #e5e7eb",
          }}
        />
        <MiniMap
          nodeColor={(node: Node) => {
            const nodeData = node.data as any;
            const issues = nodeData?.issues as FileIssue[] | undefined;
            if (issues && issues.some((i: FileIssue) => i.severity === "error")) return "#fca5a5";
            if (issues && issues.some((i: FileIssue) => i.severity === "warning")) return "#fcd34d";
            const cat = nodeData?.category as FileCategory;
            return CATEGORY_COLORS[cat]?.accent || "#d1d5db";
          }}
          maskColor="rgba(0,0,0,0.04)"
          style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
        />
      </ReactFlow>

      {selectedNodeId && (() => {
        const selectedFile = files.find((f) => f.path === selectedNodeId);
        const category = categorizeFile(selectedNodeId);
        const colors = CATEGORY_COLORS[category];
        const fileImports = relationships.filter((r) => r.source === selectedNodeId);
        const importedBy = relationships.filter((r) => r.target === selectedNodeId);
        const exports = selectedFile?.content ? extractExports(selectedFile.content) : [];
        const lineCount = selectedFile?.content ? selectedFile.content.split("\n").length : 0;
        const nodeIssues = diagnostics.issueMap.get(selectedNodeId) || [];

        return (
          <div
            className="absolute top-4 right-4 bg-background/90 backdrop-blur-md border border-border/50 rounded-xl overflow-hidden"
            data-testid="flow-node-detail"
            style={{ zIndex: 10, width: 250, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
          >
            <div style={{ background: colors.accent + "08", borderBottom: `1px solid ${colors.border}44`, padding: "12px 14px" }}>
              <div className="flex items-center gap-2.5">
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: colors.accent + "14",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: colors.accent,
                  }}
                >
                  {getCategoryIcon(category)}
                </div>
                <div>
                  <div className="text-xs font-medium truncate" style={{ letterSpacing: "-0.01em" }}>{getShortName(selectedNodeId)}</div>
                  <div style={{ fontSize: 9, color: colors.accent + "aa", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    {CATEGORY_LABELS[category]}
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground/70 mt-2 truncate">{selectedNodeId}</div>
              <div className="flex gap-3 mt-1.5">
                <span className="text-[10px] text-muted-foreground/60">{lineCount} lines</span>
                <span className="text-[10px] text-muted-foreground/60">{fileImports.length} imports</span>
                <span className="text-[10px] text-muted-foreground/60">{importedBy.length} dependents</span>
              </div>
            </div>
            <div style={{ padding: "10px 14px", maxHeight: 320, overflowY: "auto" }}>
              <div className="space-y-3">
                {nodeIssues.length > 0 && (
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "#ef4444" }}>
                      Issues ({nodeIssues.length})
                    </div>
                    <div className="space-y-1.5">
                      {nodeIssues.map((issue, i) => (
                        <div
                          key={i}
                          className="rounded-lg p-2"
                          style={{
                            background: issue.severity === "error" ? "#fef2f2" : issue.severity === "warning" ? "#fefce8" : "#f9fafb",
                            border: `1px solid ${issue.severity === "error" ? "#fecaca" : issue.severity === "warning" ? "#fde68a" : "#e5e7eb"}44`,
                          }}
                        >
                          <div className="flex items-start gap-2">
                            <span style={{ color: issue.severity === "error" ? "#ef4444" : issue.severity === "warning" ? "#f59e0b" : "#9ca3af", flexShrink: 0, marginTop: 1 }}>
                              {issue.severity === "error" ? <XCircle className="w-3 h-3" /> : issue.severity === "warning" ? <AlertTriangle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                            </span>
                            <div>
                              <div className="text-[10px] font-medium" style={{ color: issue.severity === "error" ? "#dc2626" : issue.severity === "warning" ? "#d97706" : "#6b7280" }}>
                                {issue.message}
                              </div>
                              {issue.detail && (
                                <div className="text-[9px] text-muted-foreground/70 mt-0.5">{issue.detail}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {exports.length > 0 && (
                  <div>
                    <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                      Exports ({exports.length})
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {exports.slice(0, 8).map((exp) => (
                        <span
                          key={exp}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-foreground/80 font-mono"
                        >
                          {exp}
                        </span>
                      ))}
                      {exports.length > 8 && (
                        <span className="text-[10px] text-muted-foreground">+{exports.length - 8} more</span>
                      )}
                    </div>
                  </div>
                )}
                {fileImports.length > 0 && (
                  <div>
                    <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                      Imports ({fileImports.length})
                    </div>
                    <div className="space-y-0.5">
                      {fileImports.map((imp) => (
                        <div key={imp.target} className="text-[10px] text-foreground/80 truncate flex items-center gap-1" title={imp.target}>
                          <span style={{ color: CATEGORY_COLORS[categorizeFile(imp.target)]?.accent }}>●</span>
                          {getShortName(imp.target)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {importedBy.length > 0 && (
                  <div>
                    <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                      Used By ({importedBy.length})
                    </div>
                    <div className="space-y-0.5">
                      {importedBy.map((imp) => (
                        <div key={imp.source} className="text-[10px] text-foreground/80 truncate flex items-center gap-1" title={imp.source}>
                          <span style={{ color: CATEGORY_COLORS[categorizeFile(imp.source)]?.accent }}>●</span>
                          {getShortName(imp.source)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {fileImports.length === 0 && importedBy.length === 0 && exports.length === 0 && nodeIssues.length === 0 && (
                  <div className="text-[10px] text-muted-foreground">No connections or exports detected</div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      <div
        className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm border rounded-lg p-3 shadow-lg"
        data-testid="flow-legend"
        style={{ zIndex: 10 }}
      >
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">File Types</div>
        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
          {legend.map((item) => (
            <div key={item.category} className="flex items-center gap-1.5">
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  background: item.color.accent,
                }}
              />
              <span className="text-[10px] text-foreground/70">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FlowchartPanel(props: FlowchartPanelProps) {
  return (
    <ReactFlowProvider>
      <FlowchartInner {...props} />
    </ReactFlowProvider>
  );
}