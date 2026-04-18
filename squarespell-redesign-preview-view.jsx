import { useState } from "react";

const COLORS = {
  bg: "#F7F7F5",
  surface: "#FFFFFF",
  sidebar: "#F0EFED",
  sidebarHover: "#E8E7E4",
  sidebarActive: "#E2E1DE",
  border: "#E4E3E0",
  borderLight: "#EEEDE9",
  text: "#1A1A1A",
  textSecondary: "#6B6B6B",
  textMuted: "#9B9B9B",
  accent: "#0D7377",
  accentLight: "#E8F4F4",
  accentHover: "#0B6165",
  success: "#2D6A4F",
  successLight: "#ECF5F0",
  warning: "#B45309",
  warningLight: "#FEF6E7",
  danger: "#C53030",
  dangerLight: "#FEF0F0",
};

const FONTS = {
  heading: "'DM Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  body: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
};

// Sidebar icons as clean SVG paths (1.5px stroke style)
const icons = {
  home: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
      <path d="M9 21V12h6v9"/>
    </svg>
  ),
  quiz: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M9 9h6M9 13h6M9 17h4"/>
    </svg>
  ),
  email: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="M22 4L12 13 2 4"/>
    </svg>
  ),
  contacts: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/>
      <path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6"/>
    </svg>
  ),
  analytics: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18"/>
      <path d="M7 16l4-5 4 3 5-7"/>
    </svg>
  ),
  brand: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  ),
  settings: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  ),
  templates: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5"/>
      <rect x="14" y="3" width="7" height="5" rx="1.5"/>
      <rect x="14" y="12" width="7" height="9" rx="1.5"/>
      <rect x="3" y="16" width="7" height="5" rx="1.5"/>
    </svg>
  ),
  automation: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  ),
  plus: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  ),
  search: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="11" cy="11" r="7"/>
      <path d="M21 21l-4.35-4.35"/>
    </svg>
  ),
  chevron: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M9 18l6-6-6-6"/>
    </svg>
  ),
  dots: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="5" r="1" fill="currentColor"/>
      <circle cx="12" cy="12" r="1" fill="currentColor"/>
      <circle cx="12" cy="19" r="1" fill="currentColor"/>
    </svg>
  ),
  external: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
    </svg>
  ),
};

function NavItem({ icon, label, active, count }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        borderRadius: 6,
        cursor: "pointer",
        color: active ? COLORS.accent : COLORS.textSecondary,
        background: active ? COLORS.accentLight : "transparent",
        fontWeight: active ? 500 : 400,
        fontSize: 14,
        fontFamily: FONTS.body,
        transition: "all 0.15s ease",
      }}
    >
      <span style={{ display: "flex", opacity: active ? 1 : 0.7 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {count && (
        <span
          style={{
            fontSize: 11,
            background: active ? COLORS.accent : COLORS.borderLight,
            color: active ? "#fff" : COLORS.textMuted,
            padding: "1px 7px",
            borderRadius: 10,
            fontWeight: 500,
          }}
        >
          {count}
        </span>
      )}
    </div>
  );
}

function NavSection({ label, children }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: COLORS.textMuted,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          padding: "16px 12px 6px",
          fontFamily: FONTS.body,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>{children}</div>
    </div>
  );
}

function StatCard({ label, value, change, changeType }) {
  const isPositive = changeType === "up";
  return (
    <div
      style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 10,
        padding: 24,
        flex: 1,
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 13, color: COLORS.textSecondary, fontFamily: FONTS.body, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span style={{ fontSize: 28, fontWeight: 600, color: COLORS.text, fontFamily: FONTS.heading }}>
          {value}
        </span>
        {change && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: isPositive ? COLORS.success : COLORS.danger,
              background: isPositive ? COLORS.successLight : COLORS.dangerLight,
              padding: "2px 8px",
              borderRadius: 12,
            }}
          >
            {isPositive ? "+" : ""}{change}
          </span>
        )}
      </div>
    </div>
  );
}

function QuizRow({ name, responses, conversion, status, date }) {
  const statusColors = {
    live: { bg: COLORS.successLight, text: COLORS.success },
    draft: { bg: COLORS.borderLight, text: COLORS.textMuted },
    paused: { bg: COLORS.warningLight, text: COLORS.warning },
  };
  const s = statusColors[status] || statusColors.draft;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 100px 100px 80px 100px 32px",
        alignItems: "center",
        padding: "14px 20px",
        borderBottom: `1px solid ${COLORS.borderLight}`,
        fontSize: 14,
        fontFamily: FONTS.body,
        cursor: "pointer",
        transition: "background 0.1s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.bg)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <div style={{ fontWeight: 500, color: COLORS.text }}>{name}</div>
      <div style={{ color: COLORS.textSecondary, textAlign: "right" }}>{responses}</div>
      <div style={{ color: COLORS.textSecondary, textAlign: "right" }}>{conversion}</div>
      <div style={{ textAlign: "center" }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            padding: "3px 10px",
            borderRadius: 12,
            background: s.bg,
            color: s.text,
          }}
        >
          {status}
        </span>
      </div>
      <div style={{ color: COLORS.textMuted, fontSize: 13, textAlign: "right" }}>{date}</div>
      <div style={{ color: COLORS.textMuted, display: "flex", justifyContent: "center", opacity: 0.5 }}>
        {icons.dots}
      </div>
    </div>
  );
}

function MiniChart() {
  const data = [28, 35, 42, 38, 52, 48, 61, 55, 72, 68, 85, 78];
  const max = Math.max(...data);
  const h = 48;
  const w = 180;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(" ");

  return (
    <svg width={w} height={h + 4} style={{ display: "block" }}>
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={COLORS.accent} stopOpacity="0.15" />
          <stop offset="100%" stopColor={COLORS.accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${h + 2} ${points} ${w},${h + 2}`}
        fill="url(#chartGrad)"
      />
      <polyline
        points={points}
        fill="none"
        stroke={COLORS.accent}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ActivityItem({ action, detail, time }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: `1px solid ${COLORS.borderLight}` }}>
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: COLORS.accent,
          marginTop: 6,
          flexShrink: 0,
          opacity: 0.6,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: COLORS.text, fontFamily: FONTS.body }}>{action}</div>
        <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>{detail}</div>
      </div>
      <div style={{ fontSize: 12, color: COLORS.textMuted, whiteSpace: "nowrap" }}>{time}</div>
    </div>
  );
}

export default function SquarespellRedesign() {
  const [activePage, setActivePage] = useState("quizzes");

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: COLORS.bg,
        fontFamily: FONTS.body,
        color: COLORS.text,
        overflow: "hidden",
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: 240,
          background: COLORS.sidebar,
          borderRight: `1px solid ${COLORS.border}`,
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: "20px 16px 12px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: COLORS.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: FONTS.heading }}>S</span>
          </div>
          <span style={{ fontSize: 16, fontWeight: 600, fontFamily: FONTS.heading, color: COLORS.text }}>
            Squarespell
          </span>
        </div>

        {/* Search */}
        <div style={{ padding: "4px 12px 12px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 10px",
              borderRadius: 6,
              border: `1px solid ${COLORS.border}`,
              background: COLORS.surface,
              color: COLORS.textMuted,
              fontSize: 13,
            }}
          >
            {icons.search}
            <span>Search...</span>
            <span
              style={{
                marginLeft: "auto",
                fontSize: 11,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 4,
                padding: "1px 5px",
                color: COLORS.textMuted,
              }}
            >
              Cmd+K
            </span>
          </div>
        </div>

        {/* Nav */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 8px" }}>
          <NavItem icon={icons.home} label="Home" />

          <NavSection label="Build">
            <NavItem icon={icons.quiz} label="Quizzes" active={activePage === "quizzes"} count="4" />
            <NavItem icon={icons.automation} label="Automations" count="2" />
          </NavSection>

          <NavSection label="Engage">
            <NavItem icon={icons.email} label="Campaigns" count="6" />
            <NavItem icon={icons.templates} label="Templates" />
            <NavItem icon={icons.contacts} label="Contacts" count="248" />
          </NavSection>

          <NavSection label="Measure">
            <NavItem icon={icons.analytics} label="Analytics" />
          </NavSection>

          <NavSection label="Configure">
            <NavItem icon={icons.brand} label="Brand kit" />
            <NavItem icon={icons.settings} label="Settings" />
          </NavSection>
        </div>

        {/* Bottom */}
        <div
          style={{
            padding: 12,
            borderTop: `1px solid ${COLORS.border}`,
          }}
        >
          <div
            style={{
              background: COLORS.accentLight,
              borderRadius: 8,
              padding: 14,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.accent, marginBottom: 4 }}>
              Starter plan
            </div>
            <div style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 10 }}>
              248 / 500 emails used
            </div>
            <div
              style={{
                height: 4,
                borderRadius: 2,
                background: COLORS.border,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: "49.6%",
                  height: "100%",
                  borderRadius: 2,
                  background: COLORS.accent,
                }}
              />
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
        {/* Top bar */}
        <header
          style={{
            padding: "16px 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: `1px solid ${COLORS.borderLight}`,
            background: COLORS.surface,
            flexShrink: 0,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 600,
                fontFamily: FONTS.heading,
                margin: 0,
                color: COLORS.text,
              }}
            >
              Quizzes
            </h1>
            <p style={{ fontSize: 13, color: COLORS.textMuted, margin: "4px 0 0" }}>
              4 quizzes across 2 sites
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: 7,
                border: "none",
                background: COLORS.accent,
                color: "#fff",
                fontSize: 14,
                fontWeight: 500,
                fontFamily: FONTS.body,
                cursor: "pointer",
              }}
            >
              {icons.plus}
              New quiz
            </button>
          </div>
        </header>

        {/* Content */}
        <div style={{ padding: 32, flex: 1 }}>
          {/* Stats */}
          <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
            <StatCard label="Total responses" value="1,847" change="12.3%" changeType="up" />
            <StatCard label="Avg. completion" value="73%" change="4.1%" changeType="up" />
            <StatCard label="Email subscribers" value="248" change="8.7%" changeType="up" />
            <StatCard label="Email CTR" value="4.2%" change="-0.3%" changeType="down" />
          </div>

          {/* Two column layout */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24 }}>
            {/* Quiz table */}
            <div
              style={{
                background: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              {/* Table header */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 100px 100px 80px 100px 32px",
                  padding: "12px 20px",
                  borderBottom: `1px solid ${COLORS.border}`,
                  fontSize: 12,
                  fontWeight: 500,
                  color: COLORS.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                <div>Name</div>
                <div style={{ textAlign: "right" }}>Responses</div>
                <div style={{ textAlign: "right" }}>Conv.</div>
                <div style={{ textAlign: "center" }}>Status</div>
                <div style={{ textAlign: "right" }}>Created</div>
                <div />
              </div>

              <QuizRow
                name="What's your wedding style?"
                responses="842"
                conversion="76%"
                status="live"
                date="Mar 14"
              />
              <QuizRow
                name="Find your perfect skincare routine"
                responses="614"
                conversion="71%"
                status="live"
                date="Feb 28"
              />
              <QuizRow
                name="Interior design personality"
                responses="391"
                conversion="68%"
                status="paused"
                date="Feb 12"
              />
              <QuizRow
                name="Gift guide quiz (Holiday 2026)"
                responses="0"
                conversion="-"
                status="draft"
                date="Apr 18"
              />
            </div>

            {/* Right column */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Trend chart */}
              <div
                style={{
                  background: COLORS.surface,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 10,
                  padding: 20,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 16,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 500, color: COLORS.text }}>
                    Responses (30d)
                  </span>
                  <span style={{ fontSize: 12, color: COLORS.textMuted }}>
                    {icons.external}
                  </span>
                </div>
                <MiniChart />
              </div>

              {/* Recent activity */}
              <div
                style={{
                  background: COLORS.surface,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 10,
                  padding: 20,
                  flex: 1,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 500, color: COLORS.text, marginBottom: 12 }}>
                  Recent activity
                </div>
                <ActivityItem
                  action="New response on Wedding Style quiz"
                  detail="sarah.m@gmail.com - Outcome: Classic Romantic"
                  time="2m ago"
                />
                <ActivityItem
                  action="Campaign sent: Spring Skincare Tips"
                  detail="124 delivered, 18 opened"
                  time="1h ago"
                />
                <ActivityItem
                  action="New subscriber from Skincare quiz"
                  detail="james.w@outlook.com"
                  time="3h ago"
                />
                <ActivityItem
                  action="Bounce detected"
                  detail="old-addr@expired.com - hard bounce"
                  time="5h ago"
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
