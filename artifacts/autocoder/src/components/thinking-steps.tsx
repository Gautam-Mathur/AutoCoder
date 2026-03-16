import { useState } from "react";
import { ChevronDown, ChevronRight, Brain, Search, Layers, Code, ShieldCheck, Sparkles, Users, ClipboardList, GraduationCap, GitBranch, Building2, Palette, Zap, Database, Globe, LayoutGrid, Wrench, Eye, TestTube, PackageCheck, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ThinkingStep {
  phase: string;
  label: string;
  detail?: string;
  timestamp?: number;
}

function parseFriendlyLabel(label: string): { friendly: string; technical: string | null } {
  const sep = label.indexOf('|||');
  if (sep === -1) return { friendly: label, technical: null };
  return {
    friendly: label.substring(0, sep).trim(),
    technical: label.substring(sep + 3).trim() || null,
  };
}

const phaseConfig: Record<string, { icon: typeof Brain; color: string; label: string }> = {
  understanding: { icon: Brain, color: 'text-blue-400', label: 'Understanding' },
  analyzing: { icon: Search, color: 'text-cyan-400', label: 'Analyzing' },
  planning: { icon: Layers, color: 'text-teal-400', label: 'Planning' },
  generating: { icon: Code, color: 'text-emerald-400', label: 'Generating' },
  validating: { icon: ShieldCheck, color: 'text-green-400', label: 'Validating' },
  orchestrator: { icon: Users, color: 'text-violet-400', label: 'Orchestrator' },
  understand: { icon: ClipboardList, color: 'text-blue-400', label: 'Product Manager' },
  plan: { icon: Layers, color: 'text-indigo-400', label: 'Project Manager' },
  learn: { icon: GraduationCap, color: 'text-amber-400', label: 'Senior Advisor' },
  reason: { icon: GitBranch, color: 'text-cyan-400', label: 'Technical Analyst' },
  architect: { icon: Building2, color: 'text-purple-400', label: 'System Architect' },
  design: { icon: Palette, color: 'text-pink-400', label: 'UI/UX Designer' },
  specify: { icon: Zap, color: 'text-orange-400', label: 'Feature Analyst' },
  schema: { icon: Database, color: 'text-sky-400', label: 'Database Engineer' },
  api: { icon: Globe, color: 'text-teal-400', label: 'API Architect' },
  compose: { icon: LayoutGrid, color: 'text-lime-400', label: 'UI Engineer' },
  generate: { icon: Code, color: 'text-emerald-400', label: 'Full-Stack Dev' },
  resolve: { icon: Wrench, color: 'text-slate-400', label: 'DevOps Engineer' },
  quality: { icon: Eye, color: 'text-yellow-400', label: 'Code Reviewer' },
  test: { icon: TestTube, color: 'text-rose-400', label: 'QA Engineer' },
  validate: { icon: PackageCheck, color: 'text-green-400', label: 'Release Engineer' },
  record: { icon: BookOpen, color: 'text-fuchsia-400', label: 'Knowledge Manager' },
  recovery: { icon: ShieldCheck, color: 'text-red-400', label: 'Recovery' },
};

interface ThinkingStepsProps {
  steps: ThinkingStep[];
  isActive?: boolean;
}

export function ThinkingSteps({ steps, isActive }: ThinkingStepsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  if (steps.length === 0 && !isActive) return null;

  const currentPhase = steps.length > 0
    ? phaseConfig[steps[steps.length - 1].phase] || phaseConfig.understanding
    : phaseConfig.understanding;

  const activeStages = new Set(steps.map(s => s.phase));
  const stageCount = activeStages.size;

  const toggleStep = (index: number) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const latestFriendly = steps.length > 0
    ? parseFriendlyLabel(steps[steps.length - 1].label).friendly
    : 'Thinking...';

  return (
    <div className="mb-2" data-testid="thinking-steps">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors hover-elevate",
          isActive
            ? "bg-primary/5 border border-primary/15"
            : "bg-muted/30 border border-border/30"
        )}
        data-testid="button-toggle-thinking"
      >
        <Sparkles className={cn(
          "h-3 w-3 flex-shrink-0",
          isActive ? "text-primary animate-pulse" : "text-muted-foreground"
        )} />
        <span className={cn(
          "font-medium flex-1",
          isActive ? "text-primary" : "text-muted-foreground"
        )}>
          {isActive
            ? latestFriendly
            : `Building your app (${steps.length} steps)`
          }
        </span>
        <ChevronDown className={cn(
          "h-3 w-3 text-muted-foreground transition-transform",
          isExpanded && "rotate-180"
        )} />
      </button>

      {isExpanded && steps.length > 0 && (
        <div className="mt-1.5 ml-1 border-l border-border/40 pl-3 space-y-0.5" data-testid="thinking-steps-list">
          {steps.map((step, i) => {
            const config = phaseConfig[step.phase] || phaseConfig.understanding;
            const Icon = config.icon;
            const isLast = i === steps.length - 1;
            const { friendly, technical } = parseFriendlyLabel(step.label);
            const hasExpandableContent = !!(technical || step.detail);
            const isStepExpanded = expandedSteps.has(i);

            return (
              <div
                key={i}
                className={cn(
                  "py-1 text-xs transition-opacity",
                  isLast && isActive ? "opacity-100" : "opacity-70",
                )}
                data-testid={`thinking-step-${i}`}
              >
                <div
                  className={cn(
                    "flex items-start gap-2",
                    hasExpandableContent && "cursor-pointer"
                  )}
                  onClick={() => hasExpandableContent && toggleStep(i)}
                >
                  <Icon className={cn(
                    "h-3 w-3 mt-0.5 flex-shrink-0",
                    config.color,
                    isLast && isActive && "animate-pulse"
                  )} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("font-medium", config.color)}>
                        {friendly}
                      </span>
                      {hasExpandableContent && (
                        <ChevronRight className={cn(
                          "h-2.5 w-2.5 text-muted-foreground/50 transition-transform flex-shrink-0",
                          isStepExpanded && "rotate-90"
                        )} />
                      )}
                    </div>
                  </div>
                </div>

                {isStepExpanded && hasExpandableContent && (
                  <div className="ml-5 mt-1 pl-2 border-l border-dashed border-muted-foreground/20 space-y-0.5">
                    {technical && (
                      <p className="text-[10px] text-muted-foreground/60 font-mono leading-snug">
                        {technical}
                      </p>
                    )}
                    {step.detail && (
                      <p className="text-[10px] text-muted-foreground/50 leading-snug">
                        {step.detail}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {isActive && (
            <div className="flex items-center gap-2 py-1 text-xs">
              <div className="flex gap-0.5">
                <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
