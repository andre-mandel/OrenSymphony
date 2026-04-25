import React from 'react';
import type { Node } from '@xyflow/react';
import { Trash2 } from 'lucide-react';
import { useModels } from '../lib/registry';

interface InspectorProps {
  node: Node | null;
  onPatch: (id: string, patch: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
}

interface NodeData {
  value?: string;
  label?: string;
  model?: string;
  prompt?: string;
  result?: string;
  status?: string;
  error?: string;
}

export function Inspector({ node, onPatch, onDelete }: InspectorProps) {
  const { data: models } = useModels();

  if (!node) {
    return (
      <div className="text-text-dim text-xs italic leading-relaxed">
        Click a node on the canvas to edit its label, prompt, model, or input value. Drag from the
        left palette to add new nodes.
      </div>
    );
  }
  const data = (node.data ?? {}) as NodeData;
  const kind = node.type === 'inputNode' ? 'Input' : node.type === 'outputNode' ? 'Output' : 'Model step';
  const enabledModels = models.filter(m => m.enabled);

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase font-bold tracking-widest text-text-dim">{kind}</div>
        <button onClick={() => onDelete(node.id)} title="Delete node" className="text-text-dim hover:text-accent transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {node.type === 'inputNode' && (
        <Field label="Input value">
          <textarea
            rows={6}
            value={data.value ?? ''}
            onChange={(e) => onPatch(node.id, { value: e.target.value })}
            className="w-full bg-surface border border-border rounded p-2 text-xs text-text-main focus:outline-none focus:border-accent font-mono"
          />
        </Field>
      )}

      {node.type === 'modelNode' && (
        <>
          <Field label="Label">
            <input
              type="text"
              value={data.label ?? ''}
              onChange={(e) => onPatch(node.id, { label: e.target.value })}
              className="w-full bg-surface border border-border rounded px-2 py-1.5 text-xs text-text-main focus:outline-none focus:border-accent"
            />
          </Field>
          <Field label="Model">
            <select
              value={data.model ?? ''}
              onChange={(e) => onPatch(node.id, { model: e.target.value })}
              className="w-full bg-surface border border-border rounded px-2 py-1.5 text-xs text-text-main focus:outline-none focus:border-accent"
            >
              <option value="">Auto (smart route at run time)</option>
              {enabledModels.map(m => (
                <option key={m.id} value={m.model_id}>
                  {m.display_name} · {m.provider_name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="System prompt / instruction">
            <textarea
              rows={6}
              value={data.prompt ?? ''}
              onChange={(e) => onPatch(node.id, { prompt: e.target.value })}
              className="w-full bg-surface border border-border rounded p-2 text-xs text-text-main focus:outline-none focus:border-accent font-mono"
            />
          </Field>
          {data.status && (
            <div className="text-[10px] uppercase tracking-widest">
              Status: <span className={statusColor(data.status)}>{data.status}</span>
              {data.error && <span className="text-red-400 ml-2 normal-case">{data.error}</span>}
            </div>
          )}
          {data.result && !data.result.startsWith('data:image') && (
            <Field label="Last result">
              <div className="text-[11px] bg-surface border border-border rounded p-2 max-h-48 overflow-y-auto whitespace-pre-wrap text-text-dim">
                {data.result}
              </div>
            </Field>
          )}
        </>
      )}

      {node.type === 'outputNode' && (
        <Field label="Result">
          {data.result ? (
            data.result.startsWith('data:image') ? (
              <img src={data.result} alt="Generated" className="rounded border border-border" />
            ) : (
              <div className="text-[11px] bg-surface border border-border rounded p-2 max-h-72 overflow-y-auto whitespace-pre-wrap">
                {data.result}
              </div>
            )
          ) : (
            <div className="text-[11px] italic text-text-dim">Run the pipeline to populate this node.</div>
          )}
        </Field>
      )}
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

function statusColor(status: string): string {
  switch (status) {
    case 'running': return 'text-accent';
    case 'completed': return 'text-emerald-400';
    case 'error': return 'text-red-400';
    default: return 'text-text-dim';
  }
}
