# EVOQ Wellness - Complete Deployment Instructions

## What Has Been Completed

✅ **Contact Form Email Integration**
- Contact form now sends emails to: **evoqwell@gmail.com**
- Uses EmailJS (same service as checkout)
- Professional error handling and user feedback
- Spam protection included
- Mobile responsive

✅ **Code Ready for Deployment**
- All functionality implemented
- Project successfully built
- Production files generated in `/dist` folder

## What You Need to Do

### STEP 1: Create EmailJS Contact Form Template

Before deploying, you MUST create the email template in EmailJS:

1. **Go to EmailJS Dashboard:**
   - Visit: https://dashboard.emailjs.com/
   - Log in to your account (service_hf61b9s)

2. **Create New Template:**
   - Click **Email Templates** in sidebar
   - Click **Create New Template**
   - **Template ID:** `template_contact_form` (MUST be exact)
   - **Template Name:** Contact Form Submission

3. **Configure Template:**

   **Subject:**
   ```
   New Contact Form Submission from {{from_name}}
   ```

   **Body (HTML):**
   ```html
   <h2>New Contact Form Message</h2>

   <p><strong>From:</strong> {{from_name}}</p>
   <p><strong>Email:</strong> {{from_email}}</p>

   <h3>Message:</h3>
   <div style="background: #f5f5f5; padding: 15px; border-left: 4px solid #8A7D6E; margin: 20px 0;">
       {{message}}
   </div>

   <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">

   <p style="color: #666; font-size: 14px;">
       This message was sent via the EVOQ Wellness contact form.<br>
       Reply to: {{from_email}}
   </p>
   ```

   **To Email:** `{{to_email}}`

   **From Name:** `EVOQ Contact Form`

   **Reply To:** `{{from_email}}`

4. **Save and Test:**
   - Click **Save**
   - Click **Test it**
   - Send test email to evoqwell@gmail.com
   - Verify you receive it

**⚠️ IMPORTANT:** Template ID MUST be exactly `template_contact_form` or the form won't work!

### STEP 2: Deploy to Netlify

#### Option A: Deploy via Netlify Dashboard (Easiest)

1. **Go to Netlify:**
   - Visit: https://app.netlify.com
   - Log in or create free account

2. **Deploy Site:**
   - Click **Add new site** → **Deploy manually**
   - Drag and drop your entire project folder (or just the `/dist` folder)
   - Wait for deployment (usually 30-60 seconds)

3. **Add Environment Variables:**
   - Go to site dashboard
   - Click **Site configuration** → **Environment variables**
   - Add these variables:
     - `VITE_SUPABASE_URL` = [Your Supabase URL]
     - `VITE_SUPABASE_ANON_KEY` = [Your Supabase anon key]
   - Click **Save**

4. **Redeploy:**
   - Click **Deploys** tab
   - Click **Trigger deploy** → **Deploy site**
   - Wait for redeployment to complete

5. **Get Your URL:**
   - Netlify assigns URL like: `https://your-site-name.netlify.app`
   - You can customize it in **Site settings** → **Domain management**

#### Option B: Deploy via Git (Recommended for Updates)

1. **Initialize Git Repository:**
   ```bash
   git init
   git add .
   git commit -m "Initial EVOQ deployment with contact form"
   ```

2. **Create GitHub Repository:**
   - Go to: https://github.com/new
   - Create new repository
   - Follow instructions to push code

3. **Connect to Netlify:**
   - In Netlify dashboard, click **Add new site** → **Import from Git**
   - Choose **GitHub**
   - Select your repository
   - Configure:
     - Build command: `npm run build`
     - Publish directory: `dist`
   - Add environment variables (same as Option A)
   - Click **Deploy site**

### STEP 3: Test Contact Form on Live Site

Once deployed:

1. **Visit Contact Page:**
   - Go to: `https://your-site.netlify.app/contact.html`

2. **Fill Out Form:**
   - Name: Test User
   - Email: your-email@example.com
   - Message: "Testing contact form functionality"

3. **Submit and Verify:**
   - Click "Send Message"
   - Should see: "Thank you! Your message has been sent successfully"
   - Check **evoqwell@gmail.com** inbox (and spam folder!)

4. **Test Reply-To:**
   - Open received email
   - Click "Reply"
   - Should reply to the customer's email, not the system

### STEP 4: Test All Functionality

After deployment, test these features:

- [ ] Contact form sends emails successfully
- [ ] Contact form shows success message
- [ ] Contact form shows error message if EmailJS fails
- [ ] Checkout process still works
- [ ] Product catalog displays correctly
- [ ] Shopping cart functions properly
- [ ] All pages load without errors
- [ ] Mobile responsive design works
- [ ] Admin panels are accessible

### STEP 5: Update DNS (Optional)

If you have a custom domain:

1. In Netlify dashboard → **Domain management**
2. Click **Add custom domain**
3. Enter your domain (e.g., evoqwellness.com)
4. Follow DNS configuration instructions
5. Wait for DNS propagation (usually 24-48 hours)

## Troubleshooting

### Contact Form Not Sending Emails

**Check These:**
1. Template ID is exactly `template_contact_form` in EmailJS
2. Template is saved and published
3. Service ID is correct: `service_hf61b9s`
4. EmailJS account has available quota
5. Browser console shows no errors (press F12)
6. Check spam folder in evoqwell@gmail.com

**Common Issues:**
- **"Template not found"** → Template ID doesn't match
- **"Service unavailable"** → EmailJS service issue, check dashboard
- **"Network error"** → Check internet connection
- **Email not received** → Check spam folder, verify to_email

### Environment Variables Not Working

1. Ensure they start with `VITE_` prefix
2. Redeploy after adding variables
3. Clear browser cache
4. Check for typos in variable names

### Build Errors

If build fails:
```bash
npm install
npm run build
```
Check for errors and fix before redeploying

## Post-Deployment Checklist

- [ ] EmailJS contact template created
- [ ] Template ID is `template_contact_form`
- [ ] Test email sent and received
- [ ] Site deployed to Netlify
- [ ] Environment variables configured
- [ ] Contact form tested on live site
- [ ] Email received at evoqwell@gmail.com
- [ ] Reply-to functionality verified
- [ ] All pages accessible
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Custom domain configured (if applicable)

## Support & Maintenance

### Monitoring Emails
- Check evoqwell@gmail.com regularly for contact form submissions
- Set up email forwarding if needed
- Add evoqwell@gmail.com to safe senders to avoid spam filtering

### EmailJS Quota
- Free tier: 200 emails/month
- Monitor usage in EmailJS dashboard
- Upgrade plan if needed: https://www.emailjs.com/pricing/

### Updating Content
- To update products: Use admin panel at `/admin-products.html`
- To update contact info: Edit `contact.html`
- To change email recipient: Edit `contact.html` line 115

## Files Modified

These files were updated for contact form functionality:
- `contact.html` - Added EmailJS integration
- `CONTACT-FORM-SETUP.md` - Complete setup guide
- `DEPLOYMENT-INSTRUCTIONS.md` - This file

## Success Criteria

Your deployment is successful when:
1. ✅ Contact form submission shows success message
2. ✅ Email arrives at evoqwell@gmail.com within 1 minute
3. ✅ Email includes customer name, email, and message
4. ✅ Reply-to goes to customer's email
5. ✅ Form clears after successful submission
6. ✅ Error handling works when offline

## Next Steps

After successful deployment:
1. Test contact form from different devices
2. Add contact form link to navigation if needed
3. Monitor email delivery for first few days
4. Set up Google Analytics (optional)
5. Configure email notifications/forwarding
6. Add admin panel products
7. Update product images and COAs

---

**Need Help?**
- EmailJS Docs: https://www.emailjs.com/docs/
- Netlify Docs: https://docs.netlify.com/
- Supabase Docs: https://supabase.com/docs

Your EVOQ Wellness site is ready for deployment! 🚀
