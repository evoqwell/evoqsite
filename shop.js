import { fetchProducts } from './lib/api.js';
import { openAddToCartModal, openProductDetailsModal } from './lib/productModals.js';

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
  card.dataset.productId = product.id;
  if (isOutOfStock) {
    card.classList.add('out-of-stock');
  }

  const imageWrapper = document.createElement('div');
  imageWrapper.className = 'product-image-wrapper';

  if (isOutOfStock) {
    const ribbon = document.createElement('span');
    ribbon.className = 'product-ribbon';
    ribbon.textContent = 'Out of Stock';
    imageWrapper.appendChild(ribbon);
  }

  const image = document.createElement('img');
  image.className = 'product-image';
  image.loading = 'lazy';
  image.src = product.image;
  image.alt = product.name;
  imageWrapper.appendChild(image);

  const info = document.createElement('div');
  info.className = 'product-info';

  const title = document.createElement('h3');
  title.className = 'product-name';
  title.textContent = product.name;
  info.appendChild(title);

  const categories = createProductCategories(product);
  if (categories) {
    info.appendChild(categories);
  }

  const footer = document.createElement('div');
  footer.className = 'product-footer';

  const priceEl = document.createElement('span');
  priceEl.className = 'product-price';
  priceEl.textContent = `$${Number(product.price).toFixed(2)}`;
  footer.appendChild(priceEl);

  const stockStatus = document.createElement('span');
  stockStatus.className = `product-stock-status ${isOutOfStock ? 'sold-out' : 'in-stock'}`;
  stockStatus.textContent = stockLabel;
  footer.appendChild(stockStatus);

  const actions = document.createElement('div');
  actions.className = 'product-actions';

  const viewDetails = document.createElement('button');
  viewDetails.className = 'btn-secondary btn-view-details';
  viewDetails.type = 'button';
  viewDetails.textContent = 'View Details';
  viewDetails.addEventListener('click', () => openProductDetailsModal(product));
  actions.appendChild(viewDetails);

  const addToCartBtn = document.createElement('button');
  addToCartBtn.className = 'btn-add-cart';
  addToCartBtn.type = 'button';
  if (isOutOfStock) {
    addToCartBtn.disabled = true;
    addToCartBtn.setAttribute('aria-disabled', 'true');
    addToCartBtn.textContent = 'Out of Stock';
  } else {
    addToCartBtn.textContent = 'Add to Cart';
    addToCartBtn.addEventListener('click', () => openAddToCartModal(product));
  }
  actions.appendChild(addToCartBtn);

  footer.appendChild(actions);

  info.appendChild(footer);
  card.appendChild(imageWrapper);
  card.appendChild(info);

  return card;
}

function createProductCategories(product) {
  const categories = Array.isArray(product.categories) && product.categories.length
    ? product.categories
    : typeof product.category === 'string' && product.category.trim()
    ? [product.category.trim()]
    : [];

  if (!categories.length) {
    return null;
  }

  const container = document.createElement('div');
  container.className = 'product-categories';

  categories.forEach((category) => {
    const chip = document.createElement('span');
    chip.className = 'product-category-chip';
    chip.textContent = category;
    container.appendChild(chip);
  });

  return container;
}

function renderLoading(container) {
  // Create skeleton loaders for a better loading experience
  const skeletonCount = 8; // Show 8 skeleton cards while loading
  let skeletonHTML = '<div class="skeleton-container">';

  for (let i = 0; i < skeletonCount; i++) {
    skeletonHTML += `
      <div class="skeleton-card">
        <div class="skeleton skeleton-image"></div>
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text short"></div>
        <div class="skeleton skeleton-button"></div>
      </div>
    `;
  }

  skeletonHTML += '</div>';
  container.innerHTML = skeletonHTML;
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
