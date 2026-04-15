import type { AccessArgs, CollectionConfig } from 'payload'

export const Orgs: CollectionConfig = {
  slug: 'orgs',
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
    { name: 'name', type: 'text', required: true },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'members',
      type: 'array',
      fields: [
        { name: 'user', type: 'relationship', relationTo: 'users', required: true },
        {
          name: 'role',
          type: 'select',
          required: true,
          defaultValue: 'owner',
          options: [
            { label: 'Owner', value: 'owner' },
            { label: 'Admin', value: 'admin' },
            { label: 'Member', value: 'member' },
            { label: 'Viewer', value: 'viewer' },
          ],
        },
      ],
    },
  ],
}

