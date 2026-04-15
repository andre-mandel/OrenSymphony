import type { AccessArgs, CollectionConfig } from 'payload'

const isAuthenticated = ({ req }: AccessArgs) => Boolean(req.user)

export const AuditEvents: CollectionConfig = {
  slug: 'auditEvents',
  admin: {
    useAsTitle: 'action',
    defaultColumns: ['action', 'actor', 'org', 'createdAt'],
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: 'org', type: 'relationship', relationTo: 'orgs', required: true, index: true },
    { name: 'actor', type: 'relationship', relationTo: 'users', index: true },
    {
      name: 'action',
      type: 'text',
      required: true,
      index: true,
      admin: { description: 'e.g. pipeline.run.started, policy.denied, connector.created' },
    },
    {
      name: 'resourceType',
      type: 'text',
      index: true,
    },
    {
      name: 'resourceId',
      type: 'text',
      index: true,
    },
    {
      name: 'metadata',
      type: 'json',
    },
  ],
}

