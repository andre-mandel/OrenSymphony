import type { Edge, Node } from '@xyflow/react';
import { executeText, executeImage, pickRoute } from './calls';

export type RunStatus = 'idle' | 'running' | 'completed' | 'error';

export interface ExecutionHooks {
  onStart?: (id: string) => void;
  onStatus: (id: string, status: RunStatus, message?: string) => void;
  onResult: (id: string, result: string) => void;
}

interface NodeData {
  value?: string;
  label?: string;
  model?: string;
  prompt?: string;
  result?: string;
  status?: RunStatus;
}

function topoOrder(nodes: Node[], edges: Edge[]): Node[] | null {
  const indegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const n of nodes) {
    indegree.set(n.id, 0);
    adj.set(n.id, []);
  }
  for (const e of edges) {
    if (!indegree.has(e.target) || !adj.has(e.source)) continue;
    indegree.set(e.target, (indegree.get(e.target) ?? 0) + 1);
    adj.get(e.source)!.push(e.target);
  }
  const queue: string[] = [];
  indegree.forEach((deg, id) => { if (deg === 0) queue.push(id); });
  const order: Node[] = [];
  const byId = new Map(nodes.map(n => [n.id, n]));
  while (queue.length) {
    const id = queue.shift()!;
    const node = byId.get(id);
    if (node) order.push(node);
    for (const next of adj.get(id) ?? []) {
      const nd = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, nd);
      if (nd === 0) queue.push(next);
    }
  }
  if (order.length !== nodes.length) return null;
  return order;
}

function joinInputs(values: string[]): string {
  const filtered = values.filter(v => v && v.length > 0);
  if (filtered.length === 0) return '';
  if (filtered.length === 1) return filtered[0];
  return filtered.map((v, i) => `--- Source ${i + 1} ---\n${v}`).join('\n\n');
}

function looksLikeImageRequest(prompt: string, inputData: string): boolean {
  const blob = `${prompt}\n${inputData}`.toLowerCase();
  return /\b(image|render|illustrat|logo|photo|picture|portrait|poster|generate.*(an? )?(image|photo|picture))\b/.test(blob);
}

export async function runPipeline(
  nodes: Node[],
  edges: Edge[],
  hooks: ExecutionHooks,
): Promise<void> {
  if (nodes.length === 0) throw new Error('Canvas is empty. Drop a node first.');

  const order = topoOrder(nodes, edges);
  if (!order) throw new Error('Pipeline contains a cycle. Remove the loop before running.');

  const outputs = new Map<string, string>();
  const incoming = new Map<string, string[]>();
  nodes.forEach(n => incoming.set(n.id, []));
  for (const e of edges) incoming.get(e.target)?.push(e.source);

  for (const node of order) {
    const data = (node.data ?? {}) as NodeData;
    const sources = incoming.get(node.id) ?? [];
    const inputData = joinInputs(sources.map(s => outputs.get(s) ?? ''));

    try {
      if (node.type === 'inputNode') {
        outputs.set(node.id, data.value ?? '');
        continue;
      }

      if (node.type === 'modelNode') {
        hooks.onStart?.(node.id);
        hooks.onStatus(node.id, 'running');
        let modelId = data.model || '';
        const prompt = data.prompt || '';

        if (!modelId) {
          const decision = await pickRoute(`${prompt}\n\n${inputData}`.trim(), {
            needs_image_gen: looksLikeImageRequest(prompt, inputData),
          });
          if (!decision.model_id) throw new Error('Smart router found no enabled models.');
          modelId = decision.model_id;
        }

        let result = '';
        if (looksLikeImageRequest(prompt, inputData) && /image|imagen|dalle|flux/.test(modelId.toLowerCase())) {
          const composite = [prompt, inputData].filter(Boolean).join('\n\n');
          const img = await executeImage(modelId, composite);
          result = img ?? '';
          if (!result) throw new Error('Image generation returned no data.');
        } else {
          const out = await executeText({ modelId, prompt, inputData });
          result = out.text;
        }
        outputs.set(node.id, result);
        hooks.onResult(node.id, result);
        hooks.onStatus(node.id, 'completed');
        continue;
      }

      if (node.type === 'outputNode') {
        outputs.set(node.id, inputData);
        hooks.onResult(node.id, inputData);
        continue;
      }

      outputs.set(node.id, inputData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown failure';
      hooks.onStatus(node.id, 'error', message);
      throw err;
    }
  }
}
