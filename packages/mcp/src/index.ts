import { z } from 'zod'

/**
 * Minimal MCP types/bridge surface.
 *
 * This is intentionally thin: the goal is to treat MCP as a discoverable tool catalog
 * that can be surfaced as nodes in the orchestrator graph.
 */

export const MCPToolSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  inputSchema: z.unknown().optional(),
})

export type MCPTool = z.infer<typeof MCPToolSchema>

export const MCPServerSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  headers: z.record(z.string(), z.string()).optional(),
})

export type MCPServer = z.infer<typeof MCPServerSchema>

export interface MCPClient {
  listTools(): Promise<MCPTool[]>
  callTool(args: { name: string; input: unknown; signal?: AbortSignal }): Promise<unknown>
}

/**
 * Placeholder HTTP-based MCP client.
 * Real implementations will depend on the MCP transport being used (stdio, http+sse, websockets, etc.).
 */
export function createMCPClient(_server: MCPServer): MCPClient {
  return {
    async listTools() {
      // TODO: implement actual MCP discovery.
      return []
    },
    async callTool(_args) {
      throw new Error('MCP callTool not implemented')
    },
  }
}

