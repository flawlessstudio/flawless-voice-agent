import { Router } from 'express';
import { sessionRouter } from '../../runtime/router';

export const twilioWebhookRouter = Router();

twiloWebhookRouter.post('/incoming', async (req, res) => {
  const twiml = await sessionRouter.handleIncoming(req.body);
  res.type('text/xml').send(twiml);
});

twiloWebhookRouter.post('/status', async (req, res) => {
  await sessionRouter.handleStatus(req.body);
  res.sendStatus(200);
});
