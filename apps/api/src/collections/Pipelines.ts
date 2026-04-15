import type { AccessArgs, CollectionConfig } from 'payload'

export const Pipelines: CollectionConfig = {
  slug: 'pipelines',
  admin: {
    useAsTitle: 'name',
  },
  access: {
    read: ({ req }: AccessArgs) => Boolean(req.user),
    create: ({ req }: AccessArgs) => Boolean(req.user),
    update: ({ req }: AccessArgs) => Boolean(req.user),
    delete: ({ req }: AccessArgs) => Boolean(req.user),
  },
  fields: [
    {
      name: 'org',
      type: 'relationship',
      relationTo: 'orgs',
      required: true,
    },
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'graph',
      type: 'json',
      required: true,
    },
    {
      name: 'version',
      type: 'number',
      defaultValue: 1,
      required: true,
    },
  ],
}

