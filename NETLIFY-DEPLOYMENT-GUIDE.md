# Complete Netlify Deployment Guide for EVOQ Wellness

## Pre-Deployment Checklist

### ✅ Already Completed

Your site is **fully ready for deployment** with:

1. **Mobile-Responsive Design** ✓
   - Mobile-first approach with hamburger menu
   - Responsive grid layouts
   - Touch-friendly buttons (48px minimum height)
   - Optimized for all screen sizes (mobile, tablet, desktop)

2. **Age Verification System** ✓
   - Modal displays on first visit
   - Stores verification in localStorage
   - Professional design matching site aesthetic
   - Compliant messaging for research products

3. **Netlify Configuration** ✓
   - `netlify.toml` created with optimal settings
   - Security headers configured
   - Redirect rules set up
   - Cache optimization enabled

4. **Environment Variables** ✓
   - Supabase configured
   - Database connected
   - Order tracking system ready

---

## Netlify Deployment Process

### Option 1: Deploy via Git (Recommended)

#### Step 1: Push Your Code to GitHub

1. **Create a GitHub Repository**
   - Go to https://github.com/new
   - Repository name: `evoq-wellness` (or your preferred name)
   - Select "Private" for privacy
   - Do NOT initialize with README (your project already has files)
   - Click "Create repository"

2. **Push Your Code**
   ```bash
   # Navigate to your project folder
   cd /path/to/your/project

   # Initialize git (if not already initialized)
   git init

   # Add all files
   git add .

   # Commit files
   git commit -m "Initial commit - EVOQ Wellness site"

   # Add remote (replace with YOUR repository URL)
   git remote add origin https://github.com/YOUR-USERNAME/evoq-wellness.git

   # Push to GitHub
   git push -u origin main
   ```

#### Step 2: Connect to Netlify

1. **Create/Login to Netlify Account**
   - Go to https://netlify.com
   - Click "Sign up" or "Log in"
   - Use GitHub to sign in (easiest option)

2. **Import Your Project**
   - Click "Add new site" button (top-right)
   - Select "Import an existing project"
   - Choose "Deploy with GitHub"
   - Authorize Netlify to access GitHub
   - Select your `evoq-wellness` repository

3. **Configure Build Settings**

   Netlify will auto-detect settings from `netlify.toml`, but verify:

   ```
   Branch to deploy: main
   Build command: (leave empty or use "echo 'Static site'")
   Publish directory: . (dot - meaning root directory)
   ```

   Click "Deploy site"

4. **Wait for Deployment** ⏱️
   - First deployment takes 1-2 minutes
   - Watch the deploy log for any errors
   - You'll see "Site is live" when complete

---

### Option 2: Manual Deploy (Drag & Drop)

#### Quick Method - No Git Required

1. **Prepare Your Files**
   - ZIP your entire project folder
   - OR just drag the project folder directly

2. **Deploy to Netlify**
   - Go to https://app.netlify.com/drop
   - Drag your project folder (or ZIP file) to the upload area
   - Netlify will automatically deploy
   - You'll get a random URL like `random-name-123456.netlify.app`

3. **Limitations of Manual Deploy**
   - No automatic updates when you change code
   - Must manually re-upload for updates
   - Best for quick tests, not production

---

## Post-Deployment Configuration

### Step 1: Set Up Environment Variables

Your site uses Supabase, so you need to add environment variables:

1. **In Netlify Dashboard**
   - Click on your site
   - Go to "Site configuration" (left sidebar)
   - Click "Environment variables"
   - Click "Add a variable" → "Add a single variable"

2. **Add These Variables**

   **Variable 1:**
   ```
   Key: VITE_SUPABASE_URL
   Value: https://ubtxxpaqjcqwzwmioppl.supabase.co
   ```

   **Variable 2:**
   ```
   Key: VITE_SUPABASE_ANON_KEY
   Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVidHh4cGFxamNxd3p3bWlvcHBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MTcwNTksImV4cCI6MjA3NjM5MzA1OX0.3rUgCzvwPtfijEWYU-SCg1c3FUjVENpqQ8D4gIhLazw
   ```

   For each variable:
   - Select "Same value for all deploy contexts"
   - Click "Create variable"

3. **Redeploy After Adding Variables**
   - Go to "Deploys" tab
   - Click "Trigger deploy" → "Deploy site"

---

### Step 2: Configure Custom Domain (Optional)

#### Using Netlify Domain (Free)

1. **Change Site Name**
   - In Netlify Dashboard → "Site configuration" → "General"
   - Click "Change site name"
   - Enter: `evoqwellness` (or your preferred subdomain)
   - Your URL becomes: `https://evoqwellness.netlify.app`

#### Using Your Own Domain

1. **Purchase a Domain**
   - Recommended: Namecheap, Google Domains, GoDaddy
   - Example: `evoqwellness.com`

2. **Add Domain in Netlify**
   - Go to "Domain management" → "Add a domain"
   - Enter your domain: `evoqwellness.com`
   - Click "Verify"

3. **Configure DNS**

   Netlify will show you DNS records to add. Two options:

   **Option A: Use Netlify DNS (Easiest)**
   - Netlify provides nameservers
   - Update nameservers at your domain registrar
   - Netlify manages everything else automatically

   **Option B: Use Registrar DNS**
   - Add A record: `104.198.14.52` (Netlify's load balancer)
   - Add CNAME record: `www` → `your-site.netlify.app`

4. **Wait for DNS Propagation**
   - Usually takes 1-24 hours
   - Check status in Netlify dashboard

---

### Step 3: Enable HTTPS/SSL (Automatic)

1. **SSL Certificate**
   - Netlify provides FREE SSL via Let's Encrypt
   - Automatically enabled within 1 hour of domain setup
   - No action required from you

2. **Force HTTPS**
   - Go to "Domain management" → "HTTPS"
   - Enable "Force HTTPS"
   - All HTTP traffic will redirect to HTTPS

3. **Verify HTTPS**
   - Visit your site: `https://your-domain.com`
   - Look for padlock icon in browser
   - Click padlock to verify certificate

---

## Testing Your Deployed Site

### Desktop Testing

1. **Open in Multiple Browsers**
   - Chrome
   - Firefox
   - Safari
   - Edge

2. **Test All Pages**
   - ✅ Home page (`/`)
   - ✅ Products page (`/shop.html`)
   - ✅ About page (`/about.html`)
   - ✅ Contact page (`/contact.html`)
   - ✅ Checkout page (`/checkout.html`)

3. **Test Age Verification**
   - Open site in incognito/private mode
   - Age modal should appear immediately
   - Click "I am 18 or older" → modal closes
   - Refresh page → modal should NOT appear again
   - Clear browser data → modal should appear again

4. **Test Full Purchase Flow**
   - Browse products
   - Add items to cart
   - View cart in checkout
   - Fill out shipping form
   - Place order
   - Verify order confirmation modal
   - Click "Pay with Venmo" → Venmo link opens
   - Check email for confirmation (both buyer and seller)

---

### Mobile Testing

#### Method 1: Browser DevTools (Quick Test)

1. **Open DevTools**
   - Press `F12` in Brave/Chrome
   - Press `Ctrl+Shift+M` (Windows) or `Cmd+Shift+M` (Mac)

2. **Select Device**
   - Choose "iPhone 12 Pro" or "Pixel 5"
   - Test all pages
   - Verify hamburger menu works

#### Method 2: Real Device Testing (Recommended)

1. **On Your Phone**
   - Open browser (Safari, Chrome, etc.)
   - Visit your Netlify URL
   - Test everything:
     - ✅ Age verification displays properly
     - ✅ Hamburger menu opens/closes smoothly
     - ✅ All navigation links work
     - ✅ Product images load correctly
     - ✅ Add to cart buttons are large and tappable
     - ✅ Checkout form is easy to fill
     - ✅ Venmo button opens Venmo app
     - ✅ No text is cut off or unreadable
     - ✅ No horizontal scrolling

2. **Test Different Orientations**
   - Portrait mode (vertical)
   - Landscape mode (horizontal)

3. **Test Different Devices**
   - iPhone (iOS)
   - Android phone
   - Tablet (if available)

---

## Troubleshooting Common Issues

### Issue 1: Site Shows 404 Error

**Symptoms:** Page not found after deployment

**Solution:**
1. Check "Deploys" tab → Should show "Published"
2. Verify `netlify.toml` exists in root
3. Check "Publish directory" is set to `.` (dot)
4. Redeploy: "Deploys" → "Trigger deploy" → "Clear cache and deploy site"

---

### Issue 2: Age Verification Not Working

**Symptoms:** Modal doesn't appear or appears every time

**Solution:**
1. Open browser console (F12 → Console tab)
2. Check for JavaScript errors
3. Verify `script.js` is loading: Network tab → Look for `script.js`
4. Clear localStorage: Console → Type `localStorage.clear()` → Refresh

---

### Issue 3: Images Not Loading

**Symptoms:** Broken image icons or missing product photos

**Solution:**
1. Check file paths in HTML (should be `images/product-name.png`)
2. Verify images exist in deployed site: Netlify → "Deploys" → "Deploy log"
3. Check file extensions match exactly (case-sensitive)
4. Re-upload images if necessary

---

### Issue 4: Checkout/Cart Not Working

**Symptoms:** Items don't add to cart, or checkout fails

**Solution:**
1. Verify environment variables are set correctly
2. Check browser console for Supabase errors
3. Test Supabase connection: Admin page → View orders
4. Verify EmailJS is configured (if using email notifications)

---

### Issue 5: Mobile Menu Not Opening

**Symptoms:** Hamburger icon doesn't respond on mobile

**Solution:**
1. Clear browser cache and hard refresh
2. Check console for JavaScript errors
3. Verify `script.js` is loading correctly
4. Test in different mobile browsers

---

### Issue 6: Venmo Link Not Working

**Symptoms:** Venmo button doesn't open payment page

**Solution:**
1. Verify order confirmation modal shows correct URL format:
   ```
   https://venmo.com/EVOQWELL?txn=pay&amount=XXX.XX&note=EVOQ-XXXXXXXX-XXX
   ```
2. Test link manually by copying and pasting in browser
3. On mobile, ensure Venmo app is installed
4. Check browser isn't blocking popups

---

## Performance Optimization

### After Deployment

1. **Run Performance Tests**
   - Visit https://pagespeed.web.dev
   - Enter your Netlify URL
   - Check mobile and desktop scores
   - Follow recommendations if score < 90

2. **Enable Asset Optimization**
   - Netlify Dashboard → "Site configuration" → "Build & deploy"
   - Scroll to "Asset optimization"
   - Enable "Bundle CSS" and "Minify JS"
   - Save and redeploy

3. **Monitor Site Performance**
   - Netlify Analytics (paid feature)
   - Google Analytics (free, requires setup)
   - Google Search Console (free, for SEO)

---

## Continuous Updates

### Updating Your Site (Git Method)

1. **Make Changes Locally**
   - Edit files in your project
   - Test changes locally

2. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin main
   ```

3. **Automatic Deployment**
   - Netlify detects push
   - Automatically builds and deploys
   - Usually takes 1-2 minutes
   - Check "Deploys" tab for status

### Updating Your Site (Manual Method)

1. Make changes to your files
2. Go to https://app.netlify.com/drop
3. Drag updated folder to update site

---

## Security Best Practices

### Protecting Sensitive Data

1. **Never Commit Secrets**
   - `.env` file is in `.gitignore` ✓
   - Environment variables only in Netlify dashboard ✓

2. **Enable Form Spam Protection**
   - Netlify Dashboard → "Site configuration" → "Forms"
   - Enable "reCAPTCHA" for contact form

3. **Monitor for Issues**
   - Check deploy logs regularly
   - Set up Netlify notifications for failed deployments

---

## Age Verification Compliance

### Legal Considerations

Your age verification implementation:

✅ **What It Does:**
- Displays clear warning about age requirements
- States products are for research purposes only
- Prevents accidental access by minors
- Stores user confirmation locally

⚠️ **What It Doesn't Do:**
- Does NOT verify actual age (no ID check)
- Can be bypassed by clearing browser data
- Not a legal guarantee of age

💡 **Recommendations:**
- This is a "soft" age gate suitable for compliance
- For stricter requirements, consider third-party age verification services
- Consult a lawyer for specific jurisdiction requirements
- Update footer disclaimer as needed

---

## Support & Resources

### Netlify Documentation
- https://docs.netlify.com/
- https://docs.netlify.com/domains-https/custom-domains/

### Troubleshooting Help
- Netlify Community Forums: https://answers.netlify.com/
- Netlify Status Page: https://www.netlifystatus.com/

### Supabase Documentation
- https://supabase.com/docs

---

## Quick Reference Commands

```bash
# Check if git is initialized
git status

# Add all changes
git add .

# Commit changes
git commit -m "Your message here"

# Push to GitHub
git push origin main

# View remote URL
git remote -v

# Create new branch
git checkout -b feature-name

# Switch branches
git checkout main
```

---

## Deployment Checklist

Use this checklist for each deployment:

- [ ] All HTML files have age verification
- [ ] Mobile menu works on all pages
- [ ] Environment variables set in Netlify
- [ ] Images load correctly
- [ ] Cart/checkout functionality works
- [ ] Venmo payment link opens
- [ ] Contact form submits successfully
- [ ] Admin panel accessible (if applicable)
- [ ] SSL certificate active (HTTPS)
- [ ] Custom domain configured (if applicable)
- [ ] Performance score > 85 (PageSpeed Insights)
- [ ] Tested on mobile devices
- [ ] Tested in multiple browsers
- [ ] 404 redirects work
- [ ] All links function properly

---

## Your Site is Ready! 🚀

Your EVOQ Wellness site is fully prepared for production deployment with:
- Professional mobile-responsive design
- Age verification system
- Secure checkout with Venmo integration
- Database-backed order tracking
- Optimized performance
- Security best practices

Follow the steps above to deploy, and you'll have a live, professional research peptide e-commerce site in minutes!

**Your Netlify URL will be:** `https://[your-site-name].netlify.app`

Good luck with your deployment! 🎉
