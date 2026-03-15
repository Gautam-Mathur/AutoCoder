// Export System - Download generated projects as zip with all files, configs, and docs

import { analyzeDependencies, generateEnvExample } from './dependency-intelligence';

interface ExportedProject {
  name: string;
  files: ExportFile[];
  readme: string;
  packageJson?: string;
  envExample?: string;
}

interface ExportFile {
  path: string;
  content: string;
  type: 'source' | 'config' | 'doc' | 'asset';
}

// Generate a complete project export
export function generateProjectExport(
  projectName: string,
  projectType: string,
  files: { path: string; content: string; language: string }[]
): ExportedProject {
  const exportFiles: ExportFile[] = [];

  // Add source files
  for (const file of files) {
    exportFiles.push({
      path: file.path,
      content: file.content,
      type: 'source',
    });
  }

  // Analyze dependencies
  const depAnalysis = analyzeDependencies(files);

  // Generate .env.example if needed
  if (depAnalysis.envVariables.length > 0) {
    const envContent = generateEnvExample(depAnalysis.envVariables);
    exportFiles.push({
      path: '.env.example',
      content: envContent,
      type: 'config',
    });
  }

  // Generate .gitignore
  const gitignore = generateGitignore(projectType);
  exportFiles.push({
    path: '.gitignore',
    content: gitignore,
    type: 'config',
  });

  // Generate README
  const readme = generateReadme(projectName, projectType, files, depAnalysis);
  exportFiles.push({
    path: 'README.md',
    content: readme,
    type: 'doc',
  });

  // Generate package.json for Node.js projects
  let packageJson: string | undefined;
  if (projectType === 'webapp' || projectType === 'dashboard' || projectType === 'api') {
    packageJson = generatePackageJson(projectName, depAnalysis);
    exportFiles.push({
      path: 'package.json',
      content: packageJson,
      type: 'config',
    });
  }

  return {
    name: projectName,
    files: exportFiles,
    readme,
    packageJson,
    envExample: depAnalysis.envVariables.length > 0 ? generateEnvExample(depAnalysis.envVariables) : undefined,
  };
}

function generateGitignore(projectType: string): string {
  const base = `# Dependencies
node_modules/
.pnp
.pnp.js

# Environment
.env
.env.local
.env.*.local

# Build outputs
dist/
build/
.next/
out/

# Logs
logs/
*.log
npm-debug.log*

# Editor
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Cache
.cache/
.parcel-cache/
.eslintcache

# Test
coverage/
.nyc_output/
`;

  if (projectType === 'webapp' || projectType === 'dashboard') {
    return base + `
# TypeScript
*.tsbuildinfo

# Vite
*.local
`;
  }

  return base;
}

function generateReadme(
  projectName: string,
  projectType: string,
  files: { path: string; content: string; language: string }[],
  depAnalysis: { dependencies: any[]; envVariables: any[] }
): string {
  let readme = `# ${projectName}\n\n`;

  // Description based on project type
  const descriptions: Record<string, string> = {
    landing: 'A modern, responsive landing page',
    dashboard: 'An interactive dashboard application',
    webapp: 'A full-stack web application',
    ecommerce: 'An e-commerce platform',
    portfolio: 'A personal portfolio website',
    blog: 'A blog platform',
    api: 'A RESTful API backend',
    saas: 'A SaaS application',
  };

  readme += `${descriptions[projectType] || 'A web application'} generated with AutoCoder AI.\n\n`;

  // Project structure
  readme += `## Project Structure\n\n\`\`\`\n`;
  const paths = files.map(f => f.path).sort();
  for (const path of paths) {
    readme += `${path}\n`;
  }
  readme += `\`\`\`\n\n`;

  // Getting Started
  readme += `## Getting Started\n\n`;

  if (projectType === 'landing' || projectType === 'portfolio') {
    readme += `### Option 1: Open directly\nOpen \`index.html\` in your browser.\n\n`;
    readme += `### Option 2: Use a local server\n\`\`\`bash\nnpx serve .\n\`\`\`\n\n`;
  } else {
    readme += `### Prerequisites\n- Node.js 18 or higher\n- npm or pnpm\n\n`;
    readme += `### Installation\n\`\`\`bash\n# Install dependencies\nnpm install\n\n# Set up environment variables\ncp .env.example .env\n# Edit .env with your values\n\n# Start development server\nnpm run dev\n\`\`\`\n\n`;
  }

  // Environment Variables
  if (depAnalysis.envVariables.length > 0) {
    readme += `## Environment Variables\n\n`;
    readme += `Copy \`.env.example\` to \`.env\` and fill in the values:\n\n`;
    readme += `| Variable | Description | Required |\n`;
    readme += `|----------|-------------|----------|\n`;
    for (const env of depAnalysis.envVariables) {
      readme += `| \`${env.key}\` | ${env.description} | ${env.required ? 'Yes' : 'No'} |\n`;
    }
    readme += `\n`;
  }

  // Dependencies
  if (depAnalysis.dependencies.length > 0) {
    readme += `## Dependencies\n\n`;
    for (const dep of depAnalysis.dependencies.filter(d => d.type === 'npm' && !d.isDevDependency)) {
      readme += `- **${dep.name}**: ${dep.purpose}\n`;
    }
    readme += `\n`;
  }

  // Features based on code analysis
  readme += `## Features\n\n`;
  const features = detectFeatures(files);
  for (const feature of features) {
    readme += `- ${feature}\n`;
  }
  readme += `\n`;

  // License
  readme += `## License\n\nMIT\n`;

  return readme;
}

function detectFeatures(files: { path: string; content: string }[]): string[] {
  const features: string[] = [];
  const allCode = files.map(f => f.content).join('\n');

  if (allCode.includes('@media') || allCode.includes('responsive')) {
    features.push('Responsive design for all screen sizes');
  }
  if (allCode.includes('[data-theme="dark"]') || allCode.includes('dark:')) {
    features.push('Dark/Light mode support');
  }
  if (allCode.includes('<nav') || allCode.includes('navigation')) {
    features.push('Navigation menu');
  }
  if (allCode.includes('<form')) {
    features.push('Interactive forms');
  }
  if (allCode.includes('animation') || allCode.includes('@keyframes')) {
    features.push('Smooth animations');
  }
  if (allCode.includes('aria-') || allCode.includes('role=')) {
    features.push('Accessibility support (ARIA)');
  }
  if (allCode.includes('fetch') || allCode.includes('axios')) {
    features.push('API integration');
  }
  if (allCode.includes('localStorage') || allCode.includes('sessionStorage')) {
    features.push('Local data persistence');
  }

  if (features.length === 0) {
    features.push('Modern web design');
    features.push('Clean, maintainable code');
  }

  return features;
}

function generatePackageJson(projectName: string, depAnalysis: { dependencies: any[] }): string {
  const npmDeps = depAnalysis.dependencies.filter(d => d.type === 'npm');

  const pkg: any = {
    name: projectName.toLowerCase().replace(/\s+/g, '-'),
    version: '1.0.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview',
    },
    dependencies: {} as Record<string, string>,
    devDependencies: {} as Record<string, string>,
  };

  for (const dep of npmDeps) {
    const version = '^latest';
    if (dep.isDevDependency) {
      pkg.devDependencies[dep.name] = version;
    } else {
      pkg.dependencies[dep.name] = version;
    }
  }

  // Ensure core deps are present
  if (!pkg.devDependencies.vite) {
    pkg.devDependencies.vite = '^5.0.0';
  }

  return JSON.stringify(pkg, null, 2);
}

// Generate a base64 zip file (for browser download)
// Note: In a real implementation, you'd use a library like JSZip
export function generateZipContent(project: ExportedProject): string {
  // This is a simplified representation
  // In production, use archiver or JSZip to create actual zip
  const fileList = project.files.map(f => `${f.path}: ${f.content.length} bytes`);

  return `ZIP MANIFEST for ${project.name}:\n\n${fileList.join('\n')}`;
}

// Generate download URL for project
export function generateDownloadData(project: ExportedProject): {
  filename: string;
  mimeType: string;
  content: string;
} {
  // For simplicity, return as tar-like text format
  // In production, generate actual zip
  let content = '';

  for (const file of project.files) {
    content += `=== FILE: ${file.path} ===\n`;
    content += file.content;
    content += '\n=== END FILE ===\n\n';
  }

  return {
    filename: `${project.name.toLowerCase().replace(/\s+/g, '-')}.txt`,
    mimeType: 'text/plain',
    content,
  };
}

export {
  ExportedProject,
  ExportFile,
};