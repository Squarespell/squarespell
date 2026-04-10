/**
 * Design tokens + component CSS for the Squarespell funnel.
 * Source of truth: /sessions/upbeat-jolly-wozniak/mnt/outputs/prototype-v4.html
 * If you change tokens, update prototype-v4.html FIRST, then re-extract.
 *
 * Covers all 6 stages: Stage 1 (embed hook), 2 (onboarding), 3 (editor),
 * 4 (visitor preview with device switcher), 5 (sign in), 6 (publish).
 */
export const FLOW_CSS = `
  :root {
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
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    background: var(--bg);
    color: var(--text);
    font-family: 'DM Sans', -apple-system, system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    min-height: 100vh;
  }
  button, input, textarea, select { font-family: inherit; }
  button { border: none; cursor: pointer; background: none; color: inherit; }
  .stage { display: none; min-height: 100vh; }
  .stage.active { display: block; }

  /* ---- Topbar ---- */
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 32px;
    max-width: 1440px;
    margin: 0 auto;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 800;
    font-size: 16px;
    letter-spacing: -0.02em;
  }
  .brand-dot {
    width: 10px;
    height: 10px;
    background: var(--accent);
    border-radius: 3px;
  }
  .top-links {
    display: flex;
    gap: 24px;
    font-size: 14px;
    color: var(--text-muted);
  }
  .top-right {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  /* ---- Buttons ---- */
  .btn {
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
  .btn-primary { background: var(--accent); color: var(--bg); }
  .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 10px 30px rgba(210,255,29,0.25); }
  .btn-primary:disabled { background: var(--surface-2); color: var(--text-dim); cursor: not-allowed; box-shadow: none; transform: none; }
  .btn-ghost { color: var(--text-muted); border: 1px solid var(--border); }
  .btn-ghost:hover { color: var(--text); border-color: var(--border-2); }
  .btn-dark { background: var(--surface); color: var(--text); border: 1px solid var(--border); }
  .btn-dark:hover { border-color: var(--border-2); background: var(--surface-2); }
  .btn-block { width: 100%; justify-content: center; padding: 14px 22px; }
  .btn-lg { padding: 15px 32px; font-size: 15px; }

  .stage-tag {
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
  .tag-dot { color: var(--text-dim); }

  /* ============ STAGE 1: Embeddable URL hook widget ============ */
  .hook {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 24px;
    flex-direction: column;
  }
  .embed-label {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 14px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 100px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 20px;
  }
  .embed-label .dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 0 3px rgba(210,255,29,0.15);
  }
  .hook-widget {
    width: 100%;
    max-width: 640px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 10px 10px 10px 10px;
  }
  .url-field {
    display: flex;
    align-items: center;
    gap: 12px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 100px;
    padding: 8px 8px 8px 24px;
    transition: all 0.25s var(--ease);
  }
  .url-field:focus-within { border-color: var(--accent); }
  .url-prefix {
    color: var(--text-dim);
    font-size: 15px;
    font-family: ui-monospace, Menlo, monospace;
  }
  .url-field input {
    flex: 1;
    background: transparent;
    border: none;
    color: var(--text);
    font-size: 17px;
    font-weight: 500;
    outline: none;
    padding: 14px 0;
  }
  .url-field input::placeholder { color: var(--text-dim); }
  .url-field .btn-primary { padding: 14px 28px; }
  .hook-err {
    margin-top: 14px;
    padding: 12px 18px;
    background: rgba(255,107,107,0.06);
    border: 1px solid rgba(255,107,107,0.25);
    border-radius: 12px;
    color: var(--danger);
    font-size: 13px;
    display: none;
    text-align: left;
    max-width: 640px;
    width: 100%;
  }
  .hook-err.show { display: block; }
  .hook-embed-hint {
    margin-top: 22px;
    color: var(--text-dim);
    font-size: 12px;
    letter-spacing: 0.02em;
    max-width: 640px;
    text-align: center;
    line-height: 1.6;
  }
  .hook-embed-hint code {
    background: var(--surface);
    border: 1px solid var(--border);
    padding: 2px 8px;
    border-radius: 6px;
    font-family: ui-monospace, Menlo, monospace;
    font-size: 11px;
    color: var(--text-muted);
  }

  /* ============ STAGE 2: Five onboarding questions ============ */
  .s2-wrap { max-width: 780px; margin: 0 auto; padding: 20px 32px 80px; }
  .s2-head { text-align: left; margin-bottom: 40px; }
  .s2-head .stage-tag { margin-bottom: 18px; }
  .s2-head h1 { font-size: 44px; font-weight: 800; letter-spacing: -0.03em; line-height: 1.05; margin-bottom: 12px; }
  .s2-head p { font-size: 16px; color: var(--text-muted); max-width: 580px; line-height: 1.5; }
  .s2-site-card {
    display: flex; align-items: center; gap: 14px;
    padding: 16px 20px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    margin-bottom: 40px;
  }
  .s2-site-icon {
    width: 40px; height: 40px;
    background: var(--accent); color: var(--bg);
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-weight: 800; font-size: 18px; flex-shrink: 0;
  }
  .s2-site-info .s2-site-label {
    font-size: 11px; color: var(--text-dim); font-weight: 700;
    letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 2px;
  }
  .s2-site-info .s2-site-domain { font-size: 15px; color: var(--text); font-weight: 600; }
  .s2-site-check {
    margin-left: auto; display: flex; align-items: center; gap: 8px;
    color: var(--success); font-size: 13px; font-weight: 600;
  }
  .s2-question { margin-bottom: 36px; }
  .s2-q-head { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
  .s2-q-num {
    width: 32px; height: 32px;
    background: var(--bg); border: 1.5px solid var(--border-2);
    color: var(--text-muted); border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 14px; flex-shrink: 0;
    transition: all 0.25s var(--ease);
  }
  .s2-question.answered .s2-q-num { background: var(--accent); border-color: var(--accent); color: var(--bg); }
  .s2-q-text { font-size: 19px; font-weight: 700; color: var(--text); letter-spacing: -0.01em; line-height: 1.3; }
  .s2-opts { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding-left: 46px; }
  .s2-opt {
    display: flex; align-items: center; gap: 12px;
    padding: 14px 18px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 12px; color: var(--text); font-size: 14px;
    cursor: pointer; transition: all 0.2s var(--ease); text-align: left;
  }
  .s2-opt:hover { border-color: var(--border-2); background: var(--surface-2); }
  .s2-opt.selected { border-color: var(--accent); background: var(--accent-dim); }
  .s2-opt-radio {
    width: 16px; height: 16px; border-radius: 50%;
    border: 2px solid var(--border-2); flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.2s var(--ease);
  }
  .s2-opt.selected .s2-opt-radio { border-color: var(--accent); }
  .s2-opt.selected .s2-opt-radio::after { content: ''; width: 7px; height: 7px; background: var(--accent); border-radius: 50%; }
  .s2-foot {
    display: flex; justify-content: space-between; align-items: center;
    padding-top: 24px; border-top: 1px solid var(--border); margin-top: 20px;
  }
  .s2-progress { display: flex; align-items: center; gap: 12px; color: var(--text-muted); font-size: 13px; }
  .s2-progress-bar { width: 120px; height: 4px; background: var(--border); border-radius: 100px; overflow: hidden; }
  .s2-progress-fill { height: 100%; background: var(--accent); border-radius: 100px; width: 0%; transition: width 0.4s var(--ease); }

  /* ============ STAGE 3: Editor ============ */
  .s3-top {
    display: flex; align-items: center; justify-content: space-between;
    padding: 18px 28px; border-bottom: 1px solid var(--border); gap: 24px;
  }
  .s3-top-left { display: flex; align-items: center; gap: 16px; min-width: 0; }
  .icon-btn {
    width: 38px; height: 38px; border-radius: 10px;
    background: var(--surface); border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    color: var(--text-muted); cursor: pointer;
    transition: all 0.2s var(--ease); flex-shrink: 0;
  }
  .icon-btn:hover { color: var(--text); border-color: var(--border-2); background: var(--surface-2); }
  .icon-btn svg { width: 18px; height: 18px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .s3-title-wrap { display: flex; flex-direction: column; min-width: 0; }
  .s3-title { font-size: 16px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -0.01em; }
  .s3-title-meta { display: flex; align-items: center; gap: 10px; margin-top: 2px; }
  .live-pill {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 3px 10px;
    background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.3);
    border-radius: 100px; color: var(--success);
    font-size: 10px; font-weight: 700; letter-spacing: 0.06em;
  }
  .live-pill::before {
    content: ''; width: 6px; height: 6px; border-radius: 50%;
    background: var(--success); animation: livepulse 2s ease-in-out infinite;
  }
  @keyframes livepulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(52,211,153,0.5); }
    50% { box-shadow: 0 0 0 5px rgba(52,211,153,0); }
  }
  .s3-saved { font-size: 12px; color: var(--text-dim); }
  .s3-top-right { display: flex; gap: 10px; }
  .s3-body { display: grid; grid-template-columns: 1fr 400px; min-height: calc(100vh - 90px); }
  .s3-main { padding: 32px 40px 80px; overflow-y: auto; max-width: 880px; width: 100%; margin: 0 auto; }
  .s3-main-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; }
  .s3-main-head h2 { font-size: 20px; font-weight: 700; letter-spacing: -0.01em; }
  .s3-main-head .s3-count { font-size: 13px; color: var(--text-muted); }
  .qc {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); margin-bottom: 12px;
    transition: all 0.2s var(--ease); overflow: hidden;
  }
  .qc:hover { border-color: var(--border-2); }
  .qc.selected { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(210,255,29,0.08); }
  .qc-head { display: flex; align-items: flex-start; gap: 16px; padding: 20px 22px; cursor: pointer; }
  .qc-num {
    width: 30px; height: 30px;
    background: var(--bg); border: 1.5px solid var(--border-2);
    color: var(--text-muted); border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 13px; flex-shrink: 0;
  }
  .qc.selected .qc-num { background: var(--accent); border-color: var(--accent); color: var(--bg); }
  .qc-head-main { flex: 1; min-width: 0; }
  .qc-q { font-size: 15px; font-weight: 600; color: var(--text); line-height: 1.35; margin-bottom: 4px; }
  .qc-meta { font-size: 12px; color: var(--text-dim); }
  .qc-drag { color: var(--text-dim); display: flex; align-items: center; padding: 4px; cursor: grab; }
  .qc-drag svg { width: 16px; height: 16px; stroke: currentColor; fill: none; stroke-width: 2; }
  .qc-body { padding: 0 22px 22px 68px; display: none; }
  .qc.selected .qc-body { display: block; }
  .qc-opt-row {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 14px;
    background: var(--bg); border: 1px solid var(--border);
    border-radius: 10px; font-size: 13px; margin-bottom: 8px;
  }
  .qc-opt-letter {
    width: 22px; height: 22px; border-radius: 6px;
    background: var(--surface-2); border: 1px solid var(--border);
    color: var(--text-muted); font-weight: 700; font-size: 11px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .qc-opt-text { flex: 1; color: var(--text); }
  .add-q-btn {
    width: 100%; padding: 18px;
    background: transparent; border: 1.5px dashed var(--border-2);
    border-radius: var(--radius); color: var(--accent);
    font-size: 14px; font-weight: 600; margin-top: 6px;
    transition: all 0.2s var(--ease);
    display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .add-q-btn:hover { border-color: var(--accent); background: var(--accent-dim); }
  .add-q-btn svg { width: 18px; height: 18px; stroke: currentColor; fill: none; stroke-width: 2.2; stroke-linecap: round; }
  .s3-side {
    background: var(--bg-2); border-left: 1px solid var(--border);
    padding: 24px 24px 60px; position: sticky; top: 0;
    height: calc(100vh - 90px); overflow-y: auto;
  }
  .s3-side-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
  .s3-side-label { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-dim); }
  .s3-side-close {
    width: 28px; height: 28px; border-radius: 8px;
    background: var(--surface); border: 1px solid var(--border);
    color: var(--text-muted); display: flex; align-items: center; justify-content: center; cursor: pointer;
  }
  .s3-side-close svg { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2; }
  .edit-group { margin-bottom: 24px; }
  .edit-group-label {
    font-size: 11px; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase; color: var(--text-dim);
    margin-bottom: 10px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .field-input, .field-textarea {
    width: 100%; background: var(--surface);
    border: 1px solid var(--border); color: var(--text);
    font-size: 14px; border-radius: 10px; padding: 12px 14px;
    outline: none; transition: border-color 0.2s var(--ease); resize: none;
  }
  .field-input:focus, .field-textarea:focus { border-color: var(--accent); }
  .field-textarea { min-height: 76px; line-height: 1.4; }
  .answer-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  .answer-letter {
    width: 26px; height: 26px; border-radius: 7px;
    background: var(--surface); border: 1px solid var(--border);
    color: var(--text-muted); font-weight: 700; font-size: 11px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .answer-input {
    flex: 1; background: var(--surface); border: 1px solid var(--border);
    color: var(--text); font-size: 13px;
    border-radius: 8px; padding: 9px 12px; outline: none;
  }
  .answer-input:focus { border-color: var(--accent); }
  .answer-del {
    width: 30px; height: 30px; border-radius: 8px;
    background: var(--surface); border: 1px solid var(--border);
    color: var(--text-muted); display: flex; align-items: center; justify-content: center;
    cursor: pointer; flex-shrink: 0;
  }
  .answer-del:hover { color: var(--danger); border-color: rgba(255,107,107,0.3); }
  .answer-del svg { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2; }
  .add-answer-btn {
    width: 100%; background: transparent;
    border: 1.5px dashed var(--border-2); color: var(--text-muted);
    padding: 10px; border-radius: 10px;
    font-size: 13px; font-weight: 600;
    display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 4px;
  }
  .add-answer-btn:hover { color: var(--accent); border-color: var(--accent); }
  .add-answer-btn svg { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2.2; }
  .divider { height: 1px; background: var(--border); margin: 20px 0; }
  .stat-row { display: flex; justify-content: space-between; align-items: center; padding: 11px 0; font-size: 13px; }
  .stat-row + .stat-row { border-top: 1px solid var(--border); }
  .stat-label { color: var(--text-muted); }
  .stat-value { color: var(--text); font-weight: 600; }
  .danger-btn {
    width: 100%; background: transparent;
    border: 1px solid rgba(255,107,107,0.2); color: var(--danger);
    padding: 12px; border-radius: 10px;
    font-size: 13px; font-weight: 600;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    transition: all 0.2s var(--ease);
  }
  .danger-btn:hover { background: rgba(255,107,107,0.08); border-color: rgba(255,107,107,0.4); }
  .danger-btn svg { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; }
  .empty-panel { text-align: center; padding: 40px 20px; color: var(--text-dim); }
  .empty-panel h4 { font-size: 15px; color: var(--text-muted); font-weight: 600; margin-bottom: 6px; }
  .empty-panel p { font-size: 13px; }

  /* ============ STAGE 4 (REBUILT): Visitor preview with device switcher + faux browser + brand ============ */
  .s4-top {
    display: flex; align-items: center; justify-content: space-between;
    padding: 18px 28px; border-bottom: 1px solid var(--border);
    background: var(--bg-2); gap: 20px;
  }
  .s4-top-left { display: flex; align-items: center; gap: 14px; }
  .s4-top-center {
    position: absolute; left: 50%; transform: translateX(-50%);
    display: flex; align-items: center; gap: 10px;
    color: var(--text-muted); font-size: 13px;
  }
  .s4-top-wrap { position: relative; }
  .s4-note-dot {
    width: 8px; height: 8px; background: var(--success);
    border-radius: 50%; animation: livepulse 2s ease-in-out infinite;
  }
  .s4-top-right { display: flex; align-items: center; gap: 12px; }
  .s4-device-switch {
    display: inline-flex; background: var(--surface);
    border: 1px solid var(--border); border-radius: 12px;
    padding: 4px; gap: 2px;
  }
  .s4-device-btn {
    width: 38px; height: 32px; border-radius: 8px;
    color: var(--text-muted); display: flex;
    align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.2s var(--ease);
  }
  .s4-device-btn:hover { color: var(--text); }
  .s4-device-btn.active { background: var(--accent); color: var(--bg); }
  .s4-device-btn svg { width: 18px; height: 18px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

  .s4-canvas {
    display: flex; justify-content: center;
    padding: 40px 24px 80px;
    min-height: calc(100vh - 90px);
    background:
      radial-gradient(circle at 50% 0%, rgba(210,255,29,0.04), transparent 60%),
      var(--bg);
  }
  .s4-frame {
    background: var(--bg-2);
    border: 1px solid var(--border);
    border-radius: 20px;
    box-shadow: 0 30px 80px rgba(0,0,0,0.5);
    overflow: hidden;
    transition: width 0.4s var(--ease), max-width 0.4s var(--ease);
    width: 100%;
  }
  .s4-frame.desktop { max-width: 1180px; }
  .s4-frame.tablet  { max-width: 820px; }
  .s4-frame.mobile  { max-width: 400px; }

  .s4-chrome {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 16px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
  }
  .s4-dots { display: flex; gap: 6px; }
  .s4-dots span {
    width: 11px; height: 11px; border-radius: 50%;
    background: var(--border-2);
  }
  .s4-dots span:nth-child(1) { background: #ff5f57; }
  .s4-dots span:nth-child(2) { background: #febc2e; }
  .s4-dots span:nth-child(3) { background: #28c840; }
  .s4-addr {
    flex: 1; display: flex; align-items: center; gap: 8px;
    background: var(--bg); border: 1px solid var(--border);
    border-radius: 100px; padding: 6px 14px;
    font-family: ui-monospace, Menlo, monospace;
    font-size: 12px; color: var(--text-muted);
    overflow: hidden;
  }
  .s4-addr svg { width: 12px; height: 12px; stroke: currentColor; fill: none; stroke-width: 2; flex-shrink: 0; }
  .s4-addr-host { color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .s4-chrome-right {
    display: flex; gap: 4px;
    color: var(--text-dim);
  }
  .s4-chrome-right span {
    width: 4px; height: 4px; background: currentColor; border-radius: 50%;
  }

  /* --- Inside the frame: the visitor's site header (detected brand) --- */
  .s4-site {
    background: var(--site-bg, #ffffff);
    color: var(--site-text, #1a1a1a);
    font-family: var(--site-body-font, 'Inter', sans-serif);
    min-height: 620px;
  }
  .s4-site-nav {
    display: flex; align-items: center; justify-content: space-between;
    padding: 22px 40px;
    border-bottom: 1px solid rgba(0,0,0,0.06);
  }
  .s4-site-logo {
    display: flex; align-items: center; gap: 10px;
    font-family: var(--site-heading-font, 'Playfair Display', serif);
    font-weight: 700;
    font-size: 20px;
    letter-spacing: -0.01em;
    color: var(--site-text, #1a1a1a);
  }
  .s4-site-logo-mark {
    width: 30px; height: 30px; border-radius: 8px;
    background: var(--site-primary, #5a7a4a);
    color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-weight: 800; font-size: 13px;
    font-family: 'DM Sans', sans-serif;
  }
  .s4-site-links {
    display: flex; gap: 28px;
    font-size: 14px;
    color: var(--site-text, #1a1a1a);
    opacity: 0.75;
  }
  .s4-frame.mobile .s4-site-links { display: none; }
  .s4-frame.mobile .s4-site-nav { padding: 18px 22px; }

  .s4-site-body {
    padding: 40px 40px 60px;
    max-width: 720px;
    margin: 0 auto;
  }
  .s4-frame.mobile .s4-site-body { padding: 28px 22px 50px; }
  .s4-frame.tablet .s4-site-body { padding: 36px 30px 60px; }

  .s4-site-eyebrow {
    display: inline-block;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--site-primary, #5a7a4a);
    margin-bottom: 12px;
  }
  .s4-site-title {
    font-family: var(--site-heading-font, 'Playfair Display', serif);
    font-size: 36px;
    font-weight: 700;
    letter-spacing: -0.01em;
    line-height: 1.1;
    color: var(--site-text, #1a1a1a);
    margin-bottom: 14px;
  }
  .s4-frame.mobile .s4-site-title { font-size: 26px; }
  .s4-site-sub {
    font-size: 15px;
    line-height: 1.5;
    color: var(--site-text, #1a1a1a);
    opacity: 0.7;
    margin-bottom: 32px;
  }

  /* --- The quiz inside the visitor's site (brand-styled) --- */
  .s4-quiz {
    background: var(--site-surface, #ffffff);
    border: 1px solid var(--site-border, rgba(0,0,0,0.08));
    border-radius: var(--site-radius, 16px);
    padding: 32px 34px;
    box-shadow: 0 14px 40px rgba(0,0,0,0.08);
  }
  .s4-frame.mobile .s4-quiz { padding: 24px 22px; }

  .s4-quiz-prog {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 10px;
    font-size: 12px;
    color: var(--site-text, #1a1a1a);
    opacity: 0.7;
    font-family: 'Inter', 'DM Sans', sans-serif;
  }
  .s4-quiz-bar {
    height: 4px;
    background: rgba(0,0,0,0.08);
    border-radius: 100px;
    overflow: hidden;
    margin-bottom: 28px;
  }
  .s4-quiz-fill {
    height: 100%;
    background: var(--site-primary, #5a7a4a);
    border-radius: 100px;
    transition: width 0.4s var(--ease);
  }
  .s4-quiz-qlabel {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--site-primary, #5a7a4a);
    margin-bottom: 10px;
    font-family: 'Inter', 'DM Sans', sans-serif;
  }
  .s4-quiz-q {
    font-family: var(--site-heading-font, 'Playfair Display', serif);
    font-size: 26px;
    font-weight: 700;
    letter-spacing: -0.01em;
    line-height: 1.2;
    color: var(--site-text, #1a1a1a);
    margin-bottom: 24px;
  }
  .s4-frame.mobile .s4-quiz-q { font-size: 22px; }
  .s4-quiz-opts { display: flex; flex-direction: column; gap: 10px; }
  .s4-quiz-opt {
    display: flex; align-items: center; gap: 14px;
    padding: 16px 20px;
    background: var(--site-surface, #ffffff);
    border: 1.5px solid var(--site-border, rgba(0,0,0,0.1));
    border-radius: calc(var(--site-radius, 16px) - 4px);
    color: var(--site-text, #1a1a1a);
    font-family: var(--site-body-font, 'Inter', sans-serif);
    font-size: 15px;
    font-weight: 500;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s var(--ease);
    width: 100%;
  }
  .s4-quiz-opt:hover {
    border-color: var(--site-primary, #5a7a4a);
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(0,0,0,0.06);
  }
  .s4-quiz-opt.picked {
    border-color: var(--site-primary, #5a7a4a);
    background: var(--site-primary-dim, rgba(90,122,74,0.08));
  }
  .s4-quiz-opt-letter {
    width: 30px; height: 30px;
    border-radius: 8px;
    background: rgba(0,0,0,0.04);
    border: 1px solid rgba(0,0,0,0.08);
    color: var(--site-text, #1a1a1a);
    font-weight: 700;
    font-size: 12px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    font-family: 'Inter', 'DM Sans', sans-serif;
    transition: all 0.2s var(--ease);
  }
  .s4-quiz-opt:hover .s4-quiz-opt-letter,
  .s4-quiz-opt.picked .s4-quiz-opt-letter {
    background: var(--site-primary, #5a7a4a);
    border-color: var(--site-primary, #5a7a4a);
    color: #ffffff;
  }
  .s4-quiz-back {
    margin-top: 22px;
    font-size: 13px;
    color: var(--site-text, #1a1a1a);
    opacity: 0.6;
    display: inline-flex; align-items: center; gap: 6px;
    cursor: pointer;
    font-family: var(--site-body-font, 'Inter', sans-serif);
  }
  .s4-quiz-back:hover { opacity: 0.9; }

  /* Result screen inside faux browser */
  .s4-quiz-result { text-align: center; padding: 8px 0; }
  .s4-quiz-result-badge {
    display: inline-block;
    font-size: 11px; font-weight: 700;
    letter-spacing: 0.12em; text-transform: uppercase;
    color: var(--site-primary, #5a7a4a);
    margin-bottom: 14px;
    font-family: 'Inter', 'DM Sans', sans-serif;
  }
  .s4-quiz-result-title {
    font-family: var(--site-heading-font, 'Playfair Display', serif);
    font-size: 34px; font-weight: 700;
    letter-spacing: -0.01em; line-height: 1.1;
    color: var(--site-text, #1a1a1a);
    margin-bottom: 14px;
  }
  .s4-frame.mobile .s4-quiz-result-title { font-size: 26px; }
  .s4-quiz-result-desc {
    font-size: 15px;
    color: var(--site-text, #1a1a1a);
    opacity: 0.7;
    line-height: 1.5;
    margin-bottom: 24px;
    font-family: var(--site-body-font, 'Inter', sans-serif);
  }
  .s4-quiz-result-cta {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 14px 28px;
    background: var(--site-primary, #5a7a4a);
    color: #ffffff;
    border-radius: 100px;
    font-weight: 600; font-size: 14px;
    cursor: pointer;
    transition: all 0.2s var(--ease);
    font-family: var(--site-body-font, 'Inter', sans-serif);
  }
  .s4-quiz-result-cta:hover { transform: translateY(-1px); box-shadow: 0 10px 24px rgba(0,0,0,0.15); }
  .s4-quiz-result-restart {
    margin-top: 16px;
    display: inline-block;
    font-size: 13px;
    color: var(--site-text, #1a1a1a);
    opacity: 0.55;
    cursor: pointer;
    font-family: var(--site-body-font, 'Inter', sans-serif);
  }

  /* Detected brand badge above frame */
  .s4-brand-badge {
    display: inline-flex; align-items: center; gap: 12px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 100px;
    padding: 8px 16px 8px 8px;
    margin-bottom: 20px;
    font-size: 12px;
    color: var(--text-muted);
  }
  .s4-brand-badge .bb-chip {
    display: flex; align-items: center; gap: 6px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 100px;
    padding: 4px 10px 4px 4px;
    color: var(--text);
    font-weight: 600;
  }
  .s4-brand-badge .bb-swatch {
    width: 14px; height: 14px; border-radius: 50%;
    border: 1px solid rgba(255,255,255,0.15);
  }
  .s4-brand-badge strong { color: var(--success); }

  /* ============ STAGE 5: Sign in ============ */
  .s5 { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 40px 24px; }
  .s5-card { max-width: 440px; width: 100%; text-align: center; }
  .s5-brand { display: inline-flex; align-items: center; gap: 10px; font-weight: 800; font-size: 18px; letter-spacing: -0.02em; margin-bottom: 32px; }
  .s5-banner {
    background: var(--accent-dim); border: 1px solid var(--accent);
    border-radius: 12px; padding: 14px 18px;
    color: var(--accent); font-size: 13px; font-weight: 600;
    margin-bottom: 28px;
    display: flex; align-items: center; gap: 10px; justify-content: center;
  }
  .s5-banner svg { width: 16px; height: 16px; stroke: currentColor; fill: none; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
  .s5-title { font-size: 32px; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 8px; line-height: 1.15; }
  .s5-sub { color: var(--text-muted); font-size: 15px; margin-bottom: 32px; }
  .s5-social { display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px; }
  .s5-social-btn {
    padding: 14px 20px;
    background: var(--surface); border: 1px solid var(--border);
    color: var(--text); border-radius: 100px;
    font-size: 14px; font-weight: 600;
    display: flex; align-items: center; justify-content: center; gap: 12px;
    cursor: pointer; transition: all 0.2s var(--ease);
  }
  .s5-social-btn:hover { border-color: var(--border-2); background: var(--surface-2); }
  .s5-social-btn svg { width: 18px; height: 18px; }
  .s5-divider { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; color: var(--text-dim); font-size: 12px; }
  .s5-divider::before, .s5-divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }
  .s5-field { text-align: left; margin-bottom: 14px; }
  .s5-field label { display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 6px; }
  .s5-input {
    width: 100%; padding: 14px 18px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 12px; color: var(--text); font-size: 14px;
    outline: none; transition: border-color 0.2s var(--ease);
  }
  .s5-input:focus { border-color: var(--accent); }
  .s5-submit { width: 100%; margin-top: 8px; justify-content: center; }
  .s5-foot { margin-top: 22px; color: var(--text-dim); font-size: 13px; }
  .s5-foot a { color: var(--accent); text-decoration: none; font-weight: 600; cursor: pointer; }

  /* ============ STAGE 6: Publish ============ */
  .s6-banner {
    background: linear-gradient(135deg, rgba(52,211,153,0.08), rgba(210,255,29,0.06));
    border-bottom: 1px solid rgba(52,211,153,0.2);
    padding: 16px 32px;
    display: flex; align-items: center; justify-content: space-between; gap: 20px;
  }
  .s6-banner-left { display: flex; align-items: center; gap: 12px; color: var(--text); font-size: 14px; }
  .s6-banner-dot { width: 10px; height: 10px; background: var(--success); border-radius: 50%; box-shadow: 0 0 0 4px rgba(52,211,153,0.15); }
  .s6-banner-left strong { color: var(--success); }
  .s6-wrap {
    max-width: 1100px; margin: 0 auto;
    padding: 48px 32px 80px;
    display: grid; grid-template-columns: 1fr 380px;
    gap: 32px; align-items: start;
  }
  .s6-head { grid-column: 1 / -1; margin-bottom: 8px; }
  .s6-head .stage-tag { margin-bottom: 16px; }
  .s6-head h1 { font-size: 40px; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 8px; }
  .s6-head p { color: var(--text-muted); font-size: 15px; }
  .s6-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius-lg); padding: 28px 30px; margin-bottom: 16px;
  }
  .s6-card h3 { font-size: 16px; font-weight: 700; margin-bottom: 14px; }
  .s6-url-row {
    display: flex; align-items: center; gap: 10px;
    background: var(--bg); border: 1px solid var(--border);
    border-radius: 12px; padding: 14px 18px;
  }
  .s6-url { flex: 1; font-family: ui-monospace, Menlo, monospace; font-size: 14px; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .s6-copy-btn { padding: 8px 16px; background: var(--accent); color: var(--bg); border-radius: 100px; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; }
  .s6-copy-btn svg { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
  .s6-embed-code {
    background: var(--bg); border: 1px solid var(--border);
    border-radius: 12px; padding: 16px 18px;
    font-family: ui-monospace, Menlo, monospace;
    font-size: 12px; color: var(--text-muted);
    line-height: 1.6; white-space: pre; overflow-x: auto;
  }
  .s6-embed-foot { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; font-size: 12px; color: var(--text-dim); }
  .s6-quick-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }
  .s6-quick-btn {
    padding: 14px;
    background: var(--bg); border: 1px solid var(--border);
    border-radius: 12px; color: var(--text);
    font-size: 13px; font-weight: 600;
    cursor: pointer; display: flex; align-items: center; gap: 10px;
    transition: all 0.2s var(--ease);
  }
  .s6-quick-btn:hover { border-color: var(--border-2); background: var(--surface-2); }
  .s6-quick-btn svg { width: 16px; height: 16px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; flex-shrink: 0; }
  .s6-side-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius-lg); padding: 24px 26px;
    position: sticky; top: 24px;
  }
  .s6-side-card h3 { font-size: 15px; font-weight: 700; margin-bottom: 4px; }
  .s6-side-card .s6-side-sub { color: var(--text-muted); font-size: 13px; margin-bottom: 20px; }
  .s6-quiz-preview-card {
    background: var(--bg); border: 1px solid var(--border);
    border-radius: 14px; padding: 18px 20px; margin-bottom: 20px;
  }
  .s6-preview-label { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-dim); margin-bottom: 8px; }
  .s6-preview-title { font-size: 15px; font-weight: 700; line-height: 1.3; margin-bottom: 10px; }
  .s6-preview-mini { display: flex; gap: 4px; margin-bottom: 4px; }
  .s6-preview-mini span { height: 6px; background: var(--border); border-radius: 100px; flex: 1; }
  .s6-preview-mini span:first-child { background: var(--accent); flex: 2; }

  @media (max-width: 1000px) {
    .s3-body { grid-template-columns: 1fr; }
    .s2-opts { grid-template-columns: 1fr; }
    .s2-wrap { padding: 20px 24px 60px; }
    .s6-wrap { grid-template-columns: 1fr; }
    .s4-top-center { position: static; transform: none; }
    .s4-frame.desktop { max-width: 100%; }
  }
`;
export default FLOW_CSS;
