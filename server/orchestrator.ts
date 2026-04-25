import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { getModelForCall } from './registry.ts';
import { listModels } from './registry.ts';
import { getAdapter } from './providers/index.ts';
import type { PublicModel } from './registry.ts';

export interface PipelineSpec {
  nodes: Array<{
    id: string;
    type: 'inputNode' | 'modelNode' | 'outputNode';
    position: { x: number; y: number };
    data: { label?: string; model?: string; prompt?: string; value?: string };
  }>;
  edges: Array<{ id: string; source: string; target: string }>;
}

const PROMPT = (catalog: string, task: string) => `Build a directed acyclic pipeline of AI model calls that accomplishes this task: "${task}".

Available models (use the exact model_id):
${catalog}

Rules:
- Exactly one inputNode with a 'value' field seeded from the task.
- Exactly one outputNode.
- Connect with modelNode steps via edges.
- Each modelNode picks the most appropriate model_id from the catalog.
- Space nodes horizontally (x += 280) starting at x=50, y around 200.
- Edges have id, source, target.
Return JSON only.`;

export async function generatePipeline(task: string): Promise<PipelineSpec> {
  const models = listModels();
  if (models.length === 0) {
    throw new Error('No models registered. Add a provider and at least one model in Settings first.');
  }
  const judge = pickPlanner(models);
  if (!judge) throw new Error('Could not find a suitable planner model.');

  const catalog = models
    .map(m => `- ${m.model_id} — ${m.display_name} [${m.capabilities.join(',')}]`)
    .join('\n');

  if (judge.provider.kind === 'google') {
    const ai = new GoogleGenAI({ apiKey: judge.apiKey });
    const response = await ai.models.generateContent({
      model: judge.model.model_id,
      contents: PROMPT(catalog, task),
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        responseMimeType: 'application/json',
        responseSchema: pipelineSchema(),
      },
    });
    return safeParseSpec(response.text || '{}');
  }

  const adapter = getAdapter(judge.provider.kind);
  const result = await adapter.call({
    apiKey: judge.apiKey,
    baseUrl: judge.provider.base_url,
    modelId: judge.model.model_id,
    systemInstruction: 'You output strict JSON matching the requested schema. No prose.',
    messages: [{ role: 'user', content: PROMPT(catalog, task) + '\n\nOutput JSON shape: {"nodes": [{id,type,position:{x,y},data:{label,model,prompt,value}}], "edges": [{id,source,target}]}' }],
    temperature: 0.2,
  });
  return safeParseSpec(result.text);
}

function pickPlanner(models: PublicModel[]) {
  const priority = ['gemini-3.1-pro', 'gemini-3-pro', 'claude-opus-4', 'claude-sonnet-4', 'gpt-4o', 'gemini-3-flash', 'gpt-4-turbo'];
  for (const needle of priority) {
    const m = models.find(x => x.model_id.toLowerCase().includes(needle));
    if (m) return getModelForCall(m.id);
  }
  return models[0] ? getModelForCall(models[0].id) : null;
}

function safeParseSpec(raw: string): PipelineSpec {
  const cleaned = raw.trim().replace(/^```json\s*/i, '').replace(/```$/, '');
  try {
    const parsed = JSON.parse(cleaned) as PipelineSpec;
    return {
      nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
      edges: Array.isArray(parsed.edges) ? parsed.edges : [],
    };
  } catch {
    return { nodes: [], edges: [] };
  }
}

function pipelineSchema() {
  return {
    type: Type.OBJECT,
    properties: {
      nodes: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            type: { type: Type.STRING },
            position: {
              type: Type.OBJECT,
              properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } },
            },
            data: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                model: { type: Type.STRING },
                prompt: { type: Type.STRING },
                value: { type: Type.STRING },
              },
            },
          },
        },
      },
      edges: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            source: { type: Type.STRING },
            target: { type: Type.STRING },
          },
        },
      },
    },
  };
}
