<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# OrenSymphony

Visually link and orchestrate **any** AI model — OpenAI, Anthropic, Google,
OpenRouter, Groq, Together, Ollama, anything OpenAI-compatible — with
drag-and-drop, MCP tool calls, and a smart router that picks the right model
for each task.

## Architecture

- **Frontend:** React + Vite + React Flow canvas (`src/`).
- **Backend:** Node + Express + SQLite, single image, serves the SPA from
  `dist/` and the REST API under `/api/` (`server/`).
- **Vault:** API keys are encrypted at rest with AES-256-GCM using a
  server-side `MASTER_KEY`. The UI is gated behind a master password.
- **MCP:** Streamable HTTP / SSE clients connect out to remote MCP servers
  and expose their tools to any tool-capable model.

## Run locally

```bash
npm install

# generate a 32-byte master key
echo "MASTER_KEY=$(openssl rand -base64 32)" > .env.local
echo "COOKIE_SIGNING_KEY=$(openssl rand -base64 32)" >> .env.local

# build the SPA, then start the server (serves SPA + API on :8080)
npm run build:web
npm start
```

For frontend HMR while developing, run the SPA dev server in one terminal
and the backend in another:

```bash
npm run dev:server   # backend on :8080
npm run dev:web      # SPA on :3000 (proxies /api → :8080)
```

Open http://localhost:3000 (or :8080 if you're using `npm start`), set a
master password on first launch, then open **Settings** to add providers
and models. Start with **Pull catalog** on an OpenRouter provider to import
the live model list in one click.

## Deploy to Coolify

The repo ships a single-stage Dockerfile that builds the SPA and runs a
Node server on port 80.

In Coolify:

1. **Application** → source: this Git repo → branch: `main`.
2. **Build pack:** Dockerfile (auto-detected).
3. **Environment variables (runtime):**
   - `MASTER_KEY` — base64-encoded 32 bytes (`openssl rand -base64 32`). **Required.**
     Losing it makes every stored API key unreadable.
   - `COOKIE_SIGNING_KEY` — any random string for session cookie signing. **Required.**
   - (Optional) `APP_URL` — `https://orensymphony.com`.
4. **Persistent volume:** mount one at `/app/data` so the SQLite vault
   survives redeploys.
5. **Port:** `80`.
6. **Domain:** point `orensymphony.com` at the application.
7. Deploy. On first load, set the master password.

Health check (`wget /api/health`) is baked into the image.

## What's where

```
server/
  env.ts                env validation, master key handling
  crypto.ts             AES-GCM encrypt/decrypt + cookie signing
  db.ts                 SQLite open + schema migrations
  auth.ts               master password + session cookie
  registry.ts           providers / models CRUD
  router.ts             smart routing (LLM-judged best model per task)
  discover.ts           OpenRouter catalog import
  mcp.ts                MCP client + tool registry
  executor.ts           model call + tool-calling loop
  orchestrator.ts       /api/orchestrate (LLM-built pipelines)
  providers/
    openai.ts           OpenAI-compatible (also OpenRouter / Groq / Together / Ollama)
    anthropic.ts        Anthropic Messages API
    google.ts           Gemini via @google/genai
    types.ts            adapter interface
    index.ts            adapter dispatch
  index.ts              Express app, routes, static server
src/
  components/Settings.tsx   provider / model / MCP / routing UI
  components/AuthGate.tsx   first-run setup + login
  lib/api.ts                fetch wrapper
  lib/auth.tsx              auth context
  lib/registry.ts           dynamic model/provider hooks
  lib/calls.ts              backend execute / orchestrate / route helpers
  lib/pipeline.ts           DAG executor (calls backend per node)
```

## Heads up

- This is a single-tenant app. Anyone with the master password can read or
  modify every provider key. Use a long, unique password.
- Stored keys are only as safe as `MASTER_KEY`. Treat it like a database
  password — back it up, rotate it deliberately, never commit it.
- MCP transport is SSE or streamable HTTP (no stdio subprocesses), so all
  MCP servers must be reachable over HTTPS from the container.
