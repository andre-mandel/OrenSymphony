import { z } from 'zod'

export type NodeId = string

export type PipelineNodeType = 'input' | 'output' | 'llm' | 'tool' | 'mcp'

export const JsonValue: z.ZodType<unknown> = z.any()

export const PipelineNodeSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  data: z.record(z.string(), JsonValue).default({}),
})

export const PipelineEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
})

export const PipelineGraphSchema = z.object({
  nodes: z.array(PipelineNodeSchema),
  edges: z.array(PipelineEdgeSchema),
})

export type PipelineNode = z.infer<typeof PipelineNodeSchema>
export type PipelineEdge = z.infer<typeof PipelineEdgeSchema>
export type PipelineGraph = z.infer<typeof PipelineGraphSchema>

export type RunStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled'

export type RuntimeEvent =
  | { type: 'run.started'; runId: string; at: string }
  | { type: 'node.started'; runId: string; nodeId: NodeId; at: string }
  | { type: 'node.completed'; runId: string; nodeId: NodeId; at: string; output?: unknown }
  | { type: 'node.failed'; runId: string; nodeId: NodeId; at: string; error: { message: string } }
  | { type: 'run.paused'; runId: string; at: string; reason: 'approval_required'; approvalId: string }
  | { type: 'run.resumed'; runId: string; at: string; approvalId: string }
  | { type: 'run.completed'; runId: string; at: string; status: Exclude<RunStatus, 'queued' | 'running'> }

export interface RuntimeOptions {
  timeoutMs?: number
  maxRetries?: number
  policy?: RuntimePolicy
}

export interface NodeExecutorContext {
  runId: string
  emit: (evt: RuntimeEvent) => void
  abortSignal: AbortSignal
}

export type NodeExecutor = (args: {
  node: PipelineNode
  input: unknown
  ctx: NodeExecutorContext
}) => Promise<unknown>

export interface RuntimeRegistry {
  getExecutor: (nodeType: string) => NodeExecutor | undefined
}

export interface RuntimePolicyDecision {
  decision: 'allow' | 'deny' | 'require_approval'
  reason?: string
  approvalId?: string
}

export interface RuntimePolicy {
  evaluateNode: (args: { runId: string; node: PipelineNode; input: unknown }) => Promise<RuntimePolicyDecision> | RuntimePolicyDecision
  waitForApproval?: (args: { runId: string; approvalId: string; signal: AbortSignal }) => Promise<void>
}

function nowIso() {
  return new Date().toISOString()
}

export class WorkflowRuntime {
  private registry: RuntimeRegistry
  private opts: Required<RuntimeOptions>

  constructor(registry: RuntimeRegistry, opts: RuntimeOptions = {}) {
    this.registry = registry
    this.opts = {
      timeoutMs: opts.timeoutMs ?? 60_000,
      maxRetries: opts.maxRetries ?? 0,
      policy: opts.policy ?? {
        evaluateNode: () => ({ decision: 'allow' as const }),
      },
    }
  }

  /**
   * Executes a pipeline graph as a DAG with simple fan-in/fan-out.
   * Each node receives an aggregated input object of all upstream outputs keyed by upstream node id.
   */
  async run(graph: PipelineGraph, args: { runId: string; input?: unknown; signal?: AbortSignal; onEvent?: (e: RuntimeEvent) => void }) {
    const parsed = PipelineGraphSchema.parse(graph)
    const onEvent = args.onEvent ?? (() => {})
    const controller = new AbortController()
    const abortSignal = args.signal
      ? anySignal([args.signal, controller.signal])
      : controller.signal

    const emit = (evt: RuntimeEvent) => onEvent(evt)

    emit({ type: 'run.started', runId: args.runId, at: nowIso() })

    const nodesById = new Map(parsed.nodes.map((n) => [n.id, n]))
    const inEdges = new Map<string, PipelineEdge[]>()
    const outEdges = new Map<string, PipelineEdge[]>()

    for (const e of parsed.edges) {
      inEdges.set(e.target, [...(inEdges.get(e.target) ?? []), e])
      outEdges.set(e.source, [...(outEdges.get(e.source) ?? []), e])
    }

    // Kahn-style: track remaining deps
    const remainingDeps = new Map<string, number>()
    for (const n of parsed.nodes) {
      remainingDeps.set(n.id, (inEdges.get(n.id) ?? []).length)
    }

    const outputs = new Map<string, unknown>()
    // Seed: any nodes with 0 deps; if there is an explicit "input" node, set its output to args.input
    for (const n of parsed.nodes) {
      if ((inEdges.get(n.id) ?? []).length === 0 && (n.type === 'input' || n.data?.kind === 'input')) {
        outputs.set(n.id, args.input ?? n.data?.value ?? null)
      }
    }

    const ready: string[] = []
    for (const [id, deps] of remainingDeps.entries()) {
      if (deps === 0) ready.push(id)
    }

    try {
      while (ready.length) {
        abortSignal.throwIfAborted?.()
        const nodeId = ready.shift()!
        const node = nodesById.get(nodeId)
        if (!node) continue

        // If this is an input node and already has output seeded, skip execution
        if (node.type === 'input' && outputs.has(nodeId)) {
          // propagate
        } else {
          const exec = this.registry.getExecutor(node.type)
          if (!exec) {
            throw new Error(`No executor registered for node type "${node.type}"`)
          }

          emit({ type: 'node.started', runId: args.runId, nodeId, at: nowIso() })

          const upstream = inEdges.get(nodeId) ?? []
          const inputObj: Record<string, unknown> = {}
          for (const e of upstream) {
            inputObj[e.source] = outputs.get(e.source)
          }

          const policyDecision = await this.opts.policy.evaluateNode({
            runId: args.runId,
            node,
            input: upstream.length ? inputObj : (args.input ?? null),
          })
          if (policyDecision.decision === 'deny') {
            throw new Error(policyDecision.reason || 'Denied by policy')
          }
          if (policyDecision.decision === 'require_approval') {
            const approvalId = policyDecision.approvalId || `approval_${args.runId}_${nodeId}`
            emit({ type: 'run.paused', runId: args.runId, at: nowIso(), reason: 'approval_required', approvalId })
            if (!this.opts.policy.waitForApproval) throw new Error('Approval required but no waitForApproval handler configured')
            await this.opts.policy.waitForApproval({ runId: args.runId, approvalId, signal: abortSignal })
            emit({ type: 'run.resumed', runId: args.runId, at: nowIso(), approvalId })
          }

          const out = await withRetries(
            () =>
              withTimeout(
                exec({ node, input: upstream.length ? inputObj : (args.input ?? null), ctx: { runId: args.runId, emit, abortSignal } }),
                this.opts.timeoutMs,
                abortSignal,
              ),
            this.opts.maxRetries,
            abortSignal,
          )

          outputs.set(nodeId, out)
          emit({ type: 'node.completed', runId: args.runId, nodeId, at: nowIso(), output: out })
        }

        for (const e of outEdges.get(nodeId) ?? []) {
          const nextId = e.target
          remainingDeps.set(nextId, (remainingDeps.get(nextId) ?? 0) - 1)
          if ((remainingDeps.get(nextId) ?? 0) === 0) ready.push(nextId)
        }
      }

      emit({ type: 'run.completed', runId: args.runId, at: nowIso(), status: 'succeeded' })
      return { status: 'succeeded' as const, outputs: Object.fromEntries(outputs) }
    } catch (err: any) {
      if (abortSignal.aborted) {
        emit({ type: 'run.completed', runId: args.runId, at: nowIso(), status: 'canceled' })
        return { status: 'canceled' as const, outputs: Object.fromEntries(outputs) }
      }
      emit({ type: 'run.completed', runId: args.runId, at: nowIso(), status: 'failed' })
      return { status: 'failed' as const, outputs: Object.fromEntries(outputs), error: { message: err?.message ?? String(err) } }
    }
  }
}

async function withTimeout<T>(fn: Promise<T>, ms: number, signal: AbortSignal): Promise<T> {
  if (ms <= 0) return fn
  return await Promise.race([
    fn,
    new Promise<T>((_resolve, reject) => {
      const t = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
      const onAbort = () => {
        clearTimeout(t)
        reject(new Error('Aborted'))
      }
      if (signal.aborted) return onAbort()
      signal.addEventListener('abort', onAbort, { once: true })
    }),
  ])
}

async function withRetries<T>(fn: () => Promise<T>, maxRetries: number, signal: AbortSignal): Promise<T> {
  let attempt = 0
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (signal.aborted) throw new Error('Aborted')
    try {
      return await fn()
    } catch (e) {
      if (attempt >= maxRetries) throw e
      attempt++
    }
  }
}

function anySignal(signals: AbortSignal[]): AbortSignal {
  // Node 22+ has AbortSignal.any(), but keep it portable.
  const maybeAny = (AbortSignal as any)?.any as undefined | ((signals: AbortSignal[]) => AbortSignal)
  if (typeof maybeAny === 'function') return maybeAny(signals)

  const controller = new AbortController()
  const onAbort = () => controller.abort()
  for (const s of signals) {
    if (s.aborted) {
      controller.abort()
      break
    }
    s.addEventListener('abort', onAbort, { once: true })
  }
  return controller.signal
}

