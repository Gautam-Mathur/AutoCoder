import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CodePreview, CombinedAppPreview, MultiFilePreview, parseMultiFileHtml, parseProjectFiles, ProjectFilesPreview } from "./code-preview";

interface CodeBlockProps {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language = "text" }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3">
      <div className="relative group rounded-lg overflow-hidden border border-border bg-muted/50">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-wide">
            {language}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={copyToClipboard}
            data-testid="button-copy-code"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
        <pre className="p-4 overflow-x-auto max-h-[500px]">
          <code className="text-sm font-mono leading-relaxed">{code}</code>
        </pre>
      </div>

      <CodePreview code={code} language={language} />
    </div>
  );
}

interface ParsedCodeBlock {
  language: string;
  code: string;
  index: number;
}

export function parseCodeBlocks(content: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  const codeBlocks: ParsedCodeBlock[] = [];

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`} className="whitespace-pre-wrap">
          {content.slice(lastIndex, match.index)}
        </span>
      );
    }

    const language = (match[1] || "text").toLowerCase();
    const code = match[2].trim();

    codeBlocks.push({ language, code, index: match.index });
    parts.push(<CodeBlock key={`code-${match.index}`} code={code} language={language} />);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push(
      <span key={`text-${lastIndex}`} className="whitespace-pre-wrap">
        {content.slice(lastIndex)}
      </span>
    );
  }

  const hasHtml = codeBlocks.some(b => b.language === 'html' || b.language === 'htm');
  const hasCss = codeBlocks.some(b => b.language === 'css');
  const hasJs = codeBlocks.some(b => b.language === 'javascript' || b.language === 'js');

  // Check for multi-file project (--- FILE: path --- format)
  const allCode = codeBlocks.map(b => b.code).join('\n');
  const projectFiles = parseProjectFiles(allCode);

  if (projectFiles && projectFiles.length >= 2) {
    // Multi-file project detected - show project files preview
    parts.push(
      <ProjectFilesPreview
        key="project-files-preview"
        files={projectFiles}
      />
    );
  } else {
    // Check for multi-file HTML (multiple pages in one code block)
    const htmlBlocks = codeBlocks.filter(b => b.language === 'html' || b.language === 'htm');
    const combinedHtmlForParsing = htmlBlocks.map(b => b.code).join('\n');
    const multiFiles = parseMultiFileHtml(combinedHtmlForParsing);

    if (multiFiles && multiFiles.length >= 2) {
      // Multi-page website detected - show multi-file preview
      parts.push(
        <MultiFilePreview
          key="multi-file-preview"
          files={multiFiles}
        />
      );
    } else {
      // Check for combined HTML + CSS + JS
      const hasMultipleWebLanguages = hasHtml && (hasCss || hasJs);

      if (hasMultipleWebLanguages) {
        const cssBlocks = codeBlocks.filter(b => b.language === 'css');
        const jsBlocks = codeBlocks.filter(b => b.language === 'javascript' || b.language === 'js');

        const combinedHtml = htmlBlocks.map(b => b.code).join('\n');
        const combinedCss = cssBlocks.map(b => b.code).join('\n');
        const combinedJs = jsBlocks.map(b => b.code).join('\n');

        if (combinedHtml || combinedCss || combinedJs) {
          parts.push(
            <CombinedAppPreview
              key="combined-preview"
              html={combinedHtml}
              css={combinedCss}
              javascript={combinedJs}
            />
          );
        }
      }
    }
  }

  return parts.length > 0 ? parts : [<span key="content" className="whitespace-pre-wrap">{content}</span>];
}
