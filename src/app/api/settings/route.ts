import { NextRequest, NextResponse } from 'next/server';
import { getLLMConfig } from '@/lib/agents/inference';
import { getAuthenticatedSession } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export interface PublicLLMSettings {
  provider: string | null;
  ollamaHost: string | null;
  ollamaModel: string | null;
  openaiModel: string | null;
  anthropicModel: string | null;
  openaiApiKeyConfigured: boolean;
  anthropicApiKeyConfigured: boolean;
}

export function toPublicLLMSettings(config: {
  provider?: string;
  ollamaHost?: string;
  ollamaModel?: string;
  openaiApiKey?: string;
  openaiModel?: string;
  anthropicApiKey?: string;
  anthropicModel?: string;
}): PublicLLMSettings {
  return {
    provider: config.provider ?? null,
    ollamaHost: config.ollamaHost ?? null,
    ollamaModel: config.ollamaModel ?? null,
    openaiModel: config.openaiModel ?? null,
    anthropicModel: config.anthropicModel ?? null,
    openaiApiKeyConfigured: Boolean(config.openaiApiKey && config.openaiApiKey.trim().length > 0),
    anthropicApiKeyConfigured: Boolean(config.anthropicApiKey && config.anthropicApiKey.trim().length > 0),
  };
}

export async function GET(request?: NextRequest) {
  try {
    const session = await getAuthenticatedSession(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await getLLMConfig();
    return NextResponse.json(toPublicLLMSettings(config));
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to retrieve LLM settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthenticatedSession(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const settingsPath = path.join(process.cwd(), 'settings.json');
    let existing: Record<string, any> = {};
    if (fs.existsSync(settingsPath)) {
      try {
        existing = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      } catch {
        existing = {};
      }
    }

    // Filter properties to prevent writing arbitrary keys; preserve existing secrets when not explicitly replaced
    const settings = {
      provider: typeof body.provider === 'string' ? body.provider : existing.provider,
      ollamaHost: typeof body.ollamaHost === 'string' ? body.ollamaHost : existing.ollamaHost,
      ollamaModel: typeof body.ollamaModel === 'string' ? body.ollamaModel : existing.ollamaModel,
      openaiApiKey: typeof body.openaiApiKey === 'string' && body.openaiApiKey.trim() !== '' ? body.openaiApiKey.trim() : existing.openaiApiKey,
      openaiModel: typeof body.openaiModel === 'string' ? body.openaiModel : existing.openaiModel,
      anthropicApiKey: typeof body.anthropicApiKey === 'string' && body.anthropicApiKey.trim() !== '' ? body.anthropicApiKey.trim() : existing.anthropicApiKey,
      anthropicModel: typeof body.anthropicModel === 'string' ? body.anthropicModel : existing.anthropicModel,
    };

    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    return NextResponse.json({ success: true, settings: toPublicLLMSettings(settings) });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to update LLM settings' }, { status: 500 });
  }
}
