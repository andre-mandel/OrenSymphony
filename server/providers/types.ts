export type ProviderKind = 'openai_compatible' | 'anthropic' | 'google' | 'openrouter';

export interface ProviderRow {
  id: string;
  name: string;
  kind: ProviderKind;
  base_url: string | null;
  api_key_enc: string;
  extra_json: string;
  created_at: string;
}

export interface ModelRow {
  id: string;
  provider_id: string;
  model_id: string;
  display_name: string;
  capabilities: string;
  context_window: number | null;
  cost_in_per_1m: number | null;
  cost_out_per_1m: number | null;
  enabled: number;
  extra_json: string;
  created_at: string;
}

export interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

export interface AdapterCallParams {
  apiKey: string;
  baseUrl?: string | null;
  modelId: string;
  messages: ChatMessage[];
  tools?: ToolDef[];
  systemInstruction?: string;
  temperature?: number;
}

export interface AdapterResult {
  text: string;
  toolCalls: ToolCall[];
}

export interface ProviderAdapter {
  kind: ProviderKind;
  call(params: AdapterCallParams): Promise<AdapterResult>;
  generateImage?(params: { apiKey: string; baseUrl?: string | null; modelId: string; prompt: string }): Promise<string | null>;
}
