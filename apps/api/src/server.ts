import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import payload from 'payload';
import config from './payload.config.js';

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

  app.listen(PORT, () => {
    payload.logger.info(`API listening on :${PORT}`);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

