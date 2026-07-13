"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createQuizFromUrl } from "./quizTemplates";
import { QUIZ_TEMPLATE_CATALOG, QuizTemplateData } from '../../../../lib/quiz/templates';

type Stage = "choose" | "templates" | "site" | "loading" | "pick" | "generating" | "error";
type GateCode = "trial_expired" | "quiz_limit_reached" | null;

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
// These mirror the Squarespell Quiz teal-on-white house style so the preview
// card always has a valid, readable combination to render.
const DEFAULT_PRIMARY = '#0f7377';
const DEFAULT_ACCENT = '#0B6165';

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


/**
 * Match scraped business type to the 2 best templates from the catalog.
 * Uses keyword overlap between businessType/tags and template tags/category.
 */
function matchTemplatesToBusiness(businessType: string): QuizTemplateData[] {
  var keywords = (businessType || '').toLowerCase().split(/[\s,;\/&]+/).filter(function(w) { return w.length > 2; });
  var scored = QUIZ_TEMPLATE_CATALOG.map(function(tpl) {
    var haystack = (tpl.tags.join(' ') + ' ' + tpl.category + ' ' + tpl.audience + ' ' + tpl.name).toLowerCase();
    var score = 0;
    keywords.forEach(function(kw) {
      if (haystack.indexOf(kw) !== -1) score += 1;
    });
    // Boost exact category matches
    if (haystack.indexOf(businessType.toLowerCase().trim()) !== -1) score += 2;
    return { tpl: tpl, score: score };
  });
  scored.sort(function(a, b) { return b.score - a.score; });
  // Return top 2; if no matches default to first 2
  var results = scored.slice(0, 2).map(function(s) { return s.tpl; });
  // Avoid duplicates — if both scored 0, just pick different categories
  if (results.length < 2) {
    results = QUIZ_TEMPLATE_CATALOG.slice(0, 2);
  }
  return results;
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
  const [stage, setStage] = useState<Stage>("choose");
  const [url, setUrl] = useState("");
  const [context, setContext] = useState("");
  const [topic, setTopic] = useState("");
  const [quizIdeas, setQuizIdeas] = useState<string[]>([]);
  const [goalId, setGoalId] = useState<string>("leads");
  const [brand, setBrand] = useState<BrandScrape>({});
  const [detected, setDetected] = useState<Set<keyof BrandScrape>>(new Set());
  const [isSquarespace, setIsSquarespace] = useState(false);
  const [templateVersion, setTemplateVersion] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [gateCode, setGateCode] = useState<GateCode>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [templateFilter, setTemplateFilter] = useState<string>('All');
  const [pickChoice, setPickChoice] = useState<'ai' | string>('ai'); // 'ai' or template id
  const [matchedTemplates, setMatchedTemplates] = useState<QuizTemplateData[]>([]);
  const urlRef = useRef<HTMLInputElement>(null);
  const primaryColorRef = useRef<HTMLInputElement>(null);
  const accentColorRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setStage("choose");
    setUrl("");
    setContext("");
    setTopic("");
    setQuizIdeas([]);
    setGoalId("leads");
    setBrand({});
    setDetected(new Set());
    setIsSquarespace(false);
    setTemplateVersion('');
    setErrorMsg("");
    setSubmitting(false);
    setSelectedTemplate(null);
    setTemplateFilter('All');
    setPickChoice('ai');
    setMatchedTemplates([]);
  }, [open]);

  // Lock body and html scroll while modal is open
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
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

  const stepIndex = (stage === "choose" || stage === "templates") ? 0 : (stage === "site" || stage === "loading") ? 1 : (stage === "pick") ? 2 : 3;
  const isBusy = submitting || stage === "generating";

  // Template creation: save blocks directly to the backend
  async function handleCreateFromTemplate(templateId: string) {
    var tpl = QUIZ_TEMPLATE_CATALOG.find(function(t) { return t.id === templateId; });
    if (!tpl) return;
    setSubmitting(true);
    setErrorMsg("");
    try {
      var API = process.env.NEXT_PUBLIC_API_URL || "https://squarespell-api.onrender.com";
      var headers: Record<string, string> = { "Content-Type": "application/json" };
      if (typeof window !== "undefined") {
        var clerk = (window as { Clerk?: { session?: { getToken: () => Promise<string | null> } } }).Clerk;
        if (clerk?.session) {
          try {
            var token = await clerk.session.getToken();
            if (token) headers["Authorization"] = "Bearer " + token;
          } catch {}
        }
      }
      // Import blocksToLegacy dynamically to convert blocks to the API format
      var { blocksToLegacy } = await import('../../../../lib/quiz/blocks');
      var blocks = tpl.blocks();
      var legacy = blocksToLegacy(blocks);
      var res = await fetch(API + "/api/quizzes", {
        method: "POST",
        headers: headers,
        body: JSON.stringify({
          title: tpl.name + " Quiz",
          description: tpl.description,
          questions: legacy.questions,
          outcomes: legacy.outcomes,
          leadGate: legacy.leadGate,
          settings: { template_id: tpl.id },
        }),
      });
      if (!res.ok) {
        var errBody = await res.text().catch(function() { return ""; });
        throw new Error("Failed to create quiz (" + res.status + "): " + errBody.slice(0, 200));
      }
      var data = await res.json();
      var quizId = data?.quiz?.id || data?.id;
      if (quizId) {
        if (onCreated) onCreated(quizId);
        router.push("/dashboard/" + quizId);
      }
      onClose();
    } catch (err: unknown) {
      var message = err instanceof Error ? err.message : "Something went wrong.";
      setErrorMsg(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleContinueSite() {
    const normalized = normalizeUrl(url);
    if (!normalized) {
      setErrorMsg("Paste a site URL to continue.");
      return;
    }

    // Validate URL format using URL constructor
    try {
      new URL(normalized);
    } catch (e) {
      setErrorMsg("Please enter a valid URL (e.g., yourbrand.com or https://yourbrand.com).");
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
        setMatchedTemplates(matchTemplatesToBusiness(next.businessType || ''));
        setIsSquarespace(true);
        if (data.template_version) setTemplateVersion(data.template_version);
        const flags = new Set<keyof BrandScrape>();
        (Object.keys(next) as Array<keyof BrandScrape>).forEach(function (k) {
          const v = next[k];
          if (typeof v === "string" && v.trim().length > 0) flags.add(k);
        });
        setDetected(flags);
        const ideas = Array.isArray(data?.quiz_ideas) ? data.quiz_ideas.filter((s: unknown): s is string => typeof s === "string" && s.trim().length > 0) : [];
        setQuizIdeas(ideas.slice(0, 4));
      } else if (resp.status === 422) {
        const errData = await resp.json().catch(() => ({}));
        if (errData.code === 'NOT_SQUARESPACE') {
          setErrorMsg('This does not look like a Squarespace site. Squarespell Quiz is built exclusively for Squarespace - paste a Squarespace site URL to continue.');
          setIsSquarespace(false);
          clearTimeout(timer);
          setStage('site');
          return;
        }
        setBrand({});
        setDetected(new Set());
        setQuizIdeas([]);
        setMatchedTemplates(matchTemplatesToBusiness(''));
      } else {
        setBrand({});
        setDetected(new Set());
        setQuizIdeas([]);
        setMatchedTemplates(matchTemplatesToBusiness(''));
      }
    } catch {
      setBrand({});
      setDetected(new Set());
      setQuizIdeas([]);
      setMatchedTemplates(matchTemplatesToBusiness(''));
    }
    clearTimeout(timer);
    setStage("pick");
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
        topic: topic.trim() || undefined,
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
      const code = (err as any)?.code as string | undefined;
      if (code === "trial_expired" || code === "quiz_limit_reached") {
        setGateCode(code as GateCode);
      } else {
        setGateCode(null);
      }
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
      <div className="sq-overlay" onClick={onClose} onWheel={(e) => e.stopPropagation()}>
        <div
          className="sq-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Create new quiz"
          onClick={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          <aside className="sq-side">
            <div className="sq-brand">
              <span className="sq-logo" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="4" r="2" fill="currentColor"/><line x1="12" y1="6" x2="12" y2="11"/><line x1="12" y1="11" x2="7" y2="16"/><line x1="12" y1="11" x2="17" y2="16"/><circle cx="7" cy="18" r="2" fill="currentColor"/><circle cx="17" cy="18" r="2" fill="currentColor"/></svg>
              </span>
              <span style={{ fontSize: '18px', fontWeight: 700, color: '#1A1A1A', letterSpacing: '-0.03em' }}>Squarespell Quiz</span>
            </div>
            {stepIndex === 0 ? (
              <>
                <nav className="sq-steps" aria-label="Progress">
                  <div className="sq-step is-active">
                    <span className="sq-step-dot"><span>1</span></span>
                    <span className="sq-step-label">Choose how to start</span>
                  </div>
                </nav>
                <div className="sq-tip">
                  <div className="sq-tip-title">Two ways to create</div>
                  <p>Start from a proven template and customize it, or generate a unique quiz from your website URL.</p>
                </div>
              </>
            ) : (
              <>
                <nav className="sq-steps" aria-label="Progress">
                  {[
                    { n: 1, label: "Your site" },
                    { n: 2, label: "Choose your quiz" },
                    { n: 3, label: "Generate" },
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
              </>
            )}
          </aside>

          <section className="sq-main">
            <header className="sq-head">
              <div>
                <div className="sq-eyebrow">{stepIndex === 0 ? 'New quiz' : 'Step ' + stepIndex + ' of 3'}</div>
                <h2 className="sq-title">
                  {stage === "choose" && "How do you want to start?"}
                  {stage === "templates" && "Pick a template"}
                  {stage === "site" && "Let's build your quiz"}
                  {stage === "loading" && "Reading your site"}
                  {stage === "pick" && "Choose your quiz"}
                  {stage === "generating" && "Generating your quiz"}
                  {stage === "error" && "We hit a snag"}
                </h2>
              </div>
              <button type="button" className="sq-close" onClick={onClose} aria-label="Close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
              </button>
            </header>

            <div className="sq-body">
              {stage === "choose" && (
                <div className="sq-form">
                  <p className="sq-lead">Choose how you want to create your quiz. Use a proven template and customize it, or let AI generate one from your website.</p>
                  <div className="sq-goals">
                    <button type="button" className="sq-goal" onClick={() => setStage("templates")}>
                      <span className="sq-goal-icon" aria-hidden="true">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                      </span>
                      <div className="sq-goal-top">
                        <span className="sq-goal-label">Start from a template</span>
                      </div>
                      <div className="sq-goal-hint">Pick from {QUIZ_TEMPLATE_CATALOG.length} proven quiz templates designed for Squarespace businesses. Customize questions, outcomes, and branding.</div>
                    </button>
                    <button type="button" className="sq-goal" onClick={() => setStage("site")}>
                      <span className="sq-goal-icon" aria-hidden="true">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                      </span>
                      <div className="sq-goal-top">
                        <span className="sq-goal-label">Generate from my website</span>
                      </div>
                      <div className="sq-goal-hint">AI reads your Squarespace site and builds a custom quiz matching your brand voice, audience, and offer.</div>
                    </button>
                  </div>
                </div>
              )}

              {stage === "templates" && (
                <div className="sq-form">
                  <p className="sq-lead">Each template is built from proven quiz patterns used by top-converting brands. Pick one and make it yours.</p>
                  <div className="sq-tpl-filters">
                    {['All', ...Array.from(new Set(QUIZ_TEMPLATE_CATALOG.map(function(t) { return t.category; })))].map(function(cat) {
                      return (
                        <button key={cat} type="button" className={'sq-tpl-filter' + (templateFilter === cat ? ' is-active' : '')} onClick={function() { setTemplateFilter(cat); }}>
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                  <div className="sq-tpl-grid">
                    {QUIZ_TEMPLATE_CATALOG.filter(function(t) { return templateFilter === 'All' || t.category === templateFilter; }).map(function(tpl) {
                      var isSelected = selectedTemplate === tpl.id;
                      var previewBlocks = tpl.blocks();
                      var firstQ = previewBlocks.find(function(b: any) { return b.type === 'question'; }) as any;
                      var previewImg = (firstQ && firstQ.mediaUrl && firstQ.mediaType !== 'video' ? firstQ.mediaUrl : '') || (firstQ && firstQ.options && firstQ.options[0] && firstQ.options[0].imageUrl) || '';
                      var questionCount = previewBlocks.filter(function(b: any) { return b.type === 'question'; }).length;
                      var outcomeCount = previewBlocks.filter(function(b: any) { return b.type === 'outcome'; }).length;
                      return (
                        <button key={tpl.id} type="button" className={'sq-tpl-card' + (isSelected ? ' is-selected' : '')} onClick={function() { setSelectedTemplate(isSelected ? null : tpl.id); }}>
                          {previewImg ? (
                            <div className="sq-tpl-img">
                              <img src={previewImg} alt={tpl.name} loading="lazy" onError={function(e: any) { e.currentTarget.style.display = 'none'; }} />
                            </div>
                          ) : (
                            <div className="sq-tpl-icon">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d={tpl.iconPath}/></svg>
                            </div>
                          )}
                          <div className="sq-tpl-cat">{tpl.category}</div>
                          <div className="sq-tpl-name">{tpl.name}</div>
                          <div className="sq-tpl-desc">{tpl.description.length > 120 ? tpl.description.slice(0, 120) + '...' : tpl.description}</div>
                          <div className="sq-tpl-meta">{questionCount} questions · {outcomeCount} outcomes</div>
                        </button>
                      );
                    })}
                  </div>
                  {selectedTemplate && (
                    <div className="sq-tpl-detail">
                      {(function() {
                        var t = QUIZ_TEMPLATE_CATALOG.find(function(x) { return x.id === selectedTemplate; });
                        if (!t) return null;
                        return (
                          <>
                            <div className="sq-tpl-detail-title">Why this works</div>
                            <div className="sq-tpl-detail-text">{t.whyItWorks}</div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                  {errorMsg && <div className="sq-error">{errorMsg}</div>}
                </div>
              )}

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

              {stage === "pick" && (
                <div className="sq-form">
                  <p className="sq-lead">We analyzed your site and built 3 quiz options. Each one is styled with your brand. Pick one to generate.</p>
                  {isSquarespace && (
                    <div className="sq-sqsp-badge">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
                      <span>Squarespace{templateVersion ? " " + templateVersion : ""} detected</span>
                    </div>
                  )}
                  <div className="sq-pick-grid">
                    {/* Card 1: AI Custom */}
                    <button type="button" className={'sq-pick-card' + (pickChoice === 'ai' ? ' is-selected' : '')} onClick={function() { setPickChoice('ai'); }}>
                      <div className="sq-pick-badge sq-pick-badge-ai">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                        AI Custom
                      </div>
                      <div className="sq-pick-phone">
                        <div className="sq-pick-notch" />
                        <div className="sq-pick-screen">
                          <div className="sq-pick-pbar"><span style={{ width: '40%', background: isHex(brand.primaryColor) ? brand.primaryColor : DEFAULT_PRIMARY }} /></div>
                          <div className="sq-pick-qtext">{quizIdeas.length > 0 ? quizIdeas[0] : (brand.businessType ? 'Find your perfect ' + brand.businessType + ' match' : 'Which option is right for you?')}</div>
                          <div className="sq-pick-opts">
                            <div className="sq-pick-opt is-active" style={{ borderColor: isHex(brand.primaryColor) ? brand.primaryColor : DEFAULT_PRIMARY }}>
                              <span className="sq-pick-radio" style={{ background: isHex(brand.primaryColor) ? brand.primaryColor : DEFAULT_PRIMARY }} />
                              <span>Option A</span>
                            </div>
                            <div className="sq-pick-opt">
                              <span className="sq-pick-radio" />
                              <span>Option B</span>
                            </div>
                            <div className="sq-pick-opt">
                              <span className="sq-pick-radio" />
                              <span>Option C</span>
                            </div>
                          </div>
                          <div className="sq-pick-cta" style={{ background: isHex(brand.primaryColor) ? brand.primaryColor : DEFAULT_PRIMARY }}>Next</div>
                        </div>
                      </div>
                      <div className="sq-pick-info">
                        <div className="sq-pick-name">Custom AI Quiz</div>
                        <div className="sq-pick-desc">Built from scratch using your site content, brand voice, and audience.</div>
                      </div>
                      <div className="sq-pick-check" aria-hidden="true">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
                      </div>
                    </button>

                    {/* Card 2 & 3: Matched templates */}
                    {matchedTemplates.map(function(tpl) {
                      var q1 = tpl.blocks().find(function(b: any) { return b.type === 'question'; }) as any;
                      var opts = (q1 && q1.options) || [];
                      return (
                        <button key={tpl.id} type="button" className={'sq-pick-card' + (pickChoice === tpl.id ? ' is-selected' : '')} onClick={function() { setPickChoice(tpl.id); }}>
                          <div className="sq-pick-badge sq-pick-badge-tpl">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                            Template
                          </div>
                          <div className="sq-pick-phone">
                            <div className="sq-pick-notch" />
                            <div className="sq-pick-screen">
                              <div className="sq-pick-pbar"><span style={{ width: '25%', background: isHex(brand.primaryColor) ? brand.primaryColor : DEFAULT_PRIMARY }} /></div>
                              <div className="sq-pick-qtext">{q1 ? q1.text : tpl.name}</div>
                              <div className="sq-pick-opts">
                                {opts.slice(0, 3).map(function(opt: any, i: number) {
                                  return (
                                    <div key={opt.id || i} className={'sq-pick-opt' + (i === 0 ? ' is-active' : '')} style={i === 0 ? { borderColor: isHex(brand.primaryColor) ? brand.primaryColor : DEFAULT_PRIMARY } : {}}>
                                      <span className="sq-pick-radio" style={i === 0 ? { background: isHex(brand.primaryColor) ? brand.primaryColor : DEFAULT_PRIMARY } : {}} />
                                      <span>{opt.text}</span>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="sq-pick-cta" style={{ background: isHex(brand.primaryColor) ? brand.primaryColor : DEFAULT_PRIMARY }}>Next</div>
                            </div>
                          </div>
                          <div className="sq-pick-info">
                            <div className="sq-pick-name">{tpl.name}</div>
                            <div className="sq-pick-desc">{tpl.description.length > 80 ? tpl.description.slice(0, 80) + '...' : tpl.description}</div>
                          </div>
                          <div className="sq-pick-check" aria-hidden="true">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
                          </div>
                        </button>
                      );
                    })}
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

              {stage === "error" && gateCode && (
                <div className="sq-error-block">
                  <div className="sq-gate-icon" aria-hidden="true">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0f7377" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {gateCode === "trial_expired"
                        ? <><circle cx="12" cy="12" r="10"/><path d="M12 8v5M12 16h.01"/></>
                        : <><path d="M12 9v4M12 17h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></>
                      }
                    </svg>
                  </div>
                  <div className="sq-error-title">
                    {gateCode === "trial_expired" ? "Your free trial has ended" : "Quiz limit reached"}
                  </div>
                  <div className="sq-error-sub">
                    {gateCode === "trial_expired"
                      ? "Your 14-day trial is over. Pick a plan to keep building quizzes and collecting leads."
                      : "You have reached the quiz limit on your current plan. Upgrade to create more."}
                  </div>
                  <a
                    href="/pricing"
                    className="sq-btn sq-btn-primary"
                    style={{ marginTop: 20, display: "inline-flex", textDecoration: "none" }}
                  >
                    {gateCode === "trial_expired" ? "Choose a plan - from $9/mo" : "Upgrade your plan"}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 6 }}><path d="M5 12h14M13 5l7 7-7 7"/></svg>
                  </a>
                </div>
              )}

              {stage === "error" && !gateCode && (
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
                {stage === "templates" && (
                  <button type="button" className="sq-btn sq-btn-ghost" onClick={() => { setStage("choose"); setSelectedTemplate(null); }}>Back</button>
                )}
                {stage === "site" && (
                  <button type="button" className="sq-btn sq-btn-ghost" onClick={() => setStage("choose")}>Back</button>
                )}
                {stage === "pick" && (
                  <button type="button" className="sq-btn sq-btn-ghost" onClick={() => setStage("site")}>Back</button>
                )}
                {stage === "error" && !gateCode && (
                  <button type="button" className="sq-btn sq-btn-ghost" onClick={() => setStage("pick")}>Back</button>
                )}

                {stage === "templates" && selectedTemplate && (
                  <button type="button" className="sq-btn sq-btn-primary" onClick={() => handleCreateFromTemplate(selectedTemplate)} disabled={submitting}>
                    {submitting ? "Creating..." : "Use this template"}
                    {!submitting && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>}
                  </button>
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
                {stage === "pick" && (
                  <button type="button" className="sq-btn sq-btn-primary" onClick={function() { if (pickChoice === 'ai') { handleGenerate(); } else { handleCreateFromTemplate(pickChoice); } }} disabled={isBusy}>
                    {submitting ? "Generating..." : "Generate this quiz"}
                  </button>
                )}
                {stage === "error" && !gateCode && (
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
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  animation: sq-fade 160ms ease-out;
  overflow: hidden;
  overscroll-behavior: contain;
}
@keyframes sq-fade { from { opacity: 0 } to { opacity: 1 } }
.sq-modal {
  max-height: 92vh;
  width: 100%;
  max-width: 960px;
  display: grid;
  grid-template-columns: 280px 1fr;
  grid-template-rows: minmax(0, 1fr);
  background: #FFFFFF;
  border: 1px solid #E4E3E0;
  border-radius: 20px;
  box-shadow: 0 30px 60px rgba(0,0,0,0.12);
  overflow: hidden;
  overscroll-behavior: contain;
  color: #1A1A1A;
  font-family: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  animation: sq-pop 180ms ease-out;
}
@keyframes sq-pop { from { transform: translateY(8px) scale(0.98); opacity: 0 } to { transform: none; opacity: 1 } }

.sq-side {
  background: #F0EFED;
  border-right: 1px solid #E4E3E0;
  padding: 22px 20px;
  display: flex;
  flex-direction: column;
  gap: 22px;
  overflow-y: auto;
}
.sq-brand { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 15px; letter-spacing: -0.01em; color: #1A1A1A; }
.sq-logo {
  width: 28px; height: 28px; border-radius: 8px;
  background: #0f7377; color: #FFFFFF;
  display: inline-flex; align-items: center; justify-content: center;
}
.sq-steps { display: flex; flex-direction: column; gap: 4px; }
.sq-step {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 13px; font-weight: 500;
  color: #6B6B6B;
  transition: background 120ms, color 120ms;
}
.sq-step-dot {
  width: 22px; height: 22px; border-radius: 50%;
  background: #E4E3E0;
  color: #6B6B6B;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700;
  border: 1px solid #E4E3E0;
}
.sq-step.is-active { background: rgba(13, 115, 119, 0.08); color: #1A1A1A; }
.sq-step.is-active .sq-step-dot { background: #0f7377; color: #FFFFFF; border-color: #0f7377; }
.sq-step.is-done { color: #1A1A1A; }
.sq-step.is-done .sq-step-dot { background: #ECF5F0; color: #2D6A4F; border-color: rgba(45,106,79,0.2); }
.sq-step-label { flex: 1; }

.sq-tip {
  margin-top: auto;
  padding: 14px;
  background: rgba(13, 115, 119, 0.06);
  border: 1px solid rgba(13, 115, 119, 0.15);
  border-radius: 12px;
  font-size: 12px;
  color: #6B6B6B;
  line-height: 1.5;
}
.sq-tip p { margin: 0; }
.sq-tip-title { color: #0f7377; font-weight: 700; font-size: 12px; letter-spacing: 0.02em; text-transform: uppercase; margin-bottom: 6px; }

.sq-main { display: flex; flex-direction: column; min-width: 0; min-height: 0; background: #FFFFFF; overflow: hidden; }
.sq-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 22px 28px 12px 28px;
}
.sq-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #6B6B6B; margin-bottom: 4px; }
.sq-title { margin: 0; font-size: 22px; line-height: 1.2; font-weight: 700; letter-spacing: -0.015em; color: #1A1A1A; }
.sq-close {
  width: 34px; height: 34px; border-radius: 10px;
  background: #F7F7F5; color: #6B6B6B;
  border: 1px solid #E4E3E0;
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 120ms;
}
.sq-close:hover { background: #EEEDE9; color: #1A1A1A; }

.sq-body { padding: 8px 28px 20px 28px; overflow-y: auto; min-height: 0; flex: 1; overscroll-behavior: contain; }
.sq-form { display: flex; flex-direction: column; gap: 14px; }
.sq-lead { margin: 0 0 6px 0; font-size: 14px; line-height: 1.55; color: #6B6B6B; }
.sq-label { font-size: 13px; font-weight: 600; color: #1A1A1A; }
.sq-muted { color: #6B6B6B; font-weight: 500; }

.sq-input-wrap { position: relative; }
.sq-input-icon {
  position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
  color: #6B6B6B; pointer-events: none;
  display: inline-flex;
}
.sq-input, .sq-textarea {
  width: 100%; box-sizing: border-box;
  background: #FFFFFF;
  border: 1px solid #E4E3E0;
  border-radius: 12px;
  padding: 12px 14px;
  color: #1A1A1A;
  font-size: 14px; font-family: inherit;
  outline: none;
  transition: border-color 120ms, box-shadow 120ms, background 120ms;
}
.sq-input { padding-left: 40px; }
.sq-textarea { resize: vertical; min-height: 80px; line-height: 1.5; }
.sq-input:focus, .sq-textarea:focus {
  border-color: #0f7377;
  box-shadow: 0 0 0 3px rgba(13, 115, 119, 0.15);
  background: #FFFFFF;
}
.sq-input::placeholder, .sq-textarea::placeholder { color: #9B9B9B; }

.sq-hint {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 12px; color: #6B6B6B;
  padding: 8px 12px;
  background: #F7F7F5;
  border: 1px solid #E4E3E0;
  border-radius: 10px;
  width: fit-content;
}
.sq-error {
  padding: 10px 14px;
  background: #FEF0F0;
  border: 1px solid rgba(197, 48, 48, 0.3);
  color: #C53030;
  border-radius: 10px;
  font-size: 13px;
}

.sq-loading {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 14px; padding: 48px 20px; text-align: center;
}
.sq-spinner {
  width: 36px; height: 36px; border-radius: 50%;
  border: 3px solid #E4E3E0; border-top-color: #0f7377;
  animation: sq-spin 0.9s linear infinite;
}
@keyframes sq-spin { to { transform: rotate(360deg) } }
.sq-loading-title { font-size: 15px; font-weight: 600; color: #1A1A1A; }
.sq-loading-sub { font-size: 13px; color: #6B6B6B; }

.sq-goals { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.sq-goal {
  text-align: left;
  padding: 14px;
  background: #FFFFFF;
  border: 1px solid #E4E3E0;
  border-radius: 14px;
  color: #1A1A1A;
  cursor: pointer;
  transition: all 120ms;
  font-family: inherit;
}
.sq-goal:hover { border-color: #0f7377; background: #F7F7F5; }
.sq-goal.is-selected {
  border-color: #0f7377;
  background: rgba(13, 115, 119, 0.04);
  box-shadow: 0 0 0 3px rgba(13, 115, 119, 0.12);
}
.sq-goal-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.sq-goal-label { font-weight: 600; font-size: 14px; color: #1A1A1A; }
.sq-goal-check {
  width: 20px; height: 20px; border-radius: 50%;
  background: #F7F7F5;
  color: transparent;
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid #E4E3E0;
  transition: all 120ms;
}
.sq-goal.is-selected .sq-goal-check { background: #0f7377; color: #FFFFFF; border-color: #0f7377; }
.sq-goal-hint { font-size: 12.5px; color: #6B6B6B; line-height: 1.5; }

.sq-review {
  display: flex; flex-direction: column;
  background: #F7F7F5;
  border: 1px solid #E4E3E0;
  border-radius: 14px;
  overflow: hidden;
}
.sq-review-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px;
  font-size: 13.5px;
  border-bottom: 1px solid #EEEDE9;
}
.sq-review-row:last-child { border-bottom: none; }
.sq-review-row span { color: #6B6B6B; }
.sq-review-row strong { color: #1A1A1A; font-weight: 600; }
.sq-brand-grid {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 12px; margin-top: 14px;
}
.sq-brand-field { display: flex; flex-direction: column; gap: 6px; }
.sq-brand-label {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px; color: #6B6B6B;
  letter-spacing: 0.02em; text-transform: uppercase;
}
.sq-brand-hint {
  font-style: normal; font-size: 10.5px;
  padding: 1px 7px; border-radius: 999px;
  background: #E8F4F4; color: #0f7377;
  letter-spacing: 0.04em;
}
.sq-brand-input {
  background: #FFFFFF; border: 1px solid #E4E3E0;
  border-radius: 10px; padding: 10px 12px;
  color: #1A1A1A; font-size: 13.5px;
  transition: border-color 120ms, box-shadow 120ms;
  font-family: inherit;
}
.sq-brand-input::placeholder { color: #9B9B9B; }
.sq-brand-input:focus {
  outline: none; border-color: #0f7377;
  box-shadow: 0 0 0 3px rgba(13, 115, 119, 0.15);
}
@media (max-width: 600px) {
  .sq-brand-grid { grid-template-columns: 1fr; }
}

.sq-error-block {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; padding: 40px 20px; text-align: center;
}
.sq-gate-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 60px; height: 60px; border-radius: 18px;
  background: rgba(13,115,119,0.08); margin-bottom: 4px;
}
.sq-goal-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #E8F4F4;
  color: #0f7377;
  margin-bottom: 12px;
}
.sq-goal.is-selected .sq-goal-icon {
  background: rgba(13, 115, 119, 0.18);
}
.sq-skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 8px;
}
.sq-skel {
  background: linear-gradient(90deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.08) 50%, rgba(0,0,0,0.04) 100%);
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
  background: #FEF0F0;
  color: #C53030;
  display: inline-flex; align-items: center; justify-content: center;
}
.sq-error-title { font-size: 16px; font-weight: 700; color: #1A1A1A; }
.sq-error-sub { font-size: 13.5px; color: #6B6B6B; max-width: 420px; line-height: 1.5; }

.sq-foot { border-top: 1px solid #E4E3E0; padding: 16px 28px 20px 28px; display: flex; flex-direction: column; gap: 12px; }
.sq-progress { height: 4px; background: #EEEDE9; border-radius: 999px; overflow: hidden; }
.sq-progress span { display: block; height: 100%; background: linear-gradient(90deg, #0f7377 0%, #0B6165 100%); border-radius: 999px; transition: width 220ms ease-out; }
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
  background: #0f7377; color: #FFFFFF;
}
.sq-btn-primary:hover:not(:disabled) { background: #0B6165; }
.sq-btn-ghost {
  background: transparent; color: #6B6B6B;
  border-color: #E4E3E0;
}
.sq-btn-ghost:hover:not(:disabled) { background: #F7F7F5; color: #1A1A1A; }

@media (max-width: 720px) {
  .sq-modal { grid-template-columns: 1fr; max-height: 96vh; }
  .sq-side { display: none; }
  .sq-goals { grid-template-columns: 1fr; }
}

.sq-sqsp-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; background: #ECF5F0; border: 1px solid rgba(45,106,79,0.3); color: #2D6A4F; font-size: 12px; font-weight: 600; margin-bottom: 14px; letter-spacing: 0.02em; }
.sq-ideas { margin: 0 0 16px; padding: 12px; border: 1px solid rgba(13,115,119,0.22); background: linear-gradient(135deg, rgba(13,115,119,0.04), rgba(11,97,101,0.04)); border-radius: 10px; }
.sq-ideas-label { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; letter-spacing: .02em; color: #0f7377; margin-bottom: 8px; text-transform: uppercase; }
.sq-ideas-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
.sq-idea { font: inherit; cursor: pointer; padding: 8px 12px; border-radius: 999px; border: 1px solid #E4E3E0; background: #FFFFFF; color: #1A1A1A; font-size: 13px; line-height: 1.2; transition: all .15s ease; text-align: left; }
.sq-idea:hover { border-color: rgba(13, 115, 119, 0.5); background: #E8F4F4; }
.sq-idea.is-selected { border-color: #0f7377; background: rgba(13, 115, 119, 0.08); color: #0B6165; font-weight: 600; }
.sq-ideas-input { font-size: 14px; }
.sq-style-pack {
  margin-top: 18px;
  padding: 16px;
  background: #F7F7F5;
  border: 1px solid #E4E3E0;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.sq-style-head { display: flex; flex-direction: column; gap: 4px; }
.sq-style-sub { font-size: 12px; color: #6B6B6B; }
.sq-style-body { display: grid; grid-template-columns: 180px 1fr; gap: 16px; align-items: stretch; }
.sq-swatches { display: flex; flex-direction: column; gap: 10px; }
.sq-swatch {
  display: flex; flex-direction: column; gap: 6px;
  padding: 10px 12px;
  background: #FFFFFF;
  border: 1px solid #E4E3E0;
  border-radius: 10px;
  cursor: pointer;
}
.sq-swatch-role { font-size: 10.5px; color: #6B6B6B; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 700; }
.sq-swatch-wrap { display: flex; align-items: center; gap: 8px; }
.sq-swatch-picker { display: inline-flex; cursor: pointer; flex-shrink: 0; }
.sq-swatch-input {
  appearance: none; -webkit-appearance: none;
  width: 34px; height: 34px; border-radius: 8px;
  padding: 0; border: 1px solid #E4E3E0; background: transparent;
  cursor: pointer; overflow: hidden;
}
.sq-swatch-input::-webkit-color-swatch-wrapper { padding: 0; border-radius: 7px; }
.sq-swatch-input::-webkit-color-swatch { border: none; border-radius: 7px; }
.sq-swatch-input::-moz-color-swatch { border: none; border-radius: 7px; }
.sq-swatch-text {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px; color: #1A1A1A; letter-spacing: 0.02em;
  background: #FFFFFF; border: 1px solid #E4E3E0; border-radius: 6px;
  padding: 5px 8px; width: 90px; outline: none;
  transition: border-color 120ms, box-shadow 120ms;
}
.sq-swatch-text:focus { border-color: #0f7377; box-shadow: 0 0 0 2px rgba(13,115,119,0.12); }
.sq-swatch-text::placeholder { color: #9B9B9B; }
.sq-preview {
  background: #F7F7F5;
  border: 1px solid #E4E3E0;
  border-radius: 12px;
  overflow: hidden;
  display: flex; flex-direction: column;
  min-height: 240px;
}
.sq-preview-chrome {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 12px;
  background: #EEEDE9;
  border-bottom: 1px solid #E4E3E0;
}
.sq-preview-dot { width: 8px; height: 8px; border-radius: 50%; background: #E4E3E0; }
.sq-preview-url { margin-left: 8px; font-size: 11px; color: #6B6B6B; }
.sq-preview-body { padding: 14px; display: flex; flex-direction: column; gap: 10px; }
.sq-preview-progress { height: 4px; border-radius: 999px; overflow: hidden; background: #E4E3E0; }
.sq-preview-progress span { display: block; height: 100%; border-radius: 999px; transition: background 120ms; }
.sq-preview-q { font-size: 13.5px; font-weight: 600; color: #1A1A1A; }
.sq-preview-opt {
  display: flex; align-items: center; justify-content: space-between;
  padding: 9px 12px;
  background: #FFFFFF;
  border: 1.5px solid #E4E3E0;
  border-radius: 10px;
  color: #6B6B6B; font-size: 12.5px;
  transition: border-color 120ms, box-shadow 120ms;
}
.sq-preview-opt.is-selected { color: #1A1A1A; }
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
  pointer-events: none;
  opacity: 0.85;
}
@media (max-width: 720px) {
  .sq-style-body { grid-template-columns: 1fr; }
}

/* Template picker styles */
.sq-tpl-filters {
  display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px;
}
.sq-tpl-filter {
  font: inherit; cursor: pointer;
  padding: 7px 14px; border-radius: 999px;
  border: 1px solid #E4E3E0; background: #FFFFFF;
  color: #6B6B6B; font-size: 13px; font-weight: 500;
  transition: all 0.15s ease;
}
.sq-tpl-filter:hover { border-color: #0f7377; color: #1A1A1A; }
.sq-tpl-filter.is-active {
  background: #0f7377; color: #FFFFFF; border-color: #0f7377; font-weight: 600;
}
.sq-tpl-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
}
@media (max-width: 600px) { .sq-tpl-grid { grid-template-columns: 1fr; } }
.sq-tpl-card {
  text-align: left; padding: 18px;
  background: #FFFFFF; border: 1px solid #E4E3E0;
  border-radius: 14px; cursor: pointer;
  font-family: inherit; transition: all 0.15s ease;
  display: flex; flex-direction: column; gap: 6px;
}
.sq-tpl-card:hover { border-color: #0f7377; background: #FAFFFE; }
.sq-tpl-card.is-selected {
  border-color: #0f7377; background: rgba(13,115,119,0.04);
  box-shadow: 0 0 0 3px rgba(13,115,119,0.12);
}
.sq-tpl-icon {
  width: 36px; height: 36px; border-radius: 10px;
  background: rgba(13,115,119,0.08); color: #0f7377;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 4px;
}
.sq-tpl-card.is-selected .sq-tpl-icon { background: rgba(13,115,119,0.15); }
.sq-tpl-cat {
  font-size: 11px; font-weight: 700; color: #0f7377;
  letter-spacing: 0.04em; text-transform: uppercase;
}
.sq-tpl-name { font-size: 15px; font-weight: 700; color: #1A1A1A; letter-spacing: -0.01em; }
.sq-tpl-desc { font-size: 13px; color: #6B6B6B; line-height: 1.5; }
.sq-tpl-audience { font-size: 11.5px; color: #9B9B9B; font-style: italic; margin-top: 2px; }
.sq-tpl-img {
  width: 100%; height: 100px; border-radius: 10px; overflow: hidden; margin-bottom: 4px;
  background: #F7F7F5;
}
.sq-tpl-img img {
  width: 100%; height: 100%; object-fit: cover; display: block;
  transition: transform 0.2s ease;
}
.sq-tpl-card:hover .sq-tpl-img img { transform: scale(1.03); }
.sq-tpl-meta {
  font-size: 11px; color: #9B9B9B; font-weight: 500; margin-top: 4px;
  display: flex; align-items: center; gap: 4px;
}
.sq-tpl-detail {
  margin-top: 14px; padding: 14px 16px;
  background: rgba(13,115,119,0.04); border: 1px solid rgba(13,115,119,0.15);
  border-radius: 12px;
}
.sq-tpl-detail-title { font-size: 12px; font-weight: 700; color: #0f7377; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px; }
.sq-tpl-detail-text { font-size: 13.5px; color: #1A1A1A; line-height: 1.55; }

/* ---- Pick stage: 3 visual quiz option cards (ConvertFlow style) ---- */
.sq-pick-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}
@media (max-width: 720px) {
  .sq-pick-grid { grid-template-columns: 1fr; }
}
.sq-pick-card {
  position: relative;
  display: flex;
  flex-direction: column;
  background: #FFFFFF;
  border: 2px solid #E4E3E0;
  border-radius: 16px;
  padding: 0;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition: all 0.18s ease;
  overflow: hidden;
}
.sq-pick-card:hover {
  border-color: #0f7377;
  box-shadow: 0 4px 20px rgba(13,115,119,0.10);
  transform: translateY(-2px);
}
.sq-pick-card.is-selected {
  border-color: #0f7377;
  box-shadow: 0 0 0 3px rgba(13,115,119,0.18), 0 4px 20px rgba(13,115,119,0.10);
}
.sq-pick-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.sq-pick-badge-ai {
  background: linear-gradient(135deg, #0f7377, #0B6165);
  color: #FFFFFF;
}
.sq-pick-badge-tpl {
  background: #F0EFED;
  color: #6B6B6B;
  border: 1px solid #E4E3E0;
}
.sq-pick-card.is-selected .sq-pick-badge-tpl {
  background: #E8F4F4;
  color: #0f7377;
  border-color: rgba(13,115,119,0.25);
}

/* Phone mockup inside each card */
.sq-pick-phone {
  position: relative;
  margin: 36px 14px 0 14px;
  background: #F7F7F5;
  border: 1px solid #E4E3E0;
  border-radius: 20px 20px 0 0;
  overflow: hidden;
  aspect-ratio: auto;
}
.sq-pick-notch {
  width: 80px;
  height: 6px;
  border-radius: 3px;
  background: #E4E3E0;
  margin: 8px auto 6px;
}
.sq-pick-screen {
  padding: 6px 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sq-pick-pbar {
  height: 3px;
  background: #EEEDE9;
  border-radius: 999px;
  overflow: hidden;
}
.sq-pick-pbar span {
  display: block;
  height: 100%;
  border-radius: 999px;
}
.sq-pick-qtext {
  font-size: 11px;
  font-weight: 700;
  color: #1A1A1A;
  line-height: 1.3;
  min-height: 28px;
}
.sq-pick-opts {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.sq-pick-opt {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 8px;
  background: #FFFFFF;
  border: 1.5px solid #E4E3E0;
  border-radius: 8px;
  font-size: 10px;
  color: #6B6B6B;
  transition: border-color 0.12s;
}
.sq-pick-opt.is-active {
  color: #1A1A1A;
  font-weight: 600;
}
.sq-pick-radio {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1.5px solid #E4E3E0;
  flex-shrink: 0;
}
.sq-pick-opt.is-active .sq-pick-radio {
  border: none;
}
.sq-pick-cta {
  margin-top: 4px;
  padding: 6px 14px;
  border-radius: 8px;
  color: #FFFFFF;
  font-size: 10px;
  font-weight: 700;
  text-align: center;
  opacity: 0.85;
}

/* Info area below phone */
.sq-pick-info {
  padding: 14px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}
.sq-pick-name {
  font-size: 14px;
  font-weight: 700;
  color: #1A1A1A;
  letter-spacing: -0.01em;
}
.sq-pick-desc {
  font-size: 12px;
  color: #6B6B6B;
  line-height: 1.45;
}

/* Selection checkmark */
.sq-pick-check {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #EEEDE9;
  color: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #E4E3E0;
  transition: all 0.15s ease;
}
.sq-pick-card.is-selected .sq-pick-check {
  background: #0f7377;
  color: #FFFFFF;
  border-color: #0f7377;
}
`;
