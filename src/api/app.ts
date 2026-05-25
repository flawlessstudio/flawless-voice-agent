import express from 'express';
import { twilioWebhookRouter } from './routes/twilio';

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/twilio', twilioWebhookRouter);

  return app;
}
