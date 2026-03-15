import { Terminal } from "lucide-react";
import { parseCodeBlocks } from "@/components/code-block";
import { ProjectSummary, parseProjectSummary, ProjectFileWithContent } from "@/components/project-summary";
import { ThinkingSteps, type ThinkingStep } from "@/components/thinking-steps";
import { Button } from "@/components/ui/button";
import { Check, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  generatedFiles?: ProjectFileWithContent[];
  thinkingSteps?: ThinkingStep[];
  showApproval?: boolean;
  onSendMessage?: (message: string) => void;
}

export function ChatMessage({ role, content, isStreaming, generatedFiles, thinkingSteps, showApproval, onSendMessage }: ChatMessageProps) {
  const isUser = role === "user";
  const showApprovalButtons = !!showApproval && !isStreaming;

  const renderAssistantContent = () => {
    const { hasProject, projectInfo, remainingContent } = parseProjectSummary(content);

    if (hasProject && projectInfo && !isStreaming) {
      const filesToUse = generatedFiles && generatedFiles.length > 0
        ? generatedFiles
        : createDemoFiles();

      return (
        <div className="space-y-3">
          <ProjectSummary
            projectName={projectInfo.name}
            blueprintType={projectInfo.type}
            totalFiles={projectInfo.totalFiles}
            files={filesToUse}
          />
          {remainingContent && parseCodeBlocks(remainingContent)}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {parseCodeBlocks(content)}
        {isStreaming && (
          <span className="inline-block w-1.5 h-4 bg-primary animate-pulse rounded-sm" data-testid="streaming-indicator" />
        )}
        {showApprovalButtons && onSendMessage && (
          <div className="flex items-center gap-2 pt-4 border-t border-border/40 mt-4">
            <Button
              onClick={() => onSendMessage("approve")}
              className="gap-2"
              data-testid="button-approve-plan"
            >
              <Check className="h-4 w-4" />
              Approve & Generate
            </Button>
            <Button
              variant="outline"
              onClick={() => onSendMessage("I'd like to make some changes to the plan")}
              className="gap-2"
              data-testid="button-modify-plan"
            >
              <RefreshCw className="h-4 w-4" />
              Request Changes
            </Button>
          </div>
        )}
      </div>
    );
  };

  function createDemoFiles(): ProjectFileWithContent[] {
    return [
      {
        path: '/App.tsx',
        content: `import { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl text-white text-center">
        <h1 className="text-4xl font-bold mb-4">Your App is Running!</h1>
        <p className="text-lg mb-6 opacity-80">This is a live preview of your generated project.</p>
        <div className="space-y-4">
          <div className="text-6xl font-bold">{count}</div>
          <button
            onClick={() => setCount(c => c + 1)}
            className="px-6 py-3 bg-white text-purple-600 font-semibold rounded-xl hover:bg-opacity-90 transition-all transform hover:scale-105"
          >
            Click to increment
          </button>
        </div>
      </div>
    </div>
  );
}`
      }
    ];
  }

  return (
    <div
      className={cn(
        "flex gap-3 py-2",
        isUser ? "justify-end" : "justify-start"
      )}
      data-testid={`message-${role}`}
    >
      {!isUser && (
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mt-0.5"
          data-testid="avatar-assistant"
        >
          <Terminal className="h-4 w-4 text-primary" />
        </div>
      )}

      <div className={cn(
        "min-w-0",
        isUser ? "max-w-[85%]" : "max-w-[95%] flex-1"
      )}>
        <div className={cn(
          "text-sm leading-relaxed",
          isUser && "flex justify-end"
        )}>
          {isUser ? (
            <div className="inline-block bg-primary text-primary-foreground px-4 py-2.5 rounded-2xl rounded-br-md shadow-sm">
              {content}
            </div>
          ) : (
            <div>
              {thinkingSteps && thinkingSteps.length > 0 && (
                <ThinkingSteps
                  steps={thinkingSteps}
                  isActive={isStreaming && !content}
                />
              )}
              <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:leading-[1.7] [&>p]:mb-3 [&>ul]:mb-3 [&>ol]:mb-3">
                {renderAssistantContent()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}