import React from 'react';
import { ArrowDownToLine, ArrowUpFromLine, BrainCircuit, Image as ImageIcon, Sparkles, Eye } from 'lucide-react';
import { useModels } from '../lib/registry';

const SPECIALS = [
  { type: 'inputNode', name: 'Input Node', desc: 'Pipeline source data', icon: ArrowUpFromLine },
  { type: 'outputNode', name: 'Output Node', desc: 'Captures final result', icon: ArrowDownToLine },
];

export function Sidebar({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { data: models } = useModels();

  const onDragStart = (
    event: React.DragEvent,
    nodeType: string,
    modelId = '',
    modelName = '',
  ) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('modelId', modelId);
    event.dataTransfer.setData('modelName', modelName);
    event.dataTransfer.effectAllowed = 'move';
  };

  const enabled = models.filter(m => m.enabled);

  return (
    <aside className="w-[260px] border-r border-border bg-bg flex flex-col h-full py-8 px-5 overflow-y-auto">
      <div className="text-[11px] uppercase text-text-dim mb-3 tracking-widest font-bold">
        Sources & Sinks
      </div>
      <div className="space-y-2 mb-6">
        {SPECIALS.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.type}
              className="bg-surface border border-border p-3 rounded-lg cursor-grab active:cursor-grabbing flex items-center gap-3"
              onDragStart={(e) => onDragStart(e, s.type)}
              draggable
            >
              <Icon className="w-4 h-4 text-accent flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{s.name}</div>
                <div className="text-[10px] text-text-dim truncate">{s.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-[11px] uppercase text-text-dim mb-3 tracking-widest font-bold flex items-center justify-between">
        <span>Models ({enabled.length})</span>
        <button onClick={onOpenSettings} className="text-[10px] normal-case text-accent hover:underline">manage</button>
      </div>

      <div className="space-y-2">
        {enabled.length === 0 && (
          <button onClick={onOpenSettings} className="w-full text-left bg-surface border border-dashed border-border p-3 rounded-lg text-text-dim text-xs hover:border-accent hover:text-text-main transition-colors">
            No models yet — open Settings to add a provider and import a model catalog.
          </button>
        )}
        {enabled.map((m) => {
          const Icon = pickIcon(m.capabilities);
          return (
            <div
              key={m.id}
              className="bg-surface border border-border p-3 rounded-lg cursor-grab active:cursor-grabbing flex items-center gap-3"
              onDragStart={(e) => onDragStart(e, 'modelNode', m.model_id, m.display_name)}
              draggable
              title={m.model_id}
            >
              <Icon className="w-4 h-4 text-text-dim flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{m.display_name}</div>
                <div className="text-[10px] text-text-dim truncate">{m.provider_name} · {m.capabilities.join(',')}</div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function pickIcon(capabilities: string[]) {
  if (capabilities.includes('image')) return ImageIcon;
  if (capabilities.includes('vision')) return Eye;
  if (capabilities.includes('text')) return BrainCircuit;
  return Sparkles;
}
