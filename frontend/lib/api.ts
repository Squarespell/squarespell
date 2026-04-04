const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Get a fresh Clerk token on every call — never use a stored one (expires in 60s)
async function getFreshToken(): Promise<string | null> {
  try {
    if (typeof window !== 'undefined' && (window as any).Clerk?.session) {
      return await (window as any).Clerk.session.getToken();
    }
    return null;
  } catch {
    return null;
  }
}

async function authHeaders(): Promise<HeadersInit> {
  const token = await getFreshToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// No-op kept so existing imports don't break
export function setAuthToken(_token: string) {}

export async function generateQuiz(data: {
  url: string;
  business_type: string;
  goal: string;
  brandData?: any;
}) {
  const res = await fetch(`${API_URL}/api/generate`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || 'Failed to generate quiz');
  }
  return res.json();
}

export async function getQuizzes() {
  const res = await fetch(`${API_URL}/api/quizzes`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch quizzes');
  return res.json();
}

export async function getQuiz(id: string) {
  const res = await fetch(`${API_URL}/api/quizzes/${id}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch quiz');
  return res.json();
}

export async function updateQuiz(id: string, data: any) {
  const res = await fetch(`${API_URL}/api/quizzes/${id}`, {
    method: 'PUT',
    headers: await authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update quiz');
  return res.json();
}

export async function deleteQuiz(id: string) {
  const res = await fetch(`${API_URL}/api/quizzes/${id}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete quiz');
  return res.json();
}

export async function getLeads(quizId: string) {
  const res = await fetch(`${API_URL}/api/leads/${quizId}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch leads');
  return res.json();
}

export async function getAnalytics(quizId: string) {
  const res = await fetch(`${API_URL}/api/analytics/${quizId}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch analytics');
  return res.json();
}

export async function getUserPlan() {
  const res = await fetch(`${API_URL}/api/user/plan`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch plan');
  return res.json();
}

export async function scrapeBrand(url: string) {
  const res = await fetch(`${API_URL}/api/scrape-brand`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error('Failed to scrape brand');
  return res.json();
}

// Object export — for all pages using { api } pattern
export const api = {
  setAuthToken,
  generateQuiz,
  getQuizzes,
  getQuiz,
  updateQuiz,
  deleteQuiz,
  getLeads,
  getAnalytics,
  getUserPlan,
  scrapeBrand,
};
