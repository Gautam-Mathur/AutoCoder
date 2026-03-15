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
ollama pull llama3.2

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

## Environment Variables

All configuration is in `.env` at the repo root. See `.env.example` for the full list with comments.

### AI Configuration

AutoCoder uses the OpenAI SDK, which works with any OpenAI-compatible server:

**Ollama (default, free):**
```env
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_API_KEY=ollama
OPENAI_MODEL=llama3.2
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
│   ├── api-server/      # Express API (port 3001)
│   └── autocoder/       # React + Vite frontend (port 5173)
├── lib/
│   ├── db/              # Drizzle ORM schema + DB connection
│   ├── api-spec/        # OpenAPI spec
│   ├── api-client-react/ # Generated React Query hooks
│   └── api-zod/         # Generated Zod schemas
├── .env.example         # Environment variable template
├── package.json         # Root workspace config
└── pnpm-workspace.yaml  # pnpm workspace definition
```

## Troubleshooting

**"Cannot find module '@replit/...'"** — These plugins are only loaded inside Replit. Locally they are skipped automatically.

**Frontend shows blank page** — Make sure the API server is running. The Vite dev server proxies `/api` calls to `http://localhost:3001`.

**AI features not working** — Make sure Ollama is running (`ollama serve`) and you have pulled a model (`ollama pull llama3.2`). Check the API server logs for connection errors.

**Database errors** — If you don't need persistence, just remove `DATABASE_URL` from `.env`. The app will use in-memory storage.
