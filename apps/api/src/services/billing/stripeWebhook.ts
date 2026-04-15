import type { Request, Response } from 'express'

export async function handleStripeWebhook(_req: Request, res: Response) {
  // Placeholder: server.ts currently mounts a raw-body webhook endpoint.
  // We keep this file so Payload config compiles and can later delegate to a single handler.
  return res.status(501).json({ ok: false, message: 'Stripe webhook handler not configured' })
}

