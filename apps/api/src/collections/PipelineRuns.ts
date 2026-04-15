import type { CollectionConfig } from 'payload'
import type { AccessArgs } from 'payload'
import type { CollectionBeforeChangeHook } from 'payload'
import payload from 'payload'
import { evaluateRunAgainstPolicies } from '../governance/policy.js'

const isAuthenticated = ({ req }: AccessArgs) => Boolean(req.user)

const beforeCreateEnforceGovernance: CollectionBeforeChangeHook = async ({ data, req, operation }) => {
  if (operation !== 'create') return data

  const orgId = String((data as any)?.org ?? '')
  const pipelineId = String((data as any)?.pipeline ?? '')
  const workspaceId = (data as any)?.workspace ? String((data as any).workspace) : undefined

  if (!orgId || !pipelineId) return data

  const pipeline = await payload.findByID({
    collection: 'pipelines',
    id: pipelineId,
    depth: 0,
  })

  const graph = (pipeline as any)?.graph
  const decision = await evaluateRunAgainstPolicies({
    payload,
    orgId,
    workspaceId,
    graph,
    input: (data as any)?.input,
  })

  await payload.create({
    collection: 'auditEvents',
    data: {
      org: orgId,
      actor: req.user?.id,
      action: `policy.decision`,
      resourceType: 'pipelineRuns',
      resourceId: 'pending',
      metadata: { outcome: decision.outcome, reason: (decision as any).reason, pipelineId, workspaceId },
    },
  })

  if (decision.outcome === 'deny') {
    throw new Error(`Governance policy denied run: ${decision.reason}`)
  }

  if (decision.outcome === 'require_approval') {
    ;(data as any).status = 'queued'
    ;(data as any).approval = {
      status: 'required',
      approvalId: decision.approvalId,
      reason: decision.reason,
    }
  }

  return data
}

export const PipelineRuns: CollectionConfig = {
  slug: 'pipelineRuns',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['pipeline', 'status', 'createdAt', 'updatedAt'],
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  hooks: {
    beforeChange: [beforeCreateEnforceGovernance],
  },
  fields: [
    {
      name: 'org',
      type: 'relationship',
      relationTo: 'orgs',
      required: true,
      index: true,
    },
    {
      name: 'pipeline',
      type: 'relationship',
      relationTo: 'pipelines',
      required: true,
      index: true,
    },
    {
      name: 'workspace',
      type: 'relationship',
      relationTo: 'workspaces',
      index: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'queued',
      options: [
        { label: 'Queued', value: 'queued' },
        { label: 'Running', value: 'running' },
        { label: 'Needs approval', value: 'needs_approval' },
        { label: 'Succeeded', value: 'succeeded' },
        { label: 'Failed', value: 'failed' },
        { label: 'Canceled', value: 'canceled' },
      ],
      index: true,
    },
    {
      name: 'approval',
      type: 'group',
      fields: [
        {
          name: 'status',
          type: 'select',
          options: [
            { label: 'Not required', value: 'not_required' },
            { label: 'Required', value: 'required' },
            { label: 'Approved', value: 'approved' },
            { label: 'Rejected', value: 'rejected' },
          ],
          defaultValue: 'not_required',
          required: true,
        },
        { name: 'approvalId', type: 'text' },
        { name: 'reason', type: 'text' },
        { name: 'approvedBy', type: 'relationship', relationTo: 'users' },
        { name: 'approvedAt', type: 'date' },
      ],
    },
    {
      name: 'input',
      type: 'json',
    },
    {
      name: 'output',
      type: 'json',
    },
    {
      name: 'logs',
      type: 'json',
      admin: {
        description: 'Structured logs/events emitted by runtime (server-side).',
      },
    },
    {
      name: 'usage',
      type: 'json',
      admin: {
        description: 'Token/cost accounting per run (populated by tracing).',
      },
    },
    {
      name: 'startedAt',
      type: 'date',
    },
    {
      name: 'finishedAt',
      type: 'date',
    },
  ],
}

