import type { AccessArgs, CollectionConfig } from 'payload';

const isAuthenticated = ({ req }: AccessArgs) => Boolean(req.user)

export const Connectors: CollectionConfig = {
  slug: 'connectors',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'kind', 'provider', 'org', 'updatedAt'],
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
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'kind',
      type: 'select',
      required: true,
      options: [
        { label: 'LLM Provider', value: 'llm' },
        { label: 'Tool / API', value: 'tool' },
        { label: 'MCP Server', value: 'mcp' },
      ],
      index: true,
    },
    {
      name: 'provider',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'e.g. openai, anthropic, gemini, rest, graphql, mcp',
      },
    },
    {
      name: 'config',
      type: 'json',
      required: true,
      admin: {
        description:
          'Non-secret config only. Secrets must be referenced (e.g. env var name) and resolved server-side at runtime.',
      },
    },
    {
      name: 'secretRef',
      type: 'text',
      admin: {
        description:
          'Reference to a secret (e.g. ENV var name). Never store raw secret values here.',
      },
    },
    {
      name: 'approved',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'If governance requires approval for new connectors, unapproved connectors cannot be used in runs.',
      },
    },
  ],
};

