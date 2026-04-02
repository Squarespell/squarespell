'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import QuizRunner from '@/components/quiz-taker/QuizRunner';
export default function QuizPage({ params }: { params: { slug: string } }) {
  const [quiz, setQuiz] = useState<any>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api.getPublicQuiz(params.slug).then(data => {
      if (data.error) setError(data.error); else setQuiz(data);
      api.trackEvent(params.slug, { event_type: 'view', session_id: crypto.randomUUID() });
    }).catch(() => setError('Quiz not found'));
  }, [params.slug]);
  if (error) return <div style={{ padding: 40, color: '#e8f5c8', background: '#0a0f05', minHeight: '100vh' }}>{error}</div>;
  if (!quiz) return <div style={{ padding: 40, color: '#e8f5c8', background: '#0a0f05', minHeight: '100vh' }}>Loading...</div>;
  return <QuizRunner quiz={quiz} slug={params.slug} />;
}
