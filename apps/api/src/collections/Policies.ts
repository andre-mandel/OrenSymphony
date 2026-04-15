import type { AccessArgs, CollectionConfig } from 'payload'

const isAuthenticated = ({ req }: AccessArgs) => Boolean(req.user)

/**
 * Org/workspace governance policies.
 *
 * Enforcement is performed server-side during run creation/execution and connector use.
 */
export const Policies: CollectionConfig = {
  slug: 'policies',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'org', 'workspace', 'updatedAt'],
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
      name: 'workspace',
      type: 'relationship',
      relationTo: 'workspaces',
      index: true,
      admin: {
        description: 'Optional. If set, policy only applies to this workspace; otherwise org-wide.',
      },
    },
    { name: 'name', type: 'text', required: true },
    {
      name: 'mode',
      type: 'select',
      required: true,
      defaultValue: 'enforce',
      options: [
        { label: 'Enforce (block)', value: 'enforce' },
        { label: 'Warn only', value: 'warn' },
      ],
    },
    {
      name: 'llmAllowlist',
      type: 'array',
      fields: [
        { name: 'provider', type: 'text', required: true },
        {
          name: 'model',
          type: 'text',
          admin: { description: 'Optional. If empty, all models from provider are allowed.' },
        },
      ],
      admin: { description: 'If set, only these LLM providers/models may be used.' },
    },
    {
      name: 'toolAllowlist',
      type: 'array',
      fields: [
        { name: 'connector', type: 'relationship', relationTo: 'connectors', required: true },
      ],
      admin: { description: 'If set, only these tool connectors may be used.' },
    },
    {
      name: 'mcpAllowlist',
      type: 'array',
      fields: [
        { name: 'connector', type: 'relationship', relationTo: 'connectors', required: true },
      ],
      admin: { description: 'If set, only these MCP server connectors may be used.' },
    },
    {
      name: 'dataControls',
      type: 'group',
      fields: [
        {
          name: 'redactPatterns',
          type: 'array',
          fields: [
            { name: 'name', type: 'text', required: true },
            { name: 'regex', type: 'text', required: true },
            {
              name: 'replacement',
              type: 'text',
              defaultValue: '[REDACTED]',
            },
          ],
          admin: { description: 'Applied to prompts/inputs before leaving the system boundary.' },
        },
        {
          name: 'blockOnPII',
          type: 'checkbox',
          defaultValue: false,
          admin: { description: 'If enabled, block runs when redaction detects matches.' },
        },
      ],
    },
    {
      name: 'approvals',
      type: 'group',
      fields: [
        {
          name: 'requireApprovalForExternalTools',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'requireApprovalForNewConnectors',
          type: 'checkbox',
          defaultValue: false,
          admin: { description: 'Blocks usage of connectors that are not marked as approved.' },
        },
      ],
    },
    {
      name: 'retentionDays',
      type: 'number',
      admin: { description: 'Retention for run logs/outputs; enforced by background job later.' },
    },
  ],
}

