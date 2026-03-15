// Planning Module - Generates architecture docs, folder structure, and tech stack before coding

interface ProjectPlan {
  projectName: string;
  summary: string;
  techStack: TechStackChoice[];
  architecture: ArchitectureDoc;
  folderStructure: FolderNode[];
  designDecisions: DesignDecision[];
  securityConsiderations: string[];
  scalabilityNotes: string[];
  estimatedComplexity: 'low' | 'medium' | 'high';
}

interface TechStackChoice {
  category: 'frontend' | 'backend' | 'database' | 'styling' | 'build' | 'testing';
  technology: string;
  justification: string;
}

interface ArchitectureDoc {
  overview: string;
  components: ComponentDoc[];
  dataFlow: string;
  apiEndpoints?: ApiEndpoint[];
}

interface ComponentDoc {
  name: string;
  purpose: string;
  responsibilities: string[];
  dependencies: string[];
}

interface FolderNode {
  name: string;
  type: 'folder' | 'file';
  purpose: string;
  children?: FolderNode[];
}

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  requestBody?: string;
  responseType?: string;
}

interface DesignDecision {
  decision: string;
  rationale: string;
  alternatives: string[];
  tradeoffs: string;
}

// Generate a project plan based on requirements
export function generateProjectPlan(
  projectName: string,
  projectType: string,
  requirements: string,
  complexity: 'simple' | 'moderate' | 'complex'
): ProjectPlan {
  const techStack = selectTechStack(projectType, complexity);
  const architecture = generateArchitecture(projectType, requirements);
  const folderStructure = generateFolderStructure(projectType, complexity);
  const designDecisions = generateDesignDecisions(projectType, complexity);
  const securityConsiderations = generateSecurityConsiderations(projectType);
  const scalabilityNotes = generateScalabilityNotes(projectType, complexity);

  return {
    projectName,
    summary: `${projectName} - A ${complexity} ${projectType} application`,
    techStack,
    architecture,
    folderStructure,
    designDecisions,
    securityConsiderations,
    scalabilityNotes,
    estimatedComplexity: complexity === 'simple' ? 'low' : complexity === 'moderate' ? 'medium' : 'high',
  };
}

function selectTechStack(projectType: string, complexity: string): TechStackChoice[] {
  const stack: TechStackChoice[] = [
    {
      category: 'frontend',
      technology: 'HTML5 + CSS3 + JavaScript',
      justification: 'Universal browser support, no build step required for simpler projects',
    },
    {
      category: 'styling',
      technology: 'CSS Custom Properties + Flexbox/Grid',
      justification: 'Modern CSS features for responsive, maintainable styling without framework overhead',
    },
  ];

  if (complexity === 'complex' || projectType === 'dashboard' || projectType === 'webapp') {
    stack[0] = {
      category: 'frontend',
      technology: 'React + TypeScript',
      justification: 'Component-based architecture ideal for complex UIs, TypeScript adds type safety',
    };
    stack.push({
      category: 'build',
      technology: 'Vite',
      justification: 'Fast development server, optimized production builds, excellent TypeScript support',
    });
  }

  if (projectType === 'dashboard' || projectType === 'webapp' || projectType === 'ecommerce') {
    stack.push({
      category: 'backend',
      technology: 'Node.js + Express',
      justification: 'JavaScript/TypeScript throughout the stack, excellent ecosystem, async-first',
    });
    stack.push({
      category: 'database',
      technology: 'PostgreSQL + Drizzle ORM',
      justification: 'Robust relational database with type-safe ORM, great for structured data',
    });
  }

  if (projectType === 'api') {
    stack.push({
      category: 'backend',
      technology: 'Node.js + Express + OpenAPI',
      justification: 'Standard REST API framework with automatic documentation',
    });
  }

  return stack;
}

function generateArchitecture(projectType: string, requirements: string): ArchitectureDoc {
  const components: ComponentDoc[] = [];

  // Base components for all project types
  components.push({
    name: 'UI Layer',
    purpose: 'User interface and presentation',
    responsibilities: ['Render UI components', 'Handle user interactions', 'Manage local state'],
    dependencies: ['API Layer (if backend exists)'],
  });

  if (['dashboard', 'webapp', 'ecommerce', 'saas', 'api'].includes(projectType)) {
    components.push({
      name: 'API Layer',
      purpose: 'Handle HTTP requests and business logic',
      responsibilities: ['Route handling', 'Request validation', 'Business logic execution', 'Response formatting'],
      dependencies: ['Data Layer'],
    });

    components.push({
      name: 'Data Layer',
      purpose: 'Data persistence and retrieval',
      responsibilities: ['Database operations', 'Data modeling', 'Query optimization'],
      dependencies: ['PostgreSQL'],
    });
  }

  return {
    overview: `${projectType.charAt(0).toUpperCase() + projectType.slice(1)} application with ${components.length} main layers`,
    components,
    dataFlow: generateDataFlow(projectType),
    apiEndpoints: projectType !== 'landing' && projectType !== 'portfolio' ? generateApiEndpoints(projectType) : undefined,
  };
}

function generateDataFlow(projectType: string): string {
  if (projectType === 'landing' || projectType === 'portfolio') {
    return 'User → Browser → Static HTML/CSS/JS → User sees content';
  }

  return `
1. User interacts with UI
2. UI dispatches action (click, submit, etc.)
3. API request sent to backend
4. Backend validates request
5. Backend queries/updates database
6. Database returns result
7. Backend formats response
8. UI receives and renders data
9. User sees updated state
  `.trim();
}

function generateApiEndpoints(projectType: string): ApiEndpoint[] {
  const baseEndpoints: ApiEndpoint[] = [
    { method: 'GET', path: '/api/health', description: 'Health check endpoint' },
  ];

  if (projectType === 'dashboard') {
    baseEndpoints.push(
      { method: 'GET', path: '/api/stats', description: 'Get dashboard statistics' },
      { method: 'GET', path: '/api/data', description: 'Get main data listing' },
      { method: 'POST', path: '/api/data', description: 'Create new data entry' },
      { method: 'PUT', path: '/api/data/:id', description: 'Update data entry' },
      { method: 'DELETE', path: '/api/data/:id', description: 'Delete data entry' },
    );
  }

  if (projectType === 'ecommerce') {
    baseEndpoints.push(
      { method: 'GET', path: '/api/products', description: 'List products' },
      { method: 'GET', path: '/api/products/:id', description: 'Get product details' },
      { method: 'POST', path: '/api/cart', description: 'Add item to cart' },
      { method: 'GET', path: '/api/cart', description: 'Get cart contents' },
      { method: 'POST', path: '/api/orders', description: 'Create order' },
    );
  }

  if (projectType === 'webapp' || projectType === 'saas') {
    baseEndpoints.push(
      { method: 'POST', path: '/api/auth/login', description: 'User login' },
      { method: 'POST', path: '/api/auth/register', description: 'User registration' },
      { method: 'GET', path: '/api/user', description: 'Get current user' },
      { method: 'PUT', path: '/api/user', description: 'Update user profile' },
    );
  }

  return baseEndpoints;
}

function generateFolderStructure(projectType: string, complexity: string): FolderNode[] {
  if (complexity === 'simple' || projectType === 'landing' || projectType === 'portfolio') {
    return [
      { name: 'index.html', type: 'file', purpose: 'Main HTML page' },
      { name: 'styles.css', type: 'file', purpose: 'Stylesheet' },
      { name: 'script.js', type: 'file', purpose: 'JavaScript functionality' },
      { name: 'assets/', type: 'folder', purpose: 'Images and media', children: [
        { name: 'images/', type: 'folder', purpose: 'Image files' },
      ]},
    ];
  }

  return [
    { name: 'client/', type: 'folder', purpose: 'Frontend code', children: [
      { name: 'src/', type: 'folder', purpose: 'Source files', children: [
        { name: 'components/', type: 'folder', purpose: 'Reusable UI components' },
        { name: 'pages/', type: 'folder', purpose: 'Page components' },
        { name: 'lib/', type: 'folder', purpose: 'Utility functions' },
        { name: 'hooks/', type: 'folder', purpose: 'Custom React hooks' },
        { name: 'App.tsx', type: 'file', purpose: 'Main application component' },
        { name: 'main.tsx', type: 'file', purpose: 'Application entry point' },
      ]},
      { name: 'index.html', type: 'file', purpose: 'HTML template' },
    ]},
    { name: 'server/', type: 'folder', purpose: 'Backend code', children: [
      { name: 'routes.ts', type: 'file', purpose: 'API route definitions' },
      { name: 'storage.ts', type: 'file', purpose: 'Database operations' },
      { name: 'index.ts', type: 'file', purpose: 'Server entry point' },
    ]},
    { name: 'shared/', type: 'folder', purpose: 'Shared types and schemas', children: [
      { name: 'schema.ts', type: 'file', purpose: 'Database schema and types' },
    ]},
  ];
}

function generateDesignDecisions(projectType: string, complexity: string): DesignDecision[] {
  const decisions: DesignDecision[] = [];

  decisions.push({
    decision: 'Use component-based architecture',
    rationale: 'Promotes reusability, easier testing, and clearer separation of concerns',
    alternatives: ['Monolithic page structure', 'Template-based rendering'],
    tradeoffs: 'Slight learning curve but significant long-term maintainability benefits',
  });

  if (complexity !== 'simple') {
    decisions.push({
      decision: 'Separate frontend and backend concerns',
      rationale: 'Allows independent scaling, different deployment strategies, and clearer boundaries',
      alternatives: ['Server-side rendering only', 'Single monolithic application'],
      tradeoffs: 'More initial setup but better for growing applications',
    });
  }

  decisions.push({
    decision: 'Mobile-first responsive design',
    rationale: 'Most users access via mobile, easier to scale up than scale down',
    alternatives: ['Desktop-first', 'Separate mobile site'],
    tradeoffs: 'Requires thinking about constraints first but results in better mobile experience',
  });

  return decisions;
}

function generateSecurityConsiderations(projectType: string): string[] {
  const considerations: string[] = [
    'Implement Content Security Policy (CSP) headers',
    'Sanitize all user inputs to prevent XSS attacks',
    'Use HTTPS for all communications',
  ];

  if (['dashboard', 'webapp', 'ecommerce', 'saas'].includes(projectType)) {
    considerations.push(
      'Implement proper authentication with secure password hashing',
      'Use JWT tokens with appropriate expiration',
      'Validate and authorize all API requests',
      'Protect against CSRF attacks',
      'Rate limit API endpoints to prevent abuse',
    );
  }

  if (projectType === 'ecommerce') {
    considerations.push(
      'Use a trusted payment processor (Stripe, etc.)',
      'Never store raw credit card data',
      'PCI compliance for payment handling',
    );
  }

  return considerations;
}

function generateScalabilityNotes(projectType: string, complexity: string): string[] {
  if (complexity === 'simple') {
    return ['Static hosting on CDN is sufficient for this scope'];
  }

  const notes: string[] = [
    'Use connection pooling for database connections',
    'Implement caching for frequently accessed data',
    'Consider CDN for static assets',
  ];

  if (complexity === 'complex') {
    notes.push(
      'Plan for horizontal scaling of API servers',
      'Use message queues for async operations',
      'Consider microservices for independent scaling',
    );
  }

  return notes;
}

// Format the plan as markdown for display
export function formatPlanAsMarkdown(plan: ProjectPlan): string {
  let md = `## Project Plan: ${plan.projectName}\n\n`;
  md += `**Summary:** ${plan.summary}\n\n`;
  md += `**Estimated Complexity:** ${plan.estimatedComplexity}\n\n`;

  md += `### Tech Stack\n`;
  for (const tech of plan.techStack) {
    md += `- **${tech.category}**: ${tech.technology}\n  _${tech.justification}_\n`;
  }
  md += '\n';

  md += `### Architecture Overview\n`;
  md += `${plan.architecture.overview}\n\n`;

  md += `**Data Flow:**\n\`\`\`\n${plan.architecture.dataFlow}\n\`\`\`\n\n`;

  if (plan.architecture.apiEndpoints && plan.architecture.apiEndpoints.length > 0) {
    md += `### API Endpoints\n`;
    for (const ep of plan.architecture.apiEndpoints) {
      md += `- \`${ep.method} ${ep.path}\` - ${ep.description}\n`;
    }
    md += '\n';
  }

  md += `### Folder Structure\n\`\`\`\n`;
  md += formatFolderTree(plan.folderStructure, 0);
  md += `\`\`\`\n\n`;

  md += `### Key Design Decisions\n`;
  for (const decision of plan.designDecisions.slice(0, 3)) {
    md += `- **${decision.decision}**: ${decision.rationale}\n`;
  }
  md += '\n';

  md += `### Security Considerations\n`;
  for (const sec of plan.securityConsiderations.slice(0, 4)) {
    md += `- ${sec}\n`;
  }

  return md;
}

function formatFolderTree(nodes: FolderNode[], indent: number): string {
  let result = '';
  const prefix = '  '.repeat(indent);

  for (const node of nodes) {
    result += `${prefix}${node.name}\n`;
    if (node.children) {
      result += formatFolderTree(node.children, indent + 1);
    }
  }

  return result;
}

export { ProjectPlan, TechStackChoice, ArchitectureDoc, DesignDecision };