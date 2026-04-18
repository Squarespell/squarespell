const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

let _getToken: (() => Promise<string>) | null = null;

export function setAuthToken(fn: (() => Promise<string>) | string | null) {
  if (typeof fn === 'function') {
    _getToken = fn;
  } else if (typeof fn === 'string') {
    _getToken = () => Promise.resolve(fn);
  } else {
    _getToken = null;
  }
}

async function getHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    if (_getToken) {
      const token = await _getToken();
      if (token) headers['Authorization'] = 'Bearer ' + token;
    } else if (typeof window !== 'undefined') {
      const clerk = (window as any).Clerk;
      if (clerk && clerk.session) {
        const token = await clerk.session.getToken();
        if (token) headers['Authorization'] = 'Bearer ' + token;
      }
    }
  } catch (e) {}
  return headers;
}

async function req(path: string, options?: RequestInit) {
  const res = await fetch(API_URL + path, { ...options, headers: await getHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  setAuthToken,
  getUserPlan:          ()                          => req('/api/user/plan'),
  generateQuiz:         (data: any)                 => req('/api/generate',                    { method: 'POST', body: JSON.stringify(data) }),
  generate:             (data: any)                 => req('/api/generate',                    { method: 'POST', body: JSON.stringify(data) }),
  createQuiz:           (data: any)                 => req('/api/quizzes',                     { method: 'POST', body: JSON.stringify(data) }),
  getQuizzes:           ()                          => req('/api/quizzes'),
  getQuiz:              (id: string)                => req('/api/quizzes/' + id),
  updateQuiz:           (id: string, d: any)        => req('/api/quizzes/' + id,               { method: 'PUT',    body: JSON.stringify(d) }),
  publishQuiz:          (id: string)                => req('/api/quizzes/' + id + '/publish',  { method: 'POST' }),
  deleteQuiz:           (id: string)                => req('/api/quizzes/' + id,               { method: 'DELETE' }),
  getLeads:             (quizId: string)            => req('/api/leads/' + quizId),
  getAnalytics:         (quizId: string)            => req('/api/analytics/' + quizId),
  scrapeBrand:          (url: string)               => req('/api/scrape-brand',                { method: 'POST', body: JSON.stringify({ url }) }),
  createCheckout:       (planId: string)            => req('/api/stripe/checkout',             { method: 'POST', body: JSON.stringify({ planId }) }),
  getSubscription:      ()                          => req('/api/stripe/subscription'),
  cancelSubscription:   ()                          => req('/api/stripe/cancel',               { method: 'POST' }),
  submitLead:           (quizId: string, d: any)    => req('/api/quiz/' + quizId + '/lead',    { method: 'POST', body: JSON.stringify(d) }),
  getPublicQuiz:        (slug: string)              => req('/api/quiz/' + slug),
  trackEvent:           (quizId: string, d: any)    => req('/api/quiz/' + quizId + '/track',   { method: 'POST', body: JSON.stringify(d) }),
  getOutcomeAutomations:(quizId: string)            => req('/api/quizzes/' + quizId + '/outcome-automations'),
  syncOutcomeAutomations:(quizId: string, d: any)   => req('/api/quizzes/' + quizId + '/outcome-automations', { method: 'PUT', body: JSON.stringify(d) }),
  generateEmailContent: (quizId: string, d: any)    => req('/api/quizzes/' + quizId + '/generate-email',      { method: 'POST', body: JSON.stringify(d) }),
  restoreQuiz:          (id: string)                => req('/api/quizzes/' + id + '/restore',       { method: 'POST' }),
  getArchivedQuizzes:   ()                          => req('/api/quizzes/archived/list'),
  getArchivedCampaigns: ()                          => req('/api/emails/campaigns/archived'),
  restoreCampaign:      (id: string)                => req('/api/emails/campaigns/' + id + '/restore', { method: 'POST' }),
  getDeliverability:    ()                          => req('/api/emails/deliverability'),
  getSuppressions:      ()                          => req('/api/emails/suppressions'),
  addSuppression:       (d: any)                    => req('/api/emails/suppressions',            { method: 'POST', body: JSON.stringify(d) }),
  removeSuppression:    (id: string)                => req('/api/emails/suppressions/' + id,      { method: 'DELETE' }),
};
