/**
 * Every quiz template must be a complete, working quiz: every question has helper text and a visual, every answer
 * on an image question has its own photo, photos are never reused, videos are self-hosted files that exist, the
 * lead gate is in place, outcomes cover every possible score, and each result page carries the extras its
 * template switches on. Each template is also played through the real quiz renderer, question by question, to the
 * lead gate and every result page.
 */

import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import QuizRenderer from '../../../components/quiz-taker/QuizRenderer';
import { QUIZ_TEMPLATE_CATALOG, getTemplateSettings } from '../templates';
import { blocksToLegacy, legacyToBlocks } from '../blocks';

afterEach(cleanup);

var PUBLIC_DIR = path.join(__dirname, '..', '..', '..', 'public');

function allImageUrls(blocks: any[]): string[] {
  var urls: string[] = [];
  blocks.forEach(function (b) {
    if (b.type === 'question') {
      if (b.mediaUrl && b.mediaType !== 'video') urls.push(b.mediaUrl);
      b.options.forEach(function (o: any) { if (o.imageUrl) urls.push(o.imageUrl); });
    }
    if (b.type === 'outcome') {
      if (b.imageUrl) urls.push(b.imageUrl);
      (b.products || []).forEach(function (p: any) { if (p.imageUrl) urls.push(p.imageUrl); });
    }
  });
  return urls;
}

function photoId(url: string): string {
  var m = url.match(/photo-[\w-]+/);
  return m ? m[0] : url;
}

var noop = function () {};

function renderStage(quiz: any, stage: 'question' | 'leadgate' | 'result', qIdx: number, outcome: any) {
  return render(
    <QuizRenderer
      quiz={quiz} slug="template-test" stage={stage} isMobile={false}
      qIdx={qIdx} answers={{}} outcome={outcome} totalScore={0} timeRemaining={null}
      hoverOpt={null} setHoverOpt={noop} transitioning={false} transDir="forward"
      pickOption={noop} goBack={noop}
      firstName="" setFirstName={noop} email="" setEmail={noop} consentGiven={false} setConsentGiven={noop}
      submitting={false} submitLead={noop} leadError=""
      resultEmail="" setResultEmail={noop} resultEmailSending={false} resultEmailSent={false} resultEmailError="" onSendResultEmail={noop}
      linkCopied={false} onCopyLink={noop} couponCopied={false} onCopyCoupon={noop}
      countdown={0} onCancelCountdown={noop} pdfGenerating={false} onDownloadPdf={noop} shareUrl=""
      isProPlan={true}
    />,
  );
}

describe('quiz template catalog', function () {
  it('ships 16 templates with unique ids', function () {
    expect(QUIZ_TEMPLATE_CATALOG).toHaveLength(16);
    var ids = QUIZ_TEMPLATE_CATALOG.map(function (t) { return t.id; });
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('never reuses a photo, inside a template or across templates', function () {
    var seen: Record<string, string> = {};
    QUIZ_TEMPLATE_CATALOG.forEach(function (t) {
      allImageUrls(t.blocks()).forEach(function (u) {
        var id = photoId(u);
        expect(seen[id], t.id + ' reuses ' + id + ' (already in ' + seen[id] + ')').toBeUndefined();
        seen[id] = t.id;
      });
    });
  });
});

describe.each(QUIZ_TEMPLATE_CATALOG.map(function (t) { return [t.id, t] as const; }))('template %s', function (_id, t) {
  var blocks: any[] = t.blocks();
  var questions = blocks.filter(function (b) { return b.type === 'question'; });
  var outcomes = blocks.filter(function (b) { return b.type === 'outcome'; });
  var gates = blocks.filter(function (b) { return b.type === 'leadGate'; });
  var settings = getTemplateSettings(t.id);

  it('has 7 complete questions, each with helper text and a visual', function () {
    expect(questions).toHaveLength(7);
    questions.forEach(function (q, i) {
      var where = t.id + ' Q' + (i + 1);
      expect(q.text.trim(), where).not.toBe('');
      expect((q.subtitle || '').trim(), where + ' helper text').not.toBe('');
      expect(q.options.length, where).toBeGreaterThanOrEqual(3);
      q.options.forEach(function (o: any) {
        expect(o.text.trim(), where).not.toBe('');
        expect(typeof o.score, where).toBe('number');
      });
      if (q.questionStyle === 'imageChoice') {
        q.options.forEach(function (o: any) { expect(o.imageUrl, where + ' option ' + o.text).toMatch(/^https:\/\/images\.unsplash\.com\/photo-/); });
      } else {
        expect(q.mediaUrl, where + ' header photo').toMatch(/^https:\/\/images\.unsplash\.com\/photo-/);
      }
      if (q.mediaType === 'video') {
        expect(q.mediaUrl, where + ' video').toMatch(/^\/template-media\/[\w-]+\.mp4$/);
        var file = path.join(PUBLIC_DIR, q.mediaUrl);
        expect(fs.existsSync(file), where + ' video file ' + q.mediaUrl).toBe(true);
        expect(fs.statSync(file).size, where + ' video file size').toBeGreaterThan(50000);
      }
    });
  });

  it('collects the lead before the result', function () {
    expect(gates).toHaveLength(1);
    expect(gates[0].placement).toBe('before_results');
    expect(gates[0].headline.trim()).not.toBe('');
    expect(gates[0].buttonLabel.trim()).not.toBe('');
    var email = gates[0].fields.find(function (f: any) { return f.type === 'email'; });
    expect(email && email.required).toBe(true);
  });

  it('has outcomes that cover every possible score exactly once', function () {
    expect(outcomes).toHaveLength(3);
    var min = questions.reduce(function (s, q) { return s + Math.min.apply(null, q.options.map(function (o: any) { return o.score; })); }, 0);
    var max = questions.reduce(function (s, q) { return s + Math.max.apply(null, q.options.map(function (o: any) { return o.score; })); }, 0);
    for (var total = min; total <= max; total++) {
      var hits = outcomes.filter(function (o) { return total >= o.minScore && total <= o.maxScore; });
      expect(hits.length, t.id + ' score ' + total).toBe(1);
    }
  });

  it('gives every result a photo, tips, a call to action and the extras its settings switch on', function () {
    outcomes.forEach(function (o) {
      var where = t.id + ' / ' + o.title;
      expect(o.description.length, where).toBeGreaterThan(80);
      expect(o.imageUrl, where).toMatch(/^https:\/\/images\.unsplash\.com\/photo-/);
      expect(o.tips.length, where).toBeGreaterThanOrEqual(3);
      expect(o.ctaText && o.ctaUrl, where).toBeTruthy();
      if (settings.show_products) expect((o.products || []).length, where + ' products').toBeGreaterThan(0);
      if (settings.show_coupon) expect(o.couponCode, where + ' coupon').toBeTruthy();
      if (settings.show_booking) expect(o.bookingUrl, where + ' booking').toBeTruthy();
      if (settings.show_before_after) expect(o.beforeText && o.afterText, where + ' before/after').toBeTruthy();
      (o.products || []).forEach(function (p: any) { expect(p.title && p.price && p.url && p.imageUrl, where + ' product').toBeTruthy(); });
    });
  });

  it('keeps every field through the save format and back', function () {
    var legacy = blocksToLegacy(blocks);
    var back: any[] = legacyToBlocks(legacy);
    var strip = function (bs: any[]) { return JSON.parse(JSON.stringify(bs.map(function (b) { var c = Object.assign({}, b); delete c.id; delete c.required; delete c.afterQuestionIndex; if (c.fields) c.fields = c.fields.map(function (f: any) { var g = Object.assign({}, f); delete g.id; return g; }); if (c.options) c.options = c.options.map(function (o: any) { var p = Object.assign({}, o); delete p.id; return p; }); return c; }))); };
    expect(strip(back)).toEqual(strip(blocks));
  });

  it('plays through the quiz renderer: every question, the lead gate and every result', function () {
    var legacy = blocksToLegacy(blocks);
    var quiz = { title: t.name, questions: legacy.questions, outcomes: legacy.outcomes, leadGate: legacy.leadGate, settings: Object.assign({}, settings) };

    legacy.questions.forEach(function (q: any, i: number) {
      var view = renderStage(quiz, 'question', i, null);
      var text = view.container.textContent || '';
      expect(text, t.id + ' Q' + (i + 1)).toContain(q.text);
      expect(text, t.id + ' Q' + (i + 1) + ' helper').toContain(q.subtitle);
      q.options.forEach(function (o: any) { expect(text, t.id + ' Q' + (i + 1)).toContain(o.text); });
      var html = view.container.innerHTML;
      if (q.mediaUrl) expect(html, t.id + ' Q' + (i + 1) + ' media').toContain(q.mediaUrl.replace(/&/g, '&amp;'));
      q.options.forEach(function (o: any) { if (o.imageUrl) expect(html, t.id + ' Q' + (i + 1) + ' ' + o.text).toContain(o.imageUrl.replace(/&/g, '&amp;')); });
      cleanup();
    });

    var gate = renderStage(quiz, 'leadgate', 0, null);
    expect(gate.container.textContent).toContain(legacy.leadGate.headline);
    cleanup();

    legacy.outcomes.forEach(function (o: any) {
      var view = renderStage(quiz, 'result', legacy.questions.length - 1, o);
      var text = view.container.textContent || '';
      expect(text, t.id + ' result').toContain(o.title);
      o.tips.forEach(function (tip: string) { expect(text, t.id + ' / ' + o.title + ' tip').toContain(tip); });
      if (settings.show_coupon) expect(text, t.id + ' / ' + o.title + ' coupon').toContain(o.couponCode);
      if (settings.show_products) o.products.forEach(function (p: any) { expect(text, t.id + ' / ' + o.title + ' product').toContain(p.title); });
      if (settings.show_booking) expect(view.container.innerHTML, t.id + ' / ' + o.title + ' booking').toContain(o.bookingUrl);
      if (settings.show_before_after) { expect(text).toContain(o.beforeText); expect(text).toContain(o.afterText); }
      cleanup();
    });
  });
});
