import { fetchPromoCode, createOrder, fetchProducts } from './lib/api.js';
import { getCart, clearCart, updateQuantity, removeFromCart, addToCart } from './lib/cart.js';
import { escapeHtml, sanitizeProductId, sanitizeCurrency } from './lib/sanitizer.js';
import { sendOrderEmails } from './lib/email.js';

let appliedPromos = [];
let shippingRate = 10;
let checkoutFormValidator = null;
let bacWaterProduct = null; // Store BAC water product info

document.addEventListener('DOMContentLoaded', async () => {
  await hydrateCheckoutSettings();
  displayCartItems();
  initCheckoutForm();
  initPromoCode();
  initClearCart();
});

async function hydrateCheckoutSettings() {
  try {
    const { products, meta } = await fetchProducts();
    if (meta && typeof meta.shippingFlatRate === 'number') {
      shippingRate = meta.shippingFlatRate;
    }

    // Find BAC water product dynamically (matches "BAC" in the name, case-insensitive)
    bacWaterProduct = products.find(product =>
      product.name && product.name.toLowerCase().includes('bac')
    );

    if (!bacWaterProduct) {
      console.warn('BAC water product not found in catalog');
    }
  } catch (error) {
    console.warn('Failed to load storefront settings. Falling back to default shipping.', error);
  }
}

function displayCartItems() {
  const cart = getCart();
  const cartContainer = document.getElementById('cart-items-container');
  const emptyMessage = document.getElementById('empty-cart-message');

  if (!cartContainer) return;

  if (!cart.length) {
    cartContainer.innerHTML = '';
    if (emptyMessage) emptyMessage.style.display = 'block';
    updateOrderSummary({ subtotal: 0, discount: 0, shipping: 0, total: 0 });
    return;
  }

  if (emptyMessage) emptyMessage.style.display = 'none';

  // Clear container first
  cartContainer.innerHTML = '';

  // Build cart items safely using DOM methods
  cart.forEach((item) => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'cart-item';
    itemDiv.dataset.id = sanitizeProductId(item.id);

    // Create cart item info
    const infoDiv = document.createElement('div');
    infoDiv.className = 'cart-item-info';

    const nameEl = document.createElement('h4');
    nameEl.textContent = item.name; // Safe: using textContent
    infoDiv.appendChild(nameEl);

    const priceEl = document.createElement('p');
    priceEl.className = 'cart-item-price';
    priceEl.textContent = `$${sanitizeCurrency(item.price).toFixed(2)}`;
    infoDiv.appendChild(priceEl);

    // Create controls
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'cart-item-controls';

    const decreaseBtn = document.createElement('button');
    decreaseBtn.className = 'btn-quantity';
    decreaseBtn.dataset.id = sanitizeProductId(item.id);
    decreaseBtn.dataset.action = 'decrease';
    decreaseBtn.textContent = '-';
    controlsDiv.appendChild(decreaseBtn);

    const quantitySpan = document.createElement('span');
    quantitySpan.className = 'item-quantity';
    quantitySpan.textContent = item.quantity;
    controlsDiv.appendChild(quantitySpan);

    const increaseBtn = document.createElement('button');
    increaseBtn.className = 'btn-quantity';
    increaseBtn.dataset.id = sanitizeProductId(item.id);
    increaseBtn.dataset.action = 'increase';
    increaseBtn.textContent = '+';
    controlsDiv.appendChild(increaseBtn);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-remove';
    removeBtn.dataset.id = sanitizeProductId(item.id);
    removeBtn.textContent = 'Remove';
    controlsDiv.appendChild(removeBtn);

    // Create total
    const totalDiv = document.createElement('div');
    totalDiv.className = 'cart-item-total';
    totalDiv.textContent = `$${(sanitizeCurrency(item.price) * item.quantity).toFixed(2)}`;

    // Append all to item
    itemDiv.appendChild(infoDiv);
    itemDiv.appendChild(controlsDiv);
    itemDiv.appendChild(totalDiv);

    cartContainer.appendChild(itemDiv);
  });

  document.querySelectorAll('.btn-quantity').forEach((btn) => {
    btn.addEventListener('click', handleQuantityChange);
  });

  document.querySelectorAll('.btn-remove').forEach((btn) => {
    btn.addEventListener('click', handleRemoveItem);
  });

  const totals = calculateTotals(cart);
  updateOrderSummary(totals);
}

function handleQuantityChange(event) {
  const productId = event.target.dataset.id;
  const action = event.target.dataset.action;
  if (!productId || !action) return;

  const change = action === 'increase' ? 1 : -1;
  updateQuantity(productId, change);
  displayCartItems();
}

function handleRemoveItem(event) {
  const productId = event.target.dataset.id;
  if (!productId) return;

  removeFromCart(productId);
  displayCartItems();
}

function calculateTotals(cart) {
  const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

  // Calculate each discount on BASE subtotal (not compounding)
  let discount = 0;
  const discountDetails = [];

  for (const promo of appliedPromos) {
    let amount = 0;
    if (promo.discountType === 'percentage') {
      amount = Math.round(subtotal * (promo.discountValue / 100) * 100) / 100;
    } else if (promo.discountType === 'fixed') {
      amount = Math.min(promo.discountValue, subtotal);
    }
    discountDetails.push({
      code: promo.code,
      amount,
      type: promo.discountType,
      value: promo.discountValue
    });
    discount += amount;
  }

  // Cap total discount at subtotal
  discount = Math.min(discount, subtotal);

  const shipping = subtotal > 0 ? shippingRate : 0;
  const total = subtotal - discount + shipping;
  return { subtotal, discount, discountDetails, shipping, total };
}

function calculateDiscount(subtotal, promo) {
  if (!promo) return 0;

  if (promo.discountType === 'percentage') {
    return Math.round(subtotal * (promo.discountValue / 100) * 100) / 100;
  }

  if (promo.discountType === 'fixed') {
    return Math.min(promo.discountValue, subtotal);
  }

  return 0;
}

function updateOrderSummary({ subtotal, discount, discountDetails = [], shipping, total }) {
  const subtotalEl = document.getElementById('cart-subtotal');
  const discountContainer = document.getElementById('promo-discounts-container');
  const shippingEl = document.getElementById('cart-shipping');
  const shippingRow = document.getElementById('shipping-row');
  const totalEl = document.getElementById('cart-total');

  if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
  if (shippingEl) shippingEl.textContent = `$${shipping.toFixed(2)}`;
  if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;

  if (shippingRow) {
    shippingRow.style.display = subtotal > 0 ? 'flex' : 'none';
  }

  // Render individual discount lines
  if (discountContainer) {
    discountContainer.innerHTML = '';

    if (discountDetails.length > 0) {
      discountContainer.style.display = 'block';

      discountDetails.forEach(detail => {
        const row = document.createElement('div');
        row.className = 'total-row promo-discount-row';

        const labelSpan = document.createElement('span');
        labelSpan.textContent = `Discount (${detail.code}):`;

        const amountSpan = document.createElement('span');
        amountSpan.className = 'discount-amount';
        amountSpan.textContent = `-$${detail.amount.toFixed(2)}`;

        row.appendChild(labelSpan);
        row.appendChild(amountSpan);
        discountContainer.appendChild(row);
      });

      // Add total savings row if multiple codes
      if (discountDetails.length > 1) {
        const totalRow = document.createElement('div');
        totalRow.className = 'total-row total-savings';

        const totalLabel = document.createElement('span');
        totalLabel.textContent = 'Total Savings:';

        const totalAmount = document.createElement('span');
        totalAmount.className = 'discount-amount';
        totalAmount.textContent = `-$${discount.toFixed(2)}`;

        totalRow.appendChild(totalLabel);
        totalRow.appendChild(totalAmount);
        discountContainer.appendChild(totalRow);
      }
    } else {
      discountContainer.style.display = 'none';
    }
  }
}

function initPromoCode() {
  const applyBtn = document.getElementById('apply-promo');
  const promoInput = document.getElementById('promo-code');

  if (!applyBtn || !promoInput) return;

  applyBtn.addEventListener('click', handleApplyPromo);

  // Allow Enter key to apply
  promoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApplyPromo();
    }
  });
}

async function handleApplyPromo() {
  const promoInput = document.getElementById('promo-code');
  const promoMessage = document.getElementById('promo-message');
  const applyBtn = document.getElementById('apply-promo');

  if (!promoInput || !promoMessage) return;

  const code = promoInput.value.trim().toUpperCase();
  if (!code) {
    promoMessage.className = 'promo-message error';
    promoMessage.textContent = 'Please enter a promo code.';
    return;
  }

  // Check for duplicate
  if (appliedPromos.some(p => p.code.toUpperCase() === code)) {
    promoMessage.className = 'promo-message warning';
    promoMessage.textContent = 'This code is already applied.';
    promoInput.classList.add('shake');
    setTimeout(() => promoInput.classList.remove('shake'), 400);
    promoInput.select();
    return;
  }

  applyBtn.disabled = true;
  applyBtn.textContent = 'Checking...';

  try {
    const promo = await fetchPromoCode(code);
    appliedPromos.push(promo);

    promoMessage.className = 'promo-message success';
    promoMessage.textContent = `"${promo.code}" applied! ${promo.description || ''}`;

    // Clear input for next code
    promoInput.value = '';
    promoInput.focus();

    // Update UI
    renderAppliedPromoTags();
    displayCartItems();
  } catch (error) {
    console.error('Promo validation failed', error);
    promoMessage.className = 'promo-message error';
    promoMessage.textContent = error.message || 'Promo code is not valid.';
  } finally {
    applyBtn.disabled = false;
    applyBtn.textContent = 'Apply';
  }
}

function renderAppliedPromoTags() {
  const container = document.getElementById('applied-promos-container');
  if (!container) return;

  if (appliedPromos.length === 0) {
    container.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  container.style.display = 'block';
  container.innerHTML = '';

  appliedPromos.forEach((promo, index) => {
    const tag = document.createElement('div');
    tag.className = 'promo-tag';
    tag.dataset.promoCode = promo.code;

    // Format discount display
    const discountText = promo.discountType === 'percentage'
      ? `-${promo.discountValue}%`
      : `-$${promo.discountValue.toFixed(2)}`;

    const codeSpan = document.createElement('span');
    codeSpan.className = 'promo-tag-code';
    codeSpan.textContent = promo.code;

    const discountSpan = document.createElement('span');
    discountSpan.className = 'promo-tag-discount';
    discountSpan.textContent = `(${discountText})`;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'promo-tag-remove';
    removeBtn.setAttribute('aria-label', `Remove ${promo.code}`);
    removeBtn.setAttribute('title', 'Remove code');
    removeBtn.innerHTML = '&times;';
    removeBtn.addEventListener('click', () => removePromo(promo.code));

    tag.appendChild(codeSpan);
    tag.appendChild(discountSpan);
    tag.appendChild(removeBtn);
    container.appendChild(tag);
  });
}

function removePromo(codeToRemove) {
  const index = appliedPromos.findIndex(p => p.code === codeToRemove);
  if (index > -1) {
    appliedPromos.splice(index, 1);
    renderAppliedPromoTags();
    displayCartItems();

    const promoMessage = document.getElementById('promo-message');
    if (promoMessage) {
      promoMessage.className = 'promo-message';
      promoMessage.textContent = '';
    }
  }
}

function initClearCart() {
  const clearBtn = document.getElementById('clear-cart');
  if (!clearBtn) return;

  clearBtn.addEventListener('click', () => {
    clearCart();
    appliedPromos = [];
    resetPromoUI();
    displayCartItems();
  });
}

function resetPromoUI() {
  appliedPromos = [];

  const promoInput = document.getElementById('promo-code');
  const promoMessage = document.getElementById('promo-message');
  const applyBtn = document.getElementById('apply-promo');
  const tagsContainer = document.getElementById('applied-promos-container');

  if (promoInput) {
    promoInput.value = '';
    promoInput.disabled = false;
  }

  if (promoMessage) {
    promoMessage.textContent = '';
    promoMessage.className = 'promo-message';
  }

  if (applyBtn) {
    applyBtn.disabled = false;
    applyBtn.textContent = 'Apply';
  }

  if (tagsContainer) {
    tagsContainer.innerHTML = '';
    tagsContainer.style.display = 'none';
  }
}

function initCheckoutForm() {
  const form = document.getElementById('checkout-form');
  if (!form) return;

  checkoutFormValidator = createCheckoutFormValidator(form);
  form.addEventListener('submit', handleCheckoutSubmit);
}

function createCheckoutFormValidator(form) {
  const submitBtn = document.getElementById('submit-order');
  const requiredFields = Array.from(form.querySelectorAll('input[required]'));
  const touchedFields = new WeakSet();

  const validate = ({ revealErrors = false, focusInvalid = false } = {}) => {
    let allValid = true;
    let firstInvalidField = null;
    const fieldStatuses = [];

    requiredFields.forEach((field) => {
      if (revealErrors) {
        touchedFields.add(field);
      }

      const trimmedValue = field.value.trim();
      const hasValue = trimmedValue.length > 0;
      const fieldValid = hasValue && field.checkValidity();
      const shouldShowError = revealErrors || touchedFields.has(field);

      // Log field validation status for debugging
      fieldStatuses.push({
        name: field.name || field.id,
        valid: fieldValid,
        hasValue: hasValue,
        value: trimmedValue
      });

      if (shouldShowError) {
        field.classList.toggle('is-invalid', !fieldValid);
      } else if (fieldValid) {
        field.classList.remove('is-invalid');
      }

      if (!fieldValid && !firstInvalidField) {
        firstInvalidField = field;
      }

      allValid = allValid && fieldValid;
    });

    // Always update button state based on validation
    if (submitBtn) {
      submitBtn.disabled = !allValid;

      // Add visual indicator to button
      if (allValid) {
        submitBtn.classList.remove('btn-disabled');
        submitBtn.setAttribute('aria-disabled', 'false');
      } else {
        submitBtn.classList.add('btn-disabled');
        submitBtn.setAttribute('aria-disabled', 'true');
      }
    }

    if (!allValid && focusInvalid && firstInvalidField) {
      firstInvalidField.focus();
      firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return allValid;
  };

  requiredFields.forEach((field) => {
    // Validate on input (real-time)
    field.addEventListener('input', () => {
      validate();
    });

    // Show errors on blur
    field.addEventListener('blur', () => {
      touchedFields.add(field);
      validate({ revealErrors: true });
    });

    // Prevent form submission on Enter key if invalid
    field.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const isValid = validate({ revealErrors: true });
        if (!isValid) {
          e.preventDefault();
        }
      }
    });
  });

  // Initial validation to set button state
  validate();

  return {
    validate,
    reset() {
      requiredFields.forEach((field) => {
        touchedFields.delete(field);
        field.classList.remove('is-invalid');
      });
      validate();
    },
    getFieldStatuses() {
      return requiredFields.map(field => ({
        name: field.name || field.id,
        value: field.value.trim(),
        valid: field.value.trim().length > 0 && field.checkValidity()
      }));
    }
  };
}

async function handleCheckoutSubmit(event) {
  event.preventDefault();

  // Double-check form validation
  if (checkoutFormValidator && !checkoutFormValidator.validate({ revealErrors: true, focusInvalid: true })) {
    console.warn('Order submission blocked: Form validation failed');
    return;
  }

  // Additional safety check: Verify all required fields have values
  const form = event.target;
  const requiredFields = form.querySelectorAll('input[required]');
  let allFieldsFilled = true;
  const missingFields = [];

  requiredFields.forEach(field => {
    const value = field.value.trim();
    if (!value || !field.checkValidity()) {
      allFieldsFilled = false;
      missingFields.push(field.name || field.id);
      field.classList.add('is-invalid');
    }
  });

  if (!allFieldsFilled) {
    console.error('Order submission blocked: Missing required fields:', missingFields);
    alert('Please fill in all required fields before submitting your order.');
    return;
  }

  const cart = getCart();
  if (!cart.length) {
    alert('Your cart is empty. Please add items before checking out.');
    return;
  }

  // Check if BAC water is in cart (only if we found a BAC water product and user hasn't declined)
  if (bacWaterProduct && !bacWaterDeclined) {
    const hasBacWater = cart.some(item => item.id === bacWaterProduct.id);
    if (!hasBacWater) {
      // Show BAC water reminder modal instead of proceeding
      showBacWaterReminderModal(event);
      return;
    }
  }

  const submitBtn = document.getElementById('submit-order');
  const responseDiv = document.getElementById('checkout-response');

  if (responseDiv) {
    responseDiv.style.display = 'none';
    responseDiv.textContent = '';
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';
  }

  const customer = {
    name: form.querySelector('#shipping-name')?.value.trim(),
    email: form.querySelector('#shipping-email')?.value.trim(),
    address: form.querySelector('#shipping-address')?.value.trim(),
    city: form.querySelector('#shipping-city')?.value.trim(),
    state: form.querySelector('#shipping-state')?.value.trim(),
    zip: form.querySelector('#shipping-zip')?.value.trim()
  };

  const payload = {
    items: cart.map((item) => ({
      productId: item.id,
      quantity: item.quantity
    })),
    customer
  };

  if (appliedPromos.length > 0) {
    payload.promoCodes = appliedPromos.map(p => p.code);
  }

  let emailError = null;
  try {
    const order = await createOrder(payload);

    try {
      await sendOrderEmails(order);
    } catch (emailErr) {
      emailError = emailErr;
      console.error('[checkout] Failed to dispatch order emails', emailErr);
    }

    clearCart();
    appliedPromos = [];
    bacWaterDeclined = false; // Reset the declined flag after successful checkout
    resetPromoUI();
    displayCartItems();
    form.reset();
    checkoutFormValidator?.reset();

    showOrderConfirmation(order, { emailError });

    if (emailError && responseDiv) {
      responseDiv.className = 'form-response error';
      responseDiv.textContent =
        'Your order was placed, but we could not send confirmation emails. Please contact support if you do not receive details shortly.';
      responseDiv.style.display = 'block';
    }
  } catch (error) {
    console.error('Checkout error:', error);
    if (responseDiv) {
      responseDiv.className = 'form-response error';
      responseDiv.textContent = error.message || 'We could not process your order. Please try again.';
      responseDiv.style.display = 'block';
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Place Order';
    }
  }
}

function showOrderConfirmation(order, { emailError } = {}) {
  const modalContent = document.getElementById('orderConfirmationContent');
  if (!modalContent || !order) return;

  const safeOrderNumber = escapeHtml(order.orderNumber || '');
  const safeCustomerName = escapeHtml(order.customer?.name || '');
  const safeCustomerEmail = escapeHtml(order.customer?.email || '');
  const promoCodes = order.promoCodes || (order.promoCode ? [order.promoCode] : []);
  const promoLabel = promoCodes.length > 0
    ? `Discount (${promoCodes.map(c => escapeHtml(c)).join(', ')})`
    : 'Discount';

  const addressLines = [
    order.customer?.address,
    [order.customer?.city, order.customer?.state, order.customer?.zip].filter(Boolean).join(', ')
  ]
    .filter(Boolean)
    .map((line) => escapeHtml(line));
  const formattedAddress = addressLines.join('<br>');

  const itemsHtml = (order.items || [])
    .map((item) => {
      const name = escapeHtml(item?.name || 'Product');
      const quantity = Number(item?.quantity || 0);
      const lineTotal = Number(item?.lineTotal || 0).toFixed(2);
      return `
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
          <span>${name} x ${quantity}</span>
          <span>$${lineTotal}</span>
        </div>
      `;
    })
    .join('');

  const subtotal = Number(order.totals?.subtotal || 0).toFixed(2);
  const discountValue = Number(order.totals?.discount || 0);
  const shipping = Number(order.totals?.shipping || 0).toFixed(2);
  const total = Number(order.totals?.total || 0).toFixed(2);
  const safeVenmoUrl = escapeHtml(order.venmoUrl || '#');

  modalContent.innerHTML = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; background: linear-gradient(135deg, #8A7D6E 0%, #6B5F52 100%); color: #F5F1E9; padding: 12px 24px; border-radius: 50px; margin-bottom: 16px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);">
        <span style="font-size: 0.85rem; font-weight: 500; letter-spacing: 0.5px;">ORDER NUMBER</span>
        <div style="font-size: 1.3rem; font-weight: 700; margin-top: 4px;">${safeOrderNumber}</div>
      </div>
    </div>

    <div style="background: #ffffff; padding: 24px; border-radius: 12px; margin-bottom: 24px; border: 2px solid #D9CDBF; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);">
      <h6 style="font-weight: 600; margin-bottom: 16px; color: #333333; font-size: 1.1rem;">Order Summary</h6>

      <div style="margin-bottom: 16px;">
        ${itemsHtml}
      </div>

      <div style="margin-top: 16px; padding-top: 16px; border-top: 2px solid #D9CDBF;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #444040;">
          <span>Subtotal:</span>
          <span style="font-weight: 500;">$${subtotal}</span>
        </div>
        ${discountValue > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #8A7D6E; font-weight: 600;">
            <span>${promoLabel}:</span>
            <span>-$${discountValue.toFixed(2)}</span>
          </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #444040;">
          <span>Shipping:</span>
          <span style="font-weight: 500;">$${shipping}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 1.35rem; font-weight: 700; color: #333333; padding-top: 12px; margin-top: 8px; border-top: 2px solid #333333;">
          <span>Total:</span>
          <span>$${total}</span>
        </div>
      </div>

      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #D9CDBF;">
        <p style="margin-bottom: 8px; font-weight: 600; color: #333333;">Shipping Address:</p>
        <p style="margin: 0; color: #444040; line-height: 1.6;">
          ${safeCustomerName || 'Customer'}<br>
          ${formattedAddress}
        </p>
      </div>
    </div>

    <div style="text-align: center; margin-bottom: 24px;">
      <p style="margin-bottom: 16px; font-size: 1.1rem; font-weight: 500; color: #333333;">Complete Payment with Venmo</p>
      <a href="${safeVenmoUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: linear-gradient(135deg, #8A7D6E 0%, #6B5F52 100%); color: #F5F1E9; padding: 16px 48px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 1.15rem; box-shadow: 0 8px 16px rgba(138, 125, 110, 0.3); transition: all 0.3s; border: none;">
        Pay $${total} Now
      </a>
    </div>

    ${
      emailError
        ? `
    <div style="background: #FFF7ED; padding: 20px; border-radius: 12px; border-left: 4px solid #DC6E3F; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);">
      <h6 style="margin: 0 0 8px 0; font-weight: 600; color: #8A4A2C;">We couldn’t send your confirmation email</h6>
      <p style="margin: 0; color: #5C4638; font-size: 0.9rem;">Your order was received successfully. If you don’t see an email soon, please reach out through our contact page and we’ll help right away.</p>
    </div>
    `
        : `
    <div style="background: linear-gradient(135deg, #F5F1E9 0%, #ffffff 100%); padding: 20px; border-radius: 12px; border-left: 4px solid #8A7D6E; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);">
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="background: #8A7D6E; color: #F5F1E9; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.2rem;">@</div>
        <div style="flex: 1;">
          <p style="color: #333333; font-weight: 600; margin: 0; font-size: 0.95rem;">Confirmation emails are on the way to ${safeCustomerEmail}</p>
          <p style="color: #444040; font-size: 0.85rem; margin: 4px 0 0 0;">Check your spam folder if you do not see them soon.</p>
        </div>
      </div>
    </div>
    `
    }
  `;

  const modal = new bootstrap.Modal(document.getElementById('orderConfirmationModal'));
  modal.show();
}

// BAC Water Reminder Modal Functions
let pendingCheckoutEvent = null;
let bacWaterDeclined = false; // Track if user declined BAC water this session

function showBacWaterReminderModal(checkoutEvent) {
  pendingCheckoutEvent = checkoutEvent;

  // Update modal content with dynamic product data
  updateBacWaterModalContent();

  const modal = new bootstrap.Modal(document.getElementById('bacWaterReminderModal'));

  // Initialize quantity selector
  initBacWaterQuantitySelector();

  // Setup modal button handlers
  setupBacWaterModalHandlers(modal);

  modal.show();
}

function updateBacWaterModalContent() {
  if (!bacWaterProduct) return;

  // Update product name
  const productNameEl = document.querySelector('#bacWaterReminderModal h5');
  if (productNameEl) {
    productNameEl.textContent = bacWaterProduct.name;
  }

  // Update product description
  const productDiv = document.querySelector('#bacWaterReminderModal .bac-water-product');
  if (productDiv) {
    const descParagraphs = productDiv.querySelectorAll('p');
    if (descParagraphs[0]) {
      descParagraphs[0].textContent = bacWaterProduct.description || 'Bacteriostatic water for reconstitution';
    }
    if (descParagraphs[1]) {
      descParagraphs[1].textContent = `$${bacWaterProduct.price.toFixed(2)}`;
    }
  }

  // Update product image if available
  const productImgEl = document.querySelector('#bacWaterReminderModal .bac-water-product img');
  if (productImgEl && bacWaterProduct.image) {
    productImgEl.src = bacWaterProduct.image;
    productImgEl.alt = bacWaterProduct.name;
  }
}

function initBacWaterQuantitySelector() {
  const quantityInput = document.getElementById('bacWaterQuantity');
  const decrementBtn = document.getElementById('bacWaterDecrement');
  const incrementBtn = document.getElementById('bacWaterIncrement');

  if (!quantityInput || !decrementBtn || !incrementBtn) return;

  // Reset to 1
  quantityInput.value = 1;

  // Remove old listeners if any
  const newDecrementBtn = decrementBtn.cloneNode(true);
  const newIncrementBtn = incrementBtn.cloneNode(true);
  decrementBtn.parentNode.replaceChild(newDecrementBtn, decrementBtn);
  incrementBtn.parentNode.replaceChild(newIncrementBtn, incrementBtn);

  // Add new listeners
  newDecrementBtn.addEventListener('click', () => {
    const currentValue = parseInt(quantityInput.value) || 1;
    if (currentValue > 1) {
      quantityInput.value = currentValue - 1;
    }
  });

  newIncrementBtn.addEventListener('click', () => {
    const currentValue = parseInt(quantityInput.value) || 1;
    if (currentValue < 99) {
      quantityInput.value = currentValue + 1;
    }
  });

  // Handle direct input
  quantityInput.addEventListener('input', () => {
    let value = parseInt(quantityInput.value) || 1;
    if (value < 1) value = 1;
    if (value > 99) value = 99;
    quantityInput.value = value;
  });
}

function setupBacWaterModalHandlers(modal) {
  const addBtn = document.getElementById('bacWaterAdd');
  const skipBtn = document.getElementById('bacWaterSkip');

  if (!addBtn || !skipBtn) return;

  // Remove old listeners
  const newAddBtn = addBtn.cloneNode(true);
  const newSkipBtn = skipBtn.cloneNode(true);
  addBtn.parentNode.replaceChild(newAddBtn, addBtn);
  skipBtn.parentNode.replaceChild(newSkipBtn, skipBtn);

  // Add BAC water to cart and continue
  newAddBtn.addEventListener('click', () => {
    if (!bacWaterProduct) {
      console.error('BAC water product data not available');
      return;
    }

    const quantityInput = document.getElementById('bacWaterQuantity');
    const quantity = parseInt(quantityInput.value) || 1;

    // Add BAC water to cart using dynamic product data
    addToCart(
      bacWaterProduct.id,
      bacWaterProduct.name,
      bacWaterProduct.price,
      quantity
    );

    // Reset the declined flag since they're adding it
    bacWaterDeclined = false;

    // Update cart display
    displayCartItems();

    // Hide modal
    modal.hide();

    // Clear pending event - let user review cart and manually submit
    pendingCheckoutEvent = null;

    // Show a subtle notification that the item was added
    const submitBtn = document.getElementById('submit-order');
    if (submitBtn) {
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'BAC Water Added - Review & Place Order';
      submitBtn.classList.add('btn-success');

      // Reset button text after 3 seconds
      setTimeout(() => {
        submitBtn.textContent = originalText;
        submitBtn.classList.remove('btn-success');
      }, 3000);
    }
  });

  // Skip and continue without BAC water
  newSkipBtn.addEventListener('click', () => {
    // Set flag to remember they declined
    bacWaterDeclined = true;

    // Store the event before clearing
    const eventToProcess = pendingCheckoutEvent;

    modal.hide();

    // Show notification that checkout is proceeding
    const submitBtn = document.getElementById('submit-order');
    if (submitBtn) {
      submitBtn.textContent = 'Processing without BAC Water...';
      submitBtn.disabled = true;
    }

    // Auto-submit the form after modal closes
    if (eventToProcess) {
      setTimeout(() => {
        handleCheckoutSubmit(eventToProcess);
      }, 100);
    }

    // Clear pending event after using it
    pendingCheckoutEvent = null;
  });
}
