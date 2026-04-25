import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Node,
  MiniMap,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { v4 as uuidv4 } from 'uuid';

import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { SidePanel } from './components/SidePanel';
import { ToastStack, type ToastMessage, type ToastTone } from './components/Toast';
import { ModelNode } from './components/nodes/ModelNode';
import { InputNode } from './components/nodes/InputNode';
import { OutputNode } from './components/nodes/OutputNode';
import { generatePipeline, HAS_API_KEY } from './lib/gemini';
import { runPipeline, type RunStatus } from './lib/pipeline';
import {
  persistPipeline,
  loadPersistedPipeline,
  clearPersistedPipeline,
  downloadPipeline,
  readPipelineFile,
} from './lib/storage';

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
      prompt: 'You are a creative writer. Write a 2-paragraph story based on the input.',
    },
  },
  {
    id: 'output-1',
    type: 'outputNode',
    position: { x: 700, y: 200 },
    data: { result: '' },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: 'input-1', target: 'model-1', animated: true, style: { stroke: '#6366f1' } },
  { id: 'e2-3', source: 'model-1', target: 'output-1', animated: true, style: { stroke: '#6366f1' } },
];

const DEFAULT_PROMPTS: Record<string, string> = {
  inputNode: '',
  outputNode: '',
  modelNode: 'Process the input data.',
};

function Orchestrator() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const pushToast = useCallback((text: string, tone: ToastTone = 'info') => {
    setToasts(prev => [...prev, { id: uuidv4(), text, tone }]);
  }, []);
  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Hydrate from localStorage once.
  useEffect(() => {
    const saved = loadPersistedPipeline();
    if (saved && saved.nodes.length > 0) {
      setNodes(saved.nodes);
      setEdges(saved.edges);
      pushToast('Restored your last pipeline from this browser.', 'info');
    }
    if (!HAS_API_KEY) {
      pushToast(
        'GEMINI_API_KEY is not set. Add it to .env.local and restart `npm run dev` to enable model calls.',
        'error',
      );
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-persist after hydration.
  useEffect(() => {
    if (!hydrated) return;
    const handle = setTimeout(() => persistPipeline(nodes, edges), 300);
    return () => clearTimeout(handle);
  }, [nodes, edges, hydrated]);

  const onConnect = useCallback(
    (params: Connection | Edge) =>
      setEdges(eds => addEdge({ ...params, animated: true, style: { stroke: '#6366f1' } } as Edge, eds)),
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
      if (!type) return;

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!reactFlowBounds) return;

      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };

      let data: Record<string, unknown>;
      if (type === 'inputNode') {
        data = { value: '' };
      } else if (type === 'outputNode') {
        data = { result: '' };
      } else {
        data = {
          label: modelName || 'New Step',
          model: modelId || 'gemini-3-flash-preview',
          prompt: DEFAULT_PROMPTS[type] ?? '',
        };
      }

      const newNode: Node = { id: uuidv4(), type, position, data };
      setNodes(nds => nds.concat(newNode));
      setSelectedNodeId(newNode.id);
    },
    [setNodes],
  );

  const handleAutoOrchestrate = async (prompt: string) => {
    setIsGenerating(true);
    try {
      const pipeline = await generatePipeline(prompt);
      if (!pipeline.nodes || pipeline.nodes.length === 0) {
        pushToast('Generator returned an empty pipeline. Try rephrasing the request.', 'error');
        return;
      }
      const newNodes: Node[] = pipeline.nodes.map(n => ({
        id: n.id || uuidv4(),
        type: n.type || 'modelNode',
        position: n.position || { x: Math.random() * 500, y: Math.random() * 500 },
        data: { ...n.data, status: 'idle' },
      }));
      const newEdges: Edge[] = (pipeline.edges || []).map(e => ({
        id: e.id || uuidv4(),
        source: e.source,
        target: e.target,
        animated: true,
        style: { stroke: '#6366f1' },
      }));
      setNodes(newNodes);
      setEdges(newEdges);
      setSelectedNodeId(null);
      pushToast(`Generated a pipeline with ${newNodes.length} nodes.`, 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to auto-orchestrate.';
      pushToast(message, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const patchNode = useCallback((id: string, patch: Record<string, unknown>) => {
    setNodes(nds =>
      nds.map(n => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
    );
  }, [setNodes]);

  const deleteNode = useCallback((id: string) => {
    setNodes(nds => nds.filter(n => n.id !== id));
    setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
    setSelectedNodeId(prev => (prev === id ? null : prev));
  }, [setNodes, setEdges]);

  const selectedNode = useMemo(
    () => nodes.find(n => n.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );

  const handleClear = useCallback(() => {
    if (!confirm('Clear the entire canvas? This will also remove the saved pipeline in this browser.')) return;
    setNodes([]);
    setEdges([]);
    setSelectedNodeId(null);
    clearPersistedPipeline();
    pushToast('Canvas cleared.', 'info');
  }, [setNodes, setEdges, pushToast]);

  const handleSave = useCallback(() => {
    persistPipeline(nodes, edges);
    pushToast('Pipeline saved to this browser.', 'success');
  }, [nodes, edges, pushToast]);

  const handleExport = useCallback(() => {
    if (nodes.length === 0) {
      pushToast('Nothing to export — add some nodes first.', 'error');
      return;
    }
    downloadPipeline(nodes, edges);
    pushToast('Pipeline exported as JSON.', 'success');
  }, [nodes, edges, pushToast]);

  const handleImport = useCallback(async (file: File) => {
    const data = await readPipelineFile(file);
    if (!data) {
      pushToast('Could not parse that file. Expected JSON with nodes/edges.', 'error');
      return;
    }
    setNodes(data.nodes);
    setEdges(data.edges);
    setSelectedNodeId(null);
    pushToast(`Imported pipeline with ${data.nodes.length} nodes.`, 'success');
  }, [setNodes, setEdges, pushToast]);

  const runPipelineHandler = async () => {
    if (isRunning) return;
    setIsRunning(true);

    // Reset volatile state.
    setNodes(nds =>
      nds.map(n => {
        if (n.type === 'modelNode') {
          return { ...n, data: { ...n.data, status: 'idle' as RunStatus, result: '', error: undefined } };
        }
        if (n.type === 'outputNode') {
          return { ...n, data: { ...n.data, result: '' } };
        }
        return n;
      }),
    );

    try {
      const snapshot = nodes.map(n => ({ ...n, data: { ...n.data } }));
      await runPipeline(snapshot, edges, {
        onStatus: (id, status, message) => {
          setNodes(nds =>
            nds.map(n =>
              n.id === id ? { ...n, data: { ...n.data, status, error: message } } : n,
            ),
          );
        },
        onResult: (id, result) => {
          setNodes(nds =>
            nds.map(n => (n.id === id ? { ...n, data: { ...n.data, result } } : n)),
          );
        },
      });
      pushToast('Pipeline run complete.', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Pipeline run failed.';
      pushToast(message, 'error');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-bg text-text-main overflow-hidden font-sans">
      <TopBar
        onAutoOrchestrate={handleAutoOrchestrate}
        isGenerating={isGenerating}
        onRunPipeline={runPipelineHandler}
        isRunning={isRunning}
        onSave={handleSave}
        onClear={handleClear}
        onExport={handleExport}
        onImport={handleImport}
      />

      <div className="flex flex-1 relative z-10 overflow-hidden">
        <Sidebar />

        <main
          className="flex-1 relative bg-[radial-gradient(circle_at_50%_50%,#111_0%,#050505_100%)]"
          ref={reactFlowWrapper}
        >
          <div className="absolute top-10 left-10 pointer-events-none z-10">
            <h1 className="text-[64px] font-extrabold leading-[0.9] tracking-[-2px]">
              CROSS-MODEL<br />SEQUENCER
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
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId(null)}
            nodeTypes={nodeTypes}
            deleteKeyCode={['Delete', 'Backspace']}
            fitView
            className="bg-transparent"
          >
            <Background color="#ffffff" gap={24} size={1} />
            <Controls className="bg-surface border border-border fill-text-main" />
            <MiniMap
              pannable
              zoomable
              maskColor="rgba(5,5,5,0.85)"
              nodeColor={() => '#E0FF2E'}
              className="!bg-surface !border !border-border"
            />
          </ReactFlow>
        </main>

        <SidePanel
          selectedNode={selectedNode}
          onPatchNode={patchNode}
          onDeleteNode={deleteNode}
        />
      </div>

      <footer className="h-[60px] border-t border-border bg-bg flex items-center justify-between px-10 text-[11px] text-text-dim z-20">
        <div className="flex gap-5">
          <span className="flex items-center">
            <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${HAS_API_KEY ? 'bg-accent' : 'bg-red-500'}`} />
            {HAS_API_KEY ? 'MCP ACTIVE' : 'API KEY MISSING'}
          </span>
          <span>NODES: {nodes.length}</span>
          <span>EDGES: {edges.length}</span>
        </div>
        <div>SESSION ID: X-992-ALPHA-ORCH</div>
      </footer>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
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
