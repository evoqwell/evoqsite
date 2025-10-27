import { fetchProducts } from './lib/api.js';
import { addToCart as addItemToCart } from './lib/cart.js';

document.addEventListener('DOMContentLoaded', () => {
  loadProducts();
});

async function loadProducts() {
  const productsGrid = document.getElementById('products-grid');

  if (!productsGrid) {
    console.error('Products grid not found');
    return;
  }

  renderLoading(productsGrid);

  try {
    const { products } = await fetchProducts();

    if (!products.length) {
      renderEmpty(productsGrid);
      return;
    }

    productsGrid.innerHTML = '';
    products.forEach((product) => {
      const card = createProductCard(product);
      productsGrid.appendChild(card);
    });
  } catch (error) {
    console.error('Failed to load products', error);
    renderError(productsGrid);
  }
}

function createProductCard(product) {
  const card = document.createElement('article');
  const stockCount = Number(product.stock);
  const hasStockValue = !Number.isNaN(stockCount);
  const isOutOfStock = hasStockValue ? stockCount <= 0 : false;
  const stockLabel = isOutOfStock ? 'Out of Stock' : 'In Stock';

  card.className = 'product-card fade-in';
  card.setAttribute('data-product-id', product.id);
  if (isOutOfStock) {
    card.classList.add('out-of-stock');
  }

  card.innerHTML = `
    <div class="product-image-wrapper">
      ${isOutOfStock ? '<span class="product-ribbon">Out of Stock</span>' : ''}
      <img src="${product.image}" alt="${product.name}" class="product-image" loading="lazy">
    </div>
    <div class="product-info">
      <h3 class="product-name">${product.name}</h3>
      <p class="product-description">${product.description || ''}</p>
      <div class="product-footer">
        <span class="product-price">$${Number(product.price).toFixed(2)}</span>
        <span class="product-stock-status ${isOutOfStock ? 'sold-out' : 'in-stock'}">${stockLabel}</span>
        <button class="btn-add-cart" type="button" ${isOutOfStock ? 'disabled aria-disabled="true"' : ''}>
          ${isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </div>
  `;

  const button = card.querySelector('.btn-add-cart');
  if (!isOutOfStock) {
    button.addEventListener('click', () => handleAddToCart(product));
  }

  return card;
}

function handleAddToCart(product) {
  const stockCount = Number(product.stock);
  if (!Number.isNaN(stockCount) && stockCount <= 0) {
    return;
  }

  addItemToCart(product.id, product.name, Number(product.price), 1);
  showAddedToCartFeedback(product.name);
}

function showAddedToCartFeedback(productName) {
  const existing = document.querySelector('.cart-notification');
  if (existing) existing.remove();

  const notification = document.createElement('div');
  notification.className = 'cart-notification';
  notification.textContent = `${productName} added to cart`;

  document.body.appendChild(notification);

  setTimeout(() => notification.classList.add('show'), 10);

  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function renderLoading(container) {
  container.innerHTML = `
    <div class="products-loading">
      <p>Loading products...</p>
    </div>
  `;
}

function renderEmpty(container) {
  container.innerHTML = `
    <div class="products-empty">
      <p>No products are available right now. Please check back soon.</p>
    </div>
  `;
}

function renderError(container) {
  container.innerHTML = `
    <div class="products-error">
      <p>We couldn't load products. Refresh the page or try again later.</p>
    </div>
  `;
}
