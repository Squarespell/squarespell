'use client';

/**
 * /pricing-embed — iframe-embeddable pricing widget for squarespell.com
 *
 * Embed on Squarespace (paste into a Code Block):
 *
 *   <div style="width:100%;max-width:1160px;margin:0 auto">
 *     <iframe id="sq-pricing-frame"
 *       src="https://app.squarespell.com/pricing-embed"
 *       width="100%" height="900" frameborder="0" scrolling="no"
 *       allowtransparency="true" allow="payment"
 *       style="border:none;display:block;background:transparent;transition:height .25s ease">
 *     </iframe>
 *   </div>
 *   <script>
 *     window.addEventListener('message', function(e) {
 *       if (e.origin !== 'https://app.squarespell.com') return;
 *       if (e.data && e.data.type === 'sq-price-height')
 *         document.getElementById('sq-pricing-frame').height = e.data.height + 48;
 *     });
 *   </script>
 *
 * Auth behaviour:
 *   Signed in  → POST /api/stripe/create-checkout, redirect window.top to Stripe
 *   Not signed in → redirect window.top to /sign-up
 */

import { Suspense, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { PLANS } from '@/lib/planCatalog';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';
const APP = 'https://app.squarespell.com';

type Billing = 'monthly' | 'yearly';

/* ── SVG helpers ─────────────────────────────────────────────── */

function CheckIcon({ size = 16, color = '#059669' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="rgba(26,26,26,0.22)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function Spinner() {
  return (
    <span style={{
      display: 'inline-block', width: 16, height: 16,
      border: '2px solid rgba(255,255,255,.35)', borderTopColor: '#fff',
      borderRadius: '50%', animation: 'sq-spin .65s linear infinite',
    }} />
  );
}

/* ── main export ─────────────────────────────────────────────── */

export default function PricingEmbed() {
  return (
    <Suspense fallback={<div style={{ minHeight: 400, background: 'transparent' }} />}>
      <PricingEmbedInner />
    </Suspense>
  );
}

function PricingEmbedInner() {
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const [billing, setBilling] = useState<Billing>('yearly');
  const [loading, setLoading] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /* ── auto-resize iframe ─────────────────────────────────────── */
  useEffect(function () {
    if (typeof window === 'undefined' || !containerRef.current) return;
    var el = containerRef.current;

    function sendHeight() {
      var h = el.getBoundingClientRect().height;
      window.parent.postMessage({ type: 'sq-price-height', height: Math.ceil(h) }, '*');
    }

    sendHeight();
    var ro = new ResizeObserver(sendHeight);
    ro.observe(el);
    return function () { ro.disconnect(); };
  }, [billing]);

  /* ── checkout / CTA handler ─────────────────────────────────── */
  async function handleCTA(planKey: string) {
    if (loading) return;
    setLoading(planKey);

    try {
      if (!isLoaded || !isSignedIn) {
        if (window.top) window.top.location.href = APP + '/sign-up';
        return;
      }
      var token = await getToken();
      var res = await fetch(API + '/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ plan: planKey, billing: billing }),
      });
      var data = await res.json();
      if (data.url) {
        if (window.top) window.top.location.href = data.url;
        return;
      }
      if (window.top) window.top.location.href = APP + '/pricing?interval=' + billing;
    } catch (e) {
      console.error(e);
      if (window.top) window.top.location.href = APP + '/sign-up';
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
        html, body { background: transparent !important; font-family: 'Inter', system-ui, sans-serif; color: #1A1A1A; }
        button { cursor: pointer; font-family: inherit; border: none; }

        @keyframes sq-spin { to { transform: rotate(360deg); } }
        @keyframes sq-glow { 0%,100% { box-shadow: 0 4px 18px rgba(13,115,119,.30); } 50% { box-shadow: 0 4px 28px rgba(13,115,119,.55); } }

        :root {
          --acc:        #0f7377;
          --acc-dark:   #0B6165;
          --acc-bg:     rgba(13,115,119,.06);
          --acc-border: rgba(13,115,119,.22);
          --t1: #1A1A1A;
          --t2: rgba(26,26,26,.85);
          --t3: rgba(26,26,26,.55);
          --t4: rgba(26,26,26,.30);
          --card:   #FFFFFF;
          --border: #E4E3E0;
          --surface:#F7F7F5;
          --green:    #059669;
          --green-bg: rgba(5,150,105,.09);
        }

        .sqp-wrap { padding: 0 4px 32px; background: transparent; }

        /* ── toggle ── */
        .sqp-toggle { display: flex; justify-content: center; align-items: center; gap: 12px; margin-bottom: 32px; flex-wrap: wrap; }
        .sqp-pills { display: flex; background: #ECEAE8; border: 1px solid var(--border); border-radius: 12px; padding: 4px; }
        .sqp-pill { padding: 10px 26px; border-radius: 10px; font-size: 14px; font-weight: 600; transition: all .15s; display: flex; align-items: center; gap: 7px; background: transparent; color: var(--t3); }
        .sqp-pill.active { background: var(--t1); color: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.12); }
        .sqp-save-badge { background: var(--green-bg); color: var(--green); font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 100px; border: 1px solid rgba(5,150,105,.18); }

        /* ── grid ── */
        .sqp-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; align-items: stretch; }

        /* ── card ── */
        .sqp-card { background: var(--card); border: 1.5px solid var(--border); border-radius: 20px; padding: 28px 22px 24px; display: flex; flex-direction: column; position: relative; transition: transform .18s, box-shadow .18s; }
        .sqp-card:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(0,0,0,.07); }
        .sqp-card.featured { background: linear-gradient(170deg, rgba(13,115,119,.03) 0%, rgba(13,115,119,.09) 100%); border-color: rgba(13,115,119,.30); box-shadow: 0 4px 20px rgba(13,115,119,.10); }
        .sqp-pop { position: absolute; top: -13px; left: 50%; transform: translateX(-50%); background: var(--acc); color: #fff; font-size: 10px; font-weight: 800; padding: 4px 16px; border-radius: 100px; letter-spacing: .08em; text-transform: uppercase; white-space: nowrap; }
        .sqp-plan-name { font-size: 19px; font-weight: 700; color: var(--t1); margin-bottom: 6px; }
        .sqp-plan-name.accent { color: var(--acc); }
        .sqp-plan-desc { font-size: 13px; color: var(--t3); line-height: 1.55; margin-bottom: 18px; min-height: 52px; }

        /* price */
        .sqp-price-row { display: flex; align-items: baseline; gap: 3px; }
        .sqp-old { font-size: 16px; color: var(--t4); text-decoration: line-through; margin-right: 4px; font-weight: 500; }
        .sqp-big { font-size: 42px; font-weight: 800; letter-spacing: -.05em; line-height: 1; color: var(--t1); }
        .sqp-mo { font-size: 14px; color: var(--t3); font-weight: 500; }
        .sqp-note { font-size: 12px; color: var(--t4); margin-top: 3px; }
        .sqp-save { font-size: 12px; font-weight: 600; color: var(--green); margin-top: 4px; display: flex; align-items: center; gap: 3px; }

        /* limits */
        .sqp-limits { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin: 14px 0 18px; padding: 12px 8px; background: rgba(0,0,0,.025); border-radius: 10px; }
        .sqp-lim { text-align: center; }
        .sqp-lim-val { font-size: 15px; font-weight: 800; color: var(--t1); letter-spacing: -.02em; }
        .sqp-lim-label { font-size: 9px; color: var(--t3); font-weight: 600; text-transform: uppercase; letter-spacing: .06em; margin-top: 1px; }

        /* cta */
        .sqp-cta { width: 100%; padding: 13px 16px; border-radius: 12px; font-size: 15px; font-weight: 700; letter-spacing: -.01em; transition: all .15s; margin-bottom: 18px; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .sqp-cta.primary { background: var(--acc); color: #fff; animation: sq-glow 2.8s ease-in-out infinite; }
        .sqp-cta.primary:hover { background: var(--acc-dark); animation: none; box-shadow: 0 4px 20px rgba(13,115,119,.45); }
        .sqp-cta.secondary { background: #F0F0EE; color: var(--t1); border: 1px solid var(--border); }
        .sqp-cta.secondary:hover { background: #E8E8E5; }
        .sqp-cta:disabled { opacity: .55; cursor: not-allowed; animation: none; }

        /* features */
        .sqp-feat-head { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--acc); margin-bottom: 10px; padding-bottom: 7px; border-bottom: 1px solid rgba(13,115,119,.15); }
        .sqp-feats { display: flex; flex-direction: column; gap: 8px; }
        .sqp-feat { display: flex; align-items: flex-start; gap: 8px; }
        .sqp-feat-icon { flex-shrink: 0; margin-top: 2px; }
        .sqp-feat-text { font-size: 13px; line-height: 1.45; color: var(--t2); }
        .sqp-feat-text.off { color: var(--t4); }

        /* excluded section divider */
        .sqp-excl-divider { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--t4); margin: 10px 0 8px; padding-top: 8px; border-top: 1px dashed var(--border); }

        /* add-ons */
        .sqp-addons { background: var(--card); border: 1.5px solid var(--border); border-radius: 18px; padding: 28px 24px; margin-top: 20px; }
        .sqp-addons-title { font-size: 17px; font-weight: 800; color: var(--t1); letter-spacing: -.02em; margin-bottom: 4px; }
        .sqp-addons-sub { font-size: 13px; color: var(--t3); line-height: 1.5; margin-bottom: 18px; }
        .sqp-addons-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .sqp-addon-col { background: var(--acc-bg); border: 1px solid rgba(13,115,119,.15); border-radius: 12px; padding: 16px 18px; }
        .sqp-addon-label { font-size: 10px; font-weight: 700; color: var(--acc); text-transform: uppercase; letter-spacing: .08em; margin-bottom: 12px; }
        .sqp-addon-row { display: flex; justify-content: space-between; align-items: center; padding: 9px 12px; background: rgba(255,255,255,.75); border-radius: 8px; border: 1px solid rgba(0,0,0,.05); }
        .sqp-addon-row + .sqp-addon-row { margin-top: 6px; }
        .sqp-addon-name { font-size: 13px; font-weight: 600; color: var(--t1); }
        .sqp-addon-price { font-size: 13px; font-weight: 700; color: var(--acc); }
        .sqp-addon-per { font-size: 11px; color: var(--t4); margin-left: 6px; }

        /* trust row */
        .sqp-trust { display: flex; justify-content: center; gap: 20px; flex-wrap: wrap; margin-top: 22px; padding-top: 20px; border-top: 1px solid var(--border); }
        .sqp-trust span { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: var(--t3); font-weight: 500; }

        /* ── RESPONSIVE ── */
        @media (max-width: 860px) {
          .sqp-grid { grid-template-columns: 1fr; max-width: 420px; margin: 0 auto; gap: 14px; }
          .sqp-card.featured { order: -1; }
          .sqp-plan-desc { min-height: unset; }
          .sqp-addons-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 560px) {
          .sqp-wrap { padding: 0 0 24px; }
          .sqp-toggle { gap: 8px; flex-direction: column; }
          .sqp-pill { padding: 9px 22px; }
          .sqp-big { font-size: 36px; }
          .sqp-trust { gap: 12px; }
          .sqp-trust span { font-size: 11px; }
          .sqp-addons { padding: 20px 16px; }
        }
      `}</style>

      <div className="sqp-wrap" ref={containerRef}>

        {/* ── BILLING TOGGLE ── */}
        <div className="sqp-toggle">
          <div className="sqp-pills">
            <button
              className={'sqp-pill' + (billing === 'monthly' ? ' active' : '')}
              onClick={function () { setBilling('monthly'); }}
            >
              Monthly
            </button>
            <button
              className={'sqp-pill' + (billing === 'yearly' ? ' active' : '')}
              onClick={function () { setBilling('yearly'); }}
            >
              Annual
              {billing === 'yearly' && <span className="sqp-save-badge">Save 25%</span>}
            </button>
          </div>
          {billing === 'yearly' && (
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>
              Save up to $72/year
            </span>
          )}
        </div>

        {/* ── PLAN CARDS ── */}
        <div className="sqp-grid">
          {PLANS.map(function (plan) {
            var price = billing === 'monthly' ? plan.monthly : plan.yearly;
            var isLoading = loading === plan.key;

            return (
              <div key={plan.key} className={'sqp-card' + (plan.featured ? ' featured' : '')}>
                {plan.featured && <div className="sqp-pop">Most Popular</div>}

                {/* name + desc */}
                <div className={'sqp-plan-name' + (plan.featured ? ' accent' : '')}>
                  {plan.name}
                </div>
                <div className="sqp-plan-desc">{plan.desc}</div>

                {/* price */}
                <div className="sqp-price-row">
                  {billing === 'yearly' && (
                    <span className="sqp-old">${plan.monthly}</span>
                  )}
                  <span className="sqp-big">${price}</span>
                  <span className="sqp-mo">/mo</span>
                </div>
                <div className="sqp-note">
                  {billing === 'yearly'
                    ? 'Billed $' + plan.yearlyTotal + '/year'
                    : 'Billed monthly'}
                </div>
                {billing === 'yearly' && (
                  <div className="sqp-save">
                    <CheckIcon size={12} color="var(--green)" />
                    Save ${plan.yearlySave}/year
                  </div>
                )}

                {/* limits */}
                <div className="sqp-limits">
                  {[
                    { val: plan.limits.quizzes, label: 'Quizzes' },
                    { val: plan.limits.leads,   label: 'Leads/mo' },
                    { val: plan.limits.emails,  label: 'Emails/mo' },
                  ].map(function (lim) {
                    return (
                      <div key={lim.label} className="sqp-lim">
                        <div className="sqp-lim-val">{lim.val}</div>
                        <div className="sqp-lim-label">{lim.label}</div>
                      </div>
                    );
                  })}
                </div>

                {/* CTA */}
                <button
                  className={'sqp-cta ' + (plan.featured ? 'primary' : 'secondary')}
                  onClick={function () { handleCTA(plan.key); }}
                  disabled={!!loading}
                >
                  {isLoading ? <><Spinner /> Loading…</> : 'Start free trial'}
                </button>

                {/* ── INCLUDED features ── */}
                <div className="sqp-feat-head">Included</div>
                <div className="sqp-feats">
                  {plan.included.map(function (f, i) {
                    return (
                      <div key={i} className="sqp-feat">
                        <span className="sqp-feat-icon">
                          <CheckIcon color={plan.featured ? '#0f7377' : '#059669'} />
                        </span>
                        <span className="sqp-feat-text">{f}</span>
                      </div>
                    );
                  })}

                  {/* ── NOT INCLUDED features (only Core & Pro) ── */}
                  {plan.excluded.length > 0 && (
                    <>
                      <div className="sqp-excl-divider">Not included</div>
                      {plan.excluded.map(function (f, i) {
                        return (
                          <div key={'x' + i} className="sqp-feat">
                            <span className="sqp-feat-icon"><CrossIcon /></span>
                            <span className="sqp-feat-text off">{f}</span>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── ADD-ON PACKS ── */}
        <div className="sqp-addons">
          <div className="sqp-addons-title">Need more leads or emails?</div>
          <div className="sqp-addons-sub">
            Add extra capacity to any paid plan. Billed monthly, cancel anytime. Available on Core and Pro.
          </div>
          <div className="sqp-addons-grid">
            <div className="sqp-addon-col">
              <div className="sqp-addon-label">Lead add-on packs</div>
              {[
                { label: '+500 leads/mo',   price: '$3/mo',  per: '$0.006/lead' },
                { label: '+1,500 leads/mo', price: '$7/mo',  per: '$0.005/lead' },
                { label: '+3,000 leads/mo', price: '$12/mo', per: '$0.004/lead' },
              ].map(function (a) {
                return (
                  <div key={a.label} className="sqp-addon-row">
                    <span className="sqp-addon-name">{a.label}</span>
                    <span>
                      <span className="sqp-addon-price">{a.price}</span>
                      <span className="sqp-addon-per">{a.per}</span>
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="sqp-addon-col">
              <div className="sqp-addon-label">Email add-on packs</div>
              {[
                { label: '+1,000 emails/mo',  price: '$3/mo',  per: '$0.003/email' },
                { label: '+5,000 emails/mo',  price: '$7/mo',  per: '$0.001/email' },
                { label: '+10,000 emails/mo', price: '$12/mo', per: '$0.001/email' },
              ].map(function (a) {
                return (
                  <div key={a.label} className="sqp-addon-row">
                    <span className="sqp-addon-name">{a.label}</span>
                    <span>
                      <span className="sqp-addon-price">{a.price}</span>
                      <span className="sqp-addon-per">{a.per}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── TRUST ROW ── */}
        <div className="sqp-trust">
          {['14-day Pro trial', 'No credit card required', 'Cancel anytime'].map(function (t) {
            return (
              <span key={t}>
                <CheckIcon size={13} color="var(--acc)" />
                {t}
              </span>
            );
          })}
        </div>

      </div>
    </>
  );
}
