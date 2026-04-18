import type { Metadata } from 'next';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';
const APP_URL = 'https://app.squarespell.com';

interface QuizMeta {
  title?: string;
  description?: string;
  branding?: { site_name?: string; colors?: Record<string, string> };
}

async function fetchQuizMeta(slug: string): Promise<QuizMeta | null> {
  try {
    const res = await fetch(`${API}/api/quiz/${slug}`, {
      next: { revalidate: 300 },
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const quiz = await fetchQuizMeta(params.slug);

  const title = quiz?.title
    ? `${quiz.title} - Squarespell`
    : 'Quiz - Squarespell';
  const description =
    quiz?.description || 'Take this interactive quiz powered by Squarespell.';
  const url = `${APP_URL}/quiz/${params.slug}`;
  const siteName = quiz?.branding?.site_name || 'Squarespell';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName,
      type: 'website',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: url,
    },
  };
}

export default function QuizLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
