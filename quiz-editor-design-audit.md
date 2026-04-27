# Squarespell Quiz Editor — Design Audit & Rebuild Spec

**Date:** April 27, 2026
**Scope:** Full design critique, component system audit, UX flow analysis, developer handoff spec, and UX copy improvements
**Target Quality:** Typeform / Webflow / Notion-tier editor experience
**Brand:** Unchanged — Inter font, Untitled UI gray scale, #0D7377 teal accent

---

## 1. UI Breakdown by Section

### 1.1 Top Bar (DashboardShell topbar)

**Current Implementation:**
- Height: 56px (topbar from DashboardShell)
- Left: ← Back arrow + "Editing: [Quiz Title]"
- Right: Publish button (8px 20px padding, radius 8, #0D7377)
- Save indicator: "Saved" with checkmark lives in the design mockup but is NOT implemented in the current QuizEditorView — only a `publishError` toast exists

**Issues Found:**

| # | Issue | Severity | File:Line |
|---|-------|----------|-----------|
| T1 | No save status indicator — user has no feedback that auto-save fired or succeeded | 🔴 Critical | QuizEditorView.tsx:348-370 |
| T2 | No Preview button in the top bar — Preview toggle is buried inside the canvas toolbar | 🟡 Moderate | QuizBlockEditor.tsx:2078-2098 |
| T3 | Publish button has no loading state ring/spinner — just text change "Publishing..." | 🟢 Minor | QuizEditorView.tsx:386-396 |
| T4 | Quiz title in top bar is not editable inline — contradicts the design mockup showing editable title | 🟡 Moderate | QuizEditorView.tsx:379 |
| T5 | No undo/redo in top bar — they are embedded in the canvas toolbar row instead | 🟢 Minor | QuizBlockEditor.tsx:2099-2137 |
| T6 | The three-dot menu (⋮) shown in the mockup does not exist — no access to duplicate quiz, export, or settings from here | 🟡 Moderate | N/A — missing entirely |

**Recommendations:**
- Add `SaveIndicator` component: cycle between "Saving…" (pulse anim), "Saved ✓" (fade in), "Save failed" (red)
- Move Preview + Publish to top bar right section. Add three-dot dropdown: Duplicate quiz, Export responses, Quiz settings, Delete quiz
- Make quiz title inline-editable with a pencil icon on hover

### 1.2 Canvas (Left Zone — block list)

**Current Implementation:**
- CSS Grid: `gridTemplateColumns: '1fr 380px'` (QuizBlockEditor.tsx:2053)
- Height: `calc(100vh - 60px)` minus the DashboardShell topbar
- Padding: 24px 32px
- Scroll: `overflowY: auto` with thin scrollbar
- Contains: toolbar row → block cards → inserters between each → empty state → keyboard shortcuts bar

**Issues Found:**

| # | Issue | Severity | File:Line |
|---|-------|----------|-----------|
| C1 | Canvas has no max-width constraint — on ultrawide monitors, block cards stretch to 1200px+ making them hard to read | 🔴 Critical | QuizBlockEditor.tsx:2060-2063 |
| C2 | AddBlockInserter is visually ambiguous — tiny 20px circle with a + that looks like decoration, not a clickable action | 🟡 Moderate | QuizBlockEditor.tsx:155-212 |
| C3 | Empty state copy "Click the + button above to add your first block" is vague — which + button? There's also a Cmd+N shortcut | 🟢 Minor | QuizBlockEditor.tsx:2183-2194 |
| C4 | Keyboard shortcut bar is always visible at bottom — wastes space for users who don't use shortcuts. Should be a tooltip or dismissable | 🟢 Minor | QuizBlockEditor.tsx:2198+ |
| C5 | Block cards show `Q{index}` numbering but `index` is the array position, not the question-only counter — when content blocks are interspersed, numbering jumps (Q1, Q3, Q5) | 🟡 Moderate | QuizBlockEditor.tsx:2152-2158 |
| C6 | Drag-and-drop uses `borderTopWidth: 3` as the only drop indicator — no gap animation, no placeholder card shown at drop target | 🟡 Moderate | QuizBlockEditor.tsx:285-286 |
| C7 | No visible "Add Question" primary CTA — the mockup shows a prominent "+" Add Question button at bottom of sidebar. Current implementation only has tiny inserter circles | 🟡 Moderate | Design mockup vs. implementation |

**Recommendations:**
- Add `maxWidth: 720px` and `margin: '0 auto'` to the canvas scroll container
- Redesign inserter: on hover between cards, show a full-width dashed line with a centered pill "Add block" that expands to the palette
- Fix question numbering: use dedicated `questionCounter` that only increments for question-type blocks (partially done at line 2046 but the BlockCard receives `index` which is the array index for non-questions)
- Add animated drop placeholder: when dragging, show a 4px teal bar with slide-in animation at the drop position

### 1.3 Inspector / Right Panel (Property Sidebar)

**Current Implementation:**
- Fixed width: 380px (inline in grid)
- Background: `#F9FAFB` (GRAY_50)
- Border-left: 1px solid `#EAECF0`
- Padding: 20px
- Scroll: `overflowY: auto`
- Contains: selected block type label → collapsible SidebarSections → type-specific fields

**Issues Found:**

| # | Issue | Severity | File:Line |
|---|-------|----------|-----------|
| I1 | The mockup shows Content / Logic / Design tabs at the top of the inspector. These tabs DO NOT EXIST in the implementation — everything is flat in one scrollable panel | 🔴 Critical | QuizBlockEditor.tsx:950-1178 |
| I2 | When no block is selected, the inspector shows "Select a block to edit" with a generic icon — no help text, no quick-add options, no keyboard shortcut hints | 🟡 Moderate | QuizBlockEditor.tsx:~935-950 |
| I3 | Outcome inspector has DUPLICATE image sections — one as a `SidebarSection title="Result image"` (line 1286) AND another as a raw `<div>` with "Result image" label (line 1303). Both write to `imageUrl`. The second one renders even when the first is open | 🔴 Critical | QuizBlockEditor.tsx:1286-1326 |
| I4 | ToggleGroup component (Single/Multi, Layout buttons) has no hover state styling — feels dead on mouseover | 🟢 Minor | QuizBlockEditor.tsx:~870-900 |
| I5 | Input fields use `Object.assign({}, inputStyle)` spread pattern — inputStyle is defined as a `var` at module scope, creating a mutable shared reference. Each `Object.assign` creates a new object which is fine, but the base `inputStyle` could be accidentally mutated | 🟢 Minor | QuizBlockEditor.tsx:~860 |
| I6 | Branching section shows all options (A, B, C, D) with dropdowns even when branching isn't needed — could be simplified to "Add a branch rule" pattern | 🟡 Moderate | QuizBlockEditor.tsx:1105-1138 |
| I7 | "Required" toggle is missing from the inspector — the mockup shows it, but the block editor doesn't have a `required` field on QuestionBlock | 🟡 Moderate | blocks.ts QuestionBlock interface |

**Recommendations:**
- **P0:** Remove the duplicate image section in outcome inspector (delete lines 1303-1326)
- **P0:** Implement Content/Logic/Design tabs — Content shows question text + options + media; Logic shows branching + scoring; Design shows layout style + visual options
- Add `required` boolean field to QuestionBlock in blocks.ts
- Redesign empty-inspector state: show the 3 most common actions (Add Question, Add Outcome, Quiz Settings)

### 1.4 Mobile Preview (shown in mockups but conditional in code)

**Current Implementation:**
- Live preview is implemented as a toggle inside the canvas toolbar — NOT as a persistent third column
- When active, it renders `LiveQuizPreview` component with a phone-frame aesthetic
- No device-toggle (iPhone/Android) UI exists, despite the mockup showing phone/tablet icons

**Issues Found:**

| # | Issue | Severity |
|---|-------|----------|
| M1 | Preview takes over the entire canvas area when toggled — you can't edit and preview simultaneously (unlike the mockup which shows them side by side) | 🔴 Critical |
| M2 | No device-size toggle — desktop/tablet/mobile frame widths | 🟡 Moderate |
| M3 | Preview doesn't auto-refresh when blocks change — shows stale state until toggled off/on | 🟡 Moderate |
| M4 | No "progress bar" preview shown despite `show_progress_bar` being a quiz setting | 🟢 Minor |

**Recommendations:**
- Implement persistent split-view: Canvas (60%) + Preview (40%) when preview is active, with the inspector as an overlay/drawer
- Add device toggle: 375px (mobile), 768px (tablet), 100% (desktop)
- Auto-refresh preview on every block state change (debounced 300ms)

---

## 2. UX Problems & Fixes

### 2.1 Critical UX Flow: Building a Quiz Step-by-Step

**Current User Journey:**
1. User lands on `/dashboard/editor` or `/dashboard/[quizId]`
2. QuizEditorView loads — shows "Loading editor..." while fetching
3. If no quizzes exist → EditorEmpty with "No quiz to edit yet" + CTA to `/tools/quiz-funnel/build`
4. If quiz exists → QuizBlockEditor renders with blocks from `settings.editor_blocks` or legacy conversion
5. User clicks a block card → inspector sidebar populates
6. User edits fields in inspector → 800ms debounce → auto-save PATCH
7. To add blocks → click tiny + inserter between cards
8. To reorder → drag handle on each card
9. To publish → click Publish in top bar → PublishModal with share URL

**Friction Points Identified:**

| Step | Friction | Impact | Fix |
|------|----------|--------|-----|
| 3 | Empty state sends user AWAY from the editor to a completely different page (`/tools/quiz-funnel/build`). User loses context | High | Add inline quiz creation: "Name your quiz" input + "Start from scratch" or "Use template" right inside the editor |
| 5 | First click on a block feels like nothing happened if the user doesn't notice the right panel updating. No visual breadcrumb connecting the card to the inspector | Medium | Add a connecting line/highlight animation. Flash the inspector panel border teal on selection change |
| 7 | Inserter circles are 20px and nearly invisible. Users don't discover them | High | Redesign as a full-width hover zone between cards that reveals "Add block" on hover |
| 9 | After publish, PublishModal shows the slug/URL but no way to copy the embed code, view analytics, or continue editing | Medium | Add tabs to PublishModal: Share Link, Embed Code, QR Code |

### 2.2 Missing States Inventory

| State | Component | Currently Exists? | What's Needed |
|-------|-----------|-------------------|---------------|
| Loading (editor) | QuizEditorView | ✅ Basic text "Loading editor..." | Add skeleton cards with shimmer animation |
| Loading (save) | QuizEditorView | ❌ No indicator | Add "Saving..." → "Saved ✓" indicator in top bar |
| Error (load) | QuizEditorView | ✅ Error card with Back button | Good — no change needed |
| Error (save) | QuizEditorView | ⚠️ Only console.error | Add toast notification: "Changes couldn't be saved. Retrying..." with manual retry button |
| Empty (no blocks) | QuizBlockEditor | ✅ Dashed outline with "Click +" | Improve copy and add prominent CTA (see UX Copy section) |
| Empty (inspector) | BlockInspector | ⚠️ Generic "Select a block" | Add contextual actions and help |
| Success (publish) | PublishModal | ✅ Modal with share URL | Add embed code tab and confetti/celebration moment |
| Drag preview | BlockCard | ⚠️ Only border-top thickens | Add ghost card + insertion line animation |

### 2.3 Responsiveness Gaps

The editor CSS module (`editor.module.css`) has a single `@media (max-width: 768px)` breakpoint, but the QuizBlockEditor itself has NO responsive logic — the 2-column grid (`1fr 380px`) never changes.

**On screens below 1024px:**
- The inspector eats 380px, leaving only ~620px for the canvas
- Block cards become cramped, text truncates awkwardly
- Inserter circles overlap card borders

**Recommendations:**
- Below 1024px: Convert inspector to a bottom drawer (like Figma's mobile inspector)
- Below 768px: Full-screen inspector as a modal sheet, canvas goes full-width
- Add `min-width: 640px` to canvas to prevent extreme compression

---

## 3. Component System Design

### 3.1 Design Tokens (from dashboardColors.ts)

**Currently Well-Defined:**
- Gray scale: 11 stops from GRAY_25 (#FCFCFD) to GRAY_900 (#101828) ✅
- Brand accent: 7 stops from BRAND_25 to BRAND_700 ✅
- Semantic colors: SUCCESS, WARNING, DANGER with light variants ✅
- Shadows: 4 levels (XS, SM, MD, LG) following Untitled UI ✅
- Focus ring: consistent #0D7377 at 15% opacity ✅

**Missing Tokens:**

| Token Category | What's Missing | Where It's Hardcoded |
|----------------|----------------|----------------------|
| Block type colors | Outcome green `#4cd964`, Logic purple `#af52de`, Lead gate orange `#ff9500` | QuizBlockEditor.tsx:68-75 `blockColor()` |
| Border radius | Used inconsistently: 6, 7, 8, 10, 12, 14, 16, 20px | Throughout all components |
| Spacing scale | No spacing tokens — all padding/margins are arbitrary pixel values | Every component |
| Animation | No duration/easing tokens — `0.12s`, `0.15s`, `0.2s` used inconsistently | Throughout |
| Z-index | No layering system — values like 60, 9999 scattered | Toasts, modals, dropdowns |

**Recommended Token Additions:**

```typescript
// Add to dashboardColors.ts
// Block type semantic colors
BLOCK_QUESTION: '#0D7377',
BLOCK_OUTCOME: '#16A34A',      // replace #4cd964
BLOCK_LEAD_GATE: '#F79009',    // replace #ff9500
BLOCK_LOGIC: '#7F56D9',        // replace #af52de
BLOCK_CONTENT: '#667085',

// Border radius scale
RADIUS_SM: 6,    // small controls, badges
RADIUS_MD: 8,    // buttons, inputs
RADIUS_LG: 12,   // cards
RADIUS_XL: 16,   // modals, large cards

// Spacing scale (4px base)
SPACE_1: 4,
SPACE_2: 8,
SPACE_3: 12,
SPACE_4: 16,
SPACE_5: 20,
SPACE_6: 24,
SPACE_8: 32,
SPACE_10: 40,
SPACE_12: 48,

// Animation
DURATION_FAST: '0.12s',
DURATION_NORMAL: '0.2s',
DURATION_SLOW: '0.3s',
EASING_DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',

// Z-index scale
Z_DROPDOWN: 10,
Z_STICKY: 20,
Z_OVERLAY: 30,
Z_MODAL: 40,
Z_TOAST: 50,
```

### 3.2 Reusable Components Inventory

| Component | Exists? | Reusable? | Issues |
|-----------|---------|-----------|--------|
| `SidebarSection` | ✅ | ✅ Good | Clean collapsible with icon + title + chevron |
| `InspectorField` | ✅ | ✅ Good | Label + children wrapper |
| `ToggleGroup` | ✅ | ⚠️ Inline | No hover states, no disabled state, no size variants |
| `MediaPicker` | ✅ | ⚠️ Tightly coupled | File upload + stock search + URL input — good but only works inside inspector |
| `BlockCard` | ✅ | ❌ Monolithic | 260-line function with all block types' rendering inline. Should be split per type |
| `AddBlockInserter` | ✅ | ⚠️ Inline | Not extractable — tightly tied to block palette |
| `LiveQuizPreview` | ✅ | ⚠️ Inline | 200+ lines inside QuizBlockEditor, not a separate file |
| Input/Select styles | ⚠️ Module vars | ❌ Not components | `inputStyle` and `selectStyle` are plain objects, not React components |
| `ShareButtons` | ✅ | ✅ | Small, self-contained |
| `VideoEmbed` | ✅ | ✅ | YouTube/Vimeo parser, clean |

**Recommended Component Extraction:**

```
components/editor/
├── EditorTopbar.tsx          — save status, preview toggle, undo/redo, publish
├── Canvas.tsx                — scrollable block list with inserters
│   ├── BlockCard/
│   │   ├── QuestionCard.tsx  — question-specific rendering
│   │   ├── OutcomeCard.tsx   — outcome-specific rendering
│   │   ├── LeadGateCard.tsx  — lead gate rendering
│   │   └── ContentCard.tsx   — heading, text, image, divider
│   └── BlockInserter.tsx     — the + button between blocks
├── Inspector/
│   ├── InspectorShell.tsx    — tabs (Content/Logic/Design) + empty state
│   ├── QuestionInspector.tsx — all question fields
│   ├── OutcomeInspector.tsx  — outcome fields (with ONE image section)
│   ├── LeadGateInspector.tsx — lead gate fields
│   └── ContentInspector.tsx  — heading/text/image/divider fields
├── Preview/
│   ├── PreviewFrame.tsx      — device frame with size toggle
│   └── LivePreview.tsx       — real-time quiz rendering
└── shared/
    ├── ToggleGroup.tsx       — with hover, disabled, sizes
    ├── InspectorField.tsx    — label + content wrapper
    ├── SidebarSection.tsx    — collapsible section
    ├── MediaPicker.tsx       — upload/browse/URL input
    └── SaveIndicator.tsx     — saving/saved/error states
```

### 3.3 Inconsistent Patterns Detected

| Pattern | Instances | Standard to Adopt |
|---------|-----------|-------------------|
| Border radius on cards | 10, 12, 14, 16, 20px used | 12px (`RADIUS_LG`) for all cards |
| Input padding | `8px 12px`, `6px 8px`, `8px 10px`, `10px 14px` | `8px 12px` for all standard inputs |
| Font sizes in inspector | 11, 12, 13, 14px mixed | 13px for labels, 14px for values |
| Section title styling | Some use `SidebarSection`, some use raw `<div>` with manual styling (line 1303 outcome image) | Always use `SidebarSection` |
| Button padding | `7px 10px`, `8px 14px`, `8px 12px`, `10px 18px` | SM: `6px 12px`, MD: `8px 16px`, LG: `10px 20px` |
| Color opacity suffixes | `'#0D737730'`, `'rgba(13,115,119,0.08)'`, `C.ACCENT + '12'` — three different patterns for transparent accent | Use consistent `rgba()` format |

---

## 4. Interaction Behavior Map

### 4.1 Block Selection

| Action | Current Behavior | Expected Behavior |
|--------|-----------------|-------------------|
| Click block card | Sets `selectedId`, inspector updates | ✅ Working — add brief highlight animation |
| Click another card | Instantly switches selection | ✅ Working |
| Click canvas background | Does NOT deselect | Should deselect (set `selectedId = null`) |
| Press Escape | Deselects block | ✅ Working |
| Click inspector field | Focuses field | ✅ Working |

### 4.2 Block Editing (Inspector)

| Control | Interaction | Persists? | Notes |
|---------|-------------|-----------|-------|
| Selection type (Single/Multi) | ToggleGroup click → `updateField('questionType', v)` | ✅ Yes | |
| Layout (Buttons/Cards/List/Image) | ToggleGroup click → `updateField('questionStyle', v)` | ✅ Yes | Verified via Chrome DevTools |
| Add option | Button click → appends to options array | ✅ Yes | Max 8 options enforced |
| Remove option | Button click → slices last option | ✅ Yes | Min 2 options enforced |
| Score editing | Number input per option | ✅ Yes | |
| Media upload | File input → base64 → POST /api/media/upload → URL | ✅ Yes | |
| Branching rules | Select per option → branch rule array | ✅ Yes | |
| Time limit | Number input | ✅ Yes | |
| Answer explanations | Text input per option | ✅ Yes | |
| Outcome title/description | Text/textarea | ✅ Yes | |
| Outcome CTA | Text + URL inputs | ✅ Yes | |
| Outcome score range | Min/max number inputs | ✅ Yes | |
| Social sharing toggle | Checkbox | ✅ Yes | |
| Lead gate fields | Type select + label input + required checkbox | ✅ Yes | |

### 4.3 Block Management

| Action | Trigger | Current Behavior | Issues |
|--------|---------|-----------------|--------|
| Add block | Click inserter → select type | Creates default block, selects it | Inserter is hard to discover |
| Delete block | Click trash icon on card OR Backspace/Delete key | Removes block, deselects | No confirmation dialog for destructive action |
| Duplicate | Click copy icon OR Cmd+D | Deep clones with new IDs | ✅ Working well |
| Reorder | Drag handle | HTML5 drag, borderTop indicator | Needs better visual feedback |
| Undo | Cmd+Z or button | Pops history stack | ✅ Working, 50-entry limit |
| Redo | Cmd+Shift+Z or button | Pushes history stack | ✅ Working |

### 4.4 State Transitions

```
[No Quiz] → Loading → [Empty: "No quiz to edit"]
                     → [Error: "We couldn't load this quiz"]
                     → [Ready: Editor renders]

[Editing] → Change field → [Debounce 800ms] → PATCH /api/quizzes/:id
                                              → [Success: silent]
                                              → [Failure: console.error only ⚠️]

[Publish] → Click → [Publishing... text] → POST /api/quizzes/:id/publish
                                          → [Success: PublishModal opens]
                                          → [Failure: Red toast, top-right corner]
```

**Missing transitions:**
- No "unsaved changes" warning on navigation away
- No "reconnecting" state if the network drops mid-edit
- No optimistic update — the 800ms debounce means rapid changes queue up

---

## 5. Final Improved Architecture (Rebuild Plan)

### Phase 1: Critical Fixes (1-2 days)

1. **Remove duplicate outcome image section** — Delete lines 1303-1326 in QuizBlockEditor.tsx
2. **Add save status indicator** — Build `SaveIndicator` component in top bar: "Saving..." → "Saved ✓" → "Save failed ⚠️"
3. **Fix canvas max-width** — Add `maxWidth: 720px, margin: '0 auto'` to canvas scroll container
4. **Fix question numbering** — Ensure BlockCard always receives the question-only counter, not array index
5. **Add unsaved changes warning** — `beforeunload` event listener when blocks differ from last saved state

### Phase 2: Inspector Tabs & Cleanup (2-3 days)

6. **Implement Content / Logic / Design tabs** in inspector:
   - Content: Question text, options, media, required toggle
   - Logic: Branching rules, scoring
   - Design: Layout style (buttons/cards/list/image), shuffle toggle, transition type
7. **Add `required` field** to QuestionBlock type and inspector
8. **Extract components** — Move BlockCard, Inspector panels, and LiveQuizPreview to separate files
9. **Standardize border radius** — Replace all card radius with `RADIUS_LG` (12px)

### Phase 3: UX Polish (3-4 days)

10. **Redesign block inserter** — Full-width hover zone with "Add block" pill
11. **Add delete confirmation** — "Delete this block? This can't be undone." dialog
12. **Build persistent split-view preview** — Canvas (60%) | Preview (40%) when active
13. **Add device toggle** to preview — Mobile (375px), Tablet (768px), Desktop (100%)
14. **Improve drag-and-drop** — Ghost card placeholder + insertion line animation
15. **Add click-outside deselection** on canvas background

### Phase 4: Design System Hardening (2 days)

16. **Add missing tokens** — Block type colors, radius scale, spacing scale, animation tokens
17. **Standardize all inline styles** — Migrate hardcoded hex values to token references
18. **Extract shared components** — ToggleGroup, MediaPicker, SaveIndicator as standalone
19. **Add hover/active/disabled states** to ToggleGroup, buttons, and interactive elements

### Phase 5: Responsive (1-2 days)

20. **Below 1024px:** Inspector becomes bottom drawer (48vh height, drag to resize)
21. **Below 768px:** Full-screen inspector modal sheet, canvas full-width
22. **Add min-width guard** on canvas container

---

## 6. Developer Handoff Spec

### 6.1 Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ TOP BAR (h: 56px, sticky)                                   │
│ ┌──────┬───────────────┬──────────────────────────────────┐  │
│ │ ← ​   │ Quiz Title ✎  │  Saving...  Preview  [Publish]  │  │
│ └──────┴───────────────┴──────────────────────────────────┘  │
├────────────────────────────────────┬────────────────────────┤
│ CANVAS (flex: 1, scroll-y)        │ INSPECTOR (w: 380px)   │
│ max-width: 720px, margin: 0 auto  │ bg: GRAY_50            │
│                                    │ border-left: BORDER    │
│ ┌──────── toolbar ───────────┐    │ ┌─ tabs ─────────────┐ │
│ │ 12 blocks · 10 questions   │    │ │ Content │ Logic │ … │ │
│ │              Preview ⟲ ⟳  │    │ ├─────────────────────┤ │
│ └────────────────────────────┘    │ │                     │ │
│                                    │ │ [Inspector fields]  │ │
│ ┌─── BlockCard (selected) ───┐    │ │                     │ │
│ │ ⠿ [Q1] Question text...    │    │ │                     │ │
│ │   A. Option 1   +2pts      │    │ │                     │ │
│ │   B. Option 2   +1pt       │    │ │                     │ │
│ └────────────────────────────┘    │ │                     │ │
│     ─ ─ ─ ─ [+] ─ ─ ─ ─        │ │                     │ │
│ ┌─── BlockCard ──────────────┐    │ │                     │ │
│ │ ⠿ [Q2] Another question... │    │ │                     │ │
│ └────────────────────────────┘    │ │                     │ │
│                                    │ └─────────────────────┘ │
│ ┌─ keyboard hints (fade) ────┐    │                          │
│ │ ⌘Z Undo  ⌘D Dup  ⌫ Del   │    │                          │
│ └────────────────────────────┘    │                          │
├────────────────────────────────────┴────────────────────────┤
```

### 6.2 Design Tokens Reference

| Token | Value | Usage |
|-------|-------|-------|
| `FONT` | `'Inter', -apple-system, ...` | All text |
| `ACCENT` | `#0D7377` | CTAs, selected states, links |
| `ACCENT_LIGHT` | `#F0FAFB` | Selected card bg, hover tints |
| `ACCENT_HOVER` | `#0B6165` | Button hover state |
| `BG` | `#FFFFFF` | Page background |
| `SURFACE` | `#FFFFFF` | Card backgrounds |
| `GRAY_50` | `#F9FAFB` | Inspector bg, toolbar bg |
| `BORDER` | `#EAECF0` | All borders |
| `TEXT` | `#101828` | Primary text |
| `TEXT_SECONDARY` | `#344054` | Secondary text |
| `TEXT_MUTED` | `#475467` | Labels, descriptions |
| `TEXT_SUBTLE` | `#667085` | Hints, disabled text |
| `SHADOW_XS` | `0px 1px 2px rgba(16,24,40,0.05)` | Default card shadow |
| `SHADOW_SM` | `0px 1px 3px rgba(16,24,40,0.1), ...` | Hover card shadow |
| `FOCUS_RING` | `0px 0px 0px 4px rgba(13,115,119,0.15)` | Focus outline |

### 6.3 Component States

#### BlockCard

| State | Border | Background | Shadow | Badge |
|-------|--------|------------|--------|-------|
| Default | `1px BORDER` | `SURFACE` | `SHADOW_XS` | Type color @ 12% |
| Hover | `1px BORDER` | `SURFACE` | `SHADOW_SM` | Type color @ 12% |
| Selected | `1px ACCENT` | `rgba(13,115,119,0.03)` | `SHADOW_SM` + focus ring | `ACCENT` bg, white text |
| Dragging | `1px ACCENT` | `ACCENT_LIGHT` | `SHADOW_MD` | `ACCENT` bg |
| Drop target | `3px top ACCENT` | `SURFACE` | `SHADOW_XS` | unchanged |
| Drag over | Show 4px teal insertion line | — | — | — |

#### Inspector Input

| State | Border | Background |
|-------|--------|------------|
| Default | `1px BORDER` | `SURFACE` |
| Hover | `1px GRAY_300` | `SURFACE` |
| Focus | `1px ACCENT` + `FOCUS_RING` | `SURFACE` |
| Error | `1px ERROR_500` + red ring | `DANGER_LIGHT` |
| Disabled | `1px BORDER_LIGHT` | `GRAY_50` |

#### Publish Button

| State | Background | Text | Cursor |
|-------|------------|------|--------|
| Default | `ACCENT` | `#FFFFFF`, bold | pointer |
| Hover | `ACCENT_HOVER` | `#FFFFFF` | pointer |
| Publishing | `ACCENT` @ 70% | "Publishing..." | wait |
| Disabled | `ACCENT` @ 50% | `#FFFFFF` | not-allowed |

### 6.4 Responsive Breakpoints

| Breakpoint | Layout Change |
|------------|---------------|
| ≥1280px | Canvas (flex 1, max 720px centered) + Inspector (380px fixed) |
| 1024–1279px | Canvas (flex 1, max 600px) + Inspector (340px) |
| 768–1023px | Canvas full width + Inspector as bottom drawer (48vh, draggable) |
| <768px | Canvas full width + Inspector as modal sheet (full screen slide-up) |

### 6.5 Animation Specs

| Element | Property | Duration | Easing | Trigger |
|---------|----------|----------|--------|---------|
| Block selection border | border-color, box-shadow | 150ms | ease | Click |
| Inspector panel switch | opacity, transform(Y) | 200ms | ease-out | Tab click |
| Inserter reveal | opacity, height | 150ms | ease | Hover between cards |
| Drag placeholder | height, opacity | 200ms | ease | Drag over position |
| Save indicator | opacity | 300ms | ease-in-out | Save state change |
| Delete block | height, opacity, margin | 250ms | ease-in | Delete action |
| Toast notification | transform(Y), opacity | 300ms | cubic-bezier(0.4,0,0.2,1) | Error/success |

---

## 7. UX Copy Improvements

### 7.1 Empty States

| Location | Current Copy | Improved Copy |
|----------|-------------|---------------|
| No quiz (EditorEmpty) | "No quiz to edit yet. Start by generating a quiz from any site URL." | "Start building your quiz. Create from scratch or pick a template to get started in seconds." |
| No blocks (canvas) | "Click the + button above to add your first block" | "Your quiz is empty. Add your first question to get started." + [Add question] primary button |
| No block selected (inspector) | "Select a block to edit its properties" | "Select any block to customize it, or add a new one to get started." + three quick-add buttons (Question, Outcome, Lead Gate) |
| No branching rules | (implicit — shows all dropdowns set to "Next question") | Add helper text: "Branching lets you skip questions or jump to results based on answers. Leave as 'Next question' for linear flow." |

### 7.2 Button Labels

| Location | Current Label | Improved Label | Reason |
|----------|--------------|----------------|--------|
| Inserter palette | "Question", "Heading", "Text", etc. | "Question", "Section Title", "Description", etc. | "Heading" and "Text" are developer terms; users think in content terms |
| Block actions | (icon-only trash, copy) | Add tooltip: "Delete block" / "Duplicate block" | Icons without labels are ambiguous |
| Add option button | "+ Add option" | "+ Add answer" | Users think "answer" not "option" |
| Remove option button | "Remove" | "Remove last answer" | Clarify what gets removed |
| Lead gate add field | "+ Add field" | "+ Add form field" | More specific |
| Publish button (publishing) | "Publishing..." | "Going live..." | More human, matches the "Live" status badge |

### 7.3 Microcopy Improvements

| Location | Current | Improved |
|----------|---------|----------|
| Time limit placeholder | "0 = no limit" | "Leave empty for no time limit" |
| Answer explanation placeholder | "Explanation after answer..." | "Why this answer is right (shown after selection)" |
| Outcome CTA placeholder | "Learn more" | "Button text, e.g. 'View recommendations'" |
| Outcome CTA URL placeholder | "https://..." | "Where should the button link to?" |
| Share text placeholder | "I got [result]! Take the quiz..." | "Pre-filled share text. Use [result] for the outcome name." |
| Image URL placeholder | "Paste image URL..." | "Paste an image URL or drag a file to upload" |
| Score range (min/max) | No helper text | "This outcome shows when the total score falls in this range" |

### 7.4 Error Messages

| Error | Current | Improved |
|-------|---------|----------|
| Auto-save failure | `console.error('[block-editor] Auto-save failed:', err)` (invisible to user) | Toast: "Your changes couldn't be saved. We'll keep trying — or click to retry." |
| Publish failure | Red toast with raw error message | "We couldn't publish your quiz. Check your connection and try again." + Retry button |
| Quiz load failure | "We couldn't load this quiz" + raw error | "This quiz couldn't be loaded. It may have been deleted or you might not have permission." + Back button |

---

## 8. Accessibility Gaps

| Issue | Severity | Location | Fix |
|-------|----------|----------|-----|
| Drag handles have no keyboard alternative | 🔴 Critical | BlockCard drag | Alt+Arrow already works — add ARIA label "Press Alt+Up or Alt+Down to reorder" |
| ToggleGroup buttons have no `aria-pressed` state | 🟡 Moderate | Inspector | Add `aria-pressed={isActive}` to each toggle button |
| Color contrast: GRAY_400 (#98A2B3) on white = 2.7:1 | 🟡 Moderate | Some labels | Use GRAY_500 (#667085) minimum for text (4.6:1 ratio) |
| SidebarSection collapse/expand has no `aria-expanded` | 🟡 Moderate | Inspector | Add `aria-expanded` + `aria-controls` to section headers |
| Block delete has no confirmation — destructive without undo awareness | 🟡 Moderate | Block actions | Add confirmation OR prominent "Undo" toast after deletion |
| Form inputs missing `id` + `<label htmlFor>` connection | 🟡 Moderate | All inspector inputs | `InspectorField` should generate `id` and pass `htmlFor` to `<label>` |
| Focus trap missing in inserter dropdown | 🟢 Minor | AddBlockInserter | Trap focus within palette when open, return focus on close |

---

## Summary: Priority Matrix

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| P0 | Remove duplicate outcome image section | 5 min | Prevents data confusion |
| P0 | Add save status indicator in top bar | 2 hr | Users need to know saves work |
| P0 | Fix canvas max-width (720px) | 15 min | Readability on wide screens |
| P1 | Implement Content/Logic/Design inspector tabs | 4 hr | Matches design mockup, reduces scrolling |
| P1 | Redesign block inserter (full-width hover) | 3 hr | Discoverability is currently terrible |
| P1 | Add delete confirmation dialog | 1 hr | Prevent accidental data loss |
| P1 | Add unsaved changes warning | 1 hr | Prevent navigation data loss |
| P2 | Persistent split-view preview | 6 hr | Side-by-side editing |
| P2 | Extract components into separate files | 4 hr | Maintainability |
| P2 | Standardize all tokens | 3 hr | Design consistency |
| P2 | Responsive inspector (drawer/sheet) | 4 hr | Tablet/mobile usability |
| P3 | Improved drag-and-drop visuals | 3 hr | Polish |
| P3 | UX copy improvements | 2 hr | Clarity |
| P3 | Accessibility fixes | 3 hr | Compliance |

**Total estimated effort: ~40 hours for full rebuild to Typeform-tier quality.**
