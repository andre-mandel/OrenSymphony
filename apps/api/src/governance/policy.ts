import type { Payload } from 'payload'

export type GovernanceDecision =
  | { outcome: 'allow' }
  | { outcome: 'deny'; reason: string }
  | { outcome: 'require_approval'; reason: string; approvalId: string }

type MinimalNode = { id: string; type: string; data?: Record<string, any> }
type MinimalGraph = { nodes: MinimalNode[]; edges: { id: string; source: string; target: string }[] }

export type RedactionResult = {
  redacted: unknown
  matches: Array<{ name: string; regex: string }>
}

function includesPIIHeuristic(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const s = value
  // naive email / phone patterns
  if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(s)) return true
  if (/\b(\+?\d[\d\s\-().]{7,}\d)\b/.test(s)) return true
  return false
}

export function redactWithPolicy(args: {
  value: unknown
  patterns: Array<{ name: string; regex: string; replacement?: string }>
}): RedactionResult {
  const { value, patterns } = args
  if (!patterns?.length) return { redacted: value, matches: [] }
  if (typeof value !== 'string') return { redacted: value, matches: [] }

  let s = value
  const matches: RedactionResult['matches'] = []
  for (const p of patterns) {
    if (!p?.regex) continue
    let re: RegExp
    try {
      re = new RegExp(p.regex, 'g')
    } catch {
      continue
    }
    if (re.test(s)) {
      matches.push({ name: p.name ?? 'pattern', regex: p.regex })
      const replacement = p.replacement ?? '[REDACTED]'
      s = s.replace(re, replacement)
    }
  }

  return { redacted: s, matches }
}

export async function evaluateRunAgainstPolicies(args: {
  payload: Payload
  orgId: string
  workspaceId?: string
  graph: MinimalGraph
  input?: unknown
}): Promise<GovernanceDecision> {
  const { payload, orgId, workspaceId, graph, input } = args

  const policies = await payload.find({
    collection: 'policies',
    where: {
      and: [
        { org: { equals: orgId } },
        ...(workspaceId ? [{ or: [{ workspace: { exists: false } }, { workspace: { equals: workspaceId } }] }] : []),
      ],
    },
    limit: 50,
    depth: 0,
  })

  // If no policies, allow.
  if (!policies?.docs?.length) return { outcome: 'allow' }

  const llmProviders = new Set<string>()
  const toolConnectorIds = new Set<string>()
  const mcpConnectorIds = new Set<string>()
  for (const n of graph.nodes ?? []) {
    if (n.type === 'llm') {
      const provider = n?.data?.provider ?? n?.data?.modelProvider
      if (typeof provider === 'string' && provider) llmProviders.add(provider)
    }
    if (n.type === 'tool') {
      const connectorId = n?.data?.connectorId
      if (typeof connectorId === 'string' && connectorId) toolConnectorIds.add(connectorId)
    }
    if (n.type === 'mcp') {
      const connectorId = n?.data?.connectorId
      if (typeof connectorId === 'string' && connectorId) mcpConnectorIds.add(connectorId)
    }
  }

  const inputHasPII = includesPIIHeuristic(input)

  for (const p of policies.docs as any[]) {
    const llmAllowlist: { provider: string; model?: string }[] | undefined = p.llmAllowlist
    const toolAllowlist: { connector: string }[] | undefined = p.toolAllowlist
    const mcpAllowlist: { connector: string }[] | undefined = p.mcpAllowlist
    const blockOnPII: boolean = Boolean(p?.dataControls?.blockOnPII)
    const requireApprovalForExternalTools: boolean = Boolean(p?.approvals?.requireApprovalForExternalTools)

    if (llmAllowlist?.length) {
      const allowedProviders = new Set(llmAllowlist.map((x) => x.provider).filter(Boolean))
      for (const prov of llmProviders) {
        if (!allowedProviders.has(prov)) return { outcome: 'deny', reason: `LLM provider not allowlisted: ${prov}` }
      }
    }

    if (toolAllowlist?.length) {
      const allowedTools = new Set(toolAllowlist.map((x) => x.connector).filter(Boolean))
      for (const id of toolConnectorIds) {
        if (!allowedTools.has(id)) return { outcome: 'deny', reason: `Tool connector not allowlisted: ${id}` }
      }
    }

    if (mcpAllowlist?.length) {
      const allowedMcps = new Set(mcpAllowlist.map((x) => x.connector).filter(Boolean))
      for (const id of mcpConnectorIds) {
        if (!allowedMcps.has(id)) return { outcome: 'deny', reason: `MCP connector not allowlisted: ${id}` }
      }
    }

    if (blockOnPII && inputHasPII) {
      return { outcome: 'deny', reason: 'Input appears to contain PII and policy blocks it' }
    }

    if (requireApprovalForExternalTools && (toolConnectorIds.size > 0 || mcpConnectorIds.size > 0)) {
      return { outcome: 'require_approval', reason: 'External tools require approval', approvalId: `apr_${Date.now()}` }
    }
  }

  return { outcome: 'allow' }
}

