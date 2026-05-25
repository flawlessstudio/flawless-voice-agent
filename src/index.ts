import 'dotenv/config';
import { createApp } from './api/app';

const PORT = parseInt(process.env.PORT || '3000', 10);

const app = createApp();

app.listen(PORT, () => {
  console.info(`flawless-voice-agent running on port ${PORT}`);
});
