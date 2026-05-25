import * as fs from 'fs';
import * as path from 'path';

const auditLog = fs.readFileSync(path.resolve('registry/audit-log.md'), 'utf-8');
const core = JSON.parse(fs.readFileSync(path.resolve('registry/registry.core.json'), 'utf-8'));

const coreEntries = Object.keys(core.stack).length;
console.info(`Core stack entries: ${coreEntries}`);
console.info(`Audit log length: ${auditLog.split('\n').length} lines`);
console.info('Registry audit complete.');
