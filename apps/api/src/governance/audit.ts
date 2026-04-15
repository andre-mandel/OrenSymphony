import type { Payload } from 'payload'

export async function writeAuditEvent(args: {
  payload: Payload
  orgId: string
  actorId?: string
  action: string
  resourceType?: string
  resourceId?: string
  metadata?: unknown
}) {
  const { payload, orgId, actorId, action, resourceType, resourceId, metadata } = args
  return await payload.create({
    collection: 'auditEvents',
    data: {
      org: orgId,
      actor: actorId,
      action,
      resourceType,
      resourceId,
      metadata,
    },
  })
}

