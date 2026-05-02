/*!
 * Squarespell Quiz Embed v2.3.1
 * Rewritten for Squarespace 7.1 AJAX navigation compatibility.
 *
 * Usage (Code Block):
 *   <div data-squarespell-quiz="YOUR_SLUG"></div>
 *   <script src="https://app.squarespell.com/embed.js" async></script>
 *
 * Legacy usage still supported:
 *   <script src="https://app.squarespell.com/embed.js" data-quiz="YOUR_SLUG" async></script>
 */
(function () {
  'use strict';

  var BASE_URL = 'https://app.squarespell.com';
  var EMBED_VERSION = '2.3.1';
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
    return BASE_URL + '/embed/' + encodeURIComponent(slug) + '?' + p.join('&');
  }

  // ── Styles (injected once) ───────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById('squarespell-styles')) return;
    var css = document.createElement('style');
    css.id = 'squarespell-styles';
    css.textContent = [
      /* Hide Squarespace "Embedded Scripts disabled" placeholder when previewing
         in the editor and collapse removed-script blocks so the layout doesn't
         reserve phantom space around our quiz. */
      'html.squarespace-damask .sqs-blockStatus,.sqs-block .removed-script{display:none !important}',
      '.squarespell-wrapper{width:100%;max-width:100%;margin:0;padding:0;display:block;line-height:0;font-size:0}',
      '.squarespell-wrapper iframe{width:100%;border:0;display:block;margin:0;padding:0;vertical-align:top;transition:height 0.3s ease}',
      /* Skeleton loader */
      '.squarespell-skeleton{position:relative;padding:24px 20px;min-height:320px;overflow:hidden;border-radius:12px}',
      '.squarespell-skeleton .sk-bar{height:6px;border-radius:99px;background:rgba(0,0,0,0.06);margin-bottom:24px}',
      '.squarespell-skeleton .sk-title{height:22px;width:70%;border-radius:6px;background:rgba(0,0,0,0.06);margin:0 auto 10px}',
      '.squarespell-skeleton .sk-sub{height:14px;width:50%;border-radius:6px;background:rgba(0,0,0,0.04);margin:0 auto 28px}',
      '.squarespell-skeleton .sk-opt{height:52px;border-radius:12px;background:rgba(0,0,0,0.04);margin-bottom:10px}',
      '.squarespell-skeleton::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.5) 50%,transparent 100%);animation:sq-shimmer 1.5s infinite}',
      '@keyframes sq-shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}',
      '.squarespell-skeleton.hidden{opacity:0;pointer-events:none;transition:opacity 0.3s ease}',
      '.squarespell-fallback{display:none;text-align:center;padding:20px;font-size:14px}',
      '.squarespell-fallback a{display:inline-block;padding:12px 24px;background:#0D7377;color:#0a0f05;border-radius:20px;font-weight:700;text-decoration:none}',
      /* Popup mode styles */
      '.squarespell-popup-btn{padding:14px 28px;border:none;border-radius:12px;font-weight:600;font-size:15px;cursor:pointer;transition:all 0.2s ease;letter-spacing:-0.01em;box-shadow:0 2px 8px rgba(0,0,0,0.1)}',
      '.squarespell-popup-btn:hover{opacity:0.92;transform:translateY(-1px);box-shadow:0 4px 14px rgba(0,0,0,0.15)}',
      '.squarespell-popup-btn:active{transform:translateY(0);box-shadow:0 1px 4px rgba(0,0,0,0.1)}',
      '.squarespell-popup-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.45);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);z-index:9999;display:none;align-items:center;justify-content:center;opacity:0;transition:opacity 0.25s ease}',
      '.squarespell-popup-overlay.active{opacity:1}',
      '.squarespell-popup-container{background:white;border-radius:18px;max-width:640px;width:92%;max-height:88vh;overflow:hidden;position:relative;box-shadow:0 20px 60px rgba(0,0,0,0.2),0 0 0 1px rgba(0,0,0,0.05);animation:sq-popup-in 0.25s ease}',
      '@keyframes sq-popup-in{from{opacity:0;transform:scale(0.96) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}',
      '.squarespell-popup-close{position:absolute;top:14px;right:14px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.06);border:none;border-radius:50%;font-size:18px;line-height:1;cursor:pointer;color:#555;z-index:10000;transition:all 0.15s ease}',
      '.squarespell-popup-close:hover{background:rgba(0,0,0,0.1);color:#111}',
      '.squarespell-popup-iframe{width:100%;border:none;display:block;height:600px;max-height:85vh}',
      /* Slidein mode styles */
      '.squarespell-slidein-tab{position:fixed;right:0;top:50%;background:#0D7377;color:#fff;border:none;border-radius:12px 0 0 12px;padding:14px 12px;font-weight:600;font-size:13px;cursor:pointer;z-index:9998;writing-mode:vertical-rl;text-orientation:mixed;transform:translateY(-50%) rotateZ(180deg);letter-spacing:0.02em;box-shadow:-2px 2px 12px rgba(0,0,0,0.15);transition:all 0.2s ease}',
      '.squarespell-slidein-tab:hover{padding-right:16px;box-shadow:-4px 2px 18px rgba(0,0,0,0.2)}',
      '.squarespell-slidein-overlay{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.3);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);z-index:9998;transition:opacity 0.3s ease}',
      '.squarespell-slidein-overlay.active{display:block}',
      '.squarespell-slidein-panel{position:fixed;right:0;top:0;bottom:0;width:420px;background:white;box-shadow:-4px 0 24px rgba(0,0,0,0.15);z-index:9999;transform:translateX(100%);transition:transform 0.3s cubic-bezier(0.4,0,0.2,1);overflow:hidden;max-width:100vw}',
      '.squarespell-slidein-panel.active{transform:translateX(0)}',
      '.squarespell-slidein-close{position:absolute;top:14px;right:14px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.06);border:none;border-radius:50%;font-size:18px;line-height:1;cursor:pointer;color:#555;z-index:10000;transition:all 0.15s ease}',
      '.squarespell-slidein-close:hover{background:rgba(0,0,0,0.1);color:#111}',
      '.squarespell-slidein-iframe{width:100%;border:none;display:block;height:100%}',
      /* Mobile responsive */
      '@media(max-width:480px){.squarespell-popup-container{width:96%;max-height:92vh;border-radius:14px}.squarespell-slidein-panel{width:100%}}'
    ].join('');
    document.head.appendChild(css);
  }

  // ── Build a single embed widget ──────────────────────────────────────────

  function buildWidget(slug, fixedHeight, mode, buttonText, accentColor) {
    var brand = detectHostBrand();
    var url = buildIframeUrl(slug, brand);
    var finalAccent = accentColor || brand.accent || '#0D7377';

    // Default mode is 'inline'
    if (!mode || mode === 'inline') {
      var wrapper = document.createElement('div');
      wrapper.className = 'squarespell-wrapper';
      wrapper.id = 'squarespell-embed-' + slug;

      var iframe = document.createElement('iframe');
      iframe.src = url;
      iframe.title = 'Squarespell Quiz';
      // NEVER use loading="lazy" — the iframe starts small, so the browser
      // thinks it's off-screen and defers loading forever (height-0 deadlock).
      iframe.loading = 'eager';
      iframe.style.height = (fixedHeight && fixedHeight !== 'auto') ? fixedHeight + 'px' : '600px';
      iframe.style.display = 'block';
      iframe.style.margin = '0';
      iframe.style.padding = '0';
      iframe.style.verticalAlign = 'top';
      iframe.style.overflow = 'hidden';

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
      btn.style.color = '#fff';

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
        overlay.style.display = 'flex';
        // Force reflow for transition
        overlay.offsetHeight;
        overlay.classList.add('active');
      });

      function closePopup() {
        overlay.classList.remove('active');
        setTimeout(function () { overlay.style.display = 'none'; }, 250);
      }

      closeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        closePopup();
      });

      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
          closePopup();
        }
      });

      // Close on Escape key
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && overlay.classList.contains('active')) {
          closePopup();
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
      tab.style.color = '#fff';
      tab.setAttribute('aria-label', 'Open quiz panel');

      var overlay = document.createElement('div');
      overlay.className = 'squarespell-slidein-overlay';

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
      container.appendChild(overlay);
      container.appendChild(panel);

      function openSlidein() {
        panel.classList.add('active');
        overlay.classList.add('active');
      }
      function closeSlidein() {
        panel.classList.remove('active');
        overlay.classList.remove('active');
      }

      tab.addEventListener('click', openSlidein);

      closeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        closeSlidein();
      });

      overlay.addEventListener('click', closeSlidein);

      // Close on Escape key
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && panel.classList.contains('active')) {
          closeSlidein();
        }
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

      // Find the iframe that sent this message (inline, popup, or slidein)
      var iframes = document.querySelectorAll('.squarespell-wrapper iframe, .squarespell-popup-iframe, .squarespell-slidein-iframe');
      var targetIframe = null;
      for (var i = 0; i < iframes.length; i++) {
        if (iframes[i].contentWindow === e.source) {
          targetIframe = iframes[i];
          break;
        }
      }
      if (!targetIframe) return;

      var embedContainer = targetIframe.closest('[id^="squarespell-embed-"]');
      var slug = embedContainer ? embedContainer.id.replace('squarespell-embed-', '') : '';
      var parentEl = targetIframe.closest('[data-squarespell-quiz], [data-quiz]');
      var fixedHeight = parentEl ? parentEl.getAttribute('data-height') : null;

      if (d.type === 'resize' && typeof d.height === 'number' && (!fixedHeight || fixedHeight === 'auto')) {
        // Enforce a minimum of 200px to prevent the iframe from collapsing to
        // invisible (which breaks lazy-loading recovery and looks broken).
        var desired = Math.min(Math.max(200, Math.round(d.height)), 4000);
        var current = parseFloat(targetIframe.style.height) || 0;
        if (Math.abs(desired - current) >= 2) {
          targetIframe.style.height = desired + 'px';
        }
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

    // Find all quiz containers: both new-style divs and legacy/fallback script tags
    var elements = document.querySelectorAll('[data-squarespell-quiz], script[data-quiz]');

    if (elements.length === 0 && !window.__squarespell_no_container_warned) {
      console.warn('[Squarespell] No quiz containers found. Make sure your embed code is in a Code Block (not Code Injection). Expected: <div data-squarespell-quiz="YOUR_SLUG"></div>');
      window.__squarespell_no_container_warned = true;
    }

    // Track which slugs we've already handled (dedup div + script for same quiz)
    var handledSlugs = {};

    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];

      // Skip already-initialized elements
      if (el.getAttribute(INIT_ATTR) === 'true') continue;

      var slug, fixedHeight, mode, buttonText, accentColor;

      if (el.tagName === 'SCRIPT') {
        // Legacy / fallback: <script data-quiz="slug">
        slug = el.getAttribute('data-quiz');
        fixedHeight = el.getAttribute('data-height');
        mode = el.getAttribute('data-mode');
        buttonText = el.getAttribute('data-button-text');
        accentColor = el.getAttribute('data-accent-color');
      } else {
        // New: <div data-squarespell-quiz="slug">
        slug = el.getAttribute('data-squarespell-quiz');
        fixedHeight = el.getAttribute('data-height');
        mode = el.getAttribute('data-mode');
        buttonText = el.getAttribute('data-button-text');
        accentColor = el.getAttribute('data-accent-color');
      }

      if (!slug) continue;

      // Check if the wrapper already exists in the DOM (from a previous init)
      if (document.getElementById('squarespell-embed-' + slug)) {
        el.setAttribute(INIT_ATTR, 'true');
        continue;
      }

      // Skip if we already handled this slug in this scan pass (dedup div+script)
      if (handledSlugs[slug]) {
        el.setAttribute(INIT_ATTR, 'true');
        continue;
      }
      handledSlugs[slug] = true;

      // Build and insert
      var widget = buildWidget(slug, fixedHeight, mode, buttonText, accentColor);

      if (el.tagName === 'SCRIPT') {
        // If the script is in <head> (e.g. Squarespace Code Injection),
        // append to <body> instead — elements in <head> are invisible.
        var parent = el.parentNode;
        if (parent && parent.tagName === 'HEAD') {
          if (document.body) {
            document.body.appendChild(widget.wrapper);
          } else {
            // body doesn't exist yet — wait for it
            document.addEventListener('DOMContentLoaded', function(w) {
              return function() { document.body.appendChild(w.wrapper); };
            }(widget));
          }
        } else {
          parent.insertBefore(widget.wrapper, el.nextSibling);
        }
      } else {
        // Div container — check if it somehow ended up in <head>
        var divParent = el.parentNode;
        while (divParent && divParent !== document.body && divParent !== document.head && divParent.parentNode) {
          divParent = divParent.parentNode;
        }
        if (divParent === document.head) {
          // Div is inside <head> — move widget to body
          if (document.body) {
            document.body.appendChild(widget.wrapper);
          }
        } else {
          el.appendChild(widget.wrapper);
        }
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

  // ── Self-detecting script tag (legacy <script data-quiz="slug"> in Code Injection) ──
  //
  // When the embed script itself carries data-quiz, and it's loaded in <head>
  // via Squarespace Code Injection, scanAndInit may run before <body> exists.
  // We capture document.currentScript now and ensure it's processed.

  var selfScript = (typeof document !== 'undefined') ? document.currentScript : null;

  // ── Squarespace 7.1 AJAX navigation support ─────────────────────────────
  //
  // Squarespace 7.1 uses AJAX page transitions ("Mercury" loader).
  // When the user navigates to a new page, the DOM is replaced but the
  // window object persists. We need to re-scan for quiz elements after
  // every navigation event.

  // 1. Initial load — wait for body to exist when loaded from <head>
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scanAndInit);
  } else {
    scanAndInit();
  }

  // 2. MutationObserver: detect late-rendered Code Blocks or dynamic inserts
  function startObserver() {
    if (typeof MutationObserver === 'undefined' || !document.body) return;
    var debounceTimer = null;
    var observer = new MutationObserver(function () {
      // Debounce: Squarespace can trigger many mutations during page load
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(scanAndInit, 200);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
  // If body exists now, start immediately; otherwise wait for DOMContentLoaded
  if (document.body) {
    startObserver();
  } else {
    document.addEventListener('DOMContentLoaded', startObserver);
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
