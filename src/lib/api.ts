export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    ...init,
  });
  const text = await res.text();
  let data: unknown;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const err = (data && typeof data === 'object' && 'error' in data) ? String((data as { error: unknown }).error) : res.statusText;
    throw new ApiError(res.status, err, err);
  }
  return data as T;
}

export const api = {
  get: <T,>(p: string) => request<T>(p),
  post: <T,>(p: string, body?: unknown) => request<T>(p, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T,>(p: string, body?: unknown) => request<T>(p, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  del: <T,>(p: string) => request<T>(p, { method: 'DELETE' }),
};

export interface Provider {
  id: string;
  name: string;
  kind: 'openai_compatible' | 'openrouter' | 'anthropic' | 'google';
  base_url: string | null;
  api_key_masked: string;
  created_at: string;
  model_count: number;
}

export interface Model {
  id: string;
  provider_id: string;
  provider_name: string;
  provider_kind: Provider['kind'];
  model_id: string;
  display_name: string;
  capabilities: string[];
  context_window: number | null;
  cost_in_per_1m: number | null;
  cost_out_per_1m: number | null;
  enabled: boolean;
}

export interface MCPServer {
  id: string;
  name: string;
  transport: 'sse' | 'http';
  url: string;
  has_headers: boolean;
  enabled: boolean;
  last_error: string | null;
  last_connected_at: string | null;
  tool_count: number;
}

export interface MCPTool {
  id: string;
  server_id: string;
  server_name: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface RoutingDecision {
  model_id: string | null;
  display_name?: string;
  reason: string;
}

export interface ExecuteResult {
  text: string;
  toolInvocations: Array<{ name: string; arguments: Record<string, unknown>; result: string }>;
  modelUsed: string;
}
