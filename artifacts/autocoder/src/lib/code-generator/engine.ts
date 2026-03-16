// Code Generation Engine - Smart Template-based code generator
// Uses Pro Generator for multi-file React project output
// Uses Sage Knowledge Base for human-like understanding
// WebApp Knowledge for multi-language apps
// Learning Module for constant improvement

import { allTemplates, CodeTemplate } from "./templates";
import { understandRequest, conceptLibrary, RequestIntent } from "./knowledge-base";
import { techStacks, appBlueprints, codePatterns, getStackForAppType, getStackRecommendation } from "./webapp-knowledge";
import { getLearningEngine, intelligentParse, LearnedPattern } from "./learning-module";
import { detectDomain, customizeTemplate, getDomainContent } from "./creativity-module";
import { isFullyFunctionalRequest, generateFullStackApp, formatFullStackResponse } from "./fullstack-generator";
import { debugCode, checkErrors, recordCodeChange, getDebugStats, CodeError } from "./debug-module";
import { testCode, validateCode, generateTestReport, TestResult } from "./auto-tester";
import { matchRunnableTemplate, RunnableProject } from "./runnable-templates";
import { enhanceTemplate, polishCode, detectFeatures } from "./smart-enhancer";
import {
  generateFromScratch,
  formatGeneratedApp,
  parseIntent,
  processWithIntelligence,
  addToMemory,
  rememberComponent,
  analyzeError,
  generateFix,
  explainCode,
  teachConcept,
  solveCreatively,
  handleAmbiguousRequest,
  decomposeProblem,
} from "./code-brain";
import { analyzePrompt, generateProject, formatProjectResponse, shouldUseProGenerator, analyzePromptWithThinking, generateProjectWithThinking } from "./pro-generator";
import type { ThinkingStep, ThinkingCallback } from "./pro-generator";
import { validateGeneratedCode } from "./code-validator";
import { detectStandaloneScript, generateStandaloneScript, formatScriptResponse } from "./script-generator";

// Format runnable project as response with file blocks
function formatRunnableProjectResponse(project: RunnableProject): string {
  let response = `# ${project.name}\n\n${project.description}\n\n`;
  response += `**This is a runnable project!** Open the IDE tab to see it run automatically.\n\n`;

  for (const file of project.files) {
    response += `### ${file.path}\n\`\`\`${file.language}\n${file.content}\n\`\`\`\n\n`;
  }

  response += `---\n\n**To run locally:**\n1. Copy the files above to a folder\n2. Run \`npm install\`\n3. Run \`npm run dev\`\n`;

  return response;
}

interface GenerationResult {
  code: string;
  language: string;
  templateName: string;
  confidence: number;
}

interface ProjectFile {
  path: string;
  content: string;
  language?: string;
}

// Detect if this is a modification request vs new creation
function isModificationRequest(input: string): boolean {
  const modificationKeywords = [
    "change", "update", "modify", "edit", "make it", "add", "remove", "delete",
    "more", "less", "bigger", "smaller", "darker", "lighter", "brighter",
    "different", "replace", "fix", "improve", "adjust", "tweak", "switch",
    "green", "blue", "red", "black", "white", "purple", "orange", "pink", "yellow",
    "color", "colour", "colors", "colours", "theme", "style", "styling",
    "font", "text", "size", "padding", "margin", "border", "background",
    "now", "instead", "but", "with"
  ];

  const lowerInput = input.toLowerCase();
  return modificationKeywords.some(keyword => lowerInput.includes(keyword));
}

// Extract color modifications from input
function extractColorChanges(input: string): Record<string, string> {
  const colors: Record<string, string> = {};
  const lowerInput = input.toLowerCase();

  // Common color keywords and their values
  const colorMap: Record<string, string> = {
    "green": "#22c55e",
    "dark green": "#166534",
    "light green": "#86efac",
    "black": "#000000",
    "white": "#ffffff",
    "blue": "#3b82f6",
    "dark blue": "#1e40af",
    "light blue": "#93c5fd",
    "red": "#ef4444",
    "purple": "#a855f7",
    "pink": "#ec4899",
    "orange": "#f97316",
    "yellow": "#eab308",
    "gray": "#6b7280",
    "grey": "#6b7280",
    "dark": "#1a1a2e",
    "darker": "#0f0f1a",
  };

  // Check for specific color mentions
  for (const [colorName, colorValue] of Object.entries(colorMap)) {
    if (lowerInput.includes(colorName)) {
      if (lowerInput.includes("primary") || lowerInput.includes("main") || lowerInput.includes("accent")) {
        colors.primary = colorValue;
      } else if (lowerInput.includes("background") || lowerInput.includes("bg")) {
        colors.background = colorValue;
      } else if (lowerInput.includes("text")) {
        colors.text = colorValue;
      } else {
        // Apply to primary by default for accent colors, background for dark/black
        if (colorName.includes("dark") || colorName === "black") {
          colors.background = colorValue;
        } else {
          colors.primary = colorValue;
        }
      }
    }
  }

  // Check for "green and black" style patterns
  if (lowerInput.includes("green") && (lowerInput.includes("black") || lowerInput.includes("dark"))) {
    colors.primary = "#22c55e";
    colors.background = "#0a0a0f";
    colors.surface = "#121218";
  }

  if (lowerInput.includes("blue") && (lowerInput.includes("black") || lowerInput.includes("dark"))) {
    colors.primary = "#3b82f6";
    colors.background = "#0a0a0f";
    colors.surface = "#121218";
  }

  return colors;
}

// Apply color changes to existing HTML/CSS code
function applyColorChanges(code: string, colors: Record<string, string>): string {
  let modifiedCode = code;

  if (colors.primary) {
    // Replace primary color in CSS variables and inline styles
    modifiedCode = modifiedCode.replace(/--primary:\s*#[0-9a-fA-F]{3,8}/g, `--primary: ${colors.primary}`);
    modifiedCode = modifiedCode.replace(/--primary-glow:\s*rgba\([^)]+\)/g, `--primary-glow: ${colors.primary}40`);
    // Replace common purple/violet colors (default theme colors)
    modifiedCode = modifiedCode.replace(/#8b5cf6/gi, colors.primary);
    modifiedCode = modifiedCode.replace(/#a855f7/gi, colors.primary);
    modifiedCode = modifiedCode.replace(/#7c3aed/gi, colors.primary);
    modifiedCode = modifiedCode.replace(/#ec4899/gi, colors.primary); // pink gradients
  }

  if (colors.background) {
    modifiedCode = modifiedCode.replace(/--bg:\s*#[0-9a-fA-F]{3,8}/g, `--bg: ${colors.background}`);
    modifiedCode = modifiedCode.replace(/#0a0a0f/gi, colors.background);
    modifiedCode = modifiedCode.replace(/#0f0f1a/gi, colors.background);
  }

  if (colors.surface) {
    modifiedCode = modifiedCode.replace(/--surface:\s*#[0-9a-fA-F]{3,8}/g, `--surface: ${colors.surface}`);
    modifiedCode = modifiedCode.replace(/--card:\s*#[0-9a-fA-F]{3,8}/g, `--card: ${colors.surface}`);
    modifiedCode = modifiedCode.replace(/#12121a/gi, colors.surface);
    modifiedCode = modifiedCode.replace(/#1a1a25/gi, colors.surface);
  }

  if (colors.text) {
    modifiedCode = modifiedCode.replace(/--text:\s*#[0-9a-fA-F]{3,8}/g, `--text: ${colors.text}`);
  }

  return modifiedCode;
}

// Generate code with context from existing project files
export function generateCodeWithContext(input: string, existingFiles: ProjectFile[]): string {
  // Check if we have existing files and this looks like a modification request
  const htmlFile = existingFiles.find(f => f.path.endsWith(".html"));

  if (htmlFile && isModificationRequest(input)) {
    // This is a modification request - update existing code
    const colorChanges = extractColorChanges(input);

    if (Object.keys(colorChanges).length > 0) {
      // Apply color modifications
      let modifiedCode = applyColorChanges(htmlFile.content, colorChanges);

      // ========== AUTO-DEBUG WHILE MODIFYING ==========
      const testResult = quickTestAndFix(modifiedCode);
      modifiedCode = testResult.code;

      let response = `I've updated the **${htmlFile.path}** with your color changes:\n\n`;
      response += "--- FILE: " + htmlFile.path + " ---\n";
      response += modifiedCode;
      response += "\n\n";
      response += "**Changes made:**\n";

      if (colorChanges.primary) {
        response += `• Primary/accent color → ${colorChanges.primary}\n`;
      }
      if (colorChanges.background) {
        response += `• Background color → ${colorChanges.background}\n`;
      }
      if (colorChanges.surface) {
        response += `• Surface/card colors → ${colorChanges.surface}\n`;
      }

      // Show debug info
      if (testResult.fixes.length > 0) {
        response += `\n✅ **Auto-fixed ${testResult.fixes.length} issue${testResult.fixes.length > 1 ? 's' : ''} while updating:**\n`;
        testResult.fixes.slice(0, 3).forEach(fix => {
          response += `• ${fix}\n`;
        });
      }

      response += "\nThe preview should update automatically!";

      return response;
    }

    // If we couldn't detect specific changes, still acknowledge we're modifying
    // but fall back to generating new code for now
    let response = "I'll update your existing project. ";
    response += generateCode(input);
    return response;
  }

  // No existing files or not a modification request - generate new
  return generateCode(input);
}

export interface ThinkingGenerationResult {
  response: string;
  thinkingSteps: ThinkingStep[];
}

export function generateCodeWithThinking(
  input: string,
  existingFiles: ProjectFile[],
  onStep?: ThinkingCallback
): ThinkingGenerationResult {
  const steps: ThinkingStep[] = [];
  const emit = (step: ThinkingStep) => {
    step.timestamp = Date.now();
    steps.push(step);
    onStep?.(step);
  };

  const htmlFile = existingFiles.find(f => f.path.endsWith(".html"));

  if (htmlFile && isModificationRequest(input)) {
    emit({
      phase: 'understanding',
      label: 'Modification request detected',
      detail: 'Updating your existing project instead of creating new',
    });
    const response = generateCodeWithContext(input, existingFiles);
    return { response, thinkingSteps: steps };
  }

  // STANDALONE SCRIPT: Detect non-web script/program requests (Python, Go, Rust, Node)
  const scriptDetection = detectStandaloneScript(input);
  if (scriptDetection.isScript) {
    emit({
      phase: 'understanding',
      label: `Standalone ${scriptDetection.language} script detected`,
      detail: `Generating ${scriptDetection.language} project for: ${scriptDetection.taskDescription}`,
    });
    const scriptApp = generateStandaloneScript(scriptDetection.language, scriptDetection.taskDescription, input);
    emit({
      phase: 'generating',
      label: `Generated ${scriptApp.files.length} files`,
      detail: scriptApp.files.map(f => f.path).join(', '),
    });
    const response = formatScriptResponse(scriptApp, scriptDetection.language);
    return { response, thinkingSteps: steps };
  }

  if (shouldUseProGenerator(input)) {
    try {
      const requirements = analyzePromptWithThinking(input, emit);
      const project = generateProjectWithThinking(requirements, emit, input);

      if (project.files.length > 0) {
        emit({
          phase: 'validating',
          label: 'Validating generated code',
          detail: 'Running syntax checks and auto-fixing issues',
        });

        const validation = validateGeneratedCode(project.files.map(f => ({ path: f.path, content: f.content })));
        const fixedFiles = validation.fixedFiles.length > 0 ? validation.fixedFiles : project.files.map(f => ({ path: f.path, content: f.content }));
        const validatedProject = {
          ...project,
          files: fixedFiles.map(f => {
            const orig = project.files.find(o => o.path === f.path);
            return { ...f, language: orig?.language || 'text' };
          }),
        };

        emit({
          phase: 'validating',
          label: validation.errors.length > 0 ? `Fixed ${validation.errors.length} issues` : 'All checks passed',
          detail: `${validatedProject.files.length} files ready`,
        });

        let response = formatProjectResponse(validatedProject);
        if (validation.errors.length > 0) {
          response += `\n\n**Validation:** ${validation.errors.length} issue${validation.errors.length > 1 ? 's' : ''} auto-fixed before delivery.`;
        }
        return { response, thinkingSteps: steps };
      }
    } catch (e) {
      console.error('Pro generator with thinking failed, falling back:', e);
    }
  }

  const response = generateCode(input);
  return { response, thinkingSteps: steps };
}

// Synonym mappings for better matching
const synonyms: Record<string, string[]> = {
  landing: ["home", "homepage", "hero", "main", "welcome", "intro", "startup", "saas", "product", "marketing"],
  form: ["input", "contact", "signup", "register", "login", "auth", "submit", "email", "subscribe"],
  card: ["box", "tile", "panel", "item", "product", "portfolio", "gallery"],
  grid: ["layout", "columns", "gallery", "masonry", "responsive"],
  navbar: ["navigation", "menu", "header", "topbar", "nav", "links"],
  dashboard: ["admin", "panel", "analytics", "stats", "metrics", "overview"],
  modal: ["popup", "dialog", "overlay", "lightbox", "alert"],
  fetch: ["api", "http", "request", "get", "post", "ajax", "rest", "data"],
  todo: ["task", "list", "checklist", "items", "notes"],
  button: ["btn", "click", "action", "cta"],
  animation: ["animate", "motion", "transition", "effect", "hover", "fade", "slide"],
  flex: ["flexbox", "row", "column", "align", "center", "justify"],
  component: ["react", "functional", "hook", "useState", "props"],
  validation: ["validate", "check", "verify", "rules", "error"],
  storage: ["localstorage", "save", "persist", "cache", "store", "session"],
  debounce: ["throttle", "delay", "performance", "optimize", "scroll", "search"],
};

// Expand keywords using synonyms
function expandKeywords(keywords: string[]): string[] {
  const expanded = new Set(keywords);

  for (const keyword of keywords) {
    // Check if this keyword is a synonym for something
    for (const [main, syns] of Object.entries(synonyms)) {
      if (syns.includes(keyword) || main === keyword) {
        expanded.add(main);
        syns.forEach(s => expanded.add(s));
      }
    }
  }

  return Array.from(expanded);
}

// Extract keywords from user input
function extractKeywords(input: string): string[] {
  const text = input.toLowerCase();

  // Remove common stop words
  const stopWords = new Set([
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "must", "can", "need", "want", "please",
    "make", "create", "build", "write", "generate", "give", "show", "me",
    "i", "you", "we", "they", "it", "this", "that", "with", "for", "to",
    "of", "in", "on", "at", "by", "from", "how", "what", "which", "some",
    "just", "like", "also", "really", "very", "nice", "good", "great",
    "cool", "awesome", "amazing", "beautiful", "pretty", "looking"
  ]);

  // Extract words
  const words = text
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(word => word.length > 1 && !stopWords.has(word));

  // Get unique words
  const unique = Array.from(new Set(words));

  // Expand with synonyms
  return expandKeywords(unique);
}

// Calculate match score with fuzzy matching
function calculateMatchScore(userKeywords: string[], template: CodeTemplate): number {
  if (userKeywords.length === 0) return 0;

  let totalScore = 0;
  let matchedKeywords = 0;

  for (const userWord of userKeywords) {
    let bestMatchScore = 0;

    for (const templateWord of template.keywords) {
      // Exact match
      if (templateWord === userWord) {
        bestMatchScore = 1;
        break;
      }

      // Contains match
      if (templateWord.includes(userWord) || userWord.includes(templateWord)) {
        const similarity = Math.min(userWord.length, templateWord.length) /
                          Math.max(userWord.length, templateWord.length);
        bestMatchScore = Math.max(bestMatchScore, 0.7 * similarity + 0.3);
      }

      // Levenshtein-based fuzzy match for typos
      const distance = levenshteinDistance(userWord, templateWord);
      const maxLen = Math.max(userWord.length, templateWord.length);
      const fuzzyScore = 1 - (distance / maxLen);

      if (fuzzyScore > 0.7) {
        bestMatchScore = Math.max(bestMatchScore, fuzzyScore * 0.8);
      }
    }

    if (bestMatchScore > 0) {
      totalScore += bestMatchScore;
      matchedKeywords++;
    }
  }

  // Weighted score: considers both coverage and match quality
  const coverage = matchedKeywords / userKeywords.length;
  const quality = matchedKeywords > 0 ? totalScore / matchedKeywords : 0;

  return coverage * 0.6 + quality * 0.4;
}

// Simple Levenshtein distance for typo tolerance
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[b.length][a.length];
}

// Capitalize first letter of each word
function capitalizeWords(str: string): string {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

// Clean and simplify complex input to extract core request
function simplifyInput(input: string): string {
  // Remove markdown formatting
  let simplified = input
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '') // Remove markdown links
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '') // Remove markdown images
    .replace(/#{1,6}\s*/g, '') // Remove headers
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
    .replace(/\*([^*]+)\*/g, '$1') // Remove italics
    .replace(/`([^`]+)`/g, '$1') // Remove inline code
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/[-•]\s+/g, ' ') // Remove bullet points
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim();

  // If input is very long, focus on the first sentence or key phrase
  if (simplified.length > 200) {
    // Try to extract the core request from the beginning
    const firstSentence = simplified.match(/^[^.!?]+[.!?]?/);
    if (firstSentence) {
      simplified = firstSentence[0];
    } else {
      simplified = simplified.slice(0, 200);
    }
  }

  return simplified;
}

// Extract the product/brand name from complex input
function extractProductName(input: string): string | null {
  const lowerInput = input.toLowerCase();

  // Common patterns for product names
  const patterns = [
    // "landing page for ProductName" or "for # ProductName"
    /(?:for|of)\s+#?\s*([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)*)/,
    // "ProductName landing page" or "ProductName Security Platform"
    /^#?\s*([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)*)\s+(?:landing|page|platform|security|app)/i,
    // Quoted names
    /"([^"]+)"/,
    // After "called" or "named"
    /(?:called|named)\s+["']?([A-Za-z][A-Za-z0-9\s]+?)["']?(?:\s|$)/i,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match && match[1]) {
      const name = match[1].trim();
      // Skip generic words
      const skipWords = ["a", "an", "the", "my", "our", "your", "this", "that", "landing", "page", "website", "site", "app"];
      if (!skipWords.includes(name.toLowerCase()) && name.length > 1) {
        return name;
      }
    }
  }

  // Try to find capitalized product names (like "SecureWatch", "CodeAI")
  const capitalizedMatch = input.match(/\b([A-Z][a-z]+[A-Z][a-zA-Z]*)\b/);
  if (capitalizedMatch) {
    return capitalizedMatch[1];
  }

  return null;
}

// Extract key features mentioned in the input
function extractFeatures(input: string): string[] {
  const features: string[] = [];
  const lowerInput = input.toLowerCase();

  // Security-related features
  if (lowerInput.includes('security') || lowerInput.includes('secure')) features.push('Security');
  if (lowerInput.includes('siem')) features.push('SIEM');
  if (lowerInput.includes('vapt') || lowerInput.includes('vulnerability')) features.push('Vulnerability Testing');
  if (lowerInput.includes('compliance')) features.push('Compliance');
  if (lowerInput.includes('monitoring')) features.push('Monitoring');
  if (lowerInput.includes('ai') || lowerInput.includes('artificial intelligence')) features.push('AI-Powered');
  if (lowerInput.includes('analytics')) features.push('Analytics');
  if (lowerInput.includes('automation') || lowerInput.includes('automated')) features.push('Automation');
  if (lowerInput.includes('enterprise')) features.push('Enterprise');
  if (lowerInput.includes('real-time') || lowerInput.includes('realtime')) features.push('Real-Time');

  return features.slice(0, 3); // Limit to 3 features
}

// Extract parameters from user input
function extractParams(input: string): Record<string, string> {
  const params: Record<string, string> = {};

  // Simplify complex input first
  const simplified = simplifyInput(input);

  // Extract product/brand name
  const productName = extractProductName(input) || extractProductName(simplified);
  if (productName) {
    params.title = productName;
  }

  // Extract quoted strings as potential titles (if no product name found)
  if (!params.title) {
    const quotedMatch = input.match(/"([^"]+)"/);
    if (quotedMatch) {
      params.title = quotedMatch[1];
    }
  }

  // Extract features for description
  const features = extractFeatures(input);
  if (features.length > 0) {
    params.features = features.join(', ');
    if (!params.description) {
      params.description = `${features.join(' • ')} solutions for your business`;
    }
  }

  // Extract URL if present
  const urlMatch = input.match(/(https?:\/\/[^\s]+)/);
  if (urlMatch) {
    params.url = urlMatch[1];
  }

  return params;
}

// Explicit template type keywords - these should take priority when mentioned
const explicitTemplateTypes: Record<string, string[]> = {
  "html-counter": ["counter", "counter app", "increment", "decrement", "clicker", "click counter", "number counter", "count up", "count down", "tally", "incrementer"],
  "html-landing": ["landing", "landing page", "landingpage", "homepage", "home page", "hero", "startup page", "saas page", "marketing page", "website for"],
  "html-dashboard": ["dashboard", "admin panel", "analytics dashboard", "admin dashboard", "erp", "enterprise resource", "crm", "inventory", "management system", "admin system", "back office", "backoffice", "control panel"],
  "html-form": ["form", "contact form", "signup form", "login form", "registration form", "subscribe form"],
  "html-card-grid": ["card grid", "cards", "portfolio", "gallery", "product grid", "product list"],
  "html-navbar": ["navbar", "navigation", "header", "menu bar", "nav bar"],
  "js-todo-app": ["todo", "todo app", "task list", "checklist"],
  "react-form": ["react form", "react component form"],
  "react-modal": ["modal", "popup", "dialog"],
};

// Find the best matching template using:
// 1. Learning Module (remembers what worked)
// 2. Sage Knowledge Base (understands concepts)
// 3. WebApp Knowledge (knows how to build apps)
function findBestTemplate(input: string): { template: CodeTemplate; score: number } | null {
  // STEP 1: Check Learning Module first (learned patterns have priority)
  const learningResult = intelligentParse(input);
  if (learningResult.suggestedSolution && learningResult.confidence > 0.5) {
    const learnedTemplate = allTemplates.find(t => t.id === learningResult.suggestedSolution);
    if (learnedTemplate) {
      // Reinforce the pattern that matched
      if (learningResult.matchedPatterns.length > 0) {
        getLearningEngine().reinforce(learningResult.matchedPatterns[0].id);
      }
      return { template: learnedTemplate, score: learningResult.confidence };
    }
  }

  // Use corrected spelling from learning module
  const correctedInput = learningResult.corrected;

  // STEP 2: Use Sage Knowledge Base to understand the request
  const intent = understandRequest(correctedInput);

  // If we have a confident understanding, use it
  if (intent.confidence > 0.2) {
    const matchedTemplate = allTemplates.find(t => t.id === intent.template);
    if (matchedTemplate) {
      return { template: matchedTemplate, score: intent.confidence };
    }
  }

  // STEP 3: Check WebApp Knowledge for stack recommendations
  const stackRecs = getStackRecommendation(correctedInput);
  if (stackRecs.length > 0) {
    const stack = techStacks[stackRecs[0]];
    if (stack) {
      // Map stack to template
      const stackTemplateMap: Record<string, string> = {
        "interactive-dashboard": "html-dashboard",
        "spa-vanilla": "html-dashboard",
        "ecommerce-frontend": "html-card-grid",
        "form-heavy-app": "html-form",
        "vanilla-fullstack": "html-landing",
        "vanilla-with-api": "html-landing"
      };
      const templateId = stackTemplateMap[stack.id];
      if (templateId) {
        const stackTemplate = allTemplates.find(t => t.id === templateId);
        if (stackTemplate) {
          return { template: stackTemplate, score: 0.7 };
        }
      }
    }
  }

  // Simplify complex input for fallback matching
  const simplified = simplifyInput(correctedInput);
  const lowerInput = correctedInput.toLowerCase();
  const lowerSimplified = simplified.toLowerCase();

  // Check explicit template type keywords
  for (const [templateId, typeKeywords] of Object.entries(explicitTemplateTypes)) {
    for (const typeKeyword of typeKeywords) {
      if (lowerInput.includes(typeKeyword) || lowerSimplified.includes(typeKeyword)) {
        const explicitTemplate = allTemplates.find(t => t.id === templateId);
        if (explicitTemplate) {
          return { template: explicitTemplate, score: 1.0 };
        }
      }
    }
  }

  // Extract keywords from simplified input for keyword matching
  const keywords = extractKeywords(simplified);

  if (keywords.length === 0) {
    const originalKeywords = extractKeywords(correctedInput);
    if (originalKeywords.length === 0) {
      // Default to landing page for complex inputs
      const landingTemplate = allTemplates.find(t => t.id === "html-landing");
      if (landingTemplate) {
        return { template: landingTemplate, score: 0.5 };
      }
      return null;
    }
  }

  // Keyword-based matching as fallback
  let bestTemplate: CodeTemplate | null = null;
  let bestScore = 0;

  for (const template of allTemplates) {
    const score = calculateMatchScore(keywords, template);
    if (score > bestScore) {
      bestScore = score;
      bestTemplate = template;
    }
  }

  if (bestTemplate && bestScore > 0.08) {
    return { template: bestTemplate, score: bestScore };
  }

  // Default to landing page if we have a product name
  const productName = extractProductName(correctedInput);
  if (productName) {
    const landingTemplate = allTemplates.find(t => t.id === "html-landing");
    if (landingTemplate) {
      return { template: landingTemplate, score: 0.5 };
    }
  }

  return null;
}

// Generate multiple code suggestions
function generateMultipleSuggestions(input: string, limit: number = 3): GenerationResult[] {
  const keywords = extractKeywords(input);
  const params = extractParams(input);

  if (keywords.length === 0) {
    return [];
  }

  // Score all templates
  const scored = allTemplates
    .map(template => ({
      template,
      score: calculateMatchScore(keywords, template)
    }))
    .filter(item => item.score > 0.08)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(({ template, score }) => ({
    code: template.generate(params),
    language: template.language,
    templateName: template.name,
    confidence: Math.round(score * 100)
  }));
}

// Detect debug/fix requests
function isDebugRequest(input: string): boolean {
  const lower = input.toLowerCase();
  return [
    "debug", "fix", "error", "not working", "doesn't work", "broken",
    "help me fix", "what's wrong", "issue", "bug", "problem",
    "check my code", "analyze", "why isn't", "why is it"
  ].some(t => lower.includes(t));
}

// Detect explanation requests (excluding creation requests)
function isExplainRequest(input: string): boolean {
  const lower = input.toLowerCase();

  // Exclude creation requests - these should generate code, not explain
  const creationPatterns = [
    "create", "build", "make", "generate", "develop", "code",
    "implement", "add", "write", "set up", "setup"
  ];
  if (creationPatterns.some(p => lower.includes(p))) {
    return false;
  }

  // Only trigger for pure explanation requests
  return [
    "explain this", "how does this work", "what does this mean",
    "tell me about", "teach me about", "what is a", "what are",
    "why does this", "understand this", "learn about",
    "walk me through this", "break down this", "describe this"
  ].some(t => lower.includes(t));
}

// Detect creative/novel problem solving requests
function isCreativeRequest(input: string): boolean {
  const lower = input.toLowerCase();
  return [
    "creative", "novel", "unique", "innovative", "best way",
    "optimal", "efficient", "clever", "smart way", "elegant",
    "alternative", "different approach", "how would you"
  ].some(t => lower.includes(t));
}

// Handle explanation requests with intelligence
function handleExplainRequest(input: string): string {
  const lower = input.toLowerCase();

  const conceptMatches = [
    { pattern: /react/i, topic: 'react' },
    { pattern: /hook/i, topic: 'hooks' },
    { pattern: /state/i, topic: 'state' },
    { pattern: /async|await|promise/i, topic: 'async' },
    { pattern: /api|fetch|request/i, topic: 'api' },
    { pattern: /component/i, topic: 'react' },
    { pattern: /css|style/i, topic: 'styling' },
    { pattern: /database|sql/i, topic: 'database' },
    { pattern: /auth|login/i, topic: 'authentication' },
  ];

  for (const { pattern, topic } of conceptMatches) {
    if (pattern.test(lower)) {
      return teachConcept(topic);
    }
  }

  const codeMatch = input.match(/```[\s\S]*?```/);
  if (codeMatch) {
    const code = codeMatch[0].replace(/```\w*\n?/g, '').replace(/```/g, '');
    const explanation = explainCode(code);

    let response = `## Code Explanation\n\n`;
    response += `**Summary:** ${explanation.summary}\n\n`;

    if (explanation.lineByLine.length > 0) {
      response += `### Line by Line\n\n`;
      for (const line of explanation.lineByLine.slice(0, 10)) {
        response += `- \`${line.lines}\`: ${line.explanation}\n`;
      }
      response += `\n`;
    }

    if (explanation.concepts.length > 0) {
      response += `### Key Concepts\n\n`;
      for (const concept of explanation.concepts) {
        response += `**${concept.name}**: ${concept.description}\n\n`;
      }
    }

    if (explanation.alternatives.length > 0) {
      response += `### Alternative Approaches\n\n`;
      for (const alt of explanation.alternatives) {
        response += `**${alt.approach}**: ${alt.tradeoff}\n`;
      }
    }

    return response;
  }

  return teachConcept('react');
}

// Handle creative problem solving
function handleCreativeRequest(input: string): string {
  const solutions = solveCreatively(input);

  if (solutions.length === 0) {
    return generateFallbackResponse(input);
  }

  let response = `## Creative Solutions\n\n`;
  response += `Here are ${solutions.length} approaches to solve this:\n\n`;

  for (let i = 0; i < solutions.length; i++) {
    const solution = solutions[i];
    response += `### Option ${i + 1}: ${solution.approach}\n\n`;
    response += `**Complexity:** ${solution.complexity} | **Novelty Score:** ${Math.round(solution.novelty * 100)}%\n\n`;

    response += `**Pros:**\n`;
    for (const pro of solution.pros) {
      response += `- ${pro}\n`;
    }

    response += `\n**Cons:**\n`;
    for (const con of solution.cons) {
      response += `- ${con}\n`;
    }

    response += `\n\`\`\`typescript\n${solution.implementation}\n\`\`\`\n\n`;
  }

  return response;
}

// Handle error analysis with intelligence
function handleErrorAnalysis(input: string, errorMessage: string): string {
  const analysis = analyzeError(errorMessage);

  let response = `## Error Analysis\n\n`;
  response += `**Error Type:** ${analysis.errorType}\n\n`;
  response += `**Root Cause:** ${analysis.rootCause}\n\n`;

  if (analysis.filePath) {
    response += `**Location:** ${analysis.filePath}`;
    if (analysis.lineNumber) response += `:${analysis.lineNumber}`;
    response += `\n\n`;
  }

  if (analysis.suggestedFixes.length > 0) {
    response += `### Suggested Fixes\n\n`;
    for (const fix of analysis.suggestedFixes) {
      response += `**${fix.description}** (${Math.round(fix.confidence * 100)}% confidence)\n`;
      response += `\`\`\`javascript\n${fix.code}\n\`\`\`\n\n`;
    }
  }

  response += `### Quick Fix\n\n`;
  response += `\`\`\`javascript\n${generateFix(analysis)}\n\`\`\`\n`;

  return response;
}

// Main generation function
export function generateCode(input: string): string {
  // STANDALONE SCRIPT: Detect non-web script/program requests (Python, Go, Rust, Node)
  // Must run FIRST before any other routing to catch script/program requests early
  const scriptDetection = detectStandaloneScript(input);
  if (scriptDetection.isScript) {
    const scriptApp = generateStandaloneScript(scriptDetection.language, scriptDetection.taskDescription, input);
    return formatScriptResponse(scriptApp, scriptDetection.language);
  }

  // ADVANCED NLU: Process input with full intelligence pipeline
  const intelligence = processWithIntelligence(input);
  const { intent: semanticIntent, decomposition } = intelligence;

  // AMBIGUITY HANDLING: If request is unclear, provide clarification
  if (semanticIntent.confidence < 0.4 && semanticIntent.ambiguities.length > 0) {
    const { clarifications, suggestions } = handleAmbiguousRequest(input);
    if (clarifications.length > 0) {
      let response = `## Need More Details\n\n`;
      response += `I want to help you, but I need a bit more information:\n\n`;
      for (const q of clarifications) {
        response += `- ${q}\n`;
      }
      if (suggestions.length > 0) {
        response += `\n**Quick options:**\n`;
        for (const s of suggestions) {
          response += `- ${s}\n`;
        }
      }
      response += `\n**Tip:** Try being more specific, like "create a todo app with React" or "build an ecommerce dashboard"`;
      return response;
    }
  }

  // REASONING: Show task breakdown for complex requests
  if (decomposition.tasks.length > 3 && decomposition.warnings.length > 0) {
    // Log warnings but continue with generation
    console.log('Task warnings:', decomposition.warnings);
  }

  // EXPLANATION: Handle requests for understanding code or concepts
  if (isExplainRequest(input) || semanticIntent.action === 'explain') {
    return handleExplainRequest(input);
  }

  // CREATIVE: Handle requests for innovative solutions
  if (isCreativeRequest(input)) {
    return handleCreativeRequest(input);
  }

  // ERROR ANALYSIS: Handle specific error messages
  const errorMatch = input.match(/error[:\s]+(.+?)(?:\n|$)/i);
  if ((errorMatch && isDebugRequest(input)) || semanticIntent.action === 'fix') {
    if (errorMatch) {
      return handleErrorAnalysis(input, errorMatch[1]);
    }
  }

  // PRO GENERATOR: Use smart multi-file React project generator for any coding request
  if (shouldUseProGenerator(input)) {
    try {
      const requirements = analyzePrompt(input);
      const project = generateProject(requirements, input);
      if (project.files.length > 0) {
        const validation = validateGeneratedCode(project.files.map(f => ({ path: f.path, content: f.content })));
        const fixedFiles = validation.fixedFiles.length > 0 ? validation.fixedFiles : project.files.map(f => ({ path: f.path, content: f.content }));
        const validatedProject = {
          ...project,
          files: fixedFiles.map(f => {
            const orig = project.files.find(o => o.path === f.path);
            return { ...f, language: orig?.language || 'text' };
          }),
        };
        let response = formatProjectResponse(validatedProject);
        if (validation.errors.length > 0) {
          response += `\n\n**Validation:** ${validation.errors.length} issue${validation.errors.length > 1 ? 's' : ''} auto-fixed before delivery.`;
        }
        return response;
      }
    } catch (e) {
      console.error('Pro generator failed, falling back:', e);
    }
  }

  // RUNNABLE TEMPLATES: Check for projects that can run in WebContainer
  const runnableProject = matchRunnableTemplate(input);
  if (runnableProject) {
    return formatRunnableProjectResponse(runnableProject);
  }

  // DEBUG: Analyze code for errors
  if (isDebugRequest(input)) {
    // Extract code from the input if present
    const codeMatch = input.match(/```[\w]*\n([\s\S]*?)\n```/);
    if (codeMatch) {
      const code = codeMatch[1];
      return debugCode(code);
    }

    // Return debug capabilities info
    return `🔍 **Debug Mode Active**

I can help you debug your code! Here's what I can do:

**Error Detection:**
• Syntax errors (missing brackets, quotes, colons)
• Runtime errors (undefined variables, null references)
• Logic issues (potential bugs, anti-patterns)
• Security vulnerabilities (SQL injection, XSS)

**How to use:**
1. Paste your code with \`\`\` code blocks
2. Share console error messages
3. Describe what's not working

**Example:**
\`\`\`
debug this:
\`\`\`python
def greet(name)
    print("Hello " + name)
\`\`\`
\`\`\`

**I'm also watching your code changes and learning from how you fix errors!**

${(() => {
  const stats = getDebugStats();
  if (stats.changesObserved > 0) {
    return `\n📊 **Debug Stats:**\n• Changes observed: ${stats.changesObserved}\n• Fixes learned: ${stats.fixesLearned}`;
  }
  return '';
})()}`;
  }

  // FULLY FUNCTIONAL: Generate complete multi-file application
  if (isFullyFunctionalRequest(input)) {
    const app = generateFullStackApp(input);
    return formatFullStackResponse(app);
  }

  const result = findBestTemplate(input);
  const params = extractParams(input);

  if (!result) {
    // Try code brain for intelligent from-scratch generation
    const intent = parseIntent(input);
    if (intent.complexity !== 'simple' || intent.hasBackend || intent.hasAuth) {
      const app = generateFromScratch(input);
      if (app.files.length > 0) {
        return formatGeneratedApp(app);
      }
    }
    return generateFallbackResponse(input);
  }

  const { template, score } = result;
  let code = template.generate(params);

  // CREATIVITY: Detect domain and customize output
  const requestIntent = understandRequest(input);
  const domain = detectDomain(requestIntent, input);

  // Customize the template for the detected domain
  if (domain !== "default" && template.language === "html") {
    code = customizeTemplate(code, domain);
  }

  // SMART ENHANCEMENT: Detect features and enhance template to AI-quality output
  const features = detectFeatures(input);
  const hasEnhancements = Object.values(features).some(v => v);

  if (template.language === "html") {
    // Always polish for better quality
    code = polishCode(code);

    // Apply smart enhancements if user requested specific features
    if (hasEnhancements) {
      code = enhanceTemplate({
        baseCode: code,
        userPrompt: input,
        templateType: template.id
      });
    }
  }

  // ========== AUTO-DEBUG WHILE CODING ==========
  // Test and fix code BEFORE returning it to user
  let debugInfo = '';
  if (template.language === 'html' || template.language === 'javascript' || template.language === 'css') {
    const testResult = quickTestAndFix(code);
    code = testResult.code; // Use the fixed code

    if (testResult.fixes.length > 0) {
      debugInfo = `\n\n✅ **Auto-debugged ${testResult.fixes.length} issue${testResult.fixes.length > 1 ? 's' : ''} while generating:**\n`;
      testResult.fixes.slice(0, 5).forEach(fix => {
        debugInfo += `• ${fix}\n`;
      });
      if (testResult.fixes.length > 5) {
        debugInfo += `• ...and ${testResult.fixes.length - 5} more\n`;
      }
    }
  }

  // Get domain-specific content for response
  if (domain !== "default" && template.language === "html") {
    const domainContent = getDomainContent(domain);

    // Format response with domain awareness
    let response = `Here's a **${domainContent.title}** for you:\n\n`;
    response += "```" + template.language + "\n";
    response += code;
    response += "\n```\n\n";

    // Domain-specific tips
    response += `**Pro tips:** This ${domain.toUpperCase()} dashboard includes:\n`;
    domainContent.features.slice(0, 4).forEach(feature => {
      response += `• ${feature}\n`;
    });
    response += "\nCustomize the stats, navigation, and charts for your needs!";
    response += debugInfo;

    return response;
  }

  // Standard response for non-customized templates
  let response = `Here's a **${template.name}** for you:\n\n`;
  response += "```" + template.language + "\n";
  response += code;
  response += "\n```\n\n";

  // Show detected enhancements
  if (hasEnhancements && template.language === "html") {
    const enhancedFeatures: string[] = [];
    if (features.animations) enhancedFeatures.push('Smooth animations');
    if (features.darkMode) enhancedFeatures.push('Dark/light mode toggle');
    if (features.glassmorphism) enhancedFeatures.push('Glassmorphism effects');
    if (features.gradients) enhancedFeatures.push('Gradient styling');
    if (features.pricing) enhancedFeatures.push('Pricing section');
    if (features.testimonials || features.socialProof) enhancedFeatures.push('Testimonials section');
    if (features.faq) enhancedFeatures.push('FAQ section');
    if (features.footer) enhancedFeatures.push('Full footer');
    if (features.notifications) enhancedFeatures.push('Toast notifications');
    if (features.modals) enhancedFeatures.push('Modal system');
    if (features.search) enhancedFeatures.push('Search functionality');

    if (enhancedFeatures.length > 0) {
      response += `✨ **Enhanced with:** ${enhancedFeatures.join(', ')}\n\n`;
    }
  }

  // Add helpful tips based on template type
  response += getTemplateTips(template.id);
  response += debugInfo;

  // Show other suggestions
  const alternatives = generateMultipleSuggestions(input, 4)
    .filter(r => r.templateName !== template.name);

  if (alternatives.length > 0) {
    response += "\n**Want more? I can also generate:**\n";
    alternatives.forEach(alt => {
      response += `• ${alt.templateName}\n`;
    });
    response += "\nJust ask!";
  }

  return response;
}

// Get helpful tips for each template type
function getTemplateTips(templateId: string): string {
  const tips: Record<string, string> = {
    "html-landing": "**Pro tips:** Click **Live Preview** to see it in action. The page is fully responsive and works on mobile!",
    "html-form": "**Pro tips:** The form includes client-side validation and a success animation. Click **Live Preview** to try it!",
    "html-card-grid": "**Pro tips:** The cards use CSS Grid for responsive layouts. Add more cards by copying the `<article class=\"card\">` block.",
    "html-navbar": "**Pro tips:** The navbar is sticky and has a blur effect. It collapses to a hamburger menu on mobile.",
    "html-dashboard": "**Pro tips:** The sidebar collapses on mobile. Customize the stats cards with your own data!",
    "js-fetch": "**Pro tips:** Use `api.get()`, `api.post()`, etc. All requests include error handling and proper headers.",
    "js-todo-app": "**Pro tips:** The todo app persists to localStorage! Your tasks will survive page refreshes.",
    "react-form": "**Pro tips:** The form has full validation, loading states, and a success message. Drop it into any React project!",
    "react-modal": "**Pro tips:** The modal traps focus, closes on Escape, and uses a portal for proper z-index handling.",
    "css-animations": "**Pro tips:** These animations respect `prefers-reduced-motion` for accessibility!",
  };

  return tips[templateId] || "**Pro tips:** Click **Live Preview** on HTML code to see it rendered!";
}

// Fallback when no template matches
function generateFallbackResponse(input: string): string {
  const keywords = extractKeywords(input);

  let response = "🚀 **I can build ANY full-stack application for you!**\n\n";

  response += "**Instant Templates (Built-in):**\n";
  response += "• Counter, Todo, Calculator, Weather, Chat\n";
  response += "• E-commerce Store with cart & checkout\n";
  response += "• Blog Platform with posts & comments\n";
  response += "• Analytics Dashboard with charts\n";
  response += "• Notes App with authentication\n";
  response += "• Kanban Board with drag-and-drop\n\n";

  response += "**🤖 AI-Powered Generation (Unlimited):**\n";
  response += "For complex or custom requests, I use GPT-5 to generate:\n";
  response += "• Complete Express.js backends with REST APIs\n";
  response += "• Full React/Vite frontends with styling\n";
  response += "• Database schemas and CRUD operations\n";
  response += "• Authentication and user management\n";
  response += "• Payment integration, real-time features\n";
  response += "• ANY custom application you describe!\n\n";

  response += "**Try saying:**\n";
  response += "• \"Build an e-commerce store\"\n";
  response += "• \"Create a blog with posts and comments\"\n";
  response += "• \"Make a project management dashboard\"\n";
  response += "• \"Build a booking system with calendar\"\n";
  response += "• \"Create a social media app with feed\"\n";
  response += "• \"Build a CRM with customer tracking\"\n";

  if (keywords.length > 0) {
    response += `\n\n*I understood: ${keywords.slice(0, 5).join(", ")}*`;
  }

  return response;
}

// Get list of available templates
export function getAvailableTemplates(): { category: string; templates: string[] }[] {
  return [
    {
      category: "HTML/Web Pages",
      templates: ["Landing Page", "Contact Form", "Card Grid", "Navigation Bar", "Dashboard"]
    },
    {
      category: "JavaScript",
      templates: ["Fetch API Wrapper", "LocalStorage Manager", "Debounce & Throttle", "Form Validation", "Todo App"]
    },
    {
      category: "React",
      templates: ["Counter Component", "Form with Validation", "Modal Dialog", "useFetch Hook"]
    },
    {
      category: "CSS",
      templates: ["Flexbox Layouts", "CSS Grid Patterns", "Animations & Transitions"]
    }
  ];
}

// Check if a request is about coding
export function isCodingRequest(input: string): boolean {
  const codingKeywords = [
    "code", "html", "css", "javascript", "js", "react", "component",
    "function", "page", "website", "webapp", "form", "button", "layout",
    "style", "create", "make", "build", "write", "generate", "show",
    "todo", "list", "card", "grid", "flex", "modal", "fetch", "api",
    "nav", "navbar", "header", "footer", "landing", "responsive",
    "template", "design", "dashboard", "admin", "animation", "hover",
    "app", "application", "site", "web", "frontend", "ui", "ux"
  ];

  const lowerInput = input.toLowerCase();
  return codingKeywords.some(keyword => lowerInput.includes(keyword));
}

// Export debug functions for UI components
export {
  debugCode,
  checkErrors,
  recordCodeChange,
  getDebugStats
};

// Re-export types
export type { CodeError } from "./debug-module";

// ==================== AUTO-TEST & SELF-FIX SYSTEM ====================

// Self-testing and fixing like the AI does
export interface SelfTestResult {
  originalCode: string;
  testedCode: string;
  wasFixed: boolean;
  fixesApplied: string[];
  errors: CodeError[];
  passed: boolean;
  report: string;
}

// COMPREHENSIVE Auto-fix - fixes ALL syntax errors proactively
function applyAutoFixes(code: string, errors: CodeError[]): { code: string; fixes: string[] } {
  let fixedCode = code;
  const fixes: string[] = [];

  const trackFix = (before: string, after: string, fixName: string) => {
    if (before !== after) {
      fixes.push(fixName);
      return true;
    }
    return false;
  };

  // ========== HTML SYNTAX FIXES ==========

  // 1. Add DOCTYPE if missing (only for actual HTML files, not React/JSX components)
  const looksLikeHtmlFile = /^\s*<(!doctype|html[\s>])/im.test(fixedCode) && !/(import\s+|export\s+(default\s+)?function|from\s+['"]react)/m.test(fixedCode);
  if (looksLikeHtmlFile && !fixedCode.trim().toLowerCase().startsWith('<!doctype')) {
    fixedCode = '<!DOCTYPE html>\n' + fixedCode;
    fixes.push('Added <!DOCTYPE html>');
  }

  // 2. Add lang to <html> if missing (only for actual HTML files)
  if (looksLikeHtmlFile && /<html(?![^>]*lang\s*=)[^>]*>/i.test(fixedCode)) {
    const before = fixedCode;
    fixedCode = fixedCode.replace(/<html(?![^>]*lang)([^>]*)>/gi, '<html lang="en"$1>');
    trackFix(before, fixedCode, 'Added lang="en" to <html>');
  }

  // 3. Add <head> if missing but has <html> (only for actual HTML files)
  if (looksLikeHtmlFile && fixedCode.includes('<html') && !fixedCode.includes('<head')) {
    fixedCode = fixedCode.replace(/<html([^>]*)>/i, '<html$1>\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>Page</title>\n</head>');
    fixes.push('Added missing <head> section');
  }

  // 4. Add viewport if missing
  if (fixedCode.includes('<head') && !fixedCode.includes('viewport')) {
    const before = fixedCode;
    fixedCode = fixedCode.replace(/<head([^>]*)>/i, '<head$1>\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">');
    trackFix(before, fixedCode, 'Added viewport meta tag');
  }

  // 5. Add charset if missing
  if (fixedCode.includes('<head') && !fixedCode.includes('charset')) {
    const before = fixedCode;
    fixedCode = fixedCode.replace(/<head([^>]*)>/i, '<head$1>\n    <meta charset="UTF-8">');
    trackFix(before, fixedCode, 'Added charset meta tag');
  }

  // 6. Add alt to all images
  const imgWithoutAlt = /<img(?![^>]*alt\s*=)([^>]*)>/gi;
  if (imgWithoutAlt.test(fixedCode)) {
    const before = fixedCode;
    fixedCode = fixedCode.replace(/<img(?![^>]*alt\s*=)([^>]*)>/gi, '<img$1 alt="">');
    trackFix(before, fixedCode, 'Added alt="" to images');
  }

  // 7. Fix unclosed tags (case-sensitive to avoid converting React components like <Link> to <link>)
  const selfClosingTags = ['br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'param', 'source', 'track', 'wbr'];
  for (const tag of selfClosingTags) {
    const regex = new RegExp(`<${tag}([^>]*[^/])>`, 'g');
    if (regex.test(fixedCode)) {
      const before = fixedCode;
      fixedCode = fixedCode.replace(new RegExp(`<${tag}([^>]*[^/])>`, 'g'), `<${tag}$1>`);
    }
  }

  // 8. Fix empty href="#" - add proper anchor
  if (fixedCode.includes('href="#"') && fixedCode.includes('<a')) {
    const before = fixedCode;
    fixedCode = fixedCode.replace(/href="#"(?=[^>]*>)/g, 'href="#" role="button"');
    // Don't add duplicate role
    fixedCode = fixedCode.replace(/role="button"\s+role="button"/g, 'role="button"');
    trackFix(before, fixedCode, 'Added role="button" to anchor links');
  }

  // 9. Fix missing closing </body> or </html>
  if (fixedCode.includes('<body') && !fixedCode.includes('</body>')) {
    fixedCode = fixedCode + '\n</body>';
    fixes.push('Added missing </body>');
  }
  if (fixedCode.includes('<html') && !fixedCode.includes('</html>')) {
    fixedCode = fixedCode + '\n</html>';
    fixes.push('Added missing </html>');
  }

  // ========== JAVASCRIPT SYNTAX FIXES ==========

  // 10. Fix var to const/let
  if (/\bvar\s+\w+\s*=/.test(fixedCode)) {
    const before = fixedCode;
    fixedCode = fixedCode.replace(/\bvar\s+(\w+)\s*=/g, 'const $1 =');
    trackFix(before, fixedCode, 'Changed var to const');
  }

  // 11. Fix == to === (but not !== or ===)
  if (/[^!=]={2}(?!=)/.test(fixedCode)) {
    const before = fixedCode;
    fixedCode = fixedCode.replace(/([^!=])={2}(?!=)/g, '$1===');
    trackFix(before, fixedCode, 'Changed == to ===');
  }

  // 12. Fix != to !== (but not !==)
  if (/!={1}(?!=)/.test(fixedCode)) {
    const before = fixedCode;
    fixedCode = fixedCode.replace(/([^!])!={1}(?!=)/g, '$1!==');
    trackFix(before, fixedCode, 'Changed != to !==');
  }

  // 13. Fix missing semicolons at end of statements
  const jsLines = fixedCode.split('\n');
  let fixedSemicolons = false;
  for (let i = 0; i < jsLines.length; i++) {
    const line = jsLines[i].trim();
    if (!line || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) continue;
    if (line.startsWith('import ') || line.startsWith('import{') || line.startsWith('export ')) continue;
    if (/^\}\s*from\s+['"]/.test(line)) continue;
    if (line.endsWith(';') || line.endsWith('{') || line.endsWith('}') || line.endsWith(',') || line.endsWith(':')) continue;
    if (line.endsWith(')') && !line.includes('=')) continue;
    if (line.endsWith('(') || line.endsWith('[') || line.endsWith('=>') || line.endsWith('&&') || line.endsWith('||') || line.endsWith('?') || line.endsWith('+') || line.endsWith('-') || line.endsWith('*') || line.endsWith('/') || line.endsWith('=') || line.endsWith('>') || line.endsWith('<') || line.endsWith('|') || line.endsWith('&')) continue;
    if (/^(const|let|var|return|throw|break|continue)\s/.test(line) && !line.endsWith(';')) {
      jsLines[i] = jsLines[i].trimEnd() + ';';
      fixedSemicolons = true;
    }
  }
  if (fixedSemicolons) {
    fixedCode = jsLines.join('\n');
    fixes.push('Added missing semicolons');
  }

  // 14. Fix unclosed strings (simple cases)
  const unclosedString = /(['"`])(?:[^\\]|\\.)*$/gm;
  // This is complex, handle carefully

  // 15. Fix unclosed parentheses (count open vs closed)
  const openParens = (fixedCode.match(/\(/g) || []).length;
  const closeParens = (fixedCode.match(/\)/g) || []).length;
  if (openParens > closeParens) {
    const diff = openParens - closeParens;
    fixedCode = fixedCode.trimEnd() + ')'.repeat(diff);
    fixes.push(`Added ${diff} missing closing parenthesis`);
  }

  // 16. Fix unclosed braces
  const openBraces = (fixedCode.match(/\{/g) || []).length;
  const closeBraces = (fixedCode.match(/\}/g) || []).length;
  if (openBraces > closeBraces) {
    const diff = openBraces - closeBraces;
    fixedCode = fixedCode.trimEnd() + '\n' + '}'.repeat(diff);
    fixes.push(`Added ${diff} missing closing brace`);
  }

  // 17. Fix unclosed brackets
  const openBrackets = (fixedCode.match(/\[/g) || []).length;
  const closeBrackets = (fixedCode.match(/\]/g) || []).length;
  if (openBrackets > closeBrackets) {
    const diff = openBrackets - closeBrackets;
    fixedCode = fixedCode.trimEnd() + ']'.repeat(diff);
    fixes.push(`Added ${diff} missing closing bracket`);
  }

  // 18. Fix innerHTML to textContent for text-only assignments
  if (/\.innerHTML\s*=\s*(['"`][^<>]*['"`])/.test(fixedCode)) {
    const before = fixedCode;
    fixedCode = fixedCode.replace(/\.innerHTML\s*=\s*(['"`][^<>]+['"`])/g, '.textContent = $1');
    trackFix(before, fixedCode, 'Changed innerHTML to textContent');
  }

  // 19. Fix document.write (bad practice)
  if (/document\.write\s*\(/.test(fixedCode)) {
    // Can't easily fix, but note it
  }

  // ========== CSS SYNTAX FIXES ==========

  // 20. Fix missing semicolons in CSS
  if (/<style|\.css/i.test(fixedCode)) {
    const before = fixedCode;
    // Add semicolon before closing brace if missing
    fixedCode = fixedCode.replace(/([a-z0-9%\)'"]+)\s*\}/gi, '$1;\n}');
    // Clean up double semicolons
    fixedCode = fixedCode.replace(/;+\s*;/g, ';');
    fixedCode = fixedCode.replace(/;\s*\}/g, ';\n}');
    trackFix(before, fixedCode, 'Fixed CSS semicolons');
  }

  // 21. Fix unclosed CSS braces
  const cssMatch = fixedCode.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
  if (cssMatch) {
    for (const css of cssMatch) {
      const openB = (css.match(/\{/g) || []).length;
      const closeB = (css.match(/\}/g) || []).length;
      if (openB > closeB) {
        const diff = openB - closeB;
        const fixedCss = css.replace(/<\/style>/i, '}'.repeat(diff) + '\n</style>');
        fixedCode = fixedCode.replace(css, fixedCss);
        fixes.push('Fixed unclosed CSS braces');
      }
    }
  }

  // ========== SECURITY FIXES ==========

  // 22. Remove eval() calls
  if (/\beval\s*\(/.test(fixedCode)) {
    const before = fixedCode;
    fixedCode = fixedCode.replace(/\beval\s*\([^)]*\)/g, '/* eval removed for security */');
    trackFix(before, fixedCode, 'Removed unsafe eval()');
  }

  // 23. Fix onclick with javascript:
  if (/onclick\s*=\s*["']javascript:/i.test(fixedCode)) {
    const before = fixedCode;
    fixedCode = fixedCode.replace(/onclick\s*=\s*["']javascript:([^"']+)["']/gi, 'onclick="$1"');
    trackFix(before, fixedCode, 'Cleaned onclick javascript: prefix');
  }

  // ========== ACCESSIBILITY FIXES ==========

  // 24. Add type="button" to lowercase <button> tags without type (skip React <Button> components)
  if (/<button(?![^>]*type\s*=)[^>]*>/.test(fixedCode)) {
    const before = fixedCode;
    fixedCode = fixedCode.replace(/<button(?![^>]*type\s*=)([^>]*)>/g, '<button type="button"$1>');
    trackFix(before, fixedCode, 'Added type="button" to buttons');
  }

  // 25. Add aria-label to icon-only buttons
  if (/<button[^>]*>(\s*<(svg|i|span)[^>]*>[^<]*<\/(svg|i|span)>\s*)<\/button>/gi.test(fixedCode)) {
    const before = fixedCode;
    fixedCode = fixedCode.replace(/<button(?![^>]*aria-label)([^>]*)>(\s*<(svg|i|span)[^>]*>)/gi, '<button$1 aria-label="button">$2');
    trackFix(before, fixedCode, 'Added aria-label to icon buttons');
  }

  return { code: fixedCode, fixes };
}

// Main self-test function - tests generated code and fixes issues automatically
export async function selfTestAndFix(code: string, language: string = 'html'): Promise<SelfTestResult> {
  const originalCode = code;
  let currentCode = code;
  let allFixes: string[] = [];
  let iteration = 0;
  const maxIterations = 3;

  while (iteration < maxIterations) {
    iteration++;

    // Check for errors
    const errors = checkErrors(currentCode);

    // Filter to fixable errors
    const fixableErrors = errors.filter(e =>
      e.severity === 'error' || e.severity === 'warning'
    );

    if (fixableErrors.length === 0) {
      // All good!
      break;
    }

    // Apply auto-fixes
    const { code: fixedCode, fixes } = applyAutoFixes(currentCode, fixableErrors);

    if (fixedCode === currentCode) {
      // No more fixes possible
      break;
    }

    currentCode = fixedCode;
    allFixes = [...allFixes, ...fixes];
  }

  // Final check
  const finalErrors = checkErrors(currentCode);
  const criticalErrors = finalErrors.filter(e => e.severity === 'error');

  // Generate report
  let report = '';
  if (allFixes.length > 0) {
    report = `🔧 **Auto-Fixed ${allFixes.length} issue${allFixes.length > 1 ? 's' : ''}:**\n`;
    allFixes.forEach(fix => {
      report += `✓ ${fix}\n`;
    });
    report += '\n';
  }

  if (criticalErrors.length > 0) {
    report += `⚠️ **${criticalErrors.length} issue${criticalErrors.length > 1 ? 's' : ''} need manual review:**\n`;
    criticalErrors.slice(0, 3).forEach(err => {
      report += `• ${err.message}\n`;
    });
  } else {
    report += '✅ **Code passed all tests!**\n';
  }

  return {
    originalCode,
    testedCode: currentCode,
    wasFixed: allFixes.length > 0,
    fixesApplied: allFixes,
    errors: finalErrors,
    passed: criticalErrors.length === 0,
    report
  };
}

// Synchronous quick validation and fix - LOOPS UNTIL NO ERRORS LEFT
export function quickTestAndFix(code: string): { code: string; fixes: string[]; report: string } {
  let currentCode = code;
  const allFixes: string[] = [];
  let iteration = 0;
  const maxIterations = 10; // Keep trying until clean

  while (iteration < maxIterations) {
    iteration++;

    // Check for errors
    const errors = checkErrors(currentCode);

    // Apply fixes (both error-driven and proactive)
    const { code: fixedCode, fixes } = applyAutoFixes(currentCode, errors);

    // Track all fixes
    allFixes.push(...fixes);

    // If no changes were made, we're done
    if (fixedCode === currentCode) {
      break;
    }

    currentCode = fixedCode;
  }

  // Final error check
  const remainingErrors = checkErrors(currentCode);
  const criticalErrors = remainingErrors.filter(e => e.severity === 'error');

  // Build report
  let report = '';
  if (allFixes.length > 0) {
    report = `Auto-fixed ${allFixes.length} issues in ${iteration} pass${iteration > 1 ? 'es' : ''}`;
  }
  if (criticalErrors.length > 0) {
    report += ` | ${criticalErrors.length} issues remain`;
  } else if (allFixes.length > 0) {
    report += ' | Code is clean!';
  }

  return { code: currentCode, fixes: allFixes, report };
}

// Try to fix runtime errors automatically
export function tryFixRuntimeError(code: string, errorMessage: string): { fixed: boolean; code: string; fixDescription: string } {
  let fixedCode = code;
  let fixDescription = '';

  const lowerError = errorMessage.toLowerCase();

  // Common runtime error patterns and their fixes

  // 1. "X is not defined" - missing variable/function
  const notDefinedMatch = errorMessage.match(/(\w+) is not defined/i);
  if (notDefinedMatch) {
    const varName = notDefinedMatch[1];

    // Check if it's a common missing element reference
    if (varName === 'document' || varName === 'window') {
      // Code might be running before DOM is ready
      if (!code.includes('DOMContentLoaded')) {
        fixedCode = code.replace(
          /<script([^>]*)>/gi,
          `<script$1>\ndocument.addEventListener('DOMContentLoaded', function() {`
        );
        fixedCode = fixedCode.replace(
          /<\/script>/gi,
          `});\n</script>`
        );
        return { fixed: true, code: fixedCode, fixDescription: 'Wrapped in DOMContentLoaded' };
      }
    }

    // Check if it's a querySelector that returns null
    if (['querySelector', 'getElementById', 'getElementsByClassName'].some(m => code.includes(m))) {
      // Add null checks
      const selectorPattern = new RegExp(`(const|let|var)\\s+${varName}\\s*=\\s*(document\\.[^;]+);`, 'g');
      if (selectorPattern.test(code)) {
        fixedCode = code.replace(selectorPattern, `$1 ${varName} = $2;\nif (!${varName}) console.warn('Element not found: ${varName}');`);
        return { fixed: true, code: fixedCode, fixDescription: `Added null check for ${varName}` };
      }
    }
  }

  // 2. "Cannot read property 'X' of null/undefined"
  if (lowerError.includes('cannot read property') || lowerError.includes('cannot read properties')) {
    // This usually means an element wasn't found
    // Wrap querySelector calls in null checks
    const patterns = [
      /(\w+)\.addEventListener\(/g,
      /(\w+)\.classList\./g,
      /(\w+)\.style\./g,
      /(\w+)\.innerHTML/g,
      /(\w+)\.textContent/g,
    ];

    for (const pattern of patterns) {
      if (pattern.test(code)) {
        // Add optional chaining
        fixedCode = code.replace(pattern, '$1?.$&'.replace('$&', ''));
        if (fixedCode !== code) {
          return { fixed: true, code: fixedCode, fixDescription: 'Added optional chaining for null safety' };
        }
      }
    }

    // Try wrapping in DOMContentLoaded
    if (!code.includes('DOMContentLoaded') && code.includes('<script')) {
      fixedCode = code.replace(
        /(<script[^>]*>)([\s\S]*?)(<\/script>)/gi,
        '$1\ndocument.addEventListener("DOMContentLoaded", function() {\n$2\n});\n$3'
      );
      return { fixed: true, code: fixedCode, fixDescription: 'Wrapped scripts in DOMContentLoaded' };
    }
  }

  // 3. "Unexpected token" / "SyntaxError"
  if (lowerError.includes('unexpected token') || lowerError.includes('syntaxerror')) {
    // Run the comprehensive syntax fixer
    const result = quickTestAndFix(code);
    if (result.fixes.length > 0) {
      return { fixed: true, code: result.code, fixDescription: result.fixes.join(', ') };
    }
  }

  // 4. "X is not a function"
  if (lowerError.includes('is not a function')) {
    const funcMatch = errorMessage.match(/(\w+) is not a function/i);
    if (funcMatch) {
      const funcName = funcMatch[1];
      // Check if it's being called on wrong type
      if (code.includes(`${funcName}(`)) {
        // Could be calling method on wrong object
        fixDescription = `Check that ${funcName} is properly defined`;
      }
    }
  }

  // 5. "Maximum call stack size exceeded" - infinite recursion
  if (lowerError.includes('call stack') || lowerError.includes('stack size')) {
    // Look for obvious recursion issues
    const funcPattern = /function\s+(\w+)\s*\([^)]*\)\s*\{[^}]*\1\s*\(/g;
    if (funcPattern.test(code)) {
      fixDescription = 'Possible infinite recursion detected';
      // Can't auto-fix easily, but note it
    }
  }

  // 6. Event listener errors
  if (lowerError.includes('addeventlistener')) {
    // Make sure elements exist before adding listeners
    if (!code.includes('DOMContentLoaded')) {
      fixedCode = code.replace(
        /(<script[^>]*>)([\s\S]*?)(<\/script>)/gi,
        '$1\nwindow.addEventListener("DOMContentLoaded", function() {\n$2\n});\n$3'
      );
      return { fixed: true, code: fixedCode, fixDescription: 'Wrapped in DOMContentLoaded for event listeners' };
    }
  }

  // 7. "Failed to execute" errors
  if (lowerError.includes('failed to execute')) {
    // Often invalid selector or parameter
    // Try to clean up selectors
    const badSelectors = code.match(/querySelector\(['"]([^'"]+)['"]\)/g);
    if (badSelectors) {
      for (const selector of badSelectors) {
        // Check for common issues like spaces, special chars
        if (selector.includes('  ') || selector.match(/[<>]/)) {
          const cleanedSelector = selector.replace(/\s+/g, ' ').replace(/[<>]/g, '');
          fixedCode = code.replace(selector, cleanedSelector);
          if (fixedCode !== code) {
            return { fixed: true, code: fixedCode, fixDescription: 'Fixed invalid selector' };
          }
        }
      }
    }
  }

  return { fixed: false, code, fixDescription };
}

// Export auto-tester functions
export { testCode, validateCode, generateTestReport };
export type { TestResult } from "./auto-tester";
