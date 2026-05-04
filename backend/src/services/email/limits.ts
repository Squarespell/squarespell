export const EMAIL_LIMITS: Record<string, number> = { free: 50, trial: 200, starter: 500, core: 500, growth: 2500, pro: 10000, business: 25000, agency: 25000 };
export function limitFor(plan?: string) { return EMAIL_LIMITS[plan || 'free'] ?? 50; }
