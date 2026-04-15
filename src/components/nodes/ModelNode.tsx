import { Handle, Position } from '@xyflow/react';
import { cn } from '../../lib/utils';

export function ModelNode({ data, isConnectable }: any) {
  return (
    <div className="relative min-w-[160px] h-[160px] rounded-xl bg-text-main text-bg p-6 shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex flex-col justify-between">
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-bg border-2 border-text-main"
      />
      
      <div>
        <div className="text-[10px] font-extrabold uppercase">{data.label}</div>
        <div className="text-2xl font-black leading-none mt-1">{data.model?.split('-')[0] || 'Model'}</div>
      </div>
      
      {data.prompt && (
        <div className="text-[10px] font-medium opacity-80 line-clamp-2">
          {data.prompt}
        </div>
      )}
      
      {data.status === 'running' && (
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
