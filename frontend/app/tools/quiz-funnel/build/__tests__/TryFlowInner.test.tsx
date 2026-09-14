/**
 * Regression tests for the Stage 1 -> Stage 2 -> Stage 3 "build a quiz"
 * flow in TryFlowInner.tsx.
 *
 * Covers bugs found in a production audit:
 *
 * 1. buildQuiz() (POST /api/preview-build-quiz, the "Building your quiz..."
 *    step) had no request timeout, and on any failure it set an error
 *    message but never left the `s2SubStep === 'building'` screen — which is
 *    gated purely on that flag, so the spinner ran forever and the error was
 *    never shown. goAnalyze() (the equivalent Stage 1 -> 2 call) already had
 *    the correct AbortController + recovery pattern; buildQuiz() now mirrors
 *    it.
 *
 * 2. Clicking "Start from a template" when no catalog template matched the
 *    scraped business type (`matchedTemplates` empty) selected a placeholder
 *    id ('tpl') that doesn't exist in the catalog. `handleCreateFromTemplate`
 *    silently returned (`if (!tpl) return;`) and the "Use this template"
 *    button was left disabled with no explanation — a dead end.
 *
 * 3. Fixing (2) by falling back to the full catalog uncovered a follow-on bug:
 *    the "Start from a template" card's onClick auto-selected
 *    `matchedTemplates[0]` the instant it was clicked, with no picker shown —
 *    so a no-match business silently got the catalog's first, unrelated
 *    template (e.g. a wedding-photography quiz) with zero indication nothing
 *    actually matched. The fix replaces the auto-select with a real,
 *    individually-clickable template picker that never proceeds without an
 *    explicit choice, whether templates were matched or the catalog fell
 *    back to showing everything.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

/* ------------------------------------------------------------------ */
/* Mocks for everything outside the flow under test                    */
/* ------------------------------------------------------------------ */

const pushMock = vi.fn();
let searchParamsValue: Record<string, string> = {};

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => ({
    get: (key: string) => searchParamsValue[key] ?? null,
  }),
}));

const createQuizMock = vi.fn();
vi.mock('@/lib/api', () => ({
  api: {
    createQuiz: (...args: any[]) => createQuizMock(...args),
  },
}));

// The full dashboard block editor and the visitor-facing quiz renderer pull
// in a lot of unrelated UI (Clerk, drag-and-drop, etc.) that has nothing to
// do with this flow's error handling — stub both to a minimal marker so we
// can assert Stage 3 was reached with real data, without rendering them.
vi.mock('@/app/dashboard/_components/QuizBlockEditor', () => ({
  QuizBlockEditor: (props: any) => (
    <div
      data-testid="quiz-block-editor"
      data-block-count={props.blocks?.length ?? 0}
      // Expose each question block's text so tests can prove *which* template's
      // content actually reached the editor, not just that some template did.
      data-block-texts={JSON.stringify((props.blocks || []).map((b: any) => b.text).filter(Boolean))}
    />
  ),
}));
vi.mock('@/components/quiz-taker/QuizRenderer', () => ({
  __esModule: true,
  default: () => <div data-testid="quiz-renderer" />,
}));

import { PREVIEW_REQUEST_TIMEOUT_MS, TryFlowInner } from '../TryFlowInner';

/* ------------------------------------------------------------------ */
/* Fetch mock helpers                                                   */
/* ------------------------------------------------------------------ */

const ANALYZE_URL = '/api/preview-analyze';
const BUILD_URL = '/api/preview-build-quiz';

function jsonResponse(status: number, body: any) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

const ANALYZE_OK_BODY = {
  session_token: 'session-123',
  brand: {
    site_name: 'Test Bakery',
    business: { type: 'bakery', audience: 'local families', tone: 'warm' },
    colors: {},
  },
};

/** Drives the component from mount through the "brand" substep to "choose". */
async function renderAndReachChoose() {
  render(<TryFlowInner mode="preview" />);
  const continueBtn = await screen.findByText('Continue', {}, { timeout: 3000 });
  await act(async () => {
    fireEvent.click(continueBtn);
  });
  await screen.findByText('Generate my quiz');
}

beforeEach(() => {
  searchParamsValue = { url: 'example.com' };
  pushMock.mockReset();
  createQuizMock.mockReset();
  // Anonymous visitor by default: the authed save path always fails, so the
  // flow falls through to the anonymous preview editor (Stage 3).
  createQuizMock.mockRejectedValue(new Error('not authenticated'));
  // jsdom does not implement these; the success path calls them.
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  Element.prototype.scrollIntoView = vi.fn();
  window.scrollTo = vi.fn() as any;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete (global as any).fetch;
});

/* ------------------------------------------------------------------ */
/* 1. Success                                                          */
/* ------------------------------------------------------------------ */
describe('buildQuiz() success', () => {
  it('reaches Stage 3 with the returned quiz', async () => {
    const buildBody = {
      quiz: {
        title: 'Which pastry are you?',
        description: 'A bakery quiz',
        questions: [{ id: 'q1', text: 'Pick one', options: [{ id: 'o1', text: 'Croissant' }] }],
        outcomes: [{ id: 'out1', title: 'Croissant', description: 'Flaky.' }],
      },
    };
    global.fetch = vi.fn(async (url: string) => {
      if (url.includes(ANALYZE_URL)) return jsonResponse(200, ANALYZE_OK_BODY) as any;
      if (url.includes(BUILD_URL)) return jsonResponse(200, buildBody) as any;
      throw new Error(`Unexpected fetch to ${url}`);
    }) as any;

    await renderAndReachChoose();

    await act(async () => {
      fireEvent.click(screen.getByText('Generate my quiz'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('quiz-block-editor')).toBeTruthy();
    });

    // Reached the anonymous Stage-3 editor (not the logged-in redirect) with
    // the quiz actually returned by the API.
    expect(pushMock).not.toHaveBeenCalled();
    const editor = screen.getByTestId('quiz-block-editor');
    expect(Number(editor.getAttribute('data-block-count'))).toBeGreaterThan(0);
    const stored = JSON.parse(localStorage.getItem('squarespell_preview') || '{}');
    expect(stored.quiz.title).toBe('Which pastry are you?');

    // Stage 3 (the editor) is the active stage. Note: this funnel keeps
    // every stage's markup mounted at all times and toggles an "active"
    // class for the CSS-driven transition, so presence in the DOM alone
    // isn't a useful signal here — the active class is.
    expect(document.getElementById('stage-3')?.className).toContain('active');
  });
});

/* ------------------------------------------------------------------ */
/* 2. Server failure                                                   */
/* ------------------------------------------------------------------ */
describe('buildQuiz() server failure', () => {
  it('shows a visible error and returns to the choose step instead of hanging', async () => {
    global.fetch = vi.fn(async (url: string) => {
      if (url.includes(ANALYZE_URL)) return jsonResponse(200, ANALYZE_OK_BODY) as any;
      if (url.includes(BUILD_URL)) return jsonResponse(500, { error: 'Quiz build failed (500)' }) as any;
      throw new Error(`Unexpected fetch to ${url}`);
    }) as any;

    await renderAndReachChoose();

    await act(async () => {
      fireEvent.click(screen.getByText('Generate my quiz'));
    });

    // Must NOT be stuck on the infinite "Building your quiz" spinner.
    await waitFor(() => {
      expect(screen.queryByText('Building your quiz')).toBeNull();
    });

    // The error is visible (this funnel renders the same errorMsg state in
    // more than one always-mounted place, hence getAllByText) and there's a
    // working retry path back on the choose screen.
    await waitFor(() => {
      expect(screen.getAllByText('Quiz build failed (500)').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('Generate my quiz')).toBeTruthy();
    expect(screen.getAllByText('Try again').length).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ */
/* 3. Timeout                                                          */
/* ------------------------------------------------------------------ */
describe('buildQuiz() timeout', () => {
  it('aborts a hung request and returns to the choose step with a retry path', async () => {
    global.fetch = vi.fn((url: string, opts: any) => {
      if (url.includes(ANALYZE_URL)) return Promise.resolve(jsonResponse(200, ANALYZE_OK_BODY)) as any;
      if (url.includes(BUILD_URL)) {
        // Never resolves on its own — only reacts to the AbortController.
        return new Promise((_resolve, reject) => {
          opts?.signal?.addEventListener('abort', () => {
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        });
      }
      return Promise.reject(new Error(`Unexpected fetch to ${url}`));
    }) as any;

    await renderAndReachChoose();

    // Fake timers must be active *before* the click so the AbortController's
    // setTimeout(..., PREVIEW_REQUEST_TIMEOUT_MS) inside buildQuiz() is
    // itself scheduled on the fake clock — otherwise advancing fake time
    // later has no effect on it.
    vi.useFakeTimers();
    await act(async () => {
      fireEvent.click(screen.getByText('Generate my quiz'));
    });

    // Confirm it's actually hanging on the building screen before the
    // timeout fires.
    expect(screen.getByText('Building your quiz')).toBeTruthy();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(PREVIEW_REQUEST_TIMEOUT_MS + 1000);
    });
    vi.useRealTimers();

    await waitFor(() => {
      expect(screen.queryByText('Building your quiz')).toBeNull();
    });
    await waitFor(() => {
      expect(screen.getAllByText(/took too long/i).length).toBeGreaterThan(0);
    });
    expect(screen.getByText('Generate my quiz')).toBeTruthy();
  });
});

/* ------------------------------------------------------------------ */
/* 4. No matching template                                             */
/* ------------------------------------------------------------------ */
describe('template pick with no matched templates', () => {
  it('shows a real picker with no auto-selection, and only proceeds once the user explicitly picks one', async () => {
    const noMatchBody = {
      session_token: 'session-456',
      brand: {
        site_name: 'Totally Unrecognizable Business',
        // A business type with no keyword overlap with any catalog template
        // -> matchTemplatesToBusiness() returns [] -> full-catalog fallback.
        business: { type: 'zzz_no_such_category_zzz', audience: '', tone: '' },
        colors: {},
      },
    };
    global.fetch = vi.fn(async (url: string) => {
      if (url.includes(ANALYZE_URL)) return jsonResponse(200, noMatchBody) as any;
      throw new Error(`Unexpected fetch to ${url}`);
    }) as any;

    render(<TryFlowInner mode="preview" />);
    const continueBtn = await screen.findByText('Continue', {}, { timeout: 3000 });
    await act(async () => {
      fireEvent.click(continueBtn);
    });
    await screen.findByText('Start from a template');

    await act(async () => {
      fireEvent.click(screen.getByText('Start from a template'));
    });

    // Clicking the "Start from a template" path card must NOT silently pick
    // a template on its own — nothing is selected yet, so "Use this template"
    // stays disabled and no "selected" pill is shown.
    const useTemplateBtn = () => screen.getByText('Use this template').closest('button')!;
    expect(useTemplateBtn().hasAttribute('disabled')).toBe(true);
    expect(document.querySelector('.s2-tpl-selected-info')).toBeNull();

    // Instead, real, individually-clickable, distinct choices are shown, and
    // the copy makes clear nothing was actually matched/recommended.
    await screen.findByText(/no template matched your site/i);
    const photoOption = screen.getByText('Photography Style Quiz');
    const menuOption = screen.getByText('Menu Recommendation Quiz');
    expect(photoOption).toBeTruthy();
    expect(menuOption).toBeTruthy();

    // Explicitly pick a template (not the catalog's first entry) from the
    // picker — this is the only thing that should ever set the selection.
    await act(async () => {
      fireEvent.click(menuOption.closest('.s2-tpl-picker-item')!);
    });

    expect(useTemplateBtn().hasAttribute('disabled')).toBe(false);
    await waitFor(() => {
      const infoNode = document.querySelector('.s2-tpl-selected-info');
      expect(infoNode?.textContent).toContain('Menu Recommendation Quiz');
    });

    await act(async () => {
      fireEvent.click(useTemplateBtn());
    });

    // Clicking through actually creates a quiz (Stage 3), proving the path
    // is real and not a dead end, and it's the template the user picked.
    await waitFor(() => {
      expect(screen.getByTestId('quiz-block-editor')).toBeTruthy();
    });
    const editor = screen.getByTestId('quiz-block-editor');
    const blockTexts: string[] = JSON.parse(editor.getAttribute('data-block-texts') || '[]');
    expect(blockTexts).toContain('What kind of dining experience are you in the mood for?');
    expect(blockTexts).not.toContain('What moment matters most to you on your big day?');
  });
});

/* ------------------------------------------------------------------ */
/* 5. Selecting a non-first template actually opens that template      */
/* ------------------------------------------------------------------ */
describe('template picker selection integrity', () => {
  it('opens the specific template that was clicked, not the catalog\'s first entry', async () => {
    // Same no-match fallback setup as above (full catalog offered), but here
    // we specifically prove the click->selection->editor pipeline is wired
    // per-card and not hardcoded to matchedTemplates[0] / QUIZ_TEMPLATE_CATALOG[0]
    // ("Photography Style Quiz") — the exact failure the PR review flagged:
    // every choice silently opened the first catalog template regardless of
    // which card was clicked.
    const noMatchBody = {
      session_token: 'session-789',
      brand: {
        site_name: 'Another Unrecognizable Business',
        business: { type: 'zzz_no_such_category_zzz', audience: '', tone: '' },
        colors: {},
      },
    };
    global.fetch = vi.fn(async (url: string) => {
      if (url.includes(ANALYZE_URL)) return jsonResponse(200, noMatchBody) as any;
      throw new Error(`Unexpected fetch to ${url}`);
    }) as any;

    render(<TryFlowInner mode="preview" />);
    const continueBtn = await screen.findByText('Continue', {}, { timeout: 3000 });
    await act(async () => {
      fireEvent.click(continueBtn);
    });
    await screen.findByText('Start from a template');
    await act(async () => {
      fireEvent.click(screen.getByText('Start from a template'));
    });

    // Pick the third catalog entry ("Fitness Goal Quiz"), deliberately not
    // index 0 ("Photography Style Quiz").
    const fitnessOption = await screen.findByText('Fitness Goal Quiz');
    await act(async () => {
      fireEvent.click(fitnessOption.closest('.s2-tpl-picker-item')!);
    });

    await waitFor(() => {
      const infoNode = document.querySelector('.s2-tpl-selected-info');
      expect(infoNode?.textContent).toContain('Fitness Goal Quiz');
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Use this template').closest('button')!);
    });

    await waitFor(() => {
      expect(screen.getByTestId('quiz-block-editor')).toBeTruthy();
    });

    // The editor must contain the fitness template's own content, not the
    // first catalog entry's (photography) content.
    const editor = screen.getByTestId('quiz-block-editor');
    const blockTexts: string[] = JSON.parse(editor.getAttribute('data-block-texts') || '[]');
    expect(blockTexts.some((t) => /fitness|workout|goal/i.test(t))).toBe(true);
    expect(blockTexts).not.toContain('What moment matters most to you on your big day?');
  });
});
