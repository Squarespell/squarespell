/**
 * Deterministic 10-question fallback quiz matching prototype-v4 exactly.
 * Used when Claude's tailored-quiz generation fails so the user is never blocked.
 * Per product decision (Q5): silent fallback, never block the funnel.
 *
 * Keep this file byte-identical to the prototype-v4 quiz array. If product
 * wants a different default quiz, update prototype-v4.html and this file together.
 */
export const FALLBACK_QUIZ = {
  title: 'Find Your Perfect Wellness Routine',
  description: 'Take this quick quiz to get a personalized recommendation.',
  questions: [
    {
      id: 'q1', type: 'single', subtitle: '',
      text: "What's your biggest wellness challenge right now?",
      options: [
        { id: 'a', text: "I can't stay consistent with routines", score: 3 },
        { id: 'b', text: 'Stress is running the show', score: 2 },
        { id: 'c', text: 'My energy crashes by 2pm every day', score: 2 },
        { id: 'd', text: "I don't know where to start", score: 1 },
      ],
    },
    {
      id: 'q2', type: 'single', subtitle: '',
      text: 'How much time can you realistically commit per day?',
      options: [
        { id: 'a', text: '5 minutes, being honest', score: 1 },
        { id: 'b', text: '15 to 20 minutes in the morning', score: 2 },
        { id: 'c', text: '30+ minutes, ready to go deep', score: 3 },
        { id: 'd', text: 'It varies a lot week to week', score: 1 },
      ],
    },
    {
      id: 'q3', type: 'single', subtitle: '',
      text: 'What matters most in your ideal routine?',
      options: [
        { id: 'a', text: 'Mental clarity and focus', score: 2 },
        { id: 'b', text: 'Physical strength and energy', score: 2 },
        { id: 'c', text: 'Better sleep and recovery', score: 2 },
        { id: 'd', text: 'Emotional balance', score: 2 },
      ],
    },
    {
      id: 'q4', type: 'single', subtitle: '',
      text: 'How do you usually start your day?',
      options: [
        { id: 'a', text: 'Phone in bed for 20 minutes', score: 0 },
        { id: 'b', text: 'Coffee and straight to work', score: 1 },
        { id: 'c', text: 'Light stretching or movement', score: 3 },
        { id: 'd', text: 'Totally different every day', score: 1 },
      ],
    },
    {
      id: 'q5', type: 'single', subtitle: '',
      text: 'Which sounds most like you right now?',
      options: [
        { id: 'a', text: 'I want structure and a clear plan', score: 3 },
        { id: 'b', text: 'I want flexibility, no rigid rules', score: 2 },
        { id: 'c', text: 'I want accountability from a coach', score: 2 },
        { id: 'd', text: 'I want to experiment on my own', score: 1 },
      ],
    },
    {
      id: 'q6', type: 'single', subtitle: '',
      text: 'What have you tried before?',
      options: [
        { id: 'a', text: 'A bunch of apps and none stuck', score: 1 },
        { id: 'b', text: 'Personal trainer or coach', score: 2 },
        { id: 'c', text: 'Reading books on my own', score: 2 },
        { id: 'd', text: 'Nothing yet, starting fresh', score: 0 },
      ],
    },
    {
      id: 'q7', type: 'single', subtitle: '',
      text: "What's your biggest obstacle?",
      options: [
        { id: 'a', text: 'Finding the time', score: 2 },
        { id: 'b', text: 'Staying motivated', score: 2 },
        { id: 'c', text: 'Knowing what actually works', score: 2 },
        { id: 'd', text: 'Money and budget', score: 1 },
      ],
    },
    {
      id: 'q8', type: 'single', subtitle: '',
      text: 'How do you measure progress?',
      options: [
        { id: 'a', text: 'How I feel day to day', score: 2 },
        { id: 'b', text: 'Numbers and metrics', score: 3 },
        { id: 'c', text: 'Sticking to the habit', score: 2 },
        { id: 'd', text: 'Feedback from others', score: 1 },
      ],
    },
    {
      id: 'q9', type: 'single', subtitle: '',
      text: 'Which outcome sounds best to you?',
      options: [
        { id: 'a', text: 'Calmer, more present life', score: 2 },
        { id: 'b', text: 'Stronger, more energetic body', score: 2 },
        { id: 'c', text: 'Deep, restful sleep', score: 2 },
        { id: 'd', text: 'Clear mind and better focus', score: 2 },
      ],
    },
    {
      id: 'q10', type: 'single', subtitle: '',
      text: 'When do you want to start?',
      options: [
        { id: 'a', text: 'Today, right now', score: 3 },
        { id: 'b', text: 'This week', score: 2 },
        { id: 'c', text: 'This month', score: 1 },
        { id: 'd', text: 'Still figuring it out', score: 0 },
      ],
    },
  ],
  outcomes: [
    {
      id: 'r1',
      title: 'The Mindful Reset',
      description: 'A calm, consistent morning practice that builds slowly without burning you out. Start small and grow.',
      minScore: 0, maxScore: 8,
      ctaText: 'Start the reset',
      ctaUrl: '',
    },
    {
      id: 'r2',
      title: 'The Energy Rebuild',
      description: 'A structured routine focused on physical strength, energy, and consistent movement throughout the day.',
      minScore: 9, maxScore: 15,
      ctaText: 'Build my energy',
      ctaUrl: '',
    },
    {
      id: 'r3',
      title: 'The Deep Recovery',
      description: 'A plan centered on restorative sleep, better recovery, and emotional balance for busy lives.',
      minScore: 16, maxScore: 21,
      ctaText: 'Get my plan',
      ctaUrl: '',
    },
    {
      id: 'r4',
      title: 'The Clarity System',
      description: 'A focused system for mental clarity, decision-making, and long-term consistency you can actually keep.',
      minScore: 22, maxScore: 100,
      ctaText: 'Unlock clarity',
      ctaUrl: '',
    },
  ],
  leadGate: {
    headline: 'Your result is ready',
    subtext: 'Enter your email to see it',
    buttonText: 'Show my result',
  },
  settings: {
    primaryColor: '#D2FF1D',
    showProgressBar: true,
    requireEmail: true,
  },
};

/**
 * Returns a deep clone of the fallback quiz with the primary color
 * optionally overridden from a scraped brand.
 */
export function buildFallbackQuiz(primaryColor?: string) {
  const clone = JSON.parse(JSON.stringify(FALLBACK_QUIZ));
  if (primaryColor) clone.settings.primaryColor = primaryColor;
  return clone;
}
