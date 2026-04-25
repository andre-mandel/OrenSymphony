import crypto from 'node:crypto';
import { db } from './db.ts';
import { decryptSecret, encryptSecret, maskKey } from './crypto.ts';
import { defaultBaseUrl } from './providers/index.ts';
import type { ModelRow, ProviderKind, ProviderRow } from './providers/types.ts';

export interface PublicProvider {
  id: string;
  name: string;
  kind: ProviderKind;
  base_url: string | null;
  api_key_masked: string;
  created_at: string;
  model_count: number;
}

export interface PublicModel {
  id: string;
  provider_id: string;
  provider_name: string;
  provider_kind: ProviderKind;
  model_id: string;
  display_name: string;
  capabilities: string[];
  context_window: number | null;
  cost_in_per_1m: number | null;
  cost_out_per_1m: number | null;
  enabled: boolean;
}

function randomId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

export function listProviders(): PublicProvider[] {
  const rows = db
    .prepare(
      `SELECT p.*, (SELECT COUNT(*) FROM models m WHERE m.provider_id = p.id) AS model_count
       FROM providers p ORDER BY created_at DESC`,
    )
    .all() as Array<ProviderRow & { model_count: number }>;
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    kind: r.kind,
    base_url: r.base_url,
    api_key_masked: maskKey(decryptSecret(r.api_key_enc)),
    created_at: r.created_at,
    model_count: r.model_count,
  }));
}

export function getProviderRow(id: string): ProviderRow | null {
  const row = db.prepare('SELECT * FROM providers WHERE id = ?').get(id) as ProviderRow | undefined;
  return row ?? null;
}

export function decryptProviderKey(row: ProviderRow): string {
  return decryptSecret(row.api_key_enc);
}

export function createProvider(input: {
  name: string;
  kind: ProviderKind;
  base_url?: string | null;
  api_key: string;
}): PublicProvider {
  const id = randomId('prov');
  const base_url = input.base_url || defaultBaseUrl(input.kind);
  db.prepare(
    `INSERT INTO providers (id, name, kind, base_url, api_key_enc)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(id, input.name, input.kind, base_url, encryptSecret(input.api_key));
  return listProviders().find(p => p.id === id)!;
}

export function updateProvider(
  id: string,
  patch: { name?: string; base_url?: string | null; api_key?: string },
): PublicProvider | null {
  const row = getProviderRow(id);
  if (!row) return null;
  const name = patch.name ?? row.name;
  const base_url = patch.base_url === undefined ? row.base_url : patch.base_url;
  const api_key_enc = patch.api_key !== undefined ? encryptSecret(patch.api_key) : row.api_key_enc;
  db.prepare(
    `UPDATE providers SET name = ?, base_url = ?, api_key_enc = ? WHERE id = ?`,
  ).run(name, base_url, api_key_enc, id);
  return listProviders().find(p => p.id === id) ?? null;
}

export function deleteProvider(id: string): boolean {
  const info = db.prepare('DELETE FROM providers WHERE id = ?').run(id);
  return info.changes > 0;
}

export function listModels(): PublicModel[] {
  const rows = db
    .prepare(
      `SELECT m.*, p.name AS provider_name, p.kind AS provider_kind
       FROM models m JOIN providers p ON p.id = m.provider_id
       WHERE m.enabled = 1
       ORDER BY p.name, m.display_name`,
    )
    .all() as Array<ModelRow & { provider_name: string; provider_kind: ProviderKind }>;
  return rows.map(toPublicModel);
}

export function listAllModels(): PublicModel[] {
  const rows = db
    .prepare(
      `SELECT m.*, p.name AS provider_name, p.kind AS provider_kind
       FROM models m JOIN providers p ON p.id = m.provider_id
       ORDER BY p.name, m.display_name`,
    )
    .all() as Array<ModelRow & { provider_name: string; provider_kind: ProviderKind }>;
  return rows.map(toPublicModel);
}

function toPublicModel(r: ModelRow & { provider_name: string; provider_kind: ProviderKind }): PublicModel {
  return {
    id: r.id,
    provider_id: r.provider_id,
    provider_name: r.provider_name,
    provider_kind: r.provider_kind,
    model_id: r.model_id,
    display_name: r.display_name,
    capabilities: r.capabilities.split(',').map(s => s.trim()).filter(Boolean),
    context_window: r.context_window,
    cost_in_per_1m: r.cost_in_per_1m,
    cost_out_per_1m: r.cost_out_per_1m,
    enabled: r.enabled === 1,
  };
}

export function getModelRow(id: string): ModelRow | null {
  const r = db.prepare('SELECT * FROM models WHERE id = ?').get(id) as ModelRow | undefined;
  return r ?? null;
}

export interface CreateModelInput {
  provider_id: string;
  model_id: string;
  display_name: string;
  capabilities?: string[];
  context_window?: number | null;
  cost_in_per_1m?: number | null;
  cost_out_per_1m?: number | null;
  enabled?: boolean;
}

export function createModel(input: CreateModelInput): PublicModel {
  const id = randomId('mdl');
  const caps = (input.capabilities ?? ['text']).join(',');
  db.prepare(
    `INSERT INTO models (id, provider_id, model_id, display_name, capabilities,
       context_window, cost_in_per_1m, cost_out_per_1m, enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.provider_id,
    input.model_id,
    input.display_name,
    caps,
    input.context_window ?? null,
    input.cost_in_per_1m ?? null,
    input.cost_out_per_1m ?? null,
    input.enabled === false ? 0 : 1,
  );
  return listAllModels().find(m => m.id === id)!;
}

export function bulkInsertModels(rows: CreateModelInput[]): number {
  const stmt = db.prepare(
    `INSERT INTO models (id, provider_id, model_id, display_name, capabilities,
       context_window, cost_in_per_1m, cost_out_per_1m, enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const tx = db.transaction((items: CreateModelInput[]) => {
    let n = 0;
    for (const r of items) {
      try {
        stmt.run(
          randomId('mdl'),
          r.provider_id,
          r.model_id,
          r.display_name,
          (r.capabilities ?? ['text']).join(','),
          r.context_window ?? null,
          r.cost_in_per_1m ?? null,
          r.cost_out_per_1m ?? null,
          r.enabled === false ? 0 : 1,
        );
        n += 1;
      } catch {
        // ignore duplicate (model_id, provider_id) collisions
      }
    }
    return n;
  });
  return tx(rows);
}

export function updateModel(
  id: string,
  patch: Partial<CreateModelInput>,
): PublicModel | null {
  const row = getModelRow(id);
  if (!row) return null;
  const caps = patch.capabilities ? patch.capabilities.join(',') : row.capabilities;
  db.prepare(
    `UPDATE models SET model_id = ?, display_name = ?, capabilities = ?,
       context_window = ?, cost_in_per_1m = ?, cost_out_per_1m = ?, enabled = ?
     WHERE id = ?`,
  ).run(
    patch.model_id ?? row.model_id,
    patch.display_name ?? row.display_name,
    caps,
    patch.context_window ?? row.context_window,
    patch.cost_in_per_1m ?? row.cost_in_per_1m,
    patch.cost_out_per_1m ?? row.cost_out_per_1m,
    patch.enabled === undefined ? row.enabled : patch.enabled ? 1 : 0,
    id,
  );
  return listAllModels().find(m => m.id === id) ?? null;
}

export function deleteModel(id: string): boolean {
  const info = db.prepare('DELETE FROM models WHERE id = ?').run(id);
  return info.changes > 0;
}

export function getModelForCall(id: string): {
  model: PublicModel;
  provider: ProviderRow;
  apiKey: string;
} | null {
  const m = listAllModels().find(x => x.id === id);
  if (!m) return null;
  const p = getProviderRow(m.provider_id);
  if (!p) return null;
  return { model: m, provider: p, apiKey: decryptProviderKey(p) };
}

export function findModelByModelId(modelId: string): PublicModel | null {
  return listAllModels().find(m => m.model_id === modelId && m.enabled) ?? null;
}
