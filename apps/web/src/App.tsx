import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  Connection,
  Edge,
  Node
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { v4 as uuidv4 } from 'uuid';

import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { ChatPanel } from './components/ChatPanel';
import { ModelNode } from './components/nodes/ModelNode';
import { InputNode } from './components/nodes/InputNode';
import { OutputNode } from './components/nodes/OutputNode';
import { generatePipeline, executeTextModel, generateImage } from './lib/gemini';
import { useCollabGraph } from './lib/collab';

const nodeTypes = {
  modelNode: ModelNode,
  inputNode: InputNode,
  outputNode: OutputNode,
};

const initialNodes: Node[] = [
  {
    id: 'input-1',
    type: 'inputNode',
    position: { x: 50, y: 200 },
    data: { value: 'Write a short story about a space cat.' },
  },
  {
    id: 'model-1',
    type: 'modelNode',
    position: { x: 350, y: 200 },
    data: { 
      label: 'Story Writer', 
      model: 'gemini-3.1-pro-preview',
      prompt: 'You are a creative writer. Write a 2 paragraph story based on the input.'
    },
  },
  {
    id: 'output-1',
    type: 'outputNode',
    position: { x: 700, y: 200 },
    data: { result: '' },
  }
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: 'input-1', target: 'model-1', animated: true, style: { stroke: '#6366f1' } },
  { id: 'e2-3', source: 'model-1', target: 'output-1', animated: true, style: { stroke: '#6366f1' } },
];

function Orchestrator() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { yNodes, yEdges, setYNodes, setYEdges } = useCollabGraph({
    room: 'default',
    initial: { nodes: initialNodes, edges: initialEdges },
  });

  const [nodes, setNodes, onNodesChange] = useNodesState(yNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(yEdges);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  // Pull remote updates into local state.
  useEffect(() => {
    setNodes(yNodes);
  }, [yNodes, setNodes]);
  useEffect(() => {
    setEdges(yEdges);
  }, [yEdges, setEdges]);

  // Push local updates to shared doc.
  useEffect(() => {
    setYNodes(nodes);
  }, [nodes, setYNodes]);
  useEffect(() => {
    setYEdges(edges);
  }, [edges, setYEdges]);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#6366f1' } } as Edge, eds)),
    [setEdges],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      const modelId = event.dataTransfer.getData('modelId');
      const modelName = event.dataTransfer.getData('modelName');

      if (typeof type === 'undefined' || !type) {
        return;
      }

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!reactFlowBounds) return;

      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };

      const newNode: Node = {
        id: uuidv4(),
        type,
        position,
        data: { 
          label: modelName || 'New Node',
          model: modelId,
          prompt: 'Process the input data.'
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes],
  );

  const handleAutoOrchestrate = async (prompt: string) => {
    setIsGenerating(true);
    try {
      const pipeline = await generatePipeline(prompt);
      if (pipeline.nodes && pipeline.nodes.length > 0) {
        // Map the generated nodes to our node format
        const newNodes = pipeline.nodes.map(n => ({
          ...n,
          id: n.id || uuidv4(),
          type: n.type || 'modelNode',
          position: n.position || { x: Math.random() * 500, y: Math.random() * 500 },
          data: {
            ...n.data,
            status: 'idle'
          }
        }));
        
        const newEdges = (pipeline.edges || []).map(e => ({
          ...e,
          id: e.id || uuidv4(),
          animated: true,
          style: { stroke: '#6366f1' }
        }));

        setNodes(newNodes);
        setEdges(newEdges);
      }
    } catch (error) {
      console.error("Failed to auto-orchestrate", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const runPipeline = async () => {
    if (isRunning) return;
    setIsRunning(true);
    
    // Reset statuses
    setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, status: 'idle', result: '' } })));

    // Simple execution engine (assumes linear or simple DAG)
    // Find input node
    const inputNode = nodes.find(n => n.type === 'inputNode');
    if (!inputNode) {
      setIsRunning(false);
      return;
    }

    let currentData: string = (inputNode.data.value as string) || '';
    let currentNodeId = inputNode.id;

    try {
      while (true) {
        // Find next edge
        const nextEdge = edges.find(e => e.source === currentNodeId);
        if (!nextEdge) break;

        const nextNode = nodes.find(n => n.id === nextEdge.target);
        if (!nextNode) break;

        if (nextNode.type === 'modelNode') {
          // Update status to running
          setNodes(nds => nds.map(n => n.id === nextNode.id ? { ...n, data: { ...n.data, status: 'running' } } : n));
          
          let result = '';
          const nodeData = nextNode.data as any;
          if (nodeData.model === 'gemini-3.1-flash-image-preview') {
            result = await generateImage(nodeData.prompt + " " + currentData) || '';
          } else {
            result = await executeTextModel(nodeData.model, nodeData.prompt, currentData);
          }
          
          currentData = result;
          
          // Update status to completed
          setNodes(nds => nds.map(n => n.id === nextNode.id ? { ...n, data: { ...n.data, status: 'completed' } } : n));
        } else if (nextNode.type === 'outputNode') {
          setNodes(nds => nds.map(n => n.id === nextNode.id ? { ...n, data: { ...n.data, result: currentData } } : n));
        }

        currentNodeId = nextNode.id;
      }
    } catch (error) {
      console.error("Pipeline execution failed", error);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-bg text-text-main overflow-hidden font-sans">
      <TopBar 
        onAutoOrchestrate={handleAutoOrchestrate} 
        isGenerating={isGenerating} 
        onRunPipeline={runPipeline}
        isRunning={isRunning}
      />
      
      <div className="flex flex-1 relative z-10 overflow-hidden">
        <Sidebar />
        
        <main className="flex-1 relative bg-[radial-gradient(circle_at_50%_50%,#111_0%,#050505_100%)]" ref={reactFlowWrapper}>
          <div className="absolute top-10 left-10 pointer-events-none z-10">
            <h1 className="text-[64px] font-extrabold leading-[0.9] tracking-[-2px]">
              CROSS-MODEL<br/>SEQUENCER
            </h1>
          </div>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
            className="bg-transparent"
          >
            <Background color="#ffffff" gap={24} size={1} opacity={0.05} />
            <Controls className="bg-surface border border-border fill-text-main" />
          </ReactFlow>
        </main>

        <ChatPanel />
      </div>

      <footer className="h-[60px] border-t border-border bg-bg flex items-center justify-between px-10 text-[11px] text-text-dim z-20">
        <div className="flex gap-5">
          <span className="flex items-center"><span className="inline-block w-2 h-2 bg-accent rounded-full mr-1.5"></span>MCP ACTIVE</span>
          <span>LATENCY: 14MS</span>
          <span>COST: $0.12/JOB</span>
        </div>
        <div>SESSION ID: X-992-ALPHA-ORCH</div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <Orchestrator />
    </ReactFlowProvider>
  );
}
