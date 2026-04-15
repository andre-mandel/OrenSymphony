import { z } from 'zod'

export const UsageEventSchema = z.object({
  orgId: z.string(),
  runId: z.string().optional(),
  at: z.string().datetime().optional(),
  kind: z.enum(['llm', 'tool', 'mcp', 'runtime']),
  // Token/cost fields are optional to support non-LLM events too.
  inputTokens: z.number().int().nonnegative().optional(),
  outputTokens: z.number().int().nonnegative().optional(),
  totalTokens: z.number().int().nonnegative().optional(),
  costUsd: z.number().nonnegative().optional(),
})

export type UsageEvent = z.infer<typeof UsageEventSchema>

export type UsageTotals = {
  totalTokens: number
  totalCostUsd: number
}

export function accumulateUsage(events: UsageEvent[]): UsageTotals {
  let totalTokens = 0
  let totalCostUsd = 0
  for (const e of events) {
    totalTokens += e.totalTokens ?? 0
    totalCostUsd += e.costUsd ?? 0
  }
  return { totalTokens, totalCostUsd }
}

