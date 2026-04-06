import Link from 'next/link';
import styles from './home.module.css';
export default function HomePage() {
  return (
    <main className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.navLogo}>Squarespell</div>
        <div className={styles.navLinks}>
          <Link href="/pricing">Pricing</Link>
          <Link href="/sign-in">Log in</Link>
          <Link href="/sign-up" className={styles.navCta}>Start free →</Link>
        </div>
      </nav>
      <section className={styles.hero}>
        <div className={styles.heroBadge}>AI-powered quiz funnels</div>
        <h1 className={styles.heroTitle}>Turn your Squarespace visitors into qualified leads in minutes.</h1>
        <p className={styles.heroSub}>Paste your URL. AI builds a branded quiz. Embed it in one click. Collect leads, personalise results, grow your business.</p>
        <div className={styles.heroCtas}>
          <Link href="/sign-up" className={styles.ctaPrimary}>Start for free →</Link>
          <Link href="/pricing" className={styles.ctaSecondary}>See pricing</Link>
        </div>
        <p className={styles.heroNote}>No credit card required · Free plan available</p>
      </section>
    </main>
  );
}
