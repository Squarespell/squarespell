'use client';

import { useEffect, useState } from 'react';
import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';
import { useDashboardAuth } from '../_components/useDashboardAuth';
import { PageHeader, Card, EmptyState, PageLoading } from '../_components/PageShell';

type Quiz = {
  id: string;
  title: string;
  slug: string;
  default_language: string;
  enabled_languages: string[];
};

type Translation = {
  id: string;
  quiz_id: string;
  language_code: string;
  status: string;
  completeness_pct: number;
  updated_at: string;
};

var LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian',
  pt: 'Portuguese', nl: 'Dutch', pl: 'Polish', sv: 'Swedish', da: 'Danish',
  no: 'Norwegian', fi: 'Finnish', ja: 'Japanese', ko: 'Korean', zh: 'Chinese',
  ar: 'Arabic', he: 'Hebrew', tr: 'Turkish', ru: 'Russian', hi: 'Hindi',
};

export default function TranslationsPage() {
  var { token, status } = useDashboardAuth();
  var [quizzes, setQuizzes] = useState<Quiz[]>([]);
  var [loading, setLoading] = useState(true);

  var apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

  useEffect(function() {
    if (!token) return;
    var cancelled = false;
    (async function() {
      try {
        var res = await fetch(apiBase + '/api/quizzes', {
          headers: { Authorization: 'Bearer ' + token },
        });
        if (res.ok && !cancelled) {
          var data = await res.json();
          setQuizzes(data.quizzes || data || []);
        }
      } catch {}
      if (!cancelled) setLoading(false);
    })();
    return function() { cancelled = true; };
  }, [token]);

  if (status === 'loading') return <DashboardShell title="Translations"><PageLoading /></DashboardShell>;

  var quizzesWithLanguages = quizzes.filter(function(q) {
    return q.enabled_languages && q.enabled_languages.length > 1;
  });

  return (
    <DashboardShell title="Translations">
      <PageHeader
        title="Translations"
        subtitle="Manage multi-language versions of your quizzes"
      />

      {loading ? <PageLoading /> : quizzes.length === 0 ? (
        <Card>
          <EmptyState
            icon={
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.GRAY_300} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 8l6 6"/><path d="M4 14l6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="M22 22l-5-10-5 10"/><path d="M14 18h6"/>
              </svg>
            }
            title="No quizzes yet"
            body="Create a quiz first, then add translations to reach a global audience."
          />
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {quizzes.map(function(quiz) {
            var langs = quiz.enabled_languages || ['en'];
            var defaultLang = quiz.default_language || 'en';
            return (
              <Card key={quiz.id}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: C.GRAY_900, fontFamily: C.FONT }}>{quiz.title || 'Untitled quiz'}</div>
                    <div style={{ fontSize: 12, color: C.GRAY_500, fontFamily: C.FONT, marginTop: 2 }}>
                      Default: {LANGUAGE_NAMES[defaultLang] || defaultLang} &middot; {langs.length} language{langs.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {langs.map(function(lang) {
                    var isDefault = lang === defaultLang;
                    return (
                      <div
                        key={lang}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '5px 12px',
                          borderRadius: 6,
                          background: isDefault ? C.ACCENT_LIGHT : C.GRAY_50,
                          border: '1px solid ' + (isDefault ? C.ACCENT + '40' : C.GRAY_200),
                          fontSize: 13,
                          fontWeight: 500,
                          color: isDefault ? C.ACCENT : C.GRAY_600,
                          fontFamily: C.FONT,
                        }}
                      >
                        {LANGUAGE_NAMES[lang] || lang}
                        {isDefault && (
                          <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>default</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {langs.length <= 1 && (
                  <div style={{ marginTop: 12, fontSize: 13, color: C.GRAY_400, fontFamily: C.FONT }}>
                    Add translations via the quiz editor to enable multi-language support.
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}
