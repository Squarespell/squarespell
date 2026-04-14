"use client";

import { useEffect, useRef, useState } from "react";
import { createQuizFromUrl } from "./quizTemplates";

type Stage = "site" | "loading" | "goal" | "review" | "error";

type Goal = {
  id: string;
  label: string;
  hint: string;
};

const GOALS: Goal[] = [
  { id: "leads", label: "Capture leads", hint: "Email-gated result page. Best for list growth." },
  { id: "recommend", label: "Recommend a product", hint: "Route visitors to the best fit SKU or plan." },
  { id: "educate", label: "Educate and nurture", hint: "Assess knowledge, then send a drip follow up." },
  { id: "score", label: "Score and qualify", hint: "Grade readiness. Useful for sales hand-off." },
];

type BrandScrape = {
  businessType?: string;
  audience?: string;
  tone?: string;
  offer?: string;
};

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

export default function NewQuizModal({ open, onClose, onCreated }: Props) {
  const [stage, setStage] = useState<Stage>("site");
  const [url, setUrl] = useState("");
  const [context, setContext] = useState("");
  const [goalId, setGoalId] = useState<string>("leads");
  const [brand, setBrand] = useState<BrandScrape>({});
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

  async function handleContinueSite() {
    const normalized = normalizeUrl(url);
    if (!normalized) {
      setErrorMsg("Paste a site URL to continue.");
      return;
    }
    setErrorMsg("");
    setStage("loading");
    try {
      const resp = await fetch("/api/brand/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalized, context }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setBrand({
          businessType: data.businessType,
          audience: data.audience,
          tone: data.tone,
          offer: data.offer,
        });
      } else {
        setBrand({});
      }
    } catch {
      setBrand({});
    }
    setStage("goal");
  }

  async function handleGenerate() {
    setSubmitting(true);
    setErrorMsg("");
    try {
      const normalized = normalizeUrl(url);
      const quiz = await createQuizFromUrl({
        url: normalized,
        context,
        goal: goalId as "capture" | "recommend" | "score" | "grow",
      });
      const quizId = (quiz && (quiz.id || quiz.quizId)) as string | undefined;
      if (quizId && onCreated) onCreated(quizId);
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
                    {brand.businessType && <div className="sq-review-row"><span>Business type</span><strong>{brand.businessType}</strong></div>}
                    {brand.audience && <div className="sq-review-row"><span>Audience</span><strong>{brand.audience}</strong></div>}
                    {brand.tone && <div className="sq-review-row"><span>Tone</span><strong>{brand.tone}</strong></div>}
                    {brand.offer && <div className="sq-review-row"><span>Key offer</span><strong>{brand.offer}</strong></div>}
                  </div>
                  {errorMsg && <div className="sq-error">{errorMsg}</div>}
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
                  <button type="button" className="sq-btn sq-btn-primary" onClick={handleGenerate} disabled={submitting}>
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

.sq-error-block {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; padding: 40px 20px; text-align: center;
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
`;
