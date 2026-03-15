import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Rocket,
  Copy,
  Check,
  ExternalLink,
  FileCode,
  Terminal,
  ChevronRight,
  Database,
  Shield,
  Package,
  Download,
  Loader2
} from "lucide-react";
import { SiGithub } from "react-icons/si";
import {
  DeploymentGuide,
  ProjectAnalysis,
  analyzeProject,
  generateDeploymentGuides
} from "@/lib/code-runner/deployment-guide";
import { downloadProjectAsZip } from "@/lib/code-runner/zip-export";
import { apiRequest } from "@/lib/queryClient";

interface DeploymentPanelProps {
  files: { path: string; content: string }[];
  conversationId?: number;
}

export function DeploymentPanel({ files, conversationId }: DeploymentPanelProps) {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("Vercel");
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPushingGithub, setIsPushingGithub] = useState(false);
  const [githubResult, setGithubResult] = useState<{ success: boolean; url?: string; error?: string } | null>(null);

  const analysis = analyzeProject(files);
  const guides = generateDeploymentGuides(analysis);

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const getTypeLabel = (type: ProjectAnalysis["type"]) => {
    switch (type) {
      case "static": return "Static Site";
      case "node": return "Node.js";
      case "react": return "React App";
      case "nextjs": return "Next.js";
      case "express": return "Express API";
      case "fullstack": return "Full Stack";
      default: return type;
    }
  };

  const selectedGuide = guides.find(g => g.platform === selectedPlatform) || guides[0];

  const handleDownloadZip = async () => {
    setIsDownloading(true);
    try {
      const projectName = analysis.framework || analysis.type || "project";
      await downloadProjectAsZip(
        files.map(f => ({ path: f.path, content: f.content })),
        projectName
      );
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePushToGithub = async () => {
    if (!conversationId) return;
    setIsPushingGithub(true);
    setGithubResult(null);
    try {
      const res = await apiRequest("POST", `/api/conversations/${conversationId}/github-push`);
      const data = await res.json();
      setGithubResult({ success: true, url: data.url });
    } catch (error: any) {
      setGithubResult({ success: false, error: error.message || "Failed to push to GitHub" });
    } finally {
      setIsPushingGithub(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Publish & Deploy</h2>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="gap-1">
            <Package className="h-3 w-3" />
            {getTypeLabel(analysis.type)}
          </Badge>
          {analysis.framework && (
            <Badge variant="outline">{analysis.framework}</Badge>
          )}
          {analysis.hasDatabase && (
            <Badge variant="outline" className="gap-1">
              <Database className="h-3 w-3" />
              Database
            </Badge>
          )}
          {analysis.hasAuth && (
            <Badge variant="outline" className="gap-1">
              <Shield className="h-3 w-3" />
              Auth
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="default"
            className="gap-2"
            onClick={handleDownloadZip}
            disabled={isDownloading || files.length === 0}
            data-testid="button-download-zip"
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Download ZIP
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={handlePushToGithub}
            disabled={isPushingGithub || !conversationId || files.length === 0}
            data-testid="button-push-github"
          >
            {isPushingGithub ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SiGithub className="h-4 w-4" />
            )}
            Push to GitHub
          </Button>
        </div>

        {githubResult && (
          <div className={`text-xs p-2 rounded ${githubResult.success ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
            {githubResult.success ? (
              <a href={githubResult.url} target="_blank" rel="noopener noreferrer" className="underline" data-testid="link-github-repo">
                Pushed successfully! View on GitHub
              </a>
            ) : (
              <span>{githubResult.error}</span>
            )}
          </div>
        )}
      </div>

      <div className="flex border-b gap-1 p-1">
        {guides.map((guide) => (
          <Button
            key={guide.platform}
            variant={selectedPlatform === guide.platform ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setSelectedPlatform(guide.platform)}
            className="flex-1"
            data-testid={`button-platform-${guide.platform.toLowerCase()}`}
          >
            <span className="mr-1">{guide.icon}</span>
            {guide.platform}
          </Button>
        ))}
      </div>

      <ScrollArea className="flex-1 p-4">
        {selectedGuide && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <ChevronRight className="h-4 w-4" />
                Deployment Steps
              </h3>
              <ol className="space-y-2 ml-6">
                {selectedGuide.steps.map((step, i) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground mr-2">{i + 1}.</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            {selectedGuide.commands.length > 0 && (
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Terminal className="h-4 w-4" />
                    CLI Commands
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2 px-4">
                  <div className="space-y-2">
                    {selectedGuide.commands.map((cmd, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-muted rounded-md px-3 py-2"
                      >
                        <code className="text-sm font-mono">{cmd}</code>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(cmd, cmd)}
                          data-testid={`button-copy-cmd-${i}`}
                        >
                          {copiedText === cmd ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedGuide.configFiles.length > 0 && (
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileCode className="h-4 w-4" />
                    Configuration Files
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Add these files to your project root
                  </CardDescription>
                </CardHeader>
                <CardContent className="py-2 px-4 space-y-3">
                  {selectedGuide.configFiles.map((file, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{file.name}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(file.content, file.name)}
                          className="h-7 gap-1"
                          data-testid={`button-copy-file-${i}`}
                        >
                          {copiedText === file.name ? (
                            <>
                              <Check className="h-3 w-3" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                      <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
                        {file.content}
                      </pre>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {analysis.envVars.length > 0 && (
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm">Environment Variables</CardTitle>
                  <CardDescription className="text-xs">
                    Add these to your deployment platform
                  </CardDescription>
                </CardHeader>
                <CardContent className="py-2 px-4">
                  <div className="space-y-1">
                    {analysis.envVars.map((envVar, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <code className="text-sm bg-muted px-2 py-0.5 rounded">{envVar}</code>
                        <span className="text-xs text-muted-foreground">= your_value</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">Platform Features</CardTitle>
              </CardHeader>
              <CardContent className="py-2 px-4">
                <div className="flex flex-wrap gap-2">
                  {selectedGuide.features.map((feature, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Button
              className="w-full gap-2"
              onClick={() => window.open(selectedGuide.url, "_blank")}
              data-testid="button-open-platform"
            >
              <ExternalLink className="h-4 w-4" />
              Open {selectedGuide.platform}
            </Button>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}