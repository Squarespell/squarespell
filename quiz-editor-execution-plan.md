# Quiz Editor Execution Plan

Solutions only. No rehashing problems.

---

## 1. TOP 5 WEAKNESS FIXES

### Fix 1: Per-Option Delete + Reorder

**What changes on screen:**
Each answer option row (in ALL 4 layouts) gets a hover toolbar on the right side with 3 icons: ↑ (move up), ↓ (move down), × (delete).

**Where:** Canvas block cards, inside the answer option rows (lines ~826-891 for list layout, ~782-823 for imageThumbnails, ~694-777 for grid/fullBackground).

**Exact behavior:**
- Hover over any option row → toolbar fades in (opacity 0→1, 150ms)
- Click × → option removed from `qb.options` at that index (not just `.slice(0, -1)`)
- Click ↑ → swap option with previous (no-op if first)
- Click ↓ → swap option with next (no-op if last)
- Minimum 2 options enforced — × disabled (greyed out, `cursor: not-allowed`) when `options.length <= 2`
- Delete commits to history (undoable)

**Implementation — replace the Remove button in BlockInspector (lines ~1489-1506):**
Remove the current "Remove last" button. Instead, each option row on the canvas gets inline controls.

Add this function inside `BlockCard` for question blocks:

```
function optionActions(qb, oi, selected, onChange) {
  if (!selected) return null;
  return div({ display: 'flex', gap: 4, opacity: 0, transition: 'opacity 0.15s' }, 
    className: 'option-actions',
    [
      button('↑', disabled: oi === 0, onClick: swap(oi, oi-1)),
      button('↓', disabled: oi === qb.options.length-1, onClick: swap(oi, oi+1)),  
      button('×', disabled: qb.options.length <= 2, onClick: removeAt(oi), color: '#DC2626'),
    ]
  );
}
```

CSS (via `<style>` tag already present for spin animation):
```css
.option-row:hover .option-actions { opacity: 1 !important; }
```

**Microcopy:**
- × button title: `"Remove option"`
- ↑ button title: `"Move up"`  
- ↓ button title: `"Move down"`
- When only 2 options left, × button title: `"Minimum 2 options required"`

**Also add to canvas:** At the bottom of each question's option list (all 4 layouts), add a subtle "+ Add option" row:

```
Style: dashed border, 8px padding, fontSize 12, color C.TEXT_MUTED
Text: "+ Add option"  
onClick: push new option { id: uid(), text: '', score: 0 }
Only show when: selected && options.length < 8
```

---

### Fix 2: Save State + Undo/Redo Buttons in Top Bar

**What changes on screen:**
The top bar (lines ~2628-2685) gets 3 new elements between the back arrow and "Preview" button:

1. **Undo button** — left-arrow icon, disabled when `!history.canUndo`
2. **Redo button** — right-arrow icon, disabled when `!history.canRedo`  
3. **Save indicator** — text that cycles through states

**Where:** Top bar, center-left area after "Quiz Editor" label + question count.

**Save indicator states:**
| State | Text | Color | Icon |
|-------|------|-------|------|
| Idle (no changes) | `Saved` | `C.TEXT_SUBTLE` | ✓ checkmark |
| Saving (debounce fired) | `Saving...` | `C.TEXT_MUTED` | spinning dot |
| Just saved | `Saved` | `#16A34A` (green) | ✓ checkmark, fades to subtle after 2s |
| Error | `Save failed` | `#DC2626` | ⚠ icon + "Retry" link |

**Implementation:**
QuizBlockEditor needs to expose `history.canUndo` and `history.canRedo` — they already exist (line 132-133). The undo/redo buttons just call `history.undo()` and `history.redo()`.

For save state, add a prop from QuizEditorView:
```
saveState: 'idle' | 'saving' | 'saved' | 'error'
```

QuizEditorView already has the save timer (line ~391-424). Add state tracking:
- Set `saving` when timeout fires
- Set `saved` on `.then()` success
- Set `error` on `.catch()`
- Set `idle` after 2s of no changes

**Undo/Redo button style:**
```
height: 30, width: 30, borderRadius: 6,
background: 'transparent', border: '1px solid ' + C.BORDER,
color: canUndo ? C.TEXT : C.BORDER,
cursor: canUndo ? 'pointer' : 'default',
opacity: canUndo ? 1 : 0.4,
```

**Tooltips:**
- Undo: `"Undo (⌘Z)"`
- Redo: `"Redo (⌘⇧Z)"`

---

### Fix 3: Lead Gate as First-Class Toggle

**REMOVE** the Lead Gate from the block inserter palette (QUIZ_PALETTE in blocks.ts line 153). It should NOT be one of 8 block types users browse.

**What changes on screen:**
In the right panel's Quiz Settings section (lines ~3142-3291), add a new card at the TOP — before shuffle/progress/transition:

```
┌─────────────────────────────────┐
│ 📧 Collect emails               │
│                                 │
│ [━━━━━━━○] OFF                  │
│                                 │
│ Require email before showing    │
│ results. Captured leads appear  │
│ on your Leads page.             │
└─────────────────────────────────┘
```

**When toggled ON:**
- If no leadGate block exists → auto-create one with defaults and append to blocks
- The card expands to show:
  - Headline input (default: "Get your results")
  - Button label input (default: "See my results")
  - Field list: Email (required, locked), Name (toggle), Phone (toggle), Company (toggle)
  - Each field is a simple toggle row, not the complex field editor currently in the inspector
- Clicking "Customize form →" link at bottom selects the leadGate block in the canvas for full editing

**When toggled OFF:**
- Remove leadGate block from blocks array
- Confirm with: "Remove email form? You'll stop collecting leads." — small inline warning, not a modal

**Where it lives:**
- Right panel, when NO block is selected (the "overview" state, lines ~3095-3360)
- Positioned as the FIRST card, above "Quiz Settings"
- Also: left sidebar "Closings" section should show lead gate status as a colored badge: green dot = on, grey = off

**Also remove from inserter palette:**
In `QUIZ_PALETTE` (blocks.ts line 146-155), remove the leadGate entry. Users should never manually add one.

---

### Fix 4: Embed Code Button in Top Bar

**What changes on screen:**
New button in the top bar, between Preview and the current "Published" button:

```
[ </>  Get Embed Code ]
```

**Style:**
```
height: 34, padding: '0 14px', borderRadius: 8,
background: C.SURFACE, border: '1px solid ' + C.BORDER,
color: C.TEXT, fontSize: 13, fontWeight: 600,
```

**onClick:** Opens a modal (not a page navigation) with:

```
┌──────────────────────────────────────────┐
│  Install on Squarespace            [×]   │
│                                          │
│  1. Copy this code                       │
│  ┌────────────────────────────────────┐  │
│  │ <script src="https://cdn.square   │  │
│  │ spell.com/embed.js" data-quiz=    │  │
│  │ "abc123"></script>                 │  │
│  └────────────────────────────────────┘  │
│  [ Copy to clipboard ✓ ]                 │
│                                          │
│  2. In Squarespace, go to the page       │
│     where you want the quiz              │
│                                          │
│  3. Add a "Code" block and paste         │
│                                          │
│  [View installation guide →]             │
└──────────────────────────────────────────┘
```

**Behavior:**
- Copy button: writes to clipboard, text changes to "Copied ✓" for 2s, then back to "Copy to clipboard"
- The `data-quiz` attribute uses `quizId` prop (already available, line 2395)
- If `!quizId` (template not yet saved): show "Save your quiz first to get the embed code" with a disabled copy button
- "View installation guide" links to your docs

**The current "Published" button gets REPLACED** by this embed button. The actual Publish action already lives in QuizEditorView's top bar (line 437-451). The inner editor's "Published" button is redundant and confusing — kill it.

---

### Fix 5: Layout Scope — Per-Question with "Apply to All" Option

**Current problem:** Changing layout on any question silently changes ALL questions via `onChangeAllQuestions` (line 1462-1469).

**What changes:**
The layout picker in BlockInspector (lines ~1448-1486) gets TWO modes:

**Default: Per-question.**
Clicking a layout option changes ONLY the selected question's `answerLayout` and `questionStyle`.

**"Apply to all" button** appears below the layout picker grid:
```
[Apply to all questions]
```
Style: text button, fontSize 11, color C.ACCENT, no border, underline on hover.

onClick: 
1. Apply current question's layout to all question blocks
2. Show toast/flash: "Layout applied to all X questions" (inline in the inspector, green text, fades after 2s)

**Implementation change (line ~1462-1469):**
Replace the current `onChangeAllQuestions` call with:
```javascript
onClick: function() {
  // Only update THIS question
  onChange(Object.assign({}, block, { answerLayout: opt.value, questionStyle: style }));
}
```

Then add a separate button below the grid:
```javascript
<button onClick={function() {
  if (onChangeAllQuestions) {
    onChangeAllQuestions({ answerLayout: qb.answerLayout, questionStyle: qb.questionStyle });
  }
}}>Apply to all questions</button>
```

Same treatment for Selection type toggle (Single/Multi) at line ~1435-1445 — currently also applies globally. Make it per-question default, with "Apply to all" option.

---

## 2. UI REDESIGN DIRECTIONS

### Lead Gate → Already covered in Fix 3 above.

### Save State / Publish System

**Current mess:** Two "publish" concepts exist. QuizBlockEditor has a fake "Published" button (line 2667-2683). QuizEditorView has a real Publish button in the DashboardShell topbar (line 437-451).

**New system:**

| Component | What shows | Purpose |
|-----------|-----------|---------|
| QuizBlockEditor top bar | `Saved ✓` indicator + Undo/Redo + Preview + Get Embed Code | Editing controls only |
| QuizEditorView DashboardShell topbar | `Publish` button (real action) | Publishing action |

**Remove entirely:** The "Published" button inside QuizBlockEditor (lines 2667-2683). Delete those 17 lines.

The save indicator replaces it. Users see "Saved ✓" → know their work is safe. "Publish" lives one level up in the DashboardShell topbar where it already works correctly.

### Option Editing → Already covered in Fix 1 above.

### Layout System → Already covered in Fix 5 above.

---

## 3. MISSING FEATURES — HOW TO IMPLEMENT

### 3A. Undo / Redo UI

**Covered in Fix 2.** Buttons in top bar, wired to existing `history.undo()` / `history.redo()`. Already functional — just needs UI.

### 3B. Mobile Preview Toggle

**Where it lives:** Inside the LivePreview component (line ~2041-2369), add a device toggle bar at the top.

**How user triggers it:** Click device icons above the preview panel.

**UI:**
```
┌─────────────────────────────────┐
│  [📱] [💻]     Interactive Preview │
│                                  │
│  ┌─────────────────────────┐    │
│  │                         │    │
│  │   (preview content)     │    │
│  │                         │    │
│  └─────────────────────────┘    │
└─────────────────────────────────┘
```

**Implementation:**
Add state to LivePreview:
```javascript
var [device, setDevice] = useState('desktop');
```

Wrap the preview content in a container:
```javascript
var previewWidth = device === 'mobile' ? 375 : '100%';
var previewStyle = {
  width: previewWidth,
  margin: device === 'mobile' ? '0 auto' : undefined,
  border: device === 'mobile' ? '1px solid ' + C.BORDER : 'none',
  borderRadius: device === 'mobile' ? 20 : 0,
  padding: device === 'mobile' ? '20px 16px' : 20,
  transition: 'width 0.3s ease',
};
```

**Device toggle style:**
Two icon buttons, 28×28, with active state matching the Preview button toggle pattern already used (line 2649-2665). Active = `C.ACCENT_LIGHT` bg + `C.ACCENT` text. Inactive = transparent + `C.TEXT_MUTED`.

### 3C. Embed / Install Flow

**Covered in Fix 4.** Modal triggered from top bar button.

### 3D. Branching / Logic Testing

**Where:** Add a "Test quiz flow" button inside the Skip Logic Modal (line ~3364-3513).

**How user triggers it:** Open skip logic modal → click "Test flow" tab at top.

**UI — two tabs in the skip logic modal header:**

```
[Rules]  [Test Flow]
```

**Test Flow tab shows:**
A simplified quiz simulator:
- Shows Q1 with answer options as clickable buttons
- User clicks an answer → follows branch rules → shows next question
- Displays the path taken as breadcrumbs: `Q1 → Q3 → Q5 → Outcome A`
- "Restart" button to test again
- Highlights any dead-end paths (questions with no exit)

**Implementation:** Reuse the `LivePreview` component logic (lines 2041-2369) but render it inside the modal instead of the right panel. The `LivePreview` already handles answer selection, scoring, branching display, and outcome matching. Wrap it in the modal and add the breadcrumb trail.

### 3E. Onboarding Tour

**Where:** Triggers on first editor open. State stored in `localStorage` key `squarespell_editor_toured`.

**How user triggers it:** Auto on first visit. Also: "?" icon button in top bar to re-trigger.

**3 steps only:**

**Step 1:** Highlight left sidebar.
```
Tooltip pointing right →
"Your Questions"
"All your quiz questions listed here.
Click to jump, drag to reorder."
[Next →]
```

**Step 2:** Highlight canvas area.  
```
Tooltip pointing down ↓
"Edit Here"
"Click any question to edit inline.
Use + buttons to add new blocks."
[Next →]
```

**Step 3:** Highlight right panel.
```
Tooltip pointing left ←
"Settings & Properties"
"Select a block to see its settings.
Answer layout, media, branching — all here."
[Get started →]
```

**Implementation:**
Simple overlay + positioned tooltip. No library needed. Add `var [tourStep, setTourStep] = useState(0);` to QuizBlockEditor. Render a fixed overlay with a cutout (CSS `box-shadow: 0 0 0 9999px rgba(0,0,0,0.5)`) positioned over the highlighted area. 3 steps, 3 positions. Dismiss writes to localStorage.

The "?" button in the top bar:
```
width: 30, height: 30, borderRadius: '50%',
border: '1px solid ' + C.BORDER, background: 'transparent',
color: C.TEXT_MUTED, fontSize: 12, fontWeight: 700,
```

---

## 4. CONVERSION OPTIMIZATION

### Push Email Capture Everywhere

1. **Lead gate toggle is item #1 in quiz settings** (Fix 3). Every user sees it.

2. **If no lead gate exists when user clicks "Publish":**
   Show an interstitial in the publish flow:
   ```
   "Want to collect emails?"
   "Add an email form before results to capture leads.
   Most quizzes see 40-60% opt-in rates."
   
   [Add email form]   [Skip, just publish]
   ```
   This is the highest-leverage conversion nudge. Users who skip can always add later.

3. **Dashboard homepage widget:** If a quiz has no lead gate → show a card:
   ```
   "💡 Your quiz isn't collecting emails yet."
   [Add email capture →]
   ```

### Guide Users Toward Completion

**Add a completion checklist** in the right panel's empty state (no block selected). Replace the current "Overview" stats grid (lines 3112-3140) with:

```
Quiz Readiness
✓ Questions added (5)
✓ Outcomes created (3)
✗ Email capture — Add lead gate
✗ Score ranges set — Configure outcomes
✓ Published

[Missing 2 items for a complete quiz]
```

Each incomplete item is a clickable link that either:
- Navigates to the relevant block (selects it)
- Opens the relevant setting
- Triggers the lead gate toggle

Green checkmark for done, red × for missing. This replaces passive stats with an actionable nudge.

### Emphasize vs. Hide

**Emphasize (make bigger, more visible):**
- Lead gate toggle
- Outcome score ranges (show total possible score)
- "Get embed code" button
- Answer layout picker (visual differentiator vs competitors)

**Hide (collapse, move to advanced, or remove):**
- Logic block type from inserter (keep branching in the inspector per-question, remove standalone Logic block — it's confusing and overlaps with branchRules)
- Divider block type (decorative, rarely used — collapse into "Content" sub-menu)
- Custom CSS (already gated to Pro — also move below the fold)
- reCAPTCHA toggle (edge case — move to bottom of settings)

### Automate

1. **Auto-generate outcome score ranges.** When user creates 3 outcomes with 5 questions (max score 50), auto-suggest: Outcome 1: 0-16, Outcome 2: 17-33, Outcome 3: 34-50. Show as pre-filled defaults they can adjust.

2. **Auto-create outcomes from question count.** When a quiz has 5+ questions and 0 outcomes, show: "Add results pages? We'll create 3 outcomes based on your scoring." One click to auto-scaffold.

3. **Auto-set answer layouts from first image.** When user adds an image to the first option of a question that currently uses "list" layout, prompt: "Switch to image grid?" or auto-switch to `grid` layout.

---

## 5. UX SIMPLIFICATION FOR SQUARESPACE USERS

### Remove

| Item | Why |
|------|-----|
| **Logic block** from inserter palette | Overlaps with per-question branching in inspector. Two ways to do the same thing confuses everyone. Keep branching in the inspector only. |
| **"Published" button** inside QuizBlockEditor | Fake button — does nothing. Real publish is in the wrapper. Delete lines 2667-2683. |
| **"Features used" pills** (lines 3328-3357) | Decorative badges that take up right-panel space. Users don't need to see that they're "using" Image Choices. Remove. |
| **Overview stats grid** (lines 3112-3140) | Replace with completion checklist (Section 4). Question/outcome/block counts aren't actionable. |

### Simplify

| Item | Current | Simplified |
|------|---------|-----------|
| **Block inserter** | 8 types in a 4×4 grid | 4 types: Question, Result, Email Gate, Content (+). Content expands to Heading/Text/Image/Divider on click. |
| **Selection type** | ToggleGroup with "Single" / "Multi" labels | Single checkbox: "☐ Allow multiple answers" |
| **Answer layout picker** | 4-icon grid always visible | Default to "list". Show layout picker only when question has images OR user clicks "Change layout" link. |
| **Branching** | Full select-per-option always visible in inspector | Collapsed by default. Label: "Branching (off)". Expand shows options. |
| **Time limit** | Number input always visible | Collapsed inside Advanced. Label: "Timer (off)". |
| **Answer explanations** | Always visible inputs per option | Collapsed inside Advanced. Label: "Show explanations after answer". |

### Automate

| Manual Step | Auto Behavior |
|-------------|---------------|
| Set score ranges on outcomes | Auto-distribute evenly across outcomes. Show as editable defaults. |
| Choose answer layout when adding images | Auto-switch to grid/imageThumbnails when first image added to an option. |
| Create lead gate block | Toggle in settings. Auto-creates with smart defaults. |
| Number questions | Already done in sidebar. Also show on canvas cards (already done). |

### Reduced Inserter Palette

Replace the current 4×4 grid (8 items) with a simpler 2×2 primary grid + expandable:

```
┌────────────┬────────────┐
│  ❓ Question │  🏆 Result  │
├────────────┼────────────┤
│  📧 Email   │  📝 Content │
│    Gate     │     ▾      │
└────────────┴────────────┘
```

Clicking "Content ▾" expands to show: Heading, Text, Image, Divider.

This reduces cognitive load from 8 choices to 4.

---

## 6. PRIORITIZED ROADMAP

### Phase 1 — Quick Wins (1-2 days)

| # | Change | Effort | Impact |
|---|--------|--------|--------|
| 1 | Delete "Published" button (lines 2667-2683) | 5 min | Removes confusion |
| 2 | Add undo/redo buttons to top bar | 30 min | Prevents data loss anxiety |
| 3 | Add save state indicator (`Saving...` / `Saved ✓` / `Save failed`) | 45 min | Trust building |
| 4 | Per-option delete (× button on each option row) | 1 hr | #1 daily-use frustration fix |
| 5 | Per-option reorder (↑↓ buttons on each option row) | 30 min | Natural companion to delete |
| 6 | Add "+ Add option" row at bottom of canvas answer lists | 20 min | Discoverability |
| 7 | Make layout change per-question (not global) + "Apply to all" button | 30 min | Fixes confusion |
| 8 | Remove "Features used" pills section | 5 min | Declutter |
| 9 | Add "Max 8 options" label when at limit | 5 min | Prevents confusion |
| 10 | Client-side file size check before image upload (reject > 20MB) | 15 min | Prevents failed uploads |

**Total Phase 1: ~4-5 hours of work. Ship in one PR.**

### Phase 2 — UX Improvements (1-2 weeks)

| # | Change | Effort | Impact |
|---|--------|--------|--------|
| 1 | Lead gate as settings toggle (remove from palette, add toggle card) | 3 hrs | Conversion lift |
| 2 | Embed code modal from top bar button | 2 hrs | Closes build→deploy loop |
| 3 | Replace overview stats with completion checklist | 2 hrs | Guides users to complete quizzes |
| 4 | Mobile preview toggle in LivePreview | 1.5 hrs | Mobile-first awareness |
| 5 | Simplified inserter (4 primary blocks + Content expander) | 1.5 hrs | Reduced cognitive load |
| 6 | Collapse branching/timer/explanations by default | 30 min | Cleaner inspector |
| 7 | "Allow multiple answers" checkbox replacing ToggleGroup | 15 min | Simpler control |
| 8 | Auto-suggest outcome score ranges | 2 hrs | Removes manual math |
| 9 | "Add email capture?" prompt on publish (if no lead gate) | 1.5 hrs | Conversion nudge |
| 10 | 3-step onboarding tooltip tour | 2 hrs | First-use activation |
| 11 | "?" help button in top bar to re-trigger tour | 15 min | Discoverability |

**Total Phase 2: ~16-17 hours. Ship across 2-3 PRs.**

### Phase 3 — Product-Level Upgrades (2-4 weeks)

| # | Change | Effort | Impact |
|---|--------|--------|--------|
| 1 | Split QuizBlockEditor.tsx into 6 files: BlockCard, BlockInspector, MediaPicker, LivePreview, SkipLogicModal, QuizSettings | 4 hrs | Unlocks faster iteration, reduces re-render scope |
| 2 | Test Flow tab in skip logic modal (reuse LivePreview logic) | 4 hrs | Branching validation |
| 3 | Dashboard "quiz not collecting emails" prompt card | 1 hr | Ongoing conversion nudge |
| 4 | Auto-switch layout when images added to options | 2 hrs | Smart defaults |
| 5 | "Blank quiz" creation option (bypass URL→AI flow) | 1.5 hrs | Power user flow |
| 6 | Auto-create outcomes from question count (one-click scaffold) | 2 hrs | Reduces setup friction |
| 7 | Lazy image loading in editor (IntersectionObserver) | 2 hrs | Performance for large quizzes |
| 8 | Right-click context menu on block cards (duplicate/delete/move) | 2 hrs | Discoverability |
| 9 | Drag reorder in left question sidebar | 3 hrs | Natural reorder location |
| 10 | Structural sharing in history (diff-based, not full clone) | 4 hrs | Memory optimization for large quizzes |

**Total Phase 3: ~25-26 hours. Ship across 4-5 PRs.**

---

## SUMMARY

**Phase 1** fixes the daily-use frustrations that make the editor feel unfinished. Ship this week.

**Phase 2** transforms the editor from a builder into a conversion tool. Lead gate prominence + embed code access + completion checklist + publish nudge = more quizzes collecting more emails.

**Phase 3** is infrastructure + power features. File splitting is the unlock — everything after it ships faster because changes are isolated and re-renders are scoped.

**What NOT to build:**
- Rich text editing in question text (overkill for quiz questions)
- Real-time collaboration (not your market)
- Custom themes/skins beyond CSS (maintain the 2-color system)
- Nested question groups or multi-page sections (complexity trap)
- AI question generation inside the editor (keep AI in the creation flow, not the editing flow)
