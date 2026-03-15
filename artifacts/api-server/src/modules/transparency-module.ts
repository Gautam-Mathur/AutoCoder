// Transparency Module - Shows what was generated, why, assumptions made, and change logs

interface GenerationLog {
  id: string;
  timestamp: Date;
  action: 'create' | 'update' | 'delete';
  targetFile: string;
  description: string;
  linesChanged: number;
  reasoning: string;
  assumptions: string[];
}

interface ProjectTransparency {
  generationHistory: GenerationLog[];
  currentState: FileState[];
  assumptions: ProjectAssumption[];
  decisions: ArchitecturalDecision[];
  limitations: string[];
}

interface FileState {
  path: string;
  version: number;
  lastModified: Date;
  size: number;
  language: string;
  description: string;
}

interface ProjectAssumption {
  id: string;
  category: 'user' | 'tech' | 'design' | 'data' | 'scope';
  assumption: string;
  reasoning: string;
  impact: string;
  canBeChanged: boolean;
}

interface ArchitecturalDecision {
  id: string;
  title: string;
  decision: string;
  rationale: string;
  alternatives: string[];
  consequences: string[];
  date: Date;
}

// Generate explanation for what was created
export function generateCodeExplanation(
  code: string,
  language: string,
  filename: string
): string {
  const explanation: string[] = [];

  if (language === 'html') {
    explanation.push(`**${filename}** - Main HTML document\n`);

    // Analyze sections
    if (code.includes('<header') || code.includes('<nav')) {
      explanation.push('- **Header/Navigation**: Top section with site branding and navigation links');
    }
    if (code.includes('hero') || code.includes('jumbotron')) {
      explanation.push('- **Hero Section**: Large introductory area with main messaging');
    }
    if (code.includes('<main') || code.includes('content')) {
      explanation.push('- **Main Content**: Primary content area of the page');
    }
    if (code.includes('<footer')) {
      explanation.push('- **Footer**: Bottom section with links, copyright, contact info');
    }
    if (code.includes('<form')) {
      explanation.push('- **Forms**: User input forms for data collection');
    }
    if (code.includes('grid') || code.includes('card')) {
      explanation.push('- **Card Grid**: Structured layout for displaying multiple items');
    }

    // Accessibility features
    if (code.includes('aria-') || code.includes('role=')) {
      explanation.push('\n*Accessibility*: ARIA attributes included for screen reader support');
    }
    if (code.includes('skip-link') || code.includes('Skip to')) {
      explanation.push('*Accessibility*: Skip link for keyboard navigation');
    }
  }

  if (language === 'css') {
    explanation.push(`**${filename}** - Stylesheet\n`);

    if (code.includes(':root') || code.includes('--')) {
      explanation.push('- **CSS Variables**: Custom properties for consistent theming and easy customization');
    }
    if (code.includes('@media')) {
      explanation.push('- **Responsive Design**: Media queries for mobile, tablet, and desktop layouts');
    }
    if (code.includes('flex') || code.includes('grid')) {
      explanation.push('- **Modern Layout**: Flexbox/Grid for flexible, responsive layouts');
    }
    if (code.includes('@keyframes') || code.includes('animation')) {
      explanation.push('- **Animations**: CSS animations for smooth visual feedback');
    }
    if (code.includes('[data-theme')) {
      explanation.push('- **Dark/Light Mode**: Theme support via CSS custom properties');
    }
  }

  if (language === 'javascript' || language === 'typescript') {
    explanation.push(`**${filename}** - JavaScript/TypeScript\n`);

    if (code.includes('addEventListener') || code.includes('onClick')) {
      explanation.push('- **Event Handling**: User interaction handlers for buttons, forms, etc.');
    }
    if (code.includes('fetch') || code.includes('axios')) {
      explanation.push('- **API Integration**: HTTP requests for data fetching');
    }
    if (code.includes('localStorage') || code.includes('sessionStorage')) {
      explanation.push('- **Local Storage**: Client-side data persistence');
    }
    if (code.includes('async') || code.includes('Promise')) {
      explanation.push('- **Async Operations**: Non-blocking code for better performance');
    }
    if (code.includes('validate') || code.includes('check')) {
      explanation.push('- **Validation**: Input validation for data integrity');
    }
    if (code.includes('DOMContentLoaded')) {
      explanation.push('- **DOM Ready**: Initialization after page load');
    }
  }

  return explanation.join('\n');
}

// Track what assumptions were made during generation
export function extractAssumptions(
  userPrompt: string,
  projectType: string,
  generatedCode: { path: string; content: string }[]
): ProjectAssumption[] {
  const assumptions: ProjectAssumption[] = [];

  // Design assumptions
  assumptions.push({
    id: 'assume-responsive',
    category: 'design',
    assumption: 'Mobile-first responsive design',
    reasoning: 'Most users access web apps from mobile devices',
    impact: 'Layout adapts from 320px to 2560px screens',
    canBeChanged: true,
  });

  // Color scheme assumption
  if (!userPrompt.toLowerCase().includes('color') && !userPrompt.toLowerCase().includes('theme')) {
    assumptions.push({
      id: 'assume-colors',
      category: 'design',
      assumption: 'Professional color scheme with good contrast',
      reasoning: 'No specific colors requested, used industry-appropriate defaults',
      impact: 'Colors can be customized via CSS variables',
      canBeChanged: true,
    });
  }

  // Tech assumptions based on project type
  if (projectType === 'landing' || projectType === 'portfolio') {
    assumptions.push({
      id: 'assume-static',
      category: 'tech',
      assumption: 'Static site without backend',
      reasoning: 'Simple pages do not require server-side processing',
      impact: 'Can be hosted on any static host (GitHub Pages, Netlify, etc.)',
      canBeChanged: true,
    });
  }

  // User assumptions
  if (!userPrompt.toLowerCase().includes('auth') && !userPrompt.toLowerCase().includes('login')) {
    assumptions.push({
      id: 'assume-no-auth',
      category: 'user',
      assumption: 'No authentication required initially',
      reasoning: 'Authentication not mentioned in requirements',
      impact: 'All content is publicly accessible',
      canBeChanged: true,
    });
  }

  // Data assumptions
  if (generatedCode.some(f => f.content.includes('data-') || f.content.includes('items'))) {
    assumptions.push({
      id: 'assume-data-structure',
      category: 'data',
      assumption: 'Sample data structure based on typical patterns',
      reasoning: 'No specific data model provided',
      impact: 'Data schema can be modified as needed',
      canBeChanged: true,
    });
  }

  return assumptions;
}

// Generate change log for an update
export function generateChangeLog(
  previousCode: string,
  newCode: string,
  filename: string
): GenerationLog {
  const prevLines = previousCode.split('\n').length;
  const newLines = newCode.split('\n').length;
  const linesChanged = Math.abs(newLines - prevLines);

  // Detect what changed
  const changes: string[] = [];

  if (!previousCode.includes('<nav') && newCode.includes('<nav')) {
    changes.push('Added navigation component');
  }
  if (!previousCode.includes('<form') && newCode.includes('<form')) {
    changes.push('Added form');
  }
  if (!previousCode.includes('@media') && newCode.includes('@media')) {
    changes.push('Added responsive breakpoints');
  }
  if (!previousCode.includes('dark') && newCode.includes('[data-theme="dark"]')) {
    changes.push('Added dark mode support');
  }
  if (!previousCode.includes('animation') && newCode.includes('animation')) {
    changes.push('Added animations');
  }

  return {
    id: `log-${Date.now()}`,
    timestamp: new Date(),
    action: previousCode ? 'update' : 'create',
    targetFile: filename,
    description: changes.length > 0 ? changes.join(', ') : 'Updated content and styling',
    linesChanged,
    reasoning: 'User requested modifications to existing code',
    assumptions: [],
  };
}

// Format transparency report for user
export function formatTransparencyReport(
  files: { path: string; content: string; language: string }[],
  assumptions: ProjectAssumption[],
  isUpdate: boolean
): string {
  let report = `## What I Generated\n\n`;

  // File overview
  report += `### Files Created/Updated\n`;
  for (const file of files) {
    const lines = file.content.split('\n').length;
    report += `- **${file.path}** (${file.language}, ${lines} lines)\n`;
  }
  report += '\n';

  // Detailed explanations
  report += `### Component Breakdown\n`;
  for (const file of files) {
    report += generateCodeExplanation(file.content, file.language, file.path);
    report += '\n\n';
  }

  // Assumptions made
  if (assumptions.length > 0) {
    report += `### Assumptions Made\n`;
    report += `_These are decisions I made based on typical patterns. Let me know if you want changes._\n\n`;
    for (const assumption of assumptions) {
      report += `- **${assumption.assumption}**\n`;
      report += `  _Reason:_ ${assumption.reasoning}\n`;
    }
    report += '\n';
  }

  // Limitations
  report += `### Current Limitations\n`;
  report += `- This is a frontend-only implementation unless backend was requested\n`;
  report += `- Sample/placeholder content may need to be replaced with real data\n`;
  report += `- Third-party integrations require additional setup\n`;

  return report;
}

// Generate summary of changes for existing project
export function summarizeChanges(
  previousFiles: { path: string; content: string }[],
  newFiles: { path: string; content: string }[]
): string {
  const changes: string[] = [];

  // Find new files
  const prevPaths = new Set(previousFiles.map(f => f.path));
  const newPaths = new Set(newFiles.map(f => f.path));

  for (const file of newFiles) {
    if (!prevPaths.has(file.path)) {
      changes.push(`[NEW] ${file.path}`);
    }
  }

  // Find updated files
  for (const newFile of newFiles) {
    const prevFile = previousFiles.find(f => f.path === newFile.path);
    if (prevFile && prevFile.content !== newFile.content) {
      const prevLines = prevFile.content.split('\n').length;
      const newLines = newFile.content.split('\n').length;
      const diff = newLines - prevLines;
      const diffStr = diff > 0 ? `+${diff}` : `${diff}`;
      changes.push(`[UPDATED] ${newFile.path} (${diffStr} lines)`);
    }
  }

  // Find deleted files
  for (const path of prevPaths) {
    if (!newPaths.has(path)) {
      changes.push(`[DELETED] ${path}`);
    }
  }

  if (changes.length === 0) {
    return 'No changes made.';
  }

  return `### Changes Made\n${changes.map(c => `- ${c}`).join('\n')}`;
}

export {
  GenerationLog,
  ProjectTransparency,
  FileState,
  ProjectAssumption,
  ArchitecturalDecision,
};