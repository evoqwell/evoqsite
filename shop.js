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

  if (product.description) {
    const description = document.createElement('p');
    description.className = 'product-description';
    description.textContent = product.description;
    info.appendChild(description);
  }

  if (product.coa) {
    const coaWrapper = document.createElement('div');
    coaWrapper.className = 'product-coa';

    const coaLink = document.createElement('a');
    coaLink.className = 'btn-coa';
    coaLink.href = product.coa;
    coaLink.target = '_blank';
    coaLink.rel = 'noopener noreferrer';

    const icon = document.createElement('span');
    icon.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
    `;
    icon.setAttribute('aria-hidden', 'true');
    coaLink.appendChild(icon);
    coaLink.appendChild(document.createTextNode(' View COA'));

    coaWrapper.appendChild(coaLink);
    info.appendChild(coaWrapper);
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

  const button = document.createElement('button');
  button.className = 'btn-add-cart';
  button.type = 'button';
  if (isOutOfStock) {
    button.disabled = true;
    button.setAttribute('aria-disabled', 'true');
    button.textContent = 'Out of Stock';
  } else {
    button.textContent = 'Add to Cart';
    button.addEventListener('click', () => handleAddToCart(product));
  }
  footer.appendChild(button);

  info.appendChild(footer);
  card.appendChild(imageWrapper);
  card.appendChild(info);

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
