var API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

var _getToken: (() => Promise<string>) | null = null;
var _getTokenFresh: (() => Promise<string>) | null = null;

export function setAuthToken(fn: (() => Promise<string>) | string | null, freshFn?: (() => Promise<string>) | null) {
  if (typeof fn === 'function') {
    _getToken = fn;
  } else if (typeof fn === 'string') {
    _getToken = function() { return Promise.resolve(fn); };
  } else {
    _getToken = null;
  }
  _getTokenFresh = freshFn || null;
}

async function getHeaders(fresh?: boolean): Promise<Record<string, string>> {
  var headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    var tokenFn = (fresh && _getTokenFresh) ? _getTokenFresh : _getToken;
    if (tokenFn) {
      var token = await tokenFn();
      if (token) headers['Authorization'] = 'Bearer ' + token;
    } else if (typeof window !== 'undefined') {
      var clerk = (window as any).Clerk;
      if (clerk && clerk.session) {
        var token2 = await clerk.session.getToken();
        if (token2) headers['Authorization'] = 'Bearer ' + token2;
      }
    }
  } catch (e) {}
  return headers;
}

async function req(path: string, options?: RequestInit) {
  var res = await fetch(API_URL + path, { ...options, headers: await getHeaders() });
  // One-shot retry on 401: force a fresh token and try once more
  if (res.status === 401 && _getTokenFresh) {
    res = await fetch(API_URL + path, { ...options, headers: await getHeaders(true) });
  }
  var data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  setAuthToken,
  getUserPlan:          ()                          => req('/api/user/plan'),
  getBrandKit:          ()                          => req('/api/user/brand-kit'),
  saveBrandKit:         (d: any)                    => req('/api/user/brand-kit',              { method: 'PUT',  body: JSON.stringify(d) }),
  generateQuiz:         (data: any)                 => req('/api/generate',                    { method: 'POST', body: JSON.stringify(data) }),
  generate:             (data: any)                 => req('/api/generate',                    { method: 'POST', body: JSON.stringify(data) }),
  createQuiz:           (data: any)                 => req('/api/quizzes',                     { method: 'POST', body: JSON.stringify(data) }),
  getQuizzes:           ()                          => req('/api/quizzes'),
  getQuiz:              (id: string)                => req('/api/quizzes/' + id),
  updateQuiz:           (id: string, d: any)        => req('/api/quizzes/' + id,               { method: 'PATCH',  body: JSON.stringify(d) }),
  publishQuiz:          (id: string)                => req('/api/quizzes/' + id + '/publish',  { method: 'POST' }),
  deleteQuiz:           (id: string)                => req('/api/quizzes/' + id,               { method: 'DELETE' }),
  getLeads:             (quizId: string)            => req('/api/leads/' + quizId),
  getAnalytics:         (quizId: string, opts?: { exclude_bots?: boolean; since?: string }) => {
    const params = new URLSearchParams();
    if (opts?.exclude_bots) params.set('exclude_bots', 'true');
    if (opts?.since) params.set('since', opts.since);
    const qs = params.toString();
    return req('/api/analytics/' + quizId + (qs ? '?' + qs : ''));
  },
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
  getFunnel:            (quizId: string, opts?: { exclude_bots?: boolean }) => req('/api/analytics/' + quizId + '/funnel' + (opts?.exclude_bots ? '?exclude_bots=true' : '')),
  getQuestionHeatmap:   (quizId: string) => req('/api/analytics/' + quizId + '/question-heatmap'),
  // Attribution
  getAttribution:       ()                          => req('/api/analytics/attribution'),
  // A/B Testing
  listABTests:          (quizId: string)            => req('/api/quizzes/' + quizId + '/ab-tests'),
  createABTest:         (quizId: string, d: any)    => req('/api/quizzes/' + quizId + '/ab-tests',          { method: 'POST', body: JSON.stringify(d) }),
  getABTest:            (testId: string)            => req('/api/quizzes/tests/' + testId),
  updateABTestStatus:   (testId: string, status: string) => req('/api/quizzes/tests/' + testId,             { method: 'PATCH', body: JSON.stringify({ status }) }),
  declareABTestWinner:  (testId: string, variantId: string) => req('/api/quizzes/tests/' + testId + '/winner', { method: 'POST', body: JSON.stringify({ variant_id: variantId }) }),
};
