import React from 'react';
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { AVAILABLE_MODELS } from '../lib/models';

const SPECIALS = [
  { type: 'inputNode', name: 'Input Node', desc: 'Pipeline source data', icon: ArrowUpFromLine },
  { type: 'outputNode', name: 'Output Node', desc: 'Captures final result', icon: ArrowDownToLine },
];

export function Sidebar() {
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

  return (
    <aside className="w-[240px] border-r border-border bg-bg flex flex-col h-full py-8 px-5 overflow-y-auto">
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

      <div className="text-[11px] uppercase text-text-dim mb-3 tracking-widest font-bold">
        Models available
      </div>
      <div className="space-y-2">
        {AVAILABLE_MODELS.map((model) => {
          const Icon = model.icon;
          return (
            <div
              key={model.id}
              className="bg-surface border border-border p-3 rounded-lg cursor-grab active:cursor-grabbing flex items-center gap-3"
              onDragStart={(e) => onDragStart(e, 'modelNode', model.id, model.name)}
              draggable
            >
              <Icon className="w-4 h-4 text-text-dim flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{model.name}</div>
                <div className="text-[10px] text-text-dim truncate">{model.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
