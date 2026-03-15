import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  AlertCircle,
  Wrench,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Zap,
  FileWarning,
  Lightbulb,
  RefreshCw,
  RotateCcw,
  History,
  X,
} from "lucide-react";
import {
  analyzeError,
  categorizeError,
  extractLineFromError,
  type FixSuggestion,
  type CodeError,
} from "@/lib/code-runner/error-fixer";

interface FixHistoryEntry {
  attempt: number;
  timestamp: number;
  fixes: { filePath: string; description: string; type: string }[];
  unfixable: { type: string; message: string }[];
  totalErrors: number;
  totalFixed: number;
  summary: string;
}

interface ErrorFixerPanelProps {
  errors: string[];
  code: string;
  conversationId?: number | null;
  onApplyFix?: (fixedCode: string) => void;
  onAutoFixComplete?: () => void;
}

const MAX_RETRY_ATTEMPTS = 3;

export function ErrorFixerPanel({
  errors,
  code,
  conversationId,
  onApplyFix,
  onAutoFixComplete,
}: ErrorFixerPanelProps) {
  const [expandedError, setExpandedError] = useState<number | null>(0);
  const [appliedFixes, setAppliedFixes] = useState<Set<number>>(new Set());
  const [isAutoFixing, setIsAutoFixing] = useState(false);
  const [currentAttempt, setCurrentAttempt] = useState(0);
  const [fixHistory, setFixHistory] = useState<FixHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [autoFixResult, setAutoFixResult] = useState<{
    totalFixed: number;
    totalErrors: number;
    unfixable: { type: string; message: string }[];
  } | null>(null);
  const { toast } = useToast();

  const runSingleAttempt = useCallback(
    async (errorMessages: string[], attempt: number) => {
      if (!conversationId) return null;

      const response = await apiRequest(
        "POST",
        `/api/conversations/${conversationId}/auto-fix`,
        { errors: errorMessages, attempt }
      );

      const result = await response.json();

      const historyEntry: FixHistoryEntry = {
        attempt,
        timestamp: Date.now(),
        fixes: result.fixes || [],
        unfixable: result.unfixable || [],
        totalErrors: result.totalErrors || 0,
        totalFixed: result.totalFixed || 0,
        summary: result.summary || "",
      };
      setFixHistory((prev) => [...prev, historyEntry]);

      return result;
    },
    [conversationId]
  );

  const handleFixAll = useCallback(async () => {
    if (!conversationId || errors.length === 0) return;

    setIsAutoFixing(true);
    setFixHistory([]);
    setAutoFixResult(null);
    let currentErrors = [...errors];

    try {
      for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
        if (currentErrors.length === 0) break;

        setCurrentAttempt(attempt);

        const result = await runSingleAttempt(currentErrors, attempt);
        if (!result) break;

        if (result.totalFixed > 0) {
          queryClient.invalidateQueries({
            queryKey: ["/api/conversations", conversationId, "files"],
          });

          toast({
            title: `Auto-Fix: Attempt ${attempt}`,
            description: `Fixed ${result.totalFixed} of ${result.totalErrors} errors`,
          });

          onAutoFixComplete?.();

          await new Promise((r) => setTimeout(r, 2000));
        }

        setAutoFixResult({
          totalFixed: result.totalFixed,
          totalErrors: result.totalErrors,
          unfixable: result.unfixable || [],
        });

        if (!result.unfixable || result.unfixable.length === 0) {
          toast({
            title: "All Errors Fixed",
            description: `Successfully resolved all errors in ${attempt} attempt${attempt > 1 ? "s" : ""}.`,
          });
          break;
        }

        if (result.totalFixed === 0) {
          toast({
            title: `Auto-Fix: Attempt ${attempt}`,
            description: `Could not automatically fix ${result.totalErrors} errors. Manual review needed.`,
            variant: "destructive",
          });
          break;
        }

        currentErrors = result.unfixable.map(
          (e: { message: string }) => e.message
        );
      }
    } catch (err) {
      toast({
        title: "Auto-Fix Failed",
        description: "An error occurred while trying to fix issues.",
        variant: "destructive",
      });
    } finally {
      setIsAutoFixing(false);
      setCurrentAttempt(0);
    }
  }, [conversationId, errors, runSingleAttempt, onAutoFixComplete, toast]);

  if (errors.length === 0 && !autoFixResult) {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="flex items-center gap-3 py-4">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <div>
            <p className="font-medium text-green-600 dark:text-green-400">
              No Errors Detected
            </p>
            <p className="text-sm text-muted-foreground">
              Your code is running smoothly
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const parsedErrors: (CodeError & { suggestions: FixSuggestion[] })[] =
    errors.map((err) => ({
      type: categorizeError(err),
      message: err,
      line: extractLineFromError(err),
      suggestions: analyzeError(err, code),
    }));

  const handleApplyFix = (errorIndex: number, suggestion: FixSuggestion) => {
    onApplyFix?.(suggestion.code);
    setAppliedFixes((prev) => new Set([...Array.from(prev), errorIndex]));
  };

  const getErrorIcon = (type: CodeError["type"]) => {
    switch (type) {
      case "syntax":
        return <FileWarning className="h-4 w-4" />;
      case "reference":
        return <AlertCircle className="h-4 w-4" />;
      case "type":
        return <Zap className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getConfidenceBadge = (confidence: FixSuggestion["confidence"]) => {
    switch (confidence) {
      case "high":
        return <Badge className="bg-green-600 text-xs">High Confidence</Badge>;
      case "medium":
        return <Badge className="bg-yellow-600 text-xs">Medium</Badge>;
      case "low":
        return <Badge variant="secondary" className="text-xs">Low</Badge>;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">
            {errors.length} Error{errors.length > 1 ? "s" : ""} Detected
          </span>
        </div>

        <div className="flex items-center gap-2">
          {fixHistory.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="gap-1"
              onClick={() => setShowHistory(!showHistory)}
              data-testid="button-toggle-fix-history"
            >
              <History className="h-3.5 w-3.5" />
              History ({fixHistory.length})
            </Button>
          )}

          {conversationId && (
            <Button
              size="sm"
              variant="default"
              className="gap-1"
              onClick={handleFixAll}
              disabled={isAutoFixing || errors.length === 0}
              data-testid="button-fix-all-errors"
            >
              {isAutoFixing ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Fixing... ({currentAttempt}/{MAX_RETRY_ATTEMPTS})
                </>
              ) : (
                <>
                  <Zap className="h-3.5 w-3.5" />
                  Fix All Errors
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {autoFixResult && (
        <Card className={autoFixResult.totalFixed > 0 ? "border-green-500/30 bg-green-500/5" : "border-yellow-500/30 bg-yellow-500/5"}>
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {autoFixResult.totalFixed > 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                )}
                <span className="text-sm font-medium">
                  {autoFixResult.totalFixed > 0
                    ? `Fixed ${autoFixResult.totalFixed} of ${autoFixResult.totalErrors} errors`
                    : "No automatic fixes available"}
                </span>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setAutoFixResult(null)}
                data-testid="button-dismiss-fix-result"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            {autoFixResult.unfixable.length > 0 && (
              <div className="mt-2 text-xs text-muted-foreground">
                {autoFixResult.unfixable.length} error
                {autoFixResult.unfixable.length > 1 ? "s" : ""} require manual
                review
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showHistory && fixHistory.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Fix History</span>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowHistory(false)}
                data-testid="button-close-fix-history"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-3">
            <div className="space-y-2">
              {fixHistory.map((entry, i) => (
                <div
                  key={i}
                  className="text-xs border rounded-md p-2"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      Attempt {entry.attempt}
                    </Badge>
                    <span className="text-muted-foreground">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    {entry.totalFixed > 0 ? (
                      <span className="text-green-600 dark:text-green-400">
                        Fixed {entry.totalFixed} error
                        {entry.totalFixed > 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span>No fixes applied</span>
                    )}
                  </div>
                  {entry.fixes.length > 0 && (
                    <ul className="list-disc list-inside mt-1 text-green-600 dark:text-green-400">
                      {entry.fixes.slice(0, 4).map((fix, j) => (
                        <li key={j} className="truncate">
                          {fix.filePath}: {fix.description}
                        </li>
                      ))}
                      {entry.fixes.length > 4 && (
                        <li className="text-muted-foreground">
                          +{entry.fixes.length - 4} more
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <ScrollArea className="max-h-[400px]">
        <div className="space-y-2">
          {parsedErrors.map((error, index) => (
            <Card
              key={index}
              className={
                appliedFixes.has(index)
                  ? "bg-green-500/5 border-green-500/30"
                  : "border-destructive/30"
              }
            >
              <CardHeader
                className="py-3 px-4 cursor-pointer"
                onClick={() =>
                  setExpandedError(expandedError === index ? null : index)
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div
                      className={
                        appliedFixes.has(index)
                          ? "text-green-500"
                          : "text-destructive"
                      }
                    >
                      {appliedFixes.has(index) ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        getErrorIcon(error.type)
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {error.type}
                    </Badge>
                    {error.line && (
                      <span className="text-xs text-muted-foreground">
                        Line {error.line}
                      </span>
                    )}
                  </div>
                  {expandedError === index ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <CardDescription className="text-sm mt-1 text-left line-clamp-2">
                  {error.message}
                </CardDescription>
              </CardHeader>

              {expandedError === index && (
                <CardContent className="pt-0 px-4 pb-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    Suggested Fixes
                  </div>

                  {error.suggestions.map((suggestion, sugIndex) => (
                    <Card key={sugIndex} className="bg-muted/50">
                      <CardContent className="py-3 px-4">
                        <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {suggestion.description}
                            </span>
                          </div>
                          {getConfidenceBadge(suggestion.confidence)}
                        </div>

                        <p className="text-xs text-muted-foreground mb-3">
                          {suggestion.explanation}
                        </p>

                        {suggestion.code !== code && (
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              size="sm"
                              variant="default"
                              className="gap-1"
                              onClick={() => handleApplyFix(index, suggestion)}
                              disabled={appliedFixes.has(index)}
                              data-testid={`button-apply-fix-${index}-${sugIndex}`}
                            >
                              {appliedFixes.has(index) ? (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Applied
                                </>
                              ) : (
                                <>
                                  <Zap className="h-3.5 w-3.5" />
                                  Apply Fix
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}