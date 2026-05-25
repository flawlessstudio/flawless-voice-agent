import * as fs from 'fs';
import * as path from 'path';

const core = JSON.parse(fs.readFileSync(path.resolve('registry/registry.core.json'), 'utf-8'));
const watchlist = JSON.parse(fs.readFileSync(path.resolve('registry/registry.watchlist.json'), 'utf-8'));

const REQUIRED_LAYERS = ['L1-telephony','L2-stt','L3-llm','L4-tts','L5-orchestration','L6-integration','L7-analytics-qa'];

for (const layer of REQUIRED_LAYERS) {
  const key = layer.replace(/^L\d+-/, '');
  const match = Object.keys(core.stack).find(k => k.toLowerCase().includes(key.split('-')[0]));
  if (!match) {
    console.error(`Missing core entry for layer: ${layer}`);
    process.exit(1);
  }
}

console.info('Registry validation passed.');
