import { useState, useEffect, useRef } from "react";

// ─── Demo data (simulating a photography business) ───────────────────────────
const DEMO = {
  businessName: "Sarah Chen Photography",
  brandColor: "#c8a87c",
  questions: [
    {
      id: "q1",
      text: "What's the occasion?",
      subtitle: "We'll match you with the perfect photography package",
      options: [
        { id: "a", label: "Wedding", icon: "💍", desc: "Full-day coverage with albums" },
        { id: "b", label: "Portrait", icon: "📸", desc: "Individual, couple, or family" },
        { id: "c", label: "Brand", icon: "✨", desc: "Product shots & lifestyle content" },
        { id: "d", label: "Event", icon: "🎉", desc: "Corporate, party, or milestone" },
      ],
    },
    {
      id: "q2",
      text: "How many hours of coverage do you need?",
      subtitle: "This helps us recommend the right package tier",
      options: [
        { id: "a", label: "1–2 hours", icon: "⏱️", desc: "Mini session or headshots" },
        { id: "b", label: "3–5 hours", icon: "🕐", desc: "Half-day event or portrait set" },
        { id: "c", label: "6–8 hours", icon: "📅", desc: "Full-day wedding or event" },
        { id: "d", label: "Multi-day", icon: "🗓️", desc: "Destination or brand campaign" },
      ],
    },
    {
      id: "q3",
      text: "What's your budget range?",
      subtitle: "No judgment  -  we have options for every budget",
      options: [
        { id: "a", label: "Under $500", icon: "💰", desc: "Essential coverage" },
        { id: "b", label: "$500–$1,500", icon: "💎", desc: "Most popular range" },
        { id: "c", label: "$1,500–$3,000", icon: "⭐", desc: "Premium experience" },
        { id: "d", label: "$3,000+", icon: "👑", desc: "Full luxury package" },
      ],
    },
    {
      id: "q4",
      text: "What matters most to you?",
      subtitle: "Pick the one that resonates",
      options: [
        { id: "a", label: "Natural & candid", icon: "🌿", desc: "Real moments, no posing" },
        { id: "b", label: "Polished & editorial", icon: "💫", desc: "Magazine-worthy shots" },
        { id: "c", label: "Fast turnaround", icon: "⚡", desc: "Need photos quickly" },
        { id: "d", label: "Creative & unique", icon: "🎨", desc: "Artistic, one-of-a-kind" },
      ],
    },
    {
      id: "q5",
      text: "When's your date?",
      subtitle: "So we can check availability for you",
      options: [
        { id: "a", label: "This month", icon: "🔥", desc: "ASAP  -  let's do this" },
        { id: "b", label: "1–3 months", icon: "📆", desc: "Some time to plan" },
        { id: "c", label: "3–6 months", icon: "🗓️", desc: "Plenty of time" },
        { id: "d", label: "Just exploring", icon: "👀", desc: "No date yet" },
      ],
    },
  ],
  outcomes: [
    {
      id: "r1",
      title: "The Signature Collection",
      score: 92,
      description: "Based on your answers, our premium full-day wedding package is your perfect match. Includes 8 hours of coverage, second shooter, engagement session, and a 40-page fine art album.",
      cta: "Book a free consultation",
    },
    {
      id: "r2",
      title: "The Portrait Experience",
      score: 78,
      description: "You'd love our 2-hour portrait session  -  includes wardrobe guidance, 2 outfit changes, 30+ edited images, and an online gallery to share with family.",
      cta: "See portrait pricing",
    },
    {
      id: "r3",
      title: "The Brand Storyteller",
      score: 85,
      description: "Our brand photography package is built for businesses like yours  -  product photography, lifestyle shots, headshots, and social media content all in one session.",
      cta: "View brand portfolio",
    },
  ],
};

const BG = "#07090c";
const BG2 = "#0e1117";
const TEXT = "#f0f2f5";
const DIM = "rgba(240,242,245,0.45)";
const BORDER = "rgba(255,255,255,0.06)";

export default function QuizPrototype() {
  const [stage, setStage] = useState("intro"); // intro | question | email | result
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [email, setEmail] = useState("");
  const [animating, setAnimating] = useState(false);
  const [scoreAnim, setScoreAnim] = useState(0);
  const [mounted, setMounted] = useState(false);
  const accent = DEMO.brandColor;
  const total = DEMO.questions.length;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Animate score counter
  useEffect(() => {
    if (stage !== "result") return;
    const target = DEMO.outcomes[0].score;
    let current = 0;
    const iv = setInterval(() => {
      current += 2;
      if (current >= target) {
        current = target;
        clearInterval(iv);
      }
      setScoreAnim(current);
    }, 20);
    return () => clearInterval(iv);
  }, [stage]);

  const selectOption = (optId) => {
    setAnswers((prev) => ({ ...prev, [currentQ]: optId }));
    setAnimating(true);
    setTimeout(() => {
      if (currentQ < total - 1) {
        setCurrentQ((p) => p + 1);
      } else {
        setStage("email");
      }
      setAnimating(false);
    }, 500);
  };

  const goBack = () => {
    if (currentQ > 0) {
      setAnimating(true);
      setTimeout(() => {
        setCurrentQ((p) => p - 1);
        setAnimating(false);
      }, 350);
    } else {
      setStage("intro");
    }
  };

  const submitEmail = () => {
    if (email.includes("@")) {
      setStage("result");
    }
  };

  const progress = stage === "question" ? ((currentQ + (answers[currentQ] ? 1 : 0)) / total) * 100 : stage === "email" ? 95 : stage === "result" ? 100 : 0;

  const outcome = DEMO.outcomes[0];

  // Score ring SVG
  const ringRadius = 54;
  const ringCircum = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircum - (scoreAnim / 100) * ringCircum;

  const styles = {
    page: {
      minHeight: "100vh",
      background: BG,
      fontFamily: '"DM Sans", system-ui, -apple-system, sans-serif',
      color: TEXT,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    },
    progressBar: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      height: "3px",
      background: "rgba(255,255,255,0.04)",
      zIndex: 100,
    },
    progressFill: {
      height: "3px",
      background: accent,
      width: `${progress}%`,
      transition: "width 0.6s cubic-bezier(.16,1,.3,1)",
      borderRadius: "0 2px 2px 0",
    },
    center: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 24px",
      maxWidth: "640px",
      margin: "0 auto",
      width: "100%",
    },
    brandBadge: {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      padding: "6px 14px",
      background: `${accent}10`,
      border: `1px solid ${accent}20`,
      borderRadius: "100px",
      fontSize: "12px",
      fontWeight: 600,
      color: accent,
      marginBottom: "28px",
      letterSpacing: "0.02em",
    },
    optionGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "12px",
      width: "100%",
      maxWidth: "520px",
    },
  };

  return (
    <div style={styles.page}>
      {/* Progress bar */}
      {stage !== "intro" && (
        <div style={styles.progressBar}>
          <div style={styles.progressFill} />
        </div>
      )}

      {/* ═══════════════ INTRO ═══════════════ */}
      {stage === "intro" && (
        <div
          style={{
            ...styles.center,
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.7s cubic-bezier(.16,1,.3,1)",
          }}
        >
          <div style={styles.brandBadge}>
            <span style={{ fontSize: "14px" }}>📸</span>
            {DEMO.businessName}
          </div>

          <h1
            style={{
              fontSize: "clamp(32px, 5vw, 48px)",
              fontWeight: 800,
              letterSpacing: "-0.05em",
              lineHeight: 1.08,
              textAlign: "center",
              marginBottom: "12px",
            }}
          >
            Find your perfect
            <br />
            <span style={{ color: accent }}>photography package</span>
          </h1>

          <p
            style={{
              fontSize: "16px",
              color: DIM,
              textAlign: "center",
              lineHeight: 1.7,
              maxWidth: "420px",
              marginBottom: "40px",
            }}
          >
            Answer 5 quick questions. We'll match you with the package, style,
            and pricing that fits your needs.
          </p>

          <button
            onClick={() => setStage("question")}
            style={{
              height: "56px",
              padding: "0 40px",
              background: accent,
              color: BG,
              fontSize: "16px",
              fontWeight: 700,
              border: "none",
              borderRadius: "14px",
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "transform 0.15s",
              marginBottom: "16px",
            }}
          >
            Find my package →
          </button>

          <p style={{ fontSize: "12px", color: "rgba(240,242,245,0.2)" }}>
            Takes about 30 seconds · Free
          </p>

          {/* Social proof */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "48px",
            }}
          >
            <div style={{ display: "flex" }}>
              {["#e8b4b8", "#b4d4e8", "#d4e8b4", "#e8d4b4"].map((c, i) => (
                <div
                  key={i}
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background: c,
                    border: `2px solid ${BG}`,
                    marginLeft: i > 0 ? "-8px" : 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: BG,
                  }}
                >
                  {["S", "M", "J", "A"][i]}
                </div>
              ))}
            </div>
            <span style={{ fontSize: "13px", color: "rgba(240,242,245,0.3)" }}>
              <strong style={{ color: "rgba(240,242,245,0.5)" }}>2,400+</strong>{" "}
              people found their match
            </span>
          </div>
        </div>
      )}

      {/* ═══════════════ QUESTION ═══════════════ */}
      {stage === "question" && (
        <div style={styles.center}>
          {/* Back + counter */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              maxWidth: "520px",
              marginBottom: "32px",
            }}
          >
            <button
              onClick={goBack}
              style={{
                background: "none",
                border: "none",
                color: "rgba(240,242,245,0.3)",
                fontSize: "13px",
                cursor: "pointer",
                fontFamily: "inherit",
                padding: "6px 0",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              ← Back
            </button>
            <span
              style={{
                fontSize: "12px",
                color: "rgba(240,242,245,0.2)",
                fontWeight: 600,
              }}
            >
              {currentQ + 1} / {total}
            </span>
          </div>

          {/* Question text */}
          <div
            key={currentQ}
            style={{
              textAlign: "center",
              marginBottom: "32px",
              opacity: animating ? 0 : 1,
              transform: animating ? "translateY(-20px)" : "translateY(0)",
              transition: "all 0.4s cubic-bezier(.16,1,.3,1)",
            }}
          >
            <h2
              style={{
                fontSize: "clamp(24px, 4vw, 32px)",
                fontWeight: 800,
                letterSpacing: "-0.04em",
                lineHeight: 1.2,
                marginBottom: "8px",
              }}
            >
              {DEMO.questions[currentQ].text}
            </h2>
            <p style={{ fontSize: "14px", color: DIM }}>
              {DEMO.questions[currentQ].subtitle}
            </p>
          </div>

          {/* Option cards  -  2x2 grid */}
          <div
            key={`grid-${currentQ}`}
            style={{
              ...styles.optionGrid,
              opacity: animating ? 0 : 1,
              transform: animating ? "translateY(16px)" : "translateY(0)",
              transition: "all 0.4s cubic-bezier(.16,1,.3,1) 0.1s",
            }}
          >
            {DEMO.questions[currentQ].options.map((opt) => {
              const sel = answers[currentQ] === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => selectOption(opt.id)}
                  style={{
                    padding: "20px 16px",
                    background: sel
                      ? `${accent}12`
                      : "rgba(255,255,255,0.02)",
                    border: `1.5px solid ${sel ? `${accent}40` : BORDER}`,
                    borderRadius: "16px",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.2s cubic-bezier(.16,1,.3,1)",
                  }}
                >
                  <div style={{ fontSize: "28px", marginBottom: "8px" }}>
                    {opt.icon}
                  </div>
                  <div
                    style={{
                      fontSize: "15px",
                      fontWeight: 700,
                      marginBottom: "4px",
                      color: sel ? TEXT : "rgba(240,242,245,0.7)",
                    }}
                  >
                    {opt.label}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: sel
                        ? "rgba(240,242,245,0.5)"
                        : "rgba(240,242,245,0.25)",
                      lineHeight: 1.4,
                    }}
                  >
                    {opt.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════ EMAIL CAPTURE ═══════════════ */}
      {stage === "email" && (
        <div
          style={{
            ...styles.center,
            animation: "fadeUp 0.6s cubic-bezier(.16,1,.3,1) both",
          }}
        >
          {/* Score ring preview (animated) */}
          <div style={{ position: "relative", marginBottom: "28px" }}>
            <svg width="140" height="140" viewBox="0 0 140 140">
              <circle
                cx="70"
                cy="70"
                r={ringRadius}
                stroke="rgba(255,255,255,0.04)"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="70"
                cy="70"
                r={ringRadius}
                stroke={accent}
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={ringCircum}
                strokeDashoffset={ringCircum * 0.15}
                transform="rotate(-90 70 70)"
                style={{ transition: "stroke-dashoffset 1s ease" }}
              />
            </svg>
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "14px",
                  color: "rgba(240,242,245,0.25)",
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  marginBottom: "2px",
                }}
              >
                Match
              </div>
              <div
                style={{
                  fontSize: "32px",
                  fontWeight: 800,
                  color: accent,
                  letterSpacing: "-0.04em",
                }}
              >
                ???
              </div>
            </div>
          </div>

          <h2
            style={{
              fontSize: "26px",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              textAlign: "center",
              marginBottom: "8px",
            }}
          >
            Your match is ready
          </h2>
          <p
            style={{
              fontSize: "15px",
              color: DIM,
              textAlign: "center",
              marginBottom: "28px",
              lineHeight: 1.6,
              maxWidth: "380px",
            }}
          >
            Enter your email to see your personalized package recommendation and
            exclusive pricing.
          </p>

          <div style={{ width: "100%", maxWidth: "380px" }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitEmail()}
              placeholder="your@email.com"
              autoFocus
              style={{
                width: "100%",
                height: "52px",
                background: "rgba(255,255,255,0.03)",
                border: `1.5px solid ${BORDER}`,
                borderRadius: "14px",
                color: TEXT,
                fontSize: "16px",
                padding: "0 18px",
                outline: "none",
                fontFamily: "inherit",
                boxSizing: "border-box",
                textAlign: "center",
                marginBottom: "10px",
              }}
            />
            <button
              onClick={submitEmail}
              disabled={!email.includes("@")}
              style={{
                width: "100%",
                height: "52px",
                background: email.includes("@") ? accent : `${accent}30`,
                color: BG,
                border: "none",
                borderRadius: "14px",
                fontSize: "15px",
                fontWeight: 700,
                cursor: email.includes("@") ? "pointer" : "default",
                fontFamily: "inherit",
                transition: "all 0.2s",
              }}
            >
              See my results →
            </button>
          </div>

          <p
            style={{
              fontSize: "11px",
              color: "rgba(240,242,245,0.15)",
              marginTop: "16px",
              textAlign: "center",
            }}
          >
            We'll send your recommendation  -  no spam, ever.
          </p>
        </div>
      )}

      {/* ═══════════════ RESULT ═══════════════ */}
      {stage === "result" && (
        <div
          style={{
            ...styles.center,
            animation: "fadeUp 0.6s cubic-bezier(.16,1,.3,1) both",
          }}
        >
          {/* Score ring  -  animated */}
          <div style={{ position: "relative", marginBottom: "24px" }}>
            <svg width="160" height="160" viewBox="0 0 160 160">
              <circle
                cx="80"
                cy="80"
                r="62"
                stroke="rgba(255,255,255,0.04)"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="80"
                cy="80"
                r="62"
                stroke={accent}
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 62}
                strokeDashoffset={
                  2 * Math.PI * 62 - (scoreAnim / 100) * 2 * Math.PI * 62
                }
                transform="rotate(-90 80 80)"
                style={{ transition: "stroke-dashoffset 0.3s ease" }}
              />
            </svg>
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  color: "rgba(240,242,245,0.25)",
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginBottom: "2px",
                }}
              >
                Match
              </div>
              <div
                style={{
                  fontSize: "36px",
                  fontWeight: 800,
                  color: accent,
                  letterSpacing: "-0.04em",
                }}
              >
                {scoreAnim}%
              </div>
            </div>
          </div>

          {/* Result card */}
          <div
            style={{
              width: "100%",
              maxWidth: "480px",
              background: `${accent}06`,
              border: `1px solid ${accent}15`,
              borderRadius: "20px",
              padding: "28px 24px",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontSize: "11px",
                color: accent,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                fontWeight: 700,
                marginBottom: "8px",
              }}
            >
              Your recommendation
            </p>
            <h2
              style={{
                fontSize: "24px",
                fontWeight: 800,
                letterSpacing: "-0.04em",
                marginBottom: "12px",
              }}
            >
              {outcome.title}
            </h2>
            <p
              style={{
                fontSize: "15px",
                color: DIM,
                lineHeight: 1.7,
                marginBottom: "24px",
              }}
            >
              {outcome.description}
            </p>
            <button
              style={{
                height: "52px",
                padding: "0 32px",
                background: accent,
                color: BG,
                border: "none",
                borderRadius: "14px",
                fontSize: "15px",
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {outcome.cta} →
            </button>
          </div>

          {/* Powered by */}
          <div
            style={{
              marginTop: "32px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <div
              style={{
                width: "16px",
                height: "16px",
                background: "#D2FF1D",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: "8px", fontWeight: 800, color: BG }}>
                ⚡
              </span>
            </div>
            <span
              style={{
                fontSize: "11px",
                color: "rgba(240,242,245,0.15)",
              }}
            >
              Powered by Squarespell
            </span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        input:focus {
          border-color: ${accent}50 !important;
          box-shadow: 0 0 0 4px ${accent}10 !important;
        }
        button:active { transform: scale(0.97) !important; }
      `}</style>
    </div>
  );
}
