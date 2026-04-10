import { useState, useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════
   SQUARESPELL ·COMPLETE SYSTEM PROTOTYPE
   9 Screens · Full User Journey + Dashboard + Editor
   ═══════════════════════════════════════════════ */

const B = {
  bg: "#07090c", s: "#0d1117", el: "#161b22",
  br: "#1b1f27", t: "#f0f2f5", tm: "#8b919a",
  a: "#D2FF1D", ad: "rgba(210,255,29,0.08)",
  ok: "#34d399", warn: "#fbbf24", err: "#f87171",
  f: "'DM Sans', -apple-system, system-ui, sans-serif",
};

const QUIZ = {
  title: "Find Your Perfect Wellness Routine",
  brand: "Bloom & Balance",
  colors: ["#2d5a3d", "#e8d5b7"],
  questions: [
    { text: "What's your biggest wellness challenge right now?", options: ["I can't stay consistent with routines", "Stress is running the show", "My energy crashes by 2pm every day", "I don't know where to start"] },
    { text: "How much time can you realistically commit per day?", options: ["5 minutes, being honest", "15 to 20 minutes in the morning", "30+ minutes, ready to go deep"] },
    { text: "Which of these sounds most like you?", options: ["I've tried everything and nothing sticks", "I'm just getting into wellness", "I know what works but need accountability", "I want something backed by science"] },
    { text: "What does a win look like for you in 30 days?", options: ["Sleeping through the night", "Having energy after work", "Feeling less anxious overall", "Building one solid habit"] },
    { text: "Where do you usually look for wellness advice?", options: ["Instagram and TikTok", "Podcasts and books", "My doctor or therapist"] },
  ],
  result: { pct: 92, title: "The Guided Reset Program", desc: "You know what you want but need structure. Daily micro-practices, weekly check-ins, and a clear path from scattered to centered.", cta: "Start Your Reset" },
};

const circ = 2 * Math.PI * 54;

// ─── Shared components ───
function Pill({ children, active = true, outline = false, small = false, onClick, style = {} }) {
  return (
    <div onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      background: outline ? "transparent" : active ? B.a : B.br,
      color: outline ? B.a : active ? B.bg : B.tm,
      border: outline ? `1px solid ${B.a}` : "none",
      borderRadius: 100, padding: small ? "6px 16px" : "12px 36px",
      fontSize: small ? 13 : 15, fontWeight: 600, fontFamily: B.f,
      cursor: onClick ? "pointer" : "default", letterSpacing: "-0.01em",
      transition: "all 0.2s ease", ...style,
    }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ padding: "16px 0", marginBottom: 0, borderBottom: `1px solid ${B.br}` }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: B.a, textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {children}
      </span>
    </div>
  );
}

function PhoneFrame({ children, h = 680 }) {
  return (
    <div style={{
      width: 390, minHeight: h, background: B.bg, borderRadius: 24,
      border: `1px solid ${B.br}`, overflow: "hidden", position: "relative",
      boxShadow: "0 24px 80px rgba(0,0,0,0.5)", margin: "0 auto",
    }}>
      {children}
    </div>
  );
}

function DesktopFrame({ children, h = 540 }) {
  return (
    <div style={{
      width: "100%", maxWidth: 900, minHeight: h, background: B.bg, borderRadius: 12,
      border: `1px solid ${B.br}`, overflow: "hidden", position: "relative",
      boxShadow: "0 24px 80px rgba(0,0,0,0.5)", margin: "0 auto",
    }}>
      {/* Title bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", borderBottom: `1px solid ${B.br}` }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
        <span style={{ fontSize: 11, color: B.tm, marginLeft: 12 }}>app.squarespell.com</span>
      </div>
      {children}
    </div>
  );
}

/* ═══════ SCREEN 1: THE HOOK ═══════ */
function Screen1() {
  return (
    <PhoneFrame h={480}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "0 32px" }}>
        <h2 style={{ fontSize: 34, fontWeight: 600, color: B.t, textAlign: "center", lineHeight: 1.1, letterSpacing: "-0.03em", margin: 0 }}>
          Turn visitors<br/>into leads
        </h2>
        <p style={{ fontSize: 15, color: B.tm, marginTop: 10, marginBottom: 44, textAlign: "center" }}>
          Paste your URL. AI does the rest.
        </p>
        <div style={{ width: "100%", display: "flex", alignItems: "center", borderBottom: `2px solid ${B.a}`, paddingBottom: 10, gap: 8 }}>
          <span style={{ fontSize: 14, color: B.tm, flexShrink: 0 }}>https://</span>
          <span style={{ flex: 1, fontSize: 18, color: B.t, fontWeight: 500 }}>bloomandbalance.com</span>
          <Pill small>Generate</Pill>
        </div>
      </div>
    </PhoneFrame>
  );
}

/* ═══════ SCREEN 2: THE BUILD ═══════ */
function Screen2() {
  return (
    <DesktopFrame h={420}>
      <div style={{ display: "flex", height: 420 }}>
        {/* Left: Live preview */}
        <div style={{ flex: 1, padding: "28px 24px", borderRight: `1px solid ${B.br}`, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <h3 style={{ fontSize: 20, fontWeight: 600, color: B.t, margin: "0 0 6px", letterSpacing: "-0.02em" }}>
            {QUIZ.title}
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 24 }}>
            {QUIZ.colors.map((c,i) => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />)}
            <span style={{ fontSize: 11, color: B.tm }}>{QUIZ.brand}</span>
          </div>
          <p style={{ fontSize: 15, fontWeight: 500, color: B.t, opacity: 0.9, marginBottom: 12 }}>
            {QUIZ.questions[0].text}
          </p>
          {QUIZ.questions[0].options.slice(0,3).map((o,i) => (
            <div key={i} style={{ padding: "10px 0", borderBottom: `1px solid ${B.br}`, fontSize: 13, color: B.tm }}>{o}</div>
          ))}
          <div style={{ marginTop: 16, padding: "8px 12px", background: B.ad, borderRadius: 6, border: `1px solid ${B.a}33`, display: "inline-block" }}>
            <span style={{ fontSize: 12, color: B.a, fontWeight: 500 }}>3 outcomes ready</span>
          </div>
        </div>
        {/* Right: Steps */}
        <div style={{ width: 260, padding: "28px 24px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <p style={{ fontSize: 10, color: B.tm, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px", fontWeight: 500 }}>Building for</p>
          <p style={{ fontSize: 14, color: B.t, fontWeight: 500, margin: "0 0 24px" }}>bloomandbalance.com</p>
          {[
            { l: "Website scanned", done: true },
            { l: "Brand extracted", done: true },
            { l: "Generating questions", active: true },
            { l: "Building outcomes" },
            { l: "Finalizing" },
          ].map((s,i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < 4 ? `1px solid ${B.br}` : "none" }}>
              <div style={{
                width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: s.done ? B.a : "transparent",
                border: s.done ? "none" : s.active ? `2px solid ${B.a}` : `1px solid ${B.br}`,
              }}>
                {s.done && <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 4" stroke={B.bg} strokeWidth="2" strokeLinecap="round"/></svg>}
                {s.active && <div style={{ width: 5, height: 5, borderRadius: "50%", background: B.a, animation: "pulse 1.2s ease infinite" }} />}
              </div>
              <span style={{ fontSize: 13, color: s.done || s.active ? B.t : B.tm, fontWeight: s.active ? 500 : 400 }}>
                {s.l}{s.active && "..."}
              </span>
            </div>
          ))}
          <div style={{ marginTop: 20 }}>
            <Pill small style={{ opacity: 0.4 }}>Preview your quiz →</Pill>
          </div>
        </div>
      </div>
    </DesktopFrame>
  );
}

/* ═══════ SCREEN 3: FULL QUIZ PREVIEW ═══════ */
function Screen3() {
  return (
    <DesktopFrame h={600}>
      <div style={{ display: "flex", height: 600 }}>
        {/* Left: Full quiz ·all questions visible */}
        <div style={{ flex: 1, overflow: "auto", padding: "24px 28px", borderRight: `1px solid ${B.br}` }}>
          {/* Quiz header */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              {QUIZ.colors.map((c, i) => <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />)}
              <span style={{ fontSize: 11, color: B.tm }}>{QUIZ.brand}</span>
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 600, color: B.t, margin: 0, letterSpacing: "-0.02em" }}>{QUIZ.title}</h3>
          </div>

          {/* All questions */}
          {QUIZ.questions.map((q, qi) => (
            <div key={qi} style={{ marginBottom: 20, padding: "16px 18px", background: B.s, borderRadius: 10, border: `1px solid ${B.br}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 6, background: B.ad, border: `1px solid ${B.a}22`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, color: B.a, flexShrink: 0,
                }}>
                  {qi + 1}
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: B.t }}>{q.text}</span>
              </div>
              {q.options.map((o, oi) => (
                <div key={oi} style={{
                  padding: "9px 12px", marginLeft: 30, fontSize: 13, color: B.tm,
                  borderLeft: `2px solid ${B.br}`,
                  borderBottom: oi < q.options.length - 1 ? `1px solid ${B.br}09` : "none",
                }}>
                  {o}
                </div>
              ))}
            </div>
          ))}

          {/* Outcomes */}
          <div style={{ marginTop: 8, padding: "16px 18px", background: B.s, borderRadius: 10, border: `1px solid ${B.br}` }}>
            <p style={{ fontSize: 10, color: B.a, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px", fontWeight: 600 }}>
              Outcomes
            </p>
            {[
              { title: "The Guided Reset", desc: "For people who need structure and accountability" },
              { title: "The Quick Start", desc: "For beginners who want simple daily habits" },
              { title: "The Deep Dive", desc: "For committed individuals ready for intensive practice" },
            ].map((out, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0", borderBottom: i < 2 ? `1px solid ${B.br}` : "none" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: B.a, marginTop: 6, flexShrink: 0, opacity: 0.6 }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: B.t, margin: 0 }}>{out.title}</p>
                  <p style={{ fontSize: 12, color: B.tm, margin: "2px 0 0" }}>{out.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Summary + Actions */}
        <div style={{ width: 260, padding: "24px 20px", display: "flex", flexDirection: "column" }}>
          <p style={{ fontSize: 10, color: B.tm, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px", fontWeight: 500 }}>Quiz summary</p>
          <h4 style={{ fontSize: 16, fontWeight: 600, color: B.t, margin: "0 0 16px", letterSpacing: "-0.01em" }}>{QUIZ.title}</h4>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {[
              { l: "Questions", v: "5" },
              { l: "Outcomes", v: "3" },
              { l: "Email gate", v: "ON" },
              { l: "Brand match", v: "Auto" },
            ].map(s => (
              <div key={s.l} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: B.s, borderRadius: 8, border: `1px solid ${B.br}` }}>
                <span style={{ fontSize: 12, color: B.tm }}>{s.l}</span>
                <span style={{ fontSize: 12, color: B.t, fontWeight: 600 }}>{s.v}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 24 }}>
            {QUIZ.colors.map((c, i) => <div key={i} style={{ width: 14, height: 14, borderRadius: "50%", background: c, border: `1px solid ${B.br}` }} />)}
            <span style={{ fontSize: 11, color: B.tm, marginLeft: 2 }}>Brand colors</span>
          </div>

          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
            <Pill style={{ width: "100%", textAlign: "center", justifyContent: "center" }}>Publish for free</Pill>
            <div style={{
              padding: "10px", border: `1px solid ${B.br}`, borderRadius: 100, textAlign: "center",
              fontSize: 13, color: B.tm, fontWeight: 500, cursor: "pointer",
            }}>
              Edit before publishing
            </div>
          </div>
        </div>
      </div>
    </DesktopFrame>
  );
}

/* ═══════ SCREEN 4: QUIZ READY ·PUBLISH ═══════ */
function Screen4() {
  return (
    <PhoneFrame h={540}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "0 32px" }}>
        {/* Animated checkmark ring */}
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: B.ad, border: `2px solid ${B.a}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 28 }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M6 12L10.5 16.5L18 8" stroke={B.a} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 style={{ fontSize: 30, fontWeight: 600, color: B.t, letterSpacing: "-0.03em", textAlign: "center", lineHeight: 1.15 }}>Your quiz is ready</h2>
        <p style={{ fontSize: 15, color: B.tm, marginTop: 8, marginBottom: 12, textAlign: "center", lineHeight: 1.5 }}>
          AI generated 5 questions and 3 outcomes<br/>personalized for {QUIZ.brand}.
        </p>

        {/* Quiz summary card */}
        <div style={{ width: "100%", background: B.s, borderRadius: 12, border: `1px solid ${B.br}`, padding: "16px 18px", margin: "12px 0 28px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: B.t }}>{QUIZ.title}</span>
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            {[
              { l: "Questions", v: "5" },
              { l: "Outcomes", v: "3" },
              { l: "Email gate", v: "ON" },
            ].map(s => (
              <div key={s.l}>
                <p style={{ fontSize: 10, color: B.tm, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.l}</p>
                <p style={{ fontSize: 14, color: B.t, fontWeight: 600, margin: "2px 0 0" }}>{s.v}</p>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
            {QUIZ.colors.map((c,i) => <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />)}
            <span style={{ fontSize: 11, color: B.tm }}>Brand colors extracted</span>
          </div>
        </div>

        <Pill>Publish for free</Pill>
        <p style={{ fontSize: 12, color: B.tm, marginTop: 14, textDecoration: "underline", textUnderlineOffset: 3, cursor: "pointer" }}>Edit before publishing</p>
      </div>
    </PhoneFrame>
  );
}

/* Screen 5 removed ·visitor preview belongs in the editor, not the publish flow */

/* ═══════ SCREEN 6: SIGN UP ═══════ */
function Screen6() {
  return (
    <PhoneFrame h={460}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "0 32px" }}>
        <h2 style={{ fontSize: 26, fontWeight: 600, color: B.t, letterSpacing: "-0.03em", textAlign: "center", margin: "0 0 6px" }}>Publish your quiz</h2>
        <p style={{ fontSize: 14, color: B.tm, marginBottom: 32, textAlign: "center" }}>Create a free account to go live.</p>
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "12px", background: "#fff", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}>
            <svg width="16" height="16" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
            Continue with Google
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "12px", background: "#000", border: "1px solid #333", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#fff" }}>
            <svg width="14" height="17" viewBox="0 0 16 19" fill="#fff"><path d="M13.545 10.239c-.022-2.234 1.823-3.306 1.906-3.359-.037-.054-1.494-1.56-1.494-1.56S12.197 3.5 10.756 3.5c-1.378 0-2.81.823-3.514.823S5.414 3.542 4.22 3.573C2.726 3.604 1.345 4.51.642 5.928c-1.444 2.845-.37 7.056 1.016 9.365.695 1.128 1.51 2.388 2.578 2.343 1.044-.046 1.43-.668 2.688-.668s1.61.668 2.7.645c1.116-.022 1.816-1.131 2.479-2.27.803-1.307 1.125-2.57 1.14-2.636-.026-.01-2.18-.836-2.198-3.322v-.146zM11.429 2.32C12.006 1.615 12.4.646 12.295 0c-.82.035-1.84.574-2.43 1.268-.521.61-.993 1.61-.871 2.545.924.072 1.867-.474 2.435-1.494z"/></svg>
            Continue with Apple
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "2px 0" }}>
            <div style={{ flex: 1, height: 1, background: B.br }} />
            <span style={{ fontSize: 12, color: B.tm }}>or</span>
            <div style={{ flex: 1, height: 1, background: B.br }} />
          </div>
          <div style={{ padding: "12px", border: `1px solid ${B.br}`, borderRadius: 10, fontSize: 14, fontWeight: 500, color: B.t, textAlign: "center" }}>
            Sign up with email
          </div>
        </div>
        <p style={{ fontSize: 11, color: B.tm, marginTop: 20, opacity: 0.5, textAlign: "center" }}>
          Your quiz is saved. It goes live the moment you sign up.
        </p>
      </div>
    </PhoneFrame>
  );
}

/* ═══════ SCREEN 7: DASHBOARD ═══════ */
function Screen7() {
  return (
    <DesktopFrame h={520}>
      <div style={{ display: "flex", height: 520 }}>
        {/* Sidebar */}
        <div style={{ width: 180, borderRight: `1px solid ${B.br}`, padding: "20px 0", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "0 16px 20px", borderBottom: `1px solid ${B.br}` }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: B.t, letterSpacing: "-0.02em" }}>squarespell</span>
          </div>
          {[
            { l: "Overview", active: true },
            { l: "Quizzes" },
            { l: "Leads" },
            { l: "Settings" },
          ].map((item, i) => (
            <div key={i} style={{
              padding: "10px 16px", fontSize: 13, fontWeight: item.active ? 600 : 400,
              color: item.active ? B.a : B.tm, cursor: "pointer",
              borderLeft: item.active ? `2px solid ${B.a}` : "2px solid transparent",
              background: item.active ? B.ad : "transparent",
            }}>
              {item.l}
            </div>
          ))}
          <div style={{ marginTop: "auto", padding: "12px 16px", borderTop: `1px solid ${B.br}`, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: B.el, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 10, color: B.tm, fontWeight: 600 }}>B</span>
            </div>
            <span style={{ fontSize: 12, color: B.tm }}>bloom@...</span>
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, padding: "20px 24px", overflow: "auto" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: B.t, margin: 0, letterSpacing: "-0.02em" }}>Overview</h3>
              <p style={{ fontSize: 12, color: B.tm, margin: "2px 0 0" }}>Last 30 days</p>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {["7d", "30d", "90d"].map((p, i) => (
                <div key={p} style={{
                  padding: "4px 10px", fontSize: 11, fontWeight: 500, borderRadius: 6, cursor: "pointer",
                  background: i === 1 ? B.el : "transparent", color: i === 1 ? B.t : B.tm,
                }}>
                  {p}
                </div>
              ))}
            </div>
          </div>

          {/* KPI Cards */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            {[
              { l: "Views", v: "2,847", trend: "+18%", up: true },
              { l: "Completions", v: "1,042", trend: "+12%", up: true },
              { l: "Rate", v: "36.6%", trend: "+2.1%", up: true },
              { l: "Leads", v: "389", trend: "+24%", up: true },
            ].map(k => (
              <div key={k.l} style={{ flex: 1, background: B.s, border: `1px solid ${B.br}`, borderRadius: 10, padding: "14px 12px" }}>
                <p style={{ fontSize: 10, color: B.tm, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500 }}>{k.l}</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontSize: 20, fontWeight: 600, color: B.t, letterSpacing: "-0.02em" }}>{k.v}</span>
                  <span style={{ fontSize: 10, color: k.up ? B.ok : B.err, fontWeight: 500 }}>{k.trend}</span>
                </div>
                {/* Mini sparkline */}
                <svg width="100%" height="20" viewBox="0 0 100 20" style={{ marginTop: 6 }}>
                  <polyline points="0,18 15,14 30,16 45,10 60,12 75,6 90,8 100,3" fill="none" stroke={B.a} strokeWidth="1.5" opacity="0.4" />
                </svg>
              </div>
            ))}
          </div>

          {/* Chart placeholder */}
          <div style={{ background: B.s, border: `1px solid ${B.br}`, borderRadius: 10, padding: "16px", marginBottom: 20, height: 120 }}>
            <p style={{ fontSize: 11, color: B.tm, margin: "0 0 10px", fontWeight: 500 }}>Views & Completions</p>
            <svg width="100%" height="80" viewBox="0 0 600 80">
              <polyline points="0,70 50,55 100,60 150,40 200,45 250,30 300,35 350,20 400,25 450,15 500,18 550,10 600,5" fill="none" stroke={B.a} strokeWidth="2" opacity="0.6" />
              <polyline points="0,75 50,68 100,70 150,55 200,58 250,48 300,50 350,40 400,42 450,35 500,38 550,30 600,25" fill="none" stroke={B.ok} strokeWidth="2" opacity="0.4" />
            </svg>
          </div>

          {/* Quiz list */}
          <p style={{ fontSize: 10, color: B.tm, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px", fontWeight: 500 }}>Your Quizzes</p>
          {[
            { name: "Find Your Perfect Wellness Routine", status: "Live", color: B.ok, views: "2.8k", leads: "389", edited: "2h ago" },
            { name: "Which Program Is Right For You?", status: "Draft", color: B.tm, views: "0", leads: "0", edited: "1d ago" },
          ].map((q, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", padding: "12px 14px", background: B.s,
              border: `1px solid ${B.br}`, borderRadius: 10, marginBottom: 8, gap: 12,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: q.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: B.t, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.name}</p>
                <p style={{ fontSize: 11, color: B.tm, margin: "2px 0 0" }}>{q.views} views · {q.leads} leads · {q.edited}</p>
              </div>
              <div style={{ padding: "3px 10px", borderRadius: 100, fontSize: 10, fontWeight: 600, background: q.status === "Live" ? "rgba(52,211,153,0.1)" : B.el, color: q.color, border: `1px solid ${q.status === "Live" ? "rgba(52,211,153,0.2)" : B.br}` }}>
                {q.status}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {["Edit", "Share"].map(a => (
                  <span key={a} style={{ fontSize: 11, color: B.tm, cursor: "pointer", padding: "4px 8px", borderRadius: 6, border: `1px solid ${B.br}` }}>{a}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DesktopFrame>
  );
}

/* ═══════ SCREEN 8: EDITOR ═══════ */
function Screen8() {
  const [activeQ, setActiveQ] = useState(0);
  return (
    <DesktopFrame h={520}>
      <div style={{ display: "flex", height: 520 }}>
        {/* Left mini-nav */}
        <div style={{ width: 52, borderRight: `1px solid ${B.br}`, padding: "14px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <div style={{ padding: "6px", cursor: "pointer", marginBottom: 12 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8L10 4" stroke={B.tm} strokeWidth="1.5" strokeLinecap="round"/></svg>
          </div>
          {QUIZ.questions.map((_, i) => (
            <div key={i} onClick={() => setActiveQ(i)} style={{
              width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 600, cursor: "pointer",
              background: activeQ === i ? B.ad : "transparent",
              color: activeQ === i ? B.a : B.tm,
              border: activeQ === i ? `1px solid ${B.a}33` : "1px solid transparent",
            }}>
              {i + 1}
            </div>
          ))}
          <div style={{ width: 1, height: 12, background: B.br, margin: "4px 0" }} />
          <div style={{ width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: B.tm, cursor: "pointer" }}>
            Out
          </div>
        </div>

        {/* Middle: Question editor */}
        <div style={{ flex: 1, padding: "16px 20px", borderRight: `1px solid ${B.br}`, overflow: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: B.t, margin: 0, letterSpacing: "-0.01em" }}>Edit Quiz</h3>
            <div style={{ display: "flex", gap: 6 }}>
              <Pill small active={false} style={{ fontSize: 11, padding: "4px 12px" }}>Save</Pill>
              <Pill small style={{ fontSize: 11, padding: "4px 12px" }}>Publish</Pill>
            </div>
          </div>

          {/* Quiz title */}
          <div style={{ padding: "10px 12px", background: B.s, borderRadius: 8, border: `1px solid ${B.br}`, marginBottom: 16 }}>
            <p style={{ fontSize: 10, color: B.tm, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Quiz title</p>
            <p style={{ fontSize: 15, color: B.t, fontWeight: 500, margin: 0 }}>{QUIZ.title}</p>
          </div>

          {/* Question cards */}
          {QUIZ.questions.map((q, qi) => (
            <div key={qi} style={{
              padding: "12px", background: activeQ === qi ? B.s : "transparent",
              borderRadius: 10, border: `1px solid ${activeQ === qi ? B.br : "transparent"}`,
              marginBottom: 8, cursor: "pointer", transition: "all 0.15s ease",
            }} onClick={() => setActiveQ(qi)}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: activeQ === qi ? 10 : 0 }}>
                <span style={{ fontSize: 10, color: B.tm, fontWeight: 600, flexShrink: 0 }}>≡</span>
                <span style={{ fontSize: 13, color: B.t, fontWeight: 500 }}>Q{qi+1}. {q.text}</span>
              </div>
              {activeQ === qi && (
                <div style={{ paddingLeft: 18 }}>
                  {q.options.map((o, oi) => (
                    <div key={oi} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: oi < q.options.length - 1 ? `1px solid ${B.br}` : "none" }}>
                      <div style={{ width: 12, height: 12, borderRadius: 3, border: `1px solid ${B.br}`, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: B.tm }}>{o}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <span style={{ fontSize: 11, color: B.a, cursor: "pointer" }}>+ Add option</span>
                    <span style={{ fontSize: 11, color: B.tm, cursor: "pointer", marginLeft: "auto" }}>Delete</span>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add question - prominent */}
          <div style={{
            padding: "14px 16px", borderRadius: 10, border: `1px dashed ${B.a}44`,
            background: B.ad, textAlign: "center", cursor: "pointer", marginTop: 8,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: 6, background: `${B.a}22`, border: `1px solid ${B.a}33`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 600, color: B.a,
            }}>+</div>
            <span style={{ fontSize: 13, color: B.a, fontWeight: 500 }}>Add your own question</span>
          </div>

          {/* AI suggestion */}
          <div style={{ marginTop: 10, padding: "12px 14px", background: B.s, borderRadius: 10, border: `1px solid ${B.br}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <p style={{ fontSize: 10, color: B.a, margin: 0, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>AI suggestion</p>
              <span style={{ fontSize: 10, color: B.tm, cursor: "pointer" }}>Add</span>
            </div>
            <p style={{ fontSize: 12, color: B.tm, margin: 0 }}>"What's your main goal for working with a wellness coach?"</p>
          </div>
        </div>

        {/* Right: Live preview */}
        <div style={{ width: 260, padding: "16px", display: "flex", flexDirection: "column" }}>
          <p style={{ fontSize: 10, color: B.tm, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px", fontWeight: 500 }}>Live preview</p>
          <div style={{ flex: 1, background: B.s, borderRadius: 10, border: `1px solid ${B.br}`, padding: "20px 16px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ height: 2, background: B.br, marginBottom: 20, borderRadius: 1 }}>
              <div style={{ height: "100%", width: `${((activeQ + 1) / QUIZ.questions.length) * 100}%`, background: B.a, borderRadius: 1, transition: "width 0.3s ease" }} />
            </div>
            <h4 style={{ fontSize: 14, fontWeight: 600, color: B.t, textAlign: "center", lineHeight: 1.3, margin: "0 0 16px" }}>
              {QUIZ.questions[activeQ].text}
            </h4>
            {QUIZ.questions[activeQ].options.map((o, i) => (
              <div key={i} style={{ padding: "8px 0", borderBottom: `1px solid ${B.br}`, fontSize: 11, color: B.tm }}>
                {o}
              </div>
            ))}
          </div>

          {/* Settings */}
          <div style={{ marginTop: 12 }}>
            <p style={{ fontSize: 10, color: B.tm, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px", fontWeight: 500 }}>Settings</p>
            {[
              { l: "Email gate", on: true },
              { l: "Brand colors", on: true },
              { l: "Smart branching", on: false },
            ].map(s => (
              <div key={s.l} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0" }}>
                <span style={{ fontSize: 12, color: B.tm }}>{s.l}</span>
                <div style={{ width: 32, height: 18, borderRadius: 9, background: s.on ? B.a : B.br, position: "relative", cursor: "pointer" }}>
                  <div style={{ width: 14, height: 14, borderRadius: "50%", background: s.on ? B.bg : B.tm, position: "absolute", top: 2, left: s.on ? 16 : 2, transition: "left 0.2s ease" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DesktopFrame>
  );
}

/* ═══════ SCREEN 9: GHOST ANALYTICS (INNOVATION) ═══════ */
function Screen9() {
  return (
    <DesktopFrame h={440}>
      <div style={{ display: "flex", height: 440 }}>
        {/* Sidebar (same as dashboard) */}
        <div style={{ width: 180, borderRight: `1px solid ${B.br}`, padding: "20px 0" }}>
          <div style={{ padding: "0 16px 20px", borderBottom: `1px solid ${B.br}` }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: B.t, letterSpacing: "-0.02em" }}>squarespell</span>
          </div>
          {[
            { l: "Overview" },
            { l: "Quizzes", active: true },
            { l: "Leads" },
            { l: "Settings" },
          ].map((item, i) => (
            <div key={i} style={{
              padding: "10px 16px", fontSize: 13, fontWeight: item.active ? 600 : 400,
              color: item.active ? B.a : B.tm,
              borderLeft: item.active ? `2px solid ${B.a}` : "2px solid transparent",
              background: item.active ? B.ad : "transparent",
            }}>
              {item.l}
            </div>
          ))}
        </div>

        {/* Main: Flow analytics */}
        <div style={{ flex: 1, padding: "20px 24px", overflow: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: B.t, margin: 0 }}>Quiz Flow Analytics</h3>
              <p style={{ fontSize: 12, color: B.tm, margin: "2px 0 0" }}>How visitors move through your quiz</p>
            </div>
            <Pill small active={false} style={{ fontSize: 11, padding: "4px 12px" }}>Export</Pill>
          </div>

          {/* Flow visualization */}
          <div style={{ background: B.s, borderRadius: 10, border: `1px solid ${B.br}`, padding: "20px" }}>
            {/* Question flow bars */}
            {[
              { q: "Q1: Biggest challenge", responses: 2847, dropoff: 0, top: "Stress (42%)" },
              { q: "Q2: Time commitment", responses: 2654, dropoff: 7, top: "15-20 min (51%)" },
              { q: "Q3: Which sounds like you", responses: 2398, dropoff: 10, top: "Tried everything (38%)" },
              { q: "Q4: 30-day win", responses: 2156, dropoff: 10, top: "Energy after work (44%)" },
              { q: "Q5: Advice source", responses: 1891, dropoff: 12, top: "Podcasts (47%)" },
              { q: "Email submitted", responses: 1042, dropoff: 45, top: "" },
              { q: "Results viewed", responses: 1042, dropoff: 0, top: "" },
            ].map((step, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: i < 6 ? 6 : 0 }}>
                <span style={{ fontSize: 11, color: B.tm, width: 160, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{step.q}</span>
                <div style={{ flex: 1, height: 20, background: B.bg, borderRadius: 4, overflow: "hidden", position: "relative" }}>
                  <div style={{
                    height: "100%", width: `${(step.responses / 2847) * 100}%`,
                    background: step.q.includes("Email") ? B.ok : `${B.a}66`,
                    borderRadius: 4, transition: "width 0.6s ease",
                  }} />
                </div>
                <span style={{ fontSize: 11, color: B.t, fontWeight: 500, width: 40, textAlign: "right", flexShrink: 0 }}>
                  {step.responses.toLocaleString()}
                </span>
                {step.dropoff > 0 && (
                  <span style={{ fontSize: 10, color: step.dropoff > 20 ? B.err : B.warn, width: 36, textAlign: "right", flexShrink: 0 }}>
                    -{step.dropoff}%
                  </span>
                )}
                {step.dropoff === 0 && <span style={{ width: 36, flexShrink: 0 }} />}
              </div>
            ))}
          </div>

          {/* AI Insight */}
          <div style={{ marginTop: 12, padding: "12px 16px", background: B.ad, borderRadius: 8, border: `1px solid ${B.a}22` }}>
            <p style={{ fontSize: 10, color: B.a, fontWeight: 600, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>AI Insight</p>
            <p style={{ fontSize: 12, color: B.tm, margin: 0, lineHeight: 1.5 }}>
              Q3 has the highest single-question drop-off (10%). Consider simplifying the options. "I've tried everything" may feel negative. Suggested replacement: "What motivates you most to start?"
            </p>
          </div>
        </div>
      </div>
    </DesktopFrame>
  );
}

/* ═══════ MAIN LAYOUT ═══════ */
export default function QuizPrototype() {
  const screens = [
    { label: "1 ·The Hook · URL Input", desc: "Single focus. Paste URL, hit go. No distractions.", component: Screen1, type: "phone" },
    { label: "2 ·The Build · AI Generation Theater", desc: "The killer feature. Watch your quiz assemble in real time. Not a loading screen ·a show.", component: Screen2, type: "desktop" },
    { label: "3 ·Your Quiz · Full Preview + Publish", desc: "The generated quiz ·all questions, options, and outcomes visible at a glance. Right panel has the summary and Publish CTA. One screen to review everything.", component: Screen3, type: "desktop" },
    { label: "5 ·Sign Up · Publish Gate", desc: "Three options: Google, Apple, Email. Quiz goes live the moment they sign up.", component: Screen6, type: "phone" },
    { label: "6 ·Dashboard · YouTube Studio Level", desc: "Analytics-first. KPI cards, charts, quiz list with status + actions. Sidebar nav.", component: Screen7, type: "desktop" },
    { label: "7 ·Editor · Split View + AI Suggestions", desc: "Left: question cards with inline editing. Right: live preview with visitor experience (email gate + results). AI suggests questions.", component: Screen8, type: "desktop" },
    { label: "8 ·Flow Analytics · Ghost Analytics (Innovation)", desc: "See how visitors move through every question. Drop-off rates. AI optimization suggestions.", component: Screen9, type: "desktop" },
  ];

  return (
    <div style={{
      minHeight: "100vh", background: "#000", fontFamily: B.f, color: B.t,
      WebkitFontSmoothing: "antialiased", paddingBottom: 80,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        ::placeholder { color: ${B.tm}; opacity: 0.5; }
      `}</style>

      {/* Header */}
      <div style={{ textAlign: "center", padding: "56px 24px 12px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: B.t, letterSpacing: "-0.03em", margin: 0 }}>
          Squarespell ·Complete System Prototype
        </h1>
        <p style={{ fontSize: 14, color: B.tm, marginTop: 6 }}>
          7 screens · URL to live quiz in 3 clicks
        </p>
      </div>

      {/* Screens */}
      {screens.map((screen, i) => {
        const Comp = screen.component;
        return (
          <div key={i} style={{ padding: "40px 24px", maxWidth: 960, margin: "0 auto" }}>
            <SectionLabel>{screen.label}</SectionLabel>
            <p style={{ fontSize: 13, color: B.tm, margin: "10px 0 20px", lineHeight: 1.5 }}>{screen.desc}</p>
            <Comp />
          </div>
        );
      })}

      {/* Innovation section */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 24px" }}>
        <SectionLabel>5 Innovations No Quiz Tool Has</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
          {[
            { n: "The Live Build", d: "Watch your quiz assemble in real time. Title types, colors shift, questions appear. The viral screenshot moment." },
            { n: "Ghost Analytics", d: "Sankey-style flow showing how visitors move through each question. See exactly where and why they drop off." },
            { n: "AI Revision Mode", d: "Type 'make Q3 more casual' and watch the AI rewrite in real time with accept/reject diffs." },
            { n: "Smart Branching", d: "AI auto-detects when certain answer combos should skip questions. One toggle, no flowchart complexity." },
            { n: "Embed Intelligence", d: "Quiz self-optimizes after embedding. Suggests question replacements, adjusts scoring weights. Weekly improvement emails." },
          ].map((idea, i) => (
            <div key={i} style={{ display: "flex", gap: 14, padding: "14px 16px", background: B.s, borderRadius: 10, border: `1px solid ${B.br}` }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8, background: B.ad, border: `1px solid ${B.a}22`,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                fontSize: 12, fontWeight: 700, color: B.a,
              }}>
                {i + 1}
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: B.t, margin: "0 0 3px" }}>{idea.n}</p>
                <p style={{ fontSize: 12, color: B.tm, margin: 0, lineHeight: 1.5 }}>{idea.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", padding: "40px 24px" }}>
        <p style={{ fontSize: 13, color: B.tm, opacity: 0.5 }}>End of prototype · 7 screens · Squarespell 2026</p>
      </div>
    </div>
  );
}
