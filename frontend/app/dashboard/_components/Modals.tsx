'use client';

/**
 * Shared dashboard modals - ConfirmDialog (destructive actions) and
 * PublishModal (one-click share surface with Link / Embed / Preview tabs).
 *
 * Both share a single backdrop + sheet primitive so the visual language is
 * consistent. Uses the DashboardShell palette; no external UI deps.
 */

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DASHBOARD_COLORS as C } from './DashboardShell';
import { embedSnippet, publicQuizUrl } from '@/lib/urls';
import { minimumPlanFor, type PlanFeatures } from '@/lib/plans';
import { api } from '@/lib/api';

/* ------------------------------------------------------------------ */
/* Sheet - shared backdrop + centered card                             */
/* ------------------------------------------------------------------ */

function Sheet({
  onClose,
  children,
  width = 520,
  labelledBy,
}: {
  onClose: () => void;
  children: ReactNode;
  width?: number;
  labelledBy?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.25)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '24px 16px',
        fontFamily: '"Poppins", system-ui, sans-serif',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.ELEVATED,
          border: `1px solid ${C.BORDER}`,
          borderRadius: 14,
          width: '100%',
          maxWidth: width,
          boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ConfirmDialog - destructive confirmation                            */
/* ------------------------------------------------------------------ */

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onClose,
  loading = false,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
  loading?: boolean;
}) {
  if (!open) return null;

  const accent = destructive ? '#ef4444' : C.ACCENT;
  const accentText = '#ffffff';

  return (
    <Sheet onClose={loading ? () => {} : onClose} labelledBy="confirm-title" width={440}>
      <div style={{ padding: '28px 28px 24px' }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: destructive ? C.DANGER_LIGHT : C.ACCENT_LIGHT,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
          aria-hidden
        >
          {destructive ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
              <circle cx="12" cy="12" r="10" />
            </svg>
          )}
        </div>

        <h3 id="confirm-title" style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: C.TEXT, letterSpacing: '-0.02em' }}>
          {title}
        </h3>
        {description ? (
          <p style={{ margin: 0, fontSize: 13.5, color: C.TEXT_MUTED, lineHeight: 1.55 }}>{description}</p>
        ) : null}
      </div>
      <div
        style={{
          display: 'flex',
          gap: 10,
          padding: '16px 24px 22px',
          borderTop: `1px solid ${C.BORDER}`,
          justifyContent: 'flex-end',
          background: C.SURFACE,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          style={{
            padding: '10px 18px',
            borderRadius: 8,
            background: 'transparent',
            color: C.TEXT,
            border: `1px solid ${C.BORDER}`,
            fontSize: 13,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1,
            fontFamily: 'inherit',
          }}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            background: accent,
            color: accentText,
            border: 0,
            fontSize: 13,
            fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.7 : 1,
            fontFamily: 'inherit',
          }}
        >
          {loading ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* PublishModal - Link / Embed / Preview tabs                          */
/* ------------------------------------------------------------------ */

type Tab = 'link' | 'embed' | 'preview';

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '10px 14px',
        background: active ? C.ELEVATED : 'transparent',
        color: active ? C.TEXT : C.TEXT_MUTED,
        border: 0,
        borderBottom: active ? `2px solid ${C.ACCENT}` : '2px solid transparent',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'color .15s',
      }}
    >
      {children}
    </button>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        {label}
      </div>
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'stretch',
          background: C.SURFACE,
          border: `1px solid ${C.BORDER}`,
          borderRadius: 10,
          padding: 10,
          marginBottom: 14,
        }}
      >
        <code
          style={{
            flex: 1,
            minWidth: 0,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: 12.5,
            color: C.TEXT,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            padding: '6px 4px',
          }}
        >
          {value}
        </code>
        <button
          type="button"
          onClick={onCopy}
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            background: copied ? C.SUCCESS_LIGHT : C.ACCENT,
            color: copied ? C.SUCCESS : '#FFFFFF',
            border: copied ? '1px solid rgba(74,222,128,0.3)' : 0,
            fontSize: 12.5,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            whiteSpace: 'nowrap',
            alignSelf: 'center',
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </>
  );
}

export function PublishModal({
  open,
  quizTitle,
  slug,
  onClose,
}: {
  open: boolean;
  quizTitle: string;
  slug: string;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>('link');

  if (!open) return null;

  const link = publicQuizUrl(slug);
  const snippet = embedSnippet(slug);
  const iframeFallback = `<iframe src="${link}" width="100%" height="600" frameborder="0" loading="lazy" allow="clipboard-write"></iframe>`;

  return (
    <Sheet onClose={onClose} labelledBy="publish-title" width={640}>
      <div
        style={{
          padding: '22px 26px 0',
          borderBottom: `1px solid ${C.BORDER}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: C.ACCENT, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              Published
            </p>
            <h3 id="publish-title" style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 800, color: C.TEXT, letterSpacing: '-0.02em' }}>
              {quizTitle || 'Your quiz is live'}
            </h3>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: C.TEXT_MUTED }}>Share the link or drop the snippet into Squarespace.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 0,
              color: C.TEXT_MUTED,
              cursor: 'pointer',
              padding: 6,
              marginTop: -4,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div style={{ display: 'flex', gap: 2, marginTop: 18, marginBottom: -1 }}>
          <TabButton active={tab === 'link'} onClick={() => setTab('link')}>Link</TabButton>
          <TabButton active={tab === 'embed'} onClick={() => setTab('embed')}>Embed</TabButton>
          <TabButton active={tab === 'preview'} onClick={() => setTab('preview')}>Preview</TabButton>
        </div>
      </div>

      <div style={{ padding: 22 }}>
        {tab === 'link' && (
          <>
            <CopyRow label="Shareable URL" value={link} />
            <p style={{ margin: 0, fontSize: 12.5, color: C.TEXT_MUTED, lineHeight: 1.55 }}>
              Use this URL in email campaigns, social posts, or any ad destination. It opens the
              mobile-optimised quiz page on your branded Squarespell Quiz subdomain.
            </p>
          </>
        )}

        {tab === 'embed' && (
          <>
            <CopyRow label="Recommended - Squarespace Code Block" value={snippet} />
            <details style={{ marginTop: 4 }}>
              <summary style={{ cursor: 'pointer', fontSize: 12.5, color: C.TEXT_MUTED, marginBottom: 10 }}>
                Need a plain iframe instead?
              </summary>
              <CopyRow label="Fallback iframe" value={iframeFallback} />
            </details>
            <p style={{ margin: '6px 0 0', fontSize: 12.5, color: C.TEXT_MUTED, lineHeight: 1.55 }}>
              Paste the snippet into a <strong>Code Block</strong> on your Squarespace page (not Code Injection).
              It auto-mounts a responsive, branded iframe and syncs height as visitors progress.
            </p>
          </>
        )}

        {tab === 'preview' && (
          <div
            style={{
              background: C.SURFACE,
              border: `1px solid ${C.BORDER}`,
              borderRadius: 12,
              overflow: 'hidden',
              padding: 0,
            }}
          >
            <iframe
              src={`${link}?embed=1&preview=1`}
              title="Quiz preview"
              style={{
                width: '100%',
                height: 520,
                border: 0,
                display: 'block',
                background: '#fff',
              }}
              loading="lazy"
            />
            <div style={{ padding: '10px 14px', fontSize: 11.5, color: C.TEXT_MUTED, background: C.SURFACE, borderTop: `1px solid ${C.BORDER}` }}>
              Live preview - exactly what visitors will see.
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
          padding: '14px 22px 18px',
          borderTop: `1px solid ${C.BORDER}`,
          background: C.SURFACE,
        }}
      >
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 13, color: C.TEXT_MUTED, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          Open in new tab ↗
        </a>
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            background: C.ACCENT,
            color: '#FFFFFF',
            border: 0,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Done
        </button>
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* UpgradeModal - shown when a feature gate is hit                     */
/* ------------------------------------------------------------------ */

var UPGRADE_COPY: Record<string, { title: string; desc: string; icon: string }> = {
  removeBranding: {
    title: 'Remove Squarespell Quiz branding',
    desc: 'Show your own brand on every quiz. Upgrade to remove the "Powered by Squarespell Quiz" badge.',
    icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  },
  abTesting: {
    title: 'Unlock A/B testing',
    desc: 'Test different quiz versions to find which converts best. See results side-by-side in your analytics dashboard.',
    icon: 'M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5',
  },
  zapier: {
    title: 'Connect Zapier and webhooks',
    desc: 'Automatically send leads to your CRM, email tool, or spreadsheet the moment they complete your quiz.',
    icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8',
  },
  analytics: {
    title: 'Advanced analytics',
    desc: 'Get conversion insights, lead scoring, funnel drop-off analysis, and question-level heatmaps.',
    icon: 'M18 20V10M12 20V4M6 20v-6',
  },
  quizLimit: {
    title: 'Quiz limit reached',
    desc: 'You have hit the maximum number of quizzes on your current plan. Upgrade to create more.',
    icon: 'M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
  },
  leadLimit: {
    title: 'Lead limit reached',
    desc: 'Add more leads to your plan or upgrade for higher limits.',
    icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  },
  emailLimit: {
    title: 'Email limit reached',
    desc: 'Add more emails to your plan or upgrade for higher limits.',
    icon: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6',
  },
};

var LEAD_ADDON_OPTIONS = [
  { key: 'lead_500', label: '+500 leads/mo', price: 3 },
  { key: 'lead_1500', label: '+1,500 leads/mo', price: 7 },
  { key: 'lead_3000', label: '+3,000 leads/mo', price: 12 },
];

var EMAIL_ADDON_OPTIONS = [
  { key: 'email_1000', label: '+1,000 emails/mo', price: 3 },
  { key: 'email_5000', label: '+5,000 emails/mo', price: 7 },
  { key: 'email_10000', label: '+10,000 emails/mo', price: 12 },
];

export function UpgradeModal({
  open,
  feature,
  currentPlan,
  onClose,
}: {
  open: boolean;
  feature: keyof typeof UPGRADE_COPY;
  currentPlan?: string;
  onClose: () => void;
}) {
  var router = useRouter();
  var [addonLoading, setAddonLoading] = useState<string | null>(null);
  if (!open) return null;

  var copy = UPGRADE_COPY[feature] || UPGRADE_COPY.quizLimit;
  var featureKey = feature as keyof PlanFeatures;
  var isKnownFeature = ['removeBranding', 'abTesting', 'zapier'].includes(feature);
  var targetPlan = isKnownFeature ? minimumPlanFor(featureKey) : null;
  var targetName = targetPlan ? targetPlan.name : 'a higher';
  var targetPrice = targetPlan ? '$' + targetPlan.monthlyPrice + '/mo' : '';

  var isPaid = currentPlan && ['core', 'starter', 'growth', 'pro', 'business', 'agency'].includes(currentPlan);
  var isLimitHit = feature === 'leadLimit' || feature === 'emailLimit';
  var showAddons = isPaid && isLimitHit;
  var addonOptions = feature === 'emailLimit' ? EMAIL_ADDON_OPTIONS : LEAD_ADDON_OPTIONS;

  function handleAddonCheckout(addonKey: string) {
    setAddonLoading(addonKey);
    api.createAddonCheckout(addonKey)
      .then(function(data: any) {
        if (data.url) {
          window.location.href = data.url;
        } else {
          alert(data.error || 'Could not start add-on checkout');
          setAddonLoading(null);
        }
      })
      .catch(function() {
        alert('Something went wrong. Please try again.');
        setAddonLoading(null);
      });
  }

  return (
    <Sheet onClose={onClose} labelledBy="upgrade-title" width={460}>
      <div style={{ padding: '32px 28px 24px', textAlign: 'center' }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: 'rgba(13,115,119,0.08)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={copy.icon} />
          </svg>
        </div>

        <h3
          id="upgrade-title"
          style={{
            margin: '0 0 10px',
            fontSize: 20,
            fontWeight: 800,
            color: C.TEXT,
            letterSpacing: '-0.02em',
          }}
        >
          {copy.title}
        </h3>
        <p style={{ margin: '0 0 6px', fontSize: 14, color: C.TEXT_MUTED, lineHeight: 1.6 }}>
          {copy.desc}
        </p>
        {targetPlan && (
          <p style={{ margin: '0 0 0', fontSize: 13, color: C.ACCENT, fontWeight: 600 }}>
            Available on {targetName} ({targetPrice}) and above
          </p>
        )}

        {/* Add-on quick purchase for paid users hitting lead/email limits */}
        {showAddons && (
          <div style={{ marginTop: 20, padding: '16px 0 0', borderTop: '1px solid ' + C.BORDER }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Quick fix — add extra capacity
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              {addonOptions.map(function(a) {
                return (
                  <button
                    key={a.key}
                    onClick={function() { handleAddonCheckout(a.key); }}
                    disabled={addonLoading === a.key}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 2,
                      padding: '10px 14px',
                      background: C.SURFACE,
                      border: '1px solid ' + C.BORDER,
                      borderRadius: 10,
                      cursor: addonLoading === a.key ? 'not-allowed' : 'pointer',
                      transition: 'border-color 0.15s',
                      fontFamily: 'inherit',
                      opacity: addonLoading === a.key ? 0.6 : 1,
                      minWidth: 120,
                    }}
                    onMouseEnter={function(e) { if (!addonLoading) e.currentTarget.style.borderColor = C.ACCENT; }}
                    onMouseLeave={function(e) { e.currentTarget.style.borderColor = C.BORDER; }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.TEXT }}>{a.label}</span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: C.ACCENT }}>
                      {addonLoading === a.key ? '...' : '$' + a.price + '/mo'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 10,
          padding: '16px 24px 22px',
          borderTop: '1px solid ' + C.BORDER,
          justifyContent: 'center',
          background: C.SURFACE,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: '11px 22px',
            borderRadius: 8,
            background: 'transparent',
            color: C.TEXT,
            border: '1px solid ' + C.BORDER,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Maybe later
        </button>
        <button
          type="button"
          onClick={function() { router.push('/pricing'); onClose(); }}
          style={{
            padding: '11px 28px',
            borderRadius: 8,
            background: C.ACCENT,
            color: '#FFFFFF',
            border: 0,
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {showAddons ? 'View all plans' : 'View plans'}
        </button>
      </div>
    </Sheet>
  );
}
