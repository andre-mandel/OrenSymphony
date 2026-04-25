import type { AdapterCallParams, AdapterResult, ProviderAdapter } from './types.ts';

export const anthropicAdapter: ProviderAdapter = {
  kind: 'anthropic',
  async call(params: AdapterCallParams): Promise<AdapterResult> {
    const base = (params.baseUrl?.replace(/\/+$/, '') || 'https://api.anthropic.com');
    const url = `${base}/v1/messages`;

    const sys: string[] = [];
    const messages: Array<{ role: 'user' | 'assistant'; content: unknown }> = [];
    for (const m of params.messages) {
      if (m.role === 'system') {
        sys.push(m.content);
        continue;
      }
      if (m.role === 'tool') {
        messages.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: m.tool_call_id,
              content: m.content,
            },
          ],
        });
        continue;
      }
      if (m.tool_calls?.length) {
        messages.push({
          role: 'assistant',
          content: [
            ...(m.content ? [{ type: 'text', text: m.content }] : []),
            ...m.tool_calls.map(tc => ({
              type: 'tool_use',
              id: tc.id,
              name: tc.name,
              input: tc.arguments,
            })),
          ],
        });
        continue;
      }
      messages.push({ role: m.role as 'user' | 'assistant', content: m.content });
    }

    const body: Record<string, unknown> = {
      model: params.modelId,
      max_tokens: 4096,
      messages,
      temperature: params.temperature ?? 0.7,
    };
    const sysAll = [params.systemInstruction, ...sys].filter(Boolean).join('\n\n');
    if (sysAll) body.system = sysAll;
    if (params.tools && params.tools.length > 0) {
      body.tools = params.tools.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters,
      }));
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': params.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Anthropic call failed (${res.status}): ${text.slice(0, 400)}`);
    }

    const json = (await res.json()) as {
      content: Array<
        | { type: 'text'; text: string }
        | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
      >;
    };

    let text = '';
    const toolCalls: AdapterResult['toolCalls'] = [];
    for (const c of json.content ?? []) {
      if (c.type === 'text') text += c.text;
      else if (c.type === 'tool_use') {
        toolCalls.push({ id: c.id, name: c.name, arguments: c.input });
      }
    }
    return { text, toolCalls };
  },
};
