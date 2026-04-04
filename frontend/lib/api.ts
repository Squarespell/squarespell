'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

async function freshToken(): Promise<string | null> {
  try {
    if (typeof window === 'undefined') return null;
    const clerk = (window as any).Clerk;
    if (clerk?.session) return await clerk.session.getToken();
    return null;
  } catch {
    return null;
  }
}

async function h(): Promise<HeadersInit> {
  const t = await freshToken();
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

async function request<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { ...init, headers: await h() });
  if (!res.ok) {
    const e = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error((e as any).error || 'Request failed');
  }
  return res.json();
}

export function setAuthToken(_t: string) {}

export const api = {
  setAuthToken: (_t: string) => {},
  getUserPlan: () => request('/api/user/plan'),
  generateQuiz: (data: { url: string; business_type: string; goal: string }) =>
    request('/api/generate', { method: 'POST', body: JSON.stringify(data) }),
  generate: (data: { url: string; business_type: string; goal: string }) =>
    request('/api/generate', { method: 'POST', body: JSON.stringify(data) }),
  getQuizzes: () => request('/api/quizzes'),
  getQuiz: (id: string) => request(`/api/quizzes/${id}`),
  updateQuiz: (id: string, data: any) =>
    request(`/api/quizzes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteQuiz: (id: string) =>
    request(`/api/quizzes/${id}`, { method: 'DELETE' }),
  getLeads: (quizId: string) => request(`/api/leads/${quizId}`),
  getAnalytics: (quizId: string) => request(`/api/analytics/${quizId}`),
  scrapeBrand: (url: string) =>
    request('/api/scrape-brand', { method: 'POST', body: JSON.stringify({ url }) }),
};
