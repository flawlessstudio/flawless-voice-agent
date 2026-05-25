const requiredEnvVars = [
  'COMPLIANCE_MODE',
  'DNC_CHECK_ENABLED',
  'PII_REDACTION_ENABLED',
  'CONSENT_REQUIRED',
];

let failed = false;
for (const v of requiredEnvVars) {
  if (!process.env[v]) {
    console.error(`Missing compliance env var: ${v}`);
    failed = true;
  }
}

if (process.env.COMPLIANCE_MODE !== 'strict') {
  console.error('COMPLIANCE_MODE must be strict');
  failed = true;
}

if (failed) process.exit(1);
console.info('Compliance check passed.');
