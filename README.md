<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# OrenSymphony

Visually link and orchestrate AI models with drag-and-drop, powered by
Gemini High Thinking.

View in AI Studio: https://ai.studio/apps/001ed859-97d0-4c0d-bfed-fd777f239280

## Run locally

Prerequisites: Node.js 20+.

```bash
npm install
echo 'GEMINI_API_KEY="your-key-here"' > .env.local
npm run dev
```

Then open http://localhost:3000/.

## Deploy to Coolify

The repo ships a multi-stage `Dockerfile` (Node 20 build → nginx 1.27
runtime) and an SPA-aware `nginx.conf`. In Coolify:

1. **Create a new Application** → source: this Git repo → branch: `main`.
2. **Build pack:** Dockerfile (Coolify auto-detects).
3. **Build args:** add `GEMINI_API_KEY` (and optionally `APP_URL`). These
   are inlined into the client bundle by Vite at build time, so they must
   be set as build-time variables, not just runtime env.
4. **Port:** `80`.
5. **Domain:** point `orensymphony.com` at the application; let Coolify
   provision the Let's Encrypt cert.
6. Deploy.

A health check (`wget` against `/`) is baked into the image.

> Heads up: the Gemini key is currently inlined into the client bundle,
> so anyone loading the site can extract it. Restrict the key in Google
> Cloud Console to the `orensymphony.com` HTTP referrer, or move the
> calls behind a small server proxy before going fully public.
