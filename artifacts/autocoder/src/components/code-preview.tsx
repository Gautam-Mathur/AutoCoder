import { useState, useMemo, useRef, useEffect } from "react";
import { Eye, EyeOff, Maximize2, Minimize2, ExternalLink, Play, FileCode, ChevronRight, ChevronDown, Folder, FolderOpen, Download, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiReact, SiNodedotjs, SiTypescript, SiPython } from "react-icons/si";

interface CodePreviewProps {
  code: string;
  language: string;
}

interface CombinedPreviewProps {
  html: string;
  css: string;
  javascript: string;
}

interface MultiFilePreviewProps {
  files: { name: string; content: string }[];
}

// Parse multi-file HTML content from AI response (old format)
export function parseMultiFileHtml(code: string): { name: string; content: string }[] | null {
  const filePattern = /<!--\s*FILE:\s*([^\s]+)\s*-->/gi;
  const matches: RegExpExecArray[] = [];
  let match: RegExpExecArray | null;

  while ((match = filePattern.exec(code)) !== null) {
    matches.push(match);
  }

  if (matches.length < 2) return null; // Need at least 2 files for multi-file

  const files: { name: string; content: string }[] = [];

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const fileName = m[1];
    const startIndex = m.index + m[0].length;
    const endIndex = i < matches.length - 1 ? matches[i + 1].index : code.length;
    const content = code.slice(startIndex, endIndex).trim();

    if (content) {
      files.push({ name: fileName, content });
    }
  }

  return files.length >= 2 ? files : null;
}

// Parse multi-file project content with --- FILE: path --- markers
export function parseProjectFiles(code: string): { path: string; content: string; language: string }[] | null {
  const filePattern = /---\s*FILE:\s*([^\s]+)\s*---/gi;
  const matches: RegExpExecArray[] = [];
  let match: RegExpExecArray | null;

  while ((match = filePattern.exec(code)) !== null) {
    matches.push(match);
  }

  if (matches.length < 2) return null; // Need at least 2 files

  const files: { path: string; content: string; language: string }[] = [];

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const filePath = m[1];
    const startIndex = m.index + m[0].length;
    const endIndex = i < matches.length - 1 ? matches[i + 1].index : code.length;
    const content = code.slice(startIndex, endIndex).trim();

    // Get language from file extension
    const ext = filePath.split('.').pop()?.toLowerCase() || 'text';
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'jsx': 'javascript',
      'css': 'css',
      'html': 'html',
      'json': 'json',
      'md': 'markdown',
      'py': 'python',
    };
    const language = languageMap[ext] || ext;

    if (content) {
      files.push({ path: filePath, content, language });
    }
  }

  return files.length >= 2 ? files : null;
}

interface ProjectFile {
  path: string;
  content: string;
  language: string;
}

interface ProjectFilesPreviewProps {
  files: ProjectFile[];
}

// Build hierarchical folder structure from flat file paths
interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children: TreeNode[];
  content?: string;
  language?: string;
}

function buildFileTree(files: ProjectFile[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const file of files) {
    const parts = file.path.split('/');
    let currentLevel = root;
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isLast = i === parts.length - 1;

      let existing = currentLevel.find(n => n.name === part);

      if (!existing) {
        existing = {
          name: part,
          path: currentPath,
          isFolder: !isLast,
          children: [],
          ...(isLast ? { content: file.content, language: file.language } : {})
        };
        currentLevel.push(existing);
      }

      if (!isLast) {
        currentLevel = existing.children;
      }
    }
  }

  // Sort: folders first, then files, alphabetically
  const sortTree = (nodes: TreeNode[]): TreeNode[] => {
    return nodes.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return a.name.localeCompare(b.name);
    }).map(node => ({
      ...node,
      children: sortTree(node.children)
    }));
  };

  return sortTree(root);
}

// Detect project type from files
function detectProjectType(files: ProjectFile[]): { type: string; icon: React.ReactNode; canPreview: boolean; message: string } {
  const filePaths = files.map(f => f.path.toLowerCase());
  const hasPackageJson = filePaths.some(f => f.endsWith('package.json'));
  const hasTsConfig = filePaths.some(f => f.includes('tsconfig'));
  const hasReact = files.some(f => f.content.includes('import React') || f.content.includes("from 'react'") || f.path.endsWith('.jsx') || f.path.endsWith('.tsx'));
  const hasNode = files.some(f => f.content.includes('express') || f.content.includes('require(') || f.path.includes('server.'));
  const hasPython = filePaths.some(f => f.endsWith('.py'));
  const hasHtml = filePaths.some(f => f.endsWith('.html') || f.endsWith('.htm'));
  const hasOnlyWebFiles = filePaths.every(f =>
    f.endsWith('.html') || f.endsWith('.htm') ||
    f.endsWith('.css') ||
    f.endsWith('.js') ||
    f.endsWith('.json') ||
    f.endsWith('.md') ||
    f.endsWith('.txt')
  );

  if (hasReact) {
    return {
      type: 'React App',
      icon: <SiReact className="w-4 h-4 text-cyan-500" />,
      canPreview: false,
      message: 'React apps need npm install & npm run dev to preview. Download and run locally.'
    };
  }

  if (hasNode || hasPackageJson) {
    return {
      type: 'Node.js Project',
      icon: <SiNodedotjs className="w-4 h-4 text-green-500" />,
      canPreview: false,
      message: 'Node.js projects need npm install & npm start to run. Download and run locally.'
    };
  }

  if (hasPython) {
    return {
      type: 'Python Project',
      icon: <SiPython className="w-4 h-4 text-yellow-500" />,
      canPreview: false,
      message: 'Python projects need python to run. Download and run locally.'
    };
  }

  if (hasTsConfig) {
    return {
      type: 'TypeScript Project',
      icon: <SiTypescript className="w-4 h-4 text-blue-500" />,
      canPreview: false,
      message: 'TypeScript projects need to be compiled. Download and run locally.'
    };
  }

  // Any project with HTML and only web files can be previewed
  if (hasHtml && hasOnlyWebFiles) {
    return {
      type: 'Static Website',
      icon: <FileCode className="w-4 h-4 text-orange-500" />,
      canPreview: true,
      message: 'This is a simple static site that can be previewed directly.'
    };
  }

  return {
    type: 'Project',
    icon: <FileCode className="w-4 h-4 text-primary" />,
    canPreview: false,
    message: 'Download the files to run this project locally.'
  };
}

// File tree node component
function FileTreeNode({
  node,
  activeFile,
  onSelectFile,
  depth = 0
}: {
  node: TreeNode;
  activeFile: string;
  onSelectFile: (path: string) => void;
  depth?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'html') return <span className="text-orange-500">{'<>'}</span>;
    if (ext === 'css') return <span className="text-blue-500">#</span>;
    if (ext === 'js') return <span className="text-yellow-500">JS</span>;
    if (ext === 'jsx') return <SiReact className="w-3 h-3 text-cyan-500" />;
    if (ext === 'ts') return <SiTypescript className="w-3 h-3 text-blue-500" />;
    if (ext === 'tsx') return <SiReact className="w-3 h-3 text-cyan-500" />;
    if (ext === 'json') return <span className="text-yellow-600">{'{}'}</span>;
    if (ext === 'py') return <SiPython className="w-3 h-3 text-yellow-500" />;
    if (ext === 'md') return <span className="text-gray-500">MD</span>;
    return <FileCode className="w-3 h-3" />;
  };

  if (node.isFolder) {
    return (
      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full text-left px-2 py-1 rounded text-xs flex items-center gap-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {isExpanded ? (
            <ChevronDown className="w-3 h-3 shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 shrink-0" />
          )}
          {isExpanded ? (
            <FolderOpen className="w-3.5 h-3.5 text-primary shrink-0" />
          ) : (
            <Folder className="w-3.5 h-3.5 text-primary shrink-0" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {isExpanded && (
          <div>
            {node.children.map((child) => (
              <FileTreeNode
                key={child.path}
                node={child}
                activeFile={activeFile}
                onSelectFile={onSelectFile}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelectFile(node.path)}
      className={`w-full text-left px-2 py-1 rounded text-xs flex items-center gap-1.5 transition-colors ${
        activeFile === node.path
          ? 'bg-primary/20 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
      style={{ paddingLeft: `${depth * 12 + 20}px` }}
      data-testid={`file-tab-${node.path.replace(/\//g, '-')}`}
    >
      <span className="shrink-0 text-[10px] font-mono">{getFileIcon(node.name)}</span>
      <span className="truncate">{node.name}</span>
    </button>
  );
}

// Multi-file project preview with hierarchical file tree
export function ProjectFilesPreview({ files }: ProjectFilesPreviewProps) {
  const [activeFile, setActiveFile] = useState(files[0]?.path || '');
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const activeContent = files.find(f => f.path === activeFile);
  const fileTree = useMemo(() => buildFileTree(files), [files]);
  const projectInfo = useMemo(() => detectProjectType(files), [files]);

  // Build combined preview for static websites
  const combinedPreview = useMemo(() => {
    if (!projectInfo.canPreview) return "";

    // Find main HTML file (index.html or first .html file)
    const htmlFile = files.find(f => f.path.toLowerCase().endsWith('index.html'))
      || files.find(f => f.path.toLowerCase().endsWith('.html'))
      || files.find(f => f.language === 'html');
    const cssFiles = files.filter(f => f.language === 'css' || f.path.toLowerCase().endsWith('.css'));
    const jsFiles = files.filter(f => f.language === 'javascript' || f.path.toLowerCase().endsWith('.js'));

    if (!htmlFile) return "";

    let html = htmlFile.content;

    // Remove ALL external script and link references that won't work in sandbox
    html = html.replace(/<script[^>]+src\s*=\s*["'][^"']*["'][^>]*><\/script>/gi, '');
    html = html.replace(/<script[^>]+src\s*=\s*["'][^"']*["'][^>]*\/>/gi, '');
    // Remove script tags with type="module"
    html = html.replace(/<script[^>]+type\s*=\s*["']module["'][^>]*><\/script>/gi, '');
    html = html.replace(/<script[^>]+type\s*=\s*["']module["'][^>]*\/>/gi, '');
    html = html.replace(/<link[^>]+href\s*=\s*["'][^"']*["'][^>]*\/?>/gi, '');

    // Ensure we have a proper HTML structure
    if (!html.includes('<!DOCTYPE') && !html.includes('<html')) {
      html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
</head>
<body>
${html}
</body>
</html>`;
    }

    // Inject CSS into head (make sure not to duplicate if already embedded)
    if (cssFiles.length > 0) {
      const combinedCss = cssFiles.map(f => f.content).join('\n\n');
      const styleTag = `<style>\n/* Combined CSS from project files */\n${combinedCss}\n</style>`;
      if (html.includes('</head>')) {
        html = html.replace('</head>', `${styleTag}\n</head>`);
      } else if (html.includes('<body')) {
        html = html.replace(/<body[^>]*>/i, (match) => `${styleTag}\n${match}`);
      } else {
        html = styleTag + '\n' + html;
      }
    }

    // Inject JS before </body>
    if (jsFiles.length > 0) {
      const combinedJs = jsFiles.map(f => f.content).join('\n\n');
      const scriptTag = `<script>\n// Combined JS from project files\n${combinedJs}\n</script>`;
      if (html.includes('</body>')) {
        html = html.replace('</body>', `${scriptTag}\n</body>`);
      } else {
        html = html + '\n' + scriptTag;
      }
    }

    return html;
  }, [files, projectInfo.canPreview]);

  const copyFile = async (path: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedFile(path);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  const copyAllFiles = async () => {
    const allContent = files.map(f => `// --- ${f.path} ---\n${f.content}`).join('\n\n');
    await navigator.clipboard.writeText(allContent);
    setCopiedFile('all');
    setTimeout(() => setCopiedFile(null), 2000);
  };

  const downloadAsZip = async () => {
    // Create a simple text file with all code (no external lib needed)
    const content = files.map(f =>
      `${'='.repeat(60)}\n FILE: ${f.path}\n${'='.repeat(60)}\n\n${f.content}\n\n`
    ).join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project-files.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const openInNewTab = () => {
    if (!combinedPreview) return;
    const blob = new Blob([combinedPreview], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (files.length === 0) return null;

  return (
    <div className="my-4 rounded-lg border border-border overflow-hidden bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {projectInfo.icon}
            <span className="text-sm font-medium">{projectInfo.type}</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {files.length} files
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {/* Preview button for static websites */}
          {projectInfo.canPreview && combinedPreview && (
            <>
              <Button
                size="sm"
                variant={showPreview ? "default" : "outline"}
                onClick={() => setShowPreview(!showPreview)}
                className="text-xs gap-1"
                data-testid="button-preview-project"
              >
                {showPreview ? (
                  <>
                    <EyeOff className="w-3 h-3" />
                    Hide Preview
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3" />
                    Run Preview
                  </>
                )}
              </Button>
              {showPreview && (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    data-testid="button-fullscreen-project"
                  >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={openInNewTab}
                    data-testid="button-open-project-new-tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </>
              )}
            </>
          )}
          <Button
            size="sm"
            variant="default"
            onClick={() => {
              setShowPreview(true);
              const previewPanel = document.querySelector('[data-testid="preview-panel"]');
              if (previewPanel) {
                previewPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
            className="text-xs gap-1"
            data-testid="button-run-app"
          >
            <Play className="w-3 h-3" />
            Run App
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={downloadAsZip}
            className="text-xs gap-1"
            data-testid="button-download-project"
          >
            <Download className="w-3 h-3" />
            Download
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={copyAllFiles}
            className="text-xs gap-1"
            data-testid="button-copy-all-files"
          >
            {copiedFile === 'all' ? 'Copied!' : 'Copy All'}
          </Button>
        </div>
      </div>

      {/* Live Preview iframe for static websites */}
      {showPreview && projectInfo.canPreview && combinedPreview && (
        <div className={`border-b border-border ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : ''}`}>
          {isFullscreen && (
            <div className="flex items-center justify-between px-4 py-2 bg-muted border-b border-border">
              <span className="text-sm font-medium">Live Preview</span>
              <Button size="icon" variant="ghost" onClick={() => setIsFullscreen(false)}>
                <Minimize2 className="w-4 h-4" />
              </Button>
            </div>
          )}
          <iframe
            ref={iframeRef}
            srcDoc={combinedPreview}
            className={`w-full bg-white ${isFullscreen ? 'h-[calc(100vh-48px)]' : 'h-[400px]'}`}
            sandbox="allow-scripts"
            title="Project Preview"
          />
        </div>
      )}

      {/* Preview notice for non-previewable projects */}
      {!projectInfo.canPreview && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{projectInfo.message}</span>
        </div>
      )}

      <div className="flex">
        {/* Hierarchical File Tree Sidebar */}
        <div className="w-56 border-r border-border bg-muted/30 p-2 min-h-[350px] max-h-[500px] overflow-y-auto">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2 px-2 font-medium">Explorer</div>
          {fileTree.map((node) => (
            <FileTreeNode
              key={node.path}
              node={node}
              activeFile={activeFile}
              onSelectFile={setActiveFile}
            />
          ))}
        </div>

        {/* File Content */}
        <div className="flex-1 min-w-0">
          {activeContent && (
            <div>
              <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground">{activeContent.path}</span>
                  <Badge variant="outline" className="text-xs">
                    {activeContent.language}
                  </Badge>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => copyFile(activeContent.path, activeContent.content)}
                  data-testid={`button-copy-${activeContent.path.replace(/\//g, '-')}`}
                >
                  {copiedFile === activeContent.path ? (
                    <span className="text-green-500 text-xs">✓</span>
                  ) : (
                    <span className="text-xs">Copy</span>
                  )}
                </Button>
              </div>
              <pre className="p-4 overflow-x-auto max-h-[450px] overflow-y-auto text-xs bg-muted/20">
                <code className="font-mono leading-relaxed whitespace-pre">{activeContent.content}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function CodePreview({ code, language }: CodePreviewProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Don't show preview for multi-file content with --- FILE: markers
  const hasFileMarkers = /---\s*FILE:\s*[^\s]+\s*---/i.test(code);
  const canPreview = (language === "html" || language === "htm") && !hasFileMarkers;

  const srcdoc = useMemo(() => {
    if (!canPreview) return "";
    let html = code;
    // Strip external script and module references
    html = html.replace(/<script[^>]+src\s*=\s*["'][^"']*["'][^>]*><\/script>/gi, '');
    html = html.replace(/<script[^>]+src\s*=\s*["'][^"']*["'][^>]*\/>/gi, '');
    html = html.replace(/<script[^>]+type\s*=\s*["']module["'][^>]*><\/script>/gi, '');
    html = html.replace(/<script[^>]+type\s*=\s*["']module["'][^>]*\/>/gi, '');
    html = html.replace(/<link[^>]+href\s*=\s*["'][^"']*["'][^>]*\/?>/gi, '');
    return html;
  }, [code, canPreview]);

  const openInNewTab = () => {
    const blob = new Blob([code], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (!canPreview) return null;

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 mb-2">
        <Button
          size="sm"
          variant={showPreview ? "default" : "outline"}
          onClick={() => setShowPreview(!showPreview)}
          className="gap-1.5 text-xs"
          data-testid="button-toggle-preview"
        >
          {showPreview ? (
            <>
              <EyeOff className="w-3.5 h-3.5" />
              Hide Preview
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5" />
              Live Preview
            </>
          )}
        </Button>

        {showPreview && (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="gap-1.5 text-xs"
              data-testid="button-fullscreen-preview"
            >
              {isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={openInNewTab}
              className="gap-1.5 text-xs"
              data-testid="button-open-new-tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </>
        )}
      </div>

      {showPreview && (
        <div
          className={`relative bg-white rounded-lg overflow-hidden border border-border transition-all ${
            isFullscreen
              ? "fixed inset-4 z-50 shadow-2xl"
              : "h-[400px]"
          }`}
        >
          {isFullscreen && (
            <div className="absolute top-2 right-2 z-10">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setIsFullscreen(false)}
                className="gap-1.5 shadow-lg"
              >
                <Minimize2 className="w-4 h-4" />
                Exit Fullscreen
              </Button>
            </div>
          )}

          <iframe
            title="Code Preview"
            className="w-full h-full"
            srcDoc={srcdoc}
            sandbox="allow-scripts"
            data-testid="iframe-code-preview"
          />
        </div>
      )}

      {isFullscreen && showPreview && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsFullscreen(false)}
        />
      )}
    </div>
  );
}

export function CombinedAppPreview({ html, css, javascript }: CombinedPreviewProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Don't show combined preview if content has --- FILE: markers (handled by ProjectFilesPreview)
  const hasFileMarkers = /---\s*FILE:\s*[^\s]+\s*---/i.test(html + css + javascript);

  const combinedCode = useMemo(() => {
    if (hasFileMarkers) return "";
    let baseHtml = html.trim();

    // Remove ALL external script and link references that won't work in sandbox
    baseHtml = baseHtml.replace(/<script[^>]+src\s*=\s*["'][^"']*["'][^>]*><\/script>/gi, '');
    baseHtml = baseHtml.replace(/<script[^>]+src\s*=\s*["'][^"']*["'][^>]*\/>/gi, '');
    // Remove script tags with type="module"
    baseHtml = baseHtml.replace(/<script[^>]+type\s*=\s*["']module["'][^>]*><\/script>/gi, '');
    baseHtml = baseHtml.replace(/<script[^>]+type\s*=\s*["']module["'][^>]*\/>/gi, '');
    // Also remove link tags with external hrefs
    baseHtml = baseHtml.replace(/<link[^>]+href\s*=\s*["'][^"']*["'][^>]*\/?>/gi, '');

    if (!baseHtml.includes('<!DOCTYPE') && !baseHtml.includes('<html')) {
      baseHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>App Preview</title>
  ${css ? `<style>${css}</style>` : ''}
</head>
<body>
${baseHtml}
${javascript ? `<script>${javascript}</script>` : ''}
</body>
</html>`;
    } else {
      if (css && !baseHtml.includes(css)) {
        const styleTag = `<style>${css}</style>`;
        if (baseHtml.includes('</head>')) {
          baseHtml = baseHtml.replace('</head>', `${styleTag}</head>`);
        } else if (baseHtml.includes('<body')) {
          baseHtml = baseHtml.replace(/<body[^>]*>/, (match) => `${styleTag}${match}`);
        }
      }

      if (javascript && !baseHtml.includes(javascript)) {
        const scriptTag = `<script>${javascript}</script>`;
        if (baseHtml.includes('</body>')) {
          baseHtml = baseHtml.replace('</body>', `${scriptTag}</body>`);
        } else {
          baseHtml += scriptTag;
        }
      }
    }

    return baseHtml;
  }, [html, css, javascript]);

  const openInNewTab = () => {
    const blob = new Blob([combinedCode], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const hasContent = html || css || javascript;
  if (!hasContent || hasFileMarkers) return null;

  return (
    <div className="my-4 p-4 rounded-lg bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-primary/20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Play className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">Full App Preview</h4>
            <p className="text-xs text-muted-foreground">
              {[html && 'HTML', css && 'CSS', javascript && 'JS'].filter(Boolean).join(' + ')} combined
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={showPreview ? "default" : "outline"}
            onClick={() => setShowPreview(!showPreview)}
            className="gap-1.5"
            data-testid="button-run-full-app"
          >
            {showPreview ? (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                Hide
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                Run App
              </>
            )}
          </Button>

          {showPreview && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsFullscreen(!isFullscreen)}
                data-testid="button-fullscreen-combined"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={openInNewTab}
                data-testid="button-open-combined-new-tab"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {showPreview && (
        <div
          className={`relative bg-white rounded-lg overflow-hidden border border-border transition-all ${
            isFullscreen
              ? "fixed inset-4 z-50 shadow-2xl"
              : "h-[500px]"
          }`}
        >
          {isFullscreen && (
            <div className="absolute top-2 right-2 z-10">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setIsFullscreen(false)}
                className="gap-1.5 shadow-lg"
              >
                <Minimize2 className="w-4 h-4" />
                Exit
              </Button>
            </div>
          )}

          <iframe
            title="Combined App Preview"
            className="w-full h-full"
            srcDoc={combinedCode}
            sandbox="allow-scripts"
            data-testid="iframe-combined-preview"
          />
        </div>
      )}

      {isFullscreen && showPreview && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsFullscreen(false)}
        />
      )}
    </div>
  );
}

// Multi-file website preview with navigation
export function MultiFilePreview({ files }: MultiFilePreviewProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentFile, setCurrentFile] = useState(files[0]?.name || 'index.html');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const currentContent = useMemo(() => {
    const file = files.find(f => f.name === currentFile);
    if (!file) return files[0]?.content || '';

    // Strip external script and module references
    let content = file.content;
    content = content.replace(/<script[^>]+src\s*=\s*["'][^"']*["'][^>]*>[\s\S]*?<\/script>/gi, '');
    content = content.replace(/<script[^>]+src\s*=\s*["'][^"']*["'][^>]*\/>/gi, '');
    content = content.replace(/<script[^>]+type\s*=\s*["']module["'][^>]*>[\s\S]*?<\/script>/gi, '');
    content = content.replace(/<script[^>]+type\s*=\s*["']module["'][^>]*\/>/gi, '');
    content = content.replace(/<link[^>]+href\s*=\s*["'][^"']*["'][^>]*\/?>/gi, '');

    // Inject navigation handler script
    const navScript = `
<script>
  document.addEventListener('click', function(e) {
    const link = e.target.closest('a');
    if (link && link.getAttribute('href')) {
      const href = link.getAttribute('href');
      if (href.endsWith('.html') && !href.startsWith('http')) {
        e.preventDefault();
        window.parent.postMessage({ type: 'navigate', page: href }, '*');
      }
    }
  });
</script>`;

    if (content.includes('</body>')) {
      content = content.replace('</body>', `${navScript}</body>`);
    } else {
      content += navScript;
    }

    return content;
  }, [files, currentFile]);

  // Listen for navigation messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'navigate' && event.data?.page) {
        const pageName = event.data.page.replace('./', '');
        if (files.some(f => f.name === pageName)) {
          setCurrentFile(pageName);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [files]);

  const openInNewTab = () => {
    const blob = new Blob([currentContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (files.length === 0) return null;

  return (
    <div className="my-4 p-4 rounded-lg bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border border-blue-500/20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
            <FileCode className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">Multi-Page Website</h4>
            <p className="text-xs text-muted-foreground">
              {files.length} connected pages
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={showPreview ? "default" : "outline"}
            onClick={() => setShowPreview(!showPreview)}
            className="gap-1.5"
            data-testid="button-run-multi-file"
          >
            {showPreview ? (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                Hide
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                Run Website
              </>
            )}
          </Button>

          {showPreview && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsFullscreen(!isFullscreen)}
                data-testid="button-fullscreen-multi"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={openInNewTab}
                data-testid="button-open-multi-new-tab"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* File tabs */}
      <div className="flex flex-wrap gap-1 mb-3">
        {files.map((file) => (
          <Badge
            key={file.name}
            variant={currentFile === file.name ? "default" : "outline"}
            className="cursor-pointer text-xs px-2 py-1 hover-elevate"
            onClick={() => setCurrentFile(file.name)}
            data-testid={`tab-${file.name}`}
          >
            {file.name}
            {currentFile === file.name && <ChevronRight className="w-3 h-3 ml-1" />}
          </Badge>
        ))}
      </div>

      {showPreview && (
        <div
          className={`relative bg-white rounded-lg overflow-hidden border border-border transition-all ${
            isFullscreen
              ? "fixed inset-4 z-50 shadow-2xl"
              : "h-[500px]"
          }`}
        >
          {isFullscreen && (
            <div className="absolute top-2 right-2 z-10 flex gap-2">
              {/* File tabs in fullscreen */}
              <div className="flex gap-1 bg-background/90 backdrop-blur rounded-lg p-1">
                {files.map((file) => (
                  <Badge
                    key={file.name}
                    variant={currentFile === file.name ? "default" : "secondary"}
                    className="cursor-pointer text-xs"
                    onClick={() => setCurrentFile(file.name)}
                  >
                    {file.name}
                  </Badge>
                ))}
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setIsFullscreen(false)}
                className="gap-1.5 shadow-lg"
              >
                <Minimize2 className="w-4 h-4" />
                Exit
              </Button>
            </div>
          )}

          <iframe
            ref={iframeRef}
            title={`Preview: ${currentFile}`}
            className="w-full h-full"
            srcDoc={currentContent}
            sandbox="allow-scripts"
            data-testid="iframe-multi-preview"
          />
        </div>
      )}

      {isFullscreen && showPreview && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsFullscreen(false)}
        />
      )}
    </div>
  );
}