import { z } from 'zod'

/**
 * Provider/tool abstraction layer.
 * The runtime calls these interfaces; connectors are implemented as adapters.
 */

export const SecretRefSchema = z.object({
  kind: z.enum(['env']).default('env'),
  ref: z.string().min(1),
})
export type SecretRef = z.infer<typeof SecretRefSchema>

export type SecretResolver = (secretRef: SecretRef) => Promise<string>

export type ProviderKind = 'llm' | 'tool' | 'mcp'

export type LLMMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export type LLMGenerateArgs = {
  model: string
  messages: LLMMessage[]
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
}

export type LLMGenerateResult = {
  text: string
  usage?: {
    inputTokens?: number
    outputTokens?: number
    totalTokens?: number
    costUsd?: number
  }
  raw?: unknown
}

export interface LLMAdapter {
  readonly kind: 'llm'
  readonly provider: string
  generate(args: LLMGenerateArgs): Promise<LLMGenerateResult>
}

export type RESTToolArgs = {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  url: string
  headers?: Record<string, string>
  query?: Record<string, string>
  body?: unknown
  signal?: AbortSignal
}

export type RESTToolResult = {
  status: number
  headers: Record<string, string>
  body: unknown
}

export interface ToolAdapter {
  readonly kind: 'tool'
  readonly provider: string
  call(args: RESTToolArgs): Promise<RESTToolResult>
}

