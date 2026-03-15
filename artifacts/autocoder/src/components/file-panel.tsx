import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ChevronRight, ChevronDown, File, Folder, Plus, Trash2, Eye, X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { SiReact, SiTypescript, SiPython, SiNodedotjs } from "react-icons/si";
import type { ProjectFile } from "@shared/schema";

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children: TreeNode[];
  content?: string;
  language?: string;
  id?: number;
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
          ...(isLast ? { content: file.content, language: file.language, id: file.id } : {}),
        };
        currentLevel.push(existing);
      }

      if (!isLast) {
        currentLevel = existing.children;
      }
    }
  }

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

function FileTreeNode({
  node,
  activeFile,
  onSelectFile,
  onDeleteFile,
  depth = 0
}: {
  node: TreeNode;
  activeFile: string | null;
  onSelectFile: (path: string) => void;
  onDeleteFile?: (id: number) => void;
  depth?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'html') return <span className="text-orange-500 text-xs font-mono">{'<>'}</span>;
    if (ext === 'css') return <span className="text-blue-500 text-xs font-bold">#</span>;
    if (ext === 'js') return <span className="text-yellow-500 text-xs font-bold">JS</span>;
    if (ext === 'jsx') return <SiReact className="w-3 h-3 text-cyan-500" />;
    if (ext === 'ts') return <SiTypescript className="w-3 h-3 text-blue-500" />;
    if (ext === 'tsx') return <SiReact className="w-3 h-3 text-cyan-500" />;
    if (ext === 'py') return <SiPython className="w-3 h-3 text-yellow-500" />;
    if (ext === 'json') return <span className="text-yellow-400 text-xs">{'{}'}</span>;
    if (ext === 'md') return <span className="text-gray-400 text-xs">MD</span>;
    return <File className="w-3 h-3 text-muted-foreground" />;
  };

  if (node.isFolder) {
    return (
      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 w-full px-2 py-1 text-xs text-left text-muted-foreground hover-elevate rounded"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          data-testid={`folder-${node.name}`}
        >
          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          <Folder className="w-3 h-3 text-primary" />
          <span className="truncate">{node.name}</span>
        </button>
        {isExpanded && node.children.map((child) => (
          <FileTreeNode
            key={child.path}
            node={child}
            activeFile={activeFile}
            onSelectFile={onSelectFile}
            onDeleteFile={onDeleteFile}
            depth={depth + 1}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="group flex items-center">
      <button
        onClick={() => onSelectFile(node.path)}
        className={`flex-1 flex items-center gap-1.5 px-2 py-1 text-xs text-left rounded transition-colors ${
          activeFile === node.path ? 'bg-primary/20 text-primary' : 'text-foreground/80 hover-elevate'
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        data-testid={`file-${node.name}`}
      >
        {getFileIcon(node.name)}
        <span className="truncate">{node.name}</span>
      </button>
      {node.id && onDeleteFile && (
        <button
          onClick={() => onDeleteFile(node.id!)}
          className="invisible group-hover:visible p-1 text-muted-foreground hover:text-destructive"
          data-testid={`delete-file-${node.name}`}
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

interface FilePanelProps {
  conversationId: number | null;
  onFileSelect?: (file: ProjectFile) => void;
}

export function FilePanel({ conversationId, onFileSelect }: FilePanelProps) {
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const { data: files = [], isLoading } = useQuery<ProjectFile[]>({
    queryKey: ["/api/conversations", conversationId, "files"],
    enabled: !!conversationId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/files/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "files"] });
      setActiveFilePath(null);
    },
  });

  const fileTree = useMemo(() => buildFileTree(files), [files]);
  const activeFile = files.find(f => f.path === activeFilePath);

  const handleFileSelect = (path: string) => {
    setActiveFilePath(path);
    const file = files.find(f => f.path === path);
    if (file && onFileSelect) {
      onFileSelect(file);
    }
  };

  const handleDeleteFile = (id: number) => {
    if (confirm("Delete this file?")) {
      deleteMutation.mutate(id);
    }
  };

  const getCombinedPreview = () => {
    const htmlFile = files.find(f => f.path.toLowerCase().endsWith('index.html') || f.path.toLowerCase().endsWith('.html'));
    const cssFiles = files.filter(f => f.path.toLowerCase().endsWith('.css'));
    const jsFiles = files.filter(f => f.path.toLowerCase().endsWith('.js'));

    if (!htmlFile) return null;

    let html = htmlFile.content;

    // Remove ALL external script and link references that won't work in sandbox
    html = html.replace(/<script[^>]+src\s*=\s*["'][^"']*["'][^>]*>[\s\S]*?<\/script>/gi, '');
    html = html.replace(/<script[^>]+src\s*=\s*["'][^"']*["'][^>]*\/>/gi, '');
    // Remove script tags with type="module"
    html = html.replace(/<script[^>]+type\s*=\s*["']module["'][^>]*>[\s\S]*?<\/script>/gi, '');
    html = html.replace(/<script[^>]+type\s*=\s*["']module["'][^>]*\/>/gi, '');
    // Remove link tags with external hrefs
    html = html.replace(/<link[^>]+href\s*=\s*["'][^"']*["'][^>]*\/?>/gi, '');

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

    if (cssFiles.length > 0) {
      const combinedCss = cssFiles.map(f => f.content).join('\n\n');
      const styleTag = `<style>\n${combinedCss}\n</style>`;
      if (html.includes('</head>')) {
        html = html.replace('</head>', `${styleTag}\n</head>`);
      } else if (html.includes('<body')) {
        html = html.replace(/<body[^>]*>/i, (match) => `${styleTag}\n${match}`);
      } else {
        html = styleTag + '\n' + html;
      }
    }

    if (jsFiles.length > 0) {
      const combinedJs = jsFiles.map(f => f.content).join('\n\n');
      const scriptTag = `<script>\n${combinedJs}\n</script>`;
      if (html.includes('</body>')) {
        html = html.replace('</body>', `${scriptTag}\n</body>`);
      } else {
        html = html + '\n' + scriptTag;
      }
    }

    return html;
  };

  if (!conversationId) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm p-4 text-center">
        Start a conversation to see project files
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        Loading files...
      </div>
    );
  }

  const hasPreviewableContent = files.some(f => f.path.toLowerCase().endsWith('.html'));

  return (
    <div className="h-full flex flex-col bg-sidebar">
      <div className="flex items-center justify-between px-3 py-2 border-b border-sidebar-border">
        <span className="text-xs font-medium text-sidebar-foreground">Files</span>
        <div className="flex items-center gap-1">
          {hasPreviewableContent && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => setShowPreview(true)}
              data-testid="button-preview-project"
            >
              <Eye className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {files.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs p-4 text-center">
          No files yet. Generate some code to populate your project.
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="py-2">
            {fileTree.map((node) => (
              <FileTreeNode
                key={node.path}
                node={node}
                activeFile={activeFilePath}
                onSelectFile={handleFileSelect}
                onDeleteFile={handleDeleteFile}
              />
            ))}
          </div>
        </ScrollArea>
      )}

      {activeFile && (
        <div className="border-t border-sidebar-border p-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium truncate">{activeFile.path}</span>
            <Button
              size="icon"
              variant="ghost"
              className="h-5 w-5"
              onClick={() => setActiveFilePath(null)}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
          <ScrollArea className="h-32">
            <pre className="text-[10px] font-mono bg-muted p-2 rounded overflow-x-auto">
              {activeFile.content.slice(0, 500)}
              {activeFile.content.length > 500 && '...'}
            </pre>
          </ScrollArea>
        </div>
      )}

      {showPreview && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-card border rounded-lg shadow-lg w-[90vw] h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 border-b">
              <span className="font-medium">Project Preview</span>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowPreview(false)}
                data-testid="button-close-preview"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 bg-white">
              <iframe
                srcDoc={getCombinedPreview() || ''}
                className="w-full h-full border-0"
                sandbox="allow-scripts"
                title="Project Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}