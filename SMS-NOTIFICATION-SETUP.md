# SMS Order Notification Setup Guide

This guide will help you set up text message (SMS) notifications for new orders using Twilio.

## Overview

When a customer places an order, you'll automatically receive a **text message** on your phone with:
- Order number and total
- Customer name and email
- Items ordered
- Shipping location

## Example Text Message

```
🔔 EVOQ New Order!

Order: ORD-20241018-ABCD
Total: $340.00

Customer: John Smith
Email: john@example.com

Items: 1x Tirzepatide 30mg, 2x GHK-CU 50mg

Shipping: Los Angeles, CA

View details in admin panel.
```

## Setup Steps

### 1. Create a Twilio Account

Twilio is the industry standard for SMS messaging.

1. Go to [twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. Sign up for a **free trial account**
3. Verify your email and phone number

**Free Trial Includes:**
- $15.00 in free credit
- About 500 SMS messages (depending on your country)
- No credit card required to start

### 2. Get a Twilio Phone Number

1. Log into your Twilio Console
2. Go to **Phone Numbers** → **Manage** → **Buy a number**
3. Select your country (usually United States)
4. Click **Search** and choose any available number
5. Click **Buy** (uses free trial credit, about $1/month)

**Important:** Save this phone number - you'll need it for configuration.

### 3. Get Your Twilio Credentials

1. In the Twilio Console, go to your **Dashboard**
2. Find your **Account Info** section
3. Copy the following values:
   - **Account SID** (starts with `AC...`)
   - **Auth Token** (click to reveal and copy)

### 4. Configure Supabase Environment Variables

1. Go to your Supabase project dashboard
2. Navigate to **Edge Functions** → **Configuration**
3. Add these 4 environment variables:

| Variable Name | Value | Example |
|---------------|-------|---------|
| `TWILIO_ACCOUNT_SID` | Your Account SID | `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `TWILIO_AUTH_TOKEN` | Your Auth Token | `your_auth_token_here` |
| `TWILIO_PHONE_NUMBER` | Your Twilio number | `+15551234567` |
| `ADMIN_PHONE_NUMBER` | Your personal phone | `+15559876543` |

**Important Phone Number Format:**
- Must include country code
- Format: `+1` (US) + area code + number
- Example: `+15551234567`
- No spaces, dashes, or parentheses

### 5. Deploy the Edge Function

The Edge Function is already created and ready to deploy.

**Option A: Using Supabase Dashboard**
1. Go to **Edge Functions** in your Supabase dashboard
2. Click **Deploy new function**
3. Upload the function from `supabase/functions/order-notification/index.ts`

**Option B: Using Supabase CLI** (if you have it installed)
```bash
supabase functions deploy order-notification
```

## Testing

After deployment:

1. Place a test order on your website
2. Within seconds, you should receive a text message
3. Check that all order details are correct

**Troubleshooting Test Messages:**
- During trial, you can only send to **verified phone numbers**
- Verify your admin phone in Twilio Console: **Phone Numbers** → **Verified Caller IDs**
- Upgrade to a paid account to send to any number (no verification needed)

## Costs

### Trial Account (Free)
- $15.00 in free credits
- Can send ~500 messages
- Only to verified numbers
- Perfect for testing

### Paid Account (After Trial)
- **$1.00/month** - Phone number rental
- **$0.0079/SMS** - US domestic messages (less than 1 cent per text!)
- **$0.040/SMS** - International rates vary

**Example Monthly Cost:**
- 100 orders = $1.79/month
- 500 orders = $4.95/month
- 1000 orders = $8.90/month

## Upgrade to Paid Account

When your trial credits run out or you want to remove restrictions:

1. Go to **Billing** in Twilio Console
2. Click **Upgrade**
3. Add payment method
4. No changes needed to your code

## Benefits of SMS vs Email

✅ **Instant notifications** - See orders immediately
✅ **No spam folder** - Always delivered
✅ **Mobile-friendly** - Perfect for on-the-go
✅ **Quick glance** - Key info at a glance
✅ **High open rate** - 98% of SMS messages are read

## Message Customization

You can customize the SMS message in the Edge Function file:
`supabase/functions/order-notification/index.ts` (lines 61-73)

**Character Limit:**
- SMS messages are limited to 160 characters per segment
- Longer messages are automatically split (charged per segment)
- Current message is ~200 characters (2 segments = ~$0.016 per order)

**Customization Ideas:**
- Add emojis for visual cues
- Include direct admin panel link
- Add shipping address details
- Include customer phone number

## Multiple Recipients (Optional)

To send notifications to multiple phone numbers:

1. Add more environment variables in Supabase:
   - `ADMIN_PHONE_NUMBER_2`
   - `ADMIN_PHONE_NUMBER_3`

2. Update the Edge Function to send multiple messages:
```typescript
const phoneNumbers = [
  ADMIN_PHONE_NUMBER,
  Deno.env.get("ADMIN_PHONE_NUMBER_2"),
  Deno.env.get("ADMIN_PHONE_NUMBER_3")
].filter(Boolean);

for (const phoneNumber of phoneNumbers) {
  // Send SMS to each number
}
```

## Security

- All credentials are stored securely in Supabase environment variables
- Credentials are never exposed to the client
- Only your checkout process can trigger notifications
- Twilio connections use secure HTTPS

## Troubleshooting

### Not Receiving Messages?

1. **Check Phone Number Format**
   - Must include country code: `+15551234567`
   - No spaces or special characters

2. **Verify Twilio Credentials**
   - Account SID starts with `AC`
   - Auth Token is correct
   - Phone numbers match exactly

3. **Trial Account Restrictions**
   - During trial, verify your admin phone in Twilio Console
   - Upgrade to send to any number without verification

4. **Check Twilio Console**
   - Go to **Monitor** → **Logs** → **Messaging**
   - See if messages were sent and any error codes

5. **Check Supabase Logs**
   - In Supabase dashboard, check Edge Function logs
   - Look for errors or failed API calls

### Common Error Codes

- **21211** - Invalid phone number format
- **21608** - Unverified number (trial accounts)
- **20003** - Authentication failed (check credentials)
- **21610** - Message blocked (check phone carrier)

## Support

- **Twilio Documentation**: [twilio.com/docs/sms](https://www.twilio.com/docs/sms)
- **Twilio Support**: Available in console
- **Supabase Edge Functions**: [supabase.com/docs/guides/functions](https://supabase.com/docs/guides/functions)

## Next Steps

After setup is complete, you'll receive instant text notifications for every order!

You can also keep your existing EmailJS setup for customer confirmation emails - this SMS system is just for your internal notifications.
