/*!
 * Squarespell Hook Widget v1.2.0
 *
 * This is the compact "URL + Generate" input from prototype-v4 Stage 1,
 * packaged as a drop-in script tag that can be embedded anywhere
 * (squarespell.com landing page, marketing site, etc.):
 *
 *   <script src="https://app.squarespell.com/embed/squarespell-hook.js" async></script>
 *
 * The widget renders inline where the script tag is placed, takes a URL,
 * and redirects the visitor to
 * https://app.squarespell.com/tools/quiz-funnel/build?url=... where the
 * full Stage 1 -> 6 funnel takes over.
 *
 * Styling matches prototype-v4 tokens exactly — dark base, #D2FF1D accent,
 * DM Sans, 100px pill radius on the primary button. Self-contained; no
 * external dependencies.
 */
(function () {
  'use strict';

  var APP_URL = 'https://app.squarespell.com';
  var BUILDER_PATH = '/tools/quiz-funnel/build';
  var WIDGET_ID = 'squarespell-hook-widget';

  // Find the script tag that loaded this file.
  var scripts = document.getElementsByTagName('script');
  var currentScript = document.currentScript || scripts[scripts.length - 1];
  if (!currentScript) return;

  // Prevent double-injection.
  if (document.getElementById(WIDGET_ID)) return;

  function injectStyles() {
    if (document.getElementById('squarespell-hook-styles')) return;
    var css = '' +
      '@import url(\'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap\');' +
      '#' + WIDGET_ID + '{' +
        'font-family:"DM Sans",system-ui,sans-serif;' +
        'max-width:520px;' +
        'width:100%;' +
        'margin:0 auto;' +
        'display:flex;' +
        'flex-direction:column;' +
        'gap:12px;' +
        'color:#fff;' +
      '}' +
      '#' + WIDGET_ID + ' .sq-hook-label{' +
        'display:inline-flex;' +
        'align-items:center;' +
        'gap:8px;' +
        'font-size:11px;' +
        'font-weight:600;' +
        'letter-spacing:0.12em;' +
        'text-transform:uppercase;' +
        'color:#8891a3;' +
        'justify-content:center;' +
      '}' +
      '#' + WIDGET_ID + ' .sq-hook-dot{' +
        'width:6px;' +
        'height:6px;' +
        'border-radius:50%;' +
        'background:#D2FF1D;' +
        'box-shadow:0 0 0 4px rgba(210,255,29,0.15);' +
      '}' +
      '#' + WIDGET_ID + ' form{' +
        'display:flex;' +
        'align-items:center;' +
        'gap:8px;' +
        'background:#11161f;' +
        'border:1px solid #1f2530;' +
        'border-radius:100px;' +
        'padding:6px 6px 6px 18px;' +
        'transition:border-color 0.2s cubic-bezier(0.16,1,0.3,1);' +
      '}' +
      '#' + WIDGET_ID + ' form:focus-within{' +
        'border-color:rgba(210,255,29,0.35);' +
      '}' +
      '#' + WIDGET_ID + ' .sq-hook-prefix{' +
        'color:#5b6273;' +
        'font-size:14px;' +
        'font-weight:500;' +
      '}' +
      '#' + WIDGET_ID + ' input{' +
        'flex:1;' +
        'background:transparent;' +
        'border:0;' +
        'outline:0;' +
        'font-family:"DM Sans",system-ui,sans-serif;' +
        'font-size:14px;' +
        'font-weight:500;' +
        'color:#ffffff;' +
        'padding:10px 4px;' +
        'min-width:0;' +
      '}' +
      '#' + WIDGET_ID + ' input::placeholder{color:#5b6273;}' +
      '#' + WIDGET_ID + ' button{' +
        'background:#D2FF1D;' +
        'color:#07090c;' +
        'border:0;' +
        'border-radius:100px;' +
        'padding:12px 22px;' +
        'font-family:"DM Sans",system-ui,sans-serif;' +
        'font-size:13px;' +
        'font-weight:700;' +
        'letter-spacing:-0.01em;' +
        'cursor:pointer;' +
        'transition:transform 0.2s cubic-bezier(0.16,1,0.3,1);' +
      '}' +
      '#' + WIDGET_ID + ' button:hover{transform:translateY(-1px);}' +
      '#' + WIDGET_ID + ' button:disabled{opacity:0.5;cursor:not-allowed;transform:none;}' +
      '#' + WIDGET_ID + ' .sq-hook-err{' +
        'display:none;' +
        'font-size:12px;' +
        'color:#ff6b6b;' +
        'text-align:center;' +
      '}' +
      '#' + WIDGET_ID + ' .sq-hook-err.show{display:block;}' +
      '#' + WIDGET_ID + ' .sq-hook-hint{' +
        'font-size:11px;' +
        'color:#5b6273;' +
        'text-align:center;' +
      '}';
    var style = document.createElement('style');
    style.id = 'squarespell-hook-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function normalizeUrl(raw) {
    var v = (raw || '').trim();
    if (!v) return '';
    if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
    return v;
  }

  function buildWidget() {
    var wrap = document.createElement('div');
    wrap.id = WIDGET_ID;

    var label = document.createElement('div');
    label.className = 'sq-hook-label';
    var dot = document.createElement('span');
    dot.className = 'sq-hook-dot';
    label.appendChild(dot);
    label.appendChild(document.createTextNode('Embeddable hook widget'));

    var form = document.createElement('form');
    form.setAttribute('novalidate', 'novalidate');

    var prefix = document.createElement('span');
    prefix.className = 'sq-hook-prefix';
    prefix.textContent = 'https://';

    var input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'yoursite.com';
    input.autocomplete = 'off';
    input.spellcheck = false;

    var btn = document.createElement('button');
    btn.type = 'submit';
    btn.textContent = 'Generate';

    form.appendChild(prefix);
    form.appendChild(input);
    form.appendChild(btn);

    var err = document.createElement('div');
    err.className = 'sq-hook-err';

    var hint = document.createElement('div');
    hint.className = 'sq-hook-hint';
    hint.textContent = 'Squarespace sites only · No signup required';

    wrap.appendChild(label);
    wrap.appendChild(form);
    wrap.appendChild(err);
    wrap.appendChild(hint);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      err.classList.remove('show');
      var url = normalizeUrl(input.value);
      if (!url) {
        err.textContent = 'Please enter a URL.';
        err.classList.add('show');
        return;
      }
      btn.disabled = true;
      btn.textContent = 'Loading…';
      // Redirect to the full quiz builder funnel — TryFlowInner reads ?url=
      // and skips Stage 1, dropping the visitor straight on the questions
      // page while the brand analyze runs in the background.
      window.location.href = APP_URL + BUILDER_PATH + '?url=' + encodeURIComponent(url);
    });

    return wrap;
  }

  function init() {
    injectStyles();
    var widget = buildWidget();
    // Insert right after the script tag that loaded this file.
    if (currentScript.parentNode) {
      currentScript.parentNode.insertBefore(widget, currentScript.nextSibling);
    } else {
      document.body.appendChild(widget);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
