import {
  IconSeo,
  IconPerformance,
  IconAccessibility,
  IconBestPractices,
  IconContentReview,
  IconActionableInsights,
} from '@/components/Icons';

const CHECKS = [
  { Icon: IconSeo, title: 'SEO Analysis', body: 'On-page SEO, meta tags, headings, sitemap, speed & indexing.' },
  { Icon: IconPerformance, title: 'Performance', body: 'Core Web Vitals, image optimization & more performance.' },
  {
    Icon: IconAccessibility,
    title: 'Accessibility',
    body: 'WCAG checks, contrast, alt text, keyboard navigation & usability.',
  },
  {
    Icon: IconBestPractices,
    title: 'Best Practices',
    body: 'Security, HTTPS, third-party scripts, HTML validation & site health.',
  },
  {
    Icon: IconContentReview,
    title: 'Content Review',
    body: 'Duplicate content, thin pages, content linking & content quality.',
  },
  {
    Icon: IconActionableInsights,
    title: 'Actionable Insights',
    body: 'Prioritized recommendations you can implement to fix what holds you back.',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="home-section" style={{ background: 'var(--bg-sunk)' }}>
      <div className="frame">
        <div className="home-section-head">
          <p className="eyebrow">What&rsquo;s Included in Your Free Audit</p>
          <h2>60+ Checks. Everything That Matters.</h2>
        </div>
        <div className="home-grid home-grid-3">
          {CHECKS.map((c) => (
            <div className="home-card" key={c.title}>
              <div className="home-card-icon">
                <c.Icon />
              </div>
              <h3>{c.title}</h3>
              <p>{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
