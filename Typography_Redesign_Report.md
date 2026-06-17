# Squarespell Typography & Brand Font Redesign — Report

## 1. Font Selection

**Primary font: Inter** (variable weights 400/500/600/700/800), self-hosted via `next/font/google`.

**Why Inter:**
- It's the de facto typeface of the premium SaaS tier this product is competing in — Linear, Vercel, GitHub, Mixpanel, and Notion's app shell all run on it. Choosing it puts Squarespell's UI in the same visual register as the products it's being benchmarked against (Notion, Linear, Stripe, Figma).
- Designed specifically for UI/screen use: tall x-height, open apertures, and tight hinting keep it legible at small sizes (12–14px labels, inputs, nav) where the previous font (Poppins, a geometric/rounded display face) gets mushy.
- Poppins is geometric and rounded — it reads as friendly/consumer (good for a kids' app or a newsletter) but works against "trustworthy, premium, conversion-focused," which is what a B2B quiz-funnel SaaS dashboard needs.
- It was already half-adopted in the codebase: the quiz-rendering engine (`quiz/[slug]/page.tsx`, `embed/[slug]/layout.tsx`) already preloads Inter as a customer-selectable brand font alongside DM Sans. Standardizing on it eliminates a redundant font load rather than adding one.
- Single-family system: one font, varying weight/size, satisfies "avoid mixing too many font families" while still producing real hierarchy.

**Alternatives considered and rejected:**
- *Geist* (Vercel's font) — excellent, but tied tightly to Vercel's own brand identity; less neutral for a third-party product.
- *Söhne / system fonts* (Stripe's actual font) — Söhne is a paid commercial license, not viable without a licensing budget.
- *DM Sans* — already used as a secondary customer-brand option; kept in that role rather than promoted to platform default, since Inter has better hinting at very small UI sizes.
- *Poppins (kept, just re-themed)* — rejected outright per the brief; its rounded geometric letterforms are the primary source of the "unprofessional" complaint.

**Where this does NOT apply:** quiz owners can still set a fully custom font per quiz/site via the Brand Kit (`font_family` field) and white-label settings — that customer-facing customization path is untouched. Only the *default* (when no custom font is set) changed, from Poppins to Inter.

## 2. Typography Scale (defined in `frontend/app/globals.css`)

| Style | Size | Line-height | Weight | Letter-spacing |
|---|---|---|---|---|
| H1 | 2.5rem (40px) → 1.875rem (30px) mobile | 1.12 | 700 | -0.02em |
| H2 | 1.875rem (30px) → 1.5rem (24px) mobile | 1.18 | 700 | -0.015em |
| H3 | 1.375rem (22px) → 1.1875rem (19px) mobile | 1.25 | 600 | -0.01em |
| H4 | 1.125rem (18px) → 1.0625rem (17px) mobile | 1.3 | 600 | -0.005em |
| Body | 1rem (16px) | 1.55 | 400 | — |
| Body small | 0.875rem (14px) | 1.5 | 400 | — |
| Caption / helper | 0.75rem (12px) | 1.45 | 500 | — |
| Button | 0.9375rem (15px) | 1 | 600 | -0.005em |
| Input | 0.9375rem (15px) | 1.4 | 400 | — |
| Nav | 0.875rem (14px) | 1.2 | 500 | — |
| Error text | 0.8125rem (13px) | 1.4 | 500 | — |

All values are exposed as CSS variables (`--fs-h1`, `--lh-h1`, `--fw-h1`, etc.) plus matching utility classes (`.text-h1`...`.text-error`) so any component can opt in without re-declaring magic numbers. Headings (`h1`–`h4`) get the scale automatically with no class needed. Sizes drop at the 640px breakpoint for mobile.

## 3. Before vs After

**Before:**
- Platform font was Poppins, loaded via a render-blocking `@import` in `globals.css` *and* a duplicate `<link>` tag in the root layout — two separate requests for the same font family.
- No shared typography scale; every page hand-rolled its own heading/body pixel sizes.
- The literal font-family declaration `'Poppins', system-ui, sans-serif` (in ~20 slightly different quoting/spacing variants) was hardcoded inline across 45 files — any future font change would have meant repeating this edit 45 times, which is exactly how this kind of inconsistency creeps in.

**After:**
- Single self-hosted Inter load via `next/font/google` in the root layout — no external Google Fonts request, automatic font-display optimization, no FOUT/layout-shift penalty.
- A real typographic scale (sizes, line-heights, weights, letter-spacing, responsive step-down) lives in one place (`globals.css`) instead of being implicit.
- Every former Poppins reference across the codebase now points to Inter consistently — dashboard, marketing pages, auth flows, quiz/embed default rendering, and the quiz-funnel builder tool all read the same font.
- Conversion-relevant surfaces (lead-capture inputs, CTA buttons, quiz questions) benefit most: Inter's higher legibility at 13–15px reduces misreads on the exact UI elements that drive signups and quiz completions.

## 4. Implementation Details

**Files updated:** 45 total.
- `frontend/app/layout.tsx` — added `next/font/google` Inter loader (`--font-inter` CSS variable), removed the old Google Fonts `<link>` tags.
- `frontend/app/globals.css` — removed the Poppins `@import`; added the `--font`/`--font-body` variables (now pointing at `--font-inter`), the full typography scale variables, heading element defaults, and `.text-*` utility classes.
- 43 other files (dashboard pages/components, marketing pages, auth pages, the quiz/embed renderer defaults, and the quiz-funnel builder) — literal `Poppins` font-family references renamed to `Inter`, structure otherwise unchanged.

**Performance optimizations:**
- Eliminated one of two duplicate Google Fonts requests (was: `@import` in CSS + `<link>` in `<head>`).
- Switched from Google's CDN-hosted CSS to `next/font`'s self-hosted, build-time font subsetting — fonts are served from the app's own origin with automatic `font-display: swap` and no external DNS/connection overhead on first paint.

## 5. Consistency Audit

- Repo-wide search for the literal string `Poppins` across `.tsx`/`.ts`/`.css` (excluding `node_modules`) returns zero matches.
- `tsc --noEmit` is clean — no type errors introduced.
- Diff is scoped exactly to font-family declarations and the two files that define the typography system; no unrelated logic touched.
- Customer-facing brand customization (Brand Kit font field, white-label settings, per-quiz `font_family` override) is verified intact and unaffected — those paths still let quiz owners set any font they want; only the unset-default changed.
- Pixel-level spacing/sizing harmonization on individual page layouts (beyond the font swap + new shared scale) was out of scope for this pass — the scale and utility classes are now in place for pages to adopt incrementally.

**Commits:** `4972baf` (44 files), `252b8c6` (`lib/toast.tsx`, missed in the first pass and caught during verification). Both pushed to `main`.
