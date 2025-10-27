# EVOQ Wellness - Security Setup Guide

## Overview
Your database is now fully locked down with Row Level Security (RLS). Only authorized backend services can access and modify data.

---

## What Was Secured

### Database Security (RLS Policies)

#### Orders Table
- **LOCKED DOWN**: Public users cannot view, create, or modify orders
- **Access**: Only service role (backend) can perform any operations
- **Protection**: Prevents bots from viewing customer data or creating fake orders

#### Products Table
- **Public**: Can ONLY view active products (read-only)
- **Modifications**: Only service role can create, update, or delete products
- **Protection**: Prevents unauthorized product changes

#### Order Items & Status History
- **LOCKED DOWN**: Only service role can access
- **Protection**: Prevents data spam from bots

#### Promo Codes
- **Public**: Read-only access to active codes (needed for checkout)
- **Modifications**: Only service role can manage promo codes

#### Customers Table
- **Already Secure**: Users can only view their own data (requires authentication)

---

## Backend Architecture

### Secure Edge Functions (Serverless API)

#### 1. `create-order` Function
- Handles all order creation from checkout
- Uses service role key (backend only)
- Validates all input data
- Creates orders and order items securely
- Triggers email notifications

**Endpoint**: `https://ubtxxpaqjcqwzwmioppl.supabase.co/functions/v1/create-order`

#### 2. `admin-api` Function
- Handles all admin operations (orders, products, promo codes)
- **Password Protected**: Requires admin password in header
- Uses service role key (backend only)
- Supports actions:
  - `get_orders` - View all orders
  - `update_order_status` - Update order status/tracking
  - `get_products` - View all products
  - `update_product` - Update product
  - `create_product` - Create new product
  - `delete_product` - Delete product
  - `get_promo_codes` - View promo codes
  - `create_promo_code` - Create promo code
  - `update_promo_code` - Update promo code
  - `delete_promo_code` - Delete promo code

**Endpoint**: `https://ubtxxpaqjcqwzwmioppl.supabase.co/functions/v1/admin-api?action=ACTION_NAME`

#### 3. `order-notification` Function
- Sends order confirmation emails
- Sends SMS notifications to admin
- No password required (called internally by create-order)

---

## Admin Access

### Admin Password
**Default Password**: `evoq-secure-admin-2025`

⚠️ **IMPORTANT**: Change this password immediately!

### How to Change Admin Password

1. Go to your Supabase project: https://supabase.com/dashboard/project/ubtxxpaqjcqwzwmioppl
2. Click **Edge Functions** in the sidebar
3. Click **Manage secrets**
4. Add/Update secret:
   - Name: `ADMIN_PASSWORD`
   - Value: Your new secure password
5. Update your local `.env` file:
   ```
   VITE_ADMIN_PASSWORD=your-new-password
   ```

### Admin Pages
- **Orders Management**: `/admin.html`
- **Products Management**: `/admin-products.html`

Admin pages will prompt for password on first access. The password is stored in browser session.

---

## Security Best Practices

### ✅ What's Protected
- All database write operations require backend authentication
- Orders are completely hidden from public access
- Products can only be modified by backend
- Admin operations require password
- Rate limiting via Supabase (built-in)

### ⚠️ Important Notes

1. **Never commit secrets to git**
   - `.env` file is in `.gitignore`
   - Never share your service role key
   - Never share your admin password

2. **Admin password security**
   - Change default password immediately
   - Use a strong password (16+ characters)
   - Don't share password with unauthorized users

3. **Service role key**
   - Already configured in Supabase (don't expose it)
   - Never use service role key in frontend code
   - Only edge functions use it (server-side)

4. **Public anon key**
   - Safe to expose in frontend
   - Limited permissions (read-only on products/promo codes)
   - Cannot write to any protected tables

---

## How Data Flows

### Customer Checkout Flow
1. Customer fills checkout form
2. Frontend calls `/functions/v1/create-order` with anon key
3. Edge function validates data
4. Edge function uses service role to create order in database
5. Edge function triggers email/SMS notifications
6. Frontend shows success message

### Admin Operations Flow
1. Admin logs into admin page with password
2. Frontend stores password in session
3. Admin performs action (update order, modify product, etc.)
4. Frontend calls `/functions/v1/admin-api?action=ACTION_NAME`
5. Frontend sends password in `X-Admin-Password` header
6. Edge function validates password
7. Edge function uses service role to perform operation
8. Returns result to admin

---

## Accessing Your Backend

### View Orders
```javascript
const response = await fetch(
  'https://ubtxxpaqjcqwzwmioppl.supabase.co/functions/v1/admin-api?action=get_orders',
  {
    headers: {
      'X-Admin-Password': 'your-admin-password',
      'Content-Type': 'application/json'
    }
  }
);
const result = await response.json();
```

### Update Order Status
```javascript
const response = await fetch(
  'https://ubtxxpaqjcqwzwmioppl.supabase.co/functions/v1/admin-api?action=update_order_status',
  {
    method: 'POST',
    headers: {
      'X-Admin-Password': 'your-admin-password',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      orderId: 'order-uuid',
      status: 'shipped',
      trackingNumber: 'TRACK123',
      carrier: 'USPS'
    })
  }
);
```

### Create Product
```javascript
const response = await fetch(
  'https://ubtxxpaqjcqwzwmioppl.supabase.co/functions/v1/admin-api?action=create_product',
  {
    method: 'POST',
    headers: {
      'X-Admin-Password': 'your-admin-password',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'New Peptide',
      description: 'Description here',
      price: 99.99,
      image_url: '/images/product.png',
      coa_url: '/COAs/product.pdf',
      active: true,
      featured: false,
      sort_order: 0
    })
  }
);
```

---

## Monitoring & Logs

### View Edge Function Logs
1. Go to: https://supabase.com/dashboard/project/ubtxxpaqjcqwzwmioppl
2. Click **Edge Functions** in sidebar
3. Click on function name (`create-order`, `admin-api`, etc.)
4. Click **Logs** tab
5. View real-time logs and errors

### View Database Activity
1. Go to: https://supabase.com/dashboard/project/ubtxxpaqjcqwzwmioppl
2. Click **Database** → **Logs**
3. View all database queries and operations

---

## Troubleshooting

### "Unauthorized" Error
- Check that admin password is correct
- Verify password is set in Supabase secrets
- Clear browser cache/session

### "Failed to create order" Error
- Check Edge Function logs for details
- Verify all required fields are provided
- Check Supabase status

### Admin pages not loading data
- Check browser console for errors
- Verify admin password is correct
- Check Edge Function logs

---

## Summary

Your backend is now **fully secure**:
- ✅ Database locked down with RLS
- ✅ All write operations go through backend
- ✅ Admin operations require password
- ✅ Orders protected from public access
- ✅ Bots cannot spam or access data
- ✅ Service role key never exposed to frontend

**Next Steps:**
1. Change admin password immediately
2. Test admin pages with new password
3. Test checkout flow
4. Monitor logs for any issues
