import * as fs from 'fs';
import * as path from 'path';

const schemaFiles = [
  'schemas/candidate.schema.json',
  'schemas/stack-recipe.schema.json',
  'schemas/call-session.schema.json',
  'schemas/audit-entry.schema.json',
];

for (const file of schemaFiles) {
  try {
    JSON.parse(fs.readFileSync(path.resolve(file), 'utf-8'));
    console.info(`✓ ${file}`);
  } catch (e) {
    console.error(`✗ ${file}: ${e}`);
    process.exit(1);
  }
}

console.info('Schema validation passed.');
