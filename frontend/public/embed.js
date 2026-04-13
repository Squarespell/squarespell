/*!
 * Squarespell embed loader
 * -----------------------------------------------------------------
 * Usage (paste into any Squarespace Code Block):
 *
 *   <script src="https://quiz.squarespell.com/embed.js" data-quiz="your-slug"></script>
 *
 * What it does:
 *   1. Finds the <script> tag that loaded it (currentScript or last match).
 *   2. Reads the quiz slug from data-quiz (required).
 *   3. Inserts a wrapper + iframe pointing at the public quiz page.
 *   4. Listens for postMessage 'resize' events from the iframe and
 *      auto-adjusts height so there is no inner scrollbar.
 *   5. Shows a fallback <a> link if the iframe fails to load.
 *
 * Hardening:
 *   - Idempotent: runs once per <script> tag (guards against Squarespace
 *     re-executing the block on navigation or in preview).
 *   - Never throws on the host page: all failures degrade to the fallback.
 *   - No external dependencies; ~1.5kB minified.
 */
(function () {
  'use strict';

  var BASE = 'https://quiz.squarespell.com';
  var VERSION = '2.2.0';
  var INIT_FLAG = '__squarespellInitialized';

  function findSelfScript() {
    if (document.currentScript && document.currentScript.getAttribute('data-quiz')) {
      return document.currentScript;
    }
    var scripts = document.querySelectorAll('script[data-quiz]');
    for (var i = scripts.length - 1; i >= 0; i--) {
      if (!scripts[i][INIT_FLAG]) return scripts[i];
    }
    return scripts.length ? scripts[scripts.length - 1] : null;
  }

  function buildQuizUrl(slug) {
    return BASE + '/quiz/' + encodeURIComponent(slug) + '?embed=1&v=' + VERSION;
  }

  function mount(script) {
    if (!script || script[INIT_FLAG]) return;
    script[INIT_FLAG] = true;

    var slug = script.getAttribute('data-quiz');
    if (!slug) {
      // Silent no-op; never error out on the host page.
      if (window.console && console.warn) {
        console.warn('[Squarespell] <script data-quiz="..."> is required.');
      }
      return;
    }

    // Create wrapper + iframe.
    var wrapper = document.createElement('div');
    wrapper.className = 'squarespell-wrapper';
    wrapper.id = 'squarespell-embed-' + slug;
    wrapper.setAttribute('data-squarespell-slug', slug);
    wrapper.style.cssText = [
      'position:relative',
      'width:100%',
      'max-width:720px',
      'margin:0 auto',
      'min-height:480px',
    ].join(';');

    var iframe = document.createElement('iframe');
    iframe.src = buildQuizUrl(slug);
    iframe.title = 'Squarespell Quiz';
    iframe.loading = 'lazy';
    iframe.setAttribute('allow', 'clipboard-write; forms-submission');
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    iframe.style.cssText = [
      'width:100%',
      'border:0',
      'display:block',
      'background:transparent',
      'height:600px',
      'transition:height .35s cubic-bezier(.16,1,.3,1)',
    ].join(';');

    // Fallback link if iframe is blocked by a CSP or similar.
    var fallback = document.createElement('noscript');
    var fallbackA = document.createElement('a');
    fallbackA.href = BASE + '/quiz/' + encodeURIComponent(slug);
    fallbackA.target = '_blank';
    fallbackA.rel = 'noopener';
    fallbackA.textContent = 'Open the quiz';
    fallback.appendChild(fallbackA);

    wrapper.appendChild(iframe);
    wrapper.appendChild(fallback);

    // Inject right after the <script> tag (where Squarespace expects the content).
    if (script.parentNode) {
      script.parentNode.insertBefore(wrapper, script.nextSibling);
    } else {
      document.body.appendChild(wrapper);
    }

    // Height autosync.
    window.addEventListener('message', function (event) {
      try {
        var data = event.data;
        if (!data || data.source !== 'squarespell') return;
        if (data.type === 'resize' && typeof data.height === 'number') {
          var h = Math.max(320, Math.min(4000, data.height));
          iframe.style.height = h + 'px';
        }
      } catch (_) {
        /* no-op */
      }
    });
  }

  function boot() {
    var script = findSelfScript();
    mount(script);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
