# 🔐 CRITICAL: Bot Protection Setup Required

## ⚠️ Your Order System Will NOT Work Until You Complete This Setup

I've added HMAC signature-based bot protection to prevent fake orders and promo code abuse. However, you MUST configure a signing secret for it to work.

## Step 1: Generate a Secure Secret

Run this command in your terminal:

```bash
openssl rand -base64 32
```

This will output something like:
```
dK8mP3nR7qT9wX2yC5bN8hV4jF6gL1mS9pQ3rT8uY2zA5cD7e
```

Copy this value - you'll need it for both steps below.

## Step 2: Set Secret in Netlify

1. Go to your Netlify dashboard: https://app.netlify.com/
2. Select your EVOQ site
3. Go to **Site configuration** → **Environment variables**
4. Click **Add a variable**
5. Add:
   - **Key:** `VITE_SIGNING_SECRET`
   - **Value:** (paste your generated secret from Step 1)
   - **Scopes:** Check both "Builds" and "Functions"
6. Click **Save**
7. **Important:** Redeploy your site for changes to take effect

## Step 3: Set Secret in Supabase

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your EVOQ project
3. Go to **Edge Functions** (in the sidebar)
4. Click **Manage secrets** or **Add secret**
5. Add:
   - **Name:** `SIGNING_SECRET` (no VITE_ prefix!)
   - **Value:** (paste the SAME secret from Step 1)
6. Click **Save**

## Step 4: Update Local .env (Optional - for local testing)

If you want to test locally:

1. Open `.env` file in your project root
2. Find the line: `VITE_SIGNING_SECRET=CHANGE_THIS_TO_A_SECURE_RANDOM_STRING_32_CHARS_MIN`
3. Replace with: `VITE_SIGNING_SECRET=your_secret_here`
4. Save the file

**Important:** Never commit the real secret to git!

## How It Works

**Before (Insecure):**
- Anyone could spam orders directly to your API
- Bots could abuse promo codes unlimited times
- No rate limiting or protection

**After (Secure):**
- Every order request is cryptographically signed with HMAC-SHA256
- Server verifies signature matches expected value
- Timestamps prevent replay attacks (5-minute window)
- Rate limiting: max 3 orders per minute per email
- Invalid signatures = instant rejection (403 Forbidden)

## Testing After Setup

1. Go to your shop page
2. Add items to cart
3. Go to checkout
4. Fill out the form
5. Submit order

**If configured correctly:**
- Order will process normally
- You'll see "Order saved to database" in console

**If NOT configured:**
- Order will fail with "Invalid request signature"
- Check browser console for errors
- Verify secrets are set in BOTH Netlify and Supabase

## What I've Already Done

✅ Removed all admin pages and functionality
✅ Removed all hardcoded Supabase credentials
✅ Added HMAC signature generation in checkout
✅ Added signature verification in edge function
✅ Added rate limiting (client + server side)
✅ Added timestamp validation to prevent replay attacks
✅ Deployed updated create-order edge function

## Security Features Now Active

1. **HMAC Request Signing:** Every order must have valid cryptographic signature
2. **Timestamp Validation:** Rejects requests older than 5 minutes or in the future
3. **Rate Limiting:** Max 3 order attempts per minute per email
4. **No Exposed Admin:** Admin functionality completely removed
5. **Environment Variables:** All credentials loaded from env vars, not hardcoded

## Troubleshooting

### "Invalid request signature" error
- Check that signing secret is set in BOTH Netlify and Supabase
- Verify the secret is EXACTLY the same in both places
- In Netlify use: `VITE_SIGNING_SECRET`
- In Supabase use: `SIGNING_SECRET` (no VITE_ prefix)

### Orders still fail after setup
- Clear your browser cache and localStorage
- Redeploy your Netlify site
- Check Supabase edge function logs for errors
- Verify environment variables are in "Production" scope in Netlify

### Want to test locally?
- Set `VITE_SIGNING_SECRET` in your `.env` file
- Restart your dev server (`npm run dev`)
- Never commit `.env` with the real secret

## Need Help?

Check the Netlify deploy logs and Supabase edge function logs for detailed error messages. The signing system will log exactly what's wrong if verification fails.
