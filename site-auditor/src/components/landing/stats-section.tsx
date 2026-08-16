const STATS = [
  { n: '53%', body: 'of mobile users leave sites that take longer than 3 seconds to load.', src: 'Google' },
  { n: '72%', body: 'of websites have critical SEO issues that hurt their rankings.', src: 'SEMrush' },
  { n: '90%', body: 'of users won’t return to a site after a poor experience.', src: 'Forrester' },
  { n: '2.5x', body: 'faster growth for sites that fix 20+ SEO best practices.', src: 'Backlinko' },
];

export function StatsSection() {
  return (
    <section className="home-section" style={{ background: 'var(--bg-sunk)' }}>
      <div className="frame">
        <div className="home-section-head">
          <p className="eyebrow">Why It Matters</p>
          <h2>A Better Site Means More Traffic, Leads &amp; Sales</h2>
          <p>
            Technical issues and poor content can silently cost you growth. Our audit uncovers
            what&rsquo;s holding you back so you can fix it and grow faster.
          </p>
        </div>
        <div className="home-grid home-grid-4">
          {STATS.map((s) => (
            <div className="home-card" key={s.n}>
              <div className="home-stat-value">{s.n}</div>
              <p className="home-stat-body">
                {s.body}
                <span className="home-stat-src">Source: {s.src}</span>
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
