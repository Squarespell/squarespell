'use client';

/**
 * /tools — Tools hub.
 *
 * Lightweight index page listing all Squarespell tools. For now, only the
 * AI Quiz Funnel lives here, but this is where future products (templates,
 * plugins, services) will be added.
 *
 * Hosted at:
 *   - https://squarespell.com/tools
 *   - https://app.squarespell.com/tools
 */

import Link from 'next/link';

type Tool = {
  slug: string;
  eyebrow: string;
  title: string;
  desc: string;
  cta: string;
  badge?: 'NEW' | 'BETA' | 'SOON';
};

const TOOLS: Tool[] = [
  {
    slug: '/tools/quiz-funnel',
    eyebrow: 'LEAD GENERATION',
    title: 'AI Quiz Funnel',
    desc: 'Paste your Squarespace URL. Our AI generates a branded quiz in 30 seconds, captures email, and drops leads straight into your dashboard.',
    cta: 'Try it free →',
    badge: 'NEW',
  },
];

export default function ToolsHub() {
  return (
    <div className="tools-hub">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <header className="th-nav">
        <Link href="/" className="th-logo">
          <span className="th-logo-dot" />
          Squarespell
        </Link>
        <nav className="th-nav-links">
          <Link href="/tools">Tools</Link>
          <a href="https://squarespell.com">Main site</a>
        </nav>
      </header>

      <section className="th-hero">
        <div className="th-eyebrow">TOOLS</div>
        <h1 className="th-title">
          Purpose-built tools for <span className="th-title-accent">Squarespace creators.</span>
        </h1>
        <p className="th-sub">
          Lead-gen, automation, and conversion tools designed from the ground
          up for Squarespace sites. Pick a tool and go.
        </p>
      </section>

      <section className="th-grid">
        {TOOLS.map((t) => (
          <Link key={t.slug} href={t.slug} className="th-card">
            {t.badge && <div className={`th-badge th-badge-${t.badge.toLowerCase()}`}>{t.badge}</div>}
            <div className="th-card-eyebrow">{t.eyebrow}</div>
            <div className="th-card-title">{t.title}</div>
            <div className="th-card-desc">{t.desc}</div>
            <div className="th-card-cta">{t.cta}</div>
          </Link>
        ))}
      </section>

      <footer className="th-footer">
        © {new Date().getFullYear()} Squarespell. Not affiliated with Squarespace Inc.
      </footer>
    </div>
  );
}

const CSS = `
.tools-hub {
  --bg: #07090c;
  --panel: #0e1116;
  --border: rgba(240,242,245,0.08);
  --border-strong: rgba(240,242,245,0.14);
  --text: rgba(240,242,245,0.92);
  --muted: rgba(240,242,245,0.55);
  --dim: rgba(240,242,245,0.35);
  --accent: #D2FF1D;

  background: var(--bg);
  color: var(--text);
  font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}
.tools-hub * { box-sizing: border-box; }
.tools-hub a { color: inherit; text-decoration: none; }

.th-nav {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border);
}
.th-logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  font-size: 17px;
  letter-spacing: -0.01em;
}
.th-logo-dot {
  width: 10px; height: 10px; border-radius: 3px;
  background: var(--accent);
  box-shadow: 0 0 16px rgba(210,255,29,0.6);
}
.th-nav-links { display: flex; gap: 28px; font-size: 14px; color: var(--muted); }
.th-nav-links a:hover { color: var(--text); }

.th-hero {
  max-width: 900px;
  margin: 0 auto;
  padding: 100px 32px 60px;
  text-align: center;
}
.th-eyebrow {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(210,255,29,0.12);
  border: 1px solid rgba(210,255,29,0.28);
  color: var(--accent);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  margin-bottom: 24px;
}
.th-title {
  font-size: clamp(36px, 5.5vw, 62px);
  line-height: 1.05;
  letter-spacing: -0.03em;
  font-weight: 700;
  margin: 0 0 20px;
}
.th-title-accent {
  background: linear-gradient(180deg, #D2FF1D 0%, #a8d614 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}
.th-sub {
  font-size: 18px;
  color: var(--muted);
  line-height: 1.55;
  max-width: 620px;
  margin: 0 auto;
}

.th-grid {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 32px 120px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 22px;
}
.th-card {
  position: relative;
  padding: 40px 34px 34px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  transition: all 0.22s;
  min-height: 280px;
}
.th-card:hover {
  border-color: rgba(210,255,29,0.3);
  transform: translateY(-4px);
  box-shadow: 0 30px 70px -30px rgba(210,255,29,0.2);
}
.th-badge {
  position: absolute;
  top: 18px;
  right: 18px;
  padding: 5px 11px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
}
.th-badge-new {
  background: var(--accent);
  color: #0a0d10;
}
.th-badge-beta {
  background: rgba(99,102,241,0.18);
  border: 1px solid rgba(99,102,241,0.4);
  color: #818cf8;
}
.th-badge-soon {
  background: rgba(255,255,255,0.06);
  border: 1px solid var(--border-strong);
  color: var(--muted);
}
.th-card-eyebrow {
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  letter-spacing: 0.12em;
  margin-bottom: 16px;
}
.th-card-title {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: 12px;
}
.th-card-desc {
  font-size: 15px;
  color: var(--muted);
  line-height: 1.55;
  flex: 1;
  margin-bottom: 26px;
}
.th-card-cta {
  font-size: 14px;
  font-weight: 600;
  color: var(--accent);
  letter-spacing: -0.005em;
}

.th-footer {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 32px 40px;
  border-top: 1px solid var(--border);
  font-size: 12px;
  color: var(--dim);
  text-align: center;
}
`;
