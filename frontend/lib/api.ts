const BASE = process.env.NEXT_PUBLIC_API_URL!;
async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers }, credentials: 'include' });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error ?? `Request failed: ${res.status}`); }
  return res.json();
}
export const api = {
  getQuizzes:     ()              => apiFetch('/api/quizzes'),
  getQuiz:        (id: string)    => apiFetch(`/api/quizzes/${id}`),
  createQuiz:     (body: any)     => apiFetch('/api/quizzes', { method: 'POST', body: JSON.stringify(body) }),
  updateQuiz:     (id: string, body: any) => apiFetch(`/api/quizzes/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  publishQuiz:    (id: string)    => apiFetch(`/api/quizzes/${id}/publish`, { method: 'POST' }),
  deleteQuiz:     (id: string)    => apiFetch(`/api/quizzes/${id}`, { method: 'DELETE' }),
  generateQuiz:   (body: any)     => apiFetch('/api/generate', { method: 'POST', body: JSON.stringify(body) }),
  scrapeBrand:    (url: string)   => apiFetch('/api/scrape-brand', { method: 'POST', body: JSON.stringify({ url }) }),
  getAnalytics:   (id: string)    => apiFetch(`/api/analytics/${id}`),
  getUserPlan:    ()              => apiFetch('/api/user/plan'),
  createCheckout: (plan: string)  => apiFetch('/api/stripe/create-checkout', { method: 'POST', body: JSON.stringify({ plan }) }),
  getPublicQuiz:  (slug: string)  => fetch(`${BASE}/api/quiz/${slug}`).then(r => r.json()),
  trackEvent:     (slug: string, body: any) => fetch(`${BASE}/api/quiz/${slug}/event`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  submitLead:     (slug: string, body: any) => fetch(`${BASE}/api/quiz/${slug}/lead`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  processOther:   (slug: string, body: any) => fetch(`${BASE}/api/quiz/${slug}/process-other`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
};
