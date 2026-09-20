import Link from 'next/link';
import { TRIAL_DAYS } from '@/lib/plans';
import { ROUTES } from './routes';

export function FinalCta() {
  return (
    <section className="final"><div className="shell reveal"><div className="kicker">Paste a URL. Edit the draft. Publish.</div><h2>Your first quiz can start with the site you already have.</h2><Link href={ROUTES.trial} className="button">Start the {TRIAL_DAYS}-day Pro trial <span className="arr">↗</span></Link><p>No credit card required.</p></div></section>
  );
}
