import { openaiAdapter } from './openai.ts';
import { anthropicAdapter } from './anthropic.ts';
import { googleAdapter } from './google.ts';
import type { AdapterCallParams, AdapterResult, ProviderAdapter, ProviderKind } from './types.ts';

const ADAPTERS: Record<ProviderKind, ProviderAdapter> = {
  openai_compatible: openaiAdapter,
  openrouter: openaiAdapter,
  anthropic: anthropicAdapter,
  google: googleAdapter,
};

export function getAdapter(kind: ProviderKind): ProviderAdapter {
  const a = ADAPTERS[kind];
  if (!a) throw new Error(`Unknown provider kind: ${kind}`);
  return a;
}

export function defaultBaseUrl(kind: ProviderKind): string | null {
  switch (kind) {
    case 'openai_compatible': return 'https://api.openai.com/v1';
    case 'openrouter': return 'https://openrouter.ai/api/v1';
    case 'anthropic': return 'https://api.anthropic.com';
    case 'google': return null;
  }
}

export type { AdapterCallParams, AdapterResult, ProviderAdapter, ProviderKind };
