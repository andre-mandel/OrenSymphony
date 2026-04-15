import { Handle, Position } from '@xyflow/react';

export function InputNode({ data, isConnectable }: any) {
  return (
    <div className="relative min-w-[160px] h-[160px] rounded-xl bg-text-main text-bg p-6 shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex flex-col justify-between">
      <div>
        <div className="text-[10px] font-extrabold uppercase">Input Model</div>
        <div className="text-2xl font-black leading-none mt-1">Data</div>
      </div>
      
      <div className="text-[10px] font-medium opacity-80 line-clamp-2">
        {data.value || 'No input provided'}
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
