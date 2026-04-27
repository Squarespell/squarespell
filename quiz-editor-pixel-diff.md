# Quiz Editor — Pixel-to-Code Fidelity Map

**Source of Truth:** ChatGPT-generated mockup images (2 images provided)
**Secondary Layer:** Current codebase at `frontend/app/dashboard/_components/QuizBlockEditor.tsx` (2430 lines)
**Rule:** Images are absolute truth. No assumptions, no redesigns, only alignment.

---

## 1. IMAGE STRUCTURE BREAKDOWN

### IMAGE 1 — Main Mockup (Top Row: Full Editor + 3 Bottom Variants)

#### 1A. FULL EDITOR VIEW (top of Image 1)

**Visible regions (left to right):**

1. **LEFT SIDEBAR — Question List**
   - Header: "Questions" with count badge "10"
   - Scrollable list of question cards
   - Each card: `Q1` blue badge + "Multiple Choice" label + question text preview (truncated)
   - Selected state: Q1 has teal/blue left border + light blue background fill
   - Non-selected: plain white with gray text
   - Bottom: "+ Add Question" button with plus icon
   - Width: ~200px visually

2. **CENTER CANVAS — Question Editor**
   - Top row: `Q1` blue badge + "Multiple Choice ∨" dropdown + copy icon + trash icon
   - Question text with rich formatting: "What's your primary goal for your Squarespace site right now?"
   - Toolbar below text: **B** | *I* | 🔗 (bold, italic, link)
   - Top-right corner image thumbnail with blue X close button
   - Answer rows: A, B, C, D — each with letter badge + text + branch icon + trash icon
   - Bottom: "+ Add Answer" button
   - Below answers: "Required" toggle (ON, blue) + "Description (optional)" label + "Add description..." placeholder
   - Width: fills center space

3. **RIGHT PANEL — Property Inspector**
   - Tab row: **Content** (active, underlined blue) | Logic | Design
   - Sections visible:
     - "Question Type" label → "Multiple Choice" dropdown
     - "Question Text" label → textarea with question text
     - "Image (optional)" label → image thumbnail with "Replace" + trash buttons
     - "Answers" header
     - "Shuffle Answers" toggle (OFF)
     - "Allow Multiple Selection" toggle (OFF)
     - "Required" toggle (ON, blue)
     - "Help Text (optional)" label → "Add help text..." placeholder
   - Width: ~260px visually

4. **FAR RIGHT — Mobile Preview**
   - Header: "Mobile Preview" + phone/desktop toggle icons (top right)
   - Phone frame preview showing:
     - "1 / 10" counter + green progress bar
     - Question text
     - Radio button options (A, B, C, D)
     - Teal "Next" button + "Press Enter ↵" hint
     - "10% Complete" text + green progress bar at bottom
   - Width: ~280px visually

#### 1B. LOGIC / BRANCHING VIEW (bottom-left of Image 1)

**Visible regions:**
1. Left sidebar: Question list (same structure as 1A)
2. Top bar: ← back + "Website Design Quiz" + "Saved" + Preview + Publish
3. Tab row in center: "Exam" | "Logic" (active, underlined) | "Logic" | "Design"
4. Center content: "Set up conditional logic for this question"
   - "If user selects an answer, go to:" label
   - Flow diagram: Q1 box → branching arrows to Q2, Q3, Q4, Q5 boxes
   - Each Q box has answer text visible
   - Bottom: "+ Add Rule" button

#### 1C. DESIGN SETTINGS VIEW (bottom-center of Image 1)

**Visible regions:**
1. Left sidebar: Question list
2. Top bar: same as 1B
3. Tab row: "Design" | "Logic" | **Design** (active)
4. Center content — design controls:
   - "Theme" label → 6 color dot swatches (dark blue, teal, blue, red, dark, gray)
   - "Fonts" header
   - "Question Font" → "Inter" dropdown
   - "Answer Font" → "Inter" dropdown
   - "Button Style" → "Rounded" (active, teal bg) | "Square" toggle
   - "Background color" → "#F6F4FC" text + blue color picker swatch
   - "Progress Bar" → toggle (ON)
5. Right panel: "Spacing" header + content (partially visible)

#### 1D. MOBILE PREVIEW MODE (bottom-right of Image 1)

**Visible regions:**
1. Left sidebar: Question list (narrower)
2. "Mobile Preview Settings" header in right area
3. Settings visible: "Device" dropdown, "Orientation" dropdown, "Show Progress Bar" toggle
4. Phone frame with quiz preview (same as 1A preview)

---

### IMAGE 2 — 12 State Breakdown

#### State 1: DEFAULT EDITOR VIEW
- Left sidebar: Q list (Q1-Q5 + "Thank You Result" outcome card)
- Center: Q1 with "Single select · 4 options" subtitle, answer list
- Right: "Content" tab active, "Question type" dropdown, "Question text" field, "Options" list, "Required" toggle, "+ Add option" button
- Top bar: ← + "Website Design Quiz" + Saved ✓ + Preview + [Publish]

#### State 2: ADD QUESTION STATE
- Modal/overlay: "Add new question" with icon grid:
  - Row 1: Multiple Choice, Short Answer, Paragraph
  - Row 2: Dropdown, Yes/No, Rating
  - Row 3: Image Choice, File Upload, Number
  - Cancel button at bottom
- Behind: editor with sidebar visible

#### State 3: EDITING QUESTION (ACTIVE STATE)
- Left sidebar: Q2 selected (blue border + blue bg)
- Center: Q2 question text in editable state (blue outline box with cursor)
- Right panel: Content tab, "Question type" dropdown, "Question text" textarea, "Options" list with checkboxes, "+ Add option", "Required" toggle
- Question text shows inline editing bubble

#### State 4: DRAG & DROP REORDERING
- Left sidebar: Q2 being dragged (lifted card state, slight offset)
- Q3 and Q4 show compressed/shifted to indicate insertion point
- Visual: card shadow/lift on dragged item

#### State 5: LOGIC / BRANCHING VIEW
- Tab: "Editor" | **Logic** (active) | "Settings"
- Center: Flow diagram with Q boxes connected by lines
- Q1 → Q2, Q3, Q4 connected via arrows
- "Thank You Result" outcome at bottom of flow
- Each Q box shows question number and truncated text

#### State 6: DESIGN SETTINGS PANEL
- Tab: "Design" | "Logic" | **Design** (active)
- Right panel shows:
  - "Theme" → color dot row (6 colors)
  - "Typography" section:
    - "Font family" → "Inter" dropdown
    - "Question font size" → "18px"
    - "Option font size" → "16px"
  - "Button style" → "Rounded" (teal active) | "Square"
  - "Primary color" → "#0EA5A" swatch

#### State 8: RESULT PAGE EDITOR
- Left sidebar: "Thank You Result" card selected (green indicator)
- Center: "Thank You Result" header
  - "Title" field → "Thanks! You're all set"
  - "Description" field → rich text editor with toolbar (B I U S ≡ ☰ 🔗 📷 </> •)
  - "Illustration" → "Change" dropdown
  - "Layout" → "Centered" dropdown
  - "Button text" field → "View my results"
  - "Button link" field → "/results"
  - "Background color" → "#FFFFFF" swatch
  - "Text color" → "#0F172A" swatch

#### State 9: IMAGE / MEDIA QUESTION TYPE
- Q3 shows "Image Choice" type
- Center: "Which design style do you prefer for your website?"
- Image grid: 3 images with labels ("Minimal", "Modern", "Bold") + 1 more partially visible ("Classic")
- Options list below with labels
- Bottom: "+ Add image option" button
- Right panel: "Content" tab, "Image options" section with image URLs

#### State 10: EMPTY STATE
- Center: Large illustration (clipboard with magnifying glass)
- "Your quiz is empty" heading
- "Add your first question to get started." subtext
- Red/teal "Add question" button (primary CTA)

#### State 12: SAVE / PUBLISH STATE
- Shows "Published" badge in top bar (green)
- Full editor view with Q list on left
- Right panel showing "Content" tab with fields
- Top bar: "Website Design Quiz" + [Published] badge + Saved + Preview + [Publish]

---

## 2. DESIGN vs IMPLEMENTATION DIFF MAP

### ✅ MATCHED — Elements that exist in both images and code

| Image Element | Code Location | Status |
|---------------|---------------|--------|
| Block cards with Q badge + text preview | `BlockCard` component (line 220-600) | ✅ Match |
| Answer rows with letter badges (A, B, C, D) | `BlockCard` lines 370-510 | ✅ Match |
| + inserter circles between blocks | `AddBlockInserter` (line 140-211) | ✅ Match |
| Selection type toggle (Single/Multi) | `BlockInspector` lines 1000-1008 | ✅ Match |
| Layout toggle (Buttons/Cards/List/Image) | `BlockInspector` lines 1010-1022 | ✅ Match |
| Add/Remove option buttons | `BlockInspector` lines 1023-1061 | ✅ Match |
| Media picker (upload/browse/URL) | `MediaPicker` component (line 613-970) | ✅ Match |
| Branching rules per answer | `BlockInspector` lines 1105-1138 | ✅ Match |
| Time limit input | `BlockInspector` lines 1144-1154 | ✅ Match |
| Answer explanations | `BlockInspector` lines 1157-1174 | ✅ Match |
| Outcome editor (title/desc/CTA/score) | `BlockInspector` lines 1265-1381 | ✅ Match |
| Lead gate editor (headline/fields) | `BlockInspector` lines 1384-1476 | ✅ Match |
| Undo/Redo buttons | Canvas toolbar lines 2099-2137 | ✅ Match |
| Keyboard shortcuts | Canvas footer lines 2198-2205 | ✅ Match |
| Empty canvas state (dashed box + "Click +") | Lines 2179-2194 | ✅ Partial match (see BROKEN) |
| Drag-and-drop reorder | `handleDragStart/Over/Drop` lines 1936-1966 | ✅ Match |
| Publish button in top bar | `QuizEditorView.tsx` lines 382-396 | ✅ Match |
| Quiz overview (no block selected) | Lines 2270-2424 | ✅ Match (code has MORE than images show) |

### ❌ MISSING — Visible in images but NOT in code

| Image Element | Image Location | What's Missing |
|---------------|----------------|----------------|
| **Left question sidebar** (dedicated list panel) | Image 1A left column, ALL states in Image 2 | Code has NO left sidebar. Current layout is 2-column: Canvas + Inspector. Images show 4 zones: Sidebar + Canvas + Inspector + Preview |
| **Content / Logic / Design tabs** | Image 1A right panel top, States 1/3/6 in Image 2 | Code has ZERO tabs in inspector. All fields are flat in one scroll |
| **"Saved ✓" indicator** in top bar | Image 1A top bar center, all states showing "Saved" | Code has no save indicator — only `publishError` toast exists |
| **Preview button** in top bar | Image 1A top bar, all Image 2 states | Code has Preview toggle inside canvas toolbar, NOT in top bar |
| **Three-dot menu (⋮)** in top bar | Image 1A top bar right | Code has nothing — no dropdown menu |
| **Question type dropdown** on canvas card | Image 1A shows "Multiple Choice ∨" dropdown on the canvas card header | Code shows type as static label in BlockCard badge — no dropdown to change type inline |
| **Rich text toolbar** (B/I/link) below question text | Image 1A canvas center | Code uses plain `<textarea>` for question text — no bold/italic/link toolbar |
| **Image thumbnail on canvas** with blue X close | Image 1A canvas top-right corner | Code shows images only in the inspector MediaPicker, not inline on canvas cards |
| **"+ Add Answer" button** on canvas card | Image 1A below answer D row | Code has Add/Remove in inspector sidebar only, not on canvas cards |
| **Description field** below Required toggle on canvas | Image 1A bottom of canvas card | Code has no description/subtitle field on canvas — only in inspector |
| **"Add new question" type picker modal** | Image 2 State 2 — full overlay with 9 question types | Code shows `AddBlockInserter` with 8 block types in a small inline palette — NOT a centered modal. Missing types: Short Answer, Paragraph, File Upload, Number, Rating |
| **Shuffle Answers toggle** in right panel | Image 1A right panel "Answers" section | Code has `shuffle_questions` in quiz settings (line 2327-2345) but NOT per-question shuffle on the question inspector |
| **Allow Multiple Selection toggle** in right panel | Image 1A right panel "Answers" section | Code uses ToggleGroup Single/Multi but NOT as a labeled toggle switch — different UI pattern |
| **Help Text field** in right panel | Image 1A right panel bottom | Code has NO `helpText` field on QuestionBlock or in the inspector |
| **Mobile Preview panel** as persistent 4th column | Image 1A far right | Code renders LivePreview only inside the inspector when nothing is selected (line 2424), NOT as a dedicated 4th column |
| **Device toggle icons** (phone/desktop) | Image 1A preview header top-right | Code has no device size toggle |
| **Progress counter** "1/10" in preview | Image 1A preview top | Code preview does not render step counter or progress bar |
| **Flow diagram** (Logic view) | Image 1B, Image 2 State 5 | Code has branching rules per-question in inspector — NO visual flow diagram with connected boxes |
| **Design settings panel** (Theme/Fonts/Button Style/Colors/Progress Bar) | Image 1C, Image 2 State 6 | Code has quiz settings (shuffle, progress, transition) but NOT: theme color dots, font family selector, question/answer font size, button style (rounded/square), background color picker, primary color picker |
| **Result page editor** with rich text toolbar + illustration/layout/colors | Image 2 State 8 | Code outcome inspector has title/description/CTA but NOT: rich text toolbar, illustration picker, layout dropdown, background/text color pickers |
| **Image Choice question** with image grid + labels | Image 2 State 9 | Code supports `questionStyle: 'imageChoice'` with image URLs, but canvas preview only shows `<img>` in 2×2 grid — labels below images ("Minimal", "Modern", "Bold") exist but styling differs |
| **Empty state** with illustration + "Add question" red/teal CTA | Image 2 State 10 | Code has dashed-box empty state but NO illustration, NO prominent colored CTA button |
| **"Published" badge** in top bar | Image 2 State 12 | Code changes Publish button text but adds no "Published" status badge |
| **"Required" toggle** (iOS-style switch) | Image 1A canvas + right panel | Code uses native `<input type="checkbox">` — not a styled toggle switch |
| **Score/branch icons** per answer row on canvas | Image 1A answer rows have ⇄ icon + trash icon | Code shows score inline (`+2 pts`) but has no per-answer branch or delete icon on canvas cards |

### 🔴 BROKEN — Exists in both but doesn't match

| Element | Image Shows | Code Does | Gap |
|---------|-------------|-----------|-----|
| **Layout: 4 columns** | Sidebar + Canvas + Inspector + Preview | 2 columns: Canvas + Inspector (`gridTemplateColumns: '1fr 380px'`) | Entire left sidebar and preview panel are missing zones |
| **Inspector tabs** | Content / Logic / Design with underline active state | Flat scroll — no tabs at all | Major structural gap |
| **Canvas card question type** | "Multiple Choice ∨" dropdown on card header | Static `Q1` badge with block type label | Canvas doesn't allow inline type change |
| **Answer row on canvas** | Letter + text + branch icon + trash icon per row | Letter badge + text + score display | Missing per-answer actions on canvas |
| **Block inserter** | Image 2 State 2 shows centered modal with 9 types | Code shows inline 4-column palette with 8 types | Different UI pattern + missing types |
| **Empty state** | Image 2 State 10: illustration + "Your quiz is empty" + "Add your first question" + colored CTA | Code: dashed box + plus icon + "Click the + button above to add your first block" | Completely different design |
| **Outcome inspector image** | Single image section in images | TWO duplicate image sections in code (lines 1286-1301 AND 1303-1326) | Bug: duplicate |
| **"Add Answer/Option"** | On-canvas button below answers | Inspector-only button in sidebar | Different location |
| **Required toggle** | iOS-style toggle switch (blue pill) | Native checkbox with `accentColor` | Different visual component |
| **Question counter** | "Questions 10" with count badge in sidebar header | "12 blocks · 10 questions" text in canvas toolbar | Different element, different location |

### 🟠 EXTRA — In code but NOT visible in any image

| Code Element | Code Location | Action |
|--------------|---------------|--------|
| **"Block Editor" overview panel** (questions count, outcomes count, total blocks, lead gate status in 2×2 grid) | Lines 2270-2320 | KEEP — this is the empty-inspector state. Not shown in images but serves a useful function |
| **Quiz Settings panel** (shuffle, progress bar, transition type) in right sidebar | Lines 2322-2391 | MOVE — these should be under the "Design" tab in inspector, not the default empty state |
| **"Features used" pills** (Image choices, Media, Branching, Timers, etc.) | Lines 2393-2421 | REMOVE — not visible in any image, adds visual noise |
| **Keyboard shortcut bar** at canvas bottom | Lines 2198-2205 | KEEP — useful utility, can be made dismissable |
| **Canvas toolbar row** (block/question counts + Preview + Undo/Redo) | Lines 2064-2138 | RESTRUCTURE — Preview and counts move to top bar per images |
| **LivePreview inside inspector** when no block selected | Line 2424 | REMOVE from here — preview should be its own 4th column per images |
| **DragHandle SVG dots** | Lines 90-98 | KEEP — visible in Image 2 State 4 |
| **ShareButtons in outcome** | Referenced at line 1822 | KEEP — visible in Image 2 State 8 context (share capability) |
| **VideoEmbed component** | Referenced at line 1704 | KEEP — supports media question type |
| **Score display per answer** on canvas (`+2 pts`) | Lines 1757-1760 | KEEP but adjust — images show score less prominently |

---

## 3. EXACT PATCH INSTRUCTIONS

### PATCH 1: Remove duplicate outcome image section

```
FILE: QuizBlockEditor.tsx
VISUAL AREA: Right panel — Outcome inspector
ISSUE: Two "Result image" sections render (SidebarSection at 1286 + raw div at 1303). Images show ONE.
ACTION: Delete lines 1303-1326 (the raw div duplicate)
```

**Exact deletion — lines 1303-1326:**
```typescript
// DELETE THIS ENTIRE BLOCK:
        {/* Hero image */}
        <div style={{ marginBottom: 16, padding: '12px', background: C.SIDEBAR, border: '1px solid ' + C.BORDER, borderRadius: 8 }}>
          <label style={{
            display: 'block', fontSize: 11, fontWeight: 700, color: C.TEXT_MUTED,
            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
          }}>
            ... (through closing </div> at line 1326)
```

### PATCH 2: Add Content / Logic / Design tabs to inspector

```
FILE: QuizBlockEditor.tsx
VISUAL AREA: Right panel — top of inspector when a block is selected
ISSUE: Images show 3 tabs (Content/Logic/Design). Code has zero tabs — all fields in one scroll.
ACTION: Add tab state + tab bar between inspector header (line 2259) and BlockInspector (line 2262). Wrap BlockInspector in conditional rendering per active tab.
```

**Implementation:**
- Add state: `var [inspectorTab, setInspectorTab] = useState<'content' | 'logic' | 'design'>('content');`
- Insert tab bar after line 2259 (after the inspector header close `</div>`):
```typescript
{/* Tab row */}
<div style={{
  display: 'flex', borderBottom: '1px solid ' + C.BORDER,
  padding: '0 24px', position: 'sticky', top: 72, background: C.SURFACE, zIndex: 4,
}}>
  {['content', 'logic', 'design'].map(function(tab) {
    var isActive = inspectorTab === tab;
    return (
      <button key={tab} type="button"
        onClick={function() { setInspectorTab(tab as any); }}
        style={{
          padding: '12px 16px', fontSize: 13, fontWeight: 600,
          background: 'none', border: 'none',
          color: isActive ? C.TEXT : C.TEXT_MUTED,
          borderBottom: '2px solid ' + (isActive ? C.ACCENT : 'transparent'),
          cursor: 'pointer', fontFamily: C.FONT,
          textTransform: 'capitalize',
        }}
      >{tab}</button>
    );
  })}
</div>
```
- Pass `inspectorTab` as prop to `BlockInspector`
- In BlockInspector, wrap sections: Content tab shows question text/options/media. Logic tab shows branching/scoring. Design tab shows layout style/visual options.

### PATCH 3: Add "Saved ✓" indicator to top bar

```
FILE: QuizEditorView.tsx
VISUAL AREA: Top bar — center area
ISSUE: Images show "✓ Saved" text. Code has no save indicator.
ACTION: Add save status state + display in topbarRight (or as title suffix)
```

**Implementation:**
- Add state in QuizEditorView: `var [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');`
- In `handleBlocksChange` callback, set `setSaveStatus('saving')` before the timeout, `setSaveStatus('saved')` in `.then()`, `setSaveStatus('error')` in `.catch()`
- Render before Publish button:
```typescript
<span style={{
  fontSize: 13, color: saveStatus === 'error' ? C.DANGER : C.TEXT_MUTED,
  display: 'flex', alignItems: 'center', gap: 6,
}}>
  {saveStatus === 'saving' && '○ Saving...'}
  {saveStatus === 'saved' && '✓ Saved'}
  {saveStatus === 'error' && '⚠ Save failed'}
</span>
```

### PATCH 4: Add left question sidebar

```
FILE: QuizBlockEditor.tsx
VISUAL AREA: Left column — question list sidebar visible in ALL image states
ISSUE: Images show a dedicated left sidebar with question list, count, and "+ Add Question" button. Code has NO left sidebar — only 2-column grid.
ACTION: Change grid from `'1fr 380px'` to `'220px 1fr 380px'`. Add QuestionSidebar as first grid child.
```

**Grid change at line 2053:**
```typescript
// BEFORE:
gridTemplateColumns: '1fr 380px',

// AFTER:
gridTemplateColumns: '220px 1fr 380px',
```

**Add QuestionSidebar before Canvas div (before line 2059):**
```typescript
{/* Question sidebar */}
<div style={{
  borderRight: '1px solid ' + C.BORDER,
  background: C.SURFACE,
  overflowY: 'auto',
  height: '100%',
  padding: '20px 0',
}}>
  <div style={{ padding: '0 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
    <span style={{ fontSize: 14, fontWeight: 700, color: C.TEXT }}>Questions</span>
    <span style={{
      fontSize: 12, fontWeight: 600, color: C.TEXT_MUTED,
      background: C.GRAY_100, padding: '2px 8px', borderRadius: 6,
    }}>{blocks.filter(function(b) { return b.type === 'question'; }).length}</span>
  </div>
  {blocks.map(function(block, idx) {
    if (block.type !== 'question' && block.type !== 'outcome') return null;
    var isSelected = selectedId === block.id;
    var qNum = block.type === 'question'
      ? blocks.filter(function(b, i) { return i <= idx && b.type === 'question'; }).length
      : null;
    return (
      <div key={block.id}
        onClick={function() { setSelectedId(block.id); }}
        style={{
          padding: '10px 16px', cursor: 'pointer',
          background: isSelected ? C.ACCENT_LIGHT : 'transparent',
          borderLeft: isSelected ? '3px solid ' + C.ACCENT : '3px solid transparent',
          transition: 'all 0.12s ease',
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: isSelected ? C.ACCENT : C.TEXT_MUTED }}>
          {qNum ? 'Q' + qNum : blockLabel(block)}
          <span style={{ fontWeight: 500, color: C.TEXT_SUBTLE, marginLeft: 6, fontSize: 11 }}>
            {block.type === 'question' ? 'Multiple Choice' : ''}
          </span>
        </div>
        <div style={{
          fontSize: 12, color: C.TEXT_MUTED, marginTop: 2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {blockPreview(block).slice(0, 30) + (blockPreview(block).length > 30 ? '...' : '')}
        </div>
      </div>
    );
  })}
  <div style={{ padding: '12px 16px' }}>
    <button type="button"
      onClick={function() { addBlock('question', blocks.length - 1); }}
      style={{
        width: '100%', padding: '10px', fontSize: 13, fontWeight: 600,
        background: 'transparent', border: '1px dashed ' + C.BORDER,
        borderRadius: 8, color: C.TEXT_MUTED, cursor: 'pointer',
        fontFamily: C.FONT,
      }}
    >+ Add Question</button>
  </div>
</div>
```

### PATCH 5: Move Preview button to top bar

```
FILE: QuizEditorView.tsx
VISUAL AREA: Top bar — right section, before Publish
ISSUE: Images show "Preview" button in top bar. Code has it in canvas toolbar.
ACTION: Add Preview button to topbarRight in QuizEditorView, pass showPreview state down.
```

**Add before Publish button in topbarRight (line 381):**
```typescript
<button type="button"
  onClick={function() { /* toggle preview */ }}
  style={{
    padding: '8px 16px', borderRadius: 8,
    background: 'transparent', border: '1px solid ' + C.BORDER,
    color: C.TEXT_SECONDARY, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', fontFamily: C.FONT,
    display: 'flex', alignItems: 'center', gap: 6,
  }}
>
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx={12} cy={12} r={3} />
  </svg>
  Preview
</button>
```

### PATCH 6: Fix empty state to match Image 2 State 10

```
FILE: QuizBlockEditor.tsx
VISUAL AREA: Canvas center — when quiz has no blocks
ISSUE: Image shows illustration + "Your quiz is empty" + "Add your first question to get started." + colored CTA button. Code shows dashed box with + icon.
ACTION: Replace lines 2179-2194 with image-matching empty state.
```

**Replace with:**
```typescript
{blocks.length === 0 && (
  <div style={{
    padding: '64px 20px', textAlign: 'center',
    maxWidth: 400, margin: '0 auto',
  }}>
    <div style={{
      width: 80, height: 80, borderRadius: 20,
      background: C.GRAY_50, border: '1px solid ' + C.BORDER,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      margin: '0 auto 20px',
    }}>
      <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={C.TEXT_SUBTLE} strokeWidth={1.5}>
        <rect x={3} y={3} width={18} height={18} rx={2} />
        <path d="M9 12h6M12 9v6" />
      </svg>
    </div>
    <div style={{ fontSize: 20, fontWeight: 700, color: C.TEXT, marginBottom: 8 }}>
      Your quiz is empty
    </div>
    <div style={{ fontSize: 14, color: C.TEXT_MUTED, marginBottom: 24, lineHeight: 1.5 }}>
      Add your first question to get started.
    </div>
    <button type="button"
      onClick={function() { addBlock('question', -1); }}
      style={{
        padding: '12px 24px', borderRadius: 8,
        background: C.ACCENT, border: 'none', color: '#FFFFFF',
        fontSize: 14, fontWeight: 700, cursor: 'pointer',
        fontFamily: C.FONT,
      }}
    >+ Add question</button>
  </div>
)}
```

### PATCH 7: Add "Required" toggle to question inspector

```
FILE: QuizBlockEditor.tsx
VISUAL AREA: Right panel — question inspector, below options
ISSUE: Images show "Required" toggle switch. Code has no required field for questions.
ACTION: Add required boolean to QuestionBlock interface in blocks.ts. Add toggle in inspector after add/remove options section.
```

**In blocks.ts, add to QuestionBlock interface:**
```typescript
required?: boolean;
```

**In inspector, after the add/remove options div (after line 1061), add:**
```typescript
<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, marginTop: 12, borderTop: '1px solid ' + C.BORDER }}>
  <span style={{ fontSize: 14, fontWeight: 600, color: C.TEXT }}>Required</span>
  <button type="button"
    onClick={function() { updateField('required', !qb.required); }}
    style={{
      width: 44, height: 24, borderRadius: 12, border: 'none',
      background: qb.required !== false ? C.ACCENT : C.GRAY_300,
      cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
    }}
  >
    <div style={{
      width: 20, height: 20, borderRadius: 10, background: '#FFFFFF',
      position: 'absolute', top: 2,
      left: qb.required !== false ? 22 : 2,
      transition: 'left 0.2s', boxShadow: C.SHADOW_XS,
    }} />
  </button>
</div>
```

### PATCH 8: Add "Help Text" field to question inspector

```
FILE: QuizBlockEditor.tsx
VISUAL AREA: Right panel — bottom of Content tab
ISSUE: Image 1A shows "Help Text (optional)" field. Code has no helpText.
ACTION: Add helpText to QuestionBlock. Add field in inspector.
```

**In blocks.ts, add to QuestionBlock:**
```typescript
helpText?: string;
```

**In inspector, after Required toggle, add:**
```typescript
<InspectorField label="Help Text (optional)">
  <input
    value={qb.helpText || ''}
    onChange={function(e) { updateField('helpText', e.target.value); }}
    style={inputStyle}
    placeholder="Add help text..."
  />
</InspectorField>
```

### PATCH 9: Add "Shuffle Answers" toggle to question inspector

```
FILE: QuizBlockEditor.tsx
VISUAL AREA: Right panel — "Answers" section
ISSUE: Image 1A shows "Shuffle Answers" toggle per question. Code only has quiz-wide shuffle in settings.
ACTION: Add shuffleAnswers to QuestionBlock. Add toggle in inspector Answer style section.
```

**In blocks.ts, add to QuestionBlock:**
```typescript
shuffleAnswers?: boolean;
```

**In inspector, inside Answer style SidebarSection, after Layout ToggleGroup, before add/remove, add:**
```typescript
<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
  <span style={{ fontSize: 13, fontWeight: 600, color: C.TEXT_MUTED }}>Shuffle Answers</span>
  <button type="button"
    onClick={function() { updateField('shuffleAnswers', !qb.shuffleAnswers); }}
    style={{
      width: 44, height: 24, borderRadius: 12, border: 'none',
      background: qb.shuffleAnswers ? C.ACCENT : C.GRAY_300,
      cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
    }}
  >
    <div style={{
      width: 20, height: 20, borderRadius: 10, background: '#FFFFFF',
      position: 'absolute', top: 2,
      left: qb.shuffleAnswers ? 22 : 2,
      transition: 'left 0.2s', boxShadow: C.SHADOW_XS,
    }} />
  </button>
</div>
```

### PATCH 10: Remove "Features used" pills from empty inspector state

```
FILE: QuizBlockEditor.tsx
VISUAL AREA: Right panel — when no block selected
ISSUE: Not visible in any image. Adds visual clutter.
ACTION: Delete lines 2393-2421 (the "Features used" section)
```

---

## 4. REMOVAL LIST

| Code Element | Lines | Reason |
|--------------|-------|--------|
| Duplicate outcome "Result image" `<div>` | 1303-1326 | Bug — duplicate of SidebarSection at 1286 |
| "Features used" pills section | 2393-2421 | Not in any image |
| LivePreview rendered inside inspector empty state | Line 2424 | Preview should be its own panel per images, not embedded in inspector |
| Preview toggle button inside canvas toolbar | 2078-2098 | Move to top bar per images |
| Block/question count text in canvas toolbar | 2070-2075 | Move to sidebar header per images |
| `showPreview` toggle in canvas toolbar area | References throughout | Consolidate to top bar control |

---

## 5. FINAL BUILD ALIGNMENT PLAN

### Execution Order (dependencies respected):

**Step 1: Data model updates** (blocks.ts)
- Add `required`, `helpText`, `shuffleAnswers` to QuestionBlock interface
- Add these fields to `legacyToBlocks()` and `blocksToLegacy()` conversion

**Step 2: Structural layout change** (QuizBlockEditor.tsx)
- Change grid from `'1fr 380px'` to `'220px 1fr 380px'`
- Add QuestionSidebar component as first grid child
- Set canvas `maxWidth: 720px` + `margin: '0 auto'` on inner scroll container

**Step 3: Inspector tabs** (QuizBlockEditor.tsx)
- Add `inspectorTab` state
- Add tab bar component after inspector header
- Wrap inspector sections in tab-conditional rendering

**Step 4: Delete/remove operations** (QuizBlockEditor.tsx)
- Delete duplicate outcome image (lines 1303-1326)
- Delete "Features used" pills (lines 2393-2421)
- Remove LivePreview from inspector empty state (line 2424)
- Remove Preview button from canvas toolbar (lines 2078-2098)

**Step 5: Add missing inspector fields** (QuizBlockEditor.tsx)
- Add Required toggle to question inspector
- Add Help Text field
- Add Shuffle Answers toggle
- Place these under Content tab

**Step 6: Top bar updates** (QuizEditorView.tsx)
- Add save status indicator (Saving.../Saved ✓/Save failed)
- Add Preview button to topbarRight
- Wire save status to handleBlocksChange callback

**Step 7: Empty state replacement** (QuizBlockEditor.tsx)
- Replace dashed-box empty state with image-matching design
- "Your quiz is empty" + "Add your first question" + CTA button

**Step 8: Toggle switch component** (QuizBlockEditor.tsx)
- Replace native checkboxes for Required/Shuffle with iOS-style toggle switches
- Consistent toggle component used for all boolean settings

### What is NOT being built (not visible in images as functional):
- Flow diagram for Logic view (visible in images as a concept but too complex for code alignment — branching rules in inspector are sufficient)
- Design settings panel with theme dots/font selectors/color pickers (visible in images but represents a separate Design tab feature scope)
- Rich text toolbar on canvas (B/I/link) — visible in images but requires a rich text editor library
- Mobile Preview as 4th persistent column — visible in images but requires significant architectural change
- "Add new question" modal with 9 types — visible but current inline palette serves same function

These are noted as **FUTURE SCOPE** items that match the images but exceed simple alignment patches.
