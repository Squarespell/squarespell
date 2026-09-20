import type { ReactNode } from 'react';

// The five AI generation modes that exist in backend/src/services/claudeService.ts
// (lead quiz, price calculator, service recommender, client qualifier, segmentation).
// The demo scenes are illustrative interface mock-ups, not customer data.
export interface QuizMode {
  label: string;
  title: string;
  body: string;
  demo: ReactNode;
}

export const QUIZ_MODES: QuizMode[] = [
  {
    label: "Lead quiz",
    title: "Turn curiosity into a scored lead.",
    body: "Use answer scores and outcomes to understand intent, collect contact details and send the right follow-up.",
    demo: (
      <><div className="mode-demo-head"><span>LEAD SCORE</span><span>Question 3 of 5</span></div><h4>How soon do you want to get started?</h4><div className="answer-row active"><span>Within the next 30 days</span><span>+30</span></div><div className="answer-row"><span>In 1 to 3 months</span><span>+20</span></div><div className="answer-row"><span>I am still exploring</span><span>+5</span></div><div className="mode-result"><div className="result-chip">Current score<strong>84</strong></div><div className="result-chip">Lead tier<strong>High</strong></div></div></>
    ),
  },
  {
    label: "Price calculator",
    title: "Give visitors a useful estimate.",
    body: "Add price values to selections, calculate the result on the server and route the visitor to a quote or next step.",
    demo: (
      <><div className="mode-demo-head"><span>PROJECT ESTIMATOR</span><span>Live total</span></div><h4>Choose the support you need.</h4><div className="answer-row active"><span>Brand strategy</span><span>$1,200</span></div><div className="answer-row active"><span>Website design</span><span>$2,800</span></div><div className="answer-row"><span>Launch support</span><span>$650</span></div><div className="mode-result"><div className="result-chip">Estimate<strong>$4,000</strong></div><div className="result-chip">Next step<strong>Request quote</strong></div></div></>
    ),
  },
  {
    label: "Service recommender",
    title: "Match each visitor to the right offer.",
    body: "Map answers to services or products, then show a specific result page with a CTA, booking link or purchase path.",
    demo: (
      <><div className="mode-demo-head"><span>SERVICE MATCH</span><span>Result</span></div><h4>Your best fit: The Strategy Sprint</h4><p style={{fontSize: "10px", lineHeight: "1.7", color: "#64706c"}}>You have a clear offer and need a sharper position before investing in a full identity.</p><div className="meter"><i style={{width: "88%"}}></i></div><div className="mode-result"><div className="result-chip">Match strength<strong>88%</strong></div><div className="result-chip">CTA<strong>Book intro</strong></div></div></>
    ),
  },
  {
    label: "Client qualifier",
    title: "Know who is ready before the call.",
    body: "Ask about budget, timeline and fit. Route qualified leads to sales and send everyone else to a useful alternative.",
    demo: (
      <><div className="mode-demo-head"><span>QUALIFICATION</span><span>3 signals found</span></div><h4>Fit summary</h4><div className="answer-row active"><span>Budget</span><span>Qualified</span></div><div className="answer-row active"><span>Timeline</span><span>Ready now</span></div><div className="answer-row"><span>Service fit</span><span>Brand + Web</span></div><div className="mode-result"><div className="result-chip">Priority<strong>High</strong></div><div className="result-chip">Route<strong>Calendar</strong></div></div></>
    ),
  },
  {
    label: "Segmentation quiz",
    title: "Tag people by what they tell you.",
    body: "Group visitors by goals, interests or behavior, then use those tags in email campaigns and automation.",
    demo: (
      <><div className="mode-demo-head"><span>AUDIENCE SEGMENT</span><span>Live tags</span></div><h4>What are you focused on this quarter?</h4><div className="answer-row active"><span>Generate more leads</span><span>growth</span></div><div className="answer-row"><span>Improve conversion</span><span>conversion</span></div><div className="answer-row"><span>Automate follow-up</span><span>automation</span></div><div className="mode-result"><div className="result-chip">Segment<strong>Growth</strong></div><div className="result-chip">Sequence<strong>Nurture 02</strong></div></div></>
    ),
  },
];
