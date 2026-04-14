/**
 * Lightweight Embed Route
 *
 * This is a minimal, SSR-rendered quiz page optimized for embedding in iframes.
 * It fetches quiz data server-side and renders a clean quiz interface with zero
 * Clerk/Supabase/auth overhead.
 *
 * Key features:
 * - Server-side quiz data fetching
 * - No Clerk provider or authentication
 * - Minimal CSS-in-JS to keep bundle small
 * - Client-side handles: answer selection, form submission, postMessage to parent
 * - Uses quiz branding (colors, fonts) from the quiz data or query params
 * - Container queries for responsive embed sizing
 *
 * Usage:
 *   squarespell.com/embed/quiz-slug
 *   quiz.squarespell.com/embed/quiz-slug?bg=#fff&fg=#000&accent=#0a0a0a&font=Inter
 */

import { Suspense } from 'react';
import EmbedQuizClient from './EmbedQuizClient';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

interface QuizOption {
  id: string;
  text: string;
  score?: number;
}

interface QuizQuestion {
  id: string;
  text?: string;
  question?: string;
  subtitle?: string;
  options: QuizOption[];
}

interface QuizOutcome {
  id: string;
  title: string;
  description: string;
  ctaText?: string;
  ctaUrl?: string;
  minScore?: number;
  maxScore?: number;
}

interface QuizBranding {
  colors?: Record<string, string>;
  font_family?: string;
  site_name?: string;
}

interface Quiz {
  id: string;
  slug: string;
  title: string;
  description?: string;
  questions: QuizQuestion[];
  outcomes?: QuizOutcome[];
  results?: QuizOutcome[];
  branding?: QuizBranding;
  settings?: {
    primary_color?: string;
    primaryColor?: string;
    cta_text?: string;
    cta_url?: string;
    show_branding?: boolean;
    requireEmail?: boolean;
  };
  leadGate?: { headline?: string; subtext?: string; buttonText?: string };
}

async function fetchQuiz(slug: string): Promise<Quiz | null> {
  try {
    const res = await fetch(`${API}/api/quiz/${slug}`, {
      cache: 'no-cache',
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}



function ErrorView() {
  return (
    <div style={{ minHeight: '100svh', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', system-ui, sans-serif", color: '#1a1a1a', padding: 24, textAlign: 'center' }}>
      <div style={{ maxWidth: 340 }}>
        <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Quiz not found</p>
        <p style={{ fontSize: 13, opacity: 0.6 }}>This quiz may have been removed or is not yet published.</p>
      </div>
    </div>
  );
}

export default async function EmbedPage({ params }: { params: { slug: string } }) {
  const quiz = await fetchQuiz(params.slug);

  if (!quiz) {
    return <ErrorView />;
  }

  // Derive branding from quiz settings (matches the main /quiz/[slug] logic)
  const brand = quiz.branding;
  const brandBg = brand?.colors?.background || '#ffffff';
  const brandText = brand?.colors?.text || '#1a1a1a';
  const brandPrimary =
    brand?.colors?.primary || quiz.settings?.primary_color || quiz.settings?.primaryColor || '#0a0a0a';
  const brandFont =
    brand?.font_family && brand.font_family !== 'sans-serif'
      ? `'${brand.font_family}', system-ui, sans-serif`
      : "'Inter', system-ui, sans-serif";

  return (
    <Suspense fallback={<ErrorView />}>
      <EmbedQuizClient
        quiz={quiz}
        brandBg={brandBg}
        brandText={brandText}
        brandPrimary={brandPrimary}
        brandFont={brandFont}
      />
    </Suspense>
  );
}
