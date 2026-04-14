"use client";

/**
 * NewQuizModal v2
 *
 * Premium 3-stage quiz creation sheet for Squarespell.
 *
 * Stages:
 *   1. Site        : URL input + optional context textarea
 *   2. Goal        : 2x2 tile picker (Capture / Recommend / Score / Grow)
 *   3. Review      : Detected Business / Audience / Tone / Offer with inline edit
 *
 * Project rules (hard):
 *   - No emoji icons. All icons are inline SVG.
 *   - No em-dashes. Colon, period, comma, or ASCII hyphen only.
 *   - Apply both rules to every file touched.
 *
 * Brand tokens (indigo / violet premium):
 *   primary   : indigo-600 / indigo-500
 *   accent    : violet-500
 *   surface   : white / slate-50
 *   ink       : slate-900 / slate-600 / slate-400
 *   border    : slate-200
 *   focus     : indigo-500 ring
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createQuizFromUrl } from "./quizTemplates";

type Stage = "site" | "loading" | "goal" | "review" | "error";

type GoalKey = "capture" | "recommend" | "score" | "grow";

type ScrapedBrand = {
  businessType: string;
  audience: string;
  tone: string;
  keyOffer: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: (quizId: string) => void;
};

const GOALS: Array<{
  key: GoalKey;
  title: string;
  blurb: string;
  Icon: (props: { className?: string }) => JSX.Element;
}> = [
  {
    key: "capture",
    title: "Capture leads",
    blurb: "Turn visitors into qualified email subscribers.",
    Icon: IconTarget,
  },
  {
    key: "recommend",
    title: "Recommend a product",
    blurb: "Match shoppers to the right product in under a minute.",
    Icon: IconSparkle,
  },
  {
    key: "score",
    title: "Score and segment",
    blurb: "Assess readiness and route to the right next step.",
    Icon: IconChart,
  },
  {
    key: "grow",
    title: "Grow email list",
    blurb: "Offer a personalized result in exchange for an email.",
    Icon: IconEnvelope,
  },
];

export default function NewQuizModal({ open, onClose, onCreated }: Props) {
  const [stage, setStage] = useState<Stage>("site");
  const [url, setUrl] = useState("");
  const [context, setContext] = useState("");
  const [goal, setGoal] = useState<GoalKey | null>(null);
  const [brand, setBrand] = useState<ScrapedBrand | null>(null);
  const [editingField, setEditingField] = useState<keyof ScrapedBrand | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const urlRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStage("site");
    setUrl("");
    setContext("");
    setGoal(null);
    setBrand(null);
    setEditingField(null);
    setError(null);
    setSubmitting(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => urlRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open, stage]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const urlValid = useMemo(() => {
    try {
      const u = new URL(url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`);
      return Boolean(u.hostname && u.hostname.includes("."));
    } catch {
      return false;
    }
  }, [url]);

  const stepIndex = stage === "site" || stage === "loading" ? 1 : stage === "goal" ? 2 : 3;

  const advanceToGoal = () => {
    if (!urlValid) return;
    setStage("goal");
  };

  const runScrape = async () => {
    setStage("loading");
    setError(null);
    try {
      const res = await fetch("/api/brand/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizeUrl(url), context }),
      });
      if (!res.ok) throw new Error(`Scrape failed with status ${res.status}`);
      const data = (await res.json()) as Partial<ScrapedBrand>;
      setBrand({
        businessType: data.businessType || "Small business",
        audience: data.audience || "Website visitors",
        tone: data.tone || "Friendly and professional",
        keyOffer: data.keyOffer || "Your core product or service",
      });
      setStage("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not read that site. Try another URL.");
      setStage("error");
    }
  };

  const handlePickGoal = (key: GoalKey) => {
    setGoal(key);
  };

  const handleContinueFromGoal = () => {
    if (!goal) return;
    void runScrape();
  };

  const handleGenerate = async () => {
    if (!goal || !brand) return;
    setSubmitting(true);
    try {
      const quiz = await createQuizFromUrl({
        url: normalizeUrl(url),
        context,
        goal,
        brand,
      });
      onCreated?.(quiz.id);
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create quiz.");
      setStage("error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="newquiz-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        {/* Sidebar */}
        <aside className="hidden w-64 flex-shrink-0 flex-col justify-between bg-slate-50 p-6 md:flex">
          <div>
            <div className="mb-8 flex items-center gap-2">
              <LogoMark className="h-8 w-8" />
              <span className="text-sm font-semibold tracking-tight text-slate-900">Squarespell</span>
            </div>
            <nav className="space-y-1">
              <SidebarStep index={1} label="Your site" active={stepIndex === 1} done={stepIndex > 1} />
              <SidebarStep index={2} label="Your goal" active={stepIndex === 2} done={stepIndex > 2} />
              <SidebarStep index={3} label="Review and generate" active={stepIndex === 3} done={false} />
            </nav>
          </div>
          <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-indigo-600">
              <IconSparkle className="h-4 w-4" />
              Premium quiz engine
            </div>
            <p className="text-xs leading-5 text-slate-600">
              We pull your brand, audience, and offer from your live site so your first quiz already sounds like you.
            </p>
          </div>
        </aside>

        {/* Content */}
        <section className="relative flex min-h-[560px] flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-slate-100 px-8 py-4">
            <div>
              <h2 id="newquiz-title" className="text-lg font-semibold tracking-tight text-slate-900">
                {stage === "site" || stage === "loading"
                  ? "Let's build your quiz"
                  : stage === "goal"
                  ? "What is this quiz for?"
                  : stage === "review"
                  ? "Review your brand details"
                  : "Something went wrong"}
              </h2>
              <p className="text-xs text-slate-500">Step {stepIndex} of 3</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Close"
            >
              <IconClose className="h-5 w-5" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-8 py-8">
            {stage === "site" && (
              <StageSite
                url={url}
                setUrl={setUrl}
                context={context}
                setContext={setContext}
                urlValid={urlValid}
                urlRef={urlRef}
                onContinue={advanceToGoal}
              />
            )}
            {stage === "goal" && (
              <StageGoal
                selected={goal}
                onSelect={handlePickGoal}
              />
            )}
            {stage === "loading" && <StageLoading url={url} />}
            {stage === "review" && brand && (
              <StageReview
                brand={brand}
                setBrand={setBrand}
                editingField={editingField}
                setEditingField={setEditingField}
              />
            )}
            {stage === "error" && (
              <StageError message={error} onRetry={() => setStage("site")} />
            )}
          </div>

          <footer className="flex items-center justify-between gap-4 border-t border-slate-100 bg-slate-50 px-8 py-4">
            <ProgressBar step={stepIndex} total={3} />
            <div className="flex items-center gap-2">
              {stage !== "site" && stage !== "loading" && (
                <button
                  type="button"
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-900"
                  onClick={() => {
                    if (stage === "goal") setStage("site");
                    else if (stage === "review") setStage("goal");
                    else if (stage === "error") reset();
                  }}
                >
                  Back
                </button>
              )}
              {stage === "site" && (
                <PrimaryButton disabled={!urlValid} onClick={advanceToGoal}>
                  Continue
                </PrimaryButton>
              )}
              {stage === "goal" && (
                <PrimaryButton disabled={!goal} onClick={handleContinueFromGoal}>
                  Continue
                </PrimaryButton>
              )}
              {stage === "review" && (
                <PrimaryButton disabled={submitting} onClick={handleGenerate}>
                  {submitting ? "Generating..." : "Generate quiz"}
                </PrimaryButton>
              )}
            </div>
          </footer>
        </section>
      </div>
    </div>
  );
}

/* ---------- Stage components ---------- */

function StageSite({
  url,
  setUrl,
  context,
  setContext,
  urlValid,
  urlRef,
  onContinue,
}: {
  url: string;
  setUrl: (v: string) => void;
  context: string;
  setContext: (v: string) => void;
  urlValid: boolean;
  urlRef: React.RefObject<HTMLInputElement>;
  onContinue: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl">
      <h3 className="mb-2 text-2xl font-semibold tracking-tight text-slate-900">
        Paste your site and we do the rest
      </h3>
      <p className="mb-8 text-sm text-slate-600">
        We read your homepage to pick up your tone, audience, and offer. You can edit everything before we generate.
      </p>

      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
        Your site URL
      </label>
      <div className="relative mb-6">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
          <IconGlobe className="h-5 w-5" />
        </span>
        <input
          ref={urlRef}
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && urlValid) onContinue();
          }}
          placeholder="yourbrand.com"
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-base text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
        />
      </div>

      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
        Anything else we should know
        <span className="ml-1 font-normal normal-case text-slate-400">(optional)</span>
      </label>
      <textarea
        value={context}
        onChange={(e) => setContext(e.target.value)}
        rows={4}
        placeholder="Who is your ideal customer. What is the one thing you want people to walk away with."
        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
      />

      <div className="mt-6 flex items-center gap-2 text-xs text-slate-500">
        <IconLock className="h-4 w-4" />
        We only read public pages. Nothing is saved until you click Generate.
      </div>
    </div>
  );
}

function StageGoal({
  selected,
  onSelect,
}: {
  selected: GoalKey | null;
  onSelect: (k: GoalKey) => void;
}) {
  return (
    <div>
      <h3 className="mb-2 text-2xl font-semibold tracking-tight text-slate-900">
        What is this quiz for?
      </h3>
      <p className="mb-8 text-sm text-slate-600">
        Pick the one outcome that matters most. We will tune the questions and the final screen for it.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {GOALS.map(({ key, title, blurb, Icon }) => {
          const active = selected === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              className={[
                "group relative flex flex-col items-start rounded-2xl border bg-white p-6 text-left transition",
                active
                  ? "border-indigo-500 bg-indigo-50/40 ring-4 ring-indigo-500/10"
                  : "border-slate-200 hover:border-slate-300 hover:shadow-sm",
              ].join(" ")}
            >
              <span
                className={[
                  "mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl transition",
                  active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 group-hover:bg-slate-200",
                ].join(" ")}
              >
                <Icon className="h-6 w-6" />
              </span>
              <span className="mb-1 text-base font-semibold text-slate-900">{title}</span>
              <span className="text-sm leading-5 text-slate-600">{blurb}</span>
              {active && (
                <span className="absolute right-4 top-4 inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white">
                  <IconCheck className="h-3 w-3" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StageLoading({ url }: { url: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-12 text-center">
      <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
        <IconSpinner className="h-7 w-7 animate-spin" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-slate-900">Reading your site</h3>
      <p className="text-sm text-slate-600">
        Pulling brand voice and audience cues from <span className="font-medium text-slate-900">{prettyHost(url)}</span>. This takes about ten seconds.
      </p>
      <div className="mt-8 w-full space-y-3">
        <Skeleton />
        <Skeleton className="w-5/6" />
        <Skeleton className="w-4/6" />
      </div>
    </div>
  );
}

function StageReview({
  brand,
  setBrand,
  editingField,
  setEditingField,
}: {
  brand: ScrapedBrand;
  setBrand: (b: ScrapedBrand) => void;
  editingField: keyof ScrapedBrand | null;
  setEditingField: (f: keyof ScrapedBrand | null) => void;
}) {
  const fields: Array<{ key: keyof ScrapedBrand; label: string; hint: string }> = [
    { key: "businessType", label: "Business type", hint: "What you sell and how you sell it" },
    { key: "audience", label: "Audience", hint: "Who buys from you" },
    { key: "tone", label: "Tone", hint: "How your brand talks" },
    { key: "keyOffer", label: "Key offer", hint: "The one thing to highlight" },
  ];
  return (
    <div>
      <h3 className="mb-2 text-2xl font-semibold tracking-tight text-slate-900">
        Does this look right?
      </h3>
      <p className="mb-8 text-sm text-slate-600">
        Edit anything that is off. We use these four inputs to draft your questions, answers, and result screens.
      </p>
      <ul className="space-y-3">
        {fields.map(({ key, label, hint }) => (
          <li
            key={key}
            className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {label}
                  </span>
                  <span className="text-xs text-slate-400">{hint}</span>
                </div>
                {editingField === key ? (
                  <input
                    autoFocus
                    value={brand[key]}
                    onChange={(e) => setBrand({ ...brand, [key]: e.target.value })}
                    onBlur={() => setEditingField(null)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === "Escape") setEditingField(null);
                    }}
                    className="w-full rounded-lg border border-indigo-500 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                  />
                ) : (
                  <p className="text-sm text-slate-900">{brand[key]}</p>
                )}
              </div>
              {editingField !== key && (
                <button
                  type="button"
                  onClick={() => setEditingField(key)}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                  aria-label={`Edit ${label}`}
                >
                  <IconPencil className="h-3.5 w-3.5" />
                  Edit
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StageError({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-12 text-center">
      <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
        <IconAlert className="h-7 w-7" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-slate-900">We hit a snag</h3>
      <p className="mb-6 text-sm text-slate-600">{message || "Something went wrong."}</p>
      <PrimaryButton onClick={onRetry}>Try again</PrimaryButton>
    </div>
  );
}

/* ---------- Shared UI ---------- */

function PrimaryButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/30 disabled:cursor-not-allowed disabled:bg-slate-300"
    >
      {children}
      <IconChevronRight className="h-4 w-4" />
    </button>
  );
}

function SidebarStep({
  index,
  label,
  active,
  done,
}: {
  index: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div
      className={[
        "flex items-center gap-3 rounded-lg px-3 py-2 transition",
        active ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" : "text-slate-500",
      ].join(" ")}
    >
      <span
        className={[
          "inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold",
          done ? "bg-indigo-600 text-white" : active ? "bg-indigo-100 text-indigo-700" : "bg-slate-200 text-slate-600",
        ].join(" ")}
      >
        {done ? <IconCheck className="h-3 w-3" /> : index}
      </span>
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = Math.round((step / total) * 100);
  return (
    <div className="flex w-48 items-center gap-3">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-indigo-600 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium text-slate-500">
        {step}/{total}
      </span>
    </div>
  );
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`h-3 animate-pulse rounded bg-slate-200 ${className || "w-full"}`} />;
}

/* ---------- Helpers ---------- */

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
}

function prettyHost(input: string): string {
  try {
    return new URL(normalizeUrl(input)).hostname.replace(/^www\./, "");
  } catch {
    return input;
  }
}

/* ---------- Inline SVG icons (no emoji, ever) ---------- */

function IconGlobe({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18" />
    </svg>
  );
}
function IconTarget({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}
function IconSparkle({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.8 4.6L18 9.5l-4.2 1.9L12 16l-1.8-4.6L6 9.5l4.2-1.9L12 3z" />
      <path d="M19 15l.7 1.7L21 17.5l-1.3.8L19 20l-.7-1.7L17 17.5l1.3-.8L19 15z" />
    </svg>
  );
}
function IconChart({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-8" />
      <path d="M22 20H2" />
    </svg>
  );
}
function IconEnvelope({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}
function IconClose({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6l-12 12" />
    </svg>
  );
}
function IconCheck({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}
function IconChevronRight({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
function IconPencil({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h4l10-10-4-4L4 16v4z" />
      <path d="M14 6l4 4" />
    </svg>
  );
}
function IconSpinner({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M21 12a9 9 0 11-9-9" />
    </svg>
  );
}
function IconAlert({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l10 18H2L12 3z" />
      <path d="M12 10v5" />
      <circle cx="12" cy="18" r="1" fill="currentColor" />
    </svg>
  );
}
function IconLock({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 118 0v3" />
    </svg>
  );
}
function LogoMark({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none">
      <defs>
        <linearGradient id="ss-logo" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="28" height="28" rx="8" fill="url(#ss-logo)" />
      <path d="M10 20c0 1.5 2 2.5 5 2.5s5-1 5-2.5c0-3-10-2.5-10-5.5 0-1.5 2-2.5 4.5-2.5s4.5 1 4.5 2.5" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export { NewQuizModal };
