/**
 * Structured JSON logging, picked up by `wrangler tail` and the Cloudflare dashboard
 */
export function log(level: 'info' | 'error' | 'warn', message: string, meta?: Record<string, any>) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta
  };
  console.log(JSON.stringify(logEntry));
}
