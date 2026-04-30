'use client';

// Email templates gallery — simplified to show only the professional
// Canva-based templates in a clean read-only grid.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DashboardShell, DASHBOARD_COLORS as C } from '../../_components/DashboardShell';
import { PageHeader, Card, Pill, PrimaryButton } from '../../_components/PageShell';
import { useDashboardAuth } from '../../_components/useDashboardAuth';
import { CANVA_TEMPLATES, CANVA_CATEGORIES } from '../../../../lib/email/canvaTemplates';

var API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

type SavedTemplate = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  subject: string | null;
  preheader: string | null;
  created_at: string;
};

export default function EmailTemplatesPage() {
  var { token } = useDashboardAuth();
  var [tab, setTab] = useState<'library' | 'saved'>('library');
  var [filter, setFilter] = useState('all');
  var [selected, setSelected] = useState<typeof CANVA_TEMPLATES[0] | null>(null);
  var [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  var [savedFilter, setSavedFilter] = useState('all');
  var [loadingSaved, setLoadingSaved] = useState(false);
  var [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  var [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  // Fetch saved templates
  var fetchSaved = useCallback(function() {
    if (!token) return;
    setLoadingSaved(true);
    fetch(API + '/api/emails/templates/saved', {
      headers: { Authorization: 'Bearer ' + token },
    })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (Array.isArray(data)) setSavedTemplates(data);
      })
      .catch(function() {})
      .finally(function() { setLoadingSaved(false); });
  }, [token]);

  useEffect(function() {
    if (tab === 'saved') fetchSaved();
  }, [tab, fetchSaved]);

  function handleDeleteSaved(id: string) {
    if (!token) return;
    fetch(API + '/api/emails/templates/saved/' + id, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + token },
    })
      .then(function() {
        setSavedTemplates(function(prev) { return prev.filter(function(t) { return t.id !== id; }); });
        setDeleteConfirm(null);
      })
      .catch(function() {});
  }

  var filteredSaved = useMemo(function() {
    if (savedFilter === 'all') return savedTemplates;
    return savedTemplates.filter(function(t) { return t.category === savedFilter; });
  }, [savedTemplates, savedFilter]);

  // Category filters
  var categories = useMemo(function() {
    var cats = ['all'];
    var seen = new Set<string>();
    for (var i = 0; i < CANVA_TEMPLATES.length; i++) {
      if (!seen.has(CANVA_TEMPLATES[i].category)) {
        seen.add(CANVA_TEMPLATES[i].category);
        cats.push(CANVA_TEMPLATES[i].category);
      }
    }
    return cats;
  }, []);

  var visible = useMemo(function() {
    if (filter === 'all') return CANVA_TEMPLATES;
    return CANVA_TEMPLATES.filter(function(t) { return t.category === filter; });
  }, [filter]);

  return (
    <DashboardShell>
      <PageHeader
        title="Email templates"
        subtitle="Professional email templates designed for quiz-based campaigns. Brand colors applied automatically."
      />

      {/* Tab toggle */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: 3, background: C.BG, border: '1px solid ' + C.HAIRLINE,
        borderRadius: 8, marginBottom: 20, width: 'fit-content',
      }}>
        <button
          type="button"
          onClick={function() { setTab('library'); }}
          style={{
            padding: '8px 20px', fontSize: 13, fontWeight: 600, borderRadius: 6,
            border: 'none', cursor: 'pointer',
            background: tab === 'library' ? C.ACCENT_LIGHT : 'transparent',
            color: tab === 'library' ? C.ACCENT : C.TEXT_MUTED,
          }}
        >
          Template library
        </button>
        <button
          type="button"
          onClick={function() { setTab('saved'); }}
          style={{
            padding: '8px 20px', fontSize: 13, fontWeight: 600, borderRadius: 6,
            border: 'none', cursor: 'pointer',
            background: tab === 'saved' ? C.ACCENT_LIGHT : 'transparent',
            color: tab === 'saved' ? C.ACCENT : C.TEXT_MUTED,
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          My templates
          {savedTemplates.length > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 6px',
              borderRadius: 10, background: C.ACCENT, color: '#FFFFFF',
            }}>
              {savedTemplates.length}
            </span>
          )}
        </button>
      </div>

      {/* Saved templates tab */}
      {tab === 'saved' && (
        <div>
          {loadingSaved && (
            <div style={{ padding: 40, textAlign: 'center', color: C.TEXT_MUTED, fontSize: 13 }}>
              Loading saved templates...
            </div>
          )}

          {!loadingSaved && filteredSaved.length === 0 && (
            <div style={{
              padding: '48px 20px', textAlign: 'center',
              border: '1px dashed ' + C.BORDER, borderRadius: 14,
              color: C.TEXT_MUTED, fontSize: 14,
            }}>
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={C.TEXT_SUBTLE}
                strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
                style={{ margin: '0 auto 12px', display: 'block' }}>
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              No saved templates yet. Create a campaign and save it as a template to reuse later.
            </div>
          )}

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
          }}>
            {filteredSaved.map(function(tpl) {
              return (
                <Card key={tpl.id} style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: C.TEXT }}>{tpl.name}</div>
                      <Pill variant="accent">{tpl.category}</Pill>
                    </div>
                    {tpl.description && (
                      <div style={{ fontSize: 13, color: C.TEXT_MUTED, lineHeight: 1.5, marginBottom: 10 }}>
                        {tpl.description}
                      </div>
                    )}
                    {tpl.subject && (
                      <div style={{ fontSize: 12, color: C.TEXT_SUBTLE, marginBottom: 10 }}>
                        Subject: {tpl.subject}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: C.TEXT_SUBTLE, marginBottom: 14 }}>
                      Saved {new Date(tpl.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <PrimaryButton href={'/dashboard/emails/new?saved=' + tpl.id}>
                        Use template
                      </PrimaryButton>
                      {deleteConfirm === tpl.id ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            onClick={function() { handleDeleteSaved(tpl.id); }}
                            style={{
                              padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                              background: '#ff3b30', color: '#FFFFFF', border: 'none', cursor: 'pointer',
                            }}
                          >
                            Confirm
                          </button>
                          <button
                            onClick={function() { setDeleteConfirm(null); }}
                            style={{
                              padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                              background: 'transparent', color: C.TEXT_MUTED, border: '1px solid ' + C.BORDER,
                              cursor: 'pointer',
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={function() { setDeleteConfirm(tpl.id); }}
                          style={{
                            padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                            background: 'transparent', color: C.TEXT_SUBTLE, border: '1px solid ' + C.BORDER,
                            cursor: 'pointer',
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Library tab */}
      {tab === 'library' && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {categories.map(function(cat) {
              var active = cat === filter;
              var label = cat === 'all' ? 'All' : cat;
              return (
                <button
                  key={cat}
                  onClick={function() { setFilter(cat); }}
                  style={{
                    padding: '7px 14px', borderRadius: 8, fontSize: 13,
                    fontWeight: 500, cursor: 'pointer',
                    background: active ? C.ACCENT : 'transparent',
                    color: active ? '#FFFFFF' : C.TEXT_MUTED,
                    border: '1px solid ' + (active ? C.ACCENT : C.BORDER),
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 16,
          }}>
            {visible.map(function(t) {
              return (
                <Card key={t.id} style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{
                    height: 220, overflow: 'hidden',
                    borderBottom: '1px solid ' + C.BORDER,
                    background: '#F7F7F5', position: 'relative',
                  }}>
                    <iframe
                      title={t.name + ' preview'}
                      srcDoc={t.html}
                      style={{
                        width: '200%', height: '440px', border: 0,
                        transform: 'scale(0.5)', transformOrigin: 'top left',
                        pointerEvents: 'none',
                      }}
                    />
                  </div>
                  <div style={{ padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: C.TEXT }}>{t.name}</div>
                      <Pill variant="accent">{t.category}</Pill>
                    </div>
                    <div style={{ fontSize: 13, color: C.TEXT_MUTED, lineHeight: 1.5, marginBottom: 14 }}>
                      {t.description}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={function() { setSelected(t); }}
                        style={{
                          flex: 1, padding: '9px 12px', borderRadius: 8,
                          fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          background: 'transparent', color: C.TEXT,
                          border: '1px solid ' + C.BORDER,
                        }}
                      >
                        Preview
                      </button>
                      <div style={{ flex: 1 }}>
                        <PrimaryButton href={'/dashboard/emails/new?template=' + t.id}>
                          Use template
                        </PrimaryButton>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Preview modal */}
      {selected && (
        <div
          onClick={function() { setSelected(null); }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100, padding: 24, backdropFilter: 'blur(2px)',
          }}
        >
          <div
            onClick={function(e) { e.stopPropagation(); }}
            style={{
              width: '100%', maxWidth: 720, maxHeight: '90vh',
              background: C.SURFACE, borderRadius: 16,
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid ' + C.BORDER,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.TEXT }}>{selected.name}</div>
                <div style={{ fontSize: 12, color: C.TEXT_MUTED, marginTop: 2 }}>{selected.description}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', borderRadius: 7, border: '1px solid ' + C.BORDER, overflow: 'hidden' }}>
                  <button onClick={function() { setPreviewDevice('desktop'); }} style={{
                    padding: '5px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none',
                    background: previewDevice === 'desktop' ? C.ACCENT : '#FFFFFF',
                    color: previewDevice === 'desktop' ? '#FFFFFF' : C.TEXT_MUTED,
                  }}>Desktop</button>
                  <button onClick={function() { setPreviewDevice('mobile'); }} style={{
                    padding: '5px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none',
                    borderLeft: '1px solid ' + C.BORDER,
                    background: previewDevice === 'mobile' ? C.ACCENT : '#FFFFFF',
                    color: previewDevice === 'mobile' ? '#FFFFFF' : C.TEXT_MUTED,
                  }}>Mobile</button>
                </div>
                <button
                  onClick={function() { setSelected(null); }}
                  style={{
                    width: 32, height: 32, borderRadius: 8, border: 'none',
                    background: C.ELEVATED, cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', color: C.TEXT_MUTED,
                  }}
                >
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Preview */}
            <div style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', background: '#F3F4F6', padding: previewDevice === 'mobile' ? '20px 0' : 0 }}>
              <iframe
                title="Template preview"
                srcDoc={selected.html}
                style={{
                  width: previewDevice === 'mobile' ? 375 : '100%',
                  height: 600,
                  border: previewDevice === 'mobile' ? '1px solid ' + C.BORDER : 'none',
                  borderRadius: previewDevice === 'mobile' ? 12 : 0,
                  background: '#FFFFFF',
                }}
              />
            </div>

            {/* Footer */}
            <div style={{
              padding: '14px 20px', borderTop: '1px solid ' + C.BORDER,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ fontSize: 12, color: C.TEXT_MUTED }}>
                Subject: <span style={{ color: C.TEXT, fontWeight: 500 }}>{selected.subject}</span>
              </div>
              <PrimaryButton href={'/dashboard/emails/new?template=' + selected.id}>
                Use this template
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
