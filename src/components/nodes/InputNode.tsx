import { Handle, Position } from '@xyflow/react';
import { cn } from '../../lib/utils';

interface InputNodeData {
  value?: string;
  label?: string;
}

interface InputNodeProps {
  data: InputNodeData;
  selected?: boolean;
  isConnectable?: boolean;
}

export function InputNode({ data, selected, isConnectable }: InputNodeProps) {
  return (
    <div
      className={cn(
        'relative min-w-[180px] h-[170px] rounded-xl bg-text-main text-bg p-5 shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex flex-col justify-between',
        selected && 'ring-2 ring-accent ring-offset-2 ring-offset-bg',
      )}
    >
      <div>
        <div className="text-[10px] font-extrabold uppercase">{data.label || 'Input'}</div>
        <div className="text-2xl font-black leading-none mt-1">Data</div>
      </div>

      <div className="text-[10px] font-medium opacity-80 line-clamp-3 whitespace-pre-wrap">
        {data.value && data.value.length > 0 ? data.value : 'No input provided. Click to edit.'}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-bg border-2 border-text-main"
      />
    </div>
  );
}
