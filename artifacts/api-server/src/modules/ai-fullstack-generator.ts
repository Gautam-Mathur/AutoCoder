// AI-Powered Unlimited Full-Stack Application Generator
// Uses Local LLM (Ollama) as primary, falls back to OpenAI when unavailable
// Local LLM = FREE, no API costs

import OpenAI from "openai";
import { Response } from "express";
import { isLocalLLMAvailable, generateWithLocalLLM, LOCAL_CODE_SYSTEM_PROMPT, extractJSON } from "./local-llm-client";
import { cleanCodeArtifacts, cleanProjectFiles } from "./code-cleaner";

const AI_API_KEY = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "";
const AI_BASE_URL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL;
const AI_MODEL = process.env.OPENAI_MODEL || "llama3.2";

let openai: OpenAI | null = null;
try {
  if (AI_API_KEY) {
    openai = new OpenAI({
      apiKey: AI_API_KEY,
      ...(AI_BASE_URL ? { baseURL: AI_BASE_URL } : {}),
    });
  }
} catch (e) {
  console.log('[AI Generator] OpenAI not configured - using local LLM only');
}

// Check if we can use any AI
export async function isAIAvailable(): Promise<{ local: boolean; cloud: boolean }> {
  const localAvailable = await isLocalLLMAvailable();
  const cloudAvailable = openai !== null && !!AI_API_KEY;
  return { local: localAvailable, cloud: cloudAvailable };
}

export interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

export interface GeneratedProject {
  name: string;
  description: string;
  files: GeneratedFile[];
  dependencies: string[];
  instructions: string;
}

// System prompt for generating full-stack applications
const FULLSTACK_SYSTEM_PROMPT = `You are an expert full-stack developer AI. Generate COMPLETE, RUNNABLE full-stack applications.

CRITICAL REQUIREMENTS:
1. Generate ACTUAL working code - no placeholders, no TODOs, no "implement here" comments
2. All code must be production-quality and immediately runnable
3. Include ALL necessary files for a complete application
4. Use modern best practices and clean architecture
5. ZERO LOGIC ERRORS - Code must work correctly on first run

OUTPUT FORMAT:
Return a valid JSON object with this exact structure:
{
  "name": "project-name",
  "description": "Brief description of the app",
  "files": [
    {"path": "package.json", "content": "...", "language": "json"},
    {"path": "server.js", "content": "...", "language": "javascript"},
    {"path": "public/index.html", "content": "...", "language": "html"}
  ],
  "dependencies": ["express", "cors"],
  "instructions": "How to run: npm install && node server.js"
}

TECH STACK RULES:
- Backend: Express.js (ES modules with "type": "module")
- Database: In-memory storage (arrays/Maps) for zero-config. Include sample data.
- Frontend: Vanilla HTML/CSS/JS for simplicity, or React if requested
- Styling: Modern CSS with dark theme (background: #0f0f23, text: #e2e8f0)
- Server must bind to 0.0.0.0:3000

PACKAGE.JSON TEMPLATE:
{
  "name": "project-name",
  "type": "module",
  "scripts": { "start": "node server.js", "dev": "node server.js" },
  "dependencies": { "express": "^4.18.2", "cors": "^2.8.5" }
}

SERVER.JS STRUCTURE:
- Import express, cors
- Use express.json() and express.static('public')
- Define in-memory data stores
- Implement full CRUD REST API endpoints
- Serve index.html for all non-API routes
- Listen on 0.0.0.0:3000

UI REQUIREMENTS:
- Responsive design that works on mobile
- Clean, modern dark theme
- Interactive elements with hover states
- Loading states for async operations
- Error handling with user-friendly messages
- All functionality implemented in script tags (no build step)

FEATURES TO INCLUDE:
- Complete CRUD operations for all entities
- Input validation
- Error handling
- Sample/demo data pre-populated
- Real-time UI updates
- Modal dialogs for forms
- Toast notifications for feedback

CRITICAL LOGIC ERROR PREVENTION - AVOID THESE BUGS:
1. ASYNC/AWAIT:
   - ALWAYS use "await" before fetch() calls
   - NEVER use async directly in useEffect - define inner async function
   - Use Promise.all() for parallel async operations, not sequential awaits in loops
   - ALWAYS handle .catch() or use try/catch with async/await

2. ARRAY/OBJECT OPERATIONS:
   - Use [...arr].sort() instead of arr.sort() to avoid mutation
   - Use arr.length === 0 to check empty array, NOT arr === []
   - Use Object.keys(obj).length === 0 for empty object, NOT obj === {}
   - Use indexOf() !== -1 or includes(), NOT indexOf() > 0
   - Use arr[arr.length - 1] for last element, NOT arr[arr.length]

3. LOOPS AND CONDITIONS:
   - Use < length, NOT <= length in for loops
   - Use === for comparison, NOT = (assignment)
   - Use Number.isNaN(x), NOT x === NaN
   - Use "let" not "var" in for loops with callbacks
   - ALWAYS add break/return in while(true) loops

4. ERROR HANDLING:
   - NEVER leave catch blocks empty - always log or handle
   - Check for null/undefined before accessing properties: obj?.property
   - Validate user input before using it
   - Parse JSON in try/catch blocks

5. STATE MANAGEMENT (React):
   - Use functional updates: setCount(prev => prev + 1)
   - NEVER read state right after setting it
   - Add dependencies to useEffect properly
   - Clean up intervals/timeouts in useEffect return

6. API CALLS:
   - Check response.ok before response.json()
   - Handle loading and error states
   - Include proper Content-Type headers for POST/PUT

Remember: Generate COMPLETE, WORKING code with ZERO logic errors. Test your logic mentally before outputting.`;

// Per-file generation using Ollama — more reliable than one-shot JSON blob
async function generateWithOllamaPerFile(
  prompt: string,
  sendProgress: (stage: string, message: string, progress: number) => void
): Promise<GeneratedProject> {
  const MANIFEST_SYSTEM = `You are a software architect. Plan file structures for full-stack apps.
Output ONLY valid JSON. No markdown. No explanation outside the JSON.`;

  const MANIFEST_PROMPT = `Plan the files needed for this app: "${prompt}"

Output JSON:
{
  "name": "project-name",
  "description": "what it does",
  "dependencies": ["express", "cors"],
  "instructions": "npm install && node server.js",
  "files": [
    { "path": "package.json", "purpose": "Node.js package manifest" },
    { "path": "server.js", "purpose": "Express API server with all routes" },
    { "path": "public/index.html", "purpose": "Main frontend UI" }
  ]
}

Include ALL files needed. Typical app: package.json, server.js, public/index.html, public/style.css, public/app.js`;

  const FILE_GEN_SYSTEM = `You are a senior full-stack developer. Write complete, working code files.
Rules:
- Write COMPLETE code — no placeholders, no TODOs, no "implement here"
- Code must work on first run
- Output ONLY the raw file content — no markdown, no code fences, no explanation`;

  // Step 1: Generate manifest with retry
  let manifest: any = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const raw = await generateWithLocalLLM(
        attempt > 1 ? MANIFEST_PROMPT + '\n\nReminder: Output ONLY valid JSON. No other text.' : MANIFEST_PROMPT,
        MANIFEST_SYSTEM
      );
      const extracted = extractJSON(raw);
      if (extracted) {
        manifest = JSON.parse(extracted);
        break;
      }
      console.warn(`[PerFile] Manifest attempt ${attempt}/3: JSON parse failed`);
    } catch (e) {
      console.warn(`[PerFile] Manifest attempt ${attempt}/3 error:`, e);
    }
  }

  if (!manifest?.files?.length) {
    throw new Error('Could not plan file structure after 3 attempts');
  }

  sendProgress('planning', `File plan ready: ${manifest.files.length} files to generate`, 30);

  // Step 2: Generate each file individually
  const generatedFiles: GeneratedFile[] = [];
  const totalFiles = manifest.files.length;

  for (let i = 0; i < totalFiles; i++) {
    const fileSpec = manifest.files[i];
    const progressPct = 30 + Math.round(((i + 1) / totalFiles) * 60);
    sendProgress('generating', `Writing ${fileSpec.path} (${i + 1}/${totalFiles})...`, progressPct);

    const filePrompt = `Write the complete content for this file: ${fileSpec.path}
Purpose: ${fileSpec.purpose}
App: ${manifest.description || prompt}
Dependencies available: ${(manifest.dependencies || []).join(', ')}

Context about other files in this project:
${manifest.files.map((f: any) => `- ${f.path}: ${f.purpose}`).join('\n')}

Write ONLY the file content. No explanation. No markdown fences.`;

    let fileContent = '';
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        fileContent = await generateWithLocalLLM(filePrompt, FILE_GEN_SYSTEM);
        if (fileContent.trim().length > 10) break;
      } catch (e) {
        console.warn(`[PerFile] File ${fileSpec.path} attempt ${attempt}/2 error:`, e);
      }
    }

    if (fileContent.trim()) {
      generatedFiles.push({
        path: fileSpec.path,
        content: fileContent.trim(),
        language: detectLanguage(fileSpec.path),
      });
    }
  }

  if (generatedFiles.length === 0) {
    throw new Error('No files could be generated');
  }

  sendProgress('complete', `Generated ${generatedFiles.length}/${totalFiles} files`, 95);

  const project: GeneratedProject = {
    name: manifest.name || 'generated-app',
    description: manifest.description || prompt,
    files: generatedFiles,
    dependencies: manifest.dependencies || [],
    instructions: manifest.instructions || 'npm install && node server.js',
  };

  const { files: cleanedFiles } = cleanProjectFiles(project.files);
  project.files = cleanedFiles;

  return project;
}

// Generate a full-stack application with streaming progress
export async function generateFullStackAppStream(
  prompt: string,
  res: Response
): Promise<void> {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendProgress = (stage: string, message: string, progress: number) => {
    res.write(`data: ${JSON.stringify({ type: 'progress', progress: { stage, message, progress } })}\n\n`);
  };

  const sendError = (message: string) => {
    res.write(`data: ${JSON.stringify({ type: 'error', message })}\n\n`);
    res.end();
  };

  try {
    // Check AI availability - prefer local LLM (free) over cloud
    const aiStatus = await isAIAvailable();
    const useLocalLLM = aiStatus.local;
    const useCloud = !useLocalLLM && aiStatus.cloud && openai !== null;

    if (!useLocalLLM && !useCloud) {
      sendError('No AI available. Start Ollama locally (ollama serve) or configure OpenAI API key.');
      return;
    }

    sendProgress('analyzing', `Understanding requirements... (using ${useLocalLLM ? 'Local LLM - FREE' : 'Cloud AI'})`, 10);

    let plan: any = {};
    let fullContent = '';

    if (useLocalLLM) {
      sendProgress('planning', 'Planning file structure with Local LLM (free)...', 20);

      try {
        const project = await generateWithOllamaPerFile(prompt, sendProgress);
        res.write(`data: ${JSON.stringify({ type: 'complete', project })}\n\n`);
        res.end();
        return;
      } catch (localError: any) {
        console.error('Local LLM per-file generation failed:', localError);
        if (useCloud && openai) {
          sendProgress('fallback', 'Local LLM failed, switching to Cloud AI...', 40);
        } else {
          sendError(localError.message || 'Local LLM generation failed');
          return;
        }
      }
    }

    // Fallback to OpenAI or if local failed
    if (!fullContent && useCloud && openai) {
      const planningResponse = await openai.chat.completions.create({
        model: AI_MODEL,
        max_completion_tokens: 2000,
        messages: [
          {
            role: "system",
            content: `You are an expert software architect. Analyze the user's request and create a detailed technical plan.

Return JSON:
{
  "appName": "suggested-name",
  "description": "what the app does",
  "entities": ["User", "Post", etc],
  "features": ["feature1", "feature2"],
  "apiEndpoints": ["GET /api/items", "POST /api/items"],
  "uiComponents": ["Header", "ItemList", "ItemForm"],
  "complexity": "simple|medium|complex"
}`
          },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      });

      plan = JSON.parse(planningResponse.choices[0]?.message?.content || "{}");
      sendProgress('planning', `Planning ${plan.appName || 'your app'}: ${plan.features?.length || 0} features, ${plan.apiEndpoints?.length || 0} endpoints`, 30);

      sendProgress('generating', 'Generating full-stack code with Cloud AI...', 50);

      const generationPrompt = `Build this application based on the user's request:
"${prompt}"

Technical plan:
${JSON.stringify(plan, null, 2)}

Generate the COMPLETE application with ALL files. Every feature must be fully implemented with working code.`;

      const stream = await openai.chat.completions.create({
        model: AI_MODEL,
        max_completion_tokens: 16000,
        stream: true,
        messages: [
          { role: "system", content: FULLSTACK_SYSTEM_PROMPT },
          { role: "user", content: generationPrompt }
        ],
        response_format: { type: "json_object" }
      });

      let tokenCount = 0;

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        fullContent += content;
        tokenCount++;

        if (tokenCount % 50 === 0) {
          const progress = Math.min(50 + (tokenCount / 200) * 40, 90);
          sendProgress('generating', `Generating code... (${Math.round(progress)}%)`, progress);
        }
      }

      sendProgress('complete', 'Cloud AI generation complete!', 100);
    }

    // Parse and validate the generated project
    let project: GeneratedProject;
    try {
      project = JSON.parse(fullContent);

      // Validate required fields
      if (!project.name || !project.files || project.files.length === 0) {
        throw new Error('Invalid project structure');
      }

      // Ensure all files have required properties
      project.files = project.files.map(f => ({
        path: f.path,
        content: f.content,
        language: f.language || detectLanguage(f.path)
      }));

      // Clean markdown artifacts and fix common issues
      const { files: cleanedFiles, totalFixes: cleanFixes } = cleanProjectFiles(project.files);
      if (cleanFixes > 0) {
        console.log(`[AI Generator] Cleaned ${cleanFixes} markdown artifacts from code`);
      }
      project.files = cleanedFiles;

      // Auto-fix logic errors in generated code
      const { project: fixedProject, totalFixes } = fixProjectLogicErrors(project);
      if (totalFixes > 0) {
        console.log(`[AI Generator] Auto-fixed ${totalFixes} logic errors in generated code`);
      }
      project = fixedProject;

    } catch (parseError) {
      // Use extractJSON for consistent JSON extraction
      const extractedJSON = extractJSON(fullContent);
      if (extractedJSON) {
        project = JSON.parse(extractedJSON);
      } else {
        throw new Error('Failed to parse generated project');
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'complete', project })}\n\n`);
    res.end();

  } catch (error: any) {
    console.error('AI Generation Error:', error);
    sendError(error.message || 'Generation failed');
  }
}

// Synchronous generation (non-streaming)
export async function generateFullStackApp(prompt: string): Promise<GeneratedProject> {

  // Try local LLM first (FREE)
  const localAvailable = await isLocalLLMAvailable();

  if (localAvailable) {
    const localPrompt = `Build this application: ${prompt}

Generate a COMPLETE, RUNNABLE full-stack application with:
- package.json with all dependencies
- server.js with Express backend and REST API
- public/index.html with full frontend UI
- All features fully implemented with working code
- Sample data pre-populated
- Modern dark theme styling

Output as JSON only, no markdown.`;

    try {
      const localContent = await generateWithLocalLLM(localPrompt, LOCAL_CODE_SYSTEM_PROMPT);
      const jsonContent = extractJSON(localContent);
      if (!jsonContent) {
        throw new Error('Local LLM did not return valid JSON');
      }
      const project = JSON.parse(jsonContent);
      if (project.name && project.files) {
        project.files = project.files.map((f: any) => ({
          path: f.path,
          content: f.content,
          language: f.language || detectLanguage(f.path)
        }));
        // Clean markdown artifacts
        const { files: cleanedFiles, totalFixes: cleanFixes } = cleanProjectFiles(project.files);
        if (cleanFixes > 0) {
          console.log(`[Local LLM] Cleaned ${cleanFixes} markdown artifacts`);
        }
        project.files = cleanedFiles;
        // Fix logic errors
        const { project: fixedProject, totalFixes } = fixProjectLogicErrors(project);
        if (totalFixes > 0) {
          console.log(`[Local LLM] Auto-fixed ${totalFixes} logic errors`);
        }
        return fixedProject;
      }
    } catch (e) {
      console.log('[Local LLM] Failed, falling back to cloud...');
    }
  }

  // Fallback to OpenAI if local LLM unavailable or failed
  if (!openai) {
    throw new Error('No AI available. Start Ollama locally or configure OpenAI API key.');
  }

  const response = await openai.chat.completions.create({
    model: AI_MODEL,
    max_completion_tokens: 16000,
    messages: [
      { role: "system", content: FULLSTACK_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Build this application: ${prompt}

Generate a COMPLETE, RUNNABLE full-stack application with:
- package.json with all dependencies
- server.js with Express backend and REST API
- public/index.html with full frontend UI
- All features fully implemented with working code
- Sample data pre-populated
- Modern dark theme styling`
      }
    ],
    response_format: { type: "json_object" }
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from AI');
  }

  const project = JSON.parse(content);

  // Validate and normalize
  if (!project.name || !project.files) {
    throw new Error('Invalid project structure');
  }

  project.files = project.files.map((f: any) => ({
    path: f.path,
    content: f.content,
    language: f.language || detectLanguage(f.path)
  }));

  // Clean markdown artifacts from code
  const { files: cleanedFiles, totalFixes: cleanFixes } = cleanProjectFiles(project.files);
  if (cleanFixes > 0) {
    console.log(`[AI Generator] Cleaned ${cleanFixes} markdown artifacts`);
  }
  project.files = cleanedFiles;

  // Auto-fix logic errors in generated code
  const { project: fixedProject, totalFixes } = fixProjectLogicErrors(project);
  if (totalFixes > 0) {
    console.log(`[AI Generator] Auto-fixed ${totalFixes} logic errors in generated code`);
  }

  return fixedProject;
}

// Enhanced generation with context from conversation
export async function generateWithContext(
  prompt: string,
  context: { previousFiles?: GeneratedFile[]; techStack?: string; preferences?: string }
): Promise<GeneratedProject> {

  let contextPrompt = `Build this application: ${prompt}\n\n`;

  if (context.techStack) {
    contextPrompt += `Tech stack preference: ${context.techStack}\n`;
  }

  if (context.preferences) {
    contextPrompt += `User preferences: ${context.preferences}\n`;
  }

  if (context.previousFiles && context.previousFiles.length > 0) {
    contextPrompt += `\nExisting project context (files already created):\n`;
    for (const file of context.previousFiles.slice(0, 3)) {
      contextPrompt += `- ${file.path}\n`;
    }
    contextPrompt += `\nBuild upon or integrate with this existing structure.\n`;
  }

  return generateFullStackApp(contextPrompt);
}

// Detect language from file extension
function detectLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'json': 'json',
    'html': 'html',
    'css': 'css',
    'md': 'markdown',
    'py': 'python',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'sql': 'sql',
    'sh': 'bash',
    'yaml': 'yaml',
    'yml': 'yaml'
  };
  return langMap[ext || ''] || 'text';
}

// Generate specific file types
export async function generateFile(
  description: string,
  fileType: 'api' | 'component' | 'model' | 'style' | 'test'
): Promise<GeneratedFile> {

  const prompts: Record<string, string> = {
    api: `Generate an Express.js API router with full CRUD operations for: ${description}. Include validation, error handling, and in-memory storage.`,
    component: `Generate a React component for: ${description}. Use hooks, include styling, handle loading/error states.`,
    model: `Generate a data model/schema for: ${description}. Include validation rules and TypeScript types.`,
    style: `Generate modern CSS for: ${description}. Use CSS variables, dark theme, responsive design.`,
    test: `Generate comprehensive tests for: ${description}. Include unit tests and integration tests.`
  };

  // Try local LLM first
  const localAvailable = await isLocalLLMAvailable();
  if (localAvailable) {
    try {
      const content = await generateWithLocalLLM(prompts[fileType], 'Generate production-quality code. Return ONLY the code, no markdown, no explanations.');
      const codeMatch = content.match(/```[\w]*\n([\s\S]*?)```/);
      const code = codeMatch ? codeMatch[1] : content;
      const extensions: Record<string, string> = { api: 'js', component: 'jsx', model: 'ts', style: 'css', test: 'test.js' };
      return { path: `generated-${fileType}.${extensions[fileType]}`, content: code, language: fileType === 'style' ? 'css' : 'javascript' };
    } catch (e) { /* fallback to cloud */ }
  }

  if (!openai) {
    throw new Error('No AI available. Start Ollama locally or configure OpenAI API key.');
  }

  const response = await openai.chat.completions.create({
    model: AI_MODEL,
    max_completion_tokens: 4000,
    messages: [
      {
        role: "system",
        content: "Generate production-quality code. Return ONLY the code, no explanations."
      },
      { role: "user", content: prompts[fileType] }
    ]
  });

  const content = response.choices[0]?.message?.content || '';

  // Extract code from markdown if present
  const codeMatch = content.match(/```[\w]*\n([\s\S]*?)```/);
  const code = codeMatch ? codeMatch[1] : content;

  const extensions: Record<string, string> = {
    api: 'js',
    component: 'jsx',
    model: 'ts',
    style: 'css',
    test: 'test.js'
  };

  return {
    path: `generated-${fileType}.${extensions[fileType]}`,
    content: code,
    language: fileType === 'style' ? 'css' : 'javascript'
  };
}

// Modify existing code based on instructions
export async function modifyCode(
  existingCode: string,
  instructions: string,
  language: string = 'javascript'
): Promise<string> {

  // Try local LLM first
  const localAvailable = await isLocalLLMAvailable();
  if (localAvailable) {
    try {
      const prompt = `Modify this ${language} code:\n\`\`\`${language}\n${existingCode}\n\`\`\`\n\nInstructions: ${instructions}\n\nReturn ONLY the modified code:`;
      const content = await generateWithLocalLLM(prompt, 'You are a code modification assistant. Return ONLY the modified code, no explanations.');
      const codeMatch = content.match(/```[\w]*\n([\s\S]*?)```/);
      return codeMatch ? codeMatch[1] : content;
    } catch (e) { /* fallback to cloud */ }
  }

  if (!openai) {
    throw new Error('No AI available. Start Ollama locally or configure OpenAI API key.');
  }

  const response = await openai.chat.completions.create({
    model: AI_MODEL,
    max_completion_tokens: 8000,
    messages: [
      {
        role: "system",
        content: `You are a code modification assistant. Modify the provided ${language} code according to instructions. Return ONLY the modified code, no explanations.`
      },
      {
        role: "user",
        content: `Existing code:\n\`\`\`${language}\n${existingCode}\n\`\`\`\n\nInstructions: ${instructions}\n\nReturn the complete modified code:`
      }
    ]
  });

  const content = response.choices[0]?.message?.content || existingCode;
  const codeMatch = content.match(/```[\w]*\n([\s\S]*?)```/);
  return codeMatch ? codeMatch[1] : content;
}

// ==================== LOGIC ERROR AUTO-FIXER ====================
// Scans generated code and fixes common logic errors

interface LogicFix {
  pattern: RegExp;
  fix: string | ((match: string, ...groups: string[]) => string);
  description: string;
}

const LOGIC_FIXES: LogicFix[] = [
  // Async/Await fixes
  {
    pattern: /(?<!await\s+)fetch\s*\(/g,
    fix: 'await fetch(',
    description: 'Added await to fetch()'
  },
  {
    pattern: /useEffect\s*\(\s*async\s*\(\s*\)\s*=>\s*\{([\s\S]*?)\}\s*,\s*\[/g,
    fix: (_, body) => `useEffect(() => {\n    const fetchData = async () => {${body}};\n    fetchData();\n  }, [`,
    description: 'Fixed async useEffect pattern'
  },
  {
    pattern: /\.forEach\s*\(\s*async\s*\(/g,
    fix: '.map(async (',
    description: 'Changed forEach async to map async (use Promise.all)'
  },

  // Comparison fixes
  {
    pattern: /([^!=])={2}(?!=)\s*(null|undefined|NaN)/g,
    fix: '$1===$2',
    description: 'Changed == to === for strict comparison'
  },
  {
    pattern: /(\w+)\s*===?\s*NaN/g,
    fix: 'Number.isNaN($1)',
    description: 'Fixed NaN comparison'
  },
  {
    pattern: /(\w+)\s*===?\s*\[\s*\]/g,
    fix: '$1.length === 0',
    description: 'Fixed empty array comparison'
  },
  {
    pattern: /(\w+)\s*===?\s*\{\s*\}/g,
    fix: 'Object.keys($1).length === 0',
    description: 'Fixed empty object comparison'
  },

  // Loop fixes
  {
    pattern: /for\s*\(\s*var\s+(\w+)/g,
    fix: 'for (let $1',
    description: 'Changed var to let in for loop'
  },
  {
    pattern: /for\s*\([^;]+;\s*(\w+)\s*<=\s*(\w+)\.length\s*;/g,
    fix: (match, i, arr) => match.replace(`${i} <= ${arr}.length`, `${i} < ${arr}.length`),
    description: 'Fixed off-by-one error in loop'
  },

  // Array access fixes
  {
    pattern: /\[(\w+)\.length\]/g,
    fix: '[$1.length - 1]',
    description: 'Fixed last element access'
  },
  {
    pattern: /\.indexOf\s*\([^)]+\)\s*>\s*0/g,
    fix: (match) => match.replace('> 0', '>= 0'),
    description: 'Fixed indexOf check (> 0 misses first element)'
  },

  // Error handling
  {
    pattern: /catch\s*\(\s*(\w+)\s*\)\s*\{\s*\}/g,
    fix: 'catch ($1) { console.error("Error:", $1.message); }',
    description: 'Added error logging to empty catch'
  },
  {
    pattern: /\.catch\s*\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)/g,
    fix: '.catch(err => { console.error("Error:", err.message); })',
    description: 'Added error handling to empty .catch()'
  },

  // JSON parsing
  {
    pattern: /JSON\.parse\s*\(\s*localStorage\.getItem\s*\(\s*(['"`][^'"`]+['"`])\s*\)\s*\)/g,
    fix: 'JSON.parse(localStorage.getItem($1) || "{}")',
    description: 'Added null fallback for localStorage'
  },

  // Fetch response handling
  {
    pattern: /const\s+(\w+)\s*=\s*await\s+response\.json\s*\(\s*\)/g,
    fix: (_, varName) => `if (!response.ok) throw new Error("Request failed");\n    const ${varName} = await response.json()`,
    description: 'Added response.ok check before json()'
  },

  // React state updates
  {
    pattern: /set(\w+)\s*\(\s*(\w+)\s*\+\s*1\s*\)/g,
    fix: 'set$1(prev => prev + 1)',
    description: 'Used functional state update'
  },
  {
    pattern: /set(\w+)\s*\(\s*(\w+)\s*-\s*1\s*\)/g,
    fix: 'set$1(prev => prev - 1)',
    description: 'Used functional state update'
  },

  // Mutation prevention
  {
    pattern: /(\w+)\.sort\s*\(\s*\)/g,
    fix: '[...$1].sort()',
    description: 'Prevented array mutation with spread'
  },
  {
    pattern: /(\w+)\.reverse\s*\(\s*\)/g,
    fix: '[...$1].reverse()',
    description: 'Prevented array mutation with spread'
  }
];

// Apply logic fixes to generated code
export function fixLogicErrors(code: string): { code: string; fixes: string[] } {
  let fixedCode = code;
  const appliedFixes: string[] = [];

  for (const { pattern, fix, description } of LOGIC_FIXES) {
    const matches = fixedCode.match(pattern);
    if (matches && matches.length > 0) {
      if (typeof fix === 'string') {
        fixedCode = fixedCode.replace(pattern, fix);
      } else {
        fixedCode = fixedCode.replace(pattern, fix);
      }
      appliedFixes.push(description);
    }
  }

  return { code: fixedCode, fixes: appliedFixes };
}

// Apply fixes to all files in a project
export function fixProjectLogicErrors(project: GeneratedProject): { project: GeneratedProject; totalFixes: number; fixesByFile: Record<string, string[]> } {
  const fixesByFile: Record<string, string[]> = {};
  let totalFixes = 0;

  const fixedFiles = project.files.map(file => {
    if (['javascript', 'typescript', 'html'].includes(file.language)) {
      const { code, fixes } = fixLogicErrors(file.content);
      if (fixes.length > 0) {
        fixesByFile[file.path] = fixes;
        totalFixes += fixes.length;
      }
      return { ...file, content: code };
    }
    return file;
  });

  return {
    project: { ...project, files: fixedFiles },
    totalFixes,
    fixesByFile
  };
}
