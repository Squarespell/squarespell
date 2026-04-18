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
    --bg: #F7F7F5;
    --bg-2: #F5F5F3;
    --surface: #FFFFFF;
    --surface-2: #F5F5F3;
    --surface-3: #EEEBE6;
    --border: #E4E3E0;
    --border-2: #D9D6D0;
    --border-3: #C9C4BD;
    --text: #1A1A1A;
    --text-muted: #6B6B6B;
    --text-dim: #9A9A9A;
    --accent: #0D7377;
    --accent-dim: rgba(13,115,119,0.12);
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
  .btn-primary { background: var(--accent); color: #FFFFFF; }
  .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 10px 30px rgba(13,115,119,0.25); }
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
    box-shadow: 0 0 0 3px rgba(13,115,119,0.15);
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
  .hook-err.show {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
  }
  .hook-err-retry {
    flex-shrink: 0;
    padding: 8px 16px;
    border-radius: 8px;
    background: rgba(255,107,107,0.12);
    border: 1px solid rgba(255,107,107,0.35);
    color: var(--danger);
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.18s;
  }
  .hook-err-retry:hover {
    background: rgba(255,107,107,0.2);
    border-color: rgba(255,107,107,0.5);
  }
  .hook-hint {
    margin-top: 14px;
    padding: 12px 18px;
    background: rgba(13,115,119,0.05);
    border: 1px solid rgba(13,115,119,0.22);
    border-radius: 12px;
    color: var(--accent);
    font-size: 13px;
    max-width: 640px;
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    animation: hook-hint-in 0.3s ease-out;
  }
  @keyframes hook-hint-in {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .hook-hint-spinner {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid rgba(13,115,119,0.25);
    border-top-color: var(--accent);
    animation: hook-hint-spin 0.8s linear infinite;
    flex-shrink: 0;
  }
  @keyframes hook-hint-spin {
    to { transform: rotate(360deg); }
  }
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

  /* ============ STAGE 2: Goal selection (Option C) ============ */
  .s2-wrap { max-width: 680px; margin: 0 auto; padding: 48px 24px 80px; }

  /* Skeleton loading state */
  .s2-skeleton { display: block; }
  .analysis-status { text-align: center; margin-bottom: 32px; }
  .analysis-spinner { width: 32px; height: 32px; border-radius: 50%; border: 2px solid rgba(13,115,119,0.15); border-top-color: var(--accent); animation: spin 0.8s linear infinite; margin: 0 auto 14px; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .analysis-text { font-size: 14px; color: var(--accent); font-weight: 600; }
  .analysis-detail { font-size: 12px; color: var(--text-muted); margin-top: 4px; }

  .skel-header { margin-bottom: 36px; }
  .skel-badge { width: 180px; height: 28px; border-radius: 100px; background: rgba(0,0,0,0.04); margin-bottom: 20px; }
  .skel-title { height: 38px; width: 85%; border-radius: 8px; background: rgba(0,0,0,0.04); margin-bottom: 12px; }
  .skel-title-2 { height: 38px; width: 60%; border-radius: 8px; background: rgba(0,0,0,0.04); margin-bottom: 16px; }
  .skel-sub { height: 16px; width: 75%; border-radius: 6px; background: rgba(0,0,0,0.03); margin-bottom: 8px; }
  .skel-sub-2 { height: 16px; width: 55%; border-radius: 6px; background: rgba(0,0,0,0.03); }

  .skel-brand { display: flex; align-items: center; gap: 14px; padding: 18px 20px; border-radius: 14px; border: 1px solid var(--border); background: var(--surface); margin-bottom: 36px; }
  .skel-brand-icon { width: 42px; height: 42px; border-radius: 10px; background: rgba(13,115,119,0.15); flex-shrink: 0; }
  .skel-brand-lines { flex: 1; }
  .skel-brand-line1 { height: 10px; width: 80px; border-radius: 4px; background: rgba(0,0,0,0.06); margin-bottom: 8px; }
  .skel-brand-line2 { height: 14px; width: 140px; border-radius: 4px; background: rgba(0,0,0,0.08); }

  .skel-analysis { padding: 28px; border-radius: 16px; border: 1px solid rgba(13,115,119,0.1); background: rgba(13,115,119,0.02); margin-bottom: 36px; }
  .skel-analysis-header { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
  .skel-analysis-icon { width: 20px; height: 20px; border-radius: 6px; background: rgba(13,115,119,0.15); }
  .skel-analysis-title { height: 14px; width: 160px; border-radius: 4px; background: rgba(13,115,119,0.1); }

  .skel-tags { display: flex; flex-wrap: wrap; gap: 10px; }
  .skel-tag { height: 52px; border-radius: 10px; background: rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.06); }
  .skel-tag-1 { width: 140px; }
  .skel-tag-2 { width: 180px; }
  .skel-tag-3 { width: 130px; }
  .skel-tag-4 { width: 150px; }

  .skel-goal-label { height: 14px; width: 200px; border-radius: 4px; background: rgba(0,0,0,0.04); margin-bottom: 12px; }
  .skel-goal-title { height: 18px; width: 280px; border-radius: 4px; background: rgba(0,0,0,0.05); margin-bottom: 20px; }
  .skel-goals { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 32px; }
  .skel-goal { height: 120px; border-radius: 14px; background: rgba(0,0,0,0.025); border: 1px solid rgba(0,0,0,0.06); }
  .skel-btn { height: 54px; border-radius: 12px; background: rgba(0,0,0,0.04); }

  /* Shimmer animation */
  .shimmer { position: relative; overflow: hidden; }
  .shimmer::after {
    content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
    background: linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.03) 50%, transparent 100%);
    animation: shimmer 1.8s ease-in-out infinite;
  }
  @keyframes shimmer { 0% { left: -100%; } 100% { left: 100%; } }

  /* Loaded state */
  .s2-loaded { display: block; animation: fadeUp 0.5s ease; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }

  .step-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(13,115,119,0.08); border: 1px solid rgba(13,115,119,0.2); border-radius: 100px; padding: 6px 16px; font-size: 11px; font-weight: 700; color: var(--accent); letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 20px; }
  .step-title { font-size: clamp(26px, 4vw, 34px); font-weight: 800; letter-spacing: -0.03em; line-height: 1.15; margin-bottom: 12px; }
  .step-title-acc { color: var(--accent); }
  .step-sub { font-size: 15px; color: var(--text-muted); line-height: 1.65; margin-bottom: 36px; }

  /* Brand card */
  .brand-card { display: flex; align-items: center; gap: 14px; background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 16px 20px; margin-bottom: 32px; }
  .brand-icon { width: 42px; height: 42px; border-radius: 10px; background: var(--accent); display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #FFFFFF; font-weight: 800; font-size: 18px; }
  .brand-info { flex: 1; }
  .brand-label { font-size: 10px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.08em; }
  .brand-url { font-size: 15px; font-weight: 600; color: var(--text); }
  .brand-check { display: flex; align-items: center; gap: 5px; font-size: 13px; color: var(--success); font-weight: 600; }
  .brand-check svg { width: 16px; height: 16px; }

  /* AI detected panel */
  .ai-panel { background: rgba(13,115,119,0.03); border: 1px solid rgba(13,115,119,0.12); border-radius: 16px; padding: 24px; margin-bottom: 36px; }
  .ai-header { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
  .ai-header svg { width: 18px; height: 18px; color: var(--accent); }
  .ai-header-text { font-size: 13px; font-weight: 700; color: var(--accent); letter-spacing: 0.02em; }
  .ai-tags { display: flex; flex-wrap: wrap; gap: 10px; }
  .ai-tag { display: flex; align-items: center; gap: 12px; padding: 10px 16px; background: rgba(0,0,0,0.04); border: 1px solid rgba(0,0,0,0.08); border-radius: 10px; transition: border-color 0.15s; }
  .ai-tag:hover { border-color: var(--border-2); }
  .ai-tag-content { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
  .ai-tag-label { font-size: 9px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; }
  .ai-tag-value { font-size: 14px; font-weight: 600; color: var(--text); }
  .ai-tag-edit { font-size: 12px; color: rgba(13,115,119,0.5); cursor: pointer; font-weight: 600; transition: color 0.15s; padding: 6px 10px; margin-left: auto; flex-shrink: 0; background: none; border: 1px solid rgba(13,115,119,0.15); border-radius: 6px; font-family: inherit; line-height: 1; }
  .ai-tag-edit:hover { color: var(--accent); border-color: rgba(13,115,119,0.4); background: rgba(13,115,119,0.05); }
  .ai-tag-input { background: rgba(0,0,0,0.08); border: 1px solid var(--accent); border-radius: 6px; padding: 4px 8px; font-size: 14px; font-weight: 600; color: var(--text); outline: none; width: 100%; font-family: inherit; }
  .ai-tag-input:focus { box-shadow: 0 0 0 2px rgba(13,115,119,0.15); }

  /* Goal section */
  .goal-intro { font-size: 13px; color: var(--accent); font-weight: 600; margin-bottom: 6px; letter-spacing: 0.01em; }
  .goal-question { font-size: 18px; font-weight: 700; margin-bottom: 18px; letter-spacing: -0.01em; }

  .goal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 32px; }
  .goal-card { padding: 22px 20px; background: var(--surface); border: 1.5px solid var(--border); border-radius: 14px; cursor: pointer; transition: all 0.2s; position: relative; }
  .goal-card:hover { border-color: rgba(13,115,119,0.3); background: rgba(13,115,119,0.02); transform: translateY(-2px); }
  .goal-card.selected { border-color: var(--accent); background: rgba(13,115,119,0.05); box-shadow: 0 0 24px rgba(13,115,119,0.08); }
  .goal-card.selected .goal-check { opacity: 1; }
  .goal-check { position: absolute; top: 12px; right: 12px; width: 22px; height: 22px; border-radius: 6px; background: var(--accent); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; color: #FFFFFF; }
  .goal-check svg { width: 12px; height: 12px; }
  .goal-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 14px; }
  .goal-icon svg { width: 22px; height: 22px; }
  .goal-icon-capture-leads { background: rgba(96,165,250,0.12); color: #60a5fa; }
  .goal-icon-recommend-service { background: rgba(168,85,247,0.12); color: #a855f7; }
  .goal-icon-score-segment { background: rgba(251,146,60,0.12); color: #fb923c; }
  .goal-icon-grow-email { background: rgba(74,222,128,0.12); color: #4ade80; }
  .goal-title { font-size: 15px; font-weight: 700; margin-bottom: 6px; color: var(--text); }
  .goal-card.selected .goal-title { color: var(--accent); }
  .goal-desc { font-size: 12.5px; color: var(--text-muted); line-height: 1.55; }

  /* Generate button */
  .btn-gen { width: 100%; padding: 16px 24px; border-radius: 12px; border: none; font-size: 16px; font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
  .btn-gen.ready { background: var(--accent); color: #FFFFFF; }
  .btn-gen.ready:hover { background: #0a5a5e; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(13,115,119,0.2); }
  .btn-gen.disabled { background: rgba(0,0,0,0.06); color: rgba(0,0,0,0.25); cursor: default; }
  .btn-gen svg { width: 18px; height: 18px; }

  .btn-hint { text-align: center; margin-top: 12px; font-size: 12px; color: var(--text-muted); }

  /* Quiz generation loading skeleton */
  .gen-loading { text-align: center; padding: 40px 0 20px; animation: fadeUp 0.4s ease; }
  .gen-loading-spinner { width: 40px; height: 40px; border: 3px solid rgba(13,115,119,0.15); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 20px; }
  .gen-loading-title { font-size: 18px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
  .gen-loading-sub { font-size: 13px; color: var(--text-muted); margin-bottom: 28px; }
  .gen-skeleton-cards { display: flex; flex-direction: column; gap: 12px; }
  .gen-skel-card { background: rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.06); border-radius: 12px; padding: 20px 24px; display: flex; flex-direction: column; gap: 10px; }
  .gen-skel-line { height: 14px; border-radius: 7px; background: linear-gradient(90deg, rgba(0,0,0,0.04) 25%, rgba(0,0,0,0.08) 50%, rgba(0,0,0,0.04) 75%); background-size: 200% 100%; animation: shimmer 1.5s ease-in-out infinite; }
  .gen-skel-line.w45 { width: 45%; }
  .gen-skel-line.w50 { width: 50%; }
  .gen-skel-line.w60 { width: 60%; }
  .gen-skel-line.w70 { width: 70%; }
  .gen-skel-line.w75 { width: 75%; }
  .gen-skel-line.w80 { width: 80%; }

  .s2-analyze-err {
    margin: 14px 0 24px;
    padding: 14px 16px;
    background: rgba(255, 107, 107, 0.08);
    border: 1px solid rgba(255, 107, 107, 0.35);
    border-radius: 12px;
    color: #ff9a9a;
    font-size: 14px;
    display: flex; align-items: center; justify-content: space-between; gap: 14px;
  }
  .s2-analyze-err .hook-err-retry {
    background: rgba(255, 107, 107, 0.18);
    border: 1px solid rgba(255, 107, 107, 0.5);
    color: #ffd4d4;
    padding: 8px 14px;
    border-radius: 8px;
    font-size: 13px; font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .s2-analyze-err .hook-err-retry:hover {
    background: rgba(255, 107, 107, 0.28);
  }

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
  .s3-body { display: grid; grid-template-columns: 1fr 340px; height: calc(100vh - 90px); overflow: hidden; }
  .s3-main { overflow-y: auto; overflow-x: hidden; height: 100%; width: 100%; }
  .s3-main-inner { padding: 32px 40px 80px; max-width: 880px; width: 100%; margin: 0 auto; }
  .s3-main-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; }
  .s3-main-head h2 { font-size: 20px; font-weight: 700; letter-spacing: -0.01em; }
  .s3-count {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 13px; color: var(--text-muted);
    padding: 4px 12px; background: var(--surface);
    border: 1px solid var(--border); border-radius: 20px;
  }
  .s3-count span { color: var(--accent); font-weight: 700; }
  /* Question card list with flow connectors */
  #qc-list { position: relative; }
  .qc-wrapper { position: relative; }
  .qc-wrapper:not(:last-child)::after {
    content: ''; position: absolute; left: 37px; bottom: -12px;
    width: 2px; height: 12px; background: var(--border-2);
  }
  .qc-wrapper:not(:last-child)::before {
    content: ''; position: absolute; left: 33px; bottom: -16px;
    width: 10px; height: 10px; border-radius: 50%;
    border: 2px solid var(--border-2); background: var(--bg);
    z-index: 1;
  }
  .qc {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); margin-bottom: 24px;
    transition: all 0.25s var(--ease); overflow: hidden;
    border-left: 3px solid var(--border);
    animation: qcEnter 0.4s ease both;
  }
  .qc:hover { border-color: var(--border-2); border-left-color: rgba(13,115,119,0.3); transform: translateY(-1px); box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
  .qc.selected { border-color: var(--accent); border-left-color: var(--accent); box-shadow: 0 0 0 3px rgba(13,115,119,0.08), 0 8px 32px rgba(0,0,0,0.2); }
  @keyframes qcEnter {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .qc-wrapper:nth-child(1) .qc { animation-delay: 0.05s; }
  .qc-wrapper:nth-child(2) .qc { animation-delay: 0.1s; }
  .qc-wrapper:nth-child(3) .qc { animation-delay: 0.15s; }
  .qc-wrapper:nth-child(4) .qc { animation-delay: 0.2s; }
  .qc-wrapper:nth-child(5) .qc { animation-delay: 0.25s; }
  .qc-wrapper:nth-child(6) .qc { animation-delay: 0.3s; }
  .qc-wrapper:nth-child(7) .qc { animation-delay: 0.35s; }
  .qc-wrapper:nth-child(8) .qc { animation-delay: 0.4s; }
  .qc-wrapper:nth-child(9) .qc { animation-delay: 0.45s; }
  .qc-wrapper:nth-child(10) .qc { animation-delay: 0.5s; }
  .qc-head { display: flex; align-items: flex-start; gap: 16px; padding: 20px 22px; cursor: pointer; }
  .qc-num {
    width: 32px; height: 32px;
    background: var(--bg); border: 1.5px solid var(--border-2);
    color: var(--text-muted); border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 12px; flex-shrink: 0;
    letter-spacing: -0.01em;
  }
  .qc.selected .qc-num { background: var(--accent); border-color: var(--accent); color: #FFFFFF; }
  .qc-type-badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 2px 8px; border-radius: 6px;
    background: rgba(0,0,0,0.04); border: 1px solid rgba(0,0,0,0.08);
    font-size: 10px; font-weight: 600; color: var(--text-dim);
    text-transform: uppercase; letter-spacing: 0.04em;
  }
  .qc-type-badge svg { width: 10px; height: 10px; }
  .qc-head-main { flex: 1; min-width: 0; }
  .qc-q { font-size: 15px; font-weight: 600; color: var(--text); line-height: 1.4; margin-bottom: 6px; }
  .qc-meta { font-size: 12px; color: var(--text-dim); display: flex; align-items: center; gap: 8px; }
  .qc-drag { color: var(--text-dim); display: flex; align-items: center; padding: 4px; cursor: grab; opacity: 0; transition: opacity 0.15s; }
  .qc:hover .qc-drag { opacity: 1; }
  .qc-drag svg { width: 16px; height: 16px; stroke: currentColor; fill: none; stroke-width: 2; }
  .qc-body { padding: 0 22px 18px 70px; }
  .qc.selected .qc-body { animation: fadeUp 0.25s ease; }
  .qc-opt-row {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 14px;
    background: var(--bg); border: 1px solid var(--border);
    border-radius: 10px; font-size: 13px; margin-bottom: 8px;
    transition: all 0.15s var(--ease);
  }
  .qc-opt-row:hover { border-color: var(--border-2); background: rgba(0,0,0,0.02); }
  .qc-opt-letter {
    width: 24px; height: 24px; border-radius: 7px;
    background: var(--surface-2); border: 1px solid var(--border);
    color: var(--text-muted); font-weight: 700; font-size: 11px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .qc-opt-text { flex: 1; color: var(--text); }
  .qc-opt-score {
    padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 700;
    background: rgba(13,115,119,0.08); color: rgba(13,115,119,0.6);
    border: 1px solid rgba(13,115,119,0.12); white-space: nowrap;
    letter-spacing: 0.02em;
  }
  .qc-opt-score.high { background: rgba(13,115,119,0.15); color: var(--accent); border-color: rgba(13,115,119,0.25); }
  .qc-opt-score.zero { background: rgba(0,0,0,0.03); color: var(--text-dim); border-color: rgba(0,0,0,0.06); }
  .qc-q-edit {
    width: 100%; background: rgba(0,0,0,0.04); border: 1px solid var(--accent);
    border-radius: 8px; padding: 8px 12px; font-size: 15px; font-weight: 600;
    color: var(--text); outline: none; resize: none; line-height: 1.4;
    font-family: inherit;
  }
  .qc-q-edit:focus { box-shadow: 0 0 0 2px rgba(13,115,119,0.1); }
  .qc-opt-edit {
    flex: 1; background: rgba(0,0,0,0.04); border: 1px solid var(--border-2);
    border-radius: 7px; padding: 6px 10px; font-size: 13px; color: var(--text);
    outline: none; font-family: inherit;
  }
  .qc-opt-edit:focus { border-color: var(--accent); }
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
    padding: 24px 20px 60px;
    height: 100%; overflow-y: auto; overflow-x: hidden;
    min-width: 0;
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
  .answer-block { margin-bottom: 12px; }
  .answer-row { display: flex; align-items: center; gap: 6px; }
  .answer-branch-row {
    margin-left: 32px; margin-top: 4px;
  }
  .answer-branch-select {
    width: 100%; padding: 5px 8px; font-size: 11px; border-radius: 6px;
    border: 1px solid var(--border); background: var(--surface);
    color: var(--text-muted); outline: none; cursor: pointer;
  }
  .answer-branch-select:focus { border-color: var(--accent); color: var(--text); }
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
  .empty-panel p { font-size: 13px; line-height: 1.55; }
  .empty-panel kbd {
    display: inline-block; padding: 1px 6px; margin: 0 1px;
    background: var(--surface); border: 1px solid var(--border); border-bottom-width: 2px;
    border-radius: 5px; font-family: inherit; font-size: 11px; color: var(--text-muted);
  }

  /* ============ STAGE 3 EDITOR ENHANCEMENTS (reorder, duplicate, toast, shortcuts) ============ */
  .s3-title-button {
    display: inline-flex; align-items: center; gap: 8px;
    background: transparent; border: 0; padding: 0;
    font-size: 16px; font-weight: 700; color: var(--text);
    letter-spacing: -0.01em; cursor: text;
    max-width: 360px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    transition: color 0.15s var(--ease);
  }
  .s3-title-button:hover { color: var(--accent); }
  .s3-title-button:hover .s3-title-edit { opacity: 1; }
  .s3-title-edit {
    display: inline-flex; opacity: 0.45; color: var(--text-dim);
    transition: opacity 0.15s var(--ease);
  }
  .s3-title-input {
    background: var(--surface); border: 1px solid var(--accent); color: var(--text);
    padding: 6px 12px; border-radius: 8px; font-size: 15px; font-weight: 700;
    letter-spacing: -0.01em; outline: none; min-width: 260px; max-width: 420px;
    font-family: inherit;
  }
  .s3-saved {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 12px; color: var(--text-dim);
    transition: color 0.2s var(--ease);
  }
  .s3-saved[data-status="saving"] { color: var(--accent); }
  .s3-saved[data-status="saved"] { color: var(--success); }
  .s3-saved svg { stroke-width: 2.5; }
  .s3-save-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--accent); display: inline-block;
    animation: savedot 1s ease-in-out infinite;
  }
  @keyframes savedot {
    0%, 100% { opacity: 0.35; transform: scale(0.85); }
    50% { opacity: 1; transform: scale(1); }
  }
  .s3-shortcut-hint {
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    padding: 10px 14px; margin-bottom: 14px;
    background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
    font-size: 12px; color: var(--text-dim);
  }
  .s3-shortcut-hint kbd {
    display: inline-block; padding: 2px 7px;
    background: var(--bg); border: 1px solid var(--border-2); border-bottom-width: 2px;
    border-radius: 5px; font-family: inherit; font-size: 11px; color: var(--text-muted);
    font-weight: 600;
  }
  .s3-shortcut-hint .dot-sep { color: var(--border-2); }
  .qc-actions {
    display: flex; align-items: center; gap: 4px;
    opacity: 0; transition: opacity 0.15s var(--ease);
  }
  .qc:hover .qc-actions, .qc.selected .qc-actions { opacity: 1; }
  .qc-action-btn {
    width: 28px; height: 28px; border-radius: 7px;
    background: var(--surface-2); border: 1px solid var(--border);
    color: var(--text-muted);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; flex-shrink: 0;
    transition: all 0.15s var(--ease);
  }
  .qc-action-btn:hover:not(:disabled) {
    background: var(--surface-3); border-color: var(--border-2); color: var(--text);
  }
  .qc-action-btn:disabled { opacity: 0.3; cursor: not-allowed; }
  .qc-action-btn.qc-action-danger:hover:not(:disabled) {
    color: var(--danger); border-color: rgba(255,107,107,0.35); background: rgba(255,107,107,0.06);
  }
  .qc-action-btn svg { width: 13px; height: 13px; stroke: currentColor; fill: none; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
  .answer-row { align-items: center; }
  .answer-reorder {
    display: flex; flex-direction: column; gap: 2px; flex-shrink: 0;
  }
  .answer-reorder-btn {
    width: 22px; height: 15px; border-radius: 4px;
    background: var(--surface); border: 1px solid var(--border);
    color: var(--text-dim);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; padding: 0;
  }
  .answer-reorder-btn:hover:not(:disabled) { color: var(--text); border-color: var(--border-2); }
  .answer-reorder-btn:disabled { opacity: 0.25; cursor: not-allowed; }
  .answer-reorder-btn svg { width: 11px; height: 11px; stroke: currentColor; fill: none; stroke-width: 2.5; }
  .answer-del:disabled { opacity: 0.35; cursor: not-allowed; }
  .add-answer-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .s3-side-actions { display: flex; flex-direction: column; gap: 10px; }
  .side-btn {
    width: 100%; background: var(--surface);
    border: 1px solid var(--border); color: var(--text-muted);
    padding: 11px; border-radius: 10px;
    font-size: 13px; font-weight: 600;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    cursor: pointer; transition: all 0.15s var(--ease);
  }
  .side-btn:hover { color: var(--text); border-color: var(--border-2); background: var(--surface-2); }
  .side-btn svg { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; }
  .danger-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .editor-toast {
    position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
    display: inline-flex; align-items: center; gap: 8px;
    padding: 11px 18px;
    background: var(--surface); border: 1px solid var(--accent);
    box-shadow: 0 20px 40px rgba(0,0,0,0.4), 0 0 0 3px rgba(13,115,119,0.08);
    border-radius: 100px; color: var(--text); font-size: 13px; font-weight: 600;
    z-index: 80;
    animation: toastin 0.22s var(--ease);
  }
  .editor-toast svg { color: var(--accent); }
  @keyframes toastin {
    from { opacity: 0; transform: translateX(-50%) translateY(10px); }
    to { opacity: 1; transform: translateX(-50%) translateY(0); }
  }

  /* Brand colors mini-preview */
  .brand-preview { border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
  .brand-preview-bar { padding: 8px 12px; font-size: 11px; font-weight: 700; }
  .brand-preview-text { opacity: 0.9; }
  .brand-preview-body { padding: 14px; }
  .brand-preview-q { font-size: 12px; font-weight: 600; margin-bottom: 8px; }
  .brand-preview-opt { font-size: 10px; padding: 6px 10px; border: 1px solid; border-radius: 6px; margin-bottom: 5px; opacity: 0.7; }
  .brand-preview-btn { font-size: 10px; font-weight: 700; padding: 6px 16px; border-radius: 6px; text-align: center; margin-top: 8px; }

  /* Integration hint */
  .integration-hint {
    display: flex; align-items: flex-start; gap: 12px;
    padding: 14px 16px; background: rgba(0,0,0,0.02);
    border: 1px solid var(--border); border-radius: 10px;
  }
  .integration-hint svg { color: var(--text-dim); flex-shrink: 0; margin-top: 2px; }
  .integration-hint-body { flex: 1; }
  .integration-hint-title { font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 3px; }
  .integration-hint-desc { font-size: 11px; color: var(--text-dim); line-height: 1.45; }
  .integration-badge {
    padding: 2px 8px; border-radius: 20px; font-size: 9px; font-weight: 700;
    background: rgba(168,85,247,0.1); color: #a855f7; border: 1px solid rgba(168,85,247,0.2);
    text-transform: uppercase; letter-spacing: 0.06em; flex-shrink: 0; margin-top: 2px;
  }

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
  .s4-top-right { display: flex; align-items: center; gap: 14px; }

  /* Premium segmented device switch with lit active state + subtle inset */
  .s4-device-switch {
    display: inline-flex;
    background: linear-gradient(180deg, rgba(0,0,0,0.02), rgba(0,0,0,0.08));
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 5px;
    gap: 2px;
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.04),
      inset 0 0 0 1px rgba(0,0,0,0.15),
      0 1px 2px rgba(0,0,0,0.1);
  }
  .s4-device-btn {
    position: relative;
    width: 42px; height: 34px; border-radius: 10px;
    color: var(--text-muted); display: flex;
    align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.22s var(--ease);
    background: transparent; border: 0;
  }
  .s4-device-btn:hover { color: var(--text); background: rgba(0,0,0,0.04); }
  .s4-device-btn.active {
    background: linear-gradient(180deg, #1da7a7, var(--accent) 70%);
    color: #FFFFFF;
    box-shadow:
      0 0 0 1px rgba(13,115,119,0.4),
      0 6px 14px -4px rgba(13,115,119,0.15),
      inset 0 1px 0 rgba(255,255,255,0.25);
  }
  .s4-device-btn svg { width: 18px; height: 18px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; position: relative; z-index: 1; }

  .s4-publish { padding: 10px 20px; }
  .s4-exit { padding: 10px 16px; }

  .s4-canvas {
    display: flex; justify-content: center;
    padding: 48px 28px 100px;
    min-height: calc(100vh - 90px);
    background:
      radial-gradient(ellipse at 50% -10%, rgba(13,115,119,0.07), transparent 55%),
      radial-gradient(ellipse at 50% 110%, rgba(13,115,119,0.025), transparent 50%),
      var(--bg);
  }

  /* Premium device frame: tiered bezels, inner rings, and a soft ground shadow.
     Uses two nested radii so the OS chrome sits inside a visible bezel. */
  .s4-frame {
    position: relative;
    background:
      linear-gradient(180deg, #F5F5F3 0%, #EEEBE6 100%);
    border: 1px solid rgba(0,0,0,0.08);
    border-radius: 24px;
    padding: 10px;
    overflow: visible;
    transition: max-width 0.45s var(--ease), padding 0.35s var(--ease), border-radius 0.35s var(--ease);
    width: 100%;
    box-shadow:
      /* outer shadow */
      0 50px 120px -20px rgba(0,0,0,0.08),
      0 20px 40px -10px rgba(0,0,0,0.06),
      /* inner highlight */
      inset 0 1px 0 rgba(255,255,255,0.6),
      inset 0 -1px 0 rgba(0,0,0,0.1);
  }
  .s4-frame::before {
    /* soft reflected "screen glow" under the frame */
    content: '';
    position: absolute;
    left: 8%; right: 8%; bottom: -28px; height: 30px;
    background: radial-gradient(ellipse at center, rgba(13,115,119,0.08), transparent 70%);
    filter: blur(14px);
    pointer-events: none;
    opacity: 0.7;
  }
  .s4-frame-inner {
    position: relative;
    border-radius: 14px;
    overflow: hidden;
    box-shadow:
      inset 0 0 0 1px rgba(255,255,255,0.6),
      inset 0 0 0 2px rgba(0,0,0,0.1);
    background: var(--bg-2);
  }
  .s4-frame.desktop { max-width: 1180px; }
  .s4-frame.tablet  {
    max-width: 820px;
    padding: 14px;
    border-radius: 30px;
  }
  .s4-frame.tablet .s4-frame-inner { border-radius: 18px; }
  .s4-frame.mobile  {
    max-width: 390px;
    padding: 10px 8px;
    border-radius: 44px;
  }
  .s4-frame.mobile .s4-frame-inner { border-radius: 34px; }
  .s4-frame.mobile::after {
    /* Faux home indicator bar, iOS-style */
    content: '';
    position: absolute;
    left: 50%; transform: translateX(-50%);
    bottom: 6px;
    width: 120px; height: 4px;
    border-radius: 3px;
    background: rgba(255,255,255,0.35);
    pointer-events: none;
  }

  .s4-chrome {
    display: flex; align-items: center; gap: 14px;
    padding: 13px 18px;
    background: linear-gradient(180deg, #F7F7F5 0%, #EEEBE6 100%);
    border-bottom: 1px solid rgba(0,0,0,0.08);
    box-shadow: inset 0 -1px 0 rgba(0,0,0,0.03);
  }
  .s4-dots { display: flex; gap: 8px; }
  .s4-dots span {
    width: 12px; height: 12px; border-radius: 50%;
    background: var(--border-2);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.45),
      inset 0 -1px 0 rgba(0,0,0,0.12),
      0 0 0 0.5px rgba(0,0,0,0.08);
  }
  .s4-dots span:nth-child(1) { background: radial-gradient(circle at 35% 30%, #ff8278, #ff5f57); }
  .s4-dots span:nth-child(2) { background: radial-gradient(circle at 35% 30%, #ffd04d, #febc2e); }
  .s4-dots span:nth-child(3) { background: radial-gradient(circle at 35% 30%, #5ddb6e, #28c840); }
  .s4-addr {
    flex: 1; display: flex; align-items: center; gap: 8px;
    background: #ffffff;
    border: 1px solid rgba(0,0,0,0.08);
    border-radius: 100px; padding: 7px 16px;
    font-family: ui-monospace, 'SF Mono', Menlo, monospace;
    font-size: 12px; color: #666;
    overflow: hidden;
    box-shadow: inset 0 1px 2px rgba(0,0,0,0.04);
    max-width: 460px;
    margin: 0 auto;
  }
  .s4-addr svg { width: 12px; height: 12px; stroke: #3aa564; fill: none; stroke-width: 2.2; flex-shrink: 0; }
  .s4-addr-host { color: #222; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
  .s4-chrome-right {
    display: flex; gap: 4px;
    color: #888;
  }
  .s4-chrome-right span {
    width: 4px; height: 4px; background: currentColor; border-radius: 50%;
  }

  /* --- Inside the frame: visitor's site header + the scraped brand background color. --- */
  .s4-site {
    background: var(--site-bg, #ffffff);
    color: var(--site-text, #1a1a1a);
    font-family: var(--site-body-font, 'Inter', sans-serif);
    min-height: 620px;
    position: relative;
    overflow: hidden;
  }
  .s4-site-nav {
    position: relative; z-index: 2;
    display: flex; align-items: center; justify-content: space-between;
    padding: 22px 40px;
    border-bottom: 1px solid var(--site-border, rgba(0,0,0,0.06));
    gap: 16px;
    overflow: hidden;
  }
  .s4-site-logo {
    display: flex; align-items: center; gap: 10px;
    font-family: var(--site-heading-font, 'Playfair Display', serif);
    font-weight: 700;
    font-size: 20px;
    letter-spacing: -0.01em;
    color: var(--site-text, #1a1a1a);
    flex-shrink: 0;
    white-space: nowrap;
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
    display: flex; gap: 24px;
    font-size: 13px;
    color: var(--site-text, #1a1a1a);
    opacity: 0.75;
    white-space: nowrap;
    overflow: hidden;
  }
  .s4-site-links span {
    flex-shrink: 0;
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .s4-frame.mobile .s4-site-links { display: none; }
  .s4-frame.mobile .s4-site-nav { padding: 18px 22px; }
  .s4-frame.tablet .s4-site-links { gap: 16px; font-size: 12px; }
  .s4-frame.tablet .s4-site-links span { max-width: 110px; }
  .s4-frame.tablet .s4-site-nav { padding: 18px 24px; }

  .s4-site-body {
    position: relative; z-index: 2;
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
    color: var(--site-heading, var(--site-text, #0a0a0a));
    margin-bottom: 14px;
  }
  .s4-frame.mobile .s4-site-title { font-size: 26px; }
  .s4-site-sub {
    font-size: 15px;
    line-height: 1.5;
    color: var(--site-text, #1a1a1a);
    opacity: 0.8;
    margin-bottom: 32px;
  }

  /* --- The quiz inside the visitor's site (brand-styled) --- */
  .s4-quiz {
    background: var(--site-card-bg, var(--site-surface, #ffffff));
    border: 1px solid var(--site-card-border, var(--site-border, rgba(0,0,0,0.08)));
    border-radius: var(--site-radius, 16px);
    padding: 32px 34px;
    box-shadow: var(--site-card-shadow, 0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04));
  }
  .s4-frame.mobile .s4-quiz { padding: 24px 22px; }

  .s4-quiz-prog {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 10px;
    font-size: 12px;
    color: var(--site-muted, rgba(0,0,0,0.56));
    font-family: 'Inter', 'DM Sans', sans-serif;
  }
  .s4-quiz-bar {
    height: 4px;
    background: var(--site-option-border, rgba(0,0,0,0.08));
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
    color: var(--site-card-heading, var(--site-text, #0a0a0a));
    margin-bottom: 24px;
  }
  .s4-frame.mobile .s4-quiz-q { font-size: 22px; }
  .s4-quiz-opts { display: flex; flex-direction: column; gap: 10px; }
  .s4-quiz-opt {
    display: flex; align-items: center; gap: 14px;
    padding: 16px 20px;
    background: var(--site-option-bg, var(--site-card-bg, #fafafa));
    border: 1.5px solid var(--site-option-border, var(--site-card-border, rgba(0,0,0,0.08)));
    border-radius: calc(var(--site-radius, 16px) - 4px);
    color: var(--site-card-text, var(--site-text, #1a1a1a));
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
    background: var(--site-option-bg, rgba(0,0,0,0.04));
    border: 1px solid var(--site-option-border, rgba(0,0,0,0.08));
    color: var(--site-card-text, var(--site-text, #1a1a1a));
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
    color: var(--site-btn-text, #ffffff);
  }
  .s4-quiz-back {
    margin-top: 22px;
    font-size: 13px;
    color: var(--site-muted, rgba(0,0,0,0.56));
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
    color: var(--site-card-heading, var(--site-text, #0a0a0a));
    margin-bottom: 14px;
  }
  .s4-frame.mobile .s4-quiz-result-title { font-size: 26px; }
  .s4-quiz-result-desc {
    font-size: 15px;
    color: var(--site-muted, rgba(0,0,0,0.56));
    line-height: 1.5;
    margin-bottom: 24px;
    font-family: var(--site-body-font, 'Inter', sans-serif);
  }
  .s4-quiz-result-cta {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 16px 32px;
    background: var(--site-primary, #111);
    color: var(--site-btn-text, #fff);
    border-radius: 100px;
    font-weight: 600; font-size: 15px;
    cursor: pointer;
    transition: all 0.2s var(--ease);
    font-family: var(--site-body-font, 'Inter', sans-serif);
    text-decoration: none;
    border: none;
    box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  }
  .s4-quiz-result-cta:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(0,0,0,0.2); }
  .s4-quiz-result-share {
    display: flex; align-items: center; gap: 8px;
    margin-top: 20px; justify-content: center;
  }
  .s4-share-label {
    font-size: 12px; color: var(--site-muted, rgba(0,0,0,0.56));
    font-family: var(--site-body-font, 'Inter', sans-serif);
  }
  .s4-share-btn {
    width: 32px; height: 32px; border-radius: 50%;
    background: var(--site-option-bg, rgba(0,0,0,0.04));
    border: 1px solid var(--site-option-border, rgba(0,0,0,0.08));
    color: var(--site-muted, rgba(0,0,0,0.56));
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.2s;
  }
  .s4-share-btn:hover { color: var(--site-card-text, var(--site-text, #1a1a1a)); transform: translateY(-1px); }
  .s4-quiz-result-restart {
    margin-top: 16px;
    display: inline-block;
    font-size: 13px;
    color: var(--site-muted, rgba(0,0,0,0.56));
    cursor: pointer;
    font-family: var(--site-body-font, 'Inter', sans-serif);
  }

  /* ---- Lead capture gate ---- */
  .s4-lead-gate {
    text-align: center;
    padding: 32px 24px;
    animation: qcEnter 0.4s ease both;
  }
  .s4-lead-gate-icon {
    margin: 0 auto 16px;
    width: 64px; height: 64px;
    border-radius: 50%;
    background: var(--site-primary-dim, rgba(0,0,0,0.06));
    display: flex; align-items: center; justify-content: center;
    color: var(--site-primary, #111);
  }
  .s4-lead-gate-title {
    font-size: 20px; font-weight: 700;
    color: var(--site-card-heading, var(--site-text, #0a0a0a));
    font-family: var(--site-body-font, 'Inter', sans-serif);
    margin-bottom: 8px;
  }
  .s4-lead-gate-sub {
    font-size: 14px; color: var(--site-muted, rgba(0,0,0,0.56));
    font-family: var(--site-body-font, 'Inter', sans-serif);
    margin-bottom: 24px; line-height: 1.5;
  }
  .s4-lead-gate-input {
    display: block; width: 100%; max-width: 320px; margin: 0 auto 14px;
    padding: 14px 20px; border-radius: 100px;
    border: 2px solid var(--site-option-border, var(--site-card-border, rgba(0,0,0,0.12)));
    background: var(--site-option-bg, var(--site-card-bg, #fff));
    color: var(--site-card-text, var(--site-text, #1a1a1a));
    font-size: 15px; font-family: var(--site-body-font, 'Inter', sans-serif);
    outline: none; transition: border-color 0.2s;
    text-align: center;
  }
  .s4-lead-gate-input:focus {
    border-color: var(--site-primary, #111);
  }
  .s4-lead-gate-btn {
    display: block; width: 100%; max-width: 320px; margin: 0 auto 12px;
    padding: 15px 24px; border-radius: 100px; border: none;
    background: var(--site-primary, #111);
    color: var(--site-btn-text, #fff);
    font-size: 15px; font-weight: 600; cursor: pointer;
    font-family: var(--site-body-font, 'Inter', sans-serif);
    transition: all 0.2s;
    box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  }
  .s4-lead-gate-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.18); }
  .s4-lead-gate-btn:disabled { opacity: 0.35; cursor: default; box-shadow: none; }
  .s4-lead-gate-skip {
    font-size: 13px; color: var(--site-muted, rgba(0,0,0,0.56));
    cursor: pointer; margin-top: 4px;
    font-family: var(--site-body-font, 'Inter', sans-serif);
    opacity: 0.8;
  }
  .s4-lead-gate-skip:hover { opacity: 1; }
  .s4-lead-gate-privacy {
    font-size: 11px; color: var(--site-muted, rgba(0,0,0,0.56));
    margin-top: 16px;
    font-family: var(--site-body-font, 'Inter', sans-serif);
    opacity: 0.7;
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
    background: linear-gradient(135deg, rgba(52,211,153,0.08), rgba(13,115,119,0.06));
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
  .s6-copy-btn { padding: 8px 16px; background: var(--accent); color: #FFFFFF; border-radius: 100px; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; }
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
    .s2-wrap { padding: 20px 24px 60px; }
    .goal-grid { grid-template-columns: 1fr; }
    .ai-tags { flex-direction: column; }
    .ai-tag { width: 100%; }
    .s6-wrap { grid-template-columns: 1fr; }
    .s4-top-center { position: static; transform: none; }
    .s4-frame.desktop { max-width: 100%; }
  }
`;
export default FLOW_CSS;
