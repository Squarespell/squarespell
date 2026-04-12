/*!
 * Squarespell Quiz Embed v2.0.0
 * Rewritten for Squarespace 7.1 AJAX navigation compatibility.
 *
 * Usage (Code Block):
 *   <div data-squarespell-quiz="YOUR_SLUG"></div>
 *   <script src="https://quiz.squarespell.com/embed/quiz-embed.js" async></script>
 *
 * Legacy usage still supported:
 *   <script src="https://quiz.squarespell.com/embed/quiz-embed.js" data-quiz="YOUR_SLUG" async></script>
 */
(function () {
  'use strict';

  var BASE_URL = 'https://quiz.squarespell.com';
  var EMBED_VERSION = '2.0.0';
  var INIT_ATTR = 'data-squarespell-init';

  // ── Utility helpers ──────────────────────────────────────────────────────

  function rgbToHex(rgb) {
    if (!rgb) return '';
    if (rgb.charAt(0) === '#') return rgb;
    var m = rgb.match(/^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (!m) return '';
    return '#' + [m[1], m[2], m[3]].map(function (n) {
      return ('0' + parseInt(n, 10).toString(16)).slice(-2);
    }).join('');
  }

  function cleanFont(f) {
    if (!f) return '';
    return f.split(',')[0].replace(/['"]/g, '').trim();
  }

  function detectHostBrand() {
    try {
      var s = window.getComputedStyle(document.body);
      var links = document.querySelectorAll('a');
      var accent = '';
      if (links.length > 0) accent = window.getComputedStyle(links[0]).color || '';
      return {
        bg: rgbToHex(s.backgroundColor),
        text: rgbToHex(s.color),
        accent: rgbToHex(accent),
        font: cleanFont(s.fontFamily)
      };
    } catch (e) {
      return { bg: '', text: '', accent: '', font: '' };
    }
  }

  function buildIframeUrl(slug, brand) {
    var p = ['embed=1', 'v=' + EMBED_VERSION];
    if (brand.bg) p.push('bg=' + encodeURIComponent(brand.bg));
    if (brand.text) p.push('fg=' + encodeURIComponent(brand.text));
    if (brand.accent) p.push('accent=' + encodeURIComponent(brand.accent));
    if (brand.font) p.push('font=' + encodeURIComponent(brand.font));
    return BASE_URL + '/quiz/' + encodeURIComponent(slug) + '?' + p.join('&');
  }

  // ── Styles (injected once) ───────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById('squarespell-styles')) return;
    var css = document.createElement('style');
    css.id = 'squarespell-styles';
    css.textContent = [
      '.squarespell-wrapper{width:100%;max-width:640px;margin:0 auto;display:block}',
      '.squarespell-wrapper iframe{width:100%;border:none;border-radius:16px;display:block;transition:height 0.3s ease}',
      '.squarespell-fallback{display:none;text-align:center;padding:20px;font-size:14px}',
      '.squarespell-fallback a{display:inline-block;padding:12px 24px;background:#D2FF1D;color:#0a0f05;border-radius:20px;font-weight:700;text-decoration:none}',
      /* Popup mode styles */
      '.squarespell-popup-btn{padding:12px 24px;border:none;border-radius:20px;font-weight:700;font-size:14px;cursor:pointer;transition:opacity 0.2s ease}',
      '.squarespell-popup-overlay{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center}',
      '.squarespell-popup-overlay.active{display:flex}',
      '.squarespell-popup-container{background:white;border-radius:16px;max-width:640px;width:90%;max-height:90vh;overflow:auto;position:relative;box-shadow:0 10px 40px rgba(0,0,0,0.2)}',
      '.squarespell-popup-close{position:absolute;top:12px;right:12px;background:none;border:none;font-size:24px;cursor:pointer;color:#666;z-index:10000}',
      '.squarespell-popup-close:hover{color:#000}',
      '.squarespell-popup-iframe{width:100%;border:none;display:block;height:600px}',
      /* Slidein mode styles */
      '.squarespell-slidein-tab{position:fixed;right:0;top:50%;transform:translateY(-50%);background:#D2FF1D;color:#0a0f05;border:none;border-radius:20px 0 0 20px;padding:12px 16px;font-weight:700;font-size:14px;cursor:pointer;z-index:9998;writing-mode:vertical-rl;text-orientation:mixed;transform:translateY(-50%) rotateZ(180deg)}',
      '.squarespell-slidein-panel{position:fixed;right:0;top:0;bottom:0;width:400px;background:white;box-shadow:-2px 0 10px rgba(0,0,0,0.2);z-index:9999;transform:translateX(100%);transition:transform 0.3s ease;overflow:auto;max-width:100vw}',
      '.squarespell-slidein-panel.active{transform:translateX(0)}',
      '.squarespell-slidein-close{position:absolute;top:12px;right:12px;background:none;border:none;font-size:24px;cursor:pointer;color:#666;z-index:10000}',
      '.squarespell-slidein-close:hover{color:#000}',
      '.squarespell-slidein-iframe{width:100%;border:none;display:block;height:100vh;height:100%}'
    ].join('');
    document.head.appendChild(css);
  }

  // ── Build a single embed widget ──────────────────────────────────────────

  function buildWidget(slug, fixedHeight, mode, buttonText, accentColor) {
    var brand = detectHostBrand();
    var url = buildIframeUrl(slug, brand);
    var finalAccent = accentColor || brand.accent || '#D2FF1D';

    // Default mode is 'inline'
    if (!mode || mode === 'inline') {
      var wrapper = document.createElement('div');
      wrapper.className = 'squarespell-wrapper';
      wrapper.id = 'squarespell-embed-' + slug;

      var iframe = document.createElement('iframe');
      iframe.src = url;
      iframe.title = 'Squarespell Quiz';
      iframe.loading = 'lazy';
      iframe.style.height = (fixedHeight && fixedHeight !== 'auto') ? fixedHeight + 'px' : '600px';

      var fallback = document.createElement('div');
      fallback.className = 'squarespell-fallback';
      fallback.innerHTML =
        '<p style="margin-bottom:12px">Having trouble loading?</p>' +
        '<a href="' + BASE_URL + '/quiz/' + encodeURIComponent(slug) + '" target="_blank" rel="noopener">Open quiz in new tab</a>';

      iframe.onerror = function () { fallback.style.display = 'block'; };

      wrapper.appendChild(iframe);
      wrapper.appendChild(fallback);

      return { wrapper: wrapper, iframe: iframe };
    }

    // Popup mode
    if (mode === 'popup') {
      var container = document.createElement('div');
      container.id = 'squarespell-embed-' + slug;

      var btn = document.createElement('button');
      btn.className = 'squarespell-popup-btn';
      btn.textContent = buttonText || 'Take the Quiz';
      btn.style.backgroundColor = finalAccent;
      btn.style.color = '#0a0f05';

      var overlay = document.createElement('div');
      overlay.className = 'squarespell-popup-overlay';

      var popupContainer = document.createElement('div');
      popupContainer.className = 'squarespell-popup-container';

      var closeBtn = document.createElement('button');
      closeBtn.className = 'squarespell-popup-close';
      closeBtn.innerHTML = '&times;';
      closeBtn.setAttribute('aria-label', 'Close quiz');

      var iframePopup = document.createElement('iframe');
      iframePopup.className = 'squarespell-popup-iframe';
      iframePopup.src = url;
      iframePopup.title = 'Squarespell Quiz';

      popupContainer.appendChild(closeBtn);
      popupContainer.appendChild(iframePopup);
      overlay.appendChild(popupContainer);

      container.appendChild(btn);
      container.appendChild(overlay);

      btn.addEventListener('click', function () {
        overlay.classList.add('active');
      });

      closeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        overlay.classList.remove('active');
      });

      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
          overlay.classList.remove('active');
        }
      });

      return { wrapper: container, iframe: iframePopup };
    }

    // Slidein mode
    if (mode === 'slidein') {
      var container = document.createElement('div');
      container.id = 'squarespell-embed-' + slug;

      var tab = document.createElement('button');
      tab.className = 'squarespell-slidein-tab';
      tab.textContent = buttonText || 'Take Quiz';
      tab.style.backgroundColor = finalAccent;
      tab.style.color = '#0a0f05';
      tab.setAttribute('aria-label', 'Open quiz panel');

      var panel = document.createElement('div');
      panel.className = 'squarespell-slidein-panel';

      var closeBtn = document.createElement('button');
      closeBtn.className = 'squarespell-slidein-close';
      closeBtn.innerHTML = '&times;';
      closeBtn.setAttribute('aria-label', 'Close quiz panel');

      var iframeSlidein = document.createElement('iframe');
      iframeSlidein.className = 'squarespell-slidein-iframe';
      iframeSlidein.src = url;
      iframeSlidein.title = 'Squarespell Quiz';

      panel.appendChild(closeBtn);
      panel.appendChild(iframeSlidein);
      container.appendChild(tab);
      container.appendChild(panel);

      tab.addEventListener('click', function () {
        panel.classList.add('active');
      });

      closeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        panel.classList.remove('active');
      });

      return { wrapper: container, iframe: iframeSlidein };
    }
  }

  // ── PostMessage listener (single global listener) ────────────────────────

  var messageListenerAttached = false;

  function attachMessageListener() {
    if (messageListenerAttached) return;
    messageListenerAttached = true;

    window.addEventListener('message', function (e) {
      // Validate origin
      if (e.origin !== BASE_URL) return;

      var d = e.data;
      if (!d || d.source !== 'squarespell') return;

      // Find the iframe that sent this message
      var iframes = document.querySelectorAll('.squarespell-wrapper iframe');
      var targetIframe = null;
      for (var i = 0; i < iframes.length; i++) {
        if (iframes[i].contentWindow === e.source) {
          targetIframe = iframes[i];
          break;
        }
      }
      if (!targetIframe) return;

      var slug = targetIframe.closest('.squarespell-wrapper')?.id?.replace('squarespell-embed-', '') || '';
      var parentEl = targetIframe.closest('[data-squarespell-quiz], [data-quiz]');
      var fixedHeight = parentEl ? parentEl.getAttribute('data-height') : null;

      if (d.type === 'resize' && typeof d.height === 'number' && (!fixedHeight || fixedHeight === 'auto')) {
        targetIframe.style.height = (d.height + 32) + 'px';
      }

      if (d.type === 'complete') {
        document.dispatchEvent(new CustomEvent('squarespell:complete', {
          bubbles: true,
          detail: { slug: slug, outcome_id: d.outcome_id }
        }));
        if (window.dataLayer) {
          window.dataLayer.push({
            event: 'squarespell_complete',
            quiz_slug: slug,
            outcome_id: d.outcome_id
          });
        }
      }

      if (d.type === 'lead_captured') {
        document.dispatchEvent(new CustomEvent('squarespell:lead', {
          bubbles: true,
          detail: { slug: slug, email: d.email }
        }));
        if (window.dataLayer) {
          window.dataLayer.push({
            event: 'squarespell_lead',
            quiz_slug: slug
          });
        }
      }

      if (d.type === 'start') {
        var rect = targetIframe.getBoundingClientRect();
        if (rect.top < 0 || rect.top > window.innerHeight * 0.3) {
          targetIframe.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  }

  // ── Scan & initialize un-initialized quiz embeds ─────────────────────────

  function scanAndInit() {
    injectStyles();
    attachMessageListener();

    // Log version on first init
    var loggedVersion = window.__squarespell_version_logged;
    if (!loggedVersion) {
      console.log('[Squarespell] Embed v' + EMBED_VERSION + ' loaded');
      window.__squarespell_version_logged = true;
    }

    // Find all quiz containers: both new-style and legacy
    var elements = document.querySelectorAll('[data-squarespell-quiz], script[data-quiz]');

    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];

      // Skip already-initialized elements
      if (el.getAttribute(INIT_ATTR) === 'true') continue;

      var slug, fixedHeight, mode, buttonText, accentColor, insertTarget;

      if (el.tagName === 'SCRIPT') {
        // Legacy: <script data-quiz="slug">
        slug = el.getAttribute('data-quiz');
        fixedHeight = el.getAttribute('data-height');
        mode = el.getAttribute('data-mode');
        buttonText = el.getAttribute('data-button-text');
        accentColor = el.getAttribute('data-accent-color');
        insertTarget = el;
      } else {
        // New: <div data-squarespell-quiz="slug">
        slug = el.getAttribute('data-squarespell-quiz');
        fixedHeight = el.getAttribute('data-height');
        mode = el.getAttribute('data-mode');
        buttonText = el.getAttribute('data-button-text');
        accentColor = el.getAttribute('data-accent-color');
        insertTarget = el;
      }

      if (!slug) continue;

      // Check if the wrapper already exists in the DOM (from a previous init)
      if (document.getElementById('squarespell-embed-' + slug)) {
        el.setAttribute(INIT_ATTR, 'true');
        continue;
      }

      // Build and insert
      var widget = buildWidget(slug, fixedHeight, mode, buttonText, accentColor);

      if (el.tagName === 'SCRIPT') {
        el.parentNode.insertBefore(widget.wrapper, el.nextSibling);
      } else {
        el.appendChild(widget.wrapper);
      }

      el.setAttribute(INIT_ATTR, 'true');
    }

    // Version check (non-blocking)
    try {
      fetch(BASE_URL + '/embed/version.json', { cache: 'no-store' })
        .then(function(r) { return r.json(); })
        .then(function(d) {
          if (d.latest && d.latest !== EMBED_VERSION) {
            console.warn('[Squarespell] A newer embed version (' + d.latest + ') is available. Update your embed code for the best experience.');
          }
        })
        .catch(function() {}); // Silent fail
    } catch(e) {}
  }

  // ── Squarespace 7.1 AJAX navigation support ─────────────────────────────
  //
  // Squarespace 7.1 uses AJAX page transitions ("Mercury" loader).
  // When the user navigates to a new page, the DOM is replaced but the
  // window object persists. We need to re-scan for quiz elements after
  // every navigation event.

  // 1. Initial load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scanAndInit);
  } else {
    scanAndInit();
  }

  // 2. MutationObserver: detect late-rendered Code Blocks or dynamic inserts
  if (typeof MutationObserver !== 'undefined') {
    var debounceTimer = null;
    var observer = new MutationObserver(function () {
      // Debounce: Squarespace can trigger many mutations during page load
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(scanAndInit, 200);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // 3. Squarespace "mercury:load" event (AJAX page transitions)
  window.addEventListener('mercury:load', scanAndInit);

  // 4. Browser popstate (back/forward navigation)
  window.addEventListener('popstate', function () {
    // Slight delay to let Squarespace finish DOM swap
    setTimeout(scanAndInit, 100);
  });

  // 5. Squarespace "mercury:unload" - clean up before page swap
  window.addEventListener('mercury:unload', function () {
    // Remove init markers so widgets get re-created on the new page
    var marked = document.querySelectorAll('[' + INIT_ATTR + ']');
    for (var i = 0; i < marked.length; i++) {
      marked[i].removeAttribute(INIT_ATTR);
    }
  });

})();
