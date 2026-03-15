import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
  Sliders,
  FileCode2,
  AlertTriangle,
  Save,
  RotateCcw,
  ChevronRight,
  ChevronDown,
  ExternalLink,
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

interface PromptConfig {
  preset: string;
  codeStyle: string;
  namingStyle: string;
  functionSize: string;
  typescriptStrictness: string;
  avoidAny: boolean;
  preferInterfaces: boolean;
  commentDensity: string;
  errorHandling: string;
  alwaysLogErrors: boolean;
  securityFocus: string;
  enforcedAntiPatterns: string[];
  preferZod: boolean;
  preferReactQuery: boolean;
  alwaysPaginate: boolean;
  preferFunctionalComponents: boolean;
  customRules: string;
}

interface PromptConfigResponse {
  success: boolean;
  config: PromptConfig;
  summary: string;
  preview: string;
  presets: Array<{
    id: string;
    name: string;
    description: string;
    emoji: string;
  }>;
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

const ANTI_PATTERN_META: Record<string, { name: string; severity: "critical" | "high" | "medium" | "low" }> = {
  "any-type": { name: "Using `any` type", severity: "high" },
  "empty-catch": { name: "Empty catch blocks", severity: "critical" },
  "array-index-key": { name: "Array index as React key", severity: "high" },
  "missing-loading-state": { name: "Missing loading/error states", severity: "high" },
  "n-plus-one": { name: "N+1 database queries", severity: "critical" },
  "console-log-production": { name: "console.log in production", severity: "medium" },
  "hardcoded-secrets": { name: "Hardcoded credentials", severity: "critical" },
  "prop-drilling": { name: "Excessive prop drilling", severity: "medium" },
  "missing-error-boundary": { name: "No React error boundaries", severity: "high" },
  "massive-useeffect": { name: "Overloaded useEffect", severity: "medium" },
  "select-star": { name: "SELECT * in queries", severity: "medium" },
  "missing-input-validation": { name: "No API input validation", severity: "critical" },
  "no-pagination": { name: "No pagination on list queries", severity: "high" },
  "synchronous-blocking": { name: "Sync blocking in Node.js", severity: "high" },
  "magic-numbers": { name: "Magic numbers/strings", severity: "low" },
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
    case "safe": return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Safe</Badge>;
    case "moderate": return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Moderate</Badge>;
    case "constrained": return <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20">Constrained</Badge>;
    case "careful": return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">Careful</Badge>;
    default: return <Badge variant="outline">Unknown</Badge>;
  }
}

function getSeverityBadge(severity: string) {
  switch (severity) {
    case "critical": return <Badge className="bg-red-500/15 text-red-500 border-red-500/30 text-xs px-1.5 py-0">Critical</Badge>;
    case "high": return <Badge className="bg-orange-500/15 text-orange-500 border-orange-500/30 text-xs px-1.5 py-0">High</Badge>;
    case "medium": return <Badge className="bg-yellow-500/15 text-yellow-600 border-yellow-500/30 text-xs px-1.5 py-0">Medium</Badge>;
    case "low": return <Badge className="bg-blue-500/15 text-blue-500 border-blue-500/30 text-xs px-1.5 py-0">Low</Badge>;
    default: return null;
  }
}

function SegmentedControl({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex bg-muted rounded-lg p-0.5 gap-0.5">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 text-xs font-medium px-2 py-1.5 rounded-md transition-all ${
            value === opt.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function PromptConfigPanel() {
  const { toast } = useToast();
  const [localConfig, setLocalConfig] = useState<PromptConfig | null>(null);
  const [previewText, setPreviewText] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const { data, isLoading } = useQuery<PromptConfigResponse>({
    queryKey: ["/api/ai/prompt-config"],
  });

  useEffect(() => {
    if (data?.config && !localConfig) {
      setLocalConfig(data.config);
      setPreviewText(data.preview || "");
    }
  }, [data, localConfig]);

  const saveMutation = useMutation({
    mutationFn: async (config: PromptConfig) => {
      const res = await apiRequest("POST", "/api/ai/prompt-config", config);
      return res.json() as Promise<PromptConfigResponse>;
    },
    onSuccess: (result) => {
      setPreviewText(result.preview || "");
      queryClient.invalidateQueries({ queryKey: ["/api/ai/prompt-config"] });
      toast({ title: "Configuration Saved", description: result.summary });
    },
    onError: (err: Error) => {
      toast({ title: "Save Failed", description: err.message, variant: "destructive" });
    },
  });

  const presetMutation = useMutation({
    mutationFn: async (preset: string) => {
      const res = await apiRequest("POST", "/api/ai/prompt-config/preset", { preset });
      return res.json() as Promise<PromptConfigResponse>;
    },
    onSuccess: (result) => {
      setLocalConfig(result.config);
      setPreviewText(result.preview || "");
      queryClient.invalidateQueries({ queryKey: ["/api/ai/prompt-config"] });
      toast({ title: "Preset Applied", description: result.summary });
    },
    onError: (err: Error) => {
      toast({ title: "Preset Failed", description: err.message, variant: "destructive" });
    },
  });

  const updateField = useCallback(<K extends keyof PromptConfig>(field: K, value: PromptConfig[K]) => {
    setLocalConfig(prev => prev ? { ...prev, [field]: value, preset: "custom" } : prev);
  }, []);

  const toggleAntiPattern = useCallback((id: string) => {
    setLocalConfig(prev => {
      if (!prev) return prev;
      const current = prev.enforcedAntiPatterns || [];
      const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
      return { ...prev, enforcedAntiPatterns: next, preset: "custom" };
    });
  }, []);

  if (isLoading || !localConfig) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const presets = data?.presets || [];

  return (
    <div className="space-y-6">
      {/* Presets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="w-4 h-4" />
            Quick Presets
          </CardTitle>
          <CardDescription>One-click configurations tuned for common project types</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {presets.map(preset => (
              <button
                key={preset.id}
                onClick={() => presetMutation.mutate(preset.id)}
                disabled={presetMutation.isPending}
                className={`text-left p-3 rounded-lg border transition-all hover:border-primary/50 hover:bg-accent/50 ${
                  localConfig.preset === preset.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border"
                }`}
              >
                <div className="text-xl mb-1">{preset.emoji}</div>
                <div className="font-medium text-sm">{preset.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5 leading-tight">{preset.description}</div>
                {localConfig.preset === preset.id && (
                  <div className="mt-1.5">
                    <Badge className="bg-primary/15 text-primary text-xs px-1.5">Active</Badge>
                  </div>
                )}
              </button>
            ))}
            <button
              onClick={() => updateField("preset", "custom")}
              className={`text-left p-3 rounded-lg border transition-all hover:border-primary/50 hover:bg-accent/50 ${
                localConfig.preset === "custom"
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border border-dashed"
              }`}
            >
              <div className="text-xl mb-1">✏️</div>
              <div className="font-medium text-sm">Custom</div>
              <div className="text-xs text-muted-foreground mt-0.5 leading-tight">Mix & match settings manually</div>
              {localConfig.preset === "custom" && (
                <div className="mt-1.5">
                  <Badge className="bg-primary/15 text-primary text-xs px-1.5">Active</Badge>
                </div>
              )}
            </button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Code Style */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Code2 className="w-4 h-4" />
              Code Style
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SettingRow label="Paradigm" description="Overall programming style preference">
              <SegmentedControl
                value={localConfig.codeStyle}
                onChange={v => updateField("codeStyle", v)}
                options={[
                  { value: "functional", label: "Functional" },
                  { value: "mixed", label: "Mixed" },
                  { value: "oop", label: "OOP" },
                ]}
              />
            </SettingRow>
            <SettingRow label="Naming" description="Identifier naming verbosity">
              <SegmentedControl
                value={localConfig.namingStyle}
                onChange={v => updateField("namingStyle", v)}
                options={[
                  { value: "concise", label: "Concise" },
                  { value: "descriptive", label: "Descriptive" },
                ]}
              />
            </SettingRow>
            <SettingRow label="Function Size" description="Maximum lines before extracting helpers">
              <SegmentedControl
                value={localConfig.functionSize}
                onChange={v => updateField("functionSize", v)}
                options={[
                  { value: "small", label: "< 20 lines" },
                  { value: "medium", label: "< 50 lines" },
                  { value: "any", label: "Any" },
                ]}
              />
            </SettingRow>
          </CardContent>
        </Card>

        {/* TypeScript */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileCode2 className="w-4 h-4" />
              TypeScript
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SettingRow label="Strictness" description="Type checking and inference rules">
              <SegmentedControl
                value={localConfig.typescriptStrictness}
                onChange={v => updateField("typescriptStrictness", v)}
                options={[
                  { value: "relaxed", label: "Relaxed" },
                  { value: "balanced", label: "Balanced" },
                  { value: "strict", label: "Strict" },
                ]}
              />
            </SettingRow>
            <SettingRow label="Ban `any` type" description="Enforce unknown + type guards instead">
              <Switch
                checked={localConfig.avoidAny}
                onCheckedChange={v => updateField("avoidAny", v)}
              />
            </SettingRow>
            <SettingRow label="Prefer `interface`" description="Use interface over type for object shapes">
              <Switch
                checked={localConfig.preferInterfaces}
                onCheckedChange={v => updateField("preferInterfaces", v)}
              />
            </SettingRow>
          </CardContent>
        </Card>

        {/* Documentation */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="w-4 h-4" />
              Documentation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SettingRow label="Comment Density" description="How much inline documentation to generate">
              <SegmentedControl
                value={localConfig.commentDensity}
                onChange={v => updateField("commentDensity", v)}
                options={[
                  { value: "none", label: "None" },
                  { value: "minimal", label: "Minimal" },
                  { value: "jsdoc", label: "JSDoc" },
                  { value: "verbose", label: "Verbose" },
                ]}
              />
            </SettingRow>
          </CardContent>
        </Card>

        {/* Error Handling */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="w-4 h-4" />
              Error Handling
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SettingRow label="Pattern" description="How errors propagate through the app">
              <SegmentedControl
                value={localConfig.errorHandling}
                onChange={v => updateField("errorHandling", v)}
                options={[
                  { value: "try-catch", label: "try/catch" },
                  { value: "result-type", label: "Result<T>" },
                  { value: "both", label: "Both" },
                ]}
              />
            </SettingRow>
            <SettingRow label="Always log errors" description="Require error + context in every catch block">
              <Switch
                checked={localConfig.alwaysLogErrors}
                onCheckedChange={v => updateField("alwaysLogErrors", v)}
              />
            </SettingRow>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="w-4 h-4" />
              Security Level
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SettingRow label="Focus" description="Security requirements inferred and enforced">
              <SegmentedControl
                value={localConfig.securityFocus}
                onChange={v => updateField("securityFocus", v)}
                options={[
                  { value: "standard", label: "Standard" },
                  { value: "heightened", label: "OWASP" },
                  { value: "enterprise", label: "Enterprise" },
                ]}
              />
            </SettingRow>
            <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
              {localConfig.securityFocus === "standard" && "Basic security: Zod validation, bcrypt, env vars for secrets"}
              {localConfig.securityFocus === "heightened" && "OWASP-hardened: rate limiting, HttpOnly cookies, no internal error exposure"}
              {localConfig.securityFocus === "enterprise" && "Enterprise: RBAC, audit log, field-level permissions, CSRF, session management"}
            </div>
          </CardContent>
        </Card>

        {/* Frameworks */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Plug className="w-4 h-4" />
              Tooling Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SettingRow label="Prefer Zod" description="Use Zod for all schema validation">
              <Switch checked={localConfig.preferZod} onCheckedChange={v => updateField("preferZod", v)} />
            </SettingRow>
            <SettingRow label="Prefer React Query" description="Use @tanstack/react-query for server state">
              <Switch checked={localConfig.preferReactQuery} onCheckedChange={v => updateField("preferReactQuery", v)} />
            </SettingRow>
            <SettingRow label="Always paginate lists" description="All list APIs must have limit/pagination">
              <Switch checked={localConfig.alwaysPaginate} onCheckedChange={v => updateField("alwaysPaginate", v)} />
            </SettingRow>
            <SettingRow label="Functional components" description="Never use class components in React">
              <Switch checked={localConfig.preferFunctionalComponents} onCheckedChange={v => updateField("preferFunctionalComponents", v)} />
            </SettingRow>
          </CardContent>
        </Card>
      </div>

      {/* Anti-pattern Enforcement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="w-4 h-4" />
            Anti-Pattern Enforcement
          </CardTitle>
          <CardDescription>
            Selected patterns are explicitly flagged in every LLM prompt — the model is instructed to avoid and fix these in generated code.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {Object.entries(ANTI_PATTERN_META).map(([id, meta]) => {
              const isEnforced = localConfig.enforcedAntiPatterns?.includes(id);
              return (
                <button
                  key={id}
                  onClick={() => toggleAntiPattern(id)}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all ${
                    isEnforced
                      ? "border-primary/50 bg-primary/5"
                      : "border-border hover:border-border/80 hover:bg-accent/30"
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    isEnforced ? "bg-primary border-primary" : "border-muted-foreground/40"
                  }`}>
                    {isEnforced && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium block truncate">{meta.name}</span>
                  </div>
                  {getSeverityBadge(meta.severity)}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 mt-3 pt-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocalConfig(prev => prev ? { ...prev, enforcedAntiPatterns: Object.keys(ANTI_PATTERN_META), preset: "custom" } : prev)}
            >
              Select All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocalConfig(prev => prev ? { ...prev, enforcedAntiPatterns: [], preset: "custom" } : prev)}
            >
              Clear All
            </Button>
            <span className="text-xs text-muted-foreground ml-auto">
              {localConfig.enforcedAntiPatterns?.length || 0} of {Object.keys(ANTI_PATTERN_META).length} enforced
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Custom Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sliders className="w-4 h-4" />
            Custom Rules
          </CardTitle>
          <CardDescription>
            Additional instructions appended to every generation prompt at highest priority. One rule per line.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder={`Examples:\n- All API responses must include a requestId field for tracing\n- Use Tailwind CSS only — no inline styles\n- Every DB query must be wrapped in a try/catch that logs the query name`}
            value={localConfig.customRules}
            onChange={e => updateField("customRules", e.target.value)}
            rows={5}
            className="font-mono text-sm resize-none"
          />
          <p className="text-xs text-muted-foreground mt-2">
            {localConfig.customRules.split('\n').filter(r => r.trim()).length} custom rule(s)
          </p>
        </CardContent>
      </Card>

      {/* Live Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Eye className="w-4 h-4" />
                Live Prompt Preview
              </CardTitle>
              <CardDescription>This exact text will be injected into every generation prompt</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(v => !v)}
            >
              {showPreview ? "Hide" : "Show"}
              <ChevronRight className={`w-4 h-4 ml-1 transition-transform ${showPreview ? "rotate-90" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        {showPreview && (
          <CardContent>
            {previewText ? (
              <pre className="bg-muted/50 rounded-lg p-4 text-xs font-mono overflow-auto max-h-64 whitespace-pre-wrap leading-relaxed border">
                {previewText}
              </pre>
            ) : (
              <p className="text-sm text-muted-foreground">Save your config to see the preview.</p>
            )}
            {previewText && (
              <p className="text-xs text-muted-foreground mt-2">
                {previewText.length.toLocaleString()} characters · {previewText.split('\n').length} lines
              </p>
            )}
          </CardContent>
        )}
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3 pb-2">
        <Button
          onClick={() => localConfig && saveMutation.mutate(localConfig)}
          disabled={saveMutation.isPending}
          className="gap-2"
        >
          {saveMutation.isPending ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Configuration
        </Button>
        <Button
          variant="outline"
          onClick={() => presetMutation.mutate("standard")}
          disabled={presetMutation.isPending}
          className="gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Reset to Defaults
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">
          Preset: <span className="font-medium">{localConfig.preset}</span>
        </span>
      </div>
    </div>
  );
}

export default function SLMSettings() {
  const { toast } = useToast();
  const [endpoint, setEndpoint] = useState("");
  const [activeTab, setActiveTab] = useState<"model" | "prompts">("model");
  const [showGuide, setShowGuide] = useState(false);

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
      const res = await apiRequest("PUT", `/api/slm/stages/${stageId}`, { mode });
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
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
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
            <p className="text-muted-foreground text-sm">Local model management and generation quality configuration</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit mb-8">
          <button
            onClick={() => setActiveTab("model")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "model" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Cpu className="w-4 h-4" />
            Model & Stages
          </button>
          <button
            onClick={() => setActiveTab("prompts")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "prompts" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sliders className="w-4 h-4" />
            Prompt Config
          </button>
        </div>

        {activeTab === "model" && (
          <>
            {/* Stats */}
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

                  <div className="space-y-3">
                    <label className="text-sm font-medium">Model Server Endpoint</label>

                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: "Ollama", url: "http://localhost:11434" },
                        { label: "LM Studio", url: "http://localhost:1234" },
                        { label: "llama.cpp", url: "http://localhost:8080" },
                        { label: "Replit Default", url: "http://localhost:1106/modelfarm/openai" },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          onClick={() => setEndpoint(preset.url)}
                          className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                            endpoint === preset.url
                              ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                              : "border-border hover:border-emerald-500/50 hover:text-emerald-400 text-muted-foreground"
                          }`}
                          data-testid={`preset-${preset.label.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

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
                      Any OpenAI-compatible <code className="text-[10px] bg-muted px-1 rounded">/v1/chat/completions</code> endpoint
                    </p>
                    {status?.modelManager.endpointUrl && (
                      <p className="text-xs text-green-500" data-testid="text-connected-endpoint">
                        Connected to: {status.modelManager.endpointUrl}
                      </p>
                    )}
                  </div>

                  <div className="border-t border-border pt-3">
                    <button
                      onClick={() => setShowGuide(!showGuide)}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
                      data-testid="toggle-provider-guide"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform ${showGuide ? "rotate-180" : ""}`} />
                      Provider Setup Guide
                    </button>

                    {showGuide && (
                      <div className="mt-3 grid gap-3" data-testid="provider-guide">
                        <div className="rounded-lg border border-border p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Ollama
                            </h4>
                            <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-emerald-400 flex items-center gap-1">
                              ollama.com <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p>1. Install Ollama from the link above</p>
                            <p>2. Pull a code model:</p>
                            <code className="block bg-muted px-2 py-1 rounded text-[11px] text-foreground">ollama pull qwen2.5-coder:7b</code>
                            <p>3. Ollama starts automatically on port 11434</p>
                            <p className="pt-1 text-muted-foreground/70">Best models: <span className="text-foreground/80">qwen2.5-coder:7b</span> (8GB RAM), <span className="text-foreground/80">deepseek-coder-v2:16b</span> (16GB+), <span className="text-foreground/80">codellama:13b</span></p>
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <code className="text-[10px] bg-muted px-2 py-0.5 rounded text-emerald-400">http://localhost:11434</code>
                            <span className="text-[10px] text-muted-foreground">No API key needed</span>
                          </div>
                        </div>

                        <div className="rounded-lg border border-border p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-blue-500" /> LM Studio
                            </h4>
                            <a href="https://lmstudio.ai" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-blue-400 flex items-center gap-1">
                              lmstudio.ai <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p>1. Download and install LM Studio</p>
                            <p>2. Browse and download any GGUF model from the model hub</p>
                            <p>3. Go to the <strong className="text-foreground/80">Local Server</strong> tab and click <strong className="text-foreground/80">Start Server</strong></p>
                            <p>4. It uses whichever model is currently loaded</p>
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <code className="text-[10px] bg-muted px-2 py-0.5 rounded text-blue-400">http://localhost:1234</code>
                            <span className="text-[10px] text-muted-foreground">No API key needed</span>
                          </div>
                        </div>

                        <div className="rounded-lg border border-border p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-orange-500" /> llama.cpp server
                            </h4>
                            <a href="https://github.com/ggerganov/llama.cpp" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-orange-400 flex items-center gap-1">
                              GitHub <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p>1. Build llama.cpp from source</p>
                            <p>2. Run the server with your model:</p>
                            <code className="block bg-muted px-2 py-1 rounded text-[11px] text-foreground">./llama-server -m your-model.gguf --port 8080</code>
                            <p>3. Lightweight, no extra dependencies</p>
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <code className="text-[10px] bg-muted px-2 py-0.5 rounded text-orange-400">http://localhost:8080</code>
                            <span className="text-[10px] text-muted-foreground">No API key needed</span>
                          </div>
                        </div>

                        <div className="rounded-lg border border-border p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-violet-500" /> Replit Default
                            </h4>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p>Replit's built-in model proxy. Works out of the box with no setup needed. Already available in any Replit workspace.</p>
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <code className="text-[10px] bg-muted px-2 py-0.5 rounded text-violet-400">http://localhost:1106/modelfarm/openai</code>
                            <span className="text-[10px] text-muted-foreground">Pre-configured</span>
                          </div>
                        </div>

                        <p className="text-[10px] text-muted-foreground/60 text-center pt-1">
                          All providers use the OpenAI-compatible /v1/chat/completions protocol. No API keys required for local servers.
                        </p>
                      </div>
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
          </>
        )}

        {activeTab === "prompts" && <PromptConfigPanel />}
      </div>
    </div>
  );
}
