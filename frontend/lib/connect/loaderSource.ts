/**
 * The Squarespell site loader (served at /connect/loader.js). Plain ES5, no dependencies, no cookies.
 * It is a string so the server can inject the API and site origins at request time and so the tests can run the exact shipped code.
 * Behaviour is specified in docs/relaunch/SQUARESPELL_ONE_BUTTON_CONNECT_SPEC.md section 3.1.
 */
export const LOADER_VERSION = '1.0.0';

export const LOADER_TEMPLATE = String.raw`(function () {
  'use strict';
  var API = '__API__', ORIGIN = '__ORIGIN__', VERSION = '__VERSION__';
  var w = window, d = document;
  if (!w || !d || !d.documentElement) return;
  var script = d.currentScript;
  var KEY = script && script.getAttribute ? script.getAttribute('data-site') : null;
  if (!KEY) {
    var cands = d.querySelectorAll('script[data-site]');
    for (var ci = 0; ci < cands.length; ci++) {
      if (/\/connect\/loader(\.v\d+)?\.js/.test(cands[ci].getAttribute('src') || '')) { KEY = cands[ci].getAttribute('data-site'); break; }
    }
  }
  if (!KEY || !/^ssq_[A-Za-z0-9_-]{32}$/.test(KEY)) return;
  // Idempotent: a second inclusion of the loader (same page, same or another key) does nothing.
  if (w.__squarespellConnect) return;

  var MODES = { inline: 1, popup: 1, floating_tab: 1 };
  var SLOT = /^[a-z0-9][a-z0-9-]{0,39}$/;
  var QUIZ = /^[A-Za-z0-9_-]{1,120}$/;
  var state = w.__squarespellConnect = { version: VERSION, key: KEY, manifest: null, rendered: {}, rescan: function () {}, destroy: function () {} };
  var framed = false;
  try { framed = w.self !== w.top; } catch (e) { framed = true; }

  function safe(fn) { return function () { try { return fn.apply(this, arguments); } catch (e) { /* never break the host website */ } }; }

  // ---- page rules: the same algorithm as the server (backend/src/services/connect/rules.ts) ----
  function canonicalHost(h) { return String(h || '').toLowerCase().replace(/\.$/, '').replace(/^www\./, ''); }
  function canonicalPath(p) {
    var s = String(p || '/').split('#')[0].split('?')[0].toLowerCase();
    if (s.charAt(0) !== '/') s = '/' + s;
    if (s.length > 1) s = s.replace(/\/+$/, '');
    return s || '/';
  }
  function ruleMatches(rule, path) {
    if (rule === '*') return true;
    if (rule.length > 1 && rule.slice(-2) === '/*') { var base = rule.slice(0, -2); return path === base || path.indexOf(base + '/') === 0; }
    return rule === path;
  }
  function matchesPath(path, include, exclude) {
    var p = canonicalPath(path), i;
    for (i = 0; i < exclude.length; i++) if (ruleMatches(exclude[i], p)) return false;
    if (!include.length) return true;
    for (i = 0; i < include.length; i++) if (ruleMatches(include[i], p)) return true;
    return false;
  }

  // ---- manifest validation: anything unexpected is ignored, and the previous good manifest stays in force ----
  function strList(a) {
    if (!Array.isArray(a) || a.length > 20) return null;
    for (var i = 0; i < a.length; i++) if (typeof a[i] !== 'string' || a[i].length > 200) return null;
    return a.slice();
  }
  function validManifest(m) {
    if (!m || m.v !== 1 || typeof m.hostname !== 'string' || !Array.isArray(m.installations) || m.installations.length > 50) return null;
    var out = { hostname: m.hostname, version: m.version | 0, paused: !!m.paused, installations: [] };
    for (var i = 0; i < m.installations.length; i++) {
      var x = m.installations[i];
      if (!x || typeof x.id !== 'string' || x.id.length > 64 || !MODES[x.mode] || typeof x.quiz !== 'string' || !QUIZ.test(x.quiz)) return null;
      var slot = x.slot == null ? null : x.slot;
      if (x.mode === 'inline' && !(typeof slot === 'string' && SLOT.test(slot))) return null;
      var inc = strList(x.include || []), exc = strList(x.exclude || []);
      if (!inc || !exc) return null;
      out.installations.push({ id: x.id, quiz: x.quiz, mode: x.mode, slot: slot, include: inc, exclude: exc, options: x.options && typeof x.options === 'object' ? x.options : {} });
    }
    return out;
  }

  // ---- styles (injected once) ----
  function injectStyles() {
    if (d.getElementById('squarespell-connect-styles')) return;
    var s = d.createElement('style');
    s.id = 'squarespell-connect-styles';
    s.textContent = [
      'html.squarespace-damask .sqs-blockStatus,.sqs-block .removed-script{display:none !important}',
      '.sqc-inline{width:100%;max-width:100%;display:block;line-height:0;font-size:0}',
      '.sqc-inline iframe{width:100%;border:0;display:block;transition:height .25s ease}',
      '.sqc-overlay{position:fixed;inset:0;z-index:2147483000;background:rgba(15,25,24,.5);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .2s ease}',
      '.sqc-overlay.sqc-open{opacity:1}',
      '.sqc-dialog{position:relative;background:#fff;border-radius:16px;width:min(640px,94vw);height:min(720px,90vh);overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,.3);transform:translateY(8px) scale(.98);transition:transform .2s ease}',
      '.sqc-overlay.sqc-open .sqc-dialog{transform:none}',
      '.sqc-dialog iframe{width:100%;height:100%;border:0;display:block}',
      '.sqc-close{position:absolute;top:10px;right:10px;z-index:2;width:36px;height:36px;border:0;border-radius:50%;background:rgba(255,255,255,.95);color:#17201f;font:600 20px/36px system-ui,sans-serif;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.18)}',
      '.sqc-close:focus-visible,.sqc-tab:focus-visible{outline:3px solid #0f7377;outline-offset:2px}',
      '.sqc-tab{position:fixed;right:0;bottom:24px;z-index:2147482999;border:0;border-radius:12px 0 0 12px;padding:12px 16px;background:#0f7377;color:#fff;font:600 15px/1.2 system-ui,sans-serif;cursor:pointer;box-shadow:-3px 3px 14px rgba(0,0,0,.2);transition:padding .15s ease}',
      '.sqc-tab:hover{padding-right:22px}',
      '.sqc-panel{align-items:stretch;justify-content:flex-end}',
      '.sqc-panel .sqc-dialog{width:min(440px,100vw);height:100%;border-radius:16px 0 0 16px;transform:translateX(24px)}',
      '@media (max-width:480px){.sqc-dialog{width:100vw;height:100%;border-radius:0}.sqc-panel .sqc-dialog{border-radius:0}}',
      '@media (prefers-reduced-motion:reduce){.sqc-overlay,.sqc-dialog,.sqc-inline iframe,.sqc-tab{transition:none !important}}'
    ].join('\n');
    (d.head || d.documentElement).appendChild(s);
  }

  function iframeUrl(inst) {
    var u = ORIGIN + '/embed/' + encodeURIComponent(inst.quiz) + '?embed=1&v=' + encodeURIComponent(VERSION);
    var accent = inst.options && inst.options.accentColor;
    if (typeof accent === 'string' && /^#[0-9a-f]{6}$/i.test(accent)) u += '&accent=' + encodeURIComponent(accent);
    return u;
  }
  function makeFrame(inst, height) {
    var f = d.createElement('iframe');
    f.src = iframeUrl(inst);
    f.title = 'Quiz';
    f.loading = 'lazy';
    f.setAttribute('allow', 'clipboard-write');
    if (height) f.style.height = height + 'px';
    return f;
  }

  // ---- dismissal memory: used ONLY when the owner turned on "remember dismissal"; never a cookie ----
  function dismissKey(inst) { return 'sqc:d:' + inst.id; }
  function isDismissed(inst) {
    var days = inst.options && inst.options.dismissDays;
    if (!days) return false;
    try { var t = Number(w.localStorage.getItem(dismissKey(inst))); return t > Date.now(); } catch (e) { return false; }
  }
  function rememberDismissal(inst) {
    var days = inst.options && inst.options.dismissDays;
    if (!days) return;
    try { w.localStorage.setItem(dismissKey(inst), String(Date.now() + days * 86400000)); } catch (e) { /* storage unavailable */ }
  }

  // ---- accessible dialog (popup and floating tab panel) ----
  function openDialog(inst, panel, onClose) {
    var opener = d.activeElement;
    var overlay = d.createElement('div');
    overlay.className = 'sqc-overlay' + (panel ? ' sqc-panel' : '');
    var dlg = d.createElement('div');
    dlg.className = 'sqc-dialog';
    dlg.setAttribute('role', 'dialog');
    dlg.setAttribute('aria-modal', 'true');
    dlg.setAttribute('aria-label', 'Quiz');
    var close = d.createElement('button');
    close.type = 'button';
    close.className = 'sqc-close';
    close.setAttribute('aria-label', 'Close quiz');
    close.textContent = '×';
    dlg.appendChild(close);
    dlg.appendChild(makeFrame(inst, 0));
    overlay.appendChild(dlg);
    d.body.appendChild(overlay);
    var prevOverflow = d.documentElement.style.overflow;
    d.documentElement.style.overflow = 'hidden';
    w.requestAnimationFrame ? w.requestAnimationFrame(function () { overlay.className += ' sqc-open'; }) : (overlay.className += ' sqc-open');
    close.focus();
    var closed = false;
    function shut() {
      if (closed) return; closed = true;
      d.removeEventListener('keydown', onKey, true);
      d.documentElement.style.overflow = prevOverflow;
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      try { if (opener && opener.focus) opener.focus(); } catch (e) { /* element gone */ }
      if (onClose) onClose();
    }
    function onKey(e) {
      if (e.key === 'Escape' || e.keyCode === 27) { e.stopPropagation(); shut(); return; }
      if (e.key === 'Tab' || e.keyCode === 9) {
        // The quiz iframe is one tab stop; keep focus between the close button and the frame.
        var frame = dlg.querySelector('iframe');
        if (e.shiftKey && d.activeElement === close) { e.preventDefault(); frame.focus(); }
        else if (!e.shiftKey && d.activeElement === frame) { e.preventDefault(); close.focus(); }
        else if (d.activeElement !== close && d.activeElement !== frame) { e.preventDefault(); close.focus(); }
      }
    }
    d.addEventListener('keydown', onKey, true);
    close.addEventListener('click', shut);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) shut(); });
    return { close: shut, overlay: overlay };
  }

  // ---- renderers: each returns a handle with cleanup() or null when it could not render yet ----
  function renderInline(inst) {
    var slots = d.querySelectorAll('[data-squarespell-slot="' + inst.slot + '"]:not([data-squarespell-connect])');
    if (!slots.length) return null;
    var mounted = [];
    for (var i = 0; i < slots.length; i++) {
      var wrap = d.createElement('div');
      wrap.className = 'sqc-inline';
      var fixed = inst.options && inst.options.height;
      wrap.appendChild(makeFrame(inst, fixed || 600));
      wrap.setAttribute('data-sqc-fixed', fixed ? '1' : '');
      slots[i].appendChild(wrap);
      slots[i].setAttribute('data-squarespell-connect', inst.id);
      mounted.push({ slot: slots[i], wrap: wrap });
    }
    return { cleanup: function () { for (var j = 0; j < mounted.length; j++) { if (mounted[j].wrap.parentNode) mounted[j].wrap.parentNode.removeChild(mounted[j].wrap); mounted[j].slot.removeAttribute('data-squarespell-connect'); } } };
  }

  function mobileHidden(inst) { return !!(inst.options && inst.options.hideOnMobile) && w.innerWidth < 768; }

  function renderPopup(inst) {
    if (framed || !d.body) return {};
    if (mobileHidden(inst) || isDismissed(inst)) return {};
    var opts = inst.options || {};
    var done = false, dialog = null, timer = null, offScroll = null, offExit = null;
    function open() {
      if (done || !d.body) return;
      done = true;
      if (offScroll) offScroll();
      if (offExit) offExit();
      dialog = openDialog(inst, false, function () { rememberDismissal(inst); dialog = null; });
    }
    if (opts.trigger === 'scroll') {
      var pct = opts.scrollPercent || 50;
      var onScroll = safe(function () {
        var h = d.documentElement.scrollHeight - w.innerHeight;
        if (h > 0 && (w.pageYOffset / h) * 100 >= pct) open();
      });
      w.addEventListener('scroll', onScroll, { passive: true });
      offScroll = function () { w.removeEventListener('scroll', onScroll); };
    } else if (opts.trigger === 'exit') {
      var onOut = safe(function (e) { if (e.clientY <= 0 && !e.relatedTarget) open(); });
      d.addEventListener('mouseout', onOut);
      offExit = function () { d.removeEventListener('mouseout', onOut); };
    } else {
      timer = setTimeout(safe(open), (opts.delaySeconds == null ? 8 : opts.delaySeconds) * 1000);
    }
    return { cleanup: function () { done = true; if (timer) clearTimeout(timer); if (offScroll) offScroll(); if (offExit) offExit(); if (dialog) dialog.close(); } };
  }

  function renderTab(inst) {
    if (framed || !d.body) return {};
    if (mobileHidden(inst)) return {};
    var opts = inst.options || {};
    var tab = d.createElement('button');
    tab.type = 'button';
    tab.className = 'sqc-tab';
    tab.textContent = opts.buttonText || 'Take the quiz';
    tab.setAttribute('aria-haspopup', 'dialog');
    if (typeof opts.accentColor === 'string' && /^#[0-9a-f]{6}$/i.test(opts.accentColor)) tab.style.background = opts.accentColor;
    var dialog = null;
    tab.addEventListener('click', function () {
      if (dialog) return;
      tab.setAttribute('aria-expanded', 'true');
      dialog = openDialog(inst, true, function () { dialog = null; tab.setAttribute('aria-expanded', 'false'); });
    });
    tab.setAttribute('aria-expanded', 'false');
    d.body.appendChild(tab);
    return { cleanup: function () { if (dialog) dialog.close(); if (tab.parentNode) tab.parentNode.removeChild(tab); } };
  }

  // ---- iframe messages (same protocol as the existing embed) ----
  var messageAttached = false;
  function attachMessages() {
    if (messageAttached) return;
    messageAttached = true;
    w.addEventListener('message', safe(function (e) {
      if (e.origin !== ORIGIN) return;
      var m = e.data;
      if (!m || m.source !== 'squarespell') return;
      var frames = d.querySelectorAll('.sqc-inline iframe');
      for (var i = 0; i < frames.length; i++) {
        if (frames[i].contentWindow !== e.source) continue;
        if (m.type === 'resize' && typeof m.height === 'number' && !frames[i].parentNode.getAttribute('data-sqc-fixed')) {
          var h = Math.min(Math.max(200, Math.round(m.height)), 4000);
          if (Math.abs(h - (parseFloat(frames[i].style.height) || 0)) >= 2) frames[i].style.height = h + 'px';
        }
      }
    }));
  }

  // ---- reconcile: make the page match the current manifest for the current path ----
  function sig(inst) { return JSON.stringify([inst.quiz, inst.mode, inst.slot, inst.options]); }
  function teardown(id) { var r = state.rendered[id]; if (r && r.handle && r.handle.cleanup) safe(r.handle.cleanup)(); delete state.rendered[id]; }
  function slotsOnPage() {
    var out = [], els = d.querySelectorAll('[data-squarespell-slot]');
    for (var i = 0; i < els.length && out.length < 20; i++) { var n = String(els[i].getAttribute('data-squarespell-slot') || '').toLowerCase(); if (SLOT.test(n) && out.indexOf(n) === -1) out.push(n); }
    return out;
  }
  var reconcile = safe(function () {
    var m = state.manifest;
    if (!m || !d.body) return;
    var wanted = {};
    if (canonicalHost(w.location.hostname) === m.hostname && !m.paused) {
      var path = canonicalPath(w.location.pathname);
      for (var i = 0; i < m.installations.length; i++) { var x = m.installations[i]; if (matchesPath(path, x.include, x.exclude)) wanted[x.id] = x; }
    }
    for (var id in state.rendered) { if (!wanted[id] || state.rendered[id].sig !== sig(wanted[id])) teardown(id); }
    for (var wid in wanted) {
      if (state.rendered[wid]) {
        // An inline slot that appeared after the first pass (late-rendered Code Block) is filled on a later pass.
        if (wanted[wid].mode === 'inline' && !state.rendered[wid].handle) { var h2 = renderInline(wanted[wid]); if (h2) state.rendered[wid].handle = h2; }
        continue;
      }
      var inst = wanted[wid], handle = null;
      if (inst.mode === 'inline') handle = renderInline(inst);
      else if (inst.mode === 'popup') handle = renderPopup(inst);
      else handle = renderTab(inst);
      state.rendered[wid] = { sig: sig(inst), handle: handle };
    }
    if (slotsSig() !== lastSlots) beat(true);
  });
  var lastSlots = '';
  function slotsSig() { return slotsOnPage().join(','); }

  // ---- network ----
  function fetchJson(url) {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var t = setTimeout(function () { if (ctrl) ctrl.abort(); }, 6000);
    return fetch(url, { credentials: 'omit', signal: ctrl ? ctrl.signal : undefined }).then(function (r) { clearTimeout(t); if (!r.ok) throw new Error('http ' + r.status); return r.json(); }, function (e) { clearTimeout(t); throw e; });
  }
  var lastFetch = 0;
  function refresh() {
    lastFetch = Date.now();
    return fetchJson(API + '/api/public/connect/manifest?site=' + encodeURIComponent(KEY)).then(function (m) {
      var ok = validManifest(m);
      if (!ok) return;            // invalid: keep the previous manifest
      state.manifest = ok;
      reconcile();
    }).catch(function () { /* offline or server error: keep the previous manifest */ });
  }
  var lastBeat = 0;
  function beat(force) {
    var now = Date.now();
    if (!force && now - lastBeat < 60000) return;
    if (now - lastBeat < 5000) return;
    lastBeat = now;
    lastSlots = slotsSig();
    try {
      // Privacy: only the loader version, the public page path (no query, no fragment) and slot names. No visitor data, no cookies.
      fetch(API + '/api/public/connect/heartbeat?site=' + encodeURIComponent(KEY), {
        method: 'POST', mode: 'cors', credentials: 'omit', keepalive: true, headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify({ version: VERSION, path: canonicalPath(w.location.pathname), slots: slotsOnPage() })
      }).catch(function () { /* ignore */ });
    } catch (e) { /* ignore */ }
  }

  // ---- lifecycle: first load, Squarespace AJAX navigation, late-rendered blocks ----
  var lastPath = '';
  var scanTimer = null;
  var scan = safe(function () {
    var p = canonicalPath(w.location.pathname);
    if (p !== lastPath) { lastPath = p; reconcile(); beat(true); return; }
    reconcile();
  });
  function schedule() { if (scanTimer) clearTimeout(scanTimer); scanTimer = setTimeout(scan, 250); }
  var observer = null, interval = null;
  var start = safe(function () {
    injectStyles();
    attachMessages();
    lastPath = canonicalPath(w.location.pathname);
    refresh().then(function () { beat(true); });
    if (typeof MutationObserver !== 'undefined' && d.body) { observer = new MutationObserver(schedule); observer.observe(d.body, { childList: true, subtree: true }); }
    w.addEventListener('popstate', schedule);
    w.addEventListener('hashchange', schedule);
    w.addEventListener('mercury:load', schedule);
    interval = setInterval(safe(function () { if (!d.hidden) refresh(); }), 300000);
    d.addEventListener('visibilitychange', safe(function () { if (!d.hidden && Date.now() - lastFetch > 60000) refresh(); }));
  });
  state.rescan = scan;
  state.destroy = function () {
    if (observer) observer.disconnect();
    if (interval) clearInterval(interval);
    if (scanTimer) clearTimeout(scanTimer);
    for (var id in state.rendered) teardown(id);
    w.removeEventListener('popstate', schedule); w.removeEventListener('hashchange', schedule); w.removeEventListener('mercury:load', schedule);
    try { delete w.__squarespellConnect; } catch (e) { w.__squarespellConnect = undefined; }
  };
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', start); else start();
})();`;

/** Fills in the API origin, the quiz-host origin and the version. Origins are validated as plain https/http origins first. */
export function renderLoader(opts: { api: string; origin: string }): string {
  const clean = (u: string) => {
    const url = new URL(u);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('bad origin');
    return url.origin;
  };
  return LOADER_TEMPLATE.replace('__API__', clean(opts.api)).replace('__ORIGIN__', clean(opts.origin)).replace('__VERSION__', LOADER_VERSION);
}
