'use client';

import { useEffect, useState } from 'react';
import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';
import { useDashboardAuth } from '../_components/useDashboardAuth';
import { PageHeader, Card, EmptyState, PrimaryButton, GhostButton, PageLoading, Pill } from '../_components/PageShell';

type Quiz = {
  id: string;
  title: string;
  slug: string;
  default_language: string;
  enabled_languages: string[];
  questions?: Array<{ text: string; options: Array<{ text: string }> }>;
};

type TranslationRecord = {
  id: string;
  quiz_id: string;
  language_code: string;
  status: string;
  completeness_pct: number;
  translations: any;
  updated_at: string;
};

var LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian',
  pt: 'Portuguese', nl: 'Dutch', pl: 'Polish', sv: 'Swedish', da: 'Danish',
  no: 'Norwegian', fi: 'Finnish', ja: 'Japanese', ko: 'Korean', zh: 'Chinese',
  ar: 'Arabic', he: 'Hebrew', tr: 'Turkish', ru: 'Russian', hi: 'Hindi',
};

var ALL_LANGUAGES = [
  { code: 'en', name: 'English' }, { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' }, { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' }, { code: 'pt', name: 'Portuguese' },
  { code: 'nl', name: 'Dutch' }, { code: 'sv', name: 'Swedish' },
  { code: 'da', name: 'Danish' }, { code: 'no', name: 'Norwegian' },
  { code: 'fi', name: 'Finnish' }, { code: 'pl', name: 'Polish' },
  { code: 'ja', name: 'Japanese' }, { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' }, { code: 'ar', name: 'Arabic' },
  { code: 'he', name: 'Hebrew' }, { code: 'tr', name: 'Turkish' },
  { code: 'ru', name: 'Russian' }, { code: 'hi', name: 'Hindi' },
];

var inputStyle = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid ' + C.GRAY_200,
  borderRadius: 8,
  fontSize: 13.5,
  fontFamily: C.FONT,
  color: C.GRAY_900,
  background: C.SURFACE,
  outline: 'none',
  boxSizing: 'border-box' as const,
};

var labelStyle = {
  display: 'block' as const,
  fontSize: 12.5,
  fontWeight: 600 as const,
  color: C.GRAY_600,
  marginBottom: 6,
  fontFamily: C.FONT,
};

export default function TranslationsPage() {
  var { token, status } = useDashboardAuth();
  var [quizzes, setQuizzes] = useState<Quiz[]>([]);
  var [translations, setTranslations] = useState<Record<string, TranslationRecord[]>>({});
  var [loading, setLoading] = useState(true);
  var [showAddLang, setShowAddLang] = useState<string | null>(null);
  var [selectedLang, setSelectedLang] = useState('es');
  var [saving, setSaving] = useState(false);

  // Translation editor state
  var [editQuizId, setEditQuizId] = useState<string | null>(null);
  var [editLang, setEditLang] = useState<string | null>(null);
  var [editData, setEditData] = useState<any>(null);
  var [editQuiz, setEditQuiz] = useState<Quiz | null>(null);
  var [savingEdit, setSavingEdit] = useState(false);

  var apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

  function fetchData() {
    if (!token) return;
    setLoading(true);
    (async function() {
      try {
        var res = await fetch(apiBase + '/api/quizzes', {
          headers: { Authorization: 'Bearer ' + token },
        });
        if (res.ok) {
          var data = await res.json();
          var quizList = data.quizzes || data || [];
          setQuizzes(quizList);

          var transMap: Record<string, TranslationRecord[]> = {};
          for (var i = 0; i < quizList.length; i++) {
            try {
              var tRes = await fetch(apiBase + '/api/quizzes/' + quizList[i].id + '/translations', {
                headers: { Authorization: 'Bearer ' + token },
              });
              if (tRes.ok) {
                var tData = await tRes.json();
                transMap[quizList[i].id] = tData || [];
              }
            } catch {}
          }
          setTranslations(transMap);
        }
      } catch {}
      setLoading(false);
    })();
  }

  useEffect(function() { fetchData(); }, [token]);

  async function addLanguage(quizId: string, langCode: string) {
    if (!token) return;
    setSaving(true);
    try {
      var res = await fetch(apiBase + '/api/quizzes/' + quizId + '/translations/' + langCode, {
        method: 'PUT',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ translations: {} }),
      });
      if (res.ok) {
        setShowAddLang(null);
        fetchData();
      }
    } catch {}
    setSaving(false);
  }

  async function removeLanguage(quizId: string, langCode: string) {
    if (!token) return;
    try {
      await fetch(apiBase + '/api/quizzes/' + quizId + '/translations/' + langCode, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + token },
      });
      fetchData();
    } catch {}
  }

  async function openEditor(quizId: string, langCode: string) {
    if (!token) return;
    var quiz = quizzes.find(function(q) { return q.id === quizId; });
    if (!quiz) return;

    try {
      var qRes = await fetch(apiBase + '/api/quizzes/' + quizId, {
        headers: { Authorization: 'Bearer ' + token },
      });
      if (qRes.ok) {
        var fullQuiz = await qRes.json();
        setEditQuiz(fullQuiz);
      } else {
        setEditQuiz(quiz);
      }
    } catch {
      setEditQuiz(quiz);
    }

    try {
      var tRes = await fetch(apiBase + '/api/quizzes/' + quizId + '/translations/' + langCode, {
        headers: { Authorization: 'Bearer ' + token },
      });
      if (tRes.ok) {
        var tData = await tRes.json();
        setEditData(tData.translations || {});
      } else {
        setEditData({});
      }
    } catch {
      setEditData({});
    }

    setEditQuizId(quizId);
    setEditLang(langCode);
  }

  async function saveTranslation() {
    if (!token || !editQuizId || !editLang) return;
    setSavingEdit(true);
    try {
      await fetch(apiBase + '/api/quizzes/' + editQuizId + '/translations/' + editLang, {
        method: 'PUT',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ translations: editData }),
      });
      setEditQuizId(null);
      setEditLang(null);
      setEditData(null);
      setEditQuiz(null);
      fetchData();
    } catch {}
    setSavingEdit(false);
  }

  if (status === 'loading') return <DashboardShell title="Translations"><PageLoading /></DashboardShell>;

  // Translation editor view
  if (editQuizId && editLang && editData !== null && editQuiz) {
    var questions = editQuiz.questions || [];
    return (
      <DashboardShell title="Translations">
        <PageHeader
          title={'Translate to ' + (LANGUAGE_NAMES[editLang] || editLang)}
          subtitle={(editQuiz.title || 'Untitled quiz') + ' \u2014 translate each question and answer option'}
          actions={
            <div style={{ display: 'flex', gap: 10 }}>
              <GhostButton onClick={function() { setEditQuizId(null); setEditLang(null); setEditData(null); setEditQuiz(null); }}>
                Cancel
              </GhostButton>
              <PrimaryButton onClick={function() { saveTranslation(); }} disabled={savingEdit}>
                {savingEdit ? 'Saving...' : 'Save translation'}
              </PrimaryButton>
            </div>
          }
        />

        {questions.length === 0 ? (
          <Card>
            <div style={{ padding: 20, textAlign: 'center', color: C.GRAY_400, fontSize: 14, fontFamily: C.FONT }}>
              This quiz has no questions yet. Add questions in the quiz editor first.
            </div>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {questions.map(function(q, qIdx) {
              return (
                <Card key={qIdx}>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.GRAY_400, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, fontFamily: C.FONT }}>
                      Question {qIdx + 1}
                    </div>
                    <div style={{ fontSize: 13, color: C.GRAY_500, fontFamily: C.FONT, marginBottom: 8, padding: '8px 12px', background: C.GRAY_50, borderRadius: 6 }}>
                      {q.text}
                    </div>
                    <label style={labelStyle}>Translation</label>
                    <input
                      type="text"
                      placeholder={'Translate: ' + q.text}
                      value={(editData.questions && editData.questions[qIdx] && editData.questions[qIdx].text) || ''}
                      onChange={function(e) {
                        setEditData(function(prev: any) {
                          var next = Object.assign({}, prev);
                          if (!next.questions) next.questions = {};
                          if (!next.questions[qIdx]) next.questions[qIdx] = {};
                          next.questions[qIdx] = Object.assign({}, next.questions[qIdx], { text: e.target.value });
                          return next;
                        });
                      }}
                      style={inputStyle}
                    />
                  </div>

                  {q.options && q.options.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: C.GRAY_400, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: C.FONT }}>
                        Answer options
                      </div>
                      {q.options.map(function(opt, oIdx) {
                        return (
                          <div key={oIdx} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <div style={{ flex: '0 0 40%', fontSize: 12.5, color: C.GRAY_500, fontFamily: C.FONT, padding: '8px 12px', background: C.GRAY_50, borderRadius: 6 }}>
                              {opt.text}
                            </div>
                            <input
                              type="text"
                              placeholder={'Translate: ' + opt.text}
                              value={
                                (editData.questions && editData.questions[qIdx] && editData.questions[qIdx].options && editData.questions[qIdx].options[oIdx]) || ''
                              }
                              onChange={function(e) {
                                setEditData(function(prev: any) {
                                  var next = Object.assign({}, prev);
                                  if (!next.questions) next.questions = {};
                                  if (!next.questions[qIdx]) next.questions[qIdx] = {};
                                  if (!next.questions[qIdx].options) next.questions[qIdx].options = {};
                                  next.questions[qIdx] = Object.assign({}, next.questions[qIdx]);
                                  next.questions[qIdx].options = Object.assign({}, next.questions[qIdx].options);
                                  next.questions[qIdx].options[oIdx] = e.target.value;
                                  return next;
                                });
                              }}
                              style={Object.assign({}, inputStyle, { flex: 1 })}
                            />
                          </div>
                        );
                      })}
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
            var quizTrans = translations[quiz.id] || [];
            var availableLangs = ALL_LANGUAGES.filter(function(l) {
              return !langs.includes(l.code);
            });

            return (
              <Card key={quiz.id}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: C.GRAY_900, fontFamily: C.FONT }}>{quiz.title || 'Untitled quiz'}</div>
                    <div style={{ fontSize: 12, color: C.GRAY_500, fontFamily: C.FONT, marginTop: 2 }}>
                      Default: {LANGUAGE_NAMES[defaultLang] || defaultLang} &middot; {langs.length} language{langs.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={function() { setShowAddLang(quiz.id); setSelectedLang(availableLangs.length > 0 ? availableLangs[0].code : 'es'); }}
                    style={{
                      padding: '6px 14px',
                      border: '1px solid ' + C.ACCENT,
                      borderRadius: 8,
                      background: C.ACCENT_LIGHT,
                      color: C.ACCENT,
                      fontSize: 13,
                      fontWeight: 600,
                      fontFamily: C.FONT,
                      cursor: 'pointer',
                    }}
                  >
                    + Add language
                  </button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {langs.map(function(lang) {
                    var isDefault = lang === defaultLang;
                    var trans = quizTrans.find(function(t) { return t.language_code === lang; });
                    var pct = trans ? (trans.completeness_pct || 0) : (isDefault ? 100 : 0);

                    return (
                      <div
                        key={lang}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '6px 12px',
                          borderRadius: 8,
                          background: isDefault ? C.ACCENT_LIGHT : C.GRAY_50,
                          border: '1px solid ' + (isDefault ? C.ACCENT + '40' : C.GRAY_200),
                          fontSize: 13,
                          fontWeight: 500,
                          color: isDefault ? C.ACCENT : C.GRAY_600,
                          fontFamily: C.FONT,
                          cursor: isDefault ? 'default' : 'pointer',
                        }}
                      >
                        <span>{LANGUAGE_NAMES[lang] || lang}</span>
                        {isDefault ? (
                          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', color: C.ACCENT }}>DEFAULT</span>
                        ) : (
                          <>
                            <span style={{ fontSize: 11, color: pct >= 80 ? '#22c55e' : pct > 0 ? '#f59e0b' : C.GRAY_400 }}>
                              {pct}%
                            </span>
                            <button
                              type="button"
                              onClick={function(e) { e.stopPropagation(); openEditor(quiz.id, lang); }}
                              style={{
                                padding: '2px 8px',
                                border: '1px solid ' + C.GRAY_200,
                                borderRadius: 4,
                                background: C.SURFACE,
                                color: C.GRAY_600,
                                fontSize: 11,
                                fontFamily: C.FONT,
                                cursor: 'pointer',
                              }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={function(e) {
                                e.stopPropagation();
                                if (confirm('Remove ' + (LANGUAGE_NAMES[lang] || lang) + ' translation?')) {
                                  removeLanguage(quiz.id, lang);
                                }
                              }}
                              style={{
                                padding: '2px 6px',
                                border: 'none',
                                borderRadius: 4,
                                background: 'transparent',
                                color: C.GRAY_400,
                                fontSize: 13,
                                cursor: 'pointer',
                              }}
                            >
                              &times;
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                {langs.length <= 1 && (
                  <div style={{ marginTop: 12, fontSize: 13, color: C.GRAY_400, fontFamily: C.FONT }}>
                    Click "+ Add language" above to add translations and reach a global audience.
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Language Modal */}
      {showAddLang && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={function(e) { if (e.target === e.currentTarget) setShowAddLang(null); }}
        >
          <div
            style={{
              background: C.SURFACE,
              borderRadius: 14,
              padding: 28,
              width: 400,
              maxWidth: '90vw',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT, marginBottom: 20 }}>
              Add language
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Select language</label>
              <select
                value={selectedLang}
                onChange={function(e) { setSelectedLang(e.target.value); }}
                style={Object.assign({}, inputStyle, { cursor: 'pointer' })}
              >
                {ALL_LANGUAGES.filter(function(l) {
                  var quiz = quizzes.find(function(q) { return q.id === showAddLang; });
                  var currentLangs = quiz ? (quiz.enabled_languages || ['en']) : ['en'];
                  return !currentLangs.includes(l.code);
                }).map(function(l) {
                  return <option key={l.code} value={l.code}>{l.name}</option>;
                })}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <GhostButton onClick={function() { setShowAddLang(null); }}>Cancel</GhostButton>
              <PrimaryButton onClick={function() { addLanguage(showAddLang, selectedLang); }} disabled={saving}>
                {saving ? 'Adding...' : 'Add language'}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
