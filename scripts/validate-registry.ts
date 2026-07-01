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

// Validate the watchlist: every candidate must be traceable to a known layer
// and carry the reason/score fields the registry taxonomy requires.
const REQUIRED_CANDIDATE_FIELDS = ['layer', 'name', 'reason', 'score'] as const;

for (const candidate of watchlist.candidates ?? []) {
  for (const field of REQUIRED_CANDIDATE_FIELDS) {
    if (candidate[field] === undefined || candidate[field] === '') {
      console.error(`Watchlist candidate "${candidate.name ?? '(unnamed)'}" is missing required field: ${field}`);
      process.exit(1);
    }
  }
  if (!REQUIRED_LAYERS.includes(candidate.layer)) {
    console.error(`Watchlist candidate "${candidate.name}" references unknown layer: ${candidate.layer}`);
    process.exit(1);
  }
  if (typeof candidate.score !== 'number' || candidate.score < 0 || candidate.score > 10) {
    console.error(`Watchlist candidate "${candidate.name}" has an invalid score: ${candidate.score}`);
    process.exit(1);
  }
}

console.info('Registry validation passed.');
