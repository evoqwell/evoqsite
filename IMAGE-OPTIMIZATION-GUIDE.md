# Image Optimization Guide

## ⚠️ CRITICAL: Your images need optimization!

Currently, your product images are large PNG files that are killing mobile performance and costing you sales.

## Problem
- **Format:** PNG (inefficient for photos)
- **Size:** Likely 1-5 MB per image
- **Impact:** Slow page loads = bounced visitors = lost sales

## Solution: Convert to WebP

WebP provides 25-35% smaller file sizes than PNG/JPEG with same quality.

### Step 1: Install Image Optimization Tool

#### Option A: Using Online Tool (Easiest)
1. Go to https://squoosh.app/
2. Upload each product image
3. Select "WebP" format
4. Adjust quality to 80-85%
5. Download optimized image
6. Rename to match original (e.g., `GHK-Cu.webp`)

#### Option B: Using Command Line (Mac/Linux)
```bash
# Install cwebp
brew install webp  # Mac
sudo apt install webp  # Linux

# Convert all PNG images in public folder
cd /tmp/cc-agent/58636721/project/public
for img in *.png *.PNG; do
  cwebp -q 85 "$img" -o "${img%.*}.webp"
done
```

### Step 2: Update Product References

After converting images to WebP, update your Supabase products table:

```sql
-- Update image URLs to use .webp extension
UPDATE products SET image_url = '/GHK-Cu.webp' WHERE name LIKE '%GHK-CU%';
UPDATE products SET image_url = '/NAD+.webp' WHERE name LIKE '%NAD+%';
UPDATE products SET image_url = '/Tirzepatide.webp' WHERE name LIKE '%Tirzepatide%';
UPDATE products SET image_url = '/Retatrutide.webp' WHERE name LIKE '%Retatrutide%';
UPDATE products SET image_url = '/sermorelin.webp' WHERE name LIKE '%Sermorelin%';
UPDATE products SET image_url = '/Klow.webp' WHERE name LIKE '%KLOW%';
UPDATE products SET image_url = '/BAC%20water.webp' WHERE name LIKE '%BAC%';
```

### Step 3: Optimize Logo

The Logo.PNG also needs optimization:

```bash
# Convert logo
cwebp -q 90 Logo.PNG -o Logo.webp

# Update vite.config.ts to reference Logo.webp instead of Logo.PNG
```

### Step 4: Add Lazy Loading (Already Done!)

The product images already use proper lazy loading attributes. No changes needed.

## Target Sizes

After optimization, each product image should be:
- **Max width:** 800px
- **File size:** < 100KB
- **Format:** WebP
- **Quality:** 80-85%

## Expected Results

### Before Optimization
- Total image size: ~15-25 MB
- Mobile load time: 10-30 seconds
- Bounce rate: HIGH
- Google PageSpeed: 20-40/100

### After Optimization
- Total image size: ~1-2 MB
- Mobile load time: 2-4 seconds
- Bounce rate: REDUCED
- Google PageSpeed: 70-90/100

## Testing After Optimization

1. **Test on slow connection:**
   - Chrome DevTools → Network tab
   - Select "Slow 3G"
   - Reload shop page
   - Should load in < 5 seconds

2. **Check file sizes:**
   ```bash
   ls -lh public/*.webp
   ```
   Each should be < 100KB

3. **Test image quality:**
   - Open shop page
   - Zoom in on products
   - Should look sharp and clear

## Fallback for Old Browsers

WebP is supported by 95% of browsers. For the remaining 5%, add fallback:

```html
<picture>
  <source srcset="/GHK-Cu.webp" type="image/webp">
  <img src="/GHK-Cu.png" alt="GHK-Cu">
</picture>
```

But honestly, with 95% support, you can just use WebP directly.

## Automation for Future Images

When adding new products:

1. Use Squoosh.app or cwebp before uploading
2. Always use WebP format
3. Target 80-85% quality
4. Keep width ≤ 800px
5. Verify file size < 100KB

## Priority

**HIGH PRIORITY** - Do this ASAP!

Every day you don't optimize images, you're losing potential customers who bounce due to slow load times. Mobile users with poor connections will abandon your site before images even load.
