/**
 * Unified Cart Management System
 * Single source of truth for all cart operations
 */

const CART_KEY = 'evoq_cart';

/**
 * Get cart from localStorage
 * @returns {Array} Cart items
 */
export function getCart() {
  try {
    const cart = localStorage.getItem(CART_KEY);
    return cart ? JSON.parse(cart) : [];
  } catch (e) {
    console.error('Error reading cart:', e);
    return [];
  }
}

/**
 * Save cart to localStorage
 * @param {Array} cart - Cart items
 */
export function saveCart(cart) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartCount();
  } catch (e) {
    console.error('Error saving cart:', e);
  }
}

/**
 * Add item to cart
 * @param {string} id - Product ID
 * @param {string} name - Product name
 * @param {number} price - Product price
 * @param {number} quantity - Quantity to add (default: 1)
 * @returns {Object} Updated cart
 */
export function addToCart(id, name, price, quantity = 1) {
  const cart = getCart();
  const existingItem = cart.find(item => item.id === id);

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.push({
      id: id,
      name: name,
      price: parseFloat(price),
      quantity: quantity
    });
  }

  saveCart(cart);
  return cart;
}

/**
 * Remove item from cart
 * @param {string} id - Product ID
 * @returns {Object} Updated cart
 */
export function removeFromCart(id) {
  let cart = getCart();
  cart = cart.filter(item => item.id !== id);
  saveCart(cart);
  return cart;
}

/**
 * Update item quantity
 * @param {string} id - Product ID
 * @param {number} change - Quantity change (positive or negative)
 * @returns {Object} Updated cart
 */
export function updateQuantity(id, change) {
  const cart = getCart();
  const item = cart.find(item => item.id === id);

  if (item) {
    item.quantity += change;
    if (item.quantity <= 0) {
      return removeFromCart(id);
    }
    saveCart(cart);
  }

  return cart;
}

/**
 * Set item quantity directly
 * @param {string} id - Product ID
 * @param {number} quantity - New quantity
 * @returns {Object} Updated cart
 */
export function setQuantity(id, quantity) {
  const cart = getCart();
  const item = cart.find(item => item.id === id);

  if (item) {
    if (quantity <= 0) {
      return removeFromCart(id);
    }
    item.quantity = quantity;
    saveCart(cart);
  }

  return cart;
}

/**
 * Clear entire cart
 */
export function clearCart() {
  localStorage.removeItem(CART_KEY);
  updateCartCount();
}

/**
 * Get cart item count
 * @returns {number} Total items in cart
 */
export function getCartCount() {
  const cart = getCart();
  return cart.reduce((total, item) => total + item.quantity, 0);
}

/**
 * Get cart subtotal
 * @returns {number} Cart subtotal
 */
export function getCartSubtotal() {
  const cart = getCart();
  return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

/**
 * Get cart total with shipping
 * @param {number} shipping - Shipping cost (default: 10 if cart not empty)
 * @param {number} discount - Discount amount (default: 0)
 * @returns {number} Cart total
 */
export function getCartTotal(shipping = null, discount = 0) {
  const cart = getCart();
  const subtotal = getCartSubtotal();

  // Only add shipping if cart has items
  const shippingCost = (cart.length > 0 && shipping !== null) ? shipping : (cart.length > 0 ? 10 : 0);

  return subtotal - discount + shippingCost;
}

/**
 * Check if cart is empty
 * @returns {boolean}
 */
export function isCartEmpty() {
  const cart = getCart();
  return cart.length === 0;
}

/**
 * Update cart count in UI
 */
export function updateCartCount() {
  const count = getCartCount();
  const cartCountElements = document.querySelectorAll('#cart-count, .cart-count');
  cartCountElements.forEach(element => {
    element.textContent = count;
  });

  const mobileBadgeElements = document.querySelectorAll('#mobile-cart-count');
  mobileBadgeElements.forEach(element => {
    element.textContent = count;
    element.style.display = count > 0 ? 'block' : 'none';
  });
}

/**
 * Initialize cart system
 * Call this on page load to update UI
 */
export function initCart() {
  updateCartCount();
}

// Auto-initialize on module load if in browser
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCart);
  } else {
    initCart();
  }
}
