import type { CollectionConfig } from 'payload'
import type { AccessArgs } from 'payload'

const isAuthenticated = ({ req }: AccessArgs) => Boolean(req.user)

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
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'queued',
      options: [
        { label: 'Queued', value: 'queued' },
        { label: 'Running', value: 'running' },
        { label: 'Succeeded', value: 'succeeded' },
        { label: 'Failed', value: 'failed' },
        { label: 'Canceled', value: 'canceled' },
      ],
      index: true,
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

