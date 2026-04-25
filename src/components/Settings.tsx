import React, { useEffect, useState } from 'react';
import { Loader2, Plus, RefreshCw, Trash2, X, Sparkles, Wifi } from 'lucide-react';
import { api, type MCPServer, type MCPTool, type Model, type Provider } from '../lib/api';
import { useMcpServers, useMcpTools, useModels, useProviders } from '../lib/registry';
import { useAuth } from '../lib/auth';

type Tab = 'providers' | 'models' | 'mcp' | 'routing';

export function Settings({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('providers');
  return (
    <div className="fixed inset-0 z-50 flex items-stretch bg-black/70 backdrop-blur-sm">
      <div className="m-auto w-full max-w-5xl h-[85vh] bg-bg border border-border rounded-xl overflow-hidden flex flex-col">
        <header className="h-14 border-b border-border flex items-center px-6 justify-between">
          <div className="text-sm font-black uppercase tracking-widest">Settings</div>
          <button onClick={onClose} className="text-text-dim hover:text-accent transition-colors">
            <X className="w-5 h-5" />
          </button>
        </header>
        <div className="flex flex-1 overflow-hidden">
          <nav className="w-48 border-r border-border py-4 px-3 flex flex-col gap-1 text-xs">
            {(['providers', 'models', 'mcp', 'routing'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`text-left px-3 py-2 rounded uppercase tracking-widest font-bold transition-colors ${tab === t ? 'bg-accent text-bg' : 'text-text-dim hover:text-text-main'}`}
              >
                {labelFor(t)}
              </button>
            ))}
          </nav>
          <main className="flex-1 overflow-y-auto p-6">
            {tab === 'providers' && <ProvidersTab />}
            {tab === 'models' && <ModelsTab />}
            {tab === 'mcp' && <MCPTab />}
            {tab === 'routing' && <RoutingTab />}
          </main>
        </div>
      </div>
    </div>
  );
}

function labelFor(t: Tab): string {
  return t === 'mcp' ? 'MCP Servers' : t === 'routing' ? 'Smart Routing' : t.charAt(0).toUpperCase() + t.slice(1);
}

function ProvidersTab() {
  const { data: providers, refresh } = useProviders();
  const { logout } = useAuth();
  const [adding, setAdding] = useState(false);
  return (
    <div className="space-y-4 text-sm">
      <SectionHeader title="Providers" subtitle="Add API endpoints. Keys are encrypted at rest with the server's MASTER_KEY.">
        <button onClick={() => setAdding(s => !s)} className="text-xs px-3 py-1.5 bg-accent text-bg font-bold rounded uppercase tracking-widest flex items-center gap-1.5">
          <Plus className="w-3 h-3" /> Add provider
        </button>
      </SectionHeader>

      {adding && <AddProvider onDone={() => { setAdding(false); refresh(); }} onCancel={() => setAdding(false)} />}

      <div className="space-y-2">
        {providers.map(p => (
          <ProviderRow key={p.id} provider={p} onChange={refresh} />
        ))}
        {providers.length === 0 && !adding && (
          <div className="text-text-dim text-xs italic p-4 border border-border border-dashed rounded">
            No providers yet. Add OpenAI, Anthropic, Google, or any OpenAI-compatible endpoint.
          </div>
        )}
      </div>

      <div className="border-t border-border pt-4 mt-8">
        <button onClick={logout} className="text-xs text-text-dim hover:text-accent transition-colors">
          Sign out of vault
        </button>
      </div>
    </div>
  );
}

function AddProvider({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<Provider['kind']>('openai_compatible');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const presets: Array<{ name: string; kind: Provider['kind']; base_url: string }> = [
    { name: 'OpenAI', kind: 'openai_compatible', base_url: 'https://api.openai.com/v1' },
    { name: 'OpenRouter', kind: 'openrouter', base_url: 'https://openrouter.ai/api/v1' },
    { name: 'Anthropic', kind: 'anthropic', base_url: 'https://api.anthropic.com' },
    { name: 'Google Gemini', kind: 'google', base_url: '' },
    { name: 'Groq', kind: 'openai_compatible', base_url: 'https://api.groq.com/openai/v1' },
    { name: 'Together', kind: 'openai_compatible', base_url: 'https://api.together.xyz/v1' },
    { name: 'Ollama (local)', kind: 'openai_compatible', base_url: 'http://localhost:11434/v1' },
  ];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await api.post('/api/providers', { name, kind, base_url: baseUrl || null, api_key: apiKey });
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Add failed.');
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="bg-surface border border-border rounded-lg p-5 space-y-3">
      <div className="text-[10px] uppercase tracking-widest text-text-dim mb-2">Quick add</div>
      <div className="flex flex-wrap gap-2 mb-3">
        {presets.map(p => (
          <button key={p.name} type="button"
            onClick={() => { setName(p.name); setKind(p.kind); setBaseUrl(p.base_url); }}
            className="text-[11px] px-2.5 py-1 border border-border rounded hover:border-accent text-text-dim hover:text-text-main transition-colors"
          >{p.name}</button>
        ))}
      </div>
      <Field label="Name"><Input value={name} onChange={setName} placeholder="e.g. My OpenRouter" /></Field>
      <Field label="Kind">
        <select value={kind} onChange={e => setKind(e.target.value as Provider['kind'])} className="w-full bg-bg border border-border rounded px-2 py-1.5 text-xs focus:outline-none focus:border-accent">
          <option value="openai_compatible">OpenAI-compatible (OpenAI / Groq / Together / Ollama)</option>
          <option value="openrouter">OpenRouter</option>
          <option value="anthropic">Anthropic</option>
          <option value="google">Google Gemini</option>
        </select>
      </Field>
      {kind !== 'google' && (
        <Field label={`Base URL${kind === 'openai_compatible' ? ' (optional)' : ''}`}><Input value={baseUrl} onChange={setBaseUrl} placeholder="https://…" /></Field>
      )}
      <Field label="API key"><Input type="password" value={apiKey} onChange={setApiKey} placeholder="sk-…" /></Field>
      {err && <div className="text-xs text-red-400">{err}</div>}
      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={busy || !name || !apiKey} className="bg-accent text-bg text-xs font-bold py-2 px-4 rounded uppercase tracking-widest disabled:opacity-50 flex items-center gap-2">
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Save provider
        </button>
        <button type="button" onClick={onCancel} className="text-xs text-text-dim hover:text-text-main">Cancel</button>
      </div>
    </form>
  );
}

function ProviderRow({ provider, onChange }: { provider: Provider; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const remove = async () => {
    if (!confirm(`Delete provider "${provider.name}" and all its models?`)) return;
    await api.del(`/api/providers/${provider.id}`);
    onChange();
  };
  const discover = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await api.post<{ inserted: number; total: number }>(`/api/providers/${provider.id}/discover`);
      setMsg(`Imported ${r.inserted} of ${r.total} models.`);
      onChange();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Discovery failed.');
    } finally { setBusy(false); }
  };

  const canDiscover = provider.kind === 'openrouter' || provider.kind === 'openai_compatible';
  return (
    <div className="bg-surface border border-border rounded-lg p-4 flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold truncate">{provider.name}</div>
          <div className="text-[10px] text-text-dim uppercase tracking-widest">
            {provider.kind} · {provider.api_key_masked} · {provider.model_count} model{provider.model_count === 1 ? '' : 's'}
          </div>
        </div>
        {canDiscover && (
          <button onClick={discover} disabled={busy} className="text-[11px] px-3 py-1.5 border border-border hover:border-accent text-text-dim hover:text-text-main rounded uppercase flex items-center gap-1.5">
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Pull catalog
          </button>
        )}
        <button onClick={remove} className="text-text-dim hover:text-red-400 transition-colors p-1.5">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {msg && <div className="text-[11px] text-text-dim">{msg}</div>}
    </div>
  );
}

function ModelsTab() {
  const { data: models, refresh } = useModels();
  const { data: providers } = useProviders();
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-4 text-sm">
      <SectionHeader title="Models" subtitle="The dynamic registry. Drag-add nodes for any of these on the canvas; the smart router picks among the enabled ones.">
        <button onClick={() => setAdding(s => !s)} disabled={providers.length === 0} className="text-xs px-3 py-1.5 bg-accent text-bg font-bold rounded uppercase tracking-widest flex items-center gap-1.5 disabled:opacity-50">
          <Plus className="w-3 h-3" /> Add model
        </button>
      </SectionHeader>
      {providers.length === 0 && (
        <div className="text-text-dim text-xs italic p-4 border border-border border-dashed rounded">
          Add a provider first.
        </div>
      )}
      {adding && providers.length > 0 && (
        <AddModel providers={providers} onDone={() => { setAdding(false); refresh(); }} onCancel={() => setAdding(false)} />
      )}
      <div className="space-y-1">
        {models.map(m => <ModelRow key={m.id} model={m} onChange={refresh} />)}
        {models.length === 0 && !adding && providers.length > 0 && (
          <div className="text-text-dim text-xs italic p-4 border border-border border-dashed rounded">
            No models yet. Add one manually, or use “Pull catalog” on an OpenRouter / OpenAI-compatible provider.
          </div>
        )}
      </div>
    </div>
  );
}

function AddModel({ providers, onDone, onCancel }: { providers: Provider[]; onDone: () => void; onCancel: () => void }) {
  const [providerId, setProviderId] = useState(providers[0]?.id ?? '');
  const [modelId, setModelId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [caps, setCaps] = useState<Record<string, boolean>>({ text: true, vision: false, image: false });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      await api.post('/api/models', {
        provider_id: providerId,
        model_id: modelId,
        display_name: displayName || modelId,
        capabilities: Object.entries(caps).filter(([, v]) => v).map(([k]) => k),
      });
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Add failed.');
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="bg-surface border border-border rounded-lg p-5 space-y-3">
      <Field label="Provider">
        <select value={providerId} onChange={e => setProviderId(e.target.value)} className="w-full bg-bg border border-border rounded px-2 py-1.5 text-xs focus:outline-none focus:border-accent">
          {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Model ID (exact, as the provider expects)"><Input value={modelId} onChange={setModelId} placeholder="gpt-4o, claude-sonnet-4-6, gemini-3-pro-preview…" /></Field>
      <Field label="Display name (optional)"><Input value={displayName} onChange={setDisplayName} placeholder="GPT-4o" /></Field>
      <Field label="Capabilities">
        <div className="flex gap-3 text-xs">
          {(['text', 'vision', 'image'] as const).map(c => (
            <label key={c} className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={!!caps[c]} onChange={e => setCaps(s => ({ ...s, [c]: e.target.checked }))} />
              {c}
            </label>
          ))}
        </div>
      </Field>
      {err && <div className="text-xs text-red-400">{err}</div>}
      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={busy || !modelId} className="bg-accent text-bg text-xs font-bold py-2 px-4 rounded uppercase tracking-widest disabled:opacity-50 flex items-center gap-2">
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Save model
        </button>
        <button type="button" onClick={onCancel} className="text-xs text-text-dim hover:text-text-main">Cancel</button>
      </div>
    </form>
  );
}

function ModelRow({ model, onChange }: { model: Model; onChange: () => void }) {
  const toggle = async () => {
    await api.patch(`/api/models/${model.id}`, { enabled: !model.enabled });
    onChange();
  };
  const remove = async () => {
    if (!confirm(`Delete model "${model.display_name}"?`)) return;
    await api.del(`/api/models/${model.id}`);
    onChange();
  };
  return (
    <div className={`bg-surface border ${model.enabled ? 'border-border' : 'border-border opacity-50'} rounded px-4 py-2.5 flex items-center gap-3`}>
      <input type="checkbox" checked={model.enabled} onChange={toggle} className="cursor-pointer" />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold truncate">{model.display_name}</div>
        <div className="text-[10px] text-text-dim truncate">
          {model.provider_name} · {model.model_id} · {model.capabilities.join(', ')}
          {model.context_window ? ` · ${(model.context_window / 1000).toFixed(0)}K ctx` : ''}
        </div>
      </div>
      <button onClick={remove} className="text-text-dim hover:text-red-400 p-1.5"><Trash2 className="w-3.5 h-3.5" /></button>
    </div>
  );
}

function MCPTab() {
  const { data: servers, refresh: refreshServers } = useMcpServers();
  const { data: tools, refresh: refreshTools } = useMcpTools();
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-4 text-sm">
      <SectionHeader title="MCP Servers" subtitle="Connect to remote MCP servers (SSE or streamable HTTP). Discovered tools become callable by any tool-capable model.">
        <button onClick={() => setAdding(s => !s)} className="text-xs px-3 py-1.5 bg-accent text-bg font-bold rounded uppercase tracking-widest flex items-center gap-1.5">
          <Plus className="w-3 h-3" /> Add MCP server
        </button>
      </SectionHeader>
      {adding && <AddMCPServer onDone={() => { setAdding(false); refreshServers(); refreshTools(); }} onCancel={() => setAdding(false)} />}
      <div className="space-y-2">
        {servers.map(s => <MCPServerRow key={s.id} server={s} onChange={() => { refreshServers(); refreshTools(); }} />)}
        {servers.length === 0 && !adding && (
          <div className="text-text-dim text-xs italic p-4 border border-border border-dashed rounded">
            No MCP servers yet. Add one to expose its tools to the orchestrator.
          </div>
        )}
      </div>
      {tools.length > 0 && (
        <div className="pt-4 border-t border-border">
          <div className="text-[10px] uppercase tracking-widest text-text-dim mb-2">Discovered tools</div>
          <div className="grid grid-cols-2 gap-2">
            {tools.map(t => <ToolBadge key={t.id} tool={t} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function AddMCPServer({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [transport, setTransport] = useState<'sse' | 'http'>('sse');
  const [headers, setHeaders] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      let h: Record<string, string> | undefined;
      if (headers.trim()) {
        h = JSON.parse(headers) as Record<string, string>;
      }
      const created = await api.post<MCPServer>('/api/mcp/servers', { name, url, transport, headers: h });
      try { await api.post(`/api/mcp/servers/${created.id}/refresh`); } catch { /* ignore — surfaces in last_error */ }
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Add failed.');
    } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="bg-surface border border-border rounded-lg p-5 space-y-3">
      <Field label="Name"><Input value={name} onChange={setName} placeholder="GitHub" /></Field>
      <Field label="Transport">
        <select value={transport} onChange={e => setTransport(e.target.value as 'sse' | 'http')} className="w-full bg-bg border border-border rounded px-2 py-1.5 text-xs focus:outline-none focus:border-accent">
          <option value="sse">SSE</option>
          <option value="http">Streamable HTTP</option>
        </select>
      </Field>
      <Field label="URL"><Input value={url} onChange={setUrl} placeholder="https://mcp-server.example/sse" /></Field>
      <Field label="Headers (JSON, optional — for auth)">
        <textarea value={headers} onChange={e => setHeaders(e.target.value)} rows={3} className="w-full bg-bg border border-border rounded p-2 text-xs font-mono focus:outline-none focus:border-accent" placeholder='{"Authorization": "Bearer …"}' />
      </Field>
      {err && <div className="text-xs text-red-400">{err}</div>}
      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={busy || !name || !url} className="bg-accent text-bg text-xs font-bold py-2 px-4 rounded uppercase tracking-widest disabled:opacity-50 flex items-center gap-2">
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Connect
        </button>
        <button type="button" onClick={onCancel} className="text-xs text-text-dim hover:text-text-main">Cancel</button>
      </div>
    </form>
  );
}

function MCPServerRow({ server, onChange }: { server: MCPServer; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const refresh = async () => {
    setBusy(true);
    try { await api.post(`/api/mcp/servers/${server.id}/refresh`); onChange(); } catch { onChange(); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!confirm(`Delete MCP server "${server.name}"?`)) return;
    await api.del(`/api/mcp/servers/${server.id}`);
    onChange();
  };
  return (
    <div className="bg-surface border border-border rounded-lg p-4 flex items-center gap-3">
      <Wifi className={`w-4 h-4 ${server.last_error ? 'text-red-400' : 'text-accent'}`} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold truncate">{server.name}</div>
        <div className="text-[10px] text-text-dim truncate">
          {server.transport.toUpperCase()} · {server.url} · {server.tool_count} tool{server.tool_count === 1 ? '' : 's'}
        </div>
        {server.last_error && <div className="text-[10px] text-red-400 truncate">{server.last_error}</div>}
      </div>
      <button onClick={refresh} disabled={busy} className="text-[11px] px-3 py-1.5 border border-border hover:border-accent text-text-dim hover:text-text-main rounded uppercase flex items-center gap-1.5">
        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
        Refresh
      </button>
      <button onClick={remove} className="text-text-dim hover:text-red-400 p-1.5"><Trash2 className="w-3.5 h-3.5" /></button>
    </div>
  );
}

function ToolBadge({ tool }: { tool: MCPTool }) {
  return (
    <div className="bg-surface border border-border rounded p-2.5">
      <div className="text-[11px] font-bold truncate">{tool.name}</div>
      <div className="text-[10px] text-text-dim truncate">{tool.server_name} · {tool.description || '—'}</div>
    </div>
  );
}

function RoutingTab() {
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<{ model_id: string | null; display_name?: string; reason: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const test = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await api.post<typeof out>('/api/router/pick', { prompt });
      setOut(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Routing failed.');
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4 text-sm">
      <SectionHeader title="Smart routing" subtitle="The router picks the cheapest enabled model that fits the task. Image-gen tasks force an image-capable model." />
      <Field label="Test prompt">
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} className="w-full bg-surface border border-border rounded p-2 text-xs font-mono focus:outline-none focus:border-accent" placeholder="Summarize this 10-page PDF; write production code; generate a logo…" />
      </Field>
      <button onClick={test} disabled={busy || !prompt} className="bg-accent text-bg text-xs font-bold py-2 px-4 rounded uppercase tracking-widest disabled:opacity-50 flex items-center gap-2">
        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Pick a model
      </button>
      {err && <div className="text-xs text-red-400">{err}</div>}
      {out && (
        <div className="bg-surface border border-border rounded-lg p-4 space-y-1">
          <div className="text-[10px] uppercase tracking-widest text-text-dim">Decision</div>
          <div className="text-sm font-bold">{out.display_name ?? out.model_id ?? 'No model picked'}</div>
          {out.reason && <div className="text-[11px] text-text-dim">{out.reason}</div>}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ title, subtitle, children }: { title: string; subtitle: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-sm font-bold">{title}</div>
        <div className="text-[11px] text-text-dim mt-0.5 max-w-prose leading-relaxed">{subtitle}</div>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-widest text-text-dim mb-1">{label}</div>
      {children}
    </label>
  );
}

function Input({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-bg border border-border rounded px-2.5 py-1.5 text-xs text-text-main focus:outline-none focus:border-accent"
    />
  );
}
