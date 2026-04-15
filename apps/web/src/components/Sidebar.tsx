import React from 'react';
import { BrainCircuit, Image as ImageIcon, Code, Database, Sparkles, GripVertical } from 'lucide-react';

const AVAILABLE_MODELS = [
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', icon: BrainCircuit, desc: 'Google • Multimodal' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', icon: Sparkles, desc: 'Google • Fast' },
  { id: 'gemini-3.1-flash-image-preview', name: 'Gemini Image', icon: ImageIcon, desc: 'Google • Image' },
  { id: 'claude-3-opus', name: 'Claude 3 Opus', icon: BrainCircuit, desc: 'Anthropic • Logic' },
  { id: 'cursor-ai', name: 'Cursor AI', icon: Code, desc: 'Cursor • Code' },
  { id: 'jules-ai', name: 'Jules AI', icon: Database, desc: 'Jules • Data' },
];

export function Sidebar() {
  const onDragStart = (event: React.DragEvent, nodeType: string, modelId: string, modelName: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('modelId', modelId);
    event.dataTransfer.setData('modelName', modelName);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="w-[240px] border-r border-border bg-bg flex flex-col h-full py-8 px-5">
      <div className="text-[11px] uppercase text-text-dim mb-5 tracking-widest font-bold">
        Models available
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-3">
        {AVAILABLE_MODELS.map((model) => {
          return (
            <div
              key={model.id}
              className="bg-surface border border-border p-3 rounded-lg cursor-grab active:cursor-grabbing"
              onDragStart={(e) => onDragStart(e, 'modelNode', model.id, model.name)}
              draggable
            >
              <div className="text-sm font-semibold mb-1">{model.name}</div>
              <div className="text-[10px] text-text-dim">{model.desc}</div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
