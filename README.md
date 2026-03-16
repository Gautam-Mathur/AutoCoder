# AutoCoder

AI-powered code generation platform that runs with local models (Ollama, LM Studio) or any OpenAI-compatible endpoint — no cloud API costs.

[![Run on Replit](https://replit.com/badge?caption=Run%20on%20Replit)](https://replit.com/github/Gautam-Mathur/AutoCoder)

## What it does

Describe a project in plain English and AutoCoder generates a full-stack codebase:
database schema, API routes, React components, and wiring — all from a local AI model
running on your machine.

A 17-stage generation pipeline backed by a massive knowledge base (172,000+ lines covering
40+ industry domains, 500+ programming concepts, 900+ best practices, 500+ anti-patterns,
and 300+ production code snippets across 5 full technology stacks) compensates for local
model limitations, pushing code quality toward cloud-model levels.

## Run on Replit (quickest)

1. Click the **Run on Replit** badge above (or import from GitHub).
2. Wait for dependencies to install (automatic).
3. Three workflows start automatically: **API Server**, **Frontend**, **Component Preview**.
4. Open the preview pane — the AutoCoder UI appears.
5. Go to **SLM Settings** (CPU icon in the header) to connect a model:

| Provider | Endpoint | Setup |
|----------|----------|-------|
| Replit Default | `http://localhost:1106/modelfarm/openai` | Already connected, no setup needed |
| Ollama | `http://localhost:11434` | Install [ollama.com](https://ollama.com), run `ollama pull qwen2.5-coder:7b` |
| LM Studio | `http://localhost:1234` | Install [lmstudio.ai](https://lmstudio.ai), start the Local Server tab |
| llama.cpp | `http://localhost:8080` | Run `./llama-server -m model.gguf --port 8080` |

All providers use the OpenAI-compatible `/v1/chat/completions` protocol. No API keys needed for local servers.

### Recommended models (code-specific)

| Model | RAM | Quality |
|-------|-----|---------|
| `qwen2.5-coder:7b` | 8 GB | Good — fast, code-focused |
| `deepseek-coder-v2:16b` | 16 GB+ | Excellent — near cloud quality |
| `codellama:13b` | 12 GB | Good — strong at completion tasks |

> General-purpose chat models produce significantly lower code quality.
> Always use a code-specific model for best results.

## Run locally (without Replit)

See **[DEVELOPMENT.md](./DEVELOPMENT.md)** for the full local setup guide.

```bash
git clone https://github.com/Gautam-Mathur/AutoCoder.git
cd AutoCoder
pnpm install
ollama pull qwen2.5-coder:7b
cp .env.example .env
pnpm run dev
```

Open **http://localhost:5173** in your browser.

## Environment variables

All optional — the app runs with sensible defaults and in-memory storage.

| Variable | Default | Purpose |
|----------|---------|---------|
| `OPENAI_BASE_URL` | `http://localhost:11434/v1` | AI model endpoint |
| `OPENAI_API_KEY` | `ollama` | API key (dummy for local) |
| `OPENAI_MODEL` | `qwen2.5-coder:7b` | Model name |
| `DATABASE_URL` | _(none)_ | PostgreSQL connection string. Omit for in-memory storage. |
| `PORT` | `3001` | API server port |

See `.env.example` for the full list with comments.

## Architecture

```
AutoCoder/
├── artifacts/
│   ├── api-server/       # Express API — 108+ modules, 17-stage SLM pipeline, 172K-line knowledge base
│   ├── autocoder/        # React + Vite frontend — chat UI, IDE, WebContainer preview
│   └── mockup-sandbox/   # Component preview server for canvas prototyping
├── lib/
│   ├── db/               # Drizzle ORM schema + PostgreSQL connection
│   ├── api-spec/         # OpenAPI spec
│   ├── api-client-react/ # Generated React Query hooks
│   └── api-zod/          # Generated Zod validation schemas
├── scripts/              # Setup and post-merge scripts
├── .env.example          # Environment variable template
├── .replit               # Replit workspace configuration
└── pnpm-workspace.yaml   # pnpm monorepo definition
```

## Documentation

- **[DEVELOPMENT.md](./DEVELOPMENT.md)** — Local development guide, prerequisites, troubleshooting
- **[DOCS.md](./DOCS.md)** — Full technical docs: every module, API endpoint, pipeline stage, and component

## License

MIT
