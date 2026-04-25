import { Handle, Position } from '@xyflow/react';
import { cn } from '../../lib/utils';

interface ModelNodeData {
  label?: string;
  model?: string;
  prompt?: string;
  status?: 'idle' | 'running' | 'completed' | 'error';
  result?: string;
  error?: string;
}

interface ModelNodeProps {
  data: ModelNodeData;
  selected?: boolean;
  isConnectable?: boolean;
}

export function ModelNode({ data, selected, isConnectable }: ModelNodeProps) {
  const status = data.status ?? 'idle';
  return (
    <div
      className={cn(
        'relative min-w-[180px] h-[170px] rounded-xl bg-text-main text-bg p-5 shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex flex-col justify-between transition-shadow',
        selected && 'ring-2 ring-accent ring-offset-2 ring-offset-bg',
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-bg border-2 border-text-main"
      />

      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] font-extrabold uppercase truncate">{data.label || 'Model'}</div>
          <StatusDot status={status} />
        </div>
        <div className="text-2xl font-black leading-none mt-1 truncate">
          {(data.model && data.model.split('-')[0]) || 'Model'}
        </div>
      </div>

      {data.prompt && (
        <div className="text-[10px] font-medium opacity-80 line-clamp-2">{data.prompt}</div>
      )}

      {status === 'error' && data.error && (
        <div className="text-[10px] font-medium text-red-700 line-clamp-1">{data.error}</div>
      )}

      {status === 'running' && (
        <div className="absolute inset-0 rounded-xl border-2 border-accent animate-pulse pointer-events-none" />
      )}

      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-bg border-2 border-text-main"
      />
    </div>
  );
}

function StatusDot({ status }: { status: ModelNodeData['status'] }) {
  const cls =
    status === 'running' ? 'bg-amber-500 animate-pulse'
    : status === 'completed' ? 'bg-emerald-500'
    : status === 'error' ? 'bg-red-500'
    : 'bg-neutral-400';
  return <span className={cn('w-2 h-2 rounded-full inline-block', cls)} aria-label={status} />;
}
