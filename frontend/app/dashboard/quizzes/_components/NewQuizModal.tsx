"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createQuizFromUrl } from "./quizTemplates";

type Stage = "site" | "loading" | "goal" | "review" | "generating" | "error";

type Goal = {
  id: string;
  label: string;
  hint: string;
  icon: "mail" | "target" | "book" | "gauge";
};

const GOALS: Goal[] = [
  { id: "leads", label: "Capture leads", hint: "Email-gated result page. Best for list growth.", icon: "mail" },
  { id: "recommend", label: "Recommend a product", hint: "Route visitors to the best fit SKU or plan.", icon: "target" },
  { id: "educate", label: "Educate and nurture", hint: "Assess knowledge, then send a drip follow up.", icon: "book" },
  { id: "score", label: "Score and qualify", hint: "Grade readiness. Useful for sales hand-off.", icon: "gauge" },
];

type BrandScrape = {
  businessType?: string;
  audience?: string;
  tone?: string;
  offer?: string;
  primaryColor?: string;
  accentColor?: string;
};

// Defaults used when scrape finds nothing or the user clears a swatch.
// These mirror the Squarespell lime-on-ink house style so the preview
// card always has a valid, readable combination to render.
const DEFAULT_PRIMARY = '#d4ff4d';
const DEFAULT_ACCENT = '#b8e63a';

function isHex(v: string | undefined): boolean {
  if (!v) return false;
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim());
}

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: (quizId: string) => void;
};

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}


function GoalIcon({ name }: { name: Goal["icon"] }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  // Duotone: a low-opacity filled layer behind a 1.75 stroke layer, both in currentColor.
  // Reads as designed without needing a second color, so the icon still recolors on select.
  if (name === "mail") {
    // Envelope with an @ badge - "capture email".
    return (
      <svg {...common}>
        <rect x="2.5" y="6" width="16" height="12" rx="2.25" fill="currentColor" fillOpacity="0.14" />
        <rect x="2.5" y="6" width="16" height="12" rx="2.25" />
        <path d="M3 8.5l7.5 5 7.5-5" />
        <circle cx="19" cy="5" r="3" fill="currentColor" fillOpacity="0.14" />
        <circle cx="19" cy="5" r="3" />
        <path d="M20.2 5v-.8a1.5 1.5 0 10-1.5 1.5" />
      </svg>
    );
  }
  if (name === "target") {
    // Bullseye with an arrow piercing center - "recommend the right product".
    return (
      <svg {...common}>
        <circle cx="11" cy="13" r="8.25" fill="currentColor" fillOpacity="0.12" />
        <circle cx="11" cy="13" r="8.25" />
        <circle cx="11" cy="13" r="4.75" />
        <circle cx="11" cy="13" r="1.5" fill="currentColor" />
        <path d="M11 13L18.5 5.5" />
        <path d="M15.5 5.5H18.5V8.5" />
      </svg>
    );
  }
  if (name === "book") {
    // Open book with a bookmark ribbon - "educate and nurture".
    return (
      <svg {...common}>
        <path d="M3.5 5.25A1.25 1.25 0 014.75 4h5.25c1.1 0 2 .9 2 2v13.75a1.5 1.5 0 00-1.35-.83H4.75A1.25 1.25 0 013.5 17.7V5.25z" fill="currentColor" fillOpacity="0.1" />
        <path d="M3.5 5.25A1.25 1.25 0 014.75 4h5.25c1.1 0 2 .9 2 2v13.75a1.5 1.5 0 00-1.35-.83H4.75A1.25 1.25 0 013.5 17.7V5.25z" />
        <path d="M20.5 5.25A1.25 1.25 0 0019.25 4H14c-1.1 0-2 .9-2 2v13.75a1.5 1.5 0 011.35-.83h5.9a1.25 1.25 0 001.25-1.22V5.25z" fill="currentColor" fillOpacity="0.1" />
        <path d="M20.5 5.25A1.25 1.25 0 0019.25 4H14c-1.1 0-2 .9-2 2v13.75a1.5 1.5 0 011.35-.83h5.9a1.25 1.25 0 001.25-1.22V5.25z" />
        <path d="M15 8.5h4M15 11.5h3" />
        <path d="M5.5 8.5h4M5.5 11.5h3" />
        <path d="M17.25 4v6.5l1.5-1.25 1.5 1.25V4" fill="currentColor" fillOpacity="0.18" />
        <path d="M17.25 4v6.5l1.5-1.25 1.5 1.25V4" />
      </svg>
    );
  }
  // gauge (Score and qualify) - speedometer with needle + tick marks.
  return (
    <svg {...common}>
      <path d="M3 14a9 9 0 0118 0v1H3v-1z" fill="currentColor" fillOpacity="0.12" />
      <path d="M3 14a9 9 0 0118 0" />
      <path d="M3 14h2" />
      <path d="M21 14h-2" />
      <path d="M12 5v2" />
      <path d="M5.3 8.7l1.4 1.4" />
      <path d="M18.7 8.7l-1.4 1.4" />
      <path d="M12 14l5-3" strokeWidth="2" />
      <circle cx="12" cy="14" r="1.8" fill="currentColor" />
    </svg>
  );
}

export default function NewQuizModal({ open, onClose, onCreated }: Props) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("site");
  const [url, setUrl] = useState("");
  const [context, setContext] = useState("");
  const [goalId, setGoalId] = useState<string>("leads");
  const [brand, setBrand] = useState<BrandScrape>({});
  const [detected, setDetected] = useState<Set<keyof BrandScrape>>(new Set());
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const urlRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setStage("site");
    setUrl("");
    setContext("");
    setGoalId("leads");
    setBrand({});
    setDetected(new Set());
    setErrorMsg("");
    setSubmitting(false);
    setTimeout(() => urlRef.current?.focus(), 20);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const stepIndex = stage === "site" || stage === "loading" ? 1 : stage === "goal" ? 2 : 3;
  const isBusy = submitting || stage === "generating";

  async function handleContinueSite() {
    const normalized = normalizeUrl(url);
    if (!normalized) {
      setErrorMsg("Paste a site URL to continue.");
      return;
    }
    setErrorMsg("");
    setStage("loading");

    // Call the real backend scrape-brand endpoint. Keep this fast and silent:
    // if it fails or times out we still advance to the goal step - the
    // POST /api/quizzes/from-url call later re-scrapes server-side anyway.
    const API = process.env.NEXT_PUBLIC_API_URL || "https://squarespell-api.onrender.com";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (typeof window !== "undefined") {
      const clerk = (window as { Clerk?: { session?: { getToken: () => Promise<string | null> } } }).Clerk;
      if (clerk?.session) {
        try {
          const token = await clerk.session.getToken();
          if (token) headers["Authorization"] = "Bearer " + token;
        } catch {}
      }
    }

    const ctl = new AbortController();
    const timer = setTimeout(function () { ctl.abort(); }, 20000);
    try {
      const resp = await fetch(API + "/api/scrape-brand", {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ url: normalized }),
        signal: ctl.signal,
      });
      if (resp.ok) {
        const data = await resp.json();
        const biz = (data && data.business) || {};
        const colors = (data && data.colors) || {};
        const next: BrandScrape = {
          businessType: biz.type,
          audience: biz.audience,
          tone: biz.tone,
          offer: biz.key_offer,
          primaryColor: isHex(colors.primary) ? colors.primary : undefined,
          accentColor: isHex(colors.accent) ? colors.accent : undefined,
        };
        setBrand(next);
        const flags = new Set<keyof BrandScrape>();
        (Object.keys(next) as Array<keyof BrandScrape>).forEach(function (k) {
          const v = next[k];
          if (typeof v === "string" && v.trim().length > 0) flags.add(k);
        });
        setDetected(flags);
      } else {
        setBrand({});
        setDetected(new Set());
      }
    } catch {
      setBrand({});
      setDetected(new Set());
    }
    clearTimeout(timer);
    setStage("goal");
  }

  async function handleGenerate() {
    setSubmitting(true);
    setErrorMsg("");
    setStage("generating");
    try {
      const normalized = normalizeUrl(url);
      const pCol = (brand.primaryColor || "").trim();
      const aCol = (brand.accentColor || "").trim();
      const trimmedBrand = {
        businessType: (brand.businessType || "").trim(),
        audience: (brand.audience || "").trim(),
        tone: (brand.tone || "").trim(),
        keyOffer: (brand.offer || "").trim(),
        primaryColor: isHex(pCol) ? pCol : "",
        accentColor: isHex(aCol) ? aCol : "",
      };
      const hasAnyBrand =
        trimmedBrand.businessType.length > 0 ||
        trimmedBrand.audience.length > 0 ||
        trimmedBrand.tone.length > 0 ||
        trimmedBrand.keyOffer.length > 0 ||
        trimmedBrand.primaryColor.length > 0 ||
        trimmedBrand.accentColor.length > 0;
      const quiz = await createQuizFromUrl({
        url: normalized,
        context,
        goal: goalId as "capture" | "recommend" | "score" | "grow",
        brand: hasAnyBrand ? trimmedBrand : undefined,
      });
      const quizId = ((quiz as any) && ((quiz as any).id || (quiz as any).quizId)) as string | undefined;
      if (quizId) {
        if (onCreated) onCreated(quizId);
        router.push(`/dashboard/${quizId}`);
      }
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong. Try again.";
      setErrorMsg(message);
      setStage("error");
    } finally {
      setSubmitting(false);
    }
  }

  const currentGoal = GOALS.find((g) => g.id === goalId) || GOALS[0];

  return (
    <>
      <style>{styles}</style>
      <div className="sq-overlay" onClick={onClose}>
        <div
          className="sq-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Create new quiz"
          onClick={(e) => e.stopPropagation()}
        >
          <aside className="sq-side">
            <div className="sq-brand">
              <span className="sq-logo" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              </span>
              <span>Squarespell</span>
            </div>
            <nav className="sq-steps" aria-label="Progress">
              {[
                { n: 1, label: "Your site" },
                { n: 2, label: "Your goal" },
                { n: 3, label: "Review and generate" },
              ].map((s) => (
                <div key={s.n} className={`sq-step ${stepIndex === s.n ? "is-active" : stepIndex > s.n ? "is-done" : ""}`}>
                  <span className="sq-step-dot">
                    {stepIndex > s.n ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
                    ) : (
                      <span>{s.n}</span>
                    )}
                  </span>
                  <span className="sq-step-label">{s.label}</span>
                </div>
              ))}
            </nav>
            <div className="sq-tip">
              <div className="sq-tip-title">Premium quiz engine</div>
              <p>We pull your brand, audience, and offer from your live site so your first quiz already sounds like you.</p>
            </div>
          </aside>

          <section className="sq-main">
            <header className="sq-head">
              <div>
                <div className="sq-eyebrow">Step {stepIndex} of 3</div>
                <h2 className="sq-title">
                  {stage === "site" && "Let's build your quiz"}
                  {stage === "loading" && "Reading your site"}
                  {stage === "goal" && "What should this quiz do"}
                  {stage === "review" && "Review and generate"}
                  {stage === "generating" && "Generating your quiz"}
                  {stage === "error" && "We hit a snag"}
                </h2>
              </div>
              <button type="button" className="sq-close" onClick={onClose} aria-label="Close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
              </button>
            </header>

            <div className="sq-body">
              {stage === "site" && (
                <div className="sq-form">
                  <p className="sq-lead">Paste your site and we do the rest. We read your homepage to pick up your tone, audience, and offer. You can edit everything before we generate.</p>

                  <label className="sq-label" htmlFor="sq-url">Your site URL</label>
                  <div className="sq-input-wrap">
                    <span className="sq-input-icon" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/></svg>
                    </span>
                    <input
                      id="sq-url"
                      ref={urlRef}
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="yourbrand.com"
                      className="sq-input"
                      autoComplete="url"
                    />
                  </div>

                  <label className="sq-label" htmlFor="sq-context">Anything else we should know <span className="sq-muted">(optional)</span></label>
                  <textarea
                    id="sq-context"
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    rows={3}
                    placeholder="Who is your ideal customer. What is the one thing you want people to walk away with."
                    className="sq-textarea"
                  />

                  <div className="sq-hint">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                    <span>We only read public pages. Nothing is saved until you click Generate.</span>
                  </div>

                  {errorMsg && <div className="sq-error">{errorMsg}</div>}
                </div>
              )}

              {stage === "loading" && (
                <div className="sq-loading">
                  <div className="sq-spinner" aria-hidden="true" />
                  <div className="sq-loading-title">Reading your homepage</div>
                  <div className="sq-loading-sub">Pulling your brand, audience, and offer.</div>
                </div>
              )}

              {stage === "goal" && (
                <div className="sq-form">
                  <p className="sq-lead">Pick the goal that matches how you want to use this quiz.</p>
                  <div className="sq-goals">
                    {GOALS.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        className={`sq-goal ${goalId === g.id ? "is-selected" : ""}`}
                        onClick={() => setGoalId(g.id)}
                      >
                        <span className="sq-goal-icon" aria-hidden="true"><GoalIcon name={g.icon} /></span>
                        <div className="sq-goal-top">
                          <span className="sq-goal-label">{g.label}</span>
                          <span className="sq-goal-check" aria-hidden="true">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
                          </span>
                        </div>
                        <div className="sq-goal-hint">{g.hint}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {stage === "review" && (
                <div className="sq-form">
                  <p className="sq-lead">Here is what we picked up. Edit anything that looks off.</p>
                  <div className="sq-review">
                    <div className="sq-review-row"><span>Site</span><strong>{normalizeUrl(url) || "-"}</strong></div>
                    <div className="sq-review-row"><span>Goal</span><strong>{currentGoal.label}</strong></div>
                  </div>
                  <div className="sq-brand-grid">
                    <label className="sq-brand-field">
                      <span className="sq-brand-label">Business type{detected.has("businessType") ? <em className="sq-brand-hint">detected</em> : null}</span>
                      <input
                        type="text"
                        className="sq-brand-input"
                        placeholder="e.g. ecommerce, online course, agency"
                        value={brand.businessType || ""}
                        onChange={(e) => { setBrand((b) => ({ ...b, businessType: e.target.value })); setDetected((d) => { if (!d.has("businessType")) return d; const n = new Set(d); n.delete("businessType"); return n; }); }}
                      />
                    </label>
                    <label className="sq-brand-field">
                      <span className="sq-brand-label">Audience{detected.has("audience") ? <em className="sq-brand-hint">detected</em> : null}</span>
                      <input
                        type="text"
                        className="sq-brand-input"
                        placeholder="e.g. small business owners on Squarespace"
                        value={brand.audience || ""}
                        onChange={(e) => { setBrand((b) => ({ ...b, audience: e.target.value })); setDetected((d) => { if (!d.has("audience")) return d; const n = new Set(d); n.delete("audience"); return n; }); }}
                      />
                    </label>
                    <label className="sq-brand-field">
                      <span className="sq-brand-label">Tone{detected.has("tone") ? <em className="sq-brand-hint">detected</em> : null}</span>
                      <input
                        type="text"
                        className="sq-brand-input"
                        placeholder="e.g. friendly, confident, minimal"
                        value={brand.tone || ""}
                        onChange={(e) => { setBrand((b) => ({ ...b, tone: e.target.value })); setDetected((d) => { if (!d.has("tone")) return d; const n = new Set(d); n.delete("tone"); return n; }); }}
                      />
                    </label>
                    <label className="sq-brand-field">
                      <span className="sq-brand-label">Key offer{detected.has("offer") ? <em className="sq-brand-hint">detected</em> : null}</span>
                      <input
                        type="text"
                        className="sq-brand-input"
                        placeholder="e.g. Squarespace plugins for service businesses"
                        value={brand.offer || ""}
                        onChange={(e) => { setBrand((b) => ({ ...b, offer: e.target.value })); setDetected((d) => { if (!d.has("offer")) return d; const n = new Set(d); n.delete("offer"); return n; }); }}
                      />
                    </label>
                  </div>
                  <div className="sq-style-pack">
                    <div className="sq-style-head">
                      <span className="sq-brand-label">Brand colors{(detected.has("primaryColor") || detected.has("accentColor")) ? <em className="sq-brand-hint">detected</em> : null}</span>
                      <span className="sq-style-sub">Used for buttons, progress bar, and accents.</span>
                    </div>
                    <div className="sq-style-body">
                      <div className="sq-swatches">
                        <label className="sq-swatch">
                          <span className="sq-swatch-role">Primary</span>
                          <span className="sq-swatch-wrap">
                            <input
                              type="color"
                              className="sq-swatch-input"
                              value={isHex(brand.primaryColor) ? (brand.primaryColor as string) : DEFAULT_PRIMARY}
                              onChange={(e) => { setBrand((b) => ({ ...b, primaryColor: e.target.value })); setDetected((d) => { if (!d.has("primaryColor")) return d; const n = new Set(d); n.delete("primaryColor"); return n; }); }}
                            />
                            <span className="sq-swatch-hex">{(isHex(brand.primaryColor) ? (brand.primaryColor as string) : DEFAULT_PRIMARY).toUpperCase()}</span>
                          </span>
                        </label>
                        <label className="sq-swatch">
                          <span className="sq-swatch-role">Accent</span>
                          <span className="sq-swatch-wrap">
                            <input
                              type="color"
                              className="sq-swatch-input"
                              value={isHex(brand.accentColor) ? (brand.accentColor as string) : DEFAULT_ACCENT}
                              onChange={(e) => { setBrand((b) => ({ ...b, accentColor: e.target.value })); setDetected((d) => { if (!d.has("accentColor")) return d; const n = new Set(d); n.delete("accentColor"); return n; }); }}
                            />
                            <span className="sq-swatch-hex">{(isHex(brand.accentColor) ? (brand.accentColor as string) : DEFAULT_ACCENT).toUpperCase()}</span>
                          </span>
                        </label>
                      </div>
                      <div className="sq-preview" aria-label="Preview">
                        <div className="sq-preview-chrome">
                          <span className="sq-preview-dot" />
                          <span className="sq-preview-dot" />
                          <span className="sq-preview-dot" />
                          <span className="sq-preview-url">Your quiz</span>
                        </div>
                        <div className="sq-preview-body">
                          <div className="sq-preview-progress">
                            <span style={{ width: "60%", background: `linear-gradient(90deg, ${isHex(brand.primaryColor) ? brand.primaryColor : DEFAULT_PRIMARY} 0%, ${isHex(brand.accentColor) ? brand.accentColor : DEFAULT_ACCENT} 100%)` }} />
                          </div>
                          <div className="sq-preview-q">Which option sounds most like you?</div>
                          <div
                            className="sq-preview-opt is-selected"
                            style={{ borderColor: isHex(brand.primaryColor) ? (brand.primaryColor as string) : DEFAULT_PRIMARY, boxShadow: `0 0 0 3px ${isHex(brand.primaryColor) ? (brand.primaryColor as string) + "33" : "rgba(212,255,77,0.18)"}` }}
                          >
                            <span>The first one</span>
                            <span className="sq-preview-check" style={{ background: isHex(brand.primaryColor) ? (brand.primaryColor as string) : DEFAULT_PRIMARY, color: "#0e1116" }} aria-hidden="true">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
                            </span>
                          </div>
                          <div className="sq-preview-opt"><span>The second one</span></div>
                          <button type="button" className="sq-preview-cta" disabled style={{ background: isHex(brand.primaryColor) ? (brand.primaryColor as string) : DEFAULT_PRIMARY, color: "#0e1116" }}>Next</button>
                        </div>
                      </div>
                    </div>
                  </div>
                  {errorMsg && <div className="sq-error">{errorMsg}</div>}
                </div>
              )}

              {stage === "generating" && (
                <div className="sq-form">
                  <p className="sq-lead">Building questions, outcomes, and styling. This usually takes 10 to 20 seconds.</p>
                  <div className="sq-skeleton-list">
                    <div className="sq-skel sq-skel-row" />
                    <div className="sq-skel sq-skel-row sq-skel-w80" />
                    <div className="sq-skel sq-skel-row sq-skel-w60" />
                    <div className="sq-skel sq-skel-block" />
                    <div className="sq-skel sq-skel-row sq-skel-w70" />
                    <div className="sq-skel sq-skel-row sq-skel-w50" />
                  </div>
                </div>
              )}

              {stage === "error" && (
                <div className="sq-error-block">
                  <div className="sq-error-icon" aria-hidden="true">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v5M12 16h.01"/></svg>
                  </div>
                  <div className="sq-error-title">Could not generate your quiz</div>
                  <div className="sq-error-sub">{errorMsg || "Our service had a hiccup. Try again in a moment."}</div>
                </div>
              )}
            </div>

            <footer className="sq-foot">
              <div className="sq-progress" aria-hidden="true">
                <span style={{ width: `${(stepIndex / 3) * 100}%` }} />
              </div>
              <div className="sq-foot-actions">
                {stage === "goal" && (
                  <button type="button" className="sq-btn sq-btn-ghost" onClick={() => setStage("site")}>Back</button>
                )}
                {stage === "review" && (
                  <button type="button" className="sq-btn sq-btn-ghost" onClick={() => setStage("goal")}>Back</button>
                )}
                {stage === "error" && (
                  <button type="button" className="sq-btn sq-btn-ghost" onClick={() => setStage("review")}>Back</button>
                )}

                {stage === "site" && (
                  <button type="button" className="sq-btn sq-btn-primary" onClick={handleContinueSite}>
                    Continue
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
                  </button>
                )}
                {stage === "loading" && (
                  <button type="button" className="sq-btn sq-btn-primary" disabled>
                    Reading site...
                  </button>
                )}
                {stage === "goal" && (
                  <button type="button" className="sq-btn sq-btn-primary" onClick={() => setStage("review")}>
                    Review
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
                  </button>
                )}
                {stage === "review" && (
                  <button type="button" className="sq-btn sq-btn-primary" onClick={handleGenerate} disabled={isBusy}>
                    {submitting ? "Generating..." : "Generate quiz"}
                  </button>
                )}
                {stage === "error" && (
                  <button type="button" className="sq-btn sq-btn-primary" onClick={handleGenerate} disabled={submitting}>
                    Try again
                  </button>
                )}
              </div>
            </footer>
          </section>
        </div>
      </div>
    </>
  );
}

export { NewQuizModal };

const styles = `
.sq-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(5, 7, 10, 0.72);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  animation: sq-fade 160ms ease-out;
}
@keyframes sq-fade { from { opacity: 0 } to { opacity: 1 } }
.sq-modal {
  max-height: 92vh;
  overflow: hidden;
  width: 100%;
  max-width: 960px;
  max-height: 92vh;
  display: grid;
  grid-template-columns: 280px 1fr;
  background: #0e1116;
  border: 1px solid #1f242c;
  border-radius: 20px;
  box-shadow: 0 30px 60px rgba(0,0,0,0.5);
  overflow: hidden;
  color: #e7eaf0;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  animation: sq-pop 180ms ease-out;
}
@keyframes sq-pop { from { transform: translateY(8px) scale(0.98); opacity: 0 } to { transform: none; opacity: 1 } }

.sq-side {
  background: linear-gradient(180deg, #0b0d12 0%, #0e1116 100%);
  border-right: 1px solid #1a1f27;
  padding: 22px 20px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}
.sq-brand { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 15px; letter-spacing: -0.01em; }
.sq-logo {
  width: 28px; height: 28px; border-radius: 8px;
  background: #d4ff4d; color: #0e1116;
  display: inline-flex; align-items: center; justify-content: center;
}
.sq-steps { display: flex; flex-direction: column; gap: 4px; }
.sq-step {
  overflow-y: auto;
  max-height: 92vh;
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 13px; font-weight: 500;
  color: #8891a0;
  transition: background 120ms, color 120ms;
}
.sq-step-dot {
  width: 22px; height: 22px; border-radius: 50%;
  background: #181d26;
  color: #8891a0;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700;
  border: 1px solid #232a35;
}
.sq-step.is-active { background: rgba(212, 255, 77, 0.08); color: #e7eaf0; }
.sq-step.is-active .sq-step-dot { background: #d4ff4d; color: #0e1116; border-color: #d4ff4d; }
.sq-step.is-done { color: #c0c6d0; }
.sq-step.is-done .sq-step-dot { background: #1d2a14; color: #d4ff4d; border-color: #2e4a18; }
.sq-step-label { flex: 1; }

.sq-tip {
  margin-top: auto;
  padding: 14px;
  background: rgba(212, 255, 77, 0.04);
  border: 1px solid rgba(212, 255, 77, 0.14);
  border-radius: 12px;
  font-size: 12px;
  color: #b6bdc8;
  line-height: 1.5;
}
.sq-tip p { margin: 0; }
.sq-tip-title { color: #d4ff4d; font-weight: 700; font-size: 12px; letter-spacing: 0.02em; text-transform: uppercase; margin-bottom: 6px; }

.sq-main { display: flex; flex-direction: column; min-width: 0; background: #0e1116; }
.sq-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 22px 28px 12px 28px;
}
.sq-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #6b7384; margin-bottom: 4px; }
.sq-title { margin: 0; font-size: 22px; line-height: 1.2; font-weight: 700; letter-spacing: -0.015em; color: #f4f6f8; }
.sq-close {
  width: 34px; height: 34px; border-radius: 10px;
  background: #171b23; color: #9aa3b2;
  border: 1px solid #232a35;
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 120ms;
}
.sq-close:hover { background: #1f2530; color: #e7eaf0; }

.sq-body { padding: 8px 28px 20px 28px; overflow-y: auto; min-height: 320px; }
.sq-form { display: flex; flex-direction: column; gap: 14px; }
.sq-lead { margin: 0 0 6px 0; font-size: 14px; line-height: 1.55; color: #aeb5c2; }
.sq-label { font-size: 13px; font-weight: 600; color: #dfe3ea; }
.sq-muted { color: #6b7384; font-weight: 500; }

.sq-input-wrap { position: relative; }
.sq-input-icon {
  position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
  color: #6b7384; pointer-events: none;
  display: inline-flex;
}
.sq-input, .sq-textarea {
  width: 100%; box-sizing: border-box;
  background: #121620;
  border: 1px solid #232a35;
  border-radius: 12px;
  padding: 12px 14px;
  color: #f4f6f8;
  font-size: 14px; font-family: inherit;
  outline: none;
  transition: border-color 120ms, box-shadow 120ms, background 120ms;
}
.sq-input { padding-left: 40px; }
.sq-textarea { resize: vertical; min-height: 80px; line-height: 1.5; }
.sq-input:focus, .sq-textarea:focus {
  border-color: #d4ff4d;
  box-shadow: 0 0 0 3px rgba(212, 255, 77, 0.18);
  background: #141925;
}
.sq-input::placeholder, .sq-textarea::placeholder { color: #5b6472; }

.sq-hint {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 12px; color: #8891a0;
  padding: 8px 12px;
  background: #121620;
  border: 1px solid #1d2330;
  border-radius: 10px;
  width: fit-content;
}
.sq-error {
  padding: 10px 14px;
  background: rgba(255, 92, 92, 0.08);
  border: 1px solid rgba(255, 92, 92, 0.3);
  color: #ffb4b4;
  border-radius: 10px;
  font-size: 13px;
}

.sq-loading {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 14px; padding: 48px 20px; text-align: center;
}
.sq-spinner {
  width: 36px; height: 36px; border-radius: 50%;
  border: 3px solid #232a35; border-top-color: #d4ff4d;
  animation: sq-spin 0.9s linear infinite;
}
@keyframes sq-spin { to { transform: rotate(360deg) } }
.sq-loading-title { font-size: 15px; font-weight: 600; color: #f4f6f8; }
.sq-loading-sub { font-size: 13px; color: #8891a0; }

.sq-goals { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.sq-goal {
  text-align: left;
  padding: 14px;
  background: #121620;
  border: 1px solid #232a35;
  border-radius: 14px;
  color: #e7eaf0;
  cursor: pointer;
  transition: all 120ms;
  font-family: inherit;
}
.sq-goal:hover { border-color: #3a4556; background: #141a26; }
.sq-goal.is-selected {
  border-color: #d4ff4d;
  background: rgba(212, 255, 77, 0.06);
  box-shadow: 0 0 0 3px rgba(212, 255, 77, 0.14);
}
.sq-goal-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.sq-goal-label { font-weight: 600; font-size: 14px; color: #f4f6f8; }
.sq-goal-check {
  width: 20px; height: 20px; border-radius: 50%;
  background: #181d26;
  color: transparent;
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid #2a3240;
  transition: all 120ms;
}
.sq-goal.is-selected .sq-goal-check { background: #d4ff4d; color: #0e1116; border-color: #d4ff4d; }
.sq-goal-hint { font-size: 12.5px; color: #8891a0; line-height: 1.5; }

.sq-review {
  display: flex; flex-direction: column;
  background: #121620;
  border: 1px solid #232a35;
  border-radius: 14px;
  overflow: hidden;
}
.sq-review-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px;
  font-size: 13.5px;
  border-bottom: 1px solid #1a2029;
}
.sq-review-row:last-child { border-bottom: none; }
.sq-review-row span { color: #8891a0; }
.sq-review-row strong { color: #f4f6f8; font-weight: 600; }
.sq-brand-grid {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 12px; margin-top: 14px;
}
.sq-brand-field { display: flex; flex-direction: column; gap: 6px; }
.sq-brand-label {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px; color: #8891a0;
  letter-spacing: 0.02em; text-transform: uppercase;
}
.sq-brand-hint {
  font-style: normal; font-size: 10.5px;
  padding: 1px 7px; border-radius: 999px;
  background: rgba(212, 255, 77, 0.12); color: #d4ff4d;
  letter-spacing: 0.04em;
}
.sq-brand-input {
  background: #121620; border: 1px solid #232a35;
  border-radius: 10px; padding: 10px 12px;
  color: #f4f6f8; font-size: 13.5px;
  transition: border-color 120ms, box-shadow 120ms;
  font-family: inherit;
}
.sq-brand-input::placeholder { color: #5a6372; }
.sq-brand-input:focus {
  outline: none; border-color: #d4ff4d;
  box-shadow: 0 0 0 3px rgba(212, 255, 77, 0.15);
}
@media (max-width: 600px) {
  .sq-brand-grid { grid-template-columns: 1fr; }
}

.sq-error-block {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; padding: 40px 20px; text-align: center;
}
.sq-goal-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(212, 255, 77, 0.10);
  color: #d4ff4d;
  margin-bottom: 12px;
}
.sq-goal.is-selected .sq-goal-icon {
  background: rgba(212, 255, 77, 0.18);
}
.sq-skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 8px;
}
.sq-skel {
  background: linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.04) 100%);
  background-size: 200% 100%;
  border-radius: 8px;
  animation: sq-shimmer 1.4s ease-in-out infinite;
}
.sq-skel-row { height: 14px; width: 100%; }
.sq-skel-block { height: 80px; width: 100%; border-radius: 12px; }
.sq-skel-w80 { width: 80%; }
.sq-skel-w70 { width: 70%; }
.sq-skel-w60 { width: 60%; }
.sq-skel-w50 { width: 50%; }
@keyframes sq-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.sq-error-icon {
  width: 48px; height: 48px; border-radius: 50%;
  background: rgba(255, 92, 92, 0.1);
  color: #ff8080;
  display: inline-flex; align-items: center; justify-content: center;
}
.sq-error-title { font-size: 16px; font-weight: 700; color: #f4f6f8; }
.sq-error-sub { font-size: 13.5px; color: #9aa3b2; max-width: 420px; line-height: 1.5; }

.sq-foot { border-top: 1px solid #1a1f27; padding: 16px 28px 20px 28px; display: flex; flex-direction: column; gap: 12px; }
.sq-progress { height: 4px; background: #1a1f27; border-radius: 999px; overflow: hidden; }
.sq-progress span { display: block; height: 100%; background: linear-gradient(90deg, #d4ff4d 0%, #b8e63a 100%); border-radius: 999px; transition: width 220ms ease-out; }
.sq-foot-actions { display: flex; justify-content: flex-end; gap: 10px; }

.sq-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 10px 16px;
  font-size: 13.5px; font-weight: 600;
  border-radius: 10px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 120ms;
  font-family: inherit;
}
.sq-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.sq-btn-primary {
  background: #d4ff4d; color: #0e1116;
}
.sq-btn-primary:hover:not(:disabled) { background: #c1eb3a; }
.sq-btn-ghost {
  background: transparent; color: #c0c6d0;
  border-color: #2a3240;
}
.sq-btn-ghost:hover:not(:disabled) { background: #181d26; color: #f4f6f8; }

@media (max-width: 720px) {
  .sq-modal { grid-template-columns: 1fr; max-height: 96vh; }
  .sq-side { display: none; }
  .sq-goals { grid-template-columns: 1fr; }
}
.sq-style-pack {
  margin-top: 18px;
  padding: 16px;
  background: #111722;
  border: 1px solid #202735;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.sq-style-head { display: flex; flex-direction: column; gap: 4px; }
.sq-style-sub { font-size: 12px; color: #7d8594; }
.sq-style-body { display: grid; grid-template-columns: 180px 1fr; gap: 16px; align-items: stretch; }
.sq-swatches { display: flex; flex-direction: column; gap: 10px; }
.sq-swatch {
  display: flex; flex-direction: column; gap: 6px;
  padding: 10px 12px;
  background: #0e1420;
  border: 1px solid #1f2735;
  border-radius: 10px;
  cursor: pointer;
}
.sq-swatch-role { font-size: 10.5px; color: #7d8594; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 700; }
.sq-swatch-wrap { display: flex; align-items: center; gap: 10px; }
.sq-swatch-input {
  appearance: none; -webkit-appearance: none;
  width: 34px; height: 34px; border-radius: 8px;
  padding: 0; border: 1px solid #2a3240; background: transparent;
  cursor: pointer; overflow: hidden;
}
.sq-swatch-input::-webkit-color-swatch-wrapper { padding: 0; border-radius: 7px; }
.sq-swatch-input::-webkit-color-swatch { border: none; border-radius: 7px; }
.sq-swatch-input::-moz-color-swatch { border: none; border-radius: 7px; }
.sq-swatch-hex { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; color: #c6ccd6; letter-spacing: 0.02em; }
.sq-preview {
  background: #0a0f17;
  border: 1px solid #1a2130;
  border-radius: 12px;
  overflow: hidden;
  display: flex; flex-direction: column;
  min-height: 240px;
}
.sq-preview-chrome {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 12px;
  background: #0e141f;
  border-bottom: 1px solid #1a2130;
}
.sq-preview-dot { width: 8px; height: 8px; border-radius: 50%; background: #2a3240; }
.sq-preview-url { margin-left: 8px; font-size: 11px; color: #6b7384; }
.sq-preview-body { padding: 14px; display: flex; flex-direction: column; gap: 10px; }
.sq-preview-progress { height: 4px; border-radius: 999px; overflow: hidden; background: rgba(255,255,255,0.06); }
.sq-preview-progress span { display: block; height: 100%; border-radius: 999px; transition: background 120ms; }
.sq-preview-q { font-size: 13.5px; font-weight: 600; color: #f4f6f8; }
.sq-preview-opt {
  display: flex; align-items: center; justify-content: space-between;
  padding: 9px 12px;
  background: #121a27;
  border: 1.5px solid #1f2735;
  border-radius: 10px;
  color: #c6ccd6; font-size: 12.5px;
  transition: border-color 120ms, box-shadow 120ms;
}
.sq-preview-opt.is-selected { color: #f4f6f8; }
.sq-preview-check {
  width: 18px; height: 18px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
}
.sq-preview-cta {
  margin-top: 4px;
  padding: 9px 14px;
  border: none;
  border-radius: 10px;
  font-size: 12.5px; font-weight: 700;
  font-family: inherit;
  cursor: default;
  align-self: flex-start;
  transition: background 120ms;
}
@media (max-width: 720px) {
  .sq-style-body { grid-template-columns: 1fr; }
}
`;
