// AI-Powered Unlimited Full-Stack Code Generator
// Uses GPT-5 to dynamically generate ANY full-stack application

export interface GeneratedProject {
  name: string;
  description: string;
  files: {
    path: string;
    content: string;
    language: string;
  }[];
  dependencies: string[];
  instructions: string;
}

export interface GenerationProgress {
  stage: 'analyzing' | 'planning' | 'generating' | 'complete' | 'error';
  message: string;
  progress: number;
}

// Generate a complete full-stack application from any description
export async function generateFullStackApp(
  prompt: string,
  conversationId: number,
  onProgress?: (progress: GenerationProgress) => void
): Promise<GeneratedProject> {

  onProgress?.({ stage: 'analyzing', message: 'Analyzing your request...', progress: 10 });

  const response = await fetch('/api/generate-fullstack', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, conversationId })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to generate project');
  }

  // Handle streaming response
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response stream');

  const decoder = new TextDecoder();
  let fullContent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'progress') {
            onProgress?.(data.progress);
          } else if (data.type === 'content') {
            fullContent += data.content;
          } else if (data.type === 'complete') {
            return data.project;
          } else if (data.type === 'error') {
            throw new Error(data.message);
          }
        } catch (e) {
          // Continue on parse errors
        }
      }
    }
  }

  throw new Error('Stream ended without completion');
}

// Quick generation without streaming (for simpler UX)
export async function generateFullStackAppSync(
  prompt: string,
  conversationId: number
): Promise<GeneratedProject> {
  const response = await fetch('/api/generate-fullstack-sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, conversationId })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to generate project');
  }

  return response.json();
}

// Check if a prompt should use AI generation vs templates
export function shouldUseAIGeneration(prompt: string): boolean {
  const lower = prompt.toLowerCase();

  // Complex indicators that need AI
  const complexIndicators = [
    'database', 'postgres', 'mysql', 'mongodb', 'sqlite',
    'authentication', 'auth', 'login', 'signup', 'oauth',
    'payment', 'stripe', 'subscription', 'billing',
    'real-time', 'websocket', 'socket', 'live',
    'api', 'rest', 'graphql', 'endpoint',
    'dashboard', 'admin panel', 'cms',
    'e-commerce', 'store', 'shop', 'marketplace',
    'social', 'feed', 'timeline', 'followers',
    'booking', 'reservation', 'scheduling',
    'file upload', 'image', 'video', 'media',
    'notification', 'email', 'sms',
    'analytics', 'tracking', 'metrics',
    'multi-user', 'teams', 'collaboration',
    'ai', 'machine learning', 'chatbot', 'gpt'
  ];

  // If prompt mentions complex features, use AI
  return complexIndicators.some(indicator => lower.includes(indicator));
}