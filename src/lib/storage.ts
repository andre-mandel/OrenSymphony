import type { Edge, Node } from '@xyflow/react';

const STORAGE_KEY = 'orensymphony.pipeline.v1';

export interface SavedPipeline {
  nodes: Node[];
  edges: Edge[];
  savedAt: string;
}

function stripVolatile(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== 'object') return {};
  const { status: _status, ...rest } = data as Record<string, unknown>;
  return rest;
}

function sanitizeNodes(nodes: Node[]): Node[] {
  return nodes.map(n => ({ ...n, data: stripVolatile(n.data) }));
}

export function persistPipeline(nodes: Node[], edges: Edge[]): void {
  try {
    const payload: SavedPipeline = {
      nodes: sanitizeNodes(nodes),
      edges,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota / serialization errors
  }
}

export function loadPersistedPipeline(): SavedPipeline | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedPipeline;
    if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPersistedPipeline(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
}

export function downloadPipeline(nodes: Node[], edges: Edge[]): void {
  const payload = { nodes: sanitizeNodes(nodes), edges, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `orensymphony-pipeline-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function readPipelineFile(file: File): Promise<{ nodes: Node[]; edges: Edge[] } | null> {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!Array.isArray(data?.nodes) || !Array.isArray(data?.edges)) return null;
    return { nodes: data.nodes as Node[], edges: data.edges as Edge[] };
  } catch {
    return null;
  }
}
