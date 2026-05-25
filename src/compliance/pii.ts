const PII_PATTERNS = [
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,   // phone
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, // email
  /\b\d{3}-\d{2}-\d{4}\b/g,            // SSN
];

export function redactPII(text: string): string {
  return PII_PATTERNS.reduce((acc, pattern) => acc.replace(pattern, '[REDACTED]'), text);
}
