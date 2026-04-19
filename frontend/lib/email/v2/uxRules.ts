// ============================================================================
// Phase 3: Task 3.9 - UX Simplicity Rules
// ============================================================================
// 10 numbered laws this builder must never break.
// Opinionated, specific, one sentence each.
// ============================================================================

export const UX_SIMPLICITY_RULES = [
  '1. One click to edit - clicking any element immediately makes it editable inline; never require a modal to change text.',
  '2. Zero-config defaults - every new block, section, and template must look good the instant it is created with no user input required.',
  '3. No orphan panels - the right inspector only appears when a block is selected and always closes when selection is cleared.',
  '4. Brand kit is law - changing the brand kit auto-updates every block that has not been manually overridden, with no confirm dialog.',
  '5. Mobile preview is free - the mobile preview toggle is always visible and never gated behind a paid tier or hidden menu.',
  '6. Drag means reorder - dragging a block or section only reorders within its container; it never opens a dialog, creates a copy, or triggers a side effect.',
  '7. Undo is instant - every mutation pushes to an undo stack; Ctrl+Z reverts exactly one action with no confirmation prompt.',
  '8. Send preview first - the primary CTA after editing is always "Send test email" not "Save"; saving happens automatically in the background.',
  '9. Hide the JSON - users never see raw JSON, merge tag syntax, or HTML source unless they explicitly open a developer panel.',
  '10. Max three clicks to send - from template gallery to sending a real email must take no more than three user actions: pick template, edit content, hit send.',
] as const;

export type UxRuleIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
