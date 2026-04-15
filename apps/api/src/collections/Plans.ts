import type { CollectionConfig } from 'payload'
import type { AccessArgs } from 'payload'

const isAuthed = ({ req }: AccessArgs) => Boolean(req.user)

export const Plans: CollectionConfig = {
  slug: 'plans',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'key', 'active', 'updatedAt'],
  },
  access: {
    read: () => true,
    create: isAuthed,
    update: isAuthed,
    delete: isAuthed,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'key',
      type: 'text',
      required: true,
      unique: true,
      admin: { description: 'Internal key e.g. free, pro, team, business' },
    },
    {
      name: 'active',
      type: 'checkbox',
      required: true,
      defaultValue: true,
    },
    {
      name: 'monthlyPriceUsd',
      type: 'number',
      admin: { description: 'Displayed monthly price (USD). Actual billing is controlled by Stripe.' },
    },
    {
      name: 'included',
      type: 'json',
      admin: {
        description:
          'Plan limits/entitlements (seats, runs, retention, connectors). Enforced server-side in middleware.',
      },
    },
    {
      name: 'stripe',
      type: 'group',
      fields: [
        { name: 'productId', type: 'text' },
        { name: 'monthlyPriceId', type: 'text' },
        { name: 'yearlyPriceId', type: 'text' },
      ],
    },
  ],
}

