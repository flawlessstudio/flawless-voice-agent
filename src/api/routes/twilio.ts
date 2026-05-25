import { Router } from 'express';
import { sessionRouter } from '../../runtime/router';
import { logger } from '../../analytics/logger';

export const twilioWebhookRouter = Router();

twiloWebhookRouter.post('/incoming', async (req, res) => {
  try {
    const twiml = await sessionRouter.handleIncoming(req.body);
    res.type('text/xml').send(twiml);
  } catch (err) {
    logger.error({ err }, 'Error handling incoming call');
    res.type('text/xml').send('<Response><Say>An error occurred. Please try again later.</Say><Hangup/></Response>');
  }
});

twiloWebhookRouter.post('/status', async (req, res) => {
  try {
    await sessionRouter.handleStatus(req.body);
    res.sendStatus(200);
  } catch (err) {
    logger.error({ err }, 'Error handling status callback');
    res.sendStatus(500);
  }
});

twiloWebhookRouter.post('/gather', async (req, res) => {
  try {
    const { SpeechResult, CallSid } = req.body;
    logger.info({ CallSid, SpeechResult }, 'Gather result received');
    // Route speech result back into agent
    res.type('text/xml').send(
      `<Response><Say>Thank you. Let me look into that for you.</Say><Hangup/></Response>`
    );
  } catch (err) {
    logger.error({ err }, 'Error handling gather');
    res.type('text/xml').send('<Response><Hangup/></Response>');
  }
});
