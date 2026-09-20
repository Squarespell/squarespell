import Link from 'next/link';
import { ROUTES } from './routes';

export function Footer() {
  return (
    <footer className="footer"><div className="shell"><div className="footer-top"><div><a className="brand" href="#main"><span className="brand-mark"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4"><circle cx="12" cy="4" r="2" fill="#fff"></circle><path d="M12 6v5M12 11L7 16M12 11l5 5"></path><circle cx="7" cy="18" r="2" fill="#fff"></circle><circle cx="17" cy="18" r="2" fill="#fff"></circle></svg></span><span>Squarespell <small>Quiz</small></span></a><p className="footer-copy">AI quiz funnels generated from your website, edited by you, and built to turn answers into useful next steps.</p></div><div className="footer-links"><div><b>Product</b><a href="/#modes">Quiz modes</a><a href="/#templates">Templates</a><a href="/#integrations">Integrations</a><a href="/#pricing">Pricing</a></div><div><b>Account</b><Link href={ROUTES.login}>Log in</Link><Link href={ROUTES.trial}>Start trial</Link><Link href={ROUTES.support}>Support</Link></div></div></div><div className="footer-big">Squarespell<span>Quiz.</span></div><div className="footer-bottom"><span>© 2026 Squarespell Limited</span><span>A separate subscription product from the Squarespell marketplace.</span></div></div></footer>
  );
}
