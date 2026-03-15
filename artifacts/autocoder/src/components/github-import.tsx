import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Folder,
  FolderOpen,
  FileCode,
  Github,
  Loader2,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  AlertCircle,
  Upload,
  Check,
  X
} from "lucide-react";
import { SiGithub } from "react-icons/si";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  default_branch: string;
  updated_at: string;
  private: boolean;
}

interface RepoContent {
  name: string;
  path: string;
  type: "file" | "dir";
  sha: string;
  size?: number;
  content?: string;
}

interface GitHubImportProps {
  conversationId: number;
  onImportComplete?: () => void;
}

function RepoFileTree({
  owner,
  repo,
  branch,
  path = "",
  selectedFiles,
  onToggleFile,
  depth = 0
}: {
  owner: string;
  repo: string;
  branch: string;
  path?: string;
  selectedFiles: Set<string>;
  onToggleFile: (path: string) => void;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(depth < 1);

  const { data: contents, isLoading } = useQuery<RepoContent[]>({
    queryKey: ["/api/github/repos", owner, repo, "contents", path, branch],
    queryFn: async () => {
      const url = `/api/github/repos/${owner}/${repo}/contents?path=${encodeURIComponent(path)}&ref=${branch}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch contents");
      return response.json();
    },
    enabled: expanded
  });

  if (isLoading && expanded) {
    return (
      <div className="flex items-center gap-2 py-1 text-muted-foreground" style={{ paddingLeft: `${depth * 16 + 8}px` }}>
        <Loader2 className="w-3 h-3 animate-spin" />
        <span className="text-xs">Loading...</span>
      </div>
    );
  }

  const items = contents || [];
  const folders = items.filter(item => item.type === "dir");
  const files = items.filter(item => item.type === "file");

  return (
    <div>
      {depth > 0 && (
        <div
          className="flex items-center gap-1 py-1 cursor-pointer hover-elevate rounded-sm"
          style={{ paddingLeft: `${depth * 16}px` }}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          {expanded ? <FolderOpen className="w-4 h-4 text-yellow-500" /> : <Folder className="w-4 h-4 text-yellow-500" />}
          <span className="text-sm">{path.split('/').pop()}</span>
        </div>
      )}
      {expanded && (
        <>
          {folders.map((folder) => (
            <RepoFileTree
              key={folder.path}
              owner={owner}
              repo={repo}
              branch={branch}
              path={folder.path}
              selectedFiles={selectedFiles}
              onToggleFile={onToggleFile}
              depth={depth + 1}
            />
          ))}
          {files.map((file) => (
            <div
              key={file.path}
              className="flex items-center gap-2 py-1 cursor-pointer hover-elevate rounded-sm"
              style={{ paddingLeft: `${(depth + 1) * 16}px` }}
              onClick={() => onToggleFile(file.path)}
              data-testid={`github-file-${file.name}`}
            >
              <Checkbox
                checked={selectedFiles.has(file.path)}
                onCheckedChange={() => onToggleFile(file.path)}
              />
              <FileCode className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{file.name}</span>
              {file.size && (
                <span className="text-xs text-muted-foreground ml-auto">
                  {file.size > 1024 ? `${(file.size / 1024).toFixed(1)}KB` : `${file.size}B`}
                </span>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

type ImportMode = "browse" | "url";

function parseGitHubUrl(url: string): { owner: string; repo: string; branch?: string; path?: string } | null {
  try {
    const trimmed = url.trim();
    // Handle various GitHub URL formats:
    // https://github.com/owner/repo
    // https://github.com/owner/repo/tree/branch
    // https://github.com/owner/repo/tree/branch/path/to/folder
    // https://github.com/owner/repo/blob/branch/path/to/file
    // owner/repo (shorthand)

    let match = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/]+)(?:\/(?:tree|blob)\/([^\/]+)(?:\/(.+))?)?/);
    if (match) {
      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/, ''),
        branch: match[3],
        path: match[4]
      };
    }

    // Shorthand format: owner/repo
    match = trimmed.match(/^([^\/]+)\/([^\/]+)$/);
    if (match) {
      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/, '')
      };
    }

    return null;
  } catch {
    return null;
  }
}

export function GitHubImport({ conversationId, onImportComplete }: GitHubImportProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ImportMode>("browse");
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [urlRepo, setUrlRepo] = useState<{ owner: string; repo: string; branch: string } | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  const { data: repos, isLoading: reposLoading, error: reposError, refetch } = useQuery<GitHubRepo[]>({
    queryKey: ["/api/github/repos"],
    enabled: open
  });

  const importMutation = useMutation({
    mutationFn: async ({ files, owner, repo, branch }: { files: string[]; owner?: string; repo?: string; branch?: string }) => {
      const importOwner = owner || (selectedRepo ? selectedRepo.full_name.split('/')[0] : null);
      const importRepo = repo || selectedRepo?.name;
      const importBranch = branch || selectedRepo?.default_branch;

      if (!importOwner || !importRepo || !importBranch) throw new Error("No repo selected");

      return apiRequest("POST", `/api/conversations/${conversationId}/import-github`, {
        owner: importOwner,
        repo: importRepo,
        branch: importBranch,
        files
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "files"] });
      setOpen(false);
      setSelectedRepo(null);
      setUrlRepo(null);
      setUrlInput("");
      setSelectedFiles(new Set());
      onImportComplete?.();
    }
  });

  const handleUrlSubmit = useCallback(async () => {
    const parsed = parseGitHubUrl(urlInput);
    if (!parsed) {
      setUrlError("Invalid GitHub URL. Use format: https://github.com/owner/repo or owner/repo");
      return;
    }

    setUrlError(null);
    setUrlRepo({
      owner: parsed.owner,
      repo: parsed.repo,
      branch: parsed.branch || "main"
    });
  }, [urlInput]);

  const toggleFile = useCallback((path: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const filteredRepos = repos?.filter(repo =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleImport = () => {
    if (selectedFiles.size === 0) return;

    if (mode === "url" && urlRepo) {
      importMutation.mutate({
        files: Array.from(selectedFiles),
        owner: urlRepo.owner,
        repo: urlRepo.repo,
        branch: urlRepo.branch
      });
    } else {
      importMutation.mutate({ files: Array.from(selectedFiles) });
    }
  };

  const activeRepo = mode === "url" ? urlRepo : selectedRepo;
  const activeOwner = mode === "url" ? urlRepo?.owner : selectedRepo?.full_name.split('/')[0];
  const activeRepoName = mode === "url" ? urlRepo?.repo : selectedRepo?.name;
  const activeBranch = mode === "url" ? (urlRepo?.branch || "main") : (selectedRepo?.default_branch || "main");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5" data-testid="button-github-import">
          <SiGithub className="w-4 h-4" />
          Import from GitHub
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SiGithub className="w-5 h-5" />
            Import from GitHub
          </DialogTitle>
          <DialogDescription>
            Select a repository and choose files to import into your project.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-3">
          {/* Mode tabs */}
          {!activeRepo && (
            <div className="flex gap-1 border-b pb-2">
              <Button
                variant={mode === "browse" ? "default" : "ghost"}
                size="sm"
                onClick={() => { setMode("browse"); setUrlRepo(null); setUrlInput(""); setUrlError(null); }}
                data-testid="button-mode-browse"
              >
                My Repos
              </Button>
              <Button
                variant={mode === "url" ? "default" : "ghost"}
                size="sm"
                onClick={() => { setMode("url"); setSelectedRepo(null); }}
                data-testid="button-mode-url"
              >
                From URL
              </Button>
            </div>
          )}

          {/* Browse mode - repo list */}
          {mode === "browse" && !selectedRepo ? (
            <>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search repositories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                  data-testid="input-search-repos"
                />
                <Button size="icon" variant="ghost" onClick={() => refetch()} data-testid="button-refresh-repos">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>

              <ScrollArea className="flex-1 max-h-[400px]">
                {reposLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : reposError ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <AlertCircle className="w-8 h-8 mb-2 text-destructive" />
                    <p className="text-sm">Failed to load repositories</p>
                    <p className="text-xs">Make sure GitHub is connected</p>
                  </div>
                ) : filteredRepos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Github className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-sm">No repositories found</p>
                  </div>
                ) : (
                  <div className="space-y-2 p-1">
                    {filteredRepos.map((repo) => (
                      <Card
                        key={repo.id}
                        className="p-3 cursor-pointer hover-elevate"
                        onClick={() => setSelectedRepo(repo)}
                        data-testid={`repo-${repo.name}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{repo.name}</span>
                              {repo.private && <Badge variant="secondary" className="text-xs">Private</Badge>}
                            </div>
                            {repo.description && (
                              <p className="text-sm text-muted-foreground truncate mt-1">{repo.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              {repo.language && <span>{repo.language}</span>}
                              <span>{new Date(repo.updated_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </>
          ) : mode === "url" && !urlRepo ? (
            /* URL mode - paste URL */
            <div className="flex flex-col gap-4 py-4">
              <div className="text-center">
                <Github className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Paste a GitHub repository URL to import files
                </p>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="https://github.com/owner/repo or owner/repo"
                  value={urlInput}
                  onChange={(e) => { setUrlInput(e.target.value); setUrlError(null); }}
                  onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
                  className="flex-1"
                  data-testid="input-github-url"
                />
                <Button onClick={handleUrlSubmit} data-testid="button-load-url">
                  Load
                </Button>
              </div>

              {urlError && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  {urlError}
                </div>
              )}

              <div className="text-xs text-muted-foreground space-y-1">
                <p>Supported formats:</p>
                <ul className="list-disc list-inside space-y-0.5 ml-2">
                  <li>https://github.com/owner/repo</li>
                  <li>https://github.com/owner/repo/tree/branch</li>
                  <li>owner/repo</li>
                </ul>
              </div>
            </div>
          ) : activeRepo ? (
            /* File browser for selected repo */
            <>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (mode === "url") {
                      setUrlRepo(null);
                    } else {
                      setSelectedRepo(null);
                    }
                    setSelectedFiles(new Set());
                  }}
                  data-testid="button-back-to-repos"
                >
                  <X className="w-4 h-4 mr-1" />
                  Back
                </Button>
                <div className="flex items-center gap-2">
                  <SiGithub className="w-4 h-4" />
                  <span className="font-medium">{activeOwner}/{activeRepoName}</span>
                  <Badge variant="outline">{activeBranch}</Badge>
                </div>
              </div>

              <ScrollArea className="flex-1 max-h-[350px] border rounded-md p-2">
                <RepoFileTree
                  owner={activeOwner!}
                  repo={activeRepoName!}
                  branch={activeBranch}
                  selectedFiles={selectedFiles}
                  onToggleFile={toggleFile}
                />
              </ScrollArea>

              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm text-muted-foreground">
                  {selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''} selected
                </span>
                <Button
                  onClick={handleImport}
                  disabled={selectedFiles.size === 0 || importMutation.isPending}
                  data-testid="button-import-files"
                >
                  {importMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Import {selectedFiles.size} Files
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface FileUploadProps {
  conversationId: number;
  onUploadComplete?: () => void;
}

export function FileUpload({ conversationId, onUploadComplete }: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (files: { path: string; content: string }[]) => {
      return apiRequest("POST", `/api/conversations/${conversationId}/upload-files`, { files });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "files"] });
      onUploadComplete?.();
    }
  });

  const handleFiles = useCallback(async (fileList: FileList) => {
    const files: { path: string; content: string }[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.size > 1024 * 1024) continue;

      try {
        const content = await file.text();
        files.push({
          path: file.webkitRelativePath || file.name,
          content
        });
      } catch (err) {
        console.error(`Failed to read ${file.name}:`, err);
      }
    }

    if (files.length > 0) {
      uploadMutation.mutate(files);
    }
  }, [uploadMutation]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
        dragOver ? 'border-primary bg-primary/5' : 'border-border'
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      data-testid="file-upload-zone"
    >
      <input
        type="file"
        multiple
        onChange={handleFileInput}
        className="absolute inset-0 opacity-0 cursor-pointer"
        data-testid="input-file-upload"
      />

      {uploadMutation.isPending ? (
        <div className="flex flex-col items-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
          <p className="text-sm text-muted-foreground">Uploading files...</p>
        </div>
      ) : uploadMutation.isSuccess ? (
        <div className="flex flex-col items-center">
          <Check className="w-8 h-8 text-green-500 mb-2" />
          <p className="text-sm text-muted-foreground">Files uploaded successfully!</p>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <Upload className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="text-sm font-medium">Drop files here or click to upload</p>
          <p className="text-xs text-muted-foreground mt-1">Max file size: 1MB</p>
        </div>
      )}
    </div>
  );
}