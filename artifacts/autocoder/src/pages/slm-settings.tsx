import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  ArrowLeft,
  Cpu,
  Activity,
  Zap,
  Database,
  BarChart3,
  Settings,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Brain,
  Eye,
  Palette,
  Search,
  ShieldCheck,
  Server,
  Plug,
  Component,
  Code2,
} from "lucide-react";

interface SLMStatus {
  initialized: boolean;
  available: boolean;
  registeredStages: string[];
  stageModes: Record<string, string>;
  health: {
    loaded: boolean;
    modelPath: string | null;
    contextSize: number;
    lastInferenceMs: number | null;
    totalInferences: number;
    totalErrors: number;
    uptime: number;
  };
  modelManager: {
    initialized: boolean;
    registeredModels: number;
    loadedModels: number;
    assignedStages: number;
    totalMemoryUsedMB: number;
    maxMemoryMB: number;
    defaultModel: string | null;
    endpointConfigured: boolean;
    endpointUrl: string | null;
  };
  trainingData: {
    stages: string[];
    totalRecords: number;
    stageBreakdown: Array<{ stage: string; records: number; slmWinRate: number }>;
  };
  feedback: {
    stages: Array<{
      stage: string;
      totalRuns: number;
      slmWinRate: number;
      avgImprovement: number;
      avgLatencyMs: number;
      recommendation: string;
      reason: string;
    }>;
    totalGenerations: number;
    overallSlmWinRate: number;
    averageImprovement: number;
    topPerformingStage: string | null;
    worstPerformingStage: string | null;
    promotedPatternsCount: number;
  };
}

const STAGE_LABELS: Record<string, { label: string; risk: string; Icon: typeof Brain }> = {
  understand: { label: "Understanding", risk: "safe", Icon: Brain },
  design: { label: "Design System", risk: "safe", Icon: Palette },
  reason: { label: "Semantic Analysis", risk: "moderate", Icon: Search },
  "deep-quality": { label: "Deep Quality", risk: "moderate", Icon: ShieldCheck },
  schema: { label: "Schema Design", risk: "constrained", Icon: Database },
  api: { label: "API Design", risk: "constrained", Icon: Plug },
  compose: { label: "Components", risk: "constrained", Icon: Component },
  generate: { label: "Code Gen", risk: "careful", Icon: Code2 },
};

function getRiskColor(risk: string): string {
  switch (risk) {
    case "safe": return "text-green-500";
    case "moderate": return "text-yellow-500";
    case "constrained": return "text-orange-500";
    case "careful": return "text-red-500";
    default: return "text-gray-500";
  }
}

function getRiskBadge(risk: string) {
  switch (risk) {
    case "safe": return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20" data-testid="badge-safe">Safe</Badge>;
    case "moderate": return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20" data-testid="badge-moderate">Moderate</Badge>;
    case "constrained": return <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20" data-testid="badge-constrained">Constrained</Badge>;
    case "careful": return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20" data-testid="badge-careful">Careful</Badge>;
    default: return <Badge variant="outline" data-testid="badge-unknown">Unknown</Badge>;
  }
}

export default function SLMSettings() {
  const { toast } = useToast();
  const [endpoint, setEndpoint] = useState("");

  const { data: status, isLoading } = useQuery<SLMStatus>({
    queryKey: ["/api/slm/status"],
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (status?.modelManager.endpointUrl && !endpoint) {
      setEndpoint(status.modelManager.endpointUrl);
    }
  }, [status?.modelManager.endpointUrl]);

  const initMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/slm/initialize", {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/slm/status"] });
      toast({ title: "SLM System Initialized", description: "All stage templates registered" });
    },
    onError: (err: Error) => {
      toast({ title: "Initialization Failed", description: err.message, variant: "destructive" });
    },
  });

  const connectMutation = useMutation({
    mutationFn: async (endpointUrl: string) => {
      const res = await apiRequest("POST", "/api/slm/connect", { endpoint: endpointUrl });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/slm/status"] });
      toast({ title: "Endpoint Connected", description: `Connected to ${endpoint}` });
    },
    onError: (err: Error) => {
      toast({ title: "Connection Failed", description: err.message, variant: "destructive" });
    },
  });

  const stageModeMutation = useMutation({
    mutationFn: async ({ stageId, mode }: { stageId: string; mode: string }) => {
      const res = await apiRequest("POST", "/api/slm/stage-mode", { stageId, mode });
      return res.json();
    },
    onSuccess: (_, { stageId, mode }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/slm/status"] });
      const label = STAGE_LABELS[stageId]?.label || stageId;
      toast({ title: `${label} Mode Updated`, description: `Set to ${mode}` });
    },
    onError: (err: Error) => {
      toast({ title: "Mode Update Failed", description: err.message, variant: "destructive" });
    },
  });

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/chat">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
              <Brain className="w-6 h-6" />
              SLM Neural Coprocessor
            </h1>
            <p className="text-muted-foreground text-sm">Local small language model management and performance tracking</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                {status?.initialized ? (
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-500" />
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-semibold" data-testid="text-status">
                    {status?.initialized ? "Initialized" : "Not Initialized"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Cpu className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Model</p>
                  <p className="font-semibold" data-testid="text-model-status">
                    {status?.available ? "Connected" : "No Model"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Activity className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Inferences</p>
                  <p className="font-semibold" data-testid="text-inferences">
                    {status?.health.totalInferences || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-orange-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Uptime</p>
                  <p className="font-semibold" data-testid="text-uptime">
                    {formatUptime(status?.health.uptime || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Setup
              </CardTitle>
              <CardDescription>Initialize the SLM system and connect to a local model server</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  onClick={() => initMutation.mutate()}
                  disabled={initMutation.isPending || status?.initialized}
                  data-testid="button-initialize"
                >
                  {initMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Zap className="w-4 h-4 mr-2" />
                  )}
                  {status?.initialized ? "Already Initialized" : "Initialize SLM System"}
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Model Server Endpoint</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="http://localhost:8080"
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    data-testid="input-endpoint"
                  />
                  <Button
                    onClick={() => connectMutation.mutate(endpoint)}
                    disabled={!endpoint || connectMutation.isPending}
                    data-testid="button-connect"
                  >
                    Connect
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Point to a local llama.cpp server, Ollama, or any OpenAI-compatible endpoint
                </p>
                {status?.modelManager.endpointUrl && (
                  <p className="text-xs text-green-500" data-testid="text-connected-endpoint">
                    Connected to: {status.modelManager.endpointUrl}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5" />
                System Health
              </CardTitle>
              <CardDescription>Model and inference engine metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Context Size</span>
                  <span data-testid="text-context-size">{status?.health.contextSize || 0} tokens</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last Inference</span>
                  <span data-testid="text-last-inference">
                    {status?.health.lastInferenceMs ? `${status.health.lastInferenceMs}ms` : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Errors</span>
                  <span data-testid="text-total-errors">{status?.health.totalErrors || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Registered Models</span>
                  <span data-testid="text-registered-models">{status?.modelManager.registeredModels || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Memory Used</span>
                  <span data-testid="text-memory">{status?.modelManager.totalMemoryUsedMB || 0}MB / {status?.modelManager.maxMemoryMB || 0}MB</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Registered Stages</span>
                  <span data-testid="text-stage-count">{status?.registeredStages.length || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="w-5 h-5" />
              Stage Configuration
            </CardTitle>
            <CardDescription>
              Each pipeline stage can run in rules-only or hybrid (rules + SLM) mode.
              Safe stages get full SLM output. Constrained stages use patch-based enhancement only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(STAGE_LABELS).map(([stageId, meta]) => {
                const isRegistered = status?.registeredStages.includes(stageId);
                const feedbackData = status?.feedback.stages.find(s => s.stage === stageId);
                const currentMode = status?.stageModes?.[stageId] || 'rules-only';
                const isSlmEnabled = currentMode === 'slm-enhanced';
                const StageIcon = meta.Icon;

                return (
                  <div
                    key={stageId}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    data-testid={`stage-row-${stageId}`}
                  >
                    <div className="flex items-center gap-3">
                      <StageIcon className={`w-5 h-5 ${getRiskColor(meta.risk)}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{meta.label}</span>
                          {getRiskBadge(meta.risk)}
                          {isRegistered && (
                            <Badge variant="secondary" className="text-xs" data-testid={`badge-registered-${stageId}`}>
                              Template Ready
                            </Badge>
                          )}
                        </div>
                        {feedbackData && feedbackData.totalRuns > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {feedbackData.totalRuns} runs | Win rate: {(feedbackData.slmWinRate * 100).toFixed(0)}% |
                            Avg: +{(feedbackData.avgImprovement * 100).toFixed(1)}%
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs ${getRiskColor(meta.risk)}`}>
                        {meta.risk === "safe" ? "Full SLM" :
                         meta.risk === "moderate" ? "Validated" :
                         meta.risk === "constrained" ? "Patch-only" :
                         "Micro-writer"}
                      </span>
                      <Switch
                        checked={isSlmEnabled}
                        disabled={!status?.initialized}
                        onCheckedChange={(checked) => {
                          stageModeMutation.mutate({
                            stageId,
                            mode: checked ? 'slm-enhanced' : 'rules-only',
                          });
                        }}
                        data-testid={`switch-stage-${stageId}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Feedback Loop
              </CardTitle>
              <CardDescription>SLM vs Rules performance tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Generations</span>
                  <span data-testid="text-total-generations">{status?.feedback.totalGenerations || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Overall SLM Win Rate</span>
                  <span data-testid="text-win-rate">
                    {status?.feedback.totalGenerations
                      ? `${(status.feedback.overallSlmWinRate * 100).toFixed(1)}%`
                      : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Avg Improvement</span>
                  <span data-testid="text-avg-improvement">
                    {status?.feedback.totalGenerations
                      ? `+${(status.feedback.averageImprovement * 100).toFixed(1)}%`
                      : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Top Stage</span>
                  <span data-testid="text-top-stage">
                    {status?.feedback.topPerformingStage
                      ? STAGE_LABELS[status.feedback.topPerformingStage]?.label || status.feedback.topPerformingStage
                      : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Promoted Patterns</span>
                  <span data-testid="text-promoted-patterns">{status?.feedback.promotedPatternsCount || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Training Data
              </CardTitle>
              <CardDescription>Collected data for future fine-tuning</CardDescription>
            </CardHeader>
            <CardContent>
              {status?.trainingData.totalRecords === 0 ? (
                <p className="text-sm text-muted-foreground" data-testid="text-no-training-data">
                  No training data collected yet. Run generations in SLM-enhanced mode to start collecting.
                </p>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm mb-3">
                    <span className="text-muted-foreground">Total Records</span>
                    <span data-testid="text-total-records">{status?.trainingData.totalRecords}</span>
                  </div>
                  {status?.trainingData.stageBreakdown.map(s => (
                    <div key={s.stage} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {STAGE_LABELS[s.stage]?.label || s.stage}
                      </span>
                      <span>
                        {s.records} records (win: {(s.slmWinRate * 100).toFixed(0)}%)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}