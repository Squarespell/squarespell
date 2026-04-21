import { URL } from 'url';

/**
 * Validate a webhook URL to prevent SSRF attacks.
 * Returns an error string if invalid, or null if safe.
 */
export function validateWebhookUrl(rawUrl: string): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return 'URL is required';
  }

  var parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return 'Invalid URL format';
  }

  // Only allow HTTPS (and HTTP for localhost in dev)
  if (parsed.protocol !== 'https:') {
    if (parsed.protocol === 'http:' && parsed.hostname === 'localhost') {
      // Allow HTTP localhost in development only
      if (process.env.NODE_ENV === 'production') {
        return 'Only HTTPS URLs are allowed in production';
      }
    } else {
      return 'Only HTTPS URLs are allowed';
    }
  }

  // Block private/internal IP ranges
  var hostname = parsed.hostname.toLowerCase();

  // Block obvious internal hostnames
  var blockedHostnames = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    'metadata.google.internal',
    'metadata.google',
    'kubernetes.default',
    'kubernetes.default.svc',
  ];

  if (process.env.NODE_ENV === 'production' && blockedHostnames.includes(hostname)) {
    return 'Internal hostnames are not allowed';
  }

  // Block cloud metadata endpoints
  if (hostname === '169.254.169.254' || hostname === 'fd00::' || hostname.startsWith('169.254.')) {
    return 'Cloud metadata endpoints are not allowed';
  }

  // Block private IP ranges
  var privateIpPatterns = [
    /^10\./,                    // 10.0.0.0/8
    /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12
    /^192\.168\./,              // 192.168.0.0/16
    /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // 100.64.0.0/10
    /^198\.18\./,               // 198.18.0.0/15
    /^198\.19\./,
    /^0\./,                     // 0.0.0.0/8
    /^127\./,                   // 127.0.0.0/8
  ];

  for (var pattern of privateIpPatterns) {
    if (pattern.test(hostname)) {
      return 'Private IP addresses are not allowed';
    }
  }

  // Block URLs with credentials
  if (parsed.username || parsed.password) {
    return 'URLs with embedded credentials are not allowed';
  }

  return null; // URL is safe
}
