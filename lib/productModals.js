import { addToCart } from './cart.js';
import { showSuccessToast } from './toast.js';

function normalizeCategories(value) {
  if (Array.isArray(value) && value.length) {
    return value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter(Boolean);
  }
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
}

function formatPrice(price) {
  const amount = Number(price);
  return Number.isFinite(amount) ? `$${amount.toFixed(2)}` : '$0.00';
}

class ProductDetailsModal {
  constructor() {
    this.modal = null;
    this.currentProduct = null;
    this.quantity = 1;
    this.quantityInput = null;
    this.lastFocusedElement = null;
    this.init();
  }

  init() {
    this.createModal();
    this.attachEventListeners();
  }

  createModal() {
    if (this.modal) {
      return;
    }

    const modalHTML = `
      <div id="product-details-modal" class="product-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="product-modal-title">
        <div class="product-modal" role="document">
          <button class="product-modal__close" aria-label="Close product details">&times;</button>
          <div class="product-modal__content">
            <div class="product-modal__image">
              <img id="product-modal-image" src="" alt="" />
            </div>
            <div class="product-modal__info">
              <h2 id="product-modal-title" class="product-modal__title">Product Name</h2>
              <div id="product-modal-categories" class="product-modal__categories"></div>
              <div class="product-modal__price-stock">
                <span id="product-modal-price" class="product-price">$0.00</span>
                <span id="product-modal-stock" class="product-stock-status"></span>
              </div>
              <p id="product-modal-description" class="product-modal__description"></p>
              <div class="product-modal__quantity">
                <label for="product-modal-quantity-input">Quantity</label>
                <div class="quantity-selector">
                  <button type="button" class="btn-quantity" id="product-modal-decrease" aria-label="Decrease quantity">−</button>
                  <input type="number" id="product-modal-quantity-input" class="quantity-input" value="1" min="1" max="99" />
                  <button type="button" class="btn-quantity" id="product-modal-increase" aria-label="Increase quantity">+</button>
                </div>
              </div>
              <div class="product-modal__actions">
                <button id="product-modal-add-to-cart" class="btn-primary">Add to Cart</button>
                <a id="product-modal-coa-link" class="btn-secondary product-modal__coa-link" href="#" target="_blank" rel="noopener noreferrer">View Certificate of Analysis</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.modal = document.getElementById('product-details-modal');
    this.quantityInput = this.modal.querySelector('#product-modal-quantity-input');
  }

  attachEventListeners() {
    if (!this.modal) return;

    const closeBtn = this.modal.querySelector('.product-modal__close');
    closeBtn.addEventListener('click', () => this.close());

    this.modal.addEventListener('click', (event) => {
      if (event.target === this.modal) {
        this.close();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.modal.classList.contains('show')) {
        this.close();
      }
    });

    const decreaseBtn = this.modal.querySelector('#product-modal-decrease');
    const increaseBtn = this.modal.querySelector('#product-modal-increase');
    const addToCartBtn = this.modal.querySelector('#product-modal-add-to-cart');

    decreaseBtn.addEventListener('click', () => this.updateQuantity(this.quantity - 1));
    increaseBtn.addEventListener('click', () => this.updateQuantity(this.quantity + 1));

    this.quantityInput.addEventListener('change', (event) => {
      const value = parseInt(event.target.value, 10);
      if (Number.isInteger(value)) {
        this.updateQuantity(value);
      } else {
        this.updateQuantity(1);
      }
    });

    addToCartBtn.addEventListener('click', () => this.handleAddToCart());
  }

  updateQuantity(nextQuantity) {
    const stockCount = Number(this.currentProduct?.stock);
    const hasStockLimit = Number.isFinite(stockCount) && stockCount > 0;
    const maxQuantity = hasStockLimit ? stockCount : 99;

    this.quantity = Math.max(1, Math.min(nextQuantity, maxQuantity));
    if (this.quantityInput) {
      this.quantityInput.value = this.quantity;
    }
  }

  open(product) {
    if (!product) return;

    this.currentProduct = product;
    this.quantity = 1;
    this.lastFocusedElement = document.activeElement;

    const modalImage = this.modal.querySelector('#product-modal-image');
    const modalTitle = this.modal.querySelector('#product-modal-title');
    const modalPrice = this.modal.querySelector('#product-modal-price');
    const modalStock = this.modal.querySelector('#product-modal-stock');
    const modalDescription = this.modal.querySelector('#product-modal-description');
    const modalCategories = this.modal.querySelector('#product-modal-categories');
    const modalCoaLink = this.modal.querySelector('#product-modal-coa-link');
    const addToCartBtn = this.modal.querySelector('#product-modal-add-to-cart');

    modalImage.src = product.image;
    modalImage.alt = product.name;
    modalTitle.textContent = product.name;
    modalPrice.textContent = formatPrice(product.price);
    modalDescription.textContent = product.description || 'No description available.';

    const categories = normalizeCategories(product.categories?.length ? product.categories : product.category);
    modalCategories.innerHTML = '';
    if (categories.length) {
      categories.forEach((category) => {
        const chip = document.createElement('span');
        chip.className = 'product-category-chip';
        chip.textContent = category;
        modalCategories.appendChild(chip);
      });
    }

    const stockCount = Number(product.stock);
    const isOutOfStock = Number.isFinite(stockCount) && stockCount <= 0;
    modalStock.className = `product-stock-status ${isOutOfStock ? 'sold-out' : 'in-stock'}`;
    modalStock.textContent = isOutOfStock ? 'Out of Stock' : 'In Stock';

    if (product.coa) {
      modalCoaLink.style.display = '';
      modalCoaLink.href = product.coa;
    } else {
      modalCoaLink.style.display = 'none';
      modalCoaLink.removeAttribute('href');
    }

    this.updateQuantity(1);

    if (isOutOfStock) {
      addToCartBtn.disabled = true;
      addToCartBtn.textContent = 'Out of Stock';
    } else {
      addToCartBtn.disabled = false;
      addToCartBtn.textContent = 'Add to Cart';
    }

    this.modal.classList.add('show');
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
      this.modal.querySelector('.product-modal__close').focus();
    }, 100);
  }

  handleAddToCart() {
    if (!this.currentProduct || this.quantity < 1) return;

    const stockCount = Number(this.currentProduct.stock);
    const isOutOfStock = Number.isFinite(stockCount) && stockCount <= 0;
    if (isOutOfStock) {
      return;
    }

    addToCart(
      this.currentProduct.id,
      this.currentProduct.name,
      Number(this.currentProduct.price),
      this.quantity
    );
    showSuccessToast(
      `Added ${this.quantity} × ${this.currentProduct.name} to your cart.`,
      'Cart Updated'
    );
    this.close();
  }

  close() {
    if (!this.modal) return;
    this.modal.classList.remove('show');
    document.body.style.overflow = '';
    this.currentProduct = null;
    this.quantity = 1;
    if (this.quantityInput) {
      this.quantityInput.value = '1';
    }
    if (this.lastFocusedElement && typeof this.lastFocusedElement.focus === 'function') {
      this.lastFocusedElement.focus();
    }
  }
}

class AddToCartModal {
  constructor() {
    this.modal = null;
    this.currentProduct = null;
    this.quantity = 1;
    this.quantityInput = null;
    this.lastFocusedElement = null;
    this.init();
  }

  init() {
    this.createModal();
    this.attachEventListeners();
  }

  createModal() {
    if (this.modal) {
      return;
    }

    const modalHTML = `
      <div id="add-to-cart-modal" class="product-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="add-to-cart-title">
        <div class="add-to-cart-modal" role="document">
          <button class="product-modal__close" aria-label="Close add to cart">&times;</button>
          <div class="add-to-cart-modal__content">
            <h2 id="add-to-cart-title" class="add-to-cart-modal__title">Add to Cart</h2>
            <p id="add-to-cart-product-name" class="add-to-cart-modal__product">Product Name</p>
            <p id="add-to-cart-product-price" class="add-to-cart-modal__price">$0.00</p>
            <div class="add-to-cart-modal__categories" id="add-to-cart-categories"></div>
            <label for="add-to-cart-quantity-input" class="add-to-cart-modal__label">Quantity</label>
            <div class="quantity-selector">
              <button type="button" class="btn-quantity" id="add-to-cart-decrease" aria-label="Decrease quantity">−</button>
              <input type="number" id="add-to-cart-quantity-input" class="quantity-input" value="1" min="1" max="99" />
              <button type="button" class="btn-quantity" id="add-to-cart-increase" aria-label="Increase quantity">+</button>
            </div>
            <button id="add-to-cart-confirm" class="btn-primary add-to-cart-modal__submit">Add to Cart</button>
            <p id="add-to-cart-stock" class="add-to-cart-modal__stock"></p>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.modal = document.getElementById('add-to-cart-modal');
    this.quantityInput = this.modal.querySelector('#add-to-cart-quantity-input');
  }

  attachEventListeners() {
    if (!this.modal) return;

    const closeBtn = this.modal.querySelector('.product-modal__close');
    closeBtn.addEventListener('click', () => this.close());

    this.modal.addEventListener('click', (event) => {
      if (event.target === this.modal) {
        this.close();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.modal.classList.contains('show')) {
        this.close();
      }
    });

    const decreaseBtn = this.modal.querySelector('#add-to-cart-decrease');
    const increaseBtn = this.modal.querySelector('#add-to-cart-increase');
    const confirmBtn = this.modal.querySelector('#add-to-cart-confirm');

    decreaseBtn.addEventListener('click', () => this.updateQuantity(this.quantity - 1));
    increaseBtn.addEventListener('click', () => this.updateQuantity(this.quantity + 1));

    this.quantityInput.addEventListener('change', (event) => {
      const value = parseInt(event.target.value, 10);
      if (Number.isInteger(value)) {
        this.updateQuantity(value);
      } else {
        this.updateQuantity(1);
      }
    });

    confirmBtn.addEventListener('click', () => this.handleConfirm());
  }

  updateQuantity(nextQuantity) {
    const stockCount = Number(this.currentProduct?.stock);
    const hasStockLimit = Number.isFinite(stockCount) && stockCount > 0;
    const maxQuantity = hasStockLimit ? stockCount : 99;

    this.quantity = Math.max(1, Math.min(nextQuantity, maxQuantity));
    if (this.quantityInput) {
      this.quantityInput.value = this.quantity;
    }
  }

  open(product) {
    if (!product) return;

    this.currentProduct = product;
    this.quantity = 1;
    this.lastFocusedElement = document.activeElement;

    const nameEl = this.modal.querySelector('#add-to-cart-product-name');
    const priceEl = this.modal.querySelector('#add-to-cart-product-price');
    const categoriesEl = this.modal.querySelector('#add-to-cart-categories');
    const stockEl = this.modal.querySelector('#add-to-cart-stock');
    const confirmBtn = this.modal.querySelector('#add-to-cart-confirm');

    nameEl.textContent = product.name;
    priceEl.textContent = formatPrice(product.price);

    const categories = normalizeCategories(product.categories?.length ? product.categories : product.category);
    categoriesEl.innerHTML = '';
    if (categories.length) {
      categories.forEach((category) => {
        const chip = document.createElement('span');
        chip.className = 'product-category-chip';
        chip.textContent = category;
        categoriesEl.appendChild(chip);
      });
    }

    const stockCount = Number(product.stock);
    const isOutOfStock = Number.isFinite(stockCount) && stockCount <= 0;
    if (isOutOfStock) {
      confirmBtn.disabled = true;
      stockEl.textContent = 'This product is currently out of stock.';
      stockEl.className = 'add-to-cart-modal__stock sold-out';
    } else {
      confirmBtn.disabled = false;
      stockEl.textContent = '';
      stockEl.className = 'add-to-cart-modal__stock';
    }

    this.updateQuantity(1);

    this.modal.classList.add('show');
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
      this.modal.querySelector('.product-modal__close').focus();
    }, 100);
  }

  handleConfirm() {
    if (!this.currentProduct || this.quantity < 1) return;
    const stockCount = Number(this.currentProduct.stock);
    const isOutOfStock = Number.isFinite(stockCount) && stockCount <= 0;
    if (isOutOfStock) {
      return;
    }

    addToCart(
      this.currentProduct.id,
      this.currentProduct.name,
      Number(this.currentProduct.price),
      this.quantity
    );
    showSuccessToast(
      `Added ${this.quantity} × ${this.currentProduct.name} to your cart.`,
      'Cart Updated'
    );
    this.close();
  }

  close() {
    if (!this.modal) return;
    this.modal.classList.remove('show');
    document.body.style.overflow = '';
    this.currentProduct = null;
    this.quantity = 1;
    if (this.quantityInput) {
      this.quantityInput.value = '1';
    }
    if (this.lastFocusedElement && typeof this.lastFocusedElement.focus === 'function') {
      this.lastFocusedElement.focus();
    }
  }
}

const productDetailsModal = new ProductDetailsModal();
const addToCartModal = new AddToCartModal();

export const openProductDetailsModal = (product) => productDetailsModal.open(product);
export const closeProductDetailsModal = () => productDetailsModal.close();
export const openAddToCartModal = (product) => addToCartModal.open(product);
export const closeAddToCartModal = () => addToCartModal.close();

export default {
  openProductDetailsModal,
  closeProductDetailsModal,
  openAddToCartModal,
  closeAddToCartModal
};
