'use client';

/**
 * /tools/quiz-funnel - Public marketing landing page for Squarespell
 *
 * Design: Merged from two reference designs (File A hero + File B sections)
 *   - Hero: File A style — URL input bar, builder UI mockup, floating tags
 *   - Remaining sections: File B style — editorial serif headings, rich mockups
 *   - Colors: #0F7377 (teal) + #F7F7F5 (paper)
 *   - Font: Inter (body), system fallbacks
 */

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { QUIZ_BUILDER_PATH } from '@/lib/urls';
import { QUIZ_TEMPLATE_CATALOG } from '@/lib/quiz/templates';

var TRY_URL = QUIZ_BUILDER_PATH;
var SIGN_IN_URL = '/sign-in';

function normalizeUrl(raw: string): string {
  var u = raw.trim();
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  return u;
}

type Plan = {
  name: string;
  monthly: number;
  yearly: number;
  desc: string;
  features: string[];
  cta: string;
  href: string;
  featured?: boolean;
};

var PLANS: Plan[] = [
  {
    name: 'Core',
    monthly: 12,
    yearly: 9,
    desc: 'Remove branding and grow your list.',
    features: [
      '5 quizzes',
      '1,000 leads / month',
      '1,000 emails / month',
      'AI quiz generation',
      'Remove branding',
      'Branching logic & scoring',
      'Quiz scheduling',
      'Standard analytics',
    ],
    cta: 'Start 14-day trial',
    href: TRY_URL,
  },
  {
    name: 'Pro',
    monthly: 19,
    yearly: 16,
    desc: 'Full power for serious lead gen.',
    features: [
      'Unlimited quizzes',
      '3,000 leads / month',
      '3,000 emails / month',
      'A/B testing',
      'All integrations & webhooks',
      'Email sequences',
      'Advanced analytics',
    ],
    cta: 'Start 14-day trial',
    href: TRY_URL,
    featured: true,
  },
  {
    name: 'Business',
    monthly: 35,
    yearly: 29,
    desc: 'For agencies and power users.',
    features: [
      'Everything in Pro',
      'Unlimited leads & emails',
      'White-label & custom domain',
      'Team seats (3 included)',
      'Priority support',
      'API access',
    ],
    cta: 'Start 14-day trial',
    href: TRY_URL,
  },
];

var FAQS = [
  {
    q: 'How does Squarespell work with Squarespace?',
    a: 'Squarespell is built specifically for Squarespace 7.1. You embed quizzes via code injection — one snippet in a Code Block. No plugins to install, no iframes. Your quiz loads natively inside your site.',
  },
  {
    q: 'Do I need coding skills?',
    a: 'No. Paste your URL, our AI generates a branded quiz. Edit anything in the visual editor. Copy one snippet to embed. The entire process takes under 5 minutes.',
  },
  {
    q: 'Can I customize the design?',
    a: 'Yes. Colors, fonts, and tone are pulled from your site automatically. You can override everything in the brand kit — including separate light and dark mode palettes.',
  },
  {
    q: 'What about my leads and data?',
    a: 'Leads land in your dashboard instantly. Export to CSV anytime, or connect Mailchimp, Klaviyo, ConvertKit, Google Sheets, Zapier, or custom webhooks. Your data is always yours.',
  },
  {
    q: 'Can I change plans later?',
    a: 'Yes. Upgrade, downgrade, or cancel anytime. All plans include a 14-day free trial. No credit card required to start.',
  },
];

var TEMPLATE_CATEGORIES = ['All', 'Lead Gen', 'E-commerce', 'Recommendation', 'Personality', 'Survey'];

export default function LandingPage() {
  var router = useRouter();
  var [openFaq, setOpenFaq] = useState<number | null>(null);
  var [billing, setBilling] = useState<'monthly' | 'yearly'>('yearly');
  var [heroUrl, setHeroUrl] = useState('');
  var [heroSubmitting, setHeroSubmitting] = useState(false);
  var [activeTemplateCat, setActiveTemplateCat] = useState('All');

  var handleGenerate = function(e: React.FormEvent) {
    e.preventDefault();
    var normalized = normalizeUrl(heroUrl);
    if (!normalized) return;
    setHeroSubmitting(true);
    router.push(QUIZ_BUILDER_PATH + '?url=' + encodeURIComponent(normalized));
  };

  var filteredTemplates = useMemo(function() {
    var all = QUIZ_TEMPLATE_CATALOG || [];
    if (activeTemplateCat === 'All') return all.slice(0, 4);
    return all.filter(function(t: any) {
      return t.category === activeTemplateCat;
    }).slice(0, 4);
  }, [activeTemplateCat]);

  return (
    <div className="lp">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ========== NAV ========== */}
      <nav className="nv">
        <div className="nv-i">
          <Link href="/" className="lg">
            <span className="mk">S</span>
            <span>Squarespell</span>
          </Link>
          <ul>
            <li><a href="#builder">Product</a></li>
            <li><a href="#ai">AI</a></li>
            <li><a href="#templates">Templates</a></li>
            <li><a href="#pricing">Pricing</a></li>
          </ul>
          <div className="rt">
            <Link href={SIGN_IN_URL} className="si">Log in</Link>
            <Link href={TRY_URL} className="btn sm">Start 14-day trial <span className="ar">&rarr;</span></Link>
          </div>
        </div>
      </nav>

      {/* ========== HERO (File A style — URL bar + builder mockup) ========== */}
      <header className="hero">
        <div className="wrap">
          <div className="hero-i">
            <div className="hero-l">
              <span className="eb">AI quiz tool</span>
              <h1>Paste a URL.<br />Get a quiz<br />that <em>converts.</em></h1>
              <p className="ld">Squarespell reads your site, extracts your brand, and builds a high-converting quiz in under sixty seconds. Built for Squarespace.</p>
              <form className="uf" onSubmit={handleGenerate}>
                <span className="pad">https://</span>
                <input
                  type="text"
                  inputMode="url"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="acme-studio.com"
                  value={heroUrl}
                  onChange={function(e) { setHeroUrl(e.target.value.replace(/^https?:\/\//i, '')); }}
                  disabled={heroSubmitting}
                />
                <button type="submit" className="btn gb" disabled={heroSubmitting || !heroUrl.trim()}>
                  {heroSubmitting ? 'Creating...' : 'Generate quiz'}
                  {!heroSubmitting && <span className="ar">&rarr;</span>}
                </button>
              </form>
              <div className="hm">
                <span className="hm-i"><span className="ck">&check;</span> No credit card</span>
                <span className="hm-i"><span className="ck">&check;</span> Live in 60s</span>
                <span className="hm-i"><span className="ck">&check;</span> Cancel anytime</span>
              </div>
            </div>
            <div className="hero-r">
              {/* Builder mockup */}
              <div className="tool">
                <div className="tool-top">
                  <div className="dts"><span /><span /><span /></div>
                  <div className="crumb"><b>acme-studio</b> / <b>brand-fit-quiz</b> / editor</div>
                  <div className="lv">Live</div>
                </div>
                <div className="tool-bd">
                  {/* Left rail — blocks */}
                  <div className="rail">
                    <h6>Blocks</h6>
                    <div className="bk"><span className="ic">&#9776;</span> Short text</div>
                    <div className="bk"><span className="ic">&#9673;</span> Multiple choice</div>
                    <div className="bk dr"><span className="ic">&#9638;</span> Image grid</div>
                    <div className="bk"><span className="ic">&#9733;</span> Rating</div>
                    <div className="bk"><span className="ic">&#43;</span> Slider</div>
                    <div className="bk"><span className="ic">&#9776;</span> Dropdown</div>
                    <div className="bk"><span className="ic">&#9993;</span> Email</div>
                    <div className="bk"><span className="ic">&#8710;</span> Logic split</div>
                  </div>
                  {/* Center canvas */}
                  <div className="cv">
                    <div className="qc">
                      <div className="qm"><span>Q1 &middot; Multiple choice</span><span className="ok">&check; saved</span></div>
                      <h4>Which sounds most like your business?</h4>
                      <div className="ops">
                        <div className="op"><span className="b" /> Solo creator</div>
                        <div className="op sl"><span className="b" /> Small agency (2&ndash;10)</div>
                        <div className="op"><span className="b" /> In-house team</div>
                        <div className="op"><span className="b" /> Enterprise</div>
                      </div>
                    </div>
                    <div className="qc fc">
                      <div className="qm"><span>Q2 &middot; Image grid</span><span className="ok">selected</span></div>
                      <h4>Pick the aesthetic that feels like home.</h4>
                      <div className="ops">
                        <div className="op"><span className="b" /> Minimal</div>
                        <div className="op sl"><span className="b" /> Bold</div>
                        <div className="op"><span className="b" /> Editorial</div>
                        <div className="op"><span className="b" /> Soft</div>
                      </div>
                    </div>
                    <div className="dz">&#8615; Drop &lsquo;Image grid&rsquo; here</div>
                  </div>
                  {/* Right inspector */}
                  <div className="sd">
                    <h6>Properties</h6>
                    <div className="inp">
                      <div className="l">Layout</div>
                      <div className="sg"><b>List</b><b className="on">Grid</b><b>Cards</b></div>
                    </div>
                    <div className="inp">
                      <div className="l">Required</div>
                      <div className="v">Yes &middot; 1 selection</div>
                    </div>
                    <div className="inp">
                      <div className="l">Score weight</div>
                      <div className="v">+12 pts &rarr; <b style={{ color: 'var(--t)' }}>Bold path</b></div>
                    </div>
                    <div className="inp">
                      <div className="l">Accent</div>
                      <div className="v"><span className="sw" /> #0F7377</div>
                    </div>
                    <div className="inp">
                      <div className="l">Logic</div>
                      <div className="lg-rows">
                        <div className="lg-r"><span className="pill">IF</span> answer is &rarr;</div>
                        <div className="lg-r sub"><span className="pill t">Bold</span> jump Q5</div>
                        <div className="lg-r sub"><span className="pill t">Minimal</span> jump Q3</div>
                        <div className="lg-r sub"><span className="pill m">else</span> continue</div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Floating tags */}
                <div className="ft f1"><span className="fic">&#9889;</span> <b>AI-generated</b> &mdash; 8 questions</div>
                <div className="ft f2"><span className="fic">&#9733;</span> Score: <b>78/100</b></div>
                <div className="ft f3"><span className="fic">&#10003;</span> <b>3 outcomes</b> mapped</div>
              </div>
            </div>
          </div>

          {/* Trust strip */}
          <div className="trust">
            <div className="trust-lbl"><b>Loved by 8,000+</b><br />creators &amp; businesses</div>
            <div className="trust-logos">
              <span className="tl italic">Later</span>
              <span className="tl caps">Inked</span>
              <span className="tl serif">Cultivate</span>
              <span className="tl caps">Niche</span>
              <span className="tl italic">studio mira</span>
              <span className="tl serif">Folio &amp; Co.</span>
            </div>
          </div>
        </div>
      </header>

      {/* ========== SECTION 2 — Builder deep dive ========== */}
      <section id="builder" className="sec-builder">
        <div className="wrap">
          <div className="sh">
            <span className="eb"><span className="num">01</span> The Builder</span>
            <h2>Build like a designer.<br /><em>Branch like an engineer.</em></h2>
            <p>A block-based canvas with drag &amp; drop, twenty question types, and ten one-click layouts.</p>
          </div>

          <div className="ix-grid">
            <div className="ix-card">
              <span className="tag">Drag &amp; drop</span>
              <h3>Pick a block.<br /><em>Drop it. Done.</em></h3>
              <p>Reorder by handle. Snap-to-grid. Undo with &#8984;Z.</p>
              <div className="vis">
                <div className="drag-vis">
                  <div className="dv-lib">
                    <div className="dv-item">Text</div>
                    <div className="dv-item">Choice</div>
                    <div className="dv-item act">Image grid &#9698;</div>
                    <div className="dv-item">Rating</div>
                    <div className="dv-item">Email</div>
                  </div>
                  <div className="dv-stack">
                    <div className="dv-ph">Q1 &middot; Multiple choice</div>
                    <div className="dv-ph">Q2 &middot; Short text</div>
                    <div className="dv-ph snap">&#8615; Image grid will land here</div>
                    <div className="dv-ph">Q3 &middot; Email</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="ix-card">
              <span className="tag">10 layouts</span>
              <h3>One quiz.<br /><em>Many faces.</em></h3>
              <p>Single-column, conversational, card stack. Switch in one click.</p>
              <div className="vis">
                <div className="lay-vis">
                  <div className="lt">
                    <div className="lt-nm">Single col</div>
                    <div className="ll s" /><div className="ll m" /><div className="ll s" /><div className="lb" />
                  </div>
                  <div className="lt active">
                    <div className="lt-nm">Conversational</div>
                    <div className="ll m" /><div className="ll s" /><div className="lb" /><div className="lb sm" />
                  </div>
                  <div className="lt">
                    <div className="lt-nm">Card stack</div>
                    <div className="ll m" /><div className="ll s" /><div className="lb" />
                  </div>
                </div>
              </div>
            </div>

            <div className="ix-card span2">
              <span className="tag">20 question types</span>
              <h3>The right input <em>for the right answer.</em></h3>
              <p>Each type works with logic, scoring, and outcome mapping. Mix freely.</p>
              <div className="vis">
                <div className="qtypes">
                  {['Multiple choice','Short text','Long text','Image grid','Picture choice','Slider','Star rating','NPS','Yes / No','Email','Phone','URL','Date','Number','Dropdown','Multi-select','Ranking','File upload','Signature','Payment'].map(function(t) {
                    return <span key={t} className="ch"><span className="d" />{t}</span>;
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== SECTION 3 — AI Generation ========== */}
      <section id="ai" className="sec-ai">
        <div className="wrap">
          <div className="sh">
            <span className="eb"><span className="num">02</span> AI Generation</span>
            <h2>Paste your URL.<br /><em>Get a quiz.</em> Really.</h2>
            <p>Squarespell reads your site, extracts your offering, and writes a brand-aware quiz in under sixty seconds.</p>
          </div>

          <div className="ai-flow">
            <div className="ai-step">
              <div className="step-num"><span className="n">1</span>Input</div>
              <div className="step-title">Paste your homepage.</div>
              <div className="url-bar">
                <span className="url-pad">&#8999;</span>
                <span className="url-u">https://acme-studio.com</span>
                <span className="url-pulse" />
              </div>
              <div className="crawl-list">
                <div className="crawl-line"><span className="dot" />Reading homepage<span className="ok-tag">200 OK</span></div>
                <div className="crawl-line"><span className="dot" />Parsing 4 sub-pages<span className="ok-tag">&check;</span></div>
                <div className="crawl-line"><span className="dot" />Indexing services<span className="ok-tag">&check;</span></div>
                <div className="crawl-line thinking"><span className="dot" />Detecting brand voice</div>
              </div>
            </div>

            <div className="ai-arrow">
              <svg viewBox="0 0 60 24" fill="none">
                <path d="M2 12 H50" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
                <path d="M44 6 L52 12 L44 18" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <div className="ai-step">
              <div className="step-num"><span className="n">2</span>Extract</div>
              <div className="step-title">Understand the offering.</div>
              <div className="extract">
                <div className="ex-row"><span className="k">brand</span><span className="val">Acme Studio &mdash; <b>warm, confident, indie</b></span></div>
                <div className="ex-row"><span className="k">product</span><span className="val">Brand identity, $1.5k&ndash;$12k</span></div>
                <div className="ex-row"><span className="k">audience</span><span className="val">Founders &amp; small agencies</span></div>
                <div className="ex-row"><span className="k">tiers</span><span className="val">Starter &middot; Studio &middot; Bespoke</span></div>
                <div className="ex-row"><span className="k">cta</span><span className="val">&ldquo;Book a discovery call&rdquo;</span></div>
              </div>
            </div>

            <div className="ai-arrow">
              <svg viewBox="0 0 60 24" fill="none">
                <path d="M2 12 H50" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
                <path d="M44 6 L52 12 L44 18" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <div className="ai-step">
              <div className="step-num"><span className="n">3</span>Output</div>
              <div className="step-title" style={{ fontStyle: 'italic' }}>Find your perfect brand package.</div>
              <div className="gen-quiz">
                <div className="gen-q"><span className="nu">Q1</span>What stage is your business in?</div>
                <div className="gen-q"><span className="nu">Q2</span>Pick the look that feels right.</div>
                <div className="gen-q"><span className="nu">Q3</span>What&apos;s your launch timeline?</div>
                <div className="gen-q"><span className="nu">Q4</span>Where will customers meet you?</div>
                <div className="gen-q"><span className="nu">Q5</span>What&apos;s your investment range?</div>
              </div>
              <div className="ai-meta">
                <span><b>5</b> questions</span>
                <span><b>3</b> outcomes</span>
                <span><b>4</b> branches</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== SECTION 4 — Logic & Scoring ========== */}
      <section className="sec-logic">
        <div className="wrap">
          <div className="sh">
            <span className="eb"><span className="num">03</span> Logic &amp; Scoring</span>
            <h2>Every answer earns a path.<br /><em>Every path earns an outcome.</em></h2>
            <p>Visual branching with weighted scoring. Map any answer combination to any outcome.</p>
          </div>

          <div className="logic-stage">
            <div className="logic-diagram">
              <svg className="logic-lines" viewBox="0 0 1100 460" preserveAspectRatio="none">
                <path d="M 240 100 C 320 100, 320 60, 420 60" />
                <path d="M 240 130 C 320 130, 320 230, 420 230" />
                <path d="M 240 160 C 320 160, 320 400, 420 400" />
                <path d="M 640 90 C 720 90, 740 70, 840 70" />
                <path d="M 640 260 C 720 260, 740 240, 840 230" />
                <path d="M 640 430 C 720 430, 740 400, 840 390" />
              </svg>
              <div className="node q-node" style={{ top: 90, left: 20 }}>
                <div className="n-tag">Q1</div>
                <div className="n-title">Which sounds most like your business?</div>
                <div className="n-ans">
                  <span className="a">Solo</span>
                  <span className="a win">Agency</span>
                  <span className="a">In-house</span>
                </div>
              </div>
              <div className="node q-node" style={{ top: 20, left: 420 }}>
                <div className="n-tag">Q2 &middot; Solo path</div>
                <div className="n-title">What&apos;s your launch timeline?</div>
                <div className="n-score"><span>Path score:</span><span className="pts">+18 pts &rarr; Starter</span></div>
              </div>
              <div className="node q-node" style={{ top: 200, left: 420 }}>
                <div className="n-tag">Q2 &middot; Agency path</div>
                <div className="n-title">How many clients per quarter?</div>
                <div className="n-score"><span>Path score:</span><span className="pts">+34 pts &rarr; Studio</span></div>
              </div>
              <div className="node q-node" style={{ top: 370, left: 420 }}>
                <div className="n-tag">Q2 &middot; In-house path</div>
                <div className="n-title">What&apos;s your investment range?</div>
                <div className="n-score"><span>Path score:</span><span className="pts">+62 pts &rarr; Bespoke</span></div>
              </div>
              <div className="node o-node" style={{ top: 30, right: 20 }}>
                <div className="n-tag">Outcome A</div>
                <div className="n-title">The Starter Package</div>
              </div>
              <div className="node o-node" style={{ top: 200, right: 20 }}>
                <div className="n-tag">Outcome B &middot; matched</div>
                <div className="n-title">The Studio Package</div>
              </div>
              <div className="node o-node" style={{ top: 370, right: 20 }}>
                <div className="n-tag">Outcome C</div>
                <div className="n-title">Bespoke &amp; Custom</div>
              </div>
            </div>
            <div className="score-bar">
              <div className="sb-l">Score accumulator</div>
              <div className="sb-track">
                <div className="sb-marks"><span style={{ left: '20%' }} /><span style={{ left: '50%' }} /><span style={{ left: '80%' }} /></div>
                <i />
              </div>
              <div className="sb-v">78<small>/100</small></div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== SECTION 5 — Leads ========== */}
      <section className="sec-leads">
        <div className="wrap">
          <div className="sh">
            <span className="eb"><span className="num">04</span> Leads &amp; Conversion</span>
            <h2>The moment <em>before the result</em> is when they convert.</h2>
            <p>Gate the outcome behind a beautifully timed form. Capture rates north of 60% are normal.</p>
          </div>

          <div className="leads-grid">
            <div className="lead-card">
              <div className="lead-gate">
                <div className="lg-step"><span>Question 6 of 6</span><span>The last one</span></div>
                <h5>Where should we send your <em>match</em>?</h5>
                <p>Your personalized brand package &mdash; plus a styling guide.</p>
                <div className="lg-field"><span className="ph">@</span><span className="typed">lily@cultivate</span></div>
                <div className="lg-field focus"><span className="ph">&#9742;</span><span className="ph">+1 phone (optional)</span></div>
                <button className="lg-submit">See my match &rarr;</button>
                <div className="lg-agree">By continuing you agree to our <a href="/privacy">privacy policy</a>.</div>
              </div>
            </div>

            <div className="conv-card">
              <span className="conv-tag">Why it works</span>
              <h3>Capture <em>2.4&times;</em> more leads than a static form.</h3>
              <p>Quiz-takers have already invested 90 seconds. They want their result. Asking for an email at that moment is the lowest-friction conversion in marketing.</p>
              <div className="conv-stats">
                <div>
                  <div className="cs-label">Avg. capture rate</div>
                  <div className="cs-value">68.4%</div>
                  <div className="cs-delta"><b>&uarr; 2.4&times;</b> vs static form</div>
                </div>
                <div>
                  <div className="cs-label">Avg. lead score</div>
                  <div className="cs-value">73<span style={{ fontSize: 22, color: 'var(--ink3)' }}>/100</span></div>
                  <div className="cs-delta">Auto-scored by 12 signals</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== SECTION 6 — Email & Automations ========== */}
      <section className="sec-email">
        <div className="wrap">
          <div className="sh">
            <span className="eb"><span className="num">05</span> Email &amp; Automations</span>
            <h2>Result delivered.<br /><em>Sequence triggered.</em></h2>
            <p>Personalized result emails fire the second a quiz is completed. From there, your sequence does the rest.</p>
          </div>

          <div className="email-grid">
            <div className="email-info">
              <span className="tag">Result email</span>
              <h3>Their <em>name</em>, their <em>match</em>, their inbox.</h3>
              <p>Merge tags pull through every answer, score, and outcome. Send right away or schedule by timezone.</p>
              <div className="merge-tags">
                {['{{first_name}}','{{match}}','{{score}}','{{top_answer}}','{{outcome.cta_url}}'].map(function(t) {
                  return <span key={t} className="mt">{t}</span>;
                })}
              </div>
            </div>

            <div className="auto-card">
              <span className="tag">Trigger &rarr; action</span>
              <h3>Set it.<br /><em>Forget it.</em></h3>
              <p>Trigger emails, Slack pings, CRM pushes the moment a lead crosses any threshold.</p>
              <div className="auto-flow">
                <div className="af-step"><span className="when">Trigger</span><div className="desc"><i>WHEN</i> lead score <b>&ge; 70</b> <i>AND</i> source = <b>organic</b></div></div>
                <div className="af-step"><span className="when">+ 0s</span><div className="desc">Send <b>result email</b> with merge tags</div></div>
                <div className="af-step"><span className="when">+ 1s</span><div className="desc">Push contact to <b>HubSpot</b> &middot; pipeline = <b>Hot inbound</b></div></div>
                <div className="af-step"><span className="when">+ 2s</span><div className="desc">Notify <b>#sales</b> on Slack</div></div>
                <div className="af-step"><span className="when">+ 1d</span><div className="desc">Send <b>follow-up</b> with case study</div></div>
                <div className="af-step"><span className="when">+ 3d</span><div className="desc">Send <b>booking link</b> if no reply</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== SECTION 7 — Analytics & A/B ========== */}
      <section className="sec-analytics">
        <div className="wrap">
          <div className="sh">
            <span className="eb"><span className="num">06</span> Analytics &amp; A/B</span>
            <h2>Numbers that <em>tell stories.</em></h2>
            <p>Per-question drop-off, lead quality scoring, source attribution, and built-in A/B testing.</p>
          </div>

          <div className="ana-grid">
            <div className="ana-card">
              <div className="ana-top"><h3>Lead capture &middot; last 30 days</h3><span className="ana-live">Live</span></div>
              <div className="ana-chart">
                <svg viewBox="0 0 600 200" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#0F7377" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#0F7377" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0 170 L60 158 L120 148 L180 142 L240 128 L300 112 L360 85 L420 80 L480 55 L540 45 L600 25 L600 200 L0 200Z" fill="url(#g1)" />
                  <path d="M0 170 L60 158 L120 148 L180 142 L240 128 L300 112 L360 85 L420 80 L480 55 L540 45 L600 25" fill="none" stroke="#0F7377" strokeWidth="2" />
                  <circle cx="600" cy="25" r="4" fill="#0F7377" />
                  <circle cx="600" cy="25" r="10" fill="#0F7377" opacity="0.2" />
                </svg>
              </div>
              <div className="ana-insight">
                <div className="ai-ic">&uarr;</div>
                <div>
                  <div className="ai-t">Variant B converts 38% better on mobile.</div>
                  <div className="ai-s">Auto-detected at 97% confidence.</div>
                </div>
                <div className="ai-d">+38%</div>
              </div>
            </div>

            <div className="ana-card tint">
              <div className="ana-top"><h3>Question drop-off</h3><span className="ana-live">7d</span></div>
              <div className="drop-list">
                {[
                  { q: 'Q1', name: 'Business stage', type: 'Multiple choice', pct: 92 },
                  { q: 'Q2', name: 'Aesthetic preference', type: 'Image grid', pct: 88 },
                  { q: 'Q3', name: 'Investment range', type: 'Slider', pct: 64, danger: true },
                  { q: 'Q4', name: 'Email', type: 'Lead gate', pct: 58 },
                ].map(function(row) {
                  return (
                    <div key={row.q} className={'drop-row' + (row.danger ? ' danger' : '')}>
                      <span className="dq">{row.q}</span>
                      <span className="dinfo"><span className="dname">{row.name}</span><span className="dtype">{row.type}{row.danger ? ' ⚠ high drop' : ''}</span></span>
                      <span className="dbar"><i style={{ width: row.pct + '%' }} /></span>
                      <span className="dpct">{row.pct}%</span>
                    </div>
                  );
                })}
              </div>
              <div className="ab-block">
                <div className="ab-variant">
                  <div className="ab-h"><span className="ab-nm">A &mdash; &ldquo;Find your fit&rdquo;</span><span className="ab-pl">Control</span></div>
                  <div className="ab-stats"><div className="ab-s"><div className="ab-sl">Started</div><div className="ab-sv">61%</div></div><div className="ab-s"><div className="ab-sl">Completed</div><div className="ab-sv">52%</div></div><div className="ab-s"><div className="ab-sl">Captured</div><div className="ab-sv">14.2%</div></div></div>
                </div>
                <div className="ab-variant win">
                  <div className="ab-h"><span className="ab-nm">B &mdash; &ldquo;30-second quiz&rdquo;</span><span className="ab-pl">Winner</span></div>
                  <div className="ab-stats"><div className="ab-s"><div className="ab-sl">Started</div><div className="ab-sv">74%</div></div><div className="ab-s"><div className="ab-sl">Completed</div><div className="ab-sv">68%</div></div><div className="ab-s"><div className="ab-sl">Captured</div><div className="ab-sv">19.6%</div></div></div>
                </div>
                <div className="ab-foot"><span className="ab-ck">&check;</span> <b>Winner detected</b> at 97% confidence.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== SECTION 8 — Integrations ========== */}
      <section className="sec-int">
        <div className="wrap">
          <div className="sh">
            <span className="eb"><span className="num">07</span> Integrations</span>
            <h2>Plays well with <em>everything</em><br />you already pay for.</h2>
            <p>Native connectors and webhooks pipe quiz data into the tools your team lives in.</p>
          </div>

          <div className="int-stage">
            <svg className="int-flow" viewBox="0 0 1080 320" preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="flowg" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#0F7377" stopOpacity="1" />
                  <stop offset="100%" stopColor="#0F7377" stopOpacity="0.3" />
                </linearGradient>
              </defs>
              <g>
                <circle cx="540" cy="160" r="68" fill="#0F7377" />
                <circle cx="540" cy="160" r="78" fill="none" stroke="#0F7377" strokeOpacity="0.15" strokeWidth="1" />
                <text x="540" y="158" textAnchor="middle" fontFamily="Inter" fontSize="18" fill="#F7F7F5" fontWeight="600">Squarespell</text>
                <text x="540" y="178" textAnchor="middle" fontFamily="Inter" fontSize="9" fill="#F7F7F5" opacity="0.7" letterSpacing="2">QUIZ DATA HUB</text>
              </g>
              <g stroke="#0F7377" strokeWidth="1.5" fill="none" strokeDasharray="4 4">
                <path d="M 130 60 C 280 60, 360 130, 470 150" />
                <path d="M 130 160 C 280 160, 360 160, 470 160" />
                <path d="M 130 260 C 280 260, 360 200, 470 175" />
              </g>
              <g stroke="url(#flowg)" strokeWidth="1.5" fill="none" strokeDasharray="4 4">
                <path d="M 610 150 C 720 130, 800 60, 950 60" />
                <path d="M 610 160 C 720 160, 800 160, 950 160" />
                <path d="M 610 175 C 720 200, 800 260, 950 260" />
              </g>
              <g fontFamily="Inter" fontSize="13" fill="#0F7377" fontWeight="500">
                <rect x="20" y="42" width="110" height="36" rx="10" fill="#F7F7F5" stroke="#0F737733" />
                <text x="75" y="65" textAnchor="middle">Quiz answers</text>
                <rect x="20" y="142" width="110" height="36" rx="10" fill="#F7F7F5" stroke="#0F737733" />
                <text x="75" y="165" textAnchor="middle">Lead score</text>
                <rect x="20" y="242" width="110" height="36" rx="10" fill="#F7F7F5" stroke="#0F737733" />
                <text x="75" y="265" textAnchor="middle">Outcome match</text>
              </g>
              <g fontFamily="Inter" fontSize="13" fill="#0F7377" fontWeight="500">
                <rect x="940" y="42" width="120" height="36" rx="10" fill="#F7F7F5" stroke="#0F737733" />
                <text x="1000" y="65" textAnchor="middle">HubSpot</text>
                <rect x="940" y="142" width="120" height="36" rx="10" fill="#F7F7F5" stroke="#0F737733" />
                <text x="1000" y="165" textAnchor="middle">Klaviyo</text>
                <rect x="940" y="242" width="120" height="36" rx="10" fill="#F7F7F5" stroke="#0F737733" />
                <text x="1000" y="265" textAnchor="middle">Slack</text>
              </g>
              <circle cx="0" cy="0" r="3" fill="#0F7377">
                <animateMotion dur="3s" repeatCount="indefinite" path="M 130 60 C 280 60, 360 130, 470 150" />
              </circle>
              <circle cx="0" cy="0" r="3" fill="#0F7377">
                <animateMotion dur="2.5s" repeatCount="indefinite" begin="0.4s" path="M 610 150 C 720 130, 800 60, 950 60" />
              </circle>
              <circle cx="0" cy="0" r="3" fill="#0F7377">
                <animateMotion dur="3s" repeatCount="indefinite" begin="0.8s" path="M 130 260 C 280 260, 360 200, 470 175" />
              </circle>
              <circle cx="0" cy="0" r="3" fill="#0F7377">
                <animateMotion dur="2.7s" repeatCount="indefinite" begin="1.6s" path="M 610 160 C 720 160, 800 160, 950 160" />
              </circle>
            </svg>
            <div className="int-tiles">
              {['Mailchimp','Klaviyo','HubSpot','Google Sheets','Zapier','Slack','Notion','Webhooks','Shopify','+24 more'].map(function(t) {
                return <div key={t} className="int-tile">{t}</div>;
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ========== SECTION 9 — Templates ========== */}
      <section id="templates" className="sec-tpl">
        <div className="wrap">
          <div className="sh">
            <span className="eb"><span className="num">08</span> Templates</span>
            <h2>Start at <em>step nine.</em></h2>
            <p>120+ templates designed by conversion experts. Pick a starting point, ship in an hour.</p>
          </div>

          <div className="tpl-tabs">
            {TEMPLATE_CATEGORIES.map(function(cat) {
              return (
                <button
                  key={cat}
                  className={'tpl-tab' + (activeTemplateCat === cat ? ' on' : '')}
                  onClick={function() { setActiveTemplateCat(cat); }}
                  type="button"
                >
                  {cat}
                </button>
              );
            })}
          </div>

          <div className="tpl-grid">
            {filteredTemplates.map(function(tpl: any) {
              return (
                <Link key={tpl.id} href={'/templates/' + tpl.id + '/preview'} className="tpl-card">
                  <div className="tpl-preview">
                    <div className="tpl-pq">
                      <div className="tpl-step">Q2 of {tpl.questions || 6}</div>
                      <div className="tpl-ttl">{tpl.name}</div>
                      <div className="tpl-desc">{tpl.description}</div>
                    </div>
                  </div>
                  <div className="tpl-meta">
                    <div className="tpl-nm">{tpl.name}</div>
                    <div className="tpl-cat">{tpl.category} &middot; {tpl.questions || 6} questions</div>
                  </div>
                </Link>
              );
            })}
          </div>
          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <Link href="/templates" className="btn ghost">Browse all templates <span className="ar">&rarr;</span></Link>
          </div>
        </div>
      </section>

      {/* ========== SECTION 10 — Embed ========== */}
      <section className="sec-embed">
        <div className="wrap">
          <div className="sh">
            <span className="eb"><span className="num">09</span> Embed &amp; Publish</span>
            <h2>Three ways to <em>show up.</em></h2>
            <p>Inline on a page, popup on intent, or a peek-tab on every screen.</p>
          </div>

          <div className="embed-grid">
            {[
              { num: '01', mode: 'Inline', title: 'Lives inside your page.', desc: 'One line of code. Renders responsively, inherits your fonts.' },
              { num: '02', mode: 'Popup', title: 'Triggered by intent.', desc: 'Exit-intent, scroll depth, time on page, or a custom event.' },
              { num: '03', mode: 'Side tab', title: 'Always one click away.', desc: 'A persistent peek-tab on the edge of the screen. Subtle. Branded.' },
            ].map(function(em) {
              return (
                <div key={em.num} className="em-card">
                  <span className="em-label">{em.num} &middot; {em.mode}</span>
                  <h3>{em.title}</h3>
                  <p>{em.desc}</p>
                  <div className="em-demo">
                    <div className="em-browser">
                      <div className="em-dots"><span /><span /><span /></div>
                      <span className="em-url">acme-studio.com</span>
                    </div>
                    <div className={'em-body em-' + em.mode.toLowerCase().replace(' ', '')}>
                      <div className="em-line m" /><div className="em-line s" /><div className="em-line m" /><div className="em-line s" />
                      {em.mode === 'Inline' && <div className="em-quiz-inline"><div className="em-qi-title">What kind of brand?</div><div className="em-qi-opt sel" /><div className="em-qi-opt" /></div>}
                      {em.mode === 'Popup' && <div className="em-popup"><span className="em-x">&times;</span><div className="em-pop-title">Find your plan in 30s</div><span className="em-pop-cta">Start &rarr;</span></div>}
                      {em.mode === 'Side tab' && <div className="em-tab">Take the quiz</div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========== SECTION 11 — Brand Kit ========== */}
      <section className="sec-brand">
        <div className="wrap">
          <div className="sh">
            <span className="eb"><span className="num">10</span> Brand kit</span>
            <h2>Yours, <em>down to the corner radius.</em></h2>
            <p>Custom fonts, colors, motion, domain, even your own CSS.</p>
          </div>

          <div className="brand-grid">
            {[
              { name: 'Light · Editorial', cls: 's1' },
              { name: 'Dark · Modern', cls: 's2' },
              { name: 'Brand · Saturated', cls: 's3' },
            ].map(function(skin) {
              return (
                <div key={skin.cls} className={'skin ' + skin.cls}>
                  <span className="skin-label">{skin.name}</span>
                  <div className="skin-qcard">
                    <div className="skin-step">Q3 of 5</div>
                    <div className="skin-ttl">What suits your style?</div>
                    <div className="skin-opt">Minimal &amp; airy</div>
                    <div className="skin-opt sel">Bold &amp; expressive</div>
                    <div className="skin-opt">Classic</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========== SECTION 12 — Pricing ========== */}
      <section id="pricing" className="sec-pricing">
        <div className="wrap">
          <div className="sh center">
            <span className="eb"><span className="num">11</span> Pricing</span>
            <h2>Simple. <em>Honest.</em></h2>
            <p>14-day Pro trial. No credit card. Cancel anytime.</p>
          </div>

          <div className="billing-toggle">
            <button className={'bt-btn' + (billing === 'monthly' ? ' on' : '')} onClick={function() { setBilling('monthly'); }} type="button">Monthly</button>
            <button className={'bt-btn' + (billing === 'yearly' ? ' on' : '')} onClick={function() { setBilling('yearly'); }} type="button">Annual <span className="bt-save">Save up to 25%</span></button>
          </div>

          <div className="pricing-grid">
            {PLANS.map(function(p) {
              var price = billing === 'yearly' ? p.yearly : p.monthly;
              return (
                <div key={p.name} className={'price-card' + (p.featured ? ' feat' : '')}>
                  {p.featured && <span className="pop-badge">Most popular</span>}
                  <span className="pname">{p.name}</span>
                  <div className="price-val">${price}<span className="per"> / mo</span></div>
                  <div className="price-desc">{p.desc}</div>
                  <ul className="price-feats">
                    {p.features.map(function(f) {
                      return <li key={f}><span className="feat-ck">&check;</span>{f}</li>;
                    })}
                  </ul>
                  <Link href={p.href} className={'btn' + (p.featured ? '' : ' ghost')}>
                    {p.cta} <span className="ar">&rarr;</span>
                  </Link>
                </div>
              );
            })}
          </div>
          <div className="pricing-foot">Need more leads or emails? Add packs from $3/mo on any paid plan &middot; Cancel anytime</div>
        </div>
      </section>

      {/* ========== FAQ ========== */}
      <section id="faq" className="sec-faq">
        <div className="wrap narrow">
          <div className="sh center">
            <h2>Frequently asked questions</h2>
          </div>
          <div className="faq-list">
            {FAQS.map(function(f, i) {
              return (
                <button
                  key={f.q}
                  className={'faq-item' + (openFaq === i ? ' open' : '')}
                  onClick={function() { setOpenFaq(openFaq === i ? null : i); }}
                  type="button"
                >
                  <div className="faq-q">
                    {f.q}
                    <svg className="faq-chev" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                  </div>
                  {openFaq === i && <div className="faq-a">{f.a}</div>}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========== Final CTA ========== */}
      <section className="sec-cta">
        <div className="wrap">
          <div className="cta-inner">
            <h2>Your next lead is<br /><em>one quiz away.</em></h2>
            <p>Try everything free for 14 days. No credit card. No commitment.</p>
            <div className="cta-btns">
              <Link href={TRY_URL} className="btn">Start 14-day trial <span className="ar">&rarr;</span></Link>
              <Link href="#pricing" className="btn ghost">Talk to us</Link>
            </div>
            <div className="cta-meta">14-day Pro trial &middot; No card required</div>
          </div>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="foot">
        <div className="wrap">
          <div className="foot-grid">
            <div className="foot-brand">
              <div className="lg"><span className="mk">S</span>Squarespell</div>
              <p>The quiz platform for creators, agencies, and SaaS teams who care about conversion.</p>
              <div className="foot-social">
                <a href="https://instagram.com/squarespell" aria-label="Instagram">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" /><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
                </a>
                <a href="https://youtube.com/@squarespell" aria-label="YouTube">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2 29 29 0 00.46-5.25 29 29 0 00-.46-5.43z" /><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" /></svg>
                </a>
                <a href="https://x.com/squarespell" aria-label="X">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                </a>
              </div>
            </div>
            <div className="foot-cols">
              <div className="foot-col">
                <div className="foot-col-title">Product</div>
                <a href="#builder">Builder</a>
                <Link href="/templates">Templates</Link>
                <a href="#ai">AI Generation</a>
                <a href="#pricing">Pricing</a>
              </div>
              <div className="foot-col">
                <div className="foot-col-title">Resources</div>
                <a href="#">Documentation</a>
                <a href="#">Help center</a>
                <a href="#">Blog</a>
                <a href="#">Changelog</a>
              </div>
              <div className="foot-col">
                <div className="foot-col-title">Company</div>
                <a href="#">About</a>
                <a href="mailto:hello@squarespell.com">Contact</a>
                <a href="#">Partners</a>
              </div>
              <div className="foot-col">
                <div className="foot-col-title">Legal</div>
                <a href="/privacy">Privacy</a>
                <a href="/terms">Terms</a>
                <a href="#">Cookies</a>
              </div>
            </div>
          </div>
          <div className="foot-bottom">
            &copy; {new Date().getFullYear()} Squarespell. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ========== INLINE CSS ========== */
var CSS = `
/* ====================================================
   TWO-COLOR SYSTEM: #0F7377 + #F7F7F5
   ==================================================== */
.lp {
  --t: #0F7377;
  --p: #F7F7F5;
  --ink: color-mix(in srgb, var(--t) 92%, var(--p) 8%);
  --ink2: color-mix(in srgb, var(--t) 78%, var(--p) 22%);
  --ink3: color-mix(in srgb, var(--t) 55%, var(--p) 45%);
  --ink4: color-mix(in srgb, var(--t) 36%, var(--p) 64%);
  --line: color-mix(in srgb, var(--t) 16%, var(--p) 84%);
  --line2: color-mix(in srgb, var(--t) 9%, var(--p) 91%);
  --tint: color-mix(in srgb, var(--t) 5%, var(--p) 95%);
  --tint2: color-mix(in srgb, var(--t) 11%, var(--p) 89%);
  background: var(--p);
  color: var(--ink);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  min-height: 100vh;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
  font-size: 15px;
  line-height: 1.5;
}
.lp * { box-sizing: border-box; }
.lp a { color: inherit; text-decoration: none; }
::selection { background: var(--t); color: var(--p); }

/* Layout */
.wrap { max-width: 1280px; margin: 0 auto; padding: 0 40px; }
.wrap.narrow { max-width: 860px; }
section { padding: 140px 0; }

/* Buttons */
.btn {
  display: inline-flex; align-items: center; gap: 10px;
  padding: 14px 22px; border-radius: 999px;
  font-weight: 500; font-size: 14px;
  border: 1px solid var(--t); background: var(--t); color: var(--p);
  cursor: pointer; line-height: 1; font-family: inherit;
  transition: transform .25s cubic-bezier(.2,.8,.2,1), box-shadow .25s, background .2s;
}
.btn:hover { transform: translateY(-1px); background: color-mix(in srgb, var(--t) 86%, #000 14%); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.btn.ghost { background: transparent; color: var(--ink); border-color: color-mix(in srgb, var(--t) 30%, var(--p) 70%); }
.btn.ghost:hover { background: var(--tint); border-color: var(--t); }
.btn .ar { transition: transform .25s; }
.btn:hover .ar { transform: translateX(4px); }
.btn.sm { padding: 10px 18px; font-size: 13px; }
.btn.gb { padding: 11px 18px; font-size: 13px; border-radius: 8px; }

/* Eyebrow */
.eb {
  font-size: 11px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.14em; color: var(--t);
  display: inline-flex; align-items: center; gap: 12px;
}
.eb::before { content: ''; width: 22px; height: 1px; background: var(--t); opacity: 0.6; }
.eb .num { color: var(--ink); }

/* Section heads */
.sh { max-width: 880px; margin-bottom: 72px; }
.sh.center { margin-left: auto; margin-right: auto; text-align: center; }
.sh h2 {
  margin: 22px 0 0; font-weight: 600;
  font-size: 56px; line-height: 1.04; letter-spacing: -0.028em; color: var(--ink);
}
.sh h2 em { font-style: italic; color: var(--t); }
.sh p { margin: 22px 0 0; font-size: 18px; color: var(--ink3); max-width: 580px; line-height: 1.55; }
.sh.center p { margin-left: auto; margin-right: auto; }

/* ===== NAV ===== */
.nv {
  position: sticky; top: 16px; z-index: 50;
  margin: 0 auto; max-width: 1100px; padding: 0 16px;
}
.nv-i {
  background: color-mix(in srgb, var(--p) 80%, transparent);
  backdrop-filter: saturate(180%) blur(20px); -webkit-backdrop-filter: saturate(180%) blur(20px);
  border: 1px solid var(--line); border-radius: 999px;
  padding: 8px 8px 8px 22px;
  display: grid; grid-template-columns: 1fr auto 1fr; align-items: center;
  height: 56px;
  box-shadow: 0 8px 28px -16px color-mix(in srgb, var(--t) 40%, transparent);
}
.nv .lg {
  display: inline-flex; align-items: center; gap: 10px;
  font-weight: 600; font-size: 18px; letter-spacing: -0.01em; color: var(--ink);
}
.nv .lg .mk {
  width: 28px; height: 28px; border-radius: 8px;
  background: var(--t); color: var(--p);
  display: grid; place-items: center; font-size: 15px; line-height: 1;
}
.nv ul { list-style: none; margin: 0; padding: 0; display: flex; gap: 30px; font-size: 13px; color: var(--ink2); }
.nv ul a:hover { color: var(--t); }
.nv .rt { display: flex; gap: 10px; justify-content: flex-end; align-items: center; }
.nv .si { font-size: 13px; color: var(--ink2); padding: 0 8px; }
.nv .si:hover { color: var(--t); }

/* ===== HERO ===== */
.hero { padding: 80px 0 0; }
.hero-i { display: grid; grid-template-columns: 1fr 1.35fr; gap: 48px; align-items: center; }
.hero-l h1 {
  margin: 18px 0 0; font-size: 54px; line-height: 1;
  letter-spacing: -0.034em; font-weight: 600; color: var(--ink);
}
.hero-l h1 em { font-style: italic; color: var(--t); }
.hero-l .ld { margin: 22px 0 0; max-width: 430px; font-size: 17px; line-height: 1.55; color: var(--ink3); }
.uf {
  margin-top: 28px; background: var(--p);
  border: 1.5px solid var(--line); border-radius: 12px;
  padding: 6px 6px 6px 16px;
  display: flex; align-items: center; gap: 10px;
  max-width: 480px; transition: border-color .25s, box-shadow .25s;
}
.uf:focus-within { border-color: var(--t); box-shadow: 0 0 0 4px color-mix(in srgb, var(--t) 14%, transparent); }
.uf .pad { color: var(--ink3); font-size: 14px; font-weight: 500; }
.uf input {
  flex: 1; border: 0; outline: 0; background: transparent;
  font-family: inherit; font-size: 15px; color: var(--ink); padding: 12px 0;
}
.uf input::placeholder { color: var(--ink4); }
.hm { margin-top: 14px; display: flex; align-items: center; gap: 16px; }
.hm-i { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--ink3); }
.hm .ck {
  width: 14px; height: 14px; border-radius: 50%;
  background: color-mix(in srgb, var(--t) 14%, var(--p) 86%);
  display: inline-grid; place-items: center; color: var(--t); font-size: 9px; font-weight: 700;
}

/* HERO RIGHT — builder mockup */
.hero-r { position: relative; }
.tool {
  position: relative; background: var(--p);
  border: 1px solid var(--line); border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 30px 60px -30px color-mix(in srgb, var(--t) 40%, transparent), 0 12px 24px -12px color-mix(in srgb, var(--t) 18%, transparent);
}
.tool-top {
  padding: 10px 14px; border-bottom: 1px solid var(--line2);
  background: var(--tint); display: flex; align-items: center; gap: 10px;
}
.tool-top .dts { display: flex; gap: 5px; }
.tool-top .dts span { width: 8px; height: 8px; border-radius: 50%; background: var(--line); }
.tool-top .crumb { margin-left: 6px; font-size: 11px; color: var(--ink3); font-weight: 500; }
.tool-top .crumb b { color: var(--ink); font-weight: 600; }
.tool-top .lv {
  margin-left: auto; display: inline-flex; align-items: center; gap: 6px;
  font-size: 11px; font-weight: 500; color: var(--t);
}
.tool-top .lv::before {
  content: ''; width: 6px; height: 6px; border-radius: 50%;
  background: var(--t); animation: pls 1.6s infinite;
}
@keyframes pls { 0%,100% { box-shadow: 0 0 0 0 var(--t); } 70% { box-shadow: 0 0 0 5px transparent; } }

.tool-bd { display: grid; grid-template-columns: 140px 1fr 160px; min-height: 480px; }
.rail { border-right: 1px solid var(--line2); padding: 14px 8px; }
.rail h6 { margin: 0 0 8px 6px; font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: .1em; color: var(--ink3); }
.bk {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 8px; border-radius: 6px;
  font-size: 11.5px; color: var(--ink2); cursor: grab; border: 1px solid transparent;
}
.bk .ic {
  width: 18px; height: 18px; border-radius: 4px;
  background: var(--p); border: 1px solid var(--line);
  display: grid; place-items: center; color: var(--ink2); font-size: 10px;
}
.bk:hover { background: var(--tint); }
.bk.dr {
  background: var(--p); border: 1px dashed var(--t); color: var(--t);
  transform: translate(6px,-1px) rotate(-1deg);
  box-shadow: 0 12px 22px -10px color-mix(in srgb, var(--t) 40%, transparent);
  animation: dr 2.6s ease-in-out infinite;
}
.bk.dr .ic { border-color: var(--t); color: var(--t); }
@keyframes dr { 0%,100% { transform: translate(6px,-1px) rotate(-1deg); } 50% { transform: translate(10px,-4px) rotate(.8deg); } }

.cv {
  padding: 18px 22px;
  background: radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--t) 14%, transparent) 1px, transparent 0) 0 0/14px 14px, var(--tint);
  overflow: hidden;
}
.qc { background: var(--p); border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; margin-bottom: 8px; }
.qc.fc { border-color: var(--t); box-shadow: 0 0 0 2px color-mix(in srgb, var(--t) 14%, transparent); }
.qc .qm { font-size: 9.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .1em; color: var(--ink3); display: flex; justify-content: space-between; }
.qc .qm .ok { color: var(--t); }
.qc h4 { margin: 6px 0 0; font-size: 15px; font-weight: 600; line-height: 1.2; color: var(--ink); }
.qc .ops { margin-top: 10px; display: grid; gap: 5px; grid-template-columns: 1fr 1fr; }
.op {
  border: 1px solid var(--line); border-radius: 7px; padding: 8px 10px;
  font-size: 11.5px; color: var(--ink2); display: flex; align-items: center; gap: 8px; background: var(--p);
}
.op .b { width: 11px; height: 11px; border-radius: 50%; border: 1.5px solid var(--line); flex-shrink: 0; }
.op.sl { border-color: var(--t); background: var(--tint); color: var(--ink); }
.op.sl .b { border-color: var(--t); background: var(--t); box-shadow: inset 0 0 0 2px var(--p); }
.dz {
  border: 1.5px dashed var(--t);
  background: color-mix(in srgb, var(--t) 6%, var(--p) 94%);
  border-radius: 8px; padding: 10px; text-align: center;
  font-size: 10.5px; font-weight: 500; color: var(--t);
  text-transform: uppercase; letter-spacing: .08em;
  animation: dzp 1.8s ease-in-out infinite;
}
@keyframes dzp { 0%,100% { background: color-mix(in srgb, var(--t) 6%, var(--p) 94%); } 50% { background: color-mix(in srgb, var(--t) 14%, var(--p) 86%); } }

.sd { border-left: 1px solid var(--line2); padding: 14px 12px; }
.sd h6 { margin: 0 0 8px; font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: .1em; color: var(--ink3); }
.inp { margin-bottom: 10px; }
.inp .l { font-size: 10.5px; color: var(--ink3); margin-bottom: 4px; }
.inp .v { border: 1px solid var(--line); border-radius: 6px; padding: 6px 8px; font-size: 10.5px; color: var(--ink); display: flex; justify-content: space-between; align-items: center; }
.inp .sw { width: 14px; height: 14px; border-radius: 3px; background: var(--t); }
.inp .sg { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1px; border: 1px solid var(--line); border-radius: 6px; padding: 1px; }
.inp .sg b { padding: 4px 0; font-size: 9px; text-align: center; font-weight: 500; color: var(--ink2); border-radius: 4px; text-transform: uppercase; letter-spacing: .05em; }
.inp .sg b.on { background: var(--ink); color: var(--p); }

/* Logic rows in inspector */
.lg-rows { margin-top: 6px; }
.lg-r { display: flex; align-items: center; gap: 6px; font-size: 10px; color: var(--ink2); padding: 2px 0; }
.lg-r.sub { padding-left: 14px; }
.lg-r .pill { background: var(--ink); color: var(--p); padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 600; }
.lg-r .pill.t { background: var(--t); }
.lg-r .pill.m { background: transparent; color: var(--ink3); border: 1px solid var(--line); }

/* Floating tags */
.ft {
  position: absolute; background: var(--p); border: 1px solid var(--line);
  border-radius: 9px; padding: 8px 12px; font-size: 11px; color: var(--ink2);
  box-shadow: 0 12px 28px -14px color-mix(in srgb, var(--t) 40%, transparent);
  display: inline-flex; align-items: center; gap: 8px; white-space: nowrap;
}
.ft b { color: var(--ink); font-weight: 600; }
.ft .fic {
  width: 18px; height: 18px; border-radius: 5px;
  background: var(--t); color: var(--p);
  display: grid; place-items: center; font-size: 10px; font-weight: 600;
}
.ft.f1 { top: 14px; left: -30px; animation: f1 6s ease-in-out infinite; }
.ft.f2 { bottom: 60px; left: -40px; animation: f2 7s ease-in-out infinite; }
.ft.f3 { top: 120px; right: -32px; animation: f1 8s ease-in-out infinite; }
@keyframes f1 { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes f2 { 0%,100% { transform: translateY(0); } 50% { transform: translateY(7px); } }

/* Trust strip */
.trust {
  margin-top: 100px; padding: 36px 0;
  border-top: 1px solid var(--line); border-bottom: 1px solid var(--line);
  display: grid; grid-template-columns: 220px 1fr; gap: 60px; align-items: center;
}
.trust-lbl { font-size: 11px; text-transform: uppercase; letter-spacing: .12em; color: var(--ink3); line-height: 1.5; }
.trust-lbl b { color: var(--ink); font-weight: 500; }
.trust-logos { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
.tl { color: var(--ink); opacity: 0.55; transition: opacity .2s; white-space: nowrap; font-size: 18px; font-weight: 600; }
.tl:hover { opacity: 1; }
.tl.serif { font-family: Georgia, serif; font-size: 22px; letter-spacing: -0.01em; font-weight: 400; }
.tl.italic { font-family: Georgia, serif; font-style: italic; font-size: 22px; font-weight: 400; }
.tl.caps { font-size: 14px; text-transform: uppercase; letter-spacing: 0.18em; }

/* ===== SEC 2: BUILDER ===== */
.sec-builder {
  background: var(--ink); color: var(--p);
}
.sec-builder .sh h2 { color: var(--p); }
.sec-builder .sh h2 em { color: color-mix(in srgb, var(--t) 70%, var(--p) 30%); }
.sec-builder .sh p { color: color-mix(in srgb, var(--p) 70%, transparent); }
.sec-builder .eb { color: color-mix(in srgb, var(--t) 60%, var(--p) 40%); }
.sec-builder .eb::before { background: color-mix(in srgb, var(--t) 60%, var(--p) 40%); }
.sec-builder .eb .num { color: var(--p); }

.ix-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.ix-card {
  background: color-mix(in srgb, var(--p) 4%, transparent);
  border: 1px solid color-mix(in srgb, var(--p) 12%, transparent);
  border-radius: 22px; padding: 32px; overflow: hidden;
  min-height: 440px; display: flex; flex-direction: column;
}
.ix-card.span2 { grid-column: span 2; }
.ix-card .tag { font-size: 10.5px; text-transform: uppercase; letter-spacing: .12em; color: color-mix(in srgb, var(--t) 70%, var(--p) 30%); }
.ix-card h3 {
  margin: 12px 0 0; font-weight: 600;
  font-size: 32px; line-height: 1.05; letter-spacing: -0.018em; color: var(--p);
}
.ix-card h3 em { font-style: italic; color: color-mix(in srgb, var(--t) 70%, var(--p) 30%); }
.ix-card p { margin: 12px 0 0; font-size: 14px; color: color-mix(in srgb, var(--p) 65%, transparent); max-width: 420px; line-height: 1.55; }
.ix-card .vis { margin-top: auto; padding-top: 28px; }

/* Drag visual */
.drag-vis {
  background: color-mix(in srgb, var(--p) 6%, transparent);
  border: 1px solid color-mix(in srgb, var(--p) 10%, transparent);
  border-radius: 14px; padding: 18px;
  display: grid; grid-template-columns: 110px 1fr; gap: 14px; height: 220px;
}
.dv-lib {
  background: color-mix(in srgb, var(--p) 4%, transparent);
  border: 1px solid color-mix(in srgb, var(--p) 8%, transparent);
  border-radius: 10px; padding: 8px 6px;
}
.dv-item { padding: 6px 8px; margin-bottom: 4px; font-size: 10px; color: color-mix(in srgb, var(--p) 60%, transparent); border-radius: 6px; }
.dv-item.act { background: color-mix(in srgb, var(--t) 30%, transparent); color: var(--p); }
.dv-stack { display: flex; flex-direction: column; gap: 6px; }
.dv-ph {
  background: color-mix(in srgb, var(--p) 5%, transparent);
  border: 1px solid color-mix(in srgb, var(--p) 10%, transparent);
  border-radius: 8px; height: 32px; display: flex; align-items: center;
  padding: 0 12px; font-size: 10px; color: color-mix(in srgb, var(--p) 50%, transparent);
}
.dv-ph.snap {
  background: color-mix(in srgb, var(--t) 18%, transparent);
  border: 1px dashed color-mix(in srgb, var(--t) 70%, var(--p) 30%);
  color: color-mix(in srgb, var(--t) 70%, var(--p) 30%);
  animation: snapB 1.4s ease-in-out infinite;
}
@keyframes snapB { 0%,100% { background: color-mix(in srgb, var(--t) 12%, transparent); } 50% { background: color-mix(in srgb, var(--t) 28%, transparent); } }

/* Layout visual */
.lay-vis { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
.lt {
  background: color-mix(in srgb, var(--p) 5%, transparent);
  border: 1px solid color-mix(in srgb, var(--p) 12%, transparent);
  border-radius: 12px; aspect-ratio: 0.78; padding: 14px 12px;
  display: flex; flex-direction: column;
}
.lt.active { border-color: color-mix(in srgb, var(--t) 70%, var(--p) 30%); background: color-mix(in srgb, var(--t) 14%, transparent); }
.lt .lt-nm { font-size: 9px; text-transform: uppercase; letter-spacing: .1em; color: color-mix(in srgb, var(--p) 50%, transparent); margin-bottom: 8px; }
.lt.active .lt-nm { color: color-mix(in srgb, var(--t) 80%, var(--p) 20%); }
.lt .ll { height: 4px; border-radius: 2px; background: color-mix(in srgb, var(--p) 14%, transparent); margin-bottom: 4px; width: 100%; }
.lt .ll.s { width: 40%; }
.lt .ll.m { width: 70%; }
.lt .lb { margin-top: auto; height: 22px; border-radius: 6px; background: color-mix(in srgb, var(--p) 12%, transparent); }
.lt .lb.sm { height: 14px; width: 70%; margin-top: 6px; }
.lt.active .lb { background: color-mix(in srgb, var(--t) 60%, var(--p) 40%); }

/* Question type chips */
.qtypes { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
.ch {
  border: 1px solid color-mix(in srgb, var(--p) 14%, transparent);
  border-radius: 8px; padding: 8px 14px;
  font-size: 12px; color: color-mix(in srgb, var(--p) 75%, transparent);
  display: inline-flex; align-items: center; gap: 8px;
}
.ch .d {
  width: 6px; height: 6px; border-radius: 50%;
  background: color-mix(in srgb, var(--t) 60%, var(--p) 40%);
}

/* ===== SEC 3: AI ===== */
.sec-ai { background: var(--tint); }
.ai-flow { display: grid; grid-template-columns: 1fr auto 1fr auto 1fr; gap: 14px; align-items: start; }
.ai-arrow { display: flex; align-items: center; padding-top: 80px; color: var(--ink3); }
.ai-arrow svg { width: 60px; height: 24px; }
.ai-step { background: var(--p); border: 1px solid var(--line); border-radius: 18px; padding: 28px; }
.step-num { display: flex; align-items: center; gap: 10px; font-size: 11px; text-transform: uppercase; letter-spacing: .12em; color: var(--ink3); font-weight: 600; margin-bottom: 14px; }
.step-num .n { width: 24px; height: 24px; border-radius: 8px; background: var(--t); color: var(--p); display: grid; place-items: center; font-size: 12px; }
.step-title { font-size: 16px; font-weight: 600; color: var(--ink); margin-bottom: 18px; }
.url-bar {
  background: var(--tint); border: 1px solid var(--line); border-radius: 10px;
  padding: 10px 14px; display: flex; align-items: center; gap: 8px; font-size: 13px; margin-bottom: 14px;
}
.url-pad { color: var(--ink3); }
.url-u { color: var(--ink); font-weight: 500; }
.url-pulse { width: 8px; height: 8px; border-radius: 50%; background: var(--t); margin-left: auto; animation: pls 1.6s infinite; }
.crawl-list { display: flex; flex-direction: column; gap: 4px; }
.crawl-line { font-size: 11px; color: var(--ink3); display: flex; align-items: center; gap: 8px; }
.crawl-line .dot { width: 4px; height: 4px; border-radius: 50%; background: var(--t); }
.crawl-line .ok-tag { margin-left: auto; color: var(--t); font-weight: 600; }
.crawl-line.thinking { color: var(--t); animation: thinkAni 1.2s ease-in-out infinite; }
@keyframes thinkAni { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }

.extract { display: flex; flex-direction: column; gap: 6px; }
.ex-row { display: flex; gap: 10px; font-size: 12px; padding: 6px 0; border-bottom: 1px solid var(--line2); }
.ex-row .k { font-weight: 600; color: var(--t); text-transform: uppercase; letter-spacing: .08em; font-size: 10px; min-width: 60px; padding-top: 2px; }
.ex-row .val { color: var(--ink2); }
.gen-quiz { display: flex; flex-direction: column; gap: 6px; }
.gen-q { font-size: 13px; color: var(--ink2); display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--line2); }
.gen-q .nu { font-weight: 600; color: var(--t); font-size: 11px; }
.ai-meta { margin-top: 14px; display: flex; gap: 16px; font-size: 12px; color: var(--ink3); }
.ai-meta b { color: var(--ink); }

/* ===== SEC 4: LOGIC ===== */
.sec-logic { background: var(--p); }
.logic-stage { background: var(--p); border: 1px solid var(--line); border-radius: 18px; padding: 48px; }
.logic-diagram { position: relative; height: 460px; }
.logic-lines { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.logic-lines path { fill: none; stroke: var(--t); stroke-width: 1.5; stroke-dasharray: 5 5; opacity: .65; animation: ds 4s linear infinite; }
@keyframes ds { to { stroke-dashoffset: -20; } }
.node { position: absolute; background: var(--p); border: 1px solid var(--line); border-radius: 10px; padding: 11px 14px; width: 200px; box-shadow: 0 6px 14px -8px color-mix(in srgb, var(--t) 30%, transparent); }
.q-node { border-color: var(--t); }
.o-node { background: var(--t); color: var(--p); border-color: var(--t); width: 180px; }
.n-tag { font-size: 9.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .1em; color: var(--ink3); }
.o-node .n-tag { color: color-mix(in srgb, var(--p) 70%, transparent); }
.n-title { margin-top: 4px; font-size: 12px; font-weight: 600; color: var(--ink); line-height: 1.3; }
.o-node .n-title { color: var(--p); }
.n-ans { margin-top: 6px; font-size: 10px; color: var(--ink3); display: flex; gap: 4px; flex-wrap: wrap; }
.n-ans .a { background: var(--tint); border: 1px solid var(--line); padding: 2px 5px; border-radius: 3px; }
.n-ans .a.win { background: var(--t); color: var(--p); border-color: var(--t); }
.n-score { margin-top: 6px; font-size: 10px; color: var(--ink3); display: flex; justify-content: space-between; }
.n-score .pts { color: var(--t); font-weight: 600; }
.score-bar {
  margin-top: 32px; display: grid; grid-template-columns: auto 1fr auto;
  gap: 18px; align-items: center; padding: 16px 20px;
  border: 1px solid var(--line); border-radius: 10px; background: var(--tint);
}
.sb-l { font-size: 11px; font-weight: 600; color: var(--ink3); text-transform: uppercase; letter-spacing: .06em; }
.sb-track { height: 8px; background: var(--line); border-radius: 99px; position: relative; overflow: visible; }
.sb-track i { display: block; height: 100%; background: var(--t); width: 78%; border-radius: 99px; }
.sb-marks span { position: absolute; top: -4px; width: 1px; height: 16px; background: var(--ink4); }
.sb-v { font-size: 32px; font-weight: 600; color: var(--t); letter-spacing: -.02em; line-height: 1; }
.sb-v small { font-size: 11px; color: var(--ink3); font-weight: 500; }

/* ===== SEC 5: LEADS ===== */
.sec-leads { background: var(--tint); }
.leads-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.lead-card { background: var(--p); border: 1px solid var(--line); border-radius: 18px; padding: 36px; display: flex; align-items: center; justify-content: center; }
.lead-gate { max-width: 320px; }
.lg-step { display: flex; justify-content: space-between; font-size: 11px; color: var(--ink3); text-transform: uppercase; letter-spacing: .08em; margin-bottom: 16px; }
.lead-gate h5 { margin: 0 0 8px; font-size: 22px; font-weight: 600; line-height: 1.2; letter-spacing: -.01em; }
.lead-gate h5 em { font-style: italic; color: var(--t); }
.lead-gate p { margin: 0 0 16px; font-size: 13px; color: var(--ink3); line-height: 1.45; }
.lg-field {
  border: 1px solid var(--line); border-radius: 8px;
  padding: 10px 12px; margin-bottom: 8px; font-size: 13px;
  display: flex; align-items: center; gap: 8px; color: var(--ink2);
}
.lg-field.focus { border-color: var(--t); box-shadow: 0 0 0 3px color-mix(in srgb, var(--t) 14%, transparent); }
.lg-field .typed { color: var(--ink); border-right: 1px solid var(--ink); animation: cr 1s steps(2) infinite; padding-right: 1px; }
@keyframes cr { 50% { border-color: transparent; } }
.lg-submit {
  width: 100%; background: var(--t); color: var(--p); border: 0;
  padding: 12px; border-radius: 8px; font-family: inherit; font-weight: 500;
  font-size: 13px; cursor: pointer; margin-top: 4px;
}
.lg-agree { margin-top: 8px; font-size: 10px; color: var(--ink3); text-align: center; }
.lg-agree a { text-decoration: underline; }
.conv-card {
  background: var(--p); border: 1px solid var(--line); border-radius: 18px;
  padding: 36px; display: flex; flex-direction: column;
}
.conv-tag { font-size: 11px; font-weight: 600; color: var(--t); text-transform: uppercase; letter-spacing: .08em; }
.conv-card h3 { margin: 14px 0 0; font-size: 28px; font-weight: 600; letter-spacing: -.018em; line-height: 1.1; }
.conv-card h3 em { font-style: italic; color: var(--t); }
.conv-card p { margin: 14px 0 0; font-size: 14px; color: var(--ink3); line-height: 1.55; }
.conv-stats { margin-top: auto; padding-top: 24px; border-top: 1px solid var(--line2); display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.cs-label { font-size: 11px; font-weight: 600; color: var(--ink3); text-transform: uppercase; letter-spacing: .06em; }
.cs-value { margin-top: 6px; font-size: 42px; font-weight: 600; color: var(--t); letter-spacing: -.025em; line-height: 1; }
.cs-delta { margin-top: 6px; font-size: 11px; color: var(--ink3); }

/* ===== SEC 6: EMAIL ===== */
.sec-email { background: var(--p); }
.email-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.email-info, .auto-card { background: var(--tint); border: 1px solid var(--line); border-radius: 18px; padding: 32px; }
.email-info .tag, .auto-card .tag { font-size: 11px; font-weight: 600; color: var(--t); text-transform: uppercase; letter-spacing: .08em; }
.email-info h3, .auto-card h3 { margin: 12px 0 0; font-size: 28px; font-weight: 600; letter-spacing: -.018em; line-height: 1.1; }
.email-info h3 em, .auto-card h3 em { font-style: italic; color: var(--t); }
.email-info p, .auto-card p { margin: 12px 0 0; font-size: 14px; color: var(--ink3); line-height: 1.55; }
.merge-tags { margin-top: 18px; display: flex; flex-wrap: wrap; gap: 8px; }
.mt { background: var(--p); border: 1px solid var(--line); border-radius: 6px; padding: 4px 10px; font-size: 11px; color: var(--t); font-weight: 500; }
.auto-flow { margin-top: 24px; display: flex; flex-direction: column; gap: 0; }
.af-step {
  display: grid; grid-template-columns: 60px 1fr; gap: 12px;
  padding: 10px 0; border-bottom: 1px solid var(--line2); font-size: 13px;
}
.af-step .when { font-size: 10px; font-weight: 600; color: var(--t); text-transform: uppercase; letter-spacing: .06em; padding-top: 2px; }
.af-step .desc { color: var(--ink2); }
.af-step .desc i { font-style: normal; color: var(--ink3); }

/* ===== SEC 7: ANALYTICS ===== */
.sec-analytics { background: var(--tint); }
.ana-grid { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 16px; }
.ana-card { background: var(--p); border: 1px solid var(--line); border-radius: 18px; padding: 28px; }
.ana-card.tint { background: var(--tint); }
.ana-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
.ana-top h3 { font-size: 15px; font-weight: 600; color: var(--ink); margin: 0; }
.ana-live { font-size: 10px; font-weight: 600; color: var(--t); text-transform: uppercase; letter-spacing: .08em; background: color-mix(in srgb, var(--t) 10%, var(--p) 90%); padding: 4px 10px; border-radius: 99px; }
.ana-chart { margin-bottom: 18px; }
.ana-chart svg { width: 100%; height: 180px; }
.ana-insight {
  display: grid; grid-template-columns: auto 1fr auto; gap: 12px; align-items: center;
  background: var(--tint); border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px;
}
.ai-ic { width: 28px; height: 28px; border-radius: 8px; background: color-mix(in srgb, var(--t) 14%, var(--p)); color: var(--t); display: grid; place-items: center; font-weight: 700; font-size: 14px; }
.ai-t { font-size: 13px; font-weight: 500; color: var(--ink); }
.ai-s { font-size: 11px; color: var(--ink3); margin-top: 2px; }
.ai-d { font-size: 20px; font-weight: 700; color: var(--t); }

/* Drop-off list */
.drop-list { display: flex; flex-direction: column; gap: 0; margin-bottom: 18px; }
.drop-row { display: grid; grid-template-columns: 30px 1fr 120px 40px; gap: 8px; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--line2); font-size: 12px; }
.drop-row.danger { color: #c53030; }
.dq { font-weight: 600; color: var(--ink3); font-size: 11px; }
.dname { font-weight: 500; color: var(--ink); display: block; }
.dtype { font-size: 10px; color: var(--ink3); }
.dbar { height: 6px; background: var(--line); border-radius: 99px; overflow: hidden; }
.dbar i { display: block; height: 100%; background: var(--t); border-radius: 99px; }
.drop-row.danger .dbar i { background: #c53030; }
.dpct { font-weight: 600; color: var(--ink); text-align: right; }

/* A/B block */
.ab-block { margin-top: 18px; }
.ab-variant { background: var(--p); border: 1px solid var(--line); border-radius: 10px; padding: 14px; margin-bottom: 8px; }
.ab-variant.win { background: color-mix(in srgb, var(--t) 6%, var(--p)); border-color: var(--t); }
.ab-h { display: flex; justify-content: space-between; margin-bottom: 10px; }
.ab-nm { font-size: 13px; font-weight: 600; color: var(--ink); }
.ab-pl { font-size: 9px; font-weight: 600; background: var(--tint2); color: var(--ink2); padding: 3px 8px; border-radius: 99px; text-transform: uppercase; letter-spacing: .08em; }
.ab-variant.win .ab-pl { background: var(--t); color: var(--p); }
.ab-stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
.ab-sl { font-size: 9px; color: var(--ink3); font-weight: 600; text-transform: uppercase; letter-spacing: .06em; }
.ab-sv { font-size: 18px; font-weight: 600; color: var(--ink); margin-top: 2px; }
.ab-variant.win .ab-sv { color: var(--t); }
.ab-foot { margin-top: 8px; font-size: 12px; color: var(--ink2); display: flex; align-items: center; gap: 8px; }
.ab-ck { color: var(--t); font-weight: 700; }

/* ===== SEC 8: INTEGRATIONS ===== */
.sec-int { background: var(--p); }
.int-stage { text-align: center; }
.int-flow { width: 100%; max-width: 1080px; height: auto; margin-bottom: 48px; }
.int-tiles { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
.int-tile {
  border: 1px solid var(--line); border-radius: 10px;
  padding: 10px 20px; font-size: 13px; font-weight: 500; color: var(--ink2);
  background: var(--p); transition: all .2s;
}
.int-tile:hover { border-color: var(--t); color: var(--t); }

/* ===== SEC 9: TEMPLATES ===== */
.sec-tpl { background: var(--tint); }
.tpl-tabs { display: flex; gap: 8px; margin-bottom: 32px; flex-wrap: wrap; }
.tpl-tab {
  border: 1px solid var(--line); border-radius: 999px;
  padding: 8px 18px; font-size: 13px; font-weight: 500;
  color: var(--ink2); background: var(--p); cursor: pointer;
  font-family: inherit; transition: all .2s;
}
.tpl-tab.on { background: var(--t); color: var(--p); border-color: var(--t); }
.tpl-tab:hover:not(.on) { border-color: var(--t); color: var(--t); }
.tpl-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.tpl-card { display: block; }
.tpl-preview {
  background: var(--p); border: 1px solid var(--line); border-radius: 14px;
  padding: 24px; min-height: 220px; display: flex; align-items: center; justify-content: center;
  transition: all .25s;
}
.tpl-card:hover .tpl-preview { border-color: var(--t); box-shadow: 0 12px 28px -14px color-mix(in srgb, var(--t) 40%, transparent); }
.tpl-pq { max-width: 200px; }
.tpl-step { font-size: 10px; color: var(--ink3); text-transform: uppercase; letter-spacing: .08em; margin-bottom: 8px; }
.tpl-ttl { font-size: 15px; font-weight: 600; color: var(--ink); margin-bottom: 8px; line-height: 1.2; }
.tpl-desc { font-size: 11px; color: var(--ink3); line-height: 1.4; }
.tpl-meta { padding: 14px 4px; }
.tpl-nm { font-size: 14px; font-weight: 600; color: var(--ink); }
.tpl-cat { font-size: 12px; color: var(--ink3); margin-top: 2px; }

/* ===== SEC 10: EMBED ===== */
.sec-embed { background: var(--ink); color: var(--p); }
.sec-embed .sh h2 { color: var(--p); }
.sec-embed .sh h2 em { color: color-mix(in srgb, var(--t) 70%, var(--p) 30%); }
.sec-embed .sh p { color: color-mix(in srgb, var(--p) 65%, transparent); }
.sec-embed .eb { color: color-mix(in srgb, var(--t) 70%, var(--p) 30%); }
.sec-embed .eb::before { background: color-mix(in srgb, var(--t) 70%, var(--p) 30%); }
.embed-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.em-card {
  background: color-mix(in srgb, var(--p) 4%, transparent);
  border: 1px solid color-mix(in srgb, var(--p) 12%, transparent);
  border-radius: 14px; padding: 24px; display: flex; flex-direction: column; min-height: 380px;
}
.em-label { font-size: 11px; font-weight: 600; color: color-mix(in srgb, var(--t) 70%, var(--p) 30%); text-transform: uppercase; letter-spacing: .08em; }
.em-card h3 { margin: 8px 0 6px; font-size: 20px; font-weight: 600; color: var(--p); }
.em-card p { margin: 0; font-size: 13px; color: color-mix(in srgb, var(--p) 65%, transparent); line-height: 1.5; }
.em-demo { margin-top: auto; padding-top: 22px; }
.em-browser {
  background: var(--p); border: 1px solid color-mix(in srgb, var(--p) 14%, transparent);
  border-radius: 8px 8px 0 0; height: 28px; display: flex; align-items: center; gap: 8px; padding: 0 10px;
  border-bottom: 1px solid var(--line2);
}
.em-dots { display: flex; gap: 4px; }
.em-dots span { width: 6px; height: 6px; border-radius: 50%; background: var(--line); }
.em-url { font-size: 9px; color: var(--ink3); margin-left: 4px; }
.em-body {
  background: var(--p); border: 1px solid color-mix(in srgb, var(--p) 14%, transparent);
  border-top: 0; border-radius: 0 0 8px 8px; padding: 14px; min-height: 140px; position: relative; overflow: hidden; color: var(--ink);
}
.em-line { height: 4px; background: var(--line); border-radius: 99px; margin-bottom: 6px; }
.em-line.m { width: 70%; }
.em-line.s { width: 45%; }
.em-quiz-inline { background: var(--tint); border: 1px solid var(--line); border-radius: 8px; padding: 10px; margin: 10px 0; }
.em-qi-title { font-size: 10px; font-weight: 600; color: var(--ink); margin-bottom: 6px; }
.em-qi-opt { height: 16px; background: var(--line); border-radius: 4px; margin-bottom: 4px; }
.em-qi-opt.sel { background: var(--t); }
.em-popup {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
  background: var(--p); border: 1px solid var(--line); border-radius: 12px;
  padding: 16px; text-align: center; box-shadow: 0 20px 40px -20px rgba(0,0,0,0.2); width: 80%;
}
.em-x { position: absolute; top: 8px; right: 10px; color: var(--ink3); font-size: 16px; cursor: pointer; }
.em-pop-title { font-size: 11px; font-weight: 600; color: var(--ink); margin-bottom: 8px; }
.em-pop-cta { font-size: 10px; background: var(--t); color: var(--p); padding: 6px 14px; border-radius: 6px; display: inline-block; }
.em-tab {
  position: absolute; right: -1px; top: 50%; transform: translateY(-50%) rotate(-90deg);
  transform-origin: right center;
  background: var(--t); color: var(--p); font-size: 9px; font-weight: 600;
  padding: 6px 14px; border-radius: 6px 6px 0 0; text-transform: uppercase; letter-spacing: .06em;
}

/* ===== SEC 11: BRAND ===== */
.sec-brand { background: var(--p); }
.brand-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.skin {
  border-radius: 18px; padding: 24px; min-height: 360px;
  display: flex; flex-direction: column;
}
.skin.s1 { background: var(--p); border: 1px solid var(--line); }
.skin.s2 { background: var(--ink); border: 1px solid color-mix(in srgb, var(--p) 12%, transparent); }
.skin.s3 { background: var(--t); border: 1px solid color-mix(in srgb, var(--p) 20%, transparent); }
.skin-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 18px; }
.skin.s1 .skin-label { color: var(--ink3); }
.skin.s2 .skin-label { color: color-mix(in srgb, var(--p) 60%, transparent); }
.skin.s3 .skin-label { color: color-mix(in srgb, var(--p) 80%, transparent); }
.skin-qcard { margin-top: auto; border-radius: 12px; padding: 18px; }
.skin.s1 .skin-qcard { background: var(--tint); border: 1px solid var(--line); }
.skin.s2 .skin-qcard { background: color-mix(in srgb, var(--p) 6%, transparent); border: 1px solid color-mix(in srgb, var(--p) 14%, transparent); }
.skin.s3 .skin-qcard { background: color-mix(in srgb, var(--p) 10%, transparent); border: 1px solid color-mix(in srgb, var(--p) 20%, transparent); }
.skin-step { font-size: 10px; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 8px; }
.skin.s1 .skin-step { color: var(--ink3); }
.skin.s2 .skin-step, .skin.s3 .skin-step { color: color-mix(in srgb, var(--p) 60%, transparent); }
.skin-ttl { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
.skin.s1 .skin-ttl { color: var(--ink); }
.skin.s2 .skin-ttl, .skin.s3 .skin-ttl { color: var(--p); }
.skin-opt { padding: 8px 12px; border-radius: 8px; font-size: 12px; margin-bottom: 6px; }
.skin.s1 .skin-opt { background: var(--p); border: 1px solid var(--line); color: var(--ink2); }
.skin.s1 .skin-opt.sel { background: var(--tint); border-color: var(--t); color: var(--ink); }
.skin.s2 .skin-opt { background: color-mix(in srgb, var(--p) 5%, transparent); border: 1px solid color-mix(in srgb, var(--p) 12%, transparent); color: color-mix(in srgb, var(--p) 70%, transparent); }
.skin.s2 .skin-opt.sel { border-color: var(--t); color: var(--p); }
.skin.s3 .skin-opt { background: color-mix(in srgb, var(--p) 8%, transparent); border: 1px solid color-mix(in srgb, var(--p) 16%, transparent); color: color-mix(in srgb, var(--p) 80%, transparent); }
.skin.s3 .skin-opt.sel { border-color: var(--p); color: var(--p); background: color-mix(in srgb, var(--p) 16%, transparent); }

/* ===== SEC 12: PRICING ===== */
.sec-pricing { background: var(--tint); }
.billing-toggle { display: flex; gap: 4px; justify-content: center; margin-bottom: 48px; background: var(--p); border: 1px solid var(--line); border-radius: 999px; padding: 4px; width: fit-content; margin-left: auto; margin-right: auto; }
.bt-btn { border: 0; background: transparent; padding: 10px 20px; font-size: 13px; font-weight: 500; color: var(--ink2); cursor: pointer; border-radius: 999px; font-family: inherit; display: flex; align-items: center; gap: 8px; }
.bt-btn.on { background: var(--ink); color: var(--p); }
.bt-save { font-size: 10px; background: color-mix(in srgb, var(--t) 20%, transparent); color: var(--t); padding: 2px 8px; border-radius: 99px; }
.bt-btn.on .bt-save { background: color-mix(in srgb, var(--t) 40%, transparent); color: color-mix(in srgb, var(--t) 80%, var(--p) 20%); }
.pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; max-width: 1000px; margin: 0 auto; }
.price-card {
  background: var(--p); border: 1px solid var(--line); border-radius: 18px;
  padding: 32px; display: flex; flex-direction: column; position: relative;
}
.price-card.feat { border-color: var(--t); box-shadow: 0 20px 40px -20px color-mix(in srgb, var(--t) 40%, transparent); }
.pop-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: var(--t); color: var(--p); font-size: 10px; font-weight: 600; padding: 4px 14px; border-radius: 99px; text-transform: uppercase; letter-spacing: .06em; }
.pname { font-size: 16px; font-weight: 600; color: var(--ink); }
.price-val { margin-top: 12px; font-size: 48px; font-weight: 600; color: var(--ink); letter-spacing: -.02em; line-height: 1; }
.price-val .per { font-size: 14px; color: var(--ink3); font-weight: 500; }
.price-desc { margin-top: 8px; font-size: 13px; color: var(--ink3); }
.price-feats { list-style: none; margin: 24px 0; padding: 0; display: flex; flex-direction: column; gap: 10px; flex: 1; }
.price-feats li { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--ink2); }
.feat-ck { color: var(--t); font-weight: 700; font-size: 14px; }
.price-card .btn { margin-top: auto; justify-content: center; }
.pricing-foot { text-align: center; margin-top: 24px; font-size: 13px; color: var(--ink3); }

/* ===== FAQ ===== */
.sec-faq { background: var(--p); padding: 100px 0; }
.faq-list { display: flex; flex-direction: column; gap: 0; }
.faq-item {
  display: block; width: 100%; text-align: left; border: 0; background: transparent;
  padding: 20px 0; border-bottom: 1px solid var(--line); cursor: pointer; font-family: inherit;
}
.faq-q { display: flex; justify-content: space-between; align-items: center; font-size: 16px; font-weight: 500; color: var(--ink); }
.faq-chev { transition: transform .25s; color: var(--ink3); flex-shrink: 0; }
.faq-item.open .faq-chev { transform: rotate(180deg); }
.faq-a { margin-top: 12px; font-size: 14px; color: var(--ink3); line-height: 1.65; }

/* ===== FINAL CTA ===== */
.sec-cta { background: var(--ink); color: var(--p); padding: 120px 0; }
.cta-inner { text-align: center; max-width: 640px; margin: 0 auto; }
.cta-inner h2 { font-size: 52px; font-weight: 600; line-height: 1.04; letter-spacing: -.028em; color: var(--p); margin: 0 0 18px; }
.cta-inner h2 em { font-style: italic; color: color-mix(in srgb, var(--t) 70%, var(--p) 30%); }
.cta-inner p { font-size: 18px; color: color-mix(in srgb, var(--p) 70%, transparent); margin: 0 0 32px; }
.cta-btns { display: flex; gap: 12px; justify-content: center; }
.cta-meta { margin-top: 18px; font-size: 12px; color: color-mix(in srgb, var(--p) 55%, transparent); text-transform: uppercase; letter-spacing: .1em; }

/* ===== FOOTER ===== */
.foot { background: var(--p); border-top: 1px solid var(--line); padding: 60px 0 0; }
.foot-grid { display: grid; grid-template-columns: 1.2fr 2fr; gap: 60px; }
.foot-brand .lg { display: inline-flex; align-items: center; gap: 10px; font-weight: 600; font-size: 18px; color: var(--ink); margin-bottom: 12px; }
.foot-brand .lg .mk { width: 24px; height: 24px; border-radius: 6px; background: var(--t); color: var(--p); display: grid; place-items: center; font-size: 14px; }
.foot-brand p { font-size: 13px; color: var(--ink3); line-height: 1.55; margin: 0 0 18px; max-width: 280px; }
.foot-social { display: flex; gap: 14px; }
.foot-social a { color: var(--ink3); transition: color .2s; }
.foot-social a:hover { color: var(--t); }
.foot-cols { display: grid; grid-template-columns: repeat(4, 1fr); gap: 32px; }
.foot-col { display: flex; flex-direction: column; gap: 10px; }
.foot-col-title { font-size: 12px; font-weight: 600; color: var(--ink); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 4px; }
.foot-col a { font-size: 13px; color: var(--ink3); transition: color .2s; }
.foot-col a:hover { color: var(--t); }
.foot-bottom {
  margin-top: 48px; padding: 24px 0; border-top: 1px solid var(--line);
  font-size: 12px; color: var(--ink3); text-align: center;
}

/* ===== RESPONSIVE ===== */
@media (max-width: 1024px) {
  .hero-i { grid-template-columns: 1fr; gap: 40px; }
  .hero-r { max-width: 700px; }
  .tool-bd { grid-template-columns: 120px 1fr 140px; min-height: 380px; }
  .ix-grid { grid-template-columns: 1fr; }
  .ix-card.span2 { grid-column: span 1; }
  .ai-flow { grid-template-columns: 1fr; gap: 16px; }
  .ai-arrow { display: none; }
  .logic-diagram { height: auto; position: static; }
  .logic-diagram .node { position: static; width: 100%; margin-bottom: 12px; }
  .logic-lines { display: none; }
  .leads-grid, .email-grid, .ana-grid { grid-template-columns: 1fr; }
  .embed-grid, .brand-grid { grid-template-columns: 1fr; }
  .pricing-grid { grid-template-columns: 1fr; max-width: 400px; }
  .tpl-grid { grid-template-columns: repeat(2, 1fr); }
  .trust { grid-template-columns: 1fr; gap: 20px; }
  .trust-logos { flex-wrap: wrap; justify-content: flex-start; }
  .int-flow { display: none; }
  .foot-grid { grid-template-columns: 1fr; gap: 40px; }
  .foot-cols { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .wrap { padding: 0 20px; }
  section { padding: 80px 0; }
  .sh h2 { font-size: 36px; }
  .nv { top: 8px; }
  .nv-i { grid-template-columns: 1fr auto; height: auto; padding: 10px 14px; }
  .nv ul { display: none; }
  .hero-l h1 { font-size: 38px; }
  .tpl-grid { grid-template-columns: 1fr; }
  .cta-inner h2 { font-size: 36px; }
  .cta-btns { flex-direction: column; align-items: center; }
}
`;
