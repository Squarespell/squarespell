# SQUARESPELL — Complete System Design Document
### Next-Gen AI Quiz Platform · 2026 Product Architecture

---

## 1. PRODUCT VISION

Squarespell is not a quiz builder. It's an **AI-powered conversion engine** that reads a website, understands the business, and generates a personalized lead-capture experience in under 60 seconds. The user never writes a single question. The AI does.

**Core principle:** The product should feel like an Apple product configurator crossed with YouTube Studio. Every interaction feels inevitable — like there was no other way it could work.

**Competitive moat:** No other quiz tool generates from a URL. No other tool shows the quiz being built in real time. No other tool goes from zero to live-on-your-site in under 2 minutes with zero configuration.

---

## 2. COMPLETE USER FLOW — MICRO-INTERACTION BREAKDOWN

### STEP 1: URL INPUT (`/try`)
**Screen:** Full viewport. Dark. Centered.
**Elements:** Headline + single underline input + pill CTA
**Micro-interactions:**
- Page loads with a 0.6s fade-in, headline first, then input field slides up 0.3s later
- Input has `https://` prefix baked in (not editable, just visual context)
- As user types, the Generate button transitions from muted/disabled → lime/active (0.2s color shift)
- On hover over Generate: subtle scale(1.02) + slight glow
- On submit: the entire screen performs a **zoom-through** transition — content scales up and fades out (0.5s) as the build screen scales in from behind (parallax depth feel)
- **No page navigation.** Everything is a single-page transition.

### STEP 2: AI ANALYSIS + GENERATION (`/try` — build state)
**Screen:** Split layout. Left = live quiz preview assembling. Right = status timeline.
**This is the signature moment of the product.**
**Micro-interactions:**
- Split screen slides in from center outward (left panel from left, right panel from right, 0.4s)
- Right panel shows 5 build steps as a vertical timeline with connection lines
- Each step activates sequentially: icon pulses → text brightens → checkmark appears
- Left panel is **not** a mockup — it's the actual quiz being built piece by piece:
  - 0s: Empty dark canvas
  - 1.5s: Quiz title types out character by character (typewriter, 40ms/char)
  - 3s: Brand colors extracted — two color dots appear + subtle background tint shifts
  - 5s: First question fades in from below
  - 7s: Answer options appear one by one (staggered 0.15s each)
  - 9s: "3 outcomes generated" badge fades in
  - 10s: Status flips to "Ready" — left panel gets a subtle lift (box-shadow increase + 2px upward translate)
- **Transition to preview:** A "Preview your quiz" pill button appears at bottom-center. On click, the build screen **collapses** — left panel expands to full width, right panel slides out right. The quiz is now full-screen and interactive.

### STEP 3: QUIZ PREVIEW (INTERACTIVE — THE FULL EXPERIENCE)
**Screen:** Full viewport quiz, exactly as end-users will see it.
**This is the key differentiator. The user IS the first test participant.**
**Elements:** Progress bar (2px top), question (large centered), options (full-width rows), auto-advance
**Micro-interactions:**
- Progress bar: thin line at viewport top, fills smoothly per question (cubic-bezier ease)
- Question text: fades in from below (translateY 20px → 0, 0.4s)
- Options: stagger in 0.08s apart, each row from slight transparency
- On hover: row gets accent background tint + slight left padding increase (2px, 0.15s) — text color shifts to accent
- On click: selected row highlights (accent bg + checkmark appears right-aligned), all other rows dim to 30% opacity
- 0.5s after selection: current question fades up and out (translateY -20px + opacity 0), next question fades in from below
- Back button: top-left, subtle, appears after Q1. On click, reverse animation (current fades down, previous fades in from above)
- **No "Next" button anywhere.** Selection = advance. This is the core UX innovation.
- Counter: top-right, "2 / 5" with the denominator at 40% opacity

### STEP 4: EMAIL GATE (AFTER FINAL QUESTION)
**Screen:** Full viewport. Centered. Minimal.
**Micro-interactions:**
- Score ring appears first — shows "?" inside with accent border, creating curiosity gap
- Headline: "Your results are ready" fades in 0.3s after ring
- Email input: underline-only style, centered, auto-focused
- As user types valid email: CTA button transitions from disabled → active
- On submit: ring "?" morphs into the actual percentage (number counts up)
- "Skip for now" link below — small, underlined, non-aggressive

### STEP 5: RESULTS SCREEN
**Screen:** Full viewport. Score ring + recommendation.
**Micro-interactions:**
- Score ring: SVG stroke-dashoffset animation from 0 → match%, 1.2s with spring curve
- Number inside: counts up from 0 → N, timed to match ring fill
- After ring completes (1.2s): result content fades in from below
  - "BASED ON YOUR ANSWERS" label (uppercase, tiny, muted)
  - Result title (large, 28-40px)
  - Description paragraph
  - Primary CTA pill button
  - "Share result ↗" text link
- Below results (for the Squarespell user, not quiz visitor):
  - Divider line
  - "This is what your visitors will see."
  - "Publish — free" outlined pill button

### STEP 6: PUBLISH GATE → SIGN UP
**Screen:** Centered auth screen.
**Logic:** If user clicks "Publish" and isn't signed in → this screen.
**Elements:** Three auth options stacked vertically.
**Micro-interactions:**
- Screen slides in from right (0.4s)
- "Publish your quiz" headline + "Create a free account to go live." subtext
- Google button (white, Google logo) — full width
- Apple button (black, Apple logo) — full width
- "or" divider
- Email button (outlined) — full width
- Each button: hover scale(1.02), 0.15s
- On successful auth: screen slides out left, dashboard slides in from right
- **Critical copy at bottom:** "Your quiz is saved. It goes live the moment you sign up."

### STEP 7: DASHBOARD (FIRST-TIME VIEW)
**Screen:** Full dashboard layout. Sidebar + main content.
**First-time state:** Quiz is ALREADY live. No onboarding wizard. No "create your first quiz."
**Micro-interactions:**
- Dashboard fades in with the quiz card already populated
- Green "Live" badge pulses once on load
- Embed code section has a "Copy" button that transitions to "Copied ✓" for 2s
- Stats cards (Views, Completions, Leads) show "0" but feel ready, not empty
- Subtle confetti? No. Just a warm background pulse on the quiz card — a single, brief glow.

### STEP 8: EDITOR (ON QUIZ CLICK)
**Screen:** Split view. Left = question editor. Right = live preview.
**This is the power-user screen.**
**Micro-interactions:**
- Quiz card click → dashboard content slides left and compresses into sidebar, editor expands from right
- Left panel: vertical list of question cards, each editable inline
- Right panel: real-time preview of the quiz (what visitors see)
- Editing a question on left → right panel updates instantly (0.15s)
- Drag handle on each question card for reordering (drag-drop with placeholder ghost)
- "Add question" button at bottom → new card slides in with AI-suggested question pre-filled
- AI suggestion chips: appear below empty question fields as tappable pills ("Suggested: [question text]")
- Each question card shows: question text, option count, drag handle, delete (hover-reveal), expand/collapse

### STEP 9: ANALYTICS (DASHBOARD MAIN VIEW — RETURNING USER)
**Screen:** Dashboard with data populated.
**Elements:**
- Top bar: period selector (7d / 30d / 90d / All), date range
- KPI cards row: Views, Completions, Completion Rate, Leads, Conversion Rate
- Chart: Line chart of views + completions over time (dual axis)
- Quiz table: sortable by name, status, views, leads, last edited
- Each quiz row: thumbnail preview, name, status badge, mini-sparkline, quick actions (edit, duplicate, share, pause)

---

## 3. KEY SCREENS — DETAILED BREAKDOWN

### Screen A: The Hook (`/try`)
```
┌────────────────────────────────────────────────┐
│                                                │
│                                                │
│           Turn visitors into leads             │
│                                                │
│      Paste your URL. AI does the rest.         │
│                                                │
│                                                │
│   https://  [________________]  [Generate]     │
│             ─────────────────                  │
│              underline input                   │
│                                                │
│                                                │
│                                                │
└────────────────────────────────────────────────┘
```
- No social proof logos (earned, not faked)
- No navigation bar (distraction-free)
- Single focus: paste URL, hit go

### Screen B: The Build
```
┌──────────────────────┬─────────────────────────┐
│                      │                         │
│  [Quiz title types   │  ✓ Website scanned      │
│   out here...]       │  ✓ Brand extracted       │
│                      │  ● Generating Qs...      │
│  ● ● Brand colors    │  ○ Building outcomes     │
│                      │  ○ Finalizing            │
│  Q: [fading in...]   │                         │
│                      │  ─────────────────       │
│  - Option 1          │  Building for            │
│  - Option 2          │  bloomandbalance.com     │
│  - Option 3          │                         │
│                      │                         │
│  [3 outcomes ready]  │                         │
│                      │                         │
│          [Preview your quiz →]                 │
└──────────────────────┴─────────────────────────┘
```

### Screen C: Quiz Question
```
┌────────────────────────────────────────────────┐
│ ═══════════════════░░░░░░░░░░  ← 2px progress  │
│ ← Back                              2 / 5      │
│                                                │
│                                                │
│        How much time can you                   │
│      realistically commit per day?             │
│                                                │
│                                                │
│  ┌──────────────────────────────────────────┐  │
│  │  5 minutes — I'm being honest            │  │
│  ├──────────────────────────────────────────┤  │
│  │  15–20 minutes in the morning        ✓   │  │  ← selected
│  ├──────────────────────────────────────────┤  │
│  │  30+ minutes, I'm ready to go deep       │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│              Click to continue                 │
│                                                │
└────────────────────────────────────────────────┘
```

### Screen D: Email Gate
```
┌────────────────────────────────────────────────┐
│ ════════════════════════════════  ← full bar    │
│                                                │
│                                                │
│                  ┌───┐                         │
│                  │ ? │  ← ring with ?          │
│                  └───┘                         │
│                                                │
│          Your results are ready                │
│                                                │
│    Enter your email to see your                │
│         recommendation.                        │
│                                                │
│         [your@email.com]                       │
│         ─────────────────                      │
│                                                │
│          [See my results]                      │
│                                                │
│            Skip for now                        │
│                                                │
└────────────────────────────────────────────────┘
```

### Screen E: Results
```
┌────────────────────────────────────────────────┐
│                                                │
│              ╭──────────╮                      │
│              │   92%    │  ← animated ring     │
│              │  match   │                      │
│              ╰──────────╯                      │
│                                                │
│          BASED ON YOUR ANSWERS                 │
│                                                │
│     The Guided Reset Program                   │
│                                                │
│   You know what you want but need              │
│   structure to get there...                    │
│                                                │
│          [Start Your Reset]                    │
│            Share result ↗                      │
│                                                │
│  ────────────────────────────                  │
│  This is what your visitors will see.          │
│         [Publish — free]                       │
│                                                │
└────────────────────────────────────────────────┘
```

---

## 4. DASHBOARD SYSTEM

### Layout Architecture
```
┌──────┬─────────────────────────────────────────┐
│      │  Overview    Quizzes    Leads    Settings│
│  ☰   ├─────────────────────────────────────────┤
│      │                                         │
│ Logo │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │
│      │  │Views│ │Comp.│ │Rate │ │Leads│       │
│ ──── │  │ 2.4k│ │ 890 │ │ 37% │ │ 334 │       │
│      │  └─────┘ └─────┘ └─────┘ └─────┘       │
│ Over │                                         │
│ view │  ┌──────────────────────────────────┐   │
│      │  │  📈 Views & Completions          │   │
│ Quiz │  │  [Line chart - 30 days]          │   │
│ zes  │  │                                  │   │
│      │  └──────────────────────────────────┘   │
│ Lea  │                                         │
│ ds   │  YOUR QUIZZES                           │
│      │  ┌──────────────────────────────────┐   │
│ Set  │  │ ● Wellness Routine    Live  2.4k │   │
│ tin  │  │   5 Qs · 334 leads · edited 2h   │   │
│ gs   │  │   [Edit] [Share] [···]           │   │
│      │  ├──────────────────────────────────┤   │
│      │  │ ○ Product Finder      Draft  --  │   │
│      │  │   3 Qs · 0 leads · edited 1d     │   │
│      │  │   [Edit] [Publish] [···]         │   │
│      │  └──────────────────────────────────┘   │
│      │                                         │
│      │           [+ New Quiz]                  │
└──────┴─────────────────────────────────────────┘
```

### Sidebar Navigation
- **Collapsed by default on smaller screens, expanded on desktop**
- Logo at top
- 4 nav items: Overview, Quizzes, Leads, Settings
- Active state: accent text + left border indicator (2px lime)
- Bottom: user avatar + account menu

### Quiz Cards
Each quiz in the list shows:
- Status indicator (green dot = live, gray circle = draft)
- Quiz name (clickable → opens editor)
- Status badge ("Live" green, "Draft" gray, "Paused" amber)
- Inline stats: views count + mini sparkline (last 7 days)
- Meta: question count, lead count, last edited timestamp
- Quick actions row: Edit, Share/Publish, overflow menu (duplicate, pause, delete)

### KPI Cards
- 4 cards in a row, equal width
- Each: label (uppercase, tiny), value (large number), trend indicator (↑ 12% green or ↓ 5% red), mini sparkline
- Period selector above: "7d · 30d · 90d · All" as text tabs

### Empty States
- **No quizzes:** "Create your first quiz" with URL input inline (same as /try page, embedded)
- **No leads:** "Leads will appear here once visitors complete your quiz"
- **No data:** Charts show dotted lines with "Not enough data yet"

---

## 5. EDITOR EXPERIENCE

### Layout
```
┌──────┬──────────────────────┬──────────────────┐
│      │  EDITOR              │  LIVE PREVIEW     │
│ Back │                      │                   │
│      │  Quiz title          │  ┌─────────────┐  │
│ ──── │  [Edit inline]       │  │             │  │
│      │                      │  │  The quiz   │  │
│ Q1   │  ┌─ Question 1 ────┐│  │  as visitors│  │
│      │  │ ≡ What's your... ││  │  will see   │  │
│ Q2 ● │  │   □ Option A     ││  │  it. Real-  │  │
│      │  │   □ Option B     ││  │  time sync  │  │
│ Q3   │  │   □ Option C     ││  │  with left  │  │
│      │  │   [+ Add option] ││  │  panel.     │  │
│ Q4   │  │   🗑 Delete       ││  │             │  │
│      │  └──────────────────┘│  │             │  │
│ Q5   │                      │  └─────────────┘  │
│      │  ┌─ Question 2 ────┐│                   │
│ ──── │  │ ≡ How much...   ││  Settings         │
│      │  └──────────────────┘│  ☐ Email gate     │
│ Out  │                      │  ☐ Brand colors   │
│ com  │  [+ Add question]    │  ☐ Result style   │
│ es   │  AI: "Suggested Q"   │                   │
│      │                      │                   │
│ Set  │  ── OUTCOMES ──      │  [Save] [Publish] │
│      │  1. The Reset        │                   │
│      │  2. The Starter      │                   │
│      │  3. The Deep Dive    │                   │
└──────┴──────────────────────┴──────────────────┘
```

### Left Panel: Question Editor
- **Question cards** stacked vertically, each collapsible
- Drag handle (≡) for reordering — smooth spring animation on drag
- Click question text to edit inline (contenteditable feel)
- Options listed below each question — click to edit, [+ Add option] at bottom
- Delete: hover-reveal trash icon, click → card collapses with spring animation
- **AI Suggestions:** Below empty questions, tappable pill chips appear: "AI suggests: [question text]"
- At bottom: "+ Add question" button → new card appears with AI pre-filling a suggested question based on website content
- **Outcomes section:** Below questions, collapsible. Each outcome has title + description + CTA URL, all inline-editable.

### Right Panel: Live Preview
- Shows the quiz EXACTLY as visitors will experience it
- Updates in real-time as left panel is edited (0.15s delay for smooth feel)
- Clicking through the preview works — you can test the full flow
- Below preview: Settings panel (toggles for email gate, brand color overrides, result display style)

### Editor Sub-navigation (Left sidebar within editor)
- Back arrow → returns to dashboard
- Question list as numbered items (Q1, Q2, Q3...) — click to scroll left panel to that question
- Active question highlighted with accent indicator
- "Outcomes" section at bottom
- "Settings" at very bottom

### Key Editor Behaviors
- **No save button needed** — auto-saves on every change (debounced 1s)
- **Undo/redo** — Cmd+Z works across all changes
- **AI regenerate:** Right-click any question → "Regenerate with AI" → question text morphs to new suggestion
- **Bulk actions:** Select multiple questions (checkboxes appear on hover) → delete, reorder, regenerate

---

## 6. UI/UX PRINCIPLES

### Design System Tokens
```
Colors:
  --bg-primary:    #07090c     (main background)
  --bg-surface:    #0d1117     (cards, panels)
  --bg-elevated:   #161b22     (hover states, active cards)
  --border:        #1b1f27     (subtle dividers)
  --text-primary:  #f0f2f5     (main text)
  --text-muted:    #8b919a     (secondary text)
  --accent:        #D2FF1D     (primary action color)
  --accent-dim:    rgba(210,255,29,0.08)  (accent tints)
  --success:       #34d399     (live states)
  --warning:       #fbbf24     (paused states)
  --error:         #f87171     (error states)

Typography:
  --font:          'DM Sans', system-ui
  --heading-xl:    56px / 600 / -0.03em   (hero headline)
  --heading-lg:    36px / 600 / -0.02em   (question text)
  --heading-md:    24px / 600 / -0.02em   (section titles)
  --heading-sm:    18px / 600 / -0.01em   (card titles)
  --body:          16px / 400 / 0         (body text)
  --body-sm:       14px / 400 / 0         (secondary text)
  --label:         12px / 500 / 0.06em    (labels, uppercase)
  --caption:       11px / 500 / 0.08em    (meta, uppercase)

Spacing:
  --space-xs:      4px
  --space-sm:      8px
  --space-md:      16px
  --space-lg:      24px
  --space-xl:      32px
  --space-2xl:     48px
  --space-3xl:     64px

Radii:
  --radius-sm:     6px    (small buttons, badges)
  --radius-md:     10px   (cards, inputs)
  --radius-lg:     16px   (large cards, panels)
  --radius-pill:   100px  (pill buttons, badges)

Shadows:
  --shadow-sm:     0 1px 2px rgba(0,0,0,0.3)
  --shadow-md:     0 4px 12px rgba(0,0,0,0.4)
  --shadow-lg:     0 24px 80px rgba(0,0,0,0.5)

Motion:
  --ease-out:      cubic-bezier(0.16, 1, 0.3, 1)   (primary easing)
  --ease-spring:   cubic-bezier(0.34, 1.56, 0.64, 1) (bouncy interactions)
  --duration-fast: 150ms   (hovers, toggles)
  --duration-med:  300ms   (transitions)
  --duration-slow: 500ms   (page transitions)
```

### Principles
1. **Typography is the design.** No icons where text works. Weight, size, and spacing create all hierarchy.
2. **Motion is communication.** Every animation tells the user what happened. Nothing moves for decoration.
3. **One action per screen.** Each screen has exactly one primary thing the user should do. Everything else is secondary.
4. **Dark by default.** Squarespace users build beautiful sites. Our tool should feel like it belongs in their ecosystem.
5. **AI is invisible.** The AI does the work, but the product takes the credit. No "AI generated this" badges. It just works.
6. **Speed is a feature.** Sub-60-second URL-to-live-quiz is the core selling point. Every design decision should make it feel faster.
7. **No empty states that feel empty.** Even zero-data screens should feel ready, not broken.

---

## 7. INNOVATION IDEAS (5 THINGS NO QUIZ TOOL HAS)

### Innovation 1: "The Live Build" — AI Generation Theater
No quiz tool shows the quiz being built. They all show a spinner or progress bar. Squarespell shows the actual quiz assembling in real time: title types out, colors shift, questions appear one by one. This is the moment users screenshot and share. This is the viral hook. Think: watching a 3D printer create your object, or a chef cooking behind glass.

### Innovation 2: "Ghost Analytics" — See How Visitors Move Through Your Quiz
After publishing, the dashboard doesn't just show "50 people completed the quiz." It shows a **flow visualization** — a Sankey diagram showing how visitors moved through each question, which options were most popular, and where people dropped off. You can see: "80% chose Option B on Q3, but 30% dropped off after Q4." This turns a quiz into a **research tool**, not just a lead capture form.

### Innovation 3: "AI Revision Mode" — Conversational Quiz Editing
Instead of manually editing questions, the user types natural language: "Make Q3 more casual" or "Add a question about their budget" or "The outcomes feel too generic, make them more specific to yoga studios." The AI revises the quiz in real time, showing diffs (old text struck through, new text highlighted). Accept or reject each change. It's like having a copywriter inside the editor.

### Innovation 4: "Smart Branching" — Conditional Question Logic Without the Complexity
Most quiz tools offer branching logic through complex flowcharts that nobody uses. Squarespell does it automatically: the AI detects when certain answer combinations should skip questions or lead to different outcomes. The user sees a simple toggle: "Smart branching: ON" — and the AI handles the logic. For power users, a visual flow view shows the paths, but it's auto-generated, not manually built.

### Innovation 5: "Embed Intelligence" — The Quiz Learns From Your Site
After embedding, the quiz doesn't stay static. It reads returning visitor behavior and auto-optimizes: if Q2 has a 40% drop-off rate, the AI suggests a replacement question. If one outcome converts 3x better than others, the AI adjusts scoring weights. Weekly email: "Your quiz generated 47 leads this week. We optimized Q3 — engagement is up 12%." The quiz improves itself. No other tool does this.

---

## END OF SYSTEM DESIGN
