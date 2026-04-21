import { useState } from "react";

const BRAND = { primary: "#d2ff1f", text: "#000", bg: "#fff", accent: "#0D7377" };

/* ─── Option A: Canva / Squarespace style ─── */
function OptionA() {
  const [sel, setSel] = useState("ai");
  return (
    <div style={{ background: "#f8f9fa", borderRadius: 16, padding: 32 }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#0D7377", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>STYLE A: SCREENSHOT PREVIEWS</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#111" }}>Like Canva / Squarespace template picker</div>
        <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>Large thumbnail screenshots, clean hover cards, minimal text</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {[
          { id: "ai", label: "AI Custom", badge: "AI", color: "#0D7377", q: "Personalized for your brand", img: "linear-gradient(135deg, #0D7377 0%, #0a5c5f 100%)" },
          { id: "t1", label: "Product Finder", badge: "Popular", color: "#6366f1", q: "Match visitors to products", img: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)" },
          { id: "t2", label: "Lead Qualifier", badge: "Template", color: "#8b5cf6", q: "Score and segment leads", img: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)" },
        ].map((c) => (
          <div key={c.id} onClick={() => setSel(c.id)} style={{
            cursor: "pointer", borderRadius: 12, overflow: "hidden", border: sel === c.id ? "2.5px solid #0D7377" : "2px solid #e5e7eb",
            background: "#fff", transition: "all 0.2s", boxShadow: sel === c.id ? "0 0 0 3px rgba(13,115,119,0.15)" : "0 2px 8px rgba(0,0,0,0.04)",
          }}>
            {/* Large preview area */}
            <div style={{ height: 200, background: c.img, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <div style={{ background: "rgba(255,255,255,0.95)", borderRadius: 12, padding: "16px 20px", width: "80%", textAlign: "left" }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: "#111" }}>{c.q}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ height: 28, borderRadius: 6, border: "1.5px solid #e5e7eb", fontSize: 10, padding: "0 10px", display: "flex", alignItems: "center", color: "#666" }}>Option A</div>
                  <div style={{ height: 28, borderRadius: 6, border: "1.5px solid #e5e7eb", fontSize: 10, padding: "0 10px", display: "flex", alignItems: "center", color: "#666" }}>Option B</div>
                </div>
              </div>
              <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 100, letterSpacing: "0.05em" }}>{c.badge}</div>
            </div>
            <div style={{ padding: "14px 16px" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>{c.label}</div>
              <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{c.q}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Option B: ConvertFlow / Browser frame style ─── */
function OptionB() {
  const [sel, setSel] = useState("ai");
  return (
    <div style={{ background: "#111", borderRadius: 16, padding: 32 }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: BRAND.primary, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>STYLE B: DARK MODE BROWSER FRAMES</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>Like ConvertFlow / Unbounce</div>
        <div style={{ fontSize: 13, color: "#999", marginTop: 4 }}>Browser window frames on dark background, premium SaaS feel</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        {[
          { id: "ai", label: "AI Custom Quiz", sub: "Built from your website", badge: "AI-Powered", color: "#d2ff1f" },
          { id: "t1", label: "Product Finder", sub: "Recommend products", badge: "Template", color: "#60a5fa" },
          { id: "t2", label: "Skincare Routine", sub: "Personalize routines", badge: "Template", color: "#c084fc" },
        ].map((c) => (
          <div key={c.id} onClick={() => setSel(c.id)} style={{
            cursor: "pointer", borderRadius: 14, overflow: "hidden",
            border: sel === c.id ? `2px solid ${c.color}` : "2px solid #2a2a2a",
            background: "#1a1a1a", transition: "all 0.25s",
            boxShadow: sel === c.id ? `0 0 30px ${c.color}22` : "none",
          }}>
            {/* Browser frame */}
            <div style={{ padding: "8px 12px", background: "#222", display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff5f57" }} />
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#febc2e" }} />
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#28c840" }} />
              <div style={{ flex: 1, height: 20, borderRadius: 6, background: "#333", marginLeft: 8, fontSize: 9, color: "#666", display: "flex", alignItems: "center", paddingLeft: 10 }}>squarespell.com</div>
            </div>
            <div style={{ padding: 20, minHeight: 180 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", marginBottom: 12 }}>What best describes you?</div>
              {["I need help choosing", "I know what I want", "Just browsing"].map((opt, i) => (
                <div key={i} style={{
                  padding: "10px 14px", borderRadius: 8, border: i === 0 ? `1.5px solid ${c.color}` : "1.5px solid #333",
                  fontSize: 12, color: i === 0 ? c.color : "#888", marginBottom: 6, background: i === 0 ? `${c.color}11` : "transparent",
                }}>{opt}</div>
              ))}
              <div style={{ marginTop: 12, padding: "8px 0", borderRadius: 8, background: c.color, color: "#000", fontSize: 11, fontWeight: 700, textAlign: "center" }}>Next</div>
            </div>
            <div style={{ padding: "12px 16px", borderTop: "1px solid #2a2a2a", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{c.label}</div>
                <div style={{ fontSize: 10, color: "#888" }}>{c.sub}</div>
              </div>
              <div style={{ fontSize: 8, fontWeight: 700, color: c.color, background: `${c.color}18`, padding: "3px 8px", borderRadius: 100, letterSpacing: "0.06em" }}>{c.badge}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Option C: Typeform minimal cards ─── */
function OptionC() {
  const [sel, setSel] = useState("ai");
  return (
    <div style={{ background: "#fff", borderRadius: 16, padding: 32, border: "1px solid #eee" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#0D7377", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>STYLE C: MINIMAL ICON CARDS</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#111" }}>Like Typeform / Linear</div>
        <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>Clean icon cards, no mockups, just clear descriptions</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {[
          { id: "ai", icon: "M13 2L3 14h9l-1 8 10-12h-9l1-8z", label: "AI Custom Quiz", sub: "Fully custom quiz built from your website content, audience, and offers. Powered by AI.", color: "#0D7377", badge: "Recommended" },
          { id: "t1", icon: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z", label: "Product Recommendation", sub: "Match visitors to the right product based on their preferences, budget, and style.", color: "#6366f1", badge: "Popular" },
          { id: "t2", icon: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z", label: "Skincare Routine", sub: "Build a personalized skincare routine based on skin type, concerns, and lifestyle.", color: "#8b5cf6", badge: "Beauty" },
        ].map((c) => (
          <div key={c.id} onClick={() => setSel(c.id)} style={{
            cursor: "pointer", borderRadius: 12, padding: 24, border: sel === c.id ? "2px solid #0D7377" : "2px solid #f0f0f0",
            background: sel === c.id ? "rgba(13,115,119,0.03)" : "#fafafa", transition: "all 0.2s", position: "relative",
          }}>
            {sel === c.id && <div style={{ position: "absolute", top: 12, right: 12, width: 22, height: 22, borderRadius: "50%", background: "#0D7377", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>}
            <div style={{ width: 48, height: 48, borderRadius: 12, background: `${c.color}14`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={c.icon} /></svg>
            </div>
            <div style={{ fontSize: 9, fontWeight: 700, color: c.color, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>{c.badge}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#111", marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: 12, color: "#777", lineHeight: 1.5 }}>{c.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Option D: Gradient glass cards (modern SaaS) ─── */
function OptionD() {
  const [sel, setSel] = useState("ai");
  return (
    <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", borderRadius: 16, padding: 32 }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#d2ff1f", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>STYLE D: GLASS MORPHISM</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>Modern gradient + glass cards</div>
        <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>Glassmorphism with gradients, glow effects, very premium</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {[
          { id: "ai", label: "AI Custom", sub: "Built from your website", color: "#d2ff1f", gradient: "linear-gradient(135deg, rgba(210,255,31,0.15), rgba(210,255,31,0.05))" },
          { id: "t1", label: "Product Finder", sub: "Match to right products", color: "#60a5fa", gradient: "linear-gradient(135deg, rgba(96,165,250,0.15), rgba(96,165,250,0.05))" },
          { id: "t2", label: "Skincare Quiz", sub: "Personalize routines", color: "#c084fc", gradient: "linear-gradient(135deg, rgba(192,132,252,0.15), rgba(192,132,252,0.05))" },
        ].map((c) => (
          <div key={c.id} onClick={() => setSel(c.id)} style={{
            cursor: "pointer", borderRadius: 16, padding: 24,
            background: sel === c.id ? c.gradient : "rgba(255,255,255,0.04)",
            border: sel === c.id ? `1.5px solid ${c.color}55` : "1.5px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(12px)", transition: "all 0.25s",
            boxShadow: sel === c.id ? `0 8px 40px ${c.color}15` : "none",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${c.color}22`, border: `1px solid ${c.color}33`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
              </div>
              <div style={{ fontSize: 8, fontWeight: 700, color: c.color, background: `${c.color}18`, padding: "3px 10px", borderRadius: 100, letterSpacing: "0.08em", textTransform: "uppercase" }}>{c.id === "ai" ? "AI Powered" : "Template"}</div>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 20, lineHeight: 1.5 }}>{c.sub}</div>
            {/* Mini preview */}
            <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#e2e8f0", marginBottom: 8 }}>What describes you best?</div>
              {["Option A", "Option B"].map((o, i) => (
                <div key={i} style={{ padding: "7px 10px", borderRadius: 6, border: i === 0 ? `1px solid ${c.color}55` : "1px solid rgba(255,255,255,0.1)", fontSize: 10, color: i === 0 ? c.color : "#94a3b8", marginBottom: 4 }}>{o}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Option E: Horizontal layout (involve.me / Notion style) ─── */
function OptionE() {
  const [sel, setSel] = useState("ai");
  return (
    <div style={{ background: "#fff", borderRadius: 16, padding: 32, border: "1px solid #eee" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#0D7377", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>STYLE E: HORIZONTAL ROWS</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#111" }}>Like Notion / involve.me</div>
        <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>Full-width horizontal cards with preview on left, details on right</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {[
          { id: "ai", label: "AI Custom Quiz", sub: "Fully personalized quiz generated from your website content, tone, and brand. Our AI writes every question.", badge: "Recommended", color: "#0D7377" },
          { id: "t1", label: "Product Recommendation", sub: "Match visitors to the right product based on their preferences, budget, and style. Works for any product catalog.", badge: "Popular", color: "#6366f1" },
          { id: "t2", label: "Skincare Routine Finder", sub: "Build a personalized skincare routine based on skin type, concerns, and lifestyle. Best for beauty brands.", badge: "Beauty", color: "#8b5cf6" },
        ].map((c) => (
          <div key={c.id} onClick={() => setSel(c.id)} style={{
            cursor: "pointer", borderRadius: 12, padding: 20, display: "flex", gap: 20, alignItems: "center",
            border: sel === c.id ? "2px solid #0D7377" : "2px solid #f0f0f0", background: sel === c.id ? "rgba(13,115,119,0.02)" : "#fafafa", transition: "all 0.2s",
          }}>
            {/* Preview thumbnail */}
            <div style={{ width: 120, height: 90, borderRadius: 10, background: `linear-gradient(135deg, ${c.color}, ${c.color}bb)`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <div style={{ background: "rgba(255,255,255,0.9)", borderRadius: 6, padding: "8px 10px", width: "80%" }}>
                <div style={{ height: 6, width: "70%", background: "#ddd", borderRadius: 3, marginBottom: 4 }} />
                <div style={{ height: 4, width: "100%", background: "#eee", borderRadius: 2, marginBottom: 3 }} />
                <div style={{ height: 4, width: "100%", background: "#eee", borderRadius: 2 }} />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#111" }}>{c.label}</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: c.color, background: `${c.color}14`, padding: "2px 8px", borderRadius: 100, letterSpacing: "0.05em" }}>{c.badge}</div>
              </div>
              <div style={{ fontSize: 12, color: "#777", lineHeight: 1.5 }}>{c.sub}</div>
            </div>
            {sel === c.id && <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#0D7377", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main ─── */
export default function DesignOptions() {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 24, fontFamily: "'Inter', -apple-system, system-ui, sans-serif" }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: "#111", marginBottom: 8 }}>Pick a design direction</div>
        <div style={{ fontSize: 14, color: "#666" }}>5 different approaches. Tell me which letter (A-E) you like.</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        <OptionA />
        <OptionB />
        <OptionC />
        <OptionD />
        <OptionE />
      </div>
    </div>
  );
}
