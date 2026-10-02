/**
 * The shipped embed script (public/embed/quiz-embed.js), executed in jsdom, and the snippets the dashboard hands out.
 * The dashboard's "Tab" snippet once said data-mode="tab", which the script did not know, so nothing rendered.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { embedSnippetForMode, type EmbedMode } from '../urls';

const SCRIPT = fs.readFileSync(path.resolve(__dirname, '../../public/embed/quiz-embed.js'), 'utf8');

function mount(markup: string) {
  document.body.innerHTML = markup;
  new Function(SCRIPT)();
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ json: async () => ({ latest: '0' }) })));
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  delete (window as any).__squarespell_version_logged;
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('quiz-embed.js modes', () => {
  it('data-mode="slidein" renders the floating tab and its panel', () => {
    mount('<div data-squarespell-quiz="demo" data-mode="slidein" data-button-text="Take our quiz"></div>');
    const tab = document.querySelector('.squarespell-slidein-tab');
    expect(tab?.textContent).toBe('Take our quiz');
    expect(document.querySelector('.squarespell-slidein-panel iframe')?.getAttribute('src')).toContain('/embed/demo?');
  });

  it.each(['tab', 'TAB', 'floating_tab'])('data-mode="%s" (snippets pasted before the fix) is an alias of slidein', (mode) => {
    mount(`<div data-squarespell-quiz="demo" data-mode="${mode}" data-button-text="Take our quiz"></div>`);
    expect(document.querySelector('.squarespell-slidein-tab')).not.toBeNull();
    expect(document.querySelector('.squarespell-wrapper')).toBeNull();
  });

  it('the tab opens and closes the panel', () => {
    mount('<div data-squarespell-quiz="demo" data-mode="tab"></div>');
    const panel = document.querySelector('.squarespell-slidein-panel')!;
    (document.querySelector('.squarespell-slidein-tab') as HTMLButtonElement).click();
    expect(panel.classList.contains('active')).toBe(true);
    (document.querySelector('.squarespell-slidein-close') as HTMLButtonElement).click();
    expect(panel.classList.contains('active')).toBe(false);
  });

  it('an unknown mode falls back to inline instead of rendering nothing', () => {
    mount('<div data-squarespell-quiz="demo" data-mode="sidebar"></div>');
    expect(document.querySelector('.squarespell-wrapper iframe')).not.toBeNull();
  });

  it('popup and inline still work', () => {
    mount('<div data-squarespell-quiz="a" data-mode="popup"></div><div data-squarespell-quiz="b"></div>');
    expect(document.querySelector('.squarespell-popup-iframe')).not.toBeNull();
    expect(document.querySelector('#squarespell-embed-b .squarespell-wrapper, .squarespell-wrapper#squarespell-embed-b')).not.toBeNull();
  });
});

describe('dashboard embed snippets agree with the script', () => {
  it('the Tab snippet uses data-mode="slidein"', () => {
    expect(embedSnippetForMode('demo', 'tab')).toContain('data-mode="slidein"');
    expect(embedSnippetForMode('demo', 'tab')).not.toContain('data-mode="tab"');
  });

  it.each<[EmbedMode, string]>([
    ['inline', '.squarespell-wrapper iframe'],
    ['popup', '.squarespell-popup-iframe'],
    ['tab', '.squarespell-slidein-tab'],
  ])('the %s snippet, pasted as-is, renders the matching widget', (mode, selector) => {
    const snippet = embedSnippetForMode('demo', mode);
    // Paste the markup without the <script> tag (jsdom does not load external scripts); the script runs from source.
    mount(snippet.replace(/<script[\s\S]*<\/script>/, ''));
    expect(document.querySelector(selector)).not.toBeNull();
  });
});
