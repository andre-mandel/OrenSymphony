import { bulkInsertModels, getProviderRow, decryptProviderKey } from './registry.ts';

export interface DiscoveryResult {
  inserted: number;
  total: number;
}

export async function discoverOpenRouter(providerId: string): Promise<DiscoveryResult> {
  const p = getProviderRow(providerId);
  if (!p) throw new Error('Provider not found');
  if (p.kind !== 'openrouter' && p.kind !== 'openai_compatible') {
    throw new Error('Only OpenRouter / OpenAI-compatible providers can auto-discover catalogs.');
  }
  const apiKey = decryptProviderKey(p);
  const base = (p.base_url || 'https://openrouter.ai/api/v1').replace(/\/+$/, '');
  const res = await fetch(`${base}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Catalog fetch failed (${res.status}): ${text.slice(0, 300)}`);
  }
  const json = (await res.json()) as { data: Array<RawCatalogEntry> };
  const items = (json.data ?? []).map(r => ({
    provider_id: providerId,
    model_id: r.id,
    display_name: r.name || r.id,
    capabilities: detectCapabilities(r),
    context_window: typeof r.context_length === 'number' ? r.context_length : null,
    cost_in_per_1m: parsePrice(r.pricing?.prompt),
    cost_out_per_1m: parsePrice(r.pricing?.completion),
  }));
  const inserted = bulkInsertModels(items);
  return { inserted, total: items.length };
}

interface RawCatalogEntry {
  id: string;
  name?: string;
  context_length?: number;
  pricing?: { prompt?: string; completion?: string };
  architecture?: { modality?: string; input_modalities?: string[]; output_modalities?: string[] };
}

function detectCapabilities(r: RawCatalogEntry): string[] {
  const caps = new Set(['text']);
  const inputs = r.architecture?.input_modalities ?? [];
  const outputs = r.architecture?.output_modalities ?? [];
  if (inputs.includes('image')) caps.add('vision');
  if (outputs.includes('image')) caps.add('image');
  return Array.from(caps);
}

function parsePrice(s: string | undefined): number | null {
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return n * 1_000_000;
}
