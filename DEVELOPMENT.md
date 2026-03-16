# Local Development Guide

Run AutoCoder on your own machine with a local AI model — no cloud API keys required.

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20+ | [nodejs.org](https://nodejs.org) |
| pnpm | 9+ | `npm install -g pnpm` |
| Ollama | latest | [ollama.com](https://ollama.com) |

## Quick Start

```bash
# 1. Clone and install
git clone <your-repo-url>
cd autocoder
pnpm install

# 2. Pull a model (one-time)
ollama pull qwen2.5-coder:7b

# 3. Set up environment
cp .env.example .env
# The defaults work with Ollama — no edits needed

# 4. Start everything
pnpm run dev
```

The API server starts on **http://localhost:3001** and the frontend on **http://localhost:5173**.

Open **http://localhost:5173** in your browser.

## Available Scripts

| Command | What it does |
|---------|-------------|
| `pnpm run dev` | Start both API server and frontend |
| `pnpm run dev:api` | Start only the API server |
| `pnpm run dev:web` | Start only the frontend |
| `pnpm run build` | Typecheck and build all packages |
| `pnpm run typecheck` | Run TypeScript type checking |

## Recommended Models

Code-specific models produce significantly better output than general models.

| Model | RAM | Quality |
|-------|-----|---------|
| `qwen2.5-coder:7b` | 8 GB | Good — fast, code-focused (default) |
| `deepseek-coder-v2:16b` | 16 GB+ | Excellent — near cloud quality |
| `codellama:13b` | 12 GB | Good — strong at completion tasks |

> **Do not use general-purpose models** for code generation (e.g. general chat models).
> They lack coding-specific training data and produce lower quality, more error-prone output.
> Always use a code-specialized model from the table above.

## Environment Variables

All configuration is in `.env` at the repo root. See `.env.example` for the full list with comments.

### AI Configuration

AutoCoder uses the OpenAI SDK, which works with any OpenAI-compatible server:

**Ollama (default, free):**
```env
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_API_KEY=ollama
OPENAI_MODEL=qwen2.5-coder:7b
```

**LM Studio:**
```env
OPENAI_BASE_URL=http://localhost:1234/v1
OPENAI_API_KEY=lm-studio
OPENAI_MODEL=<your-loaded-model>
```

**Cloud OpenAI:**
```env
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
```

### Database

By default the app runs with in-memory storage (data lost on restart). To persist data, set up PostgreSQL:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/autocoder
```

Then push the schema:

```bash
cd lib/db && npx drizzle-kit push
```

## Architecture

```
autocoder/
├── artifacts/
│   ├── api-server/      # Express API — 108+ modules, 17-stage pipeline, 172K-line knowledge base
│   └── autocoder/       # React + Vite frontend (port 5173)
│       └── src/lib/code-generator/
│           ├── engine.ts              # Main code generation router
│           └── script-generator.ts    # Multi-language script/CLI generator
├── lib/
│   ├── db/              # Drizzle ORM schema + DB connection
│   ├── api-spec/        # OpenAPI spec
│   ├── api-client-react/ # Generated React Query hooks
│   └── api-zod/         # Generated Zod schemas
├── .env.example         # Environment variable template
├── package.json         # Root workspace config
└── pnpm-workspace.yaml  # pnpm workspace definition
```

The API server includes a massive knowledge base (~172,000 lines) covering 40+ industry domains, 500+ programming concepts, 900+ best practices, 500+ anti-patterns, and 300+ production code snippets across 5 technology stacks (MERN, Django, Spring Boot, .NET, Go+React).

### Friendly Chat UI

The chat interface shows non-technical language by default during code generation:
- **ThinkingSteps** — pipeline progress shows friendly messages (e.g., "Reading your description carefully") with expandable technical details via chevron toggle
- **Plan output** — plain-English summary at the top, technical specs in collapsible `<details>` sections
- **Landing page** — benefit-focused copy ("Describe Your Idea, Get a Working App")

### Multi-Language Script Generation

AutoCoder detects when a user wants a standalone script or CLI program (not a web app) and generates projects in Python, Go, Rust, Node.js, or TypeScript. Detection runs first in `engine.ts` before any web pipeline routing.

## Troubleshooting

**"Cannot find module '@replit/...'"** — These plugins are only loaded inside Replit. Locally they are skipped automatically.

**Frontend shows blank page** — Make sure the API server is running. The Vite dev server proxies `/api` calls to `http://localhost:3001`.

**AI features not working** — Make sure Ollama is running (`ollama serve`) and you have pulled a model (`ollama pull qwen2.5-coder:7b`). Check the API server logs for connection errors.

**Database errors** — If you don't need persistence, just remove `DATABASE_URL` from `.env`. The app will use in-memory storage.
