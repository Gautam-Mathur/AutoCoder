// Local LLM Client - Uses Ollama or compatible local models
// This is FREE and runs locally without API costs

import {
  ENHANCED_CODE_SYSTEM_PROMPT,
  EDIT_CODE_PROMPT,
  FIX_CODE_PROMPT,
  UNDERSTAND_CODE_PROMPT
} from './llm-training-context';

export interface LocalLLMConfig {
  baseUrl: string;
  model: string;
  timeout: number;
}

export interface LocalLLMResponse {
  content: string;
  model: string;
  done: boolean;
}

// Default configuration - works with Ollama
const DEFAULT_CONFIG: LocalLLMConfig = {
  baseUrl: process.env.LOCAL_LLM_URL || 'http://localhost:11434',
  model: process.env.LOCAL_LLM_MODEL || 'codellama',
  timeout: 120000, // 2 minutes for code generation
};

// Check if local LLM is available
export async function isLocalLLMAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${DEFAULT_CONFIG.baseUrl}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 second timeout for health check
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Get available models from local LLM
export async function getAvailableModels(): Promise<string[]> {
  try {
    const response = await fetch(`${DEFAULT_CONFIG.baseUrl}/api/tags`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.models?.map((m: { name: string }) => m.name) || [];
  } catch {
    return [];
  }
}

// Generate code using local LLM (Ollama API)
export async function generateWithLocalLLM(
  prompt: string,
  systemPrompt: string,
  config: Partial<LocalLLMConfig> = {}
): Promise<string> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const response = await fetch(`${cfg.baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: cfg.model,
      prompt: `${systemPrompt}\n\nUser Request: ${prompt}`,
      stream: false,
      options: {
        temperature: 0.2, // Lower temperature for more consistent code
        num_ctx: 8192, // Context window for code
        stop: ['```\n\n', '---END---'],
      },
    }),
    signal: AbortSignal.timeout(cfg.timeout),
  });

  if (!response.ok) {
    throw new Error(`Local LLM error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.response || '';
}

// Extract JSON from potentially noisy LLM output
export function extractJSON(content: string): string | null {
  // Try to find JSON object in the content
  const jsonPatterns = [
    /```json\s*([\s\S]*?)```/,      // JSON in markdown code block
    /```\s*([\s\S]*?)```/,          // Any code block
    /(\{[\s\S]*\})/,                // Bare JSON object
  ];

  for (const pattern of jsonPatterns) {
    const match = content.match(pattern);
    if (match) {
      const candidate = match[1] || match[0];
      // Validate it's actually JSON
      try {
        JSON.parse(candidate);
        return candidate;
      } catch {
        // Try to find a valid JSON object within the candidate
        const nestedMatch = candidate.match(/(\{[\s\S]*\})/);
        if (nestedMatch) {
          try {
            JSON.parse(nestedMatch[1]);
            return nestedMatch[1];
          } catch {}
        }
      }
    }
  }

  // Last resort: try to parse the entire content
  try {
    JSON.parse(content);
    return content;
  } catch {
    return null;
  }
}

// Stream code generation from local LLM
export async function* streamWithLocalLLM(
  prompt: string,
  systemPrompt: string,
  config: Partial<LocalLLMConfig> = {}
): AsyncGenerator<string, void, unknown> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const response = await fetch(`${cfg.baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: cfg.model,
      prompt: `${systemPrompt}\n\nUser Request: ${prompt}`,
      stream: true,
      options: {
        temperature: 0.2,
        num_ctx: 8192,
      },
    }),
    signal: AbortSignal.timeout(cfg.timeout),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Local LLM error: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n').filter(line => line.trim());

    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        if (data.response) {
          yield data.response;
        }
      } catch {
        // Skip malformed JSON lines
      }
    }
  }
}

// Re-export for convenience
export { EDIT_CODE_PROMPT, FIX_CODE_PROMPT, UNDERSTAND_CODE_PROMPT };

// Main code generation prompt - uses enhanced training
export const LOCAL_CODE_SYSTEM_PROMPT = ENHANCED_CODE_SYSTEM_PROMPT;
