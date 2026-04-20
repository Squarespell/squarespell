# Squarespell Quiz Template System — Build Plan

## Squarespace User Segments → Template Mapping

Based on real Squarespace user data (forum posts, Reddit, competitor research):

### Tier 1: Highest demand (biggest Squarespace user segments)

| Segment | Template Name | Quiz Goal | Key Questions |
|---------|--------------|-----------|---------------|
| Photographers | "Which Session Is Right for You?" | Service matcher | Style preference, occasion, budget, group size, indoor/outdoor |
| Wedding vendors (planners, florists, venues) | "What's Your Wedding Style?" | Style finder + lead capture | Vibe, season, palette, formality, budget range |
| Hair stylists / salons | "Find Your Perfect Hair Treatment" | Product/service recommender | Hair type, concerns, routine commitment, past treatments, goals |
| Coaches & course creators | "How Ready Are You to Scale?" | Assessment + lead gen | Revenue stage, team size, systems in place, bottleneck, time available |
| Restaurants & cafes | "Build Your Perfect Meal" | Engagement + upsell | Dietary needs, flavor preference, appetite, occasion, adventurousness |
| Yoga / meditation / therapists | "What's Your Stress Profile?" | Need diagnosis + booking | Stress symptoms, sleep quality, physical tension, time available, experience level |
| Interior designers | "Discover Your Design Style" | Style finder + consultation booking | Room function, color preference, clutter tolerance, lifestyle, budget |
| Candle / artisan / handmade shops | "Find Your Signature Scent" | Product recommender | Season preference, mood, strength, ingredient preference, occasion |

### Tier 2: High value (growing Squarespace segments)

| Segment | Template Name | Quiz Goal | Key Questions |
|---------|--------------|-----------|---------------|
| Real estate agents | "What's Your Ideal Neighborhood?" | Lead qualifier | Budget, commute, family size, amenities, lifestyle priorities |
| Musicians / DJs | "What's Your Event Vibe?" | Service matcher | Event type, crowd size, genre preference, energy level, must-have songs |

## Implementation Sequence

```
STEP 1: Add 8 new template factory functions to templates.ts
         (photographer, wedding, hair, coach, restaurant, yoga, interior, candle)

STEP 2: Register all 8 in QUIZ_TEMPLATE_CATALOG with proper metadata

STEP 3: Build /templates/[id]/preview route (public, no auth)
         - Reuse TryFlowInner component for quiz taking
         - Add "Use this template" CTA at end → sign-up flow

STEP 4: Add template showcase section to /tools/quiz-funnel landing page
         - Tab UI: "Generate from site" | "Browse templates"
         - Template cards grid with category filter
         - Each card links to /templates/[id]/preview

STEP 5: Add quick-start row to /dashboard overview
         - 4 most popular templates as small cards
         - "Browse all templates" link → opens NewQuizModal on templates tab

STEP 6: TypeScript check + push + verify
```

## File Changes Required

1. `frontend/lib/quiz/templates.ts` — 8 new factory functions + catalog entries
2. `frontend/app/templates/[id]/preview/page.tsx` — NEW: public preview page
3. `frontend/app/tools/quiz-funnel/page.tsx` — Add template showcase section
4. `frontend/app/dashboard/page.tsx` — Add quick-start template cards
5. `frontend/app/dashboard/quizzes/_components/quizTemplates.ts` — Add new IDs to QuizTemplateId type

## Template Design Rules

- 5-6 questions per template (research shows 5-7 is optimal for completion)
- Mix of questionStyle: 'cards' and 'buttons' (visual variety keeps engagement)
- Score range 0-20, three outcomes minimum (low/mid/high)
- Lead gate always before results
- CTA URLs use relative paths (/services/x, /shop/x) — user replaces with their own
- Language must be realistic and specific to the niche (not generic marketing talk)
- Every outcome has shareEnabled: true with niche-appropriate share text
