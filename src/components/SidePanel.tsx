import React, { useEffect, useState } from 'react';
import type { Node } from '@xyflow/react';
import { Inspector } from './Inspector';
import { ChatPanel } from './ChatPanel';
import { cn } from '../lib/utils';

interface SidePanelProps {
  selectedNode: Node | null;
  onPatchNode: (id: string, patch: Record<string, unknown>) => void;
  onDeleteNode: (id: string) => void;
}

type Tab = 'inspector' | 'chat';

export function SidePanel({ selectedNode, onPatchNode, onDeleteNode }: SidePanelProps) {
  const [tab, setTab] = useState<Tab>('inspector');

  useEffect(() => {
    if (selectedNode) setTab('inspector');
  }, [selectedNode?.id]);

  return (
    <aside className="w-[320px] border-l border-border bg-[#080808] flex flex-col h-full py-6 px-5">
      <div className="flex gap-2 mb-5">
        <TabBtn active={tab === 'inspector'} onClick={() => setTab('inspector')}>Inspector</TabBtn>
        <TabBtn active={tab === 'chat'} onClick={() => setTab('chat')}>Chat</TabBtn>
      </div>
      <div className="flex-1 min-h-0">
        {tab === 'inspector' ? (
          <div className="overflow-y-auto h-full pr-1">
            <Inspector node={selectedNode} onPatch={onPatchNode} onDelete={onDeleteNode} />
          </div>
        ) : (
          <ChatPanel />
        )}
      </div>
    </aside>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold rounded border transition-colors',
        active ? 'bg-accent text-bg border-accent' : 'border-border text-text-dim hover:text-text-main',
      )}
    >
      {children}
    </button>
  );
}
