import { Handle, Position } from '@xyflow/react';

export function OutputNode({ data, isConnectable }: any) {
  return (
    <div className="relative min-w-[160px] h-[160px] rounded-xl bg-accent text-bg p-6 shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex flex-col justify-between">
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-bg border-2 border-accent"
      />
      
      <div>
        <div className="text-[10px] font-extrabold uppercase">Output</div>
        <div className="text-2xl font-black leading-none mt-1">Result</div>
      </div>
      
      {data.result ? (
        data.result.startsWith('data:image') ? (
          <img src={data.result} alt="Generated" className="mt-2 rounded w-full h-12 object-cover" />
        ) : (
          <div className="text-[10px] font-medium opacity-80 line-clamp-2">
            {data.result}
          </div>
        )
      ) : (
        <div className="text-[10px] font-medium opacity-50 italic">
          Waiting...
        </div>
      )}
    </div>
  );
}
