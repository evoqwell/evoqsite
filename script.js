/**
 * Handles cart functionality, form validation, animations, and shared UI helpers
 */

console.log('EVOQ script.js loaded');

// ============================================
// CART MANAGEMENT
// ============================================


// Initialize cart from localStorage or create empty cart
// Compatible with old keys and migrates to 'evoq_cart'
function getCart() {
  let cart = localStorage.getItem('evoq_cart');
  if (!cart) {
    // Check old keys and migrate
    cart = localStorage.getItem('evoqCart') || localStorage.getItem('evoq-cart');
    if (cart) {
      localStorage.setItem('evoq_cart', cart);
      localStorage.removeItem('evoqCart');
      localStorage.removeItem('evoq-cart');
    }
  }
  return cart ? JSON.parse(cart) : [];
}

// Save cart to localStorage
function saveCart(cart) {
  localStorage.setItem('evoq_cart', JSON.stringify(cart));
  updateCartCount();
}

// Update cart count in header
function updateCartCount() {
  const cart = getCart();
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  const cartCountElements = document.querySelectorAll('#cart-count');
  cartCountElements.forEach(element => {
    element.textContent = cartCount;
  });

  const mobileCartCountElements = document.querySelectorAll('#mobile-cart-count');
  mobileCartCountElements.forEach(element => {
    element.textContent = cartCount;
    element.style.display = cartCount > 0 ? 'block' : 'none';
  });
}

// Add item to cart
function addToCart(productId, productName, productPrice) {
  const cart = getCart();
  const existingItem = cart.find(item => item.id === productId);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      id: productId,
      name: productName,
      price: parseFloat(productPrice),
      quantity: 1
    });
  }

  saveCart(cart);
  showNotification(`${productName} added to cart!`);
}

// Remove item from cart
function removeFromCart(productId) {
  let cart = getCart();
  cart = cart.filter(item => item.id !== productId);
  saveCart(cart);

  // Reload cart display if on checkout page
  if (document.getElementById('cart-items-container')) {
    displayCartItems();
  }
}

// Update item quantity in cart
function updateQuantity(productId, change) {
  const cart = getCart();
  const item = cart.find(item => item.id === productId);

  if (item) {
    item.quantity += change;
    if (item.quantity <= 0) {
      removeFromCart(productId);
    } else {
      saveCart(cart);
      displayCartItems();
    }
  }
}

// Clear entire cart
function clearCart() {
  localStorage.removeItem('evoqCart');
  localStorage.removeItem('evoq-cart');
  appliedPromoCode = null;
  updateCartCount();
  if (document.getElementById('cart-items-container')) {
    displayCartItems();
  }
  // Clear promo code input and message
  const promoInput = document.getElementById('promo-code');
  const promoMessage = document.getElementById('promo-message');
  if (promoInput) promoInput.value = '';
  if (promoMessage) {
    promoMessage.textContent = '';
    promoMessage.className = 'promo-message';
  }
  showNotification('Cart cleared successfully');
}

// Global variable to store applied promo code
let appliedPromoCode = null;

// Display cart items on checkout page
function displayCartItems() {
  const cartContainer = document.getElementById('cart-items-container');
  const subtotalElement = document.getElementById('cart-subtotal');
  const shippingElement = document.getElementById('cart-shipping');
  const totalElement = document.getElementById('cart-total');
  const promoDiscountRow = document.getElementById('promo-discount-row');
  const promoDiscountElement = document.getElementById('promo-discount');
  const shippingRow = document.getElementById('shipping-row');

  if (!cartContainer) return;

  const cart = getCart();

  if (cart.length === 0) {
    cartContainer.innerHTML = `
      <div class="empty-cart-message">
        <h3>Your cart is empty</h3>
        <p>Add some research peptides to get started!</p>
        <a href="shop.html" class="btn-primary" style="margin-top: 1rem;">Browse Products</a>
      </div>
    `;
    subtotalElement.textContent = '$0.00';
    shippingElement.textContent = '$0.00';
    totalElement.textContent = '$0.00';
    if (shippingRow) shippingRow.style.display = 'none';
    if (promoDiscountRow) promoDiscountRow.style.display = 'none';
    return;
  }

  let subtotal = 0;
  let cartHTML = '';

  cart.forEach(item => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;

    cartHTML += `
      <div class="cart-item">
        <div class="cart-item-info">
          <h4>${item.name}</h4>
          <p>Quantity: ${item.quantity} Ã— $${item.price.toFixed(2)}</p>
        </div>
        <div style="display: flex; align-items: center; gap: 1rem;">
          <span class="cart-item-price">$${itemTotal.toFixed(2)}</span>
          <button class="remove-item" onclick="removeFromCart('${item.id}')" aria-label="Remove ${item.name} from cart">Ã—</button>
        </div>
      </div>
    `;
  });

  cartContainer.innerHTML = cartHTML;

  // Only add shipping if cart has items
  const shipping = cart.length > 0 ? 10.00 : 0.00;
  let discount = 0;

  if (appliedPromoCode) {
    if (appliedPromoCode.discount_type === 'percentage') {
      discount = subtotal * (appliedPromoCode.discount_value / 100);
    } else if (appliedPromoCode.discount_type === 'fixed') {
      discount = Math.min(appliedPromoCode.discount_value, subtotal);
    }
  }

  const total = subtotal - discount + shipping;

  subtotalElement.textContent = `$${subtotal.toFixed(2)}`;

  // Show shipping row only when cart has items
  if (shippingRow) {
    shippingRow.style.display = 'flex';
  }
  shippingElement.textContent = `$${shipping.toFixed(2)}`;
  totalElement.textContent = `$${total.toFixed(2)}`;

  if (discount > 0 && promoDiscountRow && promoDiscountElement) {
    promoDiscountRow.style.display = 'flex';
    promoDiscountElement.textContent = `-$${discount.toFixed(2)}`;
    document.getElementById('applied-promo-code').textContent = appliedPromoCode.code;
  } else if (promoDiscountRow) {
    promoDiscountRow.style.display = 'none';
  }
}

// Show notification banner
function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    background-color: #8A7D6E;
    color: #F5F1E9;
    padding: 1rem 2rem;
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    z-index: 10000;
    animation: slideIn 0.3s ease;
    font-family: Arial, sans-serif;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// ============================================
// FORM VALIDATION
// ============================================

// Validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Show form error
function showError(input, message) {
  input.classList.add('is-invalid');
  const feedback = input.nextElementSibling;
  if (feedback && feedback.classList.contains('invalid-feedback')) {
    feedback.textContent = message;
  }
}

// Clear form error
function clearError(input) {
  input.classList.remove('is-invalid');
}

// Validate contact form
function validateContactForm(form) {
  let isValid = true;

  const name = form.querySelector('#contact-name');
  const email = form.querySelector('#contact-email');
  const message = form.querySelector('#contact-message');

  // Clear previous errors
  [name, email, message].forEach(input => clearError(input));

  // Validate name
  if (!name.value.trim()) {
    showError(name, 'Please enter your name');
    isValid = false;
  }

  // Validate email
  if (!email.value.trim()) {
    showError(email, 'Please enter your email address');
    isValid = false;
  } else if (!isValidEmail(email.value)) {
    showError(email, 'Please enter a valid email address');
    isValid = false;
  }

  // Validate message
  if (!message.value.trim()) {
    showError(message, 'Please enter your message');
    isValid = false;
  }

  return isValid;
}

// Validate checkout form
function validateCheckoutForm(form) {
  let isValid = true;

  const name = form.querySelector('#shipping-name');
  const email = form.querySelector('#shipping-email');
  const address = form.querySelector('#shipping-address');
  const city = form.querySelector('#shipping-city');
  const state = form.querySelector('#shipping-state');
  const zip = form.querySelector('#shipping-zip');

  // Clear previous errors
  [name, email, address, city, state, zip].forEach(input => clearError(input));

  // Validate name
  if (!name.value.trim()) {
    showError(name, 'Please enter your full name');
    isValid = false;
  }

  // Validate email
  if (!email.value.trim()) {
    showError(email, 'Please enter your email address');
    isValid = false;
  } else if (!isValidEmail(email.value)) {
    showError(email, 'Please enter a valid email address');
    isValid = false;
  }

  // Validate address
  if (!address.value.trim()) {
    showError(address, 'Please enter your street address');
    isValid = false;
  }

  // Validate city
  if (!city.value.trim()) {
    showError(city, 'Please enter your city');
    isValid = false;
  }

  // Validate state
  if (!state.value.trim()) {
    showError(state, 'Please enter your state');
    isValid = false;
  }

  // Validate ZIP code
  const zipRegex = /^\d{5}$/;
  if (!zip.value.trim()) {
    showError(zip, 'Please enter your ZIP code');
    isValid = false;
  } else if (!zipRegex.test(zip.value)) {
    showError(zip, 'Please enter a valid 5-digit ZIP code');
    isValid = false;
  }

  return isValid;
}

// ============================================
// CONTACT FORM HANDLER
// ============================================

function handleContactForm(e) {
  e.preventDefault();

  const form = e.target;
  const responseDiv = document.getElementById('form-response');

  if (!validateContactForm(form)) {
    return;
  }

  const name = form.querySelector('#contact-name').value;
  const email = form.querySelector('#contact-email').value;
  const message = form.querySelector('#contact-message').value;

  // Show success message
  responseDiv.className = 'form-response success';
  responseDiv.textContent = `Thank you, ${name}! We've received your message and will get back to you at ${email} shortly. We appreciate you reaching out.`;
  responseDiv.style.display = 'block';

  // Clear form
  form.reset();

  // Scroll to response
  responseDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ============================================
// SCROLL ANIMATIONS
// ============================================

function handleScrollAnimations() {
  // Fade-in animations are handled by CSS
  // This function is kept for future enhancements
}

// ============================================
// AGE VERIFICATION
// ============================================
// Age verification is now handled by lib/age-gate.js
// This section kept for reference only

// ============================================
// PROMO CODE HANDLING
// ============================================

async function handleApplyPromo() {
  // Note: Promo code validation now handled by checkout.js with static codes
  // This function should not be called on non-checkout pages
  const promoMessage = document.getElementById('promo-message');
  const applyButton = document.getElementById('apply-promo');

  if (promoMessage) {
    promoMessage.className = 'promo-message error';
    promoMessage.textContent = 'Please apply promo codes on the checkout page';
  }

  if (applyButton) {
    applyButton.textContent = 'Apply';
    applyButton.disabled = false;
  }
}

// ============================================
// MOBILE MENU TOGGLE - REVAMPED
// ============================================

function initMobileMenu() {
  const menuToggle = document.getElementById('mobile-menu-toggle');
  const navLinks = document.getElementById('nav-links');

  if (!menuToggle || !navLinks) {
    console.warn('Mobile menu elements not found');
    return;
  }

  console.log('Mobile menu initialized');

  // Toggle menu function
  function toggleMenu(e) {
    e.preventDefault();
    e.stopPropagation();

    const isActive = navLinks.classList.contains('active');

    if (isActive) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  function openMenu() {
    menuToggle.classList.add('active');
    navLinks.classList.add('active');
    document.body.classList.add('menu-open');
    console.log('Menu opened');
  }

  function closeMenu() {
    menuToggle.classList.remove('active');
    navLinks.classList.remove('active');
    document.body.classList.remove('menu-open');
    console.log('Menu closed');
  }

  // Hamburger toggle - works on both click and touch
  menuToggle.addEventListener('click', (e) => {
    console.log('Hamburger click fired');
    toggleMenu(e);
  });
  menuToggle.addEventListener('touchend', (e) => {
    console.log('Hamburger touchend fired');
    e.preventDefault();
    toggleMenu(e);
  }, { passive: false });

  // Navigation links - close menu on click and allow navigation
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', (e) => {
      // Allow the link to navigate
      console.log('Link clicked:', link.href);
      closeMenu();
    });
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (navLinks.classList.contains('active')) {
      if (!navLinks.contains(e.target) && !menuToggle.contains(e.target)) {
        closeMenu();
      }
    }
  });

  // Prevent body scroll when menu is open
  const style = document.createElement('style');
  style.textContent = `
    body.menu-open {
      overflow: hidden;
      position: fixed;
      width: 100%;
    }
  `;
  document.head.appendChild(style);
}

// ============================================
// INITIALIZATION
// ============================================

export function initializeApp() {
  console.log('DOMContentLoaded fired');

  // Initialize mobile menu
  initMobileMenu();

  // Update cart count on page load
  updateCartCount();

  // Handle scroll animations
  handleScrollAnimations();

  // Add to cart buttons on shop page
  const addToCartButtons = document.querySelectorAll('.btn-add-cart');
  addToCartButtons.forEach(button => {
    function handleAddToCart(e) {
      e.preventDefault();
      e.stopPropagation();
      const productId = this.dataset.productId;
      const productName = this.dataset.productName;
      const productPrice = this.dataset.productPrice;
      addToCart(productId, productName, productPrice);
    }
    button.addEventListener('click', handleAddToCart);
    button.addEventListener('touchend', handleAddToCart, { passive: false });
  });

  // Contact form submission
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', handleContactForm);
  }

  // Note: Checkout form, cart display, promo codes, and clear cart
  // are all now handled by checkout.js on checkout page
  // script.js does not load on checkout.html so these handlers won't run there

  // Real-time form validation
  const formInputs = document.querySelectorAll('.form-control');
  formInputs.forEach(input => {
    input.addEventListener('blur', function() {
      if (this.hasAttribute('required') && !this.value.trim()) {
        showError(this, 'This field is required');
      } else if (this.type === 'email' && this.value && !isValidEmail(this.value)) {
        showError(this, 'Please enter a valid email address');
      } else {
        clearError(this);
      }
    });

    input.addEventListener('input', function() {
      if (this.classList.contains('is-invalid') && this.value.trim()) {
        clearError(this);
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', initializeApp);

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Format currency
function formatCurrency(amount) {
  return `$${parseFloat(amount).toFixed(2)}`;
}
