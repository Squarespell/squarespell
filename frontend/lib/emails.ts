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

export type CampaignMode = 'blast' | 'live';
export type AnswerFilter = {
  question_id: string;
  value: string;
};

export type SourceFilters = {
  outcome_id?: string;
  min_score?: number;
  max_score?: number;
  since?: string;
  until?: string;
  answer_filters?: AnswerFilter[];
};

export type Campaign = {
  id: string; name: string; subject: string;
  from_name: string; from_email: string; html: string;
  status: 'draft'|'scheduled'|'sending'|'sent'|'failed';
  mode?: CampaignMode;
  source_quiz_id?: string | null;
  source_filters?: SourceFilters;
  scheduled_at?: string | null;
  last_run_at?: string | null;
  sent_count?: number;
  created_at: string;
};

export type SourceQuiz = { id: string; title: string; slug: string };

export async function getCampaign(id: string): Promise<Campaign> {
  return req(`/api/emails/campaigns/${id}`);
}

export async function listCampaigns(): Promise<Campaign[]> {
  return req('/api/emails/campaigns');
}

export async function createCampaign(p: Partial<Campaign>): Promise<Campaign> {
  return req('/api/emails/campaigns', { method: 'POST', body: JSON.stringify(p) });
}

export async function updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign> {
  return req(`/api/emails/campaigns/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export async function deleteCampaign(id: string): Promise<{deleted:boolean}> {
  return req(`/api/emails/campaigns/${id}`, { method: 'DELETE' });
}

export async function sendCampaign(id: string, recipients?: string[]) {
  return req<{sent:number;skipped:number;resolved?:number;results:any[]}>(
    `/api/emails/campaigns/${id}/send`,
    { method: 'POST', body: JSON.stringify(recipients ? { recipients } : {}) },
  );
}

export async function getQuota(): Promise<{used:number;cap:number;plan:string}> {
  return req('/api/emails/quota');
}

export async function listSourceQuizzes(): Promise<SourceQuiz[]> {
  return req('/api/emails/source-quizzes');
}

export async function listOutcomesForQuiz(quizId: string): Promise<string[]> {
  return req(`/api/emails/source-quizzes/${quizId}/outcomes`);
}

export type QuizQuestion = {
  id: string;
  text: string;
  type: string;
  options: { id: string; text: string }[];
};

export async function listQuestionsForQuiz(quizId: string): Promise<QuizQuestion[]> {
  return req(`/api/emails/source-quizzes/${quizId}/questions`);
}

export async function previewRecipients(quizId: string, filters: SourceFilters = {}) {
  const qs = new URLSearchParams({ quiz_id: quizId, filters: JSON.stringify(filters) });
  return req<{ count: number; emails: string[] }>(`/api/emails/recipients/preview?${qs}`);
}

export async function testSendCampaign(id: string, to: string) {
  return req(`/api/emails/campaigns/${id}/test-send`, { method: 'POST', body: JSON.stringify({ to }) });
}

export type CampaignStats = {
  total: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  hard_bounced: number;
  soft_bounced: number;
  complained: number;
  failed: number;
};

export async function getCampaignStats(id: string): Promise<CampaignStats> {
  return req(`/api/emails/campaigns/${id}/stats`);
}
