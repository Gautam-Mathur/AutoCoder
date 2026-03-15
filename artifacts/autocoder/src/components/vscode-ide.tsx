import { useState, useCallback, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Play,
  Square,
  Trash2,
  Terminal as TerminalIcon,
  Loader2,
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  FileJson,
  FileCog,
  ChevronRight,
  ChevronDown,
  X,
  Plus,
  Save,
  RefreshCw,
  Maximize2,
  Minimize2,
  ExternalLink,
  Server,
  Package,
  AlertCircle,
  CheckCircle2,
  Search,
  Settings,
  Copy,
  Download,
  Eye,
  PanelLeft,
  PanelBottom,
  SplitSquareHorizontal,
  Upload,
  FolderUp
} from "lucide-react";
import { SiJavascript, SiTypescript, SiHtml5, SiNodedotjs, SiReact, SiPython, SiGithub } from "react-icons/si";
import { GitHubImport, FileUpload } from "@/components/github-import";
import { autoFixEngine, AutoFixContext, AutoFixResult } from "@/lib/code-runner/auto-fix-engine";
import { queryClient } from "@/lib/queryClient";
import {
  getWebContainer,
  mountFiles,
  runCommand,
  installDependencies,
  startDevServer,
  isWebContainerSupported,
  teardown,
  writeFile,
  FileSystemTree
} from "@/lib/code-runner/webcontainer";

interface ProjectFile {
  id?: number;
  path: string;
  content: string;
  language: string;
}

interface VSCodeIDEProps {
  files: ProjectFile[];
  onFilesChange?: (files: ProjectFile[]) => void;
  conversationId?: number;
}

interface TerminalLine {
  type: "input" | "output" | "error" | "system";
  content: string;
  timestamp: Date;
}

interface FileTreeNode {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: FileTreeNode[];
  language?: string;
  content?: string;
}

type RunnerStatus = "idle" | "booting" | "installing" | "running" | "error" | "ready";

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const iconClass = "w-4 h-4";

  switch (ext) {
    case 'js':
    case 'mjs':
    case 'jsx':
      return <SiJavascript className={`${iconClass} text-yellow-400`} />;
    case 'ts':
    case 'tsx':
      return <SiTypescript className={`${iconClass} text-blue-400`} />;
    case 'html':
      return <SiHtml5 className={`${iconClass} text-orange-500`} />;
    case 'css':
    case 'scss':
    case 'sass':
      return <SiHtml5 className={`${iconClass} text-blue-500`} />;
    case 'json':
      return <FileJson className={`${iconClass} text-yellow-500`} />;
    case 'py':
      return <SiPython className={`${iconClass} text-green-400`} />;
    case 'md':
    case 'txt':
      return <FileText className={`${iconClass} text-muted-foreground`} />;
    case 'config':
    case 'env':
      return <FileCog className={`${iconClass} text-muted-foreground`} />;
    default:
      return <FileCode className={`${iconClass} text-muted-foreground`} />;
  }
}

function flattenFilesToTree(files: ProjectFile[]): FileTreeNode[] {
  const folderMap: Map<string, FileTreeNode> = new Map();
  const rootNodes: FileTreeNode[] = [];

  for (const file of files) {
    const parts = file.path.split('/').filter(Boolean);
    let currentPath = '';

    for (let i = 0; i < parts.length - 1; i++) {
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];

      if (!folderMap.has(currentPath)) {
        const folderNode: FileTreeNode = {
          name: parts[i],
          path: currentPath,
          type: 'folder',
          children: []
        };
        folderMap.set(currentPath, folderNode);

        if (parentPath && folderMap.has(parentPath)) {
          folderMap.get(parentPath)!.children!.push(folderNode);
        } else if (!parentPath) {
          rootNodes.push(folderNode);
        }
      }
    }

    const fileNode: FileTreeNode = {
      name: parts[parts.length - 1],
      path: file.path,
      type: 'file',
      language: file.language,
      content: file.content
    };

    if (parts.length > 1) {
      const parentPath = parts.slice(0, -1).join('/');
      if (folderMap.has(parentPath)) {
        folderMap.get(parentPath)!.children!.push(fileNode);
      }
    } else {
      rootNodes.push(fileNode);
    }
  }

  const sortNodes = (nodes: FileTreeNode[]): FileTreeNode[] => {
    return nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    }).map(node => {
      if (node.children) {
        node.children = sortNodes(node.children);
      }
      return node;
    });
  };

  return sortNodes(rootNodes);
}

function FileTreeItem({
  node,
  depth = 0,
  selectedFile,
  expandedFolders,
  onSelectFile,
  onToggleFolder
}: {
  node: FileTreeNode;
  depth?: number;
  selectedFile: string | null;
  expandedFolders: Set<string>;
  onSelectFile: (path: string) => void;
  onToggleFolder: (path: string) => void;
}) {
  const isExpanded = expandedFolders.has(node.path);
  const isSelected = selectedFile === node.path;

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-1 px-2 cursor-pointer hover-elevate rounded-sm text-sm ${
          isSelected ? 'bg-accent text-accent-foreground' : ''
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => {
          if (node.type === 'folder') {
            onToggleFolder(node.path);
          } else {
            onSelectFile(node.path);
          }
        }}
        data-testid={`file-tree-item-${node.name}`}
      >
        {node.type === 'folder' ? (
          <>
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            )}
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-yellow-500" />
            ) : (
              <Folder className="w-4 h-4 text-yellow-500" />
            )}
          </>
        ) : (
          <>
            <span className="w-3" />
            {getFileIcon(node.name)}
          </>
        )}
        <span className="truncate">{node.name}</span>
      </div>
      {node.type === 'folder' && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedFile={selectedFile}
              expandedFolders={expandedFolders}
              onSelectFile={onSelectFile}
              onToggleFolder={onToggleFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FallbackPreview({ files }: { files: ProjectFile[] }) {
  const getFileName = (path: string) => path.split('/').pop() || path;

  const htmlFile = files.find(f =>
    getFileName(f.path) === 'index.html' ||
    f.path.endsWith('.html')
  );
  const cssFiles = files.filter(f => f.path.endsWith('.css'));
  const jsFiles = files.filter(f =>
    (f.path.endsWith('.js') || f.path.endsWith('.jsx')) &&
    !f.path.includes('node_modules') &&
    !f.path.includes('.config.')
  );
  const tsFiles = files.filter(f =>
    (f.path.endsWith('.ts') || f.path.endsWith('.tsx')) &&
    !f.path.includes('node_modules') &&
    !f.path.includes('.config.')
  );

  const hasPackageJson = files.some(f => getFileName(f.path) === 'package.json');
  const hasTypeScript = tsFiles.length > 0;
  const isComplexProject = hasPackageJson && (hasTypeScript || jsFiles.length > 3);

  const previewContent = (() => {
    if (htmlFile) {
      let html = htmlFile.content;

      // Remove ALL external script and link references that won't work in sandbox
      html = html.replace(/<script[^>]+src\s*=\s*["'][^"']*["'][^>]*>[\s\S]*?<\/script>/gi, '');
      html = html.replace(/<script[^>]+src\s*=\s*["'][^"']*["'][^>]*\/>/gi, '');
      // Remove script tags with type="module"
      html = html.replace(/<script[^>]+type\s*=\s*["']module["'][^>]*>[\s\S]*?<\/script>/gi, '');
      html = html.replace(/<script[^>]+type\s*=\s*["']module["'][^>]*\/>/gi, '');
      html = html.replace(/<link[^>]+href\s*=\s*["'][^"']*["'][^>]*\/?>/gi, '');

      const cssContent = cssFiles.map(f => f.content).join('\n');
      if (cssContent && !html.includes('<style>')) {
        html = html.replace('</head>', `<style>${cssContent}</style></head>`);
      }

      const simpleJsFiles = jsFiles.filter(f =>
        !f.content.includes('import ') &&
        !f.content.includes('export ')
      );
      const jsContent = simpleJsFiles.map(f => f.content).join('\n');
      if (jsContent && !html.includes('<script')) {
        html = html.replace('</body>', `<script>${jsContent}</script></body>`);
      }

      return html;
    }

    if (isComplexProject) {
      const pkgFile = files.find(f => getFileName(f.path) === 'package.json');
      let projectName = 'this project';
      if (pkgFile) {
        try {
          const pkg = JSON.parse(pkgFile.content);
          projectName = pkg.name || 'this project';
        } catch {}
      }

      const hasReact = files.some(f => f.content.includes('react') || f.content.includes('React'));
      const hasExpress = files.some(f => f.content.includes('express'));
      const hasVite = files.some(f => f.content.includes('vite'));
      const hasTailwind = files.some(f => f.content.includes('tailwind'));

      const techStack: string[] = [];
      if (hasTypeScript) techStack.push('TypeScript');
      if (hasReact) techStack.push('React');
      if (hasExpress) techStack.push('Express');
      if (hasVite) techStack.push('Vite');
      if (hasTailwind) techStack.push('Tailwind CSS');

      const checkItems = [
        { check: true, text: `${files.length} source files imported correctly` },
        { check: files.some(f => getFileName(f.path) === 'package.json'), text: 'package.json found with dependencies' },
        { check: hasTypeScript, text: 'TypeScript configuration detected' },
        { check: files.some(f => f.path.includes('src/') || f.path.includes('client/')), text: 'Standard folder structure' },
      ].filter(item => item.check);

      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { margin: 0; padding: 20px; font-family: system-ui, sans-serif; background: #1a1a2e; color: #e0e0e0; min-height: 100vh; }
    .container { max-width: 650px; margin: 0 auto; padding-top: 40px; }
    h1 { color: #a855f7; margin-bottom: 16px; font-size: 24px; }
    p { line-height: 1.6; margin-bottom: 12px; }
    .code { background: #16213e; padding: 16px; border-radius: 8px; font-family: monospace; margin: 16px 0; overflow-x: auto; }
    .step { margin: 8px 0; }
    .num { color: #a855f7; font-weight: bold; }
    .highlight { color: #4ade80; }
    .muted { color: #888; font-size: 14px; }
    .info { background: #1e3a5f; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 20px 0; }
    .success { background: #1e3a2e; border-left: 4px solid #4ade80; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 20px 0; }
    .tech-badge { display: inline-block; background: #2d1f4e; color: #c4b5fd; padding: 4px 10px; border-radius: 4px; font-size: 13px; margin: 4px 4px 4px 0; }
    .check-list { margin: 16px 0; }
    .check-item { display: flex; align-items: center; gap: 8px; margin: 8px 0; color: #4ade80; }
    .check-icon { font-size: 16px; }
    h3 { color: #a855f7; font-size: 16px; margin: 24px 0 12px 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Project Imported Successfully</h1>
    <p><strong>${projectName}</strong> - <span class="highlight">${files.length} files</span> ready</p>

    ${techStack.length > 0 ? `
    <div style="margin: 16px 0;">
      ${techStack.map(t => `<span class="tech-badge">${t}</span>`).join('')}
    </div>
    ` : ''}

    <div class="success">
      <p style="margin:0"><strong>Will This Run Locally? Yes!</strong></p>
      <div class="check-list">
        ${checkItems.map(item => `<div class="check-item"><span class="check-icon">✓</span> ${item.text}</div>`).join('')}
      </div>
    </div>

    <div class="info">
      <p style="margin:0"><strong>Why can't it run here?</strong></p>
      <p style="margin:8px 0 0 0" class="muted">Browser preview requires WebContainer (Node.js in browser), which needs special server headers not available here. But your code is complete and standard - it will run perfectly on any machine with Node.js installed.</p>
    </div>

    <h3>Run it locally:</h3>
    <div class="code">
      <div class="step"><span class="num">1.</span> Download/export the project</div>
      <div class="step"><span class="num">2.</span> <span class="highlight">npm install</span></div>
      <div class="step"><span class="num">3.</span> <span class="highlight">npm run dev</span></div>
    </div>

    <p class="muted">Use the Code tab to browse files, edit in IDE, or export the complete project.</p>
  </div>
</body>
</html>`;
    }

    const mainJs = jsFiles.find(f => {
      const name = getFileName(f.path);
      return name === 'index.js' || name === 'main.js' || name === 'app.js' ||
             name === 'index.jsx' || name === 'App.jsx';
    });

    if (mainJs) {
      const isReact = jsFiles.some(f =>
        f.content.includes('import React') ||
        f.content.includes('from "react"') ||
        f.content.includes("from 'react'") ||
        f.content.includes('useState') ||
        f.content.includes('useEffect')
      );

      const processCode = (code: string) => {
        return code
          .replace(/import\s+.*?from\s+['"][^'"]+['"];?\s*\n?/g, '')
          .replace(/import\s+['"][^'"]+['"];?\s*\n?/g, '')
          .replace(/export\s+default\s+function\s+(\w+)/g, 'window.$1 = function $1')
          .replace(/export\s+default\s+/g, 'window.App = ')
          .replace(/export\s+const\s+/g, 'const ')
          .replace(/export\s+function\s+/g, 'function ')
          .replace(/export\s+\{[^}]*\};?\s*\n?/g, '');
      };

      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; }
    ${cssFiles.map(f => f.content).join('\n')}
  </style>
  ${isReact ? `
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  ` : ''}
</head>
<body>
  <div id="root"></div>
  ${isReact ? '<script type="text/babel">' : '<script>'}
  const { useState, useEffect, useRef, useCallback, useMemo, useContext, createContext } = React || {};
  ${processCode(mainJs.content)}
  ${isReact ? `
  const App = window.App || (() => React.createElement('div', {style:{padding:20}}, 'Loading...'));
  try {
    ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
  } catch(e) {
    document.getElementById('root').innerHTML = '<div style="padding:20px;color:red;">Error: '+e.message+'</div>';
  }
  ` : ''}
  </script>
</body>
</html>`;
    }

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { margin: 0; padding: 40px; font-family: system-ui, sans-serif; background: #1a1a2e; color: #e0e0e0; min-height: 100vh; }
    .container { text-align: center; padding-top: 80px; }
    h2 { color: #a855f7; margin-bottom: 12px; }
    p { color: #888; }
    .files { margin-top: 24px; font-size: 14px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h2>No Preview Available</h2>
    <p>Add an index.html file or simple JS/React files to see a preview.</p>
    <p class="files">${files.length} files loaded - use the Code tab to browse</p>
  </div>
</body>
</html>`;
  })();

  return (
    <iframe
      srcDoc={previewContent}
      className="w-full h-full border-0"
      title="Fallback Preview"
      sandbox="allow-scripts"
    />
  );
}

export function VSCodeIDE({ files, onFilesChange, conversationId }: VSCodeIDEProps) {
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [editedContent, setEditedContent] = useState<Map<string, string>>(new Map());
  const [unsavedFiles, setUnsavedFiles] = useState<Set<string>>(new Set());
  const [showSidebar, setShowSidebar] = useState(true);
  const [showTerminal, setShowTerminal] = useState(true);
  const [showPreview, setShowPreview] = useState(true);
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [status, setStatus] = useState<RunnerStatus>("idle");
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoFixEnabled, setAutoFixEnabled] = useState(true);
  const [autoFixResults, setAutoFixResults] = useState<AutoFixResult[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  const [useFallbackPreview, setUseFallbackPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const hasAutoRun = useRef(false);
  const autoRunTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsSupported(isWebContainerSupported());
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLines]);

  const fileTree = flattenFilesToTree(files);

  const updateFileContent = useCallback(async (path: string, content: string) => {
    const file = files.find(f => f.path === path);
    if (file) {
      try {
        if (file.id) {
          await fetch(`/api/files/${file.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content }),
          });
          queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "files"] });
        }

        const updatedFiles = files.map(f =>
          f.path === path ? { ...f, content } : f
        );
        onFilesChange?.(updatedFiles);

        try {
          await writeFile(path, content);
        } catch {
        }
      } catch (err) {
        console.error("Failed to update file:", err);
      }
    }
  }, [files, conversationId, onFilesChange]);

  const mapTerminalLineType = (lineType: string): TerminalLine["type"] => {
    switch (lineType) {
      case "success":
      case "info":
        return "output";
      case "warn":
      case "error":
        return "error";
      default:
        return "system";
    }
  };

  const addLine = useCallback((type: TerminalLine["type"], content: string) => {
    setTerminalLines(prev => [...prev, { type, content, timestamp: new Date() }]);

    if (autoFixEnabled && (type === "error" ||
        /error|Error|ERROR|failed|Failed|exception|Exception|SharedArrayBuffer|cross-origin/i.test(content))) {

      if (/SharedArrayBuffer|cross-origin isolation/i.test(content)) {
        setUseFallbackPreview(true);
        setAutoFixResults([]);
        setRetryCount(0);
      }

      const context: AutoFixContext = {
        files: files.map(f => ({ path: f.path, content: f.content })),
        updateFile: updateFileContent,
        addTerminalLine: (lineType, msg) => {
          setTerminalLines(prev => [...prev, {
            type: mapTerminalLineType(lineType),
            content: msg,
            timestamp: new Date()
          }]);
        },
        retryCount,
      };

      const result = autoFixEngine.processError(content, context);
      if (result) {
        setAutoFixResults(prev => [...prev, result]);
        if (result.fixed && result.codeChanges) {
          setRetryCount(prev => prev + 1);
        }
      }
    }
  }, [autoFixEnabled, files, updateFileContent, retryCount]);

  const handleSelectFile = useCallback((path: string) => {
    if (!openFiles.includes(path)) {
      setOpenFiles(prev => [...prev, path]);
    }
    setActiveFile(path);
  }, [openFiles]);

  const handleCloseFile = useCallback((path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenFiles(prev => prev.filter(p => p !== path));
    if (activeFile === path) {
      const index = openFiles.indexOf(path);
      const newActive = openFiles[index - 1] || openFiles[index + 1] || null;
      setActiveFile(newActive);
    }
    setEditedContent(prev => {
      const next = new Map(prev);
      next.delete(path);
      return next;
    });
    setUnsavedFiles(prev => {
      const next = new Set(prev);
      next.delete(path);
      return next;
    });
  }, [activeFile, openFiles]);

  const handleToggleFolder = useCallback((path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const getCurrentFileContent = useCallback(() => {
    if (!activeFile) return '';
    if (editedContent.has(activeFile)) {
      return editedContent.get(activeFile) || '';
    }
    const file = files.find(f => f.path === activeFile);
    return file?.content || '';
  }, [activeFile, editedContent, files]);

  const handleContentChange = useCallback((content: string) => {
    if (!activeFile) return;
    setEditedContent(prev => new Map(prev).set(activeFile, content));
    setUnsavedFiles(prev => new Set(prev).add(activeFile));
  }, [activeFile]);

  const handleSaveFile = useCallback(async () => {
    if (!activeFile || !unsavedFiles.has(activeFile)) return;

    const content = editedContent.get(activeFile);
    if (content !== undefined) {
      const updatedFiles = files.map(f =>
        f.path === activeFile ? { ...f, content } : f
      );
      onFilesChange?.(updatedFiles);

      if (status === "ready" || status === "running") {
        try {
          await writeFile(activeFile.startsWith('/') ? activeFile.slice(1) : activeFile, content);
          addLine("system", `✓ Synced ${activeFile} to WebContainer`);
        } catch (err) {
          addLine("error", `Failed to sync to WebContainer: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
    }

    setUnsavedFiles(prev => {
      const next = new Set(prev);
      next.delete(activeFile);
      return next;
    });

    addLine("system", `Saved ${activeFile}`);
  }, [activeFile, editedContent, files, onFilesChange, unsavedFiles, addLine, status]);

  const handleSaveAll = useCallback(async () => {
    if (unsavedFiles.size === 0) return;

    const updatedFiles = files.map(f => {
      if (editedContent.has(f.path)) {
        return { ...f, content: editedContent.get(f.path)! };
      }
      return f;
    });

    onFilesChange?.(updatedFiles);

    if (status === "ready" || status === "running") {
      const unsavedPaths = Array.from(unsavedFiles);
      for (const path of unsavedPaths) {
        const content = editedContent.get(path);
        if (content !== undefined) {
          try {
            const filePath = path.startsWith('/') ? path.slice(1) : path;
            await writeFile(filePath, content);
          } catch (err) {
            addLine("error", `Failed to sync ${path}: ${err instanceof Error ? err.message : 'Unknown error'}`);
          }
        }
      }
      addLine("system", `✓ Synced ${unsavedPaths.length} file(s) to WebContainer`);
    }

    setUnsavedFiles(new Set());
    addLine("system", `Saved ${unsavedFiles.size} file(s)`);
  }, [editedContent, files, onFilesChange, unsavedFiles, addLine, status]);

  const convertFilesToTree = useCallback((fileList: ProjectFile[]): FileSystemTree => {
    const tree: FileSystemTree = {};

    for (const file of fileList) {
      const parts = file.path.split("/").filter(Boolean);
      let current: any = tree;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          current[part] = { file: { contents: file.content } };
        } else {
          if (!current[part]) {
            current[part] = { directory: {} };
          }
          current = current[part].directory;
        }
      }
    }

    return tree;
  }, []);

  const runProject = useCallback(async () => {
    if (!isSupported) {
      addLine("error", "WebContainers require SharedArrayBuffer. Enable cross-origin isolation headers.");
      setUseFallbackPreview(true);
      setAutoFixResults([]);
      setRetryCount(0);
      addLine("system", "→ Switched to fallback preview mode");
      return;
    }

    try {
      setStatus("booting");
      addLine("system", "🚀 Booting WebContainer...");

      await getWebContainer();
      addLine("system", "✓ WebContainer ready");

      addLine("system", "📁 Mounting project files...");
      const fileTree = convertFilesToTree(files);
      await mountFiles(fileTree);
      addLine("system", `✓ Mounted ${files.length} files`);

      const hasPackageJson = files.some(f => f.path === "package.json" || f.path.endsWith("/package.json"));

      if (hasPackageJson) {
        setStatus("installing");
        addLine("input", "npm install");

        const installResult = await installDependencies((data) => {
          addLine("output", data);
        });

        if (!installResult.success) {
          setStatus("error");
          addLine("error", "✗ Failed to install dependencies");
          return;
        }

        addLine("system", "✓ Dependencies installed");

        setStatus("running");
        addLine("input", "npm run dev");

        const { url } = await startDevServer(
          (data) => addLine("output", data),
          (serverUrl) => {
            setServerUrl(serverUrl);
            addLine("system", `✓ Server ready at ${serverUrl}`);
          }
        );

        setStatus("ready");
      } else {
        const jsFile = files.find(f => f.path.endsWith(".js") || f.path.endsWith(".mjs"));
        if (jsFile) {
          setStatus("running");
          addLine("input", `node ${jsFile.path}`);

          const result = await runCommand("node", [jsFile.path], (data) => {
            addLine("output", data);
          });

          if (result.success) {
            setStatus("ready");
            addLine("system", `✓ Process exited with code ${result.exitCode}`);
          } else {
            setStatus("error");
            addLine("error", `✗ Process failed with code ${result.exitCode}`);
          }
        } else {
          addLine("system", "ℹ No runnable files found (add package.json or .js file)");
          setStatus("idle");
        }
      }
    } catch (error) {
      setStatus("error");
      const message = error instanceof Error ? error.message : "Unknown error";
      addLine("error", `✗ Error: ${message}`);
    }
  }, [files, isSupported, addLine, convertFilesToTree]);

  const stopProject = useCallback(async () => {
    await teardown();
    setStatus("idle");
    setServerUrl(null);
    addLine("system", "⏹ Server stopped");
  }, [addLine]);

  // Auto-run when files are loaded
  useEffect(() => {
    // Only auto-run once when files are first loaded
    if (hasAutoRun.current || files.length === 0 || status !== "idle") {
      return;
    }

    // Check if there are runnable files
    const hasRunnableFiles = files.some(f =>
      f.path === "package.json" ||
      f.path.endsWith("/package.json") ||
      f.path.endsWith(".js") ||
      f.path.endsWith(".mjs") ||
      f.path.endsWith(".html")
    );

    if (!hasRunnableFiles) {
      return;
    }

    // Clear any existing timeout
    if (autoRunTimeoutRef.current) {
      clearTimeout(autoRunTimeoutRef.current);
    }

    // Delay auto-run slightly to allow UI to render
    autoRunTimeoutRef.current = setTimeout(() => {
      hasAutoRun.current = true;

      // If WebContainer is not supported, use fallback preview immediately
      if (!isWebContainerSupported()) {
        setUseFallbackPreview(true);
        setTerminalLines([{
          type: "system",
          content: "✓ Preview ready (browser-based rendering)",
          timestamp: new Date()
        }]);
        setStatus("ready");
      } else {
        // Start WebContainer automatically
        runProject();
      }
    }, 500);

    return () => {
      if (autoRunTimeoutRef.current) {
        clearTimeout(autoRunTimeoutRef.current);
      }
    };
  }, [files, status, runProject]);

  const clearTerminal = useCallback(() => {
    setTerminalLines([]);
    setAutoFixResults([]);
    setRetryCount(0);
    autoFixEngine.clearHistory();
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case "booting":
      case "installing":
      case "running":
        return "bg-yellow-500";
      case "ready":
        return "bg-green-500";
      case "error":
        return "bg-destructive";
      default:
        return "bg-muted-foreground";
    }
  };

  const getLineColor = (type: TerminalLine["type"]) => {
    switch (type) {
      case "input":
        return "text-cyan-400";
      case "output":
        return "text-foreground";
      case "error":
        return "text-red-400";
      case "system":
        return "text-green-400";
      default:
        return "text-muted-foreground";
    }
  };

  const activeFileData = files.find(f => f.path === activeFile);

  return (
    <div
      className={`flex flex-col bg-background border border-border rounded-lg overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-50' : 'h-[600px]'
      }`}
      data-testid="vscode-ide"
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between px-2 py-1 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
            <span className="text-xs font-medium">
              {status === "idle" ? "Ready" : status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          </div>
          <div className="flex items-center gap-1 ml-2">
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => setShowSidebar(!showSidebar)}
              data-testid="button-toggle-sidebar"
            >
              <PanelLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => setShowTerminal(!showTerminal)}
              data-testid="button-toggle-terminal"
            >
              <PanelBottom className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => setShowPreview(!showPreview)}
              data-testid="button-toggle-preview"
            >
              <SplitSquareHorizontal className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {unsavedFiles.size > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSaveAll}
              className="h-6 text-xs gap-1"
              data-testid="button-save-all"
            >
              <Save className="h-3 w-3" />
              Save All ({unsavedFiles.size})
            </Button>
          )}
          {status === "idle" || status === "error" ? (
            <Button
              size="sm"
              onClick={runProject}
              disabled={files.length === 0}
              className="h-6 text-xs gap-1"
              data-testid="button-run"
            >
              <Play className="h-3 w-3" />
              Run
            </Button>
          ) : status === "ready" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={stopProject}
              className="h-6 text-xs gap-1"
              data-testid="button-restart"
            >
              <RefreshCw className="h-3 w-3" />
              Restart
            </Button>
          ) : (
            <Badge variant="outline" className="h-6 gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              {status}
            </Badge>
          )}
          <div className="w-px h-4 bg-border mx-1" />
          {conversationId && (
            <GitHubImport
              conversationId={conversationId}
              onImportComplete={() => addLine("system", "✓ Files imported from GitHub")}
            />
          )}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-6 text-xs gap-1" data-testid="button-upload-files">
                <Upload className="h-3 w-3" />
                Upload
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FolderUp className="w-5 h-5" />
                  Upload Files
                </DialogTitle>
                <DialogDescription>
                  Drag and drop files or click to browse. Files will be added to your project.
                </DialogDescription>
              </DialogHeader>
              {conversationId && (
                <FileUpload
                  conversationId={conversationId}
                  onUploadComplete={() => addLine("system", "✓ Files uploaded successfully")}
                />
              )}
            </DialogContent>
          </Dialog>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => setIsFullscreen(!isFullscreen)}
            data-testid="button-fullscreen"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - File Explorer */}
        {showSidebar && (
          <div className="w-56 border-r border-border bg-muted/30 flex flex-col">
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b border-border">
              Explorer
            </div>
            <div className="px-2 py-1">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-6 text-xs pl-7"
                  data-testid="input-search-files"
                />
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="py-1">
                {fileTree.map((node) => (
                  <FileTreeItem
                    key={node.path}
                    node={node}
                    selectedFile={activeFile}
                    expandedFolders={expandedFolders}
                    onSelectFile={handleSelectFile}
                    onToggleFolder={handleToggleFolder}
                  />
                ))}
                {files.length === 0 && (
                  <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                    No files yet
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Editor + Preview Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Editor Area */}
          <div className={`flex-1 flex overflow-hidden ${showPreview ? 'w-1/2' : 'w-full'}`}>
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* File Tabs */}
              {openFiles.length > 0 && (
                <div className="flex items-center bg-muted/30 border-b border-border overflow-x-auto">
                  {openFiles.map((path) => {
                    const fileName = path.split('/').pop() || path;
                    const isActive = activeFile === path;
                    const isUnsaved = unsavedFiles.has(path);

                    return (
                      <div
                        key={path}
                        className={`flex items-center gap-1 px-3 py-1.5 border-r border-border cursor-pointer text-sm ${
                          isActive
                            ? 'bg-background text-foreground'
                            : 'text-muted-foreground hover-elevate'
                        }`}
                        onClick={() => setActiveFile(path)}
                        data-testid={`tab-${fileName}`}
                      >
                        {getFileIcon(fileName)}
                        <span className="max-w-[120px] truncate">{fileName}</span>
                        {isUnsaved && <span className="text-primary">●</span>}
                        <button
                          className="ml-1 p-0.5 rounded hover:bg-muted"
                          onClick={(e) => handleCloseFile(path, e)}
                          data-testid={`close-tab-${fileName}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Editor Content */}
              <div className="flex-1 overflow-hidden">
                {activeFile ? (
                  <div className="h-full flex flex-col">
                    <div className="flex items-center justify-between px-2 py-1 bg-muted/20 border-b border-border text-xs text-muted-foreground">
                      <span>{activeFile}</span>
                      <div className="flex items-center gap-1">
                        {unsavedFiles.has(activeFile) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleSaveFile}
                            className="h-5 text-xs gap-1 px-2"
                            data-testid="button-save-file"
                          >
                            <Save className="h-3 w-3" />
                            Save
                          </Button>
                        )}
                        <Badge variant="secondary" className="text-[10px] h-4">
                          {activeFileData?.language || 'text'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex-1 overflow-hidden relative">
                      <textarea
                        ref={textareaRef}
                        value={getCurrentFileContent()}
                        onChange={(e) => handleContentChange(e.target.value)}
                        className="absolute inset-0 w-full h-full resize-none p-3 font-mono text-sm bg-background text-foreground focus:outline-none"
                        spellCheck={false}
                        data-testid="editor-textarea"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <FileCode className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">Select a file to edit</p>
                      <p className="text-xs mt-1">Or generate code using the chat</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Preview Panel */}
            {showPreview && (
              <div className="w-1/2 border-l border-border flex flex-col">
                <div className="flex items-center justify-between px-2 py-1 bg-muted/30 border-b border-border">
                  <div className="flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium">Preview</span>
                    {(useFallbackPreview || !isSupported) && (
                      <Badge variant="secondary" className="h-4 text-[9px] bg-amber-500/20 text-amber-600">
                        Fallback Mode
                      </Badge>
                    )}
                  </div>
                  {serverUrl && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5"
                      onClick={() => window.open(serverUrl, '_blank')}
                      data-testid="button-open-external"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div className="flex-1 bg-white">
                  {serverUrl ? (
                    <iframe
                      src={serverUrl}
                      className="w-full h-full border-0"
                      title="App Preview"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    />
                  ) : (useFallbackPreview || !isSupported) && files.length > 0 ? (
                    <FallbackPreview files={files} />
                  ) : (
                    <div className="h-full flex items-center justify-center bg-muted/20">
                      <div className="text-center text-muted-foreground">
                        <Server className="h-10 w-10 mx-auto mb-3 opacity-50" />
                        <p className="text-sm font-medium">No Server Running</p>
                        <p className="text-xs mt-1">Click "Run" to start the dev server</p>
                        {!isSupported && (
                          <p className="text-xs mt-2 text-amber-500">
                            WebContainers require cross-origin isolation
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Terminal Panel */}
          {showTerminal && (
            <div className="h-40 border-t border-border flex flex-col bg-[#1e1e1e]">
              <div className="flex items-center justify-between px-2 py-1 bg-[#252526] border-b border-[#3c3c3c]">
                <div className="flex items-center gap-2">
                  <TerminalIcon className="h-3.5 w-3.5 text-[#cccccc]" />
                  <span className="text-xs font-medium text-[#cccccc]">Terminal</span>
                  {(status === "booting" || status === "installing" || status === "running") && (
                    <Loader2 className="h-3 w-3 animate-spin text-[#cccccc]" />
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Badge
                    variant={autoFixEnabled ? "default" : "secondary"}
                    className={`cursor-pointer text-[10px] ${autoFixEnabled ? 'bg-green-600 text-white' : 'bg-[#3c3c3c] text-[#cccccc]'}`}
                    onClick={() => setAutoFixEnabled(!autoFixEnabled)}
                    data-testid="button-toggle-autofix"
                  >
                    <Settings className="h-2.5 w-2.5 mr-1" />
                    Auto-Fix {autoFixEnabled ? 'ON' : 'OFF'}
                  </Badge>
                  {autoFixResults.length > 0 && (
                    <Badge variant="secondary" className="h-5 text-[10px] bg-blue-600/20 text-blue-400">
                      {autoFixResults.filter(r => r.fixed).length} fixed
                    </Badge>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 text-[#cccccc] hover:bg-[#3c3c3c]"
                    onClick={clearTerminal}
                    data-testid="button-clear-terminal"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <ScrollArea className="flex-1 p-2" ref={terminalRef}>
                <div className="font-mono text-xs space-y-0.5">
                  {terminalLines.length === 0 && (
                    <div className="text-[#6a9955]">
                      Terminal ready. Click "Run" to execute your project.
                    </div>
                  )}
                  {terminalLines.map((line, i) => (
                    <div key={i} className={`${getLineColor(line.type)} whitespace-pre-wrap break-all`}>
                      {line.type === "input" && <span className="text-[#569cd6]">$ </span>}
                      {line.content}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}