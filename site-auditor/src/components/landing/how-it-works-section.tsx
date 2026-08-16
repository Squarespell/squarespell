const STEPS = [
  {
    title: 'Enter Your URL',
    body: 'Add your Squarespace website URL above.',
  },
  {
    title: 'We Audit Your Site',
    body: 'Our tool runs 60+ checks on SEO, performance, accessibility and more.',
  },
  {
    title: 'Get Your Free Report',
    body: "You'll receive a detailed report with clear insights and actionable recommendations.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how" className="frame home-section">
      <div className="home-section-head">
        <p className="eyebrow">How It Works</p>
        <h2>3 Simple Steps to Your Free Audit</h2>
      </div>
      <div className="home-grid home-grid-3">
        {STEPS.map((s, i) => (
          <div className="home-card" key={s.title}>
            <div className="home-card-n">{String(i + 1).padStart(2, '0')}</div>
            <h3>{s.title}</h3>
            <p>{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
