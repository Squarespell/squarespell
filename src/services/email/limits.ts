export const EMAIL_LIMITS: Record<string, number> = {
  starter: 500, pro: 5000, agency: 25000,
};
export function limitFor(plan?: string) { return EMAIL_LIMITS[plan || 'starter'] ?? 500; }
