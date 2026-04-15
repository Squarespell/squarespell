const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

async function authHeaders(): Promise<Record<string, string>> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    if (typeof window !== 'undefined') {
      const clerk = (window as any).Clerk;
      if (clerk?.session) {
        const t = await clerk.session.getToken();
        if (t) h['Authorization'] = 'Bearer ' + t;
      }
    }
  } catch {}
  return h;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(API_URL + path, {
    ...init,
    headers: { ...(await authHeaders()), ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export type Campaign = {
  id: string; name: string; subject: string;
  from_name: string; from_email: string; html: string;
  status: 'draft'|'scheduled'|'sending'|'sent'|'failed';
  created_at: string;
};

export async function listCampaigns(): Promise<Campaign[]> {
  return req('/api/emails/campaigns');
}
export async function createCampaign(p: Partial<Campaign>): Promise<Campaign> {
  return req('/api/emails/campaigns', { method: 'POST', body: JSON.stringify(p) });
}
export async function sendCampaign(id: string, recipients: string[]) {
  return req<{sent:number;skipped:number;results:any[]}>(`/api/emails/campaigns/${id}/send`, {
    method: 'POST', body: JSON.stringify({ recipients }),
  });
}
export async function getQuota(): Promise<{used:number;cap:number;plan:string}> {
  return req('/api/emails/quota');
}
