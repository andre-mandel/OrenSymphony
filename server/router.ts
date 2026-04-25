import { getAdapter } from './providers/index.ts';
import { listModels, getModelForCall } from './registry.ts';
import type { PublicModel } from './registry.ts';

const ROUTER_SYSTEM = `You are OrenSymphony's smart router. Pick the best model for the user's task from the provided catalog.
Output strict JSON: {"model_id": "<exact id>", "reason": "<short>"}.
Optimize for capability fit first, then cost, then context window. Prefer cheaper models for trivial tasks.`;

export interface RoutingDecision {
  model_id: string;
  display_name: string;
  reason: string;
}

export async function pickModel(prompt: string, opts?: { needsVision?: boolean; needsImageGen?: boolean }): Promise<RoutingDecision | null> {
  const all = listModels();
  let candidates = all;
  if (opts?.needsImageGen) candidates = candidates.filter(m => m.capabilities.includes('image'));
  else if (opts?.needsVision) candidates = candidates.filter(m => m.capabilities.includes('vision'));
  if (candidates.length === 0) return null;
  if (candidates.length === 1) {
    const only = candidates[0];
    return { model_id: only.model_id, display_name: only.display_name, reason: 'Only model available.' };
  }

  const judge = pickJudge(all);
  if (!judge) {
    const first = candidates[0];
    return { model_id: first.model_id, display_name: first.display_name, reason: 'No judge model available; defaulting to first.' };
  }
  const summary = candidates.map(m => `- ${m.model_id} (${m.display_name}) [${m.capabilities.join(',')}, ctx=${m.context_window ?? '?'}, in=$${m.cost_in_per_1m ?? '?'}/M, out=$${m.cost_out_per_1m ?? '?'}/M]`).join('\n');

  const adapter = getAdapter(judge.provider.kind);
  const result = await adapter.call({
    apiKey: judge.apiKey,
    baseUrl: judge.provider.base_url,
    modelId: judge.model.model_id,
    systemInstruction: ROUTER_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Task:\n${prompt}\n\nCatalog:\n${summary}\n\nReturn JSON only.`,
      },
    ],
    temperature: 0.2,
  });
  const text = result.text.trim().replace(/^```json\s*/i, '').replace(/```$/, '');
  try {
    const parsed = JSON.parse(text) as { model_id?: string; reason?: string };
    const found = candidates.find(m => m.model_id === parsed.model_id);
    if (!found) {
      const first = candidates[0];
      return { model_id: first.model_id, display_name: first.display_name, reason: 'Router returned unknown id; defaulted.' };
    }
    return { model_id: found.model_id, display_name: found.display_name, reason: parsed.reason ?? '' };
  } catch {
    const first = candidates[0];
    return { model_id: first.model_id, display_name: first.display_name, reason: 'Router parse failed; defaulted.' };
  }
}

function pickJudge(models: PublicModel[]) {
  const priority = ['gemini-3-flash', 'gemini-3.1-flash', 'gemini-2.5-flash', 'gpt-4o-mini', 'claude-haiku', 'gpt-3.5'];
  for (const needle of priority) {
    const m = models.find(x => x.model_id.toLowerCase().includes(needle));
    if (m) return getModelForCall(m.id);
  }
  if (models.length === 0) return null;
  return getModelForCall(models[0].id);
}
