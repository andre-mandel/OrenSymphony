import { getAdapter } from './providers/index.ts';
import { getModelForCall, findModelByModelId } from './registry.ts';
import { getEnabledToolDefs, invokeMcpTool } from './mcp.ts';
import type { ChatMessage, ToolDef } from './providers/types.ts';

export interface ExecuteParams {
  modelId: string;
  prompt: string;
  inputData?: string;
  systemInstruction?: string;
  enableTools?: boolean;
  maxToolIterations?: number;
}

export interface ExecuteResult {
  text: string;
  toolInvocations: Array<{ name: string; arguments: Record<string, unknown>; result: string }>;
  modelUsed: string;
}

export async function executeText(params: ExecuteParams): Promise<ExecuteResult> {
  const ref = findModelByModelId(params.modelId);
  if (!ref) throw new Error(`Model "${params.modelId}" is not registered. Add it in Settings.`);
  const handle = getModelForCall(ref.id);
  if (!handle) throw new Error('Model lookup failed.');

  const adapter = getAdapter(handle.provider.kind);
  const composed = [
    params.prompt ? `Task: ${params.prompt}` : '',
    params.inputData ? `Input Data:\n${params.inputData}` : '',
  ].filter(Boolean).join('\n\n');

  const messages: ChatMessage[] = [{ role: 'user', content: composed || params.prompt || ' ' }];
  const tools: ToolDef[] = params.enableTools !== false ? getEnabledToolDefs() : [];
  const toolInvocations: ExecuteResult['toolInvocations'] = [];
  const maxIter = params.maxToolIterations ?? 5;

  for (let iter = 0; iter < maxIter; iter++) {
    const result = await adapter.call({
      apiKey: handle.apiKey,
      baseUrl: handle.provider.base_url,
      modelId: handle.model.model_id,
      messages,
      tools,
      systemInstruction: params.systemInstruction,
    });

    if (!result.toolCalls.length) {
      return { text: result.text, toolInvocations, modelUsed: handle.model.model_id };
    }

    messages.push({
      role: 'assistant',
      content: result.text,
      tool_calls: result.toolCalls,
    });
    for (const call of result.toolCalls) {
      try {
        const out = await invokeMcpTool(call);
        toolInvocations.push({ name: call.name, arguments: call.arguments, result: out });
        messages.push({ role: 'tool', content: out, tool_call_id: call.id });
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : 'tool failure';
        toolInvocations.push({ name: call.name, arguments: call.arguments, result: `[error: ${errMsg}]` });
        messages.push({ role: 'tool', content: `Error: ${errMsg}`, tool_call_id: call.id });
      }
    }
  }
  return { text: '[Tool loop exceeded max iterations]', toolInvocations, modelUsed: handle.model.model_id };
}

export async function executeImage(modelId: string, prompt: string): Promise<string | null> {
  const ref = findModelByModelId(modelId);
  if (!ref) throw new Error(`Model "${modelId}" is not registered.`);
  const handle = getModelForCall(ref.id);
  if (!handle) throw new Error('Model lookup failed.');
  const adapter = getAdapter(handle.provider.kind);
  if (!adapter.generateImage) throw new Error(`Provider ${handle.provider.kind} does not support image generation here.`);
  return adapter.generateImage({
    apiKey: handle.apiKey,
    baseUrl: handle.provider.base_url,
    modelId: handle.model.model_id,
    prompt,
  });
}
