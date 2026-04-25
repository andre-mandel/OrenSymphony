import { GoogleGenAI, Type } from '@google/genai';
import type { AdapterCallParams, AdapterResult, ProviderAdapter } from './types.ts';

export const googleAdapter: ProviderAdapter = {
  kind: 'google',
  async call(params: AdapterCallParams): Promise<AdapterResult> {
    const ai = new GoogleGenAI({ apiKey: params.apiKey });

    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    for (const m of params.messages) {
      if (m.role === 'system') continue;
      contents.push({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      });
    }

    const response = await ai.models.generateContent({
      model: params.modelId,
      contents: contents.length > 0 ? (contents as unknown as Parameters<typeof ai.models.generateContent>[0]['contents']) : ' ',
      config: {
        temperature: params.temperature ?? 0.7,
        ...(params.systemInstruction ? { systemInstruction: params.systemInstruction } : {}),
        ...(params.tools && params.tools.length
          ? {
              tools: [
                {
                  functionDeclarations: params.tools.map(t => ({
                    name: t.name,
                    description: t.description,
                    parameters: convertSchema(t.parameters) as never,
                  })),
                },
              ],
            }
          : {}),
      },
    });

    const text = response.text ?? '';
    const toolCalls: AdapterResult['toolCalls'] = [];
    const calls = response.functionCalls ?? [];
    for (const fc of calls) {
      toolCalls.push({
        id: fc.id ?? `call_${Math.random().toString(36).slice(2)}`,
        name: fc.name ?? '',
        arguments: (fc.args ?? {}) as Record<string, unknown>,
      });
    }
    return { text, toolCalls };
  },

  async generateImage({ apiKey, modelId, prompt }) {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: '16:9', imageSize: '1K' } },
    });
    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return null;
  },
};

function convertSchema(schema: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...schema };
  if (typeof out.type === 'string') {
    const t = (out.type as string).toLowerCase();
    out.type = (
      {
        object: Type.OBJECT,
        array: Type.ARRAY,
        string: Type.STRING,
        number: Type.NUMBER,
        integer: Type.INTEGER,
        boolean: Type.BOOLEAN,
      } as Record<string, Type>
    )[t] ?? Type.STRING;
  }
  if (out.properties && typeof out.properties === 'object') {
    const props: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(out.properties as Record<string, unknown>)) {
      props[k] = convertSchema(v as Record<string, unknown>);
    }
    out.properties = props;
  }
  if (out.items) {
    out.items = convertSchema(out.items as Record<string, unknown>);
  }
  return out;
}
