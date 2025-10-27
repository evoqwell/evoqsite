import { fetchPromoCode, createOrder, fetchProducts } from './lib/api.js';
import { getCart, clearCart, updateQuantity, removeFromCart } from './lib/cart.js';

let appliedPromo = null;
let shippingRate = 10;

document.addEventListener('DOMContentLoaded', async () => {
  await hydrateCheckoutSettings();
  displayCartItems();
  initCheckoutForm();
  initPromoCode();
  initClearCart();
});

async function hydrateCheckoutSettings() {
  try {
    const { meta } = await fetchProducts();
    if (meta && typeof meta.shippingFlatRate === 'number') {
      shippingRate = meta.shippingFlatRate;
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

  cartContainer.innerHTML = cart
    .map(
      (item) => `
      <div class="cart-item" data-id="${item.id}">
        <div class="cart-item-info">
          <h4>${item.name}</h4>
          <p class="cart-item-price">$${Number(item.price).toFixed(2)}</p>
        </div>
        <div class="cart-item-controls">
          <button class="btn-quantity" data-id="${item.id}" data-action="decrease">-</button>
          <span class="item-quantity">${item.quantity}</span>
          <button class="btn-quantity" data-id="${item.id}" data-action="increase">+</button>
          <button class="btn-remove" data-id="${item.id}">Remove</button>
        </div>
        <div class="cart-item-total">
          $${(Number(item.price) * item.quantity).toFixed(2)}
        </div>
      </div>
    `
    )
    .join('');

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
  const discount = appliedPromo ? calculateDiscount(subtotal, appliedPromo) : 0;
  const shipping = subtotal > 0 ? shippingRate : 0;
  const total = subtotal - discount + shipping;
  return { subtotal, discount, shipping, total };
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

function updateOrderSummary({ subtotal, discount, shipping, total }) {
  const subtotalEl = document.getElementById('cart-subtotal');
  const discountEl = document.getElementById('promo-discount');
  const discountRow = document.getElementById('promo-discount-row');
  const shippingEl = document.getElementById('cart-shipping');
  const shippingRow = document.getElementById('shipping-row');
  const totalEl = document.getElementById('cart-total');

  if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
  if (shippingEl) shippingEl.textContent = `$${shipping.toFixed(2)}`;
  if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;

  if (shippingRow) {
    shippingRow.style.display = subtotal > 0 ? 'flex' : 'none';
  }

  if (discount > 0 && discountEl && discountRow) {
    discountEl.textContent = `-$${discount.toFixed(2)}`;
    discountRow.style.display = 'flex';
  } else if (discountRow) {
    discountRow.style.display = 'none';
  }
}

function initPromoCode() {
  const applyBtn = document.getElementById('apply-promo');
  if (!applyBtn) return;

  applyBtn.addEventListener('click', async () => {
    const promoInput = document.getElementById('promo-code');
    const promoMessage = document.getElementById('promo-message');

    if (!promoInput || !promoMessage) return;

    const code = promoInput.value.trim();
    if (!code) {
      promoMessage.className = 'promo-message error';
      promoMessage.textContent = 'Please enter a promo code.';
      return;
    }

    applyBtn.disabled = true;
    applyBtn.textContent = 'Checking...';

    try {
      const promo = await fetchPromoCode(code);
      appliedPromo = promo;
      promoMessage.className = 'promo-message success';
      promoMessage.textContent = promo.description || 'Promo code applied.';
      promoInput.disabled = true;
      applyBtn.textContent = 'Applied';
      displayCartItems();
    } catch (error) {
      console.error('Promo validation failed', error);
      appliedPromo = null;
      promoMessage.className = 'promo-message error';
      promoMessage.textContent = error.message || 'Promo code is not valid.';
      applyBtn.disabled = false;
      applyBtn.textContent = 'Apply';
    }
  });
}

function initClearCart() {
  const clearBtn = document.getElementById('clear-cart');
  if (!clearBtn) return;

  clearBtn.addEventListener('click', () => {
    clearCart();
    appliedPromo = null;
    resetPromoUI();
    displayCartItems();
  });
}

function resetPromoUI() {
  const promoInput = document.getElementById('promo-code');
  const promoMessage = document.getElementById('promo-message');
  const applyBtn = document.getElementById('apply-promo');

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
}

function initCheckoutForm() {
  const form = document.getElementById('checkout-form');
  if (!form) return;

  form.addEventListener('submit', handleCheckoutSubmit);
}

async function handleCheckoutSubmit(event) {
  event.preventDefault();

  const cart = getCart();
  if (!cart.length) {
    alert('Your cart is empty. Please add items before checking out.');
    return;
  }

  const form = event.target;
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

  if (appliedPromo) {
    payload.promoCode = appliedPromo.code;
  }

  try {
    const order = await createOrder(payload);

    clearCart();
    appliedPromo = null;
    resetPromoUI();
    displayCartItems();
    form.reset();

    showOrderConfirmation(order);
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

function showOrderConfirmation(order) {
  const modalContent = document.getElementById('orderConfirmationContent');
  if (!modalContent) return;

  const itemsHtml = order.items
    .map(
      (item) => `
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
          <span>${item.name} x ${item.quantity}</span>
          <span>$${Number(item.lineTotal).toFixed(2)}</span>
        </div>
      `
    )
    .join('');

  modalContent.innerHTML = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; background: linear-gradient(135deg, #8A7D6E 0%, #6B5F52 100%); color: #F5F1E9; padding: 12px 24px; border-radius: 50px; margin-bottom: 16px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);">
        <span style="font-size: 0.85rem; font-weight: 500; letter-spacing: 0.5px;">ORDER NUMBER</span>
        <div style="font-size: 1.3rem; font-weight: 700; margin-top: 4px;">${order.orderNumber}</div>
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
          <span style="font-weight: 500;">$${Number(order.totals.subtotal).toFixed(2)}</span>
        </div>
        ${Number(order.totals.discount) > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #8A7D6E; font-weight: 600;">
            <span>Discount ${order.promoCode ? '(' + order.promoCode + ')' : ''}:</span>
            <span>-$${Number(order.totals.discount).toFixed(2)}</span>
          </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #444040;">
          <span>Shipping:</span>
          <span style="font-weight: 500;">$${Number(order.totals.shipping).toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 1.35rem; font-weight: 700; color: #333333; padding-top: 12px; margin-top: 8px; border-top: 2px solid #333333;">
          <span>Total:</span>
          <span>$${Number(order.totals.total).toFixed(2)}</span>
        </div>
      </div>

      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #D9CDBF;">
        <p style="margin-bottom: 8px; font-weight: 600; color: #333333;">Shipping Address:</p>
        <p style="margin: 0; color: #444040; line-height: 1.6;">
          ${order.customer.name}<br>
          ${order.customer.address}<br>
          ${order.customer.city}, ${order.customer.state} ${order.customer.zip}
        </p>
      </div>
    </div>

    <div style="text-align: center; margin-bottom: 24px;">
      <p style="margin-bottom: 16px; font-size: 1.1rem; font-weight: 500; color: #333333;">Complete Payment with Venmo</p>
      <a href="${order.venmoUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: linear-gradient(135deg, #8A7D6E 0%, #6B5F52 100%); color: #F5F1E9; padding: 16px 48px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 1.15rem; box-shadow: 0 8px 16px rgba(138, 125, 110, 0.3); transition: all 0.3s; border: none;">
        Pay $${Number(order.totals.total).toFixed(2)} Now
      </a>
    </div>

    <div style="background: linear-gradient(135deg, #F5F1E9 0%, #ffffff 100%); padding: 20px; border-radius: 12px; border-left: 4px solid #8A7D6E; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);">
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="background: #8A7D6E; color: #F5F1E9; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.2rem;">@</div>
        <div style="flex: 1;">
          <p style="color: #333333; font-weight: 600; margin: 0; font-size: 0.95rem;">Confirmation emails are on the way to ${order.customer.email}</p>
          <p style="color: #444040; font-size: 0.85rem; margin: 4px 0 0 0;">Check your spam folder if you do not see them soon.</p>
        </div>
      </div>
    </div>
  `;

  const modal = new bootstrap.Modal(document.getElementById('orderConfirmationModal'));
  modal.show();
}
