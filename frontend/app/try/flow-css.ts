// Scoped copy of prototype-v3-679b1ac5.html <style> block.
// Every selector from the prototype is prefixed with `.flow-root` so none of
// these rules can leak out of the /try page, and so they win by specificity
// over any generic tag rules in globals.css.
//
// RULES FOR EDITING THIS FILE:
//  - Do NOT add any selectors that are not in the prototype.
//  - Do NOT add `!important`, `all: unset`, or generic input[type] resets.
//  - Do NOT reorder, merge, or "clean up" rules.
//  - If the prototype changes, re-run the diff and only update what the
//    prototype actually changed.

const FLOW_CSS: string = `
.flow-root {
  --bg: #07090c;
  --bg-2: #0d1117;
  --surface: #11161f;
  --surface-2: #161b25;
  --surface-3: #1b212d;
  --border: #1f2530;
  --border-2: #2a313d;
  --border-3: #3a4150;
  --text: #ffffff;
  --text-muted: #8891a3;
  --text-dim: #5b6273;
  --accent: #D2FF1D;
  --accent-dim: rgba(210,255,29,0.12);
  --danger: #ff6b6b;
  --success: #34d399;
  --ease: cubic-bezier(0.16, 1, 0.3, 1);
  --radius: 14px;
  --radius-lg: 20px;

  background: var(--bg);
  color: var(--text);
  font-family: 'DM Sans', -apple-system, system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  min-height: 100vh;
}
.flow-root, .flow-root *, .flow-root *::before, .flow-root *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
.flow-root button,
.flow-root input,
.flow-root textarea,
.flow-root select { font-family: inherit; }
.flow-root button {
  border: none;
  cursor: pointer;
  background: none;
  color: inherit;
}
.flow-root .stage { display: none; min-height: 100vh; }
.flow-root .stage.active { display: block; }

/* ---- Topbar ---- */
.flow-root .topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 32px;
  max-width: 1440px;
  margin: 0 auto;
}
.flow-root .brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 800;
  font-size: 16px;
  letter-spacing: -0.02em;
}
.flow-root .brand-dot {
  width: 10px;
  height: 10px;
  background: var(--accent);
  border-radius: 3px;
}
.flow-root .top-links {
  display: flex;
  gap: 24px;
  font-size: 14px;
  color: var(--text-muted);
}
.flow-root .top-right {
  display: flex;
  gap: 10px;
  align-items: center;
}

/* ---- Buttons ---- */
.flow-root .btn {
  border-radius: 100px;
  padding: 11px 22px;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.25s var(--ease);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}
.flow-root .btn-primary { background: var(--accent); color: var(--bg); }
.flow-root .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 10px 30px rgba(210,255,29,0.25); }
.flow-root .btn-primary:disabled { background: var(--surface-2); color: var(--text-dim); cursor: not-allowed; box-shadow: none; transform: none; }
.flow-root .btn-ghost { color: var(--text-muted); border: 1px solid var(--border); }
.flow-root .btn-ghost:hover { color: var(--text); border-color: var(--border-2); }
.flow-root .btn-dark { background: var(--surface); color: var(--text); border: 1px solid var(--border); }
.flow-root .btn-dark:hover { border-color: var(--border-2); background: var(--surface-2); }
.flow-root .btn-block { width: 100%; justify-content: center; padding: 14px 22px; }
.flow-root .btn-lg { padding: 15px 32px; font-size: 15px; }

.flow-root .stage-tag {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px 14px;
  border-radius: 100px;
  border: 1px solid var(--border);
  font-size: 11px;
  color: var(--accent);
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.flow-root .tag-dot { color: var(--text-dim); }

/* ============ STAGE 1: URL hook ============ */
.flow-root .hook {
  min-height: calc(100vh - 80px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
}
.flow-root .hook-card {
  text-align: center;
  max-width: 680px;
  width: 100%;
}
.flow-root .hook-card .stage-tag { margin-bottom: 28px; }
.flow-root .url-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 48px 40px;
}
.flow-root .url-panel-title {
  font-size: 44px;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.05;
  margin-bottom: 10px;
}
.flow-root .url-panel-sub {
  color: var(--text-muted);
  font-size: 16px;
  margin-bottom: 32px;
}
.flow-root .url-field {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 100px;
  padding: 8px 8px 8px 24px;
  transition: all 0.25s var(--ease);
}
.flow-root .url-field:focus-within { border-color: var(--accent); }
.flow-root .url-prefix {
  color: var(--text-dim);
  font-size: 15px;
  font-family: ui-monospace, Menlo, monospace;
}
.flow-root .url-field input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text);
  font-size: 17px;
  font-weight: 500;
  outline: none;
  padding: 10px 0;
  border-bottom: 2px solid var(--accent);
}
.flow-root .url-field .btn-primary {
  padding: 14px 28px;
}

/* ============ STAGE 2: Five onboarding questions ============ */
.flow-root .s2-wrap {
  max-width: 780px;
  margin: 0 auto;
  padding: 20px 32px 80px;
}
.flow-root .s2-head { text-align: left; margin-bottom: 40px; }
.flow-root .s2-head .stage-tag { margin-bottom: 18px; }
.flow-root .s2-head h1 {
  font-size: 44px;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.05;
  margin-bottom: 12px;
}
.flow-root .s2-head p {
  font-size: 16px;
  color: var(--text-muted);
  max-width: 580px;
  line-height: 1.5;
}
.flow-root .s2-site-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  margin-bottom: 40px;
}
.flow-root .s2-site-icon {
  width: 40px;
  height: 40px;
  background: var(--accent);
  color: var(--bg);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 18px;
  flex-shrink: 0;
}
.flow-root .s2-site-info .s2-site-label {
  font-size: 11px;
  color: var(--text-dim);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 2px;
}
.flow-root .s2-site-info .s2-site-domain {
  font-size: 15px;
  color: var(--text);
  font-weight: 600;
}
.flow-root .s2-site-check {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--success);
  font-size: 13px;
  font-weight: 600;
}

.flow-root .s2-question {
  margin-bottom: 36px;
}
.flow-root .s2-q-head {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
}
.flow-root .s2-q-num {
  width: 32px;
  height: 32px;
  background: var(--bg);
  border: 1.5px solid var(--border-2);
  color: var(--text-muted);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
  transition: all 0.25s var(--ease);
}
.flow-root .s2-question.answered .s2-q-num {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--bg);
}
.flow-root .s2-q-text {
  font-size: 19px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.01em;
  line-height: 1.3;
}
.flow-root .s2-opts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding-left: 46px;
}
.flow-root .s2-opt {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  color: var(--text);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s var(--ease);
  text-align: left;
}
.flow-root .s2-opt:hover { border-color: var(--border-2); background: var(--surface-2); }
.flow-root .s2-opt.selected { border-color: var(--accent); background: var(--accent-dim); }
.flow-root .s2-opt-radio {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid var(--border-2);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s var(--ease);
}
.flow-root .s2-opt.selected .s2-opt-radio { border-color: var(--accent); }
.flow-root .s2-opt.selected .s2-opt-radio::after {
  content: '';
  width: 7px;
  height: 7px;
  background: var(--accent);
  border-radius: 50%;
}
.flow-root .s2-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 24px;
  border-top: 1px solid var(--border);
  margin-top: 20px;
}
.flow-root .s2-progress {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-muted);
  font-size: 13px;
}
.flow-root .s2-progress-bar {
  width: 120px;
  height: 4px;
  background: var(--border);
  border-radius: 100px;
  overflow: hidden;
}
.flow-root .s2-progress-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 100px;
  width: 0%;
  transition: width 0.4s var(--ease);
}

/* ============ STAGE 3: Editor ============ */
.flow-root .s3-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 28px;
  border-bottom: 1px solid var(--border);
  gap: 24px;
}
.flow-root .s3-top-left {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}
.flow-root .icon-btn {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s var(--ease);
  flex-shrink: 0;
}
.flow-root .icon-btn:hover { color: var(--text); border-color: var(--border-2); background: var(--surface-2); }
.flow-root .icon-btn svg { width: 18px; height: 18px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

.flow-root .s3-title-wrap {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.flow-root .s3-title {
  font-size: 16px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.01em;
}
.flow-root .s3-title-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 2px;
}
.flow-root .live-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 3px 10px;
  background: rgba(52,211,153,0.1);
  border: 1px solid rgba(52,211,153,0.3);
  border-radius: 100px;
  color: var(--success);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
}
.flow-root .live-pill::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--success);
  animation: livepulse 2s ease-in-out infinite;
}
@keyframes livepulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(52,211,153,0.5); }
  50% { box-shadow: 0 0 0 5px rgba(52,211,153,0); }
}
.flow-root .s3-saved { font-size: 12px; color: var(--text-dim); }
.flow-root .s3-top-right { display: flex; gap: 10px; }

.flow-root .s3-body {
  display: grid;
  grid-template-columns: 1fr 400px;
  min-height: calc(100vh - 90px);
}
.flow-root .s3-main {
  padding: 32px 40px 80px;
  overflow-y: auto;
  max-width: 880px;
  width: 100%;
  margin: 0 auto;
}
.flow-root .s3-main-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 22px;
}
.flow-root .s3-main-head h2 {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.flow-root .s3-main-head .s3-count {
  font-size: 13px;
  color: var(--text-muted);
}

/* Quiz question cards */
.flow-root .qc {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  margin-bottom: 12px;
  transition: all 0.2s var(--ease);
  overflow: hidden;
}
.flow-root .qc:hover { border-color: var(--border-2); }
.flow-root .qc.selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(210,255,29,0.08);
}
.flow-root .qc-head {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px 22px;
  cursor: pointer;
}
.flow-root .qc-num {
  width: 30px;
  height: 30px;
  background: var(--bg);
  border: 1.5px solid var(--border-2);
  color: var(--text-muted);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13px;
  flex-shrink: 0;
}
.flow-root .qc.selected .qc-num {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--bg);
}
.flow-root .qc-head-main { flex: 1; min-width: 0; }
.flow-root .qc-q {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.35;
  margin-bottom: 4px;
}
.flow-root .qc-meta {
  font-size: 12px;
  color: var(--text-dim);
}
.flow-root .qc-drag {
  color: var(--text-dim);
  display: flex;
  align-items: center;
  padding: 4px;
  cursor: grab;
}
.flow-root .qc-drag svg { width: 16px; height: 16px; stroke: currentColor; fill: none; stroke-width: 2; }

.flow-root .qc-body {
  padding: 0 22px 22px 68px;
  display: none;
}
.flow-root .qc.selected .qc-body { display: block; }
.flow-root .qc-opt-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  font-size: 13px;
  margin-bottom: 8px;
}
.flow-root .qc-opt-letter {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--text-muted);
  font-weight: 700;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.flow-root .qc-opt-text { flex: 1; color: var(--text); }

.flow-root .add-q-btn {
  width: 100%;
  padding: 18px;
  background: transparent;
  border: 1.5px dashed var(--border-2);
  border-radius: var(--radius);
  color: var(--accent);
  font-size: 14px;
  font-weight: 600;
  margin-top: 6px;
  transition: all 0.2s var(--ease);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.flow-root .add-q-btn:hover {
  border-color: var(--accent);
  background: var(--accent-dim);
}
.flow-root .add-q-btn svg { width: 18px; height: 18px; stroke: currentColor; fill: none; stroke-width: 2.2; stroke-linecap: round; }

/* Right sidebar editing panel */
.flow-root .s3-side {
  background: var(--bg-2);
  border-left: 1px solid var(--border);
  padding: 24px 24px 60px;
  position: sticky;
  top: 0;
  height: calc(100vh - 90px);
  overflow-y: auto;
}
.flow-root .s3-side-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.flow-root .s3-side-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-dim);
}
.flow-root .s3-side-close {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.flow-root .s3-side-close svg { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2; }

.flow-root .edit-group { margin-bottom: 24px; }
.flow-root .edit-group-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-dim);
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.flow-root .field-input,
.flow-root .field-textarea {
  width: 100%;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text);
  font-size: 14px;
  border-radius: 10px;
  padding: 12px 14px;
  outline: none;
  transition: border-color 0.2s var(--ease);
  resize: none;
}
.flow-root .field-input:focus,
.flow-root .field-textarea:focus { border-color: var(--accent); }
.flow-root .field-textarea { min-height: 76px; line-height: 1.4; }

.flow-root .answer-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.flow-root .answer-letter {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-muted);
  font-weight: 700;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.flow-root .answer-input {
  flex: 1;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text);
  font-size: 13px;
  border-radius: 8px;
  padding: 9px 12px;
  outline: none;
}
.flow-root .answer-input:focus { border-color: var(--accent); }
.flow-root .answer-del {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}
.flow-root .answer-del:hover { color: var(--danger); border-color: rgba(255,107,107,0.3); }
.flow-root .answer-del svg { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2; }

.flow-root .add-answer-btn {
  width: 100%;
  background: transparent;
  border: 1.5px dashed var(--border-2);
  color: var(--text-muted);
  padding: 10px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 4px;
}
.flow-root .add-answer-btn:hover { color: var(--accent); border-color: var(--accent); }
.flow-root .add-answer-btn svg { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2.2; }

.flow-root .divider {
  height: 1px;
  background: var(--border);
  margin: 20px 0;
}

.flow-root .stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 11px 0;
  font-size: 13px;
}
.flow-root .stat-row + .stat-row { border-top: 1px solid var(--border); }
.flow-root .stat-label { color: var(--text-muted); }
.flow-root .stat-value { color: var(--text); font-weight: 600; }

.flow-root .danger-btn {
  width: 100%;
  background: transparent;
  border: 1px solid rgba(255,107,107,0.2);
  color: var(--danger);
  padding: 12px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s var(--ease);
}
.flow-root .danger-btn:hover { background: rgba(255,107,107,0.08); border-color: rgba(255,107,107,0.4); }
.flow-root .danger-btn svg { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; }

.flow-root .empty-panel {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-dim);
}
.flow-root .empty-panel h4 {
  font-size: 15px;
  color: var(--text-muted);
  font-weight: 600;
  margin-bottom: 6px;
}
.flow-root .empty-panel p { font-size: 13px; }

/* ============ STAGE 4: Visitor preview ============ */
.flow-root .s4-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 28px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-2);
}
.flow-root .s4-note {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-muted);
  font-size: 13px;
}
.flow-root .s4-note-dot {
  width: 8px;
  height: 8px;
  background: var(--accent);
  border-radius: 50%;
  animation: livepulse 2s ease-in-out infinite;
}
.flow-root .s4-stage {
  max-width: 640px;
  margin: 0 auto;
  padding: 60px 32px 80px;
}
.flow-root .s4-progress-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.flow-root .s4-step-label {
  font-size: 13px;
  color: var(--text-muted);
  font-weight: 500;
}
.flow-root .s4-pct {
  font-size: 13px;
  color: var(--accent);
  font-weight: 700;
  background: var(--accent-dim);
  padding: 3px 12px;
  border-radius: 100px;
}
.flow-root .s4-bar {
  height: 5px;
  background: var(--border);
  border-radius: 100px;
  margin-bottom: 56px;
  overflow: hidden;
}
.flow-root .s4-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 100px;
  transition: width 0.4s var(--ease);
}
.flow-root .s4-q-num-label {
  font-size: 12px;
  color: var(--text-dim);
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 14px;
}
.flow-root .s4-q {
  font-size: 36px;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.1;
  margin-bottom: 40px;
}
.flow-root .s4-opts {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 32px;
}
.flow-root .s4-opt {
  padding: 20px 24px;
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: 14px;
  color: var(--text);
  font-size: 16px;
  font-weight: 500;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.2s var(--ease);
  width: 100%;
}
.flow-root .s4-opt:hover { border-color: var(--accent); transform: translateY(-1px); }
.flow-root .s4-opt-letter {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: var(--bg);
  border: 1.5px solid var(--border-2);
  color: var(--text-muted);
  font-weight: 700;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s var(--ease);
}
.flow-root .s4-opt:hover .s4-opt-letter {
  border-color: var(--accent);
  color: var(--accent);
}
.flow-root .s4-back-btn {
  color: var(--text-muted);
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.flow-root .s4-back-btn:hover { color: var(--text); }

/* Result screen */
.flow-root .s4-result {
  text-align: center;
  padding: 60px 32px 80px;
  max-width: 640px;
  margin: 0 auto;
}
.flow-root .s4-result-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: var(--accent-dim);
  border: 1px solid var(--accent);
  border-radius: 100px;
  color: var(--accent);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 24px;
}
.flow-root .s4-result-title {
  font-size: 48px;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.05;
  margin-bottom: 16px;
}
.flow-root .s4-result-desc {
  font-size: 17px;
  color: var(--text-muted);
  line-height: 1.5;
  margin-bottom: 40px;
}
.flow-root .s4-result-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 32px;
  text-align: left;
  margin-bottom: 32px;
}
.flow-root .s4-result-card h4 {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.01em;
  margin-bottom: 8px;
}
.flow-root .s4-result-card p {
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 20px;
}
.flow-root .s4-result-points {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.flow-root .s4-result-point {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  font-size: 14px;
  color: var(--text);
}
.flow-root .s4-result-point-check {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--accent);
  color: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}
.flow-root .s4-result-point-check svg { width: 10px; height: 10px; stroke: currentColor; fill: none; stroke-width: 3; }

/* ============ STAGE 5: Sign in ============ */
.flow-root .s5 {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
}
.flow-root .s5-card {
  max-width: 440px;
  width: 100%;
  text-align: center;
}
.flow-root .s5-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 800;
  font-size: 18px;
  letter-spacing: -0.02em;
  margin-bottom: 32px;
}
.flow-root .s5-banner {
  background: var(--accent-dim);
  border: 1px solid var(--accent);
  border-radius: 12px;
  padding: 14px 18px;
  color: var(--accent);
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 28px;
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: center;
}
.flow-root .s5-banner svg { width: 16px; height: 16px; stroke: currentColor; fill: none; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
.flow-root .s5-title {
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin-bottom: 8px;
  line-height: 1.15;
}
.flow-root .s5-sub {
  color: var(--text-muted);
  font-size: 15px;
  margin-bottom: 32px;
}
.flow-root .s5-social {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 24px;
}
.flow-root .s5-social-btn {
  padding: 14px 20px;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: 100px;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.2s var(--ease);
}
.flow-root .s5-social-btn:hover { border-color: var(--border-2); background: var(--surface-2); }
.flow-root .s5-social-btn svg { width: 18px; height: 18px; }
.flow-root .s5-divider {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
  color: var(--text-dim);
  font-size: 12px;
}
.flow-root .s5-divider::before,
.flow-root .s5-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border);
}
.flow-root .s5-field {
  text-align: left;
  margin-bottom: 14px;
}
.flow-root .s5-field label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 6px;
}
.flow-root .s5-input {
  width: 100%;
  padding: 14px 18px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  color: var(--text);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s var(--ease);
}
.flow-root .s5-input:focus { border-color: var(--accent); }
.flow-root .s5-submit {
  width: 100%;
  margin-top: 8px;
  justify-content: center;
}
.flow-root .s5-foot {
  margin-top: 22px;
  color: var(--text-dim);
  font-size: 13px;
}
.flow-root .s5-foot a {
  color: var(--accent);
  text-decoration: none;
  font-weight: 600;
  cursor: pointer;
}

/* ============ STAGE 6: Publish ============ */
.flow-root .s6-banner {
  background: linear-gradient(135deg, rgba(52,211,153,0.08), rgba(210,255,29,0.06));
  border-bottom: 1px solid rgba(52,211,153,0.2);
  padding: 16px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}
.flow-root .s6-banner-left {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text);
  font-size: 14px;
}
.flow-root .s6-banner-dot {
  width: 10px;
  height: 10px;
  background: var(--success);
  border-radius: 50%;
  box-shadow: 0 0 0 4px rgba(52,211,153,0.15);
}
.flow-root .s6-banner-left strong { color: var(--success); }
.flow-root .s6-wrap {
  max-width: 1100px;
  margin: 0 auto;
  padding: 48px 32px 80px;
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 32px;
  align-items: start;
}
.flow-root .s6-head {
  grid-column: 1 / -1;
  margin-bottom: 8px;
}
.flow-root .s6-head .stage-tag { margin-bottom: 16px; }
.flow-root .s6-head h1 {
  font-size: 40px;
  font-weight: 800;
  letter-spacing: -0.03em;
  margin-bottom: 8px;
}
.flow-root .s6-head p {
  color: var(--text-muted);
  font-size: 15px;
}
.flow-root .s6-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 28px 30px;
  margin-bottom: 16px;
}
.flow-root .s6-card h3 {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 14px;
}
.flow-root .s6-url-row {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px 18px;
}
.flow-root .s6-url {
  flex: 1;
  font-family: ui-monospace, Menlo, monospace;
  font-size: 14px;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.flow-root .s6-copy-btn {
  padding: 8px 16px;
  background: var(--accent);
  color: var(--bg);
  border-radius: 100px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}
.flow-root .s6-copy-btn svg { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.flow-root .s6-embed-code {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px 18px;
  font-family: ui-monospace, Menlo, monospace;
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.6;
  white-space: pre;
  overflow-x: auto;
}
.flow-root .s6-embed-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  font-size: 12px;
  color: var(--text-dim);
}
.flow-root .s6-quick-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 16px;
}
.flow-root .s6-quick-btn {
  padding: 14px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  color: var(--text);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.2s var(--ease);
}
.flow-root .s6-quick-btn:hover { border-color: var(--border-2); background: var(--surface-2); }
.flow-root .s6-quick-btn svg { width: 16px; height: 16px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; flex-shrink: 0; }

.flow-root .s6-side-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 24px 26px;
  position: sticky;
  top: 24px;
}
.flow-root .s6-side-card h3 {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 4px;
}
.flow-root .s6-side-card .s6-side-sub {
  color: var(--text-muted);
  font-size: 13px;
  margin-bottom: 20px;
}
.flow-root .s6-quiz-preview-card {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 18px 20px;
  margin-bottom: 20px;
}
.flow-root .s6-preview-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-dim);
  margin-bottom: 8px;
}
.flow-root .s6-preview-title {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.3;
  margin-bottom: 10px;
}
.flow-root .s6-preview-mini {
  display: flex;
  gap: 4px;
  margin-bottom: 4px;
}
.flow-root .s6-preview-mini span {
  height: 6px;
  background: var(--border);
  border-radius: 100px;
  flex: 1;
}
.flow-root .s6-preview-mini span:first-child { background: var(--accent); flex: 2; }

@media (max-width: 1000px) {
  .flow-root .s3-body { grid-template-columns: 1fr; }
  .flow-root .s2-opts { grid-template-columns: 1fr; }
  .flow-root .s2-wrap { padding: 20px 24px 60px; }
  .flow-root .s6-wrap { grid-template-columns: 1fr; }
  .flow-root .s4-q { font-size: 28px; }
  .flow-root .s4-result-title { font-size: 36px; }
}
`;
export default FLOW_CSS;
