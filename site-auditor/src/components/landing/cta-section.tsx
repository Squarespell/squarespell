import { IconPersonAvatar } from '@/components/Icons';

const TAGS = ['Squarespace SEO', 'Site Speed Optimization', 'Technical Fixes', 'Ongoing Support'];

export function CtaSection() {
  return (
    <section className="frame home-section">
      <div className="home-cta">
        <p className="eyebrow">Found Issues You Don&rsquo;t Want to Fix Yourself?</p>
        <h2>We Can Help You Fix It</h2>
        <p>
          Squarespell specializes in Squarespace design, SEO and performance. We&rsquo;ll fix the
          issues, optimize your site and help you grow.
        </p>
        <div className="home-cta-tags">
          {TAGS.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        <a className="btn" href="https://squarespell.com" target="_blank" rel="noopener noreferrer">
          Get Help Fixing These Issues →
        </a>
        <div className="home-cta-proof">
          <div className="home-faces">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="home-face">
                <IconPersonAvatar />
              </div>
            ))}
          </div>
          <span className="home-rating-text">4,000+ projects completed</span>
        </div>
      </div>
    </section>
  );
}
