'use client';

import { useState } from 'react';
import type { AuditReport } from '@/lib/audit/types';
import { GOAL_LABELS } from '@/lib/audit/opportunity';

const CALENDLY = process.env.NEXT_PUBLIC_CALENDLY_URL || 'https://calendly.com/squarespell-info/30min';
const SERVICES_URL =
  process.env.NEXT_PUBLIC_SERVICES_URL || 'https://squarespell.com/squarespace-website-design';

function track(name: string, props: Record<string, unknown>, auditToken?: string) {
  try {
    navigator.sendBeacon?.(
      '/api/event',
      new Blob([JSON.stringify({ name, props, auditToken })], { type: 'application/json' })
    );
  } catch {
    /* ignore */
  }
}

/**
 * Contact capture, shown *after* the full report.
 *
 * Nothing here gates a finding. The headline, every issue, every fix path and
 * the evidence behind them are already visible above. This asks for an address
 * only where there is a real reason to give one.
 */
export function LeadCapture({ report, services }: { report: AuditReport; services?: string[] }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [interest, setInterest] = useState('report');
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  // Whether the PDF actually reached them. Saying "check your inbox" when no
  // email was sent is the kind of small lie that costs all the trust the report
  // just earned.
  const [emailed, setEmailed] = useState(false);
  const [error, setError] = useState('');

  const critical = report.findings.filter((f) => f.severity === 'critical').length;
  const high = report.findings.filter((f) => f.severity === 'high').length;

  // `services` is the deterministic category → service mapping read off the
  // opportunities themselves (Report.tsx `relevantServices`), so it falls
  // back to the older, coarser `report.opportunity.services` list only when
  // the caller did not supply one, never invented here.
  const relevantServices = services ?? report.opportunity.services;

  const goal = report.businessContext?.goal;
  const goalPhrase = goal && goal !== 'not_sure' ? GOAL_LABELS[goal] : null;

  const headline = goalPhrase
    ? `Want help ${goalPhrase}?`
    : critical > 0
      ? `You have ${critical} critical issue${critical === 1 ? ' that needs' : 's that need'} fixing`
      : high > 0
        ? `${high} high-priority issue${high === 1 ? '' : 's'} are holding this site back`
        : 'Want a second pair of eyes on this?';

  const body =
    critical > 0
      ? 'Everything above tells you what is wrong and where to fix it in Squarespace. If you would rather have it done for you, or want to talk through what to tackle first, we are Squarespace specialists.'
      : 'The findings above are yours to act on, nothing is hidden. If you want help implementing them or a deeper look at content and strategy, we work on Squarespace sites every day.';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    setError('');
    try {
      const utm: Record<string, string> = {};
      const params = new URLSearchParams(window.location.search);
      for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']) {
        const v = params.get(k);
        if (v) utm[k] = v;
      }
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          interest,
          website: report.finalUrl,
          businessName: report.siteName,
          marketingConsent: consent,
          auditToken: report.id,
          company_website: honeypot,
          utm,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Something went wrong.');
      setEmailed(Boolean(data?.emailed));
      setState('done');
    } catch (err: any) {
      setState('error');
      setError(err?.message || 'Something went wrong. Please email info@squarespell.com.');
    }
  }

  return (
    <section className="cta">
      <h2>{headline}</h2>
      <p>{body}</p>

      {relevantServices.length > 0 && (
        <p style={{ fontSize: 14, color: 'var(--ink-3)' }}>
          Based on what we found, the areas most worth your attention are:{' '}
          {relevantServices.join(', ').toLowerCase()}.
        </p>
      )}

      <div className="cta-row">
        <a href={CALENDLY} target="_blank" rel="noopener noreferrer" onClick={() => track('cta_clicked', { cta: 'calendly' }, report.id)}>
          <button className="btn">Book a free 30-minute call</button>
        </a>
        <a href={SERVICES_URL} target="_blank" rel="noopener noreferrer" onClick={() => track('cta_clicked', { cta: 'services' }, report.id)}>
          <button className="btn btn-ghost">See what we do</button>
        </a>
        {!open && state !== 'done' && (
          <button
            className="btn btn-ghost"
            onClick={() => {
              setOpen(true);
              track('lead_form_opened', {}, report.id);
            }}
          >
            Email me the PDF
          </button>
        )}
      </div>

      {state === 'done' ? (
        <div className="lead-done" style={{ marginTop: 18 }}>
          {emailed ? (
            <>
              Thanks. The PDF is on its way to your inbox, and the report stays available at the
              share link above.
            </>
          ) : (
            <>
              Thanks, we have your details and will be in touch.{' '}
              {report.id ? (
                <>
                  You can{' '}
                  <a href={`/api/report-pdf?token=${encodeURIComponent(report.id)}`}>
                    download the PDF
                  </a>{' '}
                  now, and the report stays available at the share link above.
                </>
              ) : null}
            </>
          )}
        </div>
      ) : (
        open && (
          <form className="lead-form" onSubmit={submit} style={{ marginTop: 18 }}>
            <input
              className="hp"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              placeholder="Leave this empty"
            />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourbusiness.com"
              aria-label="Your email address"
            />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name (optional)"
              aria-label="Your name"
            />
            <select value={interest} onChange={(e) => setInterest(e.target.value)} aria-label="What you would like">
              <option value="report">Send me the PDF of this report</option>
              <option value="fix_help">I would like help fixing these issues</option>
              <option value="talk">I would like to talk to a Squarespace specialist</option>
              <option value="other">Something else</option>
            </select>
            <label className="consent">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>
                Send me occasional Squarespace tips from Squarespell. Optional, leave this unticked and we
                will only use your address to reply about this audit.
              </span>
            </label>
            <button className="btn" type="submit" disabled={state === 'sending'}>
              {state === 'sending' ? 'Sending…' : 'Send it over'}
            </button>
            {error && <div className="form-error">{error}</div>}
            <div className="lead-note">
              We store your email, this audit, and your website address so we can reply. Nothing is shared
              with third parties. Ask us to delete it any time at info@squarespell.com.
            </div>
          </form>
        )
      )}
    </section>
  );
}
