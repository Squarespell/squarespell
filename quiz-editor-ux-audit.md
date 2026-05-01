# Squarespell Quiz Editor — UX Audit

**Auditor perspective:** Senior SaaS product designer, UX auditor, conversion strategist  
**Scope:** QuizBlockEditor.tsx (3,517 lines), QuizEditorView.tsx, blocks.ts  
**Date:** May 2026

---

## 1. First Impression

The editor opens to a 3-column layout — question sidebar, canvas, inspector — which immediately communicates "serious tool." That's good positioning against Typeform's single-column simplicity, but the execution undercuts it.

**The 3,517-line single file is the first red flag.** Not a UX issue users see directly, but it creates a brittleness that bleeds into the experience: every block type's rendering, every inspector panel, the media picker, the live preview, the skip logic modal, quiz settings, drag-drop handling, keyboard shortcuts, and the history system all live in one component. Any future change risks side effects everywhere.

**The empty state is weak.** When no block is selected, the right panel shows a "Block Editor" heading with an overview grid (question count, outcome count, total blocks, lead gate on/off). This is information, not action. A user who just opened the editor for the first time sees stats about nothing. The empty state should guide — "Select a question to edit, or add your first one" with a prominent button.

**The "Published" button in the top bar is misleading.** It's always visible with a checkmark, styled as a success state. But it's not actually a publish action — the title attribute says "Changes are auto-saved." Users will click it expecting to publish and nothing will happen. That's a trust-breaking moment. Meanwhile, the real publish flow lives in QuizEditorView's separate modal.

---

## 2. Quiz Creation Flow

**Getting into the editor is fragmented.** There are multiple entry points:

- `/dashboard/[quizId]` — loads a specific quiz
- `/dashboard/editor` — loads most recently updated quiz, or shows empty state
- Template flow — creates a local-only quiz from catalog, defers API creation to first save

The template path is clever (avoids plan-check failures), but the "no quiz to edit yet" empty state only links to `/tools/quiz-funnel/build`, which is the URL-scraping AI flow. There's no "blank quiz" option. If a user just wants to manually build a quiz from scratch, they can't — they're forced through the URL→AI→pick-a-style pipeline. That's a significant friction point for power users and returning customers.

**Auto-save is invisible.** The `saveTimeout` in QuizEditorView debounces at 1,500ms, but there's no save indicator beyond the misleading "Published" button. Users editing a 20-question quiz have zero confidence their work is being saved. Notion, Figma, and every modern editor show "Saving..." / "Saved" states. This is table stakes you're missing.

**Legacy conversion works but is invisible.** `legacyToBlocks()` silently converts old quiz formats. Good engineering, but if the conversion is lossy (old quiz types that don't map cleanly), the user would never know. There's no "We updated your quiz to the new format" toast.

---

## 3. Question Editing

**Inline editing on the canvas is the right call.** Clicking a question card makes the question text editable right there — no modal, no panel switch. The answer option text also becomes inline-editable. This is the best interaction pattern for this kind of tool.

**But editing is split-brained.** Question text edits on the canvas. Answer layout, selection type, branching, media, and advanced settings edit in the right panel. Score editing happens *both* places — inline on the canvas (number input per option) and conceptually in the inspector. This dual-location pattern means users will sometimes edit in the wrong place and wonder where their changes went.

**The score system is confusing for non-quiz-nerds.** Every answer option has a "+0pts" badge visible at all times, even when scoring isn't relevant (e.g., personality quizzes where you just want routing). There's no way to hide scores or switch to a "no scoring" mode. For Squarespace users building a "What's your interior design style?" quiz, the points system is noise.

**Adding options is right-panel only.** The "+ Add option" and "Remove" buttons live in the inspector sidebar under "Answer style." But if the user is working on the canvas looking at their question card, they have to context-switch to the sidebar to add an option. An "Add option" affordance at the bottom of the answer list on the canvas would be more natural.

**Option limit of 8 is hardcoded and unexplained.** `qb.options.length < 8` gates the add button. Users hit the wall with no explanation. A "Maximum 8 options" label or a brief note would prevent confusion.

**The remove option button removes the last one.** `qb.options.slice(0, -1)` always removes the final option regardless of which one the user might want to remove. There's no per-option delete — you can't remove option C while keeping D. This is a serious usability gap. Users will have to delete the last one, re-type it as C, then delete the real C. Nobody will do that — they'll just leave the bad option in place.

---

## 4. Media Handling

**The MediaPicker is well-designed.** Three input methods — file upload, stock search (Pexels), paste URL — with clear tab navigation. The upload drop zone has hover states, loading spinner, error display. Video support includes YouTube/Vimeo URL parsing with proper embed rendering. This is above-average for the price point.

**But the image picker for answer options is separate and worse.** The per-option image picker uses a completely different modal created via vanilla DOM (`document.createElement`). It creates a fixed overlay with Upload and Stock Search tabs, but the code for it isn't in the section I can see in the MediaPicker — the block cards have their own `openImagePicker` function. Having two parallel image picker implementations is a maintenance problem and a consistency problem. Users get a polished Squarespace-style picker for question media and a different one for answer images.

**Image upload goes through the API.** `POST /api/media/upload` with base64-encoded data. Good — images are hosted, not embedded. But there's no file size validation on the client side. The drop zone says "20 MB max" but nothing enforces it before upload. A 50MB image will start uploading, consume bandwidth, then fail server-side.

**No image cropping or resizing.** For answer option images, layout matters — grid layout uses 16:9, fullBackground uses 3:4. Users upload whatever aspect ratio they have, and the CSS `object-fit: cover` crops it. They can't control the crop point. For a visual quiz where the image IS the answer, this is a significant limitation.

**Broken image handling is defensive but ugly.** `onError` hides images via `style.display = 'none'`. The image just disappears with no feedback. A placeholder saying "Image failed to load" would be more helpful than a silent void.

---

## 5. UI / Visual Design

**The teal + paper color system is cohesive.** `#0F7377` accent on `#F7F7F5` backgrounds, with the Untitled UI neutral scale for borders and muted text. It's clean, professional, and feels like a premium tool. The consistent use of `C.ACCENT`, `C.BORDER`, etc. from `DASHBOARD_COLORS` keeps everything unified.

**Typography is solid.** Inter font throughout, with good weight hierarchy (700 for headings, 600 for labels, 500 for body). Letter-spacing of `-0.01em` and `-0.02em` on headings adds that premium feel.

**The inspector panel is the best part of the UI.** Collapsible `SidebarSection` components with icons, clean `ToggleGroup` buttons replacing dropdowns, visual layout picker with 4 icon buttons for answer arrangement. This is genuinely well-crafted interaction design.

**But the canvas cards need work.** Block cards are functional but visually flat. The question number badge, drag handle, and duplicate/delete controls all compete for the same top-right space. The drag handle (6-dot grid) is small (14×14) and easy to miss. The duplicate and delete buttons only appear on hover — discoverable for power users but invisible to beginners.

**Inline SVG icons everywhere.** Every single icon is a raw SVG element with inline paths. There must be 100+ SVG definitions across the file. This makes the code nearly unreadable and means no icon is reusable. Not a user-facing issue, but it makes the codebase fragile for iteration.

**Plan badges are tastefully done.** The `PlanBadge` component shows "STARTER", "PRO", or "AGENCY" in colored pill badges next to gated features. Colors are distinct (blue/purple/orange) and the badges don't feel aggressive. This is the right way to handle upsells — visible but not blocking.

---

## 6. Feature Gaps (What's Missing)

**No undo UI.** The `useHistory` hook supports undo/redo (Cmd+Z/Cmd+Shift+Z), and it works. But there's no visible undo/redo buttons anywhere. Most users don't know keyboard shortcuts. An undo button in the top bar would prevent data loss anxiety.

**No question duplication from the canvas.** The duplicate button exists on hover over block cards, but it's a small icon that many users won't discover. A right-click context menu with "Duplicate / Delete / Move up / Move down" would be far more discoverable.

**No reordering in the left sidebar.** The question sidebar lists all questions with numbered badges, and clicking navigates to them. But you can't drag to reorder there. Reordering only works via drag-drop on the canvas (which requires you to grab the tiny 14px handle). The sidebar is the natural place for reordering — it's a list.

**No question preview on hover in the sidebar.** The sidebar shows truncated question text. For quizzes with 15+ questions, distinguishing between "Which of these..." entries is impossible. A tooltip or expanded preview on hover would help.

**No bulk operations.** You can't select multiple blocks, can't delete multiple questions, can't apply a layout change to all questions at once... wait, actually you can — `onChangeAllQuestions` applies layout changes globally. But this is implicit (changing layout on one question changes all of them) with no confirmation. Users expecting per-question layout control will be confused when changing Q5's layout also changes Q1-Q4.

**No quiz preview URL.** The "Preview" toggle shows a `LivePreview` component in the right panel, but it's a simplified simulation — not the real embed experience. There's no "Open preview in new tab" that shows how the quiz actually renders on a Squarespace site.

**No way to test branching.** The skip logic modal shows per-answer routing, but there's no visual flow diagram or "test this path" function. Users configure branching rules blind and have to mentally trace paths.

**No mobile preview.** The LivePreview renders at whatever width the right panel is (380px). There's no device toggle to see how the quiz looks on a phone vs. tablet vs. desktop.

---

## 7. User Friendliness

**Keyboard shortcuts are well-chosen but undiscoverable.** Cmd+N (new question), Cmd+D (duplicate), Cmd+Z/Shift+Z (undo/redo), Alt+Arrow (reorder), Delete (remove), Escape (deselect), Arrow keys (navigate). These are power-user quality shortcuts. But there's no shortcut cheatsheet, no `?` modal, no tooltips mentioning them.

**The block inserter palette is clean.** The `AddBlockInserter` expands to show all 8 block types in a grid with icons and descriptions. Each type has a clear label ("Question — Multiple choice question", "Outcome — Result page content"). This is good — users can understand what each block type does without documentation.

**Error states are minimal.** Upload errors show inline (good), but what happens if the API save fails? The `QuizEditorView` has a `saveError` state that shows a small banner, but there's no retry button. Failed saves can silently lose work.

**The "required" state per question isn't surfaced on the canvas.** You can mark questions as required in the inspector, but the canvas card doesn't show whether a question is required or optional. Visual indicators matter.

**No onboarding or tour.** A first-time user opening the editor sees a 3-column layout with no guidance. A simple 3-step tooltip tour ("This is your question list → Edit questions here → Configure settings here") would dramatically improve activation.

---

## 8. Performance / Scalability

**3,517 lines in a single component is a scalability concern.** React re-renders the entire tree when any state changes. Selecting a block, typing in an input, opening the inserter — each triggers a re-render of every block card, every inspector panel, every preview element. For a 5-question quiz this is fine. For a 30-question quiz with images, you'll feel the lag.

**History stores full block arrays.** `MAX_HISTORY = 50`, and each entry is a complete `QuizBlock[]` clone. For a quiz with 30 questions, each with 4 image options, that's 50 copies of a large object tree in memory. No structural sharing, no diffing.

**The LivePreview re-mounts on every block change.** It takes the full `blocks` array as a prop and rebuilds its internal state. For quick edits (typing a question, adjusting a score), the preview re-renders on every keystroke after the debounce.

**The skip logic modal renders all questions with all options.** For a 30-question quiz with 4 options each, that's 120 `<select>` elements with full option lists. Each select contains all possible jump targets (every other question + outcomes + lead gates). This is O(n²) DOM in the modal.

**Image loading has no lazy behavior.** Every image URL in every block card and every option renders an `<img>` tag eagerly. A quiz with 30 image-choice questions (4 images each = 120 images) will trigger 120 HTTP requests when the editor opens.

---

## 9. Conversion / Real Use Case Evaluation

**For Squarespace users specifically, the editor is overpowered and underdirected.** Squarespace users are designers, small business owners, and creatives. They want "make a quiz that matches my brand and captures leads." They don't want to learn about block types, branching rules, score ranges, and logic conditions.

**The lead gate is buried.** For a lead generation tool, the email capture form is just another block type in the inserter palette — equal weight to "Divider" and "Image." It should be a first-class, always-visible configuration. "Collect emails before showing results" should be a toggle, not a block you have to know to add.

**Outcome scoring is powerful but explained nowhere.** The min/max score range on outcomes is the core quiz mechanic — it determines which result page a user sees. But there's no guidance on how to set these ranges. A user with 5 questions (scores 0-10 each, max total 50) has to manually figure out that Outcome A should be 0-15, Outcome B should be 16-30, etc. A "suggested ranges" helper or at minimum a visual score distribution would make this usable.

**The embed/install flow is completely absent from the editor.** After building a quiz, there's no "Get embed code" or "Install on Squarespace" step. The user builds a quiz... then what? They have to navigate away from the editor to find the embed page. For a Squarespace plugin, the install-on-your-site step should be ONE click from the editor.

**Template-to-editor transition loses context.** When a user starts from a template, they land in the editor with pre-filled blocks. But there's no "You're editing the [Template Name] template — here's what to customize" guidance. The template's brand context is gone.

---

## 10. Final Verdict

### Top 5 Strengths

1. **Answer layout system** — Four distinct layouts (list, grid, image thumbnails, full background) with a visual picker is a genuinely differentiating feature. Most quiz builders offer "list" and nothing else.

2. **Inspector panel UX** — Collapsible sections, toggle groups replacing dropdowns, visual icon selectors, clean spacing. This is the most polished part of the entire editor and sets the right design bar.

3. **Block type variety** — 8 block types covering questions, content, outcomes, lead capture, and logic. The schema is well-designed with proper TypeScript types and sensible defaults.

4. **Media handling depth** — Upload, stock search, URL paste, video embeds (YouTube/Vimeo), per-option images, question-level media. The breadth of media support is competitive with tools 10x the price.

5. **Plan-gating execution** — Feature badges are tasteful, disabled states are clear, plan tier hierarchy is logical. Users know what they're missing without feeling punished.

### Top 5 Weaknesses

1. **No per-option delete** — You can only remove the last option. This is a daily-use frustration that makes the editor feel unfinished.

2. **No visible undo/save state** — Auto-save with no indicator + undo only via keyboard shortcut = user anxiety about data loss. This erodes trust in the tool.

3. **Lead gate buried as a regular block** — For a lead-gen SaaS, the email capture form should be a first-class feature, not item 7 in a block palette alongside "Divider."

4. **No embed/install step from the editor** — Building a quiz is pointless if the user can't immediately put it on their Squarespace site. The absence of this step breaks the core conversion loop.

5. **Layout change applies globally without confirmation** — Changing one question's answer layout changes ALL questions. This is either a feature or a bug, but either way it needs to be communicated. A first-time user will be confused.

### Priority Improvements (Ranked)

1. **Add per-option delete buttons and reorder** — Highest-frequency pain point. Every user hits this.
2. **Add save indicator + undo/redo buttons to top bar** — Trust and confidence. 30 minutes of work.
3. **Surface lead gate as a first-class toggle** — Quiz settings → "Collect emails before results" → On/Off. Don't make users discover the block type.
4. **Add "Get embed code" button to the top bar** — One click from editor to installable snippet. Close the build→deploy loop.
5. **Add per-question layout option or explicit "Apply to all" confirmation** — Users need to understand the scope of their changes.
6. **Split the component** — Extract BlockCard, BlockInspector, MediaPicker, LivePreview, SkipLogicModal into separate files. Doesn't change UX but unlocks faster iteration on everything above.
7. **Add mobile preview toggle** — Squarespace sites are 60%+ mobile. Users need to see what their quiz looks like on a phone.
8. **Add onboarding tooltip tour** — 3 steps, shown once. "Questions here → Edit here → Settings here."
9. **Client-side image validation** — Check file size before upload. Prevent the wasted-bandwidth failure.
10. **Add score range guidance on outcomes** — Show total possible score, suggest ranges, or auto-distribute.

---

*This audit is based on code review of the actual implementation, not screenshots or demos. Recommendations are specific to the Squarespace quiz builder use case and the current codebase architecture.*
