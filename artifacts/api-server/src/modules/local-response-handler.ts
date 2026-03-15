import { searchConcepts, formatConceptAsMarkdown, getBestPractices, formatBestPracticeAsMarkdown, getLearningPath, type Concept } from './knowledge-base.js';
import { explainCode, formatExplanationAsMarkdown } from './code-explanation-engine.js';
import type { ThinkingStep, ConversationState } from './conversation-phase-handler.js';

export interface LocalResponseResult {
  responseContent: string;
  thinkingSteps: ThinkingStep[];
}

type MessageCategory =
  | 'greeting'
  | 'question-about-project'
  | 'help-request'
  | 'acknowledgment'
  | 'error-debug'
  | 'general-code-question'
  | 'unknown';

export function classifyMessage(message: string): MessageCategory {
  const lower = message.toLowerCase().trim();

  if (/^(hi|hello|hey|howdy|yo|sup|good\s*(morning|afternoon|evening|day)|greetings|what'?s?\s*up)\b/.test(lower)) {
    return 'greeting';
  }

  if (/\b(thanks?|thank\s*you|thx|ty|ok(ay)?|cool|great|got\s*it|nice|awesome|perfect|sounds?\s*good|understood|noted)\b/.test(lower) &&
      lower.length < 80) {
    return 'acknowledgment';
  }

  if (/\b(fix\s*(this|the|my)|error|bug|crash|broken|not\s*working|exception|stacktrace|stack\s*trace|traceback|failed|failing)\b/.test(lower)) {
    return 'error-debug';
  }

  if (/\b(what\s*(does|is|are)|explain|how\s*does|tell\s*me\s*about|describe)\b.*\b(file|component|page|schema|model|route|endpoint|function|module|code|this)\b/.test(lower)) {
    return 'question-about-project';
  }

  if (/\b(how\s*(do|can|to|should)|what\s*can\s*you|help|deploy|guide|tutorial|capabilities|features|what\s*do\s*you\s*do|show\s*me)\b/.test(lower)) {
    return 'help-request';
  }

  if (/\b(what\s*is|what\s*are|explain|how\s*does|difference\s*between|when\s*to\s*use|why\s*use|define)\b/.test(lower)) {
    return 'general-code-question';
  }

  if (/\b(react|javascript|typescript|python|css|html|node|express|sql|api|rest|graphql|docker|git|webpack|vite|tailwind|redux|vue|angular|svelte|next|nuxt|django|flask|spring|rust|go|golang|java|csharp|c\+\+|php|ruby|swift|kotlin)\b/.test(lower)) {
    return 'general-code-question';
  }

  return 'unknown';
}

export function handleLocalResponse(
  message: string,
  state: ConversationState,
  category?: MessageCategory
): LocalResponseResult {
  const resolvedCategory = category || classifyMessage(message);
  const thinkingSteps: ThinkingStep[] = [];

  const emitStep = (phase: string, label: string, detail?: string) => {
    thinkingSteps.push({ phase, label, detail, timestamp: Date.now() });
  };

  switch (resolvedCategory) {
    case 'greeting':
      return handleGreeting(message, state, thinkingSteps, emitStep);
    case 'question-about-project':
      return handleProjectQuestion(message, state, thinkingSteps, emitStep);
    case 'help-request':
      return handleHelpRequest(message, state, thinkingSteps, emitStep);
    case 'acknowledgment':
      return handleAcknowledgment(message, state, thinkingSteps, emitStep);
    case 'error-debug':
      return handleErrorDebug(message, state, thinkingSteps, emitStep);
    case 'general-code-question':
      return handleCodeQuestion(message, state, thinkingSteps, emitStep);
    default:
      return handleUnknown(message, state, thinkingSteps, emitStep);
  }
}

function handleGreeting(
  _message: string,
  state: ConversationState,
  thinkingSteps: ThinkingStep[],
  emitStep: (phase: string, label: string, detail?: string) => void
): LocalResponseResult {
  emitStep('response', 'Processing greeting', 'Preparing welcome message with project suggestions');

  const hasProject = state.phase === 'complete' || state.phase === 'editing';

  let responseContent: string;
  if (hasProject && state.existingFiles && state.existingFiles.length > 0) {
    responseContent = `Hey there! Welcome back to your project. You currently have **${state.existingFiles.length} files** in your project.

Here's what I can help you with:
- **Edit your project** - Tell me what changes you'd like to make (e.g., "add a settings page", "change the color scheme")
- **Explain your code** - Ask me about any file or component
- **Build something new** - Describe a completely new project to build

What would you like to do?`;
  } else {
    responseContent = `Hello! I'm AutoCoder, your local code generation assistant. I can help you build full-stack web applications from scratch.

Here are some things you can ask me to build:
- **"Build a task management app"** - A Kanban board with drag-and-drop
- **"Create an e-commerce dashboard"** - Product catalog, orders, analytics
- **"Make a blog platform"** - Posts, comments, categories, rich text editor
- **"Build a project tracker"** - Teams, milestones, time tracking
- **"Create a recipe sharing app"** - Recipes, ratings, collections

Or ask me any programming question - I know about React, TypeScript, Node.js, databases, design patterns, and more!

What would you like to build?`;
  }

  return { responseContent, thinkingSteps };
}

function handleProjectQuestion(
  message: string,
  state: ConversationState,
  thinkingSteps: ThinkingStep[],
  emitStep: (phase: string, label: string, detail?: string) => void
): LocalResponseResult {
  emitStep('response', 'Analyzing project question', 'Looking at existing project files to answer your question');

  if (!state.existingFiles || state.existingFiles.length === 0) {
    return {
      responseContent: `I don't have any project files to analyze yet. You can:
- **Describe a project** you'd like me to build, and I'll generate the code
- **Ask a general programming question** and I'll explain the concept

What would you like to do?`,
      thinkingSteps,
    };
  }

  const lower = message.toLowerCase();
  const files = state.existingFiles;

  const mentionedFile = files.find(f => {
    const fileName = f.path.split('/').pop()?.toLowerCase() || '';
    const baseName = fileName.replace(/\.\w+$/, '');
    return lower.includes(fileName) || lower.includes(baseName);
  });

  if (mentionedFile) {
    emitStep('response', 'Explaining file', `Analyzing ${mentionedFile.path}`);
    const explanation = explainCode(mentionedFile.content, mentionedFile.language);
    const markdown = formatExplanationAsMarkdown(explanation);

    return {
      responseContent: `### File: \`${mentionedFile.path}\`\n\n${markdown}\n\nWould you like me to modify this file or explain another part of the project?`,
      thinkingSteps,
    };
  }

  const filesByType: Record<string, string[]> = {};
  for (const f of files) {
    const ext = f.path.split('.').pop() || 'other';
    if (!filesByType[ext]) filesByType[ext] = [];
    filesByType[ext].push(f.path);
  }

  const projectOverview = Object.entries(filesByType)
    .map(([ext, paths]) => `- **${ext}** files (${paths.length}): ${paths.slice(0, 4).map(p => `\`${p}\``).join(', ')}${paths.length > 4 ? ` + ${paths.length - 4} more` : ''}`)
    .join('\n');

  const schemaFile = files.find(f => f.path.includes('schema') || f.path.includes('model'));
  let schemaInfo = '';
  if (schemaFile) {
    const tableMatches = schemaFile.content.match(/(?:table|model|class|interface)\s+(\w+)/g);
    if (tableMatches && tableMatches.length > 0) {
      schemaInfo = `\n\n**Data Model**: ${tableMatches.slice(0, 8).join(', ')}`;
    }
  }

  return {
    responseContent: `### Project Overview\n\nYour project has **${files.length} files**:\n\n${projectOverview}${schemaInfo}\n\nAsk me about a specific file (e.g., "what does app.tsx do?") or tell me what changes you'd like to make.`,
    thinkingSteps,
  };
}

function handleHelpRequest(
  message: string,
  state: ConversationState,
  thinkingSteps: ThinkingStep[],
  emitStep: (phase: string, label: string, detail?: string) => void
): LocalResponseResult {
  emitStep('response', 'Processing help request', 'Generating contextual help based on current state');

  const lower = message.toLowerCase();

  if (lower.includes('deploy')) {
    return {
      responseContent: `### Deployment Guide

Here's how to deploy your project:

**Quick Options:**
1. **Replit Deployments** - Click the Deploy button in Replit to deploy instantly
2. **Vercel** - Connect your GitHub repo for automatic deployments
3. **Railway** - Great for full-stack apps with databases
4. **Render** - Free tier available for hobby projects

**Steps for most platforms:**
1. Push your code to GitHub
2. Connect the repository to your deployment platform
3. Set environment variables (DATABASE_URL, etc.)
4. Deploy!

Would you like more specific deployment instructions for any platform?`,
      thinkingSteps,
    };
  }

  if (lower.includes('what can you') || lower.includes('capabilities') || lower.includes('what do you do') || lower.includes('features')) {
    return {
      responseContent: `### What I Can Do

I'm a **local code generation engine** that builds full-stack web applications. Here's what I offer:

**Project Generation:**
- Analyze your requirements through multi-level understanding
- Ask targeted clarification questions when needed
- Generate complete project plans with data models, APIs, and pages
- Produce production-ready code with proper structure

**Code Intelligence:**
- 15+ industry domain templates (e-commerce, healthcare, consulting, etc.)
- Smart entity relationship detection
- Automated validation and error fixing
- Learning from past generations to improve output

**After Generation:**
- Edit existing files with natural language requests
- Explain any part of your code
- Answer programming questions
- Suggest improvements

**No AI API Required:**
- Everything runs locally through a deterministic pipeline
- No OpenAI or other external AI service needed

Tell me what you'd like to build!`,
      thinkingSteps,
    };
  }

  const hasProject = state.phase === 'complete' || state.phase === 'editing';

  if (hasProject) {
    return {
      responseContent: `### What You Can Do Next

Your project is generated! Here are your options:

- **Edit files** - "Add a dark mode toggle" or "Change the dashboard layout"
- **Add features** - "Add user authentication" or "Add a settings page"
- **Ask questions** - "What does the schema look like?" or "Explain the API routes"
- **Start fresh** - Describe a new project and I'll build it from scratch

What would you like to do?`,
      thinkingSteps,
    };
  }

  return {
    responseContent: `### Getting Started

Here's how to use AutoCoder:

1. **Describe your project** - Tell me what you want to build in plain English
2. **Answer clarifications** - I may ask a few questions to understand your needs better
3. **Review the plan** - I'll show you a detailed plan with data models, pages, and APIs
4. **Approve** - Say "approve" or "looks good" and I'll generate the code
5. **Iterate** - Ask for changes, additions, or explanations

**Example prompts:**
- "Build a project management tool with tasks, teams, and deadlines"
- "Create a restaurant reservation system"
- "Make a fitness tracking dashboard"

Go ahead, describe what you'd like to build!`,
    thinkingSteps,
  };
}

function handleAcknowledgment(
  _message: string,
  state: ConversationState,
  thinkingSteps: ThinkingStep[],
  emitStep: (phase: string, label: string, detail?: string) => void
): LocalResponseResult {
  emitStep('response', 'Processing acknowledgment', 'Suggesting next steps');

  const phase = state.phase || 'initial';

  let responseContent: string;
  switch (phase) {
    case 'complete':
    case 'editing':
      responseContent = `Got it! Your project is ready. You can:
- **Request changes** - "Add a search bar to the users page"
- **Ask questions** - "How does the authentication work?"
- **Start a new project** - Just describe what you'd like to build

What's next?`;
      break;
    case 'approval':
    case 'planning':
      responseContent = `Great! If you're happy with the plan, just say **"approve"** and I'll start generating the code. Or tell me what you'd like to change in the plan.`;
      break;
    case 'clarifying':
      responseContent = `Thanks for the info! If you have answers to my earlier questions, go ahead and share them. Or if you'd like me to proceed with sensible defaults, just say **"go ahead"**.`;
      break;
    default:
      responseContent = `Alright! Ready when you are. Tell me what you'd like to build, or ask me any programming question.`;
      break;
  }

  return { responseContent, thinkingSteps };
}

function handleErrorDebug(
  message: string,
  state: ConversationState,
  thinkingSteps: ThinkingStep[],
  emitStep: (phase: string, label: string, detail?: string) => void
): LocalResponseResult {
  emitStep('response', 'Analyzing error/debug request', 'Checking if project context is available');

  const hasProject = state.existingFiles && state.existingFiles.length > 0;

  if (!hasProject) {
    return {
      responseContent: `I'd love to help debug, but I don't have your project context yet. Here's how I can help:

1. **Describe your project first** - Tell me what you're building, and I'll generate the code
2. **Then ask for fixes** - Once I have the files, I can make targeted edits

Alternatively, if you share the error message and describe what you're building, I can suggest a fix.

What are you working on?`,
      thinkingSteps,
    };
  }

  const codeBlockMatch = message.match(/```[\s\S]*?```/);
  const errorMatch = message.match(/(?:error|Error|ERROR)[:\s]+(.*?)(?:\n|$)/);

  let responseContent = `I can help fix that! To make the best fix, please tell me:\n\n`;

  if (errorMatch) {
    responseContent = `I see the error: **${errorMatch[1].trim()}**\n\nLet me look at your project files to find the issue. `;

    const errorText = errorMatch[1].toLowerCase();
    const relevantFiles = state.existingFiles!.filter(f => {
      const lower = f.path.toLowerCase();
      if (errorText.includes('import') || errorText.includes('module')) return lower.endsWith('.ts') || lower.endsWith('.tsx') || lower.endsWith('.js');
      if (errorText.includes('type') || errorText.includes('interface')) return lower.endsWith('.ts') || lower.endsWith('.tsx');
      if (errorText.includes('route') || errorText.includes('api')) return lower.includes('route') || lower.includes('api');
      if (errorText.includes('schema') || errorText.includes('database') || errorText.includes('table')) return lower.includes('schema') || lower.includes('model');
      return false;
    });

    if (relevantFiles.length > 0) {
      responseContent += `\n\nBased on the error, these files might be relevant:\n${relevantFiles.slice(0, 5).map(f => `- \`${f.path}\``).join('\n')}\n\nTell me what change you'd like me to make, and I'll edit the files directly. For example: "fix the import error in app.tsx" or "update the schema to match the route".`;
    } else {
      responseContent += `\n\nDescribe what you'd like me to fix, and I'll edit the relevant files. For example:\n- "Fix the broken import in the header component"\n- "Update the API route to handle the new field"`;
    }
  } else {
    responseContent += `1. **What error are you seeing?** - Paste the error message or describe the behavior\n2. **Which file or feature is affected?** - e.g., "the login page" or "the API endpoint"\n3. **What should happen instead?** - Describe the expected behavior\n\nI'll then make targeted edits to fix the issue.`;
  }

  return { responseContent, thinkingSteps };
}

function handleCodeQuestion(
  message: string,
  state: ConversationState,
  thinkingSteps: ThinkingStep[],
  emitStep: (phase: string, label: string, detail?: string) => void
): LocalResponseResult {
  emitStep('response', 'Searching knowledge base', 'Looking up programming concepts and best practices');

  const lower = message.toLowerCase();

  const keywords = lower
    .replace(/[?!.,;:'"]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .filter(w => !['what', 'how', 'why', 'when', 'does', 'the', 'and', 'for', 'are', 'you', 'can', 'this', 'that', 'with', 'about', 'between', 'use', 'explain', 'tell'].includes(w));

  let foundConcepts: Concept[] = [];
  for (const keyword of keywords) {
    const results = searchConcepts(keyword);
    for (const r of results) {
      if (!foundConcepts.find(c => c.id === r.id)) {
        foundConcepts.push(r);
      }
    }
  }

  if (foundConcepts.length > 0) {
    emitStep('response', 'Found relevant concepts', `${foundConcepts.length} concept(s) matched your question`);

    const topConcepts = foundConcepts.slice(0, 3);
    const conceptMarkdown = topConcepts.map(c => formatConceptAsMarkdown(c)).join('\n---\n\n');

    let extras = '';
    if (lower.includes('best practice') || lower.includes('how should') || lower.includes('how to')) {
      const practices = getBestPractices();
      const relevantPractices = practices.filter(bp =>
        keywords.some(k => bp.title.toLowerCase().includes(k) || bp.category.toLowerCase().includes(k))
      );
      if (relevantPractices.length > 0) {
        extras = '\n---\n\n' + relevantPractices.slice(0, 2).map(bp => formatBestPracticeAsMarkdown(bp)).join('\n\n');
      }
    }

    if (lower.includes('learn') || lower.includes('path') || lower.includes('roadmap')) {
      const pathKeywords = ['web-development', 'react', 'backend', 'security'];
      for (const pk of pathKeywords) {
        if (lower.includes(pk.replace('-', ' ')) || lower.includes(pk.replace('-', ''))) {
          const path = getLearningPath(pk);
          if (path) {
            extras += `\n\n---\n\n## Learning Path: ${path.title}\n\n${path.description}\n\nEstimated time: **${path.estimatedHours} hours**\n\nTopics: ${path.concepts.join(' -> ')}`;
          }
        }
      }
    }

    return {
      responseContent: conceptMarkdown + extras + '\n\nWant to know more about any of these, or would you like to build something?',
      thinkingSteps,
    };
  }

  const codeBlockMatch = message.match(/```(?:\w+)?\n([\s\S]*?)```/);
  if (codeBlockMatch) {
    emitStep('response', 'Analyzing code snippet', 'Running code explanation engine');
    const code = codeBlockMatch[1];
    const lang = message.match(/```(\w+)/)?.[1] || 'javascript';
    const explanation = explainCode(code, lang);
    const markdown = formatExplanationAsMarkdown(explanation);
    return {
      responseContent: markdown + '\n\nWant me to explain something else or build a project using these concepts?',
      thinkingSteps,
    };
  }

  emitStep('response', 'General response', 'No exact knowledge base match, providing general guidance');

  const topicGuesses: string[] = [];
  if (/react/i.test(lower)) topicGuesses.push('React components, hooks, state management, and routing');
  if (/typescript|ts\b/i.test(lower)) topicGuesses.push('TypeScript types, interfaces, generics, and type guards');
  if (/node|express/i.test(lower)) topicGuesses.push('Node.js runtime, Express.js routing, middleware, and API design');
  if (/sql|database|postgres/i.test(lower)) topicGuesses.push('SQL queries, database design, ORMs, and migrations');
  if (/css|tailwind|style/i.test(lower)) topicGuesses.push('CSS layouts, Flexbox, Grid, Tailwind utility classes');
  if (/api|rest|graphql/i.test(lower)) topicGuesses.push('API design, RESTful conventions, GraphQL schemas');
  if (/docker|container|deploy/i.test(lower)) topicGuesses.push('Containerization, Docker images, deployment strategies');
  if (/git|version/i.test(lower)) topicGuesses.push('Git branching, merge strategies, collaboration workflows');
  if (/test|jest|testing/i.test(lower)) topicGuesses.push('Unit testing, integration testing, test-driven development');
  if (/security|auth|jwt/i.test(lower)) topicGuesses.push('Authentication, authorization, JWT tokens, security best practices');

  if (topicGuesses.length > 0) {
    return {
      responseContent: `Great question! Here's what I know about that topic:\n\n${topicGuesses.map(t => `- ${t}`).join('\n')}\n\nI can go deeper into any of these areas. Try asking something more specific, like:\n- "What is the difference between useState and useReducer?"\n- "Explain the Observer pattern"\n- "What are SQL injection attacks?"\n\nOr describe a project to build and I'll put these concepts into practice!`,
      thinkingSteps,
    };
  }

  return handleUnknown(message, state, thinkingSteps, emitStep);
}

function handleUnknown(
  _message: string,
  state: ConversationState,
  thinkingSteps: ThinkingStep[],
  _emitStep: (phase: string, label: string, detail?: string) => void
): LocalResponseResult {
  const hasProject = state.phase === 'complete' || state.phase === 'editing';

  let responseContent: string;
  if (hasProject) {
    responseContent = `I'm not sure what you mean. Here's what I can help with:

- **Edit your project** - "Add a search feature" or "Change the header layout"
- **Explain code** - "What does the schema file do?"
- **Answer questions** - "What is React?" or "How does async/await work?"
- **Build something new** - Describe a new project

What would you like to do?`;
  } else {
    responseContent = `I'm not quite sure what you're looking for. Here's how I can help:

- **Build a project** - Describe what you want to build (e.g., "Build a todo app with categories")
- **Answer questions** - Ask about programming concepts, patterns, or best practices
- **Explain code** - Paste a code snippet and I'll break it down

What would you like to do?`;
  }

  return { responseContent, thinkingSteps };
}
