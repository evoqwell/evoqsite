# EmailJS Integration - EVOQ Wellness

## Overview
Your original working EmailJS integration has been successfully integrated into the new EVOQ Wellness website. The checkout process now sends emails to both the buyer and seller exactly as it did in your original code.

## Integration Details

### EmailJS Configuration
- **Public Key:** `x-F-AEMjGhh61DlcQ`
- **Service ID:** `service_hf61b9s`
- **Buyer Template ID:** `template_e3wgwos`
- **Seller Template ID:** `template_ewj2a9v`

### What Was Integrated

#### 1. EmailJS Library (checkout.html)
```html
<script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js"></script>
```
Uses version 3 to match your original implementation.

#### 2. EmailJS Initialization (script.js)
```javascript
if (typeof emailjs !== 'undefined') {
  emailjs.init('x-F-AEMjGhh61DlcQ');
}
```
Initializes on page load with your public key.

#### 3. Order Number Generation
```javascript
function generateOrderNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `EVOQ-${date}-${random}`;
}
```
Generates format: `EVOQ-YYYYMMDD-###`

#### 4. Dual Email Sending

**Email to Buyer (Confirmation with Payment Instructions):**
```javascript
const buyerParams = {
  to_email: email,
  reply_to: email,
  order_number: orderNumber,
  items: cartItems,
  subtotal: '$XX.XX',
  shipping: '$10.00',
  total: '$XX.XX',
  venmo_link: venmoUrl,
  fulfillment: 'Order will be fulfilled within 2-3 business days after payment.'
};
await emailjs.send('service_hf61b9s', 'template_e3wgwos', buyerParams);
```

**Email to Seller (Order Details):**
```javascript
const sellerParams = {
  order_number: orderNumber,
  items: cartItems,
  subtotal: '$XX.XX',
  shipping: '$10.00',
  total: '$XX.XX',
  name: name,
  address: fullAddress,
  email: email
};
await emailjs.send('service_hf61b9s', 'template_ewj2a9v', sellerParams);
```

#### 5. Venmo Payment Link
```javascript
const venmoUrl = `https://venmo.com/EVOQWELL?txn=pay&amount=${total.toFixed(2)}&note=${encodeURIComponent(orderNumber)}`;
```
- Links directly to your Venmo: **@EVOQWELL**
- Pre-fills amount and order number in note
- Displayed in success message after order submission

#### 6. Order Confirmation Display
After successful email sending, shows:
- Order number
- Itemized cart
- Subtotal, shipping, total
- Status: "Awaiting Payment"
- Clickable Venmo payment link
- Reminder to check spam folder

### Cart Storage Compatibility
The new implementation is backward compatible with your old cart storage:
- Checks for both `evoqCart` and `evoq-cart` localStorage keys
- Automatically migrates old cart data
- Saves to both keys for compatibility

### Complete Checkout Flow

1. **User fills out shipping form**
   - Name, email, address, city, state, ZIP
   - Real-time validation

2. **User clicks "Place Order"**
   - Form validates all fields
   - Checks cart is not empty
   - Button disables and shows "Processing..."

3. **Order processing**
   - Generates unique order number
   - Calculates totals
   - Creates Venmo payment URL

4. **Sends two emails simultaneously**
   - Buyer: Confirmation with Venmo link
   - Seller: Order details with customer info

5. **Shows success confirmation**
   - Order details displayed on page
   - Venmo payment button prominently shown
   - Alert message: "Order submitted! Emails have been sent."

6. **Cleanup**
   - Cart cleared from localStorage
   - Form reset
   - Button re-enabled

### Error Handling
If email sending fails:
- Shows error message to user
- Logs error to console
- Re-enables submit button
- Cart remains intact for retry

## Testing Checklist

- [x] EmailJS public key integrated
- [x] Service and template IDs configured
- [x] Order number generation working
- [x] Buyer email sends with Venmo link
- [x] Seller email sends with customer details
- [x] Venmo URL correctly formatted
- [x] Cart clears after successful order
- [x] Success message displays properly
- [x] Error handling implemented
- [x] Compatible with old cart storage

## What Works Exactly Like Your Original

✅ Same EmailJS service and templates
✅ Same public key
✅ Same order number format
✅ Same Venmo username (@EVOQWELL)
✅ Same email parameters
✅ Same dual email sending (buyer + seller)
✅ Same payment link generation
✅ Same success/error handling
✅ Same alert message on submission

## Enhancements from Original

🎨 Better form validation with visual feedback
🎨 Improved responsive design
🎨 Enhanced error messages
🎨 Loading state on submit button
🎨 Animated success message
🎨 Professional checkout layout
🎨 Accessibility improvements (ARIA labels, keyboard navigation)
🎨 Cart persistence across page refreshes

## Important Notes

1. **Spam Folder Reminder:** The checkout includes prominent reminders to check spam/junk folders, as specified in your original code.

2. **Payment Instructions:** The buyer email includes the fulfillment message: "Order will be fulfilled within 2-3 business days after payment."

3. **Venmo Integration:** The Venmo link opens in a new tab and includes the order number in the payment note for easy tracking.

4. **No Changes Needed:** Your EmailJS templates don't need any changes - all parameter names match your existing setup.

## Your Original Code That Was Preserved

From your checkout.html, these critical elements were preserved:
- `emailjs.init('x-F-AEMjGhh61DlcQ')`
- `emailjs.send('service_hf61b9s', 'template_e3wgwos', buyerParams)`
- `emailjs.send('service_hf61b9s', 'template_ewj2a9v', sellerParams)`
- `https://venmo.com/EVOQWELL?txn=pay&amount=...`
- Order number format: `EVOQ-${date}-${random}`
- All email template parameters

Your working email system is now fully integrated into the professional EVOQ Wellness website!
