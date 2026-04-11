/*!
 * Squarespell Quiz Preview Widget v1.1.0
 * Drop this into any Squarespace Code Block to add a "Paste your URL" input
 * that sends visitors to quiz.squarespell.com/try to preview a quiz
 *
 * Usage: <script src="https://quiz.squarespell.com/embed/quiz-preview-widget.js" async></script>
 */
(function(){
'use strict';
var APP_URL = 'https://quiz.squarespell.com';

function init() {
  // Find the script tag to insert widget after it
  var scripts = document.querySelectorAll('script[src*="quiz-preview-widget"]');
  var currentScript = scripts[scripts.length - 1];
  if (!currentScript) return;

  // Inject styles
  if (!document.getElementById('sqsp-widget-styles')) {
    var style = document.createElement('style');
    style.id = 'sqsp-widget-styles';
    style.textContent = [
      '@import url("https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap");',
      '.sqsp-widget{font-family:"DM Sans",system-ui,-apple-system,sans-serif;max-width:580px;margin:0 auto;text-align:center}',
      '.sqsp-widget *{box-sizing:border-box}',
      '.sqsp-input-wrap{display:flex;gap:8px;margin-bottom:12px}',
      '@media(max-width:600px){.sqsp-input-wrap{flex-direction:column}}',
      '.sqsp-input{flex:1;height:52px;background:#0d1018;border:1.5px solid rgba(255,255,255,0.12);border-radius:12px;padding:0 18px;font-size:16px;color:#f0f2f5;font-family:"DM Sans",system-ui,sans-serif;outline:none;transition:border-color 0.2s}',
      '.sqsp-input:focus{border-color:rgba(210,255,29,0.4)}',
      '.sqsp-input::placeholder{color:rgba(240,242,245,0.3)}',
      '.sqsp-btn{height:52px;padding:0 28px;background:#D2FF1D;color:#07090c;border:none;border-radius:12px;font-size:15px;font-weight:700;font-family:"DM Sans",system-ui,sans-serif;cursor:pointer;white-space:nowrap;transition:transform 0.15s,opacity 0.15s;display:flex;align-items:center;gap:8px}',
      '.sqsp-btn:hover{transform:translateY(-1px);opacity:0.92}',
      '.sqsp-btn:active{transform:translateY(0)}',
      '.sqsp-btn svg{flex-shrink:0}',
      '.sqsp-trust{display:flex;justify-content:center;gap:16px;flex-wrap:wrap}',
      '.sqsp-trust span{display:inline-flex;align-items:center;gap:5px;font-size:13px;color:rgba(240,242,245,0.4)}',
      '.sqsp-trust svg{flex-shrink:0}',
      '.sqsp-err{font-size:13px;color:#f87171;margin-bottom:8px;min-height:20px}',
      '@keyframes sqsp-spin{to{transform:rotate(360deg)}}',
      '.sqsp-spinner{width:18px;height:18px;border:2px solid rgba(7,9,12,0.2);border-top:2px solid #07090c;border-radius:50%;animation:sqsp-spin 0.6s linear infinite}',
    ].join('\n');
    document.head.appendChild(style);
  }

  // Build widget HTML
  var widget = document.createElement('div');
  widget.className = 'sqsp-widget';
  widget.innerHTML = [
    '<div class="sqsp-input-wrap">',
    '  <input class="sqsp-input" type="url" placeholder="Paste your Squarespace URL..." id="sqsp-url-input" />',
    '  <button class="sqsp-btn" id="sqsp-gen-btn">',
    '    <span id="sqsp-btn-text">Generate free preview</span>',
    '    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
    '  </button>',
    '</div>',
    '<p class="sqsp-err" id="sqsp-err"></p>',
    '<div class="sqsp-trust">',
    '  <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>No signup required</span>',
    '  <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Free preview</span>',
    '  <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>30 seconds</span>',
    '</div>',
  ].join('');

  currentScript.parentNode.insertBefore(widget, currentScript.nextSibling);

  // Event handlers
  var input = document.getElementById('sqsp-url-input');
  var btn = document.getElementById('sqsp-gen-btn');
  var btnText = document.getElementById('sqsp-btn-text');
  var err = document.getElementById('sqsp-err');

  function go() {
    var url = (input.value || '').trim();
    err.textContent = '';

    if (!url) {
      err.textContent = 'Please paste your website URL';
      input.focus();
      return;
    }

    // Basic URL validation
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    try { new URL(url); } catch(e) {
      err.textContent = 'Please enter a valid URL';
      return;
    }

    // Show loading state
    btnText.textContent = 'Generating...';
    btn.disabled = true;
    btn.style.opacity = '0.7';

    // Redirect to the try page
    window.location.href = APP_URL + '/try?url=' + encodeURIComponent(url);
  }

  btn.addEventListener('click', go);
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') go();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
})();
