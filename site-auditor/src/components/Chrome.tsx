import { MarkSquarespace } from './Icons';

const BRAND_URL = process.env.NEXT_PUBLIC_BRAND_URL || 'https://squarespell.com';

/** The exact mark from the reference design: two overlaid paths, no fill. */
function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2.5 21 7.8v8.4L12 21.5 3 16.2V7.8L12 2.5Z" stroke="white" strokeWidth={2} />
      <path d="m7 12 5-3 5 3-5 3-5-3Z" stroke="white" strokeWidth={1.5} />
    </svg>
  );
}

export function Masthead() {
  return (
    <div className="rd">
      <div className="wrap">
        <header className="header">
          <a className="brand" href="/">
            <BrandMark />
            SQUARESPELL
          </a>
          <nav className="nav" aria-label="Sections">
            <a href="/#features">Features</a>
            <a href="/#report">Sample report</a>
            <a href="/#how">How it works</a>
            <a href="/#faq">FAQ</a>
            <a href="/#about">About us</a>
          </nav>
          <div className="header-right">
            <div className="free">
              <i />
              100% FREE
            </div>
            <a className="btn top" href="/#audit-form">
              Audit my site
            </a>
          </div>
        </header>
      </div>
    </div>
  );
}

export function Footer() {
  return (
    <div className="rd">
      <div className="wrap">
        <footer id="about" className="footer">
          <div className="footer-brand">
            <a className="brand" href="/">
              <BrandMark />
              SQUARESPELL
            </a>
            <p>
              Premium Squarespace plugins, templates and services to help you build, grow and
              optimize your business.
            </p>
          </div>
          <div>
            <h4>Product</h4>
            <a href="/#features">Features</a>
            <a href="/#report">Sample Report</a>
            <a href="/#how">How It Works</a>
            <a href="/#faq">FAQ</a>
          </div>
          <div>
            <h4>Company</h4>
            <a href="/#about">About Us</a>
            <a href={`${BRAND_URL}/squarespace-website-design`} target="_blank" rel="noopener noreferrer">
              Our Work
            </a>
            <a href={`${BRAND_URL}/squarespace-blog`} target="_blank" rel="noopener noreferrer">
              Blog
            </a>
            <a href={`${BRAND_URL}/contact-us`} target="_blank" rel="noopener noreferrer">
              Contact
            </a>
          </div>
          <div>
            <h4>Resources</h4>
            <a href="/squarespace-seo-issues">Squarespace SEO Guide</a>
            <a href="/#features">Speed Optimization Guide</a>
            <a href={`${BRAND_URL}/contact-us`} target="_blank" rel="noopener noreferrer">
              Help Center
            </a>
            <a href={`${BRAND_URL}/squarespace-website-design`} target="_blank" rel="noopener noreferrer">
              Case Studies
            </a>
          </div>
          <div className="footer-note">
            Built for Squarespace.
            <br />
            Focused on results.
            <MarkSquarespace className="mark" />
          </div>
        </footer>
      </div>
    </div>
  );
}
