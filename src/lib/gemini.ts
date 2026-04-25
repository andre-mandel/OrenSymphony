import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

const API_KEY = (process.env.GEMINI_API_KEY ?? '').trim();
export const HAS_API_KEY = API_KEY.length > 0;

const ai = new GoogleGenAI({ apiKey: API_KEY });

function ensureKey() {
  if (!HAS_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set. Add it to your .env.local and restart the dev server.');
  }
}

export interface PipelineNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    model?: string;
    prompt?: string;
    systemInstruction?: string;
    value?: string;
  };
}

export interface PipelineEdge {
  id: string;
  source: string;
  target: string;
}

export interface PipelineData {
  nodes: PipelineNode[];
  edges: PipelineEdge[];
}

export async function generatePipeline(prompt: string): Promise<PipelineData> {
  ensureKey();
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: `Generate a visual pipeline of AI models to accomplish this task: "${prompt}".
Available models:
- gemini-3.1-pro-preview (Complex reasoning, coding, writing)
- gemini-3-flash-preview (General tasks, fast)
- gemini-3.1-flash-image-preview (Image generation)
- claude-3-opus (Alternative reasoning)
- cursor-ai (Code generation)
- jules-ai (Data analysis)

Always include exactly one inputNode (with a 'value' field for the seed data) and exactly one outputNode.
Connect them with modelNode steps in between via edges.
Return JSON with 'nodes' and 'edges'.
Nodes must have: id, type ('modelNode' | 'inputNode' | 'outputNode'), position {x, y}, and data {label, model, prompt, value}.
Space nodes horizontally (x += 280) starting at x=50, all y around 200.
Edges must have id, source, target referencing node ids.`,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      responseMimeType: 'application/json',
      responseSchema: {
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
                  properties: {
                    x: { type: Type.NUMBER },
                    y: { type: Type.NUMBER },
                  },
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
      },
    },
  });

  try {
    const parsed = JSON.parse(response.text || '{}');
    return {
      nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
      edges: Array.isArray(parsed.edges) ? parsed.edges : [],
    };
  } catch (e) {
    console.error('Failed to parse pipeline JSON', e);
    return { nodes: [], edges: [] };
  }
}

export async function chat(
  history: { role: string; parts: { text: string }[] }[],
  message: string,
): Promise<string> {
  ensureKey();
  const contents = [...history, { role: 'user', parts: [{ text: message }] }];

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: contents as any,
    config: {
      systemInstruction:
        'You are OrenSymphony, an advanced AI orchestrator assistant. You help users build, connect, and manage AI pipelines. Be concise and actionable.',
    },
  });

  return response.text ?? '';
}

export async function generateImage(prompt: string): Promise<string | null> {
  ensureKey();
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-image-preview',
    contents: { parts: [{ text: prompt }] },
    config: {
      imageConfig: {
        aspectRatio: '16:9',
        imageSize: '1K',
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts ?? []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
}

export async function executeTextModel(model: string, prompt: string, inputData: string): Promise<string> {
  ensureKey();
  // Non-Gemini models fall back to Gemini Flash so the pipeline keeps running for the demo.
  const actualModel = model && model.includes('gemini') ? model : 'gemini-3-flash-preview';

  const composed = [
    prompt ? `Task: ${prompt}` : '',
    inputData ? `Input Data:\n${inputData}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const response = await ai.models.generateContent({
    model: actualModel as any,
    contents: composed || prompt || ' ',
  });

  return response.text ?? '';
}
