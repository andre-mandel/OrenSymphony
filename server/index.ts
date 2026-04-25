import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { env } from './env.ts';
import {
  hasMasterPassword,
  setMasterPassword,
  verifyMasterPassword,
  issueSession,
  clearSession,
  requireAuth,
} from './auth.ts';
import {
  listProviders,
  createProvider,
  updateProvider,
  deleteProvider,
  listAllModels,
  createModel,
  updateModel,
  deleteModel,
} from './registry.ts';
import { discoverOpenRouter } from './discover.ts';
import { pickModel } from './router.ts';
import { executeText, executeImage } from './executor.ts';
import { generatePipeline } from './orchestrator.ts';
import {
  listMcpServers,
  createMcpServer,
  deleteMcpServer,
  refreshMcpTools,
  listMcpTools,
} from './mcp.ts';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '4mb' }));
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, version: '0.1.0' });
});

app.get('/api/auth/status', (_req, res) => {
  res.json({ setup_required: !hasMasterPassword() });
});

app.post('/api/auth/setup', async (req, res) => {
  if (hasMasterPassword()) {
    res.status(409).json({ error: 'already_setup' });
    return;
  }
  const { password } = req.body as { password?: string };
  if (!password) {
    res.status(400).json({ error: 'password_required' });
    return;
  }
  try {
    await setMasterPassword(password);
    issueSession(res);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'setup_failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { password } = req.body as { password?: string };
  if (!password) {
    res.status(400).json({ error: 'password_required' });
    return;
  }
  const ok = await verifyMasterPassword(password);
  if (!ok) {
    res.status(401).json({ error: 'invalid_password' });
    return;
  }
  issueSession(res);
  res.json({ ok: true });
});

app.post('/api/auth/logout', (_req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/providers', requireAuth, (_req, res) => {
  res.json(listProviders());
});

app.post('/api/providers', requireAuth, (req, res) => {
  const { name, kind, base_url, api_key } = req.body as Record<string, string>;
  if (!name || !kind || !api_key) {
    res.status(400).json({ error: 'name, kind, api_key required' });
    return;
  }
  if (!['openai_compatible', 'openrouter', 'anthropic', 'google'].includes(kind)) {
    res.status(400).json({ error: 'unsupported kind' });
    return;
  }
  res.json(createProvider({ name, kind: kind as never, base_url, api_key }));
});

app.patch('/api/providers/:id', requireAuth, (req, res) => {
  const out = updateProvider(req.params.id, req.body as Record<string, string>);
  if (!out) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  res.json(out);
});

app.delete('/api/providers/:id', requireAuth, (req, res) => {
  const ok = deleteProvider(req.params.id);
  res.json({ ok });
});

app.post('/api/providers/:id/discover', requireAuth, async (req, res) => {
  try {
    const out = await discoverOpenRouter(req.params.id);
    res.json(out);
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'discover_failed' });
  }
});

app.get('/api/models', requireAuth, (_req, res) => {
  res.json(listAllModels());
});

app.post('/api/models', requireAuth, (req, res) => {
  try {
    const out = createModel(req.body);
    res.json(out);
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'create_failed' });
  }
});

app.patch('/api/models/:id', requireAuth, (req, res) => {
  const out = updateModel(req.params.id, req.body);
  if (!out) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  res.json(out);
});

app.delete('/api/models/:id', requireAuth, (req, res) => {
  res.json({ ok: deleteModel(req.params.id) });
});

app.post('/api/router/pick', requireAuth, async (req, res) => {
  const { prompt, needs_vision, needs_image_gen } = req.body as {
    prompt?: string; needs_vision?: boolean; needs_image_gen?: boolean;
  };
  if (!prompt) {
    res.status(400).json({ error: 'prompt required' });
    return;
  }
  try {
    const decision = await pickModel(prompt, {
      needsVision: needs_vision,
      needsImageGen: needs_image_gen,
    });
    res.json(decision ?? { model_id: null, reason: 'No models registered.' });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'router_failed' });
  }
});

app.post('/api/execute/text', requireAuth, async (req, res) => {
  try {
    const out = await executeText(req.body);
    res.json(out);
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'execute_failed' });
  }
});

app.post('/api/execute/image', requireAuth, async (req, res) => {
  const { model_id, prompt } = req.body as { model_id?: string; prompt?: string };
  if (!model_id || !prompt) {
    res.status(400).json({ error: 'model_id and prompt required' });
    return;
  }
  try {
    const dataUrl = await executeImage(model_id, prompt);
    res.json({ data_url: dataUrl });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'image_failed' });
  }
});

app.post('/api/orchestrate', requireAuth, async (req, res) => {
  const { task } = req.body as { task?: string };
  if (!task) {
    res.status(400).json({ error: 'task required' });
    return;
  }
  try {
    const spec = await generatePipeline(task);
    res.json(spec);
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'orchestrate_failed' });
  }
});

app.get('/api/mcp/servers', requireAuth, (_req, res) => {
  res.json(listMcpServers());
});

app.post('/api/mcp/servers', requireAuth, (req, res) => {
  const { name, transport, url, headers } = req.body as {
    name?: string; transport?: 'sse' | 'http'; url?: string; headers?: Record<string, string>;
  };
  if (!name || !transport || !url) {
    res.status(400).json({ error: 'name, transport, url required' });
    return;
  }
  if (transport !== 'sse' && transport !== 'http') {
    res.status(400).json({ error: 'transport must be sse or http' });
    return;
  }
  res.json(createMcpServer({ name, transport, url, headers }));
});

app.post('/api/mcp/servers/:id/refresh', requireAuth, async (req, res) => {
  try {
    const out = await refreshMcpTools(req.params.id);
    res.json(out);
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'refresh_failed' });
  }
});

app.delete('/api/mcp/servers/:id', requireAuth, (req, res) => {
  res.json({ ok: deleteMcpServer(req.params.id) });
});

app.get('/api/mcp/tools', requireAuth, (_req, res) => {
  res.json(listMcpTools());
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(__dirname, '..', 'dist');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath, { index: false, maxAge: '1y', setHeaders(res, p) {
    if (p.endsWith('index.html')) res.setHeader('Cache-Control', 'no-store');
  } }));
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else if (env.NODE_ENV !== 'production') {
  app.get('/', (_req, res) => {
    res.send('OrenSymphony backend up. Run `npm run dev:web` for the SPA dev server.');
  });
}

app.listen(env.PORT, () => {
  console.log(`OrenSymphony listening on :${env.PORT} (${env.NODE_ENV})`);
  if (!hasMasterPassword()) {
    console.log('First-run: open the app in a browser to set a master password.');
  }
});
