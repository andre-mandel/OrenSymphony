import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import payload from 'payload';
import config from './payload.config.js';
import { getStripe } from './billing/stripe.js'

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  }) as unknown as express.RequestHandler,
);
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

const PORT = Number(process.env.PORT || 3001);

async function start() {
  await payload.init({
    config: config as any,
  });

  app.get('/healthz', (_req, res) => res.json({ ok: true }));
  app.get('/api/billing/pricing', (_req, res) => {
    res.json({
      plans: [
        {
          code: 'free',
          name: 'Free',
          seatsIncluded: 1,
          retentionDays: 7,
          features: ['Public templates', 'Community connectors', 'Basic collaboration'],
          limits: { runsPerMonth: 200 },
        },
        {
          code: 'pro',
          name: 'Pro',
          seatsIncluded: 1,
          retentionDays: 90,
          features: ['Private templates', 'Private connectors', 'Scheduled runs', 'Longer retention'],
          limits: { runsPerMonth: 5000 },
        },
        {
          code: 'team',
          name: 'Team',
          seatsIncluded: 5,
          retentionDays: 180,
          features: ['Multi-user collaboration', 'RBAC', 'Shared connectors', 'Org audit-lite'],
          limits: { runsPerMonth: 20000 },
        },
        {
          code: 'enterprise',
          name: 'Enterprise',
          seatsIncluded: null,
          retentionDays: 365,
          features: ['SSO/SAML', 'Advanced audit', 'Policy controls', 'Dedicated capacity', 'Self-host option'],
          limits: { runsPerMonth: null },
        },
      ],
    })
  })

  app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), (req, res) => {
    try {
      const stripe = getStripe()
      if (!stripe) return res.status(501).send('Stripe not configured')
      const sig = req.headers['stripe-signature']
      if (!sig || Array.isArray(sig)) return res.status(400).send('Missing signature')

      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
      if (!webhookSecret) return res.status(501).send('Stripe webhook not configured')

      const evt = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
      // TODO: handle subscription lifecycle events, attach to org, update limits.
      payload.logger.info(`Stripe webhook received: ${evt.type}`)
      return res.json({ received: true })
    } catch (e: any) {
      payload.logger.error(e)
      return res.status(400).send(`Webhook Error: ${e?.message ?? 'unknown'}`)
    }
  })

  app.listen(PORT, () => {
    payload.logger.info(`API listening on :${PORT}`);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

