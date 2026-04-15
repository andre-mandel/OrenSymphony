import type { CollectionConfig } from 'payload'

export const Workspaces: CollectionConfig = {
  slug: 'workspaces',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'org', 'updatedAt'],
  },
  access: {
    read: ({ req }: any) => Boolean(req.user),
    create: ({ req }: any) => Boolean(req.user),
    update: ({ req }: any) => Boolean(req.user),
    delete: ({ req }: any) => Boolean(req.user),
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
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
    },
  ],
}

