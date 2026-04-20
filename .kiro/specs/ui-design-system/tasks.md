# Implementation Plan: Premium Standardized UI Design System

## Overview

This implementation plan creates a comprehensive design system for the Angular frontend application. The approach establishes CSS custom properties as the single source of truth, creates reusable SCSS mixins, and refactors existing styles to use the new system.

## Tasks

- [ ] 1. Create design tokens file with CSS custom properties
  - Create `frontend/src/styles/_design-tokens.scss` with all CSS custom properties
  - Define color tokens (primary, secondary, semantic, neutral, background, border)
  - Define spacing tokens in 4px increments (0-64px)
  - Define typography tokens (font sizes, weights, line heights)
  - Define border-radius tokens (none through full)
  - Define shadow tokens (none through 2xl, plus component-specific)
  - Define transition tokens (durations and easing functions)
  - Define component size tokens (button-height, input-height, touch-target-min)
  - Define z-index tokens
  - Include reduced motion media query support
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 10.1, 10.2_

- [x] 2. Create mixins directory structure and index file
  - Create `frontend/src/styles/_mixins/` directory
  - Create `_index.scss` barrel export file
  - _Requirements: 7.1_

- [x] 3. Implement button mixins
  - [x] 3.1 Create `frontend/src/styles/_mixins/_buttons.scss`
    - Implement `button-base` mixin with common styles
    - Implement `button-primary` mixin for primary variant
    - Implement `button-secondary` mixin for secondary variant
    - Implement `button-outline` mixin for outline variant
    - Implement `button-icon` mixin for icon buttons (44px touch target)
    - All mixins use design tokens via CSS custom properties
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  
  - [ ]* 3.2 Write property tests for button dimensions
    - **Property 4: Button Touch Target Compliance**
    - **Validates: Requirements 2.1, 2.6**
  
  - [ ]* 3.3 Write property tests for button border radius
    - **Property 5: Button Border Radius Consistency**
    - **Validates: Requirements 2.2**
  
  - [ ]* 3.4 Write property tests for button hover transitions
    - **Property 6: Button Hover Transitions**
    - **Validates: Requirements 2.4**

- [x] 4. Implement card mixins
  - [x] 4.1 Create `frontend/src/styles/_mixins/_cards.scss`
    - Implement `card-base` mixin with common card styles
    - Implement `card-padding` mixin for standard padding
    - Implement `card-header` mixin for card headers
    - Implement `card-body` mixin for card bodies
    - Implement `card-footer` mixin for card footers
    - Implement `stat-card` mixin for dashboard stat cards
    - All mixins use design tokens
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [ ]* 4.2 Write property tests for card dimensions
    - **Property 8: Card Dimensions**
    - **Validates: Requirements 3.1, 3.2**
  
  - [ ]* 4.3 Write property tests for card shadow usage
    - **Property 9: Card Shadow Token Usage**
    - **Validates: Requirements 3.3**

- [x] 5. Implement table and list mixins
  - [x] 5.1 Create `frontend/src/styles/_mixins/_tables.scss`
    - Implement `table-container` mixin
    - Implement `data-table` mixin with header and row styles
    - Implement `list-item` mixin for list items
    - Include hover effects with transitions
    - All mixins use design tokens
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [ ]* 5.2 Write property tests for table row consistency
    - **Property 10: Table Row Consistency**
    - **Validates: Requirements 4.2**
  
  - [ ]* 5.3 Write property tests for table row hover
    - **Property 11: Table Row Hover Effect**
    - **Validates: Requirements 4.3**

- [x] 6. Implement form and filter mixins
  - [x] 6.1 Create `frontend/src/styles/_mixins/_forms.scss`
    - Implement `form-field-base` mixin for standard form fields
    - Implement `filter-section` mixin for filter containers
    - Include Angular Material form field overrides
    - All mixins use design tokens
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [ ]* 6.2 Write property tests for filter input height
    - **Property 13: Filter Section Input Height**
    - **Validates: Requirements 5.3**

- [x] 7. Implement dialog mixins
  - [x] 7.1 Create `frontend/src/styles/_mixins/_dialogs.scss`
    - Implement `dialog-container` mixin
    - Include header, content, and footer styles
    - Include form field overrides for dialogs
    - All mixins use design tokens
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [ ]* 7.2 Write property tests for dialog body padding
    - **Property 14: Dialog Body Padding**
    - **Validates: Requirements 6.2**

- [x] 8. Implement animation mixins
  - [x] 8.1 Create `frontend/src/styles/_mixins/_animations.scss`
    - Implement `hover-lift` mixin for lift effect on hover
    - Implement `hover-glow` mixin for glow effect
    - Implement `smooth-color` mixin for color transitions
    - Implement `hover-scale` mixin for scale effect
    - Implement `fade-in` animation mixin
    - Implement `slide-up` animation mixin
    - Implement `reduced-motion` mixin for accessibility
    - All mixins use transition tokens
    - _Requirements: 10.3, 10.4, 10.5_
  
  - [ ]* 8.2 Write property tests for reduced motion support
    - **Property 20: Reduced Motion Support**
    - **Validates: Requirements 9.4, 10.5**

- [x] 9. Create utility mixins
  - [x] 9.1 Create `frontend/src/styles/_mixins/_utilities.scss`
    - Implement common utility mixins
    - Include accessibility-focused mixins
    - _Requirements: 9.1, 9.2, 9.3, 9.5_
  
  - [ ]* 9.2 Write property tests for touch target minimum
    - **Property 17: Touch Target Minimum**
    - **Validates: Requirements 9.1**
  
  - [ ]* 9.3 Write property tests for focus indicators
    - **Property 19: Focus Indicator Visibility**
    - **Validates: Requirements 9.3**

- [x] 10. Update mixin index to export all mixins
  - Update `frontend/src/styles/_mixins/_index.scss` to import and forward all mixin files
  - _Requirements: 7.1_

- [x] 11. Checkpoint - Verify mixin library completeness
  - Ensure all mixins are defined and exported
  - Run SCSS compilation to verify no errors
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 12. Update main styles file to import design system
  - Update `frontend/src/styles/styles.scss` to import design tokens
  - Import mixins index
  - Ensure proper import order
  - _Requirements: 1.1_

- [x] 13. Refactor _vuexy-vars.scss to reference design tokens
  - Update existing SCSS variables to reference CSS custom properties where applicable
  - Maintain backward compatibility for existing usage
  - _Requirements: 1.6_

- [x] 14. Refactor _shared-list-styles.scss to use new mixins
  - Update existing mixins to use design tokens
  - Remove duplicate style definitions
  - Maintain backward compatibility
  - _Requirements: 4.1, 8.1, 8.2_

- [x] 15. Refactor _vuexy-helpers.scss to use design tokens
  - Update helper classes to use CSS custom properties
  - Ensure button classes use standardized dimensions
  - _Requirements: 2.1, 2.2_

- [x] 16. Refactor _form-dialog-shell.scss to use new mixins
  - Update dialog styles to use dialog mixins
  - Ensure consistent padding and spacing
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 17. Identify and remove duplicate styles in feature modules
  - [x] 17.1 Scan feature modules for duplicate style definitions
    - Search for inline style definitions that duplicate shared styles
    - Document all duplicates found
    - _Requirements: 8.1_
  
  - [x] 17.2 Replace duplicates with shared mixin imports
    - Update feature module styles to import and use shared mixins
    - Remove inline duplicate definitions
    - _Requirements: 8.2, 8.4_
  
  - [ ]* 17.3 Write property tests for no duplicate definitions
    - **Property 16: No Duplicate Style Definitions**
    - **Validates: Requirements 8.1, 8.2**

- [x] 18. Checkpoint - Verify design token usage
  - Ensure all components use design tokens
  - Verify no hardcoded color/spacing values remain
  - _Requirements: 4.4, 6.4, 7.6_

- [x] 19. Create design token documentation
  - Document all available tokens with examples
  - Document mixin usage patterns
  - Create `frontend/src/styles/STYLE_GUIDE.md` with comprehensive documentation
  - _Requirements: 1.1, 7.1_

- [x] 20. Final checkpoint - Ensure all tests pass
  - Run all property tests
  - Run SCSS compilation
  - Verify application builds successfully
  - Verify visual consistency with previous implementation
  - _Requirements: 8.3_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- The design system maintains backward compatibility with existing styles during migration
- All mixins use CSS custom properties for runtime flexibility
