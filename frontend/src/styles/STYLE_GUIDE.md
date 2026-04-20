# Premium UI Design System - Style Guide

## Overview

This design system provides a comprehensive, standardized approach to UI styling across the Angular frontend application. It establishes CSS custom properties as the single source of truth for all design tokens, ensuring consistency and maintainability.

## Architecture

```
frontend/src/styles/
├── _design-tokens.scss       # CSS custom properties (single source of truth)
├── _vuexy-vars.scss          # SCSS variables (compile-time use)
├── _mixins/
│   ├── _index.scss           # Mixin barrel export
│   ├── _buttons.scss         # Button mixins
│   ├── _cards.scss           # Card mixins
│   ├── _tables.scss          # Table/list mixins
│   ├── _forms.scss           # Form field mixins
│   ├── _dialogs.scss         # Dialog mixins
│   ├── _animations.scss      # Transition/animation mixins
│   └── _utilities.scss       # Utility mixins
├── _shared-list-styles.scss  # Shared list/table styles
├── _vuexy-helpers.scss       # Helper classes
└── styles.scss               # Main stylesheet
```

## Design Tokens

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#7367F0` | Primary brand color |
| `--color-primary-dark` | `#5E50EE` | Primary dark variant |
| `--color-primary-light` | `#9E95F5` | Primary light variant |
| `--color-success` | `#28C76F` | Success states |
| `--color-info` | `#00CFE8` | Information states |
| `--color-warning` | `#FF9F43` | Warning states |
| `--color-danger` | `#EA5455` | Error/danger states |
| `--color-text-primary` | `#5E5873` | Primary text |
| `--color-text-body` | `#6E6B7B` | Body text |
| `--color-text-muted` | `#B8B8B8` | Muted/disabled text |
| `--color-bg-page` | `#F8F9FC` | Page background |
| `--color-bg-card` | `#FFFFFF` | Card background |
| `--color-border` | `#EBE9F1` | Default border |

### Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | `4px` | Extra small |
| `--space-2` | `8px` | Small |
| `--space-3` | `12px` | Medium-small |
| `--space-4` | `16px` | Medium |
| `--space-5` | `20px` | Medium-large |
| `--space-6` | `24px` | Large (card padding) |
| `--space-8` | `32px` | Extra large |
| `--space-10` | `40px` | 2x large |
| `--space-12` | `48px` | 3x large |
| `--space-16` | `64px` | 4x large |

### Typography

| Token | Value | Usage |
|-------|-------|-------|
| `--font-size-xs` | `11px` | Extra small text |
| `--font-size-sm` | `13px` | Small text |
| `--font-size-base` | `14px` | Base body text |
| `--font-size-md` | `16px` | Medium text |
| `--font-size-lg` | `18px` | Large text |
| `--font-size-xl` | `20px` | Extra large text |
| `--font-size-2xl` | `24px` | Heading 3 |
| `--font-size-3xl` | `28px` | Heading 2 |
| `--font-size-4xl` | `32px` | Heading 1 |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `4px` | Badges, small elements |
| `--radius-md` | `6px` | Buttons, inputs |
| `--radius-lg` | `8px` | Cards, containers |
| `--radius-xl` | `10px` | Large containers |
| `--radius-2xl` | `12px` | Stat cards, modals |
| `--radius-full` | `9999px` | Circular elements |

### Shadows

| Token | Usage |
|-------|-------|
| `--shadow-sm` | Subtle elevation |
| `--shadow-md` | Medium elevation |
| `--shadow-lg` | High elevation |
| `--shadow-xl` | Extra high elevation |
| `--shadow-card` | Card default shadow |
| `--shadow-card-hover` | Card hover shadow |
| `--shadow-button` | Button shadow |
| `--shadow-primary-glow` | Primary glow effect |

### Transitions

| Token | Value | Usage |
|-------|-------|-------|
| `--transition-fast` | `150ms ease-out` | Quick interactions |
| `--transition-base` | `200ms ease-out` | Standard transitions |
| `--transition-slow` | `300ms ease-out` | Deliberate animations |
| `--transition-slower` | `400ms ease-out` | Slow animations |

### Component Sizes

| Token | Value | Usage |
|-------|-------|-------|
| `--button-height` | `44px` | Standard button height |
| `--input-height` | `44px` | Standard input height |
| `--touch-target-min` | `44px` | Minimum touch target (Fitts's Law) |

## Usage Examples

### Using Design Tokens in SCSS

```scss
.my-component {
  padding: var(--space-4);
  background-color: var(--color-bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  transition: all var(--transition-base);
  
  &:hover {
    box-shadow: var(--shadow-card-hover);
    transform: translateY(-2px);
  }
}
```

### Using Mixins

```scss
@import 'styles/mixins';

.my-button {
  @include button-primary;
}

.my-card {
  @include card-base;
  @include card-padding;
}

.my-table {
  @include data-table;
}
```

### Button Variants

```scss
// Primary button
.primary-btn {
  @include button-primary;
}

// Secondary button
.secondary-btn {
  @include button-secondary;
}

// Outline button
.outline-btn {
  @include button-outline;
}

// Icon button (44px touch target)
.icon-btn {
  @include button-icon;
}
```

### Card Components

```scss
// Standard card
.standard-card {
  @include card-base;
  @include card-padding;
}

// List card (for data tables)
.list-card {
  @include list-card;
}

// Stat card (for dashboards)
.stat-card {
  @include stat-card;
}
```

### Table Styling

```scss
.data-table-container {
  @include table-container;
  
  table {
    @include data-table;
  }
}

// Paginator
mat-paginator {
  @include paginator;
}
```

### Form Styling

```scss
.filter-section {
  @include filter-section;
}

.form-card {
  @include form-card;
}
```

### Dialog Styling

```scss
.dialog-container {
  @include dialog-container;
}
```

### Animations

```scss
// Hover lift effect
.card {
  @include hover-lift(-4px);
}

// Fade in animation
.modal {
  @include fade-in;
}

// Slide up animation
.notification {
  @include slide-up;
}

// Loader spinner
.loader {
  @include loader-spinner(32px, var(--color-primary));
}
```

## Accessibility

### Touch Targets

All interactive elements must have a minimum touch target of 44px × 44px (Fitts's Law compliance).

```scss
// Correct
.button {
  min-height: var(--touch-target-min);
  min-width: var(--touch-target-min);
}
```

### Focus Indicators

All focusable elements must have visible focus indicators.

```scss
.interactive-element {
  &:focus-visible {
    box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.3);
  }
}
```

### Reduced Motion

The design system respects user preferences for reduced motion.

```scss
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
```

## Best Practices

1. **Always use design tokens** instead of hardcoded values
2. **Use mixins** for consistent component styling
3. **Maintain 44px minimum touch targets** for accessibility
4. **Apply transitions** for smooth interactions
5. **Test with reduced motion** enabled
6. **Ensure sufficient color contrast** (minimum 4.5:1)

## Migration Guide

When updating existing components:

1. Replace hardcoded colors with CSS custom properties
2. Replace hardcoded spacing with spacing tokens
3. Use mixins instead of inline styles
4. Ensure touch targets meet 44px minimum
5. Add focus indicators for accessibility
6. Test hover states and transitions
