import { Handle, Position } from '@xyflow/react';
import { cn } from '../../lib/utils';

interface OutputNodeData {
  result?: string;
  label?: string;
}

interface OutputNodeProps {
  data: OutputNodeData;
  selected?: boolean;
  isConnectable?: boolean;
}

export function OutputNode({ data, selected, isConnectable }: OutputNodeProps) {
  return (
    <div
      className={cn(
        'relative min-w-[180px] h-[170px] rounded-xl bg-accent text-bg p-5 shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex flex-col justify-between',
        selected && 'ring-2 ring-text-main ring-offset-2 ring-offset-bg',
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-bg border-2 border-accent"
      />

      <div>
        <div className="text-[10px] font-extrabold uppercase">{data.label || 'Output'}</div>
        <div className="text-2xl font-black leading-none mt-1">Result</div>
      </div>

      {data.result ? (
        data.result.startsWith('data:image') ? (
          <img src={data.result} alt="Generated" className="mt-2 rounded w-full h-12 object-cover" />
        ) : (
          <div className="text-[10px] font-medium opacity-80 line-clamp-3 whitespace-pre-wrap">
            {data.result}
          </div>
        )
      ) : (
        <div className="text-[10px] font-medium opacity-50 italic">Waiting…</div>
      )}
    </div>
  );
}
