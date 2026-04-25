import crypto from 'node:crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { db } from './db.ts';
import { decryptSecret, encryptSecret } from './crypto.ts';
import type { ToolCall, ToolDef } from './providers/types.ts';

export interface MCPServerRow {
  id: string;
  name: string;
  transport: 'sse' | 'http';
  url: string;
  headers_enc: string;
  enabled: number;
  last_error: string | null;
  last_connected_at: string | null;
  created_at: string;
}

export interface PublicMCPServer {
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

export interface PublicMCPTool {
  id: string;
  server_id: string;
  server_name: string;
  name: string;
  description: string;
  enabled: boolean;
}

const clients = new Map<string, Client>();

function rid(p: string): string { return `${p}_${crypto.randomBytes(8).toString('hex')}`; }

function rowToServer(r: MCPServerRow & { tool_count: number }): PublicMCPServer {
  return {
    id: r.id,
    name: r.name,
    transport: r.transport,
    url: r.url,
    has_headers: r.headers_enc.length > 0,
    enabled: r.enabled === 1,
    last_error: r.last_error,
    last_connected_at: r.last_connected_at,
    tool_count: r.tool_count,
  };
}

export function listMcpServers(): PublicMCPServer[] {
  const rows = db
    .prepare(
      `SELECT s.*, (SELECT COUNT(*) FROM mcp_tools t WHERE t.server_id = s.id) AS tool_count
       FROM mcp_servers s ORDER BY created_at DESC`,
    )
    .all() as Array<MCPServerRow & { tool_count: number }>;
  return rows.map(rowToServer);
}

export function listMcpTools(): PublicMCPTool[] {
  const rows = db
    .prepare(
      `SELECT t.*, s.name AS server_name FROM mcp_tools t
       JOIN mcp_servers s ON s.id = t.server_id ORDER BY s.name, t.name`,
    )
    .all() as Array<{
      id: string; server_id: string; server_name: string;
      name: string; description: string | null; enabled: number;
    }>;
  return rows.map(r => ({
    id: r.id,
    server_id: r.server_id,
    server_name: r.server_name,
    name: r.name,
    description: r.description ?? '',
    enabled: r.enabled === 1,
  }));
}

export function getMcpServerRow(id: string): MCPServerRow | null {
  const r = db.prepare('SELECT * FROM mcp_servers WHERE id = ?').get(id) as MCPServerRow | undefined;
  return r ?? null;
}

export function createMcpServer(input: {
  name: string; transport: 'sse' | 'http'; url: string; headers?: Record<string, string>;
}): PublicMCPServer {
  const id = rid('mcp');
  const headersEnc = input.headers && Object.keys(input.headers).length > 0
    ? encryptSecret(JSON.stringify(input.headers))
    : '';
  db.prepare(
    `INSERT INTO mcp_servers (id, name, transport, url, headers_enc) VALUES (?, ?, ?, ?, ?)`,
  ).run(id, input.name, input.transport, input.url, headersEnc);
  return listMcpServers().find(s => s.id === id)!;
}

export function deleteMcpServer(id: string): boolean {
  const c = clients.get(id);
  if (c) {
    c.close().catch(() => {});
    clients.delete(id);
  }
  return db.prepare('DELETE FROM mcp_servers WHERE id = ?').run(id).changes > 0;
}

async function connect(row: MCPServerRow): Promise<Client> {
  const cached = clients.get(row.id);
  if (cached) return cached;

  const headers: Record<string, string> = row.headers_enc
    ? (JSON.parse(decryptSecret(row.headers_enc)) as Record<string, string>)
    : {};

  const client = new Client(
    { name: 'orensymphony', version: '0.1.0' },
    { capabilities: {} },
  );
  const url = new URL(row.url);
  if (row.transport === 'sse') {
    const transport = new SSEClientTransport(url, {
      requestInit: { headers },
      eventSourceInit: { headers },
    } as never);
    await client.connect(transport);
  } else {
    const transport = new StreamableHTTPClientTransport(url, {
      requestInit: { headers },
    } as never);
    await client.connect(transport);
  }
  clients.set(row.id, client);
  return client;
}

export async function refreshMcpTools(serverId: string): Promise<{ count: number }> {
  const row = getMcpServerRow(serverId);
  if (!row) throw new Error('MCP server not found');
  try {
    const client = await connect(row);
    const list = await client.listTools();
    const tools = list.tools ?? [];
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM mcp_tools WHERE server_id = ?').run(serverId);
      const stmt = db.prepare(
        `INSERT INTO mcp_tools (id, server_id, name, description, schema_json, enabled)
         VALUES (?, ?, ?, ?, ?, 1)`,
      );
      for (const t of tools) {
        stmt.run(
          rid('tool'),
          serverId,
          t.name,
          t.description ?? '',
          JSON.stringify(t.inputSchema ?? {}),
        );
      }
    });
    tx();
    db.prepare(
      `UPDATE mcp_servers SET last_error = NULL, last_connected_at = datetime('now') WHERE id = ?`,
    ).run(serverId);
    return { count: tools.length };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown failure';
    db.prepare(`UPDATE mcp_servers SET last_error = ? WHERE id = ?`).run(message.slice(0, 400), serverId);
    throw e;
  }
}

export function getEnabledToolDefs(): Array<ToolDef & { _server_id: string }> {
  const rows = db
    .prepare(
      `SELECT t.*, s.id AS server_id, s.enabled AS server_enabled
       FROM mcp_tools t JOIN mcp_servers s ON s.id = t.server_id
       WHERE t.enabled = 1 AND s.enabled = 1`,
    )
    .all() as Array<{
      name: string; description: string | null; schema_json: string; server_id: string;
    }>;
  return rows.map(r => ({
    name: r.name,
    description: r.description ?? '',
    parameters: safeJSON(r.schema_json) as Record<string, unknown>,
    _server_id: r.server_id,
  }));
}

function safeJSON(s: string): unknown {
  try { return JSON.parse(s); } catch { return {}; }
}

export async function invokeMcpTool(call: ToolCall): Promise<string> {
  const row = db
    .prepare(
      `SELECT s.* FROM mcp_servers s
       JOIN mcp_tools t ON t.server_id = s.id
       WHERE t.name = ? AND t.enabled = 1 AND s.enabled = 1
       LIMIT 1`,
    )
    .get(call.name) as MCPServerRow | undefined;
  if (!row) throw new Error(`No enabled MCP tool registered as "${call.name}"`);
  const client = await connect(row);
  const result = await client.callTool({ name: call.name, arguments: call.arguments });
  if (Array.isArray(result.content)) {
    return result.content.map(c => (c as { text?: string }).text ?? '').join('\n');
  }
  return JSON.stringify(result);
}
