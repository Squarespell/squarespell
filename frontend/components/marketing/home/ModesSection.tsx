'use client';

import { useState } from 'react';
import { QUIZ_MODES } from './modes';

export function ModesSection() {
  const [active, setActive] = useState(0);
  const mode = QUIZ_MODES[active];

  const tabs = QUIZ_MODES.map((m, i) => (
    <button key={m.label} type="button" className="mode-tab" data-mode={i} aria-pressed={i === active} onClick={() => setActive(i)}>
      <span className="num">{String(i + 1).padStart(2, '0')}</span>
      <strong>{m.label}</strong>
      <span>↗</span>
    </button>
  ));

  const current = (
    <>
      <span className="mode-label">{mode.label}</span>
      <h3>{mode.title}</h3>
      <p>{mode.body}</p>
      <div className="mode-demo" key={active}><span className="demo-label">Example preview data</span>{mode.demo}</div>
    </>
  );

  return (
    <section className="story section" id="modes"><div className="shell"><div className="kicker reveal">Five different jobs, one builder</div><div className="section-head reveal"><h2>Build the quiz your business actually needs.</h2><p>Squarespell does more than personality quizzes. Each mode changes the generated questions, scoring and results.</p></div><div className="story-grid"><div className="mode-list reveal">{tabs}</div><div className="mode-stage reveal"><div className="mode-window"><div className="mode-bar"><i></i><i></i><i></i><span>Live preview</span></div><div className="mode-content" id="mode-content">{current}</div><div className="mode-foot"><span>BRANCHING · SCORING · OUTCOMES</span><span>Made with Squarespell Quiz</span></div></div></div></div></div></section>
  );
}
