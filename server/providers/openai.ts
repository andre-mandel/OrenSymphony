import type { AdapterCallParams, AdapterResult, ProviderAdapter } from './types.ts';

export const openaiAdapter: ProviderAdapter = {
  kind: 'openai_compatible',
  async call(params: AdapterCallParams): Promise<AdapterResult> {
    const base = (params.baseUrl?.replace(/\/+$/, '') || 'https://api.openai.com/v1');
    const url = `${base}/chat/completions`;

    const messages = [];
    if (params.systemInstruction) {
      messages.push({ role: 'system', content: params.systemInstruction });
    }
    for (const m of params.messages) {
      if (m.role === 'tool') {
        messages.push({
          role: 'tool',
          content: m.content,
          tool_call_id: m.tool_call_id,
        });
      } else if (m.tool_calls?.length) {
        messages.push({
          role: m.role,
          content: m.content,
          tool_calls: m.tool_calls.map(tc => ({
            id: tc.id,
            type: 'function',
            function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
          })),
        });
      } else {
        messages.push({ role: m.role, content: m.content });
      }
    }

    const body: Record<string, unknown> = {
      model: params.modelId,
      messages,
      temperature: params.temperature ?? 0.7,
    };
    if (params.tools && params.tools.length > 0) {
      body.tools = params.tools.map(t => ({
        type: 'function',
        function: { name: t.name, description: t.description, parameters: t.parameters },
      }));
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${params.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenAI-compatible call failed (${res.status}): ${text.slice(0, 400)}`);
    }

    const json = (await res.json()) as {
      choices: Array<{
        message: {
          content?: string | null;
          tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }>;
        };
      }>;
    };
    const choice = json.choices?.[0]?.message;
    const toolCalls = (choice?.tool_calls ?? []).map(tc => ({
      id: tc.id,
      name: tc.function.name,
      arguments: safeParseJSON(tc.function.arguments),
    }));
    return { text: choice?.content ?? '', toolCalls };
  },

  async generateImage({ apiKey, baseUrl, modelId, prompt }) {
    const base = (baseUrl?.replace(/\/+$/, '') || 'https://api.openai.com/v1');
    const res = await fetch(`${base}/images/generations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: modelId, prompt, response_format: 'b64_json', n: 1 }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Image gen failed (${res.status}): ${text.slice(0, 400)}`);
    }
    const json = (await res.json()) as { data: Array<{ b64_json?: string; url?: string }> };
    const item = json.data?.[0];
    if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
    if (item?.url) return item.url;
    return null;
  },
};

function safeParseJSON(s: string): Record<string, unknown> {
  try {
    const v = JSON.parse(s);
    return typeof v === 'object' && v ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
