interface ProjectFile {
  id: number;
  path: string;
  content: string;
}

interface StructuralFix {
  fileId: number;
  filePath: string;
  newContent: string;
  description: string;
  type: "broken-import" | "missing-export" | "empty-file" | "circular-dep";
}

interface StructuralAnalysis {
  fixes: StructuralFix[];
  issueCount: number;
  summary: string;
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

function extractNamedImportsFromContent(content: string): { path: string; names: string[]; line: number; raw: string }[] {
  const result: { path: string; names: string[]; line: number; raw: string }[] = [];
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/import\s+\{([^}]+)\}\s+from\s+["']([^"']+)["']/);
    if (match) {
      const names = match[1].split(",").map((n) => n.trim().split(" as ")[0].trim()).filter(Boolean);
      result.push({ path: match[2], names, line: i, raw: line });
    }
  }
  return result;
}

function extractExports(content: string): string[] {
  const exports: string[] = [];
  const defaultMatch = content.match(/export\s+default\s+(?:function|class|const|let|var)\s+(\w+)/);
  if (defaultMatch) exports.push("default", defaultMatch[1]);
  const defaultExpr = content.match(/export\s+default\s+/);
  if (defaultExpr && !defaultMatch) exports.push("default");
  const namedExports = Array.from(content.matchAll(/export\s+(?:async\s+)?(?:function|class|const|let|var|type|interface|enum)\s+(\w+)/g));
  for (const m of namedExports) exports.push(m[1]);
  const reExports = Array.from(content.matchAll(/export\s*\{([^}]+)\}/g));
  for (const m of reExports) {
    const names = m[1].split(",").map((n: string) => n.trim().split(/\s+as\s+/).pop()?.trim()).filter(Boolean);
    exports.push(...(names as string[]));
  }
  return Array.from(new Set(exports));
}

function isLocalImport(imp: string): boolean {
  return imp.startsWith("./") || imp.startsWith("../") || imp.startsWith("@/") || imp.startsWith("@shared/");
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

function resolveImportPath(importPath: string, sourceFile: string, allPaths: string[]): string | null {
  if (importPath.startsWith("@/")) {
    return findMatchingFile("src/" + importPath.slice(2), allPaths);
  }
  if (importPath.startsWith("@shared/")) {
    return findMatchingFile("shared/" + importPath.slice(8), allPaths);
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
    return findMatchingFile(resolvedParts.join("/"), allPaths);
  }
  return null;
}

function inferFileContent(importPath: string, importedNames: string[]): string {
  const isComponent = importedNames.some(n => /^[A-Z]/.test(n));
  const isHook = importedNames.some(n => n.startsWith("use"));
  const isType = importedNames.some(n => /^(I[A-Z]|T[A-Z]|.*Type$|.*Props$|.*Schema$)/.test(n));

  const parts: string[] = [];

  for (const name of importedNames) {
    if (/^[A-Z]/.test(name) && !isType) {
      parts.push(`export function ${name}({ children, ...props }: { children?: React.ReactNode; [key: string]: any }) {\n  return <div {...props}>{children}</div>;\n}`);
    } else if (name.startsWith("use")) {
      parts.push(`export function ${name}() {\n  return {};\n}`);
    } else if (/Props$|Schema$/.test(name)) {
      parts.push(`export type ${name} = Record<string, any>;`);
    } else if (/^(I[A-Z]|T[A-Z])/.test(name)) {
      parts.push(`export interface ${name} {}`);
    } else {
      parts.push(`export const ${name} = {} as any;`);
    }
  }

  if (isComponent && !parts.some(p => p.includes("React"))) {
    return `import type { ReactNode } from "react";\n\n${parts.join("\n\n")}\n`;
  }
  return parts.join("\n\n") + "\n";
}

function guessLanguage(path: string): string {
  if (path.endsWith(".tsx")) return "typescriptreact";
  if (path.endsWith(".ts")) return "typescript";
  if (path.endsWith(".jsx")) return "javascriptreact";
  if (path.endsWith(".js")) return "javascript";
  if (path.endsWith(".css")) return "css";
  if (path.endsWith(".json")) return "json";
  return "text";
}

export function analyzeAndAutoFix(files: ProjectFile[]): StructuralAnalysis {
  const allPaths = files.map((f) => f.path);
  const fixes: StructuralFix[] = [];
  const createdPaths = new Set<string>();
  const pendingContent = new Map<string, { content: string; fileId: number }>();

  for (const file of files) {
    pendingContent.set(file.path, { content: file.content, fileId: file.id });
  }

  for (const file of files) {
    if (!file.content) continue;

    const namedImports = extractNamedImportsFromContent(file.content);
    for (const ni of namedImports) {
      if (!isLocalImport(ni.path)) continue;
      const currentPaths = [...allPaths, ...Array.from(createdPaths)];
      const resolved = resolveImportPath(ni.path, file.path, currentPaths);
      if (!resolved) {
        const possiblePath = resolveToCreatablePath(ni.path, file.path);
        if (possiblePath && !createdPaths.has(possiblePath)) {
          createdPaths.add(possiblePath);
          const allNeededNames = collectAllImportedNames(files, ni.path, possiblePath);
          const uniqueNames = Array.from(new Set([...ni.names, ...allNeededNames]));
          const stubContent = inferFileContent(ni.path, uniqueNames);
          pendingContent.set(possiblePath, { content: stubContent, fileId: -1 });
          fixes.push({
            fileId: -1,
            filePath: possiblePath,
            newContent: stubContent,
            description: `Created missing file '${possiblePath}' with exports: ${uniqueNames.join(", ")}`,
            type: "broken-import",
          });
        } else if (possiblePath && createdPaths.has(possiblePath)) {
          const existing = pendingContent.get(possiblePath);
          if (existing) {
            const existingExports = extractExports(existing.content);
            const newNames = ni.names.filter((n) => !existingExports.includes(n));
            if (newNames.length > 0) {
              let updatedContent = existing.content;
              for (const name of newNames) {
                updatedContent += generateExportStub(name);
              }
              pendingContent.set(possiblePath, { ...existing, content: updatedContent });
              const fix = fixes.find((f) => f.filePath === possiblePath);
              if (fix) {
                fix.newContent = updatedContent;
                fix.description = `Created missing file '${possiblePath}' with exports: ${[...existingExports, ...newNames].join(", ")}`;
              }
            }
          }
        }
        continue;
      }

      const pending = pendingContent.get(resolved);
      const targetContent = pending?.content || "";
      if (!targetContent) continue;
      const targetExports = extractExports(targetContent);
      const missingNames = ni.names.filter((n) => !targetExports.includes(n));

      if (missingNames.length > 0) {
        let updatedContent = targetContent;
        for (const name of missingNames) {
          updatedContent += generateExportStub(name);
        }
        const targetFileId = pending?.fileId ?? -1;
        pendingContent.set(resolved, { content: updatedContent, fileId: targetFileId });

        const existingFix = fixes.find((f) => f.filePath === resolved && f.type === "missing-export");
        if (existingFix) {
          existingFix.newContent = updatedContent;
          existingFix.description = `Added missing exports to '${getShortName(resolved)}': ${[...new Set([...(existingFix.description.match(/: (.+)$/)?.[1]?.split(", ") || []), ...missingNames])].join(", ")}`;
        } else {
          fixes.push({
            fileId: targetFileId,
            filePath: resolved,
            newContent: updatedContent,
            description: `Added missing exports to '${getShortName(resolved)}': ${missingNames.join(", ")}`,
            type: "missing-export",
          });
        }
      }
    }

    const imports = extractImports(file.content);
    for (const imp of imports) {
      if (!isLocalImport(imp)) continue;
      const currentPaths = [...allPaths, ...Array.from(createdPaths)];
      const resolved = resolveImportPath(imp, file.path, currentPaths);
      if (!resolved) {
        const inNamed = namedImports.some((ni) => ni.path === imp);
        if (inNamed) continue;

        const defaultImportMatch = file.content.match(new RegExp(`import\\s+(\\w+)\\s+from\\s+["']${escapeRegex(imp)}["']`));
        if (defaultImportMatch) {
          const possiblePath = resolveToCreatablePath(imp, file.path);
          if (possiblePath && !createdPaths.has(possiblePath)) {
            createdPaths.add(possiblePath);
            const name = defaultImportMatch[1];
            const isComponent = /^[A-Z]/.test(name);
            const content = isComponent
              ? `export default function ${name}({ children, ...props }: any) {\n  return <div {...props}>{children}</div>;\n}\n`
              : `const ${name} = {} as any;\nexport default ${name};\n`;
            pendingContent.set(possiblePath, { content, fileId: -1 });
            fixes.push({
              fileId: -1,
              filePath: possiblePath,
              newContent: content,
              description: `Created missing file '${possiblePath}' with default export '${name}'`,
              type: "broken-import",
            });
          }
        }
      }
    }
  }

  for (const file of files) {
    if (file.content !== undefined && file.content !== null && file.content.trim().length < 5) {
      const cat = categorizeFile(file.path);
      if (cat !== "config" && cat !== "style") {
        const ext = file.path.split(".").pop() || "";
        if (["ts", "tsx", "js", "jsx"].includes(ext)) {
          const name = getShortName(file.path).replace(/\.[^.]+$/, "");
          const isComponent = /^[A-Z]/.test(name);
          const content = isComponent
            ? `export default function ${name}() {\n  return <div>${name}</div>;\n}\n`
            : `export default {};\n`;
          fixes.push({
            fileId: file.id,
            filePath: file.path,
            newContent: content,
            description: `Filled empty file '${getShortName(file.path)}' with stub content`,
            type: "empty-file",
          });
        }
      }
    }
  }

  const summary = fixes.length > 0
    ? `Auto-fixed ${fixes.length} structural issue${fixes.length > 1 ? "s" : ""}: ${[...new Set(fixes.map((f) => f.type))].join(", ")}`
    : "No structural issues found";

  return { fixes, issueCount: fixes.length, summary };
}

function generateExportStub(name: string): string {
  if (/^[A-Z]/.test(name) && !/Props$|Schema$|Type$/.test(name)) {
    return `\nexport function ${name}({ children, ...props }: any) {\n  return <div {...props}>{children}</div>;\n}\n`;
  } else if (name.startsWith("use")) {
    return `\nexport function ${name}() {\n  return {};\n}\n`;
  } else if (/Props$|Schema$|Type$/.test(name)) {
    return `\nexport type ${name} = Record<string, any>;\n`;
  } else if (/^(I[A-Z]|T[A-Z])/.test(name)) {
    return `\nexport interface ${name} {}\n`;
  } else {
    return `\nexport const ${name} = {} as any;\n`;
  }
}

function collectAllImportedNames(files: ProjectFile[], importPath: string, resolvedTarget: string): string[] {
  const allNames: string[] = [];
  for (const file of files) {
    if (!file.content) continue;
    const namedImports = extractNamedImportsFromContent(file.content);
    for (const ni of namedImports) {
      if (!isLocalImport(ni.path)) continue;
      const possiblePath = resolveToCreatablePath(ni.path, file.path);
      if (possiblePath === resolvedTarget) {
        allNames.push(...ni.names);
      }
    }
  }
  return allNames;
}

function resolveToCreatablePath(importPath: string, sourceFile: string): string | null {
  let basePath: string;
  if (importPath.startsWith("@/")) {
    basePath = "src/" + importPath.slice(2);
  } else if (importPath.startsWith("@shared/")) {
    basePath = "shared/" + importPath.slice(8);
  } else if (importPath.startsWith("./") || importPath.startsWith("../")) {
    const sourceDir = sourceFile.split("/").slice(0, -1).join("/");
    const parts = importPath.split("/");
    const resolvedParts = sourceDir ? sourceDir.split("/") : [];
    for (const part of parts) {
      if (part === ".") continue;
      if (part === "..") { resolvedParts.pop(); continue; }
      resolvedParts.push(part);
    }
    basePath = resolvedParts.join("/");
  } else {
    return null;
  }

  if (/\.[a-z]+$/i.test(basePath)) return basePath;

  const sourceExt = sourceFile.match(/\.(tsx?|jsx?|css|json)$/)?.[0] || ".ts";
  return basePath + sourceExt;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getShortName(path: string): string {
  return path.split("/").pop() || path;
}

type FileCategory = "config" | "schema" | "server" | "page" | "component" | "hook" | "style" | "other";

function categorizeFile(path: string): FileCategory {
  const lower = path.toLowerCase();
  if (lower.endsWith(".css") || lower.endsWith(".scss")) return "style";
  if (lower.includes("schema") || lower.includes("db.ts") || lower.includes("drizzle")) return "schema";
  if (lower.includes("server/") || lower.includes("routes") || lower.includes("auth.ts")) return "server";
  if (lower.includes("pages/") || lower.includes("page.tsx") || lower.includes("page.ts")) return "page";
  if (lower.includes("components/") || lower.includes("component")) return "component";
  if (lower.includes("hooks/") || lower.includes("lib/") || lower.includes("utils")) return "hook";
  if (lower.includes("package.json") || lower.includes("tsconfig") || lower.includes("vite.config") || lower.includes("tailwind.config") || lower.includes("postcss") || lower.includes(".config")) return "config";
  return "other";
}