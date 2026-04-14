# Squarespell task backlog

Durable task list. Edit freely. Order within a priority band is rough.

## In flight

- [ ] Incorporate your design ideas into NewQuizModal before pushing
- [ ] Ship NewQuizModal redesign PR (branch ready: `fix/newquiz-modal-redesign-20260414`, script at `_cherry-pick-to-main/ship-newquiz-redesign.sh`)
- [ ] End-to-end smoke test after deploy (login, paste URL, pick goal, generate, land in builder)

## P0 (do next)

- [ ] Clean up dirty working tree (~25 uncommitted mods + pop stash)
- [ ] Diagnose 404 root cause on POST /api/quizzes/from-url (verify in smoke test)
- [ ] Two-stage flow: URL paste, real scrape, show detected Business Type / Audience / Tone / Key Offer with edit buttons, goal picker, generate. Mirrors /tools/quiz-funnel/build polish.

## P1

- [ ] Style packs v1 (preset brand themes for generated quizzes)
- [ ] Auto-suggest quiz ideas in the modal based on scraped site
- [ ] Duplicate / remix quiz from dashboard grid
- [ ] Investigate and ship fix/consolidate-subdomains branch
- [ ] PLG guest-session to draft-claim verification end-to-end
- [ ] Mobile embed audit (test iframe on mobile Safari and Chrome)

## P2

- [ ] Embed iframe loading skeleton
- [ ] Remove-branding toggle (paid plan gate)
- [ ] Premium templates v2 (more archetypes, paid-tier gated)
- [ ] Advanced integrations (Zapier, HubSpot, Klaviyo actions)
- [ ] Empty state polish across dashboard

## P3

- [ ] OG / Twitter meta tags for public quiz pages
- [ ] GDPR consent gating on lead capture
- [ ] WCAG 2.1 AA audit on dashboard and public quiz flow
- [ ] Bulk delete in quizzes grid
- [ ] Outcomes routing visualization in builder
- [ ] Em-dash sweep repo-wide plus CTA copy validator

## P4

- [ ] Analytics v2 (funnel drop-off, question heatmap)
- [ ] A/B testing framework for quizzes
- [ ] ROI attribution reporting

## Done log (recent)

- [x] Vercel build hotfix (PR #21)
- [x] Wire + New quiz buttons to modal (merged)
- [x] Redesign NewQuizModal with SVG icons + goal picker (built, holding for your design input)
- [x] Fix API fallback URL squarespell-backend to squarespell-api + improve 404 surface
- [x] Codify no-emoji / no-em-dash rules in CLAUDE.md

## Project rules (non-negotiable, also in CLAUDE.md)

- No emoji icons. Ever. All icons must be inline SVG.
- No em-dashes. Use colon, period, comma, or " - " (ASCII hyphen).
- Apply both rules to new code and any file you modify.
