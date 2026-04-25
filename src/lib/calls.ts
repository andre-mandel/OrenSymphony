import { api, type ExecuteResult, type RoutingDecision } from './api';

export interface PipelineSpec {
  nodes: Array<{
    id: string;
    type: 'inputNode' | 'modelNode' | 'outputNode';
    position: { x: number; y: number };
    data: { label?: string; model?: string; prompt?: string; value?: string };
  }>;
  edges: Array<{ id: string; source: string; target: string }>;
}

export async function generatePipeline(task: string): Promise<PipelineSpec> {
  return api.post<PipelineSpec>('/api/orchestrate', { task });
}

export async function executeText(input: {
  modelId: string;
  prompt: string;
  inputData?: string;
  systemInstruction?: string;
  enableTools?: boolean;
}): Promise<ExecuteResult> {
  return api.post<ExecuteResult>('/api/execute/text', input);
}

export async function executeImage(modelId: string, prompt: string): Promise<string | null> {
  const res = await api.post<{ data_url: string | null }>('/api/execute/image', { model_id: modelId, prompt });
  return res.data_url;
}

export async function pickRoute(prompt: string, opts?: { needs_vision?: boolean; needs_image_gen?: boolean }): Promise<RoutingDecision> {
  return api.post<RoutingDecision>('/api/router/pick', { prompt, ...opts });
}
