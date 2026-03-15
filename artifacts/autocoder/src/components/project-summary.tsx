import { useState } from "react";
import { File, Folder, Download, Sparkles, Play, Code, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { SiReact, SiTypescript, SiTailwindcss, SiExpress, SiPostgresql } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LiveCodeRunner } from "@/components/live-code-runner";

export interface ProjectFileWithContent {
  path: string;
  content: string;
  language?: string;
}

interface ProjectSummaryProps {
  projectName: string;
  blueprintType: string;
  totalFiles: number;
  files: ProjectFileWithContent[];
  onDownload?: () => void;
}

export function ProjectSummary({
  projectName,
  blueprintType,
  totalFiles,
  files,
  onDownload
}: ProjectSummaryProps) {
  const [showFiles, setShowFiles] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');

  const componentFiles = files.filter(f =>
    f.path.includes('/components/') ||
    f.path.includes('/pages/') ||
    f.path.includes('/layout/') ||
    f.path.endsWith('.tsx') ||
    f.path.endsWith('.jsx')
  );

  const displayFiles = componentFiles.slice(0, 6);
  const remainingCount = componentFiles.length - displayFiles.length;

  const getTechIcon = () => {
    if (blueprintType.toLowerCase().includes('react')) {
      return <SiReact className="w-10 h-10 text-cyan-400" />;
    }
    return <Sparkles className="w-10 h-10 text-primary" />;
  };

  const getTechLabel = () => {
    if (blueprintType.toLowerCase().includes('react')) {
      return 'React + TypeScript';
    }
    if (blueprintType.toLowerCase().includes('express')) {
      return 'Full-Stack';
    }
    return blueprintType;
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-border bg-gradient-to-b from-slate-900 to-slate-950 text-white my-4" data-testid="project-summary">
      <div className="p-6 text-center space-y-3 border-b border-slate-800">
        <div className="flex items-center justify-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-slate-800 flex items-center justify-center shadow-lg">
            {getTechIcon()}
          </div>
          <div className="text-left">
            <h2 className="text-xl font-bold text-white">
              {getTechLabel()} Project Ready!
            </h2>
            <p className="text-slate-400 text-sm">
              <span className="text-emerald-400 font-bold">{totalFiles} files</span> generated
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-1">
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-1.5" />
            Running Live
          </Badge>
        </div>
      </div>

      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
            activeTab === 'preview'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
          data-testid="tab-preview"
        >
          <Eye className="w-4 h-4" />
          Live Preview
        </button>
        <button
          onClick={() => setActiveTab('code')}
          className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
            activeTab === 'code'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
          data-testid="tab-code"
        >
          <Code className="w-4 h-4" />
          View Code
        </button>
      </div>

      <div className="min-h-[400px]">
        {files.length > 0 ? (
          <LiveCodeRunner
            files={files}
            projectName={projectName}
            showEditor={activeTab === 'code'}
            height="450px"
          />
        ) : (
          <div className="flex items-center justify-center h-[400px] text-slate-400">
            <div className="text-center">
              <Play className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No runnable files found</p>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-slate-800">
        <button
          onClick={() => setShowFiles(!showFiles)}
          className="w-full py-3 px-4 flex items-center justify-between text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
          data-testid="toggle-files"
        >
          <span className="flex items-center gap-2">
            <Folder className="w-4 h-4" />
            View all {totalFiles} generated files
          </span>
          {showFiles ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showFiles && (
          <div className="px-4 pb-4 max-h-[200px] overflow-y-auto">
            <div className="space-y-1">
              {displayFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 text-xs text-slate-300 py-1"
                  data-testid={`file-item-${idx}`}
                >
                  <File className="w-3 h-3 text-slate-500 flex-shrink-0" />
                  <span className="font-mono truncate">{file.path}</span>
                </div>
              ))}
              {remainingCount > 0 && (
                <div className="text-slate-500 text-xs py-1">
                  ...and {remainingCount} more files
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="px-4 pb-4 flex flex-wrap gap-2">
        <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
          <SiReact className="w-3 h-3 mr-1" /> React
        </Badge>
        <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
          <SiTypescript className="w-3 h-3 mr-1" /> TypeScript
        </Badge>
        <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/30">
          <SiTailwindcss className="w-3 h-3 mr-1" /> Tailwind
        </Badge>
      </div>

      {onDownload && (
        <div className="p-4 border-t border-slate-700 bg-slate-900/50">
          <Button
            onClick={onDownload}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
            data-testid="button-download-project"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Project
          </Button>
        </div>
      )}
    </div>
  );
}

export function parseProjectSummary(content: string): {
  hasProject: boolean;
  projectInfo?: {
    name: string;
    type: string;
    totalFiles: number;
    files: ProjectFileWithContent[];
  };
  remainingContent: string;
} {
  const projectMatch = content.match(/🎉.*?I've built your ([\w\s]+) app!/);
  const filesMatch = content.match(/Your Project Files \((\d+) files\)/);
  const blueprintMatch = content.match(/\*\*([\w\s\+\-]+)\*\*,? so I/i);

  if (projectMatch && filesMatch) {
    return {
      hasProject: true,
      projectInfo: {
        name: projectMatch[1].trim(),
        type: blueprintMatch ? blueprintMatch[1].trim() : 'Full-Stack React + Express',
        totalFiles: parseInt(filesMatch[1], 10),
        files: []
      },
      remainingContent: content.replace(/🎉[\s\S]*?I'm here to help!/, '').trim()
    };
  }

  return { hasProject: false, remainingContent: content };
}