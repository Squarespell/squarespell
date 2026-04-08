# Squarespell Design System
# Structure: Notion | Colors: Squarespell Brand

## BRAND COLORS (LOCKED — DO NOT CHANGE)
```css
:root {
  --brand-primary: #D2FF1D;        /* Green accent */
  --brand-primary-hover: #c8f200;  /* Hover state */
  --brand-bg: #07090c;             /* Page background */
  --brand-text: #f0f2f5;           /* Primary text */
}
```

## DESIGN TOKENS

### Typography Scale (Notion-matched)
| Token | Size | Weight | Line-Height | Use |
|---|---|---|---|---|
| --text-h1 | 32px | 700 | 1.2 | Page titles only |
| --text-h2 | 24px | 600 | 1.3 | Section headers |
| --text-h3 | 18px | 600 | 1.4 | Card/widget titles |
| --text-body | 16px | 400 | 1.5 | Default body |
| --text-sm | 14px | 400 | 1.5 | Secondary text, nav, inputs |
| --text-xs | 12px | 500 | 1.4 | Labels, meta, table headers |
| --text-xxs | 11px | 700 | 1.3 | Uppercase section labels |

### Spacing Scale
| Token | Value |
|---|---|
| --sp-1 | 2px |
| --sp-2 | 4px |
| --sp-3 | 8px |
| --sp-4 | 12px |
| --sp-5 | 16px |
| --sp-6 | 24px |
| --sp-7 | 32px |
| --sp-8 | 40px |
| --sp-9 | 48px |
| --sp-10 | 64px |

### Layout
| Token | Value |
|---|---|
| --sidebar-w | 240px |
| --topbar-h | 44px |
| --content-max | 900px |
| --page-px | 48px |
| --page-py | 40px |

### Radius
| Token | Value | Use |
|---|---|---|
| --r-sm | 4px | Inputs, tags, icons |
| --r-md | 6px | Nav items, small cards |
| --r-lg | 8px | Buttons, cards |
| --r-xl | 12px | Large cards, modals |
| --r-full | 9999px | Pills, avatars, toggles |

### Heights
| Token | Value | Use |
|---|---|---|
| --h-btn | 32px | Default buttons |
| --h-btn-lg | 36px | Primary CTA buttons |
| --h-input | 36px | Inputs, selects |
| --h-input-lg | 44px | Large inputs (auth pages) |
| --h-nav | 30px | Sidebar nav items |

### Surfaces (using brand colors)
| Token | Value |
|---|---|
| --bg | #07090c |
| --surface-1 | rgba(255,255,255,0.03) |
| --surface-2 | rgba(255,255,255,0.05) |
| --surface-3 | rgba(255,255,255,0.08) |
| --border | rgba(255,255,255,0.06) |
| --border-strong | rgba(255,255,255,0.10) |

### Text Colors (using brand palette)
| Token | Value |
|---|---|
| --text-1 | #f0f2f5 |
| --text-2 | rgba(240,242,245,0.65) |
| --text-3 | rgba(240,242,245,0.45) |
| --text-4 | rgba(240,242,245,0.30) |

### Icon Sizes
| Token | Value | Use |
|---|---|---|
| --icon-sm | 14px | Inline, badges |
| --icon-md | 16px | Nav, buttons |
| --icon-lg | 20px | Feature, empty states |
