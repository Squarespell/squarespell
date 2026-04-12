import crypto from 'crypto';

const REPORT_SECRET = process.env.REPORT_SECRET || process.env.CLERK_SECRET_KEY || 'fallback-secret-key';
const TOKEN_VALIDITY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Generate a time-bound HMAC signature for a lead ID.
 * Format: {leadId}.{timestamp}.{signature}
 */
export function generateReportToken(leadId: string): string {
  const timestamp = Date.now();
  const data = `${leadId}.${timestamp}`;
  const signature = crypto.createHmac('sha256', REPORT_SECRET).update(data).digest('hex');
  return `${data}.${signature}`;
}

/**
 * Verify a report token and check if it's still valid.
 * Returns the leadId if valid, throws an error otherwise.
 */
export function verifyReportToken(token: string): string {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const leadId = parts[0];
    const timestamp = parseInt(parts[1], 10);
    const signature = parts[2];

    // Check if token has expired (30 days)
    const now = Date.now();
    if (now - timestamp > TOKEN_VALIDITY_MS) {
      throw new Error('Token expired');
    }

    // Verify signature
    const data = `${leadId}.${timestamp}`;
    const expectedSignature = crypto.createHmac('sha256', REPORT_SECRET).update(data).digest('hex');

    if (signature !== expectedSignature) {
      throw new Error('Invalid signature');
    }

    return leadId;
  } catch (err: any) {
    throw new Error(`Token verification failed: ${err.message}`);
  }
}
