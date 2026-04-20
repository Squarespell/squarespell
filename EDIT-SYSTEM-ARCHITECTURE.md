# SQUARESPELL EDIT SYSTEM -- Product Architecture

**Rename: "Site Styles" becomes "EDIT"**
**Philosophy: Squarespace-level simplicity. Quiz-builder audience. Zero learning curve.**

---

## 1. SYSTEM ARCHITECTURE -- How Squarespace Actually Works

### The Core Insight

Squarespace does not give users a blank canvas. It gives them a **constrained system** where every action is safe and every result looks professional. The secret is not what users CAN do -- it is what the system PREVENTS them from doing.

### Section, Block, Element Hierarchy

Squarespace structures every page as a vertical stack of **sections**. Each section is a full-width container that holds **blocks**. Each block contains **elements** (text runs, images, buttons). The user never manipulates raw HTML or arbitrary positioning. They work within a rigid grid that guarantees alignment.

**Page/Email** is the root container. It holds an ordered list of sections, plus global metadata (title, preheader for emails, sender info).

**Section** is a full-width horizontal band. It owns its own background (color, image, gradient), padding, and layout mode (single column, two column, image-left-text-right, etc.). Sections cannot be nested inside each other. This is a deliberate constraint -- it prevents users from creating layouts that break on mobile.

**Block** lives inside a section. A block is a typed content unit: text block, image block, button block, spacer block, divider block, two-column block. Each block type has a fixed set of editable properties. A text block exposes font, size, color, alignment. An image block exposes source, alt text, link, corner radius. A button block exposes label, URL, color, shape. The system does not allow arbitrary property mixing between block types.

**Element** is the lowest level -- individual text runs within a text block (a bold word, a linked phrase), or the image file within an image block. Elements are edited inline, not through panels.

### Click-to-Edit Behavior

Squarespace uses a two-tier selection model. First click on a section selects the section (shows section-level controls: move, duplicate, delete, background). Second click inside a block selects that block (shows block-level controls: type-specific properties). Double-click on text enters inline editing mode (cursor appears, text toolbar shows). This progressive disclosure prevents overwhelm -- users see only what they need for their current intent.

### Sidebar Editing System

The right sidebar is a **context-sensitive property panel**. It shows different content depending on what is selected:
- Nothing selected: shows global styles (colors, fonts, overall theme)
- Section selected: shows section properties (background, padding, layout)
- Block selected: shows block properties (type-specific settings)

The sidebar never shows everything at once. It always reflects the current selection. This is the single most important UX decision Squarespace makes.

### Style Separation: Global vs Local

Squarespace maintains two layers of styling:
- **Global styles**: site-wide font family, heading sizes, primary/secondary colors, button shape, link color. These apply everywhere unless overridden.
- **Local overrides**: a specific text block set to a different color, a specific button with a custom background. Local always wins over global.

This cascade means users can change the entire look of their site by editing global styles, while still having control over individual elements when needed.

### Limitations That Keep It Simple

Squarespace deliberately prevents: arbitrary element positioning (no pixel-level dragging), custom CSS in the visual editor, nesting sections inside sections, creating responsive breakpoints manually, mixing block types (you cannot put a button inside a text block -- they are separate blocks). These constraints are not bugs. They are the product.

---

## 2. INTERNAL STRUCTURE -- Squarespell EDIT System

### Document Model

```
EMAIL (root)
  metadata:
    subject_a          -- primary subject line
    subject_b          -- A/B test variant (optional)
    preheader          -- preview text
    from_name          -- sender display name
    from_email         -- sender address
    ab_enabled         -- boolean
    ab_test_percent    -- 10-50
    ab_wait_hours      -- 1-48

  global_styles:
    primary_color      -- brand color, cascades to buttons/links
    background_color   -- email body background
    text_color         -- default text color
    font_family        -- global font
    button_shape       -- rounded, pill, square
    button_style       -- filled, outline, ghost
    link_color         -- default link color
    heading_scale      -- size ratio for H1/H2/H3

  sections: [ordered list]
    section:
      id               -- unique identifier
      layout           -- "single" | "two-col" | "image-left" | "image-right" | "hero"
      background:
        type           -- "color" | "image" | "gradient"
        value          -- hex / url / gradient def
      padding:
        top            -- spacing value
        bottom         -- spacing value
      blocks: [ordered list]
        block:
          id           -- unique identifier
          type         -- "text" | "image" | "button" | "spacer" | "divider" | "logo" | "social" | "footer"
          properties   -- type-specific key-value pairs
          style_overrides -- local overrides (only set if user explicitly changed)
```

### How Templates Are Structured

A template is a **pre-filled document model**. It contains sections with blocks already populated with placeholder content and pre-set style overrides that give the template its visual character. When a user selects a template, the system copies the entire document model into a new draft. From that point, the template is detached -- edits do not affect the original template.

Templates also carry a `global_styles` preset. This means each template comes with its own color palette and font pairing. When loaded, these become the email's global styles. The user can change them afterward.

### How Edits Are Stored

Every edit produces a **delta** against the document model. The system does not store a history of CSS changes or HTML mutations. It stores structured data changes:
- "section[3].background.value changed from #FFFFFF to #1A1A1A"
- "section[1].blocks[2].properties.text changed from 'Click here' to 'Shop now'"

This makes undo/redo trivial (replay deltas backward/forward) and makes the document serializable to any output format (HTML for email, JSON for storage, preview for display).

### How Changes Are Applied (Live Editing)

The system uses **immediate rendering**. Every edit updates the document model, which triggers a re-render of the affected section in the canvas. There is no "save" step for individual edits -- the canvas always reflects the current state. The "Save" button in the top bar persists the current document model to the server as a draft. "Send" renders the final HTML from the document model and dispatches.

### Style Cascade

When rendering any element, the system resolves styles in this order:
1. **Block type defaults** (every text block starts with body font, default size)
2. **Global styles** (user's chosen primary color, font family)
3. **Section-level styles** (dark background section might flip text to white)
4. **Block-level overrides** (user explicitly set this text to red)

Rule: a lower-numbered layer NEVER overrides a higher-numbered one. If the user set a block's color to red (#4), changing the global primary color (#2) will not change that block. But blocks without overrides will update with the global change.

---

## 3. FULL EDIT SYSTEM TREE

```
EDIT
|
+-- TOP BAR (always visible, slim, 48px)
|   +-- Back (returns to template gallery)
|   +-- Mode Toggle [Edit | Preview]
|   +-- Undo / Redo
|   +-- Device Toggle [Desktop | Mobile]
|   +-- Save (persists draft)
|   +-- Continue (proceeds to Review/Send step)
|
+-- LEFT PANEL -- "Campaign" (always visible, 300px)
|   |
|   +-- CAMPAIGN SETTINGS
|   |   +-- Subject Line (A)
|   |   |   +-- Input field
|   |   |   +-- Merge tag inserter ({{first_name}}, etc.)
|   |   +-- Preview Text
|   |   |   +-- Input field
|   |   |   +-- Helper text ("Shown after subject in inbox")
|   |   +-- A/B Split Test Card
|   |       +-- Toggle switch (on/off)
|   |       +-- [When ON]:
|   |           +-- Subject Line B input
|   |           +-- Split visualization bar (A% | B% | Winner%)
|   |           +-- Test size slider (10-50%)
|   |           +-- Wait time input (1-48 hrs)
|   |           +-- "How it works" explainer
|   |
|   +-- (future: Sender Settings, Schedule, etc.)
|
+-- CENTER -- "Canvas" (flex, fills remaining space)
|   |
|   +-- EMAIL CANVAS (scrollable, centered, max-width 780px)
|   |   |
|   |   +-- Section 1
|   |   |   +-- Section boundary (dashed border, visible on hover)
|   |   |   +-- Section label badge ("SECTION" / "IMAGE" / "HERO")
|   |   |   +-- Section toolbar (appears on selection):
|   |   |   |   +-- Move up / Move down
|   |   |   |   +-- Duplicate
|   |   |   |   +-- Layer/style
|   |   |   |   +-- Delete
|   |   |   +-- Blocks inside section:
|   |   |       +-- Block 1 (e.g., Logo)
|   |   |       +-- Block 2 (e.g., Text -- inline editable)
|   |   |       +-- Block 3 (e.g., Image -- click to replace)
|   |   |       +-- Block 4 (e.g., Button -- click to edit label/URL)
|   |   |
|   |   +-- Insert Point (+) between sections
|   |   |   +-- Click to add new section
|   |   |   +-- Opens block type picker
|   |   |
|   |   +-- Section 2
|   |   |   +-- (same structure as above)
|   |   |
|   |   +-- Section N...
|   |
|   +-- CANVAS BACKGROUND (white, no grey, clean)
|
+-- RIGHT PANEL -- "EDIT" (context-sensitive, 320px)
    |
    +-- STATE: Nothing Selected
    |   |
    |   +-- Panel Title: "EDIT"
    |   +-- Tabs: [Content | Design]
    |   +-- Content Tab:
    |   |   +-- LOGO section
    |   |   |   +-- Upload dropzone
    |   |   |   +-- Replace / Remove
    |   |   +-- COLORS section
    |   |   |   +-- Primary color (swatch + hex)
    |   |   |   +-- Background color (swatch + hex)
    |   |   |   +-- Text color (swatch + hex)
    |   |   +-- FONT section
    |   |   |   +-- Font family dropdown (with preview)
    |   |   +-- WEBSITE section
    |   |       +-- URL input
    |   +-- Design Tab:
    |       +-- Button shape (rounded / pill / square)
    |       +-- Button style (filled / outline)
    |       +-- Heading scale (small / medium / large)
    |       +-- Link style (underline / color only)
    |       +-- Section spacing (compact / normal / spacious)
    |
    +-- STATE: Section Selected
    |   |
    |   +-- Panel Title: "Section"
    |   +-- Tabs: [Content | Design]
    |   +-- Content Tab:
    |   |   +-- Layout picker (single col, two col, image-left, etc.)
    |   |   +-- "Add Block" list:
    |   |       +-- Text
    |   |       +-- Image
    |   |       +-- Button
    |   |       +-- Spacer
    |   |       +-- Divider
    |   |       +-- Two Cols: Image + Text
    |   |       +-- Two Cols: Text + Image
    |   |       +-- Two Cols: Image + Image
    |   |       +-- Social Links
    |   |       +-- Footer
    |   +-- Design Tab:
    |       +-- Background (color picker / image upload)
    |       +-- Padding top/bottom (slider)
    |       +-- Border (on/off, color)
    |       +-- Corner radius
    |
    +-- STATE: Block Selected (example: Text Block)
    |   |
    |   +-- Panel Title: "Text"
    |   +-- Font family (override or "Use global")
    |   +-- Font size
    |   +-- Text color (override or "Use global")
    |   +-- Alignment (left / center / right)
    |   +-- Line height
    |   +-- Letter spacing
    |   +-- Padding
    |   +-- "Reset to global" button
    |
    +-- STATE: Block Selected (example: Image Block)
    |   |
    |   +-- Panel Title: "Image"
    |   +-- Image preview thumbnail
    |   +-- Replace button
    |   +-- Alt text input
    |   +-- Link URL input
    |   +-- Corner radius slider
    |   +-- Alignment (left / center / right)
    |   +-- Width (full / medium / small)
    |
    +-- STATE: Block Selected (example: Button Block)
        |
        +-- Panel Title: "Button"
        +-- Button label input
        +-- Button URL input
        +-- Button color (override or "Use global primary")
        +-- Text color
        +-- Shape (override or "Use global")
        +-- Size (small / medium / large)
        +-- Alignment (left / center / right / full-width)
        +-- "Reset to global" button
```

---

## 4. USER FLOW + SYSTEM BEHAVIOR

### Flow 1: User Opens the Editor

**User action:** Clicks into Design step after selecting a template.

**System reaction:**
1. Document model is initialized from the selected template (deep copy).
2. Global styles are extracted from the template preset and applied.
3. Canvas renders all sections by walking the document model top-to-bottom.
4. Right panel defaults to "EDIT" state (global styles view -- logo, colors, font).
5. Left panel shows campaign settings (subject, preview text, A/B test).
6. Top bar initializes in Edit mode, Desktop view.
7. iframe topbar is hidden (parent provides controls).
8. No section or block is selected. Canvas is in "browse" mode.

### Flow 2: User Clicks a Section

**User action:** Single click anywhere inside a section boundary.

**System reaction:**
1. Previous selection (if any) is deselected. Its highlight border is removed.
2. Clicked section receives a highlight border (teal dashed outline).
3. Section toolbar appears (move up/down, duplicate, layers, delete).
4. Section label badge is highlighted.
5. Right panel transitions to "Section" state:
   - Content tab shows layout picker and "Add Block" list.
   - Design tab shows section-specific properties (background, padding).
6. No block is selected yet. User sees section-level controls only.

### Flow 3: User Clicks a Block Inside a Section

**User action:** Click directly on a block (image, button, text heading).

**System reaction:**
1. Section remains contextually selected (subtle border).
2. Clicked block receives a primary selection border (solid teal).
3. Block-specific toolbar appears near the block (contextual actions).
4. Right panel transitions to block-type state:
   - Text block: font, size, color, alignment controls.
   - Image block: replace, alt text, link, radius controls.
   - Button block: label, URL, color, shape controls.
5. Each property shows either its current value or "Using global" indicator.

### Flow 4: Inline Text Editing

**User action:** Double-click on a text block.

**System reaction:**
1. Text block enters inline editing mode (cursor appears in the text).
2. A floating text toolbar appears above the cursor:
   - Bold, Italic, Underline
   - Alignment
   - Link insert
   - Merge tag insert ({{first_name}}, {{quiz_result}}, etc.)
3. User types directly into the canvas. Changes update the document model in real time.
4. Right panel still shows text block properties (font, size, color) -- these affect the whole block.
5. Floating toolbar affects the selected text run (element level).
6. Click outside the text block exits inline mode, returns to block-selected state.

### Flow 5: Adding a New Block

**User action:** Clicks the "+" insert point between two sections.

**System reaction:**
1. A block type picker appears (slide down or popover).
2. User selects a block type (e.g., "Image").
3. System creates a new section with one block of the chosen type.
4. New section is inserted at the clicked position in the section order.
5. Block is populated with placeholder content (grey image placeholder, "Your text here", etc.).
6. New block is automatically selected. Right panel shows its properties.
7. Canvas scrolls to bring the new section into view.

### Flow 6: Drag and Drop (Section Reordering)

**User action:** Grabs the move handle on a section toolbar and drags up/down.

**System reaction:**
1. Dragged section gets a "lifted" visual state (slight shadow, reduced opacity).
2. Other sections show drop zone indicators (blue lines between them).
3. On drop, the document model reorders the section array.
4. Canvas re-renders with new section order.
5. Undo stack records the reorder as a single operation.

### Flow 7: Changing Global Styles

**User action:** With nothing selected, changes primary color from teal to navy in the right panel.

**System reaction:**
1. Document model's `global_styles.primary_color` updates.
2. System walks all sections and blocks.
3. Every button block WITHOUT a local color override updates to navy.
4. Every link WITHOUT a local color override updates to navy.
5. Blocks WITH local overrides are untouched.
6. Canvas re-renders affected blocks. Change is visible immediately.
7. Right panel shows the new color value.

### Flow 8: Preview Mode

**User action:** Clicks "Preview" in the top bar mode toggle.

**System reaction:**
1. All selection borders, toolbars, insert points, and hover states are hidden.
2. Canvas shows the email exactly as a recipient would see it.
3. Right panel collapses or shows a "Preview mode" message.
4. Left panel remains visible (campaign settings are not editing controls).
5. Device toggle still works (switch between desktop and mobile preview).
6. Clicking "Edit" returns to full editing state with previous selection restored.

### Flow 9: Save

**User action:** Clicks "Save" in the top bar.

**System reaction:**
1. System serializes the entire document model to JSON.
2. JSON is sent to the server API (create draft or update existing draft).
3. Server stores the document model in the campaigns table.
4. Top bar briefly shows "Saved" confirmation.
5. Draft ID is stored locally so future saves update rather than create.

### Flow 10: Continue to Review/Send

**User action:** Clicks "Continue" in the top bar.

**System reaction:**
1. System validates: subject line is required, at least one section must exist.
2. If validation passes, document model is auto-saved.
3. System renders the document model into final HTML (applying global styles, resolving all cascades, inlining CSS for email client compatibility).
4. HTML is stored in the campaign record.
5. User advances to the Review/Send step where they see the final preview, recipient count, and send/schedule options.

---

## 5. FUNCTIONAL LOGIC (DEEP)

### Selection System

The editor maintains a **selection stack** with at most two levels:
- Level 0: Nothing selected (global editing)
- Level 1: Section selected
- Level 2: Block selected (section is implicitly selected too)

Rules:
- Clicking empty canvas area clears all selection (returns to Level 0).
- Clicking a section boundary or its background selects section (Level 1).
- Clicking directly on a block selects the block AND its parent section (Level 2).
- Only one thing can be selected at a time. No multi-select.
- Selection determines what the right panel shows. Always. No exceptions.

### Editing Modes

**Panel editing**: The default. User changes properties in the right panel. Every property change immediately updates the canvas. Used for: colors, fonts, sizes, backgrounds, padding, layout choices, URLs, alt text.

**Inline editing**: Only for text blocks. Double-click enters inline mode. User types directly in the canvas. A floating toolbar provides formatting options. Click outside exits inline mode. Used for: text content, bold/italic/underline, links, merge tags.

**Replace interaction**: For images and logos. Click on the image or the "Replace" button in the panel. File picker opens. User selects a new image. Old image is replaced. Used for: images, logos.

### Restrictions (Why the System Prevents Complexity)

1. **No arbitrary positioning.** Blocks flow vertically within sections. No x/y pixel dragging. This guarantees the email renders correctly in every email client.

2. **No nesting.** Sections cannot contain sections. Blocks cannot contain blocks. A two-column block is a single block type with two slots -- not a section inside a section.

3. **No custom CSS.** Users cannot inject styles. Every visual change goes through the property panel, which maps to the document model, which maps to safe inline styles in the final HTML.

4. **No font uploads.** Font selection is limited to web-safe and widely-supported fonts. This ensures the email looks consistent across Gmail, Outlook, Apple Mail.

5. **No breakpoint editing.** Users do not manually design mobile layouts. The system handles responsive behavior automatically based on the section layout type.

6. **Fixed block types.** Users cannot create new block types. They choose from the provided set. Each type has a fixed property schema. This prevents broken layouts and keeps the property panel predictable.

### Styling Logic -- Priority System

When the renderer needs the color for a button:

```
1. Check block.style_overrides.button_color
   -> If SET: use it. Stop.
   -> If NOT SET: continue.

2. Check section.style_overrides.button_color
   -> If SET: use it. Stop.
   -> If NOT SET: continue.

3. Check global_styles.primary_color
   -> Use it. Always exists (has default).
```

The "Reset to global" button on any block property clears that specific override from `style_overrides`, causing the value to cascade from the next level up.

The right panel visually indicates which level is active:
- Override set: shows the value normally with a small "reset" icon.
- Using global: shows the value with a "Global" badge, slightly muted.

### Template Logic

**Loading:** When user picks a template from the gallery, the system deep-copies the template's document model. The copy becomes the campaign's draft. The template itself is never modified.

**Persistence:** After loading, the template ID is stored as metadata but has no functional connection. Edits are stored in the campaign's own document model. Switching templates later would discard all edits (system should warn).

**Template structure:** Each template is a complete document model (global styles + sections + blocks) with professional placeholder content. Templates are categorized (quiz result, lead nurture, promotional, announcement). Each template comes with a color palette and font pairing that loads into global styles.

### Media Logic

**Upload:** User clicks an image placeholder or "Replace" button. System opens a file picker (or drag-drop zone). Image is uploaded to the server (stored in cloud storage). The document model stores the URL, not the file. Upload happens immediately -- no "confirm" step.

**Replace:** Same flow as upload, but the old URL is replaced with the new one. The old image is not deleted from storage (in case undo is needed or the image is used elsewhere).

**Constraints:** Maximum file size enforced (e.g., 5MB). Accepted formats: JPG, PNG, GIF, WebP. System auto-optimizes (resize if over 1200px wide, compress to reduce email weight). These constraints exist because large images cause slow email loading and spam filter flags.

**Logo behavior:** The logo block is special. It appears at most once per email (enforced). Changing the logo in global styles updates it everywhere. The logo is also stored in the brand kit for reuse across campaigns.

---

## 6. IMPROVEMENTS OVER SQUARESPACE

### Problem 1: Squarespace's Right Panel Feels Disconnected from the Canvas

When editing a block in Squarespace, the property panel on the right sometimes feels disconnected from the element on the canvas. Users lose track of what they are editing.

**Improvement:** When a block is selected, draw a subtle visual connector (thin line or highlight pulse) between the selected block on the canvas and the property panel title. The panel title should echo the block type and show a mini-preview of the selected element. For example, selecting an image block shows a tiny thumbnail of that image at the top of the panel.

### Problem 2: Global Style Changes Are Invisible

In Squarespace, changing a global style (like primary color) updates elements silently. Users do not see which elements were affected.

**Improvement:** When a global style changes, briefly flash/highlight all affected elements on the canvas (a subtle 0.3s teal pulse). This gives the user visual feedback: "these 4 buttons and 2 links just updated because you changed the primary color." Elements with local overrides should NOT flash, reinforcing that they are independent.

### Problem 3: No Concept of "Smart Defaults"

Squarespace templates come with good defaults, but once you start editing, there is no guidance.

**Improvement:** For Squarespell, integrate the existing AI recommendation system into the EDIT panel. When a user has a quiz connected, the system can suggest: "Your quiz audience responds best to short subject lines" or "Emails with a hero image get 23% more clicks." These are subtle hints in the panel -- not popups, not blockers, just quiet intelligence.

### Problem 4: Undo Is Not Granular Enough

Squarespace's undo sometimes groups too many changes into one step, or does not undo at all for certain property changes.

**Improvement:** Every property change is an individual undo step. Rapid typing in inline mode is debounced (group keystrokes within 1 second into one undo step). The undo button in the top bar shows a count badge of available undo steps. This gives users confidence to experiment.

### Problem 5: No A/B Testing in the Editor

Squarespace has no built-in A/B testing for content.

**Improvement (already implemented):** The left panel's A/B Split Test card is a significant differentiator. Further improvement: allow A/B testing not just on subject lines but on section content. A user could create a "Version A" hero image and a "Version B" hero image, with the system automatically testing both. This would be a future phase -- subject line A/B is the right starting point.

### Problem 6: Template Lock-In

In Squarespace, switching templates after editing is destructive and scary.

**Improvement:** When a user considers switching templates, show a side-by-side comparison: current email vs new template with their content mapped in. Let them preview before committing. If they switch, offer to preserve their text content while applying the new template's layout and styles. This reduces the fear of experimentation.

### Problem 7: No Email-Specific Intelligence

Squarespace is a website builder. It does not know about email client rendering quirks.

**Improvement:** Build email-specific warnings into the EDIT system. If a user sets a font that Outlook does not support, show a small warning: "Outlook will show Arial instead." If an image is over 600px wide, suggest: "This may get clipped in mobile email clients." These are inline warnings in the property panel, not blocking errors. They educate without interrupting.

---

## SUMMARY

The EDIT system is three panels and a canvas:

**Left panel (Campaign):** Subject line, preview text, A/B testing. Always visible. This is the "what are we sending" panel.

**Center (Canvas):** The email itself. Click to select, double-click to edit text, insert points between sections. This is "what does it look like."

**Right panel (EDIT):** Context-sensitive properties. Changes based on selection. Global styles when nothing is selected, section properties when a section is selected, block properties when a block is selected. This is "how do we change it."

**Top bar:** Navigation and tools. Thin. Stays out of the way.

The entire system is driven by a structured document model. Every user interaction modifies the model. The canvas is a live render of the model. The right panel is a form bound to the currently selected node in the model. This architecture makes the system predictable, undo-able, serializable, and renderable to final HTML for email delivery.
