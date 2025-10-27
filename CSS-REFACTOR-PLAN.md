# CSS Refactoring Plan

## Current Problem
`styles.css` is 1,804 lines - a monolithic nightmare that's hard to maintain and debug.

## Proposed Structure

```
styles/
├── base.css          (~200 lines) - resets, variables, typography
├── layout.css        (~300 lines) - grid, flex, positioning, containers
├── components.css    (~600 lines) - buttons, forms, cards, product cards
├── pages.css         (~400 lines) - page-specific styles
├── responsive.css    (~300 lines) - all media queries
└── main.css          (~10 lines) - imports all modules
```

## Benefits
1. **Maintainability:** Easy to find and update specific styles
2. **Performance:** Can load only needed CSS per page
3. **Collaboration:** Multiple devs can work without conflicts
4. **Debugging:** Faster to locate issues
5. **Code review:** Smaller, focused changes

## Implementation Steps

### Step 1: Create Directory Structure
```bash
mkdir -p styles
```

### Step 2: Extract Base Styles
Create `styles/base.css` with:
- CSS Variables (lines 1-17)
- Global resets (lines 19-65)
- Typography (h1-h6, p, etc.)
- Links, images

### Step 3: Extract Layout Styles
Create `styles/layout.css` with:
- Header & navigation (lines 69-171)
- Footer
- Containers
- Grid systems
- Flexbox utilities

### Step 4: Extract Components
Create `styles/components.css` with:
- Buttons (.btn-primary, .btn-add-cart, etc.)
- Forms (input, textarea, form-group)
- Cards (.product-card, .cart-item)
- Modals
- Notifications
- Badges (COA badge, cart badge)

### Step 5: Extract Page-Specific Styles
Create `styles/pages.css` with:
- Hero sections
- Shop page styles
- Checkout page styles
- About page styles
- Contact page styles

### Step 6: Extract Responsive Styles
Create `styles/responsive.css` with:
- All @media queries
- Mobile navigation
- Tablet layouts
- Desktop layouts

### Step 7: Create Main Import File
Create `styles/main.css`:
```css
@import './base.css';
@import './layout.css';
@import './components.css';
@import './pages.css';
@import './responsive.css';
```

### Step 8: Update HTML References
Replace in all HTML files:
```html
<!-- Old -->
<link rel="stylesheet" href="/styles.css">

<!-- New -->
<link rel="stylesheet" href="/styles/main.css">
```

### Step 9: Test & Validate
- Load each page and verify styling
- Check responsive breakpoints
- Test all interactive elements
- Validate with Chrome DevTools

### Step 10: Remove Old File
```bash
rm styles.css
```

## Quick Win Alternative

If full refactoring is too much work right now, at MINIMUM do this:

### Add Table of Contents to styles.css
```css
/**
 * TABLE OF CONTENTS
 *
 * 1. CSS Variables (lines 1-17)
 * 2. Global Reset & Base (lines 19-65)
 * 3. Header & Navigation (lines 69-171)
 * 4. Hero Sections (lines 174-223)
 * 5. Content Sections (lines 226-340)
 * 6. Product Cards (lines 343-490)
 * 7. Checkout Page (lines 493-640)
 * 8. Forms (lines 643-780)
 * 9. Buttons (lines 783-850)
 * 10. Footer (lines 853-920)
 * 11. Utilities (lines 923-1100)
 * 12. Animations (lines 1103-1200)
 * 13. Mobile Styles (lines 1203-1804)
 */
```

This takes 5 minutes and makes the file 10x easier to navigate.

## Priority

**MEDIUM PRIORITY** - The site works fine now, but future development will be painful.

If you're done building features and just maintaining, you can skip this.
If you're actively developing, do this ASAP to save future headaches.

## Estimated Time

- **Quick fix (TOC):** 5 minutes
- **Full refactor:** 2-3 hours
- **Testing:** 1 hour

Total: ~4 hours for complete professional refactor

## Tools That Can Help

### Automated CSS Splitting
```bash
# Install csssplit
npm install -g csssplit

# Auto-split by media queries
csssplit styles.css --output styles/
```

### CSS Linting
```bash
# Install stylelint
npm install --save-dev stylelint stylelint-config-standard

# Lint your CSS
npx stylelint "styles/**/*.css"
```

## Don't Break Anything!

Before refactoring:
1. ✅ Commit current working state to git
2. ✅ Test all pages work perfectly
3. ✅ Document any custom build steps
4. ✅ Have a rollback plan

After refactoring:
1. ✅ Test EVERY page
2. ✅ Test mobile responsive
3. ✅ Test all interactions (buttons, forms, modals)
4. ✅ Run build: `npm run build`
5. ✅ Deploy to staging first, THEN production

## Reality Check

The current 1,804-line file works. It's not broken.

Refactoring is an investment in future maintainability, not a bug fix.

Do it when:
- You have time
- You're about to do major CSS work
- Multiple people will work on styling

Skip it if:
- Site is working and you're not changing design
- You're a solo dev who knows the CSS well
- You have more important features to build

**Refactoring for refactoring's sake is procrastination in disguise.**
