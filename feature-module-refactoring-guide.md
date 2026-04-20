# Feature Module SCSS Refactoring Guide

## Overview
This guide provides step-by-step instructions for refactoring feature module SCSS files to use the design system mixins and tokens, eliminating duplicate style definitions.

## Step 1: Add Mixin Import
Add this line at the top of your SCSS file:
```scss
@use '../../../../../styles/mixins' as mixins;
```

**Path calculation**: From `features/[feature]/components/[component]/[component].scss`, go up 3 levels to `src`, then `styles/mixins`.

## Step 2: Replace Hardcoded Values with Design Tokens

### Colors
Replace hardcoded colors with design tokens:
- `#667eea` → `var(--color-primary)`
- `#444050` → `var(--color-text-primary)`
- `#777` → `var(--color-text-muted)`
- `#e0e0e0` → `var(--color-border)`
- `#f44336` → `var(--color-danger)`
- `#4CAF50` → `var(--color-success)`
- `#2196F3` → `var(--color-info)`
- `#FF9800` → `var(--color-warning)`

### Spacing
Replace hardcoded spacing with spacing tokens:
- `24px` → `var(--space-6)`
- `16px` → `var(--space-4)`
- `12px` → `var(--space-3)`
- `8px` → `var(--space-2)`
- `4px` → `var(--space-1)`

### Border Radius
Replace hardcoded border-radius with radius tokens:
- `12px` → `var(--radius-2xl)`
- `8px` → `var(--radius-lg)`
- `6px` → `var(--radius-md)`
- `4px` → `var(--radius-sm)`

### Shadows
Replace hardcoded shadows with shadow tokens:
- `0 2px 8px rgba(0, 0, 0, 0.08)` → `var(--shadow-card)`
- `0 4px 12px rgba(0, 0, 0, 0.15)` → `var(--shadow-button-hover)`
- `0 2px 4px rgba(0, 0, 0, 0.1)` → `var(--shadow-button)`

### Transitions
Replace hardcoded transitions with transition tokens:
- `0.2s ease` → `var(--transition-base)`
- `0.3s ease-out` → `var(--transition-slow)`
- `0.15s ease` → `var(--transition-fast)`

## Step 3: Replace Custom Styles with Mixins

### Page Containers
```scss
/* Before */
.container {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

/* After */
.container {
  @include mixins.page-container;
  max-width: 1200px;
}
```

### Cards
```scss
/* Before */
.card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #e0e0e0;
  padding: 24px;
}

/* After */
.card {
  @include mixins.card-base;
  @include mixins.card-padding;
}
```

### Buttons
```scss
/* Before */
button.primary {
  background-color: #667eea;
  color: white;
  border-radius: 6px;
  height: 44px;
  padding: 0 16px;
}

/* After */
button.primary {
  @include mixins.button-primary;
}
```

### Form Fields
```scss
/* Before */
::ng-deep .mat-mdc-form-field {
  .mdc-notched-outline__leading {
    border-color: #e0e0e0;
  }
  &.mat-focused .mdc-notched-outline__leading {
    border-color: #667eea;
  }
}

/* After */
@include mixins.form-field-overrides;
```

### Tables
```scss
/* Before */
table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 8px;
}

/* After */
table {
  @include mixins.data-table;
}
```

### Filter Sections
```scss
/* Before */
.filter-section {
  padding: 16px 24px;
  display: flex;
  gap: 16px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
}

/* After */
.filter-section {
  @include mixins.filter-section;
}
```

## Step 4: Use Utility Mixins

### Scroll Containers
```scss
/* Before */
.scroll-container {
  overflow-y: auto;
  &::-webkit-scrollbar {
    width: 6px;
  }
}

/* After */
.scroll-container {
  @include mixins.scroll-container(vertical);
}
```

### Flex Layouts
```scss
/* Before */
.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* After */
.flex-center {
  @include mixins.flex-center;
}
```

### Animations
```scss
/* Before */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.element {
  animation: fadeIn 0.3s ease-out;
}

/* After */
.element {
  @include mixins.fade-in(var(--transition-slow));
}
```

## Step 5: Remove Unnecessary Overrides

### Material Design Overrides
Many Material Design overrides are already handled by the mixins. Remove duplicate overrides like:
- Button border-radius overrides
- Form field border overrides
- Tab styling overrides
- Checkbox/radio styling overrides

### Custom Utility Classes
If you have custom utility classes that duplicate mixin functionality, remove them:
- `.text-primary` (use `var(--color-text-primary)`)
- `.bg-white` (use `var(--color-bg-card)`)
- `.shadow-sm` (use `var(--shadow-sm)`)
- `.rounded-lg` (use `var(--radius-lg)`)

## Step 6: Test Compilation
After refactoring, test that the SCSS compiles correctly:
```bash
npx sass --no-source-map path/to/your/component.scss test-output.css
```

## Common Patterns to Look For

### 1. Page Headers
```scss
/* Look for */
.page-header {
  margin-bottom: 24px;
  h1 {
    font-size: 28px;
    font-weight: 600;
    color: #444050;
  }
}

/* Replace with */
.page-header {
  @include mixins.page-header;
}
```

### 2. Form Actions
```scss
/* Look for */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  padding: 24px 0;
}

/* Replace with */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-4);
  padding: var(--space-6) 0;
}
```

### 3. Loading States
```scss
/* Look for */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  gap: 16px;
}

/* Replace with */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  gap: var(--space-4);
}
```

## Special Case: Batches Feature
The batches feature has a complete duplicate design system. For these files:

1. **Remove** the custom variable definitions (`$batch-*`)
2. **Replace** custom mixin calls (`@include batch-*`) with design system mixins
3. **Update** imports to use the main design system
4. **Test** thoroughly as this is a major change

## Benefits of Refactoring

1. **Consistency**: All components use the same design tokens
2. **Maintainability**: Changes to design tokens propagate automatically
3. **Performance**: Reduced CSS bundle size
4. **Accessibility**: Built-in accessibility features in mixins
5. **Developer Experience**: Consistent patterns across the codebase

## Example: Complete Refactoring
See `account-form.component.scss` for a complete example of refactoring.