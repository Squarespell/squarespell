const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

let _getToken: (() => Promise<string>) | null = null;

export function setAuthToken(fn: (() => Promise<string>) | string) {
  if (typeof fn === 'function') {
    _getToken = fn;
  } else {
    _getToken = () => Promise.resolve(fn);
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

async function req(path: string, options?: RequestInit): Promise<any> {
  const res = await fetch(API_URL + path, { ...options, headers: await getHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  setAuthToken,
  getUserPlan:   ()                    => req('/api/user/plan'),
  generateQuiz:  (data: any)           => req('/api/generate',                   { method: 'POST', body: JSON.stringify(data) }),
  generate:      (data: any)           => req('/api/generate',                   { method: 'POST', body: JSON.stringify(data) }),
  createQuiz:    (data: any)           => req('/api/quizzes',                    { method: 'POST', body: JSON.stringify(data) }),
  getQuizzes:    ()                    => req('/api/quizzes'),
  getQuiz:       (id: string)          => req('/api/quizzes/' + id),
  updateQuiz:    (id: string, d: any)  => req('/api/quizzes/' + id,              { method: 'PUT',  body: JSON.stringify(d) }),
  publishQuiz:   (id: string)          => req('/api/quizzes/' + id + '/publish', { method: 'POST' }),
  deleteQuiz:    (id: string)          => req('/api/quizzes/' + id,              { method: 'DELETE' }),
  getLeads:      (quizId: string)      => req('/api/leads/' + quizId),
  getAnalytics:  (quizId: string)      => req('/api/analytics/' + quizId),
  scrapeBrand:   (url: string)         => req('/api/scrape-brand',               { method: 'POST', body: JSON.stringify({ url }) }),
};
