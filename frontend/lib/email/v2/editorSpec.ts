// ============================================================================
// Phase 3: Tasks 3.4-3.6 - Editor UX Specification
// ============================================================================
// Inline editing interaction model, section controls, global style editor.
// This is the UX contract that the React editor components implement.
// ============================================================================

// ---------------------------------------------------------------------------
// Task 3.4 - Inline Editing Interaction Model
// ---------------------------------------------------------------------------

export interface InlineEditAction {
  element: string;
  trigger: string;
  uiBehavior: string;
  jsonMutation: string;
}

export const INLINE_EDIT_ACTIONS: InlineEditAction[] = [
  // Text blocks
  {
    element: 'paragraph',
    trigger: 'click',
    uiBehavior: 'Show blue outline around block. Floating toolbar appears above: Bold, Italic, Link, Align. Text becomes contentEditable.',
    jsonMutation: 'block.properties.html = element.innerHTML',
  },
  {
    element: 'heading',
    trigger: 'click',
    uiBehavior: 'Show blue outline. Inline text cursor activates. Toolbar: H1/H2/H3 toggle, Align, Color.',
    jsonMutation: 'block.properties.text = element.textContent; block.properties.level = selectedLevel',
  },
  {
    element: 'heading',
    trigger: 'double-click',
    uiBehavior: 'Select all text in heading for quick replacement.',
    jsonMutation: 'Same as single click - text becomes editable',
  },
  {
    element: 'blockquote',
    trigger: 'click',
    uiBehavior: 'Show outline. Quote text becomes editable. Citation and rating fields show in right inspector.',
    jsonMutation: 'block.properties.text = element.textContent',
  },

  // Image blocks
  {
    element: 'image',
    trigger: 'click',
    uiBehavior: 'Show outline with resize handles on corners. Floating toolbar: Replace Image, Add Link, Alt Text. Upload dialog on "Replace".',
    jsonMutation: 'block.properties.src = uploadedUrl; block.properties.width = resizedWidth',
  },
  {
    element: 'logo',
    trigger: 'click',
    uiBehavior: 'Show outline with width resize handle. Toolbar: Replace Logo, Width slider.',
    jsonMutation: 'block.properties.src = uploadedUrl; block.properties.width = newWidth',
  },

  // Button blocks
  {
    element: 'button',
    trigger: 'click',
    uiBehavior: 'Show outline. Button text becomes editable. Right inspector opens: URL field, variant picker (Primary/Secondary/Ghost), full-width toggle, color overrides.',
    jsonMutation: 'block.properties.text = element.textContent; block.properties.href = inputValue',
  },

  // Section background
  {
    element: 'section background',
    trigger: 'click empty area',
    uiBehavior: 'Section outline highlights. Right inspector shows: Background color picker, padding controls (top/bottom/left/right), border controls.',
    jsonMutation: 'section.styles.backgroundColor = pickerValue; section.styles.paddingTop = sliderValue',
  },

  // Score/quiz blocks
  {
    element: 'score_display',
    trigger: 'click',
    uiBehavior: 'Show outline. Right inspector: Score format (number/percentage/fraction), max score, label text, colors.',
    jsonMutation: 'block.properties.format = selected; block.styles.scoreColor = pickerValue',
  },
  {
    element: 'result_category',
    trigger: 'click',
    uiBehavior: 'Show outline. Eyebrow and category name become editable inline. Description editable in inspector.',
    jsonMutation: 'block.properties.eyebrow = text; block.properties.categoryName = text',
  },
  {
    element: 'recommendation_card',
    trigger: 'click',
    uiBehavior: 'Show outline. Title and body editable inline. Inspector: image upload, CTA text/URL, badge text, colors.',
    jsonMutation: 'block.properties.title = text; block.properties.body = text',
  },
];

// ---------------------------------------------------------------------------
// Task 3.5 - Section Controls
// ---------------------------------------------------------------------------

export interface SectionControl {
  control: string;
  icon: string;
  trigger: string;
  jsonMutation: string;
  edgeCases: string;
}

export const SECTION_CONTROLS: SectionControl[] = [
  {
    control: 'Move up',
    icon: 'M12 19V5M5 12l7-7 7 7',
    trigger: 'Click arrow-up icon on section hover toolbar (appears top-right of section)',
    jsonMutation: 'const idx = sections.indexOf(section); if (idx > 0) { sections.splice(idx, 1); sections.splice(idx - 1, 0, section); }',
    edgeCases: 'Disabled (grayed out) when section is first. Header section cannot move below body sections.',
  },
  {
    control: 'Move down',
    icon: 'M12 5v14M5 12l7 7 7-7',
    trigger: 'Click arrow-down icon on section hover toolbar',
    jsonMutation: 'const idx = sections.indexOf(section); if (idx < sections.length - 1) { sections.splice(idx, 1); sections.splice(idx + 1, 0, section); }',
    edgeCases: 'Disabled when section is last. Footer section cannot move above body sections.',
  },
  {
    control: 'Duplicate',
    icon: 'M9 9h13v13H9zM5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1',
    trigger: 'Click copy icon on section hover toolbar',
    jsonMutation: 'const clone = JSON.parse(JSON.stringify(section)); reassignIds(clone); sections.splice(idx + 1, 0, clone);',
    edgeCases: 'Deep clone - all nested row, column, and block IDs regenerated via uid(). Clone inserted directly below original.',
  },
  {
    control: 'Delete',
    icon: 'M3 6h18M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6',
    trigger: 'Click trash icon on section hover toolbar',
    jsonMutation: 'sections.splice(idx, 1);',
    edgeCases: 'Confirm dialog if section contains blocks. Instant delete if section is empty. Cannot delete if it is the last section of its role (must keep at least one body section).',
  },
  {
    control: 'Add block below',
    icon: 'M12 5v14M5 12h14',
    trigger: 'Click plus icon between sections or at bottom of section',
    jsonMutation: 'section.rows.push(makeRow([createDefaultBlockV2(selectedType)]));',
    edgeCases: 'Opens block picker palette (same as BlockEditorCanvas inserter). Selected block wraps in a new row automatically.',
  },
];

// ---------------------------------------------------------------------------
// Task 3.6 - Global Style Editor Panel Spec
// ---------------------------------------------------------------------------

export interface StyleEditorField {
  section: string;
  field: string;
  inputType: string;
  options?: string[];
  defaultValue: string | number;
  livePreviewBehavior: string;
}

export const GLOBAL_STYLE_EDITOR: StyleEditorField[] = [
  // Typography
  {
    section: 'Typography',
    field: 'fontFamily',
    inputType: 'select',
    options: [
      'Inter',
      'Georgia',
      'Helvetica',
      'Arial',
      'Verdana',
      'Trebuchet MS',
      'Times New Roman',
      'Courier New',
    ],
    defaultValue: 'Inter',
    livePreviewBehavior: 'Updates globalStyles.typography.fontFamily. All heading and paragraph blocks inherit immediately unless they have a manual override.',
  },
  {
    section: 'Typography',
    field: 'baseFontSize',
    inputType: 'slider',
    options: ['12', '13', '14', '15', '16', '18', '20'],
    defaultValue: 16,
    livePreviewBehavior: 'Updates globalStyles.typography.baseFontSize. Paragraph blocks that use the default inherit the new size.',
  },
  {
    section: 'Typography',
    field: 'headingWeight',
    inputType: 'select',
    options: ['400', '500', '600', '700', '800'],
    defaultValue: 600,
    livePreviewBehavior: 'Updates globalStyles.typography.headingWeight. All heading blocks without manual weight override update.',
  },

  // Colors
  {
    section: 'Colors',
    field: 'primary',
    inputType: 'color-picker',
    defaultValue: '#0f7377',
    livePreviewBehavior: 'Updates globalStyles.colors.primary. Propagates to: button backgrounds, link colors, accent elements, score display color, badge backgrounds.',
  },
  {
    section: 'Colors',
    field: 'secondary',
    inputType: 'color-picker',
    defaultValue: '#6B7280',
    livePreviewBehavior: 'Updates globalStyles.colors.secondary. Propagates to: secondary button colors, muted text.',
  },
  {
    section: 'Colors',
    field: 'background',
    inputType: 'color-picker',
    defaultValue: '#F7F7F5',
    livePreviewBehavior: 'Updates globalStyles.colors.background. Changes email body background behind sections.',
  },
  {
    section: 'Colors',
    field: 'text',
    inputType: 'color-picker',
    defaultValue: '#1A1A1A',
    livePreviewBehavior: 'Updates globalStyles.colors.text. All text blocks without manual color override inherit.',
  },
  {
    section: 'Colors',
    field: 'link',
    inputType: 'color-picker',
    defaultValue: '#0f7377',
    livePreviewBehavior: 'Updates globalStyles.colors.link. All anchor tags and text links inherit.',
  },

  // Spacing
  {
    section: 'Spacing',
    field: 'sectionPadding',
    inputType: 'slider',
    options: ['16', '24', '32', '40', '48'],
    defaultValue: 32,
    livePreviewBehavior: 'Updates globalStyles.spacing.sectionPadding. All sections without manual padding override adjust.',
  },
  {
    section: 'Spacing',
    field: 'blockGap',
    inputType: 'slider',
    options: ['8', '12', '16', '20', '24'],
    defaultValue: 16,
    livePreviewBehavior: 'Updates globalStyles.spacing.blockGap. Gap between blocks in a column.',
  },
  {
    section: 'Spacing',
    field: 'containerMaxWidth',
    inputType: 'slider',
    options: ['480', '520', '560', '600', '640'],
    defaultValue: 600,
    livePreviewBehavior: 'Updates globalStyles.spacing.containerMaxWidth. Email content container width. Preview iframe width adjusts.',
  },
];
