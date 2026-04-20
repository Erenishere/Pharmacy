# Duplicate Styles Found in Feature Modules

## Summary
Scanned feature module SCSS files and identified multiple duplicate style definitions that should be replaced with design system mixins and design tokens.

## Common Duplicate Patterns Found

### 1. Hardcoded Colors (Should use design tokens)
- `#667eea` (duplicates `--color-primary`)
- `#444050` (duplicates `--color-text-primary`)
- `#777` (duplicates `--color-text-muted`)
- `#e0e0e0` (duplicates `--color-border`)
- `#5a6fd8` (duplicates `--color-primary-dark`)
- `#f44336` (duplicates `--color-danger`)
- `#4CAF50`, `#2196F3`, `#9C27B0`, `#FF9800` (semantic colors)

### 2. Hardcoded Spacing (Should use spacing tokens)
- `24px` (duplicates `--space-6`)
- `16px` (duplicates `--space-4`)
- `12px` (duplicates `--space-3`)
- `8px` (duplicates `--space-2`)
- `4px` (duplicates `--space-1`)

### 3. Hardcoded Border Radius (Should use radius tokens)
- `12px` (duplicates `--radius-2xl`)
- `8px` (duplicates `--radius-lg`)
- `6px` (duplicates `--radius-md`)

### 4. Hardcoded Shadows (Should use shadow tokens)
- `0 2px 8px rgba(0, 0, 0, 0.08)` (duplicates `--shadow-card`)
- `0 4px 8px rgba(0, 0, 0, 0.15)` (duplicates `--shadow-button-hover`)
- `0 2px 4px rgba(0, 0, 0, 0.1)` (duplicates `--shadow-button`)

### 5. Button Styles (Should use button mixins)
- Button height: `40px`, `44px` (should use `--button-height`)
- Button border-radius: `8px` (should use `--radius-md`)
- Button hover effects with `transform: translateY(-1px)`
- Button box-shadow transitions

### 6. Card Styles (Should use card mixins)
- Card padding: `24px` (should use `--space-6`)
- Card border-radius: `12px` (should use `--radius-lg`)
- Card box-shadow: `0 2px 8px rgba(0, 0, 0, 0.08)`
- Card border: `1px solid #e0e0e0`

### 7. Form Field Overrides (Should use form mixins)
- Form field height: `44px` (should use `--input-height`)
- Border colors and hover states
- Focus states with border changes

### 8. Animation/Transition Values (Should use transition tokens)
- `transition: all 0.2s ease` (should use `--transition-base`)
- `transition: transform 0.3s ease-out` (should use `--transition-slow`)
- Custom keyframe animations

## Specific Files with Duplicates

### 1. `account-form.component.scss`
- Hardcoded colors: `#667eea`, `#444050`, `#777`, `#e0e0e0`, `#f44336`
- Hardcoded spacing: `24px`, `16px`, `12px`, `8px`, `4px`
- Hardcoded border-radius: `12px`, `8px`
- Button styles that duplicate `button-primary` mixin
- Form field overrides that duplicate `form-field-base` mixin
- Card styles that duplicate `card-base` mixin

### 2. `analytics-dashboard.component.scss`
- Hardcoded colors: `#667eea`, `#444050`, `#777`, `#e0e0e0`, `#4CAF50`, `#2196F3`, `#9C27B0`, `#FF9800`
- Hardcoded spacing: `24px`, `16px`, `12px`, `8px`, `4px`
- Hardcoded border-radius: `12px`, `8px`, `6px`
- KPI card styles that duplicate `stat-card` mixin
- Chart card styles that duplicate `card-base` mixin
- Button styles that duplicate button mixins

### 3. `index.scss` (batches feature)
- Uses custom SCSS variables instead of design tokens
- Custom button mixins (`batch-button-primary`, `batch-button-outline`)
- Custom form field mixins (`batch-form-field`)
- Custom table mixins (`batch-table`)
- Custom card mixins (`batch-card`)

## Recommendations for Refactoring

### 1. Replace Hardcoded Values with Design Tokens
- Replace all color values with `var(--color-*)` tokens
- Replace all spacing values with `var(--space-*)` tokens
- Replace all border-radius values with `var(--radius-*)` tokens
- Replace all shadow values with `var(--shadow-*)` tokens
- Replace all transition values with `var(--transition-*)` tokens

### 2. Replace Custom Styles with Mixins
- Replace button styles with `@include button-primary`, `@include button-secondary`, etc.
- Replace card styles with `@include card-base`, `@include card-padding`, etc.
- Replace form field styles with `@include form-field-base`
- Replace table styles with `@include data-table`
- Replace filter sections with `@include filter-section`

### 3. Import Design System Mixins
- Add `@use '../../../../styles/mixins' as mixins;` to feature SCSS files
- Or import specific mixins as needed

### 4. Remove Unnecessary Overrides
- Remove duplicate Material Design overrides (already handled by mixins)
- Remove custom animations that duplicate animation mixins
- Remove responsive styles that duplicate utility mixins

## Priority Areas
1. Button styles (highest duplication)
2. Card styles (very common)
3. Form field styles (critical for consistency)
4. Table/list styles (data display)
5. Filter sections (user interaction)
6. Dialog styles (modal interfaces)


## Critical Example: Batches Feature Duplicate Design System

The `batches` feature has created a complete duplicate design system in `batch-enhanced-theme.scss`:

### Duplicate Variables
- `$batch-primary: #867cf0` (duplicates `--color-primary: #7367F0`)
- `$batch-text-primary: #5e5873` (duplicates `--color-text-primary: #5E5873`)
- `$batch-text-secondary: #6e6b7b` (duplicates `--color-text-body: #6E6B7B`)
- `$batch-text-muted: #b8b8b8` (duplicates `--color-text-muted: #B8B8B8`)
- `$batch-bg-page: #F8F7FA` (duplicates `--color-bg-page: #F8F9FC`)
- `$batch-bg-card: #FFFFFF` (duplicates `--color-bg-card: #FFFFFF`)
- `$batch-status-expired: #EA5455` (duplicates `--color-danger: #EA5455`)
- `$batch-status-normal: #28C76F` (duplicates `--color-success: #28C76F`)
- `$batch-status-warning: #FF9F43` (duplicates `--color-warning: #FF9F43`)

### Duplicate Spacing Variables
- `$batch-spacing-xs: 4px` (duplicates `--space-1: 4px`)
- `$batch-spacing-sm: 8px` (duplicates `--space-2: 8px`)
- `$batch-spacing-md: 12px` (duplicates `--space-3: 12px`)
- `$batch-spacing-lg: 16px` (duplicates `--space-4: 16px`)
- `$batch-spacing-xl: 20px` (duplicates `--space-5: 20px`)
- `$batch-spacing-xxl: 24px` (duplicates `--space-6: 24px`)
- `$batch-spacing-xxxl: 32px` (duplicates `--space-8: 32px`)

### Duplicate Mixins
- `@mixin batch-button-primary` (duplicates `@mixin button-primary`)
- `@mixin batch-button-outline` (duplicates `@mixin button-outline`)
- `@mixin batch-form-field` (duplicates `@mixin form-field-base`)
- `@mixin batch-card` (duplicates `@mixin card-base`)
- `@mixin batch-table` (duplicates `@mixin data-table`)
- `@mixin batch-search-field` (duplicates `@mixin form-field-base`)

### Duplicate Utility Mixins
- `@mixin batch-smooth-transition` (duplicates `@mixin smooth-color`)
- `@mixin batch-hover-lift` (duplicates `@mixin hover-lift`)
- `@mixin batch-focus-visible` (duplicates `@mixin focus-ring`)

## Impact Assessment

### High Priority Issues
1. **Complete duplicate design system** in batches feature
2. **Inconsistent color values** (slightly different shades)
3. **Maintenance burden** - changes need to be made in two places
4. **Visual inconsistency** - batches feature looks slightly different

### Medium Priority Issues
1. Hardcoded values in individual component SCSS files
2. Custom Material Design overrides
3. Inconsistent spacing and sizing

### Low Priority Issues
1. Custom animations that could use animation mixins
2. Responsive styles that could be standardized