'use client';

import { ReactNode, createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { SiteState } from '@/lib/connect/client';
import { SITE_STATE_LABEL } from '@/lib/connect/copy';

/** Shared building blocks for the Sites screens: styles, accessible dialog, live announcements, status badges, logos. */

export const SITES_CSS = String.raw`.sx-scope{--ink:#101828;--muted:#475467;--subtle:#667085;--line:#EAECF0;--soft:#F9FAFB;--teal:#0f7377;--teal-d:#0d6569;--teal-l:#E0F5F6;--ok:#027A48;--ok-l:#ECFDF3;--warn:#B54708;--warn-l:#FFFAEB;--bad:#B42318;--bad-l:#FEF3F2;font-family:Inter,-apple-system,BlinkMacSystemFont,system-ui,sans-serif;color:var(--ink);min-width:0}
.sx-scope *{box-sizing:border-box}
.sx-scope :focus-visible{outline:3px solid var(--teal);outline-offset:2px;border-radius:8px}
.sx-hero{display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start;justify-content:space-between;margin-bottom:24px}
.sx-hero h1{font-size:26px;line-height:1.2;margin:0 0 6px;letter-spacing:-.02em}
.sx-hero p{margin:0;color:var(--muted);max-width:56ch;font-size:15px;line-height:1.5}
.sx-actions{display:flex;flex-wrap:wrap;gap:10px}
.sx-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 16px;border-radius:10px;border:1px solid var(--line);background:#fff;color:var(--ink);font:600 14px/1 Inter,system-ui,sans-serif;cursor:pointer;text-decoration:none;transition:transform .15s ease,box-shadow .15s ease,background .15s ease}
.sx-btn:hover{transform:translateY(-1px);box-shadow:0 6px 16px rgba(16,24,40,.08)}
.sx-btn:disabled,.sx-btn[aria-disabled="true"]{opacity:.55;cursor:not-allowed;transform:none;box-shadow:none}
.sx-btn-primary{background:var(--teal);border-color:var(--teal);color:#fff}.sx-btn-primary:hover{background:var(--teal-d)}
.sx-btn-danger{background:#fff;border-color:#FDA29B;color:var(--bad)}
.sx-btn-sm{min-height:34px;padding:0 12px;font-size:13px}
.sx-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-bottom:24px}
.sx-metric{background:#fff;border:1px solid var(--line);border-radius:14px;padding:16px 18px;min-width:0}
.sx-metric b{display:block;font-size:24px;letter-spacing:-.02em;margin-top:4px}
.sx-metric span{color:var(--muted);font-size:13px}
.sx-section{margin:0 0 28px}
.sx-section h2{font-size:17px;margin:0 0 4px}.sx-section>p{margin:0 0 14px;color:var(--muted);font-size:14px}
.sx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr));gap:14px}
.sx-card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:18px;min-width:0;transition:box-shadow .2s ease,transform .2s ease}
.sx-card:hover{box-shadow:0 10px 30px rgba(16,24,40,.07)}
.sx-site-head{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:12px}
.sx-host{display:flex;gap:10px;align-items:center;min-width:0}.sx-host b{overflow-wrap:anywhere;font-size:15px}.sx-host small{display:block;color:var(--muted)}
.sx-logo{width:40px;height:40px;border-radius:10px;background:var(--soft);border:1px solid var(--line);display:grid;place-items:center;flex:none}
.sx-kv{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;font-size:13px;margin:0 0 14px}.sx-kv dt{color:var(--muted)}.sx-kv dd{margin:0;text-align:right;overflow-wrap:anywhere}
.sx-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:600;white-space:nowrap;border:1px solid transparent}
.sx-badge svg{flex:none}
.sx-b-ok{background:var(--ok-l);color:var(--ok);border-color:#ABEFC6}.sx-b-warn{background:var(--warn-l);color:var(--warn);border-color:#FEDF89}.sx-b-bad{background:var(--bad-l);color:var(--bad);border-color:#FECDCA}.sx-b-neutral{background:var(--soft);color:var(--muted);border-color:var(--line)}.sx-b-teal{background:var(--teal-l);color:var(--teal-d);border-color:#B3E6E8}
.sx-empty{text-align:center;padding:44px 20px;border:1px dashed #D0D5DD;border-radius:18px;background:linear-gradient(180deg,#fff,#F0FAFB)}
.sx-empty h2{margin:12px 0 6px;font-size:20px}.sx-empty p{margin:0 auto 18px;max-width:52ch;color:var(--muted);line-height:1.55}
.sx-how{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;text-align:left;margin:20px auto 22px;max-width:760px}
.sx-how div{background:#fff;border:1px solid var(--line);border-radius:12px;padding:12px 14px;font-size:13px;color:var(--muted)}.sx-how b{display:block;color:var(--ink);margin-bottom:2px;font-size:14px}
.sx-list{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.sx-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;border:1px solid var(--line);border-radius:12px;padding:12px 14px;background:#fff}
.sx-row .sx-meta{min-width:0}.sx-row .sx-meta b{display:block;overflow-wrap:anywhere}.sx-row .sx-meta span{color:var(--muted);font-size:13px}
.sx-backdrop{position:fixed;inset:0;z-index:1000;background:rgba(16,24,40,.55);display:flex;align-items:center;justify-content:center;padding:16px;animation:sx-fade .18s ease both}
.sx-modal{background:#fff;border-radius:20px;width:min(760px,100%);max-height:min(92vh,900px);display:flex;flex-direction:column;box-shadow:0 30px 80px rgba(16,24,40,.3);animation:sx-rise .22s ease both;outline:none}
.sx-modal-head{display:flex;gap:12px;align-items:flex-start;justify-content:space-between;padding:20px 22px 12px}
.sx-modal-head h2{margin:0;font-size:20px;letter-spacing:-.01em}.sx-modal-head p{margin:4px 0 0;color:var(--muted);font-size:14px}
.sx-x{flex:none;width:36px;height:36px;border-radius:10px;border:1px solid var(--line);background:#fff;font-size:20px;line-height:1;cursor:pointer;color:var(--muted)}
.sx-modal-body{padding:6px 22px 18px;overflow:auto;min-height:0}
.sx-modal-foot{display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between;align-items:center;padding:14px 22px 18px;border-top:1px solid var(--line)}
.sx-modal-foot .sx-hint{color:var(--muted);font-size:13px}
.sx-stepper{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 16px;padding:0;list-style:none}
.sx-stepper li{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--subtle)}
.sx-stepper li span{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;border:1px solid var(--line);font-weight:700;font-size:12px}
.sx-stepper li[aria-current="step"]{color:var(--ink);font-weight:600}.sx-stepper li[aria-current="step"] span{background:var(--teal);border-color:var(--teal);color:#fff}
.sx-stepper li.sx-done span{background:var(--ok-l);border-color:#ABEFC6;color:var(--ok)}
.sx-stepper li+li::before{content:"";width:14px;height:1px;background:var(--line);margin-right:2px}
.sx-step{animation:sx-slide .24s ease both}
.sx-step h3{margin:6px 0 4px;font-size:19px}.sx-step>p{margin:0 0 16px;color:var(--muted);line-height:1.5}
.sx-platforms{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.sx-platform{display:flex;flex-direction:column;gap:6px;text-align:left;padding:14px;border:1px solid var(--line);border-radius:14px;background:#fff;cursor:pointer;min-width:0;font:inherit;color:inherit;transition:border-color .15s ease,box-shadow .15s ease,transform .15s ease}
.sx-platform:hover{transform:translateY(-1px);box-shadow:0 8px 20px rgba(16,24,40,.07)}
.sx-platform[aria-pressed="true"]{border-color:var(--teal);box-shadow:0 0 0 3px var(--teal-l)}
.sx-platform[aria-disabled="true"]{background:var(--soft);cursor:default}
.sx-platform b{font-size:14px}.sx-platform small{color:var(--muted);font-size:12px;line-height:1.35}
.sx-note{border:1px solid #B3E6E8;background:var(--teal-l);border-radius:12px;padding:12px 14px;font-size:13.5px;line-height:1.55;color:#0b545a;margin-top:14px}
.sx-warn{border-color:#FEDF89;background:var(--warn-l);color:#7A2E0E}
.sx-bad{border-color:#FECDCA;background:var(--bad-l);color:#7A271A}
.sx-field{display:grid;gap:6px;margin:8px 0 12px}.sx-field label{font-weight:600;font-size:14px}.sx-field small{color:var(--muted)}
.sx-input{width:100%;min-height:44px;border:1px solid #D0D5DD;border-radius:10px;padding:0 12px;font:15px Inter,system-ui,sans-serif;background:#fff;color:var(--ink)}
.sx-input[aria-invalid="true"]{border-color:#F04438}
.sx-err{color:var(--bad);font-size:13px;margin:0}
.sx-code{position:relative;background:#0F1F1E;color:#D8F39A;border-radius:12px;padding:14px 14px 14px;font:13px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;overflow-x:auto;white-space:pre-wrap;overflow-wrap:anywhere;margin:10px 0}
.sx-guide{display:grid;gap:10px;margin:0 0 12px;padding:0;list-style:none;counter-reset:g}
.sx-guide li{counter-increment:g;display:flex;gap:12px;align-items:flex-start;line-height:1.5}
.sx-guide li::before{content:counter(g);flex:none;width:26px;height:26px;border-radius:50%;background:var(--teal-l);color:var(--teal-d);font-weight:700;font-size:13px;display:grid;place-items:center}
.sx-checks{list-style:none;margin:12px 0;padding:0;display:grid;gap:8px}
.sx-checks li{display:flex;gap:10px;align-items:center;justify-content:space-between;border:1px solid var(--line);border-radius:10px;padding:10px 12px;font-size:14px}
.sx-scan{position:relative;height:6px;border-radius:99px;background:var(--line);overflow:hidden;margin:10px 0}
.sx-scan::after{content:"";position:absolute;inset:0 auto 0 -40%;width:40%;background:linear-gradient(90deg,transparent,var(--teal),transparent);animation:sx-scan 1.2s ease-in-out infinite}
.sx-scan[data-idle="true"]::after{display:none}
.sx-success{text-align:center;padding:8px 0 4px}
.sx-success .sx-tick{width:64px;height:64px;border-radius:50%;background:var(--ok-l);color:var(--ok);display:grid;place-items:center;margin:8px auto 12px;animation:sx-pop .35s cubic-bezier(.2,1.4,.4,1) both}
.sx-cards3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:10px 0}
.sx-radio{display:flex;flex-direction:column;gap:6px;text-align:left;padding:14px;border:1px solid var(--line);border-radius:14px;background:#fff;cursor:pointer;font:inherit;color:inherit;min-width:0}
.sx-radio[aria-checked="true"]{border-color:var(--teal);box-shadow:0 0 0 3px var(--teal-l)}
.sx-radio b{font-size:14px}.sx-radio small{color:var(--muted);line-height:1.4}
.sx-seg{display:inline-flex;border:1px solid var(--line);border-radius:10px;overflow:hidden;flex-wrap:wrap}
.sx-seg button{border:0;background:#fff;padding:9px 12px;font:600 13px Inter,system-ui,sans-serif;cursor:pointer;color:var(--muted)}
.sx-seg button[aria-pressed="true"]{background:var(--teal);color:#fff}
.sx-chips{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}
.sx-chip{display:inline-flex;align-items:center;gap:6px;background:var(--soft);border:1px solid var(--line);border-radius:999px;padding:4px 6px 4px 12px;font-size:13px;overflow-wrap:anywhere}
.sx-chip button{border:0;background:transparent;cursor:pointer;width:22px;height:22px;border-radius:50%;color:var(--muted);font-size:16px;line-height:1}
.sx-preview{border:1px solid var(--line);border-radius:14px;background:var(--soft);padding:12px;margin-top:12px}
.sx-preview-bar{display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;align-items:center;font-size:12.5px;color:var(--muted);margin-bottom:8px}
.sx-frame{margin:0 auto;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#fff;transition:width .25s ease;max-width:100%}
.sx-frame iframe{display:block;width:100%;height:340px;border:0}
.sx-toggle{display:flex;gap:10px;align-items:flex-start;padding:8px 0}.sx-toggle input{width:20px;height:20px;margin-top:2px;accent-color:var(--teal)}
.sx-toggle small{display:block;color:var(--muted)}
.sx-tabs{display:flex;gap:4px;border-bottom:1px solid var(--line);margin-bottom:14px;flex-wrap:wrap}
.sx-tabs button{border:0;background:transparent;padding:10px 12px;font:600 14px Inter,system-ui,sans-serif;color:var(--muted);cursor:pointer;border-bottom:2px solid transparent}
.sx-tabs button[aria-selected="true"]{color:var(--ink);border-bottom-color:var(--teal)}
.sx-timeline{list-style:none;margin:0;padding:0;display:grid;gap:10px}.sx-timeline li{display:flex;gap:10px;align-items:flex-start;font-size:14px}.sx-timeline time{display:block;color:var(--muted);font-size:12.5px}
.sx-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.sx-menu{position:relative}.sx-menu-list{position:absolute;right:0;top:calc(100% + 4px);z-index:20;min-width:190px;background:#fff;border:1px solid var(--line);border-radius:12px;box-shadow:0 14px 36px rgba(16,24,40,.16);padding:6px;display:grid}
.sx-menu-list button{border:0;background:transparent;text-align:left;padding:9px 10px;border-radius:8px;font:500 14px Inter,system-ui,sans-serif;cursor:pointer;color:var(--ink)}.sx-menu-list button:hover{background:var(--soft)}
.sx-drawer{align-items:stretch;justify-content:flex-end;padding:0}.sx-drawer .sx-modal{width:min(560px,100%);max-height:none;height:100%;border-radius:20px 0 0 20px;animation:sx-drawer .24s ease both}
@keyframes sx-fade{from{opacity:0}to{opacity:1}}
@keyframes sx-rise{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}
@keyframes sx-slide{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:none}}
@keyframes sx-drawer{from{transform:translateX(30px);opacity:.6}to{transform:none;opacity:1}}
@keyframes sx-scan{from{left:-40%}to{left:100%}}
@keyframes sx-pop{from{transform:scale(.5);opacity:0}to{transform:none;opacity:1}}
@media (max-width:820px){.sx-cards3{grid-template-columns:1fr}.sx-how{grid-template-columns:1fr}}
@media (max-width:640px){
  .sx-platforms{grid-template-columns:repeat(2,minmax(0,1fr))}
  .sx-metrics{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:12px;padding-bottom:6px}.sx-metric{flex:0 0 78%;scroll-snap-align:start}
  .sx-backdrop{align-items:flex-end;padding:0}.sx-modal{width:100%;max-height:94vh;border-radius:20px 20px 0 0}
  .sx-drawer .sx-modal{height:100%;max-height:none;border-radius:0}
  .sx-modal-head,.sx-modal-body,.sx-modal-foot{padding-left:16px;padding-right:16px}
  .sx-hero h1{font-size:22px}.sx-actions{width:100%}.sx-actions .sx-btn{flex:1 1 auto}
  .sx-modal-foot .sx-btn{flex:1 1 auto}
}
@media (prefers-reduced-motion:reduce){.sx-scope *,.sx-backdrop,.sx-modal,.sx-step,.sx-tick{animation:none !important;transition:none !important}.sx-scan::after{animation:none !important;inset:0;width:100%;background:var(--teal);opacity:.35}}`;

export function SitesStyles() {
  return <style dangerouslySetInnerHTML={{ __html: SITES_CSS }} />;
}

/** Self-hosted platform mark (see /platforms/sprite.svg). Decorative: the platform name is always written next to it. */
export function PlatformLogo({ id, size = 24 }: { id: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <use href={'/platforms/sprite.svg#' + id} />
    </svg>
  );
}

// ---- announcements for screen readers (copy, verification, publishing, success, errors) ----
type Announce = (message: string, assertive?: boolean) => void;
const AnnounceContext = createContext<Announce>(() => undefined);
export const useAnnounce = () => useContext(AnnounceContext);

export function AnnounceProvider({ children }: { children: ReactNode }) {
  const [polite, setPolite] = useState('');
  const [assertive, setAssertive] = useState('');
  const announce = useCallback<Announce>((message, isAssertive) => {
    // Clear first so repeating the same message is announced again.
    if (isAssertive) { setAssertive(''); setTimeout(() => setAssertive(message), 30); } else { setPolite(''); setTimeout(() => setPolite(message), 30); }
  }, []);
  return (
    <AnnounceContext.Provider value={announce}>
      {children}
      <div className="sx-sr" role="status" aria-live="polite" aria-atomic="true" data-testid="announce-polite">{polite}</div>
      <div className="sx-sr" role="alert" aria-live="assertive" aria-atomic="true" data-testid="announce-assertive">{assertive}</div>
    </AnnounceContext.Provider>
  );
}

// ---- accessible modal: focus trap, Escape, focus restore, scroll lock ----
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Focusable and actually shown (works without layout, so it behaves the same in browsers and in tests). */
const isShown = (el: HTMLElement): boolean => {
  if (el.closest('[hidden],[aria-hidden="true"]')) return false;
  const st = window.getComputedStyle(el);
  return st.display !== 'none' && st.visibility !== 'hidden';
};

export function Modal({ open, title, subtitle, onClose, children, footer, drawer = false, persistent = false, wide = false }: {
  open: boolean; title: string; subtitle?: string; onClose: () => void; children: ReactNode; footer?: ReactNode; drawer?: boolean; persistent?: boolean; wide?: boolean;
}) {
  const id = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => {
      const d = dialogRef.current;
      if (!d) return;
      const first = d.querySelector<HTMLElement>('[data-autofocus]') || d.querySelector<HTMLElement>(FOCUSABLE);
      (first || d).focus();
    }, 0);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prevOverflow;
      const opener = openerRef.current;
      if (opener && typeof opener.focus === 'function' && document.contains(opener)) opener.focus();
    };
  }, [open]);

  if (!open || !mounted) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); if (!persistent) onClose(); return; }
    if (e.key !== 'Tab') return;
    const d = dialogRef.current;
    if (!d) return;
    const items = Array.from(d.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(isShown);
    if (!items.length) { e.preventDefault(); d.focus(); return; }
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === d)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  return createPortal(
    <div className={'sx-scope sx-backdrop' + (drawer ? ' sx-drawer' : '')} onMouseDown={(e) => { if (e.target === e.currentTarget && !persistent) onClose(); }}>
      <div ref={dialogRef} className="sx-modal" role="dialog" aria-modal="true" aria-labelledby={id + '-t'} aria-describedby={subtitle ? id + '-s' : undefined} tabIndex={-1} onKeyDown={onKeyDown} style={wide ? { width: 'min(920px,100%)' } : undefined}>
        <div className="sx-modal-head">
          <div>
            <h2 id={id + '-t'}>{title}</h2>
            {subtitle ? <p id={id + '-s'}>{subtitle}</p> : null}
          </div>
          <button type="button" className="sx-x" onClick={onClose} aria-label="Close">{'\u00d7'}</button>
        </div>
        <div className="sx-modal-body">{children}</div>
        {footer ? <div className="sx-modal-foot">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

// ---- status: always an icon plus words, never colour alone ----
const BADGE: Record<SiteState, { cls: string; icon: ReactNode }> = {
  verified: { cls: 'sx-b-ok', icon: <path d="M20 6L9 17l-5-5" /> },
  needs_attention: { cls: 'sx-b-warn', icon: <path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /> },
  verifying: { cls: 'sx-b-teal', icon: <path d="M12 6v6l4 2M12 22a10 10 0 100-20 10 10 0 000 20z" /> },
  draft: { cls: 'sx-b-neutral', icon: <circle cx="12" cy="12" r="9" strokeDasharray="3 3" /> },
  paused: { cls: 'sx-b-neutral', icon: <path d="M10 5v14M14 5v14" /> },
  disconnected: { cls: 'sx-b-neutral', icon: <path d="M5 12h14" /> },
};
export function StatusBadge({ state, label }: { state: SiteState; label?: string }) {
  const b = BADGE[state];
  return (
    <span className={'sx-badge ' + b.cls}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{b.icon}</svg>
      {label || SITE_STATE_LABEL[state]}
    </span>
  );
}

export function InstallBadge({ status, label }: { status: string; label: string }) {
  const map: Record<string, string> = { live: 'sx-b-ok', failed: 'sx-b-bad', paused: 'sx-b-neutral', removed: 'sx-b-neutral' };
  const glyph = status === 'live' ? '\u2713 ' : status === 'failed' ? '! ' : status === 'paused' ? '\u23f8 ' : '\u2026 ';
  return <span className={'sx-badge ' + (map[status] || 'sx-b-teal')}><span aria-hidden="true">{glyph}</span>{label}</span>;
}

/** Copy to the clipboard with visible and spoken feedback. */
export function CopyButton({ text, label, doneLabel = 'Copied', announceText, small = false }: { text: string; label: string; doneLabel?: string; announceText?: string; small?: boolean }) {
  const [done, setDone] = useState(false);
  const announce = useAnnounce();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  async function copy() {
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch {
      try {
        const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
        ok = document.execCommand('copy'); document.body.removeChild(ta);
      } catch { ok = false; }
    }
    if (ok) { setDone(true); announce(announceText || 'Copied to clipboard'); timer.current = setTimeout(() => setDone(false), 2200); }
    else announce('Copy did not work. Select the text and copy it manually.', true);
  }
  return <button type="button" className={'sx-btn' + (small ? ' sx-btn-sm' : '')} onClick={copy}>{done ? '\u2713 ' + doneLabel : label}</button>;
}

/** A small "more actions" menu with keyboard support (Escape closes, focus returns to the trigger). */
export function ActionMenu({ label, items }: { label: string; items: Array<{ label: string; onSelect: () => void; danger?: boolean }> }) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const first = list.current?.querySelector<HTMLElement>('button');
    first?.focus();
    const onDoc = (e: MouseEvent) => { if (!list.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  function key(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); btn.current?.focus(); }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const els = Array.from(list.current?.querySelectorAll<HTMLElement>('button') || []);
      const i = els.indexOf(document.activeElement as HTMLElement);
      els[(i + (e.key === 'ArrowDown' ? 1 : -1) + els.length) % els.length]?.focus();
    }
  }
  return (
    <div className="sx-menu" onKeyDown={key}>
      <button ref={btn} type="button" className="sx-btn sx-btn-sm" aria-haspopup="menu" aria-expanded={open} aria-label={label} onClick={() => setOpen(!open)}>{'\u2022\u2022\u2022'}</button>
      {open ? (
        <div ref={list} className="sx-menu-list" role="menu">
          {items.map((it) => (
            <button key={it.label} type="button" role="menuitem" style={it.danger ? { color: '#B42318' } : undefined} onClick={() => { setOpen(false); btn.current?.focus(); it.onSelect(); }}>{it.label}</button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
