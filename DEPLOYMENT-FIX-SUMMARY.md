# Deployment Issues - Fixed

## Issues Resolved

### ✅ Issue #1: GHK-Cu COA Missing on Live Site

**Root Cause:**
The Certificate of Analysis (COA) links were using `/public/COAs/` paths, but in production (Netlify), files in the `public` folder are served from the root directory. The browser was looking for files at `/public/COAs/GHK-CU COA.pdf` which doesn't exist - the correct path is `/COAs/GHK-CU COA.pdf`.

**Files Changed:**
- `shop.html` (lines 94 and 140)

**Fix Applied:**
Changed:
- `/public/COAs/GHK-CU COA.pdf` → `/COAs/GHK-CU COA.pdf`
- `/public/COAs/Sermorelin COA.pdf` → `/COAs/Sermorelin COA.pdf`

**Testing:**
After deployment, verify:
1. Visit shop page on live site
2. Click "View COA" badge on GHK-CU product
3. Click "View COA" badge on Sermorelin product
4. Both PDFs should open in new tab

---

### ✅ Issue #2: Instagram Link Not Appearing on Contact Page

**Root Cause:**
The Instagram link section was using very light inline styles with `rgba(255, 255, 255, 0.05)` background which was nearly invisible against the page background on the live site.

**Files Changed:**
- `contact.html` (lines 74-84)

**Fix Applied:**
Enhanced visibility with:
- Stronger background color: `rgba(138, 125, 110, 0.15)`
- Better border: `rgba(225, 184, 127, 0.3)`
- Added box shadow for depth
- Made text color explicit: `#f5f1e9`
- Added padding and background to the link itself for better clickability
- Ensured link stands out with `rgba(225, 184, 127, 0.1)` background

**Testing:**
After deployment, verify:
1. Visit contact page on live site
2. Instagram section should be clearly visible above the contact form
3. Text should be readable: "You can also reach us on Instagram:"
4. Link should be visible and styled: "@evoqwellnessco" with Instagram icon
5. Link should be clickable and go to: https://instagram.com/evoqwellnessco

---

### ✅ Issue #3: Evoq Logo in Top Left Corner Non-Functional

**Root Cause:**
The `shop-new.html` file was missing the `<a href="index.html">` wrapper around the logo, making it non-clickable. All other pages had this wrapper but `shop-new.html` was missing it.

**Files Changed:**
- `shop-new.html` (lines 19-24)

**Fix Applied:**
Wrapped the logo with clickable link:
```html
<a href="index.html" class="logo-link" aria-label="EVOQ Wellness Home">
    <div class="logo">EVOQ<img src="images/lightning-bolt.svg" alt="EVOQ Lightning Bolt" class="logo-bolt"></div>
    <div class="slogan">metabolic wellness, evolved</div>
</a>
```

**Testing:**
After deployment, verify:
1. Visit shop-new.html on live site
2. Logo in top left should be clickable
3. Clicking logo should navigate to home page (index.html)
4. Logo should have hover effect (cursor pointer)

---

## Common Deployment Issues Explained

### Why These Work in Bolt but Fail on Live Site

1. **Path Differences**:
   - Bolt development environment serves files differently than production (Netlify)
   - In Bolt, `/public/` might be accessible, but Netlify serves `public` folder contents from root
   - Always use root-relative paths: `/COAs/file.pdf` not `/public/COAs/file.pdf`

2. **CSS Rendering**:
   - Different browsers and devices render colors differently
   - Very transparent backgrounds (`rgba(*, *, *, 0.05)`) can be invisible on some screens
   - Always test with higher opacity or explicit colors

3. **File Synchronization**:
   - Make sure all HTML files are updated and deployed
   - Check that individual files weren't skipped during upload
   - Verify file timestamps on server match local

4. **Caching Issues**:
   - Browsers cache CSS and HTML files
   - Clear cache after deployment: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Or use Incognito/Private browsing mode for testing

---

## Deployment Checklist

Before deploying to live site:

### Pre-Deployment
- [ ] Build project: `npm run build`
- [ ] Verify no build errors
- [ ] Check all file paths are relative (no `/public/` in URLs)
- [ ] Test locally in production mode: `npm run preview`
- [ ] Clear browser cache

### Files to Deploy
Make sure these files are uploaded:
- [ ] `shop.html` (COA fixes)
- [ ] `contact.html` (Instagram visibility fix)
- [ ] `shop-new.html` (logo clickability fix)
- [ ] All files in `/public/COAs/` directory
- [ ] All files in `/images/` directory

### Post-Deployment Testing
- [ ] Clear browser cache (Ctrl+Shift+R)
- [ ] Test GHK-Cu COA link on shop page
- [ ] Test Sermorelin COA link on shop page
- [ ] Verify Instagram section visible on contact page
- [ ] Click Instagram link to verify it works
- [ ] Click logo on shop-new.html page
- [ ] Test on mobile device
- [ ] Test in different browsers (Chrome, Firefox, Safari)

### If Issues Persist

1. **Clear Netlify Cache**
   - Go to Netlify dashboard
   - Click "Clear cache and deploy site"
   - Wait for deployment to complete

2. **Check File Deployment**
   - Verify files were actually updated on server
   - Check file timestamps in Netlify deploy log
   - Ensure no files were skipped

3. **Browser Testing**
   - Test in Incognito/Private mode
   - Try different browsers
   - Check browser console for errors (F12)

4. **Path Verification**
   - Right-click broken link → Inspect
   - Check actual URL being requested
   - Verify file exists at that path on server

---

## Technical Notes

### File Paths in Production
```
✅ CORRECT:
/COAs/GHK-CU COA.pdf
/images/Klow.png
/shop.html

❌ INCORRECT:
/public/COAs/GHK-CU COA.pdf
./public/images/Klow.png
public/shop.html
```

### CSS Visibility Best Practices
```css
/* ❌ Too transparent - might be invisible */
background: rgba(255, 255, 255, 0.05);

/* ✅ Better visibility */
background: rgba(138, 125, 110, 0.15);
border: 1px solid rgba(225, 184, 127, 0.3);
box-shadow: 0 2px 8px rgba(0,0,0,0.1);
```

### Logo Link Structure
```html
<!-- ✅ CORRECT - Clickable -->
<div class="logo-section">
    <a href="index.html" class="logo-link">
        <div class="logo">EVOQ<img src="..." class="logo-bolt"></div>
        <div class="slogan">metabolic wellness, evolved</div>
    </a>
</div>

<!-- ❌ INCORRECT - Not clickable -->
<div class="logo-section">
    <div class="logo">EVOQ<img src="..." class="logo-bolt"></div>
    <div class="slogan">metabolic wellness, evolved</div>
</div>
```

---

## Summary

All three issues have been fixed:
1. ✅ COA links now use correct production paths
2. ✅ Instagram link enhanced with better visibility
3. ✅ Logo made clickable on shop-new.html

The fixes address common dev-to-production issues:
- Path differences between environments
- CSS rendering variations
- Missing HTML elements

After deployment and cache clearing, all features should work identically to the Bolt development environment.
