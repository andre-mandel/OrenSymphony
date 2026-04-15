import type { AccessArgs, CollectionConfig } from 'payload';

export const Connectors: CollectionConfig = {
  slug: 'connectors',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'kind', 'provider', 'org', 'updatedAt'],
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
  ],
};

