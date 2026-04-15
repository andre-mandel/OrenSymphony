import type { PayloadHandler } from 'payload'
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'

import { Users } from './collections/Users'
import { Orgs } from './collections/Orgs'
import { Workspaces } from './collections/Workspaces'
import { Pipelines } from './collections/Pipelines'
import { Connectors } from './collections/Connectors'
import { PipelineRuns } from './collections/PipelineRuns'
import { Plans } from './collections/Plans'
import { Policies } from './collections/Policies'
import { AuditEvents } from './collections/AuditEvents'

export default buildConfig({
  secret: process.env.PAYLOAD_SECRET || 'dev-secret-change-me',
  serverURL: process.env.SERVER_URL || process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3001',
  admin: {
    user: 'users',
  },
  collections: [Users, Orgs, Workspaces, Plans, Policies, AuditEvents, Pipelines, Connectors, PipelineRuns],
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/orensymphony',
    },
  }),
  cors: [process.env.WEB_ORIGIN || 'http://localhost:3000'],
  csrf: [process.env.WEB_ORIGIN || 'http://localhost:3000'],
  typescript: {
    outputFile: 'src/payload-types.ts',
  },
  // Custom REST routes are mounted in `src/server.ts` (Express).
})

