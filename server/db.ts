import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { env } from './env.ts';

fs.mkdirSync(env.DATA_DIR, { recursive: true });
const dbPath = path.join(env.DATA_DIR, 'orensymphony.sqlite');

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS kv (
    k TEXT PRIMARY KEY,
    v TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,           -- 'openai_compatible' | 'anthropic' | 'google' | 'openrouter'
    base_url TEXT,
    api_key_enc TEXT NOT NULL,
    extra_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS models (
    id TEXT PRIMARY KEY,
    provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    model_id TEXT NOT NULL,        -- e.g. "gpt-4o", "claude-sonnet-4-6"
    display_name TEXT NOT NULL,
    capabilities TEXT NOT NULL DEFAULT 'text',   -- comma list: text,image,tool_use,vision
    context_window INTEGER,
    cost_in_per_1m REAL,
    cost_out_per_1m REAL,
    enabled INTEGER NOT NULL DEFAULT 1,
    extra_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS models_provider_idx ON models(provider_id);

  CREATE TABLE IF NOT EXISTS mcp_servers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    transport TEXT NOT NULL,         -- 'sse' | 'http'
    url TEXT NOT NULL,
    headers_enc TEXT NOT NULL DEFAULT '',
    enabled INTEGER NOT NULL DEFAULT 1,
    last_error TEXT,
    last_connected_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS mcp_tools (
    id TEXT PRIMARY KEY,
    server_id TEXT NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    schema_json TEXT NOT NULL DEFAULT '{}',
    enabled INTEGER NOT NULL DEFAULT 1
  );

  CREATE INDEX IF NOT EXISTS mcp_tools_server_idx ON mcp_tools(server_id);
`);

export function getKV(key: string): string | null {
  const row = db.prepare('SELECT v FROM kv WHERE k = ?').get(key) as { v: string } | undefined;
  return row?.v ?? null;
}

export function setKV(key: string, value: string): void {
  db.prepare(
    'INSERT INTO kv(k, v) VALUES(?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v',
  ).run(key, value);
}

export function deleteKV(key: string): void {
  db.prepare('DELETE FROM kv WHERE k = ?').run(key);
}
