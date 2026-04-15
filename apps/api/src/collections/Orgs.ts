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
      name: 'plan',
      type: 'relationship',
      relationTo: 'plans',
      required: true,
      admin: {
        description: 'Subscription tier for this org (used for server-side limits).',
      },
    },
    {
      name: 'stripeCustomerId',
      type: 'text',
      index: true,
      admin: {
        description: 'Stripe customer id (set via billing webhook).',
      },
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

